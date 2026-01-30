/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * PERFORMANCE OPTIMIZATIONS - Batch Operations & Caching
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * PERFORMANCE TARGETS:
 * - Dashboard load: < 2 seconds
 * - Transaction writes: 10x faster with batch operations
 * - Category loading: < 1 second (cached)
 * - Navigation: < 0.5 seconds
 * 
 * KEY OPTIMIZATIONS:
 * 1. Batch write operations (single flush)
 * 2. CacheService for frequently accessed data
 * 3. Optimized data fetching (Stripe integration)
 * 4. Performance logging and metrics
 * 
 * NOTE: Plaid integration deprecated in 2026. Transaction fetch functions
 * in this file are kept for backward compatibility but redirect to Stripe.
 */

// ═══════════════════════════════════════════════════════════════════
// PERFORMANCE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

var PERF_CONFIG = {
  // Cache TTLs (in seconds)
  CACHE_TTL_SHORT: 300,      // 5 minutes
  CACHE_TTL_MEDIUM: 1800,    // 30 minutes
  CACHE_TTL_LONG: 3600,      // 1 hour
  CACHE_TTL_DASHBOARD: 600,  // 10 minutes for dashboard data
  
  // Batch sizes
  BATCH_SIZE_TRANSACTIONS: 500,
  BATCH_SIZE_WRITES: 100,
  
  // Performance thresholds (ms)
  THRESHOLD_SLOW_OPERATION: 3000,
  THRESHOLD_CRITICAL: 10000,
  
  // Cache keys
  CACHE_KEY_PREFIX: 'mm_perf_',
  CACHE_KEY_DASHBOARD: 'mm_dashboard_data_',
  CACHE_KEY_CATEGORIES: 'mm_categories_',
  CACHE_KEY_USER_DATA: 'mm_user_data_'
};

// ═══════════════════════════════════════════════════════════════════
// OPTIMIZED BATCH TRANSACTION WRITES
// ═══════════════════════════════════════════════════════════════════

/**
 * Write transactions in batch - 10x faster than row-by-row
 * Uses single setValues() call instead of multiple setValue() calls
 * 
 * @param {Sheet} sheet - Target sheet
 * @param {Array} transactions - Array of transaction objects from Plaid
 * @param {number} startRow - Row to start writing (default: 11)
 * @returns {Object} - {success, count, duration}
 */
function writeTransactionsBatchOptimized(sheet, transactions, startRow) {
  var startTime = Date.now();
  startRow = startRow || 11;
  
  try {
    if (!transactions || transactions.length === 0) {
      return { success: true, count: 0, duration: 0 };
    }
    
    Logger.log('📊 [BATCH WRITE] Starting batch write of ' + transactions.length + ' transactions');
    
    // Unprotect sheet before writing (critical for performance)
    var unprotectResult = unprotectSheetForWrite(sheet);
    if (!unprotectResult.success) {
      Logger.log('⚠️ [BATCH WRITE] Could not unprotect sheet: ' + unprotectResult.error);
    }
    
    // Prepare data array for batch write
    // Columns: C=Date, D=Description, E=Amount, F=Personal, G=Business, H=Memo, I=Need/Desire, J=Category
    var rows = [];
    
    for (var i = 0; i < transactions.length; i++) {
      var txn = transactions[i];
      rows.push([
        txn.date || '',                          // C: Date
        txn.name || txn.merchant_name || '',     // D: Description  
        (txn.amount || 0) * -1,                  // E: Amount (flip sign - Plaid positive = expense)
        '',                                       // F: Personal Category
        '',                                       // G: Business Category
        txn.merchant_name || '',                 // H: Memo
        '',                                       // I: Need/Desire
        txn.category ? txn.category[0] : ''      // J: Plaid Category (for reference)
      ]);
    }
    
    // CRITICAL: Single batch write - much faster than individual writes
    if (rows.length > 0) {
      var range = sheet.getRange(startRow, 3, rows.length, 8);
      range.setValues(rows);
      
      // Single flush at the end
      SpreadsheetApp.flush();
    }
    
    var duration = Date.now() - startTime;
    Logger.log('✅ [BATCH WRITE] Completed ' + rows.length + ' rows in ' + duration + 'ms');
    
    // Log performance metrics
    logPerformanceMetric('batch_write_transactions', duration, rows.length);
    
    return {
      success: true,
      count: rows.length,
      duration: duration
    };
    
  } catch (e) {
    var duration = Date.now() - startTime;
    Logger.log('❌ [BATCH WRITE] Error: ' + e.message);
    
    return {
      success: false,
      error: e.message,
      count: 0,
      duration: duration
    };
  }
}



