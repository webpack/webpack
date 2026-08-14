import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs, styleText } from "node:util";
import { runSuites } from "./runner.mjs";

const benchmarkRoot = path.resolve(import.meta.dirname, "..");

/**
 * @param {string | undefined} source pattern source, if any
 * @returns {RegExp | undefined} compiled pattern
 */
const toRegExp = (source) =>
	typeof source === "string" ? new RegExp(source) : undefined;

/**
 * @param {string} source shard and shard count
 * @returns {number[]} parsed shard values
 */
const toShard = (source) =>
	source.split("/").map((item) => Number.parseInt(item, 10));

// strict mode (the default) rejects unknown flags, missing values and stray
// positionals for us, so the hand-rolled switch and `value()` helper are gone.
const { values } = parseArgs({
	options: {
		dir: { type: "string", default: "all" },
		filter: { type: "string" },
		"negative-filter": { type: "string" },
		shard: { type: "string" },
		smoke: { type: "boolean", default: false },
		list: { type: "boolean", default: false },
		"max-rme": { type: "string" }
	}
});

const filter = toRegExp(values.filter ?? process.env.FILTER);
const negativeFilter = toRegExp(
	values["negative-filter"] ?? process.env.NEGATIVE_FILTER
);
const smoke = values.smoke || typeof process.env.SMOKE !== "undefined";
const [shardIndex, shardCount] = toShard(
	values.shard ?? process.env.SHARD ?? "1/1"
);

// Warn about noisy wall-time results.
const maxRme = Number.parseFloat(
	values["max-rme"] ?? process.env.MAX_RME ?? "15"
);

/** @type {string[]} */
const found = [];
for await (const file of fs.glob(
	(values.dir === "all" ? ["unit", "e2e"] : [values.dir]).map(
		(name) => `${name}/**/*.bench.mjs`
	),
	{
		cwd: benchmarkRoot
	}
)) {
	found.push(file);
}

const files = found.sort().filter((_, i) => i % shardCount === shardIndex - 1);

const summary = await runSuites(
	files.map((file) => path.join(benchmarkRoot, file)),
	{ filter, negativeFilter, smoke, maxRme }
);

console.log(
	`\n${summary.results.length} benchmark(s) completed, ${summary.failures.length} failed`
);

if (summary.failures.length > 0) {
	for (const failure of summary.failures) {
		console.error(
			styleText("red", `FAILED: ${failure.id}: ${failure.error.message}`, {
				stream: process.stderr
			})
		);
	}
	process.exitCode = 1;
}
