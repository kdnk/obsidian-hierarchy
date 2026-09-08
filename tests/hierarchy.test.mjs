import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownView, TFile } from "obsidian";
import { renderHierarchy } from "../src/hierarchy-view/render-hierarchy.tsx";
import { roots } from "./fixtures/react-root.mjs";

function setup(t, {
	path = "notes/Topic.md",
	paths = [path, "notes/Topic/Child.md"],
	folder = "notes",
	settings = {},
} = {}) {
	const files = new Map(paths.map((path) => [path, new TFile(path)]));
	const opened = [];
	const created = [];
	const errors = [];
	const parents = [];
	const view = Object.assign(new MarkdownView(), {
		file: files.get(path),
		containerEl: {
			querySelector: () => ({ after() {} }),
			querySelectorAll: () => [],
		},
	});
	const previousCreateDiv = global.createDiv;
	global.createDiv = () => ({});
	t.after(() => { global.createDiv = previousCreateDiv; });
	const plugin = {
		settings: {
			hierarchyForEditors: true,
			hierarchyUseObsidianFolder: true,
			hierarchyCleanPathPrefixes: [],
			hierarchyExcludePaths: [],
			...settings,
		},
		childrenCache: {},
		handleError: (message, error) => errors.push({ message, error }),
		app: {
			vault: {
				getName: () => "Review & notes",
				getMarkdownFiles: () => [...files.values()],
				getAbstractFileByPath: (path) => files.get(path) ?? null,
				async create(path, content) {
					assert.equal(files.has(path), false, "must never overwrite a file");
					created.push({ path, content });
					const file = new TFile(path);
					files.set(path, file);
					return file;
				},
			},
			fileManager: {
				getNewFileParent(sourcePath) {
					parents.push(sourcePath);
					return { path: folder };
				},
			},
			metadataCache: { getCachedFiles: () => [...files.keys()] },
			workspace: {
				getLeavesOfType: () => [{ view }],
				getLeaf: (newLeaf) => ({ openFile: async (file) => opened.push({ file, newLeaf }) }),
			},
		},
	};
	const render = () => {
		renderHierarchy(plugin);
		return roots.at(-1).element;
	};
	return { plugin, render, files, opened, created, errors, parents };
}

test("uses Obsidian's new-note folder for labels while preserving file paths", (t) => {
	const { render, parents } = setup(t);
	const { props } = render();
	assert.deepEqual(props.hierarchies, []);
	assert.deepEqual(props.children, [{ path: "notes/Topic/Child.md", title: "Topic/Child" }]);
	assert.deepEqual(parents, ["notes/Topic.md"]);
});

test("keeps the full hierarchy when Obsidian uses the vault root", (t) => {
	const { render } = setup(t, { folder: "/" });
	assert.deepEqual(render().props.hierarchies, [{ path: "notes.md", title: "notes" }]);
});

test("omits every ancestor above a nested new-note folder", (t) => {
	const { render } = setup(t, {
		path: "notes/personal/Topic/Child.md",
		paths: ["notes/personal/Topic/Child.md"],
		folder: "notes/personal",
	});
	assert.deepEqual(render().props.hierarchies, [{ path: "notes/personal/Topic.md", title: "Topic" }]);
});

test("retains ancestors for a file outside the configured new-note folder", (t) => {
	const { render } = setup(t, { folder: "notes/personal" });
	assert.deepEqual(render().props.hierarchies, [{ path: "notes.md", title: "notes" }]);
});

test("retains descendant folder notes whose path equals the omitted folder", (t) => {
	for (const settings of [
		{},
		{ hierarchyUseObsidianFolder: false, hierarchyCleanPathPrefixes: ["notes/personal/"] },
	]) {
		const { render } = setup(t, {
			path: "notes.md",
			paths: ["notes.md", "notes/personal.md", "notes/personal/Child.md"],
			folder: "notes/personal",
			settings,
		});
		assert.deepEqual(render().props.children, [
			{ path: "notes/personal.md", title: "notes/personal" },
			{ path: "notes/personal/Child.md", title: "Child" },
		]);
	}
});

