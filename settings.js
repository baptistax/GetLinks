(function exposeSettings(globalScope) {
  'use strict';
  const defaults = Object.freeze({
    displayMode: 'compact', linkFilterEnabled: false, confirmCloseTabs: true
  });
  function sanitize(values) {
    return {
      displayMode: values.displayMode === 'detailed' ? 'detailed' : 'compact',
      linkFilterEnabled: typeof values.linkFilterEnabled === 'boolean'
        ? values.linkFilterEnabled : defaults.linkFilterEnabled,
      confirmCloseTabs: typeof values.confirmCloseTabs === 'boolean'
        ? values.confirmCloseTabs : defaults.confirmCloseTabs
    };
  }
  globalScope.GetLinksSettings = Object.freeze({
    defaults,
    async load() { return sanitize(await chrome.storage.local.get(defaults)); },
    async save(values) { await chrome.storage.local.set(sanitize(values)); }
  });
})(globalThis);
