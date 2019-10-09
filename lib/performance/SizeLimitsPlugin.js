/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @thelarkinn
*/
"use strict";
const EntrypointsOverSizeLimitWarning = require("./EntrypointsOverSizeLimitWarning");
const AssetsOverSizeLimitWarning = require("./AssetsOverSizeLimitWarning");
const NoAsyncChunksWarning = require("./NoAsyncChunksWarning");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Entrypoint")} Entrypoint */

module.exports = class SizeLimitsPlugin {
	constructor(options) {
		if (Array.isArray(options)) {
			this.options = options
				.sort(SizeLimitsPlugin.sortByAssetSize)
				.sort(SizeLimitsPlugin.sortByEntrypointSize)
				.map(option => ({
					hints: option.hints,
					maxAssetSize: option.maxAssetSize,
					maxEntrypointSize: option.maxEntrypointSize,
					assetFilter: option.assetFilter
				}));
		} else {
			this.options = [
				{
					hints: options.hints,
					maxAssetSize: options.maxAssetSize,
					maxEntrypointSize: options.maxEntrypointSize,
					assetFilter: options.assetFilter
				}
			];
		}
	}

	/**
	 * @param {Object} a first option
	 * @param  {Object} b second option
	 * @returns {number} position of the array where the option should be moved to
	 */
	static sortByAssetSize(a, b) {
		return a.maxAssetSize - b.maxAssetSize;
	}

	/**
	 * @param {Object} a option
	 * @param  {Object} b option
	 * @returns {number} position of the array where the option should be moved to
	 */
	static sortByEntrypointSize(a, b) {
		if (a.maxAssetSize !== b.maxAssetSize) {
			return 0;
		}
		return a.maxEntrypointSize - b.maxEntrypointSize;
	}

	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const options = this.options;
		compiler.hooks.afterEmit.tap("SizeLimitsPlugin", compilation => {
			const messages = {
				warning: [],
				error: []
			};

			const alreadyHasMessage = name =>
				messages.warning.find(warning => warning.name === name) ||
				messages.error.find(error => error.name === name);

			const hasAsyncChunks =
				compilation.chunks.filter(chunk => !chunk.canBeInitial()).length > 0;

			let shouldPrintOnError = false;
			let hasHints = false;
			options.forEach(option => {
				const entrypointSizeLimit = option.maxEntrypointSize;
				const assetSizeLimit = option.maxAssetSize;
				const hints = option.hints;
				const assetFilter =
					option.assetFilter || ((name, source, info) => !info.development);

				/**
				 * @param {Entrypoint} entrypoint an entrypoint
				 * @returns {number} the size of the entrypoint
				 */
				const getEntrypointSize = entrypoint =>
					entrypoint.getFiles().reduce((currentSize, file) => {
						const asset = compilation.getAsset(file);
						if (
							asset &&
							!alreadyHasMessage(asset.name) &&
							assetFilter(asset.name, asset.source, asset.info) &&
							asset.source
						) {
							return currentSize + (asset.info.size || asset.source.size());
						}

						return currentSize;
					}, 0);

				const assetsOverSizeLimit = [];
				for (const { name, source, info } of compilation.getAssets()) {
					if (
						alreadyHasMessage(name) ||
						!assetFilter(name, source, info) ||
						!source
					) {
						continue;
					}

					const size = info.size || source.size();
					if (size > assetSizeLimit) {
						assetsOverSizeLimit.push({
							name,
							size
						});
						/** @type {any} */ (source).isOverSizeLimit = true;
					}
				}

				const fileFilter = name => {
					const asset = compilation.getAsset(name);
					return asset && assetFilter(asset.name, asset.source, asset.info);
				};

				const entrypointsOverLimit = [];
				for (const [name, entry] of compilation.entrypoints) {
					const size = getEntrypointSize(entry);

					if (size > entrypointSizeLimit) {
						entrypointsOverLimit.push({
							name: name,
							size: size,
							files: entry.getFiles().filter(fileFilter)
						});
						/** @type {any} */ (entry).isOverSizeLimit = true;
					}
				}

				if (hints) {
					hasHints = true;
					// 1. Individual Chunk: Size < 250kb
					// 2. Collective Initial Chunks [entrypoint] (Each Set?): Size < 250kb
					// 3. No Async Chunks
					// if !1, then 2, if !2 return
					if (assetsOverSizeLimit.length > 0) {
						messages[hints].push(
							new AssetsOverSizeLimitWarning(
								assetsOverSizeLimit,
								assetSizeLimit
							)
						);
					}
					if (entrypointsOverLimit.length > 0) {
						messages[hints].push(
							new EntrypointsOverSizeLimitWarning(
								entrypointsOverLimit,
								entrypointSizeLimit
							)
						);
					}
					if (!hasAsyncChunks && !shouldPrintOnError) {
						shouldPrintOnError = hints === "error";
					}
				}
			});

			if (hasHints) {
				if (!hasAsyncChunks) {
					if (shouldPrintOnError && messages.error.length > 0) {
						messages.error.push(new NoAsyncChunksWarning());
					} else if (messages.warning.length > 0) {
						messages.warning.push(new NoAsyncChunksWarning());
					}
				}
			}

			if (messages.warning.length > 0) {
				compilation.warnings.push(...messages.warning);
			}

			if (messages.error.length > 0) {
				compilation.errors.push(...messages.error);
			}
		});
	}
};
