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
/** @typedef {import("tinybench").TaskResult} TinybenchTaskResult */
/** @typedef {import("tinybench").Statistics} TinybenchStatistics */
/** @typedef {import("tinybench").Bench} TinybenchBench */
/** @typedef {TinybenchTask & { collectBy?: string }} Task */

/** @typedef {import("../../../types.d.ts")} Webpack */
/** @typedef {import("../../../types.d.ts").Configuration} Configuration */
/** @typedef {import("../../../types.d.ts").Stats} Stats */
/** @typedef {import("../../../types.d.ts").Watching} Watching */
/** @typedef {import("../../../test/BenchmarkTestCases.benchmark.mjs").Scenario} Scenario */

/**
 * @typedef {object} TResult
 * @property {string} collectBy benchmark name and scenario name
 * @property {string} text benchmark result text
 * @property {number} minConfidence min confidence
 * @property {number} maxConfidence max confidence
 */

/**
 * @typedef {TinybenchStatistics & TResult} Result
 */

/**
 * @typedef {object} BenchmarkResult
 * @property {string} benchmark benchmark name
 * @property {string} scenario scenario name
 * @property {Result[]} results benchmark Result
 */

const GENERATE_PROFILE = typeof process.env.PROFILE !== "undefined";

let _baseOutputPath;

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
	await fs.mkdir(path.join(_baseOutputPath, "profiles"), { recursive: true });

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
		path.join(_baseOutputPath, "profiles", outputFile),
		JSON.stringify(profile),
		"utf8"
	);

	console.log(`CPU profile saved to ${outputFile}`);
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

/** @typedef {Map<string, string>} URIMap */

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
	return uriMap?.get(taskName) || `${rootCallingFile}::${taskName}`;
}

/**
 * @param {TinybenchBench} bench bench
 * @returns {Promise<TinybenchBench>} modifier bench
 */
