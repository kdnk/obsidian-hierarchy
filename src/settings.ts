import { PluginSettingTab, Setting } from "obsidian";
import FullPathPlugin from "./main";

export type FullPathSettings = {
	fullPathForBacklinks: boolean;
	fullPathForTabs: boolean;
};

export const DEFAULT_SETTINGS: FullPathSettings = {
	fullPathForBacklinks: true,
	fullPathForTabs: true,
};

export class FullPathSettingsTab extends PluginSettingTab {
	plugin: FullPathPlugin;
	// @ts-ignore
	constructor(app: App, plugin: FullPathPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Full path for backlinks")
			.setDesc(
				"Enable this setting to display the full path of the file in the backlinks panel.",
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.fullPathForBacklinks)
					.onChange((value) => {
						this.plugin.settings.fullPathForBacklinks = value;
						this.plugin.saveData(this.plugin.settings);
						this.plugin.refresh();
					});
			});

		new Setting(containerEl)
			.setName("Full path for tabs")
			.setDesc(
				"Enable this setting to display the full path of the file in the tab headers.",
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.fullPathForTabs)
					.onChange((value) => {
						this.plugin.settings.fullPathForTabs = value;
						this.plugin.saveData(this.plugin.settings);
						this.plugin.refresh();
					});
			});
	}
}
