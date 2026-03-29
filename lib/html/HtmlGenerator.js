/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Soumyaraj Bag @soumyarajbag - Webpack HTML Entry Points
*/

"use strict";

const { RawSource } = require("webpack-sources");
const Generator = require("../Generator");
const { HTML_TYPE, HTML_TYPES } = require("../ModuleSourceTypeConstants");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */
/** @typedef {import("../Generator").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../Module").SourceType} SourceType */
/** @typedef {import("../Module").SourceTypes} SourceTypes */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../util/Hash")} Hash */

/**
 * HtmlGenerator stores the raw HTML source so it can be retrieved during
 * the processAssets phase where final URLs are known.
 *
 * We intentionally avoid doing URL replacement here because content hashes
 * (used in output filenames like main.[contenthash].js) are only finalized
 * AFTER code generation runs. processAssets runs after chunk assets are
 * created, so at that point chunk.files contains the final hashed filenames.
 */
class HtmlGenerator extends Generator {
	/**
	 * @param {NormalModule} module
	 * @param {GenerateContext} generateContext
	 * @returns {Source | null}
	 */
	generate(module, generateContext) {
		if (generateContext.type !== HTML_TYPE) return null;

		// Return the original HTML source so it's available via
		// codeGenerationResults.get(module, runtime).sources.get("html")
		const originalSource = module.originalSource();
		if (!originalSource) return new RawSource("");
		return new RawSource(/** @type {string} */(originalSource.source()));
	}

	/**
	 * @param {NormalModule} _module
	 * @returns {SourceTypes}
	 */
	getTypes(_module) {
		return HTML_TYPES;
	}

	/**
	 * @param {NormalModule} module
	 * @param {SourceType=} _type
	 * @returns {number}
	 */
	getSize(module, _type) {
		const src = module.originalSource();
		return src ? src.size() : 0;
	}

	/**
	 * @param {Hash} hash
	 * @param {UpdateHashContext} _context
	 */
	updateHash(hash, _context) {
		hash.update("html-generator");
	}
}

module.exports = HtmlGenerator;
