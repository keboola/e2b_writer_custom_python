# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-10-17

Initial release of kbc-e2b-writer: Chrome extension and Python script for integrating Keboola Connection with e2b sandboxes.

### Chrome Extension

#### Added
- **Manifest V3 Extension** with service workers for modern Chrome compatibility
- **Conditional UI Injection** - Only activates when `e2b: true` exists in User Parameters
- **Configuration Panel** with Shadow DOM isolation
  - e2b API key input (auto-encrypted by Keboola with `#` prefix)
  - Sandbox template selection (default: code-interpreter, or custom)
  - Timeout configuration (default: 1800 seconds / 30 minutes)
  - Log level selector (INFO, WARNING, ERROR, DEBUG)
  - Self-test mode toggle for sandbox diagnostics
- **One-Click Initialization** of Python environment and Git repository
  - Automatically selects Python 3.13
  - Configures Git repository mode
  - Sets repository URL: `https://github.com/keboola/e2b_writer_custom_python`
  - Uses default branch `main` and script `main.py`
  - Automatically clicks Save button to persist configuration
- **UI Simplification** - Automatically hides unnecessary sections
  - Configuration Description
  - Table Output Mapping
  - File Output Mapping
  - Variables
  - Processors
  - Python Version radio buttons (kept in DOM for programmatic access)
  - Source Code radio buttons (kept in DOM for programmatic access)
- **User Parameters Notice** - Blue info box explaining e2b parameter management
- **e2b Integration Button**
  - Positioned at top of action panel (above RUN COMPONENT button)
  - e2b brand orange (#ff8800) background with white text
  - 40px height matching Keboola's button sizing
  - Hover effect darkens to #e67a00 with enhanced shadow
- **Component Icon Replacement**
  - Replaces Custom Python icon with e2b black star logo
  - Orange background (#ff8800) matching e2b brand
  - Removes conflicting CSS classes with `!important` override
- **CodeMirror Integration** via inject-helper.js
  - Access to User Parameters JSON editor
  - getValue() and setValue() methods
  - CustomEvent-based communication between contexts
- **Service Worker** for API token capture and CORS proxying
  - Captures Keboola API tokens from HTTP headers
  - Stores tokens in chrome.storage.session (cleared on browser close)
- **SPA Navigation Support** via MutationObserver and popstate listeners

### Python Script (main.py)

#### Added
- **Dual-Mode API Key Loading**
  - Keboola mode: Reads `#e2b_api_key` from user parameters via CommonInterface
  - Local mode: Falls back to `E2B_API_KEY` environment variable
  - Automatic mode detection with clear logging
- **e2b Sandbox Management**
  - Sandbox.create() for ephemeral environment creation
  - sandbox.run_code() for Python code execution in sandbox
  - sandbox.kill() for proper cleanup
  - Sandbox ID tracking and logging
- **Self-Test Mode** with 5 diagnostic tests
  - Basic arithmetic test
  - String manipulation test
  - Data structure (list/dict) test
  - Exception handling test
  - Multi-line code execution test
  - Comprehensive pass/fail reporting with timing
- **Input Mapping Integration**
  - Reads table configurations via CommonInterface
  - Object-based property access (table.destination, table_def.full_path)
  - Automatic CSV file discovery in /data/in/tables/
  - File metadata logging (path, columns, size)
- **CSV File Transfer to e2b Sandbox**
  - Reads CSV content from materialized Keboola files
  - Uploads to sandbox at /tmp/{table_name}
  - Verification with file size confirmation
  - Transfer timing and progress logging
- **Comprehensive DEBUG Logging**
  - Configurable log levels via user parameters (INFO, WARNING, ERROR, DEBUG)
  - Data directory inspection and file listing
  - Table configuration and definition logging
  - Sandbox execution tracking (start, complete, output lengths)
  - Transfer timing with human-readable duration formatting
  - Structured error context with logging.exception()
  - Suppresses noisy httpx/httpcore/e2b library logs (except in DEBUG mode)
- **Professional Error Handling**
  - Try/catch blocks at each stage (sandbox creation, table processing, file transfer)
  - Detailed exception logging with context (table names, indexes, sandbox IDs)
  - Clear error messages ("Input data processing failed", etc.)
  - Proper exit codes (sys.exit(1) on failure)
- **Local Testing Support**
  - setup_and_test.sh for automated environment setup
  - requirements.txt with e2b-code-interpreter dependency
  - .env file support for E2B_API_KEY
  - TEST_README.md with troubleshooting guide

### Development Tools

#### Added
- **Local Testing Scripts**
  - `tools/setup_and_test.sh` - Automated venv setup and testing
  - `.env.example` - Template for environment variables
  - `TEST_README.md` - Comprehensive local testing guide
- **Documentation**
  - `CLAUDE.md` - AI assistant development guide
  - `README.md` - Project overview and research notes
  - `chrome-extension/README.md` - Extension installation and debugging
  - `docs/plan/` - Complete planning documentation
    - chrome-extension-plan.md - Technical specification
    - page-structure-analysis.md - Keboola UI DOM analysis
    - implementation-quick-start.md - Step-by-step guide
    - workflow-diagrams.md - ASCII workflow diagrams

### Technical Specifications

- **Chrome Extension**
  - Manifest Version: 3
  - Browser: Chrome/Chromium
  - UI Framework: Vanilla JavaScript with Shadow DOM
  - Storage: chrome.storage.session for tokens

- **Python Script**
  - Python Version: 3.13
  - Dependencies: e2b-code-interpreter, keboola-component
  - Deployment: GitHub repository (branch: fix/keboola-api-key-integration)
  - Execution: Keboola Custom Python component

### Configuration

Default configuration values:
- **e2b_template**: "code-interpreter" (e2b's default Python sandbox)
- **e2b_timeout**: 1800 seconds (30 minutes)
- **log_level**: "INFO" (can be changed to DEBUG for troubleshooting)
- **selftest**: false (set to true for sandbox diagnostics)

### Known Limitations

- Extension requires `e2b: true` in User Parameters to activate
- Component icon replacement may take a moment on slow networks
- Python Version and Source Code sections are hidden but kept in DOM for programmatic access
- Branch and Script Filename fields use defaults (user can manually click "List Branches" if needed)
- Changes to main.py require commit and push to GitHub before Keboola can use them

### Security

- API keys automatically encrypted by Keboola when prefixed with `#`
- Keboola API tokens stored in session storage (cleared on browser close)
- No secrets logged to console or files
- Sensitive values filtered from debug output

---

## Development History

This release represents the completion of Phases 0-3:
- **Phase 0**: Planning and research
- **Phase 1**: Foundation (URL detection, UI injection)
- **Phase 2**: Configuration management (e2b settings, Git initialization)
- **Phase 3**: Input Mapping and data transfer (CSV to sandbox)

**Next**: Phase 4 will focus on output table mapping, file input/output support, and advanced error handling.

[0.1.0]: https://github.com/keboola/e2b_writer_custom_python/tree/fix/keboola-api-key-integration
