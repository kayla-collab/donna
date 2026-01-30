/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * AI ASSISTANT - Financial Data for AI Prompts
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Provides financial data extraction for AI-powered features.
 * 
 * Column Layout (per ColumnConfig.gs):
 * C=Date, D=Description, E=Amount, F=Category, G=SpecialLabel
 * H=Memo, I=NeedDesire, J=SplitData, K=Receipt
 * Header Row: 10, Data starts: Row 11
 * 
 * Special Labels (excluded from totals): Ignore, Transfer, CC Payment
 */

// Special Labels that should be excluded from totals
var AI_SPECIAL_LABELS = ['Ignore', 'Transfer', 'CC Payment'];

/**
 * Get financial data for AI prompts
 * @returns {Object} - Financial summary data
 */
function getFinancialDataForAI() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Get all ACCOUNT sheets
    var sheets = ss.getSheets();
    var accountSheets = [];
    for (var i = 0; i < sheets.length; i++) {
      if (sheets[i].getName().indexOf('ACCOUNT') === 0) {
        accountSheets.push(sheets[i]);
      }
    }
    
    // Find active accounts (have account name in C7)
    var activeAccounts = [];
    for (var i = 0; i < accountSheets.length; i++) {
      try {
        var accountName = accountSheets[i].getRange('C7').getValue();
        if (accountName && String(accountName).trim() !== '') {
          activeAccounts.push(accountSheets[i]);
        }
      } catch (e) {
        // Skip sheets that can't be read
      }
    }
    
    // Calculate totals
    var totalIncome = 0;
    var totalExpenses = 0;
    var totalTransactions = 0;
    var accountBalances = [];
    var expensesByCategory = {};
    var incomeByCategory = {};
    var needsTotal = 0;
    var desiresTotal = 0;
    var recentTransactions = [];
    
    for (var a = 0; a < activeAccounts.length; a++) {
      var sheet = activeAccounts[a];
      try {
        var accountName = String(sheet.getRange('C7').getValue());
        var lastRow = sheet.getLastRow();
        
        if (lastRow < 11) continue; // Data starts at row 11
        
        // Get current balance from G7 if exists
        try {
          var balance = sheet.getRange('G7').getValue();
          if (balance && !isNaN(balance)) {
            accountBalances.push({
              name: accountName,
              balance: parseFloat(balance)
            });
          }
        } catch (e) {
          Logger.log('Balance error: ' + e.message);
        }
        
        // Get transactions: C=Date, D=Desc, E=Amount, F=Category, G=SpecialLabel, I=NeedDesire
        var dataRange = sheet.getRange(11, 3, lastRow - 10, 7); // Columns C-I
        var data = dataRange.getValues();
        
        for (var i = 0; i < data.length; i++) {
          var row = data[i];
          var date = row[0]; // Column C - Date
          var description = row[1]; // Column D - Description
          var amount = row[2]; // Column E - Amount
          var category = row[3]; // Column F - Category
          var specialLabel = String(row[4] || '').trim(); // Column G - Special Label
          var needDesire = String(row[6] || '').trim(); // Column I - Need/Desire
          
          // Skip empty rows
          if (!date || date === '') continue;
          
          // Skip transactions with Special Labels
          if (specialLabel && AI_SPECIAL_LABELS.indexOf(specialLabel) !== -1) {
            continue;
          }
          
          totalTransactions++;
          var amountNum = parseFloat(amount) || 0;
          
          // Determine income vs expense by amount sign
          if (amountNum > 0) {
            // Positive = Income
            totalIncome += amountNum;
            var incCat = category || 'Income';
            incomeByCategory[incCat] = (incomeByCategory[incCat] || 0) + amountNum;
          } else if (amountNum < 0) {
            // Negative = Expense
            totalExpenses += Math.abs(amountNum);
            var expCat = category || 'Uncategorized';
            expensesByCategory[expCat] = (expensesByCategory[expCat] || 0) + Math.abs(amountNum);
            
            // Track Needs vs Desires
            if (needDesire === 'Need') {
              needsTotal += Math.abs(amountNum);
            } else if (needDesire === 'Desire') {
              desiresTotal += Math.abs(amountNum);
            }
          }
          
          // Store recent transactions (first 10)
          if (recentTransactions.length < 10) {
            recentTransactions.push({
              date: Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'MM/dd/yyyy'),
              description: String(description),
              amount: amountNum,
              type: amountNum > 0 ? 'INCOME' : 'EXPENSE',
              category: category || 'None',
              needDesire: needDesire || ''
            });
          }
        }
        
      } catch (sheetError) {
        Logger.log('Sheet processing error: ' + sheetError.message);
      }
    }
    
    // Get top expenses
    var topExpenses = [];
    for (var cat in expensesByCategory) {
      topExpenses.push({ category: cat, amount: expensesByCategory[cat] });
    }
    topExpenses.sort(function(a, b) { return b.amount - a.amount; });
    topExpenses = topExpenses.slice(0, 10);
    
    // Get top income
    var topIncome = [];
    for (var cat in incomeByCategory) {
      topIncome.push({ category: cat, amount: incomeByCategory[cat] });
    }
    topIncome.sort(function(a, b) { return b.amount - a.amount; });
    topIncome = topIncome.slice(0, 5);
    
    return {
      totalAccounts: accountSheets.length,
      activeAccounts: activeAccounts.length,
      totalTransactions: totalTransactions,
      monthlyIncome: totalIncome,
      monthlyExpenses: totalExpenses,
      netIncome: totalIncome - totalExpenses,
      needsTotal: needsTotal,
      desiresTotal: desiresTotal,
      accountBalances: accountBalances,
      topExpenses: topExpenses,
      topIncome: topIncome,
      recentTransactions: recentTransactions
    };
    
  } catch (error) {
    Logger.log('AI data retrieval error: ' + error.message);
    throw new Error('Could not retrieve financial data: ' + error.message);
  }
}

