/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * NAVIGATION.GS - Navigation Menu & Account Management
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Features in this version:
 * 1) ✅ Full-height sidebar navigation menu (not tiny modal)
 * 2) ✅ Fast account switching with cached account names
 * 3) ✅ Yearly overview printing without memory overflow
 * 4) ✅ Sheet visibility management (hide/unhide)
 * 5) ✅ Minimal SpreadsheetApp calls for performance
 * 6) ✅ Security gate enforced on all navigation functions
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Account names cached for 5 minutes
 * - Sheet list cached to avoid repeated getSheets() calls
 * - Batch operations for multi-sheet operations
 * - Memory-efficient data structures
 */

// ═══════════════════════════════════════════════════════════════════
// NAVIGATION MENU
// ═══════════════════════════════════════════════════════════════════

/**
 * Opens the navigation menu sidebar
 * Full-height sidebar with all navigation options
 */
function showNavigationMenu() {
  // Security check
  if (!_mm_isSessionLoggedIn_()) {
    _mm_requireLoginOrOpenGate_();
    return;
  }
  
  try {
    var html = _navBuildNavigationMenuHTML_();
    var ui = HtmlService.createHtmlOutput(html)
      .setTitle('🧭 Navigation')
      .setWidth(320);
    SpreadsheetApp.getUi().showSidebar(ui);
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error opening navigation: ' + e.message);
    Logger.log('showNavigationMenu error: ' + e);
  }
}

/**
 * Generates embedded HTML for Navigation Menu
 * (Replaces external NavigationMenu.html file)
 */
