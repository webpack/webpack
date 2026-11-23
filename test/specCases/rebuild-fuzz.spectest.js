"use strict";

// Applies seeded edit sequences to a small project and, after every step,
// holds the watch rebuild and a build restored from the persistent cache to a
// fresh build, and a second cached build with no edit to writing nothing.
// Hot variants also run the bundle and apply each update, and hold what the
// running bundle then exports to what a fresh build's bundle exports.

const fs = require("fs");
const os = require("os");
const path = require("path");
const vm = require("vm");
const { Volume, createFsFromVolume } = require("memfs");
const webpack = require("../../");
const NodeWatchFileSystem = require("../../lib/node/NodeWatchFileSystem");
const {
	applyEdit,
	cloneProject,
	createProject,
	generateSteps,
	renderFiles
} = require("../helpers/rebuildFuzzProject");
const { isInPart } = require("../helpers/testParts");

/** @typedef {import("../helpers/rebuildFuzzProject").Edit} Edit */
/** @typedef {import("../helpers/rebuildFuzzProject").Project} Project */
/** @typedef {import("../../").Configuration} Configuration */
/** @typedef {import("../../").Compiler} Compiler */
/** @typedef {import("../../").Compilation} Compilation */
/** @typedef {import("../../").Stats} Stats */
/** @typedef {import("../../").InputFileSystem} InputFileSystem */
/** @typedef {import("memfs").IFs} IFs */
/** @typedef {{ mode: "production" | "development", splitChunks?: boolean, watchCache?: "filesystem", cacheUnaffected?: boolean, concatenateModules?: boolean, hot?: boolean }} Variant */
/** @typedef {{ assets: Record<string, string>, hash: string, entry: string | undefined, errors: string[], warnings: string[] }} Result */
/** @typedef {{ context: vm.Context, error: string | undefined }} Runtime */
/** @typedef {{ step: number, check: string, detail: string }} Failure */
/** @typedef {{ files: Set<string>, directories: Set<string>, missing: Set<string>, callback: (...args: EXPECTED_ANY[]) => void, undelayed?: (...args: EXPECTED_ANY[]) => void }} PendingWatch */

const SEED_COUNT = Number(process.env.REBUILD_FUZZ_SEEDS) || 100;
const STEPS = Number(process.env.REBUILD_FUZZ_STEPS) || 25;
const SEED_TIMEOUT = 300000;
// Shrinking a long sequence can rebuild hundreds of times; past this the
// failure is reported with what has been shrunk so far.
const SHRINK_BUDGET = 120000;

/** @type {Variant[]} */
const VARIANTS = [
	{ mode: "production" },
	{ mode: "development" },
	{ mode: "production", splitChunks: true },
	{ mode: "production", watchCache: "filesystem" },
	{ mode: "development", watchCache: "filesystem" },
	{ mode: "production", cacheUnaffected: true },
	{ mode: "development", cacheUnaffected: true },
	// production already defaults concatenateModules on; these force it with
	// cacheUnaffected, a combination webpack only recently started allowing
	{ mode: "production", concatenateModules: true, cacheUnaffected: true },
	{ mode: "development", concatenateModules: true, cacheUnaffected: true },
	// splitChunks and cacheUnaffected have never been fuzzed together either
	{ mode: "production", splitChunks: true, cacheUnaffected: true },
	{ mode: "development", hot: true },
	{ mode: "development", hot: true, watchCache: "filesystem" },
	{ mode: "development", hot: true, cacheUnaffected: true },
	{ mode: "development", hot: true, splitChunks: true },
	{ mode: "production", hot: true }
];

/** @type {number[]} */
const SEEDS = (() => {
	const seed = process.env.REBUILD_FUZZ_SEED;
	if (seed === "random") return [Math.floor(Math.random() * 1e9)];
	if (seed) return [Number(seed)];
	return Array.from({ length: SEED_COUNT }, (_, i) => i + 1);
})();

// Every write is dated to its step, in the past, so the watcher's accuracy
// window never hides an edit and two steps never share a time.
const T0 = Math.floor(Date.now() / 1000 - 10 * 24 * 3600) * 1000;

