/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ModuleDependency = require("./ModuleDependency");

class DelegatedSourceDependency extends ModuleDependency {
	constructor(request) {
		super(request);
	}

	get type() {
		return "delegated source";
	}
	
	serialize(context) {
		super.serialize(context);
	}

	deserialize(context) {
		super.deserialize(context);
	}
}

module.exports = DelegatedSourceDependency;
