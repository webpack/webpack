/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Raj Aryan (based on SWC parser by Alexander Akait)
*/

"use strict";

const {
	CSS_TYPE,
	JAVASCRIPT_TYPE
} = require("../module/ModuleSourceTypeConstants");

const {
	JAVASCRIPT_SCRIPT_TYPES,
	JSON_SCRIPT_TYPES,
	LEADING_NEWLINE_ELEMENTS,
	LITERAL_TEXT_PARENTS,
	REDUNDANT_DEFAULT_ATTRIBUTES,
	REDUNDANT_TYPE_ATTRIBUTES,
	TRANSPARENT_IMPLIED_ELEMENTS
} = require("./data");
const {
	CC_APOSTROPHE,
	CC_LEFT_SQUARE_BRACKET,
	CC_LF,
	CC_NUMBER_SIGN,
	CC_QUOTATION_MARK,
	CC_RIGHT_SQUARE_BRACKET,
	CC_SOLIDUS,
	FLAG_FOSTER_REGION,
	JSON_TYPE,
	NS_HTML,
	NodeType,
	SVG_TYPE,
	_S,
	_asciiLowerCase,
	_asciiTrim,
	_canOmitEndTag,
	_canOmitStartTag,
	_contentOpensOutside,
	_deferEmbedded,
	_elementCloseTag,
	_endTagOutsideSpan,
	_endsOutsideLineBox,
	_formNeedsPointerReset,
	_fosterRunMoves,
	_fosterSourceRegion,
	_impliedCloseTag,
	_impliedTableGroupStartNeeded,
	_isRedundantAttribute,
	_isRemovableEmptyAttribute,
	_isRemovableEmptyElement,
	_isSvgRoot,
	_keepComment,
	_minifyOpenTag,
	_nodeStrings,
	_openTagSource,
	_printsNothing,
	_renderEmbeddedOrNull,
	_startsCharacterReference,
	_startsOutsideLineBox,
	_synthesizeOpenTag,
	_xmlOpenTag,
	collapseWhitespaceRuns,
	decodeEntities,
	escapeXmlText,
	isAllWs,
	isAsciiAlphanumeric,
	startsWithWs
} = require("./syntax-parser");
/** @typedef {import("./syntax-parser").EmbeddedSourceRenderer} EmbeddedSourceRenderer */
/** @typedef {import("./syntax-parser").DeferredEmbeddedSource} DeferredEmbeddedSource */
/** @typedef {import("./syntax-parser").HtmlNodeRef} HtmlNodeRef */
/** @typedef {import("./syntax-parser").HtmlElement} HtmlElement */
/** @typedef {import("./syntax-parser").HtmlDocument} HtmlDocument */
/** @typedef {import("./syntax-parser").HtmlDocumentFragment} HtmlDocumentFragment */
/** @typedef {import("./syntax-parser").HtmlNode} HtmlNode */
/** @typedef {import("./syntax-parser").HtmlAstSkip} HtmlAstSkip */
/** @typedef {import("./syntax-parser").HtmlPath} HtmlPath */

// JavaScript's two top level productions. Which one a body is decides whether
// `import` parses, whether it is strict, and whether `-->` opens a comment.
const MODULE_SCRIPT = "module";
const CLASSIC_SCRIPT = "script";
const CC_LEFT_PARENTHESIS = 0x28;
const CC_RIGHT_PARENTHESIS = 0x29;
const CC_ASTERISK = 0x2a;
const CC_REVERSE_SOLIDUS = 0x5c;
const CC_LEFT_CURLY_BRACKET = 0x7b;
const CC_RIGHT_CURLY_BRACKET = 0x7d;

/** @typedef {HtmlNode | HtmlDocument | HtmlDocumentFragment} HtmlVisitableNode */

// HTML-typed views over the generic visitor machinery (`util/SourceProcessor`).
/**
 * @typedef {import("../util/SourceProcessor").VisitorFn<HtmlPath>} VisitorFn
 * @typedef {import("../util/SourceProcessor").VisitorBucket<HtmlPath>} VisitorBucket
 * @typedef {import("../util/SourceProcessor").VisitorMap<HtmlPath>} VisitorMap
 * @typedef {import("../util/SourceProcessor").CompiledVisitorMap<HtmlPath>} CompiledVisitorMap
 */

/**
 * What the minifying printer may rewrite. Every entry is on unless it is
 * `false`, so a document one transform breaks can still be minified by the rest.
 * @typedef {object} HtmlTransformOptions
 * @property {(boolean | "all")=} collapseBooleanAttributes write a boolean attribute as the bare name its presence already means; `true` only the spellings the spec canonicalizes, `"all"` any value
 * @property {(boolean | "all" | "some" | string | RegExp | ((comment: string) => boolean))=} comments which comments survive: `"some"` (the default) the ones that carry something, `true` / `"all"` every one, `false` none, or the ones a pattern matches / a predicate accepts, over the comment's own text. A comment a parser or a server reads is kept whatever this says
 * @property {boolean=} normalizeAttributeQuotes drop or re-pick an attribute value's quotes
 * @property {boolean=} normalizeEnumeratedAttributes fold an enumerated value to the keyword it names
 * @property {boolean=} normalizeListAttributes normalize a space-, comma- or descriptor-separated list value (`class`, `rel`, `srcset`, `sizes`, the viewport `content`)
 * @property {boolean=} normalizeNumericAttributes write an integer attribute the one way its rules read it
 * @property {boolean=} normalizeUrlAttributes drop the whitespace around a URL value (`href`, `src`, `action`, …), which resolving the URL skips over
 * @property {boolean=} removeOptionalTags leave out an optional tag other than the `<html>` / `<head>` / `<body>` shell, which is `removeImpliedTags`
 */

