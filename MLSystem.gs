/**
 * MACHINE LEARNING SYSTEM - CONSOLIDATED
 * Donna Roggio LLC Financial Management System
 * Copyright 2026 - All Rights Reserved
 * 
 * This is the SINGLE consolidated ML file for the Money Mastery System
 * Trains on 10,000+ pre-labeled examples from MACHINE LEARNING tab
 * Provides continuous learning from user verification/labeling
 */

// ========================================
// CONFIGURATION
// ========================================

var ML_CONFIG = {
  // NOTE: ML_CONFIG here is for ML System only - not the same as ML_CONFIG in Config.gs
  sheetId: '11MhJFe4xmSMBLPUXxePtq-yB2YsuhsScY1H7Dc4zwMI',  // NEW MASTER HUB (if ML data is stored there)
  tabName: 'MACHINE LEARNING',
  modelCacheDuration: 30 * 60 * 1000, // 30 minutes
  retrainThreshold: 50, // New labels before retraining
  queueMaxSize: 1000,
  batchSize: 100,
  retryAttempts: 3,
  retryDelay: 1000 // Initial delay in ms
};

// ========================================
// GLOBAL STATE (Use var for Apps Script)
// ========================================

var mlModel = null;
var mlModelTimestamp = 0;
var trainingData = null;
var trainingDataTimestamp = 0;
var appendQueue = [];
var isProcessingQueue = false;
var newLabelsSinceRetrain = 0;

// ========================================
// CORE ML FUNCTIONS
// ========================================

/**
 * Initialize ML model with training data
 * Uses lazy initialization - called on first prediction request
 */
function initializeMLModel() {
  try {
    // Check if model is still valid
    var now = Date.now();
    if (mlModel && (now - mlModelTimestamp) < ML_CONFIG.modelCacheDuration) {
      return true;
    }
    
    // Load training data from MACHINE LEARNING tab
    var data = loadMLTrainingData();
    
    if (!data || data.length < 50) {
      Logger.log('Insufficient training data: ' + (data ? data.length : 0));
      return false;
    }
    
    // Build model from training data
    mlModel = buildMLModel(data);
    mlModelTimestamp = now;
    trainingData = data;
    trainingDataTimestamp = now;
    
    Logger.log('ML Model initialized with ' + data.length + ' training examples');
    return true;
    
  } catch (error) {
    Logger.log('Error initializing ML model: ' + error.toString());
    return false;
  }
}

/**
 * Load training data from MACHINE LEARNING sheet
 */
function loadMLTrainingData() {
  try {
    var sheet = SpreadsheetApp.openById(ML_CONFIG.sheetId).getSheetByName(ML_CONFIG.tabName);
    if (!sheet) {
      Logger.log('MACHINE LEARNING sheet not found');
      return [];
    }
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return [];
    }
    
    // Get all data: [Timestamp, Description, Keywords, Category, Amount Type, User, Account, Action, Confidence, Rejected]
    var data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
    
    // Filter and format training data
    var trainingData = [];
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (row[1] && row[3]) { // Has description and category
        trainingData.push({
          description: String(row[1]).trim(),
          keywords: String(row[2] || '').trim(),
          category: String(row[3]).trim(),
          amountType: String(row[4] || '').trim(),
          action: String(row[7] || '').trim(),
          confidence: Number(row[8]) || 0,
          rejected: String(row[9] || '').trim()
        });
      }
    }
    
    return trainingData;
    
  } catch (error) {
    Logger.log('Error loading ML training data: ' + error.toString());
    return [];
  }
}

/**
 * Build ML model from training data
 */
function buildMLModel(data) {
  var model = {
    exactMatches: {},
    fuzzyMatches: {},
    keywords: {},
    categories: new Set(),
    rejectedPatterns: {}
  };
  
  // Build exact and fuzzy match maps
  for (var i = 0; i < data.length; i++) {
    var item = data[i];
    var desc = normalizeDescription(item.description);
    
    // Skip rejected predictions
    if (item.action === 'REJECTED' || item.rejected) {
      model.rejectedPatterns[desc] = item.rejected || item.category;
      continue;
    }
    
    // Add to categories
    model.categories.add(item.category);
    
    // Exact match
    model.exactMatches[desc] = item.category;
    
    // Extract keywords for fuzzy matching
    var keywords = extractKeywords(desc);
    for (var j = 0; j < keywords.length; j++) {
      var keyword = keywords[j];
      if (!model.keywords[keyword]) {
        model.keywords[keyword] = {};
      }
      model.keywords[keyword][item.category] = (model.keywords[keyword][item.category] || 0) + 1;
    }
  }
  
  return model;
}

/**
 * Get ML prediction for a transaction
 */
function getMLCategoryPrediction(description, amountType) {
  try {
    // Lazy initialization
    if (!mlModel) {
      if (!initializeMLModel()) {
        return null;
      }
    }
    
    var normalized = normalizeDescription(description);
    
    // Check if this pattern was rejected before
    if (mlModel.rejectedPatterns[normalized]) {
      return null;
    }
    
    // Try exact match first
    if (mlModel.exactMatches[normalized]) {
      return {
        category: mlModel.exactMatches[normalized],
        confidence: 1.0,
        method: 'exact'
      };
    }
    
    // Try fuzzy match with keywords
    var keywords = extractKeywords(normalized);
    var categoryScores = {};
    var totalScore = 0;
    
    for (var i = 0; i < keywords.length; i++) {
      var keyword = keywords[i];
      if (mlModel.keywords[keyword]) {
        for (var category in mlModel.keywords[keyword]) {
          var score = mlModel.keywords[keyword][category];
          categoryScores[category] = (categoryScores[category] || 0) + score;
          totalScore += score;
        }
      }
    }
    
    // Find best category
    var bestCategory = null;
    var bestScore = 0;
    
    for (var cat in categoryScores) {
      if (categoryScores[cat] > bestScore) {
        bestScore = categoryScores[cat];
        bestCategory = cat;
      }
    }
    
    if (bestCategory && bestScore > 0) {
      return {
        category: bestCategory,
        confidence: Math.min(bestScore / totalScore, 0.95),
        method: 'fuzzy'
      };
    }
    
    return null;
    
  } catch (error) {
    Logger.log('Error getting ML prediction: ' + error.toString());
    return null;
  }
}

/**
 * Record user verification/labeling for continuous learning
 */
function recordMLFeedback(description, category, action, userEmail, accountName) {
  try {
    var record = {
      timestamp: new Date(),
      description: description,
      keywords: extractKeywords(normalizeDescription(description)).join(','),
      category: category,
      amountType: determineAmountType(description),
      userEmail: userEmail || Session.getActiveUser().getEmail(),
      account: accountName || 'Unknown',
      action: action, // 'ACCEPTED', 'REJECTED', 'MANUAL'
      confidence: action === 'MANUAL' ? 1.0 : 0.8,
      rejected: action === 'REJECTED' ? category : ''
    };
    
    // Add to queue
    appendQueue.push(record);
    newLabelsSinceRetrain++;
    
    // Process queue if not already processing
    if (!isProcessingQueue) {
      processMLQueue();
    }
    
    // Check if we need to retrain
    if (newLabelsSinceRetrain >= ML_CONFIG.retrainThreshold) {
      scheduleRetrain();
    }
    
  } catch (error) {
    Logger.log('Error recording ML feedback: ' + error.toString());
  }
}

/**
 * Process the append queue
 */
function processMLQueue() {
  if (isProcessingQueue || appendQueue.length === 0) {
    return;
  }
  
  isProcessingQueue = true;
  
  try {
    var sheet = SpreadsheetApp.openById(ML_CONFIG.sheetId).getSheetByName(ML_CONFIG.tabName);
    if (!sheet) {
      throw new Error('MACHINE LEARNING sheet not found');
    }
    
    // Process in batches
    while (appendQueue.length > 0) {
      var batch = appendQueue.splice(0, ML_CONFIG.batchSize);
      var rows = [];
      
      for (var i = 0; i < batch.length; i++) {
        var record = batch[i];
        rows.push([
          record.timestamp,
          record.description,
          record.keywords,
          record.category,
          record.amountType,
          record.userEmail,
          record.account,
          record.action,
          record.confidence,
          record.rejected
        ]);
      }
      
      // Append to sheet
      if (rows.length > 0) {
        sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 10).setValues(rows);
        Logger.log('Appended ' + rows.length + ' ML records');
      }
    }
    
  } catch (error) {
    Logger.log('Error processing ML queue: ' + error.toString());
    // Put failed items back in queue for retry
    if (batch) {
      appendQueue = batch.concat(appendQueue);
    }
  } finally {
    isProcessingQueue = false;
  }
}

/**
 * Schedule model retraining
 */
