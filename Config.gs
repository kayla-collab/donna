/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * CONFIG.GS - Configuration & Constants
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════
// DEBUG MODE - Set to false in production
// ═══════════════════════════════════════════════════════════════════
var DEBUG_MODE = false;

/** Concise logger - only logs when DEBUG_MODE is true or level is 'error' */
function _log(msg, level) {
  level = level || 'info';
  if (DEBUG_MODE || level === 'error') {
    Logger.log((level === 'error' ? '❌ ' : '') + msg);
  }
}

/** Log error (always logs) */
function _logError(msg) { _log(msg, 'error'); }

/** Log info (only in debug mode) */
function _logInfo(msg) { if (DEBUG_MODE) Logger.log(msg); }

// ═══════════════════════════════════════════════════════════════════
// 🔗 LINKS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════
// These links can be updated via the LINKS sheet or directly here
// Default values provided - update before client deployment
var PLACEHOLDER_LINKS = {
  MEMBERSHIP_HUB: "https://risingandthriving.com/membership",
  COLLECTIVE: "https://risingandthriving.com/collective", 
  TUTORIAL_VIDEO: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",  // Update with actual tutorial
  FULL_DEMO: "https://risingandthriving.com/demo",  // Full product demo video
  HELP_GUIDEBOOK: "https://risingandthriving.com/help",
  SUPPORT_EMAIL: "support@risingandthriving.com"
};

/**
 * Get link from LINKS sheet if available, fallback to PLACEHOLDER_LINKS
 * @param {string} linkKey - Key name (e.g., 'TUTORIAL_VIDEO')
 * @returns {string} - URL or email address
 */
function getConfigLink(linkKey) {
  try {
    // Try to get from LINKS sheet first
    if (typeof getLink === 'function') {
      var sheetLink = getLink(linkKey);
      if (sheetLink && sheetLink !== '' && sheetLink.indexOf('http') === 0) {
        return sheetLink;
      }
    }
  } catch (e) {
    // LINKS sheet doesn't exist or getLink not available, use fallback
  }
  
  // Fallback to PLACEHOLDER_LINKS
  return PLACEHOLDER_LINKS[linkKey] || '';
}

// ═══════════════════════════════════════════════════════════════════
// BANK CONNECTION CONFIGURATION - DEPRECATED
// ═══════════════════════════════════════════════════════════════════
// NOTE: Money Mastery uses MANUAL TRANSACTION ENTRY only.
// No automatic bank sync (no Plaid, no Stripe, no Teller).
// Users enter transactions directly into ACCOUNT sheets.
//
// This stub exists for backward compatibility only.
var STRIPE_CONFIG = {
  _DEPRECATED: true,
  _MESSAGE: 'Bank sync disabled. Money Mastery uses manual transaction entry only.',
  API_KEY: '',
  API_BASE: '',
  SYNC_DAYS: 0
};

// ═══════════════════════════════════════════════════════════════════
// PLAID API CONFIGURATION - DEPRECATED
// ═══════════════════════════════════════════════════════════════════
/**
 * @deprecated Bank sync disabled. Money Mastery uses manual transaction entry only.
 */
var PLAID_CONFIG = {
  _DEPRECATED: true,
  _MESSAGE: 'Bank sync disabled. Money Mastery uses manual transaction entry only.'
};

// ═══════════════════════════════════════════════════════════════════
// TELLER API CONFIGURATION - DEPRECATED
// ═══════════════════════════════════════════════════════════════════
/**
 * @deprecated Bank sync disabled. Money Mastery uses manual transaction entry only.
 */
var TELLER_CONFIG = {
  _DEPRECATED: true,
  _MESSAGE: 'Bank sync disabled. Money Mastery uses manual transaction entry only.'
};

