/**
 * Search functionality for the SolAR Explorer API
 */
const express = require('express');
const router = express.Router();

// In-memory search data (to be replaced with actual repository data)
let mockRepositories = [];

// Initialize mock data
for (let i = 1; i <= 100; i++) {
  const repoName = i % 10 === 0 ? `solar-project-${i}` : 
                   i % 5 === 0 ? `blockchain-demo-${i}` : 
                   i % 3 === 0 ? `defi-app-${i}` : 
                   `example-repo-${i}`;
  
  const language = i % 10 === 0 ? 'TypeScript' :
                   i % 7 === 0 ? 'JavaScript' :
                   i % 5 === 0 ? 'Rust' :
                   i % 3 === 0 ? 'Solidity' :
                   'Python';
                   
  mockRepositories.push({
    id: `repo-${i}`,
    name: repoName,
    owner: `FZL8PK74v3kYDVF6YunpMZZrxsJamGJZQHtYxRDfqdJU`,
    description: `This is a ${language} project for demonstrating SolAR Explorer capabilities`,
    language,
    stars: Math.floor(Math.random() * 200),
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
    created_at: new Date(Date.now() - (Math.random() * 10000000000)).toISOString(),
    updated_at: new Date(Date.now() - (Math.random() * 1000000000)).toISOString()
  });
}

/**
 * Search repositories
 */
router.get('/repositories', (req, res) => {
  try {
    const { q, language, min_stars, created_after, sort, page = 1, limit = 10 } = req.query;
    
    // Filter repositories
    let results = [...mockRepositories];
    
    // Filter by search term
    if (q) {
      const searchTerm = q.toLowerCase();
      results = results.filter(repo => 
        repo.name.toLowerCase().includes(searchTerm) || 
        repo.description.toLowerCase().includes(searchTerm)
      );
    }
    
    // Filter by language
    if (language) {
      results = results.filter(repo => 
        repo.language.toLowerCase() === language.toLowerCase()
      );
    }
    
    // Filter by minimum stars
    if (min_stars) {
      const minStars = parseInt(min_stars);
      results = results.filter(repo => repo.stars >= minStars);
    }
    
    // Filter by creation date
    if (created_after) {
      const createdAfterDate = new Date(created_after);
      results = results.filter(repo => new Date(repo.created_at) >= createdAfterDate);
    }
    
    // Sort results
    if (sort) {
      switch (sort.toLowerCase()) {
        case 'stars':
          results.sort((a, b) => b.stars - a.stars);
          break;
        case 'updated':
          results.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
          break;
        case 'created':
          results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          break;
        default:
          // Default to relevance (when there's a search query) or stars
          if (q) {
            // Simple relevance: prioritize exact matches in name
            results.sort((a, b) => {
              const aNameMatch = a.name.toLowerCase().includes(q.toLowerCase()) ? 1 : 0;
              const bNameMatch = b.name.toLowerCase().includes(q.toLowerCase()) ? 1 : 0;
              
              if (aNameMatch !== bNameMatch) {
                return bNameMatch - aNameMatch;
              }
              
              return b.stars - a.stars;
            });
          } else {
            results.sort((a, b) => b.stars - a.stars);
          }
      }
    } else {
      // Default sorting by stars
      results.sort((a, b) => b.stars - a.stars);
    }
    
    // Paginate results
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedResults = results.slice(startIndex, endIndex);
    
    res.json({
      repositories: paginatedResults,
      pagination: {
        total: results.length,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(results.length / limitNum)
      },
      filters: {
        query: q || null,
        language: language || null,
        min_stars: min_stars ? parseInt(min_stars) : null,
        created_after: created_after || null,
        sort: sort || 'stars'
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * Search code within repositories
 */
router.get('/code', (req, res) => {
  try {
    const { q, repo, language, page = 1, limit = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    // Mock code search results
    const mockFiles = [
      { repo: 'example-repo-1', path: 'src/main.js', language: 'JavaScript', lines: [
        { number: 12, content: 'function searchData(query) {' },
        { number: 13, content: '  // Search for data matching the query' },
        { number: 14, content: '  return data.filter(item => item.includes(query));' }
      ]},
      { repo: 'example-repo-3', path: 'lib/utils.rs', language: 'Rust', lines: [
        { number: 45, content: 'pub fn search_items(items: &[Item], query: &str) -> Vec<&Item> {' },
        { number: 46, content: '    // Filter items by the query string' },
        { number: 47, content: '    items.iter().filter(|item| item.name.contains(query)).collect()' }
      ]},
      { repo: 'solar-project-10', path: 'src/components/Search.tsx', language: 'TypeScript', lines: [
        { number: 23, content: 'const searchResults = useMemo(() => {' },
        { number: 24, content: '  return data.filter(item => item.title.includes(searchQuery));' },
        { number: 25, content: '}, [data, searchQuery]);' }
      ]},
      { repo: 'defi-app-3', path: 'contracts/Token.sol', language: 'Solidity', lines: [
        { number: 87, content: 'function findHolders(uint256 minBalance) public view returns (address[] memory) {' },
        { number: 88, content: '  // Search for token holders with at least minBalance' },
        { number: 89, content: '  return _findHolders(minBalance);' }
      ]},
      { repo: 'blockchain-demo-5', path: 'src/utils/search.js', language: 'JavaScript', lines: [
        { number: 3, content: 'export const searchTransactions = (txs, query) => {' },
        { number: 4, content: '  return txs.filter(tx => {' },
        { number: 5, content: '    return tx.hash.includes(query) || tx.from.includes(query) || tx.to.includes(query);' },
        { number: 6, content: '  });' }
      ]}
    ];
    
    // Filter by repository if specified
    let results = [...mockFiles];
    if (repo) {
      results = results.filter(file => file.repo === repo);
    }
    
    // Filter by language if specified
    if (language) {
      results = results.filter(file => 
        file.language.toLowerCase() === language.toLowerCase()
      );
    }
    
    // Simulate matching the search query in file content
    // In a real implementation, this would involve actual code search
    results = results.filter(file => {
      // Check if any line contains the search query
      return file.lines.some(line => 
        line.content.toLowerCase().includes(q.toLowerCase())
      );
    });
    
    // Highlight the matching parts of the content
    results = results.map(file => {
      const highlightedLines = file.lines.map(line => {
        // Simple highlighting with <mark> tags
        const highlighted = line.content.replace(
          new RegExp(q, 'gi'),
          match => `<mark>${match}</mark>`
        );
        
        return {
          number: line.number,
          content: line.content,
          highlighted
        };
      });
      
      return {
        ...file,
        lines: highlightedLines
      };
    });
    
    // Paginate results
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedResults = results.slice(startIndex, endIndex);
    
    res.json({
      code_results: paginatedResults,
      pagination: {
        total: results.length,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(results.length / limitNum)
      },
      filters: {
        query: q,
        repository: repo || null,
        language: language || null
      }
    });
  } catch (error) {
    console.error('Code search error:', error);
    res.status(500).json({ error: 'Code search failed' });
  }
});

module.exports = router;