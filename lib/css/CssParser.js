/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const vm = require("vm");
const CommentCompilationWarning = require("../CommentCompilationWarning");
const ModuleDependencyWarning = require("../ModuleDependencyWarning");
const { CSS_MODULE_TYPE_AUTO } = require("../ModuleTypeConstants");
const Parser = require("../Parser");
const UnsupportedFeatureWarning = require("../UnsupportedFeatureWarning");
const WebpackError = require("../WebpackError");
const ConstDependency = require("../dependencies/ConstDependency");
const CssExportDependency = require("../dependencies/CssExportDependency");
const CssImportDependency = require("../dependencies/CssImportDependency");
const CssLocalIdentifierDependency = require("../dependencies/CssLocalIdentifierDependency");
const CssSelfLocalIdentifierDependency = require("../dependencies/CssSelfLocalIdentifierDependency");
const CssUrlDependency = require("../dependencies/CssUrlDependency");
const StaticExportsDependency = require("../dependencies/StaticExportsDependency");
const binarySearchBounds = require("../util/binarySearchBounds");
const { parseResource } = require("../util/identifier");
const {
	webpackCommentRegExp,
	createMagicCommentContext
} = require("../util/magicComment");
const walkCssTokens = require("./walkCssTokens");

/** @typedef {import("../Module").BuildInfo} BuildInfo */
/** @typedef {import("../Module").BuildMeta} BuildMeta */
/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../Parser").PreparsedAst} PreparsedAst */

/** @typedef {[number, number]} Range */
/** @typedef {{ line: number, column: number }} Position */
/** @typedef {{ value: string, range: Range, loc: { start: Position, end: Position } }} Comment */

