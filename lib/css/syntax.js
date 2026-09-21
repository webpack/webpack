/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const GenericSourceProcessor = require("../util/SourceProcessor");

const {
	EMBEDDED_LANGUAGES,
	askEmbeddedRenderer,
	collectEmbeddedDiagnostics,
	embeddedText
} = require("../util/dataURL");

const cssMinify = require("./cssMinify");

/**
 * Renders source this stylesheet embeds — a `data:` URL's payload today.
 * Returning it unchanged, or anything but text, declines it, and the URL is
 * emitted as written.
 * @typedef {(source: string, info: { type: string, hostType: string }) => string | undefined} EmbeddedSourceRenderer
 */

/**
 * One embedded source recorded for a caller that can only answer
 * asynchronously, and the text to print once it has.
 * @typedef {import("../util/dataURL").DeferredEmbeddedSource} DeferredEmbeddedSource
 */

const {
	A,
	NodeType,
	TT_AT_KEYWORD,
	TT_BAD_STRING_TOKEN,
	TT_BAD_URL_TOKEN,
	TT_CDC,
	TT_CDO,
	TT_COLON,
	TT_COMMA,
	TT_COMMENT,
	TT_DELIM,
	TT_DIMENSION,
	TT_EOF,
	TT_FUNCTION,
	TT_HASH,
	TT_IDENTIFIER,
	TT_LEFT_CURLY_BRACKET,
	TT_LEFT_PARENTHESIS,
	TT_LEFT_SQUARE_BRACKET,
	TT_NUMBER,
	TT_PERCENTAGE,
	TT_RIGHT_CURLY_BRACKET,
	TT_RIGHT_PARENTHESIS,
	TT_RIGHT_SQUARE_BRACKET,
	TT_SEMICOLON,
	TT_STRING,
	TT_URL,
	TT_WHITESPACE,
	TokenStream,
	_isWhiteSpace,
	buildSkipSet,
	equalsLowerCase,
	escapeIdentifier,
	grammar,
	isDashedIdentifier,
	normalizeUrl,
	parseABlocksContents,
	parseACommaSeparatedListOfComponentValues,
	parseAComponentValue,
	parseADeclaration,
	parseAListOfComponentValues,
	parseARule,
	parseAStylesheet,
	parseAStylesheetsContents,
	pickTransforms,
	rangeEquals,
	rangeEqualsLowerCase,
	readToken,
	skipEscape,
	toLowerCaseIfNeeded,
	unescapeIdentifier
} = require("./syntax-parser");
const { printer } = require("./syntax-printer");
/** @typedef {import("./syntax-parser").MutableToken} MutableToken */
/** @typedef {import("./syntax-parser").Node} Node */
/** @typedef {import("./syntax-parser").Token} Token */
/** @typedef {import("./syntax-parser").NumberToken} NumberToken */
/** @typedef {import("./syntax-parser").PercentageToken} PercentageToken */
/** @typedef {import("./syntax-parser").DimensionToken} DimensionToken */
/** @typedef {import("./syntax-parser").HashToken} HashToken */
/** @typedef {import("./syntax-parser").UrlToken} UrlToken */
/** @typedef {import("./syntax-parser").FunctionNode} FunctionNode */
/** @typedef {import("./syntax-parser").SimpleBlock} SimpleBlock */
/** @typedef {import("./syntax-parser").ComponentValue} ComponentValue */
/** @typedef {import("./syntax-parser").Rule} Rule */
/** @typedef {import("./syntax-parser").Declaration} Declaration */
/** @typedef {import("./syntax-parser").AtRule} AtRule */
/** @typedef {import("./syntax-parser").QualifiedRule} QualifiedRule */
/** @typedef {import("./syntax-parser").VisitorMap} VisitorMap */
/** @typedef {import("./syntax-parser").CssTransformOptions} CssTransformOptions */
/** @typedef {import("./syntax-parser").CssProcessOptions} CssProcessOptions */
/** @typedef {import("./syntax-parser").CssEnvironment} CssEnvironment */
/** @typedef {import("./syntax-parser").CssPrintOptions} CssPrintOptions */
/** @typedef {import("./syntax-parser").CssPath} CssPath */

/**
 * The generic visitor coordinator (`util/SourceProcessor`) bound to the CSS
 * `grammar`. All configuration is per `process` call. `process(src, { minimize:
 * true })` returns `{ code, map }` — the safely-minified serialization (built by
 * the same walk that fires visitors) and its source map; without `minimize` it
 * just walks and returns `undefined`. Babel-style usage:
 *
 * ```
 * new SourceProcessor().use({ [NodeType.AtRule]: (path) => {} }).process(source, { skip });
 * ```
 * @experimental exposed as `webpack.css.syntax.SourceProcessor`; unstable API
 * @extends {GenericSourceProcessor<CssPath, Node, CssProcessOptions>}
 */
