import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import connectDB from '../lib/mongodb';
import User from '../lib/models/User';

async function createAdmin() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    const email = process.env.ADMIN_EMAIL || 'admin@stockmaster.com';
    const password = process.env.ADMIN_PASSWORD || 'password123';
    const name = process.env.ADMIN_NAME || 'Admin User';

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await User.findOneAndUpdate(
      { email },
      {
        name,
        email,
        password: hashedPassword,
        role: 'ADMIN',
        status: 'ACTIVE',
        isActive: true,
        assignedWarehouses: [],
      },
      { upsert: true, new: true }
    );

    console.log('✅ Admin user created/updated successfully!');
    console.log(`Email: ${admin.email}`);
    console.log(`Password: ${password}`);
    console.log(`Status: ${admin.status}`);
    console.log(`Role: ${admin.role}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
}

createAdmin();