function scheduleRetrain() {
  try {
    // Reset counter
    newLabelsSinceRetrain = 0;
    
    // Trigger asynchronous retrain
    var trigger = ScriptApp.newTrigger('retrainMLModel')
      .timeBased()
      .after(1000) // After 1 second
      .create();
      
    // Store trigger ID for cleanup
    PropertiesService.getScriptProperties().setProperty('ML_RETRAIN_TRIGGER', trigger.getUniqueId());
    
  } catch (error) {
    Logger.log('Error scheduling retrain: ' + error.toString());
  }
}

/**
 * Retrain the ML model
 */
function retrainMLModel() {
  try {
    // Clean up trigger
    var triggerId = PropertiesService.getScriptProperties().getProperty('ML_RETRAIN_TRIGGER');
    if (triggerId) {
      var triggers = ScriptApp.getProjectTriggers();
      for (var i = 0; i < triggers.length; i++) {
        if (triggers[i].getUniqueId() === triggerId) {
          ScriptApp.deleteTrigger(triggers[i]);
          break;
        }
      }
      PropertiesService.getScriptProperties().deleteProperty('ML_RETRAIN_TRIGGER');
    }
    
    // Force model reload
    mlModel = null;
    mlModelTimestamp = 0;
    
    // Reinitialize
    initializeMLModel();
    
    Logger.log('ML model retrained successfully');
    
  } catch (error) {
    Logger.log('Error retraining ML model: ' + error.toString());
  }
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Normalize transaction description
 */
function normalizeDescription(description) {
  if (!description) return '';
  
  return String(description)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract keywords from description
 */
function extractKeywords(description) {
  if (!description) return [];
  
  var words = description.split(' ');
  var keywords = [];
  
  for (var i = 0; i < words.length; i++) {
    var word = words[i];
    if (word.length >= 3 && !isStopWord(word)) {
      keywords.push(word);
    }
  }
  
  return keywords;
}

/**
 * Check if word is a stop word
 */
function isStopWord(word) {
  var stopWords = ['the', 'and', 'for', 'with', 'from', 'this', 'that', 'was', 'are', 'been', 'have', 'has'];
  return stopWords.indexOf(word) !== -1;
}

/**
 * Determine amount type from description
 */
function determineAmountType(description) {
  var incomeKeywords = ['deposit', 'payment', 'salary', 'income', 'refund', 'credit'];
  var desc = normalizeDescription(description);
  
  for (var i = 0; i < incomeKeywords.length; i++) {
    if (desc.indexOf(incomeKeywords[i]) !== -1) {
      return 'income';
    }
  }
  
  return 'expense';
}

/**
 * Get ML statistics
 */
function getMLStatistics() {
  try {
    var stats = {
      modelInitialized: mlModel !== null,
      trainingDataSize: trainingData ? trainingData.length : 0,
      categoriesCount: mlModel ? mlModel.categories.size : 0,
      exactMatchesCount: mlModel ? Object.keys(mlModel.exactMatches).length : 0,
      keywordsCount: mlModel ? Object.keys(mlModel.keywords).length : 0,
      rejectedPatternsCount: mlModel ? Object.keys(mlModel.rejectedPatterns).length : 0,
      queueSize: appendQueue.length,
      newLabelsSinceRetrain: newLabelsSinceRetrain,
      modelAge: mlModelTimestamp ? ((Date.now() - mlModelTimestamp) / 1000 / 60) + ' minutes' : 'Not initialized'
    };
    
    return stats;
    
  } catch (error) {
    Logger.log('Error getting ML statistics: ' + error.toString());
    return {};
  }
}

/**
 * Force clear ML cache
 */
function clearMLCache() {
  mlModel = null;
  mlModelTimestamp = 0;
  trainingData = null;
  trainingDataTimestamp = 0;
  Logger.log('ML cache cleared');
}

/**
 * Test ML prediction
 */
function testMLPrediction() {
  var testCases = [
    'CHEVRON MKT #43983 New York NY',
    'STARBUCKS STORE #1234',
    'AMAZON.COM AMZN.COM/BILL',
    'NETFLIX.COM',
    'UBER TRIP HELP.UBER.COM'
  ];
  
  for (var i = 0; i < testCases.length; i++) {
    var prediction = getMLCategoryPrediction(testCases[i], 'expense');
    Logger.log('Test: ' + testCases[i] + ' => ' + JSON.stringify(prediction));
  }
}