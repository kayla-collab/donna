/**
 * RESEND EMAIL INTEGRATION
 * Send professional HTML emails via Resend API
 * 
 * NOTE: Uses RESEND_CONFIG from Config.gs - DO NOT define here
 * This ensures all emails use the same API key and configuration
 */

/**
 * Send "Welcome to Business Money Mastery" registration email
 */
function sendRegistrationWelcomeEmail(userEmail, firstName) {
  try {
    if (!userEmail) {
      Logger.log('ERROR: Cannot send welcome email - no email provided');
      return { success: false, error: 'No email provided' };
    }
    
    firstName = firstName || 'there';
    var currentYear = new Date().getFullYear();
    
    // Build welcome email HTML
    var html = buildWelcomeEmailHTML({
      firstName: firstName,
      currentYear: currentYear,
      userEmail: userEmail
    });
    
    // Send via Resend
    var result = sendEmailViaResend(userEmail, 'Welcome to Business Money Mastery!', html);
    
    if (result.success) {
      Logger.log('Welcome email sent successfully to: ' + userEmail);
    } else {
      Logger.log('ERROR sending welcome email: ' + result.error);
    }
    
    return result;
    
  } catch (e) {
    Logger.log('ERROR in sendRegistrationWelcomeEmail: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Send "Transaction Data Ready" email
 */
function sendTransactionReadyEmail(itemId, transactionCount) {
  try {
    // Get user email
    var userEmail = Session.getActiveUser().getEmail();
    if (!userEmail) {
      // Try to find email from user properties
      var userProps = PropertiesService.getUserProperties();
      var props = MM_getProps_();
      userEmail = props.getProperty('mm_primary_email');
    }
    
    if (!userEmail) {
      Logger.log('ERROR: Cannot send email - no user email found');
      return;
    }
    
    // Get account metadata
    var metadata = getAccountMetadata(itemId);
    var accountName = metadata ? metadata.institution : 'Your Bank';
    
    // Get connected accounts count (Updated 2026: Check Stripe accounts, fallback to legacy Plaid key)
    var userProps = PropertiesService.getUserProperties();
    var connectedJson = userProps.getProperty('stripe_connected_accounts') || 
                        userProps.getProperty('connected_accounts') ||
                        userProps.getProperty('plaid_connected_accounts'); // Legacy fallback
    var accountCount = connectedJson ? JSON.parse(connectedJson).length : 1;
    
    // Get user name
    var props = MM_getProps_();
    var firstName = props.getProperty('mm_first_name') || 'there';
    
    // Current year
    var currentYear = new Date().getFullYear();
    
    // Build email HTML
    var html = buildTransactionReadyEmailHTML({
      firstName: firstName,
      transactionCount: transactionCount,
      accountCount: accountCount,
      accountName: accountName,
      currentYear: currentYear
    });
    
    // Send via Resend
    var result = sendEmailViaResend(userEmail, 'Your Money Mastery Transactions Are Ready', html);
    
    if (result.success) {
      Logger.log('Email sent successfully to: ' + userEmail);
    } else {
      Logger.log('ERROR sending email: ' + result.error);
    }
    
    return result;
    
  } catch (e) {
    Logger.log('ERROR in sendTransactionReadyEmail: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Send email via Resend API
 */
function sendEmailViaResend(toEmail, subject, htmlContent) {
  try {
    var url = RESEND_CONFIG.API_BASE + '/emails';
    
    var payload = {
      from: RESEND_CONFIG.FROM_NAME + ' <' + RESEND_CONFIG.FROM_EMAIL + '>',
      to: [toEmail],
      subject: subject,
      html: htmlContent
    };
    
    var options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + RESEND_CONFIG.API_KEY
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    Logger.log('Sending email to: ' + toEmail);
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var data = JSON.parse(response.getContentText());
    
    if (responseCode === 200) {
      return { success: true, id: data.id };
    } else {
      return { success: false, error: JSON.stringify(data) };
    }
    
  } catch (e) {
    Logger.log('ERROR calling Resend API: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Build welcome email HTML template
 * BRANDED: Uses system gold (#9a8368) and teal (#456a73) colors
 * FONTS: Playfair Display for headings, Montserrat for body
 */
function buildWelcomeEmailHTML(data) {
  var html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    body { 
      font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif; 
      background: #f5f3f0; 
      margin: 0; 
      padding: 0; 
      line-height: 1.7;
      color: #1a1a1a;
    }
    .container { 
      max-width: 600px; 
      margin: 40px auto; 
      background: white; 
      border-radius: 16px; 
      overflow: hidden; 
      box-shadow: 0 4px 24px rgba(0,0,0,0.08); 
    }
    .header { 
      background: linear-gradient(135deg, #9a8368 0%, #456a73 100%); 
      padding: 50px 30px; 
      text-align: center; 
      color: white; 
    }
    .header h1 { 
      margin: 0; 
      font-size: 36px; 
      font-weight: 600; 
      font-family: 'Playfair Display', Georgia, serif;
      letter-spacing: 0.5px;
    }
    .header p { 
      margin: 16px 0 0 0; 
      opacity: 0.95; 
      font-size: 16px;
      font-weight: 400;
    }
    .content { 
      padding: 45px 35px; 
    }
    .content p { 
      font-size: 15px; 
      color: #333333; 
      line-height: 1.8; 
      margin: 0 0 20px 0; 
    }
    .greeting {
      font-size: 17px;
      color: #456a73;
      font-weight: 500;
    }
    .welcome-box { 
      background: linear-gradient(135deg, #456a73 0%, #3a5a62 100%); 
      border-radius: 12px; 
      padding: 30px; 
      margin: 30px 0; 
      text-align: center; 
      color: white; 
    }
    .welcome-box h2 { 
      margin: 0 0 12px 0; 
      font-size: 22px;
      font-family: 'Playfair Display', Georgia, serif;
      font-weight: 600;
    }
    .welcome-box p { 
      margin: 0; 
      font-size: 14px; 
      opacity: 0.95;
      line-height: 1.6;
    }
    .next-steps { 
      background: #faf9f7; 
      border-radius: 12px; 
      padding: 28px; 
      margin: 30px 0; 
      border-left: 4px solid #9a8368;
    }
    .next-steps h3 { 
      margin: 0 0 18px 0; 
      font-size: 18px; 
      color: #456a73;
      font-family: 'Playfair Display', Georgia, serif;
      font-weight: 600;
    }
    .next-steps ul { 
      margin: 0; 
      padding-left: 0;
      list-style: none;
    }
    .next-steps li { 
      margin: 14px 0; 
      font-size: 14px; 
      color: #333333; 
      line-height: 1.6;
      padding-left: 28px;
      position: relative;
    }
    .next-steps li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #9a8368;
      font-weight: 600;
    }
    .help-note {
      background: #E0F2F2;
      border-radius: 10px;
      padding: 20px 24px;
      margin: 25px 0;
      border-left: 4px solid #456a73;
    }
    .help-note p {
      margin: 0;
      font-size: 14px;
      color: #3a5a62;
    }
    .footer { 
      text-align: center; 
      padding: 30px; 
      background: #f5f3f0; 
      color: #666666; 
      font-size: 12px; 
      line-height: 1.7; 
    }
    .footer p { 
      margin: 4px 0; 
    }
    .footer .brand {
      color: #456a73;
      font-weight: 600;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Business Money Mastery</h1>
      <p>Your business financial clarity starts here</p>
    </div>
    
    <div class="content">
      <p class="greeting">Hi ${data.firstName},</p>
      
      <p>
        Thank you for joining Business Money Mastery! We're honored to help you gain clarity 
        and control over your business finances - from revenue tracking to profit optimization.
      </p>
      
      <div class="welcome-box">
        <h2>Your Business Account is Ready</h2>
        <p>Everything is set up and waiting for you. Let's start building your profitable business together.</p>
      </div>
      
      <div class="next-steps">
        <h3>Getting Started</h3>
        <ul>
          <li><strong>Open your Business Money Mastery sheet</strong> and explore the dashboard</li>
          <li><strong>Add your business transactions</strong> to begin tracking revenue and expenses</li>
          <li><strong>Categorize for tax purposes</strong> to see deductions and profit margins</li>
          <li><strong>View Profit & Loss reports</strong> for business insights and quarterly planning</li>
        </ul>
      </div>
      
      <div class="help-note">
        <p>
          <strong>Need help?</strong> We're here for you! Use the <strong>Access Support</strong> menu 
          in your sheet anytime, or reach out to our team directly.
        </p>
      </div>
      
      <p style="margin-top: 25px; color: #666666; font-size: 13px;">
        <strong>Your Business Account:</strong> ${data.userEmail}
      </p>
    </div>
    
    <div class="footer">
      <p class="brand">Business Money Mastery</p>
      <p>© ${data.currentYear} Donna Roggio LLC. All Rights Reserved.</p>
      <p style="margin-top: 10px; color: #999;">Strategic financial management for your business growth</p>
    </div>
  </div>
</body>
</html>
  `;
  
  return html;
}

/**
 * Build professional HTML email template
 */
function buildTransactionReadyEmailHTML(data) {
  var html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f0; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #ab9478 0%, #8b7860 100%); padding: 40px 30px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 16px; }
    .content { padding: 40px 30px; }
    .content p { font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 20px 0; }
    .stats { display: flex; justify-content: space-around; margin: 30px 0; }
    .stat { text-align: center; }
    .stat-number { font-size: 36px; font-weight: 700; color: #ab9478; line-height: 1; }
    .stat-label { font-size: 14px; color: #666; margin-top: 8px; }
    .account-list { background: #f8f4ef; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .account-list p { font-weight: 600; margin: 0 0 12px 0; color: #5a5146; font-size: 14px; }
    .account-item { display: flex; align-items: center; gap: 10px; margin: 8px 0; font-size: 14px; color: #666; }
    .account-icon { width: 8px; height: 8px; background: #ab9478; border-radius: 50%; flex-shrink: 0; }
    .notice { background: #fff9e6; border-left: 4px solid #ab9478; padding: 15px 20px; margin: 25px 0; border-radius: 4px; }
    .notice strong { color: #5a5146; font-size: 14px; }
    .notice p { font-size: 14px; color: #5a5146; margin: 5px 0 0 0; line-height: 1.6; }
    .footer { text-align: center; padding: 30px; background: #f5f3ef; color: #888; font-size: 12px; line-height: 1.6; }
    .footer p { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Your Data is Ready!</h1>
      <p>Money Mastery Dashboard</p>
    </div>
    
    <div class="content">
      <p>Hi ${data.firstName},</p>
      
      <p>
        Great news! Your bank transactions have been successfully imported and are ready for review.
      </p>
      
      <div class="stats">
        <div class="stat">
          <div class="stat-number">${data.transactionCount}</div>
          <div class="stat-label">Transactions Imported</div>
        </div>
        <div class="stat">
          <div class="stat-number">${data.accountCount}</div>
          <div class="stat-label">Account${data.accountCount > 1 ? 's' : ''} Connected</div>
        </div>
      </div>
      
      <div class="account-list">
        <p>Connected Accounts:</p>
        <div class="account-item">
          <div class="account-icon"></div>
          <span>${data.accountName}</span>
        </div>
      </div>
      
      <div class="notice">
        <strong>Important Note:</strong>
        <p>
          Only transactions from ${data.currentYear} will be included in your Profit & Loss reports 
          and yearly calculations. Historical data is available for reference in your transaction sheets.
        </p>
      </div>
      
      <p style="margin-top: 30px;">
        Open your Money Mastery spreadsheet to begin categorizing transactions and generating financial insights.
      </p>
      
      <p style="font-size: 14px; color: #888;">
        Your data syncs automatically, so new transactions will appear in your sheet as they occur.
      </p>
    </div>
    
    <div class="footer">
      <p><strong>Money Mastery System</strong></p>
      <p>© ${data.currentYear} Donna Roggio LLC. All Rights Reserved.</p>
      <p>Secure financial management for your business and personal finances</p>
    </div>
  </div>
</body>
</html>
  `;
  
  return html;
}

/**
 * Test email function (for admin)
 */
function ADMIN_TriggerEmailManually() {
  try {
    var ui = SpreadsheetApp.getUi();
    var response = ui.prompt(
      'Test Email',
      'Enter email address to send test notification:',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response.getSelectedButton() === ui.Button.OK) {
      var email = response.getResponseText();
      
      // Get first connected item for test (Updated 2026: Check Stripe first)
      var userProps = PropertiesService.getUserProperties();
      var connectedJson = userProps.getProperty('stripe_connected_accounts') || 
                          userProps.getProperty('connected_accounts') ||
                          userProps.getProperty('plaid_connected_accounts'); // Legacy fallback
      var itemId = connectedJson ? JSON.parse(connectedJson)[0] : 'test_item';
      
      // Send test email
      var result = sendTransactionReadyEmail(itemId, 245);
      
      if (result.success) {
        ui.alert('Success', 'Test email sent to: ' + email, ui.ButtonSet.OK);
      } else {
        ui.alert('Error', 'Failed to send email: ' + result.error, ui.ButtonSet.OK);
      }
    }
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Send welcome email to guest users
 * Called when a guest completes their registration
 */
function sendGuestWelcomeEmail(guestEmail, firstName) {
  try {
    if (!guestEmail) {
      Logger.log('ERROR: Cannot send guest welcome email - no email provided');
      return { success: false, error: 'No email provided' };
    }
    
    firstName = firstName || 'there';
    var currentYear = new Date().getFullYear();
    
    // Build guest welcome email HTML
    var html = buildGuestWelcomeEmailHTML({
      firstName: firstName,
      currentYear: currentYear,
      guestEmail: guestEmail
    });
    
    // Send via Resend
    var result = sendEmailViaResend(guestEmail, 'Welcome to Money Mastery - Guest Access Confirmed!', html);
    
    if (result.success) {
      Logger.log('Guest welcome email sent successfully to: ' + guestEmail);
    } else {
      Logger.log('ERROR sending guest welcome email: ' + result.error);
    }
    
    return result;
    
  } catch (e) {
    Logger.log('ERROR in sendGuestWelcomeEmail: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Build guest welcome email HTML template
 * BRANDED: Uses system gold (#9a8368) and teal (#456a73) colors
 */
function buildGuestWelcomeEmailHTML(data) {
  var html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    body { 
      font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif; 
      background: #f5f3f0; 
      margin: 0; 
      padding: 0; 
      line-height: 1.7;
      color: #1a1a1a;
    }
    .container { 
      max-width: 600px; 
      margin: 40px auto; 
      background: white; 
      border-radius: 16px; 
      overflow: hidden; 
      box-shadow: 0 4px 24px rgba(0,0,0,0.08); 
    }
    .header { 
      background: linear-gradient(135deg, #456a73 0%, #9a8368 100%); 
      padding: 50px 30px; 
      text-align: center; 
      color: white; 
    }
    .header h1 { 
      margin: 0; 
      font-size: 32px; 
      font-weight: 600; 
      font-family: 'Playfair Display', Georgia, serif;
      letter-spacing: 0.5px;
    }
    .header p { 
      margin: 16px 0 0 0; 
      opacity: 0.95; 
      font-size: 16px;
      font-weight: 400;
    }
    .content { 
      padding: 40px 35px; 
    }
    .greeting {
      font-size: 22px;
      font-weight: 600;
      color: #9a8368;
      margin-bottom: 20px;
      font-family: 'Playfair Display', Georgia, serif;
    }
    .message {
      font-size: 15px;
      color: #444;
      margin-bottom: 25px;
    }
    .info-box {
      background: linear-gradient(135deg, #f8f6f3 0%, #f0ebe4 100%);
      border-left: 4px solid #456a73;
      padding: 20px;
      border-radius: 8px;
      margin: 25px 0;
    }
    .info-box h3 {
      color: #456a73;
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 600;
    }
    .info-box ul {
      margin: 0;
      padding-left: 20px;
      color: #555;
    }
    .info-box li {
      margin: 8px 0;
    }
    .footer { 
      background: #f8f6f3; 
      padding: 30px; 
      text-align: center; 
      border-top: 1px solid #e8e4df;
    }
    .footer p { 
      margin: 0; 
      color: #888; 
      font-size: 13px; 
    }
    .footer a {
      color: #9a8368;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome, Guest!</h1>
      <p>Your access has been confirmed</p>
    </div>
    <div class="content">
      <p class="greeting">Hi ${data.firstName}! 👋</p>
      <p class="message">
        Thank you for registering as a guest on Money Mastery! Your account is now active and ready to use.
      </p>
      
      <div class="info-box">
        <h3>What You Can Do</h3>
        <ul>
          <li>View the financial dashboard and reports</li>
          <li>See transaction history and categories</li>
          <li>Access account overviews and summaries</li>
        </ul>
      </div>
      
      <p class="message">
        As a guest, you have view-only access to help you stay informed about the finances shared with you. 
        If you have any questions, please reach out to the account owner.
      </p>
      
      <p class="message" style="margin-top: 30px;">
        Welcome aboard!<br>
        <strong style="color: #9a8368;">The Money Mastery Team</strong>
      </p>
    </div>
    <div class="footer">
      <p>&copy; ${data.currentYear} Donna Roggio LLC. All rights reserved.</p>
      <p style="margin-top: 8px;"><a href="https://moneymastery-system.com">moneymastery-system.com</a></p>
    </div>
  </div>
</body>
</html>
`;
  return html;
}
