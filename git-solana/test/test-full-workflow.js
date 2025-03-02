/**
 * Test script that demonstrates the full workflow for a new user
 * This script:
 * 1. Creates a new Git repository on Solana
 * 2. Updates a branch with Arweave content
 * 3. Stars the repository
 * 4. Lists repositories and gets details
 * 5. Downloads repository content
 */
const fs = require('fs');
const path = require('path');
const { 
  Connection, 
  PublicKey, 
  Keypair, 
  LAMPORTS_PER_SOL
} = require('@solana/web3.js');
const { Program, AnchorProvider, Wallet } = require('@coral-xyz/anchor');
const crypto = require('crypto');
const Arweave = require('arweave');

// Load IDL files
const GIT_SOLANA_IDL_PATH = path.join(__dirname, '../target/idl/git_solana.json');
const GIT_STAR_IDL_PATH = path.join(__dirname, '../target/idl/git_star.json');

const gitSolanaIdl = JSON.parse(fs.readFileSync(GIT_SOLANA_IDL_PATH, 'utf8'));
const gitStarIdl = JSON.parse(fs.readFileSync(GIT_STAR_IDL_PATH, 'utf8'));

// Program IDs
const GIT_SOLANA_PROGRAM_ID = new PublicKey('5TQo5Bf6yXp9uywEFbp9YKUyveD2pe2LVXRjY2aWRup5');
const GIT_STAR_PROGRAM_ID = new PublicKey('2e1PXZUvJYR8Qci7T9esFZNPgvBiDYiVnzMRzSLSroiJ');

// Arweave setup
const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https'
});

/**
 * Main function that runs through the full workflow
 */
async function runFullWorkflow() {
  console.log('=== Starting Full Workflow Test ===');
  
  // 1. Setup connection and user wallet
  const connection = new Connection('http://localhost:8899', 'confirmed');
  
  // Load test user wallet (you can use the wallet created with create-test-user.js)
  const testUserSecretKey = loadWalletOrGenerate();
  const wallet = new Wallet(Keypair.fromSecretKey(testUserSecretKey));
  
  console.log('Using wallet with public key:', wallet.publicKey.toString());
  
  // Ensure wallet has SOL for transactions
  await fundWalletIfNeeded(connection, wallet.payer);
  
  // 2. Setup Anchor providers and programs
  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed'
  });
  
  const gitSolanaProgram = new Program(gitSolanaIdl, GIT_SOLANA_PROGRAM_ID, provider);
  const gitStarProgram = new Program(gitStarIdl, GIT_STAR_PROGRAM_ID, provider);
  
  // 3. Create a repository
  const repoName = `test-repo-${Math.floor(Math.random() * 10000)}`;
  console.log(`\n=== Creating repository: ${repoName} ===`);
  
  // Find the PDA for the repository
  const [repoPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('repository'),
      wallet.publicKey.toBuffer(),
      Buffer.from(repoName)
    ],
    GIT_SOLANA_PROGRAM_ID
  );
  
  console.log('Repository PDA:', repoPDA.toString());
  
  try {
    // Create the repository
    const createTx = await gitSolanaProgram.methods
      .createRepo(repoName)
      .accounts({
        repo: repoPDA,
        signer: wallet.publicKey,
        systemProgram: PublicKey.default
      })
      .rpc();
    
    console.log('Repository created successfully!');
    console.log('Transaction signature:', createTx);
    
    // 4. Create a mock commit and upload to Arweave
    console.log('\n=== Creating mock content ===');
    
    // For testing, we'll just use a random hash and a mock Arweave TX
    const commitHash = crypto.randomBytes(20).toString('hex');
    const arweaveTx = `MOCK_ARWEAVE_TX_${Math.floor(Math.random() * 10000)}`;
    
    console.log('Commit hash:', commitHash);
    console.log('Arweave TX ID:', arweaveTx);
    
    // 5. Update branch with the commit
    console.log('\n=== Updating branch ===');
    
    const branchName = 'main';
    const updateBranchTx = await gitSolanaProgram.methods
      .updateBranch(branchName, commitHash, arweaveTx)
      .accounts({
        repo: repoPDA,
        signer: wallet.publicKey
      })
      .rpc();
    
    console.log('Branch updated successfully!');
    console.log('Transaction signature:', updateBranchTx);
    
    // 6. Fetch the repository details to confirm
    console.log('\n=== Fetching repository details ===');
    
    const repoData = await gitSolanaProgram.account.repository.fetch(repoPDA);
    
    console.log('Repository owner:', repoData.owner.toString());
    console.log('Repository name:', repoData.name);
    console.log('Collaborators:', repoData.collaborators.map(c => c.toString()));
    console.log('Branches:');
    
    repoData.branches.forEach(branch => {
      console.log(`  - ${branch.name}:`);
      console.log(`    Commit: ${branch.commit.commitHash}`);
      console.log(`    Arweave TX: ${branch.commit.arweaveTx}`);
    });
    
    // 7. Star the repository
    console.log('\n=== Starring the repository ===');
    
    // Find the star PDA
    const [starPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('star'),
        wallet.publicKey.toBuffer(),
        repoData.owner.toBuffer(),
        Buffer.from(repoData.name)
      ],
      GIT_STAR_PROGRAM_ID
    );
    
    console.log('Star PDA:', starPDA.toString());
    
    const starTx = await gitStarProgram.methods
      .starRepository(repoData.owner, repoData.name)
      .accounts({
        star: starPDA,
        user: wallet.publicKey,
        systemProgram: PublicKey.default
      })
      .rpc();
    
    console.log('Repository starred successfully!');
    console.log('Transaction signature:', starTx);
    
    // 8. Check star count
    console.log('\n=== Checking repository stars ===');
    
    // This would typically be a client-side call, but we'll do a manual query here
    const starAccounts = await connection.getProgramAccounts(
      GIT_STAR_PROGRAM_ID,
      {
        filters: [
          {
            memcmp: {
              offset: 8 + 32, // After discriminator and user pubkey
              bytes: repoData.owner.toBase58()
            }
          }
        ]
      }
    );
    
    const repoStars = starAccounts.filter(({ account }) => {
      try {
        const decoded = gitStarProgram.coder.accounts.decode('star', account.data);
        return decoded.repositoryName === repoData.name;
      } catch (e) {
        return false;
      }
    });
    
    console.log(`Repository has ${repoStars.length} stars`);
    
    console.log('\n=== Testing API Endpoints ===');
    console.log('You can now start the API server and test the endpoints:');
    console.log('1. cd server && npm install && npm run dev');
    console.log('2. Visit: http://localhost:3001/api/repositories');
    console.log(`3. View your repository: http://localhost:3001/api/repositories/${wallet.publicKey.toString()}/${repoName}`);
    console.log(`4. Download content: http://localhost:3001/api/repositories/${wallet.publicKey.toString()}/${repoName}/download?branch=main`);
    
    console.log('\n=== Test Completed Successfully! ===');
  } catch (error) {
    console.error('Error during test:', error);
  }
}

