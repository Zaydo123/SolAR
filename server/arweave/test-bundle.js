const fs = require('fs');
const { uploadGitBundle, downloadGitBundle } = require('./arweaveGit');

// First, make a copy of our valid bundle
fs.copyFileSync('new-repo.bundle', 'repo.bundle');
console.log('✅ Created copy of valid Git bundle as repo.bundle');

// Run the test
(async () => {
  try {
    console.log('🔄 Starting upload-download test...');
    
    // Upload the bundle
    console.log('\n🚀 STEP 1: Uploading Git bundle');
    const txId = await uploadGitBundle();
    
    if (!txId) {
      console.error('❌ Failed to get transaction ID. Test aborted.');
      return;
    }
    
    console.log(`\n🔑 Transaction ID: ${txId}`);
    
    // Download the bundle
    console.log('\n🚀 STEP 2: Downloading Git bundle');
    await downloadGitBundle(txId);
    
    console.log('\n✅ Test completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
})();