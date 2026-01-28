import fs from "fs";
import fsp from "fs/promises";
import os from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { getV8Flags } from "@codspeed/core";
import { Worker } from "jest-worker";
import { simpleGit } from "simple-git";

/** @typedef {import("./benchmarkCases/_helpers/benchmark.worker.mjs").BenchmarkResult} BenchmarkResult */
/** @typedef {import("./benchmarkCases/_helpers/benchmark.worker.mjs").Result} Result */

/**
 * @typedef {object} Baseline
 * @property {string} name baseline rev name
 * @property {string=} rev baseline revision
 * @property {string} path baseline path
 */

/**
 * @typedef {object} Scenario
 * @property {string} name scenario name
 * @property {"development" | "production"} mode mode
 * @property {boolean=} watch watch mode
 */

/**
 * @typedef {object} BenchmarkTask
 * @property {string} id task id (includes benchmark name and scenario name)
 * @property {string} benchmark benchmark name
 * @property {Scenario} scenario scenario
 * @property {Baseline} baseline baseline
 */

/** @typedef {import("tinybench").Task} TinybenchTask */
/** @typedef {import("tinybench").Fn} Fn */
/** @typedef {import("../types.d.ts")} Webpack */
/** @typedef {import("../types.d.ts").Configuration} Configuration */
/** @typedef {import("../types.d.ts").Stats} Stats */
/** @typedef {import("../types.d.ts").Watching} Watching */

/** @typedef {TinybenchTask & { collectBy?: string }} Task */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootPath = path.join(__dirname, "..");
const git = simpleGit(rootPath);

const REV_LIST_REGEXP = /^([a-f0-9]+)\s*([a-f0-9]+)\s*([a-f0-9]+)?\s*$/;
const LAST_COMMIT = typeof process.env.LAST_COMMIT !== "undefined";

/**
 * @param {[string, string, string, string | undefined]} revList rev list
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
 * @param {[string, string, string, string | undefined]} revList rev list
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

		if (!revList || !revList[1] || !revList[2]) {
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
 * @returns {Promise<{ name: string, rev?: string }[]>} baseline revs
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
	const revList =
		/** @type {[string, string, string, string | undefined] | null} */
		(REV_LIST_REGEXP.exec(resultParents));

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
 * Splits array into N chunks
 * @template T
 * @param {T[]} array Input array
 * @param {number} n Number of chunks
 * @returns {T[][]} Array of chunks
 */
function splitToNChunks(array, n) {
	/** @type {T[][]} */
	const result = [];
	for (let i = n; i > 0; i--) {
		result.push(
			/** @type {T[]} */
			(array.splice(0, Math.ceil(array.length / i)))
		);
	}
	return result;
}

