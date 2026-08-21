/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const path = require("path");
const { CSS_MODULE_TYPE_AUTO } = require("../ModuleTypeConstants");
const Parser = require("../Parser");
const ConstDependency = require("../dependencies/ConstDependency");
const CssIcssExportDependency = require("../dependencies/CssIcssExportDependency");
const CssIcssImportDependency = require("../dependencies/CssIcssImportDependency");
const CssIcssSymbolDependency = require("../dependencies/CssIcssSymbolDependency");
const CssImportDependency = require("../dependencies/CssImportDependency");
const CssUrlDependency = require("../dependencies/CssUrlDependency");
const StaticExportsDependency = require("../dependencies/StaticExportsDependency");
const WebpackError = require("../errors/WebpackError");
const ResourceHintPlugin = require("../prefetch/ResourceHintPlugin");
const LocConverter = require("../util/LocConverter");
const { parseResource } = require("../util/identifier");
const {
	createMagicCommentContext,
	parseCommentOptionsInRange
} = require("../util/magicComment");
const memoize = require("../util/memoize");
const topologicalSort = require("../util/topologicalSort");
const { CSS_MODULES_KEYWORDS, CSS_MODULES_KEYWORD_OPTIONS } = require("./data");
const {
	A,
	NodeType,
	SourceProcessor,
	buildSkipSet,
	equalsLowerCase,
	isDashedIdentifier,
	isWhitespace,
	normalizeUrl,
	rangeEquals,
	rangeEqualsLowerCase,
	skipEscape,
	toLowerCaseIfNeeded,
	unescapeIdentifier
} = require("./syntax");

const getUnsupportedFeatureWarning = memoize(() =>
	require("../errors/UnsupportedFeatureWarning")
);

const getModuleDependencyWarning = memoize(() =>
	require("../errors/ModuleDependencyWarning")
);

const getCommentCompilationWarning = memoize(() =>
	require("../errors/CommentCompilationWarning")
);

// `SourceProcessor` drives the parse and hands already-built AST nodes to the visitors; positions are read from those nodes' ranges rather than re-scanning the source.

/** @import { BuildInfo, BuildMeta } from "../Module" */
/**
 * @import CssModule, {
 * 	CssModuleBuildInfo,
 * 	CssModuleBuildMeta,
 * 	Inheritance
 * } from "./CssModule"
 */
/** @import { ParserState, PreparsedAst } from "../Parser" */
/**
 * @import {
 * 	AtRule,
 * 	Declaration,
 * 	FunctionNode,
 * 	Node as AstNode,
 * 	QualifiedRule,
 * 	Rule,
 * 	SimpleBlock,
 * 	Token,
 * 	UrlToken,
 * 	VisitorMap
 * } from "./syntax"
 */
/**
 * @import {
 * 	CssAutoOrModuleParserOptions
 * } from "../../declarations/WebpackOptions"
 */

/** @typedef {[number, number]} Range */
/** @typedef {{ line: number, column: number }} Position */
/** @typedef {{ from: string, items: ({ localName: string, importName: string })[] }} ValueAtRuleImport */
/** @typedef {{ localName: string, value: string }} ValueAtRuleValue */
/**
 * What a `@custom-media` name resolves to. `condition` substitutes into any
 * `<media-in-parens>` slot, `type` only at the start of a query, `boolean` is the
 * spec's `true` / `false` (folded into the enclosing query rather than written
 * out — no `<media-in-parens>` is unconditionally true on every engine).
 * @typedef {{ kind: "condition" | "type", text: string } | { kind: "boolean", value: boolean } | { kind: "unsupported" }} CustomMediaValue
 */
/** @typedef {CustomMediaValue | { kind: "alias", name: string } | { kind: "or", parts: ({ text: string } | { alias: string })[] }} CustomMediaDefinition */
/** @typedef {{ name: string, start: number, end: number, invalid: boolean, leading: boolean }} CustomMediaUse */
/**
 * A `@media` prelude captured as its boolean shape, so a `true` / `false`
 * definition found later can be folded into it. Node ids are recycled per
 * top-level rule, so this holds text and offsets rather than AST nodes.
 * @typedef {{ kind: "text", text: string } | { kind: "ref", text: string, use: CustomMediaUse } | { kind: "group", operand: MediaNode } | { kind: "not", operand: MediaNode } | { kind: "chain", isOr: boolean, terms: MediaNode[] } | { kind: "typed", text: string, rest: MediaNode | null }} MediaNode
 */

/** @type {CustomMediaValue} */
const CUSTOM_MEDIA_UNSUPPORTED = { kind: "unsupported" };
/** @type {CustomMediaValue} */
const CUSTOM_MEDIA_TRUE = { kind: "boolean", value: true };
/** @type {CustomMediaValue} */
const CUSTOM_MEDIA_FALSE = { kind: "boolean", value: false };

const CC_COLON = ":".charCodeAt(0);
const CC_FULL_STOP = ".".charCodeAt(0);
const CC_HYPHEN_MINUS = "-".charCodeAt(0);
const CC_SEMICOLON = ";".charCodeAt(0);
const CC_TAB = "\t".charCodeAt(0);
const CC_SPACE = " ".charCodeAt(0);
const CC_LINE_FEED = "\n".charCodeAt(0);
const CC_CARRIAGE_RETURN = "\r".charCodeAt(0);
const CC_FORM_FEED = "\f".charCodeAt(0);
const CC_LEFT_CURLY = "{".charCodeAt(0);
const CC_LOWER_V = "v".charCodeAt(0);
const CC_UPPER_V = "V".charCodeAt(0);
const CC_REVERSE_SOLIDUS = "\\".charCodeAt(0);

// A parsed CSS comment. `loc` is computed on demand — only magic-comment error
// warnings read it, so comment-heavy CSS skips the per-comment line/col work.
// Comments are kept in a flat per-parse `comments` side array (not AST nodes); `loc` is derived lazily via `rangeLoc` only where needed (magic-comment errors).
/** @typedef {{ value: string, range: Range }} Comment */

// Newlines (CSS Syntax 3 §3.3) — listed explicitly since there's no preprocessing stage.
// https://www.w3.org/TR/css-syntax-3/#whitespace
// Pure-mode markers: `cssmodules-pure-ignore` opts a single rule out of the purity check, `cssmodules-pure-no-check` (before the first rule) opts the whole file out.
const PURE_IGNORE_RE = /^\s*cssmodules-pure-ignore(?:\s|$)/;
const PURE_NO_CHECK_RE = /^\s*cssmodules-pure-no-check(?:\s|$)/;
const IMAGE_SET_FUNCTION = /^(?:-\w+-)?image-set$/i;
const OPTIONALLY_VENDOR_PREFIXED_KEYFRAMES_AT_RULE = /^@(?:-\w+-)?keyframes$/;
const VENDOR_PREFIX = /^-\w+-/;
const COMPOSES_PROPERTY = /^(?:composes|compose-with)$/i;
// Functional view-transition pseudo-elements whose `(<name> .class…)` argument names are scoped like `view-transition-name`/`-class` values.
const VIEW_TRANSITION_PART_PSEUDO =
	/^view-transition-(?:group|image-pair|old|new)$/i;
const IS_MODULES = /\.modules?\.[^.]+$/i;

// Which formats get a preload hint is webpack's call; what each one *is* comes
// from `mime-db`, not a second copy of the mapping.
const FONT_EXTENSIONS = new Set(["woff2", "woff", "ttf", "otf", "eot"]);

// mime-db is heavy — only load it once a font src actually needs a `type`.
const getMimeTypes = memoize(() => require("../util/mimeTypes"));

/**
 * @param {string} request font url (may carry a query/hash)
 * @returns {string | undefined} preload `type` for a known font extension
 */
const fontMimeType = (request) => {
	// Off the path only: `font?fallback=.woff2` names no font.
	const resourcePath = parseResource(request).path;
	const extension = path.extname(resourcePath).slice(1).toLowerCase();
	if (!FONT_EXTENSIONS.has(extension)) return undefined;
	return getMimeTypes().lookup(resourcePath);
};

// Skip options for a non-CSS-Modules parse: drop the selector prelude (never
// walked without modules) plus value / function-arg leaves nothing reads (the
// `Ident` visitor no-ops, the `Declaration` visitor returns early, no ICSS).
// `url` / functions / strings / blocks / commas are kept — they carry url()
// rewrites and image-set fences. At-rule preludes are kept (`@media` / `@import`
// are read). CSS-Modules parses skip nothing: selectors are walked and ICSS
// `:export { k: v }` captures each value's byte range from its first / last node.
const SKIP_NON_MODULES = {
	types: buildSkipSet([
		NodeType.Number,
		NodeType.Dimension,
		NodeType.Percentage,
		NodeType.Ident,
		NodeType.Hash,
		NodeType.Colon,
		NodeType.Delim,
		// Nothing reads value/arg whitespace either — consumers use
		// `nextNonWhitespace` / type checks that tolerate its absence.
		NodeType.Whitespace
	]),
	selectorPrelude: true
};
// Like SKIP_NON_MODULES but keeps selector preludes and the `Colon` / `Ident`
// tokens inside function-arg lists, so `@custom-selector` `:--name` references
// (including nested ones like `:is(:--name)`) survive a non-modules parse.
const SKIP_NON_MODULES_KEEP_SELECTORS = {
	types: buildSkipSet([
		NodeType.Number,
		NodeType.Dimension,
		NodeType.Percentage,
		NodeType.Hash,
		NodeType.Delim,
		NodeType.Whitespace
	]),
	selectorPrelude: false
};
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
 * Range-keyed index over a known-properties table: ASCII-case-folded 31-hash
 * of the name bytes → canonical key(s). Lets the Declaration visitor answer
 * "is this a known property" (and get the canonical lowercase name) without
 * slicing the property name out of the source per declaration.
 * @type {WeakMap<Map<string, Map<string, number>>, Map<number, string | string[]>>}
 */
const KNOWN_PROPERTY_INDEX_CACHE = new WeakMap();

/**
 * Gets (or builds) the hash index for a known-properties table.
 * @param {Map<string, Map<string, number>>} knownProperties known properties table
 * @returns {Map<number, string | string[]>} hash → canonical name(s)
 */
const getKnownPropertyIndex = (knownProperties) => {
	let index = KNOWN_PROPERTY_INDEX_CACHE.get(knownProperties);
	if (index === undefined) {
		index = new Map();
		for (const name of knownProperties.keys()) {
			let h = name.length;
			for (let i = 0; i < name.length; i++) {
				h = ((h << 5) - h + name.charCodeAt(i)) | 0;
			}
			const hit = index.get(h);
			if (hit === undefined) index.set(h, name);
			else if (typeof hit === "string") index.set(h, [hit, name]);
			else hit.push(name);
		}
		KNOWN_PROPERTY_INDEX_CACHE.set(knownProperties, index);
	}
	return index;
};

/**
 * Canonical known-property name for a source range (ASCII case-insensitive), without slicing.
 * @param {Map<number, string | string[]>} index hash index from `getKnownPropertyIndex`
 * @param {string} input source
 * @param {number} start name start
 * @param {number} end name end (exclusive)
 * @returns {string | undefined} canonical lowercase name, or undefined when unknown
 */
const knownPropertyForRange = (index, input, start, end) => {
	let h = end - start;
	for (let i = start; i < end; i++) {
		let c = input.charCodeAt(i);
		// The table holds no raw-byte spelling, so re-read the unescaped one.
		// Each pass shortens the name, so an escaped `\` cannot recurse forever.
		if (c === CC_REVERSE_SOLIDUS) {
			const name = unescapeIdentifier(input.slice(start, end));
			return knownPropertyForRange(index, name, 0, name.length);
		}
		if (c >= 65 && c <= 90) c |= 0x20;
		h = ((h << 5) - h + c) | 0;
	}
	const hit = index.get(h);
	if (hit === undefined) return undefined;
	if (typeof hit === "string") {
		return rangeEqualsLowerCase(input, start, end, hit) ? hit : undefined;
	}
	for (let i = 0; i < hit.length; i++) {
		if (rangeEqualsLowerCase(input, start, end, hit[i])) return hit[i];
	}
	return undefined;
};

/**
 * Comma-separated index of the counter-name argument in a counter-reading function, or `-1` when the name isn't one. The name is matched over the raw byte range like the other function-name probes; only an escaped name (rare) pays the unescaped slice.
 * @param {string} input source
 * @param {number} start name start offset
 * @param {number} end name end offset
 * @param {string=} escapedName unescaped name, when the raw range carries an escape
 * @returns {number} argument index of the counter name, or `-1`
 */
const counterFunctionNameIndex = (input, start, end, escapedName) => {
	// The `target-counter(url, name, style?)` cross-reference forms (Generated Content for Paged Media) name the counter second; print engines read them.
	if (escapedName !== undefined) {
		if (
			equalsLowerCase(escapedName, "counter") ||
			equalsLowerCase(escapedName, "counters")
		) {
			return 0;
		}
		if (
			equalsLowerCase(escapedName, "target-counter") ||
			equalsLowerCase(escapedName, "target-counters")
		) {
			return 1;
		}
		return -1;
	}
	switch (end - start) {
		case 7:
			return rangeEqualsLowerCase(input, start, end, "counter") ? 0 : -1;
		case 8:
			return rangeEqualsLowerCase(input, start, end, "counters") ? 0 : -1;
		case 14:
			return rangeEqualsLowerCase(input, start, end, "target-counter") ? 1 : -1;
		case 15:
			return rangeEqualsLowerCase(input, start, end, "target-counters")
				? 1
				: -1;
		default:
			return -1;
	}
};

/**
 * Gets the known-properties table for the enabled scoping options: the
 * properties a `css/module` reads a scoped name out of, each with the keywords
 * of its own grammar (see `tooling/generate-css-data.js`).
 * @param {{ animation?: boolean, container?: boolean, customIdents?: boolean, grid?: boolean }=} options options
 * @returns {Map<string, Map<string, number>>} list of known properties
 */
const buildKnownProperties = (options = {}) => {
	/** @type {Map<string, Map<string, number>>} */
	const knownProperties = new Map();
	for (const [property, option] of CSS_MODULES_KEYWORD_OPTIONS) {
		if (
			options[
				/** @type {"animation" | "container" | "customIdents" | "grid"} */
				(option)
			]
		) {
			knownProperties.set(
				property,
				/** @type {Map<string, number>} */
				(CSS_MODULES_KEYWORDS.get(property))
			);
		}
	}
	return knownProperties;
};

/** @type {Map<number, Map<string, Map<string, number>>>} */
const KNOWN_PROPERTIES_CACHE = new Map();

/**
 * Memoized {@link buildKnownProperties}: the table depends only on the four
 * boolean options (≤ 16 combinations) and is read-only, while the same parser is
 * reused across modules — so build each combination once and share it instead
 * of rebuilding the Map per parsed module.
 * @param {{ animation?: boolean, container?: boolean, customIdents?: boolean, grid?: boolean }=} options options
 * @returns {Map<string, Map<string, number>>} known properties table
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

// Byte-level source-cursor scans for computing replacement / strip ranges on raw source after parsing.

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
 * Whether the byte range contains a CSS escape (`\`) — function names are short, so this scan replaces a per-name slice.
 * @param {string} input source
 * @param {number} start start offset
 * @param {number} end end offset (exclusive)
 * @returns {boolean} true when the range contains a backslash
 */
