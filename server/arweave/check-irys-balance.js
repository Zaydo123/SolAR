// Check Irys balance for the specified wallet
const Irys = require('@irys/sdk');
const fs = require('fs');

// The Solana key path
const SOLANA_KEY_PATH = "./solana.key";

// Public key for reference
const PUBLIC_KEY = 'ByQrgsRLGhH4Ah7pL5EZHQ2yagdtTiAjMFgJhhDNzgqZ';

async function checkIrysBalance() {
  try {
    // Read private key
    if (!fs.existsSync(SOLANA_KEY_PATH)) {
      console.error(`Error: Key file not found at ${SOLANA_KEY_PATH}`);
      return;
    }
    
    const key = fs.readFileSync(SOLANA_KEY_PATH, "utf8").trim();
    console.log(`Using private key for wallet: ${PUBLIC_KEY}`);
    
    // Connect to Irys using devnet
    const irys = new Irys({
      network: "devnet", // Using devnet for testing
      token: "solana",
      key: key,
      config: {
        providerUrl: "https://api.devnet.solana.com" // Solana devnet
      }
    });
    
    // Get the loaded balance
    const atomicBalance = await irys.getLoadedBalance();
    const convertedBalance = irys.utils.fromAtomic(atomicBalance);
    
    console.log(`Irys Network: devnet`);
    console.log(`Irys Balance: ${convertedBalance} solana`);
    
    // Check price for a small upload
    const price = await irys.getPrice(1024 * 10); // 10KB
    console.log(`Price for 10KB upload: ${irys.utils.fromAtomic(price)} solana`);
    
    if (atomicBalance >= price) {
      console.log(`✅ You have enough balance for small uploads`);
    } else {
      console.log(`❌ You need to fund your Irys account`);
      console.log(`   Required funding: ${irys.utils.fromAtomic(price)} solana`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkIrysBalance();