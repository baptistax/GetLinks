'use strict';

let foundLinks = [];
let matchedHostname = '';

document.addEventListener('DOMContentLoaded', () => {
  const rootInput = document.getElementById('rootLink');

  document.getElementById('findBtn').addEventListener('click', findLinks);
  document.getElementById('copyBtn').addEventListener('click', copyLinks);
  document.getElementById('downloadBtn').addEventListener('click', downloadLinks);
  document.getElementById('resetBtn').addEventListener('click', resetView);
  rootInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      findLinks();
    }
  });

  rootInput.focus();
});

async function findLinks() {
  const rootInput = document.getElementById('rootLink');
  const findButton = document.getElementById('findBtn');

  setStatus('Searching open tabs...');
  findButton.disabled = true;

  try {
    const tabs = await chrome.tabs.query({});
    const result = GetLinksUtils.collectMatchingLinks(tabs, rootInput.value);

    foundLinks = result.links;
    matchedHostname = result.hostname;

    if (foundLinks.length === 0) {
      setStatus(`No open tabs found for ${matchedHostname}.`, 'error');
      return;
    }

    document.getElementById('count').textContent = foundLinks.length;
    document.getElementById('linkWord').textContent = foundLinks.length === 1 ? 'link' : 'links';
    document.getElementById('resultLinks').value = foundLinks.join('\n');
    document.getElementById('step1').hidden = true;
    document.getElementById('step2').hidden = false;

    if (result.duplicateCount > 0) {
      const tabWord = result.duplicateCount === 1 ? 'tab' : 'tabs';
      setStatus(`${result.duplicateCount} duplicate ${tabWord} omitted.`, 'success');
    } else {
      setStatus(`Showing links from ${matchedHostname}.`, 'success');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.';
    setStatus(message, 'error');
  } finally {
    findButton.disabled = false;
  }
}

async function copyLinks() {
  if (foundLinks.length === 0) {
    return;
  }

  try {
    await navigator.clipboard.writeText(foundLinks.join('\n'));
    setStatus('Links copied to the clipboard.', 'success');
  } catch {
    setStatus('Chrome could not copy the links.', 'error');
  }
}

function downloadLinks() {
  if (foundLinks.length === 0) {
    return;
  }

  const text = `${foundLinks.join('\n')}\n`;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeHostname = matchedHostname.replace(/[^a-z0-9.-]+/gi, '-');

  anchor.href = objectUrl;
  anchor.download = `getlinks-${safeHostname}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

  setStatus('Text file downloaded.', 'success');
}

function resetView() {
  foundLinks = [];
  matchedHostname = '';
  document.getElementById('step1').hidden = false;
  document.getElementById('step2').hidden = true;
  document.getElementById('resultLinks').value = '';
  setStatus('');
  document.getElementById('rootLink').select();
}

function setStatus(message, tone = '') {
  const status = document.getElementById('status');
  status.textContent = message;
  status.dataset.tone = tone;
}
