import React from "react";
import { useApp } from "./use-app";

export const Hierarchy = () => {
	const { vault } = useApp();

	return <h4>{vault.getName()}</h4>;
};
