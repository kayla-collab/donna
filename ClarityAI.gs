/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Business Financial Management System
 * CLARITY AI - AI-Powered Business Financial Advisor
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Clarity AI generates prompts for ChatGPT/Claude based on your
 * actual business financial data for personalized business advice.
 * 
 * BUSINESS VERSION: Focused on revenue, profit margins, business
 * expenses, tax optimization, and growth strategies.
 */

/**
 * Show branded Clarity AI modal
 */
function showClarityAIDialog() {
  try {
    // Get financial data for the modal
    var financialData = pullAllFinancialData();
    
    var template = HtmlService.createTemplateFromFile('ClarityAIModal');
    template.financialData = financialData;
    
    var html = template.evaluate()
      .setWidth(650)
      .setHeight(750);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'Clarity AI - Financial Advisor');
    
  } catch (e) {
    Logger.log('showClarityAIDialog error: ' + e.toString());
    
    // Fallback to simple version
    showClarityAISimple();
  }
}

/**
 * Simple fallback version of Clarity AI
 */
function showClarityAISimple() {
  try {
    var ui = SpreadsheetApp.getUi();
    var prompt = generateClarityPrompt('overview');
    
    if (prompt.success) {
      var message = 'Clarity AI Prompt Generated!\n\n';
      message += 'Copy this prompt and paste into ChatGPT:\n\n';
      message += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      message += prompt.prompt.substring(0, 800) + '...';
      message += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
      message += 'The full prompt has been logged to the console.';
      
      ui.alert('Clarity AI', message, ui.ButtonSet.OK);
      Logger.log('Full Clarity AI Prompt:\n' + prompt.prompt);
      
    } else {
      ui.alert('Clarity AI Error', 'Could not generate prompt: ' + prompt.error, ui.ButtonSet.OK);
    }
    
  } catch (e) {
    Logger.log('showClarityAISimple error: ' + e.toString());
    SpreadsheetApp.getUi().alert('Error', 'Clarity AI: ' + e.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Pull all financial data from sheets for prompt generation (OPTIMIZED)
 * @returns {Object} - Financial summary data
 */
function pullAllFinancialData() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = {
      totalIncome: 0,
      totalExpenses: 0,
      netBalance: 0,
      incomeCategories: {},
      expenseCategories: {},
      topExpenses: [],
      savingsRate: 0,
      transactionCount: 0
    };
    
    // OPTIMIZATION: Only read ACCOUNT sheets (they contain all transactions)
    // Skip INCOME/EXPENSE TRANSACTIONS sheets since they're just views
    // Updated 2026: Now reads columns C-G to include Special Labels (column G)
    // Column Layout: C=Date, D=Description, E=Amount, F=Category, G=Special Label
    var SPECIAL_LABELS_TO_EXCLUDE = ['Ignore', 'Transfer', 'CC Payment'];
    
    for (var acct = 1; acct <= 10; acct++) {
      var accountSheet = ss.getSheetByName('ACCOUNT ' + acct);
      if (accountSheet) {
        // OPTIMIZATION: Get columns C-G (Date, Desc, Amount, Category, SpecialLabel) to include Special Labels
        var lastRow = accountSheet.getLastRow();
        if (lastRow < 11) continue; // Skip empty sheets (data starts row 11)
        
        var accountData = accountSheet.getRange(11, 3, lastRow - 10, 5).getValues(); // Columns C-G from row 11
        
        // Safety check - ensure accountData is valid array
        if (!accountData || !Array.isArray(accountData)) continue;
        
        for (var i = 0; i < accountData.length; i++) {
          var date = accountData[i][0]; // Column C - Date
          var amount = accountData[i][2]; // Column E - Amount
          var category = accountData[i][3] || ''; // Column F - Category
          var specialLabel = String(accountData[i][4] || '').trim(); // Column G - Special Label
          
          // Skip transactions with Special Labels (Ignore, Transfer, CC Payment)
          if (specialLabel && SPECIAL_LABELS_TO_EXCLUDE.indexOf(specialLabel) !== -1) continue;
          
          // Skip empty rows and formula errors
          if (!date || !amount || isNaN(amount) || amount === 0) continue;
          if (typeof category === 'string' && category.indexOf('#') === 0) continue; // Skip #N/A, #REF!, etc.
          
          var numAmount = Number(amount);
          if (numAmount > 0) {
            // Income
            data.totalIncome += numAmount;
            var incCat = category || 'Income';
            data.incomeCategories[incCat] = (data.incomeCategories[incCat] || 0) + numAmount;
          } else {
            // Expense
            data.totalExpenses += Math.abs(numAmount);
            var expCat = category || 'Uncategorized';
            data.expenseCategories[expCat] = (data.expenseCategories[expCat] || 0) + Math.abs(numAmount);
          }
          data.transactionCount++;
        }
      }
    }
    
    // Calculate net balance and savings rate
    data.netBalance = data.totalIncome - data.totalExpenses;
    data.savingsRate = data.totalIncome > 0 ? ((data.netBalance / data.totalIncome) * 100).toFixed(1) : 0;
    
    // Get top expense categories
    var sortedExpenses = Object.entries(data.expenseCategories)
      .sort(function(a, b) { return b[1] - a[1]; })
      .slice(0, 5);
    
    data.topExpenses = sortedExpenses.map(function(item) {
      return {
        category: item[0],
        amount: item[1],
        percentage: data.totalExpenses > 0 ? ((item[1] / data.totalExpenses) * 100).toFixed(1) : 0
      };
    });
    
    Logger.log('[CLARITY] Data pulled: ' + data.transactionCount + ' transactions, Income=$' + data.totalIncome.toFixed(2) + ', Expenses=$' + data.totalExpenses.toFixed(2));
    return data;
    
  } catch (e) {
    Logger.log('[CLARITY] pullAllFinancialData error: ' + e.toString());
    return {
      totalIncome: 0,
      totalExpenses: 0,
      netBalance: 0,
      incomeCategories: {},
      expenseCategories: {},
      topExpenses: [],
      savingsRate: 0,
      transactionCount: 0,
      error: e.message
    };
  }
}

/**
 * Generate Clarity AI prompt based on user data
 * @param {string} promptType - Type of prompt to generate
 * @returns {string} - The generated prompt (for auto-copy to clipboard)
 */
function generateClarityPrompt(promptType) {
  try {
    promptType = promptType || 'comprehensive';
    
    // Get user info
    var userEmail = Session.getActiveUser().getEmail();
    var userName = getUserNameFromBackend(userEmail) || userEmail.split('@')[0];
    
    // Pull fresh financial data
    var data = pullAllFinancialData();
    
    if (!data || data.transactionCount === 0) {
      throw new Error('No financial data found. Please connect your bank accounts first.');
    }
    
    // Generate prompt based on type
    var prompt = '';
    
    switch (promptType) {
      case 'spending':
        prompt = generateSpendingPrompt(data, userName);
        break;
      case 'income':
        prompt = generateIncomePrompt(data, userName);
        break;
      case 'savings':
        prompt = generateSavingsPrompt(data, userName);
        break;
      case 'comprehensive':
      default:
        prompt = generateComprehensivePrompt(data, userName);
        break;
    }
    
    return prompt;
    
  } catch (e) {
    Logger.log('generateClarityPrompt error: ' + e.toString());
    throw new Error('Failed to generate prompt: ' + e.message);
  }
}

/**
 * Generate comprehensive financial overview prompt
 */
function generateComprehensivePrompt(data, userName) {
  var firstName = userName.split(' ')[0];
  
  // Get booking link from LINKS sheet
  var bookingLink = getLinkFromLinksSheet('Donna Booking Link') || 'https://calendly.com/donna';
  
  // Format expense categories
  var expensesBreakdown = '';
  var sortedExpenses = [];
  
  if (data.expenseCategories && typeof data.expenseCategories === 'object') {
    sortedExpenses = Object.entries(data.expenseCategories)
      .sort(function(a, b) { return b[1] - a[1]; })
      .slice(0, 7);
  }
  
  for (var i = 0; i < sortedExpenses.length; i++) {
    expensesBreakdown += '• ' + sortedExpenses[i][0] + ': $' + sortedExpenses[i][1].toFixed(2) + '\n';
  }
  
  // Format income categories
  var incomeBreakdown = '';
  var sortedIncome = [];
  
  if (data.incomeCategories && typeof data.incomeCategories === 'object') {
    sortedIncome = Object.entries(data.incomeCategories)
      .sort(function(a, b) { return b[1] - a[1]; });
  }
  
  for (var j = 0; j < sortedIncome.length; j++) {
    incomeBreakdown += '• ' + sortedIncome[j][0] + ': $' + sortedIncome[j][1].toFixed(2) + '\n';
  }

  // CLARITY BRAND VOICE: Warm, knowledgeable, judgment-free, empowering
  // For business: strategic advisor tone - focused on growth, profit, and optimization
  var prompt = 'Hi ' + firstName + ', I\'m Clarity.\n\n';
  prompt += 'I\'m your AI business financial advisor. No corporate jargon. No judgment. Just clarity on your business numbers and actionable insights.\n\n';
  prompt += 'I\'ve analyzed your business finances, and here\'s what I see:\n\n';
  prompt += '--- YOUR BUSINESS FINANCIAL SNAPSHOT ---\n\n';
  prompt += 'REVENUE:\n';
  prompt += 'Total Revenue: $' + data.totalIncome.toFixed(2) + '\n\n';
  if (incomeBreakdown) {
    prompt += 'Revenue Sources:\n' + incomeBreakdown + '\n';
  }
  prompt += 'BUSINESS EXPENSES:\n';
  prompt += 'Total Expenses: $' + data.totalExpenses.toFixed(2) + '\n\n';
  if (expensesBreakdown) {
    prompt += 'Expense Categories:\n' + expensesBreakdown + '\n';
  }
  
  var profitMargin = data.totalIncome > 0 ? ((data.netBalance / data.totalIncome) * 100).toFixed(1) : 0;
  
  prompt += 'THE BOTTOM LINE:\n';
  if (data.netBalance >= 0) {
    prompt += 'Net Profit: $' + data.netBalance.toFixed(2) + ' (' + profitMargin + '% profit margin)\n';
    prompt += 'Your business is profitable. Let\'s explore how to grow this.\n\n';
  } else {
    prompt += 'Net Loss: $' + Math.abs(data.netBalance).toFixed(2) + '\n';
    prompt += 'Your expenses exceed revenue right now. This is a pivot point - let\'s find the path to profitability.\n\n';
  }
  prompt += '--- BUSINESS INSIGHTS ---\n\n';
  
  if (data.netBalance >= 0) {
    prompt += 'Your business is generating profit. The question now is: how do we scale this sustainably?\n\n';
  } else {
    prompt += 'Cash flow is tight. Let\'s identify what\'s eating into margins and what can be optimized.\n\n';
  }
  
  if (sortedExpenses[0]) {
    var topPct = data.totalExpenses > 0 ? ((sortedExpenses[0][1] / data.totalExpenses) * 100).toFixed(0) : 0;
    prompt += 'Your biggest expense is ' + sortedExpenses[0][0] + ' (' + topPct + '% of total expenses). ';
    prompt += 'Is this driving revenue? Is there ROI here?\n\n';
  }
  
  if (sortedIncome.length > 1) {
    prompt += 'You have multiple revenue streams. This diversification reduces risk and creates stability.\n\n';
  } else {
    prompt += 'Consider: your revenue comes from a single source. Diversification could reduce risk.\n\n';
  }
  
  prompt += '--- STRATEGIC QUESTIONS ---\n\n';
  prompt += 'Here\'s what I\'d like to explore with you:\n\n';
  prompt += '1. Which expenses are driving revenue, and which are just overhead?\n';
  prompt += '2. What\'s your customer acquisition cost (CAC) vs lifetime value (LTV)?\n';
  prompt += '3. Are there services or products with higher margins you could focus on?\n';
  prompt += '4. What would it take to increase revenue by 20% in the next quarter?\n';
  prompt += '5. Are you maximizing tax deductions? (Marketing, software, contractors are deductible)\n\n';
  prompt += 'Business growth isn\'t about working harder - it\'s about working smarter with better data.\n\n';
  prompt += '--- WANT STRATEGIC GUIDANCE? ---\n\n';
  prompt += 'Donna Roggio created Business Money Mastery for entrepreneurs like you. Real systems. Clear P&L. Growth strategies.\n\n';
  prompt += 'Book a FREE strategy call: ' + bookingLink + '\n\n';
  prompt += 'What business challenge should we tackle first?';
  
  return prompt;
}

/**
 * Generate spending analysis prompt
 */
function generateSpendingPrompt(data, userName) {
  var firstName = userName.split(' ')[0];
  
  var expensesBreakdown = '';
  var sortedExpenses = [];
  
  if (data.expenseCategories && typeof data.expenseCategories === 'object') {
    sortedExpenses = Object.entries(data.expenseCategories)
      .sort(function(a, b) { return b[1] - a[1]; })
      .slice(0, 10);
  }
  
  for (var i = 0; i < sortedExpenses.length; i++) {
    var pct = data.totalExpenses > 0 ? ((sortedExpenses[i][1] / data.totalExpenses) * 100).toFixed(1) : 0;
    expensesBreakdown += '• ' + sortedExpenses[i][0] + ': $' + sortedExpenses[i][1].toFixed(2) + ' (' + pct + '%)\n';
  }
  
  var prompt = 'I\'m ' + firstName + '. I need to analyze my business expenses.\n\n';
  prompt += 'Here\'s what I\'m working with:\n\n';
  prompt += 'Total Business Expenses: $' + data.totalExpenses.toFixed(2) + '\n';
  prompt += 'Total Revenue: $' + data.totalIncome.toFixed(2) + '\n';
  prompt += 'Expense-to-Revenue Ratio: ' + (data.totalIncome > 0 ? ((data.totalExpenses / data.totalIncome) * 100).toFixed(0) : 0) + '%\n\n';
  prompt += 'Here\'s the breakdown:\n';
  prompt += expensesBreakdown + '\n';
  prompt += 'I need help understanding:\n\n';
  prompt += '1. Which expenses are investments (driving growth) vs overhead (just costs)?\n';
  prompt += '2. What\'s a healthy expense ratio for my type of business?\n';
  prompt += '3. Are there expenses I could reduce without hurting revenue?\n';
  prompt += '4. Am I over-investing in any area? Under-investing?\n';
  prompt += '5. What should my monthly expense budget look like by category?\n';
  prompt += '6. Which of these are tax-deductible and am I maximizing deductions?\n\n';
  prompt += 'Give me actionable insights. I want to optimize, not just cut.\n\n';
  prompt += 'Business Money Mastery - created by Donna Roggio';
  
  return prompt;
}

/**
 * Generate income growth prompt
 */
function generateIncomePrompt(data, userName) {
  var firstName = userName.split(' ')[0];
  
  var incomeBreakdown = '';
  var sortedIncome = [];
  
  if (data.incomeCategories && typeof data.incomeCategories === 'object') {
    sortedIncome = Object.entries(data.incomeCategories)
      .sort(function(a, b) { return b[1] - a[1]; });
  }
  
  for (var i = 0; i < sortedIncome.length; i++) {
    var pct = data.totalIncome > 0 ? ((sortedIncome[i][1] / data.totalIncome) * 100).toFixed(1) : 0;
    incomeBreakdown += '• ' + sortedIncome[i][0] + ': $' + sortedIncome[i][1].toFixed(2) + ' (' + pct + '%)\n';
  }
  
  var prompt = 'I\'m ' + firstName + '. I want to grow my business revenue. Let\'s strategize.\n\n';
  prompt += 'Here\'s my current business performance:\n\n';
  prompt += 'Monthly Revenue: $' + data.totalIncome.toFixed(2) + '\n';
  prompt += 'Monthly Expenses: $' + data.totalExpenses.toFixed(2) + '\n';
  if (data.netBalance >= 0) {
    prompt += 'Net Profit: $' + data.netBalance.toFixed(2) + ' (I want to scale this)\n\n';
  } else {
    prompt += 'Current Loss: $' + Math.abs(data.netBalance).toFixed(2) + ' (I need to turn this around)\n\n';
  }
  prompt += 'Revenue Sources:\n';
  prompt += incomeBreakdown + '\n';
  prompt += 'What I need from you:\n\n';
  prompt += '1. Are my revenue streams diversified enough? Am I too reliant on one client/product?\n';
  prompt += '2. Based on my current offerings, where\'s the low-hanging fruit for growth?\n';
  prompt += '3. What pricing strategies could increase revenue without adding clients?\n';
  prompt += '4. Should I focus on new client acquisition or upselling existing clients?\n';
  prompt += '5. What passive/recurring revenue streams could I add?\n';
  prompt += '6. Give me a 90-day revenue growth plan with specific milestones.\n\n';
  prompt += 'I want actionable strategy, not generic advice. Be specific.\n\n';
  prompt += 'Business Money Mastery - created by Donna Roggio';
  
  return prompt;
}

/**
 * Generate profit optimization prompt (business version of savings)
 */
function generateSavingsPrompt(data, userName) {
  var firstName = userName.split(' ')[0];
  var profitMargin = data.totalIncome > 0 ? ((data.netBalance / data.totalIncome) * 100).toFixed(1) : 0;
  
  var prompt = 'I\'m ' + firstName + '. Let\'s talk about profit optimization and business reserves.\n\n';
  prompt += 'Here\'s my business reality:\n\n';
  prompt += 'Monthly Revenue: $' + data.totalIncome.toFixed(2) + '\n';
  prompt += 'Monthly Expenses: $' + data.totalExpenses.toFixed(2) + '\n';
  
  if (data.netBalance >= 0) {
    prompt += 'Net Profit: $' + data.netBalance.toFixed(2) + ' (' + profitMargin + '% profit margin)\n\n';
  } else {
    prompt += 'Current Loss: $' + Math.abs(data.netBalance).toFixed(2) + ' per month.\n';
    prompt += 'The business is not yet profitable. Let\'s fix that.\n\n';
  }
  
  prompt += 'What I need:\n\n';
  prompt += '1. Is my profit margin healthy for my industry? What should I target?\n';
  prompt += '2. Business emergency fund - How much should I keep in reserves? Based on my expenses, that\'s $' + (data.totalExpenses * 3).toFixed(0) + ' to $' + (data.totalExpenses * 6).toFixed(0) + '.\n';
  prompt += '3. How should I allocate profit? (Reserves, reinvestment, owner\'s draw, taxes)\n';
  prompt += '4. What\'s a realistic quarterly profit goal I should set?\n';
  prompt += '5. Tax strategy - How much should I set aside for quarterly estimated taxes?\n';
  prompt += '6. Give me a 90-day profit improvement plan with specific targets.\n\n';
  
  if (data.netBalance < 0) {
    prompt += 'First priority: get to profitability. Help me identify the path.\n\n';
  }
  
  prompt += 'I want strategic financial planning for sustainable business growth.\n\n';
  prompt += 'Business Money Mastery - created by Donna Roggio';
  
  return prompt;
}

/**
 * Get link from LINKS sheet
 */
function getLinkFromLinksSheet(linkName) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var linksSheet = ss.getSheetByName('LINKS');
    
    if (!linksSheet) return null;
    
    var data = linksSheet.getDataRange().getValues();
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === linkName) {
        return data[i][1];
      }
    }
    
    return null;
  } catch (error) {
    Logger.log('Error getting link: ' + error.toString());
    return null;
  }
}

