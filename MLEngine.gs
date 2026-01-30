/**
 * ═══════════════════════════════════════════════════════════════════
 * DONNA ROGGIO LLC - Financial Management System
 * ML ENGINE v2.0 - 3-Tier Smart Categorization
 * Copyright © 2026 Donna Roggio LLC. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * 3-TIER MATCHING SYSTEM:
 * 
 * TIER 1: Category Word Match
 * - Parse transaction description
 * - Match keywords against user's existing categories
 * - Example: "ELECTRIC" in description → matches "U Electric" category
 * 
 * TIER 2: User Learning
 * - Learn from user's past categorizations
 * - Similar descriptions → recommend same category
 * - Stored in BACKEND sheet MACHINE LEARNING section
 * 
 * TIER 3: Training Data Lookup
 * - Consult 10k merchant training database
 * - Used when description doesn't match user's categories
 * - Returns general category suggestions
 */

// ═══════════════════════════════════════════════════════════════════
// TRAINING DATA - 300 Most Common Merchants → Categories
// ═══════════════════════════════════════════════════════════════════

var TRAINING_DATA_LOOKUP = {
  "UBER": "Transportation",
  "UPS": "Shipping",
  "PETSMART": "Pet Care",
  "PAYMENT": "Payment",
  "BJS": "Groceries",
  "COSTCO": "Groceries",
  "LYFT": "Transportation",
  "USPS": "Shipping",
  "PETCO": "Pet Care",
  "WIRE": "Transfer",
  "REGAL": "Entertainment",
  "DIRECT": "Income",
  "SAMS": "Groceries",
  "ATM": "Cash",
  "RITE": "Pharmacy",
  "PEP": "Auto Parts",
  "FEDEX": "Shipping",
  "ALAMO": "Entertainment",
  "DUANE": "Pharmacy",
  "ACH": "Transfer",
  "PAYPAL": "Transfer",
  "CHECK": "Deposit",
  "AUDIBLE": "Entertainment",
  "CVS": "Pharmacy",
  "PATREON": "Subscriptions",
  "WALGREENS": "Pharmacy",
  "BATH": "Beauty",
  "VENMO": "Transfer",
  "AMAZON": "Shopping",
  "ZELLE": "Transfer",
  "SALLY": "Beauty",
  "SUBSTACK": "Subscriptions",
  "KINDLE": "Entertainment",
  "SCRIBD": "Entertainment",
  "ONLYFANS": "Subscriptions",
  "CINEMARK": "Entertainment",
  "AMC": "Entertainment",
  "ULTA": "Beauty",
  "VICTORIAS": "Beauty",
  "MEDIUM": "Subscriptions",
  "SEPHORA": "Beauty",
  "PAPA": "Dining",
  "NAPA": "Auto Parts",
  "ADVANCE": "Auto Parts",
  "POSTMATES": "Food Delivery",
  "INSTACART": "Food Delivery",
  "AUTOZONE": "Auto Parts",
  "OREILLY": "Auto Parts",
  "GRUBHUB": "Food Delivery",
  "ETSY": "Shopping",
  "YOUTUBE": "Entertainment",
  "STARBUCKS": "Coffee",
  "NATIONWIDE": "Insurance",
  "ALLSTATE": "Insurance",
  "SHIPT": "Food Delivery",
  "CHEWY": "Pet Care",
  "LIBERTY": "Insurance",
  "DOORDASH": "Food Delivery",
  "ANYTIME": "Fitness",
  "OVERSTOCK": "Shopping",
  "FRONTIER": "Utilities",
  "GEICO": "Insurance",
  "PROGRESSIVE": "Insurance",
  "USAA": "Insurance",
  "CRUNCH": "Fitness",
  "FIRESTONE": "Auto Maintenance",
  "MEINEKE": "Auto Maintenance",
  "DISCOUNT": "Auto Maintenance",
  "FARMERS": "Insurance",
  "DROPBOX": "Software",
  "EQUINOX": "Fitness",
  "FITNESS": "Fitness",
  "GOODYEAR": "Auto Maintenance",
  "WISH": "Shopping",
  "LITTLE": "Dining",
  "PLANET": "Fitness",
  "JIFFY": "Auto Maintenance",
  "EBAY": "Shopping",
  "BLAZE": "Dining",
  "NINTENDO": "Entertainment",
  "OPTIMUM": "Utilities",
  "ZOOM": "Software",
  "HORTONS": "Coffee",
  "PHILZ": "Coffee",
  "WAYFAIR": "Shopping",
  "DISCORD": "Entertainment",
  "DUTCH": "Coffee",
  "TWITCH": "Entertainment",
  "MIDAS": "Auto Maintenance",
  "UBISOFT": "Entertainment",
  "PIZZA": "Dining",
  "ZAPPOS": "Shopping",
  "COLOMBE": "Coffee",
  "EVERNOTE": "Software",
  "COFFEE": "Coffee",
  "LIFETIME": "Fitness",
  "XFINITY": "Utilities",
  "ORANGE": "Fitness",
  "STATE": "Insurance",
  "ICLOUD": "Software",
  "SPECTRUM": "Utilities",
  "TMOBILE": "Utilities",
  "NOTION": "Software",
  "TEXACO": "Gas",
  "VERIZON": "Utilities",
  "PEETS": "Coffee",
  "SLACK": "Software",
  "COMCAST": "Utilities",
  "CARIBOU": "Coffee",
  "ROBLOX": "Entertainment",
  "XBOX": "Entertainment",
  "ADOBE": "Software",
  "CIRCLE": "Gas",
  "GOLDS": "Fitness",
  "DOLLAR": "Shopping",
  "MICROSOFT": "Software",
  "PEACOCK": "Entertainment",
  "VALVOLINE": "Auto Maintenance",
  "BLUE": "Coffee",
  "APPLE": "Technology",
  "STEAM": "Entertainment",
  "GOOGLE": "Software",
  "DUNKIN": "Coffee",
  "TEXAS": "Dining",
  "MARCOS": "Dining",
  "BLIZZARD": "Entertainment",
  "PLAYSTATION": "Entertainment",
  "PANERA": "Dining",
  "DOMINOS": "Dining",
  "KROGER": "Groceries",
  "EPIC": "Entertainment",
  "CHEESECAKE": "Dining",
  "JCPENNEY": "Shopping",
  "GRAMMARLY": "Software",
  "CHEVRON": "Gas",
  "SPRINT": "Utilities",
  "CHANGS": "Dining",
  "GAMES": "Entertainment",
  "CENTURYLINK": "Utilities",
  "SHELL": "Gas",
  "BUFFALO": "Dining",
  "OUTBACK": "Dining",
  "LOTS": "Shopping",
  "BENIHANA": "Dining",
  "DENNYS": "Dining",
  "SPEEDWAY": "Gas",
  "MOBIL": "Gas",
  "FORTNITE": "Entertainment",
  "FIVE": "Dining",
  "SONIC": "Dining",
  "EVANS": "Dining",
  "LOBSTER": "Dining",
  "LINKEDIN": "Software",
  "LIDL": "Groceries",
  "SAFEWAY": "Groceries",
  "TIDAL": "Entertainment",
  "CHILIS": "Dining",
  "POPEYES": "Dining",
  "ROSS": "Shopping",
  "STOP": "Groceries",
  "MARATHON": "Gas",
  "CITGO": "Gas",
  "FRIDAYS": "Dining",
  "NETFLIX": "Entertainment",
  "ALDI": "Groceries",
  "FRESH": "Groceries",
  "BARNES": "Shopping",
  "WALMART": "Shopping",
  "SUNOCO": "Gas",
  "ROBIN": "Dining",
  "QDOBA": "Dining",
  "PHILLIPS": "Gas",
  "CANVA": "Software",
  "VIA": "Transportation",
  "EXXON": "Gas",
  "OFFICE": "Shopping",
  "CONOCO": "Gas",
  "BURGER": "Dining",
  "CARLS": "Dining",
  "WHOLE": "Groceries",
  "SPROUTS": "Groceries",
  "CHICKFILA": "Dining",
  "CHICK": "Dining",
  "TRADER": "Groceries",
  "GIANT": "Groceries",
  "CRACKER": "Dining",
  "WHATABURGER": "Dining",
  "WENDYS": "Dining",
  "PANDORA": "Entertainment",
  "TACO": "Dining",
  "HBO": "Entertainment",
  "SUBWAY": "Dining",
  "ALBERTSONS": "Groceries",
  "HOME": "Shopping",
  "DISNEY": "Entertainment",
  "WINNDIXIE": "Groceries",
  "ARBYS": "Dining",
  "NORDSTROM": "Shopping",
  "CRUNCHYROLL": "Entertainment",
  "APPLEBEES": "Dining",
  "LOWES": "Shopping",
  "PANDA": "Dining",
  "PUBLIX": "Groceries",
  "SEARS": "Shopping",
  "HULU": "Entertainment",
  "CHIPOTLE": "Dining",
  "BURLINGTON": "Shopping",
  "STAPLES": "Shopping",
  "JIMMY": "Dining",
  "MCDONALDS": "Dining",
  "MCDONALD": "Dining",
  "OLIVE": "Dining",
  "MACYS": "Shopping",
  "HARRIS": "Groceries",
  "BEST": "Shopping",
  "INNOUT": "Dining",
  "MAXX": "Shopping",
  "DILLARDS": "Shopping",
  "KOHLS": "Shopping",
  "FOOD": "Groceries",
  "IHOP": "Dining",
  "WEGMANS": "Groceries",
  "MARSHALLS": "Shopping",
  "TARGET": "Shopping",
  "ATT": "Utilities",
  "SPOTIFY": "Entertainment",
  "VALERO": "Gas",
  "FUNIMATION": "Entertainment",
  "PARAMOUNT": "Entertainment",
  "JACK": "Dining",
  "FAMILY": "Shopping",
  "DISCOVERY": "Entertainment",
  "COX": "Utilities",
  "KFC": "Dining",
  "HEB": "Groceries",
  "BP": "Gas",
  "WAWA": "Gas",
  "ELECTRIC": "Utilities",
  "WATER": "Utilities",
  "GAS": "Utilities",
  "RENT": "Housing",
  "MORTGAGE": "Housing",
  "INSURANCE": "Insurance",
  "DEPOSIT": "Income",
  "PAYROLL": "Income",
  "SALARY": "Income",
  "REFUND": "Refund",
  "RETURN": "Refund",
  "INTEREST": "Income",
  "DIVIDEND": "Income",
  "TRANSFER": "Transfer"
};

// ═══════════════════════════════════════════════════════════════════
// 3-TIER ML SUGGESTION ENGINE
// ═══════════════════════════════════════════════════════════════════

/**
 * Get smart ML suggestion using 3-tier system
 * Returns: { category, confidence, source, tier, matchedKeyword }
 * 
 * @param {string} description - Transaction description
 * @param {string} type - 'income' or 'expense'
 * @param {Array} userCategories - User's available categories for this type
 * @return {Object|null} Suggestion object or null if no match
 */
function getSmartMLSuggestion(description, type, userCategories) {
  try {
    if (!description || description.trim() === '') {
      Logger.log('[ML] Empty description, skipping');
      return null;
    }
    
    var normalized = normalizeDescriptionForML(description);
    var keywords = extractMLKeywords(description);
    
    Logger.log('[ML] Processing: "' + description.substring(0, 40) + '..." → Keywords: ' + keywords.slice(0, 5).join(', '));
    
    // ═══════════════════════════════════════════════════════════════
    // TIER 1: Match description keywords against user's categories
    // ═══════════════════════════════════════════════════════════════
    
    var tier1Result = matchAgainstUserCategories(keywords, userCategories);
    if (tier1Result && tier1Result.confidence >= 0.70) {
      return {
        category: tier1Result.category,
        confidence: tier1Result.confidence,
        source: 'category_match',
        tier: 1,
        matchedKeyword: tier1Result.matchedKeyword,
        explanation: 'Matched "' + tier1Result.matchedKeyword + '" in your categories'
      };
    }
    
    // ═══════════════════════════════════════════════════════════════
    // TIER 2: Check user's past categorizations (learning)
    // ═══════════════════════════════════════════════════════════════
    
    var tier2Result = getMLSuggestionFromUserHistory(normalized, type);
    if (tier2Result && tier2Result.confidence >= 0.60) {
      return {
        category: tier2Result.category,
        confidence: tier2Result.confidence,
        source: 'user_learning',
        tier: 2,
        count: tier2Result.count,
        explanation: 'You categorized similar transactions ' + tier2Result.count + ' time(s)'
      };
    }
    
    // ═══════════════════════════════════════════════════════════════
    // TIER 3: Consult training data for general category
    // ═══════════════════════════════════════════════════════════════
    
    var tier3Result = matchAgainstTrainingData(keywords, userCategories);
    if (tier3Result) {
      Logger.log('[ML] TIER 3 Match: ' + tier3Result.category + ' (conf=' + tier3Result.confidence + ')');
      return {
        category: tier3Result.category,
        confidence: tier3Result.confidence,
        source: 'training_data',
        tier: 3,
        matchedMerchant: tier3Result.matchedMerchant,
        suggestedType: tier3Result.suggestedType,
        explanation: 'Based on ' + tier3Result.matchedMerchant + ' pattern'
      };
    }
    
    // No match found
    Logger.log('[ML] No match found for: ' + description.substring(0, 30));
    return null;
    
  } catch (e) {
    Logger.log('[WARN] getSmartMLSuggestion error: ' + e.message);
    return null;
  }
}

