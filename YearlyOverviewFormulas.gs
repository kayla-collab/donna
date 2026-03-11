/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * YEARLY_OVERVIEW_FORMULAS.GS - Payments, Transfers & Business Breakdown
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Populates the "Payments, Transfers & Business Flow Breakdown" section
 * in the YEARLY OVERVIEW sheet with SUMIFS formulas.
 * 
 * Data pulled directly from ACCOUNT 1-10 sheets:
 * - Column C (3): Date
 * - Column E (5): Amount
 * - Column F (6): Personal Categories (for payments, transfers, ignored)
 * - Column G (7): Business Categories (for business income/expense)
 * 
 * YEARLY OVERVIEW Layout:
 * - Row 33: Month numbers (1-12) in columns D-O (D$33 = 1, E$33 = 2, etc.)
 * - Rows 520-536: Payments, Transfers & Business Flow Breakdown section
 *   - Row 525: PAYMENTS header
 *   - Row 526: Credit Card Payment Received
 *   - Row 527: Debt Payment - Credit Card
 *   - Row 528: TRANSFERS header
 *   - Row 529: Transfer Deposit Personal to Personal
 *   - Row 530: Transfer Withdrawal Personal to Personal
 *   - Row 531: BUSINESS ACCOUNTS header
 *   - Row 532: Business Income
 *   - Row 533: Business Expense
 *   - Row 534: IGNORED TRANSACTIONS header
 *   - Row 535: Ignored Transaction In
 *   - Row 536: Ignored Transaction Out
 * 
 * Triggered: On categorization modal load and refresh
 * ═══════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

var YEARLY_OVERVIEW_CONFIG = {
  SHEET_NAME: 'YEARLY OVERVIEW',
  
  // Month columns (D=4 through O=15)
  MONTH_START_COL: 4,   // Column D = January (month 1)
  MONTH_END_COL: 15,    // Column O = December (month 12)
  MONTH_ROW: 33,        // Row with month numbers (D$33=1, E$33=2, etc.)
  
  // Breakdown section rows (actual rows in YEARLY OVERVIEW sheet)
  ROWS: {
    CREDIT_CARD_PAYMENT_RECEIVED: 526,
    DEBT_PAYMENT_TO_CC: 527,
    TRANSFER_DEPOSIT_PERSONAL: 529,
    TRANSFER_WITHDRAWAL_PERSONAL: 530,
    BUSINESS_INCOME: 532,
    BUSINESS_EXPENSE: 533,
    IGNORED_TRANSACTION_IN: 535,
    IGNORED_TRANSACTION_OUT: 536
  },
  
  // Labels to match in Column F (PERSONAL_CATEGORIES)
  // These match BACKEND!C51:D55 exactly
  LABELS: {
    CREDIT_CARD_PAYMENT_RECEIVED: 'Credit Card Payment Received',
    DEBT_PAYMENT_TO_CC: 'Debt Payment - Credit Card',
    TRANSFER_DEPOSIT_PERSONAL: 'Transfer Deposit Personal to Personal',
    TRANSFER_WITHDRAWAL_PERSONAL: 'Transfer Withdrawal Personal to Personal',
    IGNORED_IN: 'Ignored Transaction In',
    IGNORED_OUT: 'Ignored Transaction Out'
  },
  
  // ACCOUNT sheet configuration
  ACCOUNT: {
    DATE_COL: 3,        // Column C
    AMOUNT_COL: 5,      // Column E
    PERSONAL_CAT_COL: 6, // Column F
    BUSINESS_CAT_COL: 7, // Column G
    DATA_START_ROW: 11,
    MAX_ROW: 10003
  }
};

// ═══════════════════════════════════════════════════════════════════
// MAIN FUNCTION - Populate Breakdown Section
// ═══════════════════════════════════════════════════════════════════

/**
 * Main function to populate the Payments, Transfers & Business Flow Breakdown
 * Writes SUMIFS formulas to YEARLY OVERVIEW sheet
 */
