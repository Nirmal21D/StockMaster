import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import connectDB from './lib/mongodb';
import User from './lib/models/User';
import Warehouse from './lib/models/Warehouse';
import Location from './lib/models/Location';
import Product from './lib/models/Product';
import StockLevel from './lib/models/StockLevel';

async function seed() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Clear existing data (optional - comment out if you want to keep existing data)
    await User.deleteMany({});
    await Warehouse.deleteMany({});
    await Location.deleteMany({});
    await Product.deleteMany({});
    await StockLevel.deleteMany({});

    // Create users
    const hashedPassword = await bcrypt.hash('password123', 10);

    const admin = await User.findOneAndUpdate(
      { email: 'admin@stockmaster.com' },
      {
        name: 'Admin User',
        email: 'admin@stockmaster.com',
        password: hashedPassword,
        role: 'ADMIN',
        status: 'ACTIVE',
        isActive: true,
        assignedWarehouses: [],
      },
      { upsert: true, new: true }
    );

    const operator = await User.findOneAndUpdate(
      { email: 'operator@stockmaster.com' },
      {
        name: 'Operator User',
        email: 'operator@stockmaster.com',
        password: hashedPassword,
        role: 'OPERATOR',
        status: 'ACTIVE',
        isActive: true,
        assignedWarehouses: [],
      },
      { upsert: true, new: true }
    );

    const manager = await User.findOneAndUpdate(
      { email: 'manager@stockmaster.com' },
      {
        name: 'Manager User',
        email: 'manager@stockmaster.com',
        password: hashedPassword,
        role: 'MANAGER',
        status: 'ACTIVE',
        isActive: true,
        assignedWarehouses: [],
      },
      { upsert: true, new: true }
    );

    console.log('Users created:', { admin: admin.email, operator: operator.email, manager: manager.email });

    // Create warehouses
    const warehouse1 = await Warehouse.findOneAndUpdate(
      { code: 'WH_MUM' },
      {
        name: 'Mumbai Central',
        code: 'WH_MUM',
        address: 'Mumbai, Maharashtra',
        description: 'Main warehouse in Mumbai',
        isActive: true,
      },
      { upsert: true, new: true }
    );

    const warehouse2 = await Warehouse.findOneAndUpdate(
      { code: 'WH_PUNE' },
      {
        name: 'Pune Store',
        code: 'WH_PUNE',
        address: 'Pune, Maharashtra',
        description: 'Secondary warehouse in Pune',
        isActive: true,
      },
      { upsert: true, new: true }
    );

    console.log('Warehouses created:', warehouse1.name, warehouse2.name);

    // Create locations
    const location1 = await Location.findOneAndUpdate(
      { warehouseId: warehouse1._id, name: 'Rack A - Shelf 1' },
      {
        warehouseId: warehouse1._id,
        name: 'Rack A - Shelf 1',
        code: 'RACK-A-1',
        description: 'Main storage rack',
        isActive: true,
      },
      { upsert: true, new: true }
    );

    const location2 = await Location.findOneAndUpdate(
      { warehouseId: warehouse1._id, name: 'Rack B - Shelf 2' },
      {
        warehouseId: warehouse1._id,
        name: 'Rack B - Shelf 2',
        code: 'RACK-B-2',
        description: 'Secondary storage rack',
        isActive: true,
      },
      { upsert: true, new: true }
    );

    const location3 = await Location.findOneAndUpdate(
      { warehouseId: warehouse2._id, name: 'Storage Room 1' },
      {
        warehouseId: warehouse2._id,
        name: 'Storage Room 1',
        code: 'ROOM-1',
        description: 'Main storage room',
        isActive: true,
      },
      { upsert: true, new: true }
    );

    console.log('Locations created');

    // Create products
    const products = [
      {
        name: 'Desk',
        sku: 'DESK001',
        category: 'Furniture',
        unit: 'pcs',
        price: 3000,
        reorderLevel: 10,
        abcClass: 'A' as const,
      },
      {
        name: 'Table',
        sku: 'TABLE001',
        category: 'Furniture',
        unit: 'pcs',
        price: 3000,
        reorderLevel: 15,
        abcClass: 'A' as const,
      },
      {
        name: 'Chair',
        sku: 'CHAIR001',
        category: 'Furniture',
        unit: 'pcs',
        price: 1500,
        reorderLevel: 20,
        abcClass: 'B' as const,
      },
      {
        name: 'Lamp',
        sku: 'LAMP001',
        category: 'Lighting',
        unit: 'pcs',
        price: 500,
        reorderLevel: 30,
        abcClass: 'C' as const,
      },
      {
        name: 'Monitor',
        sku: 'MON001',
        category: 'Electronics',
        unit: 'pcs',
        price: 8000,
        reorderLevel: 5,
        abcClass: 'A' as const,
      },
    ];

    const createdProducts = [];
    for (const productData of products) {
      const product = await Product.findOneAndUpdate(
        { sku: productData.sku },
        productData,
        { upsert: true, new: true }
      );
      createdProducts.push(product);
    }

    console.log('Products created:', createdProducts.length);

    // Create stock levels
    const stockLevels = [
      {
        productId: createdProducts[0]._id, // Desk
        warehouseId: warehouse1._id,
        locationId: location1._id,
        quantity: 50,
      },
      {
        productId: createdProducts[0]._id, // Desk
        warehouseId: warehouse2._id,
        locationId: location3._id,
        quantity: 30,
      },
      {
        productId: createdProducts[1]._id, // Table
        warehouseId: warehouse1._id,
        locationId: location1._id,
        quantity: 50,
      },
      {
        productId: createdProducts[1]._id, // Table
        warehouseId: warehouse2._id,
        locationId: location3._id,
        quantity: 25,
      },
      {
        productId: createdProducts[2]._id, // Chair
        warehouseId: warehouse1._id,
        locationId: location2._id,
        quantity: 100,
      },
      {
        productId: createdProducts[3]._id, // Lamp
        warehouseId: warehouse1._id,
        locationId: location2._id,
        quantity: 200,
      },
      {
        productId: createdProducts[4]._id, // Monitor
        warehouseId: warehouse1._id,
        locationId: location1._id,
        quantity: 15,
      },
    ];

    for (const stockData of stockLevels) {
      await StockLevel.findOneAndUpdate(
        {
          productId: stockData.productId,
          warehouseId: stockData.warehouseId,
          locationId: stockData.locationId || null,
        },
        {
          $set: { quantity: stockData.quantity },
        },
        { upsert: true, new: true }
      );
    }

    console.log('Stock levels created:', stockLevels.length);

    console.log('\n✅ Seed completed successfully!');
    console.log('\nLogin credentials:');
    console.log('Admin: admin@stockmaster.com / password123');
    console.log('Operator: operator@stockmaster.com / password123');
    console.log('Manager: manager@stockmaster.com / password123');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();

