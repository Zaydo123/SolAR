const express = require('express');
const http = require('http');
const { EventEmitter } = require('events');
const { parsePhantomResponse } = require('./phantom');

// Response event emitter
const responseEmitter = new EventEmitter();

// Start a callback server to receive Phantom wallet responses
function startCallbackServer(port = 0, timeout = 300000) {
  return new Promise((resolve, reject) => {
    const app = express();
    const server = http.createServer(app);
    
    // Store encryption context for handling responses
    let encryptionContext = null;
    
    // Timeout for waiting for the wallet response
    let timeoutId = setTimeout(() => {
      server.close();
      reject(new Error('Wallet response timeout'));
    }, timeout);
    
    // Route to handle the wallet callback
    app.get('/callback', (req, res) => {
      try {
        // Send a simple response to the browser
        res.send('<html><body><h1>Transaction signed</h1><p>You can close this window and return to the CLI.</p></body></html>');
        
        // Process the callback URL with the wallet response
        // Get the full URL including query parameters
        const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
        console.log(`Received callback: ${fullUrl}`);

        // First check if this is a connect response with encrypted data
        if (req.query.data && req.query.phantom_encryption_public_key) {
          console.log('Received connect response from wallet');
          console.log('Connect response data:');
          console.log(JSON.stringify(req.query, null, 2));
          
          try {
            // We need to decrypt the data field
            const phantomPubkey = req.query.phantom_encryption_public_key;
            const dappKeyPairFromUrl = req.originalUrl.split('?')[0].split('/').pop();
            
            // Create a simulated shared secret for decryption
            // Normally you would retrieve the dapp private key from storage
            // For now, we'll assume the dapp public key is directly accessible
            console.log(`Processing connect response with encryption public key: ${phantomPubkey}`);
            
            // We need to decrypt the response data
            const { decryptConnectData } = require('./phantom');
            const decrypted = decryptConnectData(
              req.query.data,
              req.query.nonce,
              req.query.phantom_encryption_public_key
            );
            
            console.log('Decrypted connect data:', decrypted);
            
            // Combine the decrypted data with the phantom public key
            const connectResponse = {
              phantom_encryption_public_key: req.query.phantom_encryption_public_key,
              session: decrypted ? decrypted.session : undefined,
              public_key: decrypted ? decrypted.public_key : undefined
            };
            
            console.log('Processed connect response:');
            console.log(JSON.stringify(connectResponse, null, 2));
            responseEmitter.emit('response', connectResponse);
          } catch (error) {
            console.error('Error processing connect response:', error);
            // Even with error, return what we have
            const connectResponse = {
              phantom_encryption_public_key: req.query.phantom_encryption_public_key
            };
            responseEmitter.emit('response', connectResponse);
          }
          return;
        }
        
        // For transaction signing response, we need encryption context
        if (encryptionContext) {
          try {
            const responseData = parsePhantomResponse(
              fullUrl,
              encryptionContext.sharedSecret
            );
            
            // Emit the response event
            responseEmitter.emit('response', responseData);
          } catch (parseError) {
            console.error('Error parsing response:', parseError);
            // Check for error parameters directly
            if (req.query.errorCode) {
              console.error(`Wallet error: ${req.query.errorMessage} (${req.query.errorCode})`);
              // Check if this is a transaction that Phantom sent directly to the network
              if (req.query.signature) {
                console.log(`Phantom sent transaction directly, signature: ${req.query.signature}`);
                responseEmitter.emit('response', { signature: req.query.signature });
                return;
              }
              responseEmitter.emit('error', new Error(`Wallet error: ${req.query.errorMessage}`));
            } else {
              responseEmitter.emit('error', parseError);
            }
          }
        } else {
          console.error('No encryption context available for decryption');
          // Check if this is a signAndSendTransaction response with just a signature
          if (req.query.signature) {
            console.log(`Received transaction signature from Phantom: ${req.query.signature}`);
            responseEmitter.emit('response', { signature: req.query.signature });
            return;
          }
          
          // Check if we have error parameters
          if (req.query.errorCode) {
            console.error(`Wallet error: ${req.query.errorMessage} (${req.query.errorCode})`);
            responseEmitter.emit('error', new Error(`Wallet error: ${req.query.errorMessage}`));
          } else {
            responseEmitter.emit('error', new Error('No encryption context available'));
          }
        }
      } catch (error) {
        console.error('Error processing wallet response:', error);
        responseEmitter.emit('error', error);
      }
    });
    
    // Start the server
    server.listen(port, () => {
      const address = server.address();
      const serverPort = address.port;
      console.log(`Callback server started on port ${serverPort}`);
      
      // Resolve with the server and port
      resolve({
        server,
        port: serverPort,
        setEncryptionContext: (context) => {
          encryptionContext = context;
        },
        waitForResponse: () => {
          return new Promise((resolveResponse, rejectResponse) => {
            responseEmitter.once('response', (data) => {
              clearTimeout(timeoutId);
              resolveResponse(data);
            });
            
            responseEmitter.once('error', (error) => {
              clearTimeout(timeoutId);
              rejectResponse(error);
            });
          });
        },
        close: () => {
          clearTimeout(timeoutId);
          server.close();
        }
      });
    });
  });
}

module.exports = {
  startCallbackServer
};