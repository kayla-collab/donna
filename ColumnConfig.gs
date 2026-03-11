/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * COLUMN_CONFIG.GS - Single Source of Truth for All Column Definitions
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * IMPORTANT: This file is the ONLY place column definitions should exist.
 * All other files (Categories.gs, Code.gs, Learning.gs, etc.) should 
 * reference these constants instead of defining their own.
 * 
 * VERIFIED FROM 2026 Launch Version 1.0.xlsx - ACTUAL STRUCTURE:
 * 
 * COLUMN LAYOUT FOR ACCOUNT SHEETS (ACCOUNT 1-10):
 * ═══════════════════════════════════════════════════════════════════
 * Column A (1): Reserved
 * Column B (2): Reserved  
 * Column C (3): DATE - Transaction date
 * Column D (4): DESCRIPTION - Transaction description
 * Column E (5): AMOUNT - Transaction amount (+income, -expense)
 * Column F (6): PERSONAL_CATEGORIES - Personal category
 * Column G (7): BUSINESS_CATEGORIES - Business category
 * Column H (8): MEMO - User notes
 * Column I (9): DESIRE_OR_NEED - "Need" or "Desire"
 * Column J (10): MAIN_CATEGORY - Main category tag
 * Column K (11): RECEIPT - Google Drive URL for receipt
 * Column L (12): NEEDS_CORRECTION - Error/correction flag
 * 
 * HEADER ROW: 10
 * DATA STARTS: Row 11
 * ACCOUNT NAME: Cell C7
 * 
 * INCOME/EXPENSE TRANSACTIONS SHEETS (Formula aggregation sheets):
 * ═══════════════════════════════════════════════════════════════════
 * Row 13: Headers
 * Row 15+: Data (pulled via formulas from ACCOUNT sheets)
 * Column C (3): Account Name
 * Column D (4): Date
 * Column E (5): Description
 * Column F (6): Amount
 * Column G (7): Assigned SubCategory
 * Column H (8): Business Category
 * Column I (9): Memo
 * Column J (10): Desire or Need
 * Column K (11): Main Category
 * ═══════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════
// MASTER COLUMN CONFIGURATION - ACCOUNT SHEETS
// ═══════════════════════════════════════════════════════════════════

/**
 * Column definitions for ACCOUNT sheets (ACCOUNT 1-10)
 * VERIFIED FROM 2026 Launch Version 1.0.xlsx
 * This is the authoritative source - all other files should use this
 */
var MM_COLS = {
  // Core transaction data
  DATE: 3,                  // C - Transaction date
  DESCRIPTION: 4,           // D - Transaction description
  AMOUNT: 5,                // E - Amount (+income, -expense)
  
  // Categorization
  PERSONAL_CATEGORIES: 6,   // F - Personal Categories
  BUSINESS_CATEGORIES: 7,   // G - Business Categories
  
  // Metadata
  MEMO: 8,                  // H - User memo/notes
  DESIRE_OR_NEED: 9,        // I - "Desire or Need?" 
  MAIN_CATEGORY: 10,        // J - Main Category tag
  RECEIPT: 11,              // K - Receipt link (Google Drive URL)
  NEEDS_CORRECTION: 12,     // L - Needs correction flag
  AI_SUGGESTION: 13,         // M - AI() formula suggestion column
  
  // Backward compatibility aliases
  CATEGORY: 6,              // Alias for PERSONAL_CATEGORIES
  SPECIAL_LABEL: 7,         // Alias for BUSINESS_CATEGORIES (also used for Ignore/Transfer/CC Payment)
  NEED_DESIRE: 9,           // Alias for DESIRE_OR_NEED
  SPLIT_DATA: 10,           // Alias for MAIN_CATEGORY (splits stored here)
  CORRECTION: 12            // Alias for NEEDS_CORRECTION
};

/**
 * Row configuration for ACCOUNT sheets
 */
var MM_ROWS = {
  HEADER: 10,        // Header row
  DATA_START: 11     // First data row
};

/**
 * Special labels that exclude transactions from totals
 * These labels mark transactions that should not be counted in income/expense totals
 */
var MM_SPECIAL_LABELS = [
  'Credit Card Payment Received',
  'Debt Payment Sent to Credit Card',
  'Transfer Deposit Personal to Personal',
  'Transfer Withdrawal Personal to Personal',
  'Ignored',
  'Transaction Split',
  'Refund',
  'Return',
  'Reimbursement'
];

