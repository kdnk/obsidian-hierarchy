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
