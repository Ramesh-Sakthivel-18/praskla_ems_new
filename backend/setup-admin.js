const EmployeeService = require('./services/EmployeeService');
const initFirebaseAdmin = require('./firebase-admin');

async function setupDefaultAdmin() {
  console.log('🔧 Setting up default admin user...');
  
  try {
    // Initialize Firebase Admin
    initFirebaseAdmin();
    
    // Check if admin user already exists
    const adminEmail = 'admin@ems.com';
    const existingAdmin = await EmployeeService.findByEmail(adminEmail);
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.email);
      console.log('👤 Admin details:');
      console.log('   Name:', existingAdmin.name);
      console.log('   Email:', existingAdmin.email);
      console.log('   Role:', existingAdmin.role);
      console.log('   Password: admin123 (default)');
      return existingAdmin;
    }
    
    // Create default admin user
    console.log('📝 Creating default admin user...');
    const adminData = {
      name: 'System Administrator',
      email: adminEmail,
      password: 'admin123', // Default password - should be changed after first login
      role: 'admin',
      department: 'IT',
      position: 'System Administrator',
      salary: '100000',
      workingType: 'Work in Office',
      skills: 'System Administration, Employee Management',
      address: 'Company Headquarters',
      emergencyContact: '+1-800-ADMIN'
    };
    
    const admin = await EmployeeService.create(adminData);
    console.log('✅ Default admin user created successfully!');
    console.log('👤 Admin login credentials:');
    console.log('   Email: admin@ems.com');
    console.log('   Password: admin123');
    console.log('   ⚠️  Please change the password after first login!');
    
    return admin;
  } catch (error) {
    console.error('❌ Error setting up admin user:', error);
    throw error;
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDefaultAdmin()
    .then(() => {
      console.log('🎉 Admin setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Admin setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupDefaultAdmin };