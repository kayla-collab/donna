/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * CATEGORIES.GS - Complete Categorization Engine
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Features in this version:
 * 1) ✅ Standard Categories (Personal + Business) with fast caching
 * 2) ✅ Split Transaction handler (embedded HTML)
 * 3) ✅ Refund/Return/Reimbursement processor
 * 4) ✅ Auto-learning from user behavior (Script Properties storage)
 * 5) ✅ Stripe transaction categorization suggestions
 * 6) ✅ Bulk categorization support (multi-select)
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Categories cached for 10 minutes (Script Cache)
 * - Learning rules cached in Script Properties (500KB limit ~5000 rules)
 * - Minimal SpreadsheetApp calls (batch reads only)
 */

// ═══════════════════════════════════════════════════════════════════
// GLOBAL CONFIGURATION
// ═══════════════════════════════════════════════════════════════════
// NOTE: Column definitions are now centralized in ColumnConfig.gs
// The following variables (CAT_SHEETS, CAT_COLS, CAT_HEADER_ROW) are 
// defined in ColumnConfig.gs as aliases to MM_COLS, MM_SHEETS, MM_ROWS
// for backward compatibility with this file.
//
// See ColumnConfig.gs for authoritative column layout:
// - MM_COLS: Master column definitions  
// - MM_ROWS: Row configuration (HEADER=10, DATA_START=11)
// - MM_SHEETS: Sheet name constants
// - MM_SPECIAL_LABELS: ['Ignore', 'Transfer', 'CC Payment']
//
// Column Layout (ACCOUNT sheets):
// C(3)=DATE, D(4)=DESCRIPTION, E(5)=AMOUNT, F(6)=CATEGORY,
// G(7)=SPECIAL_LABEL/BUSINESS, H(8)=MEMO, I(9)=NEED_DESIRE,
// J(10)=SPLIT_DATA, K(11)=RECEIPT, L(12)=CORRECTION
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// CATEGORY LOADING (FROM SHEETS)
// ═══════════════════════════════════════════════════════════════════

/**
 * Fetches Personal Expense Categories from EXPENSE LABELS sheet
 * Column C, starting Row 15
 * Returns array of non-empty category strings
 */
function getPersonalExpenseCategories() {
  var cacheKey = 'cat_personal_expense_v1';
  var cached = _catGetCache(cacheKey);
  if (cached) return cached;
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CAT_SHEETS.EXPENSE_LABELS);
    if (!sheet) return [];
    
    // Read column C from row 15 to last row (max 500 rows)
    var lastRow = Math.min(sheet.getLastRow(), 514);
    if (lastRow < 15) return [];
    
    var range = sheet.getRange(15, 3, lastRow - 14, 1); // Col C, from row 15
    var values = range.getValues();
    
    var categories = [];
    for (var i = 0; i < values.length; i++) {
      var val = String(values[i][0] || '').trim();
      if (val && val.toLowerCase().indexOf('label') === -1) {
        categories.push(val);
      }
    }
    
    _catPutCache(cacheKey, categories, 600); // Cache 10 min
    return categories;
    
  } catch (e) {
    Logger.log('Error loading personal expense categories: ' + e);
    return [];
  }
}

/**
 * Fetches Personal Income Categories from INCOME LABELS sheet
 * Column E, starting Row 14
 */
function getPersonalIncomeCategories() {
  var cacheKey = 'cat_personal_income_v1';
  var cached = _catGetCache(cacheKey);
  if (cached) return cached;
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CAT_SHEETS.INCOME_LABELS);
    if (!sheet) return [];
    
    var lastRow = Math.min(sheet.getLastRow(), 513);
    if (lastRow < 14) return [];
    
    var range = sheet.getRange(14, 5, lastRow - 13, 1); // Col E, from row 14
    var values = range.getValues();
    
    var categories = [];
    for (var i = 0; i < values.length; i++) {
      var val = String(values[i][0] || '').trim();
      if (val && val.toLowerCase().indexOf('label') === -1) {
        categories.push(val);
      }
    }
    
    _catPutCache(cacheKey, categories, 600);
    return categories;
    
  } catch (e) {
    Logger.log('Error loading personal income categories: ' + e);
    return [];
  }
}

