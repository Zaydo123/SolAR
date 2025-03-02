/**
 * Simplified Arweave downloader to retrieve Git bundles
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');
const os = require('os');

/**
 * Download a Git bundle from Arweave
 * 
 * @param {Object} options Options for downloading
 * @param {string} options.transactionId The Arweave transaction ID
 * @param {string} options.outputPath Path to save the downloaded bundle
 * @param {boolean} options.verbose Enable verbose logging
 * @returns {Promise<string>} Path to the downloaded bundle
 */
async function downloadFromArweave(options) {
  const { transactionId, outputPath, verbose = true } = options;
  
  if (!transactionId) {
    throw new Error('Transaction ID is required');
  }
  
  if (!outputPath) {
    throw new Error('Output path is required');
  }
  
  try {
    if (verbose) {
      console.log(`\n🔄 Downloading Git bundle from Arweave...`);
      console.log(`Transaction ID: ${transactionId}`);
      console.log(`Output path: ${outputPath}`);
    }
    
    // Create the gateway URL
    const gatewayUrl = `https://gateway.irys.xyz/${transactionId}`;
    
    if (verbose) {
      console.log(`Gateway URL: ${gatewayUrl}`);
    }
    
    // Download the bundle using axios with a responseType of arraybuffer
    if (verbose) {
      console.log(`Starting download...`);
    }
    
    const response = await axios.get(gatewayUrl, {
      responseType: 'arraybuffer',
      timeout: 30000, // 30 second timeout
    });
    
    if (verbose) {
      console.log(`Download complete. Size: ${response.data.byteLength} bytes`);
    }
    
    // Make sure the parent directory exists
    const parentDir = path.dirname(outputPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    
    // Write the bundle to disk
    fs.writeFileSync(outputPath, Buffer.from(response.data));
    
    if (verbose) {
      console.log(`Bundle saved to: ${outputPath}`);
    }
    
    // Verify the bundle
    if (verbose) {
      console.log(`Verifying bundle...`);
    }
    
    try {
      execSync(`git bundle verify "${outputPath}"`, { stdio: verbose ? 'inherit' : 'ignore' });
      if (verbose) {
        console.log(`Bundle verification successful!`);
      }
    } catch (error) {
      throw new Error(`Bundle verification failed: ${error.message}`);
    }
    
    return outputPath;
  } catch (error) {
    console.error(`Error downloading from Arweave:`, error);
    throw error;
  }
}

/**
 * Extract a Git bundle to a specified directory
 * 
 * @param {Object} options Options for extraction
 * @param {string} options.bundlePath Path to the bundle file
 * @param {string} options.extractDir Directory to extract the bundle to
 * @param {boolean} options.verbose Enable verbose logging
 * @returns {Promise<string>} Path to the extracted repository
 */
async function extractBundle(options) {
  const { bundlePath, extractDir, verbose = true } = options;
  
  try {
    if (verbose) {
      console.log(`\n📦 Extracting Git bundle...`);
      console.log(`Bundle path: ${bundlePath}`);
      console.log(`Extract directory: ${extractDir}`);
    }
    
    // Make sure the extract directory exists
    if (!fs.existsSync(extractDir)) {
      fs.mkdirSync(extractDir, { recursive: true });
    }
    
    // Extract the bundle
    if (verbose) {
      console.log(`Cloning from bundle...`);
    }
    
    execSync(`git clone "${bundlePath}" "${extractDir}"`, { stdio: verbose ? 'inherit' : 'ignore' });
    
    if (verbose) {
      console.log(`Bundle extracted successfully to: ${extractDir}`);
    }
    
    return extractDir;
  } catch (error) {
    console.error(`Error extracting bundle:`, error);
    throw error;
  }
}

module.exports = {
  downloadFromArweave,
  extractBundle
};