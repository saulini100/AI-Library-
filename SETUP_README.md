# 🚀 DocumentCompanion Setup Scripts

This repository includes automated setup scripts that will install and run the DocumentCompanion app on any computer with minimal manual intervention.

## 📋 Prerequisites

### System Requirements
- **RAM**: Minimum 8GB (16GB recommended)
- **Storage**: At least 10GB free space
- **OS**: Windows 10+, macOS 10.14+, or Linux
- **Internet**: Stable connection for downloading AI models

### Required Software
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Ollama** - [Download here](https://ollama.ai/)

## 🎯 Quick Start

### For Windows Users
1. **Download the project** to your computer
2. **Open Command Prompt** as Administrator
3. **Navigate to the project folder**
4. **Run the setup script**:
   ```cmd
   setup.bat
   ```

### For macOS/Linux Users
1. **Download the project** to your computer
2. **Open Terminal**
3. **Navigate to the project folder**
4. **Make the script executable and run it**:
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

## 🔧 What the Scripts Do

### Automatic Installation
- ✅ **Check system requirements** (RAM, disk space, OS)
- ✅ **Install Node.js** (if not already installed)
- ✅ **Install Ollama** (if not already installed)
- ✅ **Download AI models** (Gemma3n primary models + supporting models)
- ✅ **Install project dependencies** (npm packages)
- ✅ **Setup database** (run migrations)
- ✅ **Create configuration files** (.env, logs directory)

### Automatic Configuration
- ✅ **Environment setup** (.env file with all necessary variables)
- ✅ **Database initialization** (SQLite database with schema)
- ✅ **AI model verification** (ensures all models are available)
- ✅ **Service creation** (systemd/launchd services for auto-start)

### User Experience
- ✅ **Desktop shortcuts** (easy access to the application)
- ✅ **Startup scripts** (one-click application launch)
- ✅ **Logging setup** (organized log files)
- ✅ **Error handling** (comprehensive error messages)

## 🎮 Usage After Setup

### Starting the Application

#### Windows
```cmd
# Option 1: Use the desktop shortcut
DocumentCompanion.bat

# Option 2: Use the startup script
start-app.bat

# Option 3: Manual start
npm run dev:full
```

#### macOS/Linux
```bash
# Option 1: Use the startup script
./start-app.sh

# Option 2: Manual start
npm run dev:full
```

### Accessing the Application
- **Web Interface**: http://localhost:3000
- **AI Agents**: http://localhost:3001 (WebSocket)
- **API Documentation**: Available in the web interface

## 🤖 AI Models Included

The setup scripts automatically download these AI models:

| Model | Size | Purpose | Performance |
|-------|------|---------|-------------|
| **gemma3n:e4b** | ~8GB | Advanced reasoning and thesis analysis | Superior reasoning |
| **gemma3n:e2b** | ~4GB | Fast reasoning and text analysis | High accuracy |
| **nomic-embed-text:v1.5** | ~1GB | Semantic embeddings and vector search | Excellent embeddings |
| **qwen2.5vl:7b** | ~7GB | Vision analysis for document layout | Superior vision |
| **phi3.5:3.8b-mini-instruct-q8_0** | ~3GB | Fast reasoning and structured analysis | High speed |

## 🏗️ System Architecture

### What Gets Installed
```
DocumentCompanion/
├── 📁 client/              # React frontend
├── 📁 server/              # Node.js backend
├── 📁 shared/              # Shared types/schemas
├── 📁 logs/                # Application logs
├── 📄 .env                 # Environment configuration
├── 📄 start-app.sh         # Startup script (Linux/macOS)
├── 📄 start-app.bat        # Startup script (Windows)
└── 📄 setup.sh/setup.bat   # Setup scripts
```

### Services Created
- **System Service**: Auto-start on boot (Linux/macOS)
- **Desktop Shortcut**: Easy access from desktop
- **Log Management**: Organized log files
- **Health Monitoring**: Automatic health checks

## 🔍 Troubleshooting

### Common Issues

#### 1. Node.js Not Found
**Error**: `Node.js not found`
**Solution**: 
- Download Node.js from https://nodejs.org/
- Restart your terminal/command prompt
- Run the setup script again

#### 2. Ollama Not Found
**Error**: `Ollama not found`
**Solution**:
- Download Ollama from https://ollama.ai/
- Restart your terminal/command prompt
- Run the setup script again

#### 3. Insufficient Disk Space
**Error**: `Insufficient disk space`
**Solution**:
- Free up at least 10GB of disk space
- Run the setup script again

#### 4. Insufficient RAM
**Warning**: `Recommended: At least 8GB RAM`
**Solution**:
- Close other applications to free up RAM
- Consider upgrading your system RAM
- The app will still work with 4GB but may be slower

#### 5. AI Models Download Failed
**Error**: `Failed to download models`
**Solution**:
- Check your internet connection
- Try running the setup script again
- Models can be downloaded manually: `ollama pull gemma3n:e2b`

#### 6. Port Already in Use
**Error**: `Port 3000 is already in use`
**Solution**:
- Close other applications using port 3000
- Or change the port in `.env` file: `PORT=3001`

### Debug Mode

#### Enable Debug Logging
```bash
# Linux/macOS
export AGENT_LOG_LEVEL=debug
./start-app.sh

# Windows
set AGENT_LOG_LEVEL=debug
start-app.bat
```

#### Check Logs
```bash
# Application logs
cat logs/app.log

# Error logs
cat logs/error.log
```

## 🚀 Advanced Configuration

### Environment Variables
Edit `.env` file to customize the application:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# AI Configuration
OLLAMA_HOST=localhost
OLLAMA_PORT=11434
OLLAMA_MODEL=gemma3n:e2b

# Agent Configuration
AGENT_LOG_LEVEL=info
WEBSOCKET_PORT=3001

# Performance Configuration
MAX_CONCURRENT_TASKS=10
CACHE_TTL=900000
```

### Custom AI Models
Add your own AI models:

```bash
# Download custom model
ollama pull your-custom-model

# Update .env file
OLLAMA_MODEL=your-custom-model
```

### Production Deployment
For production deployment:

```bash
# Build the application
npm run build

# Start in production mode
npm run start
```

## 📊 Performance Optimization

### System Recommendations
- **RAM**: 16GB+ for optimal performance
- **CPU**: Multi-core processor
- **Storage**: SSD for faster model loading
- **GPU**: Optional for faster AI inference

### Performance Tuning
```env
# Increase concurrent tasks
MAX_CONCURRENT_TASKS=20

# Increase cache TTL
CACHE_TTL=1800000

# Enable performance mode
NODE_ENV=production
```

## 🔒 Security Considerations

### Local Processing
- All AI processing happens locally on your machine
- No data is sent to external servers
- Your documents and conversations remain private

### Network Security
- WebSocket connections are local only
- No external network access required
- Firewall-friendly configuration

### Data Protection
- SQLite database is local only
- Logs are stored locally
- No cloud dependencies

## 📈 Monitoring and Maintenance

### Health Checks
```bash
# Check if Ollama is running
ollama list

# Check application status
curl http://localhost:3000/health

# Check agent status
curl http://localhost:3001/status
```

### Log Rotation
```bash
# Rotate logs (Linux/macOS)
logrotate /etc/logrotate.d/documentcompanion

# Manual log cleanup
find logs/ -name "*.log" -mtime +7 -delete
```

### Updates
```bash
# Update the application
git pull origin main
npm install
npm run build

# Update AI models
ollama pull gemma3n:e2b
```

## 🆘 Support

### Getting Help
1. **Check the logs**: `logs/app.log` and `logs/error.log`
2. **Verify requirements**: Node.js, Ollama, sufficient resources
3. **Restart services**: Stop and restart the application
4. **Re-run setup**: Run the setup script again

### Community Support
- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check the docs folder for detailed guides
- **Discussions**: Join community discussions

## 🎉 Success!

After running the setup script, you'll have:

✅ **Fully functional DocumentCompanion** with 8 AI agents  
✅ **All AI models downloaded** and ready to use  
✅ **Desktop shortcuts** for easy access  
✅ **System services** for auto-start  
✅ **Comprehensive logging** for monitoring  
✅ **Production-ready configuration**  

**Access your application at**: http://localhost:3000

**Happy Learning! 🎓📚** 