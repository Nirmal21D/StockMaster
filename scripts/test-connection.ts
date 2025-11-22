import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

console.log('🔗 Testing MongoDB Atlas connection...');
console.log('Connection string:', MONGODB_URI.replace(/:[^:@]+@/, ':****@')); // Hide password

async function testConnection() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connection successful!');
    
    // Test a simple operation
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`📦 Found ${collections.length} collections in database`);
    
    await mongoose.disconnect();
    console.log('✅ Disconnected successfully');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    
    if (error.message.includes('bad auth') || error.message.includes('Authentication failed')) {
      console.error('\n💡 Authentication Error - Possible causes:');
      console.error('   1. Wrong username or password');
      console.error('   2. Password contains special characters that need URL encoding');
      console.error('   3. User does not exist in MongoDB Atlas');
      console.error('   4. User does not have proper permissions');
      console.error('\n   Fix:');
      console.error('   1. Go to MongoDB Atlas → Database Access');
      console.error('   2. Verify your user exists and password is correct');
      console.error('   3. If password has special chars, URL-encode them in connection string');
      console.error('   4. Make sure user has "Atlas admin" or "Read and write" permissions');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('\n💡 Network Error - Possible causes:');
      console.error('   1. Your IP is not whitelisted in MongoDB Atlas');
      console.error('   2. Internet connection issue');
      console.error('\n   Fix:');
      console.error('   1. Go to MongoDB Atlas → Network Access');
      console.error('   2. Add your current IP address');
      console.error('   3. Or temporarily add 0.0.0.0/0 for development (not recommended for production)');
    }
    
    process.exit(1);
  }
}

testConnection();

