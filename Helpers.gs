/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * HELPERS.GS - Utility Functions & Safe Wrappers
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════
// PERFORMANCE CACHES (reduces API calls)
// ═══════════════════════════════════════════════════════════════════

var _SS_CACHE = null;
var _SHEET_CACHE = {};
var _PROPS_CACHE = null;
var _PROPS_ALL_CACHE = null;

/** Get cached spreadsheet reference */
function _getSS() {
  if (!_SS_CACHE) _SS_CACHE = SpreadsheetApp.getActiveSpreadsheet();
  return _SS_CACHE;
}

/** Get cached sheet by name */
function _getSheet(name) {
  if (!_SHEET_CACHE[name]) {
    _SHEET_CACHE[name] = _getSS().getSheetByName(name);
  }
  return _SHEET_CACHE[name];
}

/** Clear all caches (call when switching spreadsheets) */
function _clearCaches() {
  _SS_CACHE = null;
  _SHEET_CACHE = {};
  _PROPS_CACHE = null;
  _PROPS_ALL_CACHE = null;
}

/** Get all properties at once (batch read) */
function _getAllProps() {
  if (!_PROPS_ALL_CACHE) {
    var props = MM_getProps_();
    if (props) {
      try {
        _PROPS_ALL_CACHE = props.getProperties();
      } catch (e) {
        _PROPS_ALL_CACHE = {};
      }
    } else {
      _PROPS_ALL_CACHE = {};
    }
  }
  return _PROPS_ALL_CACHE;
}

/** Get single property from cache */
function _getProp(key) {
  var all = _getAllProps();
  return all[key] || null;
}

// ═══════════════════════════════════════════════════════════════════
// SAFE STORAGE WRAPPERS
// ═══════════════════════════════════════════════════════════════════

var _mm_docPropsWrapperCache = null;
var _mm_docPropsStoreMode = null;

function _mm_safeCache_() {
  try {
    return CacheService.getScriptCache();
  } catch (e) {
    return { get: function() { return null; }, put: function() {}, remove: function() {} };
  }
}

/**
 * Get document-specific properties using Script Properties with doc ID prefix
 * This avoids PERMISSION_DENIED errors for non-owner users
 * 
 * Uses Script Properties (which work for all users) but prefixes keys
 * with the document ID to keep data separate per spreadsheet
 * 
 * IMPORTANT: Wraps ALL property operations in try-catch to prevent
 * PERMISSION_DENIED errors from crashing the entire auth flow
 */