class SourceProcessor extends GenericSourceProcessor {
	constructor() {
		super(grammar, printer);
	}
}

module.exports.A = A;

module.exports.EMBEDDED_LANGUAGES = EMBEDDED_LANGUAGES;

module.exports.NodeType = NodeType;

// Every language `renderEmbeddedSource` can be offered from a stylesheet: a
// `data:` payload names one, so this is what its media type can name.
module.exports.SourceProcessor = SourceProcessor;

module.exports.TT_AT_KEYWORD = TT_AT_KEYWORD;

module.exports.TT_BAD_STRING_TOKEN = TT_BAD_STRING_TOKEN;

module.exports.TT_BAD_URL_TOKEN = TT_BAD_URL_TOKEN;

module.exports.TT_CDC = TT_CDC;

module.exports.TT_CDO = TT_CDO;

module.exports.TT_COLON = TT_COLON;

module.exports.TT_COMMA = TT_COMMA;

module.exports.TT_COMMENT = TT_COMMENT;

module.exports.TT_DELIM = TT_DELIM;

module.exports.TT_DIMENSION = TT_DIMENSION;

module.exports.TT_EOF = TT_EOF;

module.exports.TT_FUNCTION = TT_FUNCTION;

module.exports.TT_HASH = TT_HASH;

module.exports.TT_IDENTIFIER = TT_IDENTIFIER;

module.exports.TT_LEFT_CURLY_BRACKET = TT_LEFT_CURLY_BRACKET;

module.exports.TT_LEFT_PARENTHESIS = TT_LEFT_PARENTHESIS;

module.exports.TT_LEFT_SQUARE_BRACKET = TT_LEFT_SQUARE_BRACKET;

module.exports.TT_NUMBER = TT_NUMBER;

module.exports.TT_PERCENTAGE = TT_PERCENTAGE;

module.exports.TT_RIGHT_CURLY_BRACKET = TT_RIGHT_CURLY_BRACKET;

module.exports.TT_RIGHT_PARENTHESIS = TT_RIGHT_PARENTHESIS;

module.exports.TT_RIGHT_SQUARE_BRACKET = TT_RIGHT_SQUARE_BRACKET;

module.exports.TT_SEMICOLON = TT_SEMICOLON;

module.exports.TT_STRING = TT_STRING;

module.exports.TT_URL = TT_URL;

module.exports.TT_WHITESPACE = TT_WHITESPACE;

module.exports.TokenStream = TokenStream;

module.exports.askEmbeddedRenderer = askEmbeddedRenderer;

module.exports.buildSkipSet = buildSkipSet;

module.exports.collectEmbeddedDiagnostics = collectEmbeddedDiagnostics;

module.exports.cssMinify = cssMinify;

module.exports.embeddedText = embeddedText;

module.exports.equalsLowerCase = equalsLowerCase;

module.exports.escapeIdentifier = escapeIdentifier;

module.exports.isDashedIdentifier = isDashedIdentifier;

// CSS Syntax §4.2 "whitespace" (space / tab / newline / CR / FF) — the
// tokenizer's whitespace class, exported under the spec's name.
module.exports.isWhitespace = _isWhiteSpace;

module.exports.normalizeUrl = normalizeUrl;

module.exports.parseABlocksContents = parseABlocksContents;

module.exports.parseACommaSeparatedListOfComponentValues =
	parseACommaSeparatedListOfComponentValues;

module.exports.parseAComponentValue = parseAComponentValue;

module.exports.parseADeclaration = parseADeclaration;

module.exports.parseAListOfComponentValues = parseAListOfComponentValues;

module.exports.parseARule = parseARule;

module.exports.parseAStylesheet = parseAStylesheet;

module.exports.parseAStylesheetsContents = parseAStylesheetsContents;

module.exports.pickTransforms = pickTransforms;

module.exports.printer = printer;

module.exports.rangeEquals = rangeEquals;

module.exports.rangeEqualsLowerCase = rangeEqualsLowerCase;

module.exports.readToken = readToken;

module.exports.skipEscape = skipEscape;

module.exports.toLowerCaseIfNeeded = toLowerCaseIfNeeded;

module.exports.unescapeIdentifier = unescapeIdentifier;
