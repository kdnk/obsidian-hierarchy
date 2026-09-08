export const roots = [];

// Only the DOM host is replaced; JSX and the UI component use real React.
export function createRoot(container) {
	const root = {
		container,
		render(element) { this.element = element; },
	};
	roots.push(root);
	return root;
}
