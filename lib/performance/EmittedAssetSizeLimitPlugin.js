/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @thelarkinn
*/
var EmittedAssetSizeWarningPlugin = require('./EmittedAssetSizeWarningPlugin.js');

function EmittedAssetSizeLimitPlugin(performanceOptions) {
	this.maxAssetSize = performanceOptions.maxAssetSize;
	this.hints = performanceOptions.hints;
}

module.exports = EmittedAssetSizeLimitPlugin;

function normalizeAndCompare(sizeLimit, assetSize) {
	// sizeLimit=maxAssetSize is always expressed in kB
	// assetSize is expressed in byte size
	sizeLimit = sizeLimit * 1024;
	console.log(sizeLimit, assetSize);
	return sizeLimit < assetSize;
}

function getJSWarnings(noOfAssets, sizeLimit, assetSize) {
	var warnings = [];
	if(normalizeAndCompare(sizeLimit, assetSize)) {
		if(noOfAssets === 1) {
			warnings.push(new Error("EmmittedAssetSizeWarning: " + "This asset exceeds " + sizeLimit + "kB. Consider reducing the size for optimal web performance."));
		} else {
			warnings.push(new Error("EmmittedAssetSizeWarning: " + "Highlighted chunks are large and are likely to impact web performance. Consider keeping total chunks of page < " +  sizeLimit + "kB"));
		}
	}
	return warnings;
}

EmittedAssetSizeLimitPlugin.prototype.apply = function(compiler) {

	if(!this.hints) {
		return;
	}

	var sizeLimit = this.maxAssetSize;
	var hints = this.hints;
	var jsRegex = /\.js($|\?)/i;

	compiler.plugin("after-emit", function(compilation, callback) {
		var assets = Object.keys(compilation.assets);
		var noOfAssets = assets.length;
		assets.forEach(function(file) {
			var assetSize = compilation.assets[file].size();
			var warnings = jsRegex.test(file) && getJSWarnings(noOfAssets, sizeLimit, assetSize);
			Array.prototype.push.apply(compilation.warnings, warnings);
		});
		callback();
	});

};
