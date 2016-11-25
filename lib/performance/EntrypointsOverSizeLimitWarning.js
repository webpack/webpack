/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @thelarkinn
*/
function EntrypointsOverSizeLimitWarning(entrypoints, compilation, formatSizeFn, entrypointLimit) {
	Error.call(this);
	Error.captureStackTrace(this, EntrypointsOverSizeLimitWarning);
	this.name = "EntrypointsOverSizeLimitWarning";
	this.entrypoints = entrypoints;
	var formatSize = formatSizeFn;

	var entrypointList = this.entrypoints.map(function(entrypoint) {
		return "\n  " + entrypoint.name + ": " + formatSize(entrypoint.size).string + "\n" +
			Object.keys(entrypoint.assets).map(function(assetKey) {
				var asset = entrypoint.assets[assetKey];
				return "      " + asset.name + ": " + formatSize(asset.size).string + "\n";
			}).join("");
	}).join("");

	this.message = "entrypoint size limit: The following entrypoint(s) combined asset size exceeds the recommended limit (" + formatSize(entrypointLimit).string + "). " +
		"This can impact web performance.\n" +
		"Entrypoints: \n" +
		entrypointList;
}
module.exports = EntrypointsOverSizeLimitWarning;

EntrypointsOverSizeLimitWarning.prototype = Object.create(Error.prototype);
EntrypointsOverSizeLimitWarning.prototype.constructor = EntrypointsOverSizeLimitWarning;
