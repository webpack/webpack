/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Raj Aryan (based on SWC parser by Alexander Akait)
*/

"use strict";

const GenericSourceProcessor = require("../util/SourceProcessor");

/** @typedef {typeof import("./syntax-parser")} SyntaxParser */
/** @typedef {typeof import("./syntax-printer")} SyntaxPrinter */
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

/** @type {SyntaxParser | undefined} */
let _parser;
/** @type {SyntaxPrinter | undefined} */
let _printer;

// HTML's two halves, as `javascript` names theirs. Both are reached through
// a getter and remembered after the first read, so parsing never loads the
// printer and printing never loads the parser.
/**
 * @returns {SyntaxParser} the parser half
 */
const parser = () => _parser || (_parser = require("./syntax-parser"));
/**
 * @returns {SyntaxPrinter} the printer half
 */
const printer = () => _printer || (_printer = require("./syntax-printer"));

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
		// The printer is not named here but asked for on the first print, so a
		// walk that only fires visitors never loads it.
		super(parser().grammar, undefined, () => printer().printer);
	}
}

module.exports = {
	/** @returns {SyntaxParser} the parser: what reads a source into nodes */
	get parser() {
		return parser();
	},
	/** @returns {SyntaxPrinter} the printer: what writes nodes back out */
	get printer() {
		return printer();
	},
	SourceProcessor,
	/** @returns {typeof import("./syntax-parser").A} the `A` the parser exports */
	get A() {
		return parser().A;
	},
	// The `as` a `style=""` is offered under: a block's contents rather than a
	// whole stylesheet, which is what gives it a rule block's merges.
	/** @returns {typeof import("./syntax-parser").BLOCK_CONTENTS} the `BLOCK_CONTENTS` the parser exports */
	get BLOCK_CONTENTS() {
		return parser().BLOCK_CONTENTS;
	},
	// The `as` a classic `<script>` is offered under — the production every
	// JavaScript engine reads by default.
	/** @returns {typeof import("./syntax-printer").CLASSIC_SCRIPT} the `CLASSIC_SCRIPT` the printer exports */
	get CLASSIC_SCRIPT() {
		return printer().CLASSIC_SCRIPT;
	},
	/** @returns {typeof import("./syntax-parser").EMBEDDED_LANGUAGES} the `EMBEDDED_LANGUAGES` the parser exports */
	get EMBEDDED_LANGUAGES() {
		return parser().EMBEDDED_LANGUAGES;
	},
	// The `as` an event handler attribute is offered under, read by a renderer
	// whose engine takes only whole scripts.
	/** @returns {typeof import("./syntax-parser").EVENT_HANDLER} the `EVENT_HANDLER` the parser exports */
	get EVENT_HANDLER() {
		return parser().EVENT_HANDLER;
	},
	// Neither a JSON `<script>` body nor an `<svg>` subtree is a module source
	// type, so both name themselves here.
	/** @returns {typeof import("./syntax-parser").JSON_TYPE} the `JSON_TYPE` the parser exports */
	get JSON_TYPE() {
		return parser().JSON_TYPE;
	},
	// The `as` a `<script type=module>` is offered under: the goal symbol decides
	// what parses, so a renderer cannot read it off the body.
	/** @returns {typeof import("./syntax-printer").MODULE_SCRIPT} the `MODULE_SCRIPT` the printer exports */
	get MODULE_SCRIPT() {
		return printer().MODULE_SCRIPT;
	},
	/** @returns {typeof import("./syntax-parser").NS_HTML} the `NS_HTML` the parser exports */
	get NS_HTML() {
		return parser().NS_HTML;
	},
	/** @returns {typeof import("./syntax-parser").NS_MATHML} the `NS_MATHML` the parser exports */
	get NS_MATHML() {
		return parser().NS_MATHML;
	},
	/** @returns {typeof import("./syntax-parser").NS_SVG} the `NS_SVG` the parser exports */
	get NS_SVG() {
		return parser().NS_SVG;
	},
	/** @returns {typeof import("./syntax-parser").NodeType} the `NodeType` the parser exports */
	get NodeType() {
		return parser().NodeType;
	},
	/** @returns {typeof import("./syntax-parser").QUOTE_DOUBLE} the `QUOTE_DOUBLE` the parser exports */
	get QUOTE_DOUBLE() {
		return parser().QUOTE_DOUBLE;
	},
	/** @returns {typeof import("./syntax-parser").QUOTE_NONE} the `QUOTE_NONE` the parser exports */
	get QUOTE_NONE() {
		return parser().QUOTE_NONE;
	},
	/** @returns {typeof import("./syntax-parser").QUOTE_SINGLE} the `QUOTE_SINGLE` the parser exports */
	get QUOTE_SINGLE() {
		return parser().QUOTE_SINGLE;
	},
	// Exposed so HtmlParser can map user-configured (lowercased) tag names to
	// the adjusted camelCase names the AST carries for foreign content.
	/** @returns {typeof import("./data").SVG_TAG_ADJUST} what `./data` exports as `SVG_TAG_ADJUST` */
	get SVG_TAG_ADJUST() {
		return require("./data").SVG_TAG_ADJUST;
	},
	/** @returns {typeof import("../util/dataURL").askEmbeddedRenderer} what `../util/dataURL` exports as `askEmbeddedRenderer` */
	get askEmbeddedRenderer() {
		return require("../util/dataURL").askEmbeddedRenderer;
	},
	/** @returns {typeof import("./syntax-parser").baseTag} the `baseTag` the parser exports */
	get baseTag() {
		return parser().baseTag;
	},
	/** @returns {typeof import("./syntax-parser").buildHeadTags} the `buildHeadTags` the parser exports */
	get buildHeadTags() {
		return parser().buildHeadTags;
	},
	/** @returns {typeof import("./builtinEmbeddedRenderer").builtinEmbeddedRenderer} what `./builtinEmbeddedRenderer` exports as `builtinEmbeddedRenderer` */
	get builtinEmbeddedRenderer() {
		return require("./builtinEmbeddedRenderer").builtinEmbeddedRenderer;
	},
	/** @returns {typeof import("../util/dataURL").collectEmbeddedDiagnostics} what `../util/dataURL` exports as `collectEmbeddedDiagnostics` */
	get collectEmbeddedDiagnostics() {
		return require("../util/dataURL").collectEmbeddedDiagnostics;
	},
	/** @returns {typeof import("./syntax-parser").decodeEntities} the `decodeEntities` the parser exports */
	get decodeEntities() {
		return parser().decodeEntities;
	},
	/** @returns {typeof import("../util/dataURL").embeddedText} what `../util/dataURL` exports as `embeddedText` */
	get embeddedText() {
		return require("../util/dataURL").embeddedText;
	},
	/** @returns {typeof import("./syntax-parser").escapeAttribute} the `escapeAttribute` the parser exports */
	get escapeAttribute() {
		return parser().escapeAttribute;
	},
	/** @returns {typeof import("./syntax-parser").escapeText} the `escapeText` the parser exports */
	get escapeText() {
		return parser().escapeText;
	},
	/** @returns {typeof import("./htmlMinify")} what `./htmlMinify` exports as `its module` */
	get htmlMinify() {
		return require("./htmlMinify");
	},
	/** @returns {typeof import("./syntax-parser").isSpace} the `isSpace` the parser exports */
	get isAsciiWhitespace() {
		return parser().isSpace;
	},
	/** @returns {typeof import("./syntax-parser").metaTag} the `metaTag` the parser exports */
	get metaTag() {
		return parser().metaTag;
	},
	// WHATWG "ASCII whitespace" (tab / LF / FF / CR / space) — the tokenizer's
	// whitespace class, exported under the spec's name.
	/** @returns {typeof import("./syntax-parser").parseCssUrls} the `parseCssUrls` the parser exports */
	get parseCssUrls() {
		return parser().parseCssUrls;
	},
	/** @returns {typeof import("./syntax-parser").parseHtml} the `parseHtml` the parser exports */
	get parseHtml() {
		return parser().parseHtml;
	},
	/** @returns {typeof import("./syntax-parser").parseMsapplicationTask} the `parseMsapplicationTask` the parser exports */
	get parseMsapplicationTask() {
		return parser().parseMsapplicationTask;
	},
	/** @returns {typeof import("./syntax-parser").parseSrc} the `parseSrc` the parser exports */
	get parseSrc() {
		return parser().parseSrc;
	},
	/** @returns {typeof import("./syntax-parser").parseSrcset} the `parseSrcset` the parser exports */
	get parseSrcset() {
		return parser().parseSrcset;
	},
	/** @returns {typeof import("./syntax-parser").pickTransforms} the `pickTransforms` the parser exports */
	get pickTransforms() {
		return parser().pickTransforms;
	},
	/** @returns {typeof import("./builtinEmbeddedRenderer").stripJsonWhitespace} what `./builtinEmbeddedRenderer` exports as `stripJsonWhitespace` */
	get stripJsonWhitespace() {
		return require("./builtinEmbeddedRenderer").stripJsonWhitespace;
	},
	/** @returns {typeof import("./syntax-parser").tokenize} the `tokenize` the parser exports */
	get tokenize() {
		return parser().tokenize;
	}
};
