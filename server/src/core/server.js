/**
 * Git server implementation using SolanaGitRepository
 * 
 * - Accepts Git operations over HTTP
 * - Uses Solana PDAs to identify repositories
 * - Simulates on-chain state with JSON files
 * - Simulates Arweave storage for packfiles
 */
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const SolanaGitRepository = require("./SolanaGitRepository");

// Create the required directories if they don't exist
const repoStatesDir = path.join(__dirname, "../../repo_states");
const arweaveDir = path.join(__dirname, "../../arweave_storage");

if (!fs.existsSync(repoStatesDir)) fs.mkdirSync(repoStatesDir);
if (!fs.existsSync(arweaveDir)) fs.mkdirSync(arweaveDir);

// Create Express app
const app = express();

// Use raw body parser with a high limit for packfiles
app.use(bodyParser.raw({ 
  type: '*/*',
  limit: '50mb'
}));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  if (req.body && Buffer.isBuffer(req.body)) {
    console.log(`  Body: <Buffer of ${req.body.length} bytes>`);
  }
  next();
});

// Create directory for repositories if it doesn't exist
const reposDir = path.join(__dirname, "../../repos");
if (!fs.existsSync(reposDir)) {
  fs.mkdirSync(reposDir, { recursive: true });
  console.log(`Created repositories directory: ${reposDir}`);
}

// Instantiate your repository class (which extends GitRepository)
const solanaRepo = new SolanaGitRepository();

// Mount the router at /:owner/:repo so that req.params.owner and req.params.repo are available
app.use("/:owner/:repo", solanaRepo.createRouter(express));

// Add a root route for debugging
app.get("/", (req, res) => {
  res.send("Git server is running. Use the following URL format to access repositories: /:owner/:repo/...");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Git server listening on port ${PORT}`);
  console.log(`URL format: http://localhost:${PORT}/<owner_public_key>/<repo_name>`);
  console.log(`Example: git clone http://localhost:${PORT}/4Kn1P7n6JwGHDm8KvtEickWbA4A3aWzaQn1tNPtyANGh/fakerepo`);
});
