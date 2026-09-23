(function exposeGetLinksUtils(globalScope) {
  'use strict';

  function normalizeHostname(hostname) {
    return hostname.toLowerCase().replace(/\.$/, '');
  }

  function parseSiteInput(input) {
    const value = String(input ?? '').trim();

    if (!value) {
      throw new Error('Enter a site or domain first.');
    }

    const hasScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(value);
    const candidate = hasScheme ? value : `https://${value}`;
    let parsed;

    try {
      parsed = new URL(candidate);
    } catch {
      throw new Error('Enter a valid site, such as https://example.com.');
    }

    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
      throw new Error('Enter an HTTP or HTTPS site.');
    }

    return {
      hostname: normalizeHostname(parsed.hostname),
      port: parsed.port
    };
  }

  function normalizeMatchingUrl(value) {
    if (!value) {
      return null;
    }

    try {
      const parsed = new URL(value);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function matchesSite(parsedUrl, site) {
    const hostname = normalizeHostname(parsedUrl.hostname);
    const hostnameMatches = hostname === site.hostname || hostname.endsWith(`.${site.hostname}`);
    const portMatches = site.port === '' || parsedUrl.port === site.port;

    return hostnameMatches && portMatches;
  }

  function collectMatchingLinks(tabs, input) {
    const result = scanTabs(tabs, input);
    return {
      hostname: result.hostname,
      links: result.links.map((link) => link.url),
      matchedTabCount: result.stats.matchedTabs,
      duplicateCount: result.stats.duplicateTabs
    };
  }

  // Keep only fields used by the UI/actions, never raw Chrome objects.
  function scanTabs(rawTabs, input) {
    const site = parseSiteInput(input);
    const tabs = [];
    const byUrl = new Map();

    for (const tab of rawTabs) {
      const parsedUrl = normalizeMatchingUrl(tab.pendingUrl || tab.url);

      if (!parsedUrl || !matchesSite(parsedUrl, site)) {
        continue;
      }

      const canonicalUrl = parsedUrl.href;
      const title = tab.title || canonicalUrl;
      tabs.push({
        id: tab.id, windowId: tab.windowId, index: tab.index,
        url: canonicalUrl, title, active: Boolean(tab.active),
        pinned: Boolean(tab.pinned), audible: Boolean(tab.audible),
        muted: Boolean(tab.mutedInfo?.muted), discarded: Boolean(tab.discarded),
        groupId: tab.groupId ?? -1, incognito: Boolean(tab.incognito)
      });
      if (!byUrl.has(canonicalUrl)) {
        byUrl.set(canonicalUrl, { url: canonicalUrl, title,
          hostname: normalizeHostname(parsedUrl.hostname), tabIds: [], tabCount: 0 });
      }
      const link = byUrl.get(canonicalUrl);
      link.tabIds.push(tab.id);
      link.tabCount += 1;
      if (link.title === canonicalUrl && tab.title) link.title = tab.title;
    }
    const links = [...byUrl.values()];
    return {
      hostname: site.hostname, site, links, tabs,
      stats: { matchedTabs: tabs.length, uniqueLinks: links.length,
        duplicateTabs: tabs.length - links.length }
    };
  }

  function filterLinks(links, { text = '', duplicatesOnly = false } = {}) {
    const query = text.trim().toLowerCase();
    return links.filter((link) => (!duplicatesOnly || link.tabCount > 1) &&
      (!query || [link.url, link.title, link.hostname].some(
        (value) => value.toLowerCase().includes(query))));
  }

  // Stable order: ascending Chrome window ID, then tab-strip index, then tab ID.
  function compareTabOrder(a, b) {
    return a.windowId - b.windowId || a.index - b.index || a.id - b.id;
  }

  function groupTabsByWindow(tabs) {
    const groups = new Map();
    for (const tab of [...tabs].sort(compareTabOrder)) {
      if (!groups.has(tab.windowId)) groups.set(tab.windowId, []);
      groups.get(tab.windowId).push(tab.id);
    }
    return [...groups].map(([windowId, tabIds]) => ({ windowId, tabIds }));
  }

  function planDuplicateClose(tabs) {
    const groups = new Map();
    for (const tab of tabs) {
      const url = normalizeMatchingUrl(tab.url)?.href;
      if (!url) continue;
      if (!groups.has(url)) groups.set(url, []);
      groups.get(url).push(tab);
    }
    const keepIds = [];
    const closeIds = [];
    for (const group of groups.values()) {
      group.sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
        Number(Boolean(b.active)) - Number(Boolean(a.active)) || compareTabOrder(a, b));
      keepIds.push(group[0].id);
      closeIds.push(...group.slice(1).map((tab) => tab.id));
    }
    return { keepIds, closeIds, uniqueLinks: groups.size };
  }

  const api = Object.freeze({
    collectMatchingLinks,
    scanTabs,
    filterLinks,
    planDuplicateClose,
    groupTabsByWindow,
    compareTabOrder,
    normalizeMatchingUrl,
    matchesSite,
    normalizeHostname,
    parseSiteInput
  });

  globalScope.GetLinksUtils = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis === 'undefined' ? this : globalThis);
