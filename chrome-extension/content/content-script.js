// Content script for Keboola e2b Writer extension
// Injects UI into Keboola Custom Python component configuration pages

console.log('[e2b Extension] Content script loaded');

// URL pattern matching
const CUSTOM_PYTHON_PATTERN = /^https:\/\/connection\.([^/]+)\.keboola\.com\/admin\/projects\/(\d+)\/components\/kds-team\.app-custom-python\/([a-z0-9]+)$/;

// Global state
let extensionContext = null;

// Extract context from URL
function extractContext() {
  const match = window.location.href.match(CUSTOM_PYTHON_PATTERN);
  if (!match) return null;

  return {
    stack: match[1],
    stackUrl: window.location.origin,
    projectId: match[2],
    configId: match[3],
    componentId: 'kds-team.app-custom-python'
  };
}

// Check if e2b is installed (has e2b: true in User Parameters)
async function isE2bInstalled() {
  try {
    const userParamsEditor = await findUserParametersEditor();
    const currentText = await userParamsEditor.getValue();

    if (!currentText) return false;

    const params = JSON.parse(currentText);
    return params.e2b === true;
  } catch (error) {
    console.error('[e2b Extension] Error checking installation:', error);
    return false;
  }
}

// Check if we're on a valid page
function shouldInject() {
  const context = extractContext();
  if (!context) return false;

  // Verify DOM elements to confirm page type
  const pageTitle = document.title;
  const hasCustomPython = pageTitle.includes('Custom Python');

  return hasCustomPython;
}

// Find the action list where we'll inject our button
function findActionList() {
  // Try to find the list containing "Run component" and "Debug mode"
  const allLists = document.querySelectorAll('ul, [role="list"]');

  for (const list of allLists) {
    const text = list.textContent;
    if (text.includes('Run component') && text.includes('Debug mode')) {
      return list;
    }
  }

  return null;
}

// Find the "Debug mode" item to insert after
function findDebugModeItem(actionList) {
  const items = actionList.querySelectorAll('li, [role="listitem"]');

  for (const item of items) {
    if (item.textContent.includes('Debug mode')) {
      return item;
    }
  }

  return null;
}

// Create the extension toggle button
function createExtensionButton() {
  const item = document.createElement('li');
  item.style.cssText = 'list-style: none;';
  item.id = 'kbc-e2b-button-item';

  item.innerHTML = `
    <button id="kbc-e2b-toggle" style="
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: white;
      border: 2px solid #FF6C37;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      width: 100%;
      text-align: left;
      font-family: inherit;
      color: #FF6C37;
      font-weight: 500;
      transition: all 0.2s;
    " onmouseover="this.style.background='#FF6C37'; this.style.color='white';" onmouseout="this.style.background='white'; this.style.color='#FF6C37';">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M9 12h6M12 9v6"/>
      </svg>
      <span>e2b Integration</span>
    </button>
  `;

  const button = item.querySelector('button');
  button.addEventListener('click', togglePanel);

  return item;
}

// Create the extension panel with Shadow DOM
function createExtensionPanel() {
  const shadowHost = document.createElement('div');
  shadowHost.id = 'kbc-e2b-extension-root';
  shadowHost.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10000;';

  const shadow = shadowHost.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
    <style>
      * {
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      }

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
        z-index: 10000;
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
        padding-bottom: 16px;
        border-bottom: 1px solid #e0e0e0;
      }

      .panel-header h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: #FF6C37;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 28px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        color: #666;
        line-height: 1;
      }

      .close-btn:hover {
        color: #000;
      }

      .section {
        margin-bottom: 24px;
      }

      .section h3 {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 12px;
        color: #333;
      }

      .form-group {
        margin-bottom: 16px;
      }

      .form-group label {
        display: block;
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 6px;
        color: #333;
      }

      .form-group input,
      .form-group select {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #d0d0d0;
        border-radius: 4px;
        font-size: 14px;
        transition: border-color 0.2s;
      }

      .form-group input:focus,
      .form-group select:focus {
        outline: none;
        border-color: #FF6C37;
        box-shadow: 0 0 0 2px rgba(255, 108, 55, 0.1);
      }

      .form-group .hint {
        font-size: 12px;
        color: #666;
        margin-top: 4px;
      }

      .btn {
        padding: 10px 20px;
        border: none;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        margin-right: 8px;
        transition: background 0.2s;
      }

      .btn-primary {
        background: #FF6C37;
        color: white;
      }

      .btn-primary:hover {
        background: #E85A28;
      }

      .btn-primary:disabled {
        background: #ccc;
        cursor: not-allowed;
      }

      .btn-secondary {
        background: #f5f5f5;
        color: #333;
      }

      .btn-secondary:hover {
        background: #e0e0e0;
      }

      .status-message {
        padding: 12px;
        border-radius: 4px;
        margin-bottom: 16px;
        font-size: 14px;
        display: none;
      }

      .status-message.visible {
        display: block;
      }

      .status-message.success {
        background: #e8f5e9;
        color: #2e7d32;
        border: 1px solid #4caf50;
      }

      .status-message.error {
        background: #ffebee;
        color: #c62828;
        border: 1px solid #f44336;
      }

      .status-message.info {
        background: #e3f2fd;
        color: #1565c0;
        border: 1px solid #2196f3;
      }

      .info-box {
        background: #FFF5F2;
        border-left: 4px solid #FF6C37;
        padding: 12px;
        margin-bottom: 16px;
        font-size: 13px;
      }

      .info-box strong {
        display: block;
        margin-bottom: 4px;
      }
    </style>

    <div class="panel-overlay" id="panel-overlay">
      <div class="panel">
        <div class="panel-header">
          <h2 id="panel-title">e2b Integration</h2>
          <button class="close-btn" id="close-panel">&times;</button>
        </div>

        <div id="status-message" class="status-message"></div>

        <div class="info-box">
          <strong>Context</strong>
          Project: <span id="project-id">-</span> |
          Config: <span id="config-id">-</span> |
          Stack: <span id="stack">-</span>
        </div>

        <div class="section">
          <h3>🚀 Initialize e2b Writer</h3>
          <div class="info-box">
            <strong>One-click setup</strong>
            This will automatically configure the Python environment and Git repository for e2b writer integration.
          </div>
          <button class="btn btn-primary" id="init-e2b-writer-btn" style="width: 100%;">
            ⚙️ Initialize Python & Git Configuration
          </button>
        </div>

        <div class="section">
          <h3>📦 e2b Configuration</h3>

          <div class="form-group">
            <label for="e2b-api-key">
              e2b API Key
            </label>
            <input
              type="password"
              id="e2b-api-key"
              placeholder="e2b_..."
            />
            <div class="hint">This will be encrypted by Keboola (stored with # prefix)</div>
          </div>

          <div class="form-group">
            <label for="e2b-template">Sandbox Template</label>
            <select id="e2b-template">
              <option value="">Default (e2b code-interpreter)</option>
              <option value="__custom__">Custom template...</option>
            </select>
            <div class="hint">Use default or specify a custom template ID built via e2b CLI</div>
          </div>

          <div class="form-group" id="custom-template-group" style="display: none;">
            <label for="e2b-template-custom">Custom Template ID</label>
            <input
              type="text"
              id="e2b-template-custom"
              placeholder="your-template-id"
            />
            <div class="hint">Enter the template ID from 'e2b template build'</div>
          </div>

          <div class="form-group">
            <label for="e2b-timeout">Timeout (seconds)</label>
            <input
              type="number"
              id="e2b-timeout"
              value="1800"
              min="60"
              max="86400"
            />
            <div class="hint">Default: 1800 (30 minutes)</div>
          </div>

          <div class="form-group">
            <label for="log-level">Log Level</label>
            <select id="log-level">
              <option value="ERROR">ERROR - Only errors</option>
              <option value="WARNING">WARNING - Warnings + errors</option>
              <option value="INFO" selected>INFO - Normal (recommended)</option>
              <option value="DEBUG">DEBUG - Verbose (detailed output)</option>
            </select>
            <div class="hint">Controls logging verbosity (default: INFO)</div>
          </div>

          <div class="form-group">
            <label style="display: flex; align-items: center; cursor: pointer;">
              <input type="checkbox" id="selftest" style="margin-right: 8px;">
              <span>Self-test Mode</span>
            </label>
            <div class="hint">Run e2b sandbox tests instead of processing input data (for debugging)</div>
          </div>
        </div>

        <div class="section">
          <button class="btn btn-primary" id="save-config-btn">
            Update User Parameters
          </button>
          <button class="btn btn-secondary" id="close-panel-btn">
            Cancel
          </button>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(shadowHost);

  // Populate context info
  const ctx = extractContext();
  if (ctx) {
    shadow.getElementById('project-id').textContent = ctx.projectId;
    shadow.getElementById('config-id').textContent = ctx.configId;
    shadow.getElementById('stack').textContent = ctx.stack;
  }

  // Event listeners
  shadow.getElementById('close-panel').addEventListener('click', closePanel);
  shadow.getElementById('close-panel-btn').addEventListener('click', closePanel);
  shadow.getElementById('panel-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'panel-overlay') closePanel();
  });
  shadow.getElementById('save-config-btn').addEventListener('click', saveConfiguration);
  shadow.getElementById('init-e2b-writer-btn').addEventListener('click', initializeE2bWriter);

  // Template selector - show/hide custom template input
  shadow.getElementById('e2b-template').addEventListener('change', (e) => {
    const customGroup = shadow.getElementById('custom-template-group');
    if (e.target.value === '__custom__') {
      customGroup.style.display = 'block';
    } else {
      customGroup.style.display = 'none';
    }
  });

  return shadow;
}

