const { getFirestore } = require('firebase-admin/firestore');
const initFirebaseAdmin = require('../firebase-admin');
const db = getFirestore(initFirebaseAdmin());

class EmployeeService {
  // Create employee
  static async create(employeeData) {
    console.log('🔧 EmployeeService.create() - Creating employee in Firebase');
    console.log('Employee data:', employeeData);
    try {
      const { 
        name, 
        email, 
        password, 
        role, 
        department, 
        position, 
        salary, 
        workingType, 
        skills, 
        address, 
        emergencyContact,
        organizationId // ✅ ADDED
      } = employeeData;

      const employeeRef = db.collection('employees').doc();
      console.log('📄 Generated employee document ID:', employeeRef.id);

      const employee = {
        id: employeeRef.id,
        name,
        email: email.toLowerCase(),
        password, // In real app, this should be hashed
        role: role || 'employee',
        department,
        position: position || role || 'employee',
        salary: salary || '0',
        workingType,
        skills: skills || '',
        address: address || '',
        emergencyContact: emergencyContact || '',
        organizationId: organizationId || null, // ✅ ADDED
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('💾 Saving employee to Firebase...');
      console.log('✅ organizationId being saved:', employee.organizationId); // ✅ ADDED LOG
      await employeeRef.set(employee);
      console.log('✅ Employee saved successfully with ID:', employee.id);
      return employee;
    } catch (error) {
      console.error('❌ Error in EmployeeService.create():', error);
      throw new Error(`Failed to create employee: ${error.message}`);
    }
  }

  // Find employee by email
  static async findByEmail(email) {
    console.log('🔍 EmployeeService.findByEmail() - Searching for:', email);
    try {
      const snapshot = await db
        .collection('employees')
        .where('email', '==', email.toLowerCase())
        .limit(1)
        .get();

      console.log('📊 Query result - documents found:', snapshot.size);

      if (snapshot.empty) {
        console.log('⚠️ No employee found with email:', email);
        return null;
      }

      const doc = snapshot.docs[0];
      const employee = { id: doc.id, ...doc.data() };
      console.log('✅ Employee found:', employee.id);
      return employee;
    } catch (error) {
      console.error('❌ Error in EmployeeService.findByEmail():', error);
      throw new Error(`Failed to find employee: ${error.message}`);
    }
  }

  // Find employee by ID
  static async findById(id) {
    console.log('🔍 EmployeeService.findById() - Searching for ID:', id);
    try {
      const doc = await db.collection('employees').doc(id).get();
      console.log('📄 Document exists:', doc.exists);

      if (!doc.exists) {
        console.log('⚠️ No employee found with ID:', id);
        return null;
      }

      const employee = { id: doc.id, ...doc.data() };
      console.log('✅ Employee found:', employee.id);
      return employee;
    } catch (error) {
      console.error('❌ Error in EmployeeService.findById():', error);
      throw new Error(`Failed to find employee: ${error.message}`);
    }
  }

  // Get all employees
  static async getAll() {
    console.log('🔍 EmployeeService.getAll() - Fetching all employees');
    try {
      const snapshot = await db.collection('employees').get();
      const employees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`📊 Found ${employees.length} employees`);

      // Filter only active employees
      const activeEmployees = employees.filter(emp => emp.isActive !== false);
      console.log(`✅ Returning ${activeEmployees.length} active employees`);

      return activeEmployees;
    } catch (error) {
      console.error('❌ Error in EmployeeService.getAll():', error);
      throw new Error(`Failed to get employees: ${error.message}`);
    }
  }

  // Update employee
  static async update(id, updateData) {
    console.log('🔧 EmployeeService.update() - Updating employee:', id);
    console.log('Update data:', updateData);
    try {
      const employeeRef = db.collection('employees').doc(id);
      const updatedData = {
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      console.log('💾 Updating employee in Firebase...');
      await employeeRef.update(updatedData);

      const updated = await employeeRef.get();
      const employee = { id: updated.id, ...updated.data() };
      console.log('✅ Employee updated successfully');
      return employee;
    } catch (error) {
      console.error('❌ Error in EmployeeService.update():', error);
      throw new Error(`Failed to update employee: ${error.message}`);
    }
  }

  // Delete employee (mark as inactive)
  static async delete(id) {
    console.log('🗑️ EmployeeService.delete() - Marking employee as inactive:', id);
    try {
      await this.update(id, { isActive: false });
      console.log('✅ Employee marked as inactive');
      return true;
    } catch (error) {
      console.error('❌ Error in EmployeeService.delete():', error);
      throw new Error(`Failed to delete employee: ${error.message}`);
    }
  }

  // Find employee by Firebase UID or email (for authentication middleware)
  static async findByUidOrEmail(uid, email) {
    console.log('🔍 EmployeeService.findByUidOrEmail() - Searching by UID:', uid, 'or email:', email);
    try {
      // First try to find by Firebase UID
      if (uid) {
        const snapshot = await db
          .collection('employees')
          .where('firebaseUid', '==', uid)
          .limit(1)
          .get();

        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const employee = { id: doc.id, ...doc.data() };
          console.log('✅ Employee found by UID:', employee.id);
          return employee;
        }
      }

      // If not found by UID, try by email
      if (email) {
        const employee = await this.findByEmail(email);
        if (employee) {
          console.log('✅ Employee found by email:', employee.id);
          // Update employee with Firebase UID for future lookups
          if (uid && !employee.firebaseUid) {
            await this.update(employee.id, { firebaseUid: uid });
            console.log('✅ Updated employee with Firebase UID');
            employee.firebaseUid = uid;
          }
          return employee;
        }
      }

      console.log('⚠️ No employee found with UID or email');
      return null;
    } catch (error) {
      console.error('❌ Error in EmployeeService.findByUidOrEmail():', error);
      throw new Error(`Failed to find employee: ${error.message}`);
    }
  }
}

module.exports = EmployeeService;
