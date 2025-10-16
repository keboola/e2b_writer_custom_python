# Keboola e2b Writer Chrome Extension - Initial Plan

## 1. Overview

This Chrome extension enables seamless integration between Keboola Connection's Custom Python component and e2b (ephemeral sandbox environments). It allows users to upload files directly from their browser to both Keboola Storage and e2b sandboxes, configure e2b parameters, and execute Python code in isolated environments.

### Key Objectives
- Provide a user-friendly UI overlay within Keboola Connection for e2b configuration
- Enable direct file uploads from browser to Keboola Storage and e2b
- Securely manage e2b API keys and sandbox settings
- Automatically sync configuration with Keboola component parameters
- Minimize friction in the workflow between Keboola and e2b

## 2. Technical Architecture

### Core Components

```
chrome-extension/
├── manifest.json                 # Extension manifest (Manifest V3)
├── background/
│   ├── service-worker.js        # Background service worker
│   └── api-client.js            # Keboola & e2b API client
├── content/
│   ├── content-script.js        # Injected into Keboola pages
│   ├── url-detector.js          # URL pattern matching & routing
│   └── dom-observer.js          # SPA navigation detection
├── ui/
│   ├── panel.html               # Extension UI panel
│   ├── panel.js                 # Panel logic
│   ├── panel.css                # Styling (shadow DOM)
│   └── components/
│       ├── file-uploader.js     # File upload component
│       ├── e2b-config.js        # e2b configuration form
│       └── status-monitor.js    # Upload/execution status
├── lib/
│   ├── storage.js               # Chrome storage helpers
│   ├── crypto.js                # Encryption utilities
│   └── utils.js                 # Common utilities
└── assets/
    ├── icons/                   # Extension icons
    └── styles/                  # Shared styles
```

### Technology Stack
- **Manifest Version**: V3 (service workers, dynamic content scripts)
- **UI Framework**: Vanilla JS with Web Components (lightweight, no dependencies)
- **Styling**: CSS with Shadow DOM for isolation
- **Storage**: `chrome.storage.session` for sensitive data, `chrome.storage.local` for preferences
- **APIs**: Fetch API for Keboola Storage & e2b REST APIs

## 3. URL Detection & Context Awareness

### Target URL Pattern
```
https://connection.eu-central-1.keboola.com/admin/projects/{projectId}/components/kds-team.app-custom-python/{configId}
```

### Detection Strategy

#### A. Content Script Injection
```javascript
// manifest.json
{
  "content_scripts": [{
    "matches": [
      "https://connection.*.keboola.com/admin/projects/*/components/kds-team.app-custom-python/*"
    ],
    "js": ["content/content-script.js"],
    "run_at": "document_idle"
  }]
}
```

#### B. URL Pattern Validation
1. Parse URL to extract:
   - Stack region (e.g., `eu-central-1`)
   - Project ID (e.g., `33`)
   - Component ID (`kds-team.app-custom-python`)
   - Configuration ID (e.g., `01k7pkk4qg6jprstza74572x8f`)

2. Verify page context:
   - Check for component detail view DOM elements
   - Confirm Custom Python component type
   - Ensure user is logged in (presence of auth tokens)

#### C. SPA Navigation Handling
Keboola uses React SPA - implement `MutationObserver` to detect:
- Hash/path changes without full page reload
- Component switching
- Configuration switching

```javascript
// Pseudo-code
const observer = new MutationObserver(() => {
  if (urlMatchesPattern() && isCustomPythonConfig()) {
    injectExtensionUI();
  } else {
    removeExtensionUI();
  }
});
```

## 4. UI Injection Strategy

### Injection Point
Based on page snapshot analysis, inject UI into the right-side action panel:
- **Target location**: Next to "Run component" button group (refs: e428-e457)
- **Injection method**: Insert custom button/panel before "Last Use" section

### UI Components

#### A. Extension Toggle Button
```html
<button id="kbc-e2b-toggle" class="extension-button">
  <img src="e2b-icon.svg" />
  <span>e2b Integration</span>
</button>
```

