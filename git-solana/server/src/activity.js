/**
 * Activity feed and events tracking for the SolAR Explorer API
 */
const express = require('express');
const router = express.Router();
const { verifyToken } = require('./auth');

// In-memory activity store (replace with database in production)
let activities = [];

// Generate mock activity data
function generateMockActivities(count = 100) {
  const activityTypes = [
    'create_repository',
    'star_repository',
    'unstar_repository',
    'update_branch',
    'add_collaborator'
  ];
  
  const users = [
    {
      publicKey: 'FZL8PK74v3kYDVF6YunpMZZrxsJamGJZQHtYxRDfqdJU',
      username: 'alice'
    },
    {
      publicKey: '5TQo5Bf6yXp9uywEFbp9YKUyveD2pe2LVXRjY2aWRup5',
      username: 'bob'
    },
    {
      publicKey: 'DzhShHyF3UNynJpVgfQnMTD3GyzPoW8zgeZBEGpgt8Nt',
      username: 'charlie'
    }
  ];
  
  const repositories = [
    { owner: users[0].publicKey, name: 'example-repo-1' },
    { owner: users[1].publicKey, name: 'solar-project-10' },
    { owner: users[2].publicKey, name: 'defi-app-3' },
    { owner: users[0].publicKey, name: 'blockchain-demo-5' }
  ];
  
  const mockActivities = [];
  
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(Date.now() - (Math.random() * 10000000000)).toISOString();
    const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
    const user = users[Math.floor(Math.random() * users.length)];
    const repository = repositories[Math.floor(Math.random() * repositories.length)];
    
    let payload = {
      user: {
        publicKey: user.publicKey,
        username: user.username
      },
      repository: {
        owner: repository.owner,
        name: repository.name
      },
      timestamp
    };
    
    // Add activity-specific details
    switch (activityType) {
      case 'create_repository':
        payload = {
          ...payload,
          details: {
            description: `A new ${Math.random() > 0.5 ? 'Solana' : 'Web3'} project`,
            initial_branch: 'main'
          }
        };
        break;
      
      case 'star_repository':
        payload = {
          ...payload,
          details: {
            star_count: Math.floor(Math.random() * 100) + 1
          }
        };
        break;
        
      case 'unstar_repository':
        payload = {
          ...payload,
          details: {
            star_count: Math.floor(Math.random() * 100)
          }
        };
        break;
        
      case 'update_branch':
        payload = {
          ...payload,
          details: {
            branch: Math.random() > 0.7 ? 'dev' : 'main',
            commit_hash: `${Math.random().toString(36).substring(2, 10)}`,
            commit_message: `Update ${Math.random() > 0.5 ? 'documentation' : 'code'} for ${Math.random() > 0.5 ? 'feature' : 'bugfix'}`
          }
        };
        break;
        
      case 'add_collaborator':
        const collaborator = users.find(u => u.publicKey !== user.publicKey);
        payload = {
          ...payload,
          details: {
            collaborator: {
              publicKey: collaborator.publicKey,
              username: collaborator.username
            }
          }
        };
        break;
    }
    
    mockActivities.push({
      id: `activity-${i}`,
      type: activityType,
      payload
    });
  }
  
  // Sort by timestamp (newest first)
  mockActivities.sort((a, b) => 
    new Date(b.payload.timestamp) - new Date(a.payload.timestamp)
  );
  
  return mockActivities;
}

// Initialize with mock data
activities = generateMockActivities();

/**
 * Get global activity feed
 */
router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    
    // Filter by activity type if specified
    let results = [...activities];
    if (type) {
      results = results.filter(activity => activity.type === type);
    }
    
    // Paginate results
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedResults = results.slice(startIndex, endIndex);
    
    res.json({
      activities: paginatedResults,
      pagination: {
        total: results.length,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(results.length / limitNum)
      },
      filters: {
        type: type || null
      }
    });
  } catch (error) {
    console.error('Activity feed error:', error);
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
});

/**
 * Get repository-specific activity feed
 */
router.get('/repositories/:owner/:name', (req, res) => {
  try {
    const { owner, name } = req.params;
    const { page = 1, limit = 20, type } = req.query;
    
    // Filter activities for this repository
    let results = activities.filter(activity => 
      activity.payload.repository.owner === owner && 
      activity.payload.repository.name === name
    );
    
    // Filter by activity type if specified
    if (type) {
      results = results.filter(activity => activity.type === type);
    }
    
    // Paginate results
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedResults = results.slice(startIndex, endIndex);
    
    res.json({
      activities: paginatedResults,
      pagination: {
        total: results.length,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(results.length / limitNum)
      },
      repository: {
        owner,
        name
      },
      filters: {
        type: type || null
      }
    });
  } catch (error) {
    console.error('Repository activity feed error:', error);
    res.status(500).json({ error: 'Failed to fetch repository activity feed' });
  }
});

/**
 * Get user-specific activity feed
 */
router.get('/users/:publicKey', (req, res) => {
  try {
    const { publicKey } = req.params;
    const { page = 1, limit = 20, type } = req.query;
    
    // Filter activities for this user
    let results = activities.filter(activity => 
      activity.payload.user.publicKey === publicKey
    );
    
    // Filter by activity type if specified
    if (type) {
      results = results.filter(activity => activity.type === type);
    }
    
    // Paginate results
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedResults = results.slice(startIndex, endIndex);
    
    res.json({
      activities: paginatedResults,
      pagination: {
        total: results.length,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(results.length / limitNum)
      },
      user: {
        publicKey
      },
      filters: {
        type: type || null
      }
    });
  } catch (error) {
    console.error('User activity feed error:', error);
    res.status(500).json({ error: 'Failed to fetch user activity feed' });
  }
});

/**
 * Record a new activity (requires authentication)
 */
router.post('/', verifyToken, (req, res) => {
  try {
    const { type, repository, details } = req.body;
    const { publicKey, username } = req.user;
    
    if (!type || !repository) {
      return res.status(400).json({ error: 'Activity type and repository are required' });
    }
    
    if (!repository.owner || !repository.name) {
      return res.status(400).json({ error: 'Repository owner and name are required' });
    }
    
    // Create new activity
    const newActivity = {
      id: `activity-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
      type,
      payload: {
        user: {
          publicKey,
          username
        },
        repository: {
          owner: repository.owner,
          name: repository.name
        },
        timestamp: new Date().toISOString(),
        details: details || {}
      }
    };
    
    // Add to activity list
    activities.unshift(newActivity);
    
    res.status(201).json(newActivity);
  } catch (error) {
    console.error('Record activity error:', error);
    res.status(500).json({ error: 'Failed to record activity' });
  }
});

module.exports = router;