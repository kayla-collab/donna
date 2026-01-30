/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * ADMIN_DEMO_DATA.GS - Comprehensive Demo Data Generator
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Creates realistic demo data for a PROFITABLE person showing:
 * - $10,000/month income (primary job + side income)
 * - $4,000/month expenses (responsible spending)
 * - $6,000/month surplus (60% savings/investment rate!)
 * - Personal categories implemented first
 * - Business demo can be installed later via Admin menu
 * 
 * DEMO WORKFLOW:
 * 1. Run "Generate Personal Demo (Full Year)" from Admin > Demo Data menu
 *    - This creates PERSONAL labels in INCOME LABELS and EXPENSE LABELS sheets
 *    - Populates ACCOUNT sheets with categorized transactions
 * 2. Later: Run "Initialize Business Data" to add business categories
 * 
 * COLUMN LAYOUT (BUSINESS SHEET - swapped from Personal):
 * C (3): DATE
 * D (4): DESCRIPTION
 * E (5): AMOUNT
 * F (6): BUSINESS_CATEGORIES (main categories for business transactions)
 * G (7): PERSONAL_CATEGORIES (only used when syncing FROM Personal sheet)
 * H (8): MEMO
 * I (9): DESIRE_OR_NEED
 * J (10): MAIN_CATEGORY
 * K (11): RECEIPT
 * 
 * LABEL SHEET LAYOUTS (verified from 2026_PERSONAL_MONEY_MASTERY_SYSTEM.xlsx):
 * 
 * INCOME LABELS:
 * - E10: Category count (DATA VALIDATION: 1,2,3,4,5) - DO NOT WRITE
 * - Row 10: Header row (E10=count, F10="Main Labels", H10="Main Category", J-N=Label headers)
 * - E14-E18: Main category names (user-editable)
 * - H14-H18: Formulas pulling from E column - DO NOT WRITE
 * - J14-N18: Subcategory labels (5 columns) - WRITE HERE
 * 
 * EXPENSE LABELS:
 * - I11: Category count (DATA VALIDATION: 1-40) - DO NOT WRITE
 * - F15-F34: Main category names (user-editable)
 * - Row 40: Subcategory header ("Main Category", "Sublabel 1-9")
 * - Row 44+: Subcategory data rows
 *   - Column C: Formula (pulls main category from F15+) - DO NOT WRITE
 *   - Columns E-M (5-13): Sublabels (9 columns) - WRITE HERE
 * ═══════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════
// DYNAMIC LABEL LOADING - Reads actual labels from sheets
// ═══════════════════════════════════════════════════════════════════

/**
 * Get labels DIRECTLY from data validation rules on ACCOUNT 1 sheet
 * This ensures we only use values that will actually pass validation
 */
function _getLabelsFromDataValidation(ss) {
  var result = { expense: [], income: [] };
  
  try {
    // Find ACCOUNT 1 sheet
    var accountSheet = ss.getSheetByName('ACCOUNT 1');
    if (!accountSheet) {
      Logger.log('ACCOUNT 1 not found for validation check');
      return result;
    }
    
    // Check Column F (Business Categories on Business sheet) - Row 11 is first data row
    var expenseCell = accountSheet.getRange('F11');
    var expenseValidation = expenseCell.getDataValidation();
    
    if (expenseValidation) {
      var criteria = expenseValidation.getCriteriaType();
      Logger.log('Expense validation type: ' + criteria);
      
      if (criteria === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE) {
        var args = expenseValidation.getCriteriaValues();
        if (args && args[0]) {
          var sourceRange = args[0];
          Logger.log('Expense validation source: ' + sourceRange.getA1Notation());
          var values = sourceRange.getValues();
          for (var i = 0; i < values.length; i++) {
            var val = String(values[i][0] || '').trim();
            if (val && val !== '' && val.toLowerCase().indexOf('label') === -1) {
              result.expense.push(val);
            }
          }
        }
      } else if (criteria === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
        var args = expenseValidation.getCriteriaValues();
        if (args && args[0]) {
          result.expense = args[0].filter(function(v) { 
            return v && String(v).trim() !== ''; 
          });
        }
      }
    }
    
    // Check Column E for income validation (positive amounts use income labels)
    // Or check a known income cell if different
    var incomeCell = accountSheet.getRange('F11'); // Same column, different context
    // For now, income uses same labels as expense in personal mode
    
    Logger.log('Found ' + result.expense.length + ' expense labels from validation');
    
  } catch (e) {
    Logger.log('Error reading validation: ' + e.message);
  }
  
  return result;
}

/**
 * Load actual expense labels from EXPENSE LABELS sheet
 * 
 * VERIFIED LAYOUT: Subcategories in columns E-M (5-13), rows 44-63
 * Row 40 = header, Row 44+ = data
 */
function _loadActualExpenseLabels() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('EXPENSE LABELS');
    if (!sheet) {
      Logger.log('EXPENSE LABELS sheet not found');
      return [];
    }
    
    // Read subcategories from columns E-M (5-13), rows 44-63 (max 20 categories)
    var lastRow = Math.min(sheet.getLastRow(), 63);
    if (lastRow < 44) return [];
    
    var numRows = lastRow - 44 + 1;
    var values = sheet.getRange(44, 5, numRows, 9).getValues(); // E-M = 9 columns
    var labels = [];
    
    for (var i = 0; i < values.length; i++) {
      for (var j = 0; j < values[i].length; j++) {
        var val = String(values[i][j] || '').trim();
        if (val && val !== '' && 
            val.toLowerCase().indexOf('label') === -1 && 
            val.toLowerCase().indexOf('subcat') === -1 && 
            val.toLowerCase().indexOf('sublabel') === -1) {
          labels.push(val);
        }
      }
    }
    
    Logger.log('Loaded ' + labels.length + ' expense labels from sheet');
    return labels;
  } catch (e) {
    Logger.log('Error loading expense labels: ' + e.message);
    return [];
  }
}

/**
 * Load actual income labels from INCOME LABELS sheet
 * Reads SUBCATEGORIES from columns J-N (10-14), rows 14-20
 */
function _loadActualIncomeLabels() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('INCOME LABELS');
    if (!sheet) {
      Logger.log('INCOME LABELS sheet not found');
      return [];
    }
    
    // Read subcategories from columns J-N (10-14), rows 14-20
    var lastRow = Math.min(sheet.getLastRow(), 20);
    if (lastRow < 14) return [];
    
    var numRows = lastRow - 14 + 1;
    var values = sheet.getRange(14, 10, numRows, 5).getValues(); // J-N = 5 columns
    var labels = [];
    
    for (var i = 0; i < values.length; i++) {
      for (var j = 0; j < values[i].length; j++) {
        var val = String(values[i][j] || '').trim();
        if (val && val !== '' && val.toLowerCase().indexOf('label') === -1) {
          labels.push(val);
        }
      }
    }
    
    Logger.log('Loaded ' + labels.length + ' income labels from sheet');
    return labels;
  } catch (e) {
    Logger.log('Error loading income labels: ' + e.message);
    return [];
  }
}

/**
 * Load business categories from BACKEND sheet (if business is enabled)
 */
function _loadActualBusinessLabels() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('BACKEND');
    if (!sheet) return { income: [], expense: [] };
    
    // Business categories stored in BACKEND - check if they exist
    // Column AC (29) for categories
    var lastRow = Math.min(sheet.getLastRow(), 100);
    if (lastRow < 3) return { income: [], expense: [] };
    
    var values = sheet.getRange(3, 29, lastRow - 2, 2).getValues();
    var income = [];
    var expense = [];
    
    for (var i = 0; i < values.length; i++) {
      var cat = String(values[i][0] || '').trim();
      var type = String(values[i][1] || '').trim().toLowerCase();
      if (cat && cat !== 'N/A') {
        if (type === 'income') income.push(cat);
        else expense.push(cat);
      }
    }
    
    Logger.log('Loaded business labels - Income: ' + income.length + ', Expense: ' + expense.length);
    return { income: income, expense: expense };
  } catch (e) {
    Logger.log('Error loading business labels: ' + e.message);
    return { income: [], expense: [] };
  }
}

// ═══════════════════════════════════════════════════════════════════
// PREDEFINED LABELS TO POPULATE SHEETS
// ═══════════════════════════════════════════════════════════════════

var DEMO_EXPENSE_LABELS = [
  // Housing
  'H Mortgage', 'H Homeowners Insurance', 'H HOA Fees', 'H Home Repairs', 'H Cleaning Services', 'H Cleaning Supplies',
  // Auto
  'A Auto Loan', 'A Auto Insurance', 'A EZ Pass', 'A Gas', 'A Parking', 'A Tolls', 'A Auto Repairs', 'A Auto Maintenance',
  // Utilities  
  'U Electric', 'U Gas', 'U Water', 'U Trash',
  // Bank & Fees
  'B ATM Fees', 'B Bank Fees', 'B Interest Paid', 'B Late Fees',
  // Food
  'F Groceries', 'F Dining Out', 'F Door Dash', 'F Starbucks', 'F Wawa', 'F Uber Eats', 'F Fast Food', 'F Dunkin Donuts',
  // Health / Medical
  'M Copays', 'M Health Insurance', 'M Prescriptions',
  // Fitness
  'FI Yoga', 'FI Pilates', 'FI Gym Membership',
  // Self Care
  'SC Hair', 'SC Injectables', 'SC Spa Services', 'SC Nails', 'SC Personal Trainer', 'SC MakeUp / SkinCare', 'SC Supplements', 'SC Sephora',
  // Freedom Fund / Savings
  'FF Emergency Fund Savings', 'FF Freedom Fund', 'FF Retirement Savings',
  // Travel
  'T Flights', 'T Accomodation', 'T Transportation', 'T Uber / Train / Taxi',
  // Home Office
  'HO Internet', 'HO Office Supplies', 'HO Equipment',
  // Subscriptions
  'S iTunes', 'S Netflix', 'S Spotify', 'S Apple Music',
  // Cash
  'C ATM Withdrawals',
  // Shopping
  'SH Clothing', 'SH Shoes',
  // Entertainment
  'E Movies / Shows', 'E Events / Tickets',
  // Personal Growth
  'PG Courses', 'PG Books', 'PG Seminars', 'PG Retreats', 'PG Coaching',
  // Giving
  'G Donations', 'G Gifts To Others'
];

var DEMO_INCOME_LABELS = [
  'Salary',
  'Bonus', 
  'Commission',
  'Overtime',
  'Freelance',
  'Consulting',
  'Gig Work',
  'Tips',
  'Dividends',
  'Interest',
  'Capital Gains',
  'Refunds',
  'Rebates',
  'Cash Back',
  'Gift Received',
  'Rental Income',
  'Side Hustle'
];

/**
 * Populate EXPENSE LABELS sheet with demo subcategories
 * 
 * VERIFIED SHEET LAYOUT (from 2026_PERSONAL_MONEY_MASTERY_SYSTEM.xlsx):
 * - I11 has data validation (1,2,3,4,5,6,7,8,9,10,20,30,40) - DO NOT TOUCH
 * - F15-F34 = user-editable main category names - DO NOT TOUCH (keep existing)
 * - Row 40 = Header row ("Main Category", "Sublabel 1-9")
 * - Row 44+ = Subcategory data rows:
 *   - Column C = formula (pulls from F15+, DO NOT TOUCH)
 *   - Columns E-M (5-13) = user-editable sublabels (9 columns)
 * 
 * ONLY write to the SUBCATEGORY cells (Columns E-M, rows 44+)
 * which are user-editable text fields without validation.
 */
function _populateExpenseLabels() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('EXPENSE LABELS');
    if (!sheet) {
      Logger.log('EXPENSE LABELS sheet not found - cannot populate');
      return false;
    }
    
    Logger.log('=== Populating EXPENSE LABELS subcategories ONLY ===');
    Logger.log('Writing to columns E-M (5-13), starting at row 44');
    
    // DO NOT modify I11 (category count) - it has data validation
    // DO NOT modify Column C (formulas) - they reference main categories
    // DO NOT modify F15-F34 (main category names) - keep existing
    
    // ONLY write subcategories to columns E-M (5-13), starting at row 44
    // These are the user-editable "Sublabel 1" through "Sublabel 9" columns
    // 9 columns: E=Sublabel1, F=Sublabel2, ... M=Sublabel9
    var subcategoryData = [
      // Row 44: First category (matches F15 = "Test expenses" or whatever exists)
      ['H Mortgage', 'H Homeowners Insurance', 'H HOA Fees', 'H Home Repairs', 'H Cleaning Services', 'H Cleaning Supplies', '', '', ''],
      // Row 45: Second category (matches F16)
      ['A Auto Loan', 'A Auto Insurance', 'A EZ Pass', 'A Gas', 'A Parking', 'A Tolls', 'A Auto Repairs', 'A Auto Maintenance', ''],
      // Row 46: Third category
      ['U Electric', 'U Gas', 'U Water', 'U Trash', '', '', '', '', ''],
      // Row 47: Fourth category
      ['B ATM Fees', 'B Bank Fees', 'B Interest Paid', 'B Late Fees', 'B Investment', '', '', '', ''],
      // Row 48: Fifth category
      ['S Target', 'S Amazon', 'S Art Supplies', '', '', '', '', '', ''],
      // Row 49: Sixth category
      ['F Groceries', 'F Dining Out', 'F Door Dash', 'F Starbucks', 'F Uber Eats', 'F Fast Food', 'F Dunkin', '', ''],
      // Row 50: Seventh category
      ['M Copays', 'M Health Insurance', 'M Prescriptions', '', '', '', '', '', ''],
      // Row 51: Eighth category
      ['FI Yoga', 'FI Pilates', 'FI Gym Membership', '', '', '', '', '', ''],
      // Row 52: Ninth category
      ['SC Hair', 'SC Spa Services', 'SC Nails', 'SC MakeUp', 'SC Supplements', '', '', '', ''],
      // Row 53: Tenth category
      ['FF Emergency Fund', 'FF Freedom Fund', 'FF Retirement', '', '', '', '', '', ''],
      // Row 54: Eleventh category
      ['T Flights', 'T Accommodation', 'T Transportation', 'T Uber/Taxi', '', '', '', '', ''],
      // Row 55: Twelfth category
      ['HO Internet', 'HO Office Supplies', '', '', '', '', '', '', ''],
      // Row 56: Thirteenth category
      ['SUB iTunes', 'SUB Netflix', 'SUB Spotify', 'SUB Apple Music', '', '', '', '', ''],
      // Row 57: Fourteenth category
      ['C ATM Withdrawals', '', '', '', '', '', '', '', ''],
      // Row 58: Fifteenth category
      ['SH Clothing', 'SH Shoes', 'SH Electronics', '', '', '', '', '', ''],
      // Row 59: Sixteenth category
      ['E Movies', 'E Events/Tickets', 'E Concerts', '', '', '', '', '', ''],
      // Row 60: Seventeenth category
      ['PG Courses', 'PG Books', 'PG Seminars', 'PG Coaching', '', '', '', '', ''],
      // Row 61: Eighteenth category
      ['G Donations', 'G Gifts To Others', '', '', '', '', '', '', ''],
      // Row 62: Nineteenth category
      ['', '', '', '', '', '', '', '', ''],
      // Row 63: Twentieth category
      ['', '', '', '', '', '', '', '', '']
    ];
    
    // Write subcategories to columns E-M (5-13), starting at row 44
    // 9 columns (E through M)
    sheet.getRange(44, 5, subcategoryData.length, 9).setValues(subcategoryData);
    
    var count = 0;
    subcategoryData.forEach(function(row) {
      row.forEach(function(cell) { if (cell) count++; });
    });
    
    Logger.log('Populated ' + count + ' expense subcategory labels in columns E-M (rows 44-63)');
    return true;
  } catch (e) {
    Logger.log('Error populating expense labels: ' + e.message);
    Logger.log('Stack: ' + e.stack);
    return false;
  }
}

