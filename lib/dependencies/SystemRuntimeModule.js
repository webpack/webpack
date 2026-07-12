/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

import * as RuntimeGlobals from "../RuntimeGlobals.js";
import RuntimeModule from "../RuntimeModule.js";
import Template from "../Template.js";

class SystemRuntimeModule extends RuntimeModule {
	constructor() {
		super("system");
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		return Template.asString([
			`${RuntimeGlobals.system} = {`,
			Template.indent([
				"import: function () {",
				Template.indent(
					"throw new Error('System.import cannot be used indirectly');"
				),
				"}"
			]),
			"};"
		]);
	}
}

export default SystemRuntimeModule;

export { SystemRuntimeModule as "module.exports" };
