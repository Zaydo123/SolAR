# SolAR Explorer - Solana Git Repository Management

This repository contains the Solana smart contracts and API server for the SolAR Explorer, a decentralized GitHub-like platform built on Solana blockchain.

## Features

- Create Git repositories on Solana
- Store repository content on Arweave
- Star repositories (similar to GitHub stars)
- Branch management
- Collaborator management
- Explorer API for web integration
- Download repository content in various formats

## Repository Structure

- `/programs/git-solana/` - Main Solana program for Git repository management
- `/programs/git-star/` - Solana program for repository starring functionality
- `/server/` - API server for the SolAR Explorer website
- `/tests/` - Test scripts for the Solana programs
- `/test/` - Workflow testing scripts

## Setup and Testing

### Prerequisites

- [Solana Tool Suite](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor Framework](https://www.anchor-lang.com/)
- Node.js and npm

### Setup

1. Clone this repository
2. Install dependencies
   ```
   npm install
   ```
3. Build the Solana programs
   ```
   anchor build
   ```

### Running Tests

1. Start a local Solana test validator
   ```
   solana-test-validator
   ```

2. Run the test suite
   ```
   anchor test
   ```

### Testing the Complete Workflow

To test the complete workflow as a new user:

1. Make sure your local Solana validator is running:
   ```
   solana-test-validator
   ```

2. Create a test user:
   ```
   node test/create-test-user.js
   ```

3. Run the full workflow test:
   ```
   node test/test-full-workflow.js
   ```

   This script will:
   - Create a new Git repository on Solana
   - Add a branch with mock content
   - Star the repository
   - Display repository details and stats

4. Start the API server:
   ```
   cd server
   npm install
   npm run dev
   ```

5. Test the API endpoints:
   - List repositories: http://localhost:3001/api/repositories
   - View repository details: http://localhost:3001/api/repositories/{owner}/{name}
   - Download content: http://localhost:3001/api/repositories/{owner}/{name}/download?branch=main

### Using the API in the SolAR Explorer Website

The API server provides all necessary endpoints for the SolAR Explorer website, including:

- Repository listing with pagination and filtering
- Repository details
- Star tracking
- Content download

For development without a running Solana node, you can use the mock endpoints:
- http://localhost:3001/api/mock/repositories
- http://localhost:3001/api/mock/repositories/{owner}/{name}
- http://localhost:3001/api/mock/repositories/{owner}/{name}/download

## API Documentation

Detailed API documentation is available in the server README:
[API Documentation](/server/README.md)

## License

[MIT License](LICENSE)