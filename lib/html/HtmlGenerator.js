/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author webpack contributors
*/

"use strict";

const { RawSource } = require("webpack-sources");
const Generator = require("../Generator");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */
/** @typedef {import("../Generator").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../Module").BuildInfo} BuildInfo */
/** @typedef {import("../Module").ConcatenationBailoutReasonContext} ConcatenationBailoutReasonContext */
/** @typedef {import("../Module").SourceType} SourceType */
/** @typedef {import("../Module").SourceTypes} SourceTypes */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../util/Hash")} Hash */

/** @type {ReadonlySet<"html">} */
const HTML_TYPES = new Set(["html"]);

class HtmlGenerator extends Generator {
	constructor() {
		super();
	}

	/**
	 * @param {NormalModule} module fresh module
	 * @returns {SourceTypes} available types (do not mutate)
	 */
	getTypes(module) {
		return /** @type {SourceTypes} */ (HTML_TYPES);
	}

	/**
	 * @param {NormalModule} module the module
	 * @param {SourceType=} type source type
	 * @returns {number} estimate size of the module
	 */
	getSize(module, type) {
		const buildInfo = /** @type {BuildInfo} */ (module.buildInfo);
		const htmlSource = buildInfo && buildInfo.htmlSource;
		if (!htmlSource) return 0;
		return typeof htmlSource === "string" ? htmlSource.length : 0;
	}

	/**
	 * @param {NormalModule} module module for which the bailout reason should be determined
	 * @param {ConcatenationBailoutReasonContext} context context
	 * @returns {string | undefined} reason why this module can't be concatenated, undefined when it can be concatenated
	 */
	getConcatenationBailoutReason(module, context) {
		return "HTML modules cannot be concatenated";
	}

	/**
	 * During code generation, we just return the raw HTML source.
	 * The actual path replacement happens during the render manifest phase
	 * in HtmlModulesPlugin, where all dependency code generation results
	 * are available.
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source | null} generated code
	 */
	generate(module, generateContext) {
		const buildInfo = /** @type {BuildInfo} */ (module.buildInfo);
		const htmlSource = buildInfo && buildInfo.htmlSource;

		if (!htmlSource || typeof htmlSource !== "string") {
			return new RawSource("");
		}

		// Return raw HTML; dependency template replacements happen in renderManifest
		return new RawSource(htmlSource);
	}

	/**
	 * @param {Error} error the error
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source | null} generated code
	 */
	generateError(error, module, generateContext) {
		return new RawSource(`<!-- Error: ${error.message} -->`);
	}

	/**
	 * @param {Hash} hash hash that will be modified
	 * @param {UpdateHashContext} updateHashContext context for updating hash
	 */
	updateHash(hash, { module, runtime }) {
		const buildInfo = /** @type {BuildInfo} */ (module.buildInfo);
		const htmlSource = buildInfo && buildInfo.htmlSource;
		if (htmlSource && typeof htmlSource === "string") {
			hash.update(htmlSource);
		}
	}
}

module.exports = HtmlGenerator;
