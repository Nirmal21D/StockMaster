# MongoDB Setup Guide

## Error: `ECONNREFUSED ::1:27017`

This error means MongoDB is not running on your local machine. Here are solutions:

## Option 1: Use MongoDB Atlas (Recommended - Easiest)

MongoDB Atlas is a free cloud-hosted MongoDB service.

### Steps:

1. **Sign up for MongoDB Atlas** (free tier available):
   - Go to https://www.mongodb.com/cloud/atlas/register
   - Create a free account

2. **Create a Cluster**:
   - Click "Build a Database"
   - Choose FREE (M0) tier
   - Select a cloud provider and region
   - Click "Create"

3. **Set up Database Access**:
   - Go to "Database Access" in the left menu
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Create username and password (save these!)
   - Set user privileges to "Atlas admin" or "Read and write to any database"
   - Click "Add User"

4. **Set up Network Access**:
   - Go to "Network Access" in the left menu
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (for development) or add your IP
   - Click "Confirm"

5. **Get Connection String**:
   - Go to "Database" in the left menu
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (looks like: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`)

6. **Update your .env.local**:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/stockmaster?retryWrites=true&w=majority
   ```
   Replace `username` and `password` with your database user credentials, and `stockmaster` is your database name.

## Option 2: Install and Run MongoDB Locally

### Windows:

1. **Download MongoDB Community Server**:
   - Go to https://www.mongodb.com/try/download/community
   - Select Windows, MSI package
   - Download and install

2. **Start MongoDB Service**:
   ```powershell
   # Option A: Start as Windows Service (if installed as service)
   net start MongoDB
   
   # Option B: Run manually
   mongod --dbpath "C:\data\db"
   ```
   (Create `C:\data\db` directory first if it doesn't exist)

3. **Verify MongoDB is running**:
   ```powershell
   mongosh
   ```
   If it connects, MongoDB is running!

### macOS:

1. **Install using Homebrew**:
   ```bash
   brew tap mongodb/brew
   brew install mongodb-community
   ```

2. **Start MongoDB**:
   ```bash
   brew services start mongodb-community
   ```

3. **Verify**:
   ```bash
   mongosh
   ```

### Linux:

1. **Install MongoDB**:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install -y mongodb
   
   # Or use official MongoDB repository
   wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
   sudo apt-get update
   sudo apt-get install -y mongodb-org
   ```

2. **Start MongoDB**:
   ```bash
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```

3. **Verify**:
   ```bash
   mongosh
   ```

## Quick Check Commands

### Check if MongoDB is running:
```powershell
# Windows
Get-Service MongoDB

# Or test connection
mongosh
```

### If MongoDB is installed but not running:
```powershell
# Windows - Start service
net start MongoDB

# Or run manually
mongod --dbpath "C:\data\db"
```

## After Setup

Once MongoDB is running (locally or Atlas), run:

```bash
npm run seed
```

This will populate your database with demo data.

## Troubleshooting

### Port 27017 already in use:
- Another MongoDB instance might be running
- Check: `netstat -ano | findstr :27017` (Windows)
- Kill the process or use a different port

### Permission errors:
- Make sure you have write permissions to the data directory
- On Windows, run PowerShell as Administrator

### Connection timeout with Atlas:
- Check your IP is whitelisted in Network Access
- Verify your connection string is correct
- Make sure your database user has proper permissions

