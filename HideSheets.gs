/**
 * ═══════════════════════════════════════════════════════════════════
 * HIDE SHEETS UTILITY
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 */

// ==================== HIDE CURRENT SHEET ====================
function closeActiveSheet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getActiveSheet();
    
    // Check if there are other visible sheets
    const visibleSheets = ss.getSheets().filter(s => !s.isSheetHidden());
    
    if (visibleSheets.length <= 1) {
      SpreadsheetApp.getUi().alert(
        '⚠️ Cannot Hide Last Sheet',
        'You cannot hide the last visible sheet. At least one sheet must remain visible.',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return;
    }

    // Hide the sheet
    sheet.hideSheet();
    
    // Navigate to the first visible sheet
    const nextVisible = ss.getSheets().find(s => !s.isSheetHidden());
    if (nextVisible) {
      ss.setActiveSheet(nextVisible);
    }

    SpreadsheetApp.getUi().alert(
      '✅ Sheet Hidden',
      `"${sheet.getName()}" has been hidden.\n\nYou can unhide it from the Navigation menu.`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );

  } catch (error) {
    Logger.log('Hide sheet error: ' + error.message);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

// ==================== UNHIDE SPECIFIC SHEET ====================
function unhideSheet(sheetName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      SpreadsheetApp.getUi().alert(
        'Sheet Not Found',
        `Could not find sheet: ${sheetName}`,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return;
    }

    if (!sheet.isSheetHidden()) {
      SpreadsheetApp.getUi().alert(
        'Sheet Already Visible',
        `"${sheetName}" is already visible.`,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return;
    }

    sheet.showSheet();
    ss.setActiveSheet(sheet);

    SpreadsheetApp.getUi().alert(
      '✅ Sheet Unhidden',
      `"${sheetName}" is now visible.`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );

  } catch (error) {
    Logger.log('Unhide sheet error: ' + error.message);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

// ==================== GET HIDDEN SHEETS LIST ====================
function getHiddenSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  
  return sheets
    .filter(sheet => sheet.isSheetHidden())
    .map(sheet => ({
      name: sheet.getName(),
      index: sheet.getIndex()
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
