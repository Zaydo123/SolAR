# SolAR Git Signer

A client-side Solana transaction signing tool for SolAR Git repositories.

## Overview

This tool enables client-side Solana transaction signing for the SolAR decentralized Git system. By signing transactions locally, users maintain control of their private keys and ensure that only they can modify their repositories on the Solana blockchain.

## Features

- Sign Solana transactions for Git repository updates
- Support for multiple signing methods:
  - CLI wallet using Solana keypair file
  - Browser wallet integration (Phantom, Solflare, etc.)
  - QR code for mobile wallet signing
- Git pre-push hook for seamless integration
- No modifications required to Git client

## Installation

### Prerequisites

- Node.js 14+ and npm
- A Solana keypair (typically located at `~/.config/solana/id.json`)
- Git

### Install from Source

```bash
# Navigate to the signer directory
cd /Users/zaydalzein/Desktop/SolAR/solar-git-signer

# Install dependencies
npm install

# Install globally
npm install -g .

# Verify installation
solar-signer --help
```

### Install from npm

```bash
npm install -g @solar/git-signer
```

## Setting Up a Repository

```bash
# Navigate to your Git repository
cd your-repository

# Install the pre-push hook
solar-signer install --server http://localhost:5003
```

## Usage

After setup, use Git as you normally would:

```bash
git add .
git commit -m "Your commit message"
git push
```

The pre-push hook will automatically:
1. Extract repository and commit information
2. Request an unsigned transaction from the server
3. Prompt you to sign the transaction
4. Send the signed transaction back to the server
5. Complete the push operation

## Configuration

### Signing Methods

```bash
# Use CLI wallet (default)
export SOLAR_SIGN_METHOD=cli

# Use browser wallet
export SOLAR_SIGN_METHOD=browser

# Use QR code for mobile wallet
export SOLAR_SIGN_METHOD=qrcode
```

### Custom Keypair Location

```bash
export SOLANA_KEYPAIR_PATH=/path/to/your/keypair.json
```

## Manual Transaction Signing

```bash
# Sign a transaction for a specific commit
solar-signer sign --owner owner-name --repo repo-name --branch master --commit abcdef123456
```

## How It Works

1. When you push to a SolAR Git repository, the pre-push hook intercepts the operation
2. It requests an unsigned transaction from the server for your commit
3. You sign the transaction using your preferred method
4. The signed transaction is sent to the server
5. The server verifies and submits the transaction to Solana
6. The push operation completes

## Security

- Your private key never leaves your machine
- The server only receives signed transactions
- All repository updates on Solana are cryptographically verified

## License

MIT

## For More Information

See the full documentation in the SolAR Git repository.