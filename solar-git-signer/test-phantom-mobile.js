/**
 * Test Phantom Mobile Deeplinks
 * 
 * This script generates proper deeplinks for Phantom Wallet mobile app.
 * Both the connect and signTransaction methods are tested.
 */

const { Keypair, Transaction, SystemProgram, PublicKey } = require('@solana/web3.js');
const bs58 = require('bs58');
const qrcode = require('qrcode-terminal');

// Test direct Phantom URLs without encryption/decryption for simplicity
function testDirectPhantomUrls() {
  console.log('\n=== Testing Direct Phantom Deeplinks ===\n');
  
  // 1. Simple connect URL - try both URL formats
  // Universal link format
  const connectUrl = 'https://phantom.app/ul/v1/connect?cluster=mainnet-beta';
  // Direct protocol
  const directProtocolConnect = 'phantom://v1/connect?cluster=mainnet-beta';
  console.log('Basic Connect URL:');
  console.log(connectUrl);
  
  console.log('\nConnect QR Code:');
  qrcode.generate(connectUrl, { small: true });
  
  // 2. Create a simple transfer transaction
  const fromKeypair = Keypair.generate();
  const toAccount = Keypair.generate().publicKey;
  
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: toAccount,
      lamports: 1000, // 0.000001 SOL
    })
  );
  
  // Set blockhash to test value (would be a real one in production)
  transaction.recentBlockhash = 'GfVcyD5SzLMSyCqvYGMdDLi9U7CsCz8q9Y1vJj1WxTXx';
  transaction.feePayer = fromKeypair.publicKey;
  
  // Serialize but don't require signatures
  const serializedTx = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false
  });
  
  // Convert to base58 for Phantom
  const base58Tx = bs58.encode(serializedTx);
  
  // Create a simplified signAndSendTransaction URL
  // NOTE: This won't work for actual signing because it lacks encryption 
  // but is useful for testing deeplink launch
  const signUrl = `https://phantom.app/ul/v1/signTransaction?transaction=${base58Tx}`;
  
  console.log('\n\nSimplified Sign Transaction URL (this would normally require encryption):');
  console.log(signUrl);
  
  console.log('\nSign Transaction QR Code:');
  qrcode.generate(signUrl, { small: true });
  
  // 3. Other methods to try
  // Direct protocol connect
  console.log('\n\nDirect Protocol Connect URL:');
  console.log(directProtocolConnect);
  
  console.log('\nDirect Protocol QR Code:');
  qrcode.generate(directProtocolConnect, { small: true });
  
  // Alternative method to try if standard method fails
  const alternativeConnect = `phantom://browse?url=${encodeURIComponent('https://phantom.app/ul/v1/connect?cluster=mainnet-beta')}`;
  console.log('\n\nAlternative Connect URL (browse method):');
  console.log(alternativeConnect);
}

testDirectPhantomUrls();