/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * CATEGORIZATION SYSTEM v2.0 - 2026 Launch Version
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * MAJOR CHANGES FOR 2026:
 * - Removed Plaid/Bank Settings integration
 * - Reads transactions from C11:E (Date, Description, Amount)
 * - Added Need/Desire dropdown linked to column I
 * - Income/Expense categories based on amount sign (+/-)
 * - Receipt upload support with Google Drive integration
 * - Mobile-friendly design
 * - Typeahead category search
 * - ML suggestions and learning from user actions
 */

// ═══════════════════════════════════════════════════════════════════
// COLUMN CONFIGURATION - 2026 Sheet Structure
// ═══════════════════════════════════════════════════════════════════
// NOTE: Column definitions are now centralized in ColumnConfig.gs
// This file uses the CAT_CONFIG alias defined there for compatibility
// 
// See ColumnConfig.gs for the authoritative column layout:
// - MM_COLS: Master column definitions
// - MM_ROWS: Row configuration
// - MM_SPECIAL_LABELS: Special labels array
// - MM_SHEETS: Sheet name constants
//
// CAT_CONFIG is auto-populated from ColumnConfig.gs with these mappings:
// - CAT_CONFIG.HEADER_ROW = MM_ROWS.HEADER (10)
// - CAT_CONFIG.DATA_START_ROW = MM_ROWS.DATA_START (11)
// - CAT_CONFIG.COLS = mapped from MM_COLS
// - CAT_CONFIG.SPECIAL_LABELS = MM_SPECIAL_LABELS
// - CAT_CONFIG.SHEETS = mapped from MM_SHEETS
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// MODAL DATA RETRIEVAL - V2
// ═══════════════════════════════════════════════════════════════════

/**
 * Get data for categorization modal v2
 * Returns accounts, income categories, expense categories, and business categories
 */
function getCategorizationModalDataV2() {
  try {
    Logger.log('🚀 getCategorizationModalDataV2 START');
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      Logger.log('❌ getCategorizationModalDataV2: No active spreadsheet!');
      return {
        accounts: [],
        incomeCategories: [],
        expenseCategories: [],
        businessCategories: [],
        error: 'No active spreadsheet found'
      };
    }
    
    Logger.log('📊 Spreadsheet: ' + ss.getName());
    
    var accounts = [];
    var sheets = ss.getSheets();
    Logger.log('📊 Total sheets in spreadsheet: ' + sheets.length);
    
    // Get account sheets (ACCOUNT 1, ACCOUNT 2, etc.)
    for (var i = 0; i < sheets.length; i++) {
      var name = sheets[i].getName();
      if (/^ACCOUNT\s*\d+$/i.test(name)) {
        accounts.push(name);
        Logger.log('📋 Found account sheet: ' + name);
      }
    }
    
    if (accounts.length === 0) {
      Logger.log('⚠️ No ACCOUNT sheets found! Looking for sheets matching pattern: ACCOUNT 1, ACCOUNT 2, etc.');
      var allSheetNames = sheets.map(function(s) { return s.getName(); });
      Logger.log('📜 Available sheets: ' + allSheetNames.join(', '));
    }
    
    // Get categories from label sheets
    Logger.log('📚 Loading personal income categories...');
    var incomeCategories = getIncomeCategoriesFromSheet() || [];
    
    Logger.log('📚 Loading personal expense categories...');
    var expenseCategories = getExpenseCategoriesFromSheet() || [];
    
    Logger.log('📚 Loading business income categories (Column AC)...');
    var businessIncomeCategories = getBusinessIncomeCategoriesFromSheet() || [];
    
    Logger.log('📚 Loading business expense categories (Column AD)...');
    var businessExpenseCategories = getBusinessExpenseCategoriesFromSheet() || [];
    
    // Load ML data for caching on frontend
    Logger.log('📚 Loading ML data for frontend cache...');
    var mlData = getMLDataForCache();
    
    Logger.log('✅ getCategorizationModalDataV2 SUCCESS: Found ' + accounts.length + ' accounts, ' + 
               incomeCategories.length + ' personal income cats, ' + 
               expenseCategories.length + ' personal expense cats, ' +
               businessIncomeCategories.length + ' business income cats, ' +
               businessExpenseCategories.length + ' business expense cats, ' +
               mlData.rules.length + ' ML rules');
    
    // Sort accounts NUMERICALLY (ACCOUNT 1, 2, 3... not 1, 10, 2, 3...)
    accounts.sort(function(a, b) {
      var numA = parseInt(a.match(/\d+/)) || 0;
      var numB = parseInt(b.match(/\d+/)) || 0;
      return numA - numB;
    });
    
    return {
      accounts: accounts,
      incomeCategories: incomeCategories,
      expenseCategories: expenseCategories,
      businessIncomeCategories: businessIncomeCategories,
      businessExpenseCategories: businessExpenseCategories,
      mlData: mlData
    };
    
  } catch (e) {
    Logger.log('❌ getCategorizationModalDataV2 ERROR: ' + e.message);
    Logger.log('Stack: ' + e.stack);
    // Return empty data with error instead of throwing
    return {
      accounts: [],
      incomeCategories: [],
      expenseCategories: [],
      businessIncomeCategories: [],
      businessExpenseCategories: [],
      mlData: { rules: [], lastUpdated: Date.now() },
      error: e.message
    };
  }
}

/**
 * Get income categories from INCOME LABELS sheet
 * CORRECTED LAYOUT (verified from 2026 Launch Version 1.0 screenshots):
 * - Header row: Row 12 (contains "Main Category", "Label 1", "Label 2", etc.)
 * - Data starts: Row 14
 * - Main Category in column G
 * - Subcategories in columns J through N (Label 1 through Label 5)
 * - Need to read ACROSS multiple columns, not down a single column
 */
function getIncomeCategoriesFromSheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CAT_CONFIG.SHEETS.INCOME_LABELS);
    
    if (!sheet) {
      Logger.log('[WARN] INCOME LABELS sheet not found');
      return ['Salary', 'Freelance', 'Investment', 'Other Income'];
    }
    
    Logger.log('📊 Reading INCOME LABELS sheet...');
    
    // INCOME LABELS layout (verified from screenshot):
    // Row 12 = Header row ("Main Category", "Label 1", "Label 2", etc.)
    // Row 14+ = Data rows
    // Column G = Main Category name
    // Columns J-N = Label 1 through Label 5 (subcategories) - columns 10-14
    
    var dataStartRow = 14;
    var lastRow = Math.min(sheet.getLastRow(), 40); // Income usually has fewer categories
    
    if (lastRow < dataStartRow) {
      Logger.log('[INFO] No income category data found');
      return ['Salary', 'Freelance', 'Investment', 'Other Income'];
    }
    
    var numRows = lastRow - dataStartRow + 1;
    // Read columns J through N (columns 10-14) - 5 columns of subcategories
    var values = sheet.getRange(dataStartRow, 10, numRows, 5).getDisplayValues();
    
    Logger.log('📊 Reading ' + numRows + ' rows from row ' + dataStartRow + ', columns J-N');
    
    var categories = [];
    var seen = {};
    
    // Iterate through each row and each column to get all subcategories
    for (var row = 0; row < values.length; row++) {
      for (var col = 0; col < values[row].length; col++) {
        var val = String(values[row][col] || '').trim();
        if (val && !seen[val] && 
            val.indexOf('#REF') === -1 && 
            val.indexOf('#ERROR') === -1 &&
            val.toUpperCase().indexOf('PLACEHOLDER') === -1 &&
            val.toUpperCase().indexOf('PLDERHOLDER') === -1 &&
            val.toUpperCase().indexOf('PDLERCHPODLER') === -1 &&
            val.toUpperCase().indexOf('PLDEDRHODER') === -1 &&
            val.toUpperCase().indexOf('DLERHODER') === -1 &&
            val.toUpperCase().indexOf('LABEL') === -1) {
          categories.push(val);
          seen[val] = true;
        }
      }
    }
    
    Logger.log('📊 Found ' + categories.length + ' income categories: ' + categories.join(', '));
    
    return categories.length > 0 ? categories.sort() : ['Salary', 'Freelance', 'Investment', 'Other Income'];
    
  } catch (e) {
    Logger.log('[ERROR] getIncomeCategoriesFromSheet: ' + e.message);
    return ['Salary', 'Freelance', 'Investment', 'Other Income'];
  }
}

/**
 * Get expense categories from EXPENSE LABELS sheet
 * CORRECTED LAYOUT (verified from 2026 Launch Version 1.0 screenshots):
 * - Header row: Row 25 (contains "Main Category - DO NOT EDIT", "Sublabel 1", etc.)
 * - Data starts: Row 27
 * - Main Category in column C (e.g., "Housing (H)", "Auto (A)")
 * - Subcategories in columns D through M (Sublabel 1 through Sublabel 10)
 * - Need to read ACROSS multiple columns, not down a single column
 */
function getExpenseCategoriesFromSheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CAT_CONFIG.SHEETS.EXPENSE_LABELS);
    
    if (!sheet) {
      Logger.log('[WARN] EXPENSE LABELS sheet not found');
      return ['Groceries', 'Utilities', 'Transportation', 'Entertainment', 'Other'];
    }
    
    Logger.log('📊 Reading EXPENSE LABELS sheet...');
    
    // EXPENSE LABELS layout (verified from screenshot):
    // Row 25 = Header row ("Main Category - DO NOT EDIT", "Sublabel 1", etc.)
    // Row 27+ = Data rows (Housing, Auto, Utilities, etc.)
    // Column C = Main Category name (e.g., "Housing (H)")
    // Columns D-M = Sublabel 1 through Sublabel 10 (subcategories) - columns 4-13
    
    var dataStartRow = 27;
    var lastRow = Math.min(sheet.getLastRow(), 60); // Expense usually has ~20-30 main categories
    
    if (lastRow < dataStartRow) {
      Logger.log('[INFO] No expense category data found (lastRow=' + lastRow + ' < dataStartRow=' + dataStartRow + ')');
      return ['Groceries', 'Utilities', 'Transportation', 'Entertainment', 'Other'];
    }
    
    var numRows = lastRow - dataStartRow + 1;
    // Read columns D through M (columns 4-13) - 10 columns of subcategories
    var values = sheet.getRange(dataStartRow, 4, numRows, 10).getDisplayValues();
    
    Logger.log('📊 Reading ' + numRows + ' rows from row ' + dataStartRow + ', columns D-M');
    
    var categories = [];
    var seen = {};
    
    // Iterate through each row and each column to get all subcategories
    for (var row = 0; row < values.length; row++) {
      for (var col = 0; col < values[row].length; col++) {
        var val = String(values[row][col] || '').trim();
        if (val && !seen[val] && 
            val.indexOf('#REF') === -1 && 
            val.indexOf('#ERROR') === -1 &&
            val.toUpperCase().indexOf('SUBLABEL') === -1 &&
            val.toUpperCase().indexOf('PLACEHOLDER') === -1 &&
            val.toUpperCase().indexOf('DO NOT EDIT') === -1) {
          categories.push(val);
          seen[val] = true;
        }
      }
    }
    
    Logger.log('📊 Found ' + categories.length + ' expense categories');
    if (categories.length > 0 && categories.length <= 20) {
      Logger.log('📊 Categories: ' + categories.join(', '));
    }
    
    return categories.length > 0 ? categories.sort() : ['Groceries', 'Utilities', 'Transportation', 'Entertainment', 'Other'];
    
  } catch (e) {
    Logger.log('[ERROR] getExpenseCategoriesFromSheet: ' + e.message);
    return ['Groceries', 'Utilities', 'Transportation', 'Entertainment', 'Other'];
  }
}

/**
 * Get business categories from BACKEND sheet
 * Column AC (29), starting row 3
 */
/**
 * Get Business INCOME categories from BACKEND sheet Column AC, Row 3+
 */
function getBusinessIncomeCategoriesFromSheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CAT_CONFIG.SHEETS.BACKEND);
    
    if (!sheet) {
      Logger.log('[WARN] BACKEND sheet not found for business income categories');
      return ['Business Income'];
    }
    
    var lastRow = Math.min(sheet.getLastRow(), 100);
    if (lastRow < 3) {
      return ['Business Income'];
    }
    
    // Column AC = 29
    var values = sheet.getRange(3, 29, lastRow - 2, 1).getDisplayValues();
    var categories = [];
    var seen = {};
    
    for (var i = 0; i < values.length; i++) {
      var val = String(values[i][0] || '').trim();
      if (val && !seen[val] && val.indexOf('#REF') === -1 && val.indexOf('#ERROR') === -1) {
        categories.push(val);
        seen[val] = true;
      }
    }
    
    Logger.log('📊 Business Income categories loaded: ' + categories.length);
    return categories.length > 0 ? categories.sort() : ['Business Income'];
    
  } catch (e) {
    Logger.log('[ERROR] getBusinessIncomeCategoriesFromSheet: ' + e.message);
    return ['Business Income'];
  }
}

/**
 * Get Business EXPENSE categories from BACKEND sheet Column AD, Row 3+
 */
function getBusinessExpenseCategoriesFromSheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CAT_CONFIG.SHEETS.BACKEND);
    
    if (!sheet) {
      Logger.log('[WARN] BACKEND sheet not found for business expense categories');
      return ['Business Expense'];
    }
    
    var lastRow = Math.min(sheet.getLastRow(), 100);
    if (lastRow < 3) {
      return ['Business Expense'];
    }
    
    // Column AD = 30
    var values = sheet.getRange(3, 30, lastRow - 2, 1).getDisplayValues();
    var categories = [];
    var seen = {};
    
    for (var i = 0; i < values.length; i++) {
      var val = String(values[i][0] || '').trim();
      if (val && !seen[val] && val.indexOf('#REF') === -1 && val.indexOf('#ERROR') === -1) {
        categories.push(val);
        seen[val] = true;
      }
    }
    
    Logger.log('📊 Business Expense categories loaded: ' + categories.length);
    return categories.length > 0 ? categories.sort() : ['Business Expense'];
    
  } catch (e) {
    Logger.log('[ERROR] getBusinessExpenseCategoriesFromSheet: ' + e.message);
    return ['Business Expense'];
  }
}

/**
 * Legacy function - returns combined business categories
 * @deprecated Use getBusinessIncomeCategoriesFromSheet or getBusinessExpenseCategoriesFromSheet
 */
function getBusinessCategoriesFromSheet() {
  var income = getBusinessIncomeCategoriesFromSheet();
  var expense = getBusinessExpenseCategoriesFromSheet();
  var combined = income.concat(expense);
  var unique = [];
  var seen = {};
  for (var i = 0; i < combined.length; i++) {
    if (!seen[combined[i]]) {
      seen[combined[i]] = true;
      unique.push(combined[i]);
    }
  }
  return unique.sort();
}

// ═══════════════════════════════════════════════════════════════════
// TRANSACTION DATA RETRIEVAL - V2
// ═══════════════════════════════════════════════════════════════════

