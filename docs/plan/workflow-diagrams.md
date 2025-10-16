# Workflow Diagrams

This document contains ASCII diagrams visualizing key workflows for the Chrome Extension.

## 1. Extension Initialization Flow

```
┌──────────────────────────────────────────────────────────┐
│  User navigates to Keboola Custom Python config page    │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  Content Script: URL Pattern Check                        │
│  • Extract projectId, configId, stackUrl                  │
│  • Validate: kds-team.app-custom-python component         │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
                  [Valid?]
                 /        \
            NO  /          \  YES
               /            \
              ▼              ▼
      ┌──────────┐    ┌───────────────────────────────────┐
      │   Exit   │    │  DOM Verification                 │
      └──────────┘    │  • Check for component elements   │
                      │  • Confirm user logged in         │
                      └────────────┬──────────────────────┘
                                   │
                                   ▼
                      ┌───────────────────────────────────┐
                      │  Inject Extension UI              │
                      │  • Create button in action panel  │
                      │  • Create Shadow DOM panel        │
                      │  • Attach event listeners         │
                      └────────────┬──────────────────────┘
                                   │
                                   ▼
                      ┌───────────────────────────────────┐
                      │  Start SPA Navigation Observer    │
                      │  • MutationObserver on DOM        │
                      │  • popstate event listener        │
                      └───────────────────────────────────┘
```

## 2. File Upload Flow (Detailed)

```
┌────────────────────────────────────────────────────────────┐
│  User clicks "e2b Integration" button                      │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  Panel Opens: User enters e2b config & selects files      │
│  • e2b API Key                                             │
│  • Sandbox template                                        │
│  • Files via drag-drop or browse                           │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  Click "Upload Files"                                      │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  Extension: Validate Input                                 │
│  • Check e2b API key present                               │
│  • Validate file sizes/types                               │
│  • Get Keboola API token (capture or prompt)               │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │  Start Upload Process│
          └──────────┬───────────┘
                     │
    ┌────────────────┴────────────────┐
    │                                 │
    ▼                                 ▼
┌───────────────────────┐   ┌─────────────────────────┐
│  Upload to Keboola    │   │  Upload to e2b          │
│  Storage (Parallel)   │   │  (Parallel)             │
└───────┬───────────────┘   └──────────┬──────────────┘
        │                              │
        │  1. POST /files/prepare      │  1. POST /sandboxes
        │     → Get upload URL         │     → Get sandboxId
        │                              │
        │  2. PUT to signed URL        │  2. PUT /sandboxes/{id}/files
        │     → Upload file bytes      │     → Upload file bytes
        │                              │
        │  3. Track progress (XHR)     │  3. Track progress
        │                              │
        ▼                              ▼
┌───────────────────────┐   ┌─────────────────────────┐
│  Store fileId & tags  │   │  Store sandbox path     │
└───────┬───────────────┘   └──────────┬──────────────┘
        │                              │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────┐
        │  Both uploads successful?            │
        └──────────────┬───────────────────────┘
                       │
                    [Yes]
                       │
                       ▼
        ┌──────────────────────────────────────┐
        │  Build updated configuration object  │
        │  {                                   │
        │    "#e2b_api_key": "...",            │
        │    "e2b_template": "...",            │
        │    "e2b_uploaded_files": [...]       │
        │  }                                   │
        └──────────────┬───────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────┐
        │  PATCH /configs/{configId}           │
        │  • Get current config (rowsVersion)  │
        │  • Merge parameters                  │
        │  • Update with optimistic locking    │
        └──────────────┬───────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────┐
        │  Show Success Message                │
        │  • Display fileIds                   │
        │  • Display sandbox path              │
        │  • Provide next steps                │
        └──────────────────────────────────────┘
```

## 3. API Token Capture Flow

```
┌────────────────────────────────────────────────────────────┐
│  Content Script Injected                                   │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  Intercept fetch/XMLHttpRequest                            │
│  • Override window.fetch                                   │
│  • Override XMLHttpRequest.prototype.open/send             │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  User performs any action in Keboola UI                    │
│  (e.g., loads component, saves config)                     │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  Keboola UI makes API call                                 │
│  Request headers include:                                  │
│  X-StorageApi-Token: kbc_12345...                          │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  Extension intercepts request                              │
│  • Check if URL matches /v2/storage/*                      │
│  • Extract X-StorageApi-Token header                       │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  Store token in chrome.storage.session                     │
│  {                                                         │
│    projectId: "33",                                        │
│    token: "kbc_12345...",                                  │
│    stackUrl: "https://connection.eu-central-1.keboola.com",│
│    capturedAt: 1697456789000                               │
│  }                                                         │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  Token available for extension API calls                   │
└────────────────────────────────────────────────────────────┘

Alternative Flow (Manual Entry):
┌────────────────────────────────────────────────────────────┐
│  Auto-capture fails or not available                       │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  Extension prompts user                                    │
│  "Please provide your Keboola API token"                   │
│  [Input field] [Get Token →]                               │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  User clicks "Get Token" → Opens Keboola token management  │
│  https://connection.../admin/projects/33/settings-users    │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  User copies token and pastes into extension               │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  Extension validates token                                 │
│  GET /v2/storage/tokens/verify                             │
└────────────────────┬───────────────────────────────────────┘
                     │
                  [Valid?]
                 /        \
            NO  /          \  YES
               /            \
              ▼              ▼
      ┌──────────────┐   ┌─────────────────┐
      │ Show error   │   │ Store token     │
      │ "Invalid     │   │ Enable features │
      │  token"      │   └─────────────────┘
      └──────────────┘
```

## 4. Configuration Update Flow (with Optimistic Locking)

```
┌────────────────────────────────────────────────────────────┐
│  Extension has new data to save                            │
│  • e2b settings                                            │
│  • Uploaded file references                                │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  GET /configs/{configId}                                   │
│  Fetch current configuration                               │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  Parse response                                            │
│  {                                                         │
│    configuration: { parameters: {...} },                   │
│    rowsVersion: 3  ← Current version number                │
│  }                                                         │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  Merge parameters                                          │
│  • Keep existing parameters                                │
│  • Add/update e2b parameters                               │
│  • Preserve other fields (mappings, processors, etc.)      │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  PATCH /configs/{configId}                                 │
│  Body: {                                                   │
│    configuration: { parameters: {merged} },                │
│    rowsVersion: 3  ← Same version from GET                 │
│  }                                                         │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
                  [Success?]
                 /          \
          YES   /            \   NO (409 Conflict)
               /              \
              ▼                ▼
   ┌─────────────────┐   ┌────────────────────────────────┐
   │ Update UI       │   │ Version mismatch detected      │
   │ "Config saved"  │   │ (someone else edited config)   │
   └─────────────────┘   └──────────┬─────────────────────┘
                                    │
                                    ▼
                         ┌────────────────────────────────┐
                         │ Show conflict dialog           │
                         │ "Config was modified"          │
                         │ [Retry] [View Changes] [Cancel]│
                         └──────────┬─────────────────────┘
                                    │
                                 [Retry]
                                    │
                                    └──────┐
                                           │
                         ┌─────────────────┘
                         │
                         ▼
              (Loop back to GET /configs)
```

## 5. SPA Navigation Detection

```
┌────────────────────────────────────────────────────────────┐
│  Initial page load                                         │
│  URL: .../components/kds-team.app-custom-python/config123  │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  Content script initializes                                │
│  • Store lastUrl = location.href                           │
│  • Check if should inject → YES → Inject extension         │
│  • Start MutationObserver on document.body                 │
│  • Add popstate listener                                   │
└────────────────────────────────────────────────────────────┘

              [Extension injected and active]

┌────────────────────────────────────────────────────────────┐
│  User clicks Keboola navigation link                       │
│  (Different config, different component, etc.)             │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  React Router updates URL without reload                   │
│  New URL: .../components/other-component/config456         │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  MutationObserver fires (DOM changed)                      │
│  OR popstate event fires (browser back/forward)            │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  Extension: Check navigation                               │
│  currentUrl = location.href                                │
│  if (currentUrl !== lastUrl)                               │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  URL changed → Re-evaluate context                         │
│  Does new URL match pattern?                               │
└────────────────────┬───────────────────────────────────────┘
                     │
            ┌────────┴────────┐
            │                 │
            ▼                 ▼
    ┌──────────────┐   ┌──────────────┐
    │  NO: Remove  │   │  YES: Keep/  │
    │  extension   │   │  Re-inject   │
    │  UI          │   │  if missing  │
    └──────────────┘   └──────────────┘
            │                 │
            └────────┬────────┘
                     │
                     ▼
           ┌──────────────────┐
           │ Update lastUrl   │
           │ Continue watching│
           └──────────────────┘
```

