/*
 * Copyright 2026 New Vector Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

// Downloads Mozilla's prebuilt pdf.js viewer for the pinned VERSION and refreshes
// the vendored `web/` + `build/` trees. The prebuilt generic viewer (viewer.html
// + the toolbar/editor UI) is published ONLY in the GitHub release zip — it is not
// part of the `pdfjs-dist` npm package — so we vendor it here.
//
// To update: bump VERSION below, run `pnpm --filter @element-hq/pdfjs-viewer-assets fetch`,
// then commit the refreshed assets (and the version bump in package.json).
//
// Requires the `unzip` command on PATH.

import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const VERSION = "6.1.200";

const pkgRoot = fileURLToPath(new URL("..", import.meta.url));
const url = `https://github.com/mozilla/pdf.js/releases/download/v${VERSION}/pdfjs-${VERSION}-dist.zip`;

const tmp = mkdtempSync(path.join(tmpdir(), "pdfjs-"));
const zipPath = path.join(tmp, "dist.zip");

try {
    console.log(`Downloading ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    await writeFile(zipPath, Buffer.from(await res.arrayBuffer()));

    console.log("Extracting web/ and build/…");
    execFileSync("unzip", ["-oq", zipPath, "web/*", "build/*", "-d", tmp], { stdio: "inherit" });

    for (const dir of ["web", "build"]) {
        rmSync(path.join(pkgRoot, dir), { recursive: true, force: true });
        cpSync(path.join(tmp, dir), path.join(pkgRoot, dir), { recursive: true });
    }

    // Strip files that aren't needed to serve the viewer, to keep the repo lean:
    // all source maps plus the sample PDF and the debugger.
    const stripExact = new Set([
        "web/compressed.tracemonkey-pldi-09.pdf",
        "web/debugger.mjs",
        "web/debugger.css",
    ]);
    for (const dir of ["web", "build"]) {
        for (const entry of readdirSync(path.join(pkgRoot, dir), { recursive: true })) {
            const rel = path.join(dir, entry.toString());
            if (rel.endsWith(".map") || stripExact.has(rel.split(path.sep).join("/"))) {
                rmSync(path.join(pkgRoot, rel), { force: true });
            }
        }
    }

    console.log(`Done. Vendored pdf.js viewer ${VERSION}. Remember to bump "version" in package.json and commit.`);
} finally {
    rmSync(tmp, { recursive: true, force: true });
}
