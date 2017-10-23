/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const Dependency = require("../Dependency");

class NullDependency extends Dependency {
	get type() {
		return "null";
	}

	isEqualResource() {
		return false;
	}

	updateHash() {}

	serialize() {
		return {
			path: __filename,
			options: [],
		};
	}
}

NullDependency.Template = class NullDependencyTemplate {
	apply() {}
};

module.exports = NullDependency;
