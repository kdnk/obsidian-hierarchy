import { Platform } from "obsidian";
import type HierarchyPlugin from "../main";
import type { ActiveTabGroup } from "../utils/active-tab-group";

/**
 * Type guard that checks whether the given workspace object
 * has an internal "rootSplit" property with a "children" array.
 */
function isWorkspaceWithRootSplit(
	workspace: unknown,
): workspace is { rootSplit: { children: unknown[] } } {
	if (
		workspace !== null &&
		typeof workspace === "object" &&
		"rootSplit" in workspace
	) {
		const rs = Reflect.get(workspace, "rootSplit");
		if (rs !== null && typeof rs === "object" && "children" in rs) {
			return Array.isArray(Reflect.get(rs, "children"));
		}
	}
	return false;
}

/**
 * Type guard that checks whether the given object is an ActiveTabGroup
 * (has tabHeaderEls array).
 */
function isActiveTabGroup(obj: unknown): obj is ActiveTabGroup {
	if (obj !== null && typeof obj === "object" && "tabHeaderEls" in obj) {
		return Array.isArray(Reflect.get(obj, "tabHeaderEls"));
	}
	return false;
}

/**
 * Recursively collects all ActiveTabGroup instances from the workspace tree.
 * When tabs are split, rootSplit.children contains nested split objects
 * rather than direct tab groups.
 */
function collectTabGroups(node: unknown): ActiveTabGroup[] {
	const groups: ActiveTabGroup[] = [];
	if (isActiveTabGroup(node)) {
		groups.push(node);
	}
	if (
		node !== null &&
		typeof node === "object" &&
		"children" in node
	) {
		const children = Reflect.get(node, "children");
		if (Array.isArray(children)) {
			for (const child of children) {
				groups.push(...collectTabGroups(child));
			}
		}
	}
	return groups;
}

/**
 * Retrieves the file path from a child view.
 * It first checks for the existence of child.view.file (an object with a path property),
 * and if that is not available, it falls back to child.view.state.file (a string).
 */
function getFilePath(child: unknown): string | undefined {
	if (child !== null && typeof child === "object") {
		const view = Reflect.get(child, "view");
		if (view !== null && typeof view === "object") {
			// Check if child.view.file exists
			if ("file" in view) {
				const fileObj = Reflect.get(view, "file");
				if (
					fileObj !== null &&
					typeof fileObj === "object" &&
					"path" in fileObj
				) {
					const filePath = Reflect.get(fileObj, "path");
					if (typeof filePath === "string") return filePath;
				}
			}
			// If not, check for child.view.state.file (string)
			if ("state" in view) {
				const state = Reflect.get(view, "state");
				if (
					state !== null &&
					typeof state === "object" &&
					"file" in state
				) {
					const stateFile = Reflect.get(state, "file");
					if (typeof stateFile === "string") return stateFile;
				}
			}
		}
	}
	return undefined;
}

/**
 * Patches the tab titles across all tab groups.
 * This function iterates over every tab group in the workspace's root split
 * and updates the tab header title based on the associated file path.
 */
export function patchAllTabs(plugin: HierarchyPlugin) {
	if (Platform.isMobile) return;

	// Retrieve the workspace as an unknown type to use our type guard
	const workspace: unknown = plugin.app.workspace;
	if (!isWorkspaceWithRootSplit(workspace)) return;

	// Destructure the rootSplit (guaranteed by the type guard)
	const { rootSplit } = workspace;

	// Recursively collect all tab groups (handles nested splits)
	const tabGroups = collectTabGroups(rootSplit);

	// Iterate through all tab groups
	for (const group of tabGroups) {
		// For each tab header element and its corresponding child view:
		for (const [index, tabHeaderEl] of group.tabHeaderEls.entries()) {
			const child = group.children[index];
			const titleEl = tabHeaderEl.querySelector(
				".workspace-tab-header-inner-title",
			);
			if (!titleEl) continue;

			const filePath = getFilePath(child);
			if (!filePath) continue;

			if (plugin.settings.hierarchyForTabs) {
				// Remove only the final Markdown extension, preserving dots in the path.
				titleEl.textContent = filePath.replace(/\.md$/, "");
			} else {
				// Otherwise, display only the base name of the file
				const parts = filePath.split("/");
				const basenameWithExt = parts[parts.length - 1];
				const basename = basenameWithExt.replace(/\.md$/, "");
				titleEl.textContent = basename;
			}
		}
	}
}
