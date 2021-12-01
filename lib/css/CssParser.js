/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Parser = require("../Parser");
const CssUrlDependency = require("../dependencies/CssUrlDependency");
const CssImportDependency = require("../dependencies/CssImportDependency");
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

const CSS_MODE_TOP_LEVEL = 0;
const CSS_MODE_IN_RULE = 1;
const CSS_MODE_AT_IMPORT_EXPECT_URL = 2;
const CSS_MODE_AT_IMPORT_EXPECT_SUPPORTS = 3;
const CSS_MODE_AT_IMPORT_EXPECT_MEDIA = 4;
const CSS_MODE_AT_OTHER = 5;

const explainMode = mode => {
	switch (mode) {
		case CSS_MODE_TOP_LEVEL:
			return "parsing top level css";
		case CSS_MODE_IN_RULE:
			return "parsing css rule content";
		case CSS_MODE_AT_IMPORT_EXPECT_URL:
			return "parsing @import (expecting url)";
		case CSS_MODE_AT_IMPORT_EXPECT_SUPPORTS:
			return "parsing @import (expecting optionally supports or media query)";
		case CSS_MODE_AT_IMPORT_EXPECT_MEDIA:
			return "parsing @import (expecting optionally media query)";
		case CSS_MODE_AT_OTHER:
			return "parsing at-rule";
	}
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

		let mode = CSS_MODE_TOP_LEVEL;
		let modePos = 0;
		let modeData = undefined;
		walkCssTokens(source, {
			url: (input, start, end, contentStart, contentEnd) => {
				const value = cssUnescape(input.slice(contentStart, contentEnd));
				switch (mode) {
					case CSS_MODE_AT_IMPORT_EXPECT_URL: {
						modeData.url = value;
						mode = CSS_MODE_AT_IMPORT_EXPECT_SUPPORTS;
						break;
					}
					case CSS_MODE_AT_IMPORT_EXPECT_SUPPORTS:
					case CSS_MODE_AT_IMPORT_EXPECT_MEDIA:
						throw new Error(
							`Unexpected ${input.slice(
								start,
								end
							)} at ${start} during ${explainMode(mode)}`
						);
					default: {
						const dep = new CssUrlDependency(value, [contentStart, contentEnd]);
						// TODO dep.loc should be assigned
						module.addDependency(dep);
						module.addCodeGenerationDependency(dep);
						break;
					}
				}
				return end;
			},
			string: (input, start, end) => {
				switch (mode) {
					case CSS_MODE_AT_IMPORT_EXPECT_URL: {
						modeData.url = cssUnescape(input.slice(start + 1, end - 1));
						mode = CSS_MODE_AT_IMPORT_EXPECT_SUPPORTS;
						break;
					}
				}
				return end;
			},
			atKeyword: (input, start, end) => {
				const name = input.slice(start, end);
				if (mode !== CSS_MODE_TOP_LEVEL) {
					throw new Error(
						`Unexpected ${name} at ${start} during ${explainMode(mode)}`
					);
				}
				if (name === "@namespace") {
					throw new Error("@namespace is not supported in bundled CSS");
				}
				if (name === "@import") {
					mode = CSS_MODE_AT_IMPORT_EXPECT_URL;
					modePos = end;
					modeData = {
						start: start,
						url: undefined,
						supports: undefined
					};
				}
				return end;
			},
			semicolon: (input, start, end) => {
				switch (mode) {
					case CSS_MODE_AT_IMPORT_EXPECT_URL:
						throw new Error(`Expected URL for @import at ${start}`);
					case CSS_MODE_AT_IMPORT_EXPECT_MEDIA:
					case CSS_MODE_AT_IMPORT_EXPECT_SUPPORTS: {
						const media = input.slice(modePos, start).trim();
						const dep = new CssImportDependency(
							modeData.url,
							[modeData.start, end],
							modeData.supports,
							media
						);
						// TODO dep.loc should be assigned
						module.addDependency(dep);
						break;
					}
				}
				mode = undefined;
				modeData = undefined;
				return end;
			}
		});

		module.buildInfo.strict = true;
		module.buildMeta.exportsType = "namespace";
		module.addDependency(new StaticExportsDependency([], true));
		return state;
	}
}

module.exports = CssParser;
