/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * STARTHHERE.GS - Start Here Button & Sheet Visibility Management
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * This file contains functions for:
 * - "Start Here" button click handler (triggers auth flow)
 * - Admin sheet preparation (hide all except START HERE)
 * - Sheet visibility management after authentication
 * 
 * USAGE:
 * 1. Admin creates "START HERE" tab with a button/drawing
 * 2. Button is linked to: onStartHereClick
 * 3. When new user clicks, it triggers Google OAuth then auth flow
 * ═══════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

var START_HERE_CONFIG = {
  START_SHEET_NAME: 'START HERE',
  PROTECTED_SHEETS: [
    'BACKEND',
    'INCOME LABELS',
    'EXPENSE LABELS',
    'ACCOUNT TEMPLATE'
  ],
  // Sheets that should always be visible after auth (2026 Launch Version)
  DEFAULT_VISIBLE_SHEETS: [
    'START HERE',
    'ACCOUNT 1',
    'INCOME TRANSACTIONS',
    'EXPENSE TRANSACTIONS',
    'YEARLY OVERVIEW',
    'MONTHLY OVERVIEW',
    'PROFIT & LOSS',
    'NEEDS & DESIRES'
  ]
};

// ═══════════════════════════════════════════════════════════════════
// START HERE BUTTON HANDLER
// ═══════════════════════════════════════════════════════════════════

/**
 * Handler for "Start Here" button click
 * This function should be linked to a button/drawing on the START HERE tab
 * 
 * It triggers the authentication flow which will:
 * 1. Request Google OAuth permissions (if not already authorized)
 * 2. Show the appropriate auth screen (Access Key, Login, etc.)
 */
/**
 * Handler for "Start Here" button click
 * This function should be linked to a button/drawing on the START HERE tab
 */
