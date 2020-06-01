/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ModuleDependency = require("../dependencies/ModuleDependency");
const makeSerializable = require("../util/makeSerializable");

class ProvidedDependency extends ModuleDependency {
	/**
	 *
	 * @param {string} request request string
	 */
	constructor(request) {
		super(request);
	}

	get type() {
		return "provided";
	}
}

makeSerializable(ProvidedDependency, "webpack/lib/sharing/ProvidedDependency");

module.exports = ProvidedDependency;
