/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ModuleDependencyWarning = require("../ModuleDependencyWarning");
const { CSS_MODULE_TYPE_AUTO } = require("../ModuleTypeConstants");
const Parser = require("../Parser");
const WebpackError = require("../WebpackError");
const ConstDependency = require("../dependencies/ConstDependency");
const CssExportDependency = require("../dependencies/CssExportDependency");
const CssImportDependency = require("../dependencies/CssImportDependency");
const CssLocalIdentifierDependency = require("../dependencies/CssLocalIdentifierDependency");
const CssSelfLocalIdentifierDependency = require("../dependencies/CssSelfLocalIdentifierDependency");
const CssUrlDependency = require("../dependencies/CssUrlDependency");
const StaticExportsDependency = require("../dependencies/StaticExportsDependency");
const { parseResource } = require("../util/identifier");
const walkCssTokens = require("./walkCssTokens");

/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../Parser").PreparsedAst} PreparsedAst */
/** @typedef {[number, number]} Range */

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
const IS_MODULES = /\.module(s)?\.[^.]+$/i;

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
const CSS_MODE_IN_BLOCK = 1;
const CSS_MODE_IN_AT_IMPORT = 2;
const CSS_MODE_AT_IMPORT_INVALID = 3;
const CSS_MODE_AT_NAMESPACE_INVALID = 4;

