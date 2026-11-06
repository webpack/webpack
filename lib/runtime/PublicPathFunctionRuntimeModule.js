/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compilation")} Compilation */

class PublicPathFunctionRuntimeModule extends RuntimeModule {
	constructor() {
		super("publicPath", RuntimeModule.STAGE_BASIC);
	}

	/**
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { publicPathFunction } = compilation.outputOptions;

		return Template.asString([
			!publicPathFunction
				? `${RuntimeGlobals.publicPath} = "__webpackager_res__";`
				: `${RuntimeGlobals.publicPath} = ${publicPathFunction};`
		]);
	}
}

module.exports = PublicPathFunctionRuntimeModule;