/**
 * Check if a value is a special label (excludes from totals)
 */
function isSpecialLabel(value) {
  if (!value) return false;
  var v = String(value).trim().toLowerCase();
  // Check exact match or pattern match
  for (var i = 0; i < MM_SPECIAL_LABELS.length; i++) {
    if (MM_SPECIAL_LABELS[i].toLowerCase() === v) return true;
  }
  // Also check for partial matches (e.g., "Ignored" matches "Ignored Transaction")
  if (v.indexOf('ignore') !== -1) return true;
  if (v.indexOf('transfer') !== -1) return true;
  if (v.indexOf('refund') !== -1) return true;
  if (v.indexOf('return') !== -1) return true;
  if (v.indexOf('reimbursement') !== -1) return true;
  if (v.indexOf('split') !== -1) return true;
  return false;
}

// ═══════════════════════════════════════════════════════════════════
// SHEET NAME CONSTANTS
// ═══════════════════════════════════════════════════════════════════

var MM_SHEETS = {
  // Category source sheets
  EXPENSE_LABELS: 'EXPENSE LABELS',
  INCOME_LABELS: 'INCOME LABELS',
  BACKEND: 'BACKEND',
  
  // Dashboard/Overview sheets (Dashboard is a modal, not a sheet)
  INCOME_TRANSACTIONS: 'INCOME TRANSACTIONS',
  EXPENSE_TRANSACTIONS: 'EXPENSE TRANSACTIONS',
  YEARLY_OVERVIEW: 'YEARLY OVERVIEW',
  MONTHLY_OVERVIEW: 'MONTHLY OVERVIEW',
  PROFIT_LOSS: 'PROFIT & LOSS',
  
  // Configuration
  LINKS: 'LINKS'
};

// ═══════════════════════════════════════════════════════════════════
// CATEGORY SOURCE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Where to read categories from in each sheet
 * CORRECTED LAYOUT (verified from 2026 Launch Version 1.0 screenshots):
 * 
 * EXPENSE LABELS:
 *   - Header row: Row 25
 *   - Data starts: Row 27
 *   - Main Category: Column C
 *   - Subcategories: Columns D-M (Sublabel 1 through Sublabel 10)
 * 
 * INCOME LABELS:
 *   - Header row: Row 12
 *   - Data starts: Row 14
 *   - Main Category: Column G
 *   - Subcategories: Columns J-N (Label 1 through Label 5)
 */
var MM_CATEGORY_SOURCES = {
  // Personal Expense Categories: EXPENSE LABELS sheet
  // VERIFIED from 2026_PERSONAL_MONEY_MASTERY_SYSTEM.xlsx:
  // - Row 40 = header ("Main Category", "Sublabel 1-9")
  // - Row 44+ = data rows
  // - Column C = formula (main category pulled from F15+)
  // - Columns E-M (5-13) = user-editable sublabels (9 columns)
  EXPENSE: {
    sheet: 'EXPENSE LABELS',
    headerRow: 40,
    startRow: 44,
    mainCategoryColumn: 3,  // C (formula column - reads main category)
    subcategoryColumns: [5, 6, 7, 8, 9, 10, 11, 12, 13],  // E through M (9 columns)
    maxRow: 65
  },
  
  // Personal Income Categories: INCOME LABELS sheet
  // VERIFIED from 2026_PERSONAL_MONEY_MASTERY_SYSTEM.xlsx:
  // - E10 = category count (validated: 1-5)
  // - Row 10 = header
  // - E14-E18 = main category names (user-editable)
  // - J14-N18 = sublabels (columns 10-14, 5 columns)
  INCOME: {
    sheet: 'INCOME LABELS',
    headerRow: 10,
    startRow: 14,
    mainCategoryColumn: 5,  // E (user-editable main category names)
    subcategoryColumns: [10, 11, 12, 13, 14],  // J through N (5 columns)
    maxRow: 20
  },
  
  // Business Categories: BACKEND sheet, Column AC, starting row 3
  BUSINESS: {
    sheet: 'BACKEND',
    column: 29,     // AC
    startRow: 3,
    maxRow: 502
  },
  
  // Alternative BACKEND locations (for CategoryLoader.gs compatibility)
  BACKEND_EXPENSE: {
    sheet: 'BACKEND',
    range: 'G58:G465'
  },
  BACKEND_INCOME: {
    sheet: 'BACKEND',
    range: 'C58:C90'
  },
  BACKEND_BUSINESS: {
    sheet: 'BACKEND',
    range: 'K58:K465'
  }
};

