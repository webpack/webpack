/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const parseJson = require("json-parse-better-errors");
const Parser = require("../Parser");
const JsonExportsDependency = require("../dependencies/JsonExportsDependency");

/** @typedef {import("../../declarations/plugins/JsonModulesPluginParser").JsonModulesPluginParserOptions} JsonModulesPluginParserOptions */
/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../Parser").PreparsedAst} PreparsedAst */

class JsonParser extends Parser {
	/**
	 * @param {JsonModulesPluginParserOptions} options parser options
	 */
	constructor(options) {
		super();
		this.options = options || {};
	}

	/**
	 * @param {string | Buffer | PreparsedAst} source the source to parse
	 * @param {ParserState} state the parser state
	 * @returns {ParserState} the parser state
	 */
	parse(source, state) {
		if (Buffer.isBuffer(source)) {
			source = source.toString("utf-8");
		}

		let data;

		if (typeof this.options.parse === "function") {
			source = this.options.parse.call(null, source);

			if (source && typeof source === "object") {
				data = source;
			}
		}

		if (!data) {
			data =
				typeof source === "object"
					? source
					: parseJson(source[0] === "\ufeff" ? source.slice(1) : source);
		}

		state.module.buildInfo.jsonData = data;
		state.module.buildInfo.strict = true;
		state.module.buildMeta.exportsType = "default";
		state.module.addDependency(
			new JsonExportsDependency(JsonExportsDependency.getExportsFromData(data))
		);
		return state;
	}
}

module.exports = JsonParser;
