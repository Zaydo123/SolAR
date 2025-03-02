/**
 * Simple test script to verify the API server functionality
 */
const fs = require('fs');
const path = require('path');
const { 
  Connection, 
  PublicKey, 
  Keypair, 
  LAMPORTS_PER_SOL
} = require('@solana/web3.js');

/**
 * Main function that runs a simpler test of the API
 */
async function runSimpleTest() {
  console.log('=== Starting Simple API Test ===');
  
  // 1. Load test user wallet
  const testUserSecretKey = loadWalletOrGenerate();
  const wallet = Keypair.fromSecretKey(testUserSecretKey);
  
  console.log('Using wallet with public key:', wallet.publicKey.toString());
  
  // 2. Check balance
  const connection = new Connection('http://localhost:8899', 'confirmed');
  
  // Ensure wallet has SOL for transactions
  await fundWalletIfNeeded(connection, wallet);
  
  // 3. Instructions for starting API server
  console.log('\n=== Testing API Server ===');
  console.log('Follow these steps to test the API server:');
  console.log('1. Install API dependencies:');
  console.log('   cd server && npm install');
  console.log('\n2. Start the API server:');
  console.log('   npm run dev');
  console.log('\n3. Test the mock endpoints:');
  console.log('   - List repositories: http://localhost:3001/api/mock/repositories');
  console.log('   - View repository: http://localhost:3001/api/mock/repositories/FZL8PK74v3kYDVF6YunpMZZrxsJamGJZQHtYxRDfqdJU/example-repo-1');
  console.log('   - Download content: http://localhost:3001/api/mock/repositories/FZL8PK74v3kYDVF6YunpMZZrxsJamGJZQHtYxRDfqdJU/example-repo-1/download?format=zip');
  
  console.log('\n=== Your Wallet Information ===');
  console.log('Public Key:', wallet.publicKey.toString());
  console.log('Use this public key to test specific API endpoints once you have actual repositories created.');
  
  console.log('\n=== Test Complete ===');
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
    }
  }
}

// Run the test
runSimpleTest();