// ═══════════════════════════════════════════════════════════════════
// INCOME/EXPENSE TRANSACTIONS SHEET COLUMNS
// ═══════════════════════════════════════════════════════════════════

/**
 * Column definitions for INCOME/EXPENSE TRANSACTIONS sheets
 * VERIFIED FROM 2026 Launch Version 1.0.xlsx
 * Row 13 = Headers, Row 15+ = Data (pulled via formulas from ACCOUNT sheets)
 */
var MM_TRANSACTION_COLS = {
  ACCOUNT_NAME: 3,      // C - Source account name
  DATE: 4,              // D - Transaction date
  DESCRIPTION: 5,       // E - Description
  AMOUNT: 6,            // F - Amount
  SUB_CATEGORY: 7,      // G - Assigned SubCategory
  BUSINESS_CATEGORY: 8, // H - Business Category
  MEMO: 9,              // I - Memo
  DESIRE_OR_NEED: 10,   // J - Desire or Need
  MAIN_CATEGORY: 11,    // K - Main Category
  
  // Backward compatibility aliases
  CATEGORY: 7,          // Alias for SUB_CATEGORY
  BUSINESS: 8,          // Alias for BUSINESS_CATEGORY
  NEED_DESIRE: 10       // Alias for DESIRE_OR_NEED
};

/**
 * Row definitions for INCOME/EXPENSE TRANSACTIONS sheets
 */
var MM_TRANSACTION_ROWS = {
  HEADER: 13,           // Header row
  DATA_START: 15        // First data row (row 14 may have formulas/totals)
};

// ═══════════════════════════════════════════════════════════════════
// BACKWARD COMPATIBILITY ALIASES
// ═══════════════════════════════════════════════════════════════════

/**
 * Legacy aliases - these map old variable names to new ones
 * Allows existing code to work while we migrate
 */

// Alias for CategorizationSystem.gs CAT_CONFIG
// UPDATED TO MATCH 2026 Launch Version 1.0.xlsx
var CAT_CONFIG = {
  HEADER_ROW: MM_ROWS.HEADER,           // 10
  DATA_START_ROW: MM_ROWS.DATA_START,   // 11
  COLS: {
    DATE: MM_COLS.DATE,                           // C (3)
    DESCRIPTION: MM_COLS.DESCRIPTION,             // D (4)
    AMOUNT: MM_COLS.AMOUNT,                       // E (5)
    CATEGORY: MM_COLS.PERSONAL_CATEGORIES,        // F (6) - Personal Categories
    PERSONAL_CAT: MM_COLS.PERSONAL_CATEGORIES,    // F (6) - Alias
    BUSINESS_CAT: MM_COLS.BUSINESS_CATEGORIES,    // G (7) - Business Categories
    MEMO: MM_COLS.MEMO,                           // H (8)
    NEED_DESIRE: MM_COLS.DESIRE_OR_NEED,          // I (9) - Desire or Need?
    MAIN_CATEGORY: MM_COLS.MAIN_CATEGORY,         // J (10) - Main Category
    RECEIPT: MM_COLS.RECEIPT,                     // K (11)
    CORRECTION: MM_COLS.NEEDS_CORRECTION          // L (12)
  },
  SPECIAL_LABELS: MM_SPECIAL_LABELS,
  SHEETS: {
    EXPENSE_LABELS: MM_SHEETS.EXPENSE_LABELS,
    INCOME_LABELS: MM_SHEETS.INCOME_LABELS,
    BACKEND: MM_SHEETS.BACKEND
  }
};

// Alias for Categories.gs CAT_COLS
// UPDATED TO MATCH 2026 Launch Version 1.0.xlsx
var CAT_COLS = {
  DATE: MM_COLS.DATE,                           // C (3)
  DESCRIPTION: MM_COLS.DESCRIPTION,             // D (4)
  AMOUNT: MM_COLS.AMOUNT,                       // E (5)
  PERSONAL: MM_COLS.PERSONAL_CATEGORIES,        // F (6) - Personal Categories
  BUSINESS: MM_COLS.BUSINESS_CATEGORIES,        // G (7) - Business Categories
  MEMO: MM_COLS.MEMO,                           // H (8)
  NEED_DESIRE: MM_COLS.DESIRE_OR_NEED,          // I (9) - Desire or Need?
  MAIN_CATEGORY: MM_COLS.MAIN_CATEGORY,         // J (10) - Main Category
  RECEIPT: MM_COLS.RECEIPT,                     // K (11)
  CORRECTION: MM_COLS.NEEDS_CORRECTION          // L (12)
};

