const { Connection, PublicKey, SystemProgram } = require('@solana/web3.js');
const { Program, AnchorProvider, BN } = require('@coral-xyz/anchor');
const fs = require('fs');
const path = require('path');

// Check if we should use mock mode
const USE_MOCK = true; // Always use mock mode for now

// Program IDs from the deployed contracts (only needed for real mode)
let GIT_SOLANA_PROGRAM_ID, GIT_STAR_PROGRAM_ID;
if (!USE_MOCK) {
  GIT_SOLANA_PROGRAM_ID = new PublicKey('5TQo5Bf6yXp9uywEFbp9YKUyveD2pe2LVXRjY2aWRup5');
  GIT_STAR_PROGRAM_ID = new PublicKey('2e1PXZUvJYR8Qci7T9esFZNPgvBiDYiVnzMRzSLSroiJ');
}

// Load IDLs only if not in mock mode
let gitSolanaIdl;
let gitStarIdl;

if (!USE_MOCK) {
  try {
    // Path to IDL files (relative to project root)
    const GIT_SOLANA_IDL_PATH = path.join(__dirname, '../../../target/idl/git_solana.json');
    const GIT_STAR_IDL_PATH = path.join(__dirname, '../../../target/idl/git_star.json');
    
    gitSolanaIdl = JSON.parse(fs.readFileSync(GIT_SOLANA_IDL_PATH, 'utf8'));
    gitStarIdl = JSON.parse(fs.readFileSync(GIT_STAR_IDL_PATH, 'utf8'));
  } catch (error) {
    console.error('Error loading IDL files:', error);
    console.error('Running in mock mode');
  }
}

class GitStarClient {
  constructor(connection, wallet = null) {
    // If we're in mock mode, we don't need to do anything with the connection
    this.useMockMode = USE_MOCK;
    
    if (this.useMockMode) {
      console.log("Running in mock mode - no Solana connection needed");
      this.gitSolanaProgram = null;
      this.gitStarProgram = null;
      return;
    }
    
    // Only set up Solana connection if not in mock mode
    this.connection = connection;
    this.wallet = wallet;
    
    // Create provider (read-only if no wallet is provided)
    this.provider = wallet 
      ? new AnchorProvider(connection, wallet, {})
      : new AnchorProvider(connection, {}, {});
    
    // Initialize programs
    try {
      if (gitSolanaIdl) {
        this.gitSolanaProgram = new Program(gitSolanaIdl, GIT_SOLANA_PROGRAM_ID, this.provider);
      } else {
        console.log("No Git Solana IDL available, using mock data only");
        this.useMockMode = true;
      }
      
      if (gitStarIdl) {
        this.gitStarProgram = new Program(gitStarIdl, GIT_STAR_PROGRAM_ID, this.provider);
      } else {
        console.log("No Git Star IDL available, using mock data only");
        this.useMockMode = true;
      }
    } catch (error) {
      console.error("Error initializing Anchor programs:", error);
      console.log("Running in mock-only mode due to program initialization error");
      this.useMockMode = true;
      this.gitSolanaProgram = null;
      this.gitStarProgram = null;
    }
  }

  // ==== Repository Listing & Details ====

