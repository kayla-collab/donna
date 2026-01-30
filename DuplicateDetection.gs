/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * DUPLICATE DETECTION - Enhanced Copy-Paste Error Detection
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * DUPLICATE DETECTION TYPES:
 * 1. Exact Duplicates: Same date + description + amount (copy-paste error)
 * 2. Wrong Label Duplicates: Same transaction but different category labels
 * 3. Legitimate Duplicates: Recurring transactions (allowed)
 */

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════
// NOTE: Column definitions now reference ColumnConfig.gs (MM_COLS)
// This provides a single source of truth for all column positions

const DUPLICATE_CONFIG = {
  // Column indices - reference MM_COLS from ColumnConfig.gs
  // Fallback values provided for safety
  COLS: {
    DATE: (typeof MM_COLS !== 'undefined') ? MM_COLS.DATE : 3,                 // C
    DESCRIPTION: (typeof MM_COLS !== 'undefined') ? MM_COLS.DESCRIPTION : 4,   // D
    AMOUNT: (typeof MM_COLS !== 'undefined') ? MM_COLS.AMOUNT : 5,             // E
    PERSONAL: (typeof MM_COLS !== 'undefined') ? MM_COLS.CATEGORY : 6,         // F (CATEGORY)
    BUSINESS: (typeof MM_COLS !== 'undefined') ? MM_COLS.SPECIAL_LABEL : 7,    // G (SPECIAL_LABEL)
    MEMO: (typeof MM_COLS !== 'undefined') ? MM_COLS.MEMO : 8,                 // H
    CORRECTION: (typeof MM_COLS !== 'undefined') ? MM_COLS.CORRECTION : 12     // L
  },
  
  // Detection settings - reference MM_ROWS from ColumnConfig.gs
  HEADER_ROW: (typeof MM_ROWS !== 'undefined') ? MM_ROWS.HEADER : 10,
  MAX_ROWS_TO_SCAN: 5000,
  
  // Flags for correction column
  FLAGS: {
    EXACT_DUPLICATE: '⚠️ DUPLICATE',
    WRONG_LABEL: '❌ WRONG LABEL',
    CLEAR: ''
  }
};

// ═══════════════════════════════════════════════════════════════════
// DUPLICATE DETECTION ENGINE
// ═══════════════════════════════════════════════════════════════════

/**
 * Scan sheet for duplicates and flag them
 * @param {Sheet} sheet - The sheet to scan (optional, defaults to active sheet)
 * @returns {Object} - Summary of duplicates found
 */
function scanForDuplicates(sheet) {
  sheet = sheet || SpreadsheetApp.getActiveSheet();
  
  // Verify this is an ACCOUNT sheet
  const sheetName = sheet.getName();
  if (!/^ACCOUNT\s*\d+$/i.test(sheetName)) {
    return {
      success: false,
      message: 'Duplicate scanning only works on ACCOUNT sheets'
    };
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= DUPLICATE_CONFIG.HEADER_ROW) {
    return {
      success: true,
      exactDuplicates: 0,
      wrongLabelDuplicates: 0,
      message: 'No transactions to scan'
    };
  }
  
  // Get all transaction data
  const startRow = DUPLICATE_CONFIG.HEADER_ROW + 1;
  const numRows = Math.min(lastRow - DUPLICATE_CONFIG.HEADER_ROW, DUPLICATE_CONFIG.MAX_ROWS_TO_SCAN);
  
  const data = sheet.getRange(
    startRow, 
    DUPLICATE_CONFIG.COLS.DATE, 
    numRows, 
    DUPLICATE_CONFIG.COLS.CORRECTION - DUPLICATE_CONFIG.COLS.DATE + 1
  ).getValues();
  
  // Build transaction map for detection
  const transactionMap = new Map();
  const duplicates = {
    exact: [],
    wrongLabel: []
  };
  
  // Process each row
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = startRow + i;
    
    // Extract data
    const date = row[0];
    const description = String(row[1] || '').trim();
    const amount = row[2];
    const personalCat = String(row[3] || '').trim();
    const businessCat = String(row[4] || '').trim();
    
    // Skip empty rows
    if (!date && !description && !amount) continue;
    
    // Create transaction key (for exact match detection)
    const txKey = createTransactionKey(date, description, amount);
    
    // Check if we've seen this exact transaction before
    if (transactionMap.has(txKey)) {
      const existingTx = transactionMap.get(txKey);
      
      // Compare labels to determine duplicate type
      if (existingTx.personalCat === personalCat && existingTx.businessCat === businessCat) {
        // Exact duplicate (including labels)
        duplicates.exact.push({
          row: rowNum,
          originalRow: existingTx.row,
          date: date,
          description: description,
          amount: amount
        });
      } else {
        // Same transaction but different labels
        duplicates.wrongLabel.push({
          row: rowNum,
          originalRow: existingTx.row,
          date: date,
          description: description,
          amount: amount,
          personalCat1: existingTx.personalCat,
          personalCat2: personalCat,
          businessCat1: existingTx.businessCat,
          businessCat2: businessCat
        });
      }
    } else {
      // First occurrence of this transaction
      transactionMap.set(txKey, {
        row: rowNum,
        personalCat: personalCat,
        businessCat: businessCat
      });
    }
  }
  
  // Clear all existing flags first
  clearDuplicateFlags(sheet, startRow, numRows);
  
  // Flag the duplicates
  flagDuplicates(sheet, duplicates);
  
  // Return summary
  return {
    success: true,
    exactDuplicates: duplicates.exact.length,
    wrongLabelDuplicates: duplicates.wrongLabel.length,
    totalTransactions: transactionMap.size,
    message: `Found ${duplicates.exact.length} exact duplicates and ${duplicates.wrongLabel.length} wrong-label duplicates`
  };
}

