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
				{
					props.hierarchies.reduce(
						(acc, prop, index) => {
							const newPath =
								index === 0 ? prop : `${acc}/${prop}`;
							const items = [
								...acc.items,
								<HierarchyItem key={newPath} path={newPath} />,
							];
							return { path: newPath, items };
						},
						{ path: "", items: [] },
					).items
				}
				{props.children.map((childPath) => (
					<HierarchyItem key={childPath} path={childPath} />
				))}
			</div>
		</div>
	) : null;
};

const HierarchyItem = (props: { path: string }) => {
	return (
		<div>
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
