import { PluginSettingTab, Setting } from "obsidian";
import HierarchyPlugin from "./main";

export type HierarchySettings = {
	hierarchyForBacklinks: boolean;
	hierarchyForTabs: boolean;
	hierarchyForEditors: boolean;
};

export const DEFAULT_SETTINGS: HierarchySettings = {
	hierarchyForBacklinks: true,
	hierarchyForTabs: true,
	hierarchyForEditors: true,
};

export class HierarchyPluginSettingsTab extends PluginSettingTab {
	plugin: HierarchyPlugin;
	// @ts-ignore
	constructor(app: App, plugin: HierarchyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Display hierarchy in backlinks panel")
			.setDesc(
				"Toggle this option to show the folder hierarchy of files in the backlinks panel, providing more context for each backlink.",
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.hierarchyForBacklinks)
					.onChange((value) => {
						this.plugin.settings.hierarchyForBacklinks = value;
						this.plugin.saveData(this.plugin.settings);
						this.plugin.refresh();
					});
			});

		new Setting(containerEl)
			.setName("Display hierarchy in tab headers")
			.setDesc(
				"Enable this option to show the folder hierarchy in the tab headers, allowing you to see the file's path in addition to its name.",
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.hierarchyForTabs)
					.onChange((value) => {
						this.plugin.settings.hierarchyForTabs = value;
						this.plugin.saveData(this.plugin.settings);
						this.plugin.refresh();
					});
			});

		new Setting(containerEl)
			.setName("Display hierarchy in editor view")
			.setDesc(
				"Enable this option to display the folder hierarchy below each markdown editor, helping you to quickly see related files in the same directory.",
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.hierarchyForEditors)
					.onChange((value) => {
						this.plugin.settings.hierarchyForEditors = value;
						this.plugin.saveData(this.plugin.settings);
						this.plugin.refresh();
					});
			});
	}
}
