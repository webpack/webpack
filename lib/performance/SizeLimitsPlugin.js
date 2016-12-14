/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @thelarkinn
*/
var path = require("path");

var EntrypointsOverSizeLimitWarning = require("./EntrypointsOverSizeLimitWarning");
var AssetsOverSizeLimitWarning = require("./AssetsOverSizeLimitWarning");
var NoAsyncChunksWarning = require("./NoAsyncChunksWarning");

function SizeLimitsPlugin(options) {
	this.hints = options.hints;
	this.maxAssetSize = options.maxAssetSize;
	this.maxEntrypointSize = options.maxEntrypointSize;
	this.assetFilter = options.assetFilter;
}

module.exports = SizeLimitsPlugin;

SizeLimitsPlugin.prototype.apply = function(compiler) {
	var entrypointSizeLimit = this.maxEntrypointSize;
	var assetSizeLimit = this.maxAssetSize;
	var hints = this.hints;
	var assetFilter = this.assetFilter || function(asset) {
		return !(/\.map$/.test(asset))
	};

	compiler.plugin("after-emit", function(compilation, callback) {
		var warnings = [];

		var getEntrypointSize = function(entrypoint) {
			var files = entrypoint.getFiles();

			return files
				.filter(assetFilter)
				.map(function(file) {
					return compilation.assets[file].size()
				})
				.reduce(function(currentSize, nextSize) {
					return currentSize + nextSize
				}, 0);
		};

		var assetsOverSizeLimit = [];
		Object.keys(compilation.assets)
			.filter(assetFilter)
			.forEach(function(assetName) {
				var asset = compilation.assets[assetName];
				var size = asset.size();

				if(size > assetSizeLimit) {
					assetsOverSizeLimit.push({
						name: assetName,
						size: size
					});
					asset.isOverSizeLimit = true;
				}
			});

		var entrypointsOverLimit = [];
		Object.keys(compilation.entrypoints)
			.forEach(function(key) {
				var entry = compilation.entrypoints[key];
				var size = getEntrypointSize(entry, compilation);

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
						assetSizeLimit
					)
				);
			}
			if(entrypointsOverLimit.length > 0) {
				warnings.push(
					new EntrypointsOverSizeLimitWarning(
						entrypointsOverLimit,
						entrypointSizeLimit
					)
				);
			}

			if(warnings.length > 0) {
				var hasAsyncChunks = compilation.chunks.filter(function(chunk) {
					return !chunk.isInitial();
				}).length > 0;

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

};
