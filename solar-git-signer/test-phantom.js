const { phantom, utils } = require('./src/index');
const qrcode = require('qrcode-terminal');
const open = require('open');
const bs58 = require('bs58');

// Test Phantom deeplinks
async function testPhantom() {
  // Test the connect deeplink
  console.log('Testing Phantom Connect deeplink:');
  const connectData = phantom.generatePhantomConnectDeeplink({
    redirectUrl: 'http://localhost:8080/callback',
    cluster: 'mainnet-beta'
  });
  
  // Generate a shorter URL for the QR code
  const shortConnectUrl = await utils.createQrCodeUrl(connectData.url);
  
  console.log('Original URL:', connectData.url);
  console.log('Short URL (for easier scanning):', shortConnectUrl);
  
  console.log('\nConnect QR Code (smaller):');
  qrcode.generate(shortConnectUrl, { small: true });
  
  // Copy to clipboard if available
  try {
    require('child_process').execSync(`echo "${connectData.url}" | pbcopy`);
    console.log('(URL copied to clipboard)');
  } catch (e) {
    // Silently fail if clipboard copy isn't available
  }
  
  // Wait a moment before showing the second QR code
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test the sign transaction deeplink
  console.log('\n\nTesting Phantom Sign Transaction deeplink:');
  
  // Create a properly formatted transaction for Phantom wallet
  // In a real app this would be an actual Solana transaction
  // This is a minimal valid transaction format that Phantom can recognize
  const { Keypair, Transaction, SystemProgram, PublicKey } = require('@solana/web3.js');
  
  // Create a simple transaction for testing
  const fromKeypair = Keypair.generate(); // In real app, this would be user's keypair
  const toAccount = Keypair.generate().publicKey;
  
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: toAccount,
      lamports: 100, // 100 lamports = 0.0000001 SOL
    })
  );
  
  // Set a recent blockhash
  transaction.recentBlockhash = 'GfVcyD5SzLMSyCqvYGMdDLi9U7CsCz8q9Y1vJj1WxTXx'; // Dummy blockhash
  transaction.feePayer = fromKeypair.publicKey;
  
  // Serialize the transaction
  const serializedTransaction = transaction.serialize({
    requireAllSignatures: false, // Don't require signatures for serialization
    verifySignatures: false
  }).toString('base64');
  
  // Convert from base64 to base58 for Phantom
  const dummyTx = bs58.encode(Buffer.from(serializedTransaction, 'base64'));
  
  const signData = phantom.generatePhantomDeeplink({
    transaction: dummyTx,
    redirectUrl: 'http://localhost:8080/callback'
  });
  
  // Generate a shorter URL for the QR code
  const shortSignUrl = await utils.createQrCodeUrl(signData.url);
  
  console.log('Original URL:', signData.url);
  console.log('Short URL (for easier scanning):', shortSignUrl);
  
  console.log('\nSign QR Code (smaller):');
  qrcode.generate(shortSignUrl, { small: true });
  
  // Copy to clipboard if available
  try {
    require('child_process').execSync(`echo "${signData.url}" | pbcopy`);
    console.log('(URL copied to clipboard)');
  } catch (e) {
    // Silently fail if clipboard copy isn't available
  }
  
  // Option to open in browser
  console.log('\nWould you like to open the URLs in your browser? (y/n)');
  process.stdin.once('data', async (data) => {
    const input = data.toString().trim().toLowerCase();
    if (input === 'y') {
      try {
        console.log('Opening Connect URL...');
        await open(connectData.url);
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('Opening Sign URL...');
        await open(signData.url);
      } catch (err) {
        console.log('Could not open browser automatically');
      }
    }
    process.exit(0);
  });
}

testPhantom().catch(console.error);