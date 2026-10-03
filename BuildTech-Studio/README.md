# BuildTech Studio — Windows desktop connection preview

## Status

This is an actual Windows x64 portable desktop executable, **not a completed client delivery**. It opens a dedicated BuildTech window with its own icon and no browser address bar. It does not contain business records or an embedded owner login.

The first screen deliberately says **Private workspace connection pending**. Do not send this preview to the client as a finished management app. Do not enter the existing personal Site URL: this build will reject it. The original website and its current access have not been changed.

## Try this preview

On a Windows 10/11 x64 computer, open `BuildTech-Studio-Desktop-Preview-0.1.0.exe`. No installation is required. It opens the connection screen. Do not expect your existing records to appear: the independent workspace is not configured. This file is unsigned and has not been executed on Windows.

## What is implemented

- Portable Windows executable: double-click to open. A shortcut can be added manually.
- BuildTech icon, title, menu and English/Spanish connection instructions.
- Local connection screen and a separate sandboxed online workspace window.
- HTTPS-only workspace validation and isolated cookies for each workspace.
- No embedded credentials, owner sessions or privileged tokens.
- External redirects and popup windows outside the configured workspace are blocked.
- Permission requests are denied. Remote pages have no Node integration or preload bridge.
- Document downloads require an explicit local save location; printing uses the desktop print dialog.

## What is still needed

1. An independent hosting account for the private Studio backend. The current application uses a Cloudflare Worker, D1 database and R2 file storage, so a separate Cloudflare account is the least disruptive deployment option. A temporary provider address can be used until the custom domain is ready.
2. A BuildTech-owned client login replacing the current account-provider login. Client identity, activation and recovery must be configured before handoff. Do not embed an owner token or a shared administrator password in the executable.
3. Move the current server application and preserve its business records and uploaded files; test access controls, saves, file upload/download, website publication and recovery on the independent server.
4. Activate the desktop handshake below only after that independent login works. Then enter the confirmed workspace address in this desktop app.
5. Test installation and end-to-end business actions on an actual Windows computer. This executable was packaged from Linux and has not been run on Windows. A production release also needs the publisher's code-signing setup and an update process. This preview is unsigned.

The main website's domain connection can wait. The missing prerequisite is a private online server and its independent login, not a different icon or another browser shortcut.

## Desktop connection contract

The independent server should return this public, non-secret JSON at `/api/studio/desktop-config` only when ready:

```json
{"product":"buildtech-studio","desktopProtocol":1,"authentication":"buildtech","startPath":"/studio","ready":true}
```

The endpoint must not redirect, must use JSON content type, and must return no more than 8 KiB. It should contain no client data, session or token. Returning this document does not itself implement authentication: every management page, business API, media operation and website save must enforce independent server-side access control. `/studio` should show the branded login when the session is absent. All normal application routes must remain on the workspace origin.

## Build from source

Install Node.js 22 or later, then:

```sh
npm ci
npm test
npm run package
```

The lockfile pins the exact downloaded dependency graph. `npm start` opens the development client. The output is in `release/`.

## Verification performed

- JavaScript syntax checks passed.
- Connection validation tests passed: HTTPS requirement, blocked credentials/ports/local addresses, forbidden old hosting address, same-origin navigation and explicit ready-state handshake.
- No live server connection or Windows installation is claimed by this package.

Prepared October 3, 2026 for the originating BuildTech project only.