function populateYearlyOverviewBreakdown() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var yearlySheet = ss.getSheetByName(YEARLY_OVERVIEW_CONFIG.SHEET_NAME);
    
    if (!yearlySheet) {
      Logger.log('YEARLY OVERVIEW sheet not found');
      return false;
    }
    
    Logger.log('=== Populating Yearly Overview Breakdown ===');
    
    // Get all ACCOUNT sheet names
    var accountSheets = _getAccountSheetNames(ss);
    if (accountSheets.length === 0) {
      Logger.log('No ACCOUNT sheets found');
      return false;
    }
    
    Logger.log('Found ' + accountSheets.length + ' ACCOUNT sheets: ' + accountSheets.join(', '));
    
    // Build and write formulas for each category
    var config = YEARLY_OVERVIEW_CONFIG;
    var rows = config.ROWS;
    var labels = config.LABELS;
    
    // PAYMENTS (Rows 526-527)
    _writeBreakdownFormulas(yearlySheet, rows.CREDIT_CARD_PAYMENT_RECEIVED, 
      labels.CREDIT_CARD_PAYMENT_RECEIVED, 'personal', 'positive', accountSheets);
    
    _writeBreakdownFormulas(yearlySheet, rows.DEBT_PAYMENT_TO_CC, 
      labels.DEBT_PAYMENT_TO_CC, 'personal', 'negative', accountSheets);
    
    // TRANSFERS (Rows 529-530)
    _writeBreakdownFormulas(yearlySheet, rows.TRANSFER_DEPOSIT_PERSONAL, 
      labels.TRANSFER_DEPOSIT_PERSONAL, 'personal', 'positive', accountSheets);
    
    _writeBreakdownFormulas(yearlySheet, rows.TRANSFER_WITHDRAWAL_PERSONAL, 
      labels.TRANSFER_WITHDRAWAL_PERSONAL, 'personal', 'negative', accountSheets);
    
    // BUSINESS ACCOUNTS (Rows 532-533)
    _writeBusinessFormulas(yearlySheet, rows.BUSINESS_INCOME, 'positive', accountSheets);
    _writeBusinessFormulas(yearlySheet, rows.BUSINESS_EXPENSE, 'negative', accountSheets);
    
    // IGNORED TRANSACTIONS (Rows 535-536)
    _writeBreakdownFormulas(yearlySheet, rows.IGNORED_TRANSACTION_IN, 
      labels.IGNORED_IN, 'personal', 'positive', accountSheets);
    
    _writeBreakdownFormulas(yearlySheet, rows.IGNORED_TRANSACTION_OUT, 
      labels.IGNORED_OUT, 'personal', 'negative', accountSheets);
    
    Logger.log('=== Yearly Overview Breakdown Complete ===');
    return true;
    
  } catch (e) {
    Logger.log('Error in populateYearlyOverviewBreakdown: ' + e.message);
    Logger.log('Stack: ' + e.stack);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get all ACCOUNT sheet names from the spreadsheet.
 * Uses AccountNameManager to include renamed tabs.
 */
function _getAccountSheetNames(ss) {
  // Use AccountNameManager when available
  if (typeof getAccountTabObjects === 'function') {
    try {
      return getAccountTabObjects(ss).map(function(a) { return a.sheetName; });
    } catch(e) {
      Logger.log('[YearlyOverview] AccountNameManager error, falling back: ' + e.message);
    }
  }

  // Fallback: original regex scan
  var sheets = ss.getSheets();
  var accountSheets = [];
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    if (name.match(/^ACCOUNT \d+$/i)) accountSheets.push(name);
  }
  accountSheets.sort(function(a, b) {
    var numA = parseInt(a.replace(/\D/g, ''));
    var numB = parseInt(b.replace(/\D/g, ''));
    return numA - numB;
  });
  return accountSheets;
}

/**
 * Write SUMIFS formulas for a breakdown row (personal categories)
 * 
 * @param {Sheet} sheet - YEARLY OVERVIEW sheet
 * @param {number} row - Row number to write to
 * @param {string} label - Category label to match in Column F
 * @param {string} catType - 'personal' or 'business'
 * @param {string} amountType - 'positive', 'negative', or 'all'
 * @param {Array} accountSheets - Array of ACCOUNT sheet names
 */
