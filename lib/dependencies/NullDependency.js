/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const Dependency = require("../Dependency");

/** @typedef {import("../util/createHash").Hash} Hash */

class NullDependency extends Dependency {
	/**
	 * @returns {string} dependency type
	 */
	get type() {
		return "null";
	}

	/**
	 * @param {Hash} hash hash
	 * @returns {void}
	 */
	updateHash(hash) {}
}

NullDependency.Template = Dependency.Template;

module.exports = NullDependency;
