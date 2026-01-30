/**
 * ============================================
 * MASTER HUB INTEGRATION
 * Donna Roggio LLC - Money Mastery System
 * ============================================
 * 
 * Central backend for client management, support requests,
 * guest management, and unauthorized access tracking.
 * 
 * MASTER HUB Sheet ID: 11MhJFe4xmSMBLPUXxePtq-yB2YsuhsScY1H7Dc4zwMI
 * 
 * Sheets:
 * - CLIENT MANAGEMENT: Registration, access keys, sheet IDs, copy keys
 * - SUPPORT REQUESTS: Support ticket logging
 * - GUEST MANAGEMENT: Client guests with opt-in tracking
 * - UNAUTHORIZED USERS: Unauthorized access attempts
 */

// ============================================
// CONFIGURATION
// ============================================

var MASTER_HUB_CONFIG = {
  SHEET_ID: '11MhJFe4xmSMBLPUXxePtq-yB2YsuhsScY1H7Dc4zwMI',
  
  // Sheet names
  SHEETS: {
    CLIENT_MANAGEMENT: 'CLIENT MANAGEMENT',
    SUPPORT_REQUESTS: 'SUPPORT REQUESTS',
    GUEST_MANAGEMENT: 'GUEST MANAGEMENT',
    UNAUTHORIZED_USERS: 'UNAUTHORIZED USERS'
  },
  
  // CLIENT MANAGEMENT columns (1-indexed)
  CLIENT_COLS: {
    MAIN_EMAIL: 1,           // A - Main Client Email
    ACCESS_CODE: 2,          // B - Client Access Code
    FIRST_NAME: 3,           // C - Client First Name
    LAST_NAME: 4,            // D - Client Last Name
    DATE_REGISTERED: 5,      // E - Date Registered
    PERSONAL_SHEET_ID: 6,    // F - Personal sheet ID
    BUSINESS_SHEET_1: 7,     // G - Business Sheet 1 ID
    BUSINESS_SHEET_2: 8,     // H - Business Sheet 2 ID
    BUSINESS_SHEET_3: 9,     // I - Business Sheet 3 ID
    COPY_KEY_PERSONAL: 10,   // J - Copy Management Key Personal
    COPY_KEY_BUSINESS: 11,   // K - Copy Management Key Business
    DISABLE_USAGE: 12        // L - Disable Usage?
  },
  
  // SUPPORT REQUESTS columns (1-indexed)
  SUPPORT_COLS: {
    SUPPORT_ID: 1,           // A - Support ID
    SUPPORT_ISSUE: 2,        // B - Support Issue (category)
    SUPPORT_DESCRIPTION: 3,  // C - Support Description
    PHOTO_1: 4,              // D - Support Ticket Photo 1
    PHOTO_2: 5,              // E - Support Ticket Photo 2
    PHOTO_3: 6,              // F - Support Ticket Photo 3
    PHOTO_4: 7,              // G - Support Ticket Photo 4
    PHOTO_5: 8,              // H - Support Ticket Photo 5
    DATE_SUBMITTED: 9,       // I - Date Submitted
    DATE_RESOLVED: 10,       // J - Date Resolved
    EMAIL_SENT: 11           // K - Email Sent?
  },
  
  // GUEST MANAGEMENT columns (1-indexed)
  GUEST_COLS: {
    MAIN_EMAIL: 1,           // A - Main Client Email
    MAIN_ACCESS_CODE: 2,     // B - Main Client Access Code
    // Guest 1
    GUEST_1_FIRST: 3,        // C - Guest 1 First Name
    GUEST_1_LAST: 4,         // D - Guest 1 Last Name
    GUEST_1_EMAIL: 5,        // E - Guest 1 Email
    GUEST_1_RELATIONSHIP: 6, // F - Relationship
    GUEST_1_OPTED_IN: 7,     // G - Opted In?
    // Guest 2
    GUEST_2_FIRST: 8,        // H - Guest 2 First Name
    GUEST_2_LAST: 9,         // I - Guest 2 Last Name
    GUEST_2_EMAIL: 10,       // J - Guest 2 Email
    GUEST_2_RELATIONSHIP: 11,// K - Relationship
    GUEST_2_OPTED_IN: 12,    // L - Opted In?
    // Guest 3
    GUEST_3_FIRST: 13,       // M - Guest 3 First Name
    GUEST_3_LAST: 14,        // N - Guest 3 Last Name
    GUEST_3_RELATIONSHIP: 15,// O - Relationship
    GUEST_3_EMAIL: 16,       // P - Guest 3 Email
    GUEST_3_OPTED_IN: 17     // Q - Opted In?
  },
  
  // UNAUTHORIZED USERS columns (1-indexed)
  UNAUTHORIZED_COLS: {
    MAIN_EMAIL: 1,           // A - Main client email
    MAIN_ACCESS_KEY: 2,      // B - Main Client Access Key
    COPY_KEY_PERSONAL: 3,    // C - Copy Management Key Personal
    COPY_KEY_BUSINESS: 4,    // D - Copy Management Key Business
    UNAUTHORIZED_EMAIL: 5,   // E - Unauthorized Email
    NOTICE_SENT: 6,          // F - Unauthorized email notice sent
    DISABLE_USAGE: 7         // G - Disable Usage?
  },
  
  // Local cache keys
  CACHE_KEYS: {
    CLIENT_DATA: 'mm_hub_client_data',
    LAST_SYNC: 'mm_hub_last_sync',
    FAILED_ATTEMPTS: 'mm_hub_failed_attempts'
  },
  
  // Security settings
  MAX_FAILED_ATTEMPTS: 3,
  CACHE_EXPIRY_HOURS: 24
};


