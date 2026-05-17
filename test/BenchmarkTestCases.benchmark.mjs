import fs from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { withCodSpeed } from "@codspeed/tinybench-plugin";
import { Bench, hrtimeNow } from "tinybench";
import webpack from "../lib/index.js";
import benchmarkManifest from "./benchmarkCases/manifest.mjs";

/** @typedef {import("..").Configuration} Configuration */
/** @typedef {import("..").Stats} Stats */
/** @typedef {import("..").Watching} Watching */
/** @typedef {import("tinybench").FnOptions} FnOptions */

/** @typedef {"dev-cold" | "prod-cold" | "dev-rebuild" | "filesystem-cache-warm"} ScenarioName */
/** @typedef {Record<string, ScenarioName[]>} BenchmarkManifest */
/** @typedef {{ index: number, total: number }} Shard */
/**
 * @typedef {object} Scenario
 * @property {ScenarioName} name scenario name
 * @property {"development" | "production"} mode webpack mode
 * @property {boolean=} watch whether this scenario measures watch rebuilds
 * @property {boolean=} cleanOutput whether to clean output before each measured compile
 * @property {boolean=} warmFilesystemCache whether to pre-populate filesystem cache before measuring
 */
/** @typedef {{ name: string, scenarios: ScenarioName[] }} SelectedCase */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const casesPath = path.join(__dirname, "benchmarkCases");
const baseOutputPath = path.join(__dirname, "js", "benchmark");

/** @type {Record<ScenarioName, Scenario>} */
const SCENARIOS = {
	"dev-cold": {
		name: "dev-cold",
		mode: "development",
		cleanOutput: true
	},
	"prod-cold": {
		name: "prod-cold",
		mode: "production",
		cleanOutput: true
	},
	"dev-rebuild": {
		name: "dev-rebuild",
		mode: "development",
		watch: true
	},
	"filesystem-cache-warm": {
		name: "filesystem-cache-warm",
		mode: "development",
		warmFilesystemCache: true
	}
};

/**
 * @param {string[]} argv argv
 * @returns {{
 * filter?: RegExp,
 * negativeFilter?: RegExp,
 * iterations: number,
 * list: boolean,
 * shard: Shard,
 * }} parsed options
 */
function parseArgs(argv) {
	/** @type {Record<string, string | boolean | undefined>} */
	const raw = {
		filter: process.env.FILTER,
		negativeFilter: process.env.NEGATIVE_FILTER,
		iterations: process.env.ITERATIONS || "3",
		shard: process.env.SHARD || "1/1",
		list: false
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (!arg.startsWith("--")) {
			throw new Error(`Unexpected benchmark argument: ${arg}`);
		}
		const [flag, inlineValue] = arg.slice(2).split("=", 2);
		const readValue = () => {
			if (typeof inlineValue !== "undefined") return inlineValue;
			const value = argv[++i];
			if (!value || value.startsWith("--")) {
				throw new Error(`Missing value for --${flag}`);
			}
			return value;
		};

		switch (flag) {
			case "filter":
				raw.filter = readValue();
				break;
			case "negative-filter":
				raw.negativeFilter = readValue();
				break;
			case "iterations":
				raw.iterations = readValue();
				break;
			case "shard":
				raw.shard = readValue();
				break;
			case "list":
				raw.list = true;
				break;
			case "ci":
				raw.ci = true;
				break;
			default:
				throw new Error(`Unknown benchmark argument: --${flag}`);
		}
	}

	const iterations = Number.parseInt(String(raw.iterations), 10);
	if (!Number.isInteger(iterations) || iterations <= 0) {
		throw new Error(
			`Invalid --iterations value "${raw.iterations}". Expected a positive integer.`
		);
	}

	return {
		filter:
			typeof raw.filter === "string" && raw.filter
				? new RegExp(raw.filter)
				: undefined,
		negativeFilter:
			typeof raw.negativeFilter === "string" && raw.negativeFilter
				? new RegExp(raw.negativeFilter)
				: undefined,
		iterations,
		list: Boolean(raw.list),
		shard: parseShard(String(raw.shard))
	};
}

/**
 * @param {string} value shard value
 * @returns {Shard} parsed shard
 */
