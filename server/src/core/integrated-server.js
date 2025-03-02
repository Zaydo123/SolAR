/**
 * Integrated Git Server with Solana and Arweave
 * 
 * This implementation combines the reliable Git server with
 * Solana and Arweave integration, using a step-by-step approach
 * for reliability.
 */
const express = require('express');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { PublicKey } = require('@solana/web3.js');

// Import Solana and Arweave integrations
const SolanaClient = require('../utils/solanaClient');
const { uploadToArweave } = require('../utils/arweave/simple-uploader');

const app = express();
// Use port 5003 to avoid conflict with other running servers
const port = 5003;

// Create base directories
const REPO_BASE = path.join(__dirname, '../../repos');
const BUNDLES_DIR = path.join(__dirname, '../../bundles');

// Create directories if they don't exist
if (!fs.existsSync(REPO_BASE)) {
  fs.mkdirSync(REPO_BASE, { recursive: true });
}
if (!fs.existsSync(BUNDLES_DIR)) {
  fs.mkdirSync(BUNDLES_DIR, { recursive: true });
}

// Initialize Solana client
let solanaClient = null;
let solanaEnabled = false;
try {
  // Allow the server to work without Solana integration
  const isSolanaEnabled = process.env.SOLANA_ENABLED !== 'false';
  
  if (isSolanaEnabled) {
    solanaClient = new SolanaClient();
    solanaEnabled = true;
    console.log(`Solana integration enabled with wallet: ${solanaClient.getWalletInfo().publicKey}`);
  } else {
    console.log(`Solana integration disabled by environment variable`);
  }
} catch (error) {
  console.warn(`Solana integration disabled: ${error.message}`);
  solanaEnabled = false;
}

// Check if Arweave integration is possible
let arweaveEnabled = false;
try {
  // Allow the server to work without Arweave integration
  const isArweaveEnabled = process.env.ARWEAVE_ENABLED !== 'false';
  
  if (isArweaveEnabled) {
    // Check if we have the required files for Arweave
    const keyPath = solanaClient?.getWalletKeyPath();
    if (keyPath && fs.existsSync(keyPath)) {
      arweaveEnabled = true;
      console.log(`Arweave integration enabled with key: ${keyPath}`);
    } else {
      console.warn(`Arweave integration disabled: key file not found`);
      arweaveEnabled = false;
    }
  } else {
    console.log(`Arweave integration disabled by environment variable`);
  }
} catch (error) {
  console.warn(`Arweave integration disabled: ${error.message}`);
  arweaveEnabled = false;
}

// Middleware to parse incoming Git data
app.use(express.raw({
  type: '*/*',
  limit: '50mb'
}));

// Middleware to parse JSON for client-side signing API
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Ensure repo exists
function ensureRepo(owner, repo) {
  const repoPath = path.join(REPO_BASE, owner, repo);
  
  if (!fs.existsSync(repoPath)) {
    // Create directory and initialize a bare git repo
    fs.mkdirSync(path.dirname(repoPath), { recursive: true });
    execSync(`git init --bare "${repoPath}"`);
    console.log(`Created bare repository: ${repoPath}`);
  }
  
  return repoPath;
}

// Handle Git info/refs endpoint
app.get('/:owner/:repo/info/refs', (req, res) => {
  try {
    const { owner, repo } = req.params;
    const service = req.query.service;
    
    if (!service) {
      return res.status(400).send('Service parameter required');
    }
    
    if (service !== 'git-receive-pack' && service !== 'git-upload-pack') {
      return res.status(400).send(`Invalid service: ${service}`);
    }
    
    console.log(`Processing ${service} request for ${owner}/${repo}`);
    
    // If Solana is enabled, check if the repository exists
    if (solanaEnabled && solanaClient) {
      (async () => {
        try {
          const repoData = await solanaClient.getRepository(owner, repo);
          if (repoData) {
            console.log(`Found repository in Solana: ${repoData.name}`);
          } else {
            console.log(`Repository not found in Solana, will create if pushed to`);
          }
        } catch (error) {
          console.log(`Repository not found in Solana: ${error.message}`);
        }
      })().catch(err => {
        console.error(`Error checking Solana repository: ${err.message}`);
      });
    }
    
    // Ensure repository exists locally
    const repoPath = ensureRepo(owner, repo);
    
    // Set appropriate content type
    res.setHeader('Content-Type', `application/x-${service}-advertisement`);
    
    // Generate response using git command
    const command = `git ${service.substring(4)} --stateless-rpc --advertise-refs "${repoPath}"`;
    const output = execSync(command);
    
    // Format as per Git Smart HTTP protocol
    const serviceAnnouncement = Buffer.from(`# service=${service}\n`);
    const headerLen = (serviceAnnouncement.length + 4).toString(16).padStart(4, '0');
    const header = Buffer.from(headerLen);
    
    // Combine all parts of the response
    const response = Buffer.concat([
      Buffer.concat([header, serviceAnnouncement]),
      Buffer.from('0000'), // Flush packet
      output
    ]);
    
    // Send the response
    res.send(response);
  } catch (error) {
    console.error('Error in info/refs:', error);
    res.status(500).send('Git operation failed');
  }
});