/**
 * @typedef {object} HtmlProcessOptions
 * @property {string=} fragmentContext context element tag name for fragment parsing (see `parseHtml`); the HTML analog of the CSS parser's `as` parse-mode option
 * @property {boolean=} xml parse as XML instead of applying the HTML tree-construction rules
 * @property {HtmlAstSkip=} skip node kinds to omit from the AST for speed/memory (see `HtmlAstSkip`)
 * @property {boolean=} minimize print the safely-minified serialization (nodes rebuilt from source, inert comments dropped, opening-tag whitespace collapsed) as `process` walks, and return it (default false = walk only, return `""`)
 * @property {HtmlTransformOptions=} transforms which of the meaning-preserving rewrites the minifying print makes; each is on unless it is `false`
 * @property {(boolean | "conservative" | "smart" | "all")=} collapseWhitespace collapse each run of whitespace in text to a single space, except where an ancestor renders it verbatim; `"smart"` also drops what sits against a block edge and `"all"` drops every edge (default false)
 * @property {boolean=} removeEmptyAttributes drop an attribute whose empty value leaves it in the state its absence gives (default false)
 * @property {boolean=} removeEmptyElements drop an element with no children and no attributes, unless its bare form is meaningful (default false)
 * @property {boolean=} mergeStyles print a run of adjacent `<style>` elements as one sheet, which removes elements (default false)
 * @property {boolean=} mergeScripts print a run of adjacent bare `<script>` elements whose bodies this print writes itself as one, which removes elements, hoists a later body's declarations into the ones before it, and lets a failing body end the whole run (default false)
 * @property {boolean=} sortAttributes print an element's attributes commonest name first, ties by name, which nothing in HTML reads (default false)
 * @property {boolean=} sortTokenLists print every token list the DOM reads as a set (`class`, `rel`, `part`, …) in token order (default false)
 * @property {(boolean | "smart" | "all")=} removeRedundantAttributes drop an attribute whose value is the element's own default; `true` is `"smart"`, and `"all"` also drops the spec defaults a selector can match, and with them a value naming no keyword where that says the same (default false)
 * @property {(boolean | "smart" | "all")=} removeImpliedTags how much of the `<html>` / `<head>` / `<body>` shell §13.1.2.4 lets the parser imply may be left out: `"smart"` leaves out only the `<html>` start tag, `true` (or `"all"`) all six, `false` none (default `"smart"`)
 * @property {boolean=} deferSrcdoc whether an `<iframe srcdoc>` is among what `deferEmbeddedSource` collects (default true); false for a caller that minifies them itself, which keeps the attribute on the normal path and its shorter delimiter
 * @property {DeferredEmbeddedSource[]=} deferEmbeddedSource collects what `renderEmbeddedSource` would be offered instead of offering it, for a caller whose renderer is asynchronous: the print leaves a marker for each and `finish` puts the answers in their place, so one parse serves both. Takes precedence over `renderEmbeddedSource`
 * @property {EmbeddedSourceRenderer=} renderEmbeddedSource renders each nested body this document embeds — an inline `<style>`, every `style=""` (as the block's contents it is, SVG's and MathML's included), a `<script>` holding JSON or JavaScript (with `as` naming which production of it the body is — `"module"` for a `<script type=module>`, `"script"` for a classic one), every event handler attribute, with `as: "event-handler"` saying it is a function body rather than a script — the production a `return` at its top level is in, which a renderer whose engine takes only whole scripts wraps before it reads — an `<svg>` subtree, and the document an `<iframe srcdoc>` holds (decoded, and written back escaped). The only way any of them is minified: webpack minifies nothing here itself, and `builtinEmbeddedRenderer` is its own CSS and JSON minifiers for a caller to pass; returning anything but text leaves a body as written
 */

/**
 * What the HTML printer may be told, on top of the `mode` every language has:
 * `optimization.minimize.html`, and the renderer every nested body goes through.
 * `optimization.minimize.css` reaches inline CSS through `builtinEmbeddedRenderer`,
 * which `htmlMinify` passes (see `lib/config/defaults.js`).
 * @typedef {{ transforms?: HtmlTransformOptions, collapseWhitespace?: boolean | "conservative" | "smart" | "all", mergeStyles?: boolean, mergeScripts?: boolean, removeEmptyAttributes?: boolean, removeEmptyElements?: boolean, removeRedundantAttributes?: boolean | "smart" | "all", sortAttributes?: boolean, sortTokenLists?: boolean, removeImpliedTags?: boolean | "smart" | "all", renderEmbeddedSource?: EmbeddedSourceRenderer, deferEmbeddedSource?: DeferredEmbeddedSource[], deferSrcdoc?: boolean }} HtmlPrintOptions
 */

/** @typedef {import("../util/SourceProcessor").PrintContext<HtmlPath, HtmlNodeRef, HtmlPrintOptions>} PrintContext */

// Whether the text ends inside an unterminated character reference, so the next
// sibling's first characters could complete it (`a &am` + `p;`).
/**
 * @param {string} s source text
 * @returns {boolean} true when a character reference is still open at the end
 */
const _hasOpenReference = (s) => {
	const last = s.lastIndexOf("&");
	if (last === -1) return false;
	// Read in place: slicing the tail off to match it against a pattern allocates
	// a string per text node, and every one of them is thrown away here.
	for (let i = last + 1; i < s.length; i++) {
		const c = s.charCodeAt(i);
		if (!isAsciiAlphanumeric(c) && c !== CC_NUMBER_SIGN) return false;
	}
	return true;
};

/**
 * Whether the tag printed after this text would fuse with its tail: a `<` runs
 * into the next tag's name, and a `</` meets that tag's `<` as a bogus comment,
 * which consumes to the next `>` and takes the text with it.
 * @param {string} s source text
 * @returns {boolean} true when the text cannot be emitted as written
 */
const _tailFusesWithNextTag = (s) => {
	const tail = s.charCodeAt(s.length - 1);
	return tail === 60 || (tail === 47 && s.charCodeAt(s.length - 2) === 60);
};

/**
 * Whether the `<` at `at` would leave §13.2.5.6's data state rather than stand
 * as a character. A trailing one counts: what follows it in the output is the
 * next sibling's first character, which this string does not hold.
 * @param {string} s decoded text
 * @param {number} at index of the `<`
 * @returns {boolean} true when the `<` has to be written as a reference
 */
const _opensMarkup = (s, at) => {
	if (at + 1 === s.length) return true;
	const next = s.charCodeAt(at + 1);
	return (
		next === 0x21 ||
		next === 0x2f ||
		next === 0x3f ||
		(next >= 0x41 && next <= 0x5a) ||
		(next >= 0x61 && next <= 0x7a)
	);
};

