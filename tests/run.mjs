import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const projectDir = fileURLToPath(new URL("../", import.meta.url));
const outputDir = mkdtempSync(join(tmpdir(), "obsidian-hierarchy-tests-"));

try {
	const testFiles = readdirSync(join(projectDir, "tests"))
		.filter((name) => name.endsWith(".test.mjs"));
	await build({
		absWorkingDir: projectDir,
		entryPoints: testFiles.map((name) => join("tests", name)),
		outdir: outputDir,
		outExtension: { ".js": ".cjs" },
		bundle: true,
		platform: "node",
		format: "cjs",
		target: "node18",
		alias: {
			obsidian: join(projectDir, "tests/fixtures/obsidian.mjs"),
			"react-dom/client": join(projectDir, "tests/fixtures/react-root.mjs"),
		},
	});
	const result = spawnSync(process.execPath, ["--test", ...testFiles.map(
		(name) => join(outputDir, name.replace(/\.mjs$/, ".cjs")),
	)], {
		stdio: "inherit",
	});
	if (result.error) throw result.error;
	process.exitCode = result.status ?? 1;
} finally {
	rmSync(outputDir, { recursive: true, force: true });
}