/**
 * Populate INCOME LABELS sheet with demo subcategories
 * 
 * VERIFIED SHEET LAYOUT (from 2026_PERSONAL_MONEY_MASTERY_SYSTEM.xlsx):
 * - E10 has data validation (1,2,3,4,5) - DO NOT TOUCH (category count)
 * - Row 10 = Header row (E10=count, F10="Main Labels", H10="Main Category", J10-N10=Labels)
 * - E14-E18 = user-editable main category names (Column E, NOT Column D!)
 * - H14-H18 = formulas pulling from E14-E18 (DO NOT TOUCH)
 * - J14-N18 = user-editable subcategory labels (5 columns: J=Label1...N=Label5)
 * 
 * ONLY write to the SUBCATEGORY cells (Columns J-N, rows 14-18)
 * which are user-editable text fields without validation.
 */
function _populateIncomeLabels() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('INCOME LABELS');
    if (!sheet) {
      Logger.log('INCOME LABELS sheet not found - cannot populate');
      return false;
    }
    
    Logger.log('=== Populating INCOME LABELS subcategories ONLY ===');
    Logger.log('Writing to columns J-N (10-14), rows 14-18');
    
    // DO NOT modify E10 (category count) - it has data validation (1-5)
    // DO NOT modify E14-E18 (main category names) - keep existing ("Test income", etc.)
    // DO NOT modify Column H (formulas)
    
    // ONLY write subcategories to columns J-N (10-14), rows 14-18
    // These are "Label 1" through "Label 5" for each main category
    // Match whatever main categories already exist in the sheet
    var incomeSubcategories = [
      // Row 14: First income category (E14 = "Test income" or similar)
      ['I Salary', 'I Bonus', 'I Commission', 'I Overtime', 'I Payroll Deposit'],
      // Row 15: Second income category
      ['I Freelance', 'I Consulting', 'I Gig Work', 'I Contract Work', 'I Tips'],
      // Row 16: Third income category
      ['I Dividends', 'I Interest', 'I Capital Gains', 'I Refunds', 'I Rebates'],
      // Row 17: Fourth income category
      ['I Rental Income', 'I Royalties', 'I Cash Back', 'I Gift Received', ''],
      // Row 18: Fifth income category
      ['I Other Income', 'I Reimbursement', '', '', '']
    ];
    
    // Write subcategories to columns J-N (10-14), starting at row 14
    sheet.getRange(14, 10, incomeSubcategories.length, 5).setValues(incomeSubcategories);
    
    var count = 0;
    incomeSubcategories.forEach(function(row) {
      row.forEach(function(cell) { if (cell) count++; });
    });
    
    Logger.log('Populated ' + count + ' income subcategory labels in columns J-N (rows 14-18)');
    return true;
  } catch (e) {
    Logger.log('Error populating income labels: ' + e.message);
    Logger.log('Stack: ' + e.stack);
    return false;
  }
}

/**
 * Populate both label sheets with demo data
 */
function _populateAllLabels() {
  var expenseOK = _populateExpenseLabels();
  var incomeOK = _populateIncomeLabels();
  return expenseOK && incomeOK;
}

// ═══════════════════════════════════════════════════════════════════
// BUSINESS-SPECIFIC LABEL POPULATION
// These functions write BUSINESS labels (not Personal labels) to the
// EXPENSE LABELS and INCOME LABELS sheets on the Business sheet.
// ═══════════════════════════════════════════════════════════════════

/**
 * Populate EXPENSE LABELS sheet with BUSINESS expense subcategories
 * For use on the BUSINESS sheet only (Column F = Business Categories)
 */
function _populateBusinessExpenseLabels() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('EXPENSE LABELS');
    if (!sheet) {
      Logger.log('EXPENSE LABELS sheet not found - cannot populate business labels');
      return false;
    }
    
    Logger.log('=== Populating BUSINESS EXPENSE LABELS ===');
    Logger.log('Writing to columns E-M (5-13), starting at row 44');
    
    // BUSINESS expense subcategories - these will populate the data validation dropdown
    // Using prefixes to match sheet structure
    var businessExpenseData = [
      // Row 44: Marketing & Advertising
      ['MA Marketing & Advertising', 'MA Facebook Ads', 'MA Google Ads', 'MA Content Marketing', 'MA Email Marketing', 'MA Social Media Ads', 'MA Print Advertising', 'MA SEO Services', ''],
      // Row 45: Software & Tools
      ['ST Software & Tools', 'ST SaaS Subscriptions', 'ST AI Tools', 'ST Website & Hosting', 'ST Domain Names', 'ST Cloud Storage', 'ST Project Management', '', ''],
      // Row 46: Contractors & Freelancers
      ['CF Contractor Payments', 'CF Virtual Assistant', 'CF Graphic Design', 'CF Video Editing', 'CF Copywriting', 'CF Web Development', 'CF Bookkeeping', '', ''],
      // Row 47: Professional Services
      ['PS Professional Services', 'PS Accounting Fees', 'PS Legal Fees', 'PS Business Coaching', 'PS Consulting Fees', 'PS Tax Preparation', '', '', ''],
      // Row 48: Office & Operations
      ['OP Office Supplies', 'OP Equipment', 'OP Printing', 'OP Shipping', 'OP Postage', 'OP Storage', '', '', ''],
      // Row 49: Travel - Business
      ['TB Travel - Business', 'TB Flights', 'TB Hotels', 'TB Car Rental', 'TB Uber/Taxi', 'TB Meals - Business', 'TB Conference Travel', '', ''],
      // Row 50: Education & Training
      ['ET Education & Training', 'ET Courses', 'ET Certifications', 'ET Books', 'ET Seminars', 'ET Workshops', '', '', ''],
      // Row 51: Insurance
      ['IN Insurance - Business', 'IN Liability Insurance', 'IN E&O Insurance', 'IN Health Insurance', '', '', '', '', ''],
      // Row 52: Bank & Payment Processing
      ['BP Payment Processing Fees', 'BP Stripe Fees', 'BP PayPal Fees', 'BP Bank Fees - Business', 'BP Merchant Fees', '', '', '', ''],
      // Row 53: Utilities & Communications
      ['UC Business Phone', 'UC Internet - Business', 'UC Zoom Subscription', 'UC Communication Tools', '', '', '', '', ''],
      // Row 54: Rent & Facilities
      ['RF Office Rent', 'RF Coworking Space', 'RF Storage Unit', '', '', '', '', '', ''],
      // Row 55: Inventory & Supplies
      ['IS Inventory', 'IS Product Materials', 'IS Packaging', '', '', '', '', '', ''],
      // Row 56: Client Entertainment
      ['CE Client Entertainment', 'CE Client Gifts', 'CE Team Events', '', '', '', '', '', ''],
      // Row 57: Miscellaneous
      ['MS Miscellaneous', 'MS Returns & Refunds', 'MS Write-offs', '', '', '', '', '', ''],
      // Row 58: Transfers (Owner's Draw, etc.)
      ['TR Transfer to Personal', 'TR Owners Draw', 'TR Distribution', '', '', '', '', '', ''],
      // Row 59-63: Empty rows for user expansion
      ['', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '']
    ];
    
    // Write subcategories to columns E-M (5-13), starting at row 44
    sheet.getRange(44, 5, businessExpenseData.length, 9).setValues(businessExpenseData);
    
    var count = 0;
    businessExpenseData.forEach(function(row) {
      row.forEach(function(cell) { if (cell) count++; });
    });
    
    Logger.log('Populated ' + count + ' BUSINESS expense subcategory labels');
    return true;
  } catch (e) {
    Logger.log('Error populating business expense labels: ' + e.message);
    Logger.log('Stack: ' + e.stack);
    return false;
  }
}

/**
 * Populate INCOME LABELS sheet with BUSINESS income subcategories
 * For use on the BUSINESS sheet only
 */
