import React, { CSSProperties, JSX, useLayoutEffect, useReducer, useState } from "react";
import { useEventEmitterState } from "../../hooks/useEventEmitter";
import { UPDATE_EVENT } from "../../stores/AsyncStore";
import FileEditorStore from "../../stores/FileEditorStore";
import { PdfEditor } from "@element-hq/web-shared-components";
import ResizeNotifier from "../../utils/ResizeNotifier";

interface Props {
    resizeNotifier: ResizeNotifier;
}

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

export function FileEditorContainer({ resizeNotifier }: Props): JSX.Element | null {
    const [_, cacheBuster] = useReducer((x) => x + 1, 0);
    useEventEmitterState(FileEditorStore.instance, UPDATE_EVENT, cacheBuster); // that's fine, i dont need anything from it, i just need to rerender on update

    const elem = useEventEmitterState(
        FileEditorStore.instance,
        UPDATE_EVENT,
        () => FileEditorStore.instance.boundingElem,
    );
    const isResizing = useEventEmitterState(resizeNotifier, "isResizing", () => resizeNotifier.isResizing);

    const rect = useSlotRect(elem);

    if (FileEditorStore.instance.isEmpty) return null;

    const containerStyle: CSSProperties =
        rect === null
            ? { display: "none" }
            : {
                  position: "fixed",
                  top: rect.top,
                  left: rect.left + 10,
                  // leave a gap for the resize handle to show
                  width: `${rect.width - 20}px`,
                  height: `${rect.height}px`,
                  display: "block",
                  // when resizing, move the editor behind the drag handle to
                  // - allow mouse event to be captured by the drag handle
                  // - allow drag handle to be above the editor split visually
                  zIndex: isResizing ? -100 : 0,
              };

    const instance = FileEditorStore.instance;
    return (
        <div style={containerStyle}>
            {Array.from({ length: instance.tabCount }).map((_, i) => {
                const tab = instance.tabAt(i);
                switch (tab?.fileUrl.status) {
                    case "failed":
                        return "failed";
                    case "loading":
                        return "loading";
                    case "loaded":
                        const style: CSSProperties = {
                            display: i === instance.tabFocused ? "block" : "none",
                            width: "100%",
                            height: "100%",
                        };
                        return (
                            <div style={style}>
                                <PdfEditor src={tab.fileUrl.url} />
                            </div>
                        );
                }
            })}
        </div>
    );
}
