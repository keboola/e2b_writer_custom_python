# Keboola e2b Writer - Chrome Extension

A Chrome extension that integrates Keboola Connection's Custom Python component with [e2b](https://e2b.dev/) (ephemeral sandbox environments) for secure, isolated Python code execution.

## Overview

This extension enables users to:
- **One-click initialization** of Python 3.13 environment and Git repository configuration
- Configure e2b parameters (API key, template, timeout) directly in Keboola UI
- **Automatic CSV transfer** from Keboola Input Mapping to e2b sandboxes
- Execute Python code in isolated e2b environments with synchronized data access
- Test e2b integration locally before deploying to Keboola

## Features

### Chrome Extension
- **Seamless Integration**: Automatically injects into Keboola's Custom Python component configuration pages
- **Visual Branding**: Replaces component icon with e2b logo for instant recognition
- **UI Simplification**: Auto-hides unnecessary sections (Output Mapping, Variables, Processors) to streamline interface
- **One-Click Setup**: Initialize Python 3.13 and Git repository configuration with a single click
- **Secure Configuration**: e2b API keys encrypted using Keboola's built-in encryption (`#e2b_api_key`)
- **Template Support**: Use default code-interpreter or custom e2b templates
- **SPA Navigation**: Works seamlessly with Keboola's single-page application architecture

### Python Integration
- **Input Mapping**: Automatic CSV file transfer from Keboola Storage to e2b sandboxes
- **CommonInterface Integration**: Uses Keboola's standard API for configuration and data access
- **Dual-Mode Support**: Works both in Keboola (production) and locally (development)
- **Comprehensive Logging**: Structured logging with timing, context, and error tracking

## Installation

### For Development

1. Clone this repository:
   ```bash
   git clone https://github.com/keboola/e2b_writer_custom_python.git
   cd e2b_writer_custom_python
   ```

2. Load the extension in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `chrome-extension/` directory

3. Navigate to a Keboola Custom Python component configuration page

### Extension Activation

The extension only activates when:
1. You're on a Keboola Custom Python component configuration page (URL pattern: `https://connection.{stack}.keboola.com/admin/projects/{projectId}/components/kds-team.app-custom-python/{configId}`)
2. The User Parameters JSON contains `"e2b": true`

## Usage

### 1. Enable e2b Integration

Add to your User Parameters in Keboola:
```json
{
  "e2b": true
}
```

### 2. Initialize Python Environment

Click **"Initialize Python & Git Configuration"** in the extension panel. This automatically:
- Selects Python 3.13 environment
- Configures Git repository mode
- Sets repository URL: `https://github.com/keboola/e2b_writer_custom_python`
- Sets branch to `main` and script to `main.py`
- Saves configuration

### 3. Configure e2b Settings

Click the **"e2b Integration"** button (orange, top of action panel) to configure:

- **e2b API Key**: Your e2b API key (automatically encrypted by Keboola)
- **Template**: Choose "Default" (code-interpreter) or enter a custom template ID
- **Timeout**: Sandbox execution timeout in seconds (default: 1800 = 30 minutes)

### 4. Configure Input Mapping

In the Keboola UI, add tables to **Table Input Mapping**:
- Source: Keboola Storage table (e.g., `in.c-bucket.table`)
- Destination: CSV filename (e.g., `data.csv`)

These CSV files will be automatically uploaded to the e2b sandbox when the component runs.

### 5. Run Component

Click **"RUN COMPONENT"** - the Python script will execute in an e2b sandbox with all input tables available.

## Configuration Parameters

The extension manages these parameters in Keboola's User Parameters:

```json
{
  "e2b": true,                           // Feature flag (required for injection)
  "#e2b_api_key": "e2b_xxxxx",           // Encrypted API key
  "e2b_template": "code-interpreter",    // Template ID (always defined)
  "e2b_timeout": 1800                    // Timeout in seconds
}
```

**Note**: Parameters prefixed with `#` are automatically encrypted by Keboola and stored as `KBC::ProjectSecure::...`

## Local Development & Testing

### Setup Local Environment

```bash
# Set your e2b API key
echo "E2B_API_KEY=your-key-here" > .env

# Run automated setup and tests
./setup_and_test.sh
```

This will:
1. Create Python virtual environment
2. Install dependencies (`e2b-code-interpreter`)
3. Run 4 test cases to verify e2b integration

### Test Script

The `main.py` script supports dual-mode execution:

**Keboola Mode** (Production):
```python
from keboola.component import CommonInterface
ci = CommonInterface()
api_key = ci.configuration.parameters['#e2b_api_key']
```

