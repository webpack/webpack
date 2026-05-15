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
const {
	QualifiedRule,
	SimpleBlock,
	escapeIdentifier,
	parseAComponentValue,
	parseADeclaration,
	parseAListOfComponentValues,
	parseAtRule,
	unescapeIdentifier
} = require("./walkCssTokens");
const walkCssTokens = require("./walkCssTokens");

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
/** @typedef {import("./walkCssTokens").CssTokenCallbacks} CssTokenCallbacks */
/** @typedef {import("../../declarations/WebpackOptions").CssAutoOrModuleParserOptions} CssAutoOrModuleParserOptions */
/** @typedef {import("../../declarations/WebpackOptions").CssModuleParserOptions} CssModuleParserOptions */
/** @typedef {import("./CssModule")} CssModule */

/** @typedef {[number, number]} Range */
/** @typedef {{ line: number, column: number }} Position */
/** @typedef {{ value: string, range: Range, loc: { start: Position, end: Position } }} Comment */

const CC_COLON = ":".charCodeAt(0);
const CC_SEMICOLON = ";".charCodeAt(0);
const CC_TILDE = "~".charCodeAt(0);
const CC_EQUAL = "=".charCodeAt(0);
const CC_AT_SIGN = "@".charCodeAt(0);
const CC_RIGHT_CURLY = "}".charCodeAt(0);

// https://www.w3.org/TR/css-syntax-3/#newline
// We don't have `preprocessing` stage, so we need specify all of them
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

	// Use a while loop with exec() to find all matches
	while ((match = regexp.exec(str)) !== null) {
		result.push(match);
	}
	// Return an array to be easily iterable (note: a true spec-compliant polyfill
	// returns an iterator object, but an array spread often suffices for basic use)
	return result;
};