function _populateBusinessIncomeLabels() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('INCOME LABELS');
    if (!sheet) {
      Logger.log('INCOME LABELS sheet not found - cannot populate business labels');
      return false;
    }
    
    Logger.log('=== Populating BUSINESS INCOME LABELS ===');
    Logger.log('Writing to columns J-N (10-14), rows 14-18');
    
    // BUSINESS income subcategories
    var businessIncomeData = [
      // Row 14: Client Services
      ['CS Client Services', 'CS Consulting Fees', 'CS Retainer Fees', 'CS Strategy Sessions', 'CS Coaching Income'],
      // Row 15: Product Sales
      ['PR Product Sales', 'PR Course Sales', 'PR Digital Products', 'PR Workshop Revenue', 'PR Membership Fees'],
      // Row 16: Passive Income
      ['PA Affiliate Income', 'PA Royalties', 'PA Sponsorships', 'PA Speaking Fees', 'PA Licensing Fees'],
      // Row 17: Other Income
      ['OT Refunds Received', 'OT Interest Income', 'OT Grants', 'OT Awards', ''],
      // Row 18: Transfers
      ['TR Transfer from Personal', 'TR Owner Investment', '', '', '']
    ];
    
    // Write subcategories to columns J-N (10-14), starting at row 14
    sheet.getRange(14, 10, businessIncomeData.length, 5).setValues(businessIncomeData);
    
    var count = 0;
    businessIncomeData.forEach(function(row) {
      row.forEach(function(cell) { if (cell) count++; });
    });
    
    Logger.log('Populated ' + count + ' BUSINESS income subcategory labels');
    return true;
  } catch (e) {
    Logger.log('Error populating business income labels: ' + e.message);
    Logger.log('Stack: ' + e.stack);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// DEMO DATA CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

var DEMO_CONFIG = {
  // Target year for demo data
  YEAR: 2026,
  
  // Transactions per day range
  MIN_TRANSACTIONS_PER_DAY: 4,
  MAX_TRANSACTIONS_PER_DAY: 10,
  
  // ═══════════════════════════════════════════════════════════════════
  // PROFITABLE PERSON PROFILE: $10k income / $4k expenses
  // This creates a 60% savings rate - very financially healthy!
  // ═══════════════════════════════════════════════════════════════════
  
  // Income breakdown (~$10,000/month total)
  MONTHLY_SALARY: 7500,           // $90k/year base salary (primary job)
  SALARY_GROWTH_RATE: 0.01,       // 1% growth per quarter
  SIDE_HUSTLE_BASE: 2500,         // Side income (freelance, consulting)
  SIDE_HUSTLE_GROWTH: 0.02,       // 2% growth per month
  
  // Monthly expense targets (~$4,000/month total)
  MONTHLY_EXPENSE_TARGET: 4000,
  
  // Expense allocation (percentages of $4,000 expense budget, NOT income)
  HOUSING_AMOUNT: 1500,           // $1,500 mortgage/rent
  FOOD_AMOUNT: 600,               // $600 food (groceries + dining)
  TRANSPORTATION_AMOUNT: 400,     // $400 auto + gas + insurance
  UTILITIES_AMOUNT: 250,          // $250 electric, water, internet
  HEALTHCARE_AMOUNT: 350,         // $350 insurance + copays
  ENTERTAINMENT_AMOUNT: 200,      // $200 entertainment + subscriptions
  PERSONAL_CARE_AMOUNT: 200,      // $200 fitness, self-care, grooming
  SHOPPING_AMOUNT: 300,           // $300 clothing, household items
  MISC_AMOUNT: 200,               // $200 miscellaneous
  
  // Need vs Desire ratio (higher needs = better financial health)
  NEED_RATIO: 0.75,               // 75% needs, 25% desires
  
  // Business income percentage (side business success) - ONLY used with Initialize Business
  BUSINESS_INCOME_RATIO: 0.30     // 30% from business (when enabled)
};

// ═══════════════════════════════════════════════════════════════════
// BUSINESS DEMO CONFIGURATION - $20k/mo revenue, ~$8k/mo expenses
// For the Business version of Money Mastery
// ═══════════════════════════════════════════════════════════════════

var BUSINESS_DEMO_CONFIG = {
  // Target year for demo data
  YEAR: 2026,
  
  // Transactions per day range (business has fewer but larger transactions)
  MIN_TRANSACTIONS_PER_DAY: 3,
  MAX_TRANSACTIONS_PER_DAY: 8,
  
  // ═══════════════════════════════════════════════════════════════════
  // PROFITABLE BUSINESS PROFILE: $20k revenue / $8k expenses
  // This creates a 60% profit margin - healthy small business!
  // ═══════════════════════════════════════════════════════════════════
  
  // Revenue breakdown (~$20,000/month total)
  MONTHLY_CLIENT_REVENUE: 12000,      // $144k/year from client services
  REVENUE_GROWTH_RATE: 0.015,         // 1.5% growth per quarter
  PRODUCT_SALES_BASE: 5000,           // Product/course sales
  PRODUCT_GROWTH: 0.02,               // 2% growth per month
  PASSIVE_INCOME_BASE: 3000,          // Affiliate, royalties, recurring
  
  // Monthly expense targets (~$8,000/month total)
  MONTHLY_EXPENSE_TARGET: 8000,
  
  // Business expense allocation
  MARKETING_AMOUNT: 1500,             // $1,500 ads, marketing, content
  SOFTWARE_AMOUNT: 800,               // $800 tools, subscriptions
  CONTRACTORS_AMOUNT: 2000,           // $2,000 contractors, freelancers
  PROFESSIONAL_SERVICES_AMOUNT: 500,  // $500 accounting, legal
  OFFICE_AMOUNT: 400,                 // $400 supplies, equipment
  TRAVEL_AMOUNT: 600,                 // $600 business travel
  EDUCATION_AMOUNT: 300,              // $300 courses, training
  INSURANCE_AMOUNT: 400,              // $400 business insurance
  MISC_AMOUNT: 500,                   // $500 miscellaneous
  
  // Owner's draw / personal transfer
  OWNERS_DRAW_AMOUNT: 6000            // $6k/month owner's draw (after profit)
};

// ═══════════════════════════════════════════════════════════════════
// RUNTIME LABEL CACHE - Loaded from actual sheets
// ═══════════════════════════════════════════════════════════════════
var ACTUAL_LABELS = {
  expenseLabels: null,
  incomeLabels: null,
  businessLabels: null,
  loaded: false
};

/**
 * Initialize labels from actual sheets - MUST be called before generating data
 */
function _initializeLabelsFromSheets() {
  if (ACTUAL_LABELS.loaded) return;
  
  ACTUAL_LABELS.expenseLabels = _loadActualExpenseLabels();
  ACTUAL_LABELS.incomeLabels = _loadActualIncomeLabels();
  ACTUAL_LABELS.businessLabels = _loadActualBusinessLabels();
  ACTUAL_LABELS.loaded = true;
  
  Logger.log('Labels initialized:');
  Logger.log('  Expense labels: ' + ACTUAL_LABELS.expenseLabels.length);
  Logger.log('  Income labels: ' + ACTUAL_LABELS.incomeLabels.length);
  Logger.log('  Business income: ' + (ACTUAL_LABELS.businessLabels.income || []).length);
  Logger.log('  Business expense: ' + (ACTUAL_LABELS.businessLabels.expense || []).length);
}

// ═══════════════════════════════════════════════════════════════════
// PERSONAL EXPENSE CATEGORIES (from EXPENSE LABELS sheet)
// ═══════════════════════════════════════════════════════════════════

/**
 * PERSONAL EXPENSE CATEGORIES - Matching $4,000/month expense profile
 * 
 * These subcategories MUST match the labels written to EXPENSE LABELS sheet
 * in _populateExpenseLabels() function (rows 44+, columns E-M).
 */
var PERSONAL_EXPENSE_CATEGORIES = {
  'Housing': {
    main: 'Housing',
    subcategories: ['H Mortgage', 'H Homeowners Insurance', 'H HOA Fees', 'H Home Repairs', 'H Cleaning Services', 'H Cleaning Supplies'],
    isNeed: true,
    monthlyRange: [1400, 1600]  // ~$1,500 target
  },
  'Auto': {
    main: 'Auto',
    subcategories: ['A Auto Loan', 'A Auto Insurance', 'A EZ Pass', 'A Gas', 'A Parking', 'A Tolls', 'A Auto Repairs', 'A Auto Maintenance'],
    isNeed: true,
    monthlyRange: [350, 450]   // ~$400 target
  },
  'Utilities': {
    main: 'Utilities',
    subcategories: ['U Electric', 'U Gas', 'U Water', 'U Trash'],
    isNeed: true,
    monthlyRange: [200, 300]   // ~$250 target
  },
  'BankFees': {
    main: 'Bank & Fees',
    subcategories: ['B ATM Fees', 'B Bank Fees', 'B Interest Paid', 'B Late Fees', 'B Investment'],
    isNeed: true,
    monthlyRange: [0, 20]      // Responsible - minimal fees
  },
  'ShoppingRetail': {
    main: 'Shopping Retail',
    subcategories: ['S Target', 'S Amazon', 'S Art Supplies'],
    isNeed: false,
    monthlyRange: [100, 200]
  },
  'Food': {
    main: 'Food',
    subcategories: ['F Groceries', 'F Dining Out', 'F Door Dash', 'F Starbucks', 'F Uber Eats', 'F Fast Food', 'F Dunkin'],
    isNeed: true,
    monthlyRange: [550, 650]   // ~$600 target
  },
  'HealthMedical': {
    main: 'Health / Medical',
    subcategories: ['M Copays', 'M Health Insurance', 'M Prescriptions'],
    isNeed: true,
    monthlyRange: [300, 400]   // ~$350 target
  },
  'Fitness': {
    main: 'Fitness',
    subcategories: ['FI Yoga', 'FI Pilates', 'FI Gym Membership'],
    isNeed: false,
    monthlyRange: [50, 100]    // Part of $200 personal care
  },
  'SelfCare': {
    main: 'Self Care',
    subcategories: ['SC Hair', 'SC Spa Services', 'SC Nails', 'SC MakeUp', 'SC Supplements'],
    isNeed: false,
    monthlyRange: [50, 100]    // Part of $200 personal care
  },
  'FreedomFund': {
    main: 'Freedom Fund',
    subcategories: ['FF Emergency Fund', 'FF Freedom Fund', 'FF Retirement'],
    isNeed: true,
    monthlyRange: [200, 400]   // Savings transfers
  },
  'Travel': {
    main: 'Travel',
    subcategories: ['T Flights', 'T Accommodation', 'T Transportation', 'T Uber/Taxi'],
    isNeed: false,
    monthlyRange: [0, 200]     // Varies - not every month
  },
  'HomeOffice': {
    main: 'Home Office',
    subcategories: ['HO Internet', 'HO Office Supplies'],
    isNeed: true,
    monthlyRange: [50, 100]
  },
  'Subscriptions': {
    main: 'Subscriptions',
    subcategories: ['SUB iTunes', 'SUB Netflix', 'SUB Spotify', 'SUB Apple Music'],
    isNeed: false,
    monthlyRange: [50, 80]     // Part of $200 entertainment
  },
  'Cash': {
    main: 'Cash',
    subcategories: ['C ATM Withdrawals'],
    isNeed: true,
    monthlyRange: [50, 150]
  },
  'Shopping': {
    main: 'Shopping',
    subcategories: ['SH Clothing', 'SH Shoes', 'SH Electronics'],
    isNeed: false,
    monthlyRange: [100, 200]   // ~$150 target
  },
  'Entertainment': {
    main: 'Entertainment',
    subcategories: ['E Movies', 'E Events/Tickets', 'E Concerts'],
    isNeed: false,
    monthlyRange: [50, 100]    // Part of $200 entertainment
  },
  'PersonalGrowth': {
    main: 'Personal Growth',
    subcategories: ['PG Courses', 'PG Books', 'PG Seminars', 'PG Coaching'],
    isNeed: false,
    monthlyRange: [50, 100]    // Part of miscellaneous
  },
  'Giving': {
    main: 'Giving',
    subcategories: ['G Donations', 'G Gifts To Others'],
    isNeed: false,
    monthlyRange: [50, 100]    // Part of miscellaneous
  }
};

// ═══════════════════════════════════════════════════════════════════
// PERSONAL INCOME CATEGORIES
// ═══════════════════════════════════════════════════════════════════

/**
 * PERSONAL INCOME CATEGORIES - Matching $10,000/month income profile
 * 
 * Income breakdown:
 * - $7,500/month from primary employment (bi-weekly paychecks)
 * - $2,500/month from side hustle (weekly deposits)
 * - Small amounts from investments, refunds, etc.
 * 
 * Using "I" prefix labels to match INCOME LABELS sheet sublabels
 */
var PERSONAL_INCOME_CATEGORIES = {
  'EmploymentIncome': {
    main: 'Income',
    subcategories: ['I Salary', 'I Bonus', 'I Commission', 'I Overtime', 'I Payroll Deposit'],
    frequency: 'biweekly',
    baseAmount: 3750  // ~$7,500/month (paid bi-weekly = $3,750 x 2)
  },
  'SideHustle': {
    main: 'Side Hustle',
    subcategories: ['I Freelance', 'I Consulting', 'I Gig Work', 'I Contract Work', 'I Tips'],
    frequency: 'weekly',
    baseAmount: 625   // ~$2,500/month (paid weekly = $625 x 4)
  },
  'Investments': {
    main: 'Investment Income',
    subcategories: ['I Dividends', 'I Interest', 'I Capital Gains'],
    frequency: 'monthly',
    baseAmount: 100   // Small passive income
  },
  'Other': {
    main: 'Other Income',
    subcategories: ['I Refunds', 'I Rebates', 'I Cash Back', 'I Gift Received', 'I Reimbursement'],
    frequency: 'random',
    baseAmount: 50    // Occasional refunds, rebates
  },
  'Passive': {
    main: 'Passive Income',
    subcategories: ['I Rental Income', 'I Royalties', 'I Other Income'],
    frequency: 'monthly',
    baseAmount: 0     // Optional - not everyone has this
  }
};

// ═══════════════════════════════════════════════════════════════════
// BUSINESS CATEGORIES
// ═══════════════════════════════════════════════════════════════════

var BUSINESS_INCOME_CATEGORIES = [
  // Client Services (~60% of revenue)
  'Client Services',
  'Consulting Fees',
  'Coaching Income',
  'Strategy Sessions',
  'Retainer Fees',
  // Product Sales (~25% of revenue)
  'Product Sales',
  'Course Sales',
  'Digital Products',
  'Workshop Revenue',
  'Membership Fees',
  // Passive/Other (~15% of revenue)
  'Affiliate Income',
  'Speaking Fees',
  'Royalties',
  'Sponsorships',
  'Refunds Received'
];

var BUSINESS_EXPENSE_CATEGORIES = [
  // Marketing & Advertising (~19% of expenses)
  'Marketing & Advertising',
  'Facebook Ads',
  'Google Ads',
  'Content Marketing',
  'Email Marketing',
  // Software & Tools (~10% of expenses)
  'Software & Tools',
  'Website & Hosting',
  'SaaS Subscriptions',
  'AI Tools',
  // Contractors (~25% of expenses)
  'Contractor Payments',
  'Virtual Assistant',
  'Graphic Design',
  'Video Editing',
  // Professional Services (~6% of expenses)
  'Professional Services',
  'Accounting Fees',
  'Legal Fees',
  'Business Coaching',
  // Operations (~20% of expenses)
  'Office Supplies',
  'Equipment',
  'Travel - Business',
  'Meals - Business',
  'Education & Training',
  'Insurance - Business',
  // Bank/Payment Processing (~5% of expenses)
  'Payment Processing Fees',
  'Bank Fees - Business',
  'Merchant Fees'
];

// ═══════════════════════════════════════════════════════════════════
// SPECIAL TRANSACTION LABELS
// ═══════════════════════════════════════════════════════════════════

var SPECIAL_LABELS = [
  'Credit Card Payment Received',
  'Debt Payment Sent to Credit Card',
  'Transfer Deposit Personal to Personal',
  'Transfer Withdrawal Personal to Personal',
  'Refund',
  'Return',
  'Reimbursement'
];

// ═══════════════════════════════════════════════════════════════════
// REALISTIC MERCHANT/DESCRIPTION TEMPLATES
// ═══════════════════════════════════════════════════════════════════

var MERCHANTS = {
  groceries: ['WHOLE FOODS MARKET', 'TRADER JOES', 'SAFEWAY', 'KROGER', 'PUBLIX', 'COSTCO WHOLESALE', 'ALDI', 'WALMART GROCERY'],
  dining: ['CHIPOTLE MEXICAN GRILL', 'PANERA BREAD', 'OLIVE GARDEN', 'APPLEBEES', 'CHILIS', 'RED LOBSTER', 'OUTBACK STEAKHOUSE'],
  fastFood: ['MCDONALDS', 'WENDYS', 'BURGER KING', 'TACO BELL', 'CHICK-FIL-A', 'SUBWAY'],
  coffee: ['STARBUCKS', 'DUNKIN DONUTS', 'PEETS COFFEE', 'LOCAL COFFEE SHOP'],
  gas: ['SHELL OIL', 'EXXON MOBIL', 'CHEVRON', 'BP', 'SPEEDWAY', 'WAWA'],
  utilities: ['ELECTRIC COMPANY', 'GAS UTILITY CO', 'WATER DEPARTMENT', 'WASTE MANAGEMENT'],
  subscriptions: ['NETFLIX.COM', 'SPOTIFY USA', 'APPLE.COM/BILL', 'AMAZON PRIME', 'HULU', 'DISNEY PLUS'],
  shopping: ['TARGET', 'AMAZON.COM', 'WALMART', 'BEST BUY', 'HOME DEPOT', 'LOWES'],
  health: ['CVS PHARMACY', 'WALGREENS', 'DOCTORS OFFICE', 'URGENT CARE', 'DENTAL OFFICE'],
  fitness: ['PLANET FITNESS', 'LA FITNESS', 'YOGA STUDIO', 'PELOTON'],
  selfCare: ['GREAT CLIPS', 'ULTA BEAUTY', 'SEPHORA', 'SPA & WELLNESS', 'NAIL SALON'],
  business: ['FIVERR', 'UPWORK', 'PAYPAL TRANSFER', 'STRIPE PAYOUT', 'SQUARE DEPOSIT', 'CLIENT PAYMENT'],
  salary: ['EMPLOYER DIRECT DEP', 'PAYROLL DIRECT DEP', 'ADP PAYROLL', 'GUSTO PAYROLL'],
  investments: ['VANGUARD', 'FIDELITY', 'CHARLES SCHWAB', 'DIVIDEND PAYMENT', 'INTEREST PAYMENT']
};

// ═══════════════════════════════════════════════════════════════════
// MAIN DEMO DATA GENERATION FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * ADMIN: Generate PERSONAL demo data only
 * 
 * Creates a PROFITABLE demo person with:
 * - $10,000/month income ($7,500 salary + $2,500 side hustle)
 * - $4,000/month expenses (responsible spending)
 * - $6,000/month surplus (60% savings rate!)
 * 
 * SIMPLE FLOW:
 * 1. ADD labels to EXPENSE LABELS and INCOME LABELS sheets
 * 2. READ those labels back
 * 3. USE them in demo transactions
 */
function ADMIN_generateDemoData() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // STEP 1: ADD OUR LABELS TO THE SHEETS
  Logger.log('=== STEP 1: Adding labels to sheets ===');
  ss.toast('Step 1: Adding labels to INCOME LABELS and EXPENSE LABELS...', '⏳ Setting Up', 10);
  
  var expenseOK = _populateExpenseLabels();
  var incomeOK = _populateIncomeLabels();
  
  if (!expenseOK || !incomeOK) {
    ui.alert('Error', 'Could not write labels to sheets. Please check EXPENSE LABELS and INCOME LABELS sheets exist.', ui.ButtonSet.OK);
    return;
  }
  
  SpreadsheetApp.flush(); // Make sure writes complete
  
  // STEP 2: READ THE LABELS BACK
  Logger.log('=== STEP 2: Reading labels back ===');
  ss.toast('Step 2: Verifying labels...', '⏳ Setting Up', 10);
  
  ACTUAL_LABELS.loaded = false;
  _initializeLabelsFromSheets();
  
  Logger.log('Expense labels (' + ACTUAL_LABELS.expenseLabels.length + '): ' + ACTUAL_LABELS.expenseLabels.slice(0, 10).join(', ') + '...');
  Logger.log('Income labels (' + ACTUAL_LABELS.incomeLabels.length + '): ' + ACTUAL_LABELS.incomeLabels.join(', '));
  
  // Confirm with admin
  var response = ui.alert(
    '🎯 Generate Personal Demo Data',
    'This will generate PERSONAL demo data showing a PROFITABLE person:\n\n' +
    '💰 INCOME: ~$10,000/month\n' +
    '   • $7,500 from primary employment (bi-weekly)\n' +
    '   • $2,500 from side hustle/freelance (weekly)\n\n' +
    '💸 EXPENSES: ~$4,000/month\n' +
    '   • $1,500 housing (mortgage)\n' +
    '   • $600 food (groceries + dining)\n' +
    '   • $400 transportation\n' +
    '   • $350 healthcare\n' +
    '   • $250 utilities\n' +
    '   • $900 other (shopping, entertainment, etc.)\n\n' +
    '📈 SURPLUS: ~$6,000/month (60% savings rate!)\n\n' +
    '✅ Labels will be added to INCOME LABELS and EXPENSE LABELS sheets\n' +
    '✅ 365 days of realistic transactions\n' +
    '✅ Need vs Desire properly categorized\n\n' +
    '⚠️ Business categories NOT included.\n' +
    '   Use Admin > Demo Data > Initialize Business Data later.\n\n' +
    '⚠️ This will CLEAR existing data in ACCOUNT sheets!\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) {
    ui.alert('Demo data generation cancelled.');
    return;
  }
  
  // Show progress
  ss.toast('Starting demo data generation...', '⏳ Please Wait', 30);
  
  try {
    var accountSheets = findAccountSheets_(ss);
    
    if (accountSheets.length === 0) {
      ui.alert('Error', 'No ACCOUNT sheets found. Please ensure sheets named ACCOUNT 1, ACCOUNT 2, etc. exist.', ui.ButtonSet.OK);
      return;
    }
    
    Logger.log('Found ' + accountSheets.length + ' account sheets');
    
    // Generate data for each account with different profiles - ALL PERSONAL
    // Primary checking gets most transactions, credit card gets purchases,
    // savings account gets transfers/interest
    var profiles = [
      { 
        name: 'Primary Checking', 
        type: 'checking', 
        incomeWeight: 1.0,   // 100% of income goes here
        expenseWeight: 0.4,  // 40% of expenses (bills, some purchases)
        includeBusiness: false 
      },
      { 
        name: 'Chase Credit Card', 
        type: 'credit', 
        incomeWeight: 0.0,   // No income on credit card
        expenseWeight: 0.55, // 55% of expenses (most purchases)
        includeBusiness: false 
      },
      { 
        name: 'High Yield Savings', 
        type: 'savings', 
        incomeWeight: 0.05,  // 5% - small interest income
        expenseWeight: 0.05, // 5% - occasional transfers out
        includeBusiness: false 
      }
    ];
    
    var totalTransactions = 0;
    var totalIncome = 0;
    var totalExpenses = 0;
    
    for (var i = 0; i < accountSheets.length && i < profiles.length; i++) {
      var sheet = accountSheets[i];
      var profile = profiles[i];
      
      ss.toast('Generating data for ' + sheet.getName() + ' (' + (i + 1) + '/' + Math.min(accountSheets.length, profiles.length) + ')...', '⏳ Processing', 120);
      
      var transactions = generateYearOfTransactions_(profile, i);
      writeTransactionsToSheet_(sheet, transactions, profile.name);
      
      // Calculate totals for summary
      for (var j = 0; j < transactions.length; j++) {
        if (transactions[j].amount > 0) {
          totalIncome += transactions[j].amount;
        } else {
          totalExpenses += Math.abs(transactions[j].amount);
        }
      }
      
      totalTransactions += transactions.length;
      Logger.log('Generated ' + transactions.length + ' transactions for ' + sheet.getName());
    }
    
    ss.toast('Demo data generation complete!', '✅ Success', 5);
    
    var avgMonthlyIncome = Math.round(totalIncome / 12);
    var avgMonthlyExpenses = Math.round(totalExpenses / 12);
    var avgMonthlySurplus = avgMonthlyIncome - avgMonthlyExpenses;
    var savingsRate = Math.round((avgMonthlySurplus / avgMonthlyIncome) * 100);
    
    ui.alert(
      '✅ Demo Data Generated!',
      'Successfully created demo data:\n\n' +
      '📊 SUMMARY:\n' +
      '• Accounts populated: ' + Math.min(accountSheets.length, profiles.length) + '\n' +
      '• Total transactions: ' + totalTransactions + '\n' +
      '• Date range: Jan 1 - Dec 31, ' + DEMO_CONFIG.YEAR + '\n\n' +
      '💰 FINANCIAL PROFILE:\n' +
      '• Avg Monthly Income: $' + avgMonthlyIncome.toLocaleString() + '\n' +
      '• Avg Monthly Expenses: $' + avgMonthlyExpenses.toLocaleString() + '\n' +
      '• Avg Monthly Surplus: $' + avgMonthlySurplus.toLocaleString() + '\n' +
      '• Savings Rate: ' + savingsRate + '%\n\n' +
      '✨ This demo shows a financially healthy, profitable person!\n\n' +
      '💼 To add BUSINESS transactions later:\n' +
      '   Admin > Demo Data > Initialize Business Data',
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('Demo data error: ' + error.message);
    Logger.log('Stack: ' + error.stack);
    ui.alert('Error', 'Failed to generate demo data: ' + error.message, ui.ButtonSet.OK);
  }
}

// ═══════════════════════════════════════════════════════════════════
// BUSINESS DEMO DATA GENERATOR
// Creates realistic demo for Business Money Mastery ($20k revenue)
// ═══════════════════════════════════════════════════════════════════

/**
 * Generate BUSINESS demo data showing a profitable business
 * Target: $20k/month revenue, $8k/month expenses, $12k profit (60% margin)
 * 
 * This is for the BUSINESS version of Money Mastery - generates business
 * transactions using the business categories in Column F.
 * Column G is reserved for Personal categories (used when syncing FROM Personal).
 */
function ADMIN_generateBusinessDemoData() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // STEP 1: ADD BUSINESS LABELS TO THE SHEETS
  // Use business-specific label functions (not personal labels!)
  Logger.log('=== STEP 1: Adding BUSINESS labels to sheets ===');
  ss.toast('Step 1: Adding BUSINESS labels to INCOME LABELS and EXPENSE LABELS...', '⏳ Setting Up', 10);
  
  var expenseOK = _populateBusinessExpenseLabels();
  var incomeOK = _populateBusinessIncomeLabels();
  
  if (!expenseOK || !incomeOK) {
    ui.alert('Error', 'Could not write BUSINESS labels to sheets. Please check EXPENSE LABELS and INCOME LABELS sheets exist.', ui.ButtonSet.OK);
    return;
  }
  
  SpreadsheetApp.flush();
  
  // STEP 2: READ THE LABELS BACK
  Logger.log('=== STEP 2: Reading labels back ===');
  ss.toast('Step 2: Verifying labels...', '⏳ Setting Up', 10);
  
  ACTUAL_LABELS.loaded = false;
  _initializeLabelsFromSheets();
  
  // Confirm with admin
  var response = ui.alert(
    '🏢 Generate Business Demo Data',
    'This will generate BUSINESS demo data showing a PROFITABLE business:\n\n' +
    '💰 REVENUE: ~$20,000/month\n' +
    '   • $12,000 from client services (retainers, consulting)\n' +
    '   • $5,000 from product/course sales\n' +
    '   • $3,000 from passive income (affiliates, royalties)\n\n' +
    '💸 EXPENSES: ~$8,000/month\n' +
    '   • $2,000 contractors & freelancers\n' +
    '   • $1,500 marketing & advertising\n' +
    '   • $800 software & tools\n' +
    '   • $600 business travel\n' +
    '   • $500 professional services\n' +
    '   • $1,600 other (office, insurance, etc.)\n\n' +
    '📈 NET PROFIT: ~$12,000/month (60% profit margin!)\n\n' +
    '💵 OWNER\'S DRAW: ~$6,000/month transferred to personal\n\n' +
    '✅ Business categories used in Column F\n' +
    '✅ Column G reserved for Personal sync categories\n' +
    '✅ Personal transfers included (syncs with Personal sheet)\n' +
    '✅ 365 days of realistic business transactions\n\n' +
    '⚠️ This will CLEAR existing data in ACCOUNT sheets!\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) {
    ui.alert('Business demo data generation cancelled.');
    return;
  }
  
  ss.toast('Starting business demo data generation...', '⏳ Please Wait', 30);
  
  try {
    var accountSheets = findAccountSheets_(ss);
    
    if (accountSheets.length === 0) {
      ui.alert('Error', 'No ACCOUNT sheets found. Please ensure sheets named ACCOUNT 1, ACCOUNT 2, etc. exist.', ui.ButtonSet.OK);
      return;
    }
    
    Logger.log('Found ' + accountSheets.length + ' account sheets');
    
    // Business account profiles
    var profiles = [
      { 
        name: 'Business Checking', 
        type: 'business_checking', 
        revenueWeight: 1.0,   // 100% of revenue goes here
        expenseWeight: 0.7,   // 70% of expenses (most business expenses)
        includeOwnersDraws: true
      },
      { 
        name: 'Business Credit Card', 
        type: 'business_credit', 
        revenueWeight: 0.0,   // No revenue on credit card
        expenseWeight: 0.25,  // 25% of expenses (software, travel, etc.)
        includeOwnersDraws: false
      },
      { 
        name: 'Business Savings', 
        type: 'business_savings', 
        revenueWeight: 0.05,  // 5% - interest income
        expenseWeight: 0.05,  // 5% - occasional transfers out
        includeOwnersDraws: false
      }
    ];
    
    var totalTransactions = 0;
    var totalRevenue = 0;
    var totalExpenses = 0;
    
    for (var i = 0; i < accountSheets.length && i < profiles.length; i++) {
      var sheet = accountSheets[i];
      var profile = profiles[i];
      
      ss.toast('Generating data for ' + sheet.getName() + ' (' + (i + 1) + '/' + Math.min(accountSheets.length, profiles.length) + ')...', '⏳ Processing', 120);
      
      var transactions = generateYearOfBusinessTransactions_(profile, i);
      writeTransactionsToSheet_(sheet, transactions, profile.name);
      
      for (var j = 0; j < transactions.length; j++) {
        if (transactions[j].amount > 0) {
          totalRevenue += transactions[j].amount;
        } else {
          totalExpenses += Math.abs(transactions[j].amount);
        }
      }
      
      totalTransactions += transactions.length;
      Logger.log('Generated ' + transactions.length + ' transactions for ' + sheet.getName());
    }
    
    ss.toast('Business demo data generation complete!', '✅ Success', 5);
    
    var avgMonthlyRevenue = Math.round(totalRevenue / 12);
    var avgMonthlyExpenses = Math.round(totalExpenses / 12);
    var avgMonthlyProfit = avgMonthlyRevenue - avgMonthlyExpenses;
    var profitMargin = Math.round((avgMonthlyProfit / avgMonthlyRevenue) * 100);
    
    ui.alert(
      '✅ Business Demo Data Generated!',
      'Successfully created business demo data:\n\n' +
      '📊 SUMMARY:\n' +
      '• Accounts populated: ' + Math.min(accountSheets.length, profiles.length) + '\n' +
      '• Total transactions: ' + totalTransactions + '\n' +
      '• Date range: Jan 1 - Dec 31, ' + BUSINESS_DEMO_CONFIG.YEAR + '\n\n' +
      '💰 BUSINESS PERFORMANCE:\n' +
      '• Avg Monthly Revenue: $' + avgMonthlyRevenue.toLocaleString() + '\n' +
      '• Avg Monthly Expenses: $' + avgMonthlyExpenses.toLocaleString() + '\n' +
      '• Avg Monthly Profit: $' + avgMonthlyProfit.toLocaleString() + '\n' +
      '• Profit Margin: ' + profitMargin + '%\n\n' +
      '✨ This demo shows a healthy, profitable business!\n\n' +
      '🔗 To sync with Personal sheet:\n' +
      '   Use Money Mastery > Sync Business Transactions',
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('Business demo data error: ' + error.message);
    Logger.log('Stack: ' + error.stack);
    ui.alert('Error', 'Failed to generate business demo data: ' + error.message, ui.ButtonSet.OK);
  }
}

/**
 * Generate a full year of BUSINESS transactions for an account profile
 * 
 * Target profile:
 * - $20,000/month revenue → $240,000/year
 * - $8,000/month expenses → $96,000/year
 * - $12,000/month profit → $144,000/year retained
 */
function generateYearOfBusinessTransactions_(profile, accountIndex) {
  var transactions = [];
  var year = BUSINESS_DEMO_CONFIG.YEAR;
  
  var monthlyClientRevenue = BUSINESS_DEMO_CONFIG.MONTHLY_CLIENT_REVENUE;
  var productSales = BUSINESS_DEMO_CONFIG.PRODUCT_SALES_BASE;
  var passiveIncome = BUSINESS_DEMO_CONFIG.PASSIVE_INCOME_BASE;
  
  // Track monthly totals
  var monthlyExpenseTracker = {};
  
  for (var month = 0; month < 12; month++) {
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    monthlyExpenseTracker[month] = 0;
    
    // Quarterly revenue growth
    if (month > 0 && month % 3 === 0) {
      monthlyClientRevenue *= (1 + BUSINESS_DEMO_CONFIG.REVENUE_GROWTH_RATE);
    }
    
    // Monthly product growth
    if (month > 0) {
      productSales *= (1 + BUSINESS_DEMO_CONFIG.PRODUCT_GROWTH);
    }
    
    for (var day = 1; day <= daysInMonth; day++) {
      var date = new Date(year, month, day);
      var dayOfWeek = date.getDay();
      var dayOfMonth = day;
      
      // Skip weekends for most business transactions
      var isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
      
      var context = {
        month: month,
        dayOfMonth: dayOfMonth,
        dayOfWeek: dayOfWeek,
        isWeekend: isWeekend,
        isFirstOfMonth: (day === 1),
        isEndOfMonth: (day >= daysInMonth - 2),
        monthlyClientRevenue: monthlyClientRevenue * profile.revenueWeight,
        productSales: productSales * profile.revenueWeight,
        passiveIncome: passiveIncome * profile.revenueWeight,
        monthlyExpenseBudget: BUSINESS_DEMO_CONFIG.MONTHLY_EXPENSE_TARGET * profile.expenseWeight,
        currentMonthExpenses: monthlyExpenseTracker[month]
      };
      
      var dailyTxs = generateDayBusinessTransactions_(date, profile, context);
      
      // Track expenses
      for (var t = 0; t < dailyTxs.length; t++) {
        if (dailyTxs[t].amount < 0) {
          monthlyExpenseTracker[month] += Math.abs(dailyTxs[t].amount);
        }
      }
      
      transactions = transactions.concat(dailyTxs);
    }
  }
  
  // Sort by date
  transactions.sort(function(a, b) {
    return new Date(a.date) - new Date(b.date);
  });
  
  return transactions;
}

/**
 * Generate daily BUSINESS transactions
 */
function generateDayBusinessTransactions_(date, profile, context) {
  var transactions = [];
  var dayOfMonth = context.dayOfMonth;
  var isWeekend = context.isWeekend;
  
  // Business Checking account
  if (profile.type === 'business_checking') {
    
    // CLIENT INVOICES - paid on specific days (1st, 15th, or end of month)
    if (dayOfMonth === 1 || dayOfMonth === 15) {
      transactions.push(generateBusinessIncomeTransaction_(date, 'client_retainer', context));
    }
    
    if (context.isEndOfMonth) {
      transactions.push(generateBusinessIncomeTransaction_(date, 'client_project', context));
    }
    
    // PRODUCT SALES - Mondays and Thursdays (launch days)
    if (context.dayOfWeek === 1 || context.dayOfWeek === 4) {
      if (Math.random() < 0.7) {
        transactions.push(generateBusinessIncomeTransaction_(date, 'product_sales', context));
      }
    }
    
    // PASSIVE INCOME - first week of month
    if (dayOfMonth <= 7 && !isWeekend) {
      if (Math.random() < 0.3) {
        transactions.push(generateBusinessIncomeTransaction_(date, 'passive', context));
      }
    }
    
    // CONTRACTOR PAYMENTS - 1st and 15th
    if (dayOfMonth === 1 || dayOfMonth === 15) {
      transactions.push(generateBusinessExpenseTransaction_(date, 'contractors', context));
    }
    
    // RECURRING EXPENSES - first week
    if (dayOfMonth <= 5 && !isWeekend) {
      if (dayOfMonth === 1) {
        transactions.push(generateBusinessExpenseTransaction_(date, 'software', context));
      }
      if (dayOfMonth === 3) {
        transactions.push(generateBusinessExpenseTransaction_(date, 'marketing', context));
      }
      if (dayOfMonth === 5) {
        transactions.push(generateBusinessExpenseTransaction_(date, 'insurance', context));
      }
    }
    
    // OWNER'S DRAW - 10th of each month
    // On Business sheet: Column F = Business category, Column G = Personal (empty for business transactions)
    if (dayOfMonth === 10 && profile.includeOwnersDraws) {
      var drawAmount = BUSINESS_DEMO_CONFIG.OWNERS_DRAW_AMOUNT;
      transactions.push({
        date: date,
        description: 'OWNER\'S DRAW - TRANSFER TO PERSONAL',
        amount: -drawAmount,
        personalCategory: '',  // Column G - empty for business transactions
        businessCategory: 'TR Owners Draw',  // Column F - use business transfer expense label
        memo: 'Monthly owner\'s draw to personal account',
        needDesire: 'Need',
        mainCategory: 'Transfers'
      });
    }
    
    // RANDOM BUSINESS EXPENSES - weekdays
    if (!isWeekend && Math.random() < 0.4) {
      var expenseTypes = ['office', 'professional', 'education', 'misc'];
      var randomType = pickRandom_(expenseTypes);
      transactions.push(generateBusinessExpenseTransaction_(date, randomType, context));
    }
    
  // Business Credit Card
  } else if (profile.type === 'business_credit') {
    
    // SOFTWARE SUBSCRIPTIONS - first week
    if (dayOfMonth <= 7) {
      if (Math.random() < 0.5) {
        transactions.push(generateBusinessExpenseTransaction_(date, 'software_sub', context));
      }
    }
    
    // MARKETING/ADS - throughout month
    if (!isWeekend && Math.random() < 0.3) {
      transactions.push(generateBusinessExpenseTransaction_(date, 'ads', context));
    }
    
    // TRAVEL - occasional
    if (Math.random() < 0.1) {
      transactions.push(generateBusinessExpenseTransaction_(date, 'travel', context));
    }
    
    // MEALS - weekdays
    if (!isWeekend && Math.random() < 0.25) {
      transactions.push(generateBusinessExpenseTransaction_(date, 'meals', context));
    }
    
  // Business Savings
  } else if (profile.type === 'business_savings') {
    
    // TRANSFER FROM CHECKING - 20th of month
    if (dayOfMonth === 20) {
      var savingsAmount = 2000 + Math.random() * 1000;
      transactions.push({
        date: date,
        description: 'TRANSFER FROM BUSINESS CHECKING',
        amount: savingsAmount,
        personalCategory: '',
        businessCategory: '',
        memo: 'Monthly business savings transfer',
        needDesire: 'Need',
        mainCategory: 'Transfers'
      });
    }
    
    // INTEREST - end of month
    if (context.isEndOfMonth) {
      var interestAmount = 15 + Math.random() * 35;
      transactions.push({
        date: date,
        description: 'INTEREST CREDIT - BUSINESS SAVINGS',
        amount: interestAmount,
        personalCategory: '',
        businessCategory: 'OT Interest Income',
        memo: 'Monthly interest on business savings',
        needDesire: 'Need',
        mainCategory: 'Interest Income'
      });
    }
  }
  
  return transactions;
}

/**
 * Generate a business INCOME transaction
 * Uses prefixed labels that match INCOME LABELS sheet (CS=Client Services, PR=Product, PA=Passive, OT=Other)
 */
function generateBusinessIncomeTransaction_(date, type, context) {
  var tx = {
    date: date,
    description: '',
    amount: 0,
    personalCategory: '',
    businessCategory: '',
    memo: '',
    needDesire: 'Need',
    mainCategory: ''
  };
  
  switch (type) {
    case 'client_retainer':
      var retainerAmount = (context.monthlyClientRevenue * 0.4) * (0.9 + Math.random() * 0.2);
      tx.description = pickRandom_(['INVOICE PAYMENT - CLIENT RETAINER', 'ACH DEPOSIT - MONTHLY RETAINER', 'WIRE TRANSFER - CLIENT SERVICES']) + ' #' + (1000 + Math.floor(Math.random() * 9000));
      tx.amount = roundToTwo_(retainerAmount);
      tx.businessCategory = pickRandom_(['CS Client Services', 'CS Retainer Fees', 'CS Consulting Fees']);
      tx.memo = 'Monthly retainer payment from client';
      tx.mainCategory = 'Client Services';
      break;
      
    case 'client_project':
      var projectAmount = (context.monthlyClientRevenue * 0.3) * (0.8 + Math.random() * 0.4);
      tx.description = pickRandom_(['PROJECT PAYMENT - COMPLETED', 'MILESTONE PAYMENT', 'FINAL INVOICE PAYMENT']) + ' #' + (1000 + Math.floor(Math.random() * 9000));
      tx.amount = roundToTwo_(projectAmount);
      tx.businessCategory = pickRandom_(['CS Client Services', 'CS Consulting Fees', 'CS Strategy Sessions']);
      tx.memo = 'Project completion payment';
      tx.mainCategory = 'Client Services';
      break;
      
    case 'product_sales':
      var salesAmount = (context.productSales / 8) * (0.5 + Math.random());
      tx.description = pickRandom_(['STRIPE PAYOUT', 'PAYPAL TRANSFER', 'THINKIFIC PAYOUT', 'TEACHABLE DEPOSIT', 'GUMROAD PAYOUT']);
      tx.amount = roundToTwo_(salesAmount);
      tx.businessCategory = pickRandom_(['PR Product Sales', 'PR Course Sales', 'PR Digital Products', 'PR Workshop Revenue']);
      tx.memo = 'Digital product/course sales payout';
      tx.mainCategory = 'Product Sales';
      break;
      
    case 'passive':
      var passiveAmount = (context.passiveIncome / 4) * (0.7 + Math.random() * 0.6);
      tx.description = pickRandom_(['AFFILIATE COMMISSION', 'ROYALTY PAYMENT', 'PARTNERSHIP REVENUE', 'RECURRING MEMBERSHIP']);
      tx.amount = roundToTwo_(passiveAmount);
      tx.businessCategory = pickRandom_(['PA Affiliate Income', 'PA Royalties', 'PR Membership Fees', 'PA Sponsorships']);
      tx.memo = 'Passive/recurring income';
      tx.mainCategory = 'Passive Income';
      break;
  }
  
  return tx;
}

/**
 * Generate a business EXPENSE transaction
 * Uses prefixed labels that match EXPENSE LABELS sheet 
 * (MA=Marketing, ST=Software, CF=Contractors, PS=Professional, OP=Office, TB=Travel, ET=Education, IN=Insurance, BP=Bank/Payment)
 */
function generateBusinessExpenseTransaction_(date, type, context) {
  var tx = {
    date: date,
    description: '',
    amount: 0,
    personalCategory: '',
    businessCategory: '',
    memo: '',
    needDesire: 'Need',
    mainCategory: ''
  };
  
  switch (type) {
    case 'contractors':
      var contractorAmount = (BUSINESS_DEMO_CONFIG.CONTRACTORS_AMOUNT / 2) * (0.9 + Math.random() * 0.2);
      tx.description = pickRandom_(['CONTRACTOR PAYMENT - ', 'FREELANCER INVOICE - ', 'VA PAYMENT - ']) + pickRandom_(['DESIGN', 'CONTENT', 'TECH', 'ADMIN', 'VIDEO']);
      tx.amount = -roundToTwo_(contractorAmount);
      tx.businessCategory = pickRandom_(['CF Contractor Payments', 'CF Virtual Assistant', 'CF Graphic Design', 'CF Video Editing']);
      tx.memo = 'Contractor/freelancer payment';
      tx.mainCategory = 'Contractors';
      break;
      
    case 'software':
      var softwareAmount = BUSINESS_DEMO_CONFIG.SOFTWARE_AMOUNT * (0.8 + Math.random() * 0.4);
      tx.description = pickRandom_(['MONTHLY SOFTWARE BUNDLE', 'SAAS SUBSCRIPTIONS', 'TECH STACK RENEWAL']);
      tx.amount = -roundToTwo_(softwareAmount);
      tx.businessCategory = pickRandom_(['ST Software & Tools', 'ST SaaS Subscriptions', 'ST AI Tools']);
      tx.memo = 'Monthly software subscriptions';
      tx.mainCategory = 'Software & Tools';
      break;
      
    case 'software_sub':
      var subAmount = 20 + Math.random() * 150;
      tx.description = pickRandom_(['ADOBE CC', 'CANVA PRO', 'ZOOM', 'SLACK', 'NOTION', 'ASANA', 'CLICKUP', 'CONVERTKIT', 'MAILCHIMP', 'ZAPIER', 'CALENDLY', 'LOOM']);
      tx.amount = -roundToTwo_(subAmount);
      tx.businessCategory = pickRandom_(['ST Software & Tools', 'ST SaaS Subscriptions']);
      tx.memo = 'Software subscription';
      tx.mainCategory = 'Software & Tools';
      break;
      
    case 'marketing':
      var marketingAmount = BUSINESS_DEMO_CONFIG.MARKETING_AMOUNT * (0.7 + Math.random() * 0.6);
      tx.description = pickRandom_(['MONTHLY MARKETING SPEND', 'CONTENT MARKETING', 'AD CAMPAIGN PAYMENT']);
      tx.amount = -roundToTwo_(marketingAmount);
      tx.businessCategory = pickRandom_(['MA Marketing & Advertising', 'MA Content Marketing', 'MA Email Marketing']);
      tx.memo = 'Monthly marketing expenses';
      tx.mainCategory = 'Marketing';
      break;
      
    case 'ads':
      var adAmount = 50 + Math.random() * 200;
      tx.description = pickRandom_(['FACEBOOK ADS', 'META ADVERTISING', 'GOOGLE ADS', 'LINKEDIN ADS', 'INSTAGRAM PROMOTION']);
      tx.amount = -roundToTwo_(adAmount);
      tx.businessCategory = pickRandom_(['MA Facebook Ads', 'MA Google Ads', 'MA Marketing & Advertising']);
      tx.memo = 'Digital advertising';
      tx.mainCategory = 'Advertising';
      break;
      
    case 'insurance':
      var insuranceAmount = BUSINESS_DEMO_CONFIG.INSURANCE_AMOUNT;
      tx.description = 'BUSINESS INSURANCE PREMIUM';
      tx.amount = -roundToTwo_(insuranceAmount);
      tx.businessCategory = 'IN Insurance - Business';
      tx.memo = 'Monthly business insurance';
      tx.mainCategory = 'Insurance';
      break;
      
    case 'travel':
      var travelAmount = 100 + Math.random() * 400;
      tx.description = pickRandom_(['HOTEL - BUSINESS TRIP', 'FLIGHT - CONFERENCE', 'UBER - CLIENT MEETING', 'AIRBNB - RETREAT', 'RENTAL CAR']);
      tx.amount = -roundToTwo_(travelAmount);
      tx.businessCategory = pickRandom_(['TB Travel - Business', 'TB Flights', 'TB Hotels', 'TB Uber/Taxi']);
      tx.memo = 'Business travel expense';
      tx.mainCategory = 'Travel';
      break;
      
    case 'meals':
      var mealAmount = 15 + Math.random() * 60;
      tx.description = pickRandom_(['CLIENT LUNCH', 'TEAM DINNER', 'BUSINESS MEETING MEAL', 'WORKING LUNCH']);
      tx.amount = -roundToTwo_(mealAmount);
      tx.businessCategory = 'TB Meals - Business';
      tx.memo = 'Business meal/entertainment';
      tx.mainCategory = 'Meals & Entertainment';
      break;
      
    case 'professional':
      var profAmount = 100 + Math.random() * 300;
      tx.description = pickRandom_(['ACCOUNTANT FEES', 'LEGAL CONSULTATION', 'BUSINESS COACHING SESSION', 'TAX PREPARATION']);
      tx.amount = -roundToTwo_(profAmount);
      tx.businessCategory = pickRandom_(['PS Professional Services', 'PS Accounting Fees', 'PS Legal Fees', 'PS Business Coaching']);
      tx.memo = 'Professional services';
      tx.mainCategory = 'Professional Services';
      break;
      
    case 'education':
      var eduAmount = 50 + Math.random() * 250;
      tx.description = pickRandom_(['ONLINE COURSE', 'CONFERENCE REGISTRATION', 'WORKSHOP FEE', 'CERTIFICATION PROGRAM', 'BOOK PURCHASE']);
      tx.amount = -roundToTwo_(eduAmount);
      tx.businessCategory = pickRandom_(['ET Education & Training', 'ET Courses', 'ET Certifications']);
      tx.memo = 'Professional development';
      tx.mainCategory = 'Education';
      break;
      
    case 'office':
      var officeAmount = 20 + Math.random() * 100;
      tx.description = pickRandom_(['OFFICE DEPOT', 'STAPLES', 'AMAZON BUSINESS', 'OFFICE SUPPLIES']);
      tx.amount = -roundToTwo_(officeAmount);
      tx.businessCategory = 'OP Office Supplies';
      tx.memo = 'Office supplies';
      tx.mainCategory = 'Office';
      break;
      
    case 'misc':
      var miscAmount = 25 + Math.random() * 150;
      tx.description = pickRandom_(['MISC BUSINESS EXPENSE', 'STRIPE FEES', 'PAYPAL FEES', 'BANK FEE', 'DOMAIN RENEWAL', 'HOSTING FEE']);
      tx.amount = -roundToTwo_(miscAmount);
      tx.businessCategory = pickRandom_(['BP Payment Processing Fees', 'BP Bank Fees - Business', 'ST Website & Hosting', 'BP Merchant Fees']);
      tx.memo = 'Miscellaneous business expense';
      tx.mainCategory = 'Other';
      break;
  }
  
  return tx;
}

/**
 * Find all ACCOUNT sheets in the spreadsheet
 */
function findAccountSheets_(ss) {
  var sheets = ss.getSheets();
  var accountSheets = [];
  
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    if (/^ACCOUNT\s*\d+$/i.test(name)) {
      accountSheets.push(sheets[i]);
    }
  }
  
  // Sort by account number
  accountSheets.sort(function(a, b) {
    var numA = parseInt(a.getName().match(/\d+/)) || 0;
    var numB = parseInt(b.getName().match(/\d+/)) || 0;
    return numA - numB;
  });
  
  return accountSheets;
}

