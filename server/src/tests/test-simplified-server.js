/**
 * Simplified Git server for testing
 */
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();

// Use raw body parser with high limit for packfiles
app.use(bodyParser.raw({ 
  type: '*/*',
  limit: '50mb'
}));

// Add detailed logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  if (req.body && Buffer.isBuffer(req.body)) {
    console.log(`Request body length: ${req.body.length} bytes`);
  }
  next();
});

// Simple in-memory repo storage
const repos = {
  "4Kn1P7n6JwGHDm8KvtEickWbA4A3aWzaQn1tNPtyANGh/fakerepo": {
    refs: {
      "refs/heads/master": {
        hash: "0000000000000000000000000000000000000000",
        content: null
      }
    }
  }
};

// Info/refs endpoint
app.get('/:owner/:repo/info/refs', (req, res) => {
  const { owner, repo } = req.params;
  const service = req.query.service;
  const repoKey = `${owner}/${repo}`;
  
  console.log(`GET info/refs for ${repoKey}, service=${service}`);
  
  if (!service) {
    return res.status(400).send('Service parameter required');
  }
  
  if (service !== 'git-receive-pack' && service !== 'git-upload-pack') {
    return res.status(400).send(`Invalid service: ${service}`);
  }
  
  // Get repository
  const repository = repos[repoKey];
  if (!repository) {
    console.log(`Repository ${repoKey} not found, creating empty repo`);
    repos[repoKey] = {
      refs: {
        "refs/heads/master": {
          hash: "0000000000000000000000000000000000000000",
          content: null
        }
      }
    };
  }
  
  // Build response
  res.setHeader('Content-Type', `application/x-${service}-advertisement`);
  res.setHeader('Cache-Control', 'no-cache');
  
  const capabilities = [
    'report-status',
    'delete-refs',
    'side-band-64k',
    'no-thin'
  ];
  
  // First packet line is service announcement
  let response = createPktLine(`# service=${service}\n`);
  response = Buffer.concat([response, Buffer.from('0000', 'utf8')]);
  
  // Get refs
  const repoRefs = repos[repoKey]?.refs || {};
  
  if (Object.keys(repoRefs).length === 0) {
    // Add zero hash for master if no refs
    const firstLine = Buffer.concat([
      Buffer.from('0000000000000000000000000000000000000000 refs/heads/master'),
      Buffer.from([0]), // NULL byte
      Buffer.from(capabilities.join(' '))
    ]);
    response = Buffer.concat([response, createPktLineFromBuffer(firstLine)]);
  } else {
    // First ref includes capabilities
    let isFirst = true;
    for (const [refName, refData] of Object.entries(repoRefs)) {
      if (isFirst) {
        const firstLine = Buffer.concat([
          Buffer.from(`${refData.hash} ${refName}`),
          Buffer.from([0]), // NULL byte
          Buffer.from(capabilities.join(' '))
        ]);
        response = Buffer.concat([response, createPktLineFromBuffer(firstLine)]);
        isFirst = false;
      } else {
        response = Buffer.concat([response, createPktLine(`${refData.hash} ${refName}`)]);
      }
    }
  }
  
  // End with flush packet
  response = Buffer.concat([response, Buffer.from('0000', 'utf8')]);
  
  console.log(`Sending info/refs response: ${response.length} bytes`);
  res.send(response);
});

// Git-receive-pack endpoint (handles push)
app.post('/:owner/:repo/git-receive-pack', (req, res) => {
  const { owner, repo } = req.params;
  const repoKey = `${owner}/${repo}`;
  
  console.log(`POST git-receive-pack for ${repoKey}`);
  
  if (!Buffer.isBuffer(req.body)) {
    return res.status(400).send('Request body must be a buffer');
  }
  
  // Store the pack data (in a real implementation, this would be uploaded to Arweave)
  const packData = req.body;
  console.log(`Received ${packData.length} bytes of pack data`);
  
  // In a real implementation, we would parse the packfile and extract commands
  // For this test, we'll simulate updating the master branch
  
  // Generate a fake commit hash
  const commitHash = crypto.randomBytes(20).toString('hex');
  
  // Update the repository state
  if (!repos[repoKey]) {
    repos[repoKey] = { refs: {} };
  }
  
  repos[repoKey].refs['refs/heads/master'] = {
    hash: commitHash,
    content: packData // Store the packfile (simplified)
  };
  
  console.log(`Updated refs/heads/master to ${commitHash}`);
  
  // Format the response according to Git protocol
  res.setHeader('Content-Type', 'application/x-git-receive-pack-result');
  res.setHeader('Cache-Control', 'no-cache');
  
  // Format response: unpack status + ref status + flush packet
  let response = createPktLine('unpack ok\n');
  response = Buffer.concat([response, createPktLine('ok refs/heads/master\n')]);
  response = Buffer.concat([response, Buffer.from('0000', 'utf8')]);
  
  console.log(`Sending git-receive-pack response: ${response.length} bytes`);
  res.send(response);
});

// Git-upload-pack endpoint (handles fetch/clone)
app.post('/:owner/:repo/git-upload-pack', (req, res) => {
  const { owner, repo } = req.params;
  const repoKey = `${owner}/${repo}`;
  
  console.log(`POST git-upload-pack for ${repoKey}`);
  
  res.setHeader('Content-Type', 'application/x-git-upload-pack-result');
  res.setHeader('Cache-Control', 'no-cache');
  
  // Simple NAK response for testing
  const response = createPktLine('NAK\n');
  
  console.log(`Sending git-upload-pack response: ${response.length} bytes`);
  res.send(response);
});

// Helper function to create a pkt-line from string
function createPktLine(data) {
  const buf = Buffer.from(data, 'utf8');
  const length = buf.length + 4; // 4 bytes for the length header
  const header = Buffer.from(length.toString(16).padStart(4, '0'), 'utf8');
  return Buffer.concat([header, buf]);
}

// Helper function to create a pkt-line from buffer
function createPktLineFromBuffer(buf) {
  const length = buf.length + 4; // 4 bytes for the length header
  const header = Buffer.from(length.toString(16).padStart(4, '0'), 'utf8');
  return Buffer.concat([header, buf]);
}

// Start server
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Test Git server listening on port ${PORT}`);
  console.log(`Test with: git clone http://localhost:${PORT}/4Kn1P7n6JwGHDm8KvtEickWbA4A3aWzaQn1tNPtyANGh/fakerepo`);
});