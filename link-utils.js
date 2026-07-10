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
    const site = parseSiteInput(input);
    const links = [];
    const seen = new Set();
    let matchedTabCount = 0;

    for (const tab of tabs) {
      const parsedUrl = normalizeMatchingUrl(tab.pendingUrl || tab.url);

      if (!parsedUrl || !matchesSite(parsedUrl, site)) {
        continue;
      }

      matchedTabCount += 1;
      const canonicalUrl = parsedUrl.href;

      if (!seen.has(canonicalUrl)) {
        seen.add(canonicalUrl);
        links.push(canonicalUrl);
      }
    }

    return {
      hostname: site.hostname,
      links,
      matchedTabCount,
      duplicateCount: matchedTabCount - links.length
    };
  }

  const api = Object.freeze({
    collectMatchingLinks,
    matchesSite,
    normalizeHostname,
    parseSiteInput
  });

  globalScope.GetLinksUtils = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis === 'undefined' ? this : globalThis);
