// SolanaArweaveSim.js
const fs = require("fs");
const path = require("path");
const { PublicKey } = require("@solana/web3.js");
const crypto = require("crypto");

const REPO_STATES_DIR = path.join(__dirname, "../../repo_states");
const ARWEAVE_DIR = path.join(__dirname, "../../arweave_storage");

if (!fs.existsSync(REPO_STATES_DIR)) fs.mkdirSync(REPO_STATES_DIR);
if (!fs.existsSync(ARWEAVE_DIR)) fs.mkdirSync(ARWEAVE_DIR);

const PROGRAM_ID = new PublicKey("5TQo5Bf6yXp9uywEFbp9YKUyveD2pe2LVXRjY2aWRup5");

function computeRepoPDA(ownerPubkeyStr, repoName) {
  if (!ownerPubkeyStr || !repoName) {
    throw new Error("Missing owner public key or repository name");
  }
  const seed1 = Buffer.from("repository"); // 10 bytes
  // Convert the owner's public key from base58 to its 32-byte representation.
  const seed2 = new PublicKey(ownerPubkeyStr).toBuffer(); // 32 bytes
  // Ensure the repo name is at most 32 bytes. If longer, hash it.
  let seed3 = Buffer.from(repoName, "utf8");
  if (seed3.length > 32) {
    const crypto = require("crypto");
    seed3 = crypto.createHash("sha256").update(repoName, "utf8").digest().slice(0, 32);
  }
  const seeds = [seed1, seed2, seed3];
  const [pda, bump] = PublicKey.findProgramAddressSync(seeds, PROGRAM_ID);
  return pda;
}


/**
 * Query state from `repo_states/<pda>.json`
 */
function queryState(pda) {
  const filename = path.join(REPO_STATES_DIR, pda.toString() + ".json");
  try {
    const data = JSON.parse(fs.readFileSync(filename, "utf8"));
    return data;
  } catch (e) {
    return { refs: {} };
  }
}

/**
 * Update state in `repo_states/<pda>.json`
 */
function updateState(pda, branch, commitHash, arweaveTx) {
  const filename = path.join(REPO_STATES_DIR, pda.toString() + ".json");
  let data = { refs: {} };
  try {
    data = JSON.parse(fs.readFileSync(filename, "utf8"));
  } catch (e) {}
  data.refs[branch] = { commit_hash: commitHash, arweave_tx: arweaveTx };
  fs.writeFileSync(filename, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Simulate uploading to Arweave (save to arweave_storage).
 */
function uploadToArweave(packData) {
  const txId = "arweave_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
  fs.writeFileSync(path.join(ARWEAVE_DIR, txId), packData);
  return txId;
}

/**
 * Simulate downloading from Arweave
 */
function downloadFromArweave(txId) {
  return fs.readFileSync(path.join(ARWEAVE_DIR, txId));
}

module.exports = {
  computeRepoPDA,
  queryState,
  updateState,
  uploadToArweave,
  downloadFromArweave,
};
