const Arweave = require('arweave');
const fs = require('fs');

// Load Arweave key from JSON file
const keyPath = './arweave-key.json'; // Ensure this path is correct
const walletKey = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

// Initialize Arweave
const arweave = Arweave.init({
  host: 'localhost', // Use 'arweave.net' for mainnet
  port: 1984,        // Use 443 for mainnet, 1984 for ArLocal
  protocol: 'http'   // Use 'https' for mainnet
});

// Get wallet address from key
(async () => {
  try {
    const walletAddress = await arweave.wallets.jwkToAddress(walletKey);
    console.log("✅ Your Arweave Wallet Address:", walletAddress);
  } catch (error) {
    console.error("❌ Error getting wallet address:", error);
  }
})();
