/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

import * as RuntimeGlobals from "../RuntimeGlobals.js";
import Template from "../Template.js";
import HelperRuntimeModule from "./HelperRuntimeModule.js";
/** @typedef {import("../Compilation.js").default} Compilation */

class CompatGetDefaultExportRuntimeModule extends HelperRuntimeModule {
	constructor() {
		super("compat get default export");
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		const fn = RuntimeGlobals.compatGetDefaultExport;
		return Template.asString([
			"// getDefaultExport function for compatibility with non-harmony modules",
			`${fn} = ${runtimeTemplate.basicFunction("module", [
				`${runtimeTemplate.renderConst()} getter = module && module.__esModule ?`,
				Template.indent([
					`${runtimeTemplate.returningFunction("module['default']")} :`,
					`${runtimeTemplate.returningFunction("module")};`
				]),
				`${RuntimeGlobals.definePropertyGetters}(getter, { a: getter });`,
				"return getter;"
			])};`
		]);
	}
}

export default CompatGetDefaultExportRuntimeModule;

export { CompatGetDefaultExportRuntimeModule as "module.exports" };
