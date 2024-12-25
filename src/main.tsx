import { App, Plugin, PluginManifest, Platform } from "obsidian";
import {
	DEFAULT_SETTINGS,
	HierarchySettings,
	HierarchyPluginSettingsTab,
} from "./settings";
import { ActiveTabGroup } from "./utils/active-tab-group";
import { patchBacklinks } from "./backlinks/patch-backlinks";
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
				this.setTabTitle();
				renderHierarchy(this, file);
			}),
		);

		this.registerEvent(
			this.app.metadataCache.on("resolved", async () => {
				this.resetChildrenCache();
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
		this.setTabTitle();
		renderHierarchy(this);
	}

	private resetChildrenCache() {
		this.childrenCache = {};
	}

	async onunload() {
		this.settings.hierarchyForTabs = false;
		this.settings.hierarchyForBacklinks = false;
		this.settings.hierarchyForEditors = false;

		renderHierarchy(this);
		this.setTabTitle();
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

	private setTabTitle() {
		if (Platform.isMobile) return;

		const activeTabGroup = this.app.workspace.activeTabGroup;
		if (!activeTabGroup) return;

		const isActiveTabGroup = (
			activeTabGroup: unknown,
		): activeTabGroup is ActiveTabGroup => {
			if (typeof activeTabGroup !== "object") return false;
			if (activeTabGroup === null) return false;
			if (!("tabHeaderEls" in activeTabGroup)) return false;
			if (!("children" in activeTabGroup)) return false;
			if (!Array.isArray(activeTabGroup.tabHeaderEls)) return false;
			if (
				!activeTabGroup.tabHeaderEls.every(
					(el) => el instanceof HTMLElement,
				)
			)
				return false;
			if (!Array.isArray(activeTabGroup.children)) return false;
			if (
				!activeTabGroup.children.every(
					(child) =>
						typeof child === "object" &&
						"view" in child &&
						"file" in child.view,
				)
			)
				return false;
			return true;
		};

		if (!isActiveTabGroup(activeTabGroup)) return;
		const { tabHeaderEls, children } = activeTabGroup;
		for (const [index, tabHeaderEl] of tabHeaderEls.entries()) {
			const child = children[index];

			const titleEl = tabHeaderEl.querySelector(
				".workspace-tab-header-inner-title",
			) as HTMLElement;
			if (titleEl) {
				if (this.settings.hierarchyForTabs) {
					if (!child.view.file) return;
					titleEl.textContent =
						children[index].view.file.path.split(".")[0];
				} else {
					titleEl.textContent = children[index].view.file.basename;
				}
			}
		}
	}
}
