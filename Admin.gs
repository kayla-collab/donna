/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * ADMIN.GS - Admin Utilities & Access Key Synchronization
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * 🔐 SECURITY ARCHITECTURE (v2 - Local Hidden Storage):
 * 
 * 1. ON OPEN (Admin/Owner only):
 *    - Fetches access keys from external Master Sheet
 *    - Stores them as hidden white text in cell ZZ1 of DASHBOARD sheet
 *    - Only works when admin opens the sheet (has permission)
 * 
 * 2. WHEN ADMIN RESETS REGISTRATION:
 *    - Same sync happens automatically
 * 
 * 3. USER REGISTRATION:
 *    - Reads access keys from LOCAL hidden cell (no external calls)
 *    - No permission errors possible
 *    - Works even when admin is not present
 * 
 * Storage: Cell ZZ1 on DASHBOARD sheet, white text on white background
 */

var ADMIN_CONFIG = {
  // Remote Master Sheet ID (external backend)
  // DEPRECATED: Use MASTER_HUB in Config.gs for new integrations
  // This ID is kept for backward compatibility with local key sync
  MASTER_SHEET_ID: '11MhJFe4xmSMBLPUXxePtq-yB2YsuhsScY1H7Dc4zwMI',  // NEW MASTER HUB
  MASTER_SHEET_NAME: 'CLIENT MANAGEMENT',  // Updated from 'ACCESS KEYS'
  
  // Local storage location (hidden in BACKEND sheet)
  LOCAL_STORAGE_SHEET: 'BACKEND',
  LOCAL_STORAGE_CELL: 'ZZ1',
  
  // Backup storage key (Document Properties)
  STORAGE_KEY_ACCESS_KEYS: 'mm_valid_access_keys_local',
  STORAGE_KEY_LAST_SYNC: 'mm_keys_last_sync_local'
};

// ═══════════════════════════════════════════════════════════════════
// SYNC ACCESS KEYS (Admin Only - Called on Open & Reset)
// ═══════════════════════════════════════════════════════════════════

/**
 * 🔄 Sync Access Keys from External Backend to Local Hidden Storage
 * Called automatically on open (for admins) and when resetting registration
 * 
 * UPDATED FOR NEW MASTER HUB:
 * - Column A = Email, Column B = Access Code, Column L = Disable Usage
 * - Uses Document Properties only (avoids cell limit issues)
 * 
 * @param {boolean} silent - If true, don't show UI alerts
 * @returns {object} Result with success status
 */
