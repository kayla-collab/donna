/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * CLARITY AI & REPORTS SYSTEM
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Comprehensive reporting system with:
 * - 10+ pre-built report types
 * - Custom report builder
 * - PDF generation (via HTML + Print)
 * - Email sharing with branded templates
 * - Clarity AI integration for ChatGPT prompts
 * 
 * Data Sources:
 * - INCOME TRANSACTIONS sheet (rows 15+)
 * - EXPENSE TRANSACTIONS sheet (rows 15+)
 * 
 * Column Mapping (MM_TRANSACTION_COLS):
 * - C (3): Account Name
 * - D (4): Date
 * - E (5): Description
 * - F (6): Amount
 * - G (7): Assigned SubCategory
 * - H (8): Business Category
 * - I (9): Memo
 * - J (10): Need or Desire
 * - K (11): Main Category
 */

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

var REPORT_CONFIG = {
  SHEETS: {
    INCOME: 'INCOME TRANSACTIONS',
    EXPENSE: 'EXPENSE TRANSACTIONS'
  },
  ROWS: {
    HEADER: 13,
    DATA_START: 15
  },
  COLS: {
    ACCOUNT: 3,      // C
    DATE: 4,         // D
    DESCRIPTION: 5,  // E
    AMOUNT: 6,       // F
    CATEGORY: 7,     // G - SubCategory
    BUSINESS_CAT: 8, // H - Business Category
    MEMO: 9,         // I
    NEED_DESIRE: 10, // J
    MAIN_CAT: 11     // K
  },
  // Special labels to exclude from P&L calculations
  EXCLUDED_LABELS: ['Ignore', 'Transfer', 'CC Payment'],
  // Labels to include in Payments report
  PAYMENT_LABELS: ['Transfer', 'CC Payment']
};

// ═══════════════════════════════════════════════════════════════════
// MODAL DISPLAY
// ═══════════════════════════════════════════════════════════════════

/**
 * Show the Clarity Reports dialog (1400x900)
 */
function showReportsDialog() {
  try {
    var html = HtmlService.createHtmlOutputFromFile('ClarityReports')
      .setWidth(1400)
      .setHeight(900);
    SpreadsheetApp.getUi().showModalDialog(html, 'Clarity AI & Reports');
  } catch (e) {
    Logger.log('showReportsDialog error: ' + e.message);
    SpreadsheetApp.getUi().alert('Error opening reports: ' + e.message);
  }
}

/**
 * Show the Profit & Loss Report for business version
 * Navigates to the YEARLY OVERVIEW sheet which shows P&L
 */
function showProfitAndLossReport() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var yearlySheet = ss.getSheetByName('YEARLY OVERVIEW');
    
    if (yearlySheet) {
      // Activate the sheet
      ss.setActiveSheet(yearlySheet);
      
      // Scroll to the P&L section (approximately row 65 where totals are)
      yearlySheet.setActiveRange(yearlySheet.getRange('A65'));
      
      SpreadsheetApp.getUi().alert(
        '📊 Profit & Loss Report',
        'You are now viewing the YEARLY OVERVIEW sheet.\n\n' +
        'This shows your business P&L:\n' +
        '• Revenue by category and month\n' +
        '• Expenses by category and month\n' +
        '• Net Profit/Loss\n' +
        '• Payments, Transfers & Business Flow\n\n' +
        'For detailed AI analysis, use:\n' +
        'Money Mastery > Clarity AI & Reports',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    } else {
      SpreadsheetApp.getUi().alert(
        'Sheet Not Found',
        'YEARLY OVERVIEW sheet not found.\n\n' +
        'This sheet contains your Profit & Loss report.',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    }
  } catch (e) {
    Logger.log('showProfitAndLossReport error: ' + e.message);
    SpreadsheetApp.getUi().alert('Error opening P&L report: ' + e.message);
  }
}

/**
 * Get available categories for the report filters
 */
function getReportCategories() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var categories = new Set();
    
    // Get categories from both income and expense sheets
    ['INCOME TRANSACTIONS', 'EXPENSE TRANSACTIONS'].forEach(function(sheetName) {
      var sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        var lastRow = sheet.getLastRow();
        if (lastRow >= REPORT_CONFIG.ROWS.DATA_START) {
          var data = sheet.getRange(REPORT_CONFIG.ROWS.DATA_START, REPORT_CONFIG.COLS.CATEGORY, 
                                    lastRow - REPORT_CONFIG.ROWS.DATA_START + 1, 1).getValues();
          data.forEach(function(row) {
            var cat = String(row[0] || '').trim();
            if (cat && !cat.startsWith('#') && cat !== '') {
              categories.add(cat);
            }
          });
        }
      }
    });
    
    return {
      success: true,
      categories: Array.from(categories).sort()
    };
  } catch (e) {
    Logger.log('getReportCategories error: ' + e.message);
    return { success: false, categories: [] };
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN REPORT GENERATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Generate a Clarity Report based on filters
 * @param {Object} filters - { reportType, startDate, endDate, categories, customPrompt, dataBlocks }
 * @returns {Object} - { success, html, stats, data }
 */
function generateClarityReport(filters) {
  try {
    Logger.log('📊 Generating Clarity Report: ' + filters.reportType);
    Logger.log('Filters: ' + JSON.stringify(filters));
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var startDate = filters.startDate ? new Date(filters.startDate) : new Date(new Date().getFullYear(), 0, 1);
    var endDate = filters.endDate ? new Date(filters.endDate) : new Date();
    
    // Set end date to end of day
    endDate.setHours(23, 59, 59, 999);
    
    // Get all transaction data
    var incomeData = getTransactionData(ss, REPORT_CONFIG.SHEETS.INCOME, startDate, endDate);
    var expenseData = getTransactionData(ss, REPORT_CONFIG.SHEETS.EXPENSE, startDate, endDate);
    
    // Apply category filter if specified
    if (filters.categories && filters.categories.length > 0) {
      incomeData = incomeData.filter(function(tx) {
        return filters.categories.indexOf(tx.category) > -1;
      });
      expenseData = expenseData.filter(function(tx) {
        return filters.categories.indexOf(tx.category) > -1;
      });
    }
    
    // Generate report based on type
    var reportData = null;
    
    switch(filters.reportType) {
      case 'all-transactions':
        reportData = generateAllTransactionsData(incomeData, expenseData);
        break;
      case 'custom-dates':
        reportData = generateDateRangeData(incomeData, expenseData, startDate, endDate);
        break;
      case 'categories':
        reportData = generateCategoriesData(incomeData, expenseData);
        break;
      case 'category-filter':
        reportData = generateCategoryFilterData(incomeData, expenseData, filters.categories);
        break;
      case 'needs-desires':
        reportData = generateNeedsDesiresData(incomeData, expenseData);
        break;
      case 'payments':
        reportData = generatePaymentsData(ss, startDate, endDate);
        break;
      case 'ignored':
        reportData = generateIgnoredData(ss, startDate, endDate);
        break;
      case 'monthly':
        reportData = generateMonthlyData(incomeData, expenseData);
        break;
      case 'profit-loss':
        reportData = generateProfitLossData(incomeData, expenseData, startDate, endDate);
        break;
      case 'account-summary':
        reportData = generateAccountSummaryData(incomeData, expenseData);
        break;
      case 'year-over-year':
        reportData = generateYearOverYearData(ss, filters.startDate, filters.endDate);
        break;
      case 'savings-rate':
        reportData = generateSavingsRateData(incomeData, expenseData);
        break;
      case 'spending-trends':
        reportData = generateSpendingTrendsData(expenseData);
        break;
      case 'income-sources':
        reportData = generateIncomeSourcesData(incomeData);
        break;
      case 'custom':
        reportData = generateCustomData(incomeData, expenseData, filters.dataBlocks, startDate, endDate);
        break;
      default:
        throw new Error('Unknown report type: ' + filters.reportType);
    }
    
    // Generate HTML
    var html = generateReportHTML(filters.reportType, reportData, startDate, endDate);
    
    Logger.log('✅ Report generated successfully');
    Logger.log('Stats: ' + JSON.stringify(reportData.stats));
    
    // Ensure stats are simple objects (no Date objects that might fail serialization)
    var safeStats = {
      totalIncome: reportData.stats.totalIncome || 0,
      totalExpenses: reportData.stats.totalExpenses || 0,
      netProfit: reportData.stats.netProfit || 0,
      transactionCount: reportData.stats.transactionCount || 0
    };
    
    var result = {
      success: true,
      html: html,
      stats: safeStats,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      reportType: filters.reportType
    };
    
    Logger.log('Returning result with stats: ' + JSON.stringify(result.stats));
    return result;
    
  } catch (e) {
    Logger.log('❌ generateClarityReport error: ' + e.message);
    return {
      success: false,
      message: e.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// DATA EXTRACTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Get transaction data from a sheet
 * @param {Spreadsheet} ss - The spreadsheet
 * @param {string} sheetName - Name of the sheet
 * @param {Date} startDate - Start date filter
 * @param {Date} endDate - End date filter
 * @returns {Array} - Array of transaction objects
 */
function getTransactionData(ss, sheetName, startDate, endDate) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  if (lastRow < REPORT_CONFIG.ROWS.DATA_START) return [];
  
  var numRows = lastRow - REPORT_CONFIG.ROWS.DATA_START + 1;
  var data = sheet.getRange(REPORT_CONFIG.ROWS.DATA_START, REPORT_CONFIG.COLS.ACCOUNT, numRows, 9).getValues();
  
  var transactions = [];
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var dateVal = row[1]; // DATE column (D - index 1 relative to start)
    
    if (!dateVal) continue;
    
    var date = new Date(dateVal);
    if (isNaN(date.getTime())) continue;
    
    // Apply date filter
    if (date < startDate || date > endDate) continue;
    
    var amount = parseFloat(row[3]) || 0; // AMOUNT column (F - index 3)
    if (amount === 0) continue;
    
    var category = String(row[4] || '').trim(); // CATEGORY column (G - index 4)
    
    // Skip formula errors
    if (category.startsWith('#')) continue;
    
    transactions.push({
      account: String(row[0] || '').trim(),
      date: date,
      description: String(row[2] || '').trim(),
      amount: amount,
      category: category || 'Uncategorized',
      businessCategory: String(row[5] || '').trim(),
      memo: String(row[6] || '').trim(),
      needDesire: String(row[7] || '').trim(),
      mainCategory: String(row[8] || '').trim(),
      type: sheetName === REPORT_CONFIG.SHEETS.INCOME ? 'income' : 'expense'
    });
  }
  
  return transactions;
}

/**
 * Get transactions including special labels (for payments/ignored reports)
 */
function getTransactionDataWithSpecialLabels(ss, sheetName, startDate, endDate, labelFilter) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  if (lastRow < REPORT_CONFIG.ROWS.DATA_START) return [];
  
  // Get more columns to check for special labels
  var numRows = lastRow - REPORT_CONFIG.ROWS.DATA_START + 1;
  var data = sheet.getRange(REPORT_CONFIG.ROWS.DATA_START, 1, numRows, 15).getValues();
  
  var transactions = [];
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var dateVal = row[REPORT_CONFIG.COLS.DATE - 1];
    
    if (!dateVal) continue;
    
    var date = new Date(dateVal);
    if (isNaN(date.getTime())) continue;
    if (date < startDate || date > endDate) continue;
    
    var amount = parseFloat(row[REPORT_CONFIG.COLS.AMOUNT - 1]) || 0;
    if (amount === 0) continue;
    
    var category = String(row[REPORT_CONFIG.COLS.CATEGORY - 1] || '').trim();
    
    // Check if this matches our label filter
    // Labels could be in various columns - check category and memo
    var hasLabel = false;
    if (labelFilter && labelFilter.length > 0) {
      for (var j = 0; j < labelFilter.length; j++) {
        if (category.indexOf(labelFilter[j]) > -1 || 
            String(row[REPORT_CONFIG.COLS.MEMO - 1] || '').indexOf(labelFilter[j]) > -1) {
          hasLabel = true;
          break;
        }
      }
      if (!hasLabel) continue;
    }
    
    transactions.push({
      account: String(row[REPORT_CONFIG.COLS.ACCOUNT - 1] || '').trim(),
      date: date,
      description: String(row[REPORT_CONFIG.COLS.DESCRIPTION - 1] || '').trim(),
      amount: amount,
      category: category || 'Uncategorized',
      memo: String(row[REPORT_CONFIG.COLS.MEMO - 1] || '').trim(),
      type: sheetName === REPORT_CONFIG.SHEETS.INCOME ? 'income' : 'expense'
    });
  }
  
  return transactions;
}

// ═══════════════════════════════════════════════════════════════════
// REPORT DATA GENERATORS
// ═══════════════════════════════════════════════════════════════════

function generateAllTransactionsData(incomeData, expenseData) {
  var allTransactions = incomeData.concat(expenseData);
  allTransactions.sort(function(a, b) { return b.date - a.date; });
  
  var totalIncome = sumByType(allTransactions, 'income');
  var totalExpenses = sumByType(allTransactions, 'expense');
  
  return {
    title: 'All Transactions Report',
    transactions: allTransactions,
    stats: {
      totalIncome: totalIncome,
      totalExpenses: totalExpenses,
      netProfit: totalIncome - totalExpenses,
      transactionCount: allTransactions.length
    }
  };
}

function generateDateRangeData(incomeData, expenseData, startDate, endDate) {
  var data = generateAllTransactionsData(incomeData, expenseData);
  data.title = 'Transactions Report';
  data.subtitle = formatDateRange(startDate, endDate);
  return data;
}

function generateCategoriesData(incomeData, expenseData) {
  var incomeByCategory = groupByCategory(incomeData);
  var expenseByCategory = groupByCategory(expenseData);
  
  // Sort by amount
  var sortedIncome = sortCategoryData(incomeByCategory);
  var sortedExpenses = sortCategoryData(expenseByCategory);
  
  var totalIncome = sumTransactions(incomeData);
  var totalExpenses = sumTransactions(expenseData);
  
  return {
    title: 'Categories by Amount',
    incomeCategories: sortedIncome,
    expenseCategories: sortedExpenses,
    stats: {
      totalIncome: totalIncome,
      totalExpenses: totalExpenses,
      netProfit: totalIncome - totalExpenses,
      transactionCount: incomeData.length + expenseData.length
    }
  };
}

function generateCategoryFilterData(incomeData, expenseData, selectedCategories) {
  var data = generateCategoriesData(incomeData, expenseData);
  data.title = 'Filtered Categories Report';
  data.selectedCategories = selectedCategories;
  return data;
}

function generateNeedsDesiresData(incomeData, expenseData) {
  var needsData = { income: [], expenses: [] };
  var desiresData = { income: [], expenses: [] };
  var otherData = { income: [], expenses: [] };
  
  incomeData.forEach(function(tx) {
    var nd = String(tx.needDesire || '').toLowerCase();
    if (nd === 'need') needsData.income.push(tx);
    else if (nd === 'desire' || nd === 'want') desiresData.income.push(tx);
    else otherData.income.push(tx);
  });
  
  expenseData.forEach(function(tx) {
    var nd = String(tx.needDesire || '').toLowerCase();
    if (nd === 'need') needsData.expenses.push(tx);
    else if (nd === 'desire' || nd === 'want') desiresData.expenses.push(tx);
    else otherData.expenses.push(tx);
  });
  
  var needsTotal = sumTransactions(needsData.income) - sumTransactions(needsData.expenses);
  var desiresTotal = sumTransactions(desiresData.income) - sumTransactions(desiresData.expenses);
  
  return {
    title: 'Needs vs Desires Breakdown',
    needs: needsData,
    desires: desiresData,
    other: otherData,
    stats: {
      needsIncome: sumTransactions(needsData.income),
      needsExpenses: sumTransactions(needsData.expenses),
      desiresIncome: sumTransactions(desiresData.income),
      desiresExpenses: sumTransactions(desiresData.expenses),
      totalIncome: sumTransactions(incomeData),
      totalExpenses: sumTransactions(expenseData),
      netProfit: sumTransactions(incomeData) - sumTransactions(expenseData),
      transactionCount: incomeData.length + expenseData.length
    }
  };
}

function generatePaymentsData(ss, startDate, endDate) {
  // Get transactions that have payment-related labels
  var incomePayments = getTransactionDataWithSpecialLabels(ss, REPORT_CONFIG.SHEETS.INCOME, startDate, endDate, REPORT_CONFIG.PAYMENT_LABELS);
  var expensePayments = getTransactionDataWithSpecialLabels(ss, REPORT_CONFIG.SHEETS.EXPENSE, startDate, endDate, REPORT_CONFIG.PAYMENT_LABELS);
  
  var allPayments = incomePayments.concat(expensePayments);
  allPayments.sort(function(a, b) { return b.date - a.date; });
  
  // Group by type
  var transfers = allPayments.filter(function(tx) {
    return tx.category.indexOf('Transfer') > -1 || tx.memo.indexOf('Transfer') > -1;
  });
  var ccPayments = allPayments.filter(function(tx) {
    return tx.category.indexOf('CC Payment') > -1 || tx.memo.indexOf('CC Payment') > -1;
  });
  
  return {
    title: 'Payments Summary',
    transfers: transfers,
    ccPayments: ccPayments,
    all: allPayments,
    stats: {
      totalTransfers: sumTransactions(transfers),
      totalCCPayments: sumTransactions(ccPayments),
      totalIncome: 0,
      totalExpenses: sumTransactions(allPayments),
      netProfit: 0,
      transactionCount: allPayments.length
    }
  };
}

function generateIgnoredData(ss, startDate, endDate) {
  var incomeIgnored = getTransactionDataWithSpecialLabels(ss, REPORT_CONFIG.SHEETS.INCOME, startDate, endDate, ['Ignore']);
  var expenseIgnored = getTransactionDataWithSpecialLabels(ss, REPORT_CONFIG.SHEETS.EXPENSE, startDate, endDate, ['Ignore']);
  
  var allIgnored = incomeIgnored.concat(expenseIgnored);
  allIgnored.sort(function(a, b) { return b.date - a.date; });
  
  return {
    title: 'Ignored Transactions Summary',
    transactions: allIgnored,
    stats: {
      totalIgnoredIncome: sumTransactions(incomeIgnored),
      totalIgnoredExpenses: sumTransactions(expenseIgnored),
      totalIncome: sumTransactions(incomeIgnored),
      totalExpenses: sumTransactions(expenseIgnored),
      netProfit: sumTransactions(incomeIgnored) - sumTransactions(expenseIgnored),
      transactionCount: allIgnored.length
    }
  };
}

