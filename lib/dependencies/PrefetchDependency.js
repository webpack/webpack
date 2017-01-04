"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const ModuleDependency = require("./ModuleDependency");
class PrefetchDependency extends ModuleDependency {
	constructor(request) {
		super(request);
	}
}
PrefetchDependency.prototype.type = "prefetch";
module.exports = PrefetchDependency;
