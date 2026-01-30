/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * ERROR REPORTING & FAILSAFE SYSTEM
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Centralized error reporting system that:
 * - Logs all errors comprehensively
 * - Notifies admins of critical errors
 * - Shows user-friendly messages to users
 * - Stores error info for retry on next login
 * - Provides support contact information
 */

// ═══════════════════════════════════════════════════════════════════
// ERROR REPORTING CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

var ERROR_CONFIG = {
  ADMIN_EMAIL: 'support@risingandthriving.com',
  SUPPORT_EMAIL: 'support@risingandthriving.com',
  NOTIFY_ON_CRITICAL: true,
  LOG_ALL_ERRORS: true,
  RETRY_ENABLED: true,
  MAX_RETRY_ATTEMPTS: 3
};

// ═══════════════════════════════════════════════════════════════════
// CENTRAL ERROR HANDLER
// ═══════════════════════════════════════════════════════════════════

/**
 * Handle errors centrally with logging, user notification, and admin reporting
 * @param {Error} error - The error object
 * @param {string} context - Where the error occurred (e.g., 'Dashboard Load', 'Plaid Sync')
 * @param {Object} options - { showUser: true, notifyAdmin: false, allowRetry: true, userMessage: '' }
 * @returns {Object} - { success: false, error: errorDetails, retryToken: token }
 */