- Position: In the action list (listitem after "Debug mode")
- Style: Match Keboola's button styling for consistency

#### B. Extension Panel (Modal/Sidebar)
Opens when toggle button clicked. Contains:

1. **e2b Configuration Section**
   - API Key input (masked, encrypted)
   - Sandbox Template ID input
   - Timeout override selector (default, 5min, 10min, 30min, custom)
   - Environment variables (key-value pairs)

2. **File Upload Section**
   - Drag-and-drop area
   - File browser button
   - File list with:
     - Name, size, type
     - Upload progress bar
     - Remove button
   - Upload destinations:
     - ☑ Keboola Storage (with tags input)
     - ☑ e2b Sandbox (with target path input)

3. **Status Section**
   - Current operation status
   - Upload progress (files → Keboola → e2b)
   - Error messages
   - Success confirmations

4. **Actions**
   - "Upload Files" button
   - "Sync to Configuration" button (updates component parameters)
   - "Test Connection" button (validates e2b API key)
   - "Close" button

### Shadow DOM Isolation
Use Shadow DOM to prevent style conflicts:
```javascript
const shadowHost = document.createElement('div');
shadowHost.id = 'kbc-e2b-extension-root';
const shadow = shadowHost.attachShadow({ mode: 'open' });
shadow.innerHTML = `<style>${styles}</style>${panelHTML}`;
```

## 5. File Management Flow

### Upload Workflow

```
User selects files
       ↓
Extension validates files (size, type)
       ↓
Files stored in memory (FileReader API)
       ↓
[Parallel operations]
       ↓
   ┌────────────────────────────┐
   │                            │
   ↓                            ↓
Upload to Keboola Storage    Upload to e2b
   ↓                            ↓
Get fileId & tags           Get sandbox file path
   ↓                            │
   └──────────┬─────────────────┘
              ↓
    Update component configuration
              ↓
         Show success
```

### A. Keboola Storage Upload

1. **Prepare Upload**
   ```javascript
   POST /v2/storage/files/prepare
   {
     "name": "dataset.csv",
     "sizeBytes": 1048576,
     "tags": ["kbc-e2b-writer", "01k7pkk4qg6jprstza74572x8f"]
   }
   ```
   Response: `{ "id": 12345, "uploadParams": {...} }`

2. **Upload File**
   - Use signed URL from `uploadParams`
   - Upload with `multipart/form-data`
   - Track progress with `XMLHttpRequest.upload.onprogress`

3. **Store File Reference**
   - Save `fileId` in extension state
   - Link to configuration ID

### B. e2b Sandbox Upload

1. **Initialize Sandbox** (if needed)
   ```javascript
   // Via browser fetch or proxy through background script
   POST https://api.e2b.dev/sandboxes
   {
     "template": "python-3.13",
     "apiKey": "e2b_***",
     "timeout": 1800
   }
   ```

2. **Upload Files**
   ```javascript
   // Use e2b SDK via background script or direct API
   PUT https://api.e2b.dev/sandboxes/{sandboxId}/files/{path}
   Body: <file bytes>
   ```

3. **Track Sandbox State**
   - Store `sandboxId` in session storage
   - Provide option to reuse existing sandbox or create new one

### File Size Considerations
- **Browser limit**: Files loaded into memory (ArrayBuffer)
- **Chunked uploads**: For files > 100MB, implement chunked streaming
- **Compression**: Offer zip compression option for multiple files

## 6. e2b Integration

### API Key Management

1. **Input & Validation**
   - User enters API key in masked input
   - Click "Test Connection" to validate
   - Call e2b API to verify key: `GET /sandboxes` with auth header

2. **Secure Storage**
   - Encrypt key using Web Crypto API before storage
   - Store in `chrome.storage.session` (cleared on browser close)
   - Never log raw key values

