/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
	Tokenizer moved from syntax-parser.js
*/

"use strict";

const LocConverter = require("../util/LocConverter");
const { makeCacheable } = require("../util/identifier");

/** @import { ParseErrorSeverity } from "../html/syntax-parser" */
/** @typedef {{ _parseError: ((input: string, code: string, start: number, end: number, severity: ParseErrorSeverity) => void) | undefined, _parseErrorsSeen: Set<string>, _openCommentStart: number }} ParseTree the parse state the tokenizer reports into */

// spec: https://drafts.csswg.org/css-syntax/

/**
 * @typedef {object} CssWhitespaceToken
 * @property {number} type
 * @property {number} start byte offset of the first whitespace code point
 * @property {number} end byte offset just past the last whitespace code point
 */
/**
 * @typedef {object} CssCommentToken
 * @property {number} type
 * @property {number} start byte offset of the opening `/`
 * @property {number} end byte offset just past the closing `/`
 */
/**
 * @typedef {object} CssStringToken
 * @property {number} type
 * @property {number} start byte offset of the opening quote
 * @property {number} end byte offset just past the closing quote (or EOF for unterminated strings)
 */
/**
 * @typedef {object} CssBadStringToken
 * @property {number} type
 * @property {number} start byte offset of the opening quote
 * @property {number} end byte offset where parsing gave up (typically the newline that broke the string)
 */
/**
 * @typedef {object} CssLeftCurlyBracketToken
 * @property {number} type
 * @property {number} start byte offset of `{`
 * @property {number} end `start + 1`
 */
/**
 * @typedef {object} CssRightCurlyBracketToken
 * @property {number} type
 * @property {number} start byte offset of `}`
 * @property {number} end `start + 1`
 */
/**
 * @typedef {object} CssLeftSquareBracketToken
 * @property {number} type
 * @property {number} start byte offset of `[`
 * @property {number} end `start + 1`
 */
/**
 * @typedef {object} CssRightSquareBracketToken
 * @property {number} type
 * @property {number} start byte offset of `]`
 * @property {number} end `start + 1`
 */
/**
 * @typedef {object} CssLeftParenthesisToken
 * @property {number} type
 * @property {number} start byte offset of `(`
 * @property {number} end `start + 1`
 */
/**
 * @typedef {object} CssRightParenthesisToken
 * @property {number} type
 * @property {number} start byte offset of `)`
 * @property {number} end `start + 1`
 */
/**
 * @typedef {object} CssFunctionToken
 * @property {number} type
 * @property {number} start byte offset of the function name's first code point
 * @property {number} end byte offset just past the `(` that closes the function token
 */
/**
 * @typedef {object} CssUrlToken
 * @property {number} type
 * @property {number} start byte offset of the `url(` keyword (i.e. the `u`)
 * @property {number} end byte offset just past the closing `)` (or EOF)
 * @property {number} contentStart byte offset of the first code point of the unquoted URL content (post leading whitespace)
 * @property {number} contentEnd byte offset just past the last code point of the unquoted URL content (pre trailing whitespace / `)` / EOF)
 */
/**
 * @typedef {object} CssBadUrlToken
 * @property {number} type
 * @property {number} start byte offset of the `url(` keyword
 * @property {number} end byte offset where parsing gave up (past the recovery `)` or EOF)
 */
/**
 * @typedef {object} CssColonToken
 * @property {number} type
 * @property {number} start byte offset of `:`
 * @property {number} end `start + 1`
 */
/**
 * @typedef {object} CssAtKeywordToken
 * @property {number} type
 * @property {number} start byte offset of `@`
 * @property {number} end byte offset just past the last ident-sequence code point
 */
/**
 * @typedef {object} CssDelimToken
 * @property {number} type
 * @property {number} start byte offset of the delim code point
 * @property {number} end `start + 1`
 */
/**
 * @typedef {object} CssIdentToken
 * @property {number} type
 * @property {number} start byte offset of the first ident code point
 * @property {number} end byte offset just past the last ident-sequence code point
 */
/**
 * @typedef {object} CssPercentageToken
 * @property {number} type
 * @property {number} start byte offset of the first numeric code point
 * @property {number} end byte offset just past the `%`
 */
/**
 * @typedef {object} CssNumberToken
 * @property {number} type
 * @property {number} start byte offset of the first numeric code point
 * @property {number} end byte offset just past the last numeric code point
 */
/**
 * @typedef {object} CssDimensionToken
 * @property {number} type
 * @property {number} start byte offset of the first numeric code point
 * @property {number} end byte offset just past the last unit ident code point
 * @property {number} unitStart byte offset of the first unit-ident code point (== end of the numeric run)
 */
/**
 * @typedef {object} CssHashToken
 * @property {number} type
 * @property {number} start byte offset of `#`
 * @property {number} end byte offset just past the last ident-sequence code point
 * @property {boolean} isId true when the hash starts an ident sequence (`#foo`), false for non-ident hashes (`#1abc`)
 */
/**
 * @typedef {object} CssSemicolonToken
 * @property {number} type
 * @property {number} start byte offset of `;`
 * @property {number} end `start + 1`
 */
/**
 * @typedef {object} CssCommaToken
 * @property {number} type
 * @property {number} start byte offset of `,`
 * @property {number} end `start + 1`
 */
/**
 * @typedef {object} CssCdoToken
 * @property {number} type
 * @property {number} start byte offset of `<`
 * @property {number} end byte offset just past `<!--`
 */
/**
 * @typedef {object} CssCdcToken
 * @property {number} type
 * @property {number} start byte offset of `-`
 * @property {number} end byte offset just past `-->`
 */
/**
 * @typedef {CssWhitespaceToken | CssCommentToken | CssStringToken | CssBadStringToken | CssLeftCurlyBracketToken | CssRightCurlyBracketToken | CssLeftSquareBracketToken | CssRightSquareBracketToken | CssLeftParenthesisToken | CssRightParenthesisToken | CssFunctionToken | CssUrlToken | CssBadUrlToken | CssColonToken | CssAtKeywordToken | CssDelimToken | CssIdentToken | CssPercentageToken | CssNumberToken | CssDimensionToken | CssHashToken | CssSemicolonToken | CssCommaToken | CssCdoToken | CssCdcToken} CssToken
 */

const CC_LINE_FEED = "\n".charCodeAt(0);

const CC_CARRIAGE_RETURN = "\r".charCodeAt(0);

const CC_FORM_FEED = "\f".charCodeAt(0);

const CC_TAB = "\t".charCodeAt(0);

const CC_SPACE = " ".charCodeAt(0);

const CC_SOLIDUS = "/".charCodeAt(0);

const CC_REVERSE_SOLIDUS = "\\".charCodeAt(0);

const CC_ASTERISK = "*".charCodeAt(0);

const CC_VERTICAL_LINE = "|".charCodeAt(0);

const CC_LEFT_PARENTHESIS = "(".charCodeAt(0);

const CC_RIGHT_PARENTHESIS = ")".charCodeAt(0);

const CC_LEFT_CURLY = "{".charCodeAt(0);

const CC_RIGHT_CURLY = "}".charCodeAt(0);

const CC_LEFT_SQUARE = "[".charCodeAt(0);

const CC_RIGHT_SQUARE = "]".charCodeAt(0);

const CC_QUOTATION_MARK = '"'.charCodeAt(0);

const CC_APOSTROPHE = "'".charCodeAt(0);

const CC_FULL_STOP = ".".charCodeAt(0);

const CC_COLON = ":".charCodeAt(0);

const CC_SEMICOLON = ";".charCodeAt(0);

const CC_COMMA = ",".charCodeAt(0);

const CC_PERCENTAGE = "%".charCodeAt(0);

const CC_AT_SIGN = "@".charCodeAt(0);

const CC_LOW_LINE = "_".charCodeAt(0);

const CC_LOWER_A = "a".charCodeAt(0);

const CC_LOWER_D = "d".charCodeAt(0);

const CC_LOWER_F = "f".charCodeAt(0);

const CC_LOWER_I = "i".charCodeAt(0);

const CC_LOWER_S = "s".charCodeAt(0);

const CC_LOWER_E = "e".charCodeAt(0);

const CC_LOWER_U = "u".charCodeAt(0);

const CC_LOWER_R = "r".charCodeAt(0);

const CC_LOWER_L = "l".charCodeAt(0);

const CC_LOWER_T = "t".charCodeAt(0);

const CC_LOWER_X = "x".charCodeAt(0);

const CC_LOWER_Z = "z".charCodeAt(0);

const CC_EXCLAMATION = "!".charCodeAt(0);

const CC_UPPER_A = "A".charCodeAt(0);

const CC_UPPER_F = "F".charCodeAt(0);

const CC_UPPER_E = "E".charCodeAt(0);

const CC_UPPER_Z = "Z".charCodeAt(0);

const CC_0 = "0".charCodeAt(0);

const CC_9 = "9".charCodeAt(0);

const CC_NUMBER_SIGN = "#".charCodeAt(0);

