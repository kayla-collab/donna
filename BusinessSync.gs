/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * BUSINESS SYNC SYSTEM
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Handles synchronization between Personal and Business Google Sheets:
 * - Syncs business income categories (BACKEND AC3)
 * - Syncs business expense categories (BACKEND AD3)
 * - Syncs transactions via BACKEND O-U (outgoing) and V-AB (incoming)
 * - Applies currency conversion when needed
 * 
 * BACKEND STRUCTURE (CORRECTED):
 * O3:U - OUTGOING transactions (queued when Column G is set in categorization)
 *   O (15) = Account Name
 *   P (16) = Date
 *   Q (17) = Description
 *   R (18) = Amount
 *   S (19) = Category (from Column G)
 *   T (20) = Memo
 *   U (21) = Need/Desire
 * 
 * V3:AB - INCOMING transactions (pulled from linked sheet's O-U)
 *   V (22) = Account Name
 *   W (23) = Date
 *   X (24) = Description
 *   Y (25) = Amount
 *   Z (26) = Category
 *   AA (27) = Memo
 *   AB (28) = Need/Desire
 * 
 * AC3 - Business Income Categories (from business sheet)
 * AD3 - Business Expense Categories (from business sheet)
 */

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Business sync configuration
 * 
 * BACKEND sheet column structure (CORRECTED - verified from user):
 * 
 * OUTGOING queue (O-U, cols 15-21): Transactions queued when Column G is set
 *   O (15) = Account Name (source ACCOUNT sheet name)
 *   P (16) = Date
 *   Q (17) = Description
 *   R (18) = Amount
 *   S (19) = Category (the value from Column G)
 *   T (20) = Memo
 *   U (21) = Need/Desire
 * 
 * INCOMING data (V-AB, cols 22-28): Pulled from linked sheet's O-U
 *   V (22) = Account Name
 *   W (23) = Date
 *   X (24) = Description
 *   Y (25) = Amount
 *   Z (26) = Category
 *   AA (27) = Memo
 *   AB (28) = Need/Desire
 * 
 * Business Categories:
 *   AC (29): Business Income Categories
 *   AD (30): Business Expense Categories
 */
var BUSINESS_SYNC_CONFIG = {
  // OUTGOING queue columns (O-U) - where we write when Column G is set
  OUTGOING_START_COL: 15,        // Column O
  OUTGOING_END_COL: 21,          // Column U
  OUTGOING_START_ROW: 3,
  OUTGOING_NUM_COLS: 7,          // O through U = 7 columns
  
  // Column indices within O-U (0-based from O)
  OUT_ACCOUNT_IDX: 0,            // O = Account Name
  OUT_DATE_IDX: 1,               // P = Date
  OUT_DESC_IDX: 2,               // Q = Description
  OUT_AMOUNT_IDX: 3,             // R = Amount
  OUT_CATEGORY_IDX: 4,           // S = Category
  OUT_MEMO_IDX: 5,               // T = Memo
  OUT_NEED_IDX: 6,               // U = Need/Desire
  
  // INCOMING data columns (V-AB) - where we write synced data from linked sheet
  INCOMING_START_COL: 22,        // Column V
  INCOMING_END_COL: 28,          // Column AB
  INCOMING_START_ROW: 3,
  INCOMING_NUM_COLS: 7,          // V through AB = 7 columns
  
  // Legacy aliases for backward compatibility
  MOVED_TO_PERSONAL_START_COL: 15,
  MOVED_TO_PERSONAL_END_COL: 21,
  MOVED_TO_PERSONAL_START_ROW: 3,
  MOVED_FROM_BIZ_START_COL: 22,
  MOVED_FROM_BIZ_END_COL: 28,
  MOVED_FROM_BIZ_START_ROW: 3,
  MOVED_FROM_BIZ_NUM_COLS: 7,
  
  // Business category columns in BACKEND
  BUSINESS_INCOME_CAT_COL: 29,   // Column AC
  BUSINESS_EXPENSE_CAT_COL: 30,  // Column AD
  BUSINESS_CAT_START_ROW: 3,
  
  // Storage keys
  BUSINESS_ACCOUNTS_KEY: 'mm_business_accounts',
  LAST_SYNC_KEY: 'mm_business_last_sync',
  
  // Sync settings
  AUTO_SYNC_ON_LABEL: true,
  SYNC_BATCH_SIZE: 100
};

// ═══════════════════════════════════════════════════════════════════
// MAIN SYNC FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * NOTE: The main syncAllBusinessData function is now in AdminSettings.gs
 * This file contains helper functions for category sync and transaction reading
 */

/**
 * Sync all business data - LEGACY WRAPPER
 * Delegates to AdminSettings.syncAllBusinessData for the main sync logic
 * This wrapper allows non-admin users to trigger sync as well
 * @returns {Object} Result with sync status
 */
function syncBusinessDataForUser() {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    
    // Allow both admin and registered users to trigger sync
    // (Admin links accounts, but sync can happen for any user)
    
    var props = _mm_safeDocProps_();
    if (!props) {
      return { success: false, error: 'Cannot access properties' };
    }
    
    // Get business accounts
    var accountsJson = props.getProperty(BUSINESS_SYNC_CONFIG.BUSINESS_ACCOUNTS_KEY);
    if (!accountsJson) {
      return { success: false, error: 'No business accounts configured' };
    }
    
    var accounts = JSON.parse(accountsJson);
    if (!Array.isArray(accounts) || accounts.length === 0) {
      return { success: false, error: 'No business accounts to sync' };
    }
    
    Logger.log('[BUSINESS SYNC] Starting sync for ' + accounts.length + ' account(s)');
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var backendSheet = ss.getSheetByName('BACKEND');
    
    if (!backendSheet) {
      return { success: false, error: 'BACKEND sheet not found' };
    }
    
    var results = {
      categoriesSynced: 0,
      transactionsSynced: 0,
      errors: []
    };
    
    // Sync each business account
    for (var i = 0; i < accounts.length; i++) {
      var account = accounts[i];
      // Get conversion rate from account (default 1.0)
      var conversionRate = parseFloat(account.conversionRate) || 1.0;
      Logger.log('[BUSINESS SYNC] Processing account: ' + account.name + ' (Conversion Rate: ' + conversionRate + ')');
      
      try {
        // Sync categories
        var catResult = syncBusinessCategories_(account, backendSheet);
        results.categoriesSynced += catResult.count || 0;
        
        // Sync moved to personal transactions (pass conversion rate)
        var txResult = syncMovedToPersonal_(account, backendSheet, conversionRate);
        results.transactionsSynced += txResult.count || 0;
        
      } catch (accError) {
        Logger.log('[BUSINESS SYNC] Error with account ' + account.name + ': ' + accError.message);
        results.errors.push(account.name + ': ' + accError.message);
      }
    }
    
    // Update last sync time
    props.setProperty(BUSINESS_SYNC_CONFIG.LAST_SYNC_KEY, new Date().toISOString());
    
    Logger.log('[BUSINESS SYNC] Complete. Categories: ' + results.categoriesSynced + ', Transactions: ' + results.transactionsSynced);
    
    return {
      success: true,
      message: 'Synced ' + results.transactionsSynced + ' transactions, ' + results.categoriesSynced + ' categories',
      results: results
    };
    
  } catch (e) {
    Logger.log('[BUSINESS SYNC] Error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// TRANSACTION QUEUE SYSTEM - Queue to BACKEND O-U when Column G is set
// ═══════════════════════════════════════════════════════════════════

/**
 * Queue a transaction to BACKEND O-U when it's categorized with Column G
 * This is called from CategorizationSystem.gs when saving changes
 * 
 * BACKEND O-U Column Structure:
 *   O (15) = Account Name
 *   P (16) = Date
 *   Q (17) = Description
 *   R (18) = Amount
 *   S (19) = Category (from Column G)
 *   T (20) = Memo
 *   U (21) = Need/Desire
 * 
 * @param {string} accountName - Source ACCOUNT sheet name
 * @param {Object} transaction - Transaction data from categorization
 * @returns {Object} Result with success status
 */
function queueTransactionToBackendOU(accountName, transaction) {
  try {
    Logger.log('[QUEUE] Queuing transaction to BACKEND O-U from ' + accountName);
    Logger.log('[QUEUE] Transaction: ' + JSON.stringify(transaction));
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var backendSheet = ss.getSheetByName('BACKEND');
    
    if (!backendSheet) {
      Logger.log('[QUEUE] BACKEND sheet not found');
      return { success: false, error: 'BACKEND sheet not found' };
    }
    
    // Find next empty row in O-U section
    var startRow = BUSINESS_SYNC_CONFIG.OUTGOING_START_ROW; // Row 3
    var startCol = BUSINESS_SYNC_CONFIG.OUTGOING_START_COL; // Column O (15)
    var numCols = BUSINESS_SYNC_CONFIG.OUTGOING_NUM_COLS;   // 7 columns
    
    // Get existing data to find next empty row
    var lastRow = backendSheet.getLastRow();
    var nextRow = startRow;
    
    if (lastRow >= startRow) {
      // Read column O to find first empty row
      var existingData = backendSheet.getRange(startRow, startCol, lastRow - startRow + 1, 1).getValues();
      for (var i = 0; i < existingData.length; i++) {
        if (existingData[i][0] && existingData[i][0] !== '') {
          nextRow = startRow + i + 1;
        }
      }
      // If last row had data, use next row
      if (existingData.length > 0 && existingData[existingData.length - 1][0]) {
        nextRow = startRow + existingData.length;
      }
    }
    
    // Prepare row data in correct order: Account|Date|Desc|Amount|Category|Memo|Need
    var rowData = [
      accountName,                                    // O - Account Name
      transaction.date || '',                         // P - Date
      transaction.description || '',                  // Q - Description
      transaction.amount || 0,                        // R - Amount
      transaction.businessCategory || transaction.category || '', // S - Category (from Column G)
      transaction.memo || '',                         // T - Memo
      transaction.needDesire || ''                    // U - Need/Desire
    ];
    
    // Write to BACKEND O-U
    backendSheet.getRange(nextRow, startCol, 1, numCols).setValues([rowData]);
    
    Logger.log('[QUEUE] Queued transaction to row ' + nextRow + ': ' + transaction.description);
    
    return { success: true, row: nextRow };
    
  } catch (e) {
    Logger.log('[QUEUE] Error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Queue multiple transactions to BACKEND O-U (batch operation)
 * @param {string} accountName - Source ACCOUNT sheet name
 * @param {Array} transactions - Array of transaction objects
 * @returns {Object} Result with count of queued transactions
 */
function queueTransactionsToBackendOU(accountName, transactions) {
  try {
    if (!transactions || transactions.length === 0) {
      return { success: true, count: 0 };
    }
    
    Logger.log('[QUEUE BATCH] Queuing ' + transactions.length + ' transactions from ' + accountName);
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var backendSheet = ss.getSheetByName('BACKEND');
    
    if (!backendSheet) {
      return { success: false, error: 'BACKEND sheet not found' };
    }
    
    var startRow = BUSINESS_SYNC_CONFIG.OUTGOING_START_ROW;
    var startCol = BUSINESS_SYNC_CONFIG.OUTGOING_START_COL;
    var numCols = BUSINESS_SYNC_CONFIG.OUTGOING_NUM_COLS;
    
    // Find next empty row
    var lastRow = backendSheet.getLastRow();
    var nextRow = startRow;
    
    if (lastRow >= startRow) {
      var existingData = backendSheet.getRange(startRow, startCol, lastRow - startRow + 1, 1).getValues();
      for (var i = 0; i < existingData.length; i++) {
        if (existingData[i][0] && existingData[i][0] !== '') {
          nextRow = startRow + i + 1;
        }
      }
      if (existingData.length > 0 && existingData[existingData.length - 1][0]) {
        nextRow = startRow + existingData.length;
      }
    }
    
    // Prepare batch data: Account|Date|Desc|Amount|Category|Memo|Need
    var batchData = [];
    for (var j = 0; j < transactions.length; j++) {
      var tx = transactions[j];
      batchData.push([
        accountName,
        tx.date || '',
        tx.description || '',
        tx.amount || 0,
        tx.businessCategory || tx.category || '',
        tx.memo || '',
        tx.needDesire || ''
      ]);
    }
    
    // Write batch to BACKEND O-U
    backendSheet.getRange(nextRow, startCol, batchData.length, numCols).setValues(batchData);
    
    Logger.log('[QUEUE BATCH] Queued ' + batchData.length + ' transactions starting at row ' + nextRow);
    
    return { success: true, count: batchData.length };
    
  } catch (e) {
    Logger.log('[QUEUE BATCH] Error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// CATEGORY SYNC
// ═══════════════════════════════════════════════════════════════════

/**
 * Category source configuration for business sheets
 * Uses SAME layout as personal sheets (verified from CategorizationSystem.gs)
 * 
 * IMPORTANT: We only read SUBCATEGORIES, not main category labels!
 * Main category labels like "Housing (H)" are just groupings, not actual categories.
 * 
 * INCOME LABELS sheet:
 *   - Data starts: Row 14
 *   - Subcategories ONLY: Columns J-N (10-14) - "Label 1" through "Label 5"
 *   - DO NOT read Column G (main category names)
 * 
 * EXPENSE LABELS sheet:
 *   - Data starts: Row 27
 *   - Subcategories ONLY: Columns D-M (4-13) - "Sublabel 1" through "Sublabel 10"
 *   - DO NOT read Column C (main category names)
 */
/**
 * Sync business categories from a business account
 * 
 * SIMPLE DIRECT READ - No filtering, just pull exact cell ranges:
 *   INCOME LABELS:  J14:N18 (cols 10-14, rows 14-18) = 5 rows x 5 cols
 *   EXPENSE LABELS: D26:M65 (cols 4-13, rows 26-65) = 40 rows x 10 cols
 * 
 * Writes to local BACKEND columns AC (income) and AD (expenses)
 * 
 * @param {Object} account - Business account config
 * @param {Sheet} backendSheet - The local BACKEND sheet
 */
function syncBusinessCategories_(account, backendSheet) {
  try {
    if (!account.sheetId) {
      Logger.log('[CATEGORY SYNC] No sheet ID for account: ' + account.name);
      return { count: 0 };
    }
    
    Logger.log('[CATEGORY SYNC] Starting category sync for: ' + account.name);
    
    // Open the business sheet
    var businessSS = SpreadsheetApp.openById(account.sheetId);
    Logger.log('[CATEGORY SYNC] Opened business spreadsheet: ' + businessSS.getName());
    
    var incomeCategories = [];
    var expenseCategories = [];
    
    // ═══════════════════════════════════════════════════════════════════
    // READ INCOME CATEGORIES from INCOME LABELS sheet
    // EXACT RANGE: J14:N18 (5 rows x 5 columns)
    // ═══════════════════════════════════════════════════════════════════
    try {
      var incomeLabels = businessSS.getSheetByName('INCOME LABELS');
      if (incomeLabels) {
        Logger.log('[CATEGORY SYNC] Found INCOME LABELS sheet');
        
        // Read exact range J14:N18
        // J=10, N=14, Row 14-18 = 5 rows, 5 cols
        var values = incomeLabels.getRange('J14:N18').getDisplayValues();
        Logger.log('[CATEGORY SYNC] Reading INCOME LABELS J14:N18');
        
        var seen = {};
        for (var row = 0; row < values.length; row++) {
          for (var col = 0; col < values[row].length; col++) {
            var val = String(values[row][col] || '').trim();
            // Only skip empty cells - include everything else
            if (val && !seen[val]) {
              incomeCategories.push(val);
              seen[val] = true;
            }
          }
        }
        
        Logger.log('[CATEGORY SYNC] Found ' + incomeCategories.length + ' income categories');
      } else {
        Logger.log('[CATEGORY SYNC] INCOME LABELS sheet not found');
      }
    } catch (incErr) {
      Logger.log('[CATEGORY SYNC] Error reading income categories: ' + incErr.message);
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // READ EXPENSE CATEGORIES from EXPENSE LABELS sheet
    // EXACT RANGE: D26:M65 (40 rows x 10 columns)
    // ═══════════════════════════════════════════════════════════════════
    try {
      var expenseLabels = businessSS.getSheetByName('EXPENSE LABELS');
      if (expenseLabels) {
        Logger.log('[CATEGORY SYNC] Found EXPENSE LABELS sheet');
        
        // Read exact range D26:M65
        // D=4, M=13, Row 26-65 = 40 rows, 10 cols
        var expValues = expenseLabels.getRange('D26:M65').getDisplayValues();
        Logger.log('[CATEGORY SYNC] Reading EXPENSE LABELS D26:M65');
        
        var expSeen = {};
        for (var expRow = 0; expRow < expValues.length; expRow++) {
          for (var expCol = 0; expCol < expValues[expRow].length; expCol++) {
            var expVal = String(expValues[expRow][expCol] || '').trim();
            // Only skip empty cells - include everything else
            if (expVal && !expSeen[expVal]) {
              expenseCategories.push(expVal);
              expSeen[expVal] = true;
            }
          }
        }
        
        Logger.log('[CATEGORY SYNC] Found ' + expenseCategories.length + ' expense categories');
      } else {
        Logger.log('[CATEGORY SYNC] EXPENSE LABELS sheet not found');
      }
    } catch (expErr) {
      Logger.log('[CATEGORY SYNC] Error reading expense categories: ' + expErr.message);
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // WRITE CATEGORIES TO LOCAL BACKEND
    // Column AC (29) = Income categories (one per row, starting row 3)
    // Column AD (30) = Expense categories (one per row, starting row 3)
    // ═══════════════════════════════════════════════════════════════════
    var startRow = BUSINESS_SYNC_CONFIG.BUSINESS_CAT_START_ROW; // Row 3
    
    // Write income categories to column AC
    if (incomeCategories.length > 0) {
      var incomeData = incomeCategories.map(function(cat) { return [cat]; });
      backendSheet.getRange(startRow, BUSINESS_SYNC_CONFIG.BUSINESS_INCOME_CAT_COL, incomeCategories.length, 1)
        .setValues(incomeData);
      Logger.log('[CATEGORY SYNC] Wrote ' + incomeCategories.length + ' income categories to column AC');
    }
    
    // Write expense categories to column AD
    if (expenseCategories.length > 0) {
      var expenseData = expenseCategories.map(function(cat) { return [cat]; });
      backendSheet.getRange(startRow, BUSINESS_SYNC_CONFIG.BUSINESS_EXPENSE_CAT_COL, expenseCategories.length, 1)
        .setValues(expenseData);
      Logger.log('[CATEGORY SYNC] Wrote ' + expenseCategories.length + ' expense categories to column AD');
    }
    
    var totalCount = incomeCategories.length + expenseCategories.length;
    Logger.log('[CATEGORY SYNC] Complete. Total categories synced: ' + totalCount);
    
    return { count: totalCount, income: incomeCategories.length, expense: expenseCategories.length };
    
  } catch (e) {
    Logger.log('[CATEGORY SYNC] Error: ' + e.message + '\nStack: ' + e.stack);
    return { count: 0, error: e.message };
  }
}

/**
 * Check if a cell value is a spreadsheet error (#N/A, #REF!, #VALUE!, etc.)
 * @param {any} value - The cell value to check
 * @returns {boolean} True if the value is an error
 */
function isErrorValue_(value) {
  if (!value) return false;
  var strVal = String(value);
  return strVal === '#N/A' || 
         strVal === '#REF!' || 
         strVal === '#VALUE!' || 
         strVal === '#NAME?' ||
         strVal === '#DIV/0!' ||
         strVal === '#NULL!' ||
         strVal === '#NUM!' ||
         strVal.indexOf('#ERROR') !== -1 ||
         strVal.indexOf('#REF') !== -1;
}

// ═══════════════════════════════════════════════════════════════════
// MOVED TO PERSONAL SYNC
// ═══════════════════════════════════════════════════════════════════

/**
 * Sync "Moved to Personal" transactions from a business account
 * Uses multiple strategies to find data:
 * 1. MOVED TO PERSONAL or MOVED FROM PERSONAL sheet (dedicated sheet)
 * 2. BACKEND columns O-U (Moved to Personal section in business BACKEND)
 * 3. ACCOUNT sheets with transactions marked for personal
 * 
 * @param {Object} account - Business account config
 * @param {Sheet} backendSheet - The local BACKEND sheet (where we write)
 * @param {number} conversionRate - Multiplier for transaction amounts (default 1.0)
 */
function syncMovedToPersonal_(account, backendSheet, conversionRate) {
  // Ensure conversionRate is a valid number
  conversionRate = parseFloat(conversionRate) || 1.0;
  Logger.log('[MOVED SYNC] === Starting syncMovedToPersonal_ for ' + (account ? account.name : 'NULL ACCOUNT') + ' ===');
  
  try {
    if (!account.sheetId) {
      Logger.log('[MOVED SYNC] No sheet ID for account: ' + account.name);
      return { count: 0 };
    }
    
    Logger.log('[MOVED SYNC] Opening business sheet ID: ' + account.sheetId);
    
    // Open the business sheet
    var businessSS = SpreadsheetApp.openById(account.sheetId);
    Logger.log('[MOVED SYNC] Successfully opened: ' + businessSS.getName());
    
    var rawData = [];
    var sourceFound = '';
    
    // ═══════════════════════════════════════════════════════════════════
    // STRATEGY 1: Look for dedicated MOVED TO PERSONAL sheet
    // ═══════════════════════════════════════════════════════════════════
    var movedSheet = businessSS.getSheetByName('MOVED TO PERSONAL');
    if (!movedSheet) {
      movedSheet = businessSS.getSheetByName('MOVED FROM PERSONAL');
    }
    
    if (movedSheet) {
      var lastRow = movedSheet.getLastRow();
      if (lastRow >= 2) {
        rawData = movedSheet.getRange(2, 1, lastRow - 1, 10).getValues();
        sourceFound = 'MOVED sheet';
        Logger.log('[MOVED SYNC] Found dedicated sheet with ' + rawData.length + ' rows');
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // STRATEGY 2: Look in BACKEND columns O-U (Moved to Personal section)
    // ═══════════════════════════════════════════════════════════════════
    Logger.log('[MOVED SYNC] Strategy 2: Checking BACKEND O-U...');
    if (rawData.length === 0) {
      var bizBackend = businessSS.getSheetByName('BACKEND');
      Logger.log('[MOVED SYNC] BACKEND sheet found: ' + (bizBackend ? 'YES' : 'NO'));
      
      if (bizBackend) {
        var lastBizRow = bizBackend.getLastRow();
        var startRow = BUSINESS_SYNC_CONFIG.MOVED_TO_PERSONAL_START_ROW; // Row 3
        Logger.log('[MOVED SYNC] BACKEND lastRow=' + lastBizRow + ', startRow=' + startRow);
        Logger.log('[MOVED SYNC] Reading columns ' + BUSINESS_SYNC_CONFIG.MOVED_TO_PERSONAL_START_COL + ' to ' + BUSINESS_SYNC_CONFIG.MOVED_TO_PERSONAL_END_COL);
        
        if (lastBizRow >= startRow) {
          // Read O:U from business BACKEND
          var numCols = BUSINESS_SYNC_CONFIG.MOVED_TO_PERSONAL_END_COL - BUSINESS_SYNC_CONFIG.MOVED_TO_PERSONAL_START_COL + 1;
          Logger.log('[MOVED SYNC] Reading range: Row ' + startRow + ', Col ' + BUSINESS_SYNC_CONFIG.MOVED_TO_PERSONAL_START_COL + ', Rows: ' + (lastBizRow - startRow + 1) + ', Cols: ' + numCols);
          
          var backendRange = bizBackend.getRange(
            startRow, 
            BUSINESS_SYNC_CONFIG.MOVED_TO_PERSONAL_START_COL,  // Column O (15)
            lastBizRow - startRow + 1, 
            numCols  // O through U = 7 columns
          );
          rawData = backendRange.getValues();
          sourceFound = 'BACKEND O:U';
          Logger.log('[MOVED SYNC] Read ' + rawData.length + ' rows from BACKEND O:U');
          
          // Log first few rows to see what we got
          for (var dbg = 0; dbg < Math.min(3, rawData.length); dbg++) {
            Logger.log('[MOVED SYNC] Sample row ' + dbg + ': ' + JSON.stringify(rawData[dbg]));
          }
        } else {
          Logger.log('[MOVED SYNC] BACKEND lastRow (' + lastBizRow + ') < startRow (' + startRow + '), skipping');
        }
      }
    } else {
      Logger.log('[MOVED SYNC] Skipping Strategy 2, already have ' + rawData.length + ' rows from Strategy 1');
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // STRATEGY 3: Look in ACCOUNT sheets for "Moved to Personal" labels
    // ═══════════════════════════════════════════════════════════════════
    if (rawData.length === 0) {
      var sheets = businessSS.getSheets();
      for (var s = 0; s < sheets.length; s++) {
        var sheet = sheets[s];
        var sheetName = sheet.getName();
        
        // Check if it's an ACCOUNT sheet
        if (/^ACCOUNT\s*\d+$/i.test(sheetName)) {
          try {
            var lastAccRow = sheet.getLastRow();
            if (lastAccRow > 11) {
              // Read columns C-L (Date to Needs Correction) starting at row 11
              var accData = sheet.getRange(11, 3, lastAccRow - 10, 10).getValues();
              
              for (var m = 0; m < accData.length; m++) {
                var accRow = accData[m];
                // Check column G (index 4) for "Moved to Personal" special label
                var specialLabel = String(accRow[4] || '').toLowerCase();
                if (specialLabel.indexOf('moved to personal') !== -1 ||
                    specialLabel.indexOf('personal') !== -1) {
                  // Map to expected format: Date, Description, Amount, Category, Memo...
                  rawData.push([
                    accRow[0],  // Date (C)
                    accRow[1],  // Description (D)
                    accRow[2],  // Amount (E)
                    accRow[3],  // Personal Category (F)
                    accRow[5],  // Memo (H)
                    sheetName,  // Source account
                    '',         // Extra
                    '',
                    '',
                    ''
                  ]);
                }
              }
            }
          } catch (accErr) {
            Logger.log('[MOVED SYNC] Error reading ' + sheetName + ': ' + accErr.message);
          }
        }
      }
      if (rawData.length > 0) {
        sourceFound = 'ACCOUNT sheets';
        Logger.log('[MOVED SYNC] Found ' + rawData.length + ' transactions from ACCOUNT sheets');
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PROCESS AND FILTER TRANSACTIONS
    // ═══════════════════════════════════════════════════════════════════
    if (rawData.length === 0) {
      Logger.log('[MOVED SYNC] No transactions found in any source for ' + account.name);
      return { count: 0 };
    }
    
    Logger.log('[MOVED SYNC] Processing ' + rawData.length + ' raw rows from ' + sourceFound);
    
    // Get existing transactions to avoid duplicates
    var existingIds = getExistingMovedIds_(backendSheet);
    
    // Process and filter transactions
    var newTransactions = [];
    
    for (var i = 0; i < rawData.length; i++) {
      var row = rawData[i];
      var date = row[0];
      var description = String(row[1] || '').trim();
      var amount = parseFloat(row[2]) || 0;
      var category = String(row[3] || '').trim();
      var memo = String(row[4] || '').trim();
      
      // Skip rows with error values (#N/A, #REF!, #VALUE!, etc.)
      if (isErrorValue_(date) || isErrorValue_(description) || isErrorValue_(row[2])) {
        Logger.log('[MOVED SYNC] Skipping row ' + i + ' with error values');
        continue;
      }
      
      // Skip empty rows (no date AND no amount)
      if (!date && amount === 0) continue;
      
      // Skip rows with only headers or label text
      if (typeof date === 'string' && date.toLowerCase().indexOf('date') !== -1) continue;
      
      // Create unique ID to avoid duplicates
      var txId = createTransactionId_(date, description, amount);
      if (existingIds[txId]) {
        Logger.log('[MOVED SYNC] Skipping duplicate: ' + txId);
        continue;
      }
      
      // Apply conversion rate to amount
      var convertedAmount = amount;
      if (conversionRate !== 1.0) {
        convertedAmount = amount * conversionRate;
      }
      
      newTransactions.push({
        date: date,
        description: description,
        amount: convertedAmount,
        category: category,
        memo: memo,
        accountName: account.name,
        color: '' // Optional formatting
      });
    }
    
    Logger.log('[MOVED SYNC] Found ' + newTransactions.length + ' new transactions to sync');
    
    // Write new transactions to BACKEND columns V-AB (Moved From Business section)
    if (newTransactions.length > 0) {
      writeMovedTransactions_(backendSheet, newTransactions);
      Logger.log('[MOVED SYNC] Successfully wrote ' + newTransactions.length + ' transactions');
    }
    
    return { count: newTransactions.length };
    
  } catch (e) {
    Logger.log('[MOVED SYNC] Error: ' + e.message + '\nStack: ' + e.stack);
    return { count: 0, error: e.message };
  }
}

/**
 * Get existing moved transaction IDs to avoid duplicates
 * Reads from "Moved From Business" section (columns V-X for Date, Description, Amount)
 */
function getExistingMovedIds_(backendSheet) {
  var ids = {};
  
  try {
    var lastRow = backendSheet.getLastRow();
    var startRow = BUSINESS_SYNC_CONFIG.MOVED_FROM_BIZ_START_ROW;
    var startCol = BUSINESS_SYNC_CONFIG.MOVED_FROM_BIZ_START_COL;
    
    if (lastRow < startRow) return ids;
    
    // Read existing data from columns V-X (Date, Description, Amount)
    var data = backendSheet.getRange(startRow, startCol, lastRow - startRow + 1, 3).getValues();
    
    for (var i = 0; i < data.length; i++) {
      var date = data[i][0];
      var desc = String(data[i][1] || '').trim();
      var amount = parseFloat(data[i][2]) || 0;
      
      if (date) {
        var id = createTransactionId_(date, desc, amount);
        ids[id] = true;
      }
    }
  } catch (e) {
    Logger.log('[MOVED SYNC] Error getting existing IDs: ' + e.message);
  }
  
  return ids;
}

/**
 * Create a unique transaction ID for deduplication
 */
function createTransactionId_(date, description, amount) {
  var dateStr = '';
  if (date instanceof Date) {
    dateStr = date.toISOString().split('T')[0];
  } else {
    dateStr = String(date);
  }
  return dateStr + '_' + description.substring(0, 20) + '_' + amount.toFixed(2);
}

/**
 * Write moved transactions to BACKEND sheet
 * Writes to "Moved From Business" section (columns V-AB)
 * 
 * Column Layout:
 *   V (22): Date
 *   W (23): Description
 *   X (24): Amount
 *   Y (25): Category
 *   Z (26): Memo
 *   AA (27): Source Account Name
 *   AB (28): Extra/Notes (optional)
 */
function writeMovedTransactions_(backendSheet, transactions) {
  try {
    // Find the next empty row starting from V3 (Moved From Business section)
    var startRow = BUSINESS_SYNC_CONFIG.MOVED_FROM_BIZ_START_ROW;
    var startCol = BUSINESS_SYNC_CONFIG.MOVED_FROM_BIZ_START_COL;
    var numCols = BUSINESS_SYNC_CONFIG.MOVED_FROM_BIZ_NUM_COLS || 7;
    
    // Get current data to find last used row
    var lastRow = backendSheet.getLastRow();
    var dataRange = backendSheet.getRange(startRow, startCol, Math.max(1, lastRow - startRow + 1), 1);
    var existingData = dataRange.getValues();
    
    var nextRow = startRow;
    for (var i = 0; i < existingData.length; i++) {
      if (existingData[i][0] && existingData[i][0] !== '') {
        nextRow = startRow + i + 1;
      }
    }
    
    // Prepare data for writing
    // Columns: V=Date, W=Description, X=Amount, Y=Category, Z=Memo, AA=AccountName, AB=Extra
    var writeData = [];
    for (var j = 0; j < transactions.length; j++) {
      var tx = transactions[j];
      writeData.push([
        tx.date,
        tx.description,
        tx.amount,
        tx.category,        // Category before memo for better organization
        tx.memo,
        tx.accountName,
        tx.color || ''      // Extra/notes field
      ]);
    }
    
    // Write the data
    if (writeData.length > 0) {
      backendSheet.getRange(nextRow, startCol, writeData.length, numCols).setValues(writeData);
      Logger.log('[MOVED SYNC] Wrote ' + writeData.length + ' transactions to columns V-AB starting at row ' + nextRow);
    }
    
  } catch (e) {
    Logger.log('[MOVED SYNC] Error writing transactions: ' + e.message);
    throw e;
  }
}

// ═══════════════════════════════════════════════════════════════════
// CATEGORY RETRIEVAL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get business income categories from BACKEND
 * @returns {Array} Array of category strings
 */
function getBusinessIncomeCategories() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var backendSheet = ss.getSheetByName('BACKEND');
    
    if (!backendSheet) return [];
    
    var value = backendSheet.getRange(BUSINESS_SYNC_CONFIG.BUSINESS_CAT_START_ROW, 
                                       BUSINESS_SYNC_CONFIG.BUSINESS_INCOME_CAT_COL).getValue();
    
    if (!value || value === '') return [];
    
    return String(value).split('|').filter(function(cat) {
      return cat && cat.trim() !== '';
    });
    
  } catch (e) {
    Logger.log('[BUSINESS SYNC] Error getting income categories: ' + e.message);
    return [];
  }
}

/**
 * Get business expense categories from BACKEND
 * @returns {Array} Array of category strings
 */
function getBusinessExpenseCategories() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var backendSheet = ss.getSheetByName('BACKEND');
    
    if (!backendSheet) return [];
    
    var value = backendSheet.getRange(BUSINESS_SYNC_CONFIG.BUSINESS_CAT_START_ROW, 
                                       BUSINESS_SYNC_CONFIG.BUSINESS_EXPENSE_CAT_COL).getValue();
    
    if (!value || value === '') return [];
    
    return String(value).split('|').filter(function(cat) {
      return cat && cat.trim() !== '';
    });
    
  } catch (e) {
    Logger.log('[BUSINESS SYNC] Error getting expense categories: ' + e.message);
    return [];
  }
}

/**
 * Get all moved to personal transactions from BACKEND
 * @returns {Array} Array of transaction objects
 */
function getMovedToPersonalTransactions() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var backendSheet = ss.getSheetByName('BACKEND');
    
    if (!backendSheet) return [];
    
    var lastRow = backendSheet.getLastRow();
    var startRow = BUSINESS_SYNC_CONFIG.MOVED_TO_PERSONAL_START_ROW;
    
    if (lastRow < startRow) return [];
    
    var data = backendSheet.getRange(startRow, 
                                      BUSINESS_SYNC_CONFIG.MOVED_TO_PERSONAL_START_COL, 
                                      lastRow - startRow + 1, 
                                      7).getValues();
    
    var transactions = [];
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (row[0] && row[0] !== '') {
        transactions.push({
          date: row[0],
          description: row[1],
          amount: row[2],
          memo: row[3],
          category: row[4],
          accountName: row[5],
          color: row[6]
        });
      }
    }
    
    return transactions;
    
  } catch (e) {
    Logger.log('[BUSINESS SYNC] Error getting moved transactions: ' + e.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════
// AUTO-SYNC TRIGGERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Trigger sync when a transaction is labeled as "Business"
 * This can be called from the categorization modal
 */
function triggerBusinessSyncOnLabel() {
  if (!BUSINESS_SYNC_CONFIG.AUTO_SYNC_ON_LABEL) return;
  
  try {
    // Check if any business accounts are configured
    var props = _mm_safeDocProps_();
    if (!props) return;
    
    var accountsJson = props.getProperty(BUSINESS_SYNC_CONFIG.BUSINESS_ACCOUNTS_KEY);
    if (!accountsJson) return;
    
    var accounts = JSON.parse(accountsJson);
    if (!Array.isArray(accounts) || accounts.length === 0) return;
    
    // Trigger sync in background
    Logger.log('[BUSINESS SYNC] Auto-sync triggered on business label');
    syncAllBusinessData();
    
  } catch (e) {
    Logger.log('[BUSINESS SYNC] Auto-sync error: ' + e.message);
  }
}

/**
 * Get last sync timestamp
 */
function getLastBusinessSyncTime() {
  try {
    var props = _mm_safeDocProps_();
    if (!props) return null;
    
    var lastSync = props.getProperty(BUSINESS_SYNC_CONFIG.LAST_SYNC_KEY);
    return lastSync || null;
    
  } catch (e) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// DIAGNOSTIC FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Diagnose business sync - shows what data is available in linked business sheets
 * Run this from Script Editor to debug sync issues
 */
function diagnoseBusinessSync() {
  var results = [];
  results.push('=== BUSINESS SYNC DIAGNOSTIC ===');
  results.push('Timestamp: ' + new Date().toISOString());
  results.push('');
  
  try {
    var props = _mm_safeDocProps_();
    if (!props) {
      results.push('ERROR: Cannot access document properties');
      Logger.log(results.join('\n'));
      return results.join('\n');
    }
    
    // Get business accounts
    var accountsJson = props.getProperty(BUSINESS_SYNC_CONFIG.BUSINESS_ACCOUNTS_KEY);
    if (!accountsJson) {
      results.push('No business accounts configured');
      Logger.log(results.join('\n'));
      return results.join('\n');
    }
    
    var accounts = JSON.parse(accountsJson);
    results.push('Found ' + accounts.length + ' business account(s) configured');
    results.push('');
    
    for (var i = 0; i < accounts.length; i++) {
      var account = accounts[i];
      results.push('--- Account ' + (i+1) + ': ' + account.name + ' ---');
      results.push('Sheet ID: ' + account.sheetId);
      results.push('Currency: ' + (account.currency || 'USD'));
      
      if (!account.sheetId) {
        results.push('ERROR: No sheet ID!');
        continue;
      }
      
      try {
        var businessSS = SpreadsheetApp.openById(account.sheetId);
        results.push('Successfully opened spreadsheet: ' + businessSS.getName());
        
        // List all sheets
        var sheets = businessSS.getSheets();
        results.push('Sheets in business spreadsheet:');
        for (var j = 0; j < sheets.length; j++) {
          results.push('  - ' + sheets[j].getName());
        }
        
        // Check for MOVED TO PERSONAL sheet
        var movedSheet = businessSS.getSheetByName('MOVED TO PERSONAL');
        if (!movedSheet) movedSheet = businessSS.getSheetByName('MOVED FROM PERSONAL');
        
        if (movedSheet) {
          var lastRow = movedSheet.getLastRow();
          results.push('Found MOVED sheet: ' + movedSheet.getName() + ' with ' + lastRow + ' rows');
          if (lastRow >= 2) {
            var sampleData = movedSheet.getRange(2, 1, Math.min(3, lastRow-1), 5).getValues();
            results.push('Sample data (first 3 rows):');
            for (var k = 0; k < sampleData.length; k++) {
              results.push('  Row ' + (k+2) + ': ' + JSON.stringify(sampleData[k]));
            }
          }
        } else {
          results.push('No MOVED TO PERSONAL or MOVED FROM PERSONAL sheet found');
        }
        
        // Check BACKEND columns O-U
        var bizBackend = businessSS.getSheetByName('BACKEND');
        if (bizBackend) {
          var lastBizRow = bizBackend.getLastRow();
          results.push('Found BACKEND sheet with ' + lastBizRow + ' rows');
          
          // Check columns O-U (15-21)
          if (lastBizRow >= 3) {
            var backendSample = bizBackend.getRange(2, 15, Math.min(5, lastBizRow-1), 7).getValues();
            results.push('BACKEND columns O-U (rows 2-6):');
            for (var m = 0; m < backendSample.length; m++) {
              var rowStr = backendSample[m].map(function(v) { return v === '' ? '(empty)' : String(v).substring(0,20); }).join(' | ');
              results.push('  Row ' + (m+2) + ': ' + rowStr);
            }
          }
        } else {
          results.push('No BACKEND sheet found in business spreadsheet');
        }
        
        // Check ACCOUNT sheets for "Moved to Personal" labels
        var accountSheets = sheets.filter(function(s) { return /^ACCOUNT\s*\d+$/i.test(s.getName()); });
        results.push('Found ' + accountSheets.length + ' ACCOUNT sheets');
        
        var movedToPersonalCount = 0;
        for (var n = 0; n < accountSheets.length; n++) {
          var accSheet = accountSheets[n];
          var lastAccRow = accSheet.getLastRow();
          if (lastAccRow > 11) {
            var accData = accSheet.getRange(11, 3, lastAccRow - 10, 5).getValues();
            for (var p = 0; p < accData.length; p++) {
              var specialLabel = String(accData[p][4] || '').toLowerCase();
              if (specialLabel.indexOf('moved to personal') !== -1 || specialLabel.indexOf('personal') !== -1) {
                movedToPersonalCount++;
              }
            }
          }
        }
        results.push('Transactions with "Moved to Personal" label in ACCOUNT sheets: ' + movedToPersonalCount);
        
      } catch (bizErr) {
        results.push('ERROR accessing business sheet: ' + bizErr.message);
      }
      
      results.push('');
    }
    
  } catch (e) {
    results.push('ERROR: ' + e.message);
  }
  
  var output = results.join('\n');
  Logger.log(output);
  return output;
}

// ═══════════════════════════════════════════════════════════════════
// MENU FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Refresh business transactions menu item
 */
function refreshBusinessTransactions() {
  try {
    LOADING_SyncingBusinessData();
    
    var result = syncAllBusinessData();
    
    // Close loading
    try {
      SpreadsheetApp.getUi().alert(
        result.success ? 'Sync Complete' : 'Sync Error',
        result.message || result.error,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    } catch (e) {}
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// ═══════════════════════════════════════════════════════════════════
// TWO-WAY SYNC SYSTEM
// ═══════════════════════════════════════════════════════════════════
// 
// BACKEND Column Layout:
//   O-U (15-21): OUTGOING queue - transactions TO BE SENT to linked sheet
//     O (15): Date
//     P (16): Description  
//     Q (17): Amount
//     R (18): Category (from Column G)
//     S (19): Memo
//     T (20): Account Name (source ACCOUNT sheet)
//     U (21): Original Row Number (for reference)
//
//   V-AB (22-28): INCOMING - transactions RECEIVED from linked sheet
//     V (22): Date
//     W (23): Description
//     X (24): Amount
//     Y (25): Category
//     Z (26): Memo
//     AA (27): Source Account Name
//     AB (28): Source Sheet ID
//
// ═══════════════════════════════════════════════════════════════════

/**
 * Queue a transaction for sync to linked sheet
 * Called when a transaction is categorized with a label from the linked sheet
 * Writes to BACKEND columns O-U (outgoing queue)
 * 
 * @param {Object} transaction - Transaction data
 * @param {Date|string} transaction.date - Transaction date
 * @param {string} transaction.description - Transaction description
 * @param {number} transaction.amount - Transaction amount
 * @param {string} transaction.category - Category label (from Column G)
 * @param {string} transaction.memo - Memo text
 * @param {string} transaction.accountName - Source ACCOUNT sheet name
 * @param {number} transaction.row - Original row number
 */
function queueTransactionForSync_(transaction) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var backendSheet = ss.getSheetByName('BACKEND');
    
    if (!backendSheet) {
      Logger.log('[SYNC QUEUE] BACKEND sheet not found');
      return { success: false, error: 'BACKEND sheet not found' };
    }
    
    // Find next empty row in O-U section (starting at row 3)
    var startRow = BUSINESS_SYNC_CONFIG.MOVED_TO_PERSONAL_START_ROW; // Row 3
    var startCol = BUSINESS_SYNC_CONFIG.MOVED_TO_PERSONAL_START_COL; // Column O (15)
    
    // Get existing data to find next empty row
    var lastRow = backendSheet.getLastRow();
    var nextRow = startRow;
    
    if (lastRow >= startRow) {
      var existingData = backendSheet.getRange(startRow, startCol, lastRow - startRow + 1, 1).getValues();
      for (var i = 0; i < existingData.length; i++) {
        if (existingData[i][0] && existingData[i][0] !== '') {
          nextRow = startRow + i + 1;
        }
      }
      // If all rows have data, use next row after last
      if (existingData[existingData.length - 1][0] && existingData[existingData.length - 1][0] !== '') {
        nextRow = startRow + existingData.length;
      }
    }
    
    // Prepare row data: O=Date, P=Description, Q=Amount, R=Category, S=Memo, T=AccountName, U=RowNum
    var rowData = [
      transaction.date,
      transaction.description,
      transaction.amount,
      transaction.category,
      transaction.memo || '',
      transaction.accountName || '',
      transaction.row || ''
    ];
    
    // Write to BACKEND O-U
    backendSheet.getRange(nextRow, startCol, 1, 7).setValues([rowData]);
    
    Logger.log('[SYNC QUEUE] Queued transaction for sync: ' + transaction.description + ' -> Row ' + nextRow);
    
    return { success: true, row: nextRow };
    
  } catch (e) {
    Logger.log('[SYNC QUEUE] Error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Queue multiple transactions for sync (batch operation)
 * @param {Array} transactions - Array of transaction objects
 * @returns {Object} Result with count of queued transactions
 */
function queueTransactionsForSync_(transactions) {
  try {
    if (!transactions || transactions.length === 0) {
      return { success: true, count: 0 };
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var backendSheet = ss.getSheetByName('BACKEND');
    
    if (!backendSheet) {
      return { success: false, error: 'BACKEND sheet not found' };
    }
    
    var startRow = BUSINESS_SYNC_CONFIG.MOVED_TO_PERSONAL_START_ROW;
    var startCol = BUSINESS_SYNC_CONFIG.MOVED_TO_PERSONAL_START_COL;
    
    // Find next empty row
    var lastRow = backendSheet.getLastRow();
    var nextRow = startRow;
    
    if (lastRow >= startRow) {
      var existingData = backendSheet.getRange(startRow, startCol, lastRow - startRow + 1, 1).getValues();
      for (var i = 0; i < existingData.length; i++) {
        if (existingData[i][0] && existingData[i][0] !== '') {
          nextRow = startRow + i + 1;
        }
      }
      if (existingData.length > 0 && existingData[existingData.length - 1][0]) {
        nextRow = startRow + existingData.length;
      }
    }
    
    // Prepare batch data
    var batchData = [];
    for (var i = 0; i < transactions.length; i++) {
      var tx = transactions[i];
      batchData.push([
        tx.date,
        tx.description,
        tx.amount,
        tx.category,
        tx.memo || '',
        tx.accountName || '',
        tx.row || ''
      ]);
    }
    
    // Write batch to BACKEND O-U
    backendSheet.getRange(nextRow, startCol, batchData.length, 7).setValues(batchData);
    
    Logger.log('[SYNC QUEUE] Queued ' + batchData.length + ' transactions for sync starting at row ' + nextRow);
    
    return { success: true, count: batchData.length };
    
  } catch (e) {
    Logger.log('[SYNC QUEUE] Batch error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Check if a category exists in the linked sheet's labels
 * Used to determine if a transaction should be synced
 * 
 * @param {string} category - The category to check
 * @returns {boolean} True if category exists in linked sheet's labels
 */
function isCategoryFromLinkedSheet_(category) {
  if (!category || category === '') return false;
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var backendSheet = ss.getSheetByName('BACKEND');
    
    if (!backendSheet) return false;
    
    // Get linked categories from BACKEND AC (income) and AD (expense)
    var incomeCol = BUSINESS_SYNC_CONFIG.BUSINESS_INCOME_CAT_COL; // 29 = AC
    var expenseCol = BUSINESS_SYNC_CONFIG.BUSINESS_EXPENSE_CAT_COL; // 30 = AD
    var startRow = BUSINESS_SYNC_CONFIG.BUSINESS_CAT_START_ROW; // 3
    
    var lastRow = backendSheet.getLastRow();
    if (lastRow < startRow) return false;
    
    // Read income categories from AC
    var incomeData = backendSheet.getRange(startRow, incomeCol, lastRow - startRow + 1, 1).getValues();
    for (var i = 0; i < incomeData.length; i++) {
      var cat = String(incomeData[i][0] || '').trim();
      if (cat && cat.toLowerCase() === category.toLowerCase()) {
        Logger.log('[SYNC CHECK] Category "' + category + '" found in linked income categories');
        return true;
      }
    }
    
    // Read expense categories from AD
    var expenseData = backendSheet.getRange(startRow, expenseCol, lastRow - startRow + 1, 1).getValues();
    for (var j = 0; j < expenseData.length; j++) {
      var expCat = String(expenseData[j][0] || '').trim();
      if (expCat && expCat.toLowerCase() === category.toLowerCase()) {
        Logger.log('[SYNC CHECK] Category "' + category + '" found in linked expense categories');
        return true;
      }
    }
    
    return false;
    
  } catch (e) {
    Logger.log('[SYNC CHECK] Error checking category: ' + e.message);
    return false;
  }
}

/**
 * Get all linked categories (combined income + expense from BACKEND AC/AD)
 * @returns {Array} Array of category strings
 */
function getLinkedCategories_() {
  var categories = [];
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var backendSheet = ss.getSheetByName('BACKEND');
    
    if (!backendSheet) return categories;
    
    var incomeCol = BUSINESS_SYNC_CONFIG.BUSINESS_INCOME_CAT_COL;
    var expenseCol = BUSINESS_SYNC_CONFIG.BUSINESS_EXPENSE_CAT_COL;
    var startRow = BUSINESS_SYNC_CONFIG.BUSINESS_CAT_START_ROW;
    var lastRow = backendSheet.getLastRow();
    
    if (lastRow < startRow) return categories;
    
    // Read both columns
    var incomeData = backendSheet.getRange(startRow, incomeCol, lastRow - startRow + 1, 1).getValues();
    var expenseData = backendSheet.getRange(startRow, expenseCol, lastRow - startRow + 1, 1).getValues();
    
    var seen = {};
    
    for (var i = 0; i < incomeData.length; i++) {
      var cat = String(incomeData[i][0] || '').trim();
      if (cat && !seen[cat.toLowerCase()]) {
        categories.push(cat);
        seen[cat.toLowerCase()] = true;
      }
    }
    
    for (var j = 0; j < expenseData.length; j++) {
      var expCat = String(expenseData[j][0] || '').trim();
      if (expCat && !seen[expCat.toLowerCase()]) {
        categories.push(expCat);
        seen[expCat.toLowerCase()] = true;
      }
    }
    
    Logger.log('[SYNC] Found ' + categories.length + ' linked categories');
    return categories;
    
  } catch (e) {
    Logger.log('[SYNC] Error getting linked categories: ' + e.message);
    return categories;
  }
}

/**
 * TWO-WAY SYNC: Push queued transactions to linked sheet
 * Reads from local BACKEND O-U and writes to linked sheet's V-AB
 * 
 * @returns {Object} Result with sync status
 */
function pushQueuedTransactionsToLinkedSheet_() {
  try {
    Logger.log('[TWO-WAY SYNC] Starting push to linked sheet...');
    
    var props = _mm_safeDocProps_();
    if (!props) {
      return { success: false, error: 'Cannot access properties' };
    }
    
    // Get linked business accounts
    var accountsJson = props.getProperty(BUSINESS_SYNC_CONFIG.BUSINESS_ACCOUNTS_KEY);
    if (!accountsJson) {
      Logger.log('[TWO-WAY SYNC] No linked accounts configured');
      return { success: true, message: 'No linked accounts', pushed: 0 };
    }
    
    var accounts = JSON.parse(accountsJson);
    if (!Array.isArray(accounts) || accounts.length === 0) {
      return { success: true, message: 'No linked accounts', pushed: 0 };
    }
    
    // Get local BACKEND sheet
    var localSS = SpreadsheetApp.getActiveSpreadsheet();
    var localBackend = localSS.getSheetByName('BACKEND');
    
    if (!localBackend) {
      return { success: false, error: 'Local BACKEND sheet not found' };
    }
    
    // Read queued transactions from O-U
    var startRow = BUSINESS_SYNC_CONFIG.MOVED_TO_PERSONAL_START_ROW;
    var startCol = BUSINESS_SYNC_CONFIG.MOVED_TO_PERSONAL_START_COL;
    var lastRow = localBackend.getLastRow();
    
    if (lastRow < startRow) {
      Logger.log('[TWO-WAY SYNC] No queued transactions to push');
      return { success: true, message: 'No queued transactions', pushed: 0 };
    }
    
    var queuedData = localBackend.getRange(startRow, startCol, lastRow - startRow + 1, 7).getValues();
    
    // Filter out empty rows
    var validTransactions = [];
    for (var i = 0; i < queuedData.length; i++) {
      var row = queuedData[i];
      if (row[0] && row[0] !== '') { // Has date
        validTransactions.push({
          date: row[0],
          description: row[1],
          amount: row[2],
          category: row[3],
          memo: row[4],
          accountName: row[5],
          originalRow: row[6],
          sourceSheetId: localSS.getId()
        });
      }
    }
    
    if (validTransactions.length === 0) {
      Logger.log('[TWO-WAY SYNC] No valid transactions to push');
      return { success: true, message: 'No valid transactions', pushed: 0 };
    }
    
    Logger.log('[TWO-WAY SYNC] Found ' + validTransactions.length + ' transactions to push');
    
    var totalPushed = 0;
    var errors = [];
    
    // Push to each linked account
    for (var a = 0; a < accounts.length; a++) {
      var account = accounts[a];
      
      if (!account.sheetId) continue;
      
      try {
        var linkedSS = SpreadsheetApp.openById(account.sheetId);
        var linkedBackend = linkedSS.getSheetByName('BACKEND');
        
        if (!linkedBackend) {
          errors.push(account.name + ': No BACKEND sheet');
          continue;
        }
        
        // Get linked sheet's categories to filter transactions
        var linkedCategories = getLinkedCategoriesFromSheet_(linkedSS);
        
        // Filter transactions that match linked sheet's categories
        var matchingTransactions = [];
        for (var t = 0; t < validTransactions.length; t++) {
          var tx = validTransactions[t];
          if (categoryExistsInList_(tx.category, linkedCategories)) {
            matchingTransactions.push(tx);
          }
        }
        
        if (matchingTransactions.length === 0) {
          Logger.log('[TWO-WAY SYNC] No matching transactions for ' + account.name);
          continue;
        }
        
        // Write to linked sheet's V-AB (incoming section)
        var writeResult = writeIncomingTransactions_(linkedBackend, matchingTransactions);
        
        if (writeResult.success) {
          totalPushed += matchingTransactions.length;
          Logger.log('[TWO-WAY SYNC] Pushed ' + matchingTransactions.length + ' transactions to ' + account.name);
        } else {
          errors.push(account.name + ': ' + writeResult.error);
        }
        
      } catch (sheetErr) {
        errors.push(account.name + ': ' + sheetErr.message);
        Logger.log('[TWO-WAY SYNC] Error with ' + account.name + ': ' + sheetErr.message);
      }
    }
    
    // Clear pushed transactions from local O-U queue
    if (totalPushed > 0) {
      clearSyncQueue_();
    }
    
    var message = 'Pushed ' + totalPushed + ' transactions to linked sheet(s)';
    if (errors.length > 0) {
      message += '. Errors: ' + errors.join('; ');
    }
    
    Logger.log('[TWO-WAY SYNC] Complete: ' + message);
    
    return {
      success: true,
      message: message,
      pushed: totalPushed,
      errors: errors
    };
    
  } catch (e) {
    Logger.log('[TWO-WAY SYNC] Error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Get categories from a linked spreadsheet's INCOME/EXPENSE LABELS
 * @param {Spreadsheet} linkedSS - The linked spreadsheet
 * @returns {Array} Array of category strings
 */
function getLinkedCategoriesFromSheet_(linkedSS) {
  var categories = [];
  
  try {
    // Read INCOME LABELS J14:N18
    var incomeLabels = linkedSS.getSheetByName('INCOME LABELS');
    if (incomeLabels) {
      var incomeData = incomeLabels.getRange('J14:N18').getDisplayValues();
      for (var i = 0; i < incomeData.length; i++) {
        for (var j = 0; j < incomeData[i].length; j++) {
          var val = String(incomeData[i][j] || '').trim();
          if (val) categories.push(val);
        }
      }
    }
    
    // Read EXPENSE LABELS D26:M65  
    var expenseLabels = linkedSS.getSheetByName('EXPENSE LABELS');
    if (expenseLabels) {
      var expenseData = expenseLabels.getRange('D26:M65').getDisplayValues();
      for (var k = 0; k < expenseData.length; k++) {
        for (var l = 0; l < expenseData[k].length; l++) {
          var expVal = String(expenseData[k][l] || '').trim();
          if (expVal) categories.push(expVal);
        }
      }
    }
    
  } catch (e) {
    Logger.log('[SYNC] Error reading linked categories: ' + e.message);
  }
  
  return categories;
}

/**
 * Check if a category exists in a list (case-insensitive)
 * @param {string} category - Category to check
 * @param {Array} categoryList - List of categories
 * @returns {boolean} True if found
 */
function categoryExistsInList_(category, categoryList) {
  if (!category || !categoryList) return false;
  
  var lowerCat = category.toLowerCase();
  for (var i = 0; i < categoryList.length; i++) {
    if (String(categoryList[i] || '').toLowerCase() === lowerCat) {
      return true;
    }
  }
  return false;
}

/**
 * Write incoming transactions to BACKEND V-AB
 * @param {Sheet} backendSheet - Target BACKEND sheet
 * @param {Array} transactions - Array of transaction objects
 */
function writeIncomingTransactions_(backendSheet, transactions) {
  try {
    var startRow = BUSINESS_SYNC_CONFIG.MOVED_FROM_BIZ_START_ROW; // 3
    var startCol = BUSINESS_SYNC_CONFIG.MOVED_FROM_BIZ_START_COL; // 22 (V)
    var numCols = BUSINESS_SYNC_CONFIG.MOVED_FROM_BIZ_NUM_COLS; // 7
    
    // Find next empty row in V-AB
    var lastRow = backendSheet.getLastRow();
    var nextRow = startRow;
    
    if (lastRow >= startRow) {
      var existingData = backendSheet.getRange(startRow, startCol, lastRow - startRow + 1, 1).getValues();
      for (var i = 0; i < existingData.length; i++) {
        if (existingData[i][0] && existingData[i][0] !== '') {
          nextRow = startRow + i + 1;
        }
      }
      if (existingData.length > 0 && existingData[existingData.length - 1][0]) {
        nextRow = startRow + existingData.length;
      }
    }
    
    // Prepare data: V=Date, W=Description, X=Amount, Y=Category, Z=Memo, AA=AccountName, AB=SourceSheetId
    var writeData = [];
    for (var j = 0; j < transactions.length; j++) {
      var tx = transactions[j];
      writeData.push([
        tx.date,
        tx.description,
        tx.amount,
        tx.category,
        tx.memo || '',
        tx.accountName || '',
        tx.sourceSheetId || ''
      ]);
    }
    
    backendSheet.getRange(nextRow, startCol, writeData.length, numCols).setValues(writeData);
    
    Logger.log('[SYNC] Wrote ' + writeData.length + ' incoming transactions to V-AB at row ' + nextRow);
    
    return { success: true, count: writeData.length };
    
  } catch (e) {
    Logger.log('[SYNC] Error writing incoming transactions: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Clear the sync queue (BACKEND O-U) after successful push
 */
function clearSyncQueue_() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var backendSheet = ss.getSheetByName('BACKEND');
    
    if (!backendSheet) return;
    
    var startRow = BUSINESS_SYNC_CONFIG.MOVED_TO_PERSONAL_START_ROW;
    var startCol = BUSINESS_SYNC_CONFIG.MOVED_TO_PERSONAL_START_COL;
    var lastRow = backendSheet.getLastRow();
    
    if (lastRow >= startRow) {
      var numRows = lastRow - startRow + 1;
      backendSheet.getRange(startRow, startCol, numRows, 7).clearContent();
      Logger.log('[SYNC] Cleared sync queue (O-U), ' + numRows + ' rows');
    }
    
  } catch (e) {
    Logger.log('[SYNC] Error clearing queue: ' + e.message);
  }
}

/**
 * FULL TWO-WAY SYNC
 * 1. Push queued transactions TO linked sheet (local O-U → linked V-AB)
 * 2. Pull transactions FROM linked sheet (linked O-U → local V-AB)
 * 
 * @returns {Object} Combined sync result
 */
function performTwoWaySync() {
  Logger.log('═══════════════════════════════════════════════════════════════════');
  Logger.log('[TWO-WAY SYNC] Starting full two-way sync...');
  Logger.log('═══════════════════════════════════════════════════════════════════');
  
  var results = {
    pushed: 0,
    pulled: 0,
    categoriesSynced: 0,
    errors: []
  };
  
  try {
    // Step 1: Push local queued transactions to linked sheet
    Logger.log('[TWO-WAY SYNC] Step 1: Pushing to linked sheet...');
    var pushResult = pushQueuedTransactionsToLinkedSheet_();
    if (pushResult.success) {
      results.pushed = pushResult.pushed || 0;
    } else {
      results.errors.push('Push: ' + pushResult.error);
    }
    
    // Step 2: Pull from linked sheet (existing syncAllBusinessData function)
    Logger.log('[TWO-WAY SYNC] Step 2: Pulling from linked sheet...');
    var pullResult = syncAllBusinessData();
    if (pullResult.success) {
      results.pulled = pullResult.synced || 0;
      results.categoriesSynced = pullResult.categories || 0;
    } else {
      results.errors.push('Pull: ' + pullResult.error);
    }
    
    var message = 'Two-way sync complete. Pushed: ' + results.pushed + ', Pulled: ' + results.pulled + ', Categories: ' + results.categoriesSynced;
    if (results.errors.length > 0) {
      message += '. Errors: ' + results.errors.join('; ');
    }
    
    Logger.log('[TWO-WAY SYNC] ' + message);
    Logger.log('═══════════════════════════════════════════════════════════════════');
    
    return {
      success: true,
      message: message,
      pushed: results.pushed,
      pulled: results.pulled,
      categoriesSynced: results.categoriesSynced,
      errors: results.errors
    };
    
  } catch (e) {
    Logger.log('[TWO-WAY SYNC] Error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Menu function for two-way sync
 */
function MENU_twoWaySync() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.alert('Syncing...', 'Please wait while transactions are synced with linked sheet(s).', ui.ButtonSet.OK);
    
    var result = performTwoWaySync();
    
    ui.alert(
      result.success ? '✅ Sync Complete' : '❌ Sync Error',
      result.message || result.error,
      ui.ButtonSet.OK
    );
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Called when categorization modal opens - trigger sync
 */
function onCategorizationModalOpen() {
  try {
    Logger.log('[SYNC TRIGGER] Categorization modal opened - checking for sync...');
    
    // Check if linked accounts exist
    var props = _mm_safeDocProps_();
    if (!props) return;
    
    var accountsJson = props.getProperty(BUSINESS_SYNC_CONFIG.BUSINESS_ACCOUNTS_KEY);
    if (!accountsJson) return;
    
    var accounts = JSON.parse(accountsJson);
    if (!Array.isArray(accounts) || accounts.length === 0) return;
    
    // Perform sync in background (don't block modal)
    Logger.log('[SYNC TRIGGER] Linked accounts found, triggering two-way sync...');
    performTwoWaySync();
    
  } catch (e) {
    Logger.log('[SYNC TRIGGER] Error on modal open: ' + e.message);
  }
}

/**
 * Called when categorization is saved - queue transactions and sync
 * @param {string} accountName - The account sheet name
 * @param {Array} changes - Array of categorization changes
 */
function onCategorizationSaved(accountName, changes) {
  try {
    Logger.log('[SYNC TRIGGER] Categorization saved for ' + accountName);
    
    // Check if linked accounts exist
    var props = _mm_safeDocProps_();
    if (!props) return;
    
    var accountsJson = props.getProperty(BUSINESS_SYNC_CONFIG.BUSINESS_ACCOUNTS_KEY);
    if (!accountsJson) return;
    
    var accounts = JSON.parse(accountsJson);
    if (!Array.isArray(accounts) || accounts.length === 0) return;
    
    // Get linked categories
    var linkedCategories = getLinkedCategories_();
    if (linkedCategories.length === 0) {
      Logger.log('[SYNC TRIGGER] No linked categories found');
      return;
    }
    
    // Find transactions with business categories that need to be queued
    var toQueue = [];
    
    for (var i = 0; i < changes.length; i++) {
      var change = changes[i];
      
      // Check if this change has a business category (Column G)
      var category = change.businessCategory || change.category;
      if (category && categoryExistsInList_(category, linkedCategories)) {
        // Get full transaction data
        toQueue.push({
          date: change.date,
          description: change.description,
          amount: change.amount,
          category: category,
          memo: change.memo || '',
          accountName: accountName,
          row: change.row
        });
      }
    }
    
    if (toQueue.length > 0) {
      Logger.log('[SYNC TRIGGER] Queuing ' + toQueue.length + ' transactions for sync');
      queueTransactionsForSync_(toQueue);
      
      // Trigger immediate sync
      performTwoWaySync();
    }
    
  } catch (e) {
    Logger.log('[SYNC TRIGGER] Error on save: ' + e.message);
  }
}