// Handle Git upload-pack (fetching/cloning)
app.post('/:owner/:repo/git-upload-pack', (req, res) => {
  try {
    const { owner, repo } = req.params;
    const repoPath = ensureRepo(owner, repo);
    
    console.log(`Processing git-upload-pack for ${owner}/${repo}`);
    
    // Create a temporary file for the request
    const tempFile = path.join(os.tmpdir(), `git-${Date.now()}.in`);
    fs.writeFileSync(tempFile, req.body);
    
    // Set the content type
    res.setHeader('Content-Type', 'application/x-git-upload-pack-result');
    
    // Execute git upload-pack with the request data
    const output = execSync(`git upload-pack --stateless-rpc "${repoPath}" < "${tempFile}"`, {
      maxBuffer: 50 * 1024 * 1024
    });
    
    // Clean up
    fs.unlinkSync(tempFile);
    
    // Send the response
    res.send(output);
  } catch (error) {
    console.error('Error in git-upload-pack:', error);
    res.status(500).send('Git operation failed');
  }
});

// Handle Git receive-pack (pushing)
app.post('/:owner/:repo/git-receive-pack', (req, res) => {
  try {
    const { owner, repo } = req.params;
    const repoPath = ensureRepo(owner, repo);
    
    console.log(`Processing git-receive-pack for ${owner}/${repo}`);
    
    // Create a temporary file for the request
    const tempFile = path.join(os.tmpdir(), `git-${Date.now()}.in`);
    fs.writeFileSync(tempFile, req.body);
    
    // Set the content type
    res.setHeader('Content-Type', 'application/x-git-receive-pack-result');
    
    // Execute git receive-pack with the request data
    const output = execSync(`git receive-pack --stateless-rpc "${repoPath}" < "${tempFile}"`, {
      maxBuffer: 50 * 1024 * 1024
    });
    
    // Clean up
    fs.unlinkSync(tempFile);
    
    // Only proceed with Solana/Arweave if enabled
    if (solanaEnabled && solanaClient) {
      // Get all refs from the repository
      try {
        const refsOutput = execSync(`git -C "${repoPath}" show-ref`).toString().trim();
        const refLines = refsOutput.split('\n');
        console.log(`Repository ${owner}/${repo} updated with refs:`, refsOutput);
        
        if (refLines.length === 0 || !refLines[0]) {
          console.log('No refs found in repository');
        } else {
          // Use an async function to handle Solana operations
          (async () => {
            try {
              console.log(`=== PROCESSING REPOSITORY IN SOLANA ===`);
              console.log(`Git Owner: ${owner}`); // This is the Git owner from the URL
              console.log(`Repository: ${repo}`);
              
              try {
                // createRepository now checks if repo exists and only creates if needed
                const result = await solanaClient.createRepository(owner, repo);
                
                if (result) {
                  console.log(`Successfully processed repository in Solana`);
                  console.log(`Address: ${result?.address || 'unknown'}`);
                  
                  if (result.branches && result.branches.length > 0) {
                    console.log(`Existing branches: ${result.branches.map(b => b.name).join(', ')}`);
                  } else {
                    console.log(`No existing branches found`);
                  }
                }
                console.log(`==========================================`);
              } catch (repoError) {
                console.error(`Error processing repository: ${repoError.message}`);
                if (repoError.stack) console.error(repoError.stack);
              }
              
              // Create a bundle for Arweave if enabled
              let arweaveTxId = null;
              if (arweaveEnabled) {
                try {
                  // Create a bundle of the repository for Arweave
                  const bundlePath = path.join(BUNDLES_DIR, `${owner}-${repo}-${Date.now()}.bundle`);
                  execSync(`git -C "${repoPath}" bundle create "${bundlePath}" --all`, { stdio: 'inherit' });
                  console.log(`Created bundle at ${bundlePath}`);
                  
                  // Upload to Arweave
                  const keyPath = solanaClient.getWalletKeyPath();
                  console.log(`Starting Arweave upload for ${owner}/${repo} with key ${keyPath}`);
                  console.log(`Bundle file size: ${fs.statSync(bundlePath).size} bytes`);
                  
                  arweaveTxId = await uploadToArweave({
                    keyPath,
                    bundlePath,
                    verbose: true
                  });
                  
                  console.log(`=== ARWEAVE TRANSACTION COMPLETE ===`);
                  console.log(`Repository: ${owner}/${repo}`);
                  console.log(`Bundle: ${bundlePath}`);
                  console.log(`Transaction ID: ${arweaveTxId}`);
                  console.log(`Arweave URL: https://gateway.irys.xyz/${arweaveTxId}`);
                  console.log(`=====================================`);
                } catch (arweaveError) {
                  console.error(`Error with Arweave: ${arweaveError.message}`);
                  // Generate a mock Arweave transaction ID if upload fails
                  arweaveTxId = `local_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
                  console.log(`Using local transaction ID instead: ${arweaveTxId}`);
                }
              } else {
                // Generate a mock Arweave transaction ID
                arweaveTxId = `mock_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
                console.log(`Using mock transaction ID: ${arweaveTxId}`);
              }
              
              // Update branches with commit info
              for (const refLine of refLines) {
                // Parse the ref line format: <commit-hash> <ref-name>
                const [commitHash, refName] = refLine.split(' ');
                if (commitHash && refName) {
                  console.log(`Updating branch ${refName} with commit ${commitHash}`);
                  
                  try {
                    // Update the branch in Solana
                    console.log(`=== UPDATING BRANCH IN SOLANA ===`);
                    console.log(`Owner: ${owner}`);
                    console.log(`Repository: ${repo}`);
                    console.log(`Branch: ${refName}`);
                    console.log(`Commit: ${commitHash}`);
                    console.log(`Arweave TX: ${arweaveTxId}`);
                    
                        // We use the Git URL owner for display, but server wallet is the real owner
                    console.log(`Git URL owner: ${owner} (for display only)`);
                    
                    // The server's wallet is the actual Solana owner
                    const updateResult = await solanaClient.updateBranch(
                      owner,
                      repo,
                      refName,
                      commitHash,
                      arweaveTxId
                    );
                    
                    console.log(`Successfully updated branch ${refName} in Solana`);
                    console.log(`Transaction ID: ${updateResult?.txId || 'unknown'}`);
                    console.log(`================================`);
                  } catch (updateError) {
                    console.error(`Error updating branch ${refName}: ${updateError.message}`);
                  }
                }
              }
            } catch (error) {
              console.error('Error updating Solana:', error.message);
            }
          })().catch(error => {
            console.error('Error in async Solana operations:', error.message);
          });
        }
      } catch (refsError) {
        console.error(`Error getting refs: ${refsError.message}`);
      }
    } else {
      console.log('Skipping Solana/Arweave integration (not enabled)');
    }
    
    // Send the response
    res.send(output);
    console.log(`Successfully processed git-receive-pack for ${owner}/${repo}`);
  } catch (error) {
    console.error('Error in git-receive-pack:', error);
    res.status(500).send('Git operation failed');
  }
});

// API endpoint for getting unsigned transactions for client-side signing
app.get('/:owner/:repo/unsigned-tx', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { branch, commit } = req.query;
    
    if (!solanaEnabled || !solanaClient) {
      return res.status(503).json({ 
        error: 'Solana integration not available' 
      });
    }
    
    if (!branch || !commit) {
      return res.status(400).json({ 
        error: 'Branch and commit parameters are required' 
      });
    }
    
    // Create unsigned transaction
    const unsignedTx = await solanaClient.createUnsignedTransaction(
      owner, repo, branch, commit
    );
    
    res.json(unsignedTx);
  } catch (error) {
    console.error('Error creating unsigned transaction:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint for receiving signed transactions
app.post('/:owner/:repo/sign', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { signature, branch, commit } = req.body;
    
    if (!solanaEnabled || !solanaClient) {
      return res.status(503).json({ 
        error: 'Solana integration not available' 
      });
    }
    
    if (!signature || !branch || !commit) {
      return res.status(400).json({ 
        error: 'Signature, branch, and commit are required' 
      });
    }
    
    // Verify and submit the signed transaction
    const txId = await solanaClient.submitSignedTransaction(signature, req.body.encoding || 'base64');
    
    // Generate an Arweave tx ID for reference (real implementation would use the signed tx)
    const arweaveTxId = `client_signed_${Date.now()}`;
    
    res.json({ 
      success: true, 
      transactionId: txId,
      arweaveTxId: arweaveTxId
    });
  } catch (error) {
    console.error('Error processing signed transaction:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Integrated Git server listening on port ${port}`);
  console.log(`Git operations: Enabled`);
  console.log(`Solana integration: ${solanaEnabled ? 'Enabled' : 'Disabled'}`);
  console.log(`Arweave integration: ${arweaveEnabled ? 'Enabled' : 'Disabled'}`);
  console.log(`Test with: git clone http://localhost:${port}/test-owner/test-repo`);
});