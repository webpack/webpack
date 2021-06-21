/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ModuleDependency = require("./ModuleDependency");

class LoaderImportDependency extends ModuleDependency {
	/**
	 * @param {string} request request string
	 */
	constructor(request) {
		super(request);
		this.weak = true;
	}

	get type() {
		return "loader import";
	}

	get category() {
		return "loaderImport";
	}
}

module.exports = LoaderImportDependency;
