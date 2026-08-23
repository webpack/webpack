/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HelperRuntimeModule = require("./HelperRuntimeModule");

/** @import Compilation from "../Compilation" */
/** @import { ReadOnlyRuntimeRequirements } from "../Module" */

class DefinePropertyGettersRuntimeModule extends HelperRuntimeModule {
	/**
	 * @param {ReadOnlyRuntimeRequirements} runtimeRequirements runtime requirements
	 */
	constructor(runtimeRequirements) {
		super("define property getters");
		/** @type {ReadOnlyRuntimeRequirements} */
		this.runtimeRequirements = runtimeRequirements;
	}

	/**
	 * Returns true, if the runtime module should get it's own scope.
	 * When false, `generate()` must emit complete statements ending with `;`
	 * so a following runtime IIFE is not parsed as a call (ASI).
	 * @returns {boolean} true, if the runtime module should get it's own scope
	 */
	shouldIsolate() {
		return false;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		const fn = RuntimeGlobals.definePropertyGetters;
		// Only webpack emits the array form, so a build emitting none cannot
		// receive one; the object form stays either way (see the note below).
		const withArray = this.runtimeRequirements.has(
			RuntimeGlobals.definePropertyGettersFromArray
		);
		// TODO webpack 6: remove object format support. Internal code (e.g. ConcatenatedModule)
		// and third-party libraries may still call __webpack_require__.d() with an object.
		const fromObject = [
			"for(var key in definition) {",
			Template.indent([
				`if(${RuntimeGlobals.hasOwnProperty}(definition, key) && !${RuntimeGlobals.hasOwnProperty}(exports, key)) {`,
				Template.indent([
					"Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });"
				]),
				"}"
			]),
			"}"
		];
		return Template.asString([
			"// define getter/value functions for harmony exports",
			`${fn} = ${runtimeTemplate.basicFunction(
				"exports, definition",
				withArray
					? [
							"if(Array.isArray(definition)) {",
							Template.indent([
								"var i = 0;",
								"while(i < definition.length) {",
								Template.indent([
									"var key = definition[i++];",
									"var binding = definition[i++];",
									// The descriptor is built before the own-property check so a
									// value binding consumes its slot either way.
									"var descriptor = binding === 0 ? { enumerable: true, value: definition[i++] } : { enumerable: true, get: binding };",
									`if(!${RuntimeGlobals.hasOwnProperty}(exports, key)) Object.defineProperty(exports, key, descriptor);`
								]),
								"}"
							]),
							"} else {",
							Template.indent(fromObject),
							"}"
						]
					: fromObject
			)};`
		]);
	}
}

module.exports = DefinePropertyGettersRuntimeModule;
