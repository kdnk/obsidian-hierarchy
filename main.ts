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
	FullPathSettings,
	FullPathSettingsTab,
} from "./settings";

export default class FullPathPlugin extends Plugin {
	settings: FullPathSettings;
	constructor(app: App, pluginManifest: PluginManifest) {
		super(app, pluginManifest);
	}

	async onload() {
		this.loadSettings();
		this.addSettingTab(new FullPathSettingsTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on("file-open", async () => {
				this.refresh();
			}),
		);

		this.app.workspace.onLayoutReady(async () => {
			this.refresh();
		});
	}

	async refresh() {
		await this.setBacklinkTitle();
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

	setTabTitle() {
		if (!this.settings.fullPathForTabs) return;

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
				titleEl.textContent =
					children[index].view.file.path.split(".")[0];
			}
		}
	}

	async setBacklinkTitle(loopCount = 0) {
		if (!this.settings.fullPathForBacklinks) return;

		const markdownLeaves = this.app.workspace.getLeavesOfType("markdown");
		for (const leaf of markdownLeaves) {
			if (!(leaf.view instanceof MarkdownView)) return;

			const backlinks = leaf.view.backlinks as unknown as {
				recomputeBacklink: (file: FileView) => void;
				file: FileView;
				backlinkQueue: { runnable: { running: boolean } };
				backlinkDom: {
					vChildren: {
						children: {
							el: {
								firstChild: {
									find: (selector: string) => HTMLElement;
								};
							};
							file: { path: string };
							result: { content: unknown[] };
						}[];
					};
				};
			};

			const sleep = (msec: number) => {
				return new Promise((resolve) => setTimeout(resolve, msec));
			};

			const currentFile = this.app.workspace.getActiveFile();
			if (!currentFile) return;
			const backlinkCountFromCache = this.app.metadataCache
				.getBacklinksForFile(currentFile)
				.count();
			const backlinkCountCalulated =
				backlinks.backlinkDom.vChildren.children.reduce(
					(acc, child) => acc + child.result.content.length,
					0,
				);

			const renderFullPath = () => {
				for (const child of backlinks.backlinkDom.vChildren.children) {
					const titleEl =
						child.el.firstChild.find(".tree-item-inner");
					if (titleEl) {
						titleEl.textContent = child.file.path.split(".")[0];
					}
				}
			};
			if (backlinkCountCalulated < backlinkCountFromCache) {
				if (loopCount < 50) {
					await sleep(100);
					await this.setBacklinkTitle(loopCount + 1);
				} else {
					renderFullPath();
				}
			} else {
				renderFullPath();
			}
		}
	}
}
