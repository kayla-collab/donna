/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * DYNAMIC LOADING SCREENS
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Professional, warm, promotional loading messages with rotating tips
 * 
 * 2026 UPDATE: 
 * - Removed all bank connection/sync references
 * - Money Mastery uses MANUAL TRANSACTION ENTRY only
 * - Updated tips to reflect manual entry workflow
 */

/**
 * Show dynamic loading screen with rotating tips
 * @param {string} title - Main loading message
 * @param {Array<string>} tips - Array of tips to rotate
 * @param {number} width - Dialog width (default 420)
 * @param {number} height - Dialog height (default 280)
 */
function showDynamicLoading(title, tips, width, height) {
  width = width || 420;
  height = height || 280;
  
  var tipsJson = JSON.stringify(tips);
  
  var html = [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">',
    '<style>',
    'body { font-family: "Montserrat", Arial, sans-serif; padding: 30px; text-align: center; background: linear-gradient(135deg, #f5f5f0 0%, #e9e4dc 100%); margin: 0; }',
    '.spinner { border: 4px solid #f3f3f3; border-top: 4px solid #ab9478; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px; }',
    '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }',
    '.title { font-family: "Playfair Display", serif; font-size: 18px; font-weight: 600; color: #7a6752; margin-bottom: 20px; }',
    '.tip { font-size: 14px; color: #666; min-height: 60px; line-height: 1.6; padding: 0 20px; margin: 20px 0; transition: opacity 0.3s ease; }',
    '.tip.fade { opacity: 0; }',
    '.footer { font-size: 11px; color: #999; margin-top: 20px; }',
    '</style>',
    '</head>',
    '<body>',
    '<div class="spinner"></div>',
    '<div class="title">' + title + '</div>',
    '<div class="tip" id="tip"></div>',
    '<div class="footer">© 2026 Donna Roggio LLC</div>',
    '<script>',
    'var tips = ' + tipsJson + ';',
    'var tipEl = document.getElementById("tip");',
    'var currentTip = 0;',
    'function rotateTip() {',
    '  tipEl.classList.add("fade");',
    '  setTimeout(function() {',
    '    tipEl.textContent = tips[currentTip];',
    '    tipEl.classList.remove("fade");',
    '    currentTip = (currentTip + 1) % tips.length;',
    '  }, 300);',
    '}',
    'rotateTip();',
    'setInterval(rotateTip, 3500);',
    '</script>',
    '</body>',
    '</html>'
  ].join('\n');
  
  var htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(width)
    .setHeight(height);
  
  SpreadsheetApp.getUi().showModelessDialog(htmlOutput, ' ');
}

/**
 * ═══════════════════════════════════════════════════════════════════
 * LOADING SCREEN PRESETS - 2026 Manual Entry Version
 * ═══════════════════════════════════════════════════════════════════
 */

function LOADING_SettingUpAccount() {
  var tips = [
    'Money Mastery tracks income and expenses across all your accounts',
    'Our system helps you identify spending patterns and savings opportunities',
    'Your financial data is protected with secure encryption',
    'Generate detailed reports for tax preparation and financial planning'
  ];
  showDynamicLoading('Setting up your account...', tips);
}

function LOADING_PreparingWorkspace() {
  var tips = [
    'Categorize transactions to understand where your money goes',
    'Generate yearly reports for tax preparation and financial planning',
    'Track up to 10 accounts for a complete financial picture',
    'Separate business and personal expenses for better insights'
  ];
  showDynamicLoading('Preparing your workspace...', tips);
}

function LOADING_UnlockingDashboard() {
  var tips = [
    'Your financial data is encrypted with secure storage',
    'Regular review of your finances supports better decision-making',
    'Smart categorization learns from your transaction patterns',
    'Export detailed reports for tax preparation and analysis'
  ];
  showDynamicLoading('Unlocking your dashboard...', tips);
}

function LOADING_ProcessingTransactions() {
  var tips = [
    'Processing your transactions securely',
    'Transactions are automatically organized by type',
    'Track spending trends across weeks, months, and years',
    'Identify recurring expenses and subscription services'
  ];
  showDynamicLoading('Processing transactions...', tips);
}

function LOADING_PopulatingData() {
  var tips = [
    'Organizing your transaction history',
    'Sorting data into income and expense categories',
    'Building your financial overview dashboard',
    'Preparing reports and insights'
  ];
  showDynamicLoading('Populating your data...', tips);
}

function LOADING_SavingChanges() {
  var tips = [
    'Saving your changes securely',
    'Updating your financial records',
    'Refreshing dashboard calculations',
    'Almost done...'
  ];
  showDynamicLoading('Saving changes...', tips);
}

function LOADING_GeneratingReport() {
  var tips = [
    'Analyzing your financial data',
    'Calculating income and expense totals',
    'Building category breakdowns',
    'Preparing your report...'
  ];
  showDynamicLoading('Generating report...', tips);
}

function LOADING_SyncingBusinessData() {
  var tips = [
    'Syncing your business account data',
    'Updating business categories',
    'Processing moved transactions',
    'Applying currency conversions...'
  ];
  showDynamicLoading('Syncing business data...', tips);
}

/**
 * ═══════════════════════════════════════════════════════════════════
 * DEPRECATED - Kept for backward compatibility
 * ═══════════════════════════════════════════════════════════════════
 */

/**
 * @deprecated Bank connections removed in 2026 - Use manual entry
 */
function LOADING_ConnectingToPlaid() {
  Logger.log('[DEPRECATED] LOADING_ConnectingToPlaid - Bank sync removed');
  LOADING_PreparingWorkspace();
}

/**
 * @deprecated Bank connections removed in 2026 - Use manual entry
 */
function LOADING_ConnectingToBank() {
  Logger.log('[DEPRECATED] LOADING_ConnectingToBank - Bank sync removed');
  LOADING_PreparingWorkspace();
}

/**
 * @deprecated Bank connections removed in 2026 - Use manual entry
 */
function LOADING_EstablishingConnection() {
  Logger.log('[DEPRECATED] LOADING_EstablishingConnection - Bank sync removed');
  LOADING_PreparingWorkspace();
}

/**
 * @deprecated Bank transactions removed in 2026 - Use manual entry
 */
function LOADING_FetchingTransactions() {
  Logger.log('[DEPRECATED] LOADING_FetchingTransactions - Bank sync removed');
  LOADING_ProcessingTransactions();
}

/**
 * Close any open loading screen
 */
function closeLoadingScreen() {
  // This will be called from client-side to close the modeless dialog
  try {
    google.script.host.close();
  } catch (e) {
    // Ignore if not in dialog context
  }
}
