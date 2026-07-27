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

interface FileUrlLoading {
    status: "loading";
}

interface FileUrlLoaded {
    status: "loaded";
    url: string;
}

interface FileUrlFailed {
    status: "failed";
    reason: string;
}

type FileUrl = FileUrlFailed | FileUrlLoaded | FileUrlLoading;

type FileEditorTab = PdfEditorTab & {
    event: MatrixEvent;
    fileUrl: FileUrl;
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

        let editorType: FileEditorTab["type"];
        switch (content.info?.mimetype) {
            case "application/pdf":
                editorType = "pdf";
                break;
            default:
                throw new Error(`editor does not support mimetype ${content.info?.mimetype}`);
        }

        const newTab: FileEditorTab = {
            type: editorType,
            event,
            fileUrl: { status: "loading" },
        };
        this.tabs.push(newTab);
        this.focusedTab = this.tabs.length - 1;
        this.emit(UPDATE_EVENT);

        mediaFromContent(content)
            .downloadSource()
            .then((res) => res.blob())
            .then((blob) => {
                const fileUrl = URL.createObjectURL(blob);
                switch (content.info?.mimetype) {
                    case "application/pdf":
                        newTab.fileUrl = { status: "loaded", url: fileUrl };
                        break;
                }
                this.emit(UPDATE_EVENT);
            })
            .catch((e) => {
                newTab.fileUrl = { status: "failed", reason: `${e}` };
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

    public setFocus(index: number): void {
        // TODO range check
        if (this.focusedTab === index) return;
        this.focusedTab = index;

        this.emit(UPDATE_EVENT);
    }

    public closeTab(index: number): void {
        // TODO range check
        this.tabs.splice(index, 1);
        if (this.focusedTab >= this.tabCount) {
            this.focusedTab--;
        }

        this.emit(UPDATE_EVENT);
    }
}
