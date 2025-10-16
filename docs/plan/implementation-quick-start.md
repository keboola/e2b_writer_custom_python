# Chrome Extension Implementation Quick Start

This guide provides a step-by-step approach to implementing the Keboola e2b Writer Chrome extension.

## Prerequisites

- Chrome browser (version 100+)
- Node.js (for build tools, optional but recommended)
- Keboola Connection account with access to Custom Python component
- e2b API account and API key (https://e2b.dev)

## Project Setup

### 1. Create Extension Directory Structure

```bash
mkdir -p chrome-extension/{background,content,ui/{components},lib,assets/{icons,styles}}
cd chrome-extension
```

### 2. Initialize Package (Optional)

```bash
npm init -y
npm install --save-dev @types/chrome
```

### 3. Create Manifest

**File**: `manifest.json`
```json
{
  "manifest_version": 3,
  "name": "Keboola e2b Writer",
  "version": "0.1.0",
  "description": "Seamless integration between Keboola Connection and e2b sandboxes",
  "permissions": ["storage"],
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
    "default_icon": "assets/icons/icon48.png"
  },
  "icons": {
    "16": "assets/icons/icon16.png",
    "48": "assets/icons/icon48.png",
    "128": "assets/icons/icon128.png"
  }
}
```

## Phase 1: Basic Extension Shell

### Step 1: Create Background Service Worker

**File**: `background/service-worker.js`
```javascript
// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Keboola e2b Writer installed', details);
});

// Message handler for content script communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'API_CALL') {
    // Proxy API calls to avoid CORS issues
    handleApiCall(request.data)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true; // Keep channel open for async response
  }
});

async function handleApiCall(data) {
  const { url, method, headers, body } = data;
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  return response.json();
}
```

### Step 2: Create Content Script with URL Detection

**File**: `content/content-script.js`
```javascript
// URL pattern matching
const CUSTOM_PYTHON_PATTERN = /^https:\/\/connection\.[^/]+\.keboola\.com\/admin\/projects\/(\d+)\/components\/kds-team\.app-custom-python\/([a-z0-9]+)$/;

// Extract context from URL
function extractContext() {
  const match = window.location.href.match(CUSTOM_PYTHON_PATTERN);
  if (!match) return null;

  return {
    projectId: match[1],
    configId: match[2],
    stackUrl: window.location.origin
  };
}

// Check if we're on a valid page
function shouldInject() {
  const context = extractContext();
  if (!context) return false;

  // Verify DOM elements to confirm page type
  const hasComponentHeader = document.querySelector('[role="heading"]')?.textContent?.includes('Custom Python');
  return !!hasComponentHeader;
}

// Main injection function
function injectExtension() {
  if (document.getElementById('kbc-e2b-extension-root')) {
    return; // Already injected
  }

  console.log('[e2b Extension] Injecting UI...');

  // Find injection point (action panel)
  const actionList = findActionList();
  if (!actionList) {
    console.warn('[e2b Extension] Could not find action list');
    return;
  }

  // Create extension button
  const extensionItem = createExtensionButton();

  // Insert into DOM
  const debugModeItem = findDebugModeItem(actionList);
  if (debugModeItem) {
    debugModeItem.insertAdjacentElement('afterend', extensionItem);
  } else {
    actionList.appendChild(extensionItem);
  }

  // Create hidden panel
  createExtensionPanel();
}

function findActionList() {
  // Try multiple strategies to find the action button list
  const lists = document.querySelectorAll('ul, [role="list"]');
  for (const list of lists) {
    if (list.textContent.includes('Run component') && list.textContent.includes('Debug mode')) {
      return list;
    }
  }
  return null;
}

function findDebugModeItem(actionList) {
  const items = actionList.querySelectorAll('li, [role="listitem"]');
  for (const item of items) {
    if (item.textContent.includes('Debug mode')) {
      return item;
    }
  }
  return null;
}

function createExtensionButton() {
  const item = document.createElement('li');
  item.innerHTML = `
    <button id="kbc-e2b-toggle" style="
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #fff;
      border: 1px solid #d0d0d0;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      width: 100%;
      text-align: left;
    ">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M9 12h6M12 9v6"/>
      </svg>
      <span>e2b Integration</span>
    </button>
  `;

  item.querySelector('button').addEventListener('click', togglePanel);

  return item;
}

function createExtensionPanel() {
  const shadowHost = document.createElement('div');
  shadowHost.id = 'kbc-e2b-extension-root';
  shadowHost.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10000;';

  const shadow = shadowHost.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
    <style>
      .panel-overlay {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        pointer-events: auto;
        align-items: center;
        justify-content: center;
      }

      .panel-overlay.visible {
        display: flex;
      }

      .panel {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        padding: 24px;
      }

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }

      .panel-header h2 {
        margin: 0;
        font-size: 20px;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
      }

      .section {
        margin-bottom: 24px;
      }

      .section h3 {
        font-size: 16px;
        margin-bottom: 12px;
      }

      .form-group {
        margin-bottom: 12px;
      }

      .form-group label {
        display: block;
        font-size: 14px;
        margin-bottom: 4px;
      }

      .form-group input,
      .form-group select {
        width: 100%;
        padding: 8px;
        border: 1px solid #d0d0d0;
        border-radius: 4px;
        font-size: 14px;
      }

      .btn {
        padding: 10px 16px;
        border: none;
        border-radius: 4px;
        font-size: 14px;
        cursor: pointer;
        margin-right: 8px;
      }

      .btn-primary {
        background: #1976d2;
        color: white;
      }

      .btn-secondary {
        background: #f5f5f5;
        color: #333;
      }
    </style>

    <div class="panel-overlay" id="panel-overlay">
      <div class="panel">
        <div class="panel-header">
          <h2>e2b Integration</h2>
          <button class="close-btn" id="close-panel">&times;</button>
        </div>

        <div class="section">
          <h3>📦 e2b Configuration</h3>
          <div class="form-group">
            <label>API Key</label>
            <input type="password" id="e2b-api-key" placeholder="e2b_..." />
          </div>
          <div class="form-group">
            <label>Template</label>
            <select id="e2b-template">
              <option value="python-3.13">Python 3.13</option>
              <option value="python-3.12">Python 3.12</option>
              <option value="python-3.14">Python 3.14 RC</option>
            </select>
          </div>
          <div class="form-group">
            <label>Timeout (seconds)</label>
            <input type="number" id="e2b-timeout" value="1800" />
          </div>
        </div>

        <div class="section">
          <h3>📁 File Upload</h3>
          <div class="form-group">
            <input type="file" id="file-input" multiple />
          </div>
          <div id="file-list"></div>
        </div>

        <div class="section">
          <button class="btn btn-primary" id="upload-btn">Upload Files</button>
          <button class="btn btn-secondary" id="test-connection-btn">Test Connection</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(shadowHost);

  // Event listeners
  shadow.getElementById('close-panel').addEventListener('click', closePanel);
  shadow.getElementById('panel-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'panel-overlay') closePanel();
  });

  // Store reference for later access
  window.__e2bExtensionPanel = shadow;
}

function togglePanel() {
  const panel = document.getElementById('kbc-e2b-extension-root')?.shadowRoot?.getElementById('panel-overlay');
  if (panel) {
    panel.classList.toggle('visible');
  }
}

function closePanel() {
  const panel = document.getElementById('kbc-e2b-extension-root')?.shadowRoot?.getElementById('panel-overlay');
  if (panel) {
    panel.classList.remove('visible');
  }
}

// SPA navigation detection
let lastUrl = location.href;
function checkNavigation() {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    if (shouldInject()) {
      injectExtension();
    }
  }
}

// Observer for DOM changes
const observer = new MutationObserver(() => {
  checkNavigation();
  if (shouldInject() && !document.getElementById('kbc-e2b-extension-root')) {
    injectExtension();
  }
});

// Initialize
function init() {
  if (shouldInject()) {
    injectExtension();
  }

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  window.addEventListener('popstate', checkNavigation);
}

// Wait for DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

## Testing the Extension

### 1. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select your `chrome-extension` directory

### 2. Test on Keboola

1. Navigate to: `https://connection.eu-central-1.keboola.com/admin/projects/33/components/kds-team.app-custom-python/01k7pkk4qg6jprstza74572x8f`
2. You should see a new "e2b Integration" button in the action panel
3. Click it to open the modal
4. Enter your e2b API key and test configuration

### 3. Debug

- **View logs**: Right-click page → Inspect → Console (look for `[e2b Extension]` prefix)
- **Check extension**: `chrome://extensions/` → Click "Details" → "Inspect views: background page"
- **Reload extension**: Click reload icon on extension card after making changes

## Next Implementation Steps

### Phase 2: API Integration

1. **Token Capture**
   ```javascript
   // Intercept fetch/XHR to capture Storage API token
   const originalFetch = window.fetch;
   window.fetch = function(...args) {
     return originalFetch.apply(this, args).then(response => {
       // Capture X-StorageApi-Token from requests
       // Store in chrome.storage.session
       return response;
     });
   };
   ```

2. **Keboola Storage API Client** (`lib/keboola-api.js`)
   - Implement file upload (prepare → upload)
   - Configuration GET/PATCH

3. **e2b API Client** (`lib/e2b-api.js`)
   - Sandbox creation
   - File upload to sandbox

### Phase 3: File Upload Flow

1. File selection → validation
2. Parallel upload to Keboola + e2b
3. Progress tracking
4. Configuration parameter update
5. Success/error handling

### Phase 4: Security & Polish

1. Implement encryption for API keys
2. Add comprehensive error messages
3. UI/UX improvements
4. Testing across different scenarios

## Common Issues & Solutions

### Issue: Extension button not appearing
- **Check**: URL pattern matches exactly
- **Check**: DOM selector finding correct elements
- **Debug**: Add `console.log` in `shouldInject()` function

### Issue: Panel not opening
- **Check**: Shadow DOM created correctly
- **Check**: Event listeners attached
- **Debug**: Inspect `document.getElementById('kbc-e2b-extension-root')`

### Issue: CORS errors with e2b API
- **Solution**: Proxy requests through background service worker
- **Implementation**: Use `chrome.runtime.sendMessage` to background script

### Issue: Storage API token not captured
- **Solution**: Implement fetch/XHR interception earlier in load cycle
- **Alternative**: Prompt user to manually enter token

## Resources

- [Chrome Extension Manifest V3 Docs](https://developer.chrome.com/docs/extensions/mv3/)
- [Keboola Storage API Docs](https://keboola.docs.apiary.io/)
- [e2b API Docs](https://e2b.dev/docs)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM)

## Quick Commands

```bash
# Load extension (after initial setup)
# 1. Make changes to files
# 2. Go to chrome://extensions/
# 3. Click reload icon on extension card

# View background logs
# chrome://extensions/ → Details → Inspect views

# View content script logs
# Right-click page → Inspect → Console

# Package extension for distribution (future)
zip -r keboola-e2b-writer.zip chrome-extension/ -x "*.git*" "node_modules/*"
```

---

## Summary

This quick start provides:
1. ✅ Complete project structure
2. ✅ Working Manifest V3 configuration
3. ✅ Basic content script with URL detection & SPA navigation
4. ✅ Shadow DOM panel UI
5. ✅ Extension button injection
6. ✅ Testing instructions

**Next**: Proceed with Phase 2 (API Integration) once basic shell is confirmed working.

