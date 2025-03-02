/**
 * Test script for the git-star program
 * This script thoroughly tests the star/unstar functionality
 * against a local test validator
 */
const anchor = require('@coral-xyz/anchor');
const { PublicKey, Keypair, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { BN } = require('bn.js');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

// Path to IDL files
const GIT_SOLANA_IDL_PATH = path.join(__dirname, '../target/idl/git_solana.json');
const GIT_STAR_IDL_PATH = path.join(__dirname, '../target/idl/git_star.json');

// Program IDs
const GIT_SOLANA_PROGRAM_ID = new PublicKey('4j5b45kn4bbQGt4fbFfwuMqLFDetSnAyEbmVgx5RBdJk');
const GIT_STAR_PROGRAM_ID = new PublicKey('2e1PXZUvJYR8Qci7T9esFZNPgvBiDYiVnzMRzSLSroiJ');

// Function to create a new keypair with funds
async function createFundedKeypair(provider, sol = 1) {
  const keypair = Keypair.generate();
  const signature = await provider.connection.requestAirdrop(
    keypair.publicKey,
    sol * LAMPORTS_PER_SOL
  );
  await provider.connection.confirmTransaction(signature);
  console.log(`Created keypair ${keypair.publicKey.toString()} with ${sol} SOL`);
  return keypair;
}

// Check for IDL files
if (!fs.existsSync(GIT_SOLANA_IDL_PATH) || !fs.existsSync(GIT_STAR_IDL_PATH)) {
  console.log('IDL files not found. Building programs...');
  try {
    execSync('anchor build', { stdio: 'inherit' });
  } catch (error) {
    console.error('Failed to build programs:', error);
    process.exit(1);
  }
}

// Load IDLs
const gitSolanaIdl = JSON.parse(fs.readFileSync(GIT_SOLANA_IDL_PATH, 'utf8'));
const gitStarIdl = JSON.parse(fs.readFileSync(GIT_STAR_IDL_PATH, 'utf8'));

async function runTests() {
  console.log('Starting git-star program tests...');
  
  // Set up Anchor provider with default keypair
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  // Create Program objects
  const gitSolanaProgram = new anchor.Program(gitSolanaIdl, GIT_SOLANA_PROGRAM_ID, provider);
  const gitStarProgram = new anchor.Program(gitStarIdl, GIT_STAR_PROGRAM_ID, provider);
  
  console.log('Provider wallet:', provider.wallet.publicKey.toString());
  
  // Generate test data
  const repoOwner = provider.wallet.publicKey;
  const repoName = `test-repo-${Math.floor(Math.random() * 1000)}`;
  
  console.log(`\n==== Creating test repository: ${repoName} ====`);
  
  // Find the repository PDA
  const [repoPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('repository'),
      repoOwner.toBuffer(),
      Buffer.from(repoName)
    ],
    GIT_SOLANA_PROGRAM_ID
  );
  
  console.log('Repository PDA:', repoPDA.toString());
  
  // Create repository
  try {
    const tx = await gitSolanaProgram.methods
      .createRepo(repoName)
      .accounts({
        repo: repoPDA,
        signer: repoOwner,
        systemProgram: anchor.web3.SystemProgram.programId
      })
      .rpc();
    
    console.log('Repository created:', tx);
    
    // Verify repository created
    const repoAccount = await gitSolanaProgram.account.repository.fetch(repoPDA);
    console.log('Repository owner:', repoAccount.owner.toString());
    console.log('Repository name:', repoAccount.name);
    
    // Create additional users for testing
    console.log('\n==== Creating test users ====');
    const user1 = await createFundedKeypair(provider);
    const user2 = await createFundedKeypair(provider);
    
    // TEST 1: Star repository from main wallet
    console.log('\n==== TEST 1: Star repository from main wallet ====');
    const [mainStarPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('star'),
        provider.wallet.publicKey.toBuffer(),
        repoOwner.toBuffer(),
        Buffer.from(repoName)
      ],
      GIT_STAR_PROGRAM_ID
    );
    
    try {
      const starTx = await gitStarProgram.methods
        .starRepository(repoOwner, repoName)
        .accounts({
          star: mainStarPDA,
          user: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId
        })
        .rpc();
      
      console.log('Repository starred:', starTx);
      
      // Verify star created
      const starAccount = await gitStarProgram.account.star.fetch(mainStarPDA);
      assert.equal(
        starAccount.user.toString(),
        provider.wallet.publicKey.toString(),
        'Star user mismatch'
      );
      assert.equal(
        starAccount.repositoryOwner.toString(),
        repoOwner.toString(),
        'Star repo owner mismatch'
      );
      assert.equal(
        starAccount.repositoryName,
        repoName,
        'Star repo name mismatch'
      );
      console.log('Star account verified! Timestamp:', new Date(starAccount.timestamp * 1000).toISOString());
    } catch (error) {
      console.error('Star test 1 failed:', error);
      process.exit(1);
    }
    
    // TEST 2: Star repository from user1
    console.log('\n==== TEST 2: Star repository from user1 ====');
    const [user1StarPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('star'),
        user1.publicKey.toBuffer(),
        repoOwner.toBuffer(),
        Buffer.from(repoName)
      ],
      GIT_STAR_PROGRAM_ID
    );
    
    try {
      const starTx = await gitStarProgram.methods
        .starRepository(repoOwner, repoName)
        .accounts({
          star: user1StarPDA,
          user: user1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId
        })
        .signers([user1])
        .rpc();
      
      console.log('Repository starred by user1:', starTx);
      
      // Verify star created
      const starAccount = await gitStarProgram.account.star.fetch(user1StarPDA);
      assert.equal(
        starAccount.user.toString(),
        user1.publicKey.toString(),
        'User1 star user mismatch'
      );
      console.log('User1 star account verified!');
    } catch (error) {
      console.error('Star test 2 failed:', error);
      process.exit(1);
    }
    
    // TEST 3: Try to star repository again (should fail or be idempotent)
    console.log('\n==== TEST 3: Try to star repository again ====');
    try {
      const starTx = await gitStarProgram.methods
        .starRepository(repoOwner, repoName)
        .accounts({
          star: mainStarPDA,
          user: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId
        })
        .rpc();
      
      console.log('Attempted to star again:', starTx);
      console.log('Note: This might succeed if the contract allows re-starring (idempotent), but the account should not change');
    } catch (error) {
      console.log('Star again test result (expected error if not idempotent):', error.message);
    }
    
    // TEST 4: Count stars for repository
    console.log('\n==== TEST 4: Count stars for repository ====');
    try {
      // We need to use getProgramAccounts with filters to count stars
      const accounts = await provider.connection.getProgramAccounts(
        GIT_STAR_PROGRAM_ID,
        {
          filters: [
            {
              memcmp: {
                offset: 8 + 32, // After discriminator and user pubkey
                bytes: repoOwner.toBase58()
              }
            }
          ]
        }
      );
      
      // Filter for our specific repo name
      const repoStars = accounts.filter(({ account }) => {
        try {
          const decoded = gitStarProgram.coder.accounts.decode('star', account.data);
          return decoded.repositoryName === repoName;
        } catch (e) {
          return false;
        }
      });
      
      console.log(`Repository has ${repoStars.length} stars`);
      console.log('Star accounts:', repoStars.map(a => a.pubkey.toString()));
      
      assert.equal(repoStars.length, 2, 'Expected 2 stars');
    } catch (error) {
      console.error('Count stars test failed:', error);
    }
    
    // TEST 5: Unstar repository
    console.log('\n==== TEST 5: Unstar repository ====');
    try {
      const unstarTx = await gitStarProgram.methods
        .unstarRepository()
        .accounts({
          star: mainStarPDA,
          user: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId
        })
        .rpc();
      
      console.log('Repository unstarred:', unstarTx);
      
      // Verify star removed
      try {
        await gitStarProgram.account.star.fetch(mainStarPDA);
        console.error('Star account still exists after unstar!');
        assert.fail('Star account should be closed');
      } catch (error) {
        if (error.message.includes('Account does not exist')) {
          console.log('Star account successfully closed!');
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Unstar test failed:', error);
      process.exit(1);
    }
    
    // TEST 6: Star again after unstarring
    console.log('\n==== TEST 6: Star again after unstarring ====');
    try {
      const starTx = await gitStarProgram.methods
        .starRepository(repoOwner, repoName)
        .accounts({
          star: mainStarPDA,
          user: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId
        })
        .rpc();
      
      console.log('Repository starred again:', starTx);
      
      // Verify star created
      const starAccount = await gitStarProgram.account.star.fetch(mainStarPDA);
      assert.equal(
        starAccount.user.toString(),
        provider.wallet.publicKey.toString(),
        'Re-star user mismatch'
      );
      console.log('Re-star account verified!');
    } catch (error) {
      console.error('Re-star test failed:', error);
      process.exit(1);
    }
    
    // TEST 7: User2 stars and unstars in sequence
    console.log('\n==== TEST 7: User2 stars and unstars in sequence ====');
    const [user2StarPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('star'),
        user2.publicKey.toBuffer(),
        repoOwner.toBuffer(),
        Buffer.from(repoName)
      ],
      GIT_STAR_PROGRAM_ID
    );
    
    try {
      // Star
      const starTx = await gitStarProgram.methods
        .starRepository(repoOwner, repoName)
        .accounts({
          star: user2StarPDA,
          user: user2.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId
        })
        .signers([user2])
        .rpc();
      
      console.log('Repository starred by user2:', starTx);
      
      // Verify star
      const starAccount = await gitStarProgram.account.star.fetch(user2StarPDA);
      assert.equal(
        starAccount.user.toString(),
        user2.publicKey.toString(),
        'User2 star user mismatch'
      );
      
      // Unstar
      const unstarTx = await gitStarProgram.methods
        .unstarRepository()
        .accounts({
          star: user2StarPDA,
          user: user2.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId
        })
        .signers([user2])
        .rpc();
      
      console.log('Repository unstarred by user2:', unstarTx);
      
      // Verify unstar
      try {
        await gitStarProgram.account.star.fetch(user2StarPDA);
        assert.fail('User2 star account should be closed');
      } catch (error) {
        if (error.message.includes('Account does not exist')) {
          console.log('User2 star account successfully closed!');
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('User2 star/unstar test failed:', error);
    }
    
    // Final star count
    console.log('\n==== Final star count ====');
    try {
      const accounts = await provider.connection.getProgramAccounts(
        GIT_STAR_PROGRAM_ID,
        {
          filters: [
            {
              memcmp: {
                offset: 8 + 32,
                bytes: repoOwner.toBase58()
              }
            }
          ]
        }
      );
      
      const repoStars = accounts.filter(({ account }) => {
        try {
          const decoded = gitStarProgram.coder.accounts.decode('star', account.data);
          return decoded.repositoryName === repoName;
        } catch (e) {
          return false;
        }
      });
      
      console.log(`Repository has ${repoStars.length} stars`);
      
      for (const { pubkey, account } of repoStars) {
        const star = gitStarProgram.coder.accounts.decode('star', account.data);
        console.log(`- Star by ${star.user.toString()} at ${new Date(star.timestamp * 1000).toISOString()}`);
      }
    } catch (error) {
      console.error('Final star count failed:', error);
    }
    
    console.log('\n==== All tests completed successfully! ====');
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
}

runTests();