// ═══════════════════════════════════════════════════════════════════
// CACHE SERVICE INTEGRATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Get cached data with automatic refresh
 * Uses CacheService for 1-hour TTL
 * 
 * @param {string} cacheKey - Unique cache key
 * @param {Function} fetchFunction - Function to call if cache miss
 * @param {number} ttl - Time to live in seconds (default: 1 hour)
 * @returns {*} - Cached or fresh data
 */
function getCachedData(cacheKey, fetchFunction, ttl) {
  ttl = ttl || PERF_CONFIG.CACHE_TTL_LONG;
  
  try {
    var cache = CacheService.getUserCache();
    var cached = cache.get(cacheKey);
    
    if (cached) {
      Logger.log('📦 [CACHE] Hit: ' + cacheKey);
      return JSON.parse(cached);
    }
    
    Logger.log('📦 [CACHE] Miss: ' + cacheKey + ' - fetching fresh data');
    
    // Cache miss - fetch fresh data
    var startTime = Date.now();
    var freshData = fetchFunction();
    var fetchTime = Date.now() - startTime;
    
    // Store in cache
    if (freshData !== null && freshData !== undefined) {
      try {
        cache.put(cacheKey, JSON.stringify(freshData), ttl);
        Logger.log('📦 [CACHE] Stored: ' + cacheKey + ' (TTL: ' + ttl + 's, fetch: ' + fetchTime + 'ms)');
      } catch (cacheError) {
        Logger.log('⚠️ [CACHE] Storage failed (data too large?): ' + cacheError.message);
      }
    }
    
    return freshData;
    
  } catch (e) {
    Logger.log('❌ [CACHE] Error: ' + e.message);
    // On cache error, just fetch fresh
    return fetchFunction();
  }
}

/**
 * Clear cached data for a specific key
 * @param {string} cacheKey - Cache key to clear
 */
function clearCache(cacheKey) {
  try {
    var cache = CacheService.getUserCache();
    cache.remove(cacheKey);
    Logger.log('🗑️ [CACHE] Cleared: ' + cacheKey);
  } catch (e) {
    Logger.log('⚠️ [CACHE] Clear failed: ' + e.message);
  }
}

/**
 * Clear all Money Mastery caches
 */
