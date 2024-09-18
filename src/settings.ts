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
			.setName("Hierarchy for backlinks")
			.setDesc(
				"Enable this setting to display the hierarchy of the file in the backlinks panel.",
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
			.setName("Hierarchy for tabs")
			.setDesc(
				"Enable this setting to display the hierarchy of the file in the tab headers.",
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
			.setName("Hierarchy under each editor")
			.setDesc(
				"Enable this setting to display the hierarchy of the file in the editor.",
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.hierarchyForEditors)
					.onChange((value) => {
						this.plugin.settings.hierarchyForTabs = value;
						this.plugin.saveData(this.plugin.settings);
						this.plugin.refresh();
					});
			});
	}
}
