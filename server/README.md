# SolAR Git Server

A Git server that integrates with Solana blockchain for storing repository metadata and Arweave for content storage.

## Project Structure

The project has been organized as follows:

```
server/
├── package.json         # Project dependencies and scripts
├── src/                 # Source code directory
│   ├── core/            # Core functionality
│   │   ├── GitRepository.js       # Base Git repository handling
│   │   ├── SolanaGitRepository.js # Solana-specific Git repository handling
│   │   ├── protocol.js            # Git protocol utilities
│   │   ├── server.js              # Standard server implementation
│   │   ├── working-server.js      # Working server implementation
│   │   └── solanaArweaveSim.js    # Solana and Arweave simulator
│   ├── utils/           # Utility functions and modules
│   │   ├── setup-solana.js        # Solana setup utilities
│   │   ├── solanaClient.js        # Solana client functionality
│   │   └── arweave/               # Arweave integration utilities
│   │       ├── arweaveGit.js      # Basic Arweave Git operations
│   │       ├── git-arweave.js     # Git-Arweave integration for repository storage
│   │       ├── index.js           # Main Arweave module entry point
│   │       └── irys/              # Irys (Bundlr) integration for Arweave
│   │           ├── irysGit.js     # Core Irys-Git integration
│   │           ├── irys-cli.js    # CLI tool for Irys operations
│   │           ├── irys-upload.js # Uploading repositories to Arweave via Irys
│   │           └── irys-download.js # Downloading repositories from Arweave
│   ├── tests/           # Test files
│   │   ├── test-server.js         # Server testing
│   │   ├── test-simplified-server.js # Simplified server testing 
│   │   └── test-clone.js          # Git clone testing
│   ├── docs/            # Documentation
│   │   ├── README.md              # Detailed project documentation
│   │   ├── INTEGRATION.md         # Integration documentation
│   │   ├── SOLANA-INTEGRATION.md  # Solana integration details
│   │   └── arweave/               # Arweave-specific documentation
│   │       └── README.md          # Arweave integration documentation
│   └── archive/         # Archived files (obsolete or temporary)
├── real-repos/          # Storage for real Git repositories
├── repo_states/         # Repository state storage
└── repos/               # Local repository storage
```

## Getting Started

1. Install dependencies:
```
npm install
```

2. Set up Solana (optional):
```
npm run setup
```

3. Start the server:
```
npm start
```

or use the working server implementation:
```
npm run start:working
```

## Using Arweave Integration

The Arweave integration allows storing Git repositories on the permanent Arweave storage network.

### Basic Usage
```javascript
// Import Git-Arweave integration
const { uploadGitBundle, downloadGitBundle } = require('./src/utils/arweave/git-arweave');

// Upload a repository to Arweave
const txId = await uploadGitBundle({
  keyPath: './solana.key',  // Solana key for payment
  repoPath: './my-repo',    // Path to repository
  network: 'devnet'         // Use 'mainnet' for production
});

// Download a repository from Arweave
await downloadGitBundle(txId, {
  outputDir: './restored-repo'
});
```

### Using the CLI Tool
```bash
# Check Irys balance
node src/utils/arweave/irys/irys-cli.js balance

# Fund your Irys account
node src/utils/arweave/irys/irys-cli.js fund 0.1 solana

# Upload a Git repository
node src/utils/arweave/irys/irys-cli.js upload

# Download a repository using transaction ID
node src/utils/arweave/irys/irys-cli.js download <TX_ID>
```

## Testing

Run tests using:
```
npm run test:server  # Test the server implementation
npm run test:simple  # Test the simplified server implementation
npm run test:clone   # Test Git clone functionality
```

## Documentation

See the detailed documentation in the `src/docs/` directory.

For Arweave integration documentation, see `src/docs/arweave/README.md`.