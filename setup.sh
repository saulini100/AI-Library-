#!/bin/bash

# DocumentCompanion Setup Script
# This script will install and run the DocumentCompanion app on any computer
# Supports: macOS, Linux, and Windows (via WSL)

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        OS="windows"
    else
        OS="unknown"
    fi
    echo $OS
}

# Function to install Node.js
install_nodejs() {
    print_status "Installing Node.js..."
    
    if command_exists node; then
        NODE_VERSION=$(node --version)
        print_status "Node.js already installed: $NODE_VERSION"
        return 0
    fi
    
    OS=$(detect_os)
    
    if [[ "$OS" == "macos" ]]; then
        if command_exists brew; then
            brew install node
        else
            print_error "Homebrew not found. Please install Homebrew first: https://brew.sh/"
            exit 1
        fi
    elif [[ "$OS" == "linux" ]]; then
        # Install Node.js using NodeSource repository
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [[ "$OS" == "windows" ]]; then
        print_warning "Please install Node.js manually from https://nodejs.org/"
        print_warning "After installation, restart your terminal and run this script again."
        exit 1
    else
        print_error "Unsupported OS: $OS"
        exit 1
    fi
    
    print_status "Node.js installation completed"
}

# Function to install Ollama
install_ollama() {
    print_status "Installing Ollama..."
    
    if command_exists ollama; then
        print_status "Ollama already installed"
        return 0
    fi
    
    OS=$(detect_os)
    
    if [[ "$OS" == "macos" ]]; then
        curl -fsSL https://ollama.ai/install.sh | sh
    elif [[ "$OS" == "linux" ]]; then
        curl -fsSL https://ollama.ai/install.sh | sh
    elif [[ "$OS" == "windows" ]]; then
        print_warning "Please install Ollama manually from https://ollama.ai/"
        print_warning "After installation, restart your terminal and run this script again."
        exit 1
    else
        print_error "Unsupported OS: $OS"
        exit 1
    fi
    
    print_status "Ollama installation completed"
}

# Function to download AI models
download_models() {
    print_status "Downloading AI models..."
    
    # Start Ollama service if not running
    if ! pgrep -x "ollama" > /dev/null; then
        print_status "Starting Ollama service..."
        ollama serve &
        sleep 5
    fi
    
    # Download primary Gemma3n models
    print_status "Downloading primary Gemma3n models..."
    print_status "Downloading gemma3n:e4b model (advanced reasoning)..."
    ollama pull gemma3n:e4b
    
    print_status "Downloading gemma3n:e2b model (fast reasoning)..."
    ollama pull gemma3n:e2b
    
    # Download supporting models
    print_status "Downloading supporting models..."
    print_status "Downloading nomic-embed-text:v1.5 model (embeddings)..."
    ollama pull nomic-embed-text:v1.5
    
    print_status "Downloading qwen2.5vl:7b model (vision analysis)..."
    ollama pull qwen2.5vl:7b
    
    print_status "Downloading phi3.5:3.8b-mini-instruct-q8_0 model (fast reasoning)..."
    ollama pull phi3.5:3.8b-mini-instruct-q8_0
    
    print_status "All AI models downloaded successfully"
}

# Function to install project dependencies
install_dependencies() {
    print_status "Installing project dependencies..."
    
    if [[ ! -f "package.json" ]]; then
        print_error "package.json not found. Please run this script from the project root directory."
        exit 1
    fi
    
    npm install
    
    print_status "Dependencies installed successfully"
}

# Function to setup database
setup_database() {
    print_status "Setting up database..."
    
    # Check if drizzle config exists
    if [[ ! -f "drizzle.config.ts" ]]; then
        print_warning "drizzle.config.ts not found. Database setup skipped."
        return 0
    fi
    
    # Run database migrations
    if command_exists npx; then
        npx drizzle-kit push
        print_status "Database migrations completed"
    else
        print_warning "npx not found. Database setup skipped."
    fi
}

# Function to create environment file
create_env_file() {
    print_status "Creating environment configuration..."
    
    if [[ ! -f ".env" ]]; then
        cat > .env << EOF
# DocumentCompanion Environment Configuration

# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DATABASE_URL=file:./local-bible-companion.db

# AI Configuration
OLLAMA_HOST=localhost
OLLAMA_PORT=11434
OLLAMA_MODEL=gemma3n:e2b

# Agent Configuration
AGENT_LOG_LEVEL=info
WEBSOCKET_PORT=3001

# Translation Configuration
TRANSLATION_ENABLED=true
DEFAULT_LANGUAGE=en

# Security Configuration
SESSION_SECRET=your-session-secret-here
ENCRYPTION_KEY=your-encryption-key-here

# Performance Configuration
MAX_CONCURRENT_TASKS=10
CACHE_TTL=900000
EOF
        print_status "Environment file created: .env"
    else
        print_status "Environment file already exists: .env"
    fi
}

