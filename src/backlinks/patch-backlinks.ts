import { around } from "monkey-around";
import { Component } from "obsidian";
import type HierarchyPlugin from "../main";
import { hasBacklinks } from "../utils/backlinks";

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
							console.error(
								"rror while patching Obsidian internals: ",
								error,
							);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function patchBacklinkDom(plugin: HierarchyPlugin, dom: any) {
	plugin.register(
		around(dom.constructor.prototype, {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			addResult(old: any) {
				return function (...args: unknown[]) {
					const result = old.call(this, ...args);
					try {
						patchBacklinkTitle(plugin, result);
					} catch (error) {
						console.error(
							"rror while patching Obsidian internals: ",
							error,
						);
					}
					return result;
				};
			},
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			emptyResults(old: any) {
				return function (...args: unknown[]) {
					return old.call(this, ...args);
				};
			},
		}),
	);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function patchBacklinkTitle(plugin: HierarchyPlugin, item: any): void {
	const titleEl = item.el.firstChild.find(".tree-item-inner");

	if (plugin.settings.hierarchyForBacklinks) {
		titleEl.textContent = item.file.path.split(".")[0];
	} else {
		titleEl.textContent = item.file.basename;
	}
}
