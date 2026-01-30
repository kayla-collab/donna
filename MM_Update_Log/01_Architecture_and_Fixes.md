# MM - Update Log: Code Architecture & Fixes
**Date:** December 31, 2025
**Phase:** 1 - Architecture Implementation & Fixes

---

## 1. Overview of Changes
This phase focused on correcting fundamental architectural flaws where backend code was attempting to call UI functions directly, and fixing race conditions in the authentication flow.

### Core Architectural Fixes
1.  **Logic vs. UI Separation in `Admin.gs`:**
    *   Split `ADMIN_syncAccessKeys` into a pure logic function `_impl_syncAccessKeys_` and a UI wrapper `ADMIN_syncAccessKeys`.
    *   **Reason:** Prevents `Cannot call SpreadsheetApp.getUi()` errors when functions are run from non-UI contexts (triggers, API).
2.  **Dashboard Opening Reliability:**
    *   Updated `MM_showLoginGate_` in `Welcome.gs` to remove the race condition where the modal closed before the dashboard command executed.
    *   **Fix:** Removed `google.script.host.close()` and replaced it with a direct call to `MM_showDashboard()`, allowing the new modal to seamlessly replace the old one.
3.  **Defensive UI Calls:**
    *   Wrapped all `SpreadsheetApp.getUi()` calls in try/catch blocks to ensure silent failure (logging only) instead of script crashes if run from a trigger.

### Specific File Changes

#### `Admin.gs`
*   **Refactored** `ADMIN_syncAccessKeys` to use the Logic/UI separation pattern.
*   **Added** `_impl_syncAccessKeys_` which returns a result object instead of showing alerts.

#### `Welcome.gs`
*   **Fixed** Race condition in `verifyPin` (Login Gate):
    ```javascript
    // Before:
    setTimeout(function() {
      google.script.host.close(); // Closed prematurely
      google.script.run.MM_showDashboard();
    }, 800);

    // After:
    setTimeout(function() {
      // Direct transition - system handles replacement
      google.script.run.MM_showDashboard(); 
    }, 800);
    ```
*   **Fixed** `MM_readTransactionSheetMonthly_`:
    *   Confirmed logic to strictly segregate Business vs Personal expenses.
    *   `if (isBusiness) { ... } else { totalAmount += ... }` ensuring Business items do not pollute personal totals.

#### `Code.gs`
*   **Updated** `MM_showDashboard` to catch UI errors gracefully.

#### `StartHere.gs`
*   **Updated** `onStartHereClick` to verify function existence before calling, preventing "undefined function" errors if the library isn't fully loaded.

---

## 2. Test Plan for Next Phase
Now that the code is architecturally sound, we proceed to 10-cycle testing.

### Scenario A: New User
*   **Input:** Click Start Here -> Auth -> Key "MM-123456"
*   **Expected:** Registration success, Dashboard opens.

### Scenario B: Returning User
*   **Input:** Click Start Here -> Auth -> Enter PIN
*   **Expected:** Dashboard opens immediately.

### Scenario C: Dashboard Data
*   **Input:** Open Dashboard -> Check "Monthly Expenses"
*   **Verify:** Amount matches ONLY Personal columns (F), excluding Business (H).

---

**Status:** Code Implementation Complete. Proceeding to Testing Verification.
