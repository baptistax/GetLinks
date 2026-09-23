'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  collectMatchingLinks,
  scanTabs,
  filterLinks,
  planDuplicateClose,
  groupTabsByWindow,
  matchesSite,
  parseSiteInput
} = require('../link-utils.js');

test('accepts a bare domain or a complete URL', () => {
  assert.deepEqual(parseSiteInput('example.com'), { hostname: 'example.com', port: '' });
  assert.deepEqual(parseSiteInput('https://www.example.com/a'), { hostname: 'www.example.com', port: '' });
});

test('matches the domain and real subdomains only', () => {
  const site = parseSiteInput('example.com');

  assert.equal(matchesSite(new URL('https://example.com/a'), site), true);
  assert.equal(matchesSite(new URL('https://files.example.com/a'), site), true);
  assert.equal(matchesSite(new URL('https://notexample.com/a'), site), false);
  assert.equal(matchesSite(new URL('https://other.test/example.com'), site), false);
  assert.equal(matchesSite(new URL('https://other.test/?next=example.com'), site), false);
});

test('does not broaden a www hostname to a public suffix', () => {
  const site = parseSiteInput('www.com');

  assert.equal(matchesSite(new URL('https://www.com/a'), site), true);
  assert.equal(matchesSite(new URL('https://example.com/a'), site), false);
});

test('removes duplicate URLs while preserving distinct URLs and tab order', () => {
  const tabs = [
    { url: 'https://example.com/a' },
    { url: 'https://example.com/a' },
    { url: 'https://example.com/b?part=1' },
    { url: 'https://example.com/b?part=2' },
    { url: 'https://notexample.com/a' }
  ];

  assert.deepEqual(collectMatchingLinks(tabs, 'example.com'), {
    hostname: 'example.com',
    links: [
      'https://example.com/a',
      'https://example.com/b?part=1',
      'https://example.com/b?part=2'
    ],
    matchedTabCount: 4,
    duplicateCount: 1
  });
});

test('uses a pending URL when a tab is still loading', () => {
  const result = collectMatchingLinks([
    { url: 'about:blank', pendingUrl: 'https://example.com/loading' }
  ], 'example.com');

  assert.deepEqual(result.links, ['https://example.com/loading']);
});

test('matches an explicitly supplied port but ignores ports otherwise', () => {
  const tabs = [
    { url: 'http://localhost:3000/a' },
    { url: 'http://localhost:4000/b' }
  ];

  assert.deepEqual(collectMatchingLinks(tabs, 'localhost:3000').links, [
    'http://localhost:3000/a'
  ]);
  assert.equal(collectMatchingLinks(tabs, 'localhost').links.length, 2);
});

test('rejects empty, invalid, and non-web inputs', () => {
  assert.throws(() => parseSiteInput(''), /Enter a site/);
  assert.throws(() => parseSiteInput('not a domain'), /valid site/);
  assert.throws(() => parseSiteInput('ftp://example.com'), /HTTP or HTTPS/);
});

test('groups canonical URLs into unique links and retains only useful tab fields', () => {
  const result = scanTabs([
    { id: 1, windowId: 10, index: 0, url: 'https://EXAMPLE.com:443/a', title: 'Page A',
      active: true, pinned: true, audible: true, mutedInfo: { muted: true }, groupId: 8,
      sessionId: 'not retained', favIconUrl: 'https://remote.test/icon.png' },
    { id: 2, windowId: 20, index: 0, url: 'https://example.com/a', discarded: true },
    { id: 3, windowId: 20, index: 1, url: 'https://sub.example.com/b', title: 'Page B' },
    { id: 4, url: 'https://unrelated.test/' },
    { id: 5, url: 'chrome://extensions' },
    { id: 6, url: 'invalid' }
  ], 'example.com');
  assert.deepEqual(result.stats, { matchedTabs: 3, uniqueLinks: 2, duplicateTabs: 1 });
  assert.deepEqual(result.links[0], {
    url: 'https://example.com/a', title: 'Page A', hostname: 'example.com', tabIds: [1, 2], tabCount: 2
  });
  assert.deepEqual(result.tabs[0], {
    id: 1, windowId: 10, index: 0, url: 'https://example.com/a', title: 'Page A',
    active: true, pinned: true, audible: true, muted: true, discarded: false, groupId: 8, incognito: false
  });
  assert.equal(result.tabs[1].discarded, true);
  assert.equal(result.tabs[1].groupId, -1);
});

