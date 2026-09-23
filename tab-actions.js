(function exposeTabActions(globalScope) {
  'use strict';
  const utils = GetLinksUtils;

  // Recheck targets: a tab may close or navigate while a confirmation is open.
  async function currentTargets(targets, site) {
    const results = await Promise.allSettled(targets.map((tab) => chrome.tabs.get(tab.id)));
    return results.flatMap((result, index) => {
      if (result.status !== 'fulfilled') return [];
      const tab = result.value;
      const url = utils.normalizeMatchingUrl(tab.pendingUrl || tab.url);
      if (!url || !utils.matchesSite(url, site) || url.href !== targets[index].url) return [];
      return utils.scanTabs([tab], site.hostname + (site.port ? `:${site.port}` : '')).tabs;
    });
  }

  async function execute(action, targets, site) {
    const live = await currentTargets(targets, site);
    let skipped = targets.length - live.length;
    let eligible = live;
    if (action === 'sleep') eligible = live.filter((tab) => !tab.active && !tab.discarded);
    if (action === 'group') eligible = live.filter((tab) => !tab.pinned);
    if (action === 'ungroup') eligible = live.filter((tab) => tab.groupId !== -1);
    skipped += live.length - eligible.length;
    if (!eligible.length) return { done: 0, skipped, failed: 0 };
    if (action === 'move') return moveToNewWindow(eligible, skipped);
    let operations;
    if (action === 'group') {
      operations = utils.groupTabsByWindow(eligible).map(({ windowId, tabIds }) => ({
        count: tabIds.length,
        run: () => chrome.tabs.group({ tabIds, createProperties: { windowId } })
      }));
    } else {
      operations = eligible.map((tab) => ({ count: 1, run: () => {
        switch (action) {
          case 'mute': return chrome.tabs.update(tab.id, { muted: true });
          case 'unmute': return chrome.tabs.update(tab.id, { muted: false });
          case 'pin': return chrome.tabs.update(tab.id, { pinned: true });
          case 'unpin': return chrome.tabs.update(tab.id, { pinned: false });
          case 'reload': return chrome.tabs.reload(tab.id);
          case 'sleep': return chrome.tabs.discard(tab.id).then((result) => {
            if (!result) throw new Error('Tab could not be put to sleep.');
          });
          case 'ungroup': return chrome.tabs.ungroup(tab.id);
          case 'close': return chrome.tabs.remove(tab.id);
          default: throw new Error('Unknown tab action.');
        }
      } }));
    }
    // Dispatch before awaiting: closing the active tab can destroy this popup.
    const results = await Promise.allSettled(operations.map(({ run }) => run()));
    let done = 0;
    let failed = 0;
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') done += operations[index].count;
      else failed += operations[index].count;
    });
    return { done, skipped, failed };
  }

  async function moveToNewWindow(tabs, skipped) {
    if (new Set(tabs.map((tab) => tab.incognito)).size > 1) {
      throw new Error('Choose regular or Incognito tabs separately.');
    }
    // Create unfocused, then move ALL IDs in one native call. The source window
    // may lose its last tab; no further JS is needed to move the remaining tabs.
    const destination = await chrome.windows.create({
      focused: false, type: 'normal', incognito: tabs[0].incognito, url: 'about:blank'
    });
    const blankId = destination.tabs?.[0]?.id;
    const ordered = [...tabs].sort((a, b) => Number(b.pinned) - Number(a.pinned) ||
      utils.compareTabOrder(a, b));
    let moved;
    try {
      moved = await chrome.tabs.move(ordered.map((tab) => tab.id), {
        windowId: destination.id, index: 0
      });
    } catch {
      // Never remove the destination window: a partial move may contain user tabs.
      if (blankId !== undefined) await chrome.tabs.remove(blankId).catch(() => {});
      throw new Error('Chrome could not move every tab. Search again to check their windows.');
    }
    if (blankId !== undefined) await chrome.tabs.remove(blankId).catch(() => {});
    // Movement is complete before focus can destroy the popup.
    await chrome.windows.update(destination.id, { focused: true });
    const done = Array.isArray(moved) ? moved.length : 1;
    return { done, skipped, failed: tabs.length - done };
  }
  async function closeDuplicates(targets, site, approvedIds) {
    // Replan after confirmation: if a keeper closed/navigated, preserve a survivor.
    // Never add a new closing candidate the user has not already confirmed.
    const live = await currentTargets(targets, site);
    const safeIds = new Set(utils.planDuplicateClose(live).closeIds);
    const approved = new Set(approvedIds);
    const closing = live.filter((tab) => approved.has(tab.id) && safeIds.has(tab.id));
    const result = await execute('close', closing, site);
    result.skipped += approved.size - closing.length;
    return result;
  }
  globalScope.GetLinksTabActions = Object.freeze({ execute, currentTargets, closeDuplicates });
})(globalThis);