/**
 * TIER 1: Match transaction keywords against user's existing categories
 */
function matchAgainstUserCategories(keywords, userCategories) {
  if (!keywords || keywords.length === 0 || !userCategories || userCategories.length === 0) {
    return null;
  }
  
  var bestMatch = null;
  
  for (var i = 0; i < userCategories.length; i++) {
    var category = String(userCategories[i] || '').trim();
    if (!category) continue;
    
    // Extract words from category name
    var categoryWords = category.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').split(/\s+/).filter(function(w) {
      return w.length >= 3;
    });
    
    // Check for keyword matches
    for (var j = 0; j < keywords.length; j++) {
      var keyword = keywords[j];
      
      for (var k = 0; k < categoryWords.length; k++) {
        var catWord = categoryWords[k];
        
        // Exact word match
        if (keyword === catWord) {
          var conf = 0.90;
          if (!bestMatch || conf > bestMatch.confidence) {
            bestMatch = {
              category: category,
              confidence: conf,
              matchedKeyword: keyword
            };
          }
        }
        // Partial match (keyword contains category word or vice versa)
        else if (keyword.indexOf(catWord) !== -1 || catWord.indexOf(keyword) !== -1) {
          var conf2 = 0.75;
          if (!bestMatch || conf2 > bestMatch.confidence) {
            bestMatch = {
              category: category,
              confidence: conf2,
              matchedKeyword: keyword + '~' + catWord
            };
          }
        }
      }
    }
  }
  
  return bestMatch;
}