// Toggle panel visibility
function togglePanel() {
  const panel = document.getElementById('kbc-e2b-extension-root')?.shadowRoot?.getElementById('panel-overlay');
  if (panel) {
    panel.classList.toggle('visible');

    if (panel.classList.contains('visible')) {
      // Load configuration (helper injection is awaited inside)
      loadCurrentConfiguration();
    }
  }
}

// Close panel
function closePanel() {
  const panel = document.getElementById('kbc-e2b-extension-root')?.shadowRoot?.getElementById('panel-overlay');
  if (panel) {
    panel.classList.remove('visible');
  }
}

// Show status message
function showStatus(message, type = 'info') {
  const shadow = document.getElementById('kbc-e2b-extension-root')?.shadowRoot;
  if (!shadow) return;

  const statusEl = shadow.getElementById('status-message');
  statusEl.textContent = message;
  statusEl.className = `status-message visible ${type}`;

  if (type === 'success') {
    setTimeout(() => {
      statusEl.classList.remove('visible');
    }, 5000);
  }
}

// Initialize e2b Writer configuration (Python version + Git repo)
async function initializeE2bWriter() {
  const shadow = document.getElementById('kbc-e2b-extension-root')?.shadowRoot;
  if (!shadow) return;

  showStatus('Initializing e2b Writer configuration...', 'info');
  const initBtn = shadow.getElementById('init-e2b-writer-btn');
  initBtn.disabled = true;

  try {
    // Step 1: Set Python version to 3.13
    console.log('[e2b Extension] Setting Python version to 3.13...');
    const pythonRadios = Array.from(document.querySelectorAll('input[type="radio"]')).filter(r => {
      const label = r.parentElement?.textContent || '';
      return label.includes('Python 3.13');
    });

    if (pythonRadios.length === 0) {
      throw new Error('Could not find Python 3.13 radio button');
    }

    pythonRadios[0].click();
    console.log('[e2b Extension] ✓ Python 3.13 selected');

    // Wait for UI to update
    await new Promise(resolve => setTimeout(resolve, 300));

    // Step 2: Select "Get from Git repository" option
    console.log('[e2b Extension] Setting source to Git repository...');
    const gitRadios = Array.from(document.querySelectorAll('input[type="radio"]')).filter(r => {
      const label = r.parentElement?.textContent || '';
      return label.includes('Get from Git repository');
    });

    if (gitRadios.length === 0) {
      throw new Error('Could not find "Get from Git repository" radio button');
    }

    gitRadios[0].click();
    console.log('[e2b Extension] ✓ Git repository mode selected');

    // Wait for Git form fields to appear
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 3: Fill in Git repository details
    console.log('[e2b Extension] Filling in Git repository details...');

    // Find and fill Repository URL
    const repoUrlInputs = Array.from(document.querySelectorAll('input[type="text"], input[type="url"]')).filter(input => {
      const label = input.previousElementSibling?.textContent || input.parentElement?.textContent || '';
      return label.toLowerCase().includes('repository') && label.toLowerCase().includes('url');
    });

    if (repoUrlInputs.length > 0) {
      repoUrlInputs[0].value = 'https://github.com/keboola/e2b_writer_custom_python';
      repoUrlInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      repoUrlInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
      console.log('[e2b Extension] ✓ Repository URL set');
    } else {
      console.warn('[e2b Extension] Could not find Repository URL field');
    }

    // Select "Public" radio button (if exists)
    const publicRadios = Array.from(document.querySelectorAll('input[type="radio"]')).filter(r => {
      const label = r.parentElement?.textContent || r.nextElementSibling?.textContent || '';
      return label.trim() === 'Public' || label.includes('Public repository');
    });

    if (publicRadios.length > 0) {
      publicRadios[0].click();
      console.log('[e2b Extension] ✓ Public repository selected');
    }

    // Wait for form to update
    await new Promise(resolve => setTimeout(resolve, 300));

    // Note: Branch Name and Script Filename are React Select dropdowns
    // Since they default to "main" and "main.py" respectively, we can skip setting them
    // and just save with the defaults. The user can manually use "List Branches" and
    // "List Files" buttons if they want to verify or change these values.
    console.log('[e2b Extension] Skipping branch/file selection (using defaults: main/main.py)');

    // Wait a moment before saving
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 4: Click the Save button
    console.log('[e2b Extension] Looking for Save button...');
    const saveButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
      btn.textContent.trim() === 'Save' && btn.offsetParent !== null
    );

    if (saveButtons.length > 0) {
      console.log('[e2b Extension] Clicking Save button...');
      saveButtons[0].click();

      // Wait for save to complete
      await new Promise(resolve => setTimeout(resolve, 1500));

      showStatus('✓ e2b Writer initialized successfully! Python 3.13 and Git repo configured.', 'success');
      console.log('[e2b Extension] ✓ Initialization complete!');
    } else {
      showStatus('✓ Configuration set! Please click "Save" button manually to complete.', 'success');
      console.warn('[e2b Extension] Could not find Save button, user must save manually');
    }

    initBtn.disabled = false;

  } catch (error) {
    console.error('[e2b Extension] Initialization error:', error);
    showStatus(`Failed to initialize: ${error.message}`, 'error');
    initBtn.disabled = false;
  }
}

