# SolAR Explorer API

Backend API for the SolAR Explorer website, providing repository data from Solana blockchain and content downloads from Arweave.

## Current Status

Most features have been implemented with mock data. The server currently operates in mock mode for repository data due to issues with Anchor IDL files, but all other functionality (authentication, search, activity tracking) is fully functional.

## Integrated Frontend + Backend Setup

This repository now includes integration with the SolAR Explorer frontend. Follow these steps to set up both the frontend and backend:

### Manual Setup

1. Install backend dependencies:
```bash
npm install
```

2. Fix the IDL error by modifying the GitStarClient.js file to handle errors gracefully (already done)

3. Run the server in development mode to make sure it works:
```bash
npm run dev
```

4. In a separate terminal, build the frontend:
```bash
cd /Users/shauryaiyer/SolAR/SolAR/website/SolARexplorer_bundle
npm install
npm run build
```

5. Create a public directory in the server folder:
```bash
mkdir -p /Users/shauryaiyer/SolAR/SolAR/git-solana/server/public
```

6. Copy the built frontend to the server's public directory:
```bash
cp -r /Users/shauryaiyer/SolAR/SolAR/website/SolARexplorer_bundle/build/* /Users/shauryaiyer/SolAR/SolAR/git-solana/server/public/
```

7. Start the server:
```bash
cd /Users/shauryaiyer/SolAR/SolAR/git-solana/server
npm start
```

8. Open your browser and navigate to `http://localhost:3002` to see the SolAR Explorer website.

### Development Mode

For development, you can run:

```bash
npm run dev
```

This will start the server with nodemon, which automatically restarts when you make changes to the code.

## Available Features

1. **Authentication & Authorization**
   - Solana wallet-based authentication
   - JWT token generation and validation
   - User profile management

2. **Repository Management**
   - List repositories with filtering and pagination
   - Repository details with metadata and branches
   - Star counts and history
   - Collaborator management

3. **Search Functionality**
   - Repository search with advanced filters
   - Code search within repositories 
   - Relevance sorting and filtering

4. **Activity Feed & Events**
   - Global, repository-specific, and user-specific activity feeds
   - Activity tracking for stars, branches, collaborators
   - Activity timeline with pagination

5. **Content Download**
   - Download repository content from Arweave
   - Support multiple formats (raw, ZIP, TAR, TAR.GZ)
   - Branch-specific downloads

6. **Analytics**
   - Trending repositories
   - Star history charts
   - Repository metrics

## Installation and Testing

```bash
# Install dependencies
npm install

# Start the server in development mode
npm run dev

# Test the API endpoints
```

## API Endpoints

### Authentication Endpoints

#### Get Authentication Nonce
```
GET /api/auth/nonce
```
Returns a nonce for signing with Solana wallet

#### Authenticate with Signed Message
```
POST /api/auth/auth
```
Body:
```json
{
  "publicKey": "FZL8PK74v3kYDVF6YunpMZZrxsJamGJZQHtYxRDfqdJU",
  "signature": "base58_encoded_signature",
  "nonce": "123456"
}
```

#### Get Current User Profile
```
GET /api/auth/user
```
Requires Authorization header with JWT token

#### Update User Profile
```
PUT /api/auth/user
```
Body:
```json
{
  "username": "newUsername"
}
```
Requires Authorization header with JWT token

### Search Endpoints

#### Search Repositories
```
GET /api/search/repositories
```

Query parameters:
- `q`: Search term
- `language`: Filter by programming language
- `min_stars`: Minimum star count
- `created_after`: ISO date string
- `sort`: Sort by "stars", "updated", "created" or "relevance" 
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 10)

#### Search Code
```
GET /api/search/code
```

Query parameters:
- `q`: Search term (required)
- `repo`: Filter by repository (owner/name)
- `language`: Filter by programming language
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 10)

### Activity Endpoints

#### Global Activity Feed
```
GET /api/activity
```

Query parameters:
- `type`: Filter by activity type
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20)

#### Repository Activity Feed
```
GET /api/activity/repositories/:owner/:name
```

Query parameters:
- `type`: Filter by activity type
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20)

#### User Activity Feed
```
GET /api/activity/users/:publicKey
```

Query parameters:
- `type`: Filter by activity type
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20)

#### Record New Activity
```
POST /api/activity
```

Body:
```json
{
  "type": "star_repository",
  "repository": {
    "owner": "FZL8PK74v3kYDVF6YunpMZZrxsJamGJZQHtYxRDfqdJU",
    "name": "example-repo-1"
  },
  "details": {
    "star_count": 43
  }
}
```
Requires Authorization header with JWT token

### Repository Endpoints (Mock Mode)

#### List Repositories
```
GET /api/mock/repositories
```

Query parameters:
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 10)

#### Get Repository Details
```
GET /api/mock/repositories/:owner/:name
```

#### Get Repository Star History
```
GET /api/mock/repositories/:owner/:name/stars/history
```

#### Download Repository Content
```
GET /api/mock/repositories/:owner/:name/download
```

Query parameters:
- `branch`: Branch to download (default: main)
- `format`: Download format (raw, zip, tar, tar.gz)

#### Trending Repositories
```
GET /api/trending
```

Query parameters:
- `period`: Time period (day, week, month)
- `language`: Filter by programming language
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 10)

## Environment Variables

- `PORT`: Server port (default: 3002)
- `SOLANA_RPC_URL`: URL of the Solana RPC node (default: 'http://localhost:8899')
- `JWT_SECRET`: Secret for JWT token generation (default: development secret, change in production)
- `JWT_EXPIRES_IN`: JWT token expiration time (default: '24h')

## Integration with Frontend

The API is fully compatible with the expected structure for the SolAR Explorer website. The frontend can:

1. Use Solana wallet authentication for user login
2. List and search repositories with advanced filters
3. Display activity feeds for repositories and users
4. Show analytics and trending repositories
5. Download repository content in various formats

## Requirements

- Node.js 14+
- For full functionality (coming soon):
  - Access to a Solana RPC node
  - Access to Arweave gateway

## Troubleshooting

If you encounter the error `listen EADDRINUSE: address already in use :::3002`:

```bash
# Find the process using port 3002
lsof -i :3002

# Kill the process
kill -9 [PID]

# Restart the server
npm run dev
```