function _writeBreakdownFormulas(sheet, row, label, catType, amountType, accountSheets) {
  var config = YEARLY_OVERVIEW_CONFIG;
  var formulas = [];
  
  // Build formula for each month (columns D-O = months 1-12)
  for (var col = config.MONTH_START_COL; col <= config.MONTH_END_COL; col++) {
    var monthNum = col - config.MONTH_START_COL + 1; // 1-12
    var formula = _buildSumFormula(accountSheets, label, catType, amountType, monthNum);
    formulas.push([formula]);
  }
  
  // Write all 12 formulas at once
  var range = sheet.getRange(row, config.MONTH_START_COL, 1, 12);
  range.setFormulas([formulas.map(function(f) { return f[0]; })]);
  
  Logger.log('Wrote formulas for row ' + row + ' (' + label + ')');
}

/**
 * Write SUMIFS formulas for business income/expense rows
 * Business transactions are identified by non-empty Column G
 * 
 * @param {Sheet} sheet - YEARLY OVERVIEW sheet
 * @param {number} row - Row number to write to
 * @param {string} amountType - 'positive' (income) or 'negative' (expense)
 * @param {Array} accountSheets - Array of ACCOUNT sheet names
 */
function _writeBusinessFormulas(sheet, row, amountType, accountSheets) {
  var config = YEARLY_OVERVIEW_CONFIG;
  var formulas = [];
  
  // Build formula for each month (columns D-O = months 1-12)
  for (var col = config.MONTH_START_COL; col <= config.MONTH_END_COL; col++) {
    var monthNum = col - config.MONTH_START_COL + 1; // 1-12
    var formula = _buildBusinessSumFormula(accountSheets, amountType, monthNum);
    formulas.push(formula);
  }
  
  // Write all 12 formulas at once
  var range = sheet.getRange(row, config.MONTH_START_COL, 1, 12);
  range.setFormulas([formulas]);
  
  Logger.log('Wrote business formulas for row ' + row + ' (' + amountType + ')');
}

/**
 * Build a SUMIFS formula that sums across all ACCOUNT sheets
 * Matches: Column F (personal category) = label, Month(Column C) = monthNum
 * 
 * Formula structure:
 * =IF(SUM(...) = 0, "", SUM(...))
 * 
 * Where SUM is actually multiple SUMIFS added together for each ACCOUNT sheet
 */
function _buildSumFormula(accountSheets, label, catType, amountType, monthNum) {
  var config = YEARLY_OVERVIEW_CONFIG.ACCOUNT;
  var catCol = catType === 'business' ? config.BUSINESS_CAT_COL : config.PERSONAL_CAT_COL;
  
  // Column letters
  var dateColLetter = _colToLetter(config.DATE_COL);      // C
  var amountColLetter = _colToLetter(config.AMOUNT_COL);  // E
  var catColLetter = _colToLetter(catCol);                // F or G
  
  var range = '$' + config.DATA_START_ROW + ':$' + config.MAX_ROW;
  
  // Build SUMIFS for each account sheet
  var sumifsParts = [];
  
  for (var i = 0; i < accountSheets.length; i++) {
    var sheetName = accountSheets[i];
    var escapedName = "'" + sheetName + "'";
    
    // Base SUMIFS: sum amount where category matches and month matches
    var sumifs = 'SUMIFS(' + 
      escapedName + '!$' + amountColLetter + range + ',' +  // Sum range (Amount)
      escapedName + '!$' + catColLetter + range + ',"' + label + '",' +  // Criteria: category = label
      escapedName + '!$' + dateColLetter + range + ',">=DATE(2026,' + monthNum + ',1)",' +  // Criteria: date >= month start
      escapedName + '!$' + dateColLetter + range + ',"<DATE(' + (monthNum === 12 ? '2027,1' : '2026,' + (monthNum + 1)) + ',1)"';  // Criteria: date < next month
    
    // Add amount criteria if needed
    if (amountType === 'positive') {
      sumifs += ',' + escapedName + '!$' + amountColLetter + range + ',">0"';
    } else if (amountType === 'negative') {
      sumifs += ',' + escapedName + '!$' + amountColLetter + range + ',"<0"';
    }
    
    sumifs += ')';
    sumifsParts.push(sumifs);
  }
  
  // Combine all SUMIFS with +
  var sumAll = sumifsParts.join('+');
  
  // Wrap in IF to show blank if zero
  var formula = '=IF(' + sumAll + '=0,"",' + sumAll + ')';
  
  return formula;
}