/**
 * Stands in for NodeWatchFileSystem: reports exactly the edits a step made, in
 * watchpack's time-info format and only for what webpack asked to watch, and
 * runs the real purge of what a new watch call no longer watches.
 */
class FakeWatchFileSystem {
	/**
	 * @param {InputFileSystem} inputFileSystem the compiler's input file system
	 */
	constructor(inputFileSystem) {
		this.inputFileSystem = inputFileSystem;
		/** @type {PendingWatch | undefined} */
		this.pending = undefined;
		/** @type {EXPECTED_ANY} */
		this._watched = undefined;
	}

	/**
	 * @param {Iterable<string>} files files
	 * @param {Iterable<string>} directories directories
	 * @param {Iterable<string>} missing missing paths
	 * @param {number} startTime start time
	 * @param {EXPECTED_OBJECT} options watch options
	 * @param {(...args: EXPECTED_ANY[]) => void} callback called with the changes
	 * @param {(...args: EXPECTED_ANY[]) => void=} undelayed called at the first change
	 * @returns {EXPECTED_ANY} the watcher
	 */
	watch(files, directories, missing, startTime, options, callback, undelayed) {
		/** @type {PendingWatch} */
		const pending = {
			files: new Set(files),
			directories: new Set(directories),
			missing: new Set(missing),
			callback,
			undelayed
		};
		this.pending = pending;
		NodeWatchFileSystem.prototype._purgeUnwatched.call(
			this,
			pending.files,
			pending.directories,
			pending.missing
		);
		return {
			close: () => {
				if (this.pending === pending) this.pending = undefined;
			},
			pause: () => {},
			getInfo: () => ({
				changes: new Set(),
				removals: new Set(),
				...this.timeInfo(pending)
			})
		};
	}

	/**
	 * @param {PendingWatch} pending what is watched
	 * @returns {{ fileTimeInfoEntries: Map<string, EXPECTED_OBJECT | null>, contextTimeInfoEntries: Map<string, EXPECTED_OBJECT> }} time info
	 */
	timeInfo(pending) {
		/** @type {Map<string, EXPECTED_OBJECT | null>} */
		const fileTimeInfoEntries = new Map();
		for (const file of [...pending.files, ...pending.missing]) {
			let stat;
			try {
				stat = fs.statSync(file);
			} catch (_err) {
				fileTimeInfoEntries.set(file, null);
				continue;
			}
			const time = Number(stat.mtime);
			fileTimeInfoEntries.set(
				file,
				stat.isDirectory()
					? {}
					: { safeTime: time + 1, timestamp: time, accuracy: 1 }
			);
		}
		return { fileTimeInfoEntries, contextTimeInfoEntries: new Map() };
	}

	/**
	 * @param {Set<string>} touched every path a step changed or created, and their folders
	 * @param {Set<string>} removed every path a step deleted
	 * @returns {boolean} whether webpack watched any of them, so a rebuild starts
	 */
	trigger(touched, removed) {
		const pending = /** @type {PendingWatch} */ (this.pending);
		// watchpack reports a folder's content only for a watched directory,
		// not for a folder watched as a file
		/**
		 * @param {string} item path
		 * @returns {boolean} whether watchpack would report it
		 */
		const watched = (item) =>
			(pending.files.has(item) &&
				!(fs.existsSync(item) && fs.statSync(item).isDirectory())) ||
			pending.missing.has(item) ||
			pending.directories.has(item);
		const changes = new Set([...touched].filter(watched));
		const removals = new Set([...removed].filter(watched));
		// watchpack reports a watched directory for a change anywhere under it
		for (const item of [...touched, ...removed]) {
			let folder = path.dirname(item);
			while (folder !== path.dirname(folder)) {
				if (pending.directories.has(folder)) changes.add(folder);
				folder = path.dirname(folder);
			}
		}
		if (changes.size === 0 && removals.size === 0) return false;
		this.pending = undefined;
		const inputFileSystem = /** @type {Required<InputFileSystem>} */ (
			this.inputFileSystem
		);
		for (const item of changes) {
			inputFileSystem.purge(
				item,
				pending.directories.has(item)
					? { exact: true, readdirPrefix: true }
					: undefined
			);
		}
		for (const item of removals) inputFileSystem.purge(item);
		if (pending.undelayed) {
			pending.undelayed([...changes, ...removals][0], Date.now());
		}
		const { fileTimeInfoEntries, contextTimeInfoEntries } =
			this.timeInfo(pending);
		pending.callback(
			null,
			fileTimeInfoEntries,
			contextTimeInfoEntries,
			changes,
			removals
		);
		return true;
	}
}

