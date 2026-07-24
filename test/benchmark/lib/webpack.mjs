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
				if (err) return reject(err);
				if (stats && (stats.hasWarnings() || stats.hasErrors())) {
					return reject(new Error(stats.toString()));
				}
				compiler.close((closeErr) => {
					if (closeErr) return reject(closeErr);
					if (stats) stats.toString();
					resolve();
				});
			});
		}
	);
}

/**
 * @typedef {object} WatchRebuildOptions
 * @property {string} name benchmark name
 * @property {string} caseDir directory of the e2e case
 * @property {Configuration} config partial configuration; entry must be a file path
 * @property {string} entryFile absolute path of the file touched to trigger rebuilds
 * @property {Partial<BenchmarkDefinition>=} overrides sampling overrides
 */

/**
 * Benchmark an incremental rebuild: a watcher is opened once, each measured
 * round appends a changed statement to the entry and awaits the rebuild.
 * The two alternating suffixes have equal length so the parsed source only
 * flips between two shapes instead of growing.
 * @param {WatchRebuildOptions} options options
 * @returns {BenchmarkDefinition} a benchmark definition for defineSuite
 */
export function createWatchRebuildBench(options) {
	const { name, caseDir, config, entryFile, overrides } = options;

	const { promises: fsp } = require("fs");

	/** @type {Watching | undefined} */
	let watching;
	/** @type {string} */
	let originalContent = "";
	/** @type {((err: Error | null, stats?: Stats) => void) | undefined} */
	let next;
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
					if (err || !stats) return reject(err);
					if (stats.hasWarnings() || stats.hasErrors()) {
						return reject(new Error(stats.toString()));
					}
					stats.toString();
					resolve();
				};
			}
		);

	return {
		name,
		async beforeAll() {
			originalContent = await fsp.readFile(entryFile, "utf8");
			const webpack = loadWebpack();
			const watchConfig = prepareConfig(caseDir, name, {
				...config,
				// Keep rebuilds warm but bounded, like a dev-server session.
				cache: { type: "memory", maxGenerations: 1 }
			});
			const firstBuild = nextBuild();
			watching = webpack(watchConfig).watch({}, (err, stats) => {
				if (next) next(err, stats);
			});
			await firstBuild;
		},
		async fn() {
			const build = nextBuild();
			iteration++;
			await fsp.writeFile(
				entryFile,
				`${originalContent};console.log(${iteration % 2});`
			);
			await build;
		},
		async afterAll() {
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
			await fsp.writeFile(entryFile, originalContent);
		},
		...overrides
	};
}
