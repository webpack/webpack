/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

/** @typedef {import("../Dependency").ExportTypeDefinition} ExportTypeDefinition */

const NullDependency = require("./NullDependency");

class JsonExportsDependency extends NullDependency {
	constructor(exports) {
		super();
		this.exports = exports;
	}

	get type() {
		return "json exports";
	}

	/**
	 * @returns {null|ExportTypeDefinition} the exported names
	 */
	getExports() {
		return {
			exports: this.exports,
			dependencies: undefined
		};
	}
}

module.exports = JsonExportsDependency;
