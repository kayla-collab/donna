/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * CATEGORYLOADER.GS - Category Loading & Caching
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * NOTE: This file provides optimized category loading with multi-level caching.
 * It uses BACKEND sheet ranges as primary source, with fallback to label sheets.
 * 
 * CATEGORY SOURCES (see ColumnConfig.gs for authoritative source locations):
 * - Expense: BACKEND G58:G465 → fallback EXPENSE LABELS C15+
 * - Income: BACKEND C58:C90 → fallback INCOME LABELS E14+
 * - Business: BACKEND K58:K465 → fallback AC3+ or defaults
 * 
 * For simpler access without caching, use functions in CategorizationSystem.gs:
 * - getExpenseCategoriesFromSheet()
 * - getIncomeCategoriesFromSheet()  
 * - getBusinessCategoriesFromSheet()
 */

// ═══════════════════════════════════════════════════════════════════
// EXPENSE CATEGORIES
// ═══════════════════════════════════════════════════════════════════

function getExpenseCategories() {
  if (MMNAV_cache.expense !== null) return MMNAV_cache.expense;
  
  var cacheKey = 'v3_expenseCategories';
  var cached = MMNAV_OPT.getJSON(cacheKey);
  if (cached && Array.isArray(cached) && cached.length) {
    MMNAV_cache.expense = cached;
    return cached;
  }
  
  try {
    var backendSheet = MMNAV_OPT.sheet(MMNAV_BACKEND_SHEET_NAME);
    if (backendSheet) {
      var values = backendSheet.getRange('G58:G465').getDisplayValues();
      var categories = [];
      for (var i = 0; i < values.length; i++) {
        var val = values[i][0];
        if (!val) continue;
        var t = String(val).trim();
        if (t && t.indexOf('#REF') === -1 && t.indexOf('#ERROR') === -1) {
          categories.push(t);
        }
      }
      var uniqueCategories = [];
      var seen = {};
      for (var i = 0; i < categories.length; i++) {
        if (!seen[categories[i]]) {
          seen[categories[i]] = true;
          uniqueCategories.push(categories[i]);
        }
      }
      uniqueCategories.sort();
      if (uniqueCategories.length) {
        MMNAV_cache.expense = uniqueCategories;
        MMNAV_OPT.putJSON(cacheKey, uniqueCategories, MMNAV_OPT.CACHE_TTL_6H);
        return uniqueCategories;
      }
    }
  } catch (error) {
    Logger.log('BACKEND expense read error: ' + error.message);
  }
  
  try {
    var sheet = MMNAV_OPT.sheet('EXPENSE LABELS');
    if (!sheet) {
      MMNAV_cache.expense = ['Uncategorized'];
      return MMNAV_cache.expense;
    }
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 15) {
      MMNAV_cache.expense = ['Uncategorized'];
      return MMNAV_cache.expense;
    }
    
    var values = sheet.getRange(15, 3, lastRow - 14, 1).getDisplayValues();
    var categories = [];
    for (var i = 0; i < values.length; i++) {
      var val = values[i][0];
      if (!val) continue;
      var t = String(val).trim();
      if (t && t.indexOf('#REF') === -1 && t.indexOf('#ERROR') === -1) {
        categories.push(t);
      }
    }
    
    var finalCats = [];
    if (categories.length) {
      var seen = {};
      for (var i = 0; i < categories.length; i++) {
        if (!seen[categories[i]]) {
          seen[categories[i]] = true;
          finalCats.push(categories[i]);
        }
      }
      finalCats.sort();
    } else {
      finalCats = ['Uncategorized'];
    }
    
    MMNAV_cache.expense = finalCats;
    MMNAV_OPT.putJSON(cacheKey, finalCats, MMNAV_OPT.CACHE_TTL_6H);
    return finalCats;
  } catch (error) {
    Logger.log('EXPENSE LABELS read error: ' + error.message);
    MMNAV_cache.expense = ['Uncategorized'];
    return MMNAV_cache.expense;
  }
}

// ═══════════════════════════════════════════════════════════════════
// INCOME CATEGORIES
// ═══════════════════════════════════════════════════════════════════

