const { Keypair, Connection, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const fs = require('fs');

// Generate a new keypair
const testUser = Keypair.generate();

// Save the keypair to file
const userWallet = {
  pubkey: testUser.publicKey.toString(),
  secretKey: Array.from(testUser.secretKey)
};

fs.writeFileSync('test_user.json', JSON.stringify(userWallet, null, 2));

console.log('Created test user with public key:', testUser.publicKey.toString());
console.log('Private key saved to test_user.json');

// Log instructions
console.log('\n=== Test Instructions ===');
console.log('1. Start a local Solana test validator:');
console.log('   solana-test-validator');
console.log('\n2. Run the provided test script:');
console.log('   node test/test-full-workflow.js');