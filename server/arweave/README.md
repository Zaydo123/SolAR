# Git-Arweave Integration for SolAR

This module provides a simple way to store Git repositories on the Arweave permanent storage network, using Solana for payment via Irys (formerly Bundlr).

## Features

- **Permanent Storage**: Store your Git repositories permanently on the Arweave network
- **Solana Payments**: Pay for storage using Solana (SOL) instead of Arweave tokens (AR)
- **Simple API**: Just two functions to upload and download repositories
- **Auto-funding**: Automatically funds your Irys account if needed
- **Verification**: Ensures Git bundles are valid before uploading/after downloading

## Installation

1. Make sure you have the required dependencies:

```bash
npm install @irys/sdk
```

2. Place your Solana private key in a file (eg. `solana.key`) in base58 format

3. Import the module in your code:

```javascript
const { uploadGitBundle, downloadGitBundle } = require('./git-arweave');
```

## Usage

### Uploading a Repository

```javascript
const { uploadGitBundle } = require('./git-arweave');

async function storeRepo() {
  try {
    const txId = await uploadGitBundle({
      keyPath: './solana.key',       // Path to your Solana private key
      repoPath: './my-project',      // Path to the repository to upload
      bundlePath: 'repo.bundle',     // Where to save the bundle file
      network: 'devnet',             // 'devnet' or 'mainnet'
      verbose: true                  // Show detailed logs
    });
    
    console.log(`Repository stored with transaction ID: ${txId}`);
    console.log(`Arweave URL: https://gateway.irys.xyz/${txId}`);
    return txId;
  } catch (error) {
    console.error('Error storing repository:', error);
  }
}
```

### Downloading a Repository

```javascript
const { downloadGitBundle } = require('./git-arweave');

async function retrieveRepo(transactionId) {
  try {
    const outputDir = await downloadGitBundle(transactionId, {
      outputDir: './restored-repo',    // Where to restore the repository
      bundlePath: 'downloaded.bundle', // Where to save the bundle file
      verbose: true                    // Show detailed logs
    });
    
    console.log(`Repository restored to: ${outputDir}`);
    return outputDir;
  } catch (error) {
    console.error('Error retrieving repository:', error);
  }
}
```

## Examples

See `example.js` for a complete example of uploading and downloading repositories.

## Transaction ID

Our test repository is available at this transaction ID:
```
4RPGy1KK7zaiMBYWDd73XVFeJCH8SnDfP1VhjX7sZ9JH
```

You can view it at: https://gateway.irys.xyz/4RPGy1KK7zaiMBYWDd73XVFeJCH8SnDfP1VhjX7sZ9JH

## Funding Your Irys Account

For mainnet usage, you need to fund your Irys account with real SOL:

1. Visit https://irys.xyz
2. Connect your Solana wallet
3. Fund your account with SOL 

For devnet testing:
1. Get devnet SOL from a faucet like https://solfaucet.com
2. The module will automatically fund your Irys account from your wallet

## Technical Details

- **Git Bundles**: Uses Git bundling to package the entire repository history
- **Binary Storage**: Stores the raw binary data on Arweave
- **Metadata**: Includes proper content-type and Git-specific metadata
- **Network**: Works with both Irys devnet and mainnet

## License

MIT