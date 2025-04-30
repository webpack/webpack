"use strict";

import path from "path";
import fs from "fs/promises";
import { constants } from "fs";
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

const CODSPEED = typeof process.env.CODSPEED !== "undefined";

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

	if (CODSPEED) {
		return [
			{
				name: "HEAD",
				rev: head
			}
		];
	}

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
const baselines = [];

try {
	await fs.mkdir(baselinesPath, { recursive: true });
} catch (_err) {} // eslint-disable-line no-empty

const baselineRevisions = await getBaselineRevs();

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
	const baselinePath = path.resolve(baselinesPath, baselineRevision);

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

const baseOutputPath = path.join(__dirname, "js", "benchmark");

async function registerSuite(suite, test, baselines) {
	const testDirectory = path.join(casesPath, test);
	const setupPath = path.resolve(testDirectory, "setup.mjs");

	let needSetup = true;

	try {
		await fs.access(setupPath, constants.R_OK);
	} catch (_err) {
		needSetup = false;
	}

	if (needSetup) {
		await import(`${pathToFileURL(setupPath)}?date=${Date.now()}`);
	}

	const realConfig = (
		await import(
			`${pathToFileURL(path.join(testDirectory, `webpack.config.js`))}`
		)
	).default;

	for (const baseline of baselines) {
		const webpack = await baseline.webpack();

		for (const scenario of scenarios) {
			const stringifiedScenario = JSON.stringify(scenario);
			const { watch, ...rest } = scenario;
			const config = structuredClone({ ...realConfig, ...rest });

			config.entry = config.entry || "./index.js";
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

			if (config.cache) {
				config.cache.cacheDirectory = path.resolve(
					config.output.path,
					".cache"
				);
			}

			// Warmup and also prebuild cache
			const warmupCompiler = webpack(config);

			await new Promise((resolve, reject) => {
				warmupCompiler.run((err, stats) => {
					if (err) {
						reject(err);
					}

					if (stats.hasWarnings() || stats.hasErrors()) {
						reject(new Error(stats.toString()));
					}

					warmupCompiler.close(closeErr => {
						if (closeErr) {
							reject(closeErr);
						}

						resolve();
					});
				});
			});

			// Make an extra run for watching tests
			let watching;

			if (watch) {
				await new Promise((resolve, reject) => {
					watching = webpack(config).watch({}, (err, stats) => {
						if (err) {
							reject(err);
						}

						if (stats.hasWarnings() || stats.hasErrors()) {
							reject(new Error(stats.toString()));
						}

						resolve();
					});
				});
			}

			const suiteName = `benchmark "${test}", scenario '${stringifiedScenario}'${CODSPEED ? "" : ` ${baseline.name} (${baseline.rev})`}`;
			const fullSuiteName = `benchmark "${test}", scenario '${stringifiedScenario}' ${baseline.name} (${baseline.rev})`;

			console.log(`Register: ${fullSuiteName}`);

			suite.add(suiteName, {
				collectBy: `${test}, scenario '${stringifiedScenario}'`,
				defer: true,
				fn(deferred) {
					if (watching) {
						watching.invalidate(() => {
							watching.close(closeErr => {
								if (closeErr) {
									throw closeErr;
								}

								deferred.resolve();
							});
						});
					} else {
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

								deferred.resolve();
							});
						});
					}
				}
			});
		}
	}
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

const casesPath = path.join(__dirname, "benchmarkCases");
const benchmarks = (await fs.readdir(casesPath)).filter(
	item => !item.includes("_")
);

const shard =
	typeof process.env.SHARD !== "undefined"
		? process.env.SHARD.split("/").map(item => Number.parseInt(item, 10))
		: [1, 1];

if (
	typeof shard[0] === "undefined" ||
	typeof shard[1] === "undefined" ||
	shard[0] > shard[1] ||
	shard[0] < 0 ||
	shard[1] < 0
) {
	throw new Error("Invalid `SHARD` value");
}

function splitToNChunks(array, n) {
	const result = [];

	for (let i = n; i > 0; i--) {
		result.push(array.splice(0, Math.ceil(array.length / i)));
	}

	return result;
}

await Promise.all(
	splitToNChunks(benchmarks, shard[1])[shard[0] - 1].map(benchmark =>
		registerSuite(suite, benchmark, baselines)
	)
);

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
	const confidence = `${Math.round(stats.mean * 1000)} ms ± ${Math.round(
		stats.deviation * 1000
	)} ms [${Math.round(stats.minConfidence * 1000)} ms; ${Math.round(
		stats.maxConfidence * 1000
	)} ms]`;
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

	const headStats = allStats[0];
	const baselineStats = allStats[1];

	console.log(
		`Result: ${headStats.text} is ${Math.round(
			(baselineStats.mean / headStats.mean) * 100 - 100
		)}% ${baselineStats.maxConfidence < headStats.minConfidence ? "slower than" : baselineStats.minConfidence > headStats.maxConfidence ? "faster than" : "the same as"} ${baselineStats.text}`
	);
});

suite.run({ async: true });