/**
 * TIER 2: Get suggestion from user's categorization history
 */
function getMLSuggestionFromUserHistory(normalized, type) {
  try {
    // Get ML data from cache/BACKEND
    var mlData = getMLDataForCache();
    var rules = mlData.rules || [];
    
    // Also check Script Properties
    var propsRules = getMLRulesFromProps(type);
    
    var bestMatch = null;
    
    // Check BACKEND rules - exact match
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (rule.type !== type) continue;
      
      var ruleDesc = String(rule.description || '').toUpperCase().trim();
      var count = rule.count || 1;
      
      // Exact match
      if (ruleDesc === normalized) {
        var conf = count >= 3 ? 0.95 : (count >= 2 ? 0.85 : 0.70);
        if (!bestMatch || conf > bestMatch.confidence) {
          bestMatch = {
            category: rule.category,
            confidence: conf,
            count: count,
            isBusiness: rule.catType === 'business'
          };
        }
      }
    }
    
    // Check Script Properties rules
    if (propsRules[normalized] && propsRules[normalized].count >= 2) {
      var pRule = propsRules[normalized];
      var pConf = pRule.count >= 3 ? 0.95 : 0.85;
      if (!bestMatch || pConf > bestMatch.confidence) {
        bestMatch = {
          category: pRule.category,
          confidence: pConf,
          count: pRule.count,
          isBusiness: false
        };
      }
    }
    
    // Keyword overlap matching for partial matches
    if (!bestMatch || bestMatch.confidence < 0.80) {
      var keywords = extractMLKeywords(normalized);
      if (keywords.length >= 2) {
        for (var j = 0; j < rules.length; j++) {
          var rule = rules[j];
          if (rule.type !== type || rule.count < 2) continue;
          
          var ruleKeywords = extractMLKeywords(String(rule.description || ''));
          var overlap = 0;
          for (var k = 0; k < keywords.length; k++) {
            if (ruleKeywords.indexOf(keywords[k]) !== -1) overlap++;
          }
          
          if (overlap >= 3) {
            var kwConf = 0.75;
            if (!bestMatch || kwConf > bestMatch.confidence) {
              bestMatch = {
                category: rule.category,
                confidence: kwConf,
                count: rule.count,
                isBusiness: rule.catType === 'business'
              };
            }
          } else if (overlap >= 2) {
            var kwConf2 = 0.65;
            if (!bestMatch || kwConf2 > bestMatch.confidence) {
              bestMatch = {
                category: rule.category,
                confidence: kwConf2,
                count: rule.count,
                isBusiness: rule.catType === 'business'
              };
            }
          }
        }
      }
    }
    
    return bestMatch;
    
  } catch (e) {
    Logger.log('[WARN] getMLSuggestionFromUserHistory error: ' + e.message);
    return null;
  }
}

