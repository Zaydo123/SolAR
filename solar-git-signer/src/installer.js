const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Pre-push hook template
// Note: The $ in ${BASH_REMATCH} needs to be escaped as \\$ in JavaScript strings
const PRE_PUSH_HOOK = `#!/bin/bash
# solar-git-signer pre-push hook
# This hook signs Solana transactions for each Git push

# Get push arguments
remote="$1"
url="$2"

# Exit early if not a solar repository
if [[ ! "$url" =~ solar|localhost ]]; then
  exit 0
fi

# Extract repository info
repo_name=$(basename "$url" .git)

# More robust URL parsing for different URL formats
if [[ "$url" =~ http://localhost:[0-9]+/([^/]+)/([^/]+) ]]; then
  # Format: http://localhost:5003/owner/repo
  owner="\${BASH_REMATCH[1]}"
  repo_name="\${BASH_REMATCH[2]}"
elif [[ "$url" =~ https?://([^/]+)/([^/]+)/([^/]+) ]]; then
  # Format: https://domain.com/owner/repo
  owner="\${BASH_REMATCH[2]}"
  repo_name="\${BASH_REMATCH[3]}"
else
  # Default parsing for SSH or other formats
  owner=$(basename $(dirname "$url"))
fi

# Get current branch and commit
branch=$(git symbolic-ref --short HEAD)
commit=$(git rev-parse HEAD)

# Server URL (change to match your server)
SERVER_URL=SERVER_URL_PLACEHOLDER

echo "Requesting Solana transaction signature for $owner/$repo_name..."
echo "URL: $url"
echo "Owner: $owner, Repo: $repo_name, Branch: $branch, Commit: $commit"

METHOD=\${SOLAR_SIGN_METHOD:-cli}
echo "Using signing method: \$METHOD"

if [ "\$METHOD" = "qrcode" ]; then
  echo "==============================================="
  echo "Note: You'll see a QR code appear below."
  echo "If it doesn't show properly in the Git output,"
  echo "try running this command directly:"
  echo "solar-signer sign --owner \"$owner\" --repo \"$repo_name\" --branch \"$branch\" --commit \"$commit\" --server \"$SERVER_URL\" --method qrcode"
  echo "==============================================="
fi

signature=$(solar-signer sign --owner "$owner" --repo "$repo_name" --branch "$branch" --commit "$commit" --server "$SERVER_URL" --method "\$METHOD")

# Check if signing was successful
if [ $? -ne 0 ]; then
  echo "❌ Transaction signing failed! Push aborted."
  exit 1
fi

echo "✅ Transaction signed successfully!"
exit 0
`;

// Function to find Git directory
function findGitDir(startPath) {
  let currentPath = startPath;
  
  while (currentPath !== '/') {
    const gitPath = path.join(currentPath, '.git');
    
    if (fs.existsSync(gitPath) && fs.statSync(gitPath).isDirectory()) {
      return gitPath;
    }
    
    // Move up one directory
    currentPath = path.dirname(currentPath);
  }
  
  return null;
}

// Function to install the pre-push hook
async function installHook(serverUrl = 'http://localhost:5003') {
  try {
    // Find .git directory from current path
    const gitDir = findGitDir(process.cwd());
    
    if (!gitDir) {
      console.error('❌ Not in a Git repository. Please run this command inside a Git repository.');
      return false;
    }
    
    // Create hooks directory if it doesn't exist
    const hooksDir = path.join(gitDir, 'hooks');
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true });
    }
    
    // Create or replace pre-push hook
    const hookPath = path.join(hooksDir, 'pre-push');
    
    // Replace server URL placeholder with the provided URL
    const hookContent = PRE_PUSH_HOOK.replace('SERVER_URL_PLACEHOLDER', serverUrl);
    
    // Check if hook already exists
    if (fs.existsSync(hookPath)) {
      const existingContent = fs.readFileSync(hookPath, 'utf8');
      
      if (existingContent.includes('solar-git-signer')) {
        console.log('ℹ️ Updating existing solar-git-signer pre-push hook...');
      } else {
        console.log('⚠️ Existing pre-push hook found. Creating backup before replacing...');
        fs.writeFileSync(`${hookPath}.backup`, existingContent);
      }
    }
    
    // Write the new hook
    fs.writeFileSync(hookPath, hookContent);
    
    // Make it executable
    fs.chmodSync(hookPath, '755');
    
    console.log('✅ SolAR Git pre-push hook installed successfully!');
    
    // Verify the hook was installed correctly
    try {
      execSync(`ls -la ${hookPath}`);
      console.log(`\nHook location: ${hookPath}`);
      
      return true;
    } catch (error) {
      console.error('Error verifying hook installation:', error.message);
      return false;
    }
  } catch (error) {
    console.error('Error installing pre-push hook:', error.message);
    return false;
  }
}

module.exports = {
  installHook,
  findGitDir
};