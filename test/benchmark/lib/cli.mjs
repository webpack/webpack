import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { runSuites } from "./runner.mjs";

// One libuv thread keeps fs completion order deterministic. It starts lazily,
// so setting it here is early enough; an explicit CI value wins.
process.env.UV_THREADPOOL_SIZE ??= "1";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const benchmarkRoot = path.resolve(__dirname, "..");

/**
 * @typedef {object} CliOptions
 * @property {"unit" | "e2e" | "all"} dir which benchmark tree to run
 * @property {RegExp=} filter only run benchmarks whose id matches
 * @property {RegExp=} negativeFilter skip benchmarks whose id matches
 * @property {[number, number]} shard 1-based shard index and shard count
 * @property {boolean} smoke run every benchmark once to validate, not measure
 * @property {boolean} list print benchmark files and exit
 * @property {string=} json write results as JSON to this path
 */

/**
 * @param {string[]} argv arguments after the script name
 * @returns {CliOptions} parsed options
 */
function parseArgs(argv) {
	/** @type {CliOptions} */
	const options = {
		dir: "all",
		filter:
			typeof process.env.FILTER !== "undefined"
				? new RegExp(process.env.FILTER)
				: undefined,
		negativeFilter:
			typeof process.env.NEGATIVE_FILTER !== "undefined"
				? new RegExp(process.env.NEGATIVE_FILTER)
				: undefined,
		shard: [1, 1],
		smoke: typeof process.env.SMOKE !== "undefined",
		list: false,
		json: undefined
	};

	/**
	 * @param {string} flag flag name
	 * @param {number} i index of the flag
	 * @returns {string} the flag's value
	 */
	const value = (flag, i) => {
		const next = argv[i + 1];
		if (typeof next === "undefined") {
			throw new Error(`Missing value for ${flag}`);
		}
		return next;
	};

	/**
	 * @param {string} raw raw shard value like "2/4"
	 * @returns {[number, number]} parsed shard
	 */
	const parseShard = (raw) => {
		const parts = raw.split("/").map((item) => Number.parseInt(item, 10));
		if (
			parts.length !== 2 ||
			Number.isNaN(parts[0]) ||
			Number.isNaN(parts[1]) ||
			parts[0] <= 0 ||
			parts[1] <= 0 ||
			parts[0] > parts[1]
		) {
			throw new Error(
				`Invalid shard "${raw}" - expected "<index>/<count>" with 1 <= index <= count`
			);
		}
		return [parts[0], parts[1]];
	};

	if (typeof process.env.SHARD !== "undefined") {
		options.shard = parseShard(process.env.SHARD);
	}

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		switch (arg) {
			case "--dir": {
				const dir = value(arg, i++);
				if (dir !== "unit" && dir !== "e2e" && dir !== "all") {
					throw new Error(`Invalid --dir "${dir}" - use unit, e2e or all`);
				}
				options.dir = dir;
				break;
			}
			case "--filter":
				options.filter = new RegExp(value(arg, i++));
				break;
			case "--negative-filter":
				options.negativeFilter = new RegExp(value(arg, i++));
				break;
			case "--shard":
				options.shard = parseShard(value(arg, i++));
				break;
			case "--smoke":
				options.smoke = true;
				break;
			case "--list":
				options.list = true;
				break;
			case "--json":
				options.json = value(arg, i++);
				break;
			case "--ci":
				// Accepted for CI parity with `yarn benchmark`; no behavior change.
				break;
			default:
				throw new Error(`Unknown argument "${arg}"`);
		}
	}

	return options;
}

/**
 * @param {string} dir directory to scan
 * @returns {Promise<string[]>} absolute paths of `*.bench.mjs` files
 */
async function findBenchFiles(dir) {
	/** @type {string[]} */
	const found = [];
	/** @type {import("fs").Dirent[]} */
	let entries;
	try {
		entries = await fs.readdir(dir, { withFileTypes: true });
	} catch (_err) {
		return found;
	}
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			// Generated fixtures can be huge; they never contain suites.
			if (entry.name === "generated" || entry.name === "node_modules") {
				continue;
			}
			found.push(...(await findBenchFiles(full)));
		} else if (entry.isFile() && entry.name.endsWith(".bench.mjs")) {
			found.push(full);
		}
	}
	return found;
}

const options = parseArgs(process.argv.slice(2));

const dirs =
	options.dir === "all"
		? ["unit", "e2e"]
		: [/** @type {string} */ (options.dir)];

/** @type {string[]} */
let files = [];
for (const dir of dirs) {
	files.push(...(await findBenchFiles(path.join(benchmarkRoot, dir))));
}
// Sort for a deterministic order, then shard round-robin so slow e2e suites
// spread across shards instead of clustering in the last one.
files.sort((a, b) => a.localeCompare(b));
const [shardIndex, shardCount] = options.shard;
if (shardCount > files.length) {
	throw new Error(
		`Shard count ${shardCount} is more than the number of benchmark files (${files.length})`
	);
}
files = files.filter((_, i) => i % shardCount === shardIndex - 1);

if (options.list) {
	for (const file of files) console.log(path.relative(benchmarkRoot, file));
} else {
	const summary = await runSuites(files, {
		filter: options.filter,
		negativeFilter: options.negativeFilter,
		smoke: options.smoke
	});

	if (options.json) {
		await fs.mkdir(path.dirname(path.resolve(options.json)), {
			recursive: true
		});
		await fs.writeFile(
			path.resolve(options.json),
			JSON.stringify(
				{
					node: process.version,
					platform: `${process.platform}-${process.arch}`,
					results: summary.results
				},
				null,
				2
			)
		);
		console.log(`\nResults written to ${options.json}`);
	}

	console.log(
		`\n${summary.results.length} benchmark(s) completed, ${summary.failures.length} failed`
	);

	if (summary.failures.length > 0) {
		for (const failure of summary.failures) {
			console.error(`FAILED: ${failure.id}`);
		}
		process.exitCode = 1;
	}
}