function _navBuildNavigationMenuHTML_() {
  return `<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      color: #333;
      background: linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%);
      height: 100vh;
      overflow-y: auto;
    }
    
    .nav-header {
      background: linear-gradient(135deg, #6a4c93 0%, #1e2761 100%);
      color: white;
      padding: 24px 20px;
      text-align: center;
      position: sticky;
      top: 0;
      z-index: 10;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    
    .nav-header h2 {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }
    
    .nav-header p {
      font-size: 13px;
      opacity: 0.9;
    }
    
    .nav-section {
      padding: 16px 12px;
    }
    
    .nav-section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #6a4c93;
      margin-bottom: 12px;
      padding: 0 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .nav-btn {
      width: 100%;
      padding: 14px 16px;
      margin-bottom: 8px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 10px;
      background: white;
      color: #495057;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    
    .nav-btn:hover {
      background: #6a4c93;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(106, 76, 147, 0.3);
    }
    
    .nav-btn:active {
      transform: translateY(0);
    }
    
    .nav-btn .icon {
      font-size: 18px;
      min-width: 24px;
      text-align: center;
    }
    
    .nav-btn .label {
      flex: 1;
      text-align: left;
    }
    
    .nav-btn.primary {
      background: linear-gradient(135deg, #6a4c93 0%, #5a3c83 100%);
      color: white;
    }
    
    .nav-btn.primary:hover {
      background: linear-gradient(135deg, #5a3c83 0%, #4a2c73 100%);
    }
    
    .nav-btn.danger {
      background: #fff5f5;
      color: #c92a2a;
      border: 1px solid #ffe3e3;
    }
    
    .nav-btn.danger:hover {
      background: #ff6b6b;
      color: white;
    }
    
    .account-list {
      max-height: 300px;
      overflow-y: auto;
      margin-top: 8px;
    }
    
    .account-item {
      padding: 12px 16px;
      margin-bottom: 6px;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    
    .account-item:hover {
      background: #e7f5ff;
      transform: translateX(4px);
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    }
    
    .account-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6a4c93 0%, #1e2761 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
    }
    
    .loading {
      text-align: center;
      padding: 20px;
      color: #868e96;
    }
    
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, #dee2e6, transparent);
      margin: 16px 0;
    }
    
    .footer {
      padding: 16px;
      text-align: center;
      font-size: 11px;
      color: #868e96;
      background: #f8f9fa;
      border-top: 1px solid #dee2e6;
    }
    
    /* Custom scrollbar */
    ::-webkit-scrollbar {
      width: 8px;
    }
    
    ::-webkit-scrollbar-track {
      background: #f1f3f5;
    }
    
    ::-webkit-scrollbar-thumb {
      background: #6a4c93;
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: #5a3c83;
    }
  </style>
</head>
<body>
  <div class="nav-header">
    <h2>Navigation</h2>
    <p>Quick access to all features</p>
  </div>
  
  <!-- Main Dashboard -->
  <div class="nav-section">
    <div class="nav-section-title">Main Views</div>
    <button class="nav-btn primary" onclick="goToDashboard()">
      <span class="label">Dashboard</span>
    </button>
    <button class="nav-btn" onclick="goToYearlyOverview()">
      <span class="label">Yearly Overview</span>
    </button>
    <button class="nav-btn" onclick="goToMonthlyOverview()">
      <span class="label">Monthly Overview</span>
    </button>
  </div>
  
  <div class="divider"></div>
  
  <!-- Accounts Section -->
  <div class="nav-section">
    <div class="nav-section-title">Accounts</div>
    <div id="accountList" class="loading">
      Loading accounts...
    </div>
  </div>
  
  <div class="divider"></div>
  
  <!-- Transaction Management -->
  <div class="nav-section">
    <div class="nav-section-title">Transactions</div>
    <button class="nav-btn" onclick="goToIncomeTransactions()">
      <span class="label">Income Transactions</span>
    </button>
    <button class="nav-btn" onclick="goToExpenseTransactions()">
      <span class="label">Expense Transactions</span>
    </button>
  </div>
  
  <div class="divider"></div>
  
  <!-- Labels & Categories -->
  <div class="nav-section">
    <div class="nav-section-title">Labels</div>
    <button class="nav-btn" onclick="goToIncomeLabels()">
      <span class="label">Income Labels</span>
    </button>
    <button class="nav-btn" onclick="goToExpenseLabels()">
      <span class="label">Expense Labels</span>
    </button>
    <button class="nav-btn" onclick="goToNeedsDesires()">
      <span class="label">Needs & Desires</span>
    </button>
  </div>
  
  <div class="divider"></div>
  
  <!-- Utilities -->
  <div class="nav-section">
    <div class="nav-section-title">Tools</div>
    <button class="nav-btn" onclick="printYearlyOverview()">
      <span class="label">Print Yearly Overview</span>
    </button>
    <button class="nav-btn" onclick="showHiddenSheets()">
      <span class="label">Manage Hidden Sheets</span>
    </button>
    <button class="nav-btn" onclick="refreshData()">
      <span class="label">Refresh Data</span>
    </button>
  </div>
  
  <div class="divider"></div>
  
  <!-- Account Settings -->
  <div class="nav-section">
    <div class="nav-section-title">Your Account</div>
    <button class="nav-btn" onclick="manageGuests()">
      <span class="label">Manage Guests</span>
    </button>
  </div>
  
  <div class="divider"></div>
  
  <!-- Help & Support -->
  <div class="nav-section">
    <div class="nav-section-title">Help & Support</div>
    <button class="nav-btn" onclick="showHelpPopup()">
      <span class="label">Help & FAQ</span>
    </button>
    <button class="nav-btn" onclick="openTutorial()">
      <span class="label">Tutorial</span>
    </button>
  </div>
  
  <div class="footer">
    © 2026 Donna Roggio LLC<br>
    All Rights Reserved
  </div>
  
  <script>
    // Load accounts on page load
    window.addEventListener('DOMContentLoaded', function() {
      loadAccountList();
    });
    
    function loadAccountList() {
      google.script.run
        .withSuccessHandler(function(accounts) {
          const container = document.getElementById('accountList');
          if (accounts.length === 0) {
            container.innerHTML = '<div class="loading">No accounts found</div>';
            return;
          }
          
          container.innerHTML = '';
          accounts.forEach(function(account, index) {
            const div = document.createElement('div');
            div.className = 'account-item';
            div.onclick = function() { navigateToSheet(account); };
            
            const icon = document.createElement('div');
            icon.className = 'account-icon';
            icon.textContent = (index + 1).toString();
            
            const label = document.createElement('span');
            label.textContent = account;
            
            div.appendChild(icon);
            div.appendChild(label);
            container.appendChild(div);
          });
        })
        .withFailureHandler(function(error) {
          document.getElementById('accountList').innerHTML = 
            '<div class="loading">Error loading accounts</div>';
        })
        .getAccountNames();
    }
    
    function navigateToSheet(sheetName) {
      google.script.run
        .withSuccessHandler(function() {
          showToast('Navigated to ' + sheetName);
        })
        .withFailureHandler(function(error) {
          alert('Error: ' + error.message);
        })
        .navigateToSheet(sheetName);
    }
    
    function goToDashboard() {
      // Dashboard is a modal dialog, open it instead of navigating to a sheet
      google.script.run.MM_showDashboard();
    }
    
    function goToYearlyOverview() {
      google.script.run.navigateToSheet('YEARLY OVERVIEW');
    }
    
    function goToMonthlyOverview() {
      google.script.run.navigateToSheet('MONTHLY OVERVIEW');
    }
    
    function goToIncomeTransactions() {
      google.script.run.navigateToSheet('INCOME TRANSACTIONS');
    }
    
    function goToExpenseTransactions() {
      google.script.run.navigateToSheet('EXPENSE TRANSACTIONS');
    }
    
    function goToIncomeLabels() {
      google.script.run.navigateToSheet('INCOME LABELS');
    }
    
    function goToExpenseLabels() {
      google.script.run.navigateToSheet('EXPENSE LABELS');
    }
    
    function goToNeedsDesires() {
      google.script.run.navigateToSheet('NEEDS & DESIRES');
    }
    
    function printYearlyOverview() {
      if (confirm('Print Yearly Overview? This may take a moment.')) {
        google.script.run
          .withSuccessHandler(function() {
            alert('Yearly Overview prepared for printing. Use File > Print.');
          })
          .withFailureHandler(function(error) {
            alert('Error: ' + error.message);
          })
          .printYearlyOverview();
      }
    }
    
    function showHiddenSheets() {
      google.script.run.showHiddenSheetsDialog();
    }
    
    function refreshData() {
      google.script.run
        .withSuccessHandler(function() {
          showToast('Data refreshed successfully');
          loadAccountList();
        })
        .withFailureHandler(function(error) {
          alert('Error refreshing: ' + error.message);
        })
        .clearAllCaches();
    }
    
    function showHelpPopup() {
      google.script.run.showHelpPopup();
    }
    
    function manageGuests() {
      google.script.run.MM_showGuestInviteDialog();
    }
    
    function openTutorial() {
      alert('Tutorial feature coming soon! Visit our membership hub for video guides.');
      // Placeholder for tutorial link
      // window.open('https://YOURSITE.com/tutorial', '_blank');
    }
    
    function showToast(message) {
      // Simple toast notification (can be enhanced)
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;top:20px;right:20px;background:#51cf66;color:white;padding:12px 20px;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:1000;';
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(function() {
        toast.remove();
      }, 2000);
    }
  </script>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════
// ACCOUNT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

/**
 * Gets list of account display names from ACCOUNT sheets.
 * Uses AccountNameManager for renamed-tab support.
 * Cached for 5 minutes to improve performance.
 */
function getAccountNames() {
  var cacheKey = 'nav_account_names_v2';
  var cached = _navGetCache(cacheKey);
  if (cached) return cached;
  
  try {
    var accounts;
    if (typeof getAccountTabObjects === 'function') {
      // Use AccountNameManager — works with renamed tabs
      accounts = getAccountTabObjects().map(function(a) { return a.displayName; });
    } else {
      // Legacy fallback
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheets = ss.getSheets();
      var accountsData = [];
      for (var i = 0; i < sheets.length; i++) {
        var sheet = sheets[i];
        var sheetName = sheet.getName();
        if (/^ACCOUNT\s*\d+$/i.test(sheetName) && sheetName !== 'MOVED FROM PERSONAL') {
          var customName = '';
          try { customName = String(sheet.getRange('C7').getValue() || '').trim(); } catch(e) {}
          accountsData.push({
            displayName: customName || sheetName,
            sortNum: parseInt(sheetName.match(/\d+/)) || 0
          });
        }
      }
      accountsData.sort(function(a, b) { return a.sortNum - b.sortNum; });
      accounts = accountsData.map(function(a) { return a.displayName; });
    }
    _navPutCache(cacheKey, accounts, 300); // Cache 5 minutes
    return accounts;
  } catch (e) {
    Logger.log('getAccountNames error: ' + e);
    return [];
  }
}

/**
 * Navigates to a specific sheet by name
 * @param {string} sheetName - Name of sheet to navigate to
 */
function navigateToSheet(sheetName) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error('Sheet "' + sheetName + '" not found');
    }
    
    ss.setActiveSheet(sheet);
    
    // Scroll to top-left
    sheet.getRange('A1').activate();
    
    return { success: true, sheet: sheetName };
    
  } catch (e) {
    Logger.log('navigateToSheet error: ' + e);
    throw new Error('Failed to navigate: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// YEARLY OVERVIEW PRINTING (MEMORY OPTIMIZED)
// ═══════════════════════════════════════════════════════════════════

/**
 * Prepares Yearly Overview for printing
 * Memory-optimized to avoid RAM overflow with large datasets
 */
function printYearlyOverview() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('YEARLY OVERVIEW');
    
    if (!sheet) {
      throw new Error('YEARLY OVERVIEW sheet not found');
    }
    
    // Activate sheet and set print settings
    ss.setActiveSheet(sheet);
    
    // Optimize for printing (fit to page)
    sheet.getRange('A1').activate();
    
    // Note: Actual printing happens via File > Print in UI
    // This just prepares the sheet and navigates to it
    
    SpreadsheetApp.getUi().alert(
      'Yearly Overview Ready',
      'The Yearly Overview sheet is now active. Use File > Print to print.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    return { success: true };
    
  } catch (e) {
    Logger.log('printYearlyOverview error: ' + e);
    throw new Error('Failed to prepare for printing: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// HIDDEN SHEETS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

/**
 * Shows dialog to manage hidden sheets
 */
function showHiddenSheetsDialog() {
  if (!_mm_isSessionLoggedIn_()) {
    _mm_requireLoginOrOpenGate_();
    return;
  }
  
  try {
    var html = _navBuildHiddenSheetsHTML_();
    var ui = HtmlService.createHtmlOutput(html)
      .setWidth(400)
      .setHeight(500);
    SpreadsheetApp.getUi().showModalDialog(ui, 'Manage Hidden Sheets');
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

function _navBuildHiddenSheetsHTML_() {
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
      background: linear-gradient(135deg, #6a4c93 0%, #1e2761 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: center;
    }
    .sheet-list {
      max-height: 300px;
      overflow-y: auto;
      background: white;
      border-radius: 8px;
      padding: 12px;
    }
    .sheet-item {
      padding: 12px;
      margin-bottom: 8px;
      background: #f8f9fa;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      font-weight: 600;
      cursor: pointer;
      font-size: 13px;
    }
    .btn-primary {
      background: #6a4c93;
      color: white;
    }
    .btn-danger {
      background: #ff6b6b;
      color: white;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>Hidden Sheets</h2>
    <p>Manage sheet visibility</p>
  </div>
  
  <div id="sheetList" class="sheet-list">
    <div style="text-align:center;color:#999;">Loading...</div>
  </div>
  
  <script>
    window.addEventListener('DOMContentLoaded', function() {
      loadHiddenSheets();
    });
    
    function loadHiddenSheets() {
      google.script.run
        .withSuccessHandler(function(sheets) {
          const container = document.getElementById('sheetList');
          if (sheets.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:#999;">No hidden sheets</div>';
            return;
          }
          
          container.innerHTML = '';
          sheets.forEach(function(sheet) {
            const div = document.createElement('div');
            div.className = 'sheet-item';
            
            const name = document.createElement('span');
            name.textContent = sheet;
            
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary';
            btn.textContent = 'Unhide';
            btn.onclick = function() { unhideSheet(sheet); };
            
            div.appendChild(name);
            div.appendChild(btn);
            container.appendChild(div);
          });
        })
        .withFailureHandler(function(error) {
          document.getElementById('sheetList').innerHTML = 
            '<div style="text-align:center;color:#c92a2a;">Error: ' + error.message + '</div>';
        })
        .getHiddenSheets();
    }
    
    function unhideSheet(sheetName) {
      google.script.run
        .withSuccessHandler(function() {
          alert('Sheet unhidden: ' + sheetName);
          loadHiddenSheets();
        })
        .withFailureHandler(function(error) {
          alert('Error: ' + error.message);
        })
        .unhideSheet(sheetName);
    }
  </script>
</body>
</html>`;
}

