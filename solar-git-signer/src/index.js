const signer = require('./signer');
const installer = require('./installer');
const phantom = require('./phantom');
const callback = require('./callback');
const urlShortener = require('./url-shortener');

module.exports = {
  // Main signer functions
  signTransaction: signer.signTransaction,
  getUnsignedTransaction: signer.getUnsignedTransaction,
  sendSignedTransaction: signer.sendSignedTransaction,
  
  // Git hook installer
  installHook: installer.installHook,
  
  // Phantom wallet integration
  phantom: {
    generatePhantomDeeplink: phantom.generatePhantomDeeplink,
    generatePhantomConnectDeeplink: phantom.generatePhantomConnectDeeplink,
    parsePhantomResponse: phantom.parsePhantomResponse
  },
  
  // Callback server for wallet responses
  startCallbackServer: callback.startCallbackServer,
  
  // URL shortener for QR codes
  utils: {
    shortenUrl: urlShortener.shortenUrl,
    createQrCodeUrl: urlShortener.createQrCodeUrl
  }
};