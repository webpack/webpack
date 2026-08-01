/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../Compilation")} Compilation */

class CssServerStylesRuntimeModule extends RuntimeModule {
	constructor() {
		super("css server styles");
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
					// Insertion order matches the order the styles were applied in.
					"for (var key in registry) css += registry[key];",
					"return css;"
				]
			)};`
		]);
	}
}

module.exports = CssServerStylesRuntimeModule;
