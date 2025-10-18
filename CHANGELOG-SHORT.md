# e2b Integration for Keboola

Execute Python code in isolated e2b sandboxes with automatic input data transfer.

## Latest: v0.2.0 (2025-10-18) 🎨

**Major UI Redesign** - New professional dashboard with multi-section navigation!

### What's New
- ✨ **Multi-section dashboard** - 7 organized sections with sidebar navigation
- 📊 **Status cards** - Real-time view of your configuration (API key, template, timeout)
- 🎛️ **Advanced settings** - Configure log level (ERROR/WARNING/INFO/DEBUG) and self-test mode
- 🎨 **Modern design** - Professional card-based layout with e2b orange branding
- 🚀 **Ready for future features** - Placeholder sections for file upload, monitoring, output mapping

### Sections
1. **Overview** - Quick status and context (Project, Config, Stack)
2. **Configuration** - Core e2b settings (API key, template, timeout)
3. **Setup** - One-click Python & Git initialization
4. **Files** - File management (coming soon)
5. **Monitoring** - Sandbox monitoring (coming soon)
6. **Output** - Output table mapping (coming soon)
7. **Advanced** - Log level and self-test mode

---

## Key Features

- ✅ One-click Python 3.13 + Git repository initialization
- ✅ Secure e2b API key configuration (auto-encrypted)
- ✅ Automatic CSV file transfer from Keboola to sandbox
- ✅ Self-test mode for diagnostics
- ✅ Configurable logging (ERROR/WARNING/INFO/DEBUG)

**Status:** Phase 3 complete (Input Mapping & Data Transfer)

**Next:** Phase 4 - Output table mapping, file I/O support

---

## Quick Start

1. **Enable e2b** - Add `"e2b": true` to User Parameters
2. **Initialize** - Click "Initialize Python & Git Configuration" button
3. **Configure** - Set your e2b API key (auto-encrypted with `#` prefix)
4. **Run** - Execute the component, data flows automatically!

## Version History

### v0.2.0 (2025-10-18) - UI Redesign

**Chrome Extension**
- 🎨 **Complete UI redesign** - Multi-section dashboard with sidebar navigation
- 📊 **Status cards** - Real-time configuration state display
- 🎛️ **Advanced settings** - Log level and self-test mode configuration
- 🚀 **Scalable design** - Ready for future features (file upload, monitoring)

### v0.1.0 (2025-10-17) - Initial Release

**Chrome Extension**
- **Conditional UI injection** - Only when `e2b: true` in User Parameters
- **One-click initialization** - Python 3.13 + Git repo setup
- **UI simplification** - Hides unnecessary sections for cleaner interface
- **e2b branding** - Orange button and component icon

**Python Integration**
- **Dual-mode API key loading** - Works in Keboola or locally
- **Input mapping** - Automatic CSV transfer to sandbox
- **Self-test mode** - 5 diagnostic tests
- **DEBUG logging** - Comprehensive execution tracking

**Security**
- API keys auto-encrypted by Keboola (`#` prefix)
- Session-only token storage (cleared on browser close)
- No secrets in logs

---

**Full changelog:** [CHANGELOG.md](https://github.com/keboola/e2b_writer_custom_python/blob/main/CHANGELOG.md)
