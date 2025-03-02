# Git Star Solana Program

A Solana smart contract that enables GitHub-like "starring" functionality for git repositories on SolAR.

## Overview

The `git-star` program is a companion to the `git-solana` program that allows users to star repositories they find interesting or want to bookmark. This adds social features to decentralized git repositories on Solana.

## Features

- **Star repositories**: Users can star repositories they like
- **Unstar repositories**: Users can remove stars from repositories
- **Star counts**: Repository owners can see how many users have starred their repositories
- **Starred repositories**: Users can list all repositories they have starred

## Account Structure

Each star is represented as a Program Derived Address (PDA) with the following seeds:
- `"star"` (constant string)
- User's public key
- Repository owner's public key
- Repository name

## Data Model

Each star account contains:
- `user`: The public key of the user who starred the repository
- `repository_owner`: The public key of the repository owner
- `repository_name`: The name of the repository
- `timestamp`: When the star was created

## Instructions

### `star_repository`

Stars a repository.

**Parameters:**
- `repository_owner`: Public key of the repository owner
- `repository_name`: Name of the repository

**Accounts:**
- `star`: The PDA for this star
- `user`: The signer who is starring the repository
- `system_program`: The Solana System Program

### `unstar_repository`

Removes a star from a repository.

**Accounts:**
- `star`: The PDA for this star (which will be closed)
- `user`: The signer who is unstarring the repository (and will receive the lamports from the closed account)
- `system_program`: The Solana System Program

### `list_repository_stars`

A marker instruction for client-side fetching of stars.

**Parameters:**
- `limit`: Maximum number of stars to return

## Events

The program emits `StarEvent` events when repositories are starred or unstarred:

```rust
#[event]
pub struct StarEvent {
    pub user: Pubkey,
    pub repository_owner: Pubkey,
    pub repository_name: String,
    pub action: String, // "star" or "unstar"
}
```

## Integration with SolAR Git Server

The git-star program integrates with the SolAR Git Server through the following API endpoints:

- `POST /api/repos/:owner/:repo/star`: Star a repository
- `DELETE /api/repos/:owner/:repo/star`: Unstar a repository
- `GET /api/repos/:owner/:repo/stars`: Get all stars for a repository
- `GET /api/user/starred`: Get all repositories starred by a user

## Development

### Prerequisites

- Rust and Cargo
- Solana CLI
- Anchor Framework

### Building and Testing

```bash
# Build the program
anchor build

# Run tests
anchor test
```

## License

This project is licensed under the MIT License.