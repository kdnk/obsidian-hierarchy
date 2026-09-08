import assert from "node:assert/strict";
import { test } from "node:test";
import { MarkdownView, TFile } from "obsidian";
import { roots } from "./fixtures/react-root.mjs";
import { setupPlugin } from "./fixtures/plugin.mjs";

async function setup(t) {
	const paths = ["notes/Topic.md", "notes/Topic/Child.md"];
	const files = new Map(paths.map((path) => [path, new TFile(path)]));
	const containers = new Set();
	const previousCreateDiv = global.createDiv;
	global.createDiv = () => ({ remove() { containers.delete(this); } });
	t.after(() => { global.createDiv = previousCreateDiv; });
	const view = Object.assign(new MarkdownView(), {
		file: files.get("notes/Topic.md"),
		containerEl: {
			querySelector: () => ({ after: (container) => containers.add(container) }),
			contains: (container) => containers.has(container),
		},
	});
	const harness = setupPlugin(t, {
		markdownLeaves: [{ view }],
		vault: { getName: () => "Test", getMarkdownFiles: () => [...files.values()] },
	});
	await harness.start();
	harness.ready();
	const root = roots.at(-1);
	const children = () => root.element.props.children.map((entry) => entry.path);
	assert.deepEqual(children(), ["notes/Topic/Child.md"]);
	return { ...harness, files, root, children };
}

test("removes a deleted child from an open hierarchy without waiting for another event", async (t) => {
	const { app, files, children } = await setup(t);
	const child = files.get("notes/Topic/Child.md");
	files.delete(child.path);
	app.vault.trigger("delete", child);
	assert.deepEqual(children(), []);
});

test("updates renamed child destinations in open hierarchies", async (t) => {
	const { app, files, children } = await setup(t);
	const child = files.get("notes/Topic/Child.md");
	const oldPath = child.path;
	files.delete(oldPath);
	child.path = "notes/Topic/Renamed.md";
	files.set(child.path, child);
	app.vault.trigger("rename", child, oldPath);
	assert.deepEqual(children(), ["notes/Topic/Renamed.md"]);
});

test("shows newly created children without waiting for metadata resolution", async (t) => {
	const { app, files, children } = await setup(t);
	const child = new TFile("notes/Topic/New.md");
	files.set(child.path, child);
	app.vault.trigger("create", child);
	assert.deepEqual(children(), ["notes/Topic/Child.md", "notes/Topic/New.md"]);
});

for (const event of ["resolved", "layout-change"]) {
	test(`invalidates cached children before rendering on ${event}`, async (t) => {
		const { app, files, children } = await setup(t);
		files.delete("notes/Topic/Child.md");
		const events = event === "resolved" ? app.metadataCache : app.workspace;
		events.trigger(event);
		assert.deepEqual(children(), []);
	});
}
