export const Hierarchy = (props: { hierarchies: string[] }) => {
	let basePath = "";
	return props.hierarchies.length > 0 ? (
		<div
			style={{
				marginBottom: 16,
				borderTop: "1px solid var(--background-modifier-border)",
			}}
		>
			<div className="nav-header"></div>
			<div
				style={{
					padding: "var(--nav-item-padding)",
					paddingInlineStart: "var(--size-4-2)",
				}}
			>
				<div className="tree-item-inner">Hierarchy</div>
			</div>
			<div
				style={{
					paddingInlineStart: "var(--size-4-2)",
				}}
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
