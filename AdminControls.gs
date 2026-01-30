/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * ADMIN CONTROLS - Testing and Configuration Tools
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * NOTE: Plaid integration has been deprecated in 2026.
 * Bank connections now use Stripe Financial Connections only.
 * Legacy Plaid functions are stubbed for backward compatibility.
 */

// ═══════════════════════════════════════════════════════════════════
// STRIPE CONFIGURATION (Active Bank Connection Method)
// ═══════════════════════════════════════════════════════════════════

/**
 * Show system configuration
 * NOTE: Bank sync disabled - Money Mastery uses manual transaction entry only
 */
function ADMIN_ShowSystemConfig() {
  try {
    var message = 'MONEY MASTERY CONFIGURATION\n\n' +
      'License Year: ' + LICENSE_CONFIG.LICENSE_YEAR + '\n\n' +
      'TRANSACTION ENTRY: Manual only\n' +
      '• Users enter transactions directly in ACCOUNT sheets\n' +
      '• No automatic bank sync (Plaid, Stripe, Teller disabled)\n\n' +
      'Column Layout (2026):\n' +
      '• C: Date\n' +
      '• D: Description\n' +
      '• E: Amount\n' +
      '• F: Category\n' +
      '• G: Special Label\n' +
      '• H: Memo\n' +
      '• I: Need/Desire\n' +
      '• J: Split Data\n' +
      '• K: Receipt';
    
    SpreadsheetApp.getUi().alert('System Config', message, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * @deprecated Bank sync disabled - kept for backward compatibility
 */
function ADMIN_ShowStripeConfig() {
  ADMIN_ShowSystemConfig();
}

// ═══════════════════════════════════════════════════════════════════
// USER FLOW CONTROLS
// ═══════════════════════════════════════════════════════════════════

/**
 * Manually run tutorial modal
 */
function ADMIN_RunTutorialModal() {
  try {
    MM_showWelcomeTutorial();
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Manually run bank registration popup
 */
function ADMIN_RunBankRegistrationPopup() {
  try {
    // Open registration flow directly
    var html = HtmlService.createHtmlOutputFromFile('RegistrationFlow')
      .setWidth(900)
      .setHeight(700);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'Connect Bank Account');
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Reset user flow to Step 1
 */
function ADMIN_ResetUserFlow() {
  try {
    var ui = SpreadsheetApp.getUi();
    var response = ui.alert(
      'Reset User Flow',
      'This will reset the current user back to Step 1 of registration.\n\n' +
      'WARNING: This does not delete bank connections or transaction data.\n\n' +
      'Continue?',
      ui.ButtonSet.YES_NO
    );
    
    if (response === ui.Button.YES) {
      var props = MM_getProps_();
      props.setProperty('mm_registered', 'false');
      props.deleteProperty('mm_pin_hash');
      props.deleteProperty('mm_tutorial_completed');
      
      ui.alert('Reset Complete', 'User flow has been reset to Step 1', ui.ButtonSet.OK);
    }
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Set webhook URL (for bank transaction notifications)
 */
function ADMIN_SetWebhookURL() {
  try {
    var ui = SpreadsheetApp.getUi();
    var response = ui.prompt(
      'Set Webhook URL',
      'Enter the deployed web app URL:\n(e.g., https://script.google.com/macros/s/YOUR_ID/exec)',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response.getSelectedButton() === ui.Button.OK) {
      var url = response.getResponseText().trim();
      
      if (url && url.indexOf('https://') === 0) {
        var scriptProps = PropertiesService.getScriptProperties();
        scriptProps.setProperty('WEBHOOK_URL', url);
        
        ui.alert('Success', 'Webhook URL saved:\n' + url, ui.ButtonSet.OK);
      } else {
        ui.alert('Error', 'Invalid URL. Must start with https://', ui.ButtonSet.OK);
      }
    }
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// ═══════════════════════════════════════════════════════════════════
// SANDBOX/TESTING CONTROLS
// ═══════════════════════════════════════════════════════════════════

/**
 * Toggle between Production and Test mode
 */
function ADMIN_ToggleSandboxMode() {
  try {
    var scriptProps = PropertiesService.getScriptProperties();
    var currentMode = scriptProps.getProperty('APP_MODE') || 'production';
    var newMode = (currentMode === 'production') ? 'sandbox' : 'production';
    
    scriptProps.setProperty('APP_MODE', newMode);
    
    SpreadsheetApp.getUi().alert(
      'Mode Changed',
      'Application mode changed to: ' + newMode.toUpperCase() + '\n\n' +
      (newMode === 'sandbox' ? 
        'Test mode enabled. Fake data will be used.' : 
        'Production mode enabled. Real bank data active.'),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Create sandbox test account
 */
function ADMIN_CreateSandboxToken() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.alert(
      'Sandbox Test Account',
      'Sandbox mode creates test transactions directly.\n\n' +
      'To test bank connections, use the Dashboard and click "Sync Bank".\n\n' +
      'Test data will be generated if in sandbox mode.',
      ui.ButtonSet.OK
    );
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Create multiple sandbox test accounts
 */
function ADMIN_CreateMultipleSandboxAccounts() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.alert(
      'Multiple Test Accounts',
      'Use the Dashboard to connect multiple test accounts.\n\n' +
      'Each ACCOUNT sheet can hold transactions from different sources.',
      ui.ButtonSet.OK
    );
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Fire sandbox webhook (simulates bank notification)
 */
function ADMIN_FireSandboxWebhook() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.alert(
      'Webhook Simulation',
      'Webhooks are automatically handled when transactions are synced.\n\n' +
      'Use "Force Fetch Transactions" to manually trigger a sync.',
      ui.ButtonSet.OK
    );
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Force fetch transactions
 */
function ADMIN_ForceFetchTransactions() {
  try {
    var ui = SpreadsheetApp.getUi();
    var response = ui.alert(
      'Force Fetch Transactions',
      'This will attempt to sync transactions for all connected accounts.\n\n' +
      'Continue?',
      ui.ButtonSet.YES_NO
    );
    
    if (response === ui.Button.YES) {
      // Try to call sync function if it exists
      if (typeof syncAllStripeAccounts === 'function') {
        var result = syncAllStripeAccounts();
        ui.alert('Sync Complete', 'Transaction sync completed.', ui.ButtonSet.OK);
      } else {
        ui.alert('Info', 'No sync function available. Use Dashboard to sync.', ui.ButtonSet.OK);
      }
    }
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Reset sandbox state
 */
function ADMIN_ResetSandboxState() {
  try {
    var ui = SpreadsheetApp.getUi();
    var response = ui.alert(
      'Reset Sandbox State',
      'This will clear all sandbox/test flags.\n\n' +
      'Continue?',
      ui.ButtonSet.YES_NO
    );
    
    if (response === ui.Button.YES) {
      var scriptProps = PropertiesService.getScriptProperties();
      scriptProps.setProperty('APP_MODE', 'production');
      
      ui.alert('Reset Complete', 'Sandbox state has been reset to production.', ui.ButtonSet.OK);
    }
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// ═══════════════════════════════════════════════════════════════════
// EMAIL & NOTIFICATION CONTROLS
// ═══════════════════════════════════════════════════════════════════

/**
 * Trigger email manually (for testing)
 */
function ADMIN_TriggerEmailManually() {
  try {
    var ui = SpreadsheetApp.getUi();
    var response = ui.prompt(
      'Send Test Email',
      'Enter email address to send test message:',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response.getSelectedButton() === ui.Button.OK) {
      var email = response.getResponseText().trim();
      
      if (email && email.indexOf('@') > 0) {
        // Try to send test email
        if (typeof sendTestEmail === 'function') {
          sendTestEmail(email);
          ui.alert('Sent', 'Test email sent to: ' + email, ui.ButtonSet.OK);
        } else {
          ui.alert('Info', 'Email function not available.', ui.ButtonSet.OK);
        }
      } else {
        ui.alert('Error', 'Invalid email address.', ui.ButtonSet.OK);
      }
    }
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Test webhook endpoint
 */
function ADMIN_TestWebhook() {
  try {
    var scriptProps = PropertiesService.getScriptProperties();
    var webhookUrl = scriptProps.getProperty('WEBHOOK_URL');
    
    if (!webhookUrl) {
      SpreadsheetApp.getUi().alert('No Webhook', 'No webhook URL configured. Use "Set Webhook URL" first.', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    SpreadsheetApp.getUi().alert(
      'Webhook URL',
      'Current webhook: ' + webhookUrl + '\n\n' +
      'To test, visit the URL in a browser or use curl.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * View webhook logs
 */
function ADMIN_ViewWebhookLogs() {
  try {
    SpreadsheetApp.getUi().alert(
      'Webhook Logs',
      'Webhook logs are available in Apps Script:\n\n' +
      '1. Go to Extensions → Apps Script\n' +
      '2. Click "Executions" in left sidebar\n' +
      '3. Filter by "doPost" to see webhook calls',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// ═══════════════════════════════════════════════════════════════════
// DEPRECATED PLAID FUNCTIONS (Stubs for backward compatibility)
// ═══════════════════════════════════════════════════════════════════
// SECURE API KEY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

/**
 * @deprecated Bank sync disabled - Money Mastery uses manual transaction entry only
 */
function ADMIN_SetStripeApiKey() {
  SpreadsheetApp.getUi().alert(
    'Not Available',
    'Bank sync has been disabled.\n\n' +
    'Money Mastery uses manual transaction entry only.\n' +
    'Users enter transactions directly into ACCOUNT sheets.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Securely set the Resend API key in Script Properties
 * This key is used for sending emails (MFA, notifications)
 */
function ADMIN_SetResendApiKey() {
  try {
    var ui = SpreadsheetApp.getUi();
    
    var response = ui.prompt(
      'Set Resend API Key',
      'Enter your Resend API key (starts with re_):\n\n' +
      'IMPORTANT: This key will be stored securely in Script Properties.',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response.getSelectedButton() === ui.Button.OK) {
      var apiKey = response.getResponseText().trim();
      
      // Validate key format
      if (!apiKey.startsWith('re_')) {
        ui.alert('Error', 'Invalid API key format. Key should start with re_', ui.ButtonSet.OK);
        return;
      }
      
      // Store securely
      var props = PropertiesService.getScriptProperties();
      props.setProperty('RESEND_API_KEY', apiKey);
      
      Logger.log('Resend API key updated by admin: ' + Session.getActiveUser().getEmail());
      
      ui.alert('Success', 'Resend API key has been securely stored.', ui.ButtonSet.OK);
    }
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * View current API key status (Resend only - bank sync disabled)
 */
function ADMIN_ViewApiKeyStatus() {
  try {
    var props = PropertiesService.getScriptProperties();
    
    var resendKey = props.getProperty('RESEND_API_KEY');
    var resendStatus = resendKey ? '✅ Configured (' + resendKey.substring(0, 5) + '...)' : '❌ Not configured';
    
    SpreadsheetApp.getUi().alert(
      'API Key Status',
      'RESEND API KEY (Email):\n' + resendStatus + '\n\n' +
      'BANK SYNC: Disabled\n' +
      '• Money Mastery uses manual transaction entry only\n' +
      '• No Plaid, Stripe, or Teller integration\n\n' +
      'Use ADMIN_SetResendApiKey() to configure email notifications.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Clear all API keys (for security audit or key rotation)
 */
function ADMIN_ClearApiKeys() {
  try {
    var ui = SpreadsheetApp.getUi();
    
    var response = ui.alert(
      'Clear API Keys',
      '⚠️ WARNING: This will remove all API keys from Script Properties.\n\n' +
      'You will need to reconfigure them for the system to work.\n\n' +
      'Are you sure?',
      ui.ButtonSet.YES_NO
    );
    
    if (response === ui.Button.YES) {
      var props = PropertiesService.getScriptProperties();
      props.deleteProperty('STRIPE_API_KEY');
      props.deleteProperty('RESEND_API_KEY');
      props.deleteProperty('STRIPE_API_KEY_FALLBACK');
      
      Logger.log('API keys cleared by admin: ' + Session.getActiveUser().getEmail());
      
      ui.alert('Cleared', 'All API keys have been removed. Reconfigure before use.', ui.ButtonSet.OK);
    }
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// ═══════════════════════════════════════════════════════════════════
// END OF ADMIN CONTROLS
// ═══════════════════════════════════════════════════════════════════
