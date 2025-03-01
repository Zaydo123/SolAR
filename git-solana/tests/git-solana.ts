import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GitSolana } from "../target/types/git_solana";

describe("git-solana", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.GitSolana as Program<GitSolana>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
