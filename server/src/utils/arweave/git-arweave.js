/**
 * SolAR Git-Arweave Integration
 * 
 * This module provides simple functions to store and retrieve Git repository bundles
 * on the Arweave network, using Irys (formerly Bundlr) with Solana for payment.
 * 
 * Usage:
 * 1. Upload repository: uploadGitBundle([options])
 * 2. Download repository: downloadGitBundle(transactionId, [options])
 */

const fs = require('fs');
const { execSync } = require('child_process');
const Irys = require('@irys/sdk');
const bs58 = require('bs58');

/**
 * Upload a Git repository to Arweave as a bundle
 * 
 * @param {Object} options Configuration options
 * @param {string} options.keyPath Path to the Solana private key file (base58 format)
 * @param {string} options.bundlePath Path where the Git bundle should be created
 * @param {string} options.repoPath Path to the repository to bundle (defaults to current directory)
 * @param {string} options.network Irys network to use ('devnet' or 'mainnet')
 * @param {boolean} options.verbose Enable detailed logging
 * @returns {Promise<string>} Transaction ID of the uploaded bundle
 */
async function uploadGitBundle(options = {}) {
  // Set default options
  const {
    keyPath = './solana.key',
    bundlePath = 'repo.bundle',
    repoPath = '.',
    network = 'devnet',
    verbose = true
  } = options;
  
  try {
    // Log function start
    if (verbose) {
      console.log(`\n🚀 Uploading Git repository to Arweave...`);
    }
    
    // Read Solana key
    if (!fs.existsSync(keyPath)) {
      throw new Error(`Solana key not found at ${keyPath}`);
    }
    
    // Get key data
    let key;
    try {
      // Try to parse as JSON (Solana CLI format)
      const keyData = fs.readFileSync(keyPath, 'utf8').trim();
      
      // Check if this is a JSON array (standard Solana format)
      if (keyData.startsWith('[') && keyData.endsWith(']')) {
        // Convert JSON array to Uint8Array
        const secretKeyArray = JSON.parse(keyData);
        const secretKeyUint8 = new Uint8Array(secretKeyArray);
        
        // Convert to base58 format that Irys expects
        // Use a different approach since there seems to be an issue with bs58
        
        // Convert Uint8Array to Buffer
        const secretKeyBuffer = Buffer.from(secretKeyUint8);
        
        // Use base64 as an alternative encoding
        key = secretKeyBuffer.toString('base64');
        
        if (verbose) {
          console.log(`Using base64 encoding as fallback for Irys`);
        }
        
        if (verbose) {
          console.log(`Converted Solana CLI key format for Irys`);
        }
      } else {
        // Assume it's already in base58 format
        key = keyData;
      }
    } catch (keyError) {
      throw new Error(`Failed to parse Solana key: ${keyError.message}`);
    }
    
    // Create Git bundle
    if (verbose) {
      console.log(`\n🔄 Creating Git bundle from ${repoPath}...`);
    }
    
    try {
      execSync(`cd ${repoPath} && git bundle create ${bundlePath} --all`, 
        { stdio: verbose ? 'inherit' : 'ignore' });
    } catch (bundleError) {
      throw new Error(`Failed to create Git bundle: ${bundleError.message}`);
    }
    
    // Verify the bundle
    if (verbose) {
      console.log(`🔍 Verifying Git bundle...`);
    }
    
    try {
      execSync(`git bundle verify ${bundlePath}`, 
        { stdio: verbose ? 'inherit' : 'ignore' });
    } catch (verifyError) {
      throw new Error(`Git bundle verification failed: ${verifyError.message}`);
    }
    
    // Get bundle file size
    const fileSize = fs.statSync(bundlePath).size;
    if (verbose) {
      console.log(`📊 Bundle file size: ${fileSize} bytes`);
    }
    
    // Initialize Irys with Solana
    const providerUrl = network === 'devnet' 
      ? 'https://api.devnet.solana.com' 
      : 'https://api.mainnet-beta.solana.com';
    
    const irys = new Irys({
      network, // 'devnet' or 'mainnet'
      token: 'solana',
      key,
      config: {
        providerUrl
      }
    });
    
    // Check Irys balance
    const atomicBalance = await irys.getLoadedBalance();
    const price = await irys.getPrice(fileSize);
    
    if (verbose) {
      console.log(`💰 Irys balance: ${irys.utils.fromAtomic(atomicBalance)} SOL`);
      console.log(`💰 Upload price: ${irys.utils.fromAtomic(price)} SOL`);
    }
    
    // Check if we need to fund
    if (atomicBalance < price) {
      const additionalNeeded = price - atomicBalance;
      
      if (verbose) {
        console.log(`💸 Insufficient funds. Need ${irys.utils.fromAtomic(additionalNeeded)} more SOL`);
        console.log(`💸 Attempting to fund Irys account...`);
      }
      
      try {
        // Add 20% buffer
        const fundAmount = Math.ceil(additionalNeeded * 1.2);
        const fundTx = await irys.fund(fundAmount);
        
        if (verbose) {
          console.log(`✅ Funding successful: ${irys.utils.fromAtomic(fundTx.quantity)} SOL`);
        }
      } catch (fundError) {
        throw new Error(`Failed to fund Irys account: ${fundError.message}`);
      }
    }
    
    // Prepare tags for the upload
    const tags = [
      { name: 'Content-Type', value: 'application/octet-stream' },
      { name: 'App-Name', value: 'SolAR-Git-Bundle' },
      { name: 'Git-Bundle', value: 'true' },
      { name: 'Bundle-Format', value: 'git-bundle-v2' },
      { name: 'File-Size', value: String(fileSize) },
      { name: 'Repository', value: 'SolAR' },
      { name: 'Timestamp', value: new Date().toISOString() }
    ];
    
    // Upload the bundle
    if (verbose) {
      console.log(`\n📤 Uploading Git bundle to Arweave via Irys...`);
    }
    
    const receipt = await irys.uploadFile(bundlePath, { tags });
    
    if (verbose) {
      console.log(`\n✅ Upload successful!`);
      console.log(`🔗 Transaction ID: ${receipt.id}`);
      console.log(`🔗 Arweave URL: https://gateway.irys.xyz/${receipt.id}`);
    }
    
    return receipt.id;
  } catch (error) {
    console.error(`❌ Error uploading Git bundle: ${error.message}`);
    throw error;
  }
}