3. **Configuration Sync**
   - Store encrypted key reference in Keboola configuration
   - Use Keboola's `#` prefix for encrypted parameters:
     ```json
     {
       "#e2b_api_key": "e2b_***",
       "e2b_template": "python-3.13",
       "e2b_timeout": 1800
     }
     ```

### Sandbox Lifecycle

1. **Creation**
   - Create sandbox when user clicks "Upload to e2b"
   - Use specified template or default to `python-3.13`
   - Apply timeout override if configured

2. **File Transfer**
   - After Keboola upload completes, transfer to e2b
   - Support multiple file uploads to same sandbox
   - Provide directory structure input (e.g., `/data/input/`)

3. **Persistence**
   - Option to keep sandbox alive for repeated uploads
   - Display sandbox ID and remaining lifetime
   - Manual cleanup button ("Terminate Sandbox")

### CORS Considerations
- e2b API may not support direct browser calls
- **Solution A**: Proxy through extension background script
- **Solution B**: Check e2b CORS headers; if allowed, call directly
- **Solution C**: Deploy lightweight serverless proxy (Cloudflare Workers)

## 7. Keboola API Integration

### Authentication

1. **Token Acquisition**
   - **Option A**: Extract from Keboola UI context
     - Listen to `XMLHttpRequest` or `fetch` calls
     - Capture `X-StorageApi-Token` header
   - **Option B**: Prompt user to provide token manually
     - Link to Keboola token management page
     - Validate token scope (`read`, `write`)

2. **Token Storage**
   - Store in `chrome.storage.session`
   - Include project ID, stack URL in context
   - Auto-refresh on session expiry (prompt re-login)

### Configuration API Calls

#### A. Get Current Configuration
```javascript
GET /v2/storage/components/kds-team.app-custom-python/configs/01k7pkk4qg6jprstza74572x8f
Headers:
  X-StorageApi-Token: <token>
```
Response includes:
- `configuration.parameters` (User Parameters JSON)
- `configuration.storage` (input/output mappings)
- `rowsVersion` (for optimistic locking)

#### B. Update Configuration
```javascript
PATCH /v2/storage/components/kds-team.app-custom-python/configs/01k7pkk4qg6jprstza74572x8f
Headers:
  X-StorageApi-Token: <token>
Body:
{
  "configuration": {
    "parameters": {
      "debug": false,
      "#e2b_api_key": "e2b_***",
      "e2b_template": "python-3.13",
      "e2b_uploaded_files": [
        {"fileId": 12345, "name": "data.csv", "path": "/data/input/data.csv"}
      ]
    }
  },
  "rowsVersion": <currentVersion>
}
```

#### C. Optimistic Locking
1. Fetch latest configuration before update
2. Check `rowsVersion` hasn't changed
3. If changed, prompt user to review conflicts
4. Merge changes or allow overwrite

### File API Calls

#### List Tagged Files
```javascript
GET /v2/storage/files?tags[]=kbc-e2b-writer&tags[]=01k7pkk4qg6jprstza74572x8f
```
Display previously uploaded files in extension UI.

## 8. Security Considerations

### Sensitive Data Protection

1. **API Keys**
   - Never log API keys in console or errors
   - Mask display (show only last 4 characters)
   - Encrypt before storage using Web Crypto API:
     ```javascript
     const encrypted = await crypto.subtle.encrypt(
       { name: "AES-GCM", iv },
       key,
       data
     );
     ```

2. **Storage API Tokens**
   - Session-only storage (`chrome.storage.session`)
   - Clear on browser close
   - Prompt re-authentication on expiry

3. **File Content**
   - Files held in memory temporarily during upload
   - Clear ArrayBuffers after upload completes
   - No persistent caching of file data

### Content Security Policy (CSP)
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### Permissions
```json
{
  "permissions": [
    "storage",
    "webRequest"
  ],
  "host_permissions": [
    "https://connection.*.keboola.com/*",
    "https://api.e2b.dev/*"
  ]
}
```

