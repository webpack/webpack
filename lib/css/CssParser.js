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
	UrlToken,
	parseADeclaration,
	parseAFunction,
	parseAtRule
} = require("./CssAst");
const walkCssTokens = require("./walkCssTokens");

/** @typedef {import("../Module").BuildInfo} BuildInfo */
/** @typedef {import("../Module").BuildMeta} BuildMeta */
/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../Parser").PreparsedAst} PreparsedAst */
/** @typedef {import("./CssAst").AtRule} AtRule */
/** @typedef {import("./CssAst").FunctionNode} FunctionNode */
/** @typedef {import("./CssAst").Node} AstNode */
/** @typedef {import("./CssAst").SimpleBlock} SimpleBlock */
/** @typedef {import("./CssAst").Token} Token */
/** @typedef {import("./walkCssTokens").CssTokenCallbacks} CssTokenCallbacks */
/** @typedef {import("../../declarations/WebpackOptions").CssAutoOrModuleParserOptions} CssAutoOrModuleParserOptions */
/** @typedef {import("../../declarations/WebpackOptions").CssModuleParserOptions} CssModuleParserOptions */
/** @typedef {import("./CssModule")} CssModule */

/** @typedef {[number, number]} Range */
/** @typedef {{ line: number, column: number }} Position */
/** @typedef {{ value: string, range: Range, loc: { start: Position, end: Position } }} Comment */

const CC_COLON = ":".charCodeAt(0);
const CC_SEMICOLON = ";".charCodeAt(0);
const CC_LEFT_PARENTHESIS = "(".charCodeAt(0);
const CC_RIGHT_PARENTHESIS = ")".charCodeAt(0);
const CC_LOWER_F = "f".charCodeAt(0);
const CC_UPPER_F = "F".charCodeAt(0);
const CC_RIGHT_CURLY = "}".charCodeAt(0);
const CC_HYPHEN_MINUS = "-".charCodeAt(0);
const CC_TILDE = "~".charCodeAt(0);
const CC_EQUAL = "=".charCodeAt(0);
const CC_FULL_STOP = ".".charCodeAt(0);
const CC_AMPERSAND = "&".charCodeAt(0);

// https://www.w3.org/TR/css-syntax-3/#newline
// We don't have `preprocessing` stage, so we need specify all of them
const STRING_MULTILINE = /\\[\n\r\f]/g;
// https://www.w3.org/TR/css-syntax-3/#whitespace
const TRIM_WHITE_SPACES = /(^[ \t\n\r\f]*|[ \t\n\r\f]*$)/g;
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

const { escapeIdentifier, unescapeIdentifier } = walkCssTokens;

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

const CSS_MODE_TOP_LEVEL = 0;
const CSS_MODE_IN_BLOCK = 1;

const LOCAL_MODE = 0;
const GLOBAL_MODE = 1;

const eatUntilSemi = walkCssTokens.eatUntil(";");
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

		/** @type {number} */
		let scope = CSS_MODE_TOP_LEVEL;
		/** @type {boolean} */
		let allowImportAtRule = true;
		/** @type {[string, number, number, boolean?][]} */
		const balanced = [];
		let lastTokenEndForComments = 0;

		/** @type {boolean} */
		let isNextRulePrelude = isModules;
		/** @type {number} */
		let blockNestingLevel = 0;
		/** @type {0 | 1 | undefined} */
		let modeData;
		/** @type {number} */
		let counter = 0;

		/** @type {string[]} */
		let lastLocalIdentifiers = [];

		const pureMode = isModules && Boolean(this.options.pure);
		/** @type {boolean} */
		let currentSelectorHasLocal = false;
		/** Whether any comma-separated selector in the current rule's prelude was impure. */
		let currentRuleHasImpureSelector = false;
		/** Offset just after the previous `}` (or 0) — used as the prelude start. */
		let currentRulePreludeStart = 0;
		/** Pure-mode flags (only meaningful when `pureMode` is true). */
		let pureNoCheck = false;
		let pureIgnorePending = false;
		let nextBlockChildrenSkip = false;
		let nextBlockTreatAsLeaf = false;
		let seenTopLevelRule = false;
		// True after an at-rule keyword and before the next `{` or `;`. Used so
		// identifiers inside the at-rule prelude (e.g. `min-width` inside
		// `@media (min-width: 768px)`) don't get counted as declarations.
		let inAtRulePrelude = false;
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

		const PURE_IGNORE_RE = /^\s*cssmodules-pure-ignore(?:\s|$)/;
		const PURE_NO_CHECK_RE = /^\s*cssmodules-pure-no-check(?:\s|$)/;

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
		 * Checks whether this css parser is next nested syntax.
		 * @param {string} input input
		 * @param {number} pos position
		 * @returns {boolean} true, when next is nested syntax
		 */
		const isNextNestedSyntax = (input, pos) => {
			pos = walkCssTokens.eatWhitespaceAndComments(input, pos)[0];

			if (
				input.charCodeAt(pos) === CC_RIGHT_CURLY ||
				(input.charCodeAt(pos) === CC_HYPHEN_MINUS &&
					input.charCodeAt(pos + 1) === CC_HYPHEN_MINUS)
			) {
				return false;
			}

			const identifier = walkCssTokens.eatIdentSequence(input, pos);

			if (!identifier) {
				return true;
			}

			const leftCurly = eatUntilLeftCurly(input, pos);
			const content = input.slice(identifier[0], leftCurly);

			if (content.includes(";") || content.includes("}")) {
				return false;
			}

			return true;
		};
		/**
		 * Checks whether this css parser is local mode.
		 * @returns {boolean} true, when in local scope
		 */
		const isLocalMode = () =>
			modeData === LOCAL_MODE || (mode === "local" && modeData === undefined);

		/**
		 * Returns end.
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

			/** @type {Comment} */
			const comment = {
				value,
				range: [start, end],
				loc: {
					start: { line: sl, column: sc },
					end: { line: el, column: ec }
				}
			};
			this.comments.push(comment);

			if (pureMode) {
				if (PURE_IGNORE_RE.test(value)) {
					pureIgnorePending = true;
				} else if (
					PURE_NO_CHECK_RE.test(value) &&
					scope === CSS_MODE_TOP_LEVEL &&
					!seenTopLevelRule
				) {
					pureNoCheck = true;
				}
			}

			return end;
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
		 */
		const walkFunctionsForUrl = (cvs) => {
			for (const cv of cvs) {
				if (cv.type === "comma") {
					lastTokenEndForComments = cv.start;
				} else if (cv.type === "url") {
					// Bare `url(unquoted)` token form.
					processOldURLFunction(/** @type {UrlToken} */ (cv));
				} else if (cv.type === "function") {
					const fn = /** @type {FunctionNode} */ (cv);
					const fname = fn.name.replace(/\\/g, "").toLowerCase();
					if (fname === "src" || fname === "url") {
						processURLFunction(fn, fname);
					} else if (IMAGE_SET_FUNCTION.test(fname)) {
						processImageSetFunction(fn);
						walkFunctionsForUrl(fn.value);
					} else {
						walkFunctionsForUrl(fn.value);
					}
				} else if (cv.type === "simple-block") {
					walkFunctionsForUrl(/** @type {SimpleBlock} */ (cv).value);
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
						`Unexpected '${input[pos]}' at ${pos} during parsing of '${type === 0 ? ":import" : ":export"}' (expected string)`,
						locConverter,
						stringStart,
						pos
					);
					return pos;
				}
				request = input.slice(str[0] + 1, str[1] - 1);
				pos = str[1];
				pos = walkCssTokens.eatWhitespaceAndComments(input, pos)[0];
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
				pos = walkCssTokens.eatWhitespaceAndComments(input, pos)[0];
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
		 * Process icss symbol.
		 * @param {string} name ICSS symbol name
		 * @param {number} start start position
		 * @param {number} end end position
		 * @returns {number} position after handling
		 */
		const processICSSSymbol = (name, start, end) => {
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
		 * Top-level entry point for a `--<name>` ident token (e.g. a
		 * custom-property declaration's name, or a dashed-ident function
		 * call). Reads the ident positionally and optionally scans the
		 * trailing characters for `from <ident="global">` /
		 * `from "<path>"` — CSS-Modules syntax that only really appears
		 * inside `var(…)` / `style(…)`, but we keep the lookahead here
		 * as a defensive parity with the pre-AST parser. Inside a
		 * `var(…)` / `style(…)` call we have a parsed `FunctionNode`
		 * available, so `processDashedIdentInVarFunction` is preferred.
		 * @param {string} input input
		 * @param {number} start start position (the `-` of `--`)
		 * @param {number} end fallback position to return when the suffix
		 * parse fails (the streaming walker resumes here)
		 * @returns {number} position after handling
		 */
		const processDashedIdent = (input, start, end) => {
			const customIdent = walkCssTokens.eatIdentSequence(input, start);
			if (!customIdent) return end;
			const [identStart, identEnd] = customIdent;
			const afterIdent = walkCssTokens.eatWhitespaceAndComments(
				input,
				identEnd
			)[0];
			const fc = input.charCodeAt(afterIdent);
			if (fc !== CC_LOWER_F && fc !== CC_UPPER_F) {
				emitDashedIdentExport(identStart, identEnd);
				return end;
			}
			const fromWord = walkCssTokens.eatIdentSequence(input, afterIdent);
			if (
				!fromWord ||
				input.slice(fromWord[0], fromWord[1]).toLowerCase() !== "from"
			) {
				return end;
			}
			const sourceStart = walkCssTokens.eatWhitespaceAndComments(
				input,
				fromWord[1]
			)[0];
			// `from <source>` accepts either an ident (`global`) or a
			// quoted string (`"./file.css"`). Try string first.
			const sourceString = walkCssTokens.eatString(input, sourceStart);
			if (sourceString) {
				const text = input.slice(sourceString[0], sourceString[1]);
				emitDashedIdentImport(
					identStart,
					identEnd,
					fromWord[0],
					sourceString[1],
					text.slice(1, -1)
				);
				return end;
			}
			const sourceIdent = walkCssTokens.eatIdentSequence(input, sourceStart);
			if (
				sourceIdent &&
				input.slice(sourceIdent[0], sourceIdent[1]) === "global"
			) {
				emitDashedIdentFromGlobal(identEnd, sourceIdent[1]);
			}
			return end;
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
		 * Process local declaration.
		 * @param {string} input input
		 * @param {number} pos name start position
		 * @param {number} end name end position
		 * @returns {number} position after handling
		 */
		const processLocalDeclaration = (input, pos, end) => {
			pos = walkCssTokens.eatWhitespaceAndComments(input, pos)[0];
			const identifier = walkCssTokens.eatIdentSequence(input, pos);

			if (!identifier) {
				return end;
			}

			const propertyNameStart = identifier[0];

			pos = walkCssTokens.eatWhitespaceAndComments(input, identifier[1])[0];

			if (input.charCodeAt(pos) !== CC_COLON) {
				return end;
			}

			pos += 1;

			// Remove prefix and lowercase
			const propertyName = input
				.slice(identifier[0], identifier[1])
				.replace(/^(-\w+-)/, "")
				.toLowerCase();

			if (isLocalMode() && knownProperties.has(propertyName)) {
				const decl = parseADeclaration(
					input,
					propertyNameStart,
					locConverter,
					comment
				);
				if (!decl) return pos;

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
										input.slice(cv.start + 1, cv.end - 1)
									);
									const matches = matchAll(/\b\w+\b/g, areas);
									for (const match of matches) {
										const areaStart = cv.start + 1 + match.index;
										values.push([
											areaStart,
											areaStart + match[0].length,
											false
										]);
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

				/**
				 * Walk component values for `url()` / `src()` / `image-set()`
				 * / `local()` / `global()` / `var()` side-effects. Recurses
				 * into nested functions so e.g.
				 * `background: linear-gradient(url("..."))` still picks up
				 * the inner url() — matching the original walker, which
				 * had its function callback re-fire at every nesting level.
				 * @param {AstNode[]} cvs component values
				 */
				const walkFunctions = (cvs) => {
					for (const cv of cvs) {
						if (cv.type === "function") {
							const fn = /** @type {FunctionNode} */ (cv);
							const fname = fn.name.replace(/\\/g, "").toLowerCase();
							if (fname === "local" || fname === "global") {
								processLocalOrGlobalFunction(fn, fname === "local" ? 1 : 2);
							} else if (
								this.options.dashedIdents &&
								isLocalMode() &&
								fname === "var"
							) {
								processDashedIdentInVarFunction(fn);
							} else if (
								this.options.url &&
								(fname === "src" || fname === "url")
							) {
								processURLFunction(fn, fname);
							} else if (this.options.url && IMAGE_SET_FUNCTION.test(fname)) {
								processImageSetFunction(fn);
								// image-set can hold nested url() calls — keep walking.
								walkFunctions(fn.value);
							} else {
								walkFunctions(fn.value);
							}
						} else if (cv.type === "simple-block") {
							walkFunctions(/** @type {SimpleBlock} */ (cv).value);
						}
					}
				};

				walkExports(decl.value);
				walkFunctions(decl.value);

				if (values.length > 0) {
					for (const value of values) {
						const { line: sl, column: sc } = locConverter.get(value[0]);
						const { line: el, column: ec } = locConverter.get(value[1]);
						const [start, end, isString] = value;
						const name = unescapeIdentifierCached(
							isString
								? input.slice(start + 1, end - 1)
								: input.slice(start, end)
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

				return decl.end;
			} else if (COMPOSES_PROPERTY.test(propertyName)) {
				if (lastLocalIdentifiers.length === 0) {
					// No local class name in this rule's selector — composes
					// is a no-op here. Let the main walker continue and
					// re-tokenize the value, so any nested `local()` /
					// `global()` / `url()` calls inside still get their
					// normal source rewriting (global-mode tests like
					// `composes: local(X) global(Y)` depend on this — the
					// `local(`/`)` wrappers are stripped and `local(X)`'s
					// `X` is scoped by `processLocalOrGlobalFunction` from
					// the main walker's `function:` callback).
					return pos;
				}

				// Parse the whole declaration so we can walk its value as
				// an AST — `composes` has a non-CSS-spec grammar
				// (https://github.com/css-modules/icss#composition) but
				// it's a flat list of `<name>` / `global(<name>)` / `from
				// <source>` chunks separated by commas, which maps cleanly
				// onto a comma-split walk of the parsed value.
				const decl = parseADeclaration(
					input,
					propertyNameStart,
					locConverter,
					comment
				);
				if (!decl) return pos;

				// `resumeAt` defines the RANGE the "remove composes"
				// presentational dep covers in the output — for `;`-
				// terminated declarations we strip the rule's `;` and any
				// trailing same-line whitespace; for the (rare) `}` /
				// EOF endings we just strip up to that boundary. The
				// **return value** is `decl.end` (position **at** the
				// terminator), not `resumeAt` — that way the main walker
				// re-tokenizes `;` and fires the `semicolon:` callback,
				// which is what updates `isNextRulePrelude` so any
				// following nested rule (e.g. `.bar { composes: foo;
				// &.baz {…} }`) gets its selector scoped.
				const resumeAt =
					input.charCodeAt(decl.end) === CC_SEMICOLON
						? walkCssTokens.eatWhitespace(input, decl.end + 1)
						: decl.end;

				if (lastLocalIdentifiers.length > 1) {
					this._emitWarning(
						state,
						`Composition is only allowed when selector is single local class name not in "${lastLocalIdentifiers.join('", "')}"`,
						locConverter,
						propertyNameStart,
						decl.end
					);
					return decl.end;
				}

				// length === 1 — the well-formed case.
				const lastLocalIdentifier = lastLocalIdentifiers[0];

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
									path: input.slice(cv.start + 1, cv.end - 1)
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
							// Anything after the source is ignored (matches
							// original — it returned past the source's end
							// without re-entering the loop).
							continue;
						}

						if (cv.type === "ident") {
							const identValue = /** @type {Token} */ (cv).value;
							// `from` is the source-introducer keyword only if
							// preceded by at least one collected name **and**
							// followed by another non-whitespace token in this
							// group. The original loop got this by accident
							// (it checked the separator AT pos before the
							// `from`-keyword check, so a `from` immediately
							// followed by `;` fell into the separator branch
							// and got added as a class name). Match that
							// here so `composes: from from;` keeps both
							// `from`s as class names, while
							// `composes: from from "./x";` treats the
							// second `from` as the keyword.
							if (
								identValue.toLowerCase() === "from" &&
								classNames.length > 0
							) {
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
							// The original consumed the first ident inside the
							// function and treated everything else (incl. the
							// function's own name when it wasn't `global`) as a
							// decorative wrapper. Match that here.
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
						return decl.end;
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
							const identifier = unescapeIdentifier(input.slice(start, end));
							const { line: sl, column: sc } = locConverter.get(start);
							const { line: el, column: ec } = locConverter.get(end);

							if (selfReference) {
								// `composes: foo from "./self.module.css"` from
								// inside `self.module.css` — collapse to a
								// self-reference. When the composed name
								// equals the local class name, it's a true
								// no-op.
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
							const identifier = unescapeIdentifier(input.slice(start, end));
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
						// No `from <source>` — each name is a self-composition.
						// `global(name)` flips the local flag and switches the
						// export mode from SELF_REFERENCE to APPEND.
						for (const { start, end, isGlobal } of classNames) {
							const identifier = unescapeIdentifier(input.slice(start, end));
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

				// Remove `composes: …;` (and trailing same-line whitespace)
				// from the output. We return `decl.end` (not `resumeAt`)
				// so the main walker still tokenizes the `;` and fires
				// `semicolon:` — see the long comment where `resumeAt` is
				// computed above.
				const dep = new ConstDependency("", [propertyNameStart, resumeAt]);
				module.addPresentationalDependency(dep);
				return decl.end;
			}

			return pos;
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
		 * Process class selector.
		 * @param {string} input input
		 * @param {number} start start position
		 * @param {number} end end position
		 * @returns {number} position after handling
		 */
		const processClassSelector = (input, start, end) => {
			const ident = walkCssTokens.skipCommentsAndEatIdentSequence(input, end);
			if (!ident) return end;
			const name = unescapeIdentifierCached(input.slice(ident[0], ident[1]));
			lastLocalIdentifiers.push(name);
			const dep = new CssIcssExportDependency(
				name,
				getReexport(name),
				[ident[0], ident[1]],
				true,
				CssIcssExportDependency.EXPORT_MODE.ONCE
			);
			const { line: sl, column: sc } = locConverter.get(ident[0]);
			const { line: el, column: ec } = locConverter.get(ident[1]);
			dep.setLoc(sl, sc, el, ec);
			module.addDependency(dep);
			if (pureMode) currentSelectorHasLocal = true;
			return ident[1];
		};

		/**
		 * Process attribute selector.
		 * @param {string} input input
		 * @param {number} start start position
		 * @param {number} end end position
		 * @returns {number} position after handling
		 */
		const processAttributeSelector = (input, start, end) => {
			end = walkCssTokens.eatWhitespaceAndComments(input, end)[0];
			const identifier = walkCssTokens.eatIdentSequence(input, end);
			if (!identifier) return end;
			const name = unescapeIdentifierCached(
				input.slice(identifier[0], identifier[1])
			);
			if (name.toLowerCase() !== "class") {
				return end;
			}
			end = walkCssTokens.eatWhitespaceAndComments(input, identifier[1])[0];

			const isTilde = input.charCodeAt(end) === CC_TILDE;

			if (
				input.charCodeAt(end) !== CC_EQUAL &&
				input.charCodeAt(end) !== CC_TILDE
			) {
				return end;
			}

			end += 1;

			if (isTilde) {
				if (input.charCodeAt(end) !== CC_EQUAL) {
					return end;
				}

				end += 1;
			}

			end = walkCssTokens.eatWhitespaceAndComments(input, end)[0];
			// `[class=value]` value can be either an ident (`foo`) or a
			// quoted string (`"foo"`). Try string first; if it doesn't
			// match, fall back to ident.
			const stringValue = walkCssTokens.eatString(input, end);
			/** @type {number} */
			let classNameStart;
			/** @type {number} */
			let classNameEnd;
			/** @type {number} */
			let resumeAt;
			if (stringValue) {
				classNameStart = stringValue[0] + 1;
				classNameEnd = stringValue[1] - 1;
				resumeAt = stringValue[1];
			} else {
				const identValue = walkCssTokens.eatIdentSequence(input, end);
				if (!identValue) return end;
				classNameStart = identValue[0];
				classNameEnd = identValue[1];
				resumeAt = identValue[1];
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
			return resumeAt;
		};

		walkCssTokens(source, 0, {
			comment,
			leftCurlyBracket: (input, start, end) => {
				const wasTopLevel = scope === CSS_MODE_TOP_LEVEL;
				if (wasTopLevel) {
					allowImportAtRule = false;
					scope = CSS_MODE_IN_BLOCK;
				} else if (scope !== CSS_MODE_IN_BLOCK) {
					return end;
				}
				if (!isModules) return end;
				if (pureMode) {
					inAtRulePrelude = false;
					if (wasTopLevel) seenTopLevelRule = true;
					const isRulePrelude = isNextRulePrelude;
					if (isRulePrelude) finalizeSelector();
					const top = pureTop();
					if (top) top.hasNestedBlock = true;
					const inheritedSkip = top ? top.skipChildren : false;
					pureBlockStack.push({
						ignored: pureIgnorePending,
						skipOwn: inheritedSkip,
						skipChildren: nextBlockChildrenSkip || inheritedSkip,
						treatAsLeaf: nextBlockTreatAsLeaf,
						// "this rule is fully pure" (no impure comma-segment) OR any
						// ancestor pure. Matches PCSL's `[isPureSelectorSymbol]`.
						ancestorHadLocal:
							parentEffectivePure() ||
							(isRulePrelude && !currentRuleHasImpureSelector),
						impure: isRulePrelude && currentRuleHasImpureSelector,
						hasDirectDecl: false,
						hasNestedBlock: false,
						isRulePrelude,
						preludeStart: currentRulePreludeStart,
						preludeEnd: start
					});
					pureIgnorePending = false;
					nextBlockChildrenSkip = false;
					nextBlockTreatAsLeaf = false;
					currentRuleHasImpureSelector = false;
					currentSelectorHasLocal = false;
					currentRulePreludeStart = end;
				}
				blockNestingLevel = wasTopLevel ? 1 : blockNestingLevel + 1;
				isNextRulePrelude = isNextNestedSyntax(input, end);
				return end;
			},
			rightCurlyBracket: (input, start, end) => {
				if (scope !== CSS_MODE_IN_BLOCK) return end;
				const closing = blockNestingLevel === 1;
				if (closing) {
					scope = CSS_MODE_TOP_LEVEL;
					blockNestingLevel = 0;
					if (!isModules) return end;
					isNextRulePrelude = true;
					modeData = undefined;
					lastLocalIdentifiers = [];
					currentRulePrevComposesFile = undefined;
					currentRuleComposesFiles.clear();
				} else {
					blockNestingLevel--;
					if (!isModules) return end;
					isNextRulePrelude = isNextNestedSyntax(input, end);
				}
				if (pureMode) {
					const frame = pureBlockStack.pop();
					if (frame) {
						// PCSL throws on impure rules whose body has any non-rule
						// content (declaration, empty body). Rules whose body is
						// only nested rules are skipped — child rules carry the
						// check themselves.
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
						// Propagate "has direct declaration" through at-rule frames
						// so a parent rule containing only e.g. `@media { decl }` is
						// still treated as "rule with declarations".
						if (!frame.isRulePrelude && frame.hasDirectDecl) {
							const parent = pureTop();
							if (parent) parent.hasDirectDecl = true;
						}
					}
					currentRuleHasImpureSelector = false;
					currentSelectorHasLocal = false;
					currentRulePreludeStart = end;
				}
				return end;
			},
			url: (input, start, end, contentStart, contentEnd) => {
				if (!this.options.url) {
					return end;
				}

				processOldURLFunction(
					new UrlToken(
						input.slice(contentStart, contentEnd),
						contentStart,
						contentEnd,
						start,
						end,
						locConverter
					)
				);
				return end;
			},
			atKeyword: (input, start, end) => {
				const name = input.slice(start, end).toLowerCase();
				const wasTopLevel = scope === CSS_MODE_TOP_LEVEL;
				if (pureMode) {
					inAtRulePrelude = true;
					// Match PCSL's `isPureCheckDisabled`: any non-comment top-level
					// node (including `;`-terminated at-rules like `@import`) seals
					// the leading-comments window.
					if (wasTopLevel) seenTopLevelRule = true;
				}

				let pos = end;
				switch (name) {
					case "@namespace": {
						this._emitWarning(
							state,
							"'@namespace' is not supported in bundled CSS",
							locConverter,
							start,
							end
						);

						const at = parseAtRule(input, start, locConverter, comment);
						pos = at ? at.end : eatUntilSemi(input, start);
						break;
					}
					case "@charset": {
						const at = parseAtRule(input, start, locConverter, comment);
						if (!at) {
							pos = eatUntilSemi(input, start);
							break;
						}

						if (/** @type {CssModule} */ (module).exportType === "style") {
							pos = at.end;
							break;
						}

						// Replace the whole `@charset "..."` (and its `;` if present)
						// with empty — webpack bundles can't carry a real `@charset`.
						const atRuleEnd = at.terminator === ";" ? at.end + 1 : at.end;
						const dep = new ConstDependency("", [at.start, atRuleEnd]);
						module.addPresentationalDependency(dep);

						// First non-whitespace prelude value should be the charset
						// string. Fall through silently if it's something else (the
						// presentational dep already stripped the malformed rule).
						const string = at.prelude.find((v) => v.type !== "whitespace");
						if (string && string.type === "string") {
							/** @type {BuildInfo} */
							(module.buildInfo).charset = input
								.slice(string.start + 1, string.end - 1)
								.toUpperCase();
						}

						pos = at.end;
						break;
					}
					case "@import": {
						const at = parseAtRule(input, start, locConverter, comment);
						if (!this.options.import) {
							pos = at ? at.end : eatUntilSemi(input, end);
							break;
						}

						if (!allowImportAtRule) {
							this._emitWarning(
								state,
								"Any '@import' rules must precede all other rules",
								locConverter,
								start,
								end
							);
							pos = at ? at.end : eatUntilSemi(input, end);
							break;
						}

						pos = at ? processAtImport(at) : end;
						break;
					}
					default: {
						if (isModules) {
							if (name === "@value") {
								const at = parseAtRule(input, start, locConverter, comment);
								pos = at ? processAtValue(at) : eatUntilSemi(input, end) + 1;
								break;
							} else if (
								this.options.animation &&
								OPTIONALLY_VENDOR_PREFIXED_KEYFRAMES_AT_RULE.test(name) &&
								isLocalMode()
							) {
								if (pureMode) {
									nextBlockChildrenSkip = true;
									nextBlockTreatAsLeaf = true;
								}
								const at = parseAtRule(input, start, locConverter, comment);
								pos = at
									? processLocalAtRule(at, {
											string: true,
											identifier: true
										})
									: end;
								break;
							} else if (
								this.options.customIdents &&
								name === "@counter-style" &&
								isLocalMode()
							) {
								if (pureMode) {
									nextBlockChildrenSkip = true;
									nextBlockTreatAsLeaf = true;
								}
								const at = parseAtRule(input, start, locConverter, comment);
								pos = at ? processLocalAtRule(at, { identifier: true }) : end;
								break;
							} else if (
								this.options.container &&
								name === "@container" &&
								isLocalMode()
							) {
								const at = parseAtRule(input, start, locConverter, comment);
								pos = at
									? processLocalAtRule(at, {
											identifier: /^(none|and|or|not)$/
										})
									: end;
								break;
							} else if (name === "@scope") {
								// `@scope (.foo) to (.bar) { … }` — the prelude
								// is a list of selectors, so let the main walker
								// keep tokenizing it (the `delim:`/`hash:`/
								// `leftSquareBracket:` callbacks all gate their
								// CSS-Modules selector handling on this flag).
								// Calling `parseAtRule` would consume the
								// prelude wholesale and we'd then have to walk
								// it for selectors ourselves — net new code
								// with no behavior change. Skip.
								isNextRulePrelude = true;
								break;
							}

							// All other `@`-rules in CSS Modules contexts
							// (`@media`, `@supports`, `@layer`, `@font-face`, …):
							// the prelude isn't a selector list, so make sure
							// the main walker doesn't treat it as one. Same
							// reasoning as `@scope`: parsing the prelude as an
							// AST would add code without changing behavior.
							isNextRulePrelude = false;
						}
					}
				}

				// If the at-rule consumed its own `;` (for `@import`/`@value`/
				// `@charset`/`@namespace`), advance the prelude pointer so a
				// later impure rule's reported selector doesn't include this
				// at-rule's text. Body-bearing at-rules return at `{` — let
				// `leftCurlyBracket` handle those.
				if (pureMode && wasTopLevel && pos > end) {
					let probe = pos - 1;
					while (
						probe > end &&
						walkCssTokens.isWhiteSpace(input.charCodeAt(probe))
					) {
						probe--;
					}
					if (input.charCodeAt(probe) === CC_SEMICOLON) {
						currentRulePreludeStart = pos;
					}
				}

				return pos;
			},
			semicolon: (input, start, end) => {
				if (isModules && scope === CSS_MODE_IN_BLOCK) {
					isNextRulePrelude = isNextNestedSyntax(input, end);
				}
				if (pureMode) {
					if (scope === CSS_MODE_IN_BLOCK) {
						if (
							balanced.length === 0 &&
							!isNextRulePrelude &&
							!inAtRulePrelude
						) {
							const top = pureTop();
							if (top) top.hasDirectDecl = true;
						}
					} else if (scope === CSS_MODE_TOP_LEVEL && balanced.length === 0) {
						// Top-level `;` ends a statement (e.g. `@import "x";`).
						// Advance the prelude pointer so a later impure rule's
						// reported selector doesn't include the preceding text.
						currentRulePreludeStart = end;
					}
					inAtRulePrelude = false;
				}
				return end;
			},
			identifier: (input, start, end) => {
				if (isModules) {
					const identifier = input.slice(start, end);

					if (
						this.options.dashedIdents &&
						isLocalMode() &&
						isDashedIdentifier(identifier)
					) {
						return processDashedIdent(input, start, end);
					}

					if (icssDefinitions.has(identifier)) {
						return processICSSSymbol(identifier, start, end);
					}

					switch (scope) {
						case CSS_MODE_IN_BLOCK: {
							if (isModules && !isNextRulePrelude) {
								if (balanced.length === 0 && !inAtRulePrelude) {
									const top = pureTop();
									if (top) top.hasDirectDecl = true;
								}
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
				const ch = input.charCodeAt(start);
				if (ch === CC_FULL_STOP && isNextRulePrelude && isLocalMode()) {
					return processClassSelector(input, start, end);
				}
				if (
					ch === CC_AMPERSAND &&
					isNextRulePrelude &&
					parentEffectivePure() &&
					pureMode
				) {
					currentSelectorHasLocal = true;
				}

				return end;
			},
			hash: (input, start, end, isID) => {
				if (isNextRulePrelude && isLocalMode() && isID) {
					return processIdSelector(input, start, end);
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
									const end = walkCssTokens.eatWhitespaceAndComments(
										input,
										ident[1] + 1
									)[0];
									modeData = LOCAL_MODE;
									const dep = new ConstDependency("", [start, end]);
									module.addPresentationalDependency(dep);
									balanced.push([":local", start, end, true]);
									return end;
								} else if (name === "local") {
									modeData = LOCAL_MODE;
									const found = walkCssTokens.eatWhitespaceAndComments(
										input,
										ident[1]
									);

									if (!found[1]) {
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

									end = walkCssTokens.eatWhitespace(input, ident[1]);
									const dep = new ConstDependency("", [start, end]);
									module.addPresentationalDependency(dep);
									return end;
								} else if (isFn && name === "global") {
									// Eat extra whitespace
									const end = walkCssTokens.eatWhitespaceAndComments(
										input,
										ident[1] + 1
									)[0];
									modeData = GLOBAL_MODE;
									const dep = new ConstDependency("", [start, end]);
									module.addPresentationalDependency(dep);
									balanced.push([":global", start, end, true]);
									return end;
								} else if (name === "global") {
									modeData = GLOBAL_MODE;
									// Eat extra whitespace
									const found = walkCssTokens.eatWhitespaceAndComments(
										input,
										ident[1]
									);

									if (!found[1]) {
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

									end = walkCssTokens.eatWhitespace(input, ident[1]);
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

				// Functions we recognize consume their full body (up to and
				// including the matching `)`) via `parseAFunction`. Since
				// the outer walker won't see the body's tokens, we must not
				// push to `balanced` (which the matching `)` would pop) —
				// returning `fn.end` directly skips past the function.
				/** @type {((fn: FunctionNode) => void) | undefined} */
				let handler;
				if (this.options.url && (name === "src" || name === "url")) {
					handler = (fn) => processURLFunction(fn, name);
				} else if (this.options.url && IMAGE_SET_FUNCTION.test(name)) {
					handler = (fn) => {
						processImageSetFunction(fn);
						// Recurse to pick up nested url() inside image-set
						// (form 2: `image-set(url("...") 1x, ...)`).
						walkFunctionsForUrl(fn.value);
					};
				} else if (isModules && !isNextRulePrelude) {
					const type = name === "local" ? 1 : name === "global" ? 2 : undefined;
					if (type) {
						handler = (fn) => processLocalOrGlobalFunction(fn, type);
					}
				}
				if (handler) {
					const fn = parseAFunction(input, start, locConverter, comment);
					if (fn) {
						handler(fn);
						return fn.end;
					}
				}

				balanced.push([name, start, end]);

				if (
					isModules &&
					this.options.function &&
					isLocalMode() &&
					isDashedIdentifier(name)
				) {
					return processDashedIdent(input, start, end);
				}

				return end;
			},
			leftSquareBracket: (input, start, end) => {
				if (isNextRulePrelude && isLocalMode()) {
					return processAttributeSelector(input, start, end);
				}
				return end;
			},
			leftParenthesis: (input, start, end) => {
				balanced.push(["(", start, end]);

				return end;
			},
			rightParenthesis: (input, start, end) => {
				const popped = balanced.pop();

				if (isModules && popped) {
					const isLocal = popped[0] === ":local";
					const isGlobal = popped[0] === ":global";
					if (isLocal || isGlobal) {
						modeData = balanced[balanced.length - 1]
							? balanced[balanced.length - 1][0] === ":local"
								? LOCAL_MODE
								: balanced[balanced.length - 1][0] === ":global"
									? GLOBAL_MODE
									: undefined
							: undefined;
						if (popped[3] && isLocal) {
							while (walkCssTokens.isWhiteSpace(input.charCodeAt(start - 1))) {
								start -= 1;
							}
						}
						const dep = new ConstDependency("", [start, end]);
						module.addPresentationalDependency(dep);
					} else if (isNextRulePrelude) {
						modeData = undefined;
					}
				}

				return end;
			},
			comma: (input, start, end) => {
				if (isModules && balanced.length === 0) {
					// Reset stack for `:global .class :local .class-other` selector after
					modeData = undefined;
					if (pureMode && isNextRulePrelude) finalizeSelector();
				}

				lastTokenEndForComments = start;

				return end;
			}
		});

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
