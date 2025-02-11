import { Platform } from "obsidian";
import type HierarchyPlugin from "../main";
import type { ActiveTabGroup } from "../utils/active-tab-group";

/**
 * Type guard that checks whether the given workspace object
 * has an internal "rootSplit" property with a "children" array.
 */
function isWorkspaceWithRootSplit(
	workspace: unknown,
): workspace is { rootSplit: { children: ActiveTabGroup[] } } {
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

	// Iterate through all tab groups in the root split
	for (const group of rootSplit.children) {
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
				// In hierarchy mode, display the full file path without the extension
				titleEl.textContent = filePath.split(".")[0];
			} else {
				// Otherwise, display only the base name of the file
				const parts = filePath.split("/");
				const basenameWithExt = parts[parts.length - 1];
				const basename = basenameWithExt.split(".")[0];
				titleEl.textContent = basename;
			}
		}
	}
}
