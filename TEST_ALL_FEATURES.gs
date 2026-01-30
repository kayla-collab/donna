/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * COMPREHENSIVE TESTING SUITE - Phase 2
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Run these test functions to verify all features work correctly
 * Updated 2026: Removed bank sync tests - manual entry only
 */

/**
 * TEST 1: Verify All HTML Files Exist and Load
 */
function TEST_verifyHTMLFiles() {
  Logger.log('🧪 TEST 1: Verifying HTML Files...');
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Updated 2026: Removed PlaidPrompt, PlaidLink (deprecated)
  var htmlFiles = [
    'RegistrationFlow',
    'PinEntry',
    'TutorialEmbed',
    'DashboardHTML',
    'ConnectedAccounts',
    'NavigationMenu',
    'CategorizationModal'
  ];
  
  var results = {
    passed: [],
    failed: []
  };
  
  for (var i = 0; i < htmlFiles.length; i++) {
    try {
      var html = HtmlService.createHtmlOutputFromFile(htmlFiles[i]);
      var content = html.getContent();
      if (content && content.length > 0) {
        results.passed.push(htmlFiles[i]);
        Logger.log('✅ ' + htmlFiles[i] + '.html - OK (' + content.length + ' chars)');
      } else {
        results.failed.push(htmlFiles[i] + ' (empty content)');
        Logger.log('❌ ' + htmlFiles[i] + '.html - EMPTY');
      }
    } catch (e) {
      results.failed.push(htmlFiles[i] + ' (' + e.message + ')');
      Logger.log('❌ ' + htmlFiles[i] + '.html - ERROR: ' + e.message);
    }
  }
  
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  Logger.log('📊 RESULTS: ' + results.passed.length + ' passed, ' + results.failed.length + ' failed');
  
  if (results.failed.length > 0) {
    Logger.log('⚠️ FAILED FILES: ' + results.failed.join(', '));
  } else {
    Logger.log('✅ ALL HTML FILES OK');
  }
  
  return results;
}

/**
 * TEST 2: Verify Critical Functions Exist
 */
function TEST_verifyCriticalFunctions() {
  Logger.log('🧪 TEST 2: Verifying Critical Functions...');
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Updated 2026: Removed Plaid functions (deprecated), kept core functions
  var functions = [
    // Registration & Auth
    'MM_openSecurityThenDashboard',
    'MM_showAccessKeyRegistration_',
    'MM_registerWithAccessKey',
    'MM_showLoginGate_',
    'MM_validatePin',
    'saveTutorialCompleted',
    
    // Bank Connections (Manual entry only)
    'showConnectedAccountsDialog',
    
    // Clarity AI
    'showClarityAIDialog',
    'generateClarityPrompt',
    
    // Dashboard
    'MM_showDashboard',
    'MM_apiGetDashboardData',
    
    // Categorization System v2
    'getCategorizationModalData',
    'saveCategorizationChangesV2',
    
    // Column Configuration
    'getColumnConfig',
    'getMM_COLS'
  ];
  
  var results = {
    passed: [],
    failed: []
  };
  
  for (var i = 0; i < functions.length; i++) {
    var funcName = functions[i];
    try {
      var func = eval('typeof ' + funcName);
      if (func === 'function') {
        results.passed.push(funcName);
        Logger.log('✅ ' + funcName + ' - EXISTS');
      } else {
        results.failed.push(funcName + ' (not a function)');
        Logger.log('❌ ' + funcName + ' - NOT A FUNCTION');
      }
    } catch (e) {
      results.failed.push(funcName + ' (undefined)');
      Logger.log('❌ ' + funcName + ' - UNDEFINED');
    }
  }
  
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  Logger.log('📊 RESULTS: ' + results.passed.length + ' passed, ' + results.failed.length + ' failed');
  
  if (results.failed.length > 0) {
    Logger.log('⚠️ MISSING FUNCTIONS: ' + results.failed.join(', '));
  } else {
    Logger.log('✅ ALL FUNCTIONS EXIST');
  }
  
  return results;
}

