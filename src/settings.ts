import { App, PluginSettingTab, Setting } from "obsidian";
import HierarchyPlugin from "./main";

export type HierarchySettings = {
    hierarchyForBacklinks: boolean;
    hierarchyForTabs: boolean;
    hierarchyForEditors: boolean;
    hierarchyExcludePaths: string[];
    hierarchyCleanPathPrefixes: string[];
};

export const DEFAULT_SETTINGS: HierarchySettings = {
    hierarchyForBacklinks: true,
    hierarchyForTabs: true,
    hierarchyForEditors: true,
    hierarchyExcludePaths: ["attachments", "journals"],
	hierarchyCleanPathPrefixes: ["pages/"],
};

export class HierarchyPluginSettingsTab extends PluginSettingTab {
	plugin: HierarchyPlugin;

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
						this.saveAndRefresh();
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
						this.saveAndRefresh();
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
						this.saveAndRefresh();
					});
			});

		new Setting(containerEl)
			.setName("Hierarchy Exclude Paths")
			.setDesc(
				"Enter paths (one per line) that should be excluded from the hierarchy view.",
			)
			.addTextArea((text) => {
				text
					.setPlaceholder("e.g. journals\npages")
					.setValue(
						this.plugin.settings.hierarchyExcludePaths.join("\n"),
					)
					.onChange((value) => {
						this.plugin.settings.hierarchyExcludePaths =
							parseLines(value);
						this.saveAndRefresh();
					});
			});

		new Setting(containerEl)
			.setName("Hierarchy Clean Path Prefixes")
			.setDesc(
				"Enter path prefixes (one per line) to remove from displayed paths in the hierarchy view. For example, 'pages/' will be removed from paths starting with 'pages/'.",
			)
			.addTextArea((text) => {
				text
					.setPlaceholder("e.g. pages/\nblog/")
					.setValue(
						this.plugin.settings.hierarchyCleanPathPrefixes.join(
							"\n",
						),
					)
					.onChange((value) => {
						this.plugin.settings.hierarchyCleanPathPrefixes =
							parseLines(value);
						this.saveAndRefresh();
					});
			});
	}

	private saveAndRefresh(): void {
		this.plugin.saveSettings().catch((error: unknown) => {
			this.plugin.handleError("Failed to save Hierarchy settings.", error);
		});
		this.plugin.refresh();
	}
}

function parseLines(value: string): string[] {
	return value
		.split(/\r?\n/)
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
}
