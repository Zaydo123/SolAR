/**
 * Authentication and authorization functionality for the SolAR Explorer API
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const { PublicKey } = require('@solana/web3.js');
const nacl = require('tweetnacl');
const bs58 = require('bs58');

const router = express.Router();

// Environment variables (with defaults for development)
const JWT_SECRET = process.env.JWT_SECRET || 'solar-explorer-dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// In-memory user store (replace with database in production)
const users = new Map();

/**
 * Generate a nonce for signature verification
 */
router.get('/nonce', (req, res) => {
  // Create a random nonce
  const nonce = Math.floor(Math.random() * 1000000).toString();
  const timestamp = Date.now();
  
  // Store the nonce temporarily (expire after 5 minutes)
  const nonceData = { nonce, timestamp, expires: timestamp + (5 * 60 * 1000) };
  
  // Use the nonce as key in our nonce store
  users.set(nonce, nonceData);
  
  res.json({
    nonce,
    expires: nonceData.expires,
    message: `Sign this message for authenticating with SolAR Explorer: ${nonce}`
  });
});

/**
 * Authenticate using a Solana wallet signature
 */
router.post('/auth', async (req, res) => {
  try {
    const { publicKey, signature, nonce } = req.body;
    
    // Validate inputs
    if (!publicKey || !signature || !nonce) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Check if nonce exists and hasn't expired
    const nonceData = users.get(nonce);
    if (!nonceData) {
      return res.status(400).json({ error: 'Invalid nonce' });
    }
    
    if (Date.now() > nonceData.expires) {
      users.delete(nonce);
      return res.status(400).json({ error: 'Nonce expired' });
    }
    
    // Convert inputs to the right format
    const pubKeyBuffer = new PublicKey(publicKey).toBuffer();
    const signatureBuffer = bs58.decode(signature);
    const messageBuffer = Buffer.from(`Sign this message for authenticating with SolAR Explorer: ${nonce}`);
    
    // Verify the signature
    const verified = nacl.sign.detached.verify(
      messageBuffer,
      signatureBuffer,
      pubKeyBuffer
    );
    
    if (!verified) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Remove the used nonce
    users.delete(nonce);
    
    // Check if user exists or create a new user
    let user = await getUserByPublicKey(publicKey);
    if (!user) {
      user = {
        publicKey,
        username: `user_${publicKey.substring(0, 8)}`,
        createdAt: new Date().toISOString()
      };
      
      // Save user (mock implementation)
      saveUser(user);
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { publicKey: user.publicKey, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.json({
      token,
      user: {
        publicKey: user.publicKey,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * Update user profile
 */
router.put('/user', verifyToken, (req, res) => {
  try {
    const { username } = req.body;
    const { publicKey } = req.user;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    // Get existing user
    const user = getUserByPublicKey(publicKey);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user
    user.username = username;
    
    // Save user (mock implementation)
    saveUser(user);
    
    res.json({
      publicKey: user.publicKey,
      username: user.username
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * Get current user profile
 */
router.get('/user', verifyToken, (req, res) => {
  try {
    const { publicKey } = req.user;
    const user = getUserByPublicKey(publicKey);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      publicKey: user.publicKey,
      username: user.username
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * Middleware to verify JWT token
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// Mock user database functions
function getUserByPublicKey(publicKey) {
  return users.get(publicKey);
}

function saveUser(user) {
  users.set(user.publicKey, user);
  return user;
}

module.exports = {
  router,
  verifyToken
};