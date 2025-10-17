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
  item.style.cssText = 'list-style: none; margin-bottom: 8px;';
  item.id = 'kbc-e2b-button-item';

  item.innerHTML = `
    <button id="kbc-e2b-toggle" style="
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 16px;
      background: #ff8800;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 15px;
      width: 100%;
      text-align: center;
      font-family: inherit;
      color: white;
      font-weight: 500;
      transition: all 0.2s;
      box-shadow: 0 2px 4px rgba(255, 136, 0, 0.2);
      height: 40px;
    " onmouseover="this.style.background='#e67a00'; this.style.boxShadow='0 4px 8px rgba(255, 136, 0, 0.3)';" onmouseout="this.style.background='#ff8800'; this.style.boxShadow='0 2px 4px rgba(255, 136, 0, 0.2)';">
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
      return label.includes('Public') && (label.includes('None') || label.includes('repository'));
    });

    if (publicRadios.length > 0) {
      publicRadios[0].click();
      console.log('[e2b Extension] ✓ Public repository selected');
    } else {
      console.warn('[e2b Extension] Could not find Public radio button. Available radios:',
        Array.from(document.querySelectorAll('input[type="radio"]')).map(r => ({
          value: r.value,
          checked: r.checked,
          label: r.parentElement?.textContent || r.nextElementSibling?.textContent || ''
        }))
      );
    }

    // Wait for form to update
    await new Promise(resolve => setTimeout(resolve, 300));

    // Note: Branch Name and Script Filename are React Select dropdowns
    // Since they default to "main" and "main.py" respectively, we can skip setting them
    // and just save with the defaults. The user can manually use "List Branches" and
    // "List Files" buttons if they want to verify or change these values.
    console.log('[e2b Extension] Skipping branch/file selection (using defaults: main/main.py)');

    // Wait for form to settle
    await new Promise(resolve => setTimeout(resolve, 500));

    // Configuration complete - now click Save button
    showStatus('✓ Configuration ready! Clicking Save button...', 'success');
    console.log('[e2b Extension] ✓ Configuration complete! Clicking Save button...');

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
      showStatus('✓ Configuration ready! Please click "Save" button manually.', 'success');
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

// Hide unnecessary UI sections to simplify the interface
function hideUnnecessarySections() {
  console.log('[e2b Extension] Hiding unnecessary UI sections...');

  // Inject CSS to hide specific sections
  const style = document.createElement('style');
  style.id = 'e2b-hide-sections';
  style.textContent = `
    /* Hide Table Output Mapping section */
    h3:has-text("Table Output Mapping"),
    h3:contains("Table Output Mapping") {
      display: none !important;
    }

    /* More robust way: hide by checking heading content */
    h3 {
      &:has-text("Table Output Mapping"),
      &:has-text("File Output Mapping"),
      &:has-text("Variables") {
        display: none !important;
      }
    }
  `;

  // Find sections by heading text and hide them
  const headings = Array.from(document.querySelectorAll('h3'));
  headings.forEach(heading => {
    const text = heading.textContent.trim();
    if (text === 'Table Output Mapping' ||
        text === 'File Output Mapping' ||
        text === 'Variables') {
      // Hide the entire section (the parent container)
      const section = heading.closest('div[class*="form"], div[class*="section"], div');
      if (section && section.parentElement) {
        section.style.display = 'none';
        console.log(`[e2b Extension] Hidden section: ${text}`);
      }
    }
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

  // Create and inject button at the top (before RUN button)
  const extensionItem = createExtensionButton();

  // Insert as first child of the action list
  if (actionList.firstChild) {
    actionList.insertBefore(extensionItem, actionList.firstChild);
  } else {
    actionList.appendChild(extensionItem);
  }

  // Create panel
  createExtensionPanel();

  // Hide unnecessary sections to simplify UI
  hideUnnecessarySections();

  // Replace component icon with e2b logo
  replaceComponentIcon();

  // Inject e2b tab
  injectE2bTab();

  console.log('[e2b Extension] UI injected successfully');
}

// Hide unnecessary UI sections to simplify the interface
function hideUnnecessarySections() {
  console.log('[e2b Extension] Hiding unnecessary UI sections...');

  const headings = Array.from(document.querySelectorAll('h3'));

  // 1. Configuration Description - hide the collapsible box
  const configDescHeading = headings.find(h => h.textContent.trim() === 'Configuration Description');
  if (configDescHeading) {
    const container = configDescHeading.closest('.box-collapsible');
    if (container) {
      container.style.display = 'none';
      console.log('[e2b Extension] Hidden section: Configuration Description');
    }
  }

  // 2. Table Output Mapping - hide the .box.no-mapping container
  const tableOutputHeading = headings.find(h => h.textContent.trim() === 'Table Output Mapping');
  if (tableOutputHeading) {
    const container = tableOutputHeading.closest('.box.no-mapping');
    if (container) {
      container.style.display = 'none';
      console.log('[e2b Extension] Hidden section: Table Output Mapping');
    }
  }

  // 3. File Output Mapping - hide the .box container
  const fileOutputHeading = headings.find(h => h.textContent.trim() === 'File Output Mapping');
  if (fileOutputHeading) {
    const container = fileOutputHeading.closest('.box');
    if (container) {
      container.style.display = 'none';
      console.log('[e2b Extension] Hidden section: File Output Mapping');
    }
  }

  // 4. Variables - hide the .box.box-genericVariablesUI container
  const variablesHeading = headings.find(h => h.textContent.trim() === 'Variables');
  if (variablesHeading) {
    const container = variablesHeading.closest('.box-genericVariablesUI');
    if (container) {
      container.style.display = 'none';
      console.log('[e2b Extension] Hidden section: Variables');
    }
  }

  // 5. Processors - hide the .box-collapsible container
  const processorsHeading = headings.find(h => h.textContent.trim() === 'Processors');
  if (processorsHeading) {
    const container = processorsHeading.closest('.box-collapsible');
    if (container) {
      container.style.display = 'none';
      console.log('[e2b Extension] Hidden section: Processors');
    }
  }

  // 6. Python Version & Environment - hide but keep in DOM for programmatic control
  // Find Python version radio buttons first
  const pythonRadios = Array.from(document.querySelectorAll('input[type="radio"]')).filter(r => {
    const label = r.parentElement?.textContent || '';
    return label.includes('Python 3.') || label.includes('python');
  });

  if (pythonRadios.length > 0) {
    // Find the form-group container
    let container = pythonRadios[0].closest('.form-group');

    // Look for label containing "Python Version"
    if (container && !container.querySelector('.e2b-python-notice')) {
      const hasLabel = container.querySelector('label, div, span')?.textContent?.includes('Python');
      if (hasLabel) {
        // Find the common parent that contains ALL radio buttons
        // This is the div that has all 4 radio button divs as children
        let commonParent = pythonRadios[0];
        for (let i = 0; i < 5; i++) {
          commonParent = commonParent.parentElement;
          if (!commonParent) break;

          // Check if this contains all radio buttons
          const containsAll = pythonRadios.every(radio => commonParent.contains(radio));
          if (containsAll && commonParent.children.length === pythonRadios.length) {
            // Found the common parent - hide it
            commonParent.style.cssText = 'position: absolute; left: -9999px; visibility: hidden;';
            console.log('[e2b Extension] Hidden common parent of', pythonRadios.length, 'radio buttons');
            break;
          }
        }

        // Hide the label too if it exists
        const label = container.querySelector('label');
        if (label) {
          label.style.cssText = 'position: absolute; left: -9999px; visibility: hidden;';
        }

        // Add informational message at the top
        const notice = document.createElement('div');
        notice.className = 'e2b-python-notice';
        notice.style.cssText = 'padding: 15px; background: #f5f5f5; border-left: 4px solid #0066cc; margin-bottom: 20px;';
        notice.innerHTML = '<strong>Python Environment:</strong> Managed by e2b Integration';
        container.insertBefore(notice, container.firstChild);

        console.log('[e2b Extension] Hidden (but kept in DOM) Python Version section');
      }
    }
  }

  // 7. User Parameters - add informational text
  const userParamsLabel = Array.from(document.querySelectorAll('label')).find(label =>
    label.textContent.trim() === 'User Parameters'
  );
  if (userParamsLabel) {
    const formGroup = userParamsLabel.closest('.form-group');
    if (formGroup && !formGroup.querySelector('.e2b-user-params-notice')) {
      const notice = document.createElement('div');
      notice.className = 'e2b-user-params-notice';
      notice.style.cssText = 'padding: 10px; background: #e8f4f8; border-left: 4px solid #0066cc; margin-bottom: 10px; font-size: 13px;';
      notice.innerHTML = '<strong>ℹ️ Note:</strong> These parameters are managed through the <strong>e2b Integration</strong> panel (see button in sidebar).';

      // Insert after the label
      userParamsLabel.parentElement.insertBefore(notice, userParamsLabel.nextSibling);
      console.log('[e2b Extension] Added User Parameters notice');
    }
  }

  // 8. Source Code & Dependencies - hide radio buttons but keep in DOM for programmatic control
  // Find "Write your code inline" or "Get from Git repository" radio buttons
  const sourceCodeRadios = Array.from(document.querySelectorAll('input[type="radio"]')).filter(r => {
    const label = r.parentElement?.textContent || '';
    return label.includes('Write your code inline') || label.includes('Get from Git repository');
  });

  if (sourceCodeRadios.length > 0) {
    // Find the common parent that contains ALL source code radio buttons
    let commonParent = sourceCodeRadios[0];
    for (let i = 0; i < 5; i++) {
      commonParent = commonParent.parentElement;
      if (!commonParent) break;

      // Check if this contains all radio buttons
      const containsAll = sourceCodeRadios.every(radio => commonParent.contains(radio));
      if (containsAll && commonParent.children.length === sourceCodeRadios.length) {
        // Found the common parent - hide it
        commonParent.style.cssText = 'position: absolute; left: -9999px; visibility: hidden;';
        console.log('[e2b Extension] Hidden (but kept in DOM) common parent of', sourceCodeRadios.length, 'Source Code radio buttons');
        break;
      }
    }

    // Also hide the label/heading if it exists
    const sourceCodeLabels = Array.from(document.querySelectorAll('label, div')).filter(el =>
      el.textContent.includes('Source Code & Dependencies') && el.textContent.length < 100
    );
    if (sourceCodeLabels.length > 0) {
      sourceCodeLabels[0].style.cssText = 'position: absolute; left: -9999px; visibility: hidden;';
      console.log('[e2b Extension] Hidden Source Code heading');
    }
  }
}

// Replace the component icon with e2b logo
function replaceComponentIcon() {
  console.log('[e2b Extension] Replacing component icon with e2b logo...');

  // Find the component icon image
  const componentIcon = document.querySelector('img.component-icon');

  if (componentIcon) {
    // Get the extension's e2b.png URL
    const e2bLogoUrl = chrome.runtime.getURL('public/e2b.png');

    // Replace the icon
    componentIcon.src = e2bLogoUrl;

    // Remove conflicting CSS classes
    componentIcon.classList.remove('bg-color-white');

    // Adjust styling with e2b brand orange background (using !important to override CSS)
    componentIcon.style.setProperty('padding', '8px', 'important');
    componentIcon.style.setProperty('background-color', '#ff8800', 'important');  // e2b brand orange

    console.log('[e2b Extension] ✓ Component icon replaced with e2b logo');
  } else {
    console.warn('[e2b Extension] Component icon not found, retrying...');
    // Retry after a delay (page might still be loading)
    setTimeout(() => {
      const retryIcon = document.querySelector('img.component-icon');
      if (retryIcon) {
        const e2bLogoUrl = chrome.runtime.getURL('public/e2b.png');
        retryIcon.src = e2bLogoUrl;

        // Remove conflicting CSS classes
        retryIcon.classList.remove('bg-color-white');

        // Apply styling with !important
        retryIcon.style.setProperty('padding', '8px', 'important');
        retryIcon.style.setProperty('background-color', '#ff8800', 'important');  // e2b brand orange

        console.log('[e2b Extension] ✓ Component icon replaced with e2b logo (retry)');
      }
    }, 500);
  }
}

// Inject "e2b in Keboola" tab next to "Versions" tab
function injectE2bTab() {
  console.log('[e2b Extension] Injecting e2b tab...');

  // Find the tab navigation (ul.nav.nav-tabs)
  const tabNav = document.querySelector('ul.nav.nav-tabs[role="navigation"]');
  if (!tabNav) {
    console.warn('[e2b Extension] Tab navigation not found, retrying...');
    setTimeout(injectE2bTab, 1000);
    return;
  }

  // Check if tab already exists
  if (document.getElementById('e2b-changelog-tab')) {
    console.log('[e2b Extension] e2b tab already exists, skipping injection');
    return;
  }

  // Extract the base URL from current location
  const urlParts = location.pathname.split('/');
  const configId = urlParts[urlParts.length - 1];
  const baseUrl = location.pathname.replace(/\/(notifications|versions)$/, '');
  const e2bUrl = `${baseUrl}/e2b-changelog`;

  // Create the new tab
  const e2bTab = document.createElement('li');
  e2bTab.role = 'presentation';
  e2bTab.id = 'e2b-changelog-tab';

  const e2bLink = document.createElement('a');
  e2bLink.role = 'tab';
  e2bLink.href = e2bUrl;
  e2bLink.style.cssText = 'color: #ff8800; font-weight: 600;';  // e2b brand orange

  // Create icon (using a custom icon for e2b)
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('focusable', 'false');
  icon.setAttribute('class', 'svg-inline--fa icon-addon-right');
  icon.setAttribute('role', 'img');
  icon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  icon.setAttribute('viewBox', '0 0 512 512');
  icon.setAttribute('width', '14');
  icon.setAttribute('height', '14');
  icon.style.cssText = 'margin-right: 8px; vertical-align: -2px;';

  // Use book icon for documentation/changelog
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('fill', 'currentColor');
  path.setAttribute('d', 'M96 0C43 0 0 43 0 96V416c0 53 43 96 96 96H384h32c17.7 0 32-14.3 32-32s-14.3-32-32-32V384c17.7 0 32-14.3 32-32V32c0-17.7-14.3-32-32-32H384 96zm0 384H352v64H96c-17.7 0-32-14.3-32-32s14.3-32 32-32zm32-240c0-8.8 7.2-16 16-16H336c8.8 0 16 7.2 16 16s-7.2 16-16 16H144c-8.8 0-16-7.2-16-16zm16 48H336c8.8 0 16 7.2 16 16s-7.2 16-16 16H144c-8.8 0-16-7.2-16-16s7.2-16 16-16z');

  icon.appendChild(path);
  e2bLink.appendChild(icon);
  e2bLink.appendChild(document.createTextNode('e2b in Keboola'));

  e2bTab.appendChild(e2bLink);

  // Add click handler to show changelog content
  e2bLink.addEventListener('click', (e) => {
    e.preventDefault();
    showChangelogContent();

    // Update URL without reload
    history.pushState(null, '', e2bUrl);

    // Update tab states
    document.querySelectorAll('[role="tab"]').forEach(tab => {
      tab.classList.remove('active');
      tab.removeAttribute('aria-current');
      if (tab.parentElement) {
        tab.parentElement.classList.remove('active');
      }
    });
    e2bLink.classList.add('active');
    e2bLink.setAttribute('aria-current', 'page');
    e2bTab.classList.add('active');
  });

  // Insert after the "Versions" tab
  tabNav.appendChild(e2bTab);

  // Check if we should show changelog on page load
  if (location.pathname.endsWith('/e2b-changelog')) {
    showChangelogContent();
    e2bLink.classList.add('active');
    e2bLink.setAttribute('aria-current', 'page');
    e2bTab.classList.add('active');
  }

  // Add listeners to other tabs to restore content
  const otherTabs = tabNav.querySelectorAll('a[role="tab"]');
  otherTabs.forEach(tab => {
    if (tab === e2bLink) return; // Skip our tab

    tab.addEventListener('click', () => {
      // Hide changelog content when switching to other tabs
      const changelogContainer = document.getElementById('e2b-changelog-container');
      if (changelogContainer) {
        changelogContainer.style.display = 'none';
      }

      // Show original content (info panel and tab content)
      const mainContainer = tabNav.parentElement.parentElement;
      if (mainContainer) {
        Array.from(mainContainer.children).forEach((child, idx) => {
          if (idx > 0 && child.id !== 'e2b-changelog-container') {
            child.style.display = '';
          }
        });
      }
    });
  });

  console.log('[e2b Extension] ✓ e2b tab injected successfully');
}

// Show changelog content in the main area
async function showChangelogContent() {
  console.log('[e2b Extension] Showing changelog content...');

  // Find the tab navigation first
  const tabNav = document.querySelector('ul.nav.nav-tabs[role="navigation"]');
  if (!tabNav) {
    console.warn('[e2b Extension] Tab navigation not found');
    return;
  }

  // The main container has 3 children: [0] tabs, [1] info panel, [2] actual content
  const mainContainer = tabNav.parentElement.parentElement;
  if (!mainContainer) {
    console.warn('[e2b Extension] Main container not found');
    return;
  }

  console.log('[e2b Extension] Found main container:', mainContainer);

  // Hide the component info panel (child 1) and the tab content (child 2)
  Array.from(mainContainer.children).forEach((child, idx) => {
    if (idx > 0) {  // Skip the tabs wrapper (index 0)
      child.style.display = 'none';
    }
  });

  // Check if changelog container already exists
  let changelogContainer = document.getElementById('e2b-changelog-container');
  if (changelogContainer) {
    changelogContainer.style.display = 'block';
    return;
  }

  // Create new container for changelog
  changelogContainer = document.createElement('div');
  changelogContainer.id = 'e2b-changelog-container';
  changelogContainer.className = 'row';  // Match the class of the original content
  changelogContainer.style.cssText = 'padding: 40px 20px; max-width: 1200px; margin: 0 auto;';

  // Show loading state
  changelogContainer.innerHTML = '<p style="text-align: center; color: #666;">Loading changelog...</p>';
  mainContainer.appendChild(changelogContainer);

  // Fetch changelog from GitHub
  const currentBranch = 'fix/keboola-api-key-integration';
  const changelogUrl = `https://raw.githubusercontent.com/keboola/e2b_writer_custom_python/${currentBranch}/CHANGELOG-SHORT.md`;

  try {
    const response = await fetch(changelogUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const markdown = await response.text();

    // Convert markdown to HTML (basic conversion)
    const html = markdownToHtml(markdown);

    changelogContainer.innerHTML = html;
    console.log('[e2b Extension] ✓ Changelog content displayed');
  } catch (error) {
    console.error('[e2b Extension] Failed to load changelog:', error);
    changelogContainer.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <h3 style="color: #d32f2f;">Failed to load changelog</h3>
        <p style="color: #666; margin: 10px 0;">Could not fetch CHANGELOG-SHORT.md from GitHub.</p>
        <a href="https://github.com/keboola/e2b_writer_custom_python/blob/${currentBranch}/CHANGELOG-SHORT.md"
           target="_blank"
           rel="noopener noreferrer"
           style="color: #ff8800; text-decoration: none; font-weight: 600;">
          View on GitHub →
        </a>
      </div>
    `;
  }
}

// Simple markdown to HTML converter (basic implementation)
function markdownToHtml(markdown) {
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3 style="color: #333; margin: 20px 0 10px 0;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="color: #ff8800; margin: 30px 0 15px 0; border-bottom: 2px solid #ff8800; padding-bottom: 5px;">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 style="color: #333; margin: 0 0 20px 0;">$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code
    .replace(/`([^`]+)`/g, '<code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace;">$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #ff8800; text-decoration: none;">$1</a>')
    // Horizontal rule
    .replace(/^---$/gim, '<hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />')
    // Ordered list items (numbered)
    .replace(/^\d+\.\s+(.*)$/gim, '<li-ordered style="margin: 5px 0;">$1</li-ordered>')
    // Unordered list items
    .replace(/^- (.*)$/gim, '<li-unordered style="margin: 5px 0;">$1</li-unordered>')
    // Checkmarks
    .replace(/✅/g, '<span style="color: #4caf50;">✅</span>');

  // Wrap ordered list items in ol tags
  html = html.replace(/(<li-ordered[^>]*>.*<\/li-ordered>\s*)+/gs, (match) => {
    const items = match.replace(/<li-ordered/g, '<li').replace(/<\/li-ordered>/g, '</li>');
    return `<ol style="margin: 10px 0; padding-left: 25px;">${items}</ol>`;
  });

  // Wrap unordered list items in ul tags
  html = html.replace(/(<li-unordered[^>]*>.*<\/li-unordered>\s*)+/gs, (match) => {
    const items = match.replace(/<li-unordered/g, '<li').replace(/<\/li-unordered>/g, '</li>');
    return `<ul style="margin: 10px 0; padding-left: 25px;">${items}</ul>`;
  });

  // Wrap paragraphs
  html = html.split('\n\n').map(para => {
    if (para.trim() && !para.startsWith('<')) {
      return `<p style="margin: 10px 0; line-height: 1.6; color: #333;">${para}</p>`;
    }
    return para;
  }).join('\n');

  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">${html}</div>`;
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
