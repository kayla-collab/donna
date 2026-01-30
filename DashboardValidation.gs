/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * DASHBOARD VALIDATION - Transaction Validation & Alerts
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * PURPOSE: Validate transactions for missing critical data
 * USED BY: DashboardHTML.html alerts modal
 * 
 * KEY FEATURES:
 * - Detects transactions missing required fields
 * - Ignores completely empty rows
 * - Provides detailed breakdown of issues
 * - Fast performance with batch operations
 */

// ═══════════════════════════════════════════════════════════════════
// TRANSACTION VALIDATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Validate if a transaction has problematic data
 * A transaction is problematic if:
 * 1. It has SOME data (not completely empty)
 * 2. It's missing one or more required fields (date, description, amount)
 * 
 * @param {Object} transaction - Transaction object with date, description, amount
 * @returns {Object} Validation result with issues array
 */
function isProblematicTransaction(transaction) {
  try {
    // Check if row has ANY data at all
    var hasAnyData = transaction.date || 
                     transaction.description || 
                     transaction.amount || 
                     transaction.category ||
                     transaction.account ||
                     transaction.notes;
    
    if (!hasAnyData) {
      return {
        isProblem: false,
        issues: []
      };
    }
    
    // Check for missing required fields
    var issues = [];
    
    // Check date
    var missingDate = !transaction.date || 
                      transaction.date === '' || 
                      transaction.date === null ||
                      String(transaction.date).trim() === '';
    
    if (missingDate) {
      issues.push('date');
    }
    
    // Check description
    var missingDescription = !transaction.description || 
                             String(transaction.description).trim() === '';
    
    if (missingDescription) {
      issues.push('description');
    }
    
    // Check amount
    var missingAmount = !transaction.amount || 
                        transaction.amount === 0 || 
                        transaction.amount === '' ||
                        isNaN(transaction.amount);
    
    if (missingAmount) {
      issues.push('amount');
    }
    
    return {
      isProblem: issues.length > 0,
      issues: issues,
      transaction: transaction
    };
    
  } catch (error) {
    Logger.log('Error validating transaction: ' + error.message);
    return {
      isProblem: false,
      issues: [],
      error: error.message
    };
  }
}

/**
 * Get all problematic transactions across all account sheets
 * Returns array of issues with details for dashboard alerts
 * 
 * @param {string} dateFilter - Optional date filter ('7days', '30days', '60days', '90days', 'ytd', 'all')
 * @returns {Object} Problematic transactions summary
 */
