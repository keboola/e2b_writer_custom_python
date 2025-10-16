# Chrome Extension Planning Documents

This directory contains all planning documents for the **Keboola e2b Writer Chrome Extension**.

## 📋 Documents Overview

### 1. [chrome-extension-plan.md](./chrome-extension-plan.md)
**The main planning document** - Comprehensive blueprint covering:
- Technical architecture and component structure
- URL detection and SPA navigation strategy
- UI injection approach with Shadow DOM
- File upload workflow (Keboola Storage → e2b)
- e2b integration (API key management, sandbox lifecycle)
- Keboola API integration (configuration sync, file management)
- Security considerations (encryption, token storage)
- Implementation phases (5-week roadmap)
- Technical specifications (Manifest V3, data models, API endpoints)
- UI/UX mockups
- Open questions and design decisions

**Read this first** for complete understanding of the project scope and approach.

### 2. [page-structure-analysis.md](./page-structure-analysis.md)
**Detailed analysis of the Keboola Connection UI** - Contains:
- Complete page structure breakdown
- Key UI elements and their hierarchy
- Extension integration points (where to inject UI)
- DOM selectors and element references
- API access points (endpoints, authentication)
- SPA navigation detection strategy
- Key takeaways for development

**Use this** when implementing DOM manipulation and UI injection logic.


### 4. [implementation-quick-start.md](./implementation-quick-start.md)
**Step-by-step implementation guide** - Includes:
- Project setup instructions
- Complete code templates for Phase 1 (basic shell)
- Working content script with URL detection
- Shadow DOM panel implementation
- Testing procedures
- Common issues and solutions
- Quick reference commands

**Start here** when beginning actual development work.

### 5. [workflow-diagrams.md](./workflow-diagrams.md)
**Visual ASCII diagrams** of key workflows:
- Extension initialization flow
- File upload flow (detailed)
- API token capture flow
- Configuration update with optimistic locking
- SPA navigation detection
- Security: API key handling
- Error handling flow

**Reference this** when implementing complex workflows or debugging issues.

### 6. [keboola-config-page.png](./keboola-config-page.png)
**Full-page screenshot** of the Keboola Custom Python component configuration page for visual reference.

## 🚀 Getting Started

### For Project Managers / Stakeholders
1. Read: [chrome-extension-plan.md](./chrome-extension-plan.md) - Sections 1-2, 9, 12
2. Review: Implementation phases and timeline (Section 9)
3. Assess: Open questions and design decisions (Section 12)

### For Developers
1. Read: [chrome-extension-plan.md](./chrome-extension-plan.md) - Full document
2. Study: [page-structure-analysis.md](./page-structure-analysis.md) - Integration points
3. Follow: [implementation-quick-start.md](./implementation-quick-start.md) - Build Phase 1
4. Reference: [keboola-config-page.png](./keboola-config-page.png) - Visual context

### For Designers
1. Review: UI/UX mockups in [chrome-extension-plan.md](./chrome-extension-plan.md) - Section 11
2. Study: [page-structure-analysis.md](./page-structure-analysis.md) - Existing UI patterns
3. Reference: [keboola-config-page.png](./keboola-config-page.png) - Current interface

## 📊 Project Status

### Current Phase
**Phase 0: Planning** ✅ (Complete)
- [x] Research Keboola environment
- [x] Research e2b integration
- [x] Analyze Keboola UI structure
- [x] Create comprehensive plan
- [x] Define implementation phases
- [x] Document quick start guide

### Next Phase
**Phase 1: Foundation** (Not started)
- [ ] Set up Chrome extension boilerplate
- [ ] Implement URL detection
- [ ] Create basic UI panel
- [ ] Implement SPA navigation observer

## 🎯 Key Objectives

1. **Seamless Integration**: Inject extension UI naturally into Keboola Connection interface
2. **File Upload Flow**: Enable upload to both Keboola Storage and e2b in one action
3. **Configuration Sync**: Automatically update component parameters with e2b settings
4. **Security First**: Properly encrypt and manage sensitive API keys
5. **Developer Experience**: Clear documentation and maintainable code structure

## 🔑 Critical Integration Points

### URL Pattern
```
https://connection.eu-central-1.keboola.com/admin/projects/{projectId}/components/kds-team.app-custom-python/{configId}
```

### Injection Location
Right-side action panel, after "Debug mode" button, before "Last Use" section

### Configuration Parameter Schema
```json
{
  "#e2b_api_key": "encrypted_key",
  "e2b_template": "python-3.13",
  "e2b_timeout": 1800,
  "e2b_uploaded_files": [...]
}
```

### Key APIs
- **Keboola Storage API**: `https://connection.{stack}.keboola.com/v2/storage/*`
- **e2b API**: `https://api.e2b.dev/*`

## ⚠️ Open Questions

1. **e2b CORS Support**: Does e2b API support direct browser calls? (If not, proxy needed)
2. **Token Capture**: Auto-detect vs. manual input for Keboola API token?
3. **Sandbox Persistence**: Reuse sandboxes across sessions or one-per-upload?
4. **File Size Limits**: Keboola and e2b maximum file sizes?

See [chrome-extension-plan.md](./chrome-extension-plan.md) Section 12 for full list.

## 📚 External Resources

### Keboola
- [Custom Python Component Docs](https://github.com/keboola/component-custom-python)
- [Storage API Documentation](https://keboola.docs.apiary.io/)
- [Component Configuration Guide](https://developers.keboola.com/extend/component/)

### e2b
- [e2b Documentation](https://e2b.dev/docs)
- [e2b Python SDK](https://github.com/e2b-dev/e2b)
- [e2b API Reference](https://e2b.dev/docs/api)

### Chrome Extensions
- [Manifest V3 Guide](https://developer.chrome.com/docs/extensions/mv3/)
- [Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
- [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM)

## 📝 Document Change Log

| Date | Document | Changes |
|------|----------|---------|
| 2025-10-16 | All | Initial creation of planning documents |

## 💡 Tips for Implementation

1. **Start Simple**: Begin with Phase 1 (basic shell) and validate injection works
2. **Iterate Fast**: Test each feature independently before integration
3. **Security First**: Never commit API keys; always use encryption for storage
4. **DOM Flexibility**: Use semantic selectors; Keboola UI may change `ref` attributes
5. **Error Handling**: Implement comprehensive error messages for user feedback

## 🤝 Contributing

When updating plans:
1. Edit relevant markdown file
2. Update this README if structure changes
3. Add entry to Change Log
4. Commit with descriptive message

## 📞 Contact

For questions about this planning documentation:
- **Project Owner**: [Add name/contact]
- **Technical Lead**: [Add name/contact]
- **Repository**: /Users/padak/github/kbc-e2b-writer

---

**Last Updated**: 2025-10-16
**Version**: 0.1.0 (Planning Phase)

