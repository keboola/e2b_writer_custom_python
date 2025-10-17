# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**kbc-e2b-writer** is a Chrome extension that integrates Keboola Connection's Custom Python component with e2b (ephemeral sandbox environments). It enables users to:
- One-click initialization of Python environment (3.13) and Git repository configuration
- Upload files from browser to both Keboola Storage and e2b sandboxes
- Configure e2b parameters (API key, template, timeout) directly in Keboola UI
- Execute Python code in isolated e2b environments
- Synchronize configuration with Keboola component parameters

## Technology Stack

- **Chrome Extension**: Manifest V3 with service workers
- **UI**: Vanilla JavaScript with Shadow DOM (no frameworks)
- **APIs**: Keboola Storage API, e2b API
- **Storage**: `chrome.storage.session` for sensitive data (API tokens)

## Development Commands

### Chrome Extension Development

**Load extension:**
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select `chrome-extension/` directory

**Reload after changes:**
- Go to `chrome://extensions/`
- Click reload icon (↻) on the extension card

**View logs:**
- **Content script**: Right-click page → Inspect → Console (look for `[e2b Extension]`)
- **Service worker**: `chrome://extensions/` → "Inspect views: service worker"

### Testing

**Test URL:**
```
https://connection.eu-central-1.keboola.com/admin/projects/33/components/kds-team.app-custom-python/{configId}
```

The extension only injects UI when `e2b: true` exists in the User Parameters JSON editor.

### Local Python Development

**Setup and test e2b integration locally:**
```bash
# Set your e2b API key in .env file
echo "E2B_API_KEY=your-key-here" > .env

# Run automated setup and test
./setup_and_test.sh
```

**Files:**
- `main.py` - Local e2b sandbox test script with 4 test cases
- `setup_and_test.sh` - Automated setup (venv, dependencies, tests)
- `requirements.txt` - Python dependencies (e2b-code-interpreter)
- `.env` - Environment variables (E2B_API_KEY)
- `TEST_README.md` - Comprehensive local testing guide

## Architecture

### File Structure

```
kbc-e2b-writer/
├── chrome-extension/
│   ├── manifest.json               # Extension manifest (V3)
│   ├── background/
│   │   └── service-worker.js      # API proxy, token capture
│   ├── content/
│   │   ├── content-script.js      # Main injection logic
│   │   └── inject-helper.js       # Page context helper (CodeMirror access)
│   └── assets/icons/              # Extension icons
├── main.py                         # Local e2b sandbox test script
├── requirements.txt                # Python dependencies
├── setup_and_test.sh              # Automated local setup/test
├── .env                           # Environment variables (not in git)
├── .env.example                   # Environment template
└── TEST_README.md                 # Local testing guide
```

### Key Components

**service-worker.js** (chrome-extension/background/service-worker.js)
- Proxies API calls to avoid CORS issues
- Captures Keboola API tokens from HTTP headers via `chrome.webRequest`
- Stores tokens in `chrome.storage.session` (cleared on browser close)

**content-script.js** (chrome-extension/content/content-script.js)
- Detects Custom Python component pages via URL pattern matching
- Checks if `e2b: true` exists in User Parameters before injecting UI
- Injects "e2b Integration" button into Keboola action panel
- Creates configuration modal using Shadow DOM for style isolation
- **UI Simplification** (`hideUnnecessarySections()`): Automatically hides unnecessary sections:
  - Configuration Description (collapsible box)
  - Table Output Mapping
  - File Output Mapping
  - Variables
  - Adds informational notice above User Parameters
  - Attempts to replace Python Version section with simple message
  - Attempts to hide Source Code radio buttons (keep only Git settings)
- **Initialization Feature** (lines 495-612): One-click setup that:
  - Selects Python 3.13 environment
  - Configures Git repository mode
  - Sets repo URL: `https://github.com/keboola/e2b_writer_custom_python`
  - Sets branch to `main` and script filename to `main.py` (defaults)
  - Automatically clicks Save button to persist configuration
- Handles SPA navigation via `MutationObserver`

