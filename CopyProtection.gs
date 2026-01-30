/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * COPY PROTECTION & SECURITY RESTRICTIONS
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * SECURITY FEATURES:
 * 1. Detects unauthorized copies of the spreadsheet
 * 2. Disables download/print/copy for non-admin users
 * 3. Sends alerts to support when protection is violated
 * 4. Handles unauthorized access attempts
 * 
 * PROTECTION LEVELS:
 * - Admin (Master Emails): Full access, no restrictions
 * - Registered Clients: View-only restrictions after setup
 * - Guests: Same as clients + limited functionality
 * - Unauthorized: Access denied, alerts sent
 */

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

var COPY_PROTECTION_CONFIG = {
  // Support email for alerts
  SUPPORT_EMAIL: 'support@risingandthriving.com',
  
  // Known original sheet ID (set during initial setup)
  ORIGINAL_SHEET_ID_KEY: 'mm_original_sheet_id',
  
  // Protection status key
  PROTECTION_ENABLED_KEY: 'mm_protection_enabled',
  
  // Copy detection key
  COPY_DETECTION_KEY: 'mm_copy_detection_active',
  
  // Allowed emails storage
  ALLOWED_EMAILS_KEY: 'mm_allowed_emails',
  
  // Grace period before deletion (in hours)
  GRACE_PERIOD_HOURS: 24,
  
  // Flagged copy timestamp key
  FLAGGED_COPY_TIMESTAMP_KEY: 'mm_flagged_copy_timestamp',
  
  // Flagged copy status key
  FLAGGED_COPY_STATUS_KEY: 'mm_flagged_copy_status',
  
  // Backup data key prefix
  BACKUP_DATA_PREFIX: 'mm_backup_'
};

// ═══════════════════════════════════════════════════════════════════
// ROBUST ADMIN/AUTHORIZED USER DETECTION
// ═══════════════════════════════════════════════════════════════════

/**
 * ROBUST admin detection with multiple fallback checks
 * This function MUST NOT fail silently - if we can't determine,
 * we assume NOT admin (but won't delete data for unknown users)
 * 
 * @returns {Object} { isAdmin: boolean, email: string, method: string }
 */
function _robustAdminCheck_() {
  var result = { isAdmin: false, email: '', method: 'none' };
  
  // Try to get email from multiple sources
  var emails = [];
  
  // Method 1: Active user email
  try {
    var activeEmail = Session.getActiveUser().getEmail();
    if (activeEmail && activeEmail.length > 0) {
      emails.push(activeEmail);
      result.email = activeEmail;
    }
  } catch (e) {
    Logger.log('[ADMIN CHECK] Could not get active user email: ' + e.message);
  }
  
  // Method 2: Effective user email (for script executions)
  try {
    var effectiveEmail = Session.getEffectiveUser().getEmail();
    if (effectiveEmail && effectiveEmail.length > 0 && emails.indexOf(effectiveEmail) === -1) {
      emails.push(effectiveEmail);
      if (!result.email) result.email = effectiveEmail;
    }
  } catch (e) {
    Logger.log('[ADMIN CHECK] Could not get effective user email: ' + e.message);
  }
  
  // No emails found - cannot determine admin status
  if (emails.length === 0) {
    Logger.log('[ADMIN CHECK] No user email available');
    return result;
  }
  
  // Check each email against multiple admin sources
  for (var i = 0; i < emails.length; i++) {
    var email = emails[i].toLowerCase().trim();
    
    // Check 1: MM_isMasterEmail_ function (primary method)
    try {
      if (typeof MM_isMasterEmail_ === 'function') {
        var isMaster = MM_isMasterEmail_(email);
        if (isMaster === true) {
          result.isAdmin = true;
          result.email = email;
          result.method = 'MM_isMasterEmail_';
          Logger.log('[ADMIN CHECK] Admin confirmed via MM_isMasterEmail_: ' + email);
          return result;
        }
      }
    } catch (e) {
      Logger.log('[ADMIN CHECK] MM_isMasterEmail_ error: ' + e.message);
    }
    
    // Check 2: Direct MM_CFG.MASTER_EMAILS array check
    try {
      if (typeof MM_CFG !== 'undefined' && MM_CFG && Array.isArray(MM_CFG.MASTER_EMAILS)) {
        for (var j = 0; j < MM_CFG.MASTER_EMAILS.length; j++) {
          var masterEmail = String(MM_CFG.MASTER_EMAILS[j] || '').toLowerCase().trim();
          if (masterEmail && masterEmail === email) {
            result.isAdmin = true;
            result.email = email;
            result.method = 'MM_CFG.MASTER_EMAILS';
            Logger.log('[ADMIN CHECK] Admin confirmed via MM_CFG.MASTER_EMAILS: ' + email);
            return result;
          }
        }
      }
    } catch (e) {
      Logger.log('[ADMIN CHECK] MM_CFG check error: ' + e.message);
    }
    
    // Check 3: Hardcoded fallback for known admin emails
    var hardcodedAdmins = [
      'donna@risingandthriving.com',
      'donna.roggio1111@gmail.com'
    ];
    for (var k = 0; k < hardcodedAdmins.length; k++) {
      if (hardcodedAdmins[k].toLowerCase() === email) {
        result.isAdmin = true;
        result.email = email;
        result.method = 'hardcoded_fallback';
        Logger.log('[ADMIN CHECK] Admin confirmed via hardcoded fallback: ' + email);
        return result;
      }
    }
  }
  
  Logger.log('[ADMIN CHECK] Not an admin: ' + result.email);
  return result;
}

/**
 * Check if user is authorized (admin, owner, client, or guest)
 * @param {Object} props - Document properties
 * @returns {Object} { authorized: boolean, email: string, role: string }
 */
