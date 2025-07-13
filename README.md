# DocumentCompanion - Advanced AI-Powered Document Learning Platform

<div align="center">

**🚀 Transform any document into an intelligent, interactive learning experience**

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)

[🎯 Features](#-features) • [🚀 Quick Start](#-quick-start) • [📖 Documentation](#-documentation) • [🤖 AI System](#-ai-system) • [🔧 API Reference](#-api-reference)

</div>

## 📋 Table of Contents

- [🎯 Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🚀 Quick Start](#-quick-start)
- [📖 Documentation](#-documentation)
- [🤖 AI System](#-ai-system)
- [🔧 API Reference](#-api-reference)
- [🎨 UI Components](#-ui-components)
- [🌐 Internationalization](#-internationalization)
- [⚡ Performance](#-performance)
- [🛠️ Development](#️-development)
- [📊 Monitoring](#-monitoring)
- [🔒 Security](#-security)
- [📄 License](#-license)

## 🎯 Features

### 🧠 **AI-Powered Learning**
- **Multi-Agent AI System**: Specialized agents for different learning tasks
- **Intelligent Document Analysis**: Advanced NLP and semantic understanding
- **Adaptive Learning**: Personalized content based on user progress
- **Context-Aware Explanations**: Deep understanding of document content
- **Cross-Reference Discovery**: Automatic connection finding across documents

### 📚 **Document Processing**
- **Universal Format Support**: PDF, TXT, and various document types
- **Smart Chapter Detection**: AI-assisted content structuring
- **Intelligent Pagination**: Optimal reading experience
- **Content Enhancement**: Automatic formatting and organization
- **Multi-Language Processing**: Support for 6+ languages

### 🗣️ **Voice & Audio**
- **Advanced Text-to-Speech**: Natural voice reading with 40+ voices
- **AI-Enhanced Speech**: Intelligent emphasis and pacing
- **Voice Cloning**: Personalized reading experience
- **Audio Controls**: Speed, pitch, and voice customization
- **Reading Progress**: Audio-synced progress tracking

### 💬 **Interactive Features**
- **AI Discussion Agent**: Intelligent conversations about content
- **Study Assistant**: Personalized learning support
- **Quiz Generation**: Automated question creation
- **Power Summaries**: AI-generated chapter summaries
- **Insight Generation**: Deep analysis and connections

### 🎨 **User Experience**
- **Modern UI**: Beautiful, responsive design with Tailwind CSS
- **Dark/Light Mode**: Comfortable reading in any environment
- **Mobile Optimized**: Full functionality on all devices
- **Keyboard Navigation**: Complete accessibility support
- **Drag & Drop**: Intuitive file handling and note management

### 🔍 **Advanced Search**
- **Semantic Search**: Natural language queries
- **RAG Integration**: Retrieval-augmented generation
- **Cross-Document Search**: Find connections across all documents
- **Contextual Results**: Intelligent result ranking
- **Search Analytics**: Learning from search patterns

### 📊 **Analytics & Monitoring**
- **Performance Dashboard**: Real-time system monitoring
- **Learning Analytics**: Track progress and patterns
- **AI Agent Monitoring**: System health and performance
- **User Engagement**: Detailed usage statistics
- **Cache Performance**: Optimization metrics

## 🏗️ Architecture

### **Frontend (React + TypeScript)**
```
client/
├── src/
│   ├── components/          # UI components
│   │   ├── ai-agent-chat.tsx
│   │   ├── ai-voice-reader.tsx
│   │   ├── document-content.tsx
│   │   └── ui/              # Radix UI components
│   ├── pages/               # Route components
│   ├── hooks/               # Custom React hooks
│   ├── contexts/            # React contexts
│   ├── services/            # API services
│   └── lib/                 # Utilities
```

### **Backend (Node.js + Express)**
```
server/
├── agents/                  # AI agent system
│   ├── agent-manager.ts     # Central coordination
│   ├── discussion-agent.ts  # Chat and conversations
│   ├── quiz-agent.ts        # Quiz generation
│   └── text-analysis-agent.ts
├── services/                # Core services
│   ├── ollama-service.ts    # AI model integration
│   ├── document-rag-service.ts
│   └── semantic-search-service.ts
├── routes/                  # API routes
└── db.ts                    # Database configuration
```

### **Database Schema**
- **Documents**: File storage and metadata
- **Annotations**: User notes and highlights
- **Bookmarks**: Saved locations and references
- **AI Memories**: Intelligent content retention
- **Power Summaries**: AI-generated summaries
- **Learning Analytics**: Progress tracking

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+ 
- npm or yarn
- Ollama (for AI features)

### **1. Installation**
```bash
# Clone the repository
git clone <repository-url>
cd DocumentCompanion

# Install dependencies
npm install
```

### **2. Database Setup**
```bash
# Generate database schema
npm run db:generate

# Run migrations
npm run db:migrate
```

### **3. AI Services Setup**
> **Note:** The main large language model (LLM) powering DocumentCompanion is **Gemma 3N**. Most AI features and agents use Gemma 3N as their primary model for advanced language understanding and generation.

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull recommended models
ollama pull gemma3n:e2b
ollama pull qwen2.5:7b-instruct
ollama pull llama3.2:3b
```

### **4. Development**
```bash
# Start development server
npm run dev

# Start full system with AI agents
npm run dev:full

# Access the application
open http://localhost:5000
```

### **5. Startup & Reset Script** 🚀
For easy development and troubleshooting, use the automated startup script:

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

#### **What the script does:**
- **🛑 Smart Server Management**: Automatically stops any running processes on port 5000
- **🔧 Complete Database Reset**: Deletes corrupted files and runs proper Drizzle migrations
- **👤 User Setup**: Creates default user with ID 2 for consistent document uploads
- **🌟 Server Launch**: Starts development server with helpful URLs
- **🎯 Error Prevention**: Ensures clean state and prevents conflicts

#### **Perfect for:**
- **Competition prep**: Ensure clean system state
- **Development**: Quick reset when testing features
- **Troubleshooting**: Fix database schema issues instantly
- **Fresh starts**: Complete system reset in one command

#### **Common use cases:**
```bash
# Fresh start for development
node startup-reset.cjs

# Just reset data without starting server
node startup-reset.cjs --reset

# Quick server restart without database changes
node startup-reset.cjs --start
```

### **6. Production Deployment**
```bash
# Build for production
npm run build

# Start production server
npm start
```

## 📖 Documentation

### **Core Concepts**

#### **Documents**
The platform processes documents into structured chapters with intelligent pagination. Each document maintains metadata, reading progress, and associated AI-generated content.

#### **AI Agents**
Specialized AI agents handle different aspects of learning:
- **Text Analysis Agent**: Document processing and insights
- **Study Assistant**: Personalized learning support
- **Insight Generation**: Deep analysis and connections
- **Learning Agent**: Advanced knowledge acquisition and expertise building
- **Discussion Agent**: Interactive conversations
- **Quiz Agent**: Automated assessment creation
- **AI Teacher Agent**: Expert teaching and educational guidance
- **Auto-Learning System**: Autonomous knowledge acquisition

> **Gemma 3N** is the primary LLM used by these agents for most advanced AI tasks in the system.

#### **RAG System**
Retrieval-Augmented Generation provides context-aware responses by combining document content with AI knowledge.

### **File Structure** 