/**
 * @param {string} dir project folder
 * @param {Variant} variant variant
 * @param {Configuration["cache"]} cache cache option
 * @param {string[]} logs collects every infrastructure log line
 * @returns {Configuration} configuration
 */
const createConfig = (dir, variant, cache, logs) => ({
	context: dir,
	entry: "./index.js",
	mode: variant.mode,
	target: variant.hot ? "node" : undefined,
	devtool: false,
	output: {
		path: "/out",
		// the entry holds the hash HotModuleReplacementPlugin changes per update
		filename: variant.hot ? "[name].js" : "[name].[contenthash].js",
		chunkFilename: "[id].[contenthash].js"
	},
	optimization: {
		minimize: false,
		// errored builds still emit, so their output is compared too
		emitOnErrors: true,
		moduleIds: "deterministic",
		chunkIds: "deterministic",
		concatenateModules: variant.concatenateModules,
		splitChunks: variant.splitChunks
			? { chunks: "all", minSize: 0, cacheGroups: { defaultVendors: false } }
			: undefined
	},
	module: { rules: [{ test: /\.txt$/, type: "asset/source" }] },
	plugins: variant.hot ? [new webpack.HotModuleReplacementPlugin()] : undefined,
	cache,
	experiments: variant.cacheUnaffected ? { cacheUnaffected: true } : undefined,
	infrastructureLogging: {
		level: "log",
		console: /** @type {Console} */ (
			/** @type {unknown} */ (
				new Proxy(
					{},
					{
						get:
							(_target, method) =>
							(/** @type {unknown[]} */ ...args) =>
								logs.push(`${String(method)}: ${args.join(" ")}`)
					}
				)
			)
		)
	}
});

/**
 * Records each asset's source at `emit`, before webpack frees it.
 * @param {Compiler} compiler compiler
 * @param {WeakMap<Compilation, Record<string, string>>} assets sink
 * @returns {IFs} the in-memory output file system
 */
const recordAssets = (compiler, assets) => {
	const outputFileSystem = createFsFromVolume(new Volume());
	compiler.outputFileSystem = /** @type {EXPECTED_ANY} */ (outputFileSystem);
	compiler.hooks.emit.tap("RebuildFuzz", (compilation) => {
		/** @type {Record<string, string>} */
		const sources = {};
		for (const asset of compilation.getAssets()) {
			sources[asset.name] = asset.source.source().toString();
		}
		assets.set(compilation, sources);
	});
	return outputFileSystem;
};

// WHY: the closest-name hint lists a folder no watcher reports a change of
// (webpack has no shallow folder watch yet), so watch keeps the hint of the
// build that first wrote it; the error itself still has to match.
const CLOSEST_NAME_HINT = /\nDid you mean[\s\S]*$/;

/**
 * @param {Stats} stats stats
 * @param {string} dir project folder, replaced in messages
 * @param {WeakMap<Compilation, Record<string, string>>} assets recorded assets
 * @returns {Result} what is compared
 */
const toResult = (stats, dir, assets) => {
	const { compilation } = stats;
	/**
	 * @param {Error[]} list errors or warnings
	 * @returns {string[]} their messages, without the folder and the hint
	 */
	const messages = (list) =>
		list
			.map((error) =>
				`${error.message}`.split(dir).join("<dir>").replace(CLOSEST_NAME_HINT, "")
			)
			.sort();
	const main = compilation.namedChunks.get("main");
	return {
		assets: assets.get(compilation) || {},
		hash: /** @type {string} */ (compilation.hash),
		entry: main && [...main.files].find((file) => file.endsWith(".js")),
		errors: messages(compilation.errors),
		warnings: messages(compilation.warnings)
	};
};

