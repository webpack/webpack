import { writeFile } from "fs";
import fs from "fs/promises";
import { Session } from "inspector";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { Bench, hrtimeNow } from "tinybench";

/** @typedef {import("tinybench").Task} TinybenchTask */
/** @typedef {import("tinybench").TaskResult} TinybenchTaskResult */
/** @typedef {import("tinybench").Statistics} TinybenchStatistics */
/** @typedef {import("tinybench").Bench} TinybenchBench */

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

// Filename sanitization
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

async function withProfiling(name, fn) {
	console.log(name);

	// Ensure the profiles directory exists
	await fs.mkdir(path.join(_baseOutputPath, "profiles"), { recursive: true });

	const session = new Session();
	session.connect();

	// Enable and start profiling
	await new Promise((resolve, reject) => {
		session.post("Profiler.enable", (err) => {
			if (err) return reject(err);
			session.post("Profiler.start", (err) => {
				if (err) return reject(err);
				resolve();
			});
		});
	});

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

const withCodSpeed = async (/** @type {TinybenchBench} */ bench) => {
	const { Measurement, getGitDir, mongoMeasurement, setupCore, teardownCore } =
		await import("@codspeed/core");

	if (!Measurement.isInstrumented()) {
		const rawRun = bench.run;
		bench.run = async () => {
			console.warn(
				`[CodSpeed] ${bench.tasks.length} benches detected but no instrumentation found, falling back to tinybench`
			);
			return await rawRun.bind(bench)();
		};
		return bench;
	}

	const getStackTrace = (belowFn) => {
		const oldLimit = Error.stackTraceLimit;
		Error.stackTraceLimit = Infinity;
		const dummyObject = {};
		const v8Handler = Error.prepareStackTrace;
		Error.prepareStackTrace = (dummyObject, v8StackTrace) => v8StackTrace;
		Error.captureStackTrace(dummyObject, belowFn || getStackTrace);
		const v8StackTrace = dummyObject.stack;
		Error.prepareStackTrace = v8Handler;
		Error.stackTraceLimit = oldLimit;
		return v8StackTrace;
	};

	const getCallingFile = () => {
		const stack = getStackTrace();
		let callingFile = stack[2].getFileName(); // [here, withCodSpeed, actual caller]
		const gitDir = getGitDir(callingFile);
		if (gitDir === undefined) {
			throw new Error("Could not find a git repository");
		}
		if (callingFile.startsWith("file://")) {
			callingFile = fileURLToPath(callingFile);
		}
		return path.relative(gitDir, callingFile);
	};

	const rawAdd = bench.add;
	bench.add = (name, fn, opts) => {
		// TODO
		const _callingFile = getCallingFile();
		const uri = `${"test/BenchmarkTestCases.benchmark.mjs"}::${name}`;
		const options = { ...opts, uri };
		return rawAdd.bind(bench)(name, fn, options);
	};
	// TODO
	const _rootCallingFile = getCallingFile();
	bench.run = async function run() {
		const iterations = bench.opts.iterations - 1;
		console.log("[CodSpeed] running");
		setupCore();
		for (const task of bench.tasks) {
			await bench.opts.setup?.(task, "run");
			await task.fnOpts.beforeAll?.call(task);
			const samples = [];
			async function iteration() {
				try {
					await task.fnOpts.beforeEach?.call(task, "run");
					const start = bench.opts.now();
					await task.fn();
					samples.push(bench.opts.now() - start || 0);
					await task.fnOpts.afterEach?.call(this, "run");
				} catch (err) {
					if (bench.opts.throws) {
						throw err;
					}
				}
			}
			while (samples.length < iterations) {
				await iteration();
			}
			// Codspeed Measure
			const uri =
				task.opts && "uri" in task.options
					? task.opts.uri
					: `${"test/BenchmarkTestCases.benchmark.mjs"}::${task.name}`;
			await task.fnOpts.beforeEach?.call(task);
			await mongoMeasurement.start(uri);
			await (async function __codspeed_root_frame__() {
				Measurement.startInstrumentation();
				await task.fn();
				Measurement.stopInstrumentation(uri);
			})();
			await mongoMeasurement.stop(uri);
			await task.fnOpts.afterEach?.call(task);
			console.log(`[Codspeed] ✔ Measured ${uri}`);
			await task.fnOpts.afterAll?.call(task);

			await bench.opts.teardown?.(task, "run");
			task.processRunResult({ latencySamples: samples });
		}
		teardownCore();
		console.log(`[CodSpeed] Done running ${bench.tasks.length} benches.`);
		return bench.tasks;
	};
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
	if (watch) {
		config.cache = {
			type: "memory",
			maxGenerations: 1
		};
	}
	return config;
}

function runBuild(webpack, webpackConfig) {
	return new Promise((resolve, reject) => {
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
	});
}

async function runWatch(webpack, webpackConfig, callback) {
	const compiler = webpack(webpackConfig);
	return compiler.watch({}, callback);
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
			console.time(`Time: ${taskName}`);
			await (GENERATE_PROFILE
				? withProfiling(taskName, () => runBuild(webpack, webpackConfig))
				: runBuild(webpack, webpackConfig));
			console.timeEnd(`Time: ${taskName}`);
		},
		{
			beforeAll() {
				this.collectBy = `${benchmarkName}, scenario '${JSON.stringify(scenario)}'`;
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
	const originalEntryContent = await fs.readFile(entry, "utf8");
	let watching;
	let next;

	const watchCallback = (err, stats) => {
		if (next) {
			next(err, stats);
		}
	};

	benchInstance.add(
		taskName,
		async () => {
			console.time(`Time: ${taskName}`);

			let resolve;
			let reject;

			const promise = new Promise((res, rej) => {
				resolve = res;
				reject = rej;
			});

			next = (err, stats) => {
				if (err) {
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
				console.timeEnd(`Time: ${taskName}`);
			};
			await new Promise((resolve, reject) => {
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
			});
			await promise;
		},
		{
			async beforeAll() {
				this.collectBy = `${benchmarkName}, scenario '${JSON.stringify(scenario)}'`;

				let resolve;
				let reject;

				const promise = new Promise((res, rej) => {
					resolve = res;
					reject = rej;
				});

				next = (err, stats) => {
					if (err) {
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
				await new Promise((resolve, reject) => {
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
				});

				await promise;
			},
			async afterAll() {
				// Close watching
				await new Promise((resolve, reject) => {
					if (watching) {
						watching.close((closeErr) => {
							if (closeErr) {
								reject(closeErr);
								return;
							}
							resolve();
						});
					}
				});

				// Write original content
				await new Promise((resolve, reject) => {
					writeFile(entry, originalEntryContent, (err) => {
						if (err) {
							reject(err);
							return;
						}

						resolve();
					});
				});
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
				global.gc();
				console.log(`Setup (${mode} mode): ${task.name}`);
			},
			teardown(task, mode) {
				console.log(`Teardown (${mode} mode): ${task.name}`);
			}
		})
	);

	/** @type {BenchmarkResult[]} */
	const benchResults = [];

	const realConfig = (
		await import(
			`${pathToFileURL(path.join(testDirectory, "webpack.config.js"))}`
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
		/** @type {TinybenchTask} */
		const task = event.task;
		const runs = task.runs;
		const nSqrt = Math.sqrt(runs);
		const z = tDistribution(runs - 1);

		if (!task.result) return;

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