/**
 * Load wallet or generate a new one
 */
function loadWalletOrGenerate() {
  try {
    // Try to load from file
    const data = fs.readFileSync('test_user.json', 'utf8');
    const keyData = JSON.parse(data);
    
    if (keyData.secretKey) {
      if (Array.isArray(keyData.secretKey)) {
        return new Uint8Array(keyData.secretKey);
      } else {
        return new Uint8Array(Object.values(keyData.secretKey));
      }
    }
    
    // If not in expected format, generate new keypair
    throw new Error('Invalid wallet format');
  } catch (error) {
    console.log('Generating new wallet...');
    const keypair = Keypair.generate();
    return keypair.secretKey;
  }
}

/**
 * Fund wallet with SOL if balance is low
 */
async function fundWalletIfNeeded(connection, keypair) {
  const balance = await connection.getBalance(keypair.publicKey);
  
  console.log('Current wallet balance:', balance / LAMPORTS_PER_SOL, 'SOL');
  
  if (balance < 0.5 * LAMPORTS_PER_SOL) {
    console.log('Funding wallet with 1 SOL...');
    
    try {
      const airdropSignature = await connection.requestAirdrop(
        keypair.publicKey,
        1 * LAMPORTS_PER_SOL
      );
      
      await connection.confirmTransaction(airdropSignature);
      
      const newBalance = await connection.getBalance(keypair.publicKey);
      console.log('New wallet balance:', newBalance / LAMPORTS_PER_SOL, 'SOL');
    } catch (error) {
      console.error('Error funding wallet:', error);
      console.error('Make sure you have a Solana test validator running locally.');
      console.error('Run: solana-test-validator');
      process.exit(1);
    }
  }
}

// Run the test
runFullWorkflow();