/**
 * Generate a full year of transactions for an account profile
 * 
 * Target profile:
 * - $10,000/month income → $120,000/year
 * - $4,000/month expenses → $48,000/year
 * - $6,000/month surplus → $72,000/year savings
 * 
 * REBALANCED: Track monthly expense totals to ensure we stay at ~$4k/month
 */
function generateYearOfTransactions_(profile, accountIndex) {
  var transactions = [];
  var year = DEMO_CONFIG.YEAR;
  
  // Track running totals for realistic patterns
  var monthlyIncome = DEMO_CONFIG.MONTHLY_SALARY;        // $7,500 base
  var sideHustleIncome = DEMO_CONFIG.SIDE_HUSTLE_BASE;  // $2,500 base
  
  // MONTHLY EXPENSE CAP - This is the key to staying profitable!
  // Total $4k/month split across accounts by expenseWeight
  var monthlyExpenseBudget = DEMO_CONFIG.MONTHLY_EXPENSE_TARGET * profile.expenseWeight;
  
  // Generate transactions for each MONTH
  for (var month = 0; month < 12; month++) {
    // Apply growth rates quarterly (modest 1% growth)
    if (month > 0 && month % 3 === 0) {
      monthlyIncome *= (1 + DEMO_CONFIG.SALARY_GROWTH_RATE);
    }
    
    // Side hustle grows monthly (2% growth)
    if (month > 0) {
      sideHustleIncome *= (1 + DEMO_CONFIG.SIDE_HUSTLE_GROWTH);
    }
    
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Track monthly expense total to enforce budget
    var monthExpenseTotal = 0;
    
    for (var day = 1; day <= daysInMonth; day++) {
      var date = new Date(year, month, day);
      var dayOfWeek = date.getDay();
      var isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
      var isPayday = (day === 1 || day === 15);
      var isFirstOfMonth = (day === 1);
      var isFriday = (dayOfWeek === 5);
      
      // Calculate remaining budget for the month
      var remainingDays = daysInMonth - day + 1;
      var remainingBudget = monthlyExpenseBudget - monthExpenseTotal;
      var dailyBudget = remainingBudget / remainingDays;
      
      // Determine number of transactions (reduced from 4-10 to 2-5)
      var numTransactions = 2 + Math.floor(Math.random() * 4);
      
      // More transactions on weekends
      if (isWeekend) {
        numTransactions = Math.min(6, numTransactions + 1);
      }
      
      // Fewer transactions on savings account
      if (profile.type === 'savings') {
        numTransactions = Math.max(1, Math.floor(numTransactions * 0.2));
      }
      
      // Generate transactions for this day with budget awareness
      var dayTransactions = generateDayTransactions_(
        date, 
        numTransactions, 
        profile, 
        {
          monthlyIncome: monthlyIncome * profile.incomeWeight,
          sideHustleIncome: sideHustleIncome * profile.incomeWeight,
          expenseMultiplier: profile.expenseWeight,
          dailyBudget: dailyBudget,
          remainingBudget: remainingBudget,
          isPayday: isPayday,
          isFirstOfMonth: isFirstOfMonth,
          isWeekend: isWeekend,
          isFriday: isFriday,
          month: month,
          accountIndex: accountIndex,
          profileType: profile.type
        }
      );
      
      // Track expenses for this day
      for (var t = 0; t < dayTransactions.length; t++) {
        if (dayTransactions[t].amount < 0) {
          monthExpenseTotal += Math.abs(dayTransactions[t].amount);
        }
      }
      
      transactions = transactions.concat(dayTransactions);
    }
    
    Logger.log('Month ' + (month + 1) + ' expenses: $' + Math.round(monthExpenseTotal) + 
               ' (budget: $' + Math.round(monthlyExpenseBudget) + ')');
  }
  
  // Sort by date (chronological order)
  transactions.sort(function(a, b) {
    return a.date - b.date;
  });
  
  return transactions;
}