const CC_LEFT_CURLY = "{".charCodeAt(0);
const CC_RIGHT_CURLY = "}".charCodeAt(0);
const CC_COLON = ":".charCodeAt(0);
const CC_SLASH = "/".charCodeAt(0);
const CC_SEMICOLON = ";".charCodeAt(0);
const CC_LEFT_PARENTHESIS = "(".charCodeAt(0);

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
				return String.fromCharCode(Number.parseInt(match.slice(1).trim(), 16));
			}
			return match[1];
		});

	if (/^data:/i.test(str)) {
		return str;
	}

	if (str.includes("%")) {
		// Convert `url('%2E/img.png')` -> `url('./img.png')`
		try {
			str = decodeURIComponent(str);
		} catch (_err) {
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

const EMPTY_COMMENT_OPTIONS = {
	options: null,
	errors: null
};

const CSS_MODE_TOP_LEVEL = 0;
const CSS_MODE_IN_BLOCK = 1;

class CssParser extends Parser {
	/**
	 * @param {object} options options
	 * @param {("pure" | "global" | "local" | "auto")=} options.defaultMode default mode
	 * @param {boolean=} options.namedExports is named exports
	 */
	constructor({ defaultMode = "pure", namedExports = true } = {}) {
		super();
		this.defaultMode = defaultMode;
		this.namedExports = namedExports;
		/** @type {Comment[] | undefined} */
		this.comments = undefined;
		this.magicCommentContext = createMagicCommentContext();
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
		if (source[0] === "\uFEFF") {
			source = source.slice(1);
		}

		let mode = this.defaultMode;

		const module = state.module;

		if (
			mode === "auto" &&
			module.type === CSS_MODULE_TYPE_AUTO &&
			IS_MODULES.test(
				parseResource(module.matchResource || module.resource).path
			)
		) {
			mode = "local";
		}

		const isModules = mode === "global" || mode === "local";

		const locConverter = new LocConverter(source);

		/** @type {number} */
		let scope = CSS_MODE_TOP_LEVEL;
		/** @type {boolean} */
		let allowImportAtRule = true;
		/** @type [string, number, number][] */
		const balanced = [];
		let lastTokenEndForComments = 0;

		/** @type {boolean} */
		let isNextRulePrelude = isModules;
		/** @type {number} */
		let blockNestingLevel = 0;
		/** @type {"local" | "global" | undefined} */
		let modeData;
		/** @type {boolean} */
		let inAnimationProperty = false;
		/** @type {Set<string>} */
		const declaredCssVariables = new Set();
		/** @type {[number, number, boolean] | undefined} */
		let lastIdentifier;

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
			modeData === "local" || (mode === "local" && modeData === undefined);

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
		const eatExportName = walkCssTokens.eatUntil(":};/");
		const eatExportValue = walkCssTokens.eatUntil("};/");
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
				const start = pos;
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
		const eatPropertyName = walkCssTokens.eatUntil(":{};");
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
				const name = lastIdentifier[2]
					? input.slice(lastIdentifier[0], lastIdentifier[1])
					: input.slice(lastIdentifier[0] + 1, lastIdentifier[1] - 1);
				const dep = new CssSelfLocalIdentifierDependency(name, [
					lastIdentifier[0],
					lastIdentifier[1]
				]);
				dep.setLoc(sl, sc, el, ec);
				module.addDependency(dep);
				lastIdentifier = undefined;
			}
		};

		const eatUntilSemi = walkCssTokens.eatUntil(";");
		const eatUntilLeftCurly = walkCssTokens.eatUntil("{");

		/**
		 * @param {string} input input
		 * @param {number} start start
		 * @param {number} end end
		 * @returns {number} end
		 */
		const comment = (input, start, end) => {
			if (!this.comments) this.comments = [];
			const { line: sl, column: sc } = locConverter.get(start);
			const { line: el, column: ec } = locConverter.get(end);

			/** @type {Comment} */
			const comment = {
				value: input.slice(start + 2, end - 2),
				range: [start, end],
				loc: {
					start: { line: sl, column: sc },
					end: { line: el, column: ec }
				}
			};
			this.comments.push(comment);
			return end;
		};

		walkCssTokens(source, {
			comment,
			leftCurlyBracket: (input, start, end) => {
				switch (scope) {
					case CSS_MODE_TOP_LEVEL: {
						allowImportAtRule = false;
						scope = CSS_MODE_IN_BLOCK;

						if (isModules) {
							blockNestingLevel = 1;
							isNextRulePrelude = isNextNestedSyntax(input, end);
						}

						break;
					}
					case CSS_MODE_IN_BLOCK: {
						if (isModules) {
							blockNestingLevel++;
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
						if (--blockNestingLevel === 0) {
							scope = CSS_MODE_TOP_LEVEL;

							if (isModules) {
								isNextRulePrelude = true;
								modeData = undefined;
							}
						} else if (isModules) {
							if (isLocalMode()) {
								processDeclarationValueDone(input);
								inAnimationProperty = false;
							}

							isNextRulePrelude = isNextNestedSyntax(input, end);
						}
						break;
					}
				}
				return end;
			},
			url: (input, start, end, contentStart, contentEnd) => {
				const { options, errors: commentErrors } = this.parseCommentOptions([
					lastTokenEndForComments,
					end
				]);
				if (commentErrors) {
					for (const e of commentErrors) {
						const { comment } = e;
						state.module.addWarning(
							new CommentCompilationWarning(
								`Compilation error while processing magic comment(-s): /*${comment.value}*/: ${e.message}`,
								comment.loc
							)
						);
					}
				}
				if (options && options.webpackIgnore !== undefined) {
					if (typeof options.webpackIgnore !== "boolean") {
						const { line: sl, column: sc } = locConverter.get(
							lastTokenEndForComments
						);
						const { line: el, column: ec } = locConverter.get(end);

						state.module.addWarning(
							new UnsupportedFeatureWarning(
								`\`webpackIgnore\` expected a boolean, but received: ${options.webpackIgnore}.`,
								{
									start: { line: sl, column: sc },
									end: { line: el, column: ec }
								}
							)
						);
					} else if (options.webpackIgnore) {
						return end;
					}
				}
				const value = normalizeUrl(
					input.slice(contentStart, contentEnd),
					false
				);
				// Ignore `url()`, `url('')` and `url("")`, they are valid by spec
				if (value.length === 0) return end;
				const dep = new CssUrlDependency(value, [start, end], "url");
				const { line: sl, column: sc } = locConverter.get(start);
				const { line: el, column: ec } = locConverter.get(end);
				dep.setLoc(sl, sc, el, ec);
				module.addDependency(dep);
				module.addCodeGenerationDependency(dep);
				return end;
			},
			string: (_input, start, end) => {
				switch (scope) {
					case CSS_MODE_IN_BLOCK: {
						if (inAnimationProperty && balanced.length === 0) {
							lastIdentifier = [start, end, false];
						}
					}
				}
				return end;
			},
			atKeyword: (input, start, end) => {
				const name = input.slice(start, end).toLowerCase();

				switch (name) {
					case "@namespace": {
						this._emitWarning(
							state,
							"'@namespace' is not supported in bundled CSS",
							locConverter,
							start,
							end
						);

						return eatUntilSemi(input, start);
					}
					case "@import": {
						if (!allowImportAtRule) {
							this._emitWarning(
								state,
								"Any '@import' rules must precede all other rules",
								locConverter,
								start,
								end
							);
							return end;
						}

						const tokens = walkCssTokens.eatImportTokens(input, end, {
							comment
						});
						if (!tokens[3]) return end;
						const semi = tokens[3][1];
						if (!tokens[0]) {
							this._emitWarning(
								state,
								`Expected URL in '${input.slice(start, semi)}'`,
								locConverter,
								start,
								semi
							);
							return end;
						}

						const urlToken = tokens[0];
						const url = normalizeUrl(
							input.slice(urlToken[2], urlToken[3]),
							true
						);
						const newline = walkCssTokens.eatWhiteLine(input, semi);
						const { options, errors: commentErrors } = this.parseCommentOptions(
							[end, urlToken[1]]
						);
						if (commentErrors) {
							for (const e of commentErrors) {
								const { comment } = e;
								state.module.addWarning(
									new CommentCompilationWarning(
										`Compilation error while processing magic comment(-s): /*${comment.value}*/: ${e.message}`,
										comment.loc
									)
								);
							}
						}
						if (options && options.webpackIgnore !== undefined) {
							if (typeof options.webpackIgnore !== "boolean") {
								const { line: sl, column: sc } = locConverter.get(start);
								const { line: el, column: ec } = locConverter.get(newline);

								state.module.addWarning(
									new UnsupportedFeatureWarning(
										`\`webpackIgnore\` expected a boolean, but received: ${options.webpackIgnore}.`,
										{
											start: { line: sl, column: sc },
											end: { line: el, column: ec }
										}
									)
								);
							} else if (options.webpackIgnore) {
								return newline;
							}
						}
						if (url.length === 0) {
							const { line: sl, column: sc } = locConverter.get(start);
							const { line: el, column: ec } = locConverter.get(newline);
							const dep = new ConstDependency("", [start, newline]);
							module.addPresentationalDependency(dep);
							dep.setLoc(sl, sc, el, ec);

							return newline;
						}

						let layer;

						if (tokens[1]) {
							layer = input.slice(tokens[1][0] + 6, tokens[1][1] - 1).trim();
						}

						let supports;

						if (tokens[2]) {
							supports = input.slice(tokens[2][0] + 9, tokens[2][1] - 1).trim();
						}

						const last = tokens[2] || tokens[1] || tokens[0];
						const mediaStart = walkCssTokens.eatWhitespaceAndComments(
							input,
							last[1]
						);

						let media;

						if (mediaStart !== semi - 1) {
							media = input.slice(mediaStart, semi - 1).trim();
						}

						const { line: sl, column: sc } = locConverter.get(start);
						const { line: el, column: ec } = locConverter.get(newline);
						const dep = new CssImportDependency(
							url,
							[start, newline],
							layer,
							supports && supports.length > 0 ? supports : undefined,
							media && media.length > 0 ? media : undefined
						);
						dep.setLoc(sl, sc, el, ec);
						module.addDependency(dep);

						return newline;
					}
					default: {
						if (isModules) {
							if (OPTIONALLY_VENDOR_PREFIXED_KEYFRAMES_AT_RULE.test(name)) {
								const ident = walkCssTokens.eatIdentSequenceOrString(
									input,
									end
								);
								if (!ident) return end;
								const name =
									ident[2] === true
										? input.slice(ident[0], ident[1])
										: input.slice(ident[0] + 1, ident[1] - 1);
								if (isLocalMode()) {
									const { line: sl, column: sc } = locConverter.get(ident[0]);
									const { line: el, column: ec } = locConverter.get(ident[1]);
									const dep = new CssLocalIdentifierDependency(name, [
										ident[0],
										ident[1]
									]);
									dep.setLoc(sl, sc, el, ec);
									module.addDependency(dep);
								}
								return ident[1];
							} else if (name === "@property") {
								const ident = walkCssTokens.eatIdentSequence(input, end);
								if (!ident) return end;
								let name = input.slice(ident[0], ident[1]);
								if (!name.startsWith("--")) return end;
								name = name.slice(2);
								declaredCssVariables.add(name);
								if (isLocalMode()) {
									const { line: sl, column: sc } = locConverter.get(ident[0]);
									const { line: el, column: ec } = locConverter.get(ident[1]);
									const dep = new CssLocalIdentifierDependency(
										name,
										[ident[0], ident[1]],
										"--"
									);
									dep.setLoc(sl, sc, el, ec);
									module.addDependency(dep);
								}
								return ident[1];
							} else if (isModules && name === "@scope") {
								modeData = isLocalMode() ? "local" : "global";
								isNextRulePrelude = true;
								return end;
							}

							isNextRulePrelude = false;
						}
					}
				}

				return end;
			},
			semicolon: (input, start, end) => {
				if (isModules && scope === CSS_MODE_IN_BLOCK) {
					if (isLocalMode()) {
						processDeclarationValueDone(input);
						inAnimationProperty = false;
					}

					isNextRulePrelude = isNextNestedSyntax(input, end);
				}
				return end;
			},
			identifier: (input, start, end) => {
				switch (scope) {
					case CSS_MODE_IN_BLOCK: {
						if (isLocalMode()) {
							// Handle only top level values and not inside functions
							if (inAnimationProperty && balanced.length === 0) {
								lastIdentifier = [start, end, true];
							} else {
								return processLocalDeclaration(input, start, end);
							}
						}
						break;
					}
				}
				return end;
			},
			delim: (input, start, end) => {
				if (isNextRulePrelude && isLocalMode()) {
					const ident = walkCssTokens.skipCommentsAndEatIdentSequence(
						input,
						end
					);
					if (!ident) return end;
					const name = input.slice(ident[0], ident[1]);
					const dep = new CssLocalIdentifierDependency(name, [
						ident[0],
						ident[1]
					]);
					const { line: sl, column: sc } = locConverter.get(ident[0]);
					const { line: el, column: ec } = locConverter.get(ident[1]);
					dep.setLoc(sl, sc, el, ec);
					module.addDependency(dep);
					return ident[1];
				}

				return end;
			},
			hash: (input, start, end, isID) => {
				if (isNextRulePrelude && isLocalMode() && isID) {
					const valueStart = start + 1;
					const name = input.slice(valueStart, end);
					const dep = new CssLocalIdentifierDependency(name, [valueStart, end]);
					const { line: sl, column: sc } = locConverter.get(start);
					const { line: el, column: ec } = locConverter.get(end);
					dep.setLoc(sl, sc, el, ec);
					module.addDependency(dep);
				}

				return end;
			},
			colon: (input, start, end) => {
				if (isModules) {
					const ident = walkCssTokens.skipCommentsAndEatIdentSequence(
						input,
						end
					);
					if (!ident) return end;
					const name = input.slice(ident[0], ident[1]).toLowerCase();

					switch (scope) {
						case CSS_MODE_TOP_LEVEL: {
							if (name === "export") {
								const pos = parseExports(input, ident[1]);
								const dep = new ConstDependency("", [start, pos]);
								module.addPresentationalDependency(dep);
								return pos;
							}
						}
						// falls through
						default: {
							if (isNextRulePrelude) {
								const isFn = input.charCodeAt(ident[1]) === CC_LEFT_PARENTHESIS;

								if (isFn && name === "local") {
									const end = ident[1] + 1;
									modeData = "local";
									const dep = new ConstDependency("", [start, end]);
									module.addPresentationalDependency(dep);
									balanced.push([":local", start, end]);
									return end;
								} else if (name === "local") {
									modeData = "local";
									// Eat extra whitespace
									end = walkCssTokens.eatWhitespace(input, ident[1]);

									if (ident[1] === end) {
										this._emitWarning(
											state,
											`Missing whitespace after ':local' in '${input.slice(
												start,
												eatUntilLeftCurly(input, end) + 1
											)}'`,
											locConverter,
											start,
											end
										);
									}

									const dep = new ConstDependency("", [start, end]);
									module.addPresentationalDependency(dep);
									return end;
								} else if (isFn && name === "global") {
									const end = ident[1] + 1;
									modeData = "global";
									const dep = new ConstDependency("", [start, end]);
									module.addPresentationalDependency(dep);
									balanced.push([":global", start, end]);
									return end;
								} else if (name === "global") {
									modeData = "global";
									// Eat extra whitespace
									end = walkCssTokens.eatWhitespace(input, ident[1]);

									if (ident[1] === end) {
										this._emitWarning(
											state,
											`Missing whitespace after ':global' in '${input.slice(
												start,
												eatUntilLeftCurly(input, end) + 1
											)}'`,
											locConverter,
											start,
											end
										);
									}

									const dep = new ConstDependency("", [start, end]);
									module.addPresentationalDependency(dep);
									return end;
								}
							}
						}
					}
				}

				lastTokenEndForComments = end;

				return end;
			},
			function: (input, start, end) => {
				const name = input
					.slice(start, end - 1)
					.replace(/\\/g, "")
					.toLowerCase();

				balanced.push([name, start, end]);

				switch (name) {
					case "src":
					case "url": {
						const string = walkCssTokens.eatString(input, end);
						if (!string) return end;
						const { options, errors: commentErrors } = this.parseCommentOptions(
							[lastTokenEndForComments, end]
						);
						if (commentErrors) {
							for (const e of commentErrors) {
								const { comment } = e;
								state.module.addWarning(
									new CommentCompilationWarning(
										`Compilation error while processing magic comment(-s): /*${comment.value}*/: ${e.message}`,
										comment.loc
									)
								);
							}
						}
						if (options && options.webpackIgnore !== undefined) {
							if (typeof options.webpackIgnore !== "boolean") {
								const { line: sl, column: sc } = locConverter.get(string[0]);
								const { line: el, column: ec } = locConverter.get(string[1]);

								state.module.addWarning(
									new UnsupportedFeatureWarning(
										`\`webpackIgnore\` expected a boolean, but received: ${options.webpackIgnore}.`,
										{
											start: { line: sl, column: sc },
											end: { line: el, column: ec }
										}
									)
								);
							} else if (options.webpackIgnore) {
								return end;
							}
						}
						const value = normalizeUrl(
							input.slice(string[0] + 1, string[1] - 1),
							true
						);
						// Ignore `url()`, `url('')` and `url("")`, they are valid by spec
						if (value.length === 0) return end;
						const isUrl = name === "url" || name === "src";
						const dep = new CssUrlDependency(
							value,
							[string[0], string[1]],
							isUrl ? "string" : "url"
						);
						const { line: sl, column: sc } = locConverter.get(string[0]);
						const { line: el, column: ec } = locConverter.get(string[1]);
						dep.setLoc(sl, sc, el, ec);
						module.addDependency(dep);
						module.addCodeGenerationDependency(dep);
						return string[1];
					}
					default: {
						if (IMAGE_SET_FUNCTION.test(name)) {
							lastTokenEndForComments = end;
							const values = walkCssTokens.eatImageSetStrings(input, end, {
								comment
							});
							if (values.length === 0) return end;
							for (const [index, string] of values.entries()) {
								const value = normalizeUrl(
									input.slice(string[0] + 1, string[1] - 1),
									true
								);
								if (value.length === 0) return end;
								const { options, errors: commentErrors } =
									this.parseCommentOptions([
										index === 0 ? start : values[index - 1][1],
										string[1]
									]);
								if (commentErrors) {
									for (const e of commentErrors) {
										const { comment } = e;
										state.module.addWarning(
											new CommentCompilationWarning(
												`Compilation error while processing magic comment(-s): /*${comment.value}*/: ${e.message}`,
												comment.loc
											)
										);
									}
								}
								if (options && options.webpackIgnore !== undefined) {
									if (typeof options.webpackIgnore !== "boolean") {
										const { line: sl, column: sc } = locConverter.get(
											string[0]
										);
										const { line: el, column: ec } = locConverter.get(
											string[1]
										);

										state.module.addWarning(
											new UnsupportedFeatureWarning(
												`\`webpackIgnore\` expected a boolean, but received: ${options.webpackIgnore}.`,
												{
													start: { line: sl, column: sc },
													end: { line: el, column: ec }
												}
											)
										);
									} else if (options.webpackIgnore) {
										continue;
									}
								}
								const dep = new CssUrlDependency(
									value,
									[string[0], string[1]],
									"url"
								);
								const { line: sl, column: sc } = locConverter.get(string[0]);
								const { line: el, column: ec } = locConverter.get(string[1]);
								dep.setLoc(sl, sc, el, ec);
								module.addDependency(dep);
								module.addCodeGenerationDependency(dep);
							}
							// Can contain `url()` inside, so let's return end to allow parse them
							return end;
						} else if (isLocalMode()) {
							// Don't rename animation name when we have `var()` function
							if (inAnimationProperty && balanced.length === 1) {
								lastIdentifier = undefined;
							}

							if (name === "var") {
								const ident = walkCssTokens.eatIdentSequence(input, end);
								if (!ident) return end;
								const name = input.slice(ident[0], ident[1]);
								if (!name.startsWith("--")) return end;
								const { line: sl, column: sc } = locConverter.get(ident[0]);
								const { line: el, column: ec } = locConverter.get(ident[1]);
								const dep = new CssSelfLocalIdentifierDependency(
									name.slice(2),
									[ident[0], ident[1]],
									"--",
									declaredCssVariables
								);
								dep.setLoc(sl, sc, el, ec);
								module.addDependency(dep);
								return ident[1];
							}
						}
					}
				}

				return end;
			},
			leftParenthesis: (input, start, end) => {
				balanced.push(["(", start, end]);

				return end;
			},
			rightParenthesis: (input, start, end) => {
				const popped = balanced.pop();

				if (
					isModules &&
					popped &&
					(popped[0] === ":local" || popped[0] === ":global")
				) {
					modeData = balanced[balanced.length - 1]
						? /** @type {"local" | "global"} */
							(balanced[balanced.length - 1][0])
						: undefined;
					const dep = new ConstDependency("", [start, end]);
					module.addPresentationalDependency(dep);
				}

				return end;
			},
			comma: (input, start, end) => {
				if (isModules) {
					// Reset stack for `:global .class :local .class-other` selector after
					modeData = undefined;

					if (scope === CSS_MODE_IN_BLOCK && isLocalMode()) {
						processDeclarationValueDone(input);
					}
				}

				lastTokenEndForComments = start;

				return end;
			}
		});

		/** @type {BuildInfo} */
		(module.buildInfo).strict = true;
		/** @type {BuildMeta} */
		(module.buildMeta).exportsType = this.namedExports
			? "namespace"
			: "default";

		if (!this.namedExports) {
			/** @type {BuildMeta} */
			(module.buildMeta).defaultObject = "redirect";
		}

		module.addDependency(new StaticExportsDependency([], true));
		return state;
	}

	/**
	 * @param {Range} range range
	 * @returns {Comment[]} comments in the range
	 */
	getComments(range) {
		if (!this.comments) return [];
		const [rangeStart, rangeEnd] = range;
		/**
		 * @param {Comment} comment comment
		 * @param {number} needle needle
		 * @returns {number} compared
		 */
		const compare = (comment, needle) =>
			/** @type {Range} */ (comment.range)[0] - needle;
		const comments = /** @type {Comment[]} */ (this.comments);
		let idx = binarySearchBounds.ge(comments, rangeStart, compare);
		/** @type {Comment[]} */
		const commentsInRange = [];
		while (
			comments[idx] &&
			/** @type {Range} */ (comments[idx].range)[1] <= rangeEnd
		) {
			commentsInRange.push(comments[idx]);
			idx++;
		}

		return commentsInRange;
	}

	/**
	 * @param {Range} range range of the comment
	 * @returns {{ options: Record<string, any> | null, errors: (Error & { comment: Comment })[] | null }} result
	 */
	parseCommentOptions(range) {
		const comments = this.getComments(range);
		if (comments.length === 0) {
			return EMPTY_COMMENT_OPTIONS;
		}
		/** @type {Record<string, EXPECTED_ANY> } */
		const options = {};
		/** @type {(Error & { comment: Comment })[]} */
		const errors = [];
		for (const comment of comments) {
			const { value } = comment;
			if (value && webpackCommentRegExp.test(value)) {
				// try compile only if webpack options comment is present
				try {
					for (let [key, val] of Object.entries(
						vm.runInContext(
							`(function(){return {${value}};})()`,
							this.magicCommentContext
						)
					)) {
						if (typeof val === "object" && val !== null) {
							val =
								val.constructor.name === "RegExp"
									? new RegExp(val)
									: JSON.parse(JSON.stringify(val));
						}
						options[key] = val;
					}
				} catch (err) {
					const newErr = new Error(String(/** @type {Error} */ (err).message));
					newErr.stack = String(/** @type {Error} */ (err).stack);
					Object.assign(newErr, { comment });
					errors.push(/** @type (Error & { comment: Comment }) */ (newErr));
				}
			}
		}
		return { options, errors };
	}
}

module.exports = CssParser;
