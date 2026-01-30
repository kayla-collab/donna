/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * AUTH_CORE.GS - Core Authentication Functions
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * Extracted from Welcome.gs for modularity
 * Contains: PIN validation, user props, email normalization
 */

// ═══════════════════════════════════════════════════════════════════
// EMAIL & USER PROPERTY HELPERS
// ═══════════════════════════════════════════════════════════════════

function MM_normEmail_(e) {
  return String(e || '').trim().toLowerCase();
}

function MM_isMasterEmail_(email) {
  const masters = MM_CFG.MASTER_EMAILS.map(MM_normEmail_);
  return masters.indexOf(MM_normEmail_(email)) !== -1;
}

/**
 * Check if current user is an admin (master email)
 * Used by NavigationMenu.html to show/hide admin section
 * @returns {boolean} true if current user is admin
 */
function isCurrentUserAdmin() {
  try {
    var email = Session.getActiveUser().getEmail();
    return MM_isMasterEmail_(email);
  } catch (e) {
    Logger.log('isCurrentUserAdmin error: ' + e.message);
    return false;
  }
}

function _mm_markUserRegistered_(normalizedEmail) {
  if (!normalizedEmail) return;
  try {
    var userProps = _mm_safeUserProps_();
    if (!userProps) return;
    userProps.setProperty(_mm_userPropKey_(normalizedEmail, 'registered'), 'true');
    userProps.setProperty(normalizedEmail + '_registered', 'true');
  } catch (e) {
    Logger.log('_mm_markUserRegistered_ error: ' + e.message);
  }
}

function _mm_isUserRegistered_(normalizedEmail) {
  if (!normalizedEmail) return false;
  try {
    var userProps = _mm_safeUserProps_();
    if (!userProps) return false;
    if (userProps.getProperty(_mm_userPropKey_(normalizedEmail, 'registered')) === 'true') return true;
    if (userProps.getProperty(normalizedEmail + '_registered') === 'true') return true;
  } catch (e) {
    Logger.log('_mm_isUserRegistered_ error: ' + e.message);
  }
  return false;
}

/**
 * Store user PIN hash - Uses LOCAL storage ONLY (UserProperties + DocProps)
 * NO external backend calls - everything stored in this sheet
 * @param {string} normalizedEmail - Normalized email address
 * @param {string} pinHashString - Hashed PIN
 */
function _mm_storeUserPinHash_(normalizedEmail, pinHashString) {
  if (!normalizedEmail || !pinHashString) return;
  
  var savedLocally = false;
  
  // PRIMARY: Save to Document Properties (via safe wrapper)
  try {
    var props = MM_getProps_();
    if (props) {
      props.setProperty('mm_pin_hash_' + normalizedEmail, pinHashString);
      Logger.log('✅ PIN saved to document properties for: ' + normalizedEmail);
      savedLocally = true;
    }
  } catch (e) {
    Logger.log('[WARN] _mm_storeUserPinHash_ doc props error: ' + e.message);
  }
  
  // SECONDARY: Save to UserProperties (per-user storage)
  try {
    var userProps = _mm_safeUserProps_();
    if (userProps) {
      userProps.setProperty(_mm_userPropKey_(normalizedEmail, 'pin_hash'), pinHashString);
      userProps.setProperty(normalizedEmail + '_pin_hash', pinHashString);
      Logger.log('✅ PIN saved to user properties for: ' + normalizedEmail);
      savedLocally = true;
    }
  } catch (e2) {
    Logger.log('[WARN] _mm_storeUserPinHash_ user props error: ' + e2.message);
  }
  
  // NO BACKEND CALLS - All data stored locally
  
  if (!savedLocally) {
    Logger.log('[ERROR] Failed to save PIN to any storage for: ' + normalizedEmail);
  }
}

/**
 * Get user PIN hash - Checks local storage (UserProperties + DocProps)
 * @param {string} normalizedEmail - Normalized email address
 * @return {string} PIN hash or empty string
 */
function _mm_getUserPinHash_(normalizedEmail) {
  if (!normalizedEmail) return '';
  
  // Try UserProperties first (per-user storage)
  try {
    var userProps = _mm_safeUserProps_();
    if (userProps) {
      var hash = userProps.getProperty(_mm_userPropKey_(normalizedEmail, 'pin_hash'));
      if (hash) {
        Logger.log('PIN found in UserProperties (keyed) for: ' + normalizedEmail);
        return hash;
      }
      hash = userProps.getProperty(normalizedEmail + '_pin_hash');
      if (hash) {
        Logger.log('PIN found in UserProperties (legacy) for: ' + normalizedEmail);
        return hash;
      }
    }
  } catch (e) {
    Logger.log('[WARN] UserProperties error: ' + e.message);
  }
  
  // Try Document Properties (via safe wrapper)
  try {
    var props = MM_getProps_();
    if (props) {
      var hash = props.getProperty('mm_pin_hash_' + normalizedEmail);
      if (hash) {
        Logger.log('PIN found in DocumentProperties for: ' + normalizedEmail);
        return hash;
      }
    }
  } catch (e2) {
    Logger.log('[WARN] DocumentProperties error: ' + e2.message);
  }
  
  Logger.log('No PIN found for: ' + normalizedEmail);
  return '';
}

// ═══════════════════════════════════════════════════════════════════
// PIN VALIDATION & ACCOUNT LOCKOUT
// ═══════════════════════════════════════════════════════════════════

function MM_validatePin(pin, overrideEmail) {
  try {
    var sessionEmail = overrideEmail ? MM_normEmail_(overrideEmail) : '';
    if (!sessionEmail) {
      sessionEmail = MM_normEmail_(Session.getActiveUser().getEmail());
    }
    if (!sessionEmail) {
      throw new Error('Unable to determine user email. Please make sure you are signed in.');
    }

    var props = MM_getProps_();
    var userProps = _mm_safeUserProps_();

    var lockedKey = _mm_userPropKey_(sessionEmail, 'pin_locked');
    if (userProps && userProps.getProperty(lockedKey) === 'true') {
      return { success: false, message: 'Account locked due to multiple failed attempts. Check your email for reset instructions.' };
    }

    var storedHash = _mm_getUserPinHash_(sessionEmail);
    if (!storedHash) {
      return { success: false, message: 'No PIN is registered for this account. Please complete registration again.' };
    }

    var computed = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pin + sessionEmail);
    var candidateHash = computed.map(function(byte) {
      return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');

    if (storedHash === candidateHash) {
      if (userProps) {
        userProps.setProperty(_mm_userPropKey_(sessionEmail, 'pin_attempts'), '0');
        userProps.deleteProperty(lockedKey);
        userProps.setProperty(_mm_userPropKey_(sessionEmail, 'last_login_ts'), String(Date.now()));
      }
      _mm_markUserRegistered_(sessionEmail);

      try {
        if (props.getProperty('mm_sheet_access_configured') !== 'true') {
          MM_configureSheetAccessForUser_();
          props.setProperty('mm_sheet_access_configured', 'true');
        }
      } catch (configError) {
        Logger.log('Sheet configuration during login failed: ' + configError.message);
      }

      proceedToDashboard();
      return { success: true, message: 'Login successful' };
    }

    var remaining = 0;
    if (userProps) {
      var attemptsKey = _mm_userPropKey_(sessionEmail, 'pin_attempts');
      var attempts = parseInt(userProps.getProperty(attemptsKey) || '0', 10);
      attempts = isNaN(attempts) ? 0 : attempts;
      attempts += 1;
      userProps.setProperty(attemptsKey, String(attempts));
      remaining = Math.max(0, 3 - attempts);
      if (attempts >= 3) {
        userProps.setProperty(lockedKey, 'true');
        lockAccountAndNotify(sessionEmail);
        return { success: false, message: 'Account locked. Check your email for reset instructions.' };
      }
    }

    var attemptsMessage = remaining > 0
      ? 'Incorrect PIN. ' + remaining + ' attempt' + (remaining === 1 ? '' : 's') + ' remaining.'
      : 'Incorrect PIN.';
    return { success: false, message: attemptsMessage };
  } catch (e) {
    Logger.log('MM_validatePin error: ' + e.message);
    return { success: false, message: 'Login failed: ' + e.message };
  }
}

function validateUserPin(pin) {
  return MM_validatePin(pin);
}

/**
 * Get user PIN info including PIN length for dynamic PIN input generation
 * @returns {Object} - { email: string, pinLength: number }
 */
function getUserPinInfo() {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    var normalizedEmail = MM_normEmail_(userEmail);
    
    // Get stored PIN hash to determine length
    // We can't get the actual PIN, but we can store the length separately
    var userProps = _mm_safeUserProps_();
    var pinLength = 4; // Default
    
    if (userProps) {
      // Try to get stored PIN length
      var storedLength = userProps.getProperty(_mm_userPropKey_(normalizedEmail, 'pin_length'));
      if (storedLength) {
        pinLength = parseInt(storedLength, 10);
        if (isNaN(pinLength) || pinLength < 4 || pinLength > 6) {
          pinLength = 4;
        }
      } else {
        // Legacy: try to detect from stored PIN (if we stored it during registration)
        var legacyLength = userProps.getProperty(normalizedEmail + '_pin_length');
        if (legacyLength) {
          pinLength = parseInt(legacyLength, 10);
          if (isNaN(pinLength) || pinLength < 4 || pinLength > 6) {
            pinLength = 4;
          }
        }
      }
    }

    return {
      email: userEmail,
      pinLength: pinLength
    };

  } catch (error) {
    Logger.log('Error getting PIN info: ' + error.toString());
    return {
      email: Session.getActiveUser().getEmail() || '',
      pinLength: 4
    };
  }
}

/**
 * Store PIN length when user registers (call this from registration flow)
 */
function storePinLength_(normalizedEmail, pinLength) {
  try {
    var userProps = _mm_safeUserProps_();
    if (userProps && normalizedEmail) {
      userProps.setProperty(_mm_userPropKey_(normalizedEmail, 'pin_length'), String(pinLength));
      userProps.setProperty(normalizedEmail + '_pin_length', String(pinLength));
    }
  } catch (e) {
    Logger.log('storePinLength_ error: ' + e.message);
  }
}

function lockAccountAndNotify(userEmail) {
  try {
    var normalizedEmail = MM_normEmail_(userEmail);
    if (!normalizedEmail) return;

    var userProps = _mm_safeUserProps_();
    if (userProps) {
      userProps.setProperty(_mm_userPropKey_(normalizedEmail, 'pin_locked'), 'true');
    }

    var subject = 'Your Money Mastery account has been locked';
    var body = 'Hi there,\n\nWe detected several incorrect PIN attempts on your Money Mastery workbook, so we temporarily locked access for security.\n\nTo regain access:\n1. Open your Money Mastery sheet\n2. Choose Support & Settings → Forgot PIN?\n3. Follow the reset instructions sent to your email\n\nIf you did not attempt to sign in, please contact support immediately at ' + PLACEHOLDER_LINKS.SUPPORT_EMAIL + '.\n\nThank you,\nMoney Mastery Team';

    MailApp.sendEmail({
      to: normalizedEmail,
      subject: subject,
      body: body
    });
  } catch (e) {
    Logger.log('lockAccountAndNotify error: ' + e.message);
  }
}

function MM_resetPinAttempts_(userEmail) {
  try {
    var normalizedEmail = MM_normEmail_(userEmail);
    var userProps = _mm_safeUserProps_();
    if (userProps && normalizedEmail) {
      userProps.setProperty(_mm_userPropKey_(normalizedEmail, 'pin_attempts'), '0');
      userProps.deleteProperty(_mm_userPropKey_(normalizedEmail, 'pin_locked'));
    }
  } catch (e) {
    Logger.log('MM_resetPinAttempts_ error: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// LOGIN GATE UI
// ═══════════════════════════════════════════════════════════════════

function MM_showLoginGate_(email) {
  try {
    var resolvedEmail = email || '';
    if (!resolvedEmail) {
      try {
        resolvedEmail = MM_normEmail_(Session.getActiveUser().getEmail());
      } catch (e) {
        resolvedEmail = '';
      }
    }

    var template = HtmlService.createTemplateFromFile('PinEntry');
    template.email = resolvedEmail || 'your@email.com';

    var html = template.evaluate()
      .setWidth(460)
      .setHeight(520);

    SpreadsheetApp.getUi().showModalDialog(html, 'Secure Login');
  } catch (e) {
    Logger.log('MM_showLoginGate_ error: ' + e.message);
  }
}
