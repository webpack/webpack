import { constants } from "fs";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { getCodspeedRunnerMode, getV8Flags } from "@codspeed/core";
import { Worker } from "jest-worker";
import { simpleGit } from "simple-git";

/**
 * @import {
 * 	BenchmarkResult,
 * 	HeapUsage,
 * 	Result,
 * 	BenchmarkWorkerMethods
 * } from "./harness/benchmark/benchmark.worker.mjs"
 */
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

// Sample spread above which a heap number is reported as not worth comparing.
// Three samples of a live heap spread 12-15% even when their median repeats to
// under 1%, so the guard sits well above that and only catches real drift.
const UNSTABLE_SPREAD = 0.25;

/**
 * @param {number} bytes bytes
 * @returns {string} formatted size
 */
function formatBytes(bytes) {
	return `${(bytes / 1024 ** 2).toFixed(2)} MiB`;
}

/**
 * @param {number} value value
 * @param {number} before previous value
 * @returns {string} signed percentage change
 */
function formatPercentage(value, before) {
	const change = (value / before) * 100 - 100;
	return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
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
		// Empty means unset: `new RegExp("")` matches every case, so an empty
		// NEGATIVE_FILTER would exclude all of them.
		const FILTER = process.env.FILTER
			? new RegExp(process.env.FILTER)
			: undefined;

		const NEGATIVE_FILTER = process.env.NEGATIVE_FILTER
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
	 * benchmarks have no scenarios and become a single task; `-runtime`
	 * benchmarks skip the rebuild scenario, which emits the same output as the
	 * initial build.
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

			const scenarios = benchmark.includes("-runtime")
				? this.scenarios.filter((scenario) => !scenario.watch)
				: this.scenarios;

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
				await fs.stat(optionsPath);
			} catch (err) {
				// Only a missing options.mjs is optional; anything else would
				// otherwise measure a fixture that never got built.
				if (/** @type {NodeJS.ErrnoException} */ (err).code !== "ENOENT") {
					throw err;
				}
				continue;
			}

			const options = await import(`${pathToFileURL(optionsPath)}`);

			if (typeof options.setup !== "undefined") {
				await options.setup();
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
	 * Write and print the heap-usage report. This is the harness's own metric —
	 * GC-settled live bytes for one build or rebuild — so a row reads as memory a
	 * user would see, unlike an allocation count whose scale depends on how warm
	 * the measuring process already was. `MEMORY_BASELINE` diffs against a
	 * previous report, the way `test:size` compares asset sizes.
	 * @param {BenchmarkResult[]} benchmarkResults benchmark results
	 * @returns {Promise<void>}
	 */
	async reportHeapUsage(benchmarkResults) {
		/** @type {HeapUsage[]} */
		const entries = benchmarkResults
			.flatMap((result) => result.heapUsages || [])
			.sort((a, b) => b.peak - a.peak);

		if (entries.length === 0) return;

		const reportPath = path.join(this.baseOutputPath, "memory-report.json");

		await fs.mkdir(this.baseOutputPath, { recursive: true });
		await fs.writeFile(reportPath, `${JSON.stringify({ entries }, null, 2)}\n`);

		/** @type {Map<string, HeapUsage>} */
		const baseline = new Map();
		const baselinePath = process.env.MEMORY_BASELINE;

		if (baselinePath) {
			const previous = JSON.parse(await fs.readFile(baselinePath, "utf8"));
			for (const entry of previous.entries) baseline.set(entry.uri, entry);
		}

		console.log(`\nHeap usage (median of ${entries[0].samples} samples)`);

		for (const entry of entries) {
			const before = baseline.get(entry.uri);
			const delta = before
				? ` (was ${formatBytes(before.peak)}, ${formatPercentage(entry.peak, before.peak)})`
				: "";
			// Flagged rather than failed: a wide spread means the number is not worth
			// comparing, which is a different thing from the number having moved.
			const spread =
				entry.spread > UNSTABLE_SPREAD
					? ` [unstable, samples spread ${(entry.spread * 100).toFixed(1)}%]`
					: "";

			console.log(
				`  ${formatBytes(entry.peak).padStart(10)} peak  ${formatBytes(entry.marginal).padStart(10)} marginal  ${entry.uri}${delta}${spread}`
			);
		}

		console.log(`\nReport written to ${reportPath}`);
	}

	/**
	 * Aggregate settled task results and throw if any task failed.
	 * @param {BenchmarkTask[]} benchmarkTasks benchmark tasks
	 * @param {PromiseSettledResult<BenchmarkResult>[]} settledResults settled results
	 * @returns {Promise<void>}
	 */
	async finalizeResults(benchmarkTasks, settledResults) {
		/** @type {BenchmarkResult[]} */
		const benchmarkResults = [];
		/** @type {string[]} */
		const failedTasks = [];
		/** @type {unknown} */
		let firstFailure;

		for (const [index, settled] of settledResults.entries()) {
			if (settled.status === "fulfilled") {
				benchmarkResults.push(settled.value);
			} else {
				const { id } = benchmarkTasks[index];

				failedTasks.push(id);
				// The rejection is the only description of what broke; without it a
				// failing case reports a task id and nothing else.
				console.error(`Failed: ${id}`, settled.reason);
				if (failedTasks.length === 1) firstFailure = settled.reason;
			}
		}

		if (benchmarkResults.length > 0) {
			this.processResults(benchmarkResults);
		}

		if (failedTasks.length === 0 && getCodspeedRunnerMode() === "memory") {
			await this.reportHeapUsage(benchmarkResults);
		}

		if (failedTasks.length > 0) {
			throw new Error(
				`${failedTasks.length} benchmark task(s) failed: ${failedTasks.join(", ")}`,
				{ cause: firstFailure }
			);
		}
	}

	/**
	 * Run benchmark tasks across a pool of worker processes.
	 * @param {BenchmarkTask[]} benchmarkTasks benchmark tasks
	 * @param {boolean=} oneTaskPerProcess measure each task in a fresh process
	 * @returns {Promise<void>}
	 */
	async runInWorkers(benchmarkTasks, oneTaskPerProcess) {
		const cpuCount =
			typeof os.availableParallelism === "function"
				? os.availableParallelism()
				: os.cpus().length;
		const cpuWorkers = Math.max(1, cpuCount - 1);

		// Simulation is the only Valgrind mode here; its shadow memory is only
		// freed on process exit.
		const underValgrind = getCodspeedRunnerMode() === "simulation";

		// Bound the pool by RAM, not just cores: a Valgrind build peaks near 11 GiB,
		// so 16 GiB fits one worker; bigger runners auto-scale.
		const totalGiB = os.totalmem() / 1024 ** 3;
		const reserveGiB = 3;
		const perWorkerGiB = underValgrind ? 11 : 1.5;
		const memWorkers = Math.max(
			1,
			Math.floor((totalGiB - reserveGiB) / perWorkerGiB)
		);

		// Isolated tasks must not share a process with each other either, so the
		// pool is a single worker that restarts between tasks.
		const numWorkers = oneTaskPerProcess ? 1 : Math.min(cpuWorkers, memWorkers);

		const workerPool = /** @type {BenchmarkWorker} */ (
			new Worker(
				path.resolve(__dirname, "harness/benchmark/benchmark.worker.mjs"),
				{
					exposedMethods: ["run"],
					numWorkers,
					// Valgrind memory accumulates across builds and frees only on exit, so
					// recycle the worker after each task (`0` = always restart) to cap peak
					// at one build's footprint; otherwise a shard OOMs mid-run (exit 143).
					idleMemoryLimit: underValgrind || oneTaskPerProcess ? 0 : undefined,
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

			await this.finalizeResults(benchmarkTasks, settledResults);
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

		// A memory result depends on the heap its process holds, so shard
		// composition moved untouched benchmarks by tens of percent.
		await this.runInWorkers(
			benchmarkTasks,
			getCodspeedRunnerMode() === "memory"
		);
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
