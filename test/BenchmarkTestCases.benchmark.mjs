import path from "path";
import fs from "fs/promises";
import { constants, writeFile } from "fs";
import Benchmark from "benchmark";
import { dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import simpleGit from "simple-git";
import { withCodSpeed } from "@codspeed/benchmark.js-plugin";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootPath = path.join(__dirname, "..");
const git = simpleGit(rootPath);

const REV_LIST_REGEXP = /^([a-f0-9]+)\s*([a-f0-9]+)\s*([a-f0-9]+)?\s*$/;

const getV8Flags = () => {
	const nodeVersionMajor = Number.parseInt(
		process.version.slice(1).split(".")[0]
	);
	const flags = [
		"--hash-seed=1",
		"--random-seed=1",
		"--no-opt",
		"--predictable",
		"--predictable-gc-schedule",
		"--interpreted-frames-native-stack",
		"--allow-natives-syntax",
		"--expose-gc",
		"--no-concurrent-sweeping",
		"--max-old-space-size=4096"
	];
	if (nodeVersionMajor < 18) {
		flags.push("--no-randomize-hashes");
	}
	if (nodeVersionMajor < 20) {
		flags.push("--no-scavenge-task");
	}
	return flags;
};

const checkV8Flags = () => {
	const requiredFlags = getV8Flags();
	const actualFlags = process.execArgv;
	const missingFlags = requiredFlags.filter(
		flag => !actualFlags.includes(flag)
	);
	if (missingFlags.length > 0) {
		console.warn(`Missing required flags: ${missingFlags.join(", ")}`);
	}
};

checkV8Flags();

const LAST_COMMIT = typeof process.env.LAST_COMMIT !== "undefined";

/**
 * @param {(string | undefined)[]} revList rev list
 * @returns {Promise<string>} head
 */
async function getHead(revList) {
	if (typeof process.env.HEAD !== "undefined") {
		return process.env.HEAD;
	}

	// On CI we take the latest commit `merge commit` as a head
	if (revList[3]) {
		return revList[3];
	}

	// Otherwise we take the latest commit
	return revList[1];
}

/**
 * @param {string} head head
 * @param {(string | undefined)[]} revList rev list
 * @returns {Promise<string>} base
 */
async function getBase(head, revList) {
	if (typeof process.env.BASE !== "undefined") {
		return process.env.BASE;
	}

	if (revList[3]) {
		return revList[2];
	}

	const branchName = await git.raw(["rev-parse", "--abbrev-ref", "HEAD"]);

	if (branchName.trim() !== "main") {
		const resultParents = await git.raw([
			"rev-list",
			"--parents",
			"-n",
			"1",
			"main"
		]);

		const revList = REV_LIST_REGEXP.exec(resultParents);

		if (!revList[1]) {
			throw new Error("No parent commit found");
		}

		if (head === revList[1]) {
			return revList[2];
		}

		return revList[1];
	}

	return revList[2];
}

/**
 * @returns {Promise<{name: string, rev: string}[]>} baseline revs
 */
async function getBaselineRevs() {
	if (LAST_COMMIT) {
		return [
			{
				name: "HEAD"
			}
		];
	}

	const resultParents = await git.raw([
		"rev-list",
		"--parents",
		"-n",
		"1",
		"HEAD"
	]);
	const revList = REV_LIST_REGEXP.exec(resultParents);

	if (!revList) throw new Error("Invalid result from git rev-list");

	const head = await getHead(revList);
	const base = await getBase(head, revList);

	if (!head || !base) {
		throw new Error("No baseline found");
	}

	return [
		{
			name: "HEAD",
			rev: head
		},
		{
			name: "BASE",
			rev: base
		}
	];
}

/**
 * @param {number} n number of runs
 * @returns {number} distribution
 */
function tDistribution(n) {
	// two-sided, 90%
	// https://en.wikipedia.org/wiki/Student%27s_t-distribution
	if (n <= 30) {
		//            1      2      ...
		const data = [
			6.314, 2.92, 2.353, 2.132, 2.015, 1.943, 1.895, 1.86, 1.833, 1.812, 1.796,
			1.782, 1.771, 1.761, 1.753, 1.746, 1.74, 1.734, 1.729, 1.725, 1.721,
			1.717, 1.714, 1.711, 1.708, 1.706, 1.703, 1.701, 1.699, 1.697
		];
		return data[n - 1];
	} else if (n <= 120) {
		//            30     40     50     60     70     80     90     100    110    120
		const data = [
			1.697, 1.684, 1.676, 1.671, 1.667, 1.664, 1.662, 1.66, 1.659, 1.658
		];
		const a = data[Math.floor(n / 10) - 3];
		const b = data[Math.ceil(n / 10) - 3];
		const f = n / 10 - Math.floor(n / 10);

		return a * (1 - f) + b * f;
	}

	return 1.645;
}

const output = path.join(__dirname, "js");
const baselinesPath = path.join(output, "benchmark-baselines");

const baselineRevisions = await getBaselineRevs();

try {
	await fs.mkdir(baselinesPath, { recursive: true });
} catch (_err) {} // eslint-disable-line no-empty

const baselines = [];

for (const baselineInfo of baselineRevisions) {
	/**
	 * @returns {void}
	 */
	function addBaseline() {
		baselines.push({
			name: baselineInfo.name,
			rev: baselineRevision,
			webpack: async () => {
				const webpack = (
					await import(
						pathToFileURL(path.resolve(baselinePath, `./lib/index.js`))
					)
				).default;

				return webpack;
			}
		});
	}

	const baselineRevision = baselineInfo.rev;
	const baselinePath =
		baselineRevision === undefined
			? path.resolve(__dirname, "../")
			: path.resolve(baselinesPath, baselineRevision);

	try {
		await fs.access(path.resolve(baselinePath, ".git"), constants.R_OK);
	} catch (_err) {
		try {
			await fs.mkdir(baselinePath);
		} catch (_err) {} // eslint-disable-line no-empty

		const gitIndex = path.resolve(rootPath, ".git/index");
		const index = await fs.readFile(gitIndex);
		const prevHead = await git.raw(["rev-list", "-n", "1", "HEAD"]);

		await simpleGit(baselinePath).raw([
			"--git-dir",
			path.join(rootPath, ".git"),
			"reset",
			"--hard",
			baselineRevision
		]);

		await git.raw(["reset", "--soft", prevHead.split("\n")[0]]);
		await fs.writeFile(gitIndex, index);
	} finally {
		addBaseline();
	}
}

const scenarios = [
	{
		name: "mode-development",
		mode: "development"
	},
	{
		name: "mode-development-rebuild",
		mode: "development",
		watch: true
	},
	{
		name: "mode-production",
		mode: "production"
	}
];

function buildConfiguration(
	test,
	baseline,
	realConfig,
	scenario,
	testDirectory
) {
	const { watch, ...rest } = scenario;
	const config = structuredClone({ ...realConfig, ...rest });

	config.entry = path.resolve(
		testDirectory,
		config.entry
			? /\.(c|m)?js$/.test(config.entry)
				? config.entry
				: `${config.entry}.js`
			: "./index.js"
	);
	config.devtool = config.devtool || false;
	config.name = `${test}-${baseline.name}-${scenario.name}`;
	config.context = testDirectory;
	config.performance = false;
	config.output = config.output || {};
	config.output.path = path.join(
		baseOutputPath,
		test,
		`scenario-${scenario.name}`,
		`baseline-${baseline.name}`
	);
	config.plugins = config.plugins || [];

	if (config.cache) {
		config.cache.cacheDirectory = path.resolve(config.output.path, ".cache");
	}

	return config;
}

function warmupCompiler(compiler) {
	return new Promise((resolve, reject) => {
		compiler.run((err, stats) => {
			if (err) {
				reject(err);
			}

			if (stats.hasWarnings() || stats.hasErrors()) {
				reject(new Error(stats.toString()));
			}

			compiler.close(closeErr => {
				if (closeErr) {
					reject(closeErr);
				}

				resolve();
			});
		});
	});
}

function runWatch(compiler) {
	return new Promise((resolve, reject) => {
		const watching = compiler.watch({}, (err, stats) => {
			if (err) {
				reject(err);
			}

			if (stats.hasWarnings() || stats.hasErrors()) {
				reject(new Error(stats.toString()));
			}

			resolve(watching);
		});
	});
}

const baseOutputPath = path.join(__dirname, "js", "benchmark");

async function registerSuite(suite, test, baselines) {
	const testDirectory = path.join(casesPath, test);
	const optionsPath = path.resolve(testDirectory, "options.mjs");

	let options = {};

	try {
		options = await import(`${pathToFileURL(optionsPath)}`);
	} catch (_err) {
		// Ignore
	}

	if (typeof options.setup !== "undefined") {
		await options.setup();
	}

	if (test.includes("-unit")) {
		const fullSuiteName = `unit benchmark "${test}"`;

		console.log(`Register: ${fullSuiteName}`);

		const benchmarkPath = path.resolve(testDirectory, "index.bench.mjs");
		const registerBenchmarks = await import(`${pathToFileURL(benchmarkPath)}`);

		registerBenchmarks.default(suite);

		return;
	}

	const realConfig = (
		await import(
			`${pathToFileURL(path.join(testDirectory, `webpack.config.js`))}`
		)
	).default;

	await Promise.all(
		baselines.map(async baseline => {
			const webpack = await baseline.webpack();

			await Promise.all(
				scenarios.map(async scenario => {
					const config = buildConfiguration(
						test,
						baseline,
						realConfig,
						scenario,
						testDirectory
					);

					// Warmup and also prebuild cache
					await warmupCompiler(webpack(config));

					// Make an extra run for watching tests
					let watching;
					let entry;
					let originalEntryContent;
					let watchingResolve;

					if (scenario.watch) {
						entry = path.resolve(config.entry);
						originalEntryContent = await fs.readFile(entry, "utf-8");
						watching = await runWatch(webpack(config));
						watching.compiler.hooks.done.tapAsync(
							"WatchingBenchmarkPlugin",
							(_stats, callback) => {
								writeFile(entry, originalEntryContent, err => {
									if (err) {
										callback(err);
										return;
									}

									callback();
								});
							}
						);
						watching.compiler.hooks.afterDone.tap(
							"WatchingBenchmarkPlugin",
							stats => {
								if (watchingResolve) {
									watchingResolve(stats);
								}
							}
						);
					}

					const stringifiedScenario = JSON.stringify(scenario);
					const suiteName = `benchmark "${test}", scenario '${stringifiedScenario}'${LAST_COMMIT ? "" : ` ${baseline.name} (${baseline.rev})`}`;
					const fullSuiteName = `benchmark "${test}", scenario '${stringifiedScenario}' ${baseline.name} ${baseline.rev ? `(${baseline.rev})` : ""}`;

					console.log(`Register: ${fullSuiteName}`);

					if (watching) {
						suite.add(suiteName, {
							collectBy: `${test}, scenario '${stringifiedScenario}'`,
							defer: true,
							fn(deferred) {
								const watchingPromise = new Promise(res => {
									watchingResolve = res;
								});

								writeFile(
									entry,
									`${originalEntryContent};console.log('watch test')`,
									err => {
										if (err) {
											throw err;
										}

										watchingPromise.then(stats => {
											// Construct and print stats to be more accurate with real life projects
											stats.toString();

											deferred.resolve();
										});
									}
								);
							}
						});

						suite.on("complete", function () {
							if (watching && watchingResolve) {
								watching.close(closeErr => {
									if (closeErr) {
										throw closeErr;
									}
								});
							}
						});
					} else {
						suite.add(suiteName, {
							collectBy: `${test}, scenario '${stringifiedScenario}'`,
							defer: true,
							fn(deferred) {
								const baseCompiler = webpack(config);

								baseCompiler.run((err, stats) => {
									if (err) {
										throw err;
									}

									if (stats.hasWarnings() || stats.hasErrors()) {
										throw new Error(stats.toString());
									}

									baseCompiler.close(closeErr => {
										if (closeErr) {
											throw closeErr;
										}

										// Construct and print stats to be more accurate with real life projects
										stats.toString();

										deferred.resolve();
									});
								});
							}
						});
					}
				})
			);
		})
	);
}

const suite = withCodSpeed(
	new Benchmark.Suite({
		maxTime: 30,
		initCount: 1,
		onError: event => {
			throw new Error(event.error);
		}
	})
);

await fs.rm(baseOutputPath, { recursive: true, force: true });

const FILTER =
	typeof process.env.FILTER !== "undefined"
		? new RegExp(process.env.FILTER)
		: undefined;

const NEGATIVE_FILTER =
	typeof process.env.NEGATIVE_FILTER !== "undefined"
		? new RegExp(process.env.NEGATIVE_FILTER)
		: undefined;

const casesPath = path.join(__dirname, "benchmarkCases");
const allBenchmarks = (await fs.readdir(casesPath))
	.filter(
		item =>
			!item.includes("_") &&
			(FILTER ? FILTER.test(item) : true) &&
			(NEGATIVE_FILTER ? !NEGATIVE_FILTER.test(item) : true)
	)
	.sort((a, b) => a.localeCompare(b));

const benchmarks = allBenchmarks.filter(item => !item.includes("-long"));
const longBenchmarks = allBenchmarks.filter(item => item.includes("-long"));
const i = Math.floor(benchmarks.length / longBenchmarks.length);

for (const [index, value] of longBenchmarks.entries()) {
	benchmarks.splice(index * i, 0, value);
}

const shard =
	typeof process.env.SHARD !== "undefined"
		? process.env.SHARD.split("/").map(item => Number.parseInt(item, 10))
		: [1, 1];

if (
	typeof shard[0] === "undefined" ||
	typeof shard[1] === "undefined" ||
	shard[0] > shard[1] ||
	shard[0] <= 0 ||
	shard[1] <= 0
) {
	throw new Error(
		`Invalid \`SHARD\` value - it should be less then a part and more than zero, shard part is ${shard[0]}, count of shards is ${shard[1]}`
	);
}

function splitToNChunks(array, n) {
	const result = [];

	for (let i = n; i > 0; i--) {
		result.push(array.splice(0, Math.ceil(array.length / i)));
	}

	return result;
}

const countOfBenchmarks = benchmarks.length;

if (countOfBenchmarks < shard[1]) {
	throw new Error(
		`Shard upper limit is more than count of benchmarks, count of benchmarks is ${countOfBenchmarks}, shard is ${shard[1]}`
	);
}

await Promise.all(
	splitToNChunks(benchmarks, shard[1])[shard[0] - 1].map(benchmark =>
		registerSuite(suite, benchmark, baselines)
	)
);

const MS_PER_SEC = 10 ** 3;
const US_PER_SEC = 10 ** 6;
const NS_PER_SEC = 10 ** 9;

function formatTime(value, toType) {
	switch (toType) {
		case "ms": {
			return `${Math.round(value * MS_PER_SEC)} ms`;
		}
		case "µs": {
			return `${Math.round(value * US_PER_SEC)} µs`;
		}
		case "ns": {
			return `${Math.round(value * NS_PER_SEC)} ns`;
		}
	}
}

const statsByTests = new Map();

suite.on("cycle", event => {
	const target = event.target;
	const stats = target.stats;
	const n = stats.sample.length;
	const nSqrt = Math.sqrt(n);
	const z = tDistribution(n - 1);

	const sampleCount = stats.sample.length;
	stats.minConfidence = stats.mean - (z * stats.deviation) / nSqrt;
	stats.maxConfidence = stats.mean + (z * stats.deviation) / nSqrt;

	const toType =
		Math.round(stats.deviation * MS_PER_SEC) / MS_PER_SEC > 0
			? "ms"
			: Math.round(stats.deviation * US_PER_SEC) / US_PER_SEC > 0
				? "µs"
				: "ns";
	const mean = formatTime(stats.mean, toType);
	const deviation = formatTime(stats.deviation, toType);
	const minConfidence = formatTime(stats.minConfidence, toType);
	const maxConfidence = formatTime(stats.maxConfidence, toType);
	const confidence = `${mean} ± ${deviation} [${minConfidence}; ${maxConfidence}]`;

	stats.text = `${target.name} ${confidence}`;

	const collectBy = target.collectBy;
	const allStats = statsByTests.get(collectBy);

	console.log(
		`Done: ${target.name} ${confidence} (${sampleCount} runs sampled)`
	);

	if (!allStats) {
		statsByTests.set(collectBy, [stats]);
		return;
	}

	allStats.push(stats);

	const firstStats = allStats[0];
	const secondStats = allStats[1];

	console.log(
		`Result: ${firstStats.text} is ${Math.round(
			(secondStats.mean / firstStats.mean) * 100 - 100
		)}% ${secondStats.maxConfidence < firstStats.minConfidence ? "slower than" : secondStats.minConfidence > firstStats.maxConfidence ? "faster than" : "the same as"} ${secondStats.text}`
	);
});

suite.run({ async: true });
