import { App, FileView, MarkdownView, Plugin, PluginManifest } from "obsidian";

export default class FullPathPlugin extends Plugin {
	constructor(app: App, pluginManifest: PluginManifest) {
		super(app, pluginManifest);
	}

	async onload() {
		this.registerEvent(
			this.app.workspace.on("file-open", async () => {
				await this.setPaneTitles();
			}),
		);

		this.app.workspace.onLayoutReady(async () => {
			await this.setPaneTitles();
		});
	}

	async setPaneTitles(loopCount = 0) {
		console.log(`[main.ts:21] loopCount: `, loopCount);
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
					await this.setPaneTitles(loopCount + 1);
				} else {
					renderFullPath();
				}
			} else {
				renderFullPath();
			}
		}
	}
}
