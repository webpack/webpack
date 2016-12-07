/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @thelarkinn
*/
var SizeFormatHelpers = require('../SizeFormatHelpers');

function EntrypointsOverSizeLimitWarning(entrypoints, compilation, entrypointLimit) {
	Error.call(this);
	Error.captureStackTrace(this, EntrypointsOverSizeLimitWarning);
	this.name = "EntrypointsOverSizeLimitWarning";
	this.entrypoints = entrypoints;

	var entrypointCompilation = compilation;
	var entrypointList = this.entrypoints.map(function(entrypoint) {
		return "\n  " + entrypoint.name + " (" + SizeFormatHelpers.formatSize(entrypoint.getSize(entrypointCompilation)) + ")\n" +
			entrypoint.getFiles().map(function(filename, index) {
				return "      " + entrypoint.getFiles()[index] + "\n";
			}).join("");
	}).join("");

	this.message = "entrypoint size limit: The following entrypoint(s) combined asset size exceeds the recommended limit (" + SizeFormatHelpers.formatSize(entrypointLimit) + "). " +
		"This can impact web performance.\n" +
		"Entrypoints:" + entrypointList;
}
module.exports = EntrypointsOverSizeLimitWarning;

EntrypointsOverSizeLimitWarning.prototype = Object.create(Error.prototype);
EntrypointsOverSizeLimitWarning.prototype.constructor = EntrypointsOverSizeLimitWarning;
