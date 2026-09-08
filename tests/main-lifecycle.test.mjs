import assert from "node:assert/strict";
import { test } from "node:test";
import { Notice } from "obsidian";
import { setupPlugin, settle } from "./fixtures/plugin.mjs";

function createPane() {
	const title = { textContent: "Note" };
	const file = { path: "notes/Topic/Note.md", basename: "Note" };
	const item = { file, el: { querySelector: () => title } };
	class Renderer {
		resultDomLookup = new Map([[file, item]]);
		addResult(item) { return item; }
	}
	return { title, leaf: { view: { backlinkDom: new Renderer() } } };
}

test("registers and cleans up refresh handlers when the layout is already ready", async (t) => {
	const leaves = [];
	const harness = setupPlugin(t, { backlinkLeaves: leaves, layoutReady: true });
	await harness.start();
	const { title, leaf } = createPane();
	leaves.push(leaf);
	harness.app.workspace.trigger("layout-change");
	assert.equal(title.textContent, "notes/Topic/Note");
	harness.stop();
	assert.equal(title.textContent, "Note");
	harness.plugin.settings.hierarchyForBacklinks = true;
	harness.app.workspace.trigger("layout-change");
	assert.equal(title.textContent, "Note");
	assert.equal(harness.app.workspace.listeners.size, 0);
});

test("can unload safely while settings are still loading", async (t) => {
	let resolveData;
	const harness = setupPlugin(t, { loadData: () => new Promise((resolve) => { resolveData = resolve; }) });
	await harness.start();
	assert.doesNotThrow(harness.stop);
	resolveData(null);
	await settle();
});

test("does not install settings or backlink patches after unloading during load", async (t) => {
	let resolveData;
	const { title, leaf } = createPane();
	const harness = setupPlugin(t, {
		backlinkLeaves: [leaf],
		loadData: () => new Promise((resolve) => { resolveData = resolve; }),
	});
	await harness.start();
	harness.stop();
	resolveData(null);
	await settle();
	harness.ready();
	assert.equal(title.textContent, "Note");
	assert.deepEqual(harness.settingsTabs, []);
});

test("ignores a pending layout-ready callback after unloading", async (t) => {
	const leaves = [];
	const harness = setupPlugin(t, { backlinkLeaves: leaves });
	await harness.start();
	harness.stop();
	harness.ready();
	const { title, leaf } = createPane();
	leaves.push(leaf);
	// A stale layout callback must not re-register handlers for future events.
	harness.plugin.settings.hierarchyForBacklinks = true;
	harness.app.workspace.trigger("layout-change");
	assert.equal(title.textContent, "Note");
	assert.equal(harness.app.workspace.listeners.size, 0);
});

test("can unload safely after a settings read fails", async (t) => {
	Notice.messages.length = 0;
	const harness = setupPlugin(t, { loadData: async () => { throw new Error("Read failed"); } });
	await harness.start();
	assert.ok(Notice.messages.some((message) => message.includes("Read failed")));
	assert.doesNotThrow(harness.stop);
});

test("an older settings read cannot overwrite a newer load after re-enabling", async (t) => {
	let resolveOldData;
	const { title, leaf } = createPane();
	const harness = setupPlugin(t, {
		backlinkLeaves: [leaf],
		loadData: () => new Promise((resolve) => { resolveOldData = resolve; }),
	});
	await harness.start();
	harness.stop();
	harness.plugin.loadData = async () => ({ hierarchyForBacklinks: false });
	await harness.start();
	harness.ready();
	resolveOldData({ hierarchyForBacklinks: true });
	await settle();
	harness.plugin.refresh();
	assert.equal(title.textContent, "Note");
	assert.equal(harness.plugin.settings.hierarchyForBacklinks, false);
	assert.equal(harness.settingsTabs.length, 1);
});

test("does not report a late settings error after unloading", async (t) => {
	let rejectData;
	Notice.messages.length = 0;
	const harness = setupPlugin(t, {
		loadData: () => new Promise((resolve, reject) => { rejectData = reject; }),
	});
	await harness.start();
	harness.stop();
	rejectData(new Error("Late read failure"));
	await settle();
	assert.deepEqual(Notice.messages, []);
});