// Load current configuration from Keboola UI
async function loadCurrentConfiguration() {
  showStatus('Loading current configuration...', 'info');

  try {
    // Find the User Parameters editor (wait for helper to be ready)
    const userParamsEditor = await findUserParametersEditor();

    // Get current parameters
    const currentText = await userParamsEditor.getValue();
    if (!currentText) {
      showStatus('Ready to configure e2b', 'info');
      return;
    }

    const params = JSON.parse(currentText);
    console.log('[e2b Extension] Loaded params:', params);

    // Populate form with existing values
    const shadow = document.getElementById('kbc-e2b-extension-root')?.shadowRoot;
    if (!shadow) {
      console.error('[e2b Extension] Shadow root not found!');
      return;
    }

    let hasExistingConfig = false;

    // Check for API key (encrypted or plain)
    if (params['#e2b_api_key']) {
      console.log('[e2b Extension] Found API key in params');
      const apiKeyField = shadow.getElementById('e2b-api-key');
      if (params['#e2b_api_key'].startsWith('KBC::ProjectSecure::')) {
        // Encrypted key
        console.log('[e2b Extension] API key is encrypted');
        apiKeyField.placeholder = '•••••••• (encrypted, already set)';
        apiKeyField.value = '';
        hasExistingConfig = true;
      } else {
        // Plain text key (will be encrypted on save)
        console.log('[e2b Extension] API key is plain text');
        apiKeyField.placeholder = '•••••••• (will be encrypted on save)';
        apiKeyField.value = '';
        hasExistingConfig = true;
      }
    } else {
      console.log('[e2b Extension] No API key found in params');
    }

    // Load template
    if (params.e2b_template && params.e2b_template !== '' && params.e2b_template !== 'code-interpreter') {
      // Custom template exists (not the default code-interpreter)
      const templateField = shadow.getElementById('e2b-template');
      const customTemplateField = shadow.getElementById('e2b-template-custom');
      const customGroup = shadow.getElementById('custom-template-group');

      templateField.value = '__custom__';
      customTemplateField.value = params.e2b_template;
      customGroup.style.display = 'block';

      console.log('[e2b Extension] Set custom template to:', params.e2b_template);
      hasExistingConfig = true;
    } else {
      // Default template (code-interpreter or not specified)
      const templateField = shadow.getElementById('e2b-template');
      templateField.value = '';
      console.log('[e2b Extension] Using default template (code-interpreter)');
      if (params.e2b_template === 'code-interpreter') {
        hasExistingConfig = true;
      }
    }

    // Load timeout
    if (params.e2b_timeout) {
      const timeoutField = shadow.getElementById('e2b-timeout');
      timeoutField.value = params.e2b_timeout;
      console.log('[e2b Extension] Set timeout to:', params.e2b_timeout, 'Field value:', timeoutField.value);
      hasExistingConfig = true;
    } else {
      console.log('[e2b Extension] No timeout found in params');
    }

    // Load log level
    if (params.log_level) {
      const logLevelField = shadow.getElementById('log-level');
      logLevelField.value = params.log_level.toUpperCase();
      console.log('[e2b Extension] Set log level to:', params.log_level);
      hasExistingConfig = true;
    } else {
      console.log('[e2b Extension] No log level found in params, using default (INFO)');
    }

    // Load selftest
    if (params.selftest !== undefined) {
      const selftestField = shadow.getElementById('selftest');
      selftestField.checked = params.selftest === true;
      console.log('[e2b Extension] Set selftest to:', params.selftest);
      hasExistingConfig = true;
    } else {
      console.log('[e2b Extension] No selftest found in params, using default (false)');
    }

    if (hasExistingConfig) {
      showStatus('✓ Loaded existing e2b configuration', 'success');
      setTimeout(() => {
        showStatus('', ''); // Clear status after 2 seconds
      }, 2000);
    } else {
      showStatus('Ready to configure e2b', 'info');
    }

  } catch (error) {
    console.error('[e2b Extension] Load config error:', error);
    showStatus('Ready to configure e2b', 'info');
  }
}

