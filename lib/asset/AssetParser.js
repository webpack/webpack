/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Yuta Hiroto @hiroppy
*/

"use strict";

const Parser = require("../Parser");
const createHash = require("../util/createHash");
const { makePathsRelative } = require("../util/identifier");
const AssetGenerator = require("./AssetGenerator");

/** @typedef {import("../../declarations/WebpackOptions").AssetParserOptions} AssetParserOptions */
/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../Parser").PreparsedAst} PreparsedAst */

class AssetParser extends Parser {
	/**
	 * @param {AssetParserOptions["dataUrlCondition"] | boolean} dataUrlCondition condition for inlining as DataUrl
	 * @param {string=} filename override for output.assetModuleFilename
	 */
	constructor(dataUrlCondition, filename) {
		super();
		this.dataUrlCondition = dataUrlCondition;
		this.filename = filename;
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
		const { module, compilation } = state;
		module.buildInfo.strict = true;
		module.buildMeta.exportsType = "default";

		if (typeof this.dataUrlCondition === "function") {
			module.buildInfo.dataUrl = this.dataUrlCondition(source, {
				filename: module.matchResource || module.resource,
				module: module
			});
		} else if (typeof this.dataUrlCondition === "boolean") {
			module.buildInfo.dataUrl = this.dataUrlCondition;
		} else if (
			this.dataUrlCondition &&
			typeof this.dataUrlCondition === "object"
		) {
			module.buildInfo.dataUrl =
				Buffer.byteLength(source) <= this.dataUrlCondition.maxSize;
		} else {
			throw new Error("Unexpected dataUrlCondition type");
		}

		if (!module.buildInfo.dataUrl) {
			const outputOptions = compilation.outputOptions;
			const assetModuleFilename =
				this.filename ||
				// TODO webpack 6 remove
				(module.generator instanceof AssetGenerator &&
					module.generator.filename) ||
				outputOptions.assetModuleFilename;
			const hash = createHash(outputOptions.hashFunction);
			if (outputOptions.hashSalt) {
				hash.update(outputOptions.hashSalt);
			}
			hash.update(source);
			const fullHash = /** @type {string} */ (hash.digest(
				outputOptions.hashDigest
			));
			const contentHash = fullHash.slice(0, outputOptions.hashDigestLength);
			module.buildInfo.fullContentHash = fullHash;
			const sourceFilename = makePathsRelative(
				compilation.compiler.context,
				module.matchResource || module.resource,
				compilation.compiler.root
			).replace(/^\.\//, "");
			const { path: filename, info } = compilation.getAssetPathWithInfo(
				assetModuleFilename,
				{
					module,
					filename: sourceFilename,
					contentHash
				}
			);
			module.buildInfo.filename = filename;
			module.buildInfo.assetInfo = {
				sourceFilename,
				...info
			};
		}

		return state;
	}
}

module.exports = AssetParser;
