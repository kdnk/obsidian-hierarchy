export const roots = [];

// Only the DOM host is replaced; JSX and the UI component use real React.
export function createRoot(container) {
	const root = {
		container,
		renders: 0,
		unmounts: 0,
		render(element) { this.element = element; this.renders++; },
		unmount() { this.unmounts++; },
	};
	roots.push(root);
	return root;
}