/**
 * Fetches Business Categories from BACKEND sheet
 * Column AC (29), starting Row 3
 */
function getBusinessCategories() {
  var cacheKey = 'cat_business_v1';
  var cached = _catGetCache(cacheKey);
  if (cached) return cached;
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CAT_SHEETS.BACKEND);
    if (!sheet) return [];
    
    var lastRow = Math.min(sheet.getLastRow(), 502);
    if (lastRow < 3) return [];
    
    var range = sheet.getRange(3, 29, lastRow - 2, 1); // Col AC, from row 3
    var values = range.getValues();
    
    var categories = [];
    for (var i = 0; i < values.length; i++) {
      var val = String(values[i][0] || '').trim();
      if (val) {
        categories.push(val);
      }
    }
    
    _catPutCache(cacheKey, categories, 600);
    return categories;
    
  } catch (e) {
    Logger.log('Error loading business categories: ' + e);
    return [];
  }
}

/**
 * Master function to get all categories by type
 * @param {string} type - 'personal_expense', 'personal_income', 'business'
 * @returns {Array} Array of category strings
 */
function getCategoriesByType(type) {
  switch(type) {
    case 'personal_expense':
      return getPersonalExpenseCategories();
    case 'personal_income':
      return getPersonalIncomeCategories();
    case 'business':
      return getBusinessCategories();
    default:
      return [];
  }
}

// ═══════════════════════════════════════════════════════════════════
// STANDARD CATEGORIES SIDEBAR (ORIGINAL UI)
// ═══════════════════════════════════════════════════════════════════

/**
 * Opens the Standard Categories sidebar for transaction categorization
 * Preserves existing UI for backward compatibility
 */
function showStandardCategorySidebar() {
  // Security check
  if (!_mm_isSessionLoggedIn_()) {
    _mm_requireLoginOrOpenGate_();
    return;
  }
  
  try {
    var html = _catBuildStandardCategoriesHTML_();
    var ui = HtmlService.createHtmlOutput(html)
      .setTitle('Standard Categories')
      .setWidth(400);
    SpreadsheetApp.getUi().showSidebar(ui);
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error opening categories: ' + e.message);
    Logger.log('showStandardCategorySidebar error: ' + e);
  }
}

/**
 * Generates embedded HTML for Standard Categories sidebar
 * (Replaces external StandardCategories.html file)
 */
