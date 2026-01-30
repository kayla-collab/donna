/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * ML SYSTEM - Consolidated Machine Learning with Lazy Loading
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * FEATURES:
 * - Lazy initialization (not in onOpen)
 * - Trains on 10,000+ pre-labeled examples
 * - Auto-appends predictions to MACHINE LEARNING tab
 * - Continuous learning from user feedback
 * - Queue with retry logic
 * - All functions use var for Apps Script compatibility
 */

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION - Using var for Apps Script compatibility
// ═══════════════════════════════════════════════════════════════════

var ML_CONFIG = {
  // External ML sheet - Updated to NEW MASTER HUB
  // NOTE: Create MACHINE LEARNING tab in MASTER HUB if ML data needs centralized storage
  SHEET_ID: '11MhJFe4xmSMBLPUXxePtq-yB2YsuhsScY1H7Dc4zwMI',  // NEW MASTER HUB
  TAB_NAME: 'MACHINE LEARNING',
  TAB_GID: '0',  // Update this after creating the tab
  
  // Training settings
  INITIAL_TRAINING_SIZE: 10000,
  MIN_TRAINING_SIZE: 50,
  BATCH_SIZE: 100,
  RETRAIN_THRESHOLD: 50,
  
  // Queue settings
  MAX_QUEUE_SIZE: 1000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  
  // Cache settings
  MODEL_CACHE_DURATION: 30 * 60 * 1000, // 30 minutes
  DATA_CACHE_DURATION: 5 * 60 * 1000,    // 5 minutes
  
  // Column mapping for ML sheet
  COLS: {
    FULL_TRANSACTION: 1,    // A
    NORMALIZED_NAME: 2,     // B
    CATEGORY_TAGS: 3,       // C
    TIMESTAMP: 4,           // D
    SOURCE: 5,              // E
    CONFIDENCE: 6,          // F
    USER_EMAIL: 7,          // G
    ACCOUNT: 8              // H
  }
};

// ═══════════════════════════════════════════════════════════════════
// GLOBAL STATE - Using var for compatibility
// ═══════════════════════════════════════════════════════════════════

var _mlModel = null;
var _mlModelTimestamp = 0;
var _mlInitialized = false;
var _mlInitializing = false;
var _trainingData = null;
var _trainingDataTimestamp = 0;
var _appendQueue = [];
var _queueProcessing = false;
var _newLabelCount = 0;

// ═══════════════════════════════════════════════════════════════════
// LAZY INITIALIZATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Initialize ML model lazily (not called in onOpen)
 * Returns true if successful, false otherwise
 */
function initializeML() {
  // Prevent multiple simultaneous initializations
  if (_mlInitializing) {
    return false;
  }
  
  if (_mlInitialized && _mlModel) {
    // Check if cache is still valid
    if (Date.now() - _mlModelTimestamp < ML_CONFIG.MODEL_CACHE_DURATION) {
      return true;
    }
  }
  
  _mlInitializing = true;
  
  try {
    Logger.log('🚀 [ML] Starting lazy initialization...');
    
    // Try to load from cache first
    if (loadMLFromCache()) {
      _mlInitialized = true;
      _mlInitializing = false;
      Logger.log('✅ [ML] Loaded from cache');
      return true;
    }
    
    // Load training data
    var data = loadMLTrainingData();
    
    if (!data || data.length < ML_CONFIG.MIN_TRAINING_SIZE) {
      Logger.log('⚠️ [ML] Insufficient training data: ' + (data ? data.length : 0));
      _mlInitializing = false;
      return false;
    }
    
    Logger.log('✅ [ML] Loaded ' + data.length + ' training examples');
    
    // Build model
    _mlModel = buildMLModel(data);
    _mlModelTimestamp = Date.now();
    _mlInitialized = true;
    
    // Try to cache (but don't fail if it doesn't work)
    try {
      saveMLToCache();
    } catch (e) {
      Logger.log('⚠️ [ML] Could not cache model: ' + e.message);
    }
    
    Logger.log('✅ [ML] Initialization complete');
    return true;
    
  } catch (e) {
    Logger.log('❌ [ML] Initialization failed: ' + e.message);
    return false;
  } finally {
    _mlInitializing = false;
  }
}