/**
 * Returns normalized url.
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

const eatUntilLeftCurly = walkCssTokens.eatUntil("{");

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

		const locConverter = new LocConverter(source);

		// Closure-scope alias for `source` so AST-walking helpers (which
		// take parsed nodes rather than raw `input`/`pos` arguments) can
		// reach into the source for substring extraction. Callback-style
		// helpers still receive `input` via their parameter.
		const input = source;

		let lastTokenEndForComments = 0;

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
		 * One entry per open block. `skipOwn` skips this rule's own check (set
		 * when the parent passed down `skipChildren`, e.g. `from`/`to` inside
		 * `@keyframes`). `skipChildren` is propagated to descendants. `ignored`
		 * is per-rule only (PCSL semantics for `cssmodules-pure-ignore`).
		 * `ancestorHadLocal` lets nested rules inherit purity from a
		 * local-bearing ancestor.
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
				`Selector "${source.slice(from, to)}" is not pure (pure selectors must contain at least one local class or id)`,
				locConverter,
				from,
				to
			);
		};

		/** @typedef {{ value?: string, importName?: string, localName?: string, request?: string }} IcssDefinition */
		/** @type {Map<string, IcssDefinition>} */
		const icssDefinitions = new Map();

		// Tracks `composes: <name> from "<file>"` declarations to enforce a
		// predictable file load order across rules (port of
		// postcss-modules-extract-imports#138). Each rule's composes order
		// is a partial ordering: if `.x` composes `b from "./b"` before
		// `c from "./c"`, then `b.css` must load before `c.css` so `c` can
		// override `b` in the cascade. Edges are added inline as the rule
		// is parsed; at end-of-parse the first composes-import dep of each
		// file is tagged with `sourceOrder` according to a topological
		// sort (`NormalModule#build` reorders by `sourceOrder` for us).
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
		 * source order, including those that
		 * `parseAStylesheet`'s internal `eatWhitespaceAndComments`
		 * silently swallows) onto `this.comments`. The AST walker reads
		 * the list back via `astAdvanceCommentCursor` for pure-mode
		 * `cssmodules-pure-ignore` / `cssmodules-pure-no-check` flag
		 * tracking, and via `parseCommentOptions` for magic-comment
		 * lookups inside `processAtImport` / `processAtValue`.
		 * @param {string} input input
		 * @param {number} start start
		 * @param {number} end end
		 * @returns {number} end
		 */
		const comment = (input, start, end) => {
			if (!this.comments) this.comments = [];
			const { line: sl, column: sc } = locConverter.get(start);
			const { line: el, column: ec } = locConverter.get(end);
			this.comments.push({
				value: input.slice(start + 2, end - 2),
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

		// Vanilla CSS stuff

		/**
		 * Process an `@import` at-rule. Reads the URL (one of: `url(...)`
		 * function, `<url-token>`, string, or — in CSS Modules mode — a
		 * bare ident resolved via `@value`), optional `layer` /
		 * `layer(...)`, optional `supports(...)`, and the remaining
		 * media-query tokens. Emits a `CssImportDependency` on success.
		 * @param {AtRule} atRule parsed `@import` at-rule
		 * @returns {number} position after handling
		 */
		const processAtImport = (atRule) => {
			const start = atRule.start;
			const nameEnd = atRule.nameRange[1];
			// We only accept `;`-terminated @import. Block / EOF / `}` ends are
			// silent bails (matching the original `eatImportTokens` returning
			// without `tokens[3]`).
			if (atRule.terminator !== ";") return atRule.end;

			// Walk the prelude in spec-canonical order: URL → optional layer →
			// optional supports → media-query tail. Anything that doesn't fit
			// this prefix becomes part of the media query.
			/** @type {AstNode | undefined} */
			let urlNode;
			/** @type {AstNode | undefined} */
			let layerNode;
			/** @type {FunctionNode | undefined} */
			let supportsNode;

			for (const cv of atRule.prelude) {
				if (cv.type === "whitespace") continue;

				if (!urlNode) {
					if (cv.type === "url" || cv.type === "string") {
						urlNode = cv;
						continue;
					}
					if (cv.type === "function") {
						const fname = /** @type {FunctionNode} */ (cv).name
							.replace(/\\/g, "")
							.toLowerCase();
						if (fname === "url") {
							urlNode = cv;
							continue;
						}
					}
					if (cv.type === "ident") {
						// CSS Modules: bare ident is a `@value` reference.
						urlNode = cv;
						continue;
					}
					break;
				}

				if (!layerNode && !supportsNode) {
					if (cv.type === "ident") {
						const ident = /** @type {Token} */ (cv).value
							.replace(/\\/g, "")
							.toLowerCase();
						if (ident === "layer") {
							layerNode = cv;
							continue;
						}
					} else if (cv.type === "function") {
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
					cv.type === "function" &&
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

			const semi = atRule.end + 1; // position past `;`

			if (!urlNode || (urlNode.type === "ident" && !isModules)) {
				this._emitWarning(
					state,
					`Expected URL in '${input.slice(start, semi)}'`,
					locConverter,
					start,
					semi
				);
				// The pre-AST parser bailed by returning past the
				// at-keyword, which let the main walker re-tokenize the
				// prelude and pick up any nested `url()` / `src()` /
				// `image-set()` calls as standalone URL dependencies. Match
				// that — without the re-tokenization round-trip — by walking
				// the parsed prelude for the same handlers.
				walkFunctionsForUrl(atRule.prelude);
				return semi;
			}

			/** @type {string} */
			let url;
			if (urlNode.type === "ident") {
				// URL given as identifier — resolve via CSS Modules `@value`.
				const name = /** @type {Token} */ (urlNode).value;
				const def = icssDefinitions.get(name);
				if (!def) {
					this._emitWarning(
						state,
						`Unknown '@value' identifier '${name}' in '${input.slice(start, semi)}'`,
						locConverter,
						start,
						semi
					);
					// Consume the whole at-rule so the unresolved identifier
					// doesn't get re-tokenized and accidentally substituted
					// into a malformed `@import` in the output.
					const dep = new ConstDependency("", [start, semi]);
					module.addPresentationalDependency(dep);
					return semi;
				}
				if (def.value === undefined) {
					this._emitWarning(
						state,
						`'@value' identifier '${name}' was imported from another module and cannot be used as the URL of '@import' — only locally defined values are supported here`,
						locConverter,
						start,
						semi
					);
					const dep = new ConstDependency("", [start, semi]);
					module.addPresentationalDependency(dep);
					return semi;
				}
				const raw = def.value.trim();
				url =
					(raw.startsWith('"') && raw.endsWith('"')) ||
					(raw.startsWith("'") && raw.endsWith("'"))
						? normalizeUrl(raw.slice(1, -1), true)
						: normalizeUrl(raw, false);
			} else if (urlNode.type === "url") {
				const ut = /** @type {UrlToken} */ (urlNode);
				url = normalizeUrl(input.slice(ut.contentStart, ut.contentEnd), false);
			} else if (urlNode.type === "string") {
				url = normalizeUrl(
					input.slice(urlNode.start + 1, urlNode.end - 1),
					true
				);
			} else {
				// url(...) function — first non-whitespace child is the string.
				/** @type {Token | undefined} */
				let string;
				for (const inner of /** @type {FunctionNode} */ (urlNode).value) {
					if (inner.type === "whitespace") continue;
					if (inner.type === "string") string = /** @type {Token} */ (inner);
					break;
				}
				if (!string) {
					this._emitWarning(
						state,
						`Expected URL in '${input.slice(start, semi)}'`,
						locConverter,
						start,
						semi
					);
					return atRule.end;
				}
				url = normalizeUrl(input.slice(string.start + 1, string.end - 1), true);
			}

			const newline = walkCssTokens.eatWhiteLine(input, semi);
			const { options, errors: commentErrors } = this.parseCommentOptions([
				nameEnd,
				urlNode.end
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

			/** @type {undefined | string} */
			let layer;
			if (layerNode) {
				if (layerNode.type === "function") {
					// `layer(<ident>)` — extract content between `(` and `)`.
					const fn = /** @type {FunctionNode} */ (layerNode);
					layer = input.slice(fn.nameRange[1] + 1, fn.end - 1).trim();
				} else {
					// Bare `layer` ident — anonymous layer.
					layer = "";
				}
			}

			/** @type {undefined | string} */
			let supports;
			if (supportsNode) {
				supports = input
					.slice(supportsNode.nameRange[1] + 1, supportsNode.end - 1)
					.trim();
			}

			// Media query = whatever sits between the last url/layer/supports
			// part and the closing `;`, trimmed.
			const lastPrefixPart = supportsNode || layerNode || urlNode;
			const mediaStart = walkCssTokens.eatWhitespaceAndComments(
				input,
				lastPrefixPart.end
			)[0];
			/** @type {undefined | string} */
			let media;
			if (mediaStart !== atRule.end) {
				media = input.slice(mediaStart, atRule.end).trim();
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
			// `text` and `css-style-sheet` parents inline the imported
			// module's rendered CSS at build time, which means we read the
			// imported module's `codeGenerationResults` (and through it the
			// results of any assets the import references). Registering this
			// as a code-generation dependency tells the compilation scheduler
			// to generate the imported subtree before us.
			const exportType = /** @type {import("./CssModule")} */ (module)
				.exportType;
			if (exportType === "text" || exportType === "css-style-sheet") {
				module.addCodeGenerationDependency(dep);
			}

			return newline;
		};

		/**
		 * Process a `url(...)` or `src(...)` function node, emitting the
		 * corresponding `CssUrlDependency` when the first non-whitespace
		 * argument is a string token. No-op for empty / non-string forms,
		 * which webpack leaves to the runtime per CSS spec.
		 *
		 * Magic-comment range is `[lastTokenEndForComments, fn.start]` —
		 * i.e. everything from the previous syntax-level boundary
		 * (`:`/`,`) to just before the function name. This matches the
		 * original streaming implementation: the old call site was the
		 * outer walker's `function:` callback, which received `end` as the
		 * position past `(`, but the magic comment is always in the
		 * `[prev-boundary, function-name]` span anyway.
		 * @param {FunctionNode} fn parsed `url`/`src` function node
		 * @param {string} name lowercased function name (`url` or `src`)
		 */
		const processURLFunction = (fn, name) => {
			// First non-whitespace value should be a string token.
			/** @type {Token | undefined} */
			let string;
			for (const cv of fn.value) {
				if (cv.type === "whitespace") continue;
				if (cv.type === "string") string = /** @type {Token} */ (cv);
				break;
			}
			if (!string) return;
			const { options, errors: commentErrors } = this.parseCommentOptions([
				lastTokenEndForComments,
				fn.start
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
					return;
				}
			}
			const value = normalizeUrl(
				input.slice(string.start + 1, string.end - 1),
				true
			);
			// Ignore `url()`, `url('')` and `url("")`, they are valid by spec
			if (value.length === 0) return;
			const isUrl = name === "url" || name === "src";
			const dep = new CssUrlDependency(
				value,
				[string.start, string.end],
				isUrl ? "string" : "url"
			);
			const { line: sl, column: sc } = locConverter.get(string.start);
			const { line: el, column: ec } = locConverter.get(string.end);
			dep.setLoc(sl, sc, el, ec);
			module.addDependency(dep);
			module.addCodeGenerationDependency(dep);
		};

		/**
		 * Process a bare `url(unquoted)` token, the
		 * [`<url-token>`](https://www.w3.org/TR/css-syntax-3/#consume-url-token)
		 * form the tokenizer emits as a single `UrlToken` (no string literal
		 * inside the parens). Quoted url() forms parse as a
		 * `<function-token>` followed by a `<string-token>` and are handled
		 * by `processURLFunction` instead.
		 * @param {UrlToken} urlToken token emitted by the tokenizer
		 */
		const processOldURLFunction = (urlToken) => {
			const { options, errors: commentErrors } = this.parseCommentOptions([
				lastTokenEndForComments,
				urlToken.end
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
					const { line: el, column: ec } = locConverter.get(urlToken.end);

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
				input.slice(urlToken.contentStart, urlToken.contentEnd),
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
							urlToken.start,
							urlToken.end
						);
						return;
					}
				}
			}
			const dep = new CssUrlDependency(
				value,
				[urlToken.start, urlToken.end],
				"url"
			);
			const { line: sl, column: sc } = locConverter.get(urlToken.start);
			const { line: el, column: ec } = locConverter.get(urlToken.end);
			dep.setLoc(sl, sc, el, ec);
			module.addDependency(dep);
			module.addCodeGenerationDependency(dep);
		};

		/**
		 * Process an `image-set()` function (or its vendor-prefixed forms).
		 * Each comma-separated option is either a bare string (the first
		 * one per segment is the image URL) or a nested `url()` /`url-token`
		 * (handled separately by `processURLFunction` / `processOldURLFunction`
		 * — the caller is expected to recurse into `fn.value` for those).
		 * Magic-comment range for the *first* string in a segment is
		 * `[segmentStart, string.end]`; the first segment's start is the
		 * image-set function start so a leading
		 * `/* webpackIgnore: true * /` is picked up.
		 * @param {FunctionNode} fn image-set function node
		 */
		const processImageSetFunction = (fn) => {
			// Keep the original side-effect: any nested url() picked up by a
			// later AST/streaming walk uses this as its magic-comment fence.
			lastTokenEndForComments = fn.nameRange[1] + 1;
			// The first emitted string uses the image-set function start as
			// its lower bound; subsequent strings use the previous emitted
			// string's end — matching the original `eatImageSetStrings`
			// + `values[index - 1][1]` indexing, so a magic comment between
			// two strings (even across commas and skipped url() functions)
			// is attributed to the next string.
			let prevStringEnd = fn.start;
			let firstInSegment = true;
			for (const cv of fn.value) {
				if (cv.type === "comma") {
					firstInSegment = true;
					continue;
				}
				if (cv.type === "whitespace") continue;
				const wasFirst = firstInSegment;
				firstInSegment = false;
				if (!wasFirst || cv.type !== "string") continue;
				const string = /** @type {Token} */ (cv);
				// Mirror the original: advance the prev-string fence for every
				// collected string, even if its dependency emission is skipped
				// below (empty url, webpackIgnore).
				const rangeStart = prevStringEnd;
				prevStringEnd = string.end;
				const value = normalizeUrl(
					input.slice(string.start + 1, string.end - 1),
					true
				);
				if (value.length === 0) continue;
				const { options, errors: commentErrors } = this.parseCommentOptions([
					rangeStart,
					string.end
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
						continue;
					}
				}
				const dep = new CssUrlDependency(
					value,
					[string.start, string.end],
					"url"
				);
				const { line: sl, column: sc } = locConverter.get(string.start);
				const { line: el, column: ec } = locConverter.get(string.end);
				dep.setLoc(sl, sc, el, ec);
				module.addDependency(dep);
				module.addCodeGenerationDependency(dep);
			}
		};

		/**
		 * Walk component values looking for url-emitting functions (url, src,
		 * nested image-set) — used after `processImageSetFunction` to pick up
		 * the form-2 `image-set(url("..."), ...)` syntax. Updates
		 * `lastTokenEndForComments` on commas, mirroring the main walker's
		 * `comma:` callback so each nested url() sees the correct magic
		 * comment range.
		 * @param {AstNode[]} cvs component values to walk
		 * @param {boolean=} skipUrlTokens when `true`, bare `url(unquoted)` tokens are not emitted as deps (matches the streaming walker's `case "url"` being skipped past whenever `processLocalDeclaration` consumed the whole declaration in local-mode modules)
		 */
		const walkFunctionsForUrl = (cvs, skipUrlTokens = false) => {
			for (const cv of cvs) {
				if (cv.type === "comma") {
					lastTokenEndForComments = cv.start;
				} else if (cv.type === "url" && !skipUrlTokens) {
					// Bare `url(unquoted)` token form. The streaming walker's
					// `case "url"` was skipped past whenever a declaration
					// in modules consumed its value (via
					// `processLocalDeclaration`'s `skipUntil`), so url-token
					// emission within a module declaration is suppressed
					// by callers passing `skipUrlTokens: true`. At-rule
					// preludes / non-module declarations leave it false.
					processOldURLFunction(/** @type {UrlToken} */ (cv));
				} else if (cv.type === "function") {
					const fn = /** @type {FunctionNode} */ (cv);
					const fname = fn.name.replace(/\\/g, "").toLowerCase();
					if (fname === "src" || fname === "url") {
						processURLFunction(fn, fname);
					} else if (IMAGE_SET_FUNCTION.test(fname)) {
						processImageSetFunction(fn);
						walkFunctionsForUrl(fn.value, skipUrlTokens);
					} else {
						walkFunctionsForUrl(fn.value, skipUrlTokens);
					}
				} else if (cv.type === "simple-block") {
					walkFunctionsForUrl(
						/** @type {SimpleBlock} */ (cv).value,
						skipUrlTokens
					);
				}
			}
		};

		/**
		 * Walk component values for `local(…)` / `global(…)` declaration-
		 * value functions, recursing into nested functions so e.g.
		 * `background: linear-gradient(local(--foo))` still picks up the
		 * inner `local(…)`. Called from `walkAstBlockContents`'s
		 * declaration branch; the streaming walker's `function:` case
		 * used to fire `processLocalOrGlobalFunction` for these but the
		 * emission has moved to the AST walker.
		 *
		 * `:local(…)` / `:global(…)` in selector context (with the
		 * leading colon) is *not* handled here — that's
		 * `walkAstSelectorList`'s job (see E3d). The two forms have
		 * different semantics: in selectors the wrapper is a mode
		 * scope, in declaration values the wrapper declares the
		 * enclosed ident(s) as locally-scoped names (e.g.
		 * `animation-name: local(my-anim)` adds an ICSS export).
		 * @param {AstNode[]} cvs component values
		 */
		const walkFunctionsForLocalGlobal = (cvs) => {
			for (const cv of cvs) {
				if (cv.type === "function") {
					const fn = /** @type {FunctionNode} */ (cv);
					const fname = fn.name.replace(/\\/g, "").toLowerCase();
					if (fname === "local" || fname === "global") {
						processLocalOrGlobalFunction(fn, fname === "local" ? 1 : 2);
					} else {
						walkFunctionsForLocalGlobal(fn.value);
					}
				} else if (cv.type === "simple-block") {
					walkFunctionsForLocalGlobal(/** @type {SimpleBlock} */ (cv).value);
				}
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
		 * Process import or export.
		 * @param {0 | 1} type import or export
		 * @param {string} input input
		 * @param {number} pos start position
		 * @returns {number} position after parse
		 */
		const processImportOrExport = (type, input, pos) => {
			pos = walkCssTokens.eatWhitespaceAndComments(input, pos)[0];
			/** @type {string | undefined} */
			let request;
			if (type === 0) {
				// `:import("path")` — the `(...)` tuple is one component
				// value (a simple-block with token `(`). Parsing it as a
				// unit replaces the previous "byte-check `(` + eatString
				// + skip + byte-check `)`" sequence.
				const headerCV = parseAComponentValue(input, pos, locConverter);
				if (
					!headerCV ||
					headerCV.value.type !== "simple-block" ||
					/** @type {SimpleBlock} */ (headerCV.value).token !== "("
				) {
					this._emitWarning(
						state,
						`Unexpected '${input[pos]}' at ${pos} during parsing of ':import' (expected '(')`,
						locConverter,
						pos,
						pos
					);
					return pos;
				}
				const sb = /** @type {SimpleBlock} */ (headerCV.value);
				// The first non-whitespace value inside `(...)` must be a
				// string literal. parse-css-style recovery for a missing
				// `)` implicitly closes the block at EOF — that's still a
				// "no string found" condition.
				const innerStrToken = sb.value.find((v) => v.type !== "whitespace");
				if (!innerStrToken || innerStrToken.type !== "string") {
					const innerPos = sb.start + 1;
					this._emitWarning(
						state,
						`Unexpected '${input[innerPos]}' at ${innerPos} during parsing of ':import' (expected string)`,
						locConverter,
						innerPos,
						innerPos
					);
					return innerPos;
				}
				request = input.slice(innerStrToken.start + 1, innerStrToken.end - 1);
				pos = headerCV.end;
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

			// Body: `{ name1: value1; name2: value2; … }`. Use
			// `parseAComponentValue` rather than `parseASimpleBlock` so
			// the leading whitespace/comment skip happens inside the AST
			// helper instead of through a separate `eatWhitespaceAndComments`
			// call. We then walk the simple-block's pre-tokenized children
			// extracting `ident COLON … SEMICOLON?` triples — equivalent
			// to the previous callbacks-based walker but without dragging
			// the streaming tokenizer through the body a second time.
			const bodyCV = parseAComponentValue(input, pos, locConverter, {
				comment
			});
			if (
				!bodyCV ||
				bodyCV.value.type !== "simple-block" ||
				/** @type {SimpleBlock} */ (bodyCV.value).token !== "{"
			) {
				return pos;
			}
			const body = /** @type {SimpleBlock} */ (bodyCV.value);
			const items = body.value;
			let i = 0;
			while (i < items.length) {
				// Skip whitespace and stray semicolons between declarations.
				while (
					i < items.length &&
					(items[i].type === "whitespace" || items[i].type === "semicolon")
				) {
					i++;
				}
				if (i >= items.length) break;
				// Recovery: skip non-ident heads up to the next `;`.
				if (items[i].type !== "ident") {
					while (i < items.length && items[i].type !== "semicolon") i++;
					continue;
				}
				const nameNode = items[i];
				i++;
				while (i < items.length && items[i].type === "whitespace") i++;
				if (i >= items.length || items[i].type !== "colon") {
					while (i < items.length && items[i].type !== "semicolon") i++;
					continue;
				}
				i++;
				while (i < items.length && items[i].type === "whitespace") i++;
				// Collect value tokens until next top-level `;` (or end of
				// block — the trailing decl in `{a:b; c:d}` has no `;`).
				const valueStartIdx = i;
				while (i < items.length && items[i].type !== "semicolon") i++;
				let valueLast = i - 1;
				while (
					valueLast >= valueStartIdx &&
					items[valueLast].type === "whitespace"
				) {
					valueLast--;
				}
				if (valueLast < valueStartIdx) {
					// Empty value — skip without emitting.
					continue;
				}
				const rawStart = items[valueStartIdx].start;
				const rawEnd = items[valueLast].end;
				createDep(
					input.slice(nameNode.start, nameNode.end),
					input.slice(rawStart, rawEnd),
					nameNode.end,
					rawEnd
				);
			}
			pos = body.end;
			pos = walkCssTokens.eatWhiteLine(input, pos);

			return pos;
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
		const processAtValue = (atRule) => {
			const start = atRule.start;
			const nameEnd = atRule.nameRange[1];
			const semi = atRule.end;
			const atRuleEnd = atRule.terminator === ";" ? semi + 1 : semi;
			const params = input.slice(nameEnd, semi);
			const parsed = parseValueAtRuleParams(params);

			if (
				typeof (/** @type {ValueAtRuleImport} */ (parsed).from) !== "undefined"
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
					return atRuleEnd;
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
				if (/** @type {ValueAtRuleValue} */ (parsed).localName.length === 0) {
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

				const { localName, value } = /** @type {ValueAtRuleValue} */ (parsed);
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
			return atRuleEnd;
		};

		/**
		 * Emit a `CssIcssSymbolDependency` rewrite for an ident that
		 * resolves to an `@value`-defined ICSS symbol. Source-order
		 * semantics (a reference to a name redefined later in the file
		 * resolves to the *earlier* definition) are preserved because
		 * the AST walker (E4c) iterates rules in source order, calling
		 * `processAtValue` on each `@value` before any later `case
		 * "identifier"`-equivalent walk (`walkIcssSymbolsInValue` /
		 * `walkAstSelectorList`) reads `icssDefinitions`.
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
			const isColon = input.charCodeAt(fn.start - 1) === CC_COLON;
			const openEnd = fn.nameRange[1] + 1;
			module.addPresentationalDependency(
				new ConstDependency("", [isColon ? fn.start - 1 : fn.start, openEnd])
			);

			if (type === 1) {
				for (const cv of fn.value) {
					if (cv.type !== "ident") continue;
					let identifier = unescapeIdentifier(/** @type {Token} */ (cv).value);
					const { line: sl, column: sc } = locConverter.get(cv.start);
					const { line: el, column: ec } = locConverter.get(cv.end);
					const isDashedIdent = isDashedIdentifier(identifier);
					if (isDashedIdent) identifier = identifier.slice(2);
					const dep = new CssIcssExportDependency(
						identifier,
						getReexport(identifier),
						[cv.start, cv.end],
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
				new ConstDependency("", [fn.end - 1, fn.end])
			);
		};

		/**
		 * AST companion to the streaming walker's `processLocalDeclaration`
		 * "known-property" branch. Walks a parsed `Declaration`'s value
		 * for idents / strings that name a locally-scoped resource (a
		 * keyframes name in `animation: …`, a counter name in
		 * `list-style: …`, a container name in `container: …`, a grid
		 * line-name in `grid-template: …`, …) and emits an
		 * `CssIcssExportDependency` per match, rewriting the source range
		 * with the localized name in place. The `keywords` table for each
		 * supported property comes from `getKnownProperties` and tells us
		 * which idents are spec-defined keywords (not user names) — those
		 * are skipped.
		 *
		 * Caller (`walkAstBlockContents` declaration branch) must gate on
		 * `isModules && isLocalMode && knownProperties.has(propertyName)`,
		 * matching the streaming walker's gate.
		 * @param {Declaration} decl declaration AST node
		 * @param {string} propertyName lower-cased property name with any vendor prefix stripped
		 * @returns {void}
		 */
		const processLocalDeclarationPropertyNames = (decl, propertyName) => {
			/** @type {[number, number, boolean?][]} */
			const values = [];
			/** @type {Record<string, number>} */
			let parsedKeywords = Object.create(null);

			const isGridProperty = Boolean(propertyName.startsWith("grid"));
			const isGridTemplate = isGridProperty
				? Boolean(
						propertyName === "grid" ||
						propertyName === "grid-template" ||
						propertyName === "grid-template-columns" ||
						propertyName === "grid-template-rows"
					)
				: false;

			const keywords =
				/** @type {Record<string, number>} */
				(knownProperties.get(propertyName));

			let afterExclamation = false;

			/**
			 * Walk component values for the "what should be exported as
			 * an ICSS identifier" pass. Mirrors the original streaming
			 * callbacks: only top-level for non-grid-template (idents
			 * inside nested funcs/blocks don't contribute), all levels
			 * for grid-template (where `[line-name]` blocks can live
			 * inside `repeat(...)`).
			 * @param {AstNode[]} cvs component values
			 */
			const walkExports = (cvs) => {
				for (const cv of cvs) {
					switch (cv.type) {
						case "comma":
							parsedKeywords = Object.create(null);
							break;
						case "delim":
							afterExclamation = /** @type {Token} */ (cv).value === "!";
							break;
						case "ident": {
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
							values.push([cv.start, cv.end]);
							break;
						}
						case "string": {
							if (
								propertyName === "animation" ||
								propertyName === "animation-name"
							) {
								values.push([cv.start, cv.end, true]);
							}
							if (
								propertyName === "grid" ||
								propertyName === "grid-template" ||
								propertyName === "grid-template-areas"
							) {
								const areas = unescapeIdentifier(
									source.slice(cv.start + 1, cv.end - 1)
								);
								const matches = matchAll(/\b\w+\b/g, areas);
								for (const match of matches) {
									const areaStart = cv.start + 1 + match.index;
									values.push([areaStart, areaStart + match[0].length, false]);
								}
							}
							break;
						}
						case "simple-block": {
							const block = /** @type {SimpleBlock} */ (cv);
							if (block.token === "[") {
								// Original behaviour: collect identifiers until the
								// first non-ident token, matching the spec-flavored
								// `<line-names> = '[' <custom-ident>* ']'` grammar.
								for (const inner of block.value) {
									if (inner.type === "whitespace") continue;
									if (inner.type !== "ident") break;
									values.push([inner.start, inner.end]);
								}
							} else if (isGridTemplate) {
								walkExports(block.value);
							}
							break;
						}
						case "function":
							if (isGridTemplate) {
								walkExports(/** @type {FunctionNode} */ (cv).value);
							}
							break;
						// Other types (whitespace, number, percentage, dimension,
						// hash, at-keyword, url, colon, semicolon, bad-*) carry no
						// ICSS-export information.
					}
				}
			};

			walkExports(decl.value);

			for (const value of values) {
				const { line: sl, column: sc } = locConverter.get(value[0]);
				const { line: el, column: ec } = locConverter.get(value[1]);
				const [start, end, isString] = value;
				const name = unescapeIdentifier(
					isString ? source.slice(start + 1, end - 1) : source.slice(start, end)
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
				if (cv.type === "whitespace") continue;

				if (cv.type === "string") {
					if (!found && options.string) {
						const value = unescapeIdentifier(
							input.slice(cv.start + 1, cv.end - 1)
						);
						const { line: sl, column: sc } = locConverter.get(cv.start);
						const { line: el, column: ec } = locConverter.get(cv.end);
						const dep = new CssIcssExportDependency(
							value,
							value,
							[cv.start, cv.end],
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

				if (cv.type === "ident") {
					if (!found && options.identifier) {
						const value = /** @type {Token} */ (cv).value;
						const identifier = unescapeIdentifier(value);
						if (
							options.identifier instanceof RegExp &&
							options.identifier.test(identifier)
						) {
							continue;
						}
						const { line: sl, column: sc } = locConverter.get(cv.start);
						const { line: el, column: ec } = locConverter.get(cv.end);
						const dep = new CssIcssExportDependency(
							identifier,
							getReexport(identifier),
							[cv.start, cv.end],
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

				if (cv.type === "function") {
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
			return atRule.end;
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
				if (cv.type === "whitespace") continue;
				if (cv.type === "ident") {
					identNode = /** @type {Token} */ (cv);
					identIdx = i;
				}
				break;
			}
			if (!identNode || !isDashedIdentifier(identNode.value)) return;

			const identStart = identNode.start;
			const identEnd = identNode.end;

			let j = identIdx + 1;
			while (j < fn.value.length && fn.value[j].type === "whitespace") j++;

			if (
				j >= fn.value.length ||
				fn.value[j].type !== "ident" ||
				/** @type {Token} */ (fn.value[j]).value.toLowerCase() !== "from"
			) {
				emitDashedIdentExport(identStart, identEnd);
				return;
			}

			const fromIdent = fn.value[j];
			j++;
			while (j < fn.value.length && fn.value[j].type === "whitespace") j++;
			if (j >= fn.value.length) return;

			const source = fn.value[j];
			if (
				source.type === "ident" &&
				/** @type {Token} */ (source).value === "global"
			) {
				emitDashedIdentFromGlobal(identEnd, source.end);
				return;
			}
			if (source.type === "string") {
				emitDashedIdentImport(
					identStart,
					identEnd,
					fromIdent.start,
					source.end,
					input.slice(source.start + 1, source.end - 1)
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
				if (cv.type === "ident") {
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
						while (j < cvs.length && cvs[j].type === "whitespace") j++;
						if (
							j < cvs.length &&
							cvs[j].type === "ident" &&
							/** @type {Token} */ (cvs[j]).value.toLowerCase() === "from"
						) {
							const fromIdent = cvs[j];
							j++;
							while (j < cvs.length && cvs[j].type === "whitespace") {
								j++;
							}
							if (j < cvs.length) {
								const sourceNode = cvs[j];
								if (
									sourceNode.type === "ident" &&
									/** @type {Token} */ (sourceNode).value === "global"
								) {
									emitDashedIdentFromGlobal(cv.end, sourceNode.end);
									i = j;
									continue;
								}
								if (sourceNode.type === "string") {
									emitDashedIdentImport(
										cv.start,
										cv.end,
										fromIdent.start,
										sourceNode.end,
										source.slice(sourceNode.start + 1, sourceNode.end - 1)
									);
									i = j;
									continue;
								}
							}
						}
						emitDashedIdentExport(cv.start, cv.end);
					}
				} else if (cv.type === "function") {
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
				} else if (cv.type === "simple-block") {
					walkDashedIdentsInValue(
						/** @type {SimpleBlock} */ (cv).value,
						emitTopLevelIdents
					);
				}
			}
		};

		/**
		 * Walk component-value tokens and emit `CssIcssSymbolDependency`
		 * rewrites for every ident (or function name) that resolves
		 * against the live `icssDefinitions`. Mirrors the streaming
		 * walker's `case "identifier"` icss branch.
		 *
		 * `dashedHandled` mirrors the streaming walker's
		 * "dashed wins, no rewrite" short-circuit:
		 * `options.dashedIdents && isLocalMode()`. When true,
		 * dashed-ident references are skipped here — the dashed-ident
		 * path (`walkDashedIdentsInValue`) owns their rewrite. When
		 * false (e.g. global mode, or `dashedIdents: false`), this
		 * walker emits for them too because nothing else would.
		 * @param {AstNode[]} cvs component values to walk
		 * @param {boolean} dashedHandled true when the surrounding
		 * context will run `walkDashedIdentsInValue` over the same
		 * `cvs` (so dashed idents should be skipped here)
		 * @returns {void}
		 */
		const walkIcssSymbolsInValue = (cvs, dashedHandled) => {
			for (const cv of cvs) {
				if (cv.type === "ident") {
					const identValue = /** @type {Token} */ (cv).value;
					if (dashedHandled && isDashedIdentifier(identValue)) continue;
					if (icssDefinitions.has(identValue)) {
						emitICSSSymbol(identValue, cv.start, cv.end);
					}
				} else if (cv.type === "function") {
					const fn = /** @type {FunctionNode} */ (cv);
					const fnameRaw = fn.name.replace(/\\/g, "");
					// Skip dashed function names (handled by
					// `walkDashedIdentsInValue` when applicable) and the
					// CSS-Modules `local(...)` / `global(...)` wrappers
					// (handled by `walkFunctionsForLocalGlobal`).
					if (
						!(dashedHandled && isDashedIdentifier(fnameRaw)) &&
						fnameRaw.toLowerCase() !== "local" &&
						fnameRaw.toLowerCase() !== "global" &&
						icssDefinitions.has(fnameRaw)
					) {
						emitICSSSymbol(fnameRaw, fn.nameRange[0], fn.nameRange[1]);
					}
					walkIcssSymbolsInValue(fn.value, dashedHandled);
				} else if (cv.type === "simple-block") {
					walkIcssSymbolsInValue(
						/** @type {SimpleBlock} */ (cv).value,
						dashedHandled
					);
				}
			}
		};

		/**
		 * AST companion to the streaming walker's
		 * `processLocalDeclaration` composes branch. Parses the
		 * `composes: <name>+ [from <source>]` (and
		 * `compose-with: …`) grammar from the declaration's value and
		 * emits the corresponding `CssIcssImportDependency` /
		 * `CssIcssExportDependency`s, plus a `ConstDependency` that
		 * strips the whole `composes: …;` (and trailing same-line
		 * whitespace) from the rendered output.
		 *
		 * Caller (`walkAstBlockContents` declaration branch) gates on
		 * the rule having a single local anchor — same precondition
		 * the streaming walker had via `lastLocalIdentifiers.length`.
		 * @param {Declaration} decl declaration AST node
		 * @returns {void}
		 */
		const processComposesAst = (decl) => {
			if (astCurrentRuleLocalIdentifiers.length > 1) {
				this._emitWarning(
					state,
					`Composition is only allowed when selector is single local class name not in "${astCurrentRuleLocalIdentifiers.join('", "')}"`,
					locConverter,
					decl.start,
					decl.end
				);
				return;
			}
			const lastLocalIdentifier = astCurrentRuleLocalIdentifiers[0];

			// Split the value at top-level commas — each segment is
			// one `<name>+ [from <source>]` group.
			/** @type {AstNode[][]} */
			const groups = [];
			/** @type {AstNode[]} */
			let currentGroup = [];
			for (const cv of decl.value) {
				if (cv.type === "comma") {
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
					if (cv.type === "whitespace") continue;

					if (phase === "expecting-source") {
						if (cv.type === "string") {
							fromSource = {
								kind: "string",
								path: source.slice(cv.start + 1, cv.end - 1)
							};
							phase = "done";
							continue;
						}
						if (
							cv.type === "ident" &&
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

					if (cv.type === "ident") {
						const identValue = /** @type {Token} */ (cv).value;
						if (identValue.toLowerCase() === "from" && classNames.length > 0) {
							let hasMore = false;
							for (let j = i + 1; j < group.length; j++) {
								if (group[j].type !== "whitespace") {
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
							start: cv.start,
							end: cv.end,
							isGlobal: false
						});
						continue;
					}

					if (cv.type === "function") {
						const fn = /** @type {FunctionNode} */ (cv);
						const fname = fn.name.replace(/\\/g, "").toLowerCase();
						const isGlobal = fname === "global";
						for (const inner of fn.value) {
							if (inner.type === "ident") {
								classNames.push({
									start: inner.start,
									end: inner.end,
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
						errorToken.start,
						errorToken.end
					);
					return;
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
							let successors = composesGraph.get(currentRulePrevComposesFile);
							if (!successors) {
								successors = new Set();
								composesGraph.set(currentRulePrevComposesFile, successors);
							}
							successors.add(request);
						}
						currentRulePrevComposesFile = request;
					}

					for (const { start, end } of classNames) {
						const identifier = unescapeIdentifier(source.slice(start, end));
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
						const identifier = unescapeIdentifier(source.slice(start, end));
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
						const identifier = unescapeIdentifier(source.slice(start, end));
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
			// from the output. `resumeAt` mirrors the streaming
			// walker's range computation; the strip range uses the
			// declaration's name-start so the property name is
			// included.
			const resumeAt =
				source.charCodeAt(decl.end) === CC_SEMICOLON
					? walkCssTokens.eatWhitespace(source, decl.end + 1)
					: decl.end;
			module.addPresentationalDependency(
				new ConstDependency("", [decl.nameRange[0], resumeAt])
			);
		};

		/**
		 * Process id selector.
		 * @param {string} input input
		 * @param {number} start start position
		 * @param {number} end end position
		 * @returns {number} position after handling
		 */
		const processIdSelector = (input, start, end) => {
			const valueStart = start + 1;
			const name = unescapeIdentifierCached(input.slice(valueStart, end));
			const dep = new CssIcssExportDependency(
				name,
				getReexport(name),
				[valueStart, end],
				true,
				CssIcssExportDependency.EXPORT_MODE.ONCE
			);
			const { line: sl, column: sc } = locConverter.get(start);
			const { line: el, column: ec } = locConverter.get(end);
			dep.setLoc(sl, sc, el, ec);
			module.addDependency(dep);
			if (pureMode) currentSelectorHasLocal = true;
			return end;
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
		const processAttributeSelector = (input, start, end) => {
			end = walkCssTokens.eatWhitespaceAndComments(input, end)[0];

			// Attribute name must be an ident equal to "class". One
			// `parseAComponentValue` replaces the manual eatIdentSequence
			// probe — `parseAComponentValue` skips comments and picks the
			// token kind in one go.
			const nameCV = parseAComponentValue(input, end, locConverter);
			if (!nameCV || nameCV.value.type !== "ident") return;
			const name = unescapeIdentifier(
				input.slice(nameCV.value.start, nameCV.value.end)
			);
			if (name.toLowerCase() !== "class") return;
			end = walkCssTokens.eatWhitespaceAndComments(input, nameCV.value.end)[0];

			const isTilde = input.charCodeAt(end) === CC_TILDE;

			if (
				input.charCodeAt(end) !== CC_EQUAL &&
				input.charCodeAt(end) !== CC_TILDE
			) {
				return;
			}

			end += 1;

			if (isTilde) {
				if (input.charCodeAt(end) !== CC_EQUAL) {
					return;
				}

				end += 1;
			}

			// `[class=<value>]` value — either an ident (`foo`) or a quoted
			// string (`"foo"`). `parseAComponentValue` skips leading
			// whitespace/comments and picks the right token kind in one
			// call, collapsing the previous eatWsCom + eatString + eatIdent
			// triple.
			const valueCV = parseAComponentValue(input, end, locConverter);
			if (!valueCV) return;
			/** @type {number} */
			let classNameStart;
			/** @type {number} */
			let classNameEnd;
			if (valueCV.value.type === "string") {
				classNameStart = valueCV.value.start + 1;
				classNameEnd = valueCV.value.end - 1;
			} else if (valueCV.value.type === "ident") {
				classNameStart = valueCV.value.start;
				classNameEnd = valueCV.value.end;
			} else {
				return;
			}
			const className = unescapeIdentifier(
				input.slice(classNameStart, classNameEnd)
			);
			const dep = new CssIcssExportDependency(
				className,
				getReexport(className),
				[classNameStart, classNameEnd],
				true,
				CssIcssExportDependency.EXPORT_MODE.NONE
			);
			const { line: sl, column: sc } = locConverter.get(classNameStart);
			const { line: el, column: ec } = locConverter.get(classNameEnd);
			dep.setLoc(sl, sc, el, ec);
			module.addDependency(dep);
		};

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
		/**
		 * Walk a block's contents starting at `startPos` (just past the
		 * opening `{`, or `0` for the top-level stylesheet) and return
		 * the position of the closing `}` (not consumed) or
		 * `source.length` for the outermost call. Drives the public
		 * `parseAtRule` / `parseADeclaration` /
		 * `parseAListOfComponentValues` helpers in a single pass —
		 * each byte is parsed exactly once, no flat-then-structured
		 * body re-parse — and dispatches each parsed head to the same
		 * `walkAstAtRule` / `walkAstQualifiedRule` / declaration
		 * handler the lazy `parseAStylesheet`-then-walk path used.
		 *
		 * `topLevel` is true only for the outermost stylesheet pass;
		 * nested at-rule / qualified-rule bodies recurse with false.
		 * `@import` placement (the `allowImportAtRule` rule) is a
		 * top-level-only concern, so nested `\@import`s always warn —
		 * we pass `topLevel: false` and `walkAstAtRule` reads
		 * `allowAstImport` only when `topLevel` is true.
		 * @param {number} startPos source position just past the
		 * opening `{` (or `0` for the top-level stylesheet)
		 * @param {boolean} topLevel whether this is the stylesheet's
		 * top level (sets `seenTopLevelRule` and resets `astModeData`
		 * between siblings)
		 * @returns {number} position at the closing `}` (or
		 * `source.length` for the outermost call)
		 */
		const walkAstBlockContents = (startPos, topLevel) => {
			let pos = startPos;
			while (pos < source.length) {
				// Item boundary: skip whitespace + comments + any stray
				// `;`s between items, same as `parseABlocksContents`.
				pos = walkCssTokens.eatWhitespaceAndComments(source, pos)[0];
				while (pos < source.length && source.charCodeAt(pos) === CC_SEMICOLON) {
					pos++;
					pos = walkCssTokens.eatWhitespaceAndComments(source, pos)[0];
				}
				if (pos >= source.length) break;
				// `}` closes the enclosing block — return so the caller
				// (an at-rule / qualified-rule body recursion site) can
				// consume it and patch `at.end` / `rule.end`.
				if (source.charCodeAt(pos) === CC_RIGHT_CURLY) return pos;

				if (pureMode) astAdvanceCommentCursor(pos);

				// At-rule. `parseAtRule` consumes the prelude only (it
				// stops at the first `{` / `;` / `}`), so we can patch
				// in a block placeholder, hand off to `walkAstAtRule`,
				// and let it drive the body recursion via
				// `walkAstBlockContents` itself.
				if (source.charCodeAt(pos) === CC_AT_SIGN) {
					// No `comment` callback — the pre-pass over
					// `walkCssTokens` has already populated
					// `this.comments` in source order; re-dispatching
					// from inside the parse helpers would push
					// duplicates out of order and break the binary
					// search in `getComments`.
					const at = parseAtRule(source, pos, locConverter);
					if (!at) {
						pos++;
						continue;
					}
					if (at.terminator === "{") {
						// Placeholder block — `walkAstAtRule` reads
						// `at.block.start` for the body-recursion call
						// and patches `at.block.end` / `at.end` past the
						// matching `}` once the body walk returns.
						at.block = new SimpleBlock(
							"{",
							[],
							at.end,
							at.end + 1,
							locConverter
						);
					}
					walkAstAtRule(/** @type {AtRule} */ (at), topLevel);
					if (topLevel) {
						if (at.terminator === "{") allowAstImport = false;
						if (pureMode) seenTopLevelRule = true;
					}
					pos = at.end;
					if (
						at.terminator === ";" && // `walkAstAtRule` already advanced `at.end` past
						// the `;` for the `;`-terminated AST-handled
						// at-rules (`@import` etc.) — only adjust here
						// when `at.end` still points at the `;`.

						pos < source.length &&
						source.charCodeAt(pos) === CC_SEMICOLON
					) {
						pos = walkCssTokens.eatWhiteLine(source, pos + 1);
					}
					if (topLevel) astModeData = undefined;
					continue;
				}

				// Try a declaration. `parseADeclaration` returns
				// `undefined` when the head isn't a valid declaration
				// (e.g. it sees `{` before `:`), in which case we fall
				// through to a qualified rule.
				// No `comment` callback (see `parseAtRule` above).
				const decl = parseADeclaration(source, pos, locConverter);
				// Top-level declarations are spec parse errors
				// (`parseAStylesheet` filtered them out of its `rules`
				// list) — advance past without visiting, but consume
				// the bytes so we don't loop on the same `:`.
				if (decl && topLevel) {
					pos = decl.end;
					if (pos < source.length && source.charCodeAt(pos) === CC_SEMICOLON) {
						pos++;
					}
					continue;
				}
				if (decl) {
					if (pureMode) {
						// Pure-mode: a direct declaration in the body marks
						// the enclosing rule frame as having declarations.
						// The streaming walker set this in `case
						// "identifier"` / `case "semicolon"`; mirroring it
						// here is structurally cleaner because the AST
						// already separates declarations from nested rules.
						const top = pureTop();
						if (top) top.hasDirectDecl = true;
					}
					// Declaration-value side effects: URL deps, `local(…)`
					// / `global(…)` strip + ICSS exports, composes
					// processing, dashed-ident exports, ICSS-symbol
					// rewrites. These all read `decl.name` / `decl.value`
					// / `decl.nameRange` from the `Declaration` returned
					// by `parseADeclaration`.
					const declPropertyName = decl.name
						.replace(/^(-\w+-)/, "")
						.toLowerCase();
					// `walkFunctionsForUrl` reads `lastTokenEndForComments`
					// to attach magic comments to each URL. Position it
					// just past the property `:` so a comment placed
					// between `:` and the url() is found.
					let colonPos = decl.nameRange[1];
					while (
						colonPos < source.length &&
						source.charCodeAt(colonPos) !== CC_COLON
					) {
						colonPos++;
					}
					lastTokenEndForComments = colonPos + 1;
					if (this.options.url) {
						// In modules + local mode the streaming walker's
						// `case "url"` for unquoted url tokens was
						// skipped past by `processLocalDeclaration` —
						// but only when that helper actually consumed
						// the whole declaration, which happens iff
						// `isLocalMode() && knownProperties.has(propertyName)`.
						// Otherwise it bailed right after the `:` and
						// the streaming walker resumed firing url-token
						// deps for the value. Mirror the same gate.
						const effectiveLocalMode = astModeData
							? astModeData === "local"
							: mode === "local";
						const skipUrlTokens =
							isModules &&
							effectiveLocalMode &&
							knownProperties.has(declPropertyName);
						walkFunctionsForUrl(decl.value, skipUrlTokens);
					}
					// `local(…)` / `global(…)` declaration-value functions:
					// emit strip-dep for the wrapper + an ICSS export per
					// inner ident (the latter for `local(…)` only).
					// `processLocalOrGlobalFunction` does both. Only
					// relevant in modules mode — non-modules don't have
					// ICSS exports.
					//
					// Skip when this is a `composes` / `compose-with`
					// declaration AND the rule has a local class / id /
					// attribute anchor — in that case the streaming
					// walker's composes branch already emits a strip-dep
					// covering the whole `composes: …;` and an inner
					// ICSS-export rewrite from this walker would overlap
					// with that strip and leak the localized name into
					// the body. The "bailed composes" case (no anchor,
					// e.g. global-mode rules) still needs this walk —
					// the streaming walker's composes branch returns
					// just past `:` and the inner `local(…)` /
					// `global(…)` functions need their strip + ICSS
					// emission from somewhere.
					const isComposesWithAnchor =
						COMPOSES_PROPERTY.test(declPropertyName) &&
						astCurrentRuleHasLocalAnchor;
					// E4a-3: `composes:` / `compose-with:` declarations
					// with a local class anchor — process the
					// CSS-Modules composition grammar and emit the
					// composes deps + strip-dep here. The "bailed
					// composes" case (no local anchor, e.g. in
					// global-mode rules) falls through to the regular
					// `walkFunctionsForLocalGlobal` /
					// `walkDashedIdentsInValue` walks below so any
					// nested `local(…)` / `global(…)` / `var(--foo)`
					// inside the composes value still get their
					// normal source rewriting.
					if (isComposesWithAnchor) {
						processComposesAst(decl);
						// The composes strip-dep covers the whole
						// `composes: …;` so the per-walk deps below
						// would overlap with the strip and leak the
						// localized names into the output. The legacy
						// `skipForComposes` gate stays here for the
						// dashed-ident / function-LG walks below.
					}
					const skipForComposes = isComposesWithAnchor;
					if (isModules && !skipForComposes) {
						walkFunctionsForLocalGlobal(decl.value);
					}
					// E4a-2: Property-name local emission for known
					// properties (`animation-name: foo` → emits ICSS
					// export for `foo`). Gated on local mode +
					// knownProperty.
					const effectiveLocalMode = astModeData
						? astModeData === "local"
						: mode === "local";
					if (
						isModules &&
						effectiveLocalMode &&
						knownProperties.has(declPropertyName)
					) {
						processLocalDeclarationPropertyNames(decl, declPropertyName);
					}
					// E4d: dashed-ident (custom-property) ICSS export
					// emission. The dashed property name itself is an
					// export (`--my-color: …` registers `--my-color`).
					// The value is walked for nested `var()` / `style()`
					// / `--foo(args)` calls, plus any top-level dashed
					// idents in *unknown* property values (matching the
					// streaming walker's `case "identifier"` for
					// dashed-idents in non-knownProperty declarations
					// where `processLocalDeclaration` bailed past the
					// `:`).
					//
					// Skip when this is a `composes` / `compose-with`
					// declaration AND the rule has a local class / id /
					// attribute anchor — same gate as
					// `walkFunctionsForLocalGlobal` (E4a-1). In that
					// case the streaming walker's composes branch set
					// `skipUntil = decl.end` past the whole declaration
					// and inner `case "identifier"` for dashed-idents
					// never fired. Emitting from the AST walker would
					// overlap with the composes strip-dep and leak the
					// localized name into the output.
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
					// E4e: ICSS-symbol rewrite in declaration values
					// (`color: foo` → CSS-Modules rewrite when `foo` is
					// `@value`-defined). The streaming walker's
					// `case "identifier"` icss branch covered this; mirror
					// it here. Skipped when the property is "known" (the
					// streaming walker's `processLocalDeclaration`
					// short-circuited past the entire declaration so no
					// inner `case "identifier"` fired), when the rule has
					// the composes anchor (the composes strip-dep already
					// covers the whole `composes: …;`), and when the
					// property name itself is dashed (the dashed-ident
					// walk owns its rewrite).
					if (
						isModules &&
						!skipForComposes &&
						!knownProperties.has(declPropertyName)
					) {
						// "dashed wins" priority matches the streaming
						// walker's `case "identifier"`: dashed idents are
						// skipped here only when
						// `walkDashedIdentsInValue` will run over the
						// same value (local mode + dashed-idents option).
						const dashedHandled = Boolean(
							this.options.dashedIdents && effectiveLocalMode
						);
						if (
							!(dashedHandled && isDashedIdentifier(decl.name)) &&
							icssDefinitions.has(decl.name)
						) {
							// Property name is itself an `@value`-defined
							// ident (e.g. `myProp: …` where `myProp` is
							// `@value myProp: actualProp;`). Streaming
							// walker's `case "identifier"` would rewrite
							// the property-name ident before falling to
							// `processLocalDeclaration`.
							emitICSSSymbol(decl.name, decl.nameRange[0], decl.nameRange[1]);
						}
						walkIcssSymbolsInValue(decl.value, dashedHandled);
					}
					pos = decl.end;
					if (pos < source.length && source.charCodeAt(pos) === CC_SEMICOLON) {
						pos++;
					}
					if (topLevel) astModeData = undefined;
					continue;
				}

				// Qualified rule. `parseAQualifiedRule` would consume
				// the body via `parseASimpleBlock` (flat tokens we'd
				// then re-parse to walk); replicate just its prelude
				// parse with `parseAListOfComponentValues` (same
				// `stopAtLeftCurly` / `stopAtRightCurly` flags) so the
				// body recursion goes through `walkAstBlockContents`
				// without an intermediate flat-tokens pass.
				// No `comment` callback (see `parseAtRule` above).
				const head = parseAListOfComponentValues(source, pos, locConverter, {
					stopAtLeftCurly: true,
					stopAtRightCurly: true
				});
				if (head.end <= pos) {
					pos++;
					continue;
				}
				const rule = new QualifiedRule(
					head.values,
					null,
					pos,
					head.end,
					locConverter
				);
				if (head.terminator === "{") {
					// Same placeholder-then-walk pattern as for at-rules:
					// `walkAstQualifiedRule` reads `rule.block.start` to
					// drive the body recursion and patches the `end`s
					// itself once the walk returns.
					rule.block = new SimpleBlock(
						"{",
						[],
						head.end,
						head.end + 1,
						locConverter
					);
				}
				walkAstQualifiedRule(rule, topLevel);
				if (topLevel) {
					allowAstImport = false;
					if (pureMode) seenTopLevelRule = true;
				}
				pos = rule.end;
				if (topLevel) astModeData = undefined;
			}
			return pos;
		};
		/**
		 * Walk an at-rule. Dispatches on the (lowercased) at-rule name
		 * and calls the same per-rule helpers (`processAtImport`,
		 * `processAtValue`, `processLocalAtRule`, …) the streaming
		 * walker's `atKeyword:` case used to call.
		 * @param {AtRule} at at-rule node
		 * @param {boolean} topLevel whether this at-rule sits at the stylesheet's top level
		 * @returns {void}
		 */
		const walkAstAtRule = (at, topLevel) => {
			// Save composes-anchor state for the duration of this at-rule.
			// Unlike a qualified rule, an at-rule doesn't have its own
			// selector context — its body inherits the surrounding rule's
			// anchor state (so `:local(.foo) { @media (…) { composes: … } }`
			// still sees the local anchor). The identifier list is copied
			// so anything an `@scope (:local(.bar))` prelude pushes is
			// scoped to the at-rule and its descendants; siblings of the
			// at-rule (and the next top-level rule) get the original list
			// back on exit.
			const savedAnchor = astCurrentRuleHasLocalAnchor;
			const savedLocalIdentifiers = astCurrentRuleLocalIdentifiers;
			astCurrentRuleLocalIdentifiers = [...savedLocalIdentifiers];
			const name = `@${at.name.toLowerCase()}`;
			switch (name) {
				case "@namespace": {
					this._emitWarning(
						state,
						"'@namespace' is not supported in bundled CSS",
						locConverter,
						at.start,
						at.nameRange[1]
					);
					break;
				}
				case "@charset": {
					if (/** @type {CssModule} */ (module).exportType !== "style") {
						// Strip the whole `@charset "..."` (and its `;` if
						// present) — webpack bundles can't carry a real
						// `@charset`.
						const atRuleEnd = at.terminator === ";" ? at.end + 1 : at.end;
						const dep = new ConstDependency("", [at.start, atRuleEnd]);
						module.addPresentationalDependency(dep);
						const string = at.prelude.find((v) => v.type !== "whitespace");
						if (string && string.type === "string") {
							/** @type {BuildInfo} */
							(module.buildInfo).charset = source
								.slice(string.start + 1, string.end - 1)
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
							at.start,
							at.nameRange[1]
						);
						break;
					}
					processAtImport(at);
					break;
				}
				default: {
					if (!isModules) break;
					if (name === "@value") {
						// `@value` is processed during AST walk so its
						// `icssDefinitions` updates land in source order
						// (chained `@value` resolution, `@value … from <name>`
						// where `<name>` is itself another `@value`, and the
						// "wrong order" detection all rely on the live state
						// at the moment each `@value` is seen).
						processAtValue(at);
						break;
					} else if (
						this.options.animation &&
						OPTIONALLY_VENDOR_PREFIXED_KEYFRAMES_AT_RULE.test(name)
					) {
						// In `local` mode the bare keyframe name and any
						// quoted form (`@keyframes "name"`) are renamed; in
						// `global` mode they stay verbatim. Explicit
						// `local()` / `global()` / `:local()` / `:global()`
						// wrappers in the prelude are honoured in **both**
						// modes (their function path inside
						// `processLocalAtRule` is unconditional). This
						// matches the streaming walker's combination of
						// gated `processLocalAtRule` + unconditional `function:`
						// callback for `local()`/`global()`.
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
					// `@scope`, `@media`, `@supports`, `@layer`, `@page`,
					// `@font-face` and friends: no per-at-rule dep emission
					// at this level. Their bodies are handled by the
					// recursion below.
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

			// At-rule preludes can carry url() / src() / image-set() —
			// e.g. `@supports (background-image: url(...))`. The streaming
			// walker's `case "url"` / `case "function"` would fire on the
			// prelude tokens; mirror that with an AST walk. `@import` is
			// handled by `processAtImport` itself (which already calls
			// `walkFunctionsForUrl`), so skip it here.
			if (this.options.url && name !== "@import" && at.prelude.length > 0) {
				lastTokenEndForComments = at.nameRange[1];
				walkFunctionsForUrl(at.prelude, false);
			}

			// At-rule preludes can also carry `local(...)` / `global(...)`
			// (e.g. `@function :local(--name)(args)`,
			// `@property local(--name)`, `@color-profile :global(--name)`).
			// The streaming walker's `case "function"` would fire on
			// these because `atKeyword:` sets `isNextRulePrelude = false`
			// for non-AST-handled at-rules — mirror that with an AST walk.
			// AST-handled at-rules (`@import` / `@charset` / `@namespace`
			// / `@value` / `@keyframes` (when `animation`) / `@counter-style`
			// (when `customIdents`) / `@container` (when `container`)) are
			// already handled by `processLocalAtRule` / `processAtImport`
			// / `processAtValue`, which call `processLocalOrGlobalFunction`
			// directly for their first local/global function — so skip
			// them here to avoid double-emission.
			const isProcessedByLocalAtRule =
				name === "@import" ||
				name === "@charset" ||
				name === "@namespace" ||
				name === "@value" ||
				// `@scope`'s prelude is a selector list — handled by
				// `walkAstSelectorList` above which already recurses
				// into `:local(…)` / `:global(…)` wrappers for class /
				// id / attribute selectors. Running this walk too
				// would double-emit ICSS exports for inner idents
				// (which `processLocalOrGlobalFunction` interprets as
				// "declared name", but in the @scope prelude they're
				// class refs).
				name === "@scope" ||
				(isModules &&
					((this.options.animation &&
						OPTIONALLY_VENDOR_PREFIXED_KEYFRAMES_AT_RULE.test(name)) ||
						(this.options.customIdents && name === "@counter-style") ||
						(this.options.container && name === "@container")));
			if (isModules && !isProcessedByLocalAtRule && at.prelude.length > 0) {
				walkFunctionsForLocalGlobal(at.prelude);
			}

			// E4d: at-rule preludes can also carry dashed idents that
			// register as ICSS exports (`@property --foo {…}`,
			// `@color-profile --bar {…}`, …). Mirror the streaming
			// walker's `case "identifier"` for dashed-idents inside
			// the prelude (which fired because `atKeyword:` for non-
			// AST-handled at-rules sets `isNextRulePrelude = false`
			// and doesn't skipUntil past the prelude).
			if (
				this.options.dashedIdents &&
				isModules &&
				!isProcessedByLocalAtRule &&
				at.prelude.length > 0
			) {
				const effectiveLocalMode = astModeData
					? astModeData === "local"
					: mode === "local";
				if (effectiveLocalMode) {
					walkDashedIdentsInValue(at.prelude, true);
				}
			}

			// E4e: ICSS-symbol rewrite in at-rule preludes
			// (`@media small` → `@media (max-width: 599px)` when `small`
			// is `@value`-defined). The streaming walker's
			// `case "identifier"` icss branch fired for these too.
			// `@value` (which builds its own `icssDefinitions` entry) and
			// `@import` (which has its own ident-as-`@value` resolution
			// via `processAtImport`) are excluded.
			if (
				isModules &&
				name !== "@value" &&
				name !== "@import" &&
				at.prelude.length > 0
			) {
				const effectiveLocalMode = astModeData
					? astModeData === "local"
					: mode === "local";
				const dashedHandled = Boolean(
					this.options.dashedIdents &&
					!isProcessedByLocalAtRule &&
					effectiveLocalMode
				);
				walkIcssSymbolsInValue(at.prelude, dashedHandled);
			}

			// Pure-mode: at-rules in pure local mode for `@keyframes` /
			// `@counter-style` / `@container` get their bodies marked
			// "skip" / "treat as leaf" so the warning logic doesn't
			// double-warn on inner declarations (matches PCSL). The
			// streaming walker did this via `nextBlockChildrenSkip` /
			// `nextBlockTreatAsLeaf` flags consumed by the next
			// `leftCurlyBracket:`; in the AST world we compute the
			// values locally per-at-rule and pass them straight into
			// the frame push below.
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
					if (cv.type === "whitespace") continue;
					if (cv.type === "string") {
						if (acceptString) currentSelectorHasLocal = true;
						break;
					}
					if (cv.type === "ident") {
						if (!acceptIdent) break;
						const text = source.slice(cv.start, cv.end);
						if (identSkip && identSkip.test(text)) continue;
						currentSelectorHasLocal = true;
						break;
					}
					if (cv.type === "function") {
						const fname = /** @type {FunctionNode} */ (cv).name
							.replace(/\\/g, "")
							.toLowerCase();
						if (fname === "local") currentSelectorHasLocal = true;
						// `global` (and any other function) leaves the
						// flag false — explicit non-local.
						break;
					}
				}
			}
			// Recurse into the body so nested at-rules + qualified rules
			// inside `@media`/`@supports`/`@layer`/`@scope` get visited.
			if (at.block) {
				if (pureMode) {
					// `@keyframes` / `@counter-style` / `@container` /
					// `@scope` carry a selector-like prelude (animation
					// name, counter-style name, container name, or full
					// selector list) — the streaming walker treated their
					// `{` as a rule-prelude leftCurlyBracket, so their
					// frame's `isRulePrelude` is `true` and an
					// impure-prelude warning fires the same way it does
					// for a qualified rule. `@media` / `@supports` /
					// `@layer` / `@page` / `@font-face` etc. carry non-
					// selector preludes and stay `isRulePrelude: false`
					// (no warning, but `hasDirectDecl` still propagates).
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
						preludeStart: at.start,
						preludeEnd: at.block.start
					});
					if (top) top.hasNestedBlock = true;
					pureIgnorePending = false;
					currentSelectorHasLocal = false;
					currentRuleHasImpureSelector = false;
				}
				// Body recursion. Single-pass: `walkAstBlockContents`
				// reads source directly via `parseAtRule` /
				// `parseADeclaration` / `parseAListOfComponentValues`
				// and returns the position of the closing `}`.
				const bodyEnd = walkAstBlockContents(at.block.start + 1, false);
				const past =
					bodyEnd < source.length &&
					source.charCodeAt(bodyEnd) === CC_RIGHT_CURLY
						? bodyEnd + 1
						: bodyEnd;
				at.block.end = past;
				at.end = past;
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
						// Propagate `hasDirectDecl` upward through
						// non-rule-prelude at-rule frames (`@media { decl }`
						// inside a rule must count as the rule having
						// declarations).
						if (!frame.isRulePrelude && frame.hasDirectDecl) {
							const parent = pureTop();
							if (parent) parent.hasDirectDecl = true;
						}
					}
				}
			} else if (
				isModules &&
				at.terminator === ";" &&
				name !== "@import" &&
				name !== "@charset" &&
				name !== "@namespace" &&
				name !== "@value" &&
				!(
					this.options.animation &&
					OPTIONALLY_VENDOR_PREFIXED_KEYFRAMES_AT_RULE.test(name)
				) &&
				!(this.options.customIdents && name === "@counter-style") &&
				!(this.options.container && name === "@container")
			) {
				// A `;`-terminated at-rule that isn't one of our recognized
				// CSS-Modules forms (e.g. `@keyframes broken;` when
				// `animation: false`) — mirror the streaming walker's
				// `isNextRulePrelude = false` for non-AST-handled at-rules.
				// `astModeData` would be reset by `runAstWalker`'s
				// per-top-level reset before reaching the next rule, so we
				// use a separate one-shot flag that the next qualified
				// rule's prelude walk consumes.
				astSuppressNextRulePrelude = true;
			}
			astCurrentRuleHasLocalAnchor = savedAnchor;
			astCurrentRuleLocalIdentifiers = savedLocalIdentifiers;
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
				if (v.type === "comma") {
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
				if (v.type === "whitespace") continue;
				// Pure-mode: `&` in a prelude marks the current segment
				// as pure when an ancestor is pure (CSS nesting parent
				// reference inherits the parent rule's purity). Mirrors
				// the streaming walker's `case "delim"` `&` branch.
				if (
					topLevel &&
					pureMode &&
					v.type === "delim" &&
					/** @type {Token} */ (v).value === "&" &&
					parentEffectivePure()
				) {
					currentSelectorHasLocal = true;
				}
				if (v.type === "colon") {
					// Look ahead for `:local` / `:global` markers.
					const next = values[i + 1];
					if (!next) continue;
					if (next.type === "ident") {
						const id = /** @type {Token} */ (next).value.toLowerCase();
						if (id === "local" || id === "global") {
							// Bare `:local` / `:global` — mode change for
							// the rest of this segment, and (at top-level)
							// also leaks into the persistent
							// `astModeData` so the body's nested rules
							// inherit it. Emit a strip dep covering the
							// `:local`/`:global` marker plus the trailing
							// whitespace that the spec requires. Use
							// `eatWhitespace` (not the AST whitespace
							// nodes) so a comment between `:local` and
							// the next selector stops the strip and
							// stays in the output, matching the streaming
							// walker's `colon:` emission.
							const stripEnd = walkCssTokens.eatWhitespace(source, next.end);
							if (isModules) {
								module.addPresentationalDependency(
									new ConstDependency("", [v.start, stripEnd])
								);
							}
							// Bare `:local` / `:global` requires a space
							// before the next selector — `:local.b` is
							// ambiguous with a pseudo-class call. Warn
							// when *no* whitespace follows the ident
							// (a comment alone doesn't count, but a
							// comment plus whitespace does). Mirrors
							// the streaming walker's `case "colon"`
							// `eatWhitespaceAndComments` probe of
							// `foundWhitespace`.
							const probe = walkCssTokens.eatWhitespaceAndComments(
								source,
								next.end
							);
							if (!probe[1]) {
								this._emitWarning(
									state,
									`Missing whitespace after ':${id}' in '${source.slice(
										v.start,
										eatUntilLeftCurly(source, next.end) + 1
									)}'`,
									locConverter,
									v.start,
									next.end
								);
							}
							segmentMode = id;
							if (topLevel) astModeData = id;
							// Skip past the colon + ident; the surrounding
							// whitespace nodes are harmless to revisit.
							i += 1;
							continue;
						}
					} else if (next.type === "function") {
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
								const stripLeadEnd = walkCssTokens.eatWhitespaceAndComments(
									source,
									afterParen
								)[0];
								module.addPresentationalDependency(
									new ConstDependency("", [v.start, stripLeadEnd])
								);
								// Trailing: `:local` strips whitespace
								// before `)`; `:global` strips only `)`.
								let trailStart = fn.end - 1; // position of `)`
								if (fname === "local") {
									while (
										trailStart > 0 &&
										walkCssTokens.isWhiteSpace(
											source.charCodeAt(trailStart - 1)
										)
									) {
										trailStart--;
									}
								}
								module.addPresentationalDependency(
									new ConstDependency("", [trailStart, fn.end])
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
				if (v.type === "function") {
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
					v.type === "hash" &&
					/** @type {HashToken} */ (v).id &&
					segmentMode === "local"
				) {
					// ID selectors emit the ICSS export but, matching the
					// streaming walker, do *not* count as a local "class
					// name" anchor for `composes:` — the streaming
					// `processIdSelector` doesn't push to
					// `lastLocalIdentifiers`, so a `:local(#x) { composes:
					// y; }` rule is silently ignored by composes
					// resolution.
					processIdSelector(source, v.start, v.end);
					continue;
				}
				if (
					v.type === "simple-block" &&
					/** @type {SimpleBlock} */ (v).token === "[" &&
					segmentMode === "local"
				) {
					// Attribute selectors (`[class="foo"]`) likewise emit
					// the ICSS export without counting as a composes
					// anchor — the streaming walker's
					// `processAttributeSelector` doesn't push to
					// `lastLocalIdentifiers`.
					processAttributeSelector(source, v.start, v.start + 1);
					continue;
				}
				// `@scope (.foo)` and other parenthesised selector wrappers —
				// the `(…)` is a simple-block whose values are themselves a
				// selector list. Recurse with the current segment mode.
				if (
					v.type === "simple-block" &&
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
					v.type === "delim" &&
					/** @type {Token} */ (v).value === "." &&
					segmentMode === "local"
				) {
					const next = values[i + 1];
					if (next && next.type === "ident") {
						const name = unescapeIdentifier(source.slice(next.start, next.end));
						const dep = new CssIcssExportDependency(
							name,
							getReexport(name),
							[next.start, next.end],
							true,
							CssIcssExportDependency.EXPORT_MODE.ONCE
						);
						const { line: sl, column: sc } = locConverter.get(next.start);
						const { line: el, column: ec } = locConverter.get(next.end);
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
					v.type === "delim" &&
					/** @type {Token} */ (v).value === "." &&
					segmentMode === "global"
				) {
					const next = values[i + 1];
					if (next && next.type === "ident") {
						const ident = /** @type {Token} */ (next).value;
						if (!isDashedIdentifier(ident) && icssDefinitions.has(ident)) {
							emitICSSSymbol(ident, next.start, next.end);
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
					v.type === "ident" &&
					!isDashedIdentifier(/** @type {Token} */ (v).value) &&
					icssDefinitions.has(/** @type {Token} */ (v).value)
				) {
					emitICSSSymbol(/** @type {Token} */ (v).value, v.start, v.end);
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
		 * Walk a qualified rule (a style rule). Selectors are emitted
		 * here; declaration handling is in `walkAstBlockContents`.
		 * @param {QualifiedRule} rule qualified-rule node
		 * @param {boolean} topLevel true when this rule sits directly at
		 * stylesheet top level (not nested inside another rule / at-rule
		 * body); used to gate ICSS `:import` / `:export` pseudo-rule
		 * processing the same way the streaming walker did via its
		 * `CSS_MODE_TOP_LEVEL` scope check
		 * @returns {void}
		 */
		const walkAstQualifiedRule = (rule, topLevel) => {
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
					rule.prelude[firstIdx].type === "whitespace"
				) {
					firstIdx++;
				}
				if (
					firstIdx + 1 < rule.prelude.length &&
					rule.prelude[firstIdx].type === "colon"
				) {
					const second = rule.prelude[firstIdx + 1];
					const name =
						second.type === "ident"
							? /** @type {Token} */ (second).value.toLowerCase()
							: second.type === "function"
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
							const afterIdent =
								second.type === "function"
									? /** @type {FunctionNode} */ (second).nameRange[1]
									: second.end;
							const startColon = rule.prelude[firstIdx].start;
							const endAfterBody = processImportOrExport(
								name === "import" ? 0 : 1,
								source,
								afterIdent
							);
							module.addPresentationalDependency(
								new ConstDependency("", [startColon, endAfterBody])
							);
							// `walkAstBlockContents` (single-pass) reads
							// `rule.end` to know where to resume after the
							// body — patch it past the consumed
							// `:import` / `:export` block so the next
							// top-level item isn't re-parsed from inside
							// our just-consumed body. Old code path got
							// `rule.end` past `}` from `parseAStylesheet`'s
							// up-front body consumption.
							if (rule.block) rule.block.end = endAfterBody;
							rule.end = endAfterBody;
						} else if (rule.block) {
							// Nested `:import` / `:export` aren't a real
							// CSS-Modules construct — leave the body
							// alone (walking it would mis-handle its
							// declarations as ICSS exports), but still
							// advance `rule.end` past the closing `}` so
							// `walkAstBlockContents` knows where the
							// rule ends. Parse the body as a simple
							// block, just to skip it.
							// No `comment` callback — `this.comments` was
							// already populated by the pre-pass.
							const blk = walkCssTokens.parseASimpleBlock(
								source,
								rule.block.start,
								locConverter
							);
							if (blk) {
								rule.block.end = blk.end;
								rule.end = blk.end;
							}
						}
						return;
					}
				}
			}
			// Reset / restore `astCurrentRuleHasLocalAnchor` around this
			// rule so the declaration walker sees the correct anchor
			// state for this rule's body and the parent's state survives
			// nested-rule recursion. The identifier list is *inherited*
			// from the parent (copied so our additions don't leak back)
			// because the streaming walker's `lastLocalIdentifiers` only
			// reset at top-level `rightCurlyBracket` — a `composes:` in a
			// nested rule sees both parent and child class names, which
			// is what produces the "Composition is only allowed when
			// selector is single local class name not in <list>" warning
			// for nested locals.
			const savedAnchor = astCurrentRuleHasLocalAnchor;
			const savedLocalIdentifiers = astCurrentRuleLocalIdentifiers;
			astCurrentRuleHasLocalAnchor = false;
			astCurrentRuleLocalIdentifiers = [...savedLocalIdentifiers];
			// E4a-3: composes-state reset between rules. The streaming
			// walker's `case "rightCurlyBracket"` cleared
			// `currentRulePrevComposesFile` / `currentRuleComposesFiles`
			// on every top-level close, but those resets fire *during*
			// streaming — by the time the AST walker iterates its own
			// rules in `walkAstBlockContents`, those side effects are
			// already gone. We have to do the equivalent reset around
			// each AST-walked rule.
			const savedPrevComposesFile = currentRulePrevComposesFile;
			const savedComposesFiles = new Set(currentRuleComposesFiles);
			currentRulePrevComposesFile = undefined;
			currentRuleComposesFiles.clear();
			// Selectors are only CSS-Modules-relevant when `isModules`
			// holds. For non-Modules files (e.g. `type: "css"` with the
			// default `pure`-mode parser), explicit `:local(…)` markers
			// from an imported `.module.css` would otherwise be picked
			// up here and emit `CssIcssExportDependency`s against a
			// generator that has no `localIdentName`. Match the
			// streaming walker's `isModules` gate.
			if (isModules) {
				walkAstSelectorList(
					rule.prelude,
					/** @type {"local" | "global"} */ (
						mode === "local" ? "local" : "global"
					)
				);
			}
			// Qualified-rule preludes (selectors) don't normally carry
			// url() / src() / image-set(), but a malformed declaration
			// followed by orphan `url(...)` tokens (e.g.
			// `background: x; url("./a.png"), url("./b.png");`) gets
			// parsed as a (degenerate) nested qualified-rule whose
			// prelude is the url() chain. The streaming walker fired
			// `case "function"` on those urls and emitted URL deps —
			// mirror that by walking the prelude.
			if (this.options.url && rule.prelude.length > 0) {
				lastTokenEndForComments = rule.prelude[0].start;
				walkFunctionsForUrl(rule.prelude, false);
			}
			// E4d: dashed-ident emission in qualified-rule preludes,
			// gated to the deprecated "custom property set" syntax
			// (`--foo: { … }`) which the AST parser treats as a nested
			// qualified-rule (because of the `{`) instead of a
			// declaration. The streaming walker's `case "identifier"`
			// fired for the leading `--foo` regardless of how
			// `processLocalDeclaration` saw it, so mirror that here —
			// but only when the prelude actually starts with a
			// dashed-ident (otherwise we'd double-emit on class
			// selectors like `.--c`, where `walkAstSelectorList`
			// already emitted via the class-selector path).
			if (this.options.dashedIdents && isModules && rule.prelude.length > 0) {
				let firstIdx = 0;
				while (
					firstIdx < rule.prelude.length &&
					rule.prelude[firstIdx].type === "whitespace"
				) {
					firstIdx++;
				}
				const first = rule.prelude[firstIdx];
				if (
					first &&
					first.type === "ident" &&
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
			// Pure-mode: push a qualified-rule frame just before walking
			// the body. `walkAstSelectorList` above has already called
			// `finalizeSelector()` for the trailing segment, so
			// `currentRuleHasImpureSelector` reflects the whole
			// prelude. The frame captures `impure` and
			// `ancestorHadLocal` *at push time*; nested-rule walks
			// then read `parentEffectivePure()` off this frame.
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
					preludeStart: rule.start,
					preludeEnd: rule.block ? rule.block.start : rule.end
				});
				if (top) top.hasNestedBlock = true;
				pureIgnorePending = false;
				currentRuleHasImpureSelector = false;
				currentSelectorHasLocal = false;
			}
			if (rule.block) {
				// Single-pass body recursion — see the matching block
				// in `walkAstAtRule` for the rationale.
				const bodyEnd = walkAstBlockContents(rule.block.start + 1, false);
				const past =
					bodyEnd < source.length &&
					source.charCodeAt(bodyEnd) === CC_RIGHT_CURLY
						? bodyEnd + 1
						: bodyEnd;
				rule.block.end = past;
				rule.end = past;
			}
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
			astCurrentRuleHasLocalAnchor = savedAnchor;
			astCurrentRuleLocalIdentifiers = savedLocalIdentifiers;
			currentRulePrevComposesFile = savedPrevComposesFile;
			currentRuleComposesFiles.clear();
			for (const f of savedComposesFiles) currentRuleComposesFiles.add(f);
		};
		/**
		 * Drive the AST walker. Invoked **after** the streaming walker so
		 * the `comments` array populated by the streaming walker's
		 * `comment:` callback is already available — `processAtImport` /
		 * `processAtValue` read it via `this.parseCommentOptions` for
		 * magic-comment lookups. The position-advancement / state-only
		 * `atKeyword:` callback in the streaming walker has already
		 * advanced past every AST-handled at-rule by the time we get
		 * here, so re-emitting the same deps here is fine — there's no
		 * double-emission, the streaming walker stopped doing the
		 * dep-emission work in E2.
		 * @returns {void}
		 */
		const runAstWalker = () => {
			walkAstBlockContents(0, true);
		};

		// Comment-collection pre-pass: drive `walkCssTokens` only to
		// dispatch `case "comment"` events to `comment()` (which pushes
		// onto `this.comments`). `parseAStylesheet`'s own comment
		// callback misses comments swallowed by `eatWhitespaceAndComments`
		// between top-level items, so we run a cheap token-level pass
		// up front to capture every comment in source order — the AST
		// walker below then advances `astCommentCursor` through the
		// resulting list for pure-mode `cssmodules-pure-ignore` /
		// `cssmodules-pure-no-check` flag tracking and for magic-
		// comment lookups inside `processAtImport` / `processAtValue`.
		for (const t of walkCssTokens(source, 0)) {
			if (t.type === "comment") comment(source, t.start, t.end);
		}

		runAstWalker();

		/** @type {BuildInfo} */
		(module.buildInfo).strict = true;

		// Topologically sort the files referenced by `composes ... from`
		// declarations and tag each file's first import dep with the
		// resulting `sourceOrder`. `NormalModule#build` then reorders the
		// deps via `sortWithSourceOrder` so the bundle loads them in
		// cascade-correct order. Files stuck in a cycle are not visited
		// and keep their natural loc-based position.
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