// ═══════════════════════════════════════════════════════════════════
// MASTER HUB CONFIGURATION (Central Backend Database)
// ═══════════════════════════════════════════════════════════════════
// MASTER HUB contains: CLIENT MANAGEMENT, SUPPORT REQUESTS, 
// GUEST MANAGEMENT, UNAUTHORIZED USERS
// See MasterHub.gs for detailed column mappings
var MASTER_HUB = {
  SHEET_ID: '11MhJFe4xmSMBLPUXxePtq-yB2YsuhsScY1H7Dc4zwMI',
  SHEETS: {
    CLIENT_MANAGEMENT: 'CLIENT MANAGEMENT',
    SUPPORT_REQUESTS: 'SUPPORT REQUESTS',
    GUEST_MANAGEMENT: 'GUEST MANAGEMENT',
    UNAUTHORIZED_USERS: 'UNAUTHORIZED USERS'
  },
  // Web App URL - Set after deployment via ADMIN_setWebAppUrl()
  // Format: https://script.google.com/macros/s/DEPLOYMENT_ID/exec
  WEBAPP_URL: '' // Stored in Script Properties as 'mm_webapp_url'
};

// ═══════════════════════════════════════════════════════════════════
// RESEND API CONFIGURATION (Email MFA & Password Reset)
// ═══════════════════════════════════════════════════════════════════
var RESEND_CONFIG = {
  API_KEY: "re_YHU1Q59t_CWwB3aDPQnfk9dDEQXJsW3o3",
  API_BASE: "https://api.resend.com",
  FROM_EMAIL: "noreply@moneymastery-system.com",
  FROM_NAME: "Money Mastery",
  CODE_EXPIRY_MINUTES: 5,
  MAX_ATTEMPTS: 3,
  RATE_LIMIT_MINUTES: 1
};

// ═══════════════════════════════════════════════════════════════════
// ML CONFIGURATION (Local Pattern-Based Learning)
// ═══════════════════════════════════════════════════════════════════
var ML_CONFIG = {
  // Confidence thresholds for suggestions
  HIGH_CONFIDENCE: 0.90,    // Auto-fill at this level
  MEDIUM_CONFIDENCE: 0.70,  // Show as suggestion with badge
  LOW_CONFIDENCE: 0.50,     // Show in dropdown but don't highlight
  
  // Minimum occurrences before suggesting
  MIN_OCCURRENCES_HIGH: 3,   // Need 3+ matches for high confidence
  MIN_OCCURRENCES_MEDIUM: 2, // Need 2+ for medium confidence
  
  // Keyword matching settings
  MIN_KEYWORD_LENGTH: 3,     // Ignore keywords shorter than this
  MIN_KEYWORD_OVERLAP: 2     // Need at least 2 keyword matches
};

// Common merchant name patterns for normalization
var MERCHANT_PATTERNS = {
  // Payment processors
  'SQ *': 'SQUARE',
  'SQC*': 'SQUARE CASH',
  'PAYPAL *': 'PAYPAL',
  'VENMO': 'VENMO',
  'ZELLE': 'ZELLE',
  'CASH APP*': 'CASH APP',
  
  // Major retailers
  'AMZN': 'AMAZON',
  'AMAZON.COM': 'AMAZON',
  'AMZN MKTP': 'AMAZON MARKETPLACE',
  'WAL-MART': 'WALMART',
  'WM SUPERCENTER': 'WALMART',
  'TARGET 0': 'TARGET',
  'COSTCO WHSE': 'COSTCO',
  
  // Food & Dining
  'DOORDASH': 'DOORDASH',
  'UBER EATS': 'UBER EATS',
  'GRUBHUB': 'GRUBHUB',
  'MCDONALD\'S': 'MCDONALDS',
  'STARBUCKS': 'STARBUCKS',
  'DUNKIN': 'DUNKIN',
  'CHIPOTLE': 'CHIPOTLE',
  
  // Subscriptions
  'NETFLIX.COM': 'NETFLIX',
  'SPOTIFY': 'SPOTIFY',
  'APPLE.COM/BILL': 'APPLE',
  'GOOGLE *': 'GOOGLE',
  'MICROSOFT*': 'MICROSOFT',
  'HULU': 'HULU',
  'DISNEY PLUS': 'DISNEY PLUS',
  'PRIME VIDEO': 'AMAZON PRIME VIDEO',
  
  // Utilities & Services
  'AT&T': 'ATT',
  'VERIZON': 'VERIZON',
  'T-MOBILE': 'TMOBILE',
  'COMCAST': 'COMCAST',
  'XFINITY': 'COMCAST XFINITY',
  
  // Gas stations
  'SHELL OIL': 'SHELL',
  'EXXONMOBIL': 'EXXON',
  'CHEVRON': 'CHEVRON',
  'BP#': 'BP',
  'SPEEDWAY': 'SPEEDWAY',
  'WAWA': 'WAWA',
  
  // Rideshare
  'UBER *': 'UBER',
  'LYFT *': 'LYFT'
};

