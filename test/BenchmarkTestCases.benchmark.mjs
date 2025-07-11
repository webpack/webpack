import { constants, writeFile } from "fs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { withCodSpeed } from "@codspeed/tinybench-plugin";
import { simpleGit } from "simple-git";
import { Bench, hrtimeNow } from "tinybench";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootPath = path.join(__dirname, "..");
const git = simpleGit(rootPath);

const REV_LIST_REGEXP = /^([a-f0-9]+)\s*([a-f0-9]+)\s*([a-f0-9]+)?\s*$/;

const getV8Flags = () => {
	const nodeVersionMajor = Number.parseInt(
		process.version.slice(1).split(".")[0],
		10
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
						pathToFileURL(path.resolve(baselinePath, "./lib/index.js"))
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

const baseOutputPath = path.join(__dirname, "js", "benchmark");

const bench = withCodSpeed(
	new Bench({
		now: hrtimeNow,
		throws: true,
		warmup: true,
		time: 30000,
		iterations: 96,
		setup(task, mode) {
			console.log(`Setup (${mode} mode): ${task.name}`);
		},
		teardown(task, mode) {
			console.log(`Teardown (${mode} mode): ${task.name}`);
		}
	})
);

async function registerSuite(bench, test, baselines) {
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
		const fullBenchName = `unit benchmark "${test}"`;

		console.log(`Register: ${fullBenchName}`);

		const benchmarkPath = path.resolve(testDirectory, "index.bench.mjs");
		const registerBenchmarks = await import(`${pathToFileURL(benchmarkPath)}`);

		registerBenchmarks.default(bench);

		return;
	}

	const realConfig = (
		await import(
			`${pathToFileURL(path.join(testDirectory, "webpack.config.js"))}`
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

					const stringifiedScenario = JSON.stringify(scenario);
					const benchName = `benchmark "${test}", scenario '${stringifiedScenario}'${LAST_COMMIT ? "" : ` ${baseline.name} (${baseline.rev})`}`;
					const fullBenchName = `benchmark "${test}", scenario '${stringifiedScenario}' ${baseline.name} ${baseline.rev ? `(${baseline.rev})` : ""}`;

					console.log(`Register: ${fullBenchName}`);

					if (scenario.watch) {
						const entry = path.resolve(config.entry);
						const originalEntryContent = await fs.readFile(entry, "utf8");

						let watching;
						let watchingResolve;

						bench.add(
							benchName,
							async () => {
								const watchingPromise = new Promise(res => {
									watchingResolve = res;
								});

								await new Promise((resolve, reject) => {
									writeFile(
										entry,
										`${originalEntryContent};console.log('watch test')`,
										err => {
											if (err) {
												reject(err);
											}

											watchingPromise.then(stats => {
												watchingResolve = undefined;

												// Construct and print stats to be more accurate with real life projects
												stats.toString();
												resolve();
											});
										}
									);
								});
							},
							{
								async beforeAll() {
									this.collectBy = `${test}, scenario '${stringifiedScenario}'`;

									const watchingPromise = new Promise(res => {
										watchingResolve = res;
									});

									watching = await runWatch(webpack(config));
									watching.compiler.hooks.afterDone.tap(
										"WatchingBenchmarkPlugin",
										stats => {
											if (watchingResolve) {
												watchingResolve(stats);
											}
										}
									);

									// Make extra run (initial changes) to warmup before rebuilds
									await new Promise((resolve, reject) => {
										writeFile(
											entry,
											`${originalEntryContent};console.log('watch test')`,
											err => {
												if (err) {
													reject(err);
												}

												watchingPromise.then(stats => {
													watchingResolve = undefined;

													// Construct and print stats to be more accurate with real life projects
													stats.toString();
													resolve();
												});
											}
										);
									});
								},
								async afterEach() {
									await new Promise((resolve, reject) => {
										writeFile(entry, originalEntryContent, err => {
											if (err) {
												reject(err);
												return;
											}

											resolve();
										});
									});
								},
								async afterAll() {
									await new Promise((resolve, reject) => {
										if (watching) {
											watching.close(closeErr => {
												if (closeErr) {
													reject(closeErr);
													return;
												}

												resolve();
											});
										}
									});
								}
							}
						);
					} else {
						bench.add(
							benchName,
							async () => {
								await new Promise((resolve, reject) => {
									const baseCompiler = webpack(config);

									baseCompiler.run((err, stats) => {
										if (err) {
											reject(err);
											return;
										}

										if (stats.hasWarnings() || stats.hasErrors()) {
											throw new Error(stats.toString());
										}

										baseCompiler.close(closeErr => {
											if (closeErr) {
												reject(closeErr);
												return;
											}

											// Construct and print stats to be more accurate with real life projects
											stats.toString();

											resolve();
										});
									});
								});
							},
							{
								beforeAll() {
									this.collectBy = `${test}, scenario '${stringifiedScenario}'`;
								}
							}
						);
					}
				})
			);
		})
	);
}

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
		registerSuite(bench, benchmark, baselines)
	)
);