/**
 * Load training data from MACHINE LEARNING tab
 */
function loadMLTrainingData() {
  var now = Date.now();
  
  // Check cache
  if (_trainingData && (now - _trainingDataTimestamp) < ML_CONFIG.DATA_CACHE_DURATION) {
    return _trainingData;
  }
  
  try {
    var sheet = getMLSheet();
    if (!sheet) {
      return null;
    }
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return [];
    }
    
    // Load up to INITIAL_TRAINING_SIZE rows
    var rowsToLoad = Math.min(lastRow - 1, ML_CONFIG.INITIAL_TRAINING_SIZE);
    var data = sheet.getRange(2, 1, rowsToLoad, 8).getValues();
    
    // Parse into training format
    _trainingData = [];
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var item = {
        fullTransaction: String(row[0] || ''),
        normalizedName: String(row[1] || '').toLowerCase(),
        categoryTags: String(row[2] || '').split(',').map(function(t) { return t.trim(); }).filter(function(t) { return t; }),
        timestamp: row[3],
        source: String(row[4] || 'training'),
        confidence: parseFloat(row[5]) || 100,
        userEmail: String(row[6] || ''),
        account: String(row[7] || '')
      };
      
      if (item.fullTransaction && item.categoryTags.length > 0) {
        _trainingData.push(item);
      }
    }
    
    _trainingDataTimestamp = now;
    return _trainingData;
    
  } catch (e) {
    Logger.log('❌ [ML] Error loading training data: ' + e.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// ML MODEL
// ═══════════════════════════════════════════════════════════════════

/**
 * Build ML model from training data
 */
function buildMLModel(data) {
  var model = {
    merchantPatterns: {},
    keywordCategories: {},
    hierarchicalPaths: {},
    totalExamples: data.length,
    createdAt: new Date().toISOString()
  };
  
  for (var i = 0; i < data.length; i++) {
    var example = data[i];
    var normalized = example.normalizedName;
    var categories = example.categoryTags;
    var categoryKey = categories.join(',');
    
    // Store merchant patterns
    if (!model.merchantPatterns[normalized]) {
      model.merchantPatterns[normalized] = {};
    }
    model.merchantPatterns[normalized][categoryKey] = 
      (model.merchantPatterns[normalized][categoryKey] || 0) + 1;
    
    // Extract and store keywords
    var keywords = extractMLKeywords(example.fullTransaction);
    for (var j = 0; j < keywords.length; j++) {
      var keyword = keywords[j];
      if (!model.keywordCategories[keyword]) {
        model.keywordCategories[keyword] = {};
      }
      model.keywordCategories[keyword][categoryKey] = 
        (model.keywordCategories[keyword][categoryKey] || 0) + 1;
    }
    
    // Store hierarchical paths
    if (categories.length > 1) {
      var path = categories.join(' > ');
      model.hierarchicalPaths[path] = (model.hierarchicalPaths[path] || 0) + 1;
    }
  }
  
  return model;
}

/**
 * Extract keywords from transaction
 */
function extractMLKeywords(transaction) {
  var normalized = String(transaction).toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  var words = normalized.split(' ')
    .filter(function(w) { return w.length > 2; })
    .filter(function(w) { return !/^\d+$/.test(w); });
  
  // Remove stop words
  var stopWords = ['the', 'and', 'for', 'with', 'from', 'this', 'that', 'into', 'are'];
  return words.filter(function(w) { return stopWords.indexOf(w) === -1; });
}

/**
 * Normalize merchant name
 */
function normalizeMLTransaction(transaction) {
  var merchant = String(transaction);
  
  // Remove common patterns
  merchant = merchant.replace(/\s+#?\d+.*$/, ''); // Store numbers
  merchant = merchant.replace(/\s+[A-Z]{2}\s*\d{5}.*$/, ''); // State + zip
  merchant = merchant.replace(/\s+(LLC|INC|CORP|LTD)\.?$/i, ''); // Company types
  
  return merchant.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ═══════════════════════════════════════════════════════════════════
// PREDICTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Get ML prediction for transaction (lazy loads model if needed)
 */
function getMLCategoryPrediction(fullTransaction) {
  try {
    // Lazy initialize if needed
    if (!_mlInitialized || !_mlModel) {
      if (!initializeML()) {
        return null;
      }
    }
    
    // Check model age
    if (Date.now() - _mlModelTimestamp > ML_CONFIG.MODEL_CACHE_DURATION) {
      initializeML(); // Refresh model
    }
    
    if (!_mlModel) {
      return null;
    }
    
    var normalized = normalizeMLTransaction(fullTransaction);
    var keywords = extractMLKeywords(fullTransaction);
    
    // Check exact merchant match
    if (_mlModel.merchantPatterns[normalized]) {
      var patterns = _mlModel.merchantPatterns[normalized];
      var bestPattern = null;
      var bestCount = 0;
      
      for (var pattern in patterns) {
        if (patterns[pattern] > bestCount) {
          bestPattern = pattern;
          bestCount = patterns[pattern];
        }
      }
      
      if (bestPattern) {
        var prediction = {
          categories: bestPattern.split(','),
          confidence: Math.min(95, 60 + (bestCount * 5)),
          method: 'exact_merchant'
        };
        
        // Queue for append
        queueMLPrediction(fullTransaction, prediction);
        
        return prediction;
      }
    }
    
    // Keyword-based prediction
    var categoryScores = {};
    
    for (var k = 0; k < keywords.length; k++) {
      var keyword = keywords[k];
      if (_mlModel.keywordCategories[keyword]) {
        var categories = _mlModel.keywordCategories[keyword];
        for (var cat in categories) {
          categoryScores[cat] = (categoryScores[cat] || 0) + categories[cat];
        }
      }
    }
    
    // Find best category
    var bestCategory = null;
    var bestScore = 0;
    
    for (var catKey in categoryScores) {
      if (categoryScores[catKey] > bestScore) {
        bestCategory = catKey;
        bestScore = categoryScores[catKey];
      }
    }
    
    if (bestCategory && bestScore >= 3) {
      var pred = {
        categories: bestCategory.split(','),
        confidence: Math.min(85, 40 + (bestScore * 3)),
        method: 'keyword_match'
      };
      
      // Queue for append
      queueMLPrediction(fullTransaction, pred);
      
      return pred;
    }
    
    return null;
    
  } catch (e) {
    Logger.log('⚠️ [ML] Prediction error: ' + e.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// QUEUE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

/**
 * Queue ML prediction for append
 */
function queueMLPrediction(fullTransaction, prediction) {
  try {
    var data = {
      fullTransaction: fullTransaction,
      normalizedName: normalizeMLTransaction(fullTransaction),
      categoryTags: prediction.categories,
      source: 'prediction',
      confidence: prediction.confidence,
      userEmail: Session.getActiveUser().getEmail(),
      account: getCurrentMLAccountNumber()
    };
    
    addToMLQueue(data);
  } catch (e) {
    Logger.log('⚠️ [ML] Queue error: ' + e.message);
  }
}

/**
 * Add item to ML queue
 */
function addToMLQueue(data) {
  // Check queue size
  if (_appendQueue.length >= ML_CONFIG.MAX_QUEUE_SIZE) {
    Logger.log('⚠️ [ML Queue] Max size reached, dropping oldest');
    _appendQueue = _appendQueue.slice(-ML_CONFIG.MAX_QUEUE_SIZE + 100);
  }
  
  _appendQueue.push({
    data: data,
    attempts: 0,
    addedAt: Date.now()
  });
  
  // Process queue if not already processing
  if (!_queueProcessing) {
    processMLQueue();
  }
}

/**
 * Process ML queue
 */
function processMLQueue() {
  if (_queueProcessing || _appendQueue.length === 0) {
    return;
  }
  
  _queueProcessing = true;
  
  try {
    while (_appendQueue.length > 0) {
      var batch = _appendQueue.splice(0, ML_CONFIG.BATCH_SIZE);
      
      if (!appendMLBatch(batch)) {
        // Retry failed items
        for (var i = 0; i < batch.length; i++) {
          var item = batch[i];
          item.attempts++;
          
          if (item.attempts < ML_CONFIG.RETRY_ATTEMPTS) {
            Utilities.sleep(ML_CONFIG.RETRY_DELAY_MS * item.attempts);
            _appendQueue.unshift(item);
          } else {
            Logger.log('❌ [ML Queue] Failed after max attempts');
          }
        }
      }
    }
  } catch (e) {
    Logger.log('❌ [ML Queue] Process error: ' + e.message);
  } finally {
    _queueProcessing = false;
  }
}

/**
 * Append batch to ML sheet
 */
function appendMLBatch(batch) {
  try {
    var sheet = getMLSheet();
    if (!sheet) {
      return false;
    }
    
    var rows = [];
    for (var i = 0; i < batch.length; i++) {
      var d = batch[i].data;
      rows.push([
        d.fullTransaction || '',
        d.normalizedName || '',
        Array.isArray(d.categoryTags) ? d.categoryTags.join(',') : d.categoryTags || '',
        new Date(),
        d.source || 'prediction',
        d.confidence || 0,
        d.userEmail || '',
        d.account || ''
      ]);
    }
    
    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 8).setValues(rows);
      Logger.log('✅ [ML Queue] Appended ' + rows.length + ' rows');
      
      _newLabelCount += rows.length;
      
      if (_newLabelCount >= ML_CONFIG.RETRAIN_THRESHOLD) {
        scheduleMLRetrain();
      }
      
      return true;
    }
    
    return false;
    
  } catch (e) {
    Logger.log('❌ [ML Queue] Append error: ' + e.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// CONTINUOUS LEARNING
// ═══════════════════════════════════════════════════════════════════

/**
 * Record user acceptance of ML prediction
 */
function recordMLAcceptance(fullTransaction, categories) {
  try {
    var data = {
      fullTransaction: fullTransaction,
      normalizedName: normalizeMLTransaction(fullTransaction),
      categoryTags: categories,
      source: 'verified',
      confidence: 100,
      userEmail: Session.getActiveUser().getEmail(),
      account: getCurrentMLAccountNumber()
    };
    
    addToMLQueue(data);
  } catch (e) {
    Logger.log('⚠️ [ML] Record acceptance error: ' + e.message);
  }
}

/**
 * Record user rejection and correction
 */
function recordMLRejection(fullTransaction, suggestedCategories, correctCategories) {
  try {
    // Record rejection
    addToMLQueue({
      fullTransaction: fullTransaction,
      normalizedName: normalizeMLTransaction(fullTransaction),
      categoryTags: suggestedCategories,
      source: 'rejected',
      confidence: 0,
      userEmail: Session.getActiveUser().getEmail(),
      account: getCurrentMLAccountNumber()
    });
    
    // Record correction
    addToMLQueue({
      fullTransaction: fullTransaction,
      normalizedName: normalizeMLTransaction(fullTransaction),
      categoryTags: correctCategories,
      source: 'corrected',
      confidence: 100,
      userEmail: Session.getActiveUser().getEmail(),
      account: getCurrentMLAccountNumber()
    });
    
  } catch (e) {
    Logger.log('⚠️ [ML] Record rejection error: ' + e.message);
  }
}

/**
 * Record manual labeling
 */
function recordMLManualLabel(fullTransaction, categories) {
  try {
    var data = {
      fullTransaction: fullTransaction,
      normalizedName: normalizeMLTransaction(fullTransaction),
      categoryTags: categories,
      source: 'manual',
      confidence: 100,
      userEmail: Session.getActiveUser().getEmail(),
      account: getCurrentMLAccountNumber()
    };
    
    addToMLQueue(data);
  } catch (e) {
    Logger.log('⚠️ [ML] Record manual label error: ' + e.message);
  }
}

/**
 * Schedule ML model retrain
 */
function scheduleMLRetrain() {
  _newLabelCount = 0;
  
  try {
    ScriptApp.newTrigger('retrainMLModel')
      .timeBased()
      .after(1000)
      .create();
    
    Logger.log('📅 [ML] Scheduled retrain');
  } catch (e) {
    Logger.log('⚠️ [ML] Could not schedule retrain: ' + e.message);
  }
}

/**
 * Retrain ML model
 */
function retrainMLModel() {
  try {
    Logger.log('🔄 [ML] Starting retrain...');
    
    // Clear caches
    _trainingData = null;
    _trainingDataTimestamp = 0;
    _mlInitialized = false;
    
    // Reinitialize
    initializeML();
    
    Logger.log('✅ [ML] Retrain complete');
    
    // Clean up triggers
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'retrainMLModel') {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }
  } catch (e) {
    Logger.log('❌ [ML] Retrain error: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════

/**
 * Get ML sheet
 */
function getMLSheet() {
  try {
    var ss = SpreadsheetApp.openById(ML_CONFIG.SHEET_ID);
    if (!ss) {
      return null;
    }
    
    var sheet = ss.getSheetByName(ML_CONFIG.TAB_NAME);
    return sheet || null;
    
  } catch (e) {
    Logger.log('⚠️ [ML] Cannot access ML sheet: ' + e.message);
    return null;
  }
}

/**
 * Get current account number
 */
function getCurrentMLAccountNumber() {
  try {
    var sheet = SpreadsheetApp.getActiveSheet();
    var name = sheet.getName();
    var match = name.match(/ACCOUNT\s*(\d+)/i);
    return match ? match[1] : '';
  } catch (e) {
    return '';
  }
}

/**
 * Save ML model to cache
 */
function saveMLToCache() {
  try {
    var props = PropertiesService.getScriptProperties();
    var modelStr = JSON.stringify(_mlModel);
    
    if (modelStr.length > 400000) {
      Logger.log('⚠️ [ML] Model too large for cache');
      return;
    }
    
    props.setProperty('ML_MODEL_CACHE_V2', modelStr);
    props.setProperty('ML_MODEL_TIMESTAMP_V2', String(_mlModelTimestamp));
    
  } catch (e) {
    Logger.log('⚠️ [ML] Cache save error: ' + e.message);
  }
}

/**
 * Load ML model from cache
 */
function loadMLFromCache() {
  try {
    var props = PropertiesService.getScriptProperties();
    var modelStr = props.getProperty('ML_MODEL_CACHE_V2');
    var timestamp = props.getProperty('ML_MODEL_TIMESTAMP_V2');
    
    if (!modelStr || !timestamp) {
      return false;
    }
    
    var age = Date.now() - parseInt(timestamp);
    if (age > ML_CONFIG.MODEL_CACHE_DURATION) {
      return false;
    }
    
    _mlModel = JSON.parse(modelStr);
    _mlModelTimestamp = parseInt(timestamp);
    
    return true;
    
  } catch (e) {
    Logger.log('⚠️ [ML] Cache load error: ' + e.message);
    return false;
  }
}

/**
 * Force process ML queue (for testing)
 */
function forceProcessMLQueue() {
  _queueProcessing = false;
  processMLQueue();
}

/**
 * Get ML system statistics
 */
function getMLSystemStats() {
  return {
    initialized: _mlInitialized,
    modelLoaded: _mlModel !== null,
    modelAge: _mlModel ? Date.now() - _mlModelTimestamp : null,
    trainingExamples: _mlModel ? _mlModel.totalExamples : 0,
    queueSize: _appendQueue.length,
    newLabels: _newLabelCount,
    merchantPatterns: _mlModel ? Object.keys(_mlModel.merchantPatterns).length : 0,
    keywordPatterns: _mlModel ? Object.keys(_mlModel.keywordCategories).length : 0
  };
}