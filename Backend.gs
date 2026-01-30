/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * BACKEND.GS - DISABLED - All functions return immediately
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * ⚠️ THIS FILE IS DISABLED ⚠️
 * 
 * All backend functions now return immediately without accessing
 * any external sheets. This prevents permission errors for end users.
 * 
 * Access keys are stored locally in the sheet (hidden cell ZZ1).
 * See Admin.gs for the local storage implementation.
 * 
 * NOTE: BACKEND_COLS in this file refers to the external backend sheet
 * columns, NOT the ACCOUNT sheet columns. For ACCOUNT sheet columns,
 * see ColumnConfig.gs (MM_COLS, MM_ROWS).
 */

// ═══════════════════════════════════════════════════════════════════
// ALL FUNCTIONS DISABLED - Return immediately to prevent permission errors
// ═══════════════════════════════════════════════════════════════════

/**
 * DISABLED - Returns null immediately
 */
function _mm_getBackendSheetId_() {
  return null; // DISABLED
}

/**
 * DISABLED - Returns null immediately (no external access)
 */
function _mm_getBackendSheet_() {
  // DISABLED - No external sheet access
  Logger.log('[INFO] Backend.gs DISABLED - using local storage only');
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// BACKEND SHEET COLUMN INDICES (0-based for arrays, 1-based for ranges)
// ═══════════════════════════════════════════════════════════════════

var BACKEND_COLS = {
  FLAGGED_USER: 0,        // A - Admin fills manually
  SUBSCRIPTION: 1,        // B - Admin fills manually
  FIRST_NAME: 2,          // C - From registration
  LAST_NAME: 3,           // D - From registration
  EMAIL: 4,               // E - From registration
  ACCESS_KEY: 5,          // F - Admin generates manually (LEAVE EMPTY)
  DRIVE_LINK: 6,          // G - Admin fills manually
  PERSONAL_SHEET: 7,      // H - Auto-populate when personal sheet registered
  BUSINESS_SHEET: 8,      // I - Auto-populate when business sheet registered
  SHEET_DELIVERED: 9,     // J - Admin fills manually
  SHEET_REGISTERED: 10,   // K - Set to "YES" on registration
  GUEST1_FIRST: 11,       // L - Guest 1 first name
  GUEST1_LAST: 12,        // M - Guest 1 last name
  GUEST1_EMAIL: 13,       // N - Guest 1 email
  GUEST1_OPTED_IN: 14,    // O - Guest 1 opted in (default "NO")
  GUEST2_FIRST: 15,       // P - Guest 2 first name
  GUEST2_LAST: 16,        // Q - Guest 2 last name
  GUEST2_EMAIL: 17,       // R - Guest 2 email
  GUEST2_OPTED_IN: 18,    // S - Guest 2 opted in (default "NO")
  GUEST3_FIRST: 19,       // T - Guest 3 first name
  GUEST3_LAST: 20,        // U - Guest 3 last name
  GUEST3_EMAIL: 21,       // V - Guest 3 email
  GUEST3_OPTED_IN: 22     // W - Guest 3 opted in (default "NO")
};

// ═══════════════════════════════════════════════════════════════════
// USER REGISTRATION & MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

/**
 * DISABLED - Returns true immediately (no backend access)
 * Registration data is stored locally only.
 */
function populateBackendOnRegistration(firstName, lastName, email) {
  Logger.log('[INFO] populateBackendOnRegistration DISABLED - using local storage for: ' + email);
  return true; // Always succeed - local registration handles everything
}

/**
 * DISABLED - Returns true immediately
 */
function updatePersonalSheetLink(email, sheetUrl) {
  Logger.log('[INFO] updatePersonalSheetLink DISABLED');
  return true;
}

/**
 * DISABLED - Returns true immediately
 */
function updateBusinessSheetLink(email, sheetUrl) {
  Logger.log('[INFO] updateBusinessSheetLink DISABLED');
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// GUEST MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

/**
 * DISABLED - Guests stored locally only
 */
function addGuestToUser(userEmail, guestFirstName, guestLastName, guestEmail, optedIn) {
  Logger.log('[INFO] addGuestToUser DISABLED - guests stored locally');
  return {success: true, message: 'Guest stored locally'};
}

/**
 * DISABLED - Returns null (use local storage)
 */
function getUserData(email) {
  Logger.log('[INFO] getUserData DISABLED - use local storage');
  return null;
}

/**
 * DISABLED - Returns false
 */
function userExistsInBackend(email) {
  return false; // Always check local
}

// ═══════════════════════════════════════════════════════════════════
// PIN FUNCTIONS - DISABLED (Use local storage in Auth_Core.gs)
// ═══════════════════════════════════════════════════════════════════

/**
 * DISABLED - Returns false (PIN stored locally only)
 */
function savePinToBackend(email, pinHash) {
  Logger.log('[INFO] savePinToBackend DISABLED - PIN stored locally for: ' + email);
  return false; // Signal caller to use local storage
}

/**
 * DISABLED - Returns empty string (check local storage)
 */
function getPinFromBackend(email) {
  Logger.log('[INFO] getPinFromBackend DISABLED - check local storage');
  return '';
}

/**
 * DISABLED - Returns false
 */
function userHasPinInBackend(email) {
  return false; // Always check local
}

/**
 * DISABLED - Test function
 */
function TEST_BackendIntegration() {
  Logger.log('Backend.gs is DISABLED - all data stored locally');
  return true;
}