**inject-helper.js** (chrome-extension/content/inject-helper.js)
- Runs in page context (not isolated) to access CodeMirror editors
- Communicates with content script via `CustomEvent`
- Provides `getValue()` and `setValue()` for User Parameters editor

### Critical Integration Points

**URL Pattern:**
```
https://connection.{stack}.keboola.com/admin/projects/{projectId}/components/kds-team.app-custom-python/{configId}
```

**UI Injection Location:**
Right-side action panel, after "Debug mode" button

**Configuration Parameter Schema:**
```json
{
  "e2b": true,                           // Feature flag (required for injection)
  "#e2b_api_key": "encrypted_key",       // Auto-encrypted by Keboola
  "e2b_template": "code-interpreter",    // Always defined: "code-interpreter" (default) or custom template ID
  "e2b_timeout": 1800                    // Seconds (default: 30 min)
}
```

**Important:** The `e2b_template` parameter is ALWAYS defined with a concrete value. When users select "Default" in the UI, it stores `"code-interpreter"` (not an empty string), as these parameters become environment variables for the Python script using the e2b SDK.

### Data Flow

**Extension Configuration:**
1. **Extension loads** → Service worker captures Keboola API token from HTTP headers
2. **User visits config page** → Content script checks for `e2b: true` in User Parameters
3. **If enabled** → Button injected into action panel
4. **User clicks button** → Modal opens, loads current config from CodeMirror
5. **User configures** → Extension updates User Parameters JSON
6. **Extension clicks Save** → Configuration persisted to Keboola

**Initialization Flow:**
1. **User clicks "Initialize Python & Git Configuration"** → Extension manipulates DOM
2. **Python 3.13 selected** → Radio button clicked programmatically
3. **Git repository mode enabled** → Radio button clicked
4. **Git settings populated:**
   - Repository URL: `https://github.com/keboola/e2b_writer_custom_python`
   - Access: Public
   - Branch: `main` (default - not explicitly set)
   - Script: `main.py` (default - not explicitly set)
5. **Extension automatically clicks Save** → Configuration persisted

### CodeMirror Access Pattern

The extension uses a two-step approach to access Keboola's User Parameters editor:

1. **Content script** injects `inject-helper.js` into page context
2. **Helper script** accesses `document.querySelectorAll('.CodeMirror')` to find editors
3. Communication via `CustomEvent`: `e2b-get-value`, `e2b-set-value`, `e2b-cm-value`, `e2b-cm-set`

This pattern bypasses content script isolation to access page-level JavaScript objects.

## API Integration

### Keboola Storage API

**Base URL:** `https://connection.{stack}.keboola.com/v2/storage/`

**Authentication:** `X-StorageApi-Token` header (auto-captured by service worker)

**Endpoints:**
- `GET /components/{componentId}/configs/{configId}` - Get configuration
- `PATCH /components/{componentId}/configs/{configId}` - Update configuration
- `POST /files/prepare` - Prepare file upload (returns signed URL)

**Rate limits:** 20 req/sec, burst 180

### e2b API

**Base URL:** `https://api.e2b.dev/`

**Authentication:** `Authorization: Bearer {e2b_api_key}`

**Note:** Direct browser calls may be blocked by CORS; use service worker proxy if needed.

## Security Considerations

1. **API Key Encryption**: Keboola auto-encrypts parameters prefixed with `#`
   - Store as `#e2b_api_key` → becomes `KBC::ProjectSecure::...`

2. **Token Storage**: Keboola tokens stored in `chrome.storage.session` (cleared on close)

3. **Never log secrets**: Filter sensitive values from console logs

4. **Content Security Policy**: Shadow DOM prevents XSS from page styles

## Implementation Phases

**Phase 0: Planning** ✅ (Complete)
- Research, planning documents in `/docs/plan/`

**Phase 1: Foundation** ✅ (Complete)
- URL detection, UI injection, basic config panel

**Phase 2: Configuration Management** ✅ (Complete)
- e2b settings, Keboola parameter sync, encryption handling
- One-click initialization (Python 3.13 + Git repo configuration)
- Local development environment (main.py, testing scripts)

