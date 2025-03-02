# Client-Side Transaction Signing for SolAR Git

This documentation describes the client-side signing tool located at `/Users/zaydalzein/Desktop/SolAR/solar-git-signer`.

This guide explains how to set up and use the client-side Solana transaction signing feature for SolAR Git repositories.

## Why Client-Side Signing?

By signing Solana transactions on the client side, we ensure that:

1. Only the repository owner can make changes to their repository on the Solana blockchain
2. The server cannot impersonate users or modify their repositories without permission
3. The security model more closely aligns with Git's built-in authentication

## Installation

### Prerequisites

- Node.js 14+ and npm
- A Solana keypair (typically located at `~/.config/solana/id.json`)
- Git

### Installing the Solar Git Signer

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

Or install directly from npm:

```bash
npm install -g @solar/git-signer
```

## Setting Up Your Repository

Once installed, you need to configure your Git repository to use the signer:

```bash
# Navigate to your Git repository
cd your-repository

# Install the pre-push hook
solar-signer install --server http://localhost:5003
```

This will add a pre-push hook to your repository that will automatically sign Solana transactions when you push changes.

## Configuration Options

### Signing Methods

Solar Git Signer supports three methods for signing Solana transactions:

1. **CLI Wallet** (default): Uses your local Solana keypair file
2. **Browser Wallet**: Opens a browser window to sign with Phantom, Solflare, etc.
3. **QR Code**: Generates a QR code to scan with a mobile wallet

You can set your preferred method using the `SOLAR_SIGN_METHOD` environment variable:

```bash
# Use CLI wallet (default)
export SOLAR_SIGN_METHOD=cli

# Use browser wallet
export SOLAR_SIGN_METHOD=browser

# Use QR code for mobile wallet
export SOLAR_SIGN_METHOD=qrcode
```

### Custom Keypair Location

If your Solana keypair is not in the default location (`~/.config/solana/id.json`), you can specify the path:

```bash
export SOLANA_KEYPAIR_PATH=/path/to/your/keypair.json
```

## Usage

After setup, simply use Git as you normally would:

```bash
git add .
git commit -m "Your commit message"
git push
```

When you push, the pre-push hook will:

1. Extract repository and commit information
2. Request an unsigned transaction from the server
3. Prompt you to sign the transaction
4. Send the signed transaction back to the server
5. Complete the push operation

## Troubleshooting

### Hook Not Executing

If the pre-push hook isn't running:

```bash
# Check permissions
chmod +x .git/hooks/pre-push

# Reinstall the hook
solar-signer install --server http://localhost:5003
```

### Signing Failures

For CLI wallet signing issues:

```bash
# Check keypair file exists
ls -la ~/.config/solana/id.json

# Specify custom keypair path
export SOLANA_KEYPAIR_PATH=/path/to/your/keypair.json
```

For browser wallet issues:

```bash
# Make sure a browser wallet is installed (Phantom, Solflare, etc.)
# Try a different method
export SOLAR_SIGN_METHOD=cli
```

## Manual Transaction Signing

You can also sign transactions manually:

```bash
# Sign a transaction for a specific commit
solar-signer sign --owner owner-name --repo repo-name --branch master --commit abcdef123456
```

## Security Considerations

- Your private key never leaves your machine
- The server only receives signed transactions
- Always verify repository details before signing
- Use a dedicated Solana keypair for repository signing

## Further Help

For more information, run:

```bash
solar-signer --help
```

Or contact the SolAR team for support.