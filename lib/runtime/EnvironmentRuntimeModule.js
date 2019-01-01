/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

class EnvironmentRuntimeModule extends RuntimeModule {
	constructor(compilation, provideName) {
		super("enviroment");
		this.compilation = compilation;
		this.provideName = provideName;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { globalObject } = this.compilation.outputOptions;
		const provideName = this.provideName;
		return Template.asString([
			`if (${globalObject}.document !== undefined) {`,
			Template.indent([`${provideName} = "web";`]),
			`} else if (typeof ${globalObject}.importScripts === "function") {`,
			Template.indent([`${provideName} = "webworker";`]),
			`} else if (${globalObject}.process !== undefined) {`,
			Template.indent([`${provideName} = "node";`]),
			"} else {",
			Template.indent([`${provideName} = "web";`]),
			"}"
		]);
	}
}

module.exports = EnvironmentRuntimeModule;
