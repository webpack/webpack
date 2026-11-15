/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Yuta Hiroto @hiroppy
*/

"use strict";

const Parser = require("../module/Parser");

/** @import { BuiltAssetModule } from "./AssetModule" */
/** @import { ParserState, PreparsedAst } from "../module/Parser" */

/**
 * @extends {Parser<BuiltAssetModule>}
 */
class AssetSourceParser extends Parser {
	/**
	 * Parses the provided source and updates the parser state.
	 * @param {string | Buffer | PreparsedAst} source the source to parse
	 * @param {ParserState} state the parser state
	 * @returns {ParserState} the parser state
	 */
	parse(source, state) {
		if (typeof source === "object" && !Buffer.isBuffer(source)) {
			throw new Error("AssetSourceParser doesn't accept preparsed AST");
		}
		const { buildInfo, buildMeta } = /** @type {BuiltAssetModule} */ (
			state.module
		);
		buildInfo.strict = true;
		buildMeta.exportsType = "default";
		buildMeta.defaultObject = false;

		return state;
	}
}

module.exports = AssetSourceParser;
