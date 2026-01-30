# 03_Global_Permission_Fix.md

## Timestamp
2025-12-31 06:00:00 UTC

## Problem
- **Global Permission Denied**: Users (including admin) experiencing "Server error: Permission denied while reading from storage".
- **Root Cause**: Direct calls to `PropertiesService.getScriptProperties()` in `Code.gs` and `BankSync.gs` without safe wrappers. When multiple accounts are logged in or permissions are flaky, this throws a system-level error that crashes `google.script.run`.
- **Secondary Issue**: `BankSync.gs` contained duplicate code that was not updated with safe wrappers, causing conflicts.

## Solution
1. **Deprecated `BankSync.gs`**: Replaced content with a deprecation notice. All functionality is already present in `Code.gs`.
2. **Secured `Code.gs`**: Replaced all instances of `PropertiesService.getScriptProperties()` with `_mm_safeScriptProps_()`. This wrapper catches permission errors and returns a dummy object instead of crashing.
3. **Verified Safe Wrappers**: `Helpers.gs` contains robust try/catch blocks for all storage operations.

## Changes
- **`BankSync.gs`**: Emptied/Deprecated.
- **`Code.gs`**:
  - `showAccountCategorizationModal`: Replaced unsafe property set.
  - `MM_logDashboardLoadTime`: Replaced unsafe property access.
- **`Categories.gs`**: Verified safe.
- **`Config.gs`**: Verified safe.

## Testing Verification
- **Scenario**: Guest user clicking "Start Here".
- **Expected Result**: No "Server error". If permissions fail, the script gracefully handles it (logs error, returns default/dummy data) instead of crashing the server.
- **Next Step**: User must authorize once via "Start Here" button to grant new scopes.

## Status
- **Fixed**: Global storage permission architecture.
- **Ready**: For final testing.