function onStartHereClick() {
  try {
    Logger.log('▶️ START HERE button clicked');
    
    // Get user email (basic permission that's usually already granted)
    var email = '';
    try {
      email = Session.getActiveUser().getEmail();
      Logger.log('✅ User: ' + email);
    } catch (emailError) {
      Logger.log('⚠️  Could not get email: ' + emailError.message);
      // Continue anyway - email not critical for opening auth flow
    }
    
    // Start the authentication flow
    // This will handle authorization internally
    if (typeof MM_openSecurityThenDashboard === 'function') {
      MM_openSecurityThenDashboard();
    } else {
      SpreadsheetApp.getUi().alert(
        'System Error',
        'Authentication function is missing. Please contact support.',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    }
    
  } catch (error) {
    Logger.log('onStartHereClick error: ' + error.message);
    Logger.log('Stack: ' + error.stack);
    
    // Show helpful error message
    try {
      SpreadsheetApp.getUi().alert(
        '⚠️  Unable to Start',
        'An error occurred while starting the application.\n\n' +
        'Error: ' + error.message + '\n\n' +
        'Please try:\n' +
        '1. Refresh the page\n' +
        '2. Close and reopen the spreadsheet\n' +
        '3. Contact support if issue persists',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    } catch (alertError) {
      Logger.log('Cannot show alert: ' + alertError.message);
    }
  }
}

/**
 * Alternative handler name for flexibility
 */
function startHereButtonClick() {
  onStartHereClick();
}

/**
 * Menu-friendly name for testing
 */
function clickStartHere() {
  onStartHereClick();
}

// ═══════════════════════════════════════════════════════════════════
// ADMIN SETUP FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * ADMIN FUNCTION: Prepare sheet for new client
 * 
 * This function should be run by admin BEFORE sharing the sheet with a client.
 * It will:
 * 1. Create START HERE tab if it doesn't exist
 * 2. Hide all other tabs
 * 3. Protect hidden tabs from unauthorized users
 * 4. Clear any previous registration data
 * 
 * Run from: Extensions > Apps Script > Run > ADMIN_prepareSheetForClient
 */
function ADMIN_prepareSheetForClient() {
  try {
    var ui = SpreadsheetApp.getUi();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Confirm action
    var response = ui.alert(
      '⚠️ Prepare Sheet for New Client',
      'This will:\n\n' +
      '• Hide ALL tabs except "START HERE"\n' +
      '• Clear previous registration data\n' +
      '• Sync access keys from backend\n' +
      '• Protect hidden sheets\n\n' +
      'Are you sure you want to continue?',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      ui.alert('Operation cancelled.');
      return;
    }
    
    Logger.log('🔧 ADMIN: Preparing sheet for new client...');
    
    // Step 0: SYNC ACCESS KEYS FROM BACKEND (Critical for registration to work)
    var syncResult = { success: false, count: 0 };
    try {
      if (typeof syncAccessKeysToLocal === 'function') {
        syncResult = syncAccessKeysToLocal(true); // Silent mode
        Logger.log('✅ Access keys synced: ' + (syncResult.count || 0) + ' keys');
      }
    } catch (syncError) {
      Logger.log('⚠️ Access key sync failed: ' + syncError.message);
    }
    
    // Step 1: Create START HERE tab if it doesn't exist
    var startSheet = ss.getSheetByName(START_HERE_CONFIG.START_SHEET_NAME);
    if (!startSheet) {
      startSheet = ss.insertSheet(START_HERE_CONFIG.START_SHEET_NAME, 0);
      _setupStartHereSheet_(startSheet);
      Logger.log('✅ Created START HERE tab');
    }
    
    // Step 2: Hide all other sheets
    var sheets = ss.getSheets();
    var hiddenCount = 0;
    
    for (var i = 0; i < sheets.length; i++) {
      var sheet = sheets[i];
      var sheetName = sheet.getName();
      
      if (sheetName === START_HERE_CONFIG.START_SHEET_NAME) {
        // Keep START HERE visible
        if (sheet.isSheetHidden()) {
          sheet.showSheet();
        }
      } else {
        // Hide all other sheets
        if (!sheet.isSheetHidden()) {
          sheet.hideSheet();
          hiddenCount++;
        }
      }
    }
    
    Logger.log('✅ Hidden ' + hiddenCount + ' sheets');
    
    // Step 3: Clear registration data (use safe props wrapper)
    var props = _mm_safeDocProps_();
    props.deleteProperty('mm_registered');
    props.deleteProperty('mm_primary_email');
    props.deleteProperty('mm_guests_json');
    props.deleteProperty('mm_access_key');
    props.deleteProperty('mm_registration_date');
    props.deleteProperty('mm_is_first_login');
    props.deleteProperty('mm_needs_bank_setup');
    
    // Clear any user PIN hashes (they start with mm_pin_hash_)
    var allProps = props.getProperties();
    for (var key in allProps) {
      if (key.indexOf('mm_pin_hash_') === 0) {
        props.deleteProperty(key);
      }
    }
    
    Logger.log('✅ Cleared registration data');
    
    // Step 4: Activate START HERE sheet
    ss.setActiveSheet(startSheet);
    
    var keysSyncMessage = syncResult.success 
      ? '• ' + syncResult.count + ' access keys synced ✅\n'
      : '• ⚠️ Access key sync failed - run manually\n';
    
    ui.alert(
      '✅ Sheet Prepared!',
      'The sheet is now ready for a new client.\n\n' +
      '• Only "START HERE" tab is visible\n' +
      '• ' + hiddenCount + ' tabs have been hidden\n' +
      '• Registration data has been cleared\n' +
      keysSyncMessage + '\n' +
      'Next steps:\n' +
      '1. Add a button/drawing to the START HERE tab\n' +
      '2. Link the button to: onStartHereClick\n' +
      '3. Share the sheet with your client',
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('ADMIN_prepareSheetForClient error: ' + error.message);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

/**
 * Setup the START HERE sheet with basic instructions
 */
function _setupStartHereSheet_(sheet) {
  // Set column widths
  sheet.setColumnWidth(1, 50);
  sheet.setColumnWidth(2, 600);
  sheet.setColumnWidth(3, 50);
  
  // Add header
  sheet.getRange('B2').setValue('Welcome to Money Mastery');
  sheet.getRange('B2').setFontSize(24).setFontWeight('bold').setFontColor('#ab9478');
  
  sheet.getRange('B4').setValue('Click the button below to get started!');
  sheet.getRange('B4').setFontSize(14).setFontColor('#666666');
  
  sheet.getRange('B6').setValue('↓ Click here to begin ↓');
  sheet.getRange('B6').setFontSize(12).setFontColor('#888888');
  
  // Note about button
  sheet.getRange('B10').setValue('Note: Admin needs to add a button/drawing here and link it to "onStartHereClick"');
  sheet.getRange('B10').setFontSize(10).setFontColor('#cccccc').setFontStyle('italic');
  
  // Set background
  sheet.getRange('A1:Z100').setBackground('#f5f5f0');
  sheet.getRange('B2:B10').setBackground('#ffffff');
}

/**
 * ADMIN FUNCTION: Show all sheets (for admin use)
 * 
 * Use this to unhide all sheets for editing.
 */
function ADMIN_showAllSheets() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    var shownCount = 0;
    
    for (var i = 0; i < sheets.length; i++) {
      if (sheets[i].isSheetHidden()) {
        sheets[i].showSheet();
        shownCount++;
      }
    }
    
    SpreadsheetApp.getUi().alert(
      '✅ Sheets Unhidden',
      'Unhid ' + shownCount + ' sheet(s).\n\nAll sheets are now visible.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('ADMIN_showAllSheets error: ' + error.message);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// SHEET VISIBILITY MANAGEMENT (After Authentication)
// ═══════════════════════════════════════════════════════════════════

/**
 * Show sheets for an authorized user (DEPRECATED - sheet visibility not managed here)
 * 
 * NOTE: Sheets are pre-configured on delivery. We no longer toggle visibility
 * on every login. This function is kept for backwards compatibility but does nothing.
 */
function MM_showSheetsForAuthorizedUser() {
  Logger.log('MM_showSheetsForAuthorizedUser called (no-op - sheet visibility not managed)');
}

/**
 * Check if user should see restricted view (START HERE only)
 */
function MM_shouldShowStartHereOnly() {
  try {
    var props = _mm_safeDocProps_();
    var registered = props.getProperty('mm_registered') === 'true';
    
    if (!registered) {
      return true; // Not registered, show only START HERE
    }
    
    var email = Session.getActiveUser().getEmail();
    if (!email) {
      return true; // Can't get email, show only START HERE
    }
    
    var normalizedEmail = email.toLowerCase().trim();
    
    // Check if master email
    if (MM_isMasterEmail_(normalizedEmail)) {
      return false; // Admins see everything
    }
    
    // Check if authorized
    var primaryEmail = (props.getProperty('mm_primary_email') || '').toLowerCase().trim();
    if (normalizedEmail === primaryEmail) {
      return false; // Primary user can see sheets
    }
    
    // Check guests
    try {
      var guestsJson = props.getProperty('mm_guests_json');
      if (guestsJson) {
        var guests = JSON.parse(guestsJson);
        for (var i = 0; i < guests.length; i++) {
          if ((guests[i].email || '').toLowerCase().trim() === normalizedEmail) {
            if (guests[i].registered) {
              return false; // Registered guest can see sheets
            }
          }
        }
      }
    } catch (e) {}
    
    return true; // Default to restricted view
    
  } catch (error) {
    Logger.log('MM_shouldShowStartHereOnly error: ' + error.message);
    return true; // Error, show restricted view
  }
}

// ═══════════════════════════════════════════════════════════════════
// INSTALLABLE TRIGGER SETUP
// ═══════════════════════════════════════════════════════════════════

/**
 * ADMIN FUNCTION: Set up installable onOpen trigger
 * 
 * This creates an installable trigger that runs when the spreadsheet opens.
 * It will check if user is authorized and show appropriate view.
 */
function ADMIN_setupOnOpenTrigger() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Remove existing onOpen triggers
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'onOpenInstallable') {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }
    
    // Create new installable trigger
    ScriptApp.newTrigger('onOpenInstallable')
      .forSpreadsheet(ss)
      .onOpen()
      .create();
    
    SpreadsheetApp.getUi().alert(
      '✅ Trigger Created',
      'The onOpen trigger has been set up.\n\n' +
      'When users open the spreadsheet, it will automatically check their authorization.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('ADMIN_setupOnOpenTrigger error: ' + error.message);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

/**
 * Installable onOpen handler
 * This runs with full authorization (unlike simple onOpen)
 * 
 * NOTE: Sheets are pre-hidden on delivery. We do NOT toggle sheet visibility here.
 * The deferred auth trigger in Menus.gs handles showing the login/registration.
 */
function onOpenInstallable(e) {
  try {
    Logger.log('📂 Installable onOpen triggered');
    
    // Build menus
    if (typeof buildMenusSafe === 'function') {
      buildMenusSafe();
    }
    
    // Trigger the auth flow via deferred loader
    if (typeof MMNAV_triggerWelcomeGateDeferred_ === 'function') {
      MMNAV_triggerWelcomeGateDeferred_();
    }
    
    Logger.log('✅ Installable onOpen complete');
    
  } catch (error) {
    Logger.log('onOpenInstallable error: ' + error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// ADMIN MENU ADDITIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Add admin menu items (call from buildMenusSafe)
 */
function addAdminMenuItems(ui) {
  try {
    var email = Session.getActiveUser().getEmail();
    if (MM_isMasterEmail_(email)) {
      ui.createMenu('🔧 Admin')
        .addItem('Prepare Sheet for New Client', 'ADMIN_prepareSheetForClient')
        .addItem('Show All Sheets', 'ADMIN_showAllSheets')
        .addItem('Setup OnOpen Trigger', 'ADMIN_setupOnOpenTrigger')
        .addSeparator()
        .addItem('Send Master Key to Email', 'MM_sendMasterKeyToAdmin')
        .addItem('Clear Dashboard Cache', 'MM_CLEAR_DASHBOARD_CACHE')
        .addToUi();
    }
  } catch (e) {
    Logger.log('Could not add admin menu: ' + e.message);
  }
}
