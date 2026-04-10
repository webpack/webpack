import { constants } from "fs";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { getCodspeedRunnerMode, getV8Flags } from "@codspeed/core";
import { Worker } from "jest-worker";
import { simpleGit } from "simple-git";

/** @typedef {import("./harness/benchmark/benchmark.worker.mjs").BenchmarkResult} BenchmarkResult */
/** @typedef {import("./harness/benchmark/benchmark.worker.mjs").Result} Result */
/** @typedef {import("./harness/benchmark/benchmark.worker.mjs").BenchmarkWorkerMethods} BenchmarkWorkerMethods */
/** @typedef {import("jest-worker").JestWorkerFarm<BenchmarkWorkerMethods>} BenchmarkWorker */

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
 * @property {Baseline[]} baselines baselines
 */

/**
 * @typedef {object} ShardAssignment
 * @property {string} scenarioName scenario this shard handles
 * @property {number} splitIndex 0-based index for splitting benchmarks within this scenario
 * @property {number} splitTotal total shards dedicated to this scenario
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootPath = path.join(__dirname, "..");
const git = simpleGit(rootPath);
const callingFile = path.relative(rootPath, fileURLToPath(import.meta.url));

const REV_LIST_REGEXP = /^([a-f0-9]+)\s*([a-f0-9]+)\s*([a-f0-9]+)?\s*$/;

const LAST_COMMIT = typeof process.env.LAST_COMMIT !== "undefined";

const checkV8Flags = () => {
	const requiredFlags = getV8Flags().filter(
		(flag) => !flag.startsWith("--max-old-space-size")
	);
	const actualFlags = process.execArgv;
	const missingFlags = requiredFlags.filter(
		(flag) => !actualFlags.includes(flag)
	);
	if (missingFlags.length > 0) {
		throw new Error(`Missing required flags: ${missingFlags.join(", ")}`);
	}
};

checkV8Flags();

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

/** @type {Map<number, ShardAssignment[]>} */
const SCENARIO_SHARD_LAYOUTS = new Map([
	[
		4,
		[
			{ scenarioName: "mode-development", splitIndex: 0, splitTotal: 1 },
			{
				scenarioName: "mode-development-rebuild",
				splitIndex: 0,
				splitTotal: 1
			},
			{ scenarioName: "mode-production", splitIndex: 0, splitTotal: 2 },
			{ scenarioName: "mode-production", splitIndex: 1, splitTotal: 2 }
		]
	]
]);

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
		this.casesPath = path.join(__dirname, "benchmarkCases");
		/** @type {string} */
		this.baseOutputPath = path.join(__dirname, "js", "benchmark");

		/** @type {BenchmarkWorker | undefined} */
		this.workerPool = undefined;
	}

	/**
	 * Initialize baselines by checking out the required git revisions.
	 * @returns {Promise<Baseline[]>} baselines
	 */
	async initialize() {
		const baselinesPath = path.join(__dirname, "js", "benchmark-baselines");
		const baselineRevisions = await getBaselineRevs();

		try {
			await fs.mkdir(baselinesPath, { recursive: true });
		} catch (_err) {} // eslint-disable-line no-empty

		/** @type {Baseline[]} */
		const baselines = [];

		for (const baselineInfo of baselineRevisions) {
			const baselineRevision = baselineInfo.rev;
			const baselinePath =
				baselineRevision === undefined
					? path.resolve(__dirname, "../")
					: path.resolve(baselinesPath, baselineRevision);

			try {
				await fs.access(path.resolve(baselinePath, ".git"), constants.R_OK);
			} catch (err) {
				if (!baselineRevision) {
					throw new Error("No baseline revision", { cause: err });
				}

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
				baselines.push({
					name: baselineInfo.name,
					rev: baselineRevision,
					path: baselinePath
				});
			}
		}

		await fs.rm(this.baseOutputPath, { recursive: true, force: true });

		return baselines;
	}

	/**
	 * Create the jest-worker pool with V8 flags forwarded to child processes.
	 * @returns {number} number of workers
	 */
	createWorkerPool() {
		const numWorkers = Math.max(
			1,
			typeof os.availableParallelism === "function"
				? os.availableParallelism() - 1
				: os.cpus().length - 1
		);

		this.workerPool = /** @type {BenchmarkWorker} */ (
			new Worker(
				path.resolve(__dirname, "harness/benchmark/benchmark.worker.mjs"),
				{
					exposedMethods: ["run"],
					numWorkers,
					forkOptions: { silent: false, execArgv: getV8Flags() }
				}
			)
		);

		return numWorkers;
	}

	/**
	 * Run setup for each benchmark case (e.g. generate test files).
	 * @param {BenchmarkTask[]} benchmarkTasks all benchmark tasks
	 * @returns {Promise<void>}
	 */
	async prepareBenchmarkTasks(benchmarkTasks) {
		/** @type {Set<string>} */
		const prepared = new Set();

		for (const task of benchmarkTasks) {
			const { benchmark } = task;
			if (prepared.has(benchmark)) continue;
			prepared.add(benchmark);

			const testDirectory = path.join(this.casesPath, benchmark);
			const optionsPath = path.resolve(testDirectory, "options.mjs");

			try {
				const options = await import(`${pathToFileURL(optionsPath)}`);
				if (typeof options.setup !== "undefined") {
					await options.setup();
				}
			} catch (_err) {
				// Ignore - no options file
			}
		}
	}

	/**
	 * Create benchmark tasks from the cartesian product of benchmarks × scenarios.
	 * Each task includes all baselines so the worker can run HEAD vs BASE in one go.
	 * @param {string[]} benchmarks all benchmarks
	 * @param {Scenario[]} scenarios all scenarios
	 * @param {Baseline[]} baselines all baselines
	 * @returns {BenchmarkTask[]} benchmark tasks
	 */
	createBenchmarkTasks(benchmarks, scenarios, baselines) {
		/** @type {BenchmarkTask[]} */
		const benchmarkTasks = [];

		for (const benchmark of benchmarks) {
			for (const scenario of scenarios) {
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
	 * Create benchmark tasks using scenario-aware sharding.
	 * Each shard runs a specific scenario (or a portion of benchmarks for that scenario).
	 * @param {string[]} benchmarks all benchmarks
	 * @param {ShardAssignment} assignment the shard assignment
	 * @param {Baseline[]} baselines all baselines
	 * @returns {BenchmarkTask[]} tasks
	 */
	createScenarioAwareTasks(benchmarks, assignment, baselines) {
		const scenario = this.scenarios.find(
			(s) => s.name === assignment.scenarioName
		);

		if (!scenario) {
			throw new Error(
				`Unknown scenario "${assignment.scenarioName}" in shard layout`
			);
		}

		const shardBenchmarks =
			assignment.splitTotal > 1
				? splitToNChunks([...benchmarks], assignment.splitTotal)[
						assignment.splitIndex
					]
				: benchmarks;

		return this.createBenchmarkTasks(shardBenchmarks, [scenario], baselines);
	}

	/**
	 * Process benchmark results: group by collectBy and compare HEAD vs BASE.
	 * @param {BenchmarkResult[]} benchmarkResults benchmark results
	 */
	processResults(benchmarkResults) {
		/** @type {Map<string, Result[]>} */
		const statsByTests = new Map();

		for (const benchmarkResult of benchmarkResults) {
			for (const result of benchmarkResult.results) {
				const collectBy = result.collectBy;
				if (!collectBy) {
					continue;
				}

				const allStats = statsByTests.get(collectBy);

				if (!allStats) {
					statsByTests.set(collectBy, [result]);
					continue;
				}

				allStats.push(result);

				if (allStats.length >= 2) {
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
	}

	/**
	 * Main entry point: initialize baselines, discover benchmarks,
	 * create worker pool, dispatch tasks, and process results.
	 */
	async run() {
		const baselines = await this.initialize();

		const FILTER =
			typeof process.env.FILTER !== "undefined"
				? new RegExp(process.env.FILTER)
				: undefined;

		const NEGATIVE_FILTER =
			typeof process.env.NEGATIVE_FILTER !== "undefined"
				? new RegExp(process.env.NEGATIVE_FILTER)
				: undefined;

		/** @type {string[]} */
		const allBenchmarks = (await fs.readdir(this.casesPath))
			.filter(
				(item) =>
					!item.includes("_") &&
					(FILTER ? FILTER.test(item) : true) &&
					(NEGATIVE_FILTER ? !NEGATIVE_FILTER.test(item) : true)
			)
			.sort((a, b) => a.localeCompare(b));

		/** @type {string[]} */
		const benchmarks = allBenchmarks.filter((item) => !item.includes("-long"));
		/** @type {string[]} */
		const longBenchmarks = allBenchmarks.filter((item) =>
			item.includes("-long")
		);
		const spacing = Math.floor(benchmarks.length / longBenchmarks.length);

		for (const [index, value] of longBenchmarks.entries()) {
			benchmarks.splice(index * spacing, 0, value);
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

		const countOfBenchmarks = benchmarks.length;
		const layout = SCENARIO_SHARD_LAYOUTS.get(shard[1]);

		/** @type {BenchmarkTask[]} */
		let benchmarkTasks;

		if (layout) {
			// Scenario-aware sharding
			const assignment = layout[shard[0] - 1];

			if (!assignment) {
				throw new Error(
					`Invalid shard index ${shard[0]} for layout with ${shard[1]} shards`
				);
			}

			if (
				assignment.splitTotal > 1 &&
				countOfBenchmarks < assignment.splitTotal
			) {
				throw new Error(
					`Not enough benchmarks (${countOfBenchmarks}) to split into ${assignment.splitTotal} parts for scenario "${assignment.scenarioName}"`
				);
			}

			benchmarkTasks = this.createScenarioAwareTasks(
				benchmarks,
				assignment,
				baselines
			);
		} else {
			// Fallback: simple benchmark sharding
			if (countOfBenchmarks < shard[1]) {
				throw new Error(
					`Shard upper limit is more than count of benchmarks, count of benchmarks is ${countOfBenchmarks}, shard is ${shard[1]}`
				);
			}

			const shardedBenchmarks = splitToNChunks([...benchmarks], shard[1])[
				shard[0] - 1
			];
			benchmarkTasks = this.createBenchmarkTasks(
				shardedBenchmarks,
				this.scenarios,
				baselines
			);
		}

		await this.prepareBenchmarkTasks(benchmarkTasks);

		await (getCodspeedRunnerMode() === "memory"
			? this.runInMainThread(benchmarkTasks)
			: this.runInWorkers(benchmarkTasks));
	}

	/**
	 * Run benchmark tasks sequentially in the main thread (memory mode)
	 * @param {BenchmarkTask[]} benchmarkTasks benchmark tasks
	 */
	async runInMainThread(benchmarkTasks) {
		console.log(
			`\nRunning ${benchmarkTasks.length} benchmark tasks in single thread (memory mode)\n`
		);

		const { run: runBenchmark } =
			await import("./harness/benchmark/benchmark.worker.mjs");

		/** @type {BenchmarkResult[]} */
		const benchmarkResults = [];
		/** @type {string[]} */
		const failedTasks = [];

		for (const task of benchmarkTasks) {
			try {
				const result = await runBenchmark({
					task,
					casesPath: this.casesPath,
					baseOutputPath: this.baseOutputPath,
					callingFile
				});
				benchmarkResults.push(result);
			} catch (err) {
				if (err instanceof Error) {
					console.error(`Task "${task.id}" failed: ${err.message}`);
				}
				failedTasks.push(task.id);
			}
		}

		if (benchmarkResults.length > 0) {
			this.processResults(benchmarkResults);
		}

		if (failedTasks.length > 0) {
			throw new Error(
				`${failedTasks.length} benchmark task(s) failed: ${failedTasks.join(", ")}`
			);
		}
	}

	/**
	 * Run benchmark tasks in parallel using a worker pool
	 * @param {BenchmarkTask[]} benchmarkTasks benchmark tasks
	 */
	async runInWorkers(benchmarkTasks) {
		const numWorkers = this.createWorkerPool();
		const workerPool = this.workerPool;

		if (!workerPool) {
			throw new Error("Worker pool is not initialized");
		}

		console.log(
			`\nRunning ${benchmarkTasks.length} benchmark tasks across ${numWorkers} workers\n`
		);

		try {
			const settledResults = await Promise.allSettled(
				benchmarkTasks.map((task) =>
					workerPool
						.run({
							task,
							casesPath: this.casesPath,
							baseOutputPath: this.baseOutputPath,
							callingFile
						})
						.catch((err) => {
							if (err instanceof Error) {
								console.error(`Task "${task.id}" failed: ${err.message}`);
							}
							throw err;
						})
				)
			);

			/** @type {BenchmarkResult[]} */
			const benchmarkResults = [];
			/** @type {string[]} */
			const failedTasks = [];

			for (const [index, result] of settledResults.entries()) {
				if (result.status === "fulfilled") {
					benchmarkResults.push(result.value);
				} else {
					failedTasks.push(benchmarkTasks[index].id);
				}
			}

			if (benchmarkResults.length > 0) {
				this.processResults(benchmarkResults);
			}

			if (failedTasks.length > 0) {
				throw new Error(
					`${failedTasks.length} benchmark task(s) failed: ${failedTasks.join(", ")}`
				);
			}
		} finally {
			await /** @type {Worker} */ (this.workerPool).end();
		}
	}
}

await new BenchmarkRunner().run();
