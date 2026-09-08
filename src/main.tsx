import { App, Notice, Plugin, PluginManifest } from "obsidian";
import {
	DEFAULT_SETTINGS,
	HierarchySettings,
	HierarchyPluginSettingsTab,
} from "./settings";
import { patchBacklinks } from "./backlinks/patch-backlinks";
import { patchAllTabs } from "./tabs/patch-tabs";
import { renderHierarchy } from "./hierarchy-view/render-hierarchy";

export default class HierarchyPlugin extends Plugin {
	settings: HierarchySettings = { ...DEFAULT_SETTINGS };
	childrenCache: Record<string, string[]>;
	private refreshBacklinks: () => void = () => {};
	private loadGeneration = 0;

	constructor(app: App, pluginManifest: PluginManifest) {
		super(app, pluginManifest);
		this.childrenCache = {};
	}

	onload(): void {
		const generation = ++this.loadGeneration;
		this.loadSettings()
			.then(() => {
				if (generation !== this.loadGeneration) return;
				this.addSettingTab(new HierarchyPluginSettingsTab(this.app, this));

				this.refreshBacklinks = patchBacklinks(this);

				this.app.workspace.onLayoutReady(() => {
					if (generation !== this.loadGeneration) return;
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
						this.app.metadataCache.on("resolved", () => this.refresh()),
					);

					this.registerEvent(this.app.vault.on("create", () => this.refresh()));
					this.registerEvent(this.app.vault.on("delete", () => this.refresh()));
					this.registerEvent(this.app.vault.on("rename", () => this.refresh()));

					this.registerEvent(
						this.app.workspace.on("layout-change", () => this.refresh()),
					);
				});
			})
			.catch((error: unknown) => {
				if (generation !== this.loadGeneration) return;
				this.handleError("Failed to load Hierarchy settings.", error);
			});
	}

	refresh(): void {
		// Invalidate before rendering so renamed or deleted paths cannot survive
		// in the visible hierarchy until a second event arrives.
		this.childrenCache = {};
		patchAllTabs(this);
		this.refreshBacklinks();
		renderHierarchy(this);
	}

	onunload(): void {
		// Cancel both pending settings reads and onLayoutReady callbacks. A new
		// load gets its own generation, even if this instance is reused.
		this.loadGeneration++;
		this.settings.hierarchyForTabs = false;
		this.settings.hierarchyForBacklinks = false;
		this.settings.hierarchyForEditors = false;

		renderHierarchy(this);
		patchAllTabs(this);
	}

	async loadSettings(): Promise<void> {
		const generation = this.loadGeneration;
		const saved: Partial<HierarchySettings> | null = await this.loadData();
		if (generation !== this.loadGeneration) return;
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
}
