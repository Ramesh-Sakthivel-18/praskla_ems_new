/**
 * StatisticsService.js
 * 
 * Business logic layer for statistics calculation and caching.
 * Uses StatisticsRepository for pre-calculated stats.
 * Uses AttendanceRepository for raw data.
 * Uses Redis for caching (optional - falls back to database).
 * 
 * SOLID Principles:
 * - Single Responsibility: Only statistics calculation
 * - Dependency Inversion: Depends on abstractions (repositories)
 */

const redisClient = require('../config/redis');

class StatisticsService {
  /**
   * Constructor with dependency injection
   * @param {StatisticsRepository} statisticsRepository
   * @param {AttendanceRepository} attendanceRepository
   * @param {UserRepository} userRepository
   */
  constructor(statisticsRepository, attendanceRepository, userRepository) {
    this.statsRepo = statisticsRepository;
    this.attendanceRepo = attendanceRepository;
    this.userRepo = userRepository;
    this.cacheEnabled = true;
  }

  /**
   * Get daily statistics for organization
   * @param {string} orgId - Organization ID
   * @param {string} date - Date (YYYY-MM-DD)
   * @returns {Promise<Object>} Daily statistics
   */
  async getDailyStats(orgId, date) {
    console.log(`📊 StatisticsService.getDailyStats() - Org: ${orgId}, Date: ${date}`);

    try {
      const cacheKey = `stats:daily:${orgId}:${date}`;

      // 1. Check Redis cache
      if (this.cacheEnabled) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          console.log(`✅ Daily stats retrieved from cache`);
          return JSON.parse(cached);
        }
      }

      // 2. Check database cache (StatisticsRepository)
      let stats = await this.statsRepo.getDailyStats(orgId, date);

      // 3. If not in database, calculate from raw data
      if (!stats) {
        console.log(`🔧 Calculating daily stats from raw data...`);
        stats = await this.calculateDailyStats(orgId, date);

        // Save to database
        await this.statsRepo.saveDailyStats(orgId, date, stats);
      }

      // 4. Cache in Redis (24 hours for past dates, 1 hour for today)
      if (this.cacheEnabled) {
        const isToday = date === new Date().toISOString().split('T')[0];
        const ttl = isToday ? 3600 : 86400; // 1 hour for today, 24 hours for past
        await redisClient.set(cacheKey, JSON.stringify(stats), ttl);
      }

