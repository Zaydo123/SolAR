const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./auth').router;
const searchRoutes = require('./search');
const activityRoutes = require('./activity');
const apiRoutes = require('./api');

const app = express();
const PORT = process.env.PORT || 3002; // Use port 3002 to avoid conflicts

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Setup main API routes
app.use('/api/auth', authRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api', apiRoutes);

// Set up mock repository routes (until Solana integration is fixed)
const mockRouter = express.Router();
setupMockRoutes(mockRouter);
app.use('/api', mockRouter);

// Mount the API routes file directly if needed
// app.use('/api', apiRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'SolAR Explorer API',
    version: '1.0.0',
    endpoints: {
      // Authentication
      auth: {
        getNonce: '/api/auth/nonce',
        authenticate: '/api/auth/auth',
        getProfile: '/api/auth/user',
        updateProfile: '/api/auth/user (PUT)'
      },
      // Search
      search: {
        repositories: '/api/search/repositories?q=search_term',
        code: '/api/search/code?q=search_term'
      },
      // Activity
      activity: {
        global: '/api/activity',
        repository: '/api/activity/repositories/:owner/:name',
        user: '/api/activity/users/:publicKey',
        record: '/api/activity (POST)'
      },
      // Repository mock routes
      repositories: {
        list: '/api/mock/repositories',
        details: '/api/mock/repositories/:owner/:name',
        download: '/api/mock/repositories/:owner/:name/download'
      }
    }
  });
});

// Serve static files from public directory (where the frontend build will be)
app.use(express.static(path.join(__dirname, '../public')));

// Catch-all route to serve the frontend React app
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`SolAR Explorer API running on port ${PORT}`);
  console.log(`API documentation available at http://localhost:${PORT}`);
  console.log(`Frontend will be served at http://localhost:${PORT} if built`);
  console.log(`Note: Update the frontend API_BASE_URL to point to http://localhost:${PORT}/api if you changed ports`);
});

/**
 * Setup mock routes for testing without Solana/Arweave dependencies
 */
