"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const ModuleDependency = require("./ModuleDependency");
class RequireEnsureItemDependency extends ModuleDependency {
	constructor(request) {
		super(request);
	}
}
RequireEnsureItemDependency.Template = require("./NullDependencyTemplate");
RequireEnsureItemDependency.prototype.type = "require.ensure item";
module.exports = RequireEnsureItemDependency;
