/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ModuleDependencyWarning = require("../ModuleDependencyWarning");
const Parser = require("../Parser");
const WebpackError = require("../WebpackError");
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

// https://www.w3.org/TR/css-syntax-3/#newline
// We don't have `preprocessing` stage, so we need specify all of them
const STRING_MULTILINE = /\\[\n\r\f]/g;
// https://www.w3.org/TR/css-syntax-3/#whitespace
const TRIM_WHITE_SPACES = /(^[ \t\n\r\f]*|[ \t\n\r\f]*$)/g;
const UNESCAPE = /\\([0-9a-fA-F]{1,6}[ \t\n\r\f]?|[\s\S])/g;
const IMAGE_SET_FUNCTION = /^(-\w+-)?image-set$/i;
const OPTIONALLY_VENDOR_PREFIXED_KEYFRAMES_AT_RULE = /^@(-\w+-)?keyframes$/;
const OPTIONALLY_VENDOR_PREFIXED_ANIMATION_PROPERTY =
	/^(-\w+-)?animation(-name)?$/i;

/**
 * @param {string} str url string
 * @param {boolean} isString is url wrapped in quotes
 * @returns {string} normalized url
 */
const normalizeUrl = (str, isString) => {
	// Remove extra spaces and newlines:
	// `url("im\
	// g.png")`
	if (isString) {
		str = str.replace(STRING_MULTILINE, "");
	}

	str = str
		// Remove unnecessary spaces from `url("   img.png	 ")`
		.replace(TRIM_WHITE_SPACES, "")
		// Unescape
		.replace(UNESCAPE, match => {
			if (match.length > 2) {
				return String.fromCharCode(parseInt(match.slice(1).trim(), 16));
			} else {
				return match[1];
			}
		});

	if (/^data:/i.test(str)) {
		return str;
	}

	if (str.includes("%")) {
		// Convert `url('%2E/img.png')` -> `url('./img.png')`
		try {
			str = decodeURIComponent(str);
		} catch (error) {
			// Ignore
		}
	}

	return str;
};

class LocConverter {
	/**
	 * @param {string} input input
	 */
	constructor(input) {
		this._input = input;
		this.line = 1;
		this.column = 0;
		this.pos = 0;
	}