const rangeHasEscape = (input, start, end) => {
	for (let i = start; i < end; i++) {
		if (input.charCodeAt(i) === CC_REVERSE_SOLIDUS) return true;
	}
	return false;
};

/**
 * Whether a raw ident range names a custom property — `\2d\2d x` is `--x` too,
 * so a name opening with a dash or a backslash pays the unescape.
 * @param {string} input source
 * @param {number} start ident start offset
 * @param {number} end ident end offset (exclusive)
 * @returns {boolean} true when the ident names a custom property
 */
const rangeIsDashedIdentifier = (input, start, end) => {
	// `--x` is the shortest spelling; an escaped one is longer still.
	if (end - start < 3) return false;
	const first = input.charCodeAt(start);
	if (first === CC_HYPHEN_MINUS) {
		if (input.charCodeAt(start + 1) === CC_HYPHEN_MINUS) return true;
		if (input.charCodeAt(start + 1) !== CC_REVERSE_SOLIDUS) return false;
	} else if (first !== CC_REVERSE_SOLIDUS) {
		return false;
	}
	return isDashedIdentifier(unescapeIdentifier(input.slice(start, end)));
};

/**
 * The named cell tokens of a `grid-template-areas` string, in source offsets.
 * A whitespace closing a hex escape does not separate; a `.` run names nothing.
 * @param {string} input source
 * @param {number} start content start offset (inside the quote)
 * @param {number} end content end offset (exclusive)
 * @returns {[number, number][]} one `[start, end]` per named cell
 */
