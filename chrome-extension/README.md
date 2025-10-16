# Keboola e2b Writer - Chrome Extension

This Chrome extension enables seamless integration between Keboola Connection's Custom Python component and e2b sandboxes.

## 🚀 Installation & Testing

### 1. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top-right corner)
3. Click **"Load unpacked"**
4. Select this directory: `/Users/padak/github/kbc-e2b-writer/chrome-extension`
5. The extension should now appear in your extensions list

### 2. Test on Keboola

1. Navigate to a Keboola Custom Python component configuration page:
   ```
   https://connection.eu-central-1.keboola.com/admin/projects/33/components/kds-team.app-custom-python/01k7pkk4qg6jprstza74572x8f
   ```

2. You should see a new **"e2b Integration"** button in the right action panel (after "Debug mode")

3. Click the button to open the configuration panel

### 3. Configure e2b

1. Enter your **e2b API key** (starts with `e2b_...`)
2. Select **sandbox template** (default: Python 3.13)
3. Set **timeout** (default: 1800 seconds / 30 minutes)
4. Click **"Save to Keboola Configuration"**

### 4. Verify in Keboola

After saving, check the **User Parameters** in the Keboola UI. You should see:

```json
{
  "debug": false,
  "#e2b_api_key": "KBC::ProjectSecure::...",
  "e2b_template": "python-3.13",
  "e2b_timeout": 1800
}
```

The `#e2b_api_key` will be encrypted by Keboola automatically.

## 🔍 Debugging

### View Extension Logs

**Content Script (page-level):**
- Right-click on the Keboola page → **Inspect** → **Console**
- Look for messages prefixed with `[e2b Extension]`

**Background Service Worker:**
- Go to `chrome://extensions/`
- Find "Keboola e2b Writer"
- Click **"Inspect views: service worker"**
- View console logs

### Common Issues

#### Extension button not appearing
- **Check**: URL matches the pattern exactly
- **Check**: You're on a Custom Python component page
- **Debug**: Open console and look for `[e2b Extension]` initialization messages

#### Panel not opening
- **Check**: Button is clickable
- **Debug**: Look for JavaScript errors in console

#### Token not captured automatically
- **Solution**: Perform any action in Keboola (e.g., refresh page, save config)
- **Fallback**: Use "Manual Token Entry" in the Advanced section of the panel
- **Get token**: Keboola UI → Settings → API Tokens

#### Save fails with "No token available"
- **Solution**: Enter token manually in the "Advanced" section
- Or refresh the page to trigger token auto-capture

## 📁 Extension Structure

```
chrome-extension/
├── manifest.json              # Extension configuration
├── background/
│   └── service-worker.js     # Background process, API proxy, token capture
├── content/
│   └── content-script.js     # Injected into Keboola pages
├── assets/
│   └── icons/                # Extension icons
└── README.md                 # This file
```

## 🔧 Features

### Implemented (v0.1.0)
- ✅ Auto-detect Custom Python component pages
- ✅ Inject UI button into Keboola action panel
- ✅ Configuration panel with e2b settings
- ✅ Auto-capture Keboola Storage API token
- ✅ Save e2b configuration to Keboola parameters
- ✅ Automatic encryption via Keboola `#` prefix
- ✅ Optimistic locking for configuration updates
- ✅ SPA navigation detection

### Coming Soon
- 🔜 File upload to Keboola Storage
- 🔜 File upload to e2b sandbox
- 🔜 Parallel upload workflow
- 🔜 Upload progress tracking
- 🔜 Sandbox lifecycle management

## 🛠️ Development

### Reload Extension After Changes

1. Make code changes
2. Go to `chrome://extensions/`
3. Click the **reload** icon ↻ on the extension card

### Test Token Capture

Open browser console and run:
```javascript
chrome.runtime.sendMessage(
  { type: 'GET_TOKEN' },
  response => console.log(response)
);
```

## 📝 Notes

- **Token Storage**: API tokens are stored in `chrome.storage.session` (cleared on browser close)
- **Security**: e2b API keys are encrypted by Keboola when stored with `#` prefix
- **Manifest Version**: V3 (uses service workers, not background pages)
- **Browser Support**: Chrome, Edge, and other Chromium-based browsers

## 🐛 Known Issues

None yet! Please report issues as you find them.

## 📞 Support

For questions or issues:
- Check browser console logs (`[e2b Extension]` prefix)
- Check extension service worker logs
- Review the planning docs in `/docs/plan/`

---

**Version**: 0.1.0
**Last Updated**: 2025-10-16
