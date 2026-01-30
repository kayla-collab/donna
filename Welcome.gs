/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * WELCOME.GS - Security Gate + Enhanced Dashboard
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * ✅ PHASE 1B UPDATES:
 * - Fixed MM_readTransactionSheetMonthly to use correct columns (row 15, C-K)
 * - Added Needs/Desires tracking
 * - Enhanced error detection (dates, descriptions, needs/desires)
 * - Uses MM_isValidDate and MM_isValidDescription from CODE.GS
 * - Added needsTotal and desiresTotal to dashboard data
 * - REBRANDED: Brown (#ab9478) luxury theme with icon fonts
 * - PUBLIC API: MM_computeDashboardData (no underscore)
 */

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

var MM_CFG = (function() {
  return {
    MASTER_EMAILS: [
      'donnaroggio1111@gmail.com',
      'donna@risingandthriving.com',
      'support@risingandthriving.com',
      'donnaroggio@gmail.com'
    ],
    DASH_SHEETS: {
      INCOME: 'INCOME TRANSACTIONS',
      EXPENSE: 'EXPENSE TRANSACTIONS',
      YEARLY: 'YEARLY OVERVIEW',
      MONTHLY: 'MONTHLY OVERVIEW',
      PROFIT_LOSS: 'PROFIT & LOSS'
    },
    BRAND_COLOR: '#ab9478',
    BRAND_COLOR_DARK: '#8b7860',
    BRAND_COLOR_LIGHT: '#c4b49a'
  };
})();

var ONBOARDING_ACCESS_CONFIG = {
  SHOW_SHEETS: ['START HERE', 'YEARLY OVERVIEW', 'MONTHLY OVERVIEW', 'PROFIT & LOSS'],
  HIDE_SHEETS: ['INCOME TRANSACTIONS', 'EXPENSE TRANSACTIONS', 'NEW-SHEET-LOG-ACCESS-KEYS-2', 'BACKEND', 'ADMIN', 'ADMIN PANEL'],
  SHOW_PATTERNS: [/^ACCOUNT\b/i],
  PROTECT_SHEETS: ['INCOME TRANSACTIONS', 'EXPENSE TRANSACTIONS', 'NEW-SHEET-LOG-ACCESS-KEYS-2']
};

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

// NOTE: MM_getProps_() is defined in Helpers.gs as _mm_safeDocProps_()
// It uses Script Properties with doc ID prefix for cross-user compatibility
// This avoids PERMISSION_DENIED errors when non-owner users access the sheet

// NOTE: MM_normEmail_ and MM_isMasterEmail_ are defined in Auth_Core.gs
// DO NOT duplicate here to avoid conflicts

function MM_parseMoney_(rawValue, displayValue) {
  if (typeof rawValue === 'number' && !isNaN(rawValue)) return rawValue;
  const s0 = String(displayValue || rawValue || '').trim();
  if (!s0) return NaN;
  const negParen = /^\(.*\)$/.test(s0);
  const cleaned = s0.replace(/[,$\s]/g, '').replace(/[^\d\.\-]/g, '');
  let n = parseFloat(cleaned);
  if (isNaN(n)) return NaN;
  if (negParen) n = -Math.abs(n);
  return n;
}

function MM_parseDate_(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch (e) {
    return null;
  }
}

// NOTE: _mm_markUserRegistered_, _mm_isUserRegistered_, _mm_storeUserPinHash_, 
// and _mm_getUserPinHash_ are defined in Auth_Core.gs
// DO NOT duplicate here to avoid conflicts

// ═══════════════════════════════════════════════════════════════════
// AUTHENTICATION & SECURITY (SIMPLIFIED - NO MFA)
// ═══════════════════════════════════════════════════════════════════

/**
 * Main entry point for authentication flow
 * 
 * ENHANCED WITH SESSION MANAGEMENT:
 * - Checks for valid active session first
 * - If session valid and not expired → Opens dashboard directly
 * - If session expired or missing → Requires authentication
 * 
 * AUTHENTICATION FLOW:
 * 1. Admin users → Direct access to dashboard (no login required)
 * 2. Primary user with PIN → Show PIN login, then dashboard
 * 3. Primary user without PIN → Show registration
 * 4. Guest → Show appropriate flow
 * 5. Unknown user → Show unauthorized
 * 
 * SECURITY: Called on EVERY sheet open/refresh to enforce authentication
 */
function MM_openSecurityThenDashboard() {
  try {
    var currentEmail = '';
    try {
      currentEmail = Session.getActiveUser().getEmail();
    } catch (e) {
      Logger.log('Could not get user email: ' + e.message);
      try {
        SpreadsheetApp.getUi().alert(
          'Authorization Required',
          'Please authorize the script first:\n\n' +
          '1. Go to Extensions → Apps Script\n' +
          '2. Run the "AUTHORIZE_ALL_PERMISSIONS" function\n' +
          '3. Accept the authorization prompts\n' +
          '4. Return to this sheet and try again',
          SpreadsheetApp.getUi().ButtonSet.OK
        );
      } catch (e2) {
        Logger.log('Could not show UI: ' + e2.message);
      }
      return;
    }

    var normalizedEmail = MM_normEmail_(currentEmail);
    var props = MM_getProps_();

    if (!props || typeof props.getProperty !== 'function') {
      Logger.log('ERROR: Props object is invalid');
      try {
        SpreadsheetApp.getUi().alert(
          'Storage Access Error',
          'Unable to access storage. Please authorize the script:\n\n' +
          '1. Go to Extensions → Apps Script\n' +
          '2. Run the "AUTHORIZE_ALL_PERMISSIONS" function\n' +
          '3. Accept all prompts\n' +
          '4. Return and try again',
          SpreadsheetApp.getUi().ButtonSet.OK
        );
      } catch (authErr) {}
      return;
    }

    Logger.log('🔐 Auth flow started for: ' + normalizedEmail);
    
    // Check for pending retries from previous failed operations
    try {
      checkAndRetryPendingOperations();
    } catch (retryError) {
      Logger.log('⚠️ Retry check failed: ' + retryError.message);
    }

    // ═════════════════════════════════════════════════════════════════
    // ADMIN BYPASS - Admins always get direct access
    // ═════════════════════════════════════════════════════════════════
    if (MM_isMasterEmail_(normalizedEmail)) {
      Logger.log('🔑 ADMIN detected: ' + normalizedEmail + ' - Direct dashboard access');
      props.setProperty('mm_registered', 'true');
      if (!props.getProperty('mm_primary_email')) {
        props.setProperty('mm_primary_email', normalizedEmail);
      }
      // Create session for admin (optional but recommended)
      if (typeof MM_createSession === 'function') {
        MM_createSession(normalizedEmail);
      }
      MM_showDashboard();
      return;
    }

    // ═════════════════════════════════════════════════════════════════
    // SESSION CHECK - Check if user has valid active session
    // ═════════════════════════════════════════════════════════════════
    var registered = props.getProperty('mm_registered') === 'true';
    
    if (registered && typeof MM_isSessionValid === 'function') {
      var hasValidSession = MM_isSessionValid(normalizedEmail);
      
      if (hasValidSession) {
        Logger.log('✅ Valid session found - opening dashboard directly');
        // Extend session on activity
        if (typeof MM_extendSession === 'function') {
          MM_extendSession(normalizedEmail);
        }
        MM_showDashboard();
        return;
      } else {
        Logger.log('❌ No valid session - authentication required');
      }
    }

    var registered = props.getProperty('mm_registered') === 'true';
    if (!registered) {
      Logger.log('📝 Sheet not registered - showing Access Key registration');
      MM_showAccessKeyRegistration_();
      return;
    }

    var isAuthorized = false;
    var userRole = null;
    var primaryEmail = MM_normEmail_(props.getProperty('mm_primary_email') || '');
    var clientEmail = MM_normEmail_(props.getProperty('mm_client_email') || '');

    // Check if primary user
    if (normalizedEmail === primaryEmail) {
      isAuthorized = true;
      userRole = 'primary';
    } 
    // Check if admin-set client email (same treatment as primary)
    else if (clientEmail && normalizedEmail === clientEmail) {
      isAuthorized = true;
      userRole = 'primary'; // Treat as primary for authentication flow
      Logger.log('📧 Admin-set client email matched: ' + normalizedEmail);
      // If no primary email set, use client email
      if (!primaryEmail) {
        props.setProperty('mm_primary_email', normalizedEmail);
      }
    }
    // Check if guest
    else {
      try {
        var guestsJson = props.getProperty('mm_guests_json');
        if (guestsJson) {
          var guests = JSON.parse(guestsJson);
          if (Array.isArray(guests)) {
            for (var i = 0; i < guests.length; i++) {
              if (MM_normEmail_(guests[i].email) === normalizedEmail) {
                isAuthorized = true;
                userRole = 'guest';
                if (guests[i].tempPin && !guests[i].registered) {
                  Logger.log('👤 Guest with temp PIN - showing guest registration');
                  MM_showGuestRegistration_(normalizedEmail, guests[i]);
                  return;
                }
                break;
              }
            }
          }
        }
      } catch (guestErr) {
        Logger.log('Error checking guests: ' + guestErr.message);
      }
    }

    if (!isAuthorized) {
      Logger.log('❓ User not recognized: ' + currentEmail + ' - redirecting to registration');
      MM_showAccessKeyRegistration_();
      return;
    }

    var userProps = _mm_safeUserProps_();

    if (userRole === 'primary') {
      var isUserRegistered = _mm_isUserRegistered_(normalizedEmail);
      var hasPinHash = !!_mm_getUserPinHash_(normalizedEmail);

      if (userProps && userProps.getProperty(_mm_userPropKey_(normalizedEmail, 'pin_locked')) === 'true') {
        try {
          SpreadsheetApp.getUi().alert(
            'Account Locked',
            'Your account is locked due to multiple incorrect PIN attempts. Use the "Forgot PIN?" option to reset.',
            SpreadsheetApp.getUi().ButtonSet.OK
          );
        } catch (lockedAlertErr) {}
        MM_showForgotPinGate();
        return;
      }

      var tutorialCompleted = props.getProperty('mm_tutorial_completed') === 'true';
      var firstLoginFlag = props.getProperty('mm_is_first_login') === 'true';

      if (!tutorialCompleted && userProps) {
        var tutorialKey = _mm_userPropKey_(normalizedEmail, 'tutorial_completed');
        if (userProps.getProperty(tutorialKey) === 'true' ||
            userProps.getProperty(normalizedEmail + '_tutorial_completed') === 'true') {
          tutorialCompleted = true;
          firstLoginFlag = false;
        }
      }

      if (!isUserRegistered) {
        Logger.log('ℹ️ User registration flag missing for primary user; treating as first-time login.');
        firstLoginFlag = true;
      }

      if (firstLoginFlag || !tutorialCompleted) {
        Logger.log('🎓 Primary user requires onboarding tutorial');
        props.setProperty('mm_is_first_login', 'true');
        MM_showWelcomeTutorial();
        return;
      }

      if (!hasPinHash) {
        Logger.log('⚠️ Primary user missing PIN setup - redirecting to registration gate');
        MM_showRegistrationGate_();
        return;
      }

      if (!isUserRegistered) {
        _mm_markUserRegistered_(normalizedEmail);
      }

      if (props.getProperty('mm_sheet_access_configured') !== 'true') {
        try {
          MM_configureSheetAccessForUser_();
          props.setProperty('mm_sheet_access_configured', 'true');
        } catch (configError) {
          Logger.log('Sheet access configuration error: ' + configError.message);
        }
      }

      Logger.log('🔐 Showing PIN login gate for primary user');
      MM_showLoginGate_(normalizedEmail);
      return;
    }

    var hasPinHash = !!_mm_getUserPinHash_(normalizedEmail);

    if (hasPinHash) {
      Logger.log('🔐 Authorized guest with PIN - showing login gate');
      MM_showLoginGate_(normalizedEmail);
      return;
    }

    Logger.log('📝 Authorized guest without PIN - showing registration gate');
    MM_showRegistrationGate_();
  } catch (error) {
    Logger.log('MM_openSecurityThenDashboard error: ' + error.message);
    try {
      SpreadsheetApp.getUi().alert('Error', 'Failed to open security gate: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (uiError) {
      Logger.log('Cannot show UI alert: ' + uiError.message);
    }
  }
}

// NOTE: MM_showLoginGate_ is defined in Auth_Core.gs
// DO NOT duplicate here to avoid conflicts

// Admin MFA functions removed - admins now get direct dashboard access

// ═══════════════════════════════════════════════════════════════════
// ACCESS KEY REGISTRATION (New Users)
// ═══════════════════════════════════════════════════════════════════

/**
 * Configuration for Access Key backend sheet
 */
var ACCESS_KEY_CONFIG = {
  // Use ScriptProperties for validation (Server-Side Cache)
  STORAGE_KEY_ACCESS_KEYS: 'mm_valid_access_keys_cache'
};

/**
 * Show Access Key Registration for new users
 */
function MM_showAccessKeyRegistration_() {
  var email = Session.getActiveUser().getEmail();
  
  var template = HtmlService.createTemplateFromFile('RegistrationFlow');
  template.userEmail = email;
  
  var html = template.evaluate()
    .setWidth(1400)
    .setHeight(900);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Money Mastery Registration');
}

/**
 * Create Access Key Registration HTML
 */
function _createAccessKeyRegistrationHTML_(email) {
  return '<!DOCTYPE html>' +
    '<html>' +
    '<head>' +
    '<base target="_top">' +
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">' +
    '<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">' +
    '<style>' +
    '* { box-sizing: border-box; margin: 0; padding: 0; }' +
    'body { font-family: "Inter", sans-serif; background: linear-gradient(135deg, #f5f5f0 0%, #e8e4dc 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }' +
    '.gate-container { background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(171, 148, 120, 0.15); padding: 40px; max-width: 460px; width: 100%; }' +
    '.gate-header { text-align: center; margin-bottom: 30px; }' +
    '.gate-icon { width: 70px; height: 70px; background: linear-gradient(135deg, #ab9478 0%, #8b7860 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }' +
    '.gate-icon i { font-size: 32px; color: white; }' +
    'h1 { color: #333; font-size: 24px; font-weight: 600; margin-bottom: 8px; }' +
    '.subtitle { color: #666; font-size: 14px; }' +
    '.email-display { background: #f8f6f3; border: 1px solid #e0ddd6; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }' +
    '.email-display i { color: #ab9478; }' +
    '.email-display span { color: #333; font-weight: 500; font-size: 14px; word-break: break-all; }' +
    '.form-group { margin-bottom: 18px; }' +
    'label { display: block; color: #555; font-size: 13px; font-weight: 500; margin-bottom: 8px; }' +
    'input[type="text"], input[type="password"] { width: 100%; padding: 12px 14px; border: 2px solid #e0ddd6; border-radius: 8px; font-size: 15px; transition: all 0.2s; }' +
    'input:focus { outline: none; border-color: #ab9478; box-shadow: 0 0 0 3px rgba(171, 148, 120, 0.1); }' +
    '.access-key-input { font-size: 18px; letter-spacing: 3px; text-transform: uppercase; }' +
    '.pin-input { font-size: 20px; letter-spacing: 10px; text-align: center; }' +
    '.pin-hint { color: #888; font-size: 11px; margin-top: 4px; text-align: center; }' +
    '.btn { width: 100%; padding: 14px 24px; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; margin-bottom: 10px; }' +
    '.btn-primary { background: linear-gradient(135deg, #ab9478 0%, #8b7860 100%); color: white; }' +
    '.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(171, 148, 120, 0.3); }' +
    '.error-message { background: #fff5f5; border: 1px solid #ffcccb; color: #c53030; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; display: none; }' +
    '.success-message { background: #f0fff4; border: 1px solid #9ae6b4; color: #276749; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; display: none; }' +
    '.info-box { background: #ebf8ff; border: 1px solid #90cdf4; color: #2b6cb0; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; }' +
    '.loading { display: none; text-align: center; padding: 20px; }' +
    '.spinner { width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid #ab9478; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 10px; }' +
    '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }' +
    '.step { display: none; }' +
    '.step.active { display: block; }' +
    '.step-indicator { display: flex; justify-content: center; gap: 8px; margin-bottom: 20px; }' +
    '.step-dot { width: 10px; height: 10px; border-radius: 50%; background: #e0ddd6; }' +
    '.step-dot.active { background: #ab9478; }' +
    '.guest-link { text-align: center; margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0ddd6; }' +
    '.guest-link a { color: #888; text-decoration: none; font-size: 13px; cursor: pointer; }' +
    '.guest-link a:hover { color: #ab9478; text-decoration: underline; }' +
    '</style>' +
    '</head>' +
    '<body>' +
    '<div class="gate-container">' +
    '<div class="gate-header">' +
    '<div class="gate-icon"><i class="fas fa-key"></i></div>' +
    '<h1>Welcome to Money Mastery</h1>' +
    '<p class="subtitle">Enter your Access Key to get started</p>' +
    '</div>' +
    
    '<div class="step-indicator">' +
    '<div class="step-dot active" id="dot1"></div>' +
    '<div class="step-dot" id="dot2"></div>' +
    '</div>' +
    
    '<div class="email-display">' +
    '<i class="fas fa-envelope"></i>' +
    '<span>' + email + '</span>' +
    '</div>' +
    
    '<div id="errorMsg" class="error-message"></div>' +
    '<div id="successMsg" class="success-message"></div>' +
    
    '<!-- STEP 1: Access Key -->' +
    '<div id="step1" class="step active">' +
    '<div class="info-box">' +
    '<i class="fas fa-info-circle"></i> Your Access Key was provided when you purchased Money Mastery. Check your email for the key.' +
    '</div>' +
    '<div class="form-group">' +
    '<label><i class="fas fa-key"></i> Access Key</label>' +
    '<input type="text" id="accessKey" class="access-key-input" placeholder="MM-XXXXXX" autofocus>' +
    '</div>' +
    '<button class="btn btn-primary" onclick="verifyAccessKey()">' +
    '<i class="fas fa-check-circle"></i> Verify Access Key' +
    '</button>' +
    '<div class="guest-link">' +
    '<a onclick="showGuestLogin()"><i class="fas fa-user-friends"></i> Registering as a Guest?</a>' +
    '</div>' +
    '</div>' +
    
    '<!-- STEP 2: Create Profile & PIN -->' +
    '<div id="step2" class="step">' +
    '<div class="form-group">' +
    '<label><i class="fas fa-id-card"></i> First Name</label>' +
    '<input type="text" id="firstName" class="text-input" placeholder="First Name" autocomplete="given-name">' +
    '</div>' +
    '<div class="form-group">' +
    '<label><i class="fas fa-id-card"></i> Last Name</label>' +
    '<input type="text" id="lastName" class="text-input" placeholder="Last Name" autocomplete="family-name">' +
    '</div>' +
    '<div class="form-group">' +
    '<label><i class="fas fa-lock"></i> Create Your PIN</label>' +
    '<input type="password" id="pin1" class="pin-input" maxlength="6" placeholder="------" inputmode="numeric">' +
    '<p class="pin-hint">Enter 4-6 digits</p>' +
    '</div>' +
    '<div class="form-group">' +
    '<label><i class="fas fa-check-circle"></i> Confirm PIN</label>' +
    '<input type="password" id="pin2" class="pin-input" maxlength="6" placeholder="------" inputmode="numeric">' +
    '</div>' +
    '<button class="btn btn-primary" onclick="createAccount()">' +
    '<i class="fas fa-user-plus"></i> Create Account' +
    '</button>' +
    '</div>' +
    

    
    '<div id="loadingContent" class="loading">' +
    '<div class="spinner"></div>' +
    '<p id="loadingText">Processing...</p>' +
    '</div>' +
    '</div>' +
    
    '<script>' +
    'var userEmail = "' + email + '";' +
    'var verifiedAccessKey = "";' +
    'var currentStep = 1;' +
    
    'function showError(msg) { document.getElementById("errorMsg").textContent = msg; document.getElementById("errorMsg").style.display = "block"; document.getElementById("successMsg").style.display = "none"; }' +
    'function showSuccess(msg) { document.getElementById("successMsg").textContent = msg; document.getElementById("successMsg").style.display = "block"; document.getElementById("errorMsg").style.display = "none"; }' +
    'function hideMessages() { document.getElementById("errorMsg").style.display = "none"; document.getElementById("successMsg").style.display = "none"; }' +
    
    'function showLoading(msg) {' +
    '  document.getElementById("loadingText").textContent = msg || "Processing...";' +
    '  document.getElementById("loadingContent").style.display = "block";' +
    '  for (var i = 1; i <= 2; i++) document.getElementById("step" + i).classList.remove("active");' +
    '}' +
    
    'function hideLoading() { document.getElementById("loadingContent").style.display = "none"; }' +
    
    'function goToStep(step) {' +
    '  currentStep = step;' +
    '  hideLoading();' +
    '  for (var i = 1; i <= 2; i++) {' +
    '    document.getElementById("step" + i).classList.remove("active");' +
    '    document.getElementById("dot" + i).classList.remove("active");' +
    '  }' +
    '  document.getElementById("step" + step).classList.add("active");' +
    '  document.getElementById("dot" + step).classList.add("active");' +
    '}' +
    
    'function verifyAccessKey() {' +
    '  var accessKey = document.getElementById("accessKey").value.trim().toUpperCase();' +
    '  hideMessages();' +
    '  if (!accessKey) { showError("Please enter your Access Key"); return; }' +
    '  showLoading("Verifying access key...");' +
    '  google.script.run' +
    '    .withSuccessHandler(function(result) {' +
    '      if (result.success) {' +
    '        verifiedAccessKey = accessKey;' +
    '        goToStep(2);' +
    '        var firstField = document.getElementById("firstName");' +
    '        if (firstField) { firstField.focus(); }' +
    '      } else {' +
    '        goToStep(1);' +
    '        showError(result.message);' +
    '      }' +
    '    })' +
    '    .withFailureHandler(function(err) { goToStep(1); showError("Error: " + err.message); })' +
    '    .MM_verifyAccessKey(userEmail, accessKey);' +
    '}' +
    
    'function createAccount() {' +
    '  var firstNameField = document.getElementById("firstName");' +
    '  var lastNameField = document.getElementById("lastName");' +
    '  var firstName = firstNameField ? firstNameField.value.trim() : "";' +
    '  var lastName = lastNameField ? lastNameField.value.trim() : "";' +
    '  var pin1 = document.getElementById("pin1").value;' +
    '  var pin2 = document.getElementById("pin2").value;' +
    '  hideMessages();' +
    '  if (!firstName) { goToStep(2); showError("Please enter your first name"); return; }' +
    '  if (!lastName) { goToStep(2); showError("Please enter your last name"); return; }' +
    '  if (!pin1 || pin1.length < 4) { showError("PIN must be at least 4 digits"); return; }' +
    '  if (!/^\\d{4,6}$/.test(pin1)) { showError("PIN must contain only numbers"); return; }' +
    '  if (pin1 !== pin2) { showError("PINs do not match"); return; }' +
    '  showLoading("Creating your account...");' +
    '  google.script.run' +
    '    .withSuccessHandler(function(result) {' +
    '      if (result.success) {' +
    '        showSuccess("Registration complete! Opening tutorial...");' +
    '        google.script.run' +
    '          .withSuccessHandler(function() {' +
    '            google.script.host.close();' +
    '          })' +
    '          .withFailureHandler(function(err) {' +
    '            console.error("Tutorial error:", err);' +
    '            google.script.host.close();' +
    '          })' +
    '          .MM_showWelcomeTutorial();' +
    '      } else { goToStep(2); showError(result.message); }' +
    '    })' +
    '    .withFailureHandler(function(err) { goToStep(2); showError("Error: " + err.message); })' +
    '    .MM_registerWithAccessKey(userEmail, pin1, verifiedAccessKey, firstName, lastName);' +
    '}' +
    
    'function showGuestLogin() {' +
    '  google.script.host.close();' +
    '  google.script.run.MM_showGuestLoginPrompt();' +
    '}' +
    
    'document.getElementById("accessKey").addEventListener("keypress", function(e) { if (e.key === "Enter") verifyAccessKey(); });' +
    'document.getElementById("pin1").addEventListener("keypress", function(e) { if (e.key === "Enter") document.getElementById("pin2").focus(); });' +
    'document.getElementById("pin2").addEventListener("keypress", function(e) { if (e.key === "Enter") createAccount(); });' +
    '</script>' +
    '</body>' +
    '</html>';
}

/**
 * Verify Access Key
 * 
 * Uses LOCAL storage only - no external backend calls.
 * Access keys are synced to local storage when:
 * - Admin opens the sheet
 * - Admin runs "Prepare Sheet for Client"
 * - Admin runs "Reset Registration"
 */
function MM_verifyAccessKey(email, accessKey) {
  try {
    var normalizedEmail = MM_normEmail_(email);
    var normalizedKey = String(accessKey).trim().toUpperCase();
    
    Logger.log('Verifying access key for: ' + normalizedEmail + ' | Key: ' + normalizedKey);
    
    // Basic validation
    if (!normalizedKey || normalizedKey.length < 4) {
      return { success: false, message: 'Access key is too short.' };
    }
    
    // ═════════════════════════════════════════════════════════════════
    // MASTER HUB VALIDATION (via Web App for regular users)
    // Validates email + access key match in CLIENT MANAGEMENT sheet
    // ═════════════════════════════════════════════════════════════════
    if (typeof MH_validateForRegistration === 'function') {
      try {
        Logger.log('🔍 Calling MH_validateForRegistration for: ' + normalizedEmail + ' with key: ' + normalizedKey);
        var hubResult = MH_validateForRegistration(normalizedEmail, normalizedKey);
        Logger.log('🔍 MH_validateForRegistration returned: ' + JSON.stringify(hubResult));
        
        if (hubResult.success) {
          Logger.log('✅ Access key verified via MASTER HUB');
          
          // Store row index for registration update later
          var props = MM_getProps_();
          if (hubResult.rowIndex) {
            Logger.log('💾 Storing hub row index: ' + hubResult.rowIndex);
            props.setProperty('mm_hub_row_index', String(hubResult.rowIndex));
            
            // Store client data if available
            if (hubResult.clientData) {
              Logger.log('💾 Storing client data: ' + JSON.stringify(hubResult.clientData));
              props.setProperty('mm_hub_client_data', JSON.stringify(hubResult.clientData));
            }
          } else {
            Logger.log('⚠️ No rowIndex in hubResult - storing validation flag instead');
            // Store validation flag even without row index
            props.setProperty('mm_hub_validated', 'true');
            props.setProperty('mm_hub_validated_email', normalizedEmail);
            props.setProperty('mm_hub_validated_key', normalizedKey);
          }
          
          // Check if already registered
          if (hubResult.clientData && hubResult.clientData.alreadyRegistered) {
            Logger.log('⚠️ Client already registered with different sheet');
            // Still allow - might be re-registering
          }
          
          return { success: true, message: 'Access key accepted!' };
        } else {
          // Check for disabled account
          if (hubResult.disabled) {
            Logger.log('❌ Account disabled');
            return { success: false, message: 'Your account has been disabled. Please contact support.' };
          }
          
          Logger.log('❌ MASTER HUB verification failed: ' + (hubResult.error || 'Invalid key'));
          return { success: false, message: hubResult.error || 'Email and access key do not match our records. Please check and try again.' };
        }
      } catch (hubError) {
        Logger.log('❌ MASTER HUB verification error: ' + hubError.message);
        // DO NOT fall through - return error immediately
        return { 
          success: false, 
          message: 'Unable to verify access key. Please try again or contact support. (Error: ' + hubError.message + ')' 
        };
      }
    }
    
    // ═════════════════════════════════════════════════════════════════
    // NO FALLBACK - MASTER HUB function not available
    // ═════════════════════════════════════════════════════════════════
    Logger.log('❌ MH_validateForRegistration function not available');
    return { 
      success: false, 
      message: 'Registration system not configured. Please contact support.' 
    };
    
  } catch (e) {
    Logger.log('MM_verifyAccessKey error: ' + e.message);
    return { success: false, message: 'Verification error: ' + e.message };
  }
}

/**
 * Register user with verified access key
 * Step 1: Validates access key against LOCAL storage (no external calls)
 * Step 2: If valid, creates the user account
 */
function MM_registerWithAccessKey(email, pin, accessKey, firstName, lastName) {
  try {
    var normalizedEmail = MM_normEmail_(email);
    if (!normalizedEmail) {
      throw new Error('Unable to determine your Google account email. Please make sure you are signed in.');
    }

    var props = MM_getProps_();
    var userProps = _mm_safeUserProps_();

    var first = String(firstName || '').trim();
    var last = String(lastName || '').trim();
    if (!first) throw new Error('First name is required.');
    if (!last) throw new Error('Last name is required.');

    var cleanedAccessKey = String(accessKey || '').trim().toUpperCase();
    
    // ═════════════════════════════════════════════════════════════════
    // MASTER HUB VALIDATION - Do inline if not already validated
    // ═════════════════════════════════════════════════════════════════
    var hubRowIndex = props.getProperty('mm_hub_row_index');
    var hubClientDataStr = props.getProperty('mm_hub_client_data');
    var hubClientData = null;
    
    Logger.log('🔍 Registration check - hubRowIndex: ' + hubRowIndex + ', hasClientData: ' + !!hubClientDataStr);
    
    // If no prior validation, do it now
    if (!hubRowIndex) {
      Logger.log('🔄 No prior validation found, validating now...');
      
      if (!cleanedAccessKey || cleanedAccessKey.length < 4) {
        throw new Error('Please enter a valid access key.');
      }
      
      // Validate via MASTER HUB
      if (typeof MH_validateForRegistration === 'function') {
        try {
          Logger.log('🔍 Calling MH_validateForRegistration for: ' + normalizedEmail + ' with key: ' + cleanedAccessKey);
          var hubResult = MH_validateForRegistration(normalizedEmail, cleanedAccessKey);
          Logger.log('🔍 MH_validateForRegistration returned: ' + JSON.stringify(hubResult));
          
          if (!hubResult.success) {
            if (hubResult.disabled) {
              throw new Error('Your account has been disabled. Please contact support.');
            }
            throw new Error(hubResult.error || 'Email and access key do not match our records. Please check and try again.');
          }
          
          // Store the validation result
          hubRowIndex = hubResult.rowIndex;
          hubClientData = hubResult.clientData;
          
          if (hubRowIndex) {
            props.setProperty('mm_hub_row_index', String(hubRowIndex));
          }
          if (hubClientData) {
            props.setProperty('mm_hub_client_data', JSON.stringify(hubClientData));
            hubClientDataStr = JSON.stringify(hubClientData);
          }
          
          Logger.log('✅ Inline validation successful - rowIndex: ' + hubRowIndex);
          
        } catch (hubError) {
          Logger.log('❌ Inline validation error: ' + hubError.message);
          throw hubError; // Re-throw validation errors
        }
      } else {
        Logger.log('❌ MH_validateForRegistration function not available');
        throw new Error('Registration system not configured. Please contact support.');
      }
    }
    
    // Parse stored client data if not already parsed
    if (!hubClientData && hubClientDataStr) {
      try {
        hubClientData = JSON.parse(hubClientDataStr);
      } catch (parseErr) {
        Logger.log('⚠️ Could not parse stored client data: ' + parseErr.message);
      }
    }
    
    // Verify stored data matches (if we have it)
    if (hubClientData) {
      // Verify the email matches
      if (hubClientData.email && hubClientData.email.toLowerCase() !== normalizedEmail.toLowerCase()) {
        Logger.log('❌ Email mismatch - stored: ' + hubClientData.email + ', attempting: ' + normalizedEmail);
        props.deleteProperty('mm_hub_row_index');
        props.deleteProperty('mm_hub_client_data');
        throw new Error('Email mismatch. Please try again.');
      }
      // Verify the access key matches
      if (hubClientData.accessCode && hubClientData.accessCode.toUpperCase() !== cleanedAccessKey) {
        Logger.log('❌ Key mismatch - stored: ' + hubClientData.accessCode + ', attempting: ' + cleanedAccessKey);
        props.deleteProperty('mm_hub_row_index');
        props.deleteProperty('mm_hub_client_data');
        throw new Error('Access key mismatch. Please verify your access key and try again.');
      }
      Logger.log('✅ Registration credentials match stored validation for: ' + normalizedEmail);
    }
    
    Logger.log('✅ Registration proceeding with validated credentials for: ' + normalizedEmail);

    var pinHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pin + normalizedEmail);
    var pinHashString = pinHash.map(function(byte) {
      return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');

    props.setProperty('mm_registered', 'true');
    props.setProperty('mm_primary_email', normalizedEmail);
    props.setProperty('mm_primary_first_name', first);
    props.setProperty('mm_primary_last_name', last);
    
    // Store PIN hash locally (simple and reliable)
    try {
      _mm_storeUserPinHash_(normalizedEmail, pinHashString);
      Logger.log('✅ PIN saved locally');
    } catch (pinSaveError) {
      Logger.log('[ERROR] PIN save failed: ' + pinSaveError.message);
    }
    
    props.setProperty('mm_access_key', cleanedAccessKey);
    props.setProperty('mm_registration_date', new Date().toISOString());
    props.setProperty('mm_is_first_login', 'true');
    props.setProperty('mm_needs_bank_setup', 'true');
    props.deleteProperty('mm_tutorial_completed');
    props.deleteProperty('mm_sheet_access_configured');

    _mm_markUserRegistered_(normalizedEmail);

    if (userProps) {
      userProps.setProperty(_mm_userPropKey_(normalizedEmail, 'pin_attempts'), '0');
      userProps.deleteProperty(_mm_userPropKey_(normalizedEmail, 'pin_locked'));
      userProps.setProperty(_mm_userPropKey_(normalizedEmail, 'first_name'), first);
      userProps.setProperty(_mm_userPropKey_(normalizedEmail, 'last_name'), last);
      userProps.setProperty(_mm_userPropKey_(normalizedEmail, 'last_registration_ts'), String(Date.now()));
      userProps.deleteProperty(_mm_userPropKey_(normalizedEmail, 'plaid_token'));
      userProps.deleteProperty(_mm_userPropKey_(normalizedEmail, 'tutorial_completed'));
      userProps.deleteProperty(normalizedEmail + '_tutorial_completed');
    }

    try {
      var scriptProps = _mm_safeScriptProps_();
      scriptProps.setProperty('mm_user_' + normalizedEmail, JSON.stringify({
        email: normalizedEmail,
        firstName: first,
        lastName: last,
        accessKey: cleanedAccessKey,
        createdAt: new Date().toISOString()
      }));
    } catch (scriptError) {
      Logger.log('Could not store user data in script props: ' + scriptError.message);
    }

    // ═════════════════════════════════════════════════════════════════
    // UPDATE MASTER HUB (via Web App)
    // ═════════════════════════════════════════════════════════════════
    try {
      var hubRowIndex = props.getProperty('mm_hub_row_index');
      if (hubRowIndex && typeof MH_completeRegistration === 'function') {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var sheetId = ss.getId();
        
        var hubResult = MH_completeRegistration(parseInt(hubRowIndex, 10), {
          firstName: first,
          lastName: last,
          personalSheetId: sheetId
        });
        
        if (hubResult.success) {
          Logger.log('✅ MASTER HUB updated with registration');
          
          // Store the Copy Management Key from hub
          if (hubResult.copyManagementKey) {
            props.setProperty('mm_copy_management_key', hubResult.copyManagementKey);
            Logger.log('✅ Copy Management Key stored: ' + hubResult.copyManagementKey);
          }
        } else {
          Logger.log('⚠️ MASTER HUB update failed (non-critical): ' + (hubResult.error || 'Unknown'));
        }
        
        // Clean up temp storage
        props.deleteProperty('mm_hub_row_index');
        props.deleteProperty('mm_hub_client_data');
      }
    } catch (hubError) {
      Logger.log('⚠️ MASTER HUB update error (non-critical): ' + hubError.message);
    }
    
    Logger.log('✅ Registration data stored locally');

    // Send welcome email (only once - check flag)
    try {
      var welcomeEmailSent = props.getProperty('mm_welcome_email_sent_' + normalizedEmail);
      if (!welcomeEmailSent && typeof sendRegistrationWelcomeEmail === 'function') {
        sendRegistrationWelcomeEmail(normalizedEmail, first);
        props.setProperty('mm_welcome_email_sent_' + normalizedEmail, new Date().toISOString());
        Logger.log('✅ Welcome email sent to: ' + normalizedEmail);
      } else if (welcomeEmailSent) {
        Logger.log('ℹ️ Welcome email already sent, skipping duplicate');
      }
    } catch (emailError) {
      Logger.log('⚠️ Welcome email failed (non-fatal): ' + emailError.message);
    }

    Logger.log('✅ User registered: ' + normalizedEmail);
    return { success: true, message: 'Account created successfully!' };
  } catch (e) {
    Logger.log('MM_registerWithAccessKey error: ' + e.message);
    return { success: false, message: 'Registration error: ' + e.message };
  }
}

/**
 * Show Welcome Tutorial after first registration
 */
function MM_showWelcomeTutorial() {
  try {
    Logger.log('MM_showWelcomeTutorial called - loading TutorialEmbed.html');
    var html = HtmlService.createHtmlOutputFromFile('TutorialEmbed')
      .setWidth(760)
      .setHeight(640);

    SpreadsheetApp.getUi().showModalDialog(html, 'Welcome to Money Mastery');
    Logger.log('✓ Tutorial modal opened successfully');
    return { success: true };
  } catch (e) {
    Logger.log('MM_showWelcomeTutorial error: ' + e.message);
    try {
      proceedToSheetAccess();
    } catch (innerError) {
      Logger.log('Fallback to dashboard: ' + innerError.message);
      MM_showDashboard();
    }
    return { success: false, error: e.message };
  }
}

/**
 * Save tutorial completion status (for seamless flow)
 * This is called from RegistrationFlow.html when user clicks "Continue to Setup"
 */
function saveTutorialCompleted() {
  try {
    var props = MM_getProps_();
    var sessionEmail = '';
    try {
      sessionEmail = MM_normEmail_(Session.getActiveUser().getEmail());
    } catch (sessionErr) {
      Logger.log('saveTutorialCompleted could not resolve session email: ' + sessionErr.message);
    }

    props.setProperty('mm_tutorial_completed', 'true');
    props.setProperty('mm_is_first_login', 'false');

    if (sessionEmail) {
      _mm_markUserRegistered_(sessionEmail);
      var userProps = _mm_safeUserProps_();
      if (userProps) {
        userProps.setProperty(_mm_userPropKey_(sessionEmail, 'tutorial_completed'), 'true');
        userProps.setProperty(sessionEmail + '_tutorial_completed', 'true');
        userProps.setProperty(_mm_userPropKey_(sessionEmail, 'last_onboarding_ts'), String(Date.now()));
      }
    }

    MM_configureSheetAccessForUser_();
    props.setProperty('mm_sheet_access_configured', 'true');

    Logger.log('✓ Tutorial completed saved for: ' + sessionEmail);
    return { success: true };
  } catch (e) {
    Logger.log('saveTutorialCompleted error: ' + e.message);
    return { success: false, message: e.message };
  }
}

function proceedToSheetAccess() {
  try {
    var props = MM_getProps_();
    var sessionEmail = '';
    try {
      sessionEmail = MM_normEmail_(Session.getActiveUser().getEmail());
    } catch (sessionErr) {
      Logger.log('proceedToSheetAccess could not resolve session email: ' + sessionErr.message);
    }

    props.setProperty('mm_tutorial_completed', 'true');
    props.setProperty('mm_is_first_login', 'false');

    if (sessionEmail) {
      _mm_markUserRegistered_(sessionEmail);
      var userProps = _mm_safeUserProps_();
      if (userProps) {
        userProps.setProperty(_mm_userPropKey_(sessionEmail, 'tutorial_completed'), 'true');
        userProps.setProperty(sessionEmail + '_tutorial_completed', 'true');
        userProps.setProperty(_mm_userPropKey_(sessionEmail, 'last_onboarding_ts'), String(Date.now()));
      }
    }

    MM_configureSheetAccessForUser_();
    props.setProperty('mm_sheet_access_configured', 'true');

    // 2026 Update: Skip bank setup, go directly to dashboard
    // Money Mastery uses manual transaction entry only
    MM_showDashboard();
    return { success: true };
  } catch (e) {
    Logger.log('proceedToSheetAccess error: ' + e.message);
    try {
      MM_showDashboard();
    } catch (dashboardError) {
      Logger.log('Fallback dashboard error: ' + dashboardError.message);
    }
    return { success: false, message: e.message };
  }
}

function MM_configureSheetAccessForUser_() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    var showList = ONBOARDING_ACCESS_CONFIG.SHOW_SHEETS || [];
    var hideList = ONBOARDING_ACCESS_CONFIG.HIDE_SHEETS || [];
    var showPatterns = ONBOARDING_ACCESS_CONFIG.SHOW_PATTERNS || [];
    var protectList = ONBOARDING_ACCESS_CONFIG.PROTECT_SHEETS || [];

    var sheetMap = {};
    sheets.forEach(function(sheet) {
      sheetMap[sheet.getName()] = sheet;
    });

    showList.forEach(function(name) {
      var sheet = sheetMap[name];
      if (sheet) sheet.showSheet();
    });

    if (showPatterns.length) {
      sheets.forEach(function(sheet) {
        if (showPatterns.some(function(pattern) { return pattern.test(sheet.getName()); })) {
          sheet.showSheet();
        }
      });
    }

    hideList.forEach(function(name) {
      var sheet = sheetMap[name];
      if (sheet) sheet.hideSheet();
    });

    protectList.forEach(function(name) {
      var sheet = sheetMap[name];
      if (sheet) _MM_applyRestrictedSheetProtection_(sheet);
    });

    // Navigate to START HERE or YEARLY OVERVIEW after setup
    if (sheetMap['START HERE']) {
      ss.setActiveSheet(sheetMap['START HERE']);
    } else if (sheetMap['YEARLY OVERVIEW']) {
      ss.setActiveSheet(sheetMap['YEARLY OVERVIEW']);
    }
  } catch (e) {
    Logger.log('MM_configureSheetAccessForUser_ error: ' + e.message);
    throw e;
  }
}

function _MM_applyRestrictedSheetProtection_(sheet) {
  // DISABLED: Do not add protections - they block transaction imports
  // Protection auto-removal is handled by removeAccountProtectionsOnOpen()
  try {
    Logger.log('Sheet protection disabled for: ' + (sheet ? sheet.getName() : 'unknown'));
    return; // Exit early - no protections added

    if (MM_CFG && Array.isArray(MM_CFG.MASTER_EMAILS)) {
      try {
        protection.addEditors(MM_CFG.MASTER_EMAILS);
      } catch (addErr) {}
    }

    try {
      var effectiveUser = Session.getEffectiveUser();
      if (effectiveUser) protection.removeEditor(effectiveUser);
    } catch (effectiveErr) {}

    if (protection.canDomainEdit()) {
      protection.setDomainEdit(false);
    }
  } catch (e) {
    Logger.log('Sheet protection failed for ' + sheet.getName() + ': ' + e.message);
  }
}

/**
 * @deprecated Bank sync disabled. Money Mastery uses manual transaction entry only.
 */
function MM_showPlaidPrompt() {
  Logger.log('⚠️ DEPRECATED: MM_showPlaidPrompt - Plaid removed in 2026');
  // Go directly to dashboard - manual transaction entry only
  proceedToDashboard('Welcome! Enter transactions directly in your ACCOUNT sheets.');
}

/**
 * @deprecated Bank sync disabled. Money Mastery uses manual transaction entry only.
 */
function initializePlaid() {
  Logger.log('⚠️ DEPRECATED: initializePlaid - Plaid integration removed in 2026');
  Logger.log('   Money Mastery uses manual transaction entry only.');
  
  SpreadsheetApp.getUi().alert(
    'Bank Connection',
    'Plaid integration has been replaced with improved options:\n\n' +
    'Money Mastery uses manual transaction entry only.\n\n' +
    'Enter transactions directly in your ACCOUNT sheets.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  
  return { success: false, deprecated: true, message: 'Plaid removed in 2026' };
}

/**
 * @deprecated Plaid integration removed in 2026
 */
function createPlaidLinkToken() {
  Logger.log('⚠️ DEPRECATED: createPlaidLinkToken - Plaid integration removed in 2026');
  return { success: false, deprecated: true, message: 'Bank sync disabled. Use manual transaction entry.' };
}

/**
 * @deprecated Plaid integration removed in 2026
 */
function handlePlaidSuccess(publicToken, metadata) {
  Logger.log('⚠️ DEPRECATED: handlePlaidSuccess - Plaid integration removed in 2026');
  return proceedToDashboard('Enter transactions directly in your ACCOUNT sheets.');
}

/**
 * @deprecated Plaid integration removed in 2026
 */
function handlePlaidExit(err, metadata) {
  Logger.log('⚠️ DEPRECATED: handlePlaidExit - Plaid integration removed in 2026');
  return proceedToDashboard();
}

function proceedToDashboard(message) {
  try {
    var props = MM_getProps_();
    props.setProperty('mm_needs_bank_setup', 'false');
    if (message) {
      SpreadsheetApp.getActiveSpreadsheet().toast(message, 'Money Mastery', 5);
    }
  } catch (e) {
    Logger.log('proceedToDashboard toast error: ' + e.message);
  }

  // 2026 Update: Plaid auto-sync removed. 
  // Manual transaction entry only - no bank sync.

  try {
    MM_showDashboard();
  } catch (dashboardError) {
    Logger.log('MM_showDashboard failed inside proceedToDashboard: ' + dashboardError.message);
  }

  return { success: true };
}

/**
 * @deprecated Plaid integration removed in 2026
 */
function MM_exchangePlaidPublicToken_(publicToken) {
  Logger.log('⚠️ DEPRECATED: MM_exchangePlaidPublicToken_ - Plaid integration removed in 2026');
  throw new Error('Bank sync disabled. Use manual transaction entry.');
}

/**
 * @deprecated Plaid integration removed in 2026
 */
function MM_fetchPlaidTransactions_(accessToken) {
  Logger.log('⚠️ DEPRECATED: MM_fetchPlaidTransactions_ - Plaid integration removed in 2026');
  return [];
}

// NOTE: MM_validatePin, lockAccountAndNotify, and MM_resetPinAttempts_ 
// are defined in Auth_Core.gs - DO NOT duplicate here to avoid conflicts

// ═══════════════════════════════════════════════════════════════════
// GUEST REGISTRATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Guest user type options
 */
var GUEST_USER_TYPES = [
  'Business Professional',
  'Family Member',
  'Individual',
  'Student',
  'Accountant/Bookkeeper',
  'Other'
];

/**
 * Guest consent (mandatory)
 */
var GUEST_OPT_INS = [
  { id: 'consent', label: 'I agree to receive emails about Money Mastery promotions, updates, and tips. I also agree to the Terms of Service and Privacy Policy.', required: true }
];

/**
 * Show Guest Login Prompt (for guests with temp PIN)
 */
function MM_showGuestLoginPrompt() {
  var email = Session.getActiveUser().getEmail();
  
  var html = HtmlService.createHtmlOutput(_createGuestLoginHTML_(email))
    .setWidth(480)
    .setHeight(500);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Guest Login');
}

/**
 * Create Guest Login HTML (temp PIN entry)
 */
function _createGuestLoginHTML_(email) {
  return '<!DOCTYPE html>' +
    '<html>' +
    '<head>' +
    '<base target="_top">' +
    '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet">' +
    '<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">' +
    '<style>' +
    '* { box-sizing: border-box; margin: 0; padding: 0; }' +
    'body { font-family: "Montserrat", sans-serif; background: linear-gradient(135deg, #f5f5f0 0%, #e8e4dc 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }' +
    '.gate-container { background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(154, 131, 104, 0.15); padding: 40px; max-width: 420px; width: 100%; }' +
    '.gate-header { text-align: center; margin-bottom: 30px; }' +
    '.gate-icon { width: 70px; height: 70px; background: linear-gradient(135deg, #9a8368 0%, #456a73 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }' +
    '.gate-icon i { font-size: 32px; color: white; }' +
    'h1 { font-family: "Playfair Display", Georgia, serif; color: #1a1a1a; font-size: 26px; font-weight: 600; margin-bottom: 8px; }' +
    '.subtitle { color: #666; font-size: 14px; }' +
    '.email-display { background: #f8f6f3; border: 1px solid #e8e4df; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: center; gap: 12px; }' +
    '.email-display i { color: #9a8368; font-size: 16px; }' +
    '.email-display span { color: #333; font-weight: 500; font-size: 14px; }' +
    '.form-group { margin-bottom: 20px; }' +
    'label { display: block; color: #555; font-size: 12px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }' +
    'input[type="password"] { width: 100%; padding: 16px; border: 2px solid #e8e4df; border-radius: 10px; font-size: 28px; letter-spacing: 14px; text-align: center; transition: all 0.2s; font-family: "Montserrat", sans-serif; }' +
    'input:focus { outline: none; border-color: #9a8368; box-shadow: 0 0 0 4px rgba(154, 131, 104, 0.1); }' +
    '.btn { width: 100%; padding: 16px 24px; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; margin-bottom: 10px; font-family: "Montserrat", sans-serif; display: flex; align-items: center; justify-content: center; gap: 10px; }' +
    '.btn-primary { background: linear-gradient(135deg, #9a8368 0%, #7d6b55 100%); color: white; }' +
    '.btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(154, 131, 104, 0.35); }' +
    '.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }' +
    '.info-box { background: linear-gradient(135deg, #e6f4f1 0%, #d4ece7 100%); border: 1px solid #456a73; color: #2d4a4f; padding: 14px 16px; border-radius: 10px; margin-bottom: 20px; font-size: 13px; line-height: 1.5; }' +
    '.info-box i { margin-right: 8px; color: #456a73; }' +
    '.error-message { background: #fff5f5; border: 1px solid #feb2b2; color: #c53030; padding: 14px 16px; border-radius: 10px; margin-bottom: 16px; font-size: 13px; display: none; }' +
    
    '/* Loading Screen */' +
    '.loading-screen { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, #f5f5f0 0%, #e8e4dc 100%); z-index: 1000; flex-direction: column; align-items: center; justify-content: center; }' +
    '.loading-screen.active { display: flex; }' +
    '.loading-logo { font-family: "Playfair Display", Georgia, serif; font-size: 28px; font-weight: 700; color: #9a8368; margin-bottom: 40px; }' +
    '.loading-spinner { width: 60px; height: 60px; border: 4px solid #e8e4df; border-top: 4px solid #9a8368; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 30px; }' +
    '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }' +
    '.loading-text { font-size: 18px; font-weight: 500; color: #666; margin-bottom: 10px; }' +
    '.loading-subtext { font-size: 14px; color: #888; max-width: 280px; text-align: center; line-height: 1.5; }' +
    '.loading-progress { width: 200px; height: 4px; background: #e8e4df; border-radius: 2px; margin-top: 25px; overflow: hidden; }' +
    '.loading-progress-bar { height: 100%; background: linear-gradient(90deg, #9a8368, #456a73); border-radius: 2px; animation: progress 2s ease-in-out infinite; }' +
    '@keyframes progress { 0%, 100% { width: 30%; margin-left: 0; } 50% { width: 60%; margin-left: 40%; } }' +
    
    '/* Button spinner */' +
    '.btn-spinner { display: none; width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 0.8s linear infinite; }' +
    '.btn.loading .btn-spinner { display: block; }' +
    '.btn.loading .btn-text { display: none; }' +
    '</style>' +
    '</head>' +
    '<body>' +
    
    '<!-- Main Login Card -->' +
    '<div class="gate-container" id="loginCard">' +
    '<div class="gate-header">' +
    '<div class="gate-icon"><i class="fas fa-user-friends"></i></div>' +
    '<h1>Guest Access</h1>' +
    '<p class="subtitle">Enter your temporary PIN to continue</p>' +
    '</div>' +
    
    '<div class="email-display">' +
    '<i class="fas fa-envelope"></i>' +
    '<span>' + email + '</span>' +
    '</div>' +
    
    '<div class="info-box">' +
    '<i class="fas fa-info-circle"></i> Your temporary PIN was provided by the account owner. After verification, you\'ll create your own permanent account.' +
    '</div>' +
    
    '<div id="errorMsg" class="error-message"></div>' +
    
    '<div class="form-group">' +
    '<label><i class="fas fa-key"></i> Temporary PIN</label>' +
    '<input type="password" id="tempPin" maxlength="4" placeholder="• • • •" inputmode="numeric" autofocus>' +
    '</div>' +
    
    '<button class="btn btn-primary" onclick="verifyTempPin()" id="submitBtn">' +
    '<span class="btn-text"><i class="fas fa-arrow-right"></i> Continue</span>' +
    '<div class="btn-spinner"></div>' +
    '</button>' +
    '</div>' +
    
    '<!-- Loading Screen -->' +
    '<div class="loading-screen" id="loadingScreen">' +
    '<div class="loading-logo">Money Mastery</div>' +
    '<div class="loading-spinner"></div>' +
    '<div class="loading-text" id="loadingText">Verifying your PIN...</div>' +
    '<div class="loading-subtext" id="loadingSubtext">Please wait while we confirm your guest access</div>' +
    '<div class="loading-progress"><div class="loading-progress-bar"></div></div>' +
    '</div>' +
    
    '<script>\n' +
    'var userEmail = "' + email + '";\n' +
    'var submitBtn = document.getElementById("submitBtn");\n' +
    'var loginCard = document.getElementById("loginCard");\n' +
    'var loadingScreen = document.getElementById("loadingScreen");\n' +
    '\n' +
    'function showError(msg) {\n' +
    '  document.getElementById("errorMsg").textContent = msg;\n' +
    '  document.getElementById("errorMsg").style.display = "block";\n' +
    '  submitBtn.classList.remove("loading");\n' +
    '  submitBtn.disabled = false;\n' +
    '}\n' +
    '\n' +
    'function hideError() {\n' +
    '  document.getElementById("errorMsg").style.display = "none";\n' +
    '}\n' +
    '\n' +
    'function showLoading() {\n' +
    '  loginCard.style.display = "none";\n' +
    '  loadingScreen.classList.add("active");\n' +
    '}\n' +
    '\n' +
    'function hideLoading() {\n' +
    '  loadingScreen.classList.remove("active");\n' +
    '  loginCard.style.display = "block";\n' +
    '}\n' +
    '\n' +
    'function updateLoadingText(title, subtitle) {\n' +
    '  document.getElementById("loadingText").textContent = title;\n' +
    '  document.getElementById("loadingSubtext").textContent = subtitle;\n' +
    '}\n' +
    '\n' +
    'function verifyTempPin() {\n' +
    '  hideError();\n' +
    '  var pin = document.getElementById("tempPin").value;\n' +
    '  if (!pin || pin.length !== 4) {\n' +
    '    showError("Please enter your 4-digit temporary PIN");\n' +
    '    return;\n' +
    '  }\n' +
    '  \n' +
    '  // Show button loading state\n' +
    '  submitBtn.classList.add("loading");\n' +
    '  submitBtn.disabled = true;\n' +
    '  \n' +
    '  google.script.run\n' +
    '    .withSuccessHandler(function(result) {\n' +
    '      if (result.success) {\n' +
    '        // Show full loading screen\n' +
    '        showLoading();\n' +
    '        updateLoadingText("PIN Verified!", "Setting up your account...");\n' +
    '        \n' +
    '        // Brief delay then open registration\n' +
    '        setTimeout(function() {\n' +
    '          updateLoadingText("Almost there...", "Opening your registration form");\n' +
    '          setTimeout(function() {\n' +
    '            google.script.host.close();\n' +
    '            google.script.run.MM_showGuestFullRegistration(userEmail);\n' +
    '          }, 800);\n' +
    '        }, 1200);\n' +
    '      } else {\n' +
    '        showError(result.message);\n' +
    '      }\n' +
    '    })\n' +
    '    .withFailureHandler(function(err) {\n' +
    '      showError("Error: " + err.message);\n' +
    '    })\n' +
    '    .MM_verifyGuestTempPin(userEmail, pin);\n' +
    '}\n' +
    '\n' +
    'document.getElementById("tempPin").addEventListener("keypress", function(e) {\n' +
    '  if (e.key === "Enter") verifyTempPin();\n' +
    '});\n' +
    '</script>' +
    '</body>' +
    '</html>';
}

/**
 * Verify guest temporary PIN
 */
function MM_verifyGuestTempPin(email, tempPin) {
  try {
    var normalizedEmail = MM_normEmail_(email);
    var props = MM_getProps_();
    
    var guestsJson = props.getProperty('mm_guests_json');
    if (!guestsJson) {
      return { success: false, message: 'No guest accounts found. Please contact the account owner.' };
    }
    
    var guests = JSON.parse(guestsJson);
    for (var i = 0; i < guests.length; i++) {
      if (MM_normEmail_(guests[i].email) === normalizedEmail) {
        if (guests[i].tempPin === tempPin) {
          Logger.log('✅ Guest temp PIN verified: ' + normalizedEmail);
          return { success: true, message: 'PIN verified!' };
        } else {
          return { success: false, message: 'Incorrect temporary PIN' };
        }
      }
    }
    
    return { success: false, message: 'Your email is not registered as a guest. Please contact the account owner.' };
  } catch (e) {
    Logger.log('MM_verifyGuestTempPin error: ' + e.message);
    return { success: false, message: 'Verification error: ' + e.message };
  }
}

/**
 * Show full guest registration form (after temp PIN verified)
 */
function MM_showGuestFullRegistration(email) {
  var userTypesJson = JSON.stringify(GUEST_USER_TYPES);
  var optInsJson = JSON.stringify(GUEST_OPT_INS);
  
  var html = HtmlService.createHtmlOutput(_createGuestFullRegistrationHTML_(email, userTypesJson, optInsJson))
    .setWidth(520)
    .setHeight(750);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Complete Your Registration');
}

/**
 * Create Guest Full Registration HTML
 */
function _createGuestFullRegistrationHTML_(email, userTypesJson, optInsJson) {
  return '<!DOCTYPE html>' +
    '<html>' +
    '<head>' +
    '<base target="_top">' +
    '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet">' +
    '<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">' +
    '<style>' +
    '* { box-sizing: border-box; margin: 0; padding: 0; }' +
    'body { font-family: "Montserrat", sans-serif; background: linear-gradient(135deg, #f5f5f0 0%, #e8e4dc 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }' +
    '.gate-container { background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(154, 131, 104, 0.15); padding: 35px; max-width: 480px; width: 100%; max-height: 90vh; overflow-y: auto; }' +
    '.gate-header { text-align: center; margin-bottom: 25px; }' +
    '.gate-icon { width: 65px; height: 65px; background: linear-gradient(135deg, #9a8368 0%, #456a73 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px; }' +
    '.gate-icon i { font-size: 28px; color: white; }' +
    'h1 { font-family: "Playfair Display", Georgia, serif; color: #1a1a1a; font-size: 24px; font-weight: 600; margin-bottom: 6px; }' +
    '.subtitle { color: #666; font-size: 13px; }' +
    '.form-group { margin-bottom: 16px; }' +
    'label { display: block; color: #555; font-size: 12px; font-weight: 600; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px; }' +
    'input[type="text"], input[type="password"], select { width: 100%; padding: 12px 14px; border: 2px solid #e8e4df; border-radius: 10px; font-size: 14px; transition: all 0.2s; font-family: "Montserrat", sans-serif; }' +
    'input:focus, select:focus { outline: none; border-color: #9a8368; box-shadow: 0 0 0 4px rgba(154, 131, 104, 0.1); }' +
    '.pin-input { font-size: 20px; letter-spacing: 10px; text-align: center; }' +
    '.section-title { font-size: 12px; font-weight: 600; color: #9a8368; margin: 22px 0 12px; padding-bottom: 8px; border-bottom: 1px solid #e8e4df; text-transform: uppercase; letter-spacing: 0.5px; }' +
    
    '/* Loading Screen */' +
    '.loading-screen { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, #f5f5f0 0%, #e8e4dc 100%); z-index: 1000; flex-direction: column; align-items: center; justify-content: center; }' +
    '.loading-screen.active { display: flex; }' +
    '.loading-logo { font-family: "Playfair Display", Georgia, serif; font-size: 28px; font-weight: 700; color: #9a8368; margin-bottom: 40px; }' +
    '.loading-spinner { width: 60px; height: 60px; border: 4px solid #e8e4df; border-top: 4px solid #9a8368; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 30px; }' +
    '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }' +
    '.loading-text { font-size: 18px; font-weight: 500; color: #666; margin-bottom: 10px; }' +
    '.loading-subtext { font-size: 14px; color: #888; max-width: 280px; text-align: center; line-height: 1.5; }' +
    '.loading-progress { width: 200px; height: 4px; background: #e8e4df; border-radius: 2px; margin-top: 25px; overflow: hidden; }' +
    '.loading-progress-bar { height: 100%; background: linear-gradient(90deg, #9a8368, #456a73); border-radius: 2px; animation: progress 2s ease-in-out infinite; }' +
    '@keyframes progress { 0%, 100% { width: 30%; margin-left: 0; } 50% { width: 60%; margin-left: 40%; } }' +
    
    '/* Success checkmark */' +
    '.success-check { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #48bb78, #38a169); display: flex; align-items: center; justify-content: center; margin-bottom: 25px; animation: scaleIn 0.5s ease; }' +
    '.success-check i { font-size: 40px; color: white; }' +
    '@keyframes scaleIn { 0% { transform: scale(0); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }' +
    
    '/* Button spinner */' +
    '.btn-spinner { display: none; width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 0.8s linear infinite; }' +
    '.btn.loading .btn-spinner { display: inline-block; margin-right: 8px; }' +
    '.btn.loading .btn-text { opacity: 0.8; }' +
    '.checkbox-group { margin-bottom: 12px; }' +
    '.checkbox-group label { display: flex; align-items: flex-start; gap: 12px; cursor: pointer; font-weight: 400; font-size: 13px; line-height: 1.5; color: #555; }' +
    '.checkbox-group input[type="checkbox"] { width: 20px; height: 20px; min-width: 20px; margin-top: 2px; accent-color: #9a8368; cursor: pointer; }' +
    '.btn { width: 100%; padding: 16px 24px; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; margin-top: 18px; font-family: "Montserrat", sans-serif; display: flex; align-items: center; justify-content: center; }' +
    '.btn-primary { background: linear-gradient(135deg, #9a8368 0%, #7d6b55 100%); color: white; }' +
    '.btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(154, 131, 104, 0.35); }' +
    '.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }' +
    '.error-message { background: #fff5f5; border: 1px solid #feb2b2; color: #c53030; padding: 12px 14px; border-radius: 10px; margin-bottom: 14px; font-size: 13px; display: none; }' +
    '.success-message { background: #f0fff4; border: 1px solid #9ae6b4; color: #276749; padding: 12px 14px; border-radius: 10px; margin-bottom: 14px; font-size: 13px; display: none; }' +
    '</style>' +
    '</head>' +
    '<body>' +
    
    '<!-- Main Form -->' +
    '<div class="gate-container" id="formContainer">' +
    '<div class="gate-header">' +
    '<div class="gate-icon"><i class="fas fa-user-check"></i></div>' +
    '<h1>Complete Your Profile</h1>' +
    '<p class="subtitle">Create your permanent guest account</p>' +
    '</div>' +
    
    '<div id="errorMsg" class="error-message"></div>' +
    '<div id="successMsg" class="success-message"></div>' +
    
    '<div class="form-group">' +
    '<label><i class="fas fa-user"></i> First Name</label>' +
    '<input type="text" id="firstName" placeholder="Enter your first name">' +
    '</div>' +
    
    '<div class="form-group">' +
    '<label><i class="fas fa-user"></i> Last Name</label>' +
    '<input type="text" id="lastName" placeholder="Enter your last name">' +
    '</div>' +
    
    '<div class="section-title"><i class="fas fa-lock"></i> Create Your PIN</div>' +
    
    '<div class="form-group">' +
    '<label>New PIN (4-6 digits)</label>' +
    '<input type="password" id="pin1" class="pin-input" maxlength="6" placeholder="------" inputmode="numeric">' +
    '</div>' +
    
    '<div class="form-group">' +
    '<label>Confirm PIN</label>' +
    '<input type="password" id="pin2" class="pin-input" maxlength="6" placeholder="------" inputmode="numeric">' +
    '</div>' +
    
    '<div class="section-title"><i class="fas fa-briefcase"></i> About You</div>' +
    
    '<div class="form-group">' +
    '<label>I am a...</label>' +
    '<select id="userType">' +
    '<option value="">Select your type</option>' +
    '</select>' +
    '</div>' +
    
    '<div class="section-title"><i class="fas fa-file-contract"></i> Terms & Consent</div>' +
    
    '<div id="optInsContainer"></div>' +
    
    '<button class="btn btn-primary" onclick="completeRegistration()" id="submitBtn">' +
    '<div class="btn-spinner"></div>' +
    '<span class="btn-text"><i class="fas fa-check-circle"></i> Complete Registration</span>' +
    '</button>' +
    '</div>' +
    
    '<!-- Loading Screen -->' +
    '<div class="loading-screen" id="loadingScreen">' +
    '<div class="loading-logo">Money Mastery</div>' +
    '<div id="loadingIcon"><div class="loading-spinner"></div></div>' +
    '<div class="loading-text" id="loadingText">Creating your account...</div>' +
    '<div class="loading-subtext" id="loadingSubtext">This will only take a moment</div>' +
    '<div class="loading-progress"><div class="loading-progress-bar"></div></div>' +
    '</div>' +
    
    '<script>\n' +
    'var userEmail = "' + email + '";\n' +
    'var userTypes = ' + userTypesJson + ';\n' +
    'var optIns = ' + optInsJson + ';\n' +
    'var formContainer = document.getElementById("formContainer");\n' +
    'var loadingScreen = document.getElementById("loadingScreen");\n' +
    'var submitBtn = document.getElementById("submitBtn");\n' +
    '\n' +
    '// Populate user types on page load\n' +
    '(function() {\n' +
    '  var select = document.getElementById("userType");\n' +
    '  if (select && userTypes && userTypes.length > 0) {\n' +
    '    userTypes.forEach(function(type) {\n' +
    '      var opt = document.createElement("option");\n' +
    '      opt.value = type;\n' +
    '      opt.textContent = type;\n' +
    '      select.appendChild(opt);\n' +
    '    });\n' +
    '  }\n' +
    '\n' +
    '  // Populate consent checkbox (mandatory, not pre-checked)\n' +
    '  var container = document.getElementById("optInsContainer");\n' +
    '  if (container && optIns && optIns.length > 0) {\n' +
    '    optIns.forEach(function(item) {\n' +
    '      var div = document.createElement("div");\n' +
    '      div.className = "checkbox-group";\n' +
    '      var requiredStar = item.required ? " <span style=\\"color:#c53030\\">*</span>" : "";\n' +
    '      div.innerHTML = \'<label style="line-height:1.5"><input type="checkbox" id="\' + item.id + \'"> \' + item.label + requiredStar + \'</label>\';\n' +
    '      container.appendChild(div);\n' +
    '    });\n' +
    '  }\n' +
    '})();\n' +
    
    'function showError(msg) {\n' +
    '  document.getElementById("errorMsg").textContent = msg;\n' +
    '  document.getElementById("errorMsg").style.display = "block";\n' +
    '  document.getElementById("successMsg").style.display = "none";\n' +
    '  submitBtn.classList.remove("loading");\n' +
    '  submitBtn.disabled = false;\n' +
    '}\n' +
    '\n' +
    'function showSuccess(msg) {\n' +
    '  document.getElementById("successMsg").textContent = msg;\n' +
    '  document.getElementById("successMsg").style.display = "block";\n' +
    '  document.getElementById("errorMsg").style.display = "none";\n' +
    '}\n' +
    '\n' +
    'function showLoading(title, subtitle) {\n' +
    '  formContainer.style.display = "none";\n' +
    '  loadingScreen.classList.add("active");\n' +
    '  document.getElementById("loadingText").textContent = title || "Creating your account...";\n' +
    '  document.getElementById("loadingSubtext").textContent = subtitle || "This will only take a moment";\n' +
    '}\n' +
    '\n' +
    'function showSuccessScreen() {\n' +
    '  document.getElementById("loadingIcon").innerHTML = \'<div class="success-check"><i class="fas fa-check"></i></div>\';\n' +
    '  document.getElementById("loadingText").textContent = "Welcome to Money Mastery!";\n' +
    '  document.getElementById("loadingSubtext").textContent = "Your guest account is ready. Opening your dashboard...";\n' +
    '  document.querySelector(".loading-progress").style.display = "none";\n' +
    '}\n' +
    '\n' +
    'function completeRegistration() {\n' +
    '  var firstName = document.getElementById("firstName").value.trim();\n' +
    '  var lastName = document.getElementById("lastName").value.trim();\n' +
    '  var pin1 = document.getElementById("pin1").value;\n' +
    '  var pin2 = document.getElementById("pin2").value;\n' +
    '  var userType = document.getElementById("userType").value;\n' +
    '\n' +
    '  if (!firstName) { showError("Please enter your first name"); return; }\n' +
    '  if (!lastName) { showError("Please enter your last name"); return; }\n' +
    '  if (!pin1 || pin1.length < 4) { showError("PIN must be at least 4 digits"); return; }\n' +
    '  if (!/^\\d{4,6}$/.test(pin1)) { showError("PIN must contain only numbers"); return; }\n' +
    '  if (pin1 !== pin2) { showError("PINs do not match"); return; }\n' +
    '  if (!userType) { showError("Please select your user type"); return; }\n' +
    '\n' +
    '  // Check mandatory consent\n' +
    '  var consentBox = document.getElementById("consent");\n' +
    '  if (!consentBox || !consentBox.checked) {\n' +
    '    showError("You must agree to the Terms & Consent to continue");\n' +
    '    return;\n' +
    '  }\n' +
    '\n' +
    '  // Show button loading\n' +
    '  submitBtn.classList.add("loading");\n' +
    '  submitBtn.disabled = true;\n' +
    '\n' +
    '  var selectedOptIns = ["consent"];\n' +
    '\n' +
    '  google.script.run\n' +
    '    .withSuccessHandler(function(result) {\n' +
    '      if (result.success) {\n' +
    '        // Show full loading screen\n' +
    '        showLoading("Finishing up...", "Sending your welcome email...");\n' +
    '        \n' +
    '        setTimeout(function() {\n' +
    '          showSuccessScreen();\n' +
    '          \n' +
    '          setTimeout(function() {\n' +
    '            google.script.host.close();\n' +
    '            google.script.run.MM_showDashboard();\n' +
    '          }, 2000);\n' +
    '        }, 1500);\n' +
    '      } else {\n' +
    '        showError(result.message);\n' +
    '      }\n' +
    '    })\n' +
    '    .withFailureHandler(function(err) {\n' +
    '      showError("Error: " + err.message);\n' +
    '    })\n' +
    '    .MM_completeGuestRegistration(userEmail, firstName, lastName, pin1, userType, selectedOptIns);\n' +
    '}\n' +
    '</script>' +
    '</body>' +
    '</html>';
}

/**
 * Complete guest registration
 */
function MM_completeGuestRegistration(email, firstName, lastName, pin, userType, optIns) {
  try {
    var normalizedEmail = MM_normEmail_(email);
    var props = MM_getProps_();
    
    // Create PIN hash
    var pinHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pin + normalizedEmail);
    var pinHashString = pinHash.map(function(byte) {
      return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
    
    // Store PIN securely
    _mm_storeUserPinHash_(normalizedEmail, pinHashString);
    _mm_markUserRegistered_(normalizedEmail);
    
    var userProps = _mm_safeUserProps_();
    if (userProps) {
      userProps.setProperty(_mm_userPropKey_(normalizedEmail, 'pin_attempts'), '0');
      userProps.deleteProperty(_mm_userPropKey_(normalizedEmail, 'pin_locked'));
      userProps.setProperty(_mm_userPropKey_(normalizedEmail, 'role'), 'guest');
      userProps.setProperty(_mm_userPropKey_(normalizedEmail, 'first_name'), firstName);
      userProps.setProperty(_mm_userPropKey_(normalizedEmail, 'last_name'), lastName);
    }
    
    // Update guest record
    var guestsJson = props.getProperty('mm_guests_json');
    if (guestsJson) {
      var guests = JSON.parse(guestsJson);
      for (var i = 0; i < guests.length; i++) {
        if (MM_normEmail_(guests[i].email) === normalizedEmail) {
          guests[i].firstName = firstName;
          guests[i].lastName = lastName;
          guests[i].userType = userType;
          guests[i].optIns = optIns;
          guests[i].registered = true;
          guests[i].registeredAt = new Date().toISOString();
          delete guests[i].tempPin; // Remove temp PIN
          break;
        }
      }
      props.setProperty('mm_guests_json', JSON.stringify(guests));
    }
    
    // Store in Script Properties for MFA (using safe wrapper)
    try {
      var scriptProps = PropertiesService.getScriptProperties();
      scriptProps.setProperty('mm_user_' + normalizedEmail, JSON.stringify({
        email: normalizedEmail,
        firstName: firstName,
        lastName: lastName,
        userType: userType,
        optIns: optIns,
        role: 'guest',
        createdAt: new Date().toISOString()
      }));
    } catch (e) {
      Logger.log('Could not store guest data in script props: ' + e.message);
    }
    
    Logger.log('✅ Guest registration complete: ' + normalizedEmail);
    
    // Send welcome email to guest
    try {
      if (typeof sendGuestWelcomeEmail === 'function') {
        var emailResult = sendGuestWelcomeEmail(normalizedEmail, firstName);
        if (emailResult && emailResult.success) {
          Logger.log('✅ Guest welcome email sent to: ' + normalizedEmail);
        } else {
          Logger.log('⚠️ Guest welcome email failed: ' + (emailResult ? emailResult.error : 'Unknown'));
        }
      } else {
        Logger.log('⚠️ sendGuestWelcomeEmail function not available');
      }
    } catch (emailError) {
      Logger.log('⚠️ Guest welcome email error: ' + emailError.message);
      // Don't fail registration if email fails
    }
    
    return { success: true, message: 'Registration complete!' };
  } catch (e) {
    Logger.log('MM_completeGuestRegistration error: ' + e.message);
    return { success: false, message: 'Registration error: ' + e.message };
  }
}

/**
 * Show guest registration flow (called from main auth)
 */
function MM_showGuestRegistration_(email, guestData) {
  if (guestData.tempPin && !guestData.registered) {
    MM_showGuestLoginPrompt();
  } else {
    MM_showGuestFullRegistration(email);
  }
}

function MM_apiRegisterPrimary(email, pin, accessKey, firstName, lastName) {
  return MM_registerWithAccessKey(
    email,
    pin,
    accessKey || '',
    firstName || 'Primary',
    lastName || 'User'
  );
}

function MM_apiLogin(email, pin) {
  return MM_validatePin(pin, email);
}

// NOTE: validateUserPin is defined in Auth_Core.gs - DO NOT duplicate here

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD DATA COMPUTATION (PUBLIC API)
// ═══════════════════════════════════════════════════════════════════

/**
 * ✅ PUBLIC API: Compute dashboard data
 * Called directly from DashboardHTML.html
 */
function MM_computeDashboardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    // Find most recent transaction date
    const mostRecentDate = MM_findMostRecentTransactionDate_(ss);
    const cutoffDate = new Date(mostRecentDate.getTime() - (30 * 24 * 60 * 60 * 1000)); // 30 days ago
    
    Logger.log('Dashboard: Most recent date: ' + mostRecentDate.toDateString());
    Logger.log('Dashboard: Cutoff date: ' + cutoffDate.toDateString());
    
    // ✅ Read from INCOME TRANSACTIONS and EXPENSES TRANSACTIONS
    const incomeResult = MM_readTransactionSheetMonthly_(ss, MM_CFG.DASH_SHEETS.INCOME, cutoffDate);
    const expenseResult = MM_readTransactionSheetMonthly_(ss, MM_CFG.DASH_SHEETS.EXPENSE, cutoffDate);
    
    // Calculate metrics
    const monthlyIncome = incomeResult.totalAmount;
    const monthlyExpenses = expenseResult.totalAmount;
    const monthlyProfit = monthlyIncome - monthlyExpenses;
    
    // Error counts
    const totalErrors = incomeResult.errorCount + expenseResult.errorCount;
    const unlabeledCount = incomeResult.unlabeledCount + expenseResult.unlabeledCount;
    
    // ✅ NEW: Needs vs Desires totals
    const needsTotal = expenseResult.needsTotal || 0;
    const desiresTotal = expenseResult.desiresTotal || 0;
    
    // Goals
    const goals = MM_getGoalsFromDashboard_(ss);
    
    // Learning statistics
    const learningStats = typeof getLearningStatistics === 'function' 
      ? getLearningStatistics() 
      : { total: 0 };
    
    return {
      monthlyIncome: monthlyIncome,
      monthlyExpenses: monthlyExpenses,
      monthlyProfit: monthlyProfit,
      totalErrors: totalErrors,
      unlabeledCount: unlabeledCount,
      needsTotal: needsTotal,
      desiresTotal: desiresTotal,
      goals: goals,
      learningRules: learningStats.total || 0,
      incomeCategories: incomeResult.categories || [],
      expenseCategories: expenseResult.categories || [],
      dateRange: {
        from: cutoffDate.toLocaleDateString(),
        to: mostRecentDate.toLocaleDateString()
      }
    };
  } catch (error) {
    Logger.log('MM_computeDashboardData ERROR: ' + error.message);
    
    // Return safe defaults
    return {
      monthlyIncome: 0,
      monthlyExpenses: 0,
      monthlyProfit: 0,
      totalErrors: 0,
      unlabeledCount: 0,
      needsTotal: 0,
      desiresTotal: 0,
      goals: [],
      learningRules: 0,
      incomeCategories: [],
      expenseCategories: [],
      dateRange: { from: 'N/A', to: 'N/A' }
    };
  }
}

/**
 * ✅ FIXED: Read transaction sheet with correct column offsets for INCOME/EXPENSE TRANSACTIONS
 * REMOVED overly strict validations that were causing false errors
 */
function MM_readTransactionSheetMonthly_(ss, sheetName, cutoffDate) {
  try {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      Logger.log('Sheet not found: ' + sheetName);
      return {
        totalAmount: 0,
        errorCount: 0,
        unlabeledCount: 0,
        needsTotal: 0,
        desiresTotal: 0,
        categories: []
      };
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 15) {
      Logger.log('Sheet ' + sheetName + ' has no data (lastRow: ' + lastRow + ')');
      return {
        totalAmount: 0,
        errorCount: 0,
        unlabeledCount: 0,
        needsTotal: 0,
        desiresTotal: 0,
        categories: []
      };
    }
    
    // ✅ FIXED: Start from row 15, read 9 columns (C-K)
    // C=Account, D=Date, E=Description, F=Amount, G=Personal, H=Business, I=Memo, J=Need/Desire, K=MainCat
    const data = sheet.getRange(15, 3, lastRow - 14, 9).getValues();
    const displayData = sheet.getRange(15, 3, lastRow - 14, 9).getDisplayValues();
    
    let totalAmount = 0;
    let businessTotal = 0;
    let errorCount = 0;
    let unlabeledCount = 0;
    let needsTotal = 0;
    let desiresTotal = 0;
    const categoryMap = {};
    
    Logger.log('Processing ' + data.length + ' rows from ' + sheetName);
    
    for (let i = 0; i < data.length; i++) {
      // Column indices: 0=Account, 1=Date, 2=Description, 3=Amount, 4=Personal, 5=Business, 6=Memo, 7=NeedDesire, 8=MainCat
      const accountName = displayData[i][0];
      const date = MM_parseDate_(data[i][1]);
      const description = displayData[i][2];
      const amountRaw = data[i][3];
      const amountDisplay = displayData[i][3];
      const personalCat = displayData[i][4];
      const businessCat = displayData[i][5];
      const needDesire = displayData[i][7];
      
      // ✅ SIMPLIFIED: Skip only if NO date
      if (!date) {
        continue; // Don't count as error, just skip empty rows
      }
      
      // ✅ SIMPLIFIED: Skip if date before cutoff
      if (date < cutoffDate) {
        continue;
      }
      
      // ✅ SIMPLIFIED: Skip if NO description or description is literally "None"
      const descStr = String(description || '').trim();
      if (!descStr || descStr === '' || descStr.toUpperCase() === 'NONE') {
        continue; // Don't count as error, just skip empty rows
      }
      
      // ✅ Parse amount - count as ERROR only if we have date+description but amount fails
      const amount = MM_parseMoney_(amountRaw, amountDisplay);
      if (isNaN(amount) || amount === 0) {
        Logger.log('ERROR Row ' + (i + 15) + ': Date=' + date + ', Desc=' + description + ', Amount parsing failed: ' + amountRaw);
        errorCount++;
        continue;
      }
      
      // ✅ CHECK SPECIAL LABELS - Exclude from totals
      // Special labels: Ignore, Transfer, CC Payment (from ColumnConfig.gs MM_SPECIAL_LABELS)
      const businessCatStr = String(businessCat || '').trim();
      const isSpecialLabel = (typeof isSpecialLabel === 'function') 
        ? isSpecialLabel(businessCatStr)
        : ['Ignore', 'Transfer', 'CC Payment'].indexOf(businessCatStr) !== -1;
      
      if (isSpecialLabel) {
        // Skip special labeled transactions from all totals
        continue;
      }
      
      // ✅ SEGREGATE BUSINESS vs PERSONAL
      // If "Business Category" (Column H) is set, this is a Business Transaction.
      // Business transactions are EXCLUDED from the main dashboard totals.
      const isBusiness = businessCatStr !== '';
      
      if (isBusiness) {
        businessTotal += Math.abs(amount);
        // Track business category stats
        categoryMap[businessCatStr] = (categoryMap[businessCatStr] || 0) + Math.abs(amount);
      } else {
        // Personal Transaction
        totalAmount += Math.abs(amount);
        
        // Track Needs vs Desires (Personal Only)
        const needDesireStr = String(needDesire || '').trim().toLowerCase();
        if (needDesireStr.indexOf('need') > -1) {
          needsTotal += Math.abs(amount);
        } else if (needDesireStr.indexOf('desire') > -1) {
          desiresTotal += Math.abs(amount);
        }
        
        // Track personal category stats
        if (personalCat && String(personalCat).trim() !== '') {
          const cat = String(personalCat).trim();
          categoryMap[cat] = (categoryMap[cat] || 0) + Math.abs(amount);
        } else {
          unlabeledCount++;
        }
      }
    }
    
    Logger.log('Summary for ' + sheetName + ': Total=' + totalAmount + ', Errors=' + errorCount + ', Unlabeled=' + unlabeledCount);
    
    // Convert category map to sorted array
    const categories = Object.keys(categoryMap).map(function(cat) {
      return {
        category: cat,
        amount: categoryMap[cat]
      };
    }).sort(function(a, b) {
      return b.amount - a.amount;
    });
    
    return {
      totalAmount: totalAmount,
      businessTotal: businessTotal,
      errorCount: errorCount,
      unlabeledCount: unlabeledCount,
      needsTotal: needsTotal,
      desiresTotal: desiresTotal,
      categories: categories
    };
  } catch (error) {
    Logger.log('MM_readTransactionSheetMonthly_ error for ' + sheetName + ': ' + error.message);
    return {
      totalAmount: 0,
      errorCount: 0,
      unlabeledCount: 0,
      needsTotal: 0,
      desiresTotal: 0,
      categories: []
    };
  }
}

