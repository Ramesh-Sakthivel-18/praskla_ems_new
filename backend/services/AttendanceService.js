/**
 * AttendanceService.js (REFACTORED)
 * 
 * Business logic layer for attendance management.
 * Uses AttendanceRepository for data access.
 * Uses TimeCalculator for time calculations.
 * 
 * SOLID Principles:
 * - Single Responsibility: Only attendance business logic
 * - Dependency Inversion: Depends on abstractions (repository)
 * - Open/Closed: Can extend without modifying existing code
 */

const TimeCalculator = require('../utils/timeCalculator');

class AttendanceService {
  /**
   * Constructor with dependency injection
   * @param {AttendanceRepository} attendanceRepository
   * @param {UserRepository} userRepository (optional, for validation)
   * @param {NotificationService} notificationService (optional)
   */
  constructor(attendanceRepository, userRepository = null, notificationService = null) {
    this.attendanceRepo = attendanceRepository;
    this.userRepo = userRepository;
    this.notificationService = notificationService;
  }

  /**
   * Record attendance action (checkIn, checkOut, breakIn, breakOut)
   * @param {string} orgId - Organization ID
   * @param {string} userId - User ID
   * @param {string} userName - User name
   * @param {string} action - Action type
   * @param {Object} options - Options { verifyMethod, deviceId }
   * @returns {Promise<Object>} Updated attendance record
   */
  async recordAttendance(orgId, userId, userName, action, options = {}) {
    console.log(`🕰️ AttendanceService.recordAttendance() - User: ${userName}, Action: ${action}`);

    try {
      const date = TimeCalculator.getCurrentDate();
      const time = TimeCalculator.getCurrentTime();

      console.log(`⏰ Recording ${action} at ${time} on ${date}`);

      // Create or update attendance record
      const attendance = await this.attendanceRepo.createOrUpdate(orgId, {
        userId,
        userName,
        date,
        action,
        time,
        verifyMethod: options.verifyMethod || 'manual',
        deviceId: options.deviceId || null,
        location: options.location || null // Pass location to repository
      });

      // Calculate hours if checkOut action
      if (action === 'checkOut') {
        await this.calculateAndUpdateHours(orgId, attendance);
      }

      console.log(`✅ AttendanceService: Successfully recorded ${action} for ${userName}`);

      // Notification
      if (this.notificationService) {
        this.notificationService.sendToOrg(orgId, 'attendance:update', {
          userId,
          userName,
          action,
          time: attendance.time,
          date: attendance.date
        });
      }

      return attendance;
    } catch (error) {
      console.error(`❌ AttendanceService: Error recording attendance:`, error);
      throw new Error(`Failed to record attendance: ${error.message}`);
    }
  }

  /**
   * Calculate and update hours worked
   * @param {string} orgId - Organization ID
   * @param {Object} attendance - Attendance record
   * @returns {Promise<Object>} Updated attendance with hours
   */
  async calculateAndUpdateHours(orgId, attendance) {
    try {
      let calculated;

      // Strategy 1: Calculate from events (preferred)
      if (attendance.events && attendance.events.length > 0) {
        calculated = TimeCalculator.calculateFromEvents(attendance.events);
        console.log(`⏱️ Calculated hours from events: ${calculated.totalHours}`);
      }
      // Strategy 2: Calculate from time strings (fallback)
      else if (attendance.checkIn && attendance.checkOut) {
        calculated = TimeCalculator.calculateFromTimeStrings(
          attendance.checkIn,
          attendance.checkOut,
          attendance.breakIn,
          attendance.breakOut
        );
        console.log(`⏱️ Calculated hours from time strings: ${calculated.totalHours}`);
      } else {
        // Can't calculate yet (missing checkout)
        return attendance;
      }

      // Calculate overtime
      const overtime = TimeCalculator.calculateOvertime(calculated.hoursWorked);

      // Update attendance with calculated hours
      const updated = await this.attendanceRepo.updateHours(orgId, attendance.id, {
        hoursWorked: calculated.hoursWorked,
        breakDuration: calculated.breakDuration,
        isOvertime: overtime.isOvertime,
        overtimeHours: overtime.overtimeHours,
        totalHours: calculated.totalHours
      });

      return updated;
    } catch (error) {
      console.error(`❌ AttendanceService: Error calculating hours:`, error);
      return attendance; // Return original if calculation fails
    }
  }

  /**
   * Get employee's attendance records
   * @param {string} orgId - Organization ID
   * @param {string} userId - User ID
   * @param {Object} options - Options { limit, startDate, endDate }
   * @returns {Promise<Array>} Attendance records
   */
  async getEmployeeRecords(orgId, userId, options = {}) {
    console.log(`🔍 AttendanceService.getEmployeeRecords() - User: ${userId}`);

    try {
      const records = await this.attendanceRepo.getUserRecords(orgId, userId, {
        limit: options.limit || 10,
        startDate: options.startDate,
        endDate: options.endDate
      });

      // Fix any records with missing/invalid hours
      const fixedRecords = await Promise.all(
        records.map(record => this.fixRecordIfNeeded(orgId, record))
      );

      console.log(`✅ AttendanceService: Found ${fixedRecords.length} records`);
      return fixedRecords;
    } catch (error) {
      console.error(`❌ AttendanceService: Error getting employee records:`, error);
      throw new Error(`Failed to get employee records: ${error.message}`);
    }
  }

