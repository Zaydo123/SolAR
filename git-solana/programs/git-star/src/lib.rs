use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;

declare_id!("Bzw6oj1rwP151twodztcsoizGEXc13kxbsa8qvzPoCDn");

#[program]
pub mod git_star {
    use super::*;

    pub fn star_repository(
        ctx: Context<StarRepository>,
        repository_owner: Pubkey,
        repository_name: String,
    ) -> Result<()> {
        let star = &mut ctx.accounts.star;
        star.user = *ctx.accounts.user.key;
        star.repository_owner = repository_owner;
        star.repository_name = repository_name.clone();
        star.timestamp = Clock::get()?.unix_timestamp;
        
        // Emit an event for this star action
        emit!(StarEvent {
            user: *ctx.accounts.user.key,
            repository_owner,
            repository_name,
            action: "star".to_string(),
        });
        
        Ok(())
    }

    pub fn unstar_repository(ctx: Context<UnstarRepository>) -> Result<()> {
        // The account is automatically closed by the UnstarRepository context
        
        // Emit an event for this unstar action
        emit!(StarEvent {
            user: *ctx.accounts.user.key,
            repository_owner: ctx.accounts.star.repository_owner,
            repository_name: ctx.accounts.star.repository_name.clone(),
            action: "unstar".to_string(),
        });
        
        Ok(())
    }
    
    pub fn list_repository_stars(_ctx: Context<GetStars>, _limit: u8) -> Result<()> {
        // This instruction doesn't modify any state,
        // it's just used to fetch data on the client side
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(repository_owner: Pubkey, repository_name: String)]
pub struct StarRepository<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 32 + 200 + 8, // discriminator + user pubkey + repo owner pubkey + repo name + timestamp
        seeds = [
            b"star",
            user.key().as_ref(),
            repository_owner.as_ref(),
            repository_name.as_bytes()
        ],
        bump,
    )]
    pub star: Account<'info, Star>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UnstarRepository<'info> {
    #[account(
        mut,
        close = user,
        has_one = user,
        seeds = [
            b"star",
            user.key().as_ref(),
            star.repository_owner.as_ref(),
            star.repository_name.as_bytes()
        ],
        bump,
    )]
    pub star: Account<'info, Star>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GetStars {
    // No accounts needed, filtering happens off-chain
    // This instruction is just a marker for clients
}

#[account]
pub struct Star {
    pub user: Pubkey,
    pub repository_owner: Pubkey,
    pub repository_name: String,
    pub timestamp: i64,
}

#[event]
pub struct StarEvent {
    pub user: Pubkey,
    pub repository_owner: Pubkey,
    pub repository_name: String,
    pub action: String, // "star" or "unstar"
}