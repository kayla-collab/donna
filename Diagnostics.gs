/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * DIAGNOSTICS.GS - System Diagnostic Functions
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * These functions help diagnose issues with:
 * - Dashboard data loading
 * - Sheet visibility and structure
 * - HTML file loading
 * - Configuration
 * - Column structure (ColumnConfig.gs)
 * 
 * NOTE: Plaid integration has been deprecated in 2026.
 * Bank connections now use Stripe Financial Connections.
 */

/**
 * Complete system diagnostic - Run this first!
 */
function COMPLETE_DIAGNOSTIC() {
  Logger.log('═══════════════════════════════════════');
  Logger.log('   COMPLETE SYSTEM DIAGNOSTIC (2026)');
  Logger.log('═══════════════════════════════════════');
  Logger.log('');
  
  // 1. Check all HTML files
  Logger.log('[1] HTML FILES:');
  var htmlFiles = ['TutorialEmbed', 'PinEntry', 'DashboardHTML', 'RegistrationFlow', 
                   'CategorizationModal', 'NavigationMenu', 'AiAssistant'];
  htmlFiles.forEach(function(file) {
    try {
      HtmlService.createHtmlOutputFromFile(file);
      Logger.log('  ✓ ' + file + '.html');
    } catch(e) {
      Logger.log('  ✗ ' + file + '.html - ' + e.message);
    }
  });
  Logger.log('');
  
  // 2. Check functions exist
  Logger.log('[2] CORE FUNCTIONS:');
  var funcs = ['MM_registerWithAccessKey', 'MM_showWelcomeTutorial', 'proceedToSheetAccess', 
               'MM_showDashboard', 'MM_apiGetDashboardData', 'showCategorizationModal',
               'getCategorizationModalDataV2', 'saveCategorizationChangesV2'];
  funcs.forEach(function(fname) {
    try {
      var exists = (typeof eval(fname) === 'function');
      Logger.log('  ' + (exists ? '✓' : '✗') + ' ' + fname);
    } catch(e) {
      Logger.log('  ✗ ' + fname + ' - ' + e.message);
    }
  });
  Logger.log('');
  
  // 3. Check Column Configuration
  Logger.log('[3] COLUMN CONFIGURATION (ColumnConfig.gs):');
  try {
    if (typeof MM_COLS !== 'undefined') {
      Logger.log('  ✓ MM_COLS exists');
      Logger.log('    DATE=' + MM_COLS.DATE + ' (C)');
      Logger.log('    DESCRIPTION=' + MM_COLS.DESCRIPTION + ' (D)');
      Logger.log('    AMOUNT=' + MM_COLS.AMOUNT + ' (E)');
      Logger.log('    CATEGORY=' + MM_COLS.CATEGORY + ' (F)');
      Logger.log('    SPECIAL_LABEL=' + MM_COLS.SPECIAL_LABEL + ' (G)');
      Logger.log('    MEMO=' + MM_COLS.MEMO + ' (H)');
      Logger.log('    NEED_DESIRE=' + MM_COLS.NEED_DESIRE + ' (I)');
      Logger.log('    RECEIPT=' + MM_COLS.RECEIPT + ' (K)');
    } else {
      Logger.log('  ✗ MM_COLS not found - ColumnConfig.gs may not be loaded');
    }
    
    if (typeof MM_ROWS !== 'undefined') {
      Logger.log('  ✓ MM_ROWS exists');
      Logger.log('    HEADER=' + MM_ROWS.HEADER);
      Logger.log('    DATA_START=' + MM_ROWS.DATA_START);
    }
    
    if (typeof MM_SPECIAL_LABELS !== 'undefined') {
      Logger.log('  ✓ MM_SPECIAL_LABELS: ' + MM_SPECIAL_LABELS.join(', '));
    }
  } catch(e) {
    Logger.log('  ✗ Error checking column config: ' + e.message);
  }
  Logger.log('');
  
  // 4. Check sheets exist
  Logger.log('[4] SHEETS:');
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var requiredSheets = ['START HERE', 'INCOME TRANSACTIONS', 'EXPENSE TRANSACTIONS', 
                          'YEARLY OVERVIEW', 'MONTHLY OVERVIEW', 'PROFIT & LOSS', 
                          'ACCOUNT 1', 'INCOME LABELS', 'EXPENSE LABELS', 'BACKEND'];
    requiredSheets.forEach(function(name) {
      var sheet = ss.getSheetByName(name);
      Logger.log('  ' + (sheet ? '✓' : '✗') + ' ' + name + (sheet ? ' (visible: ' + (!sheet.isSheetHidden()) + ')' : ''));
    });
  } catch(e) {
    Logger.log('  ✗ Error checking sheets: ' + e.message);
  }
  Logger.log('');
  
  // 5. Test dashboard data
  Logger.log('[5] DASHBOARD DATA:');
  try {
    var data = MM_apiGetDashboardData('30days');
    Logger.log('  ✓ Data returned');
    Logger.log('  Income: $' + (data.monthlyIncome || 0));
    Logger.log('  Expenses: $' + (data.monthlyExpenses || 0));
    Logger.log('  Profit: $' + (data.monthlyProfit || 0));
    Logger.log('  Date Range: ' + (data.dateRange || 'N/A'));
    Logger.log('  Chart Data: ' + (data.chartData ? '✓ Present' : '✗ Missing'));
    Logger.log('  Top Income: ' + (data.topIncome ? data.topIncome.length + ' categories' : '✗ Missing'));
    Logger.log('  Top Expenses: ' + (data.topExpenses ? data.topExpenses.length + ' categories' : '✗ Missing'));
  } catch(e) {
    Logger.log('  ✗ Error: ' + e.message);
    Logger.log('  Stack: ' + e.stack);
  }
  Logger.log('');
  
  // 6. Check Script Properties
  Logger.log('[6] SCRIPT PROPERTIES:');
  try {
    var props = PropertiesService.getScriptProperties();
    var allProps = props.getProperties();
    var mmProps = [];
    for (var key in allProps) {
      if (key.indexOf('mm_') === 0) {
        mmProps.push(key);
      }
    }
    Logger.log('  Total mm_ properties: ' + mmProps.length);
    if (mmProps.length > 0) {
      Logger.log('  First 10: ' + mmProps.slice(0, 10).join(', '));
    }
    Logger.log('  mm_registered: ' + (allProps.mm_registered || 'NOT SET'));
    Logger.log('  mm_primary_email: ' + (allProps.mm_primary_email || 'NOT SET'));
    Logger.log('  mm_tutorial_completed: ' + (allProps.mm_tutorial_completed || 'NOT SET'));
  } catch(e) {
    Logger.log('  ✗ Error checking properties: ' + e.message);
  }
  Logger.log('');
  
  // 7. Check Stripe config
  Logger.log('[7] STRIPE CONFIGURATION:');
  try {
    if (typeof STRIPE_CONFIG !== 'undefined') {
      Logger.log('  ✓ STRIPE_CONFIG exists');
      Logger.log('    API_BASE: ' + STRIPE_CONFIG.API_BASE);
      Logger.log('    SYNC_DAYS: ' + STRIPE_CONFIG.SYNC_DAYS);
    } else {
      Logger.log('  ✗ STRIPE_CONFIG not found');
    }
  } catch(e) {
    Logger.log('  ✗ Error checking Stripe config: ' + e.message);
  }
  Logger.log('');
  
  Logger.log('═══════════════════════════════════════');
  Logger.log('   DIAGNOSTIC COMPLETE');
  Logger.log('═══════════════════════════════════════');
  Logger.log('');
  Logger.log('Copy all logs above and send to developer for analysis.');
}

