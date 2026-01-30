/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * SESSION MANAGEMENT - Secure Session Handling with Expiry
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * PURPOSE: Manage user sessions with automatic expiry
 * SECURITY: Ensures authentication is required on every sheet open/refresh
 * 
 * KEY FEATURES:
 * - Configurable session timeout (default: 30 minutes)
 * - Automatic session extension on activity
 * - Session validation on every access
 * - Independent sessions per browser tab
 * - Secure session clearing on logout
 */

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Get session timeout duration in milliseconds
 * Default: 30 minutes (1,800,000 ms)
 * Can be configured via Script Properties
 * 
 * Admin can set via Script Editor:
 * PropertiesService.getScriptProperties().setProperty('MM_SESSION_TIMEOUT', '1800000');
 * 
 * Recommended values:
 * - 5 minutes (testing): 300000
 * - 15 minutes (high security): 900000
 * - 30 minutes (default): 1800000
 * - 1 hour (convenience): 3600000
 * - 8 hours (max): 28800000
 */
function MM_getSessionTimeout() {
  try {
    var scriptProps = PropertiesService.getScriptProperties();
    var timeoutStr = scriptProps.getProperty('MM_SESSION_TIMEOUT');
    
    if (timeoutStr) {
      var timeout = parseInt(timeoutStr);
      if (!isNaN(timeout) && timeout > 0) {
        // Enforce maximum of 8 hours for security
        var maxTimeout = 8 * 60 * 60 * 1000; // 8 hours
        return Math.min(timeout, maxTimeout);
      }
    }
  } catch (error) {
    Logger.log('Error reading session timeout config: ' + error.message);
  }
  
  // Default: 30 minutes
  return 30 * 60 * 1000;
}

// ═══════════════════════════════════════════════════════════════════
// SESSION VALIDATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Check if user has a valid active session
 * Returns true only if session exists and has not expired
 * 
 * @param {string} email - User email address (normalized)
 * @returns {boolean} True if session is valid and active
 */
function MM_isSessionValid(email) {
  try {
    if (!email) {
      Logger.log('MM_isSessionValid: No email provided');
      return false;
    }
    
    var normalizedEmail = MM_normEmail_(email);
    var userProps = PropertiesService.getUserProperties();
    var sessionKey = 'MM_SESSION_' + normalizedEmail;
    
    var sessionExpiryStr = userProps.getProperty(sessionKey);
    
    if (!sessionExpiryStr) {
      Logger.log('MM_isSessionValid: No session found for ' + normalizedEmail);
      return false;
    }
    
    var sessionExpiry = parseInt(sessionExpiryStr);
    var currentTime = new Date().getTime();
    
    if (isNaN(sessionExpiry)) {
      Logger.log('MM_isSessionValid: Invalid session expiry format');
      MM_clearSession(email); // Clear corrupted session
      return false;
    }
    
    if (sessionExpiry < currentTime) {
      Logger.log('MM_isSessionValid: Session expired at ' + new Date(sessionExpiry).toISOString());
      MM_clearSession(email); // Clear expired session
      return false;
    }
    
    // Session is valid
    var timeRemaining = Math.round((sessionExpiry - currentTime) / 1000 / 60);
    Logger.log('✅ Valid session found for ' + normalizedEmail + ' (' + timeRemaining + ' minutes remaining)');
    
    return true;
    
  } catch (error) {
    Logger.log('Error validating session: ' + error.message);
    return false; // Fail closed - deny access on error
  }
}

// ═══════════════════════════════════════════════════════════════════
// SESSION CREATION & EXTENSION
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a new session for authenticated user
 * Sets expiry time based on configured timeout
 * 
 * @param {string} email - User email address (normalized)
 * @returns {boolean} True if session created successfully
 */
function MM_createSession(email) {
  try {
    if (!email) {
      Logger.log('MM_createSession: No email provided');
      return false;
    }
    
    var normalizedEmail = MM_normEmail_(email);
    var userProps = PropertiesService.getUserProperties();
    var sessionKey = 'MM_SESSION_' + normalizedEmail;
    
    var timeout = MM_getSessionTimeout();
    var expiryTime = new Date().getTime() + timeout;
    
    userProps.setProperty(sessionKey, expiryTime.toString());
    
    var expiryDate = new Date(expiryTime);
    var timeoutMinutes = Math.round(timeout / 1000 / 60);
    
    Logger.log('🔐 Session created for ' + normalizedEmail);
    Logger.log('   Timeout: ' + timeoutMinutes + ' minutes');
    Logger.log('   Expires: ' + expiryDate.toISOString());
    
    return true;
    
  } catch (error) {
    Logger.log('Error creating session: ' + error.message);
    return false;
  }
}

/**
 * Extend existing session (reset expiry time)
 * Call this on user activity to keep session alive
 * 
 * @param {string} email - User email address (normalized)
 * @returns {boolean} True if session extended successfully
 */
