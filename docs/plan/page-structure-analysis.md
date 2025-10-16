# Keboola Connection Page Structure Analysis

## Page Context
- **URL**: `https://connection.eu-central-1.keboola.com/admin/projects/33/components/kds-team.app-custom-python/01k7pkk4qg6jprstza74572x8f`
- **Page Title**: "Padák - EU - Components / Custom Python / e2b mockup"
- **Component Type**: Custom Python (kds-team.app-custom-python)
- **Configuration ID**: 01k7pkk4qg6jprstza74572x8f

## Key UI Elements

### 1. Page Header
- **Project Selector**: "Padák - EU" (shows organization → project hierarchy)
- **Environment Badge**: "Production"
- **User Menu**: Profile picture and settings access

### 2. Navigation Sidebar
Left sidebar with main sections:
- Dashboard
- Flows
- Components
- Templates
- Data Catalog
- Storage
- Transformations
- Workspaces
- Jobs

### 3. Component Header Section
- **Breadcrumb Navigation**: Components → Custom Python
- **Configuration Name**: "e2b mockup" (editable dropdown)
- **Component Icon**: Custom Python logo

### 4. Configuration Tabs
- **Information & Settings** (active)
- **Notifications**
- **Versions**

### 5. Left Content Panel (Main Configuration)

#### A. Component Information Card (Collapsible)
Shows:
- Type: Application
- Author: Keboola
- Stage: Beta
- Used in: 0 flows
- Data: None
- Additional Links: Documentation, License

#### B. Component Description
Full description of Custom Python component:
- Purpose and use cases
- Comparison to Python Transformations
- Key features (secure parameters, customizable environment, flexible execution)

#### C. Configuration Sections

##### i. Description
- "Add description" button
- "Generate description" button (AI-powered)

##### ii. Configuration Description (Collapsible)
Pre-filled text explaining the Python backend environment

##### iii. Table Input Mapping
- "New Table Input" button
- Currently empty

##### iv. File Input Mapping
- "New File Input" button
- Currently empty

##### v. Table Output Mapping
- "New Table Output" button
- Currently empty

##### vi. File Output Mapping
- "New File Output" button
- Currently empty

##### vii. Variables
- "New Variable" button
- Helper text linking to documentation

##### viii. Configuration Parameters
**Critical section for extension integration!**

Contains:
1. **Python Version & Environment Isolation** (Required)
   - Radio buttons for:
     - Python 3.14 RC – Isolated
     - Python 3.13 – Isolated (recommended 🐙)
     - Python 3.12 – Isolated
     - Python 3.10 – Shared environment (legacy)
   - Currently shows validation error: "Object is missing the required property 'Python Version & Environment Isolation'"

2. **User Parameters** (JSON Editor)
   - Current value:
   ```json
   {
     "debug": false
   }
   ```
   - Note: "Properties prefixed with `#` sign will be encrypted on save"
   - **THIS IS WHERE E2B CONFIG WILL BE ADDED**

3. **Source Code & Dependencies**
   - Radio buttons:
     - "Enter manually into text areas below" (selected)
     - "Get from Git repository"

4. **Python Packages** (Combobox)
   - "Select or create..." dropdown
   - Links to documentation

5. **Python Code** (Code Editor)
   - Current code:
   ```python
   from keboola.component import CommonInterface

   ci = CommonInterface()
   # access user parameters
   print(ci.configuration.parameters)
   ```

##### ix. Processors (Collapsible)
JSON editor showing:
```json
{
  "before": [],
  "after": []
}
```

### 6. Right Action Panel

#### A. Action Buttons (List)
1. **Run component** (primary button)
   - With separator
2. **Timeout: 1d** (shows timeout setting)
3. **Copy configuration**
4. **Automate**
5. **Debug mode** (links to raw config view)
6. Separator
7. **Delete configuration** (danger action)

**→ EXTENSION BUTTON WILL BE INSERTED HERE**

#### B. Last Use Section
- Heading: "Last Use"
- Currently: "No uses found"

#### C. Versions Section
- Heading: "Versions" with "See Latest Changes" button
- Shows version #1: "Configuration created"
- Timestamp: "11 minutes ago by Petr EU Šimeček"
- "Show All Versions" link

## Extension Integration Points

