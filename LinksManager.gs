/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * LINKS MANAGER - Centralized Link Management
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Manages a LINKS sheet for easy configuration of external URLs
 * Used by tutorial videos, help guides, and other external resources
 */

/**
 * Get a link from the LINKS sheet
 * @param {string} linkName - Name of the link to retrieve
 * @returns {string} - URL or null if not found
 */
function getLink(linkName) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var linksSheet = ss.getSheetByName('LINKS');
    
    if (!linksSheet) {
      Logger.log('⚠️ LINKS sheet not found - creating it now');
      createLinksSheet();
      linksSheet = ss.getSheetByName('LINKS');
    }
    
    var data = linksSheet.getDataRange().getValues();
    
    // Find the link by name
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === linkName) {
        var url = data[i][1];
        Logger.log('✅ Found link: ' + linkName + ' = ' + url);
        return url;
      }
    }
    
    Logger.log('⚠️ Link not found: ' + linkName);
    return null;
    
  } catch (e) {
    Logger.log('❌ getLink error: ' + e.message);
    return null;
  }
}

/**
 * Create the LINKS sheet with default links
 */
function createLinksSheet() {
  try {
    Logger.log('📝 Creating LINKS sheet...');
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Check if sheet already exists
    var existingSheet = ss.getSheetByName('LINKS');
    if (existingSheet) {
      Logger.log('LINKS sheet already exists');
      return existingSheet;
    }
    
    // Create new sheet
    var sheet = ss.insertSheet('LINKS', 0); // Insert as first tab
    
    // Set up headers
    sheet.getRange('A1:B1').setValues([['Link Name', 'URL']]);
    sheet.getRange('A1:B1').setFontWeight('bold').setBackground('#ab9478').setFontColor('#ffffff');
    
    // Add default links (Updated 2026: Removed Plaid, added Stripe)
    var defaultLinks = [
      ['TUTORIAL_VIDEO', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
      ['HELP_GUIDEBOOK', 'https://docs.google.com/document/d/YOUR_HELP_DOC_ID/edit'],
      ['MEMBERSHIP_HUB', 'https://www.donnaroggio.com/membership'],
      ['COLLECTIVE', 'https://www.donnaroggio.com/collective'],
      ['SUPPORT_EMAIL', 'support@risingandthriving.com'],
      ['WEBSITE', 'https://www.donnaroggio.com'],
      ['CHATGPT', 'https://chat.openai.com'],
      ['STRIPE_DOCS', 'https://stripe.com/docs/financial-connections'],
      ['PRIVACY_POLICY', 'https://www.donnaroggio.com/privacy'],
      ['TERMS_OF_SERVICE', 'https://www.donnaroggio.com/terms']
    ];
    
    sheet.getRange(2, 1, defaultLinks.length, 2).setValues(defaultLinks);
    
    // Format columns
    sheet.setColumnWidth(1, 250); // Link Name
    sheet.setColumnWidth(2, 500); // URL
    sheet.setFrozenRows(1);
    
    // NOTE: No protection added - users need to edit links freely
    // Protection was causing "protected cell" errors for end users
    
    // Add note
    sheet.getRange('A1').setNote(
      'LINKS SHEET - Centralized URL Management\n\n' +
      'This sheet stores all external URLs used throughout the dashboard.\n\n' +
      'To add a new link:\n' +
      '1. Add a row with Link Name and URL\n' +
      '2. Use getLink("LINK_NAME") in code to retrieve it\n\n' +
      'Edit URLs here instead of hardcoding them in scripts.\n\n' +
      '© 2026 Donna Roggio LLC'
    );
    
    Logger.log('✅ LINKS sheet created with ' + defaultLinks.length + ' default links');
    
    return sheet;
    
  } catch (e) {
    Logger.log('❌ createLinksSheet error: ' + e.message);
    throw e;
  }
}

/**
 * Update a link in the LINKS sheet
 * @param {string} linkName - Name of the link
 * @param {string} url - New URL
 * @returns {boolean} - Success status
 */
function updateLink(linkName, url) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var linksSheet = ss.getSheetByName('LINKS');
    
    if (!linksSheet) {
      createLinksSheet();
      linksSheet = ss.getSheetByName('LINKS');
    }
    
    var data = linksSheet.getDataRange().getValues();
    
    // Find and update the link
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === linkName) {
        // Use safe write if available
        if (typeof safeWriteToSheet === 'function') {
          var result = safeWriteToSheet(linksSheet, linksSheet.getRange(i + 1, 2), url, true);
          if (result.success) {
            Logger.log('✅ Updated link: ' + linkName + ' = ' + url);
            return true;
          } else {
            Logger.log('❌ Safe write failed: ' + result.error);
            return false;
          }
        } else {
          linksSheet.getRange(i + 1, 2).setValue(url);
          Logger.log('✅ Updated link: ' + linkName + ' = ' + url);
          return true;
        }
      }
    }
    
    // If not found, add new row
    var lastRow = linksSheet.getLastRow();
    linksSheet.getRange(lastRow + 1, 1, 1, 2).setValues([[linkName, url]]);
    Logger.log('✅ Added new link: ' + linkName + ' = ' + url);
    
    return true;
    
  } catch (e) {
    Logger.log('❌ updateLink error: ' + e.message);
    return false;
  }
}