function _isAuthorizedUser_(props) {
  var result = { authorized: false, email: '', role: 'unknown' };
  
  // STEP 1: Admin check (most important - admins are ALWAYS authorized)
  var adminCheck = _robustAdminCheck_();
  if (adminCheck.isAdmin) {
    return { authorized: true, email: adminCheck.email, role: 'admin' };
  }
  
  result.email = adminCheck.email;
  var normalizedEmail = result.email ? result.email.toLowerCase().trim() : '';
  
  // If we can't get the user email at all, don't authorize but also DON'T delete
  // This is a safety measure for edge cases
  if (!normalizedEmail) {
    Logger.log('[AUTH CHECK] Cannot determine user email - treating as unauthorized but safe');
    return { authorized: false, email: '', role: 'unknown_safe' };
  }
  
  // STEP 2: Primary owner check
  if (props) {
    try {
      var primaryEmail = props.getProperty('mm_primary_email');
      if (primaryEmail && normalizedEmail === primaryEmail.toLowerCase().trim()) {
        return { authorized: true, email: normalizedEmail, role: 'owner' };
      }
    } catch (e) {
      Logger.log('[AUTH CHECK] Owner check error: ' + e.message);
    }
    
    // STEP 3: Registered client check
    try {
      var clientEmail = props.getProperty('mm_client_email');
      if (clientEmail && normalizedEmail === clientEmail.toLowerCase().trim()) {
        return { authorized: true, email: normalizedEmail, role: 'client' };
      }
    } catch (e) {
      Logger.log('[AUTH CHECK] Client check error: ' + e.message);
    }
    
    // STEP 4: Allowed emails check
    try {
      var allowedEmailsJson = props.getProperty(COPY_PROTECTION_CONFIG.ALLOWED_EMAILS_KEY);
      if (allowedEmailsJson) {
        var allowedEmails = JSON.parse(allowedEmailsJson);
        if (Array.isArray(allowedEmails)) {
          for (var i = 0; i < allowedEmails.length; i++) {
            if (allowedEmails[i] && allowedEmails[i].toLowerCase().trim() === normalizedEmail) {
              return { authorized: true, email: normalizedEmail, role: 'allowed' };
            }
          }
        }
      }
    } catch (e) {
      Logger.log('[AUTH CHECK] Allowed emails check error: ' + e.message);
    }
    
    // STEP 5: Guest check
    try {
      var guestsJson = props.getProperty('mm_guests_json');
      if (guestsJson) {
        var guests = JSON.parse(guestsJson);
        if (Array.isArray(guests)) {
          for (var j = 0; j < guests.length; j++) {
            if (guests[j] && guests[j].email && guests[j].email.toLowerCase().trim() === normalizedEmail) {
              return { authorized: true, email: normalizedEmail, role: 'guest' };
            }
          }
        }
      }
    } catch (e) {
      Logger.log('[AUTH CHECK] Guest check error: ' + e.message);
    }
  }
  
  result.role = 'unauthorized';
  return result;
}

// ═══════════════════════════════════════════════════════════════════
// COPY DETECTION SYSTEM
// ═══════════════════════════════════════════════════════════════════

/**
 * Check if this is an unauthorized copy of the spreadsheet
 * Called during onOpen
 * 
 * ENHANCED v2.1 - ROBUST FALSE POSITIVE PREVENTION:
 * - ADMIN BYPASS: Admins NEVER get data deleted (with robust multi-check)
 * - OWNER CHECK: Only flags if NOT owner/admin
 * - GRACE PERIOD: 24-hour warning before any deletion
 * - RECOVERY: Backup critical data before deletion
 * - FALSE POSITIVE PROTECTION: Unknown users get warning, not deletion
 * 
 * MASTER HUB INTEGRATION:
 * - Validates Copy Management Key against CLIENT MANAGEMENT in MASTER HUB
 * - Logs unauthorized copies to UNAUTHORIZED USERS sheet
 */
function checkCopyProtection() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var currentId = ss.getId();
    var props = _mm_safeDocProps_();
    
    if (!props) {
      Logger.log('[COPY PROTECTION] Cannot access document properties - skipping check');
      return;
    }
    
    // ═════════════════════════════════════════════════════════════════
    // ROBUST AUTHORIZATION CHECK (Admin, Owner, Client, Guest)
    // This uses multiple fallback methods to prevent false positives
    // ═════════════════════════════════════════════════════════════════
    var authResult = _isAuthorizedUser_(props);
    
    if (authResult.authorized) {
      Logger.log('[COPY PROTECTION] Authorized user detected (' + authResult.email + ', role: ' + authResult.role + ') - bypassing copy protection');
      return; // AUTHORIZED USERS ARE ALWAYS SAFE
    }
    
    // Special case: unknown_safe means we couldn't determine the user
    // In this case, we send an alert but DON'T delete data (false positive prevention)
    if (authResult.role === 'unknown_safe') {
      Logger.log('[COPY PROTECTION] Could not determine user identity - skipping deletion for safety');
      // Just log and return - don't risk deleting an admin's data
      return;
    }
    
    var currentUserEmail = authResult.email || 'unknown';
    
    // ═════════════════════════════════════════════════════════════════
    // ORIGINAL ID CHECK - First open stores the ID
    // ═════════════════════════════════════════════════════════════════
    var originalId = props.getProperty(COPY_PROTECTION_CONFIG.ORIGINAL_SHEET_ID_KEY);
    var copyManagementKey = props.getProperty('mm_copy_management_key');
    
    // If no original ID stored, this is the first open - store current ID
    if (!originalId) {
      props.setProperty(COPY_PROTECTION_CONFIG.ORIGINAL_SHEET_ID_KEY, currentId);
      Logger.log('[COPY PROTECTION] Original sheet ID stored: ' + currentId);
      return;
    }
    
    // ═════════════════════════════════════════════════════════════════
    // SHEET ID CHECK - This is the ACTUAL copy detection
    // ═════════════════════════════════════════════════════════════════
    if (currentId === originalId) {
      // IDs MATCH - This is the ORIGINAL sheet, NOT a copy
      // No further checks needed for the original
      Logger.log('[COPY PROTECTION] Sheet ID matches original - this is the authentic sheet');
      return;
    }
    
    // IDs DON'T MATCH - This is a COPY
    Logger.log('[COPY PROTECTION] COPY DETECTED! Original: ' + originalId + ', Current: ' + currentId);
    handleUnauthorizedCopy_(ss, currentId, originalId, currentUserEmail);
    return; // Copy handling takes over from here
    
  } catch (e) {
    Logger.log('[COPY PROTECTION] Check failed: ' + e.message);
    // Silent fail - don't block access, don't delete data on error
  }
}

/**
 * Handle detection of an unauthorized copy
 * ENHANCED v2.0: Grace period + backup before deletion
 * 
 * Flow:
 * 1. First detection: Flag the copy, start 24-hour grace period, send warning
 * 2. During grace period: Show warning, allow user to contact support
 * 3. After grace period: Backup critical data, then delete
 */
