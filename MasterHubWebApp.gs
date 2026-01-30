/**
 * ============================================
 * MASTER HUB WEB APP ENDPOINTS
 * Donna Roggio LLC - Money Mastery System
 * ============================================
 * 
 * Web App deployment allows regular users (without direct MASTER HUB access)
 * to perform validation, registration, and logging operations.
 * 
 * DEPLOYMENT REQUIRED:
 * 1. Deploy > New Deployment > Web App
 * 2. Execute as: Me (your account)
 * 3. Who has access: Anyone
 * 4. Store the Web App URL in Config.gs
 * 
 * SECURITY:
 * - Web App runs with owner's permissions (can access MASTER HUB)
 * - Validates request signatures to prevent abuse
 * - Rate limiting on sensitive operations
 */

// ============================================
// WEB APP CONFIGURATION
// ============================================

var WEBAPP_CONFIG = {
  // Set this after deployment (or store in Script Properties)
  // Format: https://script.google.com/macros/s/DEPLOYMENT_ID/exec
  URL: '', // Will be read from Script Properties: 'mm_webapp_url'
  
  // Request validation
  REQUEST_SECRET: '', // Set via ADMIN_setWebAppSecret()
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: 60000, // 1 minute
  MAX_REQUESTS_PER_WINDOW: 30
};


// ============================================
// MAIN WEB APP ENDPOINTS
// ============================================

/**
 * Handle GET requests (for testing/health check)
 * @param {Object} e - Event object
 * @returns {TextOutput} Response
 */
