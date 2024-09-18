import * as React from "react";

export const Hierarchy = (props: {
	hierarchies: string[];
	children: string[];
}) => {
	const [isExpanded, setIsExpanded] = React.useState(true);

	return props.hierarchies.length > 0 ? (
		<div className="hierarchy-wrapper">
			<div className="nav-header"></div>
			<div
				className={`hierarchy-title-outer ${isExpanded ? "hierarchy-expanded" : "hierarchy-collapsed"}`}
			>
				<div
					className={`hierarchy-title`}
					onClick={() => setIsExpanded((val) => !val)}
				>
					Hierarchy
				</div>
			</div>
			<div
				className={`hierarchy-link-list ${isExpanded ? "hierarchy-list-expanded" : "hierarchy-list-collapsed"}`}
			>
				{props.hierarchies.reduce((path, prop, index) => {
					const newPath = index === 0 ? prop : `${path}/${prop}`;

					if (index < props.hierarchies.length - 1) {
						return newPath; // Update path and continue
					}

					return path; // Final path, do not modify further
				}, "")}
				{props.children.map((childPath) => (
					<HierarchyItem path={childPath} />
				))}
			</div>
		</div>
	) : (
		<></>
	);
};

const HierarchyItem = (props: { path: string }) => {
	return (
		<div key={props.path}>
			[[
			<span className="cm-hmd-internal-link cm-list-1">
				<a href={`obsidian://new?file=${props.path}.md&append=true`}>
					{props.path}
				</a>
			</span>
			]]
		</div>
	);
};
