/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Yuta Hiroto @hiroppy
*/

"use strict";

const { RawSource } = require("webpack-sources");
const Generator = require("../Generator");
const RuntimeGlobals = require("../RuntimeGlobals");
const encoder = require("./encoder");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/plugins/AssetModulesPlugin").AssetModulesPluginOptions} AssetModulesPluginOptions */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */

const JS_TYPES = new Set(["javascript"]);
const JS_AND_ASSET_TYPES = new Set(["javascript", "asset"]);

class AssetGenerator extends Generator {
	/**
	 * @param {Compilation} compilation the compilation
	 * @param {AssetModulesPluginOptions} options the options
	 */
	constructor(compilation, options) {
		super();
		this.compilation = compilation;
		this.options = encoder.prepareOptions(options);
	}

	/**
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source} generated code
	 */
	generate(module, { chunkGraph, runtimeTemplate, runtimeRequirements, type }) {
		if (type === "asset") {
			return module.originalSource();
		}

		runtimeRequirements.add(RuntimeGlobals.module);

		if (!encoder.shouldEmitAsset(module, this.options)) {
			const encodedSource = encoder.encode(module, this.options);
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

		runtimeRequirements.add(RuntimeGlobals.publicPath); // add __webpack_require__.p

		// TODO: (hiroppy) use ESM
		return new RawSource(
			`${RuntimeGlobals.module}.exports = ${
				RuntimeGlobals.publicPath
			} + ${JSON.stringify(url)};`
		);
	}

	/**
	 * @param {NormalModule} module fresh module
	 * @returns {Set<string>} available types (do not mutate)
	 */
	getTypes(module) {
		if (encoder.shouldEmitAsset(module, this.options)) {
			return JS_AND_ASSET_TYPES;
		}

		return JS_TYPES;
	}

	/**
	 * @param {NormalModule} module the module
	 * @param {string=} type source type
	 * @returns {number} estimate size of the module
	 */
	getSize(module, type = module.type) {
		const originalSource = module.originalSource();

		if (!originalSource) {
			return 0;
		}

		if (type === "asset") {
			return originalSource.size();
		}

		if (encoder.shouldEmitAsset(module, this.options)) {
			// it's only estimated so this number is probably fine
			// Example: m.exports=r.p+"0123456789012345678901.ext"
			return 42;
		} else {
			// roughly for data url (a little bit tricky)
			return originalSource.size() * 1.5;
		}
	}
}

module.exports = AssetGenerator;
