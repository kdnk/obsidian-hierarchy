import {
	App,
	MarkdownView,
	Plugin,
	PluginManifest,
	TFile,
	Platform,
	Component,
} from "obsidian";
import { around } from "monkey-around";
import {
	DEFAULT_SETTINGS,
	HierarchySettings,
	HierarchyPluginSettingsTab,
} from "./settings";
import { Hierarchy } from "./ui/hierarchy";
import { createRoot } from "react-dom/client";
import { ActiveTabGroup } from "./utils/active-tab-group";
import { hasBacklinks, isBacklinks } from "./utils/backlinks";

export default class HierarchyPlugin extends Plugin {
	settings: HierarchySettings;
	childrenCache: Record<string, string[]>;
	private triedPatching = false;
	private triedPatchingRenderContentMatches = false;
	private wrappedItems = new WeakMap();

	constructor(app: App, pluginManifest: PluginManifest) {
		super(app, pluginManifest);
		this.childrenCache = {};
	}

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new HierarchyPluginSettingsTab(this.app, this));

		this.patchBacklinks();

		this.registerEvent(
			this.app.workspace.on("file-open", async (file) => {
				this.setTabTitle();
				await this.setBacklinkTitle({ file });
				this.activateHierarchyView(file);
			}),
		);

		this.registerEvent(
			this.app.metadataCache.on("resolved", async () => {
				this.resetChildrenCache();
				this.activateHierarchyView();
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

	private patchBacklinks() {
		const that = this;
		this.register(
			around(Component.prototype, {
				addChild(old: Component["addChild"]) {
					return function (child: unknown, ...args: unknown[]) {
						if (hasBacklinks(child)) {
							try {
								that.patchBacklinkDom(child.backlinkDom);
								return old.call(this, child, ...args);
							} catch (error) {
								console.error(
									"rror while patching Obsidian internals: ",
									error,
								);
								return old.call(this, child, ...args);
							}
						} else {
							return old.call(this, child, ...args);
						}
					};
				},
			}),
		);
	}

	private patchBacklinkDom(dom: any) {
		const that = this;
		this.register(
			around(dom.constructor.prototype, {
				addResult(old: any) {
					return function (...args: any[]) {
						const result = old.call(this, ...args);
						console.log(`[main.tsx:105] result: `, result);
						try {
							that.patchBacklinkTitle(result);
						} catch (error) {
							console.error(
								"rror while patching Obsidian internals: ",
								error,
							);
						}
						return result;
					};
				},
				emptyResults(old: any) {
					return function (...args: any[]) {
						return old.call(this, ...args);
					};
				},
			}),
		);
	}

	private patchBacklinkTitle(item: any): void {
		const titleEl = item.el.firstChild.find(".tree-item-inner");

		if (this.settings.hierarchyForBacklinks) {
			titleEl.textContent = item.file.path.split(".")[0];
		} else {
			titleEl.textContent = item.file.basename;
		}
	}

	async refresh() {
		this.setTabTitle();
		await this.setBacklinkTitle();
		this.activateHierarchyView();
	}

	private resetChildrenCache() {
		this.childrenCache = {};
	}

	private async activateHierarchyView(file?: TFile | null) {
		const CONTAINER_CLASS = "hierarchy-container";
		const markdownLeaves = this.app.workspace.getLeavesOfType("markdown");
		markdownLeaves.forEach((leaf) => {
			if (!(leaf.view instanceof MarkdownView)) return;
			if (!leaf.view.file) return;
			if (file && leaf.view.file.path !== file.path) return;

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
			const hierarchies = this.getHierarchies(currentPathName);
			const children = this.getChildren(currentPathName);

			const count = hierarchies.length + children.length;

			root.render(
				<Hierarchy
					hierarchies={hierarchies}
					children={children}
					count={count}
				></Hierarchy>,
			);
		});
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
				if (pathName.includes("/attachments/")) return false;
				if (pathName.startsWith("attachments/")) return false;
				return isSubdirectory(currentPathName, pathName);
			})
			.map((file) => {
				const pathName = this.getCleanPathName(file);
				return pathName;
			});
		this.childrenCache[currentPathName] = children;
		return children;
	}

	private getHierarchies(pathName: string) {
		const dirs = pathName.split("/");

		const computePath = (hierarchies: string[]) => {
			return hierarchies.reduce((acc, curr, index) => {
				return index === 0 ? curr : `${acc}/${curr}`;
			}, "");
		};
		return pathName
			.split("/")
			.map((_, index) => {
				if (index === dirs.length - 1) {
					return null;
				}
				const path = computePath(dirs.slice(0, index + 1));
				return path;
			})
			.filter((path) => path !== null) as string[];
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
		this.settings.hierarchyForEditors = false;

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

	private async setBacklinkTitle({
		file,
		loopCount = 0,
	}: {
		file?: TFile | null;
		loopCount?: number;
	} = {}) {
		// const markdownLeaves = this.app.workspace.getLeavesOfType("markdown");
		// markdownLeaves.forEach(async (leaf) => {
		// 	if (!(leaf.view instanceof MarkdownView)) return;
		// 	if (!leaf.view.file) return;
		// 	if (file && leaf.view.file.path !== file.path) return;
		//
		// 	const backlinks = leaf.view.backlinks;
		// 	if (!isBacklinks(backlinks)) return;
		//
		// 	const sleep = (msec: number) => {
		// 		return new Promise((resolve) => setTimeout(resolve, msec));
		// 	};
		//
		// 	const renderTitleOfLinkedMentions = () => {
		// 		for (const child of backlinks.backlinkDom.vChildren.children) {
		// 			const titleEl =
		// 				child.el.firstChild.find(".tree-item-inner");
		// 			if (titleEl) {
		// 				if (this.settings.hierarchyForBacklinks) {
		// 					titleEl.textContent = child.file.path.split(".")[0];
		// 				} else {
		// 					titleEl.textContent = child.file.basename;
		// 				}
		// 			}
		// 		}
		// 	};
		//
		// 	const renderTitleOfUnlinkedMentions = () => {
		// 		for (const child of backlinks.unlinkedDom.vChildren.children) {
		// 			const titleEl =
		// 				child.el.firstChild.find(".tree-item-inner");
		// 			if (titleEl) {
		// 				if (this.settings.hierarchyForBacklinks) {
		// 					titleEl.textContent = child.file.path.split(".")[0];
		// 				} else {
		// 					titleEl.textContent = child.file.basename;
		// 				}
		// 			}
		// 		}
		// 	};
		//
		// 	renderTitleOfLinkedMentions();
		// 	renderTitleOfUnlinkedMentions();
		//
		// 	const currentFile = this.app.workspace.getActiveFile();
		// 	if (!currentFile) return;
		// 	const backlinkCountFromCache = this.app.metadataCache
		// 		.getBacklinksForFile(currentFile)
		// 		.count();
		// 	const backlinkCountCalulated =
		// 		backlinks.backlinkDom.vChildren.children.reduce(
		// 			(acc, child) => {
		// 				return (
		// 					acc +
		// 					child.result.content.length +
		// 					child.result.properties.length
		// 				);
		// 			},
		// 			0,
		// 		);
		//
		// 	if (backlinkCountCalulated < backlinkCountFromCache) {
		// 		if (loopCount < 50) {
		// 			await sleep(250);
		// 			await this.setBacklinkTitle({
		// 				file,
		// 				loopCount: loopCount + 1,
		// 			});
		// 		}
		// 	}
		// });
	}
}
