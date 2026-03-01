import { constants, writeFile } from "fs";
import fs from "fs/promises";
import { Session } from "inspector";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import {
	InstrumentHooks,
	getCodspeedRunnerMode,
	getGitDir,
	getV8Flags,
	mongoMeasurement,
	setupCore,
	teardownCore
} from "@codspeed/core";
import { simpleGit } from "simple-git";
import { Bench, hrtimeNow } from "tinybench";

/** @typedef {import("tinybench").Task} TinybenchTask */
/** @typedef {import("tinybench").Fn} Fn */
/** @typedef {import("tinybench").FnOptions} FnOptions */
/** @typedef {import("../types.d.ts")} Webpack */
/** @typedef {import("../types.d.ts").Configuration} Configuration */
/** @typedef {import("../types.d.ts").Stats} Stats */
/** @typedef {import("../types.d.ts").Watching} Watching */

/** @typedef {TinybenchTask & { collectBy?: string }} Task */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootPath = path.join(__dirname, "..");
const git = simpleGit(rootPath);

const REV_LIST_REGEXP = /^([a-f0-9]+)\s*([a-f0-9]+)\s*([a-f0-9]+)?\s*$/;

const checkV8Flags = () => {
	const requiredFlags = getV8Flags();
	const actualFlags = process.execArgv;
	const missingFlags = requiredFlags.filter(
		(flag) => !actualFlags.includes(flag)
	);
	if (missingFlags.length > 0) {
		console.warn(`Missing required flags: ${missingFlags.join(", ")}`);
	}
};

checkV8Flags();

const LAST_COMMIT = typeof process.env.LAST_COMMIT !== "undefined";
const GENERATE_PROFILE = typeof process.env.PROFILE !== "undefined";

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
 * @param {number} n number of runs
 * @returns {number} distribution
 */
function tDistribution(n) {
	if (n === 0) {
		return 1;
	}

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

/** @typedef {{ name: string, rev?: string, webpack: (() => Promise<Webpack>) }} Baseline */

/** @type {Baseline[]} */
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
						pathToFileURL(
							path.resolve(baselinePath, "./lib/index.js")
						).toString()
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
		addBaseline();
	}
}

const baseOutputPath = path.join(__dirname, "js", "benchmark");

/**
 * @param {string} test test
 * @param {Baseline} baseline baseline
 * @param {Configuration} realConfig real configuration
 * @param {Scenario} scenario scenario
 * @param {string} testDirectory test directory
 * @returns {Configuration} built configuration
 */
function buildConfiguration(
	test,
	baseline,
	realConfig,
	scenario,
	testDirectory
) {
	const { watch, ...rest } = scenario;
	const config = structuredClone({ ...realConfig, ...rest });

	config.entry =
		typeof config.entry === "string"
			? path.resolve(
					testDirectory,
					config.entry
						? /\.(?:c|m)?js$/.test(config.entry)
							? config.entry
							: `${config.entry}.js`
						: "./index.js"
				)
			: config.entry;
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
	if (
		config.cache &&
		typeof config.cache !== "boolean" &&
		config.cache.type === "filesystem"
	) {
		config.cache.cacheDirectory = path.resolve(config.output.path, ".cache");
	}
	if (watch) {
		config.cache = {
			type: "memory",
			maxGenerations: 1
		};
	}
	return config;
}

/**
 * @param {string} filename filename
 * @returns {string} sanitized filename
 */