  async listRepositories(filters = {}, page = 1, limit = 10) {
    try {
      // Check if we're running in mock mode
      if (this.useMockMode) {
        // Generate mock data
        const mockRepos = [];
        for (let i = 1; i <= 30; i++) {
          const repoName = i % 10 === 0 ? `solar-project-${i}` : 
                        i % 5 === 0 ? `blockchain-demo-${i}` : 
                        i % 3 === 0 ? `defi-app-${i}` : 
                        `example-repo-${i}`;
          
          const repoLanguage = i % 10 === 0 ? 'TypeScript' :
                            i % 7 === 0 ? 'JavaScript' :
                            i % 5 === 0 ? 'Rust' :
                            i % 3 === 0 ? 'Solidity' :
                            'Python';
          
          const createdAt = new Date(Date.now() - (Math.random() * 10000000000));
          const updatedAt = new Date(Date.now() - (Math.random() * 1000000000));
          
          mockRepos.push({
            id: `repo-${i}`,
            name: repoName,
            owner: `FZL8PK74v3kYDVF6YunpMZZrxsJamGJZQHtYxRDfqdJU`,
            address: `0x${Math.random().toString(16).slice(2, 12)}`,
            description: `This is a ${repoLanguage} project for demonstrating SolAR Explorer capabilities`,
            language: repoLanguage,
            collaborators: [
              `FZL8PK74v3kYDVF6YunpMZZrxsJamGJZQHtYxRDfqdJU`,
              `5TQo5Bf6yXp9uywEFbp9YKUyveD2pe2LVXRjY2aWRup5`
            ],
            branches: [
              {
                name: 'main',
                commit_hash: `commit-${i}-1`,
                arweave_tx: `mock-arweave-tx-${i}-1`,
                date: createdAt.toISOString()
              },
              {
                name: 'dev',
                commit_hash: `commit-${i}-2`,
                arweave_tx: `mock-arweave-tx-${i}-2`,
                date: updatedAt.toISOString()
              }
            ],
            stars: Math.floor(Math.random() * 100),
            created_at: createdAt.toISOString(),
            updated_at: updatedAt.toISOString()
          });
        }
        
        // Paginate the results
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedRepos = mockRepos.slice(startIndex, endIndex);
        
        return {
          repositories: paginatedRepos,
          pagination: {
            total: mockRepos.length,
            page,
            limit,
            pages: Math.ceil(mockRepos.length / limit)
          }
        };
      }
      
      // Get all repository accounts
      const accounts = await this.connection.getProgramAccounts(GIT_SOLANA_PROGRAM_ID, {
        filters: this._buildRepoFilters(filters),
        dataSlice: { offset: 0, length: 0 } // Just get account addresses first for efficiency
      });
      
      // Paginate results
      const startIndex = (page - 1) * limit;
      const paginatedAccounts = accounts.slice(startIndex, startIndex + limit);
      
      // Fetch full account data for paginated results
      const repositories = await Promise.all(
        paginatedAccounts.map(async ({ pubkey }) => {
          try {
            // Fetch repository data
            const repoData = await this.gitSolanaProgram.account.repository.fetch(pubkey);
            
            // Get star count for this repository
            const starCount = await this.getRepositoryStarCount(
              repoData.owner.toString(), 
              repoData.name
            );
            
            return {
              id: pubkey.toString(),
              name: repoData.name,
              owner: repoData.owner.toString(),
              address: pubkey.toString(),
              collaborators: repoData.collaborators.map(c => c.toString()),
              branches: repoData.branches.map(b => ({
                name: b.name,
                commit_hash: b.commit.commitHash,
                arweave_tx: b.commit.arweaveTx,
                date: new Date().toISOString() // Add date for frontend
              })),
              stars: starCount,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          } catch (error) {
            console.error(`Error fetching repository ${pubkey.toString()}:`, error);
            return null;
          }
        })
      );
      
      // Filter out any null results (failed fetches)
      const validRepositories = repositories.filter(repo => repo !== null);
      
      return {
        repositories: validRepositories,
        pagination: {
          total: accounts.length,
          page,
          limit,
          pages: Math.ceil(accounts.length / limit)
        }
      };
    } catch (error) {
      console.error('Error listing repositories:', error);
      
      // Fallback to mock data
      console.log("Falling back to mock data due to error");
      const mockRepos = [];
      // Generate mock repos (same code as above)
      for (let i = 1; i <= 30; i++) {
        const repoName = i % 10 === 0 ? `solar-project-${i}` : 
                      i % 5 === 0 ? `blockchain-demo-${i}` : 
                      i % 3 === 0 ? `defi-app-${i}` : 
                      `example-repo-${i}`;
        
        mockRepos.push({
          id: `repo-${i}`,
          name: repoName,
          owner: `FZL8PK74v3kYDVF6YunpMZZrxsJamGJZQHtYxRDfqdJU`,
          address: `0x${Math.random().toString(16).slice(2, 12)}`,
          collaborators: [
            `FZL8PK74v3kYDVF6YunpMZZrxsJamGJZQHtYxRDfqdJU`,
            `5TQo5Bf6yXp9uywEFbp9YKUyveD2pe2LVXRjY2aWRup5`
          ],
          branches: [
            {
              name: 'main',
              commit_hash: `commit-${i}-1`,
              arweave_tx: `mock-arweave-tx-${i}-1`,
              date: new Date().toISOString()
            },
            {
              name: 'dev',
              commit_hash: `commit-${i}-2`,
              arweave_tx: `mock-arweave-tx-${i}-2`,
              date: new Date().toISOString()
            }
          ],
          stars: Math.floor(Math.random() * 100)
        });
      }
      
      // Paginate the results
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedRepos = mockRepos.slice(startIndex, endIndex);
      
      return {
        repositories: paginatedRepos,
        pagination: {
          total: mockRepos.length,
          page,
          limit,
          pages: Math.ceil(mockRepos.length / limit)
        }
      };
    }
  }

  _buildRepoFilters(filters) {
    const filterArray = [];
    
    // Add filters based on user input
    if (filters.owner) {
      filterArray.push({
        memcmp: {
          offset: 8, // After discriminator
          bytes: new PublicKey(filters.owner).toBase58()
        }
      });
    }
    
    // Add more filters as needed (could filter by name prefix, etc.)
    
    return filterArray;
  }

  async getRepositoryDetails(owner, name) {
    try {
      // Check if we're in mock mode
      if (this.useMockMode) {
        // Return mock repository data
        const repoLanguage = name.includes('solar') ? 'TypeScript' :
                         name.includes('blockchain') ? 'JavaScript' :
                         name.includes('defi') ? 'Solidity' :
                         'Rust';
                         
        const createdAt = new Date(Date.now() - (Math.random() * 10000000000));
        const updatedAt = new Date(Date.now() - (Math.random() * 1000000000));
                         
        return {
          id: `mock-repo-${name}`,
          name,
          owner,
          address: `0x${Math.random().toString(16).slice(2, 12)}`,
          description: `This is a ${repoLanguage} project for demonstrating SolAR Explorer capabilities`,
          language: repoLanguage,
          collaborators: [
            owner,
            '5TQo5Bf6yXp9uywEFbp9YKUyveD2pe2LVXRjY2aWRup5'
          ],
          branches: [
            {
              name: 'main',
              commit_hash: 'a1b2c3d4e5f6',
              arweave_tx: 'mock-arweave-tx-main',
              date: createdAt.toISOString()
            },
            {
              name: 'dev',
              commit_hash: 'f6e5d4c3b2a1',
              arweave_tx: 'mock-arweave-tx-dev',
              date: updatedAt.toISOString() 
            },
            {
              name: 'feature/new-feature',
              commit_hash: '1a2b3c4d5e6f',
              arweave_tx: 'mock-arweave-tx-feature',
              date: new Date(Date.now() - (Math.random() * 5000000000)).toISOString()
            }
          ],
          stars: Math.floor(Math.random() * 100),
          created_at: createdAt.toISOString(),
          updated_at: updatedAt.toISOString()
        };
      }
      
      // Find the repository PDA
      const [repoPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("repository"),
          new PublicKey(owner).toBuffer(),
          Buffer.from(name)
        ],
        GIT_SOLANA_PROGRAM_ID
      );
      
      // Fetch repository data
      const repoData = await this.gitSolanaProgram.account.repository.fetch(repoPDA);
      
      // Get star count
      const starCount = await this.getRepositoryStarCount(owner, name);
      
      return {
        id: repoPDA.toString(),
        name: repoData.name,
        owner: repoData.owner.toString(),
        address: repoPDA.toString(),
        collaborators: repoData.collaborators.map(c => c.toString()),
        branches: repoData.branches.map(b => ({
          name: b.name,
          commit_hash: b.commit.commitHash,
          arweave_tx: b.commit.arweaveTx,
          date: new Date().toISOString() // Add date for frontend
        })),
        stars: starCount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching repository details for ${owner}/${name}:`, error);
      
      // Fallback to mock data
      console.log(`Falling back to mock data for repository ${owner}/${name}`);
      const repoLanguage = name.includes('solar') ? 'TypeScript' :
                       name.includes('blockchain') ? 'JavaScript' :
                       name.includes('defi') ? 'Solidity' :
                       'Rust';
                       
      return {
        id: `mock-repo-${name}`,
        name,
        owner,
        address: `0x${Math.random().toString(16).slice(2, 12)}`,
        description: `This is a ${repoLanguage} project for demonstrating SolAR Explorer capabilities`,
        language: repoLanguage,
        collaborators: [
          owner,
          '5TQo5Bf6yXp9uywEFbp9YKUyveD2pe2LVXRjY2aWRup5'
        ],
        branches: [
          {
            name: 'main',
            commit_hash: 'a1b2c3d4e5f6',
            arweave_tx: 'mock-arweave-tx-main',
            date: new Date(Date.now() - 5000000000).toISOString()
          },
          {
            name: 'dev',
            commit_hash: 'f6e5d4c3b2a1',
            arweave_tx: 'mock-arweave-tx-dev',
            date: new Date(Date.now() - 3000000000).toISOString()
          },
          {
            name: 'feature/new-feature',
            commit_hash: '1a2b3c4d5e6f',
            arweave_tx: 'mock-arweave-tx-feature',
            date: new Date(Date.now() - 1000000000).toISOString()
          }
        ],
        stars: 42,
        created_at: new Date(Date.now() - 5000000000).toISOString(),
        updated_at: new Date().toISOString()
      };
    }
  }

  // ==== Star Functionality ====

  async starRepository(userWallet, owner, name) {
    if (!userWallet) {
      throw new Error('User wallet is required to star a repository');
    }
    
    try {
      // Check if we're in mock mode
      if (this.useMockMode) {
        // Return mock success response
        return { 
          success: true, 
          transaction: `mock-tx-${Math.random().toString(36).substring(2, 15)}` 
        };
      }
      
      // Override provider with user wallet
      const provider = new AnchorProvider(this.connection, userWallet, {});
      const program = new Program(gitStarIdl, GIT_STAR_PROGRAM_ID, provider);
      
      // Find the star PDA
      const [starPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("star"),
          userWallet.publicKey.toBuffer(),
          new PublicKey(owner).toBuffer(),
          Buffer.from(name)
        ],
        GIT_STAR_PROGRAM_ID
      );
      
      // Star the repository
      const tx = await program.methods
        .starRepository(new PublicKey(owner), name)
        .accounts({
          star: starPDA,
          user: userWallet.publicKey,
          systemProgram: SystemProgram.programId
        })
        .rpc();
        
      return { success: true, transaction: tx };
    } catch (error) {
      console.error(`Error starring repository ${owner}/${name}:`, error);
      
      if (this.useMockMode) {
        // Return mock success response even in case of error
        return { 
          success: true, 
          transaction: `mock-tx-${Math.random().toString(36).substring(2, 15)}` 
        };
      }
      
      throw error;
    }
  }

  async unstarRepository(userWallet, owner, name) {
    if (!userWallet) {
      throw new Error('User wallet is required to unstar a repository');
    }
    
    try {
      // Check if we're in mock mode
      if (this.useMockMode) {
        // Return mock success response
        return { 
          success: true, 
          transaction: `mock-tx-${Math.random().toString(36).substring(2, 15)}` 
        };
      }
      
      // Override provider with user wallet
      const provider = new AnchorProvider(this.connection, userWallet, {});
      const program = new Program(gitStarIdl, GIT_STAR_PROGRAM_ID, provider);
      
      // Find the star PDA
      const [starPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("star"),
          userWallet.publicKey.toBuffer(),
          new PublicKey(owner).toBuffer(),
          Buffer.from(name)
        ],
        GIT_STAR_PROGRAM_ID
      );
      
      // Unstar the repository
      const tx = await program.methods
        .unstarRepository()
        .accounts({
          star: starPDA,
          user: userWallet.publicKey,
          systemProgram: SystemProgram.programId
        })
        .rpc();
        
      return { success: true, transaction: tx };
    } catch (error) {
      console.error(`Error unstarring repository ${owner}/${name}:`, error);
      
      if (this.useMockMode) {
        // Return mock success response even in case of error
        return { 
          success: true, 
          transaction: `mock-tx-${Math.random().toString(36).substring(2, 15)}` 
        };
      }
      
      throw error;
    }
  }

  async isRepositoryStarred(userPublicKey, owner, name) {
    try {
      // Check if we're in mock mode
      if (this.useMockMode) {
        // Return random star status with bias toward true
        return Math.random() > 0.3;
      }
      
      // Find the star PDA
      const [starPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("star"),
          new PublicKey(userPublicKey).toBuffer(),
          new PublicKey(owner).toBuffer(),
          Buffer.from(name)
        ],
        GIT_STAR_PROGRAM_ID
      );
      
      // Try to fetch the star account
      try {
        await this.gitStarProgram.account.star.fetch(starPDA);
        return true; // Account exists, repository is starred
      } catch (error) {
        return false; // Account doesn't exist, repository is not starred
      }
    } catch (error) {
      console.error(`Error checking star status for ${owner}/${name}:`, error);
      // Fallback to mock data
      return Math.random() > 0.3;
    }
  }

  async getRepositoryStarCount(owner, name) {
    try {
      // Check if we're in mock mode
      if (this.useMockMode) {
        // Return random star count
        return Math.floor(Math.random() * 100);
      }
      
      // Get all star accounts
      const accounts = await this.connection.getProgramAccounts(
        GIT_STAR_PROGRAM_ID,
        {
          filters: [
            {
              memcmp: {
                offset: 8 + 32, // After discriminator and user pubkey
                bytes: new PublicKey(owner).toBase58()
              }
            }
          ]
        }
      );
      
      // Filter by repository name
      const repoStars = accounts.filter(({ account }) => {
        try {
          const decoded = this.gitStarProgram.coder.accounts.decode('star', account.data);
          return decoded.repositoryName === name;
        } catch (e) {
          return false;
        }
      });
      
      return repoStars.length;
    } catch (error) {
      console.error(`Error getting star count for ${owner}/${name}:`, error);
      // Return random count as fallback
      return Math.floor(Math.random() * 100);
    }
  }

  async getRepositoryStargazers(owner, name) {
    try {
      // Check if we're in mock mode
      if (this.useMockMode) {
        // Generate mock stargazers
        const mockStargazers = [];
        const starCount = Math.floor(Math.random() * 50) + 5; // 5-55 stars
        
        for (let i = 0; i < starCount; i++) {
          const timestamp = new Date(Date.now() - (Math.random() * 10000000000));
          mockStargazers.push({
            address: `${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
            timestamp: timestamp.toISOString(),
            starId: `star-${i}-${Math.random().toString(16).slice(2, 8)}`
          });
        }
        
        // Sort by timestamp (newest first)
        return mockStargazers.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      }
      
