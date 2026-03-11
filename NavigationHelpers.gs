/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NAVIGATION HELPERS
 * Donna Roggio LLC - Financial Management System
 * 
 * Functions to navigate to specific sheets and show success messages
 * Updated 2026: Removed Plaid references, streamlined navigation
 * 
 * References: ColumnConfig.gs for column definitions
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Navigate to INCOME TRANSACTIONS sheet
 */
function navigateToIncomeTransactions() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('INCOME TRANSACTIONS');
    
    if (!sheet) {
      // Try alternate names
      sheet = ss.getSheetByName('Income Transactions') || 
              ss.getSheetByName('INCOME') ||
              ss.getSheetByName('Income');
    }
    
    if (sheet) {
      sheet.activate();
      Logger.log('Navigated to INCOME TRANSACTIONS sheet');
      return { success: true };
    } else {
      Logger.log('ERROR: INCOME TRANSACTIONS sheet not found');
      return { success: false, error: 'Sheet not found' };
    }
    
  } catch (e) {
    Logger.log('ERROR navigating to INCOME TRANSACTIONS: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Navigate to EXPENSE TRANSACTIONS sheet
 */
function navigateToExpenseTransactions() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('EXPENSE TRANSACTIONS');
    
    if (!sheet) {
      sheet = ss.getSheetByName('Expense Transactions') || 
              ss.getSheetByName('EXPENSE') ||
              ss.getSheetByName('Expense');
    }
    
    if (sheet) {
      sheet.activate();
      Logger.log('Navigated to EXPENSE TRANSACTIONS sheet');
      return { success: true };
    } else {
      Logger.log('ERROR: EXPENSE TRANSACTIONS sheet not found');
      return { success: false, error: 'Sheet not found' };
    }
    
  } catch (e) {
    Logger.log('ERROR navigating to EXPENSE TRANSACTIONS: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Navigate to specific ACCOUNT sheet
 */
function navigateToAccountSheet(accountNumber) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = 'ACCOUNT ' + accountNumber;
    var sheet = ss.getSheetByName(sheetName);
    
    if (sheet) {
      sheet.activate();
      Logger.log('Navigated to ' + sheetName);
      return { success: true };
    } else {
      Logger.log('ERROR: ' + sheetName + ' not found');
      return { success: false, error: 'Sheet not found' };
    }
    
  } catch (e) {
    Logger.log('ERROR navigating to ACCOUNT sheet: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Navigate to any sheet by name
 */
function navigateToSheet(sheetName) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (sheet) {
      sheet.activate();
      Logger.log('Navigated to sheet: ' + sheetName);
      return { success: true };
    } else {
      Logger.log('ERROR: Sheet not found: ' + sheetName);
      return { success: false, error: 'Sheet not found' };
    }
    
  } catch (e) {
    Logger.log('ERROR navigating to sheet: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Navigate to DASHBOARD (show modal, not sheet)
 */
function navigateToDashboard() {
  try {
    // Show the dashboard modal instead of navigating to the sheet
    MM_showDashboard();
    Logger.log('Opened DASHBOARD modal');
    return { success: true };
  } catch (e) {
    Logger.log('ERROR opening dashboard modal: ' + e.toString());
    // Fallback to START HERE sheet navigation if modal fails
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName('START HERE') || ss.getSheetByName('YEARLY OVERVIEW');
      
      if (sheet) {
        sheet.activate();
        Logger.log('Navigated to fallback sheet: ' + sheet.getName());
        return { success: true };
      } else {
        Logger.log('ERROR: Fallback sheets not found');
        return { success: false, error: 'Sheet not found' };
      }
    } catch (fallbackError) {
      Logger.log('ERROR in fallback navigation: ' + fallbackError.toString());
      return { success: false, error: e.toString() };
    }
  }
}

/**
 * Get tutorial video URL from config
 */
function getTutorialVideoUrl() {
  try {
    return PLACEHOLDER_LINKS.TUTORIAL_VIDEO;
  } catch (e) {
    Logger.log('ERROR getting tutorial URL: ' + e.toString());
    return null;
  }
}

/**
 * Show bank connection success message (generic - no longer Plaid-specific)
 * Kept for backward compatibility
 * @deprecated Use showStripeSuccessMessage instead
 */
function showBankSuccessMessage(institutionName) {
  try {
    institutionName = institutionName || 'Your Bank';
    
    // Check if success message already shown in this session
    var cache = CacheService.getUserCache();
    var cacheKey = 'bank_success_shown_' + Session.getTemporaryActiveUserKey();
    var alreadyShown = cache.get(cacheKey);
    
    if (alreadyShown) {
      Logger.log('Bank success message already shown in this session, skipping duplicate');
      navigateToIncomeTransactions();
      return { success: true, skipped: true };
    }
    
    // Mark as shown (expires in 5 minutes)
    cache.put(cacheKey, 'true', 300);
    
    // Show a simple alert since we no longer use Plaid
    SpreadsheetApp.getUi().alert(
      '✓ Connection Successful!',
      institutionName + ' has been connected successfully.\n\n' +
      'Your transactions will appear in the ACCOUNT sheets.\n' +
      'Use the Categorization Modal to organize your data.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    Logger.log('Showed bank success message for: ' + institutionName);
    return { success: true };
    
  } catch (e) {
    Logger.log('ERROR showing bank success message: ' + e.toString());
    navigateToIncomeTransactions();
    return { success: false, error: e.toString() };
  }
}

/**
 * Show Stripe sync success message
 */
function showStripeSyncSuccessMessage(accountName, transactionCount) {
  try {
    accountName = accountName || 'Stripe';
    transactionCount = transactionCount || 0;
    
    SpreadsheetApp.getUi().alert(
      '✓ Stripe Sync Complete!',
      'Successfully synced ' + transactionCount + ' transactions from ' + accountName + '.\n\n' +
      'Use the Categorization Modal to review and categorize your new transactions.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    Logger.log('Showed Stripe success message: ' + transactionCount + ' transactions from ' + accountName);
    return { success: true };
    
  } catch (e) {
    Logger.log('ERROR showing Stripe success message: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Get all ACCOUNT sheets for navigation.
 * Uses AccountNameManager to include renamed tabs.
 */
function getAccountSheetsForNavigation() {
  try {
    // Use AccountNameManager when available
    if (typeof getAccountTabObjects === 'function') {
      try {
        var tabs = getAccountTabObjects();
        var names = tabs.map(function(t) { return t.sheetName; });
        Logger.log('Found ' + names.length + ' account sheets (incl. renamed)');
        return names;
      } catch(anmErr) {
        Logger.log('[NavigationHelpers] AccountNameManager error, falling back: ' + anmErr.message);
      }
    }

    // Fallback: original logic
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    var accountSheets = [];
    for (var i = 0; i < sheets.length; i++) {
      var name = sheets[i].getName();
      if (name.indexOf('ACCOUNT') === 0) accountSheets.push(name);
    }
    accountSheets.sort(function(a, b) {
      var numA = parseInt(a.replace('ACCOUNT ', '')) || 0;
      var numB = parseInt(b.replace('ACCOUNT ', '')) || 0;
      return numA - numB;
    });
    Logger.log('Found ' + accountSheets.length + ' ACCOUNT sheets');
    return accountSheets;
  } catch (e) {
    Logger.log('ERROR getting ACCOUNT sheets: ' + e.toString());
    return [];
  }
}

/**
 * Navigate to next/previous account
 */
function navigateToAdjacentAccount(direction) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var currentSheet = ss.getActiveSheet();
    var currentName = currentSheet.getName();
    
    // Check if we're on an ACCOUNT sheet (incl. renamed tabs)
    var isAcct = typeof isAccountTab === 'function' ? isAccountTab(currentName) : (currentName.indexOf('ACCOUNT') === 0);
    if (!isAcct) {
      Logger.log('Not on an ACCOUNT sheet, cannot navigate');
      return { success: false, error: 'Not on an ACCOUNT sheet' };
    }
    
    var accountSheets = getAccountSheetsForNavigation();
    var currentIndex = accountSheets.indexOf(currentName);
    
    if (currentIndex === -1) {
      return { success: false, error: 'Current sheet not found in ACCOUNT list' };
    }
    
    var newIndex;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % accountSheets.length;
    } else {
      newIndex = (currentIndex - 1 + accountSheets.length) % accountSheets.length;
    }
    
    var targetSheet = ss.getSheetByName(accountSheets[newIndex]);
    if (targetSheet) {
      targetSheet.activate();
      Logger.log('Navigated to ' + accountSheets[newIndex]);
      return { success: true, sheetName: accountSheets[newIndex] };
    }
    
    return { success: false, error: 'Target sheet not found' };
    
  } catch (e) {
    Logger.log('ERROR navigating to adjacent account: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPRECATED FUNCTIONS - Kept for backward compatibility
// These functions now redirect to the appropriate non-Plaid alternatives
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @deprecated Plaid integration removed in 2026
 * Use showBankSuccessMessage() or showStripeSyncSuccessMessage() instead
 */
function showPlaidSuccessMessage(institutionName) {
  Logger.log('DEPRECATED: showPlaidSuccessMessage called. Plaid integration removed in 2026.');
  return showBankSuccessMessage(institutionName);
}
