/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @thelarkinn
*/
var path = require('path');

var EntrypointsOverSizeLimitWarning = require('./EntrypointsOverSizeLimitWarning');
var AssetsOverSizeLimitWarning = require('./AssetsOverSizeLimitWarning');
var NoAsyncChunksWarning = require('./NoAsyncChunksWarning');

function EmittedAssetSizeLimitPlugin(performanceOptions) {
	this.maxAssetSize = performanceOptions.maxAssetSize;
	this.maxInitialSize = performanceOptions.maxInitialChunkSize;
	this.hints = performanceOptions.hints;
	this.errorOnHint = performanceOptions.errorOnHint;
}

module.exports = EmittedAssetSizeLimitPlugin;

function formatSize(size) {
	if(size <= 0) return "0 bytes";

	var abbreviations = ["bytes", "kB", "MB", "GB"];
	var index = Math.floor(Math.log(size) / Math.log(1000));
	var numberFormat = +(size / Math.pow(1000, index)).toPrecision(3);

	return {
		number: numberFormat,
		string: numberFormat + " " + abbreviations[index]
	};
}

// When using this we should always
// compare byte size and then format later
function doesExceedLimit(limit, actualSize) {
	return limit < actualSize;
}

function isAssetJsFile(assetFilename) {
	var jsRegex = /\.js($|\?)/i;

	return jsRegex.test(assetFilename);
}

EmittedAssetSizeLimitPlugin.prototype.apply = function(compiler) {
	if(!this.hints) {
		return;
	}
	var entrypointSizeLimit = this.maxInitialSize;
	var sizeLimit = this.maxAssetSize;
	var hints = this.hints;
	var shouldErrorOnHint = this.errorOnHint;

	compiler.plugin("emit", function(compilation, callback) {
		var warnings = [];
		var assetsByFile = {};
		var assetsOverSizeLimit = [];
		var entrypointsOverSizeLimit = [];

		var assets = Object.keys(compilation.assets).map(function(asset) {
			var obj = {
				name: asset,
				size: compilation.assets[asset].size(),
				chunks: [],
				chunkNames: [],
				emitted: compilation.assets[asset].emitted
			};

			if(doesExceedLimit(sizeLimit, obj.size)) {
				obj.isOverSizeLimit = true;
				assetsOverSizeLimit.push(obj);
				compilation.assets[asset].isOverSizeLimit = true;
			}

			assetsByFile[asset] = obj;
			return obj;
		}).filter(function(asset) {
			return asset.emitted;
		});

		compilation.chunks.forEach(function(chunk) {
			chunk.files.forEach(function(asset) {
				if(assetsByFile[asset]) {
					chunk.ids.forEach(function(id) {
						assetsByFile[asset].chunks.push(id);
					});
					if(chunk.name) {
						assetsByFile[asset].chunkNames.push(chunk.name);
					}
				}
			});
		});

		var hasAsyncChunks = compilation.chunks.filter(function(chunk) {
			return !chunk.isInitial();
		}).length > 0;

		var entrypointsOverLimit = Object.keys(compilation.entrypoints)
			.map(function(key) {
				return compilation.entrypoints[key]
			})
			.filter(function(entry) {
				return doesExceedLimit(entrypointSizeLimit, entry.getSize())
			})

		// 1. Individual Chunk: Size < 250kb
		// 2. Collective Initial Chunks [entrypoint] (Each Set?): Size < 250kb
		// 3. No Async Chunks
		// if !1, then 2, if !2 return
		if(assetsOverSizeLimit.length) {
			warnings.push(
				new AssetsOverSizeLimitWarning(
					assetsOverSizeLimit,
					compilation,
					formatSize,
					sizeLimit
				)
			);

			warnings.push(
				new EntrypointsOverSizeLimitWarning(
					entrypointsOverLimit,
					compilation,
					formatSize,
					entrypointSizeLimit
				)
			);

			if(!hasAsyncChunks) {
				warnings.push(new NoAsyncChunksWarning());
			}
		} else {
			if(entrypointsOverSizeLimit.legnth) {
				warnings.push(
					new EntrypointsOverSizeLimitWarning(
						entrypointsOverSizeLimit,
						compilation,
						formatSize,
						entrypointSizeLimit
					)
				);

				if(!hasAsyncChunks) {
					warnings.push(new NoAsyncChunksWarning());
				}
			}
		}

		if(warnings.length) {
			if(shouldErrorOnHint) {
				Array.prototype.push.apply(compilation.errors, warnings);
			} else {
				Array.prototype.push.apply(compilation.warnings, warnings);
			}
		}

		callback();
	});

};
