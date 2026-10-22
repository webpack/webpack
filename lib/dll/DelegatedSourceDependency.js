/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ModuleDependency = require("../dependencies/core/ModuleDependency");
const makeSerializable = require("../util/makeSerializable");

class DelegatedSourceDependency extends ModuleDependency {
	/**
	 * Creates an instance of DelegatedSourceDependency.
	 * @param {string} request the request string
	 */
	constructor(request) {
		super(request);
	}

	get type() {
		return "delegated source";
	}

	get category() {
		return "esm";
	}
}

makeSerializable(DelegatedSourceDependency, [
	"webpack/lib/dll/DelegatedSourceDependency",
	// TODO in the next major release: remove, they restore pre-move cache packs
	"webpack/lib/dependencies/DelegatedSourceDependency"
]);

module.exports = DelegatedSourceDependency;