/**
 * TEST 3: Verify Sheet Structure
 */
function TEST_verifySheetStructure() {
  Logger.log('🧪 TEST 3: Verifying Sheet Structure...');
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  
  var requiredSheets = [
    'INCOME TRANSACTIONS',
    'EXPENSE TRANSACTIONS',
    'YEARLY OVERVIEW',
    'MONTHLY OVERVIEW'
  ];
  
  var foundSheets = [];
  var accountSheets = [];
  
  Logger.log('📋 ALL SHEETS:');
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    Logger.log('  • ' + name + ' (visible: ' + (!sheets[i].isSheetHidden()) + ')');
    foundSheets.push(name);
    
    if (name.indexOf('ACCOUNT') === 0) {
      accountSheets.push(name);
    }
  }
  
  Logger.log('');
  Logger.log('✅ REQUIRED SHEETS:');
  for (var i = 0; i < requiredSheets.length; i++) {
    var exists = foundSheets.indexOf(requiredSheets[i]) !== -1;
    Logger.log('  ' + (exists ? '✅' : '❌') + ' ' + requiredSheets[i]);
  }
  
  Logger.log('');
  Logger.log('🏦 ACCOUNT SHEETS: ' + accountSheets.length + ' found');
  for (var i = 0; i < accountSheets.length; i++) {
    Logger.log('  • ' + accountSheets[i]);
  }
  
  // Check for START HERE sheet (Dashboard is a modal, not a sheet in 2026 version)
  var hasStartHere = foundSheets.indexOf('START HERE') !== -1;
  Logger.log('');
  Logger.log((hasStartHere ? '✅' : '⚠️') + ' START HERE sheet: ' + (hasStartHere ? 'EXISTS' : 'MISSING'));
  
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  return {
    allSheets: foundSheets,
    accountSheets: accountSheets,
    hasStartHere: hasStartHere
  };
}

/**
 * TEST 4: Verify API Configuration
 * Bank sync disabled - only checks Resend (email) API
 */
function TEST_verifyApiConfig() {
  Logger.log('🧪 TEST 4: Verifying API Configuration...');
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    var scriptProps = PropertiesService.getScriptProperties();
    
    var resendKey = scriptProps.getProperty('RESEND_API_KEY');
    
    var config = {
      hasResendKey: !!resendKey,
      resendKeyLength: resendKey ? resendKey.length : 0,
      bankSyncDisabled: true
    };
    
    Logger.log('  BANK SYNC: Disabled (manual entry only)');
    Logger.log('  ' + (config.hasResendKey ? '✅' : '⚠️') + ' RESEND_API_KEY: ' + (config.hasResendKey ? 'SET (' + config.resendKeyLength + ' chars)' : 'NOT SET'));
    
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Logger.log('✅ TRANSACTION ENTRY: Manual only (no bank sync)');
    
    return { success: true, config: config };
    
  } catch (e) {
    Logger.log('❌ ERROR: ' + e.message);
    return { success: false, message: e.message };
  }
}

/**
 * @deprecated Plaid integration removed in 2026 - Use TEST_verifyApiConfig instead
 */
function TEST_verifyPlaidConfig() {
  Logger.log('⚠️ DEPRECATED: TEST_verifyPlaidConfig - Plaid integration removed in 2026');
  Logger.log('   Redirecting to TEST_verifyApiConfig...');
  return TEST_verifyApiConfig();
}

/**
 * TEST 5: Verify User Properties Work
 */
