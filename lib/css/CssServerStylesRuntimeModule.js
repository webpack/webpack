/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @import Compilation from "../Compilation" */

class CssServerStylesRuntimeModule extends RuntimeModule {
	constructor() {
		super("css server styles");
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
		const cst = runtimeTemplate.renderConst();

		return Template.asString([
			`${RuntimeGlobals.getCssServerStyles} = ${runtimeTemplate.basicFunction(
				"",
				[
					`${cst} registry = ${runtimeTemplate.cssServerStyleRegistry()};`,
					'var css = "";',
					// keys are string-prefixed at the write site, so this yields
					// insertion order rather than ascending numeric module id order
					"for (var key in registry) css += registry[key];",
					"return css;"
				]
			)};`
		]);
	}
}

module.exports = CssServerStylesRuntimeModule;