/**
 * Download a Git repository from Arweave and restore it
 * 
 * @param {string} transactionId Arweave transaction ID of the Git bundle
 * @param {Object} options Configuration options
 * @param {string} options.outputDir Directory where the repository should be restored
 * @param {string} options.bundlePath Path where the Git bundle should be saved
 * @param {boolean} options.verbose Enable detailed logging
 * @returns {Promise<string>} Path to the restored repository
 */
async function downloadGitBundle(transactionId, options = {}) {
  if (!transactionId) {
    throw new Error('Transaction ID is required');
  }
  
  // Set default options
  const {
    outputDir = 'restored-repo',
    bundlePath = 'repo.bundle',
    verbose = true
  } = options;
  
  try {
    // Log function start
    if (verbose) {
      console.log(`\n🚀 Downloading Git repository from Arweave...`);
      console.log(`📝 Transaction ID: ${transactionId}`);
    }
    
    // Download URL from Irys/Arweave gateway
    const url = `https://gateway.irys.xyz/${transactionId}`;
    if (verbose) {
      console.log(`📥 Downloading Git bundle from: ${url}`);
    }
    
    // Fetch the bundle data
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data. Status: ${response.status}`);
    }
    
    if (verbose) {
      console.log(`Content-Type: ${response.headers.get('content-type')}`);
      console.log(`Content-Length: ${response.headers.get('content-length') || 'unknown'} bytes`);
    }
    
    // Convert to binary data
    const arrayBuffer = await response.arrayBuffer();
    const bundleBuffer = Buffer.from(arrayBuffer);
    
    if (verbose) {
      console.log(`📊 Downloaded ${bundleBuffer.length} bytes`);
    }
    
    if (bundleBuffer.length === 0) {
      throw new Error('Downloaded file is empty');
    }
    
    // Backup any existing bundle
    if (fs.existsSync(bundlePath)) {
      fs.copyFileSync(bundlePath, `${bundlePath}.bak`);
      if (verbose) {
        console.log(`💾 Created backup of existing ${bundlePath}`);
      }
    }
    
    // Write the downloaded bundle
    fs.writeFileSync(bundlePath, bundleBuffer);
    if (verbose) {
      console.log(`✅ Wrote ${bundleBuffer.length} bytes to ${bundlePath}`);
    }
    
    // Verify the bundle
    try {
      execSync(`git bundle verify ${bundlePath}`, 
        { stdio: verbose ? 'inherit' : 'ignore' });
      if (verbose) {
        console.log(`✅ Git bundle verification successful!`);
      }
    } catch (verifyError) {
      throw new Error(`Git bundle verification failed: ${verifyError.message}`);
    }
    
    // Clean up previous repo extraction
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
    
    // Extract the bundle
    if (verbose) {
      console.log(`📂 Extracting bundle into '${outputDir}'...`);
    }
    
    fs.mkdirSync(outputDir, { recursive: true });
    execSync(`git clone ${bundlePath} ${outputDir}`, 
      { stdio: verbose ? 'inherit' : 'ignore' });
    
    if (verbose) {
      console.log(`\n✅ Repository successfully restored in '${outputDir}'`);
    }
    
    return outputDir;
  } catch (error) {
    console.error(`❌ Error downloading Git bundle: ${error.message}`);
    throw error;
  }
}

module.exports = {
  uploadGitBundle,
  downloadGitBundle
};