function syncAccessKeysToLocal(silent) {
  try {
    var email = '';
    try {
      email = Session.getActiveUser().getEmail();
    } catch (e) {
      Logger.log('[INFO] Cannot get user email for sync check');
      return { success: false, error: 'Cannot determine user' };
    }
    
    // Only admins can sync (they have access to external backend)
    if (!MM_isMasterEmail_(email)) {
      Logger.log('[INFO] Non-admin user, skipping access key sync');
      return { success: false, error: 'Not admin' };
    }
    
    Logger.log('🔄 Admin detected, syncing access keys from external backend...');
    
    // 1. Fetch keys from MASTER HUB CLIENT MANAGEMENT
    var remoteSS;
    try {
      remoteSS = SpreadsheetApp.openById(ADMIN_CONFIG.MASTER_SHEET_ID);
    } catch (permError) {
      // Permission error - need to authorize or use Web App
      Logger.log('❌ Cannot access MASTER HUB directly. Please share the sheet with your account or use Web App.');
      Logger.log('   MASTER HUB ID: ' + ADMIN_CONFIG.MASTER_SHEET_ID);
      Logger.log('   Error: ' + permError.message);
      
      // Try using MasterHub.gs sync instead if available
      if (typeof MH_syncClientDataToLocalCache === 'function') {
        Logger.log('🔄 Attempting sync via MasterHub.gs...');
        var hubResult = MH_syncClientDataToLocalCache();
        if (hubResult.success) {
          Logger.log('✅ Synced via MasterHub.gs: ' + hubResult.clientCount + ' clients');
          return { success: true, count: hubResult.clientCount, method: 'MasterHub' };
        }
      }
      
      return { success: false, error: 'Permission denied. Share MASTER HUB with: ' + email };
    }
    
    var remoteSheet = remoteSS.getSheetByName(ADMIN_CONFIG.MASTER_SHEET_NAME);
    
    if (!remoteSheet) {
      throw new Error('Remote sheet "' + ADMIN_CONFIG.MASTER_SHEET_NAME + '" not found');
    }
    
    var lastRow = remoteSheet.getLastRow();
    if (lastRow < 2) {
      Logger.log('⚠️ MASTER HUB CLIENT MANAGEMENT is empty (no clients yet)');
      // Store empty keys - this is valid for new setup
      var props = _mm_safeDocProps_();
      props.setProperty(ADMIN_CONFIG.STORAGE_KEY_ACCESS_KEYS, JSON.stringify([]));
      props.setProperty(ADMIN_CONFIG.STORAGE_KEY_LAST_SYNC, new Date().toISOString());
      return { success: true, count: 0 };
    }
    
    // Read columns A-L for NEW MASTER HUB structure
    // A=Email, B=AccessCode, C=First, D=Last, E=DateReg, F-I=SheetIDs, J-K=CopyKeys, L=Disabled
    var rowsToRead = Math.min(lastRow - 1, 1000); // Limit to 1000 rows to avoid issues
    var data = remoteSheet.getRange(2, 1, rowsToRead, 12).getValues();
    var validKeys = [];
    
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var clientEmail = String(row[0] || '').trim().toLowerCase(); // Column A
      var accessKey = String(row[1] || '').trim().toUpperCase();   // Column B - Access Code
      var isDisabled = String(row[11] || '').toUpperCase() === 'TRUE'; // Column L - Disable Usage
      
      // Only include non-disabled, valid keys
      if (!isDisabled && accessKey && accessKey.length >= 4) {
        validKeys.push(accessKey);
      }
    }
    
    Logger.log('📋 Found ' + validKeys.length + ' valid access keys');
    
    // 2. Store in Document Properties ONLY (avoids cell limit issues)
    try {
      var props = _mm_safeDocProps_();
      props.setProperty(ADMIN_CONFIG.STORAGE_KEY_ACCESS_KEYS, JSON.stringify(validKeys));
      props.setProperty(ADMIN_CONFIG.STORAGE_KEY_LAST_SYNC, new Date().toISOString());
      Logger.log('✅ Access keys synced to Document Properties: ' + validKeys.length + ' keys');
    } catch (propError) {
      Logger.log('[ERROR] Could not save to Document Properties: ' + propError.message);
      throw propError;
    }
    
    // 3. Optionally store in hidden cell (skip if would cause cell limit issues)
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var localSheet = ss.getSheetByName(ADMIN_CONFIG.LOCAL_STORAGE_SHEET);
      
      if (localSheet) {
        var storageData = JSON.stringify({
          keys: validKeys,
          syncedAt: new Date().toISOString(),
          syncedBy: email
        });
        
        // Check if cell exists without expanding sheet
        var maxRows = localSheet.getMaxRows();
        var maxCols = localSheet.getMaxColumns();
        var cellRow = parseInt(ADMIN_CONFIG.LOCAL_STORAGE_CELL.replace(/[^0-9]/g, '')) || 1;
        var cellCol = ADMIN_CONFIG.LOCAL_STORAGE_CELL.replace(/[0-9]/g, '').charCodeAt(0) - 64;
        
        // Only write if cell is within existing bounds
        if (cellRow <= maxRows && cellCol <= maxCols) {
          var cell = localSheet.getRange(ADMIN_CONFIG.LOCAL_STORAGE_CELL);
          cell.setValue(storageData);
          cell.setFontColor('#FFFFFF');
          cell.setBackground('#FFFFFF');
          Logger.log('✅ Also saved to hidden cell: ' + localSheet.getName() + '!' + ADMIN_CONFIG.LOCAL_STORAGE_CELL);
        } else {
          Logger.log('⚠️ Skipped hidden cell storage (would exceed sheet bounds)');
        }
      }
    } catch (cellError) {
      Logger.log('⚠️ Hidden cell storage skipped: ' + cellError.message);
      // Non-fatal - Document Properties is the primary storage
    }
    
    if (!silent) {
      try {
        SpreadsheetApp.getUi().alert(
          '✅ Access Keys Synced',
          'Successfully synced ' + validKeys.length + ' access keys from MASTER HUB.\n\n' +
          'Users can now register without permission errors.',
          SpreadsheetApp.getUi().ButtonSet.OK
        );
      } catch (uiErr) {}
    }
    
    return { success: true, count: validKeys.length };
    
  } catch (e) {
    Logger.log('❌ syncAccessKeysToLocal failed: ' + e.message);
    if (!silent) {
      try {
        SpreadsheetApp.getUi().alert('Sync Failed', 'Error: ' + e.message, SpreadsheetApp.getUi().ButtonSet.OK);
      } catch (uiErr) {}
    }
    return { success: false, error: e.message };
  }
}

/**
 * 🔄 ADMIN Menu Function: Manual Sync Access Keys
 */
