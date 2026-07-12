/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

import * as RuntimeGlobals from "../RuntimeGlobals.js";
import RuntimeModule from "../RuntimeModule.js";
import Template from "../Template.js";
/** @typedef {import("./AMDPlugin.js").AmdOptions} AmdOptions */

class AMDDefineRuntimeModule extends RuntimeModule {
	constructor() {
		super("amd define");
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		return Template.asString([
			`${RuntimeGlobals.amdDefine} = function () {`,
			Template.indent("throw new Error('define cannot be used indirect');"),
			"};"
		]);
	}
}

class AMDOptionsRuntimeModule extends RuntimeModule {
	/**
	 * Creates an instance of AMDOptionsRuntimeModule.
	 * @param {AmdOptions} options the AMD options
	 */
	constructor(options) {
		super("amd options");
		this.options = options;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		return Template.asString([
			`${RuntimeGlobals.amdOptions} = ${JSON.stringify(this.options)};`
		]);
	}
}

export { AMDDefineRuntimeModule };
export { AMDOptionsRuntimeModule };
