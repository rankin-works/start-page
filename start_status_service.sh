#!/bin/bash

# Navigate to the script directory
cd "$(dirname "$0")"

# Activate virtual environment
source venv/bin/activate

# Check if the virtual environment is activated
if [ -z "$VIRTUAL_ENV" ]; then
    echo "Virtual environment not activated. Exiting."
    exit 1
fi

# Verify Python version
python3 --version

# Install netcat if not present
if ! command -v nc &> /dev/null; then
    echo "Installing netcat..."
    apt-get update && apt-get install -y netcat-openbsd
fi

# Check if dependencies are installed
echo "Checking dependencies..."
pip list | grep aiohttp

# Ensure dependencies are installed
pip install -r requirements.txt

# Kill any existing instances
echo "Killing existing instances..."
pkill -f "python3 status_checker.py"

# Redirect output to a log file for debugging
LOG_FILE="status_service.log"

# Clear previous log
> "$LOG_FILE"

# Start the service with full output logging
echo "Starting status service... Logging to $LOG_FILE"
python3 status_checker.py -p 8082 > "$LOG_FILE" 2>&1 &

# Wait a moment to allow service to start or fail
sleep 3

# Check the log file
echo "=== Service Log Start ==="
cat "$LOG_FILE"
echo "=== Service Log End ==="

# Check if the process is running
if pgrep -f "python3 status_checker.py" > /dev/null; then
    echo "Status service appears to be running."
    
    # Use nc to check port listening
    if nc -z localhost 8082; then
        echo "Port 8082 is listening."
        curl http://localhost:8082/status
    else
        echo "Port 8082 is not listening."
        exit 1
    fi
else
    echo "Failed to start status service. Check the log above for details."
    exit 1
fi