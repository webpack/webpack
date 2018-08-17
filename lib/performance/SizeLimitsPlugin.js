/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @thelarkinn
*/
"use strict";
const EntrypointsOverSizeLimitWarning = require("./EntrypointsOverSizeLimitWarning");
const AssetsOverSizeLimitWarning = require("./AssetsOverSizeLimitWarning");
const NoAsyncChunksWarning = require("./NoAsyncChunksWarning");
const gzipSize = require("gzip-size");

module.exports = class SizeLimitsPlugin {
	constructor(options) {
		this.compressedSizeMap = new Map();
		this.hints = options.hints;
		this.maxAssetSize = options.maxAssetSize;
		this.maxEntrypointSize = options.maxEntrypointSize;
		this.assetFilter = options.assetFilter;
		this.compress = options.compress;
	}

	getCompressedChunkSize(chunk) {
		const source = chunk.source();
		if (this.compressedSizeMap.has(source)) {
			return this.compressedSizeMap.get(source);
		}
		const gzippedSize = gzipSize(source);
		this.compressedSizeMap.set(source, gzippedSize);
		return gzippedSize;
	}

	apply(compiler) {
		const entrypointSizeLimit = this.maxEntrypointSize;
		const assetSizeLimit = this.maxAssetSize;
		const hints = this.hints;
		const assetFilter = this.assetFilter || (asset => !asset.endsWith(".map"));
		const compress = this.compress;

		compiler.hooks.afterEmit.tapPromise("SizeLimitsPlugin", compilation => {
			const warnings = [];

			const assetNames = Object.keys(compilation.assets);
			const filteredAssetNames = assetNames.filter(assetFilter);

			// precompute all chunk sizes
			return Promise.all(
				filteredAssetNames.map(file => {
					const asset = compilation.assets[file];
					if (compress) {
						return this.getCompressedChunkSize(asset);
					}
					return asset.size();
				})
			).then(sizes => {
				const assetSizes = new Map();
				for (let i = 0; i < sizes.length; i++) {
					assetSizes.set(filteredAssetNames[i], sizes[i]);
				}

				const getEntrypointSize = entrypoint =>
					entrypoint.getFiles().reduce((currentSize, file) => {
						if (assetSizes.has(file)) {
							return currentSize + assetSizes.get(file);
						}
						return currentSize;
					}, 0);

				const assetsOverSizeLimit = [];
				for (const assetName of filteredAssetNames) {
					const asset = compilation.assets[assetName];
					const size = assetSizes.get(assetName);
					if (size > assetSizeLimit) {
						assetsOverSizeLimit.push({
							name: assetName,
							size: size
						});
						asset.isOverSizeLimit = true;
					}
				}

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
						entry.isOverSizeLimit = true;
					}
				}

				if (hints) {
					// 1. Individual Chunk: Size < 250kb
					// 2. Collective Initial Chunks [entrypoint] (Each Set?): Size < 250kb
					// 3. No Async Chunks
					// if !1, then 2, if !2 return
					if (assetsOverSizeLimit.length > 0) {
						warnings.push(
							new AssetsOverSizeLimitWarning(
								assetsOverSizeLimit,
								assetSizeLimit,
								compress
							)
						);
					}
					if (entrypointsOverLimit.length > 0) {
						warnings.push(
							new EntrypointsOverSizeLimitWarning(
								entrypointsOverLimit,
								entrypointSizeLimit,
								compress
							)
						);
					}

					if (warnings.length > 0) {
						const hasAsyncChunks =
							compilation.chunks.filter(chunk => !chunk.canBeInitial()).length >
							0;

						if (!hasAsyncChunks) {
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
		});
	}
};
