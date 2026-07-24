import React, { CSSProperties, JSX, useLayoutEffect, useState } from "react";
import { useEventEmitterState } from "../../hooks/useEventEmitter";
import { UPDATE_EVENT } from "../../stores/AsyncStore";
import FileEditorStore from "../../stores/FileEditorStore";
import { PdfEditor } from "@element-hq/web-shared-components";

function useSlotRect(slot: HTMLElement | null): DOMRect | null {
    const [rect, setRect] = useState<DOMRect | null>(null);

    useLayoutEffect(() => {
        let raf = 0;
        const tick = (prev: DOMRect | null) => {
            if (slot === null) {
                setRect(null);
                return;
            }

            const newRect = slot.getBoundingClientRect();
            if (
                prev === null ||
                newRect.x !== prev.x ||
                newRect.y !== prev.y ||
                newRect.width !== prev.width ||
                newRect.height !== prev.height
            ) {
                setRect(newRect);
            }

            raf = requestAnimationFrame(() => tick(newRect));
        };

        tick(null);
        return () => cancelAnimationFrame(raf);
    }, [slot]);

    return rect;
}

export function FileEditorContainer(): JSX.Element | null {
    const focusedTab = useEventEmitterState(FileEditorStore.instance, UPDATE_EVENT, () => {
        const instance = FileEditorStore.instance;
        if (instance.tabFocused !== undefined) {
            return instance.tabAt(instance.tabFocused);
        }
    });
    const elem = useEventEmitterState(
        FileEditorStore.instance,
        UPDATE_EVENT,
        () => FileEditorStore.instance.boundingElem,
    );

    const rect = useSlotRect(elem);

    if (focusedTab === undefined || focusedTab.fileUrl === null) return null;

    const styles: CSSProperties =
        rect === null
            ? { display: "none" }
            : {
                  position: "fixed",
                  top: rect.top,
                  left: rect.left,
                  width: `${rect.width}px`,
                  height: `${rect.height}px`,
                  display: "block",
              };

    return (
        <div id="fileeditor" style={styles}>
            <PdfEditor src={focusedTab.fileUrl} />
        </div>
    );
}
