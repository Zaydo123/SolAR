/**
 * Script to test the Git server implementation
 */
const express = require("express");
const bodyParser = require("body-parser");
const SolanaGitRepository = require("./SolanaGitRepository");
const fs = require("fs");
const path = require("path");

// Ensure repo_states directory exists
const repoStatesDir = path.join(__dirname, "repo_states");
if (!fs.existsSync(repoStatesDir)) {
  fs.mkdirSync(repoStatesDir);
}

// Create a test repo state file for testing purposes
const testOwner = "4Kn1P7n6JwGHDm8KvtEickWbA4A3aWzaQn1tNPtyANGh";
const testRepo = "fakerepo";
const { computeRepoPDA } = require("./solanaArweaveSim");

// Create the test repo PDA
const repoPDA = computeRepoPDA(testOwner, testRepo);
console.log(`Test repository PDA: ${repoPDA.toString()}`);

// Create test repo state if it doesn't exist
const repoStatePath = path.join(repoStatesDir, `${repoPDA.toString()}.json`);
if (!fs.existsSync(repoStatePath)) {
  console.log(`Creating test repository state at ${repoStatePath}`);
  const initialState = {
    refs: {
      "refs/heads/master": {
        commit_hash: "0000000000000000000000000000000000000000",
        arweave_tx: null
      }
    }
  };
  fs.writeFileSync(repoStatePath, JSON.stringify(initialState, null, 2));
}

// Create Express app
const app = express();

// Use raw body parser with a high limit for packfiles
app.use(bodyParser.raw({ 
  type: '*/*',
  limit: '50mb'
}));

// Enable verbose request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log(`  Query params:`, req.query);
  console.log(`  Route params:`, req.params);
  if (req.body && Buffer.isBuffer(req.body)) {
    console.log(`  Body: <Buffer of ${req.body.length} bytes>`);
  }
  next();
});

// Instantiate your repository class
const solanaRepo = new SolanaGitRepository();

// Mount the router at /:owner/:repo
app.use("/:owner/:repo", solanaRepo.createRouter(express));

// Add a root route for debugging
app.get("/", (req, res) => {
  res.send("Git server is running. Use the following URL format to access repositories: /:owner/:repo/...");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Git server listening on port ${PORT}`);
  console.log(`Test repository URL: http://localhost:${PORT}/${testOwner}/${testRepo}`);
  console.log(`Try: git clone http://localhost:${PORT}/${testOwner}/${testRepo}`);
});