// ============================================
// MASTER HUB SHEET ACCESS (Admin Only)
// ============================================

/**
 * Get the Master Hub spreadsheet (admin only)
 * @returns {Spreadsheet|null}
 */
function _getMasterHubSpreadsheet() {
  try {
    return SpreadsheetApp.openById(MASTER_HUB_CONFIG.SHEET_ID);
  } catch (e) {
    console.error('MasterHub: Failed to access Master Hub spreadsheet:', e.message);
    return null;
  }
}


/**
 * Get a specific sheet from Master Hub (admin only)
 * @param {string} sheetName - Name of the sheet
 * @returns {Sheet|null}
 */
function _getMasterHubSheet(sheetName) {
  var ss = _getMasterHubSpreadsheet();
  if (!ss) return null;
  
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    console.error('MasterHub: Sheet not found:', sheetName);
    return null;
  }
  return sheet;
}


// ============================================
// CLIENT MANAGEMENT FUNCTIONS
// ============================================

/**
 * Validate client registration (checks email + access key match)
 * Called via Web App for regular users
 * @param {string} email - Client email
 * @param {string} accessKey - Client access code
 * @returns {Object} Validation result
 */
function MH_validateClientRegistration(email, accessKey) {
  try {
    console.log('MH_validateClientRegistration called with email: ' + email + ', key: ' + accessKey);
    
    var sheet = _getMasterHubSheet(MASTER_HUB_CONFIG.SHEETS.CLIENT_MANAGEMENT);
    if (!sheet) {
      console.log('ERROR: Cannot access CLIENT MANAGEMENT sheet');
      return { success: false, error: 'Unable to access client database' };
    }
    
    var data = sheet.getDataRange().getValues();
    var cols = MASTER_HUB_CONFIG.CLIENT_COLS;
    
    // Normalize inputs
    var inputEmail = String(email || '').trim().toLowerCase();
    var inputKey = String(accessKey || '').trim().toUpperCase();
    
    console.log('Looking for email: ' + inputEmail + ', key: ' + inputKey);
    console.log('Total rows in sheet: ' + data.length);
    
    // Skip header row
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowEmail = String(row[cols.MAIN_EMAIL - 1] || '').trim().toLowerCase();
      var rowKey = String(row[cols.ACCESS_CODE - 1] || '').trim().toUpperCase();
      
      // Log first few rows for debugging
      if (i <= 5) {
        console.log('Row ' + i + ': email=' + rowEmail + ', key=' + rowKey);
      }
      
      // STRICT CHECK: Both email AND key must match
      if (rowEmail === inputEmail && rowKey === inputKey) {
        console.log('MATCH FOUND at row ' + (i + 1));
        // Check if disabled
        var isDisabled = row[cols.DISABLE_USAGE - 1] === true || 
                         String(row[cols.DISABLE_USAGE - 1]).toUpperCase() === 'TRUE';
        
        if (isDisabled) {
          return { 
            success: false, 
            error: 'Account has been disabled. Please contact support.',
            disabled: true
          };
        }
        
        // Check if already registered (has date registered)
        var dateRegistered = row[cols.DATE_REGISTERED - 1];
        var personalSheetId = row[cols.PERSONAL_SHEET_ID - 1];
        
        return {
          success: true,
          rowIndex: i + 1, // 1-indexed for sheet operations
          clientData: {
            email: rowEmail,
            accessCode: rowKey,
            firstName: row[cols.FIRST_NAME - 1] || '',
            lastName: row[cols.LAST_NAME - 1] || '',
            dateRegistered: dateRegistered || null,
            personalSheetId: personalSheetId || null,
            copyKeyPersonal: row[cols.COPY_KEY_PERSONAL - 1] || null,
            alreadyRegistered: !!dateRegistered && !!personalSheetId
          }
        };
      }
    }
    
    console.log('NO MATCH FOUND - email and key combination not in database');
    return { success: false, error: 'Email and access code do not match our records' };
    
  } catch (e) {
    console.error('MasterHub: validateClientRegistration error:', e.message);
    return { success: false, error: 'Validation failed: ' + e.message };
  }
}


/**
 * Update client registration after successful registration
 * @param {number} rowIndex - Row in CLIENT MANAGEMENT (1-indexed)
 * @param {Object} registrationData - Data to update
 * @returns {Object} Update result
 */
