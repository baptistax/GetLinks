'use strict';

const utils = GetLinksUtils;
const view = GetLinksView;
const $ = view.$;
const state = {
  settings: { ...GetLinksSettings.defaults }, scan: null, scope: 'links', busy: true,
  selectedLinks: new Set(), selectedTabs: new Set(), windows: new Map(),
  windowFilter: 'all', filter: '', duplicatesOnly: false, suggestion: '', settingsOpen: false
};

function visibleItems() {
  if (!state.scan) return [];
  return state.scope === 'links' ? utils.filterLinks(state.scan.links, {
    text: state.settings.linkFilterEnabled ? state.filter : '', duplicatesOnly: state.duplicatesOnly
  }) : state.scan.tabs.filter((tab) => state.windowFilter === 'all' || String(tab.windowId) === state.windowFilter);
}
function selectedItems() {
  const isTab = state.scope === 'tabs';
  const selection = isTab ? state.selectedTabs : state.selectedLinks;
  return visibleItems().filter((item) => selection.has(isTab ? item.id : item.url));
}
function render() { view.render(state, visibleItems()); }
function setBusy(busy) {
  state.busy = busy;
  view.updateSelection(state, visibleItems());
}
function reportError(error) {
  view.status(error instanceof Error ? error.message : 'Chrome could not complete the action.', 'error');
}

async function search(event) {
  event.preventDefault();
  if (state.busy) return;
  const input = $('rootLink').value.trim() || state.suggestion;
  try {
    utils.parseSiteInput(input);
    setBusy(true);
    view.closeMenu(false);
    view.status('Searching open tabs…');
    const scan = utils.scanTabs(await chrome.tabs.query({}), input);
    state.scan = scan;
    state.scope = 'links';
    state.selectedLinks = new Set(scan.links.map((link) => link.url));
    state.selectedTabs.clear();
    state.windows.clear();
    state.windowFilter = 'all';
    state.filter = '';
    state.duplicatesOnly = false;
    $('linkFilter').value = '';
    $('duplicatesOnly').checked = false;
    // Preserve an explicit port when making the canonical search editable.
    $('rootLink').value = scan.hostname + (scan.site.port ? `:${scan.site.port}` : '');
    view.renderWindows(state);
    render();
    $('results').scrollTop = 0;
    view.status(scan.tabs.length ? `Showing matches for ${scan.hostname}.` : `No open tabs match ${scan.hostname}.`);
  } catch (error) {
    reportError(error);
  } finally {
    setBusy(false);
    $('rootLink').focus();
  }
}

function changeScope(scope) {
  if (state.busy || !state.scan) return;
  state.scope = scope;
  view.closeMenu(false);
  render();
  $('results').scrollTop = 0;
}
function selectVisible(select) {
  const isTab = state.scope === 'tabs';
  const selection = isTab ? state.selectedTabs : state.selectedLinks;
  for (const item of visibleItems()) {
    const key = isTab ? item.id : item.url;
    if (select) selection.add(key);
    else selection.delete(key);
  }
  view.updateSelection(state, visibleItems());
}

