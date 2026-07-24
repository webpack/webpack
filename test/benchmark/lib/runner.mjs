import fs from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { getCodspeedRunnerMode, getV8Flags } from "@codspeed/core";
import { withCodSpeed } from "@codspeed/tinybench-plugin";
import { Bench, hrtimeNow } from "tinybench";

/** @typedef {import("./suite.mjs").Suite} Suite */
/** @typedef {import("./suite.mjs").BenchmarkDefinition} BenchmarkDefinition */
/** @typedef {import("tinybench").Task} Task */

/**
 * @typedef {object} RunnerOptions
 * @property {RegExp=} filter only run benchmarks whose id matches
 * @property {RegExp=} negativeFilter skip benchmarks whose id matches
 * @property {boolean=} smoke run every benchmark exactly once, to validate not measure
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
 * @property {string} name benchmark name
 * @property {"instrumented" | "walltime" | "smoke"} kind how the benchmark was executed
 * @property {LatencySummary=} latency wall-time statistics (absent when instrumented)
 */

/**
 * @typedef {object} RunSummary
 * @property {BenchResult[]} results completed benchmarks
 * @property {{ id: string, error: Error }[]} failures benchmarks that threw
 */

// tinybench samples until BOTH the time budget and the iteration minimum are
// met, so e2e uses a tiny time budget to get exactly `iterations` builds.
const DEFAULTS = {
	unit: { time: 1000, iterations: 20, warmupTime: 100, warmupIterations: 3 },
	e2e: { time: 1, iterations: 5, warmupTime: 1, warmupIterations: 2 }
};

// The repository root — the library lives in test/benchmark/lib.
const ROOT = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../.."
);

/**
 * Instruction-count instrumentation only produces stable numbers when V8 is
 * fully deterministic. Throw instead of warning so CI can't silently upload
 * unstable measurements — run via the `benchmark:*` scripts in package.json.
 * @returns {void}
 */
function assertV8Flags() {
	const requiredFlags = getV8Flags().filter(
		(flag) => !flag.startsWith("--max-old-space-size")
	);
	const missingFlags = requiredFlags.filter(
		(flag) => !process.execArgv.includes(flag)
	);
	if (missingFlags.length > 0) {
		throw new Error(
			`Missing required V8 flags for stable benchmarking: ${missingFlags.join(
				", "
			)}\nRun via the \`benchmark:*\` scripts so the flags declared in package.json are applied.`
		);
	}
}

/**
 * Drain the heap between benchmarks. One GC can leave promoted-but-unreachable
 * objects pending finalization and finalizers themselves can allocate, so loop
 * `gc -> microtask` so each pass collects the previous pass' garbage, then drain
 * pending IO and collect once more.
 * @returns {Promise<void>}
 */
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
 * @param {string} file absolute path of a suite file
 * @returns {string} path relative to the repository root, posix separators
 */
function gitRelative(file) {
	return path.relative(ROOT, file).replace(/\\/g, "/");
}

/**
 * @param {string} file absolute path of a suite file
 * @returns {Promise<Suite>} the suite it exports
 */
