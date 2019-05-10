/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");

/** @typedef {import("../Compilation")} Compilation */

class PublicPathRuntimeModule extends RuntimeModule {
	/**
	 * @param {Compilation} compilation the compilation
	 */
	constructor(compilation) {
		super("publicPath");
		this.compilation = compilation;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		return `${RuntimeGlobals.publicPath} = ${JSON.stringify(
			this.compilation.mainTemplate.getAssetPath(
				this.compilation.outputOptions.publicPath || "",
				{
					hash: this.compilation.hash || "XXXX"
				}
			)
		)};`;
	}
}

module.exports = PublicPathRuntimeModule;