**Local Mode** (Development):
```python
import os
api_key = os.environ.get('E2B_API_KEY')
```

See `TEST_README.md` for comprehensive testing guide and troubleshooting.

## Architecture

### Components

- **Service Worker** (`background/service-worker.js`): API proxy and Keboola token capture
- **Content Script** (`content/content-script.js`): UI injection, initialization, configuration management
- **Inject Helper** (`content/inject-helper.js`): CodeMirror editor access for User Parameters
- **Python Script** (`main.py`): e2b sandbox integration with Input Mapping support

### Technology Stack

- **Chrome Extension**: Manifest V3 with service workers
- **UI**: Vanilla JavaScript with Shadow DOM (no build step required)
- **APIs**: Keboola Storage API, e2b API
- **Storage**: `chrome.storage.session` for secure token handling
- **Python**: Python 3.13 with e2b-code-interpreter SDK

### Data Flow

1. **Configuration**: User configures e2b settings via extension → stored in Keboola parameters
2. **Execution**: Keboola component runs → clones Git repository → executes `main.py`
3. **Input Mapping**: CommonInterface provides CSV files from Keboola Storage
4. **Sandbox Creation**: Python script creates e2b sandbox with configured template
5. **File Upload**: CSV files uploaded to e2b sandbox `/home/user/` directory
6. **Code Execution**: Python code runs in isolated e2b environment with access to data
7. **Cleanup**: Sandbox terminated after execution completes

## Development

### Project Structure

```
kbc-e2b-writer/
├── chrome-extension/
│   ├── manifest.json              # Extension manifest (V3)
│   ├── background/
│   │   └── service-worker.js     # API proxy, token capture
│   ├── content/
│   │   ├── content-script.js     # Main injection logic
│   │   └── inject-helper.js      # Page context helper
│   └── assets/
│       ├── icons/                 # Extension icons
│       └── public/
│           └── e2b.png            # e2b logo for icon replacement
├── main.py                        # e2b sandbox integration script
├── requirements.txt               # Python dependencies (Keboola)
├── requirements-dev.txt           # Python dependencies (local testing)
├── setup_and_test.sh             # Automated local setup/test
├── .env.example                   # Environment template
├── TEST_README.md                 # Local testing guide
└── CLAUDE.md                      # Development guide for AI assistants
```

### Testing

**Chrome Extension:**
```
https://connection.eu-central-1.keboola.com/admin/projects/33/components/kds-team.app-custom-python/{configId}
```

**Local Python Testing:**
```bash
./setup_and_test.sh
```

### Debugging

- **Content script logs**: Right-click page → Inspect → Console (look for `[e2b Extension]`)
- **Service worker logs**: `chrome://extensions/` → "Inspect views: service worker"
- **Python logs**: Check Keboola job logs for `logging.info()` output

### Reload After Changes

**Extension**: Go to `chrome://extensions/` and click reload icon (↻)

**Python Script**: Commit and push changes to GitHub (Keboola clones from repository)

## Security

- **API Key Encryption**: e2b API keys encrypted using Keboola's parameter encryption
- **Token Storage**: Keboola API tokens stored in `chrome.storage.session` (cleared on browser close)
- **Content Security Policy**: Shadow DOM prevents XSS attacks
- **No Secret Logging**: Sensitive values filtered from console output
- **Sandboxed Execution**: Code runs in isolated e2b environments

## Implementation Status

- ✅ **Phase 0: Planning** - Research, architecture design
- ✅ **Phase 1: Foundation** - URL detection, UI injection, basic config panel
- ✅ **Phase 2: Configuration Management** - e2b settings, parameter sync, encryption, initialization
- ✅ **Phase 3: Input Mapping & Data Transfer** - Automatic CSV transfer to e2b sandboxes, CommonInterface integration
- 📋 **Phase 4: Advanced Features** - Output mapping, file I/O, lifecycle management, retry logic (Planned)

## Key Files

- **CLAUDE.md**: Comprehensive development guide (architecture, patterns, workflows)
- **TEST_README.md**: Local testing guide with troubleshooting
- **chrome-extension/README.md**: Extension installation and debugging guide

## Resources

- [Keboola Custom Python Component](https://github.com/keboola/component-custom-python)
- [Keboola Custom Python README](https://raw.githubusercontent.com/keboola/component-custom-python/refs/heads/main/README.md) (CRITICAL for logging and deployment)
- [Keboola Storage API Docs](https://keboola.docs.apiary.io/)
- [e2b Documentation](https://e2b.dev/docs)
- [e2b Python SDK](https://github.com/e2b-dev/e2b)
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)

## License

[Add license information]

## Contributing

[Add contributing guidelines]