### User Warnings
- Display warnings when API keys are entered/stored
- Explain data flow (browser → Keboola Storage → e2b)
- Provide links to revoke tokens/keys
- Terms acceptance for third-party (e2b) data transfer

## 9. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Set up Chrome extension boilerplate (Manifest V3)
- [ ] Implement URL detection and content script injection
- [ ] Create basic UI panel with Shadow DOM
- [ ] Implement SPA navigation observer

### Phase 2: Keboola Integration (Week 2)
- [ ] Token capture/input mechanism
- [ ] Keboola Storage API client (prepare, upload, list files)
- [ ] Configuration API (GET, PATCH with optimistic locking)
- [ ] File upload UI with progress tracking

### Phase 3: e2b Integration (Week 3)
- [ ] e2b API client (sandboxes, file upload)
- [ ] API key management (input, validation, encryption)
- [ ] Sandbox lifecycle management
- [ ] CORS handling (proxy if needed)

### Phase 4: File Flow Integration (Week 4)
- [ ] Parallel upload to Keboola + e2b
- [ ] File reference tracking
- [ ] Configuration parameter sync
- [ ] Error handling and retry logic

### Phase 5: Polish & Testing (Week 5)
- [ ] UI/UX refinements
- [ ] Comprehensive error messages
- [ ] Security audit (API key handling, CSP)
- [ ] Test with various file sizes and types
- [ ] Documentation (README, inline help)

### Phase 6: Advanced Features (Future)
- [ ] Bulk file operations
- [ ] File package handling (zip/unzip)
- [ ] Sandbox templates management
- [ ] Job execution monitoring from extension
- [ ] Direct integration with Keboola Jobs API

## 10. Technical Specifications

### Manifest V3 Structure
```json
{
  "manifest_version": 3,
  "name": "Keboola e2b Writer",
  "version": "0.1.0",
  "description": "Seamless integration between Keboola Connection and e2b sandboxes",
  "permissions": ["storage", "webRequest"],
  "host_permissions": [
    "https://connection.*.keboola.com/*",
    "https://api.e2b.dev/*"
  ],
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "content_scripts": [{
    "matches": [
      "https://connection.*.keboola.com/admin/projects/*/components/kds-team.app-custom-python/*"
    ],
    "js": ["content/content-script.js"],
    "run_at": "document_idle"
  }],
  "action": {
    "default_popup": "ui/popup.html",
    "default_icon": "assets/icons/icon48.png"
  },
  "icons": {
    "16": "assets/icons/icon16.png",
    "48": "assets/icons/icon48.png",
    "128": "assets/icons/icon128.png"
  }
}
```

### Key API Endpoints

#### Keboola Storage API
- Base URL: `https://connection.{stack}.keboola.com/v2/storage`
- Auth: `X-StorageApi-Token` header
- Endpoints:
  - `POST /files/prepare` - Prepare file upload
  - `GET /files?tags[]=<tag>` - List files by tag
  - `GET /components/{componentId}/configs/{configId}` - Get config
  - `PATCH /components/{componentId}/configs/{configId}` - Update config

#### e2b API
- Base URL: `https://api.e2b.dev`
- Auth: `Authorization: Bearer <e2b_api_key>` or `X-API-Key` header
- Endpoints:
  - `POST /sandboxes` - Create sandbox
  - `PUT /sandboxes/{id}/files/{path}` - Upload file
  - `GET /sandboxes/{id}` - Get sandbox status
  - `DELETE /sandboxes/{id}` - Terminate sandbox

### Data Models

#### Extension State (chrome.storage.session)
```typescript
interface ExtensionState {
  keboola: {
    projectId: string;
    stackUrl: string;
    token: string; // encrypted
    componentId: string;
    configId: string;
  };
  e2b: {
    apiKey: string; // encrypted
    template: string;
    timeout: number;
    activeSandboxId?: string;
    sandboxExpiresAt?: number;
  };
  uploads: {
    [fileId: string]: {
      name: string;
      size: number;
      keboolaFileId?: number;
      e2bPath?: string;
      status: 'pending' | 'uploading' | 'completed' | 'error';
      progress: number;
      error?: string;
    };
  };
}
```

