import assert from "node:assert/strict";
import { test } from "node:test";
import { TFile } from "obsidian";
import { patchAllTabs } from "../src/tabs/patch-tabs.ts";

function getTabTitle(path, hierarchyForTabs) {
	const title = { textContent: "Original title" };
	const group = {
		tabHeaderEls: [{
			querySelector: (selector) => selector === ".workspace-tab-header-inner-title" ? title : null,
		}],
		children: [{ view: { file: new TFile(path) } }],
	};
	patchAllTabs({
		settings: { hierarchyForTabs },
		app: { workspace: { rootSplit: { children: [group] } } },
	});
	return title.textContent;
}

for (const { path, fullTitle, basename } of [
	{
		path: "docs.md/guide.md.backup.md",
		fullTitle: "docs.md/guide.md.backup",
		basename: "guide.md.backup",
	},
	{
		path: "docs.md/guide.md.backup.pdf",
		fullTitle: "docs.md/guide.md.backup.pdf",
		basename: "guide.md.backup.pdf",
	},
	{
		path: "notes/Topic.md",
		fullTitle: "notes/Topic",
		basename: "Topic",
	},
]) {
	test(`shows the full path with only the final Markdown extension removed: ${path}`, () => {
		assert.equal(getTabTitle(path, true), fullTitle);
	});

	test(`shows the basename with only the final Markdown extension removed when disabled: ${path}`, () => {
		assert.equal(getTabTitle(path, false), basename);
	});
}
