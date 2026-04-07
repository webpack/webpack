/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/**
 * Runtime module that exposes a guarded `System.import` shim for builds that
 * still reference the deprecated SystemJS-style API.
 */
class SystemRuntimeModule extends RuntimeModule {
	/**
	 * Initializes the runtime object assigned to `RuntimeGlobals.system`.
	 */
	constructor() {
		super("system");
	}

	/**
	 * Generates the runtime object whose `import` method throws when invoked
	 * indirectly, preserving webpack's legacy `System.import` semantics.
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

module.exports = SystemRuntimeModule;