## 6. Security Flow: API Key Handling

```
┌────────────────────────────────────────────────────────────┐
│  User enters e2b API key in extension panel               │
│  Input: "e2b_abc123def456..."                              │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  Encrypt API key using Web Crypto API                     │
│  const key = await crypto.subtle.generateKey(...)          │
│  const encrypted = await crypto.subtle.encrypt(...)        │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  Store encrypted key                                       │
│  chrome.storage.session.set({                              │
│    e2bApiKey: encrypted,                                   │
│    iv: initializationVector                                │
│  })                                                        │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  When needed for API call:                                 │
│  1. Retrieve encrypted key from storage                    │
│  2. Decrypt using Web Crypto API                           │
│  3. Use in Authorization header                            │
│  4. Clear from memory after use                            │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  For Keboola configuration storage:                        │
│  Use Keboola's native encryption with # prefix            │
│  {                                                         │
│    "#e2b_api_key": "e2b_abc123..."  ← Keboola encrypts    │
│  }                                                         │
└────────────────────────────────────────────────────────────┘

Security Rules:
┌────────────────────────────────────────────────────────────┐
│  ✓ Never log raw API keys                                 │
│  ✓ Mask in UI (show only last 4 chars)                    │
│  ✓ Clear from memory after use                            │
│  ✓ Store only in session storage (cleared on close)       │
│  ✓ Use HTTPS for all API calls                            │
│  ✗ Never persist unencrypted in localStorage              │
│  ✗ Never send to analytics or logging services            │
└────────────────────────────────────────────────────────────┘
```

## 7. Error Handling Flow

```
┌────────────────────────────────────────────────────────────┐
│  Operation attempted (upload, API call, etc.)              │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  try {                                                     │
│    await operation()                                       │
│  } catch (error) {                                         │
│    handleError(error)                                      │
│  }                                                         │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  Error Type Classification                                 │
└──────┬─────────────────────┬────────────────┬─────────────┘
       │                     │                │
       ▼                     ▼                ▼
┌─────────────┐   ┌────────────────┐   ┌────────────────┐
│ Network     │   │ Authentication │   │ Validation     │
│ Error       │   │ Error          │   │ Error          │
│ (timeout,   │   │ (401, 403)     │   │ (400, 422)     │
│  offline)   │   │                │   │                │
└──────┬──────┘   └────────┬───────┘   └────────┬───────┘
       │                   │                     │
       ▼                   ▼                     ▼
┌─────────────┐   ┌────────────────┐   ┌────────────────┐
│ Show retry  │   │ Prompt re-auth │   │ Show specific  │
│ with expo-  │   │ "Token expired"│   │ field errors   │
│ nential     │   │ [Re-login]     │   │ "Invalid file" │
│ backoff     │   │                │   │                │
└─────────────┘   └────────────────┘   └────────────────┘

Common Errors & Responses:
┌──────────────────────────────────────────────────────────┐
│ Error: e2b API returns 401                               │
│ → "Invalid e2b API key. Please check and try again."    │
│                                                          │
│ Error: Keboola returns 409 (version conflict)           │
│ → "Config was modified. [Retry] [View Changes]"         │
│                                                          │
│ Error: File too large                                   │
│ → "File exceeds 100MB limit. Consider compression."     │
│                                                          │
│ Error: Network timeout                                  │
│ → "Upload timed out. Retrying (1/3)..."                 │
│                                                          │
│ Error: Sandbox creation fails                           │
│ → "Could not create e2b sandbox. Check quota/billing."  │
└──────────────────────────────────────────────────────────┘
```

---

## Diagram Conventions

- `┌─┐` Boxes represent processes or states
- `→ ▼` Arrows show flow direction
- `[?]` Diamonds represent decision points
- `...` Ellipsis indicates continuation
- Parallel flows shown side-by-side with `│`
- `✓ ✗` Check/cross indicate rules or validations

