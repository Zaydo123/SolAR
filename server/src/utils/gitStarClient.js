/**
 * Client for interacting with the git-star program on Solana
 */
const { Connection, PublicKey, Keypair, SystemProgram } = require('@solana/web3.js');
const { Program, AnchorProvider, web3 } = require('@coral-xyz/anchor');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Program ID for the git-star program
const PROGRAM_ID = new PublicKey('GitStarProgram11111111111111111111111111111111');

// Default localnet URL
const LOCALNET_URL = 'http://localhost:8899';

// Function to load a keypair for signing transactions
function loadOrCreateKeypair(keypairPath) {
  try {
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
    return Keypair.fromSecretKey(Uint8Array.from(keypairData));
  } catch (error) {
    console.log(`Generating new keypair as ${keypairPath} not found or invalid`);
    const keypair = Keypair.generate();
    
    // Save the keypair for future use
    const dirPath = path.dirname(keypairPath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    fs.writeFileSync(
      keypairPath,
      JSON.stringify(Array.from(keypair.secretKey))
    );
    
    return keypair;
  }
}

class GitStarClient {
  constructor(options = {}) {
    try {
      // Create connection to localnet
      this.connection = new Connection(options.rpcUrl || LOCALNET_URL, 'confirmed');
      
      // Load wallet keypair
      const walletPath = options.keypairPath || path.join(os.homedir(), '.config', 'solana', 'id.json');
      this.wallet = loadOrCreateKeypair(walletPath);
      
      // Try to load the IDL
      const idlPath = options.idlPath || path.join(__dirname, '..', '..', '..', 'git-solana', 'target', 'idl', 'git_star.json');
      
      try {
        // Check if IDL exists
        const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
        
        // Set up provider and program
        this.provider = new AnchorProvider(
          this.connection,
          { 
            publicKey: this.wallet.publicKey,
            signTransaction: async (tx) => {
              tx.partialSign(this.wallet);
              return tx;
            },
            signAllTransactions: async (txs) => {
              return txs.map(tx => {
                tx.partialSign(this.wallet);
                return tx;
              });
            }
          },
          { commitment: 'confirmed' }
        );
        
        this.program = new Program(idl, PROGRAM_ID, this.provider);
        console.log('Initialized GitStar client with program', PROGRAM_ID.toString());
      } catch (err) {
        console.error('Error loading GitStar IDL or initializing program:', err.message);
        console.error('Make sure you have built the git-star program and generated the IDL');
        this.program = null;
      }
      
      // Check if validator is running
      this.validatorRunning = false;
      this.checkValidatorConnection();
    } catch (err) {
      console.error('Error in GitStar client constructor:', err.message);
      this.program = null;
      this.validatorRunning = false;
    }
  }
  
  /**
   * Check if the Solana validator is running
   */
  async checkValidatorConnection() {
    try {
      await this.connection.getLatestBlockhash();
      this.validatorRunning = true;
      console.log('Successfully connected to Solana validator for GitStar');
      return true;
    } catch (error) {
      this.validatorRunning = false;
      console.error('Solana validator connection failed for GitStar:', error.message);
      return false;
    }
  }

  /**
   * Find the PDA for a star
   */
  findStarPDA(userPubkey, repoOwnerPubkey, repoName) {
    const seeds = [
      Buffer.from('star'),
      userPubkey.toBuffer(),
      repoOwnerPubkey.toBuffer(),
      Buffer.from(repoName)
    ];
    
    const [pda, _] = PublicKey.findProgramAddressSync(
      seeds,
      PROGRAM_ID
    );
    
    return pda;
  }

  /**
   * Star a repository
   */
  async starRepository(repoOwner, repoName) {
    if (!this.program || !this.validatorRunning) {
      console.log('Solana integration not available - skipping star action');
      return {
        user: this.wallet.publicKey.toString(),
        repoOwner,
        repoName,
        status: 'simulated'
      };
    }
    
    try {
      const repoOwnerPubkey = new PublicKey(repoOwner);
      
      // Find the star PDA
      const starPDA = this.findStarPDA(
        this.wallet.publicKey,
        repoOwnerPubkey,
        repoName
      );
      
      // Check if already starred
      try {
        await this.program.account.star.fetch(starPDA);
        console.log(`Repository ${repoName} already starred by ${this.wallet.publicKey.toString()}`);
        return {
          user: this.wallet.publicKey.toString(),
          repoOwner,
          repoName,
          starPda: starPDA.toString(),
          status: 'already_starred'
        };
      } catch (error) {
        // If account doesn't exist, proceed with starring
        if (!error.message.includes('Account does not exist')) {
          throw error;
        }
      }
      
      // Send the starRepository instruction
      const tx = await this.program.methods
        .starRepository(repoOwnerPubkey, repoName)
        .accounts({
          star: starPDA,
          user: this.wallet.publicKey,
          systemProgram: SystemProgram.programId
        })
        .signers([this.wallet])
        .rpc();
      
      console.log(`Starred repository ${repoName} with transaction ${tx}`);
      
      return {
        user: this.wallet.publicKey.toString(),
        repoOwner,
        repoName,
        starPda: starPDA.toString(),
        transaction: tx,
        status: 'success'
      };
    } catch (error) {
      console.error('Error starring repository:', error.message);
      return {
        user: this.wallet.publicKey.toString(),
        repoOwner,
        repoName,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Unstar a repository
   */
  async unstarRepository(repoOwner, repoName) {
    if (!this.program || !this.validatorRunning) {
      console.log('Solana integration not available - skipping unstar action');
      return {
        user: this.wallet.publicKey.toString(),
        repoOwner,
        repoName,
        status: 'simulated'
      };
    }
    
    try {
      const repoOwnerPubkey = new PublicKey(repoOwner);
      
      // Find the star PDA
      const starPDA = this.findStarPDA(
        this.wallet.publicKey,
        repoOwnerPubkey,
        repoName
      );
      
      // Check if already starred
      try {
        await this.program.account.star.fetch(starPDA);
      } catch (error) {
        // If account doesn't exist, repository is not starred
        if (error.message.includes('Account does not exist')) {
          console.log(`Repository ${repoName} is not starred by ${this.wallet.publicKey.toString()}`);
          return {
            user: this.wallet.publicKey.toString(),
            repoOwner,
            repoName,
            status: 'not_starred'
          };
        }
        throw error;
      }
      
      // Send the unstarRepository instruction
      const tx = await this.program.methods
        .unstarRepository()
        .accounts({
          star: starPDA,
          user: this.wallet.publicKey,
          systemProgram: SystemProgram.programId
        })
        .signers([this.wallet])
        .rpc();
      
      console.log(`Unstarred repository ${repoName} with transaction ${tx}`);
      
      return {
        user: this.wallet.publicKey.toString(),
        repoOwner,
        repoName,
        transaction: tx,
        status: 'success'
      };
    } catch (error) {
      console.error('Error unstarring repository:', error.message);
      return {
        user: this.wallet.publicKey.toString(),
        repoOwner,
        repoName,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Check if a user has starred a repository
   */
  async hasUserStarred(userPublicKey, repoOwner, repoName) {
    if (!this.program || !this.validatorRunning) {
      console.log('Solana integration not available - cannot check star status');
      return false;
    }
    
    try {
      const userPubkey = new PublicKey(userPublicKey);
      const repoOwnerPubkey = new PublicKey(repoOwner);
      
      // Find the star PDA
      const starPDA = this.findStarPDA(
        userPubkey,
        repoOwnerPubkey,
        repoName
      );
      
      // Try to fetch the star account
      try {
        await this.program.account.star.fetch(starPDA);
        return true; // Account exists, user has starred
      } catch (error) {
        if (error.message.includes('Account does not exist')) {
          return false; // Account doesn't exist, user hasn't starred
        }
        throw error; // Unexpected error
      }
    } catch (error) {
      console.error('Error checking star status:', error.message);
      return false;
    }
  }

  /**
   * Get all stars for a repository
   */
  async getRepositoryStars(repoOwner, repoName) {
    if (!this.program || !this.validatorRunning) {
      console.log('Solana integration not available - cannot get repository stars');
      return { count: 0, stars: [] };
    }
    
    try {
      const repoOwnerPubkey = new PublicKey(repoOwner);
      
      // Fetch all star accounts
      // We need to use a filter for the repoOwner since we can't easily filter by repoName on-chain
      const accounts = await this.connection.getProgramAccounts(
        PROGRAM_ID,
        {
          filters: [
            // 8 bytes for discriminator, then 32 bytes for user pubkey
            {
              memcmp: {
                offset: 8 + 32,
                bytes: repoOwnerPubkey.toBase58()
              }
            }
          ]
        }
      );
      
      // Parse and filter accounts by repoName
      const stars = [];
      for (const { pubkey, account } of accounts) {
        try {
          const starData = this.program.coder.accounts.decode('star', account.data);
          
          // Only include if repoName matches
          if (starData.repositoryName === repoName) {
            stars.push({
              address: pubkey.toString(),
              user: starData.user.toString(),
              repoOwner: starData.repositoryOwner.toString(),
              repoName: starData.repositoryName,
              timestamp: starData.timestamp.toString()
            });
          }
        } catch (err) {
          // Skip accounts that aren't star accounts
          continue;
        }
      }
      
      return {
        count: stars.length,
        stars
      };
    } catch (error) {
      console.error('Error getting repository stars:', error.message);
      return { count: 0, stars: [] };
    }
  }

  /**
   * Get all repositories starred by a user
   */
  async getUserStarredRepositories(userPublicKey) {
    if (!this.program || !this.validatorRunning) {
      console.log('Solana integration not available - cannot get user starred repositories');
      return [];
    }
    
    try {
      const userPubkey = new PublicKey(userPublicKey);
      
      // Fetch all star accounts for this user
      const accounts = await this.connection.getProgramAccounts(
        PROGRAM_ID,
        {
          filters: [
            // 8 bytes for discriminator
            {
              memcmp: {
                offset: 8,
                bytes: userPubkey.toBase58()
              }
            }
          ]
        }
      );
      
      // Parse accounts
      const starredRepos = [];
      for (const { pubkey, account } of accounts) {
        try {
          const starData = this.program.coder.accounts.decode('star', account.data);
          
          starredRepos.push({
            repoOwner: starData.repositoryOwner.toString(),
            repoName: starData.repositoryName,
            starredAt: new Date(starData.timestamp * 1000).toISOString()
          });
        } catch (err) {
          // Skip accounts that aren't star accounts
          continue;
        }
      }
      
      return starredRepos;
    } catch (error) {
      console.error('Error getting user starred repositories:', error.message);
      return [];
    }
  }
}

module.exports = GitStarClient;