/*
 * Copyright (c) 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { type JSX } from "react";

interface Props {
    /**
     * URL of the PDF to display. This must be fetchable from within the viewer
     * iframe without extra credentials — typically a same-origin `blob:` URL
     * produced by downloading authenticated media and calling
     * `URL.createObjectURL`.
     */
    src: string;
    /**
     * Base URL under which the app serves Mozilla's pdf.js viewer (the vendored
     * `@element-hq/pdfjs-viewer-assets` `web/` + `build/` trees). The iframe
     * navigates to `${viewerBasePath}/web/viewer.html`.
     *
     * @default "/pdfjs"
     */
    viewerBasePath?: string;
}

/**
 * Embeds Mozilla's self-hosted pdf.js viewer (with its annotation editor) in an
 * iframe. The viewer is served same-origin and loads its own scripts via
 * `<script src>`, so it runs under a strict CSP with no inline scripts.
 */
export function PdfEditor({ src, viewerBasePath = "/pdfjs" }: Props): JSX.Element {
    const url = `${viewerBasePath}/web/viewer.html?file=${encodeURIComponent(src)}#zoom=page-width`;
    return <iframe title="PDF" src={url} style={{ width: "100%", height: "100%", border: 0 }} />;
}
