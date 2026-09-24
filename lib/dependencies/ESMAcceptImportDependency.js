/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const { registerLegacyRequest } = require("../util/serialization");
const ESMImportDependency = require("./ESMImportDependency");
const { ImportPhase } = require("./ImportPhase");
const NullDependency = require("./NullDependency");

// TODO in the next major release: rename to `ESMAcceptImportDependency`
class HarmonyAcceptImportDependency extends ESMImportDependency {
	/**
	 * Creates an instance of HarmonyAcceptImportDependency.
	 * @param {string} request the request string
	 */
	constructor(request) {
		super(request, Infinity, ImportPhase.Evaluation);
		/** @type {boolean} */
		this.weak = true;
	}

	get type() {
		return "harmony accept";
	}
}

makeSerializable(
	HarmonyAcceptImportDependency,
	"webpack/lib/dependencies/ESMAcceptImportDependency"
);
registerLegacyRequest(
	HarmonyAcceptImportDependency,
	"webpack/lib/dependencies/HarmonyAcceptImportDependency"
);

HarmonyAcceptImportDependency.Template =
	/** @type {typeof ESMImportDependency.Template} */ (NullDependency.Template);

module.exports = HarmonyAcceptImportDependency;
