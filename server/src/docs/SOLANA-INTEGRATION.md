# Solana Integration Guide for SolAR

This document explains how to set up and use the Solana integration for the Git server.

## Overview

The SolAR project integrates a Git server with Solana blockchain for storing repository metadata and Arweave for storing repository content. This enables decentralized storage of Git repositories.

## Getting Started

### Prerequisites

1. Solana CLI tools installed
2. Anchor framework installed
3. A running Solana test validator (for local development)

### Step 1: Build and Deploy the Solana Program

```bash
# Navigate to git-solana directory
cd ../git-solana

# Build the program
anchor build

# Deploy the program to localnet (make sure a solana-test-validator is running)
anchor deploy
```

Alternatively, you can use the setup script:

```bash
# Make sure a solana-test-validator is running in a separate terminal
node setup-solana.js
```

### Step 2: Start the Git Server

```bash
# Start the working Git server with Solana integration
npm run start:working
```

## How It Works

1. **Git Operations**: When a client performs a Git operation (clone, push, etc.), the server first handles the Git protocol using native Git commands.

2. **Solana Storage**: After Git operations complete successfully, the server stores metadata about the repository in Solana:
   - Repository names and owners
   - Branch information
   - Commit hashes
   - Arweave transaction IDs

3. **Arweave Storage**: Repository content is stored on Arweave, with transaction IDs recorded in Solana.

## Solana Account Structure

The Solana program uses the following account structure:

- **Repository Account**:
  - Owner (Pubkey)
  - Repository Name (String)
  - Collaborators (Vec<Pubkey>)
  - Branches (Vec<Branch>)

- **Branch**:
  - Name (String)
  - Commit Reference (CommitReference)

- **CommitReference**:
  - Commit Hash (String)
  - Arweave Transaction ID (String)

## Integration Flow

1. When a client does a `git push`, the server:
   - Processes the Git protocol using native Git
   - Extracts repository and branch information
   - Creates a repository in Solana if it doesn't exist
   - Updates branch information with new commit hashes
   - Generates Arweave transaction IDs and records them in Solana

2. When a client does a `git clone` or `git pull`, the server:
   - Processes the Git protocol using native Git
   - Can optionally validate repository existence in Solana

## Technical Details

### Program ID

The Solana program ID is specified in the contract:

```
5TQo5Bf6yXp9uywEFbp9YKUyveD2pe2LVXRjY2aWRup5
```

### PDAs (Program Derived Addresses)

The repository PDA is derived using:

```javascript
const seeds = [
  Buffer.from('repository'),
  ownerPublicKey.toBuffer(),
  Buffer.from(repoName)
];

const [pda, _] = PublicKey.findProgramAddressSync(seeds, PROGRAM_ID);
```

### Client Functions

The Solana client provides the following functions:

- `getRepository(owner, repoName)`: Get repository data
- `createRepository(repoName)`: Create a new repository
- `updateBranch(repoOwner, repoName, branchName, commitHash, arweaveTx)`: Update branch information
- `listRepositories(owner)`: List all repositories for an owner

## Troubleshooting

### IDL Not Found

If you get an error about the IDL not being found, make sure you've built the Anchor program:

```bash
cd ../git-solana
anchor build
```

### Connection to Localnet Failed

Make sure the Solana test validator is running:

```bash
solana-test-validator
```

### Transaction Failed

Check that:
1. Your wallet has enough SOL
2. You're using the correct program ID
3. The Solana program has been deployed to the network

```bash
# Add some SOL to your wallet for testing
solana airdrop 1
```