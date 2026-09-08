import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { around } from "monkey-around";
import { Component, Notice } from "obsidian";
import { patchBacklinks } from "../src/backlinks/patch-backlinks.ts";

beforeEach(() => {
	Notice.messages.length = 0;
});

function install(t) {
	const plugin = new Component();
	plugin.settings = { hierarchyForBacklinks: true };
	patchBacklinks(plugin);
	t.after(() => plugin.unload());
	return plugin;
}

function createRenderer() {
	// Each test gets its own prototype, as independent renderer classes do.
	return class BacklinkDom {
		addResult(item) {
			return item;
		}
		emptyResults() {}
	};
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
