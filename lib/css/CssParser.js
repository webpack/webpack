/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Parser = require("../Parser");
const ConstDependency = require("../dependencies/ConstDependency");
const CssExportDependency = require("../dependencies/CssExportDependency");
const CssImportDependency = require("../dependencies/CssImportDependency");
const CssLocalIdentifierDependency = require("../dependencies/CssLocalIdentifierDependency");
const CssSelfLocalIdentifierDependency = require("../dependencies/CssSelfLocalIdentifierDependency");
const CssUrlDependency = require("../dependencies/CssUrlDependency");
const StaticExportsDependency = require("../dependencies/StaticExportsDependency");
const walkCssTokens = require("./walkCssTokens");

/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../Parser").PreparsedAst} PreparsedAst */

const CC_LEFT_CURLY = "{".charCodeAt(0);
const CC_RIGHT_CURLY = "}".charCodeAt(0);
const CC_COLON = ":".charCodeAt(0);
const CC_SLASH = "/".charCodeAt(0);
const CC_SEMICOLON = ";".charCodeAt(0);

const cssUnescape = str => {
	return str.replace(/\\([0-9a-fA-F]{1,6}[ \t\n\r\f]?|[\s\S])/g, match => {
		if (match.length > 2) {
			return String.fromCharCode(parseInt(match.slice(1).trim(), 16));
		} else {
			return match[1];
		}
	});
};

class LocConverter {
	constructor(input) {
		this._input = input;
		this.line = 1;
		this.column = 0;
		this.pos = 0;
	}

	get(pos) {
		if (this.pos !== pos) {
			if (this.pos < pos) {
				const str = this._input.slice(this.pos, pos);
				let i = str.lastIndexOf("\n");
				if (i === -1) {
					this.column += str.length;
				} else {
					this.column = str.length - i - 1;
					this.line++;
					while (i > 0 && (i = str.lastIndexOf("\n", i - 1)) !== -1)
						this.line++;
				}
			} else {
				let i = this._input.lastIndexOf("\n", this.pos);
				while (i >= pos) {
					this.line--;
					i = i > 0 ? this._input.lastIndexOf("\n", i - 1) : -1;
				}
				this.column = pos - i;
			}
			this.pos = pos;
		}
		return this;
	}
}

const CSS_MODE_TOP_LEVEL = 0;
const CSS_MODE_IN_RULE = 1;
const CSS_MODE_IN_LOCAL_RULE = 2;
const CSS_MODE_AT_IMPORT_EXPECT_URL = 3;
// TODO implement layer and supports for @import
const CSS_MODE_AT_IMPORT_EXPECT_SUPPORTS = 4;
const CSS_MODE_AT_IMPORT_EXPECT_MEDIA = 5;
const CSS_MODE_AT_OTHER = 6;

const explainMode = mode => {
	switch (mode) {
		case CSS_MODE_TOP_LEVEL:
			return "parsing top level css";
		case CSS_MODE_IN_RULE:
			return "parsing css rule content (global)";
		case CSS_MODE_IN_LOCAL_RULE:
			return "parsing css rule content (local)";
		case CSS_MODE_AT_IMPORT_EXPECT_URL:
			return "parsing @import (expecting url)";
		case CSS_MODE_AT_IMPORT_EXPECT_SUPPORTS:
			return "parsing @import (expecting optionally supports or media query)";
		case CSS_MODE_AT_IMPORT_EXPECT_MEDIA:
			return "parsing @import (expecting optionally media query)";
		case CSS_MODE_AT_OTHER:
			return "parsing at-rule";
		default:
			return mode;
	}
};

