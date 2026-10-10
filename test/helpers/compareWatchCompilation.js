"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const webpack = require("../..");
const assertModuleGraph = require("./assertModuleGraph");

/** @import { Compilation, Compiler, Configuration, MultiCompiler, MultiStats, Stats } from "../../" */
/** @typedef {{ name: string, content: Buffer }[]} Assets */

/**
 * Captures asset contents before emit can replace them with size-only sources.
 * @param {Compiler} compiler compiler to observe
 * @returns {(compilation: Compilation) => Assets} assets belonging to a compilation
 */
const captureAssets = (compiler) => {
	/** @type {WeakMap<Compilation, Assets>} */
	const assets = new WeakMap();
	compiler.hooks.afterCompile.tap("CompareWatchCompilation", (compilation) => {
		assets.set(
			compilation,
			compilation
				.getAssets()
				.map(({ name, source }) => ({ name, content: source.buffer() }))
				.sort((a, b) => a.name.localeCompare(b.name))
		);
	});
	return (compilation) => {
		const result = assets.get(compilation);
		assert(result, "Compilation assets were not captured");
		return result;
	};
};

/**
 * @param {Stats} stats build result
 * @returns {{ errors: import("../../").StatsError[] | undefined, warnings: import("../../").StatsError[] | undefined }} comparable diagnostics
 */
const getDiagnostics = (stats) => {
	const { errors, warnings } = stats.toJson({
		all: false,
		errors: true,
		warnings: true,
		errorDetails: false,
		moduleTrace: false
	});
	return { errors, warnings };
};

/**
 * Maps each compiler's output dependencies to the watched output directory.
 * @param {Compilation} compilation compilation to compare
 * @param {string} outputPath watched output directory
 * @returns {{ fileDependencies: string[], contextDependencies: string[], missingDependencies: string[] }} comparable watch dependencies
 */
const getWatchDependencies = (compilation, outputPath) => {
	/**
	 * @param {string} dependency watched path
	 * @returns {string} path in the common output directory
	 */
	const normalize = (dependency) => {
		const relative = path.relative(compilation.compiler.outputPath, dependency);
		return relative === ".." ||
			relative.startsWith(`..${path.sep}`) ||
			path.isAbsolute(relative)
			? dependency
			: path.join(outputPath, relative);
	};
	return {
		fileDependencies: [...compilation.fileDependencies].map(normalize).sort(),
		contextDependencies: [...compilation.contextDependencies]
			.map(normalize)
			.sort(),
		missingDependencies: [...compilation.missingDependencies]
			.map(normalize)
			.sort()
	};
};

/**
 * Cached builds can retain extra probes; every fresh dependency must still be watched.
 * @param {ReturnType<typeof getWatchDependencies>} actualDependencies watched dependencies
 * @param {ReturnType<typeof getWatchDependencies>} expectedDependencies fresh dependencies
 * @param {boolean | undefined} strict require identical sets for history-independent fixtures
 * @returns {void}
 */
const assertWatchDependencies = (
	actualDependencies,
	expectedDependencies,
	strict
) => {
	if (strict) {
		expect(actualDependencies).toEqual(expectedDependencies);
		return;
	}
	for (const kind of /** @type {const} */ ([
		"fileDependencies",
		"contextDependencies",
		"missingDependencies"
	])) {
		const actual = new Set(actualDependencies[kind]);
		const missing = expectedDependencies[kind].filter((dependency) => {
			if (actual.has(dependency)) return false;
			if (
				actualDependencies.contextDependencies.some(
					(directory) =>
						dependency === directory ||
						dependency.startsWith(`${directory}${path.sep}`)
				)
			) {
				return false;
			}
			if (
				kind === "fileDependencies" &&
				fs.existsSync(dependency) &&
				fs.statSync(dependency).isDirectory()
			) {
				return !actualDependencies.fileDependencies.some((file) =>
					file.startsWith(`${dependency}${path.sep}`)
				);
			}
			return true;
		});
		expect(missing).toEqual([]);
	}
};

/**
 * Runs an independent, cache-free compiler for every watch step.
 * @param {Compiler | MultiCompiler} compiler watched compiler
 * @param {() => Promise<Configuration[]>} createOptions independent configurations
 * @param {string} outputDirectory case output directory
 * @param {{ skipFreshAssetContent?: string, skipFreshWarnings?: string, skipFreshCompilation?: string, strictWatchDependencies?: boolean }} comparison comparison options
 * @returns {(stats: Stats | MultiStats) => Promise<void>} per-step comparison
 */
const compareWatchCompilation = (
	compiler,
	createOptions,
	outputDirectory,
	comparison
) => {
	const compilers = "compilers" in compiler ? compiler.compilers : [compiler];
	const watchedAssets = compilers.map(captureAssets);
	return async (stats) => {
		if (comparison.skipFreshCompilation) return;
		const configurations = await createOptions();
		const results = "stats" in stats ? stats.stats : [stats];
		for (const result of results) {
			const index = compilers.indexOf(result.compilation.compiler);
			assert(index >= 0, "Watch stats belong to an unknown compiler");
			const configuration = configurations[index];
			const freshCompiler = webpack({
				...configuration,
				cache: false,
				watch: false,
				// Disabling the compilation cache must not change module resolution defaults.
				module: {
					...configuration.module,
					unsafeCache: compilers[index].options.module.unsafeCache
				},
				output: {
					...configuration.output,
					path: path.join(outputDirectory, String(index))
				}
			});
			freshCompiler.hooks.finishMake.tap(
				{ name: "CompareWatchCompilation", stage: Infinity },
				assertModuleGraph
			);
			const freshAssets = captureAssets(freshCompiler);
			await new Promise((resolve, reject) => {
				freshCompiler.run((error, freshStats) => {
					freshCompiler.close((closeError) => {
						if (error || closeError) return reject(error || closeError);
						try {
							assert(freshStats, "Fresh compiler did not return stats");
							const actualDependencies = getWatchDependencies(
								result.compilation,
								compilers[index].outputPath
							);
							const expectedDependencies = getWatchDependencies(
								freshStats.compilation,
								compilers[index].outputPath
							);
							assertWatchDependencies(
								actualDependencies,
								expectedDependencies,
								comparison.strictWatchDependencies
							);
							const actualDiagnostics = getDiagnostics(result);
							const expectedDiagnostics = getDiagnostics(freshStats);
							expect(actualDiagnostics.errors).toEqual(
								expectedDiagnostics.errors
							);
							if (!comparison.skipFreshWarnings) {
								expect(actualDiagnostics.warnings).toEqual(
									expectedDiagnostics.warnings
								);
							}
							const actualAssets = watchedAssets[index](result.compilation);
							const expectedAssets = freshAssets(freshStats.compilation);
							expect(actualAssets.map(({ name }) => name)).toEqual(
								expectedAssets.map(({ name }) => name)
							);
							if (!comparison.skipFreshAssetContent) {
								expect(actualAssets).toEqual(expectedAssets);
							}
							resolve(undefined);
						} catch (error) {
							reject(error);
						}
					});
				});
			});
		}
	};
};

module.exports = compareWatchCompilation;
