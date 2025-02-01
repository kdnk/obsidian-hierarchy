import { MarkdownView, TFile } from "obsidian";
import { createRoot } from "react-dom/client";
import { Hierarchy } from "../ui/hierarchy";
import type HierarchyPlugin from "../main";

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

		const currentPathName = getCleanPathName(leaf.view.file.path);
		const hierarchies = getHierarchies(currentPathName);
		const children = getChildren(plugin, currentPathName);

		const count = hierarchies.length + children.length;

		root.render(
			<Hierarchy
				hierarchies={hierarchies}
				children={children}
				count={count}
			></Hierarchy>,
		);
	});
}

function getChildren(plugin: HierarchyPlugin, currentPathName: string) {
	const files = plugin.app.metadataCache.getCachedFiles();
	if (plugin.childrenCache[currentPathName]) {
		return plugin.childrenCache[currentPathName];
	}

	const children = files
		.filter((file) => {
			function isSubdirectory(parentDir: string, subDir: string) {
				return (
					subDir.startsWith(parentDir) &&
					(subDir[parentDir.length] === "/" ||
						parentDir.length === subDir.length)
				);
			}

			const pathName = getCleanPathName(file);
			if (pathName === currentPathName) return false;
			if (pathName === 'journals') return false;
			if (pathName.includes("/attachments/")) return false;
			if (pathName.startsWith("attachments/")) return false;
			return isSubdirectory(currentPathName, pathName);
		})
		.map((file) => {
			const pathName = getCleanPathName(file);
			return pathName;
		});
	plugin.childrenCache[currentPathName] = children;
	return children;
}

function getHierarchies(pathName: string) {
	const dirs = pathName.split("/");

	const computePath = (hierarchies: string[]) => {
		return hierarchies.reduce((acc, curr, index) => {
			return index === 0 ? curr : `${acc}/${curr}`;
		}, "");
	};
	return pathName
		.split("/")
		.map((_, index) => {
			if (index === dirs.length - 1) {
				return null;
			}
			const path = computePath(dirs.slice(0, index + 1));
			return path;
		})
		.filter((path) => path !== null) as string[];
}

function getCleanPathName(path: string) {
	let pathName = path.split(".")[0];
	if (pathName.startsWith("pages/")) {
		pathName = pathName.slice(6);
	}
	return pathName;
}
