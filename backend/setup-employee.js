const EmployeeService = require('./services/EmployeeService');
const initFirebaseAdmin = require('./firebase-admin');

async function setupDefaultEmployee() {
  console.log('🔧 Setting up default employee user...');
  
  try {
    // Initialize Firebase Admin
    initFirebaseAdmin();
    
    // Check if employee user already exists
    const employeeEmail = 'employee@ems.com';
    const existingEmployee = await EmployeeService.findByEmail(employeeEmail);
    
    if (existingEmployee) {
      console.log('✅ Employee user already exists:', existingEmployee.email);
      console.log('👤 Employee details:');
      console.log('   Name:', existingEmployee.name);
      console.log('   Email:', existingEmployee.email);
      console.log('   Role:', existingEmployee.role);
      console.log('   Password: employee123 (default)');
      return existingEmployee;
    }
    
    // Create default employee user
    console.log('📝 Creating default employee user...');
    const employeeData = {
      name: 'John Doe',
      email: employeeEmail,
      password: 'employee123', // Default password - should be changed
      role: 'employee',
      department: 'Engineering',
      position: 'Software Engineer',
      salary: '75000',
      workingType: 'Work in Office',
      skills: 'JavaScript, React, Node.js',
      address: '123 Main St, City',
      emergencyContact: '+1-555-0123'
    };
    
    const employee = await EmployeeService.create(employeeData);
    console.log('✅ Default employee user created successfully!');
    console.log('👤 Employee login credentials:');
    console.log('   Email: employee@ems.com');
    console.log('   Password: employee123');
    console.log('   ⚠️  Please change the password after first login!');
    
    return employee;
  } catch (error) {
    console.error('❌ Error setting up employee user:', error);
    throw error;
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDefaultEmployee()
    .then(() => {
      console.log('🎉 Employee setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Employee setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupDefaultEmployee };
