/**
 * AccountNameManager.gs
 * ─────────────────────────────────────────────────────────────────────
 * Centralised account-tab rename support for Money Mastery.
 *
 * ARCHITECTURE (Option B — Internal ID + Display Name):
 *   • Tabs are always discoverable by their POSITION (slot 1-10).
 *   • A ScriptProperties key "mm_account_tab_names" stores a JSON map
 *     { "1": "My Checking", "2": "Savings", ... } of slot → current tab name.
 *   • Default tab name for slot N = "ACCOUNT N" (e.g. "ACCOUNT 1").
 *   • When C7 is edited on an account tab the tab is renamed to the new
 *     value and the map is updated.
 *   • When C7 is cleared the tab reverts to "ACCOUNT N".
 *   • All existing code that needs a list of account tabs (for formulas,
 *     modal data, navigation, etc.) calls  getAccountTabObjects()  instead
 *     of doing its own regex scan.
 *
 * PUBLIC API
 *   getAccountTabObjects(ss?)  → [{slot, sheetName, displayName, sheet}]
 *   getAccountTabNames(ss?)    → ["My Checking","Savings",...]   (display)
 *   getAccountSheetNames(ss?)  → ["My Checking","ACCOUNT 2",...]  (tab names)
 *   findAccountSheet(name, ss?)→ Sheet|null   (by tab name OR display name)
 *   isAccountTab(sheet|name)   → boolean
 *   onEdit(e)                  → runs the C7 rename trigger
 * ─────────────────────────────────────────────────────────────────────
 */

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

var ANM_PROPS_KEY   = 'mm_account_tab_names';  // ScriptProperties key
var ANM_TOTAL_SLOTS = 10;                       // Fixed: 10 account tabs
var ANM_DEFAULT_PREFIX = 'ACCOUNT ';            // e.g. "ACCOUNT 1"
var ANM_ACCOUNT_NAME_CELL = 'C7';              // Cell holding custom name

// Max Google Sheets tab-name length
var ANM_MAX_NAME_LEN = 100;

// Characters illegal in Google Sheets tab names
var ANM_ILLEGAL_CHARS = /[:\\/\?\*\[\]]/g;

// ═══════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Load the slot→tabName map from ScriptProperties.
 * Fills missing slots with the default "ACCOUNT N" name.
 * @returns {Object} e.g. {"1":"My Checking","2":"ACCOUNT 2",...}
 */
function _anm_loadMap_() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(ANM_PROPS_KEY);
    var map = raw ? JSON.parse(raw) : {};
    // Ensure all 10 slots present
    for (var i = 1; i <= ANM_TOTAL_SLOTS; i++) {
      if (!map[String(i)]) {
        map[String(i)] = ANM_DEFAULT_PREFIX + i;
      }
    }
    return map;
  } catch (e) {
    Logger.log('[ANM] _anm_loadMap_ error: ' + e.message);
    var fallback = {};
    for (var j = 1; j <= ANM_TOTAL_SLOTS; j++) {
      fallback[String(j)] = ANM_DEFAULT_PREFIX + j;
    }
    return fallback;
  }
}

/**
 * Save the slot→tabName map to ScriptProperties.
 */
function _anm_saveMap_(map) {
  try {
    PropertiesService.getScriptProperties().setProperty(ANM_PROPS_KEY, JSON.stringify(map));
  } catch (e) {
    Logger.log('[ANM] _anm_saveMap_ error: ' + e.message);
  }
}

/**
 * Sanitise a candidate tab name:
 *   - Strip illegal characters
 *   - Truncate to ANM_MAX_NAME_LEN
 *   - Return '' if result is empty
 */
function _anm_sanitise_(name) {
  if (!name) return '';
  var s = String(name).trim().replace(ANM_ILLEGAL_CHARS, '').trim();
  if (s.length > ANM_MAX_NAME_LEN) s = s.substring(0, ANM_MAX_NAME_LEN).trim();
  return s;
}

/**
 * Make a tab name unique across all current sheet names.
 * If name is already unique, returns it unchanged.
 * Otherwise appends " 2", " 3", etc.
 */
function _anm_makeUnique_(name, ss, excludeSheet) {
  var sheets = ss.getSheets();
  var existing = sheets
    .filter(function(s) { return s.getSheetId() !== excludeSheet.getSheetId(); })
    .map(function(s) { return s.getName().toLowerCase(); });

  if (existing.indexOf(name.toLowerCase()) === -1) return name;

  var counter = 2;
  while (existing.indexOf((name + ' ' + counter).toLowerCase()) !== -1) {
    counter++;
  }
  return name + ' ' + counter;
}

/**
 * Determine the slot number (1-10) for a given sheet by scanning C7 of
 * default-named sheets OR by checking the stored map.
 * Returns 0 if not an account sheet.
 */
function _anm_getSlotForSheet_(sheet, ss, map) {
  var currentName = sheet.getName();

  // 1. Check stored map
  for (var slot = 1; slot <= ANM_TOTAL_SLOTS; slot++) {
    if (map[String(slot)] === currentName) return slot;
  }

  // 2. Fallback: check default pattern
  var m = currentName.match(/^ACCOUNT\s*(\d+)$/i);
  if (m) return parseInt(m[1]);

  return 0; // Not an account tab
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Return an array of account tab descriptor objects, sorted by slot number.
 * Each object: { slot, sheetName, displayName, sheet }
 *   slot        — 1-10
 *   sheetName   — current tab name (may be custom)
 *   displayName — C7 value if set, otherwise sheetName
 *   sheet       — Sheet object
 *
 * @param {Spreadsheet} [ss] - optional; uses active spreadsheet if omitted
 * @returns {Array<{slot:number, sheetName:string, displayName:string, sheet:Sheet}>}
 */
function getAccountTabObjects(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var map = _anm_loadMap_();
  var results = [];

  for (var slot = 1; slot <= ANM_TOTAL_SLOTS; slot++) {
    var tabName = map[String(slot)];
    var sheet = ss.getSheetByName(tabName);

    // If stored name not found, try the default name as fallback
    if (!sheet) {
      var defaultName = ANM_DEFAULT_PREFIX + slot;
      sheet = ss.getSheetByName(defaultName);
      if (sheet) {
        // Update map to current reality
        map[String(slot)] = defaultName;
        tabName = defaultName;
      }
    }

    if (!sheet) continue; // Slot doesn't exist in this spreadsheet

    // Read display name from C7
    var displayName = tabName;
    try {
      var c7 = sheet.getRange(ANM_ACCOUNT_NAME_CELL).getValue();
      if (c7 && String(c7).trim() !== '') {
        displayName = String(c7).trim();
      }
    } catch (e) { /* ignore */ }

    results.push({
      slot:        slot,
      sheetName:   tabName,
      displayName: displayName,
      sheet:       sheet
    });
  }

  // Save any map corrections back
  _anm_saveMap_(map);

  // Sort by slot
  results.sort(function(a, b) { return a.slot - b.slot; });
  return results;
}

/**
 * Return ordered array of display names (C7 value or tab name).
 * Used by navigation menu, dashboard, etc.
 */
function getAccountTabNames(ss) {
  return getAccountTabObjects(ss).map(function(a) { return a.displayName; });
}

/**
 * Return ordered array of actual tab names (what Google Sheets calls the tab).
 * Used by formulas, getSheetByName() calls, etc.
 */
function getAccountSheetNames(ss) {
  return getAccountTabObjects(ss).map(function(a) { return a.sheetName; });
}

/**
 * Find an account Sheet by either its current tab name OR its display name (C7).
 * Returns null if not found.
 */
function findAccountSheet(name, ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  if (!name) return null;

  var nameLower = String(name).toLowerCase().trim();
  var tabs = getAccountTabObjects(ss);

  for (var i = 0; i < tabs.length; i++) {
    if (tabs[i].sheetName.toLowerCase() === nameLower) return tabs[i].sheet;
    if (tabs[i].displayName.toLowerCase() === nameLower) return tabs[i].sheet;
  }

  // Last resort: direct getSheetByName
  return ss.getSheetByName(name);
}

/**
 * Check whether a sheet (by Sheet object or name string) is one of the 10
 * account tabs — regardless of whether it has been renamed.
 */
function isAccountTab(sheetOrName, ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var name = (typeof sheetOrName === 'string') ? sheetOrName : sheetOrName.getName();
  var nameLower = name.toLowerCase().trim();

  // Quick check: default pattern still works
  if (/^account\s*\d+$/i.test(name)) return true;

  // Check stored map
  var map = _anm_loadMap_();
  for (var slot = 1; slot <= ANM_TOTAL_SLOTS; slot++) {
    if (map[String(slot)].toLowerCase() === nameLower) return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════
// C7 EDIT TRIGGER  (simple trigger — no deployment required)
// ═══════════════════════════════════════════════════════════════════

/**
 * onEdit simple trigger.
 * Fires on every edit. Only acts when the edited cell is C7 on an account tab.
 *
 * Flow:
 *  1. Check the edited cell is C7.
 *  2. Check the sheet is an account tab (by stored map or default pattern).
 *  3. Read + sanitise new C7 value.
 *  4. If empty → revert tab name to "ACCOUNT N".
 *  5. If non-empty → rename tab, ensure uniqueness, update map.
 *  6. Clear caches so next navigation/dashboard load sees new name.
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return;

    var range = e.range;

    // ── Only act on C7 ──────────────────────────────────────────────
    if (range.getRow() !== 7 || range.getColumn() !== 3) return;

    var sheet = range.getSheet();
    var ss    = sheet.getSpreadsheet();

    // ── Only act on account tabs ────────────────────────────────────
    var map  = _anm_loadMap_();
    var slot = _anm_getSlotForSheet_(sheet, ss, map);
    if (slot === 0) return; // Not an account tab

    var currentTabName = sheet.getName();
    var defaultName    = ANM_DEFAULT_PREFIX + slot; // e.g. "ACCOUNT 3"
    var newValue       = String(range.getValue() || '').trim();
    var sanitised      = _anm_sanitise_(newValue);

    var targetName;

    if (sanitised === '') {
      // C7 cleared → revert to default
      targetName = defaultName;
    } else {
      // Make unique (exclude the current sheet from collision check)
      targetName = _anm_makeUnique_(sanitised, ss, sheet);
    }

    // Only rename if actually different
    if (currentTabName !== targetName) {
      sheet.setName(targetName);
      Logger.log('[ANM] Renamed tab "' + currentTabName + '" → "' + targetName + '" (slot ' + slot + ')');
    }

    // Update map
    map[String(slot)] = targetName;
    _anm_saveMap_(map);

    // Clear navigation cache so menu reflects new name
    _anm_clearNavigationCache_();

  } catch (err) {
    // Never surface errors to the user from a simple trigger
    Logger.log('[ANM] onEdit error: ' + err.message);
  }
}

/**
 * Clear navigation + dashboard caches so renamed accounts appear immediately
 * on next menu/dashboard open.
 */
function _anm_clearNavigationCache_() {
  try {
    // Navigation cache (from Navigation.gs _navPutCache)
    var userCache = CacheService.getUserCache();
    userCache.removeAll([
      'nav_account_names_v2',
      'mm_dashboard_30days',
      'mm_dashboard_90days',
      'mm_dashboard_year',
      'mm_dashboard_all'
    ]);
  } catch (e) {
    Logger.log('[ANM] clearNavigationCache error: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// ADMIN UTILITIES
// ═══════════════════════════════════════════════════════════════════

/**
 * Rebuild the entire slot map by scanning the spreadsheet.
 * Call this once if tabs were renamed outside of C7 (e.g. manually).
 * Logs what it found.
 */
function rebuildAccountNameMap() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var map  = {};

  // First pass: default-named tabs
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    var m    = name.match(/^ACCOUNT\s*(\d+)$/i);
    if (m) {
      var slot = parseInt(m[1]);
      if (slot >= 1 && slot <= ANM_TOTAL_SLOTS) {
        map[String(slot)] = name;
      }
    }
  }

  // Second pass: tabs that don't match default but have C7 data and a
  // neighbouring slot-cell (D7 or elsewhere) — we can't reliably detect
  // these without extra metadata, so we leave them as defaults.

  // Fill missing slots
  for (var s = 1; s <= ANM_TOTAL_SLOTS; s++) {
    if (!map[String(s)]) {
      map[String(s)] = ANM_DEFAULT_PREFIX + s;
    }
  }

  _anm_saveMap_(map);
  Logger.log('[ANM] rebuildAccountNameMap complete: ' + JSON.stringify(map));
  return map;
}

/**
 * Diagnostic: log the current slot→tabName map.
 */
function logAccountNameMap() {
  var map = _anm_loadMap_();
  Logger.log('[ANM] Current account name map:');
  for (var slot = 1; slot <= ANM_TOTAL_SLOTS; slot++) {
    Logger.log('  Slot ' + slot + ' → "' + map[String(slot)] + '"');
  }
  return map;
}
