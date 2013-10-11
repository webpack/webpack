/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function UnsupportedFeatureWarning(module, message) {
	Error.call(this);
	Error.captureStackTrace(this, UnsupportedFeatureWarning);
	this.name = "UnsupportedFeatureWarning";
	this.message = message;
	this.origin = this.module = module;
}
module.exports = UnsupportedFeatureWarning;

UnsupportedFeatureWarning.prototype = Object.create(Error.prototype);
