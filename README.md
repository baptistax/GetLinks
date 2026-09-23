# GetLinks 1.1

Find matching open-tab links for a site, review unique URLs, and manage the corresponding tabs. GetLinks runs directly from this source folder: Manifest V3, vanilla JavaScript, no build step, framework, server, analytics, remote code, content scripts, or background/service worker.

## Review links

Open the popup to see the active HTTP/HTTPS tab's hostname as a **placeholder**, with an empty input. Type normally to enter another site, or press Search/Enter without typing to use the suggestion. Chrome internal pages keep the generic placeholder. Opening the popup reads preferences and queries only the active tab in the current window; a full scan happens only on Search.

The summary distinguishes matching tabs from unique links. **Links** contains each canonical URL once and selects all results after each search. Choose **Compact** (URL rows, the default) or **Detailed** (title, Chrome favicon, URL, open-tab count) in the gear's Settings screen. Select individual links, use **Select all / Clear**, or enable **Only duplicates** to show and select URLs represented by multiple matching tabs, once per URL.

Enable the optional link filter in Settings to search locally by URL, title or hostname, ignoring case. Filtering never changes the scan. Counts, Select all, Clear, Copy and Download apply to the **visible selection**. Hidden selections are remembered until the search is replaced or the popup closes; they are excluded from actions while hidden. Turning on Only duplicates selects the visible duplicate links; turning it off restores the wider view.

**Copy** copies selected visible URLs, one per line. **More → Download selected .txt** exports the same selection, without titles or extra formatting.

## Matching rules

