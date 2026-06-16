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
	NodeType,
	SourceProcessor,
	equalsLowerCase,
	unescapeIdentifier
} = require("./syntax");

// `SourceProcessor` drives the parse and hands already-built AST nodes to the visitors; positions are read from those nodes' ranges rather than re-scanning the source.

/** @typedef {import("../Module").BuildInfo} BuildInfo */
/** @typedef {import("../Module").BuildMeta} BuildMeta */
/** @typedef {import("./CssModule").CssModuleBuildInfo} CssModuleBuildInfo */
/** @typedef {import("./CssModule").CssModuleBuildMeta} CssModuleBuildMeta */
/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../Parser").PreparsedAst} PreparsedAst */
/** @typedef {import("./syntax").AtRule} AtRule */
/** @typedef {import("./syntax").Declaration} Declaration */
/** @typedef {import("./syntax").FunctionNode} FunctionNode */
/** @typedef {import("./syntax").Node} AstNode */
/** @typedef {import("./syntax").QualifiedRule} QualifiedRule */
/** @typedef {import("./syntax").Rule} Rule */
/** @typedef {import("./syntax").SimpleBlock} SimpleBlock */
/** @typedef {import("./syntax").Token} Token */
/** @typedef {import("./syntax").UrlToken} UrlToken */
/** @typedef {import("./syntax").HashToken} HashToken */
/** @typedef {import("./syntax").VisitorMap} VisitorMap */
/** @typedef {import("../../declarations/WebpackOptions").CssAutoOrModuleParserOptions} CssAutoOrModuleParserOptions */
/** @typedef {import("../../declarations/WebpackOptions").CssModuleParserOptions} CssModuleParserOptions */
/** @typedef {import("./CssModule")} CssModule */
/** @typedef {import("./CssModule").Inheritance} Inheritance */

/** @typedef {[number, number]} Range */
/** @typedef {{ line: number, column: number }} Position */
/** @typedef {{ from: string, items: ({ localName: string, importName: string })[] }} ValueAtRuleImport */
/** @typedef {{ localName: string, value: string }} ValueAtRuleValue */

const CC_COLON = ":".charCodeAt(0);
const CC_SEMICOLON = ";".charCodeAt(0);
const CC_TAB = "\t".charCodeAt(0);
const CC_SPACE = " ".charCodeAt(0);
const CC_LINE_FEED = "\n".charCodeAt(0);
const CC_CARRIAGE_RETURN = "\r".charCodeAt(0);
const CC_FORM_FEED = "\f".charCodeAt(0);
const CC_LEFT_CURLY = "{".charCodeAt(0);

// A parsed CSS comment. `loc` is computed on demand — only magic-comment error
// warnings read it, so comment-heavy CSS skips the per-comment line/col work.
// Comments are kept in a flat per-parse `comments` side array (not AST nodes); `loc` is derived lazily via `rangeLoc` only where needed (magic-comment errors).
/** @typedef {{ value: string, range: Range }} Comment */

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
// `@value` recognizers (postcss-modules-values shape): the import form `<names> from <source>`, and the `<importName> as <localName>` alias inside it.
const VALUE_IMPORT_FORM = /from(\/\*|\s)(?:[\s\S]+)$/i;
const VALUE_AS_ALIAS = /\s+as\s+/;
// `@value name value`: end of the name run (first non-space followed by space).
const VALUE_NAME_BOUNDARY = /\S\s/;
const ONLY_WHITESPACE = /^\s+$/;
// Relative request prefix (`./` or `../`) — `isSelfReferenceRequest` per `from`.
const RELATIVE_REQUEST = /^\.{1,2}\//;

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
	// Fast paths: skip the regex engine for the common URL with no escape and
	// no edge whitespace (e.g. `./img.png`). Each guard is equivalent to the
	// regex being a no-op.
	// Remove escaped newlines from a string-token url like `url("im\<newline>g.png")`.
	if (isString && str.includes("\\")) {
		str = str.replace(STRING_MULTILINE, "");
	}

	// Remove unnecessary spaces from `url("   img.png	 ")`
	if (
		str.length !== 0 &&
		(isCssWhitespace(str.charCodeAt(0)) ||
			isCssWhitespace(str.charCodeAt(str.length - 1)))
	) {
		str = str.replace(TRIM_WHITE_SPACES, "");
	}

	// Unescape
	if (str.includes("\\")) {
		str = str.replace(UNESCAPE, (match) => {
			if (match.length > 2) {
				return String.fromCharCode(Number.parseInt(match.slice(1).trim(), 16));
			}
			return match[1];
		});
	}

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

// `escapeIdentifier` / `unescapeIdentifier` live in ./syntax.js; they're re-exported at the bottom for back-compat callers.

/**
 * A custom property name (`<dashed-ident>`): a `--`-prefixed identifier other than bare `--`.
 * @param {string} identifier identifier
 * @returns {boolean} true when identifier is dashed, otherwise false
 */
const isDashedIdentifier = (identifier) =>
	identifier.startsWith("--") && identifier.length >= 3;

/**
 * `binarySearchBounds` comparator for `getComments` — hoisted so the lookup
 * doesn't allocate a fresh closure per call.
 * @param {Comment} comment comment
 * @param {number} needle needle (byte offset)
 * @returns {number} comparison
 */