function MM_getProblematicTransactions(dateFilter) {
  try {
    Logger.log('🔍 Scanning for problematic transactions...');
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var allSheets = ss.getSheets();
    
    var problematicTransactions = [];
    var issueBreakdown = {
      missingDate: 0,
      missingDescription: 0,
      missingAmount: 0
    };
    
    // Get date range for filtering (if specified)
    var dateRange = null;
    if (dateFilter && dateFilter !== 'all') {
      dateRange = getDateRangeFromFilter(dateFilter);
    }
    
    // Scan all ACCOUNT sheets
    allSheets.forEach(function(sheet) {
      var sheetName = sheet.getName();
      
      // Only process ACCOUNT sheets
      if (!sheetName.match(/^ACCOUNT \d+$/i)) {
        return;
      }
      
      Logger.log('  Scanning: ' + sheetName);
      
      var lastRow = sheet.getLastRow();
      if (lastRow < 11) {
        return; // No transactions
      }
      
      // Read transaction data efficiently (batch operation)
      // Columns: B=Date, C=Description, D=Amount, E=Category
      var dataRange = sheet.getRange(11, 2, lastRow - 10, 4);
      var data = dataRange.getValues();
      
      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var rowNumber = 11 + i;
        
        var transaction = {
          sheet: sheetName,
          row: rowNumber,
          date: row[0],
          description: row[1],
          amount: row[2],
          category: row[3]
        };
        
        // Apply date filter if specified
        if (dateRange && transaction.date) {
          var transDate = new Date(transaction.date);
          if (transDate < dateRange.start || transDate > dateRange.end) {
            continue; // Skip transactions outside date range
          }
        }
        
        // Validate transaction
        var validation = isProblematicTransaction(transaction);
        
        if (validation.isProblem) {
          problematicTransactions.push({
            sheet: sheetName,
            row: rowNumber,
            date: transaction.date || '[MISSING]',
            description: transaction.description || '[MISSING]',
            amount: transaction.amount || '[MISSING]',
            issues: validation.issues
          });
          
          // Update breakdown
          validation.issues.forEach(function(issue) {
            if (issue === 'date') issueBreakdown.missingDate++;
            if (issue === 'description') issueBreakdown.missingDescription++;
            if (issue === 'amount') issueBreakdown.missingAmount++;
          });
        }
      }
    });
    
    Logger.log('✅ Scan complete: ' + problematicTransactions.length + ' problematic transactions found');
    
    return {
      count: problematicTransactions.length,
      transactions: problematicTransactions.slice(0, 100), // Limit to first 100 for performance
      breakdown: issueBreakdown,
      dateFilter: dateFilter || 'all'
    };
    
  } catch (error) {
    Logger.log('❌ Error scanning for problematic transactions: ' + error.message);
    return {
      count: 0,
      transactions: [],
      breakdown: { missingDate: 0, missingDescription: 0, missingAmount: 0 },
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// DATE FILTERING
// ═══════════════════════════════════════════════════════════════════

/**
 * Get date range from filter string
 * Supports: '7days', '30days', '60days', '90days', 'ytd', 'all'
 * 
 * @param {string} filter - Filter identifier
 * @returns {Object} Date range with start and end dates
 */
function getDateRangeFromFilter(filter) {
  var today = new Date();
  var startDate = new Date();
  var endDate = new Date(today);
  
  switch(filter) {
    case '7days':
      startDate.setDate(today.getDate() - 7);
      break;
      
    case '30days':
      startDate.setDate(today.getDate() - 30);
      break;
      
    case '60days':
      startDate.setDate(today.getDate() - 60);
      break;
      
    case '90days':
      startDate.setDate(today.getDate() - 90);
      break;
      
    case 'ytd':
      startDate = new Date(today.getFullYear(), 0, 1); // January 1st of current year
      break;
      
    case 'all':
    default:
      startDate = new Date(2020, 0, 1); // Far past date
      endDate = new Date(2030, 11, 31); // Far future date
      break;
  }
  
  return {
    start: startDate,
    end: endDate,
    filter: filter
  };
}

/**
 * Get transactions within specified date range
 * Used by dashboard for filtering transaction displays
 * 
 * @param {string} filter - Date filter ('7days', '30days', '60days', '90days', 'ytd', 'all')
 * @param {string} startDate - ISO date string for custom range (YYYY-MM-DD)
 * @param {string} endDate - ISO date string for custom range (YYYY-MM-DD)
 * @returns {Array} Filtered transactions
 */
function MM_getTransactionsByDateRange(filter, startDate, endDate) {
  try {
    Logger.log('📅 Getting transactions by date range: ' + filter);
    
    var dateRange;
    
    // Custom date range
    if (filter === 'custom' && startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate),
        filter: 'custom'
      };
    } else {
      // Predefined filter
      dateRange = getDateRangeFromFilter(filter);
    }
    
    Logger.log('  Date range: ' + dateRange.start.toISOString() + ' to ' + dateRange.end.toISOString());
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var allSheets = ss.getSheets();
    var transactions = [];
    
    // Scan all ACCOUNT sheets
    allSheets.forEach(function(sheet) {
      var sheetName = sheet.getName();
      
      if (!sheetName.match(/^ACCOUNT \d+$/i)) {
        return;
      }
      
      var lastRow = sheet.getLastRow();
      if (lastRow < 11) {
        return;
      }
      
      // Read transaction data
      var dataRange = sheet.getRange(11, 2, lastRow - 10, 5);
      var data = dataRange.getValues();
      
      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var transDate = new Date(row[0]);
        
        // Check if within date range
        if (transDate >= dateRange.start && transDate <= dateRange.end) {
          transactions.push({
            sheet: sheetName,
            row: 11 + i,
            date: row[0],
            description: row[1],
            amount: row[2],
            category: row[3],
            notes: row[4]
          });
        }
      }
    });
    
    Logger.log('✅ Found ' + transactions.length + ' transactions in date range');
    
    return {
      transactions: transactions,
      count: transactions.length,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
        filter: filter
      }
    };
    
  } catch (error) {
    Logger.log('❌ Error getting transactions by date: ' + error.message);
    return {
      transactions: [],
      count: 0,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get available date filter options
 * Returns array of filter objects for UI rendering
 * 
 * @returns {Array} Filter options
 */
function MM_getDateFilterOptions() {
  return [
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '60days', label: 'Last 60 Days' },
    { value: '90days', label: 'Last 90 Days' },
    { value: 'ytd', label: 'Year to Date' },
    { value: 'all', label: 'All Time' },
    { value: 'custom', label: 'Custom Range...' }
  ];
}