function MH_updateClientRegistration(rowIndex, registrationData) {
  try {
    var sheet = _getMasterHubSheet(MASTER_HUB_CONFIG.SHEETS.CLIENT_MANAGEMENT);
    if (!sheet) {
      return { success: false, error: 'Unable to access client database' };
    }
    
    var cols = MASTER_HUB_CONFIG.CLIENT_COLS;
    
    // Update first name if provided
    if (registrationData.firstName) {
      sheet.getRange(rowIndex, cols.FIRST_NAME).setValue(registrationData.firstName);
    }
    
    // Update last name if provided
    if (registrationData.lastName) {
      sheet.getRange(rowIndex, cols.LAST_NAME).setValue(registrationData.lastName);
    }
    
    // Set date registered
    sheet.getRange(rowIndex, cols.DATE_REGISTERED).setValue(new Date());
    
    // Set personal sheet ID
    if (registrationData.personalSheetId) {
      sheet.getRange(rowIndex, cols.PERSONAL_SHEET_ID).setValue(registrationData.personalSheetId);
    }
    
    // Generate and set Copy Management Key if not exists
    var existingKey = sheet.getRange(rowIndex, cols.COPY_KEY_PERSONAL).getValue();
    var copyKey = existingKey || _generateCopyManagementKey();
    if (!existingKey) {
      sheet.getRange(rowIndex, cols.COPY_KEY_PERSONAL).setValue(copyKey);
    }
    
    return { 
      success: true, 
      copyManagementKey: copyKey,
      message: 'Registration updated successfully'
    };
    
  } catch (e) {
    console.error('MasterHub: updateClientRegistration error:', e.message);
    return { success: false, error: 'Update failed: ' + e.message };
  }
}


/**
 * Check if a client is disabled
 * @param {string} email - Client email
 * @returns {boolean} True if disabled
 */
function MH_isClientDisabled(email) {
  try {
    var sheet = _getMasterHubSheet(MASTER_HUB_CONFIG.SHEETS.CLIENT_MANAGEMENT);
    if (!sheet) return false;
    
    var data = sheet.getDataRange().getValues();
    var cols = MASTER_HUB_CONFIG.CLIENT_COLS;
    
    for (var i = 1; i < data.length; i++) {
      var rowEmail = String(data[i][cols.MAIN_EMAIL - 1] || '').trim().toLowerCase();
      if (rowEmail === email.trim().toLowerCase()) {
        var isDisabled = data[i][cols.DISABLE_USAGE - 1] === true || 
                         String(data[i][cols.DISABLE_USAGE - 1]).toUpperCase() === 'TRUE';
        return isDisabled;
      }
    }
    return false;
  } catch (e) {
    console.error('MasterHub: isClientDisabled error:', e.message);
    return false;
  }
}


/**
 * Get client by email
 * @param {string} email - Client email
 * @returns {Object|null} Client data or null
 */
function MH_getClientByEmail(email) {
  try {
    var sheet = _getMasterHubSheet(MASTER_HUB_CONFIG.SHEETS.CLIENT_MANAGEMENT);
    if (!sheet) return null;
    
    var data = sheet.getDataRange().getValues();
    var cols = MASTER_HUB_CONFIG.CLIENT_COLS;
    
    for (var i = 1; i < data.length; i++) {
      var rowEmail = String(data[i][cols.MAIN_EMAIL - 1] || '').trim().toLowerCase();
      if (rowEmail === email.trim().toLowerCase()) {
        return {
          rowIndex: i + 1,
          email: rowEmail,
          accessCode: data[i][cols.ACCESS_CODE - 1] || '',
          firstName: data[i][cols.FIRST_NAME - 1] || '',
          lastName: data[i][cols.LAST_NAME - 1] || '',
          dateRegistered: data[i][cols.DATE_REGISTERED - 1] || null,
          personalSheetId: data[i][cols.PERSONAL_SHEET_ID - 1] || null,
          businessSheet1Id: data[i][cols.BUSINESS_SHEET_1 - 1] || null,
          businessSheet2Id: data[i][cols.BUSINESS_SHEET_2 - 1] || null,
          businessSheet3Id: data[i][cols.BUSINESS_SHEET_3 - 1] || null,
          copyKeyPersonal: data[i][cols.COPY_KEY_PERSONAL - 1] || null,
          copyKeyBusiness: data[i][cols.COPY_KEY_BUSINESS - 1] || null,
          disabled: data[i][cols.DISABLE_USAGE - 1] === true || 
                    String(data[i][cols.DISABLE_USAGE - 1]).toUpperCase() === 'TRUE'
        };
      }
    }
    return null;
  } catch (e) {
    console.error('MasterHub: getClientByEmail error:', e.message);
    return null;
  }
}


// ============================================
// COPY MANAGEMENT KEY FUNCTIONS
// ============================================

