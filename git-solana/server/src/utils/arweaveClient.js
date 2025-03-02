const Arweave = require('arweave');
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const tar = require('tar-stream');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');

class ArweaveClient {
  constructor(config = {}) {
    this.arweave = Arweave.init({
      host: config.host || 'arweave.net',
      port: config.port || 443,
      protocol: config.protocol || 'https',
      timeout: config.timeout || 20000,
    });
  }

  /**
   * Fetch content from Arweave by transaction ID
   */
  async getTransactionData(txId) {
    try {
      // Get the transaction data
      const data = await this.arweave.transactions.getData(txId, {
        decode: true
      });
      
      return data;
    } catch (error) {
      console.error(`Error fetching data from Arweave transaction ${txId}:`, error);
      throw error;
    }
  }

  /**
   * Download repository content from Arweave
   * @param {string} txId - Arweave transaction ID
   * @param {object} options - Download options
   * @returns {Buffer} - Repository content as a buffer
   */
  async downloadRepository(txId, options = {}) {
    try {
      const data = await this.getTransactionData(txId);
      
      // Return the raw data if no specific format is requested
      if (!options.format) {
        return data;
      }
      
      // Process the data based on the format
      switch (options.format.toLowerCase()) {
        case 'zip':
          return this.createZipArchive(data, options);
        case 'tar':
          return this.createTarArchive(data, options);
        case 'tar.gz':
        case 'tgz':
          return this.createTarGzArchive(data, options);
        default:
          return data;
      }
    } catch (error) {
      console.error(`Error downloading repository from Arweave:`, error);
      throw error;
    }
  }

  /**
   * Create a ZIP archive from the repository data
   */
  async createZipArchive(data, options = {}) {
    try {
      // Assume data is a Git bundle that needs to be extracted
      // This is a placeholder - actual implementation would depend on 
      // the format of data stored in Arweave
      const zip = new JSZip();
      
      // Add extracted files to the ZIP
      // This is simplified - you'd need to actually extract files from the Git bundle
      zip.file('README.md', 'Repository downloaded from SolAR');
      zip.file('example.txt', data.toString());
      
      // Generate ZIP file
      return await zip.generateAsync({ type: 'nodebuffer' });
    } catch (error) {
      console.error('Error creating ZIP archive:', error);
      throw error;
    }
  }

  /**
   * Create a TAR archive from the repository data
   */
  async createTarArchive(data, options = {}) {
    try {
      // Create a tar stream
      const pack = tar.pack();
      
      // Add files to the tar
      // This is simplified - you'd need to actually extract files from the Git bundle
      const entry = pack.entry({ name: 'README.md' }, 'Repository downloaded from SolAR');
      entry.end();
      
      const contentEntry = pack.entry({ name: 'example.txt' }, data);
      contentEntry.end();
      
      // Finalize the tar
      pack.finalize();
      
      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of pack) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      console.error('Error creating TAR archive:', error);
      throw error;
    }
  }

  /**
   * Create a compressed TAR.GZ archive from the repository data
   */
  async createTarGzArchive(data, options = {}) {
    try {
      // Create a tar stream and gzip
      const pack = tar.pack();
      const gzip = zlib.createGzip();
      
      // Add files to the tar
      // This is simplified - you'd need to actually extract files from the Git bundle
      const entry = pack.entry({ name: 'README.md' }, 'Repository downloaded from SolAR');
      entry.end();
      
      const contentEntry = pack.entry({ name: 'example.txt' }, data);
      contentEntry.end();
      
      // Finalize the tar
      pack.finalize();
      
      // Pipe through gzip and capture output
      const chunks = [];
      await pipeline(pack, gzip, new Readable({
        read() {},
        write(chunk, encoding, callback) {
          chunks.push(chunk);
          callback();
        }
      }));
      
      return Buffer.concat(chunks);
    } catch (error) {
      console.error('Error creating TAR.GZ archive:', error);
      throw error;
    }
  }
}

module.exports = ArweaveClient;