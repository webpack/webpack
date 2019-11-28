/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const parseJson = require("json-parse-better-errors");
const JsonExportsDependency = require("../dependencies/JsonExportsDependency");

/** @typedef {import("../../declarations/plugins/JsonModulesPluginParser").JsonModulesPluginParserOptions} JsonModulesPluginParserOptions */
/** @typedef {import("../NormalModule").ParserState} ParserState */

class JsonParser {
	/**
	 * @param {JsonModulesPluginParserOptions} options parser options
	 */
	constructor(options) {
		this.options = options || {};
	}

	/**
	 * @param {string} source the source to parse
	 * @param {ParserState} state the parser state
	 * @returns {ParserState} the parser state
	 */
	parse(source, state) {
		let data;

		if (typeof this.options.parse === "function") {
			source = this.options.parse.call(null, source, state.module);

			if (source && typeof source === "object") {
				data = source;
			}
		}

		if (!data) {
			data = parseJson(source[0] === "\ufeff" ? source.slice(1) : source);
		}
		state.module.buildInfo.jsonData = data;
		state.module.buildMeta.exportsType = "default";
		state.module.addDependency(
			new JsonExportsDependency(JsonExportsDependency.getExportsFromData(data))
		);
		return state;
	}
}

module.exports = JsonParser;
