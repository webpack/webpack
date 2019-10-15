/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Yuta Hiroto @hiroppy
*/

"use strict";

const { RawSource } = require("webpack-sources");
const Generator = require("../Generator");
const RuntimeGlobals = require("../RuntimeGlobals");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */

const TYPES = new Set(["javascript"]);

class AssetJavascriptGenerator extends Generator {
	/**
	 * @returns {Set<string>} available types (do not mutate)
	 */
	getTypes() {
		return TYPES;
	}

	/**
	 * @param {Compilation} compilation the compilation
	 */
	constructor(compilation) {
		super();
		this.compilation = compilation;
	}

	/**
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source} generated code
	 */
	generate(module, { chunkGraph, runtimeTemplate, runtimeRequirements }) {
		const filename = module.nameForCondition();
		const { assetModuleFilename } = runtimeTemplate.outputOptions;
		const url = this.compilation.getAssetPath(assetModuleFilename, {
			module,
			filename,
			chunkGraph
		});

		runtimeRequirements.add(RuntimeGlobals.module);
		runtimeRequirements.add(RuntimeGlobals.publicPath); // add __webpack_require__.p

		// TODO: (hiroppy) use ESM
		const source = new RawSource(
			`${RuntimeGlobals.module}.exports = ${
				RuntimeGlobals.publicPath
			} + ${JSON.stringify(url)};`
		);

		return source;
	}

	/**
	 * @param {NormalModule} module the module
	 * @param {string=} type source type
	 * @returns {number} estimate size of the module
	 */
	getSize(module, type) {
		// it's only estimated so this number is probably fine
		// Example: m.exports=r.p+"0123456789012345678901.ext"
		return 42;
	}
}

module.exports = AssetJavascriptGenerator;
