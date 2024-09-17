import {
	App,
	FileView,
	MarkdownView,
	Plugin,
	PluginManifest,
	TFile,
} from "obsidian";
import {
	DEFAULT_SETTINGS,
	HierarchySettings,
	HierarchyPluginSettingsTab,
} from "./settings";
import { HierarchyView, VIEW_TYPE_HIERARCHY } from "./hierarchy-view";

export default class HierarchyPlugin extends Plugin {
	settings: HierarchySettings;
	constructor(app: App, pluginManifest: PluginManifest) {
		super(app, pluginManifest);
	}

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new HierarchyPluginSettingsTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on("file-open", async () => {
				await this.refresh();
			}),
		);

		this.app.workspace.onLayoutReady(async () => {
			await this.refresh();
		});

		this.registerView(VIEW_TYPE_HIERARCHY, (leaf) => {
			return new HierarchyView(leaf);
		});
	}

	async onunload() {
		this.settings.hierarchyForTabs = false;
		this.settings.hierarchyForBacklinks = false;
		await this.refresh();
	}

	async refresh() {
		this.setTabTitle();
		await this.setBacklinkTitle();
		this.renderHierarchy();
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

	setTabTitle() {
		const { tabHeaderEls, children } = this.app.workspace
			.activeTabGroup as unknown as {
			tabHeaderEls: HTMLElement[];
			children: { view: { file: TFile } }[];
		};

		for (const [index, tabHeaderEl] of tabHeaderEls.entries()) {
			const titleEl = tabHeaderEl.querySelector(
				".workspace-tab-header-inner-title",
			) as HTMLElement;
			if (titleEl) {
				if (this.settings.hierarchyForTabs) {
					titleEl.textContent =
						children[index].view.file.path.split(".")[0];
				} else {
					titleEl.textContent = children[index].view.file.basename;
				}
			}
		}
	}

	renderHierarchy() {
		const markdownView =
			this.app.workspace.getActiveViewOfType(MarkdownView);
		if (markdownView == null) {
			return;
		}

		const activeFile = markdownView.file;
		if (activeFile == null) {
			return;
		}
		console.log(`[main.ts:92] activeFile);: `, activeFile);
	}

	async setBacklinkTitle(loopCount = 0) {
		const markdownLeaves = this.app.workspace.getLeavesOfType("markdown");
		for (const leaf of markdownLeaves) {
			if (!(leaf.view instanceof MarkdownView)) return;

			const backlinks = leaf.view.backlinks as unknown as {
				recomputeBacklink: (file: FileView) => void;
				file: FileView;
				backlinkDom: {
					vChildren: {
						children: {
							el: {
								firstChild: {
									find: (selector: string) => HTMLElement;
								};
							};
							file: TFile;
							result: {
								content: unknown[];
								properties: unknown[];
							};
						}[];
					};
				};
			};

			const sleep = (msec: number) => {
				return new Promise((resolve) => setTimeout(resolve, msec));
			};

			const renderTitle = () => {
				for (const child of backlinks.backlinkDom.vChildren.children) {
					const titleEl =
						child.el.firstChild.find(".tree-item-inner");
					if (titleEl) {
						if (this.settings.hierarchyForBacklinks) {
							titleEl.textContent = child.file.path.split(".")[0];
						} else {
							titleEl.textContent = child.file.basename;
						}
					}
				}
			};

			renderTitle();

			const currentFile = this.app.workspace.getActiveFile();
			if (!currentFile) return;
			const backlinkCountFromCache = this.app.metadataCache
				.getBacklinksForFile(currentFile)
				.count();
			const backlinkCountCalulated =
				backlinks.backlinkDom.vChildren.children.reduce(
					(acc, child) => {
						return (
							acc +
							child.result.content.length +
							child.result.properties.length
						);
					},
					0,
				);

			if (backlinkCountCalulated < backlinkCountFromCache) {
				if (loopCount < 30) {
					await sleep(250);
					await this.setBacklinkTitle(loopCount + 1);
				}
			}
		}
	}
}
