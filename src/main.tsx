import { App, FileView, Plugin, PluginManifest, TFile } from "obsidian";
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

	onload(): void {
		void this.loadSettings().then(() => {
			this.addSettingTab(new HierarchyPluginSettingsTab(this.app, this));

			patchBacklinks(this);

			this.app.workspace.onLayoutReady(() => {
				patchAllTabs(this);

				this.registerEvent(
					this.app.workspace.on("file-open", (file) => {
						patchAllTabs(this);
						renderHierarchy(this, file);
					}),
				);

				this.registerEvent(
					this.app.workspace.on("active-leaf-change", () => {
						this.childrenCache = {};
						patchAllTabs(this);
					}),
				);

				this.registerEvent(
					this.app.metadataCache.on("resolved", () => {
						this.refreshMarkdownLeaves();
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
		});
	}

	refresh(): void {
		patchAllTabs(this);
		renderHierarchy(this);
	}

	onunload(): void {
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

	private refreshMarkdownLeaves(): void {
		const leaves = this.app.workspace.getLeavesOfType("markdown");

		for (const leaf of leaves) {
			if (!(leaf.view instanceof FileView)) continue;
			const file: TFile | null = leaf.view.file;
			if (!file) continue;
			renderHierarchy(this, file);
		}
	}
}
