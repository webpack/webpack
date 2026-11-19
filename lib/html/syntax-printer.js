/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Raj Aryan (based on SWC parser by Alexander Akait)
*/

"use strict";

const {
	CSS_TYPE,
	JAVASCRIPT_TYPE
} = require("../module/ModuleSourceTypeConstants");

const { JSON_TYPE, SVG_TYPE } = require("../util/dataURL");
const {
	JAVASCRIPT_SCRIPT_TYPES,
	JSON_SCRIPT_TYPES,
	LEADING_NEWLINE_ELEMENTS,
	LITERAL_TEXT_PARENTS,
	TRANSPARENT_IMPLIED_ELEMENTS
} = require("./data");
const {
	EMBEDDED_STYLESHEET,
	FLAG_FOSTER_REGION,
	FOREIGN_ELEMENT,
	Field,
	Flag,
	Namespace,
	NodeType,
	_CC_NUMBER_SIGN: CC_NUMBER_SIGN,
	_S: S,
	_attributeCountOf: attributeCountOf,
	_attributeList: attributeList,
	_canOmitEndTag: canOmitEndTag,
	_canOmitStartTag: canOmitStartTag,
	_contentOpensOutside: contentOpensOutside,
	_dataOf: dataOf,
	_deferEmbedded: deferEmbedded,
	_elementCloseTag: elementCloseTag,
	_endTagOutsideSpan: endTagOutsideSpan,
	_endTagReadsAsText: endTagReadsAsText,
	_endsOutsideLineBox: endsOutsideLineBox,
	_firstChild: firstChild,
	_formNeedsPointerReset: formNeedsPointerReset,
	_fosterRunMoves: fosterRunMoves,
	_fosterSourceRegion: fosterSourceRegion,
	_headLeftBefore: headLeftBefore,
	_impliedCloseTag: impliedCloseTag,
	_impliedTableGroupStartNeeded: impliedTableGroupStartNeeded,
	_isCssStyleElement: isCssStyleElement,
	_isRemovableEmptyElement: isRemovableEmptyElement,
	_isSvgRoot: isSvgRoot,
	_keepComment: keepComment,
	_minifyOpenTag: minifyOpenTag,
	_namespaceOf: namespaceOf,
	_nextSibling: nextSibling,
	_onlyTextChild: onlyTextChild,
	_openTagSource: openTagSource,
	_opensImpliedShell: opensImpliedShell,
	_parentOf: parentOf,
	_printedAttributeCount: printedAttributeCount,
	_printsNothing: printsNothing,
	_renderEmbeddedOrNull: renderEmbeddedOrNull,
	_rendersNow: rendersNow,
	_sheetDecides: sheetDecides,
	_startsCharacterReference: startsCharacterReference,
	_startsOutsideLineBox: startsOutsideLineBox,
	_styleRunText: styleRunText,
	_synthesizeOpenTag: synthesizeOpenTag,
	_tagNameOf: tagNameOf,
	_takeRenderedSheet: takeRenderedSheet,
	_whitespaceInertUnder: whitespaceInertUnder,
	_xmlCharacterData: xmlCharacterData,
	_xmlElementIsStyled: xmlElementIsStyled,
	_xmlOpenTag: xmlOpenTag,
	asciiLowercase,
	collapseWhitespaceRuns,
	decodeEntities,
	escapeXmlText,
	isAllAsciiWhitespace,
	isAsciiAlphanumeric,
	isXmlWellFormedText,
	startsWithAsciiWhitespace,
	stripAsciiWhitespace,
	tokenize
} = require("./syntax-parser");

const NS_HTML = Namespace.HTML;
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
 * @property {boolean=} normalizeUrlAttributes drop the whitespace around a URL value (`href`, `src`, `action`, ...), which resolving the URL skips over
 * @property {boolean=} removeOptionalTags leave out an optional tag other than the `<html>` / `<head>` / `<body>` shell, which is `removeImpliedTags`
 */