function MM_findMostRecentTransactionDate_(ss) {
  const sheets = ss.getSheets();
  let mostRecent = new Date(2020, 0, 1);
  
  for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i];
    const name = sheet.getName();
    
    // Check ACCOUNT tabs (not INCOME/EXPENSE TRANSACTIONS)
    if (name.indexOf('ACCOUNT') === -1 || name === 'ACCOUNT TEMPLATE') continue;
    
    try {
      const lastRow = sheet.getLastRow();
      if (lastRow < 11) continue;
      
      // Read dates from column C
      const dates = sheet.getRange(11, 3, lastRow - 10, 1).getValues();
      
      for (let j = 0; j < dates.length; j++) {
        const date = MM_parseDate_(dates[j][0]);
        if (date && date > mostRecent) {
          mostRecent = date;
        }
      }
    } catch (e) {
      Logger.log('Error reading dates from ' + name + ': ' + e.message);
    }
  }
  
  // Fallback to current date if no valid dates found
  if (mostRecent < new Date(2020, 0, 2)) {
    mostRecent = new Date();
  }
  
  return mostRecent;
}

function MM_getGoalsFromDashboard_(ss) {
  try {
    const dashSheet = ss.getSheetByName(MM_CFG.DASH_SHEETS.DASHBOARD);
    if (!dashSheet) return [];
    
    // Read rows 18-30, column B
    const goalData = dashSheet.getRange(18, 2, 13, 1).getDisplayValues();
    const goals = [];
    
    for (let i = 0; i < goalData.length; i++) {
      const value = String(goalData[i][0] || '').trim();
      if (value && value.length > 0 && !value.startsWith('=') && value !== 'Copyright') {
        goals.push(value);
      }
    }
    
    return goals.slice(0, 5); // Max 5 goals
  } catch (error) {
    Logger.log('MM_getGoalsFromDashboard_ ERROR: ' + error.message);
    return [];
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════
 * DASHBOARD DATA API - ACCURATE VERSION
 * ═══════════════════════════════════════════════════════════════════
 * 
 * DATA SOURCES (VERIFIED CORRECT):
 * ─────────────────────────────────────────────────────────────────
 * 
 * 1) DASHBOARD Sheet - GOALS:
 *    Goals (MERGED C:F):
 *      - C18:F18, C19:F19, ... C27:F27 (merged cells)
 *    Goal Status (CHECKBOXES):
 *      - B18:B27 (TRUE = completed, FALSE = not completed)
 * 
 * 2) INCOME TRANSACTIONS Sheet (starting row 15):
 *    - Column C: Account Name
 *    - Column D: Date
 *    - Column E: Description
 *    - Column F: Amount (positive OR negative - net calculated)
 *    - Column G: Subcategories (personal)
 *    - Column H: Business Categories
 *    - Column I: Memo
 *    - Column J: "Need" or "Desire"
 *    - Column K: Main Category (empty if using Business Category)
 * 
 * 3) EXPENSE TRANSACTIONS Sheet (starting row 15):
 *    - Column C: Account Name
 *    - Column D: Date
 *    - Column E: Description
 *    - Column F: Amount (positive OR negative - net calculated)
 *    - Column G: Subcategories (personal)
 *    - Column H: Business Categories
 *    - Column I: Memo
 *    - Column J: "Need" or "Desire"
 *    - Column K: Main Category (empty if using Business Category)
 * 
 * 4) ACCOUNT Sheets:
 *    - Cell C7: Account Name
 * 
 * ═══════════════════════════════════════════════════════════════════
 * CONFIGURATION - EASY TO EDIT
 * ═══════════════════════════════════════════════════════════════════
 */

