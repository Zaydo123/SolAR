const Arweave = require('arweave');
const fs = require('fs');

const keyPath = './arweave-key.json'; 
const walletKey = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

const arweave = Arweave.init({
  host: 'localhost', 
  port: 1984,        
  protocol: 'http',
});

const uploadData = async () => {
  try {
    const data = "Suvan is Cute asf";

    const transaction = await arweave.createTransaction({ data }, walletKey);
    
    await arweave.transactions.sign(transaction, walletKey);
    
    const response = await arweave.transactions.post(transaction);

    if (response.status === 200 || response.status === 202) {
      console.log(`✅ Transaction posted successfully! Transaction ID: ${transaction.id}`);
      console.log(`🔗 View locally at: http://localhost:1984/tx/${transaction.id}`);
      
      await mineTransaction();
    } else {
      console.error(`❌ Transaction failed:`, response);
    }
  } catch (error) {
    console.error("❌ Error uploading data:", error);
  }
};

const mineTransaction = async () => {
  try {
    console.log("⛏️ Mining transaction...");
    await fetch("http://localhost:1984/mine", { method: "POST" });
    console.log("✅ Transaction mined successfully!");
  } catch (error) {
    console.error("❌ Error mining transaction:", error);
  }
};

uploadData();
