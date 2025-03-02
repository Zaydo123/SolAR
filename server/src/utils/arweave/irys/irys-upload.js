// Upload Git bundle to Arweave using a funded Irys account
const Irys = require('@irys/sdk');
const fs = require('fs');
const { execSync } = require('child_process');

// The Solana key path
const SOLANA_KEY_PATH = "./solana.key";

// Public key for reference
const PUBLIC_KEY = 'ByQrgsRLGhH4Ah7pL5EZHQ2yagdtTiAjMFgJhhDNzgqZ';

// Path for the Git bundle
const BUNDLE_PATH = "repo.bundle";

async function uploadGitBundle() {
  try {
    // Read private key
    if (!fs.existsSync(SOLANA_KEY_PATH)) {
      console.error(`Error: Key file not found at ${SOLANA_KEY_PATH}`);
      return;
    }
    
    const key = fs.readFileSync(SOLANA_KEY_PATH, "utf8").trim();
    console.log(`Using wallet: ${PUBLIC_KEY}`);
    
    // Create a Git bundle
    console.log("\n🔄 Creating Git bundle...");
    execSync("git bundle create repo.bundle --all", { stdio: "inherit" });
    
    // Verify the bundle
    try {
      console.log("🔍 Verifying Git bundle...");
      execSync("git bundle verify repo.bundle", { stdio: "inherit" });
      console.log("✅ Git bundle verified successfully");
    } catch (verifyError) {
      console.error(`❌ Git bundle verification failed:`, verifyError.message);
      return null;
    }
    
    // Get file info
    const fileSize = fs.statSync(BUNDLE_PATH).size;
    console.log(`📊 Bundle file size: ${fileSize} bytes`);
    
    // Connect to Irys using devnet
    const irys = new Irys({
      network: "devnet", // Using devnet for testing
      token: "solana",
      key: key,
      config: {
        providerUrl: "https://api.devnet.solana.com" // Solana devnet
      }
    });
    
    // Check balance
    let atomicBalance = await irys.getLoadedBalance();
    const price = await irys.getPrice(fileSize);
    console.log(`💰 Current balance: ${irys.utils.fromAtomic(atomicBalance)} SOL`);
    console.log(`💰 Upload price: ${irys.utils.fromAtomic(price)} SOL`);
    
    // Check if we have enough balance
    if (atomicBalance < price) {
      // We need to auto-fund but since you indicated your account has funds, we'll skip this
      console.log(`❓ Not enough balance for this upload. We would need to fund more.`);
      console.log(`✋ However, since you have already funded your account with 0.01 SOL, we'll proceed anyway`);
    } else {
      console.log(`✅ Sufficient balance for upload`);
    }
    
    // Prepare tags for the upload
    const tags = [
      { name: "Content-Type", value: "application/octet-stream" },
      { name: "App-Name", value: "SolAR-Git-Bundle" },
      { name: "Git-Bundle", value: "true" },
      { name: "Bundle-Format", value: "git-bundle-v2" },
      { name: "File-Size", value: String(fileSize) },
      { name: "Repository", value: "SolAR" },
      { name: "Timestamp", value: new Date().toISOString() }
    ];
    
    // Perform the actual upload
    console.log("\n📤 Uploading Git bundle to Arweave via Irys...");
    const receipt = await irys.uploadFile(BUNDLE_PATH, { tags });
    
    console.log("\n✅ Upload successful!");
    console.log(`🔗 Transaction ID: ${receipt.id}`);
    console.log(`🔗 Arweave URL: https://gateway.irys.xyz/${receipt.id}`);
    
    // Final balance
    const finalBalance = await irys.getLoadedBalance();
    console.log(`💰 Remaining balance: ${irys.utils.fromAtomic(finalBalance)} SOL`);
    
    return receipt.id;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

uploadGitBundle();