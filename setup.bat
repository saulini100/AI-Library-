@echo off
setlocal enabledelayedexpansion

REM DocumentCompanion Windows Setup Script
REM This script will install and run the DocumentCompanion app on Windows

echo ================================
echo DocumentCompanion Setup Script
echo ================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [INFO] Running as administrator
) else (
    echo [WARNING] Not running as administrator. Some features may require admin privileges.
)

REM Check if Node.js is installed
echo [INFO] Checking Node.js installation...
node --version >nul 2>&1
if %errorLevel% == 0 (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo [INFO] Node.js already installed: !NODE_VERSION!
) else (
    echo [ERROR] Node.js not found. Please install Node.js from https://nodejs.org/
    echo [ERROR] After installation, restart your terminal and run this script again.
    pause
    exit /b 1
)

REM Check if npm is available
echo [INFO] Checking npm installation...
npm --version >nul 2>&1
if %errorLevel% == 0 (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo [INFO] npm already installed: !NPM_VERSION!
) else (
    echo [ERROR] npm not found. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if Ollama is installed
echo [INFO] Checking Ollama installation...
ollama --version >nul 2>&1
if %errorLevel% == 0 (
    for /f "tokens=*" %%i in ('ollama --version') do set OLLAMA_VERSION=%%i
    echo [INFO] Ollama already installed: !OLLAMA_VERSION!
) else (
    echo [ERROR] Ollama not found. Please install Ollama from https://ollama.ai/
    echo [ERROR] After installation, restart your terminal and run this script again.
    pause
    exit /b 1
)

REM Check if package.json exists
if not exist "package.json" (
    echo [ERROR] package.json not found. Please run this script from the project root directory.
    pause
    exit /b 1
)

REM Install project dependencies
echo [INFO] Installing project dependencies...
call npm install
if %errorLevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [INFO] Dependencies installed successfully

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo [INFO] Creating environment configuration...
    (
        echo # DocumentCompanion Environment Configuration
        echo.
        echo # Server Configuration
        echo PORT=3000
        echo NODE_ENV=development
        echo.
        echo # Database Configuration
        echo DATABASE_URL=file:./local-bible-companion.db
        echo.
        echo # AI Configuration
        echo OLLAMA_HOST=localhost
        echo OLLAMA_PORT=11434
        echo OLLAMA_MODEL=gemma3n:e2b
        echo.
        echo # Agent Configuration
        echo AGENT_LOG_LEVEL=info
        echo WEBSOCKET_PORT=3001
        echo.
        echo # Translation Configuration
        echo TRANSLATION_ENABLED=true
        echo DEFAULT_LANGUAGE=en
        echo.
        echo # Security Configuration
        echo SESSION_SECRET=your-session-secret-here
        echo ENCRYPTION_KEY=your-encryption-key-here
        echo.
        echo # Performance Configuration
        echo MAX_CONCURRENT_TASKS=10
        echo CACHE_TTL=900000
    ) > .env
    echo [INFO] Environment file created: .env
) else (
    echo [INFO] Environment file already exists: .env
)

REM Create logs directory
if not exist "logs" (
    echo [INFO] Creating logs directory...
    mkdir logs
    echo [INFO] Logs directory created: logs/
)

