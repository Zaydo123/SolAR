/**
 * Simple Git Server
 * 
 * This implementation is a bare-bones Git server without Solana or Arweave integration.
 * It's used as a fallback when the integrated server has issues.
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
const REPO_BASE = path.join(__dirname, '../../repos');
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
    
    console.log(`Processing ${service} request for ${owner}/${repo}`);
    
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
    
    console.log(`Successfully processed git-receive-pack for ${owner}/${repo}`);
    
    // Send the response
    res.send(output);
  } catch (error) {
    console.error('Error in git-receive-pack:', error);
    res.status(500).send('Git operation failed');
  }
});

// Start server
app.listen(port, () => {
  console.log(`Simple Git server listening on port ${port}`);
  console.log(`Test with: git clone http://localhost:${port}/test-owner/test-repo`);
});