#### Component Configuration Parameters
```json
{
  "pythonVersion": "3.13-isolated",
  "userParameters": {
    "debug": false,
    "#e2b_api_key": "encrypted_e2b_key",
    "e2b_template": "python-3.13",
    "e2b_timeout": 1800,
    "e2b_uploaded_files": [
      {
        "keboolaFileId": 12345,
        "name": "dataset.csv",
        "sandboxPath": "/data/input/dataset.csv",
        "uploadedAt": "2025-10-16T10:30:00Z"
      }
    ]
  },
  "sourceCode": {
    "type": "manual",
    "code": "from keboola.component import CommonInterface\n..."
  }
}
```

## 11. UI/UX Mockups

### Extension Panel Layout
```
┌─────────────────────────────────────────────────┐
│  e2b Integration                           [×]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  📦 e2b Configuration                           │
│  ┌───────────────────────────────────────────┐ │
│  │ API Key:  [••••••••••••••••key123] [Test]│ │
│  │ Template: [python-3.13 ▼]                │ │
│  │ Timeout:  [30 minutes ▼]                 │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  📁 File Upload                                 │
│  ┌───────────────────────────────────────────┐ │
│  │  Drag files here or [Browse]              │ │
│  │                                            │ │
│  │  ✓ dataset.csv (1.2 MB)          [Remove]│ │
│  │    └─ Keboola: #12345                     │ │
│  │    └─ e2b: /data/input/dataset.csv        │ │
│  │                                            │ │
│  │  ↻ large_file.parquet (45 MB)   [Remove] │ │
│  │    └─ Uploading... ████████░░ 80%         │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ⚙️ Upload Destinations                         │
│  ☑ Keboola Storage   Tags: [kbc-e2b-writer]   │
│  ☑ e2b Sandbox       Path: [/data/input/]     │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  [Upload Files] [Sync Config] [Close]          │
└─────────────────────────────────────────────────┘
```

## 12. Open Questions & Decisions

### To Research
1. **e2b CORS Support**: Does e2b API allow direct browser calls? If not, proxy strategy needed.
2. **Keboola Token Scope**: Confirm minimum required permissions for Storage API operations.
3. **File Size Limits**: Keboola Storage file size limits, e2b sandbox disk limits.
4. **Sandbox Persistence**: Can sandboxes be reused across sessions? Timeout behavior?
5. **Beta Timeout Feature**: Confirm e2b SDK Python timeout extension availability and API.

### Design Decisions
- **Token Capture**: Auto-detect vs. manual input? → Start with manual, add auto-detect later
- **UI Position**: Modal vs. sidebar panel? → Start with modal for simplicity
- **Sandbox Lifecycle**: One-per-upload vs. persistent? → Start with one-per-upload, add persistence option
- **Error Handling**: Retry logic for uploads? → Yes, implement exponential backoff

### Future Enhancements
- Integration with Keboola Jobs API to trigger component runs from extension
- Support for other Keboola components (not just Custom Python)
- Local file caching for repeated uploads
- Sandbox template customization/creation from extension
- Multi-project support (switch between Keboola projects)

## 13. Success Metrics

### Functionality
- ✅ Successfully upload files to Keboola Storage
- ✅ Successfully transfer files to e2b sandbox
- ✅ Configuration parameters synced correctly
- ✅ API keys stored securely
- ✅ Works across Keboola stack regions

### Performance
- File upload completes in reasonable time (< 5s for 10MB)
- No memory leaks during large file uploads
- UI remains responsive during background operations

### Security
- No API keys logged or exposed in console
- Encryption properly implemented
- Tokens cleared on browser close

---

## Next Steps

1. Review and approve this plan
2. Set up development environment
3. Create Chrome extension skeleton
4. Begin Phase 1 implementation
5. Establish testing procedures (manual + automated)

