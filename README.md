# Keboola e2b Writer - Chrome Extension

A Chrome extension that integrates Keboola Connection's Custom Python component with [e2b](https://e2b.dev/) (ephemeral sandbox environments) for secure, isolated Python code execution.

## Overview

This extension enables users to:
- Configure e2b parameters (API key, template, timeout) directly in Keboola UI
- Upload files from browser to both Keboola Storage and e2b sandboxes
- Execute Python code in isolated e2b environments with automatic file synchronization
- Manage sandbox lifecycle through an intuitive interface

## Features

- **Seamless Integration**: Automatically injects into Keboola's Custom Python component configuration pages
- **Secure Configuration**: e2b API keys encrypted using Keboola's built-in encryption (`#e2b_api_key`)
- **File Upload**: Direct file upload to both Keboola Storage and e2b sandboxes with progress tracking
- **Template Support**: Use default code-interpreter or custom e2b templates
- **SPA Navigation**: Works seamlessly with Keboola's single-page application architecture

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

### 2. Configure e2b Settings

Once enabled, an "e2b Integration" button appears in the right action panel. Click it to configure:

- **e2b API Key**: Your e2b API key (automatically encrypted by Keboola)
- **Template**: Choose "Default" (code-interpreter) or enter a custom template ID
- **Timeout**: Sandbox execution timeout in seconds (default: 1800 = 30 minutes)

### 3. Upload Files

Use the file upload interface to send files to both:
- Keboola Storage (for persistence and sharing)
- e2b sandbox (for immediate code execution)

## Configuration Parameters

The extension manages these parameters in Keboola's User Parameters:

```json
{
  "e2b": true,                           // Feature flag
  "#e2b_api_key": "e2b_xxxxx",           // Encrypted API key
  "e2b_template": "code-interpreter",    // Template ID
  "e2b_timeout": 1800                    // Timeout in seconds
}
```

**Note**: Parameters prefixed with `#` are automatically encrypted by Keboola and stored as `KBC::ProjectSecure::...`

## Architecture

### Components

- **Service Worker** (`background/service-worker.js`): API proxy and token capture
- **Content Script** (`content/content-script.js`): UI injection and configuration management
- **Inject Helper** (`content/inject-helper.js`): CodeMirror editor access

### Technology Stack

- **Chrome Extension**: Manifest V3 with service workers
- **UI**: Vanilla JavaScript with Shadow DOM (no build step required)
- **APIs**: Keboola Storage API, e2b API
- **Storage**: `chrome.storage.session` for secure token handling

## Development

### Project Structure

```
chrome-extension/
├── manifest.json              # Extension manifest (V3)
├── background/
│   └── service-worker.js     # API proxy, token capture
├── content/
│   ├── content-script.js     # Main injection logic
│   └── inject-helper.js      # Page context helper
└── assets/icons/             # Extension icons

docs/
└── plan/                     # Technical planning documents
```

### Testing

Test URL format:
```
https://connection.eu-central-1.keboola.com/admin/projects/33/components/kds-team.app-custom-python/{configId}
```

### Debugging

- **Content script logs**: Right-click page → Inspect → Console (look for `[e2b Extension]`)
- **Service worker logs**: `chrome://extensions/` → "Inspect views: service worker"

### Reload After Changes

Go to `chrome://extensions/` and click the reload icon (↻) on the extension card.

## Security

- **API Key Encryption**: e2b API keys encrypted using Keboola's parameter encryption
- **Token Storage**: Keboola API tokens stored in `chrome.storage.session` (cleared on browser close)
- **Content Security Policy**: Shadow DOM prevents XSS attacks
- **No Secret Logging**: Sensitive values filtered from console output

## Implementation Status

- ✅ **Phase 1: Foundation** - URL detection, UI injection, basic config panel
- ✅ **Phase 2: Configuration Management** - e2b settings, parameter sync, encryption
- 🚧 **Phase 3: File Upload** - Storage/sandbox upload, progress tracking (In Progress)
- 📋 **Phase 4: Advanced Features** - Sandbox lifecycle, error handling, retry logic (Planned)

## Resources

- [Keboola Custom Python Component](https://github.com/keboola/component-custom-python)
- [Keboola Storage API Docs](https://keboola.docs.apiary.io/)
- [e2b Documentation](https://e2b.dev/docs)
- [e2b Python SDK](https://github.com/e2b-dev/e2b)
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)

## Documentation

See `/docs/plan/` for detailed technical planning documents:
- `chrome-extension-plan.md`: Full technical specification
- `page-structure-analysis.md`: Keboola UI DOM analysis
- `implementation-quick-start.md`: Step-by-step implementation guide
- `workflow-diagrams.md`: ASCII workflow diagrams

See `CLAUDE.md` for Claude Code development guidelines.

## License

[Add license information]

## Contributing

[Add contributing guidelines]