/**
 * Generate a unique Copy Management Key
 * Format: CMK-XXXXXXXX (8 random alphanumeric)
 * @returns {string} Generated key
 */
function _generateCopyManagementKey() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding I, O, 0, 1
  var key = 'CMK-';
  for (var i = 0; i < 8; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}


/**
 * Validate Copy Management Key
 * @param {string} copyKey - Copy key to validate
 * @param {string} clientEmail - Email of the client who should own this key
 * @returns {Object} Validation result
 */
function MH_validateCopyManagementKey(copyKey, clientEmail) {
  try {
    var sheet = _getMasterHubSheet(MASTER_HUB_CONFIG.SHEETS.CLIENT_MANAGEMENT);
    if (!sheet) {
      return { valid: false, error: 'Unable to access client database' };
    }
    
    var data = sheet.getDataRange().getValues();
    var cols = MASTER_HUB_CONFIG.CLIENT_COLS;
    
    for (var i = 1; i < data.length; i++) {
      var rowCopyKeyPersonal = String(data[i][cols.COPY_KEY_PERSONAL - 1] || '').trim();
      var rowCopyKeyBusiness = String(data[i][cols.COPY_KEY_BUSINESS - 1] || '').trim();
      var rowEmail = String(data[i][cols.MAIN_EMAIL - 1] || '').trim().toLowerCase();
      
      if (rowCopyKeyPersonal === copyKey || rowCopyKeyBusiness === copyKey) {
        // Found the key - check if it belongs to the right client
        if (rowEmail === clientEmail.trim().toLowerCase()) {
          return { valid: true, owner: rowEmail };
        } else {
          // Key exists but belongs to different client - UNAUTHORIZED COPY
          return { 
            valid: false, 
            unauthorized: true,
            originalOwner: rowEmail,
            copyKey: copyKey
          };
        }
      }
    }
    
    // Key not found - could be new or invalid
    return { valid: false, notFound: true };
    
  } catch (e) {
    console.error('MasterHub: validateCopyManagementKey error:', e.message);
    return { valid: false, error: e.message };
  }
}


// ============================================
// SUPPORT REQUESTS FUNCTIONS
// ============================================

/**
 * Log a support request to MASTER HUB
 * @param {Object} ticketData - Support ticket data
 * @returns {Object} Result
 */
function MH_logSupportRequest(ticketData) {
  try {
    var sheet = _getMasterHubSheet(MASTER_HUB_CONFIG.SHEETS.SUPPORT_REQUESTS);
    if (!sheet) {
      return { success: false, error: 'Unable to access support database' };
    }
    
    var cols = MASTER_HUB_CONFIG.SUPPORT_COLS;
    
    // Prepare row data
    var rowData = [];
    rowData[cols.SUPPORT_ID - 1] = ticketData.supportId || ticketData.ticketCode || '';
    rowData[cols.SUPPORT_ISSUE - 1] = ticketData.category || ticketData.issue || '';
    rowData[cols.SUPPORT_DESCRIPTION - 1] = ticketData.message || ticketData.description || '';
    
    // Photos/attachments (up to 5)
    var attachments = ticketData.attachments || [];
    rowData[cols.PHOTO_1 - 1] = attachments[0] || '';
    rowData[cols.PHOTO_2 - 1] = attachments[1] || '';
    rowData[cols.PHOTO_3 - 1] = attachments[2] || '';
    rowData[cols.PHOTO_4 - 1] = attachments[3] || '';
    rowData[cols.PHOTO_5 - 1] = attachments[4] || '';
    
    rowData[cols.DATE_SUBMITTED - 1] = new Date();
    rowData[cols.DATE_RESOLVED - 1] = ''; // Admin fills this
    rowData[cols.EMAIL_SENT - 1] = ticketData.emailSent ? 'TRUE' : 'FALSE';
    
    // Append row
    sheet.appendRow(rowData);
    
    return { success: true, message: 'Support request logged to Master Hub' };
    
  } catch (e) {
    console.error('MasterHub: logSupportRequest error:', e.message);
    return { success: false, error: 'Failed to log support request: ' + e.message };
  }
}


// ============================================
// GUEST MANAGEMENT FUNCTIONS
// ============================================

/**
 * Get guest by email
 * @param {string} guestEmail - Guest email to find
 * @returns {Object|null} Guest data or null
 */
