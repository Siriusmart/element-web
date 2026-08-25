/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import { logger as rootLogger } from "matrix-js-sdk/src/logger";
import { type IPreviewUrlResponse, type MatrixClient, MatrixError } from "matrix-js-sdk/src/matrix";
import { decode } from "html-entities";

import type { UrlPreview } from "@element-hq/web-shared-components";
import { type UnstableBundledUrlPreviewSingle } from "@element-hq/element-web-module-api";
import { mediaFromMxc } from "../customisations/Media";
import { thumbHeight } from "../ImageUtils";

const logger = rootLogger.getChild("UrlPreviewFetcher");

export const PREVIEW_WIDTH_PX = 478;
export const PREVIEW_HEIGHT_PX = 200;
export const MIN_PREVIEW_PX = 96;
export const MIN_IMAGE_SIZE_BYTES = 8192;

/**
 * Options controlling how a preview is rendered.
 */
export interface UrlPreviewRenderOptions {
    /**
     * Whether to include the preview image. Pass false when media is hidden.
     */
    loadMedia: boolean;
    /**
     * Should the link have a tooltip. Should be `true` if the platform does not provide a tooltip.
     */
    showTooltips: boolean;
}

/**
 * Parse a numeric value from OpenGraph. The OpenGraph spec defines all values as strings
 * although Synapse may return these values as numbers. To be compatible, test strings
 * and numbers.
 * @param value The numeric value
 * @returns A number if the value parsed correctly, or undefined otherwise.
 */
function getNumberFromOpenGraph(value: unknown): number | undefined {
    if (typeof value === "number") {
        return value;
    } else if (typeof value === "string" && value) {
        const i = Number.parseInt(value, 10);
        if (!Number.isNaN(i)) return i;
    }
    return undefined;
}

/**
 * Calculate the best possible title, description and site name from a preview.
 * @param preview The preview.
 * @param link The link being previewed.
 * @returns The metadata values.
 */
function getBaseMetadata(
    preview: UnstableBundledUrlPreviewSingle,
    link: string,
): Pick<UrlPreview, "title" | "description" | "siteName"> {
    let title =
        typeof preview["og:title"] === "string" && preview["og:title"].trim() ? preview["og:title"].trim() : undefined;
    let description =
        typeof preview["og:description"] === "string" && preview["og:description"].trim()
            ? preview["og:description"].trim()
            : undefined;
    const siteName =
        typeof preview["og:site_name"] === "string" && preview["og:site_name"].trim()
            ? preview["og:site_name"].trim()
            : new URL(link).hostname;

    if (!title && description) {
        title = description;
        description = undefined;
    } else if (!title && siteName) {
        title = siteName;
    } else if (!title) {
        title = link;
    }

    if (description && description.toLowerCase() === siteName.toLowerCase()) {
        description = undefined;
    }

    return { title, description: description && decode(description), siteName };
}

/**
 * Calculate the best possible author from a preview.
 * @param preview The preview.
 * @returns The author value, or undefined if no valid author could be found.
 */
function getAuthor(preview: UnstableBundledUrlPreviewSingle): UrlPreview["author"] {
    let calculatedAuthor: string | undefined;
    if (preview["og:type"] === "article") {
        if (typeof preview["article:author"] === "string" && preview["article:author"]) {
            calculatedAuthor = preview["article:author"];
        }
    }
    if (typeof preview["profile:username"] === "string" && preview["profile:username"]) {
        calculatedAuthor = preview["profile:username"];
    }
    if (calculatedAuthor && URL.canParse(calculatedAuthor)) {
        return undefined;
    }
    return calculatedAuthor;
}

/**
 * Calculate whether the provided image from the preview is a full size preview or
 * a site icon.
 * @returns `true` if the image should be used as a preview, otherwise `false`
 */
function isImagePreview(width?: number, height?: number, bytes?: number): boolean {
    if (width && width < MIN_PREVIEW_PX) return false;
    if (height && height < MIN_PREVIEW_PX) return false;
    if (bytes && bytes < MIN_IMAGE_SIZE_BYTES) return false;
    return true;
}

/**
 * Determine whether a preview carries an image large enough to be rendered as a thumbnail,
 * rather than as a site icon.
 * @param preview The preview.
 * @returns `true` if the preview would render a thumbnail, otherwise `false`.
 */
export function hasPreviewImage(preview: UnstableBundledUrlPreviewSingle): boolean {
    if (typeof preview["og:image"] !== "string") return false;
    return isImagePreview(
        getNumberFromOpenGraph(preview["og:image:width"]),
        getNumberFromOpenGraph(preview["og:image:height"]),
        getNumberFromOpenGraph(preview["matrix:image:size"]),
    );
}