function TEST_verifyUserProperties() {
  Logger.log('🧪 TEST 5: Verifying User Properties...');
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    var props = PropertiesService.getUserProperties();
    var userProps = PropertiesService.getUserProperties();
    
    Logger.log('✅ PropertiesService accessible');
    
    // Get all mm_ properties
    var allProps = userProps.getProperties();
    var mmProps = [];
    
    for (var key in allProps) {
      if (key.indexOf('mm_') === 0) {
        mmProps.push(key);
      }
    }
    
    Logger.log('📋 MM Properties found: ' + mmProps.length);
    if (mmProps.length > 0) {
      Logger.log('  First 10:');
      for (var i = 0; i < Math.min(10, mmProps.length); i++) {
        Logger.log('  • ' + mmProps[i]);
      }
    }
    
    // Check critical properties
    var criticalProps = ['mm_registered', 'mm_primary_email', 'mm_tutorial_completed'];
    Logger.log('');
    Logger.log('🔑 CRITICAL PROPERTIES:');
    for (var i = 0; i < criticalProps.length; i++) {
      var value = userProps.getProperty(criticalProps[i]);
      Logger.log('  ' + (value ? '✅' : '⚠️') + ' ' + criticalProps[i] + ': ' + (value || 'NOT SET'));
    }
    
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return { success: true, count: mmProps.length };
    
  } catch (e) {
    Logger.log('❌ ERROR: ' + e.message);
    return { success: false, message: e.message };
  }
}

/**
 * @deprecated Plaid integration removed in 2026
 */
function TEST_createPlaidLinkToken() {
  Logger.log('🧪 TEST 6: DEPRECATED - Plaid Link Token');
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  Logger.log('⚠️ Plaid integration has been removed in 2026.');
  Logger.log('   Money Mastery uses manual transaction entry only.');
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return { success: false, deprecated: true, message: 'Plaid deprecated in 2026' };
}

/**
 * TEST 6: Verify Column Configuration
 * New for 2026 Categorization System v2
 */
function TEST_verifyColumnConfig() {
  Logger.log('🧪 TEST 6: Verifying Column Configuration...');
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // Check if getMM_COLS exists and returns expected values
    if (typeof getMM_COLS !== 'function') {
      Logger.log('❌ getMM_COLS function not found');
      return { success: false, message: 'getMM_COLS function not defined' };
    }
    
    var cols = getMM_COLS();
    
    // Expected column layout for 2026
    var expected = {
      DATE: 3,
      DESCRIPTION: 4,
      AMOUNT: 5,
      CATEGORY: 6,
      SPECIAL_LABEL: 7,
      MEMO: 8,
      NEED_DESIRE: 9,
      SPLIT_DATA: 10,
      RECEIPT: 11
    };
    
    var allMatch = true;
    for (var key in expected) {
      var actualValue = cols[key];
      var expectedValue = expected[key];
      var match = actualValue === expectedValue;
      
      Logger.log('  ' + (match ? '✅' : '❌') + ' ' + key + ': ' + actualValue + (match ? '' : ' (expected: ' + expectedValue + ')'));
      
      if (!match) {
        allMatch = false;
      }
    }
    
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (allMatch) {
      Logger.log('✅ COLUMN CONFIGURATION CORRECT');
    } else {
      Logger.log('⚠️ COLUMN CONFIGURATION MISMATCH');
    }
    
    return { success: allMatch, columns: cols };
    
  } catch (e) {
    Logger.log('❌ ERROR: ' + e.message);
    return { success: false, message: e.message };
  }
}

/**
 * TEST 7: Test Clarity AI Prompt Generation
 */
function TEST_generateClarityPrompt() {
  Logger.log('🧪 TEST 7: Testing Clarity AI Prompt Generation...');
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    Logger.log('⏳ Calling generateClarityPrompt("overview")...');
    var result = generateClarityPrompt('overview');
    
    if (result && result.success) {
      Logger.log('✅ SUCCESS: Prompt generated');
      Logger.log('  • Prompt length: ' + result.prompt.length + ' chars');
      Logger.log('  • Total Income: $' + result.data.totalIncome.toFixed(2));
      Logger.log('  • Total Expenses: $' + result.data.totalExpenses.toFixed(2));
      Logger.log('  • Net Profit: $' + result.data.netProfit.toFixed(2));
      Logger.log('  • Transaction Count: ' + result.data.transactionCount);
      Logger.log('');
      Logger.log('📄 PROMPT PREVIEW (first 500 chars):');
      Logger.log(result.prompt.substring(0, 500) + '...');
      return { success: true, data: result.data };
    } else {
      Logger.log('❌ FAILED: ' + (result.message || 'Unknown error'));
      return { success: false, message: result.message };
    }
    
  } catch (e) {
    Logger.log('❌ ERROR: ' + e.message);
    return { success: false, message: e.message };
  } finally {
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}

