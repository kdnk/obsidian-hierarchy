import { MarkdownView, TFile } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { Hierarchy } from "../ui/hierarchy";
import type HierarchyPlugin from "../main";
import { HierarchyEntry, openHierarchyEntry } from "./hierarchy-entry";

const CONTAINER_CLASS = "hierarchy-container";

type MountedHierarchy = { root: Root; container: HTMLElement };
type HierarchyState = {
	mounts: Map<MarkdownView, MountedHierarchy>;
	expanded: WeakMap<MarkdownView, boolean>;
};
const stateByPlugin = new WeakMap<HierarchyPlugin, HierarchyState>();

export function renderHierarchy(
	plugin: HierarchyPlugin,
	file?: TFile | null,
): void {
	const markdownLeaves = plugin.app.workspace.getLeavesOfType("markdown");
	let state = stateByPlugin.get(plugin);
	if (!state) {
		if (!plugin.settings.hierarchyForEditors) return;
		state = { mounts: new Map(), expanded: new WeakMap() };
		stateByPlugin.set(plugin, state);
		const ownedMounts = state.mounts;
		plugin.register(() => {
			for (const mount of ownedMounts.values()) unmount(mount);
			ownedMounts.clear();
			stateByPlugin.delete(plugin);
		});
	}
	const { mounts, expanded } = state;
	const activeViews = new Set(markdownLeaves.map((leaf) => leaf.view));
	// Cleanup also runs for targeted file updates and reading-mode views.
	for (const [view, mount] of mounts) {
		if (!plugin.settings.hierarchyForEditors || !activeViews.has(view)
			|| !view.file || !view.containerEl.contains(mount.container)
			|| !view.containerEl.querySelector(".cm-contentContainer")) {
			unmount(mount);
			mounts.delete(view);
		}
	}
	if (!plugin.settings.hierarchyForEditors) return;
	const currentMounts = mounts;
	markdownLeaves.forEach((leaf) => {
		if (!(leaf.view instanceof MarkdownView)) return;
		const view = leaf.view;
		if (!leaf.view.file) return;
		if (file && leaf.view.file.path !== file.path) return;

		const mainEl = leaf.view.containerEl.querySelector(
			".cm-contentContainer",
		);
		if (!mainEl) return;

		let mount = currentMounts.get(leaf.view);
		if (!mount) {
			const container = createDiv({ cls: CONTAINER_CLASS });
			mainEl.after(container);
			mount = { root: createRoot(container), container };
			currentMounts.set(leaf.view, mount);
		}

		const sourcePath = leaf.view.file.path;
		const prefixes = plugin.settings.hierarchyUseObsidianFolder
			? getObsidianPrefixes(plugin, sourcePath)
			: plugin.settings.hierarchyCleanPathPrefixes;
		const toEntries = (paths: string[]): HierarchyEntry[] => paths
			.map((path) => ({ path, title: getDisplayPath(path, prefixes) }))
			.filter(({ path, title }) => title.length > 0 && !plugin.settings.hierarchyExcludePaths
				.some((exclude) => matchesExcludedPath(title, exclude)
					|| matchesExcludedPath(path, exclude)
					|| matchesExcludedPath(withoutMarkdownExtension(path), exclude)));
		const parts = sourcePath.split("/");
		const omittedPrefix = prefixes.find((prefix) => prefix.length > 0
			&& withoutMarkdownExtension(sourcePath).startsWith(prefix));
		const ancestorPaths = parts.slice(0, -1)
			.map((_, index) => `${parts.slice(0, index + 1).join("/")}.md`)
			.filter((path) => !omittedPrefix
				|| !omittedPrefix.startsWith(`${withoutMarkdownExtension(path)}/`));
		const hierarchies = toEntries(ancestorPaths);
		const children = toEntries(getChildren(plugin, sourcePath));

		const count = hierarchies.length + children.length;

		// Reusing the root preserves React's per-editor expansion state.
		mount.root.render(
			<Hierarchy
				hierarchies={hierarchies}
				children={children}
				count={count}
				vaultName={plugin.app.vault.getName()}
				initialExpanded={expanded.get(view) ?? true}
				onExpandedChange={(value) => expanded.set(view, value)}
				onOpen={async (entry, newLeaf) => {
					try {
						await openHierarchyEntry(plugin.app, entry, newLeaf);
					} catch (error) {
						plugin.handleError("Failed to open hierarchy note.", error);
					}
				}}
			></Hierarchy>,
		);
	});
}

function unmount(mount: MountedHierarchy): void {
	mount.root.unmount();
	mount.container.remove();
}

function matchesExcludedPath(path: string, rule: string): boolean {
	const exclude = rule.trim().replace(/\/+$/, "");
	return exclude.length > 0 && (path === exclude || path.startsWith(`${exclude}/`));
}

function getChildren(plugin: HierarchyPlugin, sourcePath: string): string[] {
	if (Object.prototype.hasOwnProperty.call(plugin.childrenCache, sourcePath)) {
		return plugin.childrenCache[sourcePath];
	}
	const prefix = `${withoutMarkdownExtension(sourcePath)}/`;
	// Cache actual paths only. Labels and exclusions depend on current settings.
	const children = plugin.app.vault.getMarkdownFiles()
		.map((file) => file.path)
		.filter((path) => path.startsWith(prefix));
	plugin.childrenCache[sourcePath] = children;
	return children;
}

function getObsidianPrefixes(plugin: HierarchyPlugin, sourcePath: string): string[] {
	// Public API applies the vault-root, current-folder and specified-folder
	// preferences without depending on undocumented configuration keys.
	const folder = plugin.app.fileManager.getNewFileParent(sourcePath);
	const path = folder.path.replace(/\/$/, "");
	return path ? [`${path}/`] : [];
}

function getDisplayPath(path: string, prefixes: string[]): string {
	const name = withoutMarkdownExtension(path);
	for (const prefix of prefixes) {
		if (!prefix) continue;
		if (name.startsWith(prefix)) return name.slice(prefix.length);
	}
	return name;
}

function withoutMarkdownExtension(path: string): string {
	return path.replace(/\.md$/, "");
}
