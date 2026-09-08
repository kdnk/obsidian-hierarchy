import { around } from "monkey-around";
import { Component, Notice, Workspace } from "obsidian";

type BacklinkFile = {
	path: string;
	basename: string;
};

type BacklinkPrototype = {
	addResult: (...args: unknown[]) => unknown;
};

type BacklinkRenderer = {
	resultDomLookup?: Map<unknown, unknown>;
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
	workspace: Pick<Workspace, "getLeavesOfType">,
	getTitle: (file: BacklinkFile) => string | null,
): () => void {
	const patchedPrototypes = new WeakSet<BacklinkPrototype>();
	const titles = new WeakMap<Element, { original: string | null; applied: string }>();
	const removePatches: (() => void)[] = [];
	let active = true;

	function updateItem(result: unknown, restore = false): void {
		try {
			if (!isBacklinkItem(result)) return;
			const title = result.el.querySelector(".tree-item-inner");
			if (!title) return;
			const previous = titles.get(title);
			const text = restore ? null : getTitle(result.file);
			if (text === null) {
				// Do not overwrite a title changed by another plugin after our write.
				if (previous && title.textContent === previous.applied) {
					title.textContent = previous.original;
				}
				titles.delete(title);
				return;
			}
			const original = previous && title.textContent === previous.applied
				? previous.original
				: title.textContent;
			if (title.textContent !== text) title.textContent = text;
			titles.set(title, { original, applied: text });
		} catch (error) {
			showPatchError(error);
		}
	}

	function visitRenderer(renderer: BacklinkRenderer, restore = false): void {
		if (!restore) {
			const prototype = getBacklinkPrototype(renderer);
			if (prototype && !patchedPrototypes.has(prototype)) {
				removePatches.push(patchRenderer(prototype, updateItem));
				patchedPrototypes.add(prototype);
			}
		}
		if (renderer.resultDomLookup instanceof Map) {
			for (const result of renderer.resultDomLookup.values()) updateItem(result, restore);
		}
	}

	function refresh(): void {
		if (active) visitWorkspaceRenderers(workspace, visitRenderer);
	}

	// Component.addChild discovers renderers in both panels and editor backlinks.
	removePatches.push(
		around(Component.prototype, {
			addChild(old: Component["addChild"]) {
				return function (child: Component, ...args: unknown[]) {
					try {
						visitComponentRenderers(child, visitRenderer);
					} catch (error) {
						showPatchError(error);
					}
					// Original component errors must propagate without retrying addChild.
					return old.call(this, child, ...args);
				};
			},
		}),
	);
	owner.register(() => {
		active = false;
		for (const remove of removePatches.splice(0).reverse()) remove();
		visitWorkspaceRenderers(workspace, (renderer) => visitRenderer(renderer, true));
	});
	refresh();
	return refresh;
}

function patchRenderer(
	prototype: BacklinkPrototype,
	updateItem: (result: unknown) => void,
): () => void {
	return around(prototype, {
		addResult(old: BacklinkPrototype["addResult"]) {
			return function (...args: unknown[]) {
				const result = old.apply(this, args);
				updateItem(result);
				return result;
			};
		},
	});
}

function getBacklinkPrototype(renderer: BacklinkRenderer): BacklinkPrototype | null {
	const prototype: unknown = Object.getPrototypeOf(renderer);
	return isRecord(prototype) && typeof prototype.addResult === "function"
		? prototype as BacklinkPrototype
		: null;
}

function visitWorkspaceRenderers(
	workspace: Pick<Workspace, "getLeavesOfType">,
	visit: (renderer: BacklinkRenderer) => void,
): void {
	// Enumerate live components instead of retaining renderers and their DOM.
	const seen = new Set<object>();
	function visitComponent(component: unknown): void {
		if (!isRecord(component) || seen.has(component)) return;
		seen.add(component);
		try {
			visitComponentRenderers(component, visit);
			if (Array.isArray(component._children)) {
				for (const child of component._children) visitComponent(child);
			}
		} catch (error) {
			showPatchError(error);
		}
	}
	for (const type of ["markdown", "backlink"]) {
		for (const leaf of workspace.getLeavesOfType(type)) visitComponent(leaf.view);
	}
}

function visitComponentRenderers(
	component: unknown,
	visit: (renderer: BacklinkRenderer) => void,
): void {
	if (!isRecord(component)) return;
	// Unlinked mentions share the patched backlink renderer prototype.
	for (const key of ["backlinkDom", "unlinkedDom"]) {
		const renderer = component[key];
		if (isRecord(renderer)) visit(renderer);
	}
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