test("honors custom prefixes when following Obsidian is disabled", (t) => {
	const { render, parents } = setup(t, {
		settings: { hierarchyUseObsidianFolder: false, hierarchyCleanPathPrefixes: ["notes/"] },
	});
	assert.deepEqual(render().props.children, [{ path: "notes/Topic/Child.md", title: "Topic/Child" }]);
	assert.deepEqual(parents, []);
});

test("never merges distinct folders that have identical shortened labels", (t) => {
	const { render } = setup(t, {
		paths: ["notes/Topic.md", "notes/Topic/Child.md", "archive/Topic/Other.md"],
		settings: { hierarchyUseObsidianFolder: false, hierarchyCleanPathPrefixes: ["notes/", "archive/"] },
	});
	assert.deepEqual(render().props.children, [{ path: "notes/Topic/Child.md", title: "Topic/Child" }]);
});

test("preserves dots and URI punctuation in labels and exact navigation targets", async (t) => {
	const target = "notes/Topic.v1/A&B#C%20.md";
	const { render, files, opened, created } = setup(t, {
		path: "notes/Topic.v1.md",
		paths: ["notes/Topic.v1.md", target],
	});
	const element = render();
	assert.deepEqual(element.props.children, [{ path: target, title: "Topic.v1/A&B#C%20" }]);
	const html = renderToStaticMarkup(element);
	const href = html.match(/href="([^"]+)"/)[1].replaceAll("&amp;", "&");
	assert.equal(new URL(href).searchParams.get("file"), target);
	assert.equal(new URL(href).searchParams.get("vault"), "Review & notes");
	await element.props.onOpen(element.props.children[0], "tab");
	assert.deepEqual(opened, [{ file: files.get(target), newLeaf: "tab" }]);
	assert.deepEqual(created, []);
});

test("opens the exact existing ancestor despite another file with the same name", async (t) => {
	const { render, files, opened, created } = setup(t, {
		path: "notes/Topic/Child.md",
		paths: ["notes/Topic/Child.md", "notes/Topic.md", "Topic.md"],
	});
	const { props } = render();
	assert.deepEqual(props.hierarchies, [{ path: "notes/Topic.md", title: "Topic" }]);
	await props.onOpen(props.hierarchies[0], false);
	assert.deepEqual(opened, [{ file: files.get("notes/Topic.md"), newLeaf: false }]);
	assert.deepEqual(created, []);
});

test("creates a missing ancestor at its real path only when clicked", async (t) => {
	const { render, files, opened, created } = setup(t, {
		path: "notes/Topic/Child.md",
		paths: ["notes/Topic/Child.md"],
	});
	const { props } = render();
	assert.deepEqual(created, []);
	assert.equal(typeof props.onOpen, "function");
	await props.onOpen(props.hierarchies[0], false);
	assert.deepEqual(created, [{ path: "notes/Topic.md", content: "" }]);
	assert.deepEqual(opened, [{ file: files.get("notes/Topic.md"), newLeaf: false }]);
});

test("recomputes labels and exclusions after settings change with a populated cache", (t) => {
	const { plugin, render } = setup(t);
	render();
	plugin.settings.hierarchyUseObsidianFolder = false;
	assert.deepEqual(render().props.children, [{ path: "notes/Topic/Child.md", title: "notes/Topic/Child" }]);
	plugin.settings.hierarchyExcludePaths = ["notes/Topic/Child"];
	assert.deepEqual(render().props.children, []);
});

test("reports navigation failures without creating a replacement note", async (t) => {
	const { plugin, render, errors, created } = setup(t);
	const failure = new Error("Cannot open file");
	plugin.app.workspace.getLeaf = () => ({ openFile: async () => { throw failure; } });
	const { props } = render();
	assert.equal(typeof props.onOpen, "function");
	await props.onOpen(props.children[0], false);
	assert.equal(errors[0].error, failure);
	assert.deepEqual(created, []);
});
