const fs = require("fs");
const Arweave = require("arweave");

const keyPath = "./arweave-key.json";
const walletKey = JSON.parse(fs.readFileSync(keyPath, "utf8"));

const arweave = Arweave.init({ host: "localhost", port: 1984, protocol: "http" });

const uploadGitBundle = async () => {
  try {
    const filePath = "repo.bundle"; // The Git bundle file
    const data = fs.readFileSync(filePath);

    const transaction = await arweave.createTransaction({ data }, walletKey);
    await arweave.transactions.sign(transaction, walletKey);
    const response = await arweave.transactions.post(transaction);

    if (response.status === 200 || response.status === 202) {
      console.log(`✅ Uploaded Git bundle! TX ID: ${transaction.id}`);
      console.log(`🔗 View: http://localhost:1984/tx/${transaction.id}`);
    } else {
      console.error("❌ Upload failed:", response);
    }
  } catch (error) {
    console.error("❌ Error uploading Git bundle:", error);
  }
};

uploadGitBundle();
