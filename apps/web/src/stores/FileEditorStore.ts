/*
Copyright 2018-2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { EventEmitter } from "events";
import { MatrixEvent } from "matrix-js-sdk/src/matrix";
import { MediaEventContent } from "matrix-js-sdk/src/types";
import { EventType, MsgType } from "matrix-js-sdk/src/matrix";
import { UPDATE_EVENT } from "./AsyncStore";
import { mediaFromContent } from "../customisations/Media";

interface PdfEditorTab {
    type: "pdf";
}

type FileEditorTab = PdfEditorTab & {
    event: MatrixEvent;
    /*
     * null means loading
     */
    fileUrl: string | null;
};

export default class FileEditorStore extends EventEmitter {
    private static internalInstance: FileEditorStore;
    private tabs: FileEditorTab[] = [];
    private focusedTab: number = -1;
    private htmlBounding: HTMLElement | null = null;

    public static get instance(): FileEditorStore {
        if (!FileEditorStore.internalInstance) {
            FileEditorStore.internalInstance = new FileEditorStore();
        }

        return this.internalInstance;
    }

    public static canOpen(event: MatrixEvent): boolean {
        if (event.isRedacted()) return false;
        if (event.getType() !== EventType.RoomMessage) return false;
        const content = event.getContent<MediaEventContent>();
        if (content.msgtype !== MsgType.File) return false;
        return content.info?.mimetype === "application/pdf";
    }

    public get isEmpty(): boolean {
        return this.tabs.length === 0;
    }

    public open(event: MatrixEvent): void {
        const existingTabIndex = this.tabs.findIndex((tab) => tab.event.getId() === event.getId());

        if (existingTabIndex !== -1) {
            this.focusedTab = existingTabIndex;
            this.emit(UPDATE_EVENT);
            return;
        }

        // TODO: encrypted pdf files not supported
        const content = event.getContent<MediaEventContent>();
        mediaFromContent(content)
            .downloadSource()
            .then((res) => res.blob())
            .then((blob) => {
                const fileUrl = URL.createObjectURL(blob);
                switch (content.info?.mimetype) {
                    case "application/pdf":
                        this.tabs.push({
                            type: "pdf",
                            event,
                            fileUrl,
                        });
                        break;
                    default:
                        throw new Error("unsupported mimetype");
                }

                this.focusedTab = this.tabs.length - 1;
                this.emit(UPDATE_EVENT);
            });
    }

    public get tabCount(): number {
        return this.tabs.length;
    }

    public get tabFocused(): number | undefined {
        return this.focusedTab === -1 ? undefined : this.focusedTab;
    }

    public tabAt(index: number): FileEditorTab | undefined {
        return this.tabs[index];
    }

    public setBounding(elem: HTMLElement | null): void {
        this.htmlBounding = elem;
        this.emit(UPDATE_EVENT);
    }

    public get boundingElem(): HTMLElement | null {
        return this.htmlBounding;
    }
}
