# Money Mastery System - Update Log

This folder contains the documentation for the complete system overhaul executed on December 31, 2025.

## Contents

1.  **[00_Master_Log.md](00_Master_Log.md)**
    *   Executive summary of the critical failures found.
    *   High-level architecture of the "Server-Side Cache" solution.
    *   Guide for Admin initialization.

2.  **[01_Architecture_and_Fixes.md](01_Architecture_and_Fixes.md)**
    *   Detailed breakdown of the code refactoring.
    *   Explanation of the "Logic vs UI" separation in `Admin.gs`.
    *   Specifics on race condition fixes in `Welcome.gs`.

3.  **[02_Final_Stabilization.md](02_Final_Stabilization.md)**
    *   Results of the 10-cycle stress testing.
    *   Verification of the Guest Invitation limits.
    *   Final confirmation of Business/Personal data segregation.

## How to Resume Work (For Future AI)

If you are picking up this project, please note:

*   **Authentication:** Do NOT try to connect `UrlFetchApp` or `openById` inside user-facing triggers (`onOpen`, `onEdit`, etc.). Use the local cache in `ScriptProperties` (`MM_verifyAccessKey` in `Welcome.gs`).
*   **Dashboard:** The dashboard modal logic relies on **direct replacement**. Do not add `google.script.host.close()` before opening a new modal; it kills the script execution context prematurely.
*   **Business Logic:** Always check Column H ("Business Category") when summing expenses. It must be mutually exclusive from Personal Expenses (Column F).

**Current State:** 🟢 Stable / Production Ready
