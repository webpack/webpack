/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ModuleDependency = require("../dependencies/ModuleDependency");
const makeSerializable = require("../util/makeSerializable");
const { registerLegacyRequest } = require("../util/serialization");

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

makeSerializable(
	DelegatedSourceDependency,
	"webpack/lib/dll/DelegatedSourceDependency"
);
registerLegacyRequest(
	DelegatedSourceDependency,
	"webpack/lib/dependencies/DelegatedSourceDependency"
);

module.exports = DelegatedSourceDependency;