function MM_extendSession(email) {
  try {
    if (!email) {
      Logger.log('MM_extendSession: No email provided');
      return false;
    }
    
    var normalizedEmail = MM_normEmail_(email);
    
    // Check if session exists
    if (!MM_isSessionValid(email)) {
      Logger.log('MM_extendSession: No valid session to extend');
      return false;
    }
    
    // Create new session (which extends it)
    return MM_createSession(email);
    
  } catch (error) {
    Logger.log('Error extending session: ' + error.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// SESSION CLEARING
// ═══════════════════════════════════════════════════════════════════

/**
 * Clear session for specific user (logout)
 * Removes session expiry, requiring re-authentication
 * 
 * @param {string} email - User email address (normalized)
 */
function MM_clearSession(email) {
  try {
    if (!email) {
      Logger.log('MM_clearSession: No email provided');
      return;
    }
    
    var normalizedEmail = MM_normEmail_(email);
    var userProps = PropertiesService.getUserProperties();
    var sessionKey = 'MM_SESSION_' + normalizedEmail;
    
    userProps.deleteProperty(sessionKey);
    
    Logger.log('🚪 Session cleared for ' + normalizedEmail);
    
  } catch (error) {
    Logger.log('Error clearing session: ' + error.message);
  }
}

/**
 * Clear all sessions (admin function)
 * Forces all users to re-authenticate
 * Use for security incidents or system maintenance
 */
function MM_clearAllSessions() {
  try {
    var userProps = PropertiesService.getUserProperties();
    var allProps = userProps.getProperties();
    var clearedCount = 0;
    
    // Find and delete all session keys
    for (var key in allProps) {
      if (key.indexOf('MM_SESSION_') === 0) {
        userProps.deleteProperty(key);
        clearedCount++;
      }
    }
    
    Logger.log('🚨 Cleared ' + clearedCount + ' session(s)');
    
    return clearedCount;
    
  } catch (error) {
    Logger.log('Error clearing all sessions: ' + error.message);
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════════
// ADMIN UTILITIES
// ═══════════════════════════════════════════════════════════════════

/**
 * Get session information for debugging
 * Returns session status for current user
 * 
 * @returns {Object} Session information
 */
function MM_getSessionInfo() {
  try {
    var email = Session.getActiveUser().getEmail();
    var normalizedEmail = MM_normEmail_(email);
    var userProps = PropertiesService.getUserProperties();
    var sessionKey = 'MM_SESSION_' + normalizedEmail;
    
    var sessionExpiryStr = userProps.getProperty(sessionKey);
    var currentTime = new Date().getTime();
    
    if (!sessionExpiryStr) {
      return {
        email: normalizedEmail,
        hasSession: false,
        isValid: false,
        message: 'No session exists'
      };
    }
    
    var sessionExpiry = parseInt(sessionExpiryStr);
    var timeRemaining = sessionExpiry - currentTime;
    var isValid = timeRemaining > 0;
    
    return {
      email: normalizedEmail,
      hasSession: true,
      isValid: isValid,
      expiryTime: new Date(sessionExpiry).toISOString(),
      timeRemainingMinutes: Math.round(timeRemaining / 1000 / 60),
      timeRemainingSeconds: Math.round(timeRemaining / 1000),
      sessionTimeout: MM_getSessionTimeout() / 1000 / 60 + ' minutes'
    };
    
  } catch (error) {
    return {
      error: true,
      message: error.message
    };
  }
}

/**
 * Display session information to user
 * Menu item: Admin Controls → Session Info
 */
function MM_showSessionInfo() {
  try {
    var info = MM_getSessionInfo();
    
    var message;
    if (info.error) {
      message = 'Error: ' + info.message;
    } else if (!info.hasSession) {
      message = 'No active session\n\nYou will need to authenticate on next refresh.';
    } else if (!info.isValid) {
      message = 'Session Expired\n\nYou will need to re-authenticate on next refresh.';
    } else {
      message = 
        'Active Session\n\n' +
        'User: ' + info.email + '\n' +
        'Time Remaining: ' + info.timeRemainingMinutes + ' minutes\n' +
        'Expires: ' + info.expiryTime + '\n' +
        'Session Timeout: ' + info.sessionTimeout;
    }
    
    SpreadsheetApp.getUi().alert('Session Information', message, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error retrieving session info: ' + error.message);
  }
}

/**
 * Configure session timeout (admin function)
 * Menu item: Admin Controls → Configure Session Timeout
 */
function MM_configureSessionTimeout() {
  try {
    var ui = SpreadsheetApp.getUi();
    
    var currentTimeout = MM_getSessionTimeout() / 1000 / 60;
    
    var response = ui.prompt(
      'Configure Session Timeout',
      'Enter session timeout in minutes (5-480):\n\n' +
      'Current: ' + currentTimeout + ' minutes\n\n' +
      'Recommended values:\n' +
      '• 15 minutes (high security)\n' +
      '• 30 minutes (default)\n' +
      '• 60 minutes (convenience)\n' +
      '• 240 minutes (4 hours, low security)',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    
    var input = response.getResponseText().trim();
    var minutes = parseInt(input);
    
    if (isNaN(minutes) || minutes < 5 || minutes > 480) {
      ui.alert('Invalid Input', 'Please enter a number between 5 and 480 minutes.', ui.ButtonSet.OK);
      return;
    }
    
    var timeoutMs = minutes * 60 * 1000;
    PropertiesService.getScriptProperties().setProperty('MM_SESSION_TIMEOUT', timeoutMs.toString());
    
    ui.alert(
      'Session Timeout Updated',
      'New timeout: ' + minutes + ' minutes\n\n' +
      'This will apply to all new sessions.\n' +
      'Existing sessions will continue with their original timeout.',
      ui.ButtonSet.OK
    );
    
    Logger.log('Session timeout configured to ' + minutes + ' minutes');
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error configuring timeout: ' + error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// BACKWARD COMPATIBILITY
// ═══════════════════════════════════════════════════════════════════

/**
 * Legacy function names for compatibility
 * These call the new MM_ prefixed functions
 */
function extendSession() {
  var email = Session.getActiveUser().getEmail();
  return MM_extendSession(email);
}

function clearSession() {
  var email = Session.getActiveUser().getEmail();
  MM_clearSession(email);
}