function setupMockRoutes(router) {
  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  /**
   * Get trending repositories
   */
  router.get('/trending', (req, res) => {
    const { period = 'week', language, page = 1, limit = 10 } = req.query;
    
    const mockRepos = [];
    
    // Generate 30 mock trending repositories
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
                          
      // Only include if no language filter or language matches
      if (!language || repoLanguage.toLowerCase() === language.toLowerCase()) {
        mockRepos.push({
          id: `repo-${i}`,
          name: repoName,
          owner: `FZL8PK74v3kYDVF6YunpMZZrxsJamGJZQHtYxRDfqdJU`,
          language: repoLanguage,
          description: `This is a ${repoLanguage} project for demonstrating SolAR Explorer capabilities`,
          stars: Math.floor(Math.random() * 200),
          star_count_period: Math.floor(Math.random() * 50), // Stars gained in this period
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
          ]
        });
      }
    }
    
    // Sort by stars gained in the period
    mockRepos.sort((a, b) => b.star_count_period - a.star_count_period);
    
    // Paginate the results
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedRepos = mockRepos.slice(startIndex, endIndex);
    
    res.json({
      trending_repositories: paginatedRepos,
      period,
      language: language || null,
      pagination: {
        total: mockRepos.length,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(mockRepos.length / limitNum)
      }
    });
  });
  
  /**
   * Get mock repositories (for development when blockchain is not available)
   */
  router.get('/mock/repositories', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const mockRepos = [];
    
    // Generate 30 mock repositories
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
        address: `0x${Math.random().toString(16).slice(2, 12)}`, // Add address field needed by frontend
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
            date: createdAt.toISOString() // Add date for frontend
          },
          {
            name: 'dev',
            commit_hash: `commit-${i}-2`,
            arweave_tx: `mock-arweave-tx-${i}-2`,
            date: updatedAt.toISOString() // Add date for frontend
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
    
    const repoLanguage = name.includes('solar') ? 'TypeScript' :
                       name.includes('blockchain') ? 'JavaScript' :
                       name.includes('defi') ? 'Solidity' :
                       'Rust';
    
    res.json({
      id: `mock-repo-${name}`,
      name,
      owner,
      address: `0x${Math.random().toString(16).slice(2, 12)}`, // Add address field needed by frontend
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
          date: new Date(Date.now() - 5000000000).toISOString() // Add date for frontend
        },
        {
          name: 'dev',
          commit_hash: 'f6e5d4c3b2a1',
          arweave_tx: 'mock-arweave-tx-dev',
          date: new Date(Date.now() - 3000000000).toISOString() // Add date for frontend
        },
        {
          name: 'feature/new-feature',
          commit_hash: '1a2b3c4d5e6f',
          arweave_tx: 'mock-arweave-tx-feature',
          date: new Date(Date.now() - 1000000000).toISOString() // Add date for frontend
        }
      ],
      stars: 42,
      created_at: new Date(Date.now() - 5000000000).toISOString(),
      updated_at: new Date().toISOString()
    });
  });

  /**
   * Get repository star history
   */
  router.get('/mock/repositories/:owner/:name/stars/history', (req, res) => {
    const { owner, name } = req.params;
    
    // Generate mock star history data (last 30 days)
    const starHistory = [];
    let currentStars = 42; // End with current star count
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Stars generally increase over time with some fluctuation
      if (i > 0) {
        const starsChange = Math.floor(Math.random() * 3);
        currentStars = Math.max(0, currentStars - starsChange);
      }
      
      starHistory.push({
        date: date.toISOString().split('T')[0],
        stars: currentStars
      });
    }
    
    res.json({
      repository: {
        owner,
        name
      },
      star_history: starHistory
    });
  });

  /**
   * Mock download endpoint
   */
  router.get('/mock/repositories/:owner/:name/download', (req, res) => {
    const { name } = req.params;
    const format = req.query.format || 'raw';
    const branch = req.query.branch || 'main';
    
    // Create a mock content based on format
    let content, contentType, filename;
    
    switch (format.toLowerCase()) {
      case 'zip':
        // Simple mock ZIP file (not actually a valid ZIP)
        content = Buffer.from(`Mock ZIP content for ${name} branch ${branch}`);
        contentType = 'application/zip';
        filename = `${name}-${branch}.zip`;
        break;
      case 'tar':
        // Simple mock TAR file (not actually a valid TAR)
        content = Buffer.from(`Mock TAR content for ${name} branch ${branch}`);
        contentType = 'application/x-tar';
        filename = `${name}-${branch}.tar`;
        break;
      case 'tar.gz':
        // Simple mock TAR.GZ file (not actually a valid TAR.GZ)
        content = Buffer.from(`Mock TAR.GZ content for ${name} branch ${branch}`);
        contentType = 'application/gzip';
        filename = `${name}-${branch}.tar.gz`;
        break;
      default:
        // Raw format (just a text file)
        content = Buffer.from(`This is mock content for ${name} branch ${branch}`);
        contentType = 'text/plain';
        filename = `${name}-${branch}.txt`;
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  });
  
  // APIs for starring and checking star status - updated for frontend compatibility
  router.get('/repositories/:owner/:name/starred/:userAddress', (req, res) => {
    const { owner, name, userAddress } = req.params;
    
    // For mock implementation, return a random boolean with higher chance of true
    const isStarred = Math.random() > 0.3;
    
    res.json({ isStarred });
  });
  
  router.post('/repositories/:owner/:name/star', (req, res) => {
    const { owner, name } = req.params;
    // The frontend sends the wallet as wallet parameter in the body
    const userAddress = req.body.wallet || req.body.userAddress;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User address is required' });
    }
    
    res.json({ 
      success: true, 
      message: `Repository ${owner}/${name} starred by ${userAddress}`,
      star_count: Math.floor(Math.random() * 100) + 1
    });
  });
  
  router.post('/repositories/:owner/:name/unstar', (req, res) => {
    const { owner, name } = req.params;
    // The frontend sends the wallet as wallet parameter in the body
    const userAddress = req.body.wallet || req.body.userAddress;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User address is required' });
    }
    
    res.json({ 
      success: true, 
      message: `Repository ${owner}/${name} unstarred by ${userAddress}`,
      star_count: Math.floor(Math.random() * 100)
    });
  });
  
  // To maintain compatibility with the original API routes
  router.get('/repositories', (req, res) => {
    res.redirect('/api/mock/repositories');
  });
  
  router.get('/repositories/:owner/:name', (req, res) => {
    const { owner, name } = req.params;
    res.redirect(`/api/mock/repositories/${owner}/${name}`);
  });
  
  router.get('/repositories/:owner/:name/download', (req, res) => {
    const { owner, name } = req.params;
    const branch = req.query.branch || 'main';
    const format = req.query.format || 'raw';
    res.redirect(`/api/mock/repositories/${owner}/${name}/download?branch=${branch}&format=${format}`);
  });
  
  // Add missing endpoints required by the frontend
  
  // Get repository content (specific file)
  router.get('/repositories/:owner/:name/content', (req, res) => {
    const { owner, name } = req.params;
    const { branch = 'main', path = '' } = req.query;
    
    // Simple mock content
    res.json({
      content: `Mock content for file ${path} in repository ${owner}/${name} on branch ${branch}`,
      encoding: 'utf-8'
    });
  });
  
  // List files in a repository
  router.get('/repositories/:owner/:name/files', (req, res) => {
    const { owner, name } = req.params;
    const { branch = 'main', path = '' } = req.query;
    
    // Generate mock files
    const files = [
      {
        name: 'README.md',
        path: 'README.md',
        type: 'file',
        size: 1024,
        last_modified: new Date().toISOString()
      },
      {
        name: 'package.json',
        path: 'package.json',
        type: 'file',
        size: 512,
        last_modified: new Date().toISOString()
      },
      {
        name: 'src',
        path: 'src',
        type: 'directory',
        last_modified: new Date().toISOString()
      }
    ];
    
    if (path === 'src') {
      res.json({
        files: [
          {
            name: 'index.js',
            path: 'src/index.js',
            type: 'file',
            size: 2048,
            last_modified: new Date().toISOString()
          },
          {
            name: 'App.js',
            path: 'src/App.js',
            type: 'file',
            size: 4096,
            last_modified: new Date().toISOString()
          }
        ],
        directory: path,
        repository: { owner, name, branch }
      });
    } else {
      res.json({
        files,
        directory: path,
        repository: { owner, name, branch }
      });
    }
  });
}

module.exports = app;