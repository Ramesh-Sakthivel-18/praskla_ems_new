const { getFirestore } = require('firebase-admin/firestore');
const initFirebaseAdmin = require('../firebase-admin');

const db = getFirestore(initFirebaseAdmin());

class AttendanceService {
  // Record attendance action
  static async recordAttendance(employeeId, employeeName, action, date) {
    console.log(`🕰️ AttendanceService.recordAttendance() - Employee: ${employeeName}, Action: ${action}, Date: ${date}`);
    try {
      const now = new Date();
      const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const iso = now.toISOString();
      console.log(`⏰ AttendanceService: Recording ${action} at ${time}`);

      // Create attendance ID (employeeId + date)
      const attendanceId = `${employeeId}_${date.replace(/\//g, '-')}`;
      console.log(`🏷️ AttendanceService: Using attendance ID: ${attendanceId}`);

      const attendanceRef = db.collection('attendance').doc(attendanceId);
      const attendanceDoc = await attendanceRef.get();

      let attendanceData;
      if (attendanceDoc.exists) {
        // Update existing record
        console.log(`📝 AttendanceService: Updating existing record for ${employeeName}`);
        attendanceData = attendanceDoc.data();
        attendanceData[action] = time;
        attendanceData.updatedAt = new Date().toISOString();
        const events = Array.isArray(attendanceData.events) ? attendanceData.events : [];
        events.push({ type: action, ts: iso });
        events.sort((a, b) => new Date(a.ts) - new Date(b.ts));
        attendanceData.events = events;

        let totalMinutes = 0;
        let sessionStart = null;
        let breakStart = null;
        let breakAccum = 0;
        let hasClosedSession = false;
        for (const e of events) {
          const t = new Date(e.ts);
          if (e.type === 'checkIn') {
            sessionStart = t;
            breakStart = null;
            breakAccum = 0;
          } else if (e.type === 'breakIn') {
            if (sessionStart && !breakStart) {
              breakStart = t;
            }
          } else if (e.type === 'breakOut') {
            if (sessionStart && breakStart) {
              const dur = Math.max(0, Math.floor((t - breakStart) / (1000 * 60)));
              breakAccum += dur;
              breakStart = null;
            }
          } else if (e.type === 'checkOut') {
            if (sessionStart) {
              const sessionDur = Math.max(0, Math.floor((t - sessionStart) / (1000 * 60)) - breakAccum);
              totalMinutes += sessionDur;
              hasClosedSession = true;
              sessionStart = null;
              breakStart = null;
              breakAccum = 0;
            }
          }
        }
        if (hasClosedSession) {
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          attendanceData.totalHours = `${hours}h ${minutes}m`;
          console.log(`⏱️ AttendanceService: Calculated total hours: ${attendanceData.totalHours}`);
        } else if (attendanceData.checkIn && attendanceData.checkOut) {
          const parseTime = (str) => {
            try {
              const normalized = String(str).replace(/[\u202f\u00a0]/g, ' ').trim();
              const parts = normalized.split(' ');
              const timePart = parts[0] || normalized;
              const ampm = parts[1];
              const [hhStr, mmStr] = timePart.split(':');
              const hhNum = parseInt(hhStr, 10);
              const mmNum = parseInt(mmStr, 10);
              let hh = isNaN(hhNum) ? 0 : hhNum;
              const mm = isNaN(mmNum) ? 0 : mmNum;
              if (ampm && ampm.toUpperCase() === 'PM' && hh !== 12) hh += 12;
              if (ampm && ampm.toUpperCase() === 'AM' && hh === 12) hh = 0;
              return hh * 60 + mm;
            } catch {
              return NaN;
            }
          };
          const startMin = parseTime(attendanceData.checkIn);
          const endMin = parseTime(attendanceData.checkOut);
          let breakMin = 0;
          if (attendanceData.breakIn && attendanceData.breakOut) {
            const bStart = parseTime(attendanceData.breakIn);
            const bEnd = parseTime(attendanceData.breakOut);
            if (!isNaN(bStart) && !isNaN(bEnd)) {
              breakMin = Math.max(0, bEnd - bStart);
            }
          }
          if (!isNaN(startMin) && !isNaN(endMin) && endMin >= startMin) {
            const mins = Math.max(0, endMin - startMin - breakMin);
            const hours = Math.floor(mins / 60);
            const minutes = mins % 60;
            attendanceData.totalHours = `${hours}h ${minutes}m`;
            console.log(`⏱️ AttendanceService: Fallback calculated total hours: ${attendanceData.totalHours}`);
          } else {
            attendanceData.totalHours = '0h 0m';
          }
        }
      } else {
        // Create new record
        console.log(`✨ AttendanceService: Creating new attendance record for ${employeeName}`);
        attendanceData = {
          id: attendanceId,
          employeeId,
          employeeName,
          date,
          [action]: time,
          events: [{ type: action, ts: iso }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      await attendanceRef.set(attendanceData);
      console.log(`✅ AttendanceService: Successfully recorded ${action} for ${employeeName}`);
      return attendanceData;
    } catch (error) {
      console.error(`❌ AttendanceService: Error recording attendance:`, error);
      throw new Error(`Failed to record attendance: ${error.message}`);
    }
  }

  // Get employee's attendance records
  static async getEmployeeRecords(employeeId) {
    console.log(`🔍 AttendanceService.getEmployeeRecords() - Fetching records for employee: ${employeeId}`);
    try {
      // Use a simpler query without orderBy to avoid index issues temporarily
      const snapshot = await db
        .collection('attendance')
        .where('employeeId', '==', employeeId)
        .get();

      const records = snapshot.docs.map(doc => {
        const data = doc.data();
        const record = { id: doc.id, ...data };
        
        // Convert any Firebase Timestamps to strings
        if (record.createdAt && record.createdAt.toDate) {
          record.createdAt = record.createdAt.toDate().toISOString();
        }
        if (record.updatedAt && record.updatedAt.toDate) {
          record.updatedAt = record.updatedAt.toDate().toISOString();
        }
        const needsFix = !record.totalHours || (typeof record.totalHours === 'string' && record.totalHours.includes('NaN'));
        if (needsFix) {
          let totalMinutes = 0;
          const events = Array.isArray(record.events) ? [...record.events].sort((a, b) => new Date(a.ts) - new Date(b.ts)) : null;
          if (events && events.length) {
            let sessionStart = null;
            let breakStart = null;
            let breakAccum = 0;
            for (const e of events) {
              const t = new Date(e.ts);
              if (e.type === 'checkIn') {
                sessionStart = t;
                breakStart = null;
                breakAccum = 0;
              } else if (e.type === 'breakIn') {
                if (sessionStart && !breakStart) breakStart = t;
              } else if (e.type === 'breakOut') {
                if (sessionStart && breakStart) {
                  const dur = Math.max(0, Math.floor((t - breakStart) / (1000 * 60)));
                  breakAccum += dur;
                  breakStart = null;
                }
              } else if (e.type === 'checkOut') {
                if (sessionStart) {
                  const sessionDur = Math.max(0, Math.floor((t - sessionStart) / (1000 * 60)) - breakAccum);
                  totalMinutes += sessionDur;
                  sessionStart = null;
                  breakStart = null;
                  breakAccum = 0;
                }
              }
            }
          } else if (record.checkIn && record.checkOut) {
            const parseTime = (str) => {
              try {
                const parts = str.split(' ');
                const timePart = parts[0] || str;
                const ampm = parts[1];
                const [hhStr, mmStrRaw] = timePart.split(':');
                const hhNum = parseInt(hhStr, 10);
                const mmNum = parseInt(mmStrRaw, 10);
                let hh = isNaN(hhNum) ? 0 : hhNum;
                const mm = isNaN(mmNum) ? 0 : mmNum;
                if (ampm && ampm.toUpperCase() === 'PM' && hh !== 12) hh += 12;
                if (ampm && ampm.toUpperCase() === 'AM' && hh === 12) hh = 0;
                return hh * 60 + mm;
              } catch {
                return NaN;
              }
            };
            const startMin = parseTime(record.checkIn);
            const endMin = parseTime(record.checkOut);
            let breakMin = 0;
            if (record.breakIn && record.breakOut) {
              const bStart = parseTime(record.breakIn);
              const bEnd = parseTime(record.breakOut);
              if (!isNaN(bStart) && !isNaN(bEnd)) {
                breakMin = Math.max(0, bEnd - bStart);
              }
            }
            if (!isNaN(startMin) && !isNaN(endMin) && endMin >= startMin) {
              totalMinutes = Math.max(0, endMin - startMin - breakMin);
            }
          }
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          record.totalHours = `${hours}h ${minutes}m`;
        }
        return record;
      });
      
      // Sort manually by date (newest first)
      records.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      console.log(`✅ AttendanceService: Found ${records.length} records for employee ${employeeId}`);
      return records.slice(0, 10); // Limit to 10 most recent records
    } catch (error) {
      console.error(`❌ AttendanceService: Error getting employee records:`, error);
      throw new Error(`Failed to get employee records: ${error.message}`);
    }
  }

  // Get today's attendance status for employee
  static async getTodayStatus(employeeId) {
    console.log(`📅 AttendanceService.getTodayStatus() - Getting today's status for employee: ${employeeId}`);
    try {
      const today = new Date().toLocaleDateString('en-US');
      const attendanceId = `${employeeId}_${today.replace(/\//g, '-')}`;
      console.log(`🏷️ AttendanceService: Using attendance ID: ${attendanceId}`);

      const doc = await db.collection('attendance').doc(attendanceId).get();

      if (!doc.exists) {
        console.log(`📋 AttendanceService: No attendance record found for today`);
        return { status: 'not_started' };
      }

      const data = doc.data();
      const result = {
        date: data.date,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        breakIn: data.breakIn,
        breakOut: data.breakOut,
        totalHours: data.totalHours
      };
      if (!result.totalHours || (typeof result.totalHours === 'string' && result.totalHours.includes('NaN'))) {
        let totalMinutes = 0;
        const events = Array.isArray(data.events) ? [...data.events].sort((a, b) => new Date(a.ts) - new Date(b.ts)) : null;
        if (events && events.length) {
          let sessionStart = null;
          let breakStart = null;
          let breakAccum = 0;
          for (const e of events) {
            const t = new Date(e.ts);
            if (e.type === 'checkIn') {
              sessionStart = t;
              breakStart = null;
              breakAccum = 0;
            } else if (e.type === 'breakIn') {
              if (sessionStart && !breakStart) breakStart = t;
            } else if (e.type === 'breakOut') {
              if (sessionStart && breakStart) {
                const dur = Math.max(0, Math.floor((t - breakStart) / (1000 * 60)));
                breakAccum += dur;
                breakStart = null;
              }
            } else if (e.type === 'checkOut') {
              if (sessionStart) {
                const sessionDur = Math.max(0, Math.floor((t - sessionStart) / (1000 * 60)) - breakAccum);
                totalMinutes += sessionDur;
                sessionStart = null;
                breakStart = null;
                breakAccum = 0;
              }
            }
          }
        } else if (result.checkIn && result.checkOut) {
          const parseTime = (str) => {
            try {
              const normalized = String(str).replace(/\u202f/g, ' ').trim();
              const parts = normalized.split(' ');
              const timePart = parts[0] || normalized;
              const ampm = parts[1];
              const [hhStr, mmStrRaw] = timePart.split(':');
              const hhNum = parseInt(hhStr, 10);
              const mmNum = parseInt(mmStrRaw, 10);
              let hh = isNaN(hhNum) ? 0 : hhNum;
              const mm = isNaN(mmNum) ? 0 : mmNum;
              if (ampm && ampm.toUpperCase() === 'PM' && hh !== 12) hh += 12;
              if (ampm && ampm.toUpperCase() === 'AM' && hh === 12) hh = 0;
              return hh * 60 + mm;
            } catch {
              return NaN;
            }
          };
          const startMin = parseTime(result.checkIn);
          const endMin = parseTime(result.checkOut);
          let breakMin = 0;
          if (result.breakIn && result.breakOut) {
            const bStart = parseTime(result.breakIn);
            const bEnd = parseTime(result.breakOut);
            if (!isNaN(bStart) && !isNaN(bEnd)) {
              breakMin = Math.max(0, bEnd - bStart);
            }
          }
          if (!isNaN(startMin) && !isNaN(endMin) && endMin >= startMin) {
            totalMinutes = Math.max(0, endMin - startMin - breakMin);
          }
        }
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        result.totalHours = `${hours}h ${minutes}m`;
      }
      
      console.log(`✅ AttendanceService: Today's status:`, result);
      return result;
    } catch (error) {
      console.error(`❌ AttendanceService: Error getting today's status:`, error);
      throw new Error(`Failed to get today status: ${error.message}`);
    }
  }

  // Get all attendance records (admin)
  static async getAllRecords(filters = {}) {
    console.log('🔍 AttendanceService.getAllRecords() - Fetching with filters:', filters);
    try {
      let query = db.collection('attendance');

      if (filters.date) {
        let targetDate = filters.date;
        // Accept ISO date (yyyy-MM-dd) and convert to en-US (M/D/YYYY)
        if (/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
          const d = new Date(targetDate);
          targetDate = d.toLocaleDateString('en-US');
        }
        query = query.where('date', '==', targetDate);
        console.log('📅 AttendanceService: Filtering by date:', targetDate);
      }

      if (filters.employeeName) {
        query = query.where('employeeName', '>=', filters.employeeName)
                    .where('employeeName', '<=', filters.employeeName + '\uf8ff');
        console.log('👤 AttendanceService: Filtering by employee name:', filters.employeeName);
      }

      // Simplified query without orderBy to avoid potential index issues
      const snapshot = await query.limit(100).get();
      const records = snapshot.docs.map(doc => {
        const data = doc.data();
        // Convert any Firebase Timestamps to strings
        const record = { id: doc.id, ...data };
        
        // Convert timestamps to readable strings
        if (record.createdAt && record.createdAt.toDate) {
          record.createdAt = record.createdAt.toDate().toISOString();
        }
        if (record.updatedAt && record.updatedAt.toDate) {
          record.updatedAt = record.updatedAt.toDate().toISOString();
        }
        
        return record;
      });
      
      console.log(`✅ AttendanceService: Found ${records.length} attendance records`);
      
      // Sort by date (newest first), then by updated time (most recent activity first)
      records.sort((a, b) => {
        const dateCompare = new Date(b.date) - new Date(a.date);
        if (dateCompare !== 0) return dateCompare;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });
      
      return records;
    } catch (error) {
      console.error('❌ AttendanceService: Error in getAllRecords:', error);
      console.error('❌ AttendanceService: Error stack:', error.stack);
      throw new Error(`Failed to get all records: ${error.message}`);
    }
  }

  // Get attendance records by date range (admin)
  static async getRecordsByDateRange(startDate, endDate) {
    try {
      const snapshot = await db
        .collection('attendance')
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .orderBy('date', 'desc')
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw new Error(`Failed to get records by date range: ${error.message}`);
    }
  }

  // Get attendance summary (admin)
  static async getSummary(date) {
    try {
      const targetDate = date || new Date().toLocaleDateString('en-US');

      const snapshot = await db
        .collection('attendance')
        .where('date', '==', targetDate)
        .get();

      const records = snapshot.docs.map(doc => doc.data());

      const summary = {
        totalEmployees: records.length,
        presentEmployees: records.filter(r => r.checkIn).length,
        averageHours: 0
      };

      const totalHours = records.reduce((total, record) => {
        if (record.totalHours) {
          const [hours] = record.totalHours.split('h');
          return total + parseInt(hours || 0);
        }
        return total;
      }, 0);

      summary.averageHours = records.length > 0 ? totalHours / records.length : 0;

      return summary;
    } catch (error) {
      throw new Error(`Failed to get summary: ${error.message}`);
    }
  }

  // Get employee attendance statistics (admin)
  static async getEmployeeStats(employeeId, startDate, endDate) {
    try {
      let query = db.collection('attendance').where('employeeId', '==', employeeId);

      if (startDate && endDate) {
        query = query.where('date', '>=', startDate).where('date', '<=', endDate);
      }

      const snapshot = await query.orderBy('date', 'desc').get();
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const stats = {
        totalDays: records.length,
        presentDays: records.filter(r => r.checkIn).length,
        totalHours: records.reduce((total, record) => {
          if (record.totalHours) {
            const [hours] = record.totalHours.split('h');
            return total + parseInt(hours || 0);
          }
          return total;
        }, 0)
      };

      return { records, stats };
    } catch (error) {
      throw new Error(`Failed to get employee stats: ${error.message}`);
    }
  }

  // Get weekly hours for an employee (last 7 days)
  static async getWeeklyHours(employeeId) {
    try {
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - 6);

      const snapshot = await db
        .collection('attendance')
        .where('employeeId', '==', employeeId)
        .get();

      const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const inRange = all.filter(rec => {
        const d = new Date(rec.date);
        return d >= start && d <= today;
      });

      // Ensure chronological order by date ascending
      inRange.sort((a, b) => new Date(a.date) - new Date(b.date));

      const weekly = inRange.map(r => ({
        date: r.date,
        checkIn: r.checkIn || null,
        breakIn: r.breakIn || null,
        breakOut: r.breakOut || null,
        checkOut: r.checkOut || null,
        totalHours: r.totalHours || '0h 0m'
      }));

      const totals = weekly.reduce((acc, r) => {
        const [hStr, mStrPart] = (r.totalHours || '0h 0m').split('h');
        const hours = parseInt(hStr || 0);
        const minutes = parseInt((mStrPart || '0m').replace('m', '').trim() || 0);
        const totalMinutes = hours * 60 + minutes;
        acc.totalMinutes += totalMinutes;
        if (totalMinutes > acc.longestMinutes) acc.longestMinutes = totalMinutes;
        acc.daysWithHours += totalMinutes > 0 ? 1 : 0;
        return acc;
      }, { totalMinutes: 0, longestMinutes: 0, daysWithHours: 0 });

      const totalHours = Math.floor(totals.totalMinutes / 60);
      const averagePerDay = totals.daysWithHours > 0
        ? Math.floor((totals.totalMinutes / totals.daysWithHours) / 60)
        : 0;
      const longestDay = Math.floor(totals.longestMinutes / 60);

      return {
        weekly,
        stats: {
          totalHours,
          averagePerDay,
          longestDay
        }
      };
    } catch (error) {
      throw new Error(`Failed to get weekly hours: ${error.message}`);
    }
  }
}

module.exports = AttendanceService;