function parseShard(value) {
	const match = /^(\d+)\/(\d+)$/.exec(value);
	if (!match) {
		throw new Error(
			`Invalid --shard value "${value}". Expected "<index>/<total>".`
		);
	}

	const index = Number.parseInt(match[1], 10);
	const total = Number.parseInt(match[2], 10);
	if (index <= 0 || total <= 0 || index > total) {
		throw new Error(
			`Invalid --shard value "${value}". Expected 1 <= index <= total.`
		);
	}

	return { index, total };
}

/**
 * @param {BenchmarkManifest} manifest benchmark manifest
 * @param {{
 * filter?: RegExp,
 * negativeFilter?: RegExp,
 * }} options options
 * @returns {SelectedCase[]} selected cases
 */
function selectCases(manifest, { filter, negativeFilter }) {
	return Object.entries(manifest)
		.filter(([name]) => (filter ? filter.test(name) : true))
		.filter(([name]) => (negativeFilter ? !negativeFilter.test(name) : true))
		.map(([name, scenarios]) => ({
			name,
			scenarios: [...scenarios]
		}));
}

/**
 * @param {SelectedCase[]} selected selected cases
 * @param {Shard} shard shard
 * @returns {SelectedCase[]} sharded cases
 */
function selectShard(selected, shard) {
	if (shard.total === 1) return selected;
	return selected.filter((_, index) => index % shard.total === shard.index - 1);
}

/**
 * @param {SelectedCase[]} selected selected cases
 * @returns {{ caseName: string, scenario: string }[]} task summaries
 */
function getTaskSummaries(selected) {
	return selected.flatMap(({ name, scenarios }) =>
		scenarios.map((scenario) => ({
			caseName: name,
			scenario
		}))
	);
}

/**
 * @param {string} request request
 * @returns {string} request with platform separators normalized
 */
function normalizeRequest(request) {
	return request.split(path.sep).join("/");
}

/**
 * @param {string} request request
 * @returns {string} relative request
 */
function ensureRelativeRequest(request) {
	const normalized = normalizeRequest(request);
	return normalized.startsWith(".") ? normalized : `./${normalized}`;
}

/**
 * @param {Configuration} config webpack config
 * @param {string} testDirectory test directory
 * @returns {string | undefined} resolved entry
 */
function resolveEntry(config, testDirectory) {
	if (typeof config.entry !== "string") return undefined;
	const entry = config.entry || "./index.js";
	return path.resolve(
		testDirectory,
		/\.(?:c|m)?js$/.test(entry) ? entry : `${entry}.js`
	);
}

/**
 * @param {Stats | undefined} stats stats
 * @returns {void}
 */
function assertValidStats(stats) {
	if (!stats) {
		throw new Error("No stats returned from webpack");
	}

	if (stats.hasWarnings() || stats.hasErrors()) {
		throw new Error(stats.toString());
	}

	// Force stats construction to keep the benchmark close to real projects.
	stats.toString();
}

/**
 * @param {{ close: (callback: (err?: Error | null) => void) => void }} compiler compiler
 * @returns {Promise<void>} close promise
 */
function closeCompiler(compiler) {
	return new Promise((resolve, reject) => {
		compiler.close((err) => {
			if (err) return reject(err);
			resolve();
		});
	});
}

/**
 * @param {Configuration} config webpack configuration
 * @returns {Promise<void>} run promise
 */
async function runWebpack(config) {
	const compiler = webpack(/** @type {EXPECTED_ANY} */ (config));
	try {
		const stats = await new Promise((resolve, reject) => {
			compiler.run((err, stats) => {
				if (err) return reject(err);
				resolve(stats);
			});
		});
		assertValidStats(/** @type {Stats | undefined} */ (stats));
	} finally {
		await closeCompiler(compiler);
	}
}

/**
 * @param {Configuration} config webpack configuration
 * @param {(err: Error | null, stats?: Stats) => void} callback callback
 * @returns {Watching} watching
 */
function runWatch(config, callback) {
	const compiler = webpack(/** @type {EXPECTED_ANY} */ (config));
	return /** @type {Watching} */ (
		/** @type {unknown} */ (
			compiler.watch({}, /** @type {EXPECTED_ANY} */ (callback))
		)
	);
}

