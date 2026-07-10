# GetLinks

GetLinks collects unique URLs from open Chrome tabs for a site you choose. You can review the results, copy them to the clipboard, or download them as a text file.

## How matching works

- Enter a domain such as `example.com` or a full URL such as `https://example.com/folder`.
- GetLinks compares the actual hostname, so `example.com` and `files.example.com` match, while `notexample.com` does not.
- Only open HTTP and HTTPS tabs are considered.
- Identical URLs are returned once, even when the same URL is open in multiple tabs.
- Different paths, query parameters, or fragments remain separate because they may point to different content.

## Permissions

- `tabs`: reads the URLs of currently open tabs after the user clicks **Find links**. This is necessary to find matching tabs.
- `clipboardWrite`: writes the displayed results to the clipboard after the user clicks **Copy links**.

The `.txt` download uses a normal browser download initiated from the popup, so the broader `downloads` permission is not needed.

GetLinks has no server, analytics, remote code, or background process. See [PRIVACY.md](PRIVACY.md) for the full privacy disclosure.

## Install locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder.

## Test

Run the link-matching tests with Node.js:

```text
node --test tests/link-utils.test.js
```