const gridAreaNames = (input, start, end) => {
	/** @type {[number, number][]} */
	const names = [];
	let i = start;
	while (i < end) {
		while (i < end && isWhitespace(input.charCodeAt(i))) i++;
		if (i >= end) break;
		const nameStart = i;
		let nullCell = true;
		while (i < end) {
			const cc = input.charCodeAt(i);
			if (isWhitespace(cc)) break;
			if (cc === CC_REVERSE_SOLIDUS) {
				i = Math.min(skipEscape(input, i), end);
				nullCell = false;
				continue;
			}
			if (cc !== CC_FULL_STOP) nullCell = false;
			i++;
		}
		if (!nullCell) names.push([nameStart, i]);
	}
	return names;
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
 * @param {Declaration[] | null} declarations rule-body declarations
 * @param {Rule[] | null} childRules rule-body child rules
 * @returns {{ hasDirectDecl: boolean, hasNestedBlock: boolean }} scan result
 */
const scanRuleBody = (declarations, childRules) => {
	let hasDirectDecl = Boolean(declarations && declarations.length > 0);
	let hasNestedBlock = false;
	if (childRules) {
		for (const child of childRules) {
			const t = A.type(child);
			if (t === NodeType.QualifiedRule) {
				hasNestedBlock = true;
			} else if (t === NodeType.AtRule) {
				const atDecls = A.declarations(child);
				const atChildRules = A.childRules(child);
				if (!atDecls && !atChildRules) continue;
				hasNestedBlock = true;
				if (
					!hasDirectDecl &&
					!isPureBodyAtRule(`@${toLowerCaseIfNeeded(A.name(child))}`) &&
					scanRuleBody(atDecls, atChildRules).hasDirectDecl
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
	while (i < nodes.length && A.type(nodes[i]) === NodeType.Whitespace) i++;
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
		const t = A.type(cv);
		if (t === NodeType.Whitespace) continue;

		if (!urlNode) {
			if (t === NodeType.Url || t === NodeType.String) {
				urlNode = cv;
				continue;
			}
			if (
				t === NodeType.Function &&
				equalsLowerCase(A.unescapedName(cv), "url")
			) {
				urlNode = cv;
				continue;
			}
			if (t === NodeType.Ident) {
				// CSS Modules: bare ident is a `@value` reference.
				urlNode = cv;
				continue;
			}
			break;
		}

		if (!layerNode && !supportsNode) {
			if (t === NodeType.Ident) {
				if (equalsLowerCase(A.unescaped(cv), "layer")) {
					layerNode = cv;
					continue;
				}
			} else if (
				t === NodeType.Function &&
				equalsLowerCase(A.unescapedName(cv), "layer")
			) {
				layerNode = cv;
				continue;
			}
		}

		if (
			!supportsNode &&
			t === NodeType.Function &&
			equalsLowerCase(A.unescapedName(cv), "supports")
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
	if (A.type(second) === NodeType.Function) {
		args = A.children(second);
	} else {
		for (const p of A.prelude(rule)) {
			if (A.type(p) === NodeType.SimpleBlock && A.blockToken(p) === "(") {
				args = A.children(p);
				break;
			}
		}
	}
	// The first non-whitespace value inside `(...)` must be a string.
	const innerStrToken =
		args && args.find((v) => A.type(v) !== NodeType.Whitespace);
	if (!innerStrToken || A.type(innerStrToken) !== NodeType.String) {
		const errorPos =
			A.type(second) === NodeType.Function
				? A.nameEnd(second) + 1
				: A.end(second);
		return { errorPos };
	}
	return {
		request: source.slice(A.start(innerStrToken) + 1, A.end(innerStrToken) - 1)
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
			customMedia: true,
			customSelectors: true,
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
			new (getModuleDependencyWarning())(
				state.module,
				new WebpackError(message),
				{
					start: { line: sl, column: sc },
					end: { line: el, column: ec }
				}
			)
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
	 * Arbitrate cross-kind CSS-Modules export collisions collected during
	 * parsing. A class always wins the shared JS export key over the
	 * CSS-only kinds (`@keyframes`, `@counter-style`, `@container`, custom
	 * property, grid identifier) — matching css-loader / lightning css /
	 * postcss-modules; the loser's `EXPORT_MODE` is demoted to `NONE` so
	 * the CSS-side rewrite is preserved but the entry no longer contributes
	 * to `styles.<name>`. Other pairs (`class` ↔ `id`,
	 * `class` ↔ `:export`, `class` ↔ `@value`, kind-vs-kind without a
	 * class present, …) surface as a warning so the user resolves the name
	 * themselves. Same-kind redeclarations are silent.
	 * @param {ParserState} state parser state
	 * @param {Map<string, { kind: string, line: number, column: number, entries: number[] }[]>} declaredExports collected declarations grouped by (name, kind)
	 * @param {import("../dependencies/CssIcssExportDependency").CssExportEntry[]} cssExportEntries all export entries — losers are demoted in place
	 * @returns {void}
	 */
	_resolveAmbiguousExports(state, declaredExports, cssExportEntries) {
		const NONE = CssIcssExportDependency.EXPORT_MODE.NONE;
		for (const [name, decls] of declaredExports) {
			if (decls.length <= 1) continue;
			// Prefer `class` as the winner (matches css-loader / lightning css / postcss-modules); otherwise the first-declared kind wins de facto.
			let winner;
			for (const d of decls) {
				if (d.kind === "class") {
					winner = d;
					break;
				}
			}
			const reference = winner !== undefined ? winner : decls[0];
			for (const loser of decls) {
				if (loser === reference) continue;
				const anchor = cssExportEntries[loser.entries[0]];
				if (
					winner !== undefined &&
					(loser.kind === "custom property" ||
						loser.kind === "@keyframes" ||
						loser.kind === "@counter-style" ||
						loser.kind === "@container" ||
						loser.kind === "grid identifier")
				) {
					for (const idx of loser.entries) {
						cssExportEntries[idx].exportMode = NONE;
					}
					state.current.addWarning(
						new (getModuleDependencyWarning())(
							state.module,
							new WebpackError(
								`CSS module export "${name}" is shadowed by ${winner.kind} at line ${winner.line}:${winner.column}: the ${loser.kind} "${name}" is still scoped in the emitted CSS but is not accessible from the JavaScript export — rename one of them if both are needed`
							),
							{
								start: {
									line: anchor.locStartLine,
									column: anchor.locStartColumn
								},
								end: {
									line: anchor.locEndLine,
									column: anchor.locEndColumn
								}
							}
						)
					);
				} else {
					// Other collision — warn without changing behavior.
					state.current.addWarning(
						new (getModuleDependencyWarning())(
							state.module,
							new WebpackError(
								`Conflicting CSS module export "${name}": already declared as ${reference.kind} at line ${reference.line}:${reference.column}, redeclared as ${loser.kind}`
							),
							{
								start: {
									line: anchor.locStartLine,
									column: anchor.locStartColumn
								},
								end: {
									line: anchor.locEndLine,
									column: anchor.locEndColumn
								}
							}
						)
					);
				}
			}
		}
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

		const urlHints = this.options.urlHints;
		const fontPreload = this.options.fontPreload;
		/**
		 * Apply `parser.css.urlHints` defaults + `webpackPrefetch` /
		 * `webpackPreload` / `webpackFetchPriority` / `webpackAs` /
		 * `webpackType` / `webpackMedia` magic-comment overrides to a fresh
		 * `CssUrlDependency`. Magic comments win over the project-wide default.
		 * @param {CssUrlDependency} dep dep
		 * @param {string} request asset request
		 * @param {Record<string, EXPECTED_ANY> | null | undefined} options parsed comment options
		 * @param {import("../Dependency").DependencyLocation} loc location for warnings
		 * @returns {void}
		 */
		const applyResourceHintDefaults = (dep, request, options, loc) => {
			// `fontPreload` heuristic: seed `preload`/`as`/`type` for the first url
			// of each `@font-face` (the nearest enclosing at-rule) as the lowest
			// default, so `urlHints` rules and magic comments below still override.
			if (fontPreload && atRuleStateStack.length > 0) {
				const top = atRuleStateStack[atRuleStateStack.length - 1];
				if (top.name === "@font-face" && !top.fontPreloaded) {
					top.fontPreloaded = true;
					dep.preload = true;
					dep.asAttribute = "font";
					const type = fontMimeType(request);
					if (type) dep.typeAttribute = type;
				}
			}
			ResourceHintPlugin.applyResourceHints(
				dep,
				urlHints,
				request,
				options,
				state.module,
				loc
			);
		};

		const module = state.module;

		// Every CSS Modules export declaration is tracked here so `_resolveAmbiguousExports` can arbitrate cross-kind collisions in one pass at end-of-parse: a class silently wins over CSS-scoped kinds (`@keyframes`, `@counter-style`, `@container`, custom property, grid identifier) — matching css-loader / lightning css / postcss-modules — while other pairs (`class` ↔ `id`, `class` ↔ `:export`, `class` ↔ `@value`, …) surface as a warning so the user can resolve them.
		/** @typedef {{ kind: string, line: number, column: number, entries: number[] }} DeclarationOfKind */
		/** @type {Map<string, DeclarationOfKind[]>} */
		const declaredExports = new Map();

		/**
		 * Track a declaration site for later ambiguity resolution. Pointer
		 * into `cssExportEntries` is captured now because the entry is
		 * pushed immediately after by the calling `addCssExport(…)`.
		 * Property-value references (`animation: foo`) are not declarations
		 * and skip this hook.
		 * @param {string} name export name
		 * @param {string} kind human-readable declaration kind
		 * @param {number} line start line (1-based) of the declaration
		 * @param {number} column start column (0-based) of the declaration
		 * @returns {void}
		 */
		const recordDeclaration = (name, kind, line, column) => {
			let decls = declaredExports.get(name);
			if (decls === undefined) {
				decls = [];
				declaredExports.set(name, decls);
			}
			let d;
			for (const existing of decls) {
				if (existing.kind === kind) {
					d = existing;
					break;
				}
			}
			if (d === undefined) {
				d = { kind, line, column, entries: [] };
				decls.push(d);
			}
			d.entries.push(cssExportEntries.length);
		};

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
			// Flat location numbers — the nested loc objects were the parser's
			// hottest allocation (3 objects per exported name).
			cssExportEntries.push({
				name,
				value,
				range,
				interpolate,
				exportMode,
				exportType,
				locStartLine: sl,
				locStartColumn: sc,
				locEndLine: el,
				locEndColumn: ec
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

		/** @type {Map<string, boolean>} */
		const selfReferenceCache = new Map();

		/**
		 * Whether a relative `from "<request>"` resolves back to the current module (matching query/fragment too).
		 * Memoized per parse — `composes … from "./x.css"` repeats the same request many times per file.
		 * @param {string} request request string from `from "<request>"`
		 * @returns {boolean} true if request resolves to the current module
		 */
		const isSelfReferenceRequest = (request) => {
			const cached = selfReferenceCache.get(request);
			if (cached !== undefined) return cached;
			const result = isSelfReferenceRequestUncached(request);
			selfReferenceCache.set(request, result);
			return result;
		};

		/**
		 * Uncached `isSelfReferenceRequest`.
		 * @param {string} request request string from `from "<request>"`
		 * @returns {boolean} true if request resolves to the current module
		 */
		const isSelfReferenceRequestUncached = (request) => {
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
		const knownPropertyIndex = getKnownPropertyIndex(knownProperties);

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
		 * Apply the magic comments in `range`: warn on any compilation error, validate `webpackIgnore`, and return both the parsed options (for resource-hint / other magic-comment consumers) and whether the resource is ignored.
		 * @param {Range} range byte range to scan for magic comments
		 * @param {number} warnStart start offset of the loc for an invalid-`webpackIgnore` warning (computed lazily)
		 * @param {number} warnEnd end offset of that loc
		 * @returns {{ ignored: boolean, options: Record<string, EXPECTED_ANY> | null }} parsed options and `webpackIgnore` flag
		 */
		const magicCommentsIn = (range, warnStart, warnEnd) => {
			/** @type {{ options: Record<string, EXPECTED_ANY> | null, errors: (Error & { comment: Comment })[] | null }} */
			const { options, errors } = parseCommentOptionsInRange(
				/** @type {(Comment & { range: [number, number], value: string })[]} */ (
					comments
				),
				range,
				this.magicCommentContext
			);
			if (errors) {
				for (const e of errors) {
					state.module.addWarning(
						new (getCommentCompilationWarning())(
							`Compilation error while processing magic comment(-s): /*${e.comment.value}*/: ${e.message}`,
							rangeLoc(e.comment.range[0], e.comment.range[1])
						)
					);
				}
			}
			let ignored = false;
			if (options && options.webpackIgnore !== undefined) {
				if (typeof options.webpackIgnore !== "boolean") {
					// Loc is computed lazily here — it's only needed for this rare
					// warning, not on every checked `url()` / `@import`.
					state.module.addWarning(
						new (getUnsupportedFeatureWarning())(
							`\`webpackIgnore\` expected a boolean, but received: ${options.webpackIgnore}.`,
							rangeLoc(warnStart, warnEnd)
						)
					);
				} else {
					ignored = options.webpackIgnore;
				}
			}
			return { ignored, options };
		};
		/**
		 * Backwards-compatible boolean shortcut of {@link magicCommentsIn} for call sites that only need the ignore flag.
		 * @param {Range} range byte range to scan for magic comments
		 * @param {number} warnStart start offset of the loc for an invalid-`webpackIgnore` warning
		 * @param {number} warnEnd end offset of that loc
		 * @returns {boolean} true when `webpackIgnore: true`
		 */
		const webpackIgnored = (range, warnStart, warnEnd) =>
			magicCommentsIn(range, warnStart, warnEnd).ignored;

		// Closure-scope alias for `source` used by AST-walking helpers for substring extraction.
		const input = source;

		// `@custom-media` / `@custom-selector` are build-time only (no engine ships them), so they're resolved by file-local substitution. The `includes` gates keep files without them at zero overhead; definitions may follow their uses (names are stylesheet-global), so uses are collected during the walk and resolved after it.
		const mayHaveCustomMedia =
			this.options.customMedia && input.includes("@custom-media");
		const mayHaveCustomSelectors =
			this.options.customSelectors && input.includes("@custom-selector");
		/** @type {Map<string, CustomMediaDefinition> | undefined} */
		let customMediaDefs;
		/** @type {Map<string, CustomMediaValue> | undefined} */
		let customMediaValues;
		/** @type {{ queries: MediaNode[], start: number, end: number, uses: CustomMediaUse[] }[] | undefined} */
		let customMediaQueries;
		/** @type {Map<string, string> | undefined} */
		let customSelectorDefs;
		/** @type {{ name: string, start: number, end: number }[] | undefined} */
		let customSelectorUses;

		/**
		 * Unescape a CSS identifier from a source byte range — for value spans not
		 * backed by a single token (string contents, `--` dashed-ident bodies,
		 * composed names). Token-backed names use `A.unescaped(node)` instead.
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
						const { hasDirectDecl, hasNestedBlock } = scanRuleBody(
							declarations,
							childRules
						);
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
		 * Comment visitor (`NodeType.Comment`): push every comment (in source order) onto the local `comments`, read back by `advanceCommentCursor` (pure-mode flags) and `parseCommentOptionsInRange` (magic comments).
		 * @param {import("./syntax").CssPath} path walk path at the comment node
		 */
		const commentVisitor = (path) => {
			const node = path.node;
			const start = A.start(node);
			const end = A.end(node);
			comments.push({
				value: source.slice(start + 2, end - 2),
				range: [start, end]
			});
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
					recordDeclaration(name, ":export", sl, sc);
					addCssExport(sl, sc, el, ec, name, getReexport(value));
				}
			};

			// Body `{ name: value; … }` is parsed eagerly (§5.4.4) — emit a dep per declaration.
			const ruleDecls = A.declarations(rule);
			if (!ruleDecls || A.blockStart(rule) === -1) return A.end(second);
			for (const decl of ruleDecls) {
				const vals = A.children(decl);
				if (vals.length === 0) continue;
				const rawStart = A.start(vals[0]);
				const rawEnd = A.end(vals[vals.length - 1]);
				createDep(
					source.slice(A.nameStart(decl), A.nameEnd(decl)),
					source.slice(rawStart, rawEnd),
					A.nameEnd(decl),
					rawEnd
				);
			}

			return skipWhiteLine(source, A.blockEnd(rule));
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
		 * @param {string=} declarationKind human-readable export kind to use for conflict tracking when the caller is a declaration site (selector or at-rule prelude). Undefined for property-value references, which are not tracked.
		 */
		const processLocalOrGlobalFunction = (fn, type, declarationKind) => {
			// Replace `local(` / `global(` (and a leading `:` for the `:local(`/`:global(` selector form) with empty.
			const fnStart = A.start(fn);
			const isColon = input.charCodeAt(fnStart - 1) === CC_COLON;
			const openEnd = A.nameEnd(fn) + 1;
			module.addPresentationalDependency(
				new ConstDependency("", [isColon ? fnStart - 1 : fnStart, openEnd])
			);

			if (type === 1) {
				for (const cv of A.children(fn)) {
					if (A.type(cv) !== NodeType.Ident) continue;
					let identifier = A.unescaped(cv);
					// Cursor reads instead of `A.loc` — no location objects allocated.
					const { line: sl, column: sc } = locConverter.get(A.start(cv));
					const { line: el, column: ec } = locConverter.get(A.end(cv));
					const isDashedIdent = isDashedIdentifier(identifier);
					if (isDashedIdent) identifier = identifier.slice(2);
					if (declarationKind !== undefined) {
						recordDeclaration(
							identifier,
							isDashedIdent ? "custom property" : declarationKind,
							sl,
							sc
						);
					}
					addCssExport(
						sl,
						sc,
						el,
						ec,
						identifier,
						getReexport(identifier),
						[A.start(cv), A.end(cv)],
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
				new ConstDependency("", [A.end(fn) - 1, A.end(fn)])
			);
		};

		/**
		 * Localize the prelude name of `@keyframes` / `@counter-style` / `@container`: `options.string` takes the first string, `options.identifier` the first ident (a `RegExp` skips matching keywords), `:local()`/`:global()` count as found; top-level `var()`/`style()` dashed idents are always ICSS-processed.
		 * @param {AtRule} atRule parsed at-rule
		 * @param {{ string?: boolean, identifier?: boolean | RegExp }} options which prelude value kinds count as the local name
		 * @param {string} kind human-readable export kind for the surrounding at-rule (`"@keyframes"`, `"@counter-style"`, `"@container"`)
		 * @returns {number} position after handling
		 */
		const processLocalAtRule = (atRule, options, kind) => {
			let found = false;
			for (const cv of A.prelude(atRule)) {
				const cvType = A.type(cv);
				if (cvType === NodeType.Whitespace) continue;

				if (cvType === NodeType.String) {
					if (!found && options.string) {
						const value = A.unescaped(cv);
						const { line: sl, column: sc } = locConverter.get(A.start(cv));
						const { line: el, column: ec } = locConverter.get(A.end(cv));
						recordDeclaration(value, kind, sl, sc);
						addCssExport(
							sl,
							sc,
							el,
							ec,
							value,
							value,
							[A.start(cv), A.end(cv)],
							true,
							CssIcssExportDependency.EXPORT_MODE.ONCE
						);
						found = true;
						pure.markLocal();
					}
					continue;
				}

				if (cvType === NodeType.Ident) {
					if (!found && options.identifier) {
						const identifier = A.unescaped(cv);
						if (
							options.identifier instanceof RegExp &&
							options.identifier.test(identifier)
						) {
							continue;
						}
						const { line: sl, column: sc } = locConverter.get(A.start(cv));
						const { line: el, column: ec } = locConverter.get(A.end(cv));
						recordDeclaration(identifier, kind, sl, sc);
						addCssExport(
							sl,
							sc,
							el,
							ec,
							identifier,
							getReexport(identifier),
							[A.start(cv), A.end(cv)],
							true,
							CssIcssExportDependency.EXPORT_MODE.ONCE,
							CssIcssExportDependency.EXPORT_TYPE.NORMAL
						);
						found = true;
						pure.markLocal();
					}
					continue;
				}

				if (cvType === NodeType.Function) {
					const fn = /** @type {FunctionNode} */ (cv);
					const fname = A.unescapedName(fn);
					const type = equalsLowerCase(fname, "local")
						? 1
						: equalsLowerCase(fname, "global")
							? 2
							: undefined;
					if (!found && type) {
						found = true;
						if (type === 1) pure.markLocal();
						processLocalOrGlobalFunction(fn, type, kind);
						continue;
					}
					if (
						this.options.dashedIdents &&
						isLocalMode() &&
						(equalsLowerCase(fname, "var") || equalsLowerCase(fname, "style"))
					) {
						processDashedIdentInVarFunction(fn);
					}
				}
			}
			return A.end(atRule);
		};
		/**
		 * The custom property's name, without its `--`. An escaped dash makes the
		 * prefix longer than two bytes, so it comes off the unescaped value.
		 * @param {number} identStart start of the `--<name>` ident
		 * @param {number} identEnd end of the ident
		 * @returns {string} the name after `--`
		 */
		const dashedIdentName = (identStart, identEnd) =>
			source.charCodeAt(identStart) === CC_HYPHEN_MINUS &&
			source.charCodeAt(identStart + 1) === CC_HYPHEN_MINUS
				? unescapeRange(identStart + 2, identEnd)
				: unescapeRange(identStart, identEnd).slice(2);

		/**
		 * Emit the ICSS export declaring this module exports the given custom property.
		 * @param {number} identStart start of the `--<name>` ident
		 * @param {number} identEnd end of the ident (exclusive)
		 */
		const emitDashedIdentExport = (identStart, identEnd) => {
			const identifier = dashedIdentName(identStart, identEnd);
			const { line: sl, column: sc } = locConverter.get(identStart);
			const { line: el, column: ec } = locConverter.get(identEnd);
			recordDeclaration(identifier, "custom property", sl, sc);
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
			const identifier = dashedIdentName(identStart, identEnd);
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

			recordDeclaration(identifier, "custom property", sl, sc);
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
			const fv = A.children(fn);
			for (let i = 0; i < fv.length; i++) {
				const cv = fv[i];
				if (A.type(cv) === NodeType.Whitespace) continue;
				if (A.type(cv) === NodeType.Ident) {
					identNode = /** @type {Token} */ (cv);
					identIdx = i;
				}
				break;
			}
			if (!identNode) return;

			const identStart = A.start(identNode);
			const identEnd = A.end(identNode);
			if (!rangeIsDashedIdentifier(input, identStart, identEnd)) return;

			let j = identIdx + 1;
			while (j < fv.length && A.type(fv[j]) === NodeType.Whitespace) {
				j++;
			}

			if (
				j >= fv.length ||
				A.type(fv[j]) !== NodeType.Ident ||
				!rangeEqualsLowerCase(input, A.start(fv[j]), A.end(fv[j]), "from")
			) {
				emitDashedIdentExport(identStart, identEnd);
				return;
			}

			const fromIdent = fv[j];
			j++;
			while (j < fv.length && A.type(fv[j]) === NodeType.Whitespace) {
				j++;
			}
			if (j >= fv.length) return;

			const src = fv[j];
			if (
				A.type(src) === NodeType.Ident &&
				rangeEquals(input, A.start(src), A.end(src), "global")
			) {
				emitDashedIdentFromGlobal(identEnd, A.end(src));
				return;
			}
			if (A.type(src) === NodeType.String) {
				emitDashedIdentImport(
					identStart,
					identEnd,
					A.start(fromIdent),
					A.end(src),
					input.slice(A.start(src) + 1, A.end(src) - 1)
				);
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
			/** Directly inside a `counter()`-family call whose arguments were already rewritten — suppresses the generic ICSS ident rewrite over the same ranges. */
			counterArgs: false,
			/** LIFO save/restore of `active` + `emit` + `counterArgs` across function nesting, bit-packed (bit 0 = active, bit 1 = emit, bit 2 = counterArgs) to avoid a per-function-token object allocation. */
			/** @type {number[]} */
			stack: [],
			/** Push the current scope; call before descending into a `Function` body. */
			push() {
				this.stack.push(
					(this.active ? 1 : 0) |
						(this.emit ? 2 : 0) |
						(this.counterArgs ? 4 : 0)
				);
			},
			/** Pop the saved scope; call when leaving a `Function` body. */
			pop() {
				const s = /** @type {number} */ (this.stack.pop());
				this.active = (s & 1) !== 0;
				this.emit = (s & 2) !== 0;
				this.counterArgs = (s & 4) !== 0;
			}
		};
		// Nearest enclosing declaration / at-rule / qualified-rule, set by each structural enter; the Url / Function / Ident / Comma visitors read it (via `urlActive` / `localGlobalActive` / `icssActive`) to decide value handling from the node hierarchy instead of carrying precomputed flags.
		/** @type {AstNode | undefined} */
		let currentStructural;
		// Cached on each structural enter and read per value token, so the hot Function / Ident / Url visitors don't re-derive the property / at-rule name on every visit.
		let currentAtRuleName = "";
		// Set by `handleImportAtRule` for a malformed `@import` so its prelude still emits orphan url() deps; read by `urlActive`. Reset per at-rule enter (replaces an ad-hoc property on the node).
		let currentUrlRecovery = false;
		/** Whether the current Declaration's property is a localizable known property. */
		let currentDeclIsKnownProperty = false;
		/** Whether the current `composes:` declaration owns the whole value (suppresses value rewrites). */
		let currentDeclComposesSkip = false;
		/** Whether `counter()`-family arguments are scoped in the current declaration's value. */
		let currentDeclCounterActive = false;

		/**
		 * Per-at-rule scope frames; `exit` reads `hasBlock` to pick the block-cleanup vs `suppressNextRulePrelude` branch.
		 * @type {{ savedAnchor: boolean, savedLocalIdentifierCount: number, name: string, hasBlock: boolean, endsWithSemicolon: boolean, fontPreloaded: boolean }[]}
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
				after && A.type(after) === NodeType.Whitespace
			);
			const identEnd = A.end(ident);
			const stripEnd =
				afterIsWhitespace && A.start(after) === identEnd
					? A.end(after)
					: identEnd;
			if (isModules) {
				module.addPresentationalDependency(
					new ConstDependency("", [A.start(colon), stripEnd])
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
			const fnEnd = A.end(fn);
			let stripLeadEnd = fnEnd - 1;
			for (const arg of A.children(fn)) {
				if (A.type(arg) !== NodeType.Whitespace) {
					stripLeadEnd = A.start(arg);
					break;
				}
			}
			module.addPresentationalDependency(
				new ConstDependency("", [A.start(colon), stripLeadEnd])
			);
			let trailStart = fnEnd - 1; // position of `)`
			if (isLocal) {
				while (
					trailStart > 0 &&
					isWhitespace(source.charCodeAt(trailStart - 1))
				) {
					trailStart--;
				}
			}
			module.addPresentationalDependency(
				new ConstDependency("", [trailStart, fnEnd])
			);
		};

		/**
		 * Emit the ICSS export for an attribute selector `[class="foo"]` / `[class~="foo"]` (not a composes anchor) by walking the `[…]` block's parsed children. No-op for any other attribute shape.
		 * @param {SimpleBlock} block the `[…]` block
		 * @returns {void}
		 */
		const handleAttributeSelector = (block) => {
			const attrParts = A.children(block);
			let ai = 0;
			while (
				ai < attrParts.length &&
				A.type(attrParts[ai]) === NodeType.Whitespace
			) {
				ai++;
			}
			const attrNameNode = attrParts[ai];
			if (!attrNameNode || A.type(attrNameNode) !== NodeType.Ident) return;
			const attrName = A.unescaped(attrNameNode);
			if (!equalsLowerCase(attrName, "class")) return;
			ai++;
			while (
				ai < attrParts.length &&
				A.type(attrParts[ai]) === NodeType.Whitespace
			) {
				ai++;
			}
			// `=` or `~=` (two `Delim` tokens for the latter).
			const op1 = attrParts[ai];
			if (!op1 || A.type(op1) !== NodeType.Delim) return;
			const op1v = A.value(op1);
			if (op1v === "~") {
				ai++;
				const op2 = attrParts[ai];
				if (!op2 || A.type(op2) !== NodeType.Delim || A.value(op2) !== "=") {
					return;
				}
			} else if (op1v !== "=") {
				return;
			}
			ai++;
			while (
				ai < attrParts.length &&
				A.type(attrParts[ai]) === NodeType.Whitespace
			) {
				ai++;
			}
			const attrValueNode = attrParts[ai];
			if (!attrValueNode) return;
			/** @type {number} */
			let classNameStart;
			/** @type {number} */
			let classNameEnd;
			if (A.type(attrValueNode) === NodeType.String) {
				classNameStart = A.start(attrValueNode) + 1;
				classNameEnd = A.end(attrValueNode) - 1;
			} else if (A.type(attrValueNode) === NodeType.Ident) {
				classNameStart = A.start(attrValueNode);
				classNameEnd = A.end(attrValueNode);
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
		 * Scope a `::view-transition-*()` pseudo-element's `(<pt-name> .<pt-class>…)` argument: each non-dashed custom-ident (the part name and its classes) is localized like a `view-transition-name` value; `*` and dashed idents are left untouched. Keeps the pseudo consistent with the scoped `view-transition-name`/`-class` declarations.
		 * @param {AstNode[]} cvs the pseudo-element's argument component values
		 * @returns {void}
		 */
		const walkViewTransitionPart = (cvs) => {
			// customIdents off: leave the whole `(…)` untouched (both name and classes), consistent with unscoped `view-transition-name`/`-class` declarations.
			if (!this.options.customIdents) return;
			for (const cv of cvs) {
				if (A.type(cv) !== NodeType.Ident) continue;
				const name = A.unescaped(cv);
				if (isDashedIdentifier(name)) continue;
				const start = A.start(cv);
				const end = A.end(cv);
				const { line: sl, column: sc } = locConverter.get(start);
				const { line: el, column: ec } = locConverter.get(end);
				addCssExport(
					sl,
					sc,
					el,
					ec,
					name,
					getReexport(name),
					[start, end],
					true,
					CssIcssExportDependency.EXPORT_MODE.ONCE
				);
				pure.markLocal();
			}
		};

		/**
		 * Emit the ICSS export for one ident argument of a `counter()`-family call. Dashed names are left to the blanket dashed-ident scanner, and reserved names (UA counters, predefined counter styles, CSS-wide keywords) stay global.
		 * @param {AstNode} node the ident node
		 * @param {string} reservedFrom property whose keywords must not be localized here
		 * @returns {void}
		 */
		const emitCounterIdent = (node, reservedFrom) => {
			const name = A.unescaped(node);
			if (isDashedIdentifier(name)) return;
			const reserved =
				/** @type {Map<string, number>} */
				(CSS_MODULES_KEYWORDS.get(reservedFrom));
			if (reserved.has(toLowerCaseIfNeeded(name))) return;
			const start = A.start(node);
			const end = A.end(node);
			const { line: sl, column: sc } = locConverter.get(start);
			const { line: el, column: ec } = locConverter.get(end);
			addCssExport(
				sl,
				sc,
				el,
				ec,
				name,
				getReexport(name),
				[start, end],
				true,
				CssIcssExportDependency.EXPORT_MODE.ONCE
			);
		};

		/**
		 * Scope a `counter()` / `counters()` / `target-counter()` / `target-counters()` call: the counter-name argument localizes like a `counter-reset` value and a trailing `<counter-style>` ident like a `list-style-type` value, so both keep naming the scoped `counter-*` declaration / `@counter-style` rule.
		 * @param {AstNode[]} cvs the call's argument component values
		 * @param {number} nameIndex comma-separated index of the counter-name argument
		 * @returns {void}
		 */
		const walkCounterFunction = (cvs, nameIndex) => {
			let group = 0;
			let groupNodes = 0;
			/** Sole ident of the current argument, or undefined when the argument isn't a lone ident. */
			let lastIdent;
			for (const cv of cvs) {
				const type = A.type(cv);
				if (type === NodeType.Whitespace) continue;
				if (type === NodeType.Comma) {
					group++;
					groupNodes = 0;
					lastIdent = undefined;
					continue;
				}
				groupNodes++;
				const loneIdent = groupNodes === 1 && type === NodeType.Ident;
				if (group === nameIndex) {
					if (loneIdent) emitCounterIdent(cv, "counter-reset");
					lastIdent = undefined;
				} else {
					lastIdent = loneIdent ? cv : undefined;
				}
			}
			// The counter style is the last argument when it's a lone ident (`counter(n, style)` / `counters(n, sep, style)`).
			if (lastIdent !== undefined && group > nameIndex) {
				emitCounterIdent(lastIdent, "list-style-type");
			}
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
				switch (A.type(v)) {
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
						const nextType = A.type(next);
						if (nextType === NodeType.Ident) {
							const raw = A.value(next);
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
											A.start(v),
											findLeftCurly(source, A.end(next)) + 1
										)}'`,
										locConverter,
										A.start(v),
										A.end(next)
									);
								}
								segmentMode = id;
								if (topLevel) modeData = id;
								// Skip past the colon + ident.
								i += 1;
							}
						} else if (nextType === NodeType.Function) {
							const fn = /** @type {FunctionNode} */ (next);
							const rawName = A.unescapedName(fn);
							const isLocal = equalsLowerCase(rawName, "local");
							if (isLocal || equalsLowerCase(rawName, "global")) {
								// `:local(…)` / `:global(…)`: scope mode to the args and strip the `:name(` … `)` wrapper.
								stripFunctionMarker(v, fn, isLocal);
								walkSelectorList(
									A.children(fn),
									isLocal ? "local" : "global",
									false
								);
								// Skip past the colon + function.
								i += 1;
							}
						}
						break;
					}
					case NodeType.Function: {
						// `::view-transition-group(name .class…)` etc.: scope the part name + classes as custom idents (the `v` char guard skips the slice for the common `:is`/`:not`/… functions).
						const fnNameStart = A.nameStart(v);
						if (
							segmentMode === "local" &&
							(input.charCodeAt(fnNameStart) === CC_LOWER_V ||
								input.charCodeAt(fnNameStart) === CC_UPPER_V) &&
							VIEW_TRANSITION_PART_PSEUDO.test(A.unescapedName(v))
						) {
							walkViewTransitionPart(A.children(v));
							break;
						}
						// Any other function (`:not(…)`, `:is(…)`, …): recurse with the segment mode preserved (only `:local(…)` / `:global(…)`, handled above, switch mode).
						walkSelectorList(A.children(v), segmentMode, false);
						break;
					}
					case NodeType.Hash: {
						if (A.typeFlag(v) !== "id" || segmentMode !== "local") {
							break;
						}
						// ID selectors emit the ICSS export but aren't a `composes:` anchor.
						const idValueStart = A.start(v) + 1;
						const idName = A.unescaped(v);
						const { line: idSl, column: idSc } = locConverter.get(A.start(v));
						const { line: idEl, column: idEc } = locConverter.get(A.end(v));
						recordDeclaration(idName, "id", idSl, idSc);
						addCssExport(
							idSl,
							idSc,
							idEl,
							idEc,
							idName,
							getReexport(idName),
							[idValueStart, A.end(v)],
							true,
							CssIcssExportDependency.EXPORT_MODE.ONCE
						);
						pure.markLocal();
						break;
					}
					case NodeType.SimpleBlock: {
						const block = /** @type {SimpleBlock} */ (v);
						const bt = A.blockToken(block);
						if (bt === "[") {
							// Attribute selectors `[class="foo"]` localize only in local mode.
							if (segmentMode === "local") handleAttributeSelector(block);
						} else if (bt === "(") {
							// `@scope (.foo)` and other parenthesised selector wrappers — recurse into the `(…)` block.
							walkSelectorList(A.children(block), segmentMode, false);
						}
						break;
					}
					case NodeType.Delim: {
						const delim = A.value(v);
						if (delim === "&") {
							// Pure-mode: a nesting `&` inherits a pure ancestor's purity.
							if (topLevel && pure.ancestorHadLocal()) pure.markLocal();
							break;
						}
						if (delim !== ".") break;
						const next = values[i + 1];
						if (!next || A.type(next) !== NodeType.Ident) break;
						if (segmentMode === "local") {
							// `.<ident>` in local mode is a class selector (dep covers the ident bytes only).
							const name = A.unescaped(next);
							// Cursor reads instead of `A.loc` — this is the hottest export site.
							const { line: sl, column: sc } = locConverter.get(A.start(next));
							const { line: el, column: ec } = locConverter.get(A.end(next));
							recordDeclaration(name, "class", sl, sc);
							addCssExport(
								sl,
								sc,
								el,
								ec,
								name,
								getReexport(name),
								[A.start(next), A.end(next)],
								true,
								CssIcssExportDependency.EXPORT_MODE.ONCE
							);
							currentRule.hasLocalAnchor = true;
							currentRule.localIdentifiers.push(name);
							pure.markLocal();
						} else if (icssDefinitions.size !== 0) {
							// `.<ident>` in global mode: not localized, but the ident may be `@value`-defined and need ICSS rewrite.
							const ident = A.value(next);
							if (!isDashedIdentifier(ident) && icssDefinitions.has(ident)) {
								emitICSSSymbol(ident, A.start(next), A.end(next));
							}
						}
						// Skip the consumed ident.
						i += 1;
						break;
					}
					case NodeType.Ident: {
						// ICSS rewrite for a bare `@value`-defined ident used as a type-style selector; only worth the slice when definitions exist.
						if (icssDefinitions.size === 0) break;
						const ident = A.value(v);
						if (!isDashedIdentifier(ident) && icssDefinitions.has(ident)) {
							emitICSSSymbol(ident, A.start(v), A.end(v));
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
		 * @type {({ bailed: true } | { bailed: false, savedAnchor: boolean, savedLocalIdentifierCount: number, savedPrevComposesFile: string | undefined, savedComposesFiles: Set<string> | null })[]}
		 */
		const qualifiedRuleStateStack = [];

		/**
		 * Whether url() deps are emitted here (from `currentStructural`): off in an `@import`
		 * prelude (the import target, unless recovering) and in `@namespace` (an opaque identifier).
		 * @returns {boolean} true when url() deps should be emitted
		 */
		const urlActive = () => {
			if (!this.options.url || !currentStructural) return false;
			if (A.type(currentStructural) === NodeType.AtRule) {
				// `currentAtRuleName` is cached on at-rule enter — no per-value slice.
				if (currentAtRuleName === "@namespace") return false;
				return currentAtRuleName !== "@import" || currentUrlRecovery;
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
			(mayHaveCustomMedia && name === "@custom-media") ||
			(mayHaveCustomSelectors && name === "@custom-selector") ||
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
			const t = A.type(currentStructural);
			if (t === NodeType.AtRule) {
				return !isLocalHandledAtRule(currentAtRuleName);
			}
			if (t === NodeType.Declaration) {
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
			const t = A.type(currentStructural);
			if (t === NodeType.AtRule) {
				return (
					currentAtRuleName !== "@value" &&
					currentAtRuleName !== "@import" &&
					currentAtRuleName !== "@custom-media" &&
					currentAtRuleName !== "@custom-selector"
				);
			}
			if (t === NodeType.Declaration) {
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
			if (!blockBearing || A.declarations(node) || A.childRules(node)) {
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
					A.start(decl),
					A.end(decl)
				);
				return;
			}
			const lastLocalIdentifier = currentRule.localIdentifiers[0];

			// Split the value at top-level commas — each segment is one `<name>+ [from <source>]` group.
			/** @type {AstNode[][]} */
			const groups = [];
			/** @type {AstNode[]} */
			let currentGroup = [];
			for (const cv of A.children(decl)) {
				if (A.type(cv) === NodeType.Comma) {
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
					if (A.type(cv) === NodeType.Whitespace) continue;

					if (phase === "expecting-source") {
						if (A.type(cv) === NodeType.String) {
							fromSource = {
								kind: "string",
								path: source.slice(A.start(cv) + 1, A.end(cv) - 1)
							};
							phase = "done";
							continue;
						}
						if (
							A.type(cv) === NodeType.Ident &&
							equalsLowerCase(A.value(cv), "global")
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

					if (A.type(cv) === NodeType.Ident) {
						const identValue = A.value(cv);
						if (
							equalsLowerCase(identValue, "from") &&
							classNames.length > 0 &&
							nextNonWhitespace(group, i + 1) < group.length
						) {
							phase = "expecting-source";
							continue;
						}
						classNames.push({
							start: A.start(cv),
							end: A.end(cv),
							isGlobal: false
						});
						continue;
					}

					if (A.type(cv) === NodeType.Function) {
						const fn = /** @type {FunctionNode} */ (cv);
						const isGlobal = equalsLowerCase(A.unescapedName(fn), "global");
						for (const inner of A.children(fn)) {
							if (A.type(inner) === NodeType.Ident) {
								classNames.push({
									start: A.start(inner),
									end: A.end(inner),
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
						A.start(errorToken),
						A.end(errorToken)
					);
					return;
				}

				if (classNames.length === 0) continue;

				emitComposesGroup(classNames, fromSource, lastLocalIdentifier);
			}

			// Strip the whole `composes: …;` (property name included) plus trailing same-line whitespace. The `;` and that whitespace aren't AST nodes (a block's contents drop them), so scan the source here.
			let resumeAt = A.end(decl);
			if (source.charCodeAt(A.end(decl)) === CC_SEMICOLON) {
				resumeAt = A.end(decl) + 1;
				while (isWhitespace(source.charCodeAt(resumeAt))) resumeAt++;
			}
			module.addPresentationalDependency(
				new ConstDependency("", [A.nameStart(decl), resumeAt])
			);
		};

		/**
		 * Emit url() deps for a `url(...)` / `src(...)` / `image-set(...)` value function.
		 * @param {FunctionNode} fn the function node
		 * @param {string | undefined} escapedName the unescaped function name when it carries an escape, undefined for the raw byte-range path
		 */
		const emitUrlFunction = (fn, escapedName) => {
			const fnNameStart = A.nameStart(fn);
			const fnNameEnd = A.nameEnd(fn);
			let isUrlOrSrc;
			let isImageSet = false;
			if (escapedName !== undefined) {
				isUrlOrSrc =
					equalsLowerCase(escapedName, "url") ||
					equalsLowerCase(escapedName, "src");
				if (!isUrlOrSrc) isImageSet = IMAGE_SET_FUNCTION.test(escapedName);
			} else {
				const nameLength = fnNameEnd - fnNameStart;
				isUrlOrSrc =
					nameLength === 3 &&
					(rangeEqualsLowerCase(input, fnNameStart, fnNameEnd, "url") ||
						rangeEqualsLowerCase(input, fnNameStart, fnNameEnd, "src"));
				if (!isUrlOrSrc) {
					// Suffix probe first, so only a vendor-prefixed `…-image-set` pays the slice + regex.
					isImageSet =
						nameLength >= 9 &&
						rangeEqualsLowerCase(
							input,
							fnNameEnd - 9,
							fnNameEnd,
							"image-set"
						) &&
						(nameLength === 9 ||
							IMAGE_SET_FUNCTION.test(input.slice(fnNameStart, fnNameEnd)));
				}
			}
			if (isUrlOrSrc) {
				// Quoted `url("…")` / `src("…")`: first non-whitespace value must be the string token.
				const first = A.children(fn)[nextNonWhitespace(A.children(fn), 0)];
				if (!first || A.type(first) !== NodeType.String) return;
				const string = /** @type {Token} */ (first);
				const { ignored, options } = magicCommentsIn(
					[lastTokenEndForComments, A.start(fn)],
					A.start(string),
					A.end(string)
				);
				if (ignored) return;
				const value = normalizeUrl(
					input.slice(A.start(string) + 1, A.end(string) - 1),
					true
				);
				// Ignore `url()`, `url('')` and `url("")`, they are valid by spec
				if (value.length === 0) return;
				const dep = new CssUrlDependency(
					value,
					[A.start(string), A.end(string)],
					"string"
				);
				setDepLoc(dep, A.start(string), A.end(string));
				applyResourceHintDefaults(
					dep,
					value,
					options,
					rangeLoc(A.start(string), A.end(string))
				);
				module.addDependency(dep);
				module.addCodeGenerationDependency(dep);
			} else if (isImageSet) {
				// `image-set(…)`: each comma segment's first string is the URL; advance the magic-comment fence per string.
				lastTokenEndForComments = fnNameEnd + 1;
				let prevStringEnd = A.start(fn);
				let firstInSegment = true;
				for (const cv of A.children(fn)) {
					if (A.type(cv) === NodeType.Comma) {
						firstInSegment = true;
						continue;
					}
					if (A.type(cv) === NodeType.Whitespace) continue;
					const wasFirst = firstInSegment;
					firstInSegment = false;
					if (!wasFirst || A.type(cv) !== NodeType.String) continue;
					const string = /** @type {Token} */ (cv);
					const start = prevStringEnd;
					prevStringEnd = A.end(string);
					const value = normalizeUrl(
						input.slice(A.start(string) + 1, A.end(string) - 1),
						true
					);
					if (value.length === 0) continue;
					const { ignored, options } = magicCommentsIn(
						[start, A.end(string)],
						A.start(string),
						A.end(string)
					);
					if (ignored) continue;
					const dep = new CssUrlDependency(
						value,
						[A.start(string), A.end(string)],
						"url"
					);
					setDepLoc(dep, A.start(string), A.end(string));
					applyResourceHintDefaults(
						dep,
						value,
						options,
						rangeLoc(A.start(string), A.end(string))
					);
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
					A.start(at),
					A.nameEnd(at)
				);
				return;
			}
			const importStart = A.start(at);
			const importNameEnd = A.nameEnd(at);
			// We only accept `;`-terminated @import; block / EOF / `}` ends are silent bails.
			if (source.charCodeAt(A.end(at)) !== CC_SEMICOLON) return;

			// Walk the prelude in spec order (URL → layer? → supports? → media query); anything else joins the media query.
			const { urlNode, layerNode, supportsNode } = parseImportPrelude(
				A.prelude(at)
			);

			const semi = A.end(at) + 1; // position past `;`

			if (!urlNode || (A.type(urlNode) === NodeType.Ident && !isModules)) {
				this._emitWarning(
					state,
					`Expected URL in '${input.slice(importStart, semi)}'`,
					locConverter,
					importStart,
					semi
				);
				// A malformed `@import` still emits orphan url() deps from its prelude — flag it so the value visitors enable url().
				currentUrlRecovery = true;
				return;
			}

			/** @type {string} */
			let url;
			if (A.type(urlNode) === NodeType.Ident) {
				// URL given as identifier — resolve via CSS Modules `@value`.
				const identName = A.value(urlNode);
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
			} else if (A.type(urlNode) === NodeType.Url) {
				const ut = /** @type {UrlToken} */ (urlNode);
				url = normalizeUrl(
					input.slice(A.contentStart(ut), A.contentEnd(ut)),
					false
				);
			} else if (A.type(urlNode) === NodeType.String) {
				url = normalizeUrl(
					input.slice(A.start(urlNode) + 1, A.end(urlNode) - 1),
					true
				);
			} else {
				// url(...) function — first non-whitespace child is the string.
				/** @type {Token | undefined} */
				let string;
				for (const inner of A.children(urlNode)) {
					if (A.type(inner) === NodeType.Whitespace) continue;
					if (A.type(inner) === NodeType.String) {
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
				url = normalizeUrl(
					input.slice(A.start(string) + 1, A.end(string) - 1),
					true
				);
			}

			const newline = skipWhiteLine(input, semi);
			if (
				webpackIgnored([importNameEnd, A.end(urlNode)], importStart, newline)
			) {
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
				if (A.type(layerNode) === NodeType.Function) {
					// `layer(<ident>)` — extract content between `(` and `)`.
					const fn = /** @type {FunctionNode} */ (layerNode);
					layer = input.slice(A.nameEnd(fn) + 1, A.end(fn) - 1).trim();
				} else {
					// Bare `layer` ident — anonymous layer.
					layer = "";
				}
			}

			/** @type {undefined | string} */
			let supports;
			if (supportsNode) {
				supports = input
					.slice(A.nameEnd(supportsNode) + 1, A.end(supportsNode) - 1)
					.trim();
			}

			// Media query = whatever sits between the last url/layer/supports part and the closing `;`, trimmed. Start at the next non-whitespace prelude node (skips the gap, comments included).
			const lastPrefixPart = supportsNode || layerNode || urlNode;
			const afterIdx =
				/** @type {AstNode[]} */ (A.prelude(at)).indexOf(lastPrefixPart) + 1;
			const nextIdx = nextNonWhitespace(A.prelude(at), afterIdx);
			const mediaStart =
				nextIdx < A.prelude(at).length
					? A.start(A.prelude(at)[nextIdx])
					: A.end(at);
			/** @type {undefined | string} */
			let media;
			if (mediaStart !== A.end(at)) {
				media = input.slice(mediaStart, A.end(at)).trim();
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
			const start = A.start(at);
			const nameEnd = A.nameEnd(at);
			const semi = A.end(at);
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
						recordDeclaration(localName, "@value", sl, sc);
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

					recordDeclaration(localName, "@value", sl, sc);
					addCssExport(sl, sc, el, ec, localName, getReexport(value));
				} else {
					icssDefinitions.set(localName, { value });

					recordDeclaration(localName, "@value", sl, sc);
					addCssExport(sl, sc, el, ec, localName, value);
				}
			}

			const dep = new ConstDependency("", [start, atRuleEnd]);
			module.addPresentationalDependency(dep);
		};

		/**
		 * The lone dashed-ident name of a `( … )` block, or `undefined` — `(--foo)` yields `--foo`, `(--foo: 1px)` / `(min-width: 0)` yield `undefined`. `hasExtra` reports whether any non-whitespace token follows the ident (a boolean-context violation).
		 * @param {SimpleBlock} block parenthesised block node
		 * @param {{ hasExtra: boolean }} out extra-token flag output
		 * @returns {string | undefined} the dashed-ident name, or undefined
		 */
		const loneDashedIdentOfBlock = (block, out) => {
			out.hasExtra = false;
			let ident;
			for (const k of A.children(block)) {
				if (A.type(k) === NodeType.Whitespace) continue;
				if (ident !== undefined) {
					out.hasExtra = true;
					return ident;
				}
				if (A.type(k) !== NodeType.Ident) return undefined;
				const v = A.value(k);
				if (!isDashedIdentifier(v)) return undefined;
				ident = v;
			}
			return ident;
		};

		/**
		 * Collect one `@custom-media --name <value>` definition (last-wins) and drop
		 * the rule. A value naming another custom media is kept as an `alias` — the
		 * name it points at may be defined further down the file, and node ids are
		 * recycled per top-level rule, so nothing AST-shaped can outlive the walk.
		 * @param {AtRule} at the `@custom-media` at-rule
		 */
		const collectCustomMedia = (at) => {
			const start = A.start(at);
			const end = A.end(at);
			const ruleEnd = input.charCodeAt(end) === CC_SEMICOLON ? end + 1 : end;
			module.addPresentationalDependency(
				new ConstDependency("", [start, ruleEnd])
			);

			const prelude = A.prelude(at);
			let i = 0;
			while (i < prelude.length && A.type(prelude[i]) === NodeType.Whitespace) {
				i++;
			}
			if (i >= prelude.length || A.type(prelude[i]) !== NodeType.Ident) return;
			const name = A.value(prelude[i]);
			if (!isDashedIdentifier(name)) return;
			i++;

			// Value span after the name, trimmed.
			let vs = i;
			let ve = prelude.length;
			while (vs < ve && A.type(prelude[vs]) === NodeType.Whitespace) vs++;
			while (ve > vs && A.type(prelude[ve - 1]) === NodeType.Whitespace) ve--;
			(customMediaDefs || (customMediaDefs = new Map())).set(
				name,
				classifyCustomMedia(prelude, vs, ve)
			);
		};

		/**
		 * Classify one `@custom-media` value against the live AST.
		 * @param {readonly AstNode[]} prelude the defining at-rule's prelude
		 * @param {number} vs first value token
		 * @param {number} ve one past the last value token
		 * @returns {CustomMediaDefinition} what the value is, aliases unresolved
		 */
		const classifyCustomMedia = (prelude, vs, ve) => {
			if (vs >= ve) return CUSTOM_MEDIA_UNSUPPORTED;
			const extra = { hasExtra: false };

			let hasComma = false;
			for (let k = vs; k < ve; k++) {
				if (A.type(prelude[k]) === NodeType.Comma) {
					hasComma = true;
					break;
				}
			}

			if (!hasComma) {
				const first = prelude[vs];
				const valueText = input.slice(A.start(first), A.end(prelude[ve - 1]));
				// A `(--x)` standing alone is this value spelled as another name.
				if (ve - vs === 1 && A.type(first) === NodeType.SimpleBlock) {
					const nested = loneDashedIdentOfBlock(
						/** @type {SimpleBlock} */ (first),
						extra
					);
					if (nested !== undefined && !extra.hasExtra) {
						return { kind: "alias", name: nested };
					}
				}
				// A reference anywhere else in the value has no resolution step of its
				// own — only a `@media` prelude's uses are scanned — so writing this
				// value out would emit the reference unresolved.
				if (hasCustomMediaRef(prelude, vs, ve)) return CUSTOM_MEDIA_UNSUPPORTED;
				if (A.type(first) === NodeType.SimpleBlock) {
					return { kind: "condition", text: valueText };
				}
				if (A.type(first) !== NodeType.Ident) return CUSTOM_MEDIA_UNSUPPORTED;
				const s = A.start(first);
				const e = A.end(first);
				if (ve - vs === 1) {
					if (rangeEqualsLowerCase(input, s, e, "true")) {
						return CUSTOM_MEDIA_TRUE;
					}
					if (rangeEqualsLowerCase(input, s, e, "false")) {
						return CUSTOM_MEDIA_FALSE;
					}
				}
				if (rangeEqualsLowerCase(input, s, e, "not")) {
					// `not (…)` is a media condition (wrap so it stays a media-in-parens);
					// `not <type>` is a media type.
					let j = vs + 1;
					while (j < ve && A.type(prelude[j]) === NodeType.Whitespace) j++;
					if (j < ve && A.type(prelude[j]) === NodeType.SimpleBlock) {
						return { kind: "condition", text: `(${valueText})` };
					}
					return { kind: "type", text: valueText };
				}
				// `screen`, `only screen`, `screen and (…)`, …
				return { kind: "type", text: valueText };
			}

			// Comma list → `(seg1 or seg2 …)`; supported only when every segment is a
			// media-in-parens (or a name standing for one).
			/** @type {({ text: string } | { alias: string })[]} */
			const parts = [];
			let ok = true;
			/** @type {AstNode[]} */
			let seg = [];
			const flush = () => {
				let a = 0;
				let b = seg.length;
				while (a < b && A.type(seg[a]) === NodeType.Whitespace) a++;
				while (b > a && A.type(seg[b - 1]) === NodeType.Whitespace) b--;
				if (a >= b) {
					ok = false;
					return;
				}
				const f = seg[a];
				const text = input.slice(A.start(f), A.end(seg[b - 1]));
				if (b - a === 1 && A.type(f) === NodeType.SimpleBlock) {
					const nested = loneDashedIdentOfBlock(
						/** @type {SimpleBlock} */ (f),
						extra
					);
					if (extra.hasExtra) ok = false;
					else if (nested === undefined) parts.push({ text });
					else parts.push({ alias: nested });
					return;
				}
				if (
					A.type(f) === NodeType.Ident &&
					rangeEqualsLowerCase(input, A.start(f), A.end(f), "not") &&
					!hasCustomMediaRef(seg, a, b)
				) {
					parts.push({ text: `(${text})` });
					return;
				}
				ok = false;
			};
			for (let k = vs; k < ve; k++) {
				if (A.type(prelude[k]) === NodeType.Comma) {
					flush();
					seg = [];
				} else {
					seg.push(prelude[k]);
				}
			}
			flush();
			return ok ? { kind: "or", parts } : CUSTOM_MEDIA_UNSUPPORTED;
		};

		/**
		 * What a `@custom-media` name resolves to, memoized. An undefined name and a
		 * definition cycle both resolve to unsupported (the use site warns).
		 * @param {string} name the dashed ident
		 * @param {Set<string>} resolving names currently being resolved
		 * @returns {CustomMediaValue} what the name resolves to
		 */
		const resolveCustomMediaValue = (name, resolving) => {
			const cached = customMediaValues && customMediaValues.get(name);
			if (cached !== undefined) return cached;
			const def = customMediaDefs && customMediaDefs.get(name);
			if (def === undefined || resolving.has(name)) {
				return CUSTOM_MEDIA_UNSUPPORTED;
			}
			resolving.add(name);
			/** @type {CustomMediaValue} */
			let value;
			if (def.kind === "alias") {
				const inner = resolveCustomMediaValue(def.name, resolving);
				// A media type cannot sit in parens, so a name standing for one is no value.
				value = inner.kind === "type" ? CUSTOM_MEDIA_UNSUPPORTED : inner;
			} else if (def.kind === "or") {
				/** @type {string[]} */
				const texts = [];
				let ok = true;
				let anyTrue = false;
				for (const part of def.parts) {
					if (!("alias" in part)) {
						texts.push(part.text);
						continue;
					}
					const inner = resolveCustomMediaValue(part.alias, resolving);
					// A media query list is an `or`, so a constant segment drops out of it.
					if (inner.kind === "boolean") anyTrue = anyTrue || inner.value;
					else if (inner.kind === "condition") texts.push(inner.text);
					else ok = false;
				}
				value = !ok
					? CUSTOM_MEDIA_UNSUPPORTED
					: anyTrue
						? CUSTOM_MEDIA_TRUE
						: texts.length === 0
							? CUSTOM_MEDIA_FALSE
							: {
									kind: "condition",
									text:
										texts.length === 1 ? texts[0] : `(${texts.join(" or ")})`
								};
			} else {
				value = def;
			}
			resolving.delete(name);
			(customMediaValues || (customMediaValues = new Map())).set(name, value);
			return value;
		};

		/**
		 * Whether a node is the media keyword `word` (media queries are ASCII
		 * case-insensitive).
		 * @param {AstNode} node candidate node
		 * @param {string} word lower-case keyword
		 * @returns {boolean} true on a match
		 */
		const isMediaKeyword = (node, word) =>
			A.type(node) === NodeType.Ident &&
			rangeEqualsLowerCase(input, A.start(node), A.end(node), word);

		/**
		 * First significant index in `tokens[from…to)`.
		 * @param {readonly AstNode[]} tokens token list
		 * @param {number} from first index
		 * @param {number} to one past the last index
		 * @returns {number} the trimmed start
		 */
		const mediaTrimStart = (tokens, from, to) => {
			let a = from;
			while (a < to && A.type(tokens[a]) === NodeType.Whitespace) a++;
			return a;
		};

		/**
		 * One past the last significant index in `tokens[from…to)`.
		 * @param {readonly AstNode[]} tokens token list
		 * @param {number} from first index
		 * @param {number} to one past the last index
		 * @returns {number} the trimmed end
		 */
		const mediaTrimEnd = (tokens, from, to) => {
			let b = to;
			while (b > from && A.type(tokens[b - 1]) === NodeType.Whitespace) b--;
			return b;
		};

		/**
		 * The source text spanned by `tokens[from…to)`.
		 * @param {readonly AstNode[]} tokens token list
		 * @param {number} from first index
		 * @param {number} to one past the last index
		 * @returns {string} the source slice
		 */
		const mediaText = (tokens, from, to) =>
			input.slice(A.start(tokens[from]), A.end(tokens[to - 1]));

		// One flag object for the whole parse: `loneDashedIdentOfBlock` writes it and
		// every caller reads it back before the next call.
		const mediaExtra = { hasExtra: false };

		/**
		 * Whether any `(--name)` reference is reachable inside `node`. `childAt` walks
		 * the children without materializing the list.
		 * @param {AstNode} node a block or function node
		 * @returns {boolean} true when a reference is present
		 */
		const hasCustomMediaRefIn = (node) => {
			const count = A.childCount(node);
			for (let k = 0; k < count; k++) {
				const child = A.childAt(node, k);
				const type = A.type(child);
				if (type !== NodeType.SimpleBlock && type !== NodeType.Function) {
					continue;
				}
				if (
					type === NodeType.SimpleBlock &&
					loneDashedIdentOfBlock(
						/** @type {SimpleBlock} */ (child),
						mediaExtra
					) !== undefined
				) {
					return true;
				}
				if (hasCustomMediaRefIn(child)) return true;
			}
			return false;
		};

		/**
		 * Whether any `(--name)` reference is reachable in `tokens[from…to)`. Cheap
		 * enough to run over every `@media` prelude so one without a reference builds
		 * no tree at all.
		 * @param {readonly AstNode[]} tokens token list
		 * @param {number} from first index
		 * @param {number} to one past the last index
		 * @returns {boolean} true when a reference is present
		 */
		const hasCustomMediaRef = (tokens, from, to) => {
			for (let i = from; i < to; i++) {
				const node = tokens[i];
				const type = A.type(node);
				if (type !== NodeType.SimpleBlock && type !== NodeType.Function) {
					continue;
				}
				if (
					type === NodeType.SimpleBlock &&
					loneDashedIdentOfBlock(
						/** @type {SimpleBlock} */ (node),
						mediaExtra
					) !== undefined
				) {
					return true;
				}
				if (hasCustomMediaRefIn(node)) return true;
			}
			return false;
		};

		/**
		 * Capture one `<media-in-parens>` — a reference to a custom media name, a
		 * parenthesised sub-condition, or an opaque feature test.
		 * @param {readonly AstNode[]} tokens token list
		 * @param {number} from first index
		 * @param {number} to one past the last index
		 * @param {boolean} leading whether the term starts a top-level query
		 * @param {CustomMediaUse[]} uses the prelude's use list, appended to
		 * @returns {MediaNode} the captured term
		 */
		const captureMediaInParens = (tokens, from, to, leading, uses) => {
			const a = mediaTrimStart(tokens, from, to);
			const b = mediaTrimEnd(tokens, a, to);
			if (a >= b) return { kind: "text", text: "" };
			const text = mediaText(tokens, a, b);
			if (b - a !== 1 || A.type(tokens[a]) !== NodeType.SimpleBlock) {
				return { kind: "text", text };
			}
			const block = /** @type {SimpleBlock} */ (tokens[a]);
			const name = loneDashedIdentOfBlock(block, mediaExtra);
			if (name !== undefined) {
				const use = {
					name,
					start: A.start(block),
					end: A.end(block),
					invalid: mediaExtra.hasExtra,
					leading
				};
				uses.push(use);
				return { kind: "ref", text, use };
			}
			const children = A.children(block);
			const inner = captureMediaCondition(children, 0, children.length, uses);
			return inner.kind === "text"
				? { kind: "text", text }
				: { kind: "group", operand: inner };
		};

		/**
		 * Capture a `<media-condition>` — `not <in-parens>`, or an `and` / `or` chain
		 * of them (CSS never mixes the two at one level).
		 * @param {readonly AstNode[]} tokens token list
		 * @param {number} from first index
		 * @param {number} to one past the last index
		 * @param {CustomMediaUse[]} uses the prelude's use list, appended to
		 * @returns {MediaNode} the captured condition
		 */
		const captureMediaCondition = (tokens, from, to, uses) => {
			const a = mediaTrimStart(tokens, from, to);
			const b = mediaTrimEnd(tokens, a, to);
			if (a >= b) return { kind: "text", text: "" };
			if (isMediaKeyword(tokens[a], "not")) {
				return {
					kind: "not",
					operand: captureMediaInParens(tokens, a + 1, b, false, uses)
				};
			}
			/** @type {MediaNode[]} */
			const terms = [];
			let isOr = false;
			let start = a;
			for (let i = a; i <= b; i++) {
				const atEnd = i === b;
				if (
					!atEnd &&
					!isMediaKeyword(tokens[i], "and") &&
					!isMediaKeyword(tokens[i], "or")
				) {
					continue;
				}
				if (!atEnd && isMediaKeyword(tokens[i], "or")) isOr = true;
				terms.push(captureMediaInParens(tokens, start, i, start === a, uses));
				start = i + 1;
			}
			if (terms.length === 1) return terms[0];
			return { kind: "chain", isOr, terms };
		};

		/**
		 * Capture one `<media-query>` — a bare condition, or a media type with an
		 * optional `and` chain after it.
		 * @param {readonly AstNode[]} tokens token list
		 * @param {number} from first index
		 * @param {number} to one past the last index
		 * @param {CustomMediaUse[]} uses the prelude's use list, appended to
		 * @returns {MediaNode} the captured query
		 */
		const captureMediaQuery = (tokens, from, to, uses) => {
			const a = mediaTrimStart(tokens, from, to);
			const b = mediaTrimEnd(tokens, a, to);
			if (a >= b) return { kind: "text", text: "" };
			const rest = mediaTrimStart(tokens, a + 1, b);
			const startsWithType =
				A.type(tokens[a]) === NodeType.Ident &&
				(!isMediaKeyword(tokens[a], "not") ||
					rest >= b ||
					A.type(tokens[rest]) !== NodeType.SimpleBlock);
			if (!startsWithType) return captureMediaCondition(tokens, a, b, uses);
			// `[not | only]? <type> [and <condition-without-or>]?` — the type itself is
			// never constant, so only the `and` chain after it can fold.
			let split = b;
			for (let i = a; i < b; i++) {
				if (isMediaKeyword(tokens[i], "and")) {
					split = i;
					break;
				}
			}
			return {
				kind: "typed",
				text: mediaText(tokens, a, mediaTrimEnd(tokens, a, split)),
				rest:
					split === b ? null : captureMediaCondition(tokens, split + 1, b, uses)
			};
		};

		/**
		 * Record one `@media` prelude, the custom-media references inside it, and the
		 * boolean shape needed to fold it once the references resolve.
		 * @param {AtRule} at the `@media` at-rule
		 */
		const collectMediaQuery = (at) => {
			const prelude = A.prelude(at);
			const start = mediaTrimStart(prelude, 0, prelude.length);
			const end = mediaTrimEnd(prelude, start, prelude.length);
			if (start >= end || !hasCustomMediaRef(prelude, start, end)) return;
			/** @type {CustomMediaUse[]} */
			const uses = [];
			/** @type {MediaNode[]} */
			const queries = [];
			let queryStart = start;
			for (let i = start; i <= end; i++) {
				if (i !== end && A.type(prelude[i]) !== NodeType.Comma) continue;
				queries.push(captureMediaQuery(prelude, queryStart, i, uses));
				queryStart = i + 1;
			}
			if (uses.length === 0) return;
			(customMediaQueries || (customMediaQueries = [])).push({
				queries,
				start: A.start(prelude[start]),
				end: A.end(prelude[end - 1]),
				uses
			});
		};

		/**
		 * Fold a captured media node against the resolved definitions. A reference the
		 * resolver could not classify keeps its source text, so it prints as authored.
		 * @param {MediaNode} node the captured node
		 * @param {Set<string>} resolving names currently being resolved
		 * @returns {boolean | string} the constant, or the node's text
		 */
		const foldMediaNode = (node, resolving) => {
			switch (node.kind) {
				case "text":
					return node.text;
				case "ref": {
					const value = resolveCustomMediaValue(node.use.name, resolving);
					if (node.use.invalid) return node.text;
					if (value.kind === "boolean") return value.value;
					if (value.kind === "condition") return value.text;
					if (value.kind === "type" && node.use.leading) return value.text;
					return node.text;
				}
				case "group": {
					const inner = foldMediaNode(node.operand, resolving);
					return typeof inner === "boolean" ? inner : `(${inner})`;
				}
				case "not": {
					const operand = foldMediaNode(node.operand, resolving);
					return typeof operand === "boolean" ? !operand : `not ${operand}`;
				}
				case "chain": {
					/** @type {string[]} */
					const kept = [];
					for (const term of node.terms) {
						const folded = foldMediaNode(term, resolving);
						if (folded === node.isOr) return node.isOr;
						if (typeof folded !== "boolean") kept.push(folded);
					}
					if (kept.length === 0) return !node.isOr;
					if (kept.length === 1) return kept[0];
					return kept.join(node.isOr ? " or " : " and ");
				}
				default: {
					if (node.rest === null) return node.text;
					const rest = foldMediaNode(node.rest, resolving);
					if (rest === false) return false;
					if (rest === true) return node.text;
					return `${node.text} and ${rest}`;
				}
			}
		};

		/**
		 * Fold a whole `@media` prelude. A query that is always false leaves the list;
		 * one that is always true makes the list match everywhere (`all`), and a list
		 * with nothing left matches nowhere (`not all`).
		 * @param {MediaNode[]} queries the prelude's captured queries
		 * @param {Set<string>} resolving names currently being resolved
		 * @returns {string} the folded prelude
		 */
		const foldMediaPrelude = (queries, resolving) => {
			/** @type {string[]} */
			const kept = [];
			for (const query of queries) {
				const folded = foldMediaNode(query, resolving);
				if (folded === true) return "all";
				if (folded !== false && folded !== "") kept.push(folded);
			}
			return kept.length === 0 ? "not all" : kept.join(", ");
		};

		/**
		 * Collect one `@custom-selector :--name <selector-list>` definition (last-wins) and drop the rule.
		 * @param {AtRule} at the `@custom-selector` at-rule
		 */
		const collectCustomSelector = (at) => {
			const start = A.start(at);
			const end = A.end(at);
			const ruleEnd = input.charCodeAt(end) === CC_SEMICOLON ? end + 1 : end;
			module.addPresentationalDependency(
				new ConstDependency("", [start, ruleEnd])
			);

			const prelude = A.prelude(at);
			let i = 0;
			while (i < prelude.length && A.type(prelude[i]) === NodeType.Whitespace) {
				i++;
			}
			if (i + 1 >= prelude.length || A.type(prelude[i]) !== NodeType.Colon) {
				return;
			}
			const nameNode = prelude[i + 1];
			if (
				A.type(nameNode) !== NodeType.Ident ||
				A.end(prelude[i]) !== A.start(nameNode)
			) {
				return;
			}
			const name = A.value(nameNode);
			if (!isDashedIdentifier(name)) return;
			const list = input.slice(A.end(nameNode), end).trim();
			if (list.length === 0) return;
			(customSelectorDefs || (customSelectorDefs = new Map())).set(name, list);
		};

		/**
		 * Record every `:--name` custom-selector reference in a selector prelude (recursing into `:is(…)` etc.) for post-walk expansion. A `:--name` is a colon immediately followed by a dashed ident.
		 * @param {readonly AstNode[]} tokens selector prelude (or nested) tokens
		 */
		const scanCustomSelectorUses = (tokens) => {
			for (let k = 0; k < tokens.length; k++) {
				const t = tokens[k];
				const tt = A.type(t);
				if (tt === NodeType.Colon) {
					const next = tokens[k + 1];
					if (
						next &&
						A.type(next) === NodeType.Ident &&
						A.end(t) === A.start(next) &&
						isDashedIdentifier(A.value(next))
					) {
						(customSelectorUses || (customSelectorUses = [])).push({
							name: A.value(next),
							start: A.start(t),
							end: A.end(next)
						});
					}
				} else if (tt === NodeType.Function || tt === NodeType.SimpleBlock) {
					scanCustomSelectorUses(A.children(t));
				}
			}
		};

		/**
		 * Rewrite the collected `@custom-media` / `@custom-selector` uses now that all (possibly later-defined) definitions are known; warns on invalid, unknown, or media-type-in-a-non-leading-position custom-media uses.
		 */
		const resolveCustomMediaAndSelectors = () => {
			if (customMediaQueries) {
				/** @type {Set<string>} */
				const resolving = new Set();
				for (const query of customMediaQueries) {
					let hasBoolean = false;
					for (const use of query.uses) {
						if (use.invalid) {
							this._emitWarning(
								state,
								`Custom media query '${use.name}' must be used in a boolean context`,
								locConverter,
								use.start,
								use.end
							);
							continue;
						}
						const value = resolveCustomMediaValue(use.name, resolving);
						if (value.kind === "unsupported") {
							this._emitWarning(
								state,
								customMediaDefs && customMediaDefs.has(use.name)
									? `Custom media query '${use.name}' has a value that cannot be resolved and was left as written`
									: `Unknown custom media query '${use.name}'`,
								locConverter,
								use.start,
								use.end
							);
						} else if (value.kind === "boolean") {
							hasBoolean = true;
						} else if (value.kind === "type" && !use.leading) {
							this._emitWarning(
								state,
								`Custom media query '${use.name}' resolves to a media type and can only be used at the start of a media query`,
								locConverter,
								use.start,
								use.end
							);
						}
					}
					// `true` / `false` have no `<media-in-parens>` spelling, so a prelude
					// holding one is rewritten whole — every other use in it folds with it.
					if (hasBoolean) {
						module.addPresentationalDependency(
							new ConstDependency(foldMediaPrelude(query.queries, resolving), [
								query.start,
								query.end
							])
						);
						continue;
					}
					for (const use of query.uses) {
						if (use.invalid) continue;
						const value = resolveCustomMediaValue(use.name, resolving);
						if (
							value.kind === "condition" ||
							(value.kind === "type" && use.leading)
						) {
							module.addPresentationalDependency(
								new ConstDependency(value.text, [use.start, use.end])
							);
						}
					}
				}
			}
			if (customSelectorUses) {
				for (const use of customSelectorUses) {
					const list = customSelectorDefs && customSelectorDefs.get(use.name);
					if (list === undefined) continue;
					module.addPresentationalDependency(
						new ConstDependency(`:is(${list})`, [use.start, use.end])
					);
				}
			}
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
			// Only `view-transition-*` and `counter-*` legitimately take a dashed-ident value; other known properties keep the historical plain-ident handling.
			const isViewTransitionProperty = Boolean(
				declPropertyName.startsWith("view-transition")
			);
			const isCounterProperty = Boolean(
				declPropertyName.startsWith("counter-")
			);
			const isGridTemplate = isGridProperty
				? Boolean(
						declPropertyName === "grid" ||
						declPropertyName === "grid-template" ||
						declPropertyName === "grid-template-columns" ||
						declPropertyName === "grid-template-rows"
					)
				: false;
			const keywords =
				/** @type {Map<string, number>} */
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
				// Only grid-line names are declaration sites here; property-value references (`animation: foo`) are usages.
				if (isGridProperty) recordDeclaration(name, "grid identifier", sl, sc);
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
					switch (A.type(cv)) {
						case NodeType.Comma:
							parsedKeywords = Object.create(null);
							break;
						case NodeType.Delim:
							afterExclamation = A.value(cv) === "!";
							break;
						case NodeType.Ident: {
							if (isGridTemplate) break;
							if (afterExclamation) {
								afterExclamation = false;
								break;
							}
							const identifier = A.value(cv);
							// `view-transition-name: --foo` / `counter-reset: --foo` — a dashed name scopes as a custom property under `dashedIdents`, not as a plain ident export.
							if (
								(isViewTransitionProperty || isCounterProperty) &&
								isDashedIdentifier(identifier)
							) {
								if (this.options.dashedIdents) {
									emitDashedIdentExport(A.start(cv), A.end(cv));
								}
								break;
							}
							// Values are almost always lowercase already — avoid the copy.
							const keyword = toLowerCaseIfNeeded(identifier);
							parsedKeywords[keyword] =
								typeof parsedKeywords[keyword] !== "undefined"
									? parsedKeywords[keyword] + 1
									: 0;
							const limit = keywords.get(keyword);
							if (limit !== undefined && parsedKeywords[keyword] < limit) {
								break;
							}
							emit(A.start(cv), A.end(cv));
							break;
						}
						case NodeType.String: {
							if (
								declPropertyName === "animation" ||
								declPropertyName === "animation-name"
							) {
								emit(A.start(cv), A.end(cv), true);
							}
							if (
								declPropertyName === "grid" ||
								declPropertyName === "grid-template" ||
								declPropertyName === "grid-template-areas"
							) {
								// Raw offsets: a match index into the unescaped text would
								// slide the replaced range past every escape before it.
								const names = gridAreaNames(
									source,
									A.start(cv) + 1,
									A.end(cv) - 1
								);
								for (const [nameStart, nameEnd] of names) {
									emit(nameStart, nameEnd, false);
								}
							}
							break;
						}
						case NodeType.SimpleBlock: {
							const block = /** @type {SimpleBlock} */ (cv);
							if (A.blockToken(block) === "[") {
								// Collect identifiers until the first non-ident token (`<line-names> = '[' <custom-ident>* ']'`).
								for (const inner of A.children(block)) {
									if (A.type(inner) === NodeType.Whitespace) continue;
									if (A.type(inner) !== NodeType.Ident) break;
									emit(A.start(inner), A.end(inner));
								}
							} else if (isGridTemplate) {
								walkExports(A.children(block));
							}
							break;
						}
						case NodeType.Function:
							// `repeat(…)` line names, and the `counter-reset: reversed(name)` wrapper — but not `local()`/`global()`, whose idents the value visitors own.
							if (
								isGridTemplate ||
								(isCounterProperty &&
									equalsLowerCase(A.unescapedName(cv), "reversed"))
							) {
								walkExports(A.children(cv));
							}
							break;
						// Other types carry no ICSS-export information.
					}
				}
			};
			walkExports(A.children(decl));
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
			for (const cv of A.prelude(at)) {
				const cvType = A.type(cv);
				if (cvType === NodeType.Whitespace) continue;
				if (cvType === NodeType.String) {
					if (acceptString) pure.markLocal();
					break;
				}
				if (cvType === NodeType.Ident) {
					if (!acceptIdent) break;
					if (
						isContainer &&
						isContainerKeyword(source, A.start(cv), A.end(cv))
					) {
						continue;
					}
					pure.markLocal();
					break;
				}
				if (cvType === NodeType.Function) {
					if (equalsLowerCase(A.unescapedName(cv), "local")) {
						pure.markLocal();
					}
					break;
				}
			}
		};

		// Drive the walk through SourceProcessor: structural enter / exit map to the `walkAst…Enter` / `…Exit` halves; value visitors handle url / ICSS / local-global.
		/** @type {VisitorMap} */
		const visitors = {
			[NodeType.Comment]: commentVisitor,
			[NodeType.AtRule]: {
				// At-rule enter: scope save, name dispatch, prelude value context, pure-block push.
				enter: (path) => {
					const node = path.node;
					const at = /** @type {AtRule} */ (node);
					const topLevel = path.parent === null;
					currentUrlRecovery = false;
					advanceCommentCursor(A.start(at));
					const savedAnchor = currentRule.hasLocalAnchor;
					// Rollback point: nested walks append to the shared list; the exit
					// truncates back to this length (no per-rule copy).
					const savedLocalIdentifierCount = currentRule.localIdentifiers.length;
					const name = `@${toLowerCaseIfNeeded(A.unescapedName(at))}`;
					switch (name) {
						case "@namespace": {
							this._emitWarning(
								state,
								"'@namespace' is not supported in bundled CSS",
								locConverter,
								A.start(at),
								A.nameEnd(at)
							);
							break;
						}
						case "@charset": {
							if (/** @type {CssModule} */ (module).exportType !== "style") {
								const atEnd = A.end(at);
								const atRuleEnd =
									source.charCodeAt(atEnd) === CC_SEMICOLON ? atEnd + 1 : atEnd;
								const dep = new ConstDependency("", [A.start(at), atRuleEnd]);
								module.addPresentationalDependency(dep);
								const string = A.prelude(at).find(
									(v) => A.type(v) !== NodeType.Whitespace
								);
								if (string && A.type(string) === NodeType.String) {
									/** @type {CssModuleBuildInfo} */
									(module.buildInfo).charset = source
										.slice(A.start(string) + 1, A.end(string) - 1)
										.toUpperCase();
								}
							}
							break;
						}
						case "@import": {
							handleImportAtRule(at, topLevel);
							break;
						}
						case "@custom-media": {
							if (mayHaveCustomMedia) collectCustomMedia(at);
							break;
						}
						case "@custom-selector": {
							if (mayHaveCustomSelectors) collectCustomSelector(at);
							break;
						}
						case "@media": {
							if (mayHaveCustomMedia) collectMediaQuery(at);
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
								processLocalAtRule(
									at,
									{
										string: mode === "local",
										identifier: mode === "local"
									},
									"@keyframes"
								);
							} else if (
								this.options.customIdents &&
								name === "@counter-style"
							) {
								processLocalAtRule(
									at,
									{
										identifier: mode === "local"
									},
									"@counter-style"
								);
							} else if (this.options.container && name === "@container") {
								processLocalAtRule(
									at,
									{
										identifier: mode === "local" ? /^(none|and|or|not)$/ : false
									},
									"@container"
								);
							}
						}
					}

					// `@scope (.x) to (.y)` — walk the prelude as a selector list.
					if (
						isModules &&
						equalsLowerCase(A.unescapedName(at), "scope") &&
						A.prelude(at).length > 0
					) {
						walkSelectorList(
							A.prelude(at),
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
					currentDeclCounterActive = false;
					dashed.active = false;
					// `@import` url() is the import target — only walk its prelude for url deps on malformed-import recovery.
					if (this.options.url && (name !== "@import" || currentUrlRecovery)) {
						lastTokenEndForComments = A.nameEnd(at);
					}
					// Dashed-ident scoping over the prelude (the Ident / Function visitors emit).
					dashed.active = Boolean(
						this.options.dashedIdents &&
						isModules &&
						!isProcessedByLocalAtRule &&
						effectiveLocalMode &&
						!(mayHaveCustomMedia && name === "@media")
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

					// pure.stack push for block-bearing at-rules (pure-off builds skip
					// the frame object — every consumer inside is a no-op then).
					const atDecls = A.declarations(at);
					const atChildRules = A.childRules(at);
					const atHasBlock = Boolean(atDecls || atChildRules);
					const atBlockStart = A.blockStart(at);
					if (pure.enabled && atHasBlock && atBlockStart !== -1) {
						const isAtRulePrelude = isPureBodyAtRule(name);
						if (isAtRulePrelude) pure.finalizeSelector();
						pure.enterBlock({
							isRulePrelude: isAtRulePrelude,
							treatAsLeaf: atTreatAsLeaf,
							ownSkip: atSkipChildren,
							declarations: atDecls,
							childRules: atChildRules,
							preludeStart: A.start(at),
							preludeEnd: atBlockStart
						});
					}

					atRuleStateStack.push({
						savedAnchor,
						savedLocalIdentifierCount,
						name,
						hasBlock: atHasBlock,
						endsWithSemicolon: source.charCodeAt(A.end(at)) === CC_SEMICOLON,
						fontPreloaded: false
					});
				},
				// At-rule exit: pure-frame finalization, `suppressNextRulePrelude`, scope restore, top-level reset.
				exit: (path) => {
					const node = path.node;
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
					currentRule.localIdentifiers.length = state.savedLocalIdentifierCount;
					if (path.parent === null) finishTopLevelRule(node, true);
				}
			},
			[NodeType.QualifiedRule]: {
				// Qualified-rule enter: scope setup, selector + prelude context, pure-block push; `:import` / `:export` bail via `path.skipChildren()`.
				enter: (path) => {
					const node = path.node;
					const rule = /** @type {QualifiedRule} */ (node);
					const topLevel = path.parent === null;
					advanceCommentCursor(A.start(rule));
					// One prelude materialization per rule, shared by the scans below
					// (null in plain mode, which never reads the array).
					const rulePrelude =
						isModules || mayHaveCustomSelectors ? A.prelude(rule) : null;
					// `:--name` custom-selector references (dashed idents never collide with the `:import`/`:export` ICSS preludes below).
					if (mayHaveCustomSelectors && rulePrelude !== null) {
						scanCustomSelectorUses(rulePrelude);
					}
					// `:import(…) { … }` / `:export { … }` ICSS pseudo-rules are processed inline at top level; nested ones bail out.
					if (isModules && rulePrelude !== null) {
						const firstIdx = nextNonWhitespace(rulePrelude, 0);
						if (
							firstIdx + 1 < rulePrelude.length &&
							A.type(rulePrelude[firstIdx]) === NodeType.Colon
						) {
							const second = rulePrelude[firstIdx + 1];
							const secondType = A.type(second);
							const rawName =
								secondType === NodeType.Ident
									? A.value(second)
									: secondType === NodeType.Function
										? A.name(second)
										: "";
							const isImport = equalsLowerCase(rawName, "import");
							if (isImport || equalsLowerCase(rawName, "export")) {
								if (topLevel) {
									const startColon = A.start(rulePrelude[firstIdx]);
									const endAfterBody = processImportOrExport(
										isImport ? 0 : 1,
										second,
										rule
									);
									module.addPresentationalDependency(
										new ConstDependency("", [startColon, endAfterBody])
									);
									if (A.blockStart(rule) !== -1) {
										A.setBlockEnd(rule, endAfterBody);
									}
									A.setEnd(rule, endAfterBody);
								} else if (A.blockStart(rule) !== -1) {
									// Nested `:import` / `:export` — leave the body alone.
									A.setEnd(rule, A.blockEnd(rule));
								}
								// Don't recurse into the body — handled inline above.
								path.skipChildren();
								qualifiedRuleStateStack.push({ bailed: true });
								return;
							}
						}
					}
					// Reset the anchor flag for this rule's body; nested `composes:` sees
					// parent + own class names in the shared identifier list, rolled back
					// by length on exit (no per-rule copy).
					const savedAnchor = currentRule.hasLocalAnchor;
					const savedLocalIdentifierCount = currentRule.localIdentifiers.length;
					currentRule.hasLocalAnchor = false;
					// Composes-state reset between rules (saved / restored around this rule); composesFiles is swapped out and re-created lazily only if this rule composes.
					const savedPrevComposesFile = currentRule.composesPrevFile;
					const savedComposesFiles = currentRule.composesFiles;
					currentRule.composesPrevFile = undefined;
					currentRule.composesFiles = null;
					qualifiedRuleStateStack.push({
						bailed: false,
						savedAnchor,
						savedLocalIdentifierCount,
						savedPrevComposesFile,
						savedComposesFiles
					});
					// Selectors are only CSS-Modules-relevant when `isModules` holds.
					if (isModules && rulePrelude !== null) {
						walkSelectorList(
							rulePrelude,
							/** @type {"local" | "global"} */ (
								mode === "local" ? "local" : "global"
							)
						);
					}
					// A malformed declaration can leave orphan `url(...)` in the prelude — let the url visitor pick those up.
					currentStructural = rule;
					currentDeclCounterActive = false;
					dashed.active = false;
					dashed.emit = false;
					if (this.options.url && A.childCount(rule) > 0) {
						lastTokenEndForComments = A.start(A.childAt(rule, 0));
					}
					// Dashed-ident scoping for the deprecated `--foo: { … }` custom-property-set syntax (prelude starts with a dashed-ident).
					if (
						this.options.dashedIdents &&
						isModules &&
						rulePrelude !== null &&
						rulePrelude.length > 0
					) {
						const first = rulePrelude[nextNonWhitespace(rulePrelude, 0)];
						if (
							first &&
							A.type(first) === NodeType.Ident &&
							rangeIsDashedIdentifier(source, A.start(first), A.end(first))
						) {
							const effectiveLocalMode = isEffectivelyLocal();
							if (effectiveLocalMode) {
								dashed.active = true;
								dashed.emit = true;
							}
						}
					}
					// Pure-mode: report an impure prelude (if leaf-ish) and push the inherited-context frame before walking the body.
					if (!pure.enabled) return;
					const ruleBlockStart = A.blockStart(rule);
					pure.enterBlock({
						isRulePrelude: true,
						treatAsLeaf: false,
						ownSkip: false,
						declarations: A.declarations(rule),
						childRules: A.childRules(rule),
						preludeStart: A.start(rule),
						preludeEnd: ruleBlockStart !== -1 ? ruleBlockStart : A.end(rule)
					});
				},
				// Qualified-rule exit: pure-frame finalization, scope restore, top-level reset; no-op for bailed ICSS.
				exit: (path) => {
					const node = path.node;
					const state = qualifiedRuleStateStack.pop();
					if (!state || state.bailed) return;
					pure.exitBlock();
					currentRule.hasLocalAnchor = state.savedAnchor;
					currentRule.localIdentifiers.length = state.savedLocalIdentifierCount;
					currentRule.composesPrevFile = state.savedPrevComposesFile;
					currentRule.composesFiles = state.savedComposesFiles;
					if (path.parent === null) finishTopLevelRule(node, false);
				}
			},
			// Top-level declarations are parse errors (dropped by `parseAStylesheet`), so a declaration's parent is always a block.
			[NodeType.Declaration]: (path) => {
				const node = path.node;
				const decl = /** @type {Declaration} */ (node);
				// Reset value-visitor context, read by the value visitors below.
				currentStructural = decl;
				dashed.active = false;
				dashed.emit = false;
				// Position `lastTokenEndForComments` just past the `:` so a magic comment before a url() is found (every mode).
				let colonPos = A.nameEnd(decl);
				while (
					colonPos < source.length &&
					source.charCodeAt(colonPos) !== CC_COLON
				) {
					colonPos++;
				}
				lastTokenEndForComments = colonPos + 1;
				currentDeclIsKnownProperty = false;
				currentDeclComposesSkip = false;
				currentDeclCounterActive = false;
				dashed.counterArgs = false;
				// Property-name analysis and value exports are CSS-Modules-only; a plain
				// stylesheet's declarations need no per-decl name slice / known-property lookup.
				if (!isModules) return;
				const nameStart = A.nameStart(decl);
				const nameEnd = A.nameEnd(decl);
				// Range-based name analysis — the common declaration never
				// slices its name out of the source.
				/** @type {string | undefined} */
				let declName;
				/** @type {string | undefined} */
				let declPropertyName;
				let declIsDashed = false;
				if (
					source.charCodeAt(nameStart) === CC_HYPHEN_MINUS ||
					source.charCodeAt(nameStart) === CC_REVERSE_SOLIDUS
				) {
					if (rangeIsDashedIdentifier(source, nameStart, nameEnd)) {
						// Custom property: never vendor-prefixed / known / composes.
						declIsDashed = true;
					} else {
						// Vendor-prefixed, degenerate short, or an escaped name that is
						// not dashed after all — rare, string path.
						declName = A.unescapedName(decl);
						declPropertyName = toLowerCaseIfNeeded(
							declName.replace(VENDOR_PREFIX, "")
						);
						currentDeclIsKnownProperty = knownProperties.has(declPropertyName);
					}
				} else {
					declPropertyName = knownPropertyForRange(
						knownPropertyIndex,
						source,
						nameStart,
						nameEnd
					);
					// Cache the known-property flag so the per-token value visitors don't recompute it.
					currentDeclIsKnownProperty = declPropertyName !== undefined;
				}
				const effectiveLocalMode = isEffectivelyLocal();
				// `composes:` with a local anchor: its strip-dep covers the whole declaration, so suppress the value's local/global/dashed/ICSS rewrites.
				currentDeclComposesSkip =
					currentRule.hasLocalAnchor &&
					(declPropertyName !== undefined
						? COMPOSES_PROPERTY.test(declPropertyName)
						: rangeEqualsLowerCase(source, nameStart, nameEnd, "composes") ||
							rangeEqualsLowerCase(source, nameStart, nameEnd, "compose-with"));
				if (currentDeclComposesSkip) emitComposesWithAnchor(decl);
				const skipForComposes = currentDeclComposesSkip;
				// `content: counter(name, style)` can name a scoped counter / `@counter-style` from any property, so this isn't driven by the known-property table.
				currentDeclCounterActive =
					Boolean(this.options.customIdents) &&
					effectiveLocalMode &&
					!skipForComposes;
				// Known-property value localization (`animation-name: foo` exports `foo`).
				if (effectiveLocalMode && currentDeclIsKnownProperty) {
					emitKnownPropertyExports(
						decl,
						/** @type {string} */ (declPropertyName)
					);
				}
				// Dashed-ident (custom-property) export of the property name; the value's dashed idents are scoped by the Ident / Function visitors (top-level only for unknown properties).
				if (
					this.options.dashedIdents &&
					effectiveLocalMode &&
					!skipForComposes
				) {
					// Only the `--`-prefixed path can carry a dashed ident.
					if (declIsDashed) {
						emitDashedIdentExport(nameStart, nameEnd);
					}
					dashed.active = true;
					dashed.emit = !currentDeclIsKnownProperty;
				}
				// ICSS-symbol rewrite (`color: foo` when `foo` is `@value`-defined), skipping known properties, the composes anchor, and dashed idents (handled above). Nothing to rewrite without definitions — don't slice the name.
				if (
					!skipForComposes &&
					!currentDeclIsKnownProperty &&
					icssDefinitions.size !== 0
				) {
					if (declName === undefined) {
						declName = source.slice(nameStart, nameEnd);
					}
					if (
						!(dashed.active && declIsDashed) &&
						icssDefinitions.has(declName)
					) {
						emitICSSSymbol(declName, nameStart, nameEnd);
					}
				}
			},
			// Value-level visitors decide handling from the enclosing node via `urlActive()` / `localGlobalActive()` / `icssActive()`.
			[NodeType.Url]: (path) => {
				const node = path.node;
				const url = /** @type {UrlToken} */ (node);
				if (!urlActive()) return;
				// Skip bare url-tokens for a known property in CSS-Modules local mode.
				if (
					currentStructural &&
					A.type(currentStructural) === NodeType.Declaration &&
					isModules &&
					currentDeclIsKnownProperty &&
					isEffectivelyLocal()
				) {
					return;
				}
				const { ignored, options: urlComments } = magicCommentsIn(
					[lastTokenEndForComments, A.end(node)],
					lastTokenEndForComments,
					A.end(node)
				);
				if (ignored) return;
				let value = normalizeUrl(
					input.slice(A.contentStart(url), A.contentEnd(url)),
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
								A.start(node),
								A.end(node)
							);
							return;
						}
					}
				}
				const dep = new CssUrlDependency(
					value,
					[A.start(node), A.end(node)],
					"url"
				);
				setDepLoc(dep, A.start(node), A.end(node));
				applyResourceHintDefaults(
					dep,
					value,
					urlComments,
					rangeLoc(A.start(node), A.end(node))
				);
				module.addDependency(dep);
				module.addCodeGenerationDependency(dep);
			},
			[NodeType.Comma](path) {
				const node = path.node;
				if (urlActive()) lastTokenEndForComments = A.start(node);
			},
			[NodeType.Function]: {
				enter: (path) => {
					const node = path.node;
					const fn = /** @type {FunctionNode} */ (node);
					const fnNameStart = A.nameStart(fn);
					const fnNameEnd = A.nameEnd(fn);
					const fnNameLength = fnNameEnd - fnNameStart;
					// Functions are the densest value nodes, so the name is matched by raw byte range; only a name carrying an escape (rare) pays the unescaped slice.
					/** @type {string | undefined} */
					let escapedName;
					let isLocalFn = false;
					let isGlobalFn = false;
					if (rangeHasEscape(input, fnNameStart, fnNameEnd)) {
						escapedName = A.unescapedName(fn);
						isLocalFn = equalsLowerCase(escapedName, "local");
						isGlobalFn = !isLocalFn && equalsLowerCase(escapedName, "global");
					} else if (fnNameLength === 5) {
						isLocalFn = rangeEqualsLowerCase(
							input,
							fnNameStart,
							fnNameEnd,
							"local"
						);
					} else if (fnNameLength === 6) {
						isGlobalFn = rangeEqualsLowerCase(
							input,
							fnNameStart,
							fnNameEnd,
							"global"
						);
					}
					if (urlActive()) emitUrlFunction(fn, escapedName);
					if (localGlobalActive() && (isLocalFn || isGlobalFn)) {
						processLocalOrGlobalFunction(fn, isLocalFn ? 1 : 2);
					}
					if (
						icssActive() &&
						!isLocalFn &&
						!isGlobalFn &&
						icssDefinitions.size !== 0
					) {
						// Without an escape the raw name equals the unescaped one — only the `@value`-lookup path needs the string at all.
						const fname = escapedName === undefined ? A.name(fn) : escapedName;
						if (
							!(dashed.active && isDashedIdentifier(fname)) &&
							icssDefinitions.has(fname)
						) {
							emitICSSSymbol(fname, fnNameStart, fnNameEnd);
						}
					}
					// `counter()` / `counters()` / `target-counter()` / `target-counters()`: rewrite the counter name and any trailing counter-style ident.
					let counterNameIndex = -1;
					if (currentDeclCounterActive && !isLocalFn && !isGlobalFn) {
						counterNameIndex = counterFunctionNameIndex(
							input,
							fnNameStart,
							fnNameEnd,
							escapedName
						);
						if (counterNameIndex !== -1) {
							walkCounterFunction(A.children(fn), counterNameIndex);
						}
					}
					// Dashed-ident scoping: handle this function, then set the child nesting level's state for the walk.
					dashed.push();
					dashed.counterArgs = counterNameIndex !== -1;
					if (dashed.active) {
						if (isLocalFn || isGlobalFn) {
							// `local()` / `global()` dashed args go through the ICSS path above, not here.
							dashed.active = false;
						} else if (
							escapedName === undefined
								? (fnNameLength === 3 &&
										rangeEqualsLowerCase(
											input,
											fnNameStart,
											fnNameEnd,
											"var"
										)) ||
									(fnNameLength === 5 &&
										rangeEqualsLowerCase(
											input,
											fnNameStart,
											fnNameEnd,
											"style"
										))
								: equalsLowerCase(escapedName, "var") ||
									equalsLowerCase(escapedName, "style")
						) {
							// `var(--foo, …)` / `style(--foo, …)`: emit the first ident; the fallback doesn't self-emit.
							processDashedIdentInVarFunction(fn);
							dashed.emit = false;
						} else if (
							dashed.emit &&
							fnNameLength >= 3 &&
							input.charCodeAt(fnNameStart) === CC_HYPHEN_MINUS &&
							input.charCodeAt(fnNameStart + 1) === CC_HYPHEN_MINUS
						) {
							// Custom-function call `--my-func(args)` — the name is the exported dashed-ident (a literal `--` prefix, like the `A.name` string check it replaces).
							emitDashedIdentExport(fnNameStart, fnNameEnd);
						}
					}
				},
				exit: () => {
					dashed.pop();
				}
			},
			[NodeType.Ident](path) {
				const node = path.node;
				// Fast exit before slicing the ident value: outside dashed-ident scoping
				// and ICSS context (any non-CSS-Modules stylesheet) a bare ident carries
				// no work, and idents are the most common node, so skipping the per-ident
				// `value` slice matters. With no `@value`/`:import` definitions the ICSS
				// probe can never hit, so it doesn't warrant the slice either. The dashed
				// probe reads two char codes instead of slicing (escaped dashes don't
				// match, same as the string form — cf. `processDashedIdentInVarFunction`).
				const dashedActive = dashed.active;
				const icss = icssActive() && icssDefinitions.size !== 0;
				if (!dashedActive && !icss) return;
				const identStart = A.start(node);
				const identEnd = A.end(node);
				if (
					dashedActive &&
					rangeIsDashedIdentifier(input, identStart, identEnd)
				) {
					// Dashed idents are scoped here, never `@value` ICSS-rewritten.
					if (!dashed.emit) return;
					// Resolve the `--foo from "./x.css"` / `--foo from global` import suffix via sibling lookahead over the parent's child span (`path.index` avoids materializing the sibling list per dashed ident).
					const parent = path.parent;
					if (parent) {
						const count = A.childCount(parent);
						let j = path.index + 1;
						while (
							j < count &&
							A.type(A.childAt(parent, j)) === NodeType.Whitespace
						) {
							j++;
						}
						const fromIdent = j < count ? A.childAt(parent, j) : undefined;
						if (
							fromIdent &&
							A.type(fromIdent) === NodeType.Ident &&
							rangeEqualsLowerCase(
								input,
								A.start(fromIdent),
								A.end(fromIdent),
								"from"
							)
						) {
							j++;
							while (
								j < count &&
								A.type(A.childAt(parent, j)) === NodeType.Whitespace
							) {
								j++;
							}
							const sourceNode = j < count ? A.childAt(parent, j) : undefined;
							if (
								sourceNode &&
								A.type(sourceNode) === NodeType.Ident &&
								rangeEquals(
									input,
									A.start(sourceNode),
									A.end(sourceNode),
									"global"
								)
							) {
								emitDashedIdentFromGlobal(identEnd, A.end(sourceNode));
								return;
							}
							if (sourceNode && A.type(sourceNode) === NodeType.String) {
								emitDashedIdentImport(
									identStart,
									identEnd,
									A.start(fromIdent),
									A.end(sourceNode),
									input.slice(A.start(sourceNode) + 1, A.end(sourceNode) - 1)
								);
								return;
							}
						}
					}
					emitDashedIdentExport(identStart, identEnd);
					return;
				}
				if (!icss) return;
				// Already rewritten as a counter / counter-style name — a second dep would overlap the same range.
				if (dashed.counterArgs) return;
				// Deferred: only the ICSS probe needs the ident's string value.
				const identValue = A.value(node);
				if (icssDefinitions.has(identValue)) {
					emitICSSSymbol(identValue, identStart, identEnd);
				}
			}
		};
		// `as` selects the top-level production (§5.3): a `style` attribute is a
		// block's contents, everything else a full stylesheet (the default). `as`
		// and `skip` are per-parse config on the processor; only `locConverter`
		// (per-source) is passed to `process`. One skip set: selector prelude +
		// unread value leaves (non-modules only; CSS Modules needs its selectors
		// and ICSS-captured values).
		new SourceProcessor()
			.use(/** @type {VisitorMap} */ (visitors))
			.process(source, {
				as: /** @type {"stylesheet" | "block-contents"} */ (this.options.as),
				// Non-modules parses skip selector preludes, but `@custom-selector` expansion needs them, so keep them when the file may use one.
				skip: isModules
					? undefined
					: mayHaveCustomSelectors
						? SKIP_NON_MODULES_KEEP_SELECTORS
						: SKIP_NON_MODULES,
				locConverter
			});

		if (customMediaQueries || customSelectorUses) {
			resolveCustomMediaAndSelectors();
		}

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
			if (isModules && declaredExports.size > 0) {
				this._resolveAmbiguousExports(state, declaredExports, cssExportEntries);
			}
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
