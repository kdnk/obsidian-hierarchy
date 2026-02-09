import { App, Plugin, PluginManifest, TFile } from "obsidian";
import {
	DEFAULT_SETTINGS,
	HierarchySettings,
	HierarchyPluginSettingsTab,
} from "./settings";
import { patchBacklinks } from "./backlinks/patch-backlinks";
import { patchAllTabs } from "./tabs/patch-tabs";
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

		this.app.workspace.onLayoutReady(() => {
			patchAllTabs(this);

			this.registerEvent(
				this.app.workspace.on("file-open", async (file) => {
					patchAllTabs(this);
					renderHierarchy(this, file);
				}),
			);

			this.registerEvent(
				this.app.workspace.on("active-leaf-change", async () => {
					this.childrenCache = {};
					patchAllTabs(this);
				}),
			);

			this.registerEvent(
				this.app.metadataCache.on("resolved", async () => {
					const leaves =
						this.app.workspace.getLeavesOfType("markdown");

					for (const leaf of leaves) {
						const file = (leaf.view as any).file as
							| TFile
							| undefined;
						if (!file) continue;
						renderHierarchy(this, file);
					}

					this.childrenCache = {};
					patchAllTabs(this);
				}),
			);

			this.registerEvent(
				this.app.vault.on("create", () => {
					patchAllTabs(this);
					this.childrenCache = {};
				}),
			);

			this.registerEvent(
				this.app.workspace.on("layout-change", () => {
					patchAllTabs(this);
					renderHierarchy(this);
					this.childrenCache = {};
				}),
			);
		});
	}

	async refresh() {
		patchAllTabs(this);
		renderHierarchy(this);
	}

	async onunload() {
		this.settings.hierarchyForTabs = false;
		this.settings.hierarchyForBacklinks = false;
		this.settings.hierarchyForEditors = false;

		renderHierarchy(this);
		patchAllTabs(this);
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
