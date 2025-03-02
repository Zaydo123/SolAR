/**
 * Direct Irys implementation for uploading Git bundles to Arweave
 * This uses the latest Irys SDK with proper Solana integration
 */

const fs = require('fs');
const { execSync } = require('child_process');
const { Keypair } = require('@solana/web3.js');
const { Uploader } = require("@irys/upload");
const { Solana } = require("@irys/upload-solana");

/**
 * Upload a Git bundle to Arweave using Irys with Solana payment
 * 
 * @param {Object} options Configuration options
 * @param {string} options.keyPath Path to the Solana private key file (JSON format)
 * @param {string} options.bundlePath Path to the Git bundle file
 * @param {boolean} options.verbose Enable detailed logging
 * @returns {Promise<string>} Arweave transaction ID
 */
async function uploadBundle(options) {
  const { keyPath, bundlePath, verbose = true } = options;
  
  if (verbose) {
    console.log(`\n🚀 Direct Irys upload starting...`);
  }
  
  try {
    // 1. Read and parse the Solana keypair
    if (!fs.existsSync(keyPath)) {
      throw new Error(`Keypair file not found at ${keyPath}`);
    }
    
    if (!fs.existsSync(bundlePath)) {
      throw new Error(`Bundle file not found at ${bundlePath}`);
    }
    
    // Read the keyfile data
    const keyData = fs.readFileSync(keyPath, 'utf8').trim();
    let secretKey;
    
    try {
      // Try to parse the JSON data
      const parsed = JSON.parse(keyData);
      
      if (Array.isArray(parsed)) {
        // Handle array format directly
        secretKey = Uint8Array.from(parsed);
      } else {
        throw new Error('Key must be in JSON array format');
      }
    } catch (parseError) {
      if (verbose) {
        console.error(`Error parsing key file: ${parseError.message}`);
      }
      throw new Error('Invalid key format - must be valid JSON array of Solana private key bytes');
    }
    
    // 2. Create Solana keypair from private key
    const keypair = Keypair.fromSecretKey(secretKey);
    
    if (verbose) {
      console.log(`Using Solana wallet: ${keypair.publicKey.toString()}`);
    }
    
    // 3. Convert secretKey to base58 string format as required by the Irys uploader
    // Directly use the private key bytes from the keypair
    const privateKeyBytes = secretKey;
    
    // 4. Check file size
    const fileSize = fs.statSync(bundlePath).size;
    if (verbose) {
      console.log(`Bundle file size: ${fileSize} bytes`);
    }
    
    // Initialize the Irys uploader with Solana
    const getIrysUploader = async () => {
      if (verbose) {
        console.log(`Initializing Irys uploader with Solana wallet...`);
      }
      
      try {
        // Initialize with Solana using the private key
        const irysUploader = await Uploader(Solana).withChain({
          providerUrl: "https://api.devnet.solana.com", 
          privateKey: privateKeyBytes,
          network: 'devnet'
        });
        
        if (verbose) {
          console.log(`Irys uploader initialized successfully!`);
        }
        
        return irysUploader;
      } catch (initError) {
        console.error(`Error initializing Irys uploader: ${initError.message}`);
        throw initError;
      }
    };
    
    // Get the Irys uploader instance
    const irys = await getIrysUploader();
    
    // 7. Add tags for better discoverability
    const tags = [
      { name: "Content-Type", value: "application/octet-stream" },
      { name: "App-Name", value: "SolAR-Git" },
      { name: "Git-Bundle", value: "true" },
      { name: "Timestamp", value: new Date().toISOString() },
      { name: "File-Size", value: fileSize.toString() }
    ];
    
    // 8. Upload file
    if (verbose) {
      console.log(`Uploading bundle to Arweave...`);
    }
    
    try {
      // Upload the file using the uploadFile method
      if (verbose) {
        console.log(`Uploading file at path: ${bundlePath}`);
      }
      
      const receipt = await irys.uploadFile(bundlePath, { tags });
      
      if (verbose) {
        console.log(`\n✅ Upload successful!`);
        console.log(`Transaction ID: ${receipt.id}`);
        console.log(`Arweave URL: https://gateway.irys.xyz/${receipt.id}`);
      }
      
      return receipt.id;
    } catch (uploadError) {
      console.error(`Error during upload: ${uploadError.message}`);
      throw uploadError;
    }
  } catch (error) {
    console.error(`Error in direct Irys upload: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    throw error;
  }
}

module.exports = { uploadBundle };