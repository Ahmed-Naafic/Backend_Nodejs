/**
 * Database Seeder
 * Seeds initial data (roles, permissions, menus, default users)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User.model');
const Role = require('../models/Role.model');
const Permission = require('../models/Permission.model');
const Menu = require('../models/Menu.model');

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nira_system');
    console.log('Connected to MongoDB');

    // Clear existing data (optional - comment out in production)
    // await User.deleteMany({});
    // await Role.deleteMany({});
    // await Permission.deleteMany({});
    // await Menu.deleteMany({});

    // Create Roles
    const adminRole = await Role.findOneAndUpdate(
      { name: 'ADMIN' },
      { name: 'ADMIN', description: 'System Administrator with full access' },
      { upsert: true, new: true }
    );

    const officerRole = await Role.findOneAndUpdate(
      { name: 'OFFICER' },
      { name: 'OFFICER', description: 'Registration Officer with citizen management access' },
      { upsert: true, new: true }
    );

    const viewerRole = await Role.findOneAndUpdate(
      { name: 'VIEWER' },
      { name: 'VIEWER', description: 'View-only access to citizen records' },
      { upsert: true, new: true }
    );

    console.log('✓ Roles created');

    // Create Permissions
    const permissions = [
      { code: 'MANAGE_USERS', name: 'Manage Users', description: 'Create, update, and delete system users' },
      { code: 'VIEW_CITIZEN', name: 'View Citizens', description: 'View citizen records' },
      { code: 'CREATE_CITIZEN', name: 'Create Citizens', description: 'Register new citizens' },
      { code: 'UPDATE_CITIZEN', name: 'Update Citizens', description: 'Update citizen information' },
      { code: 'DELETE_CITIZEN', name: 'Delete Citizens', description: 'Delete citizen records' },
      { code: 'VIEW_DASHBOARD', name: 'View Dashboard', description: 'Access dashboard statistics' },
      { code: 'VIEW_REPORTS', name: 'View Reports', description: 'Access system reports' },
      { code: 'MANAGE_NOTICES', name: 'Manage Notices', description: 'Create and manage system notices' },
      { code: 'VIEW_ACTIVITIES', name: 'View Activities', description: 'View system activity logs' }
    ];

    const createdPermissions = [];
    for (const perm of permissions) {
      const permission = await Permission.findOneAndUpdate(
        { code: perm.code },
        perm,
        { upsert: true, new: true }
      );
      createdPermissions.push(permission);
    }

    console.log('✓ Permissions created');

    // Assign permissions to roles
    adminRole.permissions = createdPermissions.map(p => p._id);
    await adminRole.save();

    officerRole.permissions = createdPermissions
      .filter(p => ['VIEW_CITIZEN', 'CREATE_CITIZEN', 'UPDATE_CITIZEN', 'VIEW_DASHBOARD', 'VIEW_REPORTS'].includes(p.code))
      .map(p => p._id);
    await officerRole.save();

    viewerRole.permissions = createdPermissions
      .filter(p => ['VIEW_CITIZEN', 'VIEW_DASHBOARD'].includes(p.code))
      .map(p => p._id);
    await viewerRole.save();

    console.log('✓ Permissions assigned to roles');

    // Create Menus
    // Menus matching PHP/MySQL database structure
    // Note: MongoDB uses 'name' field, but we map it to 'label' in the response to match PHP format
    const menus = [
      { name: 'Dashboard', route: '/dashboard', icon: 'home', orderIndex: 1, permissionCode: 'VIEW_DASHBOARD', parentId: null },
      { name: 'Citizens', route: '/citizens', icon: 'users', orderIndex: 2, permissionCode: 'VIEW_CITIZEN', parentId: null },
      { name: 'Add Citizen', route: '/citizens/create', icon: 'user-plus', orderIndex: 3, permissionCode: 'CREATE_CITIZEN', parentId: null },
      { name: 'Reports', route: '/reports', icon: 'bar-chart', orderIndex: 4, permissionCode: 'VIEW_REPORTS', parentId: null },
      { name: 'User Management', route: '/users', icon: 'settings', orderIndex: 5, permissionCode: 'MANAGE_USERS', parentId: null }
    ];

    const createdMenus = [];
    for (const menu of menus) {
      const menuDoc = await Menu.findOneAndUpdate(
        { name: menu.name },
        menu,
        { upsert: true, new: true }
      );
      createdMenus.push(menuDoc);
    }

    // Update parent IDs for nested menus (matching PHP database structure)
    // In the PHP DB: "Add Citizen" (id: 3) has parent_id: 2 (Citizens)
    const citizensMenu = createdMenus.find(m => m.name === 'Citizens');
    const addCitizenMenu = createdMenus.find(m => m.name === 'Add Citizen');
    
    if (citizensMenu && addCitizenMenu) {
      addCitizenMenu.parentId = citizensMenu._id;
      await addCitizenMenu.save();
    }

    console.log('✓ Menus created');

    // Create default users
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      const admin = new User({
        username: 'admin',
        password: 'admin123', // Will be hashed by pre-save hook
        roleId: adminRole._id,
        role: 'ADMIN',
        status: 'ACTIVE'
      });
      await admin.save();
      console.log('✓ Admin user created (username: admin, password: admin123)');
    }

    const officerExists = await User.findOne({ username: 'officer1' });
    if (!officerExists) {
      const officer = new User({
        username: 'officer1',
        password: 'admin123', // Will be hashed by pre-save hook
        roleId: officerRole._id,
        role: 'OFFICER',
        status: 'ACTIVE'
      });
      await officer.save();
      console.log('✓ Officer user created (username: officer1, password: admin123)');
    }

    console.log('\n✅ Database seeding completed!');
    console.log('\nDefault credentials:');
    console.log('  Admin: username=admin, password=admin123');
    console.log('  Officer: username=officer1, password=admin123');
    console.log('\n⚠️  IMPORTANT: Change these passwords in production!');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