/**
 * Generate transactions for a single day - PERSONAL ONLY by default
 * Business transactions only generated when profile.includeBusiness is true
 * 
 * BALANCED APPROACH - Target: $10k income / $4k expenses per month
 * 
 * Key insight: We need to CONTROL AMOUNTS not just transaction counts
 * - Monthly income: $10,000 → $333/day average
 * - Monthly expenses: $4,000 → $133/day average  
 * - This is a 60% savings rate!
 * 
 * Income comes in chunks:
 * - Bi-weekly salary: $3,750 x 2 = $7,500/month
 * - Weekly side hustle: $625 x 4 = $2,500/month
 * 
 * Expenses spread throughout:
 * - Bills at start of month: ~$2,300 (mortgage, utilities, insurance)
 * - Daily spending: ~$56/day avg (~$1,700/month)
 */
function generateDayTransactions_(date, count, profile, context) {
  var transactions = [];
  var usedCategories = {};
  var dayOfMonth = date.getDate();
  var dayOfWeek = date.getDay();  // 0 = Sunday, 5 = Friday
  
  // CHECKING ACCOUNT - handles income and most bills
  if (profile.type === 'checking') {
    // === INCOME TRANSACTIONS ===
    // Paydays: 1st and 15th - salary deposit
    if (context.isPayday) {
      transactions.push(generateIncomeTransaction_(date, 'salary', context));
    }
    
    // Fridays: Weekly side hustle payment
    if (dayOfWeek === 5) {
      transactions.push(generateIncomeTransaction_(date, 'sideHustle', context));
    }
    
    // 1st of month: Investment income
    if (dayOfMonth === 1) {
      transactions.push(generateIncomeTransaction_(date, 'investment', context));
    }
    
    // Random refunds (8% chance per day - adds income variety)
    if (Math.random() < 0.08) {
      transactions.push(generateIncomeTransaction_(date, 'random', context));
    }
    
    // === EXPENSE TRANSACTIONS (BILLS) ===
    // Bills on SPECIFIC days of month - each bill only ONCE!
    // Total monthly bills: ~$2,350
    if (dayOfMonth === 1) {
      // Day 1: Mortgage ($1,500)
      transactions.push(generateBillTransaction_(date, 0, context));
    }
    if (dayOfMonth === 5) {
      // Day 5: Health insurance ($300) + Auto insurance ($150)
      transactions.push(generateBillTransaction_(date, 1, context));
      transactions.push(generateBillTransaction_(date, 2, context));
    }
    if (dayOfMonth === 10) {
      // Day 10: Electric ($120) + Gas ($80)
      transactions.push(generateBillTransaction_(date, 3, context));
      transactions.push(generateBillTransaction_(date, 4, context));
    }
    if (dayOfMonth === 15) {
      // Day 15: Internet ($70) + Phone ($80)
      transactions.push(generateBillTransaction_(date, 5, context));
      transactions.push(generateBillTransaction_(date, 6, context));
    }
    
    // === DAILY EXPENSES ===
    // Only 0-1 expense transactions per day on checking (small amount)
    // Most spending happens on credit card
    if (Math.random() < 0.5) {
      transactions.push(generateExpenseTransaction_(date, context, usedCategories));
    }
  }
  
  // CREDIT CARD - handles most daily purchases
  else if (profile.type === 'credit') {
    // === DAILY EXPENSES ONLY (no income on credit cards) ===
    // Target: ~$56/day average for ~$1,700/month discretionary spending
    // Generate 1-3 small transactions per day
    var numExpenses = Math.floor(Math.random() * 3) + 1;  // 1-3 expenses
    
    // Weekend: slightly more spending
    if (context.isWeekend) {
      numExpenses = Math.floor(Math.random() * 2) + 2;  // 2-3 expenses
    }
    
    for (var i = 0; i < numExpenses; i++) {
      var tx = generateExpenseTransaction_(date, context, usedCategories);
      // Credit card purchases scaled for ~$20-25 avg transaction
      // 1-3 txns/day × ~$22 avg = ~$55/day = ~$1,650/month
      tx.amount = tx.amount * 0.5;  // Scale down amounts further
      transactions.push(tx);
    }
  }
  
  // SAVINGS ACCOUNT - mostly deposits
  else if (profile.type === 'savings') {
    // Monthly transfer from checking (start of month)
    if (dayOfMonth === 5) {
      transactions.push(generateSavingsTransaction_(date, context));
    }
    
    // Monthly interest credit (end of month)
    if (dayOfMonth === 28 || (dayOfMonth === date.getDate() && new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate() === dayOfMonth)) {
      var interestTx = generateSavingsTransaction_(date, context);
      interestTx.description = 'INTEREST PAYMENT';
      interestTx.amount = roundToTwo_(5 + Math.random() * 25);  // $5-$30 interest
      interestTx.personalCategory = 'I Interest';
      interestTx.memo = 'Monthly interest credit';
      transactions.push(interestTx);
    }
  }
  
  // === BUSINESS TRANSACTIONS (only if enabled) ===
  if (profile.includeBusiness && Math.random() < 0.2) {
    var bizType = Math.random() < 0.6 ? 'income' : 'expense';
    transactions.push(generateBusinessTransaction_(date, bizType, context));
  }
  
  return transactions;
}

