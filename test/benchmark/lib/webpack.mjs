import fs from "fs/promises";
import { createRequire } from "module";
import os from "os";
import path from "path";

const require = createRequire(import.meta.url);

/** @typedef {import("../../..")} Webpack */
/** @typedef {import("../../..").Configuration} Configuration */
/** @typedef {import("../../..").Stats} Stats */
/** @typedef {import("../../..").Watching} Watching */
/** @typedef {Configuration | (() => Configuration)} ConfigurationFactory */
/** @typedef {() => unknown | Promise<unknown>} BenchFn */
/** @typedef {() => void | Promise<void>} HookFn */

/**
 * @typedef {object} BenchmarkDefinition
 * @property {string} name benchmark case
 * @property {BenchFn} fn benchmarked function
 * @property {boolean=} async whether the benchmark function is asynchronous
 * @property {HookFn=} beforeEach hook before every round
 * @property {HookFn=} afterEach hook after every round
 * @property {HookFn=} beforeAll hook before the first execution
 * @property {HookFn=} afterAll hook after the last execution
 */

/**
 * @param {ConfigurationFactory} config configuration or factory
 * @returns {Configuration} resolved configuration
 */
const resolveConfig = (config) =>
	typeof config === "function" ? config() : config;

/**
 * @param {"build" | "rebuild"} operation benchmarked operation
 * @param {ConfigurationFactory} config configuration or factory
 * @param {string | undefined} caseName benchmark case
 * @returns {string} benchmark case
 */
const createBenchmarkCase = (operation, config, caseName) => {
	const mode = resolveConfig(config).mode;
	if (mode === undefined) {
		throw new Error("Benchmark configuration must specify `mode`");
	}
	return [caseName, `${mode}-${operation}`].filter(Boolean).join("/");
};

const createOutputPath = () =>
	fs.mkdtemp(path.join(os.tmpdir(), "webpack-benchmark-"));

/**
 * The webpack of the current working tree. Non-comparative by design: no
 * baseline revision is ever checked out or imported next to it.
 * @returns {Webpack} webpack
 */
export function loadWebpack() {
	return require("../../../lib/index.js");
}

/**
 * Normalize an e2e case config with isolated output.
 * @param {string} outputPath temporary output directory
 * @param {string} benchName benchmark name within the case
 * @param {Configuration} config partial configuration
 * @returns {Configuration} built configuration
 */
export function prepareConfig(outputPath, benchName, config) {
	/** @type {Configuration} */
	const result = {
		devtool: false,
		performance: false,
		...config,
		name: benchName
	};
	result.output = {
		...result.output,
		path: outputPath
	};
	if (
		result.cache &&
		typeof result.cache === "object" &&
		result.cache.type === "filesystem"
	) {
		result.cache.cacheDirectory = path.resolve(
			/** @type {string} */ (result.output.path),
			".cache"
		);
	}
	return result;
}

/**
 * Run a full build on a fresh compiler and force stats construction, matching
 * what real builds pay for.
 * @param {Configuration} config configuration
 * @returns {Promise<void>}
 */
export function runBuild(config) {
	const webpack = loadWebpack();
	return new Promise(
		/**
		 * @param {(value: void) => void} resolve resolve
		 * @param {(err?: Error) => void} reject reject
		 */
		(resolve, reject) => {
			const compiler = webpack(config);
			compiler.run((err, stats) => {
				const statsError =
					stats && (stats.hasWarnings() || stats.hasErrors())
						? new Error(stats.toString())
						: undefined;
				compiler.close((closeErr) => {
					const buildError = err || statsError || closeErr;
					if (buildError) return reject(buildError);
					if (stats) stats.toString();
					resolve();
				});
			});
		}
	);
}

/**
 * @typedef {object} BuildBenchOptions
 * @property {string=} case benchmark case
 * @property {ConfigurationFactory} config configuration or fresh config factory
 */

/**
 * @param {BuildBenchOptions} options options
 * @returns {BenchmarkDefinition} build benchmark
 */
export function createBuildBench(options) {
	const { case: caseName, config } = options;
	const benchName = createBenchmarkCase("build", config, caseName);
	/** @type {string | undefined} */
	let outputPath;
	return {
		name: benchName,
		async: true,
		async beforeAll() {
			outputPath = await createOutputPath();
		},
		fn() {
			if (outputPath === undefined) {
				throw new Error("Benchmark output directory is not initialized");
			}
			return runBuild(
				prepareConfig(outputPath, benchName, resolveConfig(config))
			);
		},
		async afterAll() {
			if (outputPath === undefined) return;
			const currentOutputPath = outputPath;
			outputPath = undefined;
			await fs.rm(currentOutputPath, { recursive: true, force: true });
		}
	};
}

