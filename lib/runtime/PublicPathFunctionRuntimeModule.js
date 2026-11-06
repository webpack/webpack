/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../../declarations/WebpackOptions").OutputNormalized} OutputOptions */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compilation")} Compilation */

class PublicPathFunctionRuntimeModule extends RuntimeModule {
	/**
	 * @param {OutputOptions["publicPathFunction"]} publicPathFunction public path
	 */
	constructor(publicPathFunction) {
		super("publicPathFunction", RuntimeModule.STAGE_BASIC);
		this.publicPathFunction = publicPathFunction;
	}

	/**
	 * @returns {string | null} runtime code
	 */
	generate() {
		const { runtimeTemplate } = /** @type {Compilation} */ (this.compilation);
		const { publicPathFunction } = this;

		return Template.asString([
			!publicPathFunction
				? `${RuntimeGlobals.publicPathFunction} = ${runtimeTemplate.returningFunction("publicPath + path", "path, publicPath")};`
				: `${RuntimeGlobals.publicPathFunction} = ${publicPathFunction};`
		]);
	}
}

module.exports = PublicPathFunctionRuntimeModule;
