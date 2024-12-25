import { App, Plugin, PluginManifest } from "obsidian";
import {
	DEFAULT_SETTINGS,
	HierarchySettings,
	HierarchyPluginSettingsTab,
} from "./settings";
import { patchBacklinks } from "./backlinks/patch-backlinks";
import { patchTabs } from "./tabs/patch-tabs";
import { renderHierarchy } from "./hierarchy-view/render-hierarchy";

export default class HierarchyPlugin extends Plugin {
	settings: HierarchySettings;
	childrenCache: Record<string, string[]>;

	constructor(app: App, pluginManifest: PluginManifest) {
		super(app, pluginManifest);
		this.childrenCache = {};
	}

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new HierarchyPluginSettingsTab(this.app, this));

		patchBacklinks(this);

		this.registerEvent(
			this.app.workspace.on("file-open", async (file) => {
				patchTabs(this);
				renderHierarchy(this, file);
			}),
		);

		this.registerEvent(
			this.app.metadataCache.on("resolved", async () => {
				this.childrenCache = {};
				renderHierarchy(this);
			}),
		);

		this.registerEvent(
			this.app.vault.on("delete", () => {
				this.childrenCache = {};
			}),
		);

		this.registerEvent(
			this.app.vault.on("create", () => {
				this.childrenCache = {};
			}),
		);

		this.registerEvent(
			this.app.vault.on("rename", () => {
				this.childrenCache = {};
			}),
		);

		this.registerEvent(
			this.app.vault.on("rename", () => {
				this.childrenCache = {};
			}),
		);
	}

	async refresh() {
		patchTabs(this);
		renderHierarchy(this);
	}

	async onunload() {
		this.settings.hierarchyForTabs = false;
		this.settings.hierarchyForBacklinks = false;
		this.settings.hierarchyForEditors = false;

		renderHierarchy(this);
		patchTabs(this);
	}

	async loadSettings() {
		this.settings = {
			...DEFAULT_SETTINGS,
			...(await this.loadData()),
		};
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