# Function to create startup script
create_startup_script() {
    print_status "Creating startup script..."
    
    cat > start-app.sh << 'EOF'
#!/bin/bash

# DocumentCompanion Startup Script

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Ollama is running
check_ollama() {
    if ! pgrep -x "ollama" > /dev/null; then
        print_warning "Ollama is not running. Starting Ollama service..."
        ollama serve &
        sleep 5
    fi
    print_status "Ollama service is running"
}

# Check if required models are available
check_models() {
    print_status "Checking AI models..."
    
    REQUIRED_MODELS=("gemma3n:e4b" "gemma3n:e2b" "nomic-embed-text:v1.5" "qwen2.5vl:7b" "phi3.5:3.8b-mini-instruct-q8_0")
    
    for model in "${REQUIRED_MODELS[@]}"; do
        if ollama list | grep -q "$model"; then
            print_status "Model $model is available"
        else
            print_warning "Model $model not found. Downloading..."
            ollama pull "$model"
        fi
    done
}

# Start the application
start_app() {
    print_status "Starting DocumentCompanion..."
    
    # Check dependencies
    check_ollama
    check_models
    
    # Start the application
    npm run dev:full
}

# Main execution
main() {
    print_status "Starting DocumentCompanion setup..."
    
    # Change to script directory
    cd "$(dirname "$0")"
    
    # Start the application
    start_app
}

main "$@"
EOF

    chmod +x start-app.sh
    print_status "Startup script created: start-app.sh"
}

# Function to create systemd service (Linux)
create_systemd_service() {
    if [[ "$(detect_os)" == "linux" ]]; then
        print_status "Creating systemd service..."
        
        sudo tee /etc/systemd/system/documentcompanion.service > /dev/null << EOF
[Unit]
Description=DocumentCompanion AI Learning System
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=$(which node) server/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

        sudo systemctl daemon-reload
        print_status "Systemd service created: documentcompanion.service"
        print_status "To enable the service: sudo systemctl enable documentcompanion"
        print_status "To start the service: sudo systemctl start documentcompanion"
    fi
}

# Function to create launchd plist (macOS)
create_launchd_plist() {
    if [[ "$(detect_os)" == "macos" ]]; then
        print_status "Creating launchd plist..."
        
        cat > ~/Library/LaunchAgents/com.documentcompanion.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.documentcompanion</string>
    <key>ProgramArguments</key>
    <array>
        <string>$(which node)</string>
        <string>$(pwd)/server/index.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$(pwd)</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$(pwd)/logs/app.log</string>
    <key>StandardErrorPath</key>
    <string>$(pwd)/logs/error.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</string>
        <key>PORT</key>
        <string>3000</string>
    </dict>
</dict>
</plist>
EOF

        mkdir -p logs
        print_status "Launchd plist created: ~/Library/LaunchAgents/com.documentcompanion.plist"
        print_status "To load the service: launchctl load ~/Library/LaunchAgents/com.documentcompanion.plist"
    fi
}

# Function to create logs directory
create_logs_directory() {
    print_status "Creating logs directory..."
    mkdir -p logs
    print_status "Logs directory created: logs/"
}

# Function to create desktop shortcut
create_desktop_shortcut() {
    print_status "Creating desktop shortcut..."
    
    OS=$(detect_os)
    
    if [[ "$OS" == "linux" ]]; then
        cat > ~/Desktop/DocumentCompanion.desktop << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=DocumentCompanion
Comment=AI-Powered Document Learning System
Exec=$(pwd)/start-app.sh
Icon=$(pwd)/assets/icon.png
Terminal=true
Categories=Education;Development;
EOF
        chmod +x ~/Desktop/DocumentCompanion.desktop
        print_status "Desktop shortcut created: ~/Desktop/DocumentCompanion.desktop"
    elif [[ "$OS" == "macos" ]]; then
        # Create macOS app bundle
        mkdir -p DocumentCompanion.app/Contents/MacOS
        mkdir -p DocumentCompanion.app/Contents/Resources
        
        cat > DocumentCompanion.app/Contents/Info.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>DocumentCompanion</string>
    <key>CFBundleIdentifier</key>
    <string>com.documentcompanion.app</string>
    <key>CFBundleName</key>
    <string>DocumentCompanion</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.10</string>
</dict>
</plist>
EOF

        cat > DocumentCompanion.app/Contents/MacOS/DocumentCompanion << EOF
#!/bin/bash
cd "$(dirname "$0")/../../../"
./start-app.sh
EOF

        chmod +x DocumentCompanion.app/Contents/MacOS/DocumentCompanion
        print_status "macOS app bundle created: DocumentCompanion.app"
    fi
}

