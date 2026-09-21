/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const GenericSourceProcessor = require("../util/SourceProcessor");

/** @typedef {typeof import("./syntax-parser")} SyntaxParser */
/** @typedef {typeof import("./syntax-printer")} SyntaxPrinter */
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

/** @type {SyntaxParser | undefined} */
let _parser;
/** @type {SyntaxPrinter | undefined} */
let _printer;

// CSS's two halves, as `javascript` names theirs. Both are reached through
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
	/** @returns {typeof import("../util/dataURL").EMBEDDED_LANGUAGES} what `../util/dataURL` exports as `EMBEDDED_LANGUAGES` */
	get EMBEDDED_LANGUAGES() {
		return require("../util/dataURL").EMBEDDED_LANGUAGES;
	},
	/** @returns {typeof import("./syntax-parser").NodeType} the `NodeType` the parser exports */
	get NodeType() {
		return parser().NodeType;
	},
	/** @returns {typeof import("./syntax-parser").TT_AT_KEYWORD} the `TT_AT_KEYWORD` the parser exports */
	get TT_AT_KEYWORD() {
		return parser().TT_AT_KEYWORD;
	},
	/** @returns {typeof import("./syntax-parser").TT_BAD_STRING_TOKEN} the `TT_BAD_STRING_TOKEN` the parser exports */
	get TT_BAD_STRING_TOKEN() {
		return parser().TT_BAD_STRING_TOKEN;
	},
	/** @returns {typeof import("./syntax-parser").TT_BAD_URL_TOKEN} the `TT_BAD_URL_TOKEN` the parser exports */
	get TT_BAD_URL_TOKEN() {
		return parser().TT_BAD_URL_TOKEN;
	},
	/** @returns {typeof import("./syntax-parser").TT_CDC} the `TT_CDC` the parser exports */
	get TT_CDC() {
		return parser().TT_CDC;
	},
	/** @returns {typeof import("./syntax-parser").TT_CDO} the `TT_CDO` the parser exports */
	get TT_CDO() {
		return parser().TT_CDO;
	},
	/** @returns {typeof import("./syntax-parser").TT_COLON} the `TT_COLON` the parser exports */
	get TT_COLON() {
		return parser().TT_COLON;
	},
	/** @returns {typeof import("./syntax-parser").TT_COMMA} the `TT_COMMA` the parser exports */
	get TT_COMMA() {
		return parser().TT_COMMA;
	},
	/** @returns {typeof import("./syntax-parser").TT_COMMENT} the `TT_COMMENT` the parser exports */
	get TT_COMMENT() {
		return parser().TT_COMMENT;
	},
	/** @returns {typeof import("./syntax-parser").TT_DELIM} the `TT_DELIM` the parser exports */
	get TT_DELIM() {
		return parser().TT_DELIM;
	},
	/** @returns {typeof import("./syntax-parser").TT_DIMENSION} the `TT_DIMENSION` the parser exports */
	get TT_DIMENSION() {
		return parser().TT_DIMENSION;
	},
	/** @returns {typeof import("./syntax-parser").TT_EOF} the `TT_EOF` the parser exports */
	get TT_EOF() {
		return parser().TT_EOF;
	},
	/** @returns {typeof import("./syntax-parser").TT_FUNCTION} the `TT_FUNCTION` the parser exports */
	get TT_FUNCTION() {
		return parser().TT_FUNCTION;
	},
	/** @returns {typeof import("./syntax-parser").TT_HASH} the `TT_HASH` the parser exports */
	get TT_HASH() {
		return parser().TT_HASH;
	},
	/** @returns {typeof import("./syntax-parser").TT_IDENTIFIER} the `TT_IDENTIFIER` the parser exports */
	get TT_IDENTIFIER() {
		return parser().TT_IDENTIFIER;
	},
	/** @returns {typeof import("./syntax-parser").TT_LEFT_CURLY_BRACKET} the `TT_LEFT_CURLY_BRACKET` the parser exports */
	get TT_LEFT_CURLY_BRACKET() {
		return parser().TT_LEFT_CURLY_BRACKET;
	},
	/** @returns {typeof import("./syntax-parser").TT_LEFT_PARENTHESIS} the `TT_LEFT_PARENTHESIS` the parser exports */
	get TT_LEFT_PARENTHESIS() {
		return parser().TT_LEFT_PARENTHESIS;
	},
	/** @returns {typeof import("./syntax-parser").TT_LEFT_SQUARE_BRACKET} the `TT_LEFT_SQUARE_BRACKET` the parser exports */
	get TT_LEFT_SQUARE_BRACKET() {
		return parser().TT_LEFT_SQUARE_BRACKET;
	},
	/** @returns {typeof import("./syntax-parser").TT_NUMBER} the `TT_NUMBER` the parser exports */
	get TT_NUMBER() {
		return parser().TT_NUMBER;
	},
	/** @returns {typeof import("./syntax-parser").TT_PERCENTAGE} the `TT_PERCENTAGE` the parser exports */
	get TT_PERCENTAGE() {
		return parser().TT_PERCENTAGE;
	},
	/** @returns {typeof import("./syntax-parser").TT_RIGHT_CURLY_BRACKET} the `TT_RIGHT_CURLY_BRACKET` the parser exports */
	get TT_RIGHT_CURLY_BRACKET() {
		return parser().TT_RIGHT_CURLY_BRACKET;
	},
	/** @returns {typeof import("./syntax-parser").TT_RIGHT_PARENTHESIS} the `TT_RIGHT_PARENTHESIS` the parser exports */
	get TT_RIGHT_PARENTHESIS() {
		return parser().TT_RIGHT_PARENTHESIS;
	},
	/** @returns {typeof import("./syntax-parser").TT_RIGHT_SQUARE_BRACKET} the `TT_RIGHT_SQUARE_BRACKET` the parser exports */
	get TT_RIGHT_SQUARE_BRACKET() {
		return parser().TT_RIGHT_SQUARE_BRACKET;
	},
	/** @returns {typeof import("./syntax-parser").TT_SEMICOLON} the `TT_SEMICOLON` the parser exports */
	get TT_SEMICOLON() {
		return parser().TT_SEMICOLON;
	},
	/** @returns {typeof import("./syntax-parser").TT_STRING} the `TT_STRING` the parser exports */
	get TT_STRING() {
		return parser().TT_STRING;
	},
	/** @returns {typeof import("./syntax-parser").TT_URL} the `TT_URL` the parser exports */
	get TT_URL() {
		return parser().TT_URL;
	},
	/** @returns {typeof import("./syntax-parser").TT_WHITESPACE} the `TT_WHITESPACE` the parser exports */
	get TT_WHITESPACE() {
		return parser().TT_WHITESPACE;
	},
	/** @returns {typeof import("./syntax-parser").TokenStream} the `TokenStream` the parser exports */
	get TokenStream() {
		return parser().TokenStream;
	},
	/** @returns {typeof import("../util/dataURL").askEmbeddedRenderer} what `../util/dataURL` exports as `askEmbeddedRenderer` */
	get askEmbeddedRenderer() {
		return require("../util/dataURL").askEmbeddedRenderer;
	},
	/** @returns {typeof import("./syntax-parser").buildSkipSet} the `buildSkipSet` the parser exports */
	get buildSkipSet() {
		return parser().buildSkipSet;
	},
	/** @returns {typeof import("../util/dataURL").collectEmbeddedDiagnostics} what `../util/dataURL` exports as `collectEmbeddedDiagnostics` */
	get collectEmbeddedDiagnostics() {
		return require("../util/dataURL").collectEmbeddedDiagnostics;
	},
	/** @returns {typeof import("./cssMinify")} what `./cssMinify` exports as `its module` */
	get cssMinify() {
		return require("./cssMinify");
	},
	/** @returns {typeof import("../util/dataURL").embeddedText} what `../util/dataURL` exports as `embeddedText` */
	get embeddedText() {
		return require("../util/dataURL").embeddedText;
	},
	/** @returns {typeof import("./syntax-parser").equalsLowerCase} the `equalsLowerCase` the parser exports */
	get equalsLowerCase() {
		return parser().equalsLowerCase;
	},
	/** @returns {typeof import("./syntax-parser").escapeIdentifier} the `escapeIdentifier` the parser exports */
	get escapeIdentifier() {
		return parser().escapeIdentifier;
	},
	/** @returns {typeof import("./syntax-parser").isDashedIdentifier} the `isDashedIdentifier` the parser exports */
	get isDashedIdentifier() {
		return parser().isDashedIdentifier;
	},
	// CSS Syntax §4.2 "whitespace" (space / tab / newline / CR / FF) — the
	// tokenizer's whitespace class, exported under the spec's name.
	/** @returns {typeof import("./syntax-parser")._isWhiteSpace} the `_isWhiteSpace` the parser exports */
	get isWhitespace() {
		return parser()._isWhiteSpace;
	},
	/** @returns {typeof import("./syntax-parser").normalizeUrl} the `normalizeUrl` the parser exports */
	get normalizeUrl() {
		return parser().normalizeUrl;
	},
	/** @returns {typeof import("./syntax-parser").parseABlocksContents} the `parseABlocksContents` the parser exports */
	get parseABlocksContents() {
		return parser().parseABlocksContents;
	},
	/** @returns {typeof import("./syntax-parser").parseACommaSeparatedListOfComponentValues} the `parseACommaSeparatedListOfComponentValues` the parser exports */
	get parseACommaSeparatedListOfComponentValues() {
		return parser().parseACommaSeparatedListOfComponentValues;
	},
	/** @returns {typeof import("./syntax-parser").parseAComponentValue} the `parseAComponentValue` the parser exports */
	get parseAComponentValue() {
		return parser().parseAComponentValue;
	},
	/** @returns {typeof import("./syntax-parser").parseADeclaration} the `parseADeclaration` the parser exports */
	get parseADeclaration() {
		return parser().parseADeclaration;
	},
	/** @returns {typeof import("./syntax-parser").parseAListOfComponentValues} the `parseAListOfComponentValues` the parser exports */
	get parseAListOfComponentValues() {
		return parser().parseAListOfComponentValues;
	},
	/** @returns {typeof import("./syntax-parser").parseARule} the `parseARule` the parser exports */
	get parseARule() {
		return parser().parseARule;
	},
	/** @returns {typeof import("./syntax-parser").parseAStylesheet} the `parseAStylesheet` the parser exports */
	get parseAStylesheet() {
		return parser().parseAStylesheet;
	},
	/** @returns {typeof import("./syntax-parser").parseAStylesheetsContents} the `parseAStylesheetsContents` the parser exports */
	get parseAStylesheetsContents() {
		return parser().parseAStylesheetsContents;
	},
	/** @returns {typeof import("./syntax-parser").pickTransforms} the `pickTransforms` the parser exports */
	get pickTransforms() {
		return parser().pickTransforms;
	},
	/** @returns {typeof import("./syntax-parser").rangeEquals} the `rangeEquals` the parser exports */
	get rangeEquals() {
		return parser().rangeEquals;
	},
	/** @returns {typeof import("./syntax-parser").rangeEqualsLowerCase} the `rangeEqualsLowerCase` the parser exports */
	get rangeEqualsLowerCase() {
		return parser().rangeEqualsLowerCase;
	},
	/** @returns {typeof import("./syntax-parser").readToken} the `readToken` the parser exports */
	get readToken() {
		return parser().readToken;
	},
	/** @returns {typeof import("./syntax-parser").skipEscape} the `skipEscape` the parser exports */
	get skipEscape() {
		return parser().skipEscape;
	},
	/** @returns {typeof import("./syntax-parser").toLowerCaseIfNeeded} the `toLowerCaseIfNeeded` the parser exports */
	get toLowerCaseIfNeeded() {
		return parser().toLowerCaseIfNeeded;
	},
	/** @returns {typeof import("./syntax-parser").unescapeIdentifier} the `unescapeIdentifier` the parser exports */
	get unescapeIdentifier() {
		return parser().unescapeIdentifier;
	}
};
