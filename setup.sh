#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Starting environment setup..."

# 1. Install Python dependencies
echo "📦 Installing Python dependencies..."
python -m pip install -r kartawarta-backend/requirements.txt
python -m pip install -r kartawarta-vision-backend/requirements.txt

# 2. Install NPM dependencies
echo "📦 Installing Frontend dependencies..."
npm --prefix kartawarta-frontend install

# 3. Pull and Start SQL Server via Docker
echo "🐳 Starting SQL Server..."
docker pull mcr.microsoft.com/mssql/server:2025-latest
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=*" \
   -p 1433:1433 --name sqlserver --hostname sqlserver \
   -d mcr.microsoft.com/mssql/server:2025-latest

# 4. Wait for SQL Server to wake up (crucial for the script to succeed)
echo "⏳ Waiting for SQL Server to start (20s)..."
sleep 20

# 5. Prefill database
echo "🗄️ Preparing database..."
python kartawarta-backend/db/prepare_db.py

echo "✅ Setup complete! You are ready to develop."


docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=*" -p 1433:1433 --name sqlserver --hostname sqlserver -d mcr.microsoft.com/mssql/server:2025-latest