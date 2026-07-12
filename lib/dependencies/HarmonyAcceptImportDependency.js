/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import makeSerializable from "../util/makeSerializable.js";
import HarmonyImportDependency from "./HarmonyImportDependency.js";
import { ImportPhase } from "./ImportPhase.js";
import NullDependency from "./NullDependency.js";

class HarmonyAcceptImportDependency extends HarmonyImportDependency {
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
	"webpack/lib/dependencies/HarmonyAcceptImportDependency"
);

HarmonyAcceptImportDependency.Template =
	/** @type {typeof HarmonyImportDependency.Template} */ (
		NullDependency.Template
	);

export default HarmonyAcceptImportDependency;

export { HarmonyAcceptImportDependency as "module.exports" };
