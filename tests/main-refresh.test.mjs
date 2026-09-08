import assert from "node:assert/strict";
import { test } from "node:test";
import HierarchyPlugin from "../src/main.tsx";

function createPane() {
	const title = { textContent: "Note" };
	const file = { path: "pages/Topic/Note.md", basename: "Note" };
	const item = { file, el: { querySelector: () => title } };
	class Renderer {
		resultDomLookup = new Map([[file, item]]);
		addResult(item) { return item; }
	}
	return { title, leaf: { view: { backlinkDom: new Renderer() } } };
}

async function install(t, leaves) {
	const handlers = new Map();
	let layoutReady;
	const app = {
		workspace: {
			getLeavesOfType: (type) => type === "backlink" ? leaves : [],
			onLayoutReady: (callback) => { layoutReady = callback; },
			on: (name, callback) => handlers.set(name, callback),
		},
		vault: { on() {} },
		metadataCache: { on() {} },
	};
	const plugin = new HierarchyPlugin(app, {});
	plugin.loadData = async () => null;
	plugin.addSettingTab = () => {};
	plugin.registerEvent = () => {};
	plugin.onload();
	await new Promise(setImmediate);
	t.after(() => { plugin.onunload(); plugin.unload(); });
	return { plugin, handlers, ready: () => layoutReady() };
}

test("plugin refresh immediately applies backlink setting changes to existing panes", async (t) => {
	const { title, leaf } = createPane();
	const { plugin, ready } = await install(t, [leaf]);
	ready();
	assert.equal(title.textContent, "pages/Topic/Note");
	plugin.settings.hierarchyForBacklinks = false;
	plugin.refresh();
	assert.equal(title.textContent, "Note");
	plugin.settings.hierarchyForBacklinks = true;
	plugin.refresh();
	assert.equal(title.textContent, "pages/Topic/Note");
});

test("layout-ready and layout-change refresh panes created after plugin load", async (t) => {
	const leaves = [];
	const { ready, handlers } = await install(t, leaves);
	const first = createPane();
	leaves.push(first.leaf);
	ready();
	assert.equal(first.title.textContent, "pages/Topic/Note");
	const second = createPane();
	leaves.push(second.leaf);
	handlers.get("layout-change")();
	assert.equal(second.title.textContent, "pages/Topic/Note");
});
