/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import type { CustomPreviewTilePatch, MediaHandle } from "@element-hq/element-web-module-api";

import { ModuleApi } from "./Api.ts";

/**
 * Puts the extension of the file's name in the subtext of its preview tile, e.g. "pdf".
 *
 * Only applies to media uploaded to Matrix: a remote handle describes a link rather than a named
 * file. Names with no extension are left alone, as are dotfiles such as ".bashrc", whose leading dot
 * does not introduce one.
 */
export function fileExtensionPatcher(media: MediaHandle): CustomPreviewTilePatch | null {
    if (media.type !== "uploaded") return null;

    const dot = media.name.lastIndexOf(".");
    if (dot <= 0 || dot === media.name.length - 1) return null;

    return { subtext: media.name.slice(dot + 1) };
}

export function registerFileExtensionPreviewTilePatcher(): void {
    ModuleApi.instance.customPreviewTile.registerCustomPreviewTilePatcher(fileExtensionPatcher, {
        id: "io.element.preview-tile.file-extension",
    });
}
