# e2b Integration Research

## Keboola Custom Python Component Environment
- `keboola/component-custom-python` image boots a Python 3 runtime with the Keboola Component Common library preinstalled; entrypoint executes `main.py` in `/code`.
- Keboola Connection materializes configured Storage inputs to `data/in/tables/*.csv` and `data/in/files/*` before component execution; metadata is provided in JSON manifests (e.g., `data/in/tables/<table>.manifest`).
- Component configuration (parameters) arrives via `/data/config.json`; Storage API token, project ID, and other credentials sit in `/data/secrets.json` and relevant environment variables (e.g., `KBC_PROJECTID`, `KBC_TOKEN`).
- Output back to Keboola is done by writing tables/files under `data/out/...` and/or by calling the Storage API via the Python SDK (`keboola.component` or `keboola.StorageApi`).

## Accessing Keboola Storage Assets
- **Tables**: Use CSVs in `data/in/tables/` for typical datasets; manifests include columns, primary keys, and incremental flags. For large datasets or dynamic retrieval, call the Storage API directly with the provided token; the official `kbcstorage` Python SDK supports table exports to files or streams.
- **File Storage “packages”**: Files requested in configuration are staged under `data/in/files/`; manifest JSON includes `is_package`, original file name, and size. Packages are usually zipped; unpack locally before uploading to e2b.
- **API considerations**: Respect Storage API rate limits (20 req/sec, burst 180). For long-running exports, poll job endpoints. Ensure the Storage API token has `read` permissions for used buckets/files.

## e2b SDK Capabilities & Constraints
- Python SDK (`pip install e2b`) exposes `Sandbox` abstractions to launch ephemeral environments. Beta releases (`e2b>=0.16.0b`) allow overriding sandbox idle timeout up to the project limit—requires `E2B_API_KEY`.
- File operations: `sandbox.files.write(path, bytes)`, `sandbox.files.upload_dir`, and reciprocal download helpers enable mirroring Keboola data into the sandbox filesystem.
- Command execution: `sandbox.run("python script.py")` or asynchronous session APIs execute programs inside the sandbox; streaming stdio allows monitoring job status.
- Resource limits: default sandboxes have 2 vCPU / 4 GB RAM / 30 min idle timeout (subject to workspace plan). Extended timeout beta must be explicitly enabled per workspace; coordinate with e2b support.
- Networking: Sandboxes have outbound internet; inbound access or persistent storage needs tunnels or remote services (not provided by default). Sensitive data should be cleaned up explicitly after execution.

## Proposed Integration Flow
- **Initialization**
  - Instantiate Keboola component helper (`from keboola.component import CommonInterface`) to parse config/secrets and expose path helpers.
  - Initialize e2b sandbox with API key from component parameters/secret; optionally request extended timeout via beta flag.
- **Loading Tables**
  - Iterate `data/in/tables` manifests; stream CSV content into e2b using file APIs (`sandbox.files.write`).
  - For very large tables, consider chunked streaming with Storage API export (e.g., `client.tables.export_to_file`) directly into e2b using buffers to avoid local disk duplication.
- **Loading File Packages**
  - Detect package manifests (`is_package: true`); unzip into temp dir, then upload directory to sandbox (`sandbox.files.upload_dir`).
  - Preserve manifest metadata (e.g., configuration JSON) so the sandboxed process can reconstruct context.
- **Running Component Inside e2b**
  - After assets copied, execute the desired command (e.g., `sandbox.run("python main.py")` or `sandbox.run("bash -lc './run.sh'")`).
  - Capture stdout/stderr for logging back into Keboola (component output).
  - On completion, optionally download result artifacts from sandbox to `data/out/...` for Storage upload.
- **Cleanup**
  - Terminate sandbox explicitly to avoid lingering resources.
  - Remove temp files and consider masking secrets in logs.

## Security & Compliance Notes
- Store `E2B_API_KEY` in Keboola project configuration encrypted section; never log raw tokens.
- Evaluate data residency: e2b sandboxes run on cloud infrastructure (currently AWS/GCP regions); confirm alignment with Keboola project compliance requirements.
- Confirm Keboola project IP allowlists if Storage API is accessed directly from e2b (outbound IP ranges may need safelisting).

