import { TFile } from "obsidian";

export type ActiveTabGroup = {
	tabHeaderEls: HTMLElement[];
	children: { view: { file: TFile } }[];
};
