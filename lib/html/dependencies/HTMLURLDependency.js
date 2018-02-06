/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ModuleDependency = require("../../dependencies/ModuleDependency");
const DependencyReference = require("../../dependencies/DependencyReference");

class HTMLURLDependency extends ModuleDependency {
	constructor(request, name) {
		super(request);

		this.name = name;
	}

	get type() {
		return "html url";
	}

	getReference(moduleGraph) {
		if (!moduleGraph.getModule(this)) {
			return null;
		}

		return new DependencyReference(
			() => moduleGraph.getModule(this),
			false,
			this.weak,
			this.sourceOrder
		);
	}
}

module.exports = HTMLURLDependency;