const CC_PLUS_SIGN = "+".charCodeAt(0);

const CC_HYPHEN_MINUS = "-".charCodeAt(0);

const CC_LESS_THAN_SIGN = "<".charCodeAt(0);

const CC_GREATER_THAN_SIGN = ">".charCodeAt(0);

const CC_TILDE = "~".charCodeAt(0);

const CC_EQUALS_SIGN = "=".charCodeAt(0);

// Lexer token types (CSS Syntax Level 3 §4) plus the `<eof-token>`, numeric so
// the `type` slot stays compact and the consume algorithms dispatch on integer
// `===`. Plain constants, not `TokenType` reads, keep the lexer's hot path cheap.
const TT_COMMENT = 1;

const TT_WHITESPACE = 2;

const TT_STRING = 3;

const TT_BAD_STRING_TOKEN = 4;

const TT_HASH = 5;

const TT_DELIM = 6;

// The three opening brackets are kept contiguous (7..9) so "is this an opening
// bracket?" is a single range check (`>= TT_LEFT_PARENTHESIS && <= TT_LEFT_CURLY_BRACKET`).
const TT_LEFT_PARENTHESIS = 7;

const TT_LEFT_SQUARE_BRACKET = 8;

const TT_LEFT_CURLY_BRACKET = 9;

const TT_RIGHT_PARENTHESIS = 10;

const TT_RIGHT_SQUARE_BRACKET = 11;

const TT_RIGHT_CURLY_BRACKET = 12;

const TT_COMMA = 13;

const TT_COLON = 14;

const TT_SEMICOLON = 15;

const TT_AT_KEYWORD = 16;

const TT_FUNCTION = 17;

const TT_URL = 18;

const TT_BAD_URL_TOKEN = 19;

const TT_IDENTIFIER = 20;

const TT_NUMBER = 21;

const TT_PERCENTAGE = 22;

const TT_DIMENSION = 23;

const TT_CDO = 24;

const TT_CDC = 25;

const TT_EOF = 26;

/**
 * The lexer token types by spec name, as `readToken` and `CssTokenizer` callers
 * read them.
 * @type {{ Comment: 1, Whitespace: 2, String: 3, BadString: 4, Hash: 5, Delim: 6, LeftParenthesis: 7, LeftSquareBracket: 8, LeftCurlyBracket: 9, RightParenthesis: 10, RightSquareBracket: 11, RightCurlyBracket: 12, Comma: 13, Colon: 14, Semicolon: 15, AtKeyword: 16, Function: 17, Url: 18, BadUrl: 19, Ident: 20, Number: 21, Percentage: 22, Dimension: 23, CDO: 24, CDC: 25, EOF: 26 }}
 */
const TokenType = {
	Comment: TT_COMMENT,
	Whitespace: TT_WHITESPACE,
	String: TT_STRING,
	BadString: TT_BAD_STRING_TOKEN,
	Hash: TT_HASH,
	Delim: TT_DELIM,
	LeftParenthesis: TT_LEFT_PARENTHESIS,
	LeftSquareBracket: TT_LEFT_SQUARE_BRACKET,
	LeftCurlyBracket: TT_LEFT_CURLY_BRACKET,
	RightParenthesis: TT_RIGHT_PARENTHESIS,
	RightSquareBracket: TT_RIGHT_SQUARE_BRACKET,
	RightCurlyBracket: TT_RIGHT_CURLY_BRACKET,
	Comma: TT_COMMA,
	Colon: TT_COLON,
	Semicolon: TT_SEMICOLON,
	AtKeyword: TT_AT_KEYWORD,
	Function: TT_FUNCTION,
	Url: TT_URL,
	BadUrl: TT_BAD_URL_TOKEN,
	Ident: TT_IDENTIFIER,
	Number: TT_NUMBER,
	Percentage: TT_PERCENTAGE,
	Dimension: TT_DIMENSION,
	CDO: TT_CDO,
	CDC: TT_CDC,
	EOF: TT_EOF
};

/**
 * @param {number} cc char code
 * @returns {boolean} true, if cc is a newline (per the spec: LF, CR, or FF)
 */
const isNewline = (cc) =>
	cc === CC_LINE_FEED || cc === CC_CARRIAGE_RETURN || cc === CC_FORM_FEED;

/**
 * If the source had a CR followed by an LF, advance past the LF -
 * the spec normalises CRLF to LF during preprocessing.
 * @param {number} cc char code already consumed (the CR)
 * @param {string} input input
 * @param {number} pos position just past `cc`
 * @returns {number} position past the CRLF pair (or unchanged for bare CR)
 */
const consumeExtraNewline = (cc, input, pos) => {
	if (cc === CC_CARRIAGE_RETURN && input.charCodeAt(pos) === CC_LINE_FEED) {
		pos++;
	}
	return pos;
};

/**
 * @param {number} cc char code
 * @returns {boolean} true, if cc is space or tab
 */
const isSpace = (cc) => cc === CC_SPACE || cc === CC_TAB;

/**
 * CSS Syntax §4.2 whitespace (newline, tab, space), the same set as Infra's
 * ASCII whitespace.
 * @param {number} cc char code
 * @returns {boolean} true, if cc is whitespace (space/tab/newline)
 */
// Space-first: U+0020 is the common case, so it short-circuits before the
// rarer tab / newline tests.
const isAsciiWhitespace = (cc) => isSpace(cc) || isNewline(cc);

/**
 * A digit (CSS Syntax §4.2): U+0030 to U+0039.
 * @param {number} cc char code
 * @returns {boolean} true, if cc is a digit
 */
const isDigit = (cc) => cc >= CC_0 && cc <= CC_9;

/**
 * A hex digit (CSS Syntax §4.2): a digit, or A to F in either case.
 * @param {number} cc char code
 * @returns {boolean} true, if cc is a hex digit
 */
const isHexDigit = (cc) =>
	isDigit(cc) ||
	(cc >= CC_UPPER_A && cc <= CC_UPPER_F) ||
	(cc >= CC_LOWER_A && cc <= CC_LOWER_F);

/**
 * A letter (CSS Syntax §4.2): A to Z in either case.
 * @param {number} cc char code
 * @returns {boolean} is letter (a-z / A-Z)
 */
const isLetter = (cc) =>
	(cc >= CC_LOWER_A && cc <= CC_LOWER_Z) ||
	(cc >= CC_UPPER_A && cc <= CC_UPPER_Z);

/**
 * An ident-start code point (CSS Syntax §4.2): a letter, a non-ASCII code
 * point or `_`.
 * @param {number} cc char code
 * @returns {boolean} true, if cc is an ident-start code point
 */
const isIdentStartCodePoint = (cc) =>
	isLetter(cc) || cc >= 0x80 || cc === CC_LOW_LINE;

// The class every per-code-point loop in the tokenizer reads: one table load
// answers whichever of the three it asks (spec: ident-code = ident-start /
// digit / hyphen-minus).
const BC_OTHER = 0;

const BC_IDENT = 1;

const BC_WHITESPACE = 2;

// What a skip-mode selector prelude cannot step over in bytes, read by
// `CssTokenizer#skipPreludeLeaves`: the structure its rule loop stops at, the
// openers it still materializes, and what can hide one of those from a scan.
const BC_PRELUDE_STOP = 3;

// WHY: The three sets are disjoint - nothing is both an ident code point and
// whitespace, and no stop is either - so one value a row carries all three and
// no read has to mask. The table spans the whole `charCodeAt` range so each test
// is one load with no `cc < 128` branch, every non-ASCII code unit being an
// ident code point per spec. Callers must index with `cc | 0`: a raw NaN index
// (EOF) reads out of range and permanently degrades the load site's IC. Row 0
// is a stop, so that `NaN | 0` is also what ends the prelude scan at EOF.
const BYTE_CLASS = new Uint8Array(0x10000).fill(BC_IDENT);

for (let i = 0; i < 128; i++) {
	BYTE_CLASS[i] =
		isLetter(i) || i === CC_LOW_LINE || isDigit(i) || i === CC_HYPHEN_MINUS
			? BC_IDENT
			: isAsciiWhitespace(i)
				? BC_WHITESPACE
				: BC_OTHER;
}

for (const cc of [
	0,
	CC_LEFT_CURLY,
	CC_RIGHT_CURLY,
	CC_SEMICOLON,
	CC_LEFT_PARENTHESIS,
	CC_LEFT_SQUARE,
	CC_QUOTATION_MARK,
	CC_APOSTROPHE,
	CC_REVERSE_SOLIDUS,
	CC_SOLIDUS
]) {
	BYTE_CLASS[cc] = BC_PRELUDE_STOP;
}

/**
 * @param {number} cc char code
 * @returns {boolean} true, if cc is an ident-sequence code point
 */
const isAsciiIdentCodePoint = (cc) => BYTE_CLASS[cc | 0] === BC_IDENT;

