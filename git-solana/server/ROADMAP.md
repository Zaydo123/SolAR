# SolAR Explorer API Roadmap

This document outlines the remaining features to be implemented in the SolAR Explorer API to fully meet the requirements.

## 1. Authentication & Authorization

### User Management
- [ ] Create user registration endpoint
  ```
  POST /api/auth/register
  ```
- [ ] Implement login/token generation
  ```
  POST /api/auth/login
  ```
- [ ] Add token validation middleware
  ```javascript
  // Middleware function to verify JWT tokens
  function verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    // Verify and decode token
    // Attach user to request object
    req.user = decodedUser;
    next();
  }
  ```

### Permission System
- [ ] Create repository permission model on Solana (private/public)
- [ ] Add permission checks to repository operations
  ```javascript
  // Example permission check middleware
  function canAccessRepo(req, res, next) {
    const { owner, name } = req.params;
    const repoDetails = await getRepositoryDetails(owner, name);
    
    if (repoDetails.isPublic || 
        repoDetails.owner === req.user.publicKey || 
        repoDetails.collaborators.includes(req.user.publicKey)) {
      return next();
    }
    
    return res.status(403).json({ error: 'Unauthorized' });
  }
  ```

## 2. Search Functionality

### Repository Search
- [ ] Implement global repository search
  ```
  GET /api/search/repositories?q=search_term
  ```
- [ ] Add advanced filters (language, stars, date)
  ```
  GET /api/search/repositories?q=search_term&language=rust&min_stars=5&created_after=2023-01-01
  ```
- [ ] Implement relevance sorting
  ```
  GET /api/search/repositories?q=search_term&sort=relevance|stars|updated
  ```

### Code Search
- [ ] Add content search within repositories
  ```
  GET /api/search/code?q=search_term&repo=owner/name
  ```
- [ ] Support regex pattern matching
- [ ] Implement file type filtering

## 3. Activity Feed/Events

### Activity Tracking
- [ ] Create activity feed endpoint
  ```
  GET /api/activity
  ```
- [ ] Repository-specific activity endpoint
  ```
  GET /api/repositories/:owner/:name/activity
  ```
- [ ] User-specific activity endpoint
  ```
  GET /api/users/:username/activity
  ```

### Event Types to Track
- [ ] Repository creation
- [ ] Branch updates
- [ ] Star/unstar events
- [ ] Collaborator additions

## 4. Webhook Support

### Webhook Management
- [ ] Add webhook creation endpoint
  ```
  POST /api/repositories/:owner/:name/webhooks
  ```
- [ ] Implement webhook triggering system
  ```javascript
  // In the repository update handler
  async function notifyWebhooks(repoId, eventType, payload) {
    const webhooks = await getWebhooksForRepo(repoId, eventType);
    
    for (const webhook of webhooks) {
      try {
        await axios.post(webhook.url, {
          event: eventType,
          repository: payload.repository,
          sender: payload.sender,
          data: payload.data
        }, {
          headers: {
            'Content-Type': 'application/json',
            'X-SolAR-Event': eventType,
            'X-SolAR-Delivery': uuid()
          }
        });
      } catch (error) {
        console.error(`Failed to deliver webhook to ${webhook.url}:`, error);
      }
    }
  }
  ```
- [ ] Create webhook listing endpoint
  ```
  GET /api/repositories/:owner/:name/webhooks
  ```
- [ ] Add webhook deletion
  ```
  DELETE /api/repositories/:owner/:name/webhooks/:id
  ```

## 5. Enhanced Star Analytics

### Trending Repositories
- [ ] Implement trending repositories endpoint
  ```
  GET /api/trending?period=day|week|month
  ```
- [ ] Support filtering by programming language
  ```
  GET /api/trending?period=week&language=rust
  ```

### Star History
- [ ] Add star history endpoint
  ```
  GET /api/repositories/:owner/:name/stars/history
  ```
- [ ] Implement star correlation analytics
  ```
  GET /api/repositories/:owner/:name/related
  ```

## Implementation Strategy

1. **Phase 1: Authentication and Authorization**
   - Implement user system
   - Add permission controls
   - Create JWT-based authentication

2. **Phase 2: Search Functionality**
   - Build repository search
   - Implement code search
   - Add filtering and sorting

3. **Phase 3: Activity and Webhooks**
   - Create activity tracking
   - Implement webhook system
   - Build notification infrastructure

4. **Phase 4: Analytics and Advanced Features**
   - Develop star analytics
   - Implement trending algorithms
   - Add recommendation features

## Technical Considerations

- Use OAuth with Solana wallet authentication
- Implement proper rate limiting for search endpoints
- Consider using ElasticSearch for advanced search functionality
- Use Redis for caching frequently accessed data
- Implement proper pagination for all list endpoints