REM Create startup script
echo [INFO] Creating startup script...
(
    echo @echo off
    echo setlocal enabledelayedexpansion
    echo.
    echo REM DocumentCompanion Startup Script
    echo.
    echo echo [INFO] Starting DocumentCompanion...
    echo echo.
    echo.
    echo REM Check if Ollama is running
    echo tasklist /FI "IMAGENAME eq ollama.exe" 2^>NUL ^| find /I /N "ollama.exe"^>NUL
    echo if "%%errorlevel%%"=="1" ^(
    echo     echo [WARNING] Ollama is not running. Starting Ollama service...
    echo     start /B ollama serve
    echo     timeout /t 5 /nobreak ^>nul
    echo ^)
    echo echo [INFO] Ollama service is running
    echo.
    echo REM Check if required models are available
    echo echo [INFO] Checking AI models...
    echo.
    echo set REQUIRED_MODELS=gemma3n:e4b gemma3n:e2b nomic-embed-text:v1.5 qwen2.5vl:7b phi3.5:3.8b-mini-instruct-q8_0
    echo for %%m in ^(%%REQUIRED_MODELS%%^) do ^(
    echo     ollama list ^| findstr "%%m" ^>nul
    echo     if "%%errorlevel%%"=="1" ^(
    echo         echo [WARNING] Model %%m not found. Downloading...
    echo         ollama pull %%m
    echo     ^) else ^(
    echo         echo [INFO] Model %%m is available
    echo     ^)
    echo ^)
    echo.
    echo REM Start the application
    echo echo [INFO] Starting DocumentCompanion...
    echo call npm run dev:full
) > start-app.bat

echo [INFO] Startup script created: start-app.bat

REM Create desktop shortcut
echo [INFO] Creating desktop shortcut...
set DESKTOP_PATH=%USERPROFILE%\Desktop
set SHORTCUT_PATH=%DESKTOP_PATH%\DocumentCompanion.bat

(
    echo @echo off
    echo cd /d "%~dp0"
    echo call start-app.bat
) > "%SHORTCUT_PATH%"

echo [INFO] Desktop shortcut created: %SHORTCUT_PATH%

REM Download AI models
echo [INFO] Downloading AI models...
echo [INFO] This may take several minutes depending on your internet connection...

REM Start Ollama service if not running
tasklist /FI "IMAGENAME eq ollama.exe" 2>NUL | find /I /N "ollama.exe">NUL
if "!errorlevel!"=="1" (
    echo [INFO] Starting Ollama service...
    start /B ollama serve
    timeout /t 5 /nobreak >nul
)

REM Download primary Gemma3n models
echo [INFO] Downloading primary Gemma3n models...
echo [INFO] Downloading gemma3n:e4b model (advanced reasoning)...
ollama pull gemma3n:e4b

echo [INFO] Downloading gemma3n:e2b model (fast reasoning)...
ollama pull gemma3n:e2b

REM Download supporting models
echo [INFO] Downloading supporting models...
echo [INFO] Downloading nomic-embed-text:v1.5 model (embeddings)...
ollama pull nomic-embed-text:v1.5

echo [INFO] Downloading qwen2.5vl:7b model (vision analysis)...
ollama pull qwen2.5vl:7b

echo [INFO] Downloading phi3.5:3.8b-mini-instruct-q8_0 model (fast reasoning)...
ollama pull phi3.5:3.8b-mini-instruct-q8_0

echo [INFO] All AI models downloaded successfully

REM Display final instructions
echo.
echo ================================
echo Setup Complete!
echo ================================
echo.
echo DocumentCompanion has been successfully installed!
echo.
echo Quick Start:
echo   start-app.bat                    # Start the application
echo   %SHORTCUT_PATH%                  # Start from desktop shortcut
echo.
echo Access the Application:
echo   Web Interface: http://localhost:3000
echo   AI Agents: http://localhost:3001 (WebSocket)
echo.
echo Available Commands:
echo   npm run dev:full                  # Development mode with all features
echo   npm run dev                       # Development mode
echo   npm run build                     # Build for production
echo   npm run start                     # Production mode
echo.
echo AI Models Available:
echo   • gemma3n:e2b (Default)
echo   • qwen2.5:7b-instruct
echo   • llama3.2:3b
echo   • mistral:7b
echo.
echo Logs:
echo   logs/app.log                      # Application logs
echo   logs/error.log                    # Error logs
echo.
echo Configuration:
echo   .env                              # Environment variables
echo   drizzle.config.ts                 # Database configuration
echo.
echo Note: The first startup may take a few minutes as AI models are loaded.
echo.
echo Happy Learning! 🎓📚
echo.
pause 