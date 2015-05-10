/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NullDependency = require("./NullDependency");

function LabeledExportsDependency(name, pos) {
	NullDependency.call(this);
	this.Class = LabeledExportsDependency;
	this.name = name;
	this.pos = pos;
}
module.exports = LabeledExportsDependency;

LabeledExportsDependency.prototype = Object.create(NullDependency.prototype);
LabeledExportsDependency.prototype.constructor = LabeledExportsDependency;

LabeledExportsDependency.Template = function LabeledExportsDependencyTemplate() {};

LabeledExportsDependency.Template.prototype.apply = function(dep, source) {
	source.insert(dep.pos, "exports[" + JSON.stringify(dep.name) + "] = ");
};
