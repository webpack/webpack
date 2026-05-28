/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const path = require("path");
const vm = require("vm");
const { CSS_MODULE_TYPE_AUTO } = require("../ModuleTypeConstants");
const Parser = require("../Parser");
const ConstDependency = require("../dependencies/ConstDependency");
const CssIcssExportDependency = require("../dependencies/CssIcssExportDependency");
const CssIcssImportDependency = require("../dependencies/CssIcssImportDependency");
const CssIcssSymbolDependency = require("../dependencies/CssIcssSymbolDependency");
const CssImportDependency = require("../dependencies/CssImportDependency");
const CssUrlDependency = require("../dependencies/CssUrlDependency");
const StaticExportsDependency = require("../dependencies/StaticExportsDependency");
const CommentCompilationWarning = require("../errors/CommentCompilationWarning");
const ModuleDependencyWarning = require("../errors/ModuleDependencyWarning");
const UnsupportedFeatureWarning = require("../errors/UnsupportedFeatureWarning");
const WebpackError = require("../errors/WebpackError");
const LocConverter = require("../util/LocConverter");
const binarySearchBounds = require("../util/binarySearchBounds");
const { parseResource } = require("../util/identifier");
const {
	createMagicCommentContext,
	webpackCommentRegExp
} = require("../util/magicComment");
const topologicalSort = require("../util/topologicalSort");
const { SourceProcessor, unescapeIdentifier } = require("./walkCssTokens");

// `SourceProcessor` drives the whole parse and hands the already-built AST
// nodes to the visitors, so `CssParser` never re-parses a sub-range — it
// reuses those nodes directly. `unescapeIdentifier` is a pure string utility
// (CSS Syntax 3 §4.3.7). The byte-level source-cursor scans (whitespace /
// comment / newline skipping) are local to this module (see `skipWhitespace`
// & friends below).

/** @typedef {import("../Module").BuildInfo} BuildInfo */
/** @typedef {import("../Module").BuildMeta} BuildMeta */
/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../Parser").PreparsedAst} PreparsedAst */
/** @typedef {import("./walkCssTokens").AtRule} AtRule */
/** @typedef {import("./walkCssTokens").Declaration} Declaration */
/** @typedef {import("./walkCssTokens").FunctionNode} FunctionNode */
/** @typedef {import("./walkCssTokens").Node} AstNode */
/** @typedef {import("./walkCssTokens").QualifiedRule} QualifiedRule */
/** @typedef {import("./walkCssTokens").SimpleBlock} SimpleBlock */
/** @typedef {import("./walkCssTokens").Token} Token */
/** @typedef {import("./walkCssTokens").UrlToken} UrlToken */
/** @typedef {import("./walkCssTokens").HashToken} HashToken */
/** @typedef {import("./walkCssTokens").VisitorContext} VisitorContext */
/** @typedef {import("../../declarations/WebpackOptions").CssAutoOrModuleParserOptions} CssAutoOrModuleParserOptions */
/** @typedef {import("../../declarations/WebpackOptions").CssModuleParserOptions} CssModuleParserOptions */
/** @typedef {import("./CssModule")} CssModule */
/** @typedef {import("./CssModule").Inheritance} Inheritance */

/** @typedef {[number, number]} Range */
/** @typedef {{ line: number, column: number }} Position */
/** @typedef {{ value: string, range: Range, loc: { start: Position, end: Position } }} Comment */

// Per-node-type visitor map for `SourceProcessor#use`. Typing each key to
// its concrete node means the handler bodies see the right node type with
// no casts. Cast to the generic `VisitorMap` at the `use()` call.
/**
 * @template {AstNode} T
 * @typedef {(node: T, parent: AstNode | null, ctx: VisitorContext) => void} Visit
 */
/**
 * @template {AstNode} T
 * @typedef {Visit<T> | { enter?: Visit<T>, exit?: Visit<T> }} VisitBucket
 */
/**
 * @typedef {object} CssVisitors
 * @property {VisitBucket<AtRule>=} AtRule
 * @property {VisitBucket<QualifiedRule>=} QualifiedRule
 * @property {VisitBucket<Declaration>=} Declaration
 * @property {VisitBucket<FunctionNode>=} Function
 * @property {VisitBucket<UrlToken>=} Url
 * @property {VisitBucket<Token>=} Ident
 * @property {VisitBucket<Token>=} Comma
 */

const CC_COLON = ":".charCodeAt(0);
const CC_SEMICOLON = ";".charCodeAt(0);
const CC_TAB = "\t".charCodeAt(0);
const CC_SPACE = " ".charCodeAt(0);
const CC_LINE_FEED = "\n".charCodeAt(0);
const CC_CARRIAGE_RETURN = "\r".charCodeAt(0);
const CC_FORM_FEED = "\f".charCodeAt(0);
const CC_SOLIDUS = "/".charCodeAt(0);
const CC_ASTERISK = "*".charCodeAt(0);
const CC_LEFT_CURLY = "{".charCodeAt(0);

// All spec newline chars (no preprocessing stage, so list them all): https://www.w3.org/TR/css-syntax-3/#newline
const STRING_MULTILINE = /\\[\n\r\f]/g;
// https://www.w3.org/TR/css-syntax-3/#whitespace
const TRIM_WHITE_SPACES = /(^[ \t\n\r\f]*|[ \t\n\r\f]*$)/g;
// Pure-mode magic-comment markers (PostCSS-Modules-Scope semantics):
// `/* cssmodules-pure-ignore */` opts a single rule out of the purity
// check, `/* cssmodules-pure-no-check */` opts the entire file out (only
// honored when placed before the first top-level rule).
const PURE_IGNORE_RE = /^\s*cssmodules-pure-ignore(?:\s|$)/;
const PURE_NO_CHECK_RE = /^\s*cssmodules-pure-no-check(?:\s|$)/;
const UNESCAPE = /\\([0-9a-f]{1,6}[ \t\n\r\f]?|[\s\S])/gi;
const IMAGE_SET_FUNCTION = /^(?:-\w+-)?image-set$/i;
// `parseCommentOptions` fast path — matches a *whole-comment* webpack
// magic comment of the shape `webpackXxx: <bool|number|null>` with only
// whitespace surrounding the pair. The slow `vm.runInContext` path
// still handles every other shape the grammar allows (strings, regexes,
// objects) — and crucially every shape that should *fail* (e.g.
// `***webpackIgnore: false***`, where the leading/trailing `*` make the
// JS-eval reject it and the parser emit a `Compilation error` warning).
const MAGIC_COMMENT_FAST_PATH =
	/^\s*(webpack[A-Z][A-Za-z]+)\s*:\s*(true|false|null|-?\d+(?:\.\d+)?)\s*$/;
const OPTIONALLY_VENDOR_PREFIXED_KEYFRAMES_AT_RULE = /^@(?:-\w+-)?keyframes$/;
const COMPOSES_PROPERTY = /^(?:composes|compose-with)$/i;
const IS_MODULES = /\.modules?\.[^.]+$/i;
const CSS_COMMENT = /\/\*((?!\*\/)[\s\S]*?)\*\//g;

/**
 * Returns matches.
 * @param {RegExp} regexp a regexp
 * @param {string} str a string
 * @returns {RegExpExecArray[]} matches
 */
const matchAll = (regexp, str) => {
	/** @type {RegExpExecArray[]} */
	const result = [];

	/** @type {null | RegExpExecArray} */
	let match;

	while ((match = regexp.exec(str)) !== null) {
		result.push(match);
	}
	// Return an array (not a spec iterator) so callers can spread/iterate it easily.
	return result;
};

/**
 * Returns normalized url.
 * @param {string} str url string
 * @param {boolean} isString is url wrapped in quotes
 * @returns {string} normalized url
 */
