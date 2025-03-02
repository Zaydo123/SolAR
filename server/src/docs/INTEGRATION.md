# SolAR Git Server Integration Guide

This document explains how to integrate the working Git server with the SolAR project's
Solana and Arweave components.

## Overview

The working server (`working-server.js`) implements a reliable Git server that uses
native Git commands to handle the complex Git protocol correctly. It also demonstrates
integration with Solana and Arweave simulation.

## Integration Steps

1. **Use Native Git for Protocol Handling**

   The key lesson is to use Git's native commands with `--stateless-rpc` flags for
   handling the Git protocol. This avoids having to manually implement the complex
   Git protocol formats.

   ```javascript
   // For info/refs endpoint
   const output = execSync(`git ${service.substring(4)} --stateless-rpc --advertise-refs "${repoPath}"`);

   // For git-receive-pack (push)
   const output = execSync(`git receive-pack --stateless-rpc "${repoPath}" < "${tempFile}"`);
   ```

2. **Extract Repository Metadata**

   After Git operations complete, extract the metadata using Git commands:
   
   ```javascript
   const refsOutput = execSync(`git -C "${repoPath}" show-ref`).toString().trim();
   const refLines = refsOutput.split('\n');
   
   for (const refLine of refLines) {
     const [commitHash, refName] = refLine.split(' ');
     // Store metadata in Solana...
   }
   ```

3. **Store Content in Arweave**

   You can adapt the Arweave storage to store Git pack files or raw objects:
   
   ```javascript
   // Get raw Git objects
   const objectsDir = path.join(repoPath, 'objects');
   // ... iterate through objects and store in Arweave
   ```

4. **Link to Solana**

   Store the references to the Arweave content in Solana:
   
   ```javascript
   // Calculate repository PDA
   const pda = computeRepoPDA(owner, repo);
   
   // Update state in Solana
   updateState(pda, refName, commitHash, arweaveTxId);
   ```

## Advantages

1. **Reliability**: Using native Git commands ensures correct protocol handling
2. **Simplicity**: Avoid reimplementing complex Git protocols
3. **Flexibility**: Still allows storing metadata in Solana
4. **Performance**: Native Git commands are optimized and fast

## Recommended Architecture

1. Express server handles HTTP routing
2. Git handles protocol details via `--stateless-rpc`
3. After Git operations complete, store metadata in Solana
4. Store content (or references to local content) in Arweave

## Next Steps

1. Modify your `server.js` to use this approach
2. Adapt your SolanaGitRepository to extract metadata after Git operations
3. Update your Arweave integration to store relevant Git objects

By combining the reliability of native Git with your Solana/Arweave storage,
you'll have a robust and functioning Git server with blockchain storage capabilities.