**Phase 3: Input Mapping & Data Transfer** ✅ (Complete)
- Keboola Input Mapping integration via CommonInterface
- Automatic CSV file transfer to e2b sandboxes
- Comprehensive DEBUG logging with timing and error tracking
- Object-based table access (table.destination, table_def.full_path)

**Phase 4: Advanced Features** (Planned)
- Output table mapping
- File input/output support
- Sandbox lifecycle management
- Advanced error handling and retry logic

## Known Issues & Design Decisions

1. **UI Simplification**: Extension automatically hides unnecessary sections to streamline the interface
   - **Hidden sections:** Configuration Description, Table Output Mapping, File Output Mapping, Variables, Processors
   - **Python Version section:** Radio buttons hidden off-screen (position: absolute; left: -9999px) with informational message "Python Environment: Managed by e2b Integration" shown instead
   - **Source Code radio buttons:** Hidden off-screen to prevent switching between Git and inline code
   - **User Parameters notice:** Blue info box added above editor explaining parameters are managed via e2b Integration panel
   - **Key design decision:** Elements are hidden visually but kept in the DOM so the initialization function can still interact with them programmatically (e.g., clicking Python 3.13 radio button)
   - Rationale: Reduce UI clutter, focus user attention on e2b-relevant settings, while maintaining full programmatic control
   - Implementation: Uses `position: absolute; left: -9999px; visibility: hidden;` instead of `display: none` or innerHTML replacement (content-script.js:1088-1203)

2. **Conditional Injection**: Extension only injects UI when `e2b: true` exists in User Parameters
   - Rationale: Avoid clutter for users not using e2b integration

3. **Python Version**: Configured to use Python 3.13
   - Rationale: Latest stable Python version with improved performance
   - Location: Initialization function (content-script.js:545-547)

4. **Template Parameter Always Defined**: `e2b_template` is always stored with a concrete value
   - When "Default" is selected: stores `"code-interpreter"`
   - When custom template is entered: stores the custom template ID
   - Rationale: User Parameters become environment variables for Python scripts using e2b SDK

5. **Branch Field Detection**: Simplified to use defaults
   - Branch and Script Filename default to "main" and "main.py"
   - Users can manually click "List Branches" / "List Files" if needed
   - Rationale: Avoided complex DOM manipulation with React Select components

6. **CodeMirror Detection**: Helper script finds editor by checking if content includes `"debug"` or `"e2b"`
   - Limitation: May fail if User Parameters is completely empty

7. **SPA Navigation**: Uses `MutationObserver` + `popstate` listener
   - Trade-off: Some performance overhead, but reliable detection

8. **No Build System**: Pure vanilla JS, no bundler
   - Benefit: Simple deployment, no build step
   - Trade-off: No TypeScript, no tree-shaking

9. **e2b SDK Usage**: See "Testing e2b Integration Locally" section for complete patterns

10. **Dual-Mode API Key Loading**: See "Understanding Keboola vs Local Testing Modes" section for details

11. **GitHub-Based Deployment**: See "Testing in Keboola" section - all `main.py` changes MUST be pushed to GitHub before Keboola testing

