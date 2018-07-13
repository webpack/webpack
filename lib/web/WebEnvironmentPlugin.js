/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

/** @typedef {import("../Compiler")} Compiler */

class WebEnvironmentPlugin {
	constructor(inputFileSystem, outputFileSystem) {
		this.inputFileSystem = inputFileSystem;
		this.outputFileSystem = outputFileSystem;
	}

	/**
	 * @param {Compiler} compiler Webpack Compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.outputFileSystem = this.outputFileSystem;
	}
}

module.exports = WebEnvironmentPlugin;
