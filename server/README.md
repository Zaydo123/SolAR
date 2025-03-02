# SolAR Git Server

A decentralized Git server that integrates with Solana blockchain for storing repository metadata and Arweave for permanent content storage.

## Features

- **Standard Git Server**: Works with all standard Git operations (clone, push, pull)
- **Solana Integration**: Stores repository metadata on the Solana blockchain
- **Arweave Storage**: Backs up repository content to permanent Arweave storage
- **Fallback Mechanism**: Works even when blockchain components are unavailable
- **Simple Setup**: Easy to run and configure

## Project Structure

```
server/
├── src/               # Source code directory
│   ├── core/          # Core server implementation
│   │   └── integrated-server.js  # Main integrated server
│   ├── utils/         # Utility functions and modules
│   │   ├── solanaClient.js       # Solana blockchain client
│   │   └── arweave/              # Arweave storage utilities
│   ├── docs/          # Documentation
│   └── tests/         # Test files
├── repos/             # Local repository storage
└── bundles/           # Git bundle storage for Arweave uploads
```

## Quick Start

1. Install dependencies:
```
npm install
```

2. Start the server:
```
npm start
```

Or start without blockchain integration:
```
npm run start:nosol
```

3. Test with Git:
```
git clone http://localhost:5003/<owner>/<repo>
```

## Using Arweave Integration

Upload a Git repository to Arweave:
```
npm run arweave upload
```

Download from Arweave using a transaction ID:
```
npm run arweave download <TX_ID>
```

Check your Arweave balance:
```
npm run arweave balance
```

## Configuration

The server can be configured using environment variables:

- `SOLANA_ENABLED`: Set to "false" to disable Solana integration
- `ARWEAVE_ENABLED`: Set to "false" to disable Arweave integration
- `PORT`: Set the server port (default: 5003)

## Development

For development with auto-restart:
```
npm run dev
```

Set up Solana keys and test environment:
```
npm run setup
```