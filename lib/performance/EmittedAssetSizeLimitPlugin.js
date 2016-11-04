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

function normalizeAndCompare(sizeLimit, assetSize) {
	// sizeLimit=maxAssetSize is always expressed in kB
	// assetSize is expressed in byte size
	sizeLimit *= 1024;
	return sizeLimit < assetSize;
}

function doesExceedInitialLimit(initialLimit, actualInitialSize) {

	initialLimit *= 1024;
	return initialLimit < actualInitialSize;
}

function getJSWarnings(noOfAssets, sizeLimit, assetSize) {
	var warnings = [];

	if(normalizeAndCompare(sizeLimit, assetSize)) {
		if(noOfAssets === 1) {
			warnings.push(new Error("EmmittedAssetSizeWarning: ChunkSizeExceeded" + "This asset exceeds " + sizeLimit + "kB. \nConsider reducing the size for optimal web performance."));
		} else {
			warnings.push(new Error("EmmittedAssetSizeWarning: ChunkSizeExceeded" + "Highlighted chunks are large and are likely to impact web performance. \nConsider keeping total chunks of page < " + sizeLimit + "kB"));
		}
	}

	return warnings;
}

EmittedAssetSizeLimitPlugin.prototype.apply = function(compiler) {

	if(!this.hints) {
		return;
	}

	var totalInitialChunkSize = this.maxInitialSize;
	var sizeLimit = this.maxAssetSize;
	var hints = this.hints;
	var jsRegex = /\.js($|\?)/i;

	compiler.plugin("after-emit", function(compilation, callback) {
		var assets = Object.keys(compilation.assets);
		var noOfAssets = assets.length;
		var warnings = [];
		var actualTotalInitialSize = 0;
		var hasAsyncChunks = compilation.chunks.filter(function(chunk) {
			return chunk.isAsync();
		}).length > 0;

		assets.forEach(function(file) {
			var assetSize = compilation.assets[file].size();
			var assetsByChunks = compilation.getAssetsByChunks().chunks;

			for(var chunkKey in assetsByChunks) {
				var chunk = assetsByChunks[chunkKey];

				actualTotalInitialSize += chunk.size;
			}

			warnings = jsRegex.test(file) && getJSWarnings(noOfAssets, sizeLimit, assetSize);
		});

		if(doesExceedInitialLimit(totalInitialChunkSize, actualTotalInitialSize)) {
			//TODO# Maybe separate warning name
			warnings.push(
				new Error(
					"EmittedAssetSizeWarning: TotalSizeExceeded " +
					"The total initial download cost for these assets are likey to impact web performance. \nConsider keeping the total size of your initial assets < " +
					totalInitialChunkSize +
					"kB")
			);
		}

		if (!hasAsyncChunks) {
			warnings.push(new Error("EmittedAssetSizeWarning: NoAsyncChunks: " + 
				"You can limit the size of your bundles by using System.import() or require.ensure to lazy load some parts of your application after the page has loaded.")
			);
		}

		if(warnings.length > 0) {
			Array.prototype.push.apply(compilation.warnings, warnings);
		}

		callback();
	});

};
