/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

import * as RuntimeGlobals from "../RuntimeGlobals.js";
import RuntimeModule from "../RuntimeModule.js";
import Template from "../Template.js";
/** @typedef {import("../Compilation.js").default} Compilation */

class HasOwnPropertyRuntimeModule extends RuntimeModule {
	constructor() {
		super("hasOwnProperty shorthand");
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;

		return Template.asString([
			`${RuntimeGlobals.hasOwnProperty} = ${runtimeTemplate.returningFunction(
				runtimeTemplate.objectHasOwn("obj", "prop"),
				"obj, prop"
			)}`
		]);
	}
}

export default HasOwnPropertyRuntimeModule;

export { HasOwnPropertyRuntimeModule as "module.exports" };