// Save configuration to Keboola (via UI manipulation)
async function saveConfiguration() {
  const ctx = extractContext();
  if (!ctx) return;

  const shadow = document.getElementById('kbc-e2b-extension-root')?.shadowRoot;
  if (!shadow) return;

  // Get form values
  const apiKey = shadow.getElementById('e2b-api-key').value;
  const templateDropdown = shadow.getElementById('e2b-template').value;
  const customTemplate = shadow.getElementById('e2b-template-custom').value.trim();

  // Determine the final template value
  // If default (empty string), use 'code-interpreter' as the default template name
  let template;
  if (templateDropdown === '__custom__') {
    template = customTemplate;
  } else if (templateDropdown === '') {
    template = 'code-interpreter';  // Default e2b template
  } else {
    template = templateDropdown;
  }

  // Validate custom template
  if (templateDropdown === '__custom__' && !customTemplate) {
    showStatus('Please enter a custom template ID', 'error');
    return;
  }

  const timeout = parseInt(shadow.getElementById('e2b-timeout').value);
  const logLevel = shadow.getElementById('log-level').value;
  const selftest = shadow.getElementById('selftest').checked;

  showStatus('Updating User Parameters...', 'info');
  const saveBtn = shadow.getElementById('save-config-btn');
  saveBtn.disabled = true;

  try {
    // Find the User Parameters JSON editor in the page (wait for helper to be ready)
    const userParamsEditor = await findUserParametersEditor();

    // Get current parameters
    let currentParams = {};
    try {
      const currentText = await userParamsEditor.getValue();
      if (currentText) {
        currentParams = JSON.parse(currentText);
      }
    } catch (e) {
      console.warn('[e2b Extension] Could not parse current params, using empty object');
    }

    // Check if API key is required
    const hasExistingKey = currentParams['#e2b_api_key'];
    if (!apiKey && !hasExistingKey) {
      showStatus('Please enter e2b API key', 'error');
      saveBtn.disabled = false;
      return;
    }

    // Merge with e2b config
    const updatedParams = {
      ...currentParams,
      'e2b': true,  // Mark as e2b-enabled
      'e2b_template': template,  // Always set template (default or custom)
      'e2b_timeout': timeout,
      'log_level': logLevel,  // Log level configuration
      'selftest': selftest  // Self-test mode
    };

    // Only update API key if a new one was provided
    if (apiKey) {
      updatedParams['#e2b_api_key'] = apiKey;
    }

    console.log('[e2b Extension] Updating e2b configuration:', { template, timeout, logLevel, selftest, hasApiKey: !!apiKey });

    // Update the editor (CodeMirror 5 automatically marks as dirty)
    await userParamsEditor.setValue(JSON.stringify(updatedParams, null, 2));

    showStatus('✓ Parameters updated! Clicking Save button...', 'success');

    // Wait a moment for the Save button to appear
    await new Promise(resolve => setTimeout(resolve, 300));

    // Find and click the Save button
    const saveButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
      btn.textContent.trim() === 'Save' && btn.offsetParent !== null
    );

    if (saveButtons.length > 0) {
      console.log('[e2b Extension] Clicking Save button...');
      saveButtons[0].click();

      // Wait for save to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      showStatus('✓ Configuration saved successfully!', 'success');
    } else {
      showStatus('✓ Configuration updated! Please click "Save" button manually.', 'success');
    }

    // Clear API key field if a new one was entered
    if (apiKey) {
      shadow.getElementById('e2b-api-key').value = '';
      shadow.getElementById('e2b-api-key').placeholder = '•••••••• (encrypted, already set)';
    }

    saveBtn.disabled = false;

    // Close panel after a delay
    setTimeout(() => {
      closePanel();
    }, 2000);

  } catch (error) {
    console.error('[e2b Extension] Save error:', error);
    showStatus(`Failed to save: ${error.message}`, 'error');
    saveBtn.disabled = false;
  }
}