/**
 * Escape a text node's decoded data for re-serialization: `&` and `<`, which
 * start a character reference and a tag, plus `>` outside minification, where
 * the §13.3 serialization is followed to the letter. A CR is written as a
 * reference either way — §13.2.3.5 rewrites a literal one to LF before the
 * tokenizer reads it. Unlike the exported `escapeText` (which also numerically
 * encodes newlines and U+00A0 for single-line `data:` URIs), this keeps
 * newlines and U+00A0 literal — byte-lean and the same DOM.
 * @param {string} s decoded text
 * @param {boolean} minify whether the shorter (still equivalent) form is wanted
 * @returns {string} text-content-safe string
 */
const _escapeTextContent = (s, minify) => {
	// A bare `>` is only ever a character in text, so §13.3's escape of it buys
	// nothing but bytes. A `<` only opens markup before what §13.2.5.6 leaves the
	// data state for, and an `&` only sometimes starts a character reference.
	if (minify) {
		if (!s.includes("&") && !s.includes("<") && !s.includes("\r")) return s;
		let out = "";
		let last = 0;
		for (let i = 0; i < s.length; i++) {
			const c = s.charCodeAt(i);
			if (c === 0x3c && _opensMarkup(s, i)) {
				out += `${s.slice(last, i)}&lt;`;
				last = i + 1;
			} else if (c === 0x26 && _startsCharacterReference(s, i)) {
				out += `${s.slice(last, i)}&amp;`;
				last = i + 1;
			} else if (c === 0x0d) {
				// §13.2.3.5 rewrites a literal CR to LF before the tokenizer sees it,
				// so one a character reference put in the text has to stay one.
				out += `${s.slice(last, i)}&#13;`;
				last = i + 1;
			}
		}
		return last === 0 ? s : out + s.slice(last);
	}
	if (
		!s.includes("&") &&
		!s.includes("<") &&
		!s.includes(">") &&
		!s.includes("\r")
	) {
		return s;
	}
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\r/g, "&#13;");
};

/**
 * Print a node of a document parsed as XML. Nothing HTML's serialization does
 * applies: no tag is implied or omitted, every value stays quoted, and text is
 * written as character data, as the source did or in the shorter spelling.
 * @param {HtmlPath} path the accessor positioned on the node to print
 * @param {PrintContext} writer the print context
 * @param {boolean} minify whether minifying
 * @returns {string} the node's text
 */
const _printXml = (path, writer, minify) => {
	switch (path.type()) {
		case NodeType.Element: {
			let inner = "";
			for (let c = path.firstChild(); c !== 0; c = path.nextSibling(c)) {
				inner += writer.get(c);
			}
			const tag = _xmlOpenTag(path, minify);
			// §3.1 makes `<a></a>` and `<a/>` the same element, so the shorter wins
			// when minifying and the source's spelling is kept otherwise.
			if (inner === "" && (minify || path.selfClosing())) {
				return `${tag.slice(0, -1)}/>`;
			}
			return `${tag}${inner}</${path.tagName()}>`;
		}
		case NodeType.Text: {
			const raw = path.source();
			const data = path.data();
			// A CDATA section the input ran out in would hold the end tags after it.
			if (!minify) {
				return raw.includes("<![CDATA[") && !raw.endsWith("]]>")
					? escapeXmlText(data)
					: raw;
			}
			let escaped = escapeXmlText(data);
			if (
				escaped.length > data.length + 12 &&
				!data.includes("]]>") &&
				!data.includes("\r")
			) {
				escaped = `<![CDATA[${data}]]>`;
			}
			// The source's own spelling when shorter: a declared entity reference, or
			// a `>` it left bare. A `<` in it is a CDATA section, never kept as is.
			return raw.length < escaped.length && !raw.includes("<") ? raw : escaped;
		}
		case NodeType.Comment: {
			const source = path.source();
			if (minify && !_keepComment(path.data(), source)) return "";
			// Closed if the input ran out in it, or it would hold the end tags after it.
			return source.startsWith("<!--") && !source.endsWith("-->")
				? `${source}-->`
				: source;
		}
		case NodeType.Doctype:
		case NodeType.ProcessingInstruction:
			// A DOCTYPE's internal subset declares what the references read, and an
			// instruction is addressed to a consumer: both print as written.
			return path.source();
		default: {
			let out = "";
			for (let c = path.firstChild(); c !== 0; c = path.nextSibling(c)) {
				out += writer.get(c);
			}
			return out;
		}
	}
};

/**
 * `_renderEmbeddedOrNull` with the body left exactly as written where the
 * renderer declines it, deferred to the caller's where one collects.
 * @param {string} source the nested body
 * @param {string} type its language, e.g. `"css"` / `"javascript"` / `"svg"`
 * @param {string=} as which production of that language it is, for one with more than one
 * @returns {string} the rendered body, or the original
 */
const _renderEmbedded = (source, type, as) => {
	if (_S._deferEmbeddedSource !== undefined) {
		const escape = _S._escapeEmbedded;
		return _deferEmbedded(
			source,
			type,
			(rendered) => {
				const text = typeof rendered === "string" ? rendered : source;
				return escape ? _escapeTextContent(text, true) : text;
			},
			as
		);
	}
	const rendered = _renderEmbeddedOrNull(source, type, as);
	return rendered === null ? source : rendered;
};

/**
 * Offer a `<style>` body to the renderer, blank text kept as written. Webpack
 * minifies no CSS here itself: `builtinEmbeddedRenderer` is what a caller
 * passes for that.
 * @param {string} css the element's text
 * @returns {string} the rendered text, the marker standing for it, or the text as written
 */
const _minifyStyleBody = (css) =>
	css.trim() === "" ? css : _renderEmbedded(css, CSS_TYPE);

/**
 * A `<script>`'s lowercased `type`, or `""` when it has none.
 * @param {HtmlPath} path the accessor
 * @param {HtmlElement} element the `<script>` element
 * @returns {string} the type
 */
const _scriptType = (path, element) => {
	for (const attribute of path.attributes(element)) {
		if (attribute.name === "type") {
			// The value the spec matches is the one the parser read, so a reference
			// is decoded first: `text&#47;javascript` runs, it is not a data block.
			return _asciiLowerCase(_asciiTrim(decodeEntities(attribute.value, true)));
		}
	}
	return "";
};

