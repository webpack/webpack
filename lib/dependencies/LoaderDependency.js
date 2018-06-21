/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("../NormalModule")} NormalModule */

class LoaderDependency extends ModuleDependency {
	constructor(request) {
		super(request);
		/** @type {NormalModule} */
		this.module = undefined;
	}

	get type() {
		return "loader";
	}
}

module.exports = LoaderDependency;
