import * as React from "react";
export const Hierarchy = (props: { hierarchies: string[] }) => {
	let basePath = "";
	const [isExpanded, setIsExpanded] = React.useState(true);
	return props.hierarchies.length > 0 ? (
		<div
			style={{
				marginBottom: 16,
				borderTop: "1px solid var(--background-modifier-border)",
			}}
			className="hierarchy-wrapper"
		>
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
				{props.hierarchies.map((prop, index) => {
					basePath = index === 0 ? prop : `${basePath}/${prop}`;

					if (index === props.hierarchies.length - 1) {
						return null;
					}

					return (
						<div key={index}>
							[[
							<span className="cm-hmd-internal-link cm-list-1">
								<a
									href={`obsidian://new?file=${basePath}.md&append=true`}
								>
									{basePath}
								</a>
							</span>
							]]
						</div>
					);
				})}
			</div>
		</div>
	) : (
		<></>
	);
};
