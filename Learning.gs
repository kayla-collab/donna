/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * LEARNING_ENHANCED.GS - Modified to use Global ML System
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * MODIFICATIONS:
 * - Integrated with GlobalML.gs for centralized learning
 * - Records both accepted and rejected suggestions
 * - Uses external ML sheet as single source of truth
 */

// ═══════════════════════════════════════════════════════════════════
// ML CONSTANTS (Keep for backward compatibility)
// ═══════════════════════════════════════════════════════════════════
// NOTE: Column definitions are now in ColumnConfig.gs (MM_COLS)
// This file uses MMNAV_COLS from Config.gs for backward compatibility
// which now maps to the unified column structure

var MMNAV_LEARN_MAX = 5000;
var MMNAV_LEARN_KEY_PERSONAL_INCOME = 'mm_learn_personal_income_v2';
var MMNAV_LEARN_KEY_PERSONAL_EXPENSE = 'mm_learn_personal_expense_v2';
var MMNAV_LEARN_KEY_BUSINESS = 'mm_learn_business_v2';

// Column references - use MM_COLS from ColumnConfig.gs when available
// Falls back to MMNAV_COLS from Config.gs for compatibility
var LEARN_COLS = (typeof MM_COLS !== 'undefined') ? MM_COLS : {
  DATE: 3,
  DESCRIPTION: 4,
  AMOUNT: 5,
  CATEGORY: 6,
  SPECIAL_LABEL: 7,
  MEMO: 8,
  NEED_DESIRE: 9
};

// ═══════════════════════════════════════════════════════════════════
// GLOBAL ML STATISTICS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get global ML model statistics for auto-categorization
 * Returns training data count, accuracy, ready status, etc.
 * 
 * This function is called by:
 * - Categorization modal (Auto Categorize button)
 * - ML status displays
 * - Auto-categorization functions
 * 
 * @returns {Object} ML stats object with training data and status
 */