/**
 * @typedef {object} WatchRebuildOptions
 * @property {string=} case benchmark case
 * @property {ConfigurationFactory} config partial configuration; entry must be a file path
 * @property {string} entryFile absolute path of the file touched to trigger rebuilds
 */

/**
 * Benchmark rebuilds while alternating between equal-length source changes.
 * @param {WatchRebuildOptions} options options
 * @returns {BenchmarkDefinition} a benchmark definition
 */
export function createWatchRebuildBench(options) {
	const { case: caseName, config, entryFile } = options;
	const benchName = createBenchmarkCase("rebuild", config, caseName);

	/** @type {Watching | undefined} */
	let watching;
	/** @type {string | undefined} */
	let outputPath;
	/** @type {string} */
	let originalContent = "";
	/** @type {((err: Error | null, stats?: Stats) => void) | undefined} */
	let next;
	/** @type {Stats | undefined} */
	let completedStats;
	let iteration = 0;

	/**
	 * @returns {Promise<void>} resolves after the next successful build
	 */
	const nextBuild = () =>
		new Promise(
			/**
			 * @param {(value: void) => void} resolve resolve
			 * @param {(err?: Error | null) => void} reject reject
			 */
			(resolve, reject) => {
				next = (err, stats) => {
					next = undefined;
					if (err || !stats) return reject(err);
					resolve();
				};
			}
		);

	return {
		name: benchName,
		async: true,
		async beforeAll() {
			originalContent = await fs.readFile(entryFile, "utf8");
			outputPath = await createOutputPath();
			try {
				const webpack = loadWebpack();
				const watchConfig = prepareConfig(outputPath, benchName, {
					...resolveConfig(config),
					// Keep rebuilds warm but bounded, like a dev-server session.
					cache: { type: "memory", maxGenerations: 1 }
				});
				const firstBuild = nextBuild();
				const compiler = webpack(watchConfig);
				compiler.hooks.afterDone.tap("BenchmarkWatchRebuild", () => {
					if (next) next(null, completedStats);
				});
				watching = compiler.watch({}, (err, stats) => {
					if (err || !stats) {
						if (next) next(err, stats);
						return;
					}
					if (stats.hasWarnings() || stats.hasErrors()) {
						if (next) next(new Error(stats.toString()));
						return;
					}
					stats.toString();
					completedStats = stats;
				});
				await firstBuild;
			} catch (err) {
				const currentWatching = watching;
				if (currentWatching) {
					await new Promise((resolve) => {
						currentWatching.close(() => resolve(undefined));
					});
				}
				watching = undefined;
				next = undefined;
				const currentOutputPath = outputPath;
				outputPath = undefined;
				if (currentOutputPath !== undefined) {
					await fs.rm(currentOutputPath, { recursive: true, force: true });
				}
				throw err;
			}
		},
		async fn() {
			const build = nextBuild();
			iteration++;
			await fs.writeFile(
				entryFile,
				`${originalContent};console.log(${iteration % 2});`
			);
			/** @type {Watching} */ (watching).invalidate();
			await build;
		},
		async afterAll() {
			try {
				await new Promise(
					/**
					 * @param {(value: void) => void} resolve resolve
					 * @param {(err?: Error | null) => void} reject reject
					 */
					(resolve, reject) => {
						if (!watching) {
							resolve();
							return;
						}
						watching.close((closeErr) => {
							if (closeErr) {
								reject(closeErr);
								return;
							}
							resolve();
						});
					}
				);
			} finally {
				watching = undefined;
				next = undefined;
				completedStats = undefined;
				try {
					await fs.writeFile(entryFile, originalContent);
				} finally {
					if (outputPath !== undefined) {
						const currentOutputPath = outputPath;
						outputPath = undefined;
						await fs.rm(currentOutputPath, { recursive: true, force: true });
					}
				}
			}
		}
	};
}

/**
 * @typedef {object} BuildScenarioOptions
 * @property {string=} case benchmark case
 * @property {string} entryFile entry file changed by the rebuild scenario
 * @property {ConfigurationFactory} config shared configuration
 */

/**
 * @param {BuildScenarioOptions} options options
 * @returns {BenchmarkDefinition[]} development, production and rebuild benches
 */
export function createBuildScenarios(options) {
	const { case: caseName, entryFile, config } = options;
	return [
		createBuildBench({
			case: caseName,
			config: () => ({ ...resolveConfig(config), mode: "development" })
		}),
		createBuildBench({
			case: caseName,
			config: () => ({ ...resolveConfig(config), mode: "production" })
		}),
		createWatchRebuildBench({
			case: caseName,
			entryFile,
			config: () => ({ ...resolveConfig(config), mode: "development" })
		})
	];
}