class CssParser extends Parser {
	constructor({
		allowPseudoBlocks = true,
		allowModeSwitch = true,
		defaultMode = "global"
	} = {}) {
		super();
		this.allowPseudoBlocks = allowPseudoBlocks;
		this.allowModeSwitch = allowModeSwitch;
		this.defaultMode = defaultMode;
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

		const declaredCssVariables = new Set();

		const locConverter = new LocConverter(source);
		let mode = CSS_MODE_TOP_LEVEL;
		let modePos = 0;
		let modeNestingLevel = 0;
		let modeData = undefined;
		let singleClassSelector = undefined;
		let lastIdentifier = undefined;
		const modeStack = [];
		let awaitRightParenthesis = false;
		const isTopLevelLocal = () =>
			modeData === "local" ||
			(this.defaultMode === "local" && modeData === undefined);
		const eatWhiteLine = (input, pos) => {
			for (;;) {
				const cc = input.charCodeAt(pos);
				if (cc === 32 || cc === 9) {
					pos++;
					continue;
				}
				if (cc === 10) pos++;
				break;
			}
			return pos;
		};
		const eatUntil = chars => {
			const charCodes = Array.from({ length: chars.length }, (_, i) =>
				chars.charCodeAt(i)
			);
			const arr = Array.from(
				{ length: charCodes.reduce((a, b) => Math.max(a, b), 0) + 1 },
				() => false
			);
			charCodes.forEach(cc => (arr[cc] = true));
			return (input, pos) => {
				for (;;) {
					const cc = input.charCodeAt(pos);
					if (cc < arr.length && arr[cc]) {
						return pos;
					}
					pos++;
					if (pos === input.length) return pos;
				}
			};
		};
		const eatText = (input, pos, eater) => {
			let text = "";
			for (;;) {
				if (input.charCodeAt(pos) === CC_SLASH) {
					const newPos = walkCssTokens.eatComments(input, pos);
					if (pos !== newPos) {
						pos = newPos;
						if (pos === input.length) break;
					} else {
						text += "/";
						pos++;
						if (pos === input.length) break;
					}
				}
				const newPos = eater(input, pos);
				if (pos !== newPos) {
					text += input.slice(pos, newPos);
					pos = newPos;
				} else {
					break;
				}
				if (pos === input.length) break;
			}
			return [pos, text.trimEnd()];
		};
		const eatExportName = eatUntil(":};/");
		const eatExportValue = eatUntil("};/");
		const parseExports = (input, pos) => {
			pos = walkCssTokens.eatWhitespaceAndComments(input, pos);
			const cc = input.charCodeAt(pos);
			if (cc !== CC_LEFT_CURLY)
				throw new Error(
					`Unexpected ${input[pos]} at ${pos} during parsing of ':export' (expected '{')`
				);
			pos++;
			pos = walkCssTokens.eatWhitespaceAndComments(input, pos);
			for (;;) {
				if (input.charCodeAt(pos) === CC_RIGHT_CURLY) break;
				pos = walkCssTokens.eatWhitespaceAndComments(input, pos);
				if (pos === input.length) return pos;
				let start = pos;
				let name;
				[pos, name] = eatText(input, pos, eatExportName);
				if (pos === input.length) return pos;
				if (input.charCodeAt(pos) !== CC_COLON) {
					throw new Error(
						`Unexpected ${input[pos]} at ${pos} during parsing of export name in ':export' (expected ':')`
					);
				}
				pos++;
				if (pos === input.length) return pos;
				pos = walkCssTokens.eatWhitespaceAndComments(input, pos);
				if (pos === input.length) return pos;
				let value;
				[pos, value] = eatText(input, pos, eatExportValue);
				if (pos === input.length) return pos;
				const cc = input.charCodeAt(pos);
				if (cc === CC_SEMICOLON) {
					pos++;
					if (pos === input.length) return pos;
					pos = walkCssTokens.eatWhitespaceAndComments(input, pos);
					if (pos === input.length) return pos;
				} else if (cc !== CC_RIGHT_CURLY) {
					throw new Error(
						`Unexpected ${input[pos]} at ${pos} during parsing of export value in ':export' (expected ';' or '}')`
					);
				}
				const dep = new CssExportDependency(name, value);
				const { line: sl, column: sc } = locConverter.get(start);
				const { line: el, column: ec } = locConverter.get(pos);
				dep.setLoc(sl, sc, el, ec);
				module.addDependency(dep);
			}
			pos++;
			if (pos === input.length) return pos;
			pos = eatWhiteLine(input, pos);
			return pos;
		};
		const eatPropertyName = eatUntil(":{};");
		const processLocalDeclaration = (input, pos) => {
			modeData = undefined;
			const start = pos;
			pos = walkCssTokens.eatWhitespaceAndComments(input, pos);
			const propertyNameStart = pos;
			const [propertyNameEnd, propertyName] = eatText(
				input,
				pos,
				eatPropertyName
			);
			if (input.charCodeAt(propertyNameEnd) !== CC_COLON) return start;
			pos = propertyNameEnd + 1;
			if (propertyName.startsWith("--")) {
				// CSS Variable
				const { line: sl, column: sc } = locConverter.get(propertyNameStart);
				const { line: el, column: ec } = locConverter.get(propertyNameEnd);
				const name = propertyName.slice(2);
				const dep = new CssLocalIdentifierDependency(
					name,
					[propertyNameStart, propertyNameEnd],
					"--"
				);
				dep.setLoc(sl, sc, el, ec);
				module.addDependency(dep);
				declaredCssVariables.add(name);
			} else if (
				propertyName === "animation-name" ||
				propertyName === "animation"
			) {
				modeData = "animation";
				lastIdentifier = undefined;
			}
			return pos;
		};
		const processDeclarationValueDone = (input, pos) => {
			if (modeData === "animation" && lastIdentifier) {
				const { line: sl, column: sc } = locConverter.get(lastIdentifier[0]);
				const { line: el, column: ec } = locConverter.get(lastIdentifier[1]);
				const name = input.slice(lastIdentifier[0], lastIdentifier[1]);
				const dep = new CssSelfLocalIdentifierDependency(name, lastIdentifier);
				dep.setLoc(sl, sc, el, ec);
				module.addDependency(dep);
			}
		};
		const eatAtRuleNested = eatUntil("{};/");
		const eatKeyframes = eatUntil("{};/");
		const eatNameInVar = eatUntil(",)};/");
		walkCssTokens(source, {
			isSelector: () => {
				return mode !== CSS_MODE_IN_RULE && mode !== CSS_MODE_IN_LOCAL_RULE;
			},
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
						const dep = new CssUrlDependency(value, [start, end], "url");
						const { line: sl, column: sc } = locConverter.get(start);
						const { line: el, column: ec } = locConverter.get(end);
						dep.setLoc(sl, sc, el, ec);
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
				if (name === "@namespace") {
					throw new Error("@namespace is not supported in bundled CSS");
				}
				if (name === "@import") {
					if (mode !== CSS_MODE_TOP_LEVEL) {
						throw new Error(
							`Unexpected @import at ${start} during ${explainMode(mode)}`
						);
					}
					mode = CSS_MODE_AT_IMPORT_EXPECT_URL;
					modePos = end;
					modeData = {
						start: start,
						url: undefined,
						supports: undefined
					};
				}
				if (name === "@keyframes") {
					let pos = end;
					pos = walkCssTokens.eatWhitespaceAndComments(input, pos);
					if (pos === input.length) return pos;
					const [newPos, name] = eatText(input, pos, eatKeyframes);
					const { line: sl, column: sc } = locConverter.get(pos);
					const { line: el, column: ec } = locConverter.get(newPos);
					const dep = new CssLocalIdentifierDependency(name, [pos, newPos]);
					dep.setLoc(sl, sc, el, ec);
					module.addDependency(dep);
					pos = newPos;
					if (pos === input.length) return pos;
					if (input.charCodeAt(pos) !== CC_LEFT_CURLY) {
						throw new Error(
							`Unexpected ${input[pos]} at ${pos} during parsing of @keyframes (expected '{')`
						);
					}
					mode = CSS_MODE_IN_LOCAL_RULE;
					modeNestingLevel = 1;
					return pos + 1;
				}
				if (name === "@media" || name === "@supports") {
					let pos = end;
					const [newPos] = eatText(input, pos, eatAtRuleNested);
					pos = newPos;
					if (pos === input.length) return pos;
					if (input.charCodeAt(pos) !== CC_LEFT_CURLY) {
						throw new Error(
							`Unexpected ${input[pos]} at ${pos} during parsing of @media or @supports (expected '{')`
						);
					}
					return pos + 1;
				}
				return end;
			},
			semicolon: (input, start, end) => {
				switch (mode) {
					case CSS_MODE_AT_IMPORT_EXPECT_URL:
						throw new Error(`Expected URL for @import at ${start}`);
					case CSS_MODE_AT_IMPORT_EXPECT_MEDIA:
					case CSS_MODE_AT_IMPORT_EXPECT_SUPPORTS: {
						const { line: sl, column: sc } = locConverter.get(modeData.start);
						const { line: el, column: ec } = locConverter.get(end);
						end = eatWhiteLine(input, end);
						const media = input.slice(modePos, start).trim();
						const dep = new CssImportDependency(
							modeData.url,
							[modeData.start, end],
							modeData.supports,
							media
						);
						dep.setLoc(sl, sc, el, ec);
						module.addDependency(dep);
						break;
					}
					case CSS_MODE_IN_LOCAL_RULE: {
						processDeclarationValueDone(input, start);
						return processLocalDeclaration(input, end);
					}
					case CSS_MODE_IN_RULE: {
						return end;
					}
				}
				mode = CSS_MODE_TOP_LEVEL;
				modeData = undefined;
				singleClassSelector = undefined;
				return end;
			},
			leftCurlyBracket: (input, start, end) => {
				switch (mode) {
					case CSS_MODE_TOP_LEVEL:
						mode = isTopLevelLocal()
							? CSS_MODE_IN_LOCAL_RULE
							: CSS_MODE_IN_RULE;
						modeNestingLevel = 1;
						if (mode === CSS_MODE_IN_LOCAL_RULE)
							return processLocalDeclaration(input, end);
						break;
					case CSS_MODE_IN_RULE:
					case CSS_MODE_IN_LOCAL_RULE:
						modeNestingLevel++;
						break;
				}
				return end;
			},
			rightCurlyBracket: (input, start, end) => {
				switch (mode) {
					case CSS_MODE_IN_LOCAL_RULE:
						processDeclarationValueDone(input, start);
					/* falls through */
					case CSS_MODE_IN_RULE:
						if (--modeNestingLevel === 0) {
							mode = CSS_MODE_TOP_LEVEL;
							modeData = undefined;
							singleClassSelector = undefined;
						}
						break;
				}
				return end;
			},
			id: (input, start, end) => {
				singleClassSelector = false;
				switch (mode) {
					case CSS_MODE_TOP_LEVEL:
						if (isTopLevelLocal()) {
							const name = input.slice(start + 1, end);
							const dep = new CssLocalIdentifierDependency(name, [
								start + 1,
								end
							]);
							const { line: sl, column: sc } = locConverter.get(start);
							const { line: el, column: ec } = locConverter.get(end);
							dep.setLoc(sl, sc, el, ec);
							module.addDependency(dep);
						}
						break;
				}
				return end;
			},
			identifier: (input, start, end) => {
				singleClassSelector = false;
				switch (mode) {
					case CSS_MODE_IN_LOCAL_RULE:
						if (modeData === "animation") {
							lastIdentifier = [start, end];
						}
						break;
				}
				return end;
			},
			class: (input, start, end) => {
				switch (mode) {
					case CSS_MODE_TOP_LEVEL: {
						if (isTopLevelLocal()) {
							const name = input.slice(start + 1, end);
							const dep = new CssLocalIdentifierDependency(name, [
								start + 1,
								end
							]);
							const { line: sl, column: sc } = locConverter.get(start);
							const { line: el, column: ec } = locConverter.get(end);
							dep.setLoc(sl, sc, el, ec);
							module.addDependency(dep);
							if (singleClassSelector === undefined) singleClassSelector = name;
						} else {
							singleClassSelector = false;
						}
						break;
					}
				}
				return end;
			},
			leftParenthesis: (input, start, end) => {
				switch (mode) {
					case CSS_MODE_TOP_LEVEL: {
						modeStack.push(false);
						break;
					}
				}
				return end;
			},
			rightParenthesis: (input, start, end) => {
				switch (mode) {
					case CSS_MODE_TOP_LEVEL: {
						if (awaitRightParenthesis) {
							awaitRightParenthesis = false;
						}
						const newModeData = modeStack.pop();
						if (newModeData !== false) {
							modeData = newModeData;
							const dep = new ConstDependency("", [start, end]);
							module.addPresentationalDependency(dep);
						}
						break;
					}
				}
				return end;
			},
			pseudoClass: (input, start, end) => {
				singleClassSelector = false;
				switch (mode) {
					case CSS_MODE_TOP_LEVEL: {
						const name = input.slice(start, end);
						if (this.allowModeSwitch && name === ":global") {
							modeData = "global";
							const dep = new ConstDependency("", [start, end]);
							module.addPresentationalDependency(dep);
						} else if (this.allowModeSwitch && name === ":local") {
							modeData = "local";
							const dep = new ConstDependency("", [start, end]);
							module.addPresentationalDependency(dep);
						} else if (this.allowPseudoBlocks && name === ":export") {
							const pos = parseExports(input, end);
							const dep = new ConstDependency("", [start, pos]);
							module.addPresentationalDependency(dep);
							return pos;
						}
						break;
					}
				}
				return end;
			},
			pseudoFunction: (input, start, end) => {
				switch (mode) {
					case CSS_MODE_TOP_LEVEL: {
						const name = input.slice(start, end - 1);
						if (this.allowModeSwitch && name === ":global") {
							modeStack.push(modeData);
							modeData = "global";
							const dep = new ConstDependency("", [start, end]);
							module.addPresentationalDependency(dep);
						} else if (this.allowModeSwitch && name === ":local") {
							modeStack.push(modeData);
							modeData = "local";
							const dep = new ConstDependency("", [start, end]);
							module.addPresentationalDependency(dep);
						} else {
							awaitRightParenthesis = true;
							modeStack.push(false);
						}
						break;
					}
				}
				return end;
			},
			function: (input, start, end) => {
				switch (mode) {
					case CSS_MODE_IN_LOCAL_RULE: {
						const name = input.slice(start, end - 1);
						if (name === "var") {
							let pos = walkCssTokens.eatWhitespaceAndComments(input, end);
							if (pos === input.length) return pos;
							const [newPos, name] = eatText(input, pos, eatNameInVar);
							if (!name.startsWith("--")) return end;
							const { line: sl, column: sc } = locConverter.get(pos);
							const { line: el, column: ec } = locConverter.get(newPos);
							const dep = new CssSelfLocalIdentifierDependency(
								name.slice(2),
								[pos, newPos],
								"--",
								declaredCssVariables
							);
							dep.setLoc(sl, sc, el, ec);
							module.addDependency(dep);
							return newPos;
						}
						break;
					}
				}
				return end;
			},
			comma: (input, start, end) => {
				switch (mode) {
					case CSS_MODE_TOP_LEVEL:
						if (!awaitRightParenthesis) {
							modeData = undefined;
							modeStack.length = 0;
						}
						break;
					case CSS_MODE_IN_LOCAL_RULE:
						processDeclarationValueDone(input, start);
						break;
				}
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
