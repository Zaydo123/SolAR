/**
 * Simplified direct upload to Irys/Arweave
 */
const Irys = require('@irys/sdk');
const fs = require('fs');

/**
 * Upload a file to Arweave using the Irys SDK
 * 
 * @param {Object} options - The options for the upload
 * @param {string} options.keyPath - Path to the Solana key file
 * @param {string} options.bundlePath - Path to the bundle to upload
 * @param {boolean} options.verbose - Enable verbose logging
 * @returns {Promise<string>} The transaction ID
 */
async function uploadToArweave(options) {
  const { keyPath, bundlePath, verbose = true } = options;
  
  if (verbose) {
    console.log(`\n🚀 Simple Arweave upload starting...`);
  }
  
  try {
    // Read and parse the key file
    if (!fs.existsSync(keyPath)) {
      throw new Error(`Key file not found at ${keyPath}`);
    }
    
    if (!fs.existsSync(bundlePath)) {
      throw new Error(`Bundle file not found at ${bundlePath}`);
    }
    
    const keyData = fs.readFileSync(keyPath, 'utf8').trim();
    let privateKey;
    
    try {
      // Parse as JSON array
      privateKey = JSON.parse(keyData);
    } catch (error) {
      throw new Error(`Invalid key format: ${error.message}`);
    }
    
    // Initialize Irys with Solana
    const irys = new Irys({
      url: "https://devnet.irys.xyz",
      token: "solana",
      key: privateKey,
      config: { providerUrl: "https://api.devnet.solana.com" }
    });
    
    // Get file size
    const fileSize = fs.statSync(bundlePath).size;
    
    if (verbose) {
      console.log(`File size: ${fileSize} bytes`);
      console.log(`Checking balance...`);
    }
    
    // Check balance
    const balance = await irys.getLoadedBalance();
    
    if (verbose) {
      console.log(`Current balance: ${irys.utils.fromAtomic(balance)}`);
    }
    
    // Get price
    const price = await irys.getPrice(fileSize);
    
    if (verbose) {
      console.log(`Price: ${irys.utils.fromAtomic(price)}`);
    }
    
    // Fund if needed
    if (balance < price) {
      const fundAmount = price - balance;
      
      if (verbose) {
        console.log(`Funding ${irys.utils.fromAtomic(fundAmount)}`);
      }
      
      await irys.fund(fundAmount);
      
      if (verbose) {
        const newBalance = await irys.getLoadedBalance();
        console.log(`New balance: ${irys.utils.fromAtomic(newBalance)}`);
      }
    }
    
    // Create tags
    const tags = [
      { name: "Content-Type", value: "application/octet-stream" },
      { name: "App-Name", value: "SolAR-Git" },
      { name: "Git-Bundle", value: "true" },
      { name: "Timestamp", value: new Date().toISOString() },
      { name: "File-Size", value: fileSize.toString() }
    ];
    
    // Upload
    if (verbose) {
      console.log(`Uploading to Arweave...`);
    }
    
    const receipt = await irys.uploadFile(bundlePath, { tags });
    
    if (verbose) {
      console.log(`\n✅ Upload successful!`);
      console.log(`Transaction ID: ${receipt.id}`);
      console.log(`Arweave URL: https://gateway.irys.xyz/${receipt.id}`);
    }
    
    return receipt.id;
  } catch (error) {
    console.error(`❌ Error uploading to Arweave:`, error);
    throw error;
  }
}

module.exports = { uploadToArweave };