/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const vm = require("vm");
const CommentCompilationWarning = require("../CommentCompilationWarning");
const CssModule = require("../CssModule");
const ModuleDependencyWarning = require("../ModuleDependencyWarning");
const { CSS_MODULE_TYPE_AUTO } = require("../ModuleTypeConstants");
const Parser = require("../Parser");
const UnsupportedFeatureWarning = require("../UnsupportedFeatureWarning");
const WebpackError = require("../WebpackError");
const ConstDependency = require("../dependencies/ConstDependency");
const CssIcssExportDependency = require("../dependencies/CssIcssExportDependency");
const CssIcssFromIdentifierDependency = require("../dependencies/CssIcssFromIdentifierDependency");
const CssIcssGlobalIdentifierDependency = require("../dependencies/CssIcssGlobalIdentifierDependency");
const CssIcssImportDependency = require("../dependencies/CssIcssImportDependency");
const CssIcssLocalIdentifierDependency = require("../dependencies/CssIcssLocalIdentifierDependency");
const CssIcssSelfLocalIdentifierDependency = require("../dependencies/CssIcssSelfLocalIdentifierDependency");
const CssIcssSymbolDependency = require("../dependencies/CssIcssSymbolDependency");
const CssImportDependency = require("../dependencies/CssImportDependency");
const CssUrlDependency = require("../dependencies/CssUrlDependency");
const StaticExportsDependency = require("../dependencies/StaticExportsDependency");
const binarySearchBounds = require("../util/binarySearchBounds");
const { parseResource } = require("../util/identifier");
const {
	createMagicCommentContext,
	webpackCommentRegExp
} = require("../util/magicComment");
const walkCssTokens = require("./walkCssTokens");

/** @typedef {import("../Module").BuildInfo} BuildInfo */
/** @typedef {import("../Module").BuildMeta} BuildMeta */
/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../Parser").PreparsedAst} PreparsedAst */
/** @typedef {import("./walkCssTokens").CssTokenCallbacks} CssTokenCallbacks */
/** @typedef {import("../../declarations/WebpackOptions").CssParserExportType} CssParserExportType */

/** @typedef {[number, number]} Range */
/** @typedef {{ line: number, column: number }} Position */
/** @typedef {{ value: string, range: Range, loc: { start: Position, end: Position } }} Comment */

