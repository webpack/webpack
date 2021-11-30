/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Parser = require("../Parser");
const CssUrlDependency = require("../dependencies/CssUrlDependency");
const StaticExportsDependency = require("../dependencies/StaticExportsDependency");
const walkCssTokens = require("./walkCssTokens");

/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../Parser").PreparsedAst} PreparsedAst */

const cssUnescape = str => {
	return str.replace(/\\([0-9a-fA-F]{1,6}[ \t\n\r\f]?|[\s\S])/g, match => {
		if (match.length > 2) {
			return String.fromCharCode(parseInt(match.slice(1).trim(), 16));
		} else {
			return match[1];
		}
	});
};

class CssParser extends Parser {
	constructor() {
		super();
	}

	/**
	 * @param {string | Buffer | PreparsedAst} source the source to parse
	 * @param {ParserState} state the parser state
	 * @returns {ParserState} the parser state
	 */
	parse(source, state) {
		if (Buffer.isBuffer(source)) {
			source = source.toString("utf-8");
		} else if (typeof source === "object") {
			throw new Error("webpackAst is unexpected for the CssParser");
		}
		if (source[0] === "\ufeff") {
			source = source.slice(1);
		}

		const module = state.module;

		walkCssTokens(source, {
			url: (input, start, end, contentStart, contentEnd) => {
				const dep = new CssUrlDependency(
					cssUnescape(input.slice(contentStart, contentEnd)),
					[contentStart, contentEnd]
				);
				// TODO dep.loc should be assigned
				module.addDependency(dep);
				module.addCodeGenerationDependency(dep);
				return end;
			}
		});

		module.buildInfo.strict = true;
		module.buildMeta.exportsType = "default";
		module.buildMeta.defaultObject = false;
		module.addDependency(new StaticExportsDependency(["default"], true));
		return state;
	}
}

module.exports = CssParser;
