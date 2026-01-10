/**
 * StatisticsRepository.js
 * 
 * Repository for managing pre-calculated statistics within organizations.
 * Hierarchical structure: organizations/{orgId}/statistics/{statId}
 * 
 * Handles: Daily, Weekly, Monthly stats (cached for performance)
 */

const BaseRepository = require('./BaseRepository');

class StatisticsRepository extends BaseRepository {
  constructor(db) {
    super(db, 'statistics');
  }

  /**
   * Override: Get collection reference for specific organization
   * @param {string} orgId - Organization ID
   * @returns {FirebaseFirestore.CollectionReference}
   */
  getCollection(orgId) {
    if (!orgId) {
      throw new Error('Organization ID is required');
    }
    return this.db.collection('organizations').doc(orgId).collection('statistics');
  }

  /**
   * Save daily statistics
   * @param {string} orgId - Organization ID
   * @param {string} date - Date (YYYY-MM-DD)
   * @param {Object} stats - Statistics data
   * @returns {Promise<Object>}
   */
  async saveDailyStats(orgId, date, stats) {
    try {
      const statId = `daily_${date}`;
      const timestamp = new Date().toISOString();

      const statData = {
        id: statId,
        organizationId: orgId,
        type: 'daily',
        date,
        
        // Organization-wide metrics
        totalEmployees: stats.totalEmployees || 0,
        presentCount: stats.presentCount || 0,
        absentCount: stats.absentCount || 0,
        onLeaveCount: stats.onLeaveCount || 0,
        lateArrivals: stats.lateArrivals || 0,
        totalHoursWorked: stats.totalHoursWorked || 0,
        avgHoursPerEmployee: stats.avgHoursPerEmployee || 0,
        
        // Department breakdown (optional)
        byDepartment: stats.byDepartment || {},
        
        // Metadata
        calculatedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      const docRef = this.getCollection(orgId).doc(statId);
      await docRef.set(statData);

      console.log(`✅ [StatisticsRepository] Saved daily stats for ${date}`);
      return statData;
    } catch (error) {
      console.error(`❌ [StatisticsRepository] SaveDailyStats error:`, error);
      throw new Error(`Failed to save daily stats: ${error.message}`);
    }
  }

  /**
   * Get daily statistics
   * @param {string} orgId - Organization ID
   * @param {string} date - Date (YYYY-MM-DD)
   * @returns {Promise<Object|null>}
   */
  async getDailyStats(orgId, date) {
    try {
      const statId = `daily_${date}`;
      const doc = await this.getCollection(orgId).doc(statId).get();

      if (!doc.exists) {
        console.log(`⚠️ [StatisticsRepository] Daily stats not found for ${date}`);
        return null;
      }

      const data = { id: doc.id, ...doc.data() };
      console.log(`✅ [StatisticsRepository] Retrieved daily stats for ${date}`);
      return data;
    } catch (error) {
      console.error(`❌ [StatisticsRepository] GetDailyStats error:`, error);
      throw new Error(`Failed to get daily stats: ${error.message}`);
    }
  }

  /**
   * Save weekly statistics
   * @param {string} orgId - Organization ID
   * @param {number} year - Year
   * @param {number} weekNumber - Week number (1-52)
   * @param {Object} stats - Statistics data
   * @returns {Promise<Object>}
   */
  async saveWeeklyStats(orgId, year, weekNumber, stats) {
    try {
      const statId = `weekly_${year}_W${String(weekNumber).padStart(2, '0')}`;
      const timestamp = new Date().toISOString();

      const statData = {
        id: statId,
        organizationId: orgId,
        type: 'weekly',
        year,
        weekNumber,
        startDate: stats.startDate,
        endDate: stats.endDate,
        
        // Weekly metrics
        totalEmployees: stats.totalEmployees || 0,
        avgAttendanceRate: stats.avgAttendanceRate || 0,
        totalHoursWorked: stats.totalHoursWorked || 0,
        avgHoursPerEmployee: stats.avgHoursPerEmployee || 0,
        overtimeHours: stats.overtimeHours || 0,
        totalLeaves: stats.totalLeaves || 0,
        
        // Daily breakdown
        dailyStats: stats.dailyStats || [],
        
        // Metadata
        calculatedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      const docRef = this.getCollection(orgId).doc(statId);
      await docRef.set(statData);

      console.log(`✅ [StatisticsRepository] Saved weekly stats for ${year}-W${weekNumber}`);
      return statData;
    } catch (error) {
      console.error(`❌ [StatisticsRepository] SaveWeeklyStats error:`, error);
      throw new Error(`Failed to save weekly stats: ${error.message}`);
    }
  }

  /**
   * Get weekly statistics
   * @param {string} orgId - Organization ID
   * @param {number} year - Year
   * @param {number} weekNumber - Week number
   * @returns {Promise<Object|null>}
   */
  async getWeeklyStats(orgId, year, weekNumber) {
    try {
      const statId = `weekly_${year}_W${String(weekNumber).padStart(2, '0')}`;
      const doc = await this.getCollection(orgId).doc(statId).get();

      if (!doc.exists) {
        console.log(`⚠️ [StatisticsRepository] Weekly stats not found for ${year}-W${weekNumber}`);
        return null;
      }

      const data = { id: doc.id, ...doc.data() };
      console.log(`✅ [StatisticsRepository] Retrieved weekly stats for ${year}-W${weekNumber}`);
      return data;
    } catch (error) {
      console.error(`❌ [StatisticsRepository] GetWeeklyStats error:`, error);
      throw new Error(`Failed to get weekly stats: ${error.message}`);
    }
  }

  /**
   * Save monthly statistics
   * @param {string} orgId - Organization ID
   * @param {number} year - Year
   * @param {number} month - Month (1-12)
   * @param {Object} stats - Statistics data
   * @returns {Promise<Object>}
   */
  async saveMonthlyStats(orgId, year, month, stats) {
    try {
      const statId = `monthly_${year}_${String(month).padStart(2, '0')}`;
      const timestamp = new Date().toISOString();

      const statData = {
        id: statId,
        organizationId: orgId,
        type: 'monthly',
        year,
        month,
        
        // Monthly metrics
        totalEmployees: stats.totalEmployees || 0,
        totalWorkingDays: stats.totalWorkingDays || 0,
        avgAttendanceRate: stats.avgAttendanceRate || 0,
        totalHoursWorked: stats.totalHoursWorked || 0,
        totalLeavesTaken: stats.totalLeavesTaken || 0,
        totalOvertimeHours: stats.totalOvertimeHours || 0,
        
        // Top performers
        topAttendance: stats.topAttendance || [],
        
        // Department breakdown
        byDepartment: stats.byDepartment || {},
        
        // Weekly breakdown
        weeklyBreakdown: stats.weeklyBreakdown || [],
        
        // Metadata
        calculatedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      const docRef = this.getCollection(orgId).doc(statId);
      await docRef.set(statData);

      console.log(`✅ [StatisticsRepository] Saved monthly stats for ${year}-${month}`);
      return statData;
    } catch (error) {
      console.error(`❌ [StatisticsRepository] SaveMonthlyStats error:`, error);
      throw new Error(`Failed to save monthly stats: ${error.message}`);
    }
  }

  /**
   * Get monthly statistics
   * @param {string} orgId - Organization ID
   * @param {number} year - Year
   * @param {number} month - Month (1-12)
   * @returns {Promise<Object|null>}
   */
  async getMonthlyStats(orgId, year, month) {
    try {
      const statId = `monthly_${year}_${String(month).padStart(2, '0')}`;
      const doc = await this.getCollection(orgId).doc(statId).get();

      if (!doc.exists) {
        console.log(`⚠️ [StatisticsRepository] Monthly stats not found for ${year}-${month}`);
        return null;
      }

      const data = { id: doc.id, ...doc.data() };
      console.log(`✅ [StatisticsRepository] Retrieved monthly stats for ${year}-${month}`);
      return data;
    } catch (error) {
      console.error(`❌ [StatisticsRepository] GetMonthlyStats error:`, error);
      throw new Error(`Failed to get monthly stats: ${error.message}`);
    }
  }

  /**
   * Save user-specific monthly statistics
   * @param {string} orgId - Organization ID
   * @param {string} userId - User ID
   * @param {number} year - Year
   * @param {number} month - Month
   * @param {Object} stats - User statistics
   * @returns {Promise<Object>}
   */
  async saveUserMonthlyStats(orgId, userId, year, month, stats) {
    try {
      const statId = `user_${userId}_monthly_${year}_${String(month).padStart(2, '0')}`;
      const timestamp = new Date().toISOString();

      const statData = {
        id: statId,
        organizationId: orgId,
        userId,
        userName: stats.userName,
        type: 'user_monthly',
        year,
        month,
        
        // User metrics
        daysWorked: stats.daysWorked || 0,
        daysAbsent: stats.daysAbsent || 0,
        totalHours: stats.totalHours || 0,
        avgHoursPerDay: stats.avgHoursPerDay || 0,
        lateArrivals: stats.lateArrivals || 0,
        leavesTaken: stats.leavesTaken || 0,
        overtimeHours: stats.overtimeHours || 0,
        
        // Metadata
        calculatedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      const docRef = this.getCollection(orgId).doc(statId);
      await docRef.set(statData);

      console.log(`✅ [StatisticsRepository] Saved user monthly stats for ${userId} (${year}-${month})`);
      return statData;
    } catch (error) {
      console.error(`❌ [StatisticsRepository] SaveUserMonthlyStats error:`, error);
      throw new Error(`Failed to save user monthly stats: ${error.message}`);
    }
  }

  /**
   * Get user-specific monthly statistics
   * @param {string} orgId - Organization ID
   * @param {string} userId - User ID
   * @param {number} year - Year
   * @param {number} month - Month
   * @returns {Promise<Object|null>}
   */
  async getUserMonthlyStats(orgId, userId, year, month) {
    try {
      const statId = `user_${userId}_monthly_${year}_${String(month).padStart(2, '0')}`;
      const doc = await this.getCollection(orgId).doc(statId).get();

      if (!doc.exists) {
        console.log(`⚠️ [StatisticsRepository] User monthly stats not found`);
        return null;
      }

      const data = { id: doc.id, ...doc.data() };
      console.log(`✅ [StatisticsRepository] Retrieved user monthly stats`);
      return data;
    } catch (error) {
      console.error(`❌ [StatisticsRepository] GetUserMonthlyStats error:`, error);
      throw new Error(`Failed to get user monthly stats: ${error.message}`);
    }
  }

  /**
   * Delete statistics (for recalculation)
   * @param {string} orgId - Organization ID
   * @param {string} statId - Statistics ID
   * @returns {Promise<boolean>}
   */
  async delete(orgId, statId) {
    try {
      const docRef = this.getCollection(orgId).doc(statId);
      const doc = await docRef.get();

      if (!doc.exists) {
        console.log(`⚠️ [StatisticsRepository] Stat not found: ${statId}`);
        return false;
      }

      await docRef.delete();
      console.log(`✅ [StatisticsRepository] Deleted stat: ${statId}`);
      return true;
    } catch (error) {
      console.error(`❌ [StatisticsRepository] Delete error:`, error);
      throw new Error(`Failed to delete statistics: ${error.message}`);
    }
  }

  /**
   * Get all statistics of a specific type
   * @param {string} orgId - Organization ID
   * @param {string} type - Type (daily, weekly, monthly)
   * @param {Object} options - Options { limit, orderBy }
   * @returns {Promise<Array>}
   */
  async findByType(orgId, type, options = {}) {
    try {
      let query = this.getCollection(orgId).where('type', '==', type);

      // Apply ordering
      if (options.orderBy) {
        query = query.orderBy(options.orderBy.field || 'calculatedAt', options.orderBy.direction || 'desc');
      } else {
        query = query.orderBy('calculatedAt', 'desc');
      }

      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const snapshot = await query.get();

      const stats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`✅ [StatisticsRepository] Found ${stats.length} ${type} statistics`);
      return stats;
    } catch (error) {
      console.error(`❌ [StatisticsRepository] FindByType error:`, error);
      throw new Error(`Failed to find statistics by type: ${error.message}`);
    }
  }

  /**
   * Get date range statistics
   * @param {string} orgId - Organization ID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Array>}
   */
  async getDateRangeStats(orgId, startDate, endDate) {
    try {
      const snapshot = await this.getCollection(orgId)
        .where('type', '==', 'daily')
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .orderBy('date', 'asc')
        .get();

      const stats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`✅ [StatisticsRepository] Found ${stats.length} stats from ${startDate} to ${endDate}`);
      return stats;
    } catch (error) {
      console.error(`❌ [StatisticsRepository] GetDateRangeStats error:`, error);
      throw new Error(`Failed to get date range stats: ${error.message}`);
    }
  }

  /**
   * Check if statistics exist
   * @param {string} orgId - Organization ID
   * @param {string} statId - Statistics ID
   * @returns {Promise<boolean>}
   */
  async exists(orgId, statId) {
    try {
      const doc = await this.getCollection(orgId).doc(statId).get();
      return doc.exists;
    } catch (error) {
      console.error(`❌ [StatisticsRepository] Exists check error:`, error);
      return false;
    }
  }

  /**
   * Update statistics (recalculation)
   * @param {string} orgId - Organization ID
   * @param {string} statId - Statistics ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>}
   */
  async update(orgId, statId, data) {
    try {
      const docRef = this.getCollection(orgId).doc(statId);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error(`Statistics not found: ${statId}`);
      }

      const updateData = {
        ...data,
        calculatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await docRef.update(updateData);

      const updatedDoc = await docRef.get();
      const result = { id: updatedDoc.id, ...updatedDoc.data() };

      console.log(`✅ [StatisticsRepository] Updated statistics: ${statId}`);
      return result;
    } catch (error) {
      console.error(`❌ [StatisticsRepository] Update error:`, error);
      throw new Error(`Failed to update statistics: ${error.message}`);
    }
  }

  /**
   * Batch delete statistics (cleanup old data)
   * @param {string} orgId - Organization ID
   * @param {string} beforeDate - Delete stats before this date
   * @returns {Promise<number>} Number of deleted documents
   */
  async deleteOldStats(orgId, beforeDate) {
    try {
      const snapshot = await this.getCollection(orgId)
        .where('calculatedAt', '<', beforeDate)
        .get();

      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      const count = snapshot.size;
      console.log(`✅ [StatisticsRepository] Deleted ${count} old statistics`);
      return count;
    } catch (error) {
      console.error(`❌ [StatisticsRepository] DeleteOldStats error:`, error);
      throw new Error(`Failed to delete old stats: ${error.message}`);
    }
  }
}

module.exports = StatisticsRepository;
