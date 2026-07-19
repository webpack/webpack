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
 * @property {string} name baseline name ("HEAD" or "BASE")
 * @property {string=} rev baseline revision
 * @property {string} path checked-out baseline directory
 */

/**
 * @typedef {object} Scenario
 * @property {string} name scenario name
 * @property {"development" | "production"} mode mode
 * @property {boolean=} watch watch (rebuild) scenario
 */

/**
 * @typedef {object} BenchmarkTask
 * @property {string} id task id (benchmark + scenario)
 * @property {string} benchmark benchmark name
 * @property {Scenario=} scenario scenario (omitted for `-unit` benchmarks)
 * @property {Baseline[]} baselines baselines measured in one task
 */

// One libuv thread → fs completions fire in submission order, making module
// build order (and thus allocation counts) deterministic run-to-run. Set before
// any async fs so libuv reads it when the pool first initializes; `??=` lets the
// CI env override stand. This is the main lever against memory-benchmark noise.
process.env.UV_THREADPOOL_SIZE ??= "1";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootPath = path.join(__dirname, "..");
const git = simpleGit(rootPath);
// Forwarded to workers so measured URIs stay `test/BenchmarkTestCases.benchmark.mjs::…`
// (identical to the pre-parallel harness), keeping CodSpeed history comparable.
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
		// Missing flags invalidate deterministic benchmarking (hash/random seeds,
		// GC scheduling, JIT). Throw instead of warning so CI and local runs can't
		// silently produce unstable numbers — use `yarn benchmark` to run with
		// the correct flags.
		throw new Error(
			`Missing required V8 flags for stable benchmarking: ${missingFlags.join(
				", "
			)}\nRun via \`yarn benchmark\` so the flags declared in package.json are applied.`
		);
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
 * @param {T[]} array an array
 * @param {number} n number of chunks
 * @returns {T[][]} splitted to n chunks
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
		this.casesPath = path.join(__dirname, "benchmarkCases");
		/** @type {string} */
		this.baseOutputPath = path.join(__dirname, "js", "benchmark");
		/** @type {BenchmarkWorker | undefined} */
		this.workerPool = undefined;
	}

	/**
	 * Check out the required git revisions and clear stale build output.
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
	 * Discover benchmark case directories, honoring FILTER / NEGATIVE_FILTER and
	 * interleaving the long-running cases so shards stay balanced.
	 * @returns {Promise<string[]>} benchmark names
	 */
	async discoverBenchmarks() {
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

		if (longBenchmarks.length > 0) {
			const spacing = Math.max(
				1,
				Math.floor(benchmarks.length / longBenchmarks.length)
			);

			for (const [index, value] of longBenchmarks.entries()) {
				benchmarks.splice(index * spacing, 0, value);
			}
		}

		return benchmarks;
	}

	/**
	 * Build the benchmark tasks for this shard. Each non-unit benchmark expands
	 * to one task per scenario (all baselines measured within the task); `-unit`
	 * benchmarks have no scenarios and become a single task.
	 * @param {string[]} benchmarks discovered benchmarks
	 * @param {[number, number]} shard shard [part, count]
	 * @param {Baseline[]} baselines baselines
	 * @returns {BenchmarkTask[]} benchmark tasks
	 */
	createBenchmarkTasks(benchmarks, shard, baselines) {
		const countOfBenchmarks = benchmarks.length;

		if (countOfBenchmarks < shard[1]) {
			throw new Error(
				`Shard upper limit is more than count of benchmarks, count of benchmarks is ${countOfBenchmarks}, shard is ${shard[1]}`
			);
		}

		const shardBenchmarks = splitToNChunks([...benchmarks], shard[1])[
			shard[0] - 1
		];

		/** @type {BenchmarkTask[]} */
		const benchmarkTasks = [];

		for (const benchmark of shardBenchmarks) {
			if (benchmark.includes("-unit")) {
				benchmarkTasks.push({ id: benchmark, benchmark, baselines });
				continue;
			}

			for (const scenario of this.scenarios) {
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
	 * Run each benchmark's `options.setup()` once (e.g. generate module trees).
	 * Done in the orchestrator so parallel workers observe a ready filesystem.
	 * @param {BenchmarkTask[]} benchmarkTasks benchmark tasks
	 * @returns {Promise<void>}
	 */
	async prepareBenchmarkTasks(benchmarkTasks) {
		/** @type {Set<string>} */
		const prepared = new Set();

		for (const { benchmark } of benchmarkTasks) {
			if (prepared.has(benchmark)) continue;
			prepared.add(benchmark);

			const optionsPath = path.resolve(
				this.casesPath,
				benchmark,
				"options.mjs"
			);

			try {
				const options = await import(`${pathToFileURL(optionsPath)}`);
				if (typeof options.setup !== "undefined") {
					await options.setup();
				}
			} catch (_err) {
				// Ignore — benchmark has no options.mjs
			}
		}
	}

	/**
	 * Compare HEAD vs BASE for each grouped result (walltime / local runs only;
	 * CodSpeed analysis modes report through their own instrumentation).
	 * @param {BenchmarkResult[]} benchmarkResults benchmark results
	 * @returns {void}
	 */
	processResults(benchmarkResults) {
		/** @type {Map<string, Result[]>} */
		const statsByTests = new Map();

		for (const { results } of benchmarkResults) {
			for (const result of results) {
				const { collectBy } = result;
				if (!collectBy) continue;

				const allStats = statsByTests.get(collectBy);

				if (!allStats) {
					statsByTests.set(collectBy, [result]);
					continue;
				}

				allStats.push(result);

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

	/**
	 * Aggregate settled task results and throw if any task failed.
	 * @param {BenchmarkTask[]} benchmarkTasks benchmark tasks
	 * @param {PromiseSettledResult<BenchmarkResult>[]} settledResults settled results
	 * @returns {void}
	 */
	finalizeResults(benchmarkTasks, settledResults) {
		/** @type {BenchmarkResult[]} */
		const benchmarkResults = [];
		/** @type {string[]} */
		const failedTasks = [];

		for (const [index, settled] of settledResults.entries()) {
			if (settled.status === "fulfilled") {
				benchmarkResults.push(settled.value);
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
	}

	/**
	 * Run the whole shard in one shared bench in the main process. Used for
	 * CodSpeed memory mode: a single `Bench` with one global prime pass and one
	 * setup/teardown, exactly like the pre-parallel harness, so allocation counts
	 * stay stable and comparable (per-benchmark benches shifted them by 2-4x).
	 * @param {BenchmarkTask[]} benchmarkTasks benchmark tasks
	 * @returns {Promise<void>}
	 */
	async runInMainThread(benchmarkTasks) {
		console.log(
			`\nRunning ${benchmarkTasks.length} benchmark task(s) in a single process (memory mode)\n`
		);

		const { runAll } = await import("./harness/benchmark/benchmark.worker.mjs");

		// Any task error aborts the run (bench `throws: true`), matching the
		// pre-parallel harness where one failure failed the whole shard.
		const result = await runAll({
			tasks: benchmarkTasks,
			casesPath: this.casesPath,
			baseOutputPath: this.baseOutputPath,
			callingFile
		});

		this.processResults([result]);
	}

	/**
	 * Run benchmark tasks across a pool of worker processes.
	 * @param {BenchmarkTask[]} benchmarkTasks benchmark tasks
	 * @returns {Promise<void>}
	 */
	async runInWorkers(benchmarkTasks) {
		const cpuCount =
			typeof os.availableParallelism === "function"
				? os.availableParallelism()
				: os.cpus().length;
		const cpuWorkers = Math.max(1, cpuCount - 1);

		// Bound the pool by RAM, not just cores: CodSpeed simulation runs every
		// build under Valgrind, whose per-process footprint is several GiB, so a
		// core-count-sized pool OOMs the runner (exit 143). Reserve headroom for
		// the OS + orchestrator, then divide the rest by a per-worker estimate
		// (large under Valgrind, small otherwise). memory mode never reaches here.
		const totalGiB = os.totalmem() / 1024 ** 3;
		const reserveGiB = 3;
		const perWorkerGiB = getCodspeedRunnerMode() === "simulation" ? 6 : 1.5;
		const memWorkers = Math.max(
			1,
			Math.floor((totalGiB - reserveGiB) / perWorkerGiB)
		);

		const numWorkers = Math.min(cpuWorkers, memWorkers);

		const workerPool = /** @type {BenchmarkWorker} */ (
			new Worker(
				path.resolve(__dirname, "harness/benchmark/benchmark.worker.mjs"),
				{
					exposedMethods: ["run"],
					numWorkers,
					// Forward the V8 flags CodSpeed needs (seeds, --no-opt, …) so the
					// child processes measure under the same deterministic conditions.
					forkOptions: { silent: false, execArgv: getV8Flags() }
				}
			)
		);
		this.workerPool = workerPool;

		console.log(
			`\nRunning ${benchmarkTasks.length} benchmark task(s) across ${numWorkers} worker(s) (cpu cap ${cpuWorkers}, memory cap ${memWorkers} @ ${totalGiB.toFixed(1)} GiB)\n`
		);

		try {
			const settledResults = await Promise.allSettled(
				benchmarkTasks.map((task) =>
					workerPool.run({
						task,
						casesPath: this.casesPath,
						baseOutputPath: this.baseOutputPath,
						callingFile
					})
				)
			);

			this.finalizeResults(benchmarkTasks, settledResults);
		} finally {
			await workerPool.end();
		}
	}

	/**
	 * Entry point: prepare baselines, discover and shard benchmarks, then run.
	 * @returns {Promise<void>}
	 */
	async run() {
		const baselines = await this.initialize();
		const benchmarks = await this.discoverBenchmarks();

		const shard =
			typeof process.env.SHARD !== "undefined"
				? /** @type {[number, number]} */ (
						process.env.SHARD.split("/").map((item) =>
							Number.parseInt(item, 10)
						)
					)
				: /** @type {[number, number]} */ ([1, 1]);

		if (
			typeof shard[0] === "undefined" ||
			typeof shard[1] === "undefined" ||
			Number.isNaN(shard[0]) ||
			Number.isNaN(shard[1]) ||
			shard[0] > shard[1] ||
			shard[0] <= 0 ||
			shard[1] <= 0
		) {
			throw new Error(
				`Invalid \`SHARD\` value - it should be less then a part and more than zero, shard part is ${shard[0]}, count of shards is ${shard[1]}`
			);
		}

		const benchmarkTasks = this.createBenchmarkTasks(
			benchmarks,
			shard,
			baselines
		);

		await this.prepareBenchmarkTasks(benchmarkTasks);

		await (getCodspeedRunnerMode() === "memory"
			? this.runInMainThread(benchmarkTasks)
			: this.runInWorkers(benchmarkTasks));
	}
}

/**
 * @returns {void}
 */
function logSystemInfo() {
	const cpu = process.cpuUsage();
	console.log("=== CPU ===");
	console.log("Process CPU (ms):", {
		user: (cpu.user / 1000).toFixed(1),
		system: (cpu.system / 1000).toFixed(1)
	});
	console.log(
		"Load average (1/5/15 min):",
		os.loadavg().map((v) => v.toFixed(2))
	);

	const mem = process.memoryUsage();
	console.log("=== Process Memory (MB) ===");
	console.log({
		rss: (mem.rss / 1024 / 1024).toFixed(1),
		heapTotal: (mem.heapTotal / 1024 / 1024).toFixed(1),
		heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(1),
		external: (mem.external / 1024 / 1024).toFixed(1),
		arrayBuffers: (mem.arrayBuffers / 1024 / 1024).toFixed(1)
	});

	const totalMem = os.totalmem();
	const freeMem = os.freemem();
	console.log("=== System Memory (MB) ===");
	console.log({
		total: (totalMem / 1024 / 1024).toFixed(1),
		free: (freeMem / 1024 / 1024).toFixed(1),
		used: ((totalMem - freeMem) / 1024 / 1024).toFixed(1),
		usagePercent: `${(((totalMem - freeMem) / totalMem) * 100).toFixed(1)}%`
	});

	console.log("Process uptime:", `${process.uptime().toFixed(1)}s`);
}

process.on("SIGTERM", () => {
	console.log(">>> Received SIGTERM");
	logSystemInfo();
	// eslint-disable-next-line n/no-process-exit
	process.exit(0);
});

process.on("exit", (code) => {
	console.log(">>> Exiting with code:", code);
	logSystemInfo();
});

await new BenchmarkRunner().run();
