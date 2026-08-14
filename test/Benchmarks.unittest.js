"use strict";

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

/** @typedef {import("./benchmark/lib/runner.mjs").Suite} Suite */
/** @typedef {import("./benchmark/lib/runner.mjs").RunSummary} RunSummary */

const benchmarkRoot = path.join(__dirname, "benchmark");
const runnerPath = path.join(benchmarkRoot, "lib", "runner.mjs");

// The harness is ESM on post-20 APIs; the Deno and Bun jobs run this suite too.
const itNode = process.versions.bun || process.versions.deno ? it.skip : it;

/**
 * @param {string} dir directory to walk
 * @returns {string[]} absolute paths of every `*.bench.mjs` below `dir`
 */
const findBenchmarkFiles = (dir) =>
	fs
		.readdirSync(dir, { withFileTypes: true })
		.flatMap((entry) => {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) return findBenchmarkFiles(full);
			return entry.name.endsWith(".bench.mjs") ? [full] : [];
		})
		.sort();

/**
 * @param {string} file absolute path of a `*.bench.mjs`
 * @returns {string} the suite id its location implies
 */
const suiteIdOf = (file) =>
	path
		.relative(benchmarkRoot, file)
		.split(path.sep)
		.join("/")
		.replace(/(?:\/index)?\.bench\.mjs$/, "");

/**
 * @param {string} file absolute path of an ES module
 * @returns {Promise<EXPECTED_ANY>} its default export
 */
const importDefault = async (file) => {
	const url = pathToFileURL(file).href;
	const module = await import(url);
	return module.default;
};

describe("Benchmarks", () => {
	const unitFiles = findBenchmarkFiles(path.join(benchmarkRoot, "unit"));
	const e2eFiles = findBenchmarkFiles(path.join(benchmarkRoot, "e2e"));

	it("should discover the benchmark suites", () => {
		expect(unitFiles).not.toHaveLength(0);
		expect(e2eFiles).not.toHaveLength(0);
	});

	for (const file of [...unitFiles, ...e2eFiles]) {
		const id = suiteIdOf(file);

		itNode(`should name suite ${id} after its location`, async () => {
			const suite = /** @type {Suite} */ (await importDefault(file));
			expect(suite.name).toBe(id);
			expect(suite.benches).not.toHaveLength(0);
			expect(new Set(suite.benches.map((bench) => bench.name)).size).toBe(
				suite.benches.length
			);
		});
	}

	for (const file of unitFiles) {
		const id = suiteIdOf(file);

		it(`should keep ${id} mirroring a core file`, () => {
			const core = path.join(
				__dirname,
				"..",
				"lib",
				`${id.replace(/^unit\//, "")}.js`
			);
			expect(fs.existsSync(core)).toBe(true);
		});

		itNode(
			`should run every benchmark in ${id}`,
			async () => {
				const { runSuites } = await import(pathToFileURL(runnerPath).href);
				// the runner narrates every benchmark; failures go to console.error
				const log = jest.spyOn(console, "log").mockImplementation(() => {});
				/** @type {RunSummary} */
				let summary;
				try {
					summary = await runSuites([file], { smoke: true });
				} finally {
					log.mockRestore();
				}
				expect(
					summary.failures.map(
						(failure) => `${failure.id}: ${failure.error.message}`
					)
				).toEqual([]);
				expect(summary.results).not.toHaveLength(0);
			},
			60000
		);
	}
});
