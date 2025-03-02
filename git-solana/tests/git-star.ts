import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { assert } from "chai";
import { GitStar } from "../target/types/git_star";
import { GitSolana } from "../target/types/git_solana";

describe("git-star", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.getProvider();
  const starProgram = anchor.workspace.GitStar as Program<GitStar>;
  const gitProgram = anchor.workspace.GitSolana as Program<GitSolana>;
  
  const testRepoName = "test-repo";
  let testRepoOwner: PublicKey;
  let testRepoPDA: PublicKey;
  
  // Create a secondary keypair for testing starring from different users
  const secondUser = anchor.web3.Keypair.generate();
  
  // Setup: Create a test repository in git-solana
  before(async () => {
    testRepoOwner = provider.publicKey;
    
    // Fund the second user
    const airdropSignature = await provider.connection.requestAirdrop(
      secondUser.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSignature);
    
    // First create a repository in the git-solana program
    const [repoPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("repository"),
        testRepoOwner.toBuffer(),
        Buffer.from(testRepoName),
      ],
      gitProgram.programId
    );
    testRepoPDA = repoPDA;
    
    try {
      await gitProgram.methods
        .createRepo(testRepoName)
        .accounts({
          repo: repoPDA,
          signer: testRepoOwner,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
        
      console.log("Created test repository:", testRepoName);
    } catch (error) {
      console.error("Error creating repository:", error);
      throw error;
    }
  });
  
  it("Can star a repository", async () => {
    const [starPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("star"),
        provider.publicKey.toBuffer(),
        testRepoOwner.toBuffer(),
        Buffer.from(testRepoName),
      ],
      starProgram.programId
    );
    
    try {
      // Star the repository
      await starProgram.methods
        .starRepository(testRepoOwner, testRepoName)
        .accounts({
          star: starPDA,
          user: provider.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
        
      // Fetch the star account to verify
      const starAccount = await starProgram.account.star.fetch(starPDA);
      
      assert.equal(
        starAccount.user.toString(),
        provider.publicKey.toString(),
        "Star user doesn't match"
      );
      assert.equal(
        starAccount.repositoryOwner.toString(),
        testRepoOwner.toString(),
        "Repository owner doesn't match"
      );
      assert.equal(
        starAccount.repositoryName,
        testRepoName,
        "Repository name doesn't match"
      );
    } catch (error) {
      console.error("Error starring repository:", error);
      throw error;
    }
  });
  
  it("Can unstar a repository", async () => {
    const [starPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("star"),
        provider.publicKey.toBuffer(),
        testRepoOwner.toBuffer(),
        Buffer.from(testRepoName),
      ],
      starProgram.programId
    );
    
    try {
      // Unstar the repository
      await starProgram.methods
        .unstarRepository()
        .accounts({
          star: starPDA,
          user: provider.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
        
      // Try to fetch the star account - it should be closed
      try {
        await starProgram.account.star.fetch(starPDA);
        assert.fail("Star account should be closed");
      } catch (error) {
        // Expected error - account doesn't exist
        assert.include(
          error.toString(),
          "Account does not exist",
          "Expected account to be closed"
        );
      }
    } catch (error) {
      console.error("Error unstarring repository:", error);
      throw error;
    }
  });
  
  it("Multiple users can star the same repository", async () => {
    // First user stars the repo again
    const [starPDA1] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("star"),
        provider.publicKey.toBuffer(),
        testRepoOwner.toBuffer(),
        Buffer.from(testRepoName),
      ],
      starProgram.programId
    );
    
    // Second user stars the repo
    const [starPDA2] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("star"),
        secondUser.publicKey.toBuffer(),
        testRepoOwner.toBuffer(),
        Buffer.from(testRepoName),
      ],
      starProgram.programId
    );
    
    try {
      // First user stars
      await starProgram.methods
        .starRepository(testRepoOwner, testRepoName)
        .accounts({
          star: starPDA1,
          user: provider.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      
      // Second user stars
      await starProgram.methods
        .starRepository(testRepoOwner, testRepoName)
        .accounts({
          star: starPDA2,
          user: secondUser.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([secondUser])
        .rpc();
        
      // Verify both star accounts exist
      const starAccount1 = await starProgram.account.star.fetch(starPDA1);
      const starAccount2 = await starProgram.account.star.fetch(starPDA2);
      
      assert.equal(
        starAccount1.user.toString(),
        provider.publicKey.toString(),
        "First star user doesn't match"
      );
      
      assert.equal(
        starAccount2.user.toString(),
        secondUser.publicKey.toString(),
        "Second star user doesn't match"
      );
    } catch (error) {
      console.error("Error in multiple users star test:", error);
      throw error;
    }
  });
});