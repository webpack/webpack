/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");

class PublicPathRuntimeModule extends RuntimeModule {
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
