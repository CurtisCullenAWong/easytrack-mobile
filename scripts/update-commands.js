#!/usr/bin/env node

/**
 * EasyTrack Update Management Script
 * 
 * This script provides common commands for managing Expo Updates
 */

const { execSync } = require('child_process');

const commands = {
  // Check current update status
  status: () => {
    console.log('Checking update status...');
    try {
      execSync('eas update:view', { stdio: 'inherit' });
    } catch (error) {
      console.error('Error checking status:', error.message);
    }
  },

  // Publish to development channel
  dev: (message = 'Development update') => {
    console.log('Publishing to development channel...');
    try {
      execSync(`eas update --branch development --message "${message}"`, { stdio: 'inherit' });
    } catch (error) {
      console.error('Error publishing to development:', error.message);
    }
  },

  // Publish to preview channel
  preview: (message = 'Preview update') => {
    console.log('Publishing to preview channel...');
    try {
      execSync(`eas update --branch preview --message "${message}"`, { stdio: 'inherit' });
    } catch (error) {
      console.error('Error publishing to preview:', error.message);
    }
  },

  // Publish to production channel
  prod: (message = 'Production update') => {
    console.log('Publishing to production channel...');
    try {
      execSync(`eas update --branch production --message "${message}"`, { stdio: 'inherit' });
    } catch (error) {
      console.error('Error publishing to production:', error.message);
    }
  },

  // Build development client
  buildDev: (platform = 'android') => {
    console.log(`Building development client for ${platform}...`);
    try {
      execSync(`eas build --profile development --platform ${platform}`, { stdio: 'inherit' });
    } catch (error) {
      console.error('Error building development client:', error.message);
    }
  },

  // Build preview client
  buildPreview: (platform = 'android') => {
    console.log(`Building preview client for ${platform}...`);
    try {
      execSync(`eas build --profile preview --platform ${platform}`, { stdio: 'inherit' });
    } catch (error) {
      console.error('Error building preview client:', error.message);
    }
  },

  // Build production client
  buildProd: (platform = 'android') => {
    console.log(`Building production client for ${platform}...`);
    try {
      execSync(`eas build --profile production --platform ${platform}`, { stdio: 'inherit' });
    } catch (error) {
      console.error('Error building production client:', error.message);
    }
  },

  // Show help
  help: () => {
    console.log(`
EasyTrack Update Management Commands:

Usage: node scripts/update-commands.js <command> [options]

Commands:
  status                    - Check current update status
  dev [message]            - Publish to development channel
  preview [message]        - Publish to preview channel
  prod [message]           - Publish to production channel
  buildDev [platform]      - Build development client (android/ios)
  buildPreview [platform]  - Build preview client (android/ios)
  buildProd [platform]     - Build production client (android/ios)
  help                     - Show this help message

Examples:
  node scripts/update-commands.js dev "Bug fixes"
  node scripts/update-commands.js preview "New features"
  node scripts/update-commands.js prod "Major release"
  node scripts/update-commands.js buildDev android
  node scripts/update-commands.js buildProd ios
    `);
  }
};

// Get command from command line arguments
const command = process.argv[2];
const args = process.argv.slice(3);

if (!command || command === 'help') {
  commands.help();
} else if (commands[command]) {
  commands[command](...args);
} else {
  console.error(`Unknown command: ${command}`);
  console.log('Run "node scripts/update-commands.js help" for available commands');
}
