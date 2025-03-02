/**
 * Solana client for interacting with the git-solana program on localnet
 */
const { Connection, PublicKey, Keypair, SystemProgram } = require('@solana/web3.js');
const { Program, AnchorProvider, web3, BN } = require('@coral-xyz/anchor');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Load the IDL (Interface Description Language) from the git-solana program
// We'll use this to interact with the program
const idlPath = path.join(__dirname, '..', 'git-solana', 'target', 'idl', 'git_solana.json');
let idl;
try {
  idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
  console.log('Loaded git-solana IDL');
} catch (err) {
  console.error('Error loading IDL:', err.message);
  console.error('Please ensure the git-solana program has been built and the IDL exists');
  idl = null;
}

// Program ID from the contract (declared in lib.rs)
const PROGRAM_ID = new PublicKey('5TQo5Bf6yXp9uywEFbp9YKUyveD2pe2LVXRjY2aWRup5');

// Localnet connection
// Default localnet URL, change if your validator is running on a different port
const LOCALNET_URL = 'http://localhost:8899';

// Function to load a keypair for signing transactions
// Fallback to generating a random keypair if file doesn't exist
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

class SolanaClient {
  constructor(options = {}) {
    try {
      // Create connection to localnet
      this.connection = new Connection(options.rpcUrl || LOCALNET_URL, 'confirmed');
      
      // Load wallet keypair
      const walletPath = options.keypairPath || path.join(os.homedir(), '.config', 'solana', 'id.json');
      this.wallet = loadOrCreateKeypair(walletPath);
      
      // Set up provider and program if IDL is loaded
      if (idl) {
        try {
          this.provider = new AnchorProvider(
            this.connection,
            { publicKey: this.wallet.publicKey, signTransaction: tx => tx, signAllTransactions: txs => txs },
            { commitment: 'confirmed' }
          );
          this.program = new Program(idl, PROGRAM_ID, this.provider);
          console.log('Initialized Solana client with program', PROGRAM_ID.toString());
        } catch (err) {
          console.error('Error initializing program:', err);
          this.program = null;
        }
      }
      
      // Check if validator is running by making a test request
      this.validatorRunning = false;
      this.checkValidatorConnection();
    } catch (err) {
      console.error('Error in Solana client constructor:', err.message);
      this.program = null;
      this.validatorRunning = false;
    }
  }
  
  /**
   * Check if the Solana validator is running
   */
  async checkValidatorConnection() {
    try {
      // Try to get a recent blockhash as a connection test
      await this.connection.getLatestBlockhash();
      this.validatorRunning = true;
      console.log('Successfully connected to Solana validator');
      return true;
    } catch (error) {
      this.validatorRunning = false;
      console.error('Solana validator connection failed:', error.message);
      console.log('Git operations will continue to work without Solana integration');
      return false;
    }
  }

  /**
   * Find the PDA (Program Derived Address) for a repository
   * This matches the logic in the Solana program lib.rs
   */
  findRepositoryPDA(owner, repoName) {
    const seeds = [
      Buffer.from('repository'),
      owner.toBuffer(),
      Buffer.from(repoName)
    ];
    
    const [pda, _] = PublicKey.findProgramAddressSync(
      seeds,
      PROGRAM_ID
    );
    
    return pda;
  }

  /**
   * Get repository data from Solana
   */
  async getRepository(owner, repoName) {
    if (!this.program || !this.validatorRunning) {
      console.log('Solana integration not available');
      return null;
    }
    
    try {
      // Find the repository account address
      const repoPDA = this.findRepositoryPDA(
        new PublicKey(owner),
        repoName
      );
      
      // Fetch the account data
      const repoAccount = await this.program.account.repository.fetch(repoPDA);
      
      return {
        address: repoPDA.toString(),
        owner: repoAccount.owner.toString(),
        name: repoAccount.name,
        collaborators: repoAccount.collaborators.map(collab => collab.toString()),
        branches: repoAccount.branches.map(branch => ({
          name: branch.name,
          commitHash: branch.commit.commitHash,
          arweaveTx: branch.commit.arweaveTx
        }))
      };
    } catch (error) {
      // Don't log full error for account not existing - this is normal
      if (error.message.includes('Account does not exist')) {
        console.log(`Repository ${repoName} not found in Solana`);
        return null; // Repository doesn't exist
      }
      
      console.error('Error fetching repository:', error.message);
      return null;
    }
  }

  /**
   * Create a new repository on Solana
   */
  async createRepository(repoName) {
    if (!this.program || !this.validatorRunning) {
      console.log('Solana integration not available - skipping repository creation');
      return {
        name: repoName,
        owner: this.wallet ? this.wallet.publicKey.toString() : 'unknown',
        branches: []
      };
    }
    
    try {
      // Find the repository PDA
      const repoPDA = this.findRepositoryPDA(
        this.wallet.publicKey,
        repoName
      );
      
      // Send the createRepo instruction
      const tx = await this.program.methods
        .createRepo(repoName)
        .accounts({
          repo: repoPDA,
          signer: this.wallet.publicKey,
          systemProgram: SystemProgram.programId
        })
        .signers([this.wallet])
        .rpc();
      
      console.log(`Created repository ${repoName} with transaction ${tx}`);
      
      // Return the new repository data
      return await this.getRepository(this.wallet.publicKey.toString(), repoName);
    } catch (error) {
      console.error('Error creating repository:', error.message);
      // Return a mock repository object
      return {
        name: repoName,
        owner: this.wallet.publicKey.toString(),
        branches: []
      };
    }
  }

  /**
   * Update a branch with new commit information
   */
  async updateBranch(repoOwner, repoName, branchName, commitHash, arweaveTx) {
    if (!this.program || !this.validatorRunning) {
      console.log(`Solana integration not available - skipping branch update for ${branchName}`);
      return {
        name: repoName,
        owner: repoOwner,
        branches: [{
          name: branchName,
          commitHash: commitHash,
          arweaveTx: arweaveTx
        }]
      };
    }
    
    try {
      // Find the repository PDA
      const repoPDA = this.findRepositoryPDA(
        new PublicKey(repoOwner),
        repoName
      );
      
      // Send the updateBranch instruction
      const tx = await this.program.methods
        .updateBranch(branchName, commitHash, arweaveTx)
        .accounts({
          repo: repoPDA,
          signer: this.wallet.publicKey
        })
        .signers([this.wallet])
        .rpc();
      
      console.log(`Updated branch ${branchName} in repository ${repoName} with transaction ${tx}`);
      
      // Return the updated repository data
      return await this.getRepository(repoOwner, repoName);
    } catch (error) {
      console.error('Error updating branch:', error.message);
      // Return a mock repository object
      return {
        name: repoName,
        owner: repoOwner,
        branches: [{
          name: branchName,
          commitHash: commitHash,
          arweaveTx: arweaveTx
        }]
      };
    }
  }

  /**
   * List all repositories for a specific owner
   */
  async listRepositories(owner) {
    if (!this.program || !this.validatorRunning) {
      console.log('Solana integration not available - cannot list repositories');
      return [];
    }
    
    // This requires a getProgramAccounts call with filters
    try {
      const ownerPubkey = new PublicKey(owner);
      
      // Fetch all accounts for the program (can be optimized with proper filters)
      const accounts = await this.connection.getProgramAccounts(PROGRAM_ID);
      
      // Parse and filter accounts
      const repositories = [];
      for (const { pubkey, account } of accounts) {
        try {
          // Deserialize the account data using the program
          const repoData = this.program.coder.accounts.decode('repository', account.data);
          
          // Filter by owner if specified
          if (owner && !repoData.owner.equals(ownerPubkey)) {
            continue;
          }
          
          repositories.push({
            address: pubkey.toString(),
            owner: repoData.owner.toString(),
            name: repoData.name,
            collaborators: repoData.collaborators.map(collab => collab.toString()),
            branches: repoData.branches.map(branch => ({
              name: branch.name,
              commitHash: branch.commit.commitHash,
              arweaveTx: branch.commit.arweaveTx
            }))
          });
        } catch (err) {
          // Skip accounts that aren't repository accounts
          continue;
        }
      }
      
      return repositories;
    } catch (error) {
      console.error('Error listing repositories:', error.message);
      return [];
    }
  }

  /**
   * Get wallet information
   */
  getWalletInfo() {
    return {
      publicKey: this.wallet.publicKey.toString()
    };
  }
}

module.exports = SolanaClient;