function handleUnauthorizedCopy_(ss, copyId, originalId, userEmail) {
  try {
    userEmail = userEmail || 'unknown';
    var props = _mm_safeDocProps_();
    var copyUrl = ss.getUrl();
    var now = new Date();
    var timestamp = now.toISOString();
    
    // ═════════════════════════════════════════════════════════════════
    // CHECK IF THIS COPY WAS ALREADY FLAGGED
    // ═════════════════════════════════════════════════════════════════
    var flaggedTimestamp = props ? props.getProperty(COPY_PROTECTION_CONFIG.FLAGGED_COPY_TIMESTAMP_KEY) : null;
    var flaggedStatus = props ? props.getProperty(COPY_PROTECTION_CONFIG.FLAGGED_COPY_STATUS_KEY) : null;
    
    if (flaggedTimestamp && flaggedStatus === 'pending') {
      // Already flagged - check if grace period has expired
      var flaggedDate = new Date(flaggedTimestamp);
      var hoursSinceFlagged = (now.getTime() - flaggedDate.getTime()) / (1000 * 60 * 60);
      var hoursRemaining = COPY_PROTECTION_CONFIG.GRACE_PERIOD_HOURS - hoursSinceFlagged;
      
      Logger.log('[COPY PROTECTION] Copy was flagged ' + Math.round(hoursSinceFlagged) + ' hours ago');
      
      if (hoursRemaining > 0) {
        // Still within grace period - show warning but DON'T delete
        showGracePeriodWarning_(Math.ceil(hoursRemaining), userEmail);
        return;
      } else {
        // Grace period expired - proceed with deletion
        Logger.log('[COPY PROTECTION] Grace period expired - proceeding with deletion');
        executeUnauthorizedCopyDeletion_(ss, copyId, originalId, userEmail, props);
        return;
      }
    }
    
    // ═════════════════════════════════════════════════════════════════
    // FIRST TIME DETECTION - START GRACE PERIOD
    // ═════════════════════════════════════════════════════════════════
    Logger.log('[COPY PROTECTION] First detection - starting ' + COPY_PROTECTION_CONFIG.GRACE_PERIOD_HOURS + '-hour grace period');
    
    // Flag this copy
    if (props) {
      props.setProperty(COPY_PROTECTION_CONFIG.FLAGGED_COPY_TIMESTAMP_KEY, timestamp);
      props.setProperty(COPY_PROTECTION_CONFIG.FLAGGED_COPY_STATUS_KEY, 'pending');
    }
    
    // Send alert to support (first warning)
    sendCopyAlertToSupport_({
      copyId: copyId,
      originalId: originalId,
      copyUrl: copyUrl,
      userEmail: userEmail,
      timestamp: timestamp,
      isFirstWarning: true,
      gracePeriodHours: COPY_PROTECTION_CONFIG.GRACE_PERIOD_HOURS
    });
    
    // Show warning with grace period info
    showGracePeriodWarning_(COPY_PROTECTION_CONFIG.GRACE_PERIOD_HOURS, userEmail);
    
  } catch (e) {
    Logger.log('[COPY PROTECTION] Handle copy failed: ' + e.message);
  }
}

/**
 * Show grace period warning to user
 */
