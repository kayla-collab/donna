/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * SUPPORTTICKET.GS - Support Ticket System with Resend API
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Features in this version:
 * 1) ✅ Support ticket submission via Resend API (no Gmail dependency)
 * 2) ✅ Full-screen modal dialog (not sidebar)
 * 3) ✅ File upload with automatic Drive conversion
 * 4) ✅ Automatic ticket logging to Script Properties
 * 5) ✅ User confirmation with ticket code, photos & submitted text
 * 6) ✅ Error handling with user-friendly messages
 * 7) ✅ System brand colors (gold #9a8368, teal #456a73)
 * 
 * RESEND API INTEGRATION:
 * - Endpoint: https://api.resend.com/emails
 * - Uses RESEND_CONFIG from Config.gs (same as MFA.gs, Welcome.gs)
 * - Supports HTML email templates
 * - No Gmail/Calendar permissions required
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Async email sending (doesn't block UI)
 * - Ticket history cached in Script Properties
 * - Minimal SpreadsheetApp calls
 */

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

var SUPPORT_CONFIG = {
  SUPPORT_EMAIL: 'support@risingandthriving.com',
  // FROM_EMAIL and FROM_NAME now come from RESEND_CONFIG in Config.gs
  MAX_TICKET_HISTORY: 100,
  TICKET_CATEGORIES: [
    'Technical Issue',
    'Feature Request',
    'Billing Question',
    'General Inquiry',
    'Bug Report',
    'Account Access',
    'Other'
  ],
  // System Brand Colors (matching ClarityReports.html)
  BRAND_GOLD: '#9a8368',
  BRAND_GOLD_DARK: '#7a6858',
  BRAND_GOLD_LIGHT: '#b4a08a',
  BRAND_GOLD_LIGHTEST: '#d4c9bb',
  BRAND_TEAL: '#456a73',
  BRAND_TEAL_DARK: '#3a5a62',
  BRAND_TEAL_LIGHT: '#5a8a94',
  BRAND_BG: '#f5f3f0',
  BRAND_BG_LIGHT: '#faf9f7'
};

// ═══════════════════════════════════════════════════════════════════
// SUPPORT TICKET MODAL (FULL SCREEN)
// ═══════════════════════════════════════════════════════════════════

/**
 * Opens the support ticket submission form as full-screen modal
 */
function showSupportTicketForm() {
  // Security check
  if (!_mm_isSessionLoggedIn_()) {
    _mm_requireLoginOrOpenGate_();
    return;
  }
  
  try {
    var html = HtmlService.createHtmlOutput(_supportBuildTicketFormHTML_())
      .setWidth(800)
      .setHeight(700);
    SpreadsheetApp.getUi().showModalDialog(html, 'Support Ticket');
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error opening support form: ' + e.message);
    Logger.log('showSupportTicketForm error: ' + e);
  }
}

/**
 * Generates a random alphanumeric confirmation code
 * @param {number} length - Length of code (default 8)
 * @returns {string} Random code like "MM-ABC12DEF"
 */
function _generateSupportCode_(length) {
  length = length || 8;
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var code = '';
  for (var i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'MM-' + code;
}

/**
 * Uploads a support ticket file to Google Drive
 * @param {string} base64Data - Base64 encoded file data
 * @param {string} fileName - Original file name
 * @param {string} mimeType - File MIME type
 * @returns {Object} Result with driveUrl or error
 */
function uploadSupportFile(base64Data, fileName, mimeType) {
  try {
    // Create or get Support Tickets folder
    var folderName = 'Money Mastery Support Files';
    var folders = DriveApp.getFoldersByName(folderName);
    var folder;
    
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }
    
    // Decode base64 and create file
    var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);
    var file = folder.createFile(blob);
    
    // Set file sharing to anyone with link can view
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var url = file.getUrl();
    
    Logger.log('✅ Support file uploaded: ' + fileName + ' -> ' + url);
    
    return {
      success: true,
      driveUrl: url,
      fileId: file.getId(),
      fileName: fileName
    };
    
  } catch (e) {
    Logger.log('[ERROR] uploadSupportFile: ' + e.message);
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Generates embedded HTML for Support Ticket form
 * Full-screen modal with file upload and system brand colors
 */
function _supportBuildTicketFormHTML_() {
  return `<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --gold: #9a8368;
      --gold-dark: #7a6858;
      --gold-light: #b4a08a;
      --gold-lightest: #d4c9bb;
      --teal: #456a73;
      --teal-dark: #3a5a62;
      --teal-light: #5a8a94;
      --bg: #f5f3f0;
      --bg-light: #faf9f7;
      --text: #1a1a1a;
      --text-light: #333333;
      --text-muted: #666666;
      --white: #ffffff;
      --success: #1a7a4c;
      --error: #b91c1c;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      color: var(--text);
      background: var(--bg);
      padding: 0;
      height: 100vh;
      overflow: hidden;
    }
    
    .modal-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    
    .header {
      background: linear-gradient(135deg, var(--gold) 0%, var(--teal) 100%);
      color: var(--white);
      padding: 24px 32px;
      text-align: center;
      flex-shrink: 0;
    }
    
    .header h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 26px;
      font-weight: 600;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }
    
    .header p {
      font-family: 'Montserrat', sans-serif;
      font-size: 14px;
      font-weight: 300;
      opacity: 0.95;
    }
    
    .content-area {
      flex: 1;
      overflow-y: auto;
      padding: 24px 32px;
    }
    
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    
    .form-grid .full-width {
      grid-column: 1 / -1;
    }
    
    .form-group {
      margin-bottom: 0;
    }
    
    label {
      display: block;
      font-family: 'Montserrat', sans-serif;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--teal);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    label .required {
      color: var(--gold);
      margin-left: 4px;
    }
    
    input, select, textarea {
      width: 100%;
      padding: 12px 14px;
      border: 2px solid var(--gold-lightest);
      border-radius: 8px;
      font-size: 14px;
      font-family: 'Montserrat', sans-serif;
      transition: all 0.25s ease;
      background: var(--white);
      color: var(--text);
    }
    
    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: var(--teal);
      box-shadow: 0 0 0 4px rgba(69, 106, 115, 0.1);
    }
    
    textarea {
      resize: vertical;
      min-height: 100px;
      line-height: 1.6;
    }
    
    .char-count {
      font-size: 11px;
      color: var(--text-muted);
      text-align: right;
      margin-top: 6px;
      font-weight: 500;
    }
    
    /* File Upload Area */
    .upload-area {
      border: 2px dashed var(--gold-light);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      background: var(--bg-light);
      transition: all 0.25s ease;
      cursor: pointer;
    }
    
    .upload-area:hover, .upload-area.dragover {
      border-color: var(--teal);
      background: rgba(69, 106, 115, 0.05);
    }
    
    .upload-area.uploading {
      opacity: 0.7;
      pointer-events: none;
    }
    
    .upload-icon {
      font-size: 36px;
      margin-bottom: 12px;
    }
    
    .upload-text {
      font-size: 14px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    
    .upload-text strong {
      color: var(--teal);
    }
    
    .upload-hint {
      font-size: 12px;
      color: var(--text-muted);
    }
    
    .file-input {
      display: none;
    }
    
    /* Uploaded Files List */
    .uploaded-files {
      margin-top: 16px;
    }
    
    .uploaded-file {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      background: var(--white);
      border: 1px solid var(--gold-lightest);
      border-radius: 8px;
      margin-bottom: 8px;
    }
    
    .uploaded-file .file-icon {
      font-size: 20px;
    }
    
    .uploaded-file .file-info {
      flex: 1;
      min-width: 0;
    }
    
    .uploaded-file .file-name {
      font-size: 13px;
      font-weight: 500;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .uploaded-file .file-status {
      font-size: 11px;
      color: var(--success);
    }
    
    .uploaded-file .file-status.uploading {
      color: var(--gold);
    }
    
    .uploaded-file .remove-btn {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: none;
      background: rgba(185, 28, 28, 0.1);
      color: var(--error);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: all 0.2s;
    }
    
    .uploaded-file .remove-btn:hover {
      background: rgba(185, 28, 28, 0.2);
    }
    
    /* Buttons */
    .button-row {
      display: flex;
      gap: 12px;
      padding: 20px 32px;
      background: var(--white);
      border-top: 1px solid var(--gold-lightest);
      flex-shrink: 0;
    }
    
    .btn {
      flex: 1;
      padding: 14px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-family: 'Montserrat', sans-serif;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .btn-primary {
      background: linear-gradient(135deg, var(--teal) 0%, var(--teal-dark) 100%);
      color: var(--white);
      box-shadow: 0 4px 12px rgba(69, 106, 115, 0.3);
    }
    
    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(69, 106, 115, 0.4);
    }
    
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    
    .btn-secondary {
      background: var(--bg);
      color: var(--teal);
      border: 2px solid var(--teal);
    }
    
    .btn-secondary:hover {
      background: rgba(69, 106, 115, 0.1);
    }
    
    .btn-close {
      background: transparent;
      color: var(--text-muted);
      border: 2px solid var(--gold-lightest);
    }
    
    .btn-close:hover {
      background: var(--bg);
      border-color: var(--gold-light);
    }
    
    /* Messages */
    .message {
      padding: 14px 18px;
      border-radius: 10px;
      margin-bottom: 20px;
      font-size: 14px;
      display: none;
      animation: slideIn 0.3s ease;
      font-weight: 500;
    }
    
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .message.success {
      background: rgba(26, 122, 76, 0.1);
      color: var(--success);
      border-left: 4px solid var(--success);
    }
    
    .message.error {
      background: rgba(185, 28, 28, 0.1);
      color: var(--error);
      border-left: 4px solid var(--error);
    }
    
    .message.info {
      background: rgba(154, 131, 104, 0.1);
      color: var(--gold-dark);
      border-left: 4px solid var(--gold);
    }
    
    /* Loading Spinner */
    .loading-spinner {
      display: inline-block;
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .hidden {
      display: none !important;
    }
    
    /* Info box */
    .info-box {
      background: var(--bg-light);
      padding: 14px 16px;
      border-radius: 8px;
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.6;
      border: 1px solid var(--gold-lightest);
    }
    
    .info-box strong {
      color: var(--teal);
    }
  </style>
</head>
<body>
  <div class="modal-container">
    <div class="header">
      <h1>Support Ticket</h1>
      <p>We're here to help you on your journey</p>
    </div>
    
    <div class="content-area">
      <div id="message" class="message"></div>
      
      <form id="ticketForm" onsubmit="submitTicket(event)">
        <div class="form-grid">
          <div class="form-group">
            <label for="name">Your Name <span class="required">*</span></label>
            <input type="text" id="name" name="name" required placeholder="Enter your full name" maxlength="100">
          </div>
          
          <div class="form-group">
            <label for="email">Email Address <span class="required">*</span></label>
            <input type="email" id="email" name="email" required placeholder="your@email.com" maxlength="100">
          </div>
          
          <div class="form-group">
            <label for="category">Category <span class="required">*</span></label>
            <select id="category" name="category" required>
              <option value="">-- Please select --</option>
              <option value="Technical Issue">Technical Issue</option>
              <option value="Feature Request">Feature Request</option>
              <option value="Billing Question">Billing Question</option>
              <option value="General Inquiry">General Inquiry</option>
              <option value="Bug Report">Bug Report</option>
              <option value="Account Access">Account Access</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="subject">Subject <span class="required">*</span></label>
            <input type="text" id="subject" name="subject" required placeholder="Brief summary" maxlength="200">
          </div>
          
          <div class="form-group full-width">
            <label for="messageText">Message <span class="required">*</span></label>
            <textarea id="messageText" name="message" required placeholder="Please share the details of how we can help you..." maxlength="2000" oninput="updateCharCount()"></textarea>
            <div class="char-count" id="charCount">0 / 2000 characters</div>
          </div>
          
          <div class="form-group full-width">
            <label>Screenshots / Attachments <span style="color:var(--text-muted);font-weight:400;text-transform:none;">(Optional)</span></label>
            
            <div class="upload-area" id="uploadArea" onclick="document.getElementById('fileInput').click()">
              <div class="upload-icon">📎</div>
              <div class="upload-text"><strong>Click to upload</strong> or drag and drop</div>
              <div class="upload-hint">PNG, JPG, PDF up to 10MB each (max 5 files)</div>
            </div>
            <input type="file" id="fileInput" class="file-input" multiple accept="image/*,.pdf" onchange="handleFileSelect(event)">
            
            <div class="uploaded-files" id="uploadedFiles"></div>
          </div>
          
          <div class="form-group full-width">
            <div class="info-box">
              <strong>Response Time:</strong> We typically respond within 24-48 hours. Your patience means the world to us!
            </div>
          </div>
        </div>
      </form>
    </div>
    
    <div class="button-row">
      <button type="button" class="btn btn-close" onclick="google.script.host.close()">Cancel</button>
      <button type="button" class="btn btn-secondary" onclick="resetForm()">Clear Form</button>
      <button type="button" class="btn btn-primary" id="submitBtn" onclick="submitTicket(event)">
        <span id="btnText">Send Support Request</span>
        <span id="btnSpinner" class="loading-spinner hidden"></span>
      </button>
    </div>
  </div>
  
  <script>
    var uploadedFiles = [];
    var maxFiles = 5;
    var maxFileSize = 10 * 1024 * 1024; // 10MB
    
    // Drag and drop handlers
    var uploadArea = document.getElementById('uploadArea');
    
    uploadArea.addEventListener('dragover', function(e) {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', function(e) {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      handleFiles(e.dataTransfer.files);
    });
    
    function handleFileSelect(event) {
      handleFiles(event.target.files);
      event.target.value = ''; // Reset input
    }
    
    function handleFiles(files) {
      if (uploadedFiles.length >= maxFiles) {
        showMessage('Maximum ' + maxFiles + ' files allowed', 'info');
        return;
      }
      
      for (var i = 0; i < files.length; i++) {
        if (uploadedFiles.length >= maxFiles) break;
        
        var file = files[i];
        
        // Validate file size
        if (file.size > maxFileSize) {
          showMessage(file.name + ' is too large. Maximum size is 10MB.', 'error');
          continue;
        }
        
        // Validate file type
        if (!file.type.match(/image.*/) && file.type !== 'application/pdf') {
          showMessage(file.name + ' is not a supported file type.', 'error');
          continue;
        }
        
        uploadFile(file);
      }
    }
    
    function uploadFile(file) {
      var fileIndex = uploadedFiles.length;
      var fileEntry = {
        name: file.name,
        status: 'uploading',
        driveUrl: null
      };
      uploadedFiles.push(fileEntry);
      renderUploadedFiles();
      
      // Read file as base64
      var reader = new FileReader();
      reader.onload = function(e) {
        var base64 = e.target.result.split(',')[1];
        
        // Upload to Drive
        google.script.run
          .withSuccessHandler(function(result) {
            if (result.success) {
              uploadedFiles[fileIndex].status = 'uploaded';
              uploadedFiles[fileIndex].driveUrl = result.driveUrl;
            } else {
              uploadedFiles[fileIndex].status = 'error';
              showMessage('Failed to upload ' + file.name + ': ' + result.error, 'error');
            }
            renderUploadedFiles();
          })
          .withFailureHandler(function(error) {
            uploadedFiles[fileIndex].status = 'error';
            showMessage('Failed to upload ' + file.name, 'error');
            renderUploadedFiles();
          })
          .uploadSupportFile(base64, file.name, file.type);
      };
      reader.readAsDataURL(file);
    }
    
    function renderUploadedFiles() {
      var container = document.getElementById('uploadedFiles');
      container.innerHTML = '';
      
      uploadedFiles.forEach(function(file, index) {
        var div = document.createElement('div');
        div.className = 'uploaded-file';
        
        var icon = file.name.toLowerCase().endsWith('.pdf') ? '📄' : '🖼️';
        var statusText = file.status === 'uploading' ? 'Uploading...' : 
                         file.status === 'uploaded' ? 'Uploaded successfully' : 'Upload failed';
        var statusClass = file.status === 'uploading' ? 'uploading' : '';
        
        div.innerHTML = 
          '<span class="file-icon">' + icon + '</span>' +
          '<div class="file-info">' +
            '<div class="file-name">' + file.name + '</div>' +
            '<div class="file-status ' + statusClass + '">' + statusText + '</div>' +
          '</div>' +
          '<button type="button" class="remove-btn" onclick="removeFile(' + index + ')">×</button>';
        
        container.appendChild(div);
      });
    }
    
    function removeFile(index) {
      uploadedFiles.splice(index, 1);
      renderUploadedFiles();
    }
    
    function updateCharCount() {
      var textarea = document.getElementById('messageText');
      var counter = document.getElementById('charCount');
      var count = textarea.value.length;
      counter.textContent = count + ' / 2000 characters';
      
      if (count > 1900) {
        counter.style.color = 'var(--error)';
      } else if (count > 1500) {
        counter.style.color = 'var(--gold)';
      } else {
        counter.style.color = 'var(--text-muted)';
      }
    }
    
    function submitTicket(event) {
      if (event) event.preventDefault();
      
      // Check if any files are still uploading
      var stillUploading = uploadedFiles.some(function(f) { return f.status === 'uploading'; });
      if (stillUploading) {
        showMessage('Please wait for files to finish uploading...', 'info');
        return;
      }
      
      var btn = document.getElementById('submitBtn');
      var btnText = document.getElementById('btnText');
      var btnSpinner = document.getElementById('btnSpinner');
      
      btn.disabled = true;
      btnText.classList.add('hidden');
      btnSpinner.classList.remove('hidden');
      
      // Gather form data
      var attachments = uploadedFiles
        .filter(function(f) { return f.status === 'uploaded' && f.driveUrl; })
        .map(function(f) { return f.driveUrl; });
      
      var formData = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        category: document.getElementById('category').value,
        subject: document.getElementById('subject').value.trim(),
        message: document.getElementById('messageText').value.trim(),
        attachments: attachments
      };
      
      // Validate
      if (!formData.name || !formData.email || !formData.category || !formData.subject || !formData.message) {
        showMessage('Please fill in all required fields', 'error');
        resetButton();
        return;
      }
      
      google.script.run
        .withSuccessHandler(function(result) {
          if (result.success) {
            showMessage('Your support request has been received! A confirmation has been sent to ' + formData.email + '. Your ticket code is: ' + result.ticketCode, 'success');
            document.getElementById('ticketForm').reset();
            updateCharCount();
            uploadedFiles = [];
            renderUploadedFiles();
            
            // Close after 3 seconds
            setTimeout(function() {
              google.script.host.close();
            }, 3000);
          } else {
            showMessage('We encountered an issue: ' + (result.error || 'Unknown error') + '. Please try again.', 'error');
          }
          resetButton();
        })
        .withFailureHandler(function(error) {
          showMessage('We encountered an issue: ' + error.message + '. Please try again.', 'error');
          resetButton();
        })
        .submitSupportTicket(formData);
    }
    
    function resetButton() {
      var btn = document.getElementById('submitBtn');
      var btnText = document.getElementById('btnText');
      var btnSpinner = document.getElementById('btnSpinner');
      
      btn.disabled = false;
      btnText.classList.remove('hidden');
      btnSpinner.classList.add('hidden');
    }
    
    function resetForm() {
      if (confirm('Clear all form fields and uploaded files?')) {
        document.getElementById('ticketForm').reset();
        updateCharCount();
        uploadedFiles = [];
        renderUploadedFiles();
        showMessage('Form cleared — ready for a fresh start!', 'info');
      }
    }
    
    function showMessage(text, type) {
      var msg = document.getElementById('message');
      msg.textContent = text;
      msg.className = 'message ' + type;
      msg.style.display = 'block';
      
      // Scroll to top
      document.querySelector('.content-area').scrollTop = 0;
      
      if (type === 'success' || type === 'info') {
        setTimeout(function() {
          msg.style.display = 'none';
        }, 8000);
      }
    }
  </script>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════
// SUPPORT TICKET SUBMISSION (SERVER-SIDE)
// ═══════════════════════════════════════════════════════════════════

/**
 * Submits a support ticket via Resend API
 * @param {Object} ticketData - Form data from client
 * @returns {Object} Result with success flag and ticket code
 */
function submitSupportTicket(ticketData) {
  try {
    if (!ticketData || !ticketData.name || !ticketData.email || !ticketData.message) {
      throw new Error('Missing required fields');
    }
    
    // Use RESEND_CONFIG from Config.gs (same as MFA.gs, Welcome.gs)
    if (typeof RESEND_CONFIG === 'undefined' || !RESEND_CONFIG.API_KEY) {
      throw new Error('Resend API key not configured');
    }
    
    var ticketCode = _generateSupportCode_(8);
    var ticketId = 'TKT-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    
    var attachments = ticketData.attachments || [];
    if (ticketData.attachment && !attachments.length) {
      attachments = [ticketData.attachment];
    }
    
    var emailHtml = _supportBuildTicketEmailHTML_(ticketData, ticketId, ticketCode, attachments);
    
    var response = _supportSendEmailViaResend_({
      from: RESEND_CONFIG.FROM_NAME + ' <' + RESEND_CONFIG.FROM_EMAIL + '>',
      to: SUPPORT_CONFIG.SUPPORT_EMAIL,
      replyTo: ticketData.email,
      subject: '[' + ticketData.category + '] ' + ticketData.subject + ' | ' + ticketCode,
      html: emailHtml
    });
    
    if (response.success) {
      // Log to local Script Properties
      _supportLogTicket_({
        id: ticketId,
        code: ticketCode,
        timestamp: new Date().toISOString(),
        name: ticketData.name,
        email: ticketData.email,
        category: ticketData.category,
        subject: ticketData.subject,
        message: ticketData.message,
        attachments: attachments,
        status: 'submitted'
      });
      
      // Log to MASTER HUB (via Web App for regular users)
      try {
        var hubResult = MH_logTicket({
          supportId: ticketCode,
          category: ticketData.category,
          message: ticketData.subject + '\n\n' + ticketData.message,
          attachments: attachments,
          emailSent: true
        });
        if (!hubResult.success) {
          Logger.log('MasterHub logging warning: ' + (hubResult.error || 'Unknown error'));
        }
      } catch (hubError) {
        Logger.log('MasterHub logging error (non-critical): ' + hubError.message);
      }
      
      _supportSendConfirmationEmail_(ticketData, ticketCode, attachments);
      
      return { success: true, ticketId: ticketId, ticketCode: ticketCode };
    } else {
      throw new Error(response.error || 'Failed to send email');
    }
    
  } catch (e) {
    Logger.log('submitSupportTicket error: ' + e);
    return { success: false, error: e.message };
  }
}

/**
 * Sends email via Resend API
 */
function _supportSendEmailViaResend_(emailData) {
  try {
    var url = RESEND_CONFIG.API_BASE + '/emails';
    
    var payload = {
      from: emailData.from,
      to: [emailData.to],
      subject: emailData.subject,
      html: emailData.html
    };
    
    if (emailData.replyTo) {
      payload.reply_to = [emailData.replyTo];
    }
    
    var options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + RESEND_CONFIG.API_KEY
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    if (responseCode === 200) {
      var result = JSON.parse(responseText);
      return { success: true, id: result.id };
    } else {
      Logger.log('Resend API error: ' + responseCode + ' - ' + responseText);
      return { success: false, error: 'Email service returned error: ' + responseCode };
    }
    
  } catch (e) {
    Logger.log('_supportSendEmailViaResend_ error: ' + e);
    return { success: false, error: e.message };
  }
}

/**
 * Builds HTML email content for support ticket (sent to support team)
 * Uses system brand colors
 */
function _supportBuildTicketEmailHTML_(ticketData, ticketId, ticketCode, attachments) {
  var attachmentHtml = '';
  if (attachments && attachments.length > 0) {
    attachmentHtml = '<div style="background:#faf9f7;padding:16px;border-radius:8px;margin:20px 0;border-left:4px solid #9a8368;">';
    attachmentHtml += '<h4 style="color:#9a8368;margin:0 0 12px 0;font-family:Montserrat,sans-serif;font-weight:600;">Attached Files (' + attachments.length + '):</h4>';
    attachmentHtml += '<ul style="margin:0;padding-left:20px;">';
    for (var i = 0; i < attachments.length; i++) {
      attachmentHtml += '<li style="margin:6px 0;"><a href="' + attachments[i] + '" style="color:#456a73;word-break:break-all;">' + attachments[i] + '</a></li>';
    }
    attachmentHtml += '</ul></div>';
  }
  
  return '<!DOCTYPE html>' +
'<html>' +
'<head>' +
'  <style>' +
'    @import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap");' +
'    body { font-family: Montserrat, -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.7; color: #1a1a1a; max-width: 650px; margin: 0 auto; padding: 24px; background: #f5f3f0; }' +
'    .header { background: linear-gradient(135deg, #9a8368 0%, #456a73 100%); color: white; padding: 35px 25px; border-radius: 12px; text-align: center; margin-bottom: 30px; }' +
'    .header h1 { font-family: Playfair Display, Georgia, serif; font-size: 28px; font-weight: 600; margin: 0 0 8px 0; }' +
'    .header p { font-size: 14px; opacity: 0.95; margin: 0; }' +
'    .ticket-badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; margin-top: 12px; font-weight: 600; letter-spacing: 1px; }' +
'    .ticket-info { background: white; padding: 24px; border-radius: 12px; margin-bottom: 20px; border-left: 5px solid #456a73; }' +
'    .ticket-info p { margin: 10px 0; font-size: 14px; }' +
'    .ticket-info strong { color: #456a73; font-weight: 600; }' +
'    .message-box { background: white; padding: 24px; border: 2px solid #d4c9bb; border-radius: 12px; margin: 24px 0; }' +
'    .message-box h3 { font-family: Playfair Display, Georgia, serif; color: #456a73; margin: 0 0 16px 0; font-size: 18px; border-bottom: 2px solid #f5f3f0; padding-bottom: 10px; }' +
'    .message-box p { margin: 0; white-space: pre-wrap; font-size: 14px; line-height: 1.8; }' +
'    .footer { text-align: center; color: #666666; font-size: 12px; margin-top: 35px; padding-top: 20px; border-top: 1px solid #d4c9bb; }' +
'  </style>' +
'</head>' +
'<body>' +
'  <div class="header">' +
'    <h1>New Support Ticket</h1>' +
'    <p>Money Mastery Support System</p>' +
'    <div class="ticket-badge">' + ticketCode + '</div>' +
'  </div>' +
'  <div class="ticket-info">' +
'    <p><strong>Ticket Code:</strong> ' + ticketCode + '</p>' +
'    <p><strong>Internal ID:</strong> ' + ticketId + '</p>' +
'    <p><strong>Category:</strong> ' + ticketData.category + '</p>' +
'    <p><strong>From:</strong> ' + ticketData.name + '</p>' +
'    <p><strong>Email:</strong> <a href="mailto:' + ticketData.email + '" style="color:#456a73;">' + ticketData.email + '</a></p>' +
'    <p><strong>Subject:</strong> ' + ticketData.subject + '</p>' +
'    <p><strong>Submitted:</strong> ' + new Date().toLocaleString() + '</p>' +
'  </div>' +
'  <div class="message-box">' +
'    <h3>Customer Message</h3>' +
'    <p>' + ticketData.message.replace(/\n/g, '<br>') + '</p>' +
'  </div>' +
   attachmentHtml +
'  <div class="footer">' +
'    <p style="color:#9a8368;font-weight:600;">© 2026 Donna Roggio LLC. All Rights Reserved.</p>' +
'    <p>This is an automated message from Money Mastery Support System.</p>' +
'  </div>' +
'</body>' +
'</html>';
}

/**
 * Sends confirmation email to user
 */
function _supportSendConfirmationEmail_(ticketData, ticketCode, attachments) {
  try {
    var attachmentHtml = '';
    if (attachments && attachments.length > 0) {
      attachmentHtml = '<div style="background:#f5f3f0;padding:16px;border-radius:10px;margin:20px 0;">';
      attachmentHtml += '<h4 style="color:#456a73;margin:0 0 12px 0;font-family:Montserrat,sans-serif;font-weight:600;font-size:14px;">Your Attached Files:</h4>';
      attachmentHtml += '<ul style="margin:0;padding-left:20px;">';
      for (var i = 0; i < attachments.length; i++) {
        attachmentHtml += '<li style="margin:6px 0;"><a href="' + attachments[i] + '" style="color:#3a5a62;font-size:13px;word-break:break-all;">' + attachments[i] + '</a></li>';
      }
      attachmentHtml += '</ul></div>';
    }
    
    var confirmHtml = '<!DOCTYPE html>' +
'<html>' +
'<head>' +
'  <style>' +
'    @import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap");' +
'    body { font-family: Montserrat, -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.7; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px; background: #faf9f7; }' +
'    .header { background: linear-gradient(135deg, #456a73 0%, #3a5a62 100%); color: white; padding: 35px 25px; border-radius: 12px; text-align: center; margin-bottom: 30px; }' +
'    .header h1 { font-family: Playfair Display, Georgia, serif; font-size: 26px; font-weight: 600; margin: 0 0 8px 0; }' +
'    .header p { font-size: 14px; opacity: 0.95; margin: 0; }' +
'    .code-box { background: linear-gradient(135deg, #faf9f7 0%, #f5f3f0 100%); padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0; border: 2px solid #9a8368; }' +
'    .code-box p { margin: 0 0 12px 0; font-size: 14px; color: #666666; }' +
'    .code-box .code { font-family: Playfair Display, Georgia, serif; font-size: 32px; font-weight: 700; color: #9a8368; letter-spacing: 3px; margin: 8px 0; }' +
'    .code-box small { font-size: 12px; color: #666666; }' +
'    .content { background: white; padding: 24px; border-radius: 12px; margin-bottom: 20px; }' +
'    .content p { margin: 0 0 16px 0; font-size: 14px; }' +
'    .greeting { color: #456a73; font-weight: 600; }' +
'    .your-message { background: #f5f3f0; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #456a73; }' +
'    .your-message h4 { color: #456a73; margin: 0 0 12px 0; font-size: 14px; font-weight: 600; }' +
'    .your-message p { margin: 0; font-size: 13px; color: #333333; line-height: 1.7; white-space: pre-wrap; }' +
'    .details { font-size: 13px; color: #666666; margin: 16px 0; }' +
'    .details strong { color: #456a73; }' +
'    .warm-close { background: linear-gradient(135deg, rgba(154, 131, 104, 0.1) 0%, rgba(69, 106, 115, 0.1) 100%); padding: 20px; border-radius: 10px; text-align: center; margin-top: 24px; }' +
'    .warm-close p { margin: 0; font-size: 14px; color: #333333; }' +
'    .warm-close .signature { margin-top: 12px; font-weight: 600; color: #456a73; }' +
'    .footer { text-align: center; color: #666666; font-size: 11px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #d4c9bb; }' +
'    .gold-text { color: #9a8368; }' +
'  </style>' +
'</head>' +
'<body>' +
'  <div class="header">' +
'    <h1>We\'ve Received Your Request</h1>' +
'    <p>Thank you for reaching out to us!</p>' +
'  </div>' +
'  <div class="code-box">' +
'    <p>Your Support Ticket Code</p>' +
'    <div class="code">' + ticketCode + '</div>' +
'    <small>Please save this code for your records</small>' +
'  </div>' +
'  <div class="content">' +
'    <p class="greeting">Dear ' + ticketData.name + ',</p>' +
'    <p>Thank you so much for taking the time to contact us. We truly appreciate you reaching out, and we want you to know that your message is important to us.</p>' +
'    <p>We\'ve received your support request and our team will review it carefully. You can expect to hear back from us within <strong style="color:#9a8368;">24-48 hours</strong>.</p>' +
'    <div class="details">' +
'      <p><strong>Category:</strong> ' + ticketData.category + '</p>' +
'      <p><strong>Subject:</strong> ' + ticketData.subject + '</p>' +
'    </div>' +
'    <div class="your-message">' +
'      <h4>Your Message:</h4>' +
'      <p>' + ticketData.message.replace(/\n/g, '<br>') + '</p>' +
'    </div>' +
     attachmentHtml +
'    <p>If you need to follow up or have additional information to share, simply reply to this email and reference your ticket code: <strong class="gold-text">' + ticketCode + '</strong></p>' +
'  </div>' +
'  <div class="warm-close">' +
'    <p>We\'re honored to be part of your financial journey, and we\'re here to help every step of the way.</p>' +
'    <p class="signature">With gratitude,<br>The Money Mastery Support Team</p>' +
'  </div>' +
'  <div class="footer">' +
'    <p style="color:#9a8368;font-weight:600;">© 2026 Donna Roggio LLC. All Rights Reserved.</p>' +
'    <p>This confirmation was sent because you submitted a support request through Money Mastery.</p>' +
'  </div>' +
'</body>' +
'</html>';
    
    _supportSendEmailViaResend_({
      from: RESEND_CONFIG.FROM_NAME + ' <' + RESEND_CONFIG.FROM_EMAIL + '>',
      to: ticketData.email,
      subject: 'Your Support Request Has Been Received - ' + ticketCode,
      html: confirmHtml
    });
    
  } catch (e) {
    Logger.log('Confirmation email error: ' + e);
  }
}

// ═══════════════════════════════════════════════════════════════════
// TICKET LOGGING & HISTORY
// ═══════════════════════════════════════════════════════════════════

function _supportLogTicket_(ticket) {
  try {
    var props = _mm_safeScriptProps_();
    var historyKey = 'support_ticket_history';
    var historyJson = props.getProperty(historyKey) || '[]';
    var history = JSON.parse(historyJson);
    
    history.unshift(ticket);
    
    if (history.length > SUPPORT_CONFIG.MAX_TICKET_HISTORY) {
      history = history.slice(0, SUPPORT_CONFIG.MAX_TICKET_HISTORY);
    }
    
    props.setProperty(historyKey, JSON.stringify(history));
    
  } catch (e) {
    Logger.log('Ticket logging error: ' + e);
  }
}

function getSupportTicketHistory(limit) {
  try {
    limit = limit || 20;
    var props = _mm_safeScriptProps_();
    var historyJson = props.getProperty('support_ticket_history') || '[]';
    var history = JSON.parse(historyJson);
    return history.slice(0, limit);
  } catch (e) {
    Logger.log('getSupportTicketHistory error: ' + e);
    return [];
  }
}

function clearSupportTicketHistory() {
  try {
    var props = _mm_safeScriptProps_();
    props.deleteProperty('support_ticket_history');
    return { success: true };
  } catch (e) {
    throw new Error('Failed to clear history: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// UNAUTHORIZED ACCESS ALERT
// ═══════════════════════════════════════════════════════════════════

function sendUnauthorizedAccessAlert(userEmail) {
  try {
    // Use RESEND_CONFIG from Config.gs
    if (typeof RESEND_CONFIG === 'undefined' || !RESEND_CONFIG.API_KEY) {
      Logger.log('Cannot send alert - Resend API not configured');
      return { success: false };
    }
    
    // Get master emails from MM_CFG or fallback to support email
    var masterEmails = (typeof MM_CFG !== 'undefined' && MM_CFG.MASTER_EMAILS) 
      ? MM_CFG.MASTER_EMAILS 
      : [SUPPORT_CONFIG.SUPPORT_EMAIL];
    
    var alertHtml = '<!DOCTYPE html>' +
'<html>' +
'<head>' +
'  <style>' +
'    @import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap");' +
'    body { font-family: Montserrat, -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.7; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px; }' +
'    .header { background: linear-gradient(135deg, #9a8368 0%, #7a6858 100%); color: white; padding: 30px 20px; border-radius: 12px; text-align: center; margin-bottom: 30px; }' +
'    .header h1 { font-family: Playfair Display, Georgia, serif; font-size: 24px; margin: 0 0 8px 0; }' +
'    .alert-box { background: #faf9f7; border: 2px solid #9a8368; padding: 20px; border-radius: 10px; margin: 20px 0; }' +
'    .alert-box p { margin: 8px 0; font-size: 14px; }' +
'    .alert-box strong { color: #456a73; }' +
'    .info-note { background: #f5f3f0; padding: 16px; border-radius: 8px; font-size: 13px; color: #3a5a62; margin-top: 20px; }' +
'    .footer { text-align: center; color: #666666; font-size: 11px; margin-top: 30px; }' +
'  </style>' +
'</head>' +
'<body>' +
'  <div class="header">' +
'    <h1>Security Notice</h1>' +
'    <p>Access Attempt Logged</p>' +
'  </div>' +
'  <div class="alert-box">' +
'    <p><strong>User Email:</strong> ' + userEmail + '</p>' +
'    <p><strong>Timestamp:</strong> ' + new Date().toLocaleString() + '</p>' +
'    <p><strong>Action:</strong> Access redirected to registration</p>' +
'  </div>' +
'  <div class="info-note">' +
'    <p>A user attempted to access Money Mastery and was directed to the registration flow. This is normal behavior and indicates your security system is working correctly.</p>' +
'  </div>' +
'  <p style="font-size:14px;color:#333333;">No action is required — this notification is for your awareness only.</p>' +
'  <div class="footer">' +
'    <p style="color:#9a8368;font-weight:600;">© 2026 Donna Roggio LLC. All Rights Reserved.</p>' +
'  </div>' +
'</body>' +
'</html>';
    
    _supportSendEmailViaResend_({
      from: RESEND_CONFIG.FROM_NAME + ' <' + RESEND_CONFIG.FROM_EMAIL + '>',
      to: masterEmails[0],
      subject: 'Security Notice - Access Attempt Logged | Money Mastery',
      html: alertHtml
    });
    
    return { success: true };
    
  } catch (e) {
    Logger.log('sendUnauthorizedAccessAlert error: ' + e);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// FORGOT PASSWORD / PIN RESET EMAIL
// ═══════════════════════════════════════════════════════════════════

function sendPinResetEmail(userEmail, resetToken) {
  try {
    // Use RESEND_CONFIG from Config.gs
    if (typeof RESEND_CONFIG === 'undefined' || !RESEND_CONFIG.API_KEY) {
      throw new Error('Resend API not configured');
    }
    
    var resetHtml = '<!DOCTYPE html>' +
'<html>' +
'<head>' +
'  <style>' +
'    @import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap");' +
'    body { font-family: Montserrat, -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.7; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px; background: #faf9f7; }' +
'    .header { background: linear-gradient(135deg, #456a73 0%, #3a5a62 100%); color: white; padding: 35px 25px; border-radius: 12px; text-align: center; margin-bottom: 30px; }' +
'    .header h1 { font-family: Playfair Display, Georgia, serif; font-size: 26px; font-weight: 600; margin: 0 0 8px 0; }' +
'    .header p { font-size: 14px; opacity: 0.95; margin: 0; }' +
'    .reset-box { background: white; padding: 30px; border-radius: 12px; margin: 24px 0; text-align: center; }' +
'    .reset-box p { margin: 0 0 16px 0; font-size: 14px; color: #333333; }' +
'    .reset-code { font-family: Playfair Display, Georgia, serif; font-size: 36px; font-weight: 700; color: #9a8368; letter-spacing: 4px; margin: 20px 0; padding: 20px; background: linear-gradient(135deg, #faf9f7 0%, #f5f3f0 100%); border: 2px dashed #9a8368; border-radius: 12px; }' +
'    .warning { background: rgba(185, 28, 28, 0.1); color: #b91c1c; padding: 12px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; margin-top: 16px; }' +
'    .content { background: white; padding: 24px; border-radius: 12px; font-size: 14px; color: #333333; }' +
'    .footer { text-align: center; color: #666666; font-size: 11px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #d4c9bb; }' +
'  </style>' +
'</head>' +
'<body>' +
'  <div class="header">' +
'    <h1>PIN Reset Request</h1>' +
'    <p>Money Mastery Security</p>' +
'  </div>' +
'  <div class="reset-box">' +
'    <p>You\'ve requested to reset your PIN. Use the code below to complete the process:</p>' +
'    <div class="reset-code">' + resetToken + '</div>' +
'    <p>Enter this code in the reset dialog to create a new PIN.</p>' +
'    <div class="warning">This code expires in 15 minutes for your security.</div>' +
'  </div>' +
'  <div class="content">' +
'    <p>If you didn\'t request this reset, you can safely ignore this email. Your account remains secure, and no changes will be made.</p>' +
'    <p style="margin-top:16px;">Need help? Simply reply to this email and we\'ll be happy to assist you.</p>' +
'  </div>' +
'  <div class="footer">' +
'    <p style="color:#9a8368;font-weight:600;">© 2026 Donna Roggio LLC. All Rights Reserved.</p>' +
'    <p>This security email was sent from Money Mastery.</p>' +
'  </div>' +
'</body>' +
'</html>';
    
    var response = _supportSendEmailViaResend_({
      from: RESEND_CONFIG.FROM_NAME + ' <' + RESEND_CONFIG.FROM_EMAIL + '>',
      to: userEmail,
      subject: 'Your PIN Reset Code - Money Mastery',
      html: resetHtml
    });
    
    return response;
    
  } catch (e) {
    Logger.log('sendPinResetEmail error: ' + e);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// END OF SUPPORTTICKET.GS
// ═══════════════════════════════════════════════════════════════════
