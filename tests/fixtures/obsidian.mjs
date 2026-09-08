// Obsidian supplies these classes at runtime; its npm package only has types.
export class Component {
	children = [];
	callbacks = [];

	addChild(child) {
		this.children.push(child);
		child.load?.();
		return child;
	}

	register(callback) {
		this.callbacks.push(callback);
	}

	unload() {
		for (const callback of this.callbacks.splice(0).reverse()) callback();
	}
}

export class Notice {
	static messages = [];

	constructor(message) {
		Notice.messages.push(message);
	}
}

export class TFile {
	constructor(path) {
		this.path = path;
		this.basename = path.slice(0, -3).split("/").pop();
	}
}

export class FileView {}
export class MarkdownView extends FileView {}
export class Plugin extends Component {
	constructor(app) {
		super();
		this.app = app;
	}
}
export class PluginSettingTab {}
export class Setting {}
export const Platform = { isMobile: false };
export const Keymap = {
	isModEvent: (event) => !!(event?.metaKey || event?.ctrlKey || event?.button === 1),
};