/**
 * Infra's ASCII case-insensitive match against a lowercase literal - avoids the
 * `toLowerCase()` allocation and matches CSS's ASCII case-insensitive keyword
 * matching. `lit` must be lowercase ASCII.
 * @param {string} s string to test
 * @param {string} lit lowercase ASCII literal to match
 * @returns {boolean} true, if `s` equals `lit` ignoring ASCII case
 */
const asciiCaseInsensitiveMatch = (s, lit) => {
	if (s.length !== lit.length) return false;
	for (let i = 0; i < lit.length; i++) {
		let c = s.charCodeAt(i);
		if (c >= CC_UPPER_A && c <= CC_UPPER_Z) c |= 0x20;
		if (c !== lit.charCodeAt(i)) return false;
	}
	return true;
};

/** @type {ParseTree | undefined} */
let parseTree;

/**
 * Name the tree the tokenizer reports into: the running `parseA*` call's parse
 * errors and where a comment the source never closed opens. The parser names its one tree as it loads.
 * @param {ParseTree} tree the tree
 */
const setParseTree = (tree) => {
	parseTree = tree;
};

/**
 * Report a parse error to the running `parseA*` call's callback, once per offset and code.
 * @param {string} input input
 * @param {string} code parse-error code (kebab-case)
 * @param {number} start offset where the error starts
 * @param {number} end offset where the error ends
 * @param {ParseErrorSeverity} severity `"error"` when EOF cuts a token or rule short
 */
const reportParseError = (input, code, start, end, severity) => {
	const tree = parseTree;
	if (tree === undefined || tree._parseError === undefined) return;
	const key = `${start}:${code}`;
	if (tree._parseErrorsSeen.has(key)) return;
	tree._parseErrorsSeen.add(key);
	tree._parseError(input, code, start, end, severity);
};

/**
 * Consume an escaped code point.
 * @param {string} input input
 * @param {number} pos position just past the `\`
 * @returns {number} position past the escape sequence
 */
const consumeAnEscapedCodePoint = (input, pos) => {
	// The caller has verified the `\` and the next code point form a valid escape.
	// Hex consumes up to 6 digits and one optional whitespace, non-hex one code
	// point, and a `\` at EOF returns `pos` so callers do not overrun.
	if (pos >= input.length) {
		reportParseError(input, "eof-in-escape", pos - 1, pos, "error");
		return pos;
	}
	const cc = input.charCodeAt(pos);
	pos++;
	if (pos === input.length) return pos;
	if (isHexDigit(cc)) {
		for (let i = 0; i < 5; i++) {
			if (!isHexDigit(input.charCodeAt(pos))) break;
			pos++;
		}
		const trail = input.charCodeAt(pos);
		if (isAsciiWhitespace(trail)) {
			pos++;
			pos = consumeExtraNewline(trail, input, pos);
		}
	}
	return pos;
};

/**
 * Spec: "two code points are a valid escape" - first is `\`, second is
 * not a newline.
 * @param {string} input input
 * @param {number} pos position of the second code point
 * @param {number=} f first code point (defaults to `input.charCodeAt(pos - 1)`)
 * @param {number=} s second code point (defaults to `input.charCodeAt(pos)`)
 * @returns {boolean} true, if the two code points form a valid escape
 */
const ifTwoCodePointsAreValidEscape = (input, pos, f, s) => {
	const first = f === undefined ? input.charCodeAt(pos - 1) : f;
	const second = s === undefined ? input.charCodeAt(pos) : s;
	if (first !== CC_REVERSE_SOLIDUS) return false;
	if (isNewline(second)) return false;
	return true;
};

/**
 * Spec: "three code points would start an ident sequence". Every caller has
 * read the code points already, so they are passed in (`NaN` past the end).
 * @param {string} input input
 * @param {number} pos position
 * @param {number} first first code point
 * @param {number} second second code point
 * @param {number} third third code point
 * @returns {boolean} true, if the three code points start an ident sequence
 */
const ifThreeCodePointsWouldStartAnIdentSequence = (
	input,
	pos,
	first,
	second,
	third
) => {
	if (first === CC_HYPHEN_MINUS) {
		return (
			isIdentStartCodePoint(second) ||
			second === CC_HYPHEN_MINUS ||
			ifTwoCodePointsAreValidEscape(input, pos, second, third)
		);
	}
	if (isIdentStartCodePoint(first)) return true;
	if (first === CC_REVERSE_SOLIDUS) {
		return ifTwoCodePointsAreValidEscape(input, pos, first, second);
	}
	return false;
};

/**
 * Spec: "three code points would start a number".
 * @param {string} input input
 * @param {number} pos position
 * @param {number=} f first code point
 * @param {number=} s second code point
 * @param {number=} t third code point
 * @returns {boolean} true, if the three code points start a number
 */
const ifThreeCodePointsWouldStartANumber = (input, pos, f, s, t) => {
	const first = f === undefined ? input.charCodeAt(pos - 1) : f;
	const second = s === undefined ? input.charCodeAt(pos) : s;
	const third = t === undefined ? input.charCodeAt(pos + 1) : t;
	if (first === CC_PLUS_SIGN || first === CC_HYPHEN_MINUS) {
		if (isDigit(second)) return true;
		return second === CC_FULL_STOP && isDigit(third);
	}
	// `.`: every caller passes `pos` just past a `+`, `-` or `.`, so the spec's
	// digit case cannot occur.
	return isDigit(second);
};

// Sticky run of `BC_IDENT` code points: a native skip over an ident's plain
// code points, which measured cheaper than a per-char loop even on short ones.
const IDENT_RUN = /[-\w\u0080-\uFFFF]*/y;

/**
 * Consume an ident sequence (no validation of the first code points).
 * @param {string} input input
 * @param {number} pos position
 * @returns {number} position just past the last ident-sequence code point
 */
const consumeAnIdentSequence = (input, pos) => {
	// Hot loop: every ident, at-keyword, hash, function name and unit. Each turn
	// skips a plain run natively, then reads the code point that ended it: an
	// escape continues the sequence, anything else ends it.
	for (;;) {
		IDENT_RUN.lastIndex = pos;
		IDENT_RUN.test(input);
		pos = IDENT_RUN.lastIndex;
		const cc = input.charCodeAt(pos) | 0;
		pos++;
		if (cc === CC_REVERSE_SOLIDUS) {
			const escaped = input.charCodeAt(pos);
			// `\:` and the like: a BC_OTHER code point is no hex digit, newline or
			// EOF, so the escape (§4.3.7) is that one code point.
			if (BYTE_CLASS[escaped | 0] === BC_OTHER) {
				pos++;
				continue;
			}
			if (!isNewline(escaped)) {
				// `| 0` keeps `pos` an int32 around the loop: merged in as the call's
				// tagged result, it is untagged and re-tagged for every code point.
				pos = consumeAnEscapedCodePoint(input, pos) | 0;
				continue;
			}
		}
		return pos - 1;
	}
};

/**
 * @param {number} cc char code
 * @returns {boolean} true, if cc is a non-printable code point
 */
const isNonPrintableCodePoint = (cc) =>
	(cc >= 0x00 && cc <= 0x08) ||
	cc === 0x0b ||
	(cc >= 0x0e && cc <= 0x1f) ||
	cc === 0x7f;

/**
 * Consume the body of a number per the spec (does not classify integer
 * vs number - caller / token type handles that).
 * @param {string} input input
 * @param {number} pos position at the first numeric / sign code point
 * @returns {number} position just past the number
 */
const consumeANumber = (input, pos) => {
	// `cc` stays the code point at `pos`, so each one is read once: a plain
	// integer, the common number, costs its digits and the one after them.
	let cc = input.charCodeAt(pos);
	if (cc === CC_HYPHEN_MINUS || cc === CC_PLUS_SIGN) {
		cc = input.charCodeAt(++pos);
	}
	while (isDigit(cc)) cc = input.charCodeAt(++pos);
	if (cc === CC_FULL_STOP && isDigit(input.charCodeAt(pos + 1))) {
		pos += 2;
		cc = input.charCodeAt(pos);
		while (isDigit(cc)) cc = input.charCodeAt(++pos);
	}
	if (cc === CC_LOWER_E || cc === CC_UPPER_E) {
		const sign = input.charCodeAt(pos + 1);
		if (isDigit(sign)) {
			pos += 2;
		} else if (
			(sign === CC_HYPHEN_MINUS || sign === CC_PLUS_SIGN) &&
			isDigit(input.charCodeAt(pos + 2))
		) {
			pos += 3;
		} else {
			return pos;
		}
		while (isDigit(input.charCodeAt(pos))) pos++;
	}
	return pos;
};

/**
 * Spec recovery: when the tokenizer realises it's mid-bad-url, consume
 * until `)` or EOF.
 * @param {string} input input
 * @param {number} pos position
 * @returns {number} position past the recovery `)` or EOF
 */
const consumeTheRemnantsOfABadUrl = (input, pos) => {
	for (;;) {
		if (pos === input.length) return pos;
		const cc = input.charCodeAt(pos);
		pos++;
		if (cc === CC_RIGHT_PARENTHESIS) return pos;
		if (ifTwoCodePointsAreValidEscape(input, pos)) {
			pos = consumeAnEscapedCodePoint(input, pos);
		}
	}
};