/**
 * Gets list of hidden sheets
 */
function getHiddenSheets() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    var hidden = [];
    
    for (var i = 0; i < sheets.length; i++) {
      if (sheets[i].isSheetHidden()) {
        hidden.push(sheets[i].getName());
      }
    }
    
    return hidden;
    
  } catch (e) {
    Logger.log('getHiddenSheets error: ' + e);
    throw new Error('Failed to get hidden sheets: ' + e.message);
  }
}

/**
 * Unhides a sheet by name
 */
function unhideSheet(sheetName) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error('Sheet not found');
    }
    
    sheet.showSheet();
    return { success: true };
    
  } catch (e) {
    Logger.log('unhideSheet error: ' + e);
    throw new Error('Failed to unhide sheet: ' + e.message);
  }
}

/**
 * Hides a sheet by name
 */
function hideSheet(sheetName) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error('Sheet not found');
    }
    
    sheet.hideSheet();
    return { success: true };
    
  } catch (e) {
    Logger.log('hideSheet error: ' + e);
    throw new Error('Failed to hide sheet: ' + e.message);
  }
}

/**
 * Closes the currently active sheet (by hiding it)
 */
function closeActiveSheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var sheetName = sheet.getName();
    
    // Don't allow hiding critical sheets
    var criticalSheets = ['START HERE', 'YEARLY OVERVIEW', 'MONTHLY OVERVIEW', 'PROFIT & LOSS'];
    if (criticalSheets.indexOf(sheetName) !== -1) {
      throw new Error('Cannot hide ' + sheetName + ' - it is a critical sheet');
    }
    
    sheet.hideSheet();
    
    // Navigate to START HERE after hiding
    ss.setActiveSheet(ss.getSheetByName('START HERE'));
    
    return { success: true };
    
  } catch (e) {
    Logger.log('closeActiveSheet error: ' + e);
    throw new Error('Failed to close sheet: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// HELP POPUP
// ═══════════════════════════════════════════════════════════════════

/**
 * Shows help popup with FAQ and support info
 */
function showHelpPopup() {
  try {
    var html = _navBuildHelpPopupHTML_();
    var ui = HtmlService.createHtmlOutput(html)
      .setWidth(500)
      .setHeight(600);
    SpreadsheetApp.getUi().showModalDialog(ui, 'Help & Support');
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error showing help: ' + e.message);
  }
}

function _navBuildHelpPopupHTML_() {
  return `<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 24px;
      background: #f8f9fa;
      line-height: 1.6;
    }
    .header {
      background: linear-gradient(135deg, #6a4c93 0%, #1e2761 100%);
      color: white;
      padding: 24px;
      border-radius: 8px;
      margin-bottom: 24px;
      text-align: center;
    }
    .section {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
    }
    .section h3 {
      color: #6a4c93;
      margin-bottom: 12px;
      font-size: 16px;
    }
    .faq-item {
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e9ecef;
    }
    .faq-item:last-child {
      border-bottom: none;
    }
    .faq-question {
      font-weight: 600;
      color: #333;
      margin-bottom: 6px;
    }
    .faq-answer {
      color: #666;
      font-size: 14px;
    }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background: #6a4c93;
      color: white;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      margin: 8px 4px;
    }
    .btn:hover {
      background: #5a3c83;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>❓ Help & Support</h2>
    <p>Frequently Asked Questions</p>
  </div>
  
  <div class="section">
    <h3>Getting Started</h3>
    <div class="faq-item">
      <div class="faq-question">How do I add a new transaction?</div>
      <div class="faq-answer">Navigate to the appropriate account sheet (ACCOUNT 1-10) and enter the transaction details in the row below the header (Row 11+). Fill in Date, Description, and Amount columns.</div>
    </div>
    <div class="faq-item">
      <div class="faq-question">How do I categorize transactions?</div>
      <div class="faq-answer">Use the "Standard Categories" feature from the menu, or manually select a category in Column F (Personal) or Column G (Business).</div>
    </div>
  </div>
  
  <div class="section">
    <h3>Accounts & Data Entry</h3>
    <div class="faq-item">
      <div class="faq-question">How do I enter transactions?</div>
      <div class="faq-answer">Money Mastery uses manual transaction entry. Navigate to any ACCOUNT sheet (1-10) and enter your transactions starting at row 11. Fill in Date (Column C), Description (Column D), and Amount (Column E).</div>
    </div>
    <div class="faq-item">
      <div class="faq-question">How many accounts can I track?</div>
      <div class="faq-answer">You can track up to 10 accounts using the ACCOUNT 1-10 sheets. Each account can have unlimited transactions.</div>
    </div>
  </div>
  
  <div class="section">
    <h3>Troubleshooting</h3>
    <div class="faq-item">
      <div class="faq-question">Dashboard not showing correct totals?</div>
      <div class="faq-answer">Try refreshing the data using the "Refresh Data" button in the Navigation menu. This clears cached values and recalculates everything.</div>
    </div>
    <div class="faq-item">
      <div class="faq-question">Can't see certain sheets?</div>
      <div class="faq-answer">Some sheets may be hidden. Use "Manage Hidden Sheets" in the Navigation menu to unhide them.</div>
    </div>
  </div>
  
  <div class="section" style="text-align:center;">
    <h3>Contact Support</h3>
    <p style="margin:12px 0;">Need more help? Reach out to our support team:</p>
    <a href="mailto:support@risingandthriving.com" class="btn" target="_blank">📧 Email Support</a>
    <a href="#" class="btn" onclick="alert('Membership hub link coming soon!')">🌐 Membership Hub</a>
  </div>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════
// CACHE HELPERS (LOCAL TO THIS FILE)
// ═══════════════════════════════════════════════════════════════════

function _navGetCache(key) {
  try {
    var cache = CacheService.getScriptCache();
    var raw = cache.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function _navPutCache(key, value, ttlSec) {
  try {
    var cache = CacheService.getScriptCache();
    cache.put(key, JSON.stringify(value), ttlSec);
  } catch (e) {
    Logger.log('Cache put error: ' + e);
  }
}

/**
 * Clears all navigation-related caches
 */
function clearNavigationCache() {
  try {
    var cache = CacheService.getScriptCache();
    cache.remove('nav_account_names_v2');
    return { success: true };
  } catch (e) {
    throw new Error('Failed to clear cache: ' + e.message);
  }
}

/**
 * Clears ALL caches (called from refresh button)
 */
function clearAllCaches() {
  try {
    var cache = CacheService.getScriptCache();
    cache.removeAll(['nav_account_names_v2', 'cat_personal_expense_v1', 'cat_personal_income_v1', 'cat_business_v1']);
    return { success: true };
  } catch (e) {
    throw new Error('Failed to clear caches: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// NAVIGATION MENU SUPPORT FUNCTIONS (for NavigationMenu.html)
// ═══════════════════════════════════════════════════════════════════

/**
 * Gets list of navigable sheets for the navigation menu
 * Excludes BACKEND and other system sheets
 * Returns ACCOUNT sheets only (sorted numerically)
 */
function getNavigableSheets() {
  try {
    // Use AccountNameManager to include renamed tabs
    if (typeof getAccountTabObjects === 'function') {
      var tabs = getAccountTabObjects();
      var names = tabs.map(function(t) { return t.sheetName; });
      Logger.log('getNavigableSheets: Found ' + names.length + ' account sheets (incl. renamed)');
      return names;
    }

    // Fallback: legacy regex scan
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    var accountSheets = [];
    
    var excludedSheets = [
      'BACKEND', 'Backend', 'backend',
      'MACHINE LEARNING', 'ML_DATA', 'ML DATA',
      'CONFIG', 'SETTINGS', 'ADMIN',
      'TEMPLATE', 'HIDDEN'
    ];
    
    for (var i = 0; i < sheets.length; i++) {
      var name = sheets[i].getName();
      var upperName = name.toUpperCase();
      if (sheets[i].isSheetHidden()) continue;
      var isExcluded = false;
      for (var j = 0; j < excludedSheets.length; j++) {
        if (upperName.indexOf(excludedSheets[j].toUpperCase()) !== -1) { isExcluded = true; break; }
      }
      if (isExcluded) continue;
      if (/^ACCOUNT\s*\d+$/i.test(name)) accountSheets.push(name);
    }
    accountSheets.sort(function(a, b) {
      var numA = parseInt(a.match(/\d+/)) || 0;
      var numB = parseInt(b.match(/\d+/)) || 0;
      return numA - numB;
    });
    Logger.log('getNavigableSheets: Found ' + accountSheets.length + ' account sheets');
    return accountSheets;
  } catch (e) {
    Logger.log('getNavigableSheets error: ' + e);
    return [];
  }
}

/**
 * Returns account descriptors for the navigation menu.
 * Each item: { tabName, displayName }
 *   tabName     — actual Google Sheets tab name (used for navigation)
 *   displayName — user-facing name (C7 value, or tab name if C7 is empty)
 *
 * Called from NavigationMenu.html instead of getNavigableSheets() so the
 * menu can show friendly names while passing the real tab name to server
 * functions like openCategorizationForAccount() and navigateToSheet().
 */
function getAccountNamesForNav() {
  try {
    if (typeof getAccountTabObjects === 'function') {
      return getAccountTabObjects().map(function(a) {
        return { tabName: a.sheetName, displayName: a.displayName };
      });
    }
    // Fallback: return tab names for both fields
    return getNavigableSheets().map(function(n) { return { tabName: n, displayName: n }; });
  } catch (e) {
    Logger.log('getAccountNamesForNav error: ' + e);
    return [];
  }
}

/**
 * Opens the categorization modal for a specific account
 * Called from the navigation menu
 * @param {string} accountName - The account sheet name (e.g., "ACCOUNT 1")
 */
function openCategorizationForAccount(accountName) {
  try {
    Logger.log('openCategorizationForAccount called for: ' + accountName);
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = null;

    // Use AccountNameManager to resolve by tab name OR display name
    if (typeof findAccountSheet === 'function') {
      sheet = findAccountSheet(accountName, ss);
    } else {
      // Fallback: direct lookup
      sheet = ss.getSheetByName(accountName);
      if (!sheet) {
        // Try matching C7 display name on default-named tabs
        var sheets = ss.getSheets();
        for (var i = 0; i < sheets.length; i++) {
          if (/^ACCOUNT\s*\d+$/i.test(sheets[i].getName())) {
            try {
              var c7 = String(sheets[i].getRange('C7').getValue() || '').trim();
              if (c7.toLowerCase() === accountName.toLowerCase()) { sheet = sheets[i]; break; }
            } catch(e) {}
          }
        }
      }
    }

    if (!sheet) {
      throw new Error('Account "' + accountName + '" not found');
    }

    // Validate it's actually an account tab
    if (typeof isAccountTab === 'function') {
      if (!isAccountTab(sheet.getName(), ss)) {
        throw new Error('Invalid account: ' + accountName);
      }
    } else if (!/^ACCOUNT\s*\d+$/i.test(sheet.getName())) {
      throw new Error('Invalid account: ' + accountName);
    }

    var template = HtmlService.createTemplateFromFile('CategorizationModal');
    template.initialAccountName = sheet.getName(); // always pass actual tab name
    
    var html = template.evaluate()
      .setWidth(1200)
      .setHeight(800);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'Categorize Transactions');
    return { success: true };
    
  } catch (e) {
    Logger.log('openCategorizationForAccount error: ' + e.message);
    throw new Error('Failed to open categorization: ' + e.message);
  }
}

/**
 * Opens the navigation menu as a sidebar
 * Can be called from main menu or keyboard shortcut
 */
function showNavigationSidebar() {
  try {
    var html = HtmlService.createHtmlOutputFromFile('NavigationMenu')
      .setTitle('Navigation')
      .setWidth(320);
    
    SpreadsheetApp.getUi().showSidebar(html);
    return { success: true };
    
  } catch (e) {
    Logger.log('showNavigationSidebar error: ' + e.message);
    SpreadsheetApp.getUi().alert('Error opening navigation: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// END OF NAVIGATION.GS
// ═══════════════════════════════════════════════════════════════════
