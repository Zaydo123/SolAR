#!/usr/bin/env node
const { 
  checkBalance, 
  fundNode, 
  uploadGitBundle, 
  downloadGitBundle 
} = require("./irysGit");

// Parse command line arguments
const action = process.argv[2];
const param1 = process.argv[3];
const param2 = process.argv[4];

// Main execution
(async () => {
  try {
    // Handle different commands
    switch(action) {
      case "upload":
        // Upload with specified payment method or default to Solana
        const paymentMethod = param1 === "arweave" ? "arweave" : "solana";
        console.log(`🚀 Uploading Git bundle using ${paymentMethod} for payment...`);
        const txId = await uploadGitBundle(paymentMethod);
        if (txId) {
          console.log(`\n✅ Use this TX ID to download: ${txId}`);
          console.log(`🔍 View on Irys: https://gateway.irys.xyz/${txId}`);
        }
        break;
        
      case "download":
        // Download bundle by transaction ID
        if (!param1) {
          console.error("❌ Transaction ID is required for download");
          showUsage();
          return;
        }
        
        await downloadGitBundle(param1);
        break;
        
      case "balance":
        // Check balance with specified payment method or default to Solana
        const balanceMethod = param1 === "arweave" ? "arweave" : "solana";
        await checkBalance(balanceMethod);
        break;
        
      case "fund":
        // Fund node with specified amount and payment method
        const amount = param1 || "0.05";
        const fundMethod = param2 === "arweave" ? "arweave" : "solana";
        await fundNode(amount, fundMethod);
        break;
        
      default:
        showUsage();
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
})();

function showUsage() {
  console.log(`
📦 SolAR Git Bundle with Irys/Arweave

Usage:
  node irys-cli.js upload [solana|arweave]    # Upload bundle, optionally specify payment token
  node irys-cli.js download <TX_ID>           # Download and restore from TX_ID
  node irys-cli.js balance [solana|arweave]   # Check Irys balance
  node irys-cli.js fund [amount] [solana|arweave]  # Fund Irys node with amount

Examples:
  node irys-cli.js upload                 # Upload using Solana for payment
  node irys-cli.js upload arweave         # Upload using Arweave for payment
  node irys-cli.js download abc123        # Download and restore from TX ID abc123
  node irys-cli.js balance arweave        # Check Arweave balance on Irys
  node irys-cli.js fund 0.1 solana        # Fund Irys with 0.1 SOL
  `);
}