/**
 * Build prompt header
 */
function buildPromptHeader() {
  return [
    '═══════════════════════════════════════════════════════════════',
    'CLARITY AI - Financial Advisor Session',
    'Powered by Money Mastery © 2026 Donna Roggio LLC',
    '═══════════════════════════════════════════════════════════════',
    '',
    'I am using the Money Mastery to track my personal finances.',
    'Please analyze my financial data and provide personalized advice.',
    '',
    ''
  ].join('\n');
}

/**
 * Build financial summary section
 */
function buildFinancialSummary(data) {
  var net = data.totalIncome - data.totalExpenses;
  var netStatus = net >= 0 ? '✅ Positive' : '⚠️ Negative';
  
  return [
    '📊 FINANCIAL SNAPSHOT',
    '─────────────────────────────────────────────────────────────────',
    '',
    '• Total Income:     $' + formatNumber(data.totalIncome),
    '• Total Expenses:   $' + formatNumber(data.totalExpenses),
    '• Net Balance:      $' + formatNumber(net) + ' (' + netStatus + ')',
    '• Savings Rate:     ' + data.savingsRate + '%',
    '• Transactions:     ' + data.transactionCount + ' recorded',
    '',
    ''
  ].join('\n');
}

/**
 * Build category breakdown section
 */
