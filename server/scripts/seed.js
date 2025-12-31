/**
 * Seed script to create initial admin user
 * Run: node scripts/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

const seedAdmin = async () => {
    try {
        await connectDB();

        // Check if admin already exists
        const existingAdmin = await User.findOne({ role: 'admin' });

        if (existingAdmin) {
            console.log('Admin user already exists:');
            console.log(`  Email: ${existingAdmin.email}`);
            console.log('  Password: (use existing or reset in app)');
            process.exit(0);
        }

        // Create admin user
        const admin = await User.create({
            email: 'admin@littleride.et',
            password: 'admin123',
            name: 'System Administrator',
            role: 'admin',
            phone: '+251911000000'
        });

        console.log('✅ Admin user created successfully!');
        console.log('');
        console.log('Login credentials:');
        console.log('  Email: admin@littleride.et');
        console.log('  Password: admin123');
        console.log('');
        console.log('⚠️  Please change the password after first login!');

        // Create sample sales agent
        const salesAgent = await User.create({
            email: 'sales@littleride.et',
            password: 'sales123',
            name: 'Demo Sales Agent',
            role: 'sales_agent',
            phone: '+251922000000'
        });

        console.log('');
        console.log('✅ Sample sales agent created:');
        console.log('  Email: sales@littleride.et');
        console.log('  Password: sales123');

        // Create sample operations officer
        const operations = await User.create({
            email: 'ops@littleride.et',
            password: 'ops123',
            name: 'Demo Operations Officer',
            role: 'operations',
            phone: '+251933000000'
        });

        console.log('');
        console.log('✅ Sample operations officer created:');
        console.log('  Email: ops@littleride.et');
        console.log('  Password: ops123');

        process.exit(0);

    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedAdmin();
