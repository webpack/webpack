import { existsSync, writeFile } from "fs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { Bench, hrtimeNow } from "tinybench";

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

const withCodSpeed = async (/** @type {import("tinybench").Bench} */ bench) => {
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
			await new Promise((resolve, reject) => {
				console.time(`Time: ${taskName}`);

				const baseCompiler = webpack(webpackConfig);

				baseCompiler.run((err, stats) => {
					if (err) {
						reject(err);
						return;
					}

					if (stats.hasWarnings() || stats.hasErrors()) {
						throw new Error(stats.toString());
					}

					baseCompiler.close((closeErr) => {
						if (closeErr) {
							reject(closeErr);
							return;
						}

						// Construct and print stats to be more accurate with real life projects
						stats.toString();
						console.timeEnd(`Time: ${taskName}`);
						resolve();
					});
				});
			});
		},
		{
			beforeAll() {
				this.collectBy = `${benchmarkName}, scenario '${JSON.stringify(scenario)}'`;
			}
		}
	);
}

function runWatch(compiler) {
	return new Promise((resolve, reject) => {
		const watching = compiler.watch({}, (err, stats) => {
			if (err) {
				reject(err);
			}

			if (stats.hasWarnings() || stats.hasErrors()) {
				reject(new Error(stats.toString()));
			}

			resolve(watching);
		});
	});
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
	let watchingResolve;
	benchInstance.add(
		taskName,
		async () => {
			console.time(`Time: ${taskName}`);
			const watchingPromise = new Promise((res) => {
				watchingResolve = res;
			});
			await new Promise((resolve, reject) => {
				writeFile(
					entry,
					`${originalEntryContent};console.log('watch test')`,
					(err) => {
						if (err) {
							reject(err);
						}
						watchingPromise.then((stats) => {
							watchingResolve = undefined;
							// Construct and print stats to be more accurate with real life projects
							stats.toString();
							console.timeEnd(`Time: ${taskName}`);
							resolve();
						});
					}
				);
			});
		},
		{
			async beforeAll() {
				this.collectBy = `${benchmarkName}, scenario '${JSON.stringify(scenario)}'`;

				watching = await runWatch(webpack(webpackConfig));
				watching.compiler.hooks.afterDone.tap(
					"WatchingBenchmarkPlugin",
					(stats) => {
						if (watchingResolve) {
							watchingResolve(stats);
						}
					}
				);
			},
			async afterEach() {
				await new Promise((resolve, reject) => {
					writeFile(entry, originalEntryContent, (err) => {
						if (err) {
							reject(err);
							return;
						}
						resolve();
					});
				});
			},
			async afterAll() {
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
			}
		}
	);
}

export async function run({ task, casesPath, baseOutputPath }) {
	console.log(`Worker ${process.pid}: Running ${task.id}`);

	const { benchmark, scenario, baselines } = task;
	const testDirectory = path.join(casesPath, benchmark);

	let options = {};
	const optionsPath = path.resolve(testDirectory, "options.mjs");

	if (optionsPath && existsSync(optionsPath)) {
		options = await import(`${pathToFileURL(optionsPath)}`);
	}
	if (typeof options.setup !== "undefined") {
		await options.setup();
	}

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
		const task = event.task;
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