// ═══════════════════════════════════════════════════════════════════
// LICENSE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════
var LICENSE_CONFIG = {
  LICENSE_YEAR: 2026,
  
  getLicenseStartDate: function() {
    return new Date(this.LICENSE_YEAR, 0, 1);
  },
  
  getLicenseEndDate: function() {
    return new Date(this.LICENSE_YEAR, 11, 31, 23, 59, 59);
  }
};

// ═══════════════════════════════════════════════════════════════════
// MASTER EMAIL CONFIGURATION
// ═══════════════════════════════════════════════════════════════════
var MM_CFG = {
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

// ═══════════════════════════════════════════════════════════════════
// COLUMN DEFINITIONS
// ═══════════════════════════════════════════════════════════════════
// NOTE: Primary column definitions are now in ColumnConfig.gs (MM_COLS)
// These aliases exist for backward compatibility with existing code

// Column definitions for ACCOUNT tabs (ACCOUNT 1-10)
// UPDATED 2026: Now uses unified column structure from ColumnConfig.gs
var MMNAV_COLS = {
  DATE: 3,        // C - Transaction date
  DESCRIPTION: 4, // D - Description
  AMOUNT: 5,      // E - Amount (+income, -expense)
  PERSONAL: 6,    // F - Category (renamed from PERSONAL, now unified)
  BUSINESS: 7,    // G - Special Label OR Business Category
  MEMO: 8,        // H - Memo (NEW)
  NEED_DESIRE: 9  // I - Need/Desire (NEW)
};

// Column definitions for INCOME/EXPENSE TRANSACTIONS sheets
// UPDATED 2026: Aligned with ColumnConfig.gs
var INCOME_EXPENSE_COLS = {
  ACCOUNT_NAME: 3,    // C
  DATE: 4,            // D
  DESCRIPTION: 5,     // E
  AMOUNT: 6,          // F
  PERSONAL: 7,        // G (Category)
  BUSINESS: 8,        // H (Business Category)
  MEMO: 9,            // I (Memo)
  NEED_DESIRE: 10,    // J (Desire or Need) - FIXED: was 10, should be consistent
  MAIN_CATEGORY: 11   // K
};

var MMNAV_BACKEND_SHEET_NAME = 'BACKEND';

// ═══════════════════════════════════════════════════════════════════
// SPECIAL TRANSACTIONS
// ═══════════════════════════════════════════════════════════════════
var MMNAV_SPECIAL_TRANSACTIONS = {
  TRANSFERRED_FROM_PERSONAL: 'TRANSFERRED FROM PERSONAL',
  TRANSFERRED_TO_PERSONAL: 'TRANSFERRED TO PERSONAL',
  TRANSFERRED_FROM_BUSINESS: 'TRANSFERRED FROM BUSINESS',
  TRANSFERRED_TO_BUSINESS: 'TRANSFERRED TO BUSINESS',
  TRANSACTION_SPLIT: 'Transaction Split',
  REFUND: 'Refund',
  RETURN: 'Return',
  REIMBURSEMENT: 'Reimbursement'
};

var MMNAV_SPECIAL_TX_SET = (function() {
  try { return new Set(Object.values(MMNAV_SPECIAL_TRANSACTIONS)); }
  catch (e) { return new Set(); }
})();

// ═══════════════════════════════════════════════════════════════════
// IN-MEMORY CACHE
// ═══════════════════════════════════════════════════════════════════
var MMNAV_cache = {
  expense: null,
  income: null,
  business: null
};
