/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HelperRuntimeModule = require("./HelperRuntimeModule");

/**
 * Emits the runtime helper for source-phase imports of JavaScript modules.
 *
 * For the TC39 source-phase imports proposal, `import source X from "./mod"`
 * (and `await import.source("./mod")`) bind `X` to a `ModuleSource` reflection
 * — an opaque object whose prototype chain exposes a `Symbol.toStringTag`
 * getter returning `"Module"`, mirroring the proposal's `%AbstractModuleSource%`
 * intrinsic.
 *
 * The helper caches one `ModuleSource` per `moduleId` so repeated imports of
 * the same module yield the same reflection, and the imported module's body is
 * not evaluated as a side effect of obtaining it.
 */
class MakeModuleSourceRuntimeModule extends HelperRuntimeModule {
	constructor() {
		super("make module source");
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		if (!this.compilation) return null;
		const { runtimeTemplate } = this.compilation;
		const fn = RuntimeGlobals.makeModuleSource;
		return Template.asString([
			"var __webpack_module_sources__ = {};",
			'var __webpack_module_source_proto__ = Object.freeze(Object.create(null, { [Symbol.toStringTag]: { value: "Module" } }));',
			`${fn} = ${runtimeTemplate.basicFunction("moduleId", [
				"if (moduleId in __webpack_module_sources__) return __webpack_module_sources__[moduleId];",
				"return __webpack_module_sources__[moduleId] = Object.freeze(Object.create(__webpack_module_source_proto__));"
			])};`
		]);
	}
}

module.exports = MakeModuleSourceRuntimeModule;
