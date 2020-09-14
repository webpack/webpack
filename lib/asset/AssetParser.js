/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Yuta Hiroto @hiroppy
*/

"use strict";

const Parser = require("../Parser");

/** @typedef {import("../../declarations/plugins/AssetModulesPluginParser").AssetModulesPluginParserOptions} AssetModulesPluginParserOptions */
/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../Parser").PreparsedAst} PreparsedAst */

class AssetParser extends Parser {
	/**
	 * @param {AssetModulesPluginParserOptions["dataUrlCondition"] | boolean} dataUrlCondition condition for inlining as DataUrl
	 */
	constructor(dataUrlCondition) {
		super();
		this.dataUrlCondition = dataUrlCondition;
	}

	/**
	 * @param {string | Buffer | PreparsedAst} source the source to parse
	 * @param {ParserState} state the parser state
	 * @returns {ParserState} the parser state
	 */
	parse(source, state) {
		if (typeof source === "object" && !Buffer.isBuffer(source)) {
			throw new Error("AssetParser doesn't accept preparsed AST");
		}
		state.module.buildInfo.strict = true;
		state.module.buildMeta.exportsType = "default";

		if (typeof this.dataUrlCondition === "function") {
			state.module.buildInfo.dataUrl = this.dataUrlCondition(source, {
				filename: state.module.matchResource || state.module.resource,
				module: state.module
			});
		} else if (typeof this.dataUrlCondition === "boolean") {
			state.module.buildInfo.dataUrl = this.dataUrlCondition;
		} else if (
			this.dataUrlCondition &&
			typeof this.dataUrlCondition === "object"
		) {
			state.module.buildInfo.dataUrl =
				Buffer.byteLength(source) <= this.dataUrlCondition.maxSize;
		} else {
			throw new Error("Unexpected dataUrlCondition type");
		}

		return state;
	}
}

module.exports = AssetParser;
