/**
 * Script to set up the Solana program for local development
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const SolanaClient = require('./solanaClient');

// Check if test validators are running
function checkTestValidator() {
  try {
    execSync('pgrep -f solana-test-validator', { stdio: 'ignore' });
    console.log('✅ Solana test validator is running');
    return true;
  } catch (error) {
    console.error('❌ Solana test validator is not running');
    console.log('Run the following command in a separate terminal:');
    console.log('solana-test-validator');
    return false;
  }
}

// Check if Anchor program has been built
function checkAnchorBuild() {
  const targetDir = path.join(__dirname, '..', 'git-solana', 'target');
  if (!fs.existsSync(targetDir)) {
    console.error('❌ Anchor build directory not found');
    console.log('Run the following commands:');
    console.log('cd ../git-solana');
    console.log('anchor build');
    return false;
  }
  
  // Check for the idl file
  const idlPath = path.join(targetDir, 'idl', 'git_solana.json');
  if (!fs.existsSync(idlPath)) {
    console.error('❌ IDL file not found');
    console.log('Run the following commands:');
    console.log('cd ../git-solana');
    console.log('anchor build');
    return false;
  }
  
  console.log('✅ Anchor program is built');
  return true;
}

// Deploy program to localnet
function deployProgram() {
  try {
    console.log('Deploying program to localnet...');
    
    // Change to the git-solana directory
    process.chdir(path.join(__dirname, '..', 'git-solana'));
    
    // Deploy the program
    execSync('anchor deploy', { stdio: 'inherit' });
    
    console.log('✅ Program deployed successfully');
    
    // Change back to the server directory
    process.chdir(path.join(__dirname));
    
    return true;
  } catch (error) {
    console.error('❌ Failed to deploy program:', error.message);
    return false;
  }
}

// Create a test repository
async function createTestRepository() {
  try {
    console.log('Creating test repository in Solana...');
    
    const solanaClient = new SolanaClient();
    const wallet = solanaClient.getWalletInfo();
    
    console.log(`Using wallet: ${wallet.publicKey}`);
    
    const repoName = 'test-repo';
    const repo = await solanaClient.createRepository(repoName);
    
    console.log(`✅ Test repository created: ${repoName}`);
    console.log('Repository data:', JSON.stringify(repo, null, 2));
    
    return true;
  } catch (error) {
    console.error('❌ Failed to create test repository:', error.message);
    return false;
  }
}

// Main function to run the setup
async function main() {
  console.log('=== Setting up Solana program ===');
  
  // Check prerequisites
  const validatorRunning = checkTestValidator();
  const programBuilt = checkAnchorBuild();
  
  if (!validatorRunning || !programBuilt) {
    console.error('❌ Please fix the issues above and try again');
    process.exit(1);
  }
  
  // Deploy program
  const deployed = deployProgram();
  if (!deployed) {
    console.error('❌ Deployment failed');
    process.exit(1);
  }
  
  // Create test repository
  const repoCreated = await createTestRepository();
  if (!repoCreated) {
    console.error('❌ Test repository creation failed');
    process.exit(1);
  }
  
  console.log('✅ Setup completed successfully');
  console.log('You can now start the Git server with:');
  console.log('npm run start:working');
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});