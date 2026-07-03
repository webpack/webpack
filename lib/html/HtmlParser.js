/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const Parser = require("../Parser");
const {
	TT_EOF,
	TT_FUNCTION,
	TT_STRING,
	TT_URL,
	TT_WHITESPACE,
	TokenStream,
	equalsLowerCase
} = require("../css/syntax");
const ConstDependency = require("../dependencies/ConstDependency");
const HtmlEntryDependency = require("../dependencies/HtmlEntryDependency");
const HtmlInlineHtmlDependency = require("../dependencies/HtmlInlineHtmlDependency");
const HtmlInlineScriptDependency = require("../dependencies/HtmlInlineScriptDependency");
const HtmlInlineStyleDependency = require("../dependencies/HtmlInlineStyleDependency");
const HtmlSourceDependency = require("../dependencies/HtmlSourceDependency");
const StaticExportsDependency = require("../dependencies/StaticExportsDependency");
const CommentCompilationWarning = require("../errors/CommentCompilationWarning");
const ModuleDependencyError = require("../errors/ModuleDependencyError");
const UnsupportedFeatureWarning = require("../errors/UnsupportedFeatureWarning");
const WebpackError = require("../errors/WebpackError");
const LazySet = require("../util/LazySet");
const LocConverter = require("../util/LocConverter");
const createHash = require("../util/createHash");
const { contextify } = require("../util/identifier");
const {
	createMagicCommentContext,
	parseMagicComment,
	webpackCommentRegExp
} = require("../util/magicComment");
const {
	NS_HTML,
	NS_SVG,
	NodeType,
	SVG_TAG_ADJUST,
	SourceProcessor,
	decodeHtmlEntities,
	decodeHtmlEntitiesWithMap,
	parseSrcset
} = require("./syntax");

/** @typedef {import("../../declarations/WebpackOptions").HtmlParserOptions} HtmlParserOptions */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../Module").BuildInfo} BuildInfo */
/** @typedef {import("../Compilation").FileSystemDependencies} FileSystemDependencies */
/** @typedef {import("../Module").BuildMeta} BuildMeta */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../Parser").PreparsedAst} PreparsedAst */
/** @typedef {import("./HtmlModule").HtmlModuleBuildInfo} HtmlModuleBuildInfo */

/**
 * @typedef {object} HtmlTemplateContext
 * @property {Module} module the html module being transformed
 * @property {string} resource absolute path of the module's resource
 * @property {(dependency: string) => void} addDependency register a file (e.g. a template partial) as a build dependency so editing it triggers a rebuild
 * @property {(dependency: string) => void} addContextDependency register a directory as a build dependency
 * @property {(dependency: string) => void} addMissingDependency register a not-yet-existing path as a build dependency so creating it triggers a rebuild
 * @property {(dependency: string) => void} addBuildDependency register a build dependency (e.g. a template engine config) so changing it invalidates the cache
 * @property {(warning: Error | string) => void} emitWarning report a non-fatal warning on the module
 * @property {(error: Error | string) => void} emitError report an error on the module
 */
/** @typedef {(source: string, context: HtmlTemplateContext) => string} HtmlTemplateFunction */

const HORIZONTAL_TAB = "\u0009".charCodeAt(0);
const NEWLINE = "\u000A".charCodeAt(0);
const FORM_FEED = "\u000C".charCodeAt(0);
const CARRIAGE_RETURN = "\u000D".charCodeAt(0);
const SPACE = "\u0020".charCodeAt(0);

/**
 * @param {number} char char
 * @returns {boolean} true when ASCII whitespace, otherwise false
 */
function isASCIIWhitespace(char) {
	return (
		// Horizontal tab
		char === HORIZONTAL_TAB ||
		// New line
		char === NEWLINE ||
		// Form feed
		char === FORM_FEED ||
		// Carriage return
		char === CARRIAGE_RETURN ||
		// Space
		char === SPACE
	);
}

/** @typedef {import("./syntax").ParsedSource} ParsedSource */

