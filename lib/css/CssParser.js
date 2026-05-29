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

// `SourceProcessor` drives the parse and hands already-built AST nodes to the visitors; positions are read from those nodes' ranges rather than re-scanning the source.

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
/** @typedef {import("./walkCssTokens").VisitorMap} VisitorMap */
/** @typedef {import("../../declarations/WebpackOptions").CssAutoOrModuleParserOptions} CssAutoOrModuleParserOptions */
/** @typedef {import("../../declarations/WebpackOptions").CssModuleParserOptions} CssModuleParserOptions */
/** @typedef {import("./CssModule")} CssModule */
/** @typedef {import("./CssModule").Inheritance} Inheritance */

/** @typedef {[number, number]} Range */
/** @typedef {{ line: number, column: number }} Position */
/** @typedef {{ value: string, range: Range, loc: { start: Position, end: Position } }} Comment */

// Per-node-type visitor map for `SourceProcessor#use`, typed per key so handlers see the concrete node without casts.
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
const CC_LEFT_CURLY = "{".charCodeAt(0);

// Newlines (CSS Syntax 3 §3.3) — listed explicitly since there's no preprocessing stage.
const STRING_MULTILINE = /\\[\n\r\f]/g;
// https://www.w3.org/TR/css-syntax-3/#whitespace
const TRIM_WHITE_SPACES = /(^[ \t\n\r\f]*|[ \t\n\r\f]*$)/g;
// Pure-mode markers: `cssmodules-pure-ignore` opts a single rule out of the purity check, `cssmodules-pure-no-check` (before the first rule) opts the whole file out.
const PURE_IGNORE_RE = /^\s*cssmodules-pure-ignore(?:\s|$)/;
const PURE_NO_CHECK_RE = /^\s*cssmodules-pure-no-check(?:\s|$)/;
const UNESCAPE = /\\([0-9a-f]{1,6}[ \t\n\r\f]?|[\s\S])/gi;
const IMAGE_SET_FUNCTION = /^(?:-\w+-)?image-set$/i;
// `parseCommentOptions` fast path: a whole-comment `webpackXxx: <bool|number|null>`; every other (and every failing) shape falls back to the `vm.runInContext` path.
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
	return result;
};

/**
 * Returns normalized url.
 * @param {string} str url string
 * @param {boolean} isString is url wrapped in quotes
 * @returns {string} normalized url
 */
