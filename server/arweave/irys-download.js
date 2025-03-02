// Download Git bundle from Arweave via Irys
const fs = require('fs');
const { execSync } = require('child_process');

// Transaction ID from the upload
const TX_ID = '4RPGy1KK7zaiMBYWDd73XVFeJCH8SnDfP1VhjX7sZ9JH';

async function downloadGitBundle(transactionId = TX_ID) {
  try {
    console.log(`📝 Transaction ID: ${transactionId}`);
    
    // Download URL from Irys gateway
    const url = `https://gateway.irys.xyz/${transactionId}`;
    console.log(`📥 Downloading Git bundle from: ${url}`);
    
    // Fetch the bundle data
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`❌ Failed to fetch data. Status: ${response.status}`);
    }
    
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    console.log(`Content-Length: ${response.headers.get('content-length') || 'unknown'} bytes`);
    
    // Convert to binary data
    const arrayBuffer = await response.arrayBuffer();
    const bundleBuffer = Buffer.from(arrayBuffer);
    
    console.log(`📊 Downloaded ${bundleBuffer.length} bytes`);
    
    if (bundleBuffer.length === 0) {
      throw new Error("❌ Downloaded file is empty!");
    }
    
    // Backup any existing bundle
    if (fs.existsSync("repo.bundle")) {
      fs.copyFileSync("repo.bundle", "repo.bundle.bak");
      console.log("💾 Created backup of existing repo.bundle");
    }
    
    // Write the downloaded bundle
    fs.writeFileSync("repo.bundle", bundleBuffer);
    console.log(`✅ Wrote ${bundleBuffer.length} bytes to repo.bundle`);
    
    // Verify the bundle before attempting to use it
    try {
      execSync("git bundle verify repo.bundle", { stdio: "inherit" });
      console.log("✅ Git bundle verification successful!");
    } catch (verifyError) {
      console.error("❌ Git bundle verification failed:", verifyError.message);
      return;
    }
    
    // Clean up previous repo extraction
    if (fs.existsSync("restored-repo")) {
      fs.rmSync("restored-repo", { recursive: true, force: true });
    }
    
    // Extract the bundle
    console.log("📂 Extracting bundle into 'restored-repo/'...");
    fs.mkdirSync("restored-repo");
    execSync("git clone repo.bundle restored-repo", { stdio: "inherit" });
    
    console.log("\n✅ Repository successfully restored in 'restored-repo/'");
    console.log(`\n🔗 This Git bundle was stored permanently on the Arweave network`);
    console.log(`🔗 You can always retrieve it using the transaction ID: ${transactionId}`);
    console.log(`🔗 Or by visiting: https://gateway.irys.xyz/${transactionId}`);
  } catch (error) {
    console.error("❌ Error downloading Git bundle:", error);
  }
}

// Execute the download
downloadGitBundle();