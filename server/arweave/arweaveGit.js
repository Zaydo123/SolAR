const fs = require("fs");
const Arweave = require("arweave");

const keyPath = "./arweave-key.json";
if (!fs.existsSync(keyPath)) throw new Error("❌ Wallet key not found!");
const walletKey = JSON.parse(fs.readFileSync(keyPath, "utf8"));

const arweave = Arweave.init({ host: "localhost", port: 1984, protocol: "http" });


const getWalletAddress = async () => {
  return await arweave.wallets.jwkToAddress(walletKey);
};


const checkBalance = async () => {
  try {
    const address = await getWalletAddress();
    const balance = await arweave.wallets.getBalance(address);
    console.log(`💰 Wallet Balance: ${arweave.ar.winstonToAr(balance)} AR`);
    return balance;
  } catch (error) {
    console.error("❌ Error checking balance:", error);
  }
};


const mintTokens = async (amount = "1000000000000") => {
  try {
    const address = await getWalletAddress();
    console.log(`💸 Minting ${amount} AR for ${address}...`);
    
    const response = await fetch(`http://localhost:1984/mint/${address}/${amount}`, { method: "GET" });
    
    const result = await response.json(); // Check response body
    if (response.ok) {
      console.log("✅ Tokens minted successfully!");
    } else {
      console.error("❌ Minting failed:", result);
    }
  } catch (error) {
    console.error("❌ Error minting tokens:", error);
  }
};

const uploadGitBundle = async () => {
  try {
    const filePath = "repo.bundle";
    if (!fs.existsSync(filePath)) throw new Error("❌ Git bundle not found! Run `git bundle create repo.bundle --all` first.");
    
    console.log("📤 Uploading Git bundle...");
    const data = fs.readFileSync(filePath);

    const balance = await checkBalance();
    if (parseInt(balance) === 0) await mintTokens();

    const transaction = await arweave.createTransaction({ data }, walletKey);
    transaction.addTag("Content-Type", "application/octet-stream");
    await arweave.transactions.sign(transaction, walletKey);
    
    const response = await arweave.transactions.post(transaction);

    if (response.status === 200 || response.status === 202) {
      console.log(`✅ Uploaded Git bundle!`);
      console.log(`🔗 Transaction ID: ${transaction.id}`);
      console.log(`🔗 View: http://localhost:1984/tx/${transaction.id}`);
      return transaction.id;
    } else {
      console.error("❌ Upload failed:", response);
    }
  } catch (error) {
    console.error("❌ Error uploading Git bundle:", error);
  }
};


const downloadGitBundle = async (transactionId) => {
  try {
    const url = `http://localhost:1984/tx/${transactionId}/data`;
    console.log(`📥 Downloading Git bundle from: ${url}`);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`❌ Failed to fetch data. Status: ${response.status}`);

    // Use arrayBuffer() instead of buffer() in node-fetch v3
    const arrayBuffer = await response.arrayBuffer();
    const bundleBuffer = Buffer.from(arrayBuffer);

    fs.writeFileSync("repo.bundle", bundleBuffer);
    
    console.log("✅ Git bundle downloaded successfully!");

    if (fs.existsSync("restored-repo")) fs.rmdirSync("restored-repo", { recursive: true });
    console.log("📂 Extracting bundle into 'restored-repo/'...");
    fs.mkdirSync("restored-repo");
    require("child_process").execSync("git clone repo.bundle restored-repo", { stdio: "inherit" });

    console.log("✅ Repository successfully restored in 'restored-repo/'");
  } catch (error) {
    console.error("❌ Error downloading Git bundle:", error);
  }
};

module.exports = { uploadGitBundle, downloadGitBundle, checkBalance, mintTokens };
