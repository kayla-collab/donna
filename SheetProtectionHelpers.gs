/**
 * SHEET PROTECTION HELPERS
 * Utilities to safely write to sheets that may be protected
 */

/**
 * Safely write values to a range, handling protection errors
 * @param {Sheet} sheet - The sheet object
 * @param {Range|string} range - Range object or A1 notation
 * @param {Array|*} values - Values to write (2D array for setValues, single value for setValue)
 * @param {boolean} isSingleValue - True if writing single value, false for array
 * @returns {Object} - {success: boolean, error: string}
 */
function safeWriteToSheet(sheet, range, values, isSingleValue) {
  try {
    // Get the range object
    var rangeObj = (typeof range === 'string') ? sheet.getRange(range) : range;
    
    // Check if range is protected
    var protections = rangeObj.getProtections(SpreadsheetApp.ProtectionType.RANGE);
    var isProtected = protections.length > 0;
    
    if (isProtected) {
      Logger.log('⚠️ Range is protected, attempting to write anyway...');
      
      // Try to check if current user can edit
      var canEdit = protections.every(function(protection) {
        return protection.canEdit();
      });
      
      if (!canEdit) {
        Logger.log('❌ User cannot edit protected range');
        return {
          success: false,
          error: 'Range is protected and user does not have edit permission'
        };
      }
    }
    
    // Attempt write operation
    if (isSingleValue) {
      rangeObj.setValue(values);
    } else {
      rangeObj.setValues(values);
    }
    
    Logger.log('✅ Successfully wrote to range');
    return { success: true };
    
  } catch (e) {
    var errorMsg = e.toString();
    
    // Check if it's a protection error
    if (errorMsg.indexOf('protected') !== -1 || errorMsg.indexOf('permission') !== -1) {
      Logger.log('❌ Protection error: ' + errorMsg);
      return {
        success: false,
        error: 'Cannot write to protected range: ' + errorMsg,
        isProtectionError: true
      };
    }
    
    Logger.log('❌ Write error: ' + errorMsg);
    return {
      success: false,
      error: errorMsg
    };
  }
}

/**
 * Remove all protections from a sheet (admin only)
 * @param {string} sheetName - Name of the sheet
 * @returns {Object} - {success: boolean, removed: number}
 */
function ADMIN_RemoveSheetProtections(sheetName) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      return { success: false, error: 'Sheet not found: ' + sheetName };
    }
    
    // Remove sheet-level protections
    var sheetProtections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    var sheetCount = sheetProtections.length;
    sheetProtections.forEach(function(protection) {
      protection.remove();
    });
    
    // Remove range-level protections
    var rangeProtections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
    var rangeCount = rangeProtections.length;
    rangeProtections.forEach(function(protection) {
      protection.remove();
    });
    
    var totalRemoved = sheetCount + rangeCount;
    Logger.log('Removed ' + totalRemoved + ' protections from ' + sheetName);
    
    return {
      success: true,
      removed: totalRemoved,
      sheetProtections: sheetCount,
      rangeProtections: rangeCount
    };
    
  } catch (e) {
    Logger.log('ERROR removing protections: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Remove protections from all ACCOUNT sheets
 */
function ADMIN_RemoveAllAccountProtections() {
  try {
    var ui = SpreadsheetApp.getUi();
    var response = ui.alert(
      'Remove All Protections',
      'This will remove ALL protections from ACCOUNT 1-10 sheets.\n\n' +
      'This is necessary for transaction imports to work.\n\n' +
      'Continue?',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      return;
    }
    
    var totalRemoved = 0;
    var results = [];
    
    for (var i = 1; i <= 10; i++) {
      var sheetName = 'ACCOUNT ' + i;
      var result = ADMIN_RemoveSheetProtections(sheetName);
      
      if (result.success) {
        totalRemoved += result.removed;
        if (result.removed > 0) {
          results.push(sheetName + ': ' + result.removed + ' removed');
        }
      }
    }
    
    var message = 'Protection Removal Complete\n\n';
    message += 'Total protections removed: ' + totalRemoved + '\n\n';
    
    if (results.length > 0) {
      message += 'Details:\n' + results.join('\n');
    } else {
      message += 'No protections found on ACCOUNT sheets.';
    }
    
    ui.alert('Complete', message, ui.ButtonSet.OK);
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Check which sheets/ranges are protected
 */
function ADMIN_CheckProtections() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    
    var message = 'SHEET PROTECTIONS REPORT\n\n';
    var hasProtections = false;
    
    sheets.forEach(function(sheet) {
      var sheetName = sheet.getName();
      
      // Check sheet-level protections
      var sheetProtections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
      
      // Check range-level protections
      var rangeProtections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
      
      var totalProtections = sheetProtections.length + rangeProtections.length;
      
      if (totalProtections > 0) {
        hasProtections = true;
        message += sheetName + ':\n';
        
        if (sheetProtections.length > 0) {
          message += '  • ' + sheetProtections.length + ' sheet protection(s)\n';
        }
        
        if (rangeProtections.length > 0) {
          message += '  • ' + rangeProtections.length + ' range protection(s)\n';
          
          // Show first few ranges
          rangeProtections.slice(0, 3).forEach(function(protection) {
            var range = protection.getRange();
            message += '    - ' + range.getA1Notation() + '\n';
          });
          
          if (rangeProtections.length > 3) {
            message += '    - ... and ' + (rangeProtections.length - 3) + ' more\n';
          }
        }
        
        message += '\n';
      }
    });
    
    if (!hasProtections) {
      message += 'No protections found on any sheets.\n\n';
      message += '✅ Transaction imports should work without issues.';
    } else {
      message += '⚠️ Protections may block transaction imports.\n\n';
      message += 'To fix: Admin → Protection Tools → Remove All Account Protections';
    }
    
    SpreadsheetApp.getUi().alert('Protection Report', message, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}