## Chrome Extension Concepts
- Detect Keboola UI context by matching URL patterns such as `https://connection.keboola.com/...` and checking component `app/keboola.component-custom-python`.
- Inject a content script that reads component configuration JSON from the page (Keboola UI exposes component config via API calls—observe XHR to `/v2/storage/components/<componentId>/configs/<configId>`).
- Provide a UI panel (e.g., floating button) enabling:
  - Entry of e2b API key, sandbox template, timeout overrides.
  - Table/file selection shortcuts aligning with the component’s expected configuration schema.
  - Test run trigger invoking Keboola API to create a job with desired parameters.
- Use Chrome Extension background script with `chrome.webRequest` or `chrome.scripting` to hook into Keboola API responses, caching config metadata to drive the UI.
- Ensure extension stores secrets securely (prefer Chrome session storage; avoid persistent storage unless encrypted).

### Chrome Extension Initial Experiment Blueprint
- **URL Detection**
  - Use a declarative content script with `matches: ["https://connection.eu-central-1.keboola.com/admin/projects/*/components/kds-team.app-custom-python/*"]`.
  - In the content script, confirm the hash-like suffix (e.g., `01k7pkk4qg6jprstza74572x8f`) corresponds to a configuration detail view by querying DOM for the config sidebar or inspecting SPA router state exposed on `window._state`.
  - Implement a `MutationObserver` to handle SPA navigation where URL changes without a full reload; trigger extension UI injection when the path matches the custom Python config detail.
- **UI Injection**
  - Append a button to the existing Keboola component action menu using `document.querySelector('[data-testid="ComponentDetailHeader"]')` or similar stable selectors.
  - On button click, render a modal/panel (e.g., via injected shadow DOM) containing:
    - Inputs for `E2B API Key` (masked), `Sandbox Template ID`, timeout override, and optional environment variables.
    - File picker allowing selection of local files; store metadata (name, size, checksum) for later upload.
  - Persist transient state in `chrome.storage.session`; optionally allow saving defaults per configuration (keyed by config ID).
- **File Handling & Upload**
  - Leverage Keboola Storage API to upload files directly from the extension:
    - Obtain Storage API token via Keboola UI context (requires detecting existing API calls or prompting user to paste a token).
    - Use `/v2/storage/files/prepare` then upload via provided signed URL; tag uploaded files with e.g., `["kbc-e2b-writer", "<config-id>"]`.
    - Store returned `fileId` and tags in extension state for later reference by the component configuration.
- **Sending Files to e2b**
  - After upload completes, call e2b API (via browser fetch) or queue instructions to be consumed by the Keboola component.
  - Consider using a lightweight backend (or service worker) to avoid CORS issues with e2b API; confirm if e2b exposes CORS-friendly endpoints for direct browser calls.
  - Provide UI feedback (progress, success, error) tied to each file upload and subsequent e2b transfer.
- **Configuration Sync**
  - Update Keboola configuration via REST API (`PATCH /v2/storage/components/<componentId>/configs/<configId>`) to insert collected parameters (e2b API key reference, sandbox options, file IDs).
  - Respect Keboola config locking—ensure optimistic concurrency using `rowsVersion` or fetch latest config before patching.
- **Security Considerations**
  - Avoid persisting raw API keys longer than necessary; encrypt before storage if persistence required.
  - Display clear warnings when user-supplied tokens are stored or transmitted; offer manual revocation steps.

## Open Questions / Next Steps
- Confirm availability and stability of the e2b Python SDK beta timeout feature; obtain exact API for specifying timeout.
- Clarify whether Keboola execution environment has outbound access needed to reach e2b API (typically yes, but project firewall rules may differ).
- Determine size limits for sandbox uploads; large tables may require compression or streaming.
- Define configuration schema (JSON structure) mapping Keboola parameters to e2b sandbox options—extension UI must mirror this.
- Investigate automation for syncing component runtime output back into Keboola Storage vs. only for debugging.