/**
 * Show AI Assistant dialog
 */
function showAIAssistant() {
  try {
    var html = HtmlService.createHtmlOutputFromFile('AIAssistant')
      .setWidth(600)
      .setHeight(650);
    SpreadsheetApp.getUi().showModalDialog(html, '🤖 AI Financial Assistant');
  } catch (e) {
    Logger.log('showAIAssistant error: ' + e.message);
    SpreadsheetApp.getUi().alert('Error opening AI Assistant: ' + e.message);
  }
}

/**
 * Generate AI prompt with financial data
 * @param {string} promptType - Type of prompt (overview, budget, savings, etc.)
 * @returns {string} - Generated prompt
 */
function generateAIPrompt(promptType) {
  try {
    var data = getFinancialDataForAI();
    
    var prompt = 'I am a financial advisor AI assistant. Here is my client\'s financial data:\n\n';
    prompt += '=== FINANCIAL OVERVIEW ===\n';
    prompt += 'Total Income: $' + data.monthlyIncome.toFixed(2) + '\n';
    prompt += 'Total Expenses: $' + data.monthlyExpenses.toFixed(2) + '\n';
    prompt += 'Net Income: $' + data.netIncome.toFixed(2) + '\n';
    prompt += 'Savings Rate: ' + (data.monthlyIncome > 0 ? ((data.netIncome / data.monthlyIncome) * 100).toFixed(1) : 0) + '%\n';
    prompt += 'Needs vs Wants: $' + data.needsTotal.toFixed(2) + ' needs, $' + data.desiresTotal.toFixed(2) + ' wants\n\n';
    
    if (data.topExpenses.length > 0) {
      prompt += '=== TOP EXPENSE CATEGORIES ===\n';
      for (var i = 0; i < data.topExpenses.length; i++) {
        var exp = data.topExpenses[i];
        prompt += (i + 1) + '. ' + exp.category + ': $' + exp.amount.toFixed(2) + '\n';
      }
      prompt += '\n';
    }
    
    if (data.topIncome.length > 0) {
      prompt += '=== TOP INCOME SOURCES ===\n';
      for (var i = 0; i < data.topIncome.length; i++) {
        var inc = data.topIncome[i];
        prompt += (i + 1) + '. ' + inc.category + ': $' + inc.amount.toFixed(2) + '\n';
      }
      prompt += '\n';
    }
    
    // Add prompt type specific instructions
    switch (promptType) {
      case 'budget':
        prompt += 'Please provide a detailed budget analysis and suggestions for improvement.\n';
        break;
      case 'savings':
        prompt += 'Please analyze my savings rate and provide strategies to save more.\n';
        break;
      case 'spending':
        prompt += 'Please analyze my spending patterns and identify areas where I can cut back.\n';
        break;
      default:
        prompt += 'Please provide a comprehensive financial analysis and recommendations.\n';
    }
    
    return prompt;
    
  } catch (e) {
    Logger.log('generateAIPrompt error: ' + e.message);
    return 'Error generating prompt: ' + e.message;
  }
}