/**
 * @typedef {object} HtmlProcessOptions
 * @property {string=} fragmentContext context element tag name for fragment parsing (see `parseHtml`); the HTML analog of the CSS parser's `as` parse-mode option
 * @property {boolean=} xml parse as XML instead of applying the HTML tree-construction rules
 * @property {boolean=} removeSvgMetadata omit SVG metadata elements and their contents when minifying XML (default false)
 * @property {boolean=} removeSvgEditorData omit known editor elements and attributes within SVG when minifying XML (default false)
 * @property {boolean=} removeUnusedSvgNamespaces omit unused prefixed namespace declarations within SVG when minifying XML (default false)
 * @property {boolean=} shortenSvgColors offer opaque SVG presentation colors to the inline CSS renderer when minifying XML (default false)
 * @property {boolean=} shortenSvgNumbers shorten SVG geometry and transform decimals, separators and redundant transform arguments without rounding, changing units or rewriting exponent notation when minifying XML (default false)
 * @property {boolean=} shortenSvgPathData compact SVG path numbers, repeated commands and separators without rounding or changing segments when minifying XML (default false)
 * @property {boolean=} srcdoc parse as an `<iframe srcdoc>` document, which is never in quirks mode (see `parseHtml`)
 * @property {boolean=} scripting parse a `noscript` as raw text, as a browser with scripting on does (see `parseHtml`); a print always does
 * @property {import("./syntax-parser").HtmlParseOptions["parseError"]=} parseError optional callback for each parse error of the source, as `parseHtml` reports it
 * @property {("\"" | "'")=} xmlQuote the quote an XML minifying print gives an attribute whose value costs the same in either (default `"`); `'` for a document bound for a `"`-quoted string, such as a CSS `url("data:...")`
 * @property {HtmlAstSkip=} skip node kinds to omit from the AST for speed/memory (see `HtmlAstSkip`)
 * @property {HtmlTransformOptions=} transforms which of the meaning-preserving rewrites the minifying print makes; each is on unless it is `false`
 * @property {(boolean | "conservative" | "smart" | "all")=} collapseWhitespace collapse each run of HTML whitespace in text to a single space, except where an ancestor renders it verbatim; `"smart"` also drops what sits against a block edge and `"all"` drops every edge. In XML, remove only whitespace-only text in known SVG containers, under `xml:space` too since that lays out text alone, preserving text and foreign content (default false)
 * @property {boolean=} removeEmptyAttributes drop an attribute whose empty value leaves it in the state its absence gives (default false)
 * @property {boolean=} removeEmptyElements drop an element with no children and no attributes where its bare form renders nothing and nothing reads it; in XML, only SVG g/defs containers with no non-namespace attributes or DTD constraints (default false)
 * @property {boolean=} mergeStyles print a run of adjacent `<style>` elements as one sheet, which removes elements (default false)
 * @property {boolean=} mergeScripts print a run of adjacent bare `<script>` elements whose bodies this print writes itself as one, which removes elements, hoists a later body's declarations into the ones before it, and lets a failing body end the whole run (default false)
 * @property {boolean=} sortAttributes print an HTML or XML element's attributes commonest name first, ties by name (default false)
 * @property {boolean=} sortTokenLists print every token list the DOM reads as a set (`class`, `rel`, `part`, ...) in token order (default false)
 * @property {boolean=} reuseSvgPaths when minifying XML, reuse unidentified duplicate leaf paths through existing IDs, preserving target element types (default false)
 * @property {boolean=} mergeSvgPaths when minifying XML, merge disjoint crisp axis-aligned paths with explicit opaque paint and disabled dashes and markers (default false)
 * @property {boolean=} cleanupSvgStructure when minifying XML, remove safe wrappers and redundant presentation values without IDs or document dependencies (default false)
 * @property {boolean=} sortSvgDefinitions when minifying XML, sort adjacent resources inside defs by type and ID (default false)
 * @property {boolean=} convertSvgShapes when minifying XML, convert leaf SVG lines, polylines and polygons to shorter paths, or equal-radius ellipses to circles, without rounding (default false)
 * @property {boolean=} sortSvgSymbols when minifying XML, sort adjacent SVG symbol definitions by ID, preserving IDs and references unless document dependencies can observe order (default false)
 * @property {boolean=} removeSvgScripts when minifying XML, remove `script` elements, event handler and `srcdoc` attributes, `javascript:` and `vbscript:` URLs and links to HTML or SVG `data:` documents (default false)
 * @property {boolean=} inlineSvgStyles when minifying XML, move simple SVG stylesheet rules into the style attributes of the elements they match and drop the stylesheets and their classes (default false)
 * @property {string[]=} removeSvgAttributes when minifying XML, remove attributes matching these `element:attribute:value` patterns of case-insensitive regular expressions, each matched whole (default none)
 * @property {{ id?: string[], class?: string[] }=} removeSvgElements when minifying XML, remove elements with these IDs or classes and their content (default none)
 * @property {boolean=} removeSvgTitles when minifying XML, remove SVG `title` elements, which name the image for assistive technology and tooltips (default false)
 * @property {boolean=} removeSvgDescriptions when minifying XML, remove SVG `desc` elements, which describe the image for assistive technology (default false)
 * @property {boolean=} removeSvgRasterImages when minifying XML, remove SVG `image` elements referencing JPEG, PNG or GIF images (default false)
 * @property {boolean=} removeSvgXlink when minifying XML, spell `xlink:href` as the SVG 2 `href` where an element has no `href`, a link's `xlink:show` as `target`, and drop `xlink:type="simple"` (default false)
 * @property {boolean=} removeSvgDimensions when minifying XML, remove the root `svg` element's `width` and `height`, moving plain ones into a missing `viewBox` (default false)
 * @property {boolean=} removeSvgViewBox when minifying XML, remove a root `svg` element's `viewBox` that restates its plain `width` and `height` (default false)
 * @property {boolean=} removeXmlDoctype when minifying XML, remove a DOCTYPE without an internal subset where no entity reference needs one (default false)
 * @property {boolean=} cleanupSvgIds when minifying XML, remove IDs nothing in the document references and shorten the rest, unless document dependencies can read them (default false)
 * @property {boolean=} removeHiddenSvgElements when minifying XML, remove ID-free SVG content hidden by `display="none"`, zero opacity or size, a `visibility` nothing inside sets back, or geometry that draws nothing (default false)
 * @property {boolean=} mergeDisjointSvgPaths when minifying XML, merge adjacent paths of any shape with the same attributes whose bounds, stroke included, do not overlap; lossy, since anti-aliasing can blend a pixel both reach differently once merged (default false)
 * @property {boolean=} applySvgTransforms with `shortenSvgPathData`, bake each SVG path's `transform` into its points at `svgPrecision` decimals (3 when unset), scaling a stroke it scales; lossy (default false)
 * @property {(boolean | "loose")=} convertSvgCurvesToArcs with `shortenSvgPathData`, write SVG path cubic curves within `svgPrecision` decimals (3 when unset) of one circle as arcs of it, or with `"loose"` as svgo fits them, at quarter points and unrounded; lossy (default false)
 * @property {(boolean | "unsafe")=} removeUnknownSvgAttributes when minifying XML, remove unprefixed attributes no SVG, ARIA or animation specification defines from SVG elements, keeping `data-`, `aria-`, `role` and event handlers, `role` too with `"unsafe"`; off where scripts or stylesheets depend on the document (default false)
 * @property {(boolean | "unsafe")=} removeDeprecatedSvgAttributes when minifying XML, write `xml:lang` as `lang` in place of a `lang` it overrides, or with `"unsafe"` drop it (default false)
 * @property {boolean=} collapseSvgAttributeWhitespace when minifying XML, trim every attribute value and collapse each run of whitespace in it to one space, `xmlns` included (default false)
 * @property {number=} svgAnglePrecision with `convertSvgTransforms`, round the angle each transform turns by to this many decimal places, 0 to 15, before recomposing it (default unset)
 * @property {string[]=} inlineSvgStylePseudoClasses with `inlineSvgStyles`, pseudo-classes, with or without their colon, to inline as if they always held (default none)
 * @property {boolean=} removeUnknownSvgElements when minifying XML, remove SVG-namespace elements no SVG specification defines, with their content, outside `switch`; off where scripts or stylesheets depend on the document (default false)
 * @property {boolean=} removeOffCanvasSvgPaths when minifying XML, remove unnamed paths whose bounds, stroke included, lie wholly outside the root `viewBox`, outside transforms, filters, markers and styles; lossy, since a viewport of another aspect ratio shows past the `viewBox` (default false)
 * @property {boolean=} convertSvgTransforms with `shortenSvgNumbers`, recompose each SVG transform list as the shortest list whose matrix matches it within `svgPrecision` decimals (3 when unset), so a matrix can become a rotation about a point; lossy (default false)
 * @property {number=} svgPrecision when minifying XML, round the SVG numbers and path data the shortening switches shorten to this many decimal places, a whole number from 0 to 15 (default: exact)
 * @property {(boolean | "smart" | "all")=} removeRedundantAttributes drop an attribute whose value is the element's own default; `true` is `"smart"`, and `"all"` also drops the spec defaults a selector can match, and with them a value naming no keyword where that says the same (default false)
 * @property {(boolean | "smart" | "all")=} removeImpliedTags how much of the `<html>` / `<head>` / `<body>` shell §13.1.2.4 lets the parser imply may be left out: `"smart"` leaves out only the `<html>` start tag, `true` (or `"all"`) all six, `false` none (default `"smart"`)
 * @property {boolean=} deferSrcdoc whether an `<iframe srcdoc>` is among what `deferEmbeddedSource` collects (default true); false for a caller that minifies them itself, which keeps the attribute on the normal path and its shorter delimiter
 * @property {((offer: Omit<DeferredEmbeddedSource, "build">) => string | undefined)=} embeddedAnswers what a print before this one was answered for each offer, which `processAsync` passes where an answer overturned a choice made without it: a body it answers is written from it rather than deferred
 * @property {DeferredEmbeddedSource[]=} deferEmbeddedSource collects what `renderEmbeddedSource` would be offered instead of offering it, for a caller whose renderer is asynchronous: the print leaves a marker for each and `finish` puts the answers in their place, so one parse serves both. Takes precedence over `renderEmbeddedSource`
 * @property {EmbeddedSourceRenderer=} renderEmbeddedSource renders each nested body this document embeds - an inline `<style>` (with `as: "embedded-stylesheet"` saying it is read in this document's encoding rather than as a file of its own, so it declares no `@charset`; a `data:` URL's stylesheet is a file of its own, offered with no `as`), every `style=""` (as the block's contents it is, SVG's and MathML's included), a `<script>` holding JSON or JavaScript (with `as` naming which production of it the body is - `"module"` for a `<script type=module>`, `"script"` for a classic one), every event handler attribute, with `as: "event-handler"` saying it is a function body rather than a script - the production a `return` at its top level is in, which a renderer whose engine takes only whole scripts wraps before it reads - an `<svg>` subtree, with `as: "foreign-element"` saying it is an element of this document rather than a standalone `.svg`, and the document an `<iframe srcdoc>` holds (decoded, and written back escaped). The only way any of them is minified: webpack minifies nothing here itself, and `builtinEmbeddedRenderer` is its own CSS and JSON minifiers for a caller to pass; returning anything but text leaves a body as written
 */

