/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Yuta Hiroto @hiroppy
*/

"use strict";

const Parser = require("../Parser");
const StaticExportsDependency = require("../dependencies/StaticExportsDependency");

/** @typedef {import("../Module").BuildInfo} BuildInfo */
/** @typedef {import("../Module").BuildMeta} BuildMeta */
/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../Parser").PreparsedAst} PreparsedAst */

/**
 * @typedef {object} AssetSourceParserOptions
 * @property {boolean=} outputModule whether output.module is enabled
 */

class AssetSourceParser extends Parser {
	/**
	 * @param {AssetSourceParserOptions=} options options
	 */
	constructor(options = {}) {
		super();
		this.options = {
			outputModule: false,
			...options
		};
	}

	/**
	 * @param {string | Buffer | PreparsedAst} source the source to parse
	 * @param {ParserState} state the parser state
	 * @returns {ParserState} the parser state
	 */
	parse(source, state) {
		if (typeof source === "object" && !Buffer.isBuffer(source)) {
			throw new Error("AssetSourceParser doesn't accept preparsed AST");
		}
		const { module } = state;
		/** @type {BuildInfo} */
		(module.buildInfo).strict = true;
		/** @type {BuildMeta} */
		(state.module.buildMeta).defaultObject = false;

		if (this.options.outputModule) {
			// When output.module is enabled, use "namespace" exports so that
			// `import * as ns` gets the exports directly without __webpack_require__.t()
			// which injects __esModule. Per CreateDefaultExportSyntheticModule spec,
			// namespace only has "default".
			// https://tc39.es/proposal-json-modules/#sec-create-default-export-synthetic-module
			/** @type {BuildMeta} */
			(module.buildMeta).exportsType = "namespace";
			module.addDependency(new StaticExportsDependency(["default"], true));
		} else {
			/** @type {BuildMeta} */
			(module.buildMeta).exportsType = "default";
		}

		return state;
	}
}

module.exports = AssetSourceParser;
