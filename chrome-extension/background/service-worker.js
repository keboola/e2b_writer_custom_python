// Background service worker for Keboola e2b Writer extension

console.log('[e2b Extension] Background service worker initialized');

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[e2b Extension] Installed:', details.reason);

  if (details.reason === 'install') {
    console.log('[e2b Extension] First install - welcome!');
  } else if (details.reason === 'update') {
    console.log('[e2b Extension] Updated to version', chrome.runtime.getManifest().version);
  }
});

// Message handler for content script communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[e2b Extension] Message received:', request.type);

  if (request.type === 'API_CALL') {
    // Proxy API calls to avoid CORS issues
    handleApiCall(request.data)
      .then(result => {
        console.log('[e2b Extension] API call successful');
        sendResponse({ success: true, data: result });
      })
      .catch(error => {
        console.error('[e2b Extension] API call failed:', error.message);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }

  if (request.type === 'STORE_TOKEN') {
    // Store Keboola API token in session storage
    chrome.storage.session.set({
      keboolaToken: request.token,
      keboolaContext: request.context,
      tokenCapturedAt: Date.now()
    }, () => {
      console.log('[e2b Extension] Token stored in session');
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.type === 'GET_TOKEN') {
    // Retrieve stored token
    chrome.storage.session.get(['keboolaToken', 'keboolaContext'], (result) => {
      sendResponse({
        success: true,
        token: result.keboolaToken,
        context: result.keboolaContext
      });
    });
    return true;
  }
});

// API call handler
async function handleApiCall(data) {
  const { url, method, headers, body } = data;

  console.log(`[e2b Extension] ${method} ${url}`);

  const options = {
    method: method || 'GET',
    headers: headers || {},
  };

  if (body) {
    options.body = JSON.stringify(body);
    options.headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return response.json();
}

// Web request listener to capture Keboola API tokens
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    // Look for Keboola Storage API calls
    if (details.url.includes('/v2/storage/')) {
      const headers = details.requestHeaders || [];
      const tokenHeader = headers.find(h => h.name === 'X-StorageApi-Token');

      if (tokenHeader) {
        console.log('[e2b Extension] Captured Keboola API token from request');

        // Extract context from URL
        const urlMatch = details.url.match(/https:\/\/connection\.([^/]+)\.keboola\.com/);
        const stack = urlMatch ? urlMatch[1] : 'unknown';

        // Store token
        chrome.storage.session.set({
          keboolaToken: tokenHeader.value,
          keboolaContext: {
            stackUrl: details.url.split('/v2/')[0],
            stack: stack,
            capturedFrom: 'webRequest'
          },
          tokenCapturedAt: Date.now()
        });
      }
    }
  },
  { urls: ["https://*.keboola.com/*"] },
  ["requestHeaders"]
);
