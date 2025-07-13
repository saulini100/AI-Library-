#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Bible Companion Startup & Reset Script');
console.log('==========================================');

// Parse command line arguments
const args = process.argv.slice(2);
const shouldReset = args.includes('--reset') || args.includes('-r');
const shouldStart = args.includes('--start') || args.includes('-s') || args.length === 0;
const shouldHelp = args.includes('--help') || args.includes('-h');

if (shouldHelp) {
  console.log('');
  console.log('📖 Usage:');
  console.log('  node startup-reset.cjs                    # Reset database and start server');
  console.log('  node startup-reset.cjs --reset            # Only reset database');
  console.log('  node startup-reset.cjs --start            # Only start server');
  console.log('  node startup-reset.cjs --reset --start    # Reset database then start server');
  console.log('  node startup-reset.cjs --help             # Show this help');
  console.log('');
  process.exit(0);
}

// Function to stop any running servers
function stopServers() {
  console.log('🛑 Stopping any running servers...');
  try {
    if (process.platform === 'win32') {
      // Windows: Find and kill processes on port 5000
      try {
        const result = execSync('netstat -ano | findstr :5000', { encoding: 'utf8' });
        const lines = result.split('\n').filter(line => line.includes(':5000'));
        
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0') {
            try {
              execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
              console.log(`   ✅ Stopped process ${pid}`);
            } catch (e) {
              // Process might already be dead
            }
          }
        });
      } catch (e) {
        // No processes found on port 5000
      }
    } else {
      // Unix/Linux/Mac
      execSync('lsof -ti:5000 | xargs kill -9', { stdio: 'ignore' });
    }
    console.log('   ✅ Servers stopped');
  } catch (e) {
    console.log('   ℹ️  No servers to stop');
  }
}

// Function to reset database
function resetDatabase() {
  console.log('🔧 Resetting database...');
  
  // Delete existing database files
  const dbFiles = [
    './local-document-companion.db',
    './local-document-companion.db-shm', 
    './local-document-companion.db-wal',
    './local-bible-companion.db',
    './local-bible-companion.db-shm',
    './local-bible-companion.db-wal'
  ];

  let deletedFiles = 0;
  dbFiles.forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`   ✅ Deleted ${file}`);
      deletedFiles++;
    }
  });
  
  if (deletedFiles === 0) {
    console.log('   ℹ️  No database files to delete');
  }

  // Run Drizzle migrations to create proper schema
  console.log('   📊 Creating database schema with Drizzle migrations...');
  try {
    execSync('npx drizzle-kit migrate', { stdio: 'inherit' });
    console.log('   ✅ Database schema created successfully');
  } catch (error) {
    console.error('   ❌ Failed to run migrations:', error.message);
    process.exit(1);
  }

  // Verify the database was created
  if (fs.existsSync('./local-document-companion.db')) {
    console.log('   ✅ Database file created successfully');
  } else {
    console.error('   ❌ Database file was not created');
    process.exit(1);
  }

  // Insert default user with ID 2
  console.log('   👤 Creating default user with ID 2...');
  try {
    const Database = require('better-sqlite3');
    const db = new Database('./local-document-companion.db');
    
    // Insert user with specific ID 2
    const insertUser = db.prepare(`
      INSERT INTO users (id, username, password) 
      VALUES (2, 'demo_user', 'demo_hash')
    `);
    
    try {
      insertUser.run();
      console.log('   ✅ Default user created with ID 2');
    } catch (e) {
      if (e.message.includes('UNIQUE constraint failed')) {
        console.log('   ✅ User with ID 2 already exists');
      } else {
        throw e;
      }
    }
    
    db.close();
  } catch (error) {
    console.error('   ❌ Failed to create default user:', error.message);
    process.exit(1);
  }
  
  console.log('✅ Database reset completed successfully!');
}

// Function to start the server
function startServer() {
  console.log('🌟 Starting Bible Companion server...');
  console.log('');
  console.log('💡 Server will be available at: http://localhost:5000');
  console.log('🤖 Agent system: http://localhost:5000/api/intelligence');
  console.log('📊 Performance monitoring: http://localhost:5000/api/performance');
  console.log('');
  console.log('Press Ctrl+C to stop the server');
  console.log('=====================================');
  
  // Start the development server
  const serverProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
  });
  
  // Handle server process exit
  serverProcess.on('close', (code) => {
    console.log('');
    console.log(`🛑 Server stopped with exit code ${code}`);
  });
  
  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('');
    console.log('🛑 Stopping server...');
    serverProcess.kill('SIGINT');
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  });
}

// Main execution
(async () => {
  try {
    // Always stop servers first to prevent conflicts
    stopServers();
    
    // Wait a moment for processes to fully stop
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (shouldReset) {
      resetDatabase();
      console.log('');
    }
    
    if (shouldStart) {
      startServer();
    } else if (shouldReset) {
      console.log('🎉 Database reset completed! Run with --start to launch the server.');
    }
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
})(); 