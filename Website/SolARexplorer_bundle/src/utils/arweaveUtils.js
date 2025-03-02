// API service for downloading repository content
import { getApiBase, fetchFromApi } from './apiUtils';

// Download repository content
export const downloadRepository = async (owner, name, branch = "main", format = "zip") => {
  try {
    // Create the URL for downloading the repository
    const downloadUrl = `${getApiBase()}/repositories/${owner}/${name}/download?branch=${branch}&format=${format}`;
    
    // Fetch with blob response type for binary data
    const response = await fetch(downloadUrl);
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }
    
    // Get the content as blob
    const blob = await response.blob();
    
    return {
      repository: {
        name: name,
        owner: owner,
        branch: branch
      },
      data: blob,
      format: format
    };
  } catch (error) {
    console.error("Failed to download repository:", error);
    throw error;
  }
};

// Get file content from a repository
export const getFileContent = async (owner, name, branch, path) => {
  try {
    const endpoint = `/repositories/${owner}/${name}/content?branch=${branch}&path=${encodeURIComponent(path)}`;
    const data = await fetchFromApi(endpoint);
    return data;
  } catch (error) {
    console.error("Failed to get file content:", error);
    throw error;
  }
};

// List files in a directory
export const listFiles = async (owner, name, branch, path = '') => {
  try {
    const endpoint = `/repositories/${owner}/${name}/files?branch=${branch}&path=${encodeURIComponent(path)}`;
    const data = await fetchFromApi(endpoint);
    return data;
  } catch (error) {
    console.error("Failed to list files:", error);
    return { files: [], directories: [] };
  }
};