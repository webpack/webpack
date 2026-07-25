"use strict";

const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");

const benchmarkRoot = path.resolve(__dirname, "benchmark");
// eslint-disable-next-line no-new-func
const dynamicImport = new Function("specifier", "return import(specifier)");

describe("BenchmarkSuite", () => {
	it("should derive build cases from the case and mode", async () => {
		const { createBuildBench } = await dynamicImport(
			"./benchmark/lib/webpack.mjs"
		);
		const bench = createBuildBench({
			case: "without-module-concatenation",
			config: { mode: "production" }
		});

		expect(bench.name).toBe("without-module-concatenation/production-build");
	});

	it("should create every scenario for extra configurations", async () => {
		const { createBuildScenarios } = await dynamicImport(
			"./benchmark/lib/webpack.mjs"
		);
		const benches = createBuildScenarios({
			case: "without-module-concatenation",
			entryFile: "entry.js",
			config: { entry: "entry.js" }
		});

		expect(
			benches.map((/** @type {{ name: string }} */ bench) => bench.name)
		).toEqual([
			"without-module-concatenation/development-build",
			"without-module-concatenation/production-build",
			"without-module-concatenation/development-rebuild"
		]);
	});

	it("should use globally unique benchmark names", async () => {
		const files = [];
		for await (const file of fs.glob(
			["unit/**/*.bench.mjs", "e2e/**/*.bench.mjs"],
			{ cwd: benchmarkRoot }
		)) {
			files.push(file);
		}
		const names = new Map();

		for (const file of files) {
			const suite = (
				await dynamicImport(pathToFileURL(path.join(benchmarkRoot, file)).href)
			).default;
			for (const bench of suite.benches) {
				const benchmarkName = `${suite.name}/${bench.name}`;
				expect(bench.name.startsWith(`${suite.name}/`)).toBe(false);
				const suites = names.get(benchmarkName);
				if (suites) {
					suites.push(suite.name);
				} else {
					names.set(benchmarkName, [suite.name]);
				}
			}
		}

		expect(
			[...names]
				.filter(([, suites]) => suites.length > 1)
				.map(([name, suites]) => ({ name, suites }))
		).toEqual([]);
	});

	it("should run every scenario for each e2e configuration", async () => {
		const excludedSuites = new Set(["e2e/filesystem-cache", "e2e/rebuild"]);
		for await (const file of fs.glob("e2e/**/*.bench.mjs", {
			cwd: benchmarkRoot
		})) {
			const suite = (
				await dynamicImport(pathToFileURL(path.join(benchmarkRoot, file)).href)
			).default;
			if (excludedSuites.has(suite.name)) continue;
			/** @type {Map<string, Set<string>>} */
			const scenariosByConfig = new Map();

			for (const bench of suite.benches) {
				const match =
					/(development-build|production-build|development-rebuild)$/.exec(
						bench.name
					);
				expect(match).not.toBeNull();
				if (!match) continue;
				const scenario = match[1];
				const configName = bench.name.replace(scenario, "<scenario>");
				const scenarios = scenariosByConfig.get(configName);
				if (scenarios) {
					scenarios.add(scenario);
				} else {
					scenariosByConfig.set(configName, new Set([scenario]));
				}
			}

			for (const scenarios of scenariosByConfig.values()) {
				expect(scenarios).toEqual(
					new Set([
						"development-build",
						"production-build",
						"development-rebuild"
					])
				);
			}
		}
	});

	it("should warn without failing when RME exceeds the threshold", async () => {
		const { runSuites } = await dynamicImport("./benchmark/lib/runner.mjs");
		const directory = await fs.mkdtemp(
			path.join(os.tmpdir(), "webpack-benchmark-")
		);
		const file = path.join(directory, "rme.bench.mjs");
		await fs.writeFile(
			file,
			`export default {
				name: "unit/rme",
				iterations: 1,
				benches: [{ name: "stable name", fn() {} }]
			};`
		);
		const log = jest.spyOn(console, "log").mockImplementation();
		const warn = jest.spyOn(console, "warn").mockImplementation();

		try {
			const summary = await runSuites([file], { maxRme: -1 });

			expect(summary.failures).toEqual([]);
			expect(summary.results[0].name).toBe("unit/rme/stable name");
			expect(warn).toHaveBeenCalledWith(
				expect.stringMatching(/RME .* exceeds -1\.00%/)
			);
		} finally {
			log.mockRestore();
			warn.mockRestore();
			await fs.rm(directory, { force: true, recursive: true });
		}
	});
});
