const fetch = require('node-fetch');

/**
 * Shorten a URL using TinyURL's API
 * @param {string} url - The long URL to shorten
 * @returns {Promise<string>} - The shortened URL
 */
async function shortenUrl(url) {
  try {
    // Use TinyURL's API to shorten the URL
    const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      throw new Error(`Error shortening URL: ${response.status} ${response.statusText}`);
    }
    
    const shortUrl = await response.text();
    return shortUrl;
  } catch (error) {
    console.error('Error using URL shortener:', error.message);
    // Return the original URL if shortening fails
    return url;
  }
}

/**
 * Create a shorter URL specifically for QR codes
 * This is useful for making QR codes less dense and easier to scan
 * 
 * @param {string} url - The URL to shorten for QR code display
 * @param {boolean} useShortener - Whether to use an external shortening service
 * @returns {Promise<string>} The shortened URL or the original URL if shortening fails
 */
async function createQrCodeUrl(url, useShortener = true) {
  if (useShortener) {
    try {
      return await shortenUrl(url);
    } catch (error) {
      console.error('Error shortening URL for QR code:', error);
      return url;
    }
  }
  return url;
}

module.exports = {
  shortenUrl,
  createQrCodeUrl
};