/**
 * Get a random income label from the ACTUAL labels loaded from sheet
 */
function _getRandomIncomeLabel() {
  if (!ACTUAL_LABELS.incomeLabels || ACTUAL_LABELS.incomeLabels.length === 0) {
    return 'Income'; // Fallback
  }
  return pickRandom_(ACTUAL_LABELS.incomeLabels);
}

/**
 * Get a random expense label from the ACTUAL labels loaded from sheet
 */
function _getRandomExpenseLabel() {
  if (!ACTUAL_LABELS.expenseLabels || ACTUAL_LABELS.expenseLabels.length === 0) {
    return 'Expense'; // Fallback
  }
  return pickRandom_(ACTUAL_LABELS.expenseLabels);
}

/**
 * Generate an income transaction using ACTUAL labels from INCOME LABELS sheet
 * 
 * Income profile for $10k/month person:
 * - Bi-weekly salary: ~$3,750 x 2 = $7,500
 * - Weekly side hustle: ~$625 x 4 = $2,500
 * - Monthly dividends/interest: ~$100
 * - Occasional refunds/other: ~$50-100
 */
function generateIncomeTransaction_(date, type, context) {
  var tx = {
    date: date,
    description: '',
    amount: 0,
    personalCategory: '',
    businessCategory: '',
    memo: '',
    needDesire: '',
    mainCategory: ''
  };
  
  // Get a random ACTUAL income label from the sheet
  var incomeLabel = _getRandomIncomeLabel();
  
  if (type === 'salary') {
    // Primary employment income - bi-weekly, ~$3,750 per check
    var salaryAmount = context.monthlyIncome / 2 * context.incomeWeight;
    salaryAmount *= (0.97 + Math.random() * 0.06); // Small variation ±3%
    tx.description = pickRandom_(MERCHANTS.salary) + ' DIRECT DEP #' + Math.floor(Math.random() * 9000 + 1000);
    tx.amount = roundToTwo_(salaryAmount);
    // Use employment income labels that match INCOME LABELS sheet
    tx.personalCategory = pickRandom_(['I Salary', 'I Payroll Deposit']);
    tx.mainCategory = 'Employment Income';
    tx.memo = 'Bi-weekly paycheck - direct deposit';
  } else if (type === 'sideHustle') {
    // Side hustle income - weekly, ~$625 per deposit
    var sideAmount = context.sideHustleIncome / 4 * (0.7 + Math.random() * 0.6); // More variation
    tx.description = pickRandom_(['PAYPAL TRANSFER', 'STRIPE PAYOUT', 'VENMO PAYMENT', 'ZELLE FROM CLIENT', 'ACH DEPOSIT']) + ' - FREELANCE';
    tx.amount = roundToTwo_(sideAmount);
    tx.personalCategory = pickRandom_(['I Freelance', 'I Consulting', 'I Gig Work', 'I Contract Work']);
    tx.mainCategory = 'Side Hustle Income';
    tx.memo = 'Freelance/consulting payment';
  } else if (type === 'investment') {
    // Investment income - monthly, ~$100
    var investAmount = 50 + Math.random() * 150;
    tx.description = pickRandom_(['VANGUARD DIVIDEND', 'FIDELITY INTEREST', 'SCHWAB DIVIDEND', 'ROBINHOOD DIVIDEND']);
    tx.amount = roundToTwo_(investAmount);
    tx.personalCategory = pickRandom_(['I Dividends', 'I Interest', 'I Capital Gains']);
    tx.mainCategory = 'Investment Income';
    tx.memo = 'Investment income';
  } else {
    // Random other income - refunds, rebates, etc.
    var otherAmount = 20 + Math.random() * 100;
    tx.description = pickRandom_(['REFUND', 'REBATE CHECK', 'CASH BACK REWARD', 'REIMBURSEMENT']) + ' - ' + pickRandom_(['AMAZON', 'TARGET', 'WALMART', 'INSURANCE', 'EMPLOYER']);
    tx.amount = roundToTwo_(otherAmount);
    tx.personalCategory = pickRandom_(['I Refunds', 'I Rebates', 'I Cash Back', 'I Reimbursement']);
    tx.mainCategory = 'Other Income';
    tx.memo = 'Refund/rebate';
  }
  
  return tx;
}

/**
 * Generate a bill/recurring expense transaction
 * 
 * Monthly bills for $4k expense profile:
 * - Mortgage: ~$1,500
 * - Auto insurance: ~$150
 * - Health insurance: ~$300 (employer covers part)
 * - Electric: ~$120
 * - Gas/Heating: ~$80
 * - Internet: ~$70
 * - Phone: ~$80
 * - Streaming subscriptions: ~$50 total
 */
function generateBillTransaction_(date, index, context) {
  var bills = [
    { 
      desc: 'MORTGAGE PAYMENT - ACH', 
      amount: [1450, 1550], 
      memo: 'Monthly mortgage payment',
      category: 'H Mortgage',
      mainCategory: 'Housing (H)',
      needDesire: 'Need'
    },
    { 
      desc: 'HEALTH INSURANCE PREMIUM', 
      amount: [280, 320], 
      memo: 'Monthly health insurance',
      category: 'M Health Insurance',
      mainCategory: 'Health / Medical (M)',
      needDesire: 'Need'
    },
    { 
      desc: 'AUTO INSURANCE - GEICO', 
      amount: [130, 170], 
      memo: 'Auto insurance premium',
      category: 'A Auto Insurance',
      mainCategory: 'Auto (A)',
      needDesire: 'Need'
    },
    { 
      desc: 'ELECTRIC COMPANY - AUTOPAY', 
      amount: [100, 140], 
      memo: 'Monthly electric bill',
      category: 'U Electric',
      mainCategory: 'Utilities (U)',
      needDesire: 'Need'
    },
    { 
      desc: 'GAS UTILITY - AUTOPAY', 
      amount: [60, 100], 
      memo: 'Monthly gas bill',
      category: 'U Gas',
      mainCategory: 'Utilities (U)',
      needDesire: 'Need'
    },
    { 
      desc: 'XFINITY INTERNET', 
      amount: [65, 80], 
      memo: 'Monthly internet',
      category: 'HO Internet',
      mainCategory: 'Home Office',
      needDesire: 'Need'
    },
    { 
      desc: 'VERIZON WIRELESS', 
      amount: [75, 90], 
      memo: 'Monthly phone bill',
      category: 'U Electric',
      mainCategory: 'Utilities',
      needDesire: 'Need'
    }
  ];
  
  var bill = bills[index % bills.length];
  
  return {
    date: date,
    description: bill.desc,
    amount: -roundToTwo_(bill.amount[0] + Math.random() * (bill.amount[1] - bill.amount[0])),
    personalCategory: bill.category,
    businessCategory: '',
    memo: bill.memo,
    needDesire: bill.needDesire,
    mainCategory: bill.mainCategory
  };
}

/**
 * Generate a regular expense transaction using the demo labels
 * 
 * BALANCED expense profile for $4k/month person:
 * - Bills/Fixed (at month start): ~$2,300
 *   - Mortgage: ~$1,500, Utilities: ~$250, Insurance: ~$350, Subscriptions: ~$100
 * - Daily/Variable spending: ~$1,700/month = ~$56/day
 *   - Food: ~$600, Auto (gas): ~$200, Shopping: ~$300
 *   - Entertainment: ~$200, Personal: ~$200, Misc: ~$200
 * 
 * With ~90 expense transactions/month (3/day avg):
 * - Average transaction: $18-20
 */
