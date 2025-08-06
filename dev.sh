#!/bin/bash

# Development script for MCP Client Web Interface
# This script provides easy commands to start, stop, and manage the development servers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[DEV]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pids=$(lsof -ti:$port)
    if [ ! -z "$pids" ]; then
        print_status "Killing processes on port $port: $pids"
        kill -9 $pids 2>/dev/null || true
        sleep 1
    fi
}

# Function to setup backend virtual environment
setup_backend() {
    print_status "Setting up backend virtual environment..."
    cd web/backend
    
    if [ ! -d "venv" ]; then
        print_status "Creating virtual environment..."
        python3 -m venv venv
    fi
    
    print_status "Activating virtual environment and installing dependencies..."
    source venv/bin/activate
    pip install -r requirements.txt
    cd ../..
    print_success "Backend setup complete!"
}

# Function to setup frontend
setup_frontend() {
    print_status "Setting up frontend..."
    cd web/frontend
    
    if [ ! -d "node_modules" ]; then
        print_status "Installing npm dependencies..."
        npm install
    fi
    
    cd ../..
    print_success "Frontend setup complete!"
}

# Function to start backend
start_backend() {
    print_status "Starting backend server..."
    
    # Kill any existing backend process
    kill_port 8000
    
    cd web/backend
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        print_error "Virtual environment not found. Run './dev.sh setup' first."
        exit 1
    fi
    
    # Start backend in background
    source venv/bin/activate
    print_status "Backend starting on http://localhost:8000"
    python main.py &
    BACKEND_PID=$!
    echo $BACKEND_PID > backend.pid
    
    cd ../..
    
    # Wait a moment and check if backend started successfully
    sleep 3
    if check_port 8000; then
        print_success "Backend server started successfully (PID: $BACKEND_PID)"
    else
        print_error "Backend server failed to start"
        return 1
    fi
}

# Function to start frontend
start_frontend() {
    print_status "Starting frontend server..."
    
    # Kill any existing frontend process
    kill_port 5173
    kill_port 5174
    kill_port 5175
    
    cd web/frontend
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_error "Node modules not found. Run './dev.sh setup' first."
        exit 1
    fi
    
    # Start frontend in background
    print_status "Frontend starting on http://localhost:5173"
    npm run dev &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > frontend.pid
    
    cd ../..
    
    # Wait a moment and check if frontend started successfully
    sleep 3
    if check_port 5173 || check_port 5174 || check_port 5175; then
        print_success "Frontend server started successfully (PID: $FRONTEND_PID)"
    else
        print_error "Frontend server failed to start"
        return 1
    fi
}

# Function to stop all servers
stop_all() {
    print_status "Stopping all development servers..."
    
    # Kill backend
    if [ -f "web/backend/backend.pid" ]; then
        BACKEND_PID=$(cat web/backend/backend.pid)
        kill -9 $BACKEND_PID 2>/dev/null || true
        rm web/backend/backend.pid
    fi
    kill_port 8000
    
    # Kill frontend
    if [ -f "web/frontend/frontend.pid" ]; then
        FRONTEND_PID=$(cat web/frontend/frontend.pid)
        kill -9 $FRONTEND_PID 2>/dev/null || true
        rm web/frontend/frontend.pid
    fi
    kill_port 5173
    kill_port 5174
    kill_port 5175
    
    print_success "All servers stopped"
}

# Function to show status
show_status() {
    print_status "Development server status:"
    
    if check_port 8000; then
        print_success "✅ Backend running on http://localhost:8000"
    else
        print_warning "❌ Backend not running"
    fi
    
    if check_port 5173 || check_port 5174 || check_port 5175; then
        if check_port 5173; then
            print_success "✅ Frontend running on http://localhost:5173"
        elif check_port 5174; then
            print_success "✅ Frontend running on http://localhost:5174"
        elif check_port 5175; then
            print_success "✅ Frontend running on http://localhost:5175"
        fi
    else
        print_warning "❌ Frontend not running"
    fi
}

# Function to show logs
show_logs() {
    local service=$1
    case $service in
        "backend")
            print_status "Showing backend logs (press Ctrl+C to exit)..."
            cd web/backend
            source venv/bin/activate
            python main.py
            ;;
        "frontend")
            print_status "Showing frontend logs (press Ctrl+C to exit)..."
            cd web/frontend
            npm run dev
            ;;
        *)
            print_error "Please specify 'backend' or 'frontend'"
            ;;
    esac
}

# Function to restart servers
restart() {
    print_status "Restarting development servers..."
    stop_all
    sleep 2
    start_backend
    start_frontend
    show_status
}

# Function to open browser
open_browser() {
    print_status "Opening application in browser..."
    if check_port 5173; then
        open http://localhost:5173
    elif check_port 5174; then
        open http://localhost:5174
    elif check_port 5175; then
        open http://localhost:5175
    else
        print_error "Frontend server is not running"
    fi
}

# Main command handling
case "$1" in
    "setup")
        print_status "Setting up development environment..."
        setup_backend
        setup_frontend
        print_success "Development environment setup complete!"
        print_status "Run './dev.sh start' to start the servers"
        ;;
    "start")
        print_status "Starting development servers..."
        start_backend
        start_frontend
        show_status
        print_success "Development servers started!"
        print_status "Frontend: http://localhost:5173"
        print_status "Backend API: http://localhost:8000"
        print_status "Run './dev.sh open' to open in browser"
        ;;
    "stop")
        stop_all
        ;;
    "restart")
        restart
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs $2
        ;;
    "open")
        open_browser
        ;;
    "backend")
        start_backend
        ;;
    "frontend")
        start_frontend
        ;;
    *)
        echo "MCP Client Development Script"
        echo ""
        echo "Usage: $0 {command}"
        echo ""
        echo "Commands:"
        echo "  setup     - Set up development environment (install dependencies)"
        echo "  start     - Start both backend and frontend servers"
        echo "  stop      - Stop all development servers"
        echo "  restart   - Restart all development servers"
        echo "  status    - Show status of development servers"
        echo "  logs      - Show logs for backend or frontend (./dev.sh logs backend)"
        echo "  open      - Open application in browser"
        echo "  backend   - Start only backend server"
        echo "  frontend  - Start only frontend server"
        echo ""
        echo "Examples:"
        echo "  $0 setup     # First time setup"
        echo "  $0 start     # Start development servers"
        echo "  $0 restart   # Quick restart when you make changes"
        echo "  $0 logs backend  # View backend logs"
        ;;
esac