/**
 * Convert a preview in the MSC4095 bundled format into the shape rendered by the views.
 * @param preview The preview, either bundled with the event or fetched from the homeserver.
 * @param client The client used to resolve media.
 * @param options How the preview should be rendered.
 */
export function urlPreviewFromBundle(
    preview: UnstableBundledUrlPreviewSingle,
    client: MatrixClient,
    { loadMedia, showTooltips }: UrlPreviewRenderOptions,
): UrlPreview {
    const link = preview.matched_url;
    const { title, description, siteName } = getBaseMetadata(preview, link);
    const author = getAuthor(preview);

    let image: UrlPreview["image"];
    let siteIcon: string | undefined;

    if (typeof preview["og:image"] === "string" && loadMedia) {
        const mxcImageFull = preview["og:image"];
        const media = mediaFromMxc(mxcImageFull, client);
        const declaredHeight = getNumberFromOpenGraph(preview["og:image:height"]);
        const declaredWidth = getNumberFromOpenGraph(preview["og:image:width"]);
        const imageSize = getNumberFromOpenGraph(preview["matrix:image:size"]);
        const alt = typeof preview["og:image:alt"] === "string" ? preview["og:image:alt"] : undefined;
        const imageType = typeof preview["og:image:type"] === "string" ? preview["og:image:type"] : undefined;

        if (isImagePreview(declaredWidth, declaredHeight, imageSize)) {
            const width = Math.min(declaredWidth ?? PREVIEW_WIDTH_PX, PREVIEW_WIDTH_PX);
            const height = thumbHeight(width, declaredHeight, PREVIEW_WIDTH_PX, PREVIEW_WIDTH_PX) ?? PREVIEW_WIDTH_PX;
            const thumb = media.getThumbnailOfSourceHttp(PREVIEW_WIDTH_PX, PREVIEW_HEIGHT_PX, "scale");
            const playable = !!preview["og:video"] || !!preview["og:video:type"] || !!preview["og:audio"];
            // A bundled preview is sender-controlled, so the mxc:// URI may not resolve at all.
            if (thumb) {
                image = {
                    imageThumb: thumb,
                    imageFull: media.srcHttp ?? thumb,
                    mxcImageFull,
                    imageType,
                    width,
                    height,
                    fileSize: imageSize,
                    alt,
                    playable,
                };
            }
        } else if (media.srcHttp) {
            siteIcon = media.srcHttp;
        }
    }

    return {
        link,
        title,
        author,
        description,
        siteName,
        siteIcon,
        ogUrl: preview["og:url"],
        showTooltipOnLink: !!(link !== title && showTooltips),
        image,
    } satisfies UrlPreview;
}

/**
 * Handles fetching URL previews from the homeserver.
 * Previews are returned in the MSC4095 bundled format, so that previews fetched here and
 * previews bundled with an event can be rendered through {@link urlPreviewFromBundle} alike.
 * Maintains a cache of previously fetched previews.
 */
export class UrlPreviewFetcher {
    private readonly cache = new Map<string, UnstableBundledUrlPreviewSingle>();

    public constructor(
        private readonly client: MatrixClient,
        private readonly previewRequestTs: number,
    ) {}

    public clearCache(): void {
        this.cache.clear();
    }

    /**
     * Fetch a preview for a single URL, returning a cached result if available.
     * @param link The URL to preview.
     * @returns The preview in the MSC4095 bundled format, or null if there is nothing to render.
     */
    public async fetchPreviewBundle(link: string): Promise<UnstableBundledUrlPreviewSingle | null> {
        const cached = this.cache.get(link);
        if (cached) return cached;

        let response: IPreviewUrlResponse;
        try {
            response = await this.client.getUrlPreview(link, this.previewRequestTs);
        } catch (error) {
            if (error instanceof MatrixError && error.httpStatus === 404) {
                logger.debug("Failed to get URL preview: ", error);
            } else {
                logger.error("Failed to get URL preview: ", error);
            }
            return null;
        }

        const preview: UnstableBundledUrlPreviewSingle = { ...response, matched_url: link };

        // Nothing worth rendering: no title beyond the link itself, and no image.
        if (getBaseMetadata(preview, link).title === link && typeof response["og:image"] !== "string") {
            return null;
        }

        this.cache.set(link, preview);
        return preview;
    }

    /**
     * Fetch a preview for a single URL and convert it into the shape rendered by the views.
     * @param link The URL to preview.
     * @param options How the preview should be rendered.
     */
    public async fetchPreview(link: string, options: UrlPreviewRenderOptions): Promise<UrlPreview | null> {
        const preview = await this.fetchPreviewBundle(link);
        if (!preview) return null;
        return urlPreviewFromBundle(preview, this.client, options);
    }
}