const normalizeUrl = (str, isString) => {
	// Remove escaped newlines (line continuations) inside strings, e.g. `url("im\ g.png")`.
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

// Identifier escape/unescape helpers (`escapeIdentifier` /
// `unescapeIdentifier`) and their private regexes have moved to ./CssAst
// so the AST module is a one-stop shop for CSS-syntax-level utilities.
// They are imported above and re-exported at the bottom of this file for
// back-compat with callers (e.g. CssIcssExportDependency) that reach them
// via `getCssParser().escapeIdentifier(...)`.

/**
 * A custom property is any property whose name starts with two dashes (U+002D HYPHEN-MINUS), like --foo.
 * The <custom-property-name> production corresponds to this:
 * it’s defined as any <dashed-ident> (a valid identifier that starts with two dashes),
 * except -- itself, which is reserved for future use by CSS.
 * @param {string} identifier identifier
 * @returns {boolean} true when identifier is dashed, otherwise false
 */
const isDashedIdentifier = (identifier) =>
	identifier.startsWith("--") && identifier.length >= 3;

/** @type {Record<string, number>} */
const PREDEFINED_COUNTER_STYLES = {
	decimal: 1,
	"decimal-leading-zero": 1,
	"arabic-indic": 1,
	armenian: 1,
	"upper-armenian": 1,
	"lower-armenian": 1,
	bengali: 1,
	cambodian: 1,
	khmer: 1,
	"cjk-decimal": 1,
	devanagari: 1,
	georgian: 1,
	gujarati: 1,
	/* cspell:disable-next-line */
	gurmukhi: 1,
	hebrew: 1,
	kannada: 1,
	lao: 1,
	malayalam: 1,
	mongolian: 1,
	myanmar: 1,
	oriya: 1,
	persian: 1,
	"lower-roman": 1,
	"upper-roman": 1,
	tamil: 1,
	telugu: 1,
	thai: 1,
	tibetan: 1,

	"lower-alpha": 1,
	"lower-latin": 1,
	"upper-alpha": 1,
	"upper-latin": 1,
	"lower-greek": 1,
	hiragana: 1,
	/* cspell:disable-next-line */
	"hiragana-iroha": 1,
	katakana: 1,
	/* cspell:disable-next-line */
	"katakana-iroha": 1,

	disc: 1,
	circle: 1,
	square: 1,
	"disclosure-open": 1,
	"disclosure-closed": 1,

	"cjk-earthly-branch": 1,
	"cjk-heavenly-stem": 1,

	"japanese-informal": 1,
	"japanese-formal": 1,

	"korean-hangul-formal": 1,
	/* cspell:disable-next-line */
	"korean-hanja-informal": 1,
	/* cspell:disable-next-line */
	"korean-hanja-formal": 1,

	"simp-chinese-informal": 1,
	"simp-chinese-formal": 1,
	"trad-chinese-informal": 1,
	"trad-chinese-formal": 1,
	"cjk-ideographic": 1,

	"ethiopic-numeric": 1
};

/** @type {Record<string, number>} */
const GLOBAL_VALUES = {
	// Global values
	initial: Infinity,
	inherit: Infinity,
	unset: Infinity,
	revert: Infinity,
	"revert-layer": Infinity
};

/** @type {Record<string, number>} */
const GRID_AREA_OR_COLUMN_OR_ROW = {
	auto: Infinity,
	span: Infinity,
	...GLOBAL_VALUES
};

/** @type {Record<string, number>} */
const GRID_AUTO_COLUMNS_OR_ROW = {
	"min-content": Infinity,
	"max-content": Infinity,
	auto: Infinity,
	...GLOBAL_VALUES
};

/** @type {Record<string, number>} */
const GRID_AUTO_FLOW = {
	row: 1,
	column: 1,
	dense: 1,
	...GLOBAL_VALUES
};

/** @type {Record<string, number>} */
const GRID_TEMPLATE_AREAS = {
	// Special
	none: 1,
	...GLOBAL_VALUES
};

/** @type {Record<string, number>} */
const GRID_TEMPLATE_COLUMNS_OR_ROWS = {
	none: 1,
	subgrid: 1,
	masonry: 1,
	"max-content": Infinity,
	"min-content": Infinity,
	auto: Infinity,
	...GLOBAL_VALUES
};

/** @type {Record<string, number>} */
const GRID_TEMPLATE = {
	...GRID_TEMPLATE_AREAS,
	...GRID_TEMPLATE_COLUMNS_OR_ROWS
};

/** @type {Record<string, number>} */
const GRID = {
	"auto-flow": 1,
	dense: 1,
	...GRID_AUTO_COLUMNS_OR_ROW,
	...GRID_AUTO_FLOW,
	...GRID_TEMPLATE_AREAS,
	...GRID_TEMPLATE_COLUMNS_OR_ROWS
};

/**
 * Gets known properties.
 * @param {{ animation?: boolean, container?: boolean, customIdents?: boolean, grid?: boolean }=} options options
 * @returns {Map<string, Record<string, number>>} list of known properties
 */
const getKnownProperties = (options = {}) => {
	/** @type {Map<string, Record<string, number>>} */
	const knownProperties = new Map();

	if (options.animation) {
		knownProperties.set("animation", {
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
			...GLOBAL_VALUES
		});
		knownProperties.set("animation-name", {
			// Special
			none: Infinity, // No matter how many times you write none, it will never be an animation name
			...GLOBAL_VALUES
		});
	}

	if (options.container) {
		knownProperties.set("container", {
			// container-type
			normal: 1,
			size: 1,
			"inline-size": 1,
			"scroll-state": 1,
			// Special
			none: Infinity,
			...GLOBAL_VALUES
		});
		knownProperties.set("container-name", {
			// Special
			none: Infinity,
			...GLOBAL_VALUES
		});
	}

	if (options.customIdents) {
		knownProperties.set("list-style", {
			// list-style-position
			inside: 1,
			outside: 1,
			// list-style-type
			...PREDEFINED_COUNTER_STYLES,
			// Special
			none: Infinity,
			...GLOBAL_VALUES
		});
		knownProperties.set("list-style-type", {
			// list-style-type
			...PREDEFINED_COUNTER_STYLES,
			// Special
			none: Infinity,
			...GLOBAL_VALUES
		});
		knownProperties.set("system", {
			cyclic: 1,
			numeric: 1,
			alphabetic: 1,
			symbolic: 1,
			additive: 1,
			fixed: 1,
			extends: 1,
			...PREDEFINED_COUNTER_STYLES
		});
		knownProperties.set("fallback", {
			...PREDEFINED_COUNTER_STYLES
		});
		knownProperties.set("speak-as", {
			auto: 1,
			bullets: 1,
			numbers: 1,
			words: 1,
			"spell-out": 1,
			...PREDEFINED_COUNTER_STYLES
		});
	}

	if (options.grid) {
		knownProperties.set("grid", GRID);
		knownProperties.set("grid-area", GRID_AREA_OR_COLUMN_OR_ROW);
		knownProperties.set("grid-column", GRID_AREA_OR_COLUMN_OR_ROW);
		knownProperties.set("grid-column-end", GRID_AREA_OR_COLUMN_OR_ROW);
		knownProperties.set("grid-column-start", GRID_AREA_OR_COLUMN_OR_ROW);
		knownProperties.set("grid-row", GRID_AREA_OR_COLUMN_OR_ROW);
		knownProperties.set("grid-row-end", GRID_AREA_OR_COLUMN_OR_ROW);
		knownProperties.set("grid-row-start", GRID_AREA_OR_COLUMN_OR_ROW);
		knownProperties.set("grid-template", GRID_TEMPLATE);
		knownProperties.set("grid-template-areas", GRID_TEMPLATE_AREAS);
		knownProperties.set("grid-template-columns", GRID_TEMPLATE_COLUMNS_OR_ROWS);
		knownProperties.set("grid-template-rows", GRID_TEMPLATE_COLUMNS_OR_ROWS);
	}

	return knownProperties;
};

const EMPTY_COMMENT_OPTIONS = {
	options: null,
	errors: null
};

// Byte-level source-cursor scans used for computing replacement / strip
// ranges *after* parsing — these intentionally operate on raw source (not
// AST nodes), so a comment can act as a boundary where the AST would not.

/**
 * @param {number} cc char code
 * @returns {boolean} true when `cc` is CSS whitespace (space/tab/newline/CR/FF)
 */
const isCssWhitespace = (cc) =>
	cc === CC_SPACE ||
	cc === CC_TAB ||
	cc === CC_LINE_FEED ||
	cc === CC_CARRIAGE_RETURN ||
	cc === CC_FORM_FEED;

/**
 * @param {string} input source
 * @param {number} pos position
 * @returns {number} position past leading whitespace
 */
const skipWhitespace = (input, pos) => {
	while (isCssWhitespace(input.charCodeAt(pos))) pos++;
	return pos;
};

/**
 * Skip zero or more `/*…*\/` comments, dispatching each consumed comment's
 * `[start, end]` range via `onComment`.
 * @param {string} input source
 * @param {number} pos position
 * @param {((input: string, start: number, end: number) => number)=} onComment optional dispatch
 * @returns {number} position past any leading comments
 */
const skipComments = (input, pos, onComment) => {
	for (;;) {
		const loopStart = pos;
		while (
			input.charCodeAt(pos) === CC_SOLIDUS &&
			input.charCodeAt(pos + 1) === CC_ASTERISK
		) {
			const commentStart = pos;
			pos += 2;
			for (;;) {
				if (pos === input.length) {
					if (onComment) onComment(input, commentStart, pos);
					return pos;
				}
				if (
					input.charCodeAt(pos) === CC_ASTERISK &&
					input.charCodeAt(pos + 1) === CC_SOLIDUS
				) {
					pos += 2;
					break;
				}
				pos++;
			}
			if (onComment) onComment(input, commentStart, pos);
		}
		if (loopStart === pos) break;
	}
	return pos;
};

/**
 * @param {string} input source
 * @param {number} pos position
 * @param {((input: string, start: number, end: number) => number)=} onComment optional callback fired for each consumed comment
 * @returns {[number, boolean]} `[new pos, true if any whitespace was skipped]`
 */
const skipWhitespaceAndComments = (input, pos, onComment) => {
	let foundWhitespace = false;
	for (;;) {
		const originalPos = pos;
		pos = skipComments(input, pos, onComment);
		while (isCssWhitespace(input.charCodeAt(pos))) {
			foundWhitespace = true;
			pos++;
		}
		if (originalPos === pos) break;
	}
	return [pos, foundWhitespace];
};

/**
 * Skip trailing whitespace + at most one newline (CRLF-aware).
 * @param {string} input source
 * @param {number} pos position
 * @returns {number} position past whitespace + one newline
 */
const skipWhiteLine = (input, pos) => {
	for (;;) {
		const cc = input.charCodeAt(pos);
		if (cc === CC_SPACE || cc === CC_TAB) {
			pos++;
			continue;
		}
		if (
			cc === CC_LINE_FEED ||
			cc === CC_CARRIAGE_RETURN ||
			cc === CC_FORM_FEED
		) {
			pos++;
		}
		// Treat CRLF as one newline: a CR followed by LF advances past the LF.
		if (cc === CC_CARRIAGE_RETURN && input.charCodeAt(pos) === CC_LINE_FEED) {
			pos++;
		}
		break;
	}
	return pos;
};

/**
 * @param {string} input source
 * @param {number} pos position
 * @returns {number} position of the next `{`, or EOF if none
 */
const findLeftCurly = (input, pos) => {
	while (pos < input.length) {
		if (input.charCodeAt(pos) === CC_LEFT_CURLY) return pos;
		pos++;
	}
	return pos;
};

/**
 * Defines the css parser own options type used by this module.
 * @typedef {object} CssParserOwnOptions
 * @property {("pure" | "global" | "local" | "auto")=} defaultMode default mode
 */

/** @typedef {CssAutoOrModuleParserOptions & CssParserOwnOptions} CssParserOptions */

class CssParser extends Parser {
	/**
	 * Creates an instance of CssParser.
	 * @param {CssParserOptions=} options options
	 */
	constructor(options = {}) {
		super();
		this.defaultMode =
			typeof options.defaultMode !== "undefined" ? options.defaultMode : "pure";
		this.options = {
			url: true,
			import: true,
			namedExports: true,
			animation: true,
			container: true,
			customIdents: true,
			dashedIdents: true,
			function: true,
			grid: true,
			...options
		};
		/** @type {Comment[] | undefined} */
		this.comments = undefined;
		this.magicCommentContext = createMagicCommentContext();
	}

	/**
	 * Processes the provided state.
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
	 * Emits a build error for the provided range.
	 * @param {ParserState} state parser state
	 * @param {string} message error message
	 * @param {LocConverter} locConverter location converter
	 * @param {number} start start offset
	 * @param {number} end end offset
	 */
	_emitError(state, message, locConverter, start, end) {
		const { line: sl, column: sc } = locConverter.get(start);
		const { line: el, column: ec } = locConverter.get(end);

		const err = new WebpackError(message);
		err.module = state.module;
		err.loc = {
			start: { line: sl, column: sc },
			end: { line: el, column: ec }
		};
		state.module.addError(err);
	}

	/**
	 * Parses the provided source and updates the parser state.
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

		const unescapeIdentifierCached = unescapeIdentifier.bindCache(
			state.compilation.compiler.root
		);

		let mode = this.defaultMode;

		// Reset per-parse: webpack reuses parser instances across
		// modules, so stale comments from a previous parse (with
		// different source positions) would leak into the AST cursor
		// scan and `parseCommentOptions` lookups.
		this.comments = [];

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

		const parsedModuleResource = parseResource(
			/** @type {string} */ (module.getResource())
		);

		/**
		 * Check whether a request points back to the current module
		 * (e.g. `composes: foo from "./self.module.css"` inside `self.module.css`).
		 * Only relative requests are checked — aliases / package / absolute requests
		 * fall through to the normal import path. Requests with a `?query` or
		 * `#fragment` are only treated as self when the parent module's resource
		 * has the same query/fragment, since `NormalModuleFactory` keys modules
		 * on the full resource string.
		 * @param {string} request request string from `from "<request>"`
		 * @returns {boolean} true if request resolves to the current module
		 */
		const isSelfReferenceRequest = (request) => {
			if (!/^\.{1,2}\//.test(request)) return false;
			if (!module.context) return false;
			const parsedRequest = parseResource(request);
			if (parsedRequest.query !== parsedModuleResource.query) return false;
			if (parsedRequest.fragment !== parsedModuleResource.fragment) {
				return false;
			}
			try {
				return (
					path.resolve(module.context, parsedRequest.path) ===
					parsedModuleResource.path
				);
			} catch (_err) {
				return false;
			}
		};

		const knownProperties = getKnownProperties({
			animation: this.options.animation,
			container: this.options.container,
			customIdents: this.options.customIdents,
			grid: this.options.grid
		});

		/** @type {BuildMeta} */
		(module.buildMeta).isCssModule = isModules;
		if (/** @type {CssModule} */ (module).exportType === "style") {
			/** @type {BuildMeta} */
			(module.buildMeta).needIdInConcatenation = true;
		}

		const locConverter = new LocConverter(source);

		// Closure-scope alias for `source` so AST-walking helpers (which
		// take parsed nodes rather than raw `input`/`pos` arguments) can
		// reach into the source for substring extraction. Callback-style
		// helpers still receive `input` via their parameter.
		const input = source;

		let lastTokenEndForComments = 0;
		// Set by the `@import` handler for a malformed `@import` whose prelude
		// should still be scanned for orphan url() deps; read by the at-rule
		// enter to turn the value visitors on for that prelude.
		let importNeedsUrlRecovery = false;

		/** @type {number} */
		let counter = 0;

		const pureMode = isModules && Boolean(this.options.pure);
		/** @type {boolean} */
		let currentSelectorHasLocal = false;
		/** Whether any comma-separated selector in the current rule's prelude was impure. */
		let currentRuleHasImpureSelector = false;
		/** Pure-mode flags (only meaningful when `pureMode` is true). */
		let pureNoCheck = false;
		let pureIgnorePending = false;
		let seenTopLevelRule = false;
		/**
		 * One entry per open block tracking pure-mode check state (skipOwn/skipChildren/ignored/ancestorHadLocal per PCSL semantics).
		 * @type {{
		 * ignored: boolean,
		 * skipOwn: boolean,
		 * skipChildren: boolean,
		 * treatAsLeaf: boolean,
		 * ancestorHadLocal: boolean,
		 * impure: boolean,
		 * hasDirectDecl: boolean,
		 * hasNestedBlock: boolean,
		 * isRulePrelude: boolean,
		 * preludeStart: number,
		 * preludeEnd: number,
		 * }[]}
		 */
		const pureBlockStack = [];

		/**
		 * @returns {(typeof pureBlockStack)[number] | undefined} top of stack
		 */
		const pureTop = () => pureBlockStack[pureBlockStack.length - 1];

		/**
		 * Was the parent rule pure overall (its own selectors pure or any
		 * ancestor pure)? Used both for ancestor-inheritance and `&`-resolution.
		 * @returns {boolean} true if any ancestor (self inclusive) provided a local
		 */
		const parentEffectivePure = () => {
			const top = pureTop();
			return top ? top.ancestorHadLocal : false;
		};

		/**
		 * Marks the just-finished comma-separated selector (or whole prelude
		 * at `{`) as impure if it lacks a local and no ancestor compensates.
		 */
		const finalizeSelector = () => {
			if (!currentSelectorHasLocal && !parentEffectivePure()) {
				currentRuleHasImpureSelector = true;
			}
			currentSelectorHasLocal = false;
		};

		/**
		 * Reports a pure-mode violation covering the entire rule prelude.
		 * @param {number} start prelude start offset
		 * @param {number} end prelude end offset (`{` position)
		 */
		const reportPureRule = (start, end) => {
			const slice = source.slice(start, end);
			const lead = /** @type {RegExpExecArray} */ (
				/^(?:\s|\/\*[\s\S]*?\*\/)*/.exec(slice)
			)[0].length;
			const trail = /** @type {RegExpExecArray} */ (/\s*$/.exec(slice))[0]
				.length;
			const from = start + lead;
			const to = end - trail;
			if (to <= from) return;
			this._emitError(
				state,
				`Selector "${source.slice(
					from,
					to
				)}" is not pure (pure selectors must contain at least one local class or id)`,
				locConverter,
				from,
				to
			);
		};

		/** @typedef {{ value?: string, importName?: string, localName?: string, request?: string }} IcssDefinition */
		/** @type {Map<string, IcssDefinition>} */
		const icssDefinitions = new Map();

		// Graph of `composes: <name> from "<file>"` edges; topologically sorted at end-of-parse to tag each file's first import with cascade-correct `sourceOrder` (port of postcss-modules-extract-imports#138).
		/** @type {Map<string, Set<string>>} */
		const composesGraph = new Map();
		/** @type {Map<string, CssIcssImportDependency>} */
		const composesFirstFileImport = new Map();
		/** @type {string | undefined} */
		let currentRulePrevComposesFile;
		/** @type {Set<string>} */
		const currentRuleComposesFiles = new Set();

		/**
		 * Checks whether this CSS parser is in local mode.
		 *
		 * After the streaming walker was retired (E5b), `:local(…)` /
		 * `:global(…)` mode tracking happens entirely inside
		 * `walkAstSelectorList` (`astModeData` / per-segment
		 * `segmentMode`). At the contexts this helper is still called
		 * from — `walkAstAtRule` for the at-rule prelude scan and a few
		 * helpers that mirror the streaming `case "identifier"` checks
		 * — there's no `:local`/`:global` wrapper around the current
		 * source position, so the answer reduces to the module's
		 * default mode.
		 * @returns {boolean} true when the module's default mode is `local`
		 */
		const isLocalMode = () => mode === "local";

		/**
		 * Streaming-walker comment callback. Pushes every comment-token
		 * the tokenizer hands it (top-level, between-rule, *and* the
		 * ones nested inside at-rules / declarations / functions —
		 * `walkCssTokens` yields a `"comment"` token for each one in
		 * source order, including those the parser's token stream skips
		 * over) onto `this.comments`. The AST walker reads
		 * the list back via `astAdvanceCommentCursor` for pure-mode
		 * `cssmodules-pure-ignore` / `cssmodules-pure-no-check` flag
		 * tracking, and via `parseCommentOptions` for magic-comment
		 * lookups inside the `@import` / `@value` at-rule handling.
		 * @param {string} input input
		 * @param {number} start start
		 * @param {number} end end
		 * @returns {number} end
		 */
		const comment = (input, start, end) => {
			if (!this.comments) this.comments = [];
			const { line: sl, column: sc } = locConverter.get(start);
			const { line: el, column: ec } = locConverter.get(end);
			const value = input.slice(start + 2, end - 2);
			this.comments.push({
				value,
				range: [start, end],
				loc: {
					start: { line: sl, column: sc },
					end: { line: el, column: ec }
				}
			});
			return end;
		};

		/**
		 * Index into `this.comments` consumed by `astAdvanceCommentCursor`
		 * — the AST-walker analogue of the streaming-walker's source-order
		 * comment dispatch. The cursor advances past every comment whose
		 * end falls at or before a given source position, so pure-mode
		 * comment flags (`pureIgnorePending`, `pureNoCheck`) are toggled
		 * in source order without re-tokenizing the input.
		 */
		let astCommentCursor = 0;

		/**
		 * Advance `astCommentCursor` past every comment that closes at or
		 * before `until`, applying the pure-mode comment side effects the
		 * streaming walker's `case "comment"` used to apply on the fly.
		 *
		 * `pureIgnorePending` is set by a `webpackIgnore`-style comment
		 * and consumed by the *next* rule frame push (qualified or
		 * at-rule). `pureNoCheck` is a one-way file-level kill switch
		 * that disables all pure-mode warnings; it can only be flipped on
		 * by a top-level comment that appears before the first top-level
		 * rule (gated on `seenTopLevelRule`, which `runAstWalker` sets
		 * when it begins processing the first top-level rule).
		 * @param {number} until source position to advance the cursor to
		 * @returns {void}
		 */
		const astAdvanceCommentCursor = (until) => {
			if (!this.comments) return;
			while (astCommentCursor < this.comments.length) {
				const c = this.comments[astCommentCursor];
				if (c.range[1] > until) return;
				const v = c.value;
				if (PURE_IGNORE_RE.test(v)) {
					pureIgnorePending = true;
				} else if (PURE_NO_CHECK_RE.test(v) && !seenTopLevelRule) {
					pureNoCheck = true;
				}
				astCommentCursor++;
			}
		};

		// CSS modules stuff

		/**
		 * Returns resolved reexport (localName and importName).
		 * @param {string} value value to resolve
		 * @param {string=} localName override local name
		 * @param {boolean=} isCustomProperty true when it is custom property, otherwise false
		 * @returns {string | [string, string] | [string, string, string]} resolved reexport (`localName`, `importName` and optional `request` of the active `@value` import)
		 */
		const getReexport = (value, localName, isCustomProperty) => {
			const reexport = icssDefinitions.get(
				isCustomProperty ? `--${value}` : value
			);

			if (reexport) {
				if (reexport.importName) {
					const resolvedLocalName =
						reexport.localName || (isCustomProperty ? `--${value}` : value);
					return reexport.request
						? [resolvedLocalName, reexport.importName, reexport.request]
						: [resolvedLocalName, reexport.importName];
				}

				if (isCustomProperty) {
					return /** @type {string} */ (reexport.value).slice(2);
				}

				return /** @type {string} */ (reexport.value);
			}

			if (localName) {
				return [localName, value];
			}

			return value;
		};

		/**
		 * Process import or export, reusing the already-parsed rule nodes.
		 * @param {0 | 1} type import or export
		 * @param {AstNode} second the `import(…)` function / `export` ident node from the prelude
		 * @param {QualifiedRule} rule the `:import` / `:export` qualified rule
		 * @returns {number} position after parse
		 */
		const processImportOrExport = (type, second, rule) => {
			const block = rule.block;
			/** @type {string | undefined} */
			let request;
			if (type === 0) {
				// `:import("path")` — reuse the already-parsed `(...)` args: the
				// `import(…)` function-token's value, or (for the spaced
				// `:import (…)` form) the first `(` simple-block in the prelude.
				/** @type {AstNode[] | undefined} */
				let args;
				if (second.type === "Function") {
					args = /** @type {FunctionNode} */ (second).value;
				} else {
					for (const p of rule.prelude) {
						if (
							p.type === "SimpleBlock" &&
							/** @type {SimpleBlock} */ (p).token === "("
						) {
							args = /** @type {SimpleBlock} */ (p).value;
							break;
						}
					}
				}
				// The first non-whitespace value inside `(...)` must be a string.
				const innerStrToken = args && args.find((v) => v.type !== "Whitespace");
				if (!innerStrToken || innerStrToken.type !== "String") {
					const innerPos =
						second.type === "Function"
							? /** @type {FunctionNode} */ (second).nameRange[1] + 1
							: second.range[1];
					this._emitWarning(
						state,
						`Unexpected '${source[innerPos]}' at ${innerPos} during parsing of ':import' (expected string)`,
						locConverter,
						innerPos,
						innerPos
					);
					return innerPos;
				}
				request = source.slice(
					innerStrToken.range[0] + 1,
					innerStrToken.range[1] - 1
				);
			}

			/**
			 * Creates a dep from the provided name.
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
						value,
						name
					);
					const { line: sl, column: sc } = locConverter.get(start);
					const { line: el, column: ec } = locConverter.get(end);
					dep.setLoc(sl, sc, el, ec);
					module.addDependency(dep);

					icssDefinitions.set(name, {
						importName: value,
						request: /** @type {string} */ (request)
					});
				} else if (type === 1) {
					const dep = new CssIcssExportDependency(name, getReexport(value));
					const { line: sl, column: sc } = locConverter.get(start);
					const { line: el, column: ec } = locConverter.get(end);
					dep.setLoc(sl, sc, el, ec);
					module.addDependency(dep);
				}
			};

			// Body: `{ name1: value1; name2: value2; … }`. The body is the
			// rule's already-parsed `{ … }` block, so we just walk its
			// pre-tokenized children extracting `ident COLON … SEMICOLON?`
			// triples — no re-tokenization of the source.
			if (!block || block.token !== "{") {
				return block ? block.range[1] : second.range[1];
			}
			const items = block.value;
			let i = 0;
			while (i < items.length) {
				// Skip whitespace and stray semicolons between declarations.
				while (
					i < items.length &&
					(items[i].type === "Whitespace" || items[i].type === "Semicolon")
				) {
					i++;
				}
				if (i >= items.length) break;
				// Recovery: skip non-ident heads up to the next `;`.
				if (items[i].type !== "Ident") {
					while (i < items.length && items[i].type !== "Semicolon") i++;
					continue;
				}
				const nameNode = items[i];
				i++;
				while (i < items.length && items[i].type === "Whitespace") i++;
				if (i >= items.length || items[i].type !== "Colon") {
					while (i < items.length && items[i].type !== "Semicolon") i++;
					continue;
				}
				i++;
				while (i < items.length && items[i].type === "Whitespace") i++;
				// Collect value tokens until next top-level `;` (or end of
				// block — the trailing decl in `{a:b; c:d}` has no `;`).
				const valueStartIdx = i;
				while (i < items.length && items[i].type !== "Semicolon") i++;
				let valueLast = i - 1;
				while (
					valueLast >= valueStartIdx &&
					items[valueLast].type === "Whitespace"
				) {
					valueLast--;
				}
				if (valueLast < valueStartIdx) {
					// Empty value — skip without emitting.
					continue;
				}
				const rawStart = items[valueStartIdx].range[0];
				const rawEnd = items[valueLast].range[1];
				createDep(
					source.slice(nameNode.range[0], nameNode.range[1]),
					source.slice(rawStart, rawEnd),
					nameNode.range[1],
					rawEnd
				);
			}

			return skipWhiteLine(source, block.range[1]);
		};

		/** @typedef {{ from: string, items: ({ localName: string, importName: string })[] }} ValueAtRuleImport */
		/** @typedef {{ localName: string, value: string }} ValueAtRuleValue */
		/**
		 * Parses value at rule params.
		 * @param {string} str value at-rule params
		 * @returns {ValueAtRuleImport | ValueAtRuleValue} parsed result
		 */
		const parseValueAtRuleParams = (str) => {
			if (/from(\/\*|\s)(?:[\s\S]+)$/i.test(str)) {
				str = str.replace(CSS_COMMENT, " ").trim().replace(/;$/, "");
				const fromIdx = str.lastIndexOf("from");
				const path = str
					.slice(fromIdx + 5)
					.trim()
					.replace(/['"]/g, "");
				let content = str.slice(0, fromIdx).trim();

				if (content.startsWith("(") && content.endsWith(")")) {
					content = content.slice(1, -1);
				}

				return {
					from: path,
					items: content.split(",").map((item) => {
						item = item.trim();

						if (item.includes(":")) {
							const [local, remote] = item.split(":");

							return { localName: local.trim(), importName: remote.trim() };
						}

						const asParts = item.split(/\s+as\s+/);

						if (asParts.length === 2) {
							return {
								localName: asParts[1].trim(),
								importName: asParts[0].trim()
							};
						}

						return { localName: item, importName: item };
					})
				};
			}

			/** @type {string} */
			let localName;
			/** @type {string} */
			let value;

			const idx = str.indexOf(":");

			if (idx !== -1) {
				localName = str.slice(0, idx).replace(CSS_COMMENT, "").trim();
				value = str.slice(idx + 1);
			} else {
				const mask = str.replace(CSS_COMMENT, (m) => " ".repeat(m.length));
				const idx = mask.search(/\S\s/) + 1;

				localName = str.slice(0, idx).replace(CSS_COMMENT, "").trim();
				value = str.slice(idx + (str[idx] === " " ? 1 : 0));
			}

			if (value.length > 0 && !/^\s+$/.test(value.replace(CSS_COMMENT, ""))) {
				value = value.trim();
			}

			return { localName, value };
		};

		/**
		 * Process a CSS Modules `@value` at-rule — either a value
		 * definition (`@value name: value;` / `@value name value;`) or
		 * a value import (`@value name[, name2 as alias] from "<path>";`).
		 *
		 * Switching to `parseAtRule` gets us proper nesting-aware `;`
		 * detection: the previous `eatUntilSemi` byte-scan didn't respect
		 * string or paren nesting, so `@value foo: "a;b";` (a `;` inside
		 * a string) would truncate at the inner `;` and parse junk. The
		 * AST parser tokenizes the prelude and stops only at the real
		 * top-level `;`.
		 * @param {AtRule} atRule parsed `@value` at-rule
		 * @returns {number} position after handling
		 */
		/**
		 * Emit a `CssIcssSymbolDependency` rewrite for an ident that
		 * resolves to an `@value`-defined ICSS symbol. Source-order
		 * semantics (a reference to a name redefined later in the file
		 * resolves to the *earlier* definition) are preserved because
		 * the AST walker iterates rules in source order, handling each
		 * `@value` at-rule before any later ident / selector walk
		 * (`walkAstSelectorList`) reads `icssDefinitions`.
		 * @param {string} name ICSS symbol name
		 * @param {number} start start position
		 * @param {number} end end position
		 * @returns {number} `end` of the rewritten ident range
		 */
		const emitICSSSymbol = (name, start, end) => {
			const def =
				/** @type {IcssDefinition} */
				(icssDefinitions.get(name));
			const { line: sl, column: sc } = locConverter.get(start);
			const { line: el, column: ec } = locConverter.get(end);
			const dep = new CssIcssSymbolDependency(
				def.localName || name,
				[start, end],
				def.value,
				def.importName,
				def.request
			);
			dep.setLoc(sl, sc, el, ec);
			module.addDependency(dep);
			return end;
		};

		/**
		 * Process a `local(...)` or `global(...)` CSS Modules pseudo-function.
		 * The function call itself (and a leading `:` for the legacy
		 * `:local(` / `:global(` selector form) is replaced with empty by a
		 * presentational dependency, then `local()`'s inner top-level idents
		 * are emitted as ICSS exports — matching css-modules semantics where
		 * `local()` introduces locally-scoped class names.
		 * @param {FunctionNode} fn parsed local/global function node
		 * @param {1 | 2} type 1 = local, 2 = global
		 */
		const processLocalOrGlobalFunction = (fn, type) => {
			// Replace `local(` / `global(` (and a leading `:` for the
			// `:local(`/`:global(` selector form) with empty.
			const isColon = input.charCodeAt(fn.range[0] - 1) === CC_COLON;
			const openEnd = fn.nameRange[1] + 1;
			module.addPresentationalDependency(
				new ConstDependency("", [
					isColon ? fn.range[0] - 1 : fn.range[0],
					openEnd
				])
			);

			if (type === 1) {
				for (const cv of fn.value) {
					if (cv.type !== "Ident") continue;
					let identifier = unescapeIdentifier(/** @type {Token} */ (cv).value);
					const { line: sl, column: sc } = locConverter.get(cv.range[0]);
					const { line: el, column: ec } = locConverter.get(cv.range[1]);
					const isDashedIdent = isDashedIdentifier(identifier);
					if (isDashedIdent) identifier = identifier.slice(2);
					const dep = new CssIcssExportDependency(
						identifier,
						getReexport(identifier),
						[cv.range[0], cv.range[1]],
						true,
						CssIcssExportDependency.EXPORT_MODE.ONCE,
						isDashedIdent
							? CssIcssExportDependency.EXPORT_TYPE.CUSTOM_VARIABLE
							: CssIcssExportDependency.EXPORT_TYPE.NORMAL
					);
					dep.setLoc(sl, sc, el, ec);
					module.addDependency(dep);
				}
			}

			// Replace the closing `)`.
			module.addPresentationalDependency(
				new ConstDependency("", [fn.range[1] - 1, fn.range[1]])
			);
		};

		/**
		 * Process a CSS Modules-aware at-rule whose prelude can introduce a
		 * locally-scoped name — `@keyframes <ident>`, `@counter-style <ident>`,
		 * `@container <ident> …`. Walks the prelude looking for the first
		 * value matching `options`:
		 * `options.string` makes the first `<string-token>` the local name
		 * (used for `@keyframes "anim"` form). `options.identifier` makes the
		 * first `<ident-token>` the local name; when set to a `RegExp`, idents
		 * matching it are *skipped* (used for `@container` to skip the
		 * `none`/`and`/`or`/`not` keywords that aren't user-defined names).
		 * The first top-level `:local(…)`/`:global(…)` function counts as
		 * "found" too and is processed via `processLocalOrGlobalFunction`.
		 *
		 * Top-level `var(…)`/`style(…)` dashed-ident references are processed
		 * for ICSS regardless of whether a local name was already found.
		 * @param {AtRule} atRule parsed at-rule
		 * @param {{ string?: boolean, identifier?: boolean | RegExp }} options
		 * which prelude value kinds count as the local name
		 * @returns {number} position after handling
		 */
		const processLocalAtRule = (atRule, options) => {
			let found = false;
			for (const cv of atRule.prelude) {
				if (cv.type === "Whitespace") continue;

				if (cv.type === "String") {
					if (!found && options.string) {
						const value = unescapeIdentifier(
							input.slice(cv.range[0] + 1, cv.range[1] - 1)
						);
						const { line: sl, column: sc } = locConverter.get(cv.range[0]);
						const { line: el, column: ec } = locConverter.get(cv.range[1]);
						const dep = new CssIcssExportDependency(
							value,
							value,
							[cv.range[0], cv.range[1]],
							true,
							CssIcssExportDependency.EXPORT_MODE.ONCE
						);
						dep.setLoc(sl, sc, el, ec);
						module.addDependency(dep);
						found = true;
						if (pureMode) currentSelectorHasLocal = true;
					}
					continue;
				}

				if (cv.type === "Ident") {
					if (!found && options.identifier) {
						const value = /** @type {Token} */ (cv).value;
						const identifier = unescapeIdentifier(value);
						if (
							options.identifier instanceof RegExp &&
							options.identifier.test(identifier)
						) {
							continue;
						}
						const { line: sl, column: sc } = locConverter.get(cv.range[0]);
						const { line: el, column: ec } = locConverter.get(cv.range[1]);
						const dep = new CssIcssExportDependency(
							identifier,
							getReexport(identifier),
							[cv.range[0], cv.range[1]],
							true,
							CssIcssExportDependency.EXPORT_MODE.ONCE,
							CssIcssExportDependency.EXPORT_TYPE.NORMAL
						);
						dep.setLoc(sl, sc, el, ec);
						module.addDependency(dep);
						found = true;
						if (pureMode) currentSelectorHasLocal = true;
					}
					continue;
				}

				if (cv.type === "Function") {
					const fn = /** @type {FunctionNode} */ (cv);
					const fname = fn.name.replace(/\\/g, "").toLowerCase();
					const type =
						fname === "local" ? 1 : fname === "global" ? 2 : undefined;
					if (!found && type) {
						found = true;
						if (type === 1 && pureMode) currentSelectorHasLocal = true;
						processLocalOrGlobalFunction(fn, type);
						continue;
					}
					if (
						this.options.dashedIdents &&
						isLocalMode() &&
						(fname === "var" || fname === "style")
					) {
						processDashedIdentInVarFunction(fn);
					}
				}
			}
			return atRule.range[1];
		};
		/**
		 * Emit the ICSS export side of a dashed-ident handler — declares
		 * that this module exports the given custom property.
		 * @param {number} identStart start of the `--<name>` ident
		 * @param {number} identEnd end of the ident (exclusive)
		 */
		const emitDashedIdentExport = (identStart, identEnd) => {
			const identifier = unescapeIdentifier(
				input.slice(identStart + 2, identEnd)
			);
			const { line: sl, column: sc } = locConverter.get(identStart);
			const { line: el, column: ec } = locConverter.get(identEnd);
			const dep = new CssIcssExportDependency(
				identifier,
				getReexport(identifier, undefined, true),
				[identStart, identEnd],
				true,
				CssIcssExportDependency.EXPORT_MODE.ONCE,
				CssIcssExportDependency.EXPORT_TYPE.CUSTOM_VARIABLE
			);
			dep.setLoc(sl, sc, el, ec);
			module.addDependency(dep);
		};

		/**
		 * Emit handling for `--<name> from "<path>"` — an ICSS import that
		 * binds the local name to `<name>` in the imported module, plus the
		 * matching export and a presentational dep that strips
		 * ` from "<path>"` from the output so the runtime sees just
		 * `--<name>`.
		 *
		 * The dep ranges end at `sourceEnd - 1` (the closing quote's
		 * position, not past it) — preserved from the pre-AST parser, which
		 * used `from[1] - 1` here.
		 * @param {number} identStart start of the `--<name>` ident
		 * @param {number} identEnd end of the ident
		 * @param {number} fromIdentStart start of the `from` keyword
		 * (used as the lower bound of the presentational strip)
		 * @param {number} sourceEnd position past the closing quote of the
		 * source string
		 * @param {string} pathContent unquoted path between the source's quotes
		 */
		const emitDashedIdentImport = (
			identStart,
			identEnd,
			fromIdentStart,
			sourceEnd,
			pathContent
		) => {
			const identifier = unescapeIdentifier(
				input.slice(identStart + 2, identEnd)
			);
			const { line: sl, column: sc } = locConverter.get(identStart);
			const { line: el, column: ec } = locConverter.get(sourceEnd - 1);
			const localName = `__ICSS_IMPORT_${counter++}__`;

			const importDep = new CssIcssImportDependency(
				pathContent,
				[identStart, sourceEnd - 1],
				/** @type {"local" | "global"} */ (mode),
				identifier,
				localName
			);
			importDep.setLoc(sl, sc, el, ec);
			module.addDependency(importDep);

			const exportDep = new CssIcssExportDependency(
				identifier,
				getReexport(identifier, localName, true),
				[identStart, sourceEnd - 1],
				true,
				CssIcssExportDependency.EXPORT_MODE.ONCE,
				CssIcssExportDependency.EXPORT_TYPE.CUSTOM_VARIABLE
			);
			exportDep.setLoc(sl, sc, el, ec);
			module.addDependency(exportDep);

			module.addPresentationalDependency(
				new ConstDependency("", [fromIdentStart, sourceEnd])
			);
		};

		/**
		 * Emit handling for `--<name> from global` — strip ` from global`
		 * (along with any leading whitespace) and emit **no** ICSS
		 * export, matching the pre-AST parser's behavior: an explicitly-
		 * global custom property isn't a CSS-Modules name.
		 * @param {number} identEnd end of the `--<name>` ident
		 * @param {number} sourceEnd position past the `global` ident
		 */
		const emitDashedIdentFromGlobal = (identEnd, sourceEnd) => {
			module.addPresentationalDependency(
				new ConstDependency("", [identEnd, sourceEnd])
			);
		};

		/**
		 * AST companion to `processDashedIdent`, used when the caller
		 * holds the parsed `FunctionNode` for `var(…)` / `style(…)`. Walks
		 * `fn.value` for the first ident (must be a dashed-ident) and
		 * optionally for the `from <ident|string>` suffix, then dispatches
		 * to the same emission helpers. This is where the `from` syntax
		 * is actually meaningful in CSS Modules — the top-level entry
		 * point keeps the lookahead only as defensive parity.
		 * @param {FunctionNode} fn parsed `var`/`style` function node
		 */
		const processDashedIdentInVarFunction = (fn) => {
			/** @type {Token | undefined} */
			let identNode;
			let identIdx = -1;
			for (let i = 0; i < fn.value.length; i++) {
				const cv = fn.value[i];
				if (cv.type === "Whitespace") continue;
				if (cv.type === "Ident") {
					identNode = /** @type {Token} */ (cv);
					identIdx = i;
				}
				break;
			}
			if (!identNode || !isDashedIdentifier(identNode.value)) return;

			const identStart = identNode.range[0];
			const identEnd = identNode.range[1];

			let j = identIdx + 1;
			while (j < fn.value.length && fn.value[j].type === "Whitespace") j++;

			if (
				j >= fn.value.length ||
				fn.value[j].type !== "Ident" ||
				/** @type {Token} */ (fn.value[j]).value.toLowerCase() !== "from"
			) {
				emitDashedIdentExport(identStart, identEnd);
				return;
			}

			const fromIdent = fn.value[j];
			j++;
			while (j < fn.value.length && fn.value[j].type === "Whitespace") j++;
			if (j >= fn.value.length) return;

			const source = fn.value[j];
			if (
				source.type === "Ident" &&
				/** @type {Token} */ (source).value === "global"
			) {
				emitDashedIdentFromGlobal(identEnd, source.range[1]);
				return;
			}
			if (source.type === "String") {
				emitDashedIdentImport(
					identStart,
					identEnd,
					fromIdent.range[0],
					source.range[1],
					input.slice(source.range[0] + 1, source.range[1] - 1)
				);
			}
		};

		/**
		 * AST walker for CSS Modules' dashed-ident (custom-property)
		 * scoping. Mirrors the streaming walker's two entry points —
		 * `case "identifier"` (called `processDashedIdent` for any
		 * top-level `--foo` ident that wasn't being skipped past) and
		 * `case "function"` (called `processDashedIdent` for any
		 * `--foo(args)` custom-function call) — plus
		 * `processLocalDeclaration`'s `walkFunctions` (called
		 * `processDashedIdentInVarFunction` for `var(--foo)` /
		 * `style(--foo)` inside known-property declarations).
		 *
		 * `emitTopLevelIdents` controls whether bare dashed idents
		 * in this component-value list emit exports. The streaming
		 * walker's `case "identifier"` was skipped past whenever
		 * `processLocalDeclaration` consumed the whole declaration
		 * (known-property path), so top-level idents inside
		 * known-property values were never emitted on their own —
		 * only the first ident of `var(…)` / `style(…)` (via
		 * `processDashedIdentInVarFunction`). Callers pass `true`
		 * for unknown-property declarations and `false` for known
		 * ones.
		 *
		 * Gate (caller): `this.options.dashedIdents && isLocalMode`.
		 * @param {AstNode[]} cvs component values to walk
		 * @param {boolean} emitTopLevelIdents whether bare dashed idents in this list emit exports
		 * @returns {void}
		 */
		const walkDashedIdentsInValue = (cvs, emitTopLevelIdents) => {
			for (let i = 0; i < cvs.length; i++) {
				const cv = cvs[i];
				if (cv.type === "Ident") {
					const identValue = /** @type {Token} */ (cv).value;
					if (emitTopLevelIdents && isDashedIdentifier(identValue)) {
						// `--foo from "./x.css"` / `--foo from global`
						// suffix lookahead — mirrors
						// `processDashedIdentInVarFunction`'s scan for
						// the `from <source>` form. The streaming
						// walker's `case "identifier"` did the same via
						// `processDashedIdent`'s `parseAComponentValue`
						// probe. Strip the suffix tokens (the dashed
						// ident's emit handler is one of the three
						// `emitDashedIdent…` helpers depending on what
						// follows).
						let j = i + 1;
						while (j < cvs.length && cvs[j].type === "Whitespace") j++;
						if (
							j < cvs.length &&
							cvs[j].type === "Ident" &&
							/** @type {Token} */ (cvs[j]).value.toLowerCase() === "from"
						) {
							const fromIdent = cvs[j];
							j++;
							while (j < cvs.length && cvs[j].type === "Whitespace") {
								j++;
							}
							if (j < cvs.length) {
								const sourceNode = cvs[j];
								if (
									sourceNode.type === "Ident" &&
									/** @type {Token} */ (sourceNode).value === "global"
								) {
									emitDashedIdentFromGlobal(cv.range[1], sourceNode.range[1]);
									i = j;
									continue;
								}
								if (sourceNode.type === "String") {
									emitDashedIdentImport(
										cv.range[0],
										cv.range[1],
										fromIdent.range[0],
										sourceNode.range[1],
										source.slice(
											sourceNode.range[0] + 1,
											sourceNode.range[1] - 1
										)
									);
									i = j;
									continue;
								}
							}
						}
						emitDashedIdentExport(cv.range[0], cv.range[1]);
					}
				} else if (cv.type === "Function") {
					const fn = /** @type {FunctionNode} */ (cv);
					const fname = fn.name.replace(/\\/g, "").toLowerCase();
					if (fname === "local" || fname === "global") {
						// `:local(--foo)` / `:global(--foo)` already emit
						// via `walkFunctionsForLocalGlobal` (E4a-1) —
						// don't recurse into the args here or we'd
						// double-emit the inner dashed-ident on top of
						// `processLocalOrGlobalFunction`'s emission.
						continue;
					}
					if (fname === "var" || fname === "style") {
						// `var(--foo, fallback)` / `style(--foo, …)` —
						// emit the first ident with `from` lookahead via
						// the shared helper, then recurse into the
						// fallback expression for any nested `var()` /
						// `--foo()` calls. The fallback's own top-level
						// idents do NOT emit on their own — the
						// streaming walker only fired `case "identifier"`
						// for value idents in unknown-property
						// declarations, and in that case the fallback's
						// idents would be matched at the OUTER walk's
						// top level (not inside `var()`).
						processDashedIdentInVarFunction(fn);
						walkDashedIdentsInValue(fn.value, false);
						continue;
					}
					if (emitTopLevelIdents && isDashedIdentifier(fn.name)) {
						// Custom-function call: `--my-func(args)`. The
						// function's name is the exported dashed-ident.
						// Same `emitTopLevelIdents` gate as bare idents
						// — the streaming walker only fired `case
						// "function"`'s `processDashedIdent` when the
						// surrounding declaration was an unknown
						// property (where `processLocalDeclaration`
						// bailed past the `:`).
						emitDashedIdentExport(fn.nameRange[0], fn.nameRange[1]);
					}
					// Recurse into the function args. Other functions
					// (`linear-gradient`, etc.) are unknown-property-like
					// inside — `case "identifier"` would have fired for
					// any dashed-ident at any nesting depth inside them
					// in the streaming walker, so propagate the caller's
					// `emitTopLevelIdents`.
					walkDashedIdentsInValue(fn.value, emitTopLevelIdents);
				} else if (cv.type === "SimpleBlock") {
					walkDashedIdentsInValue(
						/** @type {SimpleBlock} */ (cv).value,
						emitTopLevelIdents
					);
				}
			}
		};

		/**
		 * Process attribute selector. Emits a `CssIcssExportDependency`
		 * for the class value in `[class="<name>"]` / `[class~="<name>"]`
		 * and is a no-op for any other attribute shape.
		 * @param {string} input input
		 * @param {number} start start position
		 * @param {number} end end position
		 * @returns {void}
		 */
		// === AST-driven parallel walker (steps E1 + E2 of the
		// streaming-walker retirement) ===
		//
		// `parseAStylesheet` consumes the whole source up front and gives
		// us a structural tree of qualified rules + at-rules; this walker
		// recurses over that tree and progressively takes over dep
		// emission from the streaming walker. After E2 the AST walker
		// owns at-rule dispatch (`@import`, `@value`, `@keyframes`,
		// `@counter-style`, `@container`, `@charset`, `@namespace`);
		// E3/E4/E5 will migrate the rest.
		//
		// The streaming walker still runs **after** this; it owns
		// everything not yet migrated. State flags (`isNextRulePrelude`,
		// `inAtRulePrelude`, `nextBlockChildrenSkip`, …) live on the
		// streaming walker — the AST walker only emits deps. To avoid
		// double-emission we strip the migrated dep-emitting code from
		// the streaming walker; what's left there is pure state +
		// position-advancement bookkeeping.
		//
		// `allowAstImport` mirrors the streaming walker's
		// `allowImportAtRule`: starts true, becomes false after the first
		// top-level block-bearing rule. Tracked here independently so
		// the AST walker can run before the streaming walker without
		// reading streaming-walker state.
		//
		// Pre-AST behaviour was driven by `isLocalMode()` which depends
		// on the live `modeData` (a per-token variable mutated by
		// `:local()/:global()`). At the **top level** `modeData` is
		// always undefined, so `isLocalMode()` reduces to
		// `mode === "local"`; that's what we use here. For nested
		// at-rules inside `:local()/:global()` the AST walker uses
		// `mode === "local"` as well — slight divergence from the
		// streaming walker's behaviour that E3 will reconcile when it
		// migrates `:local()/:global()` tracking to the AST walker.
		let allowAstImport = true;
		// Persistent CSS-Modules mode shared across `walkAstSelectorList`
		// calls within a single top-level rule. Mirrors the streaming
		// walker's `modeData`: set by bare `:local` / `:global` ident
		// markers at top-level of a rule's prelude, leaks into nested
		// sibling rules' selectors, and is reset to `undefined` at every
		// top-level `}` (handled in `walkAstBlockContents`). Recursive
		// `walkAstSelectorList` calls (function args, paren wrappers)
		// don't read or write this.
		/** @type {"local" | "global" | undefined} */
		let astModeData;
		// Mirrors the streaming walker's `isNextRulePrelude = false`
		// after a non-AST-handled `;`-terminated at-rule (e.g.
		// `@keyframes broken;` when `animation: false`): the
		// immediately following qualified rule's class selectors are
		// not localized. Set in `walkAstAtRule` and cleared at the
		// start of the next qualified rule's selector walk.
		let astSuppressNextRulePrelude = false;
		// Whether the current rule's prelude declared any local-mode
		// class / id / attribute selector — i.e. whether
		// `lastLocalIdentifiers` would be non-empty in the streaming
		// walker. Used by the declaration walker to detect the
		// "composes-processed" case where the streaming walker's
		// `processLocalDeclaration` emits a strip-dep covering the
		// whole `composes: …;` and any inner ICSS-export rewrite from
		// the AST walker would overlap with that strip.
		let astCurrentRuleHasLocalAnchor = false;
		// AST-side equivalent of the streaming walker's
		// `lastLocalIdentifiers` — the local class / id names emitted
		// by `walkAstSelectorList` for the current rule's selectors,
		// in source order. Composes processing (E4a-3) reads
		// `[0]` as the rule's anchor name and warns when there is
		// more than one. Saved / restored around each
		// `walkAstQualifiedRule` call.
		/** @type {string[]} */
		let astCurrentRuleLocalIdentifiers = [];

		// Value-visitor context: set by a Declaration / at-rule / qualified-
		// rule enter, read by the Url / Function / Ident / Comma visitors
		// (registered in `runAstWalker`) as SourceProcessor walks that
		// node's value / prelude.
		let vUrl = false; // emit url() / src() / image-set() deps
		let vUrlSkip = false; // suppress bare url-token deps
		let vLocalGlobal = false; // emit local() / global() ICSS
		let vIcss = false; // rewrite idents / fn names that are @value-defined
		let vIcssDashedHandled = false; // dashed walk owns dashed-ident rewrites

		/**
		 * Per-at-rule scope frames; `exit` reads `hasBlock` to pick the
		 * block-cleanup vs `astSuppressNextRulePrelude` branch.
		 * @type {{ savedAnchor: boolean, savedLocalIdentifiers: string[], name: string, hasBlock: boolean, endsWithSemicolon: boolean }[]}
		 */
		const atRuleStateStack = [];

		/**
		 * At-rule enter: scope save, name dispatch, prelude value context,
		 * `pureBlockStack` push.
		 * @param {AtRule} at at-rule node
		 * @param {boolean} topLevel whether this at-rule sits at the stylesheet's top level
		 * @returns {void}
		 */
		const walkAstAtRuleEnter = (at, topLevel) => {
			const savedAnchor = astCurrentRuleHasLocalAnchor;
			const savedLocalIdentifiers = astCurrentRuleLocalIdentifiers;
			astCurrentRuleLocalIdentifiers = [...savedLocalIdentifiers];
			const name = `@${at.name.toLowerCase()}`;
			importNeedsUrlRecovery = false;
			switch (name) {
				case "@namespace": {
					this._emitWarning(
						state,
						"'@namespace' is not supported in bundled CSS",
						locConverter,
						at.range[0],
						at.nameRange[1]
					);
					break;
				}
				case "@charset": {
					if (/** @type {CssModule} */ (module).exportType !== "style") {
						const atRuleEnd =
							source.charCodeAt(at.range[1]) === CC_SEMICOLON
								? at.range[1] + 1
								: at.range[1];
						const dep = new ConstDependency("", [at.range[0], atRuleEnd]);
						module.addPresentationalDependency(dep);
						const string = at.prelude.find((v) => v.type !== "Whitespace");
						if (string && string.type === "String") {
							/** @type {BuildInfo} */
							(module.buildInfo).charset = source
								.slice(string.range[0] + 1, string.range[1] - 1)
								.toUpperCase();
						}
					}
					break;
				}
				case "@import": {
					if (!this.options.import) break;
					if (!topLevel || !allowAstImport) {
						this._emitWarning(
							state,
							"Any '@import' rules must precede all other rules",
							locConverter,
							at.range[0],
							at.nameRange[1]
						);
						break;
					}
					const importStart = at.range[0];
					const importNameEnd = at.nameRange[1];
					// We only accept `;`-terminated @import. Block / EOF / `}`
					// ends are silent bails.
					if (source.charCodeAt(at.range[1]) !== CC_SEMICOLON) break;

					// Walk the prelude in spec-canonical order: URL → optional
					// layer → optional supports → media-query tail. Anything that
					// doesn't fit this prefix becomes part of the media query.
					/** @type {AstNode | undefined} */
					let urlNode;
					/** @type {AstNode | undefined} */
					let layerNode;
					/** @type {FunctionNode | undefined} */
					let supportsNode;

					for (const cv of at.prelude) {
						if (cv.type === "Whitespace") continue;

						if (!urlNode) {
							if (cv.type === "Url" || cv.type === "String") {
								urlNode = cv;
								continue;
							}
							if (cv.type === "Function") {
								const fname = /** @type {FunctionNode} */ (cv).name
									.replace(/\\/g, "")
									.toLowerCase();
								if (fname === "url") {
									urlNode = cv;
									continue;
								}
							}
							if (cv.type === "Ident") {
								// CSS Modules: bare ident is a `@value` reference.
								urlNode = cv;
								continue;
							}
							break;
						}

						if (!layerNode && !supportsNode) {
							if (cv.type === "Ident") {
								const ident = /** @type {Token} */ (cv).value
									.replace(/\\/g, "")
									.toLowerCase();
								if (ident === "layer") {
									layerNode = cv;
									continue;
								}
							} else if (cv.type === "Function") {
								const fname = /** @type {FunctionNode} */ (cv).name
									.replace(/\\/g, "")
									.toLowerCase();
								if (fname === "layer") {
									layerNode = cv;
									continue;
								}
							}
						}

						if (
							!supportsNode &&
							cv.type === "Function" &&
							/** @type {FunctionNode} */ (cv).name
								.replace(/\\/g, "")
								.toLowerCase() === "supports"
						) {
							supportsNode = /** @type {FunctionNode} */ (cv);
							continue;
						}

						// First media-query token — stop scanning for the prefix.
						break;
					}

					const semi = at.range[1] + 1; // position past `;`

					if (!urlNode || (urlNode.type === "Ident" && !isModules)) {
						this._emitWarning(
							state,
							`Expected URL in '${input.slice(importStart, semi)}'`,
							locConverter,
							importStart,
							semi
						);
						// A malformed `@import` still emits any orphan url() / src()
						// / image-set() in its prelude as standalone deps — let the
						// at-rule enter turn the url visitors on for this prelude.
						importNeedsUrlRecovery = true;
						break;
					}

					/** @type {string} */
					let url;
					if (urlNode.type === "Ident") {
						// URL given as identifier — resolve via CSS Modules `@value`.
						const identName = /** @type {Token} */ (urlNode).value;
						const def = icssDefinitions.get(identName);
						if (!def) {
							this._emitWarning(
								state,
								`Unknown '@value' identifier '${identName}' in '${input.slice(
									importStart,
									semi
								)}'`,
								locConverter,
								importStart,
								semi
							);
							// Consume the whole at-rule so the unresolved identifier
							// doesn't get re-tokenized and accidentally substituted
							// into a malformed `@import` in the output.
							const dep = new ConstDependency("", [importStart, semi]);
							module.addPresentationalDependency(dep);
							break;
						}
						if (def.value === undefined) {
							this._emitWarning(
								state,
								`'@value' identifier '${identName}' was imported from another module and cannot be used as the URL of '@import' — only locally defined values are supported here`,
								locConverter,
								importStart,
								semi
							);
							const dep = new ConstDependency("", [importStart, semi]);
							module.addPresentationalDependency(dep);
							break;
						}
						const raw = def.value.trim();
						url =
							(raw.startsWith('"') && raw.endsWith('"')) ||
							(raw.startsWith("'") && raw.endsWith("'"))
								? normalizeUrl(raw.slice(1, -1), true)
								: normalizeUrl(raw, false);
					} else if (urlNode.type === "Url") {
						const ut = /** @type {UrlToken} */ (urlNode);
						url = normalizeUrl(
							input.slice(ut.contentStart, ut.contentEnd),
							false
						);
					} else if (urlNode.type === "String") {
						url = normalizeUrl(
							input.slice(urlNode.range[0] + 1, urlNode.range[1] - 1),
							true
						);
					} else {
						// url(...) function — first non-whitespace child is the string.
						/** @type {Token | undefined} */
						let string;
						for (const inner of /** @type {FunctionNode} */ (urlNode).value) {
							if (inner.type === "Whitespace") continue;
							if (inner.type === "String") {
								string = /** @type {Token} */ (inner);
							}
							break;
						}
						if (!string) {
							this._emitWarning(
								state,
								`Expected URL in '${input.slice(importStart, semi)}'`,
								locConverter,
								importStart,
								semi
							);
							break;
						}
						url = normalizeUrl(
							input.slice(string.range[0] + 1, string.range[1] - 1),
							true
						);
					}

					const newline = skipWhiteLine(input, semi);
					const { options, errors: commentErrors } = this.parseCommentOptions([
						importNameEnd,
						urlNode.range[1]
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
							const { line: sl, column: sc } = locConverter.get(importStart);
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
							break;
						}
					}
					if (url.length === 0) {
						const { line: sl, column: sc } = locConverter.get(importStart);
						const { line: el, column: ec } = locConverter.get(newline);
						const dep = new ConstDependency("", [importStart, newline]);
						module.addPresentationalDependency(dep);
						dep.setLoc(sl, sc, el, ec);

						break;
					}

					/** @type {undefined | string} */
					let layer;
					if (layerNode) {
						if (layerNode.type === "Function") {
							// `layer(<ident>)` — extract content between `(` and `)`.
							const fn = /** @type {FunctionNode} */ (layerNode);
							layer = input.slice(fn.nameRange[1] + 1, fn.range[1] - 1).trim();
						} else {
							// Bare `layer` ident — anonymous layer.
							layer = "";
						}
					}

					/** @type {undefined | string} */
					let supports;
					if (supportsNode) {
						supports = input
							.slice(supportsNode.nameRange[1] + 1, supportsNode.range[1] - 1)
							.trim();
					}

					// Media query = whatever sits between the last url/layer/supports
					// part and the closing `;`, trimmed.
					const lastPrefixPart = supportsNode || layerNode || urlNode;
					const mediaStart = skipWhitespaceAndComments(
						input,
						lastPrefixPart.range[1]
					)[0];
					/** @type {undefined | string} */
					let media;
					if (mediaStart !== at.range[1]) {
						media = input.slice(mediaStart, at.range[1]).trim();
					}

					const { line: sl, column: sc } = locConverter.get(importStart);
					const { line: el, column: ec } = locConverter.get(newline);
					const dep = new CssImportDependency(
						url,
						[importStart, newline],
						mode === "local" || mode === "global" ? mode : undefined,
						layer,
						supports && supports.length > 0 ? supports : undefined,
						media && media.length > 0 ? media : undefined
					);
					dep.setLoc(sl, sc, el, ec);
					module.addDependency(dep);
					// `text` and `css-style-sheet` parents inline the imported
					// module's rendered CSS at build time, so register a
					// code-generation dependency to order the subtree before us.
					const exportType = /** @type {import("./CssModule")} */ (module)
						.exportType;
					if (exportType === "text" || exportType === "css-style-sheet") {
						module.addCodeGenerationDependency(dep);
					}
					break;
				}
				default: {
					if (!isModules) break;
					if (name === "@value") {
						const start = at.range[0];
						const nameEnd = at.nameRange[1];
						const semi = at.range[1];
						const atRuleEnd =
							source.charCodeAt(semi) === CC_SEMICOLON ? semi + 1 : semi;
						const params = input.slice(nameEnd, semi);
						const parsed = parseValueAtRuleParams(params);

						if (
							typeof (/** @type {ValueAtRuleImport} */ (parsed).from) !==
							"undefined"
						) {
							if (/** @type {ValueAtRuleImport} */ (parsed).from.length === 0) {
								this._emitWarning(
									state,
									`Broken '@value' at-rule: ${input.slice(start, atRuleEnd)}'`,
									locConverter,
									start,
									atRuleEnd
								);

								const dep = new ConstDependency("", [start, atRuleEnd]);
								module.addPresentationalDependency(dep);
								break;
							}

							let { from, items } = /** @type {ValueAtRuleImport} */ (parsed);

							for (const { importName, localName } of items) {
								{
									const reexport = icssDefinitions.get(from);

									if (reexport && reexport.value) {
										from = reexport.value.slice(1, -1);
									}

									const dep = new CssIcssImportDependency(
										from,
										[0, 0],
										/** @type {"local" | "global"} */
										(mode),
										importName,
										localName
									);
									const { line: sl, column: sc } = locConverter.get(start);
									const { line: el, column: ec } = locConverter.get(nameEnd);
									dep.setLoc(sl, sc, el, ec);
									module.addDependency(dep);

									icssDefinitions.set(localName, { importName, request: from });
								}

								{
									const dep = new CssIcssExportDependency(
										localName,
										getReexport(localName),
										undefined,
										false,
										CssIcssExportDependency.EXPORT_MODE.REPLACE
									);
									const { line: sl, column: sc } = locConverter.get(start);
									const { line: el, column: ec } = locConverter.get(nameEnd);
									dep.setLoc(sl, sc, el, ec);
									module.addDependency(dep);
								}
							}
						} else {
							if (
								/** @type {ValueAtRuleValue} */ (parsed).localName.length === 0
							) {
								this._emitWarning(
									state,
									`Broken '@value' at-rule: ${input.slice(start, atRuleEnd)}'`,
									locConverter,
									start,
									atRuleEnd
								);

								const dep = new ConstDependency("", [start, atRuleEnd]);
								module.addPresentationalDependency(dep);
								break;
							}

							const { localName, value } = /** @type {ValueAtRuleValue} */ (
								parsed
							);
							const { line: sl, column: sc } = locConverter.get(start);
							const { line: el, column: ec } = locConverter.get(nameEnd);

							if (icssDefinitions.has(value)) {
								const def =
									/** @type {IcssDefinition} */
									(icssDefinitions.get(value));

								def.localName = value;

								icssDefinitions.set(localName, def);

								const dep = new CssIcssExportDependency(
									localName,
									getReexport(value)
								);
								dep.setLoc(sl, sc, el, ec);
								module.addDependency(dep);
							} else {
								icssDefinitions.set(localName, { value });

								const dep = new CssIcssExportDependency(localName, value);
								dep.setLoc(sl, sc, el, ec);
								module.addDependency(dep);
							}
						}

						const dep = new ConstDependency("", [start, atRuleEnd]);
						module.addPresentationalDependency(dep);
						break;
					} else if (
						this.options.animation &&
						OPTIONALLY_VENDOR_PREFIXED_KEYFRAMES_AT_RULE.test(name)
					) {
						processLocalAtRule(at, {
							string: mode === "local",
							identifier: mode === "local"
						});
					} else if (this.options.customIdents && name === "@counter-style") {
						processLocalAtRule(at, {
							identifier: mode === "local"
						});
					} else if (this.options.container && name === "@container") {
						processLocalAtRule(at, {
							identifier: mode === "local" ? /^(none|and|or|not)$/ : false
						});
					}
				}
			}

			// `@scope (.x) to (.y)` — the prelude is a selector list, so
			// emit ID / attribute deps for the parenthesised selectors
			// (and recurse into `:local(…)` etc.).
			if (
				isModules &&
				`@${at.name.toLowerCase()}` === "@scope" &&
				at.prelude.length > 0
			) {
				walkAstSelectorList(
					at.prelude,
					/** @type {"local" | "global"} */ (
						mode === "local" ? "local" : "global"
					)
				);
			}

			// Prelude value-visitor context. AST-handled at-rules
			// (`@import` / `@charset` / `@value` / localized `@keyframes` …)
			// already emit their own deps, so they're excluded from the
			// `local()` / `global()` / ICSS walks to avoid double-emission.
			// `@import` url() is the import target (handled by the `@import`
			// case above), so url isn't walked here unless the import was
			// malformed (`importNeedsUrlRecovery`).
			const effectiveLocalMode = astModeData
				? astModeData === "local"
				: mode === "local";
			const isProcessedByLocalAtRule =
				name === "@import" ||
				name === "@charset" ||
				name === "@namespace" ||
				name === "@value" ||
				name === "@scope" ||
				(isModules &&
					((this.options.animation &&
						OPTIONALLY_VENDOR_PREFIXED_KEYFRAMES_AT_RULE.test(name)) ||
						(this.options.customIdents && name === "@counter-style") ||
						(this.options.container && name === "@container")));
			vUrl = vUrlSkip = vLocalGlobal = vIcss = vIcssDashedHandled = false;
			// `@import` url() is the import target (handled by the `@import`
			// case) — only walk its prelude for url deps when the import was
			// malformed and that handler set `importNeedsUrlRecovery`.
			if (this.options.url && (name !== "@import" || importNeedsUrlRecovery)) {
				vUrl = true;
				lastTokenEndForComments = at.nameRange[1];
			}
			if (isModules && !isProcessedByLocalAtRule) vLocalGlobal = true;
			if (isModules && name !== "@value" && name !== "@import") {
				vIcss = true;
				vIcssDashedHandled = Boolean(
					this.options.dashedIdents &&
					!isProcessedByLocalAtRule &&
					effectiveLocalMode
				);
			}
			// Dashed-ident emission (kept inline — `from <source>` lookahead).
			if (
				this.options.dashedIdents &&
				isModules &&
				!isProcessedByLocalAtRule &&
				effectiveLocalMode &&
				at.prelude.length > 0
			) {
				walkDashedIdentsInValue(at.prelude, true);
			}

			// Pure-mode: at-rules in pure local mode for `@keyframes` /
			// `@counter-style` / `@container` get their bodies marked
			// "skip" / "treat as leaf".
			let atSkipChildren = false;
			let atTreatAsLeaf = false;
			if (
				pureMode &&
				isModules &&
				isLocalMode() &&
				(OPTIONALLY_VENDOR_PREFIXED_KEYFRAMES_AT_RULE.test(name) ||
					name === "@counter-style" ||
					name === "@container")
			) {
				if (
					OPTIONALLY_VENDOR_PREFIXED_KEYFRAMES_AT_RULE.test(name) ||
					name === "@counter-style"
				) {
					atSkipChildren = true;
					atTreatAsLeaf = true;
				}
				/** @type {RegExp | null} */
				const identSkip = name === "@container" ? /^(none|and|or|not)$/ : null;
				const acceptIdent =
					OPTIONALLY_VENDOR_PREFIXED_KEYFRAMES_AT_RULE.test(name) ||
					name === "@counter-style" ||
					name === "@container";
				const acceptString =
					OPTIONALLY_VENDOR_PREFIXED_KEYFRAMES_AT_RULE.test(name);
				for (const cv of at.prelude) {
					if (cv.type === "Whitespace") continue;
					if (cv.type === "String") {
						if (acceptString) currentSelectorHasLocal = true;
						break;
					}
					if (cv.type === "Ident") {
						if (!acceptIdent) break;
						const text = source.slice(cv.range[0], cv.range[1]);
						if (identSkip && identSkip.test(text)) continue;
						currentSelectorHasLocal = true;
						break;
					}
					if (cv.type === "Function") {
						const fname = /** @type {FunctionNode} */ (cv).name
							.replace(/\\/g, "")
							.toLowerCase();
						if (fname === "local") currentSelectorHasLocal = true;
						break;
					}
				}
			}

			// pureBlockStack push for block-bearing at-rules.
			if (at.block && pureMode) {
				const isAtRulePrelude =
					OPTIONALLY_VENDOR_PREFIXED_KEYFRAMES_AT_RULE.test(name) ||
					name === "@counter-style" ||
					name === "@container" ||
					name === "@scope";
				if (isAtRulePrelude) finalizeSelector();
				const top = pureTop();
				const inheritedSkip = top ? top.skipChildren : false;
				pureBlockStack.push({
					ignored: pureIgnorePending,
					skipOwn: inheritedSkip,
					skipChildren: atSkipChildren || inheritedSkip,
					treatAsLeaf: atTreatAsLeaf,
					ancestorHadLocal:
						parentEffectivePure() ||
						(isAtRulePrelude && !currentRuleHasImpureSelector),
					impure: isAtRulePrelude && currentRuleHasImpureSelector,
					hasDirectDecl: false,
					hasNestedBlock: false,
					isRulePrelude: isAtRulePrelude,
					preludeStart: at.range[0],
					preludeEnd: at.block.range[0]
				});
				if (top) top.hasNestedBlock = true;
				pureIgnorePending = false;
				currentSelectorHasLocal = false;
				currentRuleHasImpureSelector = false;
			}

			atRuleStateStack.push({
				savedAnchor,
				savedLocalIdentifiers,
				name,
				hasBlock: Boolean(at.block),
				endsWithSemicolon: source.charCodeAt(at.range[1]) === CC_SEMICOLON
			});
		};

		/**
		 * At-rule exit: pure-frame finalization (block at-rules),
		 * `astSuppressNextRulePrelude` for unrecognized `;`-at-rules,
		 * scope restore.
		 * @returns {void}
		 */
		const walkAstAtRuleExit = () => {
			const state = atRuleStateStack.pop();
			if (!state) return;
			if (state.hasBlock) {
				if (pureMode) {
					const frame = pureBlockStack.pop();
					if (frame) {
						if (
							!pureNoCheck &&
							!frame.ignored &&
							!frame.skipOwn &&
							frame.isRulePrelude &&
							frame.impure &&
							(frame.hasDirectDecl ||
								!frame.hasNestedBlock ||
								frame.treatAsLeaf)
						) {
							reportPureRule(frame.preludeStart, frame.preludeEnd);
						}
						if (!frame.isRulePrelude && frame.hasDirectDecl) {
							const parent = pureTop();
							if (parent) parent.hasDirectDecl = true;
						}
					}
				}
			} else if (
				isModules &&
				state.endsWithSemicolon &&
				state.name !== "@import" &&
				state.name !== "@charset" &&
				state.name !== "@namespace" &&
				state.name !== "@value" &&
				!(
					this.options.animation &&
					OPTIONALLY_VENDOR_PREFIXED_KEYFRAMES_AT_RULE.test(state.name)
				) &&
				!(this.options.customIdents && state.name === "@counter-style") &&
				!(this.options.container && state.name === "@container")
			) {
				astSuppressNextRulePrelude = true;
			}
			astCurrentRuleHasLocalAnchor = state.savedAnchor;
			astCurrentRuleLocalIdentifiers = state.savedLocalIdentifiers;
		};

		/**
		 * Walk a list of component values as a selector list, emitting
		 * ID / attribute selector deps and recursing into the function-
		 * shaped selector constructs (`:not(…)`, `:is(…)`, …) and the
		 * CSS-Modules-specific `:local(…)` / `:global(…)` (and bare
		 * `local(…)` / `global(…)`) wrappers. Class selectors are *not*
		 * yet migrated — they push to `lastLocalIdentifiers` which the
		 * streaming walker consumes during `composes:` declaration
		 * parsing, and that hand-off needs the metadata-map plumbing
		 * earmarked for E3b.
		 *
		 * `localMode` is the effective CSS-Modules mode for this
		 * sub-tree: `"local"` (renames target idents) or `"global"`
		 * (passes them through). Resets at each top-level `,` segment
		 * boundary so `:local(.a), .b` doesn't bleed into `.b`'s
		 * scope. Matches the streaming walker's `modeData` stack: bare
		 * `:local`/`:global` mark for the rest of the current segment,
		 * function forms scope only their args.
		 *
		 * `topLevel=true` means a top-level selector list — commas reset
		 * the mode back to `localMode` (matching the streaming walker's
		 * top-level `comma:` reset of `modeData`). Recursive calls into
		 * function args (`:not(…)`, `:is(…)`, `:local(…)`, `:global(…)`,
		 * …) pass `topLevel=false` so commas inside the wrapper *don't*
		 * reset — the streaming walker's `comma:` only resets when the
		 * `balanced` stack is empty, i.e. outside any parentheses.
		 * @param {AstNode[]} values component values to walk
		 * @param {"local" | "global"} localMode CSS-Modules mode applicable to this sub-tree
		 * @param {boolean=} topLevel whether commas in this list reset to `localMode` (defaults to `true`)
		 * @returns {void}
		 */
		const walkAstSelectorList = (values, localMode, topLevel = true) => {
			// At top level of a rule's prelude, inherit the persistent
			// `astModeData` so nested-rule selectors see the parent
			// rule's trailing `:local`/`:global` ident mode. Recursive
			// calls (function args, paren wrappers) use the
			// caller-passed `localMode` directly — they're scoped.
			//
			// `astSuppressNextRulePrelude` is a one-shot override set by
			// `walkAstAtRule` for non-AST-handled `;`-terminated
			// at-rules: the very next prelude is treated as `"global"`
			// (so class selectors aren't localized), matching the
			// streaming walker's `isNextRulePrelude = false` window.
			let segmentMode = localMode;
			if (topLevel) {
				if (astSuppressNextRulePrelude) {
					segmentMode = "global";
					astSuppressNextRulePrelude = false;
				} else if (astModeData) {
					segmentMode = astModeData;
				}
			}
			for (let i = 0; i < values.length; i++) {
				const v = values[i];
				if (v.type === "Comma") {
					if (topLevel) {
						// Top-level comma resets both the per-segment mode
						// and the persistent `astModeData` — matches the
						// streaming walker's `comma:` reset of `modeData`
						// when `balanced.length === 0`.
						segmentMode = localMode;
						astModeData = undefined;
						// Pure-mode: a top-level comma closes one
						// comma-separated selector segment. Mirror the
						// streaming walker's `case "comma"` →
						// `finalizeSelector()` call so a per-segment
						// impure check accumulates into
						// `currentRuleHasImpureSelector`.
						if (pureMode) finalizeSelector();
					}
					continue;
				}
				if (v.type === "Whitespace") continue;
				// Pure-mode: `&` in a prelude marks the current segment
				// as pure when an ancestor is pure (CSS nesting parent
				// reference inherits the parent rule's purity). Mirrors
				// the streaming walker's `case "delim"` `&` branch.
				if (
					topLevel &&
					pureMode &&
					v.type === "Delim" &&
					/** @type {Token} */ (v).value === "&" &&
					parentEffectivePure()
				) {
					currentSelectorHasLocal = true;
				}
				if (v.type === "Colon") {
					// Look ahead for `:local` / `:global` markers.
					const next = values[i + 1];
					if (!next) continue;
					if (next.type === "Ident") {
						const id = /** @type {Token} */ (next).value.toLowerCase();
						if (id === "local" || id === "global") {
							// Bare `:local` / `:global` — mode change for
							// the rest of this segment, and (at top-level)
							// also leaks into the persistent
							// `astModeData` so the body's nested rules
							// inherit it. Emit a strip dep covering the
							// `:local`/`:global` marker plus the trailing
							// whitespace that the spec requires. Use
							// `skipWhitespace` (not the AST whitespace
							// nodes) so a comment between `:local` and
							// the next selector stops the strip and
							// stays in the output, matching the streaming
							// walker's `colon:` emission.
							const stripEnd = skipWhitespace(source, next.range[1]);
							if (isModules) {
								module.addPresentationalDependency(
									new ConstDependency("", [v.range[0], stripEnd])
								);
							}
							// Bare `:local` / `:global` requires a space
							// before the next selector — `:local.b` is
							// ambiguous with a pseudo-class call. Warn
							// when *no* whitespace follows the ident
							// (a comment alone doesn't count, but a
							// comment plus whitespace does). Mirrors
							// the streaming walker's `case "colon"`
							// `skipWhitespaceAndComments` probe of
							// `foundWhitespace`.
							const probe = skipWhitespaceAndComments(source, next.range[1]);
							if (!probe[1]) {
								this._emitWarning(
									state,
									`Missing whitespace after ':${id}' in '${source.slice(
										v.range[0],
										findLeftCurly(source, next.range[1]) + 1
									)}'`,
									locConverter,
									v.range[0],
									next.range[1]
								);
							}
							segmentMode = id;
							if (topLevel) astModeData = id;
							// Skip past the colon + ident; the surrounding
							// whitespace nodes are harmless to revisit.
							i += 1;
							continue;
						}
					} else if (next.type === "Function") {
						const fname = /** @type {FunctionNode} */ (next).name
							.replace(/\\/g, "")
							.toLowerCase();
						if (fname === "local" || fname === "global") {
							// `:local(…)` / `:global(…)` — scope mode to args only.
							// Emit two strip deps to remove the wrapper:
							//   * `:local(`/`:global(` + leading whitespace
							//     and comments inside the parens.
							//   * for `:local`, the trailing whitespace
							//     before `)` plus `)` itself; for
							//     `:global`, just `)`.
							// Use source-level whitespace walks (not AST
							// whitespace nodes) so comments adjacent to
							// the args aren't accidentally stripped —
							// matches the streaming walker's `colon:` +
							// `rightParenthesis:` emissions exactly.
							const fn = /** @type {FunctionNode} */ (next);
							if (isModules) {
								// `:local(`/`:global(` length is `fname.length + 2`
								// (`:` + name + `(`), so the position
								// just past the `(` is `fn.nameRange[1] + 1`.
								const afterParen = fn.nameRange[1] + 1;
								const stripLeadEnd = skipWhitespaceAndComments(
									source,
									afterParen
								)[0];
								module.addPresentationalDependency(
									new ConstDependency("", [v.range[0], stripLeadEnd])
								);
								// Trailing: `:local` strips whitespace
								// before `)`; `:global` strips only `)`.
								let trailStart = fn.range[1] - 1; // position of `)`
								if (fname === "local") {
									while (
										trailStart > 0 &&
										isCssWhitespace(source.charCodeAt(trailStart - 1))
									) {
										trailStart--;
									}
								}
								module.addPresentationalDependency(
									new ConstDependency("", [trailStart, fn.range[1]])
								);
							}
							walkAstSelectorList(
								/** @type {FunctionNode} */ (next).value,
								/** @type {"local" | "global"} */ (fname),
								false
							);
							i += 1;
							continue;
						}
					}
					continue;
				}
				if (v.type === "Function") {
					// Selector-container functions (`:not(…)`, `:is(…)`,
					// `:has(…)`, `:where(…)`, …) and any other function:
					// recurse with the current segment mode preserved.
					// Bare `local(…)` / `global(…)` without the leading
					// `:` are *not* mode-switching wrappers — the
					// streaming walker's `function:` case only triggers
					// mode switching for declaration-value contexts
					// (`!isNextRulePrelude`), not for selectors. Only
					// `:local(…)` / `:global(…)` (handled in the `colon`
					// branch above) switch mode here.
					walkAstSelectorList(
						/** @type {FunctionNode} */ (v).value,
						segmentMode,
						false
					);
					continue;
				}
				if (
					v.type === "Hash" &&
					/** @type {HashToken} */ (v).id &&
					segmentMode === "local"
				) {
					// ID selectors emit the ICSS export but, matching the
					// streaming walker, do *not* count as a local "class
					// name" anchor for `composes:` — they don't push to
					// `lastLocalIdentifiers`, so a `:local(#x) { composes:
					// y; }` rule is silently ignored by composes resolution.
					const idValueStart = v.range[0] + 1;
					const idName = unescapeIdentifierCached(
						source.slice(idValueStart, v.range[1])
					);
					const idDep = new CssIcssExportDependency(
						idName,
						getReexport(idName),
						[idValueStart, v.range[1]],
						true,
						CssIcssExportDependency.EXPORT_MODE.ONCE
					);
					const { line: idSl, column: idSc } = locConverter.get(v.range[0]);
					const { line: idEl, column: idEc } = locConverter.get(v.range[1]);
					idDep.setLoc(idSl, idSc, idEl, idEc);
					module.addDependency(idDep);
					if (pureMode) currentSelectorHasLocal = true;
					continue;
				}
				if (
					v.type === "SimpleBlock" &&
					/** @type {SimpleBlock} */ (v).token === "[" &&
					segmentMode === "local"
				) {
					// Attribute selectors (`[class="foo"]` / `[class~="foo"]`)
					// emit the ICSS export without counting as a composes anchor
					// (they don't push to `lastLocalIdentifiers`). No-op for any
					// other attribute shape. Walk the `[…]` simple-block's
					// already-parsed children — `class`, the `=` / `~=` operator,
					// then the value — instead of re-tokenizing the source.
					const attrParts = /** @type {SimpleBlock} */ (v).value;
					let ai = 0;
					while (ai < attrParts.length && attrParts[ai].type === "Whitespace") {
						ai++;
					}
					const attrNameNode = attrParts[ai];
					if (!attrNameNode || attrNameNode.type !== "Ident") continue;
					const attrName = unescapeIdentifier(
						source.slice(attrNameNode.range[0], attrNameNode.range[1])
					);
					if (attrName.toLowerCase() !== "class") continue;
					ai++;
					while (ai < attrParts.length && attrParts[ai].type === "Whitespace") {
						ai++;
					}
					// `=` or `~=` (two `Delim` tokens for the latter).
					const op1 = attrParts[ai];
					if (!op1 || op1.type !== "Delim") continue;
					const op1v = /** @type {Token} */ (op1).value;
					if (op1v === "~") {
						ai++;
						const op2 = attrParts[ai];
						if (
							!op2 ||
							op2.type !== "Delim" ||
							/** @type {Token} */ (op2).value !== "="
						) {
							continue;
						}
					} else if (op1v !== "=") {
						continue;
					}
					ai++;
					while (ai < attrParts.length && attrParts[ai].type === "Whitespace") {
						ai++;
					}
					const attrValueNode = attrParts[ai];
					if (!attrValueNode) continue;
					/** @type {number} */
					let classNameStart;
					/** @type {number} */
					let classNameEnd;
					if (attrValueNode.type === "String") {
						classNameStart = attrValueNode.range[0] + 1;
						classNameEnd = attrValueNode.range[1] - 1;
					} else if (attrValueNode.type === "Ident") {
						classNameStart = attrValueNode.range[0];
						classNameEnd = attrValueNode.range[1];
					} else {
						continue;
					}
					const className = unescapeIdentifier(
						source.slice(classNameStart, classNameEnd)
					);
					const attrDep = new CssIcssExportDependency(
						className,
						getReexport(className),
						[classNameStart, classNameEnd],
						true,
						CssIcssExportDependency.EXPORT_MODE.NONE
					);
					const { line: sl, column: sc } = locConverter.get(classNameStart);
					const { line: el, column: ec } = locConverter.get(classNameEnd);
					attrDep.setLoc(sl, sc, el, ec);
					module.addDependency(attrDep);
					continue;
				}
				// `@scope (.foo)` and other parenthesised selector wrappers —
				// the `(…)` is a simple-block whose values are themselves a
				// selector list. Recurse with the current segment mode.
				if (
					v.type === "SimpleBlock" &&
					/** @type {SimpleBlock} */ (v).token === "("
				) {
					walkAstSelectorList(
						/** @type {SimpleBlock} */ (v).value,
						segmentMode,
						false
					);
					continue;
				}
				// E3b: `.` delim followed by an ident is a class selector.
				// The dep range covers the ident's bytes only (excluding
				// the `.`). `lastLocalIdentifiers` push and the pure-mode
				// `currentSelectorHasLocal` flag still live in the
				// streaming walker's `processClassSelector` because
				// `composes:` resolution and `leftCurlyBracket:`'s
				// pure-mode dispatch both read them synchronously,
				// before this AST pass runs.
				if (
					v.type === "Delim" &&
					/** @type {Token} */ (v).value === "." &&
					segmentMode === "local"
				) {
					const next = values[i + 1];
					if (next && next.type === "Ident") {
						const name = unescapeIdentifier(
							source.slice(next.range[0], next.range[1])
						);
						const dep = new CssIcssExportDependency(
							name,
							getReexport(name),
							[next.range[0], next.range[1]],
							true,
							CssIcssExportDependency.EXPORT_MODE.ONCE
						);
						const { line: sl, column: sc } = locConverter.get(next.range[0]);
						const { line: el, column: ec } = locConverter.get(next.range[1]);
						dep.setLoc(sl, sc, el, ec);
						module.addDependency(dep);
						astCurrentRuleHasLocalAnchor = true;
						astCurrentRuleLocalIdentifiers.push(name);
						if (pureMode) currentSelectorHasLocal = true;
						i += 1;
					}
					continue;
				}
				// E4e: ICSS-symbol rewrite for `.<ident>` in *global*
				// mode. The class-selector branch above only fires for
				// `local`; in `global` mode the class isn't localized,
				// but the `<ident>` may still be `@value`-defined and
				// need the same `var(--…)` / @value-value replacement the
				// streaming walker's `case "identifier"` used to emit.
				if (
					v.type === "Delim" &&
					/** @type {Token} */ (v).value === "." &&
					segmentMode === "global"
				) {
					const next = values[i + 1];
					if (next && next.type === "Ident") {
						const ident = /** @type {Token} */ (next).value;
						if (!isDashedIdentifier(ident) && icssDefinitions.has(ident)) {
							emitICSSSymbol(ident, next.range[0], next.range[1]);
						}
						// Skip the ident regardless of whether we
						// emitted — the streaming walker's `case
						// "delim"` for `.` outside local mode didn't
						// `skipUntil` past it, but the fallback bare-
						// ident branch below would otherwise re-emit
						// the same `emitICSSSymbol` on the next loop
						// iteration.
						i += 1;
					}
					continue;
				}
				// E4e: ICSS-symbol rewrite for bare idents in the
				// selector list (type-style selectors like
				// `colorValue-v3 { … }` where `colorValue-v3` is
				// `@value`-defined). Mirrors the streaming walker's
				// `case "identifier"` icss branch, but only for idents
				// that didn't match any selector-construct above.
				if (
					v.type === "Ident" &&
					!isDashedIdentifier(/** @type {Token} */ (v).value) &&
					icssDefinitions.has(/** @type {Token} */ (v).value)
				) {
					emitICSSSymbol(
						/** @type {Token} */ (v).value,
						v.range[0],
						v.range[1]
					);
					continue;
				}
			}
			// Pure-mode: finalize the *final* comma-separated selector
			// segment. The streaming walker's `case "leftCurlyBracket"`
			// did this via `finalizeSelector()` just before pushing the
			// frame; in the AST world `walkAstQualifiedRule` calls
			// `walkAstSelectorList` first (which now closes its own
			// trailing segment) and then pushes the pure-mode frame.
			if (topLevel && pureMode) finalizeSelector();
		};
		/**
		 * Per-qualified-rule scope frames; `{ bailed: true }` for
		 * `:import` / `:export` pseudo-rules (their body is handled inline).
		 * @type {({ bailed: true } | { bailed: false, savedAnchor: boolean, savedLocalIdentifiers: string[], savedPrevComposesFile: string | undefined, savedComposesFiles: Set<string> })[]}
		 */
		const qualifiedRuleStateStack = [];

		/**
		 * Qualified-rule enter: scope setup, selector + prelude value
		 * context, `pureBlockStack` push. `ctx.skipChildren()` is used for
		 * `:import` / `:export` pseudo-rules.
		 * @param {QualifiedRule} rule qualified-rule node
		 * @param {boolean} topLevel true when this rule sits at the stylesheet's top level (gates ICSS `:import` / `:export`)
		 * @param {{ skipChildren(): void }=} ctx visitor context
		 * @returns {void}
		 */
		const walkAstQualifiedRuleEnter = (rule, topLevel, ctx) => {
			// `:import("path") { … }` / `:export { … }` ICSS pseudo-rules
			// — processed inline here at top level so their ICSS-import /
			// ICSS-export deps are emitted in source order alongside
			// `@value`. Nested `:import` / `:export` are not a real CSS
			// Modules construct (the streaming walker's `colon:` case
			// only fires for them at `CSS_MODE_TOP_LEVEL`), so for nested
			// occurrences we just bail out — the body's declarations
			// would otherwise be mis-handled as regular ones (auto-
			// exporting their dashed property names).
			if (isModules) {
				let firstIdx = 0;
				while (
					firstIdx < rule.prelude.length &&
					rule.prelude[firstIdx].type === "Whitespace"
				) {
					firstIdx++;
				}
				if (
					firstIdx + 1 < rule.prelude.length &&
					rule.prelude[firstIdx].type === "Colon"
				) {
					const second = rule.prelude[firstIdx + 1];
					const name =
						second.type === "Ident"
							? /** @type {Token} */ (second).value.toLowerCase()
							: second.type === "Function"
								? /** @type {FunctionNode} */ (second).name.toLowerCase()
								: "";
					if (name === "import" || name === "export") {
						if (topLevel) {
							// Position just past the `import` / `export` name,
							// matching the streaming walker's
							// `processImportOrExport(_, input, ident[1])` call.
							// For `:import(...)` the name is the function's name
							// range (so position is `(`); for `:export` it's the
							// ident's end.
							const startColon = rule.prelude[firstIdx].range[0];
							const endAfterBody = processImportOrExport(
								name === "import" ? 0 : 1,
								second,
								rule
							);
							module.addPresentationalDependency(
								new ConstDependency("", [startColon, endAfterBody])
							);
							if (rule.block) rule.block.range[1] = endAfterBody;
							rule.range[1] = endAfterBody;
						} else if (rule.block) {
							// Nested `:import` / `:export` aren't a real
							// CSS-Modules construct — leave the body alone (walking
							// it would mis-handle its declarations as ICSS exports).
							// The block is already parsed, so `rule.range[1]` is already
							// past the closing `}`.
							rule.range[1] = rule.block.range[1];
						}
						// Tell SourceProcessor not to recurse into the body —
						// the matching `:import` / `:export` body grammar
						// isn't regular block contents and the inline
						// processing above already covered it.
						if (ctx) ctx.skipChildren();
						qualifiedRuleStateStack.push({ bailed: true });
						return;
					}
				}
			}
			// Reset / restore `astCurrentRuleHasLocalAnchor` around this rule
			// so the declaration walker sees the correct anchor state for this
			// rule's body and the parent's state survives nested-rule
			// recursion. The identifier list is *inherited* from the parent
			// (copied so our additions don't leak back) because the streaming
			// walker's `lastLocalIdentifiers` only reset at top-level
			// `rightCurlyBracket` — a `composes:` in a nested rule sees both
			// parent and child class names, which is what produces the
			// "Composition is only allowed when selector is single local class
			// name not in <list>" warning for nested locals.
			const savedAnchor = astCurrentRuleHasLocalAnchor;
			const savedLocalIdentifiers = astCurrentRuleLocalIdentifiers;
			astCurrentRuleHasLocalAnchor = false;
			astCurrentRuleLocalIdentifiers = [...savedLocalIdentifiers];
			// E4a-3: composes-state reset between rules. The streaming
			// walker's `case "rightCurlyBracket"` cleared
			// `currentRulePrevComposesFile` / `currentRuleComposesFiles` on
			// every top-level close, but those resets fire *during* streaming —
			// by the time the AST walker iterates its own rules, those side
			// effects are already gone. We have to do the equivalent reset
			// around each AST-walked rule.
			const savedPrevComposesFile = currentRulePrevComposesFile;
			const savedComposesFiles = new Set(currentRuleComposesFiles);
			currentRulePrevComposesFile = undefined;
			currentRuleComposesFiles.clear();
			qualifiedRuleStateStack.push({
				bailed: false,
				savedAnchor,
				savedLocalIdentifiers,
				savedPrevComposesFile,
				savedComposesFiles
			});
			// Selectors are only CSS-Modules-relevant when `isModules` holds.
			// For non-Modules files (e.g. `type: "css"` with the default
			// `pure`-mode parser), explicit `:local(…)` markers from an
			// imported `.module.css` would otherwise be picked up here and
			// emit `CssIcssExportDependency`s against a generator that has no
			// `localIdentName`. Match the streaming walker's `isModules` gate.
			if (isModules) {
				walkAstSelectorList(
					rule.prelude,
					/** @type {"local" | "global"} */ (
						mode === "local" ? "local" : "global"
					)
				);
			}
			// Selectors don't normally carry url(), but a malformed
			// declaration can leave orphan `url(...)` tokens parsed as a
			// degenerate prelude — the url visitor picks those up. ICSS /
			// local-global are not emitted from a qualified-rule prelude
			// (selectors are `walkAstSelectorList`'s job).
			vUrl = vUrlSkip = vLocalGlobal = vIcss = vIcssDashedHandled = false;
			if (this.options.url && rule.prelude.length > 0) {
				vUrl = true;
				lastTokenEndForComments = rule.prelude[0].range[0];
			}
			// E4d: dashed-ident emission in qualified-rule preludes, gated to
			// the deprecated "custom property set" syntax (`--foo: { … }`)
			// which the AST parser treats as a nested qualified-rule (because
			// of the `{`) instead of a declaration. The streaming walker's
			// `case "identifier"` fired for the leading `--foo` regardless of
			// how `processLocalDeclaration` saw it, so mirror that here — but
			// only when the prelude actually starts with a dashed-ident
			// (otherwise we'd double-emit on class selectors like `.--c`,
			// where `walkAstSelectorList` already emitted via the
			// class-selector path).
			if (this.options.dashedIdents && isModules && rule.prelude.length > 0) {
				let firstIdx = 0;
				while (
					firstIdx < rule.prelude.length &&
					rule.prelude[firstIdx].type === "Whitespace"
				) {
					firstIdx++;
				}
				const first = rule.prelude[firstIdx];
				if (
					first &&
					first.type === "Ident" &&
					isDashedIdentifier(/** @type {Token} */ (first).value)
				) {
					const effectiveLocalMode = astModeData
						? astModeData === "local"
						: mode === "local";
					if (effectiveLocalMode) {
						walkDashedIdentsInValue(rule.prelude, true);
					}
				}
			}
			// Pure-mode: push a qualified-rule frame just before walking the
			// body. `walkAstSelectorList` above has already called
			// `finalizeSelector()` for the trailing segment, so
			// `currentRuleHasImpureSelector` reflects the whole prelude. The
			// frame captures `impure` and `ancestorHadLocal` *at push time*;
			// nested-rule walks then read `parentEffectivePure()` off this
			// frame.
			if (pureMode) {
				const top = pureTop();
				const inheritedSkip = top ? top.skipChildren : false;
				pureBlockStack.push({
					ignored: pureIgnorePending,
					skipOwn: inheritedSkip,
					skipChildren: inheritedSkip,
					treatAsLeaf: false,
					ancestorHadLocal:
						parentEffectivePure() || !currentRuleHasImpureSelector,
					impure: currentRuleHasImpureSelector,
					hasDirectDecl: false,
					hasNestedBlock: false,
					isRulePrelude: true,
					preludeStart: rule.range[0],
					preludeEnd: rule.block ? rule.block.range[0] : rule.range[1]
				});
				if (top) top.hasNestedBlock = true;
				pureIgnorePending = false;
				currentRuleHasImpureSelector = false;
				currentSelectorHasLocal = false;
			}
		};

		/**
		 * Qualified-rule exit: pure-frame finalization + scope restore;
		 * no-op for bailed `:import` / `:export`.
		 * @returns {void}
		 */
		const walkAstQualifiedRuleExit = () => {
			const state = qualifiedRuleStateStack.pop();
			if (!state || state.bailed) return;
			if (pureMode) {
				const frame = pureBlockStack.pop();
				if (
					frame &&
					!pureNoCheck &&
					!frame.ignored &&
					!frame.skipOwn &&
					frame.isRulePrelude &&
					frame.impure &&
					(frame.hasDirectDecl || !frame.hasNestedBlock || frame.treatAsLeaf)
				) {
					reportPureRule(frame.preludeStart, frame.preludeEnd);
				}
			}
			astCurrentRuleHasLocalAnchor = state.savedAnchor;
			astCurrentRuleLocalIdentifiers = state.savedLocalIdentifiers;
			currentRulePrevComposesFile = state.savedPrevComposesFile;
			currentRuleComposesFiles.clear();
			for (const f of state.savedComposesFiles) currentRuleComposesFiles.add(f);
		};
		// Drive the whole walk through SourceProcessor: structural enter /
		// exit map to the `walkAst…Enter` / `walkAst…Exit` halves
		// (`topLevel = parent === null`); value visitors handle url / ICSS /
		// local-global. The `comment` callback threads through so each
		// comment lands in `this.comments` once, in source order.
		const runAstWalker = () => {
			const processor = new SourceProcessor();
			/** @type {CssVisitors} */
			const visitors = {
				AtRule: {
					enter(at, parent) {
						const topLevel = parent === null;
						if (pureMode) astAdvanceCommentCursor(at.range[0]);
						walkAstAtRuleEnter(at, topLevel);
					},
					exit(at, parent) {
						walkAstAtRuleExit();
						if (parent === null) {
							if (at.block) allowAstImport = false;
							if (pureMode) seenTopLevelRule = true;
							astModeData = undefined;
						}
					}
				},
				QualifiedRule: {
					enter(rule, parent, ctx) {
						const topLevel = parent === null;
						if (pureMode) astAdvanceCommentCursor(rule.range[0]);
						walkAstQualifiedRuleEnter(rule, topLevel, ctx);
					},
					exit(rule, parent) {
						walkAstQualifiedRuleExit();
						if (parent === null) {
							allowAstImport = false;
							if (pureMode) seenTopLevelRule = true;
							astModeData = undefined;
						}
					}
				},
				// Top-level declarations are spec parse errors (filtered out by
				// `parseAStylesheet`), so `parent` is always a `SimpleBlock`
				// and the per-item top-level `astModeData` reset never applies.
				Declaration: (decl) => {
					// Reset value-visitor context; gated on below, read by the
					// Url / Function / Ident / Comma visitors during the value walk.
					vUrl = vUrlSkip = vLocalGlobal = vIcss = vIcssDashedHandled = false;
					if (pureMode) {
						// Pure-mode: a direct declaration in the body marks the
						// enclosing rule frame as having declarations.
						const top = pureTop();
						if (top) top.hasDirectDecl = true;
					}
					const declPropertyName = decl.name
						.replace(/^(-\w+-)/, "")
						.toLowerCase();
					// The url visitor reads `lastTokenEndForComments` to attach
					// magic comments to each URL. Position it just past the property
					// `:` so a comment placed between `:` and the url() is found.
					let colonPos = decl.nameRange[1];
					while (
						colonPos < source.length &&
						source.charCodeAt(colonPos) !== CC_COLON
					) {
						colonPos++;
					}
					lastTokenEndForComments = colonPos + 1;
					const effectiveLocalMode = astModeData
						? astModeData === "local"
						: mode === "local";
					// url() / src() / image-set() deps come from the value visitors.
					// Skip bare url-tokens for known properties in local mode.
					if (this.options.url) {
						vUrl = true;
						vUrlSkip =
							isModules &&
							effectiveLocalMode &&
							knownProperties.has(declPropertyName);
					}
					// `composes:` / `compose-with:` with a local anchor: the composes
					// strip-dep covers the whole declaration, so the value's
					// `local()` / `global()` / dashed / ICSS rewrites must be
					// suppressed (they'd overlap the strip and leak localized names).
					const isComposesWithAnchor =
						COMPOSES_PROPERTY.test(declPropertyName) &&
						astCurrentRuleHasLocalAnchor;
					composesHandling: if (isComposesWithAnchor) {
						if (astCurrentRuleLocalIdentifiers.length > 1) {
							this._emitWarning(
								state,
								`Composition is only allowed when selector is single local class name not in "${astCurrentRuleLocalIdentifiers.join(
									'", "'
								)}"`,
								locConverter,
								decl.range[0],
								decl.range[1]
							);
							break composesHandling;
						}
						const lastLocalIdentifier = astCurrentRuleLocalIdentifiers[0];

						// Split the value at top-level commas — each segment is
						// one `<name>+ [from <source>]` group.
						/** @type {AstNode[][]} */
						const groups = [];
						/** @type {AstNode[]} */
						let currentGroup = [];
						for (const cv of decl.value) {
							if (cv.type === "Comma") {
								groups.push(currentGroup);
								currentGroup = [];
							} else {
								currentGroup.push(cv);
							}
						}
						groups.push(currentGroup);

						for (const group of groups) {
							/** @type {{ start: number, end: number, isGlobal: boolean }[]} */
							const classNames = [];
							/** @type {"names" | "expecting-source" | "done"} */
							let phase = "names";
							/** @type {{ kind: "string", path: string } | { kind: "global" } | undefined} */
							let fromSource;
							/** @type {AstNode | undefined} */
							let errorToken;
							let errorMessage = "";

							for (let i = 0; i < group.length; i++) {
								const cv = group[i];
								if (cv.type === "Whitespace") continue;

								if (phase === "expecting-source") {
									if (cv.type === "String") {
										fromSource = {
											kind: "string",
											path: source.slice(cv.range[0] + 1, cv.range[1] - 1)
										};
										phase = "done";
										continue;
									}
									if (
										cv.type === "Ident" &&
										/** @type {Token} */ (cv).value.toLowerCase() === "global"
									) {
										fromSource = { kind: "global" };
										phase = "done";
										continue;
									}
									errorToken = cv;
									errorMessage =
										"Incorrect composition, expected global keyword or string value";
									break;
								}

								if (phase === "done") {
									continue;
								}

								if (cv.type === "Ident") {
									const identValue = /** @type {Token} */ (cv).value;
									if (
										identValue.toLowerCase() === "from" &&
										classNames.length > 0
									) {
										let hasMore = false;
										for (let j = i + 1; j < group.length; j++) {
											if (group[j].type !== "Whitespace") {
												hasMore = true;
												break;
											}
										}
										if (hasMore) {
											phase = "expecting-source";
											continue;
										}
									}
									classNames.push({
										start: cv.range[0],
										end: cv.range[1],
										isGlobal: false
									});
									continue;
								}

								if (cv.type === "Function") {
									const fn = /** @type {FunctionNode} */ (cv);
									const fname = fn.name.replace(/\\/g, "").toLowerCase();
									const isGlobal = fname === "global";
									for (const inner of fn.value) {
										if (inner.type === "Ident") {
											classNames.push({
												start: inner.range[0],
												end: inner.range[1],
												isGlobal
											});
											break;
										}
									}
									continue;
								}

								errorToken = cv;
								errorMessage = "Incorrect composition, expected class named";
								break;
							}

							if (!errorToken && phase === "expecting-source") {
								errorMessage =
									"Incorrect composition, expected global keyword or string value";
								errorToken = /** @type {AstNode | undefined} */ (
									group[group.length - 1]
								);
							}

							if (errorToken) {
								this._emitWarning(
									state,
									errorMessage,
									locConverter,
									errorToken.range[0],
									errorToken.range[1]
								);
								break composesHandling;
							}

							if (classNames.length === 0) continue;

							if (fromSource && fromSource.kind === "string") {
								const request = fromSource.path;
								const selfReference = isSelfReferenceRequest(request);

								if (!selfReference && !currentRuleComposesFiles.has(request)) {
									currentRuleComposesFiles.add(request);
									if (
										currentRulePrevComposesFile !== undefined &&
										currentRulePrevComposesFile !== request
									) {
										let successors = composesGraph.get(
											currentRulePrevComposesFile
										);
										if (!successors) {
											successors = new Set();
											composesGraph.set(
												currentRulePrevComposesFile,
												successors
											);
										}
										successors.add(request);
									}
									currentRulePrevComposesFile = request;
								}

								for (const { start, end } of classNames) {
									const identifier = unescapeIdentifier(
										source.slice(start, end)
									);
									const { line: sl, column: sc } = locConverter.get(start);
									const { line: el, column: ec } = locConverter.get(end);

									if (selfReference) {
										if (identifier === lastLocalIdentifier) continue;
										const dep = new CssIcssExportDependency(
											lastLocalIdentifier,
											getReexport(identifier),
											[start, end],
											true,
											CssIcssExportDependency.EXPORT_MODE.SELF_REFERENCE,
											CssIcssExportDependency.EXPORT_TYPE.COMPOSES
										);
										dep.setLoc(sl, sc, el, ec);
										module.addDependency(dep);
										continue;
									}

									const localName = `__ICSS_IMPORT_${counter++}__`;

									const importDep = new CssIcssImportDependency(
										request,
										[start, end],
										/** @type {"local" | "global"} */ (mode),
										identifier,
										localName
									);
									importDep.setLoc(sl, sc, el, ec);
									module.addDependency(importDep);
									if (!composesFirstFileImport.has(request)) {
										composesFirstFileImport.set(request, importDep);
									}

									const exportDep = new CssIcssExportDependency(
										lastLocalIdentifier,
										getReexport(identifier, localName),
										[start, end],
										true,
										CssIcssExportDependency.EXPORT_MODE.APPEND,
										CssIcssExportDependency.EXPORT_TYPE.COMPOSES
									);
									exportDep.setLoc(sl, sc, el, ec);
									module.addDependency(exportDep);
								}
							} else if (fromSource && fromSource.kind === "global") {
								for (const { start, end } of classNames) {
									const identifier = unescapeIdentifier(
										source.slice(start, end)
									);
									const dep = new CssIcssExportDependency(
										lastLocalIdentifier,
										getReexport(identifier),
										[start, end],
										false,
										CssIcssExportDependency.EXPORT_MODE.APPEND,
										CssIcssExportDependency.EXPORT_TYPE.COMPOSES
									);
									const { line: sl, column: sc } = locConverter.get(start);
									const { line: el, column: ec } = locConverter.get(end);
									dep.setLoc(sl, sc, el, ec);
									module.addDependency(dep);
								}
							} else {
								for (const { start, end, isGlobal } of classNames) {
									const identifier = unescapeIdentifier(
										source.slice(start, end)
									);
									const dep = new CssIcssExportDependency(
										lastLocalIdentifier,
										getReexport(identifier),
										[start, end],
										!isGlobal,
										isGlobal
											? CssIcssExportDependency.EXPORT_MODE.APPEND
											: CssIcssExportDependency.EXPORT_MODE.SELF_REFERENCE,
										CssIcssExportDependency.EXPORT_TYPE.COMPOSES
									);
									const { line: sl, column: sc } = locConverter.get(start);
									const { line: el, column: ec } = locConverter.get(end);
									dep.setLoc(sl, sc, el, ec);
									module.addDependency(dep);
								}
							}
						}

						// Strip `composes: …;` (and trailing same-line whitespace)
						// from the output. The strip range uses the declaration's
						// name-start so the property name is included.
						const resumeAt =
							source.charCodeAt(decl.range[1]) === CC_SEMICOLON
								? skipWhitespace(source, decl.range[1] + 1)
								: decl.range[1];
						module.addPresentationalDependency(
							new ConstDependency("", [decl.nameRange[0], resumeAt])
						);
					}
					const skipForComposes = isComposesWithAnchor;
					// `local()` / `global()` value functions → ICSS (modules only).
					if (isModules && !skipForComposes) vLocalGlobal = true;
					// Property-name local emission for known properties
					// (`animation-name: foo` exports `foo`).
					if (
						isModules &&
						effectiveLocalMode &&
						knownProperties.has(declPropertyName)
					) {
						/** @type {[number, number, boolean?][]} */
						const values = [];
						/** @type {Record<string, number>} */
						let parsedKeywords = Object.create(null);
						const isGridProperty = Boolean(declPropertyName.startsWith("grid"));
						const isGridTemplate = isGridProperty
							? Boolean(
									declPropertyName === "grid" ||
									declPropertyName === "grid-template" ||
									declPropertyName === "grid-template-columns" ||
									declPropertyName === "grid-template-rows"
								)
							: false;
						const keywords =
							/** @type {Record<string, number>} */
							(knownProperties.get(declPropertyName));
						let afterExclamation = false;
						// Walk component values collecting the idents/strings to
						// export. Top-level only for non-grid-template; all levels
						// for grid-template (`[line-name]` blocks live in `repeat(…)`).
						/** @type {(cvs: AstNode[]) => void} */
						const walkExports = (cvs) => {
							for (const cv of cvs) {
								switch (cv.type) {
									case "Comma":
										parsedKeywords = Object.create(null);
										break;
									case "Delim":
										afterExclamation = /** @type {Token} */ (cv).value === "!";
										break;
									case "Ident": {
										if (isGridTemplate) break;
										if (afterExclamation) {
											afterExclamation = false;
											break;
										}
										const identifier = /** @type {Token} */ (cv).value;
										const keyword = identifier.toLowerCase();
										parsedKeywords[keyword] =
											typeof parsedKeywords[keyword] !== "undefined"
												? parsedKeywords[keyword] + 1
												: 0;
										if (
											keywords[keyword] &&
											parsedKeywords[keyword] < keywords[keyword]
										) {
											break;
										}
										values.push([cv.range[0], cv.range[1]]);
										break;
									}
									case "String": {
										if (
											declPropertyName === "animation" ||
											declPropertyName === "animation-name"
										) {
											values.push([cv.range[0], cv.range[1], true]);
										}
										if (
											declPropertyName === "grid" ||
											declPropertyName === "grid-template" ||
											declPropertyName === "grid-template-areas"
										) {
											const areas = unescapeIdentifier(
												source.slice(cv.range[0] + 1, cv.range[1] - 1)
											);
											const matches = matchAll(/\b\w+\b/g, areas);
											for (const match of matches) {
												const areaStart = cv.range[0] + 1 + match.index;
												values.push([
													areaStart,
													areaStart + match[0].length,
													false
												]);
											}
										}
										break;
									}
									case "SimpleBlock": {
										const block = /** @type {SimpleBlock} */ (cv);
										if (block.token === "[") {
											// Collect identifiers until the first non-ident token
											// (`<line-names> = '[' <custom-ident>* ']'`).
											for (const inner of block.value) {
												if (inner.type === "Whitespace") continue;
												if (inner.type !== "Ident") break;
												values.push([inner.range[0], inner.range[1]]);
											}
										} else if (isGridTemplate) {
											walkExports(block.value);
										}
										break;
									}
									case "Function":
										if (isGridTemplate) {
											walkExports(/** @type {FunctionNode} */ (cv).value);
										}
										break;
									// Other types carry no ICSS-export information.
								}
							}
						};
						walkExports(decl.value);
						for (const value of values) {
							const { line: sl, column: sc } = locConverter.get(value[0]);
							const { line: el, column: ec } = locConverter.get(value[1]);
							const [start, end, isString] = value;
							const name = unescapeIdentifier(
								isString
									? source.slice(start + 1, end - 1)
									: source.slice(start, end)
							);
							const dep = new CssIcssExportDependency(
								name,
								getReexport(name),
								[start, end],
								true,
								CssIcssExportDependency.EXPORT_MODE.ONCE,
								isGridProperty
									? CssIcssExportDependency.EXPORT_TYPE.GRID_CUSTOM_IDENTIFIER
									: CssIcssExportDependency.EXPORT_TYPE.NORMAL
							);
							dep.setLoc(sl, sc, el, ec);
							module.addDependency(dep);
						}
					}
					// Dashed-ident (custom-property) ICSS export. The property name
					// is itself an export; the value walk (kept inline — it has
					// `from <source>` lookahead that doesn't map to a node visitor)
					// handles nested `var()` / `style()` / `--foo()` and top-level
					// dashed idents in unknown-property values.
					if (
						this.options.dashedIdents &&
						isModules &&
						effectiveLocalMode &&
						!skipForComposes
					) {
						if (isDashedIdentifier(decl.name)) {
							emitDashedIdentExport(decl.nameRange[0], decl.nameRange[1]);
						}
						walkDashedIdentsInValue(
							decl.value,
							!knownProperties.has(declPropertyName)
						);
					}
					// ICSS-symbol rewrite (`color: foo` when `foo` is `@value`-defined).
					// Skipped for known properties / the composes anchor; "dashed wins"
					// so dashed idents are left to the dashed walk above.
					if (
						isModules &&
						!skipForComposes &&
						!knownProperties.has(declPropertyName)
					) {
						const dashedHandled = Boolean(
							this.options.dashedIdents && effectiveLocalMode
						);
						if (
							!(dashedHandled && isDashedIdentifier(decl.name)) &&
							icssDefinitions.has(decl.name)
						) {
							emitICSSSymbol(decl.name, decl.nameRange[0], decl.nameRange[1]);
						}
						vIcss = true;
						vIcssDashedHandled = dashedHandled;
					}
				},
				// Value-level visitors fired by `walkValue` as it descends
				// declaration values and at-rule / qualified-rule preludes;
				// the enclosing structural enter sets `vUrl` / `vIcss` / … to
				// gate them per container.
				Url: (node) => {
					if (!vUrl || vUrlSkip) return;
					const { options, errors: commentErrors } = this.parseCommentOptions([
						lastTokenEndForComments,
						node.range[1]
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
							const { line: el, column: ec } = locConverter.get(node.range[1]);

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
							return;
						}
					}
					let value = normalizeUrl(
						input.slice(node.contentStart, node.contentEnd),
						false
					);
					// Ignore `url()`, `url('')` and `url("")`, they are valid by spec
					if (value.length === 0) return;
					if (isModules) {
						const def = icssDefinitions.get(value);
						if (def) {
							if (def.value !== undefined) {
								const raw = def.value.trim();
								value =
									(raw.startsWith('"') && raw.endsWith('"')) ||
									(raw.startsWith("'") && raw.endsWith("'"))
										? normalizeUrl(raw.slice(1, -1), true)
										: normalizeUrl(raw, false);
								if (value.length === 0) return;
							} else {
								this._emitWarning(
									state,
									`'@value' identifier '${value}' was imported from another module and cannot be used inside 'url()' — only locally defined values are supported here`,
									locConverter,
									node.range[0],
									node.range[1]
								);
								return;
							}
						}
					}
					const dep = new CssUrlDependency(
						value,
						[node.range[0], node.range[1]],
						"url"
					);
					const { line: sl, column: sc } = locConverter.get(node.range[0]);
					const { line: el, column: ec } = locConverter.get(node.range[1]);
					dep.setLoc(sl, sc, el, ec);
					module.addDependency(dep);
					module.addCodeGenerationDependency(dep);
				},
				Comma(node) {
					if (vUrl) lastTokenEndForComments = node.range[0];
				},
				Function: (fn) => {
					const fnameRaw = fn.name.replace(/\\/g, "");
					const fname = fnameRaw.toLowerCase();
					urlHandling: if (vUrl) {
						if (fname === "url" || fname === "src") {
							// Quoted `url("…")` / `src("…")`: first non-whitespace
							// value is the string token.
							/** @type {Token | undefined} */
							let string;
							for (const cv of fn.value) {
								if (cv.type === "Whitespace") continue;
								if (cv.type === "String") string = /** @type {Token} */ (cv);
								break;
							}
							if (!string) break urlHandling;
							const { options, errors: commentErrors } =
								this.parseCommentOptions([
									lastTokenEndForComments,
									fn.range[0]
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
									state.module.addWarning(
										new UnsupportedFeatureWarning(
											`\`webpackIgnore\` expected a boolean, but received: ${options.webpackIgnore}.`,
											string.loc
										)
									);
								} else if (options.webpackIgnore) {
									break urlHandling;
								}
							}
							const value = normalizeUrl(
								input.slice(string.range[0] + 1, string.range[1] - 1),
								true
							);
							// Ignore `url()`, `url('')` and `url("")`, they are valid by spec
							if (value.length === 0) break urlHandling;
							const dep = new CssUrlDependency(
								value,
								[string.range[0], string.range[1]],
								"string"
							);
							const { line: sl, column: sc } = locConverter.get(
								string.range[0]
							);
							const { line: el, column: ec } = locConverter.get(
								string.range[1]
							);
							dep.setLoc(sl, sc, el, ec);
							module.addDependency(dep);
							module.addCodeGenerationDependency(dep);
						} else if (IMAGE_SET_FUNCTION.test(fname)) {
							// `image-set(…)`: each comma-separated segment's first
							// string is the image URL. Advance the magic-comment
							// fence for every collected string (even skipped ones) so
							// a comment between strings attaches to the next one.
							lastTokenEndForComments = fn.nameRange[1] + 1;
							let prevStringEnd = fn.range[0];
							let firstInSegment = true;
							for (const cv of fn.value) {
								if (cv.type === "Comma") {
									firstInSegment = true;
									continue;
								}
								if (cv.type === "Whitespace") continue;
								const wasFirst = firstInSegment;
								firstInSegment = false;
								if (!wasFirst || cv.type !== "String") continue;
								const string = /** @type {Token} */ (cv);
								const rangeStart = prevStringEnd;
								prevStringEnd = string.range[1];
								const value = normalizeUrl(
									input.slice(string.range[0] + 1, string.range[1] - 1),
									true
								);
								if (value.length === 0) continue;
								const { options, errors: commentErrors } =
									this.parseCommentOptions([rangeStart, string.range[1]]);
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
										state.module.addWarning(
											new UnsupportedFeatureWarning(
												`\`webpackIgnore\` expected a boolean, but received: ${options.webpackIgnore}.`,
												string.loc
											)
										);
									} else if (options.webpackIgnore) {
										continue;
									}
								}
								const dep = new CssUrlDependency(
									value,
									[string.range[0], string.range[1]],
									"url"
								);
								const { line: sl, column: sc } = locConverter.get(
									string.range[0]
								);
								const { line: el, column: ec } = locConverter.get(
									string.range[1]
								);
								dep.setLoc(sl, sc, el, ec);
								module.addDependency(dep);
								module.addCodeGenerationDependency(dep);
							}
						}
					}
					if (vLocalGlobal && (fname === "local" || fname === "global")) {
						processLocalOrGlobalFunction(fn, fname === "local" ? 1 : 2);
					}
					if (
						vIcss &&
						fname !== "local" &&
						fname !== "global" &&
						!(vIcssDashedHandled && isDashedIdentifier(fnameRaw)) &&
						icssDefinitions.has(fnameRaw)
					) {
						emitICSSSymbol(fnameRaw, fn.nameRange[0], fn.nameRange[1]);
					}
				},
				Ident(node) {
					if (!vIcss) return;
					const identValue = node.value;
					if (vIcssDashedHandled && isDashedIdentifier(identValue)) return;
					if (icssDefinitions.has(identValue)) {
						emitICSSSymbol(identValue, node.range[0], node.range[1]);
					}
				}
			};
			processor.use(/** @type {EXPECTED_ANY} */ (visitors));
			processor.process(source, { locConverter, comment });
		};
		runAstWalker();

		/** @type {BuildInfo} */
		(module.buildInfo).strict = true;

		// Topologically sort `composes ... from` files and tag each file's first import with `sourceOrder` so `NormalModule#build` loads them cascade-correctly (cycles keep their natural position).
		if (composesFirstFileImport.size > 1) {
			topologicalSort(
				composesGraph,
				[...composesFirstFileImport.keys()],
				(file, i) => {
					/** @type {CssIcssImportDependency} */
					(composesFirstFileImport.get(file)).sourceOrder = i;
				}
			);
		}

		const buildMeta = /** @type {BuildMeta} */ (state.module.buildMeta);

		buildMeta.exportsType = this.options.namedExports ? "namespace" : "default";
		buildMeta.defaultObject = this.options.namedExports
			? false
			: "redirect-warn";

		if (
			/** @type {CssModule} */ (module).exportType === "text" ||
			/** @type {CssModule} */ (module).exportType === "css-style-sheet"
		) {
			module.addDependency(new StaticExportsDependency(["default"], true));
		} else {
			module.addDependency(new StaticExportsDependency([], true));
		}

		return state;
	}

	/**
	 * Returns comments in the range.
	 * @param {Range} range range
	 * @returns {Comment[]} comments in the range
	 */
	getComments(range) {
		if (!this.comments) return [];
		const [rangeStart, rangeEnd] = range;
		/**
		 * Returns compared.
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
	 * Parses comment options.
	 * @param {Range} range range of the comment
	 * @returns {{ options: Record<string, EXPECTED_ANY> | null, errors: (Error & { comment: Comment })[] | null }} result
	 */
	parseCommentOptions(range) {
		const comments = this.getComments(range);
		if (comments.length === 0) {
			return EMPTY_COMMENT_OPTIONS;
		}
		/** @type {Record<string, EXPECTED_ANY>} */
		const options = {};
		/** @type {(Error & { comment: Comment })[]} */
		const errors = [];
		for (const comment of comments) {
			const { value } = comment;
			if (value && webpackCommentRegExp.test(value)) {
				// Fast path: the overwhelmingly common shape is a
				// single `webpackXxx: <bool|number|null>` pair (the rest
				// of the magic-comment grammar — strings, regexes,
				// objects — is rare enough that the slow `vm.runInContext`
				// fall-through still handles every input the spec
				// allows, while the regex shortcut keeps the hot
				// `webpackIgnore: true` / `webpackChunkName: "x"` case
				// out of V8's `vm` machinery.
				const fast = MAGIC_COMMENT_FAST_PATH.exec(value);
				if (fast !== null) {
					const key = fast[1];
					const raw = fast[2];
					options[key] =
						raw === "true"
							? true
							: raw === "false"
								? false
								: raw === "null"
									? null
									: Number(raw);
					continue;
				}
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