class CssParser extends Parser {
	constructor({
		allowModeSwitch = true,
		defaultMode = "global",
		namedExports = true
	} = {}) {
		super();
		this.allowModeSwitch = allowModeSwitch;
		this.defaultMode = defaultMode;
		this.namedExports = namedExports;
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

		/** @type {string | undefined} */
		let oldDefaultMode;

		if (
			module.type === CSS_MODULE_TYPE_AUTO &&
			IS_MODULES.test(
				parseResource(module.matchResource || module.resource).path
			)
		) {
			oldDefaultMode = this.defaultMode;

			this.defaultMode = "local";
		}

		const locConverter = new LocConverter(source);
		/** @type {Set<string>}*/
		const declaredCssVariables = new Set();
		/** @type {number} */
		let scope = CSS_MODE_TOP_LEVEL;
		/** @type {number} */
		let blockNestingLevel = 0;
		/** @type {boolean} */
		let allowImportAtRule = true;
		/** @type {"local" | "global" | undefined} */
		let modeData = undefined;
		/** @type {[number, number] | undefined} */
		let lastIdentifier = undefined;
		/** @type [string, number, number][] */
		let balanced = [];
		/** @type {undefined | { start: number, url?: string, urlStart?: number, urlEnd?: number, layer?: string, layerStart?: number, layerEnd?: number, supports?: string, supportsStart?: number, supportsEnd?: number, inSupports?:boolean, media?: string  }} */
		let importData = undefined;
		/** @type {boolean} */
		let inAnimationProperty = false;
		/** @type {boolean} */
		let isNextRulePrelude = true;

		/**
		 * @param {string} input input
		 * @param {number} pos position
		 * @returns {boolean} true, when next is nested syntax
		 */
		const isNextNestedSyntax = (input, pos) => {
			pos = walkCssTokens.eatWhitespaceAndComments(input, pos);

			if (input[pos] === "}") {
				return false;
			}

			// According spec only identifier can be used as a property name
			const isIdentifier = walkCssTokens.isIdentStartCodePoint(
				input.charCodeAt(pos)
			);

			return !isIdentifier;
		};
		/**
		 * @returns {boolean} true, when in local scope
		 */
		const isLocalMode = () =>
			modeData === "local" ||
			(this.defaultMode === "local" && modeData === undefined);
		/**
		 * @param {string} chars characters
		 * @returns {(input: string, pos: number) => number} function to eat characters
		 */
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
		/**
		 * @param {string} input input
		 * @param {number} pos start position
		 * @param {(input: string, pos: number) => number} eater eater
		 * @returns {[number,string]} new position and text
		 */
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
		/**
		 * @param {string} input input
		 * @param {number} pos start position
		 * @returns {number} position after parse
		 */
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
		/**
		 * @param {string} input input
		 * @param {number} pos name start position
		 * @param {number} end name end position
		 * @returns {number} position after handling
		 */
		const processLocalDeclaration = (input, pos, end) => {
			modeData = undefined;
			pos = walkCssTokens.eatWhitespaceAndComments(input, pos);
			const propertyNameStart = pos;
			const [propertyNameEnd, propertyName] = eatText(
				input,
				pos,
				eatPropertyName
			);
			if (input.charCodeAt(propertyNameEnd) !== CC_COLON) return end;
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
				!propertyName.startsWith("--") &&
				OPTIONALLY_VENDOR_PREFIXED_ANIMATION_PROPERTY.test(propertyName)
			) {
				inAnimationProperty = true;
			}
			return pos;
		};
		/**
		 * @param {string} input input
		 */
		const processDeclarationValueDone = input => {
			if (inAnimationProperty && lastIdentifier) {
				const { line: sl, column: sc } = locConverter.get(lastIdentifier[0]);
				const { line: el, column: ec } = locConverter.get(lastIdentifier[1]);
				const name = input.slice(lastIdentifier[0], lastIdentifier[1]);
				const dep = new CssSelfLocalIdentifierDependency(name, lastIdentifier);
				dep.setLoc(sl, sc, el, ec);
				module.addDependency(dep);
				lastIdentifier = undefined;
			}
		};
		const eatKeyframes = eatUntil("{};/");
		const eatNameInVar = eatUntil(",)};/");
		walkCssTokens(source, {
			isSelector: () => {
				return isNextRulePrelude;
			},
			url: (input, start, end, contentStart, contentEnd) => {
				let value = normalizeUrl(input.slice(contentStart, contentEnd), false);

				switch (scope) {
					case CSS_MODE_IN_AT_IMPORT: {
						// Do not parse URLs in `supports(...)`
						if (importData.inSupports) {
							break;
						}

						if (importData.url) {
							this._emitWarning(
								state,
								`Duplicate of 'url(...)' in '${input.slice(
									importData.start,
									end
								)}'`,
								locConverter,
								start,
								end
							);

							break;
						}

						importData.url = value;
						importData.urlStart = start;
						importData.urlEnd = end;
						break;
					}
					// Do not parse URLs in import between rules
					case CSS_MODE_AT_NAMESPACE_INVALID:
					case CSS_MODE_AT_IMPORT_INVALID: {
						break;
					}
					case CSS_MODE_IN_BLOCK: {
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
				switch (scope) {
					case CSS_MODE_IN_AT_IMPORT: {
						const insideURLFunction =
							balanced[balanced.length - 1] &&
							balanced[balanced.length - 1][0] === "url";

						// Do not parse URLs in `supports(...)` and other strings if we already have a URL
						if (
							importData.inSupports ||
							(!insideURLFunction && importData.url)
						) {
							break;
						}

						if (insideURLFunction && importData.url) {
							this._emitWarning(
								state,
								`Duplicate of 'url(...)' in '${input.slice(
									importData.start,
									end
								)}'`,
								locConverter,
								start,
								end
							);

							break;
						}

						importData.url = normalizeUrl(
							input.slice(start + 1, end - 1),
							true
						);

						if (!insideURLFunction) {
							importData.urlStart = start;
							importData.urlEnd = end;
						}

						break;
					}
					case CSS_MODE_IN_BLOCK: {
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
					scope = CSS_MODE_AT_NAMESPACE_INVALID;
					this._emitWarning(
						state,
						"'@namespace' is not supported in bundled CSS",
						locConverter,
						start,
						end
					);
					return end;
				} else if (name === "@import") {
					if (!allowImportAtRule) {
						scope = CSS_MODE_AT_IMPORT_INVALID;
						this._emitWarning(
							state,
							"Any '@import' rules must precede all other rules",
							locConverter,
							start,
							end
						);
						return end;
					}

					scope = CSS_MODE_IN_AT_IMPORT;
					importData = { start };
				} else if (
					this.allowModeSwitch &&
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
					return pos + 1;
				} else if (this.allowModeSwitch && name === "@property") {
					let pos = end;
					pos = walkCssTokens.eatWhitespaceAndComments(input, pos);
					if (pos === input.length) return pos;
					const propertyNameStart = pos;
					const [propertyNameEnd, propertyName] = eatText(
						input,
						pos,
						eatKeyframes
					);
					if (propertyNameEnd === input.length) return propertyNameEnd;
					if (!propertyName.startsWith("--")) return propertyNameEnd;
					if (input.charCodeAt(propertyNameEnd) !== CC_LEFT_CURLY) {
						this._emitWarning(
							state,
							`Unexpected '${input[propertyNameEnd]}' at ${propertyNameEnd} during parsing of @property (expected '{')`,
							locConverter,
							start,
							end
						);

						return propertyNameEnd;
					}
					const { line: sl, column: sc } = locConverter.get(pos);
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
					pos = propertyNameEnd;
					return pos + 1;
				} else if (
					name === "@media" ||
					name === "@supports" ||
					name === "@layer" ||
					name === "@container"
				) {
					modeData = isLocalMode() ? "local" : "global";
					isNextRulePrelude = true;
					return end;
				} else if (this.allowModeSwitch) {
					modeData = "global";
					isNextRulePrelude = false;
				}
				return end;
			},
			semicolon: (input, start, end) => {
				switch (scope) {
					case CSS_MODE_IN_AT_IMPORT: {
						const { start } = importData;

						if (importData.url === undefined) {
							this._emitWarning(
								state,
								`Expected URL in '${input.slice(start, end)}'`,
								locConverter,
								start,
								end
							);
							importData = undefined;
							scope = CSS_MODE_TOP_LEVEL;
							return end;
						}
						if (
							importData.urlStart > importData.layerStart ||
							importData.urlStart > importData.supportsStart
						) {
							this._emitWarning(
								state,
								`An URL in '${input.slice(
									start,
									end
								)}' should be before 'layer(...)' or 'supports(...)'`,
								locConverter,
								start,
								end
							);
							importData = undefined;
							scope = CSS_MODE_TOP_LEVEL;
							return end;
						}
						if (importData.layerStart > importData.supportsStart) {
							this._emitWarning(
								state,
								`The 'layer(...)' in '${input.slice(
									start,
									end
								)}' should be before 'supports(...)'`,
								locConverter,
								start,
								end
							);
							importData = undefined;
							scope = CSS_MODE_TOP_LEVEL;
							return end;
						}

						const semicolonPos = end;
						end = walkCssTokens.eatWhiteLine(input, end + 1);
						const { line: sl, column: sc } = locConverter.get(start);
						const { line: el, column: ec } = locConverter.get(end);
						const lastEnd =
							importData.supportsEnd ||
							importData.layerEnd ||
							importData.urlEnd ||
							start;
						const pos = walkCssTokens.eatWhitespaceAndComments(input, lastEnd);
						// Prevent to consider comments as a part of media query
						if (pos !== semicolonPos - 1) {
							importData.media = input.slice(lastEnd, semicolonPos - 1).trim();
						}

						const url = importData.url.trim();

						if (url.length === 0) {
							const dep = new ConstDependency("", [start, end]);
							module.addPresentationalDependency(dep);
							dep.setLoc(sl, sc, el, ec);
						} else {
							const dep = new CssImportDependency(
								url,
								[start, end],
								importData.layer,
								importData.supports,
								importData.media && importData.media.length > 0
									? importData.media
									: undefined
							);
							dep.setLoc(sl, sc, el, ec);
							module.addDependency(dep);
						}

						importData = undefined;
						scope = CSS_MODE_TOP_LEVEL;

						break;
					}
					case CSS_MODE_AT_IMPORT_INVALID:
					case CSS_MODE_AT_NAMESPACE_INVALID: {
						scope = CSS_MODE_TOP_LEVEL;

						break;
					}
					case CSS_MODE_IN_BLOCK: {
						if (this.allowModeSwitch) {
							processDeclarationValueDone(input);
							inAnimationProperty = false;
							isNextRulePrelude = isNextNestedSyntax(input, end);
						}
						break;
					}
				}
				return end;
			},
			leftCurlyBracket: (input, start, end) => {
				switch (scope) {
					case CSS_MODE_TOP_LEVEL: {
						allowImportAtRule = false;
						scope = CSS_MODE_IN_BLOCK;
						blockNestingLevel = 1;

						if (this.allowModeSwitch) {
							isNextRulePrelude = isNextNestedSyntax(input, end);
						}

						break;
					}
					case CSS_MODE_IN_BLOCK: {
						blockNestingLevel++;

						if (this.allowModeSwitch) {
							isNextRulePrelude = isNextNestedSyntax(input, end);
						}
						break;
					}
				}
				return end;
			},
			rightCurlyBracket: (input, start, end) => {
				switch (scope) {
					case CSS_MODE_IN_BLOCK: {
						if (isLocalMode()) {
							processDeclarationValueDone(input);
							inAnimationProperty = false;
						}
						if (--blockNestingLevel === 0) {
							scope = CSS_MODE_TOP_LEVEL;

							if (this.allowModeSwitch) {
								isNextRulePrelude = true;
								modeData = undefined;
							}
						} else if (this.allowModeSwitch) {
							isNextRulePrelude = isNextNestedSyntax(input, end);
						}
						break;
					}
				}
				return end;
			},
			identifier: (input, start, end) => {
				switch (scope) {
					case CSS_MODE_IN_BLOCK: {
						if (isLocalMode()) {
							// Handle only top level values and not inside functions
							if (inAnimationProperty && balanced.length === 0) {
								lastIdentifier = [start, end];
							} else {
								return processLocalDeclaration(input, start, end);
							}
						}
						break;
					}
					case CSS_MODE_IN_AT_IMPORT: {
						if (input.slice(start, end).toLowerCase() === "layer") {
							importData.layer = "";
							importData.layerStart = start;
							importData.layerEnd = end;
						}
						break;
					}
				}
				return end;
			},
			class: (input, start, end) => {
				if (isLocalMode()) {
					const name = input.slice(start + 1, end);
					const dep = new CssLocalIdentifierDependency(name, [start + 1, end]);
					const { line: sl, column: sc } = locConverter.get(start);
					const { line: el, column: ec } = locConverter.get(end);
					dep.setLoc(sl, sc, el, ec);
					module.addDependency(dep);
				}

				return end;
			},
			id: (input, start, end) => {
				if (isLocalMode()) {
					const name = input.slice(start + 1, end);
					const dep = new CssLocalIdentifierDependency(name, [start + 1, end]);
					const { line: sl, column: sc } = locConverter.get(start);
					const { line: el, column: ec } = locConverter.get(end);
					dep.setLoc(sl, sc, el, ec);
					module.addDependency(dep);
				}
				return end;
			},
			function: (input, start, end) => {
				let name = input.slice(start, end - 1);

				balanced.push([name, start, end]);

				if (
					scope === CSS_MODE_IN_AT_IMPORT &&
					name.toLowerCase() === "supports"
				) {
					importData.inSupports = true;
				}

				if (isLocalMode()) {
					name = name.toLowerCase();

					// Don't rename animation name when we have `var()` function
					if (inAnimationProperty && balanced.length === 1) {
						lastIdentifier = undefined;
					}

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
				}

				return end;
			},
			leftParenthesis: (input, start, end) => {
				balanced.push(["(", start, end]);

				return end;
			},
			rightParenthesis: (input, start, end) => {
				const last = balanced[balanced.length - 1];
				const popped = balanced.pop();

				if (
					this.allowModeSwitch &&
					popped &&
					(popped[0] === ":local" || popped[0] === ":global")
				) {
					modeData = balanced[balanced.length - 1]
						? /** @type {"local" | "global"} */
							(balanced[balanced.length - 1][0])
						: undefined;
					const dep = new ConstDependency("", [start, end]);
					module.addPresentationalDependency(dep);

					return end;
				}

				switch (scope) {
					case CSS_MODE_IN_AT_IMPORT: {
						if (last && last[0] === "url" && !importData.inSupports) {
							importData.urlStart = last[1];
							importData.urlEnd = end;
						} else if (
							last &&
							last[0].toLowerCase() === "layer" &&
							!importData.inSupports
						) {
							importData.layer = input.slice(last[2], end - 1).trim();
							importData.layerStart = last[1];
							importData.layerEnd = end;
						} else if (last && last[0].toLowerCase() === "supports") {
							importData.supports = input.slice(last[2], end - 1).trim();
							importData.supportsStart = last[1];
							importData.supportsEnd = end;
							importData.inSupports = false;
						}
						break;
					}
				}

				return end;
			},
			pseudoClass: (input, start, end) => {
				if (this.allowModeSwitch) {
					const name = input.slice(start, end).toLowerCase();

					if (name === ":global") {
						modeData = "global";
						// Eat extra whitespace and comments
						end = walkCssTokens.eatWhitespace(input, end);
						const dep = new ConstDependency("", [start, end]);
						module.addPresentationalDependency(dep);
						return end;
					} else if (name === ":local") {
						modeData = "local";
						// Eat extra whitespace and comments
						end = walkCssTokens.eatWhitespace(input, end);
						const dep = new ConstDependency("", [start, end]);
						module.addPresentationalDependency(dep);
						return end;
					}

					switch (scope) {
						case CSS_MODE_TOP_LEVEL: {
							if (name === ":export") {
								const pos = parseExports(input, end);
								const dep = new ConstDependency("", [start, pos]);
								module.addPresentationalDependency(dep);
								return pos;
							}
							break;
						}
					}
				}

				return end;
			},
			pseudoFunction: (input, start, end) => {
				let name = input.slice(start, end - 1);

				balanced.push([name, start, end]);

				if (this.allowModeSwitch) {
					name = name.toLowerCase();

					if (name === ":global") {
						modeData = "global";
						const dep = new ConstDependency("", [start, end]);
						module.addPresentationalDependency(dep);
					} else if (name === ":local") {
						modeData = "local";
						const dep = new ConstDependency("", [start, end]);
						module.addPresentationalDependency(dep);
					}
				}

				return end;
			},
			comma: (input, start, end) => {
				if (this.allowModeSwitch) {
					// Reset stack for `:global .class :local .class-other` selector after
					modeData = undefined;

					switch (scope) {
						case CSS_MODE_IN_BLOCK: {
							if (isLocalMode()) {
								processDeclarationValueDone(input);
							}

							break;
						}
					}
				}
				return end;
			}
		});

		if (oldDefaultMode) {
			this.defaultMode = oldDefaultMode;
		}

		module.buildInfo.strict = true;
		module.buildMeta.exportsType = this.namedExports ? "namespace" : "default";
		module.addDependency(new StaticExportsDependency([], true));
		return state;
	}
}

module.exports = CssParser;
