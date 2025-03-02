// upload.js
const Arweave = require('arweave');
const fs = require('fs');
const path = require('path');

// Use __dirname directly in CommonJS
const keyPath = path.resolve(__dirname, 'arweave-key.json');
const walletKey = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

// Initialize Arweave to point to your local ArLocal instance
const arweave = Arweave.init({
  host: 'localhost',    // Use 'arweave.net' for mainnet/testnet
  port: 1984,           // Default port for ArLocal
  protocol: 'http'
});

/**
 * Uploads file content to Arweave.
 * @param {string|Buffer} fileContent - The content you want to store.
 * @returns {Promise<string>} - The URL where the content is accessible.
 */
const uploadToArweave = async (fileContent) => {
  try {
    // Create a transaction with the file content
    const transaction = await arweave.createTransaction({ data: fileContent }, walletKey);

    // Add a tag for content type (optional, but useful for retrieval)
    transaction.addTag('Content-Type', 'text/plain');

    // Sign the transaction with your wallet key
    await arweave.transactions.sign(transaction, walletKey);

    // Post the transaction to Arweave
    const response = await arweave.transactions.post(transaction);
    if (response.status === 200 || response.status === 202) {
      console.log(`Transaction successfully posted! Transaction ID: ${transaction.id}`);
    } else {
      console.error('Failed to post transaction', response);
    }

    // Return the permanent URL
    return `https://arweave.net/${transaction.id}`;
  } catch (error) {
    console.error("Error uploading to Arweave:", error);
    throw error;
  }
};

// Example usage: upload a sample string
(async () => {
  try {
    const arweaveUrl = await uploadToArweave("Hello, Arweave! This is a test upload from Crypto Git.");
    console.log("Uploaded file available at:", arweaveUrl);
  } catch (error) {
    console.error("Upload failed:", error);
  }
})();
