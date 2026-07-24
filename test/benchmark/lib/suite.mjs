/** @typedef {() => unknown | Promise<unknown>} BenchFn */
/** @typedef {() => void | Promise<void>} HookFn */

/**
 * @typedef {object} BenchmarkDefinition
 * @property {string} name benchmark name, unique within the suite
 * @property {BenchFn} fn benchmarked function; keep all setup out of it, and give
 * sub-microsecond operations an internal loop over a fixture array so one call
 * is long enough to time
 * @property {HookFn=} beforeEach hook outside the measured region, before every round
 * @property {HookFn=} afterEach hook outside the measured region, after every round
 * @property {HookFn=} beforeAll hook before the first execution of this benchmark
 * @property {HookFn=} afterAll hook after the last execution of this benchmark
 */

/**
 * @typedef {object} SuiteOptions
 * @property {number=} time sampling time budget per benchmark in milliseconds
 * @property {number=} iterations minimum measured rounds per benchmark
 * @property {number=} warmupTime warmup time budget in milliseconds
 * @property {number=} warmupIterations minimum warmup rounds
 */

/**
 * @typedef {object} Suite
 * @property {string} name suite name, prefixed with "unit/" or "e2e/"
 * @property {HookFn=} setup runs once before the suite's benchmarks
 * @property {HookFn=} teardown runs once after the suite's benchmarks
 * @property {SuiteOptions=} options tinybench sampling overrides for this suite
 * @property {BenchmarkDefinition[]} benches benchmarks, executed in order
 */

/**
 * Declare a benchmark suite. Files named `*.bench.mjs` under
 * `test/benchmark/{unit,e2e}` must default-export the result. Fixtures shared
 * between benchmarks should live in module-level state assigned in `setup` so
 * importing the file stays side-effect free.
 * @param {Suite} suite suite definition
 * @returns {Suite} the validated suite
 */
export function defineSuite(suite) {
	if (!suite || typeof suite.name !== "string" || suite.name.length === 0) {
		throw new Error("defineSuite: `name` is required");
	}
	if (!Array.isArray(suite.benches) || suite.benches.length === 0) {
		throw new Error(`defineSuite(${suite.name}): \`benches\` is empty`);
	}
	const seen = new Set();
	for (const bench of suite.benches) {
		if (typeof bench.name !== "string" || bench.name.length === 0) {
			throw new Error(`defineSuite(${suite.name}): every bench needs a name`);
		}
		if (typeof bench.fn !== "function") {
			throw new Error(
				`defineSuite(${suite.name}): bench "${bench.name}" needs a \`fn\``
			);
		}
		if (seen.has(bench.name)) {
			throw new Error(
				`defineSuite(${suite.name}): duplicate bench name "${bench.name}"`
			);
		}
		seen.add(bench.name);
	}
	return suite;
}
