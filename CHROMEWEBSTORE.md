# Chrome Web Store Listing — GetLinks

Last updated: 2026-09-23 — target version 1.1.0

## Store listing

**Extension name:** GetLinks

**Short description:** Find and review unique links for a site, copy selected URLs, and manage the matching open tabs. Everything stays local.

**Detailed description**

GetLinks helps you find the open links for a site you choose, review a clean list of unique URLs, and manage the tabs that produced those links.

Open GetLinks and use the active site's suggested hostname or type a domain/URL. Search matches that hostname and its subdomains. Review unique links in Compact or Detailed mode, select the ones you want, and copy them or download a text file. The summary shows both matching tab count and unique link count. Only duplicates narrows the list to URLs open in multiple tabs; the optional local filter searches titles, URLs and hostnames.

Switch to Tabs to see the actual matching tab instances. This view starts with nothing selected and can be filtered by window. Mute/unmute, reload, put inactive tabs to sleep, pin/unpin, group/ungroup, move selected tabs to a new window, or close individual/selected/duplicate tabs. Duplicate closing keeps one tab per identical canonical URL, preferring pinned, then active tabs. Confirmation before closing is enabled by default.

Settings are available from the gear: Compact/Detailed, Enable link filter, and Confirm close tabs. Only these preferences are saved locally on the device. Searches, URLs, titles, filters and selections disappear when the popup closes.

All processing stays local. No accounts, server, analytics, telemetry, remote code, content scripts or background process. Favicons come from Chrome's local extension favicon mechanism. GetLinks reads the active tab for the initial suggestion and scans open tabs only when you start Search. It does not read page contents or browsing history.

**Category:** Productivity

**Single purpose:** Finding matching open-tab links for a user-selected site and allowing the user to review, copy or download those unique links and manage the corresponding matching tabs.

The Tabs view is scoped to the current search; do not market GetLinks as a general-purpose browser-wide tab manager.

**Primary language:** English

## Graphics and assets

| Asset | Dimensions | Status / file |
|---|---:|---|
| Store icon | 128 × 128 PNG | Ready: `icons/icon128.png` |
| Screenshots | 1280 × 800 or 640 × 400 | Capture the actual 1.1 UI before submission |
| Small promo tile | 440 × 280 | Optional; not created |
| Marquee promo tile | 1400 × 560 | Optional; not created |

Screenshot guidance (use disposable example tabs without personal URLs):

1. Opening popup with the active-hostname placeholder and Search; do not imply an automatic full-tab scan.
2. Compact Links: unique selectable URLs, correct tab/unique summary, Copy and More for text download.
3. Detailed Links: titles, favicons and open-tab counts; optionally show the enabled local filter and duplicate-only view.
4. Matching Tabs: window filter, independent selection and tab menu/footer. Show a close confirmation if useful.
5. Settings: only the three implemented preferences. Do not show Share, a Links-screen display selector, or extra settings from the concept mockup.

Compose captures of the 408 × 580 popup into the required Store image dimensions without stretching. Keep tab counts and unique counts consistent. Screenshots must depict the shipping behavior.

## Permission justifications

| Permission | Justification |
|---|---|
| `tabs` | Reads the active tab's URL on popup opening for a hostname suggestion. After Search, reads open-tab URLs, pending URLs and titles to find/display the chosen site's links and corresponding tabs. Native operations and state are limited to matching search results. |
| `clipboardWrite` | Writes selected visible matching URLs to the clipboard only when the user chooses Copy. |
| `storage` | Saves only `displayMode`, `linkFilterEnabled` and `confirmCloseTabs` in `chrome.storage.local`. No browsing data or session state is persisted. |
| `favicon` | Uses Chrome's extension-local `/_favicon/` endpoint to display site icons in Detailed Links and Tabs with a packaged generic fallback. No arbitrary remote favicon fetches or host permissions. |

No host, `scripting`, `downloads`, `activeTab`, `tabGroups` or `webRequest` permissions. Basic Group/Ungroup use the Tabs API; no group naming/color features are implemented. Text export uses a user-initiated Blob download. No service worker or content scripts are declared.

API references: [Tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs), [Windows](https://developer.chrome.com/docs/extensions/reference/api/windows), [MV3 favicons](https://developer.chrome.com/docs/extensions/how-to/ui/favicons).

## Privacy practices

GetLinks processes open-tab browsing information locally for its single purpose: URLs, titles, favicon information, window/tab association and order, active/pinned/audible/muted/discarded/group state and the Incognito flag needed for safe moves.

- Data use: the disclosed app functionality only.
- Extension transmission, selling or sharing: none.
- Persistent storage: only the three local preferences.
- Search/results/URLs/titles/selections/filter text: temporary popup memory only.
- User-directed outputs: selected URLs to the clipboard or a local text file.
- Advertising, analytics and creditworthiness use: none.
- Developer access to browsing data: none.

Keep dashboard disclosures consistent with [PRIVACY.md](PRIVACY.md), the UI and this listing. Do not describe the extension as processing no browsing information or storing no preferences. Native reload/navigation behavior can cause Chrome to load websites normally.

**Privacy policy URL:** Publish the updated `PRIVACY.md` at a public URL and use that URL in the existing Store listing. Verify the existing dashboard URL before submission.

## Distribution and developer information

Retain the published extension's listing identity and publisher/contact details. Intended distribution remains public, free, and available in all regions.

Repository/homepage: [baptistax/GetLinks](https://github.com/baptistax/GetLinks).

Support: [repository issues](https://github.com/baptistax/GetLinks/issues), plus the existing Store support contact. Do not replace the publisher identity or contact email with placeholders.

## Version history

| Version | Date | Changes | Status |
|---|---|---|---|
| 1.1.0 | Release date pending | Modern popup; selectable Compact/Detailed unique links; local filters; matching Tabs operations; close confirmation; three persisted preferences; Chrome favicons | Release candidate; finish release checklist before submission |
| 1.0.0 | 2026-07-10 | Initial hostname search, deduplicated URL review, copy and text export | Published baseline |

## Release review and limitations

Run the single Node test file and syntax checks, review the diff and permission list, and complete the [manual checklist](README.md#manual-release-checklist) with the unpacked extension. No build artifacts or runtime dependencies are required.

Only currently open HTTP/HTTPS tabs are matched. Canonical URL equality retains different protocols, paths, queries and fragments. Pending navigation URLs take precedence. Operations revalidate IDs/URLs and skip stale targets; browser changes during native API calls cannot be made atomic. Search discovers newly opened tabs; actions refresh existing scan members.

Active/already discarded tabs are skipped by Sleep. Group skips pinned tabs and groups separately per window. Move submits all selected IDs to one unfocused destination before focusing it; if Chrome destroys the popup when the source window closes, a temporary blank destination tab can remain. Incognito access requires the user's separate Chrome opt-in, and regular/Incognito tabs cannot be moved together. Closing confirmation defaults to on and is user-configurable.