	/**
	 * @param {number} pos position
	 * @returns {LocConverter} location converter
	 */
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
const CSS_MODE_AT_IMPORT_EXPECT_LAYER_OR_SUPPORTS_OR_MEDIA = 4;
const CSS_MODE_AT_IMPORT_INVALID = 5;
const CSS_MODE_AT_NAMESPACE_INVALID = 6;

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
	 * @param {ParserState} state parser state
	 * @param {string} message warning message
	 * @param {LocConverter} locConverter location converter
	 * @param {number} start start offset
	 * @param {number} end end offset
	 */
	_emitWarning(state, message, locConverter, start, end) {
		const { line: sl, column: sc } = locConverter.get(start);
		const { line: el, column: ec } = locConverter.get(end);

		state.current.addWarning(
			new ModuleDependencyWarning(state.module, new WebpackError(message), {
				start: { line: sl, column: sc },
				end: { line: el, column: ec }
			})
		);
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
		/** @type {number} */
		let mode = CSS_MODE_TOP_LEVEL;
		/** @type {number} */
		let modeNestingLevel = 0;
		/** @type {boolean} */
		let allowImportAtRule = true;
		let modeData = undefined;
		/** @type {string | boolean | undefined} */
		let singleClassSelector = undefined;
		/** @type {[number, number] | undefined} */
		let lastIdentifier = undefined;
		/** @type {boolean} */
		let awaitRightParenthesis = false;
		/** @type [string, number, number][] */
		let balanced = [];
		const modeStack = [];

		const isTopLevelLocal = () =>
			modeData === "local" ||
			(this.defaultMode === "local" && modeData === undefined);
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
			if (cc !== CC_LEFT_CURLY) {
				this._emitWarning(
					state,
					`Unexpected '${input[pos]}' at ${pos} during parsing of ':export' (expected '{')`,
					locConverter,
					pos,
					pos
				);
				return pos;
			}
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
					this._emitWarning(
						state,
						`Unexpected '${input[pos]}' at ${pos} during parsing of export name in ':export' (expected ':')`,
						locConverter,
						start,
						pos
					);
					return pos;
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
					this._emitWarning(
						state,
						`Unexpected '${input[pos]}' at ${pos} during parsing of export value in ':export' (expected ';' or '}')`,
						locConverter,
						start,
						pos
					);
					return pos;
				}
				const dep = new CssExportDependency(name, value);
				const { line: sl, column: sc } = locConverter.get(start);
				const { line: el, column: ec } = locConverter.get(pos);
				dep.setLoc(sl, sc, el, ec);
				module.addDependency(dep);
			}
			pos++;
			if (pos === input.length) return pos;
			pos = walkCssTokens.eatWhiteLine(input, pos);
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
				OPTIONALLY_VENDOR_PREFIXED_ANIMATION_PROPERTY.test(propertyName)
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
				return (
					mode !== CSS_MODE_IN_RULE &&
					mode !== CSS_MODE_IN_LOCAL_RULE &&
					mode !== CSS_MODE_AT_IMPORT_EXPECT_URL &&
					mode !== CSS_MODE_AT_IMPORT_EXPECT_LAYER_OR_SUPPORTS_OR_MEDIA &&
					mode !== CSS_MODE_AT_IMPORT_INVALID &&
					mode !== CSS_MODE_AT_NAMESPACE_INVALID
				);
			},
			url: (input, start, end, contentStart, contentEnd) => {
				let value = normalizeUrl(input.slice(contentStart, contentEnd), false);
				switch (mode) {
					case CSS_MODE_AT_IMPORT_EXPECT_URL: {
						modeData.url = value;
						modeData.lastPos = end;
						mode = CSS_MODE_AT_IMPORT_EXPECT_LAYER_OR_SUPPORTS_OR_MEDIA;
						break;
					}
					// Do not parse URLs in `supports(...)`
					case CSS_MODE_AT_IMPORT_EXPECT_LAYER_OR_SUPPORTS_OR_MEDIA: {
						break;
					}
					// Do not parse URLs in import between rules
					case CSS_MODE_AT_NAMESPACE_INVALID:
					case CSS_MODE_AT_IMPORT_INVALID: {
						break;
					}
					default: {
						// Ignore `url()`, `url('')` and `url("")`, they are valid by spec
						if (value.length === 0) {
							break;
						}

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
						modeData.url = normalizeUrl(input.slice(start + 1, end - 1), true);
						modeData.lastPos = end;
						const insideURLFunction =
							balanced[balanced.length - 1] &&
							balanced[balanced.length - 1][0] === "url";

						if (!insideURLFunction) {
							mode = CSS_MODE_AT_IMPORT_EXPECT_LAYER_OR_SUPPORTS_OR_MEDIA;
						}
						break;
					}
					// Do not parse URLs in `supports(...)`
					case CSS_MODE_AT_IMPORT_EXPECT_LAYER_OR_SUPPORTS_OR_MEDIA: {
						break;
					}
					default: {
						// TODO move escaped parsing to tokenizer
						const last = balanced[balanced.length - 1];

						if (
							last &&
							(last[0].replace(/\\/g, "").toLowerCase() === "url" ||
								IMAGE_SET_FUNCTION.test(last[0].replace(/\\/g, "")))
						) {
							let value = normalizeUrl(input.slice(start + 1, end - 1), true);

							// Ignore `url()`, `url('')` and `url("")`, they are valid by spec
							if (value.length === 0) {
								break;
							}

							const isUrl = last[0].replace(/\\/g, "").toLowerCase() === "url";
							const dep = new CssUrlDependency(
								value,
								[start, end],
								isUrl ? "string" : "url"
							);
							const { line: sl, column: sc } = locConverter.get(start);
							const { line: el, column: ec } = locConverter.get(end);
							dep.setLoc(sl, sc, el, ec);
							module.addDependency(dep);
							module.addCodeGenerationDependency(dep);
						}
					}
				}
				return end;
			},
			atKeyword: (input, start, end) => {
				const name = input.slice(start, end).toLowerCase();
				if (name === "@namespace") {
					mode = CSS_MODE_AT_NAMESPACE_INVALID;
					this._emitWarning(
						state,
						"@namespace is not supported in bundled CSS",
						locConverter,
						start,
						end
					);
					return end;
				} else if (name === "@import") {
					if (!allowImportAtRule) {
						mode = CSS_MODE_AT_IMPORT_INVALID;
						this._emitWarning(
							state,
							"Any @import rules must precede all other rules",
							locConverter,
							start,
							end
						);
						return end;
					}

					mode = CSS_MODE_AT_IMPORT_EXPECT_URL;
					modeData = {
						atRuleStart: start,
						lastPos: end,
						url: undefined,
						layer: undefined,
						supports: undefined,
						media: undefined
					};
				} else if (
					isTopLevelLocal() &&
					OPTIONALLY_VENDOR_PREFIXED_KEYFRAMES_AT_RULE.test(name)
				) {
					let pos = end;
					pos = walkCssTokens.eatWhitespaceAndComments(input, pos);
					if (pos === input.length) return pos;
					const [newPos, name] = eatText(input, pos, eatKeyframes);
					if (newPos === input.length) return newPos;
					if (input.charCodeAt(newPos) !== CC_LEFT_CURLY) {
						this._emitWarning(
							state,
							`Unexpected '${input[newPos]}' at ${newPos} during parsing of @keyframes (expected '{')`,
							locConverter,
							start,
							end
						);

						return newPos;
					}
					const { line: sl, column: sc } = locConverter.get(pos);
					const { line: el, column: ec } = locConverter.get(newPos);
					const dep = new CssLocalIdentifierDependency(name, [pos, newPos]);
					dep.setLoc(sl, sc, el, ec);
					module.addDependency(dep);
					pos = newPos;
					mode = CSS_MODE_IN_LOCAL_RULE;
					modeNestingLevel = 1;
					return pos + 1;
				} else if (name === "@media" || name === "@supports") {
					// TODO handle nested CSS syntax
					let pos = end;
					const [newPos] = eatText(input, pos, eatAtRuleNested);
					pos = newPos;
					if (pos === input.length) return pos;
					if (input.charCodeAt(pos) !== CC_LEFT_CURLY) {
						this._emitWarning(
							state,
							`Unexpected ${input[pos]} at ${pos} during parsing of @media or @supports (expected '{')`,
							locConverter,
							start,
							pos
						);
						return pos;
					}
					return pos + 1;
				}
				return end;
			},
			semicolon: (input, start, end) => {
				switch (mode) {
					case CSS_MODE_AT_IMPORT_EXPECT_URL: {
						this._emitWarning(
							state,
							`Expected URL for @import at ${start}`,
							locConverter,
							start,
							end
						);
						return end;
					}
					case CSS_MODE_AT_IMPORT_EXPECT_LAYER_OR_SUPPORTS_OR_MEDIA: {
						if (modeData.url === undefined) {
							this._emitWarning(
								state,
								`Expected URL for @import at ${modeData.atRuleStart}`,
								locConverter,
								modeData.atRuleStart,
								modeData.lastPos
							);
							return end;
						}
						const semicolonPos = end;
						end = walkCssTokens.eatWhiteLine(input, end + 1);
						const { line: sl, column: sc } = locConverter.get(
							modeData.atRuleStart
						);
						const { line: el, column: ec } = locConverter.get(end);
						const pos = walkCssTokens.eatWhitespaceAndComments(
							input,
							modeData.lastPos
						);
						// Prevent to consider comments as a part of media query
						if (pos !== semicolonPos - 1) {
							modeData.media = input
								.slice(modeData.lastPos, semicolonPos - 1)
								.trim();
						}
						const dep = new CssImportDependency(
							modeData.url.trim(),
							[modeData.start, end],
							modeData.layer,
							modeData.supports,
							modeData.media && modeData.media.length > 0
								? modeData.media
								: undefined
						);
						dep.setLoc(sl, sc, el, ec);
						module.addDependency(dep);
						modeData = undefined;
						mode = CSS_MODE_TOP_LEVEL;
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
						allowImportAtRule = false;
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
					case CSS_MODE_AT_IMPORT_EXPECT_LAYER_OR_SUPPORTS_OR_MEDIA: {
						if (input.slice(start, end).toLowerCase() === "layer") {
							modeData.layer = "";
							modeData.lastPos = end;
						}
						break;
					}
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
			function: (input, start, end) => {
				let name = input.slice(start, end - 1);

				balanced.push([name, start, end]);

				switch (mode) {
					case CSS_MODE_IN_LOCAL_RULE: {
						name = name.toLowerCase();

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
			leftParenthesis: (input, start, end) => {
				balanced.push(["(", start, end]);

				switch (mode) {
					case CSS_MODE_TOP_LEVEL: {
						modeStack.push(false);
						break;
					}
				}
				return end;
			},
			rightParenthesis: (input, start, end) => {
				const last = balanced[balanced.length - 1];

				balanced.pop();

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
					case CSS_MODE_AT_IMPORT_EXPECT_URL: {
						if (last && last[0] === "url") {
							modeData.lastPos = end;
							mode = CSS_MODE_AT_IMPORT_EXPECT_LAYER_OR_SUPPORTS_OR_MEDIA;
						}
						break;
					}
					case CSS_MODE_AT_IMPORT_EXPECT_LAYER_OR_SUPPORTS_OR_MEDIA: {
						if (last && last[0].toLowerCase() === "layer") {
							modeData.layer = input.slice(last[2], end - 1).trim();
							modeData.lastPos = end;
						} else if (last && last[0].toLowerCase() === "supports") {
							modeData.supports = input.slice(last[2], end - 1).trim();
							modeData.lastPos = end;
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
						const name = input.slice(start, end).toLowerCase();
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
				let name = input.slice(start, end - 1);

				balanced.push([name, start, end]);

				switch (mode) {
					case CSS_MODE_TOP_LEVEL: {
						name = name.toLowerCase();

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