function MH_getGuestByEmail(guestEmail) {
  try {
    var sheet = _getMasterHubSheet(MASTER_HUB_CONFIG.SHEETS.GUEST_MANAGEMENT);
    if (!sheet) return null;
    
    var data = sheet.getDataRange().getValues();
    var cols = MASTER_HUB_CONFIG.GUEST_COLS;
    var guestEmailLower = guestEmail.trim().toLowerCase();
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      
      // Check each guest slot (1, 2, 3)
      var guestSlots = [
        { 
          email: row[cols.GUEST_1_EMAIL - 1], 
          firstName: row[cols.GUEST_1_FIRST - 1],
          lastName: row[cols.GUEST_1_LAST - 1],
          relationship: row[cols.GUEST_1_RELATIONSHIP - 1],
          optedIn: row[cols.GUEST_1_OPTED_IN - 1],
          slot: 1
        },
        { 
          email: row[cols.GUEST_2_EMAIL - 1], 
          firstName: row[cols.GUEST_2_FIRST - 1],
          lastName: row[cols.GUEST_2_LAST - 1],
          relationship: row[cols.GUEST_2_RELATIONSHIP - 1],
          optedIn: row[cols.GUEST_2_OPTED_IN - 1],
          slot: 2
        },
        { 
          email: row[cols.GUEST_3_EMAIL - 1], 
          firstName: row[cols.GUEST_3_FIRST - 1],
          lastName: row[cols.GUEST_3_LAST - 1],
          relationship: row[cols.GUEST_3_RELATIONSHIP - 1],
          optedIn: row[cols.GUEST_3_OPTED_IN - 1],
          slot: 3
        }
      ];
      
      for (var j = 0; j < guestSlots.length; j++) {
        var guest = guestSlots[j];
        if (String(guest.email || '').trim().toLowerCase() === guestEmailLower) {
          return {
            rowIndex: i + 1,
            guestSlot: guest.slot,
            guestEmail: guest.email,
            guestFirstName: guest.firstName || '',
            guestLastName: guest.lastName || '',
            relationship: guest.relationship || '',
            optedIn: guest.optedIn === true || String(guest.optedIn).toUpperCase() === 'TRUE',
            mainClientEmail: row[cols.MAIN_EMAIL - 1] || '',
            mainClientAccessCode: row[cols.MAIN_ACCESS_CODE - 1] || ''
          };
        }
      }
    }
    
    return null;
    
  } catch (e) {
    console.error('MasterHub: getGuestByEmail error:', e.message);
    return null;
  }
}


/**
 * Add guest to GUEST MANAGEMENT sheet
 * @param {Object} guestData - Guest data to add
 * @returns {Object} Result
 */
function MH_addGuest(guestData) {
  try {
    var sheet = _getMasterHubSheet(MASTER_HUB_CONFIG.SHEETS.GUEST_MANAGEMENT);
    if (!sheet) {
      return { success: false, error: 'Unable to access guest database' };
    }
    
    var cols = MASTER_HUB_CONFIG.GUEST_COLS;
    
    // First, check if main client already has a row
    var data = sheet.getDataRange().getValues();
    var existingRowIndex = -1;
    var availableSlot = -1;
    
    for (var i = 1; i < data.length; i++) {
      var rowEmail = String(data[i][cols.MAIN_EMAIL - 1] || '').trim().toLowerCase();
      if (rowEmail === guestData.mainClientEmail.trim().toLowerCase()) {
        existingRowIndex = i + 1;
        
        // Find available slot
        if (!data[i][cols.GUEST_1_EMAIL - 1]) {
          availableSlot = 1;
        } else if (!data[i][cols.GUEST_2_EMAIL - 1]) {
          availableSlot = 2;
        } else if (!data[i][cols.GUEST_3_EMAIL - 1]) {
          availableSlot = 3;
        }
        break;
      }
    }
    
    if (existingRowIndex > 0 && availableSlot > 0) {
      // Update existing row with new guest
      var slotCols;
      if (availableSlot === 1) {
        slotCols = { first: cols.GUEST_1_FIRST, last: cols.GUEST_1_LAST, email: cols.GUEST_1_EMAIL, rel: cols.GUEST_1_RELATIONSHIP, opt: cols.GUEST_1_OPTED_IN };
      } else if (availableSlot === 2) {
        slotCols = { first: cols.GUEST_2_FIRST, last: cols.GUEST_2_LAST, email: cols.GUEST_2_EMAIL, rel: cols.GUEST_2_RELATIONSHIP, opt: cols.GUEST_2_OPTED_IN };
      } else {
        slotCols = { first: cols.GUEST_3_FIRST, last: cols.GUEST_3_LAST, email: cols.GUEST_3_EMAIL, rel: cols.GUEST_3_RELATIONSHIP, opt: cols.GUEST_3_OPTED_IN };
      }
      
      sheet.getRange(existingRowIndex, slotCols.first).setValue(guestData.firstName || '');
      sheet.getRange(existingRowIndex, slotCols.last).setValue(guestData.lastName || '');
      sheet.getRange(existingRowIndex, slotCols.email).setValue(guestData.email);
      sheet.getRange(existingRowIndex, slotCols.rel).setValue(guestData.relationship || '');
      sheet.getRange(existingRowIndex, slotCols.opt).setValue(guestData.optedIn ? 'TRUE' : 'FALSE');
      
    } else if (existingRowIndex > 0 && availableSlot < 0) {
      return { success: false, error: 'Maximum 3 guests allowed per client' };
      
    } else {
      // Create new row - insert at row 2 (after headers)
      sheet.insertRowAfter(1);
      var newRow = 2;
      
      sheet.getRange(newRow, cols.MAIN_EMAIL).setValue(guestData.mainClientEmail);
      sheet.getRange(newRow, cols.MAIN_ACCESS_CODE).setValue(guestData.mainClientAccessCode || '');
      sheet.getRange(newRow, cols.GUEST_1_FIRST).setValue(guestData.firstName || '');
      sheet.getRange(newRow, cols.GUEST_1_LAST).setValue(guestData.lastName || '');
      sheet.getRange(newRow, cols.GUEST_1_EMAIL).setValue(guestData.email);
      sheet.getRange(newRow, cols.GUEST_1_RELATIONSHIP).setValue(guestData.relationship || '');
      sheet.getRange(newRow, cols.GUEST_1_OPTED_IN).setValue(guestData.optedIn ? 'TRUE' : 'FALSE');
    }
    
    return { success: true, message: 'Guest added successfully' };
    
  } catch (e) {
    console.error('MasterHub: addGuest error:', e.message);
    return { success: false, error: 'Failed to add guest: ' + e.message };
  }
}