function _mm_safeDocProps_(forceRefresh) {
  if (!forceRefresh && _mm_docPropsWrapperCache) {
    return _mm_docPropsWrapperCache;
  }

  function makeWrapper_(store, prefix) {
    prefix = prefix || '';
    return {
      getProperty: function(key) {
        try {
          return store.getProperty(prefix + key);
        } catch (e) {
          Logger.log('_mm_safeDocProps_.getProperty error: ' + e.message);
          return null;
        }
      },
      setProperty: function(key, value) {
        try {
          store.setProperty(prefix + key, value);
        } catch (e) {
          Logger.log('_mm_safeDocProps_.setProperty error: ' + e.message);
        }
      },
      deleteProperty: function(key) {
        try {
          store.deleteProperty(prefix + key);
        } catch (e) {
          Logger.log('_mm_safeDocProps_.deleteProperty error: ' + e.message);
        }
      },
      getProperties: function() {
        try {
          var all = store.getProperties();
          if (!prefix) return all;
          var result = {};
          for (var k in all) {
            if (k.indexOf(prefix) === 0) {
              result[k.substring(prefix.length)] = all[k];
            }
          }
          return result;
        } catch (e) {
          Logger.log('_mm_safeDocProps_.getProperties error: ' + e.message);
          return {};
        }
      }
    };
  }

  function buildScriptPropsWrapper_(docPropsData) {
    var scriptProps = null;
    try {
      scriptProps = PropertiesService.getScriptProperties();
    } catch (e) {
      Logger.log('_mm_safeDocProps_ - ScriptProperties error: ' + e.message);
    }

    if (!scriptProps) return null;

    var docId = '';
    try {
      docId = SpreadsheetApp.getActiveSpreadsheet().getId();
    } catch (e) {
      Logger.log('_mm_safeDocProps_ - getActiveSpreadsheet error: ' + e.message);
      try {
        docId = SpreadsheetApp.getActive().getId();
      } catch (e2) {
        Logger.log('_mm_safeDocProps_ - getActive also failed: ' + e2.message);
      }
    }

    var prefix = docId ? 'doc_' + docId + '_' : 'doc_unknown_';
    var migrationKey = prefix + '__mm_docprops_migrated__';
    var wrapper = makeWrapper_(scriptProps, prefix);
    _mm_docPropsStoreMode = 'script';

    if (docPropsData && typeof docPropsData === 'object') {
      try {
        var alreadyMigrated = scriptProps.getProperty(migrationKey);
        if (alreadyMigrated !== 'true') {
          for (var key in docPropsData) {
            if (!Object.prototype.hasOwnProperty.call(docPropsData, key)) continue;
            if (key.indexOf('mm_') !== 0) continue;
            wrapper.setProperty(key, docPropsData[key]);
          }
          wrapper.setProperty('__mm_docprops_migrated__', 'true');
        }
      } catch (migrationError) {
        Logger.log('_mm_safeDocProps_ migration error: ' + migrationError.message);
      }
    }

    return wrapper;
  }

  _mm_docPropsWrapperCache = null;
  _mm_docPropsStoreMode = null;

  var docProps = null;
  var docPropsWritable = false;
  var docPropsData = null;

  try {
    docProps = PropertiesService.getDocumentProperties();
    if (docProps) {
      try {
        var testKey = '__mm_docprops_test__';
        docProps.setProperty(testKey, '1');
        docProps.deleteProperty(testKey);
        docPropsWritable = true;
      } catch (docErr) {
        Logger.log('_mm_safeDocProps_ DocumentProperties not writable, falling back to ScriptProperties: ' + docErr.message);
      }
    }
  } catch (e) {
    Logger.log('_mm_safeDocProps_ - DocumentProperties error: ' + e.message);
  }

  if (docProps && !docPropsWritable) {
    try {
      docPropsData = docProps.getProperties();
    } catch (copyErr) {
      Logger.log('_mm_safeDocProps_ could not read DocumentProperties for migration: ' + copyErr.message);
    }
  }

  if (docProps && docPropsWritable) {
    _mm_docPropsWrapperCache = makeWrapper_(docProps, '');
    _mm_docPropsStoreMode = 'document';
    return _mm_docPropsWrapperCache;
  }

  var scriptWrapper = buildScriptPropsWrapper_(docPropsData);
  if (scriptWrapper) {
    _mm_docPropsWrapperCache = scriptWrapper;
    return _mm_docPropsWrapperCache;
  }

  Logger.log('_mm_safeDocProps_ returning dummy wrapper (no property store available)');
  _mm_docPropsWrapperCache = {
    getProperty: function() { return null; },
    setProperty: function() {},
    deleteProperty: function() {},
    getProperties: function() { return {}; }
  };
  _mm_docPropsStoreMode = 'none';
  return _mm_docPropsWrapperCache;
}

/**
 * Alias for MM_getProps_ (used in Welcome.gs)
 * This ensures all files use the same safe property access
 */
function MM_getProps_() {
  return _mm_safeDocProps_();
}

function _mm_safeUserProps_() {
  try {
    return PropertiesService.getUserProperties();
  } catch (e) {
    return {
      getProperty: function() { return null; },
      setProperty: function() {},
      deleteProperty: function() {},
      getProperties: function() { return {}; }
    };
  }
}

function _mm_userPropKey_(email, suffix) {
  var normalizedEmail = _mm_normEmail_(email || '');
  var docId = '';
  try {
    docId = SpreadsheetApp.getActiveSpreadsheet().getId();
  } catch (e) {
    try {
      docId = SpreadsheetApp.getActive().getId();
    } catch (e2) {
      docId = 'doc_unknown';
    }
  }
  return [docId || 'doc_unknown', normalizedEmail || 'anonymous', suffix].join('|');
}

function _mm_safeScriptProps_() {
  try {
    return PropertiesService.getScriptProperties();
  } catch (e) {
    return { getProperty: function() { return null; }, setProperty: function() {}, deleteProperty: function() {}, getProperties: function() { return {}; } };
  }
}