/**
 * Build a SUMIFS formula for business transactions
 * Business = Column G is not empty
 */
function _buildBusinessSumFormula(accountSheets, amountType, monthNum) {
  var config = YEARLY_OVERVIEW_CONFIG.ACCOUNT;
  
  // Column letters
  var dateColLetter = _colToLetter(config.DATE_COL);      // C
  var amountColLetter = _colToLetter(config.AMOUNT_COL);  // E
  var bizColLetter = _colToLetter(config.BUSINESS_CAT_COL); // G
  
  var range = '$' + config.DATA_START_ROW + ':$' + config.MAX_ROW;
  
  // Build SUMIFS for each account sheet
  var sumifsParts = [];
  
  for (var i = 0; i < accountSheets.length; i++) {
    var sheetName = accountSheets[i];
    var escapedName = "'" + sheetName + "'";
    
    // SUMIFS: sum amount where business category is not empty and month matches
    var sumifs = 'SUMIFS(' + 
      escapedName + '!$' + amountColLetter + range + ',' +  // Sum range (Amount)
      escapedName + '!$' + bizColLetter + range + ',"<>",' +  // Criteria: business category not empty
      escapedName + '!$' + dateColLetter + range + ',">=DATE(2026,' + monthNum + ',1)",' +  // Criteria: date >= month start
      escapedName + '!$' + dateColLetter + range + ',"<DATE(' + (monthNum === 12 ? '2027,1' : '2026,' + (monthNum + 1)) + ',1)"';  // Criteria: date < next month
    
    // Add amount criteria
    if (amountType === 'positive') {
      sumifs += ',' + escapedName + '!$' + amountColLetter + range + ',">0"';
    } else if (amountType === 'negative') {
      sumifs += ',' + escapedName + '!$' + amountColLetter + range + ',"<0"';
    }
    
    sumifs += ')';
    sumifsParts.push(sumifs);
  }
  
  // Combine all SUMIFS with +
  var sumAll = sumifsParts.join('+');
  
  // Wrap in IF to show blank if zero
  var formula = '=IF(' + sumAll + '=0,"",' + sumAll + ')';
  
  return formula;
}

/**
 * Convert column number to letter (1=A, 2=B, etc.)
 */
function _colToLetter(col) {
  var letter = '';
  while (col > 0) {
    var mod = (col - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

// ═══════════════════════════════════════════════════════════════════
// REFRESH FUNCTION - Called on categorization load/refresh
// ═══════════════════════════════════════════════════════════════════

/**
 * Refresh the Yearly Overview breakdown section
 * Called from categorization modal and dashboard refresh
 */
function refreshYearlyOverviewBreakdown() {
  Logger.log('Refreshing Yearly Overview Breakdown...');
  return populateYearlyOverviewBreakdown();
}

// ═══════════════════════════════════════════════════════════════════
// ADMIN MENU FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Admin function to manually trigger breakdown population
 */
function ADMIN_populateYearlyOverviewBreakdown() {
  var ui = SpreadsheetApp.getUi();
  
  var result = populateYearlyOverviewBreakdown();
  
  if (result) {
    ui.alert('Success', 'Yearly Overview breakdown formulas have been populated.', ui.ButtonSet.OK);
  } else {
    ui.alert('Error', 'Failed to populate breakdown formulas. Check the logs for details.', ui.ButtonSet.OK);
  }
}
