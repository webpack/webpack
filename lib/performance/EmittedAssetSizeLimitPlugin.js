/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @thelarkinn
*/
var path = require('path');

function EmittedAssetSizeLimitPlugin(performanceOptions) {
	this.maxAssetSize = performanceOptions.maxAssetSize;
	this.hints = performanceOptions.hints;
}

module.exports = EmittedAssetSizeLimitPlugin;

function uniques(array) {
	var result = [],
		val, ridx;
	outer:
		for(var i = 0, length = array.length; i < length; i++) {
			val = array[i];
			ridx = result.length;
			while(ridx--) {
				if(val === result[ridx]) continue outer;
			}
			result.push(val);
		}
	return result;
}

function normalizeAndCompare(sizeLimit, assetSize) {
	// sizeLimit=maxAssetSize is always expressed in kB
	// assetSize is expressed in byte size
	sizeLimit = sizeLimit * 1024;
	return sizeLimit < assetSize;
}

function getJSWarnings(noOfAssets, sizeLimit, assetSize) {
	var warnings = [];
	if(normalizeAndCompare(sizeLimit, assetSize)) {
		if(noOfAssets === 1) {
			warnings.push(new Error("EmmittedAssetSizeWarning: " + "This asset exceeds " + sizeLimit + "kB. Consider reducing the size for optimal web performance."));
		} else {
			warnings.push(new Error("EmmittedAssetSizeWarning: " + "Highlighted chunks are large and are likely to impact web performance. Consider keeping total chunks of page < " + sizeLimit + "kB"));
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
		console.log("Plugin Init");
		var assets = Object.keys(compilation.assets);
		var noOfAssets = assets.length;
		assets.forEach(function(file) {
			var assetSize = compilation.assets[file].size();
			var warnings = jsRegex.test(file) && getJSWarnings(noOfAssets, sizeLimit, assetSize);
			if(warnings.length > 0) {
				Array.prototype.push.apply(compilation.warnings, warnings);
			}
		});
		callback();
	});

};

//TODO# This should probably be moved to compilation
EmittedAssetSizeLimitPlugin.prototype.getAssets = function(compilation, chunks) {
	var self = this;
	var webpackStatsJson = compilation.getStats().toJson();

	var assets = {
		// Will contain all js & css files by chunk
		chunks: {},
		// Will contain all js files
		js: [],
		// Will contain all css files
		css: [],
		// Will contain the html5 appcache manifest files if it exists
		manifest: Object.keys(compilation.assets).filter(function(assetFile) {
			return path.extname(assetFile) === '.appcache';
		})[0]
	};

	// Append a hash for cache busting
	for(var i = 0; i < chunks.length; i++) {
		var chunk = chunks[i];
		var chunkName = chunk.names[0];

		assets.chunks[chunkName] = {};

		// Prepend the public path to all chunk files
		var chunkFiles = [].concat(chunk.files).map(function(chunkFile) {
			return chunkFile;
		});

		// Webpack outputs an array for each chunk when using sourcemaps
		// But we need only the entry file
		var entry = chunkFiles[0];
		assets.chunks[chunkName].size = chunk.size;
		assets.chunks[chunkName].entry = entry;
		assets.chunks[chunkName].hash = chunk.hash;
		assets.js.push(entry);

		// Gather all css files
		var css = chunkFiles.filter(function(chunkFile) {
			// Some chunks may contain content hash in their names, for ex. 'main.css?1e7cac4e4d8b52fd5ccd2541146ef03f'.
			// We must proper handle such cases, so we use regexp testing here
			return /.css($|\?)/.test(chunkFile);
		});
		assets.chunks[chunkName].css = css;
		assets.css = assets.css.concat(css);
	}

	// Duplicate css assets can occur on occasion if more than one chunk
	// requires the same css.
	assets.css = uniques(assets.css);

	return assets;
};