function getGlobalMLStats() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var mlSheet = ss.getSheetByName('MACHINE LEARNING');
    
    if (!mlSheet) {
      Logger.log('⚠️ MACHINE LEARNING sheet not found');
      return {
        totalRecords: 0,
        manualEntries: 0,
        acceptedSuggestions: 0,
        rejectedSuggestions: 0,
        uniqueCategories: 0,
        readyForML: false,
        usingFuzzyMatch: true,
        lastUpdated: null,
        error: 'MACHINE LEARNING sheet not found'
      };
    }
    
    // Get all data from ML sheet (skip header row)
    var lastRow = mlSheet.getLastRow();
    
    if (lastRow <= 1) {
      // Only header or empty sheet
      return {
        totalRecords: 0,
        manualEntries: 0,
        acceptedSuggestions: 0,
        rejectedSuggestions: 0,
        uniqueCategories: 0,
        readyForML: false,
        usingFuzzyMatch: true,
        lastUpdated: null
      };
    }
    
    // Read data efficiently (all at once)
    var dataRange = mlSheet.getRange(2, 1, lastRow - 1, 7); // Skip header, read all columns
    var data = dataRange.getValues();
    
    var totalRecords = 0;
    var manualEntries = 0;
    var acceptedSuggestions = 0;
    var rejectedSuggestions = 0;
    var categories = {};
    var latestTimestamp = null;
    
    // Process data
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var description = row[0]; // Column A
      var category = row[1]; // Column B
      var source = row[3]; // Column D
      var timestamp = row[6]; // Column G
      
      // Skip empty rows
      if (!description || !category) {
        continue;
      }
      
      totalRecords++;
      
      // Count source types
      if (source === 'MANUAL') {
        manualEntries++;
      } else if (source === 'ACCEPTED') {
        acceptedSuggestions++;
      } else if (source === 'REJECTED') {
        rejectedSuggestions++;
      }
      
      // Track categories
      categories[category] = true;
      
      // Track latest timestamp
      if (timestamp) {
        if (!latestTimestamp || timestamp > latestTimestamp) {
          latestTimestamp = timestamp;
        }
      }
    }
    
    var uniqueCategories = Object.keys(categories).length;
    
    // Determine ML readiness
    // Need at least 50 transactions for meaningful ML
    var readyForML = totalRecords >= 50;
    
    // Use fuzzy matching in early stage (< 100 records)
    // Switch to more exact matching once enough data is collected
    var usingFuzzyMatch = totalRecords < 100;
    
    return {
      totalRecords: totalRecords,
      manualEntries: manualEntries,
      acceptedSuggestions: acceptedSuggestions,
      rejectedSuggestions: rejectedSuggestions,
      uniqueCategories: uniqueCategories,
      readyForML: readyForML,
      usingFuzzyMatch: usingFuzzyMatch,
      lastUpdated: latestTimestamp,
      mlSheetExists: true,
      mlSheetRows: lastRow - 1 // Excluding header
    };
    
  } catch (error) {
    Logger.log('❌ Error in getGlobalMLStats: ' + error.toString());
    Logger.log('Stack trace: ' + error.stack);
    
    return {
      totalRecords: 0,
      manualEntries: 0,
      acceptedSuggestions: 0,
      rejectedSuggestions: 0,
      uniqueCategories: 0,
      readyForML: false,
      usingFuzzyMatch: true,
      lastUpdated: null,
      error: error.message,
      errorStack: error.stack
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// MODIFIED LEARNING FUNCTIONS - NOW USE GLOBAL ML
// ═══════════════════════════════════════════════════════════════════

/**
 * Learn from user categorization - MODIFIED to use Global ML
 */
function _mm_learnFromRow_(sheet, row, category, isBusinessMode, isIncome) {
  try {
    if (!category) return;
    
    const desc = sheet.getRange(row, MMNAV_COLS.DESCRIPTION).getDisplayValue();
    const amount = _mm_parseMoney_(null, sheet.getRange(row, MMNAV_COLS.AMOUNT).getDisplayValue());
    
    if (!desc) return;
    
    // Use Global ML system
    learnFromUserCategorization(desc, category, amount);
    
    // Also store locally for backward compatibility (if needed)
    const norm = _mm_normDesc_(desc);
    if (!norm) return;
    
    const now = Date.now();
    
    if (isBusinessMode) {
      const map = _mm_getLearnMap_(MMNAV_LEARN_KEY_BUSINESS);
      map[norm] = { cat: String(category), ts: now, count: (map[norm] ? map[norm].count : 0) + 1 };
      _mm_saveLearnMap_(MMNAV_LEARN_KEY_BUSINESS, map);
    } else {
      const key = isIncome ? MMNAV_LEARN_KEY_PERSONAL_INCOME : MMNAV_LEARN_KEY_PERSONAL_EXPENSE;
      const map = _mm_getLearnMap_(key);
      map[norm] = { cat: String(category), ts: now, count: (map[norm] ? map[norm].count : 0) + 1 };
      _mm_saveLearnMap_(key, map);
    }
    
  } catch (e) {
    Logger.log('Learn from row error: ' + e.message);
  }
}

/**
 * Lookup learned category - MODIFIED to use Global ML first
 */
function _mm_lookupLearnedCategory_(description, isBusinessMode, isIncome) {
  const norm = _mm_normDesc_(description);
  if (!norm) return '';
  
  // Try Global ML first
  const amount = isIncome ? 1 : -1; // Dummy amount for type detection
  const mlSuggestion = getCategorySuggestion(description, amount);
  
  if (mlSuggestion) {
    return mlSuggestion;
  }
  
  // Fall back to local learning (for backward compatibility)
  if (isBusinessMode) {
    const map = _mm_getLearnMap_(MMNAV_LEARN_KEY_BUSINESS);
    if (map[norm]) return map[norm].cat;
    return _mm_partialMatchCategory_(norm, map);
  }
  
  const key = isIncome ? MMNAV_LEARN_KEY_PERSONAL_INCOME : MMNAV_LEARN_KEY_PERSONAL_EXPENSE;
  const map = _mm_getLearnMap_(key);
  if (map[norm]) return map[norm].cat;
  return _mm_partialMatchCategory_(norm, map);
}

// ═══════════════════════════════════════════════════════════════════
// NEW FUNCTIONS FOR ML INTERACTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Show ML suggestion dialog for a transaction
 */
function showMLSuggestionDialog(row) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const sheetName = sheet.getName();
    
    if (!/^ACCOUNT\s*\d+$/i.test(sheetName)) {
      SpreadsheetApp.getUi().alert('This function only works on ACCOUNT sheets');
      return;
    }
    
    // Get transaction details
    const desc = sheet.getRange(row, MMNAV_COLS.DESCRIPTION).getDisplayValue();
    const amount = _mm_parseMoney_(null, sheet.getRange(row, MMNAV_COLS.AMOUNT).getDisplayValue());
    const existingCat = sheet.getRange(row, MMNAV_COLS.PERSONAL).getDisplayValue();
    
    if (!desc) {
      SpreadsheetApp.getUi().alert('No description found for this transaction');
      return;
    }
    
    if (existingCat) {
      SpreadsheetApp.getUi().alert('This transaction already has a category: ' + existingCat);
      return;
    }
    
    // Get ML suggestion
    const suggestion = getCategorySuggestion(desc, amount);
    
    if (!suggestion) {
      SpreadsheetApp.getUi().alert(
        'No Suggestion Available',
        'The ML system doesn\'t have enough data yet to suggest a category for this transaction.',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return;
    }
    
    // Show suggestion dialog
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      'ML Category Suggestion',
      `Transaction: ${desc}\n` +
      `Amount: $${Math.abs(amount).toFixed(2)} ${amount > 0 ? '(Income)' : '(Expense)'}\n\n` +
      `Suggested Category: ${suggestion}\n\n` +
      `Accept this suggestion?`,
      ui.ButtonSet.YES_NO_CANCEL
    );
    
    if (response === ui.Button.YES) {
      // Accept suggestion
      sheet.getRange(row, MMNAV_COLS.PERSONAL).setValue(suggestion);
      recordAcceptedSuggestion(desc, suggestion, amount);
      
      SpreadsheetApp.getActiveSpreadsheet().toast(
        'Category applied and ML system updated',
        'Suggestion Accepted',
        3
      );
      
    } else if (response === ui.Button.NO) {
      // Reject suggestion - ask for correct category
      const correctResponse = ui.prompt(
        'Provide Correct Category',
        'What is the correct category for this transaction?',
        ui.ButtonSet.OK_CANCEL
      );
      
      if (correctResponse.getSelectedButton() === ui.Button.OK) {
        const correctCategory = correctResponse.getResponseText().trim();
        
        if (correctCategory) {
          sheet.getRange(row, MMNAV_COLS.PERSONAL).setValue(correctCategory);
          recordRejectedSuggestion(desc, suggestion, correctCategory, amount);
          
          SpreadsheetApp.getActiveSpreadsheet().toast(
            'Category applied and ML system learned from rejection',
            'Feedback Recorded',
            3
          );
        }
      }
    }
    
  } catch (e) {
    Logger.log('Error showing ML suggestion: ' + e.message);
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// ENHANCED AUTO-CATEGORIZATION WITH ML
// ═══════════════════════════════════════════════════════════════════

function autoCategorizeActiveSheetFromLearningMenu() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const sheetName = sheet.getName();
    
    if (!/^ACCOUNT\s*\d+$/i.test(sheetName)) {
      SpreadsheetApp.getUi().alert(
        'Invalid Sheet',
        'Auto-categorize only works on ACCOUNT sheets (e.g., ACCOUNT 1, ACCOUNT 2).',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return;
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 11) {
      SpreadsheetApp.getUi().alert('No Transactions', 'No transactions found to categorize.', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    // Check if ML is ready
    const mlStats = getGlobalMLStats();
    if (!mlStats || !mlStats.readyForML) {
      const currentCount = mlStats ? mlStats.totalRecords : 0;
      SpreadsheetApp.getUi().alert(
        'ML Not Ready',
        `The ML system needs at least 50 categorized transactions to start making suggestions.\n` +
        `Current count: ${currentCount}`,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return;
    }
    
    const data = sheet.getRange(11, MMNAV_COLS.DATE, lastRow - 10, 5).getDisplayValues();
    let categorized = 0;
    let skipped = 0;
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const desc = row[1];
      const amount = _mm_parseMoney_(null, row[2]);
      const existingCat = row[3];
      
      if (!desc || existingCat) {
        if (existingCat) skipped++;
        continue;
      }
      
      // Get ML suggestion
      const suggestedCat = getCategorySuggestion(desc, amount);
      
      if (suggestedCat) {
        sheet.getRange(11 + i, MMNAV_COLS.PERSONAL).setValue(suggestedCat);
        // Record as auto-accepted
        recordAcceptedSuggestion(desc, suggestedCat, amount);
        categorized++;
      }
    }
    
    const message = `Auto-categorized ${categorized} transaction(s)\n` +
                   `Skipped ${skipped} already categorized\n` +
                   `Using ${mlStats.usingFuzzyMatch ? 'fuzzy' : 'exact'} matching`;
    
    SpreadsheetApp.getActiveSpreadsheet().toast(
      message,
      'Auto-Categorization Complete',
      5
    );
    
  } catch (e) {
    Logger.log('Auto-categorize error: ' + e.message);
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Show ML statistics
 */
function showMLStatistics() {
  try {
    const stats = getGlobalMLStats();
    
    if (!stats) {
      SpreadsheetApp.getUi().alert('Error', 'Unable to retrieve ML statistics', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    const message = 
      `Global ML Statistics:\n\n` +
      `Total Records: ${stats.totalRecords}\n` +
      `Manual Entries: ${stats.manualEntries}\n` +
      `Accepted Suggestions: ${stats.acceptedSuggestions}\n` +
      `Rejected Suggestions: ${stats.rejectedSuggestions}\n` +
      `Unique Categories: ${stats.uniqueCategories}\n\n` +
      `ML Status: ${stats.readyForML ? '✅ Ready' : '⏳ Need ' + (50 - stats.totalRecords) + ' more transactions'}\n` +
      `Matching Mode: ${stats.usingFuzzyMatch ? 'Fuzzy (Early Stage)' : 'Exact (Mature)'}\n\n` +
      `ML Sheet: MACHINE LEARNING tab`;
    
    SpreadsheetApp.getUi().alert('ML Statistics', message, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (e) {
    Logger.log('Error showing ML stats: ' + e.message);
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// ═══════════════════════════════════════════════════════════════════
// BACKWARD COMPATIBILITY FUNCTIONS (Keep existing structure)
// ═══════════════════════════════════════════════════════════════════

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
      entries.sort(function(a, b) { return (a[1].ts || 0) - (b[1].ts || 0); });
      const remove = entries.length - MMNAV_LEARN_MAX;
      for (let i = 0; i < remove; i++) delete mapObj[entries[i][0]];
    }
    MMNAV_OPT.scriptProps.setProperty(key, JSON.stringify(mapObj));
  } catch (e) {
    Logger.log('Save learn map error: ' + e.message);
  }
}

function _mm_partialMatchCategory_(normalizedDesc, learnMap) {
  if (!normalizedDesc || !learnMap) return '';
  
  const words = normalizedDesc.split(/\s+/);
  if (words.length < 2) return '';
  
  const merchantWords = words.slice(0, 3);
  let bestMatch = '';
  let bestScore = 0;
  
  const keys = Object.keys(learnMap);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const entry = learnMap[key];
    let score = 0;
    
    for (let j = 0; j < merchantWords.length; j++) {
      if (key.indexOf(merchantWords[j]) !== -1) {
        score += 1;
      }
    }
    
    if (entry.count) score += Math.min(entry.count * 0.1, 2);
    
    if (score > bestScore && score >= 2) {
      bestScore = score;
      bestMatch = entry.cat;
    }
  }
  
  return bestMatch;
}

function getLearningStatistics() {
  // Combine local and global stats
  const localStats = {
    personalIncome: Object.keys(_mm_getLearnMap_(MMNAV_LEARN_KEY_PERSONAL_INCOME)).length,
    personalExpense: Object.keys(_mm_getLearnMap_(MMNAV_LEARN_KEY_PERSONAL_EXPENSE)).length,
    business: Object.keys(_mm_getLearnMap_(MMNAV_LEARN_KEY_BUSINESS)).length
  };
  
  localStats.total = localStats.personalIncome + localStats.personalExpense + localStats.business;
  
  // Add global stats
  const globalStats = getGlobalMLStats();
  
  return {
    local: localStats,
    global: globalStats,
    combined: {
      total: localStats.total + (globalStats ? globalStats.totalRecords : 0)
    }
  };
}

function bulkApplyCategoryPrompt() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Bulk Apply Category',
    'Enter the category to apply to selected rows:',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() !== ui.Button.OK) return;
  
  const category = response.getResponseText().trim();
  if (!category) {
    ui.alert('Error', 'Please enter a category.', ui.ButtonSet.OK);
    return;
  }
  
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const range = sheet.getActiveRange();
    const startRow = range.getRow();
    const numRows = range.getNumRows();
    
    if (startRow < 11) {
      ui.alert('Error', 'Please select transaction rows (row 11 or below).', ui.ButtonSet.OK);
      return;
    }
    
    for (let i = 0; i < numRows; i++) {
      sheet.getRange(startRow + i, MMNAV_COLS.PERSONAL).setValue(category);
      
      const desc = sheet.getRange(startRow + i, MMNAV_COLS.DESCRIPTION).getDisplayValue();
      const amount = _mm_parseMoney_(null, sheet.getRange(startRow + i, MMNAV_COLS.AMOUNT).getDisplayValue());
      
      // Learn from this categorization (both local and global)
      _mm_learnFromRow_(sheet, startRow + i, category, false, amount > 0);
    }
    
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Applied "' + category + '" to ' + numRows + ' row(s)',
      'Complete',
      5
    );
  } catch (e) {
    ui.alert('Error', e.message, ui.ButtonSet.OK);
  }
}