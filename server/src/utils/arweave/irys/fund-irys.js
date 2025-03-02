// Fund Irys account with devnet SOL
const Irys = require('@irys/sdk');
const fs = require('fs');

// The Solana key path
const SOLANA_KEY_PATH = "./solana.key";

// Public key for reference
const PUBLIC_KEY = 'ByQrgsRLGhH4Ah7pL5EZHQ2yagdtTiAjMFgJhhDNzgqZ';

// Amount to fund in SOL
const FUND_AMOUNT = '0.01'; // 0.01 SOL should be more than enough for testing

async function fundIrys() {
  try {
    // Read private key
    if (!fs.existsSync(SOLANA_KEY_PATH)) {
      console.error(`Error: Key file not found at ${SOLANA_KEY_PATH}`);
      return;
    }
    
    const key = fs.readFileSync(SOLANA_KEY_PATH, "utf8").trim();
    console.log(`Using wallet: ${PUBLIC_KEY}`);
    console.log(`Funding amount: ${FUND_AMOUNT} SOL`);
    
    // Connect to Irys using devnet
    const irys = new Irys({
      network: "devnet", // Using devnet for testing
      token: "solana",
      key: key,
      config: {
        providerUrl: "https://api.devnet.solana.com" // Solana devnet
      }
    });
    
    // Get initial balance
    const initialBalance = await irys.getLoadedBalance();
    console.log(`Initial Irys balance: ${irys.utils.fromAtomic(initialBalance)} SOL`);
    
    // Fund the account
    console.log(`Funding Irys account with ${FUND_AMOUNT} SOL...`);
    const fundTx = await irys.fund(irys.utils.toAtomic(FUND_AMOUNT));
    
    console.log(`Funding transaction successful!`);
    console.log(`Transaction ID: ${fundTx.id}`);
    console.log(`Funded amount: ${irys.utils.fromAtomic(fundTx.quantity)} SOL`);
    
    // Check new balance
    const newBalance = await irys.getLoadedBalance();
    console.log(`New Irys balance: ${irys.utils.fromAtomic(newBalance)} SOL`);
    
  } catch (error) {
    console.error('Error funding Irys account:', error);
  }
}

fundIrys();