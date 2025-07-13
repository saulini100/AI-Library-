import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

// Get the directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file in the root directory if it exists
// In packaged apps, look for .env in multiple possible locations
let envPath = join(__dirname, '..', '.env');

// If not found, try alternative paths for packaged apps
if (!existsSync(envPath)) {
  const possiblePaths = [
    // Development path
    join(__dirname, '..', '.env'),
    // Packaged app paths - check extraResources location first
    join((process as any).resourcesPath || '', '.env'),
    join((process as any).resourcesPath || '', 'app.asar.unpacked', '.env'),
    join(process.cwd(), '.env'),
    join(process.cwd(), '..', '.env'),
    // Additional fallback paths
    join(__dirname, '..', '..', '.env'),
    join(__dirname, '..', '..', '..', '.env'),
    // Check if we're in the dist directory
    join(__dirname, '..', '..', '..', '.env'),
    join(__dirname, '..', '..', '..', '..', '.env')
  ];
  
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      envPath = path;
      break;
    }
  }
}

if (existsSync(envPath)) {
  config({ path: envPath });
  console.log('🔑 Environment variables loaded from:', envPath);
} else {
  console.log('🔑 No .env file found, using defaults');
  console.log('🔑 Searched paths:', [
    join(__dirname, '..', '.env'),
    join((process as any).resourcesPath || '', '.env'),
    join((process as any).resourcesPath || '', 'app.asar.unpacked', '.env'),
    join(process.cwd(), '.env'),
    join(__dirname, '..', '..', '..', '.env')
  ]);
}

// Set safe defaults for production
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = "default_session_secret_for_development";
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

console.log('Environment setup complete.');

export {}; // Make this a module 