/**
 * A mutable lexer token. The `next` / `consume` hot path reuses a single
 * instance per `CssTokenizer` (the lexer writes into it instead of allocating
 * one object per token), which also keeps the parser's `t.type` reads
 * monomorphic. All fields are present from construction so the shape never
 * transitions; type-specific fields (`isId` / `contentStart` / `contentEnd` /
 * `unitStart`) carry stale values for unrelated token types and are only read
 * by `tokenToNode` for the matching type. Pass a fresh one per `readToken` call
 * to collect the raw token list (e.g. tests).
 * @typedef {object} MutableToken
 * @property {number} type a `TokenType`
 * @property {number} start byte offset of the token's first code point
 * @property {number} end byte offset just past the token's last code point
 * @property {boolean} isId hash tokens: starts an ident sequence
 * @property {number} contentStart url tokens: first content code point
 * @property {number} contentEnd url tokens: just past the last content code point
 * @property {number} unitStart dimension tokens: first unit-ident code point
 */

/**
 * @returns {MutableToken} a fresh lexer token with the canonical shape
 */
const createToken = () => ({
	type: TT_EOF,
	start: 0,
	end: 0,
	isId: false,
	contentStart: 0,
	contentEnd: 0,
	unitStart: 0
});

/**
 * Populate `out`'s common fields and return it - the lexer functions' return
 * statement (kept tiny so V8 can inline it).
 * @param {MutableToken} out token to populate
 * @param {number} type a `TokenType`
 * @param {number} start byte offset of the token's first code point
 * @param {number} end byte offset just past the token's last code point
 * @returns {MutableToken} `out`
 */
const fill = (out, type, start, end) => {
	out.type = type;
	out.start = start;
	out.end = end;
	return out;
};

/**
 * Whitespace token. Caller advances past the leading code point so
 * `start = pos - 1`.
 * @param {string} input input
 * @param {number} pos position just past the first whitespace code point
 * @param {MutableToken} out token to populate
 * @returns {MutableToken | undefined} the resulting token, or undefined at EOF
 */
function consumeSpace(input, pos, out) {
	const start = pos - 1;
	while (BYTE_CLASS[input.charCodeAt(pos) | 0] === BC_WHITESPACE) pos++;
	// `fill` written out on the hottest token producers: one call a token less
	// in unoptimized code, which never inlines it.
	out.type = TT_WHITESPACE;
	out.start = start;
	out.end = pos;
	return out;
}