async function copyLinks() {
  const links = selectedItems();
  if (state.busy || !links.length) return;
  try {
    await navigator.clipboard.writeText(links.map((link) => link.url).join('\n'));
    view.status(`${links.length} ${links.length === 1 ? 'link' : 'links'} copied.`, 'success');
  } catch {
    view.status('Chrome could not copy the links. Try Download .txt.', 'error');
  }
}
function downloadLinks() {
  const links = selectedItems();
  if (state.busy || !links.length) return;
  const blob = new Blob([`${links.map((link) => link.url).join('\n')}\n`], { type: 'text/plain;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = `getlinks-${state.scan.hostname.replace(/[^a-z0-9.-]+/gi, '-')}.txt`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  view.status(`Downloading ${links.length} selected ${links.length === 1 ? 'link' : 'links'}.`, 'success');
}

async function refreshScan() {
  // Refresh only members of the current scan; Search discovers newly opened tabs.
  const results = await Promise.allSettled(state.scan.tabs.map((tab) => chrome.tabs.get(tab.id)));
  state.scan = utils.scanTabs(results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []),
    state.scan.hostname + (state.scan.site.port ? `:${state.scan.site.port}` : ''));
  const urls = new Set(state.scan.links.map((link) => link.url));
  const ids = new Set(state.scan.tabs.map((tab) => tab.id));
  state.selectedLinks = new Set([...state.selectedLinks].filter((url) => urls.has(url)));
  state.selectedTabs = new Set([...state.selectedTabs].filter((id) => ids.has(id)));
  view.renderWindows(state);
  render();
}

const actionLabels = {
  mute: 'Muted', unmute: 'Unmuted', reload: 'Reloaded', sleep: 'Put to sleep:',
  pin: 'Pinned', unpin: 'Unpinned', group: 'Grouped', ungroup: 'Ungrouped',
  move: 'Moved', close: 'Closed', duplicates: 'Closed'
};
async function runTabAction(action, targets) {
  if (state.busy || !state.scan) return;
  view.closeMenu();
  const priorFocus = document.activeElement;
  setBusy(true);
  try {
    let approvedIds;
    if (action === 'duplicates') {
      const live = await GetLinksTabActions.currentTargets(targets, state.scan.site);
      const plan = utils.planDuplicateClose(live);
      approvedIds = plan.closeIds;
      if (!approvedIds.length) {
        view.status('No duplicate tabs remain in this view.');
        await refreshScan();
        return;
      }
      if (state.settings.confirmCloseTabs && !await view.confirmClose(approvedIds.length, plan.uniqueLinks)) return;
    } else if (action === 'close' && state.settings.confirmCloseTabs &&
      !await view.confirmClose(targets.length)) return;
    view.status('Updating matching tabs…');
    const result = action === 'duplicates'
      ? await GetLinksTabActions.closeDuplicates(targets, state.scan.site, approvedIds)
      : await GetLinksTabActions.execute(action, targets, state.scan.site);
    await refreshScan();
    view.status(`${actionLabels[action]} ${result.done} ${result.done === 1 ? 'tab' : 'tabs'}.` +
      (result.skipped ? ` ${result.skipped} skipped (unavailable or changed).` : '') +
      (result.failed ? ` ${result.failed} could not be updated.` : ''), result.failed ? 'error' : 'success');
  } catch (error) {
    await refreshScan().catch(() => {});
    reportError(error);
  } finally {
    setBusy(false);
    if (priorFocus?.isConnected && !priorFocus.disabled) priorFocus.focus({ preventScroll: true });
    else $(`${state.scope}Tab`).focus({ preventScroll: true });
  }
}
function openTabMenu(anchor, individual) {
  const targets = individual ? [individual] : selectedItems();
  const scopeTabs = visibleItems();
  view.openMenu(anchor, view.tabMenu(targets, Boolean(individual), utils.planDuplicateClose(scopeTabs).closeIds.length),
    (action) => runTabAction(action, action === 'duplicates' ? scopeTabs : targets));
}

function openSettings(open) {
  state.settingsOpen = open;
  if (!open) render();
  view.settings(state, open);
}
async function saveSettings() {
  const previous = state.settings;
  const next = {
    displayMode: document.querySelector('[name="displayMode"]:checked').value,
    linkFilterEnabled: $('linkFilterEnabled').checked, confirmCloseTabs: $('confirmCloseTabs').checked
  };
  if (Object.keys(next).every((key) => next[key] === previous[key])) return;
  state.settings = next;
  const inputs = [...$('settingsPanel').querySelectorAll('input')];
  inputs.forEach((input) => { input.disabled = true; });
  $('saveStatus').textContent = 'Saving…';
  try {
    await GetLinksSettings.save(state.settings);
    $('saveStatus').textContent = 'Saved automatically';
  } catch {
    state.settings = previous;
    view.settings(state, state.settingsOpen);
    $('saveStatus').textContent = 'Could not save. Please try again.';
    view.status('Could not save preferences. Please try again.', 'error');
  } finally {
    inputs.forEach((input) => { input.disabled = false; });
  }
}

function bindEvents() {
  $('searchForm').addEventListener('submit', search);
  for (const scope of ['links', 'tabs']) $(`${scope}Tab`).addEventListener('click', () => changeScope(scope));
  document.querySelector('[role="tablist"]').addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    changeScope(event.key === 'Home' ? 'links' : event.key === 'End' ? 'tabs' : state.scope === 'links' ? 'tabs' : 'links');
    $(`${state.scope}Tab`).focus();
  });
  $('selectAllBtn').addEventListener('click', () => selectVisible(true));
  $('clearBtn').addEventListener('click', () => selectVisible(false));
  $('duplicatesOnly').addEventListener('change', (event) => {
    state.duplicatesOnly = event.target.checked;
    if (state.duplicatesOnly) selectVisible(true);
    render();
  });
  $('linkFilter').addEventListener('input', (event) => { state.filter = event.target.value; render(); });
  $('windowFilter').addEventListener('change', (event) => { state.windowFilter = event.target.value; render(); });
  $('resultList').addEventListener('change', (event) => {
    if (!event.target.matches('input[data-key]')) return;
    const isTab = state.scope === 'tabs';
    const key = isTab ? Number(event.target.dataset.key) : event.target.dataset.key;
    const selection = isTab ? state.selectedTabs : state.selectedLinks;
    if (event.target.checked) selection.add(key);
    else selection.delete(key);
    view.updateSelection(state, visibleItems());
  });
  $('resultList').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-tab-id]');
    if (!button || state.busy) return;
    const tab = state.scan.tabs.find((item) => item.id === Number(button.dataset.tabId));
    if (tab) openTabMenu(button, tab);
  });
  $('copyBtn').addEventListener('click', copyLinks);
  $('linkMoreBtn').addEventListener('click', (event) => view.openMenu(event.currentTarget,
    [{ label: 'Download selected .txt', action: 'download' }], downloadLinks));
  $('muteBtn').addEventListener('click', () => {
    const targets = selectedItems();
    runTabAction(targets.every((tab) => tab.muted) ? 'unmute' : 'mute', targets);
  });
  $('reloadBtn').addEventListener('click', () => runTabAction('reload', selectedItems()));
  $('tabMoreBtn').addEventListener('click', (event) => openTabMenu(event.currentTarget));
  $('settingsBtn').addEventListener('click', () => openSettings(true));
  $('backBtn').addEventListener('click', () => openSettings(false));
  $('settingsPanel').addEventListener('change', saveSettings);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.settingsOpen) openSettings(false);
  });
}

async function initialize() {
  setBusy(true);
  const [preferences, active] = await Promise.allSettled([
    GetLinksSettings.load(), chrome.tabs.query({ active: true, currentWindow: true })
  ]);
  if (preferences.status === 'fulfilled') state.settings = preferences.value;
  else view.status('Preferences could not be loaded. Using defaults.', 'error');
  if (active.status === 'fulfilled') {
    const tab = active.value[0];
    const url = utils.normalizeMatchingUrl(tab?.pendingUrl || tab?.url);
    if (url) {
      state.suggestion = utils.normalizeHostname(url.hostname);
      $('rootLink').placeholder = state.suggestion;
    }
  }
  bindEvents();
  state.busy = false;
  render();
  $('rootLink').focus();
}
initialize().catch(reportError);
