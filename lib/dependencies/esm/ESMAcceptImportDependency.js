/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../../util/makeSerializable");
const { ImportPhase } = require("../core/ImportPhase");
const NullDependency = require("../core/NullDependency");
const ESMImportDependency = require("./ESMImportDependency");

class ESMAcceptImportDependency extends ESMImportDependency {
	/**
	 * Creates an instance of ESMAcceptImportDependency.
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

makeSerializable(ESMAcceptImportDependency, [
	"webpack/lib/dependencies/esm/ESMAcceptImportDependency",
	// TODO in the next major release: remove, they restore pre-move cache packs
	"webpack/lib/dependencies/ESMAcceptImportDependency",
	"webpack/lib/dependencies/HarmonyAcceptImportDependency"
]);

ESMAcceptImportDependency.Template =
	/** @type {typeof ESMImportDependency.Template} */ (NullDependency.Template);

module.exports = ESMAcceptImportDependency;
