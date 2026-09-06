/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// The stages come from the `lint` script itself, so this cannot drift from it.
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");

const { scripts } = require("../package.json");

/**
 * Reads the stage names out of the `lint` script, which chains them with `&&`.
 * @returns {string[]} stage names, in the order `lint` runs them
 */
function stagesOfLint() {
	return scripts.lint
		.split("&&")
		.map((part) => part.trim().replace(/^yarn\s+/, ""))
		.filter(Boolean);
}

/**
 * Runs one stage, streaming its output, and reports how it went.
 * @param {string} stage stage name
 * @returns {{ stage: string, ok: boolean, ms: number }} result
 */
function runStage(stage) {
	const startedAt = Date.now();
	console.log(`\n=== ${stage} ===`);
	const cp = spawnSync("yarn", [stage], {
		cwd: root,
		stdio: "inherit",
		shell: true
	});
	return { stage, ok: cp.status === 0, ms: Date.now() - startedAt };
}

const results = stagesOfLint().map((stage) => runStage(stage));
const failed = results.filter((result) => !result.ok);

console.log("\n=== summary ===");
for (const { stage, ok, ms } of results) {
	console.log(`${ok ? "PASS" : "FAIL"}  ${stage} (${(ms / 1000).toFixed(1)}s)`);
}

if (failed.length > 0) {
	console.log(
		`\n${failed.length} stage(s) failed: ${failed.map((r) => r.stage).join(", ")}`
	);
	process.exitCode = 1;
}
