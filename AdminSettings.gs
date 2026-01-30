/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * ADMIN SETTINGS SYSTEM
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Admin configuration panel for:
 * - Business account linking (up to 3 accounts)
 * - Currency and exchange rate settings
 * - Client email/name configuration
 * - Registration email resending
 * - Sheet protection and finalization
 * - Guest management
 */

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

var ADMIN_SETTINGS_CONFIG = {
  // Storage keys
  CLIENT_EMAIL_KEY: 'mm_client_email',
  CLIENT_NAME_KEY: 'mm_client_name',
  BUSINESS_ACCOUNTS_KEY: 'mm_business_accounts',
  SETUP_FINALIZED_KEY: 'mm_setup_finalized',
  CLOSE_ALL_SHEETS_KEY: 'mm_close_all_sheets_on_setup',
  
  // External master sheet - NOW USES NEW MASTER HUB
  // DEPRECATED: Use MasterHub.gs for guest operations
  GUEST_LOG_SHEET_ID: '11MhJFe4xmSMBLPUXxePtq-yB2YsuhsScY1H7Dc4zwMI',  // NEW MASTER HUB
  GUEST_LOG_SHEET_NAME: 'GUEST MANAGEMENT'  // Updated sheet name
};

// ═══════════════════════════════════════════════════════════════════
// ADMIN SETTINGS MODAL
// ═══════════════════════════════════════════════════════════════════

/**
 * Show the Admin Settings Modal
 * Admin only
 */
