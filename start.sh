#!/bin/bash

# ============================================
# Shakham Assessment Platform - Startup Script
# For Raspberry Pi (Debian)
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR"
BACKEND_PORT=8000
FRONTEND_PORT=5173

# Log file locations
LOG_DIR="$SCRIPT_DIR/logs"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

# PID file locations
PID_DIR="$SCRIPT_DIR/.pids"
BACKEND_PID="$PID_DIR/backend.pid"
FRONTEND_PID="$PID_DIR/frontend.pid"

# Create directories
mkdir -p "$LOG_DIR"
mkdir -p "$PID_DIR"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to stop existing services
stop_services() {
    echo "Stopping existing services..."
    
    # Stop backend
    if [ -f "$BACKEND_PID" ]; then
        PID=$(cat "$BACKEND_PID")
        if kill -0 "$PID" 2>/dev/null; then
            kill "$PID" 2>/dev/null || true
            print_status "Backend stopped (PID: $PID)"
        fi
        rm -f "$BACKEND_PID"
    fi
    
    # Stop frontend
    if [ -f "$FRONTEND_PID" ]; then
        PID=$(cat "$FRONTEND_PID")
        if kill -0 "$PID" 2>/dev/null; then
            kill "$PID" 2>/dev/null || true
            print_status "Frontend stopped (PID: $PID)"
        fi
        rm -f "$FRONTEND_PID"
    fi
    
    # Kill any remaining processes on our ports
    if check_port $BACKEND_PORT; then
        fuser -k $BACKEND_PORT/tcp 2>/dev/null || true
    fi
    if check_port $FRONTEND_PORT; then
        fuser -k $FRONTEND_PORT/tcp 2>/dev/null || true
    fi
    
    sleep 2
}

# Function to start backend
start_backend() {
    echo ""
    echo "Starting Backend..."
    
    cd "$BACKEND_DIR"
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        print_warning "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment and install dependencies
    source venv/bin/activate
    pip install -r requirements.txt -q
    
    # Start backend with uvicorn
    nohup uvicorn app.main:app --host 0.0.0.0 --port $BACKEND_PORT > "$BACKEND_LOG" 2>&1 &
    echo $! > "$BACKEND_PID"
    
    # Wait for backend to start
    sleep 3
    
    if check_port $BACKEND_PORT; then
        print_status "Backend started on port $BACKEND_PORT (PID: $(cat $BACKEND_PID))"
    else
        print_error "Backend failed to start. Check $BACKEND_LOG for details."
        exit 1
    fi
}

# Function to start frontend
start_frontend() {
    echo ""
    echo "Starting Frontend..."
    
    cd "$FRONTEND_DIR"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_warning "Installing npm dependencies..."
        npm install
    fi
    
    # Start frontend with vite
    nohup npm run dev -- --host 0.0.0.0 > "$FRONTEND_LOG" 2>&1 &
    echo $! > "$FRONTEND_PID"
    
    # Wait for frontend to start
    sleep 5
    
    if check_port $FRONTEND_PORT; then
        print_status "Frontend started on port $FRONTEND_PORT (PID: $(cat $FRONTEND_PID))"
    else
        print_error "Frontend failed to start. Check $FRONTEND_LOG for details."
        exit 1
    fi
}

# Function to show status
show_status() {
    echo ""
    echo "============================================"
    echo "  Service Status"
    echo "============================================"
    
    # Get local IP
    LOCAL_IP=$(hostname -I | awk '{print $1}')
    
    if check_port $BACKEND_PORT; then
        print_status "Backend:  http://$LOCAL_IP:$BACKEND_PORT"
    else
        print_error "Backend:  NOT RUNNING"
    fi
    
    if check_port $FRONTEND_PORT; then
        print_status "Frontend: http://$LOCAL_IP:$FRONTEND_PORT"
    else
        print_error "Frontend: NOT RUNNING"
    fi
    
    echo ""
    echo "Admin Login: admin@shakham.com / PASSWORD!@123"
    echo ""
    echo "Logs:"
    echo "  - Backend:  $BACKEND_LOG"
    echo "  - Frontend: $FRONTEND_LOG"
    echo "============================================"
}

# Main script logic
case "${1:-start}" in
    start)
        echo "============================================"
        echo "  Shakham Assessment Platform"
        echo "============================================"
        stop_services
        start_backend
        start_frontend
        show_status
        ;;
    stop)
        stop_services
        print_status "All services stopped"
        ;;
    restart)
        stop_services
        start_backend
        start_frontend
        show_status
        ;;
    status)
        show_status
        ;;
    logs)
        echo "=== Backend Logs (last 50 lines) ==="
        tail -50 "$BACKEND_LOG" 2>/dev/null || echo "No backend logs found"
        echo ""
        echo "=== Frontend Logs (last 50 lines) ==="
        tail -50 "$FRONTEND_LOG" 2>/dev/null || echo "No frontend logs found"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        exit 1
        ;;
esac