      console.log(`✅ Daily stats generated:`, stats);
      return stats;
    } catch (error) {
      console.error(`❌ StatisticsService: Error getting daily stats:`, error);
      throw new Error(`Failed to get daily stats: ${error.message}`);
    }
  }

  /**
   * Calculate daily statistics from raw attendance data
   * @private
   * @param {string} orgId - Organization ID
   * @param {string} date - Date (YYYY-MM-DD)
   * @returns {Promise<Object>} Calculated statistics
   */
  async calculateDailyStats(orgId, date) {
    try {
      // Get all attendance records for the date
      const attendanceRecords = await this.attendanceRepo.getByDate(orgId, date);

      // Get total employee count
      const totalEmployees = await this.userRepo.countByRole(orgId, 'employee');

      // Calculate metrics
      const presentCount = attendanceRecords.filter(r => r.checkIn).length;
      const absentCount = totalEmployees - presentCount;
      const checkedOutCount = attendanceRecords.filter(r => r.checkOut).length;
      const lateArrivals = attendanceRecords.filter(r =>
        r.checkIn && this.isLateArrival(r.checkIn)
      ).length;

      // Calculate total hours worked
      const totalHoursWorked = attendanceRecords.reduce((sum, record) => {
        return sum + (record.hoursWorked || 0);
      }, 0);

      const avgHoursPerEmployee = presentCount > 0
        ? (totalHoursWorked / presentCount).toFixed(2)
        : 0;

      return {
        totalEmployees,
        presentCount,
        absentCount,
        onLeaveCount: 0, // TODO: Integrate with leave service
        lateArrivals,
        totalHoursWorked: parseFloat(totalHoursWorked.toFixed(2)),
        avgHoursPerEmployee: parseFloat(avgHoursPerEmployee),
        checkedOutCount,
        attendanceRate: totalEmployees > 0
          ? ((presentCount / totalEmployees) * 100).toFixed(2)
          : '0.00'
      };
    } catch (error) {
      console.error(`❌ Error calculating daily stats:`, error);
      throw error;
    }
  }

  /**
   * Get weekly statistics
   * @param {string} orgId - Organization ID
   * @param {number} year - Year
   * @param {number} weekNumber - Week number (1-52)
   * @returns {Promise<Object>} Weekly statistics
   */
  async getWeeklyStats(orgId, year, weekNumber) {
    console.log(`📊 StatisticsService.getWeeklyStats() - Week: ${year}-W${weekNumber}`);

    try {
      const cacheKey = `stats:weekly:${orgId}:${year}:W${weekNumber}`;

      // 1. Check Redis cache
      if (this.cacheEnabled) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          console.log(`✅ Weekly stats retrieved from cache`);
          return JSON.parse(cached);
        }
      }

      // 2. Check database cache
      let stats = await this.statsRepo.getWeeklyStats(orgId, year, weekNumber);

      // 3. If not in database, calculate
      if (!stats) {
        console.log(`🔧 Calculating weekly stats...`);
        stats = await this.calculateWeeklyStats(orgId, year, weekNumber);

        // Save to database
        await this.statsRepo.saveWeeklyStats(orgId, year, weekNumber, stats);
      }

      // 4. Cache in Redis (24 hours)
      if (this.cacheEnabled) {
        await redisClient.set(cacheKey, JSON.stringify(stats), 86400);
      }

      console.log(`✅ Weekly stats generated`);
      return stats;
    } catch (error) {
      console.error(`❌ StatisticsService: Error getting weekly stats:`, error);
      throw new Error(`Failed to get weekly stats: ${error.message}`);
    }
  }

  /**
   * Calculate weekly statistics
   * @private
   */
  async calculateWeeklyStats(orgId, year, weekNumber) {
    try {
      // Calculate week start and end dates
      const { startDate, endDate } = this.getWeekDates(year, weekNumber);

      // Get attendance for the week
      const records = await this.attendanceRepo.getByDateRange(orgId, startDate, endDate);
      const totalEmployees = await this.userRepo.countByRole(orgId, 'employee');

      // Calculate daily stats for each day
      const dailyStats = [];
      let currentDate = new Date(startDate);
      const endDateObj = new Date(endDate);

      while (currentDate <= endDateObj) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayRecords = records.filter(r => r.date === dateStr);

        dailyStats.push({
          date: dateStr,
          presentCount: dayRecords.filter(r => r.checkIn).length,
          totalHours: dayRecords.reduce((sum, r) => sum + (r.hoursWorked || 0), 0)
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Calculate aggregates
      const totalHoursWorked = dailyStats.reduce((sum, day) => sum + day.totalHours, 0);
      const avgAttendanceRate = dailyStats.length > 0
        ? (dailyStats.reduce((sum, day) => sum + (day.presentCount / totalEmployees * 100), 0) / dailyStats.length).toFixed(2)
        : '0.00';

      return {
        startDate,
        endDate,
        totalEmployees,
        avgAttendanceRate: parseFloat(avgAttendanceRate),
        totalHoursWorked: parseFloat(totalHoursWorked.toFixed(2)),
        avgHoursPerEmployee: totalEmployees > 0
          ? (totalHoursWorked / totalEmployees / 7).toFixed(2)
          : '0.00',
        overtimeHours: 0, // TODO: Calculate based on standard hours
        totalLeaves: 0, // TODO: Integrate with leave service
        dailyStats
      };
    } catch (error) {
      console.error(`❌ Error calculating weekly stats:`, error);
      throw error;
    }
  }

  /**
   * Get monthly statistics
   * @param {string} orgId - Organization ID
   * @param {number} year - Year
   * @param {number} month - Month (1-12)
   * @returns {Promise<Object>} Monthly statistics
   */
  async getMonthlyStats(orgId, year, month) {
    console.log(`📊 StatisticsService.getMonthlyStats() - ${year}-${month}`);

    try {
      const cacheKey = `stats:monthly:${orgId}:${year}:${month}`;

      // 1. Check Redis cache
      if (this.cacheEnabled) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          console.log(`✅ Monthly stats retrieved from cache`);
          return JSON.parse(cached);
        }
      }

      // 2. Check database cache
      let stats = await this.statsRepo.getMonthlyStats(orgId, year, month);

      // 3. If not in database, calculate
      if (!stats) {
        console.log(`🔧 Calculating monthly stats...`);
        stats = await this.calculateMonthlyStats(orgId, year, month);

        // Save to database
        await this.statsRepo.saveMonthlyStats(orgId, year, month, stats);
      }

      // 4. Cache in Redis (24 hours)
      if (this.cacheEnabled) {
        await redisClient.set(cacheKey, JSON.stringify(stats), 86400);
      }

      console.log(`✅ Monthly stats generated`);
      return stats;
    } catch (error) {
      console.error(`❌ StatisticsService: Error getting monthly stats:`, error);
      throw new Error(`Failed to get monthly stats: ${error.message}`);
    }
  }

  /**
   * Calculate monthly statistics
   * @private
   */
  async calculateMonthlyStats(orgId, year, month) {
    try {
      // Calculate month start and end dates
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

      // Get all attendance for the month
      const records = await this.attendanceRepo.getByDateRange(orgId, startDate, endDate);
      const totalEmployees = await this.userRepo.countByRole(orgId, 'employee');

      // Calculate working days (exclude weekends)
      const totalWorkingDays = this.getWorkingDays(year, month);

      // Calculate total hours
      const totalHoursWorked = records.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);

      // Calculate average attendance rate
      const uniqueDates = [...new Set(records.map(r => r.date))];
      const totalPresentDays = records.filter(r => r.checkIn).length;
      const avgAttendanceRate = totalEmployees > 0 && uniqueDates.length > 0
        ? ((totalPresentDays / (totalEmployees * uniqueDates.length)) * 100).toFixed(2)
        : '0.00';

      return {
        totalEmployees,
        totalWorkingDays,
        avgAttendanceRate: parseFloat(avgAttendanceRate),
        totalHoursWorked: parseFloat(totalHoursWorked.toFixed(2)),
        totalLeavesTaken: 0, // TODO: Integrate with leave service
        totalOvertimeHours: 0, // TODO: Calculate
        topAttendance: [], // TODO: Calculate top performers
        byDepartment: {} // TODO: Group by department
      };
    } catch (error) {
      console.error(`❌ Error calculating monthly stats:`, error);
      throw error;
    }
  }

  /**
   * Get date range statistics (custom period)
   * @param {string} orgId - Organization ID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Object>} Statistics for date range
   */
  async getDateRangeStats(orgId, startDate, endDate) {
    console.log(`📊 StatisticsService.getDateRangeStats() - ${startDate} to ${endDate}`);

    try {
      const records = await this.attendanceRepo.getByDateRange(orgId, startDate, endDate);
      const totalEmployees = await this.userRepo.countByRole(orgId, 'employee');

      // Calculate metrics
      const uniqueDates = [...new Set(records.map(r => r.date))];
      const totalDays = uniqueDates.length;
      const totalPresent = records.filter(r => r.checkIn).length;
      const totalHours = records.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);

      const stats = {
        startDate,
        endDate,
        totalDays,
        totalEmployees,
        totalPresentRecords: totalPresent,
        avgAttendanceRate: totalEmployees > 0 && totalDays > 0
          ? ((totalPresent / (totalEmployees * totalDays)) * 100).toFixed(2)
          : '0.00',
        totalHoursWorked: parseFloat(totalHours.toFixed(2)),
        avgHoursPerDay: totalDays > 0 ? (totalHours / totalDays).toFixed(2) : '0.00',
        dailyBreakdown: uniqueDates.map(date => {
          const dayRecords = records.filter(r => r.date === date);
          return {
            date,
            presentCount: dayRecords.filter(r => r.checkIn).length,
            totalHours: dayRecords.reduce((sum, r) => sum + (r.hoursWorked || 0), 0).toFixed(2)
          };
        })
      };

      console.log(`✅ Date range stats generated`);
      return stats;
    } catch (error) {
      console.error(`❌ StatisticsService: Error getting date range stats:`, error);
      throw new Error(`Failed to get date range stats: ${error.message}`);
    }
  }

  /**
   * Invalidate cache for organization (when data changes)
   * @param {string} orgId - Organization ID
   * @param {string} date - Specific date (optional)
   * @returns {Promise<void>}
   */
  async invalidateCache(orgId, date = null) {
    console.log(`🗑️ StatisticsService.invalidateCache() - Org: ${orgId}`);

    try {
      if (date) {
        // Invalidate specific date
        await redisClient.del(`stats:daily:${orgId}:${date}`);
        console.log(`✅ Cache invalidated for date: ${date}`);
      } else {
        // Invalidate all stats for organization
        const deleted = await redisClient.delPattern(`stats:*:${orgId}:*`);
        console.log(`✅ Invalidated ${deleted} cache entries`);
      }
    } catch (error) {
      console.error(`❌ Error invalidating cache:`, error);
    }
  }

  /**
   * Helper: Check if check-in time is late
   * @private
   */
  isLateArrival(checkInTime, expectedTime = '09:00:00') {
    try {
      const checkIn = checkInTime.split(':').map(Number);
      const expected = expectedTime.split(':').map(Number);

      const checkInMinutes = checkIn[0] * 60 + checkIn[1];
      const expectedMinutes = expected[0] * 60 + expected[1];

      return checkInMinutes > expectedMinutes;
    } catch (error) {
      return false;
    }
  }

  /**
   * Helper: Get week start and end dates
   * @private
   */
  getWeekDates(year, weekNumber) {
    const simple = new Date(year, 0, 1 + (weekNumber - 1) * 7);
    const dayOfWeek = simple.getDay();
    const monday = new Date(simple);
    monday.setDate(simple.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      startDate: monday.toISOString().split('T')[0],
      endDate: sunday.toISOString().split('T')[0]
    };
  }

  /**
   * Helper: Get number of working days in month (exclude weekends)
   * @private
   */
  getWorkingDays(year, month) {
    const lastDay = new Date(year, month, 0).getDate();
    let workingDays = 0;

    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
    }

    return workingDays;
  }

  /**
   * Get organization info for System Admin (NO ATTENDANCE DATA)
   * @param {string} orgId - Organization ID
   * @returns {Promise} Organization info only
   */
  async getOrganizationInfoForSystemAdmin(orgId) {
    console.log(`📊 StatisticsService.getOrganizationInfoForSystemAdmin() - Org: ${orgId}`);
    try {
      const org = await this.orgRepo.findById(orgId);

      if (!org) {
        throw new Error('Organization not found');
      }

      return {
        organizationId: orgId,
        name: org.name,
        isActive: org.isActive,

        // User counts (NO ATTENDANCE)
        counts: {
          businessOwners: org.counts?.businessOwners || 0,
          admins: org.counts?.admins || 0,
          employees: org.counts?.employees || 0,
          totalUsers: (org.counts?.businessOwners || 0) +
            (org.counts?.admins || 0) +
            (org.counts?.employees || 0)
        },

        // Limits
        limits: {
          maxBusinessOwners: org.limits?.maxBusinessOwners || 0,
          maxAdmins: org.limits?.maxAdmins || 0,
          maxEmployees: org.limits?.maxEmployees || 0
        },

        // Utilization percentages (NO ATTENDANCE)
        utilization: {
          businessOwnersPercent: org.limits?.maxBusinessOwners
            ? Math.round((org.counts?.businessOwners || 0) / org.limits.maxBusinessOwners * 100)
            : 0,
          adminsPercent: org.limits?.maxAdmins
            ? Math.round((org.counts?.admins || 0) / org.limits.maxAdmins * 100)
            : 0,
          employeesPercent: org.limits?.maxEmployees
            ? Math.round((org.counts?.employees || 0) / org.limits.maxEmployees * 100)
            : 0
        },

        timestamps: {
          createdAt: org.createdAt,
          updatedAt: org.updatedAt
        }
      };

    } catch (error) {
      console.error('❌ StatisticsService: Error getting org info for system admin:', error);
      throw new Error(`Failed to get organization info: ${error.message}`);
    }
  }
}

module.exports = StatisticsService;