/**
 * Update guest opt-in status
 * @param {string} guestEmail - Guest email
 * @param {boolean} optedIn - New opt-in status
 * @returns {Object} Result
 */
function MH_updateGuestOptIn(guestEmail, optedIn) {
  try {
    var guestData = MH_getGuestByEmail(guestEmail);
    if (!guestData) {
      return { success: false, error: 'Guest not found' };
    }
    
    var sheet = _getMasterHubSheet(MASTER_HUB_CONFIG.SHEETS.GUEST_MANAGEMENT);
    var cols = MASTER_HUB_CONFIG.GUEST_COLS;
    
    var optCol;
    if (guestData.guestSlot === 1) optCol = cols.GUEST_1_OPTED_IN;
    else if (guestData.guestSlot === 2) optCol = cols.GUEST_2_OPTED_IN;
    else optCol = cols.GUEST_3_OPTED_IN;
    
    sheet.getRange(guestData.rowIndex, optCol).setValue(optedIn ? 'TRUE' : 'FALSE');
    
    return { success: true, message: 'Guest opt-in updated' };
    
  } catch (e) {
    console.error('MasterHub: updateGuestOptIn error:', e.message);
    return { success: false, error: e.message };
  }
}


// ============================================
// UNAUTHORIZED ACCESS FUNCTIONS
// ============================================

/**
 * Log unauthorized access attempt
 * @param {Object} accessData - Unauthorized access data
 * @returns {Object} Result
 */
function MH_logUnauthorizedAccess(accessData) {
  try {
    var sheet = _getMasterHubSheet(MASTER_HUB_CONFIG.SHEETS.UNAUTHORIZED_USERS);
    if (!sheet) {
      return { success: false, error: 'Unable to access unauthorized users database' };
    }
    
    var cols = MASTER_HUB_CONFIG.UNAUTHORIZED_COLS;
    
    // Check if this unauthorized email is already logged for this client
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var rowMainEmail = String(data[i][cols.MAIN_EMAIL - 1] || '').trim().toLowerCase();
      var rowUnauthorizedEmail = String(data[i][cols.UNAUTHORIZED_EMAIL - 1] || '').trim().toLowerCase();
      
      if (rowMainEmail === (accessData.mainClientEmail || '').trim().toLowerCase() &&
          rowUnauthorizedEmail === (accessData.unauthorizedEmail || '').trim().toLowerCase()) {
        // Already logged - don't duplicate
        return { success: true, alreadyLogged: true };
      }
    }
    
    // Prepare new row
    var rowData = [];
    rowData[cols.MAIN_EMAIL - 1] = accessData.mainClientEmail || '';
    rowData[cols.MAIN_ACCESS_KEY - 1] = accessData.mainClientAccessKey || '';
    rowData[cols.COPY_KEY_PERSONAL - 1] = accessData.copyKeyPersonal || '';
    rowData[cols.COPY_KEY_BUSINESS - 1] = accessData.copyKeyBusiness || '';
    rowData[cols.UNAUTHORIZED_EMAIL - 1] = accessData.unauthorizedEmail || '';
    rowData[cols.NOTICE_SENT - 1] = accessData.noticeSent ? 'TRUE' : 'FALSE';
    rowData[cols.DISABLE_USAGE - 1] = 'FALSE'; // Don't auto-disable, just flag
    
    sheet.appendRow(rowData);
    
    return { success: true, message: 'Unauthorized access logged' };
    
  } catch (e) {
    console.error('MasterHub: logUnauthorizedAccess error:', e.message);
    return { success: false, error: 'Failed to log unauthorized access: ' + e.message };
  }
}


// ============================================
// FAILED LOGIN TRACKING
// ============================================

/**
 * Track failed login attempt
 * @param {string} email - Email that failed
 * @returns {Object} Result with attempt count
 */
