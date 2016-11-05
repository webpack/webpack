/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function EntrypointsOverSizeLimitWarning(entrypoints, compilation) {
	Error.call(this);
	Error.captureStackTrace(this, EntrypointsOverSizeLimitWarning);
	this.name = "EntrypointsOverSizeLimitWarning";
	this.entrypoints = entrypoints;

	var entrypointList = this.entrypoints.map(function(ep) {
		return ep.name;
	}).join("\n  -");

	this.message = "The following Entrypoints combined asset size exceeds the recommended limit." +
		"This can impact web performance!!\n" +
		"Entrypoints: \n" +
		entrypointList;
}
module.exports = EntrypointsOverSizeLimitWarning;

EntrypointsOverSizeLimitWarning.prototype = Object.create(Error.prototype);
EntrypointsOverSizeLimitWarning.prototype.constructor = EntrypointsOverSizeLimitWarning;