function generateMonthlyData(incomeData, expenseData) {
  var monthlyData = {};
  
  // Group by month
  incomeData.forEach(function(tx) {
    var monthKey = tx.date.getFullYear() + '-' + String(tx.date.getMonth() + 1).padStart(2, '0');
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expenses: 0, month: monthKey };
    }
    monthlyData[monthKey].income += tx.amount;
  });
  
  expenseData.forEach(function(tx) {
    var monthKey = tx.date.getFullYear() + '-' + String(tx.date.getMonth() + 1).padStart(2, '0');
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expenses: 0, month: monthKey };
    }
    monthlyData[monthKey].expenses += Math.abs(tx.amount);
  });
  
  // Sort by month
  var sortedMonths = Object.keys(monthlyData).sort().map(function(key) {
    return monthlyData[key];
  });
  
  var totalIncome = sumTransactions(incomeData);
  var totalExpenses = sumTransactions(expenseData);
  
  return {
    title: 'Monthly Comparison',
    months: sortedMonths,
    stats: {
      totalIncome: totalIncome,
      totalExpenses: totalExpenses,
      netProfit: totalIncome - totalExpenses,
      transactionCount: incomeData.length + expenseData.length
    }
  };
}

function generateProfitLossData(incomeData, expenseData, startDate, endDate) {
  // Filter out excluded labels for P&L
  var filteredIncome = incomeData.filter(function(tx) {
    return !isExcludedLabel(tx);
  });
  var filteredExpenses = expenseData.filter(function(tx) {
    return !isExcludedLabel(tx);
  });
  
  var incomeByCategory = groupByCategory(filteredIncome);
  var expenseByCategory = groupByCategory(filteredExpenses);
  
  var totalIncome = sumTransactions(filteredIncome);
  var totalExpenses = sumTransactions(filteredExpenses);
  
  return {
    title: 'Profit & Loss Statement',
    subtitle: formatDateRange(startDate, endDate),
    incomeCategories: sortCategoryData(incomeByCategory),
    expenseCategories: sortCategoryData(expenseByCategory),
    stats: {
      totalIncome: totalIncome,
      totalExpenses: totalExpenses,
      netProfit: totalIncome - totalExpenses,
      transactionCount: filteredIncome.length + filteredExpenses.length
    }
  };
}

function generateAccountSummaryData(incomeData, expenseData) {
  var accountData = {};
  
  incomeData.forEach(function(tx) {
    var account = tx.account || 'Unknown';
    if (!accountData[account]) {
      accountData[account] = { income: 0, expenses: 0, count: 0 };
    }
    accountData[account].income += tx.amount;
    accountData[account].count++;
  });
  
  expenseData.forEach(function(tx) {
    var account = tx.account || 'Unknown';
    if (!accountData[account]) {
      accountData[account] = { income: 0, expenses: 0, count: 0 };
    }
    accountData[account].expenses += Math.abs(tx.amount);
    accountData[account].count++;
  });
  
  // Convert to array and sort by total activity
  var accounts = Object.keys(accountData).map(function(name) {
    return {
      name: name,
      income: accountData[name].income,
      expenses: accountData[name].expenses,
      net: accountData[name].income - accountData[name].expenses,
      count: accountData[name].count
    };
  }).sort(function(a, b) {
    return (b.income + b.expenses) - (a.income + a.expenses);
  });
  
  var totalIncome = sumTransactions(incomeData);
  var totalExpenses = sumTransactions(expenseData);
  
  return {
    title: 'Account Summary',
    accounts: accounts,
    stats: {
      totalIncome: totalIncome,
      totalExpenses: totalExpenses,
      netProfit: totalIncome - totalExpenses,
      transactionCount: incomeData.length + expenseData.length
    }
  };
}

function generateYearOverYearData(ss, startDateStr, endDateStr) {
  var endDate = endDateStr ? new Date(endDateStr) : new Date();
  var startDate = startDateStr ? new Date(startDateStr) : new Date(endDate.getFullYear(), 0, 1);
  
  // This year
  var thisYearStart = new Date(endDate.getFullYear(), 0, 1);
  var thisYearEnd = endDate;
  
  // Last year same period
  var lastYearStart = new Date(endDate.getFullYear() - 1, 0, 1);
  var lastYearEnd = new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate());
  
  var thisYearIncome = getTransactionData(ss, REPORT_CONFIG.SHEETS.INCOME, thisYearStart, thisYearEnd);
  var thisYearExpense = getTransactionData(ss, REPORT_CONFIG.SHEETS.EXPENSE, thisYearStart, thisYearEnd);
  var lastYearIncome = getTransactionData(ss, REPORT_CONFIG.SHEETS.INCOME, lastYearStart, lastYearEnd);
  var lastYearExpense = getTransactionData(ss, REPORT_CONFIG.SHEETS.EXPENSE, lastYearStart, lastYearEnd);
  
  var thisYearTotalIncome = sumTransactions(thisYearIncome);
  var thisYearTotalExpense = sumTransactions(thisYearExpense);
  var lastYearTotalIncome = sumTransactions(lastYearIncome);
  var lastYearTotalExpense = sumTransactions(lastYearExpense);
  
  var incomeChange = lastYearTotalIncome > 0 ? ((thisYearTotalIncome - lastYearTotalIncome) / lastYearTotalIncome) * 100 : 0;
  var expenseChange = lastYearTotalExpense > 0 ? ((thisYearTotalExpense - lastYearTotalExpense) / lastYearTotalExpense) * 100 : 0;
  
  return {
    title: 'Year-Over-Year Comparison',
    subtitle: endDate.getFullYear() + ' vs ' + (endDate.getFullYear() - 1),
    thisYear: {
      year: endDate.getFullYear(),
      income: thisYearTotalIncome,
      expenses: thisYearTotalExpense,
      net: thisYearTotalIncome - thisYearTotalExpense,
      transactionCount: thisYearIncome.length + thisYearExpense.length
    },
    lastYear: {
      year: endDate.getFullYear() - 1,
      income: lastYearTotalIncome,
      expenses: lastYearTotalExpense,
      net: lastYearTotalIncome - lastYearTotalExpense,
      transactionCount: lastYearIncome.length + lastYearExpense.length
    },
    changes: {
      income: incomeChange,
      expenses: expenseChange
    },
    stats: {
      totalIncome: thisYearTotalIncome,
      totalExpenses: thisYearTotalExpense,
      netProfit: thisYearTotalIncome - thisYearTotalExpense,
      transactionCount: thisYearIncome.length + thisYearExpense.length
    }
  };
}

function generateSavingsRateData(incomeData, expenseData) {
  var totalIncome = sumTransactions(incomeData);
  var totalExpenses = sumTransactions(expenseData);
  var savings = totalIncome - totalExpenses;
  var savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;
  
  // Monthly breakdown
  var monthlyData = {};
  
  incomeData.forEach(function(tx) {
    var monthKey = tx.date.getFullYear() + '-' + String(tx.date.getMonth() + 1).padStart(2, '0');
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expenses: 0, month: monthKey };
    }
    monthlyData[monthKey].income += tx.amount;
  });
  
  expenseData.forEach(function(tx) {
    var monthKey = tx.date.getFullYear() + '-' + String(tx.date.getMonth() + 1).padStart(2, '0');
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expenses: 0, month: monthKey };
    }
    monthlyData[monthKey].expenses += Math.abs(tx.amount);
  });
  
  // Calculate savings rate per month
  var monthlyRates = Object.keys(monthlyData).sort().map(function(key) {
    var m = monthlyData[key];
    var rate = m.income > 0 ? ((m.income - m.expenses) / m.income) * 100 : 0;
    return {
      month: key,
      income: m.income,
      expenses: m.expenses,
      savings: m.income - m.expenses,
      savingsRate: rate
    };
  });
  
  return {
    title: 'Savings Rate Analysis',
    totalIncome: totalIncome,
    totalExpenses: totalExpenses,
    totalSavings: savings,
    overallSavingsRate: savingsRate,
    monthlyBreakdown: monthlyRates,
    stats: {
      totalIncome: totalIncome,
      totalExpenses: totalExpenses,
      netProfit: savings,
      transactionCount: incomeData.length + expenseData.length
    }
  };
}

function generateSpendingTrendsData(expenseData) {
  // Group by week
  var weeklyData = {};
  
  expenseData.forEach(function(tx) {
    var date = tx.date;
    var weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    var weekKey = weekStart.getFullYear() + '-W' + String(Math.ceil((weekStart.getMonth() * 4.33) + (weekStart.getDate() / 7))).padStart(2, '0');
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { total: 0, count: 0, week: weekKey, startDate: weekStart };
    }
    weeklyData[weekKey].total += Math.abs(tx.amount);
    weeklyData[weekKey].count++;
  });
  
  // Sort by date and get last 12 weeks
  var sortedWeeks = Object.values(weeklyData).sort(function(a, b) {
    return a.startDate - b.startDate;
  }).slice(-12);
  
  // Calculate averages and trend
  var avgSpending = sortedWeeks.reduce(function(sum, w) { return sum + w.total; }, 0) / (sortedWeeks.length || 1);
  
  // Top spending categories
  var categoryTotals = {};
  expenseData.forEach(function(tx) {
    var cat = tx.category || 'Uncategorized';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(tx.amount);
  });
  
  var topCategories = Object.keys(categoryTotals).map(function(cat) {
    return { category: cat, total: categoryTotals[cat] };
  }).sort(function(a, b) { return b.total - a.total; }).slice(0, 10);
  
  return {
    title: 'Spending Trends Analysis',
    weeklyTrend: sortedWeeks,
    averageWeeklySpending: avgSpending,
    topCategories: topCategories,
    stats: {
      totalIncome: 0,
      totalExpenses: sumTransactions(expenseData),
      netProfit: -sumTransactions(expenseData),
      transactionCount: expenseData.length
    }
  };
}

function generateIncomeSourcesData(incomeData) {
  // Group by category (income source)
  var sourceData = {};
  
  incomeData.forEach(function(tx) {
    var source = tx.category || 'Other Income';
    if (!sourceData[source]) {
      sourceData[source] = { source: source, total: 0, count: 0, transactions: [] };
    }
    sourceData[source].total += tx.amount;
    sourceData[source].count++;
    if (sourceData[source].transactions.length < 5) {
      sourceData[source].transactions.push(tx);
    }
  });
  
  // Sort by total
  var sortedSources = Object.values(sourceData).sort(function(a, b) {
    return b.total - a.total;
  });
  
  var totalIncome = sumTransactions(incomeData);
  
  // Add percentage to each source
  sortedSources.forEach(function(source) {
    source.percentage = totalIncome > 0 ? (source.total / totalIncome) * 100 : 0;
  });
  
  return {
    title: 'Income Sources Analysis',
    sources: sortedSources,
    totalIncome: totalIncome,
    sourceCount: sortedSources.length,
    stats: {
      totalIncome: totalIncome,
      totalExpenses: 0,
      netProfit: totalIncome,
      transactionCount: incomeData.length
    }
  };
}

