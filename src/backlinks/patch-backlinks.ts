import type HierarchyPlugin from "../main";
import { registerBacklinkTitleTransform } from "./obsidian-backlinks";

export function patchBacklinks(plugin: HierarchyPlugin): () => void {
	return registerBacklinkTitleTransform(plugin, plugin.app.workspace, (file) =>
		plugin.settings.hierarchyForBacklinks
			? file.path.split(".")[0]
			: null,
	);
}
