#!/bin/bash

# AyurCare Pro - Local Setup Script
# Run this script after cloning the repository

set -e

echo "=========================================="
echo "  AyurCare Pro - Local Setup"
echo "=========================================="

# Check prerequisites
echo ""
echo "Checking prerequisites..."

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11+"
    exit 1
fi
echo "✅ Python found: $(python3 --version)"

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
fi
echo "✅ Node.js found: $(node --version)"

if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB not found locally. Make sure you have MongoDB running or use MongoDB Atlas"
fi

# Setup Backend
echo ""
echo "Setting up Backend..."
cd backend

if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing Python dependencies..."
pip install -r requirements.txt --quiet

if [ ! -f ".env" ]; then
    echo "Creating .env from template..."
    cp .env.example .env
    echo "⚠️  Please edit backend/.env with your MongoDB URL"
fi

cd ..

# Setup Frontend
echo ""
echo "Setting up Frontend..."
cd frontend

echo "Installing Node.js dependencies..."
if command -v yarn &> /dev/null; then
    yarn install --silent
else
    npm install --silent
fi

if [ ! -f ".env" ]; then
    echo "Creating .env from template..."
    cp .env.example .env
fi

cd ..

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "To run the application:"
echo ""
echo "1. Start MongoDB (if running locally)"
echo "   mongod --dbpath /path/to/data"
echo ""
echo "2. Start Backend (Terminal 1):"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   uvicorn server:app --host 0.0.0.0 --port 8001 --reload"
echo ""
echo "3. Start Frontend (Terminal 2):"
echo "   cd frontend"
echo "   yarn start  # or npm start"
echo ""
echo "4. Open http://localhost:3000 in your browser"
echo ""
echo "Default Login: admin@ayurcare.com / admin123"
echo ""
