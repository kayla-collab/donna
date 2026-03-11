/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * MENUS.GS - Menu Setup & onOpen Handler
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 */

/**
 * onOpen - Simple trigger (limited permissions)
 * 
 * Simple triggers CANNOT show modal dialogs directly, but CAN show modeless dialogs.
 * We use a deferred technique: show a modeless loader that then triggers the modal auth.
 * 
 * PERFORMANCE: Also removes sheet protections to ensure writes succeed
 */
function onOpen(e) {
  try {
    // Build menus first (fast operation)
    buildMenusSafe();
    
    // CHECK FOR FLAGGED USER STATUS (Remote Admin Control)
    // This must run early to block flagged users
    try {
      if (typeof checkFlaggedStatus === 'function') {
        var flaggedResult = checkFlaggedStatus();
        if (flaggedResult && flaggedResult.flagged === true) {
          Logger.log('[SECURITY] FLAGGED USER DETECTED - Blocking access');
          if (typeof handleFlaggedUser === 'function') {
            handleFlaggedUser(flaggedResult);
          }
          return; // Stop all other processing for flagged users
        }
      }
    } catch (flagError) {
      Logger.log('Flagged status check skipped: ' + flagError.message);
    }
    
    // Check for copy protection and unauthorized access
    try {
      if (typeof checkCopyProtection === 'function') {
        var copyResult = checkCopyProtection();
        if (copyResult && copyResult.isCopy === true) {
          Logger.log('[SECURITY] COPY DETECTED - Sheet may be disabled');
          // Copy detection handles its own alerts and disabling
          return;
        }
      }
    } catch (copyError) {
      Logger.log('Copy protection check skipped: ' + copyError.message);
    }
    
    // CRITICAL: Remove sheet protections for transaction writes
    try {
      if (typeof removeAccountProtectionsOnOpen === 'function') {
        removeAccountProtectionsOnOpen();
      }
    } catch (protError) {
      Logger.log('Protection removal skipped: ' + protError.message);
    }
    
    // AUTO-SYNC ACCESS KEYS (Admin only - silently fails for regular users)
    try {
      if (typeof _tryAutoSyncAccessKeys_ === 'function') {
        _tryAutoSyncAccessKeys_();
      }
    } catch (syncError) {
      Logger.log('Access key sync skipped: ' + syncError.message);
    }
    
    // Defer the auth gate via modeless dialog
    MMNAV_triggerWelcomeGateDeferred_();
    
    Logger.log('onOpen complete');
  } catch (error) {
    // Silent error - email support
    _silentErrorReport_(error, 'onOpen');
  }
}

/**
 * Called from the deferred loader to actually open the auth gate
 */
function MMNAV_runWelcomeGate() {
  try {
    Logger.log('MMNAV_runWelcomeGate called');
    
    var canAccessServices = false;
    try {
      var testEmail = Session.getActiveUser().getEmail();
      var testSS = SpreadsheetApp.getActiveSpreadsheet();
      canAccessServices = !!(testEmail && testSS);
    } catch (e) {
      Logger.log('Service access check failed: ' + e.message);
    }
    
    if (!canAccessServices) {
      return false;
    }
    
    if (typeof MM_openSecurityThenDashboard === 'function') {
      MM_openSecurityThenDashboard();
      return true;
    }
  } catch (e) {
    // Silent error reporting - no alert to user
    _silentErrorReport_(e, 'MMNAV_runWelcomeGate');
  }
  return false;
}

/**
 * Trigger the welcome/auth gate on sheet open
 */
function MMNAV_triggerWelcomeGateDeferred_() {
  Logger.log('MMNAV_triggerWelcomeGateDeferred_ - skipped (users should click Start Here)');
}

/**
 * Build all menus safely - CLEAN VERSION WITHOUT EMOJIS
 */
