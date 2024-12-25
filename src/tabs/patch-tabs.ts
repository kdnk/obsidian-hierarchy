import { Platform } from "obsidian";
import { type ActiveTabGroup } from "../utils/active-tab-group";
import type HierarchyPlugin from "../main";

export function patchTabs(plugin: HierarchyPlugin) {
	if (Platform.isMobile) return;

	const activeTabGroup = plugin.app.workspace.activeTabGroup;
	if (!activeTabGroup) return;

	const isActiveTabGroup = (
		activeTabGroup: unknown,
	): activeTabGroup is ActiveTabGroup => {
		if (typeof activeTabGroup !== "object") return false;
		if (activeTabGroup === null) return false;
		if (!("tabHeaderEls" in activeTabGroup)) return false;
		if (!("children" in activeTabGroup)) return false;
		if (!Array.isArray(activeTabGroup.tabHeaderEls)) return false;
		if (
			!activeTabGroup.tabHeaderEls.every(
				(el) => el instanceof HTMLElement,
			)
		)
			return false;
		if (!Array.isArray(activeTabGroup.children)) return false;
		if (
			!activeTabGroup.children.every(
				(child) =>
					typeof child === "object" &&
					"view" in child &&
					"file" in child.view,
			)
		)
			return false;
		return true;
	};

	if (!isActiveTabGroup(activeTabGroup)) return;
	const { tabHeaderEls, children } = activeTabGroup;
	for (const [index, tabHeaderEl] of tabHeaderEls.entries()) {
		const child = children[index];

		const titleEl = tabHeaderEl.querySelector(
			".workspace-tab-header-inner-title",
		) as HTMLElement;
		if (titleEl) {
			if (plugin.settings.hierarchyForTabs) {
				if (!child.view.file) return;
				titleEl.textContent =
					children[index].view.file.path.split(".")[0];
			} else {
				titleEl.textContent = children[index].view.file.basename;
			}
		}
	}
}
