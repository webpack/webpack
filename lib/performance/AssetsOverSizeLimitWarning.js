/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @thelarkinn
*/
var SizeFormatHelpers = require('../SizeFormatHelpers');

function AssetsOverSizeLimitWarning(assetsOverSizeLimit, compilation, assetLimit) {
	Error.call(this);
	Error.captureStackTrace(this, AssetsOverSizeLimitWarning);
	this.name = "AssetsOverSizeLimitWarning";
	this.assets = assetsOverSizeLimit;

	var assetLists = this.assets.map(function(asset) {
		return "\n  " + asset.name;
	}).join("");

	this.message = "asset size limit: The following assets exceed the recommended size limit (" + SizeFormatHelpers.formatSize(assetLimit) + "). \n" +
		"This can impact web performance.\n" +
		"Assets: " + assetLists;
}
module.exports = AssetsOverSizeLimitWarning;

AssetsOverSizeLimitWarning.prototype = Object.create(Error.prototype);
AssetsOverSizeLimitWarning.prototype.constructor = AssetsOverSizeLimitWarning;