function formatNumber(value, precision, fractionDigits) {
	return Math.abs(value) >= 10 ** precision
		? value.toFixed()
		: Math.abs(value) < 10 ** (precision - fractionDigits)
			? value.toFixed(fractionDigits)
			: value.toPrecision(precision);
}

const US_PER_MS = 10 ** 3;
const NS_PER_MS = 10 ** 6;

function formatTime(value) {
	const toType =
		Math.round(value) > 0
			? "ms"
			: Math.round(value * US_PER_MS) / US_PER_MS > 0
				? "µs"
				: "ns";

	switch (toType) {
		case "ms": {
			return `${formatNumber(value, 5, 2)} ms`;
		}
		case "µs": {
			return `${formatNumber(value * US_PER_MS, 5, 2)} µs`;
		}
		case "ns": {
			return `${formatNumber(value * NS_PER_MS, 5, 2)} ns`;
		}
	}
}

const statsByTests = new Map();

bench.addEventListener("cycle", event => {
	const task = event.task;
	const runs = task.runs;
	const nSqrt = Math.sqrt(runs);
	const z = tDistribution(runs - 1);
	const { latency } = task.result;
	const minConfidence = latency.mean - (z * latency.sd) / nSqrt;
	const maxConfidence = latency.mean + (z * latency.sd) / nSqrt;
	const mean = formatTime(latency.mean);
	const deviation = formatTime(latency.sd);
	const minConfidenceFormatted = formatTime(minConfidence);
	const maxConfidenceFormatted = formatTime(maxConfidence);
	const confidence = `${mean} ± ${deviation} [${minConfidenceFormatted}; ${maxConfidenceFormatted}]`;
	const text = `${task.name} ${confidence}`;

	const collectBy = task.collectBy;
	const allStats = statsByTests.get(collectBy);

	console.log(`Cycle: ${task.name} ${confidence} (${runs} runs sampled)`);

	const info = { ...latency, text, minConfidence, maxConfidence };

	if (!allStats) {
		statsByTests.set(collectBy, [info]);
		return;
	}

	allStats.push(info);

	const firstStats = allStats[0];
	const secondStats = allStats[1];

	console.log(
		`Result: ${firstStats.text} is ${Math.round(
			(secondStats.mean / firstStats.mean) * 100 - 100
		)}% ${secondStats.maxConfidence < firstStats.minConfidence ? "slower than" : secondStats.minConfidence > firstStats.maxConfidence ? "faster than" : "the same as"} ${secondStats.text}`
	);
});

// Fix for https://github.com/CodSpeedHQ/codspeed-node/issues/44
for (const name of bench.tasks.map(task => task.name)) {
	const task = bench.getTask(name);

	task.opts = task.fnOpts;
}

const tasks = await bench.run();

console.log("\nResult:\n");

for (const task of tasks) {
	const runs = task.runs;

	console.log(`- ${task.name} (${runs} runs sampled)`);
}
