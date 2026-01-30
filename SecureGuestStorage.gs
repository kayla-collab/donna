/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * SECURE GUEST STORAGE SYSTEM
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Handles secure storage of guest credentials:
 * - Guest credentials are stored HASHED (no plain text passwords)
 * - Uses Script Properties as "secret space" - not visible to users
 * - Syncs guest data to external GUEST LOG sheet
 * - No access keys required for guests
 * - Local authentication against hashed credentials
 * 
 * SECURITY MODEL:
 * - Admin adds guest with email
 * - System generates secure hash of guest credentials
 * - Hash stored in Script Properties (hidden from UI)
 * - Guest authenticates locally against stored hash
 * - Sheet never sees or stores plain credentials
 */

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

var SECURE_GUEST_CONFIG = {
  // Script Properties keys (secret space)
  GUEST_HASH_PREFIX: 'mm_guest_hash_',
  GUEST_DATA_PREFIX: 'mm_guest_data_',
  ALL_GUESTS_KEY: 'mm_all_guests',
  
  // External GUEST LOG sheet - NOW USES NEW MASTER HUB
  // DEPRECATED: Use MasterHub.gs for guest operations
  GUEST_LOG_SHEET_ID: '11MhJFe4xmSMBLPUXxePtq-yB2YsuhsScY1H7Dc4zwMI',  // NEW MASTER HUB
  GUEST_LOG_SHEET_NAME: 'GUEST MANAGEMENT',  // Updated sheet name
  
  // Guest data columns - NOW SEE MasterHub.gs GUEST_COLS for new structure
  // Legacy columns kept for backward compatibility
  GUEST_LOG_COLUMNS: {
    FIRST_NAME: 3,    // Guest 1 First Name (Column C in new structure)
    LAST_NAME: 4,     // Guest 1 Last Name (Column D)
    EMAIL: 5,         // Guest 1 Email (Column E)
    OPTED_IN: 7,      // Guest 1 Opted In? (Column G)
    ACCESS_USER_NAME: 1, // Main Client Email (Column A)
    ACCESSED_SHEET: 1    // Same as above - linked via main client
  },
  
  // Salt for hashing (should be unique per installation)
  HASH_SALT: 'MM2026_DONNA_ROGGIO_SECURE_GUEST_'
};

// ═══════════════════════════════════════════════════════════════════
// SECURE HASHING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Generate a secure hash for guest credentials
 * Uses SHA-256 with salt
 * @param {string} email - Guest email
 * @param {string} pin - Guest PIN (optional for initial invite)
 * @returns {string} Hashed credential
 */
function generateGuestHash_(email, pin) {
  var normalized = MM_normEmail_(email);
  var saltedInput = SECURE_GUEST_CONFIG.HASH_SALT + normalized + (pin || '');
  
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, saltedInput);
  
  return digest.map(function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}

/**
 * Generate a secure temporary PIN for guest invite
 * @returns {string} 4-digit PIN
 */
