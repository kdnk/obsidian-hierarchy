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
				await this.refresh();
			}),
		);

		this.app.workspace.onLayoutReady(async () => {
			await this.refresh();
		});
	}

	async onunload() {
		this.settings.fullPathForTabs = false;
		this.settings.fullPathForBacklinks = false;
		await this.refresh();
	}

	async refresh() {
		this.setTabTitle();
		await this.setBacklinkTitle();
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

		console.log(`[main.ts:59] tabHeaderEls: `, tabHeaderEls);

		for (const [index, tabHeaderEl] of tabHeaderEls.entries()) {
			const titleEl = tabHeaderEl.querySelector(
				".workspace-tab-header-inner-title",
			) as HTMLElement;
			if (titleEl) {
				if (this.settings.fullPathForTabs) {
					titleEl.textContent =
						children[index].view.file.path.split(".")[0];
				} else {
					titleEl.textContent = children[index].view.file.basename;
				}
			}
		}
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
						if (this.settings.fullPathForBacklinks) {
							titleEl.textContent = child.file.path.split(".")[0];
						} else {
							titleEl.textContent = child.file.basename;
						}
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