function generateCustomData(incomeData, expenseData, dataBlocks, startDate, endDate) {
  var result = {
    title: 'Custom Report',
    subtitle: formatDateRange(startDate, endDate),
    sections: [],
    stats: {
      totalIncome: sumTransactions(incomeData),
      totalExpenses: sumTransactions(expenseData),
      netProfit: sumTransactions(incomeData) - sumTransactions(expenseData),
      transactionCount: incomeData.length + expenseData.length
    }
  };
  
  dataBlocks.forEach(function(block) {
    switch(block) {
      case 'income':
        result.sections.push({
          title: 'Income Summary',
          type: 'summary',
          data: { total: sumTransactions(incomeData), count: incomeData.length }
        });
        break;
      case 'expenses':
        result.sections.push({
          title: 'Expense Summary',
          type: 'summary',
          data: { total: sumTransactions(expenseData), count: expenseData.length }
        });
        break;
      case 'categories':
        result.sections.push({
          title: 'Categories Breakdown',
          type: 'categories',
          income: sortCategoryData(groupByCategory(incomeData)),
          expenses: sortCategoryData(groupByCategory(expenseData))
        });
        break;
      case 'needs-desires':
        var ndData = generateNeedsDesiresData(incomeData, expenseData);
        result.sections.push({
          title: 'Needs vs Desires',
          type: 'needs-desires',
          data: ndData
        });
        break;
      case 'top-expenses':
        var topExp = expenseData.slice().sort(function(a, b) { return Math.abs(b.amount) - Math.abs(a.amount); }).slice(0, 10);
        result.sections.push({
          title: 'Top 10 Expenses',
          type: 'transactions',
          data: topExp
        });
        break;
      case 'top-income':
        var topInc = incomeData.slice().sort(function(a, b) { return b.amount - a.amount; }).slice(0, 10);
        result.sections.push({
          title: 'Top 10 Income Sources',
          type: 'transactions',
          data: topInc
        });
        break;
      case 'monthly-trends':
        var monthlyData = generateMonthlyData(incomeData, expenseData);
        result.sections.push({
          title: 'Monthly Trends',
          type: 'monthly',
          data: monthlyData.months
        });
        break;
      case 'accounts':
        var accountData = generateAccountSummaryData(incomeData, expenseData);
        result.sections.push({
          title: 'Account Balances',
          type: 'accounts',
          data: accountData.accounts
        });
        break;
      case 'uncategorized':
        var uncatIncome = incomeData.filter(function(tx) { return !tx.category || tx.category === 'Uncategorized'; });
        var uncatExpense = expenseData.filter(function(tx) { return !tx.category || tx.category === 'Uncategorized'; });
        result.sections.push({
          title: 'Uncategorized Transactions',
          type: 'transactions',
          data: uncatIncome.concat(uncatExpense)
        });
        break;
      case 'largest':
        var all = incomeData.concat(expenseData).sort(function(a, b) { return Math.abs(b.amount) - Math.abs(a.amount); }).slice(0, 10);
        result.sections.push({
          title: 'Largest Transactions',
          type: 'transactions',
          data: all
        });
        break;
      case 'recurring':
        // Find recurring by matching descriptions
        var descCount = {};
        expenseData.forEach(function(tx) {
          var desc = tx.description.toLowerCase().substring(0, 30);
          descCount[desc] = (descCount[desc] || 0) + 1;
        });
        var recurring = expenseData.filter(function(tx) {
          var desc = tx.description.toLowerCase().substring(0, 30);
          return descCount[desc] >= 2;
        });
        result.sections.push({
          title: 'Recurring Payments',
          type: 'transactions',
          data: recurring.slice(0, 20)
        });
        break;
      case 'business':
        var businessTx = incomeData.concat(expenseData).filter(function(tx) { return tx.businessCategory; });
        var personalTx = incomeData.concat(expenseData).filter(function(tx) { return !tx.businessCategory; });
        result.sections.push({
          title: 'Business vs Personal',
          type: 'business-split',
          business: businessTx,
          personal: personalTx
        });
        break;
    }
  });
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════
// HTML GENERATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Generate PDF-ready HTML for a report
 */
function generateReportHTML(reportType, data, startDate, endDate) {
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">';
  html += '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">';
  html += '<style>';
  html += getReportCSS();
  html += '</style></head><body>';
  
  // Branded Header
  html += '<div class="brand-header">';
  html += '<div class="brand-bar"></div>';
  html += '<div class="brand-content">';
  html += '<div class="brand-logo">Money Mastery</div>';
  html += '<div class="brand-tagline">Financial Clarity System</div>';
  html += '</div>';
  html += '<div class="brand-bar"></div>';
  html += '</div>';
  
  // Report Title
  html += '<div class="report-header">';
  html += '<h1>' + (data.title || 'Financial Report') + '</h1>';
  html += '<p class="subtitle">' + formatDateRange(startDate, endDate) + '</p>';
  html += '</div>';
  
  // Summary Stats - Formal Inline Style
  if (data.stats) {
    html += '<div class="summary-section">';
    html += '<table class="summary-table"><tbody>';
    if (data.stats.totalIncome !== undefined) {
      html += '<tr><td class="summary-label">Total Income</td><td class="summary-value income">$' + formatNumber(data.stats.totalIncome) + '</td></tr>';
    }
    if (data.stats.totalExpenses !== undefined) {
      html += '<tr><td class="summary-label">Total Expenses</td><td class="summary-value expense">-$' + formatNumber(data.stats.totalExpenses) + '</td></tr>';
    }
    if (data.stats.netProfit !== undefined) {
      var netClass = data.stats.netProfit >= 0 ? 'income' : 'expense';
      var netDisplay = data.stats.netProfit >= 0 ? '$' + formatNumber(data.stats.netProfit) : '-$' + formatNumber(Math.abs(data.stats.netProfit));
      html += '<tr class="summary-net"><td class="summary-label">Net Balance</td><td class="summary-value ' + netClass + '">' + netDisplay + '</td></tr>';
    }
    if (data.stats.transactionCount !== undefined) {
      html += '<tr><td class="summary-label">Total Transactions</td><td class="summary-value">' + data.stats.transactionCount + '</td></tr>';
    }
    html += '</tbody></table>';
    html += '</div>';
  }
  
  // Report-specific content
  html += generateReportContent(reportType, data);
  
  // Branded Footer
  html += '<div class="report-footer">';
  html += '<div class="footer-brand">';
  html += '<div class="footer-logo">Money Mastery</div>';
  html += '<p class="footer-tagline">Take control of your finances with clarity and confidence</p>';
  html += '</div>';
  html += '<div class="footer-links">';
  html += '<a href="https://risingandthriving.com/membershiphub" class="footer-btn">Visit Membership Hub</a>';
  html += '</div>';
  html += '<div class="footer-legal">';
  html += '<p>© 2026 Donna Roggio LLC. All Rights Reserved.</p>';
  html += '<p>Created with the Money Mastery Financial Clarity System</p>';
  html += '</div>';
  html += '</div>';
  
  html += '</body></html>';
  return html;
}

function getReportCSS() {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Montserrat', Arial, sans-serif; color: #1a1a1a; background: #fff; padding: 40px; max-width: 1000px; margin: 0 auto; line-height: 1.5; }
    h1, h2, h3 { font-family: 'Playfair Display', Georgia, serif; color: #1a1a1a; }
    
    /* Branded Header */
    .brand-header { margin-bottom: 30px; }
    .brand-bar { height: 4px; background: linear-gradient(90deg, #9a8368, #456a73, #9a8368); border-radius: 2px; }
    .brand-content { background: linear-gradient(135deg, #456a73 0%, #3a5a62 100%); padding: 28px 30px; text-align: center; }
    .brand-logo { font-family: 'Playfair Display', Georgia, serif; font-size: 30px; font-weight: 700; color: #ffffff; letter-spacing: 1px; margin-bottom: 4px; }
    .brand-tagline { font-size: 12px; color: #d4cfc7; text-transform: uppercase; letter-spacing: 2px; font-weight: 500; }
    
    /* Report Header */
    .report-header { text-align: center; margin-bottom: 30px; padding-top: 20px; }
    .report-header h1 { font-size: 26px; color: #1a1a1a; margin-bottom: 6px; font-weight: 700; }
    .report-header .subtitle { font-size: 13px; color: #444444; font-weight: 500; }
    
    /* Summary Section - Formal Inline Style */
    .summary-section { margin-bottom: 36px; padding: 0 60px; }
    .summary-table { width: 100%; max-width: 500px; margin: 0 auto; border-collapse: collapse; }
    .summary-table tr { border-bottom: 1px solid #e5e2dd; }
    .summary-table tr.summary-net { border-top: 2px solid #9a8368; border-bottom: 2px solid #9a8368; background: #faf9f7; }
    .summary-label { padding: 12px 16px 12px 0; font-size: 13px; font-weight: 600; color: #333333; text-align: left; }
    .summary-value { padding: 12px 0 12px 16px; font-size: 15px; font-weight: 700; color: #1a1a1a; text-align: right; font-family: 'Montserrat', monospace; }
    .summary-value.income { color: #1a7a4c; }
    .summary-value.expense { color: #b91c1c; }
    .summary-net .summary-label { font-weight: 700; color: #1a1a1a; }
    .summary-net .summary-value { font-size: 17px; }
    .section { margin-bottom: 32px; }
    .section h2 { font-size: 20px; color: #1a1a1a; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #9a8368; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { padding: 12px 10px; text-align: left; border-bottom: 1px solid #d4cfc7; }
    th { background: #f5f3f0; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #333333; }
    td { font-size: 13px; color: #1a1a1a; }
    td.amount { text-align: right; font-weight: 700; font-family: 'Montserrat', monospace; }
    td.amount.positive { color: #1a7a4c; }
    td.amount.negative { color: #b91c1c; }
    .category-row td:first-child { font-weight: 600; color: #1a1a1a; }
    .total-row { background: #f5f3f0; font-weight: 700; }
    .total-row td { color: #1a1a1a; border-top: 2px solid #9a8368; }
    
    /* Branded Footer */
    .report-footer { margin-top: 50px; text-align: center; }
    .footer-brand { background: linear-gradient(135deg, #456a73 0%, #3a5a62 100%); padding: 24px; border-radius: 10px 10px 0 0; }
    .footer-logo { font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 6px; }
    .footer-tagline { font-size: 13px; color: #d4cfc7; margin: 0; }
    .footer-links { background: #f5f3f0; padding: 20px; }
    .footer-btn { display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #9a8368, #7a6858); color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; }
    .footer-legal { padding: 16px; border-top: 1px solid #d4cfc7; }
    .footer-legal p { font-size: 11px; color: #666666; margin-bottom: 2px; }
    
    @media print { body { padding: 20px; } .summary-section { padding: 0 40px; } .footer-btn { background: #9a8368; } }
  `;
}

function generateReportContent(reportType, data) {
  var html = '';
  
  switch(reportType) {
    case 'all-transactions':
    case 'custom-dates':
      html += generateTransactionsTable(data.transactions);
      break;
    case 'categories':
    case 'category-filter':
    case 'profit-loss':
      html += generateCategoryTables(data.incomeCategories, data.expenseCategories);
      break;
    case 'needs-desires':
      html += generateNeedsDesiresContent(data);
      break;
    case 'payments':
      html += generatePaymentsContent(data);
      break;
    case 'ignored':
      html += generateTransactionsTable(data.transactions, 'Ignored Transactions');
      break;
    case 'monthly':
      html += generateMonthlyTable(data.months);
      break;
    case 'account-summary':
      html += generateAccountsTable(data.accounts);
      break;
    case 'year-over-year':
      html += generateYearOverYearContent(data);
      break;
    case 'savings-rate':
      html += generateSavingsRateContent(data);
      break;
    case 'spending-trends':
      html += generateSpendingTrendsContent(data);
      break;
    case 'income-sources':
      html += generateIncomeSourcesContent(data);
      break;
    case 'custom':
      html += generateCustomContent(data);
      break;
  }
  
  return html;
}

function generateTransactionsTable(transactions, title) {
  var html = '<div class="section">';
  if (title) html += '<h2>' + title + '</h2>';
  html += '<table><thead><tr>';
  html += '<th>Date</th><th>Account</th><th>Description</th><th>Category</th><th style="text-align: right;">Amount</th>';
  html += '</tr></thead><tbody>';
  
  transactions.forEach(function(tx) {
    var isIncome = tx.type === 'income';
    var amountClass = isIncome ? 'positive' : 'negative';
    var amountDisplay = isIncome ? '$' + formatNumber(Math.abs(tx.amount)) : '-$' + formatNumber(Math.abs(tx.amount));
    html += '<tr>';
    html += '<td>' + formatDate(tx.date) + '</td>';
    html += '<td>' + escapeHtml(tx.account) + '</td>';
    html += '<td>' + escapeHtml(tx.description) + '</td>';
    html += '<td>' + escapeHtml(tx.category) + '</td>';
    html += '<td class="amount ' + amountClass + '">' + amountDisplay + '</td>';
    html += '</tr>';
  });
  
  html += '</tbody></table></div>';
  return html;
}

function generateCategoryTables(incomeCategories, expenseCategories) {
  var html = '';
  
  // Income categories
  html += '<div class="section"><h2>Income by Category</h2>';
  html += '<table><thead><tr><th>Category</th><th style="text-align: center;">Transactions</th><th style="text-align: right;">Amount</th><th style="text-align: right;">% of Total</th></tr></thead><tbody>';
  
  var totalIncome = 0;
  incomeCategories.forEach(function(cat) { totalIncome += cat.total; });
  
  incomeCategories.forEach(function(cat) {
    var pct = totalIncome > 0 ? ((cat.total / totalIncome) * 100).toFixed(1) : '0';
    html += '<tr class="category-row">';
    html += '<td>' + escapeHtml(cat.category) + '</td>';
    html += '<td style="text-align: center;">' + cat.count + '</td>';
    html += '<td class="amount positive">$' + formatNumber(cat.total) + '</td>';
    html += '<td class="amount">' + pct + '%</td>';
    html += '</tr>';
  });
  
  html += '<tr class="total-row"><td>TOTAL INCOME</td><td></td><td class="amount positive">$' + formatNumber(totalIncome) + '</td><td class="amount">100%</td></tr>';
  html += '</tbody></table></div>';
  
  // Expense categories
  html += '<div class="section"><h2>Expenses by Category</h2>';
  html += '<table><thead><tr><th>Category</th><th style="text-align: center;">Transactions</th><th style="text-align: right;">Amount</th><th style="text-align: right;">% of Total</th></tr></thead><tbody>';
  
  var totalExpenses = 0;
  expenseCategories.forEach(function(cat) { totalExpenses += cat.total; });
  
  expenseCategories.forEach(function(cat) {
    var pct = totalExpenses > 0 ? ((cat.total / totalExpenses) * 100).toFixed(1) : '0';
    html += '<tr class="category-row">';
    html += '<td>' + escapeHtml(cat.category) + '</td>';
    html += '<td style="text-align: center;">' + cat.count + '</td>';
    html += '<td class="amount negative">-$' + formatNumber(cat.total) + '</td>';
    html += '<td class="amount">' + pct + '%</td>';
    html += '</tr>';
  });
  
  html += '<tr class="total-row"><td>TOTAL EXPENSES</td><td></td><td class="amount negative">-$' + formatNumber(totalExpenses) + '</td><td class="amount">100%</td></tr>';
  html += '</tbody></table></div>';
  
  return html;
}

function generateNeedsDesiresContent(data) {
  var html = '<div class="section"><h2>Needs</h2>';
  html += '<p style="margin-bottom: 16px; color: #444444;">Essential expenses for daily living</p>';
  html += '<table><thead><tr><th>Type</th><th style="text-align: center;">Count</th><th style="text-align: right;">Amount</th></tr></thead><tbody>';
  html += '<tr><td>Income</td><td style="text-align: center;">' + data.needs.income.length + '</td><td class="amount positive">$' + formatNumber(sumTransactions(data.needs.income)) + '</td></tr>';
  html += '<tr><td>Expenses</td><td style="text-align: center;">' + data.needs.expenses.length + '</td><td class="amount negative">-$' + formatNumber(sumTransactions(data.needs.expenses)) + '</td></tr>';
  var needsNet = sumTransactions(data.needs.income) - sumTransactions(data.needs.expenses);
  var needsNetClass = needsNet >= 0 ? 'positive' : 'negative';
  var needsNetDisplay = needsNet >= 0 ? '$' + formatNumber(needsNet) : '-$' + formatNumber(Math.abs(needsNet));
  html += '<tr class="total-row"><td>Net</td><td></td><td class="amount ' + needsNetClass + '">' + needsNetDisplay + '</td></tr>';
  html += '</tbody></table></div>';
  
  html += '<div class="section"><h2>Desires (Wants)</h2>';
  html += '<p style="margin-bottom: 16px; color: #444444;">Non-essential spending for enjoyment</p>';
  html += '<table><thead><tr><th>Type</th><th style="text-align: center;">Count</th><th style="text-align: right;">Amount</th></tr></thead><tbody>';
  html += '<tr><td>Income</td><td style="text-align: center;">' + data.desires.income.length + '</td><td class="amount positive">$' + formatNumber(sumTransactions(data.desires.income)) + '</td></tr>';
  html += '<tr><td>Expenses</td><td style="text-align: center;">' + data.desires.expenses.length + '</td><td class="amount negative">-$' + formatNumber(sumTransactions(data.desires.expenses)) + '</td></tr>';
  var desiresNet = sumTransactions(data.desires.income) - sumTransactions(data.desires.expenses);
  var desiresNetClass = desiresNet >= 0 ? 'positive' : 'negative';
  var desiresNetDisplay = desiresNet >= 0 ? '$' + formatNumber(desiresNet) : '-$' + formatNumber(Math.abs(desiresNet));
  html += '<tr class="total-row"><td>Net</td><td></td><td class="amount ' + desiresNetClass + '">' + desiresNetDisplay + '</td></tr>';
  html += '</tbody></table></div>';
  
  return html;
}

function generatePaymentsContent(data) {
  var html = '<div class="section"><h2>Transfers</h2>';
  html += generateTransactionsTable(data.transfers);
  html += '</div>';
  
  html += '<div class="section"><h2>Credit Card Payments</h2>';
  html += generateTransactionsTable(data.ccPayments);
  html += '</div>';
  
  return html;
}

function generateMonthlyTable(months) {
  var html = '<div class="section"><h2>Monthly Breakdown</h2>';
  html += '<table><thead><tr><th>Month</th><th style="text-align: right;">Income</th><th style="text-align: right;">Expenses</th><th style="text-align: right;">Net</th></tr></thead><tbody>';
  
  var totalIncome = 0, totalExpenses = 0;
  months.forEach(function(m) {
    totalIncome += m.income;
    totalExpenses += m.expenses;
    var net = m.income - m.expenses;
    var netClass = net >= 0 ? 'positive' : 'negative';
    var netDisplay = net >= 0 ? '$' + formatNumber(net) : '-$' + formatNumber(Math.abs(net));
    html += '<tr>';
    html += '<td>' + formatMonthKey(m.month) + '</td>';
    html += '<td class="amount positive">$' + formatNumber(m.income) + '</td>';
    html += '<td class="amount negative">-$' + formatNumber(m.expenses) + '</td>';
    html += '<td class="amount ' + netClass + '">' + netDisplay + '</td>';
    html += '</tr>';
  });
  
  var totalNet = totalIncome - totalExpenses;
  var totalNetClass = totalNet >= 0 ? 'positive' : 'negative';
  var totalNetDisplay = totalNet >= 0 ? '$' + formatNumber(totalNet) : '-$' + formatNumber(Math.abs(totalNet));
  html += '<tr class="total-row"><td>TOTAL</td>';
  html += '<td class="amount positive">$' + formatNumber(totalIncome) + '</td>';
  html += '<td class="amount negative">-$' + formatNumber(totalExpenses) + '</td>';
  html += '<td class="amount ' + totalNetClass + '">' + totalNetDisplay + '</td></tr>';
  
  html += '</tbody></table></div>';
  return html;
}

function generateAccountsTable(accounts) {
  var html = '<div class="section"><h2>Account Breakdown</h2>';
  html += '<table><thead><tr><th>Account</th><th style="text-align: right;">Income</th><th style="text-align: right;">Expenses</th><th style="text-align: right;">Net</th><th style="text-align: center;">Transactions</th></tr></thead><tbody>';
  
  var totalIncome = 0, totalExpenses = 0, totalCount = 0;
  accounts.forEach(function(acc) {
    totalIncome += acc.income;
    totalExpenses += acc.expenses;
    totalCount += acc.count;
    var netClass = acc.net >= 0 ? 'positive' : 'negative';
    var netDisplay = acc.net >= 0 ? '$' + formatNumber(acc.net) : '-$' + formatNumber(Math.abs(acc.net));
    html += '<tr>';
    html += '<td>' + escapeHtml(acc.name) + '</td>';
    html += '<td class="amount positive">$' + formatNumber(acc.income) + '</td>';
    html += '<td class="amount negative">-$' + formatNumber(acc.expenses) + '</td>';
    html += '<td class="amount ' + netClass + '">' + netDisplay + '</td>';
    html += '<td style="text-align: center;">' + acc.count + '</td>';
    html += '</tr>';
  });
  
  var totalNet = totalIncome - totalExpenses;
  var totalNetClass = totalNet >= 0 ? 'positive' : 'negative';
  var totalNetDisplay = totalNet >= 0 ? '$' + formatNumber(totalNet) : '-$' + formatNumber(Math.abs(totalNet));
  html += '<tr class="total-row"><td>TOTAL</td>';
  html += '<td class="amount positive">$' + formatNumber(totalIncome) + '</td>';
  html += '<td class="amount negative">-$' + formatNumber(totalExpenses) + '</td>';
  html += '<td class="amount ' + totalNetClass + '">' + totalNetDisplay + '</td>';
  html += '<td style="text-align: center;">' + totalCount + '</td></tr>';
  
  html += '</tbody></table></div>';
  return html;
}

function generateYearOverYearContent(data) {
  var html = '<div class="section"><h2>Year Comparison: ' + data.thisYear.year + ' vs ' + data.lastYear.year + '</h2>';
  html += '<table><thead><tr><th>Metric</th><th>' + data.lastYear.year + '</th><th>' + data.thisYear.year + '</th><th>Change</th></tr></thead><tbody>';
  
  // Income row
  var incomeChange = data.changes.income;
  var incomeChangeClass = incomeChange >= 0 ? 'positive' : 'negative';
  html += '<tr>';
  html += '<td>Total Income</td>';
  html += '<td class="amount positive">$' + formatNumber(data.lastYear.income) + '</td>';
  html += '<td class="amount positive">$' + formatNumber(data.thisYear.income) + '</td>';
  html += '<td class="amount ' + incomeChangeClass + '">' + (incomeChange >= 0 ? '+' : '') + incomeChange.toFixed(1) + '%</td>';
  html += '</tr>';
  
  // Expenses row
  var expenseChange = data.changes.expenses;
  var expenseChangeClass = expenseChange <= 0 ? 'positive' : 'negative'; // Less expenses is good
  html += '<tr>';
  html += '<td>Total Expenses</td>';
  html += '<td class="amount negative">$' + formatNumber(data.lastYear.expenses) + '</td>';
  html += '<td class="amount negative">$' + formatNumber(data.thisYear.expenses) + '</td>';
  html += '<td class="amount ' + expenseChangeClass + '">' + (expenseChange >= 0 ? '+' : '') + expenseChange.toFixed(1) + '%</td>';
  html += '</tr>';
  
  // Net row
  var lastYearNetClass = data.lastYear.net >= 0 ? 'positive' : 'negative';
  var thisYearNetClass = data.thisYear.net >= 0 ? 'positive' : 'negative';
  html += '<tr class="total-row">';
  html += '<td>Net Balance</td>';
  html += '<td class="amount ' + lastYearNetClass + '">$' + formatNumber(data.lastYear.net) + '</td>';
  html += '<td class="amount ' + thisYearNetClass + '">$' + formatNumber(data.thisYear.net) + '</td>';
  html += '<td></td>';
  html += '</tr>';
  
  html += '</tbody></table></div>';
  return html;
}

function generateSavingsRateContent(data) {
  var html = '<div class="section"><h2>Overall Savings Summary</h2>';
  html += '<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;">';
  html += '<div style="background: #f8f6f3; padding: 20px; border-radius: 10px; text-align: center; border-left: 4px solid #567b84;">';
  html += '<div style="font-size: 11px; color: #5a6366; text-transform: uppercase;">Total Income</div>';
  html += '<div style="font-size: 24px; font-weight: 700; color: #2b9348;">$' + formatNumber(data.totalIncome) + '</div></div>';
  html += '<div style="background: #f8f6f3; padding: 20px; border-radius: 10px; text-align: center; border-left: 4px solid #ab9478;">';
  html += '<div style="font-size: 11px; color: #5a6366; text-transform: uppercase;">Total Expenses</div>';
  html += '<div style="font-size: 24px; font-weight: 700; color: #d00000;">$' + formatNumber(data.totalExpenses) + '</div></div>';
  html += '<div style="background: #f8f6f3; padding: 20px; border-radius: 10px; text-align: center; border-left: 4px solid #51cf66;">';
  html += '<div style="font-size: 11px; color: #5a6366; text-transform: uppercase;">Total Saved</div>';
  html += '<div style="font-size: 24px; font-weight: 700; color: ' + (data.totalSavings >= 0 ? '#2b9348' : '#d00000') + '">$' + formatNumber(Math.abs(data.totalSavings)) + '</div></div>';
  html += '<div style="background: #f8f6f3; padding: 20px; border-radius: 10px; text-align: center; border-left: 4px solid #567b84;">';
  html += '<div style="font-size: 11px; color: #5a6366; text-transform: uppercase;">Savings Rate</div>';
  html += '<div style="font-size: 24px; font-weight: 700; color: ' + (data.overallSavingsRate >= 0 ? '#2b9348' : '#d00000') + '">' + data.overallSavingsRate.toFixed(1) + '%</div></div>';
  html += '</div></div>';
  
  if (data.monthlyBreakdown && data.monthlyBreakdown.length > 0) {
    html += '<div class="section"><h2>Monthly Savings Breakdown</h2>';
    html += '<table><thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Saved</th><th>Rate</th></tr></thead><tbody>';
    data.monthlyBreakdown.forEach(function(m) {
      var rateClass = m.savingsRate >= 0 ? 'positive' : 'negative';
      html += '<tr>';
      html += '<td>' + formatMonthKey(m.month) + '</td>';
      html += '<td class="amount positive">$' + formatNumber(m.income) + '</td>';
      html += '<td class="amount negative">$' + formatNumber(m.expenses) + '</td>';
      html += '<td class="amount ' + (m.savings >= 0 ? 'positive' : 'negative') + '">$' + formatNumber(Math.abs(m.savings)) + '</td>';
      html += '<td class="amount ' + rateClass + '">' + m.savingsRate.toFixed(1) + '%</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
  }
  
  return html;
}

function generateSpendingTrendsContent(data) {
  var html = '';
  
  // Weekly trend
  if (data.weeklyTrend && data.weeklyTrend.length > 0) {
    html += '<div class="section"><h2>Weekly Spending Trend (Last 12 Weeks)</h2>';
    html += '<p style="margin-bottom: 16px; color: #5a6366;">Average weekly spending: <strong>$' + formatNumber(data.averageWeeklySpending) + '</strong></p>';
    html += '<table><thead><tr><th>Week</th><th>Transactions</th><th>Total Spent</th><th>vs Average</th></tr></thead><tbody>';
    data.weeklyTrend.forEach(function(w) {
      var diff = w.total - data.averageWeeklySpending;
      var diffClass = diff <= 0 ? 'positive' : 'negative';
      html += '<tr>';
      html += '<td>' + w.week + '</td>';
      html += '<td>' + w.count + '</td>';
      html += '<td class="amount negative">$' + formatNumber(w.total) + '</td>';
      html += '<td class="amount ' + diffClass + '">' + (diff >= 0 ? '+' : '-') + '$' + formatNumber(Math.abs(diff)) + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
  }
  
  // Top categories
  if (data.topCategories && data.topCategories.length > 0) {
    html += '<div class="section"><h2>Top Spending Categories</h2>';
    html += '<table><thead><tr><th>Category</th><th>Total Spent</th></tr></thead><tbody>';
    data.topCategories.forEach(function(cat) {
      html += '<tr>';
      html += '<td>' + escapeHtml(cat.category) + '</td>';
      html += '<td class="amount negative">$' + formatNumber(cat.total) + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
  }
  
  return html;
}

function generateIncomeSourcesContent(data) {
  var html = '<div class="section"><h2>Income Sources Overview</h2>';
  html += '<p style="margin-bottom: 16px; color: #5a6366;">Total Income: <strong>$' + formatNumber(data.totalIncome) + '</strong> from <strong>' + data.sourceCount + '</strong> source' + (data.sourceCount !== 1 ? 's' : '') + '</p>';
  html += '<table><thead><tr><th>Income Source</th><th>Transactions</th><th>Total</th><th>% of Income</th></tr></thead><tbody>';
  
  data.sources.forEach(function(source) {
    html += '<tr>';
    html += '<td>' + escapeHtml(source.source) + '</td>';
    html += '<td>' + source.count + '</td>';
    html += '<td class="amount positive">$' + formatNumber(source.total) + '</td>';
    html += '<td class="amount">' + source.percentage.toFixed(1) + '%</td>';
    html += '</tr>';
  });
  
  html += '</tbody></table></div>';
  return html;
}

function generateCustomContent(data) {
  var html = '';
  
  data.sections.forEach(function(section) {
    html += '<div class="section"><h2>' + section.title + '</h2>';
    
    switch(section.type) {
      case 'summary':
        html += '<p>Total: $' + formatNumber(section.data.total) + ' (' + section.data.count + ' transactions)</p>';
        break;
      case 'categories':
        html += generateCategoryTables(section.income, section.expenses);
        break;
      case 'transactions':
        html += generateTransactionsTable(section.data);
        break;
      case 'monthly':
        html += generateMonthlyTable(section.data);
        break;
      case 'accounts':
        html += generateAccountsTable(section.data);
        break;
      case 'needs-desires':
        html += generateNeedsDesiresContent(section.data);
        break;
      case 'business-split':
        html += '<p>Business Transactions: ' + section.business.length + '</p>';
        html += '<p>Personal Transactions: ' + section.personal.length + '</p>';
        break;
    }
    
    html += '</div>';
  });
  
  return html;
}

// ═══════════════════════════════════════════════════════════════════
// CLARITY AI PROMPT GENERATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Generate a report-specific Clarity AI prompt
 * @param {Object} reportData - The generated report data (contains reportType, startDate, endDate, stats)
 * @returns {Object} - { success, prompt }
 */
function generateClarityAIPrompt(reportData) {
  try {
    Logger.log('Generating Clarity AI prompt for report type: ' + reportData.reportType);
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var startDate = reportData.startDate ? new Date(reportData.startDate) : new Date(new Date().getFullYear(), 0, 1);
    var endDate = reportData.endDate ? new Date(reportData.endDate) : new Date();
    
    var incomeData = getTransactionData(ss, REPORT_CONFIG.SHEETS.INCOME, startDate, endDate);
    var expenseData = getTransactionData(ss, REPORT_CONFIG.SHEETS.EXPENSE, startDate, endDate);
    
    // Build report-specific prompt
    var prompt = buildReportSpecificPrompt(reportData.reportType, incomeData, expenseData, startDate, endDate, reportData.stats);
    
    Logger.log('Clarity AI prompt generated: ' + prompt.length + ' characters');
    return { success: true, prompt: prompt };
  } catch (e) {
    Logger.log('generateClarityAIPrompt error: ' + e.message);
    return { success: false, message: e.message };
  }
}

/**
 * Build a prompt specific to the report type
 * Each report type gets a completely unique prompt structure, questions, and focus
 */
function buildReportSpecificPrompt(reportType, incomeData, expenseData, startDate, endDate, stats) {
  var prompt = "";
  
  // Route to specific prompt builder based on report type
  // Each builder creates its own complete, unique prompt structure
  switch(reportType) {
    case 'all-transactions':
      prompt = buildAllTransactionsPrompt(incomeData, expenseData, startDate, endDate, stats);
      break;
    case 'profit-loss':
      prompt = buildProfitLossPrompt(incomeData, expenseData, startDate, endDate, stats);
      break;
    case 'needs-desires':
      prompt = buildNeedsDesiresPrompt(incomeData, expenseData, startDate, endDate, stats);
      break;
    case 'monthly':
      prompt = buildMonthlyPrompt(incomeData, expenseData, startDate, endDate, stats);
      break;
    case 'account-summary':
      prompt = buildAccountSummaryPrompt(incomeData, expenseData, startDate, endDate, stats);
      break;
    case 'payments':
      prompt = buildPaymentsPrompt(incomeData, expenseData, startDate, endDate, stats);
      break;
    case 'categories':
    case 'category-filter':
      prompt = buildCategoriesPrompt(incomeData, expenseData, startDate, endDate, stats);
      break;
    case 'income-sources':
      prompt = buildIncomeSourcesPrompt(incomeData, startDate, endDate, stats);
      break;
    case 'savings-rate':
      prompt = buildSavingsRatePrompt(incomeData, expenseData, startDate, endDate, stats);
      break;
    case 'spending-trends':
      prompt = buildSpendingTrendsPrompt(expenseData, startDate, endDate, stats);
      break;
    case 'ignored':
      prompt = buildIgnoredTransactionsPrompt(incomeData, expenseData, startDate, endDate, stats);
      break;
    case 'custom':
      prompt = buildCustomPrompt(incomeData, expenseData, startDate, endDate, stats);
      break;
    default:
      prompt = buildGeneralFinancialPrompt(incomeData, expenseData, startDate, endDate, stats);
  }
  
  return prompt;
}

/**
 * ALL TRANSACTIONS - Focus on finding anomalies, duplicates, and patterns in raw transaction data
 * UNIQUE FOCUS: Detective work - scanning every transaction for issues
 */
function buildAllTransactionsPrompt(incomeData, expenseData, startDate, endDate, stats) {
  var prompt = "🔍 TRANSACTION AUDIT REQUEST\n";
  prompt += "════════════════════════════════════════\n\n";
  
  prompt += "I need you to act as my financial detective and carefully review my transaction list.\n\n";
  
  prompt += "📅 REVIEW PERIOD: " + formatDate(startDate) + " → " + formatDate(endDate) + "\n\n";
  
  prompt += "QUICK NUMBERS:\n";
  prompt += "┌─────────────────────────────────────┐\n";
  prompt += "│ Money In:      $" + padLeft(formatNumber(stats.totalIncome), 15) + " │\n";
  prompt += "│ Money Out:    -$" + padLeft(formatNumber(stats.totalExpenses), 15) + " │\n";
  prompt += "│ What's Left:   $" + padLeft(formatNumber(Math.abs(stats.netProfit)), 15) + " │\n";
  prompt += "│ # of Transactions: " + padLeft(String(stats.transactionCount), 11) + " │\n";
  prompt += "└─────────────────────────────────────┘\n\n";
  
  // Show all transactions (limited to 50 for prompt size)
  var allTx = incomeData.concat(expenseData).sort(function(a,b) { return b.date - a.date; }).slice(0, 50);
  prompt += "📋 MY TRANSACTIONS (most recent " + allTx.length + "):\n";
  prompt += "──────────────────────────────────────────\n";
  allTx.forEach(function(tx, i) {
    var amt = tx.type === 'income' ? '+$' + formatNumber(tx.amount) : '-$' + formatNumber(Math.abs(tx.amount));
    prompt += (i+1) + ". " + formatDate(tx.date) + " | " + tx.description.substring(0,25) + " | " + tx.category + " | " + amt + "\n";
  });
  
  prompt += "\n════════════════════════════════════════\n";
  prompt += "🎯 YOUR MISSION - Please investigate:\n";
  prompt += "════════════════════════════════════════\n\n";
  
  prompt += "1️⃣ DUPLICATE DETECTIVE\n";
  prompt += "   Look for any duplicate charges, double billings, or suspicious repeated amounts.\n";
  prompt += "   → List any transactions that look like they might be duplicates.\n\n";
  
  prompt += "2️⃣ UNUSUAL ACTIVITY SCAN\n";
  prompt += "   Flag anything that seems unusual - odd amounts, unfamiliar merchants, or transactions that seem out of place.\n";
  prompt += "   → What transactions should I investigate further?\n\n";
  
  prompt += "3️⃣ HIDDEN SUBSCRIPTIONS\n";
  prompt += "   Find recurring charges I might have forgotten about.\n";
  prompt += "   → List any subscriptions or memberships you can identify.\n\n";
  
  prompt += "4️⃣ CATEGORIZATION ERRORS\n";
  prompt += "   Based on the description vs category, do any look miscategorized?\n";
  prompt += "   → Suggest better categories for any mismatches.\n\n";
  
  prompt += "────────────────────────────────────────\n";
  prompt += "💛 Style: Be direct and specific. Point to exact transactions by number.\n";
  prompt += "📚 For coaching support: risingandthriving.com/moneymastery\n";
  
  return prompt;
}

/**
 * PROFIT & LOSS - Focus on business health, profitability metrics, and strategic decisions
 * UNIQUE FOCUS: Business mindset - revenue, margins, profitability ratios
 */
function buildProfitLossPrompt(incomeData, expenseData, startDate, endDate, stats) {
  var prompt = "📈 PROFIT & LOSS ANALYSIS\n";
  prompt += "════════════════════════════════════════\n\n";
  
  prompt += "I need you to act as my business financial advisor and analyze my profitability.\n\n";
  
  prompt += "📅 STATEMENT PERIOD: " + formatDate(startDate) + " → " + formatDate(endDate) + "\n\n";
  
  // Calculate key business metrics
  var profitMargin = stats.totalIncome > 0 ? ((stats.netProfit / stats.totalIncome) * 100) : 0;
  var expenseRatio = stats.totalIncome > 0 ? ((stats.totalExpenses / stats.totalIncome) * 100) : 0;
  var isProfit = stats.netProfit >= 0;
  
  prompt += "═══════════ P&L STATEMENT ═══════════\n\n";
  prompt += "REVENUE (Gross Income)\n";
  prompt += "├── Total Revenue:        $" + formatNumber(stats.totalIncome) + "\n\n";
  prompt += "OPERATING EXPENSES\n";
  prompt += "├── Total Expenses:      -$" + formatNumber(stats.totalExpenses) + "\n\n";
  prompt += "                          ─────────────\n";
  prompt += (isProfit ? "NET PROFIT:               $" : "NET LOSS:                -$") + formatNumber(Math.abs(stats.netProfit)) + "\n";
  prompt += "                          ═════════════\n\n";
  
  prompt += "KEY RATIOS:\n";
  prompt += "• Profit Margin: " + profitMargin.toFixed(1) + "% " + (profitMargin >= 20 ? "✓ Healthy" : profitMargin >= 10 ? "⚠ Average" : "⚡ Needs attention") + "\n";
  prompt += "• Expense Ratio: " + expenseRatio.toFixed(1) + "% of revenue goes to expenses\n";
  prompt += "• Transactions: " + stats.transactionCount + " in this period\n\n";
  
  // Income breakdown
  var incomeByCategory = sortCategoryData(groupByCategory(incomeData));
  prompt += "💵 REVENUE STREAMS:\n";
  prompt += "──────────────────────────────────────\n";
  incomeByCategory.forEach(function(cat, i) {
    var pct = stats.totalIncome > 0 ? ((cat.total / stats.totalIncome) * 100).toFixed(1) : 0;
    prompt += (i+1) + ". " + cat.category + "\n";
    prompt += "   → $" + formatNumber(cat.total) + " (" + pct + "% of revenue) | " + cat.count + " transactions\n";
  });
  prompt += "\n";
  
  // Expense breakdown
  var expenseByCategory = sortCategoryData(groupByCategory(expenseData));
  prompt += "💸 EXPENSE BREAKDOWN:\n";
  prompt += "──────────────────────────────────────\n";
  expenseByCategory.forEach(function(cat, i) {
    var pct = stats.totalExpenses > 0 ? ((cat.total / stats.totalExpenses) * 100).toFixed(1) : 0;
    prompt += (i+1) + ". " + cat.category + "\n";
    prompt += "   → -$" + formatNumber(cat.total) + " (" + pct + "% of expenses) | " + cat.count + " transactions\n";
  });
  
  prompt += "\n════════════════════════════════════════\n";
  prompt += "🎯 STRATEGIC ANALYSIS NEEDED:\n";
  prompt += "════════════════════════════════════════\n\n";
  
  prompt += "1️⃣ PROFITABILITY HEALTH CHECK\n";
  prompt += "   My profit margin is " + profitMargin.toFixed(1) + "%. Is this healthy?\n";
  prompt += "   → What should my target margin be, and how do I get there?\n\n";
  
  prompt += "2️⃣ REVENUE CONCENTRATION RISK\n";
  prompt += "   Looking at my income sources, am I too dependent on one stream?\n";
  prompt += "   → What's the risk and how should I diversify?\n\n";
  
  prompt += "3️⃣ EXPENSE OPTIMIZATION\n";
  prompt += "   Which expense categories are eating into my profits the most?\n";
  prompt += "   → Give me the TOP 3 expenses I should reduce and by how much.\n\n";
  
  prompt += "4️⃣ GROWTH VS COST-CUTTING\n";
  prompt += "   Based on this P&L, should I focus on increasing revenue or cutting costs?\n";
  prompt += "   → Give me a specific 90-day action plan with 3 concrete steps.\n\n";
  
  prompt += "────────────────────────────────────────\n";
  prompt += "💛 Style: Be strategic and data-driven. Think like a CFO.\n";
  prompt += "📚 For business coaching: risingandthriving.com/moneymastery\n";
  
  return prompt;
}

/**
 * NEEDS VS DESIRES - Focus on spending priorities, lifestyle alignment, and values
 * UNIQUE FOCUS: Life coach mindset - do my spending habits match my values?
 */
function buildNeedsDesiresPrompt(incomeData, expenseData, startDate, endDate, stats) {
  var prompt = "💜 NEEDS VS WANTS: VALUES ALIGNMENT CHECK\n";
  prompt += "════════════════════════════════════════\n\n";
  
  prompt += "I need you to act as my life coach and help me understand if my spending aligns with my values.\n\n";
  
  prompt += "📅 PERIOD: " + formatDate(startDate) + " → " + formatDate(endDate) + "\n\n";
  
  // Categorize expenses
  var needs = expenseData.filter(function(tx) { return (tx.needDesire || '').toLowerCase() === 'need'; });
  var desires = expenseData.filter(function(tx) { 
    var nd = (tx.needDesire || '').toLowerCase();
    return nd === 'desire' || nd === 'want'; 
  });
  var uncategorized = expenseData.filter(function(tx) { return !tx.needDesire || tx.needDesire === ''; });
  
  var needsTotal = sumTransactions(needs);
  var desiresTotal = sumTransactions(desires);
  var uncatTotal = sumTransactions(uncategorized);
  var totalExpenses = stats.totalExpenses || (needsTotal + desiresTotal + uncatTotal);
  
  var needsPct = totalExpenses > 0 ? ((needsTotal / totalExpenses) * 100) : 0;
  var desiresPct = totalExpenses > 0 ? ((desiresTotal / totalExpenses) * 100) : 0;
  var savingsRate = stats.totalIncome > 0 ? ((stats.netProfit / stats.totalIncome) * 100) : 0;
  
  prompt += "═══════════ THE BIG PICTURE ═══════════\n\n";
  prompt += "Monthly Income:    $" + formatNumber(stats.totalIncome) + "\n";
  prompt += "Total Spending:   -$" + formatNumber(stats.totalExpenses) + "\n";
  prompt += "What I Kept:       $" + formatNumber(Math.abs(stats.netProfit)) + " (" + savingsRate.toFixed(0) + "%)\n\n";
  
  prompt += "═══════ HOW I SPENT MY MONEY ═══════\n\n";
  // Visual breakdown
  var needsBar = Math.round(needsPct / 5);
  var desiresBar = Math.round(desiresPct / 5);
  
  prompt += "NEEDS (must-haves):\n";
  prompt += "   $" + formatNumber(needsTotal) + " | " + needsPct.toFixed(0) + "% | " + "█".repeat(needsBar) + "░".repeat(20-needsBar) + "\n";
  prompt += "   (" + needs.length + " transactions)\n\n";
  
  prompt += "WANTS (nice-to-haves):\n";
  prompt += "   $" + formatNumber(desiresTotal) + " | " + desiresPct.toFixed(0) + "% | " + "█".repeat(desiresBar) + "░".repeat(20-desiresBar) + "\n";
  prompt += "   (" + desires.length + " transactions)\n\n";
  
  if (uncategorized.length > 0) {
    prompt += "⚠️ UNTAGGED: $" + formatNumber(uncatTotal) + " (" + uncategorized.length + " items need Need/Want tags)\n\n";
  }
  
  // Top needs
  var topNeeds = sortCategoryData(groupByCategory(needs)).slice(0, 5);
  if (topNeeds.length > 0) {
    prompt += "🏠 WHERE MY NEEDS MONEY GOES:\n";
    prompt += "──────────────────────────────────────\n";
    topNeeds.forEach(function(cat, i) {
      prompt += (i+1) + ". " + cat.category + ": $" + formatNumber(cat.total) + " (" + cat.count + " times)\n";
    });
    prompt += "\n";
  }
  
  // Top desires
  var topDesires = sortCategoryData(groupByCategory(desires)).slice(0, 5);
  if (topDesires.length > 0) {
    prompt += "✨ WHERE MY WANTS MONEY GOES:\n";
    prompt += "──────────────────────────────────────\n";
    topDesires.forEach(function(cat, i) {
      prompt += (i+1) + ". " + cat.category + ": $" + formatNumber(cat.total) + " (" + cat.count + " times)\n";
    });
    prompt += "\n";
  }
  
  // 50/30/20 comparison
  var ideal50 = stats.totalIncome * 0.50;
  var ideal30 = stats.totalIncome * 0.30;
  var ideal20 = stats.totalIncome * 0.20;
  
  prompt += "═══════ 50/30/20 COMPARISON ═══════\n\n";
  prompt += "The 50/30/20 rule suggests:\n";
  prompt += "• 50% on Needs → $" + formatNumber(ideal50) + " (You spent: $" + formatNumber(needsTotal) + ")\n";
  prompt += "• 30% on Wants → $" + formatNumber(ideal30) + " (You spent: $" + formatNumber(desiresTotal) + ")\n";
  prompt += "• 20% to Savings → $" + formatNumber(ideal20) + " (You saved: $" + formatNumber(Math.max(0, stats.netProfit)) + ")\n\n";
  
  prompt += "════════════════════════════════════════\n";
  prompt += "🎯 HELP ME UNDERSTAND MY VALUES:\n";
  prompt += "════════════════════════════════════════\n\n";
  
  prompt += "1️⃣ THE BALANCE TEST\n";
  prompt += "   My split is " + needsPct.toFixed(0) + "% needs / " + desiresPct.toFixed(0) + "% wants / " + savingsRate.toFixed(0) + "% saved.\n";
  prompt += "   → Is this healthy? What adjustments would help?\n\n";
  
  prompt += "2️⃣ NEEDS IN DISGUISE\n";
  prompt += "   Look at my 'needs' list. Are any actually wants pretending to be needs?\n";
  prompt += "   → Call out specific items that might be lifestyle inflation.\n\n";
  
  prompt += "3️⃣ JOY AUDIT\n";
  prompt += "   Which 'wants' are truly bringing me happiness vs just habits?\n";
  prompt += "   → Which 2-3 wants should I keep guilt-free? Which could I cut without missing?\n\n";
  
  prompt += "4️⃣ VALUES MIRROR\n";
  prompt += "   Based on where my money actually goes, what does it say I value most?\n";
  prompt += "   → Does this match what I SAY matters to me?\n\n";
  
  prompt += "────────────────────────────────────────\n";
  prompt += "💛 Style: Be compassionate but honest. Help me see my blind spots.\n";
  prompt += "📚 For deeper values work: risingandthriving.com/moneymastery\n";
  
  return prompt;
}

/**
 * MONTHLY COMPARISON - Focus on trends, seasonality, momentum, and forecasting
 * UNIQUE FOCUS: Trend analyst - pattern recognition and future prediction
 */
function buildMonthlyPrompt(incomeData, expenseData, startDate, endDate, stats) {
  var prompt = "📊 MONTHLY TREND ANALYSIS\n";
  prompt += "════════════════════════════════════════\n\n";
  
  prompt += "I need you to act as my trend analyst and help me see patterns over time.\n\n";
  
  prompt += "📅 PERIOD: " + formatDate(startDate) + " → " + formatDate(endDate) + "\n\n";
  
  // Build monthly data
  var monthlyData = {};
  incomeData.forEach(function(tx) {
    var key = tx.date.getFullYear() + '-' + String(tx.date.getMonth() + 1).padStart(2, '0');
    if (!monthlyData[key]) monthlyData[key] = { income: 0, expenses: 0, txCount: 0 };
    monthlyData[key].income += tx.amount;
    monthlyData[key].txCount++;
  });
  expenseData.forEach(function(tx) {
    var key = tx.date.getFullYear() + '-' + String(tx.date.getMonth() + 1).padStart(2, '0');
    if (!monthlyData[key]) monthlyData[key] = { income: 0, expenses: 0, txCount: 0 };
    monthlyData[key].expenses += Math.abs(tx.amount);
    monthlyData[key].txCount++;
  });
  
  var sortedMonths = Object.keys(monthlyData).sort();
  
  prompt += "═══════════ MONTHLY BREAKDOWN ═══════════\n\n";
  prompt += "Month          | Income      | Expenses    | Net         | Trend\n";
  prompt += "───────────────┼─────────────┼─────────────┼─────────────┼───────\n";
  
  var prevNet = null;
  sortedMonths.forEach(function(month) {
    var m = monthlyData[month];
    var net = m.income - m.expenses;
    var trend = prevNet === null ? "—" : (net > prevNet ? "↑" : net < prevNet ? "↓" : "→");
    prompt += formatMonthKey(month) + "  | $" + padLeft(formatNumber(m.income), 10) + " | -$" + padLeft(formatNumber(m.expenses), 9) + " | " + (net >= 0 ? "$" : "-$") + padLeft(formatNumber(Math.abs(net)), 10) + " | " + trend + "\n";
    prevNet = net;
  });
  prompt += "\n";
  
  // Calculate averages and trends
  if (sortedMonths.length >= 2) {
    var totalIncome = 0, totalExpenses = 0;
    sortedMonths.forEach(function(m) {
      totalIncome += monthlyData[m].income;
      totalExpenses += monthlyData[m].expenses;
    });
    var avgIncome = totalIncome / sortedMonths.length;
    var avgExpenses = totalExpenses / sortedMonths.length;
    var avgNet = avgIncome - avgExpenses;
    
    // Find best and worst months
    var best = { month: '', net: -Infinity };
    var worst = { month: '', net: Infinity };
    sortedMonths.forEach(function(m) {
      var net = monthlyData[m].income - monthlyData[m].expenses;
      if (net > best.net) { best = { month: m, net: net }; }
      if (net < worst.net) { worst = { month: m, net: net }; }
    });
    
    prompt += "═══════════ KEY METRICS ═══════════\n\n";
    prompt += "Monthly Averages:\n";
    prompt += "• Avg Income:   $" + formatNumber(avgIncome) + "/month\n";
    prompt += "• Avg Expenses: -$" + formatNumber(avgExpenses) + "/month\n";
    prompt += "• Avg Net:      " + (avgNet >= 0 ? '+$' : '-$') + formatNumber(Math.abs(avgNet)) + "/month\n\n";
    
    prompt += "Performance Highlights:\n";
    prompt += "🏆 Best Month:  " + formatMonthKey(best.month) + " (net " + (best.net >= 0 ? '+$' : '-$') + formatNumber(Math.abs(best.net)) + ")\n";
    prompt += "⚠️ Worst Month: " + formatMonthKey(worst.month) + " (net " + (worst.net >= 0 ? '+$' : '-$') + formatNumber(Math.abs(worst.net)) + ")\n";
  }
  
  prompt += "\n════════════════════════════════════════\n";
  prompt += "🎯 TREND ANALYSIS QUESTIONS:\n";
  prompt += "════════════════════════════════════════\n\n";
  
  prompt += "1️⃣ TRAJECTORY CHECK\n";
  prompt += "   Looking at the arrows in my data, is my financial health improving, declining, or flat?\n";
  prompt += "   → Give me a clear verdict: Getting better / Getting worse / Holding steady\n\n";
  
  prompt += "2️⃣ PATTERN RECOGNITION\n";
  prompt += "   Do you see any seasonal patterns? Months that always spike or dip?\n";
  prompt += "   → Help me predict which months will be challenging.\n\n";
  
  prompt += "3️⃣ SUCCESS & FAILURE ANALYSIS\n";
  prompt += "   What made my best month successful? What went wrong in my worst month?\n";
  prompt += "   → Give me specific lessons I can apply every month.\n\n";
  
  prompt += "4️⃣ 6-MONTH FORECAST\n";
  prompt += "   If I continue on this exact trajectory, where will I be in 6 months?\n";
  prompt += "   → Give me a projection and ONE change that would improve it.\n\n";
  
  prompt += "────────────────────────────────────────\n";
  prompt += "💛 Style: Use data to tell my financial story. Show me the trend line.\n";
  prompt += "📚 For trend coaching: risingandthriving.com/moneymastery\n";
  
  return prompt;
}

/**
 * ACCOUNT SUMMARY - Focus on account management, organization, and money flow
 * UNIQUE FOCUS: Systems thinking - how does money flow through my accounts?
 */
function buildAccountSummaryPrompt(incomeData, expenseData, startDate, endDate, stats) {
  var prompt = "🏦 ACCOUNT STRUCTURE ANALYSIS\n";
  prompt += "════════════════════════════════════════\n\n";
  
  prompt += "I need you to act as my money systems consultant and analyze my account structure.\n\n";
  
  prompt += "📅 PERIOD: " + formatDate(startDate) + " → " + formatDate(endDate) + "\n\n";
  
  // Build account data
  var accountData = {};
  incomeData.forEach(function(tx) {
    var acct = tx.account || 'Unknown';
    if (!accountData[acct]) accountData[acct] = { income: 0, expenses: 0, count: 0, incomeCount: 0, expenseCount: 0 };
    accountData[acct].income += tx.amount;
    accountData[acct].incomeCount++;
    accountData[acct].count++;
  });
  expenseData.forEach(function(tx) {
    var acct = tx.account || 'Unknown';
    if (!accountData[acct]) accountData[acct] = { income: 0, expenses: 0, count: 0, incomeCount: 0, expenseCount: 0 };
    accountData[acct].expenses += Math.abs(tx.amount);
    accountData[acct].expenseCount++;
    accountData[acct].count++;
  });
  
  var accounts = Object.keys(accountData);
  
  prompt += "═══════ I HAVE " + accounts.length + " ACCOUNT(S) ═══════\n\n";
  
  accounts.forEach(function(acct, i) {
    var a = accountData[acct];
    var net = a.income - a.expenses;
    var flowType = a.income > a.expenses ? "Income Hub" : a.expenses > a.income ? "Spending Hub" : "Balanced";
    
    prompt += "ACCOUNT " + (i+1) + ": " + acct + "\n";
    prompt += "───────────────────────────────────────\n";
    prompt += "Type: " + flowType + "\n";
    prompt += "Money In:     $" + formatNumber(a.income) + " (" + a.incomeCount + " deposits)\n";
    prompt += "Money Out:   -$" + formatNumber(a.expenses) + " (" + a.expenseCount + " transactions)\n";
    prompt += "Net Flow:     " + (net >= 0 ? '+$' : '-$') + formatNumber(Math.abs(net)) + "\n";
    prompt += "Activity:     " + a.count + " total transactions\n\n";
  });
  
  // Calculate flow metrics
  var totalIn = stats.totalIncome;
  var totalOut = stats.totalExpenses;
  
  prompt += "═══════ MONEY FLOW SUMMARY ═══════\n\n";
  prompt += "Total Money Coming In:  $" + formatNumber(totalIn) + "\n";
  prompt += "Total Money Going Out: -$" + formatNumber(totalOut) + "\n";
  prompt += "Net Position:           " + (stats.netProfit >= 0 ? '+$' : '-$') + formatNumber(Math.abs(stats.netProfit)) + "\n\n";
  
  prompt += "════════════════════════════════════════\n";
  prompt += "🎯 SYSTEMS OPTIMIZATION QUESTIONS:\n";
  prompt += "════════════════════════════════════════\n\n";
  
  prompt += "1️⃣ ACCOUNT PURPOSE AUDIT\n";
  prompt += "   Does each account have a clear job? Are any redundant?\n";
  prompt += "   → Tell me if I should consolidate or if I need to separate accounts.\n\n";
  
  prompt += "2️⃣ MONEY FLOW ANALYSIS\n";
  prompt += "   Income lands in some accounts, expenses come from others.\n";
  prompt += "   → Is my money flowing efficiently or am I over-transferring?\n\n";
  
  prompt += "3️⃣ RED FLAG CHECK\n";
  prompt += "   Any accounts that look concerning? High outflow with no income?\n";
  prompt += "   → Flag any accounts that need my attention.\n\n";
  
  prompt += "4️⃣ IDEAL STRUCTURE\n";
  prompt += "   Based on my money patterns, what's the ideal account structure?\n";
  prompt += "   → Recommend a simple system (e.g., checking, savings, bills account).\n\n";
  
  prompt += "────────────────────────────────────────\n";
  prompt += "💛 Style: Think like a systems designer. Help me simplify.\n";
  prompt += "📚 For account setup help: risingandthriving.com/moneymastery\n";
  
  return prompt;
}

/**
 * PAYMENTS SUMMARY - Focus on transfers, credit card payments, debt, and cash flow management
 * UNIQUE FOCUS: Debt & payment advisor - are payments on track?
 */
function buildPaymentsPrompt(incomeData, expenseData, startDate, endDate, stats) {
  var prompt = "💳 PAYMENTS & TRANSFERS REVIEW\n";
  prompt += "════════════════════════════════════════\n\n";
  
  prompt += "I need you to act as my debt/payment specialist and review my transfers and payments.\n\n";
  
  prompt += "📅 PERIOD: " + formatDate(startDate) + " → " + formatDate(endDate) + "\n\n";
  
  // Find transfers and CC payments
  var transfers = expenseData.filter(function(tx) {
    return tx.category && (tx.category.indexOf('Transfer') > -1 || tx.category.indexOf('transfer') > -1);
  });
  var ccPayments = expenseData.filter(function(tx) {
    return tx.category && (tx.category.indexOf('CC Payment') > -1 || tx.category.indexOf('Credit Card') > -1);
  });
  
  // Also find loan payments
  var loanPayments = expenseData.filter(function(tx) {
    var desc = (tx.description || '').toLowerCase();
    var cat = (tx.category || '').toLowerCase();
    return desc.indexOf('loan') > -1 || cat.indexOf('loan') > -1 || 
           desc.indexOf('mortgage') > -1 || cat.indexOf('mortgage') > -1;
  });
  
  var transferTotal = sumTransactions(transfers);
  var ccTotal = sumTransactions(ccPayments);
  var loanTotal = sumTransactions(loanPayments);
  
  prompt += "═══════ PAYMENT CATEGORIES ═══════\n\n";
  
  prompt += "📤 TRANSFERS (moving money between accounts):\n";
  prompt += "───────────────────────────────────────\n";
  prompt += "Total: $" + formatNumber(transferTotal) + " | " + transfers.length + " transactions\n";
  if (transfers.length > 0) {
    prompt += "\nRecent transfers:\n";
    transfers.sort(function(a,b) { return b.date - a.date; }).slice(0, 8).forEach(function(tx, i) {
      prompt += (i+1) + ". " + formatDate(tx.date) + " | " + tx.description.substring(0,30) + " | $" + formatNumber(Math.abs(tx.amount)) + "\n";
    });
  }
  prompt += "\n";
  
  prompt += "💳 CREDIT CARD PAYMENTS:\n";
  prompt += "───────────────────────────────────────\n";
  prompt += "Total: $" + formatNumber(ccTotal) + " | " + ccPayments.length + " payments\n";
  if (ccPayments.length > 0) {
    prompt += "\nRecent CC payments:\n";
    ccPayments.sort(function(a,b) { return b.date - a.date; }).slice(0, 8).forEach(function(tx, i) {
      prompt += (i+1) + ". " + formatDate(tx.date) + " | " + tx.description.substring(0,30) + " | $" + formatNumber(Math.abs(tx.amount)) + "\n";
    });
  }
  prompt += "\n";
  
  if (loanPayments.length > 0) {
    prompt += "🏠 LOAN/MORTGAGE PAYMENTS:\n";
    prompt += "───────────────────────────────────────\n";
    prompt += "Total: $" + formatNumber(loanTotal) + " | " + loanPayments.length + " payments\n";
    loanPayments.sort(function(a,b) { return b.date - a.date; }).slice(0, 5).forEach(function(tx, i) {
      prompt += (i+1) + ". " + formatDate(tx.date) + " | " + tx.description.substring(0,30) + " | $" + formatNumber(Math.abs(tx.amount)) + "\n";
    });
    prompt += "\n";
  }
  
  // Payment timing analysis
  prompt += "═══════ PAYMENT TIMING ═══════\n\n";
  var dayOfMonthCounts = {};
  ccPayments.concat(loanPayments).forEach(function(tx) {
    var day = tx.date.getDate();
    dayOfMonthCounts[day] = (dayOfMonthCounts[day] || 0) + 1;
  });
  var commonDays = Object.keys(dayOfMonthCounts).sort(function(a,b) { 
    return dayOfMonthCounts[b] - dayOfMonthCounts[a]; 
  }).slice(0, 3);
  
  if (commonDays.length > 0) {
    prompt += "Your payments typically fall on: " + commonDays.map(function(d) { return "day " + d; }).join(", ") + " of the month\n\n";
  }
  
  prompt += "════════════════════════════════════════\n";
  prompt += "🎯 PAYMENT HEALTH CHECK:\n";
  prompt += "════════════════════════════════════════\n\n";
  
  prompt += "1️⃣ TRANSFER EFFICIENCY\n";
  prompt += "   I made " + transfers.length + " transfers totaling $" + formatNumber(transferTotal) + ".\n";
  prompt += "   → Is this excessive movement? Am I overcomplicating my finances?\n\n";
  
  prompt += "2️⃣ CREDIT CARD BEHAVIOR\n";
  prompt += "   I paid $" + formatNumber(ccTotal) + " toward credit cards in " + ccPayments.length + " payments.\n";
  prompt += "   → Does this pattern suggest I'm paying in full or carrying debt?\n\n";
  
  prompt += "3️⃣ PAYMENT TIMING CHECK\n";
  prompt += "   Look at my payment dates. Any that seem late in the billing cycle?\n";
  prompt += "   → Am I at risk for late fees? Suggest optimal payment timing.\n\n";
  
  prompt += "4️⃣ AUTOMATION OPPORTUNITIES\n";
  prompt += "   Which payments should I automate to save time and avoid late fees?\n";
  prompt += "   → Give me a specific list of payments to put on autopilot.\n\n";
  
  prompt += "────────────────────────────────────────\n";
  prompt += "💛 Style: Be practical and action-oriented. Focus on optimization.\n";
  prompt += "📚 For debt management help: risingandthriving.com/moneymastery\n";
  
  return prompt;
}

/**
 * CUSTOM REPORT - Flexible analysis based on user's custom selection
 * UNIQUE FOCUS: Personalized coach - answer the user's specific question
 */
function buildCustomPrompt(incomeData, expenseData, startDate, endDate, stats) {
  var prompt = "✨ CUSTOM FINANCIAL ANALYSIS\n";
  prompt += "════════════════════════════════════════\n\n";
  
  prompt += "I've built a custom report with specific data I want analyzed.\n\n";
  
  prompt += "📅 PERIOD: " + formatDate(startDate) + " → " + formatDate(endDate) + "\n\n";
  
  prompt += "═══════════ MY NUMBERS ═══════════\n\n";
  prompt += "Money In:      $" + formatNumber(stats.totalIncome) + "\n";
  prompt += "Money Out:    -$" + formatNumber(stats.totalExpenses) + "\n";
  prompt += "Net Result:    " + (stats.netProfit >= 0 ? "$" : "-$") + formatNumber(Math.abs(stats.netProfit)) + "\n";
  prompt += "Transactions:  " + stats.transactionCount + "\n\n";
  
  // Include category breakdowns
  var expenseByCategory = sortCategoryData(groupByCategory(expenseData)).slice(0, 10);
  prompt += "📂 WHERE MY MONEY WENT:\n";
  prompt += "───────────────────────────────────────\n";
  expenseByCategory.forEach(function(cat, i) {
    prompt += (i+1) + ". " + cat.category + ": -$" + formatNumber(cat.total) + " (" + cat.count + " times)\n";
  });
  prompt += "\n";
  
  // Top transactions
  var topExpenses = expenseData.slice().sort(function(a,b) { return Math.abs(b.amount) - Math.abs(a.amount); }).slice(0, 5);
  prompt += "💰 MY BIGGEST EXPENSES:\n";
  prompt += "───────────────────────────────────────\n";
  topExpenses.forEach(function(tx, i) {
    prompt += (i+1) + ". " + tx.description.substring(0,30) + " → $" + formatNumber(Math.abs(tx.amount)) + " [" + tx.category + "]\n";
  });
  
  // Top income
  var topIncome = incomeData.slice().sort(function(a,b) { return b.amount - a.amount; }).slice(0, 5);
  if (topIncome.length > 0) {
    prompt += "\n💵 MY BIGGEST INCOME:\n";
    prompt += "───────────────────────────────────────\n";
    topIncome.forEach(function(tx, i) {
      prompt += (i+1) + ". " + tx.description.substring(0,30) + " → $" + formatNumber(tx.amount) + " [" + tx.category + "]\n";
    });
  }
  
  prompt += "\n════════════════════════════════════════\n";
  prompt += "🎯 PLEASE ANALYZE THIS FOR ME:\n";
  prompt += "════════════════════════════════════════\n\n";
  
  prompt += "1️⃣ QUICK DIAGNOSIS\n";
  prompt += "   Based on this data, what's my financial health in one sentence?\n\n";
  
  prompt += "2️⃣ THREE KEY INSIGHTS\n";
  prompt += "   What are the 3 most important things you notice?\n\n";
  
  prompt += "3️⃣ RED FLAGS\n";
  prompt += "   What concerns you? What needs my immediate attention?\n\n";
  
  prompt += "4️⃣ THIS WEEK'S ACTIONS\n";
  prompt += "   Give me 2-3 specific things I can do THIS WEEK to improve.\n\n";
  
  prompt += "5️⃣ THE QUESTION I'M NOT ASKING\n";
  prompt += "   What should I be asking about my money that I might not realize?\n\n";
  
  prompt += "────────────────────────────────────────\n";
  prompt += "💛 Style: Be my supportive financial coach. Direct but kind.\n";
  prompt += "📚 For 1:1 coaching: risingandthriving.com/moneymastery\n";
  
  return prompt;
}

/**
 * CATEGORIES BREAKDOWN - Focus on where money is going by category
 * UNIQUE FOCUS: Spending detective - which categories need attention?
 */
function buildCategoriesPrompt(incomeData, expenseData, startDate, endDate, stats) {
  var prompt = "📂 CATEGORY DEEP DIVE\n";
  prompt += "════════════════════════════════════════\n\n";
  
  prompt += "I want to understand exactly where my money is going by category.\n\n";
  
  prompt += "📅 PERIOD: " + formatDate(startDate) + " → " + formatDate(endDate) + "\n\n";
  
  // Income categories
  var incomeByCategory = sortCategoryData(groupByCategory(incomeData));
  prompt += "💵 INCOME BY CATEGORY:\n";
  prompt += "───────────────────────────────────────\n";
  if (incomeByCategory.length > 0) {
    incomeByCategory.forEach(function(cat, i) {
      var pct = stats.totalIncome > 0 ? ((cat.total / stats.totalIncome) * 100).toFixed(1) : 0;
      prompt += (i+1) + ". " + cat.category + "\n";
      prompt += "   $" + formatNumber(cat.total) + " | " + pct + "% of income | " + cat.count + " transactions\n";
    });
  } else {
    prompt += "No income transactions in this period.\n";
  }
  prompt += "\nTotal Income: $" + formatNumber(stats.totalIncome) + "\n\n";
  
  // Expense categories
  var expenseByCategory = sortCategoryData(groupByCategory(expenseData));
  prompt += "💸 EXPENSES BY CATEGORY:\n";
  prompt += "───────────────────────────────────────\n";
  if (expenseByCategory.length > 0) {
    expenseByCategory.forEach(function(cat, i) {
      var pct = stats.totalExpenses > 0 ? ((cat.total / stats.totalExpenses) * 100).toFixed(1) : 0;
      var avgTx = cat.count > 0 ? (cat.total / cat.count).toFixed(0) : 0;
      prompt += (i+1) + ". " + cat.category + "\n";
      prompt += "   -$" + formatNumber(cat.total) + " | " + pct + "% of spending | " + cat.count + " transactions (avg $" + avgTx + " each)\n";
    });
  } else {
    prompt += "No expense transactions in this period.\n";
  }
  prompt += "\nTotal Expenses: -$" + formatNumber(stats.totalExpenses) + "\n";
  
  prompt += "\n════════════════════════════════════════\n";
  prompt += "🎯 CATEGORY ANALYSIS QUESTIONS:\n";
  prompt += "════════════════════════════════════════\n\n";
  
  prompt += "1️⃣ CATEGORY RANKING\n";
  prompt += "   Rank my expense categories from 'essential' to 'could cut'.\n";
  prompt += "   → Which categories are justified? Which seem high?\n\n";
  
  prompt += "2️⃣ OUTLIER DETECTION\n";
  prompt += "   Any category that seems disproportionately high or low?\n";
  prompt += "   → Flag categories that deserve a closer look.\n\n";
  
  prompt += "3️⃣ INCOME CONCENTRATION\n";
  prompt += "   How diversified is my income? Am I too dependent on one source?\n";
  prompt += "   → What's my risk if my top income source disappears?\n\n";
  
  prompt += "4️⃣ CATEGORY BUDGETS\n";
  prompt += "   Based on these numbers, suggest a monthly budget per category.\n";
  prompt += "   → What should I aim for in each category?\n\n";
  
  prompt += "────────────────────────────────────────\n";
  prompt += "💛 Style: Be analytical but accessible. No financial jargon.\n";
  prompt += "📚 For budget help: risingandthriving.com/moneymastery\n";
  
  return prompt;
}

/**
 * INCOME SOURCES - Focus on revenue diversification and income optimization
 * UNIQUE FOCUS: Revenue strategist - are income streams healthy?
 */
function buildIncomeSourcesPrompt(incomeData, startDate, endDate, stats) {
  var prompt = "💰 INCOME SOURCES ANALYSIS\n";
  prompt += "════════════════════════════════════════\n\n";
  
  prompt += "I want to understand and optimize my income streams.\n\n";
  
  prompt += "📅 PERIOD: " + formatDate(startDate) + " → " + formatDate(endDate) + "\n\n";
  
  var incomeByCategory = sortCategoryData(groupByCategory(incomeData));
  var totalIncome = stats.totalIncome;
  
  prompt += "═══════════ MY INCOME STREAMS ═══════════\n\n";
  prompt += "Total Income: $" + formatNumber(totalIncome) + "\n";
  prompt += "Number of Sources: " + incomeByCategory.length + "\n\n";
  
  if (incomeByCategory.length > 0) {
    // Calculate concentration
    var topSource = incomeByCategory[0];
    var topPct = totalIncome > 0 ? ((topSource.total / totalIncome) * 100) : 0;
    
    prompt += "⚡ CONCENTRATION ALERT:\n";
    if (topPct >= 80) {
      prompt += "   " + topPct.toFixed(0) + "% from one source - HIGH RISK\n\n";
    } else if (topPct >= 50) {
      prompt += "   " + topPct.toFixed(0) + "% from top source - MODERATE RISK\n\n";
    } else {
      prompt += "   Well diversified - no single source over 50%\n\n";
    }
    
    prompt += "BREAKDOWN:\n";
    prompt += "───────────────────────────────────────\n";
    incomeByCategory.forEach(function(cat, i) {
      var pct = totalIncome > 0 ? ((cat.total / totalIncome) * 100).toFixed(1) : 0;
      var bar = Math.round(parseFloat(pct) / 5);
      prompt += "\n" + (i+1) + ". " + cat.category + "\n";
      prompt += "   $" + formatNumber(cat.total) + " | " + pct + "% | " + "█".repeat(bar) + "░".repeat(20-bar) + "\n";
      prompt += "   (" + cat.count + " deposits)\n";
    });
  } else {
    prompt += "No income recorded in this period.\n";
  }
  
  prompt += "\n════════════════════════════════════════\n";
  prompt += "🎯 INCOME STRATEGY QUESTIONS:\n";
  prompt += "════════════════════════════════════════\n\n";
  
  prompt += "1️⃣ DIVERSIFICATION SCORE\n";
  prompt += "   How healthy is my income diversification?\n";
  prompt += "   → What happens if my biggest source disappears tomorrow?\n\n";
  
  prompt += "2️⃣ GROWTH OPPORTUNITIES\n";
  prompt += "   Looking at my existing streams, which could I grow?\n";
  prompt += "   → What's the easiest way to increase income by 10%?\n\n";
  
  prompt += "3️⃣ MISSING INCOME TYPES\n";
  prompt += "   What types of income am I NOT earning? (passive, side gig, investments)\n";
  prompt += "   → What income stream should I add next?\n\n";
  
  prompt += "4️⃣ STABILITY ASSESSMENT\n";
  prompt += "   How stable/predictable is my income based on this data?\n";
  prompt += "   → Am I at risk for income volatility?\n\n";
  
  prompt += "────────────────────────────────────────\n";
  prompt += "💛 Style: Think like an income strategist. Help me earn more.\n";
  prompt += "📚 For income coaching: risingandthriving.com/moneymastery\n";
  
  return prompt;
}

/**
 * SAVINGS RATE - Focus on savings behavior and wealth building
 * UNIQUE FOCUS: Wealth builder - am I saving enough?
 */
function buildSavingsRatePrompt(incomeData, expenseData, startDate, endDate, stats) {
  var prompt = "🏦 SAVINGS RATE ANALYSIS\n";
  prompt += "════════════════════════════════════════\n\n";
  
  prompt += "I want to understand if I'm saving enough and building wealth.\n\n";
  
  prompt += "📅 PERIOD: " + formatDate(startDate) + " → " + formatDate(endDate) + "\n\n";
  
  var savingsRate = stats.totalIncome > 0 ? ((stats.netProfit / stats.totalIncome) * 100) : 0;
  var isPositive = stats.netProfit >= 0;
  
  prompt += "═══════════ SAVINGS SNAPSHOT ═══════════\n\n";
  prompt += "Income:         $" + formatNumber(stats.totalIncome) + "\n";
  prompt += "Expenses:      -$" + formatNumber(stats.totalExpenses) + "\n";
  prompt += "                ────────────────\n";
  prompt += "Saved:          " + (isPositive ? "$" : "-$") + formatNumber(Math.abs(stats.netProfit)) + "\n\n";
  
  prompt += "📊 MY SAVINGS RATE: " + savingsRate.toFixed(1) + "%\n\n";
  
  // Visual comparison
  prompt += "How I Compare:\n";
  prompt += "───────────────────────────────────────\n";
  prompt += "Struggling:     0-5%   " + (savingsRate < 5 ? "← YOU ARE HERE" : "") + "\n";
  prompt += "Getting By:     5-10%  " + (savingsRate >= 5 && savingsRate < 10 ? "← YOU ARE HERE" : "") + "\n";
  prompt += "On Track:       10-15% " + (savingsRate >= 10 && savingsRate < 15 ? "← YOU ARE HERE" : "") + "\n";
  prompt += "Good:           15-20% " + (savingsRate >= 15 && savingsRate < 20 ? "← YOU ARE HERE" : "") + "\n";
  prompt += "Excellent:      20-30% " + (savingsRate >= 20 && savingsRate < 30 ? "← YOU ARE HERE" : "") + "\n";
  prompt += "Aggressive:     30%+   " + (savingsRate >= 30 ? "← YOU ARE HERE" : "") + "\n";
  
  // What savings could become
  prompt += "\n═══════════ SAVINGS POTENTIAL ═══════════\n\n";
  var monthlySavings = stats.netProfit;
  prompt += "At this rate, in...\n";
  prompt += "• 1 year:  $" + formatNumber(Math.abs(monthlySavings * 12)) + (isPositive ? " saved" : " in debt") + "\n";
  prompt += "• 5 years: $" + formatNumber(Math.abs(monthlySavings * 60)) + (isPositive ? " saved" : " in debt") + "\n";
  prompt += "• 10 years: $" + formatNumber(Math.abs(monthlySavings * 120)) + (isPositive ? " saved" : " in debt") + "\n";
  
  prompt += "\n════════════════════════════════════════\n";
  prompt += "🎯 SAVINGS QUESTIONS:\n";
  prompt += "════════════════════════════════════════\n\n";
  
  prompt += "1️⃣ SAVINGS GRADE\n";
  prompt += "   Give me a letter grade (A-F) for my savings rate.\n";
  prompt += "   → What grade should I be aiming for given my situation?\n\n";
  
  prompt += "2️⃣ SAVINGS BOOSTERS\n";
  prompt += "   What are the TOP 3 ways I could increase my savings rate?\n";
  prompt += "   → Be specific - which expenses to cut, by how much?\n\n";
  
  prompt += "3️⃣ EMERGENCY FUND CHECK\n";
  prompt += "   Do I have enough saved for emergencies? (3-6 months expenses)\n";
  prompt += "   → How long until I reach a 3-month emergency fund?\n\n";
  
  prompt += "4️⃣ RETIREMENT READINESS\n";
  prompt += "   Am I saving enough for retirement at this rate?\n";
  prompt += "   → What should my savings rate be for financial freedom?\n\n";
  
  prompt += "────────────────────────────────────────\n";
  prompt += "💛 Style: Be my wealth-building coach. Motivate me to save more.\n";
  prompt += "📚 For savings goals: risingandthriving.com/moneymastery\n";
  
  return prompt;
}

/**
 * SPENDING TRENDS - Focus on spending patterns and behavior change
 * UNIQUE FOCUS: Behavior analyst - what are my spending habits?
 */
function buildSpendingTrendsPrompt(expenseData, startDate, endDate, stats) {
  var prompt = "📉 SPENDING BEHAVIOR ANALYSIS\n";
  prompt += "════════════════════════════════════════\n\n";
  
  prompt += "I want to understand my spending habits and patterns.\n\n";
  
  prompt += "📅 PERIOD: " + formatDate(startDate) + " → " + formatDate(endDate) + "\n\n";
  
  prompt += "═══════════ SPENDING OVERVIEW ═══════════\n\n";
  prompt += "Total Spent: -$" + formatNumber(stats.totalExpenses) + "\n";
  prompt += "Transactions: " + expenseData.length + "\n";
  var avgTransaction = expenseData.length > 0 ? (stats.totalExpenses / expenseData.length) : 0;
  prompt += "Average Transaction: $" + formatNumber(avgTransaction) + "\n\n";
  
  // Spending by day of week
  var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var daySpending = [0, 0, 0, 0, 0, 0, 0];
  var dayCounts = [0, 0, 0, 0, 0, 0, 0];
  expenseData.forEach(function(tx) {
    var day = tx.date.getDay();
    daySpending[day] += Math.abs(tx.amount);
    dayCounts[day]++;
  });
  
  prompt += "📅 SPENDING BY DAY OF WEEK:\n";
  prompt += "───────────────────────────────────────\n";
  dayNames.forEach(function(name, i) {
    var bar = dayCounts[i] > 0 ? Math.round(daySpending[i] / 100) : 0;
    bar = Math.min(bar, 20);
    prompt += name.substring(0,3) + ": $" + padLeft(formatNumber(daySpending[i]), 10) + " | " + "█".repeat(bar) + "\n";
  });
  
  // Top spending categories
  var expenseByCategory = sortCategoryData(groupByCategory(expenseData)).slice(0, 5);
  prompt += "\n🔥 TOP 5 SPENDING CATEGORIES:\n";
  prompt += "───────────────────────────────────────\n";
  expenseByCategory.forEach(function(cat, i) {
    var avgCat = cat.count > 0 ? (cat.total / cat.count) : 0;
    prompt += (i+1) + ". " + cat.category + ": $" + formatNumber(cat.total) + "\n";
    prompt += "   " + cat.count + " purchases, avg $" + formatNumber(avgCat) + " each\n";
  });
  
  // Small vs large purchases
  var small = expenseData.filter(function(tx) { return Math.abs(tx.amount) < 25; });
  var medium = expenseData.filter(function(tx) { return Math.abs(tx.amount) >= 25 && Math.abs(tx.amount) < 100; });
  var large = expenseData.filter(function(tx) { return Math.abs(tx.amount) >= 100; });
  
  prompt += "\n💳 TRANSACTION SIZE BREAKDOWN:\n";
  prompt += "───────────────────────────────────────\n";
  prompt += "Small (<$25):    " + small.length + " transactions = $" + formatNumber(sumTransactions(small)) + "\n";
  prompt += "Medium ($25-99): " + medium.length + " transactions = $" + formatNumber(sumTransactions(medium)) + "\n";
  prompt += "Large ($100+):   " + large.length + " transactions = $" + formatNumber(sumTransactions(large)) + "\n";
  
  prompt += "\n════════════════════════════════════════\n";
  prompt += "🎯 SPENDING BEHAVIOR QUESTIONS:\n";
  prompt += "════════════════════════════════════════\n\n";
  
  prompt += "1️⃣ SPENDING PERSONALITY\n";
  prompt += "   Based on this data, what type of spender am I?\n";
  prompt += "   → Am I impulsive, planned, emotional, or strategic?\n\n";
  
  prompt += "2️⃣ PATTERN PROBLEMS\n";
  prompt += "   What unhealthy spending patterns do you see?\n";
  prompt += "   → Which day of week or category needs attention?\n\n";
  
  prompt += "3️⃣ SMALL LEAKS\n";
  prompt += "   Are small purchases adding up? (latte factor)\n";
  prompt += "   → How much could I save by cutting small frequent purchases?\n\n";
  
  prompt += "4️⃣ BEHAVIOR CHANGE\n";
  prompt += "   What ONE spending habit should I change first?\n";
  prompt += "   → Give me a specific rule to follow (e.g., '24-hour rule for purchases over $50').\n\n";
  
  prompt += "────────────────────────────────────────\n";
  prompt += "💛 Style: Be a spending psychologist. Help me understand my triggers.\n";
  prompt += "📚 For spending coaching: risingandthriving.com/moneymastery\n";
  
  return prompt;
}

/**
 * IGNORED TRANSACTIONS - Focus on cleaning up and reviewing excluded items
 * UNIQUE FOCUS: Cleanup specialist - what am I ignoring and why?
 */
function buildIgnoredTransactionsPrompt(incomeData, expenseData, startDate, endDate, stats) {
  var prompt = "🔍 IGNORED & EXCLUDED REVIEW\n";
  prompt += "════════════════════════════════════════\n\n";
  
  prompt += "I want to review transactions I've marked as ignored or excluded.\n\n";
  
  prompt += "📅 PERIOD: " + formatDate(startDate) + " → " + formatDate(endDate) + "\n\n";
  
  // Find ignored transactions
  var allTx = incomeData.concat(expenseData);
  var ignored = allTx.filter(function(tx) {
    var cat = (tx.category || '').toLowerCase();
    return cat.indexOf('ignore') > -1 || cat.indexOf('exclude') > -1;
  });
  
  var transfers = allTx.filter(function(tx) {
    var cat = (tx.category || '').toLowerCase();
    return cat.indexOf('transfer') > -1;
  });
  
  prompt += "═══════════ EXCLUDED ITEMS ═══════════\n\n";
  
  prompt += "📋 IGNORED TRANSACTIONS: " + ignored.length + "\n";
  prompt += "───────────────────────────────────────\n";
  if (ignored.length > 0) {
    var ignoredTotal = sumTransactions(ignored);
    prompt += "Total: $" + formatNumber(ignoredTotal) + "\n\n";
    ignored.slice(0, 15).forEach(function(tx, i) {
      var amt = tx.type === 'income' ? '+$' + formatNumber(tx.amount) : '-$' + formatNumber(Math.abs(tx.amount));
      prompt += (i+1) + ". " + formatDate(tx.date) + " | " + tx.description.substring(0,25) + " | " + amt + "\n";
    });
  } else {
    prompt += "No ignored transactions found.\n";
  }
  
  prompt += "\n📤 TRANSFERS: " + transfers.length + "\n";
  prompt += "───────────────────────────────────────\n";
  if (transfers.length > 0) {
    var transferTotal = sumTransactions(transfers);
    prompt += "Total: $" + formatNumber(transferTotal) + "\n\n";
    transfers.slice(0, 10).forEach(function(tx, i) {
      var amt = tx.type === 'income' ? '+$' + formatNumber(tx.amount) : '-$' + formatNumber(Math.abs(tx.amount));
      prompt += (i+1) + ". " + formatDate(tx.date) + " | " + tx.description.substring(0,25) + " | " + amt + "\n";
    });
  } else {
    prompt += "No transfers found.\n";
  }
  
  prompt += "\n════════════════════════════════════════\n";
  prompt += "🎯 CLEANUP QUESTIONS:\n";
  prompt += "════════════════════════════════════════\n\n";
  
  prompt += "1️⃣ LEGITIMATE IGNORES\n";
  prompt += "   Are these items correctly marked as ignored?\n";
  prompt += "   → Which ones might actually need to be counted?\n\n";
  
  prompt += "2️⃣ TRANSFER ACCURACY\n";
  prompt += "   Do my transfers look balanced? (money out = money in elsewhere)\n";
  prompt += "   → Any transfers that look suspicious or miscategorized?\n\n";
  
  prompt += "3️⃣ HIDDEN SPENDING\n";
  prompt += "   Am I hiding real expenses by marking them as 'ignored'?\n";
  prompt += "   → What might I be avoiding looking at?\n\n";
  
  prompt += "4️⃣ CLEANUP RECOMMENDATIONS\n";
  prompt += "   What should I do with these excluded items?\n";
  prompt += "   → Give me a cleanup action plan.\n\n";
  
  prompt += "────────────────────────────────────────\n";
  prompt += "💛 Style: Be thorough but not judgmental. Help me clean up.\n";
  prompt += "📚 For organization help: risingandthriving.com/moneymastery\n";
  
  return prompt;
}

/**
 * GENERAL FINANCIAL PROMPT - Default fallback for unknown report types
 */
function buildGeneralFinancialPrompt(incomeData, expenseData, startDate, endDate, stats) {
  var prompt = "📊 FINANCIAL OVERVIEW\n";
  prompt += "════════════════════════════════════════\n\n";
  
  prompt += "Please help me understand my finances for this period.\n\n";
  
  prompt += "📅 PERIOD: " + formatDate(startDate) + " → " + formatDate(endDate) + "\n\n";
  
  prompt += "═══════════ SUMMARY ═══════════\n\n";
  prompt += "Total Income:     $" + formatNumber(stats.totalIncome) + "\n";
  prompt += "Total Expenses:  -$" + formatNumber(stats.totalExpenses) + "\n";
  prompt += "Net Balance:      " + (stats.netProfit >= 0 ? "$" : "-$") + formatNumber(Math.abs(stats.netProfit)) + "\n";
  prompt += "Transactions:     " + stats.transactionCount + "\n\n";
  
  var savingsRate = stats.totalIncome > 0 ? ((stats.netProfit / stats.totalIncome) * 100).toFixed(1) : 0;
  prompt += "Savings Rate: " + savingsRate + "%\n\n";
  
  // Top categories
  var expenseByCategory = sortCategoryData(groupByCategory(expenseData)).slice(0, 5);
  prompt += "TOP EXPENSE CATEGORIES:\n";
  prompt += "───────────────────────────────────────\n";
  expenseByCategory.forEach(function(cat, i) {
    prompt += (i+1) + ". " + cat.category + ": -$" + formatNumber(cat.total) + "\n";
  });
  
  prompt += "\n════════════════════════════════════════\n";
  prompt += "🎯 PLEASE TELL ME:\n";
  prompt += "════════════════════════════════════════\n\n";
  
  prompt += "1. What's your overall impression of my financial health?\n\n";
  prompt += "2. What's the #1 thing I should focus on improving?\n\n";
  prompt += "3. Give me 3 actionable tips for this week.\n\n";
  prompt += "4. What question should I be asking about my money?\n\n";
  
  prompt += "────────────────────────────────────────\n";
  prompt += "💛 Style: Be supportive, practical, and clear.\n";
  prompt += "📚 For personalized help: risingandthriving.com/moneymastery\n";
  
  return prompt;
}

// ═══════════════════════════════════════════════════════════════════
// EMAIL FUNCTIONALITY
// ═══════════════════════════════════════════════════════════════════

/**
 * Email a Clarity Report (text-based, no attachments)
 * @param {Object} reportData - The generated report
 * @param {string} recipientEmail - Email address
 * @param {string} personalMessage - Optional message
 * @returns {Object} - { success, message }
 */
function emailClarityReport(reportData, recipientEmail, personalMessage) {
  try {
    Logger.log('📧 Emailing report to: ' + recipientEmail);
    
    if (!reportData || !reportData.stats) {
      throw new Error('No report data to email');
    }
    
    var subject = 'Your Financial Report - Money Mastery';
    var emailBody = generateReportEmailBody(reportData, personalMessage);
    
    // Check if Resend is configured
    if (typeof RESEND_CONFIG !== 'undefined' && RESEND_CONFIG.API_KEY) {
      // Send via Resend (no attachments - just HTML body)
      var payload = {
        from: RESEND_CONFIG.FROM_NAME + ' <' + RESEND_CONFIG.FROM_EMAIL + '>',
        to: [recipientEmail],
        subject: subject,
        html: emailBody
      };
      
      var response = UrlFetchApp.fetch(RESEND_CONFIG.API_BASE + '/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + RESEND_CONFIG.API_KEY,
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      
      var responseCode = response.getResponseCode();
      if (responseCode === 200 || responseCode === 201) {
        Logger.log('✅ Report emailed via Resend');
        return { success: true, message: 'Report sent to ' + recipientEmail };
      } else {
        throw new Error('Resend API error: ' + response.getContentText());
      }
    } else {
      // Fallback to Gmail (no attachments - just HTML body)
      GmailApp.sendEmail(recipientEmail, subject, '', {
        htmlBody: emailBody,
        name: 'Money Mastery'
      });
      Logger.log('✅ Report emailed via Gmail');
      return { success: true, message: 'Report sent to ' + recipientEmail };
    }
    
  } catch (e) {
    Logger.log('❌ emailClarityReport error: ' + e.message);
    return { success: false, message: e.message };
  }
}

function generateReportEmailBody(reportData, personalMessage) {
  var stats = reportData.stats || {};
  
  var html = '<div style="font-family: Montserrat, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f6f3;">';
  
  // Header
  html += '<div style="background: linear-gradient(135deg, #567b84 0%, #4a6b73 100%); padding: 30px; text-align: center;">';
  html += '<h1 style="color: white; margin: 0; font-family: Georgia, serif; font-size: 28px;">Your Financial Report</h1>';
  html += '<p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Generated by Money Mastery</p>';
  html += '</div>';
  
  // Body
  html += '<div style="padding: 30px; background: white;">';
  
  if (personalMessage) {
    html += '<div style="background: #f8f6f3; padding: 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #ab9478;">';
    html += '<p style="margin: 0; color: #394144; font-size: 14px;">' + escapeHtml(personalMessage) + '</p>';
    html += '</div>';
  }
  
  html += '<p style="color: #394144; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Here\'s your financial summary:</p>';
  
  // Stats Table
  html += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">';
  
  if (stats.totalIncome !== undefined) {
    html += '<tr>';
    html += '<td style="padding: 16px; background: #f8f6f3; border-left: 4px solid #567b84; font-size: 12px; color: #5a6366; text-transform: uppercase;">Total Income</td>';
    html += '<td style="padding: 16px; background: #f8f6f3; text-align: right; font-size: 20px; font-weight: 700; color: #2b9348;">$' + formatNumber(stats.totalIncome) + '</td>';
    html += '</tr>';
  }
  
  if (stats.totalExpenses !== undefined) {
    html += '<tr>';
    html += '<td style="padding: 16px; background: white; border-left: 4px solid #ab9478; font-size: 12px; color: #5a6366; text-transform: uppercase;">Total Expenses</td>';
    html += '<td style="padding: 16px; background: white; text-align: right; font-size: 20px; font-weight: 700; color: #d00000;">$' + formatNumber(stats.totalExpenses) + '</td>';
    html += '</tr>';
  }
  
  if (stats.netProfit !== undefined) {
    var netColor = stats.netProfit >= 0 ? '#2b9348' : '#d00000';
    var netLabel = stats.netProfit >= 0 ? 'Net Savings' : 'Net Over Budget';
    html += '<tr>';
    html += '<td style="padding: 16px; background: #f8f6f3; border-left: 4px solid ' + netColor + '; font-size: 12px; color: #5a6366; text-transform: uppercase;">' + netLabel + '</td>';
    html += '<td style="padding: 16px; background: #f8f6f3; text-align: right; font-size: 20px; font-weight: 700; color: ' + netColor + ';">$' + formatNumber(Math.abs(stats.netProfit)) + '</td>';
    html += '</tr>';
  }
  
  if (stats.transactionCount !== undefined) {
    html += '<tr>';
    html += '<td style="padding: 16px; background: white; border-left: 4px solid #8a9093; font-size: 12px; color: #5a6366; text-transform: uppercase;">Total Transactions</td>';
    html += '<td style="padding: 16px; background: white; text-align: right; font-size: 20px; font-weight: 700; color: #394144;">' + stats.transactionCount + '</td>';
    html += '</tr>';
  }
  
  html += '</table>';
  
  html += '<p style="color: #5a6366; font-size: 14px; line-height: 1.6;">To download a full PDF report, visit your Money Mastery spreadsheet and use the Clarity AI & Reports tool.</p>';
  
  html += '</div>';
  
  // Footer
  html += '<div style="padding: 24px 30px; background: #f8f6f3; text-align: center; border-top: 1px solid #e8e4df;">';
  html += '<p style="margin: 0 0 12px; font-size: 14px; color: #394144;">Want more insights on your finances?</p>';
  html += '<a href="https://risingandthriving.com/membershiphub" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #ab9478, #8a7760); color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">Visit the Membership Hub</a>';
  html += '<p style="margin: 16px 0 0; font-size: 12px; color: #5a6366;">© 2026 Donna Roggio LLC. All Rights Reserved.<br>Created with the Money Mastery System</p>';
  html += '</div>';
  
  html += '</div>';
  return html;
}

// ═══════════════════════════════════════════════════════════════════
// SHARE REPORT VIA GOOGLE DRIVE LINK
// ═══════════════════════════════════════════════════════════════════

/**
 * Share a report via email with Google Doc or CSV link
 * @param {Object} reportData - The generated report data
 * @param {string} recipientEmail - Email address
 * @param {string} personalMessage - Optional message
 * @param {string} format - 'doc' or 'csv'
 * @returns {Object} - { success, message, fileUrl }
 */
function shareReportViaEmail(reportData, recipientEmail, personalMessage, format) {
  try {
    Logger.log('📤 Sharing report via ' + format + ' to: ' + recipientEmail);
    
    if (!reportData || !reportData.stats) {
      throw new Error('No report data to share');
    }
    
    // Get or create the Money Mastery Reports folder
    var folder = getOrCreateReportsFolder();
    
    // Generate the file
    var file;
    var fileName = generateReportFileName(reportData, format);
    
    if (format === 'csv') {
      file = createReportCSV(reportData, folder, fileName);
    } else {
      file = createReportGoogleDoc(reportData, folder, fileName);
    }
    
    // Set sharing to "Anyone with link can view"
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var fileUrl = file.getUrl();
    
    Logger.log('📄 File created: ' + fileUrl);
    
    // Send email with the link
    var emailResult = sendReportLinkEmail(recipientEmail, personalMessage, fileUrl, format, reportData);
    
    if (emailResult.success) {
      return { 
        success: true, 
        message: 'Report shared successfully', 
        fileUrl: fileUrl 
      };
    } else {
      return emailResult;
    }
    
  } catch (e) {
    Logger.log('❌ shareReportViaEmail error: ' + e.message);
    return { success: false, message: e.message };
  }
}

/**
 * Get or create the Money Mastery Reports folder in user's Drive
 */
function getOrCreateReportsFolder() {
  var folderName = 'Money Mastery Reports';
  var folders = DriveApp.getFoldersByName(folderName);
  
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return DriveApp.createFolder(folderName);
  }
}

/**
 * Generate a filename for the report
 */
function generateReportFileName(reportData, format) {
  var reportType = reportData.reportType || 'Financial';
  var typeNames = {
    'all-transactions': 'All_Transactions',
    'profit-loss': 'Profit_Loss',
    'needs-desires': 'Needs_vs_Desires',
    'monthly': 'Monthly_Comparison',
    'account-summary': 'Account_Summary',
    'payments': 'Payments_Summary',
    'custom': 'Custom_Report'
  };
  
  var typeName = typeNames[reportType] || 'Financial_Report';
  var dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var ext = format === 'csv' ? '' : ''; // Google Docs don't need extension
  
  return typeName + '_' + dateStr;
}

/**
 * Create a Google Doc report
 */
function createReportGoogleDoc(reportData, folder, fileName) {
  var doc = DocumentApp.create(fileName);
  var body = doc.getBody();
  
  // Get fresh transaction data
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var startDate = reportData.startDate ? new Date(reportData.startDate) : new Date(new Date().getFullYear(), 0, 1);
  var endDate = reportData.endDate ? new Date(reportData.endDate) : new Date();
  var incomeData = getTransactionData(ss, REPORT_CONFIG.SHEETS.INCOME, startDate, endDate);
  var expenseData = getTransactionData(ss, REPORT_CONFIG.SHEETS.EXPENSE, startDate, endDate);
  
  // Style settings
  var headerStyle = {};
  headerStyle[DocumentApp.Attribute.FONT_SIZE] = 24;
  headerStyle[DocumentApp.Attribute.BOLD] = true;
  headerStyle[DocumentApp.Attribute.FOREGROUND_COLOR] = '#456a73';
  
  var subheaderStyle = {};
  subheaderStyle[DocumentApp.Attribute.FONT_SIZE] = 11;
  subheaderStyle[DocumentApp.Attribute.FOREGROUND_COLOR] = '#666666';
  
  var sectionStyle = {};
  sectionStyle[DocumentApp.Attribute.FONT_SIZE] = 16;
  sectionStyle[DocumentApp.Attribute.BOLD] = true;
  sectionStyle[DocumentApp.Attribute.FOREGROUND_COLOR] = '#1a1a1a';
  
  // ═══════════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════════
  var header = body.appendParagraph('MONEY MASTERY');
  header.setAttributes(headerStyle);
  header.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  
  var tagline = body.appendParagraph('Financial Clarity System');
  tagline.setAttributes(subheaderStyle);
  tagline.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  
  body.appendParagraph('').appendHorizontalRule();
  
  // Report Title
  var title = body.appendParagraph(reportData.stats.reportTitle || 'Financial Report');
  title.setAttributes(sectionStyle);
  title.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  
  var dateRange = body.appendParagraph(formatDateRange(startDate, endDate));
  dateRange.setAttributes(subheaderStyle);
  dateRange.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  
  body.appendParagraph('');
  
  // ═══════════════════════════════════════════════════════════════════
  // SUMMARY TABLE
  // ═══════════════════════════════════════════════════════════════════
  var stats = reportData.stats || {};
  
  var summaryTable = body.appendTable();
  summaryTable.setBorderWidth(0);
  
  if (stats.totalIncome !== undefined) {
    var row = summaryTable.appendTableRow();
    row.appendTableCell('Total Income').setWidth(200);
    var incomeCell = row.appendTableCell('$' + formatNumber(stats.totalIncome));
    incomeCell.setAttributes({});
    incomeCell.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  }
  
  if (stats.totalExpenses !== undefined) {
    var row = summaryTable.appendTableRow();
    row.appendTableCell('Total Expenses').setWidth(200);
    var expenseCell = row.appendTableCell('-$' + formatNumber(stats.totalExpenses));
    expenseCell.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  }
  
  if (stats.netProfit !== undefined) {
    var row = summaryTable.appendTableRow();
    var netLabel = stats.netProfit >= 0 ? 'Net Balance' : 'Net (Over Budget)';
    var netValue = stats.netProfit >= 0 ? '$' + formatNumber(stats.netProfit) : '-$' + formatNumber(Math.abs(stats.netProfit));
    row.appendTableCell(netLabel).setWidth(200).setBold(true);
    var netCell = row.appendTableCell(netValue);
    netCell.setBold(true);
    netCell.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  }
  
  if (stats.transactionCount !== undefined) {
    var row = summaryTable.appendTableRow();
    row.appendTableCell('Total Transactions').setWidth(200);
    var countCell = row.appendTableCell(String(stats.transactionCount));
    countCell.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  }
  
  body.appendParagraph('');
  
  // ═══════════════════════════════════════════════════════════════════
  // TRANSACTIONS TABLE
  // ═══════════════════════════════════════════════════════════════════
  var allTransactions = incomeData.concat(expenseData);
  allTransactions.sort(function(a, b) { return b.date - a.date; });
  
  if (allTransactions.length > 0) {
    var transSection = body.appendParagraph('TRANSACTIONS');
    transSection.setAttributes(sectionStyle);
    body.appendParagraph('');
    
    var transTable = body.appendTable();
    
    // Header row
    var headerRow = transTable.appendTableRow();
    headerRow.appendTableCell('Date').setBold(true).setBackgroundColor('#f5f3f0');
    headerRow.appendTableCell('Description').setBold(true).setBackgroundColor('#f5f3f0');
    headerRow.appendTableCell('Category').setBold(true).setBackgroundColor('#f5f3f0');
    headerRow.appendTableCell('Amount').setBold(true).setBackgroundColor('#f5f3f0');
    
    // Limit to 100 transactions for readability
    var displayTransactions = allTransactions.slice(0, 100);
    
    displayTransactions.forEach(function(tx) {
      var row = transTable.appendTableRow();
      row.appendTableCell(formatDate(tx.date));
      row.appendTableCell(tx.description || '');
      row.appendTableCell(tx.category || 'Uncategorized');
      
      var amountStr = tx.type === 'income' ? '$' + formatNumber(tx.amount) : '-$' + formatNumber(Math.abs(tx.amount));
      var amountCell = row.appendTableCell(amountStr);
      amountCell.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    });
    
    if (allTransactions.length > 100) {
      body.appendParagraph('... and ' + (allTransactions.length - 100) + ' more transactions');
    }
  }
  
  body.appendParagraph('');
  body.appendParagraph('').appendHorizontalRule();
  
  // ═══════════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════════
  var footer1 = body.appendParagraph('This report was created with Money Mastery - the Financial Clarity System');
  footer1.setAttributes(subheaderStyle);
  footer1.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  
  var footer2 = body.appendParagraph('Learn more at risingandthriving.com/moneymastery');
  footer2.setAttributes(subheaderStyle);
  footer2.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  footer2.setLinkUrl('https://risingandthriving.com/moneymastery');
  
  body.appendParagraph('');
  
  var copyright = body.appendParagraph('© 2026 Donna Roggio LLC. All Rights Reserved.');
  copyright.setAttributes(subheaderStyle);
  copyright.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  
  // Save and move to folder
  doc.saveAndClose();
  var file = DriveApp.getFileById(doc.getId());
  file.moveTo(folder);
  
  return file;
}

/**
 * Create a CSV report with summary at top
 */
function createReportCSV(reportData, folder, fileName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var startDate = reportData.startDate ? new Date(reportData.startDate) : new Date(new Date().getFullYear(), 0, 1);
  var endDate = reportData.endDate ? new Date(reportData.endDate) : new Date();
  var incomeData = getTransactionData(ss, REPORT_CONFIG.SHEETS.INCOME, startDate, endDate);
  var expenseData = getTransactionData(ss, REPORT_CONFIG.SHEETS.EXPENSE, startDate, endDate);
  
  var stats = reportData.stats || {};
  var lines = [];
  
  // ═══════════════════════════════════════════════════════════════════
  // SUMMARY SECTION
  // ═══════════════════════════════════════════════════════════════════
  lines.push('MONEY MASTERY - FINANCIAL REPORT');
  lines.push('Generated: ' + formatDate(new Date()));
  lines.push('Period: ' + formatDateRange(startDate, endDate));
  lines.push('');
  lines.push('SUMMARY');
  lines.push('Total Income,$' + formatNumber(stats.totalIncome || 0));
  lines.push('Total Expenses,-$' + formatNumber(stats.totalExpenses || 0));
  var netValue = (stats.netProfit || 0) >= 0 ? '$' + formatNumber(stats.netProfit || 0) : '-$' + formatNumber(Math.abs(stats.netProfit || 0));
  lines.push('Net Balance,' + netValue);
  lines.push('Total Transactions,' + (stats.transactionCount || 0));
  lines.push('');
  lines.push('');
  
  // ═══════════════════════════════════════════════════════════════════
  // TRANSACTIONS SECTION
  // ═══════════════════════════════════════════════════════════════════
  lines.push('TRANSACTIONS');
  lines.push('Date,Account,Description,Category,Type,Amount');
  
  var allTransactions = incomeData.concat(expenseData);
  allTransactions.sort(function(a, b) { return b.date - a.date; });
  
  allTransactions.forEach(function(tx) {
    var amount = tx.type === 'income' ? tx.amount : -Math.abs(tx.amount);
    var line = [
      formatDate(tx.date),
      '"' + (tx.account || '').replace(/"/g, '""') + '"',
      '"' + (tx.description || '').replace(/"/g, '""') + '"',
      '"' + (tx.category || 'Uncategorized').replace(/"/g, '""') + '"',
      tx.type === 'income' ? 'Income' : 'Expense',
      amount.toFixed(2)
    ].join(',');
    lines.push(line);
  });
  
  lines.push('');
  lines.push('');
  lines.push('This report was created with Money Mastery - risingandthriving.com/moneymastery');
  lines.push('© 2026 Donna Roggio LLC. All Rights Reserved.');
  
  // Create file
  var csvContent = lines.join('\n');
  var file = folder.createFile(fileName + '.csv', csvContent, MimeType.CSV);
  
  return file;
}

/**
 * Send email with report link
 */
function sendReportLinkEmail(recipientEmail, personalMessage, fileUrl, format, reportData) {
  try {
    var stats = reportData.stats || {};
    var formatName = format === 'csv' ? 'CSV file' : 'Google Doc';
    var subject = 'Financial Report - Money Mastery';
    
    // Build email HTML
    var html = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">';
    
    // Header
    html += '<div style="background: linear-gradient(135deg, #456a73 0%, #3a5a62 100%); padding: 30px; text-align: center;">';
    html += '<h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">Financial Report</h1>';
    html += '<p style="color: #d4cfc7; margin: 8px 0 0; font-size: 13px;">Created with Money Mastery</p>';
    html += '</div>';
    
    // Body
    html += '<div style="padding: 30px;">';
    
    // Personal message
    if (personalMessage) {
      html += '<div style="background: #f5f3f0; padding: 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #9a8368;">';
      html += '<p style="margin: 0; color: #1a1a1a; font-size: 14px; line-height: 1.6;">' + escapeHtml(personalMessage) + '</p>';
      html += '</div>';
    }
    
    html += '<p style="color: #1a1a1a; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">A financial report has been shared with you. Click the button below to view or download.</p>';
    
    // Summary stats
    html += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">';
    if (stats.totalIncome !== undefined) {
      html += '<tr><td style="padding: 12px 0; border-bottom: 1px solid #e5e2dd; color: #333;">Total Income</td>';
      html += '<td style="padding: 12px 0; border-bottom: 1px solid #e5e2dd; text-align: right; font-weight: 700; color: #1a7a4c;">$' + formatNumber(stats.totalIncome) + '</td></tr>';
    }
    if (stats.totalExpenses !== undefined) {
      html += '<tr><td style="padding: 12px 0; border-bottom: 1px solid #e5e2dd; color: #333;">Total Expenses</td>';
      html += '<td style="padding: 12px 0; border-bottom: 1px solid #e5e2dd; text-align: right; font-weight: 700; color: #b91c1c;">-$' + formatNumber(stats.totalExpenses) + '</td></tr>';
    }
    if (stats.netProfit !== undefined) {
      var netColor = stats.netProfit >= 0 ? '#1a7a4c' : '#b91c1c';
      var netDisplay = stats.netProfit >= 0 ? '$' + formatNumber(stats.netProfit) : '-$' + formatNumber(Math.abs(stats.netProfit));
      html += '<tr style="background: #faf9f7;"><td style="padding: 12px 0; border-top: 2px solid #9a8368; border-bottom: 2px solid #9a8368; font-weight: 700; color: #1a1a1a;">Net Balance</td>';
      html += '<td style="padding: 12px 0; border-top: 2px solid #9a8368; border-bottom: 2px solid #9a8368; text-align: right; font-weight: 700; color: ' + netColor + ';">' + netDisplay + '</td></tr>';
    }
    html += '</table>';
    
    // View Report Button
    html += '<div style="text-align: center; margin: 30px 0;">';
    html += '<a href="' + fileUrl + '" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #456a73, #3a5a62); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">View ' + formatName + '</a>';
    html += '</div>';
    
    html += '<p style="color: #666; font-size: 13px; line-height: 1.6;">This link allows anyone to view the report. ' + (format === 'csv' ? 'You can download the CSV file for import into Excel or other software.' : 'You can also download it as PDF from Google Docs.') + '</p>';
    
    html += '</div>';
    
    // Footer with Money Mastery info
    html += '<div style="padding: 24px 30px; background: #f5f3f0; border-top: 1px solid #e5e2dd;">';
    html += '<p style="margin: 0 0 12px; font-size: 14px; color: #1a1a1a; text-align: center; font-weight: 600;">About Money Mastery</p>';
    html += '<p style="margin: 0 0 16px; font-size: 13px; color: #444; text-align: center; line-height: 1.5;">Money Mastery is a comprehensive financial clarity system that helps you track income, expenses, and gain insights into your finances.</p>';
    html += '<div style="text-align: center;">';
    html += '<a href="https://risingandthriving.com/moneymastery" style="display: inline-block; padding: 10px 24px; background: #9a8368; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px;">Learn More</a>';
    html += '</div>';
    html += '</div>';
    
    // Copyright
    html += '<div style="padding: 16px; text-align: center;">';
    html += '<p style="margin: 0; font-size: 11px; color: #888;">© 2026 Donna Roggio LLC. All Rights Reserved.</p>';
    html += '</div>';
    
    html += '</div>';
    
    // Send email
    if (typeof RESEND_CONFIG !== 'undefined' && RESEND_CONFIG.API_KEY) {
      var payload = {
        from: RESEND_CONFIG.FROM_NAME + ' <' + RESEND_CONFIG.FROM_EMAIL + '>',
        to: [recipientEmail],
        subject: subject,
        html: html
      };
      
      var response = UrlFetchApp.fetch(RESEND_CONFIG.API_BASE + '/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + RESEND_CONFIG.API_KEY,
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      
      var responseCode = response.getResponseCode();
      if (responseCode === 200 || responseCode === 201) {
        Logger.log('✅ Report link emailed via Resend');
        return { success: true };
      } else {
        throw new Error('Resend API error: ' + response.getContentText());
      }
    } else {
      GmailApp.sendEmail(recipientEmail, subject, '', {
        htmlBody: html,
        name: 'Money Mastery'
      });
      Logger.log('✅ Report link emailed via Gmail');
      return { success: true };
    }
    
  } catch (e) {
    Logger.log('❌ sendReportLinkEmail error: ' + e.message);
    return { success: false, message: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function sumTransactions(transactions) {
  return transactions.reduce(function(sum, tx) {
    return sum + Math.abs(tx.amount || 0);
  }, 0);
}

function sumByType(transactions, type) {
  return transactions.filter(function(tx) {
    return tx.type === type;
  }).reduce(function(sum, tx) {
    return sum + Math.abs(tx.amount || 0);
  }, 0);
}

function groupByCategory(transactions) {
  var groups = {};
  transactions.forEach(function(tx) {
    var cat = tx.category || 'Uncategorized';
    if (!groups[cat]) {
      groups[cat] = { category: cat, total: 0, count: 0 };
    }
    groups[cat].total += Math.abs(tx.amount);
    groups[cat].count++;
  });
  return groups;
}

function sortCategoryData(categoryGroups) {
  return Object.values(categoryGroups).sort(function(a, b) {
    return b.total - a.total;
  });
}

function isExcludedLabel(tx) {
  for (var i = 0; i < REPORT_CONFIG.EXCLUDED_LABELS.length; i++) {
    var label = REPORT_CONFIG.EXCLUDED_LABELS[i];
    if (tx.category && tx.category.indexOf(label) > -1) return true;
    if (tx.memo && tx.memo.indexOf(label) > -1) return true;
  }
  return false;
}

function formatNumber(num) {
  return Math.abs(num || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(date) {
  if (!date) return '';
  return Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'MMM dd, yyyy');
}

function formatDateRange(startDate, endDate) {
  return formatDate(startDate) + ' - ' + formatDate(endDate);
}

function formatDateForFilename(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function formatMonthKey(monthKey) {
  var parts = monthKey.split('-');
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[parseInt(parts[1]) - 1] + ' ' + parts[0];
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function(m) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m];
  });
}

/**
 * Pad a string to the left with spaces
 */
function padLeft(str, len) {
  str = String(str);
  while (str.length < len) {
    str = ' ' + str;
  }
  return str;
}

// ═══════════════════════════════════════════════════════════════════
// LEGACY COMPATIBILITY
// ═══════════════════════════════════════════════════════════════════

// Keep old function names working
function generateAllTransactionsReport(filters) {
  filters.reportType = 'all-transactions';
  return generateClarityReport(filters);
}

function generateProfitLossReport(filters) {
  filters.reportType = 'profit-loss';
  return generateClarityReport(filters);
}

function generateCategoryBreakdownReport(filters) {
  filters.reportType = 'categories';
  return generateClarityReport(filters);
}

function emailReport(reportType, reportData, recipientEmail) {
  return emailClarityReport(reportData, recipientEmail, '');
}