# Function to display final instructions
display_instructions() {
    print_header "Setup Complete!"
    
    echo -e "${GREEN}DocumentCompanion has been successfully installed!${NC}"
    echo ""
    echo -e "${CYAN}Quick Start:${NC}"
    echo "  ./start-app.sh                    # Start the application"
    echo ""
    echo -e "${CYAN}Access the Application:${NC}"
    echo "  Web Interface: http://localhost:3000"
    echo "  AI Agents: http://localhost:3001 (WebSocket)"
    echo ""
    echo -e "${CYAN}Available Commands:${NC}"
    echo "  npm run dev:full                  # Development mode with all features"
    echo "  npm run dev                       # Development mode"
    echo "  npm run build                     # Build for production"
    echo "  npm run start                     # Production mode"
    echo ""
    echo -e "${CYAN}AI Models Available:${NC}"
    echo "  • gemma3n:e2b (Default)"
    echo "  • qwen2.5:7b-instruct"
    echo "  • llama3.2:3b"
    echo "  • mistral:7b"
    echo ""
    echo -e "${CYAN}System Services:${NC}"
    if [[ "$(detect_os)" == "linux" ]]; then
        echo "  sudo systemctl enable documentcompanion  # Enable auto-start"
        echo "  sudo systemctl start documentcompanion   # Start service"
        echo "  sudo systemctl status documentcompanion  # Check status"
    elif [[ "$(detect_os)" == "macos" ]]; then
        echo "  launchctl load ~/Library/LaunchAgents/com.documentcompanion.plist  # Enable auto-start"
    fi
    echo ""
    echo -e "${CYAN}Logs:${NC}"
    echo "  logs/app.log                      # Application logs"
    echo "  logs/error.log                    # Error logs"
    echo ""
    echo -e "${CYAN}Configuration:${NC}"
    echo "  .env                              # Environment variables"
    echo "  drizzle.config.ts                 # Database configuration"
    echo ""
    echo -e "${YELLOW}Note:${NC} The first startup may take a few minutes as AI models are loaded."
    echo ""
    echo -e "${GREEN}Happy Learning! 🎓📚${NC}"
}

# Function to check system requirements
check_requirements() {
    print_header "Checking System Requirements"
    
    # Check OS
    OS=$(detect_os)
    print_status "Operating System: $OS"
    
    if [[ "$OS" == "unknown" ]]; then
        print_error "Unsupported operating system"
        exit 1
    fi
    
    # Check available memory
    if [[ "$OS" == "linux" ]]; then
        MEMORY=$(free -m | awk 'NR==2{printf "%.0f", $2/1024}')
    elif [[ "$OS" == "macos" ]]; then
        MEMORY=$(sysctl -n hw.memsize | awk '{printf "%.0f", $1/1024/1024/1024}')
    else
        MEMORY=8  # Default assumption for Windows
    fi
    
    print_status "Available Memory: ${MEMORY}GB"
    
    if [[ $MEMORY -lt 8 ]]; then
        print_warning "Recommended: At least 8GB RAM for optimal performance"
        print_warning "Current system has ${MEMORY}GB RAM"
    fi
    
    # Check available disk space
    DISK_SPACE=$(df . | awk 'NR==2 {print $4}' | awk '{printf "%.0f", $1/1024/1024}')
    print_status "Available Disk Space: ${DISK_SPACE}GB"
    
    if [[ $DISK_SPACE -lt 10 ]]; then
        print_error "Insufficient disk space. Need at least 10GB free space."
        exit 1
    fi
}

# Main setup function
main() {
    print_header "DocumentCompanion Setup Script"
    print_status "This script will install and configure DocumentCompanion on your system"
    echo ""
    
    # Check system requirements
    check_requirements
    
    # Install dependencies
    print_header "Installing Dependencies"
    install_nodejs
    install_ollama
    
    # Download AI models
    print_header "Downloading AI Models"
    download_models
    
    # Install project dependencies
    print_header "Installing Project Dependencies"
    install_dependencies
    
    # Setup database
    print_header "Setting Up Database"
    setup_database
    
    # Create configuration files
    print_header "Creating Configuration Files"
    create_env_file
    create_logs_directory
    
    # Create startup scripts
    print_header "Creating Startup Scripts"
    create_startup_script
    
    # Create system services
    print_header "Creating System Services"
    if [[ "$(detect_os)" == "linux" ]]; then
        create_systemd_service
    elif [[ "$(detect_os)" == "macos" ]]; then
        create_launchd_plist
    fi
    
    # Create desktop shortcuts
    print_header "Creating Desktop Shortcuts"
    create_desktop_shortcut
    
    # Display final instructions
    display_instructions
}

# Run main function
main "$@" 