function generateExpenseTransaction_(date, context, usedCategories) {
  // Pick a weighted random expense category based on spending allocation
  var categoryKey = _pickWeightedExpenseCategory();
  var category = PERSONAL_EXPENSE_CATEGORIES[categoryKey];
  
  if (!category) {
    categoryKey = 'Food';
    category = PERSONAL_EXPENSE_CATEGORIES['Food'];
  }
  
  // Pick a random subcategory from this category
  var subcategory = pickRandom_(category.subcategories);
  
  // Calculate amount - TARGET $18-20 average per transaction
  // But vary by category type
  var amount;
  
  // Large categories (Housing, Auto) - handled mostly by bills, small daily amounts
  if (categoryKey === 'Housing' || categoryKey === 'Auto') {
    // Small maintenance/misc purchases
    amount = 5 + Math.random() * 40;  // $5-$45
  }
  // Food - most frequent, moderate amounts
  else if (categoryKey === 'Food') {
    if (subcategory.indexOf('Groceries') > -1) {
      amount = 30 + Math.random() * 80;  // $30-$110 grocery trips
    } else {
      amount = 5 + Math.random() * 25;  // $5-$30 dining/coffee
    }
  }
  // Subscriptions - fixed small amounts
  else if (categoryKey === 'Subscriptions') {
    amount = 8 + Math.random() * 20;  // $8-$28
  }
  // Shopping - varies widely
  else if (categoryKey === 'Shopping' || categoryKey === 'ShoppingRetail') {
    amount = 10 + Math.random() * 60;  // $10-$70
  }
  // Entertainment
  else if (categoryKey === 'Entertainment') {
    amount = 10 + Math.random() * 40;  // $10-$50
  }
  // Everything else - small to moderate
  else {
    amount = 8 + Math.random() * 35;  // $8-$43
  }
  
  // Apply expense multiplier from profile (to scale for account type)
  amount *= (context.expenseMultiplier || 1.0);
  
  // 5% chance of larger purchase (not 10%)
  if (Math.random() < 0.05) {
    amount *= 1.5;  // 50% larger, not 2-5x
  }
  
  // Weekend spending slightly higher for discretionary only
  if (context.isWeekend && !category.isNeed) {
    amount *= 1.1;  // 10% more, not 15%
  }
  
  // Get appropriate merchant based on category
  var merchant = _getMerchantForExpenseCategory(categoryKey);
  
  // Determine need vs desire
  var needDesire = category.isNeed ? 'Need' : 'Desire';
  
  // Food subcategories: groceries = need, dining/coffee = desire
  if (categoryKey === 'Food') {
    if (subcategory.indexOf('Groceries') > -1) {
      needDesire = 'Need';
    } else {
      needDesire = 'Desire';
    }
  }
  
  return {
    date: date,
    description: merchant + ' #' + Math.floor(Math.random() * 9000 + 1000),
    amount: -roundToTwo_(amount),
    personalCategory: subcategory,
    businessCategory: '',
    memo: '',
    needDesire: needDesire,
    mainCategory: category.main
  };
}

/**
 * Pick a weighted expense category based on spending allocation
 * Higher weight = more frequent transactions (not necessarily higher amounts)
 */
function _pickWeightedExpenseCategory() {
  var weights = {
    'Food': 25,           // Most frequent - daily food purchases
    'Shopping': 15,       // Frequent - various purchases
    'Auto': 12,           // Gas, parking, tolls
    'Subscriptions': 10,  // Monthly subscriptions
    'Entertainment': 10,  // Various entertainment
    'Utilities': 8,       // Monthly bills
    'HealthMedical': 6,   // Copays, prescriptions
    'Housing': 5,         // Less frequent but big amounts
    'SelfCare': 4,        // Grooming, spa
    'Fitness': 3,         // Gym, classes
    'PersonalGrowth': 2,  // Books, courses
    'Giving': 2,          // Donations
    'HomeOffice': 2,      // Office supplies
    'Travel': 1,          // Occasional
    'BankFees': 1         // Rare - responsible person
  };
  
  var totalWeight = 0;
  for (var key in weights) {
    totalWeight += weights[key];
  }
  
  var random = Math.random() * totalWeight;
  var cumulative = 0;
  
  for (var key in weights) {
    cumulative += weights[key];
    if (random <= cumulative) {
      return key;
    }
  }
  
  return 'Food';  // Default fallback
}

/**
 * Get appropriate merchant description for expense category
 */
function _getMerchantForExpenseCategory(categoryKey) {
  var merchantMap = {
    'Housing': ['MORTGAGE PAYMENT', 'RENT PAYMENT', 'HOME DEPOT', 'LOWES', 'ACE HARDWARE'],
    'Auto': ['SHELL', 'EXXON', 'CHEVRON', 'BP', 'SPEEDWAY', 'JIFFY LUBE', 'AUTOZONE'],
    'Utilities': ['ELECTRIC COMPANY', 'GAS UTILITY', 'WATER DEPT', 'XFINITY', 'VERIZON', 'AT&T'],
    'BankFees': ['BANK FEE', 'ATM FEE', 'WIRE FEE'],
    'Food': ['WHOLE FOODS', 'TRADER JOES', 'KROGER', 'SAFEWAY', 'COSTCO', 'CHIPOTLE', 'PANERA', 'STARBUCKS', 'MCDONALDS', 'DOORDASH'],
    'HealthMedical': ['CVS PHARMACY', 'WALGREENS', 'DOCTORS OFFICE', 'URGENT CARE', 'DENTAL OFFICE', 'HEALTH INSURANCE'],
    'Fitness': ['PLANET FITNESS', 'LA FITNESS', 'YOGA STUDIO', 'PELOTON', 'EQUINOX'],
    'SelfCare': ['GREAT CLIPS', 'SUPERCUTS', 'SPA & WELLNESS', 'NAIL SALON', 'ULTA BEAUTY', 'SEPHORA'],
    'Subscriptions': ['NETFLIX', 'SPOTIFY', 'APPLE.COM', 'AMAZON PRIME', 'HULU', 'DISNEY PLUS', 'ADOBE'],
    'Shopping': ['AMAZON', 'TARGET', 'WALMART', 'BEST BUY', 'NORDSTROM', 'MACYS', 'GAP'],
    'Entertainment': ['AMC THEATRES', 'TICKETMASTER', 'SPOTIFY', 'AUDIBLE', 'STEAM', 'PLAYSTATION'],
    'PersonalGrowth': ['UDEMY', 'COURSERA', 'AMAZON BOOKS', 'BARNES NOBLE', 'MASTERCLASS'],
    'Giving': ['CHARITY', 'GOFUNDME', 'VENMO GIFT', 'CHURCH DONATION'],
    'HomeOffice': ['STAPLES', 'OFFICE DEPOT', 'AMAZON OFFICE', 'IKEA'],
    'Travel': ['DELTA AIRLINES', 'UNITED', 'MARRIOTT', 'HILTON', 'UBER', 'LYFT', 'AMTRAK']
  };
  
  var merchants = merchantMap[categoryKey] || ['PURCHASE'];
  return pickRandom_(merchants);
}

/**
 * Generate a business transaction
 */
function generateBusinessTransaction_(date, type, context) {
  var tx = {
    date: date,
    description: '',
    amount: 0,
    personalCategory: '',
    businessCategory: '',
    memo: '',
    needDesire: '',
    mainCategory: ''
  };
  
  if (type === 'income') {
    var bizIncomeCat = pickRandom_(BUSINESS_INCOME_CATEGORIES);
    var amount = context.sideHustleIncome / 4 * (0.5 + Math.random());
    
    tx.description = pickRandom_(MERCHANTS.business) + ' - ' + bizIncomeCat.toUpperCase();
    tx.amount = roundToTwo_(amount);
    tx.businessCategory = bizIncomeCat;
    tx.mainCategory = 'Business Income';
    tx.memo = 'Business income - ' + bizIncomeCat;
  } else {
    var bizExpenseCat = pickRandom_(BUSINESS_EXPENSE_CATEGORIES);
    var amount = 20 + Math.random() * 200;
    
    tx.description = getBizExpenseMerchant_(bizExpenseCat);
    tx.amount = -roundToTwo_(amount);
    tx.businessCategory = bizExpenseCat;
    tx.needDesire = 'Need';
    tx.mainCategory = 'Business Expense';
    tx.memo = 'Business expense - ' + bizExpenseCat;
  }
  
  return tx;
}

/**
 * Generate a savings account transaction
 * 
 * For savings accounts:
 * - Most transactions are transfers IN from checking
 * - Occasional interest credits
 * - Rare withdrawals (emergency only)
 */
function generateSavingsTransaction_(date, context) {
  var tx = {
    date: date,
    description: '',
    amount: 0,
    personalCategory: '',
    businessCategory: '',
    memo: '',
    needDesire: '',
    mainCategory: ''
  };
  
  var random = Math.random();
  
  if (random < 0.7) {
    // 70% chance: Transfer deposit from checking (savings)
    var savingsAmount = 500 + Math.random() * 2000;  // $500-$2500 transfers
    tx.description = 'TRANSFER FROM CHECKING';
    tx.amount = roundToTwo_(savingsAmount);
    tx.memo = 'Monthly savings transfer';
  } else if (random < 0.9) {
    // 20% chance: Interest credit
    var interestAmount = 5 + Math.random() * 30;  // $5-$35 interest
    tx.description = 'INTEREST PAYMENT';
    tx.amount = roundToTwo_(interestAmount);
    tx.personalCategory = 'I Interest';
    tx.mainCategory = 'Investment Income';
    tx.memo = 'Monthly interest credit';
  } else {
    // 10% chance: Withdrawal (rare)
    var withdrawAmount = 200 + Math.random() * 500;
    tx.description = 'TRANSFER TO CHECKING';
    tx.amount = -roundToTwo_(withdrawAmount);
    tx.memo = 'Transfer to checking';
  }
  
  return tx;
}

/**
 * Add a special label to a transaction
 */
function addSpecialLabel_(tx) {
  var label = pickRandom_(SPECIAL_LABELS);
  
  // Adjust transaction based on label
  if (label.indexOf('Credit Card') !== -1 || label.indexOf('Transfer') !== -1) {
    tx.businessCategory = label;
    tx.personalCategory = '';
  } else if (label === 'Refund' || label === 'Return') {
    tx.amount = Math.abs(tx.amount);
    tx.businessCategory = label;
    tx.description = 'REFUND - ' + tx.description;
  }
  
  return tx;
}

/**
 * Get appropriate merchant for expense category
 */
function getMerchantForCategory_(categoryKey) {
  var merchantMap = {
    'Food': function() { return Math.random() < 0.5 ? pickRandom_(MERCHANTS.groceries) : pickRandom_(MERCHANTS.dining); },
    'Auto': function() { return pickRandom_(MERCHANTS.gas); },
    'Utilities': function() { return pickRandom_(MERCHANTS.utilities); },
    'Subscriptions': function() { return pickRandom_(MERCHANTS.subscriptions); },
    'ShoppingRetail': function() { return pickRandom_(MERCHANTS.shopping); },
    'Shopping': function() { return pickRandom_(MERCHANTS.shopping); },
    'HealthMedical': function() { return pickRandom_(MERCHANTS.health); },
    'Fitness': function() { return pickRandom_(MERCHANTS.fitness); },
    'SelfCare': function() { return pickRandom_(MERCHANTS.selfCare); }
  };
  
  var getter = merchantMap[categoryKey];
  if (getter) {
    return getter();
  }
  
  return pickRandom_(MERCHANTS.shopping);
}

/**
 * Get merchant for business expense
 */
function getBizExpenseMerchant_(category) {
  var merchants = {
    'Marketing & Advertising': ['FACEBOOK ADS', 'GOOGLE ADS', 'MAILCHIMP', 'CANVA PRO'],
    'Software & Tools': ['ADOBE CREATIVE', 'MICROSOFT 365', 'ZOOM.US', 'SLACK TECHNOLOGIES'],
    'Professional Services': ['LEGAL ZOOM', 'QUICKBOOKS', 'ACCOUNTANT FEE'],
    'Office Supplies': ['STAPLES', 'OFFICE DEPOT', 'AMAZON BUSINESS'],
    'Travel - Business': ['DELTA AIRLINES', 'MARRIOTT HOTELS', 'ENTERPRISE RENT'],
    'Education & Training': ['UDEMY', 'COURSERA', 'MASTERCLASS', 'CONFERENCE FEE'],
    'Website & Hosting': ['SQUARESPACE', 'GODADDY', 'BLUEHOST', 'SHOPIFY'],
    'Equipment': ['BEST BUY BUSINESS', 'APPLE STORE', 'DELL TECHNOLOGIES']
  };
  
  var options = merchants[category] || ['BUSINESS EXPENSE'];
  return pickRandom_(options);
}

/**
 * Write transactions to a sheet
 */
function writeTransactionsToSheet_(sheet, transactions, accountName) {
  // Clear existing data (keep header row 10)
  var lastRow = sheet.getLastRow();
  if (lastRow > 10) {
    sheet.getRange(11, 3, lastRow - 10, 10).clearContent();
  }
  
  // Set account name in C7
  sheet.getRange('C7').setValue(accountName);
  
  // Prepare data array
  // BUSINESS SHEET COLUMN LAYOUT (swapped from Personal):
  // Column F = Business Categories (main categories for business)
  // Column G = Personal Categories (only used when syncing FROM Personal)
  var data = [];
  for (var i = 0; i < transactions.length; i++) {
    var tx = transactions[i];
    data.push([
      tx.date,                    // C - Date
      tx.description,             // D - Description
      tx.amount,                  // E - Amount
      tx.businessCategory,        // F - Business Categories (SWAPPED)
      tx.personalCategory,        // G - Personal Categories (SWAPPED - usually empty)
      tx.memo,                    // H - Memo
      tx.needDesire,              // I - Desire or Need?
      tx.mainCategory,            // J - Main Category
      '',                         // K - Receipt (empty)
      ''                          // L - Needs Correction (empty)
    ]);
  }
  
  // Write in batches to avoid timeout
  var batchSize = 500;
  for (var i = 0; i < data.length; i += batchSize) {
    var batch = data.slice(i, Math.min(i + batchSize, data.length));
    var startRow = 11 + i;
    sheet.getRange(startRow, 3, batch.length, 10).setValues(batch);
    
    // Flush to avoid timeout
    SpreadsheetApp.flush();
  }
  
  Logger.log('Wrote ' + transactions.length + ' transactions to ' + sheet.getName());
}

// ═══════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function pickRandom_(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function roundToTwo_(num) {
  return Math.round(num * 100) / 100;
}

