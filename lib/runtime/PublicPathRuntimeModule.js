/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");

/** @typedef {import("../Compilation")} Compilation */

class PublicPathRuntimeModule extends RuntimeModule {
	constructor() {
		super("publicPath");
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		return `${RuntimeGlobals.publicPath} = ${JSON.stringify(
			this.compilation.getPath(
				this.compilation.outputOptions.publicPath || "",
				{
					hash: this.compilation.hash || "XXXX"
				}
			)
		)};`;
	}
}

module.exports = PublicPathRuntimeModule;
