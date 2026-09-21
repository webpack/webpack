/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Raj Aryan (based on SWC parser by Alexander Akait)
*/

"use strict";

const GenericSourceProcessor = require("../util/SourceProcessor");

const {
	askEmbeddedRenderer,
	collectEmbeddedDiagnostics,
	embeddedText
} = require("../util/dataURL");

const {
	builtinEmbeddedRenderer,
	stripJsonWhitespace
} = require("./builtinEmbeddedRenderer");

const { SVG_TAG_ADJUST } = require("./data");

const htmlMinify = require("./htmlMinify");
const {
	A,
	BLOCK_CONTENTS,
	EMBEDDED_LANGUAGES,
	EVENT_HANDLER,
	JSON_TYPE,
	NS_HTML,
	NS_MATHML,
	NS_SVG,
	NodeType,
	QUOTE_DOUBLE,
	QUOTE_NONE,
	QUOTE_SINGLE,
	baseTag,
	buildHeadTags,
	decodeEntities,
	escapeAttribute,
	escapeText,
	grammar,
	isSpace,
	metaTag,
	parseCssUrls,
	parseHtml,
	parseMsapplicationTask,
	parseSrc,
	parseSrcset,
	pickTransforms,
	tokenize
} = require("./syntax-parser");
const { CLASSIC_SCRIPT, MODULE_SCRIPT, printer } = require("./syntax-printer");
/** @typedef {import("./syntax-parser").EmbeddedSourceRenderer} EmbeddedSourceRenderer */
/** @typedef {import("./syntax-parser").DeferredEmbeddedSource} DeferredEmbeddedSource */
/** @typedef {import("./syntax-parser").HtmlTokenCallbacks} HtmlTokenCallbacks */
/** @typedef {import("./syntax-parser").HtmlAttribute} HtmlAttribute */
/** @typedef {import("./syntax-parser").HtmlNodeRef} HtmlNodeRef */
/** @typedef {import("./syntax-parser").HtmlAttributeRef} HtmlAttributeRef */
/** @typedef {import("./syntax-parser").HtmlAstSkip} HtmlAstSkip */
/** @typedef {import("./syntax-parser").ParsedSource} ParsedSource */
/** @typedef {import("./syntax-parser").HtmlPath} HtmlPath */
/** @typedef {import("./syntax-printer").VisitorMap} VisitorMap */
/** @typedef {import("./syntax-printer").HtmlTransformOptions} HtmlTransformOptions */
/** @typedef {import("./syntax-printer").HtmlProcessOptions} HtmlProcessOptions */
/** @typedef {import("./syntax-printer").HtmlPrintOptions} HtmlPrintOptions */

/**
 * The generic visitor coordinator (`util/SourceProcessor`) bound to the HTML
 * `grammar`. Babel-style usage:
 *
 * ```
 * new SourceProcessor().use({ [NodeType.Element]: (path) => {}, [NodeType.Comment]: { enter, exit } }).process(source, { skip });
 * ```
 * @experimental exposed as `webpack.html.syntax.SourceProcessor`; unstable API
 * @extends {GenericSourceProcessor<HtmlPath, HtmlNodeRef, HtmlProcessOptions>}
 */
class SourceProcessor extends GenericSourceProcessor {
	constructor() {
		super(grammar, printer);
	}
}

module.exports.A = A;

// The `as` a `style=""` is offered under: a block's contents rather than a
// whole stylesheet, which is what gives it a rule block's merges.
module.exports.BLOCK_CONTENTS = BLOCK_CONTENTS;

// The `as` a classic `<script>` is offered under — the production every
// JavaScript engine reads by default.
module.exports.CLASSIC_SCRIPT = CLASSIC_SCRIPT;

module.exports.EMBEDDED_LANGUAGES = EMBEDDED_LANGUAGES;

// The `as` an event handler attribute is offered under, read by a renderer
// whose engine takes only whole scripts.
module.exports.EVENT_HANDLER = EVENT_HANDLER;

// Neither a JSON `<script>` body nor an `<svg>` subtree is a module source
// type, so both name themselves here.
module.exports.JSON_TYPE = JSON_TYPE;

// The `as` a `<script type=module>` is offered under: the goal symbol decides
// what parses, so a renderer cannot read it off the body.
module.exports.MODULE_SCRIPT = MODULE_SCRIPT;

module.exports.NS_HTML = NS_HTML;

module.exports.NS_MATHML = NS_MATHML;

module.exports.NS_SVG = NS_SVG;

module.exports.NodeType = NodeType;

module.exports.QUOTE_DOUBLE = QUOTE_DOUBLE;

module.exports.QUOTE_NONE = QUOTE_NONE;

module.exports.QUOTE_SINGLE = QUOTE_SINGLE;

// Exposed so HtmlParser can map user-configured (lowercased) tag names to
// the adjusted camelCase names the AST carries for foreign content.
module.exports.SVG_TAG_ADJUST = SVG_TAG_ADJUST;

module.exports.SourceProcessor = SourceProcessor;

module.exports.askEmbeddedRenderer = askEmbeddedRenderer;

module.exports.baseTag = baseTag;

module.exports.buildHeadTags = buildHeadTags;

module.exports.builtinEmbeddedRenderer = builtinEmbeddedRenderer;

module.exports.collectEmbeddedDiagnostics = collectEmbeddedDiagnostics;

module.exports.decodeEntities = decodeEntities;

module.exports.embeddedText = embeddedText;

module.exports.escapeAttribute = escapeAttribute;

module.exports.escapeText = escapeText;

module.exports.htmlMinify = htmlMinify;

module.exports.isAsciiWhitespace = isSpace;

module.exports.metaTag = metaTag;

// WHATWG "ASCII whitespace" (tab / LF / FF / CR / space) — the tokenizer's
// whitespace class, exported under the spec's name.
module.exports.parseCssUrls = parseCssUrls;

module.exports.parseHtml = parseHtml;

module.exports.parseMsapplicationTask = parseMsapplicationTask;

module.exports.parseSrc = parseSrc;

module.exports.parseSrcset = parseSrcset;

module.exports.pickTransforms = pickTransforms;

module.exports.printer = printer;

module.exports.stripJsonWhitespace = stripJsonWhitespace;

module.exports.tokenize = tokenize;
