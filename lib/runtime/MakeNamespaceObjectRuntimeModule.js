/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HelperRuntimeModule = require("./HelperRuntimeModule");

/** @import Compilation from "../Compilation" */

class MakeNamespaceObjectRuntimeModule extends HelperRuntimeModule {
	constructor() {
		super("make namespace object");
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
		const fn = RuntimeGlobals.makeNamespaceObject;
		const toStringTag =
			"Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });";
		return Template.asString([
			"// define __esModule on exports",
			`${fn} = ${runtimeTemplate.basicFunction("exports", [
				// `environment.symbol` promises the well-known symbols too, so only an
				// environment without it needs the feature test around the tag.
				...(runtimeTemplate.supportsSymbol()
					? [toStringTag]
					: [
							"if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {",
							Template.indent([toStringTag]),
							"}"
						]),
				"Object.defineProperty(exports, '__esModule', { value: true });"
			])};`
		]);
	}
}

module.exports = MakeNamespaceObjectRuntimeModule;