const CC_COLON = ":".charCodeAt(0);
const CC_SEMICOLON = ";".charCodeAt(0);
const CC_COMMA = ",".charCodeAt(0);
const CC_SLASH = "/".charCodeAt(0);
const CC_LEFT_PARENTHESIS = "(".charCodeAt(0);
const CC_RIGHT_PARENTHESIS = ")".charCodeAt(0);
const CC_LOWER_F = "f".charCodeAt(0);
const CC_UPPER_F = "F".charCodeAt(0);
const CC_RIGHT_CURLY = "}".charCodeAt(0);

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
const COMPOSES_PROPERTY = /^(composes|compose-with)$/i;
const IS_MODULES = /\.module(s)?\.[^.]+$/i;
const CSS_COMMENT = /\/\*((?!\*\/).*?)\*\//g;

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
		.replace(UNESCAPE, (match) => {
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

// eslint-disable-next-line no-useless-escape
const regexSingleEscape = /[ -,.\/:-@[\]\^`{-~]/;
const regexExcessiveSpaces =
	/(^|\\+)?(\\[A-F0-9]{1,6})\u0020(?![a-fA-F0-9\u0020])/g;

/**
 * @param {string} str string
 * @returns {string} escaped identifier
 */
const escapeIdentifier = (str) => {
	let output = "";
	let counter = 0;

	while (counter < str.length) {
		const character = str.charAt(counter++);

		let value;

		// eslint-disable-next-line no-control-regex
		if (/[\t\n\f\r\u000B]/.test(character)) {
			const codePoint = character.charCodeAt(0);

			value = `\\${codePoint.toString(16).toUpperCase()} `;
		} else if (character === "\\" || regexSingleEscape.test(character)) {
			value = `\\${character}`;
		} else {
			value = character;
		}

		output += value;
	}

	const firstChar = str.charAt(0);

	if (/^-[-\d]/.test(output)) {
		output = `\\-${output.slice(1)}`;
	} else if (/\d/.test(firstChar)) {
		output = `\\3${firstChar} ${output.slice(1)}`;
	}

	// Remove spaces after `\HEX` escapes that are not followed by a hex digit,
	// since they’re redundant. Note that this is only possible if the escape
	// sequence isn’t preceded by an odd number of backslashes.
	output = output.replace(regexExcessiveSpaces, ($0, $1, $2) => {
		if ($1 && $1.length % 2) {
			// It’s not safe to remove the space, so don’t.
			return $0;
		}

		// Strip the space.
		return ($1 || "") + $2;
	});

	return output;
};

const CONTAINS_ESCAPE = /\\/;

/**
 * @param {string} str string
 * @returns {[string, number] | undefined} hex
 */
const gobbleHex = (str) => {
	const lower = str.toLowerCase();
	let hex = "";
	let spaceTerminated = false;

	for (let i = 0; i < 6 && lower[i] !== undefined; i++) {
		const code = lower.charCodeAt(i);
		// check to see if we are dealing with a valid hex char [a-f|0-9]
		const valid = (code >= 97 && code <= 102) || (code >= 48 && code <= 57);
		// https://drafts.csswg.org/css-syntax/#consume-escaped-code-point
		spaceTerminated = code === 32;
		if (!valid) break;
		hex += lower[i];
	}

	if (hex.length === 0) return undefined;

	const codePoint = Number.parseInt(hex, 16);
	const isSurrogate = codePoint >= 0xd800 && codePoint <= 0xdfff;

	// Add special case for
	// "If this number is zero, or is for a surrogate, or is greater than the maximum allowed code point"
	// https://drafts.csswg.org/css-syntax/#maximum-allowed-code-point
	if (isSurrogate || codePoint === 0x0000 || codePoint > 0x10ffff) {
		return ["\uFFFD", hex.length + (spaceTerminated ? 1 : 0)];
	}

	return [
		String.fromCodePoint(codePoint),
		hex.length + (spaceTerminated ? 1 : 0)
	];
};

/**
 * @param {string} str string
 * @returns {string} unescaped string
 */
const unescapeIdentifier = (str) => {
	const needToProcess = CONTAINS_ESCAPE.test(str);
	if (!needToProcess) return str;
	let ret = "";
	for (let i = 0; i < str.length; i++) {
		if (str[i] === "\\") {
			const gobbled = gobbleHex(str.slice(i + 1, i + 7));
			if (gobbled !== undefined) {
				ret += gobbled[0];
				i += gobbled[1];
				continue;
			}
			// Retain a pair of \\ if double escaped `\\\\`
			// https://github.com/postcss/postcss-selector-parser/commit/268c9a7656fb53f543dc620aa5b73a30ec3ff20e
			if (str[i + 1] === "\\") {
				ret += "\\";
				i += 1;
				continue;
			}
			// if \\ is at the end of the string retain it
			// https://github.com/postcss/postcss-selector-parser/commit/01a6b346e3612ce1ab20219acc26abdc259ccefb
			if (str.length === i + 1) {
				ret += str[i];
			}
			continue;
		}
		ret += str[i];
	}

	return ret;
};

/** @type {Record<string, number>} */
const ANIMATION_KEYWORDS = {
	// animation-direction
	normal: 1,
	reverse: 1,
	alternate: 1,
	"alternate-reverse": 1,
	// animation-fill-mode
	forwards: 1,
	backwards: 1,
	both: 1,
	// animation-iteration-count
	infinite: 1,
	// animation-play-state
	paused: 1,
	running: 1,
	// animation-timing-function
	ease: 1,
	"ease-in": 1,
	"ease-out": 1,
	"ease-in-out": 1,
	linear: 1,
	"step-end": 1,
	"step-start": 1,
	// Special
	none: Infinity, // No matter how many times you write none, it will never be an animation name
	// Global values
	initial: Infinity,
	inherit: Infinity,
	unset: Infinity,
	revert: Infinity,
	"revert-layer": Infinity
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
					while (i > 0 && (i = str.lastIndexOf("\n", i - 1)) !== -1) {
						this.line++;
					}
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

const eatUntilSemi = walkCssTokens.eatUntil(";");
const eatUntilLeftCurly = walkCssTokens.eatUntil("{");
const eatSemi = walkCssTokens.eatUntil(";");

/**
 * @typedef {object} CssParserOptions
 * @property {boolean=} importOption need handle `@import`
 * @property {boolean=} url need handle URLs
 * @property {("pure" | "global" | "local" | "auto")=} defaultMode default mode
 * @property {boolean=} namedExports is named exports
 * @property {CssParserExportType=} exportType export type
 */

class CssParser extends Parser {
	/**
	 * @param {CssParserOptions=} options options
	 */
	constructor({
		defaultMode = "pure",
		importOption = true,
		url = true,
		namedExports = true,
		exportType
	} = {}) {
		super();
		this.defaultMode = defaultMode;
		this.import = importOption;
		this.url = url;
		this.namedExports = namedExports;
		this.exportType = exportType;
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
			source = source.toString("utf8");
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
				parseResource(/** @type {string} */ (module.getResource())).path
			)
		) {
			mode = "local";
		}

		const isModules = mode === "global" || mode === "local";

		/** @type {BuildMeta} */
		(module.buildMeta).isCSSModule = isModules;

		const locConverter = new LocConverter(source);

		/** @type {number} */
		let scope = CSS_MODE_TOP_LEVEL;
		/** @type {boolean} */
		let allowImportAtRule = true;
		/** @type {[string, number, number][]} */
		const balanced = [];
		let lastTokenEndForComments = 0;

		/** @type {boolean} */
		let isNextRulePrelude = isModules;
		/** @type {number} */
		let blockNestingLevel = 0;
		/** @type {"local" | "global" | undefined} */
		let modeData;
		/** @type {Set<string>} */
		const declaredCssVariables = new Set();

		/** @type {string[]} */
		let lastLocalIdentifiers = [];

		/** @typedef {{ value: string, isReference?: boolean }} IcssDefinition */
		/** @type {Map<string, IcssDefinition>} */
		const icssDefinitions = new Map();

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

		const eatPropertyName = walkCssTokens.eatUntil(":{};");

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

		// Vanilla CSS stuff

		/**
		 * @param {string} input input
		 * @param {number} start name start position
		 * @param {number} end name end position
		 * @returns {number} position after handling
		 */
		const processAtImport = (input, start, end) => {
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
			const url = normalizeUrl(input.slice(urlToken[2], urlToken[3]), true);
			const newline = walkCssTokens.eatWhiteLine(input, semi);
			const { options, errors: commentErrors } = this.parseCommentOptions([
				end,
				urlToken[1]
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
			const mediaStart = walkCssTokens.eatWhitespaceAndComments(input, last[1]);

			let media;

			if (mediaStart !== semi - 1) {
				media = input.slice(mediaStart, semi - 1).trim();
			}

			const { line: sl, column: sc } = locConverter.get(start);
			const { line: el, column: ec } = locConverter.get(newline);
			const dep = new CssImportDependency(
				url,
				[start, newline],
				mode === "local" || mode === "global" ? mode : undefined,
				layer,
				supports && supports.length > 0 ? supports : undefined,
				media && media.length > 0 ? media : undefined
			);
			dep.setLoc(sl, sc, el, ec);
			module.addDependency(dep);

			return newline;
		};

		/**
		 * @param {string} input input
		 * @param {number} end end position
		 * @param {string} name the name of function
		 * @returns {number} position after handling
		 */
		const processURLFunction = (input, end, name) => {
			const string = walkCssTokens.eatString(input, end);
			if (!string) return end;
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
		};

		/**
		 * @param {string} input input
		 * @param {number} start start position
		 * @param {number} end end position
		 * @param {number} contentStart start position
		 * @param {number} contentEnd end position
		 * @returns {number} position after handling
		 */
		const processOldURLFunction = (
			input,
			start,
			end,
			contentStart,
			contentEnd
		) => {
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
			const value = normalizeUrl(input.slice(contentStart, contentEnd), false);
			// Ignore `url()`, `url('')` and `url("")`, they are valid by spec
			if (value.length === 0) return end;
			const dep = new CssUrlDependency(value, [start, end], "url");
			const { line: sl, column: sc } = locConverter.get(start);
			const { line: el, column: ec } = locConverter.get(end);
			dep.setLoc(sl, sc, el, ec);
			module.addDependency(dep);
			module.addCodeGenerationDependency(dep);
			return end;
		};

		/**
		 * @param {string} input input
		 * @param {number} start start position
		 * @param {number} end end position
		 * @returns {number} position after handling
		 */
		const processImageSetFunction = (input, start, end) => {
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
				const { options, errors: commentErrors } = this.parseCommentOptions([
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
						continue;
					}
				}
				const dep = new CssUrlDependency(value, [string[0], string[1]], "url");
				const { line: sl, column: sc } = locConverter.get(string[0]);
				const { line: el, column: ec } = locConverter.get(string[1]);
				dep.setLoc(sl, sc, el, ec);
				module.addDependency(dep);
				module.addCodeGenerationDependency(dep);
			}
			// Can contain `url()` inside, so let's return end to allow parse them
			return end;
		};

		// CSS modules stuff

		/**
		 * @param {0 | 1} type import or export
		 * @param {string} input input
		 * @param {number} pos start position
		 * @returns {number} position after parse
		 */
		const processImportOrExport = (type, input, pos) => {
			pos = walkCssTokens.eatWhitespaceAndComments(input, pos);
			/** @type {string | undefined} */
			let request;
			if (type === 0) {
				let cc = input.charCodeAt(pos);
				if (cc !== CC_LEFT_PARENTHESIS) {
					this._emitWarning(
						state,
						`Unexpected '${input[pos]}' at ${pos} during parsing of ':import' (expected '(')`,
						locConverter,
						pos,
						pos
					);
					return pos;
				}
				pos++;
				const stringStart = pos;
				const str = walkCssTokens.eatString(input, pos);
				if (!str) {
					this._emitWarning(
						state,
						`Unexpected '${input[pos]}' at ${pos} during parsing of '${type ? ":import" : ":export"}' (expected string)`,
						locConverter,
						stringStart,
						pos
					);
					return pos;
				}
				request = input.slice(str[0] + 1, str[1] - 1);
				pos = str[1];
				pos = walkCssTokens.eatWhitespaceAndComments(input, pos);
				cc = input.charCodeAt(pos);
				if (cc !== CC_RIGHT_PARENTHESIS) {
					this._emitWarning(
						state,
						`Unexpected '${input[pos]}' at ${pos} during parsing of ':import' (expected ')')`,
						locConverter,
						pos,
						pos
					);
					return pos;
				}
				pos++;
				pos = walkCssTokens.eatWhitespaceAndComments(input, pos);
			}

			/**
			 * @param {string} name name
			 * @param {string} value value
			 * @param {number} start start of position
			 * @param {number} end end of position
			 */
			const createDep = (name, value, start, end) => {
				if (type === 0) {
					const dep = new CssIcssImportDependency(
						/** @type {string} */
						(request),
						[0, 0],
						/** @type {"local" | "global"} */
						(mode),
						value
					);
					const { line: sl, column: sc } = locConverter.get(start);
					const { line: el, column: ec } = locConverter.get(end);
					dep.setLoc(sl, sc, el, ec);
					module.addDependency(dep);

					icssDefinitions.set(name, { value, isReference: true });
				} else if (type === 1) {
					const reexport = icssDefinitions.get(value);
					const dep = new CssIcssExportDependency(
						name,
						value,
						reexport && reexport.isReference ? reexport.value : undefined,
						undefined
					);
					const { line: sl, column: sc } = locConverter.get(start);
					const { line: el, column: ec } = locConverter.get(end);
					dep.setLoc(sl, sc, el, ec);
					module.addDependency(dep);
				}
			};

			let needTerminate = false;
			let balanced = 0;
			/** @type {undefined | 0 | 1 | 2} */
			let scope;

			/** @typedef {[number, number]} Name */

			/** @type {Name | undefined} */
			let name;
			/** @type {number | undefined} */
			let value;

			/** @type {CssTokenCallbacks} */
			const callbacks = {
				leftCurlyBracket: (_input, _start, end) => {
					balanced++;

					if (scope === undefined) {
						scope = 0;
					}

					return end;
				},
				rightCurlyBracket: (_input, _start, end) => {
					balanced--;

					if (scope === 2) {
						const [nameStart, nameEnd] = /** @type {Name} */ (name);
						createDep(
							input.slice(nameStart, nameEnd),
							input.slice(value, end - 1).trim(),
							nameEnd,
							end - 1
						);
						scope = 0;
					}

					if (balanced === 0 && scope === 0) {
						needTerminate = true;
					}

					return end;
				},
				identifier: (_input, start, end) => {
					if (scope === 0) {
						name = [start, end];
						scope = 1;
					}

					return end;
				},
				colon: (_input, _start, end) => {
					if (scope === 1) {
						scope = 2;
						value = walkCssTokens.eatWhitespace(input, end);
						return value;
					}

					return end;
				},
				semicolon: (input, _start, end) => {
					if (scope === 2) {
						const [nameStart, nameEnd] = /** @type {Name} */ (name);
						createDep(
							input.slice(nameStart, nameEnd),
							input.slice(value, end - 1),
							nameEnd,
							end - 1
						);
						scope = 0;
					}

					return end;
				},
				needTerminate: () => needTerminate
			};

			pos = walkCssTokens(input, pos, callbacks);
			pos = walkCssTokens.eatWhiteLine(input, pos);

			return pos;
		};

		/**
		 * @param {string} input input
		 * @param {number} start name start position
		 * @param {number} end name end position
		 * @returns {number} position after handling
		 */
		const processAtValue = (input, start, end) => {
			const semi = eatUntilSemi(input, end);
			const atRuleEnd = semi + 1;
			const params = input.slice(end, semi);
			let [alias, request] = params.split(/\s*from\s*/);

			if (request) {
				const aliases = alias
					.replace(CSS_COMMENT, " ")
					.trim()
					.replace(/^\(\s*|\s*\)$/g, "")
					.split(/\s*,\s*/);

				request = request.replace(CSS_COMMENT, "").trim();

				const isExplicitImport = request[0] === "'" || request[0] === '"';

				if (isExplicitImport) {
					request = request.slice(1, -1);
				}

				for (const alias of aliases) {
					const [name, aliasName] = alias.split(/\s+as\s+/);

					{
						const reexport = icssDefinitions.get(request);

						if (reexport) {
							request = reexport.value.slice(1, -1);
						}

						const dep = new CssIcssImportDependency(
							request,
							[0, 0],
							/** @type {"local" | "global"} */
							(mode),
							name
						);
						const { line: sl, column: sc } = locConverter.get(start);
						const { line: el, column: ec } = locConverter.get(end);
						dep.setLoc(sl, sc, el, ec);
						module.addDependency(dep);

						icssDefinitions.set(aliasName || name, {
							value: name,
							isReference: true
						});
					}

					if (aliasName) {
						const reexport = icssDefinitions.get(aliasName);
						const dep = new CssIcssExportDependency(
							aliasName,
							name,
							reexport && reexport.isReference ? reexport.value : undefined,
							undefined
						);
						const { line: sl, column: sc } = locConverter.get(start);
						const { line: el, column: ec } = locConverter.get(end);
						dep.setLoc(sl, sc, el, ec);
						module.addDependency(dep);
					}

					{
						const reexport = icssDefinitions.get(name);
						const dep = new CssIcssExportDependency(
							name,
							name,
							reexport && reexport.isReference ? reexport.value : undefined,
							undefined
						);
						const { line: sl, column: sc } = locConverter.get(start);
						const { line: el, column: ec } = locConverter.get(end);
						dep.setLoc(sl, sc, el, ec);
						module.addDependency(dep);
					}
				}
			} else {
				const ident = walkCssTokens.eatIdentSequence(alias, 0);

				if (!ident) {
					this._emitWarning(
						state,
						`Broken '@value' at-rule: ${input.slice(start, atRuleEnd)}'`,
						locConverter,
						start,
						atRuleEnd
					);

					const dep = new ConstDependency("", [start, atRuleEnd]);
					module.addPresentationalDependency(dep);
					return atRuleEnd;
				}

				const pos = walkCssTokens.eatWhitespaceAndComments(alias, ident[1]);

				const name = alias.slice(ident[0], ident[1]);
				let value =
					alias.charCodeAt(pos) === CC_COLON
						? alias.slice(pos + 1)
						: alias.slice(ident[1]);

				if (value && !/^\s+$/.test(value.replace(CSS_COMMENT, ""))) {
					value = value.trim();
				}

				if (icssDefinitions.has(value)) {
					const def =
						/** @type {IcssDefinition} */
						(icssDefinitions.get(value));

					value = def.value;
				}

				icssDefinitions.set(name, { value });

				const dep = new CssIcssExportDependency(name, value);
				const { line: sl, column: sc } = locConverter.get(start);
				const { line: el, column: ec } = locConverter.get(end);
				dep.setLoc(sl, sc, el, ec);
				module.addDependency(dep);
			}

			const dep = new ConstDependency("", [start, atRuleEnd]);
			module.addPresentationalDependency(dep);
			return atRuleEnd;
		};

		/**
		 * @param {string} name ICSS symbol name
		 * @param {number} start start position
		 * @param {number} end end position
		 * @returns {number} position after handling
		 */
		const processICSSSymbol = (name, start, end) => {
			const { value, isReference } =
				/** @type {IcssDefinition} */
				(icssDefinitions.get(name));
			const { line: sl, column: sc } = locConverter.get(start);
			const { line: el, column: ec } = locConverter.get(end);
			const dep = new CssIcssSymbolDependency(
				name,
				value,
				[start, end],
				isReference
			);
			dep.setLoc(sl, sc, el, ec);
			module.addDependency(dep);
			return end;
		};

		/**
		 * @param {string} input input
		 * @param {1 | 2} type type of function
		 * @param {number} start start position
		 * @param {number} end end position
		 * @returns {number} position after handling
		 */
		const processLocalOrGlobalFunction = (input, type, start, end) => {
			// Replace `local(`/` or `global(` (handle legacy `:local(` or `:global(` too)
			{
				const isColon = input.charCodeAt(start - 1) === CC_COLON;
				const dep = new ConstDependency("", [isColon ? start - 1 : start, end]);
				module.addPresentationalDependency(dep);
			}

			end = walkCssTokens.consumeUntil(
				input,
				start,
				type === 1
					? {
							identifier(input, start, end) {
								const name = unescapeIdentifier(input.slice(start, end));
								const { line: sl, column: sc } = locConverter.get(start);
								const { line: el, column: ec } = locConverter.get(end);
								const dep = new CssIcssLocalIdentifierDependency(name, [
									start,
									end
								]);
								dep.setLoc(sl, sc, el, ec);
								module.addDependency(dep);

								return end;
							}
						}
					: {},
				{},
				{ onlyTopLevel: true, functionValue: true }
			);

			{
				// Replace the last `)`
				const dep = new ConstDependency("", [end, end + 1]);
				module.addPresentationalDependency(dep);
			}

			return end;
		};

		/**
		 * @param {string} input input
		 * @param {number} end name end position
		 * @param {{ string?: boolean, identifier: boolean, validate?: (name: string) => boolean, dashed?: boolean }} options types which allowed to handle
		 * @returns {number} position after handling
		 */
		const processLocalAtRule = (input, end, options) => {
			/** @type {[number, number, boolean] | undefined} */
			let value;
			let found = false;

			walkCssTokens.consumeUntil(
				input,
				end,
				{
					string(_input, start, end) {
						if (!found && options.string) {
							found = true;
							value = [start, end, true];
						}
						return end;
					},
					identifier(_input, start, end) {
						if (!found && options.identifier) {
							found = true;
							value = [start, end, false];
						}
						return end;
					}
				},
				{
					function(input, start, end) {
						// No need to handle `:` (COLON), because it's always a function
						const name = input
							.slice(start, end - 1)
							.replace(/\\/g, "")
							.toLowerCase();

						const type =
							name === "local" ? 1 : name === "global" ? 2 : undefined;

						if (!found && type) {
							found = true;
							return processLocalOrGlobalFunction(input, type, start, end);
						}

						return end;
					}
				},
				{ onlyTopLevel: true, atRulePrelude: true }
			);
			if (!value) return end;
			let name = value[2]
				? input.slice(value[0] + 1, value[1] - 1)
				: input.slice(value[0], value[1]);
			if (options.validate && !options.validate(name)) return end;
			name = unescapeIdentifier(name);
			const { line: sl, column: sc } = locConverter.get(value[0]);
			const { line: el, column: ec } = locConverter.get(value[1]);
			if (options.dashed) {
				name = name.slice(2);
				declaredCssVariables.add(name);
			}
			const dep = new CssIcssLocalIdentifierDependency(
				name,
				[value[0], value[1]],
				options.dashed ? "--" : ""
			);
			dep.setLoc(sl, sc, el, ec);
			module.addDependency(dep);
			return value[1];
		};
		/**
		 * @param {string} input input
		 * @param {number} end end position
		 * @returns {number} position after handling
		 */
		const processVarFunction = (input, end) => {
			const customIdent = walkCssTokens.eatIdentSequence(input, end);
			if (!customIdent) return end;
			let name = input.slice(customIdent[0], customIdent[1]);
			// A custom property is any property whose name starts with two dashes (U+002D HYPHEN-MINUS), like --foo.
			// The <custom-property-name> production corresponds to this:
			// it’s defined as any <dashed-ident> (a valid identifier that starts with two dashes),
			// except -- itself, which is reserved for future use by CSS.
			if (!name.startsWith("--") || name.length < 3) return end;
			name = unescapeIdentifier(
				input.slice(customIdent[0] + 2, customIdent[1])
			);
			const afterCustomIdent = walkCssTokens.eatWhitespaceAndComments(
				input,
				customIdent[1]
			);
			if (
				input.charCodeAt(afterCustomIdent) === CC_LOWER_F ||
				input.charCodeAt(afterCustomIdent) === CC_UPPER_F
			) {
				const fromWord = walkCssTokens.eatIdentSequence(
					input,
					afterCustomIdent
				);
				if (
					!fromWord ||
					input.slice(fromWord[0], fromWord[1]).toLowerCase() !== "from"
				) {
					return end;
				}
				const from = walkCssTokens.eatIdentSequenceOrString(
					input,
					walkCssTokens.eatWhitespaceAndComments(input, fromWord[1])
				);
				if (!from) {
					return end;
				}
				const path = input.slice(from[0], from[1]);
				if (from[2] === true && path === "global") {
					const dep = new ConstDependency("", [customIdent[1], from[1]]);
					module.addPresentationalDependency(dep);
					return end;
				} else if (from[2] === false) {
					const { line: sl, column: sc } = locConverter.get(customIdent[0]);
					const { line: el, column: ec } = locConverter.get(from[1] - 1);
					const dep = new CssIcssFromIdentifierDependency(
						path.slice(1, -1),
						/** @type {"local" | "global"} */
						(mode),
						[customIdent[0], from[1] - 1],
						name,
						name,
						"--"
					);

					dep.setLoc(sl, sc, el, ec);
					module.addDependency(dep);

					{
						const dep = new ConstDependency("", [fromWord[0], from[1]]);
						module.addPresentationalDependency(dep);
						return end;
					}
				}
			} else {
				const { line: sl, column: sc } = locConverter.get(customIdent[0]);
				const { line: el, column: ec } = locConverter.get(customIdent[1]);
				const dep = new CssIcssSelfLocalIdentifierDependency(
					name,
					undefined,
					[customIdent[0], customIdent[1]],
					"--",
					declaredCssVariables
				);
				dep.setLoc(sl, sc, el, ec);
				module.addDependency(dep);
				return end;
			}

			return end;
		};
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
			if (propertyName.startsWith("--") && propertyName.length >= 3) {
				// CSS Variable
				const { line: sl, column: sc } = locConverter.get(propertyNameStart);
				const { line: el, column: ec } = locConverter.get(propertyNameEnd);
				const name = unescapeIdentifier(propertyName.slice(2));
				const dep = new CssIcssLocalIdentifierDependency(
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
				/** @type {[number, number, boolean][]} */
				const animationNames = [];
				/** @type {Record<string, number>} */
				let parsedAnimationKeywords = Object.create(null);

				const end = walkCssTokens.consumeUntil(
					input,
					pos,
					{
						string(_input, start, end) {
							animationNames.push([start, end, true]);

							return end;
						},
						identifier(input, start, end) {
							const keyword = input.slice(start, end).toLowerCase();

							parsedAnimationKeywords[keyword] =
								typeof parsedAnimationKeywords[keyword] !== "undefined"
									? parsedAnimationKeywords[keyword] + 1
									: 0;

							if (
								ANIMATION_KEYWORDS[keyword] &&
								parsedAnimationKeywords[keyword] < ANIMATION_KEYWORDS[keyword]
							) {
								return end;
							}

							animationNames.push([start, end, false]);
							return end;
						},
						comma(_input, _start, end) {
							parsedAnimationKeywords = {};

							return end;
						}
					},
					{
						function(input, start, end) {
							const name = input
								.slice(start, end - 1)
								.replace(/\\/g, "")
								.toLowerCase();

							if (isLocalMode() && name === "var") {
								return processVarFunction(input, end);
							}

							const type =
								name === "local" ? 1 : name === "global" ? 2 : undefined;

							if (type) {
								return processLocalOrGlobalFunction(input, type, start, end);
							}

							return end;
						}
					},
					{ onlyTopLevel: true, declarationValue: true }
				);

				if (animationNames.length > 0) {
					for (const animationName of animationNames) {
						const { line: sl, column: sc } = locConverter.get(animationName[0]);
						const { line: el, column: ec } = locConverter.get(animationName[1]);
						const [start, end, isString] = animationName;
						const name = unescapeIdentifier(
							isString
								? input.slice(start + 1, end - 1)
								: input.slice(start, end)
						);
						const dep = new CssIcssSelfLocalIdentifierDependency(
							name,
							undefined,
							[start, end]
						);
						dep.setLoc(sl, sc, el, ec);
						module.addDependency(dep);
					}
				}

				return end;
			} else if (COMPOSES_PROPERTY.test(propertyName)) {
				if (lastLocalIdentifiers.length > 1) {
					const end = eatUntilSemi(input, pos);
					this._emitWarning(
						state,
						`Composition is only allowed when selector is single local class name not in "${lastLocalIdentifiers.join('", "')}"`,
						locConverter,
						pos,
						end
					);

					return end;
				}

				if (lastLocalIdentifiers.length !== 1) return pos;

				const lastLocalIdentifier = lastLocalIdentifiers[0];
				let end = pos;

				/** @type {Set<[number, number]>} */
				const classNames = new Set();

				while (true) {
					pos = walkCssTokens.eatWhitespaceAndComments(input, pos);

					let className = walkCssTokens.eatIdentSequence(input, pos);

					const ifFunction =
						className && input.charCodeAt(className[1]) === CC_LEFT_PARENTHESIS;
					let isGlobalFunction = false;

					if (className && ifFunction) {
						const name = input
							.slice(className[0], className[1])
							.replace(/\\/g, "")
							.toLowerCase();

						isGlobalFunction = name === "global";
						pos = walkCssTokens.eatWhitespaceAndComments(
							input,
							className[1] + 1
						);
						className = walkCssTokens.eatIdentSequence(input, pos);
						if (className) {
							pos = walkCssTokens.eatWhitespaceAndComments(input, className[1]);
							pos += 1;
						}
					} else if (className) {
						pos = walkCssTokens.eatWhitespaceAndComments(input, className[1]);
						pos = className[1];
					}

					// True when we have multiple values
					const isComma = input.charCodeAt(pos) === CC_COMMA;
					const isSemicolon = input.charCodeAt(pos) === CC_SEMICOLON;
					const isRightCurly = input.charCodeAt(pos) === CC_RIGHT_CURLY;

					if (isComma || isSemicolon || isRightCurly) {
						if (className) {
							classNames.add(className);
						}

						for (const className of classNames) {
							const [start, end] = className;
							const identifier = unescapeIdentifier(input.slice(start, end));
							const reexport = icssDefinitions.get(identifier);
							const dep = isGlobalFunction
								? new CssIcssGlobalIdentifierDependency(
										lastLocalIdentifier,
										identifier,
										reexport && reexport.isReference
											? reexport.value
											: undefined,
										[start, end]
									)
								: new CssIcssSelfLocalIdentifierDependency(
										lastLocalIdentifier,
										identifier,
										[start, end],
										undefined,
										undefined,
										reexport && reexport.isReference
											? reexport.value
											: undefined
									);
							const { line: sl, column: sc } = locConverter.get(start);
							const { line: el, column: ec } = locConverter.get(end);
							dep.setLoc(sl, sc, el, ec);
							module.addDependency(dep);
						}

						classNames.clear();

						if (isSemicolon || isRightCurly) {
							end = isSemicolon
								? walkCssTokens.eatWhitespace(input, pos + 1)
								: pos;
							break;
						}

						pos += 1;
					} else if (
						classNames.size > 0 &&
						className &&
						input.slice(className[0], className[1]).toLowerCase() === "from"
					) {
						let from = walkCssTokens.eatString(input, pos);

						if (from) {
							const request = input.slice(from[0] + 1, from[1] - 1);

							for (const className of classNames) {
								const [start, end] = className;
								const identifier = unescapeIdentifier(input.slice(start, end));
								const dep = new CssIcssFromIdentifierDependency(
									request,
									/** @type {"local" | "global"} */
									(mode),
									[start, end],
									identifier,
									/** @type {string} */
									(lastLocalIdentifier)
								);
								const { line: sl, column: sc } = locConverter.get(start);
								const { line: el, column: ec } = locConverter.get(end);
								dep.setLoc(sl, sc, el, ec);
								module.addDependency(dep);
							}

							classNames.clear();
							pos = from[1];
						} else {
							from = walkCssTokens.eatIdentSequence(input, pos);

							if (from && input.slice(from[0], from[1]) === "global") {
								for (const className of classNames) {
									const [start, end] = className;
									const identifier = unescapeIdentifier(
										input.slice(start, end)
									);
									const reexport = icssDefinitions.get(identifier);
									const dep = new CssIcssGlobalIdentifierDependency(
										/** @type {string} */
										(lastLocalIdentifier),
										identifier,
										reexport && reexport.isReference
											? reexport.value
											: undefined,
										[start, end]
									);
									const { line: sl, column: sc } = locConverter.get(start);
									const { line: el, column: ec } = locConverter.get(end);
									dep.setLoc(sl, sc, el, ec);
									module.addDependency(dep);
								}

								classNames.clear();
								pos = from[1];
							} else {
								const end = eatUntilSemi(input, pos);
								this._emitWarning(
									state,
									"Incorrect composition, expected global keyword or string value",
									locConverter,
									pos,
									end
								);
								return end;
							}
						}
					} else if (className) {
						classNames.add(className);
					} else {
						const end = eatUntilSemi(input, pos);
						this._emitWarning(
							state,
							"Incorrect composition, expected class named",
							locConverter,
							pos,
							end
						);
						return end;
					}
				}

				// Remove `composes` from source code
				const dep = new ConstDependency("", [propertyNameStart, end]);
				module.addPresentationalDependency(dep);
			}
			return pos;
		};

		/**
		 * @param {string} input input
		 * @param {number} start start position
		 * @param {number} end end position
		 * @returns {number} position after handling
		 */
		const processHashID = (input, start, end) => {
			const valueStart = start + 1;
			const name = unescapeIdentifier(input.slice(valueStart, end));
			const dep = new CssIcssLocalIdentifierDependency(name, [valueStart, end]);
			const { line: sl, column: sc } = locConverter.get(start);
			const { line: el, column: ec } = locConverter.get(end);
			dep.setLoc(sl, sc, el, ec);
			module.addDependency(dep);
			return end;
		};

		walkCssTokens(source, 0, {
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
								lastLocalIdentifiers = [];
							}
						} else if (isModules) {
							isNextRulePrelude = isNextNestedSyntax(input, end);
						}
						break;
					}
				}
				return end;
			},
			url: (input, start, end, contentStart, contentEnd) => {
				if (!this.url) {
					return end;
				}

				return processOldURLFunction(
					input,
					start,
					end,
					contentStart,
					contentEnd
				);
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
						if (!this.import) {
							return eatSemi(input, end);
						}

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

						return processAtImport(input, start, end);
					}
					default: {
						if (isModules) {
							if (name === "@value") {
								return processAtValue(input, start, end);
							} else if (
								OPTIONALLY_VENDOR_PREFIXED_KEYFRAMES_AT_RULE.test(name) &&
								isLocalMode()
							) {
								return processLocalAtRule(input, end, {
									string: true,
									identifier: true
								});
							} else if (name === "@property" && isLocalMode()) {
								return processLocalAtRule(input, end, {
									identifier: true,
									dashed: true,
									validate: (name) => name.startsWith("--") && name.length >= 3
								});
							} else if (name === "@scope") {
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
					isNextRulePrelude = isNextNestedSyntax(input, end);
				}
				return end;
			},
			identifier: (input, start, end) => {
				if (isModules) {
					const name = input.slice(start, end);

					if (icssDefinitions.has(name)) {
						return processICSSSymbol(name, start, end);
					}

					switch (scope) {
						case CSS_MODE_IN_BLOCK: {
							if (isLocalMode()) {
								// Handle only top level values and not inside functions
								return processLocalDeclaration(input, start, end);
							}
							break;
						}
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
					const name = unescapeIdentifier(input.slice(ident[0], ident[1]));
					lastLocalIdentifiers.push(name);
					const dep = new CssIcssLocalIdentifierDependency(name, [
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
					return processHashID(input, start, end);
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
							if (name === "import") {
								const pos = processImportOrExport(0, input, ident[1]);
								const dep = new ConstDependency("", [start, pos]);
								module.addPresentationalDependency(dep);
								return pos;
							} else if (name === "export") {
								const pos = processImportOrExport(1, input, ident[1]);
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
									// Eat extra whitespace
									const end = walkCssTokens.eatWhitespace(input, ident[1] + 1);
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
									// Eat extra whitespace
									const end = walkCssTokens.eatWhitespace(input, ident[1] + 1);
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
						if (!this.url) {
							return end;
						}

						return processURLFunction(input, end, name);
					}
					default: {
						if (this.url && IMAGE_SET_FUNCTION.test(name)) {
							return processImageSetFunction(input, start, end);
						} else if (isLocalMode() && name === "var") {
							return processVarFunction(input, end);
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
					const popped = balanced.pop();

					if (!popped) {
						// Reset stack for `:global .class :local .class-other` selector after
						modeData = undefined;
					}
				}

				lastTokenEndForComments = start;

				return end;
			}
		});

		/** @type {BuildInfo} */
		(module.buildInfo).strict = true;

		const buildMeta = /** @type {BuildMeta} */ (state.module.buildMeta);

		buildMeta.exportsType = this.namedExports ? "namespace" : "default";
		buildMeta.defaultObject = this.namedExports ? false : "redirect-warn";
		buildMeta.exportType = this.exportType;

		if (!buildMeta.exportType) {
			// Inherit exportType from parent module to ensure consistency.
			// When a CSS file is imported with syntax like `import "./basic.css" with { type: "css" }`,
			// the parent module's exportType is set to "css-style-sheet".
			// Child modules imported via @import should inherit this exportType
			// instead of using the default "link", ensuring that the entire
			// import chain uses the same export format.
			const parent = state.compilation.moduleGraph.getIssuer(module);
			if (parent instanceof CssModule) {
				buildMeta.exportType = /** @type {BuildMeta} */ (
					parent.buildMeta
				).exportType;
			}
		}

		// TODO this.namedExports?
		if (
			buildMeta.exportType === "text" ||
			buildMeta.exportType === "css-style-sheet"
		) {
			module.addDependency(new StaticExportsDependency(["default"], true));
		} else {
			module.addDependency(new StaticExportsDependency([], true));
		}

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
	 * @returns {{ options: Record<string, EXPECTED_ANY> | null, errors: (Error & { comment: Comment })[] | null }} result
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
					errors.push(/** @type {(Error & { comment: Comment })} */ (newErr));
				}
			}
		}
		return { options, errors };
	}
}

module.exports = CssParser;
module.exports.escapeIdentifier = escapeIdentifier;
module.exports.unescapeIdentifier = unescapeIdentifier;
