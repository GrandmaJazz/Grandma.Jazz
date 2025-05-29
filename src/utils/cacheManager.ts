// Global Cache Manager for Grandma Jazz App
export class GlobalCacheManager {
  private static instance: GlobalCacheManager;
  private memoryCache: Map<string, any> = new Map();
  private cachePrefix = 'grandma_jazz_global_';
  
  static getInstance(): GlobalCacheManager {
    if (!GlobalCacheManager.instance) {
      GlobalCacheManager.instance = new GlobalCacheManager();
    }
    return GlobalCacheManager.instance;
  }
  
  // เก็บข้อมูลลง cache (memory + localStorage)
  setCache(key: string, data: any, maxAge: number = 24 * 60 * 60 * 1000): void {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        maxAge,
        version: '1.0'
      };
      
      // Memory cache
      this.memoryCache.set(key, cacheData);
      
      // localStorage cache
      localStorage.setItem(this.cachePrefix + key, JSON.stringify(cacheData));
      
      console.log(`✅ Cache saved: ${key} (expires in ${Math.round(maxAge / 1000 / 60)} minutes)`);
    } catch (error) {
      console.warn('❌ Failed to save cache:', error);
    }
  }
  
  // ดึงข้อมูลจาก cache
  getCache(key: string): any | null {
    try {
      // ลองใน memory cache ก่อน
      if (this.memoryCache.has(key)) {
        const cached = this.memoryCache.get(key);
        if (this.isCacheValid(cached)) {
          console.log(`📦 Memory cache hit: ${key}`);
          return cached.data;
        } else {
          this.memoryCache.delete(key);
        }
      }
      
      // ลองใน localStorage
      const cached = localStorage.getItem(this.cachePrefix + key);
      if (cached) {
        const cacheData = JSON.parse(cached);
        if (this.isCacheValid(cacheData)) {
          // เก็บกลับเข้า memory cache
          this.memoryCache.set(key, cacheData);
          console.log(`💾 localStorage cache hit: ${key}`);
          return cacheData.data;
        } else {
          // ลบ cache ที่หมดอายุ
          localStorage.removeItem(this.cachePrefix + key);
          console.log(`🗑️ Expired cache removed: ${key}`);
        }
      }
    } catch (error) {
      console.warn('❌ Failed to get cache:', error);
    }
    
    console.log(`❌ Cache miss: ${key}`);
    return null;
  }
  
  // ตรวจสอบว่า cache ยังใช้ได้หรือไม่
  private isCacheValid(cacheData: any): boolean {
    if (!cacheData || !cacheData.timestamp || !cacheData.maxAge) {
      return false;
    }
    
    return Date.now() - cacheData.timestamp < cacheData.maxAge;
  }
  
  // ลบ cache ตาม key
  removeCache(key: string): void {
    this.memoryCache.delete(key);
    localStorage.removeItem(this.cachePrefix + key);
    console.log(`🗑️ Cache removed: ${key}`);
  }
  
  // ล้าง cache ทั้งหมดที่หมดอายุ
  clearExpiredCache(): number {
    let clearedCount = 0;
    
    try {
      // ล้าง memory cache ที่หมดอายุ
      for (const [key, value] of this.memoryCache.entries()) {
        if (!this.isCacheValid(value)) {
          this.memoryCache.delete(key);
          clearedCount++;
        }
      }
      
      // ล้าง localStorage cache ที่หมดอายุ
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.cachePrefix)) {
          try {
            const cached = localStorage.getItem(key);
            if (cached) {
              const cacheData = JSON.parse(cached);
              if (!this.isCacheValid(cacheData)) {
                localStorage.removeItem(key);
                clearedCount++;
              }
            }
          } catch (error) {
            // ถ้า parse ไม่ได้ ลบออกเลย
            localStorage.removeItem(key);
            clearedCount++;
          }
        }
      });
      
      if (clearedCount > 0) {
        console.log(`🧹 Cleared ${clearedCount} expired cache items`);
      }
    } catch (error) {
      console.warn('❌ Failed to clear expired cache:', error);
    }
    
    return clearedCount;
  }
  
  // ล้าง cache ทั้งหมด
  clearAllCache(): void {
    // ล้าง memory cache
    this.memoryCache.clear();
    
    // ล้าง localStorage cache
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.cachePrefix)) {
          localStorage.removeItem(key);
        }
      });
      console.log('🧹 All cache cleared');
    } catch (error) {
      console.warn('❌ Failed to clear all cache:', error);
    }
  }
  
  // ดูข้อมูล cache
  getCacheStats(): {
    memoryCount: number;
    localStorageCount: number;
    totalSize: string;
    oldestItem: string | null;
    newestItem: string | null;
  } {
    const memoryCount = this.memoryCache.size;
    
    let localStorageCount = 0;
    let totalSize = 0;
    let oldestTimestamp = Date.now();
    let newestTimestamp = 0;
    let oldestItem: string | null = null;
    let newestItem: string | null = null;
    
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.cachePrefix)) {
          const value = localStorage.getItem(key);
          if (value) {
            localStorageCount++;
            totalSize += value.length;
            
            try {
              const cacheData = JSON.parse(value);
              if (cacheData.timestamp) {
                if (cacheData.timestamp < oldestTimestamp) {
                  oldestTimestamp = cacheData.timestamp;
                  oldestItem = key.replace(this.cachePrefix, '');
                }
                if (cacheData.timestamp > newestTimestamp) {
                  newestTimestamp = cacheData.timestamp;
                  newestItem = key.replace(this.cachePrefix, '');
                }
              }
            } catch (error) {
              // Skip invalid cache items
            }
          }
        }
      });
    } catch (error) {
      console.warn('❌ Failed to get cache stats:', error);
    }
    
    return {
      memoryCount,
      localStorageCount,
      totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
      oldestItem,
      newestItem
    };
  }
  
  // เริ่มต้นการจัดการ cache อัตโนมัติ
  startAutoCleanup(intervalMinutes: number = 30): void {
    // ล้าง cache เก่าทันที
    this.clearExpiredCache();
    
    // ตั้งให้ล้าง cache เก่าทุกๆ interval ที่กำหนด
    setInterval(() => {
      this.clearExpiredCache();
    }, intervalMinutes * 60 * 1000);
    
    console.log(`🔄 Auto cache cleanup started (every ${intervalMinutes} minutes)`);
  }
}

// Export singleton instance
export const cacheManager = GlobalCacheManager.getInstance();

// Cache types for different data
export const CacheTypes = {
  CARDS: 'cards',
  IMAGES: 'images',
  MODELS: 'models',
  MUSIC_STATE: 'music_state',
  USER_PREFERENCES: 'user_preferences'
} as const;

// Cache durations
export const CacheDurations = {
  SHORT: 5 * 60 * 1000,        // 5 minutes
  MEDIUM: 30 * 60 * 1000,      // 30 minutes  
  LONG: 2 * 60 * 60 * 1000,    // 2 hours
  VERY_LONG: 24 * 60 * 60 * 1000 // 24 hours
} as const; 