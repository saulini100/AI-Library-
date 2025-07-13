# DocumentCompanion Setup & Deployment Guide

## 📋 Table of Contents

- [🔧 Prerequisites](#-prerequisites)
- [⚡ Quick Start](#-quick-start)
- [🏗️ Development Setup](#️-development-setup)
- [🤖 AI Services Configuration](#-ai-services-configuration)
- [🗄️ Database Setup](#️-database-setup)
- [🌐 Environment Configuration](#-environment-configuration)
- [🚀 Production Deployment](#-production-deployment)
- [🔒 Security Configuration](#-security-configuration)
- [📊 Monitoring Setup](#-monitoring-setup)
- [🐛 Troubleshooting](#-troubleshooting)

## 🔧 Prerequisites

### **System Requirements**
- **Operating System**: Windows 10/11, macOS 10.15+, or Linux (Ubuntu 20.04+)
- **Node.js**: Version 18.0.0 or higher (as specified in `package.json`)
- **RAM**: 8GB minimum (16GB recommended for AI features)
- **Storage**: 10GB free space
- **CPU**: Multi-core processor (4+ cores recommended)

### **Required Software**
- **Node.js & npm**: [Download here](https://nodejs.org/)
- **Git**: [Download here](https://git-scm.com/)
- **Ollama**: [Download here](https://ollama.ai/) (for AI features)

### **Optional Tools**
- **Docker**: For containerized deployment
- **PM2**: For production process management
- **nginx**: For reverse proxy setup

## ⚡ Quick Start

### **1. Clone & Install**
```bash
# Clone the repository
git clone https://github.com/your-username/DocumentCompanion.git
cd DocumentCompanion

# Install dependencies
npm install
```

### **2. Setup Database**
```bash
# Generate database schema
npm run db:generate

# Run database migrations
npm run db:migrate
```

### **3. Install AI Services**
```bash
# Install Ollama (if not already installed)
# On macOS/Linux:
curl -fsSL https://ollama.ai/install.sh | sh

# On Windows:
# Download from https://ollama.ai/

# Pull recommended AI models
ollama pull gemma3n:e2b
ollama pull qwen2.5:7b-instruct
ollama pull llama3.2:3b
```

### **4. Start Development Server**
```bash
# Start basic development server
npm run dev

# OR start full system with AI agents and MCP server
npm run dev:full

# Access the application
open http://localhost:5000
```

## 🏗️ Development Setup

### **Project Structure**
```
DocumentCompanion/
├── client/                 # Frontend React app
├── server/                 # Backend Node.js app
├── shared/                 # Shared TypeScript types
├── migrations/             # Database migrations
├── docs/                   # Documentation
├── package.json            # Dependencies
└── README.md               # Main documentation
```

### **Development Scripts**
```bash
# Start development server
npm run dev

# Start with AI agents and MCP server
npm run dev:full

# Start the agent manager service
npm run agents:start

# Start the MCP server
npm run mcp:server

# Type checking
npm run check

# Database operations
npm run db:generate        # Generate schema
npm run db:migrate         # Run migrations
npm run db:studio          # Database GUI

# Build for production
npm run build

# Start production server
npm start

# Reset all data
npm run reset
```

### **IDE Configuration**

#### **VS Code Extensions**
- TypeScript and JavaScript Language Features
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- Prettier - Code formatter
- ESLint
- Auto Rename Tag

#### **VS Code Settings**
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "tailwindCSS.experimental.classRegex": [
    "class\\s*:\\s*[\"']([^\"']*)[\"']",
    "className\\s*:\\s*[\"']([^\"']*)[\"']"
  ]
}
```

## 🤖 AI Services Configuration

The application is configured to use Ollama for AI services by default. Ensure Ollama is installed and running before starting the application.

### **Ollama Installation**

#### **macOS/Linux**
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
ollama serve

# Pull required models (gemma3n:e2b is the default)
ollama pull gemma3n:e2b
ollama pull qwen2.5:7b-instruct
ollama pull llama3.2:3b
```

#### **Windows**
```powershell
# Download and install Ollama from https://ollama.ai/

# Start Ollama (usually auto-starts)
# If not, run: ollama serve

# Pull models
ollama pull gemma3n:e2b
ollama pull qwen2.5:7b-instruct
ollama pull llama3.2:3b
```

### **Model Configuration**
The application uses `gemma3n:e2b` by default. You can change the default model by setting the `OLLAMA_MODEL` environment variable.

```bash
# List available models
ollama list

# Test model functionality
ollama run gemma3n:e2b "Hello, how are you?"

# Remove unused models to save space
ollama rm model-name
```

### **AI Service Verification**
```bash
# Test Ollama connectivity
curl http://localhost:11434/api/tags
```

## 🗄️ Database Setup

### **SQLite Configuration**
The project uses SQLite for local development and deployment. The database file `local-document-companion.db` is automatically created in the project root.

#### **Database Schema Generation**
```bash
# Generate schema from TypeScript types
npm run db:generate

# This creates migration files in migrations/
```

#### **Running Migrations**
```bash
# Apply all pending migrations
npm run db:migrate
```

#### **Database Studio**
```bash
# Open Drizzle Studio for database management
npm run db:studio

# Access at: http://localhost:4983
```

## 🌐 Environment Configuration
The application is designed to run with zero configuration out-of-the-box, using sensible defaults for all services.

For advanced customization, you can use environment variables. Create a `.env` file in the project root to override the default settings.

### **Key Environment Variables**
- `PORT`: The port for the application server (default: `5000`).
- `OLLAMA_HOST`: The hostname for the Ollama service (default: `localhost`).
- `OLLAMA_PORT`: The port for the Ollama service (default: `11434`).
- `OLLAMA_MODEL`: The default Ollama model to use (default: `gemma3n:e2b`).
- `LOG_LEVEL`: The application log level (default: `info`).
# Removed: AI Together integration - now using local Ollama models only for better privacy and zero cost.
- `MEM0_API_KEY`: API Key for Mem0.ai to enable cloud memory.

## 🚀 Production Deployment

### **1. Build Application**
```bash
# Build frontend and backend
npm run build
```

### **2. Configure Production Environment**
- Create a `.env` file in the `dist/` folder with production settings.
- Ensure `NODE_ENV` is set to `production`.
- Set a strong, random `SESSION_SECRET`.

### **3. Start Server with PM2**
```bash
# Install PM2 globally
npm install pm2 -g

# Start the application
pm2 start dist/index.js --name "DocumentCompanion"
```

### **4. Setup Reverse Proxy (nginx)**
Configure nginx to proxy requests to the Node.js application for better performance, security, and load balancing.

## 🔒 Security Configuration

- **Session Secret**: Always use a strong, unique `SESSION_SECRET` in production.
- **CORS**: Configure `CORS_ORIGIN` to restrict access to your frontend domain.
- **Data Validation**: All API inputs are validated using Zod schemas.
- **HTTPS**: Use HTTPS in production by configuring it in your reverse proxy (nginx).

## 📊 Monitoring Setup

### **Logging**
- The application uses a custom logger (`shared/logger.ts`).
- By default, logs are printed to the console.
- In production, configure a logging service like Winston or Pino for structured logging to files or a logging service.

### **Health Checks**
- The application has a basic health check endpoint at `/api/health`.
- Configure a monitoring service to periodically check this endpoint.

## 🐛 Troubleshooting

- **"Ollama connection refused"**: Ensure Ollama is running and accessible at `http://localhost:11434`.
- **"Database connection error"**: Check file permissions for `local-document-companion.db`.
- **"Port already in use"**: Change the `PORT` environment variable if `5000` is occupied.
- **AI model issues**: Ensure you have pulled the required Ollama models and they are listed when you run `ollama list`.

## 🔧 Advanced Configuration

### **Custom AI Models**
```bash
# Download custom model
ollama pull your-custom-model

# Configure in .env
OLLAMA_MODEL=your-custom-model
```

### **Performance Tuning**
```env
# Optimize for performance
ENABLE_CACHING=true
CACHE_SIZE=2000
CACHE_TTL=7200

# Database optimization
DB_POOL_SIZE=10
DB_TIMEOUT=30000

# AI optimization
AI_PARALLEL_REQUESTS=3
AI_MAX_TOKENS=1024
```

### **Load Balancing**
```nginx
# nginx configuration
upstream documentcompanion {
    server 127.0.0.1:5000;
    server 127.0.0.1:5001;
    server 127.0.0.1:5002;
}

server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://documentcompanion;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📋 Deployment Checklist

### **Pre-Deployment**
- [ ] All dependencies installed
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] AI models downloaded and tested
- [ ] Security configurations applied
- [ ] SSL certificates configured
- [ ] Monitoring enabled
- [ ] Backup strategy implemented

### **Post-Deployment**
- [ ] Health checks passing
- [ ] Performance metrics normal
- [ ] Logs configured and accessible
- [ ] Backup system functional
- [ ] Documentation updated
- [ ] Team access configured

## 🆘 Getting Help

### **Resources**
- **Documentation**: [docs/](../docs/)
- **API Reference**: [docs/API.md](./API.md)
- **Architecture**: [docs/ARCHITECTURE.md](./ARCHITECTURE.md)
- **AI System**: [docs/AI_SYSTEM.md](./AI_SYSTEM.md)

### **Community**
- **GitHub Issues**: Report bugs and request features
- **Discussions**: Ask questions and share ideas
- **Discord**: Real-time community support

### **Professional Support**
- **Consulting**: Custom implementation assistance
- **Training**: Team training and onboarding
- **Maintenance**: Ongoing support and updates

---

This setup guide provides comprehensive instructions for deploying DocumentCompanion in various environments. For additional assistance, please refer to the troubleshooting section or contact the development team. 