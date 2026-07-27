import React, { JSX } from "react";
import { Tabs } from "radix-ui";
import styles from "./FileEditorTabBar.module.css"
import classNames from "classnames";

export interface FileEditorTabEntry {
    display: string,
}

export interface Props {
    entries: FileEditorTabEntry[],
    selectedIndex: number,
    onClose: (tabIndex: number) => void,
    onFocus: (tabIndex: number) => void
}

export function FileEditorTabBar({ entries, onClose, onFocus, selectedIndex }: Props): JSX.Element {
    return <Tabs.Root onValueChange={(index) => onFocus(parseInt(index))} value={selectedIndex.toString()} className={styles.tabRoot}>
        <Tabs.List className={styles.tabList}>
            {
                entries.map((tab, index) => {
                    return <div className={classNames(styles.tabDiv, index === selectedIndex ? styles.tabSelected : undefined)}>
                        <Tabs.Trigger value={index.toString()} className={styles.tabName}>{tab.display}</Tabs.Trigger>
                        <button onClick={() => onClose(index)} className={styles.tabClose}>X</button>
                    </div>
                })
            }
        </Tabs.List>
    </Tabs.Root>
}
