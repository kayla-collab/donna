/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * REMOTE ADMIN CONTROL SYSTEM
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * FEATURES:
 * 1. Flagged column monitoring - check if user is flagged in NEW SHEET LOG
 * 2. Continuous tab close - repeatedly close all tabs when flagged
 * 3. Contact support modal - show modal until contact is made
 * 4. Auto-disable sheets when flagged
 * 5. Email alerts to support when flagged user attempts access
 * 
 * NEW SHEET LOG STRUCTURE (ACCESS KEYS sheet):
 * Column A: FLAGGED USER? (checkbox)
 * Column E: Email Address
 * Column H: Personal Sheet Link
 */

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

var REMOTE_CONTROL_CONFIG = {
  // Master sheet - NOW USES NEW MASTER HUB
  // DEPRECATED: Most functions now use MasterHub.gs via Web App
  MASTER_SHEET_ID: '11MhJFe4xmSMBLPUXxePtq-yB2YsuhsScY1H7Dc4zwMI',  // NEW MASTER HUB
  ACCESS_KEYS_SHEET_NAME: 'CLIENT MANAGEMENT',  // Updated sheet name
  
  // Column mappings for NEW MASTER HUB CLIENT MANAGEMENT (1-indexed)
  // See MasterHub.gs for full column mapping
  COLUMNS: {
    EMAIL: 1,             // Column A - Main Client Email
    ACCESS_KEY: 2,        // Column B - Client Access Code
    FIRST_NAME: 3,        // Column C
    LAST_NAME: 4,         // Column D
    DATE_REGISTERED: 5,   // Column E
    PERSONAL_SHEET: 6,    // Column F - Personal sheet ID
    BUSINESS_SHEET_1: 7,  // Column G
    BUSINESS_SHEET_2: 8,  // Column H
    BUSINESS_SHEET_3: 9,  // Column I
    COPY_KEY_PERSONAL: 10,// Column J
    COPY_KEY_BUSINESS: 11,// Column K
    DISABLE_USAGE: 12     // Column L - Replaces FLAGGED
  },
  
  // Local storage keys
  STORED_SHEET_URL_KEY: 'mm_registered_sheet_url',
  STORED_SHEET_ID_KEY: 'mm_registered_sheet_id',
  FLAGGED_STATUS_KEY: 'mm_flagged_status',
  LAST_FLAG_CHECK_KEY: 'mm_last_flag_check',
  
  // Timing
  FLAG_CHECK_INTERVAL_MS: 30000,  // Check every 30 seconds when flagged
  CLOSE_TABS_DELAY_MS: 2000,      // Delay between tab close attempts
  
  // Support email
  SUPPORT_EMAIL: 'support@risingandthriving.com'
};

// ═══════════════════════════════════════════════════════════════════
// FLAGGED STATUS CHECKING
// ═══════════════════════════════════════════════════════════════════

/**
 * Check if the current sheet/user is flagged in NEW SHEET LOG
 * Called during onOpen
 * @returns {Object} { flagged: boolean, reason: string, userData: Object }
 */
function checkFlaggedStatus() {
  try {
    var props = _mm_safeDocProps_();
    if (!props) {
      Logger.log('[REMOTE CONTROL] Cannot access document properties');
      return { flagged: false, reason: 'no_props' };
    }
    
    // Get stored sheet URL/ID
    var storedSheetUrl = props.getProperty(REMOTE_CONTROL_CONFIG.STORED_SHEET_URL_KEY);
    var storedSheetId = props.getProperty(REMOTE_CONTROL_CONFIG.STORED_SHEET_ID_KEY);
    
    // Get client email
    var clientEmail = props.getProperty('mm_client_email') || 
                      props.getProperty('mm_primary_email') || '';
    
    if (!storedSheetUrl && !clientEmail) {
      Logger.log('[REMOTE CONTROL] No sheet URL or client email configured');
      return { flagged: false, reason: 'not_configured' };
    }
    
    // Check NEW SHEET LOG
    var result = checkFlaggedInMasterSheet_(storedSheetUrl, clientEmail);
    
    // Store result locally for quick access
    props.setProperty(REMOTE_CONTROL_CONFIG.FLAGGED_STATUS_KEY, JSON.stringify(result));
    props.setProperty(REMOTE_CONTROL_CONFIG.LAST_FLAG_CHECK_KEY, new Date().toISOString());
    
    return result;
    
  } catch (e) {
    Logger.log('[REMOTE CONTROL] checkFlaggedStatus error: ' + e.message);
    return { flagged: false, reason: 'error', error: e.message };
  }
}

