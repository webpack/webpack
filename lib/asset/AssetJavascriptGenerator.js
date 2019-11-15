/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Yuta Hiroto @hiroppy
*/

"use strict";

const { RawSource } = require("webpack-sources");
const Generator = require("../Generator");
const RuntimeGlobals = require("../RuntimeGlobals");
const encode = require("./encoder");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("./AssetModulesPlugin").GeneratorOptions} GeneratorOptions */

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
	 * @param {GeneratorOptions} options the options
	 */
	constructor(compilation, options) {
		super();
		this.compilation = compilation;
		this.options = options;
	}

	/**
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source} generated code
	 */
	generate(module, { chunkGraph, runtimeTemplate, runtimeRequirements }) {
		const encodedSource = encode(module, this.options);

		if (encodedSource) {
			module.buildMeta.dataUrlAsset = true;
			return new RawSource(
				`${RuntimeGlobals.module}.exports = ${JSON.stringify(encodedSource)};`
			);
		}

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
		return new RawSource(
			`${RuntimeGlobals.module}.exports = ${
				RuntimeGlobals.publicPath
			} + ${JSON.stringify(url)};`
		);
	}

	/**
	 * @param {NormalModule} module the module
	 * @param {string=} type source type
	 * @returns {number} estimate size of the module
	 */
	getSize(module, type) {
		const source = this.compilation.codeGenerationResults
			.get(module)
			.sources.get(type);
		return source.size();
	}
}

module.exports = AssetJavascriptGenerator;
