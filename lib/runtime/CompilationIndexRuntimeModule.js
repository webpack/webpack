/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");

class CompilationIndexRuntimeModule extends RuntimeModule {
	/**
	 * @param {number} compilationIndex the compilation index
	 */
	constructor(compilationIndex) {
		super("compilation index");
		this.compilationIndex = compilationIndex;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		return `${RuntimeGlobals.compilationIndex} = ${this.compilationIndex};`;
	}
}

module.exports = CompilationIndexRuntimeModule;