class BenchmarkRunner {
	constructor() {
		/** @type {Scenario[]} */
		this.scenarios = [
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
		/** @type {string} */
		this.output = path.join(__dirname, "./js");
		/** @type {string} */
		this.baselinesPath = path.join(this.output, "benchmark-baselines");
		/** @type {string} */
		this.baseOutputPath = path.join(this.output, "benchmark");
		/** @type {string} */
		this.casesPath = path.join(__dirname, "benchmarkCases");
	}

	/**
	 * Initializes benchmark
	 * @returns {Promise<Baseline[]>} Baselines
	 */
	async initialize() {
		const baselineRevisions = await getBaselineRevs();
		try {
			await fsp.mkdir(this.baselinesPath, { recursive: true });
		} catch (_err) {} // eslint-disable-line no-empty

		/** @type {Baseline[]} */
		const baselines = [];

		for (const baselineInfo of baselineRevisions) {
			const baselineRevision = baselineInfo.rev;

			const baselinePath =
				baselineRevision === undefined
					? path.resolve(__dirname, "../")
					: path.resolve(this.baselinesPath, baselineRevision);

			try {
				await fsp.access(
					path.resolve(baselinePath, ".git"),
					fsp.constants.R_OK
				);
			} catch (err) {
				if (!baselineRevision) {
					throw new Error("No baseline revision", { cause: err });
				}

				try {
					await fsp.mkdir(baselinePath);
				} catch (_err) {} // eslint-disable-line no-empty

				const gitIndex = path.resolve(rootPath, ".git/index");
				const index = await fsp.readFile(gitIndex);
				const prevHead = await git.raw(["rev-list", "-n", "1", "HEAD"]);

				await simpleGit(baselinePath).raw([
					"--git-dir",
					path.join(rootPath, ".git"),
					"reset",
					"--hard",
					baselineRevision
				]);

				await git.raw(["reset", "--soft", prevHead.split("\n")[0]]);
				await fsp.writeFile(gitIndex, index);
			} finally {
				baselines.push({
					name: baselineInfo.name,
					rev: baselineRevision,
					path: baselinePath
				});
			}
		}
		await fsp.rm(this.baseOutputPath, { recursive: true, force: true });

		return baselines;
	}

	async createWorkerPool() {
		const cpus = Math.max(1, os.availableParallelism() - 1);

		this.workerPool = new Worker(
			path.join(this.casesPath, "_helpers", "/benchmark.worker.mjs"),
			{
				exposedMethods: ["run"],
				numWorkers: cpus,
				forkOptions: { silent: false, execArgv: getV8Flags() }
			}
		);
	}

	/**
	 * @param {{BenchmarkTask[]}} benchmarkTasks all benchmark tasks
	 * @returns {Promise<void>}
	 */
	async prepareBenchmarkTask(benchmarkTasks) {
		for (const task of benchmarkTasks) {
			const { benchmark } = task;
			const dir = path.join(this.casesPath, benchmark);
			const optionsPath = path.resolve(dir, "options.mjs");

			/** @type {{ setup?: () => Promise<void> }} */
			let options = {};
			if (optionsPath && fs.existsSync(optionsPath)) {
				options = await import(`${pathToFileURL(optionsPath)}`);
			}
			if (typeof options.setup !== "undefined") {
				await options.setup();
			}
		}
	}

	/**
	 * Create benchmark tasks
	 * @param {string[]} benchmarks all benchmarks
	 * @param {Scenario[]} scenarios all scenarios
	 * @param {Baseline[]} baselines all baselines
	 * @returns {BenchmarkTask[]} benchmark tasks
	 */
	createBenchmarkTasks(benchmarks, scenarios, baselines) {
		const benchmarkTasks = [];

		for (let benchIndex = 0; benchIndex < benchmarks.length; benchIndex++) {
			for (
				let scenarioIndex = 0;
				scenarioIndex < scenarios.length;
				scenarioIndex++
			) {
				const benchmark = benchmarks[benchIndex];
				const scenario = scenarios[scenarioIndex];

				benchmarkTasks.push({
					id: `${benchmark}-${scenario.name}`,
					benchmark,
					scenario,
					baselines
				});
			}
		}

		return benchmarkTasks;
	}

	/**
	 * Process benchmark results
	 * @param {BenchmarkResult[]} benchmarkResults benchmark results
	 */
	processResults(benchmarkResults) {
		/** @type {Map<string, Result[]>} */
		const statsByTests = new Map();
		for (const benchmarkResult of benchmarkResults) {
			for (const results of benchmarkResult.results) {
				const collectBy = results.collectBy;
				const allStats = statsByTests.get(collectBy);

				if (!allStats) {
					statsByTests.set(collectBy, [results]);
					continue;
				}
				allStats.push(results);

				const firstStats = allStats[0];
				const secondStats = allStats[1];

				console.log(
					`Result: ${firstStats.text} is ${Math.round(
						(secondStats.mean / firstStats.mean) * 100 - 100
					)}% ${secondStats.maxConfidence < firstStats.minConfidence ? "slower than" : secondStats.minConfidence > firstStats.maxConfidence ? "faster than" : "the same as"} ${secondStats.text}`
				);
			}
		}
	}

	async run() {
		const baselines = await this.initialize();
		await this.createWorkerPool();
		const FILTER =
			typeof process.env.FILTER !== "undefined"
				? new RegExp(process.env.FILTER)
				: undefined;

		const NEGATIVE_FILTER =
			typeof process.env.NEGATIVE_FILTER !== "undefined"
				? new RegExp(process.env.NEGATIVE_FILTER)
				: undefined;

		/** @type {string[]} */
		const allBenchmarkCases = (await fsp.readdir(this.casesPath))
			.filter(
				(item) =>
					!item.includes("_") &&
					(FILTER ? FILTER.test(item) : true) &&
					(NEGATIVE_FILTER ? !NEGATIVE_FILTER.test(item) : true)
			)
			.sort((a, b) => a.localeCompare(b));

		/** @type {string[]} */
		const benchmarkCases = allBenchmarkCases.filter(
			(item) => !item.includes("-long")
		);

		/** @type {string[]} */
		const longRunningBenchmarkCases = allBenchmarkCases.filter((item) =>
			item.includes("-long")
		);
		const i = Math.floor(
			benchmarkCases.length / longRunningBenchmarkCases.length
		);

		for (const [index, value] of longRunningBenchmarkCases.entries()) {
			benchmarkCases.splice(index * i, 0, value);
		}

		const shard =
			typeof process.env.SHARD !== "undefined"
				? process.env.SHARD.split("/").map((item) => Number.parseInt(item, 10))
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

		const countOfBenchmarks = benchmarkCases.length;

		if (countOfBenchmarks < shard[1]) {
			throw new Error(
				`Shard upper limit is more than count of benchmarks, count of benchmarks is ${countOfBenchmarks}, shard is ${shard[1]}`
			);
		}

		const currentShardBenchmarkCases = splitToNChunks(benchmarkCases, shard[1])[
			shard[0] - 1
		];

		const benchmarkTasks = this.createBenchmarkTasks(
			currentShardBenchmarkCases,
			this.scenarios,
			baselines
		);

		await this.prepareBenchmarkTask(benchmarkTasks);

		try {
			/** @type {BenchmarkResult[]} */
			const benchmarkResults = await Promise.all(
				benchmarkTasks.map((task) =>
					this.workerPool.run({
						task,
						casesPath: this.casesPath,
						baseOutputPath: this.baseOutputPath
					})
				)
			);

			this.processResults(benchmarkResults);
		} finally {
			await this.workerPool.end();
		}
	}
}

new BenchmarkRunner().run();
