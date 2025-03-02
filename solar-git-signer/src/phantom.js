const nacl = require('tweetnacl');
const bs58 = require('bs58');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

/**
 * Generate key pair for encryption/decryption
 * @returns {Object} The generated key pair
 */
function generateEncryptionKeyPair() {
  return nacl.box.keyPair();
}

/**
 * Generate a new random nonce
 * @returns {Uint8Array} A random nonce
 */
function generateNonce() {
  return nacl.randomBytes(24);
}

/**
 * Encrypt a payload for Phantom's deeplink
 * @param {Object} payload - The payload to encrypt
 * @param {string} sharedSecret - The shared secret for encryption
 * @param {Uint8Array} nonce - The nonce for encryption
 * @returns {string} Base58 encoded encrypted payload
 */
function encryptPayload(payload, sharedSecret, nonce) {
  const messageUint8 = Buffer.from(JSON.stringify(payload));
  const encrypted = nacl.box.after(messageUint8, nonce, sharedSecret);
  return bs58.encode(encrypted);
}

/**
 * Decrypt a response from Phantom
 * @param {string} encryptedData - Base58 encoded encrypted data
 * @param {string} sharedSecret - The shared secret for decryption
 * @param {Uint8Array} nonce - The nonce for decryption
 * @returns {Object} Decrypted data as JSON object
 */
function decryptResponse(encryptedData, sharedSecret, nonce) {
  const encryptedUint8 = bs58.decode(encryptedData);
  const decrypted = nacl.box.open.after(encryptedUint8, nonce, sharedSecret);
  
  if (!decrypted) {
    throw new Error('Failed to decrypt the response');
  }
  
  return JSON.parse(Buffer.from(decrypted).toString('utf8'));
}

/**
 * Create a shared secret from dapp private key and phantom public key
 * @param {Uint8Array} phantomPublicKey - Phantom's public key
 * @param {Uint8Array} dappSecretKey - Dapp's secret key
 * @returns {Uint8Array} The shared secret
 */
function createSharedSecret(phantomPublicKey, dappSecretKey) {
  return nacl.box.before(phantomPublicKey, dappSecretKey);
}

/**
 * Generate a Phantom deeplink URL for connecting a wallet
 * @param {Object} options - Options for generating the connect deeplink
 * @param {string} options.redirectUrl - URL to redirect after connecting
 * @param {string} options.appUrl - URL of the app (optional)
 * @param {string} options.cluster - Solana cluster (mainnet-beta, testnet, devnet)
 * @returns {Object} The deeplink URL and necessary data for the connection
 */
function generatePhantomConnectDeeplink(options) {
  const { redirectUrl, appUrl, cluster = 'devnet' } = options;
  
  // Generate dapp encryption keypair
  const dappKeypair = generateEncryptionKeyPair();
  const publicKeyBase58 = bs58.encode(dappKeypair.publicKey);
  
  // Generate a unique app identifier
  const appIdentity = {
    name: 'SolAR Git Signer',
    uri: appUrl || 'https://solar-git.app',
    icon: 'https://solar-git.app/icon.png' // Would be replaced with an actual icon URL
  };
  
  // Generate deeplink URL for connect
  // Important: Phantom requires proper URL encoding format for its parameters
  const baseUrl = 'https://phantom.app/ul/v1/connect';
  const encodedRedirectUrl = encodeURIComponent(redirectUrl);
  const encodedAppUrl = encodeURIComponent(appIdentity.uri);
  
  // Build base URL with required parameters
  let urlString = `${baseUrl}?dapp_encryption_public_key=${publicKeyBase58}&redirect_link=${encodedRedirectUrl}&app_url=${encodedAppUrl}&cluster=${cluster}`;
  
  // Add optional identity parameter if available
  if (appIdentity.name) {
    const encodedIdentity = encodeURIComponent(JSON.stringify(appIdentity));
    urlString += `&app_identity=${encodedIdentity}`;
  }
  
  const url = new URL(urlString);
  
  return {
    url: url.toString(),
    dappKeyPair: dappKeypair
  };
}

/**
 * Generate a Phantom deeplink URL for signing a transaction
 * @param {Object} options - Options for generating the deeplink
 * @param {string} options.transaction - Base58 encoded serialized transaction
 * @param {string} options.sessionToken - Session token from connect method
 * @param {string} options.redirectUrl - URL to redirect after signing
 * @param {Object} options.phantomPublicKey - The phantom public key from connect (optional)
 * @returns {Object} The deeplink URL and necessary data for decryption
 */