const compareCommentStart = (comment, needle) =>
	/** @type {Range} */ (comment.range)[0] - needle;

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
const buildKnownProperties = (options = {}) => {
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

/** @type {Map<number, Map<string, Record<string, number>>>} */
const KNOWN_PROPERTIES_CACHE = new Map();

/**
 * Memoized {@link buildKnownProperties}: the table depends only on the four
 * boolean options (≤16 combinations) and is read-only, while the same parser is
 * reused across modules — so build each combination once and share it instead
 * of rebuilding the Map (and its value objects) per parsed module.
 * @param {{ animation?: boolean, container?: boolean, customIdents?: boolean, grid?: boolean }=} options options
 * @returns {Map<string, Record<string, number>>} known properties table
 */
const getKnownProperties = (options = {}) => {
	const key =
		(options.animation ? 1 : 0) |
		(options.container ? 2 : 0) |
		(options.customIdents ? 4 : 0) |
		(options.grid ? 8 : 0);
	let table = KNOWN_PROPERTIES_CACHE.get(key);
	if (table === undefined) {
		table = buildKnownProperties(options);
		KNOWN_PROPERTIES_CACHE.set(key, table);
	}
	return table;
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
 * Whether the ident byte-range is a `@container` prelude keyword (`none`/`and`/`or`/`not`, lowercase only) — byte comparison avoids slicing a transient string per prelude ident.
 * @param {string} input source
 * @param {number} start start offset
 * @param {number} end end offset
 * @returns {boolean} true for a container keyword
 */
const isContainerKeyword = (input, start, end) => {
	switch (end - start) {
		case 2:
			return input.startsWith("or", start);
		case 3:
			return input.startsWith("and", start) || input.startsWith("not", start);
		case 4:
			return input.startsWith("none", start);
		default:
			return false;
	}
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

/**
 * Pure-mode at-rules whose prelude is selector-checked, so their body is opaque to the enclosing rule's declaration accounting.
 * @param {string} name at-rule name including the leading `@`, lower-cased
 * @returns {boolean} true for `@keyframes` / `@counter-style` / `@container` / `@scope`
 */
const isPureBodyAtRule = (name) =>
	OPTIONALLY_VENDOR_PREFIXED_KEYFRAMES_AT_RULE.test(name) ||
	name === "@counter-style" ||
	name === "@container" ||
	name === "@scope";

/**
 * Scan a rule body once: does it hold a direct declaration counted against the enclosing rule (a declaration, or one in a transparent conditional-group at-rule like `@media`/`@supports`/…) and does it hold a nested block (qualified rule or any block-bearing at-rule)?
 * @param {{ declarations: Declaration[] | null, childRules: Rule[] | null }} body rule body
 * @returns {{ hasDirectDecl: boolean, hasNestedBlock: boolean }} scan result
 */
const scanRuleBody = (body) => {
	let hasDirectDecl = Boolean(
		body.declarations && body.declarations.length > 0
	);
	let hasNestedBlock = false;
	if (body.childRules) {
		for (const child of body.childRules) {
			if (child.type === NodeType.QualifiedRule) {
				hasNestedBlock = true;
			} else if (child.type === NodeType.AtRule) {
				const at = /** @type {AtRule} */ (child);
				if (!at.declarations && !at.childRules) continue;
				hasNestedBlock = true;
				if (
					!hasDirectDecl &&
					!isPureBodyAtRule(`@${at.name.toLowerCase()}`) &&
					scanRuleBody(at).hasDirectDecl
				) {
					hasDirectDecl = true;
				}
			}
		}
	}
	return { hasDirectDecl, hasNestedBlock };
};

/**
 * Parses value at rule params.
 * @param {string} str value at-rule params
 * @returns {ValueAtRuleImport | ValueAtRuleValue} parsed result
 */
const parseValueAtRuleParams = (str) => {
	if (VALUE_IMPORT_FORM.test(str)) {
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

				const asParts = item.split(VALUE_AS_ALIAS);

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
		const idx = mask.search(VALUE_NAME_BOUNDARY) + 1;

		localName = str.slice(0, idx).replace(CSS_COMMENT, "").trim();
		value = str.slice(idx + (str[idx] === " " ? 1 : 0));
	}

	if (
		value.length > 0 &&
		!ONLY_WHITESPACE.test(value.replace(CSS_COMMENT, ""))
	) {
		value = value.trim();
	}

	return { localName, value };
};

/**
 * Index of the next non-whitespace child at or after `from`, or `nodes.length`.
 * @param {AstNode[]} nodes node list
 * @param {number} from start index (inclusive)
 * @returns {number} index of the next non-whitespace node
 */
const nextNonWhitespace = (nodes, from) => {
	let i = from;
	while (i < nodes.length && nodes[i].type === NodeType.Whitespace) i++;
	return i;
};

/** @typedef {{ urlNode: (AstNode | undefined), layerNode: (AstNode | undefined), supportsNode: (FunctionNode | undefined) }} ImportPrelude */

/**
 * Scan an `@import` prelude in spec order — URL → `layer` / `layer(…)`? → `supports(…)`? — stopping at the first media-query token (the caller slices the media query out separately).
 * @param {AstNode[]} prelude the at-rule prelude nodes
 * @returns {ImportPrelude} the recognized prefix parts (any may be undefined)
 */
const parseImportPrelude = (prelude) => {
	/** @type {AstNode | undefined} */
	let urlNode;
	/** @type {AstNode | undefined} */
	let layerNode;
	/** @type {FunctionNode | undefined} */
	let supportsNode;

	for (const cv of prelude) {
		if (cv.type === NodeType.Whitespace) continue;

		if (!urlNode) {
			if (cv.type === NodeType.Url || cv.type === NodeType.String) {
				urlNode = cv;
				continue;
			}
			if (
				cv.type === NodeType.Function &&
				equalsLowerCase(/** @type {FunctionNode} */ (cv).unescapedName, "url")
			) {
				urlNode = cv;
				continue;
			}
			if (cv.type === NodeType.Ident) {
				// CSS Modules: bare ident is a `@value` reference.
				urlNode = cv;
				continue;
			}
			break;
		}

		if (!layerNode && !supportsNode) {
			if (cv.type === NodeType.Ident) {
				if (equalsLowerCase(/** @type {Token} */ (cv).unescaped, "layer")) {
					layerNode = cv;
					continue;
				}
			} else if (
				cv.type === NodeType.Function &&
				equalsLowerCase(/** @type {FunctionNode} */ (cv).unescapedName, "layer")
			) {
				layerNode = cv;
				continue;
			}
		}

		if (
			!supportsNode &&
			cv.type === NodeType.Function &&
			equalsLowerCase(
				/** @type {FunctionNode} */ (cv).unescapedName,
				"supports"
			)
		) {
			supportsNode = /** @type {FunctionNode} */ (cv);
			continue;
		}

		// First media-query token — stop scanning for the prefix.
		break;
	}

	return { urlNode, layerNode, supportsNode };
};

/**
 * Recognize the request of an ICSS `:import("path")` prelude — the `import(…)` function's args, or the spaced `:import (…)` simple block. Pure — the caller emits the "expected string" warning from `errorPos`.
 * @param {AstNode} second the `import(…)` function / first prelude node after the `:`
 * @param {QualifiedRule} rule the `:import` rule
 * @param {string} source full CSS source, for the path slice
 * @returns {{ request: string } | { errorPos: number }} the unquoted request, or the position for the parse warning
 */
const parseIcssImportRequest = (second, rule, source) => {
	/** @type {AstNode[] | undefined} */
	let args;
	if (second.type === NodeType.Function) {
		args = /** @type {FunctionNode} */ (second).value;
	} else {
		for (const p of rule.prelude) {
			if (
				p.type === NodeType.SimpleBlock &&
				/** @type {SimpleBlock} */ (p).token === "("
			) {
				args = /** @type {SimpleBlock} */ (p).value;
				break;
			}
		}
	}
	// The first non-whitespace value inside `(...)` must be a string.
	const innerStrToken =
		args && args.find((v) => v.type !== NodeType.Whitespace);
	if (!innerStrToken || innerStrToken.type !== NodeType.String) {
		const errorPos =
			second.type === NodeType.Function
				? /** @type {FunctionNode} */ (second).nameEnd + 1
				: second.end;
		return { errorPos };
	}
	return {
		request: source.slice(innerStrToken.start + 1, innerStrToken.end - 1)
	};
};

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
			as: "stylesheet",
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

		// Per-parse comment side-array — kept local (like HtmlParser) so nothing is retained on the reused parser instance between modules.
		/** @type {Comment[]} */
		const comments = [];

		const module = state.module;

		// All `:export`-style exports are collected into a single
		// `CssIcssExportDependency` per module (emitted at parse end) instead of one
		// `Dependency` per export — far fewer retained objects on CSS-heavy builds.
		/** @type {import("../dependencies/CssIcssExportDependency").CssExportEntry[]} */
		const cssExportEntries = [];
		/**
		 * @param {number} sl start line
		 * @param {number} sc start column
		 * @param {number} el end line
		 * @param {number} ec end column
		 * @param {string} name export name
		 * @param {import("../dependencies/CssIcssExportDependency").Value} value value or [localName, importName, request?]
		 * @param {Range=} range source range to replace, when present
		 * @param {boolean=} interpolate whether the value needs interpolation
		 * @param {import("../dependencies/CssIcssExportDependency").ExportMode=} exportMode export mode
		 * @param {import("../dependencies/CssIcssExportDependency").ExportType=} exportType export type
		 * @returns {void}
		 */
		const addCssExport = (
			sl,
			sc,
			el,
			ec,
			name,
			value,
			range,
			interpolate = false,
			exportMode = CssIcssExportDependency.EXPORT_MODE.REPLACE,
			exportType = CssIcssExportDependency.EXPORT_TYPE.NORMAL
		) => {
			cssExportEntries.push({
				name,
				value,
				range,
				interpolate,
				exportMode,
				exportType,
				loc: { start: { line: sl, column: sc }, end: { line: el, column: ec } }
			});
		};

		const parsedModuleResource = parseResource(
			/** @type {string} */ (module.getResource())
		);

		const mode =
			this.defaultMode === "auto" &&
			module.type === CSS_MODULE_TYPE_AUTO &&
			IS_MODULES.test(parsedModuleResource.path)
				? "local"
				: this.defaultMode;

		const isModules = mode === "global" || mode === "local";

		/**
		 * Whether a relative `from "<request>"` resolves back to the current module (matching query/fragment too).
		 * @param {string} request request string from `from "<request>"`
		 * @returns {boolean} true if request resolves to the current module
		 */
		const isSelfReferenceRequest = (request) => {
			if (!RELATIVE_REQUEST.test(request)) return false;
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

		/** @type {CssModuleBuildMeta} */
		(module.buildMeta).isCssModule = isModules;
		if (/** @type {CssModule} */ (module).exportType === "style") {
			/** @type {CssModuleBuildMeta} */
			(module.buildMeta).needIdInConcatenation = true;
		}

		const locConverter = new LocConverter(source);

		/**
		 * Source location of a byte range. `LocConverter#get` mutates and returns itself, so snapshot between the two calls.
		 * @param {number} start start offset
		 * @param {number} end end offset
		 * @returns {{ start: Position, end: Position }} the source location
		 */
		const rangeLoc = (start, end) => {
			const s = locConverter.get(start);
			const sl = s.line;
			const sc = s.column;
			const e = locConverter.get(end);
			return {
				start: { line: sl, column: sc },
				end: { line: e.line, column: e.column }
			};
		};

		/**
		 * Set a dependency's source location from a byte range.
		 * @param {ConstDependency | CssUrlDependency | CssImportDependency | CssIcssImportDependency | CssIcssSymbolDependency} dep dependency with `setLoc`
		 * @param {number} start start offset
		 * @param {number} end end offset
		 */
		const setDepLoc = (dep, start, end) => {
			const s = locConverter.get(start);
			const sl = s.line;
			const sc = s.column;
			const e = locConverter.get(end);
			dep.setLoc(sl, sc, e.line, e.column);
		};

		/**
		 * Apply the magic comments in `range`: warn on any compilation error, validate `webpackIgnore`, and report whether the resource is ignored (so the caller skips emitting its dependency).
		 * @param {Range} range byte range to scan for magic comments
		 * @param {number} warnStart start offset of the loc for an invalid-`webpackIgnore` warning (computed lazily)
		 * @param {number} warnEnd end offset of that loc
		 * @returns {boolean} true when `webpackIgnore: true`
		 */
		const webpackIgnored = (range, warnStart, warnEnd) => {
			const { options, errors } = parseCommentOptions(range);
			if (errors) {
				for (const e of errors) {
					state.module.addWarning(
						new CommentCompilationWarning(
							`Compilation error while processing magic comment(-s): /*${e.comment.value}*/: ${e.message}`,
							rangeLoc(e.comment.range[0], e.comment.range[1])
						)
					);
				}
			}
			if (options && options.webpackIgnore !== undefined) {
				if (typeof options.webpackIgnore !== "boolean") {
					// Loc is computed lazily here — it's only needed for this rare
					// warning, not on every checked `url()` / `@import`.
					state.module.addWarning(
						new UnsupportedFeatureWarning(
							`\`webpackIgnore\` expected a boolean, but received: ${options.webpackIgnore}.`,
							rangeLoc(warnStart, warnEnd)
						)
					);
				} else {
					return options.webpackIgnore;
				}
			}
			return false;
		};

		// Closure-scope alias for `source` used by AST-walking helpers for substring extraction.
		const input = source;

		/**
		 * Unescape a CSS identifier from a source byte range — for value spans not
		 * backed by a single token (string contents, `--` dashed-ident bodies,
		 * composed names). Token-backed names use `node.unescaped` instead.
		 * @param {number} start start offset
		 * @param {number} end end offset
		 * @returns {string} the unescaped identifier
		 */
		const unescapeRange = (start, end) =>
			unescapeIdentifier(input.slice(start, end));

		let lastTokenEndForComments = 0;
		/** Generates unique `__ICSS_IMPORT_${n}__` placeholders per ICSS import. */
		const nextIcssImportName = (() => {
			let n = 0;
			return () => `__ICSS_IMPORT_${n++}__`;
		})();

		// All pure-mode state and helpers live on `pure`. When `pure.enabled` is false, the methods are no-ops, so callers can use them unconditionally.
		const pure = {
			enabled: isModules && Boolean(this.options.pure),
			/** Whether the current rule's prelude has so far seen any impure comma-separated selector (set by `finalizeSelector`). */
			ruleImpure: false,
			/** Whether the current comma-separated selector has carried a local class / id (cleared by `finalizeSelector`). */
			segmentLocal: false,
			/** File-level kill switch from a top-of-file `cssmodules-pure-no-check` comment. */
			noCheck: false,
			/** Single-shot ignore from a `cssmodules-pure-ignore` comment — consumed by the next rule frame. */
			ignorePending: false,
			/** Has any top-level rule been processed (locks `noCheck`)? */
			seenTopLevelRule: false,
			/**
			 * Inherited per open block: `ancestorHadLocal` (nested rules inherit purity from a local-bearing ancestor) and `skipChildren` (a check-suppressing ancestor like `@keyframes`).
			 * @type {{ ancestorHadLocal: boolean, skipChildren: boolean }[]}
			 */
			stack: [],
			/**
			 * Whether any ancestor (self inclusive) was pure — for ancestor-inheritance and `&`-resolution.
			 * @returns {boolean} true if any ancestor provided a local
			 */
			ancestorHadLocal() {
				const top = this.stack[this.stack.length - 1];
				return top ? top.ancestorHadLocal : false;
			},
			/**
			 * Record that the current comma-separated selector carries a local class / id (no-op when pure-mode is off).
			 */
			markLocal() {
				if (this.enabled) this.segmentLocal = true;
			},
			/**
			 * Close the current comma-separated selector segment (or whole prelude at `{`): if it had no local and no ancestor compensates, the rule is impure (no-op when pure-mode is off).
			 */
			finalizeSelector() {
				if (!this.enabled) return;
				if (!this.segmentLocal && !this.ancestorHadLocal()) {
					this.ruleImpure = true;
				}
				this.segmentLocal = false;
			},
			/**
			 * Mark that a top-level rule has been processed; locks `noCheck` (no-op when pure-mode is off).
			 */
			markSeenTopLevelRule() {
				if (this.enabled) this.seenTopLevelRule = true;
			},
			/**
			 * Report a pure-mode violation covering the entire rule prelude.
			 * @param {number} start prelude start offset
			 * @param {number} end prelude end offset (`{` position)
			 */
			report: (start, end) => {
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
			},
			/**
			 * Rule entry: report an impure leaf-ish rule (prelude purity is known, body already parsed), push the inherited-context frame, reset per-rule selector flags.
			 * @param {{ isRulePrelude: boolean, treatAsLeaf: boolean, ownSkip: boolean, declarations: Declaration[] | null, childRules: Rule[] | null, preludeStart: number, preludeEnd: number }} opts entry options
			 */
			enterBlock(opts) {
				if (!this.enabled) return;
				const {
					isRulePrelude,
					treatAsLeaf,
					ownSkip,
					declarations,
					childRules,
					preludeStart,
					preludeEnd
				} = opts;
				const top = this.stack[this.stack.length - 1];
				const skipOwn = top ? top.skipChildren : false;
				const reportable =
					!this.noCheck &&
					!this.ignorePending &&
					!skipOwn &&
					isRulePrelude &&
					this.ruleImpure;
				if (reportable) {
					const hasBody = Boolean(declarations || childRules);
					let leaf = treatAsLeaf || !hasBody;
					if (!leaf && hasBody) {
						const { hasDirectDecl, hasNestedBlock } = scanRuleBody({
							declarations,
							childRules
						});
						leaf = hasDirectDecl || !hasNestedBlock;
					}
					if (leaf) this.report(preludeStart, preludeEnd);
				}
				this.stack.push({
					ancestorHadLocal:
						this.ancestorHadLocal() || (isRulePrelude && !this.ruleImpure),
					skipChildren: ownSkip || skipOwn
				});
				this.ignorePending = false;
				this.segmentLocal = false;
				this.ruleImpure = false;
			},
			/**
			 * Drop the inherited-context frame (no-op when pure-mode is off).
			 */
			exitBlock() {
				if (this.enabled) this.stack.pop();
			},
			/**
			 * Apply a comment's pure-mode side effect: `ignorePending` for `cssmodules-pure-ignore`, or the file-level `noCheck` for `cssmodules-pure-no-check` before the first top-level rule.
			 * @param {string} value comment body (without the surrounding delimiters)
			 */
			applyComment(value) {
				if (PURE_IGNORE_RE.test(value)) {
					this.ignorePending = true;
				} else if (PURE_NO_CHECK_RE.test(value) && !this.seenTopLevelRule) {
					this.noCheck = true;
				}
			}
		};

		/** @typedef {{ value?: string, importName?: string, localName?: string, request?: string }} IcssDefinition */
		/** @type {Map<string, IcssDefinition>} */
		const icssDefinitions = new Map();

		// `composes: … from "<file>"` load-order graph (postcss-modules-extract-imports#138); topologically sorted at end-of-parse to tag each file's first composes-import with `sourceOrder`.
		/** @type {Map<string, Set<string>>} */
		const composesGraph = new Map();
		/** @type {Map<string, CssIcssImportDependency>} */
		const composesFirstFileImport = new Map();
		// Per-rule CSS-Modules state, saved on the rule's state stack at enter and restored at exit. `composesPrevFile` / `composesFiles` are only meaningful inside qualified rules (composes can't appear in at-rule preludes).
		const currentRule = {
			/** Did this rule's prelude declare a local-mode anchor selector? */
			hasLocalAnchor: false,
			/** Local class / id names in source order (composes reads `[0]` as the anchor). */
			/** @type {string[]} */
			localIdentifiers: [],
			/** Previous `composes: … from "…"` file in this rule (for the load-order graph edges). */
			/** @type {string | undefined} */
			composesPrevFile: undefined,
			/** All files this rule has composed from (so an edge is added only once per file pair); lazily created — null until the rule's first `composes: … from`. */
			/** @type {Set<string> | null} */
			composesFiles: null
		};

		/**
		 * Whether the module's default mode is local (callers here have no `:local`/`:global` wrapper in scope, so it reduces to the default mode).
		 * @returns {boolean} true when the module's default mode is `local`
		 */
		const isLocalMode = () => mode === "local";

		/**
		 * Effective local mode: persistent `:local`/`:global` from `modeData` if any, else the module's default.
		 * @returns {boolean} true when the effective mode is local
		 */
		const isEffectivelyLocal = () =>
			modeData ? modeData === "local" : mode === "local";

		/**
		 * Comment callback: push every comment-token (in source order) onto the local `comments`, read back by `advanceCommentCursor` (pure-mode flags) and `parseCommentOptions` (magic comments).
		 * @param {string} input input
		 * @param {number} start start
		 * @param {number} end end
		 * @returns {number} end
		 */
		const comment = (input, start, end) => {
			comments.push({
				value: input.slice(start + 2, end - 2),
				range: [start, end]
			});
			return end;
		};

		/**
		 * Advance past every comment closing at/before `until` (in source order) and apply its pure-mode side effect: `pure.ignorePending` (next rule) or the file-level `pure.noCheck` (only before the first top-level rule). The cursor is closed over so it isn't visible at parser scope.
		 * @returns {(until: number) => void} the cursor-advance function
		 */
		const advanceCommentCursor = (() => {
			let cursor = 0;
			/** @param {number} until source position to advance the cursor to */
			return (until) => {
				if (!pure.enabled) return;
				while (cursor < comments.length) {
					const c = comments[cursor];
					if (c.range[1] > until) return;
					pure.applyComment(c.value);
					cursor++;
				}
			};
		})();

		const magicCommentContext = this.magicCommentContext;

		/**
		 * Comments fully inside `range`, via binary search over the source-ordered `comments`.
		 * @param {Range} range range
		 * @returns {Comment[]} comments in the range
		 */
		const getComments = (range) => {
			// No comments: skip the binary search + result-array allocation (the common case — most CSS has no magic comments).
			if (comments.length === 0) return [];
			const [start, end] = range;
			let idx = binarySearchBounds.ge(comments, start, compareCommentStart);
			/** @type {Comment[]} */
			const commentsInRange = [];
			while (comments[idx] && comments[idx].range[1] <= end) {
				commentsInRange.push(comments[idx]);
				idx++;
			}
			return commentsInRange;
		};

		/**
		 * Parse webpack magic-comment options from any comment inside `range`.
		 * @param {Range} range range of the comment
		 * @returns {{ options: Record<string, EXPECTED_ANY> | null, errors: (Error & { comment: Comment })[] | null }} result
		 */
		const parseCommentOptions = (range) => {
			const found = getComments(range);
			if (found.length === 0) {
				return EMPTY_COMMENT_OPTIONS;
			}
			/** @type {Record<string, EXPECTED_ANY>} */
			const options = {};
			/** @type {(Error & { comment: Comment })[]} */
			const errors = [];
			for (const c of found) {
				const { value } = c;
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
								magicCommentContext
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
						const newErr = new Error(
							String(/** @type {Error} */ (err).message)
						);
						newErr.stack = String(/** @type {Error} */ (err).stack);
						Object.assign(newErr, { comment: c });
						errors.push(/** @type {(Error & { comment: Comment })} */ (newErr));
					}
				}
			}
			return { options, errors };
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
			// No `@value` / `:import` / composes definitions: skip the `--` key
			// concat + map probe (the common case for plain CSS-Modules files).
			const reexport =
				icssDefinitions.size === 0
					? undefined
					: icssDefinitions.get(isCustomProperty ? `--${value}` : value);

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
			/** @type {string | undefined} */
			let request;
			if (type === 0) {
				const parsed = parseIcssImportRequest(second, rule, source);
				if ("errorPos" in parsed) {
					const { errorPos } = parsed;
					this._emitWarning(
						state,
						`Unexpected '${source[errorPos]}' at ${errorPos} during parsing of ':import' (expected string)`,
						locConverter,
						errorPos,
						errorPos
					);
					return errorPos;
				}
				request = parsed.request;
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
					setDepLoc(dep, start, end);
					module.addDependency(dep);

					icssDefinitions.set(name, {
						importName: value,
						request: /** @type {string} */ (request)
					});
				} else if (type === 1) {
					const { line: sl, column: sc } = locConverter.get(start);
					const { line: el, column: ec } = locConverter.get(end);
					addCssExport(sl, sc, el, ec, name, getReexport(value));
				}
			};

			// Body `{ name: value; … }` is parsed eagerly (§5.4.4) — emit a dep per declaration.
			if (!rule.declarations || rule.blockStart === -1) return second.end;
			for (const decl of rule.declarations) {
				const vals = decl.value;
				if (vals.length === 0) continue;
				const rawStart = vals[0].start;
				const rawEnd = vals[vals.length - 1].end;
				createDep(
					source.slice(decl.nameStart, decl.nameEnd),
					source.slice(rawStart, rawEnd),
					decl.nameEnd,
					rawEnd
				);
			}

			return skipWhiteLine(source, rule.blockEnd);
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
			const isColon = input.charCodeAt(fn.start - 1) === CC_COLON;
			const openEnd = fn.nameEnd + 1;
			module.addPresentationalDependency(
				new ConstDependency("", [isColon ? fn.start - 1 : fn.start, openEnd])
			);

			if (type === 1) {
				for (const cv of fn.value) {
					if (cv.type !== NodeType.Ident) continue;
					let identifier = /** @type {Token} */ (cv).unescaped;
					const {
						start: { line: sl, column: sc },
						end: { line: el, column: ec }
					} = cv.loc;
					const isDashedIdent = isDashedIdentifier(identifier);
					if (isDashedIdent) identifier = identifier.slice(2);
					addCssExport(
						sl,
						sc,
						el,
						ec,
						identifier,
						getReexport(identifier),
						[cv.start, cv.end],
						true,
						CssIcssExportDependency.EXPORT_MODE.ONCE,
						isDashedIdent
							? CssIcssExportDependency.EXPORT_TYPE.CUSTOM_VARIABLE
							: CssIcssExportDependency.EXPORT_TYPE.NORMAL
					);
				}
			}

			// Replace the closing `)`.
			module.addPresentationalDependency(
				new ConstDependency("", [fn.end - 1, fn.end])
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
				if (cv.type === NodeType.Whitespace) continue;

				if (cv.type === NodeType.String) {
					if (!found && options.string) {
						const value = /** @type {Token} */ (cv).unescaped;
						const {
							start: { line: sl, column: sc },
							end: { line: el, column: ec }
						} = cv.loc;
						addCssExport(
							sl,
							sc,
							el,
							ec,
							value,
							value,
							[cv.start, cv.end],
							true,
							CssIcssExportDependency.EXPORT_MODE.ONCE
						);
						found = true;
						pure.markLocal();
					}
					continue;
				}

				if (cv.type === NodeType.Ident) {
					if (!found && options.identifier) {
						const identifier = /** @type {Token} */ (cv).unescaped;
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
						addCssExport(
							sl,
							sc,
							el,
							ec,
							identifier,
							getReexport(identifier),
							[cv.start, cv.end],
							true,
							CssIcssExportDependency.EXPORT_MODE.ONCE,
							CssIcssExportDependency.EXPORT_TYPE.NORMAL
						);
						found = true;
						pure.markLocal();
					}
					continue;
				}

				if (cv.type === NodeType.Function) {
					const fn = /** @type {FunctionNode} */ (cv);
					const fname = fn.unescapedName.toLowerCase();
					const type =
						fname === "local" ? 1 : fname === "global" ? 2 : undefined;
					if (!found && type) {
						found = true;
						if (type === 1) pure.markLocal();
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
		 * Emit the ICSS export declaring this module exports the given custom property.
		 * @param {number} identStart start of the `--<name>` ident
		 * @param {number} identEnd end of the ident (exclusive)
		 */
		const emitDashedIdentExport = (identStart, identEnd) => {
			const identifier = unescapeRange(identStart + 2, identEnd);
			const { line: sl, column: sc } = locConverter.get(identStart);
			const { line: el, column: ec } = locConverter.get(identEnd);
			addCssExport(
				sl,
				sc,
				el,
				ec,
				identifier,
				getReexport(identifier, undefined, true),
				[identStart, identEnd],
				true,
				CssIcssExportDependency.EXPORT_MODE.ONCE,
				CssIcssExportDependency.EXPORT_TYPE.CUSTOM_VARIABLE
			);
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
			const identifier = unescapeRange(identStart + 2, identEnd);
			const { line: sl, column: sc } = locConverter.get(identStart);
			const { line: el, column: ec } = locConverter.get(sourceEnd - 1);
			const localName = nextIcssImportName();

			const importDep = new CssIcssImportDependency(
				pathContent,
				[identStart, sourceEnd - 1],
				/** @type {"local" | "global"} */ (mode),
				identifier,
				localName
			);
			importDep.setLoc(sl, sc, el, ec);
			module.addDependency(importDep);

			addCssExport(
				sl,
				sc,
				el,
				ec,
				identifier,
				getReexport(identifier, localName, true),
				[identStart, sourceEnd - 1],
				true,
				CssIcssExportDependency.EXPORT_MODE.ONCE,
				CssIcssExportDependency.EXPORT_TYPE.CUSTOM_VARIABLE
			);

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
		// Per-`var()`/`style()` dashed-ident scan + dispatch. Warm path (custom-property-heavy CSS has thousands of these), so it dispatches inline rather than allocating a descriptor per call.
		const processDashedIdentInVarFunction = (fn) => {
			/** @type {Token | undefined} */
			let identNode;
			let identIdx = -1;
			for (let i = 0; i < fn.value.length; i++) {
				const cv = fn.value[i];
				if (cv.type === NodeType.Whitespace) continue;
				if (cv.type === NodeType.Ident) {
					identNode = /** @type {Token} */ (cv);
					identIdx = i;
				}
				break;
			}
			if (!identNode || !isDashedIdentifier(identNode.value)) return;

			const identStart = identNode.start;
			const identEnd = identNode.end;

			let j = identIdx + 1;
			while (j < fn.value.length && fn.value[j].type === NodeType.Whitespace) {
				j++;
			}

			if (
				j >= fn.value.length ||
				fn.value[j].type !== NodeType.Ident ||
				!equalsLowerCase(/** @type {Token} */ (fn.value[j]).value, "from")
			) {
				emitDashedIdentExport(identStart, identEnd);
				return;
			}

			const fromIdent = fn.value[j];
			j++;
			while (j < fn.value.length && fn.value[j].type === NodeType.Whitespace) {
				j++;
			}
			if (j >= fn.value.length) return;

			const source = fn.value[j];
			if (
				source.type === NodeType.Ident &&
				/** @type {Token} */ (source).value === "global"
			) {
				emitDashedIdentFromGlobal(identEnd, source.end);
				return;
			}
			if (source.type === NodeType.String) {
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
		 * The child list of an AST node (a function/block `value` or a rule `prelude`) for sibling lookahead.
		 * @param {AstNode | null} parent parent node
		 * @returns {AstNode[] | undefined} the child list, or undefined
		 */
		const childrenOf = (parent) => {
			if (!parent) return undefined;
			switch (parent.type) {
				case NodeType.Function:
					return /** @type {FunctionNode} */ (parent).value;
				case NodeType.SimpleBlock:
					return /** @type {SimpleBlock} */ (parent).value;
				case NodeType.Declaration:
					return /** @type {Declaration} */ (parent).value;
				case NodeType.AtRule:
				case NodeType.QualifiedRule:
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

		// Dashed-ident (custom-property) scoping state — mutated across function nesting (saved/restored via `dashed.stack`).
		const dashed = {
			/** Is dashed-ident scoping active in the current value context? */
			active: false,
			/** Should top-level dashed-ident exports be emitted at this nesting level? */
			emit: false,
			/** LIFO save/restore of `active` + `emit` across function nesting, bit-packed (bit 0 = active, bit 1 = emit) to avoid a per-function-token object allocation. */
			/** @type {number[]} */
			stack: [],
			/** Push the current scope; call before descending into a `Function` body. */
			push() {
				this.stack.push((this.active ? 1 : 0) | (this.emit ? 2 : 0));
			},
			/** Pop the saved scope; call when leaving a `Function` body. */
			pop() {
				const s = /** @type {number} */ (this.stack.pop());
				this.active = (s & 1) !== 0;
				this.emit = (s & 2) !== 0;
			}
		};
		// Nearest enclosing declaration / at-rule / qualified-rule, set by each structural enter; the Url / Function / Ident / Comma visitors read it (via `urlActive` / `localGlobalActive` / `icssActive`) to decide value handling from the node hierarchy instead of carrying precomputed flags.
		/** @type {AstNode | undefined} */
		let currentStructural;
		// Cached on each structural enter and read per value token, so the hot Function / Ident / Url visitors don't re-derive the property / at-rule name on every visit.
		let currentAtRuleName = "";
		/** Whether the current Declaration's property is a localizable known property. */
		let currentDeclIsKnownProperty = false;
		/** Whether the current `composes:` declaration owns the whole value (suppresses value rewrites). */
		let currentDeclComposesSkip = false;

		/**
		 * Per-at-rule scope frames; `exit` reads `hasBlock` to pick the block-cleanup vs `suppressNextRulePrelude` branch.
		 * @type {{ savedAnchor: boolean, savedLocalIdentifiers: string[], name: string, hasBlock: boolean, endsWithSemicolon: boolean }[]}
		 */
		const atRuleStateStack = [];

		/**
		 * Strip a bare `:local` / `:global` marker (modules only): the marker plus one adjacent whitespace (a comment between ends the run, since comments aren't AST nodes).
		 * @param {AstNode} colon the `:` node
		 * @param {AstNode} ident the `local` / `global` ident node
		 * @param {AstNode} after the node following the ident (may be `undefined` at runtime)
		 * @returns {boolean} whether whitespace follows the marker
		 */
		const stripBareMarker = (colon, ident, after) => {
			const afterIsWhitespace = Boolean(
				after && after.type === NodeType.Whitespace
			);
			const stripEnd =
				afterIsWhitespace && after.start === ident.end ? after.end : ident.end;
			if (isModules) {
				module.addPresentationalDependency(
					new ConstDependency("", [colon.start, stripEnd])
				);
			}
			return afterIsWhitespace;
		};

		/**
		 * Strip a `:local(…)` / `:global(…)` wrapper (modules only) with two source-level deps: the leading `:name(` up to the first arg, and the trailing `)` (`:local` also eats whitespace before it).
		 * @param {AstNode} colon the `:` node
		 * @param {FunctionNode} fn the `local(…)` / `global(…)` function node
		 * @param {boolean} isLocal whether the marker is `:local(`
		 * @returns {void}
		 */
		const stripFunctionMarker = (colon, fn, isLocal) => {
			if (!isModules) return;
			let stripLeadEnd = fn.end - 1;
			for (const arg of fn.value) {
				if (arg.type !== NodeType.Whitespace) {
					stripLeadEnd = arg.start;
					break;
				}
			}
			module.addPresentationalDependency(
				new ConstDependency("", [colon.start, stripLeadEnd])
			);
			let trailStart = fn.end - 1; // position of `)`
			if (isLocal) {
				while (
					trailStart > 0 &&
					isCssWhitespace(source.charCodeAt(trailStart - 1))
				) {
					trailStart--;
				}
			}
			module.addPresentationalDependency(
				new ConstDependency("", [trailStart, fn.end])
			);
		};

		/**
		 * Emit the ICSS export for an attribute selector `[class="foo"]` / `[class~="foo"]` (not a composes anchor) by walking the `[…]` block's parsed children. No-op for any other attribute shape.
		 * @param {SimpleBlock} block the `[…]` block
		 * @returns {void}
		 */
		const handleAttributeSelector = (block) => {
			const attrParts = block.value;
			let ai = 0;
			while (
				ai < attrParts.length &&
				attrParts[ai].type === NodeType.Whitespace
			) {
				ai++;
			}
			const attrNameNode = attrParts[ai];
			if (!attrNameNode || attrNameNode.type !== NodeType.Ident) return;
			const attrName = /** @type {Token} */ (attrNameNode).unescaped;
			if (!equalsLowerCase(attrName, "class")) return;
			ai++;
			while (
				ai < attrParts.length &&
				attrParts[ai].type === NodeType.Whitespace
			) {
				ai++;
			}
			// `=` or `~=` (two `Delim` tokens for the latter).
			const op1 = attrParts[ai];
			if (!op1 || op1.type !== NodeType.Delim) return;
			const op1v = /** @type {Token} */ (op1).value;
			if (op1v === "~") {
				ai++;
				const op2 = attrParts[ai];
				if (
					!op2 ||
					op2.type !== NodeType.Delim ||
					/** @type {Token} */ (op2).value !== "="
				) {
					return;
				}
			} else if (op1v !== "=") {
				return;
			}
			ai++;
			while (
				ai < attrParts.length &&
				attrParts[ai].type === NodeType.Whitespace
			) {
				ai++;
			}
			const attrValueNode = attrParts[ai];
			if (!attrValueNode) return;
			/** @type {number} */
			let classNameStart;
			/** @type {number} */
			let classNameEnd;
			if (attrValueNode.type === NodeType.String) {
				classNameStart = attrValueNode.start + 1;
				classNameEnd = attrValueNode.end - 1;
			} else if (attrValueNode.type === NodeType.Ident) {
				classNameStart = attrValueNode.start;
				classNameEnd = attrValueNode.end;
			} else {
				return;
			}
			const className = unescapeRange(classNameStart, classNameEnd);
			const { line: sl, column: sc } = locConverter.get(classNameStart);
			const { line: el, column: ec } = locConverter.get(classNameEnd);
			addCssExport(
				sl,
				sc,
				el,
				ec,
				className,
				getReexport(className),
				[classNameStart, classNameEnd],
				true,
				CssIcssExportDependency.EXPORT_MODE.NONE
			);
		};

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
				switch (v.type) {
					case NodeType.Whitespace:
						break;
					case NodeType.Comma:
						if (topLevel) {
							// Top-level comma resets the segment + persistent mode and, in pure mode, finalizes the segment's purity.
							segmentMode = localMode;
							modeData = undefined;
							pure.finalizeSelector();
						}
						break;
					case NodeType.Colon: {
						// Look ahead for `:local` / `:global` markers; other pseudos fall through.
						const next = values[i + 1];
						if (!next) break;
						if (next.type === NodeType.Ident) {
							const raw = /** @type {Token} */ (next).value;
							const isLocal = equalsLowerCase(raw, "local");
							if (isLocal || equalsLowerCase(raw, "global")) {
								const id = isLocal ? "local" : "global";
								// Bare `:local` / `:global`: switch the segment (and top-level persistent) mode and strip the marker.
								const afterIsWhitespace = stripBareMarker(
									v,
									next,
									values[i + 2]
								);
								// Bare `:local` / `:global` needs whitespace before the next selector (else `:local.b` is ambiguous) — warn when none follows.
								if (!afterIsWhitespace) {
									this._emitWarning(
										state,
										`Missing whitespace after ':${id}' in '${source.slice(
											v.start,
											findLeftCurly(source, next.end) + 1
										)}'`,
										locConverter,
										v.start,
										next.end
									);
								}
								segmentMode = id;
								if (topLevel) modeData = id;
								// Skip past the colon + ident.
								i += 1;
							}
						} else if (next.type === NodeType.Function) {
							const fn = /** @type {FunctionNode} */ (next);
							const rawName = fn.unescapedName;
							const isLocal = equalsLowerCase(rawName, "local");
							if (isLocal || equalsLowerCase(rawName, "global")) {
								// `:local(…)` / `:global(…)`: scope mode to the args and strip the `:name(` … `)` wrapper.
								stripFunctionMarker(v, fn, isLocal);
								walkSelectorList(fn.value, isLocal ? "local" : "global", false);
								// Skip past the colon + function.
								i += 1;
							}
						}
						break;
					}
					case NodeType.Function:
						// Any other function (`:not(…)`, `:is(…)`, …): recurse with the segment mode preserved (only `:local(…)` / `:global(…)`, handled above, switch mode).
						walkSelectorList(
							/** @type {FunctionNode} */ (v).value,
							segmentMode,
							false
						);
						break;
					case NodeType.Hash: {
						if (
							/** @type {HashToken} */ (v).typeFlag !== "id" ||
							segmentMode !== "local"
						) {
							break;
						}
						// ID selectors emit the ICSS export but aren't a `composes:` anchor.
						const idValueStart = v.start + 1;
						const idName = /** @type {Token} */ (v).unescaped;
						const {
							start: { line: idSl, column: idSc },
							end: { line: idEl, column: idEc }
						} = v.loc;
						addCssExport(
							idSl,
							idSc,
							idEl,
							idEc,
							idName,
							getReexport(idName),
							[idValueStart, v.end],
							true,
							CssIcssExportDependency.EXPORT_MODE.ONCE
						);
						pure.markLocal();
						break;
					}
					case NodeType.SimpleBlock: {
						const block = /** @type {SimpleBlock} */ (v);
						if (block.token === "[") {
							// Attribute selectors `[class="foo"]` localize only in local mode.
							if (segmentMode === "local") handleAttributeSelector(block);
						} else if (block.token === "(") {
							// `@scope (.foo)` and other parenthesised selector wrappers — recurse into the `(…)` block.
							walkSelectorList(block.value, segmentMode, false);
						}
						break;
					}
					case NodeType.Delim: {
						const delim = /** @type {Token} */ (v).value;
						if (delim === "&") {
							// Pure-mode: a nesting `&` inherits a pure ancestor's purity.
							if (topLevel && pure.ancestorHadLocal()) pure.markLocal();
							break;
						}
						if (delim !== ".") break;
						const next = values[i + 1];
						if (!next || next.type !== NodeType.Ident) break;
						if (segmentMode === "local") {
							// `.<ident>` in local mode is a class selector (dep covers the ident bytes only).
							const name = /** @type {Token} */ (next).unescaped;
							const {
								start: { line: sl, column: sc },
								end: { line: el, column: ec }
							} = next.loc;
							addCssExport(
								sl,
								sc,
								el,
								ec,
								name,
								getReexport(name),
								[next.start, next.end],
								true,
								CssIcssExportDependency.EXPORT_MODE.ONCE
							);
							currentRule.hasLocalAnchor = true;
							currentRule.localIdentifiers.push(name);
							pure.markLocal();
						} else {
							// `.<ident>` in global mode: not localized, but the ident may be `@value`-defined and need ICSS rewrite.
							const ident = /** @type {Token} */ (next).value;
							if (!isDashedIdentifier(ident) && icssDefinitions.has(ident)) {
								emitICSSSymbol(ident, next.start, next.end);
							}
						}
						// Skip the consumed ident.
						i += 1;
						break;
					}
					case NodeType.Ident: {
						// ICSS rewrite for a bare `@value`-defined ident used as a type-style selector.
						const ident = /** @type {Token} */ (v).value;
						if (!isDashedIdentifier(ident) && icssDefinitions.has(ident)) {
							emitICSSSymbol(ident, v.start, v.end);
						}
						break;
					}
					default:
						break;
				}
			}
			// Pure-mode: finalize the trailing comma-separated segment.
			if (topLevel) pure.finalizeSelector();
		};
		/**
		 * Per-qualified-rule scope frames; `{ bailed: true }` for inline-handled `:import` / `:export` pseudo-rules.
		 * @type {({ bailed: true } | { bailed: false, savedAnchor: boolean, savedLocalIdentifiers: string[], savedPrevComposesFile: string | undefined, savedComposesFiles: Set<string> | null })[]}
		 */
		const qualifiedRuleStateStack = [];

		/**
		 * Whether url() deps are emitted here (from `currentStructural`): false outside `options.url` and inside an `@import` prelude (the import target, unless url recovery is on).
		 * @returns {boolean} true when url() deps should be emitted
		 */
		const urlActive = () => {
			if (!this.options.url || !currentStructural) return false;
			if (currentStructural.type === NodeType.AtRule) {
				const at = /** @type {AtRule & { urlRecovery?: boolean }} */ (
					currentStructural
				);
				return !equalsLowerCase(at.name, "import") || Boolean(at.urlRecovery);
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
		 * Whether `local()` / `global()` value functions are rewritten to ICSS here (from `currentStructural`).
		 * @returns {boolean} true when the rewrite is active
		 */
		const localGlobalActive = () => {
			if (!isModules || !currentStructural) return false;
			if (currentStructural.type === NodeType.AtRule) {
				return !isLocalHandledAtRule(currentAtRuleName);
			}
			if (currentStructural.type === NodeType.Declaration) {
				return !currentDeclComposesSkip;
			}
			return false;
		};

		/**
		 * Whether `@value`-defined idents / function names are ICSS-rewritten here (from `currentStructural`).
		 * @returns {boolean} true when the rewrite is active
		 */
		const icssActive = () => {
			if (!isModules || !currentStructural) return false;
			if (currentStructural.type === NodeType.AtRule) {
				return (
					currentAtRuleName !== "@value" && currentAtRuleName !== "@import"
				);
			}
			if (currentStructural.type === NodeType.Declaration) {
				return !currentDeclComposesSkip && !currentDeclIsKnownProperty;
			}
			return false;
		};

		/**
		 * Post-rule top-level reset shared by AtRule and QualifiedRule exit: lock `@import` (block-bearing only locks for at-rules), mark seen-top-level for pure-mode, and clear the persistent `:local`/`:global` override.
		 * @param {AstNode} node the rule node
		 * @param {boolean} blockBearing whether to require a body before locking `allowImport` (true for at-rules, ignored for QRs which always have a body)
		 * @returns {void}
		 */
		const finishTopLevelRule = (node, blockBearing) => {
			const at = /** @type {AtRule} */ (node);
			if (!blockBearing || at.declarations || at.childRules) {
				allowImport = false;
			}
			pure.markSeenTopLevelRule();
			modeData = undefined;
		};

		/**
		 * Emit the ICSS export/import deps for one parsed `composes:` group onto `lastLocalIdentifier`: `from "<file>"` imports each name (tracking file load order), `from global` and bare names re-export locally. The caller has already validated and scanned the group.
		 * @param {{ start: number, end: number, isGlobal: boolean }[]} classNames composed names with source ranges
		 * @param {{ kind: "string", path: string } | { kind: "global" } | undefined} fromSource the `from …` clause, if any
		 * @param {string} lastLocalIdentifier the rule's single local-class anchor
		 * @returns {void}
		 */
		const emitComposesGroup = (classNames, fromSource, lastLocalIdentifier) => {
			if (fromSource && fromSource.kind === "string") {
				const request = fromSource.path;
				const selfReference = isSelfReferenceRequest(request);

				if (!selfReference) {
					let files = currentRule.composesFiles;
					if (!files) {
						files = new Set();
						currentRule.composesFiles = files;
					}
					if (!files.has(request)) {
						files.add(request);
						if (
							currentRule.composesPrevFile !== undefined &&
							currentRule.composesPrevFile !== request
						) {
							let successors = composesGraph.get(currentRule.composesPrevFile);
							if (!successors) {
								successors = new Set();
								composesGraph.set(currentRule.composesPrevFile, successors);
							}
							successors.add(request);
						}
						currentRule.composesPrevFile = request;
					}
				}

				for (const { start, end } of classNames) {
					const identifier = unescapeRange(start, end);
					const { line: sl, column: sc } = locConverter.get(start);
					const { line: el, column: ec } = locConverter.get(end);

					if (selfReference) {
						if (identifier === lastLocalIdentifier) continue;
						addCssExport(
							sl,
							sc,
							el,
							ec,
							lastLocalIdentifier,
							getReexport(identifier),
							[start, end],
							true,
							CssIcssExportDependency.EXPORT_MODE.SELF_REFERENCE,
							CssIcssExportDependency.EXPORT_TYPE.COMPOSES
						);
						continue;
					}

					const localName = nextIcssImportName();

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

					addCssExport(
						sl,
						sc,
						el,
						ec,
						lastLocalIdentifier,
						getReexport(identifier, localName),
						[start, end],
						true,
						CssIcssExportDependency.EXPORT_MODE.APPEND,
						CssIcssExportDependency.EXPORT_TYPE.COMPOSES
					);
				}
			} else if (fromSource && fromSource.kind === "global") {
				for (const { start, end } of classNames) {
					const identifier = unescapeRange(start, end);
					const { line: sl, column: sc } = locConverter.get(start);
					const { line: el, column: ec } = locConverter.get(end);
					addCssExport(
						sl,
						sc,
						el,
						ec,
						lastLocalIdentifier,
						getReexport(identifier),
						[start, end],
						false,
						CssIcssExportDependency.EXPORT_MODE.APPEND,
						CssIcssExportDependency.EXPORT_TYPE.COMPOSES
					);
				}
			} else {
				for (const { start, end, isGlobal } of classNames) {
					const identifier = unescapeRange(start, end);
					const { line: sl, column: sc } = locConverter.get(start);
					const { line: el, column: ec } = locConverter.get(end);
					addCssExport(
						sl,
						sc,
						el,
						ec,
						lastLocalIdentifier,
						getReexport(identifier),
						[start, end],
						!isGlobal,
						isGlobal
							? CssIcssExportDependency.EXPORT_MODE.APPEND
							: CssIcssExportDependency.EXPORT_MODE.SELF_REFERENCE,
						CssIcssExportDependency.EXPORT_TYPE.COMPOSES
					);
				}
			}
		};

		/**
		 * Emit the ICSS deps + presentational strip for a `composes: …` declaration whose rule has a single local-class anchor (the strip-dep covers the whole declaration).
		 * @param {Declaration} decl the `composes` declaration
		 */
		const emitComposesWithAnchor = (decl) => {
			if (currentRule.localIdentifiers.length > 1) {
				this._emitWarning(
					state,
					`Composition is only allowed when selector is single local class name not in "${currentRule.localIdentifiers.join(
						'", "'
					)}"`,
					locConverter,
					decl.start,
					decl.end
				);
				return;
			}
			const lastLocalIdentifier = currentRule.localIdentifiers[0];

			// Split the value at top-level commas — each segment is one `<name>+ [from <source>]` group.
			/** @type {AstNode[][]} */
			const groups = [];
			/** @type {AstNode[]} */
			let currentGroup = [];
			for (const cv of decl.value) {
				if (cv.type === NodeType.Comma) {
					groups.push(currentGroup);
					currentGroup = [];
				} else {
					currentGroup.push(cv);
				}
			}
			groups.push(currentGroup);

			// Inline scan + dispatch per group — warm path (composes-heavy modules), so no per-group result object is allocated.
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
					if (cv.type === NodeType.Whitespace) continue;

					if (phase === "expecting-source") {
						if (cv.type === NodeType.String) {
							fromSource = {
								kind: "string",
								path: source.slice(cv.start + 1, cv.end - 1)
							};
							phase = "done";
							continue;
						}
						if (
							cv.type === NodeType.Ident &&
							equalsLowerCase(/** @type {Token} */ (cv).value, "global")
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

					if (cv.type === NodeType.Ident) {
						const identValue = /** @type {Token} */ (cv).value;
						if (
							equalsLowerCase(identValue, "from") &&
							classNames.length > 0 &&
							nextNonWhitespace(group, i + 1) < group.length
						) {
							phase = "expecting-source";
							continue;
						}
						classNames.push({
							start: cv.start,
							end: cv.end,
							isGlobal: false
						});
						continue;
					}

					if (cv.type === NodeType.Function) {
						const fn = /** @type {FunctionNode} */ (cv);
						const isGlobal = equalsLowerCase(fn.unescapedName, "global");
						for (const inner of fn.value) {
							if (inner.type === NodeType.Ident) {
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

				emitComposesGroup(classNames, fromSource, lastLocalIdentifier);
			}

			// Strip the whole `composes: …;` (property name included) plus trailing same-line whitespace. The `;` and that whitespace aren't AST nodes (a block's contents drop them), so scan the source here.
			let resumeAt = decl.end;
			if (source.charCodeAt(decl.end) === CC_SEMICOLON) {
				resumeAt = decl.end + 1;
				while (isCssWhitespace(source.charCodeAt(resumeAt))) resumeAt++;
			}
			module.addPresentationalDependency(
				new ConstDependency("", [decl.nameStart, resumeAt])
			);
		};

		/**
		 * Emit url() deps for a `url(...)` / `src(...)` / `image-set(...)` value function.
		 * @param {FunctionNode} fn the function node
		 * @param {string} fname the function name, lower-cased
		 */
		const emitUrlFunction = (fn, fname) => {
			if (fname === "url" || fname === "src") {
				// Quoted `url("…")` / `src("…")`: first non-whitespace value must be the string token.
				const first = fn.value[nextNonWhitespace(fn.value, 0)];
				if (!first || first.type !== NodeType.String) return;
				const string = /** @type {Token} */ (first);
				if (
					webpackIgnored(
						[lastTokenEndForComments, fn.start],
						string.start,
						string.end
					)
				) {
					return;
				}
				const value = normalizeUrl(
					input.slice(string.start + 1, string.end - 1),
					true
				);
				// Ignore `url()`, `url('')` and `url("")`, they are valid by spec
				if (value.length === 0) return;
				const dep = new CssUrlDependency(
					value,
					[string.start, string.end],
					"string"
				);
				setDepLoc(dep, string.start, string.end);
				module.addDependency(dep);
				module.addCodeGenerationDependency(dep);
			} else if (IMAGE_SET_FUNCTION.test(fname)) {
				// `image-set(…)`: each comma segment's first string is the URL; advance the magic-comment fence per string.
				lastTokenEndForComments = fn.nameEnd + 1;
				let prevStringEnd = fn.start;
				let firstInSegment = true;
				for (const cv of fn.value) {
					if (cv.type === NodeType.Comma) {
						firstInSegment = true;
						continue;
					}
					if (cv.type === NodeType.Whitespace) continue;
					const wasFirst = firstInSegment;
					firstInSegment = false;
					if (!wasFirst || cv.type !== NodeType.String) continue;
					const string = /** @type {Token} */ (cv);
					const start = prevStringEnd;
					prevStringEnd = string.end;
					const value = normalizeUrl(
						input.slice(string.start + 1, string.end - 1),
						true
					);
					if (value.length === 0) continue;
					if (webpackIgnored([start, string.end], string.start, string.end)) {
						continue;
					}
					const dep = new CssUrlDependency(
						value,
						[string.start, string.end],
						"url"
					);
					setDepLoc(dep, string.start, string.end);
					module.addDependency(dep);
					module.addCodeGenerationDependency(dep);
				}
			}
		};

		/**
		 * Handle an `@import` at-rule: parse its prelude (url, layer, supports, media), emit the `CssImportDependency`, and warn on malformed forms.
		 * @param {AtRule} at the `@import` at-rule
		 * @param {boolean} topLevel whether the rule is at the stylesheet top level
		 */
		const handleImportAtRule = (at, topLevel) => {
			if (!this.options.import) return;
			if (!topLevel || !allowImport) {
				this._emitWarning(
					state,
					"Any '@import' rules must precede all other rules",
					locConverter,
					at.start,
					at.nameEnd
				);
				return;
			}
			const importStart = at.start;
			const importNameEnd = at.nameEnd;
			// We only accept `;`-terminated @import; block / EOF / `}` ends are silent bails.
			if (source.charCodeAt(at.end) !== CC_SEMICOLON) return;

			// Walk the prelude in spec order (URL → layer? → supports? → media query); anything else joins the media query.
			const { urlNode, layerNode, supportsNode } = parseImportPrelude(
				at.prelude
			);

			const semi = at.end + 1; // position past `;`

			if (!urlNode || (urlNode.type === NodeType.Ident && !isModules)) {
				this._emitWarning(
					state,
					`Expected URL in '${input.slice(importStart, semi)}'`,
					locConverter,
					importStart,
					semi
				);
				// A malformed `@import` still emits orphan url() deps from its prelude — flag the node so the value visitors enable url().
				/** @type {AtRule & { urlRecovery?: boolean }} */ (at).urlRecovery =
					true;
				return;
			}

			/** @type {string} */
			let url;
			if (urlNode.type === NodeType.Ident) {
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
					return;
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
					return;
				}
				const raw = def.value.trim();
				url =
					(raw.startsWith('"') && raw.endsWith('"')) ||
					(raw.startsWith("'") && raw.endsWith("'"))
						? normalizeUrl(raw.slice(1, -1), true)
						: normalizeUrl(raw, false);
			} else if (urlNode.type === NodeType.Url) {
				const ut = /** @type {UrlToken} */ (urlNode);
				url = normalizeUrl(input.slice(ut.contentStart, ut.contentEnd), false);
			} else if (urlNode.type === NodeType.String) {
				url = normalizeUrl(
					input.slice(urlNode.start + 1, urlNode.end - 1),
					true
				);
			} else {
				// url(...) function — first non-whitespace child is the string.
				/** @type {Token | undefined} */
				let string;
				for (const inner of /** @type {FunctionNode} */ (urlNode).value) {
					if (inner.type === NodeType.Whitespace) continue;
					if (inner.type === NodeType.String) {
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
					return;
				}
				url = normalizeUrl(input.slice(string.start + 1, string.end - 1), true);
			}

			const newline = skipWhiteLine(input, semi);
			if (webpackIgnored([importNameEnd, urlNode.end], importStart, newline)) {
				return;
			}
			if (url.length === 0) {
				const dep = new ConstDependency("", [importStart, newline]);
				module.addPresentationalDependency(dep);
				setDepLoc(dep, importStart, newline);

				return;
			}

			/** @type {undefined | string} */
			let layer;
			if (layerNode) {
				if (layerNode.type === NodeType.Function) {
					// `layer(<ident>)` — extract content between `(` and `)`.
					const fn = /** @type {FunctionNode} */ (layerNode);
					layer = input.slice(fn.nameEnd + 1, fn.end - 1).trim();
				} else {
					// Bare `layer` ident — anonymous layer.
					layer = "";
				}
			}

			/** @type {undefined | string} */
			let supports;
			if (supportsNode) {
				supports = input
					.slice(supportsNode.nameEnd + 1, supportsNode.end - 1)
					.trim();
			}

			// Media query = whatever sits between the last url/layer/supports part and the closing `;`, trimmed. Start at the next non-whitespace prelude node (skips the gap, comments included).
			const lastPrefixPart = supportsNode || layerNode || urlNode;
			const afterIdx =
				/** @type {AstNode[]} */ (at.prelude).indexOf(lastPrefixPart) + 1;
			const nextIdx = nextNonWhitespace(at.prelude, afterIdx);
			const mediaStart =
				nextIdx < at.prelude.length ? at.prelude[nextIdx].start : at.end;
			/** @type {undefined | string} */
			let media;
			if (mediaStart !== at.end) {
				media = input.slice(mediaStart, at.end).trim();
			}

			const { line: sl, column: sc } = locConverter.get(importStart);
			const { line: el, column: ec } = locConverter.get(newline);
			const parent = /** @type {CssModule} */ (module);
			// Carry the importing module's layer/supports/media chain onto the dep so a nested `@import` inherits it.
			/** @type {Inheritance | undefined} */
			let inheritance;
			if (parent.cssLayer !== undefined || parent.supports || parent.media) {
				inheritance = [[parent.cssLayer, parent.supports, parent.media]];
			}
			if (parent.inheritance) {
				if (!inheritance) inheritance = [];
				inheritance.push(...parent.inheritance);
			}
			const dep = new CssImportDependency(
				url,
				[importStart, newline],
				mode === "local" || mode === "global" ? mode : undefined,
				layer,
				supports && supports.length > 0 ? supports : undefined,
				media && media.length > 0 ? media : undefined,
				inheritance,
				parent.exportType
			);
			dep.setLoc(sl, sc, el, ec);
			module.addDependency(dep);
			// `text` / `css-style-sheet` parents inline the import at build time, so order it via a code-generation dependency.
			if (
				parent.exportType === "text" ||
				parent.exportType === "css-style-sheet"
			) {
				module.addCodeGenerationDependency(dep);
			}
		};

		/**
		 * Handle a CSS-Modules `@value` at-rule: register the local / imported value(s) in `icssDefinitions`, emit the import + export deps, and strip the rule.
		 * @param {AtRule} at the `@value` at-rule
		 */
		const handleValueAtRule = (at) => {
			const start = at.start;
			const nameEnd = at.nameEnd;
			const semi = at.end;
			const atRuleEnd =
				source.charCodeAt(semi) === CC_SEMICOLON ? semi + 1 : semi;
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
					return;
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
						setDepLoc(dep, start, nameEnd);
						module.addDependency(dep);

						icssDefinitions.set(localName, {
							importName,
							request: from
						});
					}

					{
						const { line: sl, column: sc } = locConverter.get(start);
						const { line: el, column: ec } = locConverter.get(nameEnd);
						addCssExport(
							sl,
							sc,
							el,
							ec,
							localName,
							getReexport(localName),
							undefined,
							false,
							CssIcssExportDependency.EXPORT_MODE.REPLACE
						);
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
					return;
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

					addCssExport(sl, sc, el, ec, localName, getReexport(value));
				} else {
					icssDefinitions.set(localName, { value });

					addCssExport(sl, sc, el, ec, localName, value);
				}
			}

			const dep = new ConstDependency("", [start, atRuleEnd]);
			module.addPresentationalDependency(dep);
		};

		/**
		 * Export the localizable idents / strings in a known property's value (`animation-name: foo`, grid line-names / template-areas, …). Top-level only, except `grid-template` recurses into `repeat(…)` and `[line-name]` blocks.
		 * @param {Declaration} decl the declaration
		 * @param {string} declPropertyName the vendor-stripped, lower-cased property name
		 * @returns {void}
		 */
		const emitKnownPropertyExports = (decl, declPropertyName) => {
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
			/**
			 * Emit the ICSS export for one collected name span (a quoted string drops its delimiters). Called inline during the walk so no intermediate `values` array / per-name tuples are allocated.
			 * @param {number} start name start offset
			 * @param {number} end name end offset
			 * @param {boolean=} isString whether the span is a quoted string
			 * @returns {void}
			 */
			const emit = (start, end, isString) => {
				const { line: sl, column: sc } = locConverter.get(start);
				const { line: el, column: ec } = locConverter.get(end);
				const name = unescapeRange(
					isString ? start + 1 : start,
					isString ? end - 1 : end
				);
				addCssExport(
					sl,
					sc,
					el,
					ec,
					name,
					getReexport(name),
					[start, end],
					true,
					CssIcssExportDependency.EXPORT_MODE.ONCE,
					isGridProperty
						? CssIcssExportDependency.EXPORT_TYPE.GRID_CUSTOM_IDENTIFIER
						: CssIcssExportDependency.EXPORT_TYPE.NORMAL
				);
			};
			// Collect idents/strings to export — top-level only, except grid-template recurses (`[line-name]` blocks live in `repeat(…)`).
			/** @type {(cvs: AstNode[]) => void} */
			const walkExports = (cvs) => {
				for (const cv of cvs) {
					switch (cv.type) {
						case NodeType.Comma:
							parsedKeywords = Object.create(null);
							break;
						case NodeType.Delim:
							afterExclamation = /** @type {Token} */ (cv).value === "!";
							break;
						case NodeType.Ident: {
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
							emit(cv.start, cv.end);
							break;
						}
						case NodeType.String: {
							if (
								declPropertyName === "animation" ||
								declPropertyName === "animation-name"
							) {
								emit(cv.start, cv.end, true);
							}
							if (
								declPropertyName === "grid" ||
								declPropertyName === "grid-template" ||
								declPropertyName === "grid-template-areas"
							) {
								const areas = /** @type {Token} */ (cv).unescaped;
								const matches = matchAll(/\b\w+\b/g, areas);
								for (const match of matches) {
									const areaStart = cv.start + 1 + match.index;
									emit(areaStart, areaStart + match[0].length, false);
								}
							}
							break;
						}
						case NodeType.SimpleBlock: {
							const block = /** @type {SimpleBlock} */ (cv);
							if (block.token === "[") {
								// Collect identifiers until the first non-ident token (`<line-names> = '[' <custom-ident>* ']'`).
								for (const inner of block.value) {
									if (inner.type === NodeType.Whitespace) continue;
									if (inner.type !== NodeType.Ident) break;
									emit(inner.start, inner.end);
								}
							} else if (isGridTemplate) {
								walkExports(block.value);
							}
							break;
						}
						case NodeType.Function:
							if (isGridTemplate) {
								walkExports(/** @type {FunctionNode} */ (cv).value);
							}
							break;
						// Other types carry no ICSS-export information.
					}
				}
			};
			walkExports(decl.value);
		};

		/**
		 * Pure-mode: mark the at-rule local when its prelude names a local `@keyframes` / `@counter-style` / `@container` identifier (or a `:local(…)` function), so the rule isn't flagged impure. `@container` ignores the `none`/`and`/`or`/`not` keywords.
		 * @param {AtRule} at the at-rule
		 * @param {boolean} isKeyframes whether it's `@keyframes`
		 * @param {boolean} isCounterStyle whether it's `@counter-style`
		 * @param {boolean} isContainer whether it's `@container`
		 * @returns {void}
		 */
		const markPureFromAtRulePrelude = (
			at,
			isKeyframes,
			isCounterStyle,
			isContainer
		) => {
			const acceptIdent = isKeyframes || isCounterStyle || isContainer;
			const acceptString = isKeyframes;
			for (const cv of at.prelude) {
				if (cv.type === NodeType.Whitespace) continue;
				if (cv.type === NodeType.String) {
					if (acceptString) pure.markLocal();
					break;
				}
				if (cv.type === NodeType.Ident) {
					if (!acceptIdent) break;
					if (isContainer && isContainerKeyword(source, cv.start, cv.end)) {
						continue;
					}
					pure.markLocal();
					break;
				}
				if (cv.type === NodeType.Function) {
					if (
						equalsLowerCase(
							/** @type {FunctionNode} */ (cv).unescapedName,
							"local"
						)
					) {
						pure.markLocal();
					}
					break;
				}
			}
		};

		// Drive the walk through SourceProcessor: structural enter / exit map to the `walkAst…Enter` / `…Exit` halves; value visitors handle url / ICSS / local-global.
		/** @type {VisitorMap} */
		const visitors = {
			[NodeType.AtRule]: {
				// At-rule enter: scope save, name dispatch, prelude value context, pure-block push.
				enter: (node, parent) => {
					const at = /** @type {AtRule} */ (node);
					const topLevel = parent === null;
					advanceCommentCursor(at.start);
					const savedAnchor = currentRule.hasLocalAnchor;
					const savedLocalIdentifiers = currentRule.localIdentifiers;
					// Only modules-mode walks mutate `localIdentifiers`; otherwise share
					// the (empty) parent list instead of copying it per rule.
					currentRule.localIdentifiers = isModules
						? [...savedLocalIdentifiers]
						: savedLocalIdentifiers;
					const name = `@${at.name.toLowerCase()}`;
					switch (name) {
						case "@namespace": {
							this._emitWarning(
								state,
								"'@namespace' is not supported in bundled CSS",
								locConverter,
								at.start,
								at.nameEnd
							);
							break;
						}
						case "@charset": {
							if (/** @type {CssModule} */ (module).exportType !== "style") {
								const atRuleEnd =
									source.charCodeAt(at.end) === CC_SEMICOLON
										? at.end + 1
										: at.end;
								const dep = new ConstDependency("", [at.start, atRuleEnd]);
								module.addPresentationalDependency(dep);
								const string = at.prelude.find(
									(v) => v.type !== NodeType.Whitespace
								);
								if (string && string.type === NodeType.String) {
									/** @type {CssModuleBuildInfo} */
									(module.buildInfo).charset = source
										.slice(string.start + 1, string.end - 1)
										.toUpperCase();
								}
							}
							break;
						}
						case "@import": {
							handleImportAtRule(at, topLevel);
							break;
						}
						default: {
							if (!isModules) break;
							if (name === "@value") {
								handleValueAtRule(at);
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
						equalsLowerCase(at.name, "scope") &&
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
					const effectiveLocalMode = isEffectivelyLocal();
					const isProcessedByLocalAtRule = isLocalHandledAtRule(name);
					currentStructural = at;
					currentAtRuleName = name;
					dashed.active = false;
					// `@import` url() is the import target — only walk its prelude for url deps on malformed-import recovery (flagged on the node).
					const atWithRecovery =
						/** @type {AtRule & { urlRecovery?: boolean }} */ (at);
					if (
						this.options.url &&
						(name !== "@import" || atWithRecovery.urlRecovery)
					) {
						lastTokenEndForComments = at.nameEnd;
					}
					// Dashed-ident scoping over the prelude (the Ident / Function visitors emit).
					dashed.active = Boolean(
						this.options.dashedIdents &&
						isModules &&
						!isProcessedByLocalAtRule &&
						effectiveLocalMode
					);
					dashed.emit = dashed.active;

					// Pure-mode: `@keyframes` / `@counter-style` / `@container` bodies are marked skip / treat-as-leaf.
					let atSkipChildren = false;
					let atTreatAsLeaf = false;
					const isKeyframes =
						OPTIONALLY_VENDOR_PREFIXED_KEYFRAMES_AT_RULE.test(name);
					const isCounterStyle = name === "@counter-style";
					const isContainer = name === "@container";
					if (
						pure.enabled &&
						isModules &&
						isLocalMode() &&
						(isKeyframes || isCounterStyle || isContainer)
					) {
						if (isKeyframes || isCounterStyle) {
							atSkipChildren = true;
							atTreatAsLeaf = true;
						}
						markPureFromAtRulePrelude(
							at,
							isKeyframes,
							isCounterStyle,
							isContainer
						);
					}

					// pure.stack push for block-bearing at-rules.
					const atHasBlock = Boolean(at.declarations || at.childRules);
					if (atHasBlock && at.blockStart !== -1) {
						const isAtRulePrelude = isPureBodyAtRule(name);
						if (isAtRulePrelude) pure.finalizeSelector();
						pure.enterBlock({
							isRulePrelude: isAtRulePrelude,
							treatAsLeaf: atTreatAsLeaf,
							ownSkip: atSkipChildren,
							declarations: at.declarations,
							childRules: at.childRules,
							preludeStart: at.start,
							preludeEnd: at.blockStart
						});
					}

					atRuleStateStack.push({
						savedAnchor,
						savedLocalIdentifiers,
						name,
						hasBlock: atHasBlock,
						endsWithSemicolon: source.charCodeAt(at.end) === CC_SEMICOLON
					});
				},
				// At-rule exit: pure-frame finalization, `suppressNextRulePrelude`, scope restore, top-level reset.
				exit: (node, parent) => {
					const state = atRuleStateStack.pop();
					if (!state) return;
					if (state.hasBlock) {
						pure.exitBlock();
					} else if (
						isModules &&
						state.endsWithSemicolon &&
						!isLocalHandledAtRule(state.name)
					) {
						// An unrecognized `;`-terminated at-rule: treat the next sibling's selectors as global.
						suppressNextRulePrelude = true;
					}
					currentRule.hasLocalAnchor = state.savedAnchor;
					currentRule.localIdentifiers = state.savedLocalIdentifiers;
					if (parent === null) finishTopLevelRule(node, true);
				}
			},
			[NodeType.QualifiedRule]: {
				// Qualified-rule enter: scope setup, selector + prelude context, pure-block push; `:import` / `:export` bail via `ctx.skipChildren()`.
				enter: (node, parent, ctx) => {
					const rule = /** @type {QualifiedRule} */ (node);
					const topLevel = parent === null;
					advanceCommentCursor(rule.start);
					// `:import(…) { … }` / `:export { … }` ICSS pseudo-rules are processed inline at top level; nested ones bail out.
					if (isModules) {
						const firstIdx = nextNonWhitespace(rule.prelude, 0);
						if (
							firstIdx + 1 < rule.prelude.length &&
							rule.prelude[firstIdx].type === NodeType.Colon
						) {
							const second = rule.prelude[firstIdx + 1];
							const rawName =
								second.type === NodeType.Ident
									? /** @type {Token} */ (second).value
									: second.type === NodeType.Function
										? /** @type {FunctionNode} */ (second).name
										: "";
							const isImport = equalsLowerCase(rawName, "import");
							if (isImport || equalsLowerCase(rawName, "export")) {
								if (topLevel) {
									const startColon = rule.prelude[firstIdx].start;
									const endAfterBody = processImportOrExport(
										isImport ? 0 : 1,
										second,
										rule
									);
									module.addPresentationalDependency(
										new ConstDependency("", [startColon, endAfterBody])
									);
									if (rule.blockStart !== -1) rule.blockEnd = endAfterBody;
									rule.end = endAfterBody;
								} else if (rule.blockStart !== -1) {
									// Nested `:import` / `:export` — leave the body alone.
									rule.end = rule.blockEnd;
								}
								// Don't recurse into the body — handled inline above.
								if (ctx) ctx.skipChildren();
								qualifiedRuleStateStack.push({ bailed: true });
								return;
							}
						}
					}
					// Reset the anchor flag for this rule's body, inheriting (copying) the parent's identifier list so nested `composes:` sees both parent and child class names.
					const savedAnchor = currentRule.hasLocalAnchor;
					const savedLocalIdentifiers = currentRule.localIdentifiers;
					currentRule.hasLocalAnchor = false;
					// Only modules-mode walks mutate `localIdentifiers`; otherwise share the (empty) parent list instead of copying it per rule.
					currentRule.localIdentifiers = isModules
						? [...savedLocalIdentifiers]
						: savedLocalIdentifiers;
					// Composes-state reset between rules (saved / restored around this rule); composesFiles is swapped out and re-created lazily only if this rule composes.
					const savedPrevComposesFile = currentRule.composesPrevFile;
					const savedComposesFiles = currentRule.composesFiles;
					currentRule.composesPrevFile = undefined;
					currentRule.composesFiles = null;
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
					dashed.active = false;
					dashed.emit = false;
					if (this.options.url && rule.prelude.length > 0) {
						lastTokenEndForComments = rule.prelude[0].start;
					}
					// Dashed-ident scoping for the deprecated `--foo: { … }` custom-property-set syntax (prelude starts with a dashed-ident).
					if (
						this.options.dashedIdents &&
						isModules &&
						rule.prelude.length > 0
					) {
						const first = rule.prelude[nextNonWhitespace(rule.prelude, 0)];
						if (
							first &&
							first.type === NodeType.Ident &&
							isDashedIdentifier(/** @type {Token} */ (first).value)
						) {
							const effectiveLocalMode = isEffectivelyLocal();
							if (effectiveLocalMode) {
								dashed.active = true;
								dashed.emit = true;
							}
						}
					}
					// Pure-mode: report an impure prelude (if leaf-ish) and push the inherited-context frame before walking the body.
					pure.enterBlock({
						isRulePrelude: true,
						treatAsLeaf: false,
						ownSkip: false,
						declarations: rule.declarations,
						childRules: rule.childRules,
						preludeStart: rule.start,
						preludeEnd: rule.blockStart !== -1 ? rule.blockStart : rule.end
					});
				},
				// Qualified-rule exit: pure-frame finalization, scope restore, top-level reset; no-op for bailed ICSS.
				exit: (node, parent) => {
					const state = qualifiedRuleStateStack.pop();
					if (!state || state.bailed) return;
					pure.exitBlock();
					currentRule.hasLocalAnchor = state.savedAnchor;
					currentRule.localIdentifiers = state.savedLocalIdentifiers;
					currentRule.composesPrevFile = state.savedPrevComposesFile;
					currentRule.composesFiles = state.savedComposesFiles;
					if (parent === null) finishTopLevelRule(node, false);
				}
			},
			// Top-level declarations are parse errors (dropped by `parseAStylesheet`), so a declaration's parent is always a block.
			[NodeType.Declaration]: (node) => {
				const decl = /** @type {Declaration} */ (node);
				// Reset value-visitor context, read by the value visitors below.
				currentStructural = decl;
				dashed.active = false;
				dashed.emit = false;
				const declPropertyName = decl.name
					.replace(/^(-\w+-)/, "")
					.toLowerCase();
				// Cache the known-property flag so the per-token value visitors don't recompute it.
				currentDeclIsKnownProperty = knownProperties.has(declPropertyName);
				// Position `lastTokenEndForComments` just past the `:` so a magic comment before the url() is found.
				let colonPos = decl.nameEnd;
				while (
					colonPos < source.length &&
					source.charCodeAt(colonPos) !== CC_COLON
				) {
					colonPos++;
				}
				lastTokenEndForComments = colonPos + 1;
				const effectiveLocalMode = isEffectivelyLocal();
				// `composes:` with a local anchor: its strip-dep covers the whole declaration, so suppress the value's local/global/dashed/ICSS rewrites.
				currentDeclComposesSkip =
					currentRule.hasLocalAnchor &&
					COMPOSES_PROPERTY.test(declPropertyName);
				if (currentDeclComposesSkip) emitComposesWithAnchor(decl);
				const skipForComposes = currentDeclComposesSkip;
				// Known-property value localization (`animation-name: foo` exports `foo`).
				if (isModules && effectiveLocalMode && currentDeclIsKnownProperty) {
					emitKnownPropertyExports(decl, declPropertyName);
				}
				// Dashed-ident (custom-property) export of the property name; the value's dashed idents are scoped by the Ident / Function visitors (top-level only for unknown properties).
				if (
					this.options.dashedIdents &&
					isModules &&
					effectiveLocalMode &&
					!skipForComposes
				) {
					if (isDashedIdentifier(decl.name)) {
						emitDashedIdentExport(decl.nameStart, decl.nameEnd);
					}
					dashed.active = true;
					dashed.emit = !currentDeclIsKnownProperty;
				}
				// ICSS-symbol rewrite (`color: foo` when `foo` is `@value`-defined), skipping known properties, the composes anchor, and dashed idents (handled above).
				if (
					isModules &&
					!skipForComposes &&
					!currentDeclIsKnownProperty &&
					!(dashed.active && isDashedIdentifier(decl.name)) &&
					icssDefinitions.has(decl.name)
				) {
					emitICSSSymbol(decl.name, decl.nameStart, decl.nameEnd);
				}
			},
			// Value-level visitors decide handling from the enclosing node via `urlActive()` / `localGlobalActive()` / `icssActive()`.
			[NodeType.Url]: (node) => {
				const url = /** @type {UrlToken} */ (node);
				if (!urlActive()) return;
				// Skip bare url-tokens for a known property in CSS-Modules local mode.
				if (
					currentStructural &&
					currentStructural.type === NodeType.Declaration &&
					isModules &&
					currentDeclIsKnownProperty &&
					isEffectivelyLocal()
				) {
					return;
				}
				if (
					webpackIgnored(
						[lastTokenEndForComments, node.end],
						lastTokenEndForComments,
						node.end
					)
				) {
					return;
				}
				let value = normalizeUrl(
					input.slice(url.contentStart, url.contentEnd),
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
								node.start,
								node.end
							);
							return;
						}
					}
				}
				const dep = new CssUrlDependency(value, [node.start, node.end], "url");
				setDepLoc(dep, node.start, node.end);
				module.addDependency(dep);
				module.addCodeGenerationDependency(dep);
			},
			[NodeType.Comma](node) {
				if (urlActive()) lastTokenEndForComments = node.start;
			},
			[NodeType.Function]: {
				enter: (node) => {
					const fn = /** @type {FunctionNode} */ (node);
					const fnameRaw = fn.unescapedName;
					const fname = fnameRaw.toLowerCase();
					if (urlActive()) emitUrlFunction(fn, fname);
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
						!(dashed.active && isDashedIdentifier(fnameRaw)) &&
						icssDefinitions.has(fnameRaw)
					) {
						emitICSSSymbol(fnameRaw, fn.nameStart, fn.nameEnd);
					}
					// Dashed-ident scoping: handle this function, then set the child nesting level's state for the walk.
					dashed.push();
					if (dashed.active) {
						if (fname === "local" || fname === "global") {
							// `local()` / `global()` dashed args go through the ICSS path above, not here.
							dashed.active = false;
						} else if (fname === "var" || fname === "style") {
							// `var(--foo, …)` / `style(--foo, …)`: emit the first ident; the fallback doesn't self-emit.
							processDashedIdentInVarFunction(fn);
							dashed.emit = false;
						} else if (dashed.emit && isDashedIdentifier(fn.name)) {
							// Custom-function call `--my-func(args)` — the name is the exported dashed-ident.
							emitDashedIdentExport(fn.nameStart, fn.nameEnd);
						}
					}
				},
				exit: () => {
					dashed.pop();
				}
			},
			[NodeType.Ident](node, parent) {
				const identValue = /** @type {Token} */ (node).value;
				if (dashed.active && isDashedIdentifier(identValue)) {
					// Dashed idents are scoped here, never `@value` ICSS-rewritten.
					if (!dashed.emit) return;
					// Resolve the `--foo from "./x.css"` / `--foo from global` import suffix via sibling lookahead.
					const siblings = childrenOf(parent);
					const i = siblings ? siblings.indexOf(node) : -1;
					if (siblings && i !== -1) {
						const j = nextNonWhitespace(siblings, i + 1);
						if (
							j < siblings.length &&
							siblings[j].type === NodeType.Ident &&
							equalsLowerCase(/** @type {Token} */ (siblings[j]).value, "from")
						) {
							const fromIdent = siblings[j];
							const sourceNode = siblings[nextNonWhitespace(siblings, j + 1)];
							if (
								sourceNode &&
								sourceNode.type === NodeType.Ident &&
								/** @type {Token} */ (sourceNode).value === "global"
							) {
								emitDashedIdentFromGlobal(node.end, sourceNode.end);
								return;
							}
							if (sourceNode && sourceNode.type === NodeType.String) {
								emitDashedIdentImport(
									node.start,
									node.end,
									fromIdent.start,
									sourceNode.end,
									input.slice(sourceNode.start + 1, sourceNode.end - 1)
								);
								return;
							}
						}
					}
					emitDashedIdentExport(node.start, node.end);
					return;
				}
				if (!icssActive()) return;
				if (icssDefinitions.has(identValue)) {
					emitICSSSymbol(identValue, node.start, node.end);
				}
			}
		};
		// `as` selects the top-level production (§5.3): a `style` attribute is a
		// block's contents, everything else a full stylesheet (the default).
		new SourceProcessor()
			.use(/** @type {VisitorMap} */ (visitors))
			.process(source, {
				locConverter,
				comment,
				as: /** @type {"stylesheet" | "block-contents"} */ (this.options.as)
			});

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

		if (cssExportEntries.length > 0) {
			module.addDependency(new CssIcssExportDependency(cssExportEntries));
		}

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
}

module.exports = CssParser;
