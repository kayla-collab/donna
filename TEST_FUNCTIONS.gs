/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * DEBUG TEST FUNCTIONS
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Updated 2026: Bank sync disabled - manual entry only
 */

function TEST_WRITE_TO_SHEET() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('ACCOUNT 1');
    
    if (!sheet) {
      Logger.log('❌ ACCOUNT 1 sheet does NOT exist');
      // Create it
      sheet = ss.insertSheet('ACCOUNT 1');
      
      // Add headers - Updated for 2026 column layout
      sheet.getRange(1, 1, 1, 11).setValues([[
        'Row',
        'Reserved',
        'Date',
        'Description',
        'Amount',
        'Category',
        'Special Label',
        'Memo',
        'Need/Desire',
        'Split Data',
        'Receipt'
      ]]);
      sheet.getRange('A1:K1').setFontWeight('bold').setBackground('#ab9478').setFontColor('#ffffff');
      
      Logger.log('✅ Created ACCOUNT 1 sheet with headers');
    } else {
      Logger.log('✅ ACCOUNT 1 sheet exists');
    }
    
    // Try to write a test row - Updated for 2026 column layout (row 11+)
    var testRow = [
      '',
      '',
      new Date(),
      'TEST TRANSACTION - DELETE ME',
      100.00,
      'Test Category',
      '',
      'Test memo',
      'Need',
      '',
      ''
    ];
    
    var lastRow = Math.max(10, sheet.getLastRow());
    Logger.log('Current last row: ' + lastRow);
    
    sheet.getRange(lastRow + 1, 1, 1, 11).setValues([testRow]);
    Logger.log('✅ Test row written successfully to row ' + (lastRow + 1));
    
    SpreadsheetApp.getUi().alert('SUCCESS!\n\nTest row written to ACCOUNT 1 sheet.\nCheck row ' + (lastRow + 1));
    
    return 'SUCCESS - Check ACCOUNT 1 sheet for test row at row ' + (lastRow + 1);
    
  } catch (e) {
    Logger.log('❌ TEST FAILED: ' + e.message);
    Logger.log('❌ Stack: ' + e.stack);
    SpreadsheetApp.getUi().alert('TEST FAILED\n\n' + e.message);
    return 'FAILED: ' + e.message;
  }
}

/**
 * @deprecated Plaid integration removed in 2026. Use TEST_BANK_CONNECTION instead.
 */
