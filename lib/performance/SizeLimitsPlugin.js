/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @thelarkinn
*/

"use strict";

const { find } = require("../util/SetHelpers");
const AssetsOverSizeLimitWarning = require("./AssetsOverSizeLimitWarning");
const EntrypointsOverSizeLimitWarning = require("./EntrypointsOverSizeLimitWarning");
const NoAsyncChunksWarning = require("./NoAsyncChunksWarning");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").PerformanceOptions} PerformanceOptions */
/** @typedef {import("../ChunkGroup")} ChunkGroup */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../WebpackError")} WebpackError */

/**
 * @typedef {Object} AssetDetails
 * @property {string} name
 * @property {number} size
 */

/**
 * @typedef {Object} EntrypointDetails
 * @property {string} name
 * @property {number} size
 * @property {string[]} files
 */

const isOverSizeLimitSet = new WeakSet();

const excludeSourceMap = asset => !asset.endsWith(".map");

module.exports = class SizeLimitsPlugin {
	/**
	 * @param {PerformanceOptions} options the plugin options
	 */
	constructor(options) {
		this.hints = options.hints;
		this.maxAssetSize = options.maxAssetSize;
		this.maxEntrypointSize = options.maxEntrypointSize;
		this.assetFilter = options.assetFilter;
	}

	/**
	 * @param {ChunkGroup | Source} thing the resource to test
	 * @returns {boolean} true if over the limit
	 */
	static isOverSizeLimit(thing) {
		return isOverSizeLimitSet.has(thing);
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const entrypointSizeLimit = this.maxEntrypointSize;
		const assetSizeLimit = this.maxAssetSize;
		const hints = this.hints;
		const assetFilter = this.assetFilter || excludeSourceMap;

		compiler.hooks.afterEmit.tap("SizeLimitsPlugin", compilation => {
			/** @type {WebpackError[]} */
			const warnings = [];

			/**
			 * @param {ChunkGroup} entrypoint the entrypoint
			 * @returns {number} its calculated size
			 */
			const getEntrypointSize = entrypoint =>
				entrypoint.getFiles().reduce((currentSize, file) => {
					if (assetFilter(file) && compilation.assets[file]) {
						return currentSize + compilation.assets[file].size();
					}

					return currentSize;
				}, 0);

			/** @type {AssetDetails[]} */
			const assetsOverSizeLimit = [];
			for (const assetName of Object.keys(compilation.assets)) {
				if (!assetFilter(assetName)) {
					continue;
				}

				const asset = compilation.assets[assetName];
				const size = asset.size();
				if (size > assetSizeLimit) {
					assetsOverSizeLimit.push({
						name: assetName,
						size: size
					});
					isOverSizeLimitSet.add(asset);
				}
			}

			/** @type {EntrypointDetails[]} */
			const entrypointsOverLimit = [];
			for (const pair of compilation.entrypoints) {
				const name = pair[0];
				const entry = pair[1];
				const size = getEntrypointSize(entry);

				if (size > entrypointSizeLimit) {
					entrypointsOverLimit.push({
						name: name,
						size: size,
						files: entry.getFiles().filter(assetFilter)
					});
					isOverSizeLimitSet.add(entry);
				}
			}

			if (hints) {
				// 1. Individual Chunk: Size < 250kb
				// 2. Collective Initial Chunks [entrypoint] (Each Set?): Size < 250kb
				// 3. No Async Chunks
				// if !1, then 2, if !2 return
				if (assetsOverSizeLimit.length > 0) {
					warnings.push(
						new AssetsOverSizeLimitWarning(assetsOverSizeLimit, assetSizeLimit)
					);
				}
				if (entrypointsOverLimit.length > 0) {
					warnings.push(
						new EntrypointsOverSizeLimitWarning(
							entrypointsOverLimit,
							entrypointSizeLimit
						)
					);
				}

				if (warnings.length > 0) {
					const someAsyncChunk = find(
						compilation.chunks,
						chunk => !chunk.canBeInitial()
					);

					if (!someAsyncChunk) {
						warnings.push(new NoAsyncChunksWarning());
					}

					if (hints === "error") {
						compilation.errors.push(...warnings);
					} else {
						compilation.warnings.push(...warnings);
					}
				}
			}
		});
	}
};
