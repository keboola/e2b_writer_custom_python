#!/bin/bash
# Setup and test script for e2b Writer

set -e  # Exit on error

echo "=================================================="
echo "e2b Writer - Setup and Test"
echo "=================================================="
echo ""

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.9 or higher."
    exit 1
fi

echo "✓ Python found: $(python3 --version)"
echo ""

# Load .env file if it exists
if [ -f .env ]; then
    echo "Loading environment variables from .env file..."
    # Export variables from .env (ignore comments and empty lines)
    export $(grep -v '^#' .env | grep -v '^$' | xargs)
    echo "✓ .env file loaded"
    echo ""
fi

# Check if E2B_API_KEY is set
if [ -z "$E2B_API_KEY" ]; then
    echo "❌ E2B_API_KEY environment variable is not set!"
    echo ""
    echo "Please either:"
    echo "  1. Create a .env file with: E2B_API_KEY=your-api-key-here"
    echo "  2. Or export it: export E2B_API_KEY='your-api-key-here'"
    echo ""
    echo "You can get your API key from: https://e2b.dev/docs"
    exit 1
fi

echo "✓ E2B_API_KEY is set: ${E2B_API_KEY:0:8}..."
echo ""

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi
echo ""

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate
echo "✓ Virtual environment activated"
echo ""

# Install dependencies
echo "Installing dependencies..."
pip install --upgrade pip -q
pip install -r requirements.txt -q
echo "✓ Dependencies installed"
echo ""

# Run the main script
echo "Running main.py..."
echo ""
python main.py

# Deactivate virtual environment
deactivate

echo ""
echo "=================================================="
echo "✓ Setup and test completed!"
echo "=================================================="
