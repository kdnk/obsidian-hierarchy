import { App, PaneType, TFile } from "obsidian";

export type HierarchyEntry = {
	/** Vault-relative file path, including .md; never shortened for display. */
	path: string;
	title: string;
};

export async function openHierarchyEntry(
	app: App,
	entry: HierarchyEntry,
	newLeaf: PaneType | boolean,
): Promise<void> {
	const existing = app.vault.getAbstractFileByPath(entry.path);
	if (existing && !(existing instanceof TFile)) {
		throw new Error(`A folder already exists at ${entry.path}`);
	}
	// Missing ancestors retain the original create-on-click behavior. Their
	// containing folders already exist as part of the current note's path.
	const file = existing ?? await app.vault.create(entry.path, "");
	await app.workspace.getLeaf(newLeaf).openFile(file);
}
