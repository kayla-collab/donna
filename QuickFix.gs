/**
 * ═══════════════════════════════════════════════════════════════════
 * DIAGNOSTIC TOOL - ACCURATE VERSION - WRITES TO SHEET
 * ═══════════════════════════════════════════════════════════════════
 * Run this function to see detailed diagnostic results in a new sheet
 * ═══════════════════════════════════════════════════════════════════
 */
function MM_DIAGNOSTIC_TO_SHEET() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create or clear diagnostic sheet
  let diagSheet = ss.getSheetByName('DIAGNOSTIC_RESULTS');
  if (diagSheet) {
    diagSheet.clear();
  } else {
    diagSheet = ss.insertSheet('DIAGNOSTIC_RESULTS');
  }
  
  let row = 1;
  const write = (text, style = 'normal') => {
    diagSheet.getRange(row, 1).setValue(text);
    if (style === 'header') {
      diagSheet.getRange(row, 1).setFontWeight('bold').setFontSize(12).setBackground('#4a9b8e').setFontColor('#ffffff');
    } else if (style === 'subheader') {
      diagSheet.getRange(row, 1).setFontWeight('bold').setBackground('#e8f5f3');
    } else if (style === 'error') {
      diagSheet.getRange(row, 1).setBackground('#ffebee').setFontColor('#c62828');
    } else if (style === 'success') {
      diagSheet.getRange(row, 1).setBackground('#e8f5e9').setFontColor('#2e7d32');
    }
    row++;
  };
  
  write('═══════════════════════════════════════════════════════════', 'header');
  write('DASHBOARD DIAGNOSTIC REPORT - ACCURATE VERSION', 'header');
  write(`Generated: ${new Date().toLocaleString()}`, 'header');
  write('═══════════════════════════════════════════════════════════', 'header');
  write('');
  
  // ═══════════════════════════════════════════════════════════════════
  // 1. CHECK DASHBOARD SHEET - GOALS
  // ═══════════════════════════════════════════════════════════════════
  write('[1] DASHBOARD SHEET - GOALS', 'subheader');
  write('  Note: 2026 Launch Version uses SAVINGS sheet for goals (no DASHBOARD sheet)');
  write('');
  
  const dashboardSheet = ss.getSheetByName('SAVINGS');
  
  if (!dashboardSheet) {
    write('✗ SAVINGS sheet NOT FOUND!', 'error');
  } else {
    write('✓ SAVINGS sheet found', 'success');
    
    // Read merged cells C:F for goal text
    const goalsData = dashboardSheet.getRange('C18:C27').getValues();
    // Read checkboxes B for status
    const statusData = dashboardSheet.getRange('B18:B27').getValues();
    
    write('');
    let validGoals = 0;
    for (let i = 0; i < goalsData.length; i++) {
      const goalText = String(goalsData[i][0]).trim();
      const status = statusData[i][0];
      const rowNum = 18 + i;
      
      if (goalText && 
          goalText !== '' && 
          goalText.toLowerCase() !== 'goal' &&
          goalText.toLowerCase() !== 'false' &&
          !goalText.match(/^Goal \d+$/i)) {
        validGoals++;
        write(`  Row ${rowNum}: "${goalText}" [${status ? 'COMPLETED ✓' : 'PENDING ○'}]`, 'success');
      } else if (goalText) {
        write(`  Row ${rowNum}: "${goalText}" [FILTERED - invalid]`);
      } else {
        write(`  Row ${rowNum}: [EMPTY]`);
      }
    }
    write('');
    write(`Valid goals found: ${validGoals}`, validGoals > 0 ? 'success' : 'error');
  }
  
  write('');
  
  // ═══════════════════════════════════════════════════════════════════
  // 2. CHECK ACCOUNT SHEETS
  // ═══════════════════════════════════════════════════════════════════
  write('[2] ACCOUNT SHEETS', 'subheader');
  const allSheets = ss.getSheets();
  let validAccounts = 0;
  
  allSheets.forEach(sheet => {
    const sheetName = sheet.getName();
    if (sheetName.match(/^ACCOUNT \d+$/i)) {
      const accountName = sheet.getRange('C7').getValue();
      if (accountName && String(accountName).trim() !== '') {
        validAccounts++;
        write(`  ✓ ${sheetName}: "${accountName}"`, 'success');
      } else {
        write(`  ✗ ${sheetName}: C7 is EMPTY`, 'error');
      }
    }
  });
  
  write('');
  write(`Valid accounts found: ${validAccounts}`, validAccounts > 0 ? 'success' : 'error');
  write('');
  
  // ═══════════════════════════════════════════════════════════════════
  // 3. CHECK INCOME TRANSACTIONS
  // ═══════════════════════════════════════════════════════════════════
  write('[3] INCOME TRANSACTIONS', 'subheader');
  write('  Column C: Account Name');
  write('  Column D: Date');
  write('  Column E: Description');
  write('  Column F: Amount (can be +/-)');
  write('  Column G: Subcategories');
  write('  Column H: Business Categories');
  write('  Column I: Memo');
  write('  Column J: Need/Desire');
  write('  Column K: Main Category');
  write('');
  
  const incomeSheet = ss.getSheetByName('INCOME TRANSACTIONS');
  
  if (!incomeSheet) {
    write('✗ INCOME TRANSACTIONS sheet NOT FOUND!', 'error');
  } else {
    write('✓ INCOME TRANSACTIONS sheet found', 'success');
    const lastRow = incomeSheet.getLastRow();
    write(`  Last row with data: ${lastRow}`);
    
    if (lastRow >= 15) {
      // Read columns C through K (columns 3-11)
      const sampleData = incomeSheet.getRange(15, 3, Math.min(5, lastRow - 14), 9).getValues();
      write('');
      write('  First 5 transactions:');
      
      let validCount = 0;
      let positiveCount = 0;
      let negativeCount = 0;
      
      sampleData.forEach((row, i) => {
        const [accountName, date, description, amount, subCat, bizCat, memo, needDesire, mainCat] = row;
        if (date && amount !== '' && amount !== null) {
          validCount++;
          if (amount > 0) positiveCount++;
          if (amount < 0) negativeCount++;
          
          const category = bizCat || mainCat || subCat || 'Uncategorized';
          write(`    ${i+1}. Date: ${new Date(date).toDateString()}, Amount: ${amount}, Category: "${category}"`);
        } else {
          write(`    ${i+1}. [EMPTY or INVALID]`);
        }
      });
      
      write('');
      write(`  Valid income transactions in sample: ${validCount}`, validCount > 0 ? 'success' : 'error');
      write(`  Breakdown: ${positiveCount} positive, ${negativeCount} negative`);
    } else {
      write('  No transactions found (last row < 15)', 'error');
    }
  }
  
  write('');
  
  // ═══════════════════════════════════════════════════════════════════
  // 4. CHECK EXPENSE TRANSACTIONS
  // ═══════════════════════════════════════════════════════════════════
  write('[4] EXPENSE TRANSACTIONS', 'subheader');
  write('  Column C: Account Name');
  write('  Column D: Date');
  write('  Column E: Description');
  write('  Column F: Amount (can be +/-)');
  write('  Column G: Subcategories');
  write('  Column H: Business Categories');
  write('  Column I: Memo');
  write('  Column J: Need/Desire');
  write('  Column K: Main Category');
  write('');
  
  const expenseSheet = ss.getSheetByName('EXPENSE TRANSACTIONS');
  
  if (!expenseSheet) {
    write('✗ EXPENSE TRANSACTIONS sheet NOT FOUND!', 'error');
  } else {
    write('✓ EXPENSE TRANSACTIONS sheet found', 'success');
    const lastRow = expenseSheet.getLastRow();
    write(`  Last row with data: ${lastRow}`);
    
    if (lastRow >= 15) {
      // Read columns C through K (columns 3-11)
      const sampleData = expenseSheet.getRange(15, 3, Math.min(5, lastRow - 14), 9).getValues();
      write('');
      write('  First 5 transactions:');
      
      let validCount = 0;
      let positiveCount = 0;
      let negativeCount = 0;
      
      sampleData.forEach((row, i) => {
        const [accountName, date, description, amount, subCat, bizCat, memo, needDesire, mainCat] = row;
        if (date && amount !== '' && amount !== null) {
          validCount++;
          if (amount > 0) positiveCount++;
          if (amount < 0) negativeCount++;
          
          const category = bizCat || mainCat || subCat || 'Uncategorized';
          write(`    ${i+1}. Date: ${new Date(date).toDateString()}, Amount: ${amount}, Category: "${category}"`);
        } else {
          write(`    ${i+1}. [EMPTY or INVALID]`);
        }
      });
      
      write('');
      write(`  Valid expense transactions in sample: ${validCount}`, validCount > 0 ? 'success' : 'error');
      write(`  Breakdown: ${positiveCount} positive, ${negativeCount} negative`);
    } else {
      write('  No transactions found (last row < 15)', 'error');
    }
  }
  
  write('');
  
  // ═══════════════════════════════════════════════════════════════════
  // 5. TEST API FUNCTION
  // ═══════════════════════════════════════════════════════════════════
  write('[5] API FUNCTION TEST', 'subheader');
  
  try {
    const data = MM_apiGetDashboardData();
    
    write('✓ API function executed successfully', 'success');
    write('');
    write('DATA RETURNED:');
    write(`  Date Range: ${data.dateRange}`);
    write(`  Total Income (NET): $${data.monthlyIncome.toFixed(2)}`);
    write(`  Total Expenses (NET): $${data.monthlyExpenses.toFixed(2)}`);
    write(`  Net Profit: $${data.monthlyProfit.toFixed(2)}`);
    write('');
    write(`  Goals: ${data.goals.length}`);
    write(`  Accounts: ${data.accounts.length}`);
    write(`  Top Income Categories: ${data.topIncome.length}`);
    write(`  Top Expense Categories: ${data.topExpenses.length}`);
    write('');
    
    if (data.goals.length > 0) {
      write('GOALS RETURNED:', 'subheader');
      data.goals.forEach((goal, i) => {
        write(`  ${i+1}. ${goal} [${data.goalsCompletion[i] ? 'COMPLETED ✓' : 'PENDING ○'}]`);
      });
      write('');
    } else {
      write('⚠ NO GOALS RETURNED', 'error');
      write('  Check: DASHBOARD sheet C18:C27 (merged) and B18:B27 (checkboxes)');
      write('');
    }
    
    if (data.accounts.length > 0) {
      write('ACCOUNTS RETURNED:', 'subheader');
      data.accounts.forEach((account, i) => {
        write(`  ${i+1}. ${account}`);
      });
      write('');
    } else {
      write('⚠ NO ACCOUNTS RETURNED', 'error');
      write('  Check: ACCOUNT sheets with C7 values');
      write('');
    }
    
    if (data.topIncome.length > 0) {
      write('TOP INCOME CATEGORIES:', 'subheader');
      data.topIncome.forEach((item, i) => {
        write(`  ${i+1}. ${item.category}: $${item.amount.toFixed(2)}`);
      });
      write('');
    } else {
      write('⚠ NO TOP INCOME CATEGORIES', 'error');
      write('  Check: INCOME TRANSACTIONS columns C-K');
      write('');
    }
    
    if (data.topExpenses.length > 0) {
      write('TOP EXPENSE CATEGORIES:', 'subheader');
      data.topExpenses.forEach((item, i) => {
        write(`  ${i+1}. ${item.category}: $${item.amount.toFixed(2)}`);
      });
      write('');
    } else {
      write('⚠ NO TOP EXPENSE CATEGORIES', 'error');
      write('  Check: EXPENSE TRANSACTIONS columns C-K');
      write('');
    }
    
    write('CHART DATA SUMMARY:', 'subheader');
    let totalChartIncome = data.chartData.income.reduce((a, b) => a + b, 0);
    let totalChartExpenses = data.chartData.expenses.reduce((a, b) => a + b, 0);
    write(`  Total Chart Income: $${totalChartIncome.toFixed(2)}`);
    write(`  Total Chart Expenses: $${totalChartExpenses.toFixed(2)}`);
    
  } catch (error) {
    write('✗ API FUNCTION ERROR:', 'error');
    write(`  ${error.toString()}`, 'error');
    write(`  Stack: ${error.stack}`, 'error');
  }
  
  write('');
  write('═══════════════════════════════════════════════════════════', 'header');
  write('END OF DIAGNOSTIC REPORT', 'header');
  write('═══════════════════════════════════════════════════════════', 'header');
  
  // Auto-size column and show sheet
  diagSheet.autoResizeColumn(1);
  diagSheet.activate();
  
  SpreadsheetApp.getUi().alert(
    '✓ Diagnostic Complete!\n\n' +
    'Results written to sheet: DIAGNOSTIC_RESULTS\n\n' +
    'Review the colored rows:\n' +
    '• Green = Success\n' +
    '• Red = Error/Issue\n' +
    '• White = Info'
  );
}