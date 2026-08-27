/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import type { CustomPreviewTilePatch, MediaHandle } from "@element-hq/element-web-module-api";

import { ModuleApi } from "./Api.ts";

/**
 * Puts the file's mimetype in the subtext of its preview tile, e.g. "application/pdf".
 *
 * Only applies to media uploaded to Matrix: a remote handle describes a link, whose content type we
 * would have to fetch to know.
 */
export function mimetypePatcher(media: MediaHandle): CustomPreviewTilePatch | null {
    if (media.type !== "uploaded" || media.mimetype === undefined) return null;

    return { subtext: media.mimetype };
}

export function registerMimetypePreviewTilePatcher(): void {
    ModuleApi.instance.customPreviewTile.registerCustomPreviewTilePatcher(mimetypePatcher, {
        id: "io.element.preview-tile.mimetype",
    });
}
