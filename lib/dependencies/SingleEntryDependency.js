"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const ModuleDependency = require("./ModuleDependency");
class SingleEntryDependency extends ModuleDependency {
	constructor(request) {
		super(request);
	}
}
SingleEntryDependency.prototype.type = "single entry";
module.exports = SingleEntryDependency;
