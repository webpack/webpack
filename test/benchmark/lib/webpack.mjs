import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @typedef {import("../../..")} Webpack */
/** @typedef {import("../../..").Configuration} Configuration */
/** @typedef {import("../../..").Stats} Stats */
/** @typedef {import("../../..").Watching} Watching */
/** @typedef {import("./suite.mjs").BenchmarkDefinition} BenchmarkDefinition */
/** @typedef {Configuration | (() => Configuration)} ConfigurationFactory */

/**
 * The webpack of the current working tree. Non-comparative by design: no
 * baseline revision is ever checked out or imported next to it.
 * @returns {Webpack} webpack
 */
export function loadWebpack() {
	return require("../../../lib/index.js");
}

// Build output lives under test/js (gitignored), separate from the legacy
// comparative runner's test/js/benchmark.
const outputRoot = path.resolve(__dirname, "../../js/benchmark-suite");

/**
 * Normalize an e2e case config: entry/context anchored at the case directory,
 * output isolated per benchmark so cases can't observe each other's files.
 * @param {string} caseDir directory of the e2e case
 * @param {string} benchName benchmark name within the case
 * @param {Configuration} config partial configuration
 * @returns {Configuration} built configuration
 */
export function prepareConfig(caseDir, benchName, config) {
	const caseName = path.basename(caseDir);
	/** @type {Configuration} */
	const result = {
		devtool: false,
		performance: false,
		...config,
		context: caseDir,
		name: `${caseName}-${benchName}`
	};
	result.output = {
		...result.output,
		path: path.join(
			outputRoot,
			caseName,
			benchName.replace(/[^\w-]+/g, "_")
		)
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
 * @property {string} name benchmark name
 * @property {string} caseDir directory of the e2e case
 * @property {ConfigurationFactory} config configuration or fresh config factory
 */

/**
 * @param {BuildBenchOptions} options options
 * @returns {BenchmarkDefinition} build benchmark
 */
export function createBuildBench({ name, caseDir, config }) {
	return {
		name,
		fn() {
			const resolvedConfig =
				typeof config === "function" ? config() : config;
			return runBuild(prepareConfig(caseDir, name, resolvedConfig));
		}
	};
}

/**
 * @typedef {object} WatchRebuildOptions
 * @property {string} name benchmark name
 * @property {string} caseDir directory of the e2e case
 * @property {ConfigurationFactory} config partial configuration; entry must be a file path
 * @property {string} entryFile absolute path of the file touched to trigger rebuilds
 */

/**
 * Benchmark rebuilds while alternating between equal-length source changes.
 * @param {WatchRebuildOptions} options options
 * @returns {BenchmarkDefinition} a benchmark definition
 */
export function createWatchRebuildBench(options) {
	const { name, caseDir, config, entryFile } = options;

	const { promises: fsp } = require("fs");

	/** @type {Watching | undefined} */
	let watching;
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
		name,
		async beforeAll() {
			originalContent = await fsp.readFile(entryFile, "utf8");
			const webpack = loadWebpack();
			const resolvedConfig =
				typeof config === "function" ? config() : config;
			const watchConfig = prepareConfig(caseDir, name, {
				...resolvedConfig,
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
			try {
				await firstBuild;
			} catch (err) {
				await new Promise((resolve) => {
					/** @type {Watching} */ (watching).close(() => resolve(undefined));
				});
				watching = undefined;
				throw err;
			}
		},
		async fn() {
			const build = nextBuild();
			iteration++;
			await fsp.writeFile(
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
				await fsp.writeFile(entryFile, originalContent);
			}
		}
	};
}

/**
 * @typedef {object} BuildScenarioOptions
 * @property {string} caseDir directory of the e2e case
 * @property {string} entryFile entry file changed by the rebuild scenario
 * @property {ConfigurationFactory} config shared configuration
 * @property {string=} namePrefix benchmark name prefix
 * @property {boolean=} production include a production build
 * @property {boolean=} rebuild include a development rebuild
 */

/**
 * @param {BuildScenarioOptions} options options
 * @returns {BenchmarkDefinition[]} development, production and rebuild benches
 */
export function createBuildScenarios(options) {
	const {
		caseDir,
		entryFile,
		config,
		namePrefix = "",
		production = true,
		rebuild = true
	} = options;
	const prefix = namePrefix ? `${namePrefix} ` : "";
	const resolveConfig = () =>
		typeof config === "function" ? config() : config;
	/** @type {BenchmarkDefinition[]} */
	const benches = [
		createBuildBench({
			name: `${prefix}development build`,
			caseDir,
			config: () => ({ ...resolveConfig(), mode: "development" })
		})
	];
	if (production) {
		benches.push(
			createBuildBench({
				name: `${prefix}production build`,
				caseDir,
				config: () => ({ ...resolveConfig(), mode: "production" })
			})
		);
	}
	if (rebuild) {
		benches.push(
			createWatchRebuildBench({
				name: `${prefix}development rebuild`,
				caseDir,
				entryFile,
				config: () => ({ ...resolveConfig(), mode: "development" })
			})
		);
	}
	return benches;
}
