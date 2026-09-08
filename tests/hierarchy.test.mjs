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
	const containers = [];
	const callbacks = [];
	const mainEl = { after(container) {
		if (!containers.includes(container)) containers.push(container);
	} };
	const view = Object.assign(new MarkdownView(), {
		file: files.get(path),
		containerEl: {
			querySelector: () => mainEl,
			querySelectorAll: () => [...containers],
			contains: (container) => containers.includes(container),
		},
	});
	const leaves = [{ view }];
	const previousCreateDiv = global.createDiv;
	global.createDiv = () => ({ remove() {
		const index = containers.indexOf(this);
		if (index >= 0) containers.splice(index, 1);
	} });
	t.after(() => { global.createDiv = previousCreateDiv; });
	const unload = () => { for (const callback of callbacks.splice(0).reverse()) callback(); };
	t.after(unload);
	const plugin = {
		settings: {
			hierarchyForEditors: true,
			hierarchyUseObsidianFolder: true,
			hierarchyCleanPathPrefixes: [],
			hierarchyExcludePaths: [],
			...settings,
		},
		childrenCache: {},
		register: (callback) => callbacks.push(callback),
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
				getLeavesOfType: () => leaves,
				getLeaf: (newLeaf) => ({ openFile: async (file) => opened.push({ file, newLeaf }) }),
			},
		},
	};
	const render = () => {
		renderHierarchy(plugin);
		return roots.at(-1).element;
	};
	return { plugin, render, files, opened, created, errors, parents, containers, leaves, view, unload };
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

test("excludes only the selected path and its descendants, including a trailing slash", (t) => {
	for (const exclude of ["Topic/Child", "Topic/Child/"]) {
		const { render } = setup(t, {
			paths: ["notes/Topic.md", "notes/Topic/Child.md", "notes/Topic/Child/Leaf.md", "notes/Topic/Childish.md"],
			settings: { hierarchyExcludePaths: [exclude] },
		});
		assert.deepEqual(render().props.children, [{ path: "notes/Topic/Childish.md", title: "Topic/Childish" }]);
	}
});

test("applies the same exclusion boundary to ancestor entries", (t) => {
	const { render } = setup(t, {
		path: "notes/Topic/Childish/Leaf.md",
		paths: ["notes/Topic/Childish/Leaf.md"],
		settings: { hierarchyExcludePaths: ["Topic/Child"] },
	});
	assert.deepEqual(render().props.hierarchies, [
		{ path: "notes/Topic.md", title: "Topic" },
		{ path: "notes/Topic/Childish.md", title: "Topic/Childish" },
	]);
});

test("supports vault-relative exclusions while labels are shortened", (t) => {
	const { render } = setup(t, { settings: { hierarchyExcludePaths: ["notes/Topic/Child"] } });
	assert.deepEqual(render().props.children, []);
});

test("a full Markdown file path excludes that note without excluding its child folder", (t) => {
	const { render } = setup(t, {
		paths: ["notes/Topic.md", "notes/Topic/Child.md", "notes/Topic/Child/Leaf.md"],
		settings: { hierarchyExcludePaths: ["notes/Topic/Child.md"] },
	});
	assert.deepEqual(render().props.children, [{ path: "notes/Topic/Child/Leaf.md", title: "Topic/Child/Leaf" }]);
});

test("retains the mounted UI across refreshes and settings changes", (t) => {
	const { render, plugin, containers } = setup(t);
	render();
	const firstRoot = roots.at(-1);
	plugin.settings.hierarchyExcludePaths = ["Topic/Child"];
	render();
	assert.equal(roots.at(-1), firstRoot);
	assert.equal(firstRoot.renders, 2);
	assert.equal(firstRoot.unmounts, 0);
	assert.deepEqual(containers, [firstRoot.container]);
});

test("unmounts the root before removing its container when hierarchy is disabled", (t) => {
	const { render, plugin, containers } = setup(t);
	render();
	const root = roots.at(-1);
	root.unmount = () => {
		assert.ok(containers.includes(root.container));
		root.unmounts++;
	};
	plugin.settings.hierarchyForEditors = false;
	renderHierarchy(plugin);
	assert.equal(root.unmounts, 1);
	assert.deepEqual(containers, []);
});

test("cleans up closed leaves and plugin unload without unmounting twice", (t) => {
	const { render, plugin, leaves, unload, containers } = setup(t);
	render();
	const root = roots.at(-1);
	leaves.length = 0;
	renderHierarchy(plugin);
	unload();
	assert.equal(root.unmounts, 1);
	assert.deepEqual(containers, []);
});

test("plugin unload cleans up mounted roots", (t) => {
	const { render, unload, containers } = setup(t);
	render();
	const root = roots.at(-1);
	unload();
	assert.equal(root.unmounts, 1);
	assert.deepEqual(containers, []);
});

test("cleans up after switching out of editor mode", (t) => {
	const { render, plugin, view, containers } = setup(t);
	render();
	const root = roots.at(-1);
	view.containerEl.querySelector = () => null;
	renderHierarchy(plugin);
	assert.equal(root.unmounts, 1);
	assert.deepEqual(containers, []);
});

test("replaces a detached container and unmounts its abandoned root", (t) => {
	const { render, containers } = setup(t);
	render();
	const root = roots.at(-1);
	containers.length = 0;
	render();
	assert.equal(root.unmounts, 1);
	assert.notEqual(roots.at(-1), root);
});

test("preserves expansion state if Obsidian replaces the editor DOM", (t) => {
	const { render, containers } = setup(t);
	const { props } = render();
	assert.equal(typeof props.onExpandedChange, "function");
	props.onExpandedChange(false);
	containers.length = 0;
	assert.equal(render().props.initialExpanded, false);
});