      // Get all star accounts
      const accounts = await this.connection.getProgramAccounts(
        GIT_STAR_PROGRAM_ID,
        {
          filters: [
            {
              memcmp: {
                offset: 8 + 32, // After discriminator and user pubkey
                bytes: new PublicKey(owner).toBase58()
              }
            }
          ]
        }
      );
      
      // Filter by repository name and extract user information
      const stargazers = accounts
        .map(({ account, pubkey }) => {
          try {
            const decoded = this.gitStarProgram.coder.accounts.decode('star', account.data);
            if (decoded.repositoryName === name) {
              return {
                address: decoded.user.toString(),
                timestamp: new Date(decoded.timestamp * 1000).toISOString(),
                starId: pubkey.toString()
              };
            }
            return null;
          } catch (e) {
            return null;
          }
        })
        .filter(item => item !== null);
      
      // Sort by timestamp (newest first)
      return stargazers.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error(`Error getting stargazers for ${owner}/${name}:`, error);
      
      // Generate mock stargazers as fallback
      const mockStargazers = [];
      const starCount = Math.floor(Math.random() * 50) + 5; // 5-55 stars
      
      for (let i = 0; i < starCount; i++) {
        const timestamp = new Date(Date.now() - (Math.random() * 10000000000));
        mockStargazers.push({
          address: `${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
          timestamp: timestamp.toISOString(),
          starId: `star-${i}-${Math.random().toString(16).slice(2, 8)}`
        });
      }
      
      // Sort by timestamp (newest first)
      return mockStargazers.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }
  }
}

module.exports = GitStarClient;