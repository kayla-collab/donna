/**
 * ═══════════════════════════════════════════════════════════════════
 * MONEY MASTERY - System Setup and Diagnostic Fixes
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * This file contains functions to fix common system issues:
 * 1. Set up API credentials (Stripe - Plaid deprecated in 2026)
 * 2. Create Connected Accounts sheet
 * 3. Remove sheet protections blocking imports
 * 
 * NOTE: Plaid integration deprecated in 2026. Use Stripe Financial Connections.
 */

/**
 * FIX ALL - Run this to fix all common issues at once
 */
function FIX_ALL_SYSTEM_ISSUES() {
  try {
    var ui = SpreadsheetApp.getUi();
    var response = ui.alert(
      'Fix All System Issues',
      'This will:\n\n' +
      '✓ Verify API credentials (Stripe)\n' +
      '✓ Create Connected Accounts sheet\n' +
      '✓ Remove protections from ACCOUNT sheets\n\n' +
      'Continue?',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      return;
    }
    
    var results = {
      credentials: false,
      sheet: false,
      protections: 0
    };
    
    // 1. Verify API credentials
    Logger.log('Step 1: Verifying API credentials...');
    try {
      var credResult = verifyApiCredentials();
      results.credentials = credResult.hasStripeKey;
      Logger.log('✅ Credentials verified: Stripe=' + results.credentials);
    } catch (e) {
      Logger.log('❌ Credentials check failed: ' + e.toString());
    }
    
    // 2. Create Connected Accounts sheet
    Logger.log('Step 2: Creating Connected Accounts sheet...');
    try {
      var sheetResult = createConnectedAccountsSheet();
      results.sheet = sheetResult.success;
      Logger.log('✅ Connected Accounts sheet ready');
    } catch (e) {
      Logger.log('❌ Sheet creation failed: ' + e.toString());
    }
    
    // 3. Remove protections from ACCOUNT sheets
    Logger.log('Step 3: Removing sheet protections...');
    try {
      var protectionResult = removeAllAccountProtections();
      results.protections = protectionResult.removed || 0;
      Logger.log('✅ Removed ' + results.protections + ' protections');
    } catch (e) {
      Logger.log('❌ Protection removal failed: ' + e.toString());
    }
    
    // Show results
    var message = '🎉 SYSTEM FIXES COMPLETE\n\n';
    message += 'Results:\n';
    message += (results.credentials ? '✅' : '⚠️') + ' Stripe API Key: ' + (results.credentials ? 'Configured' : 'Not set (use ADMIN_SetStripeApiKey)') + '\n';
    message += (results.sheet ? '✅' : '❌') + ' Connected Accounts Sheet: ' + (results.sheet ? 'Created' : 'Failed') + '\n';
    message += '✅ Protections Removed: ' + results.protections + '\n\n';
    message += 'Run diagnostics again to verify all issues are resolved.';
    
    ui.alert('System Setup Complete', message, ui.ButtonSet.OK);
    
    return results;
    
  } catch (e) {
    Logger.log('ERROR in FIX_ALL_SYSTEM_ISSUES: ' + e.toString());
    SpreadsheetApp.getUi().alert('Error', 'Fix failed: ' + e.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Verify API credentials in Script Properties
 * Updated 2026: Checks Stripe keys (Plaid deprecated)
 */
function verifyApiCredentials() {
  try {
    var scriptProps = PropertiesService.getScriptProperties();
    
    var stripeKey = scriptProps.getProperty('STRIPE_API_KEY');
    var resendKey = scriptProps.getProperty('RESEND_API_KEY');
    
    var result = {
      hasStripeKey: !!stripeKey,
      hasResendKey: !!resendKey,
      stripeKeyLength: stripeKey ? stripeKey.length : 0,
      resendKeyLength: resendKey ? resendKey.length : 0
    };
    
    Logger.log('API Credential Verification:');
    Logger.log('  Stripe API Key: ' + (result.hasStripeKey ? 'Configured' : 'Not set'));
    Logger.log('  Resend API Key: ' + (result.hasResendKey ? 'Configured' : 'Not set'));
    
    return result;
    
  } catch (e) {
    Logger.log('ERROR verifying credentials: ' + e.toString());
    return { error: e.toString() };
  }
}

/**
 * @deprecated Plaid integration removed in 2026. Use ADMIN_SetStripeApiKey() instead.
 */
function setupPlaidCredentials() {
  Logger.log('⚠️ DEPRECATED: setupPlaidCredentials called. Plaid integration removed in 2026.');
  Logger.log('   Use ADMIN_SetStripeApiKey() to configure Stripe API credentials.');
  
  SpreadsheetApp.getUi().alert(
    'Deprecated',
    'Plaid integration has been removed in 2026.\n\n' +
    'Please use ADMIN_SetStripeApiKey() to configure Stripe API credentials.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  
  return { success: false, deprecated: true };
}

/**
 * @deprecated Plaid integration removed in 2026.
 */
function verifyPlaidCredentials() {
  Logger.log('⚠️ DEPRECATED: verifyPlaidCredentials called. Use verifyApiCredentials() instead.');
  return verifyApiCredentials();
}

/**
 * Create Connected Accounts sheet if it doesn't exist
 */
function createConnectedAccountsSheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = 'Connected Accounts';
    
    // Check if sheet already exists
    var existingSheet = ss.getSheetByName(sheetName);
    if (existingSheet) {
      Logger.log('Connected Accounts sheet already exists');
      return { success: true, message: 'Sheet already exists' };
    }
    
    // Create new sheet
    var sheet = ss.insertSheet(sheetName);
    
    // Set up headers (Updated for Stripe integration)
    var headers = [
      'Account ID',
      'Access Token',
      'Provider',
      'Institution Name',
      'Account Name',
      'Account Type',
      'Account Subtype',
      'Mask',
      'Current Balance',
      'Available Balance',
      'Mapped Sheet',
      'Connected Date',
      'Last Sync',
      'Status',
      'User Email'
    ];
    
    // Write headers
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Format header row
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#ab9478');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    headerRange.setFontSize(11);
    
    // Freeze header row
    sheet.setFrozenRows(1);
    
    // Set column widths
    sheet.setColumnWidth(1, 200); // Account ID
    sheet.setColumnWidth(2, 100); // Access Token (hidden)
    sheet.setColumnWidth(3, 100); // Provider
    sheet.setColumnWidth(4, 200); // Institution Name
    sheet.setColumnWidth(5, 200); // Account Name
    sheet.setColumnWidth(6, 120); // Account Type
    sheet.setColumnWidth(7, 120); // Account Subtype
    sheet.setColumnWidth(8, 80);  // Mask
    sheet.setColumnWidth(9, 120); // Current Balance
    sheet.setColumnWidth(10, 120); // Available Balance
    sheet.setColumnWidth(11, 120); // Mapped Sheet
    sheet.setColumnWidth(12, 150); // Connected Date
    sheet.setColumnWidth(13, 150); // Last Sync
    sheet.setColumnWidth(14, 100); // Status
    sheet.setColumnWidth(15, 200); // User Email
    
    // Hide Access Token column for security
    sheet.hideColumns(2);
    
    // Move sheet to end
    ss.moveActiveSheet(ss.getNumSheets());
    
    Logger.log('✅ Created Connected Accounts sheet');
    
    return { success: true, message: 'Sheet created successfully' };
    
  } catch (e) {
    Logger.log('ERROR creating Connected Accounts sheet: ' + e.toString());
    throw e;
  }
}

/**
 * Remove protections from all ACCOUNT sheets
 */
function removeAllAccountProtections() {
  try {
    var totalRemoved = 0;
    var results = [];
    
    // Remove protections from ACCOUNT 1-10
    for (var i = 1; i <= 10; i++) {
      var sheetName = 'ACCOUNT ' + i;
      var result = removeSheetProtections(sheetName);
      
      if (result.success && result.removed > 0) {
        totalRemoved += result.removed;
        results.push(sheetName + ': ' + result.removed);
      }
    }
    
    Logger.log('✅ Total protections removed: ' + totalRemoved);
    
    return {
      success: true,
      removed: totalRemoved,
      details: results
    };
    
  } catch (e) {
    Logger.log('ERROR removing protections: ' + e.toString());
    throw e;
  }
}

/**
 * Remove all protections from a specific sheet
 */
function removeSheetProtections(sheetName) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      return { success: false, error: 'Sheet not found', removed: 0 };
    }
    
    // Remove sheet-level protections
    var sheetProtections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    sheetProtections.forEach(function(protection) {
      protection.remove();
    });
    
    // Remove range-level protections
    var rangeProtections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
    rangeProtections.forEach(function(protection) {
      protection.remove();
    });
    
    var totalRemoved = sheetProtections.length + rangeProtections.length;
    
    if (totalRemoved > 0) {
      Logger.log('Removed ' + totalRemoved + ' protection(s) from ' + sheetName);
    }
    
    return {
      success: true,
      removed: totalRemoved,
      sheetProtections: sheetProtections.length,
      rangeProtections: rangeProtections.length
    };
    
  } catch (e) {
    Logger.log('ERROR removing protections from ' + sheetName + ': ' + e.toString());
    return { success: false, error: e.toString(), removed: 0 };
  }
}

/**
 * Remove protections on sheet open (called from onOpen)
 * Silently removes protections to prevent "protected cell" errors
 */
function removeAccountProtectionsOnOpen() {
  try {
    // Silently remove protections from ACCOUNT sheets only
    for (var i = 1; i <= 10; i++) {
      var sheetName = 'ACCOUNT ' + i;
      removeSheetProtections(sheetName);
    }
    Logger.log('✅ Account protections cleared on open');
  } catch (e) {
    // Silent fail - don't block sheet opening
    Logger.log('Protection removal on open failed (non-critical): ' + e.toString());
  }
}
