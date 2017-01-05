/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ModuleDependency = require("./ModuleDependency");
var NullDependency = require("./NullDependency");

function RequireEnsureItemDependency(request) {
	ModuleDependency.call(this, request);
}
module.exports = RequireEnsureItemDependency;

RequireEnsureItemDependency.prototype = Object.create(ModuleDependency.prototype);
RequireEnsureItemDependency.prototype.constructor = RequireEnsureItemDependency;
RequireEnsureItemDependency.prototype.type = "require.ensure item";

RequireEnsureItemDependency.Template = NullDependency.Template;