  /**
   * Fix attendance record if hours are missing or invalid
   * @param {string} orgId - Organization ID
   * @param {Object} record - Attendance record
   * @returns {Promise<Object>} Fixed record
   */
  async fixRecordIfNeeded(orgId, record) {
    const needsFix = !record.hoursWorked ||
      (record.totalHours && record.totalHours.includes('NaN'));

    if (!needsFix) {
      return record;
    }

    console.log(`🔧 Fixing record: ${record.id}`);
    return await this.calculateAndUpdateHours(orgId, record);
  }

  /**
   * Get today's attendance status for employee
   * @param {string} orgId - Organization ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Today's status
   */
  async getTodayStatus(orgId, userId) {
    console.log(`📅 AttendanceService.getTodayStatus() - User: ${userId}`);

    try {
      const today = TimeCalculator.getCurrentDate();
      const record = await this.attendanceRepo.getTodayRecord(orgId, userId, today);

      if (!record) {
        console.log(`📋 No attendance record for today`);
        return {
          status: 'not_started',
          date: today
        };
      }

      // Fix hours if needed
      const fixedRecord = await this.fixRecordIfNeeded(orgId, record);

      console.log(`✅ Today's status:`, {
        checkIn: fixedRecord.checkIn,
        checkOut: fixedRecord.checkOut,
        hours: fixedRecord.totalHours
      });

      return fixedRecord;
    } catch (error) {
      console.error(`❌ AttendanceService: Error getting today status:`, error);
      throw new Error(`Failed to get today's status: ${error.message}`);
    }
  }

  /**
   * Get all attendance records for organization (Admin/Business Owner)
   * @param {string} orgId - Organization ID
   * @param {Object} filters - Filters { date, userId }
   * @returns {Promise<Array>} Attendance records
   */
  async getAllRecords(orgId, filters = {}) {
    console.log('🔍 AttendanceService.getAllRecords() - Filters:', filters);

    try {
      let records;

      if (filters.date) {
        // Get records for specific date
        records = await this.attendanceRepo.getByDate(orgId, filters.date);
      } else if (filters.startDate && filters.endDate) {
        // Get records for date range
        records = await this.attendanceRepo.getByDateRange(orgId, filters.startDate, filters.endDate);
      } else {
        // Get recent records (limit to 100 for performance)
        records = await this.attendanceRepo.findAll(orgId, { limit: 100 });
      }

      console.log(`✅ AttendanceService: Found ${records.length} records`);
      return records;
    } catch (error) {
      console.error('❌ AttendanceService: Error getting all records:', error);
      throw new Error(`Failed to get all records: ${error.message}`);
    }
  }

  /**
   * Get weekly hours for employee
   * @param {string} orgId - Organization ID
   * @param {string} userId - User ID
   * @param {string} weekStart - Week start date (YYYY-MM-DD)
   * @param {string} weekEnd - Week end date (YYYY-MM-DD)
   * @returns {Promise<Object>} Weekly stats
   */
  async getWeeklyHours(orgId, userId, weekStart, weekEnd) {
    console.log(`📊 AttendanceService.getWeeklyHours() - User: ${userId}, Week: ${weekStart} to ${weekEnd}`);

    try {
      const records = await this.attendanceRepo.getWeeklyRecords(orgId, userId, weekStart, weekEnd);

      // Sort by date ascending
      records.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Calculate totals
      const stats = records.reduce((acc, record) => {
        const hours = record.hoursWorked || 0;
        const minutes = hours * 60;

        acc.totalMinutes += minutes;
        if (minutes > acc.longestMinutes) {
          acc.longestMinutes = minutes;
        }
        if (minutes > 0) {
          acc.daysWithHours += 1;
        }

        return acc;
      }, { totalMinutes: 0, longestMinutes: 0, daysWithHours: 0 });

      const result = {
        weekStart,
        weekEnd,
        records: records.map(r => ({
          date: r.date,
          checkIn: r.checkIn || null,
          checkOut: r.checkOut || null,
          hoursWorked: r.hoursWorked || 0,
          totalHours: r.totalHours || '0h 0m'
        })),
        stats: {
          totalHours: Math.floor(stats.totalMinutes / 60),
          totalMinutes: stats.totalMinutes,
          averagePerDay: stats.daysWithHours > 0
            ? Math.floor(stats.totalMinutes / stats.daysWithHours / 60)
            : 0,
          longestDay: Math.floor(stats.longestMinutes / 60),
          daysWorked: stats.daysWithHours
        }
      };

      console.log(`✅ Weekly stats:`, result.stats);
      return result;
    } catch (error) {
      console.error(`❌ AttendanceService: Error getting weekly hours:`, error);
      throw new Error(`Failed to get weekly hours: ${error.message}`);
    }
  }

  /**
   * Get attendance summary for a date (Admin dashboard)
   * @param {string} orgId - Organization ID
   * @param {string} date - Date (YYYY-MM-DD)
   * @returns {Promise<Object>} Summary
   */
  async getSummary(orgId, date) {
    console.log(`📊 AttendanceService.getSummary() - Date: ${date}`);

    try {
      const summary = await this.attendanceRepo.getDailySummary(orgId, date);
      console.log(`✅ Summary:`, summary);
      return summary;
    } catch (error) {
      console.error(`❌ AttendanceService: Error getting summary:`, error);
      throw new Error(`Failed to get summary: ${error.message}`);
    }
  }

  /**
   * Check if employee has checked in today
   * @param {string} orgId - Organization ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>}
   */
  async hasCheckedInToday(orgId, userId) {
    try {
      const today = TimeCalculator.getCurrentDate();
      return await this.attendanceRepo.hasCheckedIn(orgId, userId, today);
    } catch (error) {
      console.error(`❌ AttendanceService: Error checking check-in status:`, error);
      return false;
    }
  }
}

module.exports = AttendanceService;
