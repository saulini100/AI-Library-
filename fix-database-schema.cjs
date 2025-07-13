#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Database Schema Fix Script');
console.log('==============================');

// Stop the server first
console.log('1. Stopping any running servers...');
try {
  // Kill any processes running on port 5000
  if (process.platform === 'win32') {
    execSync('netstat -ano | findstr :5000 | for /f "tokens=5" %a in (\'more\') do taskkill /PID %a /F', { stdio: 'ignore' });
  } else {
    execSync('lsof -ti:5000 | xargs kill -9', { stdio: 'ignore' });
  }
} catch (e) {
  console.log('   No servers to stop (or failed to stop - continuing anyway)');
}

// Delete existing database files
console.log('2. Removing corrupted database files...');
const dbFiles = [
  './local-document-companion.db',
  './local-document-companion.db-shm', 
  './local-document-companion.db-wal',
  './local-bible-companion.db',
  './local-bible-companion.db-shm',
  './local-bible-companion.db-wal'
];

dbFiles.forEach(file => {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`   ✅ Deleted ${file}`);
  }
});

// Run Drizzle migrations to create proper schema
console.log('3. Creating proper database schema with Drizzle migrations...');
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
console.log('4. Creating default user with ID 2...');
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

console.log('');
console.log('🎉 Database schema fix completed successfully!');
console.log('');
console.log('✅ Next steps:');
console.log('   1. Start your server with: npm run dev');
console.log('   2. All uploads will now be assigned to userId = 2');
console.log('   3. The Discussion Agent will find documents properly');
console.log(''); 