- Accepts a domain or full HTTP/HTTPS URL. A path in the input does not restrict matching.
- `example.com` matches itself and real subdomains such as `files.example.com`, never `notexample.com` or a URL merely mentioning the domain.
- Searching a subdomain stays within that subdomain; `www.example.com` does not broaden to `example.com`.
- An explicit non-default port restricts matching to that port; otherwise ports are unrestricted, preserving version 1.0 behavior.
- Only HTTP/HTTPS tabs match. Pending navigation URLs take precedence while loading.
- Identical canonical URLs (the browser URL parser's `href`) are grouped. Host case and default ports normalize; distinct protocols, paths, queries, query order and fragments remain separate. No tracking parameters are removed.

## Manage matching tabs

**Tabs** shows actual tab instances from the current search, including duplicates. It starts with **nothing selected**, independently of Links. Window numbers are session labels for matching windows, assigned by ascending Chrome window ID. Filter with **Window: All** or one window. Selection and actions respect the visible window filter.

Select tabs for **Mute / Unmute**, **Reload**, and **More**: Sleep, Pin / Unpin, Group, Ungroup, Move to new window, Close duplicates in this view, and Close selected. Each row also has a menu for individual actions and Close tab. Disabled entries indicate unavailable actions.

- **Sleep** uses Chrome discard. Active and already sleeping tabs are skipped; other eligible tabs are processed and the feedback reports skips/failures. Chrome reloads a sleeping tab when activated.
- **Group** creates a separate native group per window. Pinned tabs are skipped; unpin them first. Ungroup skips tabs outside groups. No group name/color configuration or `tabGroups` permission is needed.
- **Move to new window** creates an unfocused destination, submits all selected IDs in one native move call (pinned first), then removes its temporary blank tab and focuses the destination. The move is dispatched before focus can destroy the popup. If Chrome destroys the popup when its source window loses its last tab, movement still runs in Chrome; a temporary blank destination tab may remain. Regular and Incognito tabs cannot be moved together.
- **Close duplicates in this view** considers all matching tabs in the current window filter, regardless of checkbox selection. One keeper per canonical URL is chosen by: **pinned first, then active, then lower window ID, lower tab-strip index, lower tab ID**. Pinned duplicates beyond the preferred keeper can be closed. It does not merge similar URLs.
- **Confirm close tabs** is on by default and applies to individual, selected and duplicate closing. The extension dialog starts with Cancel focused, supports Escape, and contains keyboard focus. Turning confirmation off saves that preference.

Actions recheck target IDs and URLs and skip tabs that closed or navigated since the scan. Duplicate closing also rechecks keepers after confirmation and never adds an unconfirmed closing candidate. Browser changes cannot be made atomic with these API calls. After an action, surviving members of the current scan are refreshed; Search discovers newly opened tabs. Moving/closing the active tab may close the popup as part of Chrome's normal lifecycle.

## Preferences and privacy

Only `displayMode`, `linkFilterEnabled` and `confirmCloseTabs` persist in `chrome.storage.local`. Search input, results, URLs, titles, filters and selections remain in popup memory and disappear when it closes. Favicons use Chrome's extension-local `/_favicon/` endpoint with a packaged fallback, not arbitrary remote favicon URLs. See [PRIVACY.md](PRIVACY.md).

| Permission | Purpose |
|---|---|
| `tabs` | Active-tab hostname suggestion, matching URLs/titles and native operations on corresponding tabs. |
| `clipboardWrite` | Copy the user's selected visible URLs. |
| `storage` | Save only the three preferences locally. |
| `favicon` | Display Chrome-provided favicons in Detailed Links and Tabs. |

No host, `scripting`, `downloads`, `activeTab`, `tabGroups` or `webRequest` permissions. Text export uses a user-initiated Blob download. The implementation follows Chrome's [Tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs), [Windows API](https://developer.chrome.com/docs/extensions/reference/api/windows) and [MV3 favicon guide](https://developer.chrome.com/docs/extensions/how-to/ui/favicons).

## Source layout

- `popup.js`: initialization, session state, events and orchestration.
- `link-utils.js`: pure parsing, matching, grouping, filtering and duplicate/window planning; retains the 1.0 compatibility helper.
- `settings.js`: preference defaults, validation, local storage.
- `tab-actions.js`: native API operations and target revalidation.
- `popup-view.js`: safe DOM rows, selection updates, settings, popup-level menus and dialog.
- `popup.html` / `popup.css`: packaged UI, 408 × 580 px, one results scroll area and a fixed footer.
- `tests/link-utils.test.js`: the single automated test file, using Node's built-in test runner.

## Install and automated checks

Open `chrome://extensions` → **Developer mode** → **Load unpacked**, then select this folder. For an already loaded copy, click **Reload** after edits. No generated files or dependency installation are required.

```text
node --test tests/link-utils.test.js
node --check popup.js
node --check link-utils.js
node --check settings.js
node --check tab-actions.js
node --check popup-view.js
```

## Manual release checklist

Use disposable HTTP/HTTPS tabs across two normal windows: several URLs on one site, an actual subdomain, three identical URLs, a query/fragment variant, and an unrelated site. Include pinned, active, audible and sleeping tabs. Perform close/move checks on these test tabs. Reload the unpacked extension and inspect its popup console.

- [ ] Popup opens at 408 × 580; active-site hostname is a placeholder with empty input. First typed character stands alone; Search with untouched suggestion works. Internal pages use the generic placeholder.
- [ ] Hostname/subdomain and explicit-port matching work; unrelated tabs are excluded. Summary tab and unique-link counts differ correctly.
- [ ] Compact shows each URL once. Detailed shows titles, Chrome favicons/fallbacks and open-tab counts; long values ellipsize.
- [ ] Links start all selected. Individual selection, Select all and Clear work. Only duplicates shows/selects repeated URLs once each, with correct copy/export scope.
- [ ] Optional filter responds immediately to title, URL and hostname; no regex; clearing/restoring filters preserves underlying results.
- [ ] Copy and .txt contain only selected visible URLs, one per line. Zero-selection actions are disabled.
- [ ] Tabs contains only current-search instances, starts unselected, and stays independent from Links. Window filter and visible selection work.
- [ ] Mute/Unmute and Reload work through the footer and row menu; labels update appropriately.
- [ ] Sleep processes inactive tabs, skips active/already sleeping tabs, and reports skips without failing the whole batch.
- [ ] Pin/Unpin, Group/Ungroup work. Multi-window Group creates separate groups; pinned tabs are skipped.
- [ ] Move to new window completes, including multiple source windows and moving the source window's last tab. Verify all selected IDs arrive if the popup closes.
- [ ] Close individual and Close selected affect the requested tabs only. Close duplicates preserves the documented keeper per canonical URL and respects the window filter.
- [ ] Close confirmation appears for all three closing paths when enabled; Cancel/Escape keep tabs open, keyboard focus stays in the dialog and returns afterward. Disabling the setting skips confirmation.
- [ ] Settings persist after reopening. Search/results, filter text and both selections do not persist.
- [ ] Menus open outside the scroll container, stay within the popup, support arrows/Escape and return focus. Footer stays fixed, only results scroll, no horizontal overflow or double scrollbar.
- [ ] Keyboard focus is visible; result labels identify items; status feedback is announced. Reduced-motion preference is respected.
- [ ] Empty results and invalid input have useful feedback. No console errors during normal operation. Review manifest, diff, permissions and privacy/Store copy before packaging.
