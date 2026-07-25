import { pathToFileURL } from "url";
import { withCodSpeed } from "@codspeed/tinybench-plugin";
import { Bench, hrtimeNow } from "tinybench";

/**
 * @typedef {object} RunnerOptions
 * @property {RegExp=} filter only run benchmarks whose id matches
 * @property {RegExp=} negativeFilter skip benchmarks whose id matches
 * @property {boolean=} smoke run every benchmark exactly once, to validate not measure
 * @property {number=} maxRme relative margin of error warning threshold
 */

/**
 * @typedef {object} LatencySummary
 * @property {number} p50Ms median latency
 * @property {number} meanMs mean latency
 * @property {number} sdMs standard deviation
 * @property {number} madMs median absolute deviation
 * @property {number} rme relative margin of error in percent
 * @property {number} minMs fastest sample
 * @property {number} maxMs slowest sample
 * @property {number} samples sample count
 */

/**
 * @typedef {object} BenchResult
 * @property {string} suite suite name
 * @property {string} name full benchmark id
 * @property {LatencySummary=} latency wall-time statistics (absent when instrumented)
 */

/**
 * @typedef {object} RunSummary
 * @property {BenchResult[]} results completed benchmarks
 * @property {{ id: string, error: Error }[]} failures benchmarks that threw
 */

/** @typedef {() => unknown | Promise<unknown>} BenchFn */
/** @typedef {() => void | Promise<void>} HookFn */

/**
 * @typedef {object} BenchmarkDefinition
 * @property {string} name benchmark case, unique within the suite
 * @property {BenchFn} fn benchmarked function
 * @property {boolean=} async whether the benchmark function is asynchronous
 * @property {HookFn=} beforeEach hook outside the measured region, before every round
 * @property {HookFn=} afterEach hook outside the measured region, after every round
 * @property {HookFn=} beforeAll hook before the first execution of this benchmark
 * @property {HookFn=} afterAll hook after the last execution of this benchmark
 */

/**
 * @typedef {object} Suite
 * @property {string} name suite name, prefixed with "unit/" or "e2e/"
 * @property {HookFn=} setup runs once before the suite's benchmarks
 * @property {HookFn=} teardown runs once after the suite's benchmarks
 * @property {number=} iterations measured rounds per benchmark
 * @property {BenchmarkDefinition[]} benches benchmarks, executed in order
 */

/** Drain promoted garbage, finalizers and pending I/O between benchmarks. */
export async function drainHeap() {
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
}

const US_PER_MS = 10 ** 3;
const NS_PER_MS = 10 ** 6;

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

/**
 * @param {number} ms time in milliseconds
 * @returns {string} human readable time
 */
function formatTime(ms) {
	const toType =
		Math.round(ms) > 0
			? "ms"
			: Math.round(ms * US_PER_MS) / US_PER_MS > 0
				? "µs"
				: "ns";

	switch (toType) {
		case "ms": {
			return `${formatNumber(ms, 5, 2)} ms`;
		}
		case "µs": {
			return `${formatNumber(ms * US_PER_MS, 5, 2)} µs`;
		}
		case "ns": {
			return `${formatNumber(ms * NS_PER_MS, 5, 2)} ns`;
		}
	}
}

/**
 * @param {Task} task a completed tinybench task
 * @returns {LatencySummary | undefined} summary of its latency statistics
 */
function summarizeLatency(task) {
	const result = task.result;
	if (!result || result.state !== "completed") return undefined;
	const { latency } = result;
	return {
		p50Ms: latency.p50,
		meanMs: latency.mean,
		sdMs: latency.sd,
		madMs: latency.mad,
		rme: latency.rme,
		minMs: latency.min,
		maxMs: latency.max,
		samples: latency.samplesCount
	};
}

/**
 * Run suites sequentially with an isolated tinybench instance per benchmark.
 * @param {string[]} files absolute paths of `*.bench.mjs` files
 * @param {RunnerOptions} options runner options
 * @returns {Promise<RunSummary>} results and failures
 */