/**
 * Open a link by name
 * Opens the URL in a new browser tab
 * @param {string} linkName - Name of the link to open
 */
function openLink(linkName) {
  try {
    var url = getLink(linkName);
    
    if (!url) {
      SpreadsheetApp.getUi().alert('Link not found: ' + linkName);
      return;
    }
    
    var html = HtmlService.createHtmlOutput(
      '<script>window.open("' + url + '", "_blank");google.script.host.close();</script>'
    ).setWidth(1).setHeight(1);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'Opening...');
    
  } catch (e) {
    Logger.log('❌ openLink error: ' + e.message);
    SpreadsheetApp.getUi().alert('Error opening link: ' + e.message);
  }
}

/**
 * Get all links as an object
 * Useful for passing to HTML templates
 * @returns {Object} - Object with link names as keys and URLs as values
 */
function getAllLinks() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var linksSheet = ss.getSheetByName('LINKS');
    
    if (!linksSheet) {
      createLinksSheet();
      linksSheet = ss.getSheetByName('LINKS');
    }
    
    var data = linksSheet.getDataRange().getValues();
    var links = {};
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][1]) {
        links[data[i][0]] = data[i][1];
      }
    }
    
    Logger.log('✅ Retrieved ' + Object.keys(links).length + ' links');
    
    return links;
    
  } catch (e) {
    Logger.log('❌ getAllLinks error: ' + e.message);
    return {};
  }
}

/**
 * Admin function: Setup LINKS sheet (creates if missing, moves to first position)
 */
function ADMIN_setupLinksSheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var linksSheet = ss.getSheetByName('LINKS');
    
    if (!linksSheet) {
      Logger.log('Creating LINKS sheet...');
      linksSheet = createLinksSheet();
      SpreadsheetApp.getUi().alert('✅ LINKS sheet created successfully as the first tab!');
    } else {
      Logger.log('LINKS sheet exists, moving to first position...');
      ss.setActiveSheet(linksSheet);
      ss.moveActiveSheet(1); // Move to first position
      SpreadsheetApp.getUi().alert('✅ LINKS sheet moved to first position!');
    }
    
    Logger.log('LINKS sheet setup complete');
    
  } catch (e) {
    Logger.log('❌ ADMIN_setupLinksSheet error: ' + e.message);
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

/**
 * Update tutorial video link to use LINKS sheet
 * Call this from Welcome.gs or other files
 */
function getTutorialVideoUrl() {
  return getLink('TUTORIAL_VIDEO') || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
}

/**
 * Update help guidebook link
 */
function getHelpGuidebookUrl() {
  return getLink('HELP_GUIDEBOOK') || 'https://docs.google.com/document/d/YOUR_DOC_ID/edit';
}
