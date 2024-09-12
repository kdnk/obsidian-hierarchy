import { App, MarkdownView, Plugin, PluginManifest } from "obsidian";

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

	async setPaneTitles() {
		await Promise.all(
			this.app.workspace.getLeavesOfType("markdown").map(async (leaf) => {
				if (!(leaf.view instanceof MarkdownView)) return;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const backlinks = leaf.view.backlinks as any;

				backlinks.recomputeBacklink(backlinks.file);

				const sleep = (msec: number) => {
					return new Promise((resolve) => setTimeout(resolve, msec));
				};
				for (let x = 0; x < 20; x++) {
					if (backlinks.backlinkQueue.runnable.running) {
						await sleep(100);
					} else {
						break;
					}
				}
				await sleep(7000);

				for (const child of backlinks.backlinkDom.vChildren.children) {
					const titleEl =
						child.el.firstChild.find(".tree-item-inner");
					if (titleEl) {
						titleEl.textContent = child.file.path.split(".")[0];
					}
				}
			}),
		);
	}
}
