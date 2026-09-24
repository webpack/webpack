/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ModuleDependency = require("../dependencies/core/ModuleDependency");
const makeSerializable = require("../util/makeSerializable");
const { registerLegacyRequest } = require("../util/serialization");

class EntryDependency extends ModuleDependency {
	/**
	 * Creates an instance of EntryDependency.
	 * @param {string} request request path for entry
	 */
	constructor(request) {
		super(request);
	}

	get type() {
		return "entry";
	}

	get category() {
		return "esm";
	}
}

makeSerializable(EntryDependency, "webpack/lib/entry/EntryDependency");
registerLegacyRequest(
	EntryDependency,
	"webpack/lib/dependencies/EntryDependency"
);

module.exports = EntryDependency;