/**
 * @param {Configuration} options configuration
 * @returns {Promise<Result>} a one-off build's result
 */
const buildOnce = (options) =>
	new Promise((resolve, reject) => {
		const compiler = webpack(options);
		/** @type {WeakMap<Compilation, Record<string, string>>} */
		const assets = new WeakMap();
		recordAssets(compiler, assets);
		compiler.run((err, stats) => {
			if (err) return compiler.close(() => reject(err));
			const result = toResult(
				/** @type {Stats} */ (stats),
				/** @type {string} */ (options.context),
				assets
			);
			compiler.close((closeError) =>
				closeError ? reject(closeError) : resolve(result)
			);
		});
	});

/**
 * @param {Result} got the incremental result
 * @param {Result} expected the fresh result
 * @returns {string | undefined} the first difference
 */
const compare = (got, expected) => {
	/** @type {(key: "errors" | "warnings") => string | undefined} */
	const messages = (key) =>
		JSON.stringify(got[key]) === JSON.stringify(expected[key])
			? undefined
			: `${key} differ:\n  got:      ${JSON.stringify(got[key])}\n  expected: ${JSON.stringify(expected[key])}`;
	// WHY: a module that fails to parse keeps its last good buildMeta in
	// watch (NormalModule#markModuleAsErrored), so its importers' output
	// and warnings differ from a fresh build by design.
	if (expected.errors.some((error) => error.includes("Module parse failed"))) {
		return messages("errors");
	}
	// a fresh build writes no hot update, and HotModuleReplacementPlugin folds
	// its update count into the hash the hot runtime prints
	const names = new Set(
		[...Object.keys(got.assets), ...Object.keys(expected.assets)].filter(
			(name) => !HOT_UPDATE.test(name)
		)
	);
	for (const name of [...names].sort()) {
		if (!(name in got.assets)) return `asset ${name} missing`;
		if (!(name in expected.assets)) return `asset ${name} unexpected`;
		const gotSource = got.assets[name].split(got.hash).join("<hash>");
		const expectedSource = expected.assets[name]
			.split(expected.hash)
			.join("<hash>");
		if (gotSource !== expectedSource) {
			const gotLines = gotSource.split("\n");
			const expectedLines = expectedSource.split("\n");
			let line = 0;
			while (gotLines[line] === expectedLines[line]) line++;
			return `asset ${name} differs at line ${line + 1}:\n  got:      ${gotLines[line]}\n  expected: ${expectedLines[line]}`;
		}
	}
	return messages("errors") || messages("warnings");
};

const HOT_UPDATE = /\.hot-update\.(?:js|json)$/;

/**
 * Runs a bundle as node would, reading every file it requires from the output.
 * @param {string | undefined} entry the entry chunk's file
 * @param {(name: string) => string | undefined} readFile reads an emitted file
 * @returns {Runtime} the running bundle, or what its startup threw
 */
const startRuntime = (entry, readFile) => {
	const context = vm.createContext({
		setTimeout,
		clearTimeout,
		console: { log() {}, warn() {}, error() {} }
	});
	/**
	 * @param {string} request request from a file in the output folder
	 * @returns {EXPECTED_ANY} what node's require would return
	 */
	const load = (request) => {
		if (!request.startsWith(".")) return require(request);
		const name = path.posix.normalize(request);
		const source = readFile(name);
		if (source === undefined) {
			const error = /** @type {Error & { code: string }} */ (
				new Error(`Cannot find module '${request}'`)
			);
			error.code = "MODULE_NOT_FOUND";
			throw error;
		}
		if (name.endsWith(".json")) return JSON.parse(source);
		const module = { exports: {} };
		vm.runInContext(
			`(function (exports, require, module, __filename, __dirname) {${source}\n})`,
			context
		)(module.exports, load, module, `/out/${name}`, "/out");
		return module.exports;
	};
	try {
		load(`./${entry}`);
		return { context, error: undefined };
	} catch (err) {
		return { context, error: String(/** @type {Error} */ (err).message) };
	}
};

/**
 * Reads what the running bundle exports, calling every `use()` and dynamic
 * import it reaches, so modules loaded and updated later are read too.
 * @param {Runtime} runtime runtime
 * @returns {Promise<string>} the state as JSON
 */
