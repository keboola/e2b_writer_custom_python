// This script runs in the page context (not isolated like content scripts)
// It can access page JavaScript objects like CodeMirror

(function() {
  // Listen for requests from the content script
  document.addEventListener('e2b-get-value', function() {
    // Find all CodeMirror editors
    const editors = document.querySelectorAll('.CodeMirror');
    let targetEditor = null;

    // Look for the User Parameters editor (contains "debug" or "e2b")
    for (const editor of editors) {
      if (editor.CodeMirror) {
        const value = editor.CodeMirror.getValue();
        if (value.includes('debug') || value.includes('e2b')) {
          targetEditor = editor;
          break;
        }
      }
    }

    if (targetEditor && targetEditor.CodeMirror) {
      const value = targetEditor.CodeMirror.getValue();
      document.dispatchEvent(new CustomEvent('e2b-cm-value', { detail: value }));
    } else {
      document.dispatchEvent(new CustomEvent('e2b-cm-value', { detail: null }));
    }
  });

  document.addEventListener('e2b-set-value', function(e) {
    const newValue = e.detail;

    // Find all CodeMirror editors
    const editors = document.querySelectorAll('.CodeMirror');
    let targetEditor = null;

    // Look for the User Parameters editor
    for (const editor of editors) {
      if (editor.CodeMirror) {
        const value = editor.CodeMirror.getValue();
        if (value.includes('debug') || value.includes('e2b')) {
          targetEditor = editor;
          break;
        }
      }
    }

    if (targetEditor && targetEditor.CodeMirror) {
      targetEditor.CodeMirror.setValue(newValue);
      document.dispatchEvent(new CustomEvent('e2b-cm-set', { detail: 'success' }));
    } else {
      document.dispatchEvent(new CustomEvent('e2b-cm-set', { detail: 'error' }));
    }
  });

  console.log('[e2b Extension] Inject helper loaded in page context');
})();