12. **e2b Integration Button**: Positioned at top of action panel with brand styling
   - **Position**: First item in action list (above green RUN COMPONENT button)
   - **Styling**: Solid e2b orange (#ff8800) background, white text, 40px height
   - **Hover effect**: Darkens to #e67a00 with enhanced shadow
   - **Implementation**: insertBefore() places button before all other actions (content-script.js:1023-1027)

13. **Component Icon Replacement**: Custom Python icon replaced with e2b logo
   - **Icon**: e2b black star logo from `chrome-extension/public/e2b.png`
   - **Background**: e2b brand orange (#ff8800) with 8px padding
   - **CSS Override**: Removes `bg-color-white` class and uses `!important` flag
   - **Purpose**: Visual branding and instant recognition of e2b-enabled configs
   - **Implementation**: replaceComponentIcon() function (content-script.js:1188-1230)

14. **Input Mapping Object Access**: CRITICAL - See "Working with Input Mapping" section for complete details on object vs dict access patterns

## Documentation Structure

- **README.md** (root): High-level research notes on Keboola/e2b integration
- **CLAUDE.md** (this file): Development guide for AI assistants
- **TEST_README.md**: Local testing guide with troubleshooting
- **chrome-extension/README.md**: Installation, testing, debugging guide
- **docs/plan/README.md**: Planning docs index
- **docs/plan/chrome-extension-plan.md**: Full technical specification
- **docs/plan/page-structure-analysis.md**: Keboola UI DOM analysis
- **docs/plan/implementation-quick-start.md**: Step-by-step implementation guide
- **docs/plan/workflow-diagrams.md**: ASCII workflow diagrams

## Common Development Patterns

### Understanding Keboola vs Local Testing Modes

The `main.py` script supports two execution modes:

**Keboola Mode** (Production):
```python
from keboola.component import CommonInterface

ci = CommonInterface()
api_key = ci.configuration.parameters['#e2b_api_key']  # Auto-decrypted
```

**Local Mode** (Development):
```python
import os
api_key = os.environ.get('E2B_API_KEY')
```

The script automatically detects which mode to use:
1. Tries `CommonInterface` first (Keboola mode)
2. Falls back to environment variable if CommonInterface not available
3. Logs clear messages about which mode is active

### Testing e2b Integration Locally

1. **Set up environment:**
   ```bash
   echo "E2B_API_KEY=your-key-here" > .env
   ```

2. **Run tests:**
   ```bash
   ./tools/setup_and_test.sh
   ```

3. **Develop incrementally:**
   - Edit `main.py` to add new functionality
   - Run `./tools/setup_and_test.sh` to test changes
   - Check output for `execution.logs.stdout` content

4. **Key patterns:**
   ```python
   # Create sandbox
   sandbox = Sandbox.create()

   # Run code
   execution = sandbox.run_code("print('hello')")

   # Get output
   output = ''.join(execution.logs.stdout)

   # Cleanup
   sandbox.kill()
   ```

### Logging Best Practices (Keboola)

**IMPORTANT:** Always use Python's `logging` library after initializing `CommonInterface`. The logger is automatically configured by Keboola (GELF or STDOUT).

**Reference:** https://raw.githubusercontent.com/keboola/component-custom-python/refs/heads/main/README.md

**Correct Pattern:**
```python
import logging
from keboola.component import CommonInterface

# Initialize CommonInterface first - this sets up the rich logger
ci = CommonInterface()

# Now use standard logging methods
logging.info("Info message")
logging.warning("Warning message")
logging.error("Error message")
logging.exception(e, extra={"test_name": "test1", "duration": "1.5s"})
```

**Log Level Usage:**
- `logging.info()` - General progress, successful operations, configuration
- `logging.warning()` - Non-critical issues, deprecation notices
- `logging.error()` - Critical failures, test failures
- `logging.exception()` - Exceptions with stack traces and structured context

**Structured Error Logging:**
Use the `extra` parameter to attach additional context for debugging:
```python
try:
    # ... code ...
except Exception as e:
    logging.exception(e, extra={
        "context": "cleanup",
        "sandbox_id": sandbox_id,
        "duration": format_duration(duration)
    })
```

**Benefits in Keboola:**
- Logs are properly formatted and categorized by severity
- Easy filtering in Keboola UI by log level
- Structured context helps with production debugging
- Stack traces are automatically captured with `logging.exception()`

### Testing in Keboola

**CRITICAL: All changes to `main.py` MUST be committed and pushed to GitHub before testing in Keboola.**

Keboola does NOT use your local files. It clones the code from the Git repository URL specified in the configuration. This means:
- Local changes are NOT visible to Keboola until pushed to GitHub
- Always commit and push before testing in Keboola
- Use the branch name specified in the configuration (currently: `fix/keboola-api-key-integration`)

**Testing Workflow:**

1. **Make changes locally** and test with `./tools/setup_and_test.sh`

2. **Commit and push to GitHub:**
   ```bash
   git add main.py
   git commit -m "Your commit message"
   git push origin fix/keboola-api-key-integration
   ```

3. **Configure User Parameters** via Chrome extension:
   - Set `e2b: true`
   - Set `#e2b_api_key` (will be encrypted automatically)
   - Set `e2b_template` and `e2b_timeout` as needed

4. **Initialize Python environment** (if not already done):
   - Click "Initialize Python & Git Configuration" in extension
   - Verifies Python 3.13 and Git repository are configured

5. **Run the component** in Keboola:
   - Keboola clones the repository from GitHub
   - Checks out the specified branch
   - Installs dependencies from `requirements.txt`
   - Executes `main.py`
   - API key is automatically loaded from user parameters

### Working with Input Mapping

**CRITICAL:** Input tables from Keboola are **objects with properties**, not dictionaries!

**Correct Pattern (from official README):**
```python
from keboola.component import CommonInterface

ci = CommonInterface()
input_tables = ci.configuration.tables_input_mapping

for table in input_tables:
    # Access as object properties, NOT dict keys!
    table_name = table.destination          # ✅ Correct
    source_id = table.source                # ✅ Correct

    # Get table definition
    table_def = ci.get_input_table_definition_by_name(table_name)

    # Access table_def properties
    local_path = table_def.full_path        # ✅ Correct
    columns = table_def.column_names        # ✅ Correct (or .columns)

    # Read CSV file
    with open(local_path, 'r') as f:
        csv_content = f.read()
```

**WRONG - Will cause errors:**
```python
# ❌ WRONG - These will fail!
table_name = table.get('destination')       # AttributeError
table_name = table['destination']           # TypeError
columns = table_def['columns']              # TypeError
```

**How Keboola Materializes Tables:**
1. Tables configured in Input Mapping are copied to `/data/in/tables/`
2. Files: `locations.csv` + `locations.csv.manifest` (JSON metadata)
3. CommonInterface reads manifests to provide table definitions
4. Your code reads the CSV files using paths from table_def

**DEBUG Logging for Input Mapping:**
```python
# Log data directory contents
data_dir = ci.data_folder_path
logging.debug(f"Data folder: {data_dir}")

# List materialized files
import os
files = os.listdir(os.path.join(data_dir, 'in', 'tables'))
logging.debug(f"Input files: {files}")

# Log table info
logging.debug(f"Table destination: {table.destination}")
logging.debug(f"Table source: {table.source}")
logging.debug(f"Full path: {table_def.full_path}")
```

### Adding a New Configuration Field

1. Update User Parameters schema in planning docs
2. Add form field to Shadow DOM in content-script.js:335-393
3. Update `loadCurrentConfiguration()` to populate field
4. Update `saveConfiguration()` to read and persist field
5. Test with encryption (prefix with `#` for sensitive values)

**Example - Template Parameter:**
- UI dropdown has "Default" (value="") and "Custom template..." (value="__custom__")
- Save: Empty string → converted to `"code-interpreter"` for storage
- Load: `"code-interpreter"` → displayed as "Default" in dropdown
- Load: Other values → displayed as custom template

### Debugging Extension Behavior

1. Check content script console: `[e2b Extension]` prefix
2. Check service worker console: `chrome://extensions/` → Inspect views
3. Verify User Parameters contains `e2b: true`
4. Verify URL matches pattern exactly
5. Check `MutationObserver` is running: `observer.observe` logged

### Testing Token Capture

Run in browser console:
```javascript
chrome.runtime.sendMessage(
  { type: 'GET_TOKEN' },
  response => console.log(response)
);
```

## External Resources

- **Keboola Custom Python Component README** (CRITICAL): https://raw.githubusercontent.com/keboola/component-custom-python/refs/heads/main/README.md
  - **Must-read for logging, testing, and deployment**
- **Keboola Custom Python Component Repo**: https://github.com/keboola/component-custom-python
- **Keboola Storage API Docs**: https://keboola.docs.apiary.io/
- **e2b Documentation**: https://e2b.dev/docs
- **e2b Python SDK**: https://github.com/e2b-dev/e2b
- **Chrome Extension Manifest V3**: https://developer.chrome.com/docs/extensions/mv3/
