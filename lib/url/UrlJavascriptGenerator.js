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

const TYPES = new Set(["url"]);

class UrlJavascriptGenerator extends Generator {
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
		this.mainTemplate = compilation.mainTemplate;
	}

	/**
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source} generated code
	 */
	generate(module, { chunkGraph, runtimeTemplate, runtimeRequirements }) {
		const originalSource = module.originalSource();

		if (!originalSource) {
			return new RawSource("throw new Error('No source available');");
		}

		const filename = module.resource;
		const { urlModuleFilename } = runtimeTemplate.outputOptions;
		const url = this.mainTemplate.getAssetPath(urlModuleFilename, {
			module,
			filename,
			chunkGraph
		});

		runtimeRequirements.add(RuntimeGlobals.module);
		runtimeRequirements.add(RuntimeGlobals.exports);
		runtimeRequirements.add(RuntimeGlobals.require);
		runtimeRequirements.add(RuntimeGlobals.publicPath); // add __webpack_require__.p

		// TODO: (hiroppy) use ESM
		const source = new RawSource(
			`module.exports = ${RuntimeGlobals.publicPath} + "${url}";`
		);

		return source;
	}

	/**
	 * @param {NormalModule} module the module
	 * @param {string=} type source type
	 * @returns {number} estimate size of the module
	 */
	getSize(module, type) {
		const originalSource = module.originalSource();

		if (!originalSource) {
			return 0;
		}
		return originalSource.size();
	}
}

module.exports = UrlJavascriptGenerator;