/**
 * Check flagged status in the master NEW SHEET LOG
 * UPDATED: Now uses MASTER HUB CLIENT MANAGEMENT with Disable Usage column
 * @private
 */
function checkFlaggedInMasterSheet_(sheetUrl, clientEmail) {
  try {
    // ═════════════════════════════════════════════════════════════════
    // TRY MASTER HUB FIRST (via Web App if available)
    // ═════════════════════════════════════════════════════════════════
    if (typeof MH_isClientDisabled === 'function' && clientEmail) {
      try {
        var isDisabled = MH_isClientDisabled(clientEmail);
        if (isDisabled) {
          Logger.log('[REMOTE CONTROL] Client disabled via MASTER HUB: ' + clientEmail);
          return {
            flagged: true,
            reason: 'disabled_in_master_hub',
            userData: { email: clientEmail }
          };
        }
        // Not disabled - return early with success
        return { flagged: false, reason: 'checked_master_hub' };
      } catch (hubError) {
        Logger.log('[REMOTE CONTROL] MasterHub check failed, trying direct access: ' + hubError.message);
      }
    }
    
    // ═════════════════════════════════════════════════════════════════
    // FALLBACK: Direct sheet access (requires permissions)
    // ═════════════════════════════════════════════════════════════════
    var masterSheet;
    try {
      masterSheet = SpreadsheetApp.openById(REMOTE_CONTROL_CONFIG.MASTER_SHEET_ID);
    } catch (permError) {
      // Permission error is expected for regular users - this is not an error
      Logger.log('[REMOTE CONTROL] Cannot access MASTER HUB directly (expected for non-admins)');
      // Check local cache instead
      var props = _mm_safeDocProps_();
      var cachedStatus = props.getProperty(REMOTE_CONTROL_CONFIG.FLAGGED_STATUS_KEY);
      if (cachedStatus) {
        try {
          var cached = JSON.parse(cachedStatus);
          Logger.log('[REMOTE CONTROL] Using cached flagged status');
          return cached;
        } catch (e) {}
      }
      return { flagged: false, reason: 'no_direct_access' };
    }
    
    var accessKeysSheet = masterSheet.getSheetByName(REMOTE_CONTROL_CONFIG.ACCESS_KEYS_SHEET_NAME);
    
    if (!accessKeysSheet) {
      Logger.log('[REMOTE CONTROL] CLIENT MANAGEMENT sheet not found');
      return { flagged: false, reason: 'sheet_not_found' };
    }
    
    // Get all data (skip header row)
    var lastRow = accessKeysSheet.getLastRow();
    if (lastRow < 2) {
      return { flagged: false, reason: 'no_data' };
    }
    
    var rowsToRead = Math.min(lastRow - 1, 1000); // Limit rows
    var data = accessKeysSheet.getRange(2, 1, rowsToRead, 12).getValues();
    var normalizedClientEmail = MM_normEmail_(clientEmail);
    var normalizedSheetUrl = (sheetUrl || '').toLowerCase().trim();
    
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      // NEW MASTER HUB column mapping:
      // A=Email(0), B=AccessCode(1), C=First(2), D=Last(3), E=DateReg(4), F=PersonalSheet(5), L=Disabled(11)
      var rowEmail = MM_normEmail_(row[0] || '');  // Column A - Email
      var rowSheetId = String(row[5] || '').toLowerCase().trim();  // Column F - Personal Sheet ID
      var isDisabled = row[11] === true || 
                       String(row[11]).toUpperCase() === 'TRUE';  // Column L - Disable Usage
      
      // Match by email or sheet ID
      var emailMatch = normalizedClientEmail && rowEmail === normalizedClientEmail;
      var sheetMatch = normalizedSheetUrl && rowSheetId && 
                       (normalizedSheetUrl.indexOf(rowSheetId) !== -1 || 
                        rowSheetId.indexOf(normalizedSheetUrl) !== -1);
      
      if (emailMatch || sheetMatch) {
        if (isDisabled) {
          Logger.log('[REMOTE CONTROL] USER IS DISABLED - Email: ' + rowEmail);
          return {
            flagged: true,
            reason: 'user_disabled',
            userData: {
              email: rowEmail,
              firstName: row[2],  // Column C
              lastName: row[3],   // Column D
              sheetId: rowSheetId
            }
          };
        } else {
          return {
            flagged: false,
            reason: 'user_not_flagged',
            userData: {
              email: rowEmail,
              firstName: row[REMOTE_CONTROL_CONFIG.COLUMNS.FIRST_NAME - 1],
              lastName: row[REMOTE_CONTROL_CONFIG.COLUMNS.LAST_NAME - 1]
            }
          };
        }
      }
    }
    
    return { flagged: false, reason: 'user_not_found' };
    
  } catch (e) {
    Logger.log('[REMOTE CONTROL] checkFlaggedInMasterSheet_ error: ' + e.message);
    return { flagged: false, reason: 'error', error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// FLAGGED USER HANDLING
// ═══════════════════════════════════════════════════════════════════

/**
 * Handle a flagged user - show contact modal and close all tabs
 * Called when flagged status is detected
 */
function handleFlaggedUser(flaggedData) {
  try {
    Logger.log('[REMOTE CONTROL] Handling flagged user');
    
    // Send alert to support
    sendFlaggedUserAlert_(flaggedData);
    
    // Show the contact support modal
    showContactSupportModal_(flaggedData);
    
    // Close all sheets
    closeAllSheetsForFlaggedUser_();
    
    // Set up continuous close trigger
    setupContinuousCloseTriggger_();
    
  } catch (e) {
    Logger.log('[REMOTE CONTROL] handleFlaggedUser error: ' + e.message);
  }
}

/**
 * Show the "Contact Support" modal for flagged users
 * @private
 */
function showContactSupportModal_(flaggedData) {
  try {
    var userData = flaggedData.userData || {};
    var userName = (userData.firstName || '') + ' ' + (userData.lastName || '');
    userName = userName.trim() || 'User';
    
    var html = HtmlService.createHtmlOutput(
      '<!DOCTYPE html>' +
      '<html>' +
      '<head>' +
      '<style>' +
      'body { font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #f5f5f5; }' +
      '.container { background: white; padding: 40px; border-radius: 12px; max-width: 500px; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }' +
      '.icon { font-size: 60px; color: #dc3545; margin-bottom: 20px; }' +
      'h1 { color: #333; font-size: 24px; margin-bottom: 15px; }' +
      'p { color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 20px; }' +
      '.support-email { background: #f8f9fa; padding: 15px 25px; border-radius: 8px; font-size: 18px; color: #ab9478; font-weight: bold; display: inline-block; margin: 20px 0; }' +
      '.warning { background: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 14px; }' +
      '</style>' +
      '</head>' +
      '<body>' +
      '<div class="container">' +
      '<div class="icon">&#9888;</div>' +
      '<h1>Account Access Restricted</h1>' +
      '<p>Hello ' + userName + ',</p>' +
      '<p>Your access to this Money Mastery workbook has been temporarily restricted. This may be due to a billing issue or account review.</p>' +
      '<p>Please contact support to resolve this matter:</p>' +
      '<div class="support-email">' + REMOTE_CONTROL_CONFIG.SUPPORT_EMAIL + '</div>' +
      '<div class="warning">' +
      '<strong>Important:</strong> All sheets will remain closed until this issue is resolved. Any attempt to access sheets will be logged.' +
      '</div>' +
      '</div>' +
      '<script>' +
      'setInterval(function() {' +
      '  google.script.run.closeAllSheetsForFlaggedUser_();' +
      '}, ' + REMOTE_CONTROL_CONFIG.CLOSE_TABS_DELAY_MS + ');' +
      '</script>' +
      '</body>' +
      '</html>'
    )
    .setWidth(600)
    .setHeight(550);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'Account Restricted');
    
  } catch (e) {
    Logger.log('[REMOTE CONTROL] showContactSupportModal_ error: ' + e.message);
  }
}

/**
 * Close all sheets for a flagged user
 * @private
 */
function closeAllSheetsForFlaggedUser_() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    
    // Hide all sheets
    for (var i = 0; i < sheets.length; i++) {
      try {
        sheets[i].hideSheet();
      } catch (hideErr) {
        // Some sheets can't be hidden (e.g., only visible sheet)
      }
    }
    
    // Try to show just one blank sheet or START HERE
    var startHere = ss.getSheetByName('START HERE');
    if (startHere) {
      startHere.showSheet();
      ss.setActiveSheet(startHere);
    }
    
    Logger.log('[REMOTE CONTROL] All sheets closed for flagged user');
    
  } catch (e) {
    Logger.log('[REMOTE CONTROL] closeAllSheetsForFlaggedUser_ error: ' + e.message);
  }
}

