# Git Server with Solana and Arweave Integration

This server provides Git hosting services that store repository metadata on the Solana blockchain and repository content on Arweave.

## Project Structure

1. Git Server Components:
   - `working-server.js` - A reliable Git server that uses native Git commands
   - `solanaClient.js` - Solana integration client
   - `setup-solana.js` - Setup script for Solana program

2. Documentation:
   - `README.md` - General information
   - `INTEGRATION.md` - Details on integrating with existing code
   - `SOLANA-INTEGRATION.md` - Solana-specific integration guide

## Prerequisites

1. Node.js and npm
2. Solana CLI tools
3. Anchor framework
4. Running Solana validator (for local development)

## Quick Start

### 1. Set up the Solana Program

First, make sure a Solana test validator is running:

```bash
# In a separate terminal
solana-test-validator
```

Then build and deploy the program:

```bash
# From the project root
cd git-solana
anchor build
anchor deploy
```

Or use the setup script:

```bash
# From the server directory
npm run setup
```

### 2. Start the Git Server

```bash
# From the server directory
npm run start:working
```

The server will start on port 5002 by default.

### 3. Use Git as Usual

```bash
# Clone a repository
git clone http://localhost:5002/<owner_name>/<repo_name>

# Create a file
echo "Hello, Solana!" > README.md

# Commit and push
git add .
git commit -m "Initial commit"
git push
```

## How It Works

1. **Git Operations**: The server handles Git protocol using native Git commands with `--stateless-rpc`.

2. **Solana Integration**: Repository metadata (repository name, branches, commit hashes) is stored on the Solana blockchain.

3. **Arweave Storage**: Repository content is referenced by Arweave transaction IDs stored in Solana.

## Available Scripts

- `npm run start` - Start the original server
- `npm run start:working` - Start the working server with Solana integration
- `npm run setup` - Set up the Solana program and create a test repository

## API Endpoints

- `GET /:owner/:repo/info/refs` - Git info/refs endpoint
- `POST /:owner/:repo/git-upload-pack` - Used for git fetch/clone
- `POST /:owner/:repo/git-receive-pack` - Used for git push

## Solana Account Structure

Repositories are stored in Solana with the following structure:

- **Repository**: Owner, name, collaborators, and branches
- **Branch**: Name and commit reference
- **CommitReference**: Commit hash and Arweave transaction ID

See `SOLANA-INTEGRATION.md` for more detailed information on the Solana integration.