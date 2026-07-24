# @element-hq/pdfjs-viewer-assets

> [!TLDR]
>
> This is just the extracted release zip file from mozilla/pdf.js, becuase of CSP we need to copy its content to webapp/ on build.

Vendored copy of **Mozilla's prebuilt pdf.js viewer** (the full viewer app,
including its annotation-editor toolbar), served same-origin by Element Web so it
runs under Element's strict Content-Security-Policy.

## What this package is for

Element Web ships a deliberately strict CSP (`script-src 'self' 'wasm-unsafe-eval'
…`, no `'unsafe-inline'`, no `'unsafe-eval'`). We want to embed the full pdf.js
viewer — with its annotation/free-text/ink editor UI — inside the app.

The catch is where that viewer comes from:

- The **`pdfjs-dist` npm package** ships only the core library and the viewer
  _components_ (`pdf.mjs`, `pdf.worker.mjs`, `pdf_viewer.mjs`). It does **not**
  contain the assembled generic viewer app (`web/viewer.html` + the toolbar/editor
  `web/viewer.mjs`).
- The assembled viewer app is published **only** as a GitHub release zip
  (`pdfjs-<version>-dist.zip`). There is no clean npm package for it.

So we vendor that zip's `web/` and `build/` trees here. Because pdf.js v6 loads its
code via external `<script src>` tags (no inline scripts) and renders via
WebAssembly (no `eval`), serving these files same-origin satisfies the CSP with no
policy changes.

The React side of this — a `<PdfEditor>` iframe wrapper that points at
`/pdfjs/web/viewer.html` — lives in `@element-hq/web-shared-components`
(`src/room/FileEditor`). This package is **only the static viewer assets**; a JS
component library can't serve HTML to the browser, so the two concerns are split.

## Package contents

```
web/     viewer.html, viewer.mjs, viewer.css, cmaps/, standard_fonts/,
         images/, locale/, wasm/, iccs/   — the viewer app + its resources
build/   pdf.mjs, pdf.worker.mjs, pdf.sandbox.mjs — pdf.js core + worker
```

The package `version` field tracks the vendored pdf.js version (e.g. `6.1.200`).

## How this was produced from the release zip

`scripts/fetch-pdfjs.mjs` automates the whole thing, but conceptually it is:

1. Download `pdfjs-<VERSION>-dist.zip` from
   `https://github.com/mozilla/pdf.js/releases/download/v<VERSION>/`.
2. Extract just the `web/` and `build/` directories.
3. Copy them into this package, replacing the previous contents.
4. Strip files that aren't needed to _serve_ the viewer, to keep the repo lean:
   - all `*.map` source maps,
   - `web/compressed.tracemonkey-pldi-09.pdf` (the sample PDF),
   - `web/debugger.mjs`, `web/debugger.css`.

Nothing in `web/` or `build/` is hand-edited — it is Mozilla's output verbatim, so
updating is a clean re-extract rather than a merge.

## How to update to a new pdf.js version

1. Bump `VERSION` in `scripts/fetch-pdfjs.mjs`.
2. Bump `version` in `package.json` to match.
3. Run the fetch script (requires `unzip` on `PATH`):

   ```sh
   pnpm --filter @element-hq/pdfjs-viewer-assets fetch
   ```

4. Commit the refreshed `web/` + `build/` trees along with the version bumps.

When bumping across a major pdf.js version, re-check the CSP assumptions above
(that the worker still avoids `eval` and `viewer.html` still has no inline
scripts) before trusting it under Element's CSP.

## How it gets into the web app (and desktop)

This package is **not imported as a module**. It is copied as static files into the
web build output:

- `apps/web` declares it as a workspace dependency
  (`@element-hq/pdfjs-viewer-assets: workspace:*`).
- `apps/web/webpack.config.ts` has a `CopyWebpackPlugin` pattern that copies
  `{web,build}/**` from this package into `webapp/pdfjs/`. The viewer is therefore
  served same-origin at **`/pdfjs/web/viewer.html`** and `/pdfjs/build/…`.
- **Desktop** gets it for free: `apps/desktop` packages the entire `webapp/` tree
  into `webapp.asar` and serves it through its custom protocol handler, so
  `/pdfjs/…` resolves identically in Electron with no desktop-specific wiring.
