// Check Solana devnet balance for the specified wallet
const { Connection, PublicKey } = require('@solana/web3.js');

// Connect to Solana devnet
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// The public key of the wallet
const publicKey = new PublicKey('ByQrgsRLGhH4Ah7pL5EZHQ2yagdtTiAjMFgJhhDNzgqZ');

async function checkBalance() {
  try {
    // Get the balance
    const balance = await connection.getBalance(publicKey);
    console.log(`Wallet address: ${publicKey.toString()}`);
    console.log(`Balance: ${balance / 1000000000} SOL`);
  } catch (error) {
    console.error('Error:', error);
  }
}

checkBalance();