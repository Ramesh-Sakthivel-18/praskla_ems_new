/**
 * redis.js
 * 
 * Redis configuration and connection management.
 * Falls back gracefully if Redis is not available.
 */

const redis = require('redis');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.isEnabled = process.env.REDIS_ENABLED === 'true';
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    if (!this.isEnabled) {
      console.log('⚠️ Redis is disabled. Using in-memory fallback.');
      return;
    }

    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('❌ Redis: Max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('🔗 Redis: Connecting...');
      });

      this.client.on('ready', () => {
        console.log('✅ Redis: Connected and ready');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 Redis: Reconnecting...');
      });

      await this.client.connect();
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      console.log('⚠️ Continuing without Redis (in-memory mode)');
      this.isEnabled = false;
    }
  }

  /**
   * Get value from Redis
   * @param {string} key - Cache key
   * @returns {Promise<string|null>}
   */
  async get(key) {
    if (!this.isEnabled || !this.isConnected || !this.client) {
      return null;
    }

    try {
      return await this.client.get(key);
    } catch (error) {
      console.error(`❌ Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in Redis with expiration
   * @param {string} key - Cache key
   * @param {string} value - Value to cache
   * @param {number} ttl - Time to live in seconds (default: 3600)
   * @returns {Promise<boolean>}
   */
  async set(key, value, ttl = 3600) {
    if (!this.isEnabled || !this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.setEx(key, ttl, value);
      return true;
    } catch (error) {
      console.error(`❌ Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete key from Redis
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async del(key) {
    if (!this.isEnabled || !this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`❌ Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern
   * @param {string} pattern - Key pattern (e.g., "stats:org:123:*")
   * @returns {Promise<number>} Number of keys deleted
   */
  async delPattern(pattern) {
    if (!this.isEnabled || !this.isConnected || !this.client) {
      return 0;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;
      
      await this.client.del(keys);
      return keys.length;
    } catch (error) {
      console.error(`❌ Redis DEL PATTERN error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if Redis is available
   * @returns {boolean}
   */
  isAvailable() {
    return this.isEnabled && this.isConnected;
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      console.log('👋 Redis disconnected');
    }
  }
}

// Create singleton instance
const redisClient = new RedisClient();

module.exports = redisClient;
