# SolAR: Decentralized Git Storage with Solana and Arweave

SolAR is a decentralized Git server that combines the familiar Git workflow with blockchain technology, providing developers with a resilient, transparent, and trustless code storage solution.

## Overview

SolAR leverages the power of two complementary blockchain technologies:
- **Solana**: For fast, low-cost transaction processing and repository metadata storage
- **Arweave**: For permanent, immutable storage of Git repository contents

Unlike traditional Git hosting platforms that rely on centralized servers, SolAR distributes repository data across blockchain networks, eliminating single points of failure and reducing the risk of censorship.

## Features

- **Standard Git Workflow**: Use familiar Git commands (clone, push, pull) with your existing tools
- **Blockchain-Based Metadata**: Repository metadata and branch references stored on Solana
- **Permanent Storage**: Repository contents stored permanently on the Arweave network
- **Resilient Architecture**: Repositories can be reconstructed entirely from blockchain data
- **Transparent History**: All changes are recorded on public blockchains with verifiable history

## How It Works

### Pushing Changes

When you push code to a SolAR server:

1. The server bundles your Git repository
2. Uploads the bundle to Arweave for permanent storage
3. Records the Arweave transaction ID in the Solana blockchain
4. Updates branch references in the Solana blockchain

### Cloning Repositories

When you clone a repository:

1. The server checks if the repository exists locally
2. If not, it queries Solana for repository metadata
3. Downloads the repository bundle from Arweave
4. Reconstructs the repository locally
5. Serves the clone request through Git's HTTP protocol

## Project Structure

- **`/server`**: The core Git server with Solana and Arweave integration
  - `/src/core`: Main server implementation files
  - `/src/utils`: Utility functions for Solana and Arweave
- **`/git-solana`**: Solana smart contract for repository metadata storage
- **`/solar-git-signer`**: Client-side signing tools for Solana transactions
- **`/test-git`**: Test repositories for development and testing

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Solana CLI tools
- Git
- A Solana wallet with SOL on the devnet

### Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/SolAR.git
   cd SolAR
   ```

2. Install dependencies:
   ```bash
   cd server
   npm install
   ```

3. Deploy the Solana program:
   ```bash
   cd ../git-solana
   anchor build
   anchor deploy --provider.cluster devnet
   ```

4. Start the SolAR server:
   ```bash
   cd ../server
   npm run dev
   ```

5. Use Git with SolAR:
   ```bash
   git clone http://localhost:5003/yourusername/your-repo
   cd your-repo
   # Make changes
   git push
   ```

## Configuration

The SolAR server can be configured through environment variables:

- `SOLANA_ENABLED`: Enable/disable Solana integration (default: true)
- `ARWEAVE_ENABLED`: Enable/disable Arweave integration (default: true)

The Solana wallet is configured in `.config/solana/id.json` by default.

## Current Status and Roadmap

SolAR is currently in development with basic functionality working:
- ✅ Git HTTP Smart Protocol implementation
- ✅ Solana program for repository metadata
- ✅ Arweave integration for permanent storage
- ✅ Resilient repository reconstruction

Future enhancements:
- Repository access control using Solana
- Client-side transaction signing
- Improved bundle efficiency
- Web interface for browsing repositories
- Federation between multiple SolAR servers

## Contributing

Contributions are welcome! Please feel free to submit pull requests, create issues, or suggest improvements.

## License

[MIT License](LICENSE)

## Acknowledgements

- [Solana](https://solana.com/) - Blockchain infrastructure
- [Arweave](https://www.arweave.org/) - Permanent storage network
- [Irys](https://irys.xyz/) - Simplified Arweave upload service
- [Anchor](https://github.com/coral-xyz/anchor) - Solana smart contract framework