// Cheap pre-filter for a `style="..."` attribute: only route it through the
// CSS pipeline when it can hold a URL-bearing function (`url()` / `src()` /
// `image()` / `image-set()`), otherwise the processed text equals the input.
const STYLE_ATTR_URL_REGEXP = /url\(|src\(|image\(|image-set\(/i;

// Cheap pre-filter for a `css-url` attribute value (an SVG presentation
// attribute such as `fill`, `clip-path`, …): only tokenize values that can
// hold a `url(...)` FuncIRI. Most are plain colors/keywords (`#fff`, `red`).
const FUNC_IRI_URL_REGEXP = /url\(/i;

// Cheap pre-filter for `<iframe srcdoc>` markup: only spin up a nested HTML
// module when the document can reference an asset — via any attribute (`src=`,
// `href=`, `style=`, …), a CSS `url(...)`, or a CSS `@import`. Pure
// formatting/text markup (`<p>hi</p>`) rewrites to itself, so skip it.
const SRCDOC_ASSET_REGEXP = /[=]|url\(|@import/i;

// A URL carrying its own scheme (`https:`, `data:`, …) ignores the document
// base per the URL spec, so `<base href>` never rewrites it.
const ABSOLUTE_URL_SCHEME_REGEXP = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

// CSP/fetch attributes copied verbatim onto a synthesized sibling `<link>` /
// `<script>` (`HtmlEntryDependency`). Fixed output order, independent of
// source order.
const COPYABLE_SIBLING_ATTRS = ["nonce", "crossorigin", "referrerpolicy"];

const CC_QUOTATION = '"'.charCodeAt(0);
const CC_APOSTROPHE = "'".charCodeAt(0);
const CC_SLASH = "/".charCodeAt(0);

/**
 * Byte-exact source span of an attribute including the single leading
 * whitespace (` name`, ` name=value`, ` name="value"`), mirroring the
 * tokenizer's end-of-attribute rule (`valueEnd + 1` past the closing quote).
 * @param {import("./syntax").HtmlPath} path walk path (used only for attribute-ref reads)
 * @param {string} source HTML source
 * @param {import("./syntax").HtmlAttributeRef} attr attribute ref
 * @returns {string} the attribute's source slice
 */
const attrSourceSpan = (path, source, attr) => {
	const valueStart = path.attributeValueStart(attr);
	const valueEnd = path.attributeValueEnd(attr);
	const end =
		valueStart === -1
			? path.attributeNameEnd(attr)
			: source.charCodeAt(valueStart - 1) === CC_QUOTATION ||
				  source.charCodeAt(valueStart - 1) === CC_APOSTROPHE
				? valueEnd + 1
				: valueEnd;
	return source.slice(path.attributeNameStart(attr) - 1, end);
};

// eslint-disable-next-line no-control-regex
const IGNORE_CHARS_REGEXP = /[\u0000-\u001F\u007F-\u009F\u00A0]/g;

/**
 * @param {string} input input
 * @returns {ParsedSource[]} parsed src
 */
const parseSrc = (input) => {
	const len = input.length;
	if (len === 0) throw new Error("Must be non-empty");

	let start = 0;
	let end = len;

	while (start < end) {
		const code = input.charCodeAt(start);
		if (code > 32 && code !== 160) break;
		start++;
	}

	if (start === end) throw new Error("Must be non-empty");

	while (end > start) {
		const code = input.charCodeAt(end - 1);
		if (code > 32 && code !== 160) break;
		end--;
	}

	let value = input.slice(start, end);

	if (IGNORE_CHARS_REGEXP.test(value)) {
		value = value.replace(IGNORE_CHARS_REGEXP, "");
		if (value.length === 0) throw new Error("Must be non-empty");
	}

	return [[value, start, end]];
};

/**
 * Extracts the `icon-uri` value of an `msapplication-task` meta content
 * (`name=…;action-uri=…;icon-uri=…`) — the other parts are page URLs, not assets.
 * @param {string} input input
 * @returns {ParsedSource[]} parsed icon-uri
 */
const parseMsapplicationTask = (input) => {
	const len = input.length;
	let pos = 0;
	while (pos < len) {
		let sep = input.indexOf(";", pos);
		if (sep === -1) sep = len;
		const eq = input.indexOf("=", pos);
		if (eq !== -1 && eq < sep) {
			const key = input.slice(pos, eq).trim().toLowerCase();
			if (key === "icon-uri") {
				let start = eq + 1;
				let end = sep;
				while (start < end && isASCIIWhitespace(input.charCodeAt(start))) {
					start++;
				}
				while (end > start && isASCIIWhitespace(input.charCodeAt(end - 1))) {
					end--;
				}
				if (start === end) return [];
				return [[input.slice(start, end), start, end]];
			}
		}
		pos = sep + 1;
	}
	return [];
};

/**
 * Extracts `url(...)` references from a CSS value (an SVG presentation
 * attribute). Reuses webpack's CSS lexer so quoting/escaping match the CSS
 * spec; returns the `parseSrc` shape so the shared emit path maps and rewrites
 * the spans. Unquoted `url(path)` rewrites the content span; quoted
 * `url("path")` rewrites the inner string span (quotes preserved).
 * @param {string} input attribute value (a CSS component-value list)
 * @returns {ParsedSource[]} url references
 */
const parseCssUrls = (input) => {
	const ts = new TokenStream(input);
	/** @type {ParsedSource[]} */
	const result = [];
	for (;;) {
		const t = ts.consume();
		if (t.type === TT_EOF) break;
		if (t.type === TT_URL) {
			if (t.contentEnd > t.contentStart) {
				result.push([
					input.slice(t.contentStart, t.contentEnd),
					t.contentStart,
					t.contentEnd
				]);
			}
		} else if (
			t.type === TT_FUNCTION &&
			equalsLowerCase(input.slice(t.start, t.end - 1), "url")
		) {
			let s = ts.consume();
			while (s.type === TT_WHITESPACE) s = ts.consume();
			if (s.type === TT_STRING) {
				const quote = input.charCodeAt(s.start);
				const innerStart = s.start + 1;
				// Drop the closing quote, unless the string is unterminated at EOF.
				const innerEnd =
					input.charCodeAt(s.end - 1) === quote ? s.end - 1 : s.end;
				if (innerEnd > innerStart) {
					result.push([
						input.slice(innerStart, innerEnd),
						innerStart,
						innerEnd
					]);
				}
			}
		}
	}
	return result;
};

/**
 * @param {Map<string, string>} attributes attributes
 * @param {string} name name
 * @returns {string | undefined} attribute value
 */
const getAttributeValue = (attributes, name) => attributes.get(name);

/** @type {Map<string, Set<string>>} */
const META = new Map([
	[
		"name",
		new Set([
			// msapplication-TileImage
			"msapplication-tileimage",
			"msapplication-square70x70logo",
			"msapplication-square150x150logo",
			"msapplication-wide310x150logo",
			"msapplication-square310x310logo",
			"msapplication-config",
			// Only the `icon-uri` part is an asset, see `parseMsapplicationTask`
			"msapplication-task",
			"twitter:image",
			"twitter:image:src",
			// Legacy preview-image hint
			"thumbnail"
		])
	],
	[
		"property",
		new Set([
			"og:image",
			"og:image:url",
			"og:image:secure_url",
			"og:audio",
			"og:audio:secure_url",
			"og:video",
			"og:video:secure_url",
			"vk:image"
		])
	],
	[
		"itemprop",
		new Set([
			"image",
			"logo",
			"screenshot",
			"thumbnailurl",
			"contenturl",
			"downloadurl",
			"duringmedia",
			"embedurl",
			"installurl",
			"layoutimage"
		])
	]
]);

/**
 * @param {Map<string, string>} attributes attributes
 * @returns {boolean} true when need to parse, otherwise false
 */
const filterLinkItemprop = (attributes) => {
	const itemprop = getAttributeValue(attributes, "itemprop");
	if (!itemprop) return false;
	const allowedAttributes = META.get("itemprop");
	if (!allowedAttributes) return false;

	return allowedAttributes.has(itemprop.trim().toLowerCase());
};

// `<link rel>` values whose `href`/`imagesrcset` webpack treats as a reference.
const ALLOWED_LINK_RELS = new Set([
	"stylesheet",
	"icon",
	"mask-icon",
	"apple-touch-icon",
	"apple-touch-icon-precomposed",
	"apple-touch-startup-image",
	// TODO the manifest file is emitted as an asset, but its JSON
	// `icons`/`screenshots`/`shortcuts[].icons` URLs aren't parsed — needs a
	// dedicated webmanifest module type (parser + generator), not a table entry.
	"manifest",
	"prefetch",
	"preload",
	"modulepreload",
	// Legacy preview-image hint (`<link rel="image_src" href>`)
	"image_src"
]);

/**
 * @param {Map<string, string>} attributes attributes
 * @returns {boolean} true when need to parse, otherwise false
 */
const filterLinkHref = (attributes) => {
	const rel = getAttributeValue(attributes, "rel");
	if (!rel) return false;
	const usedRels = rel.trim().toLowerCase().split(/\s+/);
	for (let i = 0; i < usedRels.length; i++) {
		if (ALLOWED_LINK_RELS.has(usedRels[i])) return true;
	}
	return false;
};

/**
 * @param {Map<string, string>} attributes attributes
 * @returns {boolean} true when need to parse, otherwise false
 */
const filterLinkUnion = (attributes) =>
	filterLinkHref(attributes) || filterLinkItemprop(attributes);

/**
 * @param {Map<string, string>} attributes attributes
 * @returns {boolean} true when need to parse, otherwise false
 */
const filterMetaContent = (attributes) => {
	for (const item of META) {
		const [key, allowedNames] = item;
		const name = getAttributeValue(attributes, key);
		if (!name) continue;
		// Check every present attribute, not only the first one
		if (allowedNames.has(name.trim().toLowerCase())) return true;
	}

	return false;
};

/**
 * `<param value>` (obsolete `<object>`/`<applet>` child) is only a URL when
 * `valuetype="ref"`; otherwise it's an opaque string.
 * @param {Map<string, string>} attributes attributes
 * @returns {boolean} true when `value` is a URL reference
 */
const filterParamRef = (attributes) => {
	const valuetype = getAttributeValue(attributes, "valuetype");
	if (!valuetype) return false;
	return valuetype.trim().toLowerCase() === "ref";
};

/**
 * @param {Map<string, string>} attributes attributes
 * @returns {boolean} true when the script element opts into ES module semantics
 */
const isModuleScript = (attributes) => {
	const type = getAttributeValue(attributes, "type");
	if (!type) return false;
	return type.trim().toLowerCase() === "module";
};

// HTML `<script>` `type` values that the browser treats as executable
// JavaScript. Anything outside this set (e.g. `application/ld+json`,
// `importmap`, `application/wasm`) is a data block — webpack must not
// try to bundle it as a JS entry; it should pass through as an asset URL.
const JS_SCRIPT_TYPES = new Set([
	"",
	"module",
	"text/javascript",
	"application/javascript",
	"text/ecmascript",
	"application/ecmascript"
]);

/**
 * @param {Map<string, string>} attributes attributes
 * @returns {boolean} true when the script element's `type` is executable JS
 */
const isExecutableJsScript = (attributes) => {
	const type = getAttributeValue(attributes, "type");
	if (type === undefined) return true;
	return JS_SCRIPT_TYPES.has(type.trim().toLowerCase());
};

/**
 * @param {Map<string, string>} attributes attributes
 * @returns {boolean} true when the link points at an ES module that should be bundled as an entry chunk
 */
const isLinkModulePreload = (attributes) => {
	const rel = getAttributeValue(attributes, "rel");
	if (!rel) return false;
	return rel.trim().toLowerCase().split(/\s+/).includes("modulepreload");
};

/**
 * @param {Map<string, string>} attributes attributes
 * @returns {boolean} true when the link is a `<link rel="stylesheet">` that should be bundled as a CSS entry chunk
 */
const isLinkStylesheet = (attributes) => {
	const rel = getAttributeValue(attributes, "rel");
	if (!rel) return false;
	return rel.trim().toLowerCase().split(/\s+/).includes("stylesheet");
};

/** @typedef {"src" | "srcset" | "css-url" | "msapplication-task" | "script" | "script-module" | "modulepreload" | "stylesheet" | "stylesheet-style" | "stylesheet-style-attribute" | "srcdoc"} SourceType */
/** Entry types: a `type` whose value is loaded as its own compilation entry chunk. */
/** @typedef {"script" | "script-module" | "modulepreload" | "stylesheet"} EntrySourceType */
/** @typedef {SourceType | ((attrs: Map<string, string>, css: boolean) => SourceType)} SourceTypeOrResolver */
/** @typedef {(attributes: Map<string, string>, value: string) => boolean} SourceFilter */
/** @typedef {{ tag?: string, attribute: string, type: SourceType, filter?: SourceFilter }} SourceEntry */
/** A `type` plus optional gates: `filter` (the decoded attribute map + the decoded value; return false to skip — covers both cross-attribute checks and cheap value checks) and `namespace` (restrict to an element namespace, e.g. SVG). */
/** @typedef {{ type: SourceTypeOrResolver, filter?: SourceFilter, namespace?: number }} SourceItem */
/** A source whose value is the element's text content (a `<style>`/`<script>` body) rather than an attribute. */
/** @typedef {{ type: SourceTypeOrResolver, filter?: (attributes: Map<string, string>) => boolean }} ContentSourceItem */

/**
 * Builds a null-prototype dictionary from the given property bags
 * (later bags win; `undefined` bags are skipped). A null prototype is
 * essential here: the tables are indexed by HTML tag and attribute
 * names, so a plain object would let names like `__proto__`,
 * `constructor`, or `toString` resolve to inherited values at lookup
 * time — producing bogus dependencies and letting `sources: false` be
 * bypassed.
 * @param {...(Record<string, EXPECTED_ANY> | undefined)} bags property bags
 * @returns {EXPECTED_ANY} null-prototype dictionary
 */
const dict = (...bags) => Object.assign(Object.create(null), ...bags);

// Shared `SourceItem` singletons used by the built-in defaults —
// keeping one instance per kind stabilizes V8's hidden classes across
// lookups in the walk. `srcset` is its own type; the walk picks the
// `parseSrcset` parser for it and otherwise treats it like `src`.
/** @type {SourceItem} */
const PLAIN_SRC = { type: "src", filter: undefined };
/** @type {SourceItem} */
const PLAIN_SRCSET = { type: "srcset", filter: undefined };

/**
 * `<link href>` is polymorphic: `rel="modulepreload"` → an ESM
 * preload entry, `rel="stylesheet"` (with `experiments.css`) → a CSS
 * entry, otherwise a plain asset URL.
 * @type {SourceItem}
 */
const LINK_HREF = {
	type: (attrs, css) => {
		if (isLinkModulePreload(attrs)) return "modulepreload";
		if (css && isLinkStylesheet(attrs)) return "stylesheet";
		return "src";
	},
	filter: filterLinkUnion
};

/**
 * `<script src>`: non-JS types (e.g. `application/ld+json`,
 * `importmap`) stay plain asset URLs so the browser keeps seeing them
 * as data blocks; `type="module"` opts into the ESM entry chunk;
 * everything else in `JS_SCRIPT_TYPES` is a classic script.
 * @type {SourceItem}
 */
const SCRIPT_SRC = {
	type: (attrs) =>
		isExecutableJsScript(attrs)
			? isModuleScript(attrs)
				? "script-module"
				: "script"
			: "src",
	filter: undefined
};

/**
 * `<meta content>`: most referenced names hold a single URL (`src`); the
 * `msapplication-task` value is a `;`-delimited list whose `icon-uri` part
 * is the only asset, so it selects the `msapplication-task` parser.
 * @type {SourceItem}
 */
const META_CONTENT = {
	type: (attrs) => {
		const name = attrs.get("name");
		return name !== undefined &&
			name.trim().toLowerCase() === "msapplication-task"
			? "msapplication-task"
			: "src";
	},
	filter: filterMetaContent
};

// Built-in lookup table, written directly in its final resolved shape:
// `DEFAULT_SOURCES_BY_TAG[tag][attribute] = item`. No module-load
// loop, no separate array representation — every parser created with
// the default `sources` config just references this table and pays
// zero per-parser work.
/** @type {Record<string, Record<string, SourceItem>>} */
const DEFAULT_SOURCES_BY_TAG = dict({
	// Obsolete Java-applet element; `code`/`object` are single class/object URLs.
	applet: dict({ code: PLAIN_SRC, object: PLAIN_SRC }),
	audio: dict({ src: PLAIN_SRC }),
	// Deprecated presentational `background` attribute — an image URL.
	body: dict({ background: PLAIN_SRC }),
	embed: dict({ src: PLAIN_SRC }),
	// `srcdoc` is an entity-encoded HTML document parsed and rewritten as a
	// nested module — its handling lives in the generic source loop so the
	// `sources` option can re-target it (or other tags/attributes) freely.
	iframe: dict({ srcdoc: { type: "srcdoc", filter: undefined } }),
	img: dict({ src: PLAIN_SRC, srcset: PLAIN_SRCSET }),
	input: dict({ src: PLAIN_SRC }),
	link: dict({
		href: LINK_HREF,
		imagesrcset: { type: "srcset", filter: filterLinkHref }
	}),
	meta: dict({ content: META_CONTENT }),
	// MathML `<mglyph src>` references an image.
	mglyph: dict({ src: PLAIN_SRC }),
	// `classid` is a single object URI (`codebase`/`archive` are a base/list, skipped).
	object: dict({ data: PLAIN_SRC, classid: PLAIN_SRC }),
	// Obsolete `<param valuetype="ref" value="url">` child of `<object>`.
	param: dict({ value: { type: "src", filter: filterParamRef } }),
	// `href`/`xlink:href` reference the source of SVG `<script>` elements
	script: dict({
		src: SCRIPT_SRC,
		href: SCRIPT_SRC,
		"xlink:href": SCRIPT_SRC
	}),
	source: dict({ src: PLAIN_SRC, srcset: PLAIN_SRCSET }),
	// Deprecated presentational `background` attribute — an image URL.
	table: dict({ background: PLAIN_SRC }),
	td: dict({ background: PLAIN_SRC }),
	th: dict({ background: PLAIN_SRC }),
	track: dict({ src: PLAIN_SRC }),
	video: dict({ poster: PLAIN_SRC, src: PLAIN_SRC }),
	// SVG. Tag names match the tree builder's adjusted camelCase
	// (`feImage`/`textPath`/`linearGradient`/`radialGradient`). `href`/
	// `xlink:href` reference another element/resource; fragment-only `#id`
	// values are left untouched, so only external `file.svg#id` is rewritten.
	// `color-profile`'s `xlink:href` points at an external ICC profile file.
	"color-profile": dict({ "xlink:href": PLAIN_SRC, href: PLAIN_SRC }),
	feImage: dict({ "xlink:href": PLAIN_SRC, href: PLAIN_SRC }),
	filter: dict({ "xlink:href": PLAIN_SRC, href: PLAIN_SRC }),
	image: dict({ "xlink:href": PLAIN_SRC, href: PLAIN_SRC }),
	linearGradient: dict({ "xlink:href": PLAIN_SRC, href: PLAIN_SRC }),
	mpath: dict({ "xlink:href": PLAIN_SRC, href: PLAIN_SRC }),
	pattern: dict({ "xlink:href": PLAIN_SRC, href: PLAIN_SRC }),
	radialGradient: dict({ "xlink:href": PLAIN_SRC, href: PLAIN_SRC }),
	textPath: dict({ "xlink:href": PLAIN_SRC, href: PLAIN_SRC }),
	use: dict({ "xlink:href": PLAIN_SRC, href: PLAIN_SRC })
	// CSS `url(...)` references in SVG presentation attributes (fill, stroke,
	// clip-path, …) are handled separately during the walk (`parseCssUrls`).
});

// SVG presentation attributes (`fill`, `stroke`, …) carry CSS `url(...)`
// FuncIRIs; `parseCssUrls` extracts external refs as assets (internal
// `url(#id)` is left untouched). They apply to every SVG-namespace element, so
// the item is `namespace`-gated rather than placed in a tag bucket. The filter
// is a cheap pre-check skipping the common plain values (`red`, `none`, `#fff`).
/** @type {SourceItem} */
const SVG_CSS_URL = {
	type: "css-url",
	filter: (attributes, value) => FUNC_IRI_URL_REGEXP.test(value),
	namespace: NS_SVG
};

// The global `style=""` attribute (a CSS declaration list), available on every
// tag and even with `sources: false`. Like every `stylesheet-style*` source it
// only emits when `experiments.css` is on (checked where the dependency is
// created); the filter is a cheap pre-check skipping declarations without a
// `url()`/`src()`/… .
/** @type {SourceItem} */
const STYLE_ATTRIBUTE = {
	type: "stylesheet-style-attribute",
	filter: (attributes, value) => STYLE_ATTR_URL_REGEXP.test(value)
};

// Any-tag sources — applied to every element as a fallback and folded into
// each tag bucket, so the walk resolves one object per element and reads one
// property per attribute. `DEFAULT` (svg presentation + style) is active
// unless `sources: false`; only the always-on style attribute survives `false`.
/** @type {Record<string, SourceItem>} */
const DEFAULT_ANY_SOURCES = dict({ style: STYLE_ATTRIBUTE });
for (const name of [
	"fill",
	"stroke",
	"clip-path",
	"mask",
	"filter",
	"marker",
	"marker-start",
	"marker-mid",
	"marker-end",
	"cursor"
]) {
	DEFAULT_ANY_SOURCES[name] = SVG_CSS_URL;
}
/** @type {Record<string, SourceItem>} */
const ALWAYS_ANY_SOURCES = dict({ style: STYLE_ATTRIBUTE });

// Reserved key holding the any-tag sources inside the per-tag table — the
// schema forbids an empty `tag`, so it never collides with a real tag. The
// walk falls back to it for elements without their own bucket.
const ANY_TAG = "";

/**
 * Folds the any-tag sources into every per-tag bucket (tag-specific entries
 * win) and stores them under `ANY_TAG`, so the whole source model is one
 * object and the walk's per-attribute lookup is a single property read.
 * @param {Record<string, Record<string, SourceItem>>} byTag per-tag sources
 * @param {Record<string, SourceItem>} any any-tag sources
 * @returns {Record<string, Record<string, SourceItem>>} folded table
 */
const foldAnySources = (byTag, any) => {
	for (const tag of Object.keys(byTag)) {
		byTag[tag] = dict(any, byTag[tag]);
	}
	byTag[ANY_TAG] = any;
	return byTag;
};

// Default table (per-tag defaults + any-tag sources folded in) and the
// `sources: false` table (only the always-on `style=""` attribute). Both are
// precomputed so the common cases reference them with zero per-parser work.
/** @type {Record<string, Record<string, SourceItem>>} */
const DEFAULT_SOURCES_FOLDED = foldAnySources(
	dict(DEFAULT_SOURCES_BY_TAG),
	DEFAULT_ANY_SOURCES
);
/** @type {Record<string, Record<string, SourceItem>>} */
const DISABLED_SOURCES_FOLDED = foldAnySources(dict(), ALWAYS_ANY_SOURCES);

/**
 * Inline `<script>` body: classic JS unless `type="module"` opts into ESM.
 * @param {Map<string, string>} attrs attributes
 * @returns {SourceType} the entry type for the inline script
 */
const scriptContentType = (attrs) =>
	isModuleScript(attrs) ? "script-module" : "script";

/**
 * Inline `<script>` body: only an executable JS block with no external source
 * carries content webpack should bundle.
 * @param {Map<string, string>} attrs attributes
 * @returns {boolean} true when the inline body should be bundled
 */
const scriptContentFilter = (attrs) =>
	!attrs.has("src") &&
	!attrs.has("href") &&
	!attrs.has("xlink:href") &&
	isExecutableJsScript(attrs);

/**
 * `<style>` body is a stylesheet only when its `type` is empty or `text/css`.
 * @param {Map<string, string>} attrs attributes
 * @returns {boolean} true when the body is CSS
 */
const styleContentFilter = (attrs) => {
	const type = attrs.get("type");
	if (type === undefined) return true;
	const t = type.trim().toLowerCase();
	return t === "" || t === "text/css";
};

// Element-body sources, independent of the `sources` option (even `sources:
// false`): inline `<script>` bodies are always processed; the `<style>` body
// only emits when `experiments.css` is on (checked where the dependency is
// created, like every `stylesheet-style*` source).
/** @type {Record<string, ContentSourceItem>} */
const CONTENT_SOURCES = dict({
	script: { type: scriptContentType, filter: scriptContentFilter },
	style: { type: "stylesheet-style", filter: styleContentFilter }
});

class HtmlParser extends Parser {
	/**
	 * Creates an instance of HtmlParser.
	 * @param {HtmlParserOptions} options parser options (from `module.parser.html`; always passed by the `createParser` hook)
	 */
	constructor(options) {
		super();
		this.magicCommentContext = createMagicCommentContext();
		// Read by HtmlModulesPlugin's `processResult` hook, which transforms
		// the module source before it is stored and parsed.
		/** @type {HtmlTemplateFunction | undefined} */
		this.template = options.template;
		// One source model: a per-tag table that also holds the any-tag sources
		// under `ANY_TAG`. The common cases reference precomputed tables.
		/** @type {Record<string, Record<string, SourceItem>>} */
		this.sourcesByTag = DEFAULT_SOURCES_FOLDED;

		const sources = options.sources;
		if (sources === undefined || sources === true) return;
		if (sources === false) {
			// Only the always-on `style=""` attribute survives; nothing else is
			// extracted (svg presentation, `<script src>`, `<link>` entries, …).
			this.sourcesByTag = DISABLED_SOURCES_FOLDED;
			return;
		}

		// User array — `"..."` anywhere opts the per-tag defaults in as the
		// base; the built-in any-tag sources (svg presentation + style) are
		// always present. A user entry with no `tag` is an any-tag source (e.g.
		// `{ attribute: "data-style", type: "stylesheet-style-attribute" }`).
		// User entries override regardless of position. `dict()` keeps every
		// table null-prototype (see its doc), and per-tag writes rebuild the
		// bucket so the aliased default buckets stay intact.
		/** @type {Record<string, Record<string, SourceItem>>} */
		const byTag = sources.includes("...")
			? dict(DEFAULT_SOURCES_BY_TAG)
			: dict();
		/** @type {Record<string, SourceItem>} */
		const any = dict(DEFAULT_ANY_SOURCES);
		for (const entry of sources) {
			if (entry === "...") continue;
			/** @type {SourceItem} */
			const item = {
				type: entry.type,
				filter: typeof entry.filter === "function" ? entry.filter : undefined
			};
			const attr = entry.attribute.toLowerCase();
			if (entry.tag === undefined) {
				any[attr] = item;
			} else {
				const tag = entry.tag.toLowerCase();
				byTag[tag] = dict(byTag[tag], { [attr]: item });
				// The AST carries adjusted camelCase names for foreign-content
				// tags (e.g. `feImage`) — register the entry under both.
				const adjusted = SVG_TAG_ADJUST[tag];
				if (adjusted !== undefined) {
					byTag[adjusted] = dict(byTag[adjusted], { [attr]: item });
				}
			}
		}
		/** @type {Record<string, Record<string, SourceItem>>} */
		this.sourcesByTag = foldAnySources(byTag, any);
	}

	/**
	 * Runs the `template` option over the source and returns the transformed
	 * html. Called from HtmlModulesPlugin's `processResult`, where the return
	 * value becomes the module's stored source so the parser (which records
	 * dependency offsets against it) and the generator (which renders from
	 * `module.originalSource()`) stay in agreement.
	 * @param {string | Buffer} source the original source
	 * @param {NormalModule} module the html module
	 * @returns {string | Buffer} the transformed source
	 */
	applyTemplate(source, module) {
		if (!this.template) return source;
		// `processResult` runs after `_doBuild` has initialized these
		// dependency sets, so they are always present here.
		const buildInfo = /** @type {BuildInfo} */ (module.buildInfo);
		const fileDependencies = /** @type {FileSystemDependencies} */ (
			buildInfo.fileDependencies
		);
		const contextDependencies = /** @type {FileSystemDependencies} */ (
			buildInfo.contextDependencies
		);
		const missingDependencies = /** @type {FileSystemDependencies} */ (
			buildInfo.missingDependencies
		);
		const transformed = this.template(
			typeof source === "string" ? source : source.toString("utf8"),
			{
				module,
				resource: module.resource,
				addDependency: (dependency) => {
					fileDependencies.add(dependency);
				},
				addContextDependency: (dependency) => {
					contextDependencies.add(dependency);
				},
				addMissingDependency: (dependency) => {
					missingDependencies.add(dependency);
				},
				addBuildDependency: (dependency) => {
					if (buildInfo.buildDependencies === undefined) {
						buildInfo.buildDependencies = new LazySet();
					}
					buildInfo.buildDependencies.add(dependency);
				},
				emitWarning: (warning) =>
					module.addWarning(
						warning instanceof Error ? warning : new WebpackError(warning)
					),
				emitError: (error) =>
					module.addError(
						error instanceof Error ? error : new WebpackError(error)
					)
			}
		);
		if (typeof transformed !== "string") {
			throw new Error(
				"The `template` html parser option must return a string."
			);
		}
		return transformed;
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
			throw new Error("webpackAst is unexpected for the HtmlParser");
		}
		if (source[0] === "\uFEFF") {
			source = source.slice(1);
		}

		const locConverter = new LocConverter(source);

		const module = state.module;
		const compilation = state.compilation;
		const { hashFunction, module: outputModule } = compilation.outputOptions;
		const context = compilation.compiler.context;
		const css = Boolean(compilation.options.experiments.css);

		// Stable, per-HTML-module prefix used when generating entry names for
		// script src / modulepreload references so they don't collide across
		// HTML modules in the same compilation. We hash the module's resource
		// path (a plain absolute path) — going through `contextify` against
		// the compilation root keeps the hash machine-stable for the same
		// project layout. Note: `module.identifier()` returns `html|<path>`
		// for HTML modules, which doesn't start with `/`, so contextify would
		// leave it absolute. `module.resource` is the bare path.
		/** @type {string} */
		const resource =
			/** @type {EXPECTED_ANY} */ (module).resource || module.identifier();
		const moduleHash = createHash(hashFunction || "md4")
			.update(context ? contextify(context, resource) : resource)
			.digest("hex")
			.slice(0, 8);

		// Script src / modulepreload references are collected per-type
		// during the walk; HtmlModulesPlugin later turns them into real
		// entries. `script` and `script-module` entries are chained via a
		// leader-only dependOn so they share a runtime.
		// `<link rel="modulepreload">` entries are kept independent — they
		// must preload without running, so they can never become a runtime
		// leader that other entries would import.
		/**
		 * @typedef {object} EntryScriptInfo
		 * @property {string} request
		 * @property {string} entryName
		 * @property {"script" | "script-module" | "modulepreload" | "stylesheet"} type
		 */
		/** @type {EntryScriptInfo[]} */
		const scriptEntries = [];
		/** @type {EntryScriptInfo[]} */
		const scriptModuleEntries = [];
		/** @type {EntryScriptInfo[]} */
		const modulePreloadEntries = [];
		/** @type {EntryScriptInfo[]} */
		const stylesheetEntries = [];

		// Offset of the first script tag; anchors injected stylesheet `<link>`s
		// before it so a later entry's CSS still loads ahead of every script.
		let firstScriptStart = -1;

		let nextEntryIndex = 0;

		// `<base href>` resolves the relative URLs that follow it. A relative base
		// (`./assets/`) rewrites them into a subdirectory — still bundled; a
		// root-relative or absolute base (`/`, `https://cdn/`) points them outside
		// the build, so those URLs are left untouched. Resolved in the walk below
		// from the first `<base href>` seen (`documentBase` undefined until then).
		/** @type {string | undefined} */
		let documentBase;
		/** @type {string | undefined} */
		let baseDir;
		let baseIsExternal = false;
		// Prepended to the emitted URLs' auto-public-path undo path so the base
		// doesn't misdirect them: the browser resolves rewritten (relative)
		// output URLs against the base dir, so one `../` per base segment cancels
		// it. Undefined for absolute publicPath (no undo path is emitted).
		/** @type {string | undefined} */
		let baseUrlPrefix;

		/**
		 * Tracks the `webpackIgnore` value from the most recent comment that
		 * appears before the next tag. Reset whenever a tag is emitted or a
		 * comment without a `webpackIgnore` value is encountered.
		 * @type {boolean | undefined}
		 */
		let pendingWebpackIgnore;

		const magicCommentContext = this.magicCommentContext;

		/**
		 * @param {import("./syntax").HtmlPath} path walk path (used only for attribute-ref reads)
		 * @param {import("./syntax").HtmlAttributeRef} typeAttr type attribute ref (0 = none)
		 * @param {number} nameEnd end offset of the tag name
		 * @param {string} type type of the script
		 * @param {string} input source string
		 */
		const reconcileScriptTypeAttr = (path, typeAttr, nameEnd, type, input) => {
			const valueStart =
				typeAttr !== 0 ? path.attributeValueStart(typeAttr) : -1;
			const valueEnd = typeAttr !== 0 ? path.attributeValueEnd(typeAttr) : -1;
			if (outputModule && type === "script") {
				// Chunk is an ES module; upgrade the tag.
				if (typeAttr !== 0 && valueStart !== -1) {
					module.addPresentationalDependency(
						new ConstDependency("module", [valueStart, valueEnd])
					);
				} else {
					module.addPresentationalDependency(
						new ConstDependency(' type="module"', nameEnd)
					);
				}
			} else if (!outputModule && type === "script-module" && typeAttr !== 0) {
				// Chunk is a classic IIFE; drop `type="module"` so the
				// browser doesn't load it under module semantics.
				let attrEnd;
				if (valueStart === -1) {
					attrEnd = path.attributeNameEnd(typeAttr);
				} else if (input[valueEnd] === '"' || input[valueEnd] === "'") {
					attrEnd = valueEnd + 1;
				} else {
					attrEnd = valueEnd;
				}
				let attrStart = path.attributeNameStart(typeAttr);
				if (
					attrStart > 0 &&
					isASCIIWhitespace(input.charCodeAt(attrStart - 1))
				) {
					attrStart -= 1;
				}
				module.addPresentationalDependency(
					new ConstDependency("", [attrStart, attrEnd])
				);
			}
		};

		/**
		 * @param {string} mime mime type
		 * @param {string} text inline text
		 * @returns {string} a `data:` request for the text
		 */
		const dataUri = (mime, text) =>
			`data:${mime};base64,${Buffer.from(text, "utf8").toString("base64")}`;

		/**
		 * @param {ConstDependency | HtmlSourceDependency | HtmlEntryDependency | HtmlInlineStyleDependency | HtmlInlineScriptDependency | HtmlInlineHtmlDependency} dep dependency
		 * @param {number} start raw start offset
		 * @param {number} end raw end offset
		 */
		const setLoc = (dep, start, end) => {
			const s = locConverter.get(start);
			const e = locConverter.get(end);
			dep.setLoc(s.line, s.column, e.line, e.column);
		};

		/**
		 * Classifies the first `<base href>` seen in the walk, setting
		 * `documentBase`/`baseDir`/`baseIsExternal`/`baseUrlPrefix` for the URLs
		 * that follow it.
		 * @param {import("./syntax").HtmlPath} path walk path (for attribute reads)
		 * @param {import("./syntax").HtmlAttributeRef} hrefAttr the base's href attribute
		 */
		const resolveDocumentBase = (path, hrefAttr) => {
			documentBase = decodeHtmlEntities(
				path.attributeValue(hrefAttr),
				true
			).trim();
			if (!documentBase) return;
			if (
				ABSOLUTE_URL_SCHEME_REGEXP.test(documentBase) ||
				documentBase.charCodeAt(0) === CC_SLASH
			) {
				baseIsExternal = true;
				return;
			}
			// Normalize the base path into its descending directory segments,
			// resolving `.`/`..` like the URL spec. The final segment is the
			// referenced file (dropped) unless the href ends with `/` or a
			// dot-segment; `up` counts `..`s that climb above the document dir.
			const parts = documentBase.split("/");
			/** @type {string[]} */
			const dirs = [];
			let up = 0;
			for (let i = 0; i < parts.length; i++) {
				const part = parts[i];
				if (part === "" || part === ".") continue;
				if (part === "..") {
					if (dirs.length > 0) dirs.pop();
					else up++;
					continue;
				}
				// A trailing plain segment (no following `/`) is the file, not a dir.
				if (i === parts.length - 1) continue;
				dirs.push(part);
			}
			baseDir = `${"../".repeat(up)}${dirs.length > 0 ? `${dirs.join("/")}/` : ""}`;
			// A base above the document dir can't be cancelled with `../` (the
			// document's own dir name is unknown) — leave the output URLs
			// un-prefixed; they still resolve under an absolute publicPath.
			if (up === 0 && dirs.length > 0) {
				baseUrlPrefix = "../".repeat(dirs.length);
			}
		};

		// Lazy decoded-attribute map for the current element — parse-scoped
		// to avoid a closure and memo slot per element.
		/** @type {import("./syntax").HtmlPath | undefined} */
		let attrMapPath;
		let attrMapCount = 0;
		/** @type {Map<string, string> | undefined} */
		let currentAttributesMap;
		const getAttributesMap = () => {
			if (currentAttributesMap) return currentAttributesMap;
			currentAttributesMap = new Map();
			const path = /** @type {import("./syntax").HtmlPath} */ (attrMapPath);
			for (let i = 0; i < attrMapCount; i++) {
				const attr = path.attributeAt(i);
				// Decoded values — filters and type resolvers compare what
				// the browser sees (e.g. `rel="&#105;con"` means `icon`)
				currentAttributesMap.set(
					path.attributeName(attr),
					decodeHtmlEntities(path.attributeValue(attr), true)
				);
			}
			return currentAttributesMap;
		};

		// TODO implement full HTML parser (WASM)
		// The walker descends into children (and `<template>` content) itself;
		// the Element `exit` clears a pending `webpackIgnore` once an element's
		// children are done (the old `walkChildren` behaviour).
		new SourceProcessor()
			.use({
				[NodeType.Comment]: (path) => {
					const start = path.start();
					const end = path.end();
					// Only proper `<!-- ... -->` comments carry magic comments.
					if (
						end - start < 7 ||
						source.charCodeAt(start) !== 0x3c ||
						source.charCodeAt(start + 1) !== 0x21 ||
						source.charCodeAt(start + 2) !== 0x2d ||
						source.charCodeAt(start + 3) !== 0x2d ||
						source.charCodeAt(end - 1) !== 0x3e ||
						source.charCodeAt(end - 2) !== 0x2d ||
						source.charCodeAt(end - 3) !== 0x2d
					) {
						pendingWebpackIgnore = undefined;
						return;
					}
					const value = path.data();
					if (!webpackCommentRegExp.test(value)) {
						pendingWebpackIgnore = undefined;
						return;
					}
					/** @type {Record<string, EXPECTED_ANY>} */
					let options;
					try {
						options = parseMagicComment(value, magicCommentContext);
					} catch (err) {
						const { line: sl, column: sc } = locConverter.get(start);
						const { line: el, column: ec } = locConverter.get(end);
						module.addWarning(
							new CommentCompilationWarning(
								`Compilation error while processing magic comment(-s): /*${value}*/: ${
									/** @type {Error} */ (err).message
								}`,
								{
									start: { line: sl, column: sc },
									end: { line: el, column: ec }
								}
							)
						);
						pendingWebpackIgnore = undefined;
						return;
					}
					if (options.webpackIgnore === undefined) {
						pendingWebpackIgnore = undefined;
						return;
					}
					if (typeof options.webpackIgnore !== "boolean") {
						const { line: sl, column: sc } = locConverter.get(start);
						const { line: el, column: ec } = locConverter.get(end);
						module.addWarning(
							new UnsupportedFeatureWarning(
								`\`webpackIgnore\` expected a boolean, but received: ${options.webpackIgnore}.`,
								{
									start: { line: sl, column: sc },
									end: { line: el, column: ec }
								}
							)
						);
						pendingWebpackIgnore = undefined;
						return;
					}
					pendingWebpackIgnore = options.webpackIgnore;
				},
				[NodeType.Doctype]: () => {
					pendingWebpackIgnore = undefined;
				},
				[NodeType.Element]: {
					// Children (and `<template>` content) are walked by the
					// processor after `enter`; `exit` clears a pending
					// `webpackIgnore` once they're done.
					enter: (path) => {
						const ignore = pendingWebpackIgnore === true;
						pendingWebpackIgnore = undefined;

						if (ignore) {
							return;
						}

						const elementName = path.tagName();
						const attributeCount = path.attributeCount();
						const elementStart = path.start();
						const tagEnd = path.tagEnd();
						const nameEnd = path.nameEnd();

						// The first `<base href>` freezes the base for later URLs.
						if (
							documentBase === undefined &&
							elementName === "base" &&
							path.namespace() === NS_HTML
						) {
							const hrefAttr = path.findAttribute("href");
							if (hrefAttr !== 0) resolveDocumentBase(path, hrefAttr);
						}

						// Rebind the parse-scoped lazy attribute map to this element.
						attrMapPath = path;
						attrMapCount = attributeCount;
						currentAttributesMap = undefined;

						// Each matched attribute is a source; the element body (inline
						// `<style>`/`<script>`) is one more — content rather than an attribute.
						// All are dispatched by the same `switch (type)`.
						const sources =
							this.sourcesByTag[elementName] || this.sourcesByTag[ANY_TAG];
						const bodyItem = CONTENT_SOURCES[elementName];
						// Iterate the attributes, then one extra step for the element
						// body (`i === attributeCount`); the attribute ref is only read on the
						// attribute steps, so it stays in bounds.
						for (let i = 0; i < attributeCount + 1; i++) {
							const content = i === attributeCount;
							/** @type {SourceType} */
							let type;
							/** @type {string} */
							let value;
							/** @type {number} */
							let start;
							/** @type {number} */
							let end;
							/** @type {import("./syntax").HtmlAttributeRef} */
							let attr = 0;
							if (content) {
								if (!bodyItem) continue;
								if (bodyItem.filter && !bodyItem.filter(getAttributesMap())) {
									continue;
								}
								// `skip.text` drops the body `Text` node; the raw content
								// span is [`tagEnd`, `contentEnd`] on the element.
								const bodyStart = tagEnd;
								const bodyEnd = path.contentEnd();
								if (bodyEnd <= bodyStart) continue;
								value = source.slice(bodyStart, bodyEnd);
								if (value.trim() === "") continue;
								start = bodyStart;
								end = bodyEnd;
								type =
									typeof bodyItem.type === "function"
										? bodyItem.type(getAttributesMap(), css)
										: bodyItem.type;
							} else {
								attr = path.attributeAt(i);
								const item = sources[path.attributeName(attr)];
								if (!item) continue;
								if (
									item.namespace !== undefined &&
									path.namespace() !== item.namespace
								) {
									continue;
								}
								// Adoption-agency clones carry no offsets; skip blank values.
								if (path.attributeValueStart(attr) === -1) {
									continue;
								}
								value = path.attributeValue(attr);
								if (!value || !/\S/.test(value)) continue;
								const filter = item.filter;
								if (filter) {
									// The filter also sees the decoded value (the browser tokenizes it
									// decoded, e.g. `&#117;rl(`), so a value-only check needn't re-read it.
									const decoded = value.includes("&")
										? decodeHtmlEntities(value, true)
										: value;
									if (!filter(getAttributesMap(), decoded)) continue;
								}
								start = path.attributeValueStart(attr);
								end = path.attributeValueEnd(attr);
								type =
									typeof item.type === "function"
										? item.type(getAttributesMap(), css)
										: item.type;
							}
							// A resolved `type` selects the parse algorithm and the dependency
							// kind — the only dispatch in the parser.
							switch (type) {
								// Inline CSS — a `<style>` body (raw, a full stylesheet) or an
								// attribute value (decoded, re-escaped on write-back; `*-attribute`
								// is a declaration list). Needs `experiments.css`.
								case "stylesheet-style":
								case "stylesheet-style-attribute": {
									if (!css) break;
									const cssText = content
										? value
										: decodeHtmlEntities(value, true);
									if (cssText.trim() === "") break;
									const dep = new HtmlInlineStyleDependency(
										dataUri("text/css", cssText),
										[start, end],
										content ? false : type === "stylesheet-style-attribute",
										!content
									);
									setLoc(dep, start, end);
									module.addDependency(dep);
									module.addCodeGenerationDependency(dep);
									break;
								}
								// `<iframe srcdoc>`: an entity-encoded HTML document. Feed the
								// decoded markup back through the HTML pipeline as a nested
								// `data:text/html` module. Per spec the value is a full document
								// whose URL is `about:srcdoc`, so its base URL is inherited from
								// this document — asset URLs resolve against this file's context.
								case "srcdoc": {
									const htmlText = decodeHtmlEntities(value, true);
									// Only spin up a nested module when there is markup that can
									// reference an asset; text/formatting-only markup is identical
									// after rewriting (see `SRCDOC_ASSET_REGEXP`).
									if (
										!htmlText.includes("<") ||
										!SRCDOC_ASSET_REGEXP.test(htmlText)
									) {
										break;
									}
									const dep = new HtmlInlineHtmlDependency(
										dataUri("text/html", htmlText),
										[start, end]
									);
									setLoc(dep, start, end);
									module.addDependency(dep);
									module.addCodeGenerationDependency(dep);
									break;
								}
								// Inline `<script>` body — bundled as its own entry chunk.
								case "script":
								case "script-module":
									if (content) {
										const scriptType =
											/** @type {"script" | "script-module"} */ (type);
										const request = dataUri("text/javascript", value);
										const entryName = `__html_${moduleHash}_${nextEntryIndex++}`;
										const dep = new HtmlInlineScriptDependency(
											request,
											nameEnd,
											[start, end],
											entryName,
											scriptType === "script-module" ? "esm" : "commonjs"
										);
										setLoc(dep, start, end);
										module.addPresentationalDependency(dep);
										reconcileScriptTypeAttr(
											path,
											path.findAttribute("type"),
											nameEnd,
											scriptType,
											source
										);
										(scriptType === "script"
											? scriptEntries
											: scriptModuleEntries
										).push({
											request,
											entryName,
											type: scriptType
										});
										break;
									}
								// falls through — external `<script src>` joins the URL-bearing types
								case "src":
								case "srcset":
								case "css-url":
								case "msapplication-task":
								case "modulepreload":
								case "stylesheet": {
									// Parse the value into one or more URLs (decoding character
									// references, mapping spans back to raw offsets), then emit a plain
									// asset reference or an entry chunk per URL.
									const parse =
										type === "srcset"
											? parseSrcset
											: type === "css-url"
												? parseCssUrls
												: type === "msapplication-task"
													? parseMsapplicationTask
													: parseSrc;
									let text = value;
									/** @type {number[] | undefined} */
									let map;
									if (value.includes("&")) {
										({ text, map } = decodeHtmlEntitiesWithMap(value, true));
										if (!/\S/.test(text)) break;
									}
									/** @type {ParsedSource[] | undefined} */
									let parsed;
									try {
										parsed = parse(text);
									} catch (err) {
										const ds = locConverter.get(start);
										const de = locConverter.get(end);
										module.addError(
											new ModuleDependencyError(
												module,
												new WebpackError(
													`Bad value for attribute "${path.attributeName(
														attr
													)}" on element "${elementName}": ${
														/** @type {Error} */ (err).message
													}`
												),
												{
													start: { line: ds.line, column: ds.column },
													end: { line: de.line, column: de.column }
												}
											)
										);
										break;
									}
									if (!parsed) break;
									for (const [url, us, ue] of parsed) {
										// Internal `url(#id)` / fragment-only refs aren't assets.
										if (!url || url.startsWith("#")) continue;
										// Resolve the request against `<base href>`. Only relative
										// URLs are affected (scheme / `//` / `/` URLs ignore the
										// base); an external base drops them from the build.
										let request = url;
										if (
											documentBase &&
											url.charCodeAt(0) !== CC_SLASH &&
											!ABSOLUTE_URL_SCHEME_REGEXP.test(url)
										) {
											if (baseIsExternal) continue;
											request = baseDir + url;
										}
										const s = start + (map ? map[us] : us);
										const e = start + (map ? map[ue] : ue);
										// `src`/`srcset`/`css-url`/`msapplication-task` are plain assets;
										// the rest are narrowed to entry types here and share one
										// `HtmlEntryDependency`, recorded for HtmlModulesPlugin.
										if (
											type === "script" ||
											type === "script-module" ||
											type === "modulepreload" ||
											type === "stylesheet"
										) {
											const entryName = `__html_${moduleHash}_${nextEntryIndex++}`;
											const willBeModuleScript =
												type === "script-module" ||
												(outputModule && type === "script");
											/** @type {EntrySourceType} */
											const elementKind =
												type === "modulepreload"
													? "modulepreload"
													: type === "stylesheet"
														? "stylesheet"
														: willBeModuleScript
															? "script-module"
															: "script";
											const entryCategory =
												type === "stylesheet"
													? "css-import"
													: type === "script-module" || type === "modulepreload"
														? "esm"
														: undefined;
											// Native = the loading element is the tag the template clones
											// verbatim (`<script>` / `<link>`); a custom element is not.
											const nativeTag =
												elementKind === "stylesheet" ||
												elementKind === "modulepreload"
													? "link"
													: "script";
											// CSP/fetch attributes the template copies onto siblings.
											let copyableAttrsText = "";
											let hasOwnCrossOrigin = false;
											if (elementStart >= 0) {
												for (const copyableName of COPYABLE_SIBLING_ATTRS) {
													const copyableAttr = path.findAttribute(copyableName);
													if (copyableAttr !== 0) {
														copyableAttrsText += attrSourceSpan(
															path,
															source,
															copyableAttr
														);
														if (copyableName === "crossorigin") {
															hasOwnCrossOrigin = true;
														}
													}
												}
											}
											if (
												firstScriptStart === -1 &&
												(type === "script" || type === "script-module")
											) {
												firstScriptStart = elementStart;
											}
											// Sibling-clone attribute edits, captured from the parsed
											// attributes (offsets relative to the tag) so the template
											// needn't re-parse the tag text: `integrity` is dropped
											// (content-specific) and `script-module` clones are forced
											// to `type="module"` (its value range, else inserted).
											/** @type {Range | null} */
											let integrityRange = null;
											/** @type {Range | null} */
											let typeValueRange = null;
											if (elementStart >= 0 && elementName === nativeTag) {
												const integrityAttr = path.findAttribute("integrity");
												if (
													integrityAttr !== 0 &&
													path.attributeNameStart(integrityAttr) >= 0
												) {
													let rs = path.attributeNameStart(integrityAttr);
													while (
														rs > 0 &&
														isASCIIWhitespace(source.charCodeAt(rs - 1))
													) {
														rs--;
													}
													let re;
													const ivs = path.attributeValueStart(integrityAttr);
													if (ivs === -1) {
														re = path.attributeNameEnd(integrityAttr);
													} else {
														const q = source.charCodeAt(ivs - 1);
														const ive = path.attributeValueEnd(integrityAttr);
														re =
															q === CC_QUOTATION || q === CC_APOSTROPHE
																? ive + 1
																: ive;
													}
													integrityRange = [
														rs - elementStart,
														re - elementStart
													];
												}
												if (elementKind === "script-module") {
													const typeAttr = path.findAttribute("type");
													if (
														typeAttr !== 0 &&
														path.attributeValueStart(typeAttr) >= 0
													) {
														typeValueRange = [
															path.attributeValueStart(typeAttr) - elementStart,
															path.attributeValueEnd(typeAttr) - elementStart
														];
													}
												}
											}
											const dep = new HtmlEntryDependency(
												request,
												[s, e],
												entryName,
												entryCategory,
												elementKind,
												elementStart,
												tagEnd,
												elementName === nativeTag,
												copyableAttrsText,
												nameEnd,
												hasOwnCrossOrigin,
												firstScriptStart,
												integrityRange,
												typeValueRange
											);
											setLoc(dep, s, e);
											module.addPresentationalDependency(dep);
											if (
												elementName === "script" &&
												(type === "script" || type === "script-module")
											) {
												reconcileScriptTypeAttr(
													path,
													path.findAttribute("type"),
													nameEnd,
													type,
													source
												);
											}
											(type === "script"
												? scriptEntries
												: type === "script-module"
													? scriptModuleEntries
													: type === "stylesheet"
														? stylesheetEntries
														: modulePreloadEntries
											).push({ request, entryName, type });
										} else {
											const dep = new HtmlSourceDependency(request, [s, e]);
											setLoc(dep, s, e);
											module.addDependency(dep);
											module.addCodeGenerationDependency(dep);
										}
									}
									break;
								}
							}
						}
					},
					exit: () => {
						pendingWebpackIgnore = undefined;
					}
				}
			})
			// Skip AST output this walk never reads: `text` (script/style bodies are
			// read by offset via `contentEnd`) and `doctype`; keep `comments` for
			// magic comments (`webpackIgnore`).
			.process(source, { skip: { text: true, doctype: true } });

		const buildInfo = /** @type {HtmlModuleBuildInfo} */ (module.buildInfo);
		buildInfo.strict = true;
		if (baseUrlPrefix !== undefined) buildInfo.baseUrlPrefix = baseUrlPrefix;
		// Hand off the collected entries to HtmlModulesPlugin; it creates the
		// real compilation entries during the finishMake hook. The `script`
		// and `script-module` groups are chained via a leader-only dependOn
		// so they share a runtime; `modulepreload` and `stylesheet` entries
		// are emitted as independent entries since `<link rel=modulepreload>`
		// must preload without running and stylesheets have no runtime.
		if (
			scriptEntries.length > 0 ||
			scriptModuleEntries.length > 0 ||
			modulePreloadEntries.length > 0 ||
			stylesheetEntries.length > 0
		) {
			buildInfo.htmlEntryScripts = {
				script: scriptEntries,
				"script-module": scriptModuleEntries,
				modulepreload: modulePreloadEntries,
				stylesheet: stylesheetEntries
			};
		}

		const buildMeta = /** @type {BuildMeta} */ (state.module.buildMeta);
		buildMeta.exportsType = "default";

		state.module.addDependency(new StaticExportsDependency(["default"], true));

		return state;
	}
}

module.exports = HtmlParser;
