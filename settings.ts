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

		new Setting(containerEl)
			.setName("Full path for backlinks")
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.fullPathForBacklinks)
					.onChange(async (value) => {
						this.plugin.settings.fullPathForBacklinks = value;
						await this.plugin.saveData(this.plugin.settings);
						await this.plugin.refresh();
					});
			});

		new Setting(containerEl)
			.setName("Full path for tabs")
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.fullPathForTabs)
					.onChange(async (value) => {
						this.plugin.settings.fullPathForTabs = value;
						await this.plugin.saveData(this.plugin.settings);
						await this.plugin.refresh();
					});
			});
	}
}
