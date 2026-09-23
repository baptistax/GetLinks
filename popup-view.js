(function exposeView(globalScope) {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const use = document.createElementNS(svg.namespaceURI, 'use');
    svg.setAttribute('aria-hidden', 'true');
    use.setAttribute('href', `icons/ui.svg#${name}`);
    svg.append(use);
    return svg;
  }
  function favicon(url) {
    const img = node('img', 'favicon');
    img.alt = '';
    img.loading = 'lazy';
    const source = new URL(chrome.runtime.getURL('/_favicon/'));
    source.searchParams.set('pageUrl', url);
    source.searchParams.set('size', '32');
    img.addEventListener('error', () => { img.src = 'icons/globe.svg'; }, { once: true });
    img.src = source.href;
    return img;
  }
  function row(item, state) {
    const isTab = state.scope === 'tabs';
    const detailed = isTab || state.settings.displayMode === 'detailed';
    const key = isTab ? item.id : item.url;
    const li = node('li', `result-row${detailed ? '' : ' compact'}`);
    const label = node('label', 'row-label');
    const checkbox = node('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.key = key;
    checkbox.checked = (isTab ? state.selectedTabs : state.selectedLinks).has(key);
    checkbox.disabled = state.busy;
    checkbox.setAttribute('aria-label', `Select ${isTab ? 'tab' : 'link'}: ${item.title}, ${item.url}${isTab ? `, Window ${state.windows.get(item.windowId)}` : ''}`);
    label.append(checkbox);
    if (detailed) label.append(favicon(item.url));
    const content = node('span', 'row-content');
    if (detailed) content.append(node('span', 'row-title', item.title));
    const url = node('span', 'row-url', item.url.replace(/^https?:\/\//, ''));
    url.title = item.url;
    content.append(url);
    if (detailed) {
      const metadata = isTab ? [
        `Window ${state.windows.get(item.windowId)}`,
        item.pinned && 'Pinned', item.muted ? 'Muted' : item.audible && 'Playing',
        item.discarded && 'Sleeping', item.active && 'Active',
        item.groupId !== -1 && 'Grouped', item.incognito && 'Incognito'
      ].filter(Boolean).join(' · ') : `${item.tabCount} open ${item.tabCount === 1 ? 'tab' : 'tabs'}`;
      const meta = node('span', 'row-meta', metadata);
      meta.title = metadata;
      content.append(meta);
    }
    label.append(content);
    li.append(label);
    if (isTab) {
      const more = node('button', 'icon-button row-menu');
      more.dataset.tabId = item.id;
      more.disabled = state.busy;
      more.setAttribute('aria-label', `Actions for ${item.title}`);
      more.setAttribute('aria-haspopup', 'menu');
      more.setAttribute('aria-expanded', 'false');
      more.append(icon('more'));
      li.append(more);
    }
    return li;
  }
  function render(state, visible) {
    const isTab = state.scope === 'tabs';
    $('resultControls').hidden = !state.scan;
    $('linkFilter').hidden = isTab || !state.settings.linkFilterEnabled;
    $('duplicatesControl').hidden = isTab;
    $('windowControl').hidden = !isTab;
    for (const scope of ['links', 'tabs']) {
      const selected = scope === state.scope;
      $(`${scope}Tab`).setAttribute('aria-selected', String(selected));
      $(`${scope}Tab`).tabIndex = selected ? 0 : -1;
    }
    if (state.scan) {
      const { matchedTabs, uniqueLinks } = state.scan.stats;
      $('summary').textContent = `${matchedTabs} ${matchedTabs === 1 ? 'tab' : 'tabs'} · ${uniqueLinks} unique ${uniqueLinks === 1 ? 'link' : 'links'}`;
      $('results').setAttribute('role', 'tabpanel');
      $('results').setAttribute('aria-labelledby', `${state.scope}Tab`);
      $('resultList').setAttribute('aria-label', isTab ? 'Matching tabs' : 'Unique links');
      const empty = $('emptyState');
      empty.hidden = visible.length > 0;
      if (!empty.hidden) {
        empty.replaceChildren(node('h2', '', 'No matching results'), node('p', '',
          state.scan.tabs.length ? 'Try changing the filter or search again.' : `No open tabs match ${state.scan.hostname}.`));
      }
      const focusKey = document.activeElement?.dataset.key;
      const focusTab = document.activeElement?.dataset.tabId;
      const fragment = document.createDocumentFragment();
      for (const item of visible) fragment.append(row(item, state));
      $('resultList').replaceChildren(fragment);
      $('resultList').hidden = !visible.length;
      if (focusKey || focusTab) {
        const replacement = [...$('resultList').querySelectorAll('input, button')].find(
          (element) => focusKey ? element.dataset.key === focusKey : element.dataset.tabId === focusTab);
        (replacement || $(`${state.scope}Tab`)).focus({ preventScroll: true });
      }
    }
    updateSelection(state, visible);
  }
  function updateSelection(state, visible) {
    const isTab = state.scope === 'tabs';
    // Filtering to zero visible rows does not discard the active result set.
    $('actionBar').hidden = state.settingsOpen || !state.scan?.tabs.length;
    const set = isTab ? state.selectedTabs : state.selectedLinks;
    const selected = visible.filter((item) => set.has(isTab ? item.id : item.url));
    for (const input of $('resultList').querySelectorAll('input')) {
      input.checked = set.has(isTab ? Number(input.dataset.key) : input.dataset.key);
      input.disabled = state.busy;
    }
    $('selectionCount').textContent = `${selected.length} selected`;
    $('linkActions').hidden = isTab;
    $('tabActions').hidden = !isTab;
    for (const id of ['copyBtn', 'linkMoreBtn', 'muteBtn', 'reloadBtn']) $(id).disabled = state.busy || !selected.length;
    $('tabMoreBtn').disabled = state.busy || (!selected.length &&
      (!isTab || !GetLinksUtils.planDuplicateClose(visible).closeIds.length));
    $('selectAllBtn').disabled = state.busy || !visible.length || selected.length === visible.length;
    $('clearBtn').disabled = state.busy || !selected.length;
    $('muteBtn').querySelector('span').textContent = isTab && selected.length && selected.every((tab) => tab.muted) ? 'Unmute' : 'Mute';
    for (const id of ['findBtn', 'rootLink', 'linksTab', 'tabsTab', 'duplicatesOnly', 'windowFilter', 'linkFilter', 'settingsBtn']) $(id).disabled = state.busy;
    for (const button of $('resultList').querySelectorAll('button')) button.disabled = state.busy;
    $('results').setAttribute('aria-busy', String(state.busy));
  }
  function renderWindows(state) {
    const fragment = document.createDocumentFragment();
    const option = node('option', '', 'Window: All');
    option.value = 'all';
    fragment.append(option);
    for (const id of [...new Set(state.scan.tabs.map((tab) => tab.windowId))].sort((a, b) => a - b)) {
      if (!state.windows.has(id)) state.windows.set(id, state.windows.size + 1);
      const item = node('option', '', `Window ${state.windows.get(id)}`);
      item.value = String(id);
      fragment.append(item);
    }
    $('windowFilter').replaceChildren(fragment);
    if (![...$('windowFilter').options].some((item) => item.value === state.windowFilter)) state.windowFilter = 'all';
    $('windowFilter').value = state.windowFilter;
  }
  function settings(state, open) {
    closeMenu(false);
    $('workspace').hidden = open;
    $('settingsPanel').hidden = !open;
    $('backBtn').hidden = !open;
    $('settingsBtn').hidden = open;
    $('actionBar').hidden = open || !state.scan?.tabs.length;
    $('settingsFooter').hidden = !open;
    $('status').hidden = open;
    for (const radio of document.querySelectorAll('[name="displayMode"]')) radio.checked = radio.value === state.settings.displayMode;
    $('linkFilterEnabled').checked = state.settings.linkFilterEnabled;
    $('confirmCloseTabs').checked = state.settings.confirmCloseTabs;
    $(open ? 'settingsTitle' : 'settingsBtn').focus();
  }
  function status(message, tone = '') {
    $('status').textContent = message;
    $('status').title = message;
    $('status').dataset.tone = tone;
  }

  let menuAnchor;
  function closeMenu(restoreFocus = true) {
    $('menu').hidden = true;
    if (menuAnchor) {
      menuAnchor.setAttribute('aria-expanded', 'false');
      if (restoreFocus && menuAnchor.isConnected) menuAnchor.focus({ preventScroll: true });
      menuAnchor = null;
    }
  }
  function openMenu(anchor, items, choose) {
    closeMenu(false);
    menuAnchor = anchor;
    const menu = $('menu');
    menu.setAttribute('aria-label', anchor.getAttribute('aria-label') || 'Actions');
    menu.replaceChildren();
    for (const item of items) {
      const button = node('button', item.danger ? 'danger' : '', item.label);
      button.setAttribute('role', 'menuitem');
      button.disabled = Boolean(item.disabled);
      button.addEventListener('click', () => { closeMenu(); choose(item.action); });
      menu.append(button);
    }
    anchor.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
    const rect = anchor.getBoundingClientRect();
    menu.style.left = `${Math.max(8, Math.min(rect.right - menu.offsetWidth, document.body.clientWidth - menu.offsetWidth - 8))}px`;
    menu.style.top = `${Math.max(8, Math.min(rect.bottom + 4, document.body.clientHeight - menu.offsetHeight - 8))}px`;
    menu.querySelector('button:enabled')?.focus();
  }
  function tabMenu(tabs, individual, duplicates) {
    const allMuted = tabs.length && tabs.every((tab) => tab.muted);
    const allPinned = tabs.length && tabs.every((tab) => tab.pinned);
    const items = [];
    const add = (action, label, available = tabs.length, danger = false) => items.push({ action, label, disabled: !available, danger });
    if (individual) {
      add(allMuted ? 'unmute' : 'mute', allMuted ? 'Unmute tab' : 'Mute tab');
      add('reload', 'Reload tab');
    }
    add('sleep', 'Sleep', tabs.some((tab) => !tab.active && !tab.discarded));
    add(allPinned ? 'unpin' : 'pin', allPinned ? 'Unpin' : 'Pin');
    add('group', 'Group', tabs.some((tab) => !tab.pinned));
    add('ungroup', 'Ungroup', tabs.some((tab) => tab.groupId !== -1));
    add('move', 'Move to new window', tabs.length && new Set(tabs.map((tab) => tab.incognito)).size === 1);
    if (!individual) add('duplicates', 'Close duplicates in this view', duplicates, true);
    add('close', individual ? 'Close tab' : 'Close selected', tabs.length, true);
    return items;
  }
  async function confirmClose(count, uniqueLinks) {
    closeMenu();
    const dialog = $('closeDialog');
    const priorFocus = document.activeElement;
    $('closeTitle').textContent = `Close ${count}${uniqueLinks === undefined ? '' : ' duplicate'} ${count === 1 ? 'tab' : 'tabs'}?`;
    $('closeDescription').textContent = `${count} ${uniqueLinks === undefined ? 'matching' : 'duplicate'} ${count === 1 ? 'tab will' : 'tabs will'} be closed.${uniqueLinks === undefined ? '' : `\n${uniqueLinks} unique ${uniqueLinks === 1 ? 'link will' : 'links will'} remain in this view.`}`;
    dialog.returnValue = 'cancel';
    const result = new Promise((resolve) => dialog.addEventListener('close', () => {
      priorFocus?.focus({ preventScroll: true });
      resolve(dialog.returnValue === 'close');
    }, { once: true }));
    dialog.showModal();
    return result;
  }
  document.addEventListener('pointerdown', (event) => {
    if (!$('menu').hidden && !$('menu').contains(event.target) && !menuAnchor?.contains(event.target)) closeMenu(false);
  });
  $('results').addEventListener('scroll', () => closeMenu(), { passive: true });
  document.addEventListener('keydown', (event) => {
    if ($('menu').hidden) return;
    if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') event.preventDefault();
      closeMenu();
      return;
    }
    const buttons = [...$('menu').querySelectorAll('button:enabled')];
    const index = buttons.indexOf(document.activeElement);
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 :
        (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next]?.focus();
    }
  });
  globalScope.GetLinksView = Object.freeze({ $, render, updateSelection, renderWindows,
    settings, status, closeMenu, openMenu, tabMenu, confirmClose });
})(globalThis);
