"use strict";

require("./helpers/warmup-webpack");

const path = require("path");
const { Volume, createFsFromVolume } = require("memfs");

/** @typedef {import("../").Compilation} Compilation */
/** @typedef {import("../").Compiler} Compiler */
/** @typedef {import("../").Module} Module */
/** @typedef {import("../").NormalModule} NormalModule */
/** @typedef {import("../").Stats} Stats */
/** @typedef {import("../").WebpackPluginInstance} WebpackPluginInstance */

const CONTEXT = path.join(__dirname, "fixtures");

// One fixture per nesting level, so every level owns a module instance no other
// level shares — a shared instance is cleaned up by whichever level is reached.
const LEVEL_ENTRIES = ["./a.js", "./b.js", "./main1.js", "./main2.js"];

/**
 * Builds a chain of child compilations `depth` levels deep, each created from
 * the compilation above it.
 * @param {number} depth how many nested child compilations to create
 * @returns {WebpackPluginInstance} plugin
 */
const nestedChildPlugin = (depth) => ({
	apply(compiler) {
		const webpack = require("..");

		compiler.hooks.make.tapAsync(
			"NestedChildPlugin",
			(compilation, callback) => {
				/**
				 * @param {Compilation} parent compilation to create the child under
				 * @param {number} level current nesting level
				 * @param {(err?: Error | null) => void} done completion callback
				 * @returns {void}
				 */
				const build = (parent, level, done) => {
					const child = parent.createChildCompiler(`child-${level}`, {
						filename: `child-${level}.js`
					});
					child.hooks.make.tapAsync(
						"NestedChildPlugin",
						(childCompilation, cb) => {
							const dep = webpack.EntryPlugin.createDependency(
								LEVEL_ENTRIES[level + 1],
								{ name: `child-${level}` }
							);
							childCompilation.addEntry(
								CONTEXT,
								dep,
								`child-${level}`,
								(err) => {
									if (err) return cb(err);
									if (level + 1 < depth) {
										return build(childCompilation, level + 1, cb);
									}
									cb();
								}
							);
						}
					);
					child.runAsChild((err) => done(err));
				};
				build(compilation, 0, callback);
			}
		);
	}
});

/**
 * The modules that still carry compilation-scoped helpers, by base name.
 * @param {Module[]} modules modules of one compilation
 * @returns {string[]} sorted base names of the modules not cleaned up
 */
const retainedModules = (modules) =>
	modules
		.filter((module) => {
			const normalModule = /** @type {NormalModule} */ (module);
			return (
				normalModule.parser !== undefined ||
				normalModule.generator !== undefined
			);
		})
		.map((module) => path.basename(module.identifier()))
		.sort();

/**
 * Flattens a compilation tree into one entry per compilation.
 * @param {Compilation} compilation root compilation
 * @param {number} level nesting level of `compilation`
 * @param {{ level: number, modules: Module[] }[]} out collected levels
 * @returns {{ level: number, modules: Module[] }[]} collected levels
 */
const collectLevels = (compilation, level, out) => {
	out.push({ level, modules: [...compilation.modules] });
	for (const child of compilation.children) {
		collectLevels(child, level + 1, out);
	}
	return out;
};

/**
 * Runs one compilation and hands the compiler and stats to the caller before
 * closing it.
 * @param {import("../").Configuration} options webpack options
 * @returns {Promise<{ compiler: Compiler, stats: Stats, close: () => Promise<void> }>} the finished build
 */
const build = (options) =>
	new Promise((resolve, reject) => {
		const webpack = require("..");

		const compiler = webpack({
			mode: "production",
			context: CONTEXT,
			optimization: { minimize: false },
			...options
		});
		compiler.outputFileSystem =
			/** @type {import("../").OutputFileSystem} */
			(/** @type {unknown} */ (createFsFromVolume(new Volume())));
		compiler.run((err, stats) => {
			if (err) return reject(err);
			if (!stats) return reject(new Error("no stats"));
			if (stats.hasErrors()) {
				return reject(new Error(stats.toString({ errors: true })));
			}
			resolve({
				compiler,
				stats,
				close: () =>
					new Promise((res, rej) => {
						compiler.close((e) => (e ? rej(e) : res()));
					})
			});
		});
	});

/**
 * Runs one watch build and resolves once the compiler has gone idle.
 * @param {import("../").Configuration} options webpack options
 * @returns {Promise<{ compiler: Compiler, stats: Stats, close: () => Promise<void> }>} the finished build
 */
const watchOnce = (options) =>
	new Promise((resolve, reject) => {
		const webpack = require("..");

		const compiler = webpack({
			mode: "production",
			context: CONTEXT,
			optimization: { minimize: false },
			...options
		});
		compiler.outputFileSystem =
			/** @type {import("../").OutputFileSystem} */
			(/** @type {unknown} */ (createFsFromVolume(new Volume())));
		let settled = false;
		const watching = /** @type {import("../").Watching} */ (
			compiler.watch({ aggregateTimeout: 10 }, (err, stats) => {
				if (settled) return;
				settled = true;
				if (err) return reject(err);
				if (!stats) return reject(new Error("no stats"));
				if (stats.hasErrors()) {
					return reject(new Error(stats.toString({ errors: true })));
				}
				// afterDone fires after this handler on the same stack
				setImmediate(() => {
					resolve({
						compiler,
						stats,
						close: () =>
							new Promise((res, rej) => {
								watching.close((e) => (e ? rej(e) : res()));
							})
					});
				});
			})
		);
	});

describe("Compilation release", () => {
	it("cleans up modules of nested child compilations, not only direct children", async () => {
		const { compiler, stats, close } = await build({
			entry: "./a.js",
			output: { path: "/" },
			plugins: [nestedChildPlugin(3)]
		});
		const levels = collectLevels(stats.compilation, 0, []);
		expect(levels).toHaveLength(4);

		// what the next build does before it starts
		const internalCompiler =
			/** @type {import("../lib/Compiler")} */
			(/** @type {unknown} */ (compiler));

		internalCompiler._cleanupLastCompilation();

		const retained = levels.map(({ level, modules }) => ({
			level,
			retained: retainedModules(modules)
		}));
		expect(retained).toEqual([
			{ level: 0, retained: [] },
			{ level: 1, retained: [] },
			{ level: 2, retained: [] },
			{ level: 3, retained: [] }
		]);
		await close();
	});

	it("releases code generation results once a watch build goes idle", async () => {
		const { compiler, stats, close } = await watchOnce({
			entry: "./c.js",
			output: { path: "/" }
		});
		const internalCompiler =
			/** @type {import("../lib/Compiler")} */
			(/** @type {unknown} */ (compiler));

		expect(stats.compilation.modules.size).toBeGreaterThan(0);
		expect(internalCompiler._lastCompilation).toBe(stats.compilation);
		const { codeGenerationResults } = stats.compilation;
		expect(codeGenerationResults && codeGenerationResults.map.size).toBe(0);
		// the stats a watch handler was handed must still render
		const assets = stats.toJson({ all: false, assets: true }).assets;
		expect(assets && assets.length).toBeGreaterThan(0);
		await close();
	});
});