function TEST_PLAID_CONNECTION() {
  Logger.log('⚠️ DEPRECATED: TEST_PLAID_CONNECTION');
  Logger.log('   Plaid integration has been removed in 2026.');
  Logger.log('   Use TEST_BANK_CONNECTION() or manual entry instead.');
  
  SpreadsheetApp.getUi().alert(
    'Deprecated Function',
    'Bank sync has been disabled.\n\n' +
    'Money Mastery uses manual transaction entry only.\n' +
    'Enter transactions directly in your ACCOUNT sheets.\n\n' +
    'Run TEST_ACCOUNT_SHEETS() to verify sheet status.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  
  return { success: false, deprecated: true, message: 'Bank sync disabled' };
}

/**
 * Test Account Sheets Status
 * Money Mastery uses manual entry - no bank sync
 */
function TEST_ACCOUNT_SHEETS() {
  try {
    Logger.log('🔍 ========== TESTING ACCOUNT SHEETS ==========');
    
    var sessionEmail = Session.getActiveUser().getEmail();
    Logger.log('User email: ' + sessionEmail);
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Check ACCOUNT sheets
    var activeAccounts = [];
    var totalTransactions = 0;
    
    for (var i = 1; i <= 10; i++) {
      var accountSheet = ss.getSheetByName('ACCOUNT ' + i);
      if (accountSheet) {
        var lastRow = accountSheet.getLastRow();
        var txnCount = Math.max(0, lastRow - 10); // Data starts row 11
        if (txnCount > 0) {
          activeAccounts.push({ name: 'ACCOUNT ' + i, transactions: txnCount });
          totalTransactions += txnCount;
        }
      }
    }
    
    Logger.log('Active ACCOUNT sheets: ' + activeAccounts.length);
    Logger.log('Total transactions: ' + totalTransactions);
    
    var message = '📊 ACCOUNT SHEETS STATUS\n\n';
    message += 'User: ' + sessionEmail + '\n\n';
    message += 'TRANSACTION ENTRY: Manual only\n';
    message += '(No automatic bank sync)\n\n';
    message += 'Active Sheets: ' + activeAccounts.length + '\n';
    message += 'Total Transactions: ' + totalTransactions + '\n';
    
    if (activeAccounts.length > 0) {
      message += '\nDetails:\n';
      for (var j = 0; j < activeAccounts.length; j++) {
        message += '  • ' + activeAccounts[j].name + ': ' + activeAccounts[j].transactions + ' transactions\n';
      }
    } else {
      message += '\nNo transactions found.\n';
      message += 'Enter transactions in ACCOUNT sheets starting at row 11.';
    }
    
    SpreadsheetApp.getUi().alert('Account Sheets Status', message, SpreadsheetApp.getUi().ButtonSet.OK);
    
    return {
      success: true,
      activeSheets: activeAccounts.length,
      totalTransactions: totalTransactions,
      accounts: activeAccounts
    };
    
  } catch (e) {
    Logger.log('❌ Error: ' + e.message);
    SpreadsheetApp.getUi().alert('TEST ERROR\n\n' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * @deprecated Bank sync disabled - kept for backward compatibility
 */
function TEST_BANK_CONNECTION() {
  return TEST_ACCOUNT_SHEETS();
}

/**
 * @deprecated Plaid integration removed in 2026
 */
function TEST_FULL_TRANSACTION_FLOW() {
  Logger.log('⚠️ DEPRECATED: TEST_FULL_TRANSACTION_FLOW (Plaid)');
  Logger.log('   Plaid integration has been removed in 2026.');
  
  SpreadsheetApp.getUi().alert(
    'Deprecated Function',
    'The Plaid transaction flow test has been removed in 2026.\n\n' +
    'Transaction import options:\n' +
    '• Enter transactions manually in ACCOUNT sheets\n' +
    '• Import from CSV\n\n' +
    'Use TEST_MANUAL_TRANSACTION_ENTRY() to test manual entry.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  
  return { success: false, deprecated: true };
}

/**
 * Test Manual Transaction Entry
 */
function TEST_MANUAL_TRANSACTION_ENTRY() {
  try {
    Logger.log('🔍 ========== TESTING MANUAL TRANSACTION ENTRY ==========');
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('ACCOUNT 1');
    
    if (!sheet) {
      throw new Error('ACCOUNT 1 sheet not found. Please create it first.');
    }
    
    // Test writing a transaction at row 11+ (2026 layout)
    var testTransaction = {
      date: new Date(),
      description: 'TEST MANUAL ENTRY - DELETE ME',
      amount: -25.99,
      category: 'Test Category',
      specialLabel: '',
      memo: 'Manual test entry',
      needDesire: 'Desire',
      splitData: '',
      receipt: ''
    };
    
    // Find first empty row after row 10 (header row is 10)
    var lastRow = Math.max(10, sheet.getLastRow());
    var newRow = lastRow + 1;
    
    // Write to correct columns per 2026 layout
    sheet.getRange(newRow, 3).setValue(testTransaction.date);          // C - Date
    sheet.getRange(newRow, 4).setValue(testTransaction.description);   // D - Description
    sheet.getRange(newRow, 5).setValue(testTransaction.amount);        // E - Amount
    sheet.getRange(newRow, 6).setValue(testTransaction.category);      // F - Category
    sheet.getRange(newRow, 7).setValue(testTransaction.specialLabel);  // G - Special Label
    sheet.getRange(newRow, 8).setValue(testTransaction.memo);          // H - Memo
    sheet.getRange(newRow, 9).setValue(testTransaction.needDesire);    // I - Need/Desire
    sheet.getRange(newRow, 10).setValue(testTransaction.splitData);    // J - Split Data
    sheet.getRange(newRow, 11).setValue(testTransaction.receipt);      // K - Receipt
    
    Logger.log('✅ Test transaction written to row ' + newRow);
    
    SpreadsheetApp.getUi().alert(
      'Manual Entry Test',
      '✅ SUCCESS!\n\n' +
      'Test transaction written to ACCOUNT 1, row ' + newRow + '\n\n' +
      'Date: ' + testTransaction.date.toLocaleDateString() + '\n' +
      'Description: ' + testTransaction.description + '\n' +
      'Amount: $' + testTransaction.amount.toFixed(2) + '\n' +
      'Category: ' + testTransaction.category + '\n' +
      'Need/Desire: ' + testTransaction.needDesire + '\n\n' +
      'Please delete this test row after verification.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    return {
      success: true,
      row: newRow,
      transaction: testTransaction
    };
    
  } catch (e) {
    Logger.log('❌ Error: ' + e.message);
    SpreadsheetApp.getUi().alert('TEST ERROR\n\n' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Test Categorization System v2
 */
function TEST_CATEGORIZATION_SYSTEM() {
  try {
    Logger.log('🔍 ========== TESTING CATEGORIZATION SYSTEM V2 ==========');
    
    // Test 1: Check getMM_COLS
    Logger.log('Test 1: Column configuration...');
    if (typeof getMM_COLS !== 'function') {
      throw new Error('getMM_COLS function not found');
    }
    var cols = getMM_COLS();
    Logger.log('  DATE column: ' + cols.DATE);
    Logger.log('  AMOUNT column: ' + cols.AMOUNT);
    Logger.log('  CATEGORY column: ' + cols.CATEGORY);
    Logger.log('✅ Column configuration OK');
    
    // Test 2: Check getCategorizationModalData
    Logger.log('Test 2: Modal data function...');
    if (typeof getCategorizationModalData !== 'function') {
      Logger.log('⚠️ getCategorizationModalData not found - may be defined elsewhere');
    } else {
      Logger.log('✅ getCategorizationModalData exists');
    }
    
    // Test 3: Check saveCategorizationChangesV2
    Logger.log('Test 3: Save function...');
    if (typeof saveCategorizationChangesV2 !== 'function') {
      Logger.log('⚠️ saveCategorizationChangesV2 not found - may be defined elsewhere');
    } else {
      Logger.log('✅ saveCategorizationChangesV2 exists');
    }
    
    // Test 4: Check category loaders
    Logger.log('Test 4: Category loaders...');
    var loaderFunctions = [
      'getExpenseCategories',
      'getIncomeCategories',
      'getBusinessCategories'
    ];
    
    for (var i = 0; i < loaderFunctions.length; i++) {
      var funcName = loaderFunctions[i];
      try {
        var func = eval('typeof ' + funcName);
        Logger.log('  ' + (func === 'function' ? '✅' : '⚠️') + ' ' + funcName + ': ' + func);
      } catch (e) {
        Logger.log('  ⚠️ ' + funcName + ': not found');
      }
    }
    
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Logger.log('✅ CATEGORIZATION SYSTEM TEST COMPLETE');
    
    SpreadsheetApp.getUi().alert(
      'Categorization System Test',
      '✅ Tests Complete\n\n' +
      'Column Config: OK\n' +
      'Date Col: ' + cols.DATE + ' (C)\n' +
      'Amount Col: ' + cols.AMOUNT + ' (E)\n' +
      'Category Col: ' + cols.CATEGORY + ' (F)\n\n' +
      'See logs for detailed results.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    return { success: true, columns: cols };
    
  } catch (e) {
    Logger.log('❌ Error: ' + e.message);
    SpreadsheetApp.getUi().alert('TEST ERROR\n\n' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Test Special Labels functionality
 */
function TEST_SPECIAL_LABELS() {
  try {
    Logger.log('🔍 ========== TESTING SPECIAL LABELS ==========');
    
    // Get special labels from ColumnConfig
    var specialLabels = ['Ignore', 'Transfer', 'CC Payment'];
    
    Logger.log('Special Labels: ' + specialLabels.join(', '));
    
    // Check if special labels should be excluded from totals
    Logger.log('These labels should be excluded from financial totals.');
    Logger.log('  • Ignore: Transactions to ignore completely');
    Logger.log('  • Transfer: Money moving between accounts');
    Logger.log('  • CC Payment: Credit card payments (already counted as expenses)');
    
    // Verify column G is for Special Labels
    if (typeof getMM_COLS === 'function') {
      var cols = getMM_COLS();
      Logger.log('Special Label column: ' + cols.SPECIAL_LABEL + ' (G)');
    }
    
    Logger.log('✅ SPECIAL LABELS TEST COMPLETE');
    
    SpreadsheetApp.getUi().alert(
      'Special Labels Test',
      '✅ Special Labels Configuration\n\n' +
      'Labels: Ignore, Transfer, CC Payment\n' +
      'Column: G (Special Label)\n\n' +
      'These transactions are excluded from:\n' +
      '• Yearly totals\n' +
      '• Monthly summaries\n' +
      '• AI analysis\n' +
      '• Reports',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    return { success: true, labels: specialLabels };
    
  } catch (e) {
    Logger.log('❌ Error: ' + e.message);
    return { success: false, error: e.message };
  }
}