function handleError(error, context, options) {
  options = options || {};
  var showUser = options.showUser !== false; // Default true
  var notifyAdmin = options.notifyAdmin || false;
  var allowRetry = options.allowRetry !== false; // Default true
  var userMessage = options.userMessage || 'An error occurred. Please try again.';
  
  try {
    // 1. Log the error comprehensively
    var errorDetails = logErrorComprehensive(error, context);
    
    // 2. Store error for potential retry
    if (allowRetry) {
      var retryToken = storeErrorForRetry(errorDetails, context);
      errorDetails.retryToken = retryToken;
    }
    
    // 3. Notify admin if critical or requested
    if (notifyAdmin || (ERROR_CONFIG.NOTIFY_ON_CRITICAL && isCriticalError(error, context))) {
      notifyAdminOfError(errorDetails, context);
    }
    
    // 4. Show user-friendly message
    if (showUser) {
      showUserFriendlyError(userMessage, context, allowRetry);
    }
    
    return {
      success: false,
      error: errorDetails,
      message: userMessage,
      retryAvailable: allowRetry,
      retryToken: errorDetails.retryToken || null
    };
    
  } catch (handlerError) {
    // Failsafe: If error handler itself fails, log to console
    Logger.log('❌ ERROR HANDLER FAILED: ' + handlerError.message);
    Logger.log('Original error: ' + error.message);
    return {
      success: false,
      error: { message: error.message, stack: error.stack },
      message: 'A system error occurred. Please contact support.'
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// COMPREHENSIVE ERROR LOGGING
// ═══════════════════════════════════════════════════════════════════

/**
 * Log error with full context and stack trace
 */
function logErrorComprehensive(error, context) {
  var timestamp = new Date().toISOString();
  var userEmail = '';
  
  try {
    userEmail = Session.getActiveUser().getEmail();
  } catch (e) {
    userEmail = 'unknown';
  }
  
  var errorDetails = {
    timestamp: timestamp,
    context: context,
    message: error.message || String(error),
    stack: error.stack || 'No stack trace available',
    userEmail: userEmail,
    errorType: error.name || 'Error',
    errorCode: error.code || null
  };
  
  // Log to Apps Script logs
  Logger.log('═══════════════════════════════════════════════════════════════════');
  Logger.log('❌ ERROR REPORT: ' + context);
  Logger.log('═══════════════════════════════════════════════════════════════════');
  Logger.log('Time: ' + timestamp);
  Logger.log('User: ' + userEmail);
  Logger.log('Message: ' + errorDetails.message);
  Logger.log('Stack: ' + errorDetails.stack);
  Logger.log('═══════════════════════════════════════════════════════════════════');
  
  // Store in script properties for admin review
  try {
    var props = PropertiesService.getScriptProperties();
    var errorLog = props.getProperty('mm_error_log');
    var errors = errorLog ? JSON.parse(errorLog) : [];
    
    // Keep last 50 errors
    errors.unshift(errorDetails);
    if (errors.length > 50) {
      errors = errors.slice(0, 50);
    }
    
    props.setProperty('mm_error_log', JSON.stringify(errors));
  } catch (storageError) {
    Logger.log('⚠️ Could not store error in properties: ' + storageError.message);
  }
  
  return errorDetails;
}

// ═══════════════════════════════════════════════════════════════════
// RETRY MECHANISM
// ═══════════════════════════════════════════════════════════════════

/**
 * Store error information for retry on next login
 */
function storeErrorForRetry(errorDetails, context) {
  try {
    var userEmail = errorDetails.userEmail;
    if (!userEmail || userEmail === 'unknown') return null;
    
    var normalizedEmail = MM_normEmail_(userEmail);
    var userProps = _mm_safeUserProps_();
    
    if (!userProps) return null;
    
    // Create retry token
    var retryToken = 'retry_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Store retry info
    var retryInfo = {
      token: retryToken,
      context: context,
      timestamp: errorDetails.timestamp,
      error: errorDetails.message,
      attempts: 0
    };
    
    var retryKey = _mm_userPropKey_(normalizedEmail, 'pending_retry');
    userProps.setProperty(retryKey, JSON.stringify(retryInfo));
    
    Logger.log('✓ Stored retry info for: ' + context + ' (token: ' + retryToken + ')');
    
    return retryToken;
    
  } catch (e) {
    Logger.log('⚠️ Could not store retry info: ' + e.message);
    return null;
  }
}

/**
 * Check and execute pending retries on user login
 */
function checkAndRetryPendingOperations() {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    var normalizedEmail = MM_normEmail_(userEmail);
    var userProps = _mm_safeUserProps_();
    
    if (!userProps) return;
    
    var retryKey = _mm_userPropKey_(normalizedEmail, 'pending_retry');
    var retryInfoStr = userProps.getProperty(retryKey);
    
    if (!retryInfoStr) return; // No pending retries
    
    var retryInfo = JSON.parse(retryInfoStr);
    
    // Check if retry is too old (more than 7 days)
    var retryAge = Date.now() - new Date(retryInfo.timestamp).getTime();
    var sevenDays = 7 * 24 * 60 * 60 * 1000;
    
    if (retryAge > sevenDays) {
      Logger.log('⚠️ Retry expired (too old): ' + retryInfo.context);
      userProps.deleteProperty(retryKey);
      return;
    }
    
    // Check attempt limit
    if (retryInfo.attempts >= ERROR_CONFIG.MAX_RETRY_ATTEMPTS) {
      Logger.log('⚠️ Retry limit reached for: ' + retryInfo.context);
      userProps.deleteProperty(retryKey);
      return;
    }
    
    // Increment attempts
    retryInfo.attempts++;
    userProps.setProperty(retryKey, JSON.stringify(retryInfo));
    
    Logger.log('🔄 Attempting retry for: ' + retryInfo.context + ' (attempt ' + retryInfo.attempts + ')');
    
    // Execute retry based on context
    var retrySuccess = executeRetry(retryInfo.context);
    
    if (retrySuccess) {
      Logger.log('✅ Retry successful for: ' + retryInfo.context);
      userProps.deleteProperty(retryKey);
      
      // Show success message to user
      SpreadsheetApp.getUi().alert(
        '✅ Operation Completed',
        'A previously failed operation has been completed successfully:\n\n' + retryInfo.context,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    }
    
  } catch (e) {
    Logger.log('❌ checkAndRetryPendingOperations error: ' + e.message);
  }
}

/**
 * Execute retry based on context
 * Updated 2026: Removed Plaid references
 */
function executeRetry(context) {
  try {
    if (context.indexOf('Dashboard') !== -1) {
      MM_showDashboard();
      return true;
    } else if (context.indexOf('Stripe') !== -1) {
      // Retry Stripe sync if available
      if (typeof syncAllStripeAccounts === 'function') {
        syncAllStripeAccounts();
        return true;
      }
      return false;
    } else if (context.indexOf('Transaction') !== -1) {
      // Retry transaction operations - show categorization modal
      if (typeof showCategorizationModal === 'function') {
        showCategorizationModal();
        return true;
      }
      return false;
    } else if (context.indexOf('Categorization') !== -1) {
      // Retry categorization
      if (typeof showCategorizationModal === 'function') {
        showCategorizationModal();
        return true;
      }
      return false;
    }
    
    return false;
    
  } catch (e) {
    Logger.log('❌ executeRetry failed: ' + e.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// ADMIN NOTIFICATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Notify admin of critical error via email
 */
function notifyAdminOfError(errorDetails, context) {
  try {
    if (!ERROR_CONFIG.NOTIFY_ON_CRITICAL) return;
    
    var subject = '🚨 Money Mastery Error: ' + context;
    
    var htmlBody = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">' +
      '<div style="background: #fed7d7; padding: 20px; border-radius: 10px 10px 0 0; border: 2px solid #fc8181;">' +
      '<h1 style="color: #742a2a; margin: 0; font-size: 20px;">🚨 System Error Report</h1>' +
      '</div>' +
      '<div style="background: #fff; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0; border-top: none;">' +
      '<h2 style="color: #2d3748; font-size: 18px; margin-top: 0;">Error Context</h2>' +
      '<p style="color: #4a5568;"><strong>Context:</strong> ' + context + '</p>' +
      '<p style="color: #4a5568;"><strong>Time:</strong> ' + errorDetails.timestamp + '</p>' +
      '<p style="color: #4a5568;"><strong>User:</strong> ' + errorDetails.userEmail + '</p>' +
      '<h2 style="color: #2d3748; font-size: 18px;">Error Details</h2>' +
      '<p style="color: #4a5568;"><strong>Message:</strong> ' + errorDetails.message + '</p>' +
      '<p style="color: #4a5568;"><strong>Type:</strong> ' + errorDetails.errorType + '</p>' +
      '<h2 style="color: #2d3748; font-size: 18px;">Stack Trace</h2>' +
      '<pre style="background: #f7fafc; padding: 10px; border-radius: 5px; overflow-x: auto; font-size: 12px;">' + 
      errorDetails.stack + 
      '</pre>' +
      '<hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;">' +
      '<p style="color: #718096; font-size: 13px;">This is an automated error report from Money Mastery.</p>' +
      '</div>' +
      '<p style="text-align: center; color: #a0aec0; font-size: 11px; margin-top: 20px;">© 2026 Donna Roggio LLC</p>' +
      '</div>';
    
    // Send via Resend
    var payload = {
      from: 'Money Mastery <' + RESEND_CONFIG.FROM_EMAIL + '>',
      to: [ERROR_CONFIG.ADMIN_EMAIL],
      subject: subject,
      html: htmlBody
    };
    
    var response = UrlFetchApp.fetch(RESEND_CONFIG.API_BASE + '/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + RESEND_CONFIG.API_KEY,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    var responseCode = response.getResponseCode();
    
    if (responseCode === 200 || responseCode === 201) {
      Logger.log('✅ Admin notified of error: ' + context);
    } else {
      Logger.log('⚠️ Failed to notify admin: ' + response.getContentText());
    }
    
  } catch (e) {
    Logger.log('❌ notifyAdminOfError failed: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// USER-FRIENDLY ERROR MESSAGES
// ═══════════════════════════════════════════════════════════════════

/**
 * Show user-friendly error message with support info
 */
function showUserFriendlyError(message, context, allowRetry) {
  try {
    var title = '⚠️ Oops! Something went wrong';
    
    var body = message + '\n\n';
    
    if (allowRetry) {
      body += '✨ Good news: We\'ve saved your progress. The system will automatically retry this operation next time you open the dashboard.\n\n';
    }
    
    body += '📧 Need help? Contact support:\n' + ERROR_CONFIG.SUPPORT_EMAIL + '\n\n';
    body += '💡 Tip: Try refreshing the page or logging out and back in.\n\n';
    body += 'Error occurred in: ' + context;
    
    SpreadsheetApp.getUi().alert(title, body, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (e) {
    // Failsafe: If UI alert fails, just log
    Logger.log('Could not show user error message: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// ERROR CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Determine if an error is critical and requires admin notification
 * Updated 2026: Removed Plaid-specific contexts, added Stripe
 */
function isCriticalError(error, context) {
  var criticalContexts = [
    'Registration',
    'Authentication',
    'Stripe Token Exchange',
    'Database Write',
    'Transaction Import',
    'Categorization Save'
  ];
  
  // Check if context is critical
  for (var i = 0; i < criticalContexts.length; i++) {
    if (context.indexOf(criticalContexts[i]) !== -1) {
      return true;
    }
  }
  
  // Check error message for critical keywords
  var criticalKeywords = ['authorization', 'permission', 'access denied', 'api key', 'authentication'];
  var errorMsg = (error.message || String(error)).toLowerCase();
  
  for (var i = 0; i < criticalKeywords.length; i++) {
    if (errorMsg.indexOf(criticalKeywords[i]) !== -1) {
      return true;
    }
  }
  
  return false;
}

// ═══════════════════════════════════════════════════════════════════
// ADMIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * View recent errors (Admin only)
 */
function ADMIN_viewRecentErrors() {
  try {
    var props = PropertiesService.getScriptProperties();
    var errorLog = props.getProperty('mm_error_log');
    
    if (!errorLog) {
      SpreadsheetApp.getUi().alert('No errors logged yet.');
      return;
    }
    
    var errors = JSON.parse(errorLog);
    
    var message = '📋 RECENT ERRORS (Last ' + errors.length + ')\n\n';
    
    for (var i = 0; i < Math.min(10, errors.length); i++) {
      var err = errors[i];
      message += (i + 1) + '. ' + err.context + '\n';
      message += '   Time: ' + err.timestamp + '\n';
      message += '   User: ' + err.userEmail + '\n';
      message += '   Error: ' + err.message.substring(0, 100) + '...\n\n';
    }
    
    message += '\nFull error log stored in Script Properties: mm_error_log';
    
    SpreadsheetApp.getUi().alert('Recent Errors', message, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error viewing errors: ' + e.message);
  }
}

/**
 * Clear error log (Admin only)
 */
function ADMIN_clearErrorLog() {
  try {
    var ui = SpreadsheetApp.getUi();
    var response = ui.alert(
      'Clear Error Log',
      'Are you sure you want to clear all logged errors?',
      ui.ButtonSet.YES_NO
    );
    
    if (response === ui.Button.YES) {
      var props = PropertiesService.getScriptProperties();
      props.deleteProperty('mm_error_log');
      ui.alert('✅ Error log cleared successfully.');
    }
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error clearing log: ' + e.message);
  }
}

/**
 * Test error reporting system
 */
function TEST_errorReporting() {
  try {
    Logger.log('🧪 Testing error reporting system...');
    
    // Test 1: Basic error handling
    var testError = new Error('This is a test error');
    var result1 = handleError(testError, 'Test Context', {
      showUser: false,
      notifyAdmin: false,
      allowRetry: true,
      userMessage: 'Test error message'
    });
    
    Logger.log('Test 1 (Basic): ' + (result1.success === false ? '✅ PASS' : '❌ FAIL'));
    
    // Test 2: Critical error detection
    var criticalError = new Error('Authentication failed');
    var isCritical = isCriticalError(criticalError, 'Authentication');
    Logger.log('Test 2 (Critical): ' + (isCritical ? '✅ PASS' : '❌ FAIL'));
    
    // Test 3: Retry storage
    var hasRetryToken = result1.retryToken !== null;
    Logger.log('Test 3 (Retry): ' + (hasRetryToken ? '✅ PASS' : '❌ FAIL'));
    
    Logger.log('');
    Logger.log('✅ Error reporting system tests complete!');
    Logger.log('Check logs above for results.');
    
  } catch (e) {
    Logger.log('❌ TEST_errorReporting failed: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// MISTAKE SCANNER - Transaction Audit System
// ═══════════════════════════════════════════════════════════════════

/**
 * Run the Mistake Scanner to find transaction issues
 * Opens the MistakeReport.html modal with scan results
 * 
 * Valid sheets in the 2026 Launch Version:
 * - ACCOUNT 1 through ACCOUNT 10 (transaction sheets)
 * - INCOME TRANSACTIONS, EXPENSE TRANSACTIONS (aggregated views)
 * - INCOME LABELS, EXPENSE LABELS (category definitions)
 * - BACKEND (system configuration)
 * - YEARLY OVERVIEW, MONTHLY OVERVIEW, PROFIT & LOSS (reports)
 * - SAVINGS, BILL TRACKING, NEEDS & DESIRES (tracking)
 * - START HERE, LINKS (navigation)
 * - MOVED FROM PERSONAL (special)
 */
function runMistakeScanner() {
  try {
    var html = HtmlService.createHtmlOutputFromFile('MistakeReport')
      .setWidth(1200)
      .setHeight(800);
    SpreadsheetApp.getUi().showModalDialog(html, '🔍 Mistake Scanner Report');
  } catch (e) {
    Logger.log('runMistakeScanner error: ' + e.message);
    SpreadsheetApp.getUi().alert('Error opening mistake scanner: ' + e.message);
  }
}

/**
 * Get mistake scanner data - Scans all ACCOUNT sheets for issues
 * @returns {Object} - { totalTransactions, unlabeled, issues, errors }
 */
function getMistakeScannerData() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var results = {
      totalTransactions: 0,
      unlabeled: 0,
      issues: [],
      errors: []
    };
    
    // Only scan ACCOUNT sheets (ACCOUNT 1 through ACCOUNT 10)
    var accountSheets = [];
    for (var i = 1; i <= 10; i++) {
      var sheet = ss.getSheetByName('ACCOUNT ' + i);
      if (sheet) {
        accountSheets.push(sheet);
      }
    }
    
    // Scan each account sheet
    for (var s = 0; s < accountSheets.length; s++) {
      var sheet = accountSheets[s];
      var sheetName = sheet.getName();
      var lastRow = sheet.getLastRow();
      
      if (lastRow <= 10) continue; // No data (header is row 10)
      
      // Get data from rows 11 onwards
      // Columns: C=Date, D=Description, E=Amount, F=Category, G=SpecialLabel, H=Memo
      var data = sheet.getRange(11, 3, lastRow - 10, 6).getValues();
      
      for (var r = 0; r < data.length; r++) {
        var row = data[r];
        var rowNum = r + 11;
        var date = row[0];
        var description = row[1];
        var amount = row[2];
        var category = row[3];
        var specialLabel = row[4];
        
        // Skip empty rows
        if (!date && !amount) continue;
        
        results.totalTransactions++;
        
        // Check for unlabeled transactions (no category and no special label)
        if (!category && !specialLabel) {
          results.unlabeled++;
          results.issues.push({
            severity: 'medium',
            type: 'Unlabeled',
            sheet: sheetName,
            row: rowNum,
            description: String(description || '').substring(0, 50),
            amount: amount || 0
          });
        }
        
        // Check for missing date
        if (!date && amount) {
          results.errors.push({
            severity: 'high',
            type: 'Missing Date',
            sheet: sheetName,
            row: rowNum,
            description: String(description || '').substring(0, 50),
            amount: amount || 0
          });
        }
        
        // Check for missing amount
        if (date && !amount && amount !== 0) {
          results.errors.push({
            severity: 'high',
            type: 'Missing Amount',
            sheet: sheetName,
            row: rowNum,
            description: String(description || '').substring(0, 50),
            amount: 0
          });
        }
        
        // Check for suspiciously large amounts (over $50,000)
        if (Math.abs(amount) > 50000) {
          results.issues.push({
            severity: 'low',
            type: 'Large Amount',
            sheet: sheetName,
            row: rowNum,
            description: String(description || '').substring(0, 50),
            amount: amount
          });
        }
      }
    }
    
    Logger.log('Mistake Scanner: Found ' + results.totalTransactions + ' transactions, ' + 
               results.unlabeled + ' unlabeled, ' + results.errors.length + ' errors');
    
    return results;
    
  } catch (e) {
    Logger.log('getMistakeScannerData error: ' + e.message);
    throw new Error('Failed to scan for mistakes: ' + e.message);
  }
}

/**
 * Navigate to a specific transaction from mistake report
 * @param {string} sheetName - Name of the sheet
 * @param {number} row - Row number to navigate to
 */
function navigateToMistake(sheetName, row) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error('Sheet not found: ' + sheetName);
    }
    
    ss.setActiveSheet(sheet);
    sheet.getRange(row, 3).activate(); // Column C (Date)
    
    return { success: true };
    
  } catch (e) {
    Logger.log('navigateToMistake error: ' + e.message);
    throw new Error('Failed to navigate: ' + e.message);
  }
}
