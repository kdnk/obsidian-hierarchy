import * as React from "react";

export const Hierarchy = (props: {
	hierarchies: string[];
	children: string[];
	count: number;
}) => {
	const [isExpanded, setIsExpanded] = React.useState(true);

	return props.hierarchies.length + props.children.length > 0 ? (
		<div className="hierarchy-wrapper">
			<div className="nav-header"></div>
			<div
				className={`hierarchy-title-outer ${isExpanded ? "hierarchy-expanded" : "hierarchy-collapsed"}`}
				onClick={() => setIsExpanded((val) => !val)}
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
					{props.hierarchies.map((path) => {
						return (
							<HierarchyItem
								key={path}
								path={path}
							></HierarchyItem>
						);
					})}
					{props.children.map((childPath) => {
						return (
							<HierarchyItem
								key={childPath}
								path={childPath}
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

const HierarchyItem = (props: { path: string }) => {
	return (
		<div key={props.path}>
			<span className="cm-formatting cm-formatting-list cm-list-1">
				<span className="list-bullet">-</span>{" "}
			</span>
			<span className="cm-hmd-internal-link cm-list-1">
				<a href={`obsidian://new?file=${props.path}.md&append=true`}>
					{props.path}
				</a>
			</span>
		</div>
	);
};
