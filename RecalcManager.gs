/**
 * ═══════════════════════════════════════════════════════════════════
 * RECALC MANAGER - Performance Optimization System
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 */

const REFRESH_MINUTES = 15;    // Background refresh frequency
const LIVE_ROWS = 1500;        // Rows to keep when shrinking references

// ==================== INSTALLER (Run ONCE) ====================
function installRecalcManager() {
  try {
    // Set spreadsheet to recalc only on change
    setAutoRecalcOnChange();

    // Delete old duplicate triggers
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'backgroundRefresh') {
        ScriptApp.deleteTrigger(trigger);
      }
    });

    // Create new refresh trigger
    ScriptApp.newTrigger('backgroundRefresh')
      .timeBased()
      .everyMinutes(REFRESH_MINUTES)
      .create();

    SpreadsheetApp.getUi().alert(
      '✅ Recalc Manager Installed',
      'The optimization system is now active and will run every ' + REFRESH_MINUTES + ' minutes.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );

  } catch (error) {
    Logger.log('RecalcManager installation error: ' + error.message);
    SpreadsheetApp.getUi().alert('Installation Error: ' + error.message);
  }
}

// ==================== BACKGROUND REFRESH (Silent) ====================
function backgroundRefresh() {
  const lock = LockService.getDocumentLock();
  
  // Skip if another instance is running
  if (!lock.tryLock(0)) {
    Logger.log('RecalcManager: Skipped (another instance running)');
    return;
  }

  try {
    // Force recalculation
    SpreadsheetApp.flush();
    
    // Optimize whole-column references
    shrinkWholeColumnReferences();
    
    Logger.log('RecalcManager: Refresh completed successfully');
    
  } catch (error) {
    Logger.log('RecalcManager error: ' + error.message);
  } finally {
    lock.releaseLock();
  }
}

// ==================== SET AUTO RECALC MODE ====================
function setAutoRecalcOnChange() {
  try {
    const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
    
    const request = {
      requests: [{
        updateSpreadsheetProperties: {
          properties: {
            autoRecalc: 'ON_CHANGE'  // ON_CHANGE | MINUTE | HOUR
          },
          fields: 'autoRecalc'
        }
      }]
    };

    Sheets.Spreadsheets.batchUpdate(request, ssId);
    Logger.log('RecalcManager: Auto-recalc set to ON_CHANGE');
    
  } catch (error) {
    Logger.log('RecalcManager: Could not set auto-recalc mode: ' + error.message);
  }
}

// ==================== OPTIMIZE WHOLE-COLUMN REFERENCES ====================
function shrinkWholeColumnReferences() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  
  sheets.forEach(sheet => {
    try {
      const lastRow = sheet.getLastRow();
      if (!lastRow || lastRow < 2) return;

      const dataRange = sheet.getDataRange();
      const formulas = dataRange.getFormulas();
      
      let changesCount = 0;

      for (let r = 0; r < formulas.length; r++) {
        for (let c = 0; c < formulas[r].length; c++) {
          const formula = formulas[r][c];
          if (!formula) continue;

          // Check for whole-column or whole-row references
          if (/[A-Z]+:[A-Z]+/.test(formula) || /\d+:\d+/.test(formula)) {
            const colLetter = columnToLetter(c + 1);
            const maxRow = Math.max(lastRow, LIVE_ROWS);
            const newRef = `${colLetter}2:${colLetter}${maxRow}`;
            
            // Replace whole-column/row references
            let newFormula = formula
              .replace(/[A-Z]+:[A-Z]+/g, newRef)
              .replace(/\d+:\d+/g, newRef);
            
            if (newFormula !== formula) {
              sheet.getRange(r + 1, c + 1).setFormula(newFormula);
              changesCount++;
            }
          }
        }
      }

      if (changesCount > 0) {
        Logger.log(`RecalcManager: Optimized ${changesCount} formulas in ${sheet.getName()}`);
      }
      
    } catch (error) {
      Logger.log(`RecalcManager: Error optimizing sheet ${sheet.getName()}: ${error.message}`);
    }
  });
}

// ==================== UTILITY: Column Number to Letter ====================
function columnToLetter(column) {
  let temp;
  let letter = '';
  
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  
  return letter;
}

// ==================== UNINSTALLER ====================
function uninstallRecalcManager() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'backgroundRefresh') {
        ScriptApp.deleteTrigger(trigger);
      }
    });

    SpreadsheetApp.getUi().alert(
      '✅ Recalc Manager Uninstalled',
      'All background refresh triggers have been removed.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );

  } catch (error) {
    Logger.log('RecalcManager uninstall error: ' + error.message);
    SpreadsheetApp.getUi().alert('Uninstall Error: ' + error.message);
  }
}
