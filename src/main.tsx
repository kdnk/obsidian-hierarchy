import {
	App,
	FileView,
	MarkdownView,
	Plugin,
	PluginManifest,
	TFile,
	Platform,
} from "obsidian";
import {
	DEFAULT_SETTINGS,
	HierarchySettings,
	HierarchyPluginSettingsTab,
} from "./settings";
import { Hierarchy } from "./hierarchy";
import { createRoot } from "react-dom/client";

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

		this.registerEvent(
			this.app.workspace.on("file-open", async () => {
				this.refresh();
			}),
		);

		this.app.metadataCache.on("resolved", async () => {
			this.resetChildrenCache();
			this.refresh();
		});

		this.app.workspace.on("layout-ready", async () => {
			this.refresh();
		});
	}

	async refresh() {
		this.setTabTitle();
		await this.setBacklinkTitle();
		this.activateHierarchyView();
	}

	private resetChildrenCache() {
		this.childrenCache = {};
	}

	private async activateHierarchyView() {
		const CONTAINER_CLASS = "hierarchy-container";
		const markdownLeaves = this.app.workspace.getLeavesOfType("markdown");

		for (const leaf of markdownLeaves) {
			if (!(leaf.view instanceof MarkdownView)) return;
			if (!leaf.view.file) return;

			const mainEl = leaf.view.containerEl.querySelector(
				".cm-contentContainer",
			);
			if (!mainEl) return;

			const containers = leaf.view.containerEl.querySelectorAll(
				"." + CONTAINER_CLASS,
			);

			if (containers) {
				containers.forEach((el) => el.remove());
			}

			if (!this.settings.hierarchyForEditors) return;

			const newContainer = createDiv({ cls: CONTAINER_CLASS });
			mainEl.after(newContainer);

			const root = createRoot(newContainer);

			const currentPathName = this.getCleanPathName(leaf.view.file.path);
			const hierarchies = currentPathName.split("/");
			const children = this.getChildren(currentPathName);

			root.render(
				<Hierarchy
					hierarchies={hierarchies}
					children={children}
				></Hierarchy>,
			);
		}
	}

	private getChildren(currentPathName: string) {
		const files = this.app.metadataCache.getCachedFiles();
		if (this.childrenCache[currentPathName]) {
			return this.childrenCache[currentPathName];
		}

		const children = files
			.filter((file) => {
				function isSubdirectory(parentDir: string, subDir: string) {
					return (
						subDir.startsWith(parentDir) &&
						(subDir[parentDir.length] === "/" ||
							parentDir.length === subDir.length)
					);
				}

				const pathName = this.getCleanPathName(file);
				if (pathName === currentPathName) return false;
				return isSubdirectory(currentPathName, pathName);
			})
			.map((file) => {
				const pathName = this.getCleanPathName(file);
				return pathName;
			});
		this.childrenCache[currentPathName] = children;
		return children;
	}

	private getCleanPathName(path: string) {
		let pathName = path.split(".")[0];
		if (pathName.startsWith("pages/")) {
			pathName = pathName.slice(6);
		}
		return pathName;
	}

	async onunload() {
		this.settings.hierarchyForTabs = false;
		this.settings.hierarchyForBacklinks = false;

		this.activateHierarchyView();
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

	private setTabTitle() {
		if (Platform.isMobile) return;
		if (!this.app.workspace.activeTabGroup) return;

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
					if (!children[index].view.file) return;
					titleEl.textContent =
						children[index].view.file.path.split(".")[0];
				} else {
					titleEl.textContent = children[index].view.file.basename;
				}
			}
		}
	}

	private async setBacklinkTitle(loopCount = 0) {
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
