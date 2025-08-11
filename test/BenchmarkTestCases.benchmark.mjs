import { constants } from "fs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { Worker } from "jest-worker";
import { simpleGit } from "simple-git";

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

class BenchmarkRunner {
	constructor() {
		this.output = path.join(__dirname, "./js");
		this.baselinesPath = path.join(this.output, "benchmark-baselines");
		this.baseOutputPath = path.join(this.output, "benchmark");
		this.casesPath = path.join(__dirname, "benchmarkCases");
	}

	async initialize() {
		const baselineRevisions = await getBaselineRevs();
		try {
			await fs.mkdir(this.baselinesPath, { recursive: true });
		} catch (_err) {} // eslint-disable-line no-empty
		const baselines = [];

		for (const baselineInfo of baselineRevisions) {
			const baselineRevision = baselineInfo.rev;

			const baselinePath =
				baselineRevision === undefined
					? path.resolve(__dirname, "../")
					: path.resolve(this.baselinesPath, baselineRevision);

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

	async createWorkerPool(numWorkers = 4) {
		this.workerPool = new Worker(
			path.join(this.casesPath, "_helpers", "/benchmark.worker.mjs"),
			{
				exposedMethods: ["run"],
				numWorkers,
				forkOptions: { silent: false, execArgv: getV8Flags() }
			}
		);
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

		const allBenchmarkCases = (await fs.readdir(this.casesPath))
			.filter(
				(item) =>
					!item.includes("_") &&
					(FILTER ? FILTER.test(item) : true) &&
					(NEGATIVE_FILTER ? !NEGATIVE_FILTER.test(item) : true)
			)
			.sort((a, b) => a.localeCompare(b));

		const benchmarkCases = allBenchmarkCases.filter(
			(item) => !item.includes("-long")
		);
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

		function splitToNChunks(array, n) {
			const result = [];

			for (let i = n; i > 0; i--) {
				result.push(array.splice(0, Math.ceil(array.length / i)));
			}

			return result;
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

		function createBenchmarkTasks(benchmarks, scenarios, baselines) {
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

		const benchmarkTasks = createBenchmarkTasks(
			currentShardBenchmarkCases,
			scenarios,
			baselines
		);

		try {
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

	processResults(benchmarkResults) {
		const statsByTests = new Map();

		for (const benchmarkResult of benchmarkResults) {
			if (benchmarkResult.error) {
				console.error(
					`Error in ${benchmarkResult.taskId}:`,
					benchmarkResult.error
				);
				continue;
			}
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
}

new BenchmarkRunner().run();
