const { uploadGitBundle, downloadGitBundle, checkBalance, mintTokens } = require("./arweaveGit");

const action = process.argv[2];
const transactionId = process.argv[3];

(async () => {
  if (action === "upload") {
    const txId = await uploadGitBundle();
    if (txId) console.log(`✅ Use this TX ID to download: ${txId}`);
  } else if (action === "download" && transactionId) {
    await downloadGitBundle(transactionId);
  } else if (action === "balance") {
    await checkBalance();
  } else if (action === "mint") {
    await mintTokens();
  } else {
    console.log("❌ Invalid command! Use:");
    console.log("   node index.js upload         # Upload a Git bundle");
    console.log("   node index.js download <TX>  # Download and restore repo");
    console.log("   node index.js balance        # Check AR balance");
    console.log("   node index.js mint           # Mint AR tokens (ArLocal only)");
  }
})();
