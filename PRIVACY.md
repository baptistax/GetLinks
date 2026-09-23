# GetLinks Privacy Policy

Last updated: September 23, 2026 — version 1.1.0

GetLinks finds matching open-tab links for a site the user chooses, lets the user review/copy/download unique URLs, and manages the corresponding matching tabs.

## Information handled

When the popup opens, GetLinks reads its saved preferences and queries only the active tab in the current window to suggest an HTTP/HTTPS hostname. The suggestion is not a search and is not stored. It queries all open tabs only after the user starts Search.

Search and matching-tab operations process URLs (including pending navigation URLs), tab titles, Chrome-provided favicon information, tab/window identifiers and order, active and pinned state, audible/muted state, discarded/sleeping state, native group identifiers, and the Incognito flag needed to avoid incompatible moves. URLs and titles can contain personal or sensitive information. Window numbers and link/tab counts are derived locally.

GetLinks does not read page contents, cookies, form data, passwords, or browsing history. It does not inject scripts into websites. It uses Chrome's extension-local favicon endpoint and a packaged fallback rather than fetching arbitrary website favicon URLs.

## How information is used

Information is used only to match the user-selected hostname, group identical canonical URLs, display/filter/select results, and perform requested native actions on the corresponding tabs: mute/unmute, reload, discard, pin/unpin, group/ungroup, move, and close. Targets are rechecked before operations; surviving current-search tabs are refreshed afterward.

All matching, filtering and duplicate planning happen locally. GetLinks has no server, analytics, telemetry, account, remote synchronization, remote executable code, content script, or background/service worker.

## Storage, retention and sharing

Only three preferences persist in `chrome.storage.local`: `displayMode` (Compact/Detailed), `linkFilterEnabled`, and `confirmCloseTabs`. They are not synced by GetLinks. Defaults are Compact, filter disabled, and close confirmation enabled.

GetLinks does **not persist** searched hostnames, search input, matching URLs, tab titles, scan results, selections or filter text. Session data exists only in the popup's temporary memory and is discarded when the popup closes. A new search replaces the previous scan. Chrome itself maintains browser tabs and its favicon cache independently of GetLinks.

GetLinks does not transmit, sell or share browsing data. At the user's request, Copy writes selected visible URLs to the operating system clipboard and Download saves them to a local `.txt` file. Those user-created outputs remain outside GetLinks' temporary memory. Reload and other browser actions may cause Chrome to load the corresponding websites as normal browser behavior.

## Permissions

- `tabs`: read the active-tab suggestion and open-tab URLs/titles for matching and display; operate on corresponding tabs through Chrome's native APIs.
- `clipboardWrite`: copy selected visible matching URLs at the user's request.
- `storage`: persist only the three preferences described above.
- `favicon`: display Chrome-provided favicons in Detailed Links and Tabs, locally within the extension.

No host permissions are requested. No `scripting`, `downloads`, `activeTab`, `tabGroups` or `webRequest` permissions are requested.

## Limited Use

GetLinks' use of information received from Chrome APIs adheres to the Chrome Web Store User Data Policy, including Limited Use requirements. Data is used only for the disclosed user-facing purpose.

## Changes and contact

Material changes to this policy or GetLinks' data handling will be disclosed before the changed behavior is used. For privacy questions, contact the developer through the support address published on the GetLinks Chrome Web Store listing.
