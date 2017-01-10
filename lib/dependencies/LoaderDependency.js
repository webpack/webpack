/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ModuleDependency = require("./ModuleDependency");

class LoaderDependency extends ModuleDependency {
	constructor(request) {
		super(request);
	}

	get type() {
		return "loader";
	}
}

module.exports = LoaderDependency;
