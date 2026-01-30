/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * MFA.GS - Multi-Factor Authentication & PIN Reset
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * This file contains all MFA (Multi-Factor Authentication) functions
 * using Resend email API for verification codes.
 * 
 * Features:
 * - 6-digit verification codes
 * - 5-minute code expiry
 * - Rate limiting (1 code per minute)
 * - Max 3 attempts per code
 * - PIN reset flow
 * - Session management (24-hour sessions)
 * - MASTER OVERRIDE KEY for admin testing
 * 
 * Dependencies:
 * - RESEND_CONFIG from Code.gs
 * - _mm_safeScriptProps_() from Code.gs
 */

// ═══════════════════════════════════════════════════════════════════
// MASTER OVERRIDE KEY SYSTEM (FOR ADMIN TESTING)
// ═══════════════════════════════════════════════════════════════════
// This generates a daily master key that works for ANY email's MFA
// The key is sent to the admin email via Resend

var MFA_ADMIN_CONFIG = {
  ADMIN_EMAIL: 'donnaroggio1111@gmail.com',  // Where to send master keys
  MASTER_KEY_PREFIX: 'MASTER'  // Master codes start with this
};

/**
 * Generate today's master override key
 * Format: MASTER + YYMMDD (e.g., MASTER251230)
 */
function _mm_getMasterKey_() {
  var today = new Date();
  var yy = String(today.getFullYear()).slice(-2);
  var month = today.getMonth() + 1;
  var day = today.getDate();
  var mm = (month < 10 ? '0' : '') + month;
  var dd = (day < 10 ? '0' : '') + day;
  return MFA_ADMIN_CONFIG.MASTER_KEY_PREFIX + yy + mm + dd;
}

/**
 * Check if a code is the master override key
 */
function _mm_isMasterKey_(code) {
  if (!code) return false;
  var masterKey = _mm_getMasterKey_();
  return code.trim().toUpperCase() === masterKey;
}

/**
 * PUBLIC API: Send master override key to admin email
 * Run this function to get today's master key sent to your email
 */