/**
 * TIER 3: Match against training data and try to find best user category
 */
function matchAgainstTrainingData(keywords, userCategories) {
  if (!keywords || keywords.length === 0) return null;
  
  var bestMatch = null;
  
  // Check each keyword against training data
  for (var i = 0; i < keywords.length; i++) {
    var keyword = keywords[i];
    
    // Check training data lookup
    if (TRAINING_DATA_LOOKUP[keyword]) {
      var suggestedType = TRAINING_DATA_LOOKUP[keyword];
      
      // Try to find a matching user category
      var userMatch = findBestUserCategoryForType(suggestedType, userCategories);
      
      if (userMatch) {
        var conf = 0.70;
        if (!bestMatch || conf > bestMatch.confidence) {
          bestMatch = {
            category: userMatch,
            confidence: conf,
            matchedMerchant: keyword,
            suggestedType: suggestedType
          };
        }
      } else {
        // No user category match - USE the training type directly as suggestion
        // This makes Clarity more helpful even without exact category matches
        var conf2 = 0.65;
        if (!bestMatch || conf2 > bestMatch.confidence) {
          bestMatch = {
            category: suggestedType, // Use training type directly
            confidence: conf2,
            matchedMerchant: keyword,
            suggestedType: suggestedType
          };
        }
      }
    }
  }
  
  return bestMatch;
}

/**
 * Find the best user category that matches a suggested type
 * Example: suggestedType="Dining" might match user category "A Restaurants & Dining"
 */