const _JSON_SUBTYPE_REGEXP =
	/^[!#$%&'*+.^_`|~\w-]+\/[!#$%&'*+.^_`|~\w-]*\+json$/;

/**
 * Offer a JSON `<script>` body to the renderer, blank text kept as written;
 * `stripJsonWhitespace` is what webpack's own answers with.
 * @param {string} json a `<script>` body
 * @returns {string} the rendered body, the marker standing for it, or the body as written
 */
const _minifyInlineJson = (json) =>
	json.trim() === "" ? json : _renderEmbedded(json, JSON_TYPE);

/**
 * Whether a `<style>` element's body is CSS: the attribute is optional, and the
 * only value that keeps it CSS is `text/css`.
 * @param {HtmlPath} path the accessor
 * @param {HtmlElement} element the `<style>` element
 * @returns {boolean} true when the body may be minified as CSS
 */
const _isCssStyleElement = (path, element) => {
	for (const attribute of path.attributes(element)) {
		if (attribute.name !== "type") continue;
		// Read the way `_scriptType` reads its own: the value the spec matches is
		// the one the parser read, so a reference is decoded first.
		const raw = attribute.value;
		const value = _asciiLowerCase(
			_asciiTrim(raw.includes("&") ? decodeEntities(raw, true) : raw)
		);
		return value === "" || value === "text/css";
	}
	return true;
};

// An at-rule that only applies at the top of a sheet, so a second sheet carrying
// one cannot be appended to a first.
const _SHEET_LEADING_AT_RULE_REGEXP = /@(?:charset|import|namespace)\b/i;

/**
 * A literal-text element's only child when that is one text node — the shape a
 * merge needs, since anything else means the element is empty.
 * @param {HtmlElement} element a `<style>` or `<script>`
 * @returns {HtmlNodeRef} the text node, or 0
 */
const _onlyTextChild = (element) => {
	const first = _S._nodeFirstChildren[element];
	return first !== 0 &&
		_S._nodeTypes[first] === NodeType.Text &&
		_S._nodeNextSiblings[first] === 0
		? first
		: 0;
};

/**
 * Whether an attribute reaches the output: one this print drops is not a
 * difference between two elements, nor an attribute that keeps a run apart.
 * @param {string} elementName lowercased element name
 * @param {string} name lowercased attribute name
 * @param {string} value its raw value
 * @returns {boolean} true when it prints
 */
const _attributePrints = (elementName, name, value) => {
	const markers =
		_S._removeRedundantAttributes !== "none"
			? REDUNDANT_TYPE_ATTRIBUTES[elementName]
			: undefined;
	const defaults =
		_S._removeRedundantAttributes === "all"
			? REDUNDANT_DEFAULT_ATTRIBUTES[elementName]
			: undefined;
	if (
		(markers !== undefined || defaults !== undefined) &&
		_isRedundantAttribute(markers, defaults, elementName, name, value)
	) {
		return false;
	}
	return !_isRemovableEmptyAttribute(elementName, name, value);
};

/**
 * How many of an element's attributes this print keeps.
 * @param {HtmlPath} path the accessor
 * @param {HtmlNodeRef} element the element
 * @returns {number} the count
 */
const _printedAttributeCount = (path, element) => {
	const name = path.tagName(element);
	let kept = 0;
	for (const attribute of path.attributes(element)) {
		if (_attributePrints(name, attribute.name, attribute.value)) kept++;
	}
	return kept;
};

/**
 * Whether two elements carry exactly the same attributes. Values compare raw:
 * two spellings of one value are rare enough not to be worth decoding for, and
 * reading them as different only declines a merge.
 * @param {HtmlPath} path the accessor
 * @param {HtmlElement} one an element
 * @param {HtmlElement} other another
 * @returns {boolean} true when the two agree on every attribute
 */
const _sameAttributes = (path, one, other) => {
	// What each will spell, not what the tree holds: a `type` this print drops
	// as redundant is not a difference between them.
	const elementName = path.tagName(one);
	let count = 0;
	for (const attribute of path.attributes(one)) {
		if (!_attributePrints(elementName, attribute.name, attribute.value)) {
			continue;
		}
		count++;
		const match = path.findAttribute(attribute.name, other);
		if (match === 0 || path.attributeValue(match) !== attribute.value) {
			return false;
		}
	}
	return count === _printedAttributeCount(path, other);
};

/**
 * The `<style>` that may be folded into `element`: the next sibling, when only
 * whitespace lies between them and the two agree on every attribute. Adjacency
 * is what makes the fold safe — nothing moves past anything, so the cascade is
 * the one the source wrote. Media, `title` and `blocking` all ride on the
 * attribute test, and `type` on both being CSS in the first place.
 * @param {HtmlPath} path the accessor
 * @param {HtmlElement} element a `<style>` element
 * @returns {HtmlElement} the next `<style>` of the run, or 0
 */
const _mergeableStyleAfter = (path, element) => {
	for (
		let next = _S._nodeNextSiblings[element];
		next !== 0;
		next = _S._nodeNextSiblings[next]
	) {
		const type = _S._nodeTypes[next];
		if (type === NodeType.Text) {
			if (!isAllWs(_nodeStrings[next])) return 0;
			continue;
		}
		// A comment this print drops leaves the two adjacent, so it is not what
		// stands between them; one it keeps still is.
		if (type === NodeType.Comment) {
			if (_printsNothing(path, next)) continue;
			return 0;
		}
		return type === NodeType.Element &&
			path.namespace(next) === NS_HTML &&
			path.tagName(next) === "style" &&
			_onlyTextChild(next) !== 0 &&
			_isCssStyleElement(path, next) &&
			_sameAttributes(path, element, next)
			? next
			: 0;
	}
	return 0;
};

/**
 * Whether a sheet ends outside every string, comment and bracket, so a sheet
 * appended to it starts rules of its own rather than finishing this one's last.
 * @param {string} css the sheet's text
 * @returns {boolean} true when another sheet may follow it
 */
const _sheetEndsCleanly = (css) => {
	let depth = 0;
	for (let i = 0; i < css.length; i++) {
		const c = css.charCodeAt(i);
		if (c === CC_REVERSE_SOLIDUS) {
			i++;
		} else if (c === CC_SOLIDUS && css.charCodeAt(i + 1) === CC_ASTERISK) {
			const close = css.indexOf("*/", i + 2);
			if (close === -1) return false;
			i = close + 1;
		} else if (c === CC_QUOTATION_MARK || c === CC_APOSTROPHE) {
			// A string ends at its quote, or at a newline as a bad string does.
			for (i++; i < css.length; i++) {
				const d = css.charCodeAt(i);
				if (d === CC_REVERSE_SOLIDUS) i++;
				else if (d === c || d === CC_LF) break;
			}
			if (i >= css.length) return false;
		} else if (
			c === CC_LEFT_CURLY_BRACKET ||
			c === CC_LEFT_PARENTHESIS ||
			c === CC_LEFT_SQUARE_BRACKET
		) {
			depth++;
		} else if (
			depth !== 0 &&
			(c === CC_RIGHT_CURLY_BRACKET ||
				c === CC_RIGHT_PARENTHESIS ||
				c === CC_RIGHT_SQUARE_BRACKET)
		) {
			depth--;
		}
	}
	return depth === 0;
};

/**
 * The text the first `<style>` of a run prints: every sheet in it, each offered
 * on its own and then joined, the rest of the run marked absorbed so their tags
 * and text print as nothing. Whether a sheet joins is read off its source, since
 * an answer may be a marker: one not ending cleanly would swallow the next, and
 * one after the first carrying `@import` (or `@charset` / `@namespace`) would
 * silently stop applying those.
 * @param {HtmlPath} path the accessor
 * @param {HtmlElement} element the run's first `<style>`
 * @param {string} css its own text
 * @returns {string} the run's text
 */
const _mergedStyleRun = (path, element, css) => {
	let out = _minifyStyleBody(css);
	if (!_sheetEndsCleanly(css)) return out;
	for (
		let next = _mergeableStyleAfter(path, element);
		next !== 0;
		next = _mergeableStyleAfter(path, next)
	) {
		const text =
			_nodeStrings[/** @type {HtmlNodeRef} */ (_onlyTextChild(next))];
		if (!_sheetEndsCleanly(text) || _SHEET_LEADING_AT_RULE_REGEXP.test(text)) {
			break;
		}
		if (_S._absorbed === null) _S._absorbed = new Set();
		_S._absorbed.add(next);
		out += _minifyStyleBody(text);
	}
	return out;
};

/**
 * Whether a script body ends where another can be appended after it. A body
 * still inside a string, template or block comment would swallow the next one;
 * a trailing line comment is fine because the join writes a newline first. The
 * body is read rather than parsed, so a regex literal can be taken for a string
 * or a comment — the answer holds for a body that parses, and one that does not
 * takes its whole run with it however this reads.
 * @param {string} js the script's text
 * @returns {boolean} true when nothing is left open
 */
const _scriptEndsClean = (js) => {
	let state = 0; // 0 none, 1 line comment, 2 block comment, 3 ' 4 " 5 `
	// Read by code unit: a body is scanned whole, and `js[i]` would allocate a
	// one-character string at every position of it.
	for (let i = 0; i < js.length; i++) {
		const c = js.charCodeAt(i);
		if (state === 0) {
			if (c === 47 /* / */) {
				const next = js.charCodeAt(i + 1);
				if (next === 47) {
					state = 1;
					i++;
				} else if (next === 42 /* * */) {
					state = 2;
					i++;
				}
			} else if (c === 39 /* ' */) {
				state = 3;
			} else if (c === 34 /* " */) {
				state = 4;
			} else if (c === 96 /* ` */) {
				state = 5;
			}
		} else if (state === 1) {
			// Every line terminator ends a line comment, not just the two HTML
			// normalizes text to — a `"` past one really does open a string.
			if (c === 10 || c === 13 || c === 0x2028 || c === 0x2029) state = 0;
		} else if (state === 2) {
			if (c === 42 && js.charCodeAt(i + 1) === 47) {
				state = 0;
				i++;
			}
		} else if (c === 92 /* \\ */) {
			i++;
		} else if (
			(state === 3 && c === 39) ||
			(state === 4 && c === 34) ||
			(state === 5 && c === 96)
		) {
			state = 0;
		}
	}
	return state === 0 || state === 1;
};

// ECMAScript's own whitespace and line terminators, which are wider than the
// HTML ones: a BOM, a form feed and U+2028 all sit before a directive.
const JS_WHITESPACE_REGEXP = /\s/;
const JS_LINE_TERMINATOR_REGEXP = /[\n\r\u2028\u2029]/;
const BOM_REGEXP = /^\uFEFF/;

/**
 * Whether a script body opens with what only a script's own start carries: a
 * hashbang, or a directive prologue — the leading string `"use strict"` is one.
 * Appended after another body neither means that any more.
 * @param {string} js the script's text
 * @returns {boolean} true when the body must start a script of its own
 */
const _opensAScript = (js) => {
	// A hashbang is only one at the very start, a BOM aside.
	if (js.replace(BOM_REGEXP, "").startsWith("#!")) return true;
	let i = 0;
	while (i < js.length) {
		const c = js[i];
		if (JS_WHITESPACE_REGEXP.test(c)) {
			i++;
		} else if (c === "/" && js[i + 1] === "/") {
			i += 2;
			while (i < js.length && !JS_LINE_TERMINATOR_REGEXP.test(js[i])) i++;
		} else if (c === "/" && js[i + 1] === "*") {
			const end = js.indexOf("*/", i + 2);
			if (end === -1) return true;
			i = end + 2;
		} else {
			break;
		}
	}
	return js[i] === '"' || js[i] === "'";
};

/**
 * Whether a body opens with `-->` still on its first line. That is a single
 * line comment only where nothing but whitespace and same-line comments comes
 * before it on the line, which an appended body no longer begins.
 * @param {string} js the script's text
 * @returns {boolean} true when appending the body would change what `-->` means
 */
const _opensWithHtmlCloseComment = (js) => {
	let i = 0;
	while (i < js.length) {
		const c = js[i];
		if (JS_LINE_TERMINATOR_REGEXP.test(c)) return false;
		if (JS_WHITESPACE_REGEXP.test(c)) {
			i++;
		} else if (c === "/" && js[i + 1] === "*") {
			const end = js.indexOf("*/", i + 2);
			// One spanning a line terminator ends the line it opened, so what
			// follows starts a line of its own.
			if (end === -1 || JS_LINE_TERMINATOR_REGEXP.test(js.slice(i + 2, end))) {
				return false;
			}
			i = end + 2;
		} else {
			return js.startsWith("-->", i);
		}
	}
	return false;
};

/**
 * The `<script>` that may be folded into `element`: the next sibling, when only
 * whitespace lies between them and neither carries a single attribute. Bare is
 * the whole test — a `src`, `type`, `nonce`, `async` or `id` all say the two
 * elements are not interchangeable with one.
 * @param {HtmlPath} path the accessor
 * @param {HtmlElement} element a `<script>` element
 * @returns {HtmlElement} the next `<script>` of the run, or 0
 */
const _mergeableScriptAfter = (path, element) => {
	if (_printedAttributeCount(path, element) !== 0) return 0;
	for (
		let next = _S._nodeNextSiblings[element];
		next !== 0;
		next = _S._nodeNextSiblings[next]
	) {
		const type = _S._nodeTypes[next];
		if (type === NodeType.Text) {
			if (!isAllWs(_nodeStrings[next])) return 0;
			continue;
		}
		// A comment this print drops leaves the two adjacent, so it is not what
		// stands between them; one it keeps still is.
		if (type === NodeType.Comment) {
			if (_printsNothing(path, next)) continue;
			return 0;
		}
		return type === NodeType.Element &&
			path.namespace(next) === NS_HTML &&
			path.tagName(next) === "script" &&
			_printedAttributeCount(path, next) === 0 &&
			_onlyTextChild(next) !== 0
			? next
			: 0;
	}
	return 0;
};

/**
 * The text the first `<script>` of a run prints: every body in it, joined by a
 * newline and a `;`. The newline ends a trailing line comment and the `;` keeps
 * the next body from continuing the last statement — `var a = 1` followed by
 * `(f)()` is one call without it.
 * @param {HtmlPath} path the accessor
 * @param {HtmlElement} element the run's first `<script>`
 * @param {string} js its own text
 * @returns {string} the run's text
 */
const _mergedScriptRun = (path, element, js) => {
	// A deferred body is a stand-in the caller swaps out after the print, so the
	// text read here is neither the code that runs nor what a guard can judge.
	if (_S._deferEmbeddedSource !== undefined) return js;
	// Asked before the body is scanned: a lone `<script>` is the common case and
	// scanning it whole to then find nothing to fold into is the whole cost.
	const first = _mergeableScriptAfter(path, element);
	if (first === 0) return js;
	// A prologue reaches whatever is appended after it, so a strict first body
	// would put the rest of the run in strict mode too.
	if (!_scriptEndsClean(js) || _opensAScript(js)) return js;
	let out = js;
	for (let next = first; next !== 0; next = _mergeableScriptAfter(path, next)) {
		const body =
			_nodeStrings[/** @type {HtmlNodeRef} */ (_onlyTextChild(next))];
		if (
			!_scriptEndsClean(body) ||
			_opensAScript(body) ||
			_opensWithHtmlCloseComment(body)
		) {
			break;
		}
		if (_S._absorbed === null) _S._absorbed = new Set();
		_S._absorbed.add(next);
		out += `\n;${body}`;
	}
	return out;
};

/**
 * An element's open tag as the printer would emit it; the source tag it was
 * read from is left in `_elementOpenSource`.
 * @param {HtmlPath} path positioned on the element
 * @param {boolean} minify whether minifying
 * @returns {string} the printed open tag
 */
const _elementOpenTag = (path, minify) => {
	const source = _openTagSource(path);
	return minify && source !== "" ? _minifyOpenTag(path, source) : source;
};

/**
 * Whether this element is one the settled runs concern — the parent a run was
 * fostered into, or the table it goes back inside. Every other element composes
 * its children the way it always did.
 * @param {HtmlNodeRef} node the element
 * @returns {boolean} true when it has to read the run
 */
const _fosterTouches = (node) =>
	(_S._fosterVerbatim !== null && _S._fosterVerbatim.has(node)) ||
	/** @type {Set<HtmlNodeRef>} */ (_S._fosterHolders).has(node) ||
	/** @type {Map<HtmlNodeRef, HtmlNodeRef[]>} */ (_S._fosteredRuns).has(node);

/**
 * The body a literal-text element (`script` / `style` / …) prints, minified
 * where the mode and the element's type allow it.
 * @param {HtmlPath} path the path the walk is at
 * @param {number} parent the literal-text element holding this text node
 * @param {string} data the text node's data
 * @param {boolean} minify whether the print is minifying
 * @returns {string} the body to print
 */
const _literalTextBody = (path, parent, data, minify) => {
	if (!minify) return data;
	const literalName = path.tagName(parent);
	if (literalName === "style") {
		if (!_isCssStyleElement(path, parent)) return data;
		if (!_S._mergeStyles) {
			const minified = _minifyStyleBody(data);
			return minified === null ? data : minified;
		}
		// The run's first sheet prints the whole run; the rest printed
		// into it here, before their own text or tags are reached.
		return _S._absorbed !== null && _S._absorbed.has(parent)
			? ""
			: _mergedStyleRun(path, parent, data);
	}
	if (literalName === "script") {
		const type = _scriptType(path, parent);
		if (JSON_SCRIPT_TYPES.has(type) || _JSON_SUBTYPE_REGEXP.test(type)) {
			return _minifyInlineJson(data);
		}
		// A bare `<script>` is the classic one a run may fold into, and
		// the run's first prints all of it — the rest printed into it here.
		let body = data;
		if (_S._mergeScripts && _printedAttributeCount(path, parent) === 0) {
			if (_S._absorbed !== null && _S._absorbed.has(parent)) return "";
			body = _mergedScriptRun(path, parent, data);
		}
		// Webpack ships no JS minifier, so an inline script is touched only
		// by a caller's renderer; the built-in declines it.
		if (JAVASCRIPT_SCRIPT_TYPES.has(type) && body.trim() !== "") {
			return _renderEmbedded(
				body,
				JAVASCRIPT_TYPE,
				type === MODULE_SCRIPT ? MODULE_SCRIPT : CLASSIC_SCRIPT
			);
		}
		return body;
	}
	return data;
};

/**
 * An element's children's text when this document foster parented something: a
 * run that moves prints inside the table it was written in rather than where the
 * tree holds it, interleaved with the table's own children in source order —
 * which is the order they were written in, so the parser fosters them right back
 * out to where they are now.
 * @param {HtmlPath} path the accessor positioned on the element
 * @param {PrintContext} writer the print context
 * @returns {string} the children's text
 */
const _composeAroundFoster = (path, writer) => {
	const node = path.node;
	const fostered = /** @type {Map<HtmlNodeRef, HtmlNodeRef>} */ (
		_S._fosteredNodes
	);
	const run = _fosterRunMoves(path, node)
		? /** @type {Map<HtmlNodeRef, HtmlNodeRef[]>} */ (_S._fosteredRuns).get(
				node
			)
		: undefined;
	/** @type {HtmlNodeRef[]} */
	const order = run === undefined ? [] : [...run];
	const moved = order.length !== 0;
	for (let c = path.firstChild(); c !== 0; c = path.nextSibling(c)) {
		const from = fostered.get(c);
		if (from !== undefined && _fosterRunMoves(path, from)) continue;
		order.push(c);
	}
	if (moved) order.sort((a, b) => path.start(a) - path.start(b));
	if (
		(_S._nodeFlags[node] & FLAG_FOSTER_REGION) !== 0 &&
		/** @type {Set<HtmlNodeRef>} */ (_S._fosterVerbatim).has(node)
	) {
		return _fosterSourceRegion(path, node);
	}
	let inner = "";
	for (let i = 0; i < order.length; i++) inner += writer.get(order[i]);
	return inner;
};

/**
 * The default HTML node printer — passed to the `SourceProcessor` and fired per
 * node once its children are printed (a developer could supply their own). It
 * takes the same `path` a visitor gets plus the print context as its `writer`,
 * and knows nothing of the walk: it switches on `path.type()`, serializes the node
 * — opening tags kept verbatim from source (attribute quoting / spacing
 * preserved), end tags generated, text re-escaped from its decoded value — pulling
 * its children's already-printed text from `writer.get`, and **returns** it. This
 * is the WHATWG serialization, so the output re-parses to the same DOM (text-node
 * offsets can overrun end tags, so source slices can't be used for text). The
 * minify transforms are dropping inert comments and collapsing the whitespace
 * between an opening tag's attributes; DOM-absent whitespace (between the
 * doctype and `<html>`, etc.) naturally falls away.
 * @param {HtmlPath} path the accessor positioned on the finished node
 * @param {PrintContext} writer the print context (children's printed text)
 * @returns {string} the node's serialized text
 * @experimental exposed as `webpack.html.syntax.printer`; unstable API
 */
const printer = (path, writer) => {
	const minify = writer.options.mode === "minify";
	if (_S._xmlMode) return _printXml(path, writer, minify);
	switch (path.type()) {
		case NodeType.Element: {
			// Folded into the `<style>` before it, which printed the whole run, or
			// carrying nothing at all.
			if (
				minify &&
				((_S._absorbed !== null && _S._absorbed.has(path.node)) ||
					_isRemovableEmptyElement(path, path.node))
			) {
				return "";
			}
			// Minifying rewrites the tag (attribute spacing / quoting) but never its
			// `/>`-ness, which the end-tag decision below reads off the source.
			const tag = _elementOpenTag(path, minify);
			const open = _S._elementOpenSource;
			// The whole subtree goes to the renderer, its nested bodies already
			// rendered — children print before their parent.
			const svgRoot =
				minify &&
				(_S._renderEmbeddedSource !== undefined ||
					_S._deferEmbeddedSource !== undefined) &&
				_isSvgRoot(path);
			// Void / self-closing elements have no children and no end tag; a
			// tag-less one (`<image>` → img, `</br>` → br) is rebuilt, not dropped.
			if (path.selfClosing()) {
				const selfClosed = open !== "" ? tag : _synthesizeOpenTag(path);
				return svgRoot ? _renderEmbedded(selfClosed, SVG_TYPE) : selfClosed;
			}
			// `<template>` holds its children in a content fragment, not the child
			// chain; every other element reconstructs from its children in order.
			const tc = path.templateContent();
			let inner = "";
			if (tc !== 0) {
				inner = writer.get(tc);
			} else {
				if (_S._fosteredRuns !== null && _fosterTouches(path.node)) {
					inner = _composeAroundFoster(path, writer);
				} else {
					for (let c = path.firstChild(); c !== 0; c = path.nextSibling(c)) {
						inner += writer.get(c);
					}
				}
				// Round-trip the parser's leading-newline strip (`<pre>` / `<textarea>`
				// / `<listing>`) so a value that starts with one survives re-parsing.
				if (
					inner.charCodeAt(0) === 10 &&
					path.namespace() === NS_HTML &&
					LEADING_NEWLINE_ELEMENTS.has(path.tagName())
				) {
					inner = `\n${inner}`;
				}
			}
			const name = path.tagName();
			// The end tag is handled by the optional-end-tag rules like any other.
			if (minify && _canOmitStartTag(path, name, path.node, open)) {
				const implied = _canOmitEndTag(path, name, path.node)
					? ""
					: `</${name}>`;
				return inner + implied;
			}
			if (open === "") {
				// A parser-implied structural element stays transparent — the parser
				// re-implies it — but only when attribute-less (repeated `<html>` /
				// `<body>` tags merge attributes onto the implied element).
				if (
					path.attributeCount() === 0 &&
					TRANSPARENT_IMPLIED_ELEMENTS.has(name)
				) {
					// Leading whitespace only survives re-parsing once `<body>` has
					// started: before that the insertion modes drop it. Materializing
					// the tag is the cheapest way to keep the text node intact.
					if (
						(name === "body" || name === "html") &&
						(startsWithWs(inner) || _contentOpensOutside(path.node))
					) {
						return `<${name}>${inner}`;
					}
					// §4.13 lets the start tag go only when the group before it kept
					// its end tag, or that one would take these columns over.
					if (_impliedTableGroupStartNeeded(path, name, path.node)) {
						return `<${name}>${inner}`;
					}
					// The parser re-implies the start tag, but not the end tag the
					// source carried: without it whatever follows moves inside.
					return inner + _impliedCloseTag(path, name, path.node);
				}
				// Anything else tag-less (adoption-agency clone, reconstructed
				// formatting element) must materialize or its formatting is lost.
				return `${_synthesizeOpenTag(path) + inner}</${name}>`;
			}
			const composed =
				(name === "form" && _formNeedsPointerReset(path) ? "</form>" : "") +
				tag +
				inner +
				// Its content came out of the source unchanged, so an end tag the
				// source never wrote would leave the parser somewhere else.
				((_S._nodeFlags[path.node] & FLAG_FOSTER_REGION) !== 0 &&
				!_endTagOutsideSpan(path)
					? ""
					: _elementCloseTag(path, name, open, inner === "", minify));
			return svgRoot ? _renderEmbedded(composed, SVG_TYPE) : composed;
		}
		case NodeType.Text: {
			const data = path.data();
			// Literal-text elements (`script` / `style` / …) keep their body raw;
			// every other text node is escaped (the WHATWG text split).
			const parent = path.parentOf();
			if (parent !== 0 && LITERAL_TEXT_PARENTS.has(path.tagName(parent))) {
				const foreign = path.namespace(parent) !== NS_HTML;
				const outer = _S._escapeEmbedded;
				_S._escapeEmbedded = foreign;
				const body = _literalTextBody(path, parent, data, minify);
				_S._escapeEmbedded = outer;
				// WHY: those same names in a foreign subtree hold character data
				// rather than raw text, so the body is still the CSS or JavaScript
				// to minify but is written back escaped — printed raw there, a `<`
				// in it opens a tag the source never wrote, and `</style>` ends the
				// element early.
				// A deferred body is a placeholder here, which escaping leaves
				// alone — its own answer is escaped as it lands.
				return foreign ? _escapeTextContent(body, minify) : body;
			}
			// Whitespace directly under `<head>` or `<html>` is outside any block
			// formatting context, so nothing ever renders it — the same inert-node
			// reasoning that drops comments. `<body>`'s whitespace does render.
			if (
				minify &&
				parent !== 0 &&
				path.namespace(parent) === NS_HTML &&
				(path.tagName(parent) === "head" || path.tagName(parent) === "html") &&
				isAllWs(data)
			) {
				return "";
			}
			// A `<` puts the node on the source-passthrough path below, which is what
			// keeps `<%= x %>` off the escaper — worth more than the whitespace.
			if (minify && _S._collapseWhitespace !== "none" && !data.includes("<")) {
				// Only elements rendering whitespace verbatim without any CSS are
				// excluded — by ancestor, since `white-space` inherits.
				let preformatted = false;
				for (
					let ancestor = parent;
					ancestor !== 0;
					ancestor = path.parentOf(ancestor)
				) {
					if (
						path.namespace(ancestor) === NS_HTML &&
						LEADING_NEWLINE_ELEMENTS.has(path.tagName(ancestor))
					) {
						preformatted = true;
						break;
					}
				}
				if (!preformatted) {
					let collapsed = collapseWhitespaceRuns(data);
					// Past `"conservative"`, whitespace against a boundary no line box
					// reaches is dropped rather than kept as one space.
					if (_S._collapseWhitespace !== "conservative") {
						const all = _S._collapseWhitespace === "all";
						if (all || _startsOutsideLineBox(path, path.node, parent)) {
							collapsed = collapsed.replace(/^ /, "");
						}
						if (all || _endsOutsideLineBox(path, path.node, parent)) {
							collapsed = collapsed.replace(/ $/, "");
						}
					}
					if (collapsed !== data) return _escapeTextContent(collapsed, minify);
				}
			}
			const raw = path.source();
			// WHY: off-spec workaround. §13.3 escapes `<` and `>` in text, which
			// would rewrite `<%= x %>` to `&lt;%= x %&gt;` in HTML webpack only passes
			// through, so text that decoded to itself is emitted as its source bytes.
			// The guards keep that equivalence: a character reference is at least two
			// characters longer than what it decodes to, so equal lengths mean nothing
			// decoded, while unequal ones mean the node was merged or foster-parented
			// and its range no longer describes `data`. The tail is checked separately
			// as the one place concatenation can change tokenization — a `<`, or a `&`
			// still open on a reference, fuses with the next sibling once a comment
			// between them is dropped. A CR is the rewrite the length test cannot see,
			// preprocessing mapping a lone one to LF, so it is excluded by name.
			if (
				raw.length === data.length &&
				!_tailFusesWithNextTag(raw) &&
				!(_S.inputHasCr && raw.includes("\r")) &&
				!_hasOpenReference(raw)
			) {
				return raw;
			}
			return _escapeTextContent(data, minify);
		}
		case NodeType.Doctype: {
			// A leaf with no children, so its source is already tight. Parsing
			// ASCII-lowercases the keyword and the name; the identifiers behind them
			// are case-sensitive strings and stay as written.
			const source = path.source();
			if (!minify) return source;
			const head = /^<!doctype[\t\n\f\r ]+([^\t\n\f\r >]+)/i.exec(source);
			return head === null
				? source
				: `<!doctype ${_asciiLowerCase(head[1])}${source.slice(
						head[0].length
					)}`;
		}
		case NodeType.Comment:
			return minify && !_keepComment(path.data(), path.source())
				? ""
				: path.source();
		case NodeType.ProcessingInstruction:
			// A leaf whose source is already tight, and unlike a comment it carries
			// instructions for a consumer, so minification never drops it.
			return path.source();
		default: {
			// Document / DocumentFragment: concatenate children in order.
			if (_S._fosteredRuns !== null && _fosterTouches(path.node)) {
				return _composeAroundFoster(path, writer);
			}
			let out = "";
			for (let c = path.firstChild(); c !== 0; c = path.nextSibling(c)) {
				out += writer.get(c);
			}
			return out;
		}
	}
};

module.exports.CLASSIC_SCRIPT = CLASSIC_SCRIPT;
module.exports.MODULE_SCRIPT = MODULE_SCRIPT;
module.exports.printer = printer;
