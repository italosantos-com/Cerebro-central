// filepath: /Users/italosanta/Downloads/download (2)/scripts/inject-env.js
const fs = require('fs');
const path = require('path');

// Example: Inject environment variables into a config file
const envVars = {
  API_KEY: process.env.API_KEY || 'default-key',
  // Add other vars
};

const configPath = path.join(__dirname, '..', '.env.local');
const configContent = Object.entries(envVars)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n');

fs.writeFileSync(configPath, configContent);
console.log('Environment variables injected.');