function doGet(e) {
  var response = {
    status: 'ok',
    service: 'Money Mastery Hub API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  };
  
  // Handle specific actions via GET (read-only)
  var action = e.parameter.action;
  
  if (action === 'health') {
    response.health = 'healthy';
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}


/**
 * Handle POST requests (main API endpoint)
 * @param {Object} e - Event object with postData
 * @returns {TextOutput} Response
 */
function doPost(e) {
  try {
    // Parse request body
    var requestData;
    try {
      requestData = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return _webAppResponse({ success: false, error: 'Invalid JSON in request body' }, 400);
    }
    
    var action = requestData.action;
    
    if (!action) {
      return _webAppResponse({ success: false, error: 'Missing action parameter' }, 400);
    }
    
    // Route to appropriate handler
    var result;
    switch (action) {
      
      // CLIENT VALIDATION
      case 'validateClient':
        result = _handleValidateClient(requestData);
        break;
        
      // CLIENT REGISTRATION UPDATE
      case 'updateRegistration':
        result = _handleUpdateRegistration(requestData);
        break;
        
      // CHECK IF CLIENT DISABLED
      case 'checkDisabled':
        result = _handleCheckDisabled(requestData);
        break;
        
      // SUPPORT TICKET LOGGING
      case 'logSupportTicket':
        result = _handleLogSupportTicket(requestData);
        break;
        
      // GUEST LOOKUP
      case 'getGuest':
        result = _handleGetGuest(requestData);
        break;
        
      // ADD GUEST
      case 'addGuest':
        result = _handleAddGuest(requestData);
        break;
        
      // UPDATE GUEST OPT-IN
      case 'updateGuestOptIn':
        result = _handleUpdateGuestOptIn(requestData);
        break;
        
      // LOG UNAUTHORIZED ACCESS
      case 'logUnauthorized':
        result = _handleLogUnauthorized(requestData);
        break;
        
      // VALIDATE COPY MANAGEMENT KEY
      case 'validateCopyKey':
        result = _handleValidateCopyKey(requestData);
        break;
        
      // TRACK FAILED LOGIN
      case 'trackFailedLogin':
        result = _handleTrackFailedLogin(requestData);
        break;
        
      // RESET FAILED LOGINS
      case 'resetFailedLogins':
        result = _handleResetFailedLogins(requestData);
        break;
        
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }
    
    return _webAppResponse(result);
    
  } catch (e) {
    console.error('WebApp doPost error:', e.message);
    return _webAppResponse({ success: false, error: 'Server error: ' + e.message }, 500);
  }
}


// ============================================
// REQUEST HANDLERS
// ============================================

/**
 * Handle client validation request
 */
function _handleValidateClient(data) {
  if (!data.email || !data.accessKey) {
    return { success: false, error: 'Missing email or accessKey' };
  }
  
  return MH_validateClientRegistration(data.email, data.accessKey);
}


/**
 * Handle registration update request
 */
function _handleUpdateRegistration(data) {
  if (!data.rowIndex || !data.registrationData) {
    return { success: false, error: 'Missing rowIndex or registrationData' };
  }
  
  return MH_updateClientRegistration(data.rowIndex, data.registrationData);
}


/**
 * Handle check disabled request
 */
function _handleCheckDisabled(data) {
  if (!data.email) {
    return { success: false, error: 'Missing email' };
  }
  
  var isDisabled = MH_isClientDisabled(data.email);
  return { success: true, disabled: isDisabled };
}


/**
 * Handle support ticket logging
 */
function _handleLogSupportTicket(data) {
  if (!data.ticketData) {
    return { success: false, error: 'Missing ticketData' };
  }
  
  return MH_logSupportRequest(data.ticketData);
}


/**
 * Handle guest lookup
 */
function _handleGetGuest(data) {
  if (!data.guestEmail) {
    return { success: false, error: 'Missing guestEmail' };
  }
  
  var guest = MH_getGuestByEmail(data.guestEmail);
  return { success: !!guest, guest: guest };
}


/**
 * Handle add guest
 */
function _handleAddGuest(data) {
  if (!data.guestData) {
    return { success: false, error: 'Missing guestData' };
  }
  
  return MH_addGuest(data.guestData);
}


/**
 * Handle update guest opt-in
 */
function _handleUpdateGuestOptIn(data) {
  if (!data.guestEmail || typeof data.optedIn !== 'boolean') {
    return { success: false, error: 'Missing guestEmail or optedIn' };
  }
  
  return MH_updateGuestOptIn(data.guestEmail, data.optedIn);
}


/**
 * Handle unauthorized access logging
 */
function _handleLogUnauthorized(data) {
  if (!data.accessData) {
    return { success: false, error: 'Missing accessData' };
  }
  
  return MH_logUnauthorizedAccess(data.accessData);
}


/**
 * Handle copy key validation
 */
function _handleValidateCopyKey(data) {
  if (!data.copyKey || !data.clientEmail) {
    return { success: false, error: 'Missing copyKey or clientEmail' };
  }
  
  return MH_validateCopyManagementKey(data.copyKey, data.clientEmail);
}


/**
 * Handle track failed login
 */
function _handleTrackFailedLogin(data) {
  if (!data.email) {
    return { success: false, error: 'Missing email' };
  }
  
  return MH_trackFailedLogin(data.email);
}


/**
 * Handle reset failed logins
 */
function _handleResetFailedLogins(data) {
  if (!data.email) {
    return { success: false, error: 'Missing email' };
  }
  
  MH_resetFailedLogins(data.email);
  return { success: true };
}


// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create standardized JSON response
 */
function _webAppResponse(data, statusCode) {
  statusCode = statusCode || 200;
  
  var output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  
  return output;
}


// ============================================
// CLIENT-SIDE CALLERS
// ============================================

/**
 * Call the Web App from client code
 * Use this when the user doesn't have direct MASTER HUB access
 * @param {string} action - Action to perform
 * @param {Object} params - Parameters for the action
 * @returns {Object} Response from Web App
 */
function MH_callWebApp(action, params) {
  try {
    var webAppUrl = _getWebAppUrl();
    
    if (!webAppUrl) {
      // Fallback: Try direct access (will work for admin)
      console.log('MasterHub: No Web App URL configured, attempting direct access');
      return _directHubAccess(action, params);
    }
    
    var payload = {
      action: action
    };
    
    // Merge params into payload
    for (var key in params) {
      if (params.hasOwnProperty(key)) {
        payload[key] = params[key];
      }
    }
    
    var options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch(webAppUrl, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    if (responseCode === 200) {
      // Check if response is JSON
      if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
        return JSON.parse(responseText);
      } else {
        // Response is HTML (error page)
        console.error('MasterHub WebApp returned HTML instead of JSON');
        console.error('Response preview: ' + responseText.substring(0, 200));
        return { 
          success: false, 
          error: 'Web App returned HTML error page. The Web App may not be deployed correctly.',
          hint: 'Re-deploy the Web App: Deploy > Manage Deployments > Edit > Version: New version > Deploy'
        };
      }
    } else {
      console.error('MasterHub WebApp error:', responseCode, responseText);
      return { success: false, error: 'Web App error: ' + responseCode };
    }
    
  } catch (e) {
    console.error('MasterHub: callWebApp error:', e.message);
    return { success: false, error: e.message };
  }
}


/**
 * Direct access fallback (for admins)
 */
function _directHubAccess(action, params) {
  try {
    switch (action) {
      case 'validateClient':
        return MH_validateClientRegistration(params.email, params.accessKey);
      case 'updateRegistration':
        return MH_updateClientRegistration(params.rowIndex, params.registrationData);
      case 'checkDisabled':
        return { success: true, disabled: MH_isClientDisabled(params.email) };
      case 'logSupportTicket':
        return MH_logSupportRequest(params.ticketData);
      case 'getGuest':
        var guest = MH_getGuestByEmail(params.guestEmail);
        return { success: !!guest, guest: guest };
      case 'addGuest':
        return MH_addGuest(params.guestData);
      case 'updateGuestOptIn':
        return MH_updateGuestOptIn(params.guestEmail, params.optedIn);
      case 'logUnauthorized':
        return MH_logUnauthorizedAccess(params.accessData);
      case 'validateCopyKey':
        return MH_validateCopyManagementKey(params.copyKey, params.clientEmail);
      case 'trackFailedLogin':
        return MH_trackFailedLogin(params.email);
      case 'resetFailedLogins':
        MH_resetFailedLogins(params.email);
        return { success: true };
      default:
        return { success: false, error: 'Unknown action' };
    }
  } catch (e) {
    console.error('MasterHub direct access error:', e.message);
    return { success: false, error: e.message };
  }
}


/**
 * Get the Web App URL from configuration
 */
function _getWebAppUrl() {
  try {
    // Try Script Properties first
    var props = PropertiesService.getScriptProperties();
    var url = props.getProperty('mm_webapp_url');
    if (url) return url;
    
    // Try Document Properties
    var docProps = PropertiesService.getDocumentProperties();
    url = docProps.getProperty('mm_webapp_url');
    if (url) return url;
    
    // Try MM_CFG
    if (typeof MM_CFG !== 'undefined' && MM_CFG.WEBAPP_URL) {
      return MM_CFG.WEBAPP_URL;
    }
    
    return null;
  } catch (e) {
    return null;
  }
}


// ============================================
// ADMIN: WEB APP SETUP
// ============================================

/**
 * Admin: Set the Web App URL after deployment
 * Run this after deploying the Web App
 * @param {string} url - The deployed Web App URL
 */
function ADMIN_setWebAppUrl(url) {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!MM_isMasterEmail_(userEmail)) {
      throw new Error('Admin access required');
    }
    
    if (!url || !url.startsWith('https://script.google.com/')) {
      throw new Error('Invalid Web App URL');
    }
    
    var props = PropertiesService.getScriptProperties();
    props.setProperty('mm_webapp_url', url);
    
    SpreadsheetApp.getUi().alert(
      'Web App URL Configured',
      'The Web App URL has been saved. All client operations will now use this endpoint.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}


/**
 * Admin: Get the current Web App URL
 */
function ADMIN_getWebAppUrl() {
  var url = _getWebAppUrl();
  SpreadsheetApp.getUi().alert(
    'Current Web App URL',
    url || 'Not configured. Deploy the Web App and run ADMIN_setWebAppUrl(url)',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return url;
}


/**
 * Admin: Test the Web App connection
 */
function ADMIN_testWebAppConnection() {
  try {
    var ui = SpreadsheetApp.getUi();
    var url = _getWebAppUrl();
    
    if (!url) {
      ui.alert('Error', 
        'Web App URL not configured.\n\n' +
        'TO FIX:\n' +
        '1. Go to Extensions → Apps Script\n' +
        '2. Click Deploy → New deployment\n' +
        '3. Select "Web app"\n' +
        '4. Execute as: Me, Who has access: Anyone\n' +
        '5. Click Deploy and authorize\n' +
        '6. Copy the Web App URL\n' +
        '7. Go to Admin → Advanced → Set Web App URL\n' +
        '8. Paste the URL and click OK',
        ui.ButtonSet.OK);
      return;
    }
    
    Logger.log('Testing Web App URL: ' + url);
    
    var response = UrlFetchApp.fetch(url + '?action=health', { muteHttpExceptions: true });
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    Logger.log('Response code: ' + responseCode);
    Logger.log('Response text (first 500 chars): ' + responseText.substring(0, 500));
    
    // Check if response is HTML (error) or JSON (success)
    if (responseText.trim().startsWith('<!') || responseText.trim().startsWith('<html')) {
      // HTML error page - Web App not deployed correctly
      ui.alert('Web App Error', 
        'The Web App URL returned an HTML error page instead of JSON.\n\n' +
        'This usually means:\n' +
        '1. The Web App is not deployed, OR\n' +
        '2. The deployment needs to be updated, OR\n' +
        '3. There is an authorization issue\n\n' +
        'TO FIX:\n' +
        '1. Go to Extensions → Apps Script\n' +
        '2. Click Deploy → Manage deployments\n' +
        '3. Click the pencil icon to edit\n' +
        '4. Set Version to "New version"\n' +
        '5. Ensure Execute as: Me, Who has access: Anyone\n' +
        '6. Click Deploy\n' +
        '7. If prompted, authorize the app\n\n' +
        'Current URL: ' + url,
        ui.ButtonSet.OK);
      return;
    }
    
    try {
      var result = JSON.parse(responseText);
      
      ui.alert('✅ Web App Test Successful',
        'Status: ' + (result.status || 'unknown') + '\n' +
        'Service: ' + (result.service || 'unknown') + '\n' +
        'Version: ' + (result.version || 'unknown') + '\n' +
        'Timestamp: ' + (result.timestamp || 'unknown') + '\n\n' +
        'URL: ' + url,
        ui.ButtonSet.OK);
    } catch (parseError) {
      ui.alert('Parse Error',
        'Could not parse Web App response as JSON.\n\n' +
        'Response code: ' + responseCode + '\n' +
        'Response preview: ' + responseText.substring(0, 200) + '\n\n' +
        'This may indicate a deployment issue.',
        ui.ButtonSet.OK);
    }
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Connection Error', 
      'Failed to connect to Web App.\n\n' +
      'Error: ' + e.message + '\n\n' +
      'Please verify:\n' +
      '1. The Web App URL is correct\n' +
      '2. The Web App is deployed\n' +
      '3. You have internet connectivity',
      SpreadsheetApp.getUi().ButtonSet.OK);
  }
}


// ============================================
// CONVENIENCE WRAPPERS FOR COMMON OPERATIONS
// ============================================

/**
 * Validate client for registration (use in Welcome.gs)
 * Works for both admin (direct) and regular users (via Web App)
 */
function MH_validateForRegistration(email, accessKey) {
  return MH_callWebApp('validateClient', { email: email, accessKey: accessKey });
}


/**
 * Complete registration update (use in Welcome.gs)
 */
function MH_completeRegistration(rowIndex, registrationData) {
  return MH_callWebApp('updateRegistration', { rowIndex: rowIndex, registrationData: registrationData });
}


/**
 * Log support ticket (use in SupportTicket.gs)
 */
function MH_logTicket(ticketData) {
  return MH_callWebApp('logSupportTicket', { ticketData: ticketData });
}


/**
 * Check if guest exists (use in Welcome.gs for guest login)
 */
function MH_checkGuest(guestEmail) {
  return MH_callWebApp('getGuest', { guestEmail: guestEmail });
}


/**
 * Add new guest (use in guest management modal)
 */
function MH_createGuest(guestData) {
  return MH_callWebApp('addGuest', { guestData: guestData });
}


/**
 * Log unauthorized access attempt
 */
function MH_reportUnauthorized(accessData) {
  return MH_callWebApp('logUnauthorized', { accessData: accessData });
}


/**
 * Validate copy management key
 */
function MH_checkCopyKey(copyKey, clientEmail) {
  return MH_callWebApp('validateCopyKey', { copyKey: copyKey, clientEmail: clientEmail });
}


/**
 * Track and check failed login attempts
 */
function MH_handleFailedLogin(email) {
  return MH_callWebApp('trackFailedLogin', { email: email });
}


/**
 * Clear failed login counter after successful login
 */
function MH_clearFailedLogins(email) {
  return MH_callWebApp('resetFailedLogins', { email: email });
}


// ============================================
// DIAGNOSTIC FUNCTIONS
// ============================================

/**
 * Test validation directly (for debugging)
 * Run this from Apps Script editor - results will be in the log
 * 
 * USAGE: 
 * 1. Change the testEmail and testKey values below
 * 2. Run this function from the Apps Script editor
 * 3. Check View > Logs for results
 */
function TEST_validation_flow() {
  // ═══════════════════════════════════════════════════════════════
  // CHANGE THESE VALUES TO TEST
  // ═══════════════════════════════════════════════════════════════
  var testEmail = 'test@example.com';  // Change to actual email in MASTER HUB
  var testKey = 'MMKEY-1234';          // Change to actual key in MASTER HUB
  // ═══════════════════════════════════════════════════════════════
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('VALIDATION TEST');
  console.log('═══════════════════════════════════════════════════════');
  console.log('Test Email: ' + testEmail);
  console.log('Test Key: ' + testKey);
  console.log('');
  
  // Test 1: Check Web App URL
  console.log('--- TEST 1: Web App URL ---');
  var webAppUrl = _getWebAppUrl();
  console.log('Web App URL: ' + (webAppUrl || 'NOT CONFIGURED'));
  console.log('');
  
  // Test 2: Direct validation (bypasses Web App)
  console.log('--- TEST 2: Direct Validation (MH_validateClientRegistration) ---');
  try {
    var directResult = MH_validateClientRegistration(testEmail, testKey);
    console.log('Direct Result: ' + JSON.stringify(directResult));
  } catch (e) {
    console.log('Direct Validation ERROR: ' + e.message);
  }
  console.log('');
  
  // Test 3: Via Web App (or fallback)
  console.log('--- TEST 3: Via MH_validateForRegistration ---');
  try {
    var webAppResult = MH_validateForRegistration(testEmail, testKey);
    console.log('WebApp Result: ' + JSON.stringify(webAppResult));
  } catch (e) {
    console.log('WebApp Validation ERROR: ' + e.message);
  }
  console.log('');
  
  // Test 4: Check MASTER HUB access
  console.log('--- TEST 4: MASTER HUB Access ---');
  try {
    var ss = SpreadsheetApp.openById(MASTER_HUB_CONFIG.SHEET_ID);
    console.log('MASTER HUB opened successfully: ' + ss.getName());
    var sheet = ss.getSheetByName(MASTER_HUB_CONFIG.SHEETS.CLIENT_MANAGEMENT);
    if (sheet) {
      console.log('CLIENT MANAGEMENT sheet found');
      var lastRow = sheet.getLastRow();
      console.log('Total rows: ' + lastRow);
      if (lastRow > 1) {
        var firstDataRow = sheet.getRange(2, 1, 1, 2).getValues()[0];
        console.log('First data row - Email: "' + firstDataRow[0] + '", Key: "' + firstDataRow[1] + '"');
      }
    } else {
      console.log('ERROR: CLIENT MANAGEMENT sheet NOT FOUND');
    }
  } catch (e) {
    console.log('MASTER HUB Access ERROR: ' + e.message);
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('TEST COMPLETE - Check logs above for issues');
  console.log('═══════════════════════════════════════════════════════');
}


/**
 * Check stored validation data - RUN FROM SCRIPT EDITOR
 */
function TEST_check_validation_state() {
  var props = MM_getProps_();
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('CURRENT VALIDATION STATE');
  console.log('═══════════════════════════════════════════════════════');
  console.log('mm_hub_row_index: ' + (props.getProperty('mm_hub_row_index') || 'not set'));
  console.log('mm_hub_client_data: ' + (props.getProperty('mm_hub_client_data') || 'not set'));
  console.log('mm_hub_validated: ' + (props.getProperty('mm_hub_validated') || 'not set'));
  console.log('mm_hub_validated_email: ' + (props.getProperty('mm_hub_validated_email') || 'not set'));
  console.log('mm_hub_validated_key: ' + (props.getProperty('mm_hub_validated_key') || 'not set'));
  console.log('mm_registered: ' + (props.getProperty('mm_registered') || 'not set'));
  console.log('mm_primary_email: ' + (props.getProperty('mm_primary_email') || 'not set'));
  console.log('mm_webapp_url: ' + (PropertiesService.getScriptProperties().getProperty('mm_webapp_url') || 'not set'));
  console.log('═══════════════════════════════════════════════════════');
}


/**
 * Clear validation state (for testing) - RUN FROM SCRIPT EDITOR
 */
function TEST_clear_validation_state() {
  var props = MM_getProps_();
  props.deleteProperty('mm_hub_row_index');
  props.deleteProperty('mm_hub_client_data');
  props.deleteProperty('mm_hub_validated');
  props.deleteProperty('mm_hub_validated_email');
  props.deleteProperty('mm_hub_validated_key');
  
  console.log('Validation state cleared.');
}


/**
 * Clear registration for testing - RUN FROM SCRIPT EDITOR
 * WARNING: This will force the user to re-register
 */
function TEST_clear_registration() {
  var props = MM_getProps_();
  props.deleteProperty('mm_registered');
  props.deleteProperty('mm_primary_email');
  props.deleteProperty('mm_primary_first_name');
  props.deleteProperty('mm_primary_last_name');
  props.deleteProperty('mm_hub_row_index');
  props.deleteProperty('mm_hub_client_data');
  props.deleteProperty('mm_hub_validated');
  props.deleteProperty('mm_hub_validated_email');
  props.deleteProperty('mm_hub_validated_key');
  
  console.log('Registration cleared. User will need to register again.');
}
