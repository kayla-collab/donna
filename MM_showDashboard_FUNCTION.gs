/**
 * Opens the Money Mastery Dashboard Modal
 * 
 * This function displays the main financial dashboard with:
 * - Income and expense summaries
 * - Account balances
 * - Recent transactions
 * - Category breakdowns
 * - Date filtering options
 * 
 * Called from:
 * - Welcome flow after registration
 * - PIN entry after successful authentication
 * - Menu item: Money Mastery → Dashboard
 * - Emergency functions for debugging
 * 
 * @returns {void}
 */
function MM_showDashboard() {
  try {
    const html = HtmlService.createHtmlOutputFromFile('DashboardHTML')
      .setWidth(1400)  // Maximized width
      .setHeight(900); // Maximized height
    
    SpreadsheetApp.getUi().showModalDialog(html, 'Financial Dashboard');
  } catch (error) {
    Logger.log('MM_showDashboard error: ' + error.message);
    
    // Use centralized error handler
    if (typeof handleError === 'function') {
      handleError(error, 'Dashboard Load', {
        showUser: true,
        notifyAdmin: true,
        allowRetry: true,
        userMessage: 'Unable to load dashboard. We\'ve saved your session and will retry next time you log in.'
      });
    } else {
      // Failsafe if error handler not available
      try {
        SpreadsheetApp.getUi().alert(
          '⚠️ Dashboard Error',
          'Unable to load dashboard: ' + error.message + '\n\nPlease contact support: ' + (typeof ERROR_CONFIG !== 'undefined' ? ERROR_CONFIG.SUPPORT_EMAIL : 'support@moneymastery-system.com'),
          SpreadsheetApp.getUi().ButtonSet.OK
        );
      } catch (alertError) {
        Logger.log('Could not show error alert: ' + alertError.message);
      }
    }
  }
}

/**
 * Navigate to dashboard (wrapper function)
 * Can be called from other parts of the app
 */
function navigateToDashboard() {
  MM_showDashboard();
}

/**
 * Test function to verify dashboard opens
 * Run this from Apps Script Editor to test deployment
 */
function TEST_openDashboard() {
  Logger.log('Testing dashboard function...');
  MM_showDashboard();
  Logger.log('Dashboard function executed successfully');
}
