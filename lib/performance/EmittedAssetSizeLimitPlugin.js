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

EmittedAssetSizeLimitPlugin.prototype.apply = function(compiler) {
	var sizeLimit = this.maxAssetSize;
	var hints = this.hints;
	compiler.plugin("after-emit", function(compilation, callback) {
		for (var asset in compilation.assets) {
			if (sizeLimit < compilation.assets[asset].size() && hints) {
				compilation.warnings.push(new Error("EmmittedAssetSizeWarning: " + "This asset exceeds " + sizeLimit + "kB. Consider reducing the size for optimal web performance."));
			}
		}

		callback();
	});
};