/**
 * RUN ALL TESTS - Main Test Suite
 * Updated 2026: Removed Plaid tests, added Column Config test
 */
function RUN_ALL_TESTS() {
  Logger.log('');
  Logger.log('╔═══════════════════════════════════════════════════════╗');
  Logger.log('║  🧪 COMPREHENSIVE TEST SUITE - 2026 Update           ║');
  Logger.log('║  Money Mastery                                       ║');
  Logger.log('║  Copyright © 2026 Donna Roggio LLC                   ║');
  Logger.log('╚═══════════════════════════════════════════════════════╝');
  Logger.log('');
  
  var startTime = new Date();
  var results = {};
  
  // Run all tests
  results.htmlFiles = TEST_verifyHTMLFiles();
  Logger.log('');
  
  results.functions = TEST_verifyCriticalFunctions();
  Logger.log('');
  
  results.sheets = TEST_verifySheetStructure();
  Logger.log('');
  
  results.apiConfig = TEST_verifyApiConfig();
  Logger.log('');
  
  results.userProps = TEST_verifyUserProperties();
  Logger.log('');
  
  results.columnConfig = TEST_verifyColumnConfig();
  Logger.log('');
  
  results.clarityAI = TEST_generateClarityPrompt();
  Logger.log('');
  
  // Summary
  var endTime = new Date();
  var duration = (endTime - startTime) / 1000;
  
  Logger.log('');
  Logger.log('╔═══════════════════════════════════════════════════════╗');
  Logger.log('║  📊 TEST SUITE SUMMARY                               ║');
  Logger.log('╚═══════════════════════════════════════════════════════╝');
  Logger.log('');
  Logger.log('✅ HTML Files: ' + results.htmlFiles.passed.length + ' / ' + (results.htmlFiles.passed.length + results.htmlFiles.failed.length));
  Logger.log('✅ Functions: ' + results.functions.passed.length + ' / ' + (results.functions.passed.length + results.functions.failed.length));
  Logger.log('✅ Sheet Structure: ' + (results.sheets.hasDashboard ? 'OK' : 'MISSING DASHBOARD'));
  Logger.log('✅ API Config: ' + (results.apiConfig.success ? 'COMPLETE' : 'INCOMPLETE'));
  Logger.log('✅ User Properties: ' + (results.userProps.success ? 'OK (' + results.userProps.count + ' props)' : 'ERROR'));
  Logger.log('✅ Column Config: ' + (results.columnConfig.success ? 'CORRECT' : 'MISMATCH'));
  Logger.log('✅ Clarity AI: ' + (results.clarityAI.success ? 'SUCCESS' : 'FAILED'));
  Logger.log('');
  Logger.log('⏱️ Duration: ' + duration.toFixed(2) + ' seconds');
  Logger.log('');
  
  // Overall status
  var allPassed = results.htmlFiles.failed.length === 0 &&
                 results.functions.failed.length === 0 &&
                 results.apiConfig.success &&
                 results.userProps.success &&
                 results.columnConfig.success;
  
  if (allPassed) {
    Logger.log('🎉 ALL CRITICAL TESTS PASSED - READY TO DEPLOY!');
  } else {
    Logger.log('⚠️ SOME TESTS FAILED - REVIEW LOGS ABOVE');
  }
  
  Logger.log('');
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  return results;
}
