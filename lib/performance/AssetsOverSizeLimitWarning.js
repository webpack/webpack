/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function AssetsOverSizeLimitWarning(assetsOverSizeLimit, compilation) {
	Error.call(this);
	Error.captureStackTrace(this, AssetsOverSizeLimitWarning);
	this.name = "AssetsOverSizeLimitWarning";
	this.assets = assetsOverSizeLimit;

	var assetLists = this.assets.map(function(asset) {
		return asset.name;
	}).join("\n  -");

	this.message = "The following assets exceed the recommended size limit.\n" +
		"This can impact web performance.\n" +
		"Assets: " + assetLists;
}
module.exports = AssetsOverSizeLimitWarning;

AssetsOverSizeLimitWarning.prototype = Object.create(Error.prototype);
AssetsOverSizeLimitWarning.prototype.constructor = AssetsOverSizeLimitWarning;