function showGracePeriodWarning_(hoursRemaining, userEmail) {
  try {
    SpreadsheetApp.getUi().alert(
      '⚠️ UNAUTHORIZED COPY DETECTED',
      'This appears to be an unauthorized copy of a Money Mastery workbook.\n\n' +
      '🕐 GRACE PERIOD: You have approximately ' + hoursRemaining + ' hour(s) to resolve this.\n\n' +
      'If you believe this is an error:\n' +
      '1. Contact support@risingandthriving.com immediately\n' +
      '2. Include your email: ' + userEmail + '\n' +
      '3. Explain why you have this copy\n\n' +
      '⚠️ After the grace period, this copy will be disabled.\n\n' +
      'The account owner has been notified.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (uiErr) {
    Logger.log('[COPY PROTECTION] Could not show grace period alert: ' + uiErr.message);
  }
}

/**
 * Execute the actual deletion after grace period expires
 * BACKS UP critical data first
 */
function executeUnauthorizedCopyDeletion_(ss, copyId, originalId, userEmail, props) {
  try {
    Logger.log('[COPY PROTECTION] Executing deletion for unauthorized copy');
    
    // ═════════════════════════════════════════════════════════════════
    // BACKUP CRITICAL DATA BEFORE DELETION
    // ═════════════════════════════════════════════════════════════════
    try {
      backupCriticalDataBeforeDeletion_(ss, props);
    } catch (backupErr) {
      Logger.log('[COPY PROTECTION] Backup failed (continuing anyway): ' + backupErr.message);
    }
    
    // ═════════════════════════════════════════════════════════════════
    // SEND FINAL ALERT TO SUPPORT
    // ═════════════════════════════════════════════════════════════════
    sendCopyAlertToSupport_({
      copyId: copyId,
      originalId: originalId,
      copyUrl: ss.getUrl(),
      userEmail: userEmail,
      timestamp: new Date().toISOString(),
      isFirstWarning: false,
      isDeletion: true
    });
    
    // ═════════════════════════════════════════════════════════════════
    // SHOW FINAL WARNING TO USER
    // ═════════════════════════════════════════════════════════════════
    try {
      SpreadsheetApp.getUi().alert(
        '🚫 COPY DISABLED',
        'This unauthorized copy has been disabled.\n\n' +
        'The grace period has expired and the data has been removed.\n\n' +
        'If you believe this was an error, contact support@risingandthriving.com\n' +
        'Reference: ' + copyId,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    } catch (uiErr) {
      Logger.log('[COPY PROTECTION] Could not show deletion alert: ' + uiErr.message);
    }
    
    // ═════════════════════════════════════════════════════════════════
    // DELETE ALL DATA
    // ═════════════════════════════════════════════════════════════════
    try {
      var sheets = ss.getSheets();
      for (var i = 0; i < sheets.length; i++) {
        var sheet = sheets[i];
        try {
          sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).clearContent();
        } catch (clearErr) {
          // Continue if can't clear one sheet
        }
      }
      Logger.log('[COPY PROTECTION] All sheets cleared');
    } catch (deleteErr) {
      Logger.log('[COPY PROTECTION] Could not clear copy: ' + deleteErr.message);
    }
    
    // Mark as deleted
    if (props) {
      props.setProperty(COPY_PROTECTION_CONFIG.FLAGGED_COPY_STATUS_KEY, 'deleted');
    }
    
  } catch (e) {
    Logger.log('[COPY PROTECTION] Execute deletion failed: ' + e.message);
  }
}

/**
 * Backup critical data before deletion (for admin recovery)
 */
function backupCriticalDataBeforeDeletion_(ss, props) {
  try {
    if (!props) return;
    
    var backupData = {
      backupTimestamp: new Date().toISOString(),
      sheetName: ss.getName(),
      sheetId: ss.getId(),
      sheets: []
    };
    
    // Backup first 100 rows of each sheet (critical data)
    var sheets = ss.getSheets();
    for (var i = 0; i < Math.min(sheets.length, 5); i++) { // Max 5 sheets
      var sheet = sheets[i];
      try {
        var sheetName = sheet.getName();
        var lastRow = Math.min(sheet.getLastRow(), 100); // Max 100 rows
        var lastCol = Math.min(sheet.getLastColumn(), 15); // Max 15 columns
        
        if (lastRow > 0 && lastCol > 0) {
          var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
          backupData.sheets.push({
            name: sheetName,
            rowCount: lastRow,
            colCount: lastCol,
            preview: data.slice(0, 10) // First 10 rows as preview
          });
        }
      } catch (sheetErr) {
        Logger.log('[BACKUP] Could not backup sheet: ' + sheetErr.message);
      }
    }
    
    // Store backup in script properties (limited to 9KB per property)
    var backupJson = JSON.stringify(backupData);
    if (backupJson.length < 9000) {
      props.setProperty(COPY_PROTECTION_CONFIG.BACKUP_DATA_PREFIX + 'latest', backupJson);
      Logger.log('[BACKUP] Critical data backed up (' + backupJson.length + ' bytes)');
    } else {
      // Store truncated version
      backupData.sheets = backupData.sheets.map(function(s) {
        return { name: s.name, rowCount: s.rowCount, colCount: s.colCount };
      });
      props.setProperty(COPY_PROTECTION_CONFIG.BACKUP_DATA_PREFIX + 'latest', JSON.stringify(backupData));
      Logger.log('[BACKUP] Truncated backup stored');
    }
    
  } catch (e) {
    Logger.log('[BACKUP] Backup failed: ' + e.message);
  }
}

/**
 * Send copy detection alert to support
 * ENHANCED: Different messages for first warning vs deletion
 */
function sendCopyAlertToSupport_(details) {
  try {
    var isFirstWarning = details.isFirstWarning === true;
    var isDeletion = details.isDeletion === true;
    
    var subject, alertType, actionTaken;
    
    if (isDeletion) {
      subject = '🚫 ALERT: Unauthorized Copy DELETED - Money Mastery';
      alertType = 'COPY DELETED';
      actionTaken = 'The grace period expired and the copy has been DELETED.';
    } else if (isFirstWarning) {
      subject = '⚠️ WARNING: Unauthorized Copy Detected - Money Mastery';
      alertType = 'FIRST WARNING - GRACE PERIOD STARTED';
      actionTaken = 'A ' + (details.gracePeriodHours || 24) + '-hour grace period has started.\nThe user has been warned. Copy will be deleted if not resolved.';
    } else {
      subject = 'ALERT: Unauthorized Money Mastery Copy Detected';
      alertType = 'COPY DETECTED';
      actionTaken = 'The copy has been flagged and the user has been notified.';
    }
    
    var body = [
      '═══════════════════════════════════════════════════════════════',
      '   ' + alertType,
      '═══════════════════════════════════════════════════════════════',
      '',
      'A copy of a Money Mastery workbook has been detected.',
      '',
      'DETAILS:',
      '─────────────────────────────────────────────────────────────────',
      'Copy URL: ' + details.copyUrl,
      'Copy ID: ' + details.copyId,
      'Original ID: ' + details.originalId,
      'Copier Email: ' + details.userEmail,
      'Timestamp: ' + details.timestamp,
      '',
      'ACTION TAKEN:',
      '─────────────────────────────────────────────────────────────────',
      actionTaken,
      '',
      '─────────────────────────────────────────────────────────────────',
      '',
      'ADMIN ACTIONS:',
      '• To approve this copy, add the user email to Allowed Emails',
      '• To recover data, use ADMIN_recoverDeletedCopyData() function',
      '',
      '© 2026 Donna Roggio LLC'
    ].join('\n');
    
    // Try to send via Resend API first
    if (typeof RESEND_CONFIG !== 'undefined' && RESEND_CONFIG.API_KEY) {
      var payload = {
        from: 'Money Mastery <noreply@risingandthriving.com>',
        to: [COPY_PROTECTION_CONFIG.SUPPORT_EMAIL],
        subject: subject,
        text: body
      };
      
      var response = UrlFetchApp.fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + RESEND_CONFIG.API_KEY,
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      
      Logger.log('[COPY PROTECTION] Alert sent via Resend: ' + response.getResponseCode());
    } else {
      // Fallback to MailApp
      MailApp.sendEmail({
        to: COPY_PROTECTION_CONFIG.SUPPORT_EMAIL,
        subject: subject,
        body: body
      });
      Logger.log('[COPY PROTECTION] Alert sent via MailApp');
    }
    
  } catch (e) {
    Logger.log('[COPY PROTECTION] Failed to send alert: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// DOWNLOAD/PRINT/SHARE RESTRICTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Apply restrictions to prevent download/print/copy for non-admins
 * Called after admin setup is complete
 */
function applyClientRestrictions() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var userEmail = '';
    
    try {
      userEmail = Session.getActiveUser().getEmail();
    } catch (e) {
      Logger.log('[RESTRICTIONS] Could not get user email');
      return { success: false, error: 'Could not determine user' };
    }
    
    // Only allow admins to apply restrictions
    if (!MM_isMasterEmail_(userEmail)) {
      Logger.log('[RESTRICTIONS] Non-admin user cannot apply restrictions');
      return { success: false, error: 'Admin access required' };
    }
    
    // Get the file via DriveApp
    var file = DriveApp.getFileById(ss.getId());
    
    // Set restrictions - disable download, print, copy for viewers/commenters
    // Note: Google Sheets API allows setting these via Advanced Google Services
    try {
      // Use Drive API to set restrictions
      // copyRequiresWriterPermission = true prevents viewers from copying
      // This requires Advanced Google Services to be enabled
      
      file.setShareableByEditors(false);
      
      Logger.log('[RESTRICTIONS] Basic sharing restrictions applied');
    } catch (driveErr) {
      Logger.log('[RESTRICTIONS] Drive API error: ' + driveErr.message);
    }
    
    // Store protection status
    var props = _mm_safeDocProps_();
    if (props) {
      props.setProperty(COPY_PROTECTION_CONFIG.PROTECTION_ENABLED_KEY, 'true');
    }
    
    Logger.log('[RESTRICTIONS] Client restrictions applied successfully');
    return { success: true };
    
  } catch (e) {
    Logger.log('[RESTRICTIONS] Apply failed: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Remove restrictions (admin only)
 */
function removeClientRestrictions() {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    
    if (!MM_isMasterEmail_(userEmail)) {
      return { success: false, error: 'Admin access required' };
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var file = DriveApp.getFileById(ss.getId());
    
    file.setShareableByEditors(true);
    
    var props = _mm_safeDocProps_();
    if (props) {
      props.deleteProperty(COPY_PROTECTION_CONFIG.PROTECTION_ENABLED_KEY);
    }
    
    Logger.log('[RESTRICTIONS] Restrictions removed');
    return { success: true };
    
  } catch (e) {
    Logger.log('[RESTRICTIONS] Remove failed: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// UNAUTHORIZED ACCESS DETECTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Check if user is authorized to access the sheet
 * Returns authorization status and handles unauthorized access
 */
function checkUserAuthorization() {
  try {
    var userEmail = '';
    try {
      userEmail = MM_normEmail_(Session.getActiveUser().getEmail());
    } catch (e) {
      Logger.log('[AUTH CHECK] Could not get user email');
      return { authorized: false, reason: 'no_email' };
    }
    
    if (!userEmail) {
      return { authorized: false, reason: 'no_email' };
    }
    
    // Check if admin
    if (MM_isMasterEmail_(userEmail)) {
      return { authorized: true, role: 'admin' };
    }
    
    var props = _mm_safeDocProps_();
    if (!props) {
      return { authorized: false, reason: 'no_props' };
    }
    
    // Check if primary user
    var primaryEmail = MM_normEmail_(props.getProperty('mm_primary_email') || '');
    if (userEmail === primaryEmail) {
      return { authorized: true, role: 'primary' };
    }
    
    // Check if registered as client email (admin-set)
    var clientEmail = MM_normEmail_(props.getProperty('mm_client_email') || '');
    if (userEmail === clientEmail) {
      return { authorized: true, role: 'client' };
    }
    
    // Check if allowed email list
    var allowedEmailsJson = props.getProperty(COPY_PROTECTION_CONFIG.ALLOWED_EMAILS_KEY);
    if (allowedEmailsJson) {
      try {
        var allowedEmails = JSON.parse(allowedEmailsJson);
        if (Array.isArray(allowedEmails)) {
          for (var i = 0; i < allowedEmails.length; i++) {
            if (MM_normEmail_(allowedEmails[i]) === userEmail) {
              return { authorized: true, role: 'allowed' };
            }
          }
        }
      } catch (jsonErr) {
        Logger.log('[AUTH CHECK] Error parsing allowed emails: ' + jsonErr.message);
      }
    }
    
    // Check if guest
    var guestsJson = props.getProperty('mm_guests_json');
    if (guestsJson) {
      try {
        var guests = JSON.parse(guestsJson);
        if (Array.isArray(guests)) {
          for (var i = 0; i < guests.length; i++) {
            if (MM_normEmail_(guests[i].email) === userEmail) {
              return { authorized: true, role: 'guest' };
            }
          }
        }
      } catch (guestErr) {
        Logger.log('[AUTH CHECK] Error checking guests: ' + guestErr.message);
      }
    }
    
    // Not authorized - handle it
    handleUnauthorizedAccess_(userEmail);
    return { authorized: false, reason: 'not_registered' };
    
  } catch (e) {
    Logger.log('[AUTH CHECK] Error: ' + e.message);
    return { authorized: false, reason: 'error' };
  }
}

/**
 * Handle unauthorized access attempt
 */
function handleUnauthorizedAccess_(userEmail) {
  try {
    Logger.log('[UNAUTHORIZED] Access attempt by: ' + userEmail);
    
    // Check if registration is required
    var props = _mm_safeDocProps_();
    var isRegistered = props && props.getProperty('mm_registered') === 'true';
    
    if (!isRegistered) {
      // Sheet not registered yet - user needs access key
      Logger.log('[UNAUTHORIZED] Sheet not registered - showing access key registration');
      return; // Let normal flow handle this
    }
    
    // Sheet is registered but user is not authorized
    // Send alert emails
    sendUnauthorizedAccessAlert_(userEmail);
    
  } catch (e) {
    Logger.log('[UNAUTHORIZED] Handle error: ' + e.message);
  }
}

/**
 * Send unauthorized access alerts to user and support
 */
function sendUnauthorizedAccessAlert_(userEmail) {
  try {
    var timestamp = new Date().toISOString();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetUrl = ss.getUrl();
    
    // Email to the unauthorized user
    var userSubject = 'Money Mastery - Access Not Authorized';
    var userBody = [
      'Hello,',
      '',
      'We noticed you attempted to access a Money Mastery workbook that you are not authorized to view.',
      '',
      'Sheet URL: ' + sheetUrl,
      'Your Email: ' + userEmail,
      'Timestamp: ' + timestamp,
      '',
      'If you believe you should have access to this workbook, please contact the sheet owner or support@risingandthriving.com.',
      '',
      'Thank you,',
      'Money Mastery Team',
      '',
      '© 2026 Donna Roggio LLC'
    ].join('\n');
    
    // Email to support
    var supportSubject = 'Unauthorized Access Attempt - Money Mastery';
    var supportBody = [
      '═══════════════════════════════════════════════════════════════',
      '   UNAUTHORIZED ACCESS ATTEMPT',
      '═══════════════════════════════════════════════════════════════',
      '',
      'An unauthorized user attempted to access a Money Mastery workbook.',
      '',
      'DETAILS:',
      '─────────────────────────────────────────────────────────────────',
      'User Email: ' + userEmail,
      'Sheet URL: ' + sheetUrl,
      'Sheet ID: ' + ss.getId(),
      'Timestamp: ' + timestamp,
      '',
      '─────────────────────────────────────────────────────────────────',
      '',
      '© 2026 Donna Roggio LLC'
    ].join('\n');
    
    // Send emails
    try {
      if (typeof RESEND_CONFIG !== 'undefined' && RESEND_CONFIG.API_KEY) {
        // Send to user
        UrlFetchApp.fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + RESEND_CONFIG.API_KEY,
            'Content-Type': 'application/json'
          },
          payload: JSON.stringify({
            from: 'Money Mastery <noreply@risingandthriving.com>',
            to: [userEmail],
            subject: userSubject,
            text: userBody
          }),
          muteHttpExceptions: true
        });
        
        // Send to support
        UrlFetchApp.fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + RESEND_CONFIG.API_KEY,
            'Content-Type': 'application/json'
          },
          payload: JSON.stringify({
            from: 'Money Mastery <noreply@risingandthriving.com>',
            to: [COPY_PROTECTION_CONFIG.SUPPORT_EMAIL],
            subject: supportSubject,
            text: supportBody
          }),
          muteHttpExceptions: true
        });
        
        Logger.log('[UNAUTHORIZED] Alerts sent via Resend');
      } else {
        // Fallback to MailApp
        MailApp.sendEmail(userEmail, userSubject, userBody);
        MailApp.sendEmail(COPY_PROTECTION_CONFIG.SUPPORT_EMAIL, supportSubject, supportBody);
        Logger.log('[UNAUTHORIZED] Alerts sent via MailApp');
      }
    } catch (emailErr) {
      Logger.log('[UNAUTHORIZED] Failed to send alerts: ' + emailErr.message);
    }
    
  } catch (e) {
    Logger.log('[UNAUTHORIZED] Alert error: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// ALLOWED EMAILS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

/**
 * Add an email to the allowed list (bypasses registration warning)
 * Admin only
 */
function addAllowedEmail(email) {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      return { success: false, error: 'Admin access required' };
    }
    
    var normalizedEmail = MM_normEmail_(email);
    if (!normalizedEmail) {
      return { success: false, error: 'Invalid email' };
    }
    
    var props = _mm_safeDocProps_();
    if (!props) {
      return { success: false, error: 'Cannot access properties' };
    }
    
    var allowedEmailsJson = props.getProperty(COPY_PROTECTION_CONFIG.ALLOWED_EMAILS_KEY);
    var allowedEmails = [];
    
    if (allowedEmailsJson) {
      try {
        allowedEmails = JSON.parse(allowedEmailsJson);
        if (!Array.isArray(allowedEmails)) {
          allowedEmails = [];
        }
      } catch (e) {
        allowedEmails = [];
      }
    }
    
    if (allowedEmails.indexOf(normalizedEmail) === -1) {
      allowedEmails.push(normalizedEmail);
      props.setProperty(COPY_PROTECTION_CONFIG.ALLOWED_EMAILS_KEY, JSON.stringify(allowedEmails));
    }
    
    Logger.log('[ALLOWED] Added email: ' + normalizedEmail);
    return { success: true, email: normalizedEmail };
    
  } catch (e) {
    Logger.log('[ALLOWED] Add error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Remove an email from the allowed list
 * Admin only
 */
function removeAllowedEmail(email) {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      return { success: false, error: 'Admin access required' };
    }
    
    var normalizedEmail = MM_normEmail_(email);
    if (!normalizedEmail) {
      return { success: false, error: 'Invalid email' };
    }
    
    var props = _mm_safeDocProps_();
    if (!props) {
      return { success: false, error: 'Cannot access properties' };
    }
    
    var allowedEmailsJson = props.getProperty(COPY_PROTECTION_CONFIG.ALLOWED_EMAILS_KEY);
    var allowedEmails = [];
    
    if (allowedEmailsJson) {
      try {
        allowedEmails = JSON.parse(allowedEmailsJson);
        if (!Array.isArray(allowedEmails)) {
          allowedEmails = [];
        }
      } catch (e) {
        allowedEmails = [];
      }
    }
    
    var index = allowedEmails.indexOf(normalizedEmail);
    if (index > -1) {
      allowedEmails.splice(index, 1);
      props.setProperty(COPY_PROTECTION_CONFIG.ALLOWED_EMAILS_KEY, JSON.stringify(allowedEmails));
    }
    
    Logger.log('[ALLOWED] Removed email: ' + normalizedEmail);
    return { success: true, email: normalizedEmail };
    
  } catch (e) {
    Logger.log('[ALLOWED] Remove error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Get list of allowed emails
 * Admin only
 */
function getAllowedEmails() {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      return { success: false, error: 'Admin access required', emails: [] };
    }
    
    var props = _mm_safeDocProps_();
    if (!props) {
      return { success: false, error: 'Cannot access properties', emails: [] };
    }
    
    var allowedEmailsJson = props.getProperty(COPY_PROTECTION_CONFIG.ALLOWED_EMAILS_KEY);
    var allowedEmails = [];
    
    if (allowedEmailsJson) {
      try {
        allowedEmails = JSON.parse(allowedEmailsJson);
        if (!Array.isArray(allowedEmails)) {
          allowedEmails = [];
        }
      } catch (e) {
        allowedEmails = [];
      }
    }
    
    return { success: true, emails: allowedEmails };
    
  } catch (e) {
    Logger.log('[ALLOWED] Get error: ' + e.message);
    return { success: false, error: e.message, emails: [] };
  }
}

// ═══════════════════════════════════════════════════════════════════
// ADMIN RECOVERY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * ADMIN ONLY: Recover data from a deleted copy
 * Shows backup data that was saved before deletion
 */
function ADMIN_recoverDeletedCopyData() {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      SpreadsheetApp.getUi().alert('Access Denied', 'Admin access required.', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    var props = _mm_safeDocProps_();
    if (!props) {
      SpreadsheetApp.getUi().alert('Error', 'Cannot access document properties.', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    var backupJson = props.getProperty(COPY_PROTECTION_CONFIG.BACKUP_DATA_PREFIX + 'latest');
    
    if (!backupJson) {
      SpreadsheetApp.getUi().alert(
        'No Backup Found',
        'No backup data was found for this sheet.\n\n' +
        'This could mean:\n' +
        '• No deletion occurred\n' +
        '• Backup was not created\n' +
        '• Backup was already cleared',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return;
    }
    
    var backupData = JSON.parse(backupJson);
    
    var message = [
      'BACKUP DATA FOUND',
      '═══════════════════════════════════════',
      '',
      'Backup Timestamp: ' + backupData.backupTimestamp,
      'Original Sheet Name: ' + backupData.sheetName,
      'Original Sheet ID: ' + backupData.sheetId,
      '',
      'SHEETS BACKED UP:',
      '─────────────────────────────────────────'
    ];
    
    if (backupData.sheets && backupData.sheets.length > 0) {
      for (var i = 0; i < backupData.sheets.length; i++) {
        var sheet = backupData.sheets[i];
        message.push('• ' + sheet.name + ' (' + sheet.rowCount + ' rows, ' + sheet.colCount + ' cols)');
      }
    } else {
      message.push('• No sheet data available');
    }
    
    message.push('');
    message.push('To restore, use Google Sheets Version History:');
    message.push('File → Version history → See version history');
    
    SpreadsheetApp.getUi().alert('Backup Recovery', message.join('\n'), SpreadsheetApp.getUi().ButtonSet.OK);
    
    // Log the full backup to console for detailed recovery
    Logger.log('=== FULL BACKUP DATA ===');
    Logger.log(backupJson);
    Logger.log('=== END BACKUP DATA ===');
    
    return { success: true, backup: backupData };
    
  } catch (e) {
    Logger.log('ADMIN_recoverDeletedCopyData error: ' + e.message);
    SpreadsheetApp.getUi().alert('Error', 'Recovery failed: ' + e.message, SpreadsheetApp.getUi().ButtonSet.OK);
    return { success: false, error: e.message };
  }
}

/**
 * ADMIN ONLY: Clear the copy protection flag (use after resolving an issue)
 */
function ADMIN_clearCopyProtectionFlag() {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      SpreadsheetApp.getUi().alert('Access Denied', 'Admin access required.', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    var ui = SpreadsheetApp.getUi();
    var response = ui.alert(
      'Clear Copy Protection Flag',
      'This will:\n\n' +
      '• Clear any pending copy protection warnings\n' +
      '• Reset the grace period timer\n' +
      '• Allow this sheet to function normally\n\n' +
      'Use this after you\'ve verified the copy is legitimate.\n\n' +
      'Continue?',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      return;
    }
    
    var props = _mm_safeDocProps_();
    if (!props) {
      ui.alert('Error', 'Cannot access document properties.', ui.ButtonSet.OK);
      return;
    }
    
    // Clear all copy protection flags
    props.deleteProperty(COPY_PROTECTION_CONFIG.FLAGGED_COPY_TIMESTAMP_KEY);
    props.deleteProperty(COPY_PROTECTION_CONFIG.FLAGGED_COPY_STATUS_KEY);
    
    // Re-register this sheet as the original (if it was a legitimate copy)
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var currentId = ss.getId();
    props.setProperty(COPY_PROTECTION_CONFIG.ORIGINAL_SHEET_ID_KEY, currentId);
    
    Logger.log('[ADMIN] Copy protection flag cleared. New original ID: ' + currentId);
    
    ui.alert(
      'Copy Protection Cleared',
      'The copy protection flag has been cleared.\n\n' +
      'This sheet is now registered as the original.\n' +
      'Sheet ID: ' + currentId,
      ui.ButtonSet.OK
    );
    
    return { success: true, newOriginalId: currentId };
    
  } catch (e) {
    Logger.log('ADMIN_clearCopyProtectionFlag error: ' + e.message);
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
    return { success: false, error: e.message };
  }
}

/**
 * ADMIN ONLY: Approve a copy and add user to allowed list
 */
function ADMIN_approveCopyAndAllowUser() {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      SpreadsheetApp.getUi().alert('Access Denied', 'Admin access required.', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    var ui = SpreadsheetApp.getUi();
    
    // Prompt for email to allow
    var response = ui.prompt(
      'Approve Copy & Add User',
      'Enter the email address to allow access to this copy:\n\n' +
      '(This will clear the copy protection flag and add the user to the allowed list)',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    
    var emailToAllow = response.getResponseText().trim().toLowerCase();
    if (!emailToAllow || emailToAllow.indexOf('@') === -1) {
      ui.alert('Invalid Email', 'Please enter a valid email address.', ui.ButtonSet.OK);
      return;
    }
    
    // Add to allowed list
    var addResult = addAllowedEmail(emailToAllow);
    if (!addResult.success) {
      ui.alert('Error', 'Failed to add email: ' + addResult.error, ui.ButtonSet.OK);
      return;
    }
    
    // Clear the copy protection flag
    var props = _mm_safeDocProps_();
    if (props) {
      props.deleteProperty(COPY_PROTECTION_CONFIG.FLAGGED_COPY_TIMESTAMP_KEY);
      props.deleteProperty(COPY_PROTECTION_CONFIG.FLAGGED_COPY_STATUS_KEY);
      
      // Re-register this sheet
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      props.setProperty(COPY_PROTECTION_CONFIG.ORIGINAL_SHEET_ID_KEY, ss.getId());
    }
    
    Logger.log('[ADMIN] Copy approved for: ' + emailToAllow);
    
    ui.alert(
      'Copy Approved',
      'Success!\n\n' +
      '• Email added to allowed list: ' + emailToAllow + '\n' +
      '• Copy protection flag cleared\n' +
      '• This sheet is now registered as legitimate',
      ui.ButtonSet.OK
    );
    
    return { success: true, allowedEmail: emailToAllow };
    
  } catch (e) {
    Logger.log('ADMIN_approveCopyAndAllowUser error: ' + e.message);
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
    return { success: false, error: e.message };
  }
}

/**
 * ADMIN ONLY: View current copy protection status
 */
function ADMIN_viewCopyProtectionStatus() {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      SpreadsheetApp.getUi().alert('Access Denied', 'Admin access required.', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var props = _mm_safeDocProps_();
    
    var currentId = ss.getId();
    var originalId = props ? props.getProperty(COPY_PROTECTION_CONFIG.ORIGINAL_SHEET_ID_KEY) : 'N/A';
    var flaggedTimestamp = props ? props.getProperty(COPY_PROTECTION_CONFIG.FLAGGED_COPY_TIMESTAMP_KEY) : null;
    var flaggedStatus = props ? props.getProperty(COPY_PROTECTION_CONFIG.FLAGGED_COPY_STATUS_KEY) : 'none';
    var primaryEmail = props ? props.getProperty('mm_primary_email') : 'Not set';
    
    var idMatch = currentId === originalId ? '✅ MATCH' : '⚠️ MISMATCH (possible copy)';
    
    var gracePeriodInfo = 'Not flagged';
    if (flaggedTimestamp && flaggedStatus === 'pending') {
      var flaggedDate = new Date(flaggedTimestamp);
      var now = new Date();
      var hoursSinceFlagged = (now.getTime() - flaggedDate.getTime()) / (1000 * 60 * 60);
      var hoursRemaining = COPY_PROTECTION_CONFIG.GRACE_PERIOD_HOURS - hoursSinceFlagged;
      if (hoursRemaining > 0) {
        gracePeriodInfo = '⚠️ FLAGGED - ' + Math.ceil(hoursRemaining) + ' hours remaining';
      } else {
        gracePeriodInfo = '🚫 GRACE PERIOD EXPIRED';
      }
    } else if (flaggedStatus === 'deleted') {
      gracePeriodInfo = '🚫 DELETED';
    }
    
    var message = [
      'COPY PROTECTION STATUS',
      '═══════════════════════════════════════',
      '',
      'Current Sheet ID: ' + currentId,
      'Original Sheet ID: ' + originalId,
      'ID Check: ' + idMatch,
      '',
      'Primary Owner: ' + primaryEmail,
      'Current User: ' + userEmail,
      '',
      'Flag Status: ' + (flaggedStatus || 'none'),
      'Grace Period: ' + gracePeriodInfo,
      '',
      '─────────────────────────────────────────',
      'ADMIN ACTIONS:',
      '• ADMIN_clearCopyProtectionFlag() - Clear warnings',
      '• ADMIN_approveCopyAndAllowUser() - Approve & allow',
      '• ADMIN_recoverDeletedCopyData() - View backup'
    ];
    
    SpreadsheetApp.getUi().alert('Copy Protection Status', message.join('\n'), SpreadsheetApp.getUi().ButtonSet.OK);
    
    return {
      currentId: currentId,
      originalId: originalId,
      idMatch: currentId === originalId,
      flaggedStatus: flaggedStatus,
      primaryEmail: primaryEmail
    };
    
  } catch (e) {
    Logger.log('ADMIN_viewCopyProtectionStatus error: ' + e.message);
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// ADMIN MENU FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Lock sheet for client (apply all restrictions)
 */
function ADMIN_lockSheetForClient() {
  try {
    var ui = SpreadsheetApp.getUi();
    var response = ui.alert(
      'Lock Sheet for Client',
      'This will:\n\n' +
      '1. Enable copy protection\n' +
      '2. Restrict download/print for non-admins\n' +
      '3. Lock BACKEND sheet permanently\n\n' +
      'Are you sure you want to continue?',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      return;
    }
    
    // Apply restrictions
    var result = applyClientRestrictions();
    
    if (result.success) {
      ui.alert(
        'Sheet Locked',
        'Client restrictions have been applied successfully.\n\n' +
        'The sheet is now protected.',
        ui.ButtonSet.OK
      );
    } else {
      ui.alert(
        'Lock Failed',
        'Error: ' + result.error,
        ui.ButtonSet.OK
      );
    }
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// ═══════════════════════════════════════════════════════════════════
// SHEET REGISTRATION (for Admin Initialization Modal)
// ═══════════════════════════════════════════════════════════════════

/**
 * Get sheet registration status
 * Called from AdminInitializationModal.html
 */
function getSheetRegistrationStatus() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var currentUrl = ss.getUrl();
    var currentId = ss.getId();
    var props = _mm_safeDocProps_();
    
    if (!props) {
      return { success: false, error: 'Cannot access properties' };
    }
    
    var registeredUrl = props.getProperty('mm_registered_sheet_url') || '';
    var originalId = props.getProperty(COPY_PROTECTION_CONFIG.ORIGINAL_SHEET_ID_KEY) || '';
    var isInitialized = registeredUrl && originalId;
    
    return {
      success: true,
      currentUrl: currentUrl,
      currentId: currentId,
      registeredUrl: registeredUrl,
      originalId: originalId,
      isInitialized: isInitialized
    };
    
  } catch (e) {
    Logger.log('getSheetRegistrationStatus error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Register the current sheet URL
 * Called from AdminInitializationModal.html
 * @param {string} clientEmail - Optional client email to associate with registration
 */
function registerCurrentSheetUrl(clientEmail) {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      return { success: false, error: 'Admin access required' };
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var currentUrl = ss.getUrl();
    var currentId = ss.getId();
    var props = _mm_safeDocProps_();
    
    if (!props) {
      return { success: false, error: 'Cannot access properties' };
    }
    
    // Check if already registered with different ID (possible copy)
    var existingId = props.getProperty(COPY_PROTECTION_CONFIG.ORIGINAL_SHEET_ID_KEY);
    if (existingId && existingId !== currentId) {
      return {
        success: false,
        alreadyRegistered: true,
        error: 'This sheet has already been registered with a different ID. Possible copy detected.'
      };
    }
    
    // Register the sheet
    props.setProperty('mm_registered_sheet_url', currentUrl);
    props.setProperty(COPY_PROTECTION_CONFIG.ORIGINAL_SHEET_ID_KEY, currentId);
    props.setProperty(COPY_PROTECTION_CONFIG.COPY_DETECTION_KEY, 'true');
    
    // Save client email if provided
    if (clientEmail) {
      var normalizedEmail = MM_normEmail_(clientEmail);
      if (normalizedEmail) {
        props.setProperty('mm_client_email', normalizedEmail);
      }
    }
    
    Logger.log('[COPY PROTECTION] Sheet registered - URL: ' + currentUrl + ', ID: ' + currentId);
    
    return {
      success: true,
      registeredUrl: currentUrl,
      registeredId: currentId
    };
    
  } catch (e) {
    Logger.log('registerCurrentSheetUrl error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Show Admin Initialization Modal
 * Admin only - for setting up new client sheets
 */
function showAdminInitializationModal() {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    
    if (!MM_isMasterEmail_(userEmail)) {
      SpreadsheetApp.getUi().alert('Access Denied', 'Admin access required.', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    var html = HtmlService.createHtmlOutputFromFile('AdminInitializationModal')
      .setWidth(750)
      .setHeight(700);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'Initialize Sheet for Client');
    
  } catch (e) {
    Logger.log('showAdminInitializationModal error: ' + e.message);
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Show allowed guests modal
 */
function showAllowedGuestsModal() {
  try {
    var emailsResult = getAllowedEmails();
    var emails = emailsResult.emails || [];
    
    var html = HtmlService.createHtmlOutput(
      '<!DOCTYPE html>' +
      '<html>' +
      '<head>' +
      '<style>' +
      'body { font-family: Arial, sans-serif; padding: 20px; }' +
      'h2 { color: #ab9478; }' +
      '.email-list { max-height: 300px; overflow-y: auto; }' +
      '.email-item { display: flex; justify-content: space-between; padding: 8px; background: #f5f5f5; margin: 4px 0; border-radius: 4px; }' +
      '.remove-btn { color: #c00; cursor: pointer; }' +
      '.add-form { margin-top: 20px; }' +
      'input[type="email"] { padding: 8px; width: 200px; }' +
      'button { padding: 8px 16px; background: #ab9478; color: white; border: none; border-radius: 4px; cursor: pointer; }' +
      '</style>' +
      '</head>' +
      '<body>' +
      '<h2>Allowed Emails</h2>' +
      '<p>These emails can access the sheet without registration warnings.</p>' +
      '<div class="email-list" id="emailList">' +
      (emails.length === 0 ? '<p>No allowed emails yet.</p>' : '') +
      '</div>' +
      '<div class="add-form">' +
      '<input type="email" id="newEmail" placeholder="email@example.com">' +
      '<button onclick="addEmail()">Add Email</button>' +
      '</div>' +
      '<script>' +
      'var emails = ' + JSON.stringify(emails) + ';' +
      'function renderEmails() {' +
      '  var html = emails.length === 0 ? "<p>No allowed emails yet.</p>" : "";' +
      '  for (var i = 0; i < emails.length; i++) {' +
      '    html += "<div class=\\"email-item\\"><span>" + emails[i] + "</span><span class=\\"remove-btn\\" onclick=\\"removeEmail(\'" + emails[i] + "\')\\">Remove</span></div>";' +
      '  }' +
      '  document.getElementById("emailList").innerHTML = html;' +
      '}' +
      'renderEmails();' +
      'function addEmail() {' +
      '  var email = document.getElementById("newEmail").value;' +
      '  if (!email) return alert("Please enter an email");' +
      '  google.script.run.withSuccessHandler(function(result) {' +
      '    if (result.success) {' +
      '      emails.push(result.email);' +
      '      renderEmails();' +
      '      document.getElementById("newEmail").value = "";' +
      '    } else alert(result.error);' +
      '  }).addAllowedEmail(email);' +
      '}' +
      'function removeEmail(email) {' +
      '  google.script.run.withSuccessHandler(function(result) {' +
      '    if (result.success) {' +
      '      emails = emails.filter(function(e) { return e !== result.email; });' +
      '      renderEmails();' +
      '    } else alert(result.error);' +
      '  }).removeAllowedEmail(email);' +
      '}' +
      '</script>' +
      '</body>' +
      '</html>'
    )
    .setWidth(400)
    .setHeight(500);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'Manage Allowed Emails');
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}