function buildCategoryBreakdown(data) {
  var lines = [
    '📈 TOP EXPENSE CATEGORIES',
    '─────────────────────────────────────────────────────────────────',
    ''
  ];
  
  if (data.topExpenses && data.topExpenses.length > 0) {
    data.topExpenses.forEach(function(item, index) {
      lines.push((index + 1) + '. ' + item.category + ': $' + formatNumber(item.amount) + ' (' + item.percentage + '%)');
    });
  } else {
    lines.push('No expense data available yet.');
  }
  
  lines.push('');
  lines.push('');
  
  // Add income categories if present
  var incomeCategories = Object.entries(data.incomeCategories || {})
    .sort(function(a, b) { return b[1] - a[1]; })
    .slice(0, 3);
  
  if (incomeCategories.length > 0) {
    lines.push('💰 INCOME SOURCES');
    lines.push('─────────────────────────────────────────────────────────────────');
    lines.push('');
    
    incomeCategories.forEach(function(item, index) {
      var percentage = data.totalIncome > 0 ? ((item[1] / data.totalIncome) * 100).toFixed(1) : 0;
      lines.push((index + 1) + '. ' + item[0] + ': $' + formatNumber(item[1]) + ' (' + percentage + '%)');
    });
    
    lines.push('');
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Build prompt instructions based on type
 */
function buildPromptInstructions(promptType) {
  var instructions = {
    overview: [
      '🎯 WHAT I NEED FROM YOU',
      '─────────────────────────────────────────────────────────────────',
      '',
      'Please provide a comprehensive financial analysis including:',
      '',
      '1. OVERALL HEALTH ASSESSMENT',
      '   - Rate my financial health (1-10)',
      '   - Identify strengths and weaknesses',
      '   - Flag any concerning patterns',
      '',
      '2. SPENDING OPTIMIZATION',
      '   - Areas where I could cut back',
      '   - Realistic savings opportunities',
      '   - Spending patterns to watch',
      '',
      '3. ACTION PLAN',
      '   - 3 immediate actions I can take this week',
      '   - Medium-term goals (1-3 months)',
      '   - Long-term financial objectives',
      '',
      '4. PERSONALIZED TIPS',
      '   - Based on my specific spending categories',
      '   - Practical, actionable advice',
      '',
      ''
    ],
    spending: [
      '🎯 SPENDING ANALYSIS REQUEST',
      '─────────────────────────────────────────────────────────────────',
      '',
      'Please analyze my spending patterns and provide:',
      '',
      '1. SPENDING BREAKDOWN',
      '   - Categorize my expenses as Needs vs Wants',
      '   - Identify discretionary spending',
      '   - Compare to typical budgeting guidelines (50/30/20 rule)',
      '',
      '2. PROBLEM AREAS',
      '   - Categories where I\'m overspending',
      '   - Hidden or recurring charges to review',
      '   - Lifestyle inflation indicators',
      '',
      '3. OPTIMIZATION STRATEGIES',
      '   - Specific cuts that won\'t impact quality of life',
      '   - Substitutions and alternatives',
      '   - Negotiation opportunities (bills, subscriptions)',
      '',
      '4. WEEKLY BUDGET RECOMMENDATION',
      '   - Realistic daily/weekly spending limits',
      '   - Emergency fund allocation',
      '',
      ''
    ],
    savings: [
      '🎯 SAVINGS GOALS ANALYSIS',
      '─────────────────────────────────────────────────────────────────',
      '',
      'Please help me build a savings strategy:',
      '',
      '1. CURRENT SAVINGS ASSESSMENT',
      '   - Is my savings rate healthy?',
      '   - How does it compare to recommendations?',
      '   - What\'s preventing me from saving more?',
      '',
      '2. SAVINGS GOAL SETTING',
      '   - Emergency fund target (3-6 months)',
      '   - Short-term goals (vacation, purchases)',
      '   - Long-term goals (retirement, house)',
      '',
      '3. AUTOMATION STRATEGY',
      '   - How much to auto-transfer each paycheck',
      '   - Best accounts for different goals',
      '   - Pay yourself first approach',
      '',
      '4. 90-DAY SAVINGS CHALLENGE',
      '   - Specific target to reach',
      '   - Weekly milestones',
      '   - Motivation tips',
      '',
      ''
    ],
    budget: [
      '🎯 BUDGET REVIEW REQUEST',
      '─────────────────────────────────────────────────────────────────',
      '',
      'Please review and optimize my budget:',
      '',
      '1. BUDGET ALLOCATION ANALYSIS',
      '   - Current spending percentages by category',
      '   - Recommended allocations based on income',
      '   - Where am I over/under budget?',
      '',
      '2. ZERO-BASED BUDGET',
      '   - Help me allocate every dollar',
      '   - Priority ranking for expenses',
      '   - Buffer for unexpected costs',
      '',
      '3. MONTHLY BUDGET TEMPLATE',
      '   - Fixed expenses list',
      '   - Variable expense targets',
      '   - Savings categories',
      '',
      '4. TRACKING RECOMMENDATIONS',
      '   - How often to review',
      '   - Warning signs to watch',
      '   - Adjustment strategies',
      '',
      ''
    ]
  };
  
  return (instructions[promptType] || instructions.overview).join('\n');
}

/**
 * Build prompt footer
 */
function buildPromptFooter() {
  return [
    '═══════════════════════════════════════════════════════════════',
    'IMPORTANT CONTEXT',
    '═══════════════════════════════════════════════════════════════',
    '',
    '• This data comes from my actual bank transactions',
    '• I want practical, actionable advice (not generic tips)',
    '• Please be specific to MY numbers and categories',
    '• I appreciate honest feedback, even if it\'s critical',
    '',
    'Thank you for your analysis!',
    '',
    '─────────────────────────────────────────────────────────────────',
    '© 2026 Donna Roggio LLC - Money Mastery',
    'Generated by Clarity AI'
  ].join('\n');
}

/**
 * Format number as currency
 */
function formatNumber(num) {
  return Math.abs(num || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