function buildMenusSafe() {
  try {
    var ui = SpreadsheetApp.getUi();
    var email = '';
    try { email = Session.getActiveUser().getEmail(); } catch (e) {}
    var isMaster = typeof MM_isMasterEmail_ === 'function' && email && MM_isMasterEmail_(email);
    
    // Menu 1: Money Mastery (Main menu - streamlined)
    // NOTE: Split Transaction, Refunds & Returns, Scan for Mistakes, and AI Suggestions
    // are now integrated into the Categorization Modal for better UX
    // Tools menu removed - all features consolidated into main workflow
    ui.createMenu('Money Mastery')
      .addItem('Open Dashboard', 'MM_openSecurityThenDashboard')
      .addItem('Categorize Transactions', 'showCategorizationModal')
      .addItem('Profit & Loss Report', 'showProfitAndLossReport')
      .addItem('Clarity AI & Reports', 'showReportsDialog')
      .addSeparator()
      .addItem('🔄 Sync Linked Sheets', 'MENU_twoWaySync')
      .addItem('Manage Guests', 'MM_showGuestInviteDialog')
      .addItem('Navigation Menu', 'showNavigationSidebar')
      .addToUi();
    
    // Menu 2: Access Support (Help & Resources)
    ui.createMenu('Access Support')
      .addItem('Support Ticket', 'showSupportTicketForm')
      .addItem('Full Demo', 'openFullDemo')
      .addItem('Membership Hub', 'openMembershipHub')
      .addToUi();
    
    // Admin Menu (only for master emails) - SIMPLIFIED for MASTER HUB integration
    if (isMaster) {
      ui.createMenu('Admin')
        // Top Level Actions
        .addItem('Initialize Sheet for Client', 'showAdminInitializationModal')
        .addItem('Admin Settings Panel', 'showAdminSettingsModal')
        .addSeparator()
        
        // Client Setup
        .addSubMenu(ui.createMenu('Client Setup')
          .addItem('View Client Status', 'MM_viewRegistrationStatus')
          .addItem('Reset Client Registration', 'MM_resetRegistration')
          .addItem('Resend Registration Email', 'ADMIN_resendRegistration'))
        
        // Guest Management (via MASTER HUB)
        .addSubMenu(ui.createMenu('Guest Management')
          .addItem('Manage Allowed Guests', 'showAllowedGuestsModal'))
        
        // Security (via MASTER HUB)
        .addSubMenu(ui.createMenu('Security')
          .addItem('Check Disabled Status', 'ADMIN_checkDisabledStatusUI')
          .addItem('View Unauthorized Attempts', 'ADMIN_viewUnauthorizedUI')
          .addItem('Lock Sheet for Client', 'ADMIN_lockSheetForClient')
          .addItem('Reset Copy Protection', 'ADMIN_resetCopyProtection'))
        
        // System
        .addSubMenu(ui.createMenu('System')
          .addItem('Show All Sheets', 'ADMIN_showAllSheets')
          .addItem('Clear All Caches', 'clearAllCaches')
          .addItem('Run Diagnostics', 'ADMIN_RunCompleteDiagnostic')
          .addItem('Column Configuration', 'logColumnConfig'))
        
        // Demo Data
        .addSubMenu(ui.createMenu('Demo Data')
          .addItem('Generate Business Demo (Full Year)', 'ADMIN_generateBusinessDemoData')
          .addItem('Generate Quick Demo (1 Month)', 'ADMIN_generateQuickDemo')
          .addSeparator()
          .addItem('🧾 Add Demo Receipts', 'ADMIN_addDemoReceipts')
          .addItem('📊 Refresh Yearly Overview Formulas', 'ADMIN_populateYearlyOverviewBreakdown')
          .addSeparator()
          .addItem('Clear All Demo Data', 'ADMIN_clearDemoData'))
        
        // Advanced
        .addSeparator()
        .addSubMenu(ui.createMenu('Advanced')
          .addItem('Setup OnOpen Trigger', 'ADMIN_setupOnOpenTrigger')
          .addItem('Test Control Panel', 'showTestControlPanel')
          .addItem('Sync Client Data Cache', 'ADMIN_syncClientDataCache')
          .addItem('Set Web App URL', 'ADMIN_promptForWebAppUrl')
          .addItem('Test Web App Connection', 'ADMIN_testWebAppConnection'))
        .addToUi();
    }
    
    Logger.log('Menus built successfully' + (isMaster ? ' (with Admin menu)' : ''));
  } catch (error) {
    _silentErrorReport_(error, 'buildMenusSafe');
  }
}

/**
 * Silent error reporting - emails support without showing user
 */
function _silentErrorReport_(error, context) {
  try {
    Logger.log('[ERROR] ' + context + ': ' + error.message);
    
    // Try to send email to support
    if (typeof sendErrorEmailToSupport === 'function') {
      sendErrorEmailToSupport(error, context);
    }
  } catch (e) {
    Logger.log('Silent error report failed: ' + e.message);
  }
}

/**
 * Open placeholder links
 */
