/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../Compilation")} Compilation */

class GetMainFilenameRuntimeModule extends RuntimeModule {
	/**
	 * @param {Compilation} compilation the compilation
	 * @param {string} name readable name
	 * @param {string} global global object binding
	 * @param {string} filename main file name
	 */
	constructor(compilation, name, global, filename) {
		super(`get ${name} filename`);
		this.compilation = compilation;
		this.global = global;
		this.filename = filename;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { global, filename, compilation } = this;
		const mainTemplate = compilation.mainTemplate;
		const url = mainTemplate.getAssetPath(JSON.stringify(filename), {
			hash: `" + ${RuntimeGlobals.getFullHash}() + "`,
			hashWithLength: length =>
				`" + ${RuntimeGlobals.getFullHash}().slice(0, ${length}) + "`
		});
		return Template.asString([
			`${global} = function() {`,
			Template.indent([`return ${url};`]),
			"};"
		]);
	}
}

module.exports = GetMainFilenameRuntimeModule;
