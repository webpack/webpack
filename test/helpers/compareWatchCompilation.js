"use strict";

const assert = require("assert");
const path = require("path");
const webpack = require("../..");

/** @import { AsyncDependenciesBlock, Compilation, Compiler, Configuration, Dependency, Module, MultiCompiler, MultiStats, Stats } from "../../" */
/** @typedef {{ name: string, content: Buffer }[]} Assets */

/**
 * Checks the graph before seal can redirect connections or concatenate modules.
 * @param {Compilation} compilation compilation to check
 * @returns {void}
 */
const assertModuleGraph = (compilation) => {
	const { modules, moduleGraph } = compilation;
	for (const module of modules) {
		const identifier = module.identifier();
		/** @type {Set<Dependency>} */
		const dependencies = new Set();
		/** @type {(Module | AsyncDependenciesBlock)[]} */
		const blocks = [module];
		for (const block of blocks) {
			for (const dependency of block.dependencies) {
				dependencies.add(dependency);
				assert.strictEqual(
					moduleGraph.getParentModule(dependency),
					module,
					`${identifier}: incorrect dependency parent`
				);
				assert.strictEqual(
					moduleGraph.getParentBlock(dependency),
					block,
					`${identifier}: incorrect dependency block`
				);
			}
			blocks.push(...block.blocks);
		}
		for (const connection of moduleGraph.getOutgoingConnections(module)) {
			assert.strictEqual(connection.originModule, module, identifier);
			// Plugin-created connections need not belong to a dependency block.
			if (
				connection.dependency &&
				moduleGraph.getParentModule(connection.dependency) === module
			) {
				assert(
					dependencies.has(connection.dependency),
					`${identifier}: stale outgoing dependency`
				);
			}
			if (connection.module) {
				assert(modules.has(connection.module), `${identifier}: missing target`);
				assert(
					new Set(moduleGraph.getIncomingConnections(connection.module)).has(
						connection
					),
					`${identifier}: missing incoming connection`
				);
			}
		}
		for (const connection of moduleGraph.getIncomingConnections(module)) {
			assert.strictEqual(connection.module, module, identifier);
			if (connection.originModule) {
				assert(
					modules.has(connection.originModule),
					`${identifier}: missing origin`
				);
				assert(
					new Set(
						moduleGraph.getOutgoingConnections(connection.originModule)
					).has(connection),
					`${identifier}: missing outgoing connection`
				);
			}
		}
	}
};

/**
 * Captures asset contents before emit can replace them with size-only sources.
 * @param {Compiler} compiler compiler to observe
 * @returns {(compilation: Compilation) => Assets} assets belonging to a compilation
 */
const captureAssets = (compiler) => {
	/** @type {WeakMap<Compilation, Assets>} */
	const assets = new WeakMap();
	compiler.hooks.finishMake.tap(
		{ name: "CompareWatchCompilation", stage: Infinity },
		assertModuleGraph
	);
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
 * Runs an independent, cache-free compiler for every watch step.
 * @param {Compiler | MultiCompiler} compiler watched compiler
 * @param {() => Promise<Configuration[]>} createOptions independent configurations
 * @param {string} outputDirectory case output directory
 * @param {{ skipFreshAssetContent?: string, skipFreshWarnings?: string, skipFreshCompilation?: string }} comparison comparison exceptions
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
				output: {
					...configuration.output,
					path: path.join(outputDirectory, String(index))
				}
			});
			const freshAssets = captureAssets(freshCompiler);
			await new Promise((resolve, reject) => {
				freshCompiler.run((error, freshStats) => {
					freshCompiler.close((closeError) => {
						if (error || closeError) return reject(error || closeError);
						try {
							assert(freshStats, "Fresh compiler did not return stats");
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