/**
 * What the HTML printer may be told, on top of the `mode` every language has:
 * `optimization.minimize.html`, and the renderer every nested body goes through.
 * `optimization.minimize.css` reaches inline CSS through `builtinEmbeddedRenderer`,
 * which `htmlMinify` passes (see `lib/config/defaults.js`).
 * @typedef {{ transforms?: HtmlTransformOptions, collapseWhitespace?: boolean | "conservative" | "smart" | "all", mergeStyles?: boolean, mergeScripts?: boolean, removeEmptyAttributes?: boolean, removeEmptyElements?: boolean, removeSvgMetadata?: boolean, removeSvgEditorData?: boolean, removeUnusedSvgNamespaces?: boolean, shortenSvgNumbers?: boolean, shortenSvgColors?: boolean, shortenSvgPathData?: boolean, removeRedundantAttributes?: boolean | "smart" | "all", sortAttributes?: boolean, sortTokenLists?: boolean, sortSvgSymbols?: boolean, cleanupSvgStructure?: boolean, removeSvgScripts?: boolean, removeSvgTitles?: boolean, removeSvgAttributes?: string[], inlineSvgStyles?: boolean, removeSvgElements?: { id?: string[], class?: string[] }, removeSvgDescriptions?: boolean, removeSvgRasterImages?: boolean, removeSvgXlink?: boolean, removeSvgDimensions?: boolean, removeSvgViewBox?: boolean, removeXmlDoctype?: boolean, cleanupSvgIds?: boolean, removeHiddenSvgElements?: boolean, svgPrecision?: number, convertSvgTransforms?: boolean, applySvgTransforms?: boolean, convertSvgCurvesToArcs?: boolean | "loose", removeOffCanvasSvgPaths?: boolean, removeUnknownSvgElements?: boolean, removeUnknownSvgAttributes?: boolean | "unsafe", removeDeprecatedSvgAttributes?: boolean | "unsafe", collapseSvgAttributeWhitespace?: boolean, svgAnglePrecision?: number, inlineSvgStylePseudoClasses?: string[], mergeDisjointSvgPaths?: boolean, mergeSvgPaths?: boolean, reuseSvgPaths?: boolean, sortSvgDefinitions?: boolean, convertSvgShapes?: boolean, removeImpliedTags?: boolean | "smart" | "all", renderEmbeddedSource?: EmbeddedSourceRenderer, deferEmbeddedSource?: DeferredEmbeddedSource[], embeddedAnswers?: (offer: Omit<DeferredEmbeddedSource, "build">) => string | undefined, deferSrcdoc?: boolean, xmlQuote?: "\"" | "'" }} HtmlPrintOptions
 */

/** @typedef {import("../util/SourceProcessor").PrintContext<HtmlPath, HtmlNodeRef, HtmlPrintOptions>} PrintContext */

// Whether the text ends inside an unterminated character reference, so the next
// sibling's first characters could complete it (`a &am` + `p;`).
/**
 * @param {string} s source text
 * @returns {boolean} true when a character reference is still open at the end
 */
