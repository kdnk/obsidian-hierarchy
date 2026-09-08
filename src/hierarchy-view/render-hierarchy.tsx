import { MarkdownView, TFile } from "obsidian";
import { createRoot } from "react-dom/client";
import { Hierarchy } from "../ui/hierarchy";
import type HierarchyPlugin from "../main";
import { HierarchyEntry, openHierarchyEntry } from "./hierarchy-entry";

const CONTAINER_CLASS = "hierarchy-container";

export function renderHierarchy(
	plugin: HierarchyPlugin,
	file?: TFile | null,
): void {
	const markdownLeaves = plugin.app.workspace.getLeavesOfType("markdown");
	markdownLeaves.forEach((leaf) => {
		if (!(leaf.view instanceof MarkdownView)) return;
		if (!leaf.view.file) return;
		if (file && leaf.view.file.path !== file.path) return;

		const mainEl = leaf.view.containerEl.querySelector(
			".cm-contentContainer",
		);
		if (!mainEl) return;

		const containers = leaf.view.containerEl.querySelectorAll(
			"." + CONTAINER_CLASS,
		);
		if (containers) {
			containers.forEach((el) => el.remove());
		}

		if (!plugin.settings.hierarchyForEditors) return;

		const newContainer = createDiv({ cls: CONTAINER_CLASS });
		mainEl.after(newContainer);

		const root = createRoot(newContainer);

		const sourcePath = leaf.view.file.path;
		const prefixes = plugin.settings.hierarchyUseObsidianFolder
			? getObsidianPrefixes(plugin, sourcePath)
			: plugin.settings.hierarchyCleanPathPrefixes;
		const toEntries = (paths: string[]): HierarchyEntry[] => paths
			.map((path) => ({ path, title: getDisplayPath(path, prefixes) }))
			.filter(({ title }) => title.length > 0 && !plugin.settings.hierarchyExcludePaths
				.some((exclude) => title.startsWith(exclude)));
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

		root.render(
			<Hierarchy
				hierarchies={hierarchies}
				children={children}
				count={count}
				vaultName={plugin.app.vault.getName()}
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
