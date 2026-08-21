/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @thelarkinn
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const { find } = require("../util/SetHelpers");
const { compareStrings } = require("../util/comparators");
const AssetsOverSizeLimitWarning = require("./AssetsOverSizeLimitWarning");
const EntrypointsOverSizeLimitWarning = require("./EntrypointsOverSizeLimitWarning");
const NoAsyncChunksWarning = require("./NoAsyncChunksWarning");
const RuntimeInLargeChunkWarning = require("./RuntimeInLargeChunkWarning");
const getModuleSize = require("./getModuleSize");

/** @import { Source } from "webpack-sources" */
/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Chunk from "../Chunk" */
/** @import ChunkGraph from "../ChunkGraph" */
/** @import ChunkGroup from "../ChunkGroup" */
/** @import Compilation, { Asset } from "../Compilation" */
/** @import Compiler from "../Compiler" */
/** @import Module from "../Module" */
/** @import Entrypoint from "../Entrypoint" */
/** @import WebpackError from "../errors/WebpackError" */

/**
 * Defines the module details type used by this module.
 * @typedef {object} ModuleDetails
 * @property {string} name
 * @property {number} size
 */

/**
 * Defines the asset details type used by this module.
 * @typedef {object} AssetDetails
 * @property {string} name
 * @property {number} size
 * @property {ModuleDetails[]=} modules
 */

/**
 * Defines the entrypoint details type used by this module.
 * @typedef {object} EntrypointDetails
 * @property {string} name
 * @property {number} size
 * @property {string[]} files
 */

/** @type {WeakSet<Entrypoint | ChunkGroup | Source>} */
const isOverSizeLimitSet = new WeakSet();

/** @typedef {(name: Asset["name"], source: Asset["source"], assetInfo: Asset["info"]) => boolean} AssetFilter */

/** @type {AssetFilter} */
const excludeSourceMap = (name, source, info) => !info.development;

// Runtime globals whose generated code describes the other chunks, so the chunk
// holding them is rewritten whenever anything else in the build changes.
const BUILD_WIDE_RUNTIME_GLOBALS = [
	RuntimeGlobals.getChunkScriptFilename,
	RuntimeGlobals.getChunkCssFilename,
	RuntimeGlobals.getChunkUpdateScriptFilename,
	RuntimeGlobals.getFullHash,
	RuntimeGlobals.getUpdateManifestFilename
];

/**
 * Tells whether an entrypoint ships its runtime inside a chunk that also carries
 * modules, and that runtime describes the rest of the build. Only then does
 * `optimization.runtimeChunk` win anything.
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @param {Entrypoint} entrypoint an entrypoint
 * @returns {boolean} true when splitting the runtime off would keep the chunk stable
 */
const hasEmbeddedRuntime = (chunkGraph, entrypoint) => {
	const runtimeChunk = entrypoint.getRuntimeChunk();
	if (!runtimeChunk) return false;
	// A chunk of its own carries the runtime modules and nothing else. Asking each
	// module beats counting, which depends on runtime modules being counted twice.
	let carriesCode = false;
	for (const module of chunkGraph.getChunkModulesIterable(runtimeChunk)) {
		if (!(module instanceof RuntimeModule)) {
			carriesCode = true;
			break;
		}
	}
	if (!carriesCode) return false;
	// The tree requirements are the ones the emitted runtime modules answer to.
	const runtimeRequirements =
		chunkGraph.getTreeRuntimeRequirements(runtimeChunk);
	// A global nothing here names stays silent, so a new one costs a hint, not a wrong one.
	return BUILD_WIDE_RUNTIME_GLOBALS.some((runtimeGlobal) =>
		runtimeRequirements.has(runtimeGlobal)
	);
};

// Enough to point at the culprit without turning the hint into a report.
const MAX_REPORTED_MODULES = 3;

/**
 * Names the largest modules inside each oversized asset. "This file is too big"
 * is only actionable once you know what fills it.
 * @param {Compilation} compilation the compilation
 * @param {AssetDetails[]} assetsOverSizeLimit the oversized assets, annotated in place
 * @returns {void}
 */
const addLargestModules = (compilation, assetsOverSizeLimit) => {
	const { chunkGraph, requestShortener } = compilation;
	/** @type {Map<string, Chunk[]>} */
	const chunksByFile = new Map();

	for (const chunk of compilation.chunks) {
		// A chunk emitting several files (javascript plus extracted css, …) gives
		// no way to tell which module ended up in which, so it names none.
		if (chunk.files.size !== 1) continue;

		for (const file of chunk.files) {
			const chunks = chunksByFile.get(file);

			if (chunks === undefined) {
				chunksByFile.set(file, [chunk]);
			} else {
				chunks.push(chunk);
			}
		}
	}

	for (const asset of assetsOverSizeLimit) {
		const chunks = chunksByFile.get(asset.name);

		// An asset a loader or plugin emitted belongs to no chunk, so nothing
		// describes its contents; likewise one whose chunk emits several files.
		if (chunks === undefined) continue;

		/** @type {Set<Module>} */
		const seen = new Set();
		/** @type {ModuleDetails[]} */
		const modules = [];

		for (const chunk of chunks) {
			for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
				if (seen.has(module)) continue;
				seen.add(module);
				modules.push({
					name: module.readableIdentifier(requestShortener),
					size: getModuleSize(module)
				});
			}
		}

		if (modules.length === 0) continue;

		// Ties break by name: which modules finish first is not stable.
		modules.sort((a, b) => b.size - a.size || compareStrings(a.name, b.name));
		asset.modules = modules.slice(0, MAX_REPORTED_MODULES);
	}
};

