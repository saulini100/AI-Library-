# Startup & Reset Script Documentation

## 🚀 Overview

The `startup-reset.cjs` script is a powerful automation tool designed to manage your BibleCompanion development environment. It handles database management, server control, and provides a clean development experience.

## 📋 Quick Reference

```bash
# Default: Reset database AND start server (recommended)
node startup-reset.cjs

# Only reset database (no server start)
node startup-reset.cjs --reset

# Only start server (no database reset) 
node startup-reset.cjs --start

# Reset database then start server (explicit)
node startup-reset.cjs --reset --start

# Show help and all options
node startup-reset.cjs --help
```

## 🎯 What the Script Does

### **🛑 Smart Server Management**
- Automatically detects and stops any running processes on port 5000
- Prevents conflicts between multiple server instances
- Works on Windows, macOS, and Linux

### **🔧 Complete Database Reset**
- Deletes all existing database files:
  - `local-document-companion.db`
  - `local-document-companion.db-shm`
  - `local-document-companion.db-wal`
  - `local-bible-companion.db`
  - `local-bible-companion.db-shm`
  - `local-bible-companion.db-wal`
- Runs proper Drizzle migrations to create clean schema
- Creates default user with ID 2 for consistent development

### **🌟 Server Launch**
- Starts the development server with `npm run dev`
- Provides helpful URLs for different features
- Handles graceful shutdown with Ctrl+C

### **🎯 Error Prevention**
- Ensures clean state before starting
- Validates database creation
- Provides detailed feedback for troubleshooting

## 📖 Detailed Usage

### **Fresh Start (Recommended)**
```bash
node startup-reset.cjs
```
**Use when:**
- Starting development for the first time
- After pulling new changes from git
- When database schema has changed
- Before important testing or demos

**What happens:**
1. Stops any running servers
2. Deletes all database files
3. Creates fresh database with proper schema
4. Creates default user (ID: 2)
5. Starts development server

### **Database Reset Only**
```bash
node startup-reset.cjs --reset
```
**Use when:**
- You want to clear all data but not start the server
- Preparing for a clean test run
- Fixing database corruption issues
- Before switching to different data sets

**What happens:**
1. Stops any running servers
2. Deletes all database files
3. Creates fresh database with proper schema
4. Creates default user (ID: 2)
5. **Does NOT start the server**

### **Server Start Only**
```bash
node startup-reset.cjs --start
```
**Use when:**
- Database is already clean and ready
- You just want to restart the server
- After manual database setup
- Quick server restart without data loss

**What happens:**
1. Stops any running servers
2. **Does NOT reset database**
3. Starts development server

### **Explicit Reset + Start**
```bash
node startup-reset.cjs --reset --start
```
**Use when:**
- You want to be explicit about both operations
- Scripting or automation
- Ensuring both operations happen in sequence

**What happens:**
1. Stops any running servers
2. Deletes all database files
3. Creates fresh database with proper schema
4. Creates default user (ID: 2)
5. Starts development server

## 🔧 Advanced Features

### **Cross-Platform Support**
The script works on all major operating systems:
- **Windows**: Uses `netstat` and `taskkill`
- **macOS/Linux**: Uses `lsof` and `kill`

### **Database Management**
- **Automatic Cleanup**: Removes corrupted or outdated database files
- **Schema Migration**: Runs Drizzle migrations for proper database structure
- **User Setup**: Creates consistent default user for development
- **Validation**: Verifies database creation was successful

### **Server Control**
- **Port Detection**: Automatically finds processes on port 5000
- **Graceful Shutdown**: Handles Ctrl+C properly
- **Process Management**: Kills conflicting processes safely
- **Error Handling**: Provides clear feedback for troubleshooting

## 🚨 Troubleshooting

### **Common Issues**

#### **"Failed to run migrations"**
```bash
# Solution: Ensure dependencies are installed
npm install

# Then try again
node startup-reset.cjs --reset
```

#### **"Database file was not created"**
```bash
# Solution: Check if Drizzle is properly configured
npx drizzle-kit generate

# Then try again
node startup-reset.cjs --reset
```

#### **"Port 5000 is still in use"**
```bash
# Solution: Manually kill the process
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:5000 | xargs kill -9

# Then try again
node startup-reset.cjs
```

#### **"Permission denied"**
```bash
# Solution: Run with administrator privileges
# Windows: Run PowerShell as Administrator
# macOS/Linux: Use sudo if needed
sudo node startup-reset.cjs
```

### **Debug Mode**
For detailed debugging, you can modify the script to add more verbose output:
```javascript
// Add this line near the top of startup-reset.cjs
process.env.DEBUG = 'true';
```

## 📊 Expected Output

### **Successful Reset + Start**
```
🚀 Bible Companion Startup & Reset Script
==========================================
🛑 Stopping any running servers...
   ✅ Servers stopped
🔧 Resetting database...
   ✅ Deleted ./local-document-companion.db
   ✅ Deleted ./local-document-companion.db-shm
   ✅ Deleted ./local-document-companion.db-wal
   📊 Creating database schema with Drizzle migrations...
   ✅ Database schema created successfully
   ✅ Database file created successfully
   👤 Creating default user with ID 2...
   ✅ Default user created with ID 2
✅ Database reset completed successfully!

🌟 Starting Bible Companion server...

💡 Server will be available at: http://localhost:5000
🤖 Agent system: http://localhost:5000/api/intelligence
📊 Performance monitoring: http://localhost:5000/api/performance

Press Ctrl+C to stop the server
=====================================
```

### **Reset Only**
```
🚀 Bible Companion Startup & Reset Script
==========================================
🛑 Stopping any running servers...
   ✅ Servers stopped
🔧 Resetting database...
   ✅ Deleted ./local-document-companion.db
   ✅ Deleted ./local-document-companion.db-shm
   ✅ Deleted ./local-document-companion.db-wal
   📊 Creating database schema with Drizzle migrations...
   ✅ Database schema created successfully
   ✅ Database file created successfully
   👤 Creating default user with ID 2...
   ✅ Default user created with ID 2
✅ Database reset completed successfully!

🎉 Database reset completed! Run with --start to launch the server.
```

## 🎯 Best Practices

### **Development Workflow**
1. **Start of day**: `node startup-reset.cjs`
2. **After git pull**: `node startup-reset.cjs`
3. **Before testing**: `node startup-reset.cjs --reset`
4. **Quick restart**: `node startup-reset.cjs --start`

### **Competition/Demo Preparation**
```bash
# Ensure completely clean state
node startup-reset.cjs --reset
# Verify everything works
node startup-reset.cjs --start
```

### **Troubleshooting Workflow**
```bash
# 1. Try reset + start
node startup-reset.cjs

# 2. If that fails, try reset only
node startup-reset.cjs --reset

# 3. Check for errors, then start manually
npm run dev
```

## 🔗 Related Files

- **`startup-reset.cjs`**: The main script
- **`drizzle.config.ts`**: Database configuration
- **`package.json`**: Scripts and dependencies
- **`.gitignore`**: Excludes database files from version control

## 📞 Support

If you encounter issues with the script:
1. Check the troubleshooting section above
2. Ensure all dependencies are installed: `npm install`
3. Verify Node.js version: `node --version`
4. Check if Ollama is running: `ollama list`

The script is designed to be robust and provide clear feedback for any issues that arise. 