function MM_sendMasterKeyToAdmin() {
  var masterKey = _mm_getMasterKey_();
  var adminEmail = MFA_ADMIN_CONFIG.ADMIN_EMAIL;
  
  var htmlContent = '<div style="font-family: Montserrat, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">' +
    '<div style="background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">' +
    '<h1 style="color: white; margin: 0; font-size: 24px;">🔑 MASTER OVERRIDE KEY</h1>' +
    '</div>' +
    '<div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">' +
    '<p style="color: #333; font-size: 16px; line-height: 1.6;">' +
    'Use this master key to bypass MFA for ANY user account during testing:' +
    '</p>' +
    '<div style="background: #fff; border: 2px solid #e53e3e; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">' +
    '<span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #e53e3e;">' + masterKey + '</span>' +
    '</div>' +
    '<p style="color: #666; font-size: 14px; text-align: center;">' +
    '⏰ This key is valid for TODAY only (' + new Date().toLocaleDateString() + ')' +
    '</p>' +
    '<p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center;">' +
    '⚠️ Keep this key secure. It bypasses MFA for all accounts.' +
    '</p>' +
    '</div>' +
    '</div>';
  
  try {
    var response = UrlFetchApp.fetch(RESEND_CONFIG.API_BASE + '/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + RESEND_CONFIG.API_KEY,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        from: RESEND_CONFIG.FROM_NAME + ' <' + RESEND_CONFIG.FROM_EMAIL + '>',
        to: [adminEmail],
        subject: '🔑 Master Override Key - ' + new Date().toLocaleDateString(),
        html: htmlContent
      }),
      muteHttpExceptions: true
    });
    
    var responseCode = response.getResponseCode();
    if (responseCode === 200 || responseCode === 201) {
      Logger.log('Master key sent to: ' + adminEmail);
      return { success: true, message: 'Master key sent to ' + adminEmail };
    } else {
      Logger.log('Failed to send master key: ' + response.getContentText());
      return { success: false, message: 'Failed to send email' };
    }
  } catch (e) {
    Logger.log('Error sending master key: ' + e.message);
    return { success: false, message: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// MFA HELPER FUNCTIONS (PRIVATE)
// ═══════════════════════════════════════════════════════════════════

/**
 * Generate a 6-digit MFA code
 */
function _mm_generateMFACode_() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Store MFA code with expiration
 * @param {string} email - User's email
 * @param {string} code - 6-digit code
 * @param {string} type - 'login' or 'reset'
 */
function _mm_storeMFACode_(email, code, type) {
  var props = _mm_safeScriptProps_();
  var key = 'mm_mfa_' + type + '_' + email.toLowerCase().trim();
  var data = {
    code: code,
    createdAt: Date.now(),
    attempts: 0
  };
  props.setProperty(key, JSON.stringify(data));
  Logger.log('MFA code stored for ' + email + ' (type: ' + type + ')');
}

/**
 * Get stored MFA code data
 * @param {string} email - User's email  
 * @param {string} type - 'login' or 'reset'
 */
function _mm_getMFACode_(email, type) {
  var props = _mm_safeScriptProps_();
  var key = 'mm_mfa_' + type + '_' + email.toLowerCase().trim();
  var data = props.getProperty(key);
  if (!data) return null;
  return JSON.parse(data);
}

/**
 * Clear MFA code after use or expiry
 * @param {string} email - User's email
 * @param {string} type - 'login' or 'reset'
 */
function _mm_clearMFACode_(email, type) {
  var props = _mm_safeScriptProps_();
  var key = 'mm_mfa_' + type + '_' + email.toLowerCase().trim();
  props.deleteProperty(key);
}

/**
 * Check rate limiting for MFA requests
 * @param {string} email - User's email
 * @param {string} type - 'login' or 'reset'
 * @returns {object} - { allowed: boolean, waitSeconds: number }
 */
function _mm_checkMFARateLimit_(email, type) {
  var data = _mm_getMFACode_(email, type);
  if (!data) return { allowed: true, waitSeconds: 0 };
  
  var elapsed = (Date.now() - data.createdAt) / 1000;
  var waitTime = RESEND_CONFIG.RATE_LIMIT_MINUTES * 60;
  
  if (elapsed < waitTime) {
    return { allowed: false, waitSeconds: Math.ceil(waitTime - elapsed) };
  }
  return { allowed: true, waitSeconds: 0 };
}

// ═══════════════════════════════════════════════════════════════════
// EMAIL SENDING VIA RESEND API
// ═══════════════════════════════════════════════════════════════════

/**
 * Send MFA code via Resend API
 * @param {string} email - Recipient email
 * @param {string} code - 6-digit code
 * @param {string} type - 'login' or 'reset'
 * @returns {object} - { success: boolean, message: string }
 */
function _mm_sendEmailViaResend_(email, code, type) {
  var subject = type === 'reset' 
    ? 'Reset Your PIN - Money Mastery'
    : 'Your Login Verification Code - Money Mastery';
  
  var year = new Date().getFullYear();
  var expiry = RESEND_CONFIG.CODE_EXPIRY_MINUTES;
  
  var htmlContent;
  if (type === 'reset') {
    htmlContent = '<div style="font-family: Montserrat, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">' +
      '<div style="background: linear-gradient(135deg, #ab9478 0%, #8b7860 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">' +
      '<h1 style="color: white; margin: 0; font-size: 24px;">🔐 Reset Your PIN</h1>' +
      '</div>' +
      '<div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">' +
      '<p style="color: #333; font-size: 16px; line-height: 1.6;">' +
      'You requested to reset your PIN for Money Mastery. Use the code below to verify your identity:' +
      '</p>' +
      '<div style="background: #fff; border: 2px solid #ab9478; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">' +
      '<span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #ab9478;">' + code + '</span>' +
      '</div>' +
      '<p style="color: #666; font-size: 14px; text-align: center;">' +
      '⏰ This code expires in <strong>' + expiry + ' minutes</strong>' +
      '</p>' +
      '<p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center;">' +
      'If you did not request this, please ignore this email. Your account is secure.' +
      '</p>' +
      '</div>' +
      '<p style="color: #999; font-size: 11px; text-align: center; margin-top: 20px;">' +
      '© ' + year + ' Donna Roggio LLC. All rights reserved.' +
      '</p>' +
      '</div>';
  } else {
    htmlContent = '<div style="font-family: Montserrat, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">' +
      '<div style="background: linear-gradient(135deg, #ab9478 0%, #8b7860 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">' +
      '<h1 style="color: white; margin: 0; font-size: 24px;">🔒 Login Verification</h1>' +
      '</div>' +
      '<div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">' +
      '<p style="color: #333; font-size: 16px; line-height: 1.6;">' +
      'Enter the following code to complete your login to Money Mastery:' +
      '</p>' +
      '<div style="background: #fff; border: 2px solid #ab9478; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">' +
      '<span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #ab9478;">' + code + '</span>' +
      '</div>' +
      '<p style="color: #666; font-size: 14px; text-align: center;">' +
      '⏰ This code expires in <strong>' + expiry + ' minutes</strong>' +
      '</p>' +
      '<p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center;">' +
      'If you did not try to log in, please change your PIN immediately.' +
      '</p>' +
      '</div>' +
      '<p style="color: #999; font-size: 11px; text-align: center; margin-top: 20px;">' +
      '© ' + year + ' Donna Roggio LLC. All rights reserved.' +
      '</p>' +
      '</div>';
  }
  
  try {
    var response = UrlFetchApp.fetch(RESEND_CONFIG.API_BASE + '/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + RESEND_CONFIG.API_KEY,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        from: RESEND_CONFIG.FROM_NAME + ' <' + RESEND_CONFIG.FROM_EMAIL + '>',
        to: [email],
        subject: subject,
        html: htmlContent
      }),
      muteHttpExceptions: true
    });
    
    var responseCode = response.getResponseCode();
    var responseBody = response.getContentText();
    
    Logger.log('Resend API response: ' + responseCode + ' - ' + responseBody);
    
    if (responseCode === 200 || responseCode === 201) {
      return { success: true, message: 'Verification code sent to your email' };
    } else {
      var errorData = JSON.parse(responseBody);
      return { success: false, message: errorData.message || 'Failed to send email' };
    }
  } catch (e) {
    Logger.log('Resend API error: ' + e.message);
    return { success: false, message: 'Email service error: ' + e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API: LOGIN MFA
// ═══════════════════════════════════════════════════════════════════

/**
 * PUBLIC API: Send MFA code for login verification
 * Called after PIN is verified successfully
 * @param {string} email - User's email
 * @returns {object} - { success: boolean, message: string }
 */
function MM_sendLoginMFACode(email) {
  var normalizedEmail = email.toLowerCase().trim();
  
  // Check rate limit
  var rateLimit = _mm_checkMFARateLimit_(normalizedEmail, 'login');
  if (!rateLimit.allowed) {
    return { 
      success: false, 
      message: 'Please wait ' + rateLimit.waitSeconds + ' seconds before requesting a new code' 
    };
  }
  
  // Generate and store code
  var code = _mm_generateMFACode_();
  _mm_storeMFACode_(normalizedEmail, code, 'login');
  
  // Send email
  var result = _mm_sendEmailViaResend_(normalizedEmail, code, 'login');
  
  if (!result.success) {
    _mm_clearMFACode_(normalizedEmail, 'login');
  }
  
  return result;
}

/**
 * PUBLIC API: Verify MFA code for login
 * @param {string} email - User's email
 * @param {string} code - Code entered by user
 * @returns {object} - { success: boolean, message: string }
 */
function MM_verifyLoginMFACode(email, code) {
  var normalizedEmail = email.toLowerCase().trim();
  
  // ✅ CHECK MASTER OVERRIDE KEY FIRST
  if (_mm_isMasterKey_(code)) {
    Logger.log('MASTER KEY USED for login: ' + normalizedEmail);
    _mm_clearMFACode_(normalizedEmail, 'login');
    _mm_setSessionAuthenticated_(normalizedEmail);
    return { success: true, message: 'Master key accepted!' };
  }
  
  var data = _mm_getMFACode_(normalizedEmail, 'login');
  
  if (!data) {
    return { success: false, message: 'No verification code found. Please request a new one.' };
  }
  
  // Check expiration
  var elapsed = (Date.now() - data.createdAt) / 1000 / 60; // in minutes
  if (elapsed > RESEND_CONFIG.CODE_EXPIRY_MINUTES) {
    _mm_clearMFACode_(normalizedEmail, 'login');
    return { success: false, message: 'Code has expired. Please request a new one.' };
  }
  
  // Check attempts
  if (data.attempts >= RESEND_CONFIG.MAX_ATTEMPTS) {
    _mm_clearMFACode_(normalizedEmail, 'login');
    return { success: false, message: 'Too many attempts. Please request a new code.' };
  }
  
  // Verify code
  if (data.code === code.trim()) {
    _mm_clearMFACode_(normalizedEmail, 'login');
    
    // Mark session as fully authenticated (MFA complete)
    _mm_setSessionAuthenticated_(normalizedEmail);
    
    return { success: true, message: 'Verification successful!' };
  }
  
  // Increment attempts
  data.attempts++;
  var props = _mm_safeScriptProps_();
  var key = 'mm_mfa_login_' + normalizedEmail;
  props.setProperty(key, JSON.stringify(data));
  
  var remaining = RESEND_CONFIG.MAX_ATTEMPTS - data.attempts;
  return { 
    success: false, 
    message: 'Invalid code. ' + remaining + ' attempt(s) remaining.' 
  };
}

// ═══════════════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

/**
 * Mark session as fully authenticated after MFA
 */
function _mm_setSessionAuthenticated_(email) {
  var props = _mm_safeScriptProps_();
  var sessionKey = 'mm_session_' + email.toLowerCase().trim();
  var sessionData = {
    email: email,
    authenticatedAt: Date.now(),
    mfaVerified: true
  };
  props.setProperty(sessionKey, JSON.stringify(sessionData));
  Logger.log('Session authenticated for: ' + email);
}

/**
 * Check if user has completed MFA
 */
function _mm_isSessionFullyAuthenticated_(email) {
  if (!email) return false;
  var props = _mm_safeScriptProps_();
  var sessionKey = 'mm_session_' + email.toLowerCase().trim();
  var data = props.getProperty(sessionKey);
  if (!data) return false;
  
  try {
    var session = JSON.parse(data);
    // Session valid for 24 hours
    var elapsed = (Date.now() - session.authenticatedAt) / 1000 / 60 / 60;
    return session.mfaVerified && elapsed < 24;
  } catch (e) {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API: PIN RESET
// ═══════════════════════════════════════════════════════════════════

/**
 * PUBLIC API: Send PIN reset code
 * @param {string} email - User's email
 * @returns {object} - { success: boolean, message: string }
 */
function MM_sendPinResetCode(email) {
  var normalizedEmail = email.toLowerCase().trim();
  
  // Check if user exists
  var props = _mm_safeScriptProps_();
  var userData = props.getProperty('mm_user_' + normalizedEmail);
  if (!userData) {
    // Don't reveal if user exists or not for security
    return { success: true, message: 'If an account exists with this email, a reset code has been sent.' };
  }
  
  // Check rate limit
  var rateLimit = _mm_checkMFARateLimit_(normalizedEmail, 'reset');
  if (!rateLimit.allowed) {
    return { 
      success: false, 
      message: 'Please wait ' + rateLimit.waitSeconds + ' seconds before requesting a new code' 
    };
  }
  
  // Generate and store code
  var code = _mm_generateMFACode_();
  _mm_storeMFACode_(normalizedEmail, code, 'reset');
  
  // Send email
  var result = _mm_sendEmailViaResend_(normalizedEmail, code, 'reset');
  
  if (!result.success) {
    _mm_clearMFACode_(normalizedEmail, 'reset');
    return result;
  }
  
  return { success: true, message: 'If an account exists with this email, a reset code has been sent.' };
}

/**
 * PUBLIC API: Verify PIN reset code
 * @param {string} email - User's email
 * @param {string} code - Code entered by user
 * @returns {object} - { success: boolean, message: string, resetToken: string }
 */
function MM_verifyPinResetCode(email, code) {
  var normalizedEmail = email.toLowerCase().trim();
  
  // ✅ CHECK MASTER OVERRIDE KEY FIRST
  if (_mm_isMasterKey_(code)) {
    Logger.log('MASTER KEY USED for PIN reset: ' + normalizedEmail);
    _mm_clearMFACode_(normalizedEmail, 'reset');
    var resetToken = Utilities.getUuid();
    var props = _mm_safeScriptProps_();
    props.setProperty('mm_reset_token_' + normalizedEmail, JSON.stringify({
      token: resetToken,
      createdAt: Date.now()
    }));
    return { 
      success: true, 
      message: 'Master key accepted! You can now set a new PIN.',
      resetToken: resetToken
    };
  }
  
  var data = _mm_getMFACode_(normalizedEmail, 'reset');
  
  if (!data) {
    return { success: false, message: 'No reset code found. Please request a new one.' };
  }
  
  // Check expiration
  var elapsed = (Date.now() - data.createdAt) / 1000 / 60;
  if (elapsed > RESEND_CONFIG.CODE_EXPIRY_MINUTES) {
    _mm_clearMFACode_(normalizedEmail, 'reset');
    return { success: false, message: 'Code has expired. Please request a new one.' };
  }
  
  // Check attempts
  if (data.attempts >= RESEND_CONFIG.MAX_ATTEMPTS) {
    _mm_clearMFACode_(normalizedEmail, 'reset');
    return { success: false, message: 'Too many attempts. Please request a new code.' };
  }
  
  // Verify code
  if (data.code === code.trim()) {
    // Don't clear yet - create a reset token
    var resetToken = Utilities.getUuid();
    var props = _mm_safeScriptProps_();
    props.setProperty('mm_reset_token_' + normalizedEmail, JSON.stringify({
      token: resetToken,
      createdAt: Date.now()
    }));
    
    _mm_clearMFACode_(normalizedEmail, 'reset');
    
    return { 
      success: true, 
      message: 'Code verified! You can now set a new PIN.',
      resetToken: resetToken
    };
  }
  
  // Increment attempts
  data.attempts++;
  var props = _mm_safeScriptProps_();
  var key = 'mm_mfa_reset_' + normalizedEmail;
  props.setProperty(key, JSON.stringify(data));
  
  var remaining = RESEND_CONFIG.MAX_ATTEMPTS - data.attempts;
  return { 
    success: false, 
    message: 'Invalid code. ' + remaining + ' attempt(s) remaining.' 
  };
}

/**
 * PUBLIC API: Reset PIN with verified token
 * @param {string} email - User's email
 * @param {string} resetToken - Token from verification step
 * @param {string} newPin - New PIN (4-6 digits)
 * @returns {object} - { success: boolean, message: string }
 */
function MM_resetPin(email, resetToken, newPin) {
  var normalizedEmail = email.toLowerCase().trim();
  
  // Validate PIN format
  if (!newPin || !/^\d{4,6}$/.test(newPin)) {
    return { success: false, message: 'PIN must be 4-6 digits' };
  }
  
  // Verify reset token
  var props = _mm_safeScriptProps_();
  var tokenData = props.getProperty('mm_reset_token_' + normalizedEmail);
  
  if (!tokenData) {
    return { success: false, message: 'Invalid or expired reset session. Please start over.' };
  }
  
  try {
    var token = JSON.parse(tokenData);
    
    // Check token matches
    if (token.token !== resetToken) {
      return { success: false, message: 'Invalid reset token.' };
    }
    
    // Check token expiry (10 minutes)
    var elapsed = (Date.now() - token.createdAt) / 1000 / 60;
    if (elapsed > 10) {
      props.deleteProperty('mm_reset_token_' + normalizedEmail);
      return { success: false, message: 'Reset session expired. Please start over.' };
    }
    
    // Update user's PIN in script properties
    var userData = props.getProperty('mm_user_' + normalizedEmail);
    if (userData) {
      var user = JSON.parse(userData);
      user.pin = newPin;
      user.pinUpdatedAt = new Date().toISOString();
      props.setProperty('mm_user_' + normalizedEmail, JSON.stringify(user));
    }
    
    // Also update the PIN hash in document properties (used by login)
    var docProps = _mm_safeDocProps_();
    var pinHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, newPin + normalizedEmail);
    var pinHashString = pinHash.map(function(byte) {
      return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
    docProps.setProperty('mm_pin_hash_' + normalizedEmail, pinHashString);
    
    // Clear reset token
    props.deleteProperty('mm_reset_token_' + normalizedEmail);
    
    Logger.log('PIN reset successful for: ' + normalizedEmail);
    
    return { success: true, message: 'Your PIN has been reset successfully! You can now log in.' };
    
  } catch (e) {
    Logger.log('PIN reset error: ' + e.message);
    return { success: false, message: 'An error occurred. Please try again.' };
  }
}

/**
 * PUBLIC API: Resend MFA code
 * @param {string} email - User's email
 * @param {string} type - 'login' or 'reset'
 * @returns {object} - { success: boolean, message: string }
 */
function MM_resendMFACode(email, type) {
  if (type === 'reset') {
    return MM_sendPinResetCode(email);
  } else {
    return MM_sendLoginMFACode(email);
  }
}
