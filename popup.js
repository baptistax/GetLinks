let foundLinks = [];

document.addEventListener('DOMContentLoaded', () => {
  const findBtn = document.getElementById('findBtn');
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const resetBtn = document.getElementById('resetBtn');
  
  findBtn.addEventListener('click', findLinks);
  copyBtn.addEventListener('click', copyLinks);
  downloadBtn.addEventListener('click', downloadLinks);
  resetBtn.addEventListener('click', resetView);
});

async function findLinks() {
  const rootLink = document.getElementById('rootLink').value.trim();
  const statusEl = document.getElementById('status');
  
  if (!rootLink) {
    statusEl.textContent = 'Please enter a valid link.';
    return;
  }
  
  statusEl.textContent = 'Searching...';
  
  try {
    const tabs = await chrome.tabs.query({});
    foundLinks = tabs
      .map(tab => tab.url)
      .filter(url => url && url.includes(rootLink));
      
    if (foundLinks.length > 0) {
      document.getElementById('step1').style.display = 'none';
      document.getElementById('step2').style.display = 'block';
      document.getElementById('count').textContent = foundLinks.length;
      statusEl.textContent = '';
    } else {
      statusEl.textContent = 'No links found.';
    }
  } catch (error) {
    statusEl.textContent = 'Error querying tabs: ' + error.message;
  }
}

async function copyLinks() {
  const text = foundLinks.join('\n');
  try {
    await navigator.clipboard.writeText(text);
    document.getElementById('status').textContent = 'Copied to clipboard!';
  } catch (err) {
    document.getElementById('status').textContent = 'Failed to copy.';
  }
}

function downloadLinks() {
  const text = foundLinks.join('\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  if (chrome.downloads && chrome.downloads.download) {
    chrome.downloads.download({
      url: url,
      filename: 'links.txt',
      saveAs: true
    }, () => {
      document.getElementById('status').textContent = 'Download started!';
    });
  } else {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'links.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    document.getElementById('status').textContent = 'Download started!';
  }
}

function resetView() {
  foundLinks = [];
  document.getElementById('step1').style.display = 'block';
  document.getElementById('step2').style.display = 'none';
  document.getElementById('rootLink').value = '';
  document.getElementById('status').textContent = '';
}
