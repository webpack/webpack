/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NullDependency = require("./NullDependency");
var DepBlockHelpers = require("./DepBlockHelpers");

function UnsupportedDependency(request, range) {
	NullDependency.call(this);
	this.request = request;
	this.range = range;
}
module.exports = UnsupportedDependency;

UnsupportedDependency.prototype = Object.create(NullDependency.prototype);
UnsupportedDependency.prototype.constructor = UnsupportedDependency;

UnsupportedDependency.Template = function UnsupportedDependencyTemplate() {};

UnsupportedDependency.Template.prototype.apply = function(dep, source, outputOptions, requestShortener) {
	source.replace(dep.range[0], dep.range[1], require("./WebpackMissingModule").module(dep.request));
};
