/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @thelarkinn
*/
var path = require('path');

function EmittedAssetSizeLimitPlugin(performanceOptions) {
	this.maxAssetSize = performanceOptions.maxAssetSize;
	this.maxInitialSize = performanceOptions.maxInitialChunkSize;
	this.hints = performanceOptions.hints;
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

function doesExceed(sizeLimit, assetSize) {
	return sizeLimit < assetSize;
}

function doesExceedEntrypointLimit(initialLimit, actualInitialSize) {
	return initialLimit < actualInitialSize;
}

function isAssetJsFile(assetFilename) {
	var jsRegex = /\.js($|\?)/i;
	
	return jsRegex.test(assetFilename);
}

function isOverLimit(assetOrEntrypoint) {

}
// function getJSWarnings(noOfAssets, sizeLimit, assetSize) {
// 	var warnings = [];

// 	if(normalizeAndCompare(sizeLimit, assetSize)) {
// 		if(noOfAssets === 1) {
// 			warnings.push(new Error("EmmittedAssetSizeWarning: ChunkSizeExceeded" + "This asset exceeds " + sizeLimit + "kB. \nConsider reducing the size for optimal web performance."));
// 		} else {
// 			warnings.push(new Error("EmmittedAssetSizeWarning: ChunkSizeExceeded" + "Highlighted chunks are large and are likely to impact web performance. \nConsider keeping total chunks of page < " + sizeLimit + "kB"));
// 		}
// 	}

// 	return warnings;
// }

EmittedAssetSizeLimitPlugin.prototype.apply = function(compiler) {
	if(!this.hints) {
		return;
	}

	var totalInitialChunkSize = this.maxInitialSize;
	var sizeLimit = this.maxAssetSize;
	var hints = this.hints;

	compiler.plugin("after-emit", function(compilation, callback) {
		var warnings = [];
		var assetsByFile = {};
		var assetsByChunkName = {};
		var assets = Object.keys(compilation.assets).map(function(asset) {
			var obj = {
				name: asset,
				size: formatSize(compilation.assets[asset].size()),
				chunks: [],
				chunkNames: [],
				emitted: compilation.assets[asset].emitted
			};
			
			obj.isOverSizeLimit = obj.size.number > sizeLimit;

			assetsByFile[asset] = obj;
			return obj;
		}).filter(function(asset) {
			return asset.emitted;
		});

		compilation.chunks.forEach(function(chunk) {
			chunk.files.forEach(function(asset) {
				if (assetsByFile[asset]) {
					chunk.ids.forEach(function(id) {
						assetsByFile[asset].chunks.push(id);
					});
					if (chunk.name) {
						assetsByFile[asset].chunkNames.push(chunk.name);
						if (assetsByChunkName[chunk.name]) {
							assetsByChunkName[chunk.name] = [].concat(assetsByChunkName[chunk.name]).concat([asset]);
						} else {
							assetsByChunkName[chunk.name] = asset;
						}
					}
				}
			});
		});

		var entrypoints = Object.keys(compilation.entrypoints).map(function(ep) {
			var files = [];
			var entrypoint = compilation.entrypoints[ep];
			var hasAsyncChunks = compilation.chunks.filter(function(chunk) {
				return chunk.isAsync();
			}).length > 0;
			
			entrypoint.assets = {};

			// TODO: Need to use keys or even better Set for distinct values
			entrypoint.chunks.forEach(function(chunk){
				chunk.files.forEach(function(file){
					files.push(file);
				});
			});

			files.forEach(function(file){
				console.log(file, entrypoint);
				entrypoint.assets[file] = assetsByFile[file];
				entrypoint.isOverSizeLimit = false;
				if (entrypoint.assets[file].isOverSizeLimit) {
					entrypoint.isOverSizeLimit = true;
				}
				console.log(assetsByFile[file]);
			});
		});

		if(!hasAsyncChunks) {
			warnings.push(new Error("EmittedAssetSizeWarning: NoAsyncChunks: " +
				"You can limit the size of your bundles by using System.import() or require.ensure to lazy load some parts of your application after the page has loaded."));
		}
		
		if (!!warnings.length) {
			Array.prototype.push.apply(compilation.warnings, warnings);
		}
		
		// 1. Individual Chunk: Size < 200kb
		// 2. Collective Initial Chunks (Each Set?): Size < 200kb
		// 3. No Async Chunks
		// if !1, then 2, if !2 return
		// if 1, then 2, then 3, 

		// assets.forEach(function(file) {
		// 	var assetSize = compilation.assets[file].size();
		// 	var assetsByChunks = compilation.getAssetsByChunks().chunks;

		// 	for(var chunkKey in assetsByChunks) {
		// 		var chunk = assetsByChunks[chunkKey];

		// 		actualTotalInitialSize += chunk.size;
		// 	}

		// 	warnings = jsRegex.test(file) && getJSWarnings(noOfAssets, sizeLimit, assetSize);
		// });

		// if(doesExceedInitialLimit(totalInitialChunkSize, actualTotalInitialSize)) {
		// 	//TODO# Maybe separate warning name
		// 	warnings.push(
		// 		new Error(
		// 			"EmittedAssetSizeWarning: TotalSizeExceeded " +
		// 			"The total initial download cost for these assets are likey to impact web performance. \nConsider keeping the total size of your initial assets < " +
		// 			totalInitialChunkSize +
		// 			"kB")
		// 	);
		// }

		// if(!hasAsyncChunks) {
		// 	warnings.push(new Error("EmittedAssetSizeWarning: NoAsyncChunks: " +
		// 		"You can limit the size of your bundles by using System.import() or require.ensure to lazy load some parts of your application after the page has loaded."));
		// }

		// if(warnings.length > 0) {
		// 	Array.prototype.push.apply(compilation.warnings, warnings);
		// }

		callback();
	});

};