// Alias for Categories.gs CAT_SHEETS
var CAT_SHEETS = {
  EXPENSE_LABELS: MM_SHEETS.EXPENSE_LABELS,
  INCOME_LABELS: MM_SHEETS.INCOME_LABELS,
  BACKEND: MM_SHEETS.BACKEND
};

// Alias for Categories.gs CAT_HEADER_ROW
var CAT_HEADER_ROW = MM_ROWS.HEADER;

// Alias for Config.gs MMNAV_COLS (for backward compatibility)
// NOTE: MMNAV_COLS should be updated in Config.gs to use MM_COLS
var MMNAV_COLS_NEW = {
  DATE: MM_COLS.DATE,
  DESCRIPTION: MM_COLS.DESCRIPTION,
  AMOUNT: MM_COLS.AMOUNT,
  PERSONAL: MM_COLS.CATEGORY,
  BUSINESS: MM_COLS.SPECIAL_LABEL
};

// Alias for Config.gs INCOME_EXPENSE_COLS
var INCOME_EXPENSE_COLS_NEW = {
  ACCOUNT_NAME: MM_TRANSACTION_COLS.ACCOUNT_NAME,
  DATE: MM_TRANSACTION_COLS.DATE,
  DESCRIPTION: MM_TRANSACTION_COLS.DESCRIPTION,
  AMOUNT: MM_TRANSACTION_COLS.AMOUNT,
  PERSONAL: MM_TRANSACTION_COLS.CATEGORY,
  BUSINESS: MM_TRANSACTION_COLS.BUSINESS,
  MEMO: MM_TRANSACTION_COLS.MEMO,
  NEED_DESIRE: MM_TRANSACTION_COLS.NEED_DESIRE,
  MAIN_CATEGORY: MM_TRANSACTION_COLS.MAIN_CATEGORY
};

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get column letter from column number
 * @param {number} colNum - Column number (1-indexed)
 * @returns {string} Column letter (A, B, C, ... AA, AB, etc.)
 */
function getColumnLetter(colNum) {
  var result = '';
  while (colNum > 0) {
    colNum--;
    result = String.fromCharCode(65 + (colNum % 26)) + result;
    colNum = Math.floor(colNum / 26);
  }
  return result;
}

/**
 * Get column number from column letter
 * @param {string} colLetter - Column letter (A, B, C, ... AA, AB, etc.)
 * @returns {number} Column number (1-indexed)
 */
function getColumnNumber(colLetter) {
  var result = 0;
  for (var i = 0; i < colLetter.length; i++) {
    result = result * 26 + (colLetter.charCodeAt(i) - 64);
  }
  return result;
}

/**
 * Check if a row is a data row (not header or above)
 * @param {number} rowNum - Row number
 * @returns {boolean} True if row is in data area
 */
function isDataRow(rowNum) {
  return rowNum >= MM_ROWS.DATA_START;
}

/**
 * Check if sheet name is an Account sheet.
 * Updated to work with renamed tabs via AccountNameManager.
 * @param {string} sheetName - Sheet name to check
 * @returns {boolean} True if it's an Account sheet
 */
function isAccountSheet(sheetName) {
  // Fast path: still matches default pattern
  if (/^ACCOUNT\s*\d+$/i.test(sheetName)) return true;
  // Slower path: check if it's a renamed account tab
  if (typeof isAccountTab === 'function') {
    try { return isAccountTab(sheetName); } catch(e) {}
  }
  return false;
}

/**
 * Get all Account sheet NAMES (actual tab names) from a spreadsheet.
 * Updated to include renamed tabs via AccountNameManager.
 * @param {Spreadsheet} [ss] - optional spreadsheet
 * @returns {Array<string>} Array of current tab names, sorted by slot
 */
function getAccountSheetNames(ss) {
  if (typeof getAccountTabObjects === 'function') {
    try {
      return getAccountTabObjects(ss).map(function(a) { return a.sheetName; });
    } catch(e) {
      Logger.log('[ColumnConfig] getAccountTabObjects failed, falling back: ' + e.message);
    }
  }
  // Fallback: original regex scan
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var accounts = [];
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    if (/^ACCOUNT\s*\d+$/i.test(name)) accounts.push(name);
  }
  return accounts.sort(function(a, b) {
    var numA = parseInt(a.match(/\d+/)) || 0;
    var numB = parseInt(b.match(/\d+/)) || 0;
    return numA - numB;
  });
}