/**
 * Create a unique key for a transaction
 */
function createTransactionKey(date, description, amount) {
  // Normalize date
  let dateStr = '';
  if (date instanceof Date) {
    dateStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  } else {
    dateStr = String(date);
  }
  
  // Normalize amount
  let amountStr = '';
  if (typeof amount === 'number') {
    amountStr = amount.toFixed(2);
  } else {
    amountStr = String(amount);
  }
  
  // Create composite key
  return dateStr + '|' + description.toLowerCase() + '|' + amountStr;
}

/**
 * Clear all duplicate flags in the correction column
 */
function clearDuplicateFlags(sheet, startRow, numRows) {
  const range = sheet.getRange(startRow, DUPLICATE_CONFIG.COLS.CORRECTION, numRows, 1);
  const values = [];
  
  for (let i = 0; i < numRows; i++) {
    values.push([DUPLICATE_CONFIG.FLAGS.CLEAR]);
  }
  
  range.setValues(values);
}

/**
 * Flag duplicates in the sheet
 */
function flagDuplicates(sheet, duplicates) {
  // Flag exact duplicates
  for (const dup of duplicates.exact) {
    sheet.getRange(dup.row, DUPLICATE_CONFIG.COLS.CORRECTION)
      .setValue(DUPLICATE_CONFIG.FLAGS.EXACT_DUPLICATE)
      .setBackground('#ffcccc')  // Light red
      .setNote(`Exact duplicate of row ${dup.originalRow}`);
  }
  
  // Flag wrong-label duplicates
  for (const dup of duplicates.wrongLabel) {
    let note = `Same transaction as row ${dup.originalRow} but with different labels:\n`;
    
    if (dup.personalCat1 !== dup.personalCat2) {
      note += `Personal: "${dup.personalCat1}" vs "${dup.personalCat2}"\n`;
    }
    
    if (dup.businessCat1 !== dup.businessCat2) {
      note += `Business: "${dup.businessCat1}" vs "${dup.businessCat2}"`;
    }
    
    sheet.getRange(dup.row, DUPLICATE_CONFIG.COLS.CORRECTION)
      .setValue(DUPLICATE_CONFIG.FLAGS.WRONG_LABEL)
      .setBackground('#ffe6cc')  // Light orange
      .setNote(note);
  }
}

// ═══════════════════════════════════════════════════════════════════
// REAL-TIME DETECTION (ON EDIT)
// ═══════════════════════════════════════════════════════════════════

/**
 * Check if a newly entered transaction is a duplicate
 * Called when user manually enters data
 */
