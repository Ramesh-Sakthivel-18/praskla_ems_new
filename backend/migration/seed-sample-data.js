/**
 * seed-sample-data.js
 * 
 * Seeds Firestore with sample data in the NEW hierarchical structure.
 * Use this after deleting old data to test your new system.
 * 
 * HOW TO RUN:
 * node migration/seed-sample-data.js
 */

const admin = require('firebase-admin');
const path = require('path');
const bcrypt = require('bcryptjs');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

console.log('🌱 FIRESTORE SEEDING SCRIPT');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Creating sample data in new hierarchical structure...\n');

/**
 * Seed Organizations
 */
async function seedOrganizations() {
  console.log('📦 Creating sample organizations...');

  const organizations = [
    {
      id: 'org_demo_001',
      name: 'Demo Company Ltd',
      ownerEmail: 'owner@democompany.com',
      ownerName: 'John Owner',
      phone: '+1234567890',
      isActive: true,
      maxBusinessOwners: 5,
      maxAdmins: 20,
      maxEmployees: 1000,
      employeesPerAdmin: 50,
      counts: {
        businessOwners: 1,
        admins: 2,
        employees: 5
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      id: 'org_test_002',
      name: 'Test Organization',
      ownerEmail: 'test@testorg.com',
      ownerName: 'Jane Test',
      phone: '+0987654321',
      isActive: true,
      maxBusinessOwners: 5,
      maxAdmins: 10,
      maxEmployees: 500,
      employeesPerAdmin: 50,
      counts: {
        businessOwners: 1,
        admins: 1,
        employees: 3
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ];

  for (const org of organizations) {
    const orgId = org.id;
    delete org.id;
    await db.collection('organizations').doc(orgId).set(org);
    console.log(`  ✓ Created organization: ${org.name} (${orgId})`);
  }

  console.log('✅ Organizations created\n');
  return organizations.map((org, index) =>
    ({ id: index === 0 ? 'org_demo_001' : 'org_test_002', ...org })
  );
}

/**
 * Seed Users
 */
async function seedUsers(organizations) {
  console.log('👥 Creating sample users...');

  // Password hash for 'password123' (for regular users)
  const passwordHash = await bcrypt.hash('password123', 10);

  // Password hash for manager (logith18801880.)
  const managerPasswordHash = await bcrypt.hash('logith18801880.', 10);

  const org1 = 'org_demo_001';
  const org2 = 'org_test_002';

  const users = [
    // System Manager (no organization)
    {
      orgId: null,
      id: 'ey9IbTtwO6NLAhVOGY1E7QMnup82',
      name: 'Logithkumar',
      email: 'logithkumar188@gmail.com',
      passwordHash: managerPasswordHash,
      role: 'manager',
      department: 'System',
      position: 'System Manager',
      isActive: true,
      createdBy: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    // Organization 1 - Demo Company
    {
      orgId: org1,
      id: 'user_owner_001',
      name: 'John Owner',
      email: 'owner@democompany.com',
      passwordHash,
      role: 'business_owner',
      department: 'Management',
      position: 'CEO',
      salary: '150000',
      workingType: 'full-time',
      isActive: true,
      createdBy: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      orgId: org1,
      id: 'user_admin_001',
      name: 'Alice Admin',
      email: 'admin@democompany.com',
      passwordHash,
      role: 'admin',
      department: 'HR',
      position: 'HR Manager',
      salary: '80000',
      workingType: 'full-time',
      isActive: true,
      createdBy: 'user_owner_001',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      orgId: org1,
      id: 'user_admin_002',
      name: 'Bob Admin',
      email: 'bob@democompany.com',
      passwordHash,
      role: 'admin',
      department: 'IT',
      position: 'IT Manager',
      salary: '85000',
      workingType: 'full-time',
      isActive: true,
      createdBy: 'user_owner_001',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      orgId: org1,
      id: 'user_emp_001',
      name: 'Charlie Employee',
      email: 'charlie@democompany.com',
      passwordHash,
      role: 'employee',
      department: 'Sales',
      position: 'Sales Executive',
      salary: '50000',
      workingType: 'full-time',
      isActive: true,
      createdBy: 'user_admin_001',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      orgId: org1,
      id: 'user_emp_002',
      name: 'Diana Employee',
      email: 'diana@democompany.com',
      passwordHash,
      role: 'employee',
      department: 'Marketing',
      position: 'Marketing Specialist',
      salary: '55000',
      workingType: 'full-time',
      isActive: true,
      createdBy: 'user_admin_001',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      orgId: org1,
      id: 'user_emp_003',
      name: 'Eve Employee',
      email: 'eve@democompany.com',
      passwordHash,
      role: 'employee',
      department: 'IT',
      position: 'Software Developer',
      salary: '70000',
      workingType: 'full-time',
      isActive: true,
      createdBy: 'user_admin_002',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      orgId: org1,
      id: 'user_emp_004',
      name: 'Frank Employee',
      email: 'frank@democompany.com',
      passwordHash,
      role: 'employee',
      department: 'IT',
      position: 'DevOps Engineer',
      salary: '65000',
      workingType: 'full-time',
      isActive: true,
      createdBy: 'user_admin_002',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      orgId: org1,
      id: 'user_emp_005',
      name: 'Grace Employee',
      email: 'grace@democompany.com',
      passwordHash,
      role: 'employee',
      department: 'Finance',
      position: 'Accountant',
      salary: '60000',
      workingType: 'full-time',
      isActive: true,
      createdBy: 'user_admin_001',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },

    // Organization 2 - Test Organization
    {
      orgId: org2,
      id: 'user_owner_002',
      name: 'Jane Test',
      email: 'test@testorg.com',
      passwordHash,
      role: 'business_owner',
      department: 'Management',
      position: 'Owner',
      salary: '120000',
      workingType: 'full-time',
      isActive: true,
      createdBy: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      orgId: org2,
      id: 'user_admin_003',
      name: 'Kevin Admin',
      email: 'kevin@testorg.com',
      passwordHash,
      role: 'admin',
      department: 'Operations',
      position: 'Operations Manager',
      salary: '75000',
      workingType: 'full-time',
      isActive: true,
      createdBy: 'user_owner_002',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      orgId: org2,
      id: 'user_emp_006',
      name: 'Laura Employee',
      email: 'laura@testorg.com',
      passwordHash,
      role: 'employee',
      department: 'Support',
      position: 'Customer Support',
      salary: '45000',
      workingType: 'full-time',
      isActive: true,
      createdBy: 'user_admin_003',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      orgId: org2,
      id: 'user_emp_007',
      name: 'Mike Employee',
      email: 'mike@testorg.com',
      passwordHash,
      role: 'employee',
      department: 'Support',
      position: 'Technical Support',
      salary: '48000',
      workingType: 'full-time',
      isActive: true,
      createdBy: 'user_admin_003',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      orgId: org2,
      id: 'user_emp_008',
      name: 'Nina Employee',
      email: 'nina@testorg.com',
      passwordHash,
      role: 'employee',
      department: 'Sales',
      position: 'Sales Representative',
      salary: '50000',
      workingType: 'part-time',
      isActive: true,
      createdBy: 'user_admin_003',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ];

  for (const user of users) {
    const orgId = user.orgId;
    const userId = user.id;
    delete user.orgId;
    delete user.id;

    if (orgId) {
      // Organization-level user (admin, employee, business_owner)
      await db.collection('organizations')
        .doc(orgId)
        .collection('users')
        .doc(userId)
        .set(user);
      console.log(`  ✓ Created user: ${user.name} (${user.role}) in ${orgId}`);
    } else {
      // System-level user (manager) - store in root users collection
      await db.collection('users')
        .doc(userId)
        .set({
          ...user,
          organizationId: null,
          isSystemUser: true
        });
      console.log(`  ✓ Created system user: ${user.name} (${user.role})`);
    }
  }

  console.log('✅ Users created\n');
  return users;
}

/**
 * Seed Attendance Records
 */
async function seedAttendance() {
  console.log('📅 Creating sample attendance records...');

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const formatDate = (date) => date.toISOString().split('T')[0];

  const attendanceRecords = [
    // Today's attendance for Demo Company
    {
      orgId: 'org_demo_001',
      userId: 'user_emp_001',
      userName: 'Charlie Employee',
      date: formatDate(today),
      checkIn: '09:00:00',
      checkOut: null,
      breakIn: null,
      breakOut: null,
      hoursWorked: 0,
      status: 'present'
    },
    {
      orgId: 'org_demo_001',
      userId: 'user_emp_002',
      userName: 'Diana Employee',
      date: formatDate(today),
      checkIn: '08:55:00',
      checkOut: null,
      breakIn: null,
      breakOut: null,
      hoursWorked: 0,
      status: 'present'
    },
    {
      orgId: 'org_demo_001',
      userId: 'user_emp_003',
      userName: 'Eve Employee',
      date: formatDate(today),
      checkIn: '09:10:00',
      checkOut: null,
      breakIn: null,
      breakOut: null,
      hoursWorked: 0,
      status: 'present'
    },

    // Yesterday's attendance (completed)
    {
      orgId: 'org_demo_001',
      userId: 'user_emp_001',
      userName: 'Charlie Employee',
      date: formatDate(yesterday),
      checkIn: '09:00:00',
      checkOut: '18:00:00',
      breakIn: '13:00:00',
      breakOut: '14:00:00',
      hoursWorked: 8.0,
      status: 'present'
    },
    {
      orgId: 'org_demo_001',
      userId: 'user_emp_002',
      userName: 'Diana Employee',
      date: formatDate(yesterday),
      checkIn: '09:05:00',
      checkOut: '18:10:00',
      breakIn: '13:00:00',
      breakOut: '14:00:00',
      hoursWorked: 8.08,
      status: 'present'
    },

    // Test Organization attendance
    {
      orgId: 'org_test_002',
      userId: 'user_emp_006',
      userName: 'Laura Employee',
      date: formatDate(today),
      checkIn: '09:00:00',
      checkOut: null,
      breakIn: null,
      breakOut: null,
      hoursWorked: 0,
      status: 'present'
    }
  ];

  for (const record of attendanceRecords) {
    const orgId = record.orgId;
    delete record.orgId;

    const docRef = db.collection('organizations')
      .doc(orgId)
      .collection('attendance')
      .doc();

    await docRef.set({
      ...record,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`  ✓ Created attendance: ${record.userName} on ${record.date}`);
  }

  console.log('✅ Attendance records created\n');
}

/**
 * Seed Leave Requests
 */
async function seedLeaves() {
  console.log('🏖️  Creating sample leave requests...');

  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const formatDate = (date) => date.toISOString().split('T')[0];

  const leaves = [
    {
      orgId: 'org_demo_001',
      userId: 'user_emp_004',
      userName: 'Frank Employee',
      leaveType: 'vacation',
      startDate: formatDate(nextWeek),
      endDate: formatDate(new Date(nextWeek.getTime() + 3 * 24 * 60 * 60 * 1000)),
      days: 4,
      reason: 'Family vacation',
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      orgId: 'org_demo_001',
      userId: 'user_emp_005',
      userName: 'Grace Employee',
      leaveType: 'sick',
      startDate: formatDate(new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)),
      endDate: formatDate(new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)),
      days: 1,
      reason: 'Medical appointment',
      status: 'approved',
      reviewedBy: 'user_admin_001',
      reviewedByName: 'Alice Admin',
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      comments: 'Approved',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      orgId: 'org_test_002',
      userId: 'user_emp_007',
      userName: 'Mike Employee',
      leaveType: 'casual',
      startDate: formatDate(new Date(nextWeek.getTime() + 2 * 24 * 60 * 60 * 1000)),
      endDate: formatDate(new Date(nextWeek.getTime() + 2 * 24 * 60 * 60 * 1000)),
      days: 1,
      reason: 'Personal work',
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ];

  for (const leave of leaves) {
    const orgId = leave.orgId;
    delete leave.orgId;

    const docRef = db.collection('organizations')
      .doc(orgId)
      .collection('leaves')
      .doc();

    await docRef.set(leave);

    console.log(`  ✓ Created leave: ${leave.userName} (${leave.status})`);
  }

  console.log('✅ Leave requests created\n');
}

/**
 * Main seeding function
 */
async function seedAll() {
  try {
    const orgs = await seedOrganizations();
    await seedUsers(orgs);
    await seedAttendance();
    await seedLeaves();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SEEDING COMPLETE!');
    console.log('');
    console.log('📋 Sample Credentials:');
    console.log('');
    console.log('Organization 1: Demo Company Ltd');
    console.log('  Business Owner:');
    console.log('    Email: owner@democompany.com');
    console.log('    Password: password123');
    console.log('');
    console.log('  Admin:');
    console.log('    Email: admin@democompany.com');
    console.log('    Password: password123');
    console.log('');
    console.log('  Employee:');
    console.log('    Email: charlie@democompany.com');
    console.log('    Password: password123');
    console.log('');
    console.log('Organization 2: Test Organization');
    console.log('  Business Owner:');
    console.log('    Email: test@testorg.com');
    console.log('    Password: password123');
    console.log('');
    console.log('🎉 You can now test your system with these accounts!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding
seedAll();
