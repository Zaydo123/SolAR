use anchor_lang::prelude::*;

declare_id!("4j5b45kn4bbQGt4fbFfwuMqLFDetSnAyEbmVgx5RBdJk");

#[program]
pub mod git_solana {
    use super::*;

    pub fn create_repo(ctx: Context<CreateRepo>, name: String) -> Result<()> {
        let repo = &mut ctx.accounts.repo;
        repo.owner = *ctx.accounts.signer.key;
        repo.name = name;
        repo.collaborators.push(*ctx.accounts.signer.key); // ✅ Use .push() instead of .insert()
        Ok(())
    }
    
    pub fn add_collaborator(ctx: Context<ModifyRepo>, new_collaborator: Pubkey) -> Result<()> {
        let repo = &mut ctx.accounts.repo;
        require!(repo.owner == *ctx.accounts.owner.key, GitError::Unauthorized);
        repo.collaborators.push(new_collaborator); // ✅ Use .push() instead of .insert()
        Ok(())
    }
        
}

#[derive(Accounts)]
pub struct CreateRepo<'info> {
    #[account(init, payer = signer, space = 9000)]
    pub repo: Account<'info, Repository>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ModifyRepo<'info> {
    #[account(mut, has_one = owner)]
    pub repo: Account<'info, Repository>,
    #[account(mut)]
    pub owner: Signer<'info>, // ✅ Ensure owner is mutable (fixes errors)
}

#[account]
pub struct Repository {
    pub owner: Pubkey,
    pub name: String,
    pub collaborators: Vec<Pubkey>, // ✅ Change to Vec instead of BTreeMap
    pub branches: Vec<Branch>, // ✅ Store branches as a vector of structs
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Branch {
    pub name: String,
    pub commit: CommitReference,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CommitReference {
    pub commit_hash: String,
    pub arweave_tx: String,
}

#[error_code]
pub enum GitError {
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,
}