/**
 * Set up a time-driven trigger to continuously close tabs
 * @private
 */
function setupContinuousCloseTriggger_() {
  try {
    // Remove existing triggers first
    removeContinuousCloseTrigger_();
    
    // Create new trigger - runs every minute
    ScriptApp.newTrigger('continuousCloseCheck_')
      .timeDriven()
      .everyMinutes(1)
      .create();
    
    Logger.log('[REMOTE CONTROL] Continuous close trigger set up');
    
  } catch (e) {
    Logger.log('[REMOTE CONTROL] setupContinuousCloseTriggger_ error: ' + e.message);
  }
}

/**
 * Remove the continuous close trigger
 * @private
 */
function removeContinuousCloseTrigger_() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'continuousCloseCheck_') {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }
  } catch (e) {
    Logger.log('[REMOTE CONTROL] removeContinuousCloseTrigger_ error: ' + e.message);
  }
}

/**
 * Continuous check function - called by time trigger
 * @private
 */
function continuousCloseCheck_() {
  try {
    // Recheck flagged status
    var result = checkFlaggedStatus();
    
    if (result.flagged) {
      // Still flagged - close all sheets
      closeAllSheetsForFlaggedUser_();
      Logger.log('[REMOTE CONTROL] Continuous close: user still flagged');
    } else {
      // No longer flagged - remove trigger
      removeContinuousCloseTrigger_();
      Logger.log('[REMOTE CONTROL] Continuous close: user no longer flagged, trigger removed');
    }
    
  } catch (e) {
    Logger.log('[REMOTE CONTROL] continuousCloseCheck_ error: ' + e.message);
  }
}