const snapshot = async (runtime) => {
	if (runtime.error) return `startup threw: ${runtime.error}`;
	// each function runs once, so every use() and import is reached and the
	// walk ends with what the bundle holds
	/** @type {Set<unknown>} */
	const seen = new Set();
	/**
	 * @param {unknown} value value
	 * @returns {Promise<unknown>} a JSON-able copy
	 */
	const read = async (value) => {
		if (typeof value !== "object" && typeof value !== "function") {
			return value;
		}
		if (value === null) return null;
		if (seen.has(value)) return "<seen>";
		seen.add(value);
		if (typeof value === "function") {
			try {
				return { called: await read(await value()) };
			} catch (err) {
				return `threw: ${/** @type {Error} */ (err).message}`;
			}
		}
		if (Array.isArray(value)) {
			const items = [];
			for (const item of value) items.push(await read(item));
			return items;
		}
		const object = /** @type {Record<string | symbol, unknown>} */ (value);
		/** @type {Record<string, unknown>} */
		const result = {};
		if (object[Symbol.toStringTag] === "Module") result["<module>"] = true;
		for (const key of Object.keys(object).sort()) {
			try {
				result[key] = await read(object[key]);
			} catch (err) {
				result[key] = `threw: ${/** @type {Error} */ (err).message}`;
			}
		}
		return result;
	};
	return JSON.stringify(await read(runtime.context.root));
};

/**
 * @param {string} got the updated bundle's state
 * @param {string} expected the fresh bundle's state
 * @returns {string} both around their first difference
 */
const stateDifference = (got, expected) => {
	let index = 0;
	while (got[index] === expected[index]) index++;
	const start = Math.max(0, index - 80);
	return `state differs at ${index}:\n  got:      ${got.slice(start, index + 80)}\n  expected: ${expected.slice(start, index + 80)}`;
};

/**
 * Writes the project's files, deletes the ones it no longer has and dates
 * every change to the step.
 * @param {string} dir project folder
 * @param {Map<string, string>} wanted files the step has
 * @param {Project} project project
 * @param {number} step step
 * @returns {{ touched: Set<string>, removed: Set<string> }} what changed on disk
 */
const writeStep = (dir, wanted, project, step) => {
	/** @type {Set<string>} */
	const touched = new Set();
	/** @type {Set<string>} */
	const removed = new Set();
	const time = new Date(T0 + step * 1000);
	/** @type {Set<string>} */
	const present = new Set();
	/**
	 * @param {string} folder folder relative to dir
	 */
	const walk = (folder) => {
		for (const entry of fs.readdirSync(path.join(dir, folder), {
			withFileTypes: true
		})) {
			const child = folder ? `${folder}/${entry.name}` : entry.name;
			if (entry.isDirectory()) walk(child);
			else present.add(child);
		}
	};
	walk("");
	for (const [name, source] of wanted) {
		const file = path.join(dir, name);
		if (present.has(name) && fs.readFileSync(file, "utf8") === source) {
			continue;
		}
		if (!present.has(name)) {
			fs.mkdirSync(path.dirname(file), { recursive: true });
			touched.add(path.dirname(file));
		}
		fs.writeFileSync(file, source);
		fs.utimesSync(file, time, time);
		touched.add(file);
	}
	for (const name of present) {
		if (wanted.has(name)) continue;
		const file = path.join(dir, name);
		fs.unlinkSync(file);
		removed.add(file);
		touched.add(path.dirname(file));
	}
	for (const name of project.touched) {
		const file = path.join(dir, name);
		if (fs.existsSync(file) && !touched.has(file)) {
			fs.utimesSync(file, time, time);
			touched.add(file);
		}
	}
	for (const item of touched) {
		if (fs.existsSync(item) && fs.statSync(item).isDirectory()) {
			fs.utimesSync(item, time, time);
		}
	}
	return { touched, removed };
};

/**
 * Runs one edit sequence and checks every step.
 * @param {Edit[][]} steps edits of each step
 * @param {Variant} variant variant
 * @returns {Promise<Failure | undefined>} the first failure
 */
