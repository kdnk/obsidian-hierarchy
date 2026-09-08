import type HierarchyPlugin from "../main";
import { registerBacklinkTitleTransform } from "./obsidian-backlinks";

export function patchBacklinks(plugin: HierarchyPlugin) {
	registerBacklinkTitleTransform(plugin, (file) =>
		plugin.settings.hierarchyForBacklinks
			? file.path.split(".")[0]
			: file.basename,
	);
}
