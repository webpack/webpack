/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

import * as RuntimeGlobals from "../RuntimeGlobals.js";
import Template from "../Template.js";
import HelperRuntimeModule from "./HelperRuntimeModule.js";
/** @typedef {import("../Compilation.js").default} Compilation */

class MakeNamespaceObjectRuntimeModule extends HelperRuntimeModule {
	constructor() {
		super("make namespace object");
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		const fn = RuntimeGlobals.makeNamespaceObject;
		return Template.asString([
			"// define __esModule on exports",
			`${fn} = ${runtimeTemplate.basicFunction("exports", [
				`if(${runtimeTemplate.supportsSymbol() ? "" : "typeof Symbol !== 'undefined' && "}Symbol.toStringTag) {`,
				Template.indent([
					"Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });"
				]),
				"}",
				"Object.defineProperty(exports, '__esModule', { value: true });"
			])};`
		]);
	}
}

export default MakeNamespaceObjectRuntimeModule;

export { MakeNamespaceObjectRuntimeModule as "module.exports" };
