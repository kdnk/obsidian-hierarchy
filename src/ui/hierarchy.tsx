import * as React from "react";
import { Keymap, PaneType } from "obsidian";
import type { HierarchyEntry } from "../hierarchy-view/hierarchy-entry";

type OpenEntry = (entry: HierarchyEntry, newLeaf: PaneType | boolean) => Promise<void>;

export const Hierarchy = (props: {
	hierarchies: HierarchyEntry[];
	children: HierarchyEntry[];
	count: number;
	vaultName: string;
	onOpen: OpenEntry;
	initialExpanded: boolean;
	onExpandedChange: (expanded: boolean) => void;
}) => {
	const [isExpanded, setIsExpanded] = React.useState(props.initialExpanded);

	return props.hierarchies.length + props.children.length > 0 ? (
		<div className="hierarchy-wrapper">
			<div className="nav-header"></div>
			<div
				className={`hierarchy-title-outer ${isExpanded ? "hierarchy-expanded" : "hierarchy-collapsed"}`}
				onClick={() => {
					const next = !isExpanded;
					setIsExpanded(next);
					props.onExpandedChange(next);
				}}
			>
				<div className="hierarchy-title">Hierarchy</div>
				<div className="hierarchy-count-outer">
					<div className="hierarchy-count">{props.count}</div>
				</div>
			</div>
			<div
				className={`hierarchy-list-outer ${isExpanded ? "hierarchy-expanded" : "hierarchy-collapsed"}`}
			>
				<div className="hierarchy-list">
					{props.hierarchies.map((entry) => {
						return (
							<HierarchyItem
								key={entry.path}
								entry={entry}
								vaultName={props.vaultName}
								onOpen={props.onOpen}
							></HierarchyItem>
						);
					})}
					{props.children.map((entry) => {
						return (
							<HierarchyItem
								key={entry.path}
								entry={entry}
								vaultName={props.vaultName}
								onOpen={props.onOpen}
							></HierarchyItem>
						);
					})}
				</div>
			</div>
		</div>
	) : (
		<></>
	);
};

const HierarchyItem = (props: { entry: HierarchyEntry; vaultName: string; onOpen: OpenEntry }) => {
	const open = (event: React.MouseEvent<HTMLAnchorElement>) => {
		event.preventDefault();
		event.stopPropagation();
		void props.onOpen(props.entry, Keymap.isModEvent(event.nativeEvent));
	};
	return (
		<div>
			<span className="cm-formatting cm-formatting-list cm-list-1">
				<span className="list-bullet">-</span>{" "}
			</span>
			<span className="cm-hmd-internal-link cm-list-1">
				<a
					href={`obsidian://open?vault=${encodeURIComponent(props.vaultName)}&file=${encodeURIComponent(props.entry.path)}`}
					onClick={open}
					onAuxClick={(event) => { if (event.button === 1) open(event); }}
				>
					{props.entry.title}
				</a>
			</span>
		</div>
	);
};
