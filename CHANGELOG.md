# Categorization System V2.0 - Changelog

## Money Mastery Financial Management System
**Donna Roggio LLC**  
**Repository:** https://github.com/donnaroggio1111-creator/mm-system

---

## Version 2.0.2 - January 16, 2026

### Bank Sync Disabled - Manual Entry Only

**Money Mastery now uses MANUAL TRANSACTION ENTRY only.**
All bank sync integrations (Plaid, Stripe, Teller) have been disabled.

**Updated Files:**
- `Config.gs` - STRIPE_CONFIG and TELLER_CONFIG deprecated
- `AdminControls.gs` - ADMIN_SetStripeApiKey deprecated, added ADMIN_ShowSystemConfig
- `Welcome.gs` - All bank sync references removed
- `RegistrationFlow.html` - Removed Stripe option, simplified to manual entry info
- `StripeConfig.html` - Replaced with manual entry notice
- `TEST_ALL_FEATURES.gs` - Removed bank sync tests
- `TEST_FUNCTIONS.gs` - Added TEST_ACCOUNT_SHEETS, deprecated bank tests

**How to Enter Transactions:**
1. Go to any ACCOUNT sheet (ACCOUNT 1, ACCOUNT 2, etc.)
2. Enter transactions starting at row 11
3. Use columns: Date (C), Description (D), Amount (E)
4. Categorize using the Categorization modal

---

## Version 2.0.1 - January 16, 2026

### Plaid Deprecation - Complete Removal

All active Plaid code has been deprecated with stub functions.

**Updated Files:**
- `Welcome.gs` - All Plaid functions deprecated
- `TEST_ALL_FEATURES.gs` - Removed Plaid tests
- `TEST_FUNCTIONS.gs` - Added manual entry tests
- `PerformanceOptimizations.gs` - Plaid functions deprecated

**Transaction Entry: Manual Only**
- No Plaid
- No Stripe
- No Teller
- Enter transactions directly in ACCOUNT sheets

---

## Version 2.0.0 - January 2026

### Major Changes

#### 🏗️ Architecture Overhaul

**ColumnConfig.gs - Single Source of Truth**
- Created centralized column definitions in `MM_COLS` constant
- Standardized column layout across all ACCOUNT sheets:
  - `C (3)` - DATE: Transaction date
  - `D (4)` - DESCRIPTION: Transaction description
  - `E (5)` - AMOUNT: Transaction amount (+income, -expense)
  - `F (6)` - CATEGORY: Personal category (expense/income based on amount sign)
  - `G (7)` - SPECIAL_LABEL: Special labels (Ignore, Transfer, CC Payment)
  - `H (8)` - MEMO: User notes
  - `I (9)` - NEED_DESIRE: Need/Desire dropdown
  - `J (10)` - SPLIT_DATA: JSON split transaction data
  - `K (11)` - RECEIPT: Google Drive link to receipt
  - `L (12)` - CORRECTION: Correction flag
- Header row: 10
- Data starts: Row 11

#### 🚫 Plaid Integration Removed

**Deprecated Files Removed:**
- `TEST_PLAID_INTEGRATION.gs` - Deleted
- `DEPLOY_CLEAN_PLAID.gs` - Deleted
- `LIST_FILES_TO_DELETE.gs` - Deleted

**Updated Files (Plaid references removed):**
- `Config.gs` - PLAID_CONFIG now deprecated stub
- `AdminControls.gs` - Plaid admin functions now show deprecation notice
- `Diagnostics.gs` - Removed Plaid-specific diagnostics
- `LoadingScreens.gs` - Replaced LOADING_ConnectingToPlaid with LOADING_ConnectingToBank
- `RegistrationFlow.html` - Replaced Plaid bank setup with Stripe/Manual options
- `NavigationHelpers.gs` - Removed Plaid success message, added generic bank success
- `ErrorReporting.gs` - Updated retry logic for non-Plaid architecture

**Migration Path:**
- Bank connections now use Stripe Financial Connections only
- Use `ADMIN_ShowStripeConfig()` for current configuration
- Legacy Plaid function calls redirect to deprecation notices

#### 🔐 Security Improvements

**API Key Management:**
- Stripe API key now stored in Script Properties, not code
- Added secure key management functions:
  - `ADMIN_SetStripeApiKey()` - Set Stripe key securely
  - `ADMIN_SetResendApiKey()` - Set Resend email key securely
  - `ADMIN_ViewApiKeyStatus()` - View key configuration status
  - `ADMIN_ClearApiKeys()` - Clear all keys for rotation

