/**
 * Simple test script for cloning a repo from our server
 */
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Create a temp directory for the test
const testDir = path.join(os.tmpdir(), 'git-test-' + Date.now());
fs.mkdirSync(testDir, { recursive: true });

console.log(`Created test directory: ${testDir}`);

// Clone a repository
const repoUrl = 'http://localhost:5000/4Kn1P7n6JwGHDm8KvtEickWbA4A3aWzaQn1tNPtyANGh/testrepo';
const cloneCmd = `cd ${testDir} && git clone ${repoUrl} && cd testrepo && echo "Test content" > test.txt && git add . && git commit -m "Test commit" && git push`;

console.log(`Running: ${cloneCmd}`);

exec(cloneCmd, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
  console.log('STDOUT:', stdout);
  
  if (stderr) {
    console.log('STDERR:', stderr);
  }
  
  if (error) {
    console.error('ERROR:', error);
  } else {
    console.log('Git operations completed successfully');
  }
  
  console.log(`Test files in ${testDir}`);
});