const runSequence = async (steps, variant) => {
	const root = fs.realpathSync(
		fs.mkdtempSync(path.join(os.tmpdir(), "webpack-rebuild-fuzz-"))
	);
	const dir = path.join(root, "src");
	fs.mkdirSync(dir);
	let project = createProject();
	/** @type {(Result | Error)[]} */
	const builds = [];
	/** @type {((outcome: Result | Error) => void) | undefined} */
	let waiting;
	/** @type {Compiler | undefined} */
	let compiler;
	/** @type {import("../../").Watching | undefined} */
	let watching;
	/** @type {Runtime | undefined} */
	let runtime;
	try {
		writeStep(dir, renderFiles(project, variant.hot), project, 0);
		compiler = webpack(
			createConfig(
				dir,
				variant,
				variant.watchCache === "filesystem"
					? {
							type: "filesystem",
							cacheDirectory: path.join(root, "watch-cache")
						}
					: { type: "memory" },
				[]
			)
		);
		const watchCompiler = compiler;
		/** @type {WeakMap<Compilation, Record<string, string>>} */
		const assets = new WeakMap();
		const output = recordAssets(watchCompiler, assets);
		/**
		 * @param {string} name file name
		 * @returns {string | undefined} what the watch build last wrote there
		 */
		const readOutput = (name) => {
			try {
				return String(output.readFileSync(`/out/${name}`, "utf8"));
			} catch (_err) {
				return undefined;
			}
		};
		// WHY: watch reads records once, and RecordIdsPlugin then keeps chunk
		// and module ids stable across rebuilds on purpose; a fresh build has
		// none, so they are cleared to compare like with like. The rest stays
		// for HotModuleReplacementPlugin, which reads what changed from it.
		watchCompiler.hooks.watchRun.tap("RebuildFuzz", () => {
			watchCompiler.records = variant.hot
				? { ...watchCompiler.records, modules: undefined, chunks: undefined }
				: {};
		});
		const watchFileSystem = new FakeWatchFileSystem(
			/** @type {InputFileSystem} */ (watchCompiler.inputFileSystem)
		);
		watchCompiler.watchFileSystem = /** @type {EXPECTED_ANY} */ (
			watchFileSystem
		);
		/** @returns {Promise<Result>} the next watch build, rejected on a fatal error */
		const nextBuild = () =>
			new Promise((resolve, reject) => {
				/** @type {(outcome: Result | Error) => void} */
				const settle = (outcome) =>
					outcome instanceof Error ? reject(outcome) : resolve(outcome);
				const outcome = builds.shift();
				if (outcome) settle(outcome);
				else waiting = settle;
			});
		watching = watchCompiler.watch({}, (err, stats) => {
			const outcome =
				err || toResult(/** @type {Stats} */ (stats), dir, assets);
			if (waiting) {
				const settle = waiting;
				waiting = undefined;
				settle(outcome);
			} else {
				builds.push(outcome);
			}
		});
		let watched = await nextBuild();
		const cacheDirectory = path.join(root, "cache");
		for (let step = 0; step <= steps.length; step++) {
			let rebuilt = false;
			if (step > 0) {
				project = cloneProject(project);
				for (const edit of steps[step - 1]) applyEdit(project, edit);
				const { touched, removed } = writeStep(
					dir,
					renderFiles(project, variant.hot),
					project,
					step
				);
				if (watchFileSystem.trigger(touched, removed)) {
					watched = await nextBuild();
					rebuilt = true;
				}
			}
			const fresh = await buildOnce(createConfig(dir, variant, false, []));
			const watchDifference = compare(watched, fresh);
			if (watchDifference) {
				return { step, check: "watch", detail: watchDifference };
			}
			// as a dev server does, an errored build is reloaded, not applied
			if (variant.hot && fresh.errors.length > 0) runtime = undefined;
			if (variant.hot && fresh.errors.length === 0) {
				const expected = await snapshot(
					startRuntime(fresh.entry, (name) => fresh.assets[name])
				);
				if (!runtime) {
					runtime = startRuntime(watched.entry, readOutput);
				} else if (rebuilt) {
					try {
						await runtime.context.hot.check(true);
					} catch (err) {
						const { message } = /** @type {Error} */ (err);
						return { step, check: "hot", detail: `update failed: ${message}` };
					}
				}
				const got = await snapshot(runtime);
				if (runtime.error) runtime = undefined;
				if (got !== expected) {
					return { step, check: "hot", detail: stateDifference(got, expected) };
				}
			}
			const cacheConfig = /** @type {Configuration["cache"]} */ ({
				type: "filesystem",
				cacheDirectory
			});
			const cached = await buildOnce(
				createConfig(dir, variant, cacheConfig, [])
			);
			const cacheDifference = compare(cached, fresh);
			if (cacheDifference) {
				return { step, check: "cache", detail: cacheDifference };
			}
			if (fresh.errors.length === 0) {
				// nothing changed since the cached build, so nothing may be written
				/** @type {string[]} */
				const logs = [];
				const restored = await buildOnce(
					createConfig(dir, variant, cacheConfig, logs)
				);
				const restoredDifference = compare(restored, fresh);
				if (restoredDifference) {
					return { step, check: "cache", detail: restoredDifference };
				}
				const write = logs.find((line) => line.includes("Pack got invalid"));
				if (write) return { step, check: "cache write", detail: write };
			}
		}
		return undefined;
	} finally {
		const openWatching = watching;
		const openCompiler = compiler;
		if (openWatching) {
			await new Promise((resolve) => {
				openWatching.close(resolve);
			});
		}
		// the filesystem cache stores its pack on close, so the folder goes after
		if (openCompiler) {
			await new Promise((resolve) => {
				openCompiler.close(resolve);
			});
		}
		fs.rmSync(root, { recursive: true, force: true });
	}
};

