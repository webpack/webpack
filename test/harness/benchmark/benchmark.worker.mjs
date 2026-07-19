import { writeFile } from "fs";
import fs from "fs/promises";
import { Session } from "inspector";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import {
	InstrumentHooks,
	getCodspeedRunnerMode,
	getGitDir,
	mongoMeasurement,
	setupCore,
	teardownCore
} from "@codspeed/core";
import { Bench, hrtimeNow } from "tinybench";

/** @typedef {import("tinybench").Task} TinybenchTask */
/** @typedef {import("tinybench").Fn} Fn */
/** @typedef {import("tinybench").FnOptions} FnOptions */
/** @typedef {import("tinybench").Statistics} TinybenchStatistics */
/** @typedef {TinybenchTask & { collectBy?: string }} Task */

/** @typedef {import("../../..")} Webpack */
/** @typedef {import("../../..").Configuration} Configuration */
/** @typedef {import("../../..").Stats} Stats */
/** @typedef {import("../../..").Watching} Watching */
/** @typedef {import("../../BenchmarkTestCases.benchmark.mjs").Scenario} Scenario */
/** @typedef {import("../../BenchmarkTestCases.benchmark.mjs").Baseline} Baseline */
/** @typedef {import("../../BenchmarkTestCases.benchmark.mjs").BenchmarkTask} BenchmarkTask */

/**
 * @typedef {object} ResultExtra
 * @property {string=} collectBy benchmark name and scenario, groups HEAD with BASE
 * @property {string} text formatted result line
 * @property {number} minConfidence lower confidence bound
 * @property {number} maxConfidence upper confidence bound
 */

/** @typedef {TinybenchStatistics & ResultExtra} Result */

/**
 * @typedef {object} BenchmarkResult
 * @property {string} benchmark benchmark name
 * @property {string} scenario scenario name
 * @property {Result[]} results per-task results
 */

/**
 * @typedef {object} BenchmarkWorkerMethods
 * @property {typeof run} run run one benchmark task
 */

const GENERATE_PROFILE = typeof process.env.PROFILE !== "undefined";
const codspeedRunnerMode = getCodspeedRunnerMode();

/** @type {string} */
let baseOutputPath;
/** @type {string | undefined} */
let rootCallingFile;

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
	// Prefer the path forwarded by the orchestrator; the stack walk fails once
	// this module runs inside a jest-worker child (the caller frame is gone).
	if (rootCallingFile) return rootCallingFile;

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
 * @param {string} callingFile root calling file
 * @returns {string} task URI
 */
function getTaskUri(bench, taskName, callingFile) {
	const uriMap = taskUriMap.get(bench);
	return uriMap?.get(taskName)?.uri || `${callingFile}::${taskName}`;
}

/**
 * @param {Bench} bench bench
 * @returns {Promise<Bench>} modifier bench
 */
const withCodSpeed = async (bench) => {
	if (codspeedRunnerMode === "disabled") {
		return bench;
	}

	const rawAdd = bench.add;
	const uriMap = getOrCreateUriMap(bench);

	const releaseClosuresAfterMeasure = codspeedRunnerMode === "memory";
	const NO_OP_FN = () => {};

	bench.add = (name, fn, options) => {
		const callingFile = getCallingFile();
		let uri = callingFile;
		if (bench.name !== undefined) {
			uri += `::${bench.name}`;
		}
		uri += `::${name}`;
		uriMap.set(name, { uri, fn, options });
		if (releaseClosuresAfterMeasure) {
			return rawAdd.bind(bench)(name, NO_OP_FN, {});
		}
		return rawAdd.bind(bench)(name, fn, options);
	};
	const callingFile = getCallingFile();

	if (codspeedRunnerMode === "simulation" || codspeedRunnerMode === "memory") {
		// Memory mode counts allocations in the instrumented region. With `--no-opt`
		// (required by CodSpeed analysis mode), JIT stabilization isn't a factor,
		// so 2 warmup runs are enough to populate require.cache, webpack lazy
		// singletons, and V8 hidden classes. More warmup just bloats the heap with
		// garbage that the pre-measurement drain has to clean up, raising the
		// chance of an in-measurement GC and introducing variance across PRs that
		// would otherwise touch identical code paths.
		const warmupIterations =
			codspeedRunnerMode === "memory" ? 2 : bench.iterations - 1;

		const setupBenchRun = () => {
			setupCore();
			console.log(
				`[CodSpeed] running with @codspeed/tinybench (${codspeedRunnerMode} mode, ${warmupIterations} warmup iterations)`
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
			let { fn, options } =
				/** @type {TaskMeta} */
				(uriMap.get(name));

			// Custom setup
			await bench.setup?.(task, "run");

			await options?.beforeAll?.call(task, "run");

			if (
				codspeedRunnerMode === "simulation" ||
				codspeedRunnerMode === "memory"
			) {
				// Custom warmup
				// We don't run `optimizeFunction` because our function is never optimized, instead we just warmup webpack.
				// Memory mode also needs warmup so the first measured sample isn't
				// polluted by module loading, lazy webpack init, and JIT shape transitions.
				const samples = [];

				while (samples.length < warmupIterations) {
					samples.push(await iterationAsync(task, name));
				}
			}

			await options?.beforeEach?.call(task, "run");
			await mongoMeasurement.start(uri);
			// Drain heap before the instrumented region so allocations from the
			// warmup runs aren't attributed to the measured sample (especially
			// under massif). One GC can leave promoted-but-unreachable objects
			// pending finalization; finalizers themselves can allocate. Loop
			// `gc -> microtask` three times so each GC's finalizers get a chance
			// to run and any garbage they produce is collected on the next pass,
			// then drain pending IO with `setImmediate`, then one final GC to
			// catch anything the IO callbacks left behind.
			for (let i = 0; i < 3; i++) {
				global.gc?.();
				await new Promise((resolve) => {
					queueMicrotask(() => resolve(undefined));
				});
			}
			await new Promise((resolve) => {
				setImmediate(resolve);
			});
			global.gc?.();
			await wrapWithInstrumentHooksAsync(wrapFunctionWithFrame(fn, true), uri);
			await mongoMeasurement.stop(uri);
			await options?.afterEach?.call(task, "run");
			console.log(`[Codspeed] ✔ Measured ${uri}`);
			await options?.afterAll?.call(task, "run");

			// Custom teardown
			await bench.teardown?.(task, "run");

			logTaskCompletion(uri, taskCompletionMessage());

			// Release this task's closures
			fn = NO_OP_FN;
			options = undefined;
			uriMap.delete(name);
			for (let i = 0; i < 3; i++) {
				global.gc?.();
				await new Promise((resolve) => {
					queueMicrotask(() => resolve(undefined));
				});
			}
			await new Promise((resolve) => {
				setImmediate(resolve);
			});
			global.gc?.();
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
			let { fn, options } =
				/** @type {TaskMeta} */
				(uriMap.get(name));

			// Custom setup
			bench.setup?.(task, "run");

			options?.beforeAll?.call(task, "run");

			if (
				codspeedRunnerMode === "simulation" ||
				codspeedRunnerMode === "memory"
			) {
				// Custom warmup — see the async path for rationale.
				const samples = [];

				while (samples.length < warmupIterations) {
					samples.push(iteration(task, name));
				}
			}

			options?.beforeEach?.call(task, "run");

			// Multiple GC passes so finalization (and any allocations finalizers
			// trigger) doesn't leak into the measured sample. The sync path has no
			// microtask queue to drain, so we just chain GCs.
			for (let i = 0; i < 4; i++) {
				global.gc?.();
			}
			wrapWithInstrumentHooks(wrapFunctionWithFrame(fn, false), uri);

			options?.afterEach?.call(task, "run");
			console.log(`[Codspeed] ✔ Measured ${uri}`);
			options?.afterAll?.call(task, "run");

			// Custom teardown
			bench.teardown?.(task, "run");

			logTaskCompletion(uri, taskCompletionMessage());

			// Release this task's closures
			fn = NO_OP_FN;
			options = undefined;
			uriMap.delete(name);
			for (let i = 0; i < 4; i++) {
				global.gc?.();
			}
		};

		/**
		 * @returns {Task[]} tasks
		 */
		const finalizeAsyncRun = () => finalizeBenchRun();
		/**
		 * @returns {Task[]} tasks
		 */
		const finalizeSyncRun = () => finalizeBenchRun();

		/**
		 * Run a task's per-task hooks plus one un-instrumented iteration. Used
		 * as a global prime pass for memory mode so module loads, V8
		 * hidden-class transitions, and inline-cache fills happen before any
		 * measurement — removing the cross-task order-dependence that causes
		 * the same benchmark to report different allocation counts across PRs.
		 *
		 * Intentionally skipped here: bench-level `setup` / `teardown`,
		 * `beforeEach` / `afterEach`, `mongoMeasurement.start/stop`, and
		 * `InstrumentHooks.startBenchmark/stopBenchmark`. Those belong to the
		 * measurement loop and would either double-instrument or skew the
		 * measured run if invoked here. `beforeAll` / `afterAll` are included
		 * because they own setup/teardown that the iteration itself depends on
		 * (e.g. the watch task opens its watcher in `beforeAll`).
		 * @param {Task} task task
		 * @returns {Promise<void>}
		 */
		const primeTaskAsync = async (task) => {
			const meta = uriMap.get(task.name);
			if (!meta) return;
			await meta.options?.beforeAll?.call(task, "warmup");
			try {
				const { peak, marginal } = await sampleHeapPeak(() =>
					iterationAsync(task, task.name)
				);
				const uri = getTaskUri(bench, task.name, callingFile);
				console.log(
					`[Memory] ${uri} peakHeapUsed=${formatBytes(peak)} marginal=${formatBytes(marginal)}`
				);
			} finally {
				await meta.options?.afterAll?.call(task, "warmup");
			}
		};

		/**
		 * Sync version of primeTaskAsync — see that docstring for what is and
		 * isn't included.
		 * @param {Task} task task
		 */
		const primeTaskSync = (task) => {
			const meta = uriMap.get(task.name);
			if (!meta) return;
			meta.options?.beforeAll?.call(task, "warmup");
			try {
				iteration(task, task.name);
			} finally {
				meta.options?.afterAll?.call(task, "warmup");
			}
		};

		bench.run = async () => {
			setupBenchRun();

			if (codspeedRunnerMode === "memory") {
				console.log(
					`[CodSpeed] memory mode: priming ${bench.tasks.length} tasks before measurement.`
				);
				for (const task of bench.tasks) {
					await primeTaskAsync(task);
				}
				// Drain heap accumulated by the prime pass so it can't leak
				// into the first measurement.
				for (let i = 0; i < 4; i++) {
					global.gc?.();
					await new Promise((resolve) => {
						queueMicrotask(() => resolve(undefined));
					});
				}
				await new Promise((resolve) => {
					setImmediate(resolve);
				});
				global.gc?.();
			}

			for (const task of bench.tasks) {
				const uri = getTaskUri(bench, task.name, callingFile);
				await runTaskAsync(task, task.name, uri);
			}

			return finalizeAsyncRun();
		};

		bench.runSync = () => {
			setupBenchRun();

			if (codspeedRunnerMode === "memory") {
				console.log(
					`[CodSpeed] memory mode: priming ${bench.tasks.length} tasks before measurement.`
				);
				for (const task of bench.tasks) {
					primeTaskSync(task);
				}
				for (let i = 0; i < 4; i++) {
					global.gc?.();
				}
			}

			for (const task of bench.tasks) {
				const uri = getTaskUri(bench, task.name, callingFile);
				runTaskSync(task, task.name, uri);
			}

			return finalizeSyncRun();
		};
	} else if (codspeedRunnerMode === "walltime") {
		// We don't need it
	}

	return bench;
};

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

/**
 * @param {number} bytes bytes
 * @returns {string} formatted size
 */
function formatBytes(bytes) {
	return `${(bytes / 1024 ** 2).toFixed(2)} MiB`;
}

/**
 * Peak `heapUsed` during `fn`, sampled on the event loop. CodSpeed memory mode
 * counts allocations in an already-warmed heap, so peak-RSS wins stay invisible;
 * this tracks the live-set high-water mark. Called only from the un-instrumented
 * prime pass so it can't pollute the measured region. `heapUsed` not `rss`: the
 * shared process never returns arena pages, so `rss` isn't per-task comparable.
 * @param {() => Promise<unknown>} fn compile to measure
 * @returns {Promise<{ peak: number, marginal: number }>} peak and marginal live bytes
 */
async function sampleHeapPeak(fn) {
	global.gc?.();
	const baseline = process.memoryUsage().heapUsed;
	let peak = baseline;
	const timer = setInterval(() => {
		const { heapUsed } = process.memoryUsage();
		if (heapUsed > peak) peak = heapUsed;
	}, 4);
	timer.unref?.();
	try {
		await fn();
	} finally {
		clearInterval(timer);
	}
	const end = process.memoryUsage().heapUsed;
	if (end > peak) peak = end;
	return { peak, marginal: peak - baseline };
}

/**
 * @param {string} test test
 * @param {Baseline} baseline baseline
 * @param {Configuration} realConfig real configuration
 * @param {Scenario} scenario scenario
 * @param {string} testDirectory test directory
 * @returns {Configuration} built configuration
 */
function buildConfiguration(test, baseline, realConfig, scenario, testDirectory) {
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
 * @param {object} params params
 * @param {Bench} params.bench bench
 * @param {string} params.taskName task name
 * @param {string} params.collectBy collect-by key
 * @param {Webpack} params.webpack webpack
 * @param {Configuration} params.config config
 * @returns {void}
 */
function addBuildBench({ bench, taskName, collectBy, webpack, config }) {
	bench.add(
		taskName,
		async () => {
			await (GENERATE_PROFILE
				? withProfiling(taskName, () => runWebpack(webpack, config))
				: runWebpack(webpack, config));
		},
		{
			beforeEach(mode) {
				console.time(`Time (${mode} mode): ${taskName}`);
			},
			afterEach(mode) {
				console.timeEnd(`Time (${mode} mode): ${taskName}`);
			},
			beforeAll() {
				/** @type {Task} */
				(this).collectBy = collectBy;
			}
		}
	);
}

/**
 * @param {object} params params
 * @param {Bench} params.bench bench
 * @param {string} params.taskName task name
 * @param {string} params.collectBy collect-by key
 * @param {Webpack} params.webpack webpack
 * @param {Configuration} params.config config
 * @returns {Promise<void>}
 */
async function addWatchBench({ bench, taskName, collectBy, webpack, config }) {
	if (!config.entry) {
		throw new Error(`No entry for "${taskName}" bench.`);
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
		taskName,
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
				console.time(`Time (${mode} mode): ${taskName}`);
			},
			afterEach(mode) {
				console.timeEnd(`Time (${mode} mode): ${taskName}`);
			},
			async beforeAll() {
				/** @type {Task} */
				(this).collectBy = collectBy;

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
						taskName,
						async () =>
							(watching = await runWatch(webpack, config, watchCallback))
					);
				} else {
					watching = await runWatch(webpack, config, watchCallback);
				}

				// Make an extra fs call to warm up filesystem caches
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
}

/**
 * Create the CodSpeed-wrapped bench shared by one or many benchmarks.
 * @returns {Promise<Bench>} bench
 */
function createBenchInstance() {
	return withCodSpeed(
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
}

/**
 * Push each task's latency stats into `results` on every tinybench cycle.
 * CodSpeed analysis modes don't emit cycles, so this only fills in for
 * disabled/walltime runs — matching the pre-parallel harness.
 * @param {Bench} bench bench
 * @param {Result[]} results result sink
 * @returns {void}
 */
function attachResultCollector(bench, results) {
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

		console.log(`Cycle: ${task.name} ${confidence} (${runs} runs sampled)`);

		results.push({
			...latency,
			collectBy: /** @type {Task} */ (task).collectBy,
			text,
			minConfidence,
			maxConfidence
		});
	});
}

/**
 * Register one benchmark task's benches onto `bench`. `-unit` benchmarks
 * register their own tasks against the current lib; others add one build/watch
 * bench per baseline.
 * @param {Bench} bench bench
 * @param {BenchmarkTask} task benchmark task
 * @param {string} casesPath benchmark cases directory
 * @returns {Promise<void>}
 */
async function registerBenchmark(bench, task, casesPath) {
	const { benchmark, scenario, baselines } = task;
	const LAST_COMMIT = typeof process.env.LAST_COMMIT !== "undefined";
	const testDirectory = path.join(casesPath, benchmark);

	if (benchmark.includes("-unit")) {
		// Unit benchmarks register their own tasks against the current lib; they
		// have no scenarios or baselines, so no HEAD/BASE comparison is emitted.
		const benchmarkPath = path.resolve(testDirectory, "index.bench.mjs");
		const registerBenchmarks = await import(`${pathToFileURL(benchmarkPath)}`);

		registerBenchmarks.default(bench);
		return;
	}

	if (!scenario) {
		throw new Error(`Missing scenario for benchmark "${benchmark}"`);
	}

	const realConfig = (
		await import(
			`${pathToFileURL(path.join(testDirectory, "webpack.config.mjs"))}`
		)
	).default;

	// Register HEAD then BASE sequentially so task order in `bench.tasks` is
	// deterministic; parallel registration would leak Promise-resolution order
	// into the shared-process state each measurement observes.
	for (const baseline of baselines) {
		const webpack = (
			await import(
				`${pathToFileURL(path.resolve(baseline.path, "./lib/index.js"))}`
			)
		).default;

		const config = buildConfiguration(
			benchmark,
			baseline,
			realConfig,
			scenario,
			testDirectory
		);

		const stringifiedScenario = JSON.stringify(scenario);
		const collectBy = `${benchmark}, scenario '${stringifiedScenario}'`;
		const taskName = `benchmark "${benchmark}", scenario '${stringifiedScenario}'${LAST_COMMIT ? "" : ` ${baseline.name} (${baseline.rev})`}`;
		const fullTaskName = `benchmark "${benchmark}", scenario '${stringifiedScenario}' ${baseline.name} ${baseline.rev ? `(${baseline.rev})` : ""}`;

		console.log(`Register: ${fullTaskName}`);

		const params = { bench, taskName, collectBy, webpack, config };

		await (scenario.watch ? addWatchBench(params) : addBuildBench(params));
	}
}

/**
 * Run one benchmark task in its own bench. Used by the jest-worker pool for
 * time/simulation runs, where per-process isolation is fine (and better) for
 * deterministic instruction counts.
 * @param {object} options options
 * @param {BenchmarkTask} options.task benchmark task
 * @param {string} options.casesPath benchmark cases directory
 * @param {string} options.baseOutputPath base output directory
 * @param {string=} options.callingFile harness path relative to the git root
 * @returns {Promise<BenchmarkResult>} benchmark result
 */
export async function run({
	task,
	casesPath,
	baseOutputPath: baseOutputPathArg,
	callingFile
}) {
	console.log(`Worker ${process.pid}: running ${task.id}`);

	baseOutputPath = baseOutputPathArg;
	rootCallingFile = callingFile;

	const bench = await createBenchInstance();

	/** @type {Result[]} */
	const results = [];
	attachResultCollector(bench, results);

	await registerBenchmark(bench, task, casesPath);
	await bench.run();

	return {
		benchmark: task.benchmark,
		scenario: task.scenario ? task.scenario.name : "unit",
		results
	};
}

/**
 * Run every task in one shared bench and process. Used for CodSpeed memory
 * mode: a single `Bench`, one global prime pass, one setup/teardown — identical
 * to the pre-parallel harness, so allocation counts stay stable and comparable
 * across PRs (per-benchmark benches shift them). Never used with the worker pool.
 * @param {object} options options
 * @param {BenchmarkTask[]} options.tasks benchmark tasks
 * @param {string} options.casesPath benchmark cases directory
 * @param {string} options.baseOutputPath base output directory
 * @param {string=} options.callingFile harness path relative to the git root
 * @returns {Promise<BenchmarkResult>} combined benchmark result
 */
export async function runAll({
	tasks,
	casesPath,
	baseOutputPath: baseOutputPathArg,
	callingFile
}) {
	console.log(`Process ${process.pid}: running ${tasks.length} task(s) in one bench`);

	baseOutputPath = baseOutputPathArg;
	rootCallingFile = callingFile;

	const bench = await createBenchInstance();

	/** @type {Result[]} */
	const results = [];
	attachResultCollector(bench, results);

	// Register every task up front so the memory-mode global prime pass warms
	// all of them before any measurement (removes cross-task order dependence).
	for (const task of tasks) {
		await registerBenchmark(bench, task, casesPath);
	}

	await bench.run();

	return {
		benchmark: "all",
		scenario: "all",
		results
	};
}
