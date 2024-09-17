import { createContext } from "react";
import { App, ItemView, WorkspaceLeaf } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import * as React from "react";
import { Hierarchy } from "./hierarchy";

export const VIEW_TYPE_HIERARCHY = "example-view";

export class HierarchyView extends ItemView {
	root: Root | null = null;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPE_EXAMPLE;
	}

	getDisplayText() {
		return "Example view";
	}

	async onOpen() {
		this.root = createRoot(this.containerEl.children[1]);
		const AppContext = createContext<App | undefined>(undefined);
		this.root.render(
			<AppContext.Provider value={this.app}>
				<Hierarchy />
			</AppContext.Provider>,
		);
		this.root.render(
			<React.StrictMode>
				<ReactView />,
			</React.StrictMode>,
		);
	}

	async onClose() {
		this.root?.unmount();
	}
}

const ReactView = () => {
	return <h4>Hello, React!</h4>;
};