test('uses a later available title and keeps paths, queries, fragments and protocols distinct', () => {
  const urls = ['https://example.com/a', 'https://example.com/a', 'https://example.com/a?q=1',
    'https://example.com/a#part', 'https://example.com/b', 'http://example.com/a'];
  const { links } = scanTabs(urls.map((url, id) => ({ id, url, title: id === 1 ? 'A title' : '' })), 'example.com');
  assert.equal(links.length, 5);
  assert.equal(links[0].title, 'A title');
  assert.equal(links[0].tabCount, 2);
});

test('filters duplicates once per URL and text literally by title, URL or hostname without mutation', () => {
  const { links } = scanTabs([
    { id: 1, url: 'https://example.com/a', title: 'Getting Started' },
    { id: 2, url: 'https://example.com/a' },
    { id: 3, url: 'https://docs.example.com/b?q=1', title: 'Reference [1]' }
  ], 'example.com');
  const original = structuredClone(links);
  assert.deepEqual(filterLinks(links, { duplicatesOnly: true }), [links[0]]);
  assert.deepEqual(filterLinks(links, { text: '  GETTING  ' }), [links[0]]);
  assert.deepEqual(filterLinks(links, { text: 'docs.example' }), [links[1]]);
  assert.deepEqual(filterLinks(links, { text: '?q=1' }), [links[1]]);
  assert.deepEqual(filterLinks(links, { text: '[1]' }), [links[1]]);
  assert.deepEqual(filterLinks(links, { text: '.*' }), []);
  assert.deepEqual(filterLinks(links, { text: 'reference', duplicatesOnly: true }), []);
  assert.deepEqual(links, original);
});

test('duplicate keepers prefer pinned, then active, then window/index/id order', () => {
  const tab = (id, windowId, index, extra = {}) => ({ id, windowId, index, url: 'https://example.com/a', ...extra });
  const cases = [
    [tab(1, 1, 0, { active: true }), tab(2, 2, 4, { pinned: true }), 2],
    [tab(1, 1, 0), tab(2, 2, 4, { active: true }), 2],
    [tab(2, 2, 0), tab(1, 1, 9), 1],
    [tab(2, 1, 5), tab(1, 1, 2), 1],
    [tab(2, 1, 2), tab(1, 1, 2), 1],
    [tab(1, 1, 0, { pinned: true }), tab(2, 2, 4, { pinned: true, active: true }), 2]
  ];
  for (const [a, b, keeper] of cases) {
    const input = [a, b];
    const original = structuredClone(input);
    const plan = planDuplicateClose(input);
    assert.deepEqual(plan.keepIds, [keeper]);
    assert.equal(plan.closeIds.length, 1);
    assert.equal(plan.closeIds.includes(keeper), false);
    assert.equal(plan.uniqueLinks, 1);
    assert.deepEqual(input, original);
  }
});

test('duplicate plan preserves one per canonical URL, including a changed keeper', () => {
  const tabs = [
    { id: 1, windowId: 1, index: 0, url: 'https://EXAMPLE.com:443/a', pinned: true },
    { id: 2, windowId: 1, index: 1, url: 'https://example.com/a' },
    { id: 3, windowId: 1, index: 2, url: 'https://example.com/a' },
    { id: 4, windowId: 1, index: 3, url: 'https://example.com/a#different' }
  ];
  assert.deepEqual(planDuplicateClose(tabs), { keepIds: [1, 4], closeIds: [2, 3], uniqueLinks: 2 });
  assert.deepEqual(planDuplicateClose(tabs.slice(1)), { keepIds: [2, 4], closeIds: [3], uniqueLinks: 2 });
  assert.deepEqual(planDuplicateClose([tabs[1]]).closeIds, []);
});

test('groups tab IDs separately per window in stable browser order without modifying input', () => {
  const tabs = [{ id: 3, windowId: 20, index: 3 }, { id: 2, windowId: 10, index: 2 },
    { id: 1, windowId: 10, index: 0 }, { id: 4, windowId: 20, index: 1 }];
  const original = structuredClone(tabs);
  assert.deepEqual(groupTabsByWindow(tabs), [
    { windowId: 10, tabIds: [1, 2] }, { windowId: 20, tabIds: [4, 3] }
  ]);
  assert.deepEqual(tabs, original);
  assert.deepEqual(groupTabsByWindow([]), []);
});

test('handles empty scans, normalizes hostname case and trailing dots', () => {
  assert.deepEqual(scanTabs([], 'example.com').stats, { matchedTabs: 0, uniqueLinks: 0, duplicateTabs: 0 });
  assert.equal(collectMatchingLinks([{ url: 'https://sub.EXAMPLE.com./a' }], 'EXAMPLE.com.').links.length, 1);
  assert.deepEqual(planDuplicateClose([]), { keepIds: [], closeIds: [], uniqueLinks: 0 });
});
