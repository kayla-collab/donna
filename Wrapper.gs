/**
 * ═══════════════════════════════════════════════════════════════════
 * WRAPPER FUNCTIONS FOR WEB APP
 * ═══════════════════════════════════════════════════════════════════
 * These functions act as bridges between the HTML and library functions
 * 
 * DEPLOY THIS FILE AS PART OF YOUR WEB APP!
 */

/**
 * Wrapper for MM_computeDashboardData_
 * This allows DashboardHTML.html to call the function via google.script.run
 */
function MM_computeDashboardData_() {
  // If the function is in a library, call it like this:
  // return YourLibraryName.MM_computeDashboardData_();
  
  // If the function is in WELCOME.GS in the same project, it should just work
  // But if you're getting "not a function" error, it means it's not accessible
  
  try {
    // Try calling it directly first
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Find most recent transaction date
    const mostRecentDate = MM_findMostRecentTransactionDate_(ss);
    const cutoffDate = new Date(mostRecentDate.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    Logger.log('Wrapper: Computing dashboard data...');
    Logger.log('Date range: ' + cutoffDate + ' to ' + mostRecentDate);
    
    // Read INCOME and EXPENSE sheets
    const incomeResult = MM_readTransactionSheetMonthly_(ss, 'INCOME TRANSACTIONS', cutoffDate);
    const expenseResult = MM_readTransactionSheetMonthly_(ss, 'EXPENSE TRANSACTIONS', cutoffDate);
    
    const monthlyIncome = incomeResult.totalAmount;
    const monthlyExpenses = expenseResult.totalAmount;
    const monthlyProfit = monthlyIncome - monthlyExpenses;
    const totalErrors = incomeResult.errorCount + expenseResult.errorCount;
    const unlabeledCount = incomeResult.unlabeledCount + expenseResult.unlabeledCount;
    const needsTotal = (incomeResult.needsTotal || 0) + (expenseResult.needsTotal || 0);
    const desiresTotal = (incomeResult.desiresTotal || 0) + (expenseResult.desiresTotal || 0);
    
    // Get goals
    const goals = MM_getGoalsFromDashboard_(ss) || [];
    
    // Get learning stats
    const learningStats = typeof getLearningStatistics === 'function' ? getLearningStatistics() : { total: 0 };
    
    const result = {
      monthlyIncome: monthlyIncome,
      monthlyExpenses: monthlyExpenses,
      monthlyProfit: monthlyProfit,
      totalErrors: totalErrors,
      unlabeledCount: unlabeledCount,
      needsTotal: needsTotal,
      desiresTotal: desiresTotal,
      goals: goals,
      learningRules: learningStats.total || 0,
      incomeCategories: incomeResult.categories || [],
      expenseCategories: expenseResult.categories || [],
      dateRange: {
        from: cutoffDate.toLocaleDateString(),
        to: mostRecentDate.toLocaleDateString()
      }
    };
    
    Logger.log('Wrapper: Success! Returning data to HTML');
    return result;
    
  } catch (error) {
    Logger.log('Wrapper ERROR: ' + error.message);
    Logger.log('Stack: ' + error.stack);
    
    // Return default data on error
    return {
      monthlyIncome: 0,
      monthlyExpenses: 0,
      monthlyProfit: 0,
      totalErrors: 0,
      unlabeledCount: 0,
      needsTotal: 0,
      desiresTotal: 0,
      goals: [],
      learningRules: 0,
      incomeCategories: [],
      expenseCategories: [],
      dateRange: { from: 'Error', to: 'Error' },
      error: error.message
    };
  }
}

/**
 * Test if wrapper works
 */
function TEST_WRAPPER() {
  try {
    Logger.log('Testing wrapper function...');
    const data = MM_computeDashboardData_();
    Logger.log('✅ Wrapper works!');
    Logger.log(JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    Logger.log('❌ Wrapper failed: ' + error.message);
    return null;
  }
}
