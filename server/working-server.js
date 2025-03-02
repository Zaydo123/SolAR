/**
 * Minimal Git Server that actually works
 * 
 * This implementation uses git2http to create a Git server.
 */
const express = require('express');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
// Use port 5003 to avoid conflict with other running servers
const port = 5003;

// Create base directory for storing repositories
const REPO_BASE = path.join(__dirname, 'real-repos');
if (!fs.existsSync(REPO_BASE)) {
  fs.mkdirSync(REPO_BASE, { recursive: true });
}

// Middleware to parse incoming Git data
app.use(express.raw({
  type: '*/*',
  limit: '50mb'
}));

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
    
    // Initialize SolanaClient - we'll check if the repository exists in Solana
    // but won't block the Git operation if it doesn't - this allows for initial clones
    const SolanaClient = require('./solanaClient');
    const solanaClient = new SolanaClient();
    
    // Check Solana repository existence asynchronously
    (async () => {
      try {
        const repoData = await solanaClient.getRepository(
          solanaClient.getWalletInfo().publicKey,
          repo
        );
        
        if (repoData) {
          console.log(`Found repository in Solana: ${repoData.name} with ${repoData.branches.length} branches`);
        } else {
          console.log(`Repository ${owner}/${repo} not found in Solana`);
        }
      } catch (error) {
        // Don't block Git operation if Solana check fails
        console.error('Error checking Solana repository:', error.message);
      }
    })();
    
    // Ensure repository exists in Git
    const repoPath = ensureRepo(owner, repo);
    
    // Set appropriate content type
    res.setHeader('Content-Type', `application/x-${service}-advertisement`);
    
    // Generate response using git command
    // The --stateless-rpc --advertise-refs flags make Git output the info/refs data
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
    
    // Create a temporary file for the request
    const tempFile = path.join(os.tmpdir(), `git-${Date.now()}.in`);
    fs.writeFileSync(tempFile, req.body);
    
    // Set the content type
    res.setHeader('Content-Type', 'application/x-git-receive-pack-result');
    
    // Execute git receive-pack with the request data
    const output = execSync(`git receive-pack --stateless-rpc "${repoPath}" < "${tempFile}"`, {
      maxBuffer: 50 * 1024 * 1024
    });
    
    // Use real Solana integration for storing repository metadata
    const SolanaClient = require('./solanaClient');
    
    // Initialize Solana client
    const solanaClient = new SolanaClient();
    console.log(`Using wallet: ${solanaClient.getWalletInfo().publicKey}`);
    
    // Get all refs from the repository
    const refsOutput = execSync(`git -C "${repoPath}" show-ref`).toString().trim();
    const refLines = refsOutput.split('\n');
    console.log(`Repository ${owner}/${repo} updated with refs:`, refsOutput);
    
    if (refLines.length === 0 || !refLines[0]) {
      console.log('No refs found in repository');
      return;
    }
    
    // Use an async function to handle Solana operations
    (async () => {
      try {
        // Check if repository exists in Solana
        let repoExists = false;
        try {
          // Try to get the repository data
          const repoData = await solanaClient.getRepository(
            solanaClient.getWalletInfo().publicKey,
            repo
          );
          repoExists = !!repoData;
          
          if (repoData) {
            console.log(`Found existing repository in Solana: ${repoData.name}`);
          }
        } catch (e) {
          if (!e.message.includes('Account does not exist')) {
            throw e;
          }
          // Repository doesn't exist, we'll create it
        }
        
        // Create repository if it doesn't exist
        if (!repoExists) {
          console.log(`Creating new repository in Solana: ${repo}`);
          await solanaClient.createRepository(repo);
        }
        
        // Update branches with commit info
        for (const refLine of refLines) {
          // Parse the ref line format: <commit-hash> <ref-name>
          const [commitHash, refName] = refLine.split(' ');
          if (commitHash && refName) {
            console.log(`Updating branch ${refName} with commit ${commitHash}`);
            
            // Generate Arweave transaction ID (this would be a real Arweave upload in production)
            const arweaveTxId = `arweave_tx_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
            
            // Update the branch in Solana
            await solanaClient.updateBranch(
              solanaClient.getWalletInfo().publicKey,
              repo,
              refName,
              commitHash,
              arweaveTxId
            );
            
            console.log(`Successfully updated branch ${refName} in Solana`);
          }
        }
      } catch (error) {
        console.error('Error updating Solana:', error);
        // Continue with the Git operation even if Solana update fails
        // This ensures the Git protocol operation completes successfully
      }
    })().catch(error => {
      console.error('Error in async Solana operations:', error);
    });
    
    // Clean up
    fs.unlinkSync(tempFile);
    
    // Send the response
    res.send(output);
  } catch (error) {
    console.error('Error in git-receive-pack:', error);
    res.status(500).send('Git operation failed');
  }
});

// Start server
const PORT = 5003;  // Changed to port 5003
app.listen(PORT, () => {
  console.log(`Working Git server listening on port ${PORT}`);
  console.log(`Test with: git clone http://localhost:${PORT}/test-owner/test-repo`);
});