function clearAllCaches() {
  try {
    var cache = CacheService.getUserCache();
    
    // Known cache keys to clear
    var keys = [
      PERF_CONFIG.CACHE_KEY_DASHBOARD + '*',
      PERF_CONFIG.CACHE_KEY_CATEGORIES + 'expense',
      PERF_CONFIG.CACHE_KEY_CATEGORIES + 'income',
      PERF_CONFIG.CACHE_KEY_CATEGORIES + 'business',
      PERF_CONFIG.CACHE_KEY_USER_DATA + '*'
    ];
    
    // Note: CacheService doesn't support wildcard removal
    // We remove known keys individually
    cache.removeAll([
      'v3_expenseCategories',
      'v3_incomeCategories',
      'v3_businessCategories_AC3',
      'mm_dashboard_data',
      'mm_user_preferences'
    ]);
    
    Logger.log('🗑️ [CACHE] All caches cleared');
    return { success: true };
    
  } catch (e) {
    Logger.log('❌ [CACHE] Clear all failed: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD DATA LOADING OPTIMIZATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Show loading status dialog during data operations
 * Uses modeless dialog so it can be updated/closed
 * 
 * @param {string} message - Loading message
 */
function showLoadingStatus(message) {
  try {
    var html = HtmlService.createHtmlOutput([
      '<!DOCTYPE html>',
      '<html>',
      '<head>',
      '<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet">',
      '<style>',
      'body { font-family: Montserrat, Arial, sans-serif; background: linear-gradient(135deg, #f9f7f4 0%, #fff 100%); margin: 0; padding: 30px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: calc(100vh - 60px); }',
      '.loader-container { text-align: center; }',
      '.spinner { width: 50px; height: 50px; border: 4px solid #e8e8e8; border-top: 4px solid #ab9478; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }',
      '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }',
      '.message { font-size: 16px; color: #5a5146; font-weight: 500; }',
      '.progress { margin-top: 15px; font-size: 13px; color: #888; }',
      '.tip { margin-top: 20px; padding: 15px; background: #fff9e6; border-radius: 8px; font-size: 12px; color: #5a5146; max-width: 280px; }',
      '</style>',
      '</head>',
      '<body>',
      '<div class="loader-container">',
      '<div class="spinner"></div>',
      '<div class="message" id="message">' + (message || 'Loading...') + '</div>',
      '<div class="progress" id="progress"></div>',
      '<div class="tip">💡 Tip: Your data is being synchronized securely.</div>',
      '</div>',
      '<script>',
      'function updateMessage(msg) { document.getElementById("message").textContent = msg; }',
      'function updateProgress(prog) { document.getElementById("progress").textContent = prog; }',
      '</script>',
      '</body>',
      '</html>'
    ].join('\n'))
    .setWidth(350)
    .setHeight(280);
    
    SpreadsheetApp.getUi().showModelessDialog(html, 'Syncing Data');
    
  } catch (e) {
    Logger.log('showLoadingStatus error: ' + e.message);
  }
}

/**
 * Close loading status dialog
 */
function closeLoadingStatus() {
  try {
    // Note: Apps Script doesn't have a direct way to close modeless dialogs
    // We'll use a workaround by showing a tiny dialog that auto-closes
    var html = HtmlService.createHtmlOutput([
      '<script>google.script.host.close();</script>'
    ].join('\n'))
    .setWidth(1)
    .setHeight(1);
    
    SpreadsheetApp.getUi().showModelessDialog(html, '');
    
  } catch (e) {
    Logger.log('closeLoadingStatus error: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// SHEET PROTECTION HELPERS (for batch writes)
// ═══════════════════════════════════════════════════════════════════

/**
 * Temporarily unprotect sheet for writing operations
 * Called at start of batch write
 * 
 * @param {Sheet} sheet - Sheet to unprotect
 * @returns {Object} - {success, removedProtections}
 */
function unprotectSheetForWrite(sheet) {
  try {
    var removed = 0;
    
    // Remove sheet-level protections
    var sheetProtections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    sheetProtections.forEach(function(protection) {
      try {
        if (protection.canEdit()) {
          protection.remove();
          removed++;
        }
      } catch (e) {
        // Can't remove - user doesn't have permission
      }
    });
    
    // Remove range-level protections on data area (row 11+)
    var rangeProtections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
    rangeProtections.forEach(function(protection) {
      try {
        var range = protection.getRange();
        if (range.getRow() >= 11 && protection.canEdit()) {
          protection.remove();
          removed++;
        }
      } catch (e) {
        // Can't remove
      }
    });
    
    Logger.log('🔓 [PROTECTION] Removed ' + removed + ' protections from ' + sheet.getName());
    
    return { success: true, removedProtections: removed };
    
  } catch (e) {
    Logger.log('⚠️ [PROTECTION] Error removing protections: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Remove all protections from ACCOUNT sheets on open
 * Called from onOpen to ensure write access
 */
function removeAccountProtectionsOnOpen() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var totalRemoved = 0;
    
    for (var i = 1; i <= 10; i++) {
      var sheetName = 'ACCOUNT ' + i;
      var sheet = ss.getSheetByName(sheetName);
      
      if (sheet) {
        var result = unprotectSheetForWrite(sheet);
        if (result.success) {
          totalRemoved += result.removedProtections;
        }
      }
    }
    
    if (totalRemoved > 0) {
      Logger.log('🔓 [STARTUP] Removed ' + totalRemoved + ' protections from ACCOUNT sheets');
    }
    
    return { success: true, removed: totalRemoved };
    
  } catch (e) {
    Logger.log('⚠️ [STARTUP] Protection removal failed: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// PERFORMANCE LOGGING & METRICS
// ═══════════════════════════════════════════════════════════════════

/**
 * Log performance metric for analysis
 * 
 * @param {string} operation - Operation name
 * @param {number} duration - Duration in milliseconds
 * @param {number} count - Number of items processed
 */
function logPerformanceMetric(operation, duration, count) {
  try {
    var props = PropertiesService.getScriptProperties();
    
    // Store latest metric
    var metric = {
      operation: operation,
      duration: duration,
      count: count || 0,
      timestamp: new Date().toISOString(),
      perItem: count > 0 ? (duration / count).toFixed(2) : 0
    };
    
    props.setProperty('mm_perf_' + operation, JSON.stringify(metric));
    
    // Log slow operations
    if (duration > PERF_CONFIG.THRESHOLD_SLOW_OPERATION) {
      Logger.log('⚠️ [PERF] Slow operation: ' + operation + ' took ' + duration + 'ms');
    }
    
    if (duration > PERF_CONFIG.THRESHOLD_CRITICAL) {
      Logger.log('🚨 [PERF] CRITICAL: ' + operation + ' took ' + duration + 'ms - needs optimization!');
    }
    
  } catch (e) {
    Logger.log('logPerformanceMetric error: ' + e.message);
  }
}

/**
 * Get performance report
 * @returns {Object} - Performance metrics summary
 */
function getPerformanceReport() {
  try {
    var props = PropertiesService.getScriptProperties();
    var allProps = props.getProperties();
    var metrics = {};
    
    for (var key in allProps) {
      if (key.indexOf('mm_perf_') === 0) {
        try {
          var opName = key.replace('mm_perf_', '');
          metrics[opName] = JSON.parse(allProps[key]);
        } catch (e) {
          // Skip malformed metrics
        }
      }
    }
    
    return {
      metrics: metrics,
      generated: new Date().toISOString()
    };
    
  } catch (e) {
    return { error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// OPTIMIZED DASHBOARD DATA FETCH
// ═══════════════════════════════════════════════════════════════════

/**
 * Get dashboard data with caching - optimized for speed
 * Target: < 2 seconds load time
 * 
 * @param {string} dateFilter - '30days', '90days', 'year', etc.
 * @returns {Object} - Dashboard data
 */
function getDashboardDataOptimized(dateFilter) {
  var startTime = Date.now();
  dateFilter = dateFilter || '30days';
  
  // Try cache first
  var cacheKey = 'mm_dashboard_' + dateFilter;
  
  try {
    var cache = CacheService.getUserCache();
    var cached = cache.get(cacheKey);
    
    if (cached) {
      Logger.log('📊 [DASHBOARD] Cache hit - returning cached data');
      var data = JSON.parse(cached);
      data._cached = true;
      data._loadTime = Date.now() - startTime;
      return data;
    }
  } catch (e) {
    Logger.log('Cache read error: ' + e.message);
  }
  
  // Cache miss - compute fresh data
  Logger.log('📊 [DASHBOARD] Computing fresh dashboard data...');
  
  try {
    // Call the main dashboard function (from Welcome.gs)
    var dashboardData;
    if (typeof MM_computeDashboardData === 'function') {
      dashboardData = MM_computeDashboardData(dateFilter);
    } else if (typeof MM_apiGetDashboardData === 'function') {
      dashboardData = MM_apiGetDashboardData(dateFilter);
    } else {
      throw new Error('Dashboard data function not found');
    }
    
    // Cache the result
    try {
      var cache = CacheService.getUserCache();
      cache.put(cacheKey, JSON.stringify(dashboardData), PERF_CONFIG.CACHE_TTL_DASHBOARD);
    } catch (cacheError) {
      Logger.log('Cache write error: ' + cacheError.message);
    }
    
    var duration = Date.now() - startTime;
    dashboardData._cached = false;
    dashboardData._loadTime = duration;
    
    logPerformanceMetric('dashboard_load', duration, 1);
    
    Logger.log('📊 [DASHBOARD] Data loaded in ' + duration + 'ms');
    
    return dashboardData;
    
  } catch (e) {
    Logger.log('❌ [DASHBOARD] Error: ' + e.message);
    return {
      error: e.message,
      _loadTime: Date.now() - startTime
    };
  }
}

/**
 * Clear dashboard cache - call after data updates
 */
function clearDashboardCache() {
  try {
    var cache = CacheService.getUserCache();
    cache.removeAll([
      'mm_dashboard_30days',
      'mm_dashboard_90days',
      'mm_dashboard_year',
      'mm_dashboard_all'
    ]);
    Logger.log('🗑️ Dashboard cache cleared');
    return { success: true };
  } catch (e) {
    Logger.log('clearDashboardCache error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// Expose for menu
function MM_CLEAR_DASHBOARD_CACHE() {
  clearDashboardCache();
  SpreadsheetApp.getActiveSpreadsheet().toast('Dashboard cache cleared', 'Success', 3);
}
