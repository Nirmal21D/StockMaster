import mongoose from 'mongoose';

function getMongoDBUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }
  return uri;
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(getMongoDBUri(), opts).then((mongoose) => {
      console.log('✅ MongoDB connected successfully');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e: any) {
    cached.promise = null;
    console.error('❌ MongoDB connection error:', e.message);
    if (e.message.includes('ECONNREFUSED')) {
      console.error('\n💡 MongoDB is not running. Please:');
      console.error('   1. Start MongoDB service: mongod (or use MongoDB Atlas)');
      console.error('   2. Or set MONGODB_URI in .env.local to your MongoDB Atlas connection string');
    } else if (e.message.includes('bad auth') || e.message.includes('Authentication failed')) {
      console.error('\n💡 MongoDB Atlas Authentication Failed. Please check:');
      console.error('   1. Your MongoDB Atlas username and password in .env.local');
      console.error('   2. Your IP is whitelisted in MongoDB Atlas Network Access');
      console.error('   3. The database user has proper permissions');
      console.error('   4. Try using local MongoDB instead: mongodb://localhost:27017/stockmaster');
      console.error('\n   To use local MongoDB, update .env.local:');
      console.error('   MONGODB_URI=mongodb://localhost:27017/stockmaster');
    }
    throw e;
  }

  return cached.conn;
}

export default connectDB;

