/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const HarmonyImportDependency = require("./HarmonyImportDependency");
const { IMPORT_PHASE_EVALUATION } = require("./ImportPhase");
const NullDependency = require("./NullDependency");

class HarmonyAcceptImportDependency extends HarmonyImportDependency {
	/**
	 * @param {string} request the request string
	 */
	constructor(request) {
		super(request, Number.NaN, IMPORT_PHASE_EVALUATION);
		this.weak = true;
	}

	get type() {
		return "harmony accept";
	}
}

makeSerializable(
	HarmonyAcceptImportDependency,
	"webpack/lib/dependencies/HarmonyAcceptImportDependency"
);

HarmonyAcceptImportDependency.Template =
	/** @type {typeof HarmonyImportDependency.Template} */ (
		NullDependency.Template
	);

module.exports = HarmonyAcceptImportDependency;