function sanitizeFilename(filename) {
	// Replace invalid filesystem characters with underscores
	return filename
		.replace(/[<>:"/\\|?*]/g, "_")
		.replace(/[\u0000-\u001F\u0080-\u009F]/g, "_")
		.replace(/^\.+/, "_")
		.replace(/\.+$/, "_")
		.replace(/\s+/g, "_")
		.slice(0, 200); // Limit filename length
}

/**
 * @param {string} name name
 * @param {() => void} fn function
 * @returns {Promise<void>} function wrapper in profiling code
 */
async function withProfiling(name, fn) {
	// Ensure the profiles directory exists
	await fs.mkdir(path.join(baseOutputPath, "profiles"), { recursive: true });

	const session = new Session();
	session.connect();

	// Enable and start profiling
	await new Promise(
		/**
		 * @param {(val: void) => void} resolve resolve
		 * @param {(err?: Error) => void} reject reject
		 */
		(resolve, reject) => {
			session.post("Profiler.enable", (err) => {
				if (err) return reject(err);
				session.post("Profiler.start", (err) => {
					if (err) return reject(err);
					resolve();
				});
			});
		}
	);

	// Run the benchmarked function
	// No need to `console.time`, it'll be included in the
	// CPU Profile.
	await fn();

	// Stop profiling and get the CPU profile
	const profile = await new Promise((resolve, reject) => {
		session.post("Profiler.stop", (err, { profile }) => {
			if (err) return reject(err);
			resolve(profile);
		});
	});

	session.disconnect();

	const outputFile = `${sanitizeFilename(name)}-${Date.now()}.cpuprofile`;

	await fs.writeFile(
		path.join(baseOutputPath, "profiles", outputFile),
		JSON.stringify(profile),
		"utf8"
	);

	console.log(`CPU profile saved to ${outputFile}`);
}

/**
 * @param {Webpack} webpack webpack
 * @param {Configuration} config configuration
 * @returns {Promise<void>} watching
 */
function runWebpack(webpack, config) {
	return new Promise(
		/**
		 * @param {(value: void) => void} resolve resolve
		 * @param {(err?: Error) => void} reject reject
		 */
		(resolve, reject) => {
			const compiler = webpack(config);
			compiler.run((err, stats) => {
				if (err) return reject(err);
				if (stats && (stats.hasWarnings() || stats.hasErrors())) {
					return reject(new Error(stats.toString()));
				}

				compiler.close((closeErr) => {
					if (closeErr) return reject(closeErr);
					if (stats) stats.toString(); // Force stats computation
					resolve();
				});
			});
		}
	);
}

/**
 * @param {Webpack} webpack webpack
 * @param {Configuration} config configuration
 * @param {(err: Error | null, stats?: Stats) => void} callback callback
 * @returns {Promise<Watching>} watching
 */
async function runWatch(webpack, config, callback) {
	const compiler = webpack(config);
	return /** @type {Watching} */ (compiler.watch({}, callback));
}

/** @typedef {{ name: string, mode: "development" | "production", watch?: boolean }} Scenario */

/** @type {Scenario[]} */
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

/** @typedef {string & { prepareStackTrace: string, stackTraceLimit: string }} V8StackTrace */

/**
 * @param {Fn=} belowFn below function
 * @returns {NodeJS.CallSite[]} V8 stack trace
 */
function getStackTrace(belowFn) {
	const oldLimit = Error.stackTraceLimit;
	Error.stackTraceLimit = Infinity;
	/** @type {{ stack?: NodeJS.CallSite[] }} */
	const dummyObject = {};
	const v8Handler = Error.prepareStackTrace;
	Error.prepareStackTrace = (dummyObject, v8StackTrace) => v8StackTrace;
	Error.captureStackTrace(dummyObject, belowFn || getStackTrace);
	const v8StackTrace = /** @type {NodeJS.CallSite[]} */ (dummyObject.stack);
	Error.prepareStackTrace = v8Handler;
	Error.stackTraceLimit = oldLimit;
	return v8StackTrace;
}

function getCallingFile() {
	const stack = getStackTrace();
	let callingFile = /** @type {string} */ (stack[2].getFileName()); // [here, withCodSpeed, actual caller]
	const gitDir = getGitDir(callingFile);
	if (gitDir === undefined) {
		throw new Error("Could not find a git repository");
	}
	if (callingFile.startsWith("file://")) {
		callingFile = fileURLToPath(callingFile);
	}
	return path.relative(gitDir, callingFile);
}

/** @typedef {{ uri: string, fn: Fn, options: FnOptions | undefined }} TaskMeta */
/** @typedef {Map<string, TaskMeta>} URIMap */

/** @type {WeakMap<Bench, URIMap>} */
const taskUriMap = new WeakMap();

/**
 * @param {Bench} bench bench
 * @returns {URIMap} URI map
 */
function getOrCreateUriMap(bench) {
	let uriMap = taskUriMap.get(bench);
	if (!uriMap) {
		/** @type {URIMap} */
		uriMap = new Map();
		taskUriMap.set(bench, uriMap);
	}
	return uriMap;
}

/**
 * @param {Bench} bench bench
 * @param {string} taskName task name
 * @param {string} rootCallingFile root calling file
 * @returns {string} task URI
 */
function getTaskUri(bench, taskName, rootCallingFile) {
	const uriMap = taskUriMap.get(bench);
	return uriMap?.get(taskName)?.uri || `${rootCallingFile}::${taskName}`;
}

/**
 * @param {Bench} bench bench
 * @returns {Promise<Bench>} modifier bench
 */
const withCodSpeed = async (bench) => {
	const codspeedRunnerMode = getCodspeedRunnerMode();

	if (codspeedRunnerMode === "disabled") {
		return bench;
	}

	const rawAdd = bench.add;
	const uriMap = getOrCreateUriMap(bench);
	bench.add = (name, fn, options) => {
		const callingFile = getCallingFile();
		let uri = callingFile;
		if (bench.name !== undefined) {
			uri += `::${bench.name}`;
		}
		uri += `::${name}`;
		uriMap.set(name, { uri, fn, options });
		return rawAdd.bind(bench)(name, fn, options);
	};
	const rootCallingFile = getCallingFile();

	if (codspeedRunnerMode === "simulation" || codspeedRunnerMode === "memory") {
		const setupBenchRun = () => {
			setupCore();
			console.log(
				`[CodSpeed] running with @codspeed/tinybench (${codspeedRunnerMode} mode)`
			);
		};
		const finalizeBenchRun = () => {
			teardownCore();
			console.log(`[CodSpeed] Done running ${bench.tasks.length} benches.`);
			return bench.tasks;
		};

		/**
		 * @param {Fn} fn function
		 * @param {boolean} isAsync true if async function, otherwise false
		 * @returns {() => void} function wrapped in codspeed root frame
		 */
		const wrapFunctionWithFrame = (fn, isAsync) => {
			if (isAsync) {
				return async function __codspeed_root_frame__() {
					await fn();
				};
			}

			return function __codspeed_root_frame__() {
				fn();
			};
		};

		/**
		 * @param {string} uri URI
		 * @param {string} status status
		 */
		const logTaskCompletion = (uri, status) => {
			console.log(`[CodSpeed] ${status} ${uri}`);
		};

		const taskCompletionMessage = () =>
			InstrumentHooks.isInstrumented() ? "Measured" : "Checked";

		/**
		 * @param {Task} task task
		 * @param {string} name task name
		 * @returns {Promise<[number, number] | void>} start and end time
		 */
		const iterationAsync = async (task, name) => {
			const { fn, options } =
				/** @type {TaskMeta} */
				(uriMap.get(name));

			try {
				await options?.beforeEach?.call(task, "run");
				const start = bench.now();
				await fn();
				const end = bench.now() - start || 0;
				await options?.afterEach?.call(task, "run");
				return [start, end];
			} catch (err) {
				if (bench.throws) {
					throw err;
				}
			}
		};

		/**
		 * @param {Fn} fn function
		 * @param {string} uri URI
		 * @returns {Promise<ReturnType<Fn>>} result with instrument hooks
		 */
		const wrapWithInstrumentHooksAsync = async (fn, uri) => {
			InstrumentHooks.startBenchmark();
			const result = await fn();
			InstrumentHooks.stopBenchmark();
			InstrumentHooks.setExecutedBenchmark(process.pid, uri);
			return result;
		};

		/**
		 * @param {Task} task task
		 * @param {string} name task name
		 * @param {string} uri URI
		 */
		const runTaskAsync = async (task, name, uri) => {
			const { fn, options } =
				/** @type {TaskMeta} */
				(uriMap.get(name));

			// Custom setup
			await bench.setup?.(task, "run");

			await options?.beforeAll?.call(task, "run");

			if (codspeedRunnerMode === "simulation") {
				// Custom warmup
				// We don't run `optimizeFunction` because our function is never optimized, instead we just warmup webpack
				const samples = [];

				while (samples.length < bench.iterations - 1) {
					samples.push(await iterationAsync(task, name));
				}
			}

			await options?.beforeEach?.call(task, "run");
			await mongoMeasurement.start(uri);
			global.gc?.();
			await wrapWithInstrumentHooksAsync(wrapFunctionWithFrame(fn, true), uri);
			await mongoMeasurement.stop(uri);
			await options?.afterEach?.call(task, "run");
			console.log(`[Codspeed] ✔ Measured ${uri}`);
			await options?.afterAll?.call(task, "run");

			// Custom teardown
			await bench.teardown?.(task, "run");

			logTaskCompletion(uri, taskCompletionMessage());
		};

		/**
		 * @param {Task} task task
		 * @param {string} name task
		 * @returns {[number, number] | undefined} start and end time
		 */
		const iteration = (task, name) => {
			const { fn, options } =
				/** @type {TaskMeta} */
				(uriMap.get(name));

			try {
				options?.beforeEach?.call(task, "run");
				const start = bench.now();
				fn();
				const end = bench.now() - start || 0;
				options?.afterEach?.call(task, "run");
				return [start, end];
			} catch (err) {
				if (bench.throws) {
					throw err;
				}
			}
		};

		/**
		 * @param {Fn} fn function
		 * @param {string} uri URI
		 * @returns {ReturnType<Fn>} result with instrument hooks
		 */
		const wrapWithInstrumentHooks = (fn, uri) => {
			InstrumentHooks.startBenchmark();
			const result = fn();
			InstrumentHooks.stopBenchmark();
			InstrumentHooks.setExecutedBenchmark(process.pid, uri);
			return result;
		};

		/**
		 * @param {Task} task task
		 * @param {string} name task name
		 * @param {string} uri URI
		 */
		const runTaskSync = (task, name, uri) => {
			const { fn, options } =
				/** @type {TaskMeta} */
				(uriMap.get(name));

			// Custom setup
			bench.setup?.(task, "run");

			options?.beforeAll?.call(task, "run");

			if (codspeedRunnerMode === "simulation") {
				// Custom warmup
				const samples = [];

				while (samples.length < bench.iterations - 1) {
					samples.push(iteration(task, name));
				}
			}

			options?.beforeEach?.call(task, "run");

			wrapWithInstrumentHooks(wrapFunctionWithFrame(fn, false), uri);

			options?.afterEach?.call(task, "run");
			console.log(`[Codspeed] ✔ Measured ${uri}`);
			options?.afterAll?.call(task, "run");

			// Custom teardown
			bench.teardown?.(task, "run");

			logTaskCompletion(uri, taskCompletionMessage());
		};

		/**
		 * @returns {Task[]} tasks
		 */
		const finalizeAsyncRun = () => finalizeBenchRun();
		/**
		 * @returns {Task[]} tasks
		 */
		const finalizeSyncRun = () => finalizeBenchRun();

		bench.run = async () => {
			setupBenchRun();

			for (const task of bench.tasks) {
				const uri = getTaskUri(bench, task.name, rootCallingFile);
				await runTaskAsync(task, task.name, uri);
			}

			return finalizeAsyncRun();
		};

		bench.runSync = () => {
			setupBenchRun();

			for (const task of bench.tasks) {
				const uri = getTaskUri(bench, task.name, rootCallingFile);
				runTaskSync(task, task.name, uri);
			}

			return finalizeSyncRun();
		};
	} else if (codspeedRunnerMode === "walltime") {
		// We don't need it
	}

	return bench;
};

const bench = await withCodSpeed(
	new Bench({
		now: hrtimeNow,
		throws: true,
		warmup: true,
		warmupIterations: 2,
		iterations: 8,
		setup(task, mode) {
			if (!task) {
				return;
			}

			console.log(`Setup (${mode} mode): ${task.name}`);
		},
		teardown(task, mode) {
			if (!task) {
				return;
			}

			console.log(`Teardown (${mode} mode): ${task.name}`);
		}
	})
);

/**
 * @param {Bench} bench bench
 * @param {string} test test
 * @param {Baseline[]} baselines baselines
 * @returns {Promise<void>}
 */
async function registerSuite(bench, test, baselines) {
	const testDirectory = path.join(casesPath, test);
	const optionsPath = path.resolve(testDirectory, "options.mjs");

	/** @type {{ setup?: () => Promise<void> }} */
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
			`${pathToFileURL(path.join(testDirectory, "webpack.config.mjs"))}`
		)
	).default;

	await Promise.all(
		baselines.map(async (baseline) => {
			const webpack = await baseline.webpack();

			await Promise.all(
				scenarios.map(async (scenario) => {
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
						if (!config.entry) {
							throw new Error(`No entry for "${fullBenchName}" bench.`);
						}

						const entry = path.resolve(/** @type {string} */ (config.entry));
						const originalEntryContent = await fs.readFile(entry, "utf8");

						/** @type {Watching | undefined} */
						let watching;
						/** @type {(err: Error | null, stats?: Stats) => void} */
						let next;

						/**
						 * @param {Error | null} err err
						 * @param {Stats=} stats stats
						 */
						const watchCallback = (err, stats) => {
							if (next) {
								next(err, stats);
							}
						};

						bench.add(
							benchName,
							async () => {
								/** @type {((value?: void) => void)} */
								let resolve;
								/** @type {((err: Error | null) => void)} */
								let reject;

								const promise = new Promise((res, rej) => {
									resolve = res;
									reject = rej;
								});

								next = (err, stats) => {
									if (err || !stats) {
										reject(err);
										return;
									}

									if (stats.hasWarnings() || stats.hasErrors()) {
										reject(new Error(stats.toString()));
										return;
									}

									// Construct and print stats to be more accurate with real life projects
									stats.toString();
									resolve();
								};

								await new Promise(
									/**
									 * @param {(value?: void) => void} resolve resolve
									 * @param {(err: Error) => void} reject reject
									 */
									(resolve, reject) => {
										writeFile(
											entry,
											`${originalEntryContent};console.log('watch test')`,
											(err) => {
												if (err) {
													reject(err);
													return;
												}

												resolve();
											}
										);
									}
								);

								await promise;
							},
							{
								beforeEach(mode) {
									console.time(`Time (${mode} mode): ${benchName}`);
								},
								afterEach(mode) {
									console.timeEnd(`Time (${mode} mode): ${benchName}`);
								},
								async beforeAll() {
									/** @type {Task} */
									(this).collectBy =
										`${test}, scenario '${stringifiedScenario}'`;

									/** @type {((value?: void) => void)} */
									let resolve;
									/** @type {((err: Error | null) => void)} */
									let reject;

									const promise = new Promise((res, rej) => {
										resolve = res;
										reject = rej;
									});

									next = (err, stats) => {
										if (err || !stats) {
											reject(err);
											return;
										}

										if (stats.hasWarnings() || stats.hasErrors()) {
											reject(new Error(stats.toString()));
											return;
										}

										// Construct and print stats to be more accurate with real life projects
										stats.toString();
										resolve();
									};

									if (GENERATE_PROFILE) {
										await withProfiling(
											benchName,
											async () =>
												(watching = await runWatch(
													webpack,
													config,
													watchCallback
												))
										);
									} else {
										watching = await runWatch(webpack, config, watchCallback);
									}

									// Make an extra fs call to warn up filesystem caches
									// Also wait a first run callback
									await new Promise(
										/**
										 * @param {(value?: void) => void} resolve resolve
										 * @param {(err: Error) => void} reject reject
										 */
										(resolve, reject) => {
											writeFile(
												entry,
												`${originalEntryContent};console.log('watch test')`,
												(err) => {
													if (err) {
														reject(err);
														return;
													}

													resolve();
												}
											);
										}
									);

									await promise;
								},
								async afterAll() {
									// Close watching
									await new Promise(
										/**
										 * @param {(value?: void) => void} resolve resolve
										 * @param {(err: Error) => void} reject reject
										 */
										(resolve, reject) => {
											if (watching) {
												watching.close((closeErr) => {
													if (closeErr) {
														reject(closeErr);
														return;
													}

													resolve();
												});
											}
										}
									);

									// Write original content
									await new Promise(
										/**
										 * @param {(value?: void) => void} resolve resolve
										 * @param {(err: Error) => void} reject reject
										 */
										(resolve, reject) => {
											writeFile(entry, originalEntryContent, (err) => {
												if (err) {
													reject(err);
													return;
												}

												resolve();
											});
										}
									);
								}
							}
						);
					} else {
						bench.add(
							benchName,
							async () => {
								if (GENERATE_PROFILE) {
									await withProfiling(benchName, () =>
										runWebpack(webpack, config)
									);
								} else {
									await runWebpack(webpack, config);
								}
							},
							{
								beforeEach(mode) {
									console.time(`Time (${mode} mode): ${benchName}`);
								},
								afterEach(mode) {
									console.timeEnd(`Time (${mode} mode): ${benchName}`);
								},
								beforeAll() {
									/** @type {Task} */
									(this).collectBy =
										`${test}, scenario '${stringifiedScenario}'`;
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
/** @type {string[]} */
const allBenchmarks = (await fs.readdir(casesPath))
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
const longBenchmarks = allBenchmarks.filter((item) => item.includes("-long"));
const i = Math.floor(benchmarks.length / longBenchmarks.length);

for (const [index, value] of longBenchmarks.entries()) {
	benchmarks.splice(index * i, 0, value);
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

/**
 * @template T
 * @param {T[]} array an array
 * @param {number} n number of chunks
 * @returns {T[][]} splitted to b chunks
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

const countOfBenchmarks = benchmarks.length;

if (countOfBenchmarks < shard[1]) {
	throw new Error(
		`Shard upper limit is more than count of benchmarks, count of benchmarks is ${countOfBenchmarks}, shard is ${shard[1]}`
	);
}

await Promise.all(
	splitToNChunks(benchmarks, shard[1])[shard[0] - 1].map((benchmark) =>
		registerSuite(bench, benchmark, baselines)
	)
);

/**
 * @param {number} value value
 * @param {number} precision precision
 * @param {number} fractionDigits fraction digits
 * @returns {string} formatted number
 */
function formatNumber(value, precision, fractionDigits) {
	return Math.abs(value) >= 10 ** precision
		? value.toFixed()
		: Math.abs(value) < 10 ** (precision - fractionDigits)
			? value.toFixed(fractionDigits)
			: value.toPrecision(precision);
}

const US_PER_MS = 10 ** 3;
const NS_PER_MS = 10 ** 6;

/**
 * @param {number} value time
 * @returns {string} formatted time
 */
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

bench.addEventListener("cycle", (event) => {
	const task = event.task;

	if (!task) {
		throw new Error("Can't find a task");
	}

	if (!task.result) {
		throw new Error("Can't find a task result");
	}

	if (task.result.state !== "completed") {
		throw new Error(`Task is not completed, state is ${task.result.state}`);
	}

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

	const collectBy = /** @type {Task} */ (task).collectBy;
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

bench.run();
