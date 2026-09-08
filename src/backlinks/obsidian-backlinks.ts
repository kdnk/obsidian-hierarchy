import { around } from "monkey-around";
import { Component, Notice } from "obsidian";

type BacklinkFile = {
	path: string;
	basename: string;
};

type BacklinkPrototype = {
	addResult: (...args: unknown[]) => unknown;
};

type BacklinkItem = {
	file: BacklinkFile;
	el: Pick<HTMLElement, "querySelector">;
};

/**
 * Compatibility adapter for Obsidian's undocumented backlink renderer.
 * Keep internal shapes and DOM selectors here, separate from title formatting.
 * The owner removes all patches when it unloads.
 */
export function registerBacklinkTitleTransform(
	owner: Component,
	getTitle: (file: BacklinkFile) => string,
): void {
	const patchedPrototypes = new WeakSet<BacklinkPrototype>();

	// Component.addChild discovers renderers in both panels and editor backlinks.
	owner.register(
		around(Component.prototype, {
			addChild(old: Component["addChild"]) {
				return function (child: Component, ...args: unknown[]) {
					try {
						const prototype = getBacklinkPrototype(child);
						if (prototype && !patchedPrototypes.has(prototype)) {
							owner.register(patchRenderer(prototype, getTitle));
							patchedPrototypes.add(prototype);
						}
					} catch (error) {
						showPatchError(error);
					}
					// Original component errors must propagate without retrying addChild.
					return old.call(this, child, ...args);
				};
			},
		}),
	);
}

function patchRenderer(
	prototype: BacklinkPrototype,
	getTitle: (file: BacklinkFile) => string,
): () => void {
	return around(prototype, {
		addResult(old: BacklinkPrototype["addResult"]) {
			return function (...args: unknown[]) {
				const result = old.apply(this, args);
				try {
					if (isBacklinkItem(result)) {
						const title = result.el.querySelector(".tree-item-inner");
						if (title) title.textContent = getTitle(result.file);
					}
				} catch (error) {
					showPatchError(error);
				}
				return result;
			};
		},
	});
}

function getBacklinkPrototype(child: unknown): BacklinkPrototype | null {
	if (!isRecord(child) || !isRecord(child.backlinkDom)) return null;
	const prototype: unknown = Object.getPrototypeOf(child.backlinkDom);
	return isRecord(prototype) && typeof prototype.addResult === "function"
		? prototype as BacklinkPrototype
		: null;
}

function isBacklinkItem(item: unknown): item is BacklinkItem {
	return isRecord(item)
		&& isRecord(item.file)
		&& typeof item.file.path === "string"
		&& typeof item.file.basename === "string"
		&& isRecord(item.el)
		&& typeof item.el.querySelector === "function";
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object";
}

function showPatchError(error: unknown): void {
	const detail = error instanceof Error ? error.message : String(error);
	new Notice(`Hierarchy failed to update backlinks: ${detail}`);
}
