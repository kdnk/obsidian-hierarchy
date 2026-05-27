import { around } from "monkey-around";
import { Component, Notice } from "obsidian";
import type HierarchyPlugin from "../main";
import { hasBacklinks } from "../utils/backlinks";

type BacklinkTitleElement = {
	textContent: string | null;
};

type BacklinkItem = {
	el: {
		firstChild: {
			find: (selector: string) => BacklinkTitleElement;
		};
	};
	file: {
		path: string;
		basename: string;
	};
};

type BacklinkDomLike = {
	constructor: {
		prototype: {
			addResult: (...args: unknown[]) => BacklinkItem;
			emptyResults: (...args: unknown[]) => unknown;
		};
	};
};

export function patchBacklinks(plugin: HierarchyPlugin) {
	plugin.register(
		around(Component.prototype, {
			addChild(old: Component["addChild"]) {
				return function (child: unknown, ...args: unknown[]) {
					if (hasBacklinks(child)) {
						try {
							patchBacklinkDom(plugin, child.backlinkDom);
							return old.call(this, child, ...args);
						} catch (error) {
							showPatchError(error);
							return old.call(this, child, ...args);
						}
					} else {
						return old.call(this, child, ...args);
					}
				};
			},
		}),
	);
}

function patchBacklinkDom(plugin: HierarchyPlugin, dom: BacklinkDomLike) {
	plugin.register(
		around(dom.constructor.prototype, {
			addResult(old: (...args: unknown[]) => BacklinkItem) {
				return function (...args: unknown[]) {
					const result = old.call(this, ...args);
					try {
						patchBacklinkTitle(plugin, result);
					} catch (error) {
						showPatchError(error);
					}
					return result;
				};
			},
			emptyResults(old: (...args: unknown[]) => unknown) {
				return function (...args: unknown[]) {
					return old.call(this, ...args);
				};
			},
		}),
	);
}

function patchBacklinkTitle(plugin: HierarchyPlugin, item: BacklinkItem): void {
	const titleEl = item.el.firstChild.find(".tree-item-inner");

	if (plugin.settings.hierarchyForBacklinks) {
		titleEl.textContent = item.file.path.split(".")[0];
	} else {
		titleEl.textContent = item.file.basename;
	}
}

function showPatchError(error: unknown): void {
	const detail = error instanceof Error ? error.message : String(error);
	new Notice(`Hierarchy failed to update backlinks: ${detail}`);
}
