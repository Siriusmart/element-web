/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { type JSX, useState } from "react";
import { fn } from "storybook/test";

import { type Meta, type StoryObj } from "@storybook/react-vite";

import { FileEditorTabBar } from "./FileEditorTabBar";

const meta = {
    title: "Room/FileEditor/FileEditorTabBar",
    component: FileEditorTabBar,
    tags: ["autodocs"],
    args: {
        entries: [{ display: "README.md" }, { display: "index.ts" }, { display: "styles.css" }],
        selectedIndex: 0,
        onClose: fn(),
        onFocus: fn(),
    },
} satisfies Meta<typeof FileEditorTabBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SingleTab: Story = {
    args: {
        entries: [{ display: "README.md" }],
    },
};

/**
 * `selectedIndex` is controlled by the parent, so this story wires up local state to
 * make clicking and keyboard navigation between tabs actually switch the selection.
 */
export const Interactive: Story = {
    render: function Interactive(args): JSX.Element {
        const [selectedIndex, setSelectedIndex] = useState(args.selectedIndex);
        return (
            <FileEditorTabBar
                {...args}
                selectedIndex={selectedIndex}
                onFocus={(index) => {
                    setSelectedIndex(index);
                    args.onFocus(index);
                }}
            />
        );
    },
};
