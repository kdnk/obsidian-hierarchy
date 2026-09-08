import HierarchyPlugin from "../../src/main.tsx";

class Events {
	listeners = new Set();
	on(name, callback) {
		const ref = { e: this, name, callback };
		this.listeners.add(ref);
		return ref;
	}
	offref(ref) { this.listeners.delete(ref); }
	trigger(name, ...args) {
		for (const ref of [...this.listeners]) {
			if (ref.name === name) ref.callback(...args);
		}
	}
}

export const settle = () => new Promise(setImmediate);

export function setupPlugin(t, {
	markdownLeaves = [], backlinkLeaves = [], vault = {},
	loadData = async () => null, layoutReady = false,
} = {}) {
	const readyCallbacks = [];
	const settingsTabs = [];
	let running = false;
	const app = {
		workspace: Object.assign(new Events(), {
			getLeavesOfType: (type) => type === "markdown" ? markdownLeaves : type === "backlink" ? backlinkLeaves : [],
			onLayoutReady: (callback) => {
				if (layoutReady) callback();
				else readyCallbacks.push(callback);
			},
		}),
		vault: Object.assign(new Events(), vault),
		metadataCache: new Events(),
		fileManager: { getNewFileParent: () => ({ path: "notes" }) },
	};
	const plugin = new HierarchyPlugin(app, {});
	plugin.loadData = loadData;
	plugin.addSettingTab = (tab) => settingsTabs.push(tab);
	// Model Obsidian's event cleanup, retaining the plugin's real registration flow.
	plugin.registerEvent = (ref) => plugin.register(() => ref.e.offref(ref));
	const stop = () => {
		if (!running) return;
		running = false;
		// Obsidian releases registered resources before calling onunload.
		plugin.unload();
		plugin.onunload();
	};
	t.after(stop);
	return {
		plugin, app, settingsTabs, stop,
		async start() { running = true; plugin.onload(); await settle(); },
		ready() {
			layoutReady = true;
			for (const callback of readyCallbacks.splice(0)) callback();
		},
	};
}
