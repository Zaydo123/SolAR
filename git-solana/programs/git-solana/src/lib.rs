use anchor_lang::prelude::*;

declare_id!("5TQo5Bf6yXp9uywEFbp9YKUyveD2pe2LVXRjY2aWRup5");

#[program]
pub mod git_solana {
    use super::*;

    pub fn create_repo(ctx: Context<CreateRepo>, name: String) -> Result<()> {
        let repo = &mut ctx.accounts.repo;
        repo.owner = *ctx.accounts.signer.key;
        repo.name = name;
        // Automatically add the owner as the first collaborator.
        repo.collaborators.push(*ctx.accounts.signer.key);
        Ok(())
    }
    
    pub fn add_collaborator(ctx: Context<ModifyRepo>, new_collaborator: Pubkey) -> Result<()> {
        let repo = &mut ctx.accounts.repo;
        // Only the owner may add collaborators.
        require!(repo.owner == *ctx.accounts.owner.key, GitError::Unauthorized);
        repo.collaborators.push(new_collaborator);
        Ok(())
    }
    
    /// Updates a branch pointer (commit_hash and arweave_tx) for a given branch.
    /// Authorized signers are either the repo owner or one of the collaborators.
    pub fn update_branch(
        ctx: Context<UpdateBranch>, 
        branch_name: String, 
        commit_hash: String, 
        arweave_tx: String
    ) -> Result<()> {
        let repo = &mut ctx.accounts.repo;
        let signer_key = *ctx.accounts.signer.key;
        // Check that the signer is the owner or a collaborator.
        require!(
            repo.owner == signer_key || repo.collaborators.contains(&signer_key),
            GitError::Unauthorized
        );
        // Look for the branch and update if it exists.
        let mut branch_found = false;
        for branch in repo.branches.iter_mut() {
            if branch.name == branch_name {
                branch.commit.commit_hash = commit_hash.clone();
                branch.commit.arweave_tx = arweave_tx.clone();
                branch_found = true;
                break;
            }
        }
        // If the branch doesn't exist, create a new branch entry.
        if !branch_found {
            let new_branch = Branch {
                name: branch_name,
                commit: CommitReference {
                    commit_hash,
                    arweave_tx,
                },
            };
            repo.branches.push(new_branch);
        }
        Ok(())
    }
    
    /// Allows the owner to update repository metadata (e.g. the repository name).
    pub fn update_repo(ctx: Context<UpdateRepo>, new_name: Option<String>) -> Result<()> {
        let repo = &mut ctx.accounts.repo;
        require!(repo.owner == *ctx.accounts.owner.key, GitError::Unauthorized);
        if let Some(name) = new_name {
            repo.name = name;
        }
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateRepo<'info> {
    #[account(
        init,
        payer = signer,
        space = 9000,
        seeds = [b"repository", signer.key().as_ref(), name.as_bytes()],
        bump
    )]
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
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateBranch<'info> {
    #[account(mut)]
    pub repo: Account<'info, Repository>,
    #[account(mut)]
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateRepo<'info> {
    #[account(mut, has_one = owner)]
    pub repo: Account<'info, Repository>,
    #[account(mut)]
    pub owner: Signer<'info>,
}

#[account]
pub struct Repository {
    pub owner: Pubkey,
    pub name: String,
    pub collaborators: Vec<Pubkey>,
    pub branches: Vec<Branch>,
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