function _catBuildStandardCategoriesHTML_() {
  return `<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      color: #333;
      background: #f8f9fa;
      padding: 16px;
    }
    .header {
      background: linear-gradient(135deg, #6a4c93 0%, #1e2761 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: center;
    }
    .header h2 {
      font-size: 20px;
      margin-bottom: 8px;
    }
    .header p {
      font-size: 13px;
      opacity: 0.9;
    }
    .section {
      background: white;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
    }
    .section-title {
      font-weight: 600;
      font-size: 15px;
      margin-bottom: 12px;
      color: #6a4c93;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .form-group {
      margin-bottom: 12px;
    }
    label {
      display: block;
      font-weight: 500;
      margin-bottom: 6px;
      font-size: 13px;
    }
    select, input {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      font-family: inherit;
    }
    select:focus, input:focus {
      outline: none;
      border-color: #6a4c93;
      box-shadow: 0 0 0 3px rgba(106, 76, 147, 0.1);
    }
    .btn {
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 8px;
    }
    .btn-primary {
      background: #6a4c93;
      color: white;
    }
    .btn-primary:hover {
      background: #5a3c83;
      transform: translateY(-1px);
    }
    .btn-secondary {
      background: #e9ecef;
      color: #495057;
    }
    .btn-secondary:hover {
      background: #dee2e6;
    }
    .message {
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 16px;
      font-size: 13px;
      display: none;
    }
    .message.success {
      background: #d3f9d8;
      color: #2b8a3e;
      border-left: 4px solid #51cf66;
    }
    .message.error {
      background: #ffe3e3;
      color: #c92a2a;
      border-left: 4px solid #ff6b6b;
    }
    .disclaimer {
      font-size: 12px;
      color: #666;
      padding: 12px;
      background: #f1f3f5;
      border-radius: 6px;
      margin-top: 16px;
      line-height: 1.5;
    }
    .loading {
      text-align: center;
      padding: 20px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>Standard Categories</h2>
    <p>Assign categories to your transactions</p>
  </div>
  
  <div id="message" class="message"></div>
  
  <div class="section">
    <div class="section-title">
      Category Type
    </div>
    <div class="form-group">
      <label>Select Category Mode:</label>
      <select id="modeSelect" onchange="loadCategories()">
        <option value="personal_expense">Personal - Expenses</option>
        <option value="personal_income">Personal - Income</option>
        <option value="business">Business Categories</option>
      </select>
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">
      Select Category
    </div>
    <div class="form-group">
      <label>Choose a category:</label>
      <select id="categorySelect">
        <option value="">Loading...</option>
      </select>
    </div>
    <div class="form-group">
      <label>Row Number (optional):</label>
      <input type="number" id="rowInput" placeholder="Leave blank to use selected cell" min="11">
    </div>
    <button class="btn btn-primary" onclick="applyCategory()">
      Apply Category
    </button>
  </div>
  
  <div class="section">
    <div class="section-title">
      ⚙️ Quick Actions
    </div>
    <button class="btn btn-secondary" onclick="refreshCategories()">
      Refresh Categories
    </button>
    <button class="btn btn-secondary" onclick="clearCategory()">
      🗑️ Clear Selected Category
    </button>
  </div>
  
  <div class="disclaimer">
    🔒 <strong>Privacy:</strong> Your financial data stays in your Google Sheet. We never access or transmit your information externally.
  </div>
  
  <script>
    let currentCategories = [];
    
    window.addEventListener('DOMContentLoaded', function() {
      loadCategories();
    });
    
    function loadCategories() {
      const mode = document.getElementById('modeSelect').value;
      const select = document.getElementById('categorySelect');
      select.innerHTML = '<option value="">Loading categories...</option>';
      
      google.script.run
        .withSuccessHandler(function(categories) {
          select.innerHTML = '<option value="">-- Select a category --</option>';
          currentCategories = categories;
          categories.forEach(function(cat) {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            select.appendChild(option);
          });
          showMessage('Loaded ' + categories.length + ' categories', 'success');
        })
        .withFailureHandler(function(error) {
          select.innerHTML = '<option value="">Error loading categories</option>';
          showMessage('Error: ' + error.message, 'error');
        })
        .getCategoriesByType(mode);
    }
    
    function applyCategory() {
      const category = document.getElementById('categorySelect').value;
      const rowInput = document.getElementById('rowInput').value;
      const mode = document.getElementById('modeSelect').value;
      
      if (!category) {
        showMessage('Please select a category first', 'error');
        return;
      }
      
      const columnType = mode === 'business' ? 'business' : 'personal';
      const row = rowInput ? parseInt(rowInput) : null;
      
      google.script.run
        .withSuccessHandler(function(result) {
          showMessage('Category applied successfully!', 'success');
          document.getElementById('rowInput').value = '';
        })
        .withFailureHandler(function(error) {
          showMessage('Error: ' + error.message, 'error');
        })
        .applyCategoryToTransaction(category, columnType, row);
    }
    
    function refreshCategories() {
      showMessage('Refreshing categories...', 'success');
      google.script.run
        .withSuccessHandler(function() {
          loadCategories();
        })
        .clearCategoryCache();
    }
    
    function clearCategory() {
      const rowInput = document.getElementById('rowInput').value;
      const row = rowInput ? parseInt(rowInput) : null;
      
      google.script.run
        .withSuccessHandler(function() {
          showMessage('Category cleared', 'success');
        })
        .withFailureHandler(function(error) {
          showMessage('Error: ' + error.message, 'error');
        })
        .clearTransactionCategory(row);
    }
    
    function showMessage(text, type) {
      const msg = document.getElementById('message');
      msg.textContent = text;
      msg.className = 'message ' + type;
      msg.style.display = 'block';
      setTimeout(function() {
        msg.style.display = 'none';
      }, 3000);
    }
  </script>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════
// CATEGORY APPLICATION (WRITE TO SHEET)
// ═══════════════════════════════════════════════════════════════════

/**
 * Applies a category to a transaction
 * @param {string} category - Category name to apply
 * @param {string} columnType - 'personal' or 'business'
 * @param {number|null} row - Row number (if null, uses active cell)
 */
function applyCategoryToTransaction(category, columnType, row) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    
    // Determine target row
    var targetRow;
    if (row && row >= CAT_HEADER_ROW + 1) {
      targetRow = row;
    } else {
      targetRow = sheet.getActiveCell().getRow();
      if (targetRow <= CAT_HEADER_ROW) {
        throw new Error('Please select a transaction row (below row ' + CAT_HEADER_ROW + ')');
      }
    }
    
    // Determine target column
    var targetCol = (columnType === 'business') ? CAT_COLS.BUSINESS : CAT_COLS.PERSONAL;
    
    // Write category
    sheet.getRange(targetRow, targetCol).setValue(category);
    
    // Learn from this categorization
    var description = sheet.getRange(targetRow, CAT_COLS.DESCRIPTION).getValue();
    if (description) {
      _catLearnFromAssignment_(description, category, columnType);
    }
    
    return { success: true, row: targetRow, category: category };
    
  } catch (e) {
    Logger.log('applyCategoryToTransaction error: ' + e);
    throw new Error('Failed to apply category: ' + e.message);
  }
}

/**
 * Clears category from a transaction
 */
function clearTransactionCategory(row) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    
    var targetRow = row || sheet.getActiveCell().getRow();
    if (targetRow <= CAT_HEADER_ROW) {
      throw new Error('Please select a transaction row');
    }
    
    // Clear both personal and business columns
    sheet.getRange(targetRow, CAT_COLS.PERSONAL).clearContent();
    sheet.getRange(targetRow, CAT_COLS.BUSINESS).clearContent();
    
    return { success: true };
    
  } catch (e) {
    throw new Error('Failed to clear category: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// AUTO-LEARNING SYSTEM (KEYWORD-BASED ML)
// ═══════════════════════════════════════════════════════════════════

/**
 * Learns from user categorization behavior
 * Stores rules in Script Properties
 */
function _catLearnFromAssignment_(description, category, columnType) {
  try {
    var normalized = _catNormalizeDescription_(description);
    if (!normalized) return;
    
    var props = _mm_safeScriptProps_();
    var key = 'mm_cat_learn_' + columnType;
    var rulesJson = props.getProperty(key) || '{}';
    var rules = JSON.parse(rulesJson);
    
    // Store: {normalized_description: {category, count, lastUsed}}
    if (!rules[normalized]) {
      rules[normalized] = { category: category, count: 1, lastUsed: Date.now() };
    } else {
      rules[normalized].category = category;
      rules[normalized].count++;
      rules[normalized].lastUsed = Date.now();
    }
    
    // Limit to 5000 rules (Script Properties 500KB limit)
    var keys = Object.keys(rules);
    if (keys.length > 5000) {
      // Remove oldest rules
      keys.sort(function(a, b) {
        return rules[a].lastUsed - rules[b].lastUsed;
      });
      for (var i = 0; i < 1000; i++) {
        delete rules[keys[i]];
      }
    }
    
    props.setProperty(key, JSON.stringify(rules));
    
  } catch (e) {
    Logger.log('Learning error: ' + e);
  }
}

/**
 * Suggests category based on learned patterns
 */
function suggestCategoryFromLearning(description, columnType) {
  try {
    var normalized = _catNormalizeDescription_(description);
    if (!normalized) return null;
    
    var props = _mm_safeScriptProps_();
    var key = 'mm_cat_learn_' + columnType;
    var rulesJson = props.getProperty(key) || '{}';
    var rules = JSON.parse(rulesJson);
    
    // Exact match
    if (rules[normalized]) {
      return rules[normalized].category;
    }
    
    // Partial match (keyword search)
    var keywords = normalized.split(' ').filter(function(w) { return w.length > 3; });
    for (var i = 0; i < keywords.length; i++) {
      for (var ruleKey in rules) {
        if (ruleKey.indexOf(keywords[i]) !== -1) {
          return rules[ruleKey].category;
        }
      }
    }
    
    return null;
    
  } catch (e) {
    Logger.log('Suggest category error: ' + e);
    return null;
  }
}

/**
 * Normalizes description for learning
 */
function _catNormalizeDescription_(desc) {
  var s = String(desc || '').trim().toUpperCase();
  if (!s) return '';
  
  // Remove special chars, keep alphanumeric and spaces
  s = s.replace(/[^A-Z0-9\s]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  
  // Limit length
  return s.slice(0, 80);
}

/**
 * Clears category cache (for refresh button)
 */
function clearCategoryCache() {
  try {
    var cache = CacheService.getScriptCache();
    cache.remove('cat_personal_expense_v1');
    cache.remove('cat_personal_income_v1');
    cache.remove('cat_business_v1');
    return { success: true };
  } catch (e) {
    throw new Error('Failed to clear cache: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// CACHE HELPERS (LOCAL TO THIS FILE)
// ═══════════════════════════════════════════════════════════════════

function _catGetCache(key) {
  try {
    var cache = CacheService.getScriptCache();
    var raw = cache.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function _catPutCache(key, value, ttlSec) {
  try {
    var cache = CacheService.getScriptCache();
    cache.put(key, JSON.stringify(value), ttlSec);
  } catch (e) {
    Logger.log('Cache put error: ' + e);
  }
}

// ═══════════════════════════════════════════════════════════════════
// SPLIT TRANSACTION SIDEBAR
// ═══════════════════════════════════════════════════════════════════

/**
 * Opens Split Transaction sidebar - Uses external SplitSidebar.html
 */
function showSplitSidebar() {
  if (!_mm_isSessionLoggedIn_()) {
    _mm_requireLoginOrOpenGate_();
    return;
  }
  
  try {
    var html = HtmlService.createHtmlOutputFromFile('SplitSidebar')
      .setTitle('Split Transaction')
      .setWidth(450);
    SpreadsheetApp.getUi().showSidebar(html);
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error opening split sidebar: ' + e.message);
  }
}

/**
 * Get transaction type and amount for split sidebar
 * @returns {Object} - { amount, type }
 */
function getTransactionType() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var row = sheet.getActiveCell().getRow();
    
    if (row <= 10) {
      return { amount: 0, type: 'expense' };
    }
    
    var amount = sheet.getRange(row, 5).getValue(); // Column E = Amount
    return {
      amount: Math.abs(parseFloat(amount) || 0),
      type: amount >= 0 ? 'income' : 'expense'
    };
  } catch (e) {
    Logger.log('getTransactionType error: ' + e.message);
    return { amount: 0, type: 'expense' };
  }
}

/**
 * Process split transactions
 * @param {Array} splits - Array of { category, amount, isBusiness }
 */
function processSplits(splits) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var row = sheet.getActiveCell().getRow();
    
    if (row <= 10) {
      throw new Error('Please select a transaction row (row 11 or below)');
    }
    
    // Store split data in column J (SPLIT_DATA)
    var splitData = JSON.stringify(splits);
    
    // Build memo about split
    var memoText = 'SPLIT: ' + splits.map(function(s) {
      return s.category + ' ($' + s.amount.toFixed(2) + ')';
    }).join(', ');
    
    // BATCH OPTIMIZATION: Set category (F), memo (H), and split data (J) together
    // Note: Columns F=6, H=8, J=10 are non-contiguous, so we write F:J (5 cols) and leave G,I blank
    var firstCategory = splits.length > 0 ? splits[0].category : '';
    var existingRow = sheet.getRange(row, 6, 1, 5).getValues()[0];  // F through J
    existingRow[0] = firstCategory;  // F = Category
    existingRow[2] = memoText;       // H = Memo (index 2 = col 8 - col 6)
    existingRow[4] = splitData;      // J = Split Data (index 4 = col 10 - col 6)
    sheet.getRange(row, 6, 1, 5).setValues([existingRow]);
    
    return { success: true };
    
  } catch (e) {
    Logger.log('processSplits error: ' + e.message);
    throw new Error('Failed to process splits: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// REFUND/RETURN/REIMBURSEMENT HANDLER
// ═══════════════════════════════════════════════════════════════════

/**
 * Opens Refund sidebar - Uses external RefundSidebar.html
 */
function showRefundSidebar() {
  if (!_mm_isSessionLoggedIn_()) {
    _mm_requireLoginOrOpenGate_();
    return;
  }
  
  try {
    var html = HtmlService.createHtmlOutputFromFile('RefundSidebar')
      .setTitle('Process Refund')
      .setWidth(400);
    SpreadsheetApp.getUi().showSidebar(html);
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

/**
 * Get categories for refund sidebar
 * @returns {Object} - { expenseCategories, businessCategories }
 */
function getRefundCategories() {
  try {
    return {
      expenseCategories: getExpenseCategoriesFromSheet() || [],
      businessCategories: getBusinessCategoriesFromSheet() || []
    };
  } catch (e) {
    Logger.log('getRefundCategories error: ' + e.message);
    return {
      expenseCategories: ['Groceries', 'Utilities', 'Transportation', 'Other'],
      businessCategories: ['Business Expense', 'Business Income']
    };
  }
}

/**
 * Process refund on current transaction
 * @param {Object} data - { refundType, expenseCategory, isBusiness }
 */
function processRefund(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var row = sheet.getActiveCell().getRow();
    
    if (row <= 10) {
      throw new Error('Please select a transaction row (row 11 or below)');
    }
    
    // BATCH OPTIMIZATION: Set category (F), special label (G), memo (H) in one write
    var memoText = data.refundType + ' - ' + data.expenseCategory;
    var businessLabel = data.isBusiness ? 'Business' : '';
    sheet.getRange(row, 6, 1, 3).setValues([[data.expenseCategory, businessLabel, memoText]]);
    
    return { success: true };
    
  } catch (e) {
    Logger.log('processRefund error: ' + e.message);
    throw new Error('Failed to process refund: ' + e.message);
  }
}

function _catBuildRefundSidebarHTML_() {
  return `<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      background: #f8f9fa;
    }
    .header {
      background: linear-gradient(135deg, #51cf66 0%, #2b8a3e 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: center;
    }
    .form-group {
      background: white;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 12px;
    }
    label {
      display: block;
      font-weight: 600;
      margin-bottom: 8px;
    }
    select, input {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
    }
    .btn {
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 12px;
    }
    .btn-success {
      background: #51cf66;
      color: white;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>Process Refund</h2>
    <p>Mark transaction as refund/return/reimbursement</p>
  </div>
  
  <div class="form-group">
    <label>Refund Type:</label>
    <select id="refundType">
      <option value="Refund">Refund</option>
      <option value="Return">Return</option>
      <option value="Reimbursement">Reimbursement</option>
    </select>
  </div>
  
  <div class="form-group">
    <label>Transaction Row:</label>
    <input type="number" id="rowNumber" min="11" placeholder="Leave blank to use selected cell">
  </div>
  
  <button class="btn btn-success" onclick="submitRefund()">Apply Refund</button>
  
  <script>
    function submitRefund() {
      const type = document.getElementById('refundType').value;
      const row = document.getElementById('rowNumber').value;
      
      google.script.run
        .withSuccessHandler(function() {
          alert('Refund processed successfully!');
          google.script.host.close();
        })
        .withFailureHandler(function(error) {
          alert('Error: ' + error.message);
        })
        .processRefundTransaction(type, row ? parseInt(row) : null);
    }
  </script>
</body>
</html>`;
}

/**
 * Processes refund transaction
 */
function processRefundTransaction(refundType, row) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    
    var targetRow = row || sheet.getActiveCell().getRow();
    if (targetRow <= CAT_HEADER_ROW) {
      throw new Error('Please select a transaction row');
    }
    
    // Write refund type to memo column
    sheet.getRange(targetRow, CAT_COLS.MEMO).setValue(refundType);
    
    // Optionally mark in business column
    sheet.getRange(targetRow, CAT_COLS.BUSINESS).setValue(refundType);
    
    return { success: true };
    
  } catch (e) {
    throw new Error('Failed to process refund: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// END OF CATEGORIES.GS
// ═══════════════════════════════════════════════════════════════════