function MH_trackFailedLogin(email) {
  try {
    var props = PropertiesService.getDocumentProperties();
    var key = MASTER_HUB_CONFIG.CACHE_KEYS.FAILED_ATTEMPTS + '_' + email.toLowerCase();
    var attempts = parseInt(props.getProperty(key) || '0', 10) + 1;
    
    props.setProperty(key, String(attempts));
    
    var maxed = attempts >= MASTER_HUB_CONFIG.MAX_FAILED_ATTEMPTS;
    
    return {
      attempts: attempts,
      maxAttempts: MASTER_HUB_CONFIG.MAX_FAILED_ATTEMPTS,
      maxedOut: maxed
    };
    
  } catch (e) {
    console.error('MasterHub: trackFailedLogin error:', e.message);
    return { attempts: 0, maxAttempts: 3, maxedOut: false };
  }
}


/**
 * Reset failed login attempts
 * @param {string} email - Email to reset
 */
function MH_resetFailedLogins(email) {
  try {
    var props = PropertiesService.getDocumentProperties();
    var key = MASTER_HUB_CONFIG.CACHE_KEYS.FAILED_ATTEMPTS + '_' + email.toLowerCase();
    props.deleteProperty(key);
  } catch (e) {
    console.error('MasterHub: resetFailedLogins error:', e.message);
  }
}


/**
 * Get failed login count
 * @param {string} email - Email to check
 * @returns {number} Number of failed attempts
 */
function MH_getFailedLoginCount(email) {
  try {
    var props = PropertiesService.getDocumentProperties();
    var key = MASTER_HUB_CONFIG.CACHE_KEYS.FAILED_ATTEMPTS + '_' + email.toLowerCase();
    return parseInt(props.getProperty(key) || '0', 10);
  } catch (e) {
    return 0;
  }
}


// ============================================
// LOCAL CACHE MANAGEMENT (for users without direct Hub access)
// ============================================

/**
 * Sync client data to local cache (admin only)
 * This allows regular users to validate against cached data
 */
function MH_syncClientDataToLocalCache() {
  try {
    // Only admin can sync
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      return { success: false, error: 'Admin access required' };
    }
    
    var sheet = _getMasterHubSheet(MASTER_HUB_CONFIG.SHEETS.CLIENT_MANAGEMENT);
    if (!sheet) {
      return { success: false, error: 'Unable to access client database' };
    }
    
    var data = sheet.getDataRange().getValues();
    var cols = MASTER_HUB_CONFIG.CLIENT_COLS;
    
    // Build cache object (only essential data for validation)
    var clientCache = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var email = String(row[cols.MAIN_EMAIL - 1] || '').trim().toLowerCase();
      var accessCode = String(row[cols.ACCESS_CODE - 1] || '').trim();
      
      if (email && accessCode) {
        clientCache.push({
          e: email,
          k: accessCode,
          d: row[cols.DISABLE_USAGE - 1] === true || String(row[cols.DISABLE_USAGE - 1]).toUpperCase() === 'TRUE'
        });
      }
    }
    
    // Store in document properties
    var props = PropertiesService.getDocumentProperties();
    props.setProperty(MASTER_HUB_CONFIG.CACHE_KEYS.CLIENT_DATA, JSON.stringify(clientCache));
    props.setProperty(MASTER_HUB_CONFIG.CACHE_KEYS.LAST_SYNC, new Date().toISOString());
    
    return { 
      success: true, 
      clientCount: clientCache.length,
      message: 'Client data synced to local cache'
    };
    
  } catch (e) {
    console.error('MasterHub: syncClientDataToLocalCache error:', e.message);
    return { success: false, error: e.message };
  }
}


/**
 * Validate client from local cache (for regular users)
 * @param {string} email - Client email
 * @param {string} accessKey - Access code
 * @returns {Object} Validation result
 */
function MH_validateClientFromCache(email, accessKey) {
  try {
    var props = PropertiesService.getDocumentProperties();
    var cacheJson = props.getProperty(MASTER_HUB_CONFIG.CACHE_KEYS.CLIENT_DATA);
    
    if (!cacheJson) {
      return { success: false, error: 'Client data not available. Admin sync required.' };
    }
    
    var clientCache = JSON.parse(cacheJson);
    var emailLower = email.trim().toLowerCase();
    var keyTrimmed = accessKey.trim();
    
    for (var i = 0; i < clientCache.length; i++) {
      var client = clientCache[i];
      if (client.e === emailLower && client.k === keyTrimmed) {
        if (client.d) {
          return { success: false, error: 'Account disabled', disabled: true };
        }
        return { success: true, cached: true };
      }
    }
    
    return { success: false, error: 'Email and access code do not match' };
    
  } catch (e) {
    console.error('MasterHub: validateClientFromCache error:', e.message);
    return { success: false, error: 'Cache validation failed' };
  }
}


// ============================================
// ADMIN UTILITIES
// ============================================

/**
 * Admin: Get all clients (summary)
 * @returns {Object} Client list
 */