function getIncomeCategories() {
  if (MMNAV_cache.income !== null) return MMNAV_cache.income;
  
  var cacheKey = 'v3_incomeCategories';
  var cached = MMNAV_OPT.getJSON(cacheKey);
  if (cached && Array.isArray(cached) && cached.length) {
    MMNAV_cache.income = cached;
    return cached;
  }
  
  try {
    var backendSheet = MMNAV_OPT.sheet(MMNAV_BACKEND_SHEET_NAME);
    if (backendSheet) {
      var values = backendSheet.getRange('C58:C90').getDisplayValues();
      var categories = [];
      for (var i = 0; i < values.length; i++) {
        var val = values[i][0];
        if (!val) continue;
        var t = String(val).trim();
        if (t && t.indexOf('#REF') === -1 && t.indexOf('#ERROR') === -1) {
          categories.push(t);
        }
      }
      var uniqueCategories = [];
      var seen = {};
      for (var i = 0; i < categories.length; i++) {
        if (!seen[categories[i]]) {
          seen[categories[i]] = true;
          uniqueCategories.push(categories[i]);
        }
      }
      uniqueCategories.sort();
      if (uniqueCategories.length) {
        MMNAV_cache.income = uniqueCategories;
        MMNAV_OPT.putJSON(cacheKey, uniqueCategories, MMNAV_OPT.CACHE_TTL_6H);
        return uniqueCategories;
      }
    }
  } catch (error) {
    Logger.log('BACKEND income read error: ' + error.message);
  }
  
  try {
    var sheet = MMNAV_OPT.sheet('INCOME LABELS');
    if (!sheet) {
      MMNAV_cache.income = ['Uncategorized Income'];
      return MMNAV_cache.income;
    }
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 14) {
      MMNAV_cache.income = ['Uncategorized Income'];
      return MMNAV_cache.income;
    }
    
    var values = sheet.getRange(14, 5, lastRow - 13, 1).getDisplayValues();
    var categories = [];
    for (var i = 0; i < values.length; i++) {
      var val = values[i][0];
      if (!val) continue;
      var t = String(val).trim();
      if (t && t.indexOf('#REF') === -1 && t.indexOf('#ERROR') === -1) {
        categories.push(t);
      }
    }
    
    var finalCats = [];
    if (categories.length) {
      var seen = {};
      for (var i = 0; i < categories.length; i++) {
        if (!seen[categories[i]]) {
          seen[categories[i]] = true;
          finalCats.push(categories[i]);
        }
      }
      finalCats.sort();
    } else {
      finalCats = ['Uncategorized Income'];
    }
    
    MMNAV_cache.income = finalCats;
    MMNAV_OPT.putJSON(cacheKey, finalCats, MMNAV_OPT.CACHE_TTL_6H);
    return finalCats;
  } catch (error) {
    Logger.log('INCOME LABELS read error: ' + error.message);
    MMNAV_cache.income = ['Uncategorized Income'];
    return MMNAV_cache.income;
  }
}

// ═══════════════════════════════════════════════════════════════════
// BUSINESS CATEGORIES
// ═══════════════════════════════════════════════════════════════════

function getBusinessCategories() {
  if (MMNAV_cache.business !== null) return MMNAV_cache.business;
  
  var cacheKey = 'v3_businessCategories';
  var cached = MMNAV_OPT.getJSON(cacheKey);
  if (cached && Array.isArray(cached) && cached.length) {
    MMNAV_cache.business = cached;
    return cached;
  }
  
  try {
    var backendSheet = MMNAV_OPT.sheet(MMNAV_BACKEND_SHEET_NAME);
    if (backendSheet) {
      var values = backendSheet.getRange('K58:K465').getDisplayValues();
      var categories = [];
      for (var i = 0; i < values.length; i++) {
        var val = values[i][0];
        if (!val) continue;
        var t = String(val).trim();
        if (t && t.indexOf('#REF') === -1 && t.indexOf('#ERROR') === -1) {
          categories.push(t);
        }
      }
      var uniqueCategories = [];
      var seen = {};
      for (var i = 0; i < categories.length; i++) {
        if (!seen[categories[i]]) {
          seen[categories[i]] = true;
          uniqueCategories.push(categories[i]);
        }
      }
      uniqueCategories.sort();
      if (uniqueCategories.length) {
        MMNAV_cache.business = uniqueCategories;
        MMNAV_OPT.putJSON(cacheKey, uniqueCategories, MMNAV_OPT.CACHE_TTL_6H);
        return uniqueCategories;
      }
    }
  } catch (error) {
    Logger.log('BACKEND business read error: ' + error.message);
  }
  
  MMNAV_cache.business = ['Business Expense', 'Business Income'];
  return MMNAV_cache.business;
}

// ═══════════════════════════════════════════════════════════════════
// CACHE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

function clearCategoryCache() {
  MMNAV_cache.expense = null;
  MMNAV_cache.income = null;
  MMNAV_cache.business = null;
  
  try {
    var cache = CacheService.getScriptCache();
    cache.remove('v3_expenseCategories');
    cache.remove('v3_incomeCategories');
    cache.remove('v3_businessCategories');
  } catch (e) {}
  
  Logger.log('Category cache cleared');
}
