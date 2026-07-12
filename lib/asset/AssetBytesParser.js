/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

import Parser from "../Parser.js";
/** @typedef {import("../Module.js").BuildInfo} BuildInfo */
/** @typedef {import("../Module.js").BuildMeta} BuildMeta */
/** @typedef {import("../Parser.js").ParserState} ParserState */
/** @typedef {import("../Parser.js").PreparsedAst} PreparsedAst */

class AssetBytesParser extends Parser {
	/**
	 * Parses the provided source and updates the parser state.
	 * @param {string | Buffer | PreparsedAst} source the source to parse
	 * @param {ParserState} state the parser state
	 * @returns {ParserState} the parser state
	 */
	parse(source, state) {
		if (typeof source === "object" && !Buffer.isBuffer(source)) {
			throw new Error("AssetBytesParser doesn't accept preparsed AST");
		}
		const { module } = state;
		/** @type {BuildInfo} */
		(module.buildInfo).strict = true;
		/** @type {BuildMeta} */
		(module.buildMeta).exportsType = "default";
		/** @type {BuildMeta} */
		(state.module.buildMeta).defaultObject = false;

		return state;
	}
}

export default AssetBytesParser;

export { AssetBytesParser as "module.exports" };