const normalizeUrl = (str, isString) => {
	// Remove escaped newlines from a string-token url like `url("im\<newline>g.png")`.
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

// `escapeIdentifier` / `unescapeIdentifier` live in walkCssTokens; they're re-exported at the bottom for back-compat callers.

/**
 * A custom property name (`<dashed-ident>`): a `--`-prefixed identifier other than bare `--`.
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

// Byte-level source-cursor scans for computing replacement / strip ranges on raw source after parsing.

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

		// Reset per-parse — parser instances are reused across modules.
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
		 * Whether a relative `from "<request>"` resolves back to the current module (matching query/fragment too).
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

		// Closure-scope alias for `source` used by AST-walking helpers for substring extraction.
		const input = source;

		let lastTokenEndForComments = 0;
		// Set by the `@import` handler so a malformed `@import` prelude is still scanned for orphan url() deps.
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
		 * Inherited pure-mode context per open block: `ancestorHadLocal` (nested rules inherit purity from a local-bearing ancestor) and `skipChildren` (a check-suppressing ancestor like `@keyframes`).
		 * @type {{ ancestorHadLocal: boolean, skipChildren: boolean }[]}
		 */
		const pureBlockStack = [];

		/**
		 * @returns {(typeof pureBlockStack)[number] | undefined} top of stack
		 */
		const pureTop = () => pureBlockStack[pureBlockStack.length - 1];

		/**
		 * Whether any ancestor (self inclusive) was pure — for ancestor-inheritance and `&`-resolution.
		 * @returns {boolean} true if any ancestor provided a local
		 */
		const parentEffectivePure = () => {
			const top = pureTop();
			return top ? top.ancestorHadLocal : false;
		};

		/**
		 * Mark the just-finished comma selector (or whole prelude at `{`) impure if it lacks a local and no ancestor compensates.
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

		/**
		 * Pure-mode at-rules whose prelude is selector-checked, so their body is opaque to the enclosing rule's declaration accounting.
		 * @param {string} name at-rule name including the leading `@`, lower-cased
		 * @returns {boolean} true for `@keyframes` / `@counter-style` / `@container` / `@scope`
		 */
		const isPureRulePreludeAtRule = (name) =>
			OPTIONALLY_VENDOR_PREFIXED_KEYFRAMES_AT_RULE.test(name) ||
			name === "@counter-style" ||
			name === "@container" ||
			name === "@scope";

		/**
		 * Whether a rule body holds a declaration counted against the enclosing rule — directly, or through a transparent conditional-group at-rule (`@media`/`@supports`/…); qualified rules and selector-checked at-rules are opaque.
		 * @param {SimpleBlock} block rule body (`{ … }`)
		 * @returns {boolean} true if a declaration counts for this rule
		 */
		const blockHasOwnDeclaration = (block) => {
			for (const child of block.value) {
				if (child.type === "Declaration") return true;
				if (child.type === "AtRule") {
					const at = /** @type {AtRule} */ (child);
					if (
						at.block &&
						!isPureRulePreludeAtRule(`@${at.name.toLowerCase()}`) &&
						blockHasOwnDeclaration(at.block)
					) {
						return true;
					}
				}
			}
			return false;
		};

		/**
		 * Whether a rule body holds a nested block — a qualified rule or any block-bearing at-rule.
		 * @param {SimpleBlock} block rule body (`{ … }`)
		 * @returns {boolean} true if a nested block is present
		 */
		const blockHasNestedBlock = (block) =>
			block.value.some(
				(child) =>
					child.type === "QualifiedRule" ||
					(child.type === "AtRule" &&
						Boolean(/** @type {AtRule} */ (child).block))
			);

		/**
		 * Pure-mode rule entry: report an impure leaf-ish rule (prelude purity is known, body already parsed), then push the inherited-context frame and reset the per-rule selector flags.
		 * @param {{ isRulePrelude: boolean, treatAsLeaf: boolean, ownSkip: boolean, block: SimpleBlock | null, preludeStart: number, preludeEnd: number }} opts entry options
		 * @returns {void}
		 */
		const enterPureBlock = ({
			isRulePrelude,
			treatAsLeaf,
			ownSkip,
			block,
			preludeStart,
			preludeEnd
		}) => {
			const top = pureTop();
			const skipOwn = top ? top.skipChildren : false;
			if (
				!pureNoCheck &&
				!pureIgnorePending &&
				!skipOwn &&
				isRulePrelude &&
				currentRuleHasImpureSelector &&
				(treatAsLeaf ||
					!block ||
					blockHasOwnDeclaration(block) ||
					!blockHasNestedBlock(block))
			) {
				reportPureRule(preludeStart, preludeEnd);
			}
			pureBlockStack.push({
				ancestorHadLocal:
					parentEffectivePure() ||
					(isRulePrelude && !currentRuleHasImpureSelector),
				skipChildren: ownSkip || skipOwn
			});
			pureIgnorePending = false;
			currentSelectorHasLocal = false;
			currentRuleHasImpureSelector = false;
		};

		/**
		 * Pure-mode rule exit: drop the inherited-context frame.
		 * @returns {void}
		 */
		const exitPureBlock = () => {
			pureBlockStack.pop();
		};

		/** @typedef {{ value?: string, importName?: string, localName?: string, request?: string }} IcssDefinition */
		/** @type {Map<string, IcssDefinition>} */
		const icssDefinitions = new Map();

		// `composes: … from "<file>"` load-order graph (postcss-modules-extract-imports#138); topologically sorted at end-of-parse to tag each file's first composes-import with `sourceOrder`.
		/** @type {Map<string, Set<string>>} */
		const composesGraph = new Map();
		/** @type {Map<string, CssIcssImportDependency>} */
		const composesFirstFileImport = new Map();
		/** @type {string | undefined} */
		let currentRulePrevComposesFile;
		/** @type {Set<string>} */
		const currentRuleComposesFiles = new Set();

		/**
		 * Whether the module's default mode is local (callers here have no `:local`/`:global` wrapper in scope, so it reduces to the default mode).
		 * @returns {boolean} true when the module's default mode is `local`
		 */
		const isLocalMode = () => mode === "local";

		/**
		 * Comment callback: push every comment-token (in source order) onto `this.comments`, read back by `advanceCommentCursor` (pure-mode flags) and `parseCommentOptions` (magic comments).
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

		// Index into `this.comments` consumed by `advanceCommentCursor`, advancing in source order so pure-mode comment flags toggle without re-tokenizing.
		let commentCursor = 0;

		/**
		 * Advance `commentCursor` past every comment closing at/before `until`, applying its pure-mode side effect: `pureIgnorePending` (next rule) or the file-level `pureNoCheck` (only before the first top-level rule).
		 * @param {number} until source position to advance the cursor to
		 * @returns {void}
		 */
		const advanceCommentCursor = (until) => {
			if (!this.comments) return;
			while (commentCursor < this.comments.length) {
				const c = this.comments[commentCursor];
				if (c.range[1] > until) return;
				const v = c.value;
				if (PURE_IGNORE_RE.test(v)) {
					pureIgnorePending = true;
				} else if (PURE_NO_CHECK_RE.test(v) && !seenTopLevelRule) {
					pureNoCheck = true;
				}
				commentCursor++;
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
				// `:import("path")` args — the `import(…)` function's value, or the first `(` block for the spaced `:import (…)` form.
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

			// Body `{ name: value; … }` is parsed eagerly (§5.4.4) — emit a dep per declaration.
			if (!block || block.token !== "{") {
				return block ? block.range[1] : second.range[1];
			}
			for (const item of block.value) {
				if (item.type !== "Declaration") continue;
				const decl = /** @type {Declaration} */ (item);
				const vals = decl.value;
				if (vals.length === 0) continue;
				const rawStart = vals[0].range[0];
				const rawEnd = vals[vals.length - 1].range[1];
				createDep(
					source.slice(decl.nameRange[0], decl.nameRange[1]),
					source.slice(rawStart, rawEnd),
					decl.nameRange[1],
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
		 * Emit a `CssIcssSymbolDependency` rewrite for an ident resolving to an `@value`-defined ICSS symbol (source-order semantics hold since the walker handles each `@value` before later references).
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
		 * Process a `local(...)` / `global(...)` pseudo-function: strip the call (and a leading legacy `:`) via a presentational dep, then emit `local()`'s inner top-level idents as ICSS exports.
		 * @param {FunctionNode} fn parsed local/global function node
		 * @param {1 | 2} type 1 = local, 2 = global
		 */
		const processLocalOrGlobalFunction = (fn, type) => {
			// Replace `local(` / `global(` (and a leading `:` for the `:local(`/`:global(` selector form) with empty.
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
					const {
						start: { line: sl, column: sc },
						end: { line: el, column: ec }
					} = cv.loc;
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
		 * Localize the prelude name of `@keyframes` / `@counter-style` / `@container`: `options.string` takes the first string, `options.identifier` the first ident (a `RegExp` skips matching keywords), `:local()`/`:global()` count as found; top-level `var()`/`style()` dashed idents are always ICSS-processed.
		 * @param {AtRule} atRule parsed at-rule
		 * @param {{ string?: boolean, identifier?: boolean | RegExp }} options which prelude value kinds count as the local name
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
						const {
							start: { line: sl, column: sc },
							end: { line: el, column: ec }
						} = cv.loc;
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
						const {
							start: { line: sl, column: sc },
							end: { line: el, column: ec }
						} = cv.loc;
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
		 * Emit the ICSS export declaring this module exports the given custom property.
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
		 * Emit `--<name> from "<path>"` as an ICSS import + export, stripping ` from "<path>"` so the runtime sees just `--<name>` (dep ranges end at `sourceEnd - 1`, the closing quote).
		 * @param {number} identStart start of the `--<name>` ident
		 * @param {number} identEnd end of the ident
		 * @param {number} fromIdentStart start of the `from` keyword (lower bound of the strip)
		 * @param {number} sourceEnd position past the closing quote of the source string
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
		 * Strip ` from global` and emit no ICSS export (an explicitly-global custom property isn't a CSS-Modules name).
		 * @param {number} identEnd end of the `--<name>` ident
		 * @param {number} sourceEnd position past the `global` ident
		 */
		const emitDashedIdentFromGlobal = (identEnd, sourceEnd) => {
			module.addPresentationalDependency(
				new ConstDependency("", [identEnd, sourceEnd])
			);
		};

		/**
		 * Scope a dashed-ident inside `var(…)` / `style(…)`: emit the first (dashed) ident and its optional `from <ident|string>` suffix.
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
		 * The child list of an AST node (a function/block `value` or a rule `prelude`) for sibling lookahead.
		 * @param {AstNode | null} parent parent node
		 * @returns {AstNode[] | undefined} the child list, or undefined
		 */
		const childrenOf = (parent) => {
			if (!parent) return undefined;
			switch (parent.type) {
				case "Function":
					return /** @type {FunctionNode} */ (parent).value;
				case "SimpleBlock":
					return /** @type {SimpleBlock} */ (parent).value;
				case "Declaration":
					return /** @type {Declaration} */ (parent).value;
				case "AtRule":
				case "QualifiedRule":
					return /** @type {AtRule | QualifiedRule} */ (parent).prelude;
				default:
					return undefined;
			}
		};

		// `allowImport` mirrors `allowImportAtRule`: true until the first top-level block-bearing rule.
		let allowImport = true;
		// Persistent CSS-Modules mode for a top-level rule: set by bare `:local` / `:global`, leaks into sibling rules, reset at each top-level `}`.
		/** @type {"local" | "global" | undefined} */
		let modeData;
		// Suppress localizing the next qualified rule's selectors after a `;`-terminated at-rule.
		let suppressNextRulePrelude = false;
		// Whether the current rule's prelude declared a local-mode anchor selector (avoids overlapping the `composes` strip-dep).
		let currentRuleHasLocalAnchor = false;
		// The current rule's local class / id names in source order (composes reads `[0]` as the anchor); saved / restored per qualified rule.
		/** @type {string[]} */
		let currentRuleLocalIdentifiers = [];

		// Dashed-ident (custom-property) scoping state — mutated across function nesting (saved/restored via `vDashedStack`), so it can't be derived from the enclosing node alone.
		let vDashed = false; // dashed-ident scoping is active
		let vDashedEmit = false; // emit top-level dashed-ident exports at this nesting level
		/** @type {{ active: boolean, emit: boolean }[]} */
		const vDashedStack = []; // `vDashed` / `vDashedEmit` saved across function nesting
		// Nearest enclosing declaration / at-rule / qualified-rule, set by each structural enter; the Url / Function / Ident / Comma visitors read it (via `urlActive` / `localGlobalActive` / `icssActive`) to decide value handling from the node hierarchy instead of carrying precomputed flags.
		/** @type {AstNode | undefined} */
		let currentStructural;

		/**
		 * Per-at-rule scope frames; `exit` reads `hasBlock` to pick the block-cleanup vs `suppressNextRulePrelude` branch.
		 * @type {{ savedAnchor: boolean, savedLocalIdentifiers: string[], name: string, hasBlock: boolean, endsWithSemicolon: boolean }[]}
		 */
		const atRuleStateStack = [];

		/**
		 * Walk component values as a selector list, emitting ID / attribute deps and recursing into `:not()`/`:is()`/`:local()`/`:global()` wrappers; `localMode` is the sub-tree mode and `topLevel` controls whether commas reset it (only outside parentheses).
		 * @param {AstNode[]} values component values to walk
		 * @param {"local" | "global"} localMode CSS-Modules mode applicable to this sub-tree
		 * @param {boolean=} topLevel whether commas in this list reset to `localMode` (defaults to `true`)
		 * @returns {void}
		 */
		const walkSelectorList = (values, localMode, topLevel = true) => {
			// At a rule's top level, inherit persistent `modeData` (or the one-shot `suppressNextRulePrelude` → "global"); recursive calls use the passed `localMode`.
			let segmentMode = localMode;
			if (topLevel) {
				if (suppressNextRulePrelude) {
					segmentMode = "global";
					suppressNextRulePrelude = false;
				} else if (modeData) {
					segmentMode = modeData;
				}
			}
			for (let i = 0; i < values.length; i++) {
				const v = values[i];
				if (v.type === "Comma") {
					if (topLevel) {
						// Top-level comma resets the segment + persistent mode and, in pure mode, finalizes the segment's purity.
						segmentMode = localMode;
						modeData = undefined;
						if (pureMode) finalizeSelector();
					}
					continue;
				}
				if (v.type === "Whitespace") continue;
				// Pure-mode: a nesting `&` inherits a pure ancestor's purity.
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
							// Bare `:local` / `:global`: switch the segment (and top-level persistent) mode and strip the marker. The next sibling token is whitespace when any whitespace separates the marker from the next selector (comments aren't AST nodes); strip the marker plus that whitespace, but only when it's adjacent (a comment between would end the run).
							const afterMarker = values[i + 2];
							const afterIsWhitespace = Boolean(
								afterMarker && afterMarker.type === "Whitespace"
							);
							const stripEnd =
								afterIsWhitespace && afterMarker.range[0] === next.range[1]
									? afterMarker.range[1]
									: next.range[1];
							if (isModules) {
								module.addPresentationalDependency(
									new ConstDependency("", [v.range[0], stripEnd])
								);
							}
							// Bare `:local` / `:global` needs whitespace before the next selector (else `:local.b` is ambiguous) — warn when none follows.
							if (!afterIsWhitespace) {
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
							if (topLevel) modeData = id;
							// Skip past the colon + ident.
							i += 1;
							continue;
						}
					} else if (next.type === "Function") {
						const fname = /** @type {FunctionNode} */ (next).name
							.replace(/\\/g, "")
							.toLowerCase();
						if (fname === "local" || fname === "global") {
							// `:local(…)` / `:global(…)`: scope mode to the args and strip the wrapper with two source-level strip deps (leading `:name(` + whitespace, then trailing `)` — `:local` also eats whitespace before `)`).
							const fn = /** @type {FunctionNode} */ (next);
							if (isModules) {
								// Strip `:name(` up to the first arg (leading whitespace / comments inside the parens aren't AST nodes).
								let stripLeadEnd = fn.range[1] - 1;
								for (const arg of fn.value) {
									if (arg.type !== "Whitespace") {
										stripLeadEnd = arg.range[0];
										break;
									}
								}
								module.addPresentationalDependency(
									new ConstDependency("", [v.range[0], stripLeadEnd])
								);
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
							walkSelectorList(
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
					// Any other function (`:not(…)`, `:is(…)`, …): recurse with the segment mode preserved (only `:local(…)` / `:global(…)`, handled above, switch mode).
					walkSelectorList(
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
					// ID selectors emit the ICSS export but aren't a `composes:` anchor.
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
					const {
						start: { line: idSl, column: idSc },
						end: { line: idEl, column: idEc }
					} = v.loc;
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
					// Attribute selectors `[class="foo"]` / `[class~="foo"]` emit the ICSS export (not a composes anchor) by walking the `[…]` block's parsed children.
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
				// `@scope (.foo)` and other parenthesised selector wrappers — recurse into the `(…)` block.
				if (
					v.type === "SimpleBlock" &&
					/** @type {SimpleBlock} */ (v).token === "("
				) {
					walkSelectorList(
						/** @type {SimpleBlock} */ (v).value,
						segmentMode,
						false
					);
					continue;
				}
				// `.<ident>` in local mode is a class selector (dep covers the ident bytes only).
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
						const {
							start: { line: sl, column: sc },
							end: { line: el, column: ec }
						} = next.loc;
						dep.setLoc(sl, sc, el, ec);
						module.addDependency(dep);
						currentRuleHasLocalAnchor = true;
						currentRuleLocalIdentifiers.push(name);
						if (pureMode) currentSelectorHasLocal = true;
						i += 1;
					}
					continue;
				}
				// `.<ident>` in global mode: not localized, but the ident may be `@value`-defined and need ICSS rewrite.
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
						// Skip the ident so the bare-ident branch below doesn't re-emit it.
						i += 1;
					}
					continue;
				}
				// ICSS rewrite for a bare `@value`-defined ident used as a type-style selector.
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
			// Pure-mode: finalize the trailing comma-separated segment.
			if (topLevel && pureMode) finalizeSelector();
		};
		/**
		 * Per-qualified-rule scope frames; `{ bailed: true }` for inline-handled `:import` / `:export` pseudo-rules.
		 * @type {({ bailed: true } | { bailed: false, savedAnchor: boolean, savedLocalIdentifiers: string[], savedPrevComposesFile: string | undefined, savedComposesFiles: Set<string> })[]}
		 */
		const qualifiedRuleStateStack = [];

		/**
		 * Whether url() deps are emitted here (from `currentStructural`): false outside `options.url` and inside an `@import` prelude (the import target, unless url recovery is on).
		 * @returns {boolean} true when url() deps should be emitted
		 */
		const urlActive = () => {
			if (!this.options.url || !currentStructural) return false;
			if (currentStructural.type === "AtRule") {
				return (
					`@${/** @type {AtRule} */ (currentStructural).name.toLowerCase()}` !==
						"@import" || importNeedsUrlRecovery
				);
			}
			return true;
		};

		/**
		 * At-rules with a dedicated CSS-Modules handler, so the generic `local()`/`global()` value rewrite and dashed-ident scoping are off for them.
		 * @param {string} name at-rule name including the leading `@`, lower-cased
		 * @returns {boolean} true for `@import` / `@charset` / `@namespace` / `@value` / `@scope` and the option-gated `@keyframes` / `@counter-style` / `@container`
		 */
		const isLocalHandledAtRule = (name) =>
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

		/**
		 * Whether a `composes:` declaration with a local anchor owns the whole declaration (its strip-dep covers the value), suppressing the generic value rewrites.
		 * @param {Declaration} decl declaration node
		 * @returns {boolean} true when the value rewrites should be skipped
		 */
		const composesAnchorSkip = (decl) =>
			currentRuleHasLocalAnchor &&
			COMPOSES_PROPERTY.test(decl.name.replace(/^(-\w+-)/, "").toLowerCase());

		/**
		 * Whether `local()` / `global()` value functions are rewritten to ICSS here (from `currentStructural`).
		 * @returns {boolean} true when the rewrite is active
		 */
		const localGlobalActive = () => {
			if (!isModules || !currentStructural) return false;
			if (currentStructural.type === "AtRule") {
				return !isLocalHandledAtRule(
					`@${/** @type {AtRule} */ (currentStructural).name.toLowerCase()}`
				);
			}
			if (currentStructural.type === "Declaration") {
				return !composesAnchorSkip(
					/** @type {Declaration} */ (currentStructural)
				);
			}
			return false;
		};

		/**
		 * Whether `@value`-defined idents / function names are ICSS-rewritten here (from `currentStructural`).
		 * @returns {boolean} true when the rewrite is active
		 */
		const icssActive = () => {
			if (!isModules || !currentStructural) return false;
			if (currentStructural.type === "AtRule") {
				const name = `@${/** @type {AtRule} */ (currentStructural).name.toLowerCase()}`;
				return name !== "@value" && name !== "@import";
			}
			if (currentStructural.type === "Declaration") {
				const decl = /** @type {Declaration} */ (currentStructural);
				return (
					!composesAnchorSkip(decl) &&
					!knownProperties.has(decl.name.replace(/^(-\w+-)/, "").toLowerCase())
				);
			}
			return false;
		};

		// Drive the walk through SourceProcessor: structural enter / exit map to the `walkAst…Enter` / `…Exit` halves; value visitors handle url / ICSS / local-global.
		/** @type {CssVisitors} */
		const visitors = {
			AtRule: {
				// At-rule enter: scope save, name dispatch, prelude value context, pure-block push.
				enter: (node, parent) => {
					const at = /** @type {AtRule} */ (node);
					const topLevel = parent === null;
					if (pureMode) advanceCommentCursor(at.range[0]);
					const savedAnchor = currentRuleHasLocalAnchor;
					const savedLocalIdentifiers = currentRuleLocalIdentifiers;
					currentRuleLocalIdentifiers = [...savedLocalIdentifiers];
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
							if (!topLevel || !allowImport) {
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
							// We only accept `;`-terminated @import; block / EOF / `}` ends are silent bails.
							if (source.charCodeAt(at.range[1]) !== CC_SEMICOLON) break;

							// Walk the prelude in spec order (URL → layer? → supports? → media query); anything else joins the media query.
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
								// A malformed `@import` still emits orphan url() deps from its prelude.
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
									// Drop the whole at-rule so the unresolved identifier isn't substituted into the output.
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
								for (const inner of /** @type {FunctionNode} */ (urlNode)
									.value) {
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
							const { options, errors: commentErrors } =
								this.parseCommentOptions([importNameEnd, urlNode.range[1]]);
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
									const { line: sl, column: sc } =
										locConverter.get(importStart);
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
									layer = input
										.slice(fn.nameRange[1] + 1, fn.range[1] - 1)
										.trim();
								} else {
									// Bare `layer` ident — anonymous layer.
									layer = "";
								}
							}

							/** @type {undefined | string} */
							let supports;
							if (supportsNode) {
								supports = input
									.slice(
										supportsNode.nameRange[1] + 1,
										supportsNode.range[1] - 1
									)
									.trim();
							}

							// Media query = whatever sits between the last url/layer/supports part and the closing `;`, trimmed. Start at the next non-whitespace prelude node (skips the gap, comments included).
							const lastPrefixPart = supportsNode || layerNode || urlNode;
							let mediaStart = at.range[1];
							let afterPrefix = false;
							for (const cv of at.prelude) {
								if (afterPrefix && cv.type !== "Whitespace") {
									mediaStart = cv.range[0];
									break;
								}
								if (cv === lastPrefixPart) afterPrefix = true;
							}
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
							// `text` / `css-style-sheet` parents inline the import at build time, so order it via a code-generation dependency.
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
									if (
										/** @type {ValueAtRuleImport} */ (parsed).from.length === 0
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

									let { from, items } = /** @type {ValueAtRuleImport} */ (
										parsed
									);

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
											const { line: el, column: ec } =
												locConverter.get(nameEnd);
											dep.setLoc(sl, sc, el, ec);
											module.addDependency(dep);

											icssDefinitions.set(localName, {
												importName,
												request: from
											});
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
											const { line: el, column: ec } =
												locConverter.get(nameEnd);
											dep.setLoc(sl, sc, el, ec);
											module.addDependency(dep);
										}
									}
								} else {
									if (
										/** @type {ValueAtRuleValue} */ (parsed).localName
											.length === 0
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
							} else if (
								this.options.customIdents &&
								name === "@counter-style"
							) {
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

					// `@scope (.x) to (.y)` — walk the prelude as a selector list.
					if (
						isModules &&
						`@${at.name.toLowerCase()}` === "@scope" &&
						at.prelude.length > 0
					) {
						walkSelectorList(
							at.prelude,
							/** @type {"local" | "global"} */ (
								mode === "local" ? "local" : "global"
							)
						);
					}

					// Prelude value-visitor context; AST-handled at-rules emit their own deps so they're excluded from the local() / global() / ICSS walks.
					const effectiveLocalMode = modeData
						? modeData === "local"
						: mode === "local";
					const isProcessedByLocalAtRule = isLocalHandledAtRule(name);
					currentStructural = at;
					vDashed = false;
					// `@import` url() is the import target — only walk its prelude for url deps on `importNeedsUrlRecovery`.
					if (
						this.options.url &&
						(name !== "@import" || importNeedsUrlRecovery)
					) {
						lastTokenEndForComments = at.nameRange[1];
					}
					// Dashed-ident scoping over the prelude (the Ident / Function visitors emit).
					vDashed = Boolean(
						this.options.dashedIdents &&
						isModules &&
						!isProcessedByLocalAtRule &&
						effectiveLocalMode
					);
					vDashedEmit = vDashed;

					// Pure-mode: `@keyframes` / `@counter-style` / `@container` bodies are marked skip / treat-as-leaf.
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
						const identSkip =
							name === "@container" ? /^(none|and|or|not)$/ : null;
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
						const isAtRulePrelude = isPureRulePreludeAtRule(name);
						if (isAtRulePrelude) finalizeSelector();
						enterPureBlock({
							isRulePrelude: isAtRulePrelude,
							treatAsLeaf: atTreatAsLeaf,
							ownSkip: atSkipChildren,
							block: at.block,
							preludeStart: at.range[0],
							preludeEnd: at.block.range[0]
						});
					}

					atRuleStateStack.push({
						savedAnchor,
						savedLocalIdentifiers,
						name,
						hasBlock: Boolean(at.block),
						endsWithSemicolon: source.charCodeAt(at.range[1]) === CC_SEMICOLON
					});
				},
				// At-rule exit: pure-frame finalization, `suppressNextRulePrelude`, scope restore, top-level reset.
				exit: (node, parent) => {
					const state = atRuleStateStack.pop();
					if (!state) return;
					if (state.hasBlock) {
						if (pureMode) exitPureBlock();
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
						suppressNextRulePrelude = true;
					}
					currentRuleHasLocalAnchor = state.savedAnchor;
					currentRuleLocalIdentifiers = state.savedLocalIdentifiers;
					if (parent === null) {
						if (/** @type {AtRule} */ (node).block) allowImport = false;
						if (pureMode) seenTopLevelRule = true;
						modeData = undefined;
					}
				}
			},
			QualifiedRule: {
				// Qualified-rule enter: scope setup, selector + prelude context, pure-block push; `:import` / `:export` bail via `ctx.skipChildren()`.
				enter: (node, parent, ctx) => {
					const rule = /** @type {QualifiedRule} */ (node);
					const topLevel = parent === null;
					if (pureMode) advanceCommentCursor(rule.range[0]);
					// `:import(…) { … }` / `:export { … }` ICSS pseudo-rules are processed inline at top level; nested ones bail out.
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
									// Nested `:import` / `:export` — leave the body alone.
									rule.range[1] = rule.block.range[1];
								}
								// Don't recurse into the body — handled inline above.
								if (ctx) ctx.skipChildren();
								qualifiedRuleStateStack.push({ bailed: true });
								return;
							}
						}
					}
					// Reset the anchor flag for this rule's body, inheriting (copying) the parent's identifier list so nested `composes:` sees both parent and child class names.
					const savedAnchor = currentRuleHasLocalAnchor;
					const savedLocalIdentifiers = currentRuleLocalIdentifiers;
					currentRuleHasLocalAnchor = false;
					currentRuleLocalIdentifiers = [...savedLocalIdentifiers];
					// Composes-state reset between rules (saved / restored around this rule).
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
					if (isModules) {
						walkSelectorList(
							rule.prelude,
							/** @type {"local" | "global"} */ (
								mode === "local" ? "local" : "global"
							)
						);
					}
					// A malformed declaration can leave orphan `url(...)` in the prelude — let the url visitor pick those up.
					currentStructural = rule;
					vDashed = false;
					vDashedEmit = false;
					if (this.options.url && rule.prelude.length > 0) {
						lastTokenEndForComments = rule.prelude[0].range[0];
					}
					// Dashed-ident scoping for the deprecated `--foo: { … }` custom-property-set syntax (prelude starts with a dashed-ident).
					if (
						this.options.dashedIdents &&
						isModules &&
						rule.prelude.length > 0
					) {
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
							const effectiveLocalMode = modeData
								? modeData === "local"
								: mode === "local";
							if (effectiveLocalMode) {
								vDashed = true;
								vDashedEmit = true;
							}
						}
					}
					// Pure-mode: report an impure prelude (if leaf-ish) and push the inherited-context frame before walking the body.
					if (pureMode) {
						enterPureBlock({
							isRulePrelude: true,
							treatAsLeaf: false,
							ownSkip: false,
							block: rule.block,
							preludeStart: rule.range[0],
							preludeEnd: rule.block ? rule.block.range[0] : rule.range[1]
						});
					}
				},
				// Qualified-rule exit: pure-frame finalization, scope restore, top-level reset; no-op for bailed ICSS.
				exit: (node, parent) => {
					const state = qualifiedRuleStateStack.pop();
					if (!state || state.bailed) return;
					if (pureMode) exitPureBlock();
					currentRuleHasLocalAnchor = state.savedAnchor;
					currentRuleLocalIdentifiers = state.savedLocalIdentifiers;
					currentRulePrevComposesFile = state.savedPrevComposesFile;
					currentRuleComposesFiles.clear();
					for (const f of state.savedComposesFiles) {
						currentRuleComposesFiles.add(f);
					}
					if (parent === null) {
						allowImport = false;
						if (pureMode) seenTopLevelRule = true;
						modeData = undefined;
					}
				}
			},
			// Top-level declarations are parse errors (dropped by `parseAStylesheet`), so a declaration's parent is always a block.
			Declaration: (decl) => {
				// Reset value-visitor context, read by the value visitors below.
				currentStructural = decl;
				vDashed = false;
				vDashedEmit = false;
				const declPropertyName = decl.name
					.replace(/^(-\w+-)/, "")
					.toLowerCase();
				// Position `lastTokenEndForComments` just past the `:` so a magic comment before the url() is found.
				let colonPos = decl.nameRange[1];
				while (
					colonPos < source.length &&
					source.charCodeAt(colonPos) !== CC_COLON
				) {
					colonPos++;
				}
				lastTokenEndForComments = colonPos + 1;
				const effectiveLocalMode = modeData
					? modeData === "local"
					: mode === "local";
				// `composes:` with a local anchor: its strip-dep covers the whole declaration, so suppress the value's local/global/dashed/ICSS rewrites.
				const isComposesWithAnchor =
					COMPOSES_PROPERTY.test(declPropertyName) && currentRuleHasLocalAnchor;
				const emitComposesWithAnchor = () => {
					if (currentRuleLocalIdentifiers.length > 1) {
						this._emitWarning(
							state,
							`Composition is only allowed when selector is single local class name not in "${currentRuleLocalIdentifiers.join(
								'", "'
							)}"`,
							locConverter,
							decl.range[0],
							decl.range[1]
						);
						return;
					}
					const lastLocalIdentifier = currentRuleLocalIdentifiers[0];

					// Split the value at top-level commas — each segment is one `<name>+ [from <source>]` group.
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
									let successors = composesGraph.get(
										currentRulePrevComposesFile
									);
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

					// Strip the whole `composes: …;` (property name included) plus trailing same-line whitespace. The `;` and that whitespace aren't AST nodes (a block's contents drop them), so scan the source here.
					let resumeAt = decl.range[1];
					if (source.charCodeAt(decl.range[1]) === CC_SEMICOLON) {
						resumeAt = decl.range[1] + 1;
						while (isCssWhitespace(source.charCodeAt(resumeAt))) resumeAt++;
					}
					module.addPresentationalDependency(
						new ConstDependency("", [decl.nameRange[0], resumeAt])
					);
				};
				if (isComposesWithAnchor) emitComposesWithAnchor();
				const skipForComposes = isComposesWithAnchor;
				// Known-property value localization (`animation-name: foo` exports `foo`).
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
					// Collect idents/strings to export — top-level only, except grid-template recurses (`[line-name]` blocks live in `repeat(…)`).
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
										// Collect identifiers until the first non-ident token (`<line-names> = '[' <custom-ident>* ']'`).
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
				// Dashed-ident (custom-property) export of the property name; the value's dashed idents are scoped by the Ident / Function visitors (top-level only for unknown properties).
				if (
					this.options.dashedIdents &&
					isModules &&
					effectiveLocalMode &&
					!skipForComposes
				) {
					if (isDashedIdentifier(decl.name)) {
						emitDashedIdentExport(decl.nameRange[0], decl.nameRange[1]);
					}
					vDashed = true;
					vDashedEmit = !knownProperties.has(declPropertyName);
				}
				// ICSS-symbol rewrite (`color: foo` when `foo` is `@value`-defined), skipping known properties, the composes anchor, and dashed idents (handled above).
				if (
					isModules &&
					!skipForComposes &&
					!knownProperties.has(declPropertyName) &&
					!(vDashed && isDashedIdentifier(decl.name)) &&
					icssDefinitions.has(decl.name)
				) {
					emitICSSSymbol(decl.name, decl.nameRange[0], decl.nameRange[1]);
				}
			},
			// Value-level visitors decide handling from the enclosing node via `urlActive()` / `localGlobalActive()` / `icssActive()`.
			Url: (node) => {
				if (!urlActive()) return;
				// Skip bare url-tokens for a known property in CSS-Modules local mode.
				if (currentStructural && currentStructural.type === "Declaration") {
					const prop = /** @type {Declaration} */ (currentStructural).name
						.replace(/^(-\w+-)/, "")
						.toLowerCase();
					const localMode = modeData ? modeData === "local" : mode === "local";
					if (isModules && localMode && knownProperties.has(prop)) return;
				}
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
				const {
					start: { line: sl, column: sc },
					end: { line: el, column: ec }
				} = node.loc;
				dep.setLoc(sl, sc, el, ec);
				module.addDependency(dep);
				module.addCodeGenerationDependency(dep);
			},
			Comma(node) {
				if (urlActive()) lastTokenEndForComments = node.range[0];
			},
			Function: {
				enter: (fn) => {
					const fnameRaw = fn.name.replace(/\\/g, "");
					const fname = fnameRaw.toLowerCase();
					const emitUrlFunction = () => {
						if (fname === "url" || fname === "src") {
							// Quoted `url("…")` / `src("…")`: first non-whitespace value is the string token.
							/** @type {Token | undefined} */
							let string;
							for (const cv of fn.value) {
								if (cv.type === "Whitespace") continue;
								if (cv.type === "String") string = /** @type {Token} */ (cv);
								break;
							}
							if (!string) return;
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
									return;
								}
							}
							const value = normalizeUrl(
								input.slice(string.range[0] + 1, string.range[1] - 1),
								true
							);
							// Ignore `url()`, `url('')` and `url("")`, they are valid by spec
							if (value.length === 0) return;
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
							// `image-set(…)`: each comma segment's first string is the URL; advance the magic-comment fence per string.
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
					};
					if (urlActive()) emitUrlFunction();
					if (
						localGlobalActive() &&
						(fname === "local" || fname === "global")
					) {
						processLocalOrGlobalFunction(fn, fname === "local" ? 1 : 2);
					}
					if (
						icssActive() &&
						fname !== "local" &&
						fname !== "global" &&
						!(vDashed && isDashedIdentifier(fnameRaw)) &&
						icssDefinitions.has(fnameRaw)
					) {
						emitICSSSymbol(fnameRaw, fn.nameRange[0], fn.nameRange[1]);
					}
					// Dashed-ident scoping: handle this function, then set the child nesting level's state for the walk.
					vDashedStack.push({ active: vDashed, emit: vDashedEmit });
					if (vDashed) {
						if (fname === "local" || fname === "global") {
							// `local()` / `global()` dashed args go through the ICSS path above, not here.
							vDashed = false;
						} else if (fname === "var" || fname === "style") {
							// `var(--foo, …)` / `style(--foo, …)`: emit the first ident; the fallback doesn't self-emit.
							processDashedIdentInVarFunction(fn);
							vDashedEmit = false;
						} else if (vDashedEmit && isDashedIdentifier(fn.name)) {
							// Custom-function call `--my-func(args)` — the name is the exported dashed-ident.
							emitDashedIdentExport(fn.nameRange[0], fn.nameRange[1]);
						}
					}
				},
				exit: () => {
					const s = /** @type {{ active: boolean, emit: boolean }} */ (
						vDashedStack.pop()
					);
					vDashed = s.active;
					vDashedEmit = s.emit;
				}
			},
			Ident(node, parent) {
				const identValue = node.value;
				if (vDashed && isDashedIdentifier(identValue)) {
					// Dashed idents are scoped here, never `@value` ICSS-rewritten.
					if (!vDashedEmit) return;
					// Resolve the `--foo from "./x.css"` / `--foo from global` import suffix via sibling lookahead.
					const siblings = childrenOf(parent);
					const i = siblings ? siblings.indexOf(node) : -1;
					if (siblings && i !== -1) {
						let j = i + 1;
						while (j < siblings.length && siblings[j].type === "Whitespace") {
							j++;
						}
						if (
							j < siblings.length &&
							siblings[j].type === "Ident" &&
							/** @type {Token} */ (siblings[j]).value.toLowerCase() === "from"
						) {
							const fromIdent = siblings[j];
							j++;
							while (j < siblings.length && siblings[j].type === "Whitespace") {
								j++;
							}
							const sourceNode = siblings[j];
							if (
								sourceNode &&
								sourceNode.type === "Ident" &&
								/** @type {Token} */ (sourceNode).value === "global"
							) {
								emitDashedIdentFromGlobal(node.range[1], sourceNode.range[1]);
								return;
							}
							if (sourceNode && sourceNode.type === "String") {
								emitDashedIdentImport(
									node.range[0],
									node.range[1],
									fromIdent.range[0],
									sourceNode.range[1],
									input.slice(sourceNode.range[0] + 1, sourceNode.range[1] - 1)
								);
								return;
							}
						}
					}
					emitDashedIdentExport(node.range[0], node.range[1]);
					return;
				}
				if (!icssActive()) return;
				if (icssDefinitions.has(identValue)) {
					emitICSSSymbol(identValue, node.range[0], node.range[1]);
				}
			}
		};
		new SourceProcessor()
			.use(/** @type {VisitorMap} */ (visitors))
			.process(source, { locConverter, comment });

		/** @type {BuildInfo} */
		(module.buildInfo).strict = true;

		// Topologically sort the `composes … from` files and tag each file's first import dep with `sourceOrder` for cascade-correct load order (cycles keep their natural position).
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
				// Fast path for the common `webpackXxx: <bool|number|null>` pair, keeping it out of `vm.runInContext`.
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