const PLUGIN_NAME = "SizeLimitsPlugin";

module.exports = class SizeLimitsPlugin {
	/**
	 * Creates an instance of SizeLimitsPlugin.
	 * @param {PerformanceOptions} options the plugin options
	 */
	constructor(options) {
		/** @type {PerformanceOptions["hints"]} */
		this.hints = options.hints;
		/** @type {number | undefined} */
		this.maxAssetSize = options.maxAssetSize;
		/** @type {number | undefined} */
		this.maxEntrypointSize = options.maxEntrypointSize;
		/** @type {AssetFilter | undefined} */
		this.assetFilter = options.assetFilter;
	}

	/**
	 * Checks whether this size limits plugin is over size limit.
	 * @param {Entrypoint | ChunkGroup | Source} thing the resource to test
	 * @returns {boolean} true if over the limit
	 */
	static isOverSizeLimit(thing) {
		return isOverSizeLimitSet.has(thing);
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const entrypointSizeLimit = this.maxEntrypointSize;
		const assetSizeLimit = this.maxAssetSize;
		const hints = this.hints;
		const assetFilter = this.assetFilter || excludeSourceMap;

		compiler.hooks.afterEmit.tap(PLUGIN_NAME, (compilation) => {
			/** @type {WebpackError[]} */
			const warnings = [];

			/**
			 * Gets entrypoint size.
			 * @param {Entrypoint} entrypoint an entrypoint
			 * @returns {number} the size of the entrypoint
			 */
			const getEntrypointSize = (entrypoint) => {
				let size = 0;
				for (const file of entrypoint.getFiles()) {
					const asset = compilation.getAsset(file);
					if (
						asset &&
						assetFilter(asset.name, asset.source, asset.info) &&
						asset.source
					) {
						size += asset.info.size || asset.source.size();
					}
				}
				return size;
			};

			/** @type {AssetDetails[]} */
			const assetsOverSizeLimit = [];
			for (const { name, source, info } of compilation.getAssets()) {
				if (!assetFilter(name, source, info) || !source) {
					continue;
				}

				const size = info.size || source.size();
				if (size > /** @type {number} */ (assetSizeLimit)) {
					assetsOverSizeLimit.push({
						name,
						size
					});
					isOverSizeLimitSet.add(source);
				}
			}

			/**
			 * Returns result.
			 * @param {Asset["name"]} name the name
			 * @returns {boolean | undefined} result
			 */
			const fileFilter = (name) => {
				const asset = compilation.getAsset(name);
				return asset && assetFilter(asset.name, asset.source, asset.info);
			};

			/** @type {EntrypointDetails[]} */
			const entrypointsOverLimit = [];
			/** @type {string[]} */
			const entrypointsWithEmbeddedRuntime = [];
			for (const [name, entry] of compilation.entrypoints) {
				const size = getEntrypointSize(entry);

				if (size > /** @type {number} */ (entrypointSizeLimit)) {
					entrypointsOverLimit.push({
						name,
						size,
						files: entry.getFiles().filter(fileFilter)
					});
					isOverSizeLimitSet.add(entry);
					if (hasEmbeddedRuntime(compilation.chunkGraph, entry)) {
						entrypointsWithEmbeddedRuntime.push(name);
					}
				}
			}

			if (hints) {
				// 1. Individual Chunk: Size < 250kb
				// 2. Collective Initial Chunks [entrypoint] (Each Set?): Size < 250kb
				// 3. No Async Chunks
				// if !1, then 2, if !2 return
				if (assetsOverSizeLimit.length > 0) {
					addLargestModules(compilation, assetsOverSizeLimit);
					warnings.push(
						new AssetsOverSizeLimitWarning(
							assetsOverSizeLimit,
							/** @type {number} */ (assetSizeLimit)
						)
					);
				}
				if (entrypointsOverLimit.length > 0) {
					warnings.push(
						new EntrypointsOverSizeLimitWarning(
							entrypointsOverLimit,
							/** @type {number} */ (entrypointSizeLimit)
						)
					);
				}

				if (warnings.length > 0) {
					const someAsyncChunk = find(
						compilation.chunks,
						(chunk) => !chunk.canBeInitial()
					);

					if (!someAsyncChunk) {
						warnings.push(new NoAsyncChunksWarning());
					}

					if (entrypointsWithEmbeddedRuntime.length > 0) {
						warnings.push(
							new RuntimeInLargeChunkWarning(entrypointsWithEmbeddedRuntime)
						);
					}

					if (hints === "error") {
						compilation.errors.push(...warnings);
					} else if (hints === "stats") {
						compilation.hints.push(...warnings);
					} else {
						compilation.warnings.push(...warnings);
					}
				}
			}
		});
	}
};
