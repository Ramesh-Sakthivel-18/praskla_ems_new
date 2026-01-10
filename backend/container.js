/**
 * container.js
 * 
 * Dependency Injection Container
 * Initializes all repositories and services with proper dependencies.
 * 
 * This is a singleton that manages all service instances.
 */

const { getFirestore } = require('firebase-admin/firestore');
const initFirebaseAdmin = require('./firebase-admin');
const redisClient = require('./config/redis');

// ========================================
// REPOSITORIES
// ========================================
const OrganizationRepository = require('./repositories/OrganizationRepository');
const UserRepository = require('./repositories/UserRepository');
const AttendanceRepository = require('./repositories/AttendanceRepository');
const LeaveRepository = require('./repositories/LeaveRepository');
const StatisticsRepository = require('./repositories/StatisticsRepository');

// ========================================
// SERVICES
// ========================================
const AttendanceService = require('./services/AttendanceService');
const QuotaService = require('./services/QuotaService');
const EmployeeService = require('./services/EmployeeService');
const LeaveService = require('./services/LeaveService');
const StatisticsService = require('./services/StatisticsService');

/**
 * Container Class
 * Manages dependency injection for all services and repositories
 */
class Container {
  constructor() {
    console.log('🔧 Initializing Dependency Injection Container...');

    // Initialize Firebase Admin
    initFirebaseAdmin();
    this.db = getFirestore();
    console.log('✅ Firebase Admin initialized');

    // Initialize Redis (async, but don't wait for it)
    this.initializeRedis();

    // ========================================
    // Initialize Repositories
    // ========================================
    this.organizationRepo = new OrganizationRepository(this.db);
    this.userRepo = new UserRepository(this.db);
    this.attendanceRepo = new AttendanceRepository(this.db);
    this.leaveRepo = new LeaveRepository(this.db);
    this.statisticsRepo = new StatisticsRepository(this.db);
    console.log('✅ Repositories initialized');

    // ========================================
    // Initialize Services (with dependencies)
    // ========================================
    this.attendanceService = new AttendanceService(
      this.attendanceRepo,
      this.userRepo
    );
    console.log('✅ AttendanceService initialized');

    this.quotaService = new QuotaService(
      this.organizationRepo,
      this.userRepo
    );
    console.log('✅ QuotaService initialized');

    this.employeeService = new EmployeeService(
      this.userRepo,
      this.quotaService,
      this.organizationRepo
    );
    console.log('✅ EmployeeService initialized');

    this.leaveService = new LeaveService(
      this.leaveRepo,
      this.userRepo
    );
    console.log('✅ LeaveService initialized');

    this.statisticsService = new StatisticsService(
      this.statisticsRepo,
      this.attendanceRepo,
      this.userRepo
    );
    console.log('✅ StatisticsService initialized');

    console.log('🎉 Container initialization complete!');
  }

  /**
   * Initialize Redis connection (async)
   * @private
   */
  async initializeRedis() {
    try {
      await redisClient.connect();
    } catch (error) {
      console.error('⚠️ Redis initialization failed, continuing without cache');
    }
  }

  // ========================================
  // SERVICE GETTERS
  // ========================================

  /**
   * Get AttendanceService instance
   * @returns {AttendanceService}
   */
  getAttendanceService() {
    return this.attendanceService;
  }

  /**
   * Get QuotaService instance
   * @returns {QuotaService}
   */
  getQuotaService() {
    return this.quotaService;
  }

  /**
   * Get EmployeeService instance
   * @returns {EmployeeService}
   */
  getEmployeeService() {
    return this.employeeService;
  }

  /**
   * Get LeaveService instance
   * @returns {LeaveService}
   */
  getLeaveService() {
    return this.leaveService;
  }

  /**
   * Get StatisticsService instance
   * @returns {StatisticsService}
   */
  getStatisticsService() {
    return this.statisticsService;
  }

  // ========================================
  // REPOSITORY GETTERS
  // ========================================

  /**
   * Get AttendanceRepository instance
   * @returns {AttendanceRepository}
   */
  getAttendanceRepo() {
    return this.attendanceRepo;
  }

  /**
   * Get UserRepository instance
   * @returns {UserRepository}
   */
  getUserRepo() {
    return this.userRepo;
  }

  /**
   * Get OrganizationRepository instance
   * @returns {OrganizationRepository}
   */
  getOrganizationRepo() {
    return this.organizationRepo;
  }

  /**
   * Get LeaveRepository instance
   * @returns {LeaveRepository}
   */
  getLeaveRepo() {
    return this.leaveRepo;
  }

  /**
   * Get StatisticsRepository instance
   * @returns {StatisticsRepository}
   */
  getStatisticsRepo() {
    return this.statisticsRepo;
  }

  /**
   * Get Firestore database instance
   * @returns {FirebaseFirestore.Firestore}
   */
  getDatabase() {
    return this.db;
  }

  /**
   * Get Redis client instance
   * @returns {RedisClient}
   */
  getRedisClient() {
    return redisClient;
  }
}

// ========================================
// CREATE SINGLETON INSTANCE
// ========================================
const container = new Container();

// Export singleton
module.exports = container;
