#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const signer = require('./signer');
const installer = require('./installer');
const fs = require('fs');
const path = require('path');

async function main() {
  const argv = yargs(hideBin(process.argv))
    .command('sign', 'Sign a Solana transaction for a git push', (yargs) => {
      return yargs
        .option('owner', {
          description: 'Repository owner',
          type: 'string',
          demandOption: true
        })
        .option('repo', {
          description: 'Repository name',
          type: 'string',
          demandOption: true
        })
        .option('branch', {
          description: 'Branch name',
          type: 'string',
          demandOption: true
        })
        .option('commit', {
          description: 'Commit hash',
          type: 'string',
          demandOption: true
        })
        .option('server', {
          description: 'Server URL',
          type: 'string',
          default: 'http://localhost:5003'
        })
        .option('method', {
          description: 'Signing method: cli, browser, qrcode',
          type: 'string',
          default: process.env.SOLAR_SIGN_METHOD || 'cli'
        });
    })
    .command('install', 'Install the pre-push Git hook', (yargs) => {
      return yargs
        .option('server', {
          description: 'Server URL',
          type: 'string',
          default: 'http://localhost:5003'
        });
    })
    .demandCommand(1, 'You need to specify a command')
    .help()
    .argv;

  const command = argv._[0];

  try {
    if (command === 'sign') {
      const signature = await signer.signTransaction(
        argv.owner,
        argv.repo,
        argv.branch,
        argv.commit,
        argv.server,
        argv.method
      );

      if (signature) {
        console.log(signature);
        return 0;
      } else {
        console.error('Failed to sign transaction');
        return 1;
      }
    } else if (command === 'install') {
      const installed = await installer.installHook(argv.server);
      if (installed) {
        return 0;
      } else {
        return 1;
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    return 1;
  }

  return 0;
}

main()
  .then(exitCode => process.exit(exitCode))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });