/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * CODE.GS - Main Utilities & Categorization Engine (NO PLAID)
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * UPDATES IN THIS VERSION:
 * ✅ Removed all Plaid/bank connection functionality
 * ✅ Enhanced machine learning with global ML integration
 * ✅ Manual data entry support
 * ✅ Enhanced duplicate detection
 * ✅ 2026 licensing year date bounds
 * ✅ Auto-trigger authentication on sheet open
 * ✅ Enhanced error detection (dates, descriptions)
 * ✅ New categorization modal support
 * ✅ Amount normalization (expenses always negative)
 * 
 * COLUMN STRUCTURE (2026 - from ColumnConfig.gs):
 * - C(3)=DATE, D(4)=DESCRIPTION, E(5)=AMOUNT
 * - F(6)=CATEGORY, G(7)=SPECIAL_LABEL/BUSINESS
 * - H(8)=MEMO, I(9)=NEED_DESIRE, J(10)=SPLIT_DATA
 * - K(11)=RECEIPT, L(12)=CORRECTION
 * - Header Row: 10, Data starts: Row 11
 * 
 * NOTE: Global constants are defined in Config.gs, ColumnConfig.gs, Helpers.gs
 * Do NOT redeclare: PLACEHOLDER_LINKS, LICENSE_CONFIG, MMNAV_COLS, MM_COLS,
 * INCOME_EXPENSE_COLS, MMNAV_BACKEND_SHEET_NAME, MMNAV_OPT, 
 * MMNAV_SPECIAL_TRANSACTIONS, MMNAV_SPECIAL_TX_SET, MMNAV_cache,
 * MMNAV_LEARN_MAX, MMNAV_LEARN_KEY_*, MM_ROWS, MM_SPECIAL_LABELS
 */

// ✅ NEW: Enhanced date validation with license bounds
function _mm_isValidDate_(dateVal) {
  if (!dateVal) return false;
  
  try {
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return false;
    
    // Check license year bounds
    const licenseStart = LICENSE_CONFIG.getLicenseStartDate();
    const licenseEnd = LICENSE_CONFIG.getLicenseEndDate();
    
    return date >= licenseStart && date <= licenseEnd;
  } catch (e) {
    return false;
  }
}

// ✅ NEW: Description validation
function _mm_isValidDescription_(desc) {
  if (!desc) return false;
  const str = String(desc).trim();
  if (str.length === 0) return false;
  if (str.includes('#REF') || str.includes('#ERROR') || str.includes('#N/A') || str.includes('#VALUE')) return false;
  if (/^\d+$/.test(str)) return false; // All numbers
  return true;
}

// ==================== MANUAL DATA ENTRY SUPPORT ====================

/**
 * Process manually entered transactions
 * Users copy-paste three columns: Date, Description, Amount
 * @param {Sheet} sheet - The account sheet
 * @param {Array} data - Array of [date, description, amount] rows
 * @returns {Object} - Result with count and any errors
 */
function processManualTransactions(sheet, data) {
  if (!sheet || !data || data.length === 0) {
    return { success: false, message: 'No data to process' };
  }
  
  const sheetName = sheet.getName();
  // Support renamed tabs via AccountNameManager
  const _isAcct = /^ACCOUNT\s*\d+$/i.test(sheetName) || (typeof isAccountTab === 'function' && isAccountTab(sheetName));
  if (!_isAcct) {
    return { success: false, message: 'Can only process transactions on ACCOUNT sheets' };
  }
  
  let processed = 0;
  let errors = [];
  let duplicates = [];
  
  // Get last row for appending
  let lastRow = sheet.getLastRow();
  let writeRow = lastRow > 10 ? lastRow + 1 : 11; // Start at row 11 if empty
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const date = row[0];
    const description = row[1];
    const amount = row[2];
    
    // Validate date
    if (!_mm_isValidDate_(date)) {
      errors.push(`Row ${i + 1}: Invalid date "${date}"`);
      continue;
    }
    
    // Validate description
    if (!_mm_isValidDescription_(description)) {
      errors.push(`Row ${i + 1}: Invalid description "${description}"`);
      continue;
    }
    
    // Validate amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      errors.push(`Row ${i + 1}: Invalid amount "${amount}"`);
      continue;
    }
    
    // Check for duplicate
    const dupCheck = checkForDuplicateOnEntry(sheet, writeRow, date, description, numAmount);
    if (dupCheck && dupCheck.isDuplicate) {
      duplicates.push(`Row ${i + 1}: ${dupCheck.message}`);
      // Still write it but flag it
      sheet.getRange(writeRow, DUPLICATE_CONFIG.COLS.CORRECTION)
        .setValue(DUPLICATE_CONFIG.FLAGS.EXACT_DUPLICATE)
        .setNote(`Duplicate of row ${dupCheck.duplicateRow}`);
    }
    
    // Write to sheet
    sheet.getRange(writeRow, MMNAV_COLS.DATE).setValue(date);
    sheet.getRange(writeRow, MMNAV_COLS.DESCRIPTION).setValue(description);
    sheet.getRange(writeRow, MMNAV_COLS.AMOUNT).setValue(numAmount);
    
    // Try to auto-categorize using ML
    const suggestion = getCategorySuggestion(description, numAmount);
    if (suggestion) {
      sheet.getRange(writeRow, MMNAV_COLS.PERSONAL).setValue(suggestion);
      sheet.getRange(writeRow, MMNAV_COLS.MEMO).setValue('Auto-categorized by ML');
    }
    
    processed++;
    writeRow++;
  }
  
  return {
    success: true,
    processed: processed,
    errors: errors,
    duplicates: duplicates,
    message: `Processed ${processed} transactions`
  };
}

/**
 * Handle paste event for manual entry
 * Called from onEdit trigger when paste is detected
 */
function handleManualPaste(e) {
  if (!e || !e.range) return;
  
  const sheet = e.range.getSheet();
  const sheetName = sheet.getName();
  
  // Only process on ACCOUNT sheets (including renamed tabs)
  const _isAcctSheet = /^ACCOUNT\s*\d+$/i.test(sheetName) || (typeof isAccountTab === 'function' && isAccountTab(sheetName));
  if (!_isAcctSheet) return;
  
  const startRow = e.range.getRow();
  const startCol = e.range.getColumn();
  
  // Check if paste is in the transaction area (starting at row 11, column C)
  if (startRow < 11 || startCol !== MMNAV_COLS.DATE) return;
  
  const numRows = e.range.getNumRows();
  const numCols = e.range.getNumColumns();
  
  // Check if it's a 3-column paste (Date, Description, Amount)
  if (numCols !== 3) return;
  
  // Get the pasted data
  const data = e.range.getValues();
  
  // Process the transactions
  const result = processManualTransactions(sheet, data);
  
  if (result.errors.length > 0) {
    SpreadsheetApp.getUi().alert(
      'Data Entry Errors',
      'Some transactions had errors:\n\n' + result.errors.join('\n'),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
  
  if (result.duplicates.length > 0) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Found ' + result.duplicates.length + ' potential duplicate(s)',
      'Duplicates Detected',
      5
    );
  }
  
  // Auto-scan for duplicates after paste
  scanForDuplicates(sheet);
}

// ==================== ACCOUNT SHEET UTILITIES ====================

/**
 * Get list of ACCOUNT tabs.
 * Uses AccountNameManager to include renamed tabs.
 */
function getAccountSheets() {
  if (!_mm_requireLoginOrOpenGate_('Account List')) throw new Error('Login required.');

  // Use AccountNameManager when available
  if (typeof getAccountTabObjects === 'function') {
    try { return getAccountTabObjects().map(function(a) { return a.sheetName; }); } catch(e) {}
  }

  const ss = MMNAV_OPT.getSS();
  const sheets = ss.getSheets();
  const accounts = [];
  for (let i = 0; i < sheets.length; i++) {
    const name = sheets[i].getName();
    if (/^ACCOUNT\s*\d+$/i.test(name)) accounts.push(name);
  }
  return accounts.sort(function(a, b) {
    var numA = parseInt(a.match(/\d+/)) || 0;
    var numB = parseInt(b.match(/\d+/)) || 0;
    return numA - numB;
  });
}

/**
 * Clear all transactions from an account sheet
 */
function clearAccountTransactions(sheetName) {
  if (!_mm_requireLoginOrOpenGate_('Clear Transactions')) throw new Error('Login required.');
  
  const ss = MMNAV_OPT.getSS();
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    throw new Error('Sheet not found: ' + sheetName);
  }
  
  // Support renamed tabs
  const _isAcctTab = /^ACCOUNT\s*\d+$/i.test(sheetName) || (typeof isAccountTab === 'function' && isAccountTab(sheetName));
  if (!_isAcctTab) {
    throw new Error('Can only clear transactions from ACCOUNT sheets');
  }
  
  const lastRow = sheet.getLastRow();
  
  if (lastRow > 10) {
    // Clear all data below header row
    const numRows = lastRow - 10;
    sheet.getRange(11, 1, numRows, sheet.getLastColumn()).clearContent();
    
    Logger.log('Cleared ' + numRows + ' rows from ' + sheetName);
    return { success: true, cleared: numRows };
  }
  
  return { success: true, cleared: 0 };
}

// ==================== MACHINE LEARNING (ENHANCED WITH GLOBAL ML) ====================

function _mm_getLearnMap_(key) {
  try {
    const raw = MMNAV_OPT.scriptProps.getProperty(key);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return (obj && typeof obj === 'object') ? obj : {};
  } catch (e) {
    return {};
  }
}

function _mm_saveLearnMap_(key, mapObj) {
  try {
    const entries = Object.entries(mapObj);
    if (entries.length > MMNAV_LEARN_MAX) {
      entries.sort((a, b) => (a[1]?.ts || 0) - (b[1]?.ts || 0));
      const remove = entries.length - MMNAV_LEARN_MAX;
      for (let i = 0; i < remove; i++) delete mapObj[entries[i][0]];
    }
    MMNAV_OPT.scriptProps.setProperty(key, JSON.stringify(mapObj));
  } catch (e) {
    Logger.log('Save learn map error: ' + e.message);
  }
}

// ==================== NORMALIZATION & PARSING ====================

function _mm_normDesc_(desc) {
  if (!desc) return '';
  return String(desc).toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function _mm_parseMoney_(sheet, str) {
  if (!str) return 0;
  const clean = String(str).replace(/[^\d.-]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

// ==================== AUTO-CATEGORIZATION ====================

/**
 * Auto-categorize new transactions using ML
 */
function autoCategorizeNewTransactions(sheet, startRow, numRows) {
  if (!sheet || startRow < 11 || numRows <= 0) return;
  
  let categorized = 0;
  
  for (let i = 0; i < numRows; i++) {
    const row = startRow + i;
    
    // Check if already categorized
    const existingCat = sheet.getRange(row, MMNAV_COLS.PERSONAL).getValue();
    if (existingCat) continue;
    
    // Get transaction details
    const desc = sheet.getRange(row, MMNAV_COLS.DESCRIPTION).getValue();
    const amount = _mm_parseMoney_(null, sheet.getRange(row, MMNAV_COLS.AMOUNT).getValue());
    
    if (!desc) continue;
    
    // Get ML suggestion
    const suggestion = getCategorySuggestion(desc, amount);
    
    if (suggestion) {
      sheet.getRange(row, MMNAV_COLS.PERSONAL).setValue(suggestion);
      sheet.getRange(row, MMNAV_COLS.MEMO).setValue('Auto-ML');
      recordAcceptedSuggestion(desc, suggestion, amount);
      categorized++;
    }
  }
  
  if (categorized > 0) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      `Auto-categorized ${categorized} transaction(s)`,
      'ML Categorization',
      3
    );
  }
  
  return categorized;
}

// ==================== ERROR HANDLING ====================

/**
 * Display validation errors to user
 */
function showValidationErrors(errors) {
  if (!errors || errors.length === 0) return;
  
  const ui = SpreadsheetApp.getUi();
  const message = 'Please fix the following issues:\n\n' + errors.join('\n');
  
  ui.alert('Validation Errors', message, ui.ButtonSet.OK);
}

// ==================== MENU FUNCTIONS ====================

/**
 * Manual transaction entry helper
 */
function showManualEntryInstructions() {
  const ui = SpreadsheetApp.getUi();
  
  const message = 
    'MANUAL TRANSACTION ENTRY:\n\n' +
    '1. Copy your transactions from your source (Excel, CSV, etc.)\n' +
    '2. Your data should have 3 columns:\n' +
    '   - Date (MM/DD/YYYY or similar)\n' +
    '   - Description (Transaction name/merchant)\n' +
    '   - Amount (positive for income, negative for expenses)\n\n' +
    '3. Click on cell C11 (Date column, first data row)\n' +
    '4. Paste your data (Ctrl+V or Cmd+V)\n\n' +
    'The system will:\n' +
    '• Validate your data\n' +
    '• Check for duplicates\n' +
    '• Auto-categorize using ML (if available)\n' +
    '• Flag any issues in column L';
  
  ui.alert('Manual Entry Instructions', message, ui.ButtonSet.OK);
}

/**
 * Show ML learning status
 */
function showMLStatus() {
  try {
    const stats = getGlobalMLStats();
    
    if (!stats) {
      SpreadsheetApp.getUi().alert('Unable to retrieve ML status');
      return;
    }
    
    const message = 
      `ML System Status:\n\n` +
      `Training Data: ${stats.totalRecords} transactions\n` +
      `Status: ${stats.readyForML ? '✅ Active' : '⏳ Learning (need ' + (50 - stats.totalRecords) + ' more)'}\n` +
      `Mode: ${stats.usingFuzzyMatch ? 'Fuzzy Matching' : 'Exact Matching'}\n` +
      `Categories: ${stats.uniqueCategories}\n\n` +
      `Manual: ${stats.manualEntries}\n` +
      `Accepted: ${stats.acceptedSuggestions}\n` +
      `Rejected: ${stats.rejectedSuggestions}`;
    
    SpreadsheetApp.getUi().alert('ML Status', message, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}