export async function runSuites(files, options) {
	/** @type {BenchResult[]} */
	const results = [];
	/** @type {{ id: string, error: Error }[]} */
	const failures = [];

	for (const file of files) {
		/** @type {Suite} */
		const suite = await import(pathToFileURL(file).toString()).then(x => x.default ?? x);
		const benches = suite.benches.filter((bench) => {
			const id = `${suite.name}/${bench.name}`;
			if (options.filter && !options.filter.test(id)) return false;
			if (options.negativeFilter && options.negativeFilter.test(id)) {
				return false;
			}
			return true;
		});
		if (benches.length === 0) continue;

		console.log(`\n${suite.name}`);
		try {
			await suite.setup?.();
			await drainHeap();
			if (options.smoke) {
				for (const definition of benches) {
					const id = `${suite.name}/${definition.name}`;
					try {
						await definition.beforeAll?.();
						try {
							try {
								await definition.beforeEach?.();
								await definition.fn();
							} finally {
								await definition.afterEach?.();
							}
						} finally {
							await definition.afterAll?.();
						}
						console.log(`  ✔ ${id} (smoke)`);
						results.push({
							suite: suite.name,
							name: id
						});
					} catch (err) {
						failures.push({ id, error: /** @type {Error} */ (err) });
						console.error(
							`  ✖ ${id}: ${/** @type {Error} */ (err).stack}`
						);
					}
					await drainHeap();
				}
				continue;
			}

			for (const definition of benches) {
				const id = `${suite.name}/${definition.name}`;
				const iterations = suite.iterations;
				const bench = withCodSpeed(
					new Bench({
						name: suite.name,
						now: hrtimeNow,
						throws: true,
						iterations,
						time: iterations === undefined ? undefined : 0,
						warmupIterations:
							iterations === undefined
								? undefined
								: Math.max(1, Math.ceil(iterations / 10)),
						warmupTime: iterations === undefined ? undefined : 0
					})
				);
				bench.add(id, definition.fn, {
					async: definition.async,
					beforeAll: definition.beforeAll,
					beforeEach: definition.beforeEach,
					afterEach: definition.afterEach,
					afterAll: definition.afterAll
				});

				try {
					await bench.run();
					const task = bench.tasks[0];
					const latency = summarizeLatency(task);
					results.push({
						suite: suite.name,
						name: task.name,
						latency
					});
					if (
						latency &&
						options.maxRme !== undefined &&
						latency.rme > options.maxRme
					) {
						console.warn(
							`  ⚠ ${task.name}: RME ${latency.rme.toFixed(2)}% exceeds ${options.maxRme.toFixed(2)}%`
						);
					}
					if (latency) {
						console.log(
							`  ${task.name}: ${formatTime(latency.p50Ms)} ±${latency.rme.toFixed(
								2
							)}% (${latency.samples} samples, min ${formatTime(
								latency.minMs
							)}, max ${formatTime(latency.maxMs)})`
						);
					}
				} catch (err) {
					const task = bench.tasks[0];
					failures.push({
						id: task.name,
						error: /** @type {Error} */ (err)
					});
					console.error(
						`  ✖ ${task.name}: ${/** @type {Error} */ (err).stack}`
					);
				} finally {
					await drainHeap();
				}
			}
		} catch (err) {
			failures.push({ id: suite.name, error: /** @type {Error} */ (err) });
			console.error(`  ✖ ${suite.name}: ${/** @type {Error} */ (err).stack}`);
		} finally {
			try {
				await suite.teardown?.();
			} catch (err) {
				const id = `${suite.name}/teardown`;
				failures.push({
					id,
					error: /** @type {Error} */ (err)
				});
				console.error(`  ✖ ${id}: ${/** @type {Error} */ (err).stack}`);
			}
		}
	}

	return { results, failures };
}