function openPlaceholderLink(linkKey) {
  var url = PLACEHOLDER_LINKS[linkKey];
  if (url) {
    var html = HtmlService.createHtmlOutput(
      '<script>window.open("' + url + '", "_blank");google.script.host.close();</script>'
    ).setWidth(1).setHeight(1);
    SpreadsheetApp.getUi().showModalDialog(html, 'Opening...');
  }
}

function openMembershipHub() { openPlaceholderLink('MEMBERSHIP_HUB'); }
function openCollective() { openPlaceholderLink('COLLECTIVE'); }
function openTutorialVideo() { openPlaceholderLink('TUTORIAL_VIDEO'); }
function openFullDemo() { openPlaceholderLink('FULL_DEMO'); }
function openHelpGuidebook() { openPlaceholderLink('HELP_GUIDEBOOK'); }

// ═══════════════════════════════════════════════════════════════════
// ADMIN REMOTE CONTROL UI FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Show flagged status for current sheet (admin UI)
 */
function ADMIN_checkFlaggedStatusUI() {
  try {
    var ui = SpreadsheetApp.getUi();
    
    if (typeof checkFlaggedStatus !== 'function') {
      ui.alert('Error', 'Remote control functions not available.', ui.ButtonSet.OK);
      return;
    }
    
    var result = checkFlaggedStatus();
    
    var message = 'Flagged Status Check\n\n';
    message += 'Flagged: ' + (result.flagged ? 'YES' : 'NO') + '\n';
    message += 'Reason: ' + (result.reason || 'N/A') + '\n';
    
    if (result.userData) {
      message += '\nUser Data:\n';
      message += '  Email: ' + (result.userData.email || 'N/A') + '\n';
      message += '  Name: ' + ((result.userData.firstName || '') + ' ' + (result.userData.lastName || '')).trim() + '\n';
      message += '  Subscription: ' + (result.userData.subscription || 'N/A') + '\n';
    }
    
    ui.alert('Flagged Status', message, ui.ButtonSet.OK);
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * View all flagged users (admin UI)
 */
function ADMIN_viewFlaggedUsersUI() {
  try {
    var ui = SpreadsheetApp.getUi();
    
    if (typeof ADMIN_getFlaggedUsers !== 'function') {
      ui.alert('Error', 'Remote control functions not available.', ui.ButtonSet.OK);
      return;
    }
    
    var result = ADMIN_getFlaggedUsers();
    
    if (!result.success) {
      ui.alert('Error', result.error, ui.ButtonSet.OK);
      return;
    }
    
    var users = result.users || [];
    var message = 'Flagged Users (' + users.length + ')\n\n';
    
    if (users.length === 0) {
      message += 'No flagged users found.';
    } else {
      for (var i = 0; i < users.length; i++) {
        var u = users[i];
        message += (i + 1) + '. ' + (u.email || 'Unknown') + '\n';
        message += '   Name: ' + ((u.firstName || '') + ' ' + (u.lastName || '')).trim() + '\n';
        message += '   Subscription: ' + (u.subscription || 'N/A') + '\n\n';
      }
    }
    
    ui.alert('Flagged Users', message, ui.ButtonSet.OK);
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Setup AI Suggestions menu handler
 * Adds AI() formulas to Column M for smart category suggestions
 */
function setupAISuggestionsMenu() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var activeSheet = ss.getActiveSheet();
  var sheetName = activeSheet.getName();
  
  // Check if on an ACCOUNT sheet (supports renamed tabs)
  const _isAcctMenuSheet = /^ACCOUNT\s*\d+$/i.test(sheetName) || (typeof isAccountTab === 'function' && isAccountTab(sheetName));
  if (!_isAcctMenuSheet) {
    var response = ui.alert(
      'Setup AI Suggestions',
      'You are not on an ACCOUNT sheet. Do you want to set up AI suggestions for ALL account sheets?',
      ui.ButtonSet.YES_NO
    );
    
    if (response === ui.Button.YES) {
      ui.alert('Setting Up...', 'This may take a moment. Click OK to continue.', ui.ButtonSet.OK);
      
        // Use AccountNameManager when available
        var accountNames = [];
        if (typeof getAccountTabObjects === 'function') {
          try { accountNames = getAccountTabObjects(ss).map(function(a) { return a.sheetName; }); } catch(e) {}
        }
        if (accountNames.length === 0) {
          var sheets = ss.getSheets();
          for (var i = 0; i < sheets.length; i++) {
            var name = sheets[i].getName();
            if (/^ACCOUNT\s*\d+$/i.test(name)) accountNames.push(name);
          }
        }
        var count = 0;
        var errors = [];
        for (var i = 0; i < accountNames.length; i++) {
          var result = setupAISuggestionsForAccount(accountNames[i]);
          if (result.success) {
            count += result.count || 0;
          } else {
            errors.push(accountNames[i] + ': ' + result.error);
          }
        }
      
      if (errors.length > 0) {
        ui.alert('AI Setup Complete', 'Added AI formulas for ' + count + ' transactions.\n\nErrors:\n' + errors.join('\n'), ui.ButtonSet.OK);
      } else {
        ui.alert('AI Setup Complete', 'Added AI formulas for ' + count + ' uncategorized transactions across all accounts.\n\nGo to the Categorize Transactions modal and click the "ML Suggestions" tab to see AI-powered suggestions.', ui.ButtonSet.OK);
      }
    }
    return;
  }
  
  // On an ACCOUNT sheet - set up for this sheet
  var result = setupAISuggestionsForAccount(sheetName);
  
  if (result.success) {
    ui.alert('AI Setup Complete', 'Added AI formulas for ' + (result.count || 0) + ' uncategorized transactions in ' + sheetName + '.\n\nGo to the Categorize Transactions modal and click the "ML Suggestions" tab to see AI-powered suggestions.', ui.ButtonSet.OK);
  } else {
    ui.alert('AI Setup Error', 'Error: ' + result.error, ui.ButtonSet.OK);
  }
}

/**
 * View remote control status (admin UI) - LEGACY, kept for backward compatibility
 */
function ADMIN_viewRemoteControlStatusUI() {
  try {
    var ui = SpreadsheetApp.getUi();
    
    if (typeof getRemoteControlStatus !== 'function') {
      ui.alert('Error', 'Remote control functions not available.', ui.ButtonSet.OK);
      return;
    }
    
    var result = getRemoteControlStatus();
    
    if (!result.success) {
      ui.alert('Error', result.error, ui.ButtonSet.OK);
      return;
    }
    
    var message = 'Remote Control Status\n\n';
    message += 'Stored Sheet URL: ' + (result.storedSheetUrl ? 'Set' : 'Not set') + '\n';
    message += 'Stored Sheet ID: ' + (result.storedSheetId || 'Not set') + '\n';
    message += 'Current Sheet ID: ' + (result.currentSheetId || 'N/A') + '\n';
    message += 'Last Flag Check: ' + (result.lastFlagCheck || 'Never') + '\n';
    
    if (result.cachedFlaggedStatus) {
      try {
        var cached = JSON.parse(result.cachedFlaggedStatus);
        message += '\nCached Status:\n';
        message += '  Flagged: ' + (cached.flagged ? 'YES' : 'NO') + '\n';
        message += '  Reason: ' + (cached.reason || 'N/A') + '\n';
      } catch (e) {}
    }
    
    ui.alert('Remote Control Status', message, ui.ButtonSet.OK);
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// ═══════════════════════════════════════════════════════════════════
// MASTER HUB ADMIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Check disabled status via MASTER HUB
 */
function ADMIN_checkDisabledStatusUI() {
  try {
    var ui = SpreadsheetApp.getUi();
    var props = _mm_safeDocProps_();
    var primaryEmail = props.getProperty('mm_primary_email') || 'Not set';
    
    var message = 'Client Status Check\n\n';
    message += 'Primary Email: ' + primaryEmail + '\n\n';
    
    if (typeof MH_isClientDisabled === 'function' && primaryEmail !== 'Not set') {
      try {
        var isDisabled = MH_isClientDisabled(primaryEmail);
        message += 'Disabled in MASTER HUB: ' + (isDisabled ? 'YES' : 'NO') + '\n';
      } catch (e) {
        message += 'MASTER HUB Check: Error - ' + e.message + '\n';
      }
    } else {
      message += 'MASTER HUB Check: Not available\n';
    }
    
    var copyKey = props.getProperty('mm_copy_management_key');
    message += '\nCopy Management Key: ' + (copyKey || 'Not set') + '\n';
    
    ui.alert('Disabled Status', message, ui.ButtonSet.OK);
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * View unauthorized access attempts via MASTER HUB
 */
function ADMIN_viewUnauthorizedUI() {
  try {
    var ui = SpreadsheetApp.getUi();
    
    if (typeof MH_ADMIN_getUnauthorizedAccess !== 'function') {
      ui.alert('Error', 'MASTER HUB functions not available.', ui.ButtonSet.OK);
      return;
    }
    
    var result = MH_ADMIN_getUnauthorizedAccess();
    
    if (!result.success) {
      ui.alert('Error', result.error, ui.ButtonSet.OK);
      return;
    }
    
    var entries = result.entries || [];
    var message = 'Unauthorized Access Attempts (' + entries.length + ')\n\n';
    
    if (entries.length === 0) {
      message += 'No unauthorized access attempts logged.';
    } else {
      var showCount = Math.min(entries.length, 10);
      for (var i = 0; i < showCount; i++) {
        var e = entries[i];
        message += (i + 1) + '. Unauthorized: ' + (e.unauthorizedEmail || 'Unknown') + '\n';
        message += '   Owner: ' + (e.mainClientEmail || 'Unknown') + '\n';
        message += '   Notice Sent: ' + (e.noticeSent ? 'Yes' : 'No') + '\n\n';
      }
      if (entries.length > 10) {
        message += '... and ' + (entries.length - 10) + ' more entries.\n';
        message += '\nView full list in MASTER HUB > UNAUTHORIZED USERS sheet.';
      }
    }
    
    ui.alert('Unauthorized Access', message, ui.ButtonSet.OK);
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Sync client data to local cache (for offline validation)
 */
function ADMIN_syncClientDataCache() {
  try {
    var ui = SpreadsheetApp.getUi();
    
    if (typeof MH_syncClientDataToLocalCache !== 'function') {
      ui.alert('Error', 'MASTER HUB functions not available.', ui.ButtonSet.OK);
      return;
    }
    
    var result = MH_syncClientDataToLocalCache();
    
    if (result.success) {
      ui.alert('Sync Complete', 
        'Successfully synced ' + result.clientCount + ' clients to local cache.\n\n' +
        'Users can now validate against cached data even if Web App is unavailable.',
        ui.ButtonSet.OK);
    } else {
      ui.alert('Sync Failed', result.error, ui.ButtonSet.OK);
    }
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Prompt admin to set Web App URL
 */
function ADMIN_promptForWebAppUrl() {
  try {
    var ui = SpreadsheetApp.getUi();
    
    var currentUrl = '';
    try {
      var props = PropertiesService.getScriptProperties();
      currentUrl = props.getProperty('mm_webapp_url') || '';
    } catch (e) {}
    
    var message = 'Enter the deployed Web App URL:\n\n';
    message += 'Format: https://script.google.com/macros/s/DEPLOYMENT_ID/exec\n\n';
    if (currentUrl) {
      message += 'Current URL: ' + currentUrl;
    } else {
      message += 'No URL currently set.';
    }
    
    var response = ui.prompt('Set Web App URL', message, ui.ButtonSet.OK_CANCEL);
    
    if (response.getSelectedButton() === ui.Button.OK) {
      var url = response.getResponseText().trim();
      
      if (url && url.indexOf('https://script.google.com/') === 0) {
        var props = PropertiesService.getScriptProperties();
        props.setProperty('mm_webapp_url', url);
        ui.alert('Success', 'Web App URL has been saved.', ui.ButtonSet.OK);
      } else if (!url) {
        ui.alert('Info', 'No URL entered. Settings unchanged.', ui.ButtonSet.OK);
      } else {
        ui.alert('Error', 'Invalid URL format. URL must start with https://script.google.com/', ui.ButtonSet.OK);
      }
    }
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Reset copy protection (admin function)
 */
function ADMIN_resetCopyProtection() {
  try {
    var ui = SpreadsheetApp.getUi();
    var props = _mm_safeDocProps_();
    
    if (!props) {
      ui.alert('Error', 'Cannot access document properties.', ui.ButtonSet.OK);
      return;
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var currentId = ss.getId();
    
    // Reset the original sheet ID to current
    props.setProperty('mm_original_sheet_id', currentId);
    
    ui.alert('Copy Protection Reset', 
      'Copy protection has been reset.\n\n' +
      'This sheet is now registered as the original.\n' +
      'Sheet ID: ' + currentId,
      ui.ButtonSet.OK);
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Verify transactions (placeholder - implement as needed)
 */
function ADMIN_VerifyTransactions() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.alert('Verify Transactions', 
      'Transaction verification is performed automatically during categorization.\n\n' +
      'To verify transactions:\n' +
      '1. Open the Categorize Transactions modal\n' +
      '2. Review any flagged issues in the dashboard\n' +
      '3. Check the Error Errors column in ACCOUNT sheets',
      ui.ButtonSet.OK);
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}