/**
 * Get transactions for a specific account - V2
 * VERIFIED FROM 2026 Launch Version 1.0.xlsx
 * Reads from ACCOUNT sheets starting at row 11 (header row 10):
 *   C (3): Date
 *   D (4): Description
 *   E (5): Amount
 *   F (6): Personal Categories
 *   G (7): Business Categories
 *   H (8): Memo
 *   I (9): Desire or Need?
 *   J (10): Main Category
 *   K (11): Receipt
 */
function getAccountTransactionsV2(accountName) {
  Logger.log('═══════════════════════════════════════════════════════════════');
  Logger.log('🚀 getAccountTransactionsV2 START');
  Logger.log('  accountName: "' + accountName + '"');
  Logger.log('  typeof: ' + typeof accountName);
  Logger.log('═══════════════════════════════════════════════════════════════');
  
  // CRITICAL: Validate input
  if (!accountName || typeof accountName !== 'string') {
    Logger.log('❌ Invalid accountName: ' + JSON.stringify(accountName));
    return { transactions: [], mlSuggestions: {}, error: 'Invalid account name' };
  }
  
  try {
    // Defensive: Check if CAT_CONFIG exists
    var dataStartRow = 11; // Default: row 11 per 2026 Launch Version
    if (typeof CAT_CONFIG !== 'undefined' && CAT_CONFIG.DATA_START_ROW) {
      dataStartRow = CAT_CONFIG.DATA_START_ROW;
    }
    Logger.log('📋 Using dataStartRow: ' + dataStartRow);
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      Logger.log('❌ No active spreadsheet!');
      return { transactions: [], mlSuggestions: {}, error: 'No active spreadsheet' };
    }
    
    Logger.log('📊 Spreadsheet: "' + ss.getName() + '"');
    
    var sheet = ss.getSheetByName(accountName);
    
    if (!sheet) {
      // Try trimming whitespace
      var trimmedName = accountName.trim();
      sheet = ss.getSheetByName(trimmedName);
      
      if (!sheet) {
        Logger.log('❌ Sheet not found: "' + accountName + '" (also tried: "' + trimmedName + '")');
        // List available sheets for debugging
        var availableSheets = ss.getSheets().map(function(s) { return s.getName(); });
        Logger.log('📋 Available sheets: ' + JSON.stringify(availableSheets));
        return { transactions: [], mlSuggestions: {}, error: 'Account sheet not found: ' + accountName };
      }
      Logger.log('✅ Found sheet with trimmed name: "' + trimmedName + '"');
    } else {
      Logger.log('✅ Found sheet: "' + accountName + '"');
    }
    
    var lastRow = sheet.getLastRow();
    Logger.log('📊 Sheet lastRow: ' + lastRow);
    
    if (lastRow < dataStartRow) {
      Logger.log('[INFO] No data rows found in ' + accountName + ' (lastRow=' + lastRow + ' < dataStartRow=' + dataStartRow + ')');
      return { transactions: [], mlSuggestions: {} };
    }
    
    // OPTIMIZATION: Find actual last row with data in column C (Date) or D (Description)
    // This prevents reading thousands of empty formula rows
    var actualLastRow = lastRow;
    
    // If lastRow is very large, find the actual data boundary
    if (lastRow > dataStartRow + 1000) {
      Logger.log('⚡ Large sheet detected (' + lastRow + ' rows), finding actual data boundary...');
      
      // Check column C (Date) for actual data - read in chunks from bottom up
      var dateCol = sheet.getRange(dataStartRow, 3, lastRow - dataStartRow + 1, 1).getValues();
      actualLastRow = dataStartRow - 1; // Start before data
      
      for (var checkRow = dateCol.length - 1; checkRow >= 0; checkRow--) {
        var cellValue = dateCol[checkRow][0];
        if (cellValue !== '' && cellValue !== null && cellValue !== undefined) {
          actualLastRow = dataStartRow + checkRow;
          break;
        }
      }
      
      // If no data found in date column, check description column
      if (actualLastRow < dataStartRow) {
        var descCol = sheet.getRange(dataStartRow, 4, lastRow - dataStartRow + 1, 1).getValues();
        for (var checkRow2 = descCol.length - 1; checkRow2 >= 0; checkRow2--) {
          var cellValue2 = descCol[checkRow2][0];
          if (cellValue2 !== '' && cellValue2 !== null && cellValue2 !== undefined) {
            actualLastRow = dataStartRow + checkRow2;
            break;
          }
        }
      }
      
      Logger.log('📊 Actual data ends at row: ' + actualLastRow + ' (saved reading ' + (lastRow - actualLastRow) + ' empty rows)');
    }
    
    if (actualLastRow < dataStartRow) {
      Logger.log('[INFO] No actual data found in ' + accountName);
      return { transactions: [], mlSuggestions: {} };
    }
    
    var numRows = actualLastRow - dataStartRow + 1;
    Logger.log('📊 Reading ' + numRows + ' rows from row ' + dataStartRow + ' to ' + actualLastRow);
    
    // AUTO-SETUP AI SUGGESTIONS: Automatically add AI() formulas for ALL uncategorized transactions
    // This runs on every account load to ensure all transactions have suggestions
    try {
      Logger.log('🤖 Auto-setting up AI suggestions for ' + accountName + '...');
      var aiSetupResult = setupAISuggestionsForAccount(accountName);
      if (aiSetupResult && aiSetupResult.count > 0) {
        Logger.log('🤖 Added ' + aiSetupResult.count + ' new AI suggestion formulas');
        // Give formulas a moment to calculate (they run async)
        Utilities.sleep(500);
      }
    } catch (aiSetupErr) {
      Logger.log('[WARN] AI auto-setup skipped: ' + aiSetupErr.message);
    }
    
    // Read columns C through M (columns 3-13) - 11 columns total
    // Includes Column M (AI Suggestion) for smart ML
    var data = sheet.getRange(dataStartRow, 3, numRows, 11).getValues();
    var displayData = sheet.getRange(dataStartRow, 3, numRows, 11).getDisplayValues();
    Logger.log('📊 Data retrieved: ' + data.length + ' rows');
    var transactions = [];
    var mlSuggestions = {};
    var uncategorizedTransactions = []; // Batch uncategorized for ML suggestions
    
    // Get special labels - UPDATED FOR 2026 VERSION
    var specialLabels = [
      'Credit Card Payment Received',
      'Debt Payment Sent to Credit Card',
      'Transfer Deposit Personal to Personal',
      'Transfer Withdrawal Personal to Personal',
      'Ignored',
      'Transaction Split',
      'Refund',
      'Return',
      'Reimbursement',
      // Legacy labels for backward compatibility
      'Ignore',
      'Transfer',
      'CC Payment',
      'Debt Payment Out'
    ];
    if (typeof CAT_CONFIG !== 'undefined' && CAT_CONFIG.SPECIAL_LABELS) {
      // Merge with config labels if available
      for (var sl = 0; sl < CAT_CONFIG.SPECIAL_LABELS.length; sl++) {
        if (specialLabels.indexOf(CAT_CONFIG.SPECIAL_LABELS[sl]) === -1) {
          specialLabels.push(CAT_CONFIG.SPECIAL_LABELS[sl]);
        }
      }
    }
    
    // First pass: Build transactions list (fast)
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var rowNum = dataStartRow + i;
      
      var date = row[0];        // C - Date
      var description = String(row[1] || '').trim(); // D - Description
      var amount = parseFloat(row[2]) || 0;          // E - Amount
      var category = String(row[3] || '').trim();    // F - Personal Categories
      var businessCat = String(row[4] || '').trim(); // G - Business Categories
      var memo = String(row[5] || '').trim();        // H - Memo
      var needDesire = String(row[6] || '').trim();  // I - Desire or Need?
      var mainCat = String(row[7] || '').trim();     // J - Main Category
      var receipt = String(row[8] || '').trim();     // K - Receipt link
      // Column L (index 9) = Needs Correction
      var aiSuggestion = String(displayData[i][10] || '').trim(); // M - AI Suggestion (use display value)
      
      // Skip completely empty rows
      if (!date && !description && amount === 0) continue;
      
      // Check if this is a special label
      var specialLabel = '';
      if (specialLabels.indexOf(businessCat) !== -1) {
        specialLabel = businessCat;
      }
      
      // Check if this is a split transaction (mainCat contains split data)
      var isSplit = mainCat && mainCat.indexOf('SPLIT:') === 0;
      
      // CRITICAL: Convert Date objects to strings for proper serialization
      // google.script.run cannot properly serialize Date objects
      var dateStr = '';
      if (date) {
        if (date instanceof Date) {
          dateStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'MM/dd/yyyy');
        } else {
          dateStr = String(date);
        }
      }
      
      transactions.push({
        row: rowNum,
        date: dateStr,
        description: description,
        amount: amount,
        category: category,
        businessCategory: businessCat,
        specialLabel: specialLabel,
        memo: memo,
        needDesire: needDesire,
        mainCategory: mainCat,
        isSplit: isSplit,
        receipt: receipt
      });
      
      // Check for AI suggestion from Column M (prioritize over keyword ML)
      var catTrimmed = String(category || '').trim();
      var busTrimmed = String(businessCat || '').trim();
      var isUncategorized = !catTrimmed && !busTrimmed;
      
      // FILTER: Skip AI suggestions that look like formulas or prompts (not calculated yet)
      var isValidAISuggestion = aiSuggestion && 
        aiSuggestion.indexOf('#') !== 0 &&          // Not an error
        aiSuggestion.indexOf('=AI') !== 0 &&        // Not a formula
        aiSuggestion.indexOf('=') !== 0 &&          // Not any formula
        aiSuggestion.indexOf('Pick the') === -1 &&  // Not the prompt text
        aiSuggestion.indexOf('Categories:') === -1 && // Not the prompt text
        aiSuggestion.indexOf('Reply with') === -1 && // Not the prompt text
        aiSuggestion.length < 50;                    // Valid categories are short
      
      if (isUncategorized && isValidAISuggestion) {
        // AI suggestion found - use it directly with high confidence
        mlSuggestions[rowNum] = {
          category: aiSuggestion,
          confidence: 0.88,
          source: 'ai',
          explanation: 'AI-powered suggestion'
        };
        Logger.log('[AI] Row ' + rowNum + ': "' + description.substring(0, 30) + '" → ' + aiSuggestion);
      } else if (isUncategorized && description && uncategorizedTransactions.length < 200) {
        // No AI suggestion - collect for keyword-based ML fallback
        uncategorizedTransactions.push({
          rowNum: rowNum,
          description: description,
          isIncome: amount > 0
        });
        // Debug log first few
        if (uncategorizedTransactions.length <= 3) {
          Logger.log('[ML] Uncategorized #' + uncategorizedTransactions.length + ': Row ' + rowNum + ' - ' + description.substring(0, 40));
        }
      }
    }
    
    Logger.log('📊 Built ' + transactions.length + ' transactions, ' + uncategorizedTransactions.length + ' uncategorized');
    
    // CLARITY SUGGESTIONS: Process ALL uncategorized transactions (no cap)
    // Clarity is our AI assistant - she helps with categories, need/desire, AND mistake detection
    var CLARITY_TIMEOUT_MS = 8000; // 8 second max for larger datasets
    
    if (uncategorizedTransactions.length > 0) {
      try {
        Logger.log('✨ Clarity: Processing ' + uncategorizedTransactions.length + ' transactions');
        var mlStartTime = new Date().getTime();
        var suggestionsFound = 0;
        var learnedCount = 0;
        var trainingCount = 0;
        
        // CRITICAL FIX: Load ALL categories for ML matching (personal AND business)
        // These were previously undefined, causing "expenseCategories is not defined" error
        var incomeCategories = [];
        var expenseCategories = [];
        var businessIncomeCategories = [];
        var businessExpenseCategories = [];
        try {
          incomeCategories = getIncomeCategoriesFromSheet() || [];
          expenseCategories = getExpenseCategoriesFromSheet() || [];
          businessIncomeCategories = getBusinessIncomeCategoriesFromSheet() || [];
          businessExpenseCategories = getBusinessExpenseCategoriesFromSheet() || [];
          Logger.log('✨ Clarity: Loaded ' + incomeCategories.length + ' personal income, ' + expenseCategories.length + ' personal expense, ' + businessIncomeCategories.length + ' business income, ' + businessExpenseCategories.length + ' business expense categories');
        } catch (catErr) {
          Logger.log('[WARN] Could not load categories for ML: ' + catErr.message);
        }
        
        // STEP 1: Load learned rules from BACKEND sheet ONCE (this is the only sheet read)
        var learnedRules = {};
        try {
          var mlData = getMLDataForCache();
          if (mlData && mlData.rules) {
            for (var r = 0; r < mlData.rules.length; r++) {
              var rule = mlData.rules[r];
              // Key by normalized description
              var key = String(rule.description || '').toUpperCase().trim();
              if (key && rule.category) {
                learnedRules[key] = {
                  category: rule.category,
                  count: rule.count || 1,
                  type: rule.type,
                  catType: rule.catType
                };
              }
            }
            Logger.log('🧠 Loaded ' + Object.keys(learnedRules).length + ' learned rules');
          }
        } catch (cacheErr) {
          Logger.log('[WARN] Could not load learned rules: ' + cacheErr.message);
        }
        
        var cacheLoadTime = new Date().getTime() - mlStartTime;
        Logger.log('⏱️ Cache load took ' + cacheLoadTime + 'ms');
        
        // STEP 2: Process ALL uncategorized transactions (no cap!)
        for (var j = 0; j < uncategorizedTransactions.length; j++) {
          // Timeout check - but process as many as possible
          if (new Date().getTime() - mlStartTime > CLARITY_TIMEOUT_MS) {
            Logger.log('✨ Clarity: Timeout after ' + j + ' items (processed ' + suggestionsFound + ' suggestions)');
            break;
          }
          
          var uncatTx = uncategorizedTransactions[j];
          var normalized = normalizeDescription(uncatTx.description);
          var isIncome = uncatTx.isIncome;
          var userCats = isIncome ? incomeCategories : expenseCategories;
          var suggestion = null;
          
          // TIER 1: Check learned rules first (user's past categorizations)
          // Now correctly handles business vs personal based on catType
          if (learnedRules[normalized]) {
            var learned = learnedRules[normalized];
            var isBusiness = learned.catType === 'business';
            suggestion = {
              category: learned.category,
              confidence: 0.90,
              source: 'learned',
              tier: 2,
              isBusiness: isBusiness,
              catType: learned.catType || 'personal'
            };
            learnedCount++;
            if (isBusiness) {
              Logger.log('✨ Business suggestion from learned rules: ' + learned.category);
            }
          }
          
          // TIER 2: Try training data keywords - check BOTH personal AND business categories
          // Personal categories first, then business as fallback
          if (!suggestion) {
            suggestion = getFastMLSuggestion(uncatTx.description, userCats, false);
            if (suggestion) trainingCount++;
          }
          
          // TIER 2B: Try business categories if no personal match
          if (!suggestion) {
            var businessCats = isIncome ? businessIncomeCategories : businessExpenseCategories;
            suggestion = getFastMLSuggestion(uncatTx.description, businessCats, true);
            if (suggestion) {
              trainingCount++;
              Logger.log('✨ Business suggestion from training: ' + suggestion.category);
            }
          }
          
          // TIER 3: If still no suggestion, try to match description words to personal category names
          if (!suggestion && userCats && userCats.length > 0) {
            suggestion = matchDescriptionToCategories(uncatTx.description, userCats, false);
            if (suggestion) trainingCount++;
          }
          
          // TIER 3B: Try matching against business category names
          if (!suggestion) {
            var businessCats = isIncome ? businessIncomeCategories : businessExpenseCategories;
            if (businessCats && businessCats.length > 0) {
              suggestion = matchDescriptionToCategories(uncatTx.description, businessCats, true);
              if (suggestion) {
                trainingCount++;
                Logger.log('✨ Business suggestion from word match: ' + suggestion.category);
              }
            }
          }
          
          // Add ANY suggestion we found
          if (suggestion) {
            // Add Need/Desire prediction if this is an expense (not income)
            if (!isIncome && suggestion.category) {
              var ndPrediction = getNeedDesirePrediction(suggestion.category);
              if (ndPrediction && ndPrediction.prediction) {
                suggestion.needDesire = ndPrediction.prediction;
                suggestion.needDesireConfidence = ndPrediction.confidence;
              }
            }
            mlSuggestions[uncatTx.rowNum] = suggestion;
            suggestionsFound++;
          }
        }
        
        var mlTime = new Date().getTime() - mlStartTime;
        Logger.log('✨ Clarity: Generated ' + suggestionsFound + ' suggestions in ' + mlTime + 'ms');
        Logger.log('   Learned: ' + learnedCount + ', Training: ' + trainingCount);
        
      } catch (mlError) {
        Logger.log('[WARN] ML suggestions error: ' + mlError.message);
      }
    }
    
    // STEP 3: Get AI suggestions from Column M (AI() formula)
    // These take priority over keyword-based suggestions
    try {
      var aiSuggestions = getAISuggestionsForAccount(accountName);
      var aiCount = 0;
      
      for (var aiRow in aiSuggestions) {
        // AI suggestions override keyword-based suggestions
        mlSuggestions[aiRow] = aiSuggestions[aiRow];
        aiCount++;
      }
      
      if (aiCount > 0) {
        Logger.log('🤖 AI: Added ' + aiCount + ' AI-powered suggestions');
      }
    } catch (aiError) {
      Logger.log('[WARN] AI suggestions error: ' + aiError.message);
    }
    
    // STEP 4: Clarity Mistake Detection - scan categorized transactions for potential errors
    var clarityMistakes = {};
    try {
      clarityMistakes = detectPotentialMistakes(transactions, learnedRules, incomeCategories, expenseCategories);
      if (Object.keys(clarityMistakes).length > 0) {
        Logger.log('✨ Clarity: Found ' + Object.keys(clarityMistakes).length + ' potential mistakes to review');
      }
    } catch (mistakeErr) {
      Logger.log('[WARN] Clarity mistake detection error: ' + mistakeErr.message);
    }
    
    Logger.log('═══════════════════════════════════════════════════════════════');
    Logger.log('✅ getAccountTransactionsV2 COMPLETE');
    Logger.log('  Account: ' + accountName);
    Logger.log('  Transactions: ' + transactions.length);
    Logger.log('  Clarity Suggestions: ' + Object.keys(mlSuggestions).length);
    Logger.log('  Clarity Mistakes: ' + Object.keys(clarityMistakes).length);
    Logger.log('═══════════════════════════════════════════════════════════════');
    
    // Build result object
    var result = {
      transactions: transactions,
      mlSuggestions: mlSuggestions,
      clarityMistakes: clarityMistakes
    };
    
    // CRITICAL: Verify the result can be serialized before returning
    // This catches issues with Date objects or circular references
    try {
      var testJson = JSON.stringify(result);
      Logger.log('📦 Result size: ' + testJson.length + ' chars');
      
      // If result is too large (>5MB), it may fail to transfer
      if (testJson.length > 5000000) {
        Logger.log('⚠️ WARNING: Result is very large (' + testJson.length + ' chars), may fail to transfer');
      }
    } catch (serializeError) {
      Logger.log('❌ SERIALIZATION ERROR: ' + serializeError.message);
      Logger.log('Attempting to identify problematic transaction...');
      
      // Try to find which transaction has the issue
      for (var ti = 0; ti < transactions.length; ti++) {
        try {
          JSON.stringify(transactions[ti]);
        } catch (txError) {
          Logger.log('❌ Problem in transaction at index ' + ti + ', row ' + transactions[ti].row);
          // Remove or fix the problematic transaction
          transactions[ti].date = String(transactions[ti].date || '');
        }
      }
    }
    
    return result;
    
  } catch (e) {
    Logger.log('❌ getAccountTransactionsV2 ERROR: ' + e.message);
    Logger.log('Stack: ' + e.stack);
    // Return empty result instead of throwing - allows UI to handle gracefully
    return { 
      transactions: [], 
      mlSuggestions: {},
      error: e.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// PROGRESSIVE LOADING - FAST FIRST BATCH
// ═══════════════════════════════════════════════════════════════════

/**
 * Fast first-batch loader — returns ONLY uncategorized transactions with NO ML/AI processing.
 * Called first so the modal can render in ~2-3 s, then categorized rows are loaded in the
 * background via getAccountTransactionsV2.
 *
 * @param {string} accountName
 * @param {number} [batchSize=150]  Max rows to return (keeps payload small)
 * @returns {{ transactions: Array, totalRows: number, hasMore: boolean }}
 */
function getUncategorizedTransactionsV2(accountName, batchSize) {
  try {
    batchSize = batchSize || 150;
    Logger.log('⚡ getUncategorizedTransactionsV2 START: ' + accountName);

    if (!accountName || typeof accountName !== 'string') {
      return { transactions: [], totalRows: 0, hasMore: false, error: 'Invalid account name' };
    }

    var dataStartRow = 11;
    if (typeof CAT_CONFIG !== 'undefined' && CAT_CONFIG.DATA_START_ROW) {
      dataStartRow = CAT_CONFIG.DATA_START_ROW;
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return { transactions: [], totalRows: 0, hasMore: false, error: 'No active spreadsheet' };

    var sheet = ss.getSheetByName(accountName) || ss.getSheetByName(accountName.trim());
    if (!sheet) return { transactions: [], totalRows: 0, hasMore: false, error: 'Sheet not found: ' + accountName };

    var lastRow = sheet.getLastRow();
    if (lastRow < dataStartRow) return { transactions: [], totalRows: 0, hasMore: false };

    var numRows = lastRow - dataStartRow + 1;
    // Read only C-K (9 columns) — skip column M (AI) for speed
    var data = sheet.getRange(dataStartRow, 3, numRows, 9).getValues();

    var specialLabels = ['Credit Card Payment Received','Debt Payment Sent to Credit Card',
      'Transfer Deposit Personal to Personal','Transfer Withdrawal Personal to Personal',
      'Ignored','Transaction Split','Refund','Return','Reimbursement',
      'Ignore','Transfer','CC Payment','Debt Payment Out'];
    if (typeof CAT_CONFIG !== 'undefined' && CAT_CONFIG.SPECIAL_LABELS) {
      for (var sl = 0; sl < CAT_CONFIG.SPECIAL_LABELS.length; sl++) {
        if (specialLabels.indexOf(CAT_CONFIG.SPECIAL_LABELS[sl]) === -1) {
          specialLabels.push(CAT_CONFIG.SPECIAL_LABELS[sl]);
        }
      }
    }

    var allTransactions = [];
    var uncategorized = [];

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var date = row[0];
      var description = String(row[1] || '').trim();
      var amount = parseFloat(row[2]) || 0;
      var category = String(row[3] || '').trim();
      var businessCat = String(row[4] || '').trim();
      var memo = String(row[5] || '').trim();
      var needDesire = String(row[6] || '').trim();
      var mainCat = String(row[7] || '').trim();
      var receipt = String(row[8] || '').trim();
      var rowNum = dataStartRow + i;

      if (!date && !description && amount === 0) continue;

      var specialLabel = specialLabels.indexOf(businessCat) !== -1 ? businessCat : '';
      var isSplit = mainCat && mainCat.indexOf('SPLIT:') === 0;
      var dateStr = '';
      if (date) {
        if (date instanceof Date) {
          dateStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'MM/dd/yyyy');
        } else {
          dateStr = String(date);
        }
      }

      var tx = {
        row: rowNum, date: dateStr, description: description, amount: amount,
        category: category, businessCategory: businessCat, specialLabel: specialLabel,
        memo: memo, needDesire: needDesire, mainCategory: mainCat, isSplit: isSplit, receipt: receipt
      };

      allTransactions.push(tx);
      if (!category && !businessCat) uncategorized.push(tx);
    }

    // Return uncategorized first (up to batchSize), rest included as categorized
    var firstBatch = uncategorized.slice(0, batchSize);
    var remaining = uncategorized.slice(batchSize);
    // Append categorized transactions after uncategorized
    var categorized = allTransactions.filter(function(t) { return t.category || t.businessCategory; });

    Logger.log('⚡ Fast load: ' + allTransactions.length + ' total, ' + uncategorized.length + ' uncategorized, returning ' + firstBatch.length + ' first');

    return {
      transactions: firstBatch.concat(categorized),
      uncategorizedRemaining: remaining,
      totalRows: allTransactions.length,
      uncategorizedCount: uncategorized.length,
      hasMore: remaining.length > 0
    };
  } catch (e) {
    Logger.log('❌ getUncategorizedTransactionsV2 error: ' + e.message);
    return { transactions: [], totalRows: 0, hasMore: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// SAVE CATEGORIZATION - V2
// ═══════════════════════════════════════════════════════════════════

/**
 * Save categorization changes - V2
 * VERIFIED FROM 2026 Launch Version 1.0.xlsx
 * 
 * COLUMN ASSIGNMENTS:
 *   F (6): Personal Categories + Transaction Labels (Ignored, Refund, etc.)
 *   G (7): Business Categories ONLY
 *   H (8): Memo
 *   I (9): Desire or Need?
 *   J (10): Main Category / Split Data
 *   K (11): Receipt link
 * 
 * NOTE: DO NOT clear data validations - just set values
 */
function saveCategorizationChangesV2(accountName, changes) {
  try {
    Logger.log('═══════════════════════════════════════════════════════════════════');
    Logger.log('saveCategorizationChangesV2 START (OPTIMIZED)');
    Logger.log('Account: ' + accountName);
    Logger.log('Changes count: ' + changes.length);
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(accountName);
    
    if (!sheet) {
      throw new Error('Account sheet not found: ' + accountName);
    }
    
    // OPTIMIZATION: Read all needed data at once
    var minRow = Math.min.apply(null, changes.map(function(c) { return c.row; }));
    var maxRow = Math.max.apply(null, changes.map(function(c) { return c.row; }));
    var numRows = maxRow - minRow + 1;
    
    // Read columns C-K for all affected rows (Description=C=3, Amount=E=5)
    var dataRange = sheet.getRange(minRow, 3, numRows, 9); // C to K
    var existingData = dataRange.getValues();
    
    // Create a map of row → index
    var rowToIndex = {};
    for (var r = minRow; r <= maxRow; r++) {
      rowToIndex[r] = r - minRow;
    }
    
    // Prepare ML learning entries (batch them)
    var mlEntries = [];
    
    var savedCount = 0;
    var errors = [];
    
    for (var i = 0; i < changes.length; i++) {
      try {
        var change = changes[i];
        var row = change.row;
        var idx = rowToIndex[row];
        
        // Validate row number
        if (row < CAT_CONFIG.DATA_START_ROW) {
          errors.push('Invalid row: ' + row);
          continue;
        }
        
        // Get description and amount from pre-read data
        // existingData columns: [0]=C(Date), [1]=D(Desc), [2]=E(Amount), [3]=F(Cat), [4]=G(Bus), [5]=H(Memo), [6]=I(N/D), [7]=J(Main), [8]=K(Receipt)
        var description = existingData[idx][1]; // Column D
        var amount = existingData[idx][2]; // Column E
        var isIncome = amount > 0;
        
        // PERSONAL CATEGORY or SPECIAL LABEL → Column F (index 3)
        // NOTE: change.category === '' is an EXPLICIT CLEAR — write blank to sheet
        if (change.category !== undefined) {
          var newCat = change.category || '';
          existingData[idx][3] = newCat; // Column F — blank string clears the cell
          if (!newCat) {
            // Explicit clear: also wipe business column unless a business value is also being set
            if (!change.businessCategory && !change.specialLabel) {
              existingData[idx][4] = ''; // Also clear Column G
            }
          } else {
            existingData[idx][4] = ''; // Non-empty personal clears business
            if (description) {
              mlEntries.push({ desc: description, cat: newCat, type: isIncome ? 'income' : 'expense', catType: 'personal' });
            }
          }
        }
        
        // SPECIAL LABEL → Column F (index 3)  
        if (change.specialLabel !== undefined && change.specialLabel !== '') {
          existingData[idx][3] = change.specialLabel; // Column F
          existingData[idx][4] = ''; // Clear Column G
        }
        // Explicit clear of special label
        if (change.specialLabel === '' && change.category === '' && change.businessCategory === '') {
          existingData[idx][3] = ''; // Column F
          existingData[idx][4] = ''; // Column G
        }
        
        // BUSINESS CATEGORY → Column G (index 4)
        // NOTE: change.businessCategory === '' is an EXPLICIT CLEAR
        if (change.businessCategory !== undefined) {
          var newBizCat = change.businessCategory || '';
          existingData[idx][4] = newBizCat; // Column G
          if (newBizCat) {
            existingData[idx][3] = ''; // Clear Column F when setting business
            if (description) {
              mlEntries.push({ desc: description, cat: newBizCat, type: isIncome ? 'income' : 'expense', catType: 'business' });
            }
          }
        }
        
        // NEED/DESIRE → Column I (index 6)
        // Allow explicit clear (empty string)
        if (change.needDesire !== undefined && !isIncome) {
          existingData[idx][6] = change.needDesire || '';
        }
        
        // MEMO → Column H (index 5)
        if (change.memo !== undefined && change.memo !== '') {
          existingData[idx][5] = change.memo;
          Logger.log('Setting memo for row ' + row + ': ' + change.memo);
        } else if (change.memo === '') {
          existingData[idx][5] = ''; // Allow clearing memo
          Logger.log('Clearing memo for row ' + row);
        }
        
        // RECEIPT → Column K (index 8)
        if (change.receipt !== undefined && change.receipt !== '' && !change.businessCategory) {
          existingData[idx][8] = change.receipt;
        }
        
        savedCount++;
        
      } catch (rowError) {
        Logger.log('ERROR processing row ' + change.row + ': ' + rowError.message);
        errors.push('Row ' + change.row + ': ' + rowError.message);
      }
    }
    
    // OPTIMIZATION: Write all data back in ONE operation
    dataRange.setValues(existingData);
    Logger.log('✅ Batch write complete for ' + savedCount + ' rows');
    
    // OPTIMIZATION: Batch ML learning (run in background if possible)
    if (mlEntries.length > 0) {
      batchCacheMLLearning(mlEntries);
      Logger.log('✅ ML learning batched for ' + mlEntries.length + ' entries');
    }
    
    var message = 'Saved ' + savedCount + ' change(s) successfully';
    if (errors.length > 0) {
      message += '. Errors: ' + errors.join(', ');
    }
    
    Logger.log('saveCategorizationChangesV2 COMPLETE: ' + message);
    Logger.log('═══════════════════════════════════════════════════════════════════');
    
    // TRIGGER TWO-WAY SYNC: Queue transactions with business categories for sync
    try {
      if (typeof onCategorizationSaved === 'function') {
        // Pass full transaction data for sync queuing
        var fullChanges = changes.map(function(change) {
          var idx = change.row - 11;
          if (idx >= 0 && idx < existingData.length) {
            return {
              row: change.row,
              date: existingData[idx][0],
              description: existingData[idx][1],
              amount: existingData[idx][2],
              category: change.personalCategory || change.specialLabel || '',
              businessCategory: change.businessCategory || '',
              memo: change.memo || existingData[idx][5] || ''
            };
          }
          return change;
        });
        onCategorizationSaved(accountName, fullChanges);
      }
    } catch (syncErr) {
      Logger.log('[SYNC] Error triggering sync: ' + syncErr.message);
    }
    
    return {
      success: true,
      savedCount: savedCount,
      errors: errors,
      message: message
    };
    
  } catch (e) {
    Logger.log('[ERROR] saveCategorizationChangesV2: ' + e.message);
    throw e;
  }
}

/**
 * Batch ML learning - process multiple entries at once
 */
function batchCacheMLLearning(entries) {
  try {
    if (!entries || entries.length === 0) return;
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var backend = ss.getSheetByName('BACKEND');
    
    if (!backend) {
      Logger.log('[WARN] BACKEND sheet not found for ML learning');
      return;
    }
    
    var mlStartRow = findMLSectionRow(backend);
    if (!mlStartRow) {
      // Create ML section at row 500
      mlStartRow = 500;
      backend.getRange(mlStartRow, 1, 1, 6).setValues([['MACHINE LEARNING', '', '', '', '', '']]);
      backend.getRange(mlStartRow + 1, 1, 1, 6).setValues([['Description', 'Category', 'Type', 'CatType', 'Count', 'LastUsed']]);
    }
    
    var dataStartRow = mlStartRow + 2;
    var lastRow = backend.getLastRow();
    var numRows = Math.max(1, lastRow - dataStartRow + 1);
    
    // Read existing ML data
    var existingData = [];
    if (lastRow >= dataStartRow) {
      existingData = backend.getRange(dataStartRow, 1, numRows, 6).getValues();
    }
    
    // Build lookup map for existing entries
    var existingMap = {};
    for (var i = 0; i < existingData.length; i++) {
      var key = String(existingData[i][0]).toUpperCase() + '|' + existingData[i][2] + '|' + existingData[i][3];
      existingMap[key] = { row: dataStartRow + i, index: i, count: existingData[i][4] || 0 };
    }
    
    var now = new Date().toISOString();
    var newEntries = [];
    var updates = [];
    
    // Process each entry
    for (var j = 0; j < entries.length; j++) {
      var entry = entries[j];
      var normalized = normalizeDescription(entry.desc);
      if (!normalized || !entry.cat) continue;
      
      var key = normalized + '|' + entry.type + '|' + entry.catType;
      
      if (existingMap[key]) {
        // Update existing
        var existing = existingMap[key];
        updates.push({ row: existing.row, category: entry.cat, count: existing.count + 1, lastUsed: now });
      } else {
        // Add new
        newEntries.push([normalized, entry.cat, entry.type, entry.catType, 1, now]);
        // Add to map to avoid duplicates in same batch
        existingMap[key] = { row: -1, count: 1 };
      }
    }
    
    // Apply updates - batch by column when multiple updates (reduces API calls)
    if (updates.length > 0) {
      // For efficiency: update entire data range at once if we have existing data
      if (existingData.length > 0 && updates.length >= 3) {
        // Modify in-memory and write back all at once
        for (var u = 0; u < updates.length; u++) {
          var upd = updates[u];
          var idx = upd.row - dataStartRow;
          if (idx >= 0 && idx < existingData.length) {
            existingData[idx][1] = upd.category;  // Column B (index 1)
            existingData[idx][4] = upd.count;     // Column E (index 4)
            existingData[idx][5] = upd.lastUsed;  // Column F (index 5)
          }
        }
        backend.getRange(dataStartRow, 1, existingData.length, 6).setValues(existingData);
      } else {
        // Few updates - individual setValue is fine
        for (var u = 0; u < updates.length; u++) {
          var upd = updates[u];
          backend.getRange(upd.row, 2).setValue(upd.category);
          backend.getRange(upd.row, 5).setValue(upd.count);
          backend.getRange(upd.row, 6).setValue(upd.lastUsed);
        }
      }
    }
    
    // Append new entries in one batch
    if (newEntries.length > 0) {
      var appendRow = Math.max(dataStartRow, lastRow + 1);
      backend.getRange(appendRow, 1, newEntries.length, 6).setValues(newEntries);
    }
    
    // Clear ML cache
    ML_CACHE.data = null;
    
    Logger.log('ML batch complete: ' + updates.length + ' updated, ' + newEntries.length + ' added');
    
  } catch (e) {
    Logger.log('[WARN] batchCacheMLLearning error: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// SPLIT TRANSACTION - INSERT NEW ROWS
// ═══════════════════════════════════════════════════════════════════

/**
 * Split a transaction by inserting new rows after the last data row
 * @param {string} accountName - The account sheet name
 * @param {Object} splitData - Contains originalRow, originalDescription, originalDate, isIncome, splits[], insertAfterRow
 * @returns {Object} - { success: boolean, newRows: number[], error?: string }
 */
function splitTransaction(accountName, splitData) {
  try {
    Logger.log('═══════════════════════════════════════════════════════════════════');
    Logger.log('splitTransaction START');
    Logger.log('Account: ' + accountName);
    Logger.log('splitData: ' + JSON.stringify(splitData));
    Logger.log('Original Row: ' + splitData.originalRow);
    Logger.log('Insert After Row: ' + splitData.insertAfterRow);
    Logger.log('Number of splits: ' + (splitData.splits ? splitData.splits.length : 'NO SPLITS!'));
    Logger.log('Splits data: ' + JSON.stringify(splitData.splits));
    
    // Validate splitData
    if (!splitData || !splitData.splits || splitData.splits.length === 0) {
      Logger.log('ERROR: No splits data provided!');
      return { success: false, error: 'No splits data provided' };
    }
    
    if (!splitData.originalRow || splitData.originalRow < 11) {
      Logger.log('ERROR: Invalid original row: ' + splitData.originalRow);
      return { success: false, error: 'Invalid original row' };
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(accountName);
    
    if (!sheet) {
      Logger.log('ERROR: Account sheet not found: ' + accountName);
      return { success: false, error: 'Account sheet not found: ' + accountName };
    }
    
    Logger.log('Sheet found: ' + sheet.getName());
    
    // IMPORTANT: Find the ACTUAL row by matching transaction data
    // The modal's row number may be stale after previous operations
    var dataStartRow = 11;
    var lastRow = sheet.getLastRow();
    var numSplits = splitData.splits.length;
    var newRows = [];
    
    // Find actual row by matching date, description, and amount
    var actualRow = splitData.originalRow; // Default fallback
    
    if (lastRow >= dataStartRow) {
      var searchRange = sheet.getRange(dataStartRow, 3, lastRow - dataStartRow + 1, 3); // C:E
      var searchData = searchRange.getValues();
      
      for (var searchIdx = 0; searchIdx < searchData.length; searchIdx++) {
        var rowDate = searchData[searchIdx][0];
        var rowDesc = searchData[searchIdx][1];
        var rowAmount = searchData[searchIdx][2];
        
        // Normalize for comparison
        var descMatch = String(rowDesc).trim() === String(splitData.originalDescription).trim();
        var amountMatch = Math.abs(parseFloat(rowAmount) - parseFloat(splitData.originalAmount || 0)) < 0.01;
        
        // Date comparison (handle Date objects and strings)
        var dateMatch = false;
        if (rowDate && splitData.originalDate) {
          var d1 = rowDate instanceof Date ? rowDate.getTime() : new Date(rowDate).getTime();
          var d2 = splitData.originalDate instanceof Date ? splitData.originalDate.getTime() : new Date(splitData.originalDate).getTime();
          dateMatch = Math.abs(d1 - d2) < 86400000; // Within 1 day
        }
        
        if (descMatch && (amountMatch || dateMatch)) {
          actualRow = dataStartRow + searchIdx;
          Logger.log('Found actual row by matching: ' + actualRow + ' (modal said: ' + splitData.originalRow + ')');
          break;
        }
      }
    }
    
    var insertAfterRow = actualRow;
    Logger.log('Will insert ' + numSplits + ' rows after ACTUAL row ' + insertAfterRow);
    
    // Insert rows immediately after the found transaction
    sheet.insertRowsAfter(insertAfterRow, numSplits);
    
    // BATCH OPTIMIZATION: Build all row data in memory, write once
    var batchData = [];
    
    for (var i = 0; i < numSplits; i++) {
      var newRowNum = insertAfterRow + 1 + i;
      var split = splitData.splits[i];
      var amount = splitData.isIncome ? split.amount : -split.amount;
      var isBusiness = split.isBusiness || split.type === 'business';
      var isSpecial = split.isSpecial || split.type === 'special';
      
      // Column mappings: C(3)=Date, D(4)=Desc, E(5)=Amount, F(6)=Personal, G(7)=Business, H(8)=Memo
      var splitDesc = 'SPLIT: ' + splitData.originalDescription + ' (' + (i + 1) + '/' + numSplits + ')';
      var memoText = 'Split from row ' + actualRow + (isBusiness ? ' [Business]' : '');
      
      // Build row data: [Date, Description, Amount, PersonalCat, BusinessCat, Memo]
      var personalCat = '';
      var businessCat = '';
      
      if (isSpecial) {
        businessCat = split.specialLabel || split.category;
        Logger.log('Created SPECIAL split row ' + newRowNum + ': ' + businessCat + ' = $' + split.amount);
      } else if (isBusiness) {
        businessCat = split.category;
        Logger.log('Created BUSINESS split row ' + newRowNum + ': ' + businessCat + ' = $' + split.amount);
      } else {
        personalCat = split.category;
        Logger.log('Created PERSONAL split row ' + newRowNum + ': ' + personalCat + ' = $' + split.amount);
      }
      
      // Row data for columns C-H (indices 0-5 map to columns 3-8)
      batchData.push([splitData.originalDate, splitDesc, amount, personalCat, businessCat, memoText]);
      newRows.push(newRowNum);
    }
    
    // Write all split rows in ONE batch operation (columns C through H = 6 columns)
    if (batchData.length > 0) {
      sheet.getRange(insertAfterRow + 1, 3, batchData.length, 6).setValues(batchData);
    }
    
    // Determine if ALL splits are business-only or special labels
    var allBusinessOrSpecial = splitData.splits.every(function(split) {
      return split.isBusiness || split.type === 'business' || split.isSpecial || split.type === 'special';
    });
    
    // Mark ORIGINAL transaction as "Transaction Split" in appropriate column
    // IMPORTANT: Use actualRow (the row we found by searching), not splitData.originalRow (stale)
    // - If ALL splits are business/special → Column G (Business/Special)
    // - Otherwise → Column F (Personal)
    Logger.log('Marking original row ' + actualRow + ' as Transaction Split');
    if (allBusinessOrSpecial) {
      // All business/special splits: "Transaction Split" goes in Column G
      sheet.getRange(actualRow, 7).setValue('Transaction Split');  // Column G
      sheet.getRange(actualRow, 6).setValue('');                   // Clear Column F
      Logger.log('Original row ' + actualRow + ' marked as Transaction Split in Column G (all business/special splits)');
    } else {
      // Mixed or all personal splits: "Transaction Split" goes in Column F
      sheet.getRange(actualRow, 6).setValue('Transaction Split');  // Column F
      sheet.getRange(actualRow, 7).setValue('');                   // Clear Column G
      Logger.log('Original row ' + actualRow + ' marked as Transaction Split in Column F (personal or mixed splits)');
    }
    
    Logger.log('splitTransaction SUCCESS - Created ' + numSplits + ' new rows');
    Logger.log('═══════════════════════════════════════════════════════════════════');
    
    return {
      success: true,
      newRows: newRows,
      message: 'Created ' + numSplits + ' split transactions'
    };
    
  } catch (e) {
    Logger.log('[ERROR] splitTransaction: ' + e.message);
    return {
      success: false,
      error: e.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// OFFSET TRANSACTION (REFUND/RETURN/REIMBURSEMENT)
// ═══════════════════════════════════════════════════════════════════

/**
 * Create an offsetting transaction for Refund/Return/Reimbursement
 * @param {string} accountName - The account sheet name
 * @param {Object} offsetData - Contains originalRow, originalDescription, originalDate, originalAmount, labelType
 * @returns {Object} - { success: boolean, newRow: number, error?: string }
 */
function createOffsetTransaction(accountName, offsetData) {
  try {
    Logger.log('═══════════════════════════════════════════════════════════════════');
    Logger.log('createOffsetTransaction START');
    Logger.log('Account: ' + accountName);
    Logger.log('Original Row: ' + offsetData.originalRow);
    Logger.log('Label Type: ' + offsetData.labelType);
    Logger.log('Original Amount: ' + offsetData.originalAmount);
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(accountName);
    
    if (!sheet) {
      return { success: false, error: 'Account sheet not found: ' + accountName };
    }
    
    // Find the last row with data
    var lastRow = sheet.getLastRow();
    
    // Insert a new row after the last data row
    var newRowNum = lastRow + 1;
    
    // Calculate the offset amount (opposite sign)
    var offsetAmount = -offsetData.originalAmount;
    
    // Build the description
    var labelType = offsetData.labelType || 'Refund';
    var description = labelType.toUpperCase() + ': ' + offsetData.originalDescription;
    
    // BATCH OPTIMIZATION: Write all columns in one operation
    // Column mappings: C(3)=Date, D(4)=Desc, E(5)=Amount, F(6)=Personal, G(7)=Business, H(8)=Memo
    var rowData = [
      offsetData.originalDate,                     // C - Date
      description,                                 // D - Description  
      offsetAmount,                                // E - Amount
      labelType,                                   // F - Personal/Labels
      '',                                          // G - Business (clear)
      'Offset for row ' + offsetData.originalRow   // H - Memo
    ];
    sheet.getRange(newRowNum, 3, 1, 6).setValues([rowData]);
    
    Logger.log('createOffsetTransaction SUCCESS - Created row ' + newRowNum);
    Logger.log('Offset amount: ' + offsetAmount);
    Logger.log('═══════════════════════════════════════════════════════════════════');
    
    return {
      success: true,
      newRow: newRowNum,
      message: 'Created ' + labelType.toLowerCase() + ' offset transaction'
    };
    
  } catch (e) {
    Logger.log('[ERROR] createOffsetTransaction: ' + e.message);
    return {
      success: false,
      error: e.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// ML LEARNING SYSTEM - CACHED LIKE ACCESS KEYS
// Stores in BACKEND sheet "MACHINE LEARNING" section
// Cached locally to avoid repeated requests
// ═══════════════════════════════════════════════════════════════════

// ML Cache - stored in memory during session
var ML_CACHE = {
  data: null,
  lastLoaded: 0,
  TTL: 300000 // 5 minutes cache
};

/**
 * Cache ML learning data to BACKEND sheet
 * @param {string} description - Transaction description
 * @param {string} category - Category selected
 * @param {string} type - 'income' or 'expense'
 * @param {string} catType - 'personal' or 'business'
 */
function cacheMLLearning(description, category, type, catType) {
  try {
    var normalized = normalizeDescription(description);
    if (!normalized || !category) return;
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var backend = ss.getSheetByName('BACKEND');
    
    if (!backend) {
      Logger.log('[WARN] BACKEND sheet not found for ML learning');
      // Fallback to script properties
      recordCategorizationLearning(description, category, type);
      return;
    }
    
    // Find or create MACHINE LEARNING section
    // Look for "MACHINE LEARNING" header starting around row 100+
    var mlStartRow = findMLSectionRow(backend);
    
    if (!mlStartRow) {
      // Create ML section at row 500 if not found - BATCH write headers
      mlStartRow = 500;
      backend.getRange(mlStartRow, 1).setValue('MACHINE LEARNING');
      backend.getRange(mlStartRow + 1, 1, 1, 6).setValues([['Description', 'Category', 'Type', 'CatType', 'Count', 'LastUsed']]);
    }
    
    // Data starts at mlStartRow + 2
    var dataStartRow = mlStartRow + 2;
    var lastRow = Math.min(backend.getLastRow(), dataStartRow + 2000);
    
    // Check if this description already exists
    var existingRow = -1;
    if (lastRow >= dataStartRow) {
      var numRows = lastRow - dataStartRow + 1;
      var existingData = backend.getRange(dataStartRow, 1, numRows, 5).getValues();
      
      for (var i = 0; i < existingData.length; i++) {
        if (String(existingData[i][0]).toUpperCase() === normalized && 
            String(existingData[i][2]) === type &&
            String(existingData[i][3]) === catType) {
          existingRow = dataStartRow + i;
          break;
        }
      }
    }
    
    var now = new Date().toISOString();
    
    if (existingRow > 0) {
      // BATCH: Update existing row - read once, write once
      var existingData = backend.getRange(existingRow, 1, 1, 6).getValues()[0];
      existingData[1] = category;                    // Column B
      existingData[4] = (existingData[4] || 0) + 1;  // Column E (count)
      existingData[5] = now;                         // Column F (lastUsed)
      backend.getRange(existingRow, 1, 1, 6).setValues([existingData]);
      Logger.log('ML: Updated existing rule for "' + normalized + '" -> ' + category);
    } else {
      // BATCH: Add new row with all data at once
      var newRow = lastRow + 1;
      backend.getRange(newRow, 1, 1, 6).setValues([[normalized, category, type, catType, 1, now]]);
      Logger.log('ML: Added new rule "' + normalized + '" -> ' + category);
    }
    
    // Clear cache so it reloads next time
    ML_CACHE.data = null;
    
  } catch (e) {
    Logger.log('[WARN] cacheMLLearning error: ' + e.message);
    // Fallback to script properties
    recordCategorizationLearning(description, category, type);
  }
}

/**
 * Find the MACHINE LEARNING section row in BACKEND
 */
function findMLSectionRow(backend) {
  try {
    // Search for "MACHINE LEARNING" header in column A
    var searchRange = backend.getRange('A1:A600').getValues();
    for (var i = 0; i < searchRange.length; i++) {
      if (String(searchRange[i][0]).toUpperCase().indexOf('MACHINE LEARNING') !== -1) {
        return i + 1; // Convert to 1-based row
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Get all ML data for frontend caching
 * Returns cached data if available and fresh
 */
function getMLDataForCache() {
  try {
    // Check if cache is fresh
    var now = Date.now();
    if (ML_CACHE.data && (now - ML_CACHE.lastLoaded) < ML_CACHE.TTL) {
      Logger.log('ML: Returning cached data');
      return ML_CACHE.data;
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var backend = ss.getSheetByName('BACKEND');
    
    if (!backend) {
      Logger.log('[WARN] BACKEND sheet not found for ML cache');
      return { rules: [], lastUpdated: now };
    }
    
    var mlStartRow = findMLSectionRow(backend);
    if (!mlStartRow) {
      Logger.log('[INFO] No MACHINE LEARNING section found');
      return { rules: [], lastUpdated: now };
    }
    
    var dataStartRow = mlStartRow + 2;
    var lastRow = Math.min(backend.getLastRow(), dataStartRow + 2000);
    
    if (lastRow < dataStartRow) {
      return { rules: [], lastUpdated: now };
    }
    
    var numRows = lastRow - dataStartRow + 1;
    var data = backend.getRange(dataStartRow, 1, numRows, 5).getValues();
    
    var rules = [];
    for (var i = 0; i < data.length; i++) {
      var desc = String(data[i][0] || '').trim();
      var cat = String(data[i][1] || '').trim();
      var type = String(data[i][2] || '').trim();
      var catType = String(data[i][3] || '').trim();
      var count = parseInt(data[i][4]) || 0;
      
      if (desc && cat && count >= 1) {
        rules.push({
          description: desc,
          category: cat,
          type: type,
          catType: catType,
          count: count
        });
      }
    }
    
    // Update cache
    ML_CACHE.data = { rules: rules, lastUpdated: now };
    ML_CACHE.lastLoaded = now;
    
    Logger.log('ML: Loaded ' + rules.length + ' rules from BACKEND');
    return ML_CACHE.data;
    
  } catch (e) {
    Logger.log('[ERROR] getMLDataForCache: ' + e.message);
    return { rules: [], lastUpdated: Date.now() };
  }
}

/**
 * Legacy: Record user categorization for ML learning (Script Properties fallback)
 */
function recordCategorizationLearning(description, category, type) {
  try {
    var normalized = normalizeDescription(description);
    if (!normalized || !category) return;
    
    var props = PropertiesService.getScriptProperties();
    var key = 'mm_cat_ml_' + type;
    var rulesJson = props.getProperty(key) || '{}';
    var rules;
    
    try {
      rules = JSON.parse(rulesJson);
    } catch (e) {
      rules = {};
    }
    
    // Store: {normalized_description: {category, count, lastUsed}}
    if (!rules[normalized]) {
      rules[normalized] = { category: category, count: 1, lastUsed: Date.now() };
    } else {
      rules[normalized].category = category;
      rules[normalized].count = (rules[normalized].count || 0) + 1;
      rules[normalized].lastUsed = Date.now();
    }
    
    // Limit to 3000 rules to stay within Script Properties limit
    var keys = Object.keys(rules);
    if (keys.length > 3000) {
      keys.sort(function(a, b) {
        return (rules[a].lastUsed || 0) - (rules[b].lastUsed || 0);
      });
      for (var i = 0; i < 500; i++) {
        delete rules[keys[i]];
      }
    }
    
    props.setProperty(key, JSON.stringify(rules));
    
  } catch (e) {
    Logger.log('[WARN] recordCategorizationLearning error: ' + e.message);
  }
}

/**
 * Record Need/Desire learning - learns user's Need vs Desire preferences
 * @param {string} description - Transaction description
 * @param {string} category - The category assigned
 * @param {string} needDesire - 'Need' or 'Desire'
 */
function recordNeedDesireLearning(description, category, needDesire) {
  try {
    if (!needDesire || !category) return;
    
    var props = PropertiesService.getScriptProperties();
    var key = 'mm_need_desire_ml';
    var rulesJson = props.getProperty(key) || '{}';
    var rules;
    
    try {
      rules = JSON.parse(rulesJson);
    } catch (e) {
      rules = {};
    }
    
    // Store by category (more reliable than description)
    var catKey = category.toUpperCase().trim();
    if (!rules[catKey]) {
      rules[catKey] = { needCount: 0, desireCount: 0, lastUsed: Date.now() };
    }
    
    if (needDesire === 'Need') {
      rules[catKey].needCount = (rules[catKey].needCount || 0) + 1;
    } else if (needDesire === 'Desire') {
      rules[catKey].desireCount = (rules[catKey].desireCount || 0) + 1;
    }
    rules[catKey].lastUsed = Date.now();
    
    // Limit to 500 category rules
    var keys = Object.keys(rules);
    if (keys.length > 500) {
      keys.sort(function(a, b) {
        return (rules[a].lastUsed || 0) - (rules[b].lastUsed || 0);
      });
      for (var i = 0; i < 100; i++) {
        delete rules[keys[i]];
      }
    }
    
    props.setProperty(key, JSON.stringify(rules));
    
  } catch (e) {
    Logger.log('[WARN] recordNeedDesireLearning error: ' + e.message);
  }
}

/**
 * Get Need/Desire prediction for a category
 * @param {string} category - The category to predict for
 * @returns {object} { prediction: 'Need'|'Desire'|null, confidence: 0-1 }
 */
function getNeedDesirePrediction(category) {
  try {
    if (!category) return { prediction: null, confidence: 0 };
    
    var props = PropertiesService.getScriptProperties();
    var key = 'mm_need_desire_ml';
    var rulesJson = props.getProperty(key) || '{}';
    var rules;
    
    try {
      rules = JSON.parse(rulesJson);
    } catch (e) {
      return { prediction: null, confidence: 0 };
    }
    
    var catKey = category.toUpperCase().trim();
    var rule = rules[catKey];
    
    if (!rule) return { prediction: null, confidence: 0 };
    
    var total = (rule.needCount || 0) + (rule.desireCount || 0);
    if (total < 2) return { prediction: null, confidence: 0 }; // Need at least 2 occurrences
    
    if (rule.needCount > rule.desireCount) {
      return { 
        prediction: 'Need', 
        confidence: Math.min(0.95, 0.5 + (rule.needCount - rule.desireCount) / total * 0.5)
      };
    } else if (rule.desireCount > rule.needCount) {
      return { 
        prediction: 'Desire', 
        confidence: Math.min(0.95, 0.5 + (rule.desireCount - rule.needCount) / total * 0.5)
      };
    }
    
    return { prediction: null, confidence: 0 };
    
  } catch (e) {
    Logger.log('[WARN] getNeedDesirePrediction error: ' + e.message);
    return { prediction: null, confidence: 0 };
  }
}

/**
 * Get all Need/Desire predictions for the ML suggestions
 * @returns {object} Map of category -> prediction
 */
function getAllNeedDesirePredictions() {
  try {
    var props = PropertiesService.getScriptProperties();
    var key = 'mm_need_desire_ml';
    var rulesJson = props.getProperty(key) || '{}';
    var rules;
    
    try {
      rules = JSON.parse(rulesJson);
    } catch (e) {
      return {};
    }
    
    var predictions = {};
    for (var catKey in rules) {
      var rule = rules[catKey];
      var total = (rule.needCount || 0) + (rule.desireCount || 0);
      if (total >= 2) {
        if (rule.needCount > rule.desireCount) {
          predictions[catKey] = 'Need';
        } else if (rule.desireCount > rule.needCount) {
          predictions[catKey] = 'Desire';
        }
      }
    }
    
    return predictions;
    
  } catch (e) {
    Logger.log('[WARN] getAllNeedDesirePredictions error: ' + e.message);
    return {};
  }
}

/**
 * Record ML rejection - smart learning from user feedback
 * 
 * Logic:
 * - If description has never been used with ANY category → mark as "bad recommendation"
 * - If description has been used with a DIFFERENT category before → store both as alternatives
 *   and recommend the other option next time
 * 
 * @param {string} description - Transaction description
 * @param {string} rejectedCategory - The category that was rejected
 * @param {string} type - 'income' or 'expense'
 */
function recordMLRejection(description, rejectedCategory, type) {
  try {
    var normalized = normalizeDescription(description);
    if (!normalized || !rejectedCategory) return;
    
    var props = PropertiesService.getScriptProperties();
    
    // Check if this description has been used with any category before
    var rulesKey = 'mm_cat_ml_' + type;
    var rulesJson = props.getProperty(rulesKey) || '{}';
    var rules;
    
    try {
      rules = JSON.parse(rulesJson);
    } catch (e) {
      rules = {};
    }
    
    // Get/create rejection tracking
    var rejectKey = 'mm_cat_ml_reject_' + type;
    var rejectJson = props.getProperty(rejectKey) || '{}';
    var rejections;
    
    try {
      rejections = JSON.parse(rejectJson);
    } catch (e) {
      rejections = {};
    }
    
    var existingRule = rules[normalized];
    
    if (!existingRule) {
      // Never used before - mark as bad recommendation
      Logger.log('[ML] Rejection: "' + normalized + '" → "' + rejectedCategory + '" (never used - marking as bad)');
      
      if (!rejections[normalized]) {
        rejections[normalized] = { badCategories: [], alternatives: [] };
      }
      
      if (rejections[normalized].badCategories.indexOf(rejectedCategory) === -1) {
        rejections[normalized].badCategories.push(rejectedCategory);
      }
      
    } else if (existingRule.category !== rejectedCategory) {
      // Has been used with a DIFFERENT category - store alternative
      Logger.log('[ML] Rejection: "' + normalized + '" → "' + rejectedCategory + '" (has alternative: ' + existingRule.category + ')');
      
      if (!rejections[normalized]) {
        rejections[normalized] = { badCategories: [], alternatives: [] };
      }
      
      // The existing category is the preferred one
      if (rejections[normalized].alternatives.indexOf(existingRule.category) === -1) {
        rejections[normalized].alternatives.push(existingRule.category);
      }
      
      // Mark rejected as bad (at least for now)
      if (rejections[normalized].badCategories.indexOf(rejectedCategory) === -1) {
        rejections[normalized].badCategories.push(rejectedCategory);
      }
      
    } else {
      // User rejected the same category they previously used - reduce confidence
      Logger.log('[ML] Rejection: "' + normalized + '" → "' + rejectedCategory + '" (same as previous - reducing count)');
      
      if (existingRule.count > 1) {
        existingRule.count = Math.max(1, existingRule.count - 1);
        rules[normalized] = existingRule;
        props.setProperty(rulesKey, JSON.stringify(rules));
      }
    }
    
    // Limit rejections storage
    var rejectKeys = Object.keys(rejections);
    if (rejectKeys.length > 1000) {
      // Remove oldest entries (simple FIFO since we don't track timestamps)
      for (var i = 0; i < 200; i++) {
        delete rejections[rejectKeys[i]];
      }
    }
    
    props.setProperty(rejectKey, JSON.stringify(rejections));
    Logger.log('[ML] Rejection recorded for: ' + normalized);
    
  } catch (e) {
    Logger.log('[WARN] recordMLRejection error: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// AI-POWERED CATEGORY SUGGESTIONS (Google Sheets AI() Formula)
// ═══════════════════════════════════════════════════════════════════

/**
 * Setup AI suggestion formulas for an account sheet
 * Adds =AI() formula to Column M for uncategorized transactions
 * Now includes BOTH personal AND business categories in the prompt
 * 
 * @param {string} accountName - The account sheet name (e.g., "ACCOUNT 1")
 */
function setupAISuggestionsForAccount(accountName) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(accountName);
    
    if (!sheet) {
      Logger.log('[AI] Sheet not found: ' + accountName);
      return { success: false, error: 'Sheet not found' };
    }
    
    // Get ALL categories for the prompt - personal AND business
    var incomeCategories = getIncomeCategoriesFromSheet() || [];
    var expenseCategories = getExpenseCategoriesFromSheet() || [];
    var businessIncomeCategories = getBusinessIncomeCategoriesFromSheet() || [];
    var businessExpenseCategories = getBusinessExpenseCategoriesFromSheet() || [];
    
    // Column M = 13 for AI suggestions
    var AI_COL = 13;
    var DATA_START_ROW = 11;
    var lastRow = sheet.getLastRow();
    
    if (lastRow < DATA_START_ROW) {
      Logger.log('[AI] No data rows in ' + accountName);
      return { success: true, count: 0 };
    }
    
    // Add header if not exists
    var headerCell = sheet.getRange(10, AI_COL);
    if (!headerCell.getValue()) {
      headerCell.setValue('AI Suggestion');
    }
    
    // Build category list strings - include both personal and business
    // Mark business categories with [BIZ] prefix so we can identify them later
    var personalIncomeCats = incomeCategories.slice(0, 15).join(', ');
    var businessIncomeCats = businessIncomeCategories.slice(0, 10).map(function(c) { return '[BIZ] ' + c; }).join(', ');
    var incomeCatList = personalIncomeCats + (businessIncomeCats ? ', ' + businessIncomeCats : '');
    
    var personalExpenseCats = expenseCategories.slice(0, 20).join(', ');
    var businessExpenseCats = businessExpenseCategories.slice(0, 15).map(function(c) { return '[BIZ] ' + c; }).join(', ');
    var expenseCatList = personalExpenseCats + (businessExpenseCats ? ', ' + businessExpenseCats : '');
    
    Logger.log('[AI] Income categories: ' + incomeCatList.substring(0, 100) + '...');
    Logger.log('[AI] Expense categories: ' + expenseCatList.substring(0, 100) + '...');
    
    var count = 0;
    var numRows = lastRow - DATA_START_ROW + 1;
    
    // Read data to check which rows need AI suggestions
    var data = sheet.getRange(DATA_START_ROW, 3, numRows, 11).getValues(); // C to M
    
    for (var i = 0; i < data.length; i++) {
      var row = DATA_START_ROW + i;
      var description = data[i][1]; // D column (index 1 from C)
      var amount = data[i][2];      // E column
      var personalCat = data[i][3]; // F column
      var businessCat = data[i][4]; // G column
      var existingAI = data[i][10]; // M column (index 10 from C)
      
      // Skip if already categorized or no description
      if (!description || personalCat || businessCat) continue;
      
      // Skip if already has AI suggestion
      if (existingAI && String(existingAI).trim() !== '' && String(existingAI).indexOf('#') !== 0) continue;
      
      // Determine if income or expense
      var isIncome = parseFloat(amount) > 0;
      var categoryList = isIncome ? incomeCatList : expenseCatList;
      var transactionType = isIncome ? 'income' : 'expense';
      
      // Build the AI formula — constrain output to ONLY existing categories
      // Normalize description: strip trailing digits/IDs/dates, keep merchant name only
      var cleanDesc = String(description)
        .replace(/"/g, "'")
        .replace(/\b\d{4,}\b/g, '')        // strip 4+ digit reference numbers
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 50);
      // Sort categories by frequency (most-used first) for better default matching
      // We can't sort by frequency here without extra reads, so use the list as-is
      var prompt = 'Categorize this ' + transactionType + ' transaction: "' + cleanDesc + '". ' +
        'Choose EXACTLY one category from this list: ' + categoryList + '. ' +
        'Return ONLY the category name from the list, nothing else.';
      
      var formula = '=AI("' + prompt.replace(/"/g, '""') + '")';
      
      sheet.getRange(row, AI_COL).setFormula(formula);
      count++;
      
      // No limit - process ALL uncategorized transactions
      // AI formulas are lightweight and calculate asynchronously
    }
    
    // Hide Column M so it's invisible to users
    try {
      sheet.hideColumns(AI_COL);
    } catch (hideErr) {
      Logger.log('[AI] Could not hide column M: ' + hideErr.message);
    }
    
    Logger.log('[AI] Added ' + count + ' AI suggestion formulas to ' + accountName);
    return { success: true, count: count };
    
  } catch (e) {
    Logger.log('[AI] setupAISuggestionsForAccount error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Get AI suggestions from Column M for the ML Suggestions view
 * 
 * @param {string} accountName - The account sheet name
 * @returns {Object} Map of row -> AI suggestion
 */
function getAISuggestionsForAccount(accountName) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(accountName);
    
    if (!sheet) return {};
    
    var AI_COL = 13; // Column M
    var DATA_START_ROW = 11;
    var lastRow = sheet.getLastRow();
    
    if (lastRow < DATA_START_ROW) return {};
    
    var numRows = lastRow - DATA_START_ROW + 1;
    
    // Read AI suggestions and categories
    var data = sheet.getRange(DATA_START_ROW, 3, numRows, 11).getDisplayValues(); // C to M
    
    var suggestions = {};
    
    for (var i = 0; i < data.length; i++) {
      var row = DATA_START_ROW + i;
      var description = data[i][1]; // D
      var personalCat = data[i][3]; // F
      var businessCat = data[i][4]; // G
      var aiSuggestion = data[i][10]; // M
      
      // Only include if uncategorized and has AI suggestion
      if (description && !personalCat && !businessCat && aiSuggestion) {
        var suggestionText = String(aiSuggestion).trim();
        
        // Skip errors, formulas, and prompt text (AI formula not yet calculated)
        var isValidSuggestion = suggestionText && 
          suggestionText.indexOf('#') !== 0 &&          // Not an error
          suggestionText.indexOf('=AI') !== 0 &&        // Not a formula
          suggestionText.indexOf('=') !== 0 &&          // Not any formula
          suggestionText.indexOf('Pick the') === -1 &&  // Not the prompt text
          suggestionText.indexOf('Categories:') === -1 && // Not the prompt text
          suggestionText.indexOf('Reply with') === -1 && // Not the prompt text
          suggestionText.length < 50;                    // Valid categories are short
        
        if (isValidSuggestion) {
          // Check if AI returned a business category (marked with [BIZ] prefix)
          var isBusiness = suggestionText.indexOf('[BIZ]') === 0;
          var categoryName = isBusiness ? suggestionText.replace('[BIZ]', '').trim() : suggestionText;
          
          var suggestion = {
            category: categoryName,
            confidence: 0.85, // AI suggestions get 85% confidence
            source: 'ai',
            explanation: 'AI-powered suggestion based on transaction description',
            isBusiness: isBusiness,
            catType: isBusiness ? 'business' : 'personal'
          };
          
          if (isBusiness) {
            Logger.log('[AI] Business suggestion for row ' + row + ': ' + categoryName);
          }
          
          // Add Need/Desire prediction for expenses (personal only)
          var amount = parseFloat(data[i][2]) || 0; // E - Amount
          if (amount < 0 && !isBusiness) { // Expense AND personal
            var ndPrediction = getNeedDesirePrediction(categoryName);
            if (ndPrediction && ndPrediction.prediction) {
              suggestion.needDesire = ndPrediction.prediction;
              suggestion.needDesireConfidence = ndPrediction.confidence;
            }
          }
          
          suggestions[row] = suggestion;
        }
      }
    }
    
    Logger.log('[AI] Found ' + Object.keys(suggestions).length + ' AI suggestions for ' + accountName);
    return suggestions;
    
  } catch (e) {
    Logger.log('[AI] getAISuggestionsForAccount error: ' + e.message);
    return {};
  }
}

/**
 * Clear AI suggestion for a specific row (when user categorizes manually)
 */
function clearAISuggestion(accountName, row) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(accountName);
    
    if (sheet) {
      sheet.getRange(row, 13).clearContent(); // Column M
    }
  } catch (e) {
    Logger.log('[AI] clearAISuggestion error: ' + e.message);
  }
}

/**
 * Refresh AI suggestions for current account (called from UI)
 */
function refreshAISuggestions() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var activeSheet = ss.getActiveSheet();
  var sheetName = activeSheet.getName();
  
  if (sheetName.indexOf('ACCOUNT') === 0) {
    return setupAISuggestionsForAccount(sheetName);
  } else {
    return { success: false, error: 'Please select an ACCOUNT sheet first' };
  }
}

/**
 * ENHANCED ML SUGGESTION ENGINE
 * Returns: { category, confidence, source, isBusiness } or null
 * 
 * Confidence levels:
 * - 0.95: Exact normalized match with 3+ occurrences
 * - 0.85: Exact normalized match with 2 occurrences
 * - 0.80: Merchant pattern match (e.g., "AMZN" → "AMAZON")
 * - 0.75: Strong keyword overlap (3+ keywords match)
 * - 0.65: Moderate keyword overlap (2 keywords match)
 */

/**
 * FAST ML Suggestion - Matches keywords to user's categories
 * ALWAYS returns a suggestion if possible
 * @param {string} description - Transaction description
 * @param {Array} userCategories - Array of category names to match against
 * @param {boolean} isBusiness - Whether these are business categories (default: false)
 */
function getFastMLSuggestion(description, userCategories, isBusiness) {
  if (!description) return null;
  isBusiness = isBusiness || false;
  
  // Training data: keyword → what to search for in user's categories
  var KEYWORD_TO_SEARCH = {
    // Shopping
    'AMAZON': ['SHOP', 'AMAZON', 'ONLINE', 'RETAIL', 'SUPPLY', 'SUPPLIES', 'OFFICE'],
    'AMZN': ['SHOP', 'AMAZON', 'ONLINE', 'RETAIL', 'SUPPLY', 'SUPPLIES', 'OFFICE'],
    'WALMART': ['SHOP', 'WALMART', 'RETAIL', 'STORE', 'SUPPLY', 'SUPPLIES'],
    'TARGET': ['SHOP', 'TARGET', 'RETAIL', 'STORE', 'SUPPLY'],
    'COSTCO': ['GROCERY', 'COSTCO', 'WHOLESALE', 'FOOD', 'SUPPLY'],
    'KROGER': ['GROCERY', 'FOOD', 'MARKET'],
    
    // Utilities
    'WATER': ['WATER', 'UTILITY', 'UTILITIES', 'BILL'],
    'ELECTRIC': ['ELECTRIC', 'UTILITY', 'UTILITIES', 'POWER', 'BILL'],
    'POWER': ['POWER', 'ELECTRIC', 'UTILITY', 'UTILITIES'],
    'UTILITY': ['UTILITY', 'UTILITIES', 'BILL'],
    
    // Housing
    'MORTGAGE': ['MORTGAGE', 'HOUSING', 'HOME', 'RENT', 'PROPERTY'],
    'RENT': ['RENT', 'HOUSING', 'HOME', 'APARTMENT', 'LEASE', 'OFFICE'],
    'LEASE': ['LEASE', 'RENT', 'HOUSING', 'APARTMENT', 'OFFICE'],
    
    // Savings
    'RETIREMENT': ['RETIREMENT', 'SAVINGS', 'SAVE', '401', 'IRA', 'INVEST'],
    'SAVINGS': ['SAVINGS', 'SAVE', 'RETIREMENT'],
    '401K': ['401', 'RETIREMENT', 'SAVINGS'],
    'IRA': ['IRA', 'RETIREMENT', 'SAVINGS'],
    'FIDELITY': ['INVEST', 'RETIREMENT', 'SAVINGS', 'FIDELITY'],
    'VANGUARD': ['INVEST', 'RETIREMENT', 'SAVINGS', 'VANGUARD'],
    
    // Transportation
    'UBER': ['UBER', 'RIDE', 'TRANSPORT', 'TRAVEL', 'MILEAGE'],
    'LYFT': ['LYFT', 'RIDE', 'TRANSPORT', 'TRAVEL', 'MILEAGE'],
    'GAS': ['GAS', 'FUEL', 'AUTO', 'CAR', 'MILEAGE', 'VEHICLE'],
    'SHELL': ['GAS', 'FUEL', 'AUTO', 'MILEAGE'],
    'CHEVRON': ['GAS', 'FUEL', 'AUTO', 'MILEAGE'],
    'EXXON': ['GAS', 'FUEL', 'AUTO', 'MILEAGE'],
    
    // Food
    'STARBUCKS': ['COFFEE', 'CAFE', 'DINING', 'FOOD', 'MEALS', 'ENTERTAINMENT'],
    'DUNKIN': ['COFFEE', 'CAFE', 'DINING', 'FOOD', 'MEALS'],
    'MCDONALDS': ['DINING', 'RESTAURANT', 'FOOD', 'FAST', 'MEALS'],
    'DOORDASH': ['DELIVERY', 'FOOD', 'DINING', 'TAKEOUT', 'MEALS'],
    'GRUBHUB': ['DELIVERY', 'FOOD', 'DINING', 'TAKEOUT', 'MEALS'],
    
    // Banking
    'ATM': ['CASH', 'ATM', 'WITHDRAW', 'BANK'],
    'WITHDRAW': ['CASH', 'ATM', 'WITHDRAW', 'BANK'],
    'DEPOSIT': ['DEPOSIT', 'INCOME', 'BANK', 'REVENUE'],
    'PAYROLL': ['PAYROLL', 'INCOME', 'SALARY', 'WAGE', 'LABOR'],
    'DIRECT': ['DEPOSIT', 'INCOME', 'DIRECT', 'REVENUE'],
    'VENMO': ['TRANSFER', 'VENMO', 'PAYMENT'],
    'ZELLE': ['TRANSFER', 'ZELLE', 'PAYMENT'],
    'PAYPAL': ['PAYPAL', 'TRANSFER', 'PAYMENT', 'FEES'],
    
    // Insurance
    'INSURANCE': ['INSURANCE', 'PREMIUM', 'COVERAGE'],
    'GEICO': ['INSURANCE', 'AUTO', 'CAR'],
    'ALLSTATE': ['INSURANCE'],
    
    // Entertainment
    'NETFLIX': ['ENTERTAINMENT', 'STREAMING', 'SUBSCRIPTION', 'NETFLIX', 'SOFTWARE'],
    'SPOTIFY': ['ENTERTAINMENT', 'STREAMING', 'SUBSCRIPTION', 'MUSIC', 'SOFTWARE'],
    'HULU': ['ENTERTAINMENT', 'STREAMING', 'SUBSCRIPTION', 'SOFTWARE'],
    
    // Pharmacy
    'CVS': ['PHARMACY', 'DRUG', 'MEDICAL', 'HEALTH'],
    'WALGREENS': ['PHARMACY', 'DRUG', 'MEDICAL', 'HEALTH'],
    
    // Loan
    'LOAN': ['LOAN', 'DEBT', 'PAYMENT', 'AUTO', 'CAR', 'INTEREST'],
    
    // Business-specific keywords
    'ADOBE': ['SOFTWARE', 'SUBSCRIPTION', 'CREATIVE', 'ADOBE'],
    'MICROSOFT': ['SOFTWARE', 'SUBSCRIPTION', 'OFFICE', 'MICROSOFT'],
    'GOOGLE': ['SOFTWARE', 'ADVERTISING', 'ADS', 'GOOGLE', 'CLOUD'],
    'FACEBOOK': ['ADVERTISING', 'ADS', 'MARKETING', 'SOCIAL'],
    'META': ['ADVERTISING', 'ADS', 'MARKETING', 'SOCIAL'],
    'LINKEDIN': ['ADVERTISING', 'ADS', 'MARKETING', 'SOCIAL', 'PROFESSIONAL'],
    'QUICKBOOKS': ['SOFTWARE', 'ACCOUNTING', 'SUBSCRIPTION'],
    'ZOOM': ['SOFTWARE', 'SUBSCRIPTION', 'COMMUNICATION', 'ZOOM'],
    'SLACK': ['SOFTWARE', 'SUBSCRIPTION', 'COMMUNICATION'],
    'DROPBOX': ['SOFTWARE', 'SUBSCRIPTION', 'STORAGE', 'CLOUD'],
    'AWS': ['SOFTWARE', 'CLOUD', 'HOSTING', 'SERVER'],
    'HOSTING': ['SOFTWARE', 'CLOUD', 'HOSTING', 'SERVER', 'WEB'],
    'DOMAIN': ['SOFTWARE', 'WEB', 'HOSTING', 'DOMAIN'],
    'GODADDY': ['SOFTWARE', 'WEB', 'HOSTING', 'DOMAIN'],
    'SQUARESPACE': ['SOFTWARE', 'WEB', 'HOSTING', 'SUBSCRIPTION'],
    'MAILCHIMP': ['SOFTWARE', 'MARKETING', 'EMAIL', 'SUBSCRIPTION'],
    'CANVA': ['SOFTWARE', 'DESIGN', 'CREATIVE', 'SUBSCRIPTION'],
    'CONSULTANT': ['CONSULTING', 'PROFESSIONAL', 'SERVICE', 'CONTRACTOR'],
    'ATTORNEY': ['LEGAL', 'PROFESSIONAL', 'SERVICE', 'ATTORNEY', 'LAWYER'],
    'LAWYER': ['LEGAL', 'PROFESSIONAL', 'SERVICE', 'ATTORNEY', 'LAWYER'],
    'ACCOUNTANT': ['ACCOUNTING', 'PROFESSIONAL', 'SERVICE', 'CPA'],
    'CPA': ['ACCOUNTING', 'PROFESSIONAL', 'SERVICE', 'CPA'],
    'CONTRACTOR': ['CONTRACTOR', 'LABOR', 'SERVICE', 'SUBCONTRACT'],
    'INVOICE': ['REVENUE', 'INCOME', 'SERVICE', 'SALES'],
    'CLIENT': ['REVENUE', 'INCOME', 'SERVICE', 'SALES']
  };
  
  var upper = description.toUpperCase();
  var words = upper.replace(/[^A-Z0-9\s]/g, ' ').split(/\s+/);
  
  // Find keywords in description and search user categories
  for (var i = 0; i < words.length; i++) {
    var word = words[i];
    if (word.length < 3) continue;
    
    var searchTerms = KEYWORD_TO_SEARCH[word];
    if (!searchTerms) continue;
    
    // Search user's categories for these terms
    if (userCategories && userCategories.length > 0) {
      for (var c = 0; c < userCategories.length; c++) {
        var cat = String(userCategories[c] || '').toUpperCase();
        for (var s = 0; s < searchTerms.length; s++) {
          if (cat.indexOf(searchTerms[s]) !== -1) {
            return {
              category: userCategories[c],
              confidence: 0.75,
              source: 'training',
              tier: 3,
              isBusiness: isBusiness,
              catType: isBusiness ? 'business' : 'personal'
            };
          }
        }
      }
    }
  }
  
  return null;
}

/**
 * Match description words directly to category names
 * Fallback when training data doesn't match
 * @param {string} description - Transaction description
 * @param {Array} userCategories - Array of category names to match against
 * @param {boolean} isBusiness - Whether these are business categories (default: false)
 */
function matchDescriptionToCategories(description, userCategories, isBusiness) {
  if (!description || !userCategories || userCategories.length === 0) return null;
  isBusiness = isBusiness || false;
  
  var upper = description.toUpperCase();
  var words = upper.replace(/[^A-Z0-9\s]/g, ' ').split(/\s+/).filter(function(w) {
    return w.length >= 3;
  });
  
  // Check each word against each category
  for (var c = 0; c < userCategories.length; c++) {
    var cat = String(userCategories[c] || '');
    var catUpper = cat.toUpperCase();
    
    for (var w = 0; w < words.length; w++) {
      var word = words[w];
      // If any significant word from description appears in category name
      if (catUpper.indexOf(word) !== -1 && word.length >= 4) {
        return {
          category: cat,
          confidence: 0.60,
          source: 'word_match',
          tier: 3,
          isBusiness: isBusiness,
          catType: isBusiness ? 'business' : 'personal'
        };
      }
    }
  }
  
  return null;
}

function getMLSuggestionForTransaction(description, type) {
  try {
    var normalized = normalizeDescription(description);
    var merchantNorm = normalizeMerchant(description);
    if (!normalized && !merchantNorm) return null;
    
    // Get ML data from cache
    var mlData = getMLDataForCache();
    var rules = mlData.rules || [];
    
    // Also check Script Properties as backup
    var propsRules = getMLRulesFromProps(type);
    
    var bestSuggestion = null;
    
    // STEP 1: Exact normalized match in BACKEND rules
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (rule.type !== type) continue;
      
      var ruleDesc = String(rule.description || '').toUpperCase().trim();
      var count = rule.count || 1;
      
      // Exact match
      if (ruleDesc === normalized) {
        var conf = count >= 3 ? 0.95 : (count >= 2 ? 0.85 : 0.60);
        if (!bestSuggestion || conf > bestSuggestion.confidence) {
          bestSuggestion = {
            category: rule.category,
            confidence: conf,
            source: 'exact_match',
            isBusiness: rule.catType === 'business',
            count: count
          };
        }
      }
      
      // Merchant normalized match
      if (merchantNorm && ruleDesc.indexOf(merchantNorm) !== -1) {
        var mConf = count >= 2 ? 0.80 : 0.55;
        if (!bestSuggestion || mConf > bestSuggestion.confidence) {
          bestSuggestion = {
            category: rule.category,
            confidence: mConf,
            source: 'merchant_match',
            isBusiness: rule.catType === 'business',
            count: count
          };
        }
      }
    }
    
    // STEP 2: Check Script Properties rules
    if (propsRules[normalized] && propsRules[normalized].count >= 2) {
      var pRule = propsRules[normalized];
      var pConf = pRule.count >= 3 ? 0.95 : 0.85;
      if (!bestSuggestion || pConf > bestSuggestion.confidence) {
        bestSuggestion = {
          category: pRule.category,
          confidence: pConf,
          source: 'props_exact',
          isBusiness: false,
          count: pRule.count
        };
      }
    }
    
    // STEP 3: Keyword overlap matching (if no strong match yet)
    if (!bestSuggestion || bestSuggestion.confidence < 0.75) {
      var keywords = extractKeywords(normalized);
      if (keywords.length >= 2) {
        for (var j = 0; j < rules.length; j++) {
          var rule = rules[j];
          if (rule.type !== type || rule.count < 2) continue;
          
          var ruleKeywords = extractKeywords(String(rule.description || ''));
          var overlap = countKeywordOverlap(keywords, ruleKeywords);
          
          if (overlap >= 3) {
            var kwConf = 0.75;
            if (!bestSuggestion || kwConf > bestSuggestion.confidence) {
              bestSuggestion = {
                category: rule.category,
                confidence: kwConf,
                source: 'keyword_strong',
                isBusiness: rule.catType === 'business',
                count: rule.count
              };
            }
          } else if (overlap >= 2) {
            var kwConf2 = 0.65;
            if (!bestSuggestion || kwConf2 > bestSuggestion.confidence) {
              bestSuggestion = {
                category: rule.category,
                confidence: kwConf2,
                source: 'keyword_moderate',
                isBusiness: rule.catType === 'business',
                count: rule.count
              };
            }
          }
        }
      }
    }
    
    // Only return suggestions with reasonable confidence
    if (bestSuggestion && bestSuggestion.confidence >= 0.50) {
      return bestSuggestion;
    }
    
    return null;
    
  } catch (e) {
    Logger.log('[WARN] getMLSuggestionForTransaction error: ' + e.message);
    return null;
  }
}

/**
 * Get ML rules from Script Properties (legacy storage)
 */
function getMLRulesFromProps(type) {
  try {
    var props = PropertiesService.getScriptProperties();
    var key = 'mm_cat_ml_' + type;
    var rulesJson = props.getProperty(key) || '{}';
    return JSON.parse(rulesJson);
  } catch (e) {
    return {};
  }
}

/**
 * Normalize description for ML matching
 * Strips special characters, normalizes whitespace
 */
function normalizeDescription(desc) {
  var s = String(desc || '').trim().toUpperCase();
  if (!s) return '';
  
  // Remove special chars, keep alphanumeric and spaces
  s = s.replace(/[^A-Z0-9\s]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  
  // Limit length
  return s.slice(0, 80);
}

/**
 * Normalize merchant name using known patterns
 * "AMZN MKTP US*123ABC" → "AMAZON MARKETPLACE"
 * "SQ *COFFEE SHOP" → "SQUARE COFFEE SHOP"
 */
function normalizeMerchant(desc) {
  var s = String(desc || '').trim().toUpperCase();
  if (!s) return '';
  
  // Check against known merchant patterns
  var patterns = {
    'SQ \\*': 'SQUARE',
    'SQC\\*': 'SQUARE CASH',
    'PAYPAL \\*': 'PAYPAL',
    'AMZN': 'AMAZON',
    'AMAZON\\.COM': 'AMAZON',
    'AMZN MKTP': 'AMAZON MARKETPLACE',
    'WAL-MART': 'WALMART',
    'WM SUPERCENTER': 'WALMART',
    'TARGET 0': 'TARGET',
    'COSTCO WHSE': 'COSTCO',
    'DOORDASH': 'DOORDASH',
    'UBER EATS': 'UBER EATS',
    'GRUBHUB': 'GRUBHUB',
    'MCDONALD': 'MCDONALDS',
    'STARBUCKS': 'STARBUCKS',
    'DUNKIN': 'DUNKIN',
    'CHIPOTLE': 'CHIPOTLE',
    'NETFLIX': 'NETFLIX',
    'SPOTIFY': 'SPOTIFY',
    'APPLE\\.COM': 'APPLE',
    'GOOGLE \\*': 'GOOGLE',
    'MICROSOFT': 'MICROSOFT',
    'HULU': 'HULU',
    'DISNEY PLUS': 'DISNEY PLUS',
    'PRIME VIDEO': 'AMAZON PRIME',
    'AT&T': 'ATT',
    'VERIZON': 'VERIZON',
    'T-MOBILE': 'TMOBILE',
    'COMCAST': 'COMCAST',
    'XFINITY': 'COMCAST',
    'SHELL': 'SHELL',
    'EXXON': 'EXXON',
    'CHEVRON': 'CHEVRON',
    'BP ': 'BP',
    'SPEEDWAY': 'SPEEDWAY',
    'WAWA': 'WAWA',
    'UBER \\*': 'UBER',
    'LYFT \\*': 'LYFT',
    'VENMO': 'VENMO',
    'ZELLE': 'ZELLE',
    'CASH APP': 'CASH APP'
  };
  
  for (var pattern in patterns) {
    try {
      var regex = new RegExp(pattern, 'i');
      if (regex.test(s)) {
        return patterns[pattern];
      }
    } catch (e) {
      // Skip invalid regex
    }
  }
  
  // No pattern match - extract first meaningful word(s)
  var clean = s.replace(/[^A-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  var words = clean.split(' ').filter(function(w) { return w.length > 2; });
  
  if (words.length > 0) {
    // Return first 2 words as merchant identifier
    return words.slice(0, 2).join(' ');
  }
  
  return '';
}

/**
 * Extract meaningful keywords from a description
 * Filters out short words, numbers, common words
 */
function extractKeywords(desc) {
  var s = String(desc || '').toUpperCase();
  var words = s.replace(/[^A-Z0-9\s]/g, ' ').split(/\s+/);
  
  // Common words to ignore
  var stopWords = ['THE', 'AND', 'FOR', 'WITH', 'FROM', 'INC', 'LLC', 'CORP', 'CO', 'USA', 'US'];
  
  return words.filter(function(w) {
    return w.length >= 3 && 
           stopWords.indexOf(w) === -1 && 
           !/^\d+$/.test(w); // Not purely numeric
  });
}

/**
 * Count overlapping keywords between two arrays
 */
function countKeywordOverlap(keywords1, keywords2) {
  var count = 0;
  for (var i = 0; i < keywords1.length; i++) {
    if (keywords2.indexOf(keywords1[i]) !== -1) {
      count++;
    }
  }
  return count;
}

/**
 * Bootstrap ML from existing categorized transactions
 * Scans all ACCOUNT sheets and learns from already-categorized rows
 */
function bootstrapMLFromExistingTransactions() {
  try {
    Logger.log('🚀 bootstrapMLFromExistingTransactions START');
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return { success: false, error: 'No active spreadsheet' };
    }
    
    var sheets = ss.getSheets();
    var learned = 0;
    var skipped = 0;
    
    for (var i = 0; i < sheets.length; i++) {
      var sheet = sheets[i];
      var name = sheet.getName();
      
      // Only process ACCOUNT sheets
      if (name.indexOf('ACCOUNT') !== 0) continue;
      
      Logger.log('Scanning sheet: ' + name);
      
      var lastRow = sheet.getLastRow();
      if (lastRow < 11) continue; // No data
      
      // Read columns C (Date), D (Description), E (Amount), F (Personal), G (Business)
      var dataRange = sheet.getRange(11, 3, lastRow - 10, 5); // C11:G
      var data = dataRange.getValues();
      
      for (var r = 0; r < data.length; r++) {
        var date = data[r][0];
        var desc = data[r][1];
        var amount = data[r][2];
        var personal = data[r][3];
        var business = data[r][4];
        
        // Skip empty rows
        if (!desc || (!personal && !business)) {
          skipped++;
          continue;
        }
        
        // Skip special labels (not real categories)
        var specialLabels = ['Transaction Split', 'Ignored', 'Transfer', 'CC Payment', 'Debt Payment', 'Refund', 'Return', 'Reimbursement'];
        if (specialLabels.indexOf(personal) !== -1 || specialLabels.indexOf(business) !== -1) {
          skipped++;
          continue;
        }
        
        var isIncome = parseFloat(amount) > 0;
        var type = isIncome ? 'income' : 'expense';
        
        // Learn from this categorization
        if (business && business.toString().trim()) {
          cacheMLLearning(desc, business, type, 'business');
          learned++;
        } else if (personal && personal.toString().trim()) {
          cacheMLLearning(desc, personal, type, 'personal');
          learned++;
        }
      }
    }
    
    Logger.log('✅ bootstrapMLFromExistingTransactions COMPLETE: Learned ' + learned + ', Skipped ' + skipped);
    
    return {
      success: true,
      learned: learned,
      skipped: skipped,
      message: 'Learned from ' + learned + ' transactions'
    };
    
  } catch (e) {
    Logger.log('[ERROR] bootstrapMLFromExistingTransactions: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Menu function: Bootstrap ML
 */
function menuBootstrapML() {
  var result = bootstrapMLFromExistingTransactions();
  var ui = SpreadsheetApp.getUi();
  
  if (result.success) {
    ui.alert('ML Bootstrap Complete', 
      'Learned from ' + result.learned + ' categorized transactions.\n' +
      'Skipped ' + result.skipped + ' rows (empty or special labels).',
      ui.ButtonSet.OK);
  } else {
    ui.alert('ML Bootstrap Failed', result.error, ui.ButtonSet.OK);
  }
}

/**
 * Menu function: Show ML Stats
 */
function menuShowMLStats() {
  try {
    var mlData = getMLDataForCache();
    var rules = mlData.rules || [];
    
    // Count by type
    var incomeRules = rules.filter(function(r) { return r.type === 'income'; }).length;
    var expenseRules = rules.filter(function(r) { return r.type === 'expense'; }).length;
    var businessRules = rules.filter(function(r) { return r.catType === 'business'; }).length;
    
    // Get top categories
    var catCounts = {};
    for (var i = 0; i < rules.length; i++) {
      var cat = rules[i].category;
      catCounts[cat] = (catCounts[cat] || 0) + rules[i].count;
    }
    
    var topCats = Object.keys(catCounts).sort(function(a, b) {
      return catCounts[b] - catCounts[a];
    }).slice(0, 5);
    
    var topCatsStr = topCats.map(function(c) {
      return c + ' (' + catCounts[c] + ')';
    }).join('\n');
    
    var ui = SpreadsheetApp.getUi();
    ui.alert('ML Statistics',
      'Total Rules: ' + rules.length + '\n' +
      'Income Rules: ' + incomeRules + '\n' +
      'Expense Rules: ' + expenseRules + '\n' +
      'Business Rules: ' + businessRules + '\n\n' +
      'Top Categories:\n' + topCatsStr,
      ui.ButtonSet.OK);
      
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// ═══════════════════════════════════════════════════════════════════
// RECEIPT UPLOAD
// ═══════════════════════════════════════════════════════════════════

/**
 * Upload receipt to Google Drive and IMMEDIATELY save URL to sheet
 * @param {string} base64Data - Base64 encoded file data
 * @param {string} fileName - Name of the file
 * @param {string} mimeType - MIME type of the file
 * @param {number} transactionRow - Row number of the transaction
 * @param {string} accountName - Name of the account sheet (e.g., "ACCOUNT 1")
 */
function uploadReceiptToDrive(base64Data, fileName, mimeType, transactionRow, accountName) {
  try {
    Logger.log('📤 uploadReceiptToDrive: Starting upload for row ' + transactionRow + ' in ' + accountName);
    
    // Create or get Receipts folder
    var folderName = 'Money Mastery Receipts';
    var folders = DriveApp.getFoldersByName(folderName);
    var folder;
    
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }
    
    // Decode base64 and create file
    var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);
    var file = folder.createFile(blob);
    
    // Set file sharing to anyone with link can view
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var url = file.getUrl();
    
    Logger.log('✅ uploadReceiptToDrive: Uploaded ' + fileName + ' -> ' + url);
    
    // IMMEDIATELY save the receipt URL to the sheet (Column K = 11)
    if (accountName && transactionRow >= 11) {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(accountName);
      
      if (sheet) {
        sheet.getRange(transactionRow, 11).setValue(url); // Column K
        Logger.log('💾 Receipt URL saved to ' + accountName + ' row ' + transactionRow + ' Column K');
      } else {
        Logger.log('⚠️ Could not find sheet: ' + accountName);
      }
    }
    
    return {
      success: true,
      driveUrl: url,
      fileId: file.getId()
    };
    
  } catch (e) {
    Logger.log('[ERROR] uploadReceiptToDrive: ' + e.message);
    return {
      success: false,
      error: e.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// SHOW CATEGORIZATION MODAL
// ═══════════════════════════════════════════════════════════════════

/**
 * Show categorization modal - detects active Account sheet
 * Shows a fast loading screen first to prevent double-clicks
 */
function showCategorizationModal() {
  try {
    // Detect which Account sheet user is currently viewing
    var activeSheet = SpreadsheetApp.getActiveSheet();
    var sheetName = activeSheet.getName();
    
    // Validate it's an Account sheet
    if (!/^ACCOUNT\s*\d+$/i.test(sheetName)) {
      SpreadsheetApp.getUi().alert(
        'Invalid Sheet',
        'Please select an Account sheet first (e.g., ACCOUNT 1, ACCOUNT 2).\n\n' +
        'The Categorization modal only works on Account sheets.',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return;
    }
    
    Logger.log('✅ Opening categorization modal for: ' + sheetName);
    
    // Trigger two-way sync with linked sheets on modal open
    try {
      if (typeof onCategorizationModalOpen === 'function') {
        onCategorizationModalOpen();
      }
    } catch (syncError) {
      Logger.log('Note: Could not trigger sync on modal open: ' + syncError.message);
    }
    
    // Refresh Yearly Overview breakdown formulas
    try {
      if (typeof refreshYearlyOverviewBreakdown === 'function') {
        refreshYearlyOverviewBreakdown();
      }
    } catch (refreshError) {
      Logger.log('Note: Could not refresh yearly overview: ' + refreshError.message);
    }
    
    // Create template and pass sheet name
    var template = HtmlService.createTemplateFromFile('CategorizationModal');
    template.initialAccountName = sheetName;
    
    var html = template.evaluate()
      .setWidth(1200)
      .setHeight(800);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'Categorize Transactions');
    
  } catch (e) {
    Logger.log('[ERROR] showCategorizationModal: ' + e.message);
    SpreadsheetApp.getUi().alert('Error opening categorization modal: ' + e.message);
  }
}

/**
 * Shows a fast, minimal loading screen to prevent double-clicks
 * This displays immediately while the real modal loads
 * Kept simple and small for instant rendering
 */
function _showFastLoadingScreen_(title, subtitle) {
  // Ultra-minimal HTML for instant load - no external fonts, inline everything
  var loadingHtml = `<!DOCTYPE html><html><head><base target="_top">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f8f6f3;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#6d5f4c}
.s{width:36px;height:36px;border:3px solid #e8e2d9;border-top-color:#ab9478;border-radius:50%;animation:r .7s linear infinite;margin-bottom:12px}
@keyframes r{to{transform:rotate(360deg)}}
.t{font-size:13px;font-weight:600;margin-bottom:4px}
.u{font-size:11px;color:#8a7760}
</style></head><body>
<div class="s"></div>
<div class="t">\${title || 'Loading...'}</div>
<div class="u">\${subtitle || ''}</div>
</body></html>`;
  
  var html = HtmlService.createHtmlOutput(loadingHtml)
    .setWidth(200)
    .setHeight(140);
  
  SpreadsheetApp.getUi().showModelessDialog(html, ' ');
}

/**
 * Show categorization modal for a specific account
 * Called from Dashboard when clicking an account
 * @param {string} accountName - The account name (e.g., "ACCOUNT 1" or custom name from C7)
 */
function showAccountCategorizationModal(accountName) {
  try {
    Logger.log('✅ showAccountCategorizationModal called for: ' + accountName);
    
    // Find the actual sheet name - account might be displayed by custom name from C7
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    var sheetName = null;
    
    for (var i = 0; i < sheets.length; i++) {
      var sheet = sheets[i];
      var name = sheet.getName();
      
      // Direct match with sheet name
      if (name === accountName || name.toUpperCase() === accountName.toUpperCase()) {
        sheetName = name;
        break;
      }
      
      // Check if it's an Account sheet and compare custom name from C7
      if (/^ACCOUNT\s*\d+$/i.test(name)) {
        var customName = sheet.getRange('C7').getValue();
        if (customName && String(customName).trim() === accountName) {
          sheetName = name;
          break;
        }
      }
    }
    
    if (!sheetName) {
      SpreadsheetApp.getUi().alert(
        'Account Not Found',
        'Could not find account: ' + accountName + '\n\nPlease try refreshing the dashboard.',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return;
    }
    
    // Create template and pass sheet name
    var template = HtmlService.createTemplateFromFile('CategorizationModal');
    template.initialAccountName = sheetName;
    
    var html = template.evaluate()
      .setWidth(1200)
      .setHeight(800);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'Categorize Transactions');
    
  } catch (e) {
    Logger.log('[ERROR] showAccountCategorizationModal: ' + e.message);
    SpreadsheetApp.getUi().alert('Error opening categorization modal: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// BACKWARD COMPATIBILITY - Keep old function names working
// ═══════════════════════════════════════════════════════════════════

/**
 * Original getCategorizationModalData - redirect to V2
 */
function getCategorizationModalData() {
  var data = getCategorizationModalDataV2();
  
  // Combine income and expense for backward compatibility
  var personalCategories = [];
  var seen = {};
  
  (data.incomeCategories || []).concat(data.expenseCategories || []).forEach(function(cat) {
    if (!seen[cat]) {
      personalCategories.push(cat);
      seen[cat] = true;
    }
  });
  
  return {
    accounts: data.accounts,
    personalCategories: personalCategories.sort(),
    businessCategories: data.businessCategories
  };
}

/**
 * Original getAccountTransactions - redirect to V2
 */
function getAccountTransactions(accountName) {
  var data = getAccountTransactionsV2(accountName);
  
  // Map to old format
  var transactions = data.transactions.map(function(tx) {
    return {
      row: tx.row,
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      personalCategory: tx.category,
      businessCategory: tx.businessCategory,
      memo: tx.memo,
      hasSuggestion: !!data.mlSuggestions[tx.row]
    };
  });
  
  return {
    transactions: transactions,
    mlSuggestions: data.mlSuggestions
  };
}

/**
 * Original saveCategorizationChanges - redirect to V2
 */
function saveCategorizationChanges(accountName, changes) {
  // Map old format to new format
  var v2Changes = changes.map(function(change) {
    return {
      row: change.row,
      category: change.personalCategory || change.businessCategory || '',
      needDesire: '',
      memo: ''
    };
  });
  
  return saveCategorizationChangesV2(accountName, v2Changes);
}

// ═══════════════════════════════════════════════════════════════════
// CATEGORY HELPER FUNCTIONS (for other modules)
// ═══════════════════════════════════════════════════════════════════

/**
 * Get personal expense categories (for Categories.gs compatibility)
 */
function getPersonalExpenseCategories() {
  return getExpenseCategoriesFromSheet();
}

/**
 * Get personal income categories (for Categories.gs compatibility)
 */
function getPersonalIncomeCategories() {
  return getIncomeCategoriesFromSheet();
}

/**
 * Get business categories (for Categories.gs compatibility)
 */
function getBusinessCategories() {
  return getBusinessCategoriesFromSheet();
}

// ═══════════════════════════════════════════════════════════════════
// CLARITY MISTAKE DETECTION
// Scans categorized transactions for potential labeling errors
// ═══════════════════════════════════════════════════════════════════

/**
 * Detect potential mistakes in categorized transactions
 * Returns: { rowNum: { type, message, suggestion, confidence } }
 */
function detectPotentialMistakes(transactions, learnedRules, incomeCategories, expenseCategories) {
  var mistakes = {};
  
  try {
    for (var i = 0; i < transactions.length; i++) {
      var tx = transactions[i];
      
      // Skip uncategorized
      if (!tx.category && !tx.businessCategory) continue;
      
      var currentCategory = tx.category || tx.businessCategory;
      var normalized = normalizeDescription(tx.description);
      var isIncome = tx.amount > 0;
      
      // CHECK 1: Category doesn't match learned pattern
      if (learnedRules && learnedRules[normalized]) {
        var learned = learnedRules[normalized];
        if (learned.category !== currentCategory && learned.count >= 3) {
          // Strong learned pattern suggests different category
          mistakes[tx.row] = {
            type: 'pattern_mismatch',
            message: 'Usually categorized as "' + learned.category + '" (' + learned.count + ' times)',
            suggestion: learned.category,
            confidence: Math.min(0.95, 0.7 + (learned.count * 0.05)),
            currentCategory: currentCategory
          };
          continue;
        }
      }
      
      // CHECK 2: Income categorized as expense category or vice versa
      if (isIncome && expenseCategories && expenseCategories.indexOf(currentCategory) !== -1) {
        // Income transaction has expense category
        mistakes[tx.row] = {
          type: 'income_expense_mismatch',
          message: 'Income transaction labeled with expense category',
          suggestion: null,
          confidence: 0.85,
          currentCategory: currentCategory
        };
        continue;
      }
      
      if (!isIncome && incomeCategories && incomeCategories.indexOf(currentCategory) !== -1) {
        // Expense transaction has income category
        mistakes[tx.row] = {
          type: 'expense_income_mismatch',
          message: 'Expense transaction labeled with income category',
          suggestion: null,
          confidence: 0.85,
          currentCategory: currentCategory
        };
        continue;
      }
      
      // CHECK 3: Need/Desire inconsistency for same category
      // (This would require building a pattern of category -> need/desire mapping)
      
      // CHECK 4: Duplicate description with different categories
      // (Handled by pattern_mismatch above)
      
      // CHECK 5: Amount outlier for category
      // For example: $500 gas bill when average is $50
      // (Would require historical data - future enhancement)
    }
    
  } catch (e) {
    Logger.log('[WARN] detectPotentialMistakes error: ' + e.message);
  }
  
  return mistakes;
}

/**
 * Get Clarity status - whether she's enabled for this user
 */
function getClarityStatus() {
  try {
    var userProps = PropertiesService.getUserProperties();
    var status = userProps.getProperty('clarity_enabled');
    return status !== 'false'; // Default to enabled
  } catch (e) {
    return true; // Default enabled on error
  }
}

/**
 * Toggle Clarity on/off
 */
function setClarityEnabled(enabled) {
  try {
    var userProps = PropertiesService.getUserProperties();
    userProps.setProperty('clarity_enabled', enabled ? 'true' : 'false');
    return { success: true, enabled: enabled };
  } catch (e) {
    Logger.log('[WARN] setClarityEnabled error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// END OF CATEGORIZATION SYSTEM V2
// ═══════════════════════════════════════════════════════════════════
