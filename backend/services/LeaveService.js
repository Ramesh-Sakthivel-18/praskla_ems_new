const { getFirestore } = require('firebase-admin/firestore');
const initFirebaseAdmin = require('../firebase-admin');
const db = getFirestore(initFirebaseAdmin());

class LeaveService {
  // Create a new leave request
  static async create(leaveData) {
    try {
      const { employeeId, employeeName, leaveType, startDate, endDate, reason } = leaveData;

      const leaveRef = db.collection('leaves').doc();
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffMs = end - start;
      const days =
        isNaN(diffMs) ? 0 : Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
      const leaveRequest = {
        id: leaveRef.id,
        employeeId,
        employeeName,
        leaveType,
        startDate,
        endDate,
        reason,
        days,
        status: 'Pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await leaveRef.set(leaveRequest);
      return leaveRequest;
    } catch (error) {
      console.error('Error creating leave request:', error);
      throw new Error(`Failed to create leave request: ${error.message}`);
    }
  }

  // Get leave requests by employee ID
  static async getByEmployee(employeeId) {
    try {
      const snapshot = await db
        .collection('leaves')
        .where('employeeId', '==', employeeId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching employee leave requests:', error);
      throw new Error(`Failed to fetch leave requests: ${error.message}`);
    }
  }

  // Get all leave requests
  static async getAll() {
    try {
      const snapshot = await db
        .collection('leaves')
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching all leave requests:', error);
      throw new Error(`Failed to fetch all leave requests: ${error.message}`);
    }
  }

  // Update leave request status
  static async updateStatus(id, status) {
    try {
      const leaveRef = db.collection('leaves').doc(id);
      await leaveRef.update({
        status,
        updatedAt: new Date().toISOString()
      });

      const updatedDoc = await leaveRef.get();
      return { id: updatedDoc.id, ...updatedDoc.data() };
    } catch (error) {
      console.error('Error updating leave request status:', error);
      throw new Error(`Failed to update leave request: ${error.message}`);
    }
  }

  // Get leave request by ID
  static async getById(id) {
    try {
      const doc = await db.collection('leaves').doc(id).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error fetching leave request:', error);
      throw new Error(`Failed to fetch leave request: ${error.message}`);
    }
  }
}

module.exports = LeaveService;