### Primary Injection Target
**Location**: Right action panel, between "Debug mode" and "Last Use" section
- **Ref**: Insert after `listitem [ref=e451]`
- **Button Style**: Match existing action buttons (`button [cursor=pointer]` with icon + text)

### Configuration Update Target
**Location**: User Parameters JSON editor
- **Ref**: `textbox [ref=e325]` in Configuration Parameters section
- **Data Path**: `configuration.parameters` in component config
- **Extension will add**:
  ```json
  {
    "debug": false,
    "#e2b_api_key": "encrypted_key",
    "e2b_template": "python-3.13",
    "e2b_timeout": 1800,
    "e2b_uploaded_files": [...]
  }
  ```

## DOM Selectors for Extension

### Recommended Stable Selectors
```javascript
// Component header (for context validation)
const componentHeader = document.querySelector('[data-testid="ComponentDetailHeader"]');

// Configuration name dropdown
const configName = document.querySelector('button[ref="e120"]'); // Contains "e2b mockup"

// Right action panel list
const actionList = document.querySelector('list[ref="e428"]');

// Last Use section (insertion point above this)
const lastUseSection = document.querySelector('heading[ref="e458"]')?.closest('generic');

// User Parameters JSON editor
const userParamsEditor = document.querySelector('textbox[ref="e325"]');
```

### Insertion Strategy
```javascript
// Find the "Debug mode" list item
const debugModeItem = document.querySelector('listitem[ref="e451"]');

// Create extension button list item
const extensionItem = document.createElement('listitem');
extensionItem.innerHTML = `
  <button id="kbc-e2b-toggle">
    <img src="${extensionIcon}" />
    <text>e2b Integration</text>
  </button>
`;

// Insert after Debug mode
debugModeItem.insertAdjacentElement('afterend', extensionItem);
```

## API Access Points

### Storage API Token
- **Detection method**: Intercept XHR/fetch requests to Keboola API
- **Header name**: `X-StorageApi-Token`
- **Example request**: Any request to `/v2/storage/*`

### Current Configuration Endpoint
```
GET https://connection.eu-central-1.keboola.com/v2/storage/components/kds-team.app-custom-python/configs/01k7pkk4qg6jprstza74572x8f
```

### Update Configuration Endpoint
```
PATCH https://connection.eu-central-1.keboola.com/v2/storage/components/kds-team.app-custom-python/configs/01k7pkk4qg6jprstza74572x8f
```

## SPA Navigation Detection

### URL Pattern Changes
- No full page reload when navigating between:
  - Configurations (different `configId`)
  - Tabs (Information & Settings → Notifications → Versions)
  - Components (different `componentId`)

### Detection Strategy
```javascript
// Use MutationObserver on URL bar or router state
let lastUrl = location.href;
new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    if (urlMatchesCustomPython(currentUrl)) {
      injectExtension();
    } else {
      removeExtension();
    }
  }
}).observe(document.body, { subtree: true, childList: true });

// Also listen to popstate for back/forward navigation
window.addEventListener('popstate', () => {
  if (urlMatchesCustomPython(location.href)) {
    injectExtension();
  }
});
```

## Console Warnings (Observed)
- Multiple FeatureGateClients warnings (Keboola's internal feature flagging)
- DOM autocomplete suggestion (password field)
- Jira Service Management Widget events

These don't affect extension functionality.

## Screenshots
- Full page screenshot: `docs/plan/keboola-config-page.png`

---

## Key Takeaways for Extension Development

1. ✅ **Clear injection point identified**: Right action panel after Debug mode button
2. ✅ **Configuration update path confirmed**: PATCH to component config endpoint
3. ✅ **User Parameters JSON structure understood**: Simple JSON object with `#` prefix for encryption
4. ✅ **URL pattern validated**: Matches research document expectations
5. ✅ **SPA navigation strategy defined**: MutationObserver + popstate listener
6. ⚠️ **DOM refs are unstable**: Use semantic selectors or data-testid attributes where possible
7. ⚠️ **Token capture required**: Need to intercept API calls to get Storage API token

### Next Steps
1. Build content script with URL detection
2. Implement DOM observer for SPA navigation
3. Create Shadow DOM panel UI
4. Test token interception strategy
5. Implement configuration PATCH logic

