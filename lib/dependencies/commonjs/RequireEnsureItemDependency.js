/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../../util/makeSerializable");
const { registerLegacyRequest } = require("../../util/serialization");
const ModuleDependency = require("../core/ModuleDependency");
const NullDependency = require("../core/NullDependency");

class RequireEnsureItemDependency extends ModuleDependency {
	/**
	 * Creates an instance of RequireEnsureItemDependency.
	 * @param {string} request the request string
	 */
	constructor(request) {
		super(request);
	}

	get type() {
		return "require.ensure item";
	}

	get category() {
		return "commonjs";
	}
}

makeSerializable(
	RequireEnsureItemDependency,
	"webpack/lib/dependencies/commonjs/RequireEnsureItemDependency"
);
registerLegacyRequest(
	RequireEnsureItemDependency,
	"webpack/lib/dependencies/RequireEnsureItemDependency"
);

RequireEnsureItemDependency.Template = NullDependency.Template;

module.exports = RequireEnsureItemDependency;
