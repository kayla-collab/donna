/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * TEST CONTROL PANEL
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Comprehensive testing panel for ALL features in the Money Mastery system.
 * Admin-only access. Tests every major function with detailed results.
 * 
 * TEST CATEGORIES:
 * 1. Copy Protection & Security
 * 2. Remote Admin Control (Flagged Users)
 * 3. Authentication & Registration
 * 4. Guest Management
 * 5. Business Account Linking & Sync
 * 6. Data Integrity
 * 7. Email System (Resend API)
 * 8. UI Components
 * 9. Performance
 */

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

var TEST_PANEL_CONFIG = {
  SUPPORT_EMAIL: 'support@risingandthriving.com',
  MASTER_SHEET_ID: '11MhJFe4xmSMBLPUXxePtq-yB2YsuhsScY1H7Dc4zwMI'  // NEW MASTER HUB
};

// ═══════════════════════════════════════════════════════════════════
// MAIN TEST PANEL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Show the Test Control Panel modal
 * Admin only
 */
function showTestControlPanel() {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    
    if (!MM_isMasterEmail_(userEmail)) {
      SpreadsheetApp.getUi().alert('Access Denied', 'Admin access required for Test Control Panel.', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    var html = HtmlService.createHtmlOutputFromFile('TestControlPanelModal')
      .setWidth(900)
      .setHeight(750);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'Test Control Panel - Admin Only');
    
  } catch (e) {
    Logger.log('showTestControlPanel error: ' + e.message);
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Run all tests and return comprehensive results
 * @returns {Object} Test results for all categories
 */
function runAllTests() {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      return { success: false, error: 'Admin access required' };
    }
    
    var results = {
      timestamp: new Date().toISOString(),
      runBy: userEmail,
      categories: {}
    };
    
    // Run all test categories
    results.categories.copyProtection = testCopyProtection();
    results.categories.remoteControl = testRemoteAdminControl();
    results.categories.authentication = testAuthentication();
    results.categories.guestManagement = testGuestManagement();
    results.categories.businessAccounts = testBusinessAccounts();
    results.categories.dataIntegrity = testDataIntegrity();
    results.categories.emailSystem = testEmailSystem();
    results.categories.uiComponents = testUIComponents();
    results.categories.sheetStructure = testSheetStructure();
    
    // Calculate summary
    var totalTests = 0;
    var passedTests = 0;
    var failedTests = 0;
    
    for (var category in results.categories) {
      var cat = results.categories[category];
      if (cat && cat.tests) {
        for (var i = 0; i < cat.tests.length; i++) {
          totalTests++;
          if (cat.tests[i].passed) {
            passedTests++;
          } else {
            failedTests++;
          }
        }
      }
    }
    
    results.summary = {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      percentage: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0
    };
    
    return { success: true, results: results };
    
  } catch (e) {
    Logger.log('runAllTests error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// COPY PROTECTION TESTS
// ═══════════════════════════════════════════════════════════════════

function testCopyProtection() {
  var tests = [];
  
  // Test 1: checkCopyProtection function exists
  tests.push({
    name: 'checkCopyProtection function exists',
    passed: typeof checkCopyProtection === 'function',
    details: typeof checkCopyProtection === 'function' ? 'Function available' : 'Function not found'
  });
  
  // Test 2: Copy protection config exists
  tests.push({
    name: 'COPY_PROTECTION_CONFIG defined',
    passed: typeof COPY_PROTECTION_CONFIG !== 'undefined',
    details: typeof COPY_PROTECTION_CONFIG !== 'undefined' ? 'Config loaded' : 'Config not found'
  });
  
  // Test 3: Get sheet registration status
  try {
    var status = getSheetRegistrationStatus();
    tests.push({
      name: 'Sheet registration status readable',
      passed: status.success === true,
      details: status.success ? 
        'Initialized: ' + status.isInitialized + ', URL: ' + (status.registeredUrl ? 'Set' : 'Not set') :
        status.error
    });
  } catch (e) {
    tests.push({
      name: 'Sheet registration status readable',
      passed: false,
      details: 'Error: ' + e.message
    });
  }
  
  // Test 4: registerCurrentSheetUrl function exists
  tests.push({
    name: 'registerCurrentSheetUrl function exists',
    passed: typeof registerCurrentSheetUrl === 'function',
    details: typeof registerCurrentSheetUrl === 'function' ? 'Function available' : 'Function not found'
  });
  
  // Test 5: applyClientRestrictions function exists
  tests.push({
    name: 'applyClientRestrictions function exists',
    passed: typeof applyClientRestrictions === 'function',
    details: typeof applyClientRestrictions === 'function' ? 'Function available' : 'Function not found'
  });
  
  // Test 6: checkUserAuthorization function exists
  tests.push({
    name: 'checkUserAuthorization function exists',
    passed: typeof checkUserAuthorization === 'function',
    details: typeof checkUserAuthorization === 'function' ? 'Function available' : 'Function not found'
  });
  
  // Test 7: Run checkCopyProtection (non-destructive)
  try {
    var copyResult = checkCopyProtection();
    tests.push({
      name: 'checkCopyProtection runs without error',
      passed: copyResult && typeof copyResult.isCopy !== 'undefined',
      details: 'isCopy: ' + copyResult.isCopy + ', reason: ' + copyResult.reason
    });
  } catch (e) {
    tests.push({
      name: 'checkCopyProtection runs without error',
      passed: false,
      details: 'Error: ' + e.message
    });
  }
  
  return { name: 'Copy Protection', tests: tests };
}

// ═══════════════════════════════════════════════════════════════════
// REMOTE ADMIN CONTROL TESTS
// ═══════════════════════════════════════════════════════════════════

function testRemoteAdminControl() {
  var tests = [];
  
  // Test 1: REMOTE_CONTROL_CONFIG exists
  tests.push({
    name: 'REMOTE_CONTROL_CONFIG defined',
    passed: typeof REMOTE_CONTROL_CONFIG !== 'undefined',
    details: typeof REMOTE_CONTROL_CONFIG !== 'undefined' ? 'Config loaded' : 'Config not found'
  });
  
  // Test 2: checkFlaggedStatus function exists
  tests.push({
    name: 'checkFlaggedStatus function exists',
    passed: typeof checkFlaggedStatus === 'function',
    details: typeof checkFlaggedStatus === 'function' ? 'Function available' : 'Function not found'
  });
  
  // Test 3: Run checkFlaggedStatus
  try {
    var flagStatus = checkFlaggedStatus();
    tests.push({
      name: 'checkFlaggedStatus returns valid result',
      passed: flagStatus && typeof flagStatus.flagged !== 'undefined',
      details: 'Flagged: ' + flagStatus.flagged + ', Reason: ' + flagStatus.reason
    });
  } catch (e) {
    tests.push({
      name: 'checkFlaggedStatus returns valid result',
      passed: false,
      details: 'Error: ' + e.message
    });
  }
  
  // Test 4: getRemoteControlStatus function exists
  tests.push({
    name: 'getRemoteControlStatus function exists',
    passed: typeof getRemoteControlStatus === 'function',
    details: typeof getRemoteControlStatus === 'function' ? 'Function available' : 'Function not found'
  });
  
  // Test 5: Run getRemoteControlStatus
  try {
    var rcStatus = getRemoteControlStatus();
    tests.push({
      name: 'getRemoteControlStatus returns valid result',
      passed: rcStatus && rcStatus.success !== undefined,
      details: rcStatus.success ? 
        'URL: ' + (rcStatus.storedSheetUrl ? 'Set' : 'Not set') :
        'Error: ' + rcStatus.error
    });
  } catch (e) {
    tests.push({
      name: 'getRemoteControlStatus returns valid result',
      passed: false,
      details: 'Error: ' + e.message
    });
  }
  
  // Test 6: ADMIN_getFlaggedUsers function exists and works
  try {
    var flaggedResult = ADMIN_getFlaggedUsers();
    tests.push({
      name: 'ADMIN_getFlaggedUsers returns results',
      passed: flaggedResult && flaggedResult.success !== undefined,
      details: flaggedResult.success ? 
        'Flagged users count: ' + (flaggedResult.users ? flaggedResult.users.length : 0) :
        'Error: ' + flaggedResult.error
    });
  } catch (e) {
    tests.push({
      name: 'ADMIN_getFlaggedUsers returns results',
      passed: false,
      details: 'Error: ' + e.message
    });
  }
  
  // Test 7: Can access NEW SHEET LOG
  try {
    var masterSheet = SpreadsheetApp.openById(TEST_PANEL_CONFIG.MASTER_SHEET_ID);
    var accessKeysSheet = masterSheet.getSheetByName('ACCESS KEYS');
    tests.push({
      name: 'Can access NEW SHEET LOG (ACCESS KEYS)',
      passed: accessKeysSheet !== null,
      details: accessKeysSheet ? 'Sheet found, rows: ' + accessKeysSheet.getLastRow() : 'Sheet not found'
    });
  } catch (e) {
    tests.push({
      name: 'Can access NEW SHEET LOG (ACCESS KEYS)',
      passed: false,
      details: 'Error: ' + e.message
    });
  }
  
  return { name: 'Remote Admin Control', tests: tests };
}

// ═══════════════════════════════════════════════════════════════════
// AUTHENTICATION TESTS
// ═══════════════════════════════════════════════════════════════════

function testAuthentication() {
  var tests = [];
  
  // Test 1: MM_normEmail_ function exists
  tests.push({
    name: 'MM_normEmail_ function exists',
    passed: typeof MM_normEmail_ === 'function',
    details: typeof MM_normEmail_ === 'function' ? 'Function available' : 'Function not found'
  });
  
  // Test 2: MM_isMasterEmail_ function exists
  tests.push({
    name: 'MM_isMasterEmail_ function exists',
    passed: typeof MM_isMasterEmail_ === 'function',
    details: typeof MM_isMasterEmail_ === 'function' ? 'Function available' : 'Function not found'
  });
  
  // Test 3: Current user is recognized
  try {
    var email = Session.getActiveUser().getEmail();
    var isMaster = MM_isMasterEmail_(email);
    tests.push({
      name: 'Current user email retrieved',
      passed: email && email.length > 0,
      details: 'Email: ' + (email || 'Not available') + ', IsMaster: ' + isMaster
    });
  } catch (e) {
    tests.push({
      name: 'Current user email retrieved',
      passed: false,
      details: 'Error: ' + e.message
    });
  }
  
  // Test 4: MM_CFG.MASTER_EMAILS configured
  tests.push({
    name: 'MM_CFG.MASTER_EMAILS configured',
    passed: typeof MM_CFG !== 'undefined' && Array.isArray(MM_CFG.MASTER_EMAILS) && MM_CFG.MASTER_EMAILS.length > 0,
    details: typeof MM_CFG !== 'undefined' && Array.isArray(MM_CFG.MASTER_EMAILS) ? 
      'Master emails count: ' + MM_CFG.MASTER_EMAILS.length : 
      'Not configured'
  });
  
  // Test 5: MM_validatePin function exists
  tests.push({
    name: 'MM_validatePin function exists',
    passed: typeof MM_validatePin === 'function',
    details: typeof MM_validatePin === 'function' ? 'Function available' : 'Function not found'
  });
  
  // Test 6: getUserPinInfo function exists and works
  try {
    var pinInfo = getUserPinInfo();
    tests.push({
      name: 'getUserPinInfo returns valid result',
      passed: pinInfo && typeof pinInfo.pinLength !== 'undefined',
      details: 'PIN length: ' + (pinInfo.pinLength || 'unknown')
    });
  } catch (e) {
    tests.push({
      name: 'getUserPinInfo returns valid result',
      passed: false,
      details: 'Error: ' + e.message
    });
  }
  
  // Test 7: Document properties accessible
  try {
    var props = _mm_safeDocProps_();
    tests.push({
      name: 'Document properties accessible',
      passed: props !== null && props !== undefined,
      details: props ? 'Properties accessible' : 'Properties not accessible'
    });
  } catch (e) {
    tests.push({
      name: 'Document properties accessible',
      passed: false,
      details: 'Error: ' + e.message
    });
  }
  
  // Test 8: Client email configured
  try {
    var props = _mm_safeDocProps_();
    var clientEmail = props ? props.getProperty('mm_client_email') : null;
    tests.push({
      name: 'Client email configured',
      passed: clientEmail && clientEmail.length > 0,
      details: clientEmail ? 'Client: ' + clientEmail : 'Not configured'
    });
  } catch (e) {
    tests.push({
      name: 'Client email configured',
      passed: false,
      details: 'Error: ' + e.message
    });
  }
  
  return { name: 'Authentication', tests: tests };
}

// ═══════════════════════════════════════════════════════════════════
// GUEST MANAGEMENT TESTS
// ═══════════════════════════════════════════════════════════════════

function testGuestManagement() {
  var tests = [];
  
  // Test 1: Guest log sheet accessible
  try {
    var masterSheet = SpreadsheetApp.openById(TEST_PANEL_CONFIG.MASTER_SHEET_ID);
    var guestLogSheet = masterSheet.getSheetByName('GUEST LOG');
    tests.push({
      name: 'GUEST LOG sheet accessible',
      passed: guestLogSheet !== null,
      details: guestLogSheet ? 'Sheet found, rows: ' + guestLogSheet.getLastRow() : 'Sheet not found'
    });
  } catch (e) {
    tests.push({
      name: 'GUEST LOG sheet accessible',
      passed: false,
      details: 'Error: ' + e.message
    });
  }
  
  // Test 2: getAllowedEmails function works
  try {
    var allowedResult = getAllowedEmails();
    tests.push({
      name: 'getAllowedEmails returns valid result',
      passed: allowedResult && allowedResult.success !== undefined,
      details: allowedResult.success ? 
        'Allowed emails count: ' + (allowedResult.emails ? allowedResult.emails.length : 0) :
        'Error: ' + allowedResult.error
    });
  } catch (e) {
    tests.push({
      name: 'getAllowedEmails returns valid result',
      passed: false,
      details: 'Error: ' + e.message
    });
  }
  
  // Test 3: addAllowedEmail function exists
  tests.push({
    name: 'addAllowedEmail function exists',
    passed: typeof addAllowedEmail === 'function',
    details: typeof addAllowedEmail === 'function' ? 'Function available' : 'Function not found'
  });
  
  // Test 4: removeAllowedEmail function exists
  tests.push({
    name: 'removeAllowedEmail function exists',
    passed: typeof removeAllowedEmail === 'function',
    details: typeof removeAllowedEmail === 'function' ? 'Function available' : 'Function not found'
  });
  
  // Test 5: Local guest storage
  try {
    var props = _mm_safeDocProps_();
    var guestsJson = props ? props.getProperty('mm_guests_json') : null;
    var guests = [];
    if (guestsJson) {
      try { guests = JSON.parse(guestsJson); } catch (e) {}
    }
    tests.push({
      name: 'Local guest storage accessible',
      passed: props !== null,
      details: 'Stored guests: ' + (Array.isArray(guests) ? guests.length : 0)
    });
  } catch (e) {
    tests.push({
      name: 'Local guest storage accessible',
      passed: false,
      details: 'Error: ' + e.message
    });
  }
  
  return { name: 'Guest Management', tests: tests };
}

// ═══════════════════════════════════════════════════════════════════
// BUSINESS ACCOUNTS TESTS
// ═══════════════════════════════════════════════════════════════════

function testBusinessAccounts() {
  var tests = [];
  
  // Test 1: getAdminSettings returns business accounts
  try {
    var settings = getAdminSettings();
    var hasAccounts = settings.success && settings.settings && Array.isArray(settings.settings.businessAccounts);
    tests.push({
      name: 'Business accounts retrievable',
      passed: hasAccounts,
      details: hasAccounts ? 
        'Accounts count: ' + settings.settings.businessAccounts.length :
        'Error: ' + (settings.error || 'Invalid response')
    });
  } catch (e) {
    tests.push({
      name: 'Business accounts retrievable',
      passed: false,
      details: 'Error: ' + e.message
    });
  }
  
  // Test 2: saveBusinessAccounts function exists
  tests.push({
    name: 'saveBusinessAccounts function exists',
    passed: typeof saveBusinessAccounts === 'function',
    details: typeof saveBusinessAccounts === 'function' ? 'Function available' : 'Function not found'
  });
  
  // Test 3: Currency settings retrievable
  try {
    var settings = getAdminSettings();
    var hasCurrency = settings.success && settings.settings && settings.settings.currencySettings;
    tests.push({
      name: 'Currency settings retrievable',
      passed: hasCurrency,
      details: hasCurrency ? 
        'Base currency: ' + (settings.settings.currencySettings.baseCurrency || 'USD') :
        'Not configured'
    });
  } catch (e) {
    tests.push({
      name: 'Currency settings retrievable',
      passed: false,
      details: 'Error: ' + e.message
    });
  }
  
  // Test 4: syncAllBusinessData function exists
  tests.push({
    name: 'syncAllBusinessData function exists',
    passed: typeof syncAllBusinessData === 'function',
    details: typeof syncAllBusinessData === 'function' ? 'Function available' : 'Function not found'
  });
  
  // Test 5: extractSheetIdFromUrl_ function works
  try {
    var testUrl = 'https://docs.google.com/spreadsheets/d/1abc123xyz/edit';
    var extracted = extractSheetIdFromUrl_(testUrl);
    tests.push({
      name: 'extractSheetIdFromUrl_ works correctly',
      passed: extracted === '1abc123xyz',
      details: extracted ? 'Extracted: ' + extracted : 'Extraction failed'
    });
  } catch (e) {
    tests.push({
      name: 'extractSheetIdFromUrl_ works correctly',
      passed: false,
      details: 'Error: ' + e.message
    });
  }
  
  return { name: 'Business Accounts', tests: tests };
}

// ═══════════════════════════════════════════════════════════════════
// DATA INTEGRITY TESTS
// ═══════════════════════════════════════════════════════════════════

function testDataIntegrity() {
  var tests = [];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Test 1: BACKEND sheet exists
  var backendSheet = ss.getSheetByName('BACKEND');
  tests.push({
    name: 'BACKEND sheet exists',
    passed: backendSheet !== null,
    details: backendSheet ? 'Sheet found' : 'Sheet not found'
  });
  
  // Test 2: START HERE sheet exists
  var startHereSheet = ss.getSheetByName('START HERE');
  tests.push({
    name: 'START HERE sheet exists',
    passed: startHereSheet !== null,
    details: startHereSheet ? 'Sheet found' : 'Sheet not found'
  });
  
  // Test 3: INCOME TRANSACTIONS sheet exists
  var incomeSheet = ss.getSheetByName('INCOME TRANSACTIONS');
  tests.push({
    name: 'INCOME TRANSACTIONS sheet exists',
    passed: incomeSheet !== null,
    details: incomeSheet ? 'Sheet found, rows: ' + incomeSheet.getLastRow() : 'Sheet not found'
  });
  
  // Test 4: EXPENSE TRANSACTIONS sheet exists
  var expenseSheet = ss.getSheetByName('EXPENSE TRANSACTIONS');
  tests.push({
    name: 'EXPENSE TRANSACTIONS sheet exists',
    passed: expenseSheet !== null,
    details: expenseSheet ? 'Sheet found, rows: ' + expenseSheet.getLastRow() : 'Sheet not found'
  });
  
  // Test 5: MM_CFG.DASH_SHEETS configured
  tests.push({
    name: 'MM_CFG.DASH_SHEETS configured',
    passed: typeof MM_CFG !== 'undefined' && typeof MM_CFG.DASH_SHEETS !== 'undefined',
    details: typeof MM_CFG !== 'undefined' && MM_CFG.DASH_SHEETS ? 
      'Sheets configured: ' + Object.keys(MM_CFG.DASH_SHEETS).join(', ') :
      'Not configured'
  });
  
  // Test 6: Document properties writable
  try {
    var props = _mm_safeDocProps_();
    var testKey = '_mm_test_write_' + Date.now();
    props.setProperty(testKey, 'test');
    var readBack = props.getProperty(testKey);
    props.deleteProperty(testKey);
    tests.push({
      name: 'Document properties writable',
      passed: readBack === 'test',
      details: readBack === 'test' ? 'Write successful' : 'Write failed'
    });
  } catch (e) {
    tests.push({
      name: 'Document properties writable',
      passed: false,
      details: 'Error: ' + e.message
    });
  }
  
  return { name: 'Data Integrity', tests: tests };
}

// ═══════════════════════════════════════════════════════════════════
// EMAIL SYSTEM TESTS
// ═══════════════════════════════════════════════════════════════════

function testEmailSystem() {
  var tests = [];
  
  // Test 1: RESEND_CONFIG exists (optional)
  tests.push({
    name: 'RESEND_CONFIG defined',
    passed: typeof RESEND_CONFIG !== 'undefined',
    details: typeof RESEND_CONFIG !== 'undefined' ? 
      'API Key: ' + (RESEND_CONFIG.API_KEY ? 'Configured' : 'Not set') :
      'Using MailApp fallback'
  });
  
  // Test 2: sendCopyDetectedAlert_ function exists
  tests.push({
    name: 'Copy detection alert function exists',
    passed: typeof sendCopyDetectedAlert_ === 'function',
    details: typeof sendCopyDetectedAlert_ === 'function' ? 'Function available' : 'Function not found'
  });
  
  // Test 3: sendFlaggedUserAlert_ function exists
  tests.push({
    name: 'Flagged user alert function exists',
    passed: typeof sendFlaggedUserAlert_ === 'function',
    details: typeof sendFlaggedUserAlert_ === 'function' ? 'Function available' : 'Function not found'
  });
  
  // Test 4: MailApp quota
  try {
    var remaining = MailApp.getRemainingDailyQuota();
    tests.push({
      name: 'MailApp quota available',
      passed: remaining > 0,
      details: 'Remaining daily quota: ' + remaining
    });
  } catch (e) {
    tests.push({
      name: 'MailApp quota available',
      passed: false,
      details: 'Error: ' + e.message
    });
  }
  
  // Test 5: sendRegistrationWelcomeEmail function exists
  tests.push({
    name: 'Registration email function exists',
    passed: typeof sendRegistrationWelcomeEmail === 'function',
    details: typeof sendRegistrationWelcomeEmail === 'function' ? 'Function available' : 'Function not found'
  });
  
  return { name: 'Email System', tests: tests };
}

// ═══════════════════════════════════════════════════════════════════
// UI COMPONENTS TESTS
// ═══════════════════════════════════════════════════════════════════

function testUIComponents() {
  var tests = [];
  
  // Test 1: AdminSettingsModal.html exists
  try {
    var html = HtmlService.createHtmlOutputFromFile('AdminSettingsModal');
    tests.push({
      name: 'AdminSettingsModal.html exists',
      passed: html !== null,
      details: 'Template found'
    });
  } catch (e) {
    tests.push({
      name: 'AdminSettingsModal.html exists',
      passed: false,
      details: 'Error: ' + e.message
    });
  }
  
  // Test 2: AdminInitializationModal.html exists
  try {
    var html = HtmlService.createHtmlOutputFromFile('AdminInitializationModal');
    tests.push({
      name: 'AdminInitializationModal.html exists',
      passed: html !== null,
      details: 'Template found'
    });
  } catch (e) {
    tests.push({
      name: 'AdminInitializationModal.html exists',
      passed: false,
      details: 'Error: ' + e.message
    });
  }
  
  // Test 3: PinEntry.html exists
  try {
    var html = HtmlService.createHtmlOutputFromFile('PinEntry');
    tests.push({
      name: 'PinEntry.html exists',
      passed: html !== null,
      details: 'Template found'
    });
  } catch (e) {
    tests.push({
      name: 'PinEntry.html exists',
      passed: false,
      details: 'Error: ' + e.message
    });
  }
  
  // Test 4: DashboardHTML.html exists
  try {
    var html = HtmlService.createHtmlOutputFromFile('DashboardHTML');
    tests.push({
      name: 'DashboardHTML.html exists',
      passed: html !== null,
      details: 'Template found'
    });
  } catch (e) {
    tests.push({
      name: 'DashboardHTML.html exists',
      passed: false,
      details: 'Error: ' + e.message
    });
  }
  
  // Test 5: showAdminSettingsModal function exists
  tests.push({
    name: 'showAdminSettingsModal function exists',
    passed: typeof showAdminSettingsModal === 'function',
    details: typeof showAdminSettingsModal === 'function' ? 'Function available' : 'Function not found'
  });
  
  // Test 6: showAdminInitializationModal function exists
  tests.push({
    name: 'showAdminInitializationModal function exists',
    passed: typeof showAdminInitializationModal === 'function',
    details: typeof showAdminInitializationModal === 'function' ? 'Function available' : 'Function not found'
  });
  
  return { name: 'UI Components', tests: tests };
}

// ═══════════════════════════════════════════════════════════════════
// SHEET STRUCTURE TESTS
// ═══════════════════════════════════════════════════════════════════

function testSheetStructure() {
  var tests = [];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Test 1: All required sheets present
  var requiredSheets = ['START HERE', 'INCOME TRANSACTIONS', 'EXPENSE TRANSACTIONS', 'BACKEND'];
  var missingSheets = [];
  
  for (var i = 0; i < requiredSheets.length; i++) {
    var sheet = ss.getSheetByName(requiredSheets[i]);
    if (!sheet) {
      missingSheets.push(requiredSheets[i]);
    }
  }
  
  tests.push({
    name: 'All required sheets present',
    passed: missingSheets.length === 0,
    details: missingSheets.length === 0 ? 
      'All ' + requiredSheets.length + ' sheets found' :
      'Missing: ' + missingSheets.join(', ')
  });
  
  // Test 2: BACKEND sheet has expected columns
  var backendSheet = ss.getSheetByName('BACKEND');
  if (backendSheet) {
    try {
      var headers = backendSheet.getRange(1, 1, 1, backendSheet.getLastColumn()).getValues()[0];
      tests.push({
        name: 'BACKEND sheet has columns',
        passed: headers.length > 0,
        details: 'Columns found: ' + headers.length
      });
    } catch (e) {
      tests.push({
        name: 'BACKEND sheet has columns',
        passed: false,
        details: 'Error: ' + e.message
      });
    }
  } else {
    tests.push({
      name: 'BACKEND sheet has columns',
      passed: false,
      details: 'BACKEND sheet not found'
    });
  }
  
  // Test 3: Spreadsheet URL accessible
  tests.push({
    name: 'Spreadsheet URL accessible',
    passed: ss.getUrl() && ss.getUrl().length > 0,
    details: 'URL: ' + (ss.getUrl() ? ss.getUrl().substring(0, 50) + '...' : 'Not available')
  });
  
  // Test 4: Spreadsheet ID accessible
  tests.push({
    name: 'Spreadsheet ID accessible',
    passed: ss.getId() && ss.getId().length > 0,
    details: 'ID: ' + (ss.getId() || 'Not available')
  });
  
  // Test 5: Total sheets count
  var allSheets = ss.getSheets();
  tests.push({
    name: 'Sheet count reasonable',
    passed: allSheets.length >= 4 && allSheets.length <= 50,
    details: 'Total sheets: ' + allSheets.length
  });
  
  return { name: 'Sheet Structure', tests: tests };
}

// ═══════════════════════════════════════════════════════════════════
// INDIVIDUAL TEST RUNNERS (for panel)
// ═══════════════════════════════════════════════════════════════════

function runSingleCategoryTest(category) {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      return { success: false, error: 'Admin access required' };
    }
    
    var result;
    switch (category) {
      case 'copyProtection':
        result = testCopyProtection();
        break;
      case 'remoteControl':
        result = testRemoteAdminControl();
        break;
      case 'authentication':
        result = testAuthentication();
        break;
      case 'guestManagement':
        result = testGuestManagement();
        break;
      case 'businessAccounts':
        result = testBusinessAccounts();
        break;
      case 'dataIntegrity':
        result = testDataIntegrity();
        break;
      case 'emailSystem':
        result = testEmailSystem();
        break;
      case 'uiComponents':
        result = testUIComponents();
        break;
      case 'sheetStructure':
        result = testSheetStructure();
        break;
      default:
        return { success: false, error: 'Unknown category: ' + category };
    }
    
    return { success: true, result: result };
    
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// QUICK ACTION TESTS
// ═══════════════════════════════════════════════════════════════════

/**
 * Test sending a test email (admin only)
 */
function testSendEmail() {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      return { success: false, error: 'Admin access required' };
    }
    
    var subject = 'Test Email from Money Mastery';
    var body = 'This is a test email sent from the Test Control Panel.\n\n' +
               'Timestamp: ' + new Date().toISOString() + '\n' +
               'Sent by: ' + userEmail + '\n\n' +
               '© 2026 Donna Roggio LLC';
    
    MailApp.sendEmail({
      to: userEmail,
      subject: subject,
      body: body
    });
    
    return { success: true, message: 'Test email sent to ' + userEmail };
    
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Test checking the NEW SHEET LOG connection
 */
function testMasterSheetConnection() {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      return { success: false, error: 'Admin access required' };
    }
    
    var masterSheet = SpreadsheetApp.openById(TEST_PANEL_CONFIG.MASTER_SHEET_ID);
    var sheets = masterSheet.getSheets();
    var sheetNames = sheets.map(function(s) { return s.getName(); });
    
    return { 
      success: true, 
      message: 'Connected to NEW SHEET LOG',
      sheetNames: sheetNames,
      url: masterSheet.getUrl()
    };
    
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Reset test data (admin only - careful!)
 */
function resetTestData() {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      return { success: false, error: 'Admin access required' };
    }
    
    var props = _mm_safeDocProps_();
    if (!props) {
      return { success: false, error: 'Cannot access properties' };
    }
    
    // Only delete test-related properties
    var testProps = props.getKeys().filter(function(key) {
      return key.indexOf('_mm_test_') === 0;
    });
    
    for (var i = 0; i < testProps.length; i++) {
      props.deleteProperty(testProps[i]);
    }
    
    return { success: true, message: 'Cleared ' + testProps.length + ' test properties' };
    
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Get system info for debugging
 */
function getSystemInfo() {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      return { success: false, error: 'Admin access required' };
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var props = _mm_safeDocProps_();
    
    return {
      success: true,
      info: {
        spreadsheetId: ss.getId(),
        spreadsheetUrl: ss.getUrl(),
        spreadsheetName: ss.getName(),
        sheetCount: ss.getSheets().length,
        currentUser: userEmail,
        isMaster: true,
        timezone: Session.getScriptTimeZone(),
        locale: Session.getActiveUserLocale(),
        propsCount: props ? props.getKeys().length : 0,
        masterEmails: MM_CFG.MASTER_EMAILS,
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (e) {
    return { success: false, error: e.message };
  }
}
