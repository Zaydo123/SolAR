// Common API utilities for the SolAR Explorer

// API base URL
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

// For development/testing, set this to true to use mock data
export const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true' || false;

// Helper function to determine the API base endpoint
export const getApiBase = () => {
  return USE_MOCK ? `${API_BASE_URL}/mock` : API_BASE_URL;
};

// Generic fetch function with error handling
export const fetchFromApi = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${getApiBase()}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error for ${endpoint}:`, error);
    throw error;
  }
};