/**
 * Admin-level complete diagnostic
 */
function ADMIN_RunCompleteDiagnostic() {
  COMPLETE_DIAGNOSTIC();
  SpreadsheetApp.getUi().alert(
    'Diagnostic Complete',
    'Check the execution logs for results:\n\n' +
    '1. Go to Extensions → Apps Script\n' +
    '2. Click "Executions" in left sidebar\n' +
    '3. Find ADMIN_RunCompleteDiagnostic\n' +
    '4. Click to expand and view logs',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Test dashboard data API
 */
function TEST_DashboardData() {
  try {
    Logger.log('=== TESTING DASHBOARD DATA API ===');
    Logger.log('Calling MM_apiGetDashboardData("30days")...');
    
    var startTime = new Date();
    var data = MM_apiGetDashboardData('30days');
    var elapsed = (new Date() - startTime) / 1000;
    
    Logger.log('✓ Function executed in ' + elapsed.toFixed(2) + ' seconds');
    Logger.log('');
    Logger.log('Data structure:');
    Logger.log('  Keys: ' + Object.keys(data).join(', '));
    Logger.log('');
    Logger.log('Financial data:');
    Logger.log('  Monthly Income: $' + (data.monthlyIncome || 0).toFixed(2));
    Logger.log('  Monthly Expenses: $' + (data.monthlyExpenses || 0).toFixed(2));
    Logger.log('  Monthly Profit: $' + (data.monthlyProfit || 0).toFixed(2));
    Logger.log('  Date Range: ' + (data.dateRange || 'N/A'));
    Logger.log('');
    Logger.log('Chart data:');
    Logger.log('  Labels: ' + (data.chartData && data.chartData.labels ? data.chartData.labels.length + ' months' : '✗ Missing'));
    Logger.log('');
    Logger.log('Categories:');
    Logger.log('  Top Income: ' + (data.topIncome ? data.topIncome.length + ' categories' : '✗ Missing'));
    Logger.log('  Top Expenses: ' + (data.topExpenses ? data.topExpenses.length + ' categories' : '✗ Missing'));
    
    Logger.log('');
    Logger.log('✓ Dashboard data API is working correctly!');
    return data;
    
  } catch(e) {
    Logger.log('✗ ERROR in MM_apiGetDashboardData:');
    Logger.log('  Message: ' + e.message);
    Logger.log('  Stack: ' + e.stack);
    return null;
  }
}

/**
 * Test if DashboardHTML.html loads correctly
 */
function TEST_DashboardLoad() {
  try {
    Logger.log('=== TESTING DASHBOARD HTML ===');
    Logger.log('Loading DashboardHTML.html...');
    var html = HtmlService.createHtmlOutputFromFile('DashboardHTML');
    Logger.log('✓ DashboardHTML.html loaded successfully!');
    Logger.log('Content length: ' + html.getContent().length + ' characters');
    
    Logger.log('');
    Logger.log('Attempting to show dashboard modal...');
    MM_showDashboard();
    Logger.log('✓ Dashboard modal opened!');
    
    return true;
  } catch(e) {
    Logger.log('✗ ERROR:');
    Logger.log('  Message: ' + e.message);
    return false;
  }
}

/**
 * Test categorization system
 */
function TEST_CategorizationSystem() {
  try {
    Logger.log('=== TESTING CATEGORIZATION SYSTEM ===');
    
    // Test modal data
    Logger.log('Testing getCategorizationModalDataV2...');
    var data = getCategorizationModalDataV2();
    Logger.log('  Accounts found: ' + data.accounts.length);
    Logger.log('  Income categories: ' + data.incomeCategories.length);
    Logger.log('  Expense categories: ' + data.expenseCategories.length);
    Logger.log('  Business categories: ' + data.businessCategories.length);
    
    if (data.accounts.length > 0) {
      Logger.log('');
      Logger.log('Testing getAccountTransactionsV2(' + data.accounts[0] + ')...');
      var txData = getAccountTransactionsV2(data.accounts[0]);
      Logger.log('  Transactions found: ' + txData.transactions.length);
      Logger.log('  ML Suggestions: ' + Object.keys(txData.mlSuggestions).length);
    }
    
    Logger.log('');
    Logger.log('✓ Categorization system is working!');
    return true;
    
  } catch(e) {
    Logger.log('✗ ERROR:');
    Logger.log('  Message: ' + e.message);
    Logger.log('  Stack: ' + e.stack);
    return false;
  }
}

/**
 * Quick test of all HTML files
 */
function TEST_AllHTMLFiles() {
  Logger.log('=== TESTING ALL HTML FILES ===');
  
  var htmlFiles = [
    'TutorialEmbed',
    'PinEntry',
    'DashboardHTML',
    'CategorizationModal',
    'AiAssistant',
    'NavigationMenu',
    'RegistrationFlow',
    'Reports',
    'ClarityAIModal'
  ];
  
  var passed = 0;
  var failed = 0;
  
  htmlFiles.forEach(function(file) {
    try {
      var html = HtmlService.createHtmlOutputFromFile(file);
      var length = html.getContent().length;
      Logger.log('✓ ' + file + '.html (' + length + ' chars)');
      passed++;
    } catch(e) {
      Logger.log('✗ ' + file + '.html - ERROR: ' + e.message);
      failed++;
    }
  });
  
  Logger.log('');
  Logger.log('Results: ' + passed + ' passed, ' + failed + ' failed');
  
  return {passed: passed, failed: failed};
}

/**
 * Reset registration and run complete test suite
 */
function RESET_AND_TEST() {
  try {
    Logger.log('═══════════════════════════════════════');
    Logger.log('   RESET AND TEST SUITE');
    Logger.log('═══════════════════════════════════════');
    Logger.log('');
    
    Logger.log('[1] RESETTING REGISTRATION...');
    var props = PropertiesService.getScriptProperties();
    props.deleteProperty('mm_registered');
    props.deleteProperty('mm_tutorial_completed');
    props.deleteProperty('mm_sheet_access_configured');
    props.deleteProperty('mm_is_first_login');
    Logger.log('✓ Properties cleared');
    Logger.log('');
    
    Logger.log('[2] RUNNING DIAGNOSTICS...');
    COMPLETE_DIAGNOSTIC();
    Logger.log('');
    
    Logger.log('[3] TESTING HTML FILES...');
    TEST_AllHTMLFiles();
    Logger.log('');
    
    Logger.log('[4] TESTING CATEGORIZATION...');
    TEST_CategorizationSystem();
    Logger.log('');
    
    Logger.log('═══════════════════════════════════════');
    Logger.log('   TESTS COMPLETE');
    Logger.log('═══════════════════════════════════════');
    
  } catch(e) {
    Logger.log('✗ RESET_AND_TEST error: ' + e.message);
  }
}

/**
 * Verify deployment is complete
 */
function VERIFY_DEPLOYMENT() {
  Logger.log('═══════════════════════════════════════');
  Logger.log('   2026 DEPLOYMENT VERIFICATION');
  Logger.log('═══════════════════════════════════════');
  Logger.log('');
  
  var allGood = true;
  
  // Check critical files
  Logger.log('=== FILE CHECK ===');
  
  var files = [
    {name: 'RegistrationFlow', critical: true, desc: 'Registration flow'},
    {name: 'TutorialEmbed', critical: true, desc: 'Tutorial video'},
    {name: 'PinEntry', critical: true, desc: 'PIN login'},
    {name: 'DashboardHTML', critical: true, desc: 'Dashboard'},
    {name: 'CategorizationModal', critical: true, desc: 'Categorization modal'},
    {name: 'NavigationMenu', critical: false, desc: 'Navigation menu'}
  ];
  
  files.forEach(function(file) {
    try {
      HtmlService.createTemplateFromFile(file.name);
      Logger.log('✅ ' + file.name + '.html - ' + file.desc);
    } catch(e) {
      if (file.critical) {
        Logger.log('❌ ' + file.name + '.html MISSING - ' + file.desc);
        allGood = false;
      } else {
        Logger.log('⚠️  ' + file.name + '.html - ' + file.desc + ' (optional)');
      }
    }
  });
  
  Logger.log('');
  Logger.log('=== FUNCTION CHECK ===');
  
  var funcs = [
    {name: 'MM_registerWithAccessKey', critical: true},
    {name: 'MM_showAccessKeyRegistration_', critical: true},
    {name: 'proceedToSheetAccess', critical: true},
    {name: 'MM_showDashboard', critical: true},
    {name: 'showCategorizationModal', critical: true},
    {name: 'getCategorizationModalDataV2', critical: true}
  ];
  
  funcs.forEach(function(func) {
    try {
      if (typeof eval(func.name) === 'function') {
        Logger.log('✅ ' + func.name);
      } else {
        Logger.log('❌ ' + func.name + ' NOT A FUNCTION');
        if (func.critical) allGood = false;
      }
    } catch(e) {
      Logger.log('❌ ' + func.name + ' MISSING');
      if (func.critical) allGood = false;
    }
  });
  
  Logger.log('');
  Logger.log('=== COLUMN CONFIG CHECK ===');
  
  try {
    if (typeof MM_COLS !== 'undefined' && typeof MM_ROWS !== 'undefined') {
      Logger.log('✅ ColumnConfig.gs loaded');
      Logger.log('  Header Row: ' + MM_ROWS.HEADER);
      Logger.log('  Data Start: ' + MM_ROWS.DATA_START);
      Logger.log('  Special Labels: ' + (MM_SPECIAL_LABELS || []).join(', '));
    } else {
      Logger.log('❌ ColumnConfig.gs not loaded');
      allGood = false;
    }
  } catch(e) {
    Logger.log('❌ Error checking ColumnConfig: ' + e.message);
    allGood = false;
  }
  
  Logger.log('');
  Logger.log('=== DEPLOYMENT STATUS ===');
  
  if (allGood) {
    Logger.log('✅ ✅ ✅ ALL CHECKS PASSED! ✅ ✅ ✅');
    Logger.log('');
    Logger.log('System is ready for use!');
  } else {
    Logger.log('❌ DEPLOYMENT INCOMPLETE - Fix errors above');
  }
  
  Logger.log('');
  Logger.log('═══════════════════════════════════════');
  
  return {success: allGood};
}

// ═══════════════════════════════════════════════════════════════════
// DEPRECATED PLAID FUNCTIONS (Stubs for backward compatibility)
// ═══════════════════════════════════════════════════════════════════

/**
 * @deprecated Plaid integration removed in 2026
 */
function TEST_PlaidPromptLoad() {
  Logger.log('⚠️ Plaid integration has been deprecated.');
  Logger.log('Bank connections now use Stripe Financial Connections.');
  return true;
}

/**
 * @deprecated Plaid integration removed in 2026
 */
function TEST_PlaidConfig() {
  Logger.log('⚠️ Plaid integration has been deprecated.');
  Logger.log('Bank connections now use Stripe Financial Connections.');
  return true;
}

/**
 * @deprecated Plaid integration removed in 2026
 */
function VERIFY_SEAMLESS_FLOW() {
  return VERIFY_DEPLOYMENT();
}

// ═══════════════════════════════════════════════════════════════════
// END OF DIAGNOSTICS.GS
// ═══════════════════════════════════════════════════════════════════
