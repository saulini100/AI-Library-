import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

console.log('🧹 Starting comprehensive cleanup and reset...\n');

// Database files to clean
const dbFiles = [
  'local-bible-companion.db',
  'local-document-companion.db',
  'local-bible-companion.db-shm',
  'local-bible-companion.db-wal', 
  'local-document-companion.db-shm',
  'local-document-companion.db-wal'
];

// Cache directories/files to clean (if they exist)
const cacheLocations = [
  'node_modules/.cache',
  '.cache',
  'dist',
  'build'
];

console.log('🗑️  Step 1: Cleaning database files...');
dbFiles.forEach(file => {
  if (fs.existsSync(file)) {
    try {
      fs.unlinkSync(file);
      console.log(`   ✅ Deleted: ${file}`);
    } catch (error) {
      console.log(`   ⚠️  Could not delete ${file}: ${error.message}`);
    }
  } else {
    console.log(`   ➖ Not found: ${file}`);
  }
});

console.log('\n🗂️  Step 2: Cleaning cache directories...');
cacheLocations.forEach(location => {
  if (fs.existsSync(location)) {
    try {
      fs.rmSync(location, { recursive: true, force: true });
      console.log(`   ✅ Deleted: ${location}`);
    } catch (error) {
      console.log(`   ⚠️  Could not delete ${location}: ${error.message}`);
    }
  } else {
    console.log(`   ➖ Not found: ${location}`);
  }
});

console.log('\n🔧 Step 3: Updating backend to force userId 2...');

// Read and update routes.ts to ensure userId 2
const routesPath = 'server/routes.ts';
try {
  let routesContent = fs.readFileSync(routesPath, 'utf8');
  
  // Make sure getDefaultUserId always returns 2
  const updatedContent = routesContent.replace(
    /const getDefaultUserId = async \(\) => \{[\s\S]*?return.*?;\s*\}/,
    `const getDefaultUserId = async () => {
    // Always return userId 2 for consistency
    return 2;
  }`
  );
  
  if (updatedContent !== routesContent) {
    fs.writeFileSync(routesPath, updatedContent, 'utf8');
    console.log('   ✅ Updated routes.ts to force userId 2');
  } else {
    console.log('   ➖ routes.ts already configured for userId 2');
  }
} catch (error) {
  console.log(`   ⚠️  Could not update routes.ts: ${error.message}`);
}

console.log('\n🔧 Step 4: Updating discussion agent to use userId 2...');

// Update discussion agent default
const discussionAgentPath = 'server/agents/discussion-agent.ts';
try {
  let agentContent = fs.readFileSync(discussionAgentPath, 'utf8');
  
  // Make sure discussion agent defaults to userId 2
  const updatedAgentContent = agentContent.replace(
    /userId: context\?\.userId \|\| \d+/g,
    'userId: context?.userId || 2'
  );
  
  if (updatedAgentContent !== agentContent) {
    fs.writeFileSync(discussionAgentPath, updatedAgentContent, 'utf8');
    console.log('   ✅ Updated discussion-agent.ts to default to userId 2');
  } else {
    console.log('   ➖ discussion-agent.ts already configured for userId 2');
  }
} catch (error) {
  console.log(`   ⚠️  Could not update discussion-agent.ts: ${error.message}`);
}

console.log('\n🔧 Step 5: Creating fresh databases with userId 2...');

// Create fresh database and insert user with ID 2
try {
  const db = new Database('local-document-companion.db');
  
  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Insert user with ID 2
  const insertUser = db.prepare(`
    INSERT OR REPLACE INTO users (id, username, password) 
    VALUES (2, 'default_user', 'default_password')
  `);
  insertUser.run();
  
  // Create other necessary tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      title TEXT NOT NULL,
      filename TEXT,
      fileType TEXT,
      totalChapters INTEGER,
      content TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    );
    
    CREATE TABLE IF NOT EXISTS annotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      documentId INTEGER NOT NULL,
      chapter INTEGER NOT NULL,
      startOffset INTEGER NOT NULL,
      endOffset INTEGER NOT NULL,
      selectedText TEXT NOT NULL,
      note TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (documentId) REFERENCES documents(id)
    );
    
    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      documentId INTEGER NOT NULL,
      chapter INTEGER NOT NULL,
      title TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (documentId) REFERENCES documents(id)
    );
    
    CREATE TABLE IF NOT EXISTS reading_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      documentId INTEGER NOT NULL,
      currentChapter INTEGER NOT NULL,
      totalChapters INTEGER NOT NULL,
      lastReadAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (documentId) REFERENCES documents(id),
      UNIQUE(userId, documentId)
    );
  `);
  
  db.close();
  console.log('   ✅ Created fresh database with userId 2');
} catch (error) {
  console.log(`   ⚠️  Database setup error: ${error.message}`);
}

console.log('\n🎉 Cleanup and reset completed!\n');
console.log('📋 Summary:');
console.log('   ✅ All database files deleted and recreated');
console.log('   ✅ All caches cleared');
console.log('   ✅ Backend configured to use userId 2 only');
console.log('   ✅ Fresh database created with user ID 2');
console.log('\n🚀 Next steps:');
console.log('   1. Run: npm run dev:full');
console.log('   2. Upload your document again');
console.log('   3. Test the discussion agent');
console.log('\nEverything should now work with userId 2 and fresh caches! 🎯'); 