function checkForDuplicateOnEntry(sheet, row, date, description, amount) {
  // Don't check header rows
  if (row <= DUPLICATE_CONFIG.HEADER_ROW) return null;
  
  const lastRow = sheet.getLastRow();
  const startRow = DUPLICATE_CONFIG.HEADER_ROW + 1;
  
  // Don't scan if no other transactions
  if (lastRow <= DUPLICATE_CONFIG.HEADER_ROW + 1) return null;
  
  // Create key for the new transaction
  const newTxKey = createTransactionKey(date, description, amount);
  
  // Scan existing transactions
  const numRows = Math.min(row - startRow, DUPLICATE_CONFIG.MAX_ROWS_TO_SCAN);
  
  if (numRows <= 0) return null;
  
  const existingData = sheet.getRange(
    startRow,
    DUPLICATE_CONFIG.COLS.DATE,
    numRows,
    DUPLICATE_CONFIG.COLS.BUSINESS - DUPLICATE_CONFIG.COLS.DATE + 1
  ).getValues();
  
  // Check for duplicates
  for (let i = 0; i < existingData.length; i++) {
    const existingRow = existingData[i];
    const existingDate = existingRow[0];
    const existingDesc = String(existingRow[1] || '').trim();
    const existingAmount = existingRow[2];
    
    const existingKey = createTransactionKey(existingDate, existingDesc, existingAmount);
    
    if (existingKey === newTxKey) {
      // Found a duplicate
      const duplicateRow = startRow + i;
      
      return {
        isDuplicate: true,
        duplicateRow: duplicateRow,
        message: `This appears to be a duplicate of row ${duplicateRow}`
      };
    }
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// MENU FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Scan active sheet for duplicates (menu function)
 */
function scanForDuplicatesMenu() {
  const result = scanForDuplicates();
  
  const ui = SpreadsheetApp.getUi();
  
  if (!result.success) {
    ui.alert('Error', result.message, ui.ButtonSet.OK);
    return;
  }
  
  if (result.exactDuplicates === 0 && result.wrongLabelDuplicates === 0) {
    ui.alert(
      '✅ No Duplicates Found',
      `Scanned ${result.totalTransactions} transactions.\nNo duplicates detected.`,
      ui.ButtonSet.OK
    );
  } else {
    let message = `Scanned ${result.totalTransactions} transactions.\n\n`;
    
    if (result.exactDuplicates > 0) {
      message += `⚠️ Found ${result.exactDuplicates} exact duplicate(s)\n`;
      message += '   (Same date, description, and amount)\n\n';
    }
    
    if (result.wrongLabelDuplicates > 0) {
      message += `❌ Found ${result.wrongLabelDuplicates} wrong-label duplicate(s)\n`;
      message += '   (Same transaction with different categories)\n\n';
    }
    
    message += 'Check column L for flags and details.';
    
    ui.alert('Duplicate Scan Complete', message, ui.ButtonSet.OK);
  }
  
  // Toast notification
  SpreadsheetApp.getActiveSpreadsheet().toast(
    result.message,
    'Duplicate Scan',
    5
  );
}

/**
 * Clear all duplicate flags (menu function)
 */
function clearDuplicateFlagsMenu() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const sheetName = sheet.getName();
  
  if (!/^ACCOUNT\s*\d+$/i.test(sheetName)) {
    SpreadsheetApp.getUi().alert(
      'Error',
      'This function only works on ACCOUNT sheets',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }
  
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= DUPLICATE_CONFIG.HEADER_ROW) {
    SpreadsheetApp.getUi().alert(
      'No Data',
      'No transactions to clear',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }
  
  const startRow = DUPLICATE_CONFIG.HEADER_ROW + 1;
  const numRows = lastRow - DUPLICATE_CONFIG.HEADER_ROW;
  
  clearDuplicateFlags(sheet, startRow, numRows);
  
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Cleared all duplicate flags',
    'Flags Cleared',
    3
  );
}

// ═══════════════════════════════════════════════════════════════════
// LEGITIMATE RECURRING TRANSACTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Check if a duplicate might be a legitimate recurring transaction
 * (Same amount and description but different dates)
 */
function isLikelyRecurring(date1, date2, description, amount) {
  // If dates are different, it could be recurring
  const date1Str = date1 instanceof Date ? 
    Utilities.formatDate(date1, Session.getScriptTimeZone(), 'yyyy-MM-dd') : 
    String(date1);
    
  const date2Str = date2 instanceof Date ? 
    Utilities.formatDate(date2, Session.getScriptTimeZone(), 'yyyy-MM-dd') : 
    String(date2);
  
  if (date1Str !== date2Str) {
    // Different dates with same amount/description = likely recurring
    // Common examples: subscriptions, rent, utilities
    return true;
  }
  
  return false;
}