/**
 * @param {Watching} watching watching
 * @returns {Promise<void>} close promise
 */
function closeWatching(watching) {
	return new Promise((resolve, reject) => {
		watching.close((err) => {
			if (err) return reject(err);
			resolve();
		});
	});
}

/**
 * @returns {{
 * callback: (err: Error | null, stats?: Stats) => void,
 * wait: () => Promise<void>,
 * }} build waiter
 */
function createBuildWaiter() {
	/** @type {{ resolve: () => void, reject: (err: Error) => void } | undefined} */
	let pending;

	return {
		callback(err, stats) {
			if (!pending) return;
			const current = pending;
			pending = undefined;

			if (err) {
				current.reject(err);
				return;
			}

			try {
				assertValidStats(stats);
				current.resolve();
			} catch (statsErr) {
				current.reject(/** @type {Error} */ (statsErr));
			}
		},
		wait() {
			if (pending) {
				throw new Error("A watch rebuild is already pending");
			}
			return new Promise((resolve, reject) => {
				pending = { resolve, reject };
			});
		}
	};
}

/**
 * @param {string} wrapperEntry wrapper entry path
 * @param {string} originalEntry original entry path
 * @param {number} iteration iteration
 * @returns {Promise<void>}
 */
async function writeBenchmarkEntry(wrapperEntry, originalEntry, iteration) {
	const request = ensureRelativeRequest(
		path.relative(path.dirname(wrapperEntry), originalEntry)
	);
	await fs.mkdir(path.dirname(wrapperEntry), { recursive: true });
	await fs.writeFile(
		wrapperEntry,
		`import ${JSON.stringify(request)};\nexport const __webpackBenchmarkIteration = ${iteration};\n`,
		"utf8"
	);
}

/**
 * @param {string} test test
 * @param {Configuration} realConfig real configuration
 * @param {Scenario} scenario scenario
 * @param {string} testDirectory test directory
 * @returns {Promise<{ config: Configuration, originalEntry?: string, wrapperEntry?: string }>} built configuration
 */
async function buildConfiguration(test, realConfig, scenario, testDirectory) {
	const config = /** @type {Configuration} */ (structuredClone(realConfig));
	const originalEntry = resolveEntry(config, testDirectory);

	config.mode = scenario.mode;
	config.devtool = config.devtool || false;
	config.name = `${test}-${scenario.name}`;
	config.context = testDirectory;
	config.performance = false;
	config.output = config.output || {};
	config.output.path = path.join(baseOutputPath, test, scenario.name);
	config.plugins = config.plugins || [];

	if (originalEntry) {
		config.entry = originalEntry;
	}

	if (
		config.cache &&
		typeof config.cache !== "boolean" &&
		config.cache.type === "filesystem"
	) {
		config.cache.cacheDirectory = path.resolve(config.output.path, ".cache");
	}

	let wrapperEntry;
	if (scenario.watch) {
		if (!originalEntry) {
			throw new Error(`No string entry for "${test}" watch benchmark.`);
		}
		wrapperEntry = path.join(
			testDirectory,
			"generated",
			`benchmark-entry-${scenario.name}.js`
		);
		await writeBenchmarkEntry(wrapperEntry, originalEntry, 0);
		config.entry = wrapperEntry;
		config.cache = {
			type: "memory",
			maxGenerations: 1
		};
	}

	return { config, originalEntry, wrapperEntry };
}

/**
 * @param {Configuration} config config
 * @returns {Promise<void>} promise
 */
async function cleanOutput(config) {
	const outputPath = config.output && config.output.path;
	if (outputPath) {
		await fs.rm(outputPath, { recursive: true, force: true });
	}
}

/**
 * @param {Bench} bench bench
 * @param {string} taskName task name
 * @param {() => Promise<void>} fn task function
 * @param {FnOptions=} options task options
 * @returns {void}
 */
function addBenchmarkTask(bench, taskName, fn, options) {
	bench.add(taskName, fn, { ...options, async: true });
}

/**
 * @param {Bench} bench bench
 * @param {string} test test
 * @param {Scenario} scenario scenario
 * @param {Configuration} config config
 * @returns {void}
 */
