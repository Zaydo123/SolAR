// API service for interacting with the SolAR backend server
import { fetchFromApi } from './apiUtils';

// List repositories with pagination and filtering
export const listRepositories = async (filters = {}, page = 1, limit = 10) => {
  try {
    // Convert filters to query parameters
    const queryParams = new URLSearchParams({
      page,
      limit,
      ...filters
    });

    const data = await fetchFromApi(`/repositories?${queryParams.toString()}`);
    return data;
  } catch (error) {
    console.error("Failed to list repositories:", error);
    
    // For demo/development, return mock data if backend is not available
    return {
      repositories: [
        {
          id: "repo1",
          name: "SolAR Core",
          address: "0x123...abc",
          owner: "0xabc...123", 
          branches: [
            {
              name: "main",
              commit_hash: "a1b2c3d4",
              arweave_tx: "tx1",
              date: "2024-02-15T10:00:00Z"
            }
          ],
          stars: 25
        },
        {
          id: "repo2",
          name: "SolAR Frontend",
          address: "0x456...def",
          owner: "0xdef...456",
          branches: [
            {
              name: "main",
              commit_hash: "e5f6g7h8",
              arweave_tx: "tx2",
              date: "2024-02-20T14:30:00Z"
            }
          ],
          stars: 18
        },
        {
          id: "repo3",
          name: "SolAR Smart Contracts",
          address: "0x789...ghi",
          owner: "0xghi...789",
          branches: [
            {
              name: "main",
              commit_hash: "i9j0k1l2",
              arweave_tx: "tx3",
              date: "2024-02-25T09:15:00Z"
            }
          ],
          stars: 32
        }
      ],
      pagination: {
        total: 3,
        page: 1,
        limit: 10,
        pages: 1
      }
    };
  }
};

// Get repository details
export const getRepositoryDetails = async (ownerAddress, name) => {
  try {
    // In an actual implementation, we need both owner and name
    // but for simplification we're using address as an ID
    const endpoint = ownerAddress.includes('/') 
      ? `/repositories/${ownerAddress}` // If it contains slash, it's already in owner/name format
      : `/repositories/${ownerAddress}`; // Otherwise just use it as ID
    
    const data = await fetchFromApi(endpoint);
    return data;
  } catch (error) {
    console.error("Failed to get repository details:", error);
    
    // For demo/development, return mock data based on the address
    const mockRepos = {
      "0x123...abc": {
        id: "repo1",
        name: "SolAR Core",
        address: "0x123...abc",
        owner: "0xabc...123",
        collaborators: [
          { address: "0xdef...456" },
          { address: "0xghi...789" }
        ],
        branches: [
          {
            name: "main",
            commit_hash: "a1b2c3d4",
            arweave_tx: "tx1",
            date: "2024-02-15T10:00:00Z"
          },
          {
            name: "development",
            commit_hash: "e5f6g7h8",
            arweave_tx: "tx2",
            date: "2024-02-10T08:20:00Z"
          },
          {
            name: "feature/new-storage",
            commit_hash: "i9j0k1l2",
            arweave_tx: "tx3",
            date: "2024-01-25T14:45:00Z"
          }
        ],
        stars: 25
      },
      "0x456...def": {
        id: "repo2",
        name: "SolAR Frontend",
        address: "0x456...def",
        owner: "0xdef...456",
        collaborators: [
          { address: "0xabc...123" }
        ],
        branches: [
          {
            name: "main",
            commit_hash: "m3n4o5p6",
            arweave_tx: "tx4",
            date: "2024-02-20T14:30:00Z"
          },
          {
            name: "development",
            commit_hash: "q7r8s9t0",
            arweave_tx: "tx5",
            date: "2024-02-18T11:10:00Z"
          }
        ],
        stars: 18
      },
      "0x789...ghi": {
        id: "repo3",
        name: "SolAR Smart Contracts",
        address: "0x789...ghi",
        owner: "0xghi...789",
        collaborators: [],
        branches: [
          {
            name: "main",
            commit_hash: "u1v2w3x4",
            arweave_tx: "tx6",
            date: "2024-02-25T09:15:00Z"
          }
        ],
        stars: 32
      }
    };
    
    // Return the requested repository or a default one
    return mockRepos[ownerAddress] || mockRepos["0x123...abc"];
  }
};

// Star a repository
export const starRepository = async (ownerAddress, name, walletPublicKey) => {
  try {
    // This would normally require wallet authentication
    const data = await fetchFromApi(`/repositories/${ownerAddress}/${name}/star`, {
      method: 'POST',
      body: JSON.stringify({ wallet: walletPublicKey })
    });
    return data;
  } catch (error) {
    console.error("Failed to star repository:", error);
    return { success: false, error: error.message };
  }
};

// Unstar a repository
export const unstarRepository = async (ownerAddress, name, walletPublicKey) => {
  try {
    // This would normally require wallet authentication
    const data = await fetchFromApi(`/repositories/${ownerAddress}/${name}/unstar`, {
      method: 'POST',
      body: JSON.stringify({ wallet: walletPublicKey })
    });
    return data;
  } catch (error) {
    console.error("Failed to unstar repository:", error);
    return { success: false, error: error.message };
  }
};

// Check if a repository is starred by the current user
export const isRepositoryStarred = async (ownerAddress, name, walletPublicKey) => {
  if (!walletPublicKey) return false;
  
  try {
    const data = await fetchFromApi(`/repositories/${ownerAddress}/${name}/starred/${walletPublicKey}`);
    return data.isStarred;
  } catch (error) {
    console.error("Failed to check if repository is starred:", error);
    return false;
  }
};