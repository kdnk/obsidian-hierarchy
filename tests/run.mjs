import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const projectDir = fileURLToPath(new URL("../", import.meta.url));
const outputDir = mkdtempSync(join(tmpdir(), "obsidian-hierarchy-tests-"));

try {
	const outfile = join(outputDir, "backlinks.test.cjs");
	await build({
		absWorkingDir: projectDir,
		entryPoints: ["tests/backlinks.test.mjs"],
		outfile,
		bundle: true,
		platform: "node",
		format: "cjs",
		target: "node18",
		alias: { obsidian: join(projectDir, "tests/fixtures/obsidian.mjs") },
	});
	const result = spawnSync(process.execPath, ["--test", outfile], {
		stdio: "inherit",
	});
	if (result.error) throw result.error;
	process.exitCode = result.status ?? 1;
} finally {
	rmSync(outputDir, { recursive: true, force: true });
}