function shuffleArray_(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

// ═══════════════════════════════════════════════════════════════════
// INITIALIZE BUSINESS - Add business data AFTER personal is set up
// ═══════════════════════════════════════════════════════════════════

/**
 * ADMIN: Initialize Business demo data
 * Adds business transactions to existing personal demo data
 * Run this AFTER ADMIN_generateDemoData to add business categories
 * 
 * This function:
 * 1. Creates business income/expense categories in BACKEND sheet
 * 2. Adds business transactions to ACCOUNT sheets
 */
function ADMIN_initializeBusiness() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // First, create demo business labels in BACKEND sheet
  var bizLabelsCreated = _populateBusinessLabels();
  
  // Re-initialize labels
  ACTUAL_LABELS.loaded = false;
  _initializeLabelsFromSheets();
  
  var bizLabels = ACTUAL_LABELS.businessLabels;
  
  // If still no labels after attempting to create them, use hardcoded ones
  if (!bizLabels || (bizLabels.income.length === 0 && bizLabels.expense.length === 0)) {
    bizLabels = {
      income: BUSINESS_INCOME_CATEGORIES,
      expense: BUSINESS_EXPENSE_CATEGORIES
    };
    Logger.log('Using hardcoded business categories');
  }
  
  var response = ui.alert(
    '💼 Initialize Business Demo Data',
    'This will ADD business transactions to your existing personal data:\n\n' +
    '📊 BUSINESS PROFILE:\n' +
    '• Side business / freelance work\n' +
    '• ~$3,000/month business income\n' +
    '• ~$500/month business expenses\n' +
    '• Net: ~$2,500/month additional profit\n\n' +
    '📝 CATEGORIES:\n' +
    '• ' + bizLabels.income.length + ' business income categories\n' +
    '• ' + bizLabels.expense.length + ' business expense categories\n\n' +
    '⚙️ WHAT THIS DOES:\n' +
    '• Adds business labels to BACKEND sheet (Column AC/AD)\n' +
    '• Adds ~60 business transactions per account\n' +
    '• Existing personal data will NOT be affected\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  try {
    ss.toast('Adding business transactions...', '⏳ Please Wait', 30);
    
    var accountSheets = findAccountSheets_(ss);
    
    if (accountSheets.length === 0) {
      ui.alert('No ACCOUNT sheets found.');
      return;
    }
    
    var totalBizTx = 0;
    var totalBizIncome = 0;
    var totalBizExpense = 0;
    
    // Only add business transactions to checking account (first account)
    var sheet = accountSheets[0];
    var lastRow = sheet.getLastRow();
    
    // Generate business transactions
    var bizTransactions = [];
    var year = DEMO_CONFIG.YEAR;
    
    // Add ~60 business transactions spread through the year (5 per month)
    for (var month = 0; month < 12; month++) {
      var numBizTx = 4 + Math.floor(Math.random() * 3); // 4-6 per month
      
      for (var j = 0; j < numBizTx; j++) {
        var day = 1 + Math.floor(Math.random() * 28);
        var date = new Date(year, month, day);
        
        // 70% income, 30% expense (profitable business)
        var isIncome = Math.random() < 0.7;
        
        var tx;
        if (isIncome) {
          var bizCat = pickRandom_(bizLabels.income);
          var incomeAmount = 400 + Math.random() * 800;  // $400-$1200 per transaction
          tx = {
            date: date,
            description: pickRandom_(['CLIENT PAYMENT', 'STRIPE PAYOUT', 'PAYPAL TRANSFER', 'INVOICE PAYMENT', 'PROJECT FEE']) + ' - ' + bizCat.toUpperCase().substring(0, 15),
            amount: roundToTwo_(incomeAmount),
            personalCategory: '',
            businessCategory: bizCat,
            memo: 'Business income - ' + bizCat,
            needDesire: '',
            mainCategory: 'Business Income'
          };
          totalBizIncome += incomeAmount;
        } else {
          var bizCat = pickRandom_(bizLabels.expense);
          var expenseAmount = 30 + Math.random() * 150;  // $30-$180 per transaction
          tx = {
            date: date,
            description: getBizExpenseMerchant_(bizCat) + ' - BIZ',
            amount: -roundToTwo_(expenseAmount),
            personalCategory: '',
            businessCategory: bizCat,
            memo: 'Business expense - ' + bizCat,
            needDesire: 'Need',
            mainCategory: 'Business Expense'
          };
          totalBizExpense += expenseAmount;
        }
        
        if (tx) bizTransactions.push(tx);
      }
    }
    
    // Sort by date
    bizTransactions.sort(function(a, b) { return a.date - b.date; });
    
    // Append business transactions to sheet
    if (bizTransactions.length > 0) {
      var startRow = lastRow + 1;
      var data = bizTransactions.map(function(tx) {
        return [
          tx.date, tx.description, tx.amount,
          tx.personalCategory, tx.businessCategory,
          tx.memo, tx.needDesire, tx.mainCategory, '', ''
        ];
      });
      
      sheet.getRange(startRow, 3, data.length, 10).setValues(data);
      totalBizTx += data.length;
      Logger.log('Added ' + data.length + ' business transactions to ' + sheet.getName());
    }
    
    var avgMonthlyBizIncome = Math.round(totalBizIncome / 12);
    var avgMonthlyBizExpense = Math.round(totalBizExpense / 12);
    var avgMonthlyBizProfit = avgMonthlyBizIncome - avgMonthlyBizExpense;
    
    ss.toast('Business data added!', '✅ Success', 5);
    
    ui.alert(
      '✅ Business Demo Data Added!',
      'Successfully added business transactions:\n\n' +
      '📊 BUSINESS SUMMARY:\n' +
      '• Transactions added: ' + totalBizTx + '\n' +
      '• Avg Monthly Business Income: $' + avgMonthlyBizIncome.toLocaleString() + '\n' +
      '• Avg Monthly Business Expense: $' + avgMonthlyBizExpense.toLocaleString() + '\n' +
      '• Avg Monthly Business Profit: $' + avgMonthlyBizProfit.toLocaleString() + '\n\n' +
      '💰 COMBINED PROFILE (Personal + Business):\n' +
      '• Total Monthly Income: ~$13,000\n' +
      '• Total Monthly Expenses: ~$4,500\n' +
      '• Total Monthly Surplus: ~$8,500\n\n' +
      'The business data is now mixed with personal transactions.\n' +
      'Use the categorization modal to review.',
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('Business init error: ' + error.message);
    Logger.log('Stack: ' + error.stack);
    ui.alert('Error', 'Failed to add business data: ' + error.message, ui.ButtonSet.OK);
  }
}

/**
 * Populate BACKEND sheet with business categories
 * Column AC (29) = Business Income categories
 * Column AD (30) = Business Expense categories
 */
function _populateBusinessLabels() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('BACKEND');
    if (!sheet) {
      Logger.log('BACKEND sheet not found - cannot populate business labels');
      return false;
    }
    
    Logger.log('=== Populating BACKEND sheet with business labels ===');
    
    // Write business income categories to Column AC (29), starting row 3
    var incomeData = BUSINESS_INCOME_CATEGORIES.map(function(cat) { return [cat]; });
    if (incomeData.length > 0) {
      sheet.getRange(3, 29, incomeData.length, 1).setValues(incomeData);
      Logger.log('Wrote ' + incomeData.length + ' business income categories to Column AC');
    }
    
    // Write business expense categories to Column AD (30), starting row 3
    var expenseData = BUSINESS_EXPENSE_CATEGORIES.map(function(cat) { return [cat]; });
    if (expenseData.length > 0) {
      sheet.getRange(3, 30, expenseData.length, 1).setValues(expenseData);
      Logger.log('Wrote ' + expenseData.length + ' business expense categories to Column AD');
    }
    
    return true;
  } catch (e) {
    Logger.log('Error populating business labels: ' + e.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// QUICK DEMO (Smaller dataset for testing)
// ═══════════════════════════════════════════════════════════════════

/**
 * Generate a smaller demo dataset (1 month) for quick testing
 * Uses the same $10k income / $4k expense profile but only for current month
 */
function ADMIN_generateQuickDemo() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // STEP 1: ADD labels
  ss.toast('Adding labels...', '⏳ Setting Up', 10);
  _populateExpenseLabels();
  _populateIncomeLabels();
  SpreadsheetApp.flush();
  
  // STEP 2: READ labels back
  ACTUAL_LABELS.loaded = false;
  _initializeLabelsFromSheets();
  
  if (ACTUAL_LABELS.expenseLabels.length === 0) {
    ui.alert('Error', 'Could not load labels. Please check label sheets.', ui.ButtonSet.OK);
    return;
  }
  
  var response = ui.alert(
    '🚀 Quick Demo (1 Month)',
    'Generate 1 month of demo data for testing?\n\n' +
    '💰 Same profile: $10k income / $4k expenses\n' +
    '✅ Labels ready: ' + ACTUAL_LABELS.expenseLabels.length + ' expense, ' + ACTUAL_LABELS.incomeLabels.length + ' income\n\n' +
    'This is faster than the full year demo.',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  try {
    var accountSheets = findAccountSheets_(ss);
    
    if (accountSheets.length === 0) {
      ui.alert('No ACCOUNT sheets found.');
      return;
    }
    
    ss.toast('Generating 1 month of demo data...', '⏳ Please Wait', 30);
    
    // Only do first account, current month
    var sheet = accountSheets[0];
    var now = new Date();
    var profile = { 
      name: 'Primary Checking', 
      type: 'checking', 
      incomeWeight: 1.0, 
      expenseWeight: 0.6,
      includeBusiness: false
    };
    
    var transactions = [];
    var daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    for (var day = 1; day <= daysInMonth; day++) {
      var date = new Date(now.getFullYear(), now.getMonth(), day);
      var numTx = 4 + Math.floor(Math.random() * 7);
      var dayOfWeek = date.getDay();
      
      var dayTx = generateDayTransactions_(date, numTx, profile, {
        monthlyIncome: DEMO_CONFIG.MONTHLY_SALARY,      // $7,500
        sideHustleIncome: DEMO_CONFIG.SIDE_HUSTLE_BASE, // $2,500
        expenseMultiplier: profile.expenseWeight,
        isPayday: (day === 1 || day === 15),
        isFirstOfMonth: (day === 1),
        isWeekend: (dayOfWeek === 0 || dayOfWeek === 6),
        month: now.getMonth(),
        accountIndex: 0,
        profileType: 'checking'
      });
      
      transactions = transactions.concat(dayTx);
    }
    
    transactions.sort(function(a, b) { return a.date - b.date; });
    writeTransactionsToSheet_(sheet, transactions, 'Primary Checking');
    
    // Calculate totals
    var totalIncome = 0;
    var totalExpenses = 0;
    for (var j = 0; j < transactions.length; j++) {
      if (transactions[j].amount > 0) {
        totalIncome += transactions[j].amount;
      } else {
        totalExpenses += Math.abs(transactions[j].amount);
      }
    }
    
    ss.toast('Quick demo complete!', '✅ Success', 5);
    
    ui.alert('✅ Quick Demo Complete', 
      'Generated ' + transactions.length + ' transactions for ' + sheet.getName() + '\n\n' +
      '💰 This Month Summary:\n' +
      '• Total Income: $' + Math.round(totalIncome).toLocaleString() + '\n' +
      '• Total Expenses: $' + Math.round(totalExpenses).toLocaleString() + '\n' +
      '• Net: $' + Math.round(totalIncome - totalExpenses).toLocaleString(),
      ui.ButtonSet.OK);
    
  } catch (error) {
    Logger.log('Quick demo error: ' + error.message);
    ui.alert('Error: ' + error.message);
  }
}

/**
 * Clear all demo data from ACCOUNT sheets
 */
function ADMIN_clearDemoData() {
  var ui = SpreadsheetApp.getUi();
  
  var response = ui.alert(
    '⚠️ Clear All Demo Data',
    'This will remove ALL transaction data from ACCOUNT sheets.\n\n' +
    'Are you sure?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var accountSheets = findAccountSheets_(ss);
  
  for (var i = 0; i < accountSheets.length; i++) {
    var sheet = accountSheets[i];
    var lastRow = sheet.getLastRow();
    if (lastRow > 10) {
      sheet.getRange(11, 3, lastRow - 10, 10).clearContent();
    }
  }
  
  ui.alert('✅ Demo data cleared from ' + accountSheets.length + ' sheets.');
}

// ═══════════════════════════════════════════════════════════════════
// DEMO RECEIPTS - Add sample receipt images to transactions
// ═══════════════════════════════════════════════════════════════════

/**
 * Demo receipt image URLs
 * These are pre-generated fake receipt images for demo purposes
 */
var DEMO_RECEIPT_URLS = [
  {
    url: 'https://www.genspark.ai/api/files/s/esEjM66R',
    merchant: 'TARGET',
    amount: -51.66,
    category: 'SH Target',
    description: 'Target household supplies and snacks',
    mainCategory: 'Shopping (SH)'
  },
  {
    url: 'https://www.genspark.ai/api/files/s/rx21Bmlv',
    merchant: 'STARBUCKS',
    amount: -10.15,
    category: 'F Coffee Shops',
    description: 'Starbucks coffee and muffin',
    mainCategory: 'Food (F)'
  },
  {
    url: 'https://www.genspark.ai/api/files/s/Mi1RnTrt',
    merchant: 'SHELL',
    amount: -43.09,
    category: 'A Gas',
    description: 'Shell gas station fuel purchase',
    mainCategory: 'Auto (A)'
  }
];

/**
 * ADMIN: Add demo receipts to ACCOUNT 1
 * Creates transactions with receipt image URLs attached
 * 
 * Column layout (BUSINESS SHEET - swapped from Personal):
 * C (3): DATE
 * D (4): DESCRIPTION
 * E (5): AMOUNT
 * F (6): BUSINESS_CATEGORIES (main categories)
 * G (7): PERSONAL_CATEGORIES (for sync from Personal)
 * H (8): MEMO
 * I (9): DESIRE_OR_NEED
 * J (10): MAIN_CATEGORY
 * K (11): RECEIPT
 */
function ADMIN_addDemoReceipts() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var response = ui.alert(
    '🧾 Add Demo Receipts',
    'This will add 3 demo transactions with receipt images to ACCOUNT 1:\n\n' +
    '1. Target - $51.66 (household supplies)\n' +
    '2. Starbucks - $10.15 (coffee & muffin)\n' +
    '3. Shell - $43.09 (gas)\n\n' +
    'Each transaction will have a receipt image URL in Column K.\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  try {
    var sheet = ss.getSheetByName('ACCOUNT 1');
    if (!sheet) {
      ui.alert('Error', 'ACCOUNT 1 sheet not found.', ui.ButtonSet.OK);
      return;
    }
    
    // Find the last row with data
    var lastRow = sheet.getLastRow();
    var startRow = Math.max(11, lastRow + 1);  // Start at row 11 or after last data
    
    // Create transactions with receipts
    var year = DEMO_CONFIG.YEAR;
    var transactions = [];
    
    for (var i = 0; i < DEMO_RECEIPT_URLS.length; i++) {
      var receipt = DEMO_RECEIPT_URLS[i];
      var day = 15 + (i * 3);  // Jan 15, 18, 21
      var date = new Date(year, 0, day);  // January 2026
      
      transactions.push([
        date,                                    // C - Date
        receipt.merchant + ' #' + Math.floor(Math.random() * 9000 + 1000),  // D - Description
        receipt.amount,                          // E - Amount
        receipt.category,                        // F - Personal Category
        '',                                      // G - Business Category
        receipt.description,                     // H - Memo
        'Desire',                                // I - Need/Desire (shopping = Desire)
        receipt.mainCategory,                    // J - Main Category
        receipt.url,                             // K - Receipt URL
        ''                                       // L - Needs Correction
      ]);
    }
    
    // Write to sheet
    sheet.getRange(startRow, 3, transactions.length, 10).setValues(transactions);
    
    ss.toast('Demo receipts added!', '✅ Success', 5);
    
    ui.alert(
      '✅ Demo Receipts Added!',
      'Added 3 transactions with receipts to ACCOUNT 1:\n\n' +
      '🧾 Target receipt - Row ' + startRow + '\n' +
      '🧾 Starbucks receipt - Row ' + (startRow + 1) + '\n' +
      '🧾 Shell receipt - Row ' + (startRow + 2) + '\n\n' +
      'Receipt URLs are in Column K.\n' +
      'Open the Categorization Modal to view them!',
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('Demo receipts error: ' + error.message);
    ui.alert('Error', 'Failed to add demo receipts: ' + error.message, ui.ButtonSet.OK);
  }
}

/**
 * Add receipt to existing transaction by row number
 * @param {number} rowNumber - The row number in ACCOUNT 1 to add receipt to
 * @param {string} receiptUrl - The URL of the receipt image
 */
function addReceiptToTransaction(rowNumber, receiptUrl) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('ACCOUNT 1');
    if (!sheet) return { success: false, error: 'ACCOUNT 1 not found' };
    
    // Receipt column is K (11)
    sheet.getRange(rowNumber, 11).setValue(receiptUrl);
    
    return { success: true, row: rowNumber };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
