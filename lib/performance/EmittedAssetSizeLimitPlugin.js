/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @thelarkinn
*/
var path = require('path');

var EntrypointsOverSizeLimitWarning = require('./EntrypointsOverSizeLimitWarning');
var AssetsOverSizeLimitWarning = require('./AssetsOverSizeLimitWarning');

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

	compiler.plugin("after-emit", function(compilation, callback) {
		var warnings = [];
		var assetsByFile = {};
		var assetsByChunkName = {};
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
						if(assetsByChunkName[chunk.name]) {
							assetsByChunkName[chunk.name] = [].concat(assetsByChunkName[chunk.name]).concat([asset]);
						} else {
							assetsByChunkName[chunk.name] = asset;
						}
					}
				}
			});
		});

		var hasAsyncChunks = compilation.chunks.filter(function(chunk) {
			return chunk.isAsync();
		}).length > 0;

		var entrypoints = Object.keys(compilation.entrypoints).map(function(ep) {
			var files = [];
			var entrypoint = compilation.entrypoints[ep];

			entrypoint.assets = {};
			entrypoint.size = 0;

			// TODO: Need to use keys or even better Set for distinct values
			entrypoint.chunks.forEach(function(chunk) {
				chunk.files.forEach(function(file) {
					files.push(file);
				});
			});

			files.forEach(function(file) {
				if(!isAssetJsFile(file)) {
					return;
				}
				entrypoint.assets[file] = assetsByFile[file];
				entrypoint.size = entrypoint.size + assetsByFile[file].size;
				entrypoint.isOverSizeLimit = false;
				if(entrypoint.assets[file].isOverSizeLimit) {
					entrypoint.isOverSizeLimit = true;
				}
			});

			if(!entrypoint.isOverSizeLimit) {
				entrypoint.isOverSizeLimit = doesExceedLimit(entrypointSizeLimit, formatSize(entrypoint.size).number);
			}

			return entrypoint;
		});

		entrypointsOverSizeLimit = entrypoints.filter(function(ep) {
			return ep.isOverSizeLimit;
		})

		// 1. Individual Chunk: Size < 200kb
		// 2. Collective Initial Chunks (Each Set?): Size < 200kb
		// 3. No Async Chunks
		// if !1, then 2, if !2 return
		// if 1, then 2, then 3,
		if(assetsOverSizeLimit.length) {
			warnings.push(new AssetsOverSizeLimitWarning(assetsOverSizeLimit, compilation, formatSize, sizeLimit));
			warnings.push(new EntrypointsOverSizeLimitWarning(entrypointsOverSizeLimit, compilation, formatSize, entrypointSizeLimit));

			if(!hasAsyncChunks) {
				warnings.push(new Error("webpack performance recommendations: \n" +
					"You can limit the size of your bundles by using System.import() or require.ensure to lazy load some parts of your application.\n" +
					"For more info visit https://webpack.github.io/docs/code-splitting.html"
				));
			}
		} else {
			if(entrypointsOverSizeLimit.legnth) {
				warnings.push(new EntrypointsOverSizeLimitWarning(entrypointsOverSizeLimit, compilation, formatSize, entrypointSizeLimit));

				if(!hasAsyncChunks) {
					warnings.push(new Error("webpack performance recommendations: \n" +
						"You can limit the size of your bundles by using System.import() or require.ensure to lazy load some parts of your application.\n" +
						"For more info visit https://webpack.github.io/docs/code-splitting.html"
					));
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
