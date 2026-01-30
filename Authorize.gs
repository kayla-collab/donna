/**
 * ═══════════════════════════════════════════════════════════════════
 * AUTHORIZATION FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════
 * 
 * IMPORTANT FOR NEW USERS:
 * When a new user opens the spreadsheet for the first time, they need
 * to authorize the script. This is done by running AUTHORIZE_ALL_PERMISSIONS
 * from the Apps Script editor (Extensions → Apps Script).
 * 
 * The script will prompt the user to grant permissions. Once authorized,
 * the script will work normally on subsequent visits.
 * ═══════════════════════════════════════════════════════════════════
 */

/**
 * Quick Authorization Check
 * Called from the menu to check if user has authorized the script
 * This function triggers the OAuth flow if not yet authorized
 */
function checkAndRequestAuthorization() {
  try {
    // These calls will trigger authorization if needed
    var email = Session.getActiveUser().getEmail();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var props = _mm_safeScriptProps_();
    
    // If we get here, we're authorized
    SpreadsheetApp.getUi().alert(
      '✅ Authorized!',
      'You are authorized. Refreshing the sheet will now work.\n\n' +
      'User: ' + email,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return true;
  } catch (e) {
    // This shouldn't happen since the call itself triggers auth
    Logger.log('Authorization check error: ' + e.message);
    return false;
  }
}

/**
 * Run this function ONCE to authorize all permissions
 * It doesn't call any UI functions, so it will work!
 */
function AUTHORIZE_ALL_PERMISSIONS() {
  try {
    // Request all necessary permissions WITHOUT calling UI
    
    // 1. Spreadsheet access
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log('✓ Spreadsheet access granted');
    
    // 2. Properties service (using safe wrapper)
    const props = _mm_safeDocProps_();
    props.setProperty('auth_test', 'authorized');
    Logger.log('✓ Properties service access granted (using Script Properties)');
    
    // 3. Script service (for triggers)
    ScriptApp.getProjectTriggers();
    Logger.log('✓ Script service access granted');
    
    // 4. URL Fetch (for Stripe API & Access Key Validation)
    // We make a dummy request call to ensure the scope is registered
    if (typeof UrlFetchApp !== 'undefined') {
      try {
        // This forces the scope to be recognized and authorized
        var req = UrlFetchApp.getRequest('https://www.google.com');
        Logger.log('✓ URL Fetch service access granted');
      } catch (e) {
        Logger.log('! URL Fetch service present but threw error (likely auth): ' + e.message);
        throw e; // Re-throw to ensure auth prompt appears
      }
    }
    
    // 5. Session (for user email)
    const email = Session.getActiveUser().getEmail();
    Logger.log('✓ Session access granted, user: ' + email);
    
    Logger.log('');
    Logger.log('════════════════════════════════════════');
    Logger.log('✅ ALL PERMISSIONS AUTHORIZED!');
    Logger.log('════════════════════════════════════════');
    Logger.log('');
    Logger.log('NEXT STEPS:');
    Logger.log('1. Close this Apps Script window');
    Logger.log('2. Refresh your Google Sheet (F5 or Ctrl+R)');
    Logger.log('3. Dashboard should load automatically');
    Logger.log('');
    
    return 'Authorization complete! Refresh your sheet.';
    
  } catch (error) {
    Logger.log('❌ Authorization failed: ' + error.message);
    Logger.log('Error stack: ' + error.stack);
    return 'Authorization failed: ' + error.message;
  }
}

/**
 * After authorization, test if dashboard data works
 * Run this AFTER AUTHORIZE_ALL_PERMISSIONS succeeds
 */
function TEST_DASHBOARD_DATA_ONLY() {
  try {
    Logger.log('Testing dashboard data computation...');
    Logger.log('');
    
    const data = MM_computeDashboardData_();
    
    Logger.log('✅ Dashboard data computed successfully!');
    Logger.log('');
    Logger.log('RESULTS:');
    Logger.log('─────────────────────────────');
    Logger.log('Monthly Income:    $' + data.monthlyIncome.toFixed(2));
    Logger.log('Monthly Expenses:  $' + data.monthlyExpenses.toFixed(2));
    Logger.log('Monthly Profit:    $' + data.monthlyProfit.toFixed(2));
    Logger.log('Total Errors:      ' + data.totalErrors);
    Logger.log('Unlabeled:         ' + data.unlabeledCount);
    Logger.log('Needs Total:       $' + data.needsTotal.toFixed(2));
    Logger.log('Desires Total:     $' + data.desiresTotal.toFixed(2));
    Logger.log('Date Range:        ' + data.dateRange.from + ' to ' + data.dateRange.to);
    Logger.log('Goals:             ' + data.goals.length);
    Logger.log('Learning Rules:    ' + data.learningRules);
    Logger.log('');
    
    return data;
    
  } catch (error) {
    Logger.log('❌ Test failed: ' + error.message);
    Logger.log('Stack: ' + error.stack);
    return null;
  }
}
