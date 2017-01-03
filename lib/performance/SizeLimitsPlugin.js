/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @thelarkinn
*/
"use strict";
const EntrypointsOverSizeLimitWarning = require("./EntrypointsOverSizeLimitWarning");
const AssetsOverSizeLimitWarning = require("./AssetsOverSizeLimitWarning");
const NoAsyncChunksWarning = require("./NoAsyncChunksWarning");

module.exports = class SizeLimitsPlugin {
	constructor(options) {
		this.hints = options.hints;
		this.maxAssetSize = options.maxAssetSize;
		this.maxEntrypointSize = options.maxEntrypointSize;
		this.assetFilter = options.assetFilter;
	}
	apply(compiler) {
		const entrypointSizeLimit = this.maxEntrypointSize;
		const assetSizeLimit = this.maxAssetSize;
		const hints = this.hints;
		const assetFilter = this.assetFilter || (asset => !(/\.map$/.test(asset)));

		compiler.plugin("after-emit", (compilation, callback) => {
			const warnings = [];

			const getEntrypointSize = entrypoint =>
				entrypoint.getFiles()
				.filter(assetFilter)
				.map(file => compilation.assets[file])
				.filter(Boolean)
				.map(asset => asset.size())
				.reduce((currentSize, nextSize) => currentSize + nextSize, 0);

			const assetsOverSizeLimit = [];
			Object.keys(compilation.assets)
				.filter(assetFilter)
				.forEach(assetName => {
					const asset = compilation.assets[assetName];
					const size = asset.size();

					if(size > assetSizeLimit) {
						assetsOverSizeLimit.push({
							name: assetName,
							size: size,
						});
						asset.isOverSizeLimit = true;
					}
				});

			const entrypointsOverLimit = [];
			Object.keys(compilation.entrypoints)
				.forEach(key => {
					const entry = compilation.entrypoints[key];
					const size = getEntrypointSize(entry, compilation);

					if(size > entrypointSizeLimit) {
						entrypointsOverLimit.push({
							name: key,
							size: size,
							files: entry.getFiles().filter(assetFilter)
						});
						entry.isOverSizeLimit = true;
					}
				});

			if(hints) {
				// 1. Individual Chunk: Size < 250kb
				// 2. Collective Initial Chunks [entrypoint] (Each Set?): Size < 250kb
				// 3. No Async Chunks
				// if !1, then 2, if !2 return
				if(assetsOverSizeLimit.length > 0) {
					warnings.push(
						new AssetsOverSizeLimitWarning(
							assetsOverSizeLimit,
							assetSizeLimit));
				}
				if(entrypointsOverLimit.length > 0) {
					warnings.push(
						new EntrypointsOverSizeLimitWarning(
							entrypointsOverLimit,
							entrypointSizeLimit));
				}

				if(warnings.length > 0) {
					const hasAsyncChunks = compilation.chunks.filter(chunk => !chunk.isInitial()).length > 0;

					if(!hasAsyncChunks) {
						warnings.push(new NoAsyncChunksWarning());
					}

					if(hints === "error") {
						Array.prototype.push.apply(compilation.errors, warnings);
					} else {
						Array.prototype.push.apply(compilation.warnings, warnings);
					}
				}
			}

			callback();
		});
	}
};
