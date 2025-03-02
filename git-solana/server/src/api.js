const express = require('express');
const { Connection } = require('@solana/web3.js');
const cors = require('cors');
const GitStarClient = require('./utils/gitStarClient');
const ArweaveClient = require('./utils/arweaveClient');

const router = express.Router();

// Initialize clients
const solanaRpcUrl = process.env.SOLANA_RPC_URL || 'http://localhost:8899';
const connection = new Connection(solanaRpcUrl);
const gitStarClient = new GitStarClient(connection);
const arweaveClient = new ArweaveClient();

// Enable CORS
router.use(cors());
router.use(express.json());

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ===== Repository Endpoints =====

/**
 * List all repositories
 * 
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 10)
 * - owner: Filter by owner public key (optional)
 * - sortBy: Field to sort by (default: 'stars')
 * - sortDir: Sort direction 'asc' or 'desc' (default: 'desc')
 */
router.get('/repositories', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const filters = {};
    if (req.query.owner) {
      filters.owner = req.query.owner;
    }
    
    const result = await gitStarClient.listRepositories(filters, page, limit);
    
    // Sort repositories (default: by stars)
    const sortBy = req.query.sortBy || 'stars';
    const sortDir = req.query.sortDir || 'desc';
    
    result.repositories.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'stars':
          comparison = a.stars - b.stars;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'branches':
          comparison = a.branches.length - b.branches.length;
          break;
        default:
          comparison = a.stars - b.stars;
      }
      
      return sortDir === 'asc' ? comparison : -comparison;
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error listing repositories:', error);
    res.status(500).json({ error: 'Failed to list repositories' });
  }
});

/**
 * Get repository details
 */
router.get('/repositories/:owner/:name', async (req, res) => {
  try {
    const { owner, name } = req.params;
    const repoDetails = await gitStarClient.getRepositoryDetails(owner, name);
    res.json(repoDetails);
  } catch (error) {
    console.error(`Error fetching repository ${req.params.owner}/${req.params.name}:`, error);
    res.status(404).json({ error: 'Repository not found' });
  }
});

/**
 * Get repository stargazers
 */
router.get('/repositories/:owner/:name/stars', async (req, res) => {
  try {
    const { owner, name } = req.params;
    const stargazers = await gitStarClient.getRepositoryStargazers(owner, name);
    res.json(stargazers);
  } catch (error) {
    console.error(`Error fetching stargazers for ${req.params.owner}/${req.params.name}:`, error);
    res.status(500).json({ error: 'Failed to fetch stargazers' });
  }
});

/**
 * Check if repository is starred by user
 */
router.get('/repositories/:owner/:name/starred/:userAddress', async (req, res) => {
  try {
    const { owner, name, userAddress } = req.params;
    const isStarred = await gitStarClient.isRepositoryStarred(userAddress, owner, name);
    res.json({ isStarred });
  } catch (error) {
    console.error(`Error checking star status:`, error);
    res.status(500).json({ error: 'Failed to check star status' });
  }
});

// ===== Download Endpoints =====

/**
 * Download repository content
 * 
 * Query parameters:
 * - branch: Branch to download (default: main)
 * - format: Download format (raw, zip, tar, tar.gz)
 */
router.get('/repositories/:owner/:name/download', async (req, res) => {
  try {
    const { owner, name } = req.params;
    const branch = req.query.branch || 'main';
    const format = req.query.format || 'raw';
    
    // Get repository details
    const repoDetails = await gitStarClient.getRepositoryDetails(owner, name);
    
    // Find the branch
    const targetBranch = repoDetails.branches.find(b => b.name === branch);
    if (!targetBranch) {
      return res.status(404).json({ error: `Branch '${branch}' not found` });
    }
    
    // Get the Arweave transaction ID
    const arweaveTx = targetBranch.arweave_tx;
    if (!arweaveTx) {
      return res.status(404).json({ error: 'No content available for this branch' });
    }
    
    // Download from Arweave
    const data = await arweaveClient.downloadRepository(arweaveTx, { format });
    
    // Set appropriate headers
    let contentType = 'application/octet-stream';
    let filename = `${name}-${branch}`;
    
    switch (format.toLowerCase()) {
      case 'zip':
        contentType = 'application/zip';
        filename += '.zip';
        break;
      case 'tar':
        contentType = 'application/x-tar';
        filename += '.tar';
        break;
      case 'tar.gz':
      case 'tgz':
        contentType = 'application/gzip';
        filename += '.tar.gz';
        break;
      default:
        contentType = 'application/octet-stream';
        filename += '.git';
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  } catch (error) {
    console.error(`Error downloading repository:`, error);
    res.status(500).json({ error: 'Failed to download repository' });
  }
});

// ===== Mock Data Endpoints =====

/**
 * Get mock repositories (for development when blockchain is not available)
 */
router.get('/mock/repositories', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  const mockRepos = [];
  
  // Generate 30 mock repositories
  for (let i = 1; i <= 30; i++) {
    mockRepos.push({
      id: `repo-${i}`,
      name: `example-repo-${i}`,
      owner: `FZL8PK74v3kYDVF6YunpMZZrxsJamGJZQHtYxRDfqdJU`,
      collaborators: [
        `FZL8PK74v3kYDVF6YunpMZZrxsJamGJZQHtYxRDfqdJU`,
        `5TQo5Bf6yXp9uywEFbp9YKUyveD2pe2LVXRjY2aWRup5`
      ],
      branches: [
        {
          name: 'main',
          commit_hash: `commit-${i}-1`,
          arweave_tx: `mock-arweave-tx-${i}-1`
        },
        {
          name: 'dev',
          commit_hash: `commit-${i}-2`,
          arweave_tx: `mock-arweave-tx-${i}-2`
        }
      ],
      stars: Math.floor(Math.random() * 100)
    });
  }
  
  // Paginate the results
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedRepos = mockRepos.slice(startIndex, endIndex);
  
  res.json({
    repositories: paginatedRepos,
    pagination: {
      total: mockRepos.length,
      page,
      limit,
      pages: Math.ceil(mockRepos.length / limit)
    }
  });
});

/**
 * Get mock repository details (for development)
 */
router.get('/mock/repositories/:owner/:name', (req, res) => {
  const { owner, name } = req.params;
  
  res.json({
    id: `mock-repo-${name}`,
    name,
    owner,
    collaborators: [
      owner,
      '5TQo5Bf6yXp9uywEFbp9YKUyveD2pe2LVXRjY2aWRup5'
    ],
    branches: [
      {
        name: 'main',
        commit_hash: 'a1b2c3d4e5f6',
        arweave_tx: 'mock-arweave-tx-main'
      },
      {
        name: 'dev',
        commit_hash: 'f6e5d4c3b2a1',
        arweave_tx: 'mock-arweave-tx-dev'
      },
      {
        name: 'feature/new-feature',
        commit_hash: '1a2b3c4d5e6f',
        arweave_tx: 'mock-arweave-tx-feature'
      }
    ],
    stars: 42,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
});

/**
 * Mock download endpoint
 */
router.get('/mock/repositories/:owner/:name/download', (req, res) => {
  const { name } = req.params;
  const format = req.query.format || 'raw';
  const branch = req.query.branch || 'main';
  
  // Create a simple text file as mock content
  let content = Buffer.from(`This is mock content for ${name} branch ${branch}`);
  let contentType = 'text/plain';
  let filename = `${name}-${branch}.txt`;
  
  // Set appropriate headers
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(content);
});

module.exports = router;