const withCodSpeed = async (bench) => {
	const codspeedRunnerMode = getCodspeedRunnerMode();

	if (codspeedRunnerMode === "disabled") {
		return bench;
	}

	const rawAdd = bench.add;
	const uriMap = getOrCreateUriMap(bench);
	bench.add = (name, fn, opts) => {
		const callingFile = getCallingFile();
		let uri = callingFile;
		if (bench.name !== undefined) {
			uri += `::${bench.name}`;
		}
		uri += `::${name}`;
		uriMap.set(name, uri);
		return rawAdd.bind(bench)(name, fn, opts);
	};
	const rootCallingFile = getCallingFile();

	if (codspeedRunnerMode === "instrumented") {
		const setupBenchRun = () => {
			setupCore();
			console.log(
				"[CodSpeed] running with @codspeed/tinybench (instrumented mode)"
			);
		};
		const finalizeBenchRun = () => {
			teardownCore();
			console.log(`[CodSpeed] Done running ${bench.tasks.length} benches.`);
			return bench.tasks;
		};

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
		 * @returns {Promise<[number, number] | void>} start and end time
		 */
		const iterationAsync = async (task) => {
			// @ts-expect-error no public API
			const { fn, fnOpts } = task;

			try {
				await fnOpts.beforeEach?.call(task, "run");
				const start = bench.opts.now();
				await fn();
				const end = bench.opts.now() - start || 0;
				await fnOpts.afterEach?.call(this, "run");
				return [start, end];
			} catch (err) {
				if (bench.opts.throws) {
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
		 * @param {string} uri URI
		 */
		const runTaskAsync = async (task, uri) => {
			// @ts-expect-error no public API
			const { fnOpts, fn } = task;

			// Custom setup
			await bench.opts.setup?.(task, "run");

			await fnOpts?.beforeAll?.call(task, "run");

			// Custom warmup
			// We don't run `optimizeFunction` because our function is never optimized, instead we just warmup webpack
			const samples = [];

			while (samples.length < bench.opts.iterations - 1) {
				samples.push(await iterationAsync(task));
			}

			await fnOpts?.beforeEach?.call(task, "run");
			await mongoMeasurement.start(uri);
			global.gc?.();
			await wrapWithInstrumentHooksAsync(wrapFunctionWithFrame(fn, true), uri);
			await mongoMeasurement.stop(uri);
			await fnOpts?.afterEach?.call(task, "run");
			console.log(`[Codspeed] ✔ Measured ${uri}`);
			await fnOpts?.afterAll?.call(task, "run");

			// Custom teardown
			await bench.opts.teardown?.(task, "run");

			logTaskCompletion(uri, taskCompletionMessage());
		};

		/**
		 * @param {Task} task task
		 * @returns {[number, number] | undefined} start and end time
		 */
		const iteration = (task) => {
			// @ts-expect-error no public API
			const { fn, fnOpts } = task;

			try {
				fnOpts.beforeEach?.call(task, "run");
				const start = bench.opts.now();
				fn();
				const end = bench.opts.now() - start || 0;
				fnOpts.afterEach?.call(this, "run");
				return [start, end];
			} catch (err) {
				if (bench.opts.throws) {
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
		 * @param {string} uri URI
		 */
		const runTaskSync = (task, uri) => {
			// @ts-expect-error no public API
			const { fnOpts, fn } = task;

			// Custom setup
			bench.opts.setup?.(task, "run");

			fnOpts?.beforeAll?.call(task, "run");

			// Custom warmup
			const samples = [];

			while (samples.length < bench.opts.iterations - 1) {
				samples.push(iteration(task));
			}

			fnOpts?.beforeEach?.call(task, "run");

			wrapWithInstrumentHooks(wrapFunctionWithFrame(fn, false), uri);

			fnOpts?.afterEach?.call(task, "run");
			console.log(`[Codspeed] ✔ Measured ${uri}`);
			fnOpts?.afterAll?.call(task, "run");

			// Custom teardown
			bench.opts.teardown?.(task, "run");

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
				// @ts-expect-error no public API
				const uri = getTaskUri(task.bench, task.name, rootCallingFile);
				await runTaskAsync(task, uri);
			}

			return finalizeAsyncRun();
		};

		bench.runSync = () => {
			setupBenchRun();

			for (const task of bench.tasks) {
				// @ts-expect-error no public API
				const uri = getTaskUri(task.bench, task.name, rootCallingFile);
				runTaskSync(task, uri);
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
 * @param {string} test test
 * @param {Baseline} baseline baseline
 * @param {Configuration} realConfig real configuration
 * @param {Scenario} scenario scenario
 * @param {string} testDirectory test directory
 * @param {string} baseOutputPath base output path
 * @returns {Configuration} built configuration
 */
function buildWebpackConfig(
	test,
	baseline,
	realConfig,
	scenario,
	testDirectory,
	baseOutputPath
) {
	const { watch, ...rest } = scenario;
	const config = structuredClone({ ...realConfig, ...rest });

	config.entry =
		typeof config.entry === "string"
			? path.resolve(
					testDirectory,
					config.entry
						? /\.(c|m)?js$/.test(config.entry)
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
 * @param {Webpack} webpack webpack
 * @param {Configuration} webpackConfig configuration
 * @returns {Promise<void>} build
 */
function runBuild(webpack, webpackConfig) {
	return new Promise(
		/**
		 * @param {(value: void) => void} resolve resolve
		 * @param {(err?: Error) => void} reject reject
		 */
		(resolve, reject) => {
			const compiler = webpack(webpackConfig);
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
 * @param {Configuration} webpackConfig configuration
 * @param {EXPECTED_ANY} callback callback
 * @returns {Promise<void>} watching
 */
async function runWatch(webpack, webpackConfig, callback) {
	const compiler = webpack(webpackConfig);
	return /** @type {Watching} */ compiler.watch({}, callback);
}

async function addBuildBench({
	benchInstance,
	benchmarkName,
	taskName,
	webpack,
	webpackConfig,
	scenario
}) {
	benchInstance.add(
		taskName,
		async () => {
			await (GENERATE_PROFILE
				? withProfiling(taskName, () => runBuild(webpack, webpackConfig))
				: runBuild(webpack, webpackConfig));
		},
		{
			beforeEach(mode) {
				console.time(`Time (${mode} mode): ${benchmarkName}`);
			},
			afterEach(mode) {
				console.timeEnd(`Time (${mode} mode): ${benchmarkName}`);
			},
			beforeAll() {
				/** @type {Task} */
				(this).collectBy = `${test}, scenario '${scenario}'`;
			}
		}
	);
}

async function addWatchBench({
	benchInstance,
	benchmarkName,
	taskName,
	webpack,
	webpackConfig,
	scenario
}) {
	const entry = path.resolve(webpackConfig.entry);
	if (!entry) {
		throw new Error(`No entry for "${benchmarkName}" bench.`);
	}

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

	benchInstance.add(
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
				console.time(`Time (${mode} mode): ${benchmarkName}`);
			},
			afterEach(mode) {
				console.timeEnd(`Time (${mode} mode): ${benchmarkName}`);
			},
			async beforeAll() {
				/** @type {Task} */ (this).collectBy =
					`${benchmarkName}, scenario '${JSON.stringify(scenario)}'`;

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
							(watching = await runWatch(webpack, webpackConfig, watchCallback))
					);
				} else {
					watching = await runWatch(webpack, webpackConfig, watchCallback);
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
}

export async function run({ task, casesPath, baseOutputPath }) {
	console.log(`Worker ${process.pid}: Running ${task.id}`);

	_baseOutputPath = baseOutputPath;

	const { benchmark, scenario, baselines } = task;
	const testDirectory = path.join(casesPath, benchmark);

	const benchInstance = await withCodSpeed(
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

	/** @type {BenchmarkResult[]} */
	const benchResults = [];

	const realConfig = (
		await import(
			`${pathToFileURL(path.join(testDirectory, "webpack.config.mjs"))}`
		)
	).default;

	for (const baseline of baselines) {
		const webpackConfig = buildWebpackConfig(
			benchmark,
			baseline,
			realConfig,
			scenario,
			testDirectory,
			baseOutputPath
		);

		const LAST_COMMIT = typeof process.env.LAST_COMMIT !== "undefined";

		const stringifiedScenario = JSON.stringify(scenario);
		const taskName = `benchmark "${benchmark}", scenario '${stringifiedScenario}'${LAST_COMMIT ? "" : ` ${baseline.name} (${baseline.rev})`}`;
		const fullTaskName = `benchmark "${benchmark}", scenario '${stringifiedScenario}' ${baseline.name} ${baseline.rev ? `(${baseline.rev})` : ""}`;

		console.log(`Register: ${fullTaskName}`);

		const webpack = (
			await import(pathToFileURL(path.resolve(baseline.path, "./lib/index.js")))
		).default;

		const params = {
			benchInstance,
			taskName,
			benchmarkName: benchmark,
			webpack,
			webpackConfig,
			scenario
		};

		await (scenario.watch ? addWatchBench(params) : addBuildBench(params));
	}

	benchInstance.addEventListener("cycle", (event) => {
		/** @type {Task} */
		const task = event.task;

		if (!task) {
			throw new Error("Can't find a task");
		}

		const runs = task.runs;
		const nSqrt = Math.sqrt(runs);
		const z = tDistribution(runs - 1);

		if (!task.result) {
			throw new Error("Can't find a task result");
		}

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

		benchResults.push({
			...latency,
			collectBy: task.collectBy,
			text,
			minConfidence,
			maxConfidence
		});
	});

	await benchInstance.run();

	return {
		benchmark,
		scenario: scenario.name,
		results: benchResults
	};
}
