import { FileView, TFile } from "obsidian";

export type Backlinks = {
	file: FileView;
	backlinkDom: {
		vChildren: {
			children: {
				el: {
					firstChild: {
						find: (selector: string) => HTMLElement;
					};
				};
				file: TFile;
				result: {
					content: unknown[];
					properties: unknown[];
				};
			}[];
		};
	};
};

export const isBacklinks = (backlinks: unknown): backlinks is Backlinks => {
	if (typeof backlinks !== "object") return false;
	if (backlinks === null) return false;
	if (!("backlinkDom" in backlinks)) return false;
	if (!("file" in backlinks)) return false;
	if (!(typeof backlinks.backlinkDom === "object")) return false;
	if (backlinks.backlinkDom === null) return false;
	if (!("vChildren" in backlinks.backlinkDom)) return false;
	if (!(typeof backlinks.backlinkDom.vChildren === "object")) return false;
	if (backlinks.backlinkDom.vChildren === null) return false;
	if (!("children" in backlinks.backlinkDom.vChildren)) return false;
	return true;
};
