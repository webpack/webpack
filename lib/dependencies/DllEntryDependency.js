/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const Dependency = require("../Dependency");
const hydrateDependency = require("../util/hydrateDependency");

class DllEntryDependency extends Dependency {
	constructor(dependencies, name) {
		super();
		this.dependencies = dependencies;
		this.name = name;
	}

	get type() {
		return "dll entry";
	}

	serialize() {
		return {
			path: __filename,
			options: [
				hydrateDependency.serializeArray(this.dependencies),
				this.name
			],
		};
	}
}

module.exports = DllEntryDependency;