function ADMIN_syncAccessKeys() {
  syncAccessKeysToLocal(false); // Show UI feedback
}

// ═══════════════════════════════════════════════════════════════════
// VERIFY ACCESS KEY (User-Facing - No External Calls)
// ═══════════════════════════════════════════════════════════════════

/**
 * 🔑 Verify an access key against LOCAL storage
 * Called during user registration - NO external calls, NO permission issues
 * 
 * @param {string} accessKey - The access key to verify
 * @returns {object} { valid: boolean, error: string }
 */
function _ADMIN_verifyKeyLocally_(accessKey) {
  try {
    var normalizedKey = String(accessKey || '').trim().toUpperCase();
    
    if (!normalizedKey || normalizedKey.length < 4) {
      return { valid: false, error: 'Access key is too short' };
    }
    
    // 1. Try to read from hidden cell first
    var validKeys = _getLocalAccessKeys_();
    
    if (validKeys && validKeys.length > 0) {
      if (validKeys.indexOf(normalizedKey) !== -1) {
        Logger.log('✅ Access key verified from local storage: ' + normalizedKey);
        return { valid: true };
      } else {
        Logger.log('❌ Access key not found in local storage: ' + normalizedKey);
        return { valid: false, error: 'Invalid access key. Please check and try again.' };
      }
    }
    
    // 2. No local keys found - system not set up
    Logger.log('⚠️ No access keys found in local storage. Admin needs to open the sheet first.');
    return { 
      valid: false, 
      error: 'Registration system not ready. Please ask the sheet owner to open the sheet first, then try again.' 
    };
    
  } catch (e) {
    Logger.log('❌ _ADMIN_verifyKeyLocally_ error: ' + e.message);
    return { valid: false, error: 'Verification error: ' + e.message };
  }
}

/**
 * 📖 Read access keys from local hidden storage
 * @returns {Array} Array of valid access keys, or empty array
 */
function _getLocalAccessKeys_() {
  var keys = [];
  
  // 1. Try hidden cell first
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(ADMIN_CONFIG.LOCAL_STORAGE_SHEET);
    
    if (sheet) {
      var cellValue = sheet.getRange(ADMIN_CONFIG.LOCAL_STORAGE_CELL).getValue();
      if (cellValue) {
        var data = JSON.parse(cellValue);
        if (data && Array.isArray(data.keys)) {
          keys = data.keys;
          Logger.log('📖 Read ' + keys.length + ' keys from hidden cell');
          return keys;
        }
      }
    }
  } catch (cellError) {
    Logger.log('[WARN] Could not read from hidden cell: ' + cellError.message);
  }
  
  // 2. Fallback to Document Properties
  try {
    var props = _mm_safeDocProps_();
    var json = props.getProperty(ADMIN_CONFIG.STORAGE_KEY_ACCESS_KEYS);
    if (json) {
      keys = JSON.parse(json);
      if (Array.isArray(keys)) {
        Logger.log('📖 Read ' + keys.length + ' keys from Document Properties');
        return keys;
      }
    }
  } catch (propError) {
    Logger.log('[WARN] Could not read from Document Properties: ' + propError.message);
  }
  
  Logger.log('⚠️ No access keys found in any local storage');
  return [];
}

// ═══════════════════════════════════════════════════════════════════
// ADMIN UTILITIES
// ═══════════════════════════════════════════════════════════════════

/**
 * 🛠️ ADMIN: Check local cache status
 */
function ADMIN_checkCacheStatus() {
  try {
    var keys = _getLocalAccessKeys_();
    var props = _mm_safeDocProps_();
    var lastSync = props.getProperty(ADMIN_CONFIG.STORAGE_KEY_LAST_SYNC) || 'Never';
    
    SpreadsheetApp.getUi().alert(
      'Local Cache Status',
      'Cached Access Keys: ' + keys.length + '\n' +
      'Last Sync: ' + lastSync + '\n\n' +
      (keys.length === 0 
        ? '⚠️ No keys cached! Run "Sync Access Keys" or re-open the sheet as admin.'
        : '✅ System ready for user registration.'),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 🛠️ Called on sheet open to auto-sync (admin only)
 * This should be called from onOpen or installable trigger
 */
function _tryAutoSyncAccessKeys_() {
  try {
    // Silent sync - no UI alerts
    var result = syncAccessKeysToLocal(true);
    if (result.success) {
      Logger.log('✅ Auto-sync completed: ' + result.count + ' keys');
    }
  } catch (e) {
    // Silently fail for non-admins
    Logger.log('[INFO] Auto-sync skipped: ' + e.message);
  }
}