/**
 * Drops steps, then single edits, while the same check still fails.
 * @param {Edit[][]} steps edits of each step, up to the failing one
 * @param {Variant} variant variant
 * @param {Failure} failure the failure to keep
 * @returns {Promise<{ steps: Edit[][], failure: Failure }>} the shortest sequence found
 */
const shrink = async (steps, variant, failure) => {
	const deadline = Date.now() + SHRINK_BUDGET;
	let best = steps;
	let bestFailure = failure;
	/**
	 * @param {Edit[][]} candidate candidate sequence
	 * @returns {Promise<boolean>} whether it still fails the same check
	 */
	const keep = async (candidate) => {
		const result = await runSequence(candidate, variant);
		if (!result || result.check !== failure.check) return false;
		best = candidate.slice(0, result.step);
		bestFailure = result;
		return true;
	};
	let changed = true;
	while (changed && Date.now() < deadline) {
		changed = false;
		for (let i = best.length - 1; i >= 0 && Date.now() < deadline; i--) {
			if (await keep([...best.slice(0, i), ...best.slice(i + 1)])) {
				changed = true;
			}
		}
		for (let i = best.length - 1; i >= 0 && Date.now() < deadline; i--) {
			for (let j = best[i].length - 1; j >= 0 && best[i].length > 1; j--) {
				const candidate = best.map((edits) => [...edits]);
				candidate[i].splice(j, 1);
				if (await keep(candidate)) changed = true;
			}
		}
	}
	return { steps: best, failure: bestFailure };
};

describe("rebuild fuzz", () => {
	for (const seed of SEEDS) {
		// each part picks its own random seed, so every part runs it
		if (process.env.REBUILD_FUZZ_SEED !== "random" && !isInPart(`${seed}`)) {
			continue;
		}
		const variant = VARIANTS[seed % VARIANTS.length];

		it(
			`seed ${seed} (${JSON.stringify(variant)})`,
			async () => {
				const steps = generateSteps(seed, STEPS);
				const failure = await runSequence(steps, variant);
				if (!failure) return;
				const small = await shrink(
					steps.slice(0, failure.step),
					variant,
					failure
				);
				throw new Error(
					`${small.failure.check} differs at step ${small.failure.step} of seed ${seed}\n${small.failure.detail}\nshrunk edits: ${JSON.stringify(small.steps)}`
				);
			},
			SEED_TIMEOUT
		);
	}
});
