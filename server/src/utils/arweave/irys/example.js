/**
 * Example usage of the Git-Arweave integration
 */
const { uploadGitBundle, downloadGitBundle } = require('./git-arweave');

// The transaction ID of our previously uploaded bundle
const EXAMPLE_TX_ID = '4RPGy1KK7zaiMBYWDd73XVFeJCH8SnDfP1VhjX7sZ9JH';

// Example 1: Upload a Git repository to Arweave
async function uploadExample() {
  try {
    console.log('Example 1: Uploading a repository to Arweave');
    
    // Upload the current directory as a Git bundle
    const txId = await uploadGitBundle({
      keyPath: './solana.key',  // Path to your Solana private key
      repoPath: '.',            // Repository to bundle (current directory)
      bundlePath: 'repo.bundle', // Where to save the bundle file
      network: 'devnet',        // 'devnet' or 'mainnet'
      verbose: true             // Show detailed logs
    });
    
    console.log(`\n✅ Repository uploaded successfully!`);
    console.log(`Transaction ID: ${txId}`);
    console.log(`Arweave URL: https://gateway.irys.xyz/${txId}`);
    
    return txId;
  } catch (error) {
    console.error(`❌ Error uploading repository:`, error);
  }
}

// Example 2: Download a Git repository from Arweave
async function downloadExample(txId = EXAMPLE_TX_ID) {
  try {
    console.log(`\nExample 2: Downloading repository from Arweave`);
    console.log(`Transaction ID: ${txId}`);
    
    // Download and restore the repository
    const outputDir = await downloadGitBundle(txId, {
      outputDir: 'downloaded-repo', // Where to restore the repository
      bundlePath: 'downloaded.bundle', // Where to save the bundle file
      verbose: true                 // Show detailed logs
    });
    
    console.log(`\n✅ Repository downloaded and restored successfully!`);
    console.log(`Output directory: ${outputDir}`);
    
    return outputDir;
  } catch (error) {
    console.error(`❌ Error downloading repository:`, error);
  }
}

// Run both examples
async function runExamples() {
  // First upload, then download using the returned transaction ID
  const txId = await uploadExample();
  
  if (txId) {
    await downloadExample(txId);
  } else {
    // If upload failed, use the example transaction ID
    await downloadExample();
  }
}

// Run the examples
runExamples();

/**
 * How to use the Git-Arweave Integration in your own code:
 * 
 * 1. Upload a repository:
 * 
 * const { uploadGitBundle } = require('./git-arweave');
 * 
 * async function storeRepo() {
 *   try {
 *     const txId = await uploadGitBundle({
 *       keyPath: './path-to-your-solana-key.key',
 *       repoPath: './path-to-your-repo',
 *     });
 *     console.log(`Repository stored with transaction ID: ${txId}`);
 *     return txId;
 *   } catch (error) {
 *     console.error('Error storing repository:', error);
 *   }
 * }
 * 
 * 2. Download a repository:
 * 
 * const { downloadGitBundle } = require('./git-arweave');
 * 
 * async function retrieveRepo(transactionId) {
 *   try {
 *     const outputDir = await downloadGitBundle(transactionId, {
 *       outputDir: './my-restored-repo'
 *     });
 *     console.log(`Repository restored to: ${outputDir}`);
 *     return outputDir;
 *   } catch (error) {
 *     console.error('Error retrieving repository:', error);
 *   }
 * }
 */