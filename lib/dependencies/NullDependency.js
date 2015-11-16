/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Dependency = require("../Dependency");

function NullDependency() {
	Dependency.call(this);
}
module.exports = NullDependency;

NullDependency.prototype = Object.create(Dependency.prototype);
NullDependency.prototype.constructor = NullDependency;
NullDependency.prototype.type = "null";
NullDependency.prototype.isEqualResource = function() {
	return false;
};
