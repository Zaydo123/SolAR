// SolanaGitRepository.js
const GitRepository = require("./GitRepository");
const fs = require("fs");
const path = require("path");
const {
  computeRepoPDA,
  queryState,
  updateState,
  uploadToArweave,
  downloadFromArweave,
} = require("./solanaArweaveSim");

/**
 * A GitRepository that uses the simulated Solana + Arweave storage.
 */
class SolanaGitRepository extends GitRepository {
  constructor() {
    super();
    console.log("SolanaGitRepository initialized");
  }

  /**
   * Return an array of { ref, sha } from the on-chain simulated state.
   */
  async getRefs(req) {
    const { owner, repo } = req.params;
    console.log(`Getting refs for ${owner}/${repo}`);
    
    try {
      const pda = computeRepoPDA(owner, repo);
      console.log(`Repository PDA: ${pda.toString()}`);
      
      const st = queryState(pda);
      console.log(`Repository state:`, st);
      
      const refs = [];
      for (const [branch, info] of Object.entries(st.refs || {})) {
        refs.push({ 
          ref: branch, 
          sha: info.commit_hash || "0000000000000000000000000000000000000000" 
        });
      }
      
      // If no refs exist, create at least a master branch
      if (refs.length === 0) {
        refs.push({
          ref: "refs/heads/master",
          sha: "0000000000000000000000000000000000000000"
        });
      }
      
      // Sort for consistency
      refs.sort((a, b) => a.ref.localeCompare(b.ref));
      console.log(`Found ${refs.length} refs`);
      
      return refs;
    } catch (error) {
      console.error(`Error getting refs for ${owner}/${repo}:`, error);
      // Return at least a master branch
      return [{
        ref: "refs/heads/master",
        sha: "0000000000000000000000000000000000000000"
      }];
    }
  }

  /**
   * Return HEAD ref if we have one, e.g. "refs/heads/master" 
   */
  async getHeadRef(req) {
    try {
      const refs = await this.getRefs(req);
      
      // Check if HEAD is present
      let head = refs.find((r) => r.ref === "HEAD");
      if (head) return "HEAD";
      
      // Otherwise check master or main
      let master = refs.find((r) => r.ref === "refs/heads/master");
      if (master) return "refs/heads/master";
      
      let main = refs.find((r) => r.ref === "refs/heads/main");
      if (main) return "refs/heads/main";
      
      // If we have any refs, use the first one
      if (refs.length > 0) return refs[0].ref;
      
      // Default to master
      return "refs/heads/master";
    } catch (error) {
      console.error("Error in getHeadRef:", error);
      return "refs/heads/master";
    }
  }

  /**
   * receivePack is called after we've read the push commands + objects.
   * We just set the new commit hash in the "on-chain" state for master. 
   */
  async receivePack(req, commands, objects) {
    try {
      // We ignore objects. We'll just set the new commit from the first command.
      const { owner, repo } = req.params;
      console.log(`Receiving pack for ${owner}/${repo}`);
      console.log(`Commands:`, commands);
      
      const pda = computeRepoPDA(owner, repo);
      console.log(`Repository PDA: ${pda.toString()}`);
      
      // Check if repo directory exists, if not create it
      const repoDir = path.join(__dirname, 'repos', owner, repo);
      if (!fs.existsSync(repoDir)) {
        fs.mkdirSync(repoDir, { recursive: true });
        console.log(`Created repository directory: ${repoDir}`);
      }
      
      // Save objects to filesystem for testing purposes
      if (objects && objects.length > 0) {
        console.log(`Saving ${objects.length} objects to disk for testing`);
        for (let i = 0; i < objects.length; i++) {
          const obj = objects[i];
          if (obj && obj.data) {
            // Save object content to filesystem for debugging
            const objPath = path.join(repoDir, obj.hash || `object_${i}`);
            fs.writeFileSync(objPath, obj.data);
          }
        }
      }
      
      if (commands.length > 0) {
        for (const cmd of commands) {
          if (cmd.destId && cmd.ref) {
            console.log(`Updating ref ${cmd.ref} to ${cmd.destId}`);
            
            // Simulate uploading to Arweave
            const arweaveTxId = `fake_arweave_tx_${Date.now()}`;
            console.log(`Generated Arweave TX ID: ${arweaveTxId}`);
            
            // Update on-chain state
            updateState(pda, cmd.ref, cmd.destId, arweaveTxId);
            console.log(`Updated state for ${cmd.ref}`);
          } else if (cmd.destId === "0000000000000000000000000000000000000000") {
            console.log(`Command to delete ref ${cmd.ref} (not implemented)`);
            // Delete branch logic would go here
          }
        }
      } else {
        console.log("No commands received");
      }
    } catch (error) {
      console.error("Error in receivePack:", error);
      throw error;
    }
  }
  
  /**
   * Custom message for git-receive-pack success response
   */
  async getReceivePackSuccessMessage(req, commands, objects) {
    const { owner, repo } = req.params;
    let message = `\n`;
    
    // Add a message for each ref update
    for (const cmd of commands) {
      if (cmd.ref) {
        message += `[${cmd.ref}]: ${cmd.srcId.substring(0, 7)} -> ${cmd.destId.substring(0, 7)}\n`;
      }
    }
    
    message += `\nSuccess! Repository ${owner}/${repo} updated.\n`;
    return message;
  }
}

module.exports = SolanaGitRepository;