**Local Key Store:**
- All user data stored locally in sheet (no external backend calls)
- PIN hashes stored in UserProperties + DocumentProperties
- Access keys validated against local store

#### 📊 Special Labels Integration

**New Special Labels:**
- `Ignore` - Exclude from all totals (color: gray #808080)
- `Transfer` - Internal transfers (color: blue #4169E1)
- `CC Payment` - Credit card payments (color: purple #9370DB)

**Dashboard Integration:**
- `MM_computeDashboardData()` now excludes Special Label transactions from totals
- `Welcome.gs` updated with `MM_readTransactionSheetMonthly_` special label detection
- YEARLY OVERVIEW calculations properly exclude special labels

### Updated Files Summary

| File | Changes |
|------|---------|
| `ColumnConfig.gs` | **NEW** - Single source of truth for columns |
| `Config.gs` | Column aliases, deprecated PLAID_CONFIG, secure API key getter |
| `CategorizationSystem.gs` | Added reference to ColumnConfig.gs |
| `Categories.gs` | Added reference to ColumnConfig.gs |
| `CategoryLoader.gs` | Header documentation update |
| `Learning.gs` | Added LEARN_COLS fallback to MM_COLS |
| `DuplicateDetection.gs` | Updated to use MM_COLS |
| `Code.gs` | Header documentation update |
| `Menus.gs` | Removed Plaid admin menu items |
| `Welcome.gs` | Special Labels exclusion in dashboard |
| `AdminControls.gs` | Deprecated Plaid functions, added API key management |
| `Diagnostics.gs` | Removed Plaid diagnostics, added ColumnConfig checks |
| `LoadingScreens.gs` | Renamed Plaid loading screen |
| `RegistrationFlow.html` | Replaced Plaid with Stripe/Manual options |
| `NavigationHelpers.gs` | Removed Plaid references, added generic helpers |
| `ErrorReporting.gs` | Updated retry logic, removed Plaid contexts |

### Deployment Steps

#### Prerequisites
1. Ensure you have write access to the mm-system repository
2. Have a backup of your current Google Apps Script project

#### Deployment Process

1. **Pull Latest Code:**
   ```bash
   git clone https://github.com/donnaroggio1111-creator/mm-system.git
   cd mm-system
   git checkout main
   ```

2. **Push to Google Apps Script:**
   - Open your Google Sheet
   - Go to Extensions → Apps Script
   - Replace file contents with corresponding .gs and .html files
   - Or use `clasp push` if configured

3. **Configure API Keys:**
   - Run `ADMIN_SetStripeApiKey()` to configure Stripe
   - Run `ADMIN_SetResendApiKey()` to configure email sending
   - Verify with `ADMIN_ViewApiKeyStatus()`

4. **Verify Installation:**
   - Run `COMPLETE_DIAGNOSTIC()` from Diagnostics.gs
   - Check that ColumnConfig is available
   - Verify Special Labels are working

#### Rollback Plan

If issues occur:
1. Restore previous .gs files from backup
2. Or use git to checkout previous version:
   ```bash
   git checkout HEAD~1
   ```
3. Push restored files to Apps Script

### Known Issues & Limitations

1. **Tutorial Video:** `TUTORIAL_VIDEO` and `STRIPE_SETUP_VIDEO` in Config.gs are still placeholders
2. **ML System:** `ML_System.gs` and `MLSystem.gs` need audit for new column alignment
3. **Reports:** `ReportsSystem.gs` needs update for Special Labels support

### Migration from v1.x

If upgrading from previous version with old column layout:

1. **Data Migration:**
   - Existing data in columns F-K may need to shift
   - Review existing categorizations before migration
   - Consider running migration script (to be provided)

2. **Category Cache:**
   - Clear category caches: `clearCategoryCache()`
   - Allow system to rebuild caches on next load

3. **User Re-authentication:**
   - Users may need to re-enter PIN on first login
   - PIN data is preserved in new storage locations

---

## Previous Versions

### v1.x (2025)
- Initial Plaid integration
- Basic categorization system
- Original column layout

---

## Support

**Email:** support@risingandthriving.com  
**Documentation:** https://risingandthriving.com/help

---

*Last Updated: January 2026*