async function loadSuite(file) {
	const module = await import(pathToFileURL(file).toString());
	const suite = /** @type {{ default?: Suite }} */ (module).default;
	if (!suite || !Array.isArray(suite.benches)) {
		throw new Error(
			`${gitRelative(file)} must default-export a suite created with defineSuite()`
		);
	}
	const relativeFile = gitRelative(file);
	const unitPrefix = "test/benchmark/unit/";
	if (relativeFile.startsWith(unitPrefix)) {
		const corePath = relativeFile
			.slice(unitPrefix.length)
			.replace(/\.bench\.mjs$/, "");
		const expectedName = `unit/${corePath}`;
		if (suite.name !== expectedName) {
			throw new Error(
				`${relativeFile} must use suite name "${expectedName}", matching lib/${corePath}.js`
			);
		}
		try {
			await fs.access(path.join(ROOT, "lib", `${corePath}.js`));
		} catch (err) {
			throw new Error(
				`${relativeFile} has no matching core file lib/${corePath}.js`,
				{ cause: err }
			);
		}
	}
	return suite;
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
 * Run benchmark suites sequentially and deterministically: files in the given
 * (sorted) order, benches in declaration order. Measurement and CodSpeed
 * integration are tinybench + `@codspeed/tinybench-plugin`; this layer only
 * adds discovery, filtering, heap drains between benchmarks and reporting.
 * @param {string[]} files absolute paths of `*.bench.mjs` files
 * @param {RunnerOptions} options runner options
 * @returns {Promise<RunSummary>} results and failures
 */
export async function runSuites(files, options) {
	const mode = getCodspeedRunnerMode();
	const instrumented = mode === "simulation" || mode === "memory";
	if (instrumented) assertV8Flags();
	console.log(`Benchmark mode: ${mode === "disabled" ? "local" : mode}`);

	/** @type {BenchResult[]} */
	const results = [];
	/** @type {{ id: string, error: Error }[]} */
	const failures = [];

	for (const file of files) {
		const suite = await loadSuite(file);
		const benches = suite.benches.filter((bench) => {
			const id = `${suite.name} :: ${bench.name}`;
			if (options.filter && !options.filter.test(id)) return false;
			if (options.negativeFilter && options.negativeFilter.test(id)) {
				return false;
			}
			return true;
		});
		if (benches.length === 0) continue;

		console.log(`\n${suite.name} (${gitRelative(file)})`);
		await suite.setup?.();
		try {
			if (options.smoke) {
				for (const bench of benches) {
					try {
						await bench.beforeAll?.();
						try {
							await bench.beforeEach?.();
							await bench.fn();
							await bench.afterEach?.();
						} finally {
							await bench.afterAll?.();
						}
						console.log(`  ✔ ${bench.name} (smoke)`);
						results.push({ suite: suite.name, name: bench.name, kind: "smoke" });
					} catch (err) {
						const id = `${suite.name} :: ${bench.name}`;
						failures.push({ id, error: /** @type {Error} */ (err) });
						console.error(
							`  ✖ ${bench.name}: ${/** @type {Error} */ (err).stack}`
						);
					}
					await drainHeap();
				}
				continue;
			}

			const bench = withCodSpeed(
				new Bench({
					name: suite.name,
					now: hrtimeNow,
					throws: true,
					warmup: true,
					...(suite.name.startsWith("e2e/") ? DEFAULTS.e2e : DEFAULTS.unit),
					...suite.options
				})
			);

			for (const definition of benches) {
				const userAfterAll = definition.afterAll;
				bench.add(definition.name, definition.fn, {
					beforeAll: definition.beforeAll,
					beforeEach: definition.beforeEach,
					afterEach: definition.afterEach,
					// afterAll runs once per task in every mode — the one hook where
					// an inter-benchmark heap drain doesn't touch measured regions.
					async afterAll() {
						await userAfterAll?.call(this);
						await drainHeap();
					}
				});
			}

			if (!instrumented) {
				bench.addEventListener("cycle", (event) => {
					const task = /** @type {{ task?: Task }} */ (event).task;
					if (!task) return;
					const latency = summarizeLatency(task);
					if (!latency) return;
					console.log(
						`  ${task.name}: ${formatTime(latency.p50Ms)} ±${latency.rme.toFixed(
							2
						)}% (${latency.samples} samples, min ${formatTime(
							latency.minMs
						)}, max ${formatTime(latency.maxMs)})`
					);
				});
			}

			try {
				await bench.run();
				for (const task of bench.tasks) {
					results.push({
						suite: suite.name,
						name: task.name,
						kind: instrumented ? "instrumented" : "walltime",
						latency: instrumented ? undefined : summarizeLatency(task)
					});
				}
			} catch (err) {
				// `throws: true` aborts the suite's Bench on the first failing task.
				const failed = bench.tasks.find(
					(task) => task.result?.state === "errored"
				);
				const id = failed ? `${suite.name} :: ${failed.name}` : suite.name;
				failures.push({ id, error: /** @type {Error} */ (err) });
				console.error(`  ✖ ${id}: ${/** @type {Error} */ (err).stack}`);
			}
		} finally {
			await suite.teardown?.();
		}
	}

	return { results, failures };
}