const CONFIG = {
  DASHBOARD_YEAR: 2026,              // ← Change to 2025, 2026, etc.
  MONTHS_TO_INCLUDE: 13,             // ← How many months back to include
  CACHE_DURATION: 300,               // ← Cache duration in seconds (5 minutes)
  USE_CACHE: false,                  // ← Set to false to disable caching during testing
};
/**
 * ═══════════════════════════════════════════════════════════════════
 * DASHBOARD DATA API - NO CONFIG CONFLICT VERSION
 * ═══════════════════════════════════════════════════════════════════
 * 
 * This version does NOT declare a global CONFIG to avoid conflicts.
 * Configuration is defined inside the function.
 */

function MM_apiGetDashboardData(filter) {
  // ═══════════════════════════════════════════════════════════════════
  // CONFIGURATION - Edit these values
  // ═══════════════════════════════════════════════════════════════════
  const DASHBOARD_YEAR = 2026;        // ← Change to 2025, 2027, etc.
  const MONTHS_TO_INCLUDE = 13;       // ← How many months back
  const USE_CACHE = true;             // ← ENABLED for performance
  const CACHE_DURATION = 60;          // ← 1 minute cache (short for testing)
  const DEBUG_LOGGING = false;        // ← Set to true for detailed logs
  
  const startTime = new Date();
  Logger.log('🚀 MM_apiGetDashboardData START - Filter: ' + (filter || '30days'));
  
  // Debug logging helper - only logs when DEBUG_LOGGING is true
  const log = DEBUG_LOGGING ? console.log.bind(console) : function() {};
  
  // Check cache first (if enabled)
  if (USE_CACHE) {
    const cache = CacheService.getScriptCache();
    const cached = cache.get('dashboardData_' + (filter || '30days'));
    if (cached) {
      Logger.log('⚡ Returning CACHED dashboard data');
      return JSON.parse(cached);
    }
  }
  
  log('Computing FRESH data...');
  
  // Refresh Yearly Overview breakdown formulas when computing fresh data
  try {
    if (typeof refreshYearlyOverviewBreakdown === 'function') {
      refreshYearlyOverviewBreakdown();
    }
  } catch (refreshError) {
    Logger.log('Note: Could not refresh yearly overview: ' + refreshError.message);
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // ═══════════════════════════════════════════════════════════════════
  // 1. READ GOALS FROM SAVINGS SHEET (2026 Launch Version - no DASHBOARD sheet)
  // ═══════════════════════════════════════════════════════════════════
  log('[1] Reading Goals from SAVINGS sheet...');
  
  const dashboardSheet = ss.getSheetByName('SAVINGS');
  let goals = [];
  let goalsCompletion = [];
  
  if (dashboardSheet) {
    // Read B (status) and C (goal text) in ONE call for efficiency
    const goalsData = dashboardSheet.getRange('B18:C27').getValues();
    
    for (let i = 0; i < goalsData.length; i++) {
      const status = goalsData[i][0];
      const goalText = String(goalsData[i][1] || '').trim();
      
      // Only include non-empty, valid goals
      if (goalText && 
          goalText !== '' && 
          goalText.toLowerCase() !== 'goal' &&
          goalText.toLowerCase() !== 'false' &&
          !goalText.match(/^Goal \d+$/i)) {
        goals.push(goalText);
        goalsCompletion.push(status === true || status === 'TRUE');
      }
    }
    log('Goals found: ' + goals.length);
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // 2. DETECT ACCOUNT SHEETS
  // ═══════════════════════════════════════════════════════════════════
  log('\n[2] Detecting Account sheets...');
  const allSheets = ss.getSheets();
  const accounts = [];
  
  allSheets.forEach(sheet => {
    const sheetName = sheet.getName();
    if (sheetName.match(/^ACCOUNT \d+$/i)) {
      // Read custom account name from C7
      let accountName = '';
      try {
        accountName = sheet.getRange('C7').getValue();
        accountName = accountName ? String(accountName).trim() : '';
      } catch (e) {
        accountName = '';
      }
      
      // Use custom name if set, otherwise fallback to sheet name
      const displayName = accountName || sheetName;
      
      accounts.push({
        name: displayName,
        sheet: sheetName
      });
      log(`  ✓ ${sheetName}: "${displayName}"${accountName ? '' : ' (no custom name)'}`);
    }
  });
  log(`✓ Accounts found: ${accounts.length}`);
  
  // ═══════════════════════════════════════════════════════════════════
  // 3. READ ALL TRANSACTIONS FROM ACCOUNT SHEETS
  // Same format as Categorization Modal - Row 11+, Columns C-K
  // C=Date, D=Description, E=Amount, F=Personal Cat, G=Business Cat, 
  // H=Memo, I=Need/Desire, J=Main Category, K=Receipt
  // ═══════════════════════════════════════════════════════════════════
  log('\n[3] Reading transactions from ACCOUNT sheets...');
  log('  Data starts Row 11, Columns C-K');
  
  const DATA_START_ROW = 11;
  const incomeTransactions = [];
  const expenseTransactions = [];
  
  // Read from each detected ACCOUNT sheet
  accounts.forEach(account => {
    const sheet = ss.getSheetByName(account.sheet);
    if (!sheet) return;
    
    const lastRow = sheet.getLastRow();
    if (lastRow < DATA_START_ROW) return;
    
    const numRows = lastRow - DATA_START_ROW + 1;
    // Read columns C through K (columns 3-11, 9 columns)
    const data = sheet.getRange(DATA_START_ROW, 3, numRows, 9).getValues();
    
    for (let i = 0; i < data.length; i++) {
      const [date, description, amount, personalCat, businessCat, memo, needDesire, mainCat, receipt] = data[i];
      
      // Skip empty rows
      if (!date || amount === '' || amount === null || amount === undefined) continue;
      
      // Use MM_parseMoney_ to properly handle currency formatting ($, commas, parentheses)
      const numAmount = MM_parseMoney_(amount, amount);
      if (isNaN(numAmount) || numAmount === 0) continue;
      
      // Determine category (business > main > personal > Uncategorized)
      const category = String(businessCat || '').trim() !== '' 
        ? String(businessCat).trim() 
        : (String(mainCat || '').trim() !== '' 
          ? String(mainCat).trim() 
          : (String(personalCat || '').trim() !== '' 
            ? String(personalCat).trim() 
            : 'Uncategorized'));
      
      const transaction = {
        accountName: account.name,
        sheetName: account.sheet,
        date: new Date(date),
        description: String(description || '').trim(),
        amount: numAmount,
        personalCategory: String(personalCat || '').trim(),
        businessCategory: String(businessCat || '').trim(),
        memo: String(memo || '').trim(),
        needDesire: String(needDesire || '').trim(),
        mainCategory: String(mainCat || '').trim(),
        receipt: String(receipt || '').trim(),
        category: category
      };
      
      // Income = positive amounts, Expenses = negative amounts
      if (numAmount > 0) {
        incomeTransactions.push(transaction);
      } else {
        expenseTransactions.push(transaction);
      }
    }
    
    log(`  ✓ ${account.sheet} (${account.name}): Income=${incomeTransactions.length}, Expenses=${expenseTransactions.length}`);
  });
  
  log(`✓ Total Income transactions: ${incomeTransactions.length}`);
  log(`✓ Total Expense transactions: ${expenseTransactions.length}`);
  
  if (incomeTransactions.length > 0) {
    const totalInc = incomeTransactions.reduce((s, t) => s + t.amount, 0);
    log(`  Income total: $${totalInc.toFixed(2)}`);
  }
  if (expenseTransactions.length > 0) {
    const totalExp = expenseTransactions.reduce((s, t) => s + Math.abs(t.amount), 0);
    log(`  Expense total: $${totalExp.toFixed(2)}`);
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // 5. CALCULATE DATE RANGE BASED ON FILTER
  // ═══════════════════════════════════════════════════════════════════
  
  // Find the latest transaction date to use as reference (handles future-dated data)
  let latestDate = new Date(DASHBOARD_YEAR, 0, 1); // Default to Jan 1 of DASHBOARD_YEAR
  
  // Check income transactions for latest date
  incomeTransactions.forEach(t => {
    if (t.date && t.date > latestDate) latestDate = new Date(t.date);
  });
  
  // Check expense transactions for latest date
  expenseTransactions.forEach(t => {
    if (t.date && t.date > latestDate) latestDate = new Date(t.date);
  });
  
  // Use the latest transaction date as "now" for filtering purposes
  const now = latestDate;
  log('\n[5] Reference date (latest transaction): ' + now.toLocaleDateString());
  
  let endDate, startDate, cutoffDate;
  
  // Parse the filter parameter to determine date range
  filter = filter || '30days';
  
  switch (filter.toLowerCase()) {
    case '30days':
    case 'last30days':
      // Last 30 days from latest transaction
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      cutoffDate = new Date(endDate);
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      startDate = cutoffDate;
      break;
      
    case '12months':
    case 'last12months':
      // Last 12 months from latest transaction
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      cutoffDate = new Date(endDate);
      cutoffDate.setMonth(cutoffDate.getMonth() - 12);
      startDate = cutoffDate;
      break;
      
    case 'alltime':
    case 'all':
      // All time (use full year range)
      endDate = new Date(DASHBOARD_YEAR, 11, 31); // Dec 31
      startDate = new Date(DASHBOARD_YEAR - 5, 0, 1); // 5 years back
      cutoffDate = startDate;
      break;
      
    case 'ytd':
    case 'thisyear':
      // Year to date (DASHBOARD_YEAR)
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      cutoffDate = new Date(DASHBOARD_YEAR, 0, 1); // Jan 1 of DASHBOARD_YEAR
      startDate = cutoffDate;
      break;
      
    default:
      // Default: Last 30 days
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      cutoffDate = new Date(endDate);
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      startDate = cutoffDate;
  }
  
  log('[5] Date Range (Filter: ' + filter + '):');
  log(`  Start: ${startDate.toLocaleDateString()}`);
  log(`  End: ${endDate.toLocaleDateString()}`);
  
  // ═══════════════════════════════════════════════════════════════════
  // 6. FILTER TRANSACTIONS BY DATE & CALCULATE NET
  // ═══════════════════════════════════════════════════════════════════
  log('\n[6] Filtering and Calculating Net Amounts...');
  
  const filteredIncome = incomeTransactions.filter(t => t.date >= cutoffDate && t.date <= endDate);
  const filteredExpenses = expenseTransactions.filter(t => t.date >= cutoffDate && t.date <= endDate);
  
  log(`  Income transactions in range: ${filteredIncome.length}`);
  log(`  Expense transactions in range: ${filteredExpenses.length}`);
  
  // Calculate net amounts (sum all positive and negative)
  const totalIncomeNet = filteredIncome.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenseNet = filteredExpenses.reduce((sum, t) => sum + t.amount, 0);
  
  log(`  Income NET: $${totalIncomeNet.toFixed(2)}`);
  log(`  Expense NET: $${totalExpenseNet.toFixed(2)}`);
  
  // ═══════════════════════════════════════════════════════════════════
  // 7. CALCULATE TOP CATEGORIES (using absolute values for grouping)
  // ═══════════════════════════════════════════════════════════════════
  log('\n[7] Calculating Top Categories...');
  
  // Group income by category (using net amounts)
  const incomeByCategory = {};
  filteredIncome.forEach(t => {
    if (!incomeByCategory[t.category]) incomeByCategory[t.category] = 0;
    incomeByCategory[t.category] += t.amount;
  });
  
  // Group expenses by category (using absolute values for display)
  const expensesByCategory = {};
  filteredExpenses.forEach(t => {
    if (!expensesByCategory[t.category]) expensesByCategory[t.category] = 0;
    expensesByCategory[t.category] += Math.abs(t.amount);
  });
  
  // Convert to arrays and sort
  const topIncome = Object.entries(incomeByCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 5);
  
  const topExpenses = Object.entries(expensesByCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  
  log(`✓ Top Income categories: ${topIncome.length}`);
  topIncome.forEach((item, i) => {
    log(`  ${i+1}. ${item.category}: $${item.amount.toFixed(2)}`);
  });
  
  log(`✓ Top Expense categories: ${topExpenses.length}`);
  topExpenses.forEach((item, i) => {
    log(`  ${i+1}. ${item.category}: $${item.amount.toFixed(2)}`);
  });
  
  // ═══════════════════════════════════════════════════════════════════
  // 8. BUILD CHART DATA - SIMPLE APPROACH
  // Always show months that have data within the filtered range
  // ═══════════════════════════════════════════════════════════════════
  log('\n[8] Building chart for date range...');
  
  const shortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Collect all months that have data within the filtered range
  var monthsWithData = {};
  
  filteredIncome.forEach(t => {
    var key = t.date.getFullYear() + '-' + String(t.date.getMonth()).padStart(2, '0');
    if (!monthsWithData[key]) {
      monthsWithData[key] = { year: t.date.getFullYear(), month: t.date.getMonth(), income: 0, expenses: 0 };
    }
    monthsWithData[key].income += t.amount;
  });
  
  filteredExpenses.forEach(t => {
    var key = t.date.getFullYear() + '-' + String(t.date.getMonth()).padStart(2, '0');
    if (!monthsWithData[key]) {
      monthsWithData[key] = { year: t.date.getFullYear(), month: t.date.getMonth(), income: 0, expenses: 0 };
    }
    monthsWithData[key].expenses += Math.abs(t.amount);
  });
  
  // Sort months chronologically by key (YYYY-MM format sorts correctly)
  var sortedKeys = Object.keys(monthsWithData).sort();
  
  var chartLabels = [];
  var chartIncome = [];
  var chartExpenses = [];
  
  if (sortedKeys.length === 0) {
    // No data - show single bar for the end date month
    chartLabels = [shortMonthNames[endDate.getMonth()]];
    chartIncome = [0];
    chartExpenses = [0];
  } else {
    // Build chart from months with data
    sortedKeys.forEach(key => {
      var m = monthsWithData[key];
      var label = shortMonthNames[m.month];
      // Add year suffix if data spans multiple years OR if not current year
      var hasMultipleYears = sortedKeys.length > 1 && 
        sortedKeys[0].split('-')[0] !== sortedKeys[sortedKeys.length-1].split('-')[0];
      if (hasMultipleYears || m.year !== DASHBOARD_YEAR) {
        label += " '" + String(m.year).slice(-2);
      }
      chartLabels.push(label);
      chartIncome.push(m.income);
      chartExpenses.push(m.expenses);
    });
  }
  
  log('✓ Chart data built (' + chartLabels.length + ' months with data):');
  chartLabels.forEach((label, i) => {
    log(`  ${label}: Income $${chartIncome[i].toFixed(0)}, Expenses $${chartExpenses[i].toFixed(0)}`);
  });
  
  // ═══════════════════════════════════════════════════════════════════
  // 9. CALCULATE TOTALS
  // ═══════════════════════════════════════════════════════════════════
  const totalProfit = totalIncomeNet - Math.abs(totalExpenseNet);
  
  log('\n[9] Totals:');
  log(`  Total Income (NET): $${totalIncomeNet.toFixed(2)}`);
  log(`  Total Expenses (NET): $${Math.abs(totalExpenseNet).toFixed(2)}`);
  log(`  Net Profit: $${totalProfit.toFixed(2)}`);
  
  // ═══════════════════════════════════════════════════════════════════
  // 10. BUILD FINAL DATA OBJECT
  // ═══════════════════════════════════════════════════════════════════
  const result = {
    filter: filter, // Include the filter that was applied
    dateRange: `${startDate.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})} - ${endDate.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}`,
    
    monthlyIncome: totalIncomeNet,
    monthlyExpenses: Math.abs(totalExpenseNet),
    monthlyProfit: totalProfit,
    
    totalErrors: 0,
    unlabeledCount: 0,
    learningRules: 0,
    
    chartData: {
      labels: chartLabels,
      income: chartIncome,
      expenses: chartExpenses
    },
    
    topIncome: topIncome,
    topExpenses: topExpenses,
    
    goals: goals,
    goalsCompletion: goalsCompletion,
    
    accounts: accounts.map(a => a.name),
    
    incomeCategories: Object.keys(incomeByCategory),
    expenseCategories: Object.keys(expensesByCategory)
  };
  
  // ═══════════════════════════════════════════════════════════════════
  // 11. CACHE RESULT (if enabled)
  // ═══════════════════════════════════════════════════════════════════
  if (USE_CACHE) {
    const cache = CacheService.getScriptCache();
    const cacheKey = 'dashboardData_' + (filter || '30days');
    cache.put(cacheKey, JSON.stringify(result), CACHE_DURATION);
  }
  
  const elapsed = (new Date() - startTime) / 1000;
  Logger.log('✅ MM_apiGetDashboardData COMPLETE in ' + elapsed.toFixed(2) + 's');
  
  return result;
}

/**
 * ═══════════════════════════════════════════════════════════════════
 * HELPER: Clear Dashboard Cache
 * ═══════════════════════════════════════════════════════════════════
 */
function MM_CLEAR_DASHBOARD_CACHE() {
  const cache = CacheService.getScriptCache();
  cache.remove('dashboardData_30days');
  cache.remove('dashboardData_12months');
  cache.remove('dashboardData_alltime');
  cache.remove('dashboardData_custom');
  Logger.log('✓ Dashboard cache cleared (all filters)');
  SpreadsheetApp.getUi().alert('✓ Dashboard cache cleared!\n\nFresh data will be loaded on next dashboard open.');
}

function getWelcomeData() {
  return {
    userName: Session.getActiveUser().getEmail().split('@')[0],
    scanSummary: typeof getMistakeScanSummaryCached === 'function' 
      ? getMistakeScanSummaryCached(false) 
      : { totalUnlabeled: 0 }
  };
}

/**
 * Emergency function to force open dashboard (for debugging)
 */
function EMERGENCY_openDashboard() {
  const currentEmail = Session.getActiveUser().getEmail();
  const props = MM_getProps_();
  props.setProperty('mm_registered', 'true');
  props.setProperty('mm_primary_email', MM_normEmail_(currentEmail));
  MM_showDashboard();
}

// ═══════════════════════════════════════════════════════════════════
// REGISTRATION RESET FUNCTIONS (Admin Tools)
// ═══════════════════════════════════════════════════════════════════

/**
 * ADMIN: Reset all registration data for this sheet
 * This clears mm_registered, mm_primary_email, PIN hashes, guests, etc.
 * 
 * Use this when you need to:
 * - Transfer a sheet to a new client
 * - Reset a user's registration for testing
 * - Fix registration issues
 */
function MM_resetRegistration() {
  try {
    var ui = SpreadsheetApp.getUi();
    var email = Session.getActiveUser().getEmail();
    
    // Only admins can reset registration
    if (!MM_isMasterEmail_(email)) {
      ui.alert('Access Denied', 'Only admin users can reset registration.', ui.ButtonSet.OK);
      return;
    }
    
    var response = ui.alert(
      '⚠️ Reset Registration',
      'This will clear ALL registration data:\n\n' +
      '• Primary user registration\n' +
      '• All guest accounts\n' +
      '• All PIN hashes\n' +
      '• Access key association\n' +
      '• First login flags\n\n' +
      'Access keys will be re-synced from backend.\n\n' +
      'The sheet will require re-registration after this.\n\n' +
      'Are you sure you want to continue?',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      ui.alert('Reset cancelled.');
      return;
    }
    
    // Step 1: Perform the reset
    var result = _performRegistrationReset_();
    
    // Step 2: RE-SYNC ACCESS KEYS (Critical for registration to work after reset)
    var syncResult = { success: false, count: 0 };
    try {
      if (typeof syncAccessKeysToLocal === 'function') {
        syncResult = syncAccessKeysToLocal(true); // Silent mode
        Logger.log('✅ Access keys re-synced after reset: ' + (syncResult.count || 0) + ' keys');
      }
    } catch (syncError) {
      Logger.log('⚠️ Access key sync failed after reset: ' + syncError.message);
    }
    
    if (result.success) {
      var syncMessage = syncResult.success 
        ? '\n• Access keys synced: ' + syncResult.count + ' keys ✅'
        : '\n• ⚠️ Access key sync failed - may need to sync manually';
      
      ui.alert(
        '✅ Registration Reset Complete',
        'All registration data has been cleared:\n\n' +
        '• Cleared: ' + result.clearedProperties.join(', ') + '\n' +
        '• Total properties removed: ' + result.count + 
        syncMessage + '\n\n' +
        'The next user to click "Open Dashboard" will see the registration screen.',
        ui.ButtonSet.OK
      );
    } else {
      ui.alert('Error', 'Reset failed: ' + result.message, ui.ButtonSet.OK);
    }
    
  } catch (error) {
    Logger.log('MM_resetRegistration error: ' + error.message);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

/**
 * Internal function to perform registration reset
 */
function _performRegistrationReset_() {
  try {
    var props = MM_getProps_();
    var scriptProps;
    try {
      scriptProps = PropertiesService.getScriptProperties();
    } catch (e) {
      Logger.log('Could not get ScriptProperties for reset: ' + e.message);
      scriptProps = { deleteProperty: function() {}, getProperties: function() { return {}; } };
    }
    var cleared = [];
    var count = 0;
    
    // List of known registration properties to clear
    var docPropsToDelete = [
      'mm_registered',
      'mm_primary_email',
      'mm_guests_json',
      'mm_access_key',
      'mm_registration_date',
      'mm_is_first_login',
      'mm_needs_bank_setup'
    ];
    
    // Delete known properties
    for (var i = 0; i < docPropsToDelete.length; i++) {
      var key = docPropsToDelete[i];
      if (props.getProperty(key)) {
        props.deleteProperty(key);
        cleared.push(key);
        count++;
      }
    }
    
    // Delete all PIN hashes (they start with mm_pin_hash_)
    var allDocProps = props.getProperties();
    for (var key in allDocProps) {
      if (key.indexOf('mm_pin_hash_') === 0) {
        props.deleteProperty(key);
        cleared.push(key.substring(0, 20) + '...');
        count++;
      }
    }
    
    // Delete user records from script properties
    var allScriptProps = scriptProps.getProperties();
    for (var key in allScriptProps) {
      if (key.indexOf('mm_user_') === 0 || 
          key.indexOf('mm_session_') === 0 ||
          key.indexOf('mm_mfa_') === 0 ||
          key.indexOf('mm_reset_') === 0) {
        scriptProps.deleteProperty(key);
        count++;
      }
    }
    
    Logger.log('✅ Registration reset complete. Cleared ' + count + ' properties.');
    
    return {
      success: true,
      count: count,
      clearedProperties: cleared
    };
    
  } catch (error) {
    Logger.log('_performRegistrationReset_ error: ' + error.message);
    return {
      success: false,
      message: error.message,
      count: 0,
      clearedProperties: []
    };
  }
}

/**
 * ADMIN: View current registration status
 * Shows what registration data exists on this sheet
 */
function MM_viewRegistrationStatus() {
  try {
    var ui = SpreadsheetApp.getUi();
    var email = Session.getActiveUser().getEmail();
    
    // Only admins can view full status
    if (!MM_isMasterEmail_(email)) {
      ui.alert('Access Denied', 'Only admin users can view registration status.', ui.ButtonSet.OK);
      return;
    }
    
    var props = MM_getProps_();
    
    var registered = props.getProperty('mm_registered') === 'true';
    var primaryEmail = props.getProperty('mm_primary_email') || '(none)';
    var accessKey = props.getProperty('mm_access_key') || '(none)';
    var regDate = props.getProperty('mm_registration_date') || '(none)';
    var isFirstLogin = props.getProperty('mm_is_first_login') || 'false';
    var needsBankSetup = props.getProperty('mm_needs_bank_setup') || 'false';
    
    // Count PIN hashes
    var pinHashCount = 0;
    var allProps = props.getProperties();
    for (var key in allProps) {
      if (key.indexOf('mm_pin_hash_') === 0) {
        pinHashCount++;
      }
    }
    
    // Count guests
    var guestCount = 0;
    var guestDetails = '';
    try {
      var guestsJson = props.getProperty('mm_guests_json');
      if (guestsJson) {
        var guests = JSON.parse(guestsJson);
        guestCount = guests.length;
        guests.forEach(function(g) {
          guestDetails += '\n  • ' + g.email + ' (' + (g.registered ? 'registered' : 'pending') + ')';
        });
      }
    } catch (e) {}
    
    var status = 
      '📋 REGISTRATION STATUS\n\n' +
      '🔐 Registered: ' + (registered ? 'YES ✓' : 'NO ✗') + '\n' +
      '👤 Primary Email: ' + primaryEmail + '\n' +
      '🔑 Access Key: ' + accessKey + '\n' +
      '📅 Registration Date: ' + regDate + '\n' +
      '🆕 First Login: ' + isFirstLogin + '\n' +
      '💳 Needs Bank Setup: ' + needsBankSetup + '\n' +
      '🔒 PIN Hashes: ' + pinHashCount + '\n' +
      '👥 Guests: ' + guestCount + (guestDetails || '');
    
    ui.alert('Registration Status', status, ui.ButtonSet.OK);
    
  } catch (error) {
    Logger.log('MM_viewRegistrationStatus error: ' + error.message);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

/**
 * ADMIN: Force-register current user as primary
 * Use this for emergency access or testing
 */
function MM_forceRegisterAdmin() {
  try {
    var ui = SpreadsheetApp.getUi();
    var email = Session.getActiveUser().getEmail();
    
    // Only admins can force register
    if (!MM_isMasterEmail_(email)) {
      ui.alert('Access Denied', 'Only admin users can force-register.', ui.ButtonSet.OK);
      return;
    }
    
    var props = MM_getProps_();
    
    // Mark as registered
    props.setProperty('mm_registered', 'true');
    props.setProperty('mm_primary_email', MM_normEmail_(email));
    props.setProperty('mm_registration_date', new Date().toISOString());
    props.setProperty('mm_is_first_login', 'false');
    
    ui.alert(
      '✅ Admin Registered',
      'You have been registered as the primary user:\n\n' +
      'Email: ' + email + '\n\n' +
      'You can now access the dashboard directly.',
      ui.ButtonSet.OK
    );
    
    // Show dashboard
    MM_showDashboard();
    
  } catch (error) {
    Logger.log('MM_forceRegisterAdmin error: ' + error.message);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// 🧪 TEST FUNCTIONS - Preview all authentication screens
// ═══════════════════════════════════════════════════════════════════
// Run these from the Apps Script editor: Run > TEST_showAllScreens
// Or add to menu for easy testing

/**
 * TEST: Show a menu with all test options
 * ⚠️ MUST be run from the spreadsheet, not from the editor directly
 * Run this function, then use the "🧪 Test Auth" menu in your spreadsheet
 */
function TEST_addTestMenu() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🧪 Test Auth')
    .addItem('1️⃣ Registration Screen', 'TEST_showRegistration')
    .addItem('2️⃣ Login Screen (PIN only)', 'TEST_showLogin')
    .addItem('3️⃣ MFA Code Entry (standalone)', 'TEST_showMFAEntry')
    .addItem('4️⃣ Forgot PIN Screen', 'TEST_showForgotPin')
    .addItem('5️⃣ Unauthorized Screen', 'TEST_showUnauthorized')
    .addSeparator()
    .addItem('🔧 Setup Test User (PIN: 1234)', 'TEST_setupTestUser')
    .addItem('🗑️ Clear Test User', 'TEST_clearTestUser')
    .addItem('📧 Test Send Email', 'TEST_sendTestEmail')
    .addToUi();
  
  ui.alert('✅ Test menu added!', 'Look for "🧪 Test Auth" in the menu bar.', ui.ButtonSet.OK);
}

/**
 * TEST: Run this from the editor to log test instructions
 * This function works without UI context
 */
function TEST_fromEditor() {
  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('🧪 AUTH TESTING INSTRUCTIONS');
  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('');
  Logger.log('To test the login screens, you must run from the SPREADSHEET:');
  Logger.log('');
  Logger.log('1. Open your Google Sheet');
  Logger.log('2. Go to Extensions → Apps Script');
  Logger.log('3. Select one of these functions and click Run:');
  Logger.log('   - TEST_showRegistration (new user signup)');
  Logger.log('   - TEST_showLogin (login with PIN only)');
  Logger.log('   - TEST_showForgotPin (password reset)');
  Logger.log('   - TEST_showMFAEntry (MFA code screen)');
  Logger.log('   - TEST_setupTestUser (creates user with PIN: 1234)');
  Logger.log('   - TEST_sendTestEmail (verify Resend works)');
  Logger.log('');
  Logger.log('OR add the test menu:');
  Logger.log('   - Run TEST_addTestMenu from the spreadsheet');
  Logger.log('   - Then use the "🧪 Test Auth" menu');
  Logger.log('');
  Logger.log('═══════════════════════════════════════════════════════════');
  
  // This part works from editor - test email sending
  Logger.log('');
  Logger.log('Testing Resend API configuration...');
  Logger.log('API Key: ' + (RESEND_CONFIG.API_KEY ? '✓ Set (' + RESEND_CONFIG.API_KEY.substring(0, 10) + '...)' : '✗ Missing'));
  Logger.log('From Email: ' + RESEND_CONFIG.FROM_EMAIL);
  Logger.log('');
  Logger.log('To test email delivery, run TEST_sendTestEmail from the spreadsheet.');
}

/**
 * TEST: Show Registration Screen
 */
function TEST_showRegistration() {
  MM_showRegistrationGate_();
}

/**
 * TEST: Show Login Screen (PIN only - no MFA)
 */
function TEST_showLogin() {
  const email = Session.getActiveUser().getEmail();
  MM_showLoginGate_(email);
}

/**
 * TEST: Show Forgot PIN Screen
 */
function TEST_showForgotPin() {
  MM_showForgotPinGate();
}

/**
 * TEST: Show Unauthorized Screen
 */
function TEST_showUnauthorized() {
  const email = Session.getActiveUser().getEmail();
  MM_showUnauthorizedGate_(email);
}

/**
 * TEST: Show standalone MFA code entry screen
 * This simulates what the user sees after entering correct PIN
 */
function TEST_showMFAEntry() {
  const email = Session.getActiveUser().getEmail();
  const html = HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
    <head>
      <base target="_top">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Inter', sans-serif;
          background: linear-gradient(135deg, #f5f5f0 0%, #e8e4dc 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .gate-container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(171, 148, 120, 0.15);
          padding: 40px;
          max-width: 420px;
          width: 100%;
        }
        .gate-header { text-align: center; margin-bottom: 30px; }
        .gate-icon {
          width: 70px; height: 70px;
          background: linear-gradient(135deg, #ab9478 0%, #8b7860 100%);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px;
        }
        .gate-icon i { font-size: 32px; color: white; }
        h1 { color: #333; font-size: 24px; font-weight: 600; margin-bottom: 8px; }
        .subtitle { color: #666; font-size: 14px; }
        .email-display {
          background: #f8f6f3; border: 1px solid #e0ddd6;
          border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;
          display: flex; align-items: center; gap: 10px;
        }
        .email-display i { color: #ab9478; }
        .email-display span { color: #333; font-weight: 500; font-size: 14px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; color: #555; font-size: 13px; font-weight: 500; margin-bottom: 8px; }
        input {
          width: 100%; padding: 14px 16px; border: 2px solid #e0ddd6;
          border-radius: 8px; font-size: 24px; letter-spacing: 12px;
          text-align: center; transition: all 0.2s;
        }
        input:focus { outline: none; border-color: #ab9478; box-shadow: 0 0 0 3px rgba(171, 148, 120, 0.1); }
        .btn {
          width: 100%; padding: 14px 24px; border: none; border-radius: 8px;
          font-size: 15px; font-weight: 600; cursor: pointer; margin-bottom: 10px;
        }
        .btn-primary {
          background: linear-gradient(135deg, #ab9478 0%, #8b7860 100%); color: white;
        }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(171, 148, 120, 0.3); }
        .info-box {
          background: #ebf8ff; border: 1px solid #90cdf4; color: #2b6cb0;
          padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px;
        }
        .test-badge {
          background: #fef3c7; border: 1px solid #f59e0b; color: #92400e;
          padding: 8px 12px; border-radius: 6px; font-size: 12px; margin-bottom: 16px;
          text-align: center;
        }
        .resend-link { text-align: center; margin-top: 15px; }
        .resend-link a { color: #ab9478; text-decoration: underline; cursor: pointer; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="gate-container">
        <div class="gate-header">
          <div class="gate-icon">
            <i class="fas fa-envelope"></i>
          </div>
          <h1>Check Your Email</h1>
          <p class="subtitle">Enter the 6-digit verification code</p>
        </div>
        
        <div class="test-badge">
          🧪 TEST MODE - Use code <strong>123456</strong> to simulate success
        </div>
        
        <div class="email-display">
          <i class="fas fa-user"></i>
          <span>${email}</span>
        </div>
        
        <div class="info-box">
          <i class="fas fa-info-circle"></i> A verification code was sent to your email. Check your inbox!
        </div>
        
        <div class="form-group">
          <label><i class="fas fa-shield-alt"></i> Verification Code</label>
          <input type="text" id="code" maxlength="6" placeholder="••••••" inputmode="numeric" autofocus>
        </div>
        
        <button class="btn btn-primary" onclick="verify()">
          <i class="fas fa-check-circle"></i> Verify Code
        </button>
        
        <div class="resend-link">
          <a onclick="resend()">Didn't receive code? Resend</a>
        </div>
      </div>
      
      <script>
        function verify() {
          const code = document.getElementById('code').value;
          if (code === '123456') {
            alert('✅ SUCCESS! Code verified.\n\nIn real usage, this would:\n1. Verify the code with the server\n2. Create authenticated session\n3. Open the dashboard');
            google.script.host.close();
          } else if (code.length === 6) {
            alert('❌ Invalid code.\n\nTry the test code: 123456');
          } else {
            alert('Please enter a 6-digit code');
          }
        }
        
        function resend() {
          alert('📧 Resend clicked!\n\nIn real usage, this would send a new code to your email.');
        }
        
        document.getElementById('code').addEventListener('keypress', function(e) {
          if (e.key === 'Enter') verify();
        });
      </script>
    </body>
    </html>
  `).setWidth(480).setHeight(580);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'MFA Verification (Test)');
}

/**
 * TEST: Setup a test user with PIN 1234
 */
function TEST_setupTestUser() {
  const email = Session.getActiveUser().getEmail();
  const normalizedEmail = MM_normEmail_(email);
  const props = MM_getProps_();
  
  // Create PIN hash for "1234"
  const pin = '1234';
  const pinHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pin + normalizedEmail);
  const pinHashString = pinHash.map(function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
  
  // Set up user
  props.setProperty('mm_registered', 'true');
  props.setProperty('mm_primary_email', normalizedEmail);
  props.setProperty('mm_pin_hash_' + normalizedEmail, pinHashString);
  
  // Also store in Script Properties for MFA functions
  try {
    const scriptProps = PropertiesService.getScriptProperties();
    scriptProps.setProperty('mm_user_' + normalizedEmail, JSON.stringify({
      email: normalizedEmail,
      pin: pin,
      createdAt: new Date().toISOString()
    }));
  } catch (e) {
    Logger.log('Could not store test user in script props: ' + e.message);
  }
  
  SpreadsheetApp.getUi().alert(
    '✅ Test User Created!',
    'Email: ' + email + '\nPIN: 1234\n\nYou can now test the login flow.\n\nTry:\n1. Run TEST_showLogin\n2. Enter PIN: 1234\n3. You will be logged in directly (no MFA)',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * TEST: Clear test user data
 */
function TEST_clearTestUser() {
  const email = Session.getActiveUser().getEmail();
  const normalizedEmail = MM_normEmail_(email);
  const props = MM_getProps_();
  var scriptProps;
  try {
    scriptProps = PropertiesService.getScriptProperties();
  } catch (e) {
    Logger.log('Could not get ScriptProperties for clear: ' + e.message);
    scriptProps = { deleteProperty: function() {} };
  }
  
  // Clear document properties
  props.deleteProperty('mm_registered');
  props.deleteProperty('mm_primary_email');
  props.deleteProperty('mm_pin_hash_' + normalizedEmail);
  
  // Clear script properties
  scriptProps.deleteProperty('mm_user_' + normalizedEmail);
  scriptProps.deleteProperty('mm_session_' + normalizedEmail);
  scriptProps.deleteProperty('mm_mfa_login_' + normalizedEmail);
  scriptProps.deleteProperty('mm_mfa_reset_' + normalizedEmail);
  scriptProps.deleteProperty('mm_reset_token_' + normalizedEmail);
  
  SpreadsheetApp.getUi().alert(
    '🗑️ Test User Cleared!',
    'All test data for ' + email + ' has been removed.\n\nYou can run TEST_setupTestUser to create a new test account.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * TEST: Send a test email to verify Resend is working
 */
function TEST_sendTestEmail() {
  const email = Session.getActiveUser().getEmail();
  const ui = SpreadsheetApp.getUi();
  
  ui.alert('📧 Sending Test Email', 'Sending a test email to: ' + email + '\n\nPlease wait...', ui.ButtonSet.OK);
  
  try {
    const response = UrlFetchApp.fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + RESEND_CONFIG.API_KEY,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        from: RESEND_CONFIG.FROM_NAME + ' <' + RESEND_CONFIG.FROM_EMAIL + '>',
        to: [email],
        subject: '🧪 Test Email - Money Mastery',
        html: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">' +
              '<div style="background: linear-gradient(135deg, #ab9478 0%, #8b7860 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">' +
              '<h1 style="color: white; margin: 0;">🎉 Email Test Successful!</h1>' +
              '</div>' +
              '<div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">' +
              '<p style="color: #333; font-size: 16px;">If you can read this, your Resend email integration is working correctly!</p>' +
              '<p style="color: #666; font-size: 14px; margin-top: 20px;">Test sent at: ' + new Date().toLocaleString() + '</p>' +
              '</div>' +
              '</div>'
      }),
      muteHttpExceptions: true
    });
    
    const code = response.getResponseCode();
    const body = response.getContentText();
    
    if (code === 200 || code === 201) {
      ui.alert('✅ Email Sent!', 'Check your inbox at: ' + email + '\n\nIf you do not see it, check your spam folder.', ui.ButtonSet.OK);
    } else {
      const error = JSON.parse(body);
      ui.alert('❌ Email Failed', 'Error: ' + (error.message || body) + '\n\nMake sure your domain is verified in Resend.', ui.ButtonSet.OK);
    }
  } catch (e) {
    ui.alert('❌ Error', 'Failed to send email: ' + e.message, ui.ButtonSet.OK);
  }
}

/**
 * TEST: Full flow simulation - shows what each step looks like
 */
function TEST_showFullFlowDemo() {
  const html = HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
    <head>
      <base target="_top">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #f5f5f0; padding: 20px; }
        h1 { color: #333; margin-bottom: 20px; text-align: center; }
        .flow-container { max-width: 600px; margin: 0 auto; }
        .step {
          background: white; border-radius: 12px; padding: 20px;
          margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          display: flex; gap: 16px; align-items: flex-start;
        }
        .step-num {
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg, #ab9478 0%, #8b7860 100%);
          color: white; display: flex; align-items: center; justify-content: center;
          font-weight: 600; flex-shrink: 0;
        }
        .step-content { flex: 1; }
        .step-title { font-weight: 600; color: #333; margin-bottom: 4px; }
        .step-desc { color: #666; font-size: 14px; line-height: 1.5; }
        .btn-row { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
        .btn {
          padding: 8px 16px; border: none; border-radius: 6px;
          font-size: 13px; cursor: pointer; display: inline-flex;
          align-items: center; gap: 6px;
        }
        .btn-primary { background: #ab9478; color: white; }
        .btn-outline { background: white; border: 1px solid #ab9478; color: #ab9478; }
        .section-title {
          font-size: 18px; font-weight: 600; color: #8b7860;
          margin: 30px 0 16px; padding-bottom: 8px;
          border-bottom: 2px solid #e0ddd6;
        }
      </style>
    </head>
    <body>
      <div class="flow-container">
        <h1>🧪 Authentication Test Guide</h1>
        
        <div class="section-title">📝 New User Registration</div>
        
        <div class="step">
          <div class="step-num">1</div>
          <div class="step-content">
            <div class="step-title">Registration Screen</div>
            <div class="step-desc">New users see this when first accessing the spreadsheet. They create a 4-6 digit PIN.</div>
            <div class="btn-row">
              <button class="btn btn-primary" onclick="google.script.run.TEST_showRegistration()">
                <i class="fas fa-eye"></i> Preview
              </button>
            </div>
          </div>
        </div>
        
        <div class="section-title">🔐 Login Flow (with MFA)</div>
        
        <div class="step">
          <div class="step-num">1</div>
          <div class="step-content">
            <div class="step-title">PIN Entry</div>
            <div class="step-desc">User enters their email and PIN. If correct, system sends MFA code via email.</div>
            <div class="btn-row">
              <button class="btn btn-primary" onclick="google.script.run.TEST_showLogin()">
                <i class="fas fa-eye"></i> Preview Login
              </button>
              <button class="btn btn-outline" onclick="google.script.run.TEST_setupTestUser()">
                <i class="fas fa-user-plus"></i> Setup Test User (PIN: 1234)
              </button>
            </div>
          </div>
        </div>
        
        <div class="step">
          <div class="step-num">2</div>
          <div class="step-content">
            <div class="step-title">MFA Code Entry</div>
            <div class="step-desc">User receives 6-digit code via email and enters it. Code expires in 5 minutes.</div>
            <div class="btn-row">
              <button class="btn btn-primary" onclick="google.script.run.TEST_showMFAEntry()">
                <i class="fas fa-eye"></i> Preview MFA Screen
              </button>
              <button class="btn btn-outline" onclick="google.script.run.TEST_sendTestEmail()">
                <i class="fas fa-envelope"></i> Test Email Delivery
              </button>
            </div>
          </div>
        </div>
        
        <div class="step">
          <div class="step-num">3</div>
          <div class="step-content">
            <div class="step-title">Success → Dashboard</div>
            <div class="step-desc">After MFA verification, user is logged in for 24 hours and sees the dashboard.</div>
          </div>
        </div>
        
        <div class="section-title">🔑 Forgot PIN Flow</div>
        
        <div class="step">
          <div class="step-num">1</div>
          <div class="step-content">
            <div class="step-title">Request Reset Code</div>
            <div class="step-desc">User clicks "Forgot PIN?" and receives a reset code via email.</div>
            <div class="btn-row">
              <button class="btn btn-primary" onclick="google.script.run.TEST_showForgotPin()">
                <i class="fas fa-eye"></i> Preview Forgot PIN
              </button>
            </div>
          </div>
        </div>
        
        <div class="step">
          <div class="step-num">2</div>
          <div class="step-content">
            <div class="step-title">Verify Code & Set New PIN</div>
            <div class="step-desc">User enters code, then creates a new 4-6 digit PIN.</div>
          </div>
        </div>
        
        <div class="section-title">🚫 Access Denied</div>
        
        <div class="step">
          <div class="step-num">!</div>
          <div class="step-content">
            <div class="step-title">Unauthorized Screen</div>
            <div class="step-desc">Shown when a user without access tries to open the spreadsheet.</div>
            <div class="btn-row">
              <button class="btn btn-primary" onclick="google.script.run.TEST_showUnauthorized()">
                <i class="fas fa-eye"></i> Preview
              </button>
            </div>
          </div>
        </div>
        
        <div class="section-title">🧹 Cleanup</div>
        
        <div class="step">
          <div class="step-num">×</div>
          <div class="step-content">
            <div class="step-title">Clear Test Data</div>
            <div class="step-desc">Remove test user data to start fresh.</div>
            <div class="btn-row">
              <button class="btn btn-outline" onclick="google.script.run.TEST_clearTestUser()">
                <i class="fas fa-trash"></i> Clear Test User
              </button>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `).setWidth(700).setHeight(800);
  
  SpreadsheetApp.getUi().showModalDialog(html, '🧪 Auth Flow Test Guide');
}

// ═══════════════════════════════════════════════════════════════════
// SECURITY GATE DIALOGS - Registration, Login, MFA, Forgot PIN
// ═══════════════════════════════════════════════════════════════════

/**
 * Show registration gate for new users
 */
function MM_showRegistrationGate_() {
  const email = Session.getActiveUser().getEmail();
  const html = HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
    <head>
      <base target="_top">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Inter', sans-serif;
          background: linear-gradient(135deg, #f5f5f0 0%, #e8e4dc 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .gate-container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(171, 148, 120, 0.15);
          padding: 40px;
          max-width: 420px;
          width: 100%;
        }
        .gate-header {
          text-align: center;
          margin-bottom: 30px;
        }
        .gate-icon {
          width: 70px;
          height: 70px;
          background: linear-gradient(135deg, #ab9478 0%, #8b7860 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }
        .gate-icon i {
          font-size: 32px;
          color: white;
        }
        h1 {
          color: #333;
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .subtitle {
          color: #666;
          font-size: 14px;
        }
        .email-display {
          background: #f8f6f3;
          border: 1px solid #e0ddd6;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .email-display i {
          color: #ab9478;
        }
        .email-display span {
          color: #333;
          font-weight: 500;
        }
        .form-group {
          margin-bottom: 20px;
        }
        label {
          display: block;
          color: #555;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 8px;
        }
        input[type="password"], input[type="text"] {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #e0ddd6;
          border-radius: 8px;
          font-size: 18px;
          letter-spacing: 8px;
          text-align: center;
          transition: all 0.2s;
        }
        input:focus {
          outline: none;
          border-color: #ab9478;
          box-shadow: 0 0 0 3px rgba(171, 148, 120, 0.1);
        }
        .pin-hint {
          color: #888;
          font-size: 12px;
          margin-top: 6px;
          text-align: center;
        }
        .btn {
          width: 100%;
          padding: 14px 24px;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary {
          background: linear-gradient(135deg, #ab9478 0%, #8b7860 100%);
          color: white;
        }
        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(171, 148, 120, 0.3);
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        .error-message {
          background: #fff5f5;
          border: 1px solid #ffcccb;
          color: #c53030;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 13px;
          display: none;
        }
        .success-message {
          background: #f0fff4;
          border: 1px solid #9ae6b4;
          color: #276749;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 13px;
          display: none;
        }
        .loading {
          display: none;
          text-align: center;
          padding: 20px;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #ab9478;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 10px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="gate-container">
        <div class="gate-header">
          <div class="gate-icon">
            <i class="fas fa-user-plus"></i>
          </div>
          <h1>Create Your Account</h1>
          <p class="subtitle">Set up a secure PIN to protect your data</p>
        </div>
        
        <div class="email-display">
          <i class="fas fa-envelope"></i>
          <span>${email}</span>
        </div>
        
        <div id="errorMsg" class="error-message"></div>
        <div id="successMsg" class="success-message"></div>
        
        <div id="formContent">
          <div class="form-group">
            <label><i class="fas fa-lock"></i> Create PIN</label>
            <input type="password" id="pin1" maxlength="6" placeholder="••••••" inputmode="numeric" pattern="[0-9]*">
            <p class="pin-hint">Enter 4-6 digits</p>
          </div>
          
          <div class="form-group">
            <label><i class="fas fa-check-circle"></i> Confirm PIN</label>
            <input type="password" id="pin2" maxlength="6" placeholder="••••••" inputmode="numeric" pattern="[0-9]*">
          </div>
          
          <button class="btn btn-primary" id="registerBtn" onclick="register()">
            <i class="fas fa-shield-alt"></i> Create Account
          </button>
        </div>
        
        <div id="loadingContent" class="loading">
          <div class="spinner"></div>
          <p>Creating your account...</p>
        </div>
      </div>
      
      <script>
        function register() {
          const pin1 = document.getElementById('pin1').value;
          const pin2 = document.getElementById('pin2').value;
          const errorDiv = document.getElementById('errorMsg');
          const successDiv = document.getElementById('successMsg');
          
          errorDiv.style.display = 'none';
          successDiv.style.display = 'none';
          
          if (!pin1 || pin1.length < 4) {
            errorDiv.textContent = 'PIN must be at least 4 digits';
            errorDiv.style.display = 'block';
            return;
          }
          
          if (!/^\\d{4,6}$/.test(pin1)) {
            errorDiv.textContent = 'PIN must contain only numbers';
            errorDiv.style.display = 'block';
            return;
          }
          
          if (pin1 !== pin2) {
            errorDiv.textContent = 'PINs do not match';
            errorDiv.style.display = 'block';
            return;
          }
          
          document.getElementById('formContent').style.display = 'none';
          document.getElementById('loadingContent').style.display = 'block';
          
          google.script.run
            .withSuccessHandler(function(result) {
              if (result.success) {
                successDiv.textContent = result.message;
                successDiv.style.display = 'block';
                document.getElementById('loadingContent').style.display = 'none';
                setTimeout(function() {
                  google.script.host.close();
                  google.script.run.MM_showDashboard();
                }, 1000);
              } else {
                errorDiv.textContent = result.message;
                errorDiv.style.display = 'block';
                document.getElementById('formContent').style.display = 'block';
                document.getElementById('loadingContent').style.display = 'none';
              }
            })
            .withFailureHandler(function(err) {
              errorDiv.textContent = 'Error: ' + err.message;
              errorDiv.style.display = 'block';
              document.getElementById('formContent').style.display = 'block';
              document.getElementById('loadingContent').style.display = 'none';
            })
            .MM_apiRegisterPrimary('${email}', pin1);
        }
        
        document.getElementById('pin2').addEventListener('keypress', function(e) {
          if (e.key === 'Enter') register();
        });
      </script>
    </body>
    </html>
  `).setWidth(480).setHeight(580);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Account Setup');
}

/**
 * NOTE: MM_showLoginGate_ is defined earlier in this file (around line 357)
 * using the PinEntry.html template. Duplicate definition removed.
 */


/**
 * Show unauthorized gate for users without access
 */
function MM_showUnauthorizedGate_(email) {
  const html = HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
    <head>
      <base target="_top">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Inter', sans-serif;
          background: linear-gradient(135deg, #f5f5f0 0%, #e8e4dc 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .gate-container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(171, 148, 120, 0.15);
          padding: 40px;
          max-width: 420px;
          width: 100%;
          text-align: center;
        }
        .gate-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }
        .gate-icon i {
          font-size: 36px;
          color: white;
        }
        h1 {
          color: #333;
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 12px;
        }
        p {
          color: #666;
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 20px;
        }
        .email-box {
          background: #fff5f5;
          border: 1px solid #ffcccb;
          color: #c53030;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 24px;
          word-break: break-all;
        }
        .btn {
          display: inline-block;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
        }
        .btn-outline {
          background: white;
          border: 2px solid #ab9478;
          color: #ab9478;
        }
        .btn-outline:hover {
          background: #f8f6f3;
        }
      </style>
    </head>
    <body>
      <div class="gate-container">
        <div class="gate-icon">
          <i class="fas fa-ban"></i>
        </div>
        <h1>Access Denied</h1>
        <p>This account is not authorized to access this spreadsheet. Please contact the owner for access.</p>
        <div class="email-box">
          <i class="fas fa-user"></i> ${email}
        </div>
        <button class="btn btn-outline" onclick="google.script.host.close()">
          <i class="fas fa-times"></i> Close
        </button>
      </div>
    </body>
    </html>
  `).setWidth(480).setHeight(420);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Access Denied');
}

/**
 * Show Forgot PIN gate - Email verification flow
 */
function MM_showForgotPinGate() {
  const email = Session.getActiveUser().getEmail();
  const html = HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
    <head>
      <base target="_top">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Inter', sans-serif;
          background: linear-gradient(135deg, #f5f5f0 0%, #e8e4dc 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .gate-container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(171, 148, 120, 0.15);
          padding: 40px;
          max-width: 420px;
          width: 100%;
        }
        .gate-header {
          text-align: center;
          margin-bottom: 30px;
        }
        .gate-icon {
          width: 70px;
          height: 70px;
          background: linear-gradient(135deg, #ab9478 0%, #8b7860 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }
        .gate-icon i {
          font-size: 32px;
          color: white;
        }
        h1 {
          color: #333;
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .subtitle {
          color: #666;
          font-size: 14px;
        }
        .email-display {
          background: #f8f6f3;
          border: 1px solid #e0ddd6;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .email-display i {
          color: #ab9478;
        }
        .email-display span {
          color: #333;
          font-weight: 500;
          font-size: 14px;
          word-break: break-all;
        }
        .form-group {
          margin-bottom: 20px;
        }
        label {
          display: block;
          color: #555;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 8px;
        }
        input[type="password"], input[type="text"] {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #e0ddd6;
          border-radius: 8px;
          font-size: 18px;
          letter-spacing: 8px;
          text-align: center;
          transition: all 0.2s;
        }
        input:focus {
          outline: none;
          border-color: #ab9478;
          box-shadow: 0 0 0 3px rgba(171, 148, 120, 0.1);
        }
        .pin-hint {
          color: #888;
          font-size: 12px;
          margin-top: 6px;
          text-align: center;
        }
        .btn {
          width: 100%;
          padding: 14px 24px;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 10px;
        }
        .btn-primary {
          background: linear-gradient(135deg, #ab9478 0%, #8b7860 100%);
          color: white;
        }
        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(171, 148, 120, 0.3);
        }
        .btn-link {
          background: transparent;
          color: #ab9478;
          text-decoration: underline;
          padding: 10px;
        }
        .error-message {
          background: #fff5f5;
          border: 1px solid #ffcccb;
          color: #c53030;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 13px;
          display: none;
        }
        .success-message {
          background: #f0fff4;
          border: 1px solid #9ae6b4;
          color: #276749;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 13px;
          display: none;
        }
        .info-message {
          background: #ebf8ff;
          border: 1px solid #90cdf4;
          color: #2b6cb0;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 13px;
          display: none;
        }
        .loading {
          display: none;
          text-align: center;
          padding: 20px;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #ab9478;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 10px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .step { display: none; }
        .step.active { display: block; }
        .step-indicator {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 20px;
        }
        .step-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #e0ddd6;
        }
        .step-dot.active {
          background: #ab9478;
        }
        .resend-link {
          text-align: center;
          margin-top: 15px;
        }
        .resend-link a {
          color: #ab9478;
          text-decoration: underline;
          cursor: pointer;
          font-size: 13px;
        }
      </style>
    </head>
    <body>
      <div class="gate-container">
        <div class="gate-header">
          <div class="gate-icon">
            <i class="fas fa-key" id="headerIcon"></i>
          </div>
          <h1 id="headerTitle">Reset Your PIN</h1>
          <p class="subtitle" id="headerSubtitle">We'll send a verification code to your email</p>
        </div>
        
        <div class="step-indicator">
          <div class="step-dot active" id="dot1"></div>
          <div class="step-dot" id="dot2"></div>
          <div class="step-dot" id="dot3"></div>
        </div>
        
        <div class="email-display">
          <i class="fas fa-envelope"></i>
          <span>${email}</span>
        </div>
        
        <div id="errorMsg" class="error-message"></div>
        <div id="successMsg" class="success-message"></div>
        <div id="infoMsg" class="info-message"></div>
        
        <!-- STEP 1: Request Reset Code -->
        <div id="step1" class="step active">
          <p style="color: #666; font-size: 14px; margin-bottom: 20px; text-align: center;">
            Click below to receive a verification code at your email address.
          </p>
          
          <button class="btn btn-primary" onclick="sendResetCode()">
            <i class="fas fa-paper-plane"></i> Send Reset Code
          </button>
          
          <button class="btn btn-link" onclick="backToLogin()">
            <i class="fas fa-arrow-left"></i> Back to Login
          </button>
        </div>
        
        <!-- STEP 2: Enter Verification Code -->
        <div id="step2" class="step">
          <div class="form-group">
            <label><i class="fas fa-shield-alt"></i> Enter Verification Code</label>
            <input type="text" id="resetCode" maxlength="6" placeholder="••••••" inputmode="numeric" pattern="[0-9]*">
            <p class="pin-hint">Check your email for the 6-digit code</p>
          </div>
          
          <button class="btn btn-primary" onclick="verifyResetCode()">
            <i class="fas fa-check-circle"></i> Verify Code
          </button>
          
          <div class="resend-link">
            <a onclick="sendResetCode()">Didn't receive code? Resend</a>
          </div>
        </div>
        
        <!-- STEP 3: Create New PIN -->
        <div id="step3" class="step">
          <div class="form-group">
            <label><i class="fas fa-lock"></i> New PIN</label>
            <input type="password" id="newPin1" maxlength="6" placeholder="••••••" inputmode="numeric" pattern="[0-9]*">
            <p class="pin-hint">Enter 4-6 digits</p>
          </div>
          
          <div class="form-group">
            <label><i class="fas fa-check-circle"></i> Confirm New PIN</label>
            <input type="password" id="newPin2" maxlength="6" placeholder="••••••" inputmode="numeric" pattern="[0-9]*">
          </div>
          
          <button class="btn btn-primary" onclick="resetPin()">
            <i class="fas fa-save"></i> Save New PIN
          </button>
        </div>
        
        <div id="loadingContent" class="loading">
          <div class="spinner"></div>
          <p id="loadingText">Processing...</p>
        </div>
      </div>
      
      <script>
        const userEmail = '${email}';
        let resetToken = '';
        let currentStep = 1;
        
        function showError(msg) {
          document.getElementById('errorMsg').textContent = msg;
          document.getElementById('errorMsg').style.display = 'block';
          document.getElementById('successMsg').style.display = 'none';
          document.getElementById('infoMsg').style.display = 'none';
        }
        
        function showSuccess(msg) {
          document.getElementById('successMsg').textContent = msg;
          document.getElementById('successMsg').style.display = 'block';
          document.getElementById('errorMsg').style.display = 'none';
          document.getElementById('infoMsg').style.display = 'none';
        }
        
        function showInfo(msg) {
          document.getElementById('infoMsg').textContent = msg;
          document.getElementById('infoMsg').style.display = 'block';
          document.getElementById('errorMsg').style.display = 'none';
          document.getElementById('successMsg').style.display = 'none';
        }
        
        function hideMessages() {
          document.getElementById('errorMsg').style.display = 'none';
          document.getElementById('successMsg').style.display = 'none';
          document.getElementById('infoMsg').style.display = 'none';
        }
        
        function showLoading(msg) {
          document.getElementById('loadingText').textContent = msg || 'Processing...';
          document.getElementById('loadingContent').style.display = 'block';
          ['step1', 'step2', 'step3'].forEach(s => document.getElementById(s).classList.remove('active'));
        }
        
        function hideLoading() {
          document.getElementById('loadingContent').style.display = 'none';
        }
        
        function goToStep(step) {
          currentStep = step;
          ['step1', 'step2', 'step3'].forEach(s => document.getElementById(s).classList.remove('active'));
          document.getElementById('step' + step).classList.add('active');
          ['dot1', 'dot2', 'dot3'].forEach(d => document.getElementById(d).classList.remove('active'));
          document.getElementById('dot' + step).classList.add('active');
          
          if (step === 2) {
            document.getElementById('headerIcon').className = 'fas fa-envelope';
            document.getElementById('headerTitle').textContent = 'Check Your Email';
            document.getElementById('headerSubtitle').textContent = 'Enter the verification code';
            document.getElementById('resetCode').focus();
          } else if (step === 3) {
            document.getElementById('headerIcon').className = 'fas fa-lock';
            document.getElementById('headerTitle').textContent = 'Create New PIN';
            document.getElementById('headerSubtitle').textContent = 'Enter your new secure PIN';
            document.getElementById('newPin1').focus();
          }
        }
        
        function sendResetCode() {
          hideMessages();
          showLoading('Sending reset code...');
          
          google.script.run
            .withSuccessHandler(function(result) {
              hideLoading();
              if (result.success) {
                showInfo(result.message);
                goToStep(2);
              } else {
                showError(result.message);
                goToStep(1);
              }
            })
            .withFailureHandler(function(err) {
              hideLoading();
              showError('Error: ' + err.message);
              goToStep(1);
            })
            .MM_sendPinResetCode(userEmail);
        }
        
        function verifyResetCode() {
          const code = document.getElementById('resetCode').value;
          hideMessages();
          
          if (!code || code.length !== 6) {
            showError('Please enter the 6-digit code');
            return;
          }
          
          showLoading('Verifying code...');
          
          google.script.run
            .withSuccessHandler(function(result) {
              hideLoading();
              if (result.success) {
                resetToken = result.resetToken;
                showInfo('Code verified! Create your new PIN.');
                goToStep(3);
              } else {
                showError(result.message);
                goToStep(2);
              }
            })
            .withFailureHandler(function(err) {
              hideLoading();
              showError('Error: ' + err.message);
              goToStep(2);
            })
            .MM_verifyPinResetCode(userEmail, code);
        }
        
        function resetPin() {
          const pin1 = document.getElementById('newPin1').value;
          const pin2 = document.getElementById('newPin2').value;
          hideMessages();
          
          if (!pin1 || pin1.length < 4) {
            showError('PIN must be at least 4 digits');
            return;
          }
          
          if (!/^\\d{4,6}$/.test(pin1)) {
            showError('PIN must contain only numbers');
            return;
          }
          
          if (pin1 !== pin2) {
            showError('PINs do not match');
            return;
          }
          
          showLoading('Saving new PIN...');
          
          google.script.run
            .withSuccessHandler(function(result) {
              hideLoading();
              if (result.success) {
                showSuccess(result.message);
                setTimeout(function() {
                  google.script.host.close();
                  google.script.run.MM_openSecurityThenDashboard();
                }, 2000);
              } else {
                showError(result.message);
                goToStep(3);
              }
            })
            .withFailureHandler(function(err) {
              hideLoading();
              showError('Error: ' + err.message);
              goToStep(3);
            })
            .MM_resetPin(userEmail, resetToken, pin1);
        }
        
        function backToLogin() {
          google.script.host.close();
          google.script.run.MM_openSecurityThenDashboard();
        }
        
        // Enter key handlers
        document.getElementById('resetCode').addEventListener('keypress', function(e) {
          if (e.key === 'Enter') verifyResetCode();
        });
        document.getElementById('newPin2').addEventListener('keypress', function(e) {
          if (e.key === 'Enter') resetPin();
        });
      </script>
    </body>
    </html>
  `).setWidth(480).setHeight(620);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Reset PIN');
}

// ═══════════════════════════════════════════════════════════════════
// GUEST INVITE FUNCTIONALITY (Primary Users Can Add Up to 3 Guests)
// ═══════════════════════════════════════════════════════════════════

/**
 * Maximum number of guests allowed per primary user
 */
var MAX_GUESTS = 3;

/**
 * Show guest invite dialog for primary users
 */
function MM_showGuestInviteDialog() {
  try {
    var email = Session.getActiveUser().getEmail();
    var normalizedEmail = MM_normEmail_(email);
    var props = MM_getProps_();
    
    // Check if user is primary owner
    var primaryEmail = MM_normEmail_(props.getProperty('mm_primary_email') || '');
    var isMaster = MM_isMasterEmail_(normalizedEmail);
    
    if (!isMaster && normalizedEmail !== primaryEmail) {
      SpreadsheetApp.getUi().alert('Access Denied', 'Only the primary account owner can invite guests.', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    // Get existing guests
    var guests = [];
    try {
      var guestsJson = props.getProperty('mm_guests_json');
      if (guestsJson) guests = JSON.parse(guestsJson);
    } catch (e) {}
    
    var guestsJsonString = JSON.stringify(guests);
    
    var html = HtmlService.createHtmlOutput(_createGuestInviteHTML_(guestsJsonString, MAX_GUESTS))
      .setWidth(550)
      .setHeight(700);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'Manage Guest Access');
    
  } catch (e) {
    Logger.log('MM_showGuestInviteDialog error: ' + e.message);
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

/**
 * Create Guest Invite HTML
 */
function _createGuestInviteHTML_(guestsJson, maxGuests) {
  return '<!DOCTYPE html>' +
    '<html>' +
    '<head>' +
    '<base target="_top">' +
    '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">' +
    '<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">' +
    '<style>' +
    '* { box-sizing: border-box; margin: 0; padding: 0; }' +
    'body { font-family: "Montserrat", sans-serif; background: linear-gradient(135deg, #faf9f7 0%, #f0ebe4 100%); min-height: 100vh; padding: 20px; }' +
    '.container { background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(154, 131, 104, 0.12); padding: 30px; max-width: 520px; margin: 0 auto; }' +
    '.header { text-align: center; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #e8e4df; }' +
    '.header-icon { width: 70px; height: 70px; background: linear-gradient(135deg, #9a8368 0%, #456a73 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px; }' +
    '.header-icon i { font-size: 28px; color: white; }' +
    'h1 { font-family: "Playfair Display", Georgia, serif; color: #1a1a1a; font-size: 26px; font-weight: 600; margin-bottom: 8px; }' +
    '.subtitle { color: #666; font-size: 14px; line-height: 1.5; }' +
    '.section-title { font-size: 12px; font-weight: 600; color: #9a8368; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 14px; display: flex; align-items: center; gap: 8px; }' +
    '.section-title i { color: #456a73; }' +
    '.guest-list { margin-bottom: 20px; }' +
    '.guest-card { background: linear-gradient(135deg, #faf9f7 0%, #f5f3f0 100%); border: 1px solid #e8e4df; border-radius: 12px; padding: 16px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease; }' +
    '.guest-card:hover { box-shadow: 0 4px 12px rgba(154, 131, 104, 0.1); }' +
    '.guest-info { flex: 1; }' +
    '.guest-name { font-weight: 600; color: #1a1a1a; font-size: 15px; }' +
    '.guest-email { color: #666; font-size: 13px; margin-top: 3px; }' +
    '.guest-status { font-size: 12px; margin-top: 6px; display: flex; align-items: center; gap: 5px; }' +
    '.status-pending { color: #b7791f; background: #fffaf0; padding: 3px 10px; border-radius: 20px; }' +
    '.status-registered { color: #456a73; background: #e6f4f1; padding: 3px 10px; border-radius: 20px; }' +
    '.btn-remove { background: white; border: 1px solid #e8e4df; color: #999; padding: 8px 12px; border-radius: 8px; font-size: 12px; cursor: pointer; transition: all 0.2s ease; }' +
    '.btn-remove:hover { background: #fff5f5; border-color: #ffcccb; color: #c53030; }' +
    '.empty-state { text-align: center; color: #999; padding: 30px 20px; font-size: 14px; background: #faf9f7; border-radius: 12px; border: 2px dashed #e8e4df; }' +
    '.empty-state i { font-size: 32px; color: #d4c9bb; margin-bottom: 10px; display: block; }' +
    '.add-guest-form { background: linear-gradient(135deg, #f5f3f0 0%, #ebe7e1 100%); border: 1px solid #e8e4df; border-radius: 12px; padding: 20px; margin-top: 15px; }' +
    '.form-row { display: flex; gap: 12px; margin-bottom: 12px; }' +
    '.form-group { flex: 1; }' +
    '.form-group.full { width: 100%; }' +
    'label { display: block; color: #555; font-size: 12px; font-weight: 600; margin-bottom: 6px; }' +
    'input { width: 100%; padding: 12px 14px; border: 2px solid #e8e4df; border-radius: 8px; font-size: 14px; font-family: "Montserrat", sans-serif; transition: all 0.2s ease; background: white; }' +
    'input:focus { outline: none; border-color: #9a8368; box-shadow: 0 0 0 3px rgba(154, 131, 104, 0.1); }' +
    'input::placeholder { color: #bbb; }' +
    '.btn { width: 100%; padding: 14px 20px; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 12px; font-family: "Montserrat", sans-serif; transition: all 0.2s ease; }' +
    '.btn-primary { background: linear-gradient(135deg, #9a8368 0%, #7d6b55 100%); color: white; }' +
    '.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(154, 131, 104, 0.35); }' +
    '.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }' +
    '.quota-info { text-align: center; font-size: 13px; color: #666; margin-bottom: 20px; padding: 12px; background: #faf9f7; border-radius: 8px; }' +
    '.quota-count { font-weight: 700; color: #9a8368; }' +
    '.error-message { background: #fff5f5; border: 1px solid #feb2b2; color: #c53030; padding: 12px 16px; border-radius: 8px; margin-bottom: 14px; font-size: 13px; display: none; }' +
    '.success-message { background: #f0fff4; border: 1px solid #9ae6b4; color: #276749; padding: 12px 16px; border-radius: 8px; margin-bottom: 14px; font-size: 13px; display: none; }' +
    '.pin-display { background: linear-gradient(135deg, #e6f4f1 0%, #d4ece7 100%); border: 2px solid #456a73; color: #2d4a4f; padding: 20px; border-radius: 12px; margin-top: 16px; text-align: center; }' +
    '.pin-display p { margin: 0; }' +
    '.pin-display strong { font-family: "Playfair Display", Georgia, serif; font-size: 32px; letter-spacing: 6px; color: #456a73; display: block; margin: 12px 0; }' +
    '.pin-display .pin-note { font-size: 12px; color: #5a7a7f; margin-top: 10px; }' +
    '.how-it-works { background: #faf9f7; border-radius: 10px; padding: 16px; margin-top: 20px; }' +
    '.how-it-works h4 { font-size: 13px; color: #9a8368; margin-bottom: 10px; font-weight: 600; }' +
    '.how-it-works ol { padding-left: 20px; font-size: 12px; color: #666; line-height: 1.8; }' +
    '</style>' +
    '</head>' +
    '<body>' +
    '<div class="container">' +
    '<div class="header">' +
    '<div class="header-icon"><i class="fas fa-user-friends"></i></div>' +
    '<h1>Guest Access</h1>' +
    '<p class="subtitle">Share access with family members, accountants, or business partners. Guests can view your data but cannot make changes.</p>' +
    '</div>' +
    
    '<div class="quota-info">' +
    'You can invite up to <span class="quota-count">' + maxGuests + '</span> guests &nbsp;|&nbsp; <span class="quota-count" id="usedSlots">0</span> of <span class="quota-count">' + maxGuests + '</span> used' +
    '</div>' +
    
    '<div id="errorMsg" class="error-message"></div>' +
    '<div id="successMsg" class="success-message"></div>' +
    
    '<div class="section-title"><i class="fas fa-users"></i> Your Guests</div>' +
    '<div id="guestList" class="guest-list"></div>' +
    
    '<div class="section-title"><i class="fas fa-user-plus"></i> Invite a Guest</div>' +
    '<div class="add-guest-form" id="addGuestForm">' +
    '<div class="form-row">' +
    '<div class="form-group">' +
    '<label>First Name</label>' +
    '<input type="text" id="guestFirstName" placeholder="First name">' +
    '</div>' +
    '<div class="form-group">' +
    '<label>Last Name</label>' +
    '<input type="text" id="guestLastName" placeholder="Last name">' +
    '</div>' +
    '</div>' +
    '<div class="form-group full">' +
    '<label>Email Address</label>' +
    '<input type="email" id="guestEmail" placeholder="their.email@example.com">' +
    '</div>' +
    '<button class="btn btn-primary" onclick="addGuest()" id="addBtn">' +
    '<i class="fas fa-paper-plane"></i> Send Invitation' +
    '</button>' +
    '<div id="pinDisplay" class="pin-display" style="display: none;">' +
    '<p style="font-weight: 600;">Guest Added Successfully!</p>' +
    '<p style="font-size: 13px; margin-top: 6px;">Share this temporary PIN with your guest:</p>' +
    '<strong id="tempPinValue"></strong>' +
    '<p class="pin-note">They will use this PIN to log in the first time, then create their own.</p>' +
    '</div>' +
    '</div>' +
    
    '<div class="how-it-works">' +
    '<h4><i class="fas fa-info-circle"></i> How Guest Access Works</h4>' +
    '<ol>' +
    '<li>Add your guest with their email address</li>' +
    '<li>Share the temporary PIN with them</li>' +
    '<li>They open your Money Mastery sheet and log in</li>' +
    '<li>They create their own PIN for future access</li>' +
    '</ol>' +
    '</div>' +
    '</div>' +
    
    '<script>' +
    'var guests = ' + guestsJson + ';' +
    'var maxGuests = ' + maxGuests + ';' +
    
    'function renderGuests() {' +
    '  var list = document.getElementById("guestList");' +
    '  document.getElementById("usedSlots").textContent = guests.length;' +
    '  ' +
    '  if (guests.length === 0) {' +
    '    list.innerHTML = \'<div class="empty-state"><i class="fas fa-user-plus"></i>No guests yet — invite someone below!</div>\';' +
    '    document.getElementById("addGuestForm").style.display = "block";' +
    '    return;' +
    '  }' +
    '  ' +
    '  var html = "";' +
    '  guests.forEach(function(g, idx) {' +
    '    var status = g.registered ? \'<span class="status-registered"><i class="fas fa-check-circle"></i> Registered</span>\' : \'<span class="status-pending"><i class="fas fa-clock"></i> Pending</span>\';' +
    '    html += \'<div class="guest-card">\' +' +
    '      \'<div class="guest-info">\' +' +
    '      \'<div class="guest-name">\' + (g.firstName || "") + " " + (g.lastName || "") + \'</div>\' +' +
    '      \'<div class="guest-email">\' + g.email + \'</div>\' +' +
    '      \'<div class="guest-status">\' + status + \'</div>\' +' +
    '      \'</div>\' +' +
    '      \'<button class="btn-remove" onclick="removeGuest(\' + idx + \')"><i class="fas fa-trash"></i></button>\' +' +
    '      \'</div>\';' +
    '  });' +
    '  list.innerHTML = html;' +
    '  ' +
    '  if (guests.length >= maxGuests) {' +
    '    document.getElementById("addGuestForm").style.display = "none";' +
    '  } else {' +
    '    document.getElementById("addGuestForm").style.display = "block";' +
    '  }' +
    '}' +
    
    'function showError(msg) { document.getElementById("errorMsg").textContent = msg; document.getElementById("errorMsg").style.display = "block"; document.getElementById("successMsg").style.display = "none"; }' +
    'function showSuccess(msg) { document.getElementById("successMsg").textContent = msg; document.getElementById("successMsg").style.display = "block"; document.getElementById("errorMsg").style.display = "none"; }' +
    'function hideMessages() { document.getElementById("errorMsg").style.display = "none"; document.getElementById("successMsg").style.display = "none"; }' +
    
    'function addGuest() {' +
    '  hideMessages();' +
    '  document.getElementById("pinDisplay").style.display = "none";' +
    '  ' +
    '  var firstName = document.getElementById("guestFirstName").value.trim();' +
    '  var lastName = document.getElementById("guestLastName").value.trim();' +
    '  var email = document.getElementById("guestEmail").value.trim().toLowerCase();' +
    '  ' +
    '  if (!firstName) { showError("Please enter guest first name"); return; }' +
    '  if (!lastName) { showError("Please enter guest last name"); return; }' +
    '  if (!email || !email.includes("@")) { showError("Please enter a valid email"); return; }' +
    '  ' +
    '  if (guests.length >= maxGuests) { showError("Maximum guests reached"); return; }' +
    '  ' +
    '  for (var i = 0; i < guests.length; i++) {' +
    '    if (guests[i].email.toLowerCase() === email) { showError("This email is already a guest"); return; }' +
    '  }' +
    '  ' +
    '  document.getElementById("addBtn").disabled = true;' +
    '  document.getElementById("addBtn").innerHTML = \'<i class="fas fa-spinner fa-spin"></i> Adding...\';' +
    '  ' +
    '  google.script.run' +
    '    .withSuccessHandler(function(result) {' +
    '      document.getElementById("addBtn").disabled = false;' +
    '      document.getElementById("addBtn").innerHTML = \'<i class="fas fa-plus"></i> Add Guest\';' +
    '      if (result.success) {' +
    '        guests.push(result.guest);' +
    '        renderGuests();' +
    '        showSuccess("Guest added successfully!");' +
    '        document.getElementById("guestFirstName").value = "";' +
    '        document.getElementById("guestLastName").value = "";' +
    '        document.getElementById("guestEmail").value = "";' +
    '        document.getElementById("tempPinValue").textContent = result.tempPin;' +
    '        document.getElementById("pinDisplay").style.display = "block";' +
    '      } else { showError(result.message); }' +
    '    })' +
    '    .withFailureHandler(function(err) {' +
    '      document.getElementById("addBtn").disabled = false;' +
    '      document.getElementById("addBtn").innerHTML = \'<i class="fas fa-plus"></i> Add Guest\';' +
    '      showError("Error: " + err.message);' +
    '    })' +
    '    .MM_addGuest(firstName, lastName, email);' +
    '}' +
    
    'function removeGuest(idx) {' +
    '  if (!confirm("Remove this guest? They will no longer have access.")) return;' +
    '  hideMessages();' +
    '  ' +
    '  var email = guests[idx].email;' +
    '  google.script.run' +
    '    .withSuccessHandler(function(result) {' +
    '      if (result.success) {' +
    '        guests.splice(idx, 1);' +
    '        renderGuests();' +
    '        showSuccess("Guest removed");' +
    '      } else { showError(result.message); }' +
    '    })' +
    '    .withFailureHandler(function(err) { showError("Error: " + err.message); })' +
    '    .MM_removeGuest(email);' +
    '}' +
    
    'renderGuests();' +
    '</script>' +
    '</body>' +
    '</html>';
}

/**
 * Add a guest (called from UI)
 * Uses Web App to write to MASTER HUB GUEST MANAGEMENT sheet
 */
function MM_addGuest(firstName, lastName, email) {
  try {
    var normalizedEmail = MM_normEmail_(email);
    var props = MM_getProps_();
    var primaryEmail = props.getProperty('mm_primary_email');
    
    // Generate temporary 4-digit PIN
    var tempPin = String(Math.floor(1000 + Math.random() * 9000));
    
    // Get existing guests from local storage
    var guests = [];
    try {
      var guestsJson = props.getProperty('mm_guests_json');
      if (guestsJson) guests = JSON.parse(guestsJson);
    } catch (e) {}
    
    // Check limit
    if (guests.length >= MAX_GUESTS) {
      return { success: false, message: 'Maximum ' + MAX_GUESTS + ' guests allowed' };
    }
    
    // Check if already exists locally
    for (var i = 0; i < guests.length; i++) {
      if (MM_normEmail_(guests[i].email) === normalizedEmail) {
        return { success: false, message: 'This email is already a guest' };
      }
    }
    
    // Create guest record
    var guest = {
      firstName: firstName,
      lastName: lastName,
      email: normalizedEmail,
      tempPin: tempPin,
      registered: false,
      addedAt: new Date().toISOString()
    };
    
    // ═══════════════════════════════════════════════════════════════
    // SYNC TO MASTER HUB via Web App (same flow as registration)
    // ═══════════════════════════════════════════════════════════════
    if (typeof MH_createGuest === 'function') {
      try {
        Logger.log('🔄 Syncing guest to MASTER HUB via Web App...');
        var hubResult = MH_createGuest({
          mainClientEmail: primaryEmail,
          guestEmail: normalizedEmail,
          guestFirstName: firstName,
          guestLastName: lastName,
          tempPin: tempPin,
          relationship: 'Guest',
          optedIn: false
        });
        
        if (hubResult.success) {
          Logger.log('✅ Guest synced to MASTER HUB');
        } else {
          Logger.log('⚠️ MASTER HUB sync failed (non-critical): ' + (hubResult.error || 'Unknown'));
          // Continue anyway - local storage will work
        }
      } catch (hubError) {
        Logger.log('⚠️ MASTER HUB sync error (non-critical): ' + hubError.message);
        // Continue anyway - local storage will work
      }
    }
    
    // Store locally (always works)
    guests.push(guest);
    props.setProperty('mm_guests_json', JSON.stringify(guests));
    
    Logger.log('✅ Guest added: ' + normalizedEmail + ' (PIN: ' + tempPin + ')');
    
    return { 
      success: true, 
      message: 'Guest added successfully',
      guest: guest,
      tempPin: tempPin
    };
    
  } catch (e) {
    Logger.log('MM_addGuest error: ' + e.message);
    return { success: false, message: 'Error adding guest: ' + e.message };
  }
}

/**
 * Remove a guest (called from UI)
 */
function MM_removeGuest(email) {
  try {
    var normalizedEmail = MM_normEmail_(email);
    var props = MM_getProps_();
    
    var guests = [];
    try {
      var guestsJson = props.getProperty('mm_guests_json');
      if (guestsJson) guests = JSON.parse(guestsJson);
    } catch (e) {}
    
    // Filter out the guest
    var newGuests = guests.filter(function(g) {
      return MM_normEmail_(g.email) !== normalizedEmail;
    });
    
    if (newGuests.length === guests.length) {
      return { success: false, message: 'Guest not found' };
    }
    
    props.setProperty('mm_guests_json', JSON.stringify(newGuests));
    
    // Also remove their PIN hash if it exists
    props.deleteProperty('mm_pin_hash_' + normalizedEmail);
    
    Logger.log('✅ Guest removed: ' + normalizedEmail);
    
    return { success: true, message: 'Guest removed' };
    
  } catch (e) {
    Logger.log('MM_removeGuest error: ' + e.message);
    return { success: false, message: 'Error removing guest: ' + e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// LOGOUT FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Logout current user - clear all session data
 * User must reload sheet to log in again
 */
function MM_logout() {
  try {
    var email = Session.getActiveUser().getEmail();
    var normalizedEmail = MM_normEmail_(email);
    
    Logger.log('🚪 [LOGOUT] User logging out: ' + normalizedEmail);
    
    // Clear user properties
    var userProps = _mm_safeUserProps_();
    if (userProps) {
      var allProps = userProps.getProperties();
      var keysToDelete = [];
      
      // Find all keys for this user
      for (var key in allProps) {
        if (key.indexOf(normalizedEmail) > -1 || key.indexOf('mm_' + normalizedEmail) === 0) {
          keysToDelete.push(key);
        }
      }
      
      // Delete them
      for (var i = 0; i < keysToDelete.length; i++) {
        userProps.deleteProperty(keysToDelete[i]);
      }
      
      Logger.log('✅ [LOGOUT] Cleared ' + keysToDelete.length + ' user properties');
    }
    
    // Show confirmation
    SpreadsheetApp.getUi().alert(
      'Logged Out',
      'You have been logged out successfully.\n\nReload the sheet to log in again.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    Logger.log('✅ [LOGOUT] Logout complete');
    
  } catch (e) {
    Logger.log('❌ [LOGOUT] Error: ' + e.message);
    SpreadsheetApp.getUi().alert(
      'Logout Error',
      'Error during logout: ' + e.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD DISPLAY FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Show the main dashboard after successful authentication
 * 
 * NOTE: The actual MM_showDashboard() is defined in Code.gs and shows the DashboardHTML modal.
 * This function is removed to avoid duplicate function definitions.
 * 
 * After successful auth, MM_showDashboard() from Code.gs will be called,
 * which opens the full dashboard modal dialog.
 */
// MM_showDashboard is defined in Code.gs - do not duplicate here

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD ALERTS & DATE FILTERING - Added for Issue #1
// ═══════════════════════════════════════════════════════════════════

/**
 * Get transaction alerts for the dashboard
 * Validates transactions and returns those with missing required fields
 * 
 * @returns {Object} Alerts object with incompleteTransactions array
 */
function MM_getTransactionAlerts() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var incompleteTransactions = [];
    
    // Define transaction sheets to check
    var transactionSheets = [
      'Income Transactions',
      'Expense Transactions'
    ];
    
    // Check each transaction sheet
    transactionSheets.forEach(function(sheetName) {
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) return;
      
      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();
      
      // Skip header row, start from row 2 (index 1)
      for (var i = 1; i < values.length; i++) {
        var row = values[i];
        
        // Typical column structure: A=Date, B=Description, C=Amount, D=Category
        var date = row[0];
        var description = row[1];
        var amount = row[2];
        var category = row[3];
        
        // Check if row has ANY data
        var hasAnyData = date || description || amount || category;
        
        if (!hasAnyData) continue; // Skip completely empty rows
        
        // Check for missing required fields
        var missingFields = [];
        if (!date) missingFields.push('Date');
        if (!description) missingFields.push('Description');
        if (!amount && amount !== 0) missingFields.push('Amount');
        
        // If any required fields are missing, this is an incomplete transaction
        if (missingFields.length > 0) {
          incompleteTransactions.push({
            sheetName: sheetName,
            rowIndex: i + 1, // +1 for 1-based row numbering
            date: date ? formatDateForDisplay(date) : null,
            description: description || null,
            amount: amount ? Number(amount).toFixed(2) : null,
            category: category || null,
            missingFields: missingFields
          });
        }
      }
    });
    
    Logger.log('MM_getTransactionAlerts: Found ' + incompleteTransactions.length + ' incomplete transactions');
    
    return {
      incompleteTransactions: incompleteTransactions,
      totalAlerts: incompleteTransactions.length
    };
    
  } catch (e) {
    Logger.log('MM_getTransactionAlerts ERROR: ' + e.message);
    return {
      incompleteTransactions: [],
      totalAlerts: 0,
      error: e.message
    };
  }
}

/**
 * Navigate to a specific transaction in the spreadsheet
 * 
 * @param {string} sheetName - Name of the sheet
 * @param {number} rowIndex - Row number (1-based)
 */
function MM_navigateToTransaction(sheetName, rowIndex) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error('Sheet not found: ' + sheetName);
    }
    
    // Navigate to the row
    var range = sheet.getRange(rowIndex, 1);
    sheet.setActiveRange(range);
    ss.setActiveSheet(sheet);
    
    // Scroll to make the row visible
    sheet.getRange(rowIndex, 1).activate();
    
    Logger.log('MM_navigateToTransaction: Navigated to ' + sheetName + ' row ' + rowIndex);
    
  } catch (e) {
    Logger.log('MM_navigateToTransaction ERROR: ' + e.message);
    throw new Error('Could not navigate to transaction: ' + e.message);
  }
}

/**
 * Get dashboard data filtered by custom date range
 * 
 * @param {string} startDate - Start date (YYYY-MM-DD format)
 * @param {string} endDate - End date (YYYY-MM-DD format)
 * @returns {Object} Dashboard data for the specified date range
 */
function MM_apiGetDashboardDataByDateRange(startDate, endDate) {
  try {
    var startTime = new Date().getTime();
    Logger.log('🚀 MM_apiGetDashboardDataByDateRange START: ' + startDate + ' to ' + endDate);
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var start = new Date(startDate);
    var end = new Date(endDate);
    
    // Set end date to end of day
    end.setHours(23, 59, 59, 999);
    
    // Get filtered transactions
    Logger.log('📊 Fetching income transactions...');
    var t1 = new Date().getTime();
    var incomeTransactions = getTransactionsByDateRange('INCOME TRANSACTIONS', start, end);
    Logger.log('⏱️ Income transactions took ' + (new Date().getTime() - t1) + 'ms');
    
    Logger.log('📊 Fetching expense transactions...');
    var t2 = new Date().getTime();
    var expenseTransactions = getTransactionsByDateRange('EXPENSE TRANSACTIONS', start, end);
    Logger.log('⏱️ Expense transactions took ' + (new Date().getTime() - t2) + 'ms');
    
    // Calculate totals
    var totalIncome = incomeTransactions.reduce(function(sum, t) { return sum + Math.abs(Number(t.amount) || 0); }, 0);
    var totalExpenses = expenseTransactions.reduce(function(sum, t) { return sum + Math.abs(Number(t.amount) || 0); }, 0);
    var netIncome = totalIncome - totalExpenses;
    
    // Get top categories
    var topIncome = getTopCategoriesFromTransactions(incomeTransactions, 5);
    var topExpenses = getTopCategoriesFromTransactions(expenseTransactions, 5);
    
    // Get account balances (current, not filtered by date)
    Logger.log('📊 Fetching account balances...');
    var t3 = new Date().getTime();
    var accountBalances = getAccountBalances();
    Logger.log('⏱️ Account balances took ' + (new Date().getTime() - t3) + 'ms');
    
    // Build chart data by month for the date range
    var chartData = buildChartDataForDateRange(start, end, incomeTransactions, expenseTransactions);
    
    Logger.log('✅ MM_apiGetDashboardDataByDateRange COMPLETE in ' + (new Date().getTime() - startTime) + 'ms');
    
    // Format date range for display
    var options = { month: 'short', day: 'numeric', year: 'numeric' };
    var dateRange = start.toLocaleDateString('en-US', options) + ' - ' + end.toLocaleDateString('en-US', options);
    
    return {
      monthlyIncome: totalIncome,
      monthlyExpenses: totalExpenses,
      monthlyProfit: netIncome,
      totalIncome: totalIncome,
      totalExpenses: totalExpenses,
      netIncome: netIncome,
      topIncome: topIncome,
      topExpenses: topExpenses,
      accountBalances: accountBalances,
      chartData: chartData,
      dateRange: dateRange,
      totalErrors: 0,
      unlabeledCount: 0
    };
    
  } catch (e) {
    Logger.log('MM_apiGetDashboardDataByDateRange ERROR: ' + e.message);
    throw new Error('Error filtering dashboard data: ' + e.message);
  }
}

/**
 * Get transactions within a date range from a specific sheet
 * VERIFIED FROM 2026 Launch Version 1.0.xlsx
 * 
 * INCOME/EXPENSE TRANSACTIONS sheets:
 *   Row 13 = Headers, Row 15+ = Data
 *   C (3): Account Name
 *   D (4): Date
 *   E (5): Description
 *   F (6): Amount
 *   G (7): Assigned SubCategory
 *   H (8): Business Category
 *   I (9): Memo
 *   J (10): Desire or Need
 *   K (11): Main Category
 * 
 * @param {string} sheetName - Name of the transaction sheet
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} Array of transaction objects
 */
function getTransactionsByDateRange(sheetName, startDate, endDate) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      // Try alternate names (INCOME TRANSACTIONS, EXPENSE TRANSACTIONS)
      var altSheetName = sheetName.toUpperCase();
      sheet = ss.getSheetByName(altSheetName);
    }
    
    if (!sheet) {
      Logger.log('getTransactionsByDateRange: Sheet not found - ' + sheetName);
      return [];
    }
    
    // 2026 Launch Version: Row 13=Headers, Row 15+=Data
    // Columns: C=Account, D=Date, E=Description, F=Amount, G=SubCategory, H=BusinessCat, I=Memo, J=NeedDesire, K=MainCat
    var lastRow = sheet.getLastRow();
    if (lastRow < 15) {
      Logger.log('getTransactionsByDateRange: No data in ' + sheetName);
      return [];
    }
    
    // Read columns C through K (9 columns)
    var data = sheet.getRange(15, 3, lastRow - 14, 9).getValues();
    var transactions = [];
    
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var account = row[0];       // C - Account Name
      var date = row[1];          // D - Date
      var description = row[2];   // E - Description
      var amount = row[3];        // F - Amount
      var subCategory = row[4];   // G - Assigned SubCategory
      var bizCategory = row[5];   // H - Business Category
      var memo = row[6];          // I - Memo
      var needDesire = row[7];    // J - Desire or Need
      var mainCategory = row[8];  // K - Main Category
      
      // Skip empty rows or formula error rows (#REF!, #N/A)
      if (!date && !description) continue;
      if (String(account).indexOf('#') === 0 || String(date).indexOf('#') === 0) continue;
      
      // Parse date
      var transDate;
      try {
        transDate = new Date(date);
        if (isNaN(transDate.getTime())) continue;
      } catch (e) {
        continue;
      }
      
      // Check if date is within range
      if (transDate >= startDate && transDate <= endDate) {
        // Parse amount
        var parsedAmount = 0;
        if (typeof amount === 'number') {
          parsedAmount = amount;
        } else if (typeof amount === 'string') {
          parsedAmount = parseFloat(amount.replace(/[^0-9.-]/g, '')) || 0;
        }
        
        // Determine best category (business > main > sub)
        var bestCategory = String(bizCategory || '').trim();
        if (!bestCategory || bestCategory.indexOf('#') === 0) {
          bestCategory = String(mainCategory || '').trim();
        }
        if (!bestCategory || bestCategory.indexOf('#') === 0) {
          bestCategory = String(subCategory || 'Uncategorized').trim();
        }
        
        transactions.push({
          date: date,
          description: description,
          amount: parsedAmount,
          category: bestCategory,
          account: account,
          needDesire: needDesire
        });
      }
    }
    
    Logger.log('getTransactionsByDateRange: Found ' + transactions.length + ' transactions in ' + sheetName);
    return transactions;
    
  } catch (e) {
    Logger.log('getTransactionsByDateRange ERROR: ' + e.message);
    return [];
  }
}

/**
 * Get top categories from a list of transactions
 * 
 * @param {Array} transactions - Array of transaction objects
 * @param {number} limit - Number of top categories to return
 * @returns {Array} Array of category objects with totals
 */
function getTopCategoriesFromTransactions(transactions, limit) {
  try {
    var categoryTotals = {};
    
    transactions.forEach(function(t) {
      var category = t.category || 'Uncategorized';
      var amount = Math.abs(Number(t.amount) || 0);
      
      if (!categoryTotals[category]) {
        categoryTotals[category] = 0;
      }
      categoryTotals[category] += amount;
    });
    
    // Convert to array and sort
    var categories = Object.keys(categoryTotals).map(function(cat) {
      return {
        category: cat,
        amount: categoryTotals[cat]
      };
    });
    
    categories.sort(function(a, b) { return b.amount - a.amount; });
    
    return categories.slice(0, limit);
    
  } catch (e) {
    Logger.log('getTopCategoriesFromTransactions ERROR: ' + e.message);
    return [];
  }
}

/**
 * Build chart data for a custom date range
 * 
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {Array} incomeTransactions - Income transactions
 * @param {Array} expenseTransactions - Expense transactions
 * @returns {Object} Chart data with labels, income, and expenses
 */
function buildChartDataForDateRange(startDate, endDate, incomeTransactions, expenseTransactions) {
  try {
    // Calculate number of months in range
    var monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                     (endDate.getMonth() - startDate.getMonth()) + 1;
    
    var labels = [];
    var income = [];
    var expenses = [];
    
    // If range is less than 2 months, show as single period
    if (monthsDiff <= 1) {
      labels = ['Selected Period'];
      var totalIncome = incomeTransactions.reduce(function(sum, t) { return sum + Math.abs(Number(t.amount) || 0); }, 0);
      var totalExpenses = expenseTransactions.reduce(function(sum, t) { return sum + Math.abs(Number(t.amount) || 0); }, 0);
      income = [totalIncome];
      expenses = [totalExpenses];
    } else {
      // Build month-by-month data
      var currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        var monthName = currentDate.toLocaleDateString('en-US', { month: 'short' });
        var year = currentDate.getFullYear();
        labels.push(monthName + ' ' + year);
        
        var monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        var monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        
        // Calculate totals for this month
        var monthIncome = incomeTransactions
          .filter(function(t) {
            var d = new Date(t.date);
            return d >= monthStart && d <= monthEnd;
          })
          .reduce(function(sum, t) { return sum + Math.abs(Number(t.amount) || 0); }, 0);
        
        var monthExpenses = expenseTransactions
          .filter(function(t) {
            var d = new Date(t.date);
            return d >= monthStart && d <= monthEnd;
          })
          .reduce(function(sum, t) { return sum + Math.abs(Number(t.amount) || 0); }, 0);
        
        income.push(monthIncome);
        expenses.push(monthExpenses);
        
        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }
    
    return {
      labels: labels,
      income: income,
      expenses: expenses
    };
    
  } catch (e) {
    Logger.log('buildChartDataForDateRange ERROR: ' + e.message);
    return {
      labels: ['Error'],
      income: [0],
      expenses: [0]
    };
  }
}

/**
 * Get account balances from all ACCOUNT sheets
 * VERIFIED FROM 2026 Launch Version 1.0.xlsx
 * 
 * ACCOUNT sheets structure:
 *   C7: Account Name
 *   Row 10: Headers
 *   Row 11+: Data
 *   E (5): Amount column
 * 
 * @returns {Object} Map of account names to balances (sum of Amount column)
 */
function getAccountBalances() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    var balances = {};
    
    sheets.forEach(function(sheet) {
      var sheetName = sheet.getName();
      if (sheetName.match(/^ACCOUNT \d+$/i)) {
        // Get account name from C7
        var accountName = sheet.getRange('C7').getValue();
        if (accountName && String(accountName).trim() !== '') {
          accountName = String(accountName).trim();
          
          // Calculate balance by summing Amount column (E, column 5) from row 11+
          var lastRow = sheet.getLastRow();
          var balance = 0;
          
          if (lastRow >= 11) {
            var amounts = sheet.getRange(11, 5, lastRow - 10, 1).getValues();
            for (var i = 0; i < amounts.length; i++) {
              var amt = amounts[i][0];
              if (typeof amt === 'number' && !isNaN(amt)) {
                balance += amt;
              }
            }
          }
          
          balances[accountName] = balance;
        }
      }
    });
    
    return balances;
    
  } catch (e) {
    Logger.log('getAccountBalances ERROR: ' + e.message);
    return {};
  }
}

/**
 * Format date for display
 * 
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
function formatDateForDisplay(date) {
  if (!date) return '';
  
  try {
    var d = new Date(date);
    var options = { month: 'short', day: 'numeric', year: 'numeric' };
    return d.toLocaleDateString('en-US', options);
  } catch (e) {
    return String(date);
  }
}