function findBestUserCategoryForType(suggestedType, userCategories) {
  if (!suggestedType || !userCategories || userCategories.length === 0) return null;
  
  var typeUpper = suggestedType.toUpperCase();
  var typeWords = typeUpper.split(/\s+/);
  
  // Mapping of training types to common user category keywords
  var typeAliases = {
    'DINING': ['RESTAURANT', 'DINING', 'FOOD', 'MEAL', 'EAT'],
    'GROCERIES': ['GROCERY', 'GROCERIES', 'FOOD', 'SUPERMARKET', 'MARKET'],
    'GAS': ['GAS', 'FUEL', 'GASOLINE', 'AUTO'],
    'SHOPPING': ['SHOPPING', 'RETAIL', 'STORE', 'MERCHANDISE'],
    'ENTERTAINMENT': ['ENTERTAINMENT', 'FUN', 'MOVIE', 'STREAMING', 'RECREATION'],
    'UTILITIES': ['UTILITIES', 'UTILITY', 'ELECTRIC', 'WATER', 'PHONE', 'INTERNET', 'CABLE'],
    'COFFEE': ['COFFEE', 'CAFE', 'CAFETERIA'],
    'FITNESS': ['FITNESS', 'GYM', 'HEALTH', 'WORKOUT'],
    'PHARMACY': ['PHARMACY', 'DRUG', 'MEDICAL', 'HEALTH'],
    'INSURANCE': ['INSURANCE', 'COVERAGE'],
    'TRANSFER': ['TRANSFER', 'PAYMENT', 'BANKING'],
    'INCOME': ['INCOME', 'SALARY', 'PAYCHECK', 'DEPOSIT', 'PAYROLL'],
    'TRANSPORTATION': ['TRANSPORTATION', 'TRANSIT', 'RIDE', 'UBER', 'LYFT', 'TAXI'],
    'AUTO PARTS': ['AUTO', 'CAR', 'VEHICLE', 'PARTS'],
    'AUTO MAINTENANCE': ['AUTO', 'CAR', 'MAINTENANCE', 'SERVICE', 'REPAIR'],
    'SHIPPING': ['SHIPPING', 'MAIL', 'DELIVERY', 'POSTAGE'],
    'PET CARE': ['PET', 'ANIMAL', 'VET'],
    'BEAUTY': ['BEAUTY', 'COSMETICS', 'PERSONAL', 'SALON'],
    'SUBSCRIPTIONS': ['SUBSCRIPTION', 'MEMBERSHIP', 'SERVICE'],
    'SOFTWARE': ['SOFTWARE', 'APP', 'TECH', 'TECHNOLOGY'],
    'FOOD DELIVERY': ['DELIVERY', 'FOOD', 'DOORDASH', 'GRUBHUB', 'INSTACART'],
    'HOUSING': ['HOUSING', 'RENT', 'MORTGAGE', 'HOME'],
    'REFUND': ['REFUND', 'RETURN', 'CREDIT']
  };
  
  var searchWords = typeAliases[typeUpper] || typeWords;
  
  var bestMatch = null;
  var bestScore = 0;
  
  for (var i = 0; i < userCategories.length; i++) {
    var category = String(userCategories[i] || '').toUpperCase();
    var score = 0;
    
    for (var j = 0; j < searchWords.length; j++) {
      if (category.indexOf(searchWords[j]) !== -1) {
        score += 2;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = userCategories[i];
    }
  }
  
  return bestScore >= 2 ? bestMatch : null;
}

// ═══════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Normalize description for ML matching
 */
function normalizeDescriptionForML(desc) {
  var s = String(desc || '').trim().toUpperCase();
  if (!s) return '';
  
  // Remove special chars, keep alphanumeric and spaces
  s = s.replace(/[^A-Z0-9\s]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  
  return s.slice(0, 80);
}

/**
 * Extract meaningful keywords from a description
 */
function extractMLKeywords(desc) {
  var s = String(desc || '').toUpperCase();
  var words = s.replace(/[^A-Z0-9\s]/g, ' ').split(/\s+/);
  
  // Common words to ignore
  var stopWords = ['THE', 'AND', 'FOR', 'WITH', 'FROM', 'INC', 'LLC', 'CORP', 'CO', 'USA', 'US', 'MKT', 'STORE', 'PURCHASE'];
  
  return words.filter(function(w) {
    return w.length >= 3 && 
           stopWords.indexOf(w) === -1 && 
           !/^\d+$/.test(w); // Not purely numeric
  });
}

/**
 * Get suggestions for multiple transactions (batch processing)
 * Used by the modal to get suggestions for all loaded transactions
 */
function getBatchMLSuggestions(transactions, incomeCategories, expenseCategories, businessCategories) {
  var suggestions = {};
  
  try {
    for (var i = 0; i < transactions.length; i++) {
      var tx = transactions[i];
      if (!tx.row || !tx.description) continue;
      
      // Skip already categorized
      if (tx.category || tx.businessCategory) continue;
      
      var isIncome = tx.amount > 0;
      var userCats = isIncome ? incomeCategories : expenseCategories;
      
      // Get suggestion
      var suggestion = getSmartMLSuggestion(tx.description, isIncome ? 'income' : 'expense', userCats);
      
      if (suggestion && suggestion.category) {
        suggestions[tx.row] = suggestion;
      } else if (suggestion && suggestion.suggestedType) {
        // No exact match but have type suggestion
        suggestions[tx.row] = {
          category: null,
          suggestedType: suggestion.suggestedType,
          confidence: suggestion.confidence,
          source: 'training_hint',
          tier: 3,
          explanation: 'Consider creating a "' + suggestion.suggestedType + '" category'
        };
      }
    }
  } catch (e) {
    Logger.log('[WARN] getBatchMLSuggestions error: ' + e.message);
  }
  
  return suggestions;
}