// Inject helper script into page context (runs once)
let helperInjected = false;
let helperReady = false;

function ensureHelperInjected() {
  if (helperInjected) return Promise.resolve();

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('content/inject-helper.js');
    script.onload = function() {
      console.log('[e2b Extension] Helper script loaded');
      this.remove();
      helperInjected = true;

      // Give it a moment to set up event listeners
      setTimeout(() => {
        helperReady = true;
        console.log('[e2b Extension] Helper script ready');
        resolve();
      }, 50);
    };
    (document.head || document.documentElement).appendChild(script);
  });
}

// Find and update the User Parameters CodeMirror editor via injected script
async function findUserParametersEditor() {
  await ensureHelperInjected();

  // Return an object with getValue and setValue methods
  // These communicate with the helper script via CustomEvents
  return {
    getValue: () => {
      return new Promise((resolve) => {
        const handler = (e) => {
          document.removeEventListener('e2b-cm-value', handler);
          resolve(e.detail);
        };

        document.addEventListener('e2b-cm-value', handler);
        document.dispatchEvent(new CustomEvent('e2b-get-value'));
      });
    },
    setValue: (value) => {
      return new Promise((resolve, reject) => {
        const handler = (e) => {
          document.removeEventListener('e2b-cm-set', handler);
          if (e.detail === 'success') {
            resolve();
          } else {
            reject(new Error('User Parameters editor not found'));
          }
        };

        document.addEventListener('e2b-cm-set', handler);
        document.dispatchEvent(new CustomEvent('e2b-set-value', { detail: value }));
      });
    }
  };
}

// Get Keboola token from storage
async function getKeboolaToken() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_TOKEN' }, (response) => {
      if (response && response.success) {
        resolve(response.token);
      } else {
        resolve(null);
      }
    });
  });
}

// Main injection function
async function injectExtension() {
  if (document.getElementById('kbc-e2b-extension-root')) {
    console.log('[e2b Extension] Already injected, skipping');
    return; // Already injected
  }

  console.log('[e2b Extension] Checking if e2b is enabled...');

  const ctx = extractContext();
  if (!ctx) {
    console.warn('[e2b Extension] Failed to extract context');
    return;
  }

  extensionContext = ctx;

  // Check if e2b is enabled (has e2b: true in User Parameters)
  const e2bEnabled = await isE2bInstalled();

  if (!e2bEnabled) {
    console.log('[e2b Extension] e2b not enabled (e2b: true not found in User Parameters). Button will not be injected.');
    return; // Don't inject anything if e2b is not enabled
  }

  console.log('[e2b Extension] e2b is enabled, injecting UI...');

  // Find injection point
  const actionList = findActionList();
  if (!actionList) {
    console.warn('[e2b Extension] Could not find action list');
    // Retry after a delay (page might still be loading)
    setTimeout(injectExtension, 1000);
    return;
  }

  // Check if button already exists
  if (document.getElementById('kbc-e2b-button-item')) {
    console.log('[e2b Extension] Button already exists, skipping injection');
    return;
  }

  // Create and inject button
  const extensionItem = createExtensionButton();
  const debugModeItem = findDebugModeItem(actionList);

  if (debugModeItem) {
    debugModeItem.insertAdjacentElement('afterend', extensionItem);
  } else {
    actionList.appendChild(extensionItem);
  }

  // Create panel
  createExtensionPanel();

  console.log('[e2b Extension] UI injected successfully');
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
  console.log('[e2b Extension] Initializing...');

  if (shouldInject()) {
    // Wait a bit for the page to fully render
    setTimeout(injectExtension, 500);
  }

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Listen for navigation
  window.addEventListener('popstate', checkNavigation);
}

// Wait for DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
