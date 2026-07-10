'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  collectMatchingLinks,
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