function showAdminSettingsModal() {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    
    if (!MM_isMasterEmail_(userEmail)) {
      SpreadsheetApp.getUi().alert('Access Denied', 'Admin access required.', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    var html = HtmlService.createHtmlOutputFromFile('AdminSettingsModal')
      .setWidth(800)
      .setHeight(700);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'Admin Settings Panel');
    
  } catch (e) {
    Logger.log('showAdminSettingsModal error: ' + e.message);
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// ═══════════════════════════════════════════════════════════════════
// CLIENT SETTINGS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get current admin settings
 * Returns all configurable settings for the admin panel
 */
function getAdminSettings() {
  try {
    var props = _mm_safeDocProps_();
    if (!props) {
      throw new Error('Cannot access document properties');
    }
    
    // Get client info
    var clientEmail = props.getProperty(ADMIN_SETTINGS_CONFIG.CLIENT_EMAIL_KEY) || '';
    var clientName = props.getProperty(ADMIN_SETTINGS_CONFIG.CLIENT_NAME_KEY) || '';
    
    // Get business accounts (with conversion rates)
    var businessAccountsJson = props.getProperty(ADMIN_SETTINGS_CONFIG.BUSINESS_ACCOUNTS_KEY);
    var businessAccounts = businessAccountsJson ? JSON.parse(businessAccountsJson) : [];
    
    // Ensure each account has a conversionRate (migrate from old currency format)
    for (var i = 0; i < businessAccounts.length; i++) {
      if (typeof businessAccounts[i].conversionRate !== 'number') {
        businessAccounts[i].conversionRate = 1.0; // Default: no conversion
      }
    }
    
    // Get setup status
    var isFinalized = props.getProperty(ADMIN_SETTINGS_CONFIG.SETUP_FINALIZED_KEY) === 'true';
    var closeAllSheets = props.getProperty(ADMIN_SETTINGS_CONFIG.CLOSE_ALL_SHEETS_KEY) === 'true';
    
    // Get registered status
    var isRegistered = props.getProperty('mm_registered') === 'true';
    var primaryEmail = props.getProperty('mm_primary_email') || '';
    
    return {
      success: true,
      settings: {
        clientEmail: clientEmail,
        clientName: clientName,
        businessAccounts: businessAccounts,
        isFinalized: isFinalized,
        closeAllSheets: closeAllSheets,
        isRegistered: isRegistered,
        primaryEmail: primaryEmail
      }
    };
    
  } catch (e) {
    Logger.log('getAdminSettings error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Save client info (email and name)
 * @param {string} clientEmail - Client's email address
 * @param {string} clientName - Client's display name
 */
function saveClientInfo(clientEmail, clientName) {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      return { success: false, error: 'Admin access required' };
    }
    
    var props = _mm_safeDocProps_();
    if (!props) {
      return { success: false, error: 'Cannot access properties' };
    }
    
    var normalizedEmail = MM_normEmail_(clientEmail);
    var trimmedName = String(clientName || '').trim();
    
    if (!normalizedEmail) {
      return { success: false, error: 'Valid email required' };
    }
    
    props.setProperty(ADMIN_SETTINGS_CONFIG.CLIENT_EMAIL_KEY, normalizedEmail);
    props.setProperty(ADMIN_SETTINGS_CONFIG.CLIENT_NAME_KEY, trimmedName);
    
    Logger.log('[ADMIN] Client info saved: ' + normalizedEmail + ' / ' + trimmedName);
    
    return { success: true, email: normalizedEmail, name: trimmedName };
    
  } catch (e) {
    Logger.log('saveClientInfo error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Set client email for authentication
 * Called from admin menu
 */
function ADMIN_setClientEmail() {
  try {
    var ui = SpreadsheetApp.getUi();
    var emailResponse = ui.prompt(
      'Set Client Email',
      'Enter the client email address for authentication:',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (emailResponse.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    
    var email = emailResponse.getResponseText().trim();
    if (!email) {
      ui.alert('Error', 'Email is required.', ui.ButtonSet.OK);
      return;
    }
    
    var nameResponse = ui.prompt(
      'Set Client Name',
      'Enter the client name (optional):',
      ui.ButtonSet.OK_CANCEL
    );
    
    var name = '';
    if (nameResponse.getSelectedButton() === ui.Button.OK) {
      name = nameResponse.getResponseText().trim();
    }
    
    var result = saveClientInfo(email, name);
    
    if (result.success) {
      ui.alert('Success', 'Client info saved successfully.', ui.ButtonSet.OK);
    } else {
      ui.alert('Error', result.error, ui.ButtonSet.OK);
    }
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// ═══════════════════════════════════════════════════════════════════
// BUSINESS ACCOUNT LINKING
// ═══════════════════════════════════════════════════════════════════

/**
 * Save business account settings (up to 3 accounts)
 * @param {Array} accounts - Array of business account objects
 *   Each account: { url: string, name: string, conversionRate: number }
 *   conversionRate: multiplier applied to transaction amounts when importing
 *                   (e.g., 1.0 = no change, 0.5 = halve amounts, 2.0 = double amounts)
 */
function saveBusinessAccounts(accounts) {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      return { success: false, error: 'Admin access required' };
    }
    
    if (!Array.isArray(accounts)) {
      return { success: false, error: 'Invalid accounts data' };
    }
    
    var props = _mm_safeDocProps_();
    if (!props) {
      return { success: false, error: 'Cannot access properties' };
    }
    
    // Get existing accounts to check for conversion rate changes
    var existingAccountsJson = props.getProperty(ADMIN_SETTINGS_CONFIG.BUSINESS_ACCOUNTS_KEY);
    var existingAccounts = existingAccountsJson ? JSON.parse(existingAccountsJson) : [];
    
    // Validate and limit to 3 accounts
    var validAccounts = [];
    var conversionRateChanged = false;
    
    for (var i = 0; i < Math.min(accounts.length, 3); i++) {
      var acc = accounts[i];
      if (acc && acc.url && typeof acc.url === 'string') {
        // Extract sheet ID from URL
        var sheetId = extractSheetIdFromUrl_(acc.url);
        
        if (sheetId) {
          // Parse conversion rate (default 1.0 = no conversion)
          var conversionRate = parseFloat(acc.conversionRate);
          if (isNaN(conversionRate) || conversionRate <= 0) {
            conversionRate = 1.0;
          }
          
          // Check if conversion rate changed for this account
          var existingAcc = existingAccounts.find(function(e) { return e.sheetId === sheetId; });
          if (existingAcc && existingAcc.conversionRate !== conversionRate) {
            Logger.log('[ADMIN] Conversion rate changed for ' + acc.name + ': ' + 
                       (existingAcc.conversionRate || 1.0) + ' -> ' + conversionRate);
            conversionRateChanged = true;
          }
          
          validAccounts.push({
            url: acc.url,
            sheetId: sheetId,
            name: String(acc.name || 'Business Account ' + (i + 1)).trim(),
            conversionRate: conversionRate
          });
        }
      }
    }
    
    // If conversion rate changed, clear existing synced transactions
    if (conversionRateChanged) {
      Logger.log('[ADMIN] Conversion rate changed - clearing existing synced transactions...');
      try {
        clearSyncedTransactions_();
        Logger.log('[ADMIN] Cleared synced transactions successfully');
      } catch (clearErr) {
        Logger.log('[ADMIN] Error clearing transactions: ' + clearErr.message);
      }
    }
    
    props.setProperty(ADMIN_SETTINGS_CONFIG.BUSINESS_ACCOUNTS_KEY, JSON.stringify(validAccounts));
    
    Logger.log('[ADMIN] Business accounts saved: ' + validAccounts.length + ' accounts');
    
    // Auto-sync when business accounts are saved
    // This ensures fresh data after configuration (and re-syncs if conversion rate changed)
    var syncResult = null;
    if (validAccounts.length > 0) {
      try {
        Logger.log('[ADMIN] Triggering auto-sync after saving business accounts...');
        syncResult = syncAllBusinessData();
        Logger.log('[ADMIN] Auto-sync result: ' + JSON.stringify(syncResult));
      } catch (syncErr) {
        Logger.log('[ADMIN] Auto-sync error (non-fatal): ' + syncErr.message);
      }
    }
    
    return { 
      success: true, 
      accounts: validAccounts,
      syncResult: syncResult,
      conversionRateChanged: conversionRateChanged
    };
    
  } catch (e) {
    Logger.log('saveBusinessAccounts error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Clear synced transactions from BACKEND columns V-AB (Moved From Business section)
 * Called when conversion rate changes to allow re-sync with new rate
 */
function clearSyncedTransactions_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var backendSheet = ss.getSheetByName('BACKEND');
  
  if (!backendSheet) {
    Logger.log('[CLEAR] BACKEND sheet not found');
    return;
  }
  
  // Moved From Business section: columns V-AB (22-28), starting row 3
  var startCol = 22;  // Column V
  var numCols = 7;    // V through AB
  var startRow = 3;
  var lastRow = backendSheet.getLastRow();
  
  if (lastRow >= startRow) {
    var numRows = lastRow - startRow + 1;
    var range = backendSheet.getRange(startRow, startCol, numRows, numCols);
    range.clearContent();
    Logger.log('[CLEAR] Cleared ' + numRows + ' rows in columns V-AB (Moved From Business)');
  }
}

/**
 * Extract Google Sheet ID from URL
 */
function extractSheetIdFromUrl_(url) {
  try {
    // Match patterns like /spreadsheets/d/SHEET_ID/
    var match = String(url).match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return match[1];
    }
    
    // Also check if it's just the ID
    if (/^[a-zA-Z0-9_-]{20,}$/.test(url)) {
      return url;
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Show business linking modal
 */
function showBusinessLinkingModal() {
  showAdminSettingsModal(); // Use the main settings modal
}

// ═══════════════════════════════════════════════════════════════════
// REGISTRATION EMAIL RESENDING
// ═══════════════════════════════════════════════════════════════════

/**
 * Resend registration email to client
 */
function ADMIN_resendRegistration() {
  try {
    var ui = SpreadsheetApp.getUi();
    var props = _mm_safeDocProps_();
    
    if (!props) {
      ui.alert('Error', 'Cannot access properties', ui.ButtonSet.OK);
      return;
    }
    
    var clientEmail = props.getProperty(ADMIN_SETTINGS_CONFIG.CLIENT_EMAIL_KEY) ||
                      props.getProperty('mm_primary_email');
    var clientName = props.getProperty(ADMIN_SETTINGS_CONFIG.CLIENT_NAME_KEY) ||
                     props.getProperty('mm_primary_first_name') || 'Client';
    
    if (!clientEmail) {
      ui.alert('Error', 'No client email configured. Please set client email first.', ui.ButtonSet.OK);
      return;
    }
    
    var response = ui.alert(
      'Resend Registration Email',
      'Send registration email to: ' + clientEmail + '?',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      return;
    }
    
    // Send the email
    if (typeof sendRegistrationWelcomeEmail === 'function') {
      sendRegistrationWelcomeEmail(clientEmail, clientName);
      ui.alert('Success', 'Registration email sent to ' + clientEmail, ui.ButtonSet.OK);
    } else {
      ui.alert('Error', 'Email sending function not available', ui.ButtonSet.OK);
    }
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Resend registration email (called from admin panel)
 * @param {string} email - Email to send to
 * @param {string} name - Name to use in email
 */
function resendRegistrationEmail(email, name) {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      return { success: false, error: 'Admin access required' };
    }
    
    var normalizedEmail = MM_normEmail_(email);
    if (!normalizedEmail) {
      return { success: false, error: 'Valid email required' };
    }
    
    if (typeof sendRegistrationWelcomeEmail === 'function') {
      sendRegistrationWelcomeEmail(normalizedEmail, name || 'Client');
      Logger.log('[ADMIN] Registration email resent to: ' + normalizedEmail);
      return { success: true };
    } else {
      return { success: false, error: 'Email function not available' };
    }
    
  } catch (e) {
    Logger.log('resendRegistrationEmail error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// SETUP FINALIZATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Finalize admin setup
 * This applies all restrictions and locks the sheet for client use
 * @param {Object} options - Setup options
 *   { closeAllSheets: boolean, lockBackend: boolean }
 */
function finalizeAdminSetup(options) {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      return { success: false, error: 'Admin access required' };
    }
    
    options = options || {};
    var closeAllSheets = options.closeAllSheets === true;
    var lockBackend = options.lockBackend !== false; // Default true
    
    var props = _mm_safeDocProps_();
    if (!props) {
      return { success: false, error: 'Cannot access properties' };
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Apply copy protection restrictions
    if (typeof applyClientRestrictions === 'function') {
      applyClientRestrictions();
    }
    
    // 2. Close all sheets except START HERE (if option enabled)
    if (closeAllSheets) {
      var sheets = ss.getSheets();
      var startHereSheet = ss.getSheetByName('START HERE');
      
      for (var i = 0; i < sheets.length; i++) {
        var sheet = sheets[i];
        var sheetName = sheet.getName();
        
        // Keep START HERE visible, hide everything else
        if (sheetName !== 'START HERE') {
          try {
            sheet.hideSheet();
          } catch (hideErr) {
            Logger.log('Could not hide sheet: ' + sheetName);
          }
        }
      }
      
      // Activate START HERE
      if (startHereSheet) {
        ss.setActiveSheet(startHereSheet);
      }
    }
    
    // 3. Lock BACKEND sheet (apply protection)
    if (lockBackend) {
      var backendSheet = ss.getSheetByName('BACKEND');
      if (backendSheet) {
        try {
          // Hide the BACKEND sheet
          backendSheet.hideSheet();
          
          // Apply protection
          var protection = backendSheet.protect().setDescription('BACKEND - Protected');
          protection.setWarningOnly(false);
          
          // Only allow admin emails to edit
          if (MM_CFG && Array.isArray(MM_CFG.MASTER_EMAILS)) {
            var editors = protection.getEditors();
            for (var j = 0; j < editors.length; j++) {
              protection.removeEditor(editors[j]);
            }
            protection.addEditors(MM_CFG.MASTER_EMAILS);
          }
          
          Logger.log('[ADMIN] BACKEND sheet locked and hidden');
        } catch (protectErr) {
          Logger.log('[ADMIN] Could not protect BACKEND: ' + protectErr.message);
        }
      }
    }
    
    // 4. Save finalization status
    props.setProperty(ADMIN_SETTINGS_CONFIG.SETUP_FINALIZED_KEY, 'true');
    props.setProperty(ADMIN_SETTINGS_CONFIG.CLOSE_ALL_SHEETS_KEY, String(closeAllSheets));
    
    Logger.log('[ADMIN] Setup finalized. CloseAllSheets: ' + closeAllSheets + ', LockBackend: ' + lockBackend);
    
    return { 
      success: true, 
      message: 'Setup finalized successfully',
      closeAllSheets: closeAllSheets,
      lockBackend: lockBackend
    };
    
  } catch (e) {
    Logger.log('finalizeAdminSetup error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Reset setup finalization (admin only - for testing)
 */
function ADMIN_resetFinalization() {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      return { success: false, error: 'Admin access required' };
    }
    
    var props = _mm_safeDocProps_();
    if (props) {
      props.deleteProperty(ADMIN_SETTINGS_CONFIG.SETUP_FINALIZED_KEY);
      props.deleteProperty(ADMIN_SETTINGS_CONFIG.CLOSE_ALL_SHEETS_KEY);
    }
    
    // Remove copy restrictions
    if (typeof removeClientRestrictions === 'function') {
      removeClientRestrictions();
    }
    
    // Show all sheets
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      try {
        sheets[i].showSheet();
      } catch (showErr) {}
    }
    
    // Remove BACKEND protection
    var backendSheet = ss.getSheetByName('BACKEND');
    if (backendSheet) {
      var protections = backendSheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
      for (var j = 0; j < protections.length; j++) {
        protections[j].remove();
      }
    }
    
    Logger.log('[ADMIN] Finalization reset');
    return { success: true };
    
  } catch (e) {
    Logger.log('ADMIN_resetFinalization error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// PREPARE SHEET FOR NEW CLIENT
// ═══════════════════════════════════════════════════════════════════

/**
 * Prepare sheet for a new client
 * Resets registration and syncs access keys
 */
function ADMIN_prepareSheetForClient() {
  try {
    var ui = SpreadsheetApp.getUi();
    
    var response = ui.alert(
      'Prepare Sheet for New Client',
      'This will:\n\n' +
      '1. Reset registration status\n' +
      '2. Sync access keys from master sheet\n' +
      '3. Clear previous client data\n\n' +
      'Continue?',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      return;
    }
    
    var props = _mm_safeDocProps_();
    if (!props) {
      ui.alert('Error', 'Cannot access properties', ui.ButtonSet.OK);
      return;
    }
    
    // Reset registration
    props.deleteProperty('mm_registered');
    props.deleteProperty('mm_primary_email');
    props.deleteProperty('mm_primary_first_name');
    props.deleteProperty('mm_primary_last_name');
    props.deleteProperty('mm_tutorial_completed');
    props.deleteProperty('mm_sheet_access_configured');
    props.deleteProperty('mm_is_first_login');
    props.deleteProperty(ADMIN_SETTINGS_CONFIG.CLIENT_EMAIL_KEY);
    props.deleteProperty(ADMIN_SETTINGS_CONFIG.CLIENT_NAME_KEY);
    props.deleteProperty(ADMIN_SETTINGS_CONFIG.SETUP_FINALIZED_KEY);
    
    // Sync access keys
    if (typeof syncAccessKeysToLocal === 'function') {
      syncAccessKeysToLocal(true);
    }
    
    // Show all sheets
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      try {
        sheets[i].showSheet();
      } catch (e) {}
    }
    
    ui.alert(
      'Sheet Prepared',
      'The sheet has been prepared for a new client.\n\n' +
      'Access keys have been synced.\n' +
      'Registration has been reset.',
      ui.ButtonSet.OK
    );
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// ═══════════════════════════════════════════════════════════════════
// BUSINESS DATA SYNC
// ═══════════════════════════════════════════════════════════════════

/**
 * Configuration for business sync columns
 * 
 * BACKEND sheet structure (verified from 2026 Launch Version 1.0.xlsx):
 * Column P (16): "Moved to Business" header - outgoing to business
 * Column T (20): "Memo" header
 * Column U (21): "Need" header  
 * Column V (22): "Moved From Business" header - incoming from business (THIS IS WHERE WE WRITE)
 * Column AC (29): "Business Categories"
 * 
 * The "MOVED FROM PERSONAL" sheet pulls data from BACKEND columns V onwards.
 * 
 * Business sheet structure for "Moved to Personal":
 * Looking for ACCOUNT sheets with transactions marked for personal
 * or MOVED TO PERSONAL sheet if it exists, or BACKEND O3:U section
 */
var BUSINESS_SYNC_COLS = {
  // Target columns in local BACKEND sheet (where we write synced data)
  MOVED_FROM_BIZ_START_COL: 22,   // Column V - "Moved From Business" data start
  MOVED_FROM_BIZ_START_ROW: 3,     // Row 3 - Start of data (row 2 is headers)
  MOVED_FROM_BIZ_NUM_COLS: 7,      // Number of columns: Date, Description, Amount, Category, Memo, Account, Extra
  
  // Source columns in business BACKEND (where we read from)
  // Business sheet's "Moved to Personal" section is in columns O-U
  SOURCE_RANGE_START: 'O',
  SOURCE_RANGE_END: 'U',
  SOURCE_START_ROW: 3,
  
  // Alternative: "Moved to Business" outgoing section (column P)
  MOVED_TO_BIZ_COL: 16,            // Column P - where outgoing to business data is tracked
  
  // Business Categories column
  BUSINESS_CATEGORIES_COL: 29      // Column AC - business categories list
};

/**
 * Sync data from all linked business accounts
 * Pulls "Moved to Personal" transactions from business sheets to local BACKEND
 * Merges data from multiple sheets while preserving unique transactions
 */
function syncAllBusinessData() {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      return { success: false, error: 'Admin access required' };
    }
    
    var props = _mm_safeDocProps_();
    if (!props) {
      return { success: false, error: 'Cannot access properties' };
    }
    
    // Get business accounts
    var accountsJson = props.getProperty(ADMIN_SETTINGS_CONFIG.BUSINESS_ACCOUNTS_KEY);
    if (!accountsJson) {
      return { success: true, message: 'No business accounts configured', synced: 0 };
    }
    
    var accounts = [];
    try {
      accounts = JSON.parse(accountsJson);
    } catch (parseErr) {
      return { success: false, error: 'Invalid business account data' };
    }
    
    if (!Array.isArray(accounts) || accounts.length === 0) {
      return { success: true, message: 'No business accounts to sync', synced: 0 };
    }
    
    // Get local BACKEND sheet for writing
    var localSS = SpreadsheetApp.getActiveSpreadsheet();
    var localBackend = localSS.getSheetByName('BACKEND');
    
    if (!localBackend) {
      return { success: false, error: 'Local BACKEND sheet not found' };
    }
    
    // Collect all transactions from all business accounts
    var allTransactions = [];
    var syncCount = 0;
    var errors = [];
    
    for (var i = 0; i < accounts.length; i++) {
      var account = accounts[i];
      
      if (!account.sheetId) {
        Logger.log('[SYNC] Skipping account without sheetId: ' + (account.name || 'unnamed'));
        continue;
      }
      
      // Get conversion rate (default 1.0 = no conversion)
      var conversionRate = parseFloat(account.conversionRate) || 1.0;
      
      try {
        Logger.log('[SYNC] Processing business account: ' + account.name);
        Logger.log('[SYNC] Account conversionRate property: ' + account.conversionRate);
        Logger.log('[SYNC] Parsed conversionRate: ' + conversionRate);
        
        // Open the business sheet
        var businessSS = SpreadsheetApp.openById(account.sheetId);
        
        // Try multiple source locations for "Moved to Personal" data
        var businessData = fetchBusinessTransactions_(businessSS, account);
        
        if (businessData && businessData.length > 0) {
          Logger.log('[SYNC] Found ' + businessData.length + ' transactions, applying conversion rate: ' + conversionRate);
          
          // Add account name and apply conversion rate
          // BACKEND O:U column order: O=Account, P=Date, Q=Description, R=Amount(3), S=Category, T=Memo, U=Need
          // Amount is at index 3 (column R in the source range)
          var amountIndex = 3;
          
          for (var j = 0; j < businessData.length; j++) {
            var row = businessData[j];
            var originalAmount = row[amountIndex];
            
            // Apply conversion rate to amount
            if (conversionRate !== 1.0) {
              var parsedAmount = parseFloat(row[amountIndex]);
              if (!isNaN(parsedAmount)) {
                row[amountIndex] = parsedAmount * conversionRate;
                if (j < 3) { // Log first 3 for debugging
                  Logger.log('[SYNC] Row ' + j + ': Original=' + originalAmount + ', Converted=' + row[amountIndex] + ' (rate=' + conversionRate + ')');
                }
              }
            }
            
            // Tag with source account name for tracking
            row.sourceAccount = account.name;
            allTransactions.push(row);
          }
          
          syncCount += businessData.length;
          Logger.log('[SYNC] Found ' + businessData.length + ' transactions from ' + account.name);
        } else {
          Logger.log('[SYNC] No transactions found in ' + account.name);
        }
        
      } catch (sheetErr) {
        var errMsg = account.name + ': ' + sheetErr.message;
        errors.push(errMsg);
        Logger.log('[SYNC] Error syncing ' + account.name + ': ' + sheetErr.message);
      }
    }
    
    // Write all transactions to local BACKEND
    if (allTransactions.length > 0) {
      var writeResult = writeBusinessTransactionsToBackend_(localBackend, allTransactions);
      if (!writeResult.success) {
        errors.push('Write error: ' + writeResult.error);
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // SYNC CATEGORIES from business INCOME LABELS and EXPENSE LABELS
    // Write to local BACKEND columns AC (income) and AD (expense)
    // ═══════════════════════════════════════════════════════════════════
    var categoriesSynced = 0;
    for (var c = 0; c < accounts.length; c++) {
      var catAccount = accounts[c];
      if (!catAccount.sheetId) continue;
      
      try {
        Logger.log('[SYNC] Syncing categories from: ' + catAccount.name);
        var catResult = syncBusinessCategories_(catAccount, localBackend);
        if (catResult && catResult.count) {
          categoriesSynced += catResult.count;
          Logger.log('[SYNC] Synced ' + catResult.count + ' categories (' + 
                     (catResult.income || 0) + ' income, ' + 
                     (catResult.expense || 0) + ' expense)');
        }
      } catch (catErr) {
        Logger.log('[SYNC] Error syncing categories from ' + catAccount.name + ': ' + catErr.message);
        errors.push('Categories: ' + catErr.message);
      }
    }
    
    // Update last sync timestamp
    props.setProperty('mm_business_last_sync', new Date().toISOString());
    
    var message = 'Synced ' + syncCount + ' transactions, ' + categoriesSynced + ' categories from ' + accounts.length + ' account(s)';
    if (errors.length > 0) {
      message += '\n\nErrors: ' + errors.join(', ');
    }
    
    Logger.log('[SYNC] Complete: ' + message);
    
    return {
      success: true,
      message: message,
      synced: syncCount,
      categories: categoriesSynced,
      errors: errors
    };
    
  } catch (e) {
    Logger.log('syncAllBusinessData error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Fetch business transactions from a business spreadsheet
 * Tries multiple locations to find "Moved to Personal" data
 * @param {Spreadsheet} businessSS - The business spreadsheet
 * @param {Object} account - Account config with name, currency, etc.
 * @returns {Array} Array of transaction row arrays
 */
function fetchBusinessTransactions_(businessSS, account) {
  var transactions = [];
  
  // Strategy 1: Look for MOVED TO PERSONAL sheet
  var movedSheet = businessSS.getSheetByName('MOVED TO PERSONAL');
  if (!movedSheet) {
    movedSheet = businessSS.getSheetByName('MOVED FROM PERSONAL');
  }
  
  if (movedSheet) {
    var lastRow = movedSheet.getLastRow();
    if (lastRow >= 2) {
      // Read from row 2 (skip header), columns A-G
      var data = movedSheet.getRange(2, 1, lastRow - 1, 7).getValues();
      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        // Check if row has data (date or amount)
        if ((row[0] && row[0] !== '') || (row[2] && row[2] !== '')) {
          transactions.push(row);
        }
      }
      Logger.log('[SYNC] Found ' + transactions.length + ' rows in MOVED TO PERSONAL sheet');
      return transactions;
    }
  }
  
  // Strategy 2: Look in BACKEND sheet column O-U
  var backendSheet = businessSS.getSheetByName('BACKEND');
  if (backendSheet) {
    var lastBackendRow = backendSheet.getLastRow();
    if (lastBackendRow >= BUSINESS_SYNC_COLS.SOURCE_START_ROW) {
      var range = BUSINESS_SYNC_COLS.SOURCE_RANGE_START + 
                  BUSINESS_SYNC_COLS.SOURCE_START_ROW + ':' + 
                  BUSINESS_SYNC_COLS.SOURCE_RANGE_END + lastBackendRow;
      var backendData = backendSheet.getRange(range).getValues();
      
      for (var j = 0; j < backendData.length; j++) {
        var bRow = backendData[j];
        // Check if row has data (first column - usually date)
        if (bRow[0] && bRow[0] !== '') {
          transactions.push(bRow);
        }
      }
      Logger.log('[SYNC] Found ' + transactions.length + ' rows in BACKEND O:U');
      return transactions;
    }
  }
  
  // Strategy 3: Look for transactions in ACCOUNT sheets marked as "Moved to Personal"
  var sheets = businessSS.getSheets();
  for (var k = 0; k < sheets.length; k++) {
    var sheet = sheets[k];
    var sheetName = sheet.getName();
    
    // Check if it's an ACCOUNT sheet
    if (/^ACCOUNT\s*\d+$/i.test(sheetName)) {
      try {
        var lastAccRow = sheet.getLastRow();
        if (lastAccRow > 11) { // Data starts at row 11
          // Read columns C-L (Date to Needs Correction)
          var accData = sheet.getRange(11, 3, lastAccRow - 10, 10).getValues();
          
          for (var m = 0; m < accData.length; m++) {
            var accRow = accData[m];
            // Check if row is marked for personal (look for "Moved to Personal" in special label column)
            var specialLabel = String(accRow[4] || '').toLowerCase(); // Column G relative
            if (specialLabel.indexOf('moved to personal') !== -1 ||
                specialLabel.indexOf('personal') !== -1) {
              // Extract: Date, Description, Amount, Category, Memo
              transactions.push([
                accRow[0],  // Date
                accRow[1],  // Description
                accRow[2],  // Amount
                accRow[3],  // Personal Category
                accRow[5],  // Memo
                sheetName,  // Source account
                ''          // Placeholder
              ]);
            }
          }
        }
      } catch (accErr) {
        Logger.log('[SYNC] Error reading ' + sheetName + ': ' + accErr.message);
      }
    }
  }
  
  return transactions;
}

/**
 * Write business transactions to the local BACKEND sheet
 * Writes to Column V onwards (Moved From Business section)
 * 
 * Column Layout in BACKEND:
 *   V (22): Date
 *   W (23): Description  
 *   X (24): Amount
 *   Y (25): Category
 *   Z (26): Memo
 *   AA (27): Source Account Name
 *   AB (28): Extra/Notes
 * 
 * @param {Sheet} backendSheet - Local BACKEND sheet
 * @param {Array} transactions - Array of transaction row arrays
 * @returns {Object} Result with success status
 */
function writeBusinessTransactionsToBackend_(backendSheet, transactions) {
  try {
    if (!transactions || transactions.length === 0) {
      return { success: true, written: 0 };
    }
    
    // Get existing transactions to avoid duplicates
    var existingIds = getExistingBusinessTransactionIds_(backendSheet);
    
    // Filter out duplicates
    var newTransactions = [];
    for (var i = 0; i < transactions.length; i++) {
      var tx = transactions[i];
      var txId = createBusinessTransactionId_(tx);
      
      if (!existingIds[txId]) {
        newTransactions.push(tx);
        existingIds[txId] = true; // Mark as added to avoid duplicates within batch
      }
    }
    
    if (newTransactions.length === 0) {
      Logger.log('[SYNC] No new transactions to write (all duplicates)');
      return { success: true, written: 0, message: 'All transactions already synced' };
    }
    
    // Find the next empty row in the Moved From Business section (Column V)
    var startCol = BUSINESS_SYNC_COLS.MOVED_FROM_BIZ_START_COL; // Column V = 22
    var startRow = BUSINESS_SYNC_COLS.MOVED_FROM_BIZ_START_ROW; // Row 3
    
    // Check existing data to find next empty row
    var lastRow = backendSheet.getLastRow();
    var checkRange = backendSheet.getRange(startRow, startCol, Math.max(1, lastRow - startRow + 1), 1);
    var existingData = checkRange.getValues();
    
    var nextRow = startRow;
    for (var j = 0; j < existingData.length; j++) {
      if (existingData[j][0] && existingData[j][0] !== '') {
        nextRow = startRow + j + 1;
      }
    }
    
    // Prepare data for writing (ensure consistent column count)
    var numCols = BUSINESS_SYNC_COLS.MOVED_FROM_BIZ_NUM_COLS || 7; // Date, Description, Amount, Category, Memo, Account, Extra
    var writeData = [];
    
    for (var k = 0; k < newTransactions.length; k++) {
      var row = newTransactions[k];
      var writeRow = [];
      
      // Ensure we have exactly numCols columns
      for (var c = 0; c < numCols; c++) {
        writeRow.push(row[c] !== undefined ? row[c] : '');
      }
      
      writeData.push(writeRow);
    }
    
    // Write the data to BACKEND
    if (writeData.length > 0) {
      backendSheet.getRange(nextRow, startCol, writeData.length, numCols).setValues(writeData);
      Logger.log('[SYNC] Wrote ' + writeData.length + ' transactions to BACKEND starting at row ' + nextRow + ', column ' + startCol);
    }
    
    return { success: true, written: writeData.length };
    
  } catch (e) {
    Logger.log('[SYNC] Error writing to BACKEND: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Get existing business transaction IDs from BACKEND to avoid duplicates
 * @param {Sheet} backendSheet - The BACKEND sheet
 * @returns {Object} Hash map of existing transaction IDs
 */
function getExistingBusinessTransactionIds_(backendSheet) {
  var ids = {};
  
  try {
    var startCol = BUSINESS_SYNC_COLS.MOVED_FROM_BIZ_START_COL;
    var startRow = BUSINESS_SYNC_COLS.MOVED_FROM_BIZ_START_ROW;
    var lastRow = backendSheet.getLastRow();
    
    if (lastRow < startRow) return ids;
    
    // Read first 3 columns (Date, Description, Amount) for ID generation
    var data = backendSheet.getRange(startRow, startCol, lastRow - startRow + 1, 3).getValues();
    
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (row[0] && row[0] !== '') {
        var txId = createBusinessTransactionId_(row);
        ids[txId] = true;
      }
    }
    
  } catch (e) {
    Logger.log('[SYNC] Error reading existing IDs: ' + e.message);
  }
  
  return ids;
}

/**
 * Create a unique transaction ID for deduplication
 * @param {Array} row - Transaction row array
 * @returns {string} Unique ID string
 */
function createBusinessTransactionId_(row) {
  var date = row[0];
  var description = String(row[1] || '').trim();
  var amount = parseFloat(row[2]) || 0;
  
  var dateStr = '';
  if (date instanceof Date) {
    dateStr = date.toISOString().split('T')[0];
  } else if (date) {
    dateStr = String(date);
  }
  
  return dateStr + '_' + description.substring(0, 30) + '_' + amount.toFixed(2);
}
