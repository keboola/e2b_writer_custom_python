# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**kbc-e2b-writer** is a Chrome extension that integrates Keboola Connection's Custom Python component with e2b (ephemeral sandbox environments). It enables users to:
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

## Architecture

### File Structure

```
chrome-extension/
├── manifest.json                   # Extension manifest (V3)
├── background/
│   └── service-worker.js          # API proxy, token capture
├── content/
│   ├── content-script.js          # Main injection logic
│   └── inject-helper.js           # Page context helper (CodeMirror access)
└── assets/icons/                  # Extension icons
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

1. **Extension loads** → Service worker captures Keboola API token from HTTP headers
2. **User visits config page** → Content script checks for `e2b: true` in User Parameters
3. **If enabled** → Button injected into action panel
4. **User clicks button** → Modal opens, loads current config from CodeMirror
5. **User configures** → Extension updates User Parameters JSON
6. **Extension clicks Save** → Configuration persisted to Keboola

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

**Phase 3: File Upload** 🚧 (In Progress)
- Keboola Storage upload, e2b sandbox upload, progress tracking

**Phase 4: Advanced Features** (Planned)
- Sandbox lifecycle management, error handling, retry logic

## Known Issues & Design Decisions

1. **Conditional Injection**: Extension only injects UI when `e2b: true` exists in User Parameters
   - Rationale: Avoid clutter for users not using e2b integration

2. **Template Parameter Always Defined**: `e2b_template` is always stored with a concrete value (content-script.js:569-621)
   - When "Default" is selected: stores `"code-interpreter"`
   - When custom template is entered: stores the custom template ID
   - Rationale: User Parameters become environment variables for Python scripts using e2b SDK
   - Implementation: Loading logic (content-script.js:512-532) recognizes `"code-interpreter"` as default and displays "Default" in UI

3. **CodeMirror Detection**: Helper script finds editor by checking if content includes `"debug"` or `"e2b"`
   - Limitation: May fail if User Parameters is completely empty

4. **SPA Navigation**: Uses `MutationObserver` + `popstate` listener
   - Trade-off: Some performance overhead, but reliable detection

5. **No Build System**: Pure vanilla JS, no bundler
   - Benefit: Simple deployment, no build step
   - Trade-off: No TypeScript, no tree-shaking

## Documentation Structure

- **README.md** (root): High-level research notes on Keboola/e2b integration
- **chrome-extension/README.md**: Installation, testing, debugging guide
- **docs/plan/README.md**: Planning docs index
- **docs/plan/chrome-extension-plan.md**: Full technical specification
- **docs/plan/page-structure-analysis.md**: Keboola UI DOM analysis
- **docs/plan/implementation-quick-start.md**: Step-by-step implementation guide
- **docs/plan/workflow-diagrams.md**: ASCII workflow diagrams

## Common Development Patterns

### Adding a New Configuration Field

1. Update User Parameters schema in planning docs
2. Add form field to Shadow DOM in content-script.js:326-393
3. Update `loadCurrentConfiguration()` to populate field (lines 512-532 for template example)
4. Update `saveConfiguration()` to read and persist field (lines 569-621 for template example)
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

- **Keboola Custom Python Component**: https://github.com/keboola/component-custom-python
- **Keboola Storage API Docs**: https://keboola.docs.apiary.io/
- **e2b Documentation**: https://e2b.dev/docs
- **e2b Python SDK**: https://github.com/e2b-dev/e2b
- **Chrome Extension Manifest V3**: https://developer.chrome.com/docs/extensions/mv3/
