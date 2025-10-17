# e2b Integration for Keboola - v0.1.0

Execute Python code in isolated e2b sandboxes with automatic input data transfer.

## Key Features

- ✅ One-click Python 3.13 + Git repository initialization
- ✅ Secure e2b API key configuration (auto-encrypted)
- ✅ Automatic CSV file transfer from Keboola to sandbox
- ✅ Self-test mode for diagnostics
- ✅ Configurable logging (INFO/DEBUG)

**Status:** Phase 3 complete (Input Mapping & Data Transfer)

**Next:** Phase 4 - Output table mapping, file I/O support

---

## Quick Start

1. **Enable e2b** - Add `"e2b": true` to User Parameters
2. **Initialize** - Click "Initialize Python & Git Configuration" button
3. **Configure** - Set your e2b API key (auto-encrypted with `#` prefix)
4. **Run** - Execute the component, data flows automatically!

## What's New in v0.1.0

### Chrome Extension

- **Conditional UI injection** - Only when `e2b: true` in User Parameters
- **One-click initialization** - Python 3.13 + Git repo setup
- **UI simplification** - Hides unnecessary sections for cleaner interface
- **e2b branding** - Orange button and component icon

### Python Integration

- **Dual-mode API key loading** - Works in Keboola or locally
- **Input mapping** - Automatic CSV transfer to sandbox
- **Self-test mode** - 5 diagnostic tests
- **DEBUG logging** - Comprehensive execution tracking

### Security

- API keys auto-encrypted by Keboola (`#` prefix)
- Session-only token storage (cleared on browser close)
- No secrets in logs

---

**Full changelog:** [CHANGELOG.md](https://github.com/keboola/e2b_writer_custom_python/blob/main/CHANGELOG.md)