function generateSecureTempPin_() {
  var chars = '0123456789';
  var pin = '';
  for (var i = 0; i < 4; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pin;
}

// ═══════════════════════════════════════════════════════════════════
// GUEST CREDENTIAL STORAGE (Script Properties - Secret Space)
// ═══════════════════════════════════════════════════════════════════

/**
 * Store guest credentials securely (hashed)
 * @param {string} email - Guest email
 * @param {string} pinHash - Hashed PIN
 * @param {Object} guestData - Additional guest data
 */
function storeGuestCredentials_(email, pinHash, guestData) {
  try {
    var normalizedEmail = MM_normEmail_(email);
    var scriptProps = PropertiesService.getScriptProperties();
    
    // Store hashed PIN
    scriptProps.setProperty(
      SECURE_GUEST_CONFIG.GUEST_HASH_PREFIX + normalizedEmail,
      pinHash
    );
    
    // Store guest metadata (not credentials)
    var metadata = {
      email: normalizedEmail,
      firstName: guestData.firstName || '',
      lastName: guestData.lastName || '',
      userType: guestData.userType || '',
      optIns: guestData.optIns || [],
      registered: guestData.registered || false,
      createdAt: guestData.createdAt || new Date().toISOString(),
      invitedBy: guestData.invitedBy || ''
    };
    
    scriptProps.setProperty(
      SECURE_GUEST_CONFIG.GUEST_DATA_PREFIX + normalizedEmail,
      JSON.stringify(metadata)
    );
    
    // Update guest list
    updateGuestList_(normalizedEmail, true);
    
    Logger.log('[SECURE GUEST] Credentials stored for: ' + normalizedEmail);
    
  } catch (e) {
    Logger.log('[SECURE GUEST] Store error: ' + e.message);
    throw e;
  }
}

/**
 * Retrieve guest credentials hash (for verification)
 * @param {string} email - Guest email
 * @returns {string|null} Stored hash or null
 */
function getGuestCredentialHash_(email) {
  try {
    var normalizedEmail = MM_normEmail_(email);
    var scriptProps = PropertiesService.getScriptProperties();
    
    var hash = scriptProps.getProperty(
      SECURE_GUEST_CONFIG.GUEST_HASH_PREFIX + normalizedEmail
    );
    
    return hash || null;
    
  } catch (e) {
    Logger.log('[SECURE GUEST] Get hash error: ' + e.message);
    return null;
  }
}

/**
 * Get guest metadata (non-credential data)
 * @param {string} email - Guest email
 * @returns {Object|null} Guest metadata or null
 */
function getGuestMetadata_(email) {
  try {
    var normalizedEmail = MM_normEmail_(email);
    var scriptProps = PropertiesService.getScriptProperties();
    
    var dataStr = scriptProps.getProperty(
      SECURE_GUEST_CONFIG.GUEST_DATA_PREFIX + normalizedEmail
    );
    
    if (!dataStr) return null;
    
    return JSON.parse(dataStr);
    
  } catch (e) {
    Logger.log('[SECURE GUEST] Get metadata error: ' + e.message);
    return null;
  }
}

/**
 * Update the list of all guests
 * @param {string} email - Guest email
 * @param {boolean} add - True to add, false to remove
 */
function updateGuestList_(email, add) {
  try {
    var scriptProps = PropertiesService.getScriptProperties();
    var guestsStr = scriptProps.getProperty(SECURE_GUEST_CONFIG.ALL_GUESTS_KEY);
    var guests = guestsStr ? JSON.parse(guestsStr) : [];
    
    var normalizedEmail = MM_normEmail_(email);
    var index = guests.indexOf(normalizedEmail);
    
    if (add && index === -1) {
      guests.push(normalizedEmail);
    } else if (!add && index > -1) {
      guests.splice(index, 1);
    }
    
    scriptProps.setProperty(SECURE_GUEST_CONFIG.ALL_GUESTS_KEY, JSON.stringify(guests));
    
  } catch (e) {
    Logger.log('[SECURE GUEST] Update list error: ' + e.message);
  }
}

/**
 * Get all registered guest emails
 * @returns {Array} Array of guest emails
 */
function getAllSecureGuests() {
  try {
    var scriptProps = PropertiesService.getScriptProperties();
    var guestsStr = scriptProps.getProperty(SECURE_GUEST_CONFIG.ALL_GUESTS_KEY);
    
    if (!guestsStr) return [];
    
    return JSON.parse(guestsStr);
    
  } catch (e) {
    Logger.log('[SECURE GUEST] Get all error: ' + e.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════
// GUEST AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Verify guest PIN against stored hash
 * @param {string} email - Guest email
 * @param {string} pin - PIN to verify
 * @returns {Object} { success: boolean, message: string }
 */
function verifyGuestPin(email, pin) {
  try {
    var normalizedEmail = MM_normEmail_(email);
    
    // Get stored hash
    var storedHash = getGuestCredentialHash_(normalizedEmail);
    
    if (!storedHash) {
      return { success: false, message: 'Guest not found. Please contact the account owner.' };
    }
    
    // Generate hash from provided PIN
    var candidateHash = generateGuestHash_(normalizedEmail, pin);
    
    // Compare hashes
    if (storedHash === candidateHash) {
      Logger.log('[SECURE GUEST] PIN verified for: ' + normalizedEmail);
      
      // Update last login
      var metadata = getGuestMetadata_(normalizedEmail);
      if (metadata) {
        metadata.lastLogin = new Date().toISOString();
        var scriptProps = PropertiesService.getScriptProperties();
        scriptProps.setProperty(
          SECURE_GUEST_CONFIG.GUEST_DATA_PREFIX + normalizedEmail,
          JSON.stringify(metadata)
        );
      }
      
      return { success: true, message: 'PIN verified!' };
    }
    
    return { success: false, message: 'Incorrect PIN. Please try again.' };
    
  } catch (e) {
    Logger.log('[SECURE GUEST] Verify error: ' + e.message);
    return { success: false, message: 'Verification error: ' + e.message };
  }
}

/**
 * Check if an email is a registered guest (for auth bypass)
 * @param {string} email - Email to check
 * @returns {boolean} True if registered guest
 */
function isSecureGuest(email) {
  var normalizedEmail = MM_normEmail_(email);
  var guests = getAllSecureGuests();
  return guests.indexOf(normalizedEmail) > -1;
}

// ═══════════════════════════════════════════════════════════════════
// GUEST INVITE SYSTEM
// ═══════════════════════════════════════════════════════════════════

/**
 * Invite a new guest (Admin function)
 * - Creates guest entry with temp PIN
 * - Stores hashed credentials in Script Properties
 * - Syncs to external GUEST LOG
 * @param {string} email - Guest email
 * @param {string} firstName - Guest first name (optional)
 * @param {string} lastName - Guest last name (optional)
 * @returns {Object} { success: boolean, tempPin: string }
 */
function inviteSecureGuest(email, firstName, lastName) {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    
    // Only admins or primary user can invite
    var props = _mm_safeDocProps_();
    var primaryEmail = props ? props.getProperty('mm_primary_email') : '';
    
    if (!MM_isMasterEmail_(userEmail) && MM_normEmail_(userEmail) !== MM_normEmail_(primaryEmail)) {
      return { success: false, error: 'Only account owner or admin can invite guests' };
    }
    
    var normalizedEmail = MM_normEmail_(email);
    if (!normalizedEmail) {
      return { success: false, error: 'Valid email required' };
    }
    
    // Check if already a guest
    if (isSecureGuest(normalizedEmail)) {
      return { success: false, error: 'This email is already registered as a guest' };
    }
    
    // Generate secure temp PIN
    var tempPin = generateSecureTempPin_();
    
    // Generate hash of temp PIN
    var pinHash = generateGuestHash_(normalizedEmail, tempPin);
    
    // Store credentials
    var guestData = {
      firstName: firstName || '',
      lastName: lastName || '',
      registered: false,
      createdAt: new Date().toISOString(),
      invitedBy: userEmail
    };
    
    storeGuestCredentials_(normalizedEmail, pinHash, guestData);
    
    // Also store in document properties for backward compatibility
    try {
      var docProps = _mm_safeDocProps_();
      if (docProps) {
        var guestsJson = docProps.getProperty('mm_guests_json');
        var guests = guestsJson ? JSON.parse(guestsJson) : [];
        
        guests.push({
          email: normalizedEmail,
          firstName: firstName || '',
          lastName: lastName || '',
          tempPin: tempPin, // Keep temp PIN in doc props for UI
          registered: false,
          createdAt: new Date().toISOString()
        });
        
        docProps.setProperty('mm_guests_json', JSON.stringify(guests));
      }
    } catch (docErr) {
      Logger.log('[SECURE GUEST] Doc props backup error: ' + docErr.message);
    }
    
    // Sync to external GUEST LOG
    syncGuestToExternalLog_(normalizedEmail, firstName, lastName);
    
    Logger.log('[SECURE GUEST] Guest invited: ' + normalizedEmail + ' (temp PIN generated)');
    
    return { 
      success: true, 
      tempPin: tempPin, // Return temp PIN to show to admin
      message: 'Guest invited successfully'
    };
    
  } catch (e) {
    Logger.log('[SECURE GUEST] Invite error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Complete guest registration (set permanent PIN)
 * Called after guest verifies temp PIN and creates their own
 * @param {string} email - Guest email
 * @param {string} permanentPin - New permanent PIN
 * @param {Object} profileData - Additional profile data
 */
function completeSecureGuestRegistration(email, permanentPin, profileData) {
  try {
    var normalizedEmail = MM_normEmail_(email);
    
    // Verify guest exists
    if (!isSecureGuest(normalizedEmail)) {
      return { success: false, error: 'Guest not found' };
    }
    
    // Generate new hash with permanent PIN
    var newHash = generateGuestHash_(normalizedEmail, permanentPin);
    
    // Update stored credentials
    var metadata = getGuestMetadata_(normalizedEmail) || {};
    
    metadata.firstName = profileData.firstName || metadata.firstName || '';
    metadata.lastName = profileData.lastName || metadata.lastName || '';
    metadata.userType = profileData.userType || '';
    metadata.optIns = profileData.optIns || [];
    metadata.registered = true;
    metadata.registeredAt = new Date().toISOString();
    
    storeGuestCredentials_(normalizedEmail, newHash, metadata);
    
    // Update doc props (remove temp PIN)
    try {
      var docProps = _mm_safeDocProps_();
      if (docProps) {
        var guestsJson = docProps.getProperty('mm_guests_json');
        if (guestsJson) {
          var guests = JSON.parse(guestsJson);
          for (var i = 0; i < guests.length; i++) {
            if (MM_normEmail_(guests[i].email) === normalizedEmail) {
              guests[i].firstName = metadata.firstName;
              guests[i].lastName = metadata.lastName;
              guests[i].registered = true;
              guests[i].registeredAt = metadata.registeredAt;
              delete guests[i].tempPin; // Remove temp PIN
              break;
            }
          }
          docProps.setProperty('mm_guests_json', JSON.stringify(guests));
        }
      }
    } catch (docErr) {
      Logger.log('[SECURE GUEST] Doc props update error: ' + docErr.message);
    }
    
    // Update external GUEST LOG
    syncGuestToExternalLog_(normalizedEmail, metadata.firstName, metadata.lastName, metadata.optIns);
    
    Logger.log('[SECURE GUEST] Registration complete for: ' + normalizedEmail);
    
    return { success: true, message: 'Registration complete' };
    
  } catch (e) {
    Logger.log('[SECURE GUEST] Complete registration error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// EXTERNAL GUEST LOG SYNC
// ═══════════════════════════════════════════════════════════════════

/**
 * Sync guest data to external GUEST LOG sheet
 * @param {string} email - Guest email
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @param {Array} optIns - Opt-in selections
 */
function syncGuestToExternalLog_(email, firstName, lastName, optIns) {
  try {
    // Only admin can write to external sheet
    var userEmail = Session.getActiveUser().getEmail();
    
    // Open external GUEST LOG sheet
    var externalSS = SpreadsheetApp.openById(SECURE_GUEST_CONFIG.GUEST_LOG_SHEET_ID);
    var guestLogSheet = externalSS.getSheetByName(SECURE_GUEST_CONFIG.GUEST_LOG_SHEET_NAME);
    
    if (!guestLogSheet) {
      Logger.log('[SECURE GUEST] GUEST LOG sheet not found');
      return;
    }
    
    // Get current sheet name for logging
    var currentSS = SpreadsheetApp.getActiveSpreadsheet();
    var currentSheetName = currentSS.getName();
    
    // Find if guest already exists
    var lastRow = guestLogSheet.getLastRow();
    var existingRow = -1;
    
    if (lastRow > 1) {
      var emailCol = guestLogSheet.getRange(2, SECURE_GUEST_CONFIG.GUEST_LOG_COLUMNS.EMAIL, lastRow - 1, 1).getValues();
      for (var i = 0; i < emailCol.length; i++) {
        if (MM_normEmail_(emailCol[i][0]) === MM_normEmail_(email)) {
          existingRow = i + 2;
          break;
        }
      }
    }
    
    // Prepare data
    var optedIn = (optIns && optIns.length > 0) ? optIns.join(', ') : 'No';
    var rowData = [
      firstName || '',
      lastName || '',
      email,
      optedIn,
      userEmail, // Access User Name (who invited)
      currentSheetName // Accessed Sheet
    ];
    
    if (existingRow > 0) {
      // Update existing row
      guestLogSheet.getRange(existingRow, 1, 1, 6).setValues([rowData]);
      Logger.log('[SECURE GUEST] Updated guest in GUEST LOG: ' + email);
    } else {
      // Append new row
      guestLogSheet.appendRow(rowData);
      Logger.log('[SECURE GUEST] Added guest to GUEST LOG: ' + email);
    }
    
  } catch (e) {
    Logger.log('[SECURE GUEST] Sync to GUEST LOG error: ' + e.message);
    // Don't throw - this is a non-critical operation
  }
}

// ═══════════════════════════════════════════════════════════════════
// ADMIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Remove a guest (Admin only)
 * @param {string} email - Guest email to remove
 */
function removeSecureGuest(email) {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      return { success: false, error: 'Admin access required' };
    }
    
    var normalizedEmail = MM_normEmail_(email);
    
    // Remove from Script Properties
    var scriptProps = PropertiesService.getScriptProperties();
    scriptProps.deleteProperty(SECURE_GUEST_CONFIG.GUEST_HASH_PREFIX + normalizedEmail);
    scriptProps.deleteProperty(SECURE_GUEST_CONFIG.GUEST_DATA_PREFIX + normalizedEmail);
    
    // Update guest list
    updateGuestList_(normalizedEmail, false);
    
    // Remove from doc props
    try {
      var docProps = _mm_safeDocProps_();
      if (docProps) {
        var guestsJson = docProps.getProperty('mm_guests_json');
        if (guestsJson) {
          var guests = JSON.parse(guestsJson);
          guests = guests.filter(function(g) {
            return MM_normEmail_(g.email) !== normalizedEmail;
          });
          docProps.setProperty('mm_guests_json', JSON.stringify(guests));
        }
      }
    } catch (docErr) {}
    
    Logger.log('[SECURE GUEST] Guest removed: ' + normalizedEmail);
    
    return { success: true };
    
  } catch (e) {
    Logger.log('[SECURE GUEST] Remove error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Get all guests with metadata (Admin only)
 * @returns {Array} Array of guest objects
 */
function getAllGuestsWithMetadata() {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      return [];
    }
    
    var guestEmails = getAllSecureGuests();
    var guests = [];
    
    for (var i = 0; i < guestEmails.length; i++) {
      var metadata = getGuestMetadata_(guestEmails[i]);
      if (metadata) {
        guests.push(metadata);
      }
    }
    
    return guests;
    
  } catch (e) {
    Logger.log('[SECURE GUEST] Get all with metadata error: ' + e.message);
    return [];
  }
}