// Sticky fast-forward classes: a native run-skip over the ordinary characters of
// a string or url token, so a long data: URI costs no per-char read. The negated
// classes match exactly the terminators the loops below handle.
const STRING_SAFE = /[^"'\\\n\r\f]+/y;

// eslint-disable-next-line no-control-regex -- url terminators include the control range and DEL (they make a bad-url)
const URL_SAFE = /[^\u0000-\u0020\u007F"'()\\]+/y;

/**
 * Consume a string token. Caller advanced past the opening quote so
 * `pos - 1` holds the ending code point and `pos - 1` is the start.
 * @param {string} input input
 * @param {number} pos position just past the opening quote
 * @param {MutableToken} out token to populate
 * @returns {MutableToken | undefined} the resulting token, or undefined at EOF
 */
function consumeAStringToken(input, pos, out) {
	const start = pos - 1;
	const endingCodePoint = input.charCodeAt(pos - 1);
	for (;;) {
		STRING_SAFE.lastIndex = pos;
		if (STRING_SAFE.test(input)) pos = STRING_SAFE.lastIndex;
		if (pos === input.length) {
			reportParseError(input, "eof-in-string", pos, pos, "error");
			return fill(out, TT_STRING, start, pos);
		}
		const cc = input.charCodeAt(pos);
		pos++;
		if (cc === endingCodePoint) {
			return fill(out, TT_STRING, start, pos);
		}
		if (isNewline(cc)) {
			pos--;
			reportParseError(input, "newline-in-string", pos, pos + 1, "warning");
			return fill(out, TT_BAD_STRING_TOKEN, start, pos);
		}
		if (cc === CC_REVERSE_SOLIDUS) {
			// `\` at EOF: string ends here; emit the token so ranges cover all input.
			if (pos === input.length) {
				reportParseError(input, "eof-in-string", pos, pos, "error");
				return fill(out, TT_STRING, start, pos);
			}
			if (isNewline(input.charCodeAt(pos))) {
				const ccNl = input.charCodeAt(pos);
				pos++;
				pos = consumeExtraNewline(ccNl, input, pos);
			} else {
				// Neither EOF nor a newline follows, so the escape is valid.
				pos = consumeAnEscapedCodePoint(input, pos);
			}
		}
	}
}

/**
 * `#` - hash or delim.
 * @param {string} input input
 * @param {number} pos position just past `#`
 * @param {MutableToken} out token to populate
 * @returns {MutableToken | undefined} the resulting token, or undefined at EOF
 */
function consumeNumberSign(input, pos, out) {
	const start = pos - 1;
	const first = input.charCodeAt(pos);
	const second = input.charCodeAt(pos + 1);
	if (
		isAsciiIdentCodePoint(first) ||
		ifTwoCodePointsAreValidEscape(input, pos, first, second)
	) {
		const third = input.charCodeAt(pos + 2);
		out.isId = ifThreeCodePointsWouldStartAnIdentSequence(
			input,
			pos,
			first,
			second,
			third
		);
		pos = consumeAnIdentSequence(input, pos);
		// `fill` written out, as in `consumeSpace`.
		out.type = TT_HASH;
		out.start = start;
		out.end = pos;
		return out;
	}
	return fill(out, TT_DELIM, start, pos);
}

/**
 * `-` - number / cdc / ident / delim.
 * @param {string} input input
 * @param {number} pos position just past `-`
 * @param {MutableToken} out token to populate
 * @returns {MutableToken | undefined} the resulting token, or undefined at EOF
 */
function consumeHyphenMinus(input, pos, out) {
	// Read the two lookahead code points once; the lead is the known `-`.
	const second = input.charCodeAt(pos);
	// `--` starts no number, so it is a <CDC-token> or a name - custom
	// properties, the commonest `-` lead - decided before the number test.
	if (second === CC_HYPHEN_MINUS) {
		if (input.charCodeAt(pos + 1) === CC_GREATER_THAN_SIGN) {
			return fill(out, TT_CDC, pos - 1, pos + 2);
		}
		return consumeAnIdentLikeToken(input, pos - 1, pos + 1, out);
	}
	const third = input.charCodeAt(pos + 1);
	if (
		ifThreeCodePointsWouldStartANumber(
			input,
			pos,
			CC_HYPHEN_MINUS,
			second,
			third
		)
	) {
		pos--;
		return consumeANumericToken(input, pos, out);
	}
	// §4.3.9 with a `-` first: an ident-start code point is part of the name
	// already, and a valid escape is where its scan starts.
	if (isIdentStartCodePoint(second)) {
		return consumeAnIdentLikeToken(input, pos - 1, pos + 1, out);
	}
	if (ifTwoCodePointsAreValidEscape(input, pos, second, third)) {
		return consumeAnIdentLikeToken(input, pos - 1, pos, out);
	}
	return fill(out, TT_DELIM, pos - 1, pos);
}

/**
 * `.` - number or delim.
 * @param {string} input input
 * @param {number} pos position just past `.`
 * @param {MutableToken} out token to populate
 * @returns {MutableToken | undefined} the resulting token, or undefined at EOF
 */
function consumeFullStop(input, pos, out) {
	const start = pos - 1;
	if (ifThreeCodePointsWouldStartANumber(input, pos)) {
		pos--;
		return consumeANumericToken(input, pos, out);
	}
	// `fill` written out, as in `consumeSpace`: a class selector's `.`.
	out.type = TT_DELIM;
	out.start = start;
	out.end = pos;
	return out;
}

/**
 * `+` - number or delim.
 * @param {string} input input
 * @param {number} pos position just past `+`
 * @param {MutableToken} out token to populate
 * @returns {MutableToken | undefined} the resulting token, or undefined at EOF
 */
function consumePlusSign(input, pos, out) {
	const start = pos - 1;
	if (ifThreeCodePointsWouldStartANumber(input, pos)) {
		pos--;
		return consumeANumericToken(input, pos, out);
	}
	return fill(out, TT_DELIM, start, pos);
}

/**
 * Numeric token: number / percentage / dimension.
 * @param {string} input input
 * @param {number} pos position at the first numeric/sign code point
 * @param {MutableToken} out token to populate
 * @returns {MutableToken | undefined} the resulting token, or undefined at EOF
 */
function consumeANumericToken(input, pos, out) {
	const start = pos;
	pos = consumeANumber(input, pos);
	const first = input.charCodeAt(pos);
	// A unit can only begin with `-`, `\` or an ident-start code point, exactly
	// where §4's "would start an ident sequence" can hold. A plain number, the
	// common case, skips the two lookahead reads and the call.
	if (
		(first === CC_HYPHEN_MINUS ||
			first === CC_REVERSE_SOLIDUS ||
			isIdentStartCodePoint(first)) &&
		ifThreeCodePointsWouldStartAnIdentSequence(
			input,
			pos,
			first,
			input.charCodeAt(pos + 1),
			input.charCodeAt(pos + 2)
		)
	) {
		out.unitStart = pos;
		pos = consumeAnIdentSequence(input, pos);
		// `fill` written out, as in `consumeSpace`.
		out.type = TT_DIMENSION;
		out.start = start;
		out.end = pos;
		return out;
	}
	out.start = start;
	if (first === CC_PERCENTAGE) {
		out.type = TT_PERCENTAGE;
		out.end = pos + 1;
		return out;
	}
	out.type = TT_NUMBER;
	out.end = pos;
	return out;
}

/**
 * Consume an unquoted url token. Caller has already eaten `url(` and
 * any leading whitespace.
 * @param {string} input input
 * @param {number} pos position at the first content code point
 * @param {number} fnStart byte offset of the `u` in `url(`
 * @param {MutableToken} out token to populate
 * @returns {MutableToken | undefined} the resulting token, or undefined at EOF
 */
function consumeAUrlToken(input, pos, fnStart, out) {
	while (isAsciiWhitespace(input.charCodeAt(pos))) pos++;
	const contentStart = pos;
	out.contentStart = contentStart;
	for (;;) {
		URL_SAFE.lastIndex = pos;
		if (URL_SAFE.test(input)) pos = URL_SAFE.lastIndex;
		if (pos === input.length) {
			reportParseError(input, "eof-in-url", pos, pos, "error");
			out.contentEnd = pos;
			return fill(out, TT_URL, fnStart, pos);
		}
		const cc = input.charCodeAt(pos);
		pos++;
		if (cc === CC_RIGHT_PARENTHESIS) {
			out.contentEnd = pos - 1;
			return fill(out, TT_URL, fnStart, pos);
		}
		if (isAsciiWhitespace(cc)) {
			const end = pos - 1;
			while (isAsciiWhitespace(input.charCodeAt(pos))) pos++;
			if (pos === input.length) {
				reportParseError(input, "eof-in-url", pos, pos, "error");
				out.contentEnd = end;
				return fill(out, TT_URL, fnStart, pos);
			}
			if (input.charCodeAt(pos) === CC_RIGHT_PARENTHESIS) {
				pos++;
				out.contentEnd = end;
				return fill(out, TT_URL, fnStart, pos);
			}
			pos = consumeTheRemnantsOfABadUrl(input, pos);
			return fill(out, TT_BAD_URL_TOKEN, fnStart, pos);
		}
		if (
			cc === CC_QUOTATION_MARK ||
			cc === CC_APOSTROPHE ||
			cc === CC_LEFT_PARENTHESIS ||
			isNonPrintableCodePoint(cc)
		) {
			reportParseError(
				input,
				"unexpected-character-in-url",
				pos - 1,
				pos,
				"warning"
			);
			pos = consumeTheRemnantsOfABadUrl(input, pos);
			return fill(out, TT_BAD_URL_TOKEN, fnStart, pos);
		}
		// `URL_SAFE` stops only on the code points handled above and `\`.
		if (ifTwoCodePointsAreValidEscape(input, pos)) {
			pos = consumeAnEscapedCodePoint(input, pos);
		} else {
			reportParseError(input, "invalid-escape", pos - 1, pos, "warning");
			pos = consumeTheRemnantsOfABadUrl(input, pos);
			return fill(out, TT_BAD_URL_TOKEN, fnStart, pos);
		}
	}
}

/** Longest `url` spelling: each code point as `\` + 6 hex digits + CRLF. */
const MAX_ESCAPED_URL_LENGTH = 3 * (1 + 6 + 2);

/**
 * Whether an ident spans `url` - `\75 rl` names it too, so the unescaped value
 * decides. Its caller asks only of a name opening with `u`, `U` or `\`, and the
 * length gates keep every other such name off the slice.
 * @param {string} input input
 * @param {number} start ident start offset
 * @param {number} end ident end offset (exclusive)
 * @returns {boolean} true when the ident names `url`
 */
const identNamesUrl = (input, start, end) => {
	const length = end - start;
	if (length === 3) {
		return (
			(input.charCodeAt(start) | 0x20) === CC_LOWER_U &&
			(input.charCodeAt(start + 1) | 0x20) === CC_LOWER_R &&
			(input.charCodeAt(start + 2) | 0x20) === CC_LOWER_L
		);
	}
	if (length < 4 || length > MAX_ESCAPED_URL_LENGTH) return false;
	return asciiCaseInsensitiveMatch(
		unescapeIdentifier(input.slice(start, end)),
		"url"
	);
};

/**
 * The `url(` arm of "consume an ident-like token": a function token when a
 * quoted string follows, a url token otherwise.
 * @param {string} input input
 * @param {number} start byte offset of the name's first code point
 * @param {number} pos position just past the `(`
 * @param {MutableToken} out token to populate
 * @returns {MutableToken | undefined} the resulting token, or undefined at EOF
 */
function consumeAUrlOrFunctionToken(input, start, pos, out) {
	const end = pos;
	while (
		isAsciiWhitespace(input.charCodeAt(pos)) &&
		isAsciiWhitespace(input.charCodeAt(pos + 1))
	) {
		pos++;
	}
	if (
		input.charCodeAt(pos) === CC_QUOTATION_MARK ||
		input.charCodeAt(pos) === CC_APOSTROPHE ||
		(isAsciiWhitespace(input.charCodeAt(pos)) &&
			(input.charCodeAt(pos + 1) === CC_QUOTATION_MARK ||
				input.charCodeAt(pos + 1) === CC_APOSTROPHE))
	) {
		// End at `end`, the `(`'s closer, rather than at `pos`: the reader
		// resumes at `token.end`, so the lookahead-eaten whitespace is
		// re-tokenized rather than swallowed.
		return fill(out, TT_FUNCTION, start, end);
	}
	return consumeAUrlToken(input, pos, start, out);
}

/**
 * Consume an ident-like token: ident / function / url / bad-url.
 * @param {string} input input
 * @param {number} start byte offset of the token's first code point
 * @param {number} pos position to scan the name from, every code point before it being part of the name
 * @param {MutableToken} out token to populate
 * @returns {MutableToken | undefined} the resulting token, or undefined at EOF
 */
function consumeAnIdentLikeToken(input, start, pos, out) {
	pos = consumeAnIdentSequence(input, pos);
	let type = TT_IDENTIFIER;
	if (input.charCodeAt(pos) === CC_LEFT_PARENTHESIS) {
		pos++;
		// Only a name opening with `u`, `U` or an escape can spell `url`, so
		// every other function name skips the call.
		const lead = input.charCodeAt(start);
		if (
			((lead | 0x20) === CC_LOWER_U || lead === CC_REVERSE_SOLIDUS) &&
			identNamesUrl(input, start, pos - 1)
		) {
			return consumeAUrlOrFunctionToken(input, start, pos, out);
		}
		type = TT_FUNCTION;
	}
	out.type = type;
	out.start = start;
	out.end = pos;
	return out;
}

/**
 * `<` - CDO or delim.
 * @param {string} input input
 * @param {number} pos position just past `<`
 * @param {MutableToken} out token to populate
 * @returns {MutableToken | undefined} the resulting token, or undefined at EOF
 */
function consumeLessThan(input, pos, out) {
	if (
		input.charCodeAt(pos) === CC_EXCLAMATION &&
		input.charCodeAt(pos + 1) === CC_HYPHEN_MINUS &&
		input.charCodeAt(pos + 2) === CC_HYPHEN_MINUS
	) {
		return fill(out, TT_CDO, pos - 1, pos + 3);
	}
	return fill(out, TT_DELIM, pos - 1, pos);
}

/**
 * `@` - at-keyword or delim.
 * @param {string} input input
 * @param {number} pos position just past `@`
 * @param {MutableToken} out token to populate
 * @returns {MutableToken | undefined} the resulting token, or undefined at EOF
 */
function consumeCommercialAt(input, pos, out) {
	const start = pos - 1;
	if (
		ifThreeCodePointsWouldStartAnIdentSequence(
			input,
			pos,
			input.charCodeAt(pos),
			input.charCodeAt(pos + 1),
			input.charCodeAt(pos + 2)
		)
	) {
		pos = consumeAnIdentSequence(input, pos);
		return fill(out, TT_AT_KEYWORD, start, pos);
	}
	return fill(out, TT_DELIM, start, pos);
}

/**
 * `\` - escape starts an ident-like token, otherwise it's a delim.
 * @param {string} input input
 * @param {number} pos position just past `\`
 * @param {MutableToken} out token to populate
 * @returns {MutableToken | undefined} the resulting token, or undefined at EOF
 */
function consumeReverseSolidus(input, pos, out) {
	if (ifTwoCodePointsAreValidEscape(input, pos)) {
		return consumeAnIdentLikeToken(input, pos - 1, pos - 1, out);
	}
	reportParseError(input, "invalid-escape", pos - 1, pos, "warning");
	return fill(out, TT_DELIM, pos - 1, pos);
}

// WHY: tokenizer lead-character dispatch (CSS Syntax Level 3 §4 "consume a
// token"). `readToken` picks a sub-routine from each token's first code
// point. §4 keys its rules on code points sitting sparsely across ASCII, so a
// plain `switch (cc)` compiles to a jump table spanning U+0009..U+007D in which
// the commonest lead - an ident-start letter - is not a case at all and arrives
// only once the digit and whitespace tests miss. `CHAR_CLASS` precomputes a
// dense handler id (`HC_*`, 0..13) per ASCII code point, so the dispatch is one
// array load and a `switch` on the id. Its cases are named constants, which
// unoptimized code tests one by one, so they run commonest lead first.
// Non-ASCII is always ident-start per §4.
//
// For a spec change, repoint the code point in the build loop below; a new
// sub-routine also needs an `HC_*` id, a `case` in `readToken` and a row
// here. This list is the authoritative map of lead code point to handler:
//
//   HC_WHITESPACE      whitespace      U+0009 TAB  U+000A LF  U+000C FF  U+000D CR  U+0020 SPACE
//   HC_STRING          string start    U+0022 "    U+0027 '
//   HC_SINGLE          one-char token  ( ) , : ; [ ] { }   (its token type comes from `singleTT`)
//   HC_NUMBER_SIGN     hash / delim    U+0023 #
//   HC_PLUS_SIGN       number / delim  U+002B +
//   HC_HYPHEN_MINUS    number / CDC / ident / delim   U+002D -
//   HC_FULL_STOP       number / delim  U+002E .
//   HC_LESS_THAN       CDO / delim     U+003C <
//   HC_AT_SIGN         at-keyword / delim   U+0040 @
//   HC_REVERSE_SOLIDUS escape / delim  U+005C \
//   HC_DIGIT           number          U+0030..U+0039 0-9
//   HC_IDENT           ident-like      U+0041..U+005A A-Z  U+0061..U+007A a-z  U+005F _  (plus cc >= 128)
//   HC_SOLIDUS         comment / delim U+002F /
//   HC_DELIM           anything else   -> a single <delim-token>
//
// `singleTT[cc]` is the token type for the HC_SINGLE code points (a second table
// so they share one handler instead of one `case` each). The default class 0 is
// the delim handler (anything not matched below), so it needs no named constant.
const HC_WHITESPACE = 1;

const HC_STRING = 2;

const HC_SINGLE = 3;

const HC_NUMBER_SIGN = 4;

const HC_PLUS_SIGN = 5;

const HC_HYPHEN_MINUS = 6;

const HC_FULL_STOP = 7;

const HC_LESS_THAN = 8;

const HC_AT_SIGN = 9;

const HC_REVERSE_SOLIDUS = 10;

const HC_DIGIT = 11;

const HC_IDENT = 12;

const HC_SOLIDUS = 13;

// Full `charCodeAt` range, so the dispatch is one table load with no `cc < 128`
// branch. Every non-ASCII code point is an ident-start lead per §4 and is seeded
// to `HC_IDENT`; the rows below overwrite 0..127 with their real class.
const CHAR_CLASS = new Uint8Array(0x10000).fill(HC_IDENT, 128);

const singleTT = new Uint8Array(128);

singleTT[CC_LEFT_PARENTHESIS] = TT_LEFT_PARENTHESIS;

singleTT[CC_RIGHT_PARENTHESIS] = TT_RIGHT_PARENTHESIS;

singleTT[CC_COMMA] = TT_COMMA;

singleTT[CC_COLON] = TT_COLON;

singleTT[CC_SEMICOLON] = TT_SEMICOLON;

singleTT[CC_LEFT_SQUARE] = TT_LEFT_SQUARE_BRACKET;

singleTT[CC_RIGHT_SQUARE] = TT_RIGHT_SQUARE_BRACKET;

singleTT[CC_LEFT_CURLY] = TT_LEFT_CURLY_BRACKET;

singleTT[CC_RIGHT_CURLY] = TT_RIGHT_CURLY_BRACKET;

// Each ASCII code point belongs to exactly one class; HC_SINGLE is seeded from
// `singleTT` above, the rest follow §4's lead-code-point rules, and everything
// unmatched stays the delim class (0). Keep this in sync with the table above.
for (let i = 0; i < 128; i++) {
	if (singleTT[i] !== 0) {
		CHAR_CLASS[i] = HC_SINGLE;
	} else if (isAsciiWhitespace(i)) {
		CHAR_CLASS[i] = HC_WHITESPACE;
	} else if (i === CC_QUOTATION_MARK || i === CC_APOSTROPHE) {
		CHAR_CLASS[i] = HC_STRING;
	} else if (i === CC_NUMBER_SIGN) {
		CHAR_CLASS[i] = HC_NUMBER_SIGN;
	} else if (i === CC_PLUS_SIGN) {
		CHAR_CLASS[i] = HC_PLUS_SIGN;
	} else if (i === CC_HYPHEN_MINUS) {
		CHAR_CLASS[i] = HC_HYPHEN_MINUS;
	} else if (i === CC_FULL_STOP) {
		CHAR_CLASS[i] = HC_FULL_STOP;
	} else if (i === CC_LESS_THAN_SIGN) {
		CHAR_CLASS[i] = HC_LESS_THAN;
	} else if (i === CC_AT_SIGN) {
		CHAR_CLASS[i] = HC_AT_SIGN;
	} else if (i === CC_REVERSE_SOLIDUS) {
		CHAR_CLASS[i] = HC_REVERSE_SOLIDUS;
	} else if (i === CC_SOLIDUS) {
		CHAR_CLASS[i] = HC_SOLIDUS;
	} else if (isDigit(i)) {
		CHAR_CLASS[i] = HC_DIGIT;
	} else if (isIdentStartCodePoint(i)) {
		CHAR_CLASS[i] = HC_IDENT;
	}
	// else stays the delim class (0)
}

/**
 * Read one raw token (comment / whitespace / value token) starting at byte
 * `pos`, writing it into the caller-supplied `out` and returning `out`. The
 * token's `end` is the next read position. Returns `undefined` at end-of-input -
 * `pos >= length`, an unterminated comment, or a string ending on a trailing
 * escape. This is the one tokenizer entry point: `CssTokenizer#next` reuses a
 * single `out` across calls so the parse hot path allocates no per-token object,
 * while `HtmlGenerator`'s `<style>` scan and the tests loop over it with their
 * own `out`. Comment tokens are returned here; `next` filters them.
 * @param {string} input input
 * @param {number} pos byte offset to read from
 * @param {MutableToken} out token to populate
 * @returns {MutableToken | undefined} the token, or undefined at EOF
 */
function readToken(input, pos, out) {
	if (pos >= input.length) return undefined;
	const cc = input.charCodeAt(pos);
	// WHY: one function holds the whole dispatch so a token costs one call from
	// `CssTokenizer#next`, whose own body then stays a cache test V8 inlines at
	// every call site. Each handler takes the position just past the lead code
	// point unless its comment says otherwise. `u` / `U` would start a
	// unicode-range token in the spec; those are not produced, so they are
	// HC_IDENT and read as ident-like.
	switch (CHAR_CLASS[cc]) {
		// One-code-point token, its type read off `singleTT`.
		case HC_SINGLE:
			out.type = singleTT[cc];
			out.start = pos;
			out.end = pos + 1;
			return out;
		// Ident-start (letter / `_` / non-ASCII, incl. `u`/`U`) -> ident / function /
		// url token starting at the lead code point, its name scanned from past it.
		case HC_IDENT:
			return consumeAnIdentLikeToken(input, pos, pos + 1, out);
		// Digit -> numeric token, read from the digit itself.
		case HC_DIGIT:
			return consumeANumericToken(input, pos, out);
		// Run of whitespace -> one <whitespace-token>.
		case HC_WHITESPACE:
			return consumeSpace(input, pos + 1, out);
		// `-` -> number / <CDC-token> (`-->`) / ident / <delim-token>.
		case HC_HYPHEN_MINUS:
			return consumeHyphenMinus(input, pos + 1, out);
		// `.` -> <number-token> if a digit follows, else a <delim-token>.
		case HC_FULL_STOP:
			return consumeFullStop(input, pos + 1, out);
		// `#` -> <hash-token> if an ident/escape follows, else a <delim-token>.
		case HC_NUMBER_SIGN:
			return consumeNumberSign(input, pos + 1, out);
		// `"` / `'` -> <string-token> (or <bad-string-token> on a raw newline).
		case HC_STRING:
			return consumeAStringToken(input, pos + 1, out);
		// `+` -> <number-token> if it starts a number, else a <delim-token>.
		case HC_PLUS_SIGN:
			return consumePlusSign(input, pos + 1, out);
		// `<` -> <CDO-token> (`<!--`), else a <delim-token>.
		case HC_LESS_THAN:
			return consumeLessThan(input, pos + 1, out);
		// `@` -> <at-keyword-token> if an ident follows, else a <delim-token>.
		case HC_AT_SIGN:
			return consumeCommercialAt(input, pos + 1, out);
		// `\` -> ident-like token if it's a valid escape, else a <delim-token>.
		case HC_REVERSE_SOLIDUS:
			return consumeReverseSolidus(input, pos + 1, out);
		// `/*...*/` is yielded as a token (`CssTokenizer#next` steps over it); any
		// other `/` is a <delim-token>.
		case HC_SOLIDUS: {
			if (input.charCodeAt(pos + 1) !== CC_ASTERISK) {
				return fill(out, TT_DELIM, pos, pos + 1);
			}
			// Jump to the closing `*/` in one native scan instead of a per-character
			// loop - comment bodies (license banners, source comments) can be long.
			// No close: unterminated comment runs to EOF so ranges cover all input.
			const close = input.indexOf("*/", pos + 2);
			if (close === -1) {
				const end = input.length;
				reportParseError(input, "eof-in-comment", end, end, "error");
				return fill(out, TT_COMMENT, pos, end);
			}
			return fill(out, TT_COMMENT, pos, close + 2);
		}
		default:
			// HC_DELIM. EOF is impossible here (guarded by the `pos < input.length`
			// check above). Anything else: a <delim-token>.
			out.type = TT_DELIM;
			out.start = pos;
			out.end = pos + 1;
			return out;
	}
}

/**
 * Position-based view over the lexer - webpack's stand-in for the spec's
 * "normalize into a token stream" (CSS Syntax §9). It unifies the lexer and the
 * stream in one class: the `readToken` primitive lexes one token (the CSS
 * tokenizer), and the spec token-stream operations `next` / `consume` /
 * `discard` / `mark` / `restoreMark` / `discardMark` drive it from a byte
 * cursor. `parse*` entry points wrap a source string in one of these and every
 * `consume*` algorithm reads tokens from it.
 *
 * No token buffer is kept: the cursor is a byte offset and the only state is
 * the next token (lazily tokenized once and cached until consumed). The
 * declaration-vs-qualified-rule backtracking in `consumeABlocksContents`
 * rewinds by `mark`ing / `restoreMark`ing that byte offset, which simply
 * re-tokenizes the rewound span - comment tokens are filtered here and fire
 * `onComment` once each, tracked by a monotonic high-water mark so a
 * re-tokenized span never re-fires them.
 *
 * `SourceProcessor` is handed this class (not an instance) and threads it to
 * the grammar, so a different language can drive the same visitor machinery by
 * swapping the tokenizer - the per-token `readToken` primitive - for its own.
 */
class CssTokenizer {
	/**
	 * @param {string} input source
	 * @param {number=} pos start byte offset (default `0`)
	 * @param {LocConverter=} locConverter shared loc converter (default a fresh one over `input`)
	 * @param {((input: string, start: number, end: number) => number)=} onComment comment-token callback
	 */
	constructor(
		input,
		pos = 0,
		locConverter = new LocConverter(input, "css"),
		onComment = undefined
	) {
		/** @type {string} */
		this.input = input;
		/** @type {LocConverter} */
		this.locConverter = locConverter;
		this._onComment = onComment;
		// Byte offset where the next token is tokenized from.
		/** @type {number} */
		this._pos = pos;
		// Comments before this offset have already fired `onComment`; a
		// re-tokenized (backtracked) span never re-fires them.
		/** @type {number} */
		this._commentHigh = pos;
		// Single reused token the lexer writes into on the `next` path - see
		// `MutableToken`. `_hasNext` marks it cached - a boolean instead of an
		// object slot, so caching a token never pays a GC write barrier.
		/** @type {MutableToken} */
		this._tok = createToken();
		/** @type {boolean} whether `_tok` holds the (lazily tokenized) next token */
		this._hasNext = false;
		/** @type {number[]} byte offsets to rewind to */
		this._marks = [];
	}

	/**
	 * The next token (CSS Syntax §3 "next token") - the upcoming token without
	 * consuming it; the `<eof-token>` once the source is exhausted. This is the
	 * token the consume algorithms dispatch on (the spec's "process"). Tokenized
	 * from `_pos` on first use and cached until consumed; comment tokens are
	 * skipped here, firing `onComment` once each.
	 * @returns {MutableToken} the next token
	 */
	next() {
		if (!this._hasNext) {
			const t = readToken(this.input, this._pos, this._tok);
			// The end of input and a comment are rare and read out of line, which
			// keeps this small enough to inline at every call site.
			if (t === undefined || t.type === TT_COMMENT) this._skipComments(t);
			this._hasNext = true;
		}
		return this._tok;
	}

	/**
	 * The rare half of `next`: write the `<eof-token>` at the end of input, or
	 * step over comments to the token after them, firing `onComment` once each.
	 * @param {MutableToken | undefined} t what `readToken` returned at `_pos`
	 * @returns {void}
	 */
	_skipComments(t) {
		const input = this.input;
		const tok = this._tok;
		for (;;) {
			if (t === undefined) {
				fill(tok, TT_EOF, input.length, input.length);
				return;
			}
			if (t.type !== TT_COMMENT) return;
			// A closed comment is `/**/` at the shortest; anything else running to
			// the end never closed, and the printer writes its `*/` back.
			if (
				t.end === input.length &&
				(t.end - t.start < 4 ||
					input.charCodeAt(t.end - 2) !== CC_ASTERISK ||
					input.charCodeAt(t.end - 1) !== CC_SOLIDUS) &&
				parseTree !== undefined
			) {
				parseTree._openCommentStart = t.start;
			}
			if (t.start >= this._commentHigh) {
				if (this._onComment) this._onComment(input, t.start, t.end);
				this._commentHigh = t.end;
			}
			t = readToken(input, t.end, tok);
		}
	}

	/**
	 * Consume a token (CSS Syntax §3 "consume a token") - return the next token
	 * and advance the cursor past it. The returned token is valid until the next
	 * `next` re-tokenizes (the reused instance is not cleared by advancing).
	 * @returns {MutableToken} the consumed token
	 */
	consume() {
		const t = this.next();
		if (t.type !== TT_EOF) {
			this._pos = t.end;
			this._hasNext = false;
		}
		return t;
	}

	/**
	 * Discard a token (CSS Syntax §3 "discard a token") - advance the cursor past
	 * the next token without returning it.
	 * @returns {void}
	 */
	discard() {
		const t = this.next();
		if (t.type !== TT_EOF) {
			this._pos = t.end;
			this._hasNext = false;
		}
	}

	/**
	 * Advance past the already-peeked next token, skipping the redundant `next()`
	 * re-check `consume` / `discard` pay. Precondition: the caller has just called
	 * `next()` (so `_tok` is the cached next token and `_hasNext` is true) and that
	 * token is not the `<eof-token>` - the hot "peek, decide, advance" sites where
	 * both always hold. Callers that can't guarantee a non-EOF cached token use
	 * `consume` / `discard` instead.
	 * @returns {void}
	 */
	advance() {
		this._pos = this._tok.end;
		this._hasNext = false;
	}

	/**
	 * Step over the whitespace the next token would be, without tokenizing it -
	 * for the sites that discard whitespace tokens. No-op while a token is cached.
	 * @returns {void}
	 */
	skipWhitespace() {
		if (this._hasNext) return;
		const input = this.input;
		let pos = this._pos;
		while (BYTE_CLASS[input.charCodeAt(pos) | 0] === BC_WHITESPACE) pos++;
		this._pos = pos;
	}

	/**
	 * Step over the run of selector-prelude leaves a skip-mode parse drops (CSS
	 * Syntax §5.4.3's "append to prelude", which skip mode does not do), without
	 * lexing one token each. Only valid where every leaf up to the next
	 * `BC_PRELUDE_STOP` code point is dropped whatever it is - which in
	 * `consumeAQualifiedRule` is once the two tokens the `--foo: {`
	 * disambiguation reads have both been seen. No-op while a token is cached.
	 * @returns {void}
	 */
	skipPreludeLeaves() {
		if (this._hasNext) return;
		const input = this.input;
		const from = this._pos;
		let pos = from;
		while (BYTE_CLASS[input.charCodeAt(pos) | 0] !== BC_PRELUDE_STOP) pos++;
		// A `(` closes a function when a name runs into it, so the token is lexed
		// from that name instead, for `url(` and `:not(` to stay one. The run holds
		// no escape, a `\` being a stop, so it starts where ident code points do.
		if (input.charCodeAt(pos) === CC_LEFT_PARENTHESIS) {
			while (pos > from && BYTE_CLASS[input.charCodeAt(pos - 1)] === BC_IDENT) {
				pos--;
			}
		}
		this._pos = pos;
	}

	/**
	 * Mark (CSS Syntax §3 "mark") - push the current cursor position.
	 * @returns {void}
	 */
	mark() {
		this._marks.push(this._pos);
	}

	/**
	 * Restore a mark (CSS Syntax §3 "restore a mark") - pop the last mark and
	 * rewind the cursor to it. The rewound span is re-tokenized on the next read;
	 * already-fired comments are not re-fired (`_commentHigh`).
	 * @returns {void}
	 */
	restoreMark() {
		this._pos = /** @type {number} */ (this._marks.pop());
		this._hasNext = false;
	}

	/**
	 * Rewind the cursor to `pos`, an offset `_pos` held, as `restoreMark` does
	 * for a mark the caller kept itself.
	 * @param {number} pos the offset to rewind to
	 * @returns {void}
	 */
	rewind(pos) {
		this._pos = pos;
		this._hasNext = false;
	}

	/**
	 * Discard a mark (CSS Syntax §3 "discard a mark") - pop without rewinding.
	 * @returns {void}
	 */
	discardMark() {
		this._marks.pop();
	}
}

/**
 * Returns hex. Reads up to six hex digits from `str` starting at `start` -
 * indexed rather than sliced, and case-folded inline, so the common
 * non-hex escape (e.g. `\:` in `focus\:sr-only`) allocates nothing.
 * @param {string} str string
 * @param {number} start index just past the `\`
 * @returns {[string, number] | undefined} hex
 */
const gobbleHex = (str, start) => {
	let hex = "";

	for (let i = 0; i < 6; i++) {
		const code = str.charCodeAt(start + i);
		// valid hex char [0-9 | A-F | a-f]; out-of-range reads NaN -> invalid
		const valid =
			(code >= 48 && code <= 57) ||
			(code >= 65 && code <= 70) ||
			(code >= 97 && code <= 102);
		if (!valid) break;
		// parseInt below is case-insensitive, so keep the original char.
		hex += str[start + i];
	}

	if (hex.length === 0) return undefined;

	// One trailing whitespace terminates the escape, as in the tokenizer's
	// `consumeAnEscapedCodePoint`: after a full 6-digit escape too, for any CSS
	// whitespace, plus the extra LF of a CRLF pair.
	let consumed = hex.length;
	const trail = str.charCodeAt(start + hex.length);
	if (isAsciiWhitespace(trail)) {
		consumed = consumeExtraNewline(trail, str, start + hex.length + 1) - start;
	}

	const codePoint = Number.parseInt(hex, 16);
	const isSurrogate = codePoint >= 0xd800 && codePoint <= 0xdfff;

	// Add special case for
	// "If this number is zero, or is for a surrogate, or is greater than the maximum allowed code point"
	// https://drafts.csswg.org/css-syntax/#maximum-allowed-code-point
	if (isSurrogate || codePoint === 0x0000 || codePoint > 0x10ffff) {
		return ["\uFFFD", consumed];
	}

	return [String.fromCodePoint(codePoint), consumed];
};

/**
 * Unescape identifier.
 * @param {string} str string
 * @returns {string} unescaped string
 */
const unescapeIdentifierUncached = (str) => {
	// `indexOf` is the no-escape fast path and the start offset in one - the
	// leading safe run is skipped and an unescaped ident returns as-is.
	const first = str.indexOf("\\");
	if (first === -1) return str;
	let ret = "";
	// Flush safe runs in bulk instead of appending char by char.
	let lastFlush = 0;
	for (let i = first; i < str.length; i++) {
		if (str[i] !== "\\") continue;
		ret += str.slice(lastFlush, i);
		const gobbled = gobbleHex(str, i + 1);
		if (gobbled !== undefined) {
			ret += gobbled[0];
			i += gobbled[1];
		} else if (str[i + 1] === "\\") {
			// Retain one `\` of an escaped `\\` pair.
			// https://github.com/postcss/postcss-selector-parser/commit/268c9a7656fb53f543dc620aa5b73a30ec3ff20e
			ret += "\\";
			i += 1;
		} else if (str.length === i + 1) {
			// A trailing lone `\` escapes the end of the input (§4.3.7).
			ret += "\uFFFD";
		}
		// Otherwise the lone `\` is dropped; the next char flushes with its run.
		lastFlush = i + 1;
	}
	ret += str.slice(lastFlush);

	return ret;
};

const unescapeIdentifier = makeCacheable(unescapeIdentifierUncached);

module.exports.CC_0 = CC_0;
module.exports.CC_APOSTROPHE = CC_APOSTROPHE;
module.exports.CC_ASTERISK = CC_ASTERISK;
module.exports.CC_AT_SIGN = CC_AT_SIGN;
module.exports.CC_CARRIAGE_RETURN = CC_CARRIAGE_RETURN;
module.exports.CC_COLON = CC_COLON;
module.exports.CC_COMMA = CC_COMMA;
module.exports.CC_EQUALS_SIGN = CC_EQUALS_SIGN;
module.exports.CC_EXCLAMATION = CC_EXCLAMATION;
module.exports.CC_FORM_FEED = CC_FORM_FEED;
module.exports.CC_FULL_STOP = CC_FULL_STOP;
module.exports.CC_GREATER_THAN_SIGN = CC_GREATER_THAN_SIGN;
module.exports.CC_HYPHEN_MINUS = CC_HYPHEN_MINUS;
module.exports.CC_LEFT_CURLY = CC_LEFT_CURLY;
module.exports.CC_LEFT_PARENTHESIS = CC_LEFT_PARENTHESIS;
module.exports.CC_LEFT_SQUARE = CC_LEFT_SQUARE;
module.exports.CC_LESS_THAN_SIGN = CC_LESS_THAN_SIGN;
module.exports.CC_LINE_FEED = CC_LINE_FEED;
module.exports.CC_LOWER_A = CC_LOWER_A;
module.exports.CC_LOWER_D = CC_LOWER_D;
module.exports.CC_LOWER_I = CC_LOWER_I;
module.exports.CC_LOWER_S = CC_LOWER_S;
module.exports.CC_LOWER_T = CC_LOWER_T;
module.exports.CC_LOWER_U = CC_LOWER_U;
module.exports.CC_LOWER_X = CC_LOWER_X;
module.exports.CC_LOW_LINE = CC_LOW_LINE;
module.exports.CC_NUMBER_SIGN = CC_NUMBER_SIGN;
module.exports.CC_PERCENTAGE = CC_PERCENTAGE;
module.exports.CC_PLUS_SIGN = CC_PLUS_SIGN;
module.exports.CC_QUOTATION_MARK = CC_QUOTATION_MARK;
module.exports.CC_REVERSE_SOLIDUS = CC_REVERSE_SOLIDUS;
module.exports.CC_RIGHT_CURLY = CC_RIGHT_CURLY;
module.exports.CC_RIGHT_PARENTHESIS = CC_RIGHT_PARENTHESIS;
module.exports.CC_RIGHT_SQUARE = CC_RIGHT_SQUARE;
module.exports.CC_SEMICOLON = CC_SEMICOLON;
module.exports.CC_SOLIDUS = CC_SOLIDUS;
module.exports.CC_SPACE = CC_SPACE;
module.exports.CC_TAB = CC_TAB;
module.exports.CC_TILDE = CC_TILDE;
module.exports.CC_UPPER_A = CC_UPPER_A;
module.exports.CC_UPPER_Z = CC_UPPER_Z;
module.exports.CC_VERTICAL_LINE = CC_VERTICAL_LINE;
module.exports.CssTokenizer = CssTokenizer;
module.exports.IDENT_RUN = IDENT_RUN;
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
module.exports.TokenType = TokenType;
module.exports.asciiCaseInsensitiveMatch = asciiCaseInsensitiveMatch;
module.exports.consumeANumber = consumeANumber;
module.exports.consumeAnEscapedCodePoint = consumeAnEscapedCodePoint;
module.exports.consumeExtraNewline = consumeExtraNewline;
module.exports.consumeTheRemnantsOfABadUrl = consumeTheRemnantsOfABadUrl;
module.exports.createToken = createToken;
module.exports.gobbleHex = gobbleHex;
module.exports.identNamesUrl = identNamesUrl;
module.exports.ifThreeCodePointsWouldStartAnIdentSequence =
	ifThreeCodePointsWouldStartAnIdentSequence;
module.exports.isAsciiIdentCodePoint = isAsciiIdentCodePoint;
module.exports.isAsciiWhitespace = isAsciiWhitespace;
module.exports.isDigit = isDigit;
module.exports.isHexDigit = isHexDigit;
module.exports.isIdentStartCodePoint = isIdentStartCodePoint;
module.exports.isLetter = isLetter;
module.exports.isNewline = isNewline;
module.exports.readToken = readToken;
module.exports.reportParseError = reportParseError;
module.exports.setParseTree = setParseTree;
module.exports.unescapeIdentifier = unescapeIdentifier;
