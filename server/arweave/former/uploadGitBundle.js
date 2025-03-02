const fs = require("fs");
const fetch = require("node-fetch");
const Arweave = require("arweave");

const keyPath = "./arweave-key.json"; // Ensure this exists and is funded
const walletKey = JSON.parse(fs.readFileSync(keyPath, "utf8"));

const arweave = Arweave.init({ host: "localhost", port: 1984, protocol: "http" });

/**
 * 🚀 Uploads a Git bundle (`repo.bundle`) to Arweave
 */
const uploadGitBundle = async () => {
  try {
    const filePath = "repo.bundle"; // Ensure repo.bundle is created before calling
    if (!fs.existsSync(filePath)) throw new Error("❌ Git bundle not found! Run `git bundle create repo.bundle --all` first.");
    
    console.log("📤 Uploading Git bundle...");
    const data = fs.readFileSync(filePath);
    const transaction = await arweave.createTransaction({ data }, walletKey);
    await arweave.transactions.sign(transaction, walletKey);
    const response = await arweave.transactions.post(transaction);

    if (response.status === 200 || response.status === 202) {
      console.log(`✅ Uploaded Git bundle!`);
      console.log(`🔗 Transaction ID: ${transaction.id}`);
      console.log(`🔗 View: http://localhost:1984/tx/${transaction.id}`);
      return transaction.id; // Return the transaction ID so teammates can retrieve it
    } else {
      console.error("❌ Upload failed:", response);
    }
  } catch (error) {
    console.error("❌ Error uploading Git bundle:", error);
  }
};

/**
 * 📥 Downloads a Git bundle from Arweave and restores the repo
 * @param {string} transactionId - The Arweave transaction ID
 */
const downloadGitBundle = async (transactionId) => {
  try {
    const url = `http://localhost:1984/tx/${transactionId}/data`;
    console.log(`📥 Downloading Git bundle from: ${url}`);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`❌ Failed to fetch data. Status: ${response.status}`);

    const bundleBuffer = await response.buffer();
    fs.writeFileSync("repo.bundle", bundleBuffer);
    
    console.log("✅ Git bundle downloaded successfully!");

    // Restore the repo
    if (fs.existsSync("restored-repo")) fs.rmdirSync("restored-repo", { recursive: true });
    console.log("📂 Extracting bundle into 'restored-repo/'...");
    fs.mkdirSync("restored-repo");
    require("child_process").execSync("git clone repo.bundle restored-repo", { stdio: "inherit" });

    console.log("✅ Repository successfully restored in 'restored-repo/'");
  } catch (error) {
    console.error("❌ Error downloading Git bundle:", error);
  }
};

// Export functions so teammates can call them easily
module.exports = { uploadGitBundle, downloadGitBundle };
