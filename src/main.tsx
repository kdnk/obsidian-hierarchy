import { App, FileView, Notice, Plugin, PluginManifest, TFile } from "obsidian";
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
	private refreshBacklinks: () => void = () => {};

	constructor(app: App, pluginManifest: PluginManifest) {
		super(app, pluginManifest);
		this.childrenCache = {};
	}

	onload(): void {
		this.loadSettings()
			.then(() => {
				this.addSettingTab(new HierarchyPluginSettingsTab(this.app, this));

				this.refreshBacklinks = patchBacklinks(this);

				this.app.workspace.onLayoutReady(() => {
					this.refresh();

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
							this.refreshBacklinks();
							renderHierarchy(this);
							this.childrenCache = {};
						}),
					);
				});
			})
			.catch((error: unknown) => {
				this.handleError("Failed to load Hierarchy settings.", error);
			});
	}

	refresh(): void {
		patchAllTabs(this);
		this.refreshBacklinks();
		renderHierarchy(this);
	}

	onunload(): void {
		this.settings.hierarchyForTabs = false;
		this.settings.hierarchyForBacklinks = false;
		this.settings.hierarchyForEditors = false;

		renderHierarchy(this);
		patchAllTabs(this);
	}

	async loadSettings(): Promise<void> {
		const saved: Partial<HierarchySettings> | null = await this.loadData();
		this.settings = {
			...DEFAULT_SETTINGS,
			...saved,
		};
		if (saved && saved.hierarchyUseObsidianFolder === undefined) {
			const prefixes = saved.hierarchyCleanPathPrefixes;
			// Adopt Obsidian's folder for the old default; preserve custom rules,
			// including an empty list that explicitly disabled shortening.
			this.settings.hierarchyUseObsidianFolder = prefixes === undefined
				|| (prefixes.length === 1 && prefixes[0] === "pages/");
		}
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	handleError(message: string, error: unknown): void {
		const detail = error instanceof Error ? error.message : String(error);
		new Notice(`${message} ${detail}`);
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