function registerRunTask(bench, test, scenario, config) {
	const taskName = `webpack/${test}/${scenario.name}`;

	addBenchmarkTask(
		bench,
		taskName,
		async () => {
			await runWebpack(config);
		},
		{
			async beforeEach() {
				if (scenario.cleanOutput) {
					await cleanOutput(config);
				}

				if (scenario.warmFilesystemCache) {
					await cleanOutput(config);
					await runWebpack(config);
				}
			}
		}
	);
}

/**
 * @param {Bench} bench bench
 * @param {string} test test
 * @param {Scenario} scenario scenario
 * @param {Configuration} config config
 * @param {string} originalEntry original entry
 * @param {string} wrapperEntry wrapper entry
 * @returns {void}
 */
function registerWatchTask(
	bench,
	test,
	scenario,
	config,
	originalEntry,
	wrapperEntry
) {
	const taskName = `webpack/${test}/${scenario.name}`;
	const waiter = createBuildWaiter();
	/** @type {Watching | undefined} */
	let watching;
	let iteration = 0;

	addBenchmarkTask(
		bench,
		taskName,
		async () => {
			const rebuild = waiter.wait();
			await writeBenchmarkEntry(wrapperEntry, originalEntry, ++iteration);
			await rebuild;
		},
		{
			async beforeAll() {
				await cleanOutput(config);
				await writeBenchmarkEntry(wrapperEntry, originalEntry, iteration);
				const initialBuild = waiter.wait();
				watching = runWatch(config, waiter.callback);
				await initialBuild;
			},
			async afterAll() {
				if (watching) {
					await closeWatching(watching);
					watching = undefined;
				}
			}
		}
	);
}

/**
 * @param {Bench} bench bench
 * @param {SelectedCase} selected selected case
 * @returns {Promise<void>} promise
 */
async function registerSuite(bench, selected) {
	const { name, scenarios } = selected;
	const testDirectory = path.join(casesPath, name);
	const optionsPath = path.resolve(testDirectory, "options.mjs");

	/** @type {{ setup?: () => Promise<void> }} */
	let options = {};
	try {
		options = await import(pathToFileURL(optionsPath).toString());
	} catch (_err) {
		// A benchmark case may not need generated fixtures.
	}

	if (typeof options.setup === "function") {
		await options.setup();
	}

	const realConfig = (
		await import(
			pathToFileURL(path.join(testDirectory, "webpack.config.mjs")).toString()
		)
	).default;

	for (const scenarioName of scenarios) {
		const scenario = SCENARIOS[scenarioName];
		const { config, originalEntry, wrapperEntry } = await buildConfiguration(
			name,
			realConfig,
			scenario,
			testDirectory
		);

		if (scenario.watch) {
			if (!originalEntry || !wrapperEntry) {
				throw new Error(`No watch entry for "${name}"`);
			}
			registerWatchTask(
				bench,
				name,
				scenario,
				config,
				originalEntry,
				wrapperEntry
			);
		} else {
			registerRunTask(bench, name, scenario, config);
		}
	}
}

const args = parseArgs(process.argv.slice(2));
const selected = selectShard(
	selectCases(benchmarkManifest, {
		filter: args.filter,
		negativeFilter: args.negativeFilter
	}),
	args.shard
);
const taskSummaries = getTaskSummaries(selected);
const shardLabel =
	args.shard.total === 1
		? ""
		: ` for shard ${args.shard.index}/${args.shard.total}`;

console.log(`Benchmark selected ${taskSummaries.length} task(s)${shardLabel}.`);

if (args.list) {
	for (const task of taskSummaries) {
		console.log(`${task.caseName}/${task.scenario}`);
	}
	// eslint-disable-next-line n/no-process-exit
	process.exit(0);
}

const bench = withCodSpeed(
	new Bench({
		now: hrtimeNow,
		throws: true,
		time: 0,
		warmup: false,
		iterations: args.iterations
	})
);

console.log(Object.getOwnPropertyDescriptors(bench));

for (const selectedCase of selected) {
	await registerSuite(bench, selectedCase);
}

if (bench.tasks.length === 0) {
	console.log("No benchmark tasks matched.");
	// eslint-disable-next-line n/no-process-exit
	process.exit(0);
}

await bench.run();
console.table(bench.table());