const hasOpenReference = (s) => {
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

// Every NUL, which a text node holds as U+FFFD wherever it keeps one at all.
const NUL_REGEXP = /\0/g;

/**
 * Whether the tag printed after this text would fuse with its tail: a `<` runs
 * into the next tag's name, and a `</` meets that tag's `<` as a bogus comment,
 * which consumes to the next `>` and takes the text with it.
 * @param {string} s source text
 * @returns {boolean} true when the text cannot be emitted as written
 */
const tailFusesWithNextTag = (s) => {
	const tail = s.charCodeAt(s.length - 1);
	return tail === 60 || (tail === 47 && s.charCodeAt(s.length - 2) === 60);
};

/**
 * Source text with only its tail respelled where the next tag would fuse with
 * it: a trailing `<` or `</`, or a character reference left open at the end.
 * @param {string} raw source text
 * @returns {string} the text, safe to print before any sibling
 */
const withSafeTail = (raw) => {
	if (tailFusesWithNextTag(raw)) {
		const at = raw.lastIndexOf("<");
		return `${raw.slice(0, at)}&lt;${raw.slice(at + 1)}`;
	}
	if (!hasOpenReference(raw)) return raw;
	const at = raw.lastIndexOf("&");
	return (
		raw.slice(0, at) +
		escapeTextContent(decodeEntities(raw.slice(at), false), true)
	);
};

/**
 * Whether the `<` at `at` would leave §13.2.5.6's data state rather than stand
 * as a character. A trailing one counts: what follows it in the output is the
 * next sibling's first character, which this string does not hold.
 * @param {string} s decoded text
 * @param {number} at index of the `<`
 * @returns {boolean} true when the `<` has to be written as a reference
 */
const opensMarkup = (s, at) => {
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

// A template engine's `<%` (EJS, ERB, lodash): `<?` and `<!` already open
// markup, so text escapes those anyway.
const TEMPLATE_OPENER_REGEXP = /<%/g;

/**
 * How many `<%` template delimiters a text spells.
 * @param {string} text the text
 * @returns {number} the count
 */
const templateOpenerCount = (text) => {
	if (!text.includes("<%")) return 0;
	return /** @type {RegExpMatchArray} */ (text.match(TEMPLATE_OPENER_REGEXP))
		.length;
};

/**
 * Escape a text node's decoded data for re-serialization: `&` and `<`, which
 * start a character reference and a tag, plus `>` outside minification, where
 * the §13.3 serialization is followed to the letter. A CR is written as a
 * reference either way - §13.2.3.5 rewrites a literal one to LF before the
 * tokenizer reads it. Unlike the exported `escapeText` (which also numerically
 * encodes newlines and U+00A0 for single-line `data:` URIs), this keeps
 * newlines and U+00A0 literal - byte-lean and the same DOM.
 * @param {string} s decoded text
 * @param {boolean} minify whether the shorter (still equivalent) form is wanted
 * @param {boolean=} templates whether a `<%` stays a reference, as one the source escaped does
 * @returns {string} text-content-safe string
 */
const escapeTextContent = (s, minify, templates) => {
	// A bare `>` is only ever a character in text, so §13.3's escape of it buys
	// nothing but bytes. A `<` only opens markup before what §13.2.5.6 leaves the
	// data state for, and an `&` only sometimes starts a character reference.
	if (minify) {
		if (!s.includes("&") && !s.includes("<") && !s.includes("\r")) return s;
		let out = "";
		let last = 0;
		for (let i = 0; i < s.length; i++) {
			const c = s.charCodeAt(i);
			if (
				c === 0x3c &&
				(opensMarkup(s, i) || (templates && s.charCodeAt(i + 1) === 0x25))
			) {
				out += `${s.slice(last, i)}&lt;`;
				last = i + 1;
			} else if (c === 0x26 && startsCharacterReference(s, i)) {
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
 * Whether an element is an SVG or XHTML `<style>` holding CSS, whose body a
 * caller's renderer is offered as the stylesheet it is.
 * @param {HtmlPath} path the accessor
 * @param {number} element the element
 * @returns {boolean} true when its body is a stylesheet to render
 */
const isXmlStyleElement = (path, element) => {
	if (
		S._renderEmbeddedSource === undefined &&
		S._deferEmbeddedSource === undefined &&
		S._embeddedAnswers === undefined
	) {
		return false;
	}
	const name = tagNameOf(element);
	if (name !== "style" && !name.endsWith(":style")) return false;
	// As in HTML, the attribute is optional and only `text/css` keeps it CSS.
	const attribute = path.fieldNamed(Field.attributes, "type", element);
	if (attribute !== 0) {
		const type = asciiLowercase(stripAsciiWhitespace(path.value(attribute)));
		if (type !== "" && type !== "text/css") return false;
	}
	return xmlElementIsStyled(element);
};

/**
 * Whether a text node is the whole body of an SVG or XHTML `<style>`.
 * @param {HtmlPath} path the accessor positioned on the text node
 * @returns {boolean} true when the text is a stylesheet to render
 */
const isXmlStylesheet = (path) => {
	// XML character data is only ever inside the root element.
	const parent = parentOf(path.node);
	// A comment or an element beside it splits the sheet, which is left alone.
	return (
		firstChild(parent) === path.node &&
		nextSibling(path.node) === 0 &&
		isXmlStyleElement(path, parent)
	);
};

/**
 * The stylesheet an SVG or XHTML `<style>` holds across comments the print
 * drops: the sheet is the element's text, which they split only in the source.
 * @param {HtmlPath} path the accessor positioned on the element
 * @param {PrintContext} writer the print context, whose print of a comment says whether it is kept
 * @returns {string | null} that text, or null when a single text node, an element or a kept comment is the body
 */
const xmlSplitStylesheet = (path, writer) => {
	const first = firstChild(path.node);
	if (first === 0 || nextSibling(first) === 0) return null;
	if (!isXmlStyleElement(path, path.node)) return null;
	let data = "";
	for (let c = first; c !== 0; c = nextSibling(c)) {
		const type = S._types[c];
		if (type === NodeType.Text) {
			data += dataOf(c);
		} else if (type !== NodeType.Comment || writer.lookup(c) !== "") {
			// A kept comment's print is cached, so its predicate is asked once.
			return null;
		}
	}
	// A blank sheet is printed as written, as the renderer is never asked.
	return data.trim() === "" ? null : data;
};

/**
 * @param {string} data a stylesheet's text
 * @param {boolean | undefined} removeUnusedNamespaces whether a namespace the sheet stops naming may go, so a changed answer decides the print
 * @returns {string} the caller's rendering of it, written as XML character data
 */
const xmlRenderedStylesheet = (data, removeUnusedNamespaces) =>
	S._deferEmbeddedSource === undefined
		? xmlCharacterData(takeRenderedSheet(data))
		: deferEmbedded(
				data,
				CSS_TYPE,
				(rendered) =>
					xmlCharacterData(typeof rendered === "string" ? rendered : data),
				EMBEDDED_STYLESHEET,
				removeUnusedNamespaces
					? (rendered) => typeof rendered === "string" && rendered !== data
					: undefined
			);

/**
 * Which JavaScript production a text node is, as the whole body of an SVG or XHTML
 * `<script>` that loads no file instead, for a caller's renderer to be offered.
 * @param {HtmlPath} path the accessor positioned on the text node
 * @returns {string | null} `"module"` or `"script"`, or null when it is no script to render
 */
const xmlScriptProduction = (path) => {
	if (
		S._renderEmbeddedSource === undefined &&
		S._deferEmbeddedSource === undefined &&
		S._embeddedAnswers === undefined
	) {
		return null;
	}
	const parent = parentOf(path.node);
	const name = tagNameOf(parent);
	if (
		(name !== "script" && !name.endsWith(":script")) ||
		firstChild(parent) !== path.node ||
		nextSibling(path.node) !== 0 ||
		!xmlElementIsStyled(parent)
	) {
		return null;
	}
	let type = "";
	for (const attribute of attributeList(parent)) {
		// A script with a file of its own runs that and ignores its text.
		if (attribute.name === "href" || attribute.name.endsWith(":href")) {
			return null;
		}
		if (attribute.name === "type") {
			type = asciiLowercase(stripAsciiWhitespace(attribute.value));
		}
	}
	if (!JAVASCRIPT_SCRIPT_TYPES.has(type)) return null;
	return type === MODULE_SCRIPT ? MODULE_SCRIPT : CLASSIC_SCRIPT;
};

/**
 * @param {string} data a script's text
 * @param {string} as its production, `"module"` or `"script"`
 * @returns {string | null} the caller's rendering of it as XML character data, or null where it declined
 */
const xmlRenderedScript = (data, as) => {
	if (S._deferEmbeddedSource !== undefined) {
		return deferEmbedded(
			data,
			JAVASCRIPT_TYPE,
			(rendered) =>
				xmlCharacterData(typeof rendered === "string" ? rendered : data),
			as
		);
	}
	const rendered = renderEmbeddedOrNull(data, JAVASCRIPT_TYPE, as);
	return rendered === null ? null : xmlCharacterData(rendered);
};

// XML 1.0 §2.8 XMLDecl with only version 1.0, UTF-8 and standalone "no", what a
// parser assumes without one (§2.9); "yes" stays, as external declarations read it.
const XML_DEFAULT_DECLARATION =
	/^<\?xml[\t\n\r ]+version[\t\n\r ]*=[\t\n\r ]*(["'])1\.0\1(?:[\t\n\r ]+encoding[\t\n\r ]*=[\t\n\r ]*(["'])[Uu][Tt][Ff]-8\2)?(?:[\t\n\r ]+standalone[\t\n\r ]*=[\t\n\r ]*(["'])no\3)?[\t\n\r ]*\?>$/;

/**
 * Print a node of a document parsed as XML. Nothing HTML's serialization does
 * applies: no tag is implied or omitted, every value stays quoted, and text is
 * written as character data, as the source did or in the shorter spelling.
 * @param {HtmlPath} path the accessor positioned on the node to print
 * @param {PrintContext} writer the print context
 * @param {boolean} minify whether minifying
 * @returns {string} the node's text
 */
const printXml = (path, writer, minify) => {
	switch (path.type()) {
		case NodeType.Element: {
			const tag = xmlOpenTag(path, minify);
			const sheet = minify ? xmlSplitStylesheet(path, writer) : null;
			let inner = "";
			if (sheet !== null) {
				inner = xmlRenderedStylesheet(
					sheet,
					writer.options.removeUnusedSvgNamespaces
				);
			} else {
				for (let c = firstChild(path.node); c !== 0; c = nextSibling(c)) {
					inner += writer.get(c);
				}
			}
			// §3.1 makes `<a></a>` and `<a/>` the same element, so the shorter wins
			// when minifying and the source's spelling is kept otherwise.
			if (inner === "" && (minify || path.flag(Flag.selfClosing))) {
				return `${tag.slice(0, -1)}/>`;
			}
			return `${tag}${inner}</${tagNameOf(path.node)}>`;
		}
		case NodeType.Text: {
			const raw = path.source();
			const data = dataOf(path.node);
			const stylesheet = minify && isXmlStylesheet(path);
			if (stylesheet && data.trim() !== "") {
				return xmlRenderedStylesheet(
					data,
					writer.options.removeUnusedSvgNamespaces
				);
			}
			const script =
				minify && data.trim() !== "" ? xmlScriptProduction(path) : null;
			if (script !== null) {
				const rendered = xmlRenderedScript(data, script);
				if (rendered !== null) return rendered;
			}
			// A CDATA section the input ran out in would hold the end tags after it.
			// A blank stylesheet is kept as written, as the renderer is never asked.
			if (!minify || stylesheet) {
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
			// a `>` it left bare. A `<` is a CDATA section, a bare `&` no reference.
			// Text a pass wrote has no source, so its spelling is the escaped one.
			return raw !== "" &&
				raw.length < escaped.length &&
				isXmlWellFormedText(raw)
				? raw
				: escaped;
		}
		case NodeType.Comment: {
			const source = path.source();
			if (minify && !keepComment(dataOf(path.node), source, path.start())) {
				return "";
			}
			// Closed if the input ran out in it, or it would hold the end tags after it.
			// A declaration outside the DTD reads as one up to the next `>`.
			if (source.startsWith("<!--")) {
				return source.endsWith("-->") ? source : `${source}-->`;
			}
			return source.endsWith(">") ? source : `${source}>`;
		}
		// A DOCTYPE's internal subset declares what the references read, and an
		// instruction is addressed to a consumer: both print as written. XML has
		// no fragment or template, so nothing else reaches the printer.
		default: {
			const source = path.source();
			if (
				!minify ||
				S._types[path.node] !== NodeType.ProcessingInstruction ||
				!XML_DEFAULT_DECLARATION.test(source)
			) {
				return source;
			}
			// An XML declaration stating only the defaults tells a parser nothing.
			// What prints before it decides, so a second print drops it alike.
			const parent = parentOf(path.node);
			if (S._types[parent] !== NodeType.Document) return source;
			// Text outside the root reaches the tree as a comment, so only a dropped
			// comment may print before it.
			for (let c = firstChild(parent); c !== path.node; c = nextSibling(c)) {
				if (
					S._types[c] !== NodeType.Comment ||
					keepComment(
						dataOf(c),
						S._input.slice(S._starts[c], S._ends[c]),
						S._starts[c]
					)
				) {
					return source;
				}
			}
			return "";
		}
	}
};

// What ends a `<style>` or `<script>` body early, or the `<noscript>` it sits
// in for a reader with scripting on: the name, then whitespace, `/` or `>`.
const NOSCRIPT_CLOSE_REGEXP = /<\/noscript(?=[\t\n\f\r />])/gi;

/**
 * Whether an answer for a `<style>` or `<script>` body would end the element
 * before its own end tag, read by the tokenizer in the state the body puts it
 * in, or spells a `</noscript>` the body did not.
 * @param {string} rendered the renderer's answer
 * @param {string} source the body as written
 * @param {string} type its language
 * @returns {boolean} true when the answer has to be declined
 */
const closesEarly = (rendered, source, type) => {
	const added = rendered.match(NOSCRIPT_CLOSE_REGEXP);
	if (added !== null) {
		const kept = source.match(NOSCRIPT_CLOSE_REGEXP);
		if (kept === null || added.length > kept.length) return true;
	}
	// `<!--` matters too: a `<script>` after it keeps the body open past `</script>`.
	if (!rendered.includes("</") && !rendered.includes("<!--")) return false;
	const name = type === CSS_TYPE ? "style" : "script";
	const element = `<${name}>${rendered}</${name}>`;
	let firstClose = -1;
	tokenize(element, 0, {
		closeTag: (_input, start, end) => {
			if (firstClose === -1) firstClose = start;
			return end;
		}
	});
	return firstClose !== element.length - name.length - 3;
};

/**
 * `renderEmbeddedOrNull` with the body left exactly as written where the
 * renderer declines it, deferred to the caller's where one collects.
 * @param {string} source the nested body
 * @param {string} type its language, e.g. `"css"` / `"javascript"` / `"svg"`
 * @param {string=} as which production of that language it is, for one with more than one
 * @param {((rendered: string | undefined) => boolean)=} decides whether a deferred answer overturns a choice this print made without it
 * @returns {string} the rendered body, or the original
 */
const renderEmbedded = (source, type, as, decides) => {
	// A raw text body an answer would close early is kept as written.
	const rawText = !S._escapeEmbedded && type !== SVG_TYPE;
	if (S._deferEmbeddedSource !== undefined) {
		const escape = S._escapeEmbedded;
		return deferEmbedded(
			source,
			type,
			(rendered) => {
				const text =
					typeof rendered === "string" &&
					!(rawText && closesEarly(rendered, source, type))
						? rendered
						: source;
				return escape ? escapeTextContent(text, true) : text;
			},
			as,
			decides
		);
	}
	const rendered = renderEmbeddedOrNull(source, type, as);
	return rendered === null || (rawText && closesEarly(rendered, source, type))
		? source
		: rendered;
};

/**
 * Offer a `<style>` body to the renderer, blank text kept as written. Webpack
 * minifies no CSS here itself: `builtinEmbeddedRenderer` is what a caller
 * passes for that.
 * @param {string} css the element's text
 * @returns {string} the rendered text, the marker standing for it, or the text as written
 */
const minifyStyleBody = (css) => {
	if (css.trim() === "") return css;
	// Through the emptiness check's memo, which may have rendered it already.
	if (rendersNow()) return takeRenderedSheet(css);
	return renderEmbedded(css, CSS_TYPE, EMBEDDED_STYLESHEET, sheetDecides());
};

/**
 * A `<script>`'s lowercased `type`, or `""` when it has none.
 * @param {HtmlPath} path the accessor
 * @param {HtmlElement} element the `<script>` element
 * @returns {string} the type
 */
const scriptType = (path, element) => {
	for (const attribute of attributeList(element)) {
		if (attribute.name === "type") {
			// The value the spec matches is the one the parser read, so a reference
			// is decoded first: `text&#47;javascript` runs, it is not a data block.
			return asciiLowercase(
				stripAsciiWhitespace(decodeEntities(attribute.value, true))
			);
		}
	}
	return "";
};

const JSON_SUBTYPE_REGEXP =
	/^[!#$%&'*+.^_`|~\w-]+\/[!#$%&'*+.^_`|~\w-]*\+json$/;

/**
 * Offer a JSON `<script>` body to the renderer, blank text kept as written;
 * `stripJsonWhitespace` is what webpack's own answers with.
 * @param {string} json a `<script>` body
 * @returns {string} the rendered body, the marker standing for it, or the body as written
 */
const minifyInlineJson = (json) =>
	json.trim() === "" ? json : renderEmbedded(json, JSON_TYPE);

/**
 * The text the first `<style>` of a run prints: every sheet in it joined and
 * offered as one, the rest of the run marked absorbed so their tags and text
 * print as nothing. A sheet after the first carrying `@import` (or `@charset` /
 * `@namespace`) is not joined, since it would stop applying.
 * @param {HtmlPath} path the accessor
 * @param {HtmlElement} element the run's first `<style>`
 * @param {string} css its own text
 * @returns {string} the run's text
 */
const mergedStyleRun = (path, element, css) =>
	minifyStyleBody(styleRunText(path, element, css, true));

/**
 * Whether a script body ends where another can be appended after it. A body
 * still inside a string, template or block comment would swallow the next one;
 * a trailing line comment is fine because the join writes a newline first. The
 * body is read rather than parsed, so a regex literal can be taken for a string
 * or a comment - the answer holds for a body that parses, and one that does not
 * takes its whole run with it however this reads.
 * @param {string} js the script's text
 * @returns {boolean} true when nothing is left open
 */
const scriptEndsClean = (js) => {
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
			// normalizes text to - a `"` past one really does open a string.
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
 * hashbang, or a directive prologue - the leading string `"use strict"` is one.
 * Appended after another body neither means that any more.
 * @param {string} js the script's text
 * @returns {boolean} true when the body must start a script of its own
 */
const opensAScript = (js) => {
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
			// Asked only once `scriptEndsClean` held, so the comment is closed; the
			// walk moves on either way.
			i = Math.max(i + 2, js.indexOf("*/", i + 2) + 2);
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
const opensWithHtmlCloseComment = (js) => {
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
 * the whole test - a `src`, `type`, `nonce`, `async` or `id` all say the two
 * elements are not interchangeable with one.
 * @param {HtmlPath} path the accessor
 * @param {HtmlElement} element a `<script>` element
 * @returns {HtmlElement} the next `<script>` of the run, or 0
 */
const mergeableScriptAfter = (path, element) => {
	// The caller asks only of a bare one: `element` prints no attribute.
	for (
		let next = S._nextSiblings[element];
		next !== 0;
		next = S._nextSiblings[next]
	) {
		const type = S._types[next];
		if (type === NodeType.Text) {
			if (!isAllAsciiWhitespace(S._strings[next])) return 0;
			continue;
		}
		// A comment this print drops leaves the two adjacent, so it is not what
		// stands between them; one it keeps still is.
		if (type === NodeType.Comment) {
			if (printsNothing(path, next)) continue;
			return 0;
		}
		return type === NodeType.Element &&
			namespaceOf(next) === NS_HTML &&
			tagNameOf(next) === "script" &&
			printedAttributeCount(path, next) === 0 &&
			onlyTextChild(next) !== 0
			? next
			: 0;
	}
	return 0;
};

/**
 * The text the first `<script>` of a run prints: every body in it, joined by a
 * newline and a `;`. The newline ends a trailing line comment and the `;` keeps
 * the next body from continuing the last statement - `var a = 1` followed by
 * `(f)()` is one call without it.
 * @param {HtmlPath} path the accessor
 * @param {HtmlElement} element the run's first `<script>`
 * @param {string} js its own text
 * @returns {string} the run's text
 */
const mergedScriptRun = (path, element, js) => {
	// A deferred body is a stand-in the caller swaps out after the print, so the
	// text read here is neither the code that runs nor what a guard can judge.
	if (S._deferEmbeddedSource !== undefined) return js;
	// Asked before the body is scanned: a lone `<script>` is the common case and
	// scanning it whole to then find nothing to fold into is the whole cost.
	const first = mergeableScriptAfter(path, element);
	if (first === 0) return js;
	// A prologue reaches whatever is appended after it, so a strict first body
	// would put the rest of the run in strict mode too.
	if (!scriptEndsClean(js) || opensAScript(js)) return js;
	let out = js;
	for (let next = first; next !== 0; next = mergeableScriptAfter(path, next)) {
		const body = S._strings[onlyTextChild(next)];
		if (
			!scriptEndsClean(body) ||
			opensAScript(body) ||
			opensWithHtmlCloseComment(body)
		) {
			break;
		}
		if (S._absorbed === null) S._absorbed = new Set();
		S._absorbed.add(next);
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
const elementOpenTag = (path, minify) => {
	const source = openTagSource(path);
	return minify && source !== "" ? minifyOpenTag(path, source) : source;
};

/**
 * Whether this element is one the settled runs concern - the parent a run was
 * fostered into, or the table it goes back inside. Every other element composes
 * its children the way it always did.
 * @param {HtmlNodeRef} node the element
 * @returns {boolean} true when it has to read the run
 */
const fosterTouches = (node) =>
	(S._fosterVerbatim !== null && S._fosterVerbatim.has(node)) ||
	/** @type {Set<HtmlNodeRef>} */ (S._fosterHolders).has(node) ||
	/** @type {Map<HtmlNodeRef, HtmlNodeRef[]>} */ (S._fosteredRuns).has(node);

/**
 * The body a literal-text element (`script` / `style` / ...) prints, minified
 * where the mode and the element's type allow it.
 * @param {HtmlPath} path the path the walk is at
 * @param {number} parent the literal-text element holding this text node
 * @param {string} data the text node's data
 * @param {boolean} minify whether the print is minifying
 * @returns {string} the body to print
 */
const literalTextBody = (path, parent, data, minify) => {
	if (!minify) return data;
	const literalName = tagNameOf(parent);
	if (literalName === "style") {
		if (!isCssStyleElement(path, parent)) return data;
		if (!S._mergeStyles) return minifyStyleBody(data);
		// The run's first sheet prints the whole run; the rest printed
		// into it here, before their own text or tags are reached.
		return S._absorbed !== null && S._absorbed.has(parent)
			? ""
			: mergedStyleRun(path, parent, data);
	}
	if (literalName === "script") {
		const type = scriptType(path, parent);
		if (JSON_SCRIPT_TYPES.has(type) || JSON_SUBTYPE_REGEXP.test(type)) {
			return minifyInlineJson(data);
		}
		// A bare `<script>` is the classic one a run may fold into, and
		// the run's first prints all of it - the rest printed into it here.
		let body = data;
		if (S._mergeScripts && printedAttributeCount(path, parent) === 0) {
			if (S._absorbed !== null && S._absorbed.has(parent)) return "";
			body = mergedScriptRun(path, parent, data);
		}
		// Webpack ships no JS minifier, so an inline script is touched only
		// by a caller's renderer; the built-in declines it.
		if (JAVASCRIPT_SCRIPT_TYPES.has(type) && body.trim() !== "") {
			return renderEmbedded(
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
 * tree holds it, interleaved with the table's own children in source order -
 * which is the order they were written in, so the parser fosters them right back
 * out to where they are now.
 * @param {HtmlPath} path the accessor positioned on the element
 * @param {PrintContext} writer the print context
 * @returns {string} the children's text
 */
const composeAroundFoster = (path, writer) => {
	const node = path.node;
	const fostered = /** @type {Map<HtmlNodeRef, HtmlNodeRef>} */ (
		S._fosteredNodes
	);
	const run = fosterRunMoves(path, node)
		? /** @type {Map<HtmlNodeRef, HtmlNodeRef[]>} */ (S._fosteredRuns).get(node)
		: undefined;
	/** @type {HtmlNodeRef[]} */
	const order = run === undefined ? [] : [...run];
	const moved = order.length !== 0;
	for (let c = firstChild(path.node); c !== 0; c = nextSibling(c)) {
		const from = fostered.get(c);
		if (from !== undefined && fosterRunMoves(path, from)) continue;
		order.push(c);
	}
	if (moved) order.sort((a, b) => path.start(a) - path.start(b));
	if (
		(S._flags[node] & FLAG_FOSTER_REGION) !== 0 &&
		/** @type {Set<HtmlNodeRef>} */ (S._fosterVerbatim).has(node)
	) {
		return fosterSourceRegion(path, node);
	}
	let inner = "";
	for (let i = 0; i < order.length; i++) inner += writer.get(order[i]);
	return inner;
};

/**
 * A comment or processing instruction as written, closed where the input ran
 * out inside it (§13.2.5): left open, the end tags printed after it are read as
 * part of it. A `<!--` one reads a `>` as data unless `--` or `--!` precedes it,
 * so it is rebuilt from its data; the rest end at their first `>` and get one.
 * @param {HtmlPath} path the accessor positioned on the node
 * @returns {string} the node's source, closed
 */
const closedCommentSource = (path) => {
	const source = path.source();
	if (path.end() !== S._input.length) return source;
	if (source.startsWith("<!--")) {
		return source.endsWith("-->") || source.endsWith("--!>")
			? source
			: `<!--${dataOf(path.node)}-->`;
	}
	return source.endsWith(">") ? source : `${source}>`;
};

/**
 * Whether an element's printed children start with a line feed, read from the
 * first child that prints anything, as reading the joined text copies the subtree.
 * Only a text child can start so: an element or a comment prints from its `<`.
 * @param {PrintContext} writer the print context (children's printed text)
 * @param {HtmlElement} element the element whose children were printed
 * @returns {boolean} true when the first printed child starts with a line feed
 */
const childrenStartWithNewline = (writer, element) => {
	for (let c = firstChild(element); c !== 0; c = nextSibling(c)) {
		const text = writer.get(c);
		if (text !== "") {
			return S._types[c] === NodeType.Text && text.charCodeAt(0) === 10;
		}
	}
	return false;
};

/**
 * The default HTML node printer - passed to the `SourceProcessor` and fired per
 * node once its children are printed (a developer could supply their own). It
 * takes the same `path` a visitor gets plus the print context as its `writer`,
 * and knows nothing of the walk: it switches on `path.type()`, serializes the node
 * - opening tags kept verbatim from source (attribute quoting / spacing
 * preserved), end tags generated, text re-escaped from its decoded value - pulling
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
	if (S._xmlMode) return printXml(path, writer, minify);
	switch (path.type()) {
		case NodeType.Element: {
			// Folded into the `<style>` before it, which printed the whole run, or
			// carrying nothing at all.
			if (
				minify &&
				((S._absorbed !== null && S._absorbed.has(path.node)) ||
					isRemovableEmptyElement(path, path.node))
			) {
				return "";
			}
			// Minifying rewrites the tag (attribute spacing / quoting) but never its
			// `/>`-ness, which the end-tag decision below reads off the source.
			const tag = elementOpenTag(path, minify);
			const open = S._elementOpenSource;
			// The whole subtree goes to the renderer, its nested bodies already
			// rendered - children print before their parent.
			const svgRoot =
				minify &&
				(S._renderEmbeddedSource !== undefined ||
					S._deferEmbeddedSource !== undefined) &&
				isSvgRoot(path);
			// Void elements have no children and no end tag; a tag-less one
			// (`<image>` -> img, `</br>` -> br) is rebuilt, not dropped. Only an HTML
			// void carries the flag here, so it is never an `<svg>`.
			if (path.flag(Flag.selfClosing)) {
				return open !== "" ? tag : synthesizeOpenTag(path);
			}
			// `<template>` holds its children in a content fragment, not the child
			// chain; every other element reconstructs from its children in order.
			const tc = path.field(0, Field.content);
			let inner = "";
			if (tc !== 0) {
				inner = writer.get(tc);
			} else {
				const fostered = S._fosteredRuns !== null && fosterTouches(path.node);
				if (fostered) {
					inner = composeAroundFoster(path, writer);
				} else {
					for (let c = firstChild(path.node); c !== 0; c = nextSibling(c)) {
						inner += writer.get(c);
					}
				}
				// Round-trip the parser's leading-newline strip (`<pre>` / `<textarea>`
				// / `<listing>`) so a value that starts with one survives re-parsing.
				if (
					namespaceOf(path.node) === NS_HTML &&
					LEADING_NEWLINE_ELEMENTS.has(tagNameOf(path.node)) &&
					(fostered
						? inner.charCodeAt(0) === 10
						: childrenStartWithNewline(writer, path.node))
				) {
					inner = `\n${inner}`;
				}
			}
			const name = tagNameOf(path.node);
			// Without its start tag the next pass reads the element as implied, so
			// its end tag follows the implied rules. Whitespace that still prints
			// first would leave with the tag.
			if (
				minify &&
				canOmitStartTag(path, name, path.node, open) &&
				!(opensImpliedShell(name) && startsWithAsciiWhitespace(inner))
			) {
				return inner + impliedCloseTag(path, name, path.node);
			}
			if (open === "") {
				// A parser-implied structural element stays transparent - the parser
				// re-implies it - but only when attribute-less (repeated `<html>` /
				// `<body>` tags merge attributes onto the implied element).
				if (
					attributeCountOf(path.node) === 0 &&
					TRANSPARENT_IMPLIED_ELEMENTS.has(name)
				) {
					// Leading whitespace only survives re-parsing once `<body>` has
					// started: before that the insertion modes drop it. Materializing
					// the tag is the cheapest way to keep the text node intact.
					const shellStarts =
						opensImpliedShell(name) &&
						(startsWithAsciiWhitespace(inner) ||
							contentOpensOutside(path, path.node));
					// §4.13 lets the start tag go only when the group before it kept
					// its end tag, or that one would take these columns over.
					const groupStarts = impliedTableGroupStartNeeded(
						path,
						name,
						path.node
					);
					// A start tag printed is one the next pass reads as written.
					if (shellStarts || groupStarts) {
						return `<${name}>${inner}${
							endTagReadsAsText(path.node) ||
							(minify && canOmitEndTag(path, name, path.node))
								? ""
								: `</${name}>`
						}`;
					}
					// The parser re-implies the start tag, but not the end tag the
					// source carried: without it whatever follows moves inside.
					return inner + impliedCloseTag(path, name, path.node);
				}
				// Anything else tag-less (adoption-agency clone, reconstructed
				// formatting element) must materialize or its formatting is lost.
				return (
					synthesizeOpenTag(path) +
					inner +
					(endTagReadsAsText(path.node) ||
					(minify && canOmitEndTag(path, name, path.node))
						? ""
						: `</${name}>`)
				);
			}
			const composed =
				(name === "form" && formNeedsPointerReset(path) ? "</form>" : "") +
				tag +
				inner +
				// Its content came out of the source unchanged, so an end tag the
				// source never wrote would leave the parser somewhere else.
				((S._flags[path.node] & FLAG_FOSTER_REGION) !== 0 &&
				!endTagOutsideSpan(path)
					? ""
					: elementCloseTag(path, name, open, inner === "", minify));
			return svgRoot
				? renderEmbedded(composed, SVG_TYPE, FOREIGN_ELEMENT)
				: composed;
		}
		case NodeType.Text: {
			const node = path.node;
			const data = dataOf(node);
			// Literal-text elements (`script` / `style` / ...) keep their body raw;
			// every other text node is escaped (the WHATWG text split).
			const parent = parentOf(node);
			if (parent !== 0 && LITERAL_TEXT_PARENTS.has(tagNameOf(parent))) {
				const foreign = namespaceOf(parent) !== NS_HTML;
				const outer = S._escapeEmbedded;
				S._escapeEmbedded = foreign;
				const body = literalTextBody(path, parent, data, minify);
				S._escapeEmbedded = outer;
				// WHY: those same names in a foreign subtree hold character data
				// rather than raw text, so the body is still the CSS or JavaScript
				// to minify but is written back escaped - printed raw there, a `<`
				// in it opens a tag the source never wrote, and `</style>` ends the
				// element early.
				// A deferred body is a placeholder here, which escaping leaves
				// alone - its own answer is escaped as it lands.
				return foreign ? escapeTextContent(body, minify) : body;
			}
			// Whitespace directly under `<head>` or `<html>` is outside any block
			// formatting context, so nothing ever renders it - the same inert-node
			// reasoning that drops comments. `<body>`'s whitespace does render.
			if (
				minify &&
				parent !== 0 &&
				whitespaceInertUnder(parent) &&
				isAllAsciiWhitespace(data) &&
				!headLeftBefore(path, node, parent, tagNameOf(parent))
			) {
				return "";
			}
			// A `<` puts the node on the source-passthrough path below, which is what
			// keeps `<%= x %>` off the escaper - worth more than the whitespace.
			if (minify && S._collapseWhitespace !== "none" && !data.includes("<")) {
				// Only elements rendering whitespace verbatim without any CSS are
				// excluded - by ancestor, since `white-space` inherits.
				let preformatted = false;
				for (
					let ancestor = parent;
					ancestor !== 0;
					ancestor = parentOf(ancestor)
				) {
					if (
						namespaceOf(ancestor) === NS_HTML &&
						LEADING_NEWLINE_ELEMENTS.has(tagNameOf(ancestor))
					) {
						preformatted = true;
						break;
					}
				}
				if (!preformatted) {
					let collapsed = collapseWhitespaceRuns(data);
					// Past `"conservative"`, whitespace against a boundary no line box
					// reaches is dropped rather than kept as one space.
					if (S._collapseWhitespace !== "conservative") {
						const all = S._collapseWhitespace === "all";
						if (all || startsOutsideLineBox(path, node, parent)) {
							collapsed = collapsed.replace(/^ /, "");
						}
						if (all || endsOutsideLineBox(path, node, parent)) {
							collapsed = collapsed.replace(/ $/, "");
						}
					}
					if (collapsed !== data) return escapeTextContent(collapsed, minify);
				}
			}
			const raw = path.source();
			// WHY: off-spec workaround. §13.3 escapes `<` and `>` in text, which
			// would rewrite `<%= x %>` to `&lt;%= x %&gt;` in HTML webpack only passes
			// through, so text that decoded to itself is emitted as its source bytes.
			// Equal to the data is the test, a NUL read as U+FFFD aside: equal lengths
			// are not, as text fostered out of a table merges into the node before it
			// without its range, and a lone CR is preprocessed to LF. The tail is
			// checked separately as the one place concatenation can change
			// tokenization - a `<`, or a `&` still open on a reference, fuses with the
			// next sibling once a comment between them is dropped.
			if (
				(raw === data ||
					(raw.length === data.length &&
						raw.replace(NUL_REGEXP, "\uFFFD") === data)) &&
				!tailFusesWithNextTag(raw) &&
				!hasOpenReference(raw)
			) {
				return raw;
			}
			// A `<%` the source kept a reference stays one, for a template engine
			// would run it; one the source wrote stays as written, so a text holding
			// both is printed from its source when that can stand on its own.
			const literalOpeners = templateOpenerCount(raw);
			const templates = templateOpenerCount(data) > literalOpeners;
			// Only where the source is all of it: fostered text joins a node without
			// its range, and a lone CR or a NUL reads as something else.
			if (
				templates &&
				literalOpeners !== 0 &&
				decodeEntities(raw, false) === data
			) {
				return withSafeTail(raw);
			}
			return escapeTextContent(data, minify, templates);
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
				: `<!doctype ${asciiLowercase(head[1])}${source.slice(head[0].length)}`;
		}
		case NodeType.Comment:
			return minify &&
				!keepComment(dataOf(path.node), path.source(), path.start())
				? ""
				: closedCommentSource(path);
		case NodeType.ProcessingInstruction:
			// A leaf whose source is already tight, and unlike a comment it carries
			// instructions for a consumer, so minification never drops it.
			return closedCommentSource(path);
		default: {
			// Document / DocumentFragment: concatenate children in order.
			if (S._fosteredRuns !== null && fosterTouches(path.node)) {
				return composeAroundFoster(path, writer);
			}
			let out = "";
			for (let c = firstChild(path.node); c !== 0; c = nextSibling(c)) {
				out += writer.get(c);
			}
			return out;
		}
	}
};

module.exports.printer = printer;
