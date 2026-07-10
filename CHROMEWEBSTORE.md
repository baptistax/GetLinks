# Chrome Web Store Listing — GetLinks

> Last updated: 2026-07-10

## Store listing

**Extension name** [REQUIRED]

GetLinks

**Short description** [REQUIRED]

Collect, review, copy, or download unique links from open tabs for a site you choose.

**Detailed description** [REQUIRED]

GetLinks is a focused productivity tool for collecting URLs from your open Chrome tabs.

Have several tabs open for the same site and need one clean list? Enter a domain, and GetLinks finds the matching tabs, removes identical URLs, and lets you review the results before copying them or downloading a `.txt` file.

How to use it:

1. Click the GetLinks icon in the browser toolbar.
2. Enter a domain or URL, such as `https://example.com`.
3. Click **Find links**.
4. Review the unique matching URLs.
5. Copy the list to the clipboard or download it as a text file.

Matching is based on the actual site hostname. Entering `example.com` matches that domain and its subdomains, but does not match unrelated domains that merely contain the same text.

Privacy disclosure: When the user clicks **Find links**, GetLinks reads the URLs of currently open tabs only to provide the requested matching results. All processing happens locally. URLs and search input are not transmitted, stored, sold, or shared.

**Category** [REQUIRED]

Productivity

**Single purpose** [REQUIRED]

Finds and deduplicates URLs from currently open tabs whose hostname matches a site chosen by the user, then lets the user review, copy, or download the results.

**Primary language** [REQUIRED]

English

## Graphics and assets

| Asset | Dimensions | Status | Filename |
|---|---:|---|---|
| Store icon [REQUIRED] | 128 x 128 PNG | Ready | `icons/icon128.png` |
| Screenshot 1 [REQUIRED] | 1280 x 800 or 640 x 400 | Not created | |
| Screenshot 2 [RECOMMENDED] | 1280 x 800 or 640 x 400 | Not created | |
| Small promo tile [RECOMMENDED] | 440 x 280 | Not created | |
| Marquee promo tile | 1400 x 560 | Not created | |

Suggested screenshots:

- Popup with the site input, example placeholder, and privacy disclosure visible.
- Results view showing deduplicated links and the copy/download actions.

## Permission justifications

| Permission | Justification |
|---|---|
| `tabs` | Reads the URLs of currently open tabs only after the user clicks **Find links**, so the extension can find URLs for the chosen site. |
| `clipboardWrite` | Writes the displayed matching URLs to the clipboard only after the user clicks **Copy links**. |

No host permissions are requested. The extension does not inject scripts into websites. The `.txt` file uses a user-initiated browser download, so the `downloads` permission is not requested.

## Privacy practices

GetLinks handles **web browsing activity** (the URLs of open tabs) locally for its single user-facing purpose.

- Data use: app functionality only.
- Data transmission: none.
- Persistent storage: none.
- Selling or sharing: none.
- Advertising, analytics, or creditworthiness use: none.
- Human access to user data: none.

Do not state that the extension handles no user data: the Chrome Web Store classifies domains and URLs as web browsing activity even when they are processed locally. Keep the dashboard disclosure, this listing, the popup disclosure, and `PRIVACY.md` consistent.

**Privacy policy URL** [REQUIRED]

[Publish `PRIVACY.md` at a public URL and add it here]

## Distribution

**Visibility:** Public

**Regions:** All regions

**Pricing:** Free

## Developer information

**Publisher name** [REQUIRED]

[Your name]

**Contact email** [REQUIRED]

[Your email]

**Support URL or email** [RECOMMENDED]

[Your GitHub repository or support email]

**Homepage URL** [RECOMMENDED]

[Your website or public repository]

## Version history

| Version | Date | Changes | Status |
|---|---|---|---|
| 1.0.0 | 2026-07-10 | Initial reviewed release | Draft |

## Known limitations

- Only currently open HTTP and HTTPS tabs are scanned.
- Identical canonical URLs are deduplicated. URLs with different paths, queries, or fragments remain separate.
- Incognito tabs are included only if the user separately allows the extension in Incognito mode.
