/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const Dependency = require("../Dependency");

/** @typedef {import('../Dependency').DependencyTemplate} DependencyTemplate **/
/** @typedef {{exports: string[], dependencies: undefined}} ExportTypeDefinition **/

class NullDependency extends Dependency {
	/**
	 * @returns {string} dependency type
	 */
	get type() {
		return "null";
	}

	/**
	 * @override
	 */
	updateHash() {}
}

/**
 * @implements {DependencyTemplate}
 */
NullDependency.Template = class NullDependencyTemplate {
	apply() {}
};

module.exports = NullDependency;
