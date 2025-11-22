# Fixing MongoDB Atlas Connection

## Common Issues and Solutions

### 1. Password with Special Characters
If your password contains special characters like `@`, `#`, `%`, etc., they need to be URL-encoded in the connection string.

**Example:**
- Password: `p@ssw0rd#123`
- URL-encoded: `p%40ssw0rd%23123`

Common encodings:
- `@` → `%40`
- `#` → `%23`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `/` → `%2F`
- `?` → `%3F`
- `=` → `%3D`

### 2. Get Fresh Connection String from MongoDB Atlas

1. Go to https://cloud.mongodb.com
2. Log in to your account
3. Click on your cluster
4. Click "Connect"
5. Choose "Connect your application"
6. Copy the connection string
7. Replace `<password>` with your actual password (URL-encoded if needed)
8. Replace `<dbname>` with `stockmaster` (or your database name)

### 3. Check Database User

1. Go to "Database Access" in MongoDB Atlas
2. Verify your user exists and is active
3. Check the user's password
4. Make sure the user has "Atlas admin" or "Read and write to any database" permissions

### 4. Check Network Access

1. Go to "Network Access" in MongoDB Atlas
2. Add your current IP address, OR
3. For development, temporarily add `0.0.0.0/0` (Allow Access from Anywhere)
   - **Warning:** Only use this for development, not production!

### 5. Connection String Format

Correct format:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/stockmaster?retryWrites=true&w=majority
```

Make sure:
- No quotes around the connection string in `.env.local`
- Password is URL-encoded if it has special characters
- Database name is included (e.g., `/stockmaster`)

### 6. Test Your Connection String

You can test the connection string using MongoDB Compass or mongosh:

```bash
mongosh "mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/stockmaster"
```

If this works, the connection string is correct. If not, check the credentials.