/**
 * Determine if an amount represents income or expense
 * @param {number} amount - Transaction amount
 * @returns {string} 'income' for positive, 'expense' for negative/zero
 */
function getTransactionType(amount) {
  return parseFloat(amount) > 0 ? 'income' : 'expense';
}

/**
 * Check if a transaction should be excluded from totals
 * @param {string} specialLabel - Value from SPECIAL_LABEL column
 * @returns {boolean} True if transaction should be excluded
 */
function shouldExcludeFromTotals(specialLabel) {
  return isSpecialLabel(specialLabel);
}

// ═══════════════════════════════════════════════════════════════════
// COLUMN REFERENCE DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Get documentation about column layout
 * VERIFIED FROM 2026 Launch Version 1.0.xlsx
 * Useful for debugging and logging
 */
function getColumnDocumentation() {
  return {
    accountSheets: {
      headerRow: MM_ROWS.HEADER,         // 10
      dataStartRow: MM_ROWS.DATA_START,  // 11
      accountNameCell: 'C7',
      columns: {
        'C (3)': 'DATE - Transaction date',
        'D (4)': 'DESCRIPTION - Transaction description',
        'E (5)': 'AMOUNT - Amount (+income, -expense)',
        'F (6)': 'PERSONAL_CATEGORIES - Personal category',
        'G (7)': 'BUSINESS_CATEGORIES - Business category',
        'H (8)': 'MEMO - User notes',
        'I (9)': 'DESIRE_OR_NEED - Desire or Need?',
        'J (10)': 'MAIN_CATEGORY - Main category tag',
        'K (11)': 'RECEIPT - Google Drive URL',
        'L (12)': 'NEEDS_CORRECTION - Error/correction flag'
      }
    },
    transactionSheets: {
      headerRow: MM_TRANSACTION_ROWS.HEADER,        // 13
      dataStartRow: MM_TRANSACTION_ROWS.DATA_START, // 15
      columns: {
        'C (3)': 'ACCOUNT_NAME - Source account',
        'D (4)': 'DATE - Transaction date',
        'E (5)': 'DESCRIPTION - Description',
        'F (6)': 'AMOUNT - Amount',
        'G (7)': 'SUB_CATEGORY - Assigned SubCategory',
        'H (8)': 'BUSINESS_CATEGORY - Business Category',
        'I (9)': 'MEMO - Memo',
        'J (10)': 'DESIRE_OR_NEED - Desire or Need',
        'K (11)': 'MAIN_CATEGORY - Main Category'
      }
    },
    specialLabels: MM_SPECIAL_LABELS,
    categorySources: {
      expense: 'EXPENSE LABELS sheet, Column C, Row 15+',
      income: 'INCOME LABELS sheet, Column E, Row 14+',
      business: 'BACKEND sheet, Column AC, Row 3+'
    }
  };
}

/**
 * Log column configuration (for debugging)
 */
function logColumnConfig() {
  var doc = getColumnDocumentation();
  Logger.log('═══════════════════════════════════════════════════');
  Logger.log('COLUMN CONFIGURATION - ACCOUNT SHEETS');
  Logger.log('═══════════════════════════════════════════════════');
  Logger.log('Header Row: ' + doc.accountSheets.headerRow);
  Logger.log('Data Starts: Row ' + doc.accountSheets.dataStartRow);
  Logger.log('');
  Logger.log('Columns:');
  for (var col in doc.accountSheets.columns) {
    Logger.log('  ' + col + ': ' + doc.accountSheets.columns[col]);
  }
  Logger.log('');
  Logger.log('Special Labels: ' + doc.specialLabels.join(', '));
  Logger.log('');
  Logger.log('Category Sources:');
  Logger.log('  Expense: ' + doc.categorySources.expense);
  Logger.log('  Income: ' + doc.categorySources.income);
  Logger.log('  Business: ' + doc.categorySources.business);
  Logger.log('═══════════════════════════════════════════════════');
}

// ═══════════════════════════════════════════════════════════════════
// END OF COLUMN_CONFIG.GS
// ═══════════════════════════════════════════════════════════════════
