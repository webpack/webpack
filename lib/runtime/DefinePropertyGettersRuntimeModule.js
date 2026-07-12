/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

import * as RuntimeGlobals from "../RuntimeGlobals.js";
import Template from "../Template.js";
import HelperRuntimeModule from "./HelperRuntimeModule.js";
/** @typedef {import("../Compilation.js").default} Compilation */

class DefinePropertyGettersRuntimeModule extends HelperRuntimeModule {
	constructor() {
		super("define property getters");
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		const fn = RuntimeGlobals.definePropertyGetters;
		return Template.asString([
			"// define getter/value functions for harmony exports",
			`${fn} = ${runtimeTemplate.basicFunction("exports, definition", [
				"if(Array.isArray(definition)) {",
				Template.indent([
					"var i = 0;",
					"while(i < definition.length) {",
					Template.indent([
						"var key = definition[i++];",
						"var binding = definition[i++];",
						`if(!${RuntimeGlobals.hasOwnProperty}(exports, key)) {`,
						Template.indent([
							"if(binding === 0) {",
							Template.indent([
								"Object.defineProperty(exports, key, { enumerable: true, value: definition[i++] });"
							]),
							"} else {",
							Template.indent([
								"Object.defineProperty(exports, key, { enumerable: true, get: binding });"
							]),
							"}"
						]),
						"} else if(binding === 0) { i++; }"
					]),
					"}"
				]),
				// TODO webpack 6: remove object format support. Internal code (e.g. ConcatenatedModule)
				// and third-party libraries may still call __webpack_require__.d() with an object.
				"} else {",
				Template.indent([
					"for(var key in definition) {",
					Template.indent([
						`if(${RuntimeGlobals.hasOwnProperty}(definition, key) && !${RuntimeGlobals.hasOwnProperty}(exports, key)) {`,
						Template.indent([
							"Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });"
						]),
						"}"
					]),
					"}"
				]),
				"}"
			])};`
		]);
	}
}

export default DefinePropertyGettersRuntimeModule;

export { DefinePropertyGettersRuntimeModule as "module.exports" };