function MH_ADMIN_getAllClients() {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      return { success: false, error: 'Admin access required' };
    }
    
    var sheet = _getMasterHubSheet(MASTER_HUB_CONFIG.SHEETS.CLIENT_MANAGEMENT);
    if (!sheet) {
      return { success: false, error: 'Unable to access client database' };
    }
    
    var data = sheet.getDataRange().getValues();
    var cols = MASTER_HUB_CONFIG.CLIENT_COLS;
    var clients = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var email = row[cols.MAIN_EMAIL - 1];
      if (!email) continue;
      
      clients.push({
        email: email,
        firstName: row[cols.FIRST_NAME - 1] || '',
        lastName: row[cols.LAST_NAME - 1] || '',
        registered: !!row[cols.DATE_REGISTERED - 1],
        dateRegistered: row[cols.DATE_REGISTERED - 1] || null,
        disabled: row[cols.DISABLE_USAGE - 1] === true || String(row[cols.DISABLE_USAGE - 1]).toUpperCase() === 'TRUE'
      });
    }
    
    return { success: true, clients: clients };
    
  } catch (e) {
    console.error('MasterHub: ADMIN_getAllClients error:', e.message);
    return { success: false, error: e.message };
  }
}


/**
 * Admin: Get unauthorized access log
 * @returns {Object} Unauthorized access list
 */
function MH_ADMIN_getUnauthorizedAccess() {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      return { success: false, error: 'Admin access required' };
    }
    
    var sheet = _getMasterHubSheet(MASTER_HUB_CONFIG.SHEETS.UNAUTHORIZED_USERS);
    if (!sheet) {
      return { success: false, error: 'Unable to access unauthorized users database' };
    }
    
    var data = sheet.getDataRange().getValues();
    var cols = MASTER_HUB_CONFIG.UNAUTHORIZED_COLS;
    var entries = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[cols.UNAUTHORIZED_EMAIL - 1]) continue;
      
      entries.push({
        mainClientEmail: row[cols.MAIN_EMAIL - 1] || '',
        unauthorizedEmail: row[cols.UNAUTHORIZED_EMAIL - 1] || '',
        noticeSent: row[cols.NOTICE_SENT - 1] === true || String(row[cols.NOTICE_SENT - 1]).toUpperCase() === 'TRUE',
        disabled: row[cols.DISABLE_USAGE - 1] === true || String(row[cols.DISABLE_USAGE - 1]).toUpperCase() === 'TRUE'
      });
    }
    
    return { success: true, entries: entries };
    
  } catch (e) {
    console.error('MasterHub: ADMIN_getUnauthorizedAccess error:', e.message);
    return { success: false, error: e.message };
  }
}


/**
 * Admin: Set client disabled status
 * @param {string} email - Client email
 * @param {boolean} disabled - New disabled status
 * @returns {Object} Result
 */
function MH_ADMIN_setClientDisabled(email, disabled) {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      return { success: false, error: 'Admin access required' };
    }
    
    var sheet = _getMasterHubSheet(MASTER_HUB_CONFIG.SHEETS.CLIENT_MANAGEMENT);
    if (!sheet) {
      return { success: false, error: 'Unable to access client database' };
    }
    
    var data = sheet.getDataRange().getValues();
    var cols = MASTER_HUB_CONFIG.CLIENT_COLS;
    
    for (var i = 1; i < data.length; i++) {
      var rowEmail = String(data[i][cols.MAIN_EMAIL - 1] || '').trim().toLowerCase();
      if (rowEmail === email.trim().toLowerCase()) {
        sheet.getRange(i + 1, cols.DISABLE_USAGE).setValue(disabled ? 'TRUE' : 'FALSE');
        return { success: true, message: 'Client status updated' };
      }
    }
    
    return { success: false, error: 'Client not found' };
    
  } catch (e) {
    console.error('MasterHub: ADMIN_setClientDisabled error:', e.message);
    return { success: false, error: e.message };
  }
}


// ============================================
// HELPER: Check if user is master/admin
// ============================================

/**
 * Check if email is a master/admin email
 * Uses MM_CFG if available, falls back to Config
 */
function MM_isMasterEmail_(email) {
  try {
    // Try MM_CFG first
    if (typeof MM_CFG !== 'undefined' && MM_CFG.MASTER_EMAILS) {
      var masterEmails = MM_CFG.MASTER_EMAILS;
      if (typeof masterEmails === 'string') {
        masterEmails = masterEmails.split(',').map(function(e) { return e.trim().toLowerCase(); });
      }
      return masterEmails.indexOf(email.toLowerCase()) !== -1;
    }
    
    // Fallback to document properties
    var props = PropertiesService.getDocumentProperties();
    var masterEmailsProp = props.getProperty('mm_master_emails');
    if (masterEmailsProp) {
      var masterEmails = masterEmailsProp.split(',').map(function(e) { return e.trim().toLowerCase(); });
      return masterEmails.indexOf(email.toLowerCase()) !== -1;
    }
    
    return false;
  } catch (e) {
    return false;
  }
}