/**
 * Send alert to support about flagged user access attempt
 * @private
 */
function sendFlaggedUserAlert_(flaggedData) {
  try {
    var userData = flaggedData.userData || {};
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var timestamp = new Date().toISOString();
    
    var currentUserEmail = '';
    try {
      currentUserEmail = Session.getActiveUser().getEmail();
    } catch (e) {
      currentUserEmail = 'unknown';
    }
    
    var subject = 'ALERT: Flagged User Access Attempt - Money Mastery';
    
    var body = [
      '═══════════════════════════════════════════════════════════════',
      '   FLAGGED USER ACCESS ATTEMPT',
      '═══════════════════════════════════════════════════════════════',
      '',
      'A flagged user attempted to access their Money Mastery workbook.',
      '',
      'USER DETAILS:',
      '─────────────────────────────────────────────────────────────────',
      'Name: ' + (userData.firstName || '') + ' ' + (userData.lastName || ''),
      'Email: ' + (userData.email || 'unknown'),
      'Subscription: ' + (userData.subscription || 'unknown'),
      'Sheet URL: ' + (userData.sheetUrl || ss.getUrl()),
      'Current User Email: ' + currentUserEmail,
      'Timestamp: ' + timestamp,
      '',
      '─────────────────────────────────────────────────────────────────',
      '',
      'The user has been shown the "Contact Support" modal and all sheets have been closed.',
      '',
      '© 2026 Donna Roggio LLC'
    ].join('\n');
    
    // Try to send via Resend API
    if (typeof RESEND_CONFIG !== 'undefined' && RESEND_CONFIG.API_KEY) {
      UrlFetchApp.fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + RESEND_CONFIG.API_KEY,
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify({
          from: 'Money Mastery <noreply@risingandthriving.com>',
          to: [REMOTE_CONTROL_CONFIG.SUPPORT_EMAIL],
          subject: subject,
          text: body
        }),
        muteHttpExceptions: true
      });
      Logger.log('[REMOTE CONTROL] Flagged user alert sent via Resend');
    } else {
      // Fallback to MailApp
      MailApp.sendEmail(REMOTE_CONTROL_CONFIG.SUPPORT_EMAIL, subject, body);
      Logger.log('[REMOTE CONTROL] Flagged user alert sent via MailApp');
    }
    
  } catch (e) {
    Logger.log('[REMOTE CONTROL] sendFlaggedUserAlert_ error: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// SHEET URL REGISTRATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Register the current sheet URL in the NEW SHEET LOG
 * Called during admin initialization
 * @param {string} sheetUrl - The current sheet URL to register
 * @param {string} clientEmail - The client email
 * @returns {Object} { success: boolean, error?: string, duplicateFound?: boolean }
 */
function registerSheetUrlInMasterLog(sheetUrl, clientEmail) {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      return { success: false, error: 'Admin access required' };
    }
    
    if (!sheetUrl) {
      return { success: false, error: 'Sheet URL is required' };
    }
    
    var normalizedUrl = sheetUrl.toLowerCase().trim();
    var normalizedEmail = MM_normEmail_(clientEmail);
    
    // Open master sheet
    var masterSheet = SpreadsheetApp.openById(REMOTE_CONTROL_CONFIG.MASTER_SHEET_ID);
    var accessKeysSheet = masterSheet.getSheetByName(REMOTE_CONTROL_CONFIG.ACCESS_KEYS_SHEET_NAME);
    
    if (!accessKeysSheet) {
      return { success: false, error: 'ACCESS KEYS sheet not found in master log' };
    }
    
    // Check for duplicates
    var lastRow = accessKeysSheet.getLastRow();
    var duplicateCount = 0;
    var matchingRow = -1;
    
    if (lastRow >= 2) {
      var data = accessKeysSheet.getRange(2, 1, lastRow - 1, 11).getValues();
      
      for (var i = 0; i < data.length; i++) {
        var rowSheetUrl = (data[i][REMOTE_CONTROL_CONFIG.COLUMNS.PERSONAL_SHEET - 1] || '').toLowerCase().trim();
        var rowEmail = MM_normEmail_(data[i][REMOTE_CONTROL_CONFIG.COLUMNS.EMAIL - 1] || '');
        
        // Check for duplicate URL
        if (rowSheetUrl && rowSheetUrl === normalizedUrl) {
          duplicateCount++;
        }
        
        // Find matching row by email (to update)
        if (normalizedEmail && rowEmail === normalizedEmail) {
          matchingRow = i + 2; // +2 for 1-indexed and header row
        }
      }
    }
    
    // If duplicate URL found (more than 1 occurrence), this is a copy
    if (duplicateCount > 0) {
      Logger.log('[REMOTE CONTROL] Duplicate URL found! This may be a copy.');
      return { 
        success: false, 
        error: 'This sheet URL is already registered. Possible unauthorized copy detected.',
        duplicateFound: true,
        duplicateCount: duplicateCount
      };
    }
    
    // Update the row if email matches
    if (matchingRow > 0) {
      accessKeysSheet.getRange(matchingRow, REMOTE_CONTROL_CONFIG.COLUMNS.PERSONAL_SHEET).setValue(sheetUrl);
      Logger.log('[REMOTE CONTROL] Sheet URL registered for existing user at row ' + matchingRow);
    } else {
      Logger.log('[REMOTE CONTROL] No matching email found to update. URL not registered in master.');
      // Note: We don't create new rows here - that's done during purchase/access key creation
    }
    
    // Store locally
    var props = _mm_safeDocProps_();
    if (props) {
      props.setProperty(REMOTE_CONTROL_CONFIG.STORED_SHEET_URL_KEY, sheetUrl);
      
      // Extract and store sheet ID
      var sheetIdMatch = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
      if (sheetIdMatch && sheetIdMatch[1]) {
        props.setProperty(REMOTE_CONTROL_CONFIG.STORED_SHEET_ID_KEY, sheetIdMatch[1]);
      }
    }
    
    return { success: true, matchingRow: matchingRow };
    
  } catch (e) {
    Logger.log('[REMOTE CONTROL] registerSheetUrlInMasterLog error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Check if current sheet URL has duplicates in NEW SHEET LOG
 * This is the COPY DETECTION function
 * @returns {Object} { isDuplicate: boolean, count: number }
 */
function checkForDuplicateSheetUrl() {
  try {
    var props = _mm_safeDocProps_();
    if (!props) {
      return { isDuplicate: false, error: 'no_props' };
    }
    
    var storedUrl = props.getProperty(REMOTE_CONTROL_CONFIG.STORED_SHEET_URL_KEY);
    if (!storedUrl) {
      return { isDuplicate: false, reason: 'no_url_stored' };
    }
    
    var normalizedUrl = storedUrl.toLowerCase().trim();
    
    // Check master sheet
    var masterSheet = SpreadsheetApp.openById(REMOTE_CONTROL_CONFIG.MASTER_SHEET_ID);
    var accessKeysSheet = masterSheet.getSheetByName(REMOTE_CONTROL_CONFIG.ACCESS_KEYS_SHEET_NAME);
    
    if (!accessKeysSheet) {
      return { isDuplicate: false, error: 'sheet_not_found' };
    }
    
    var lastRow = accessKeysSheet.getLastRow();
    if (lastRow < 2) {
      return { isDuplicate: false, count: 0 };
    }
    
    var data = accessKeysSheet.getRange(2, REMOTE_CONTROL_CONFIG.COLUMNS.PERSONAL_SHEET, lastRow - 1, 1).getValues();
    var count = 0;
    
    for (var i = 0; i < data.length; i++) {
      var rowUrl = (data[i][0] || '').toLowerCase().trim();
      if (rowUrl && rowUrl === normalizedUrl) {
        count++;
      }
    }
    
    // If count > 1, there are duplicates (the same URL registered multiple times = copy)
    var isDuplicate = count > 1;
    
    Logger.log('[REMOTE CONTROL] Duplicate check: URL found ' + count + ' times. isDuplicate: ' + isDuplicate);
    
    return { isDuplicate: isDuplicate, count: count };
    
  } catch (e) {
    Logger.log('[REMOTE CONTROL] checkForDuplicateSheetUrl error: ' + e.message);
    return { isDuplicate: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// ADMIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Admin function to flag a user
 * @param {string} email - Email of user to flag
 * @param {boolean} flagged - True to flag, false to unflag
 */
function ADMIN_setUserFlaggedStatus(email, flagged) {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      return { success: false, error: 'Admin access required' };
    }
    
    var normalizedEmail = MM_normEmail_(email);
    if (!normalizedEmail) {
      return { success: false, error: 'Valid email required' };
    }
    
    var masterSheet = SpreadsheetApp.openById(REMOTE_CONTROL_CONFIG.MASTER_SHEET_ID);
    var accessKeysSheet = masterSheet.getSheetByName(REMOTE_CONTROL_CONFIG.ACCESS_KEYS_SHEET_NAME);
    
    if (!accessKeysSheet) {
      return { success: false, error: 'ACCESS KEYS sheet not found' };
    }
    
    var lastRow = accessKeysSheet.getLastRow();
    if (lastRow < 2) {
      return { success: false, error: 'No users found' };
    }
    
    var data = accessKeysSheet.getRange(2, REMOTE_CONTROL_CONFIG.COLUMNS.EMAIL, lastRow - 1, 1).getValues();
    
    for (var i = 0; i < data.length; i++) {
      var rowEmail = MM_normEmail_(data[i][0] || '');
      if (rowEmail === normalizedEmail) {
        var rowNum = i + 2;
        accessKeysSheet.getRange(rowNum, REMOTE_CONTROL_CONFIG.COLUMNS.FLAGGED).setValue(flagged);
        Logger.log('[REMOTE CONTROL] User ' + normalizedEmail + ' flagged status set to: ' + flagged);
        return { success: true, email: normalizedEmail, flagged: flagged };
      }
    }
    
    return { success: false, error: 'User not found: ' + normalizedEmail };
    
  } catch (e) {
    Logger.log('[REMOTE CONTROL] ADMIN_setUserFlaggedStatus error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Admin function to get all flagged users
 */
function ADMIN_getFlaggedUsers() {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      return { success: false, error: 'Admin access required', users: [] };
    }
    
    var masterSheet = SpreadsheetApp.openById(REMOTE_CONTROL_CONFIG.MASTER_SHEET_ID);
    var accessKeysSheet = masterSheet.getSheetByName(REMOTE_CONTROL_CONFIG.ACCESS_KEYS_SHEET_NAME);
    
    if (!accessKeysSheet) {
      return { success: false, error: 'ACCESS KEYS sheet not found', users: [] };
    }
    
    var lastRow = accessKeysSheet.getLastRow();
    if (lastRow < 2) {
      return { success: true, users: [] };
    }
    
    var data = accessKeysSheet.getRange(2, 1, lastRow - 1, 11).getValues();
    var flaggedUsers = [];
    
    for (var i = 0; i < data.length; i++) {
      var isFlagged = data[i][REMOTE_CONTROL_CONFIG.COLUMNS.FLAGGED - 1] === true ||
                      data[i][REMOTE_CONTROL_CONFIG.COLUMNS.FLAGGED - 1] === 'TRUE';
      
      if (isFlagged) {
        flaggedUsers.push({
          email: data[i][REMOTE_CONTROL_CONFIG.COLUMNS.EMAIL - 1],
          firstName: data[i][REMOTE_CONTROL_CONFIG.COLUMNS.FIRST_NAME - 1],
          lastName: data[i][REMOTE_CONTROL_CONFIG.COLUMNS.LAST_NAME - 1],
          subscription: data[i][REMOTE_CONTROL_CONFIG.COLUMNS.SUBSCRIPTION - 1],
          sheetUrl: data[i][REMOTE_CONTROL_CONFIG.COLUMNS.PERSONAL_SHEET - 1]
        });
      }
    }
    
    return { success: true, users: flaggedUsers };
    
  } catch (e) {
    Logger.log('[REMOTE CONTROL] ADMIN_getFlaggedUsers error: ' + e.message);
    return { success: false, error: e.message, users: [] };
  }
}

/**
 * Get remote control status for testing
 */
function getRemoteControlStatus() {
  try {
    var props = _mm_safeDocProps_();
    
    return {
      success: true,
      storedSheetUrl: props ? props.getProperty(REMOTE_CONTROL_CONFIG.STORED_SHEET_URL_KEY) : null,
      storedSheetId: props ? props.getProperty(REMOTE_CONTROL_CONFIG.STORED_SHEET_ID_KEY) : null,
      lastFlagCheck: props ? props.getProperty(REMOTE_CONTROL_CONFIG.LAST_FLAG_CHECK_KEY) : null,
      cachedFlaggedStatus: props ? props.getProperty(REMOTE_CONTROL_CONFIG.FLAGGED_STATUS_KEY) : null,
      currentSheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl(),
      currentSheetId: SpreadsheetApp.getActiveSpreadsheet().getId()
    };
    
  } catch (e) {
    return { success: false, error: e.message };
  }
}
