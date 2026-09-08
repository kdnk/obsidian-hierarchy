import assert from "node:assert/strict";
import { test } from "node:test";
import HierarchyPlugin from "../src/main.tsx";

async function load(data) {
	const plugin = new HierarchyPlugin({}, {});
	plugin.loadData = async () => data;
	await plugin.loadSettings();
	return plugin.settings;
}

test("new installs follow Obsidian instead of hardcoding pages", async () => {
	const settings = await load(null);
	assert.equal(settings.hierarchyUseObsidianFolder, true);
	assert.deepEqual(settings.hierarchyCleanPathPrefixes, []);
});

test("migrates the legacy pages default to following Obsidian", async () => {
	const settings = await load({ hierarchyCleanPathPrefixes: ["pages/"] });
	assert.equal(settings.hierarchyUseObsidianFolder, true);
});

test("preserves custom prefixes and explicit disabling of shortening on upgrade", async () => {
	for (const prefixes of [["blog/", "archive/"], []]) {
		const settings = await load({ hierarchyCleanPathPrefixes: prefixes });
		assert.equal(settings.hierarchyUseObsidianFolder, false);
		assert.deepEqual(settings.hierarchyCleanPathPrefixes, prefixes);
	}
});

test("preserves an explicit choice to follow or ignore Obsidian", async () => {
	for (const follow of [true, false]) {
		const settings = await load({ hierarchyUseObsidianFolder: follow, hierarchyCleanPathPrefixes: ["pages/"] });
		assert.equal(settings.hierarchyUseObsidianFolder, follow);
	}
});