function _mm_safeLock_() {
  try {
    return LockService.getDocumentLock();
  } catch (e) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// OPTIMIZED GLOBALS (MMNAV_OPT)
// ═══════════════════════════════════════════════════════════════════

var MMNAV_OPT = (function() {
  return {
    CACHE_TTL_10M: 600,
    CACHE_TTL_6H: 21600,
    _ss: null,
    _sheetMap: {},
    cache: _mm_safeCache_(),
    docProps: _mm_safeDocProps_(),
    scriptProps: _mm_safeScriptProps_(),
    userProps: _mm_safeUserProps_(),
    docLock: _mm_safeLock_(),
    
    nowMs: function() { return Date.now(); },
    
    getSS: function() {
      if (!this._ss) this._ss = SpreadsheetApp.getActiveSpreadsheet();
      return this._ss;
    },
    
    sheet: function(name) {
      if (!this._sheetMap[name]) this._sheetMap[name] = this.getSS().getSheetByName(name);
      return this._sheetMap[name];
    },
    
    getJSON: function(key) {
      try {
        var raw = this.cache.get(key);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    },
    
    putJSON: function(key, obj, ttlSec) {
      try {
        this.cache.put(key, JSON.stringify(obj), ttlSec);
      } catch (e) {}
    }
  };
})();

// ═══════════════════════════════════════════════════════════════════
// STRING & DATA HELPERS
// ═══════════════════════════════════════════════════════════════════

function _mm_toStr_(v) {
  return (v === null || v === undefined) ? '' : String(v);
}

function _mm_normDesc_(s) {
  if (!s) return '';
  return String(s).trim().toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

function _mm_normEmail_(e) {
  return (e || '').toLowerCase().trim();
}

function _mm_parseMoney_(rawValue, displayValue) {
  if (typeof rawValue === 'number' && !isNaN(rawValue)) return rawValue;
  var s = String(displayValue || rawValue || '').replace(/[$,\s]/g, '');
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// ═══════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════

function _mm_isValidDate_(dateVal) {
  if (!dateVal) return false;
  if (dateVal instanceof Date) return !isNaN(dateVal.getTime());
  var s = String(dateVal).trim();
  if (!s || s === '#N/A' || s === '#REF!' || s === '#ERROR!' || s.startsWith('#')) return false;
  var d = new Date(s);
  return !isNaN(d.getTime());
}

function _mm_isValidDescription_(desc) {
  if (!desc) return false;
  var s = String(desc).trim();
  if (!s || s.length < 2) return false;
  if (s === '#N/A' || s === '#REF!' || s === '#ERROR!' || s.startsWith('#')) return false;
  return true;
}

/**
 * Get a valid category from multiple possible sources
 */
function _mm_getValidCategory_(subCategory, bizCategory, mainCategory) {
  var invalidValues = ['#N/A', '#REF!', '#ERROR!', '#VALUE!', '#NAME?', '#DIV/0!', '#NULL!', 'undefined', 'null', ''];
  
  function isValid(val) {
    if (!val) return false;
    var str = String(val).trim();
    if (str === '') return false;
    if (invalidValues.indexOf(str) !== -1) return false;
    if (str.charAt(0) === '#') return false;
    return true;
  }
  
  if (isValid(subCategory)) return String(subCategory).trim();
  if (isValid(bizCategory)) return String(bizCategory).trim();
  if (isValid(mainCategory)) return String(mainCategory).trim();
  return 'Uncategorized';
}

function _mm_setValueBypassingValidation_(range, value) {
  try {
    var validation = range.getDataValidation();
    range.clearDataValidations();
    range.setValue(value);
    if (validation) range.setDataValidation(validation);
  } catch (e) {
    try { range.setValue(value); } catch (e2) {}
  }
}

// ═══════════════════════════════════════════════════════════════════
// BANK SYNC HELPERS
// ═══════════════════════════════════════════════════════════════════

function getLastSyncTimestamp(accountName) {
  try {
    var props = PropertiesService.getScriptProperties();
    var key = 'mm_bank_last_sync_' + accountName;
    var lastSync = props.getProperty(key);
    
    if (lastSync) {
      return parseInt(lastSync, 10);
    }
    return Math.floor(LICENSE_CONFIG.getLicenseStartDate().getTime() / 1000);
  } catch (e) {
    return Math.floor(LICENSE_CONFIG.getLicenseStartDate().getTime() / 1000);
  }
}

function setLastSyncTimestamp(accountName, timestamp) {
  try {
    var props = PropertiesService.getScriptProperties();
    var key = 'mm_bank_last_sync_' + accountName;
    props.setProperty(key, String(timestamp));
  } catch (e) {
    Logger.log('Failed to save last sync timestamp: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// AUTH HELPERS
// ═══════════════════════════════════════════════════════════════════

function _mm_isMasterEmail_(email) {
  var masters = MM_CFG.MASTER_EMAILS.map(_mm_normEmail_);
  var normalized = _mm_normEmail_(email);
  return masters.indexOf(normalized) !== -1;
}

function _mm_pinHashKey_(email) {
  return 'mm_pin_hash_' + _mm_normEmail_(email);
}

function _mm_isAuthorizedSessionEmail_() {
  try {
    var email = Session.getActiveUser().getEmail();
    if (!email) return false;
    var normalized = _mm_normEmail_(email);
    
    if (_mm_isMasterEmail_(normalized)) return true;
    
    var props = _mm_safeDocProps_();
    var primary = _mm_normEmail_(props.getProperty('mm_primary_email') || '');
    if (normalized === primary) return true;
    
    try {
      var guestsJson = props.getProperty('mm_guests_json');
      if (guestsJson) {
        var guests = JSON.parse(guestsJson);
        if (Array.isArray(guests)) {
          for (var i = 0; i < guests.length; i++) {
            if (_mm_normEmail_(guests[i].email) === normalized) return true;
          }
        }
      }
    } catch (e) {}
    
    return false;
  } catch (e) {
    return false;
  }
}

function _mm_isSessionLoggedIn_() {
  try {
    var email = Session.getActiveUser().getEmail();
    if (!email) return false;
    
    // Master emails always have access
    if (_mm_isMasterEmail_(email)) return true;
    
    // Check if user is authorized (primary or guest)
    if (!_mm_isAuthorizedSessionEmail_()) return false;
    
    // Check if user has a PIN hash (indicates they're registered)
    var props = _mm_safeDocProps_();
    var pinHash = props.getProperty(_mm_pinHashKey_(email));
    
    // If user has PIN hash, they're logged in (NO MFA REQUIRED)
    return !!pinHash;
  } catch (e) {
    return false;
  }
}

function _mm_requireLoginOrOpenGate_(contextLabel) {
  try {
    if (_mm_isSessionLoggedIn_()) return true;
    
    if (typeof MM_openSecurityThenDashboard === 'function') {
      MM_openSecurityThenDashboard();
    }
    return false;
  } catch (e) {
    Logger.log('_mm_requireLoginOrOpenGate_ error: ' + e.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// ADMIN-SET CLIENT EMAIL CHECK
// ═══════════════════════════════════════════════════════════════════

/**
 * Check if user email matches admin-set client email
 * Client name may differ from display name, but email MUST match
 * @param {string} userEmail - User's email to check
 * @returns {boolean} True if email matches client email
 */
function _mm_isAdminSetClientEmail_(userEmail) {
  try {
    var props = _mm_safeDocProps_();
    if (!props) return false;
    
    var normalized = _mm_normEmail_(userEmail);
    
    // Check against admin-set client email
    var clientEmail = _mm_normEmail_(props.getProperty('mm_client_email') || '');
    if (clientEmail && normalized === clientEmail) {
      return true;
    }
    
    // Also check primary email (backward compatibility)
    var primaryEmail = _mm_normEmail_(props.getProperty('mm_primary_email') || '');
    if (primaryEmail && normalized === primaryEmail) {
      return true;
    }
    
    return false;
  } catch (e) {
    Logger.log('_mm_isAdminSetClientEmail_ error: ' + e.message);
    return false;
  }
}

/**
 * Check if user email is in the allowed emails list
 * (Admin can add emails that bypass registration warnings)
 * @param {string} userEmail - User's email to check
 * @returns {boolean} True if email is allowed
 */
function _mm_isAllowedEmail_(userEmail) {
  try {
    var props = _mm_safeDocProps_();
    if (!props) return false;
    
    var normalized = _mm_normEmail_(userEmail);
    
    // Check allowed emails list
    var allowedEmailsJson = props.getProperty('mm_allowed_emails');
    if (allowedEmailsJson) {
      var allowedEmails = JSON.parse(allowedEmailsJson);
      if (Array.isArray(allowedEmails)) {
        for (var i = 0; i < allowedEmails.length; i++) {
          if (_mm_normEmail_(allowedEmails[i]) === normalized) {
            return true;
          }
        }
      }
    }
    
    return false;
  } catch (e) {
    Logger.log('_mm_isAllowedEmail_ error: ' + e.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// GLOBAL ERROR WRAPPER (safeExecute)
// ═══════════════════════════════════════════════════════════════════

/**
 * Execute a function with error handling and silent reporting
 * Use this to wrap any function that might fail
 * 
 * @param {Function} fn - Function to execute
 * @param {string} context - Context label for error reporting
 * @param {Object} options - { showUser: boolean, notifyAdmin: boolean, defaultReturn: any }
 * @returns {any} Function result or defaultReturn on error
 */
function safeExecute(fn, context, options) {
  options = options || {};
  var showUser = options.showUser === true;
  var notifyAdmin = options.notifyAdmin === true;
  var defaultReturn = options.defaultReturn !== undefined ? options.defaultReturn : null;
  
  try {
    return fn();
  } catch (e) {
    // Log the error
    Logger.log('[SAFE EXECUTE] Error in ' + context + ': ' + e.message);
    
    // Silent email to support if error reporting available
    if (typeof sendErrorEmailToSupport === 'function') {
      try {
        sendErrorEmailToSupport(e, context);
      } catch (emailErr) {
        Logger.log('[SAFE EXECUTE] Could not send error email: ' + emailErr.message);
      }
    }
    
    // Show user-friendly message if requested
    if (showUser) {
      try {
        SpreadsheetApp.getUi().alert(
          'Error',
          'An error occurred. Please try again or contact support.',
          SpreadsheetApp.getUi().ButtonSet.OK
        );
      } catch (uiErr) {}
    }
    
    // Notify admin via handleError if available
    if (notifyAdmin && typeof handleError === 'function') {
      handleError(e, context, { showUser: false, notifyAdmin: true });
    }
    
    return defaultReturn;
  }
}

/**
 * Create a wrapped version of a function with error handling
 * @param {Function} fn - Function to wrap
 * @param {string} context - Context label
 * @returns {Function} Wrapped function
 */
function createSafeFunction(fn, context) {
  return function() {
    var args = arguments;
    return safeExecute(function() {
      return fn.apply(null, Array.prototype.slice.call(args));
    }, context);
  };
}

/**
 * Send error email to support (silent - no UI)
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 */
function sendErrorEmailToSupport(error, context) {
  try {
    var userEmail = '';
    try {
      userEmail = Session.getActiveUser().getEmail();
    } catch (e) {
      userEmail = 'unknown';
    }
    
    var timestamp = new Date().toISOString();
    var errorMessage = error.message || String(error);
    var stack = error.stack || 'No stack trace';
    
    var subject = 'Money Mastery Error: ' + context;
    var body = [
      'ERROR REPORT',
      '════════════════════════════════════════',
      '',
      'Context: ' + context,
      'User: ' + userEmail,
      'Time: ' + timestamp,
      '',
      'Error Message:',
      errorMessage,
      '',
      'Stack Trace:',
      stack,
      '',
      '════════════════════════════════════════',
      '© 2026 Donna Roggio LLC'
    ].join('\n');
    
    // Try Resend API first
    if (typeof RESEND_CONFIG !== 'undefined' && RESEND_CONFIG.API_KEY) {
      UrlFetchApp.fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + RESEND_CONFIG.API_KEY,
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify({
          from: 'Money Mastery <noreply@risingandthriving.com>',
          to: ['support@risingandthriving.com'],
          subject: subject,
          text: body
        }),
        muteHttpExceptions: true
      });
    } else {
      // Fallback to MailApp
      MailApp.sendEmail('support@risingandthriving.com', subject, body);
    }
    
    Logger.log('[ERROR EMAIL] Sent to support: ' + context);
    
  } catch (e) {
    Logger.log('[ERROR EMAIL] Failed to send: ' + e.message);
  }
}
