export const Hierarchy = (props: { hierarchies: string[] }) => {
	// const { vault } = useApp();
	console.log("Hello");

	let basePath = "";
	return (
		props.hierarchies.length > 0 && (
			<div style={{ marginBottom: 16 }}>
				<h1>Hierarchy</h1>
				<div>
					{props.hierarchies.map((prop, index) => {
						basePath = index === 0 ? prop : `${basePath}/${prop}`;

						if (index === props.hierarchies.length - 1) {
							return null;
						}

						return (
							<div key={index}>
								<span className="cm-hmd-internal-link cm-list-1">
									<a
										href={`obsidian://new?file=${basePath}.md&append=true`}
									>
										{basePath}
									</a>
								</span>
							</div>
						);
					})}
				</div>
			</div>
		)
	);
};
