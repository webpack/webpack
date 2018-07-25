/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const NullDependency = require("./NullDependency");

/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */

class JsonExportsDependency extends NullDependency {
	constructor(exports) {
		super();
		this.exports = exports;
	}

	get type() {
		return "json exports";
	}

	/**
	 * Returns the exported names
	 * @returns {ExportsSpec | undefined} export names
	 */
	getExports() {
		return {
			exports: this.exports,
			dependencies: undefined
		};
	}
}

module.exports = JsonExportsDependency;