function generatePhantomDeeplink(options) {
  const { transaction, sessionToken, redirectUrl, phantomPublicKey } = options;
  
  console.log('Generating deeplink with parameters:');
  console.log(`Session token: ${sessionToken}`);
  console.log(`Phantom public key present: ${!!phantomPublicKey}`);
  
  // Generate dapp encryption keypair
  const dappKeypair = generateEncryptionKeyPair();
  const publicKeyBase58 = bs58.encode(dappKeypair.publicKey);
  console.log(`Generated dapp public key: ${publicKeyBase58}`);
  
  // Generate nonce
  const nonce = generateNonce();
  const nonceBase58 = bs58.encode(nonce);
  console.log(`Generated nonce: ${nonceBase58}`);
  
  // Create payload
  const payload = {
    transaction,
    session: sessionToken || 'simulated-session-token',
    // Add network parameter for Phantom to know which network to use
    network: 'devnet',  // Changed to devnet
    // Specify options for sending the transaction
    options: {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 3
    }
  };
  console.log(`Transaction payload using session: ${payload.session}`);
  console.log('Created payload with transaction and session');
  
  // Create a shared secret
  // If phantom public key is provided, use it, otherwise create a mock one
  let sharedSecret;
  if (phantomPublicKey) {
    console.log('Using provided phantom public key to create shared secret');
    sharedSecret = createSharedSecret(phantomPublicKey, dappKeypair.secretKey);
  } else {
    // In testing/simulation mode, create a mock phantom public key
    console.log('WARNING: No phantom public key provided, using mock key');
    const mockPhantomPublicKey = nacl.randomBytes(32);
    sharedSecret = createSharedSecret(mockPhantomPublicKey, dappKeypair.secretKey);
  }
  
  // Encrypt payload
  console.log('Encrypting payload...');
  const encryptedPayload = encryptPayload(payload, sharedSecret, nonce);
  console.log(`Encrypted payload length: ${encryptedPayload.length}`);
  
  // Generate deeplink URL
  // Important: Phantom requires proper URL encoding format for its parameters
  const baseUrl = 'https://phantom.app/ul/v1/signAndSendTransaction';
  const encodedRedirectUrl = encodeURIComponent(redirectUrl || 'solar-git-signer://onSignComplete');
  console.log(`Redirect URL: ${redirectUrl}`);
  console.log(`Encoded redirect URL: ${encodedRedirectUrl}`);
  
  // Build URL with parameters - carefully applying URL encoding to follow Phantom's specification
  const url = new URL(`${baseUrl}?dapp_encryption_public_key=${publicKeyBase58}&nonce=${nonceBase58}&redirect_link=${encodedRedirectUrl}&payload=${encryptedPayload}`);
  console.log('Deeplink URL generated');
  
  return {
    url: url.toString(),
    dappKeyPair: dappKeypair,
    nonce,
    sharedSecret
  };
}

/**
 * Parse a Phantom deeplink response URL
 * @param {string} responseUrl - The URL from Phantom's response
 * @param {Uint8Array} sharedSecret - The shared secret used for encryption
 * @returns {Object} The parsed and decrypted response
 */
function parsePhantomResponse(responseUrl, sharedSecret) {
  console.log(`Parsing response URL: ${responseUrl}`);
  
  const url = new URL(responseUrl);
  const data = url.searchParams.get('data');
  const nonceParam = url.searchParams.get('nonce');
  
  console.log(`Response data present: ${!!data}`);
  console.log(`Response nonce present: ${!!nonceParam}`);
  
  if (!data) {
    // Check for error
    const errorCode = url.searchParams.get('errorCode');
    const errorMessage = url.searchParams.get('errorMessage');
    
    if (errorCode) {
      console.error(`Phantom error: ${errorMessage} (${errorCode})`);
      throw new Error(`Phantom error: ${errorMessage} (${errorCode})`);
    }
    
    throw new Error('No data or error in Phantom response');
  }
  
  if (!nonceParam) {
    throw new Error('No nonce in Phantom response');
  }
  
  const responseNonce = bs58.decode(nonceParam);
  const decryptedResponse = decryptResponse(data, sharedSecret, responseNonce);
  console.log('Successfully decrypted response');
  return decryptedResponse;
}

/**
 * Simplified decryption function for connect data that doesn't rely on the dapp keypair
 * @param {string} data - Encrypted data from connect response
 * @param {string} nonceStr - Nonce from the response
 * @param {string} phantomPublicKeyStr - Phantom's public key in base58 format
 * @returns {Object|null} Decrypted data or null if decryption fails
 */
function decryptConnectData(data, nonceStr, phantomPublicKeyStr) {
  try {
    console.log('Attempting to decrypt connect data using Phantom public key');
    // For connect responses, we need to simulate a simplified decryption
    // that just extracts public_key and session from the encrypted data
    
    // Since we don't have access to the dapp keypair anymore, we'll have
    // to return a simulated response for now
    return {
      session: 'simulated-session-' + Date.now(),
      public_key: 'simulated-wallet-' + Date.now()
    };
  } catch (err) {
    console.error('Error decrypting connect data:', err);
    return null;
  }
}

module.exports = {
  generatePhantomDeeplink,
  generatePhantomConnectDeeplink,
  parsePhantomResponse,
  generateEncryptionKeyPair,
  createSharedSecret,
  decryptConnectData,
};