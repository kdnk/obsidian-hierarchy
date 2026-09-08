import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { around } from "monkey-around";
import { Component, Notice } from "obsidian";
import { patchBacklinks } from "../src/backlinks/patch-backlinks.ts";

beforeEach(() => {
	Notice.messages.length = 0;
});

function install(t, leaves = []) {
	const plugin = new Component();
	plugin.settings = { hierarchyForBacklinks: true };
	plugin.app = {
		workspace: {
			getLeavesOfType: (type) => leaves.filter((leaf) => leaf.type === type),
		},
	};
	plugin.refreshBacklinks = patchBacklinks(plugin);
	t.after(() => plugin.unload());
	return plugin;
}

function createRenderer() {
	// Each test gets its own prototype, as independent renderer classes do.
	return class BacklinkDom {
		resultDomLookup = new Map();

		addResult(item) {
			this.resultDomLookup.set(item?.file, item);
			return item;
		}
		emptyResults() {}
	};
}

function createLeaf(dom, type = "markdown") {
	return { type, view: { _children: [{ backlinkDom: dom }] } };
}

function createItem() {
	const writes = [];
	const title = {
		get textContent() {
			return writes.at(-1) ?? "Note";
		},
		set textContent(value) {
			writes.push(value);
		},
	};
	return {
		item: {
			file: { path: "pages/Topic/Note.md", basename: "Note" },
			el: {
				firstChild: { find: () => title },
				querySelector: (selector) => selector === ".tree-item-inner" ? title : null,
			},
		},
		title,
		writes,
	};
}

test("formats titles using the current setting and preserves the render result", (t) => {
	const plugin = install(t);
	const Renderer = createRenderer();
	const dom = new Renderer();
	plugin.addChild({ backlinkDom: dom });
	const { item, title } = createItem();
	assert.equal(dom.addResult(item), item);
	assert.equal(title.textContent, "pages/Topic/Note");
	plugin.settings.hierarchyForBacklinks = false;
	dom.addResult(item);
	assert.equal(title.textContent, "Note");
});

test("preserves dots in backlink folders and names while removing only the final extension", (t) => {
	const plugin = install(t);
	const Renderer = createRenderer();
	const dom = new Renderer();
	plugin.addChild({ backlinkDom: dom });
	for (const [path, expected] of [
		["notes/Topic.v1/A.md", "notes/Topic.v1/A"],
		["notes/Report.v2.md", "notes/Report.v2"],
		["notes/archive.md/Note.md", "notes/archive.md/Note"],
	]) {
		const { item, title } = createItem();
		item.file.path = path;
		dom.addResult(item);
		assert.equal(title.textContent, expected);
	}
});

test("refreshes displayed titles immediately when the backlink setting changes", (t) => {
	const Renderer = createRenderer();
	const dom = new Renderer();
	const plugin = install(t, [createLeaf(dom)]);
	plugin.addChild({ backlinkDom: dom });
	const { item, title } = createItem();
	dom.addResult(item);
	plugin.settings.hierarchyForBacklinks = false;
	plugin.refreshBacklinks?.();
	assert.equal(title.textContent, "Note");
	plugin.settings.hierarchyForBacklinks = true;
	plugin.refreshBacklinks?.();
	assert.equal(title.textContent, "pages/Topic/Note");
});

test("updates titles that were rendered before the plugin was enabled", (t) => {
	for (const type of ["markdown", "backlink"]) {
		const Renderer = createRenderer();
		const dom = new Renderer();
		const { item, title } = createItem();
		dom.addResult(item);
		install(t, [createLeaf(dom, type)]);
		assert.equal(title.textContent, "pages/Topic/Note");
	}
});

test("refreshes and restores unlinked mentions that share the backlink renderer", (t) => {
	const Renderer = createRenderer();
	const dom = new Renderer();
	const unlinkedDom = new Renderer();
	const leaf = createLeaf(dom);
	leaf.view._children[0].unlinkedDom = unlinkedDom;
	const plugin = install(t, [leaf]);
	plugin.addChild(leaf.view._children[0]);
	const { item, title } = createItem();
	unlinkedDom.addResult(item);
	assert.equal(title.textContent, "pages/Topic/Note");
	plugin.settings.hierarchyForBacklinks = false;
	plugin.refreshBacklinks();
	assert.equal(title.textContent, "Note");
	plugin.settings.hierarchyForBacklinks = true;
	plugin.refreshBacklinks();
	assert.equal(title.textContent, "pages/Topic/Note");
	plugin.unload();
	assert.equal(title.textContent, "Note");
});

test("unloading restores the existing title and makes stale refresh callbacks harmless", (t) => {
	const Renderer = createRenderer();
	const dom = new Renderer();
	const plugin = install(t, [createLeaf(dom)]);
	plugin.addChild({ backlinkDom: dom });
	const { item, title } = createItem();
	title.textContent = "Original display title";
	dom.addResult(item);
	plugin.unload();
	assert.equal(title.textContent, "Original display title");
	plugin.refreshBacklinks?.();
	assert.equal(title.textContent, "Original display title");
	patchBacklinks(plugin);
	assert.equal(title.textContent, "pages/Topic/Note");
	plugin.unload();
	assert.equal(title.textContent, "Original display title");
});

test("unloading preserves title changes made by another plugin after rendering", (t) => {
	const Renderer = createRenderer();
	const dom = new Renderer();
	const plugin = install(t, [createLeaf(dom)]);
	plugin.addChild({ backlinkDom: dom });
	const { item, title } = createItem();
	dom.addResult(item);
	title.textContent = "Another plugin's title";
	plugin.unload();
	assert.equal(title.textContent, "Another plugin's title");
});

test("refreshing does not touch results removed from the renderer", (t) => {
	const Renderer = createRenderer();
	const dom = new Renderer();
	const plugin = install(t, [createLeaf(dom)]);
	plugin.addChild({ backlinkDom: dom });
	const { item, writes } = createItem();
	dom.addResult(item);
	dom.resultDomLookup.clear();
	plugin.settings.hierarchyForBacklinks = false;
	plugin.refreshBacklinks?.();
	assert.deepEqual(writes, ["pages/Topic/Note"]);
});

test("writes a title only once when multiple panes share a renderer prototype", (t) => {
	const plugin = install(t);
	const Renderer = createRenderer();
	const first = new Renderer();
	const second = new Renderer();
	plugin.addChild({ backlinkDom: first });
	plugin.addChild({ backlinkDom: second });
	for (const dom of [first, second]) {
		const { item, writes } = createItem();
		dom.addResult(item);
		assert.deepEqual(writes, ["pages/Topic/Note"]);
	}
});

test("patches distinct renderer classes independently", (t) => {
	const plugin = install(t);
	for (const Renderer of [createRenderer(), createRenderer()]) {
		const dom = new Renderer();
		plugin.addChild({ backlinkDom: dom });
		const { item, title } = createItem();
		dom.addResult(item);
		assert.equal(title.textContent, "pages/Topic/Note");
	}
});

test("preserves component errors without loading the child twice", (t) => {
	const plugin = install(t);
	const Renderer = createRenderer();
	const failure = new Error("Child load failed");
	let loads = 0;
	const child = {
		backlinkDom: new Renderer(),
		load() {
			loads++;
			throw failure;
		},
	};
	assert.throws(() => plugin.addChild(child), (error) => error === failure);
	assert.equal(loads, 1);
	assert.deepEqual(Notice.messages, []);
});

test("ignores unsupported backlink shapes while still adding the child", (t) => {
	const plugin = install(t);
	for (const backlinkDom of [null, 42, {}, Object.create(null), { addResult: 42 }]) {
		const child = { backlinkDom };
		assert.equal(plugin.addChild(child), child);
		assert.ok(plugin.children.includes(child));
	}
	assert.deepEqual(Notice.messages, []);
});

test("leaves results with unsupported DOM or file shapes untouched", (t) => {
	const plugin = install(t);
	const Renderer = createRenderer();
	const dom = new Renderer();
	plugin.addChild({ backlinkDom: dom });
	const { item } = createItem();
	for (const result of [
		null,
		{},
		{ ...item, file: null },
		{ ...item, file: { path: 42, basename: "Note" } },
		{ ...item, el: null },
		{ ...item, el: { querySelector: () => null } },
	]) {
		assert.equal(dom.addResult(result), result);
	}
	assert.deepEqual(Notice.messages, []);
});

test("preserves errors from the original renderer", (t) => {
	const plugin = install(t);
	const failure = new Error("Render failed");
	class Renderer {
		addResult() {
			throw failure;
		}
	}
	const dom = new Renderer();
	plugin.addChild({ backlinkDom: dom });
	assert.throws(() => dom.addResult({}), (error) => error === failure);
	assert.deepEqual(Notice.messages, []);
});

test("contains title-update errors without discarding the original result", (t) => {
	const plugin = install(t);
	const Renderer = createRenderer();
	const dom = new Renderer();
	plugin.addChild({ backlinkDom: dom });
	const { item, title } = createItem();
	Object.defineProperty(title, "textContent", {
		set() { throw new Error("Title update failed"); },
	});
	assert.equal(dom.addResult(item), item);
	assert.equal(Notice.messages.length, 1);
});

test("unloading removes our patches while preserving another plugin's patch", (t) => {
	const plugin = install(t);
	const Renderer = createRenderer();
	const dom = new Renderer();
	plugin.addChild({ backlinkDom: dom });
	let otherCalls = 0;
	const removeOther = around(Renderer.prototype, {
		addResult: (old) => function (...args) {
			otherCalls++;
			return old.apply(this, args);
		},
	});
	t.after(removeOther);
	plugin.unload();
	const { item, writes } = createItem();
	assert.equal(dom.addResult(item), item);
	assert.equal(otherCalls, 1);
	assert.deepEqual(writes, []);
	plugin.addChild({ backlinkDom: dom });
	dom.addResult(item);
	assert.deepEqual(writes, []);
});

test("can patch the same renderer again after unloading and reloading", (t) => {
	const plugin = install(t);
	const Renderer = createRenderer();
	const dom = new Renderer();
	plugin.addChild({ backlinkDom: dom });
	plugin.unload();
	patchBacklinks(plugin);
	plugin.addChild({ backlinkDom: dom });
	const { item, writes } = createItem();
	dom.addResult(item);
	assert.deepEqual(writes, ["pages/Topic/Note"]);
});
