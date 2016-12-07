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

// When using this we should always
// compare byte size and then format later
function doesExceedLimit(limit, actualSize) {
	return limit < actualSize;
}

EmittedAssetSizeLimitPlugin.prototype.apply = function(compiler) {
	if(!this.hints) {
		return;
	}
	var entrypointSizeLimit = this.maxInitialSize;
	var sizeLimit = this.maxAssetSize;
	var hints = this.hints;
	var shouldErrorOnHint = this.errorOnHint;

	compiler.plugin("after-emit", function(compilation, callback) {
		var warnings = [];
		var assetsOverSizeLimit = [];

		Object.keys(compilation.assets).forEach(function(asset) {
			var obj = {
				name: asset,
				size: compilation.assets[asset].size()
			};

			if(doesExceedLimit(sizeLimit, obj.size)) {
				obj.isOverSizeLimit = true;
				assetsOverSizeLimit.push(obj);
				compilation.assets[asset].isOverSizeLimit = true;
			}
		});

		var hasAsyncChunks = compilation.chunks.filter(function(chunk) {
			return !chunk.isInitial();
		}).length > 0;

		var entrypointsOverLimit = Object.keys(compilation.entrypoints)
			.map(function(key) {
				return compilation.entrypoints[key]
			})
			.filter(function(entry) {
				return doesExceedLimit(entrypointSizeLimit, entry.getSize(compilation))
			});

		// 1. Individual Chunk: Size < 250kb
		// 2. Collective Initial Chunks [entrypoint] (Each Set?): Size < 250kb
		// 3. No Async Chunks
		// if !1, then 2, if !2 return
		if(assetsOverSizeLimit.length > 0) {
			warnings.push(
				new AssetsOverSizeLimitWarning(
					assetsOverSizeLimit,
					sizeLimit
				)
			);
		}
		if(entrypointsOverLimit.length > 0) {
			warnings.push(
				new EntrypointsOverSizeLimitWarning(
					entrypointsOverLimit,
					compilation,
					entrypointSizeLimit
				)
			);
		}

		if(warnings.length > 0) {
			if(!hasAsyncChunks) {
				warnings.push(new NoAsyncChunksWarning());
			}

			if(shouldErrorOnHint) {
				Array.prototype.push.apply(compilation.errors, warnings);
			} else {
				Array.prototype.push.apply(compilation.warnings, warnings);
			}
		}

		callback();
	});

};
