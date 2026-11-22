/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const LocConverter = require("../util/LocConverter");
const {
	haltVisitors,
	haltVisitorsAgain,
	resumeVisitors
} = require("../util/haltVisitors");

const { makeCacheable } = require("../util/identifier");

/**
 * Renders source this stylesheet embeds - a `data:` URL's payload today.
 * Returning it unchanged, or anything but text, declines it, and the URL is
 * emitted as written.
 * @typedef {(source: string, info: { type: string, hostType: string }) => string | undefined} EmbeddedSourceRenderer
 */

/**
 * One embedded source recorded for a caller that can only answer
 * asynchronously, and the text to print once it has.
 * @typedef {import("../util/dataURL").DeferredEmbeddedSource} DeferredEmbeddedSource
 */

/** @typedef {import("../html/syntax-parser").ParseErrorSeverity} ParseErrorSeverity */
const {
	ABSOLUTE_UNIT_SCALE,
	ANIMATION_KEYWORD_SLOTS,
	BOX_FAMILY_PREFIX,
	BOX_LONGHANDS,
	BOX_SHORTHANDS,
	CALC_CONSTANTS,
	COLOR_FUNCTIONS,
	COLOR_KEYWORDS,
	COMPOUND_CONTINUATIONS,
	CSS_WIDE_KEYWORDS,
	CUSTOM_IDENT_LIST_PROPERTIES,
	DROPPABLE_WHEN_EMPTY_AT_RULES,
	EASING_KEYWORDS,
	ENCODED_ALREADY,
	ENGINE_TRANSFER_DIFFERS,
	FAMILY_LONGHANDS,
	FAMILY_SLOT_CLASSES,
	FAMILY_SLOT_INITIALS,
	FAMILY_SLOT_KEYWORDS,
	FEATURELESS_PSEUDO_CLASSES,
	FLEX_KEYWORDS,
	LATER_COLOR_NAMES,
	LEGACY_BOX_DISPLAYS,
	LEGACY_BOX_SPELLINGS,
	LEGACY_PSEUDO_ELEMENTS,
	LINEAR_SRGB_TO_P3,
	MATH_FUNCTIONS,
	MERGEABLE_AT_RULES,
	MERGE_LONGHANDS,
	NEGATIVE_ACCEPTING_PROPERTIES,
	NEVER,
	NTH_PSEUDO_FUNCTIONS,
	ONE_VALUE_PAIR_SHORTHANDS,
	ORDERED_LONGHANDS,
	PAIR_LONGHANDS,
	PLACE_SHORTHANDS,
	PREDEFINED_COLOR_SPACES,
	PREFIXED_AT_RULES,
	PREFIXED_SELECTORS,
	PREFIXED_SPELLING_NUMBERS,
	PREFIX_WINDOW_STARTS,
	RGB_TO_NAME,
	SLASH_LONGHANDS,
	SRGB_SPACE,
	STEPPED_FUNCTIONS,
	SUBSTITUTION_FUNCTIONS,
	SUPPORTED_FROM,
	SUPPORT_BROWSERS,
	THROUGH_MATRIX,
	THROUGH_TRANSFER,
	TRANSITION_BEHAVIORS,
	UNSHARED_LONGHAND_KEYWORDS,
	UNSTATED_BROWSER_PREFIXES,
	foldAdd,
	foldDivide,
	foldMultiply,
	getColorNameToRgb,
	getColorSpaceModel,
	getDeclarationRanks,
	getPrefixWindows,
	getPrefixedProperties,
	getPrefixedSpellingKeywords,
	getPrefixedValues,
	getPropertyAliases,
	getSelectorSupportedFrom,
	getShorthandLonghands,
	getSupportProfiles,
	getValueSupportPacked
} = require("./data");

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
 * The lexer token types by spec name, as `readToken` and `TokenStream` callers
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

// The opening bracket types (7..9) and their closers (10..12) are laid out so a
// closer is always `opener + 3`, which `consumeASimpleBlock` uses directly. The
// block char is a dense array indexed by the offset from `TT_LEFT_PARENTHESIS`.
/** @type {SimpleBlockToken[]} */
const BLOCK_TOKEN_CHAR = ["(", "[", "{"];

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
 * Trim the whitespace CSS itself skips. `String#trim` also eats U+00A0 and the
 * other Unicode spaces, which an identifier carries as ordinary characters, so
 * a layer named `\u00A0x` would compare equal to one named `x`.
 * @param {string} text the text to trim
 * @returns {string} the text without its leading and trailing CSS whitespace
 */
const trimCssWhiteSpace = (text) => {
	let start = 0;
	let end = text.length;
	while (start < end && isAsciiWhitespace(text.charCodeAt(start))) start++;
	while (end > start && isAsciiWhitespace(text.charCodeAt(end - 1))) end--;
	return start === 0 && end === text.length ? text : text.slice(start, end);
};

/**
 * A digit (CSS Syntax §4.2): U+0030 to U+0039.
 * @param {number} cc char code
 * @returns {boolean} true, if cc is a digit
 */
const isDigit = (cc) => cc >= CC_0 && cc <= CC_9;

/**
 * Whether a number's digits start at `at`: a digit, or a `.` with one after it.
 * @param {string} text the text
 * @param {number} at the offset
 * @returns {boolean} true when the digits of a number start there
 */
const startsDigits = (text, at) =>
	isDigit(text.charCodeAt(at)) ||
	(text.charCodeAt(at) === CC_FULL_STOP && isDigit(text.charCodeAt(at + 1)));

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
// `TokenStream#skipPreludeLeaves`: the structure its rule loop stops at, the
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

/**
 * Case-sensitive equality of a source range against a literal - no slice.
 * @param {string} input source
 * @param {number} start range start
 * @param {number} end range end (exclusive)
 * @param {string} lit literal to match
 * @returns {boolean} true when the range equals `lit`
 */
const rangeEquals = (input, start, end, lit) =>
	end - start === lit.length && input.startsWith(lit, start);

/**
 * ASCII case-insensitive equality of a source range against a lowercase ASCII literal - no slice.
 * @param {string} input source
 * @param {number} start range start
 * @param {number} end range end (exclusive)
 * @param {string} lit lowercase ASCII literal to match
 * @returns {boolean} true when the range equals `lit` ignoring ASCII case
 */
const rangeAsciiCaseInsensitiveMatch = (input, start, end, lit) => {
	if (end - start !== lit.length) return false;
	for (let i = 0; i < lit.length; i++) {
		let c = input.charCodeAt(start + i);
		if (c >= CC_UPPER_A && c <= CC_UPPER_Z) c |= 0x20;
		if (c !== lit.charCodeAt(i)) return false;
	}
	return true;
};

// A native scan for what `toLowerCaseIfNeeded` and `asciiLowercaseName` fold,
// cheaper than a per-character loop for all but the shortest names.
const MAY_CHANGE_CASE_RE = /[A-Z\u0080-\uFFFF]/;
const HAS_ASCII_UPPER_RE = /[A-Z]/;

/**
 * `s.toLowerCase()` that returns `s` itself (no allocation) when it can't
 * change - no ASCII uppercase and no non-ASCII (whose Unicode case mapping is
 * left to the real `toLowerCase`).
 * @param {string} s string
 * @returns {string} lowercased string
 */
const toLowerCaseIfNeeded = (s) =>
	MAY_CHANGE_CASE_RE.test(s) ? s.toLowerCase() : s;

// Every ASCII uppercase letter in the tail of a name that carries one; the fold
// below is the only place either is used, and only for such a name.
const ASCII_UPPER_RE = /[A-Z]/g;
/** @type {(one: string) => string} */
const toAsciiLower = (one) => String.fromCharCode(one.charCodeAt(0) | 0x20);

/**
 * A name CSS matches ASCII case-insensitively - a property, at-keyword,
 * function, pseudo, media feature or unit - written lowercase, so the same name
 * is the same bytes wherever it is spelled. Only ASCII letters map, the matching
 * being ASCII-only; a name carrying an escape is written back as authored, since
 * `\G` and `\g` name different characters.
 * @param {string} s the name
 * @returns {string} it, lowercased
 */
const asciiLowercaseName = (s) => {
	// Only an ASCII capital folds, so the scan for one is the whole test: the
	// native `toLowerCase` copies any one-byte string of eight characters or more.
	if (!HAS_ASCII_UPPER_RE.test(s)) return s;
	// An escape names a character by case (`\G` is not `\g`), so a name carrying
	// one is written back as authored.
	if (s.includes("\\")) return s;
	return s.replace(ASCII_UPPER_RE, toAsciiLower);
};

/**
 * A custom property name (`<dashed-ident>`): a `--`-prefixed identifier other than bare `--`.
 * @param {string} identifier identifier
 * @returns {boolean} true when identifier is dashed, otherwise false
 */
const isDashedIdentifier = (identifier) =>
	identifier.startsWith("--") && identifier.length >= 3;

// One unescaped `<ident-token>` spelling: no escapes, whitespace or punctuation.
const SIMPLE_IDENTIFIER =
	/^-?(?:[A-Za-z_]|[\u0080-\uFFFF])(?:[\w-]|[\u0080-\uFFFF])*$/;

/**
 * Whether a string is one plain identifier, as a `@value` must be to name a class, at-rule or JS export.
 * @param {string} value candidate text, already trimmed
 * @returns {boolean} true when the whole string is one unescaped identifier
 */
const isSimpleIdentifier = (value) => SIMPLE_IDENTIFIER.test(value);

/**
 * Report a parse error to the running `parseA*` call's callback, once per offset and code.
 * @param {string} input input
 * @param {string} code parse-error code (kebab-case)
 * @param {number} start offset where the error starts
 * @param {number} end offset where the error ends
 * @param {ParseErrorSeverity} severity `"error"` when EOF cuts a token or rule short
 */
const reportParseError = (input, code, start, end, severity) => {
	if (S._parseError === undefined) return;
	const key = `${start}:${code}`;
	if (S._parseErrorsSeen.has(key)) return;
	S._parseErrorsSeen.add(key);
	S._parseError(input, code, start, end, severity);
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
 * CSS Syntax §4.3.7, entered at the `\` so a caller scanning raw source can
 * step over an escape without re-deriving what it spans.
 * @param {string} input input
 * @param {number} pos position of the `\`
 * @returns {number} position past the escape sequence
 */
const skipEscape = (input, pos) => consumeAnEscapedCodePoint(input, pos + 1);

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
 * instance per `TokenStream` (the lexer writes into it instead of allocating
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
 * escape. This is the one tokenizer entry point: `TokenStream#next` reuses a
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
	// `TokenStream#next`, whose own body then stays a cache test V8 inlines at
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
		// `/*...*/` is yielded as a token (`TokenStream#next` steps over it); any
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

// AST shape mirrors tabatkins/parse-css (the CSS Syntax Level 3 reference), with two deviations: nodes carry a `range` byte offset pair + a lazy `loc` getter, and have no methods beyond it.

/**
 * AST node / leaf-token `type` discriminators (spec name where it has one, else
 * parse-css's PascalCase). Numeric for the same reasons as the `TT_*` token
 * constants: a compact `Node#type` slot and integer `===` / `Map` keys on the
 * visitor hot path. Kept as a `NodeType` namespace (not bare constants) because
 * consumers reference members as `NodeType.AtRule`; exported so visitor maps
 * (`SourceProcessor#use`) and `CssParser` name nodes instead of a string
 * literal. A lexer token type never reaches a `Node#type`.
 * @type {{ Ident: 1, Function: 2, AtKeyword: 3, Hash: 4, String: 5, BadString: 6, Url: 7, BadUrl: 8, Delim: 9, Number: 10, Percentage: 11, Dimension: 12, Whitespace: 13, Colon: 14, Semicolon: 15, Comma: 16, RightParenthesis: 17, RightSquareBracket: 18, RightCurlyBracket: 19, CDO: 20, CDC: 21, SimpleBlock: 22, Declaration: 23, AtRule: 24, QualifiedRule: 25, Stylesheet: 26, Comment: 27, Raw: 28 }}
 */
const NodeType = {
	Ident: 1,
	Function: 2,
	AtKeyword: 3,
	Hash: 4,
	String: 5,
	BadString: 6,
	Url: 7,
	BadUrl: 8,
	Delim: 9,
	Number: 10,
	Percentage: 11,
	Dimension: 12,
	Whitespace: 13,
	Colon: 14,
	Semicolon: 15,
	Comma: 16,
	// Preserved tokens for stray closers / CDO / CDC (kept as component values per §5.4.8 "consume a token and return it").
	RightParenthesis: 17,
	RightSquareBracket: 18,
	RightCurlyBracket: 19,
	CDO: 20,
	CDC: 21,
	SimpleBlock: 22,
	Declaration: 23,
	AtRule: 24,
	QualifiedRule: 25,
	Stylesheet: 26,
	// Comments are never tree nodes; this type exists only so a `NodeType.Comment`
	// visitor can be registered (fired during tokenization - see `grammar`).
	Comment: 27,
	// Not a spec node but a workaround: §5.4 discards input a block's contents
	// reject, and keeping the source is what stops minifying from losing what the
	// unminified asset shows. Built while printing, so a walk never sees one.
	Raw: 28
};

// The node types the hot paths compare against: unoptimized code loads a
// `NodeType` member on every read, and a constant saves that load.
const NODE_TYPE_IDENT = NodeType.Ident;
const NODE_TYPE_FUNCTION = NodeType.Function;
const NODE_TYPE_HASH = NodeType.Hash;
const NODE_TYPE_STRING = NodeType.String;
const NODE_TYPE_URL = NodeType.Url;
const NODE_TYPE_DELIM = NodeType.Delim;
const NODE_TYPE_WHITESPACE = NodeType.Whitespace;
const NODE_TYPE_COLON = NodeType.Colon;
const NODE_TYPE_SIMPLE_BLOCK = NodeType.SimpleBlock;
const NODE_TYPE_DECLARATION = NodeType.Declaration;
const NODE_TYPE_AT_RULE = NodeType.AtRule;
const NODE_TYPE_QUALIFIED_RULE = NodeType.QualifiedRule;

/**
 * The parts of a node read with `field`, `fieldCount` and `fieldNamed`, named
 * as CSS Syntax §5 names them. All four are lists.
 * @type {{ prelude: 1, value: 2, declarations: 3, rules: 4 }}
 */
const Field = {
	// An at-rule's or qualified rule's component values before its block.
	prelude: 1,
	// A declaration's, function's or simple block's component values.
	value: 2,
	// A rule's block: its declarations, then the rules nested in it.
	declarations: 3,
	// A stylesheet's top-level rules, or the rules nested in a rule's block.
	rules: 4
};

/**
 * What `flag` answers: a declaration's `!important`, a number's `integer` type
 * flag and a hash's `id` type flag (CSS Syntax §4.2).
 * @type {{ important: 1, integer: 2, id: 4 }}
 */
const Flag = {
	important: 1,
	integer: 2,
	id: 4
};

/**
 * The parts of a node read with `rangeOf` and `textOf`.
 * @type {{ name: 1, value: 2, block: 3 }}
 */
const Part = {
	// An at-rule's (after the `@`), declaration's or function's name; a dimension's unit.
	name: 1,
	// A `url()`'s contents; a declaration's value, without its `!important`.
	value: 2,
	// A rule's `{...}` block.
	block: 3
};

/**
 * A node reference into the struct-of-arrays AST: an integer id indexing the
 * parallel columns, read through the exported accessor `A`. Refs are only valid
 * until the next parse, which reuses the columns, so consume a tree before then.
 * @typedef {number} CssNodeRef
 */

/** @typedef {CssNodeRef} Node */

/**
 * @param {string} s numeric text (no unit / `%`)
 * @returns {"integer" | "number"} the spec type flag
 */
const typeFlagOf = (s) =>
	s.includes(".") || s.includes("e") || s.includes("E") ? "number" : "integer";

/**
 * @param {number} i a number, percentage or dimension's index
 * @returns {boolean} whether its type flag is "integer"
 */
const isIntegerToken = (i) => {
	const v = valueOf(i);
	return (
		typeFlagOf(
			S._types[i] === NodeType.Dimension ? v.slice(0, consumeANumber(v, 0)) : v
		) === "integer"
	);
};

/**
 * @param {number} i a hash's index
 * @returns {boolean} whether its type flag is "id" (it would start an ident)
 */
const isIdHash = (i) => {
	const input = S._input;
	const p = S._starts[i] + 1;
	return ifThreeCodePointsWouldStartAnIdentSequence(
		input,
		p,
		input.charCodeAt(p),
		input.charCodeAt(p + 1),
		input.charCodeAt(p + 2)
	);
};

/**
 * @param {number} i a dimension's index
 * @returns {string} its unit, escapes resolved
 */
const unitOf = (i) => {
	const v = valueOf(i);
	const unit = v.slice(consumeANumber(v, 0));
	const ranOut = S._ends[i] === S._input.length;
	return unescapeIdentifier(ranOut ? resolveTrailingEscape(unit, false) : unit);
};

/**
 * @param {Node} n node
 * @returns {SimpleBlockToken} a simple block's opening bracket ("" for other nodes)
 */
const blockTokenOf = (n) => {
	const i = n;
	return S._types[i] === NodeType.SimpleBlock
		? /** @type {SimpleBlockToken} */ (S._input[S._starts[i]])
		: /** @type {SimpleBlockToken} */ ("");
};

/** @typedef {CssNodeRef} Token ref to a preserved token (CSS Syntax §5.4.8) */

// Spec "Assert: ..." preconditions are comments only (callers satisfy them); a future `strict` option could reinstate them as throws.

/** @typedef {CssNodeRef} FunctionNode ref to a function (CSS Syntax §5.4.10) */

/** @typedef {"[" | "(" | "{"} SimpleBlockToken */

/** @typedef {CssNodeRef} SimpleBlock ref to a simple block (CSS Syntax §5.4.9) */

/** @typedef {CssNodeRef} ComponentValue ref to a component value (CSS Syntax §5.4.8) */

/** @typedef {CssNodeRef} Rule ref to an at-rule or a qualified rule */

/** @typedef {CssNodeRef} Declaration ref to a declaration (CSS Syntax §5.4.6) */

/** @typedef {CssNodeRef} AtRule ref to an at-rule (CSS Syntax §5.4.2) */

/** @typedef {CssNodeRef} QualifiedRule ref to a qualified rule (CSS Syntax §5.4.3) */

/** @typedef {CssNodeRef} Stylesheet ref to a stylesheet (CSS Syntax §5.3.4) */

// Lexer-token-type to AST-node-type map. One `makeLeaf` call site, rather than
// a ~20-case switch allocating in each arm, keeps V8 monomorphic - the switch
// form showed up as generic stubs in profiles. URL carries extra state.
const ttToNodeType = new Uint8Array(27);
ttToNodeType[TT_WHITESPACE] = NodeType.Whitespace;
ttToNodeType[TT_IDENTIFIER] = NodeType.Ident;
ttToNodeType[TT_STRING] = NodeType.String;
ttToNodeType[TT_DELIM] = NodeType.Delim;
ttToNodeType[TT_NUMBER] = NodeType.Number;
ttToNodeType[TT_PERCENTAGE] = NodeType.Percentage;
ttToNodeType[TT_DIMENSION] = NodeType.Dimension;
ttToNodeType[TT_HASH] = NodeType.Hash;
ttToNodeType[TT_AT_KEYWORD] = NodeType.AtKeyword;
ttToNodeType[TT_BAD_STRING_TOKEN] = NodeType.BadString;
ttToNodeType[TT_BAD_URL_TOKEN] = NodeType.BadUrl;
ttToNodeType[TT_COLON] = NodeType.Colon;
ttToNodeType[TT_COMMA] = NodeType.Comma;
ttToNodeType[TT_SEMICOLON] = NodeType.Semicolon;
ttToNodeType[TT_RIGHT_PARENTHESIS] = NodeType.RightParenthesis;
ttToNodeType[TT_RIGHT_SQUARE_BRACKET] = NodeType.RightSquareBracket;
ttToNodeType[TT_RIGHT_CURLY_BRACKET] = NodeType.RightCurlyBracket;
ttToNodeType[TT_CDO] = NodeType.CDO;
ttToNodeType[TT_CDC] = NodeType.CDC;

// WHY: AST construction. Nodes live in one struct-of-arrays store - a node ref
// is an integer id into parallel typed-array columns - so nothing is allocated
// per node, and the `_make*` / `_set*` primitives below write those columns
// directly. The streaming `grammar` walks each top-level node and recycles the
// columns, while the `parseA*` entry points leave the whole tree in them until
// the next parse, read through `A`. Child lists are arrays of ids in both.

// WHY: the active skip state from `CssProcessOptions.skip`, applied by the
// grammar. `_skipTypes` is indexed by `NodeType`, dropping that component value
// from declaration value and function-arg lists, and the two prelude flags scan
// a rule's prelude without materializing its tree - url tokens and functions
// stay, so `url()` in a selector still resolves. A skipped node is still
// tokenized, keeping positions correct, but never pushed, so it is never walked
// or read: a caller must only skip what nothing reads. `parseA*` leave these at
// their no-skip defaults and build the full tree.
const NO_SKIP_TYPES = new Uint8Array(32);

// Scratch content-list pool: a container's value or prelude is built in a plain
// array, then sealed into the flat value buffer by `setValue`, which returns it
// to the pool. A list that is never sealed simply falls out of the pool.
/** @type {Node[][]} */
const listPool = [];
const takeList = () =>
	listPool.length > 0
		? /** @type {Node[]} */ (listPool.pop())
		: /** @type {Node[]} */ ([]);

// Released columns all share these: growth replaces a column before any write.
const EMPTY_U8 = new Uint8Array(0);
const EMPTY_I32 = new Int32Array(0);
const LIST_ITEMS_FLOOR = 2;

/**
 * The capacity a store grows to from `cap`: the next power of two or the next
 * one and a half times one, so a store ends at most half over what it holds.
 * @param {number} cap the capacity outgrown, at least 1
 * @returns {number} the next capacity up
 */
const nextCapacity = (cap) => {
	const power = 1 << (31 - Math.clz32(cap));
	const between = power + (power >> 1);
	return cap < between ? between : power * 2;
};

/** @param {number} need minimum flat-buffer capacity */
const growListItems = (need) => {
	let cap = S._listItems.length || 4096;
	if (S._listItemGrowHint > cap) cap = S._listItemGrowHint;
	S._listItemGrowHint = 0;
	while (cap < need) cap = nextCapacity(cap);
	const next = new Int32Array(cap);
	next.set(S._listItems);
	S._listItems = next;
};

/** @param {number} need minimum capacity */
const growNodeColumns = (need) => {
	let cap = S._nodeCapacity || 4096;
	if (S._nodeGrowHint > cap) cap = S._nodeGrowHint;
	S._nodeGrowHint = 0;
	while (cap < need) cap = nextCapacity(cap);
	const ty = new Uint8Array(cap);
	ty.set(S._types);
	S._types = ty;
	const st = new Int32Array(cap);
	st.set(S._starts);
	S._starts = st;
	const en = new Int32Array(cap);
	en.set(S._ends);
	S._ends = en;
	const a0 = new Int32Array(cap);
	a0.set(S._aux0);
	S._aux0 = a0;
	const a1 = new Int32Array(cap);
	a1.set(S._aux1);
	S._aux1 = a1;
	const fl = new Uint8Array(cap);
	fl.set(S._flags);
	S._flags = fl;
	const ls = new Int32Array(cap);
	ls.set(S._listStarts);
	S._listStarts = ls;
	const ll = new Int32Array(cap);
	ll.set(S._listLengths);
	S._listLengths = ll;
	const bi = new Int32Array(cap);
	bi.set(S._bodyIdx);
	S._bodyIdx = bi;
	S._nodeCapacity = cap;
};
/** @type {(type: number, start: number, end: number) => Node} */
const makeLeaf = (type, start, end) => {
	// Ids are 1-based, since a node ref is used in truthiness checks and 0 has to
	// stay "no node". Leaves never read the flag or list slots, which
	// `makeContainer` clears instead, keeping a leaf at three writes.
	const i = S._nodeCount + 1;
	if (i >= S._nodeCapacity) growNodeColumns(i + 1);
	S._types[i] = type;
	S._starts[i] = start;
	S._ends[i] = end;
	S._nodeCount = i;
	return i;
};
/** @type {(type: number, start: number, end: number) => Node} */
const makeContainer = (type, start, end) => {
	// `makeLeaf` written out: unoptimized code never inlines the call.
	const i = S._nodeCount + 1;
	if (i >= S._nodeCapacity) growNodeColumns(i + 1);
	S._types[i] = type;
	S._starts[i] = start;
	S._ends[i] = end;
	S._nodeCount = i;
	S._flags[i] = 0;
	// WHY: clearing the content-span length stops a reused id exposing a previous
	// node's children, and suffices because content lists are flat spans.
	// `blockStart` (aux1) is deliberately not defaulted: only at-rules and
	// qualified rules carry a block and they set it on every return path.
	// `blockEnd` is not stored at all - a block rule's `end` is its `blockEnd`.
	S._listLengths[i] = 0;
	// The body slot is read only for rules (the walk guards on type), so only
	// rules clear it - a recycled id must never expose a previous rule's body.
	if (type === NODE_TYPE_AT_RULE || type === NODE_TYPE_QUALIFIED_RULE) {
		S._bodyIdx[i] = 0;
	}
	return i;
};
// The types `makeContainer` builds, the only nodes whose list slots are
// written: a leaf's are a recycled id's leftovers, so it reads no children.
const HAS_CHILD_LIST = new Uint8Array(32);
// The types whose name slot (`_aux0`) holds where their name ends.
const HAS_NAME = new Uint8Array(32);
HAS_NAME[NodeType.AtRule] = 1;
HAS_NAME[NodeType.Declaration] = 1;
HAS_NAME[NodeType.Function] = 1;
for (const type of [
	NodeType.Stylesheet,
	NodeType.AtRule,
	NodeType.QualifiedRule,
	NodeType.Declaration,
	NodeType.SimpleBlock,
	NodeType.Function
]) {
	HAS_CHILD_LIST[type] = 1;
}
// The `Field` a type's child list is read as (0 for the types without one).
const LIST_FIELD = new Uint8Array(32);
LIST_FIELD[NodeType.Stylesheet] = Field.rules;
LIST_FIELD[NodeType.AtRule] = Field.prelude;
LIST_FIELD[NodeType.QualifiedRule] = Field.prelude;
LIST_FIELD[NodeType.Declaration] = Field.value;
LIST_FIELD[NodeType.SimpleBlock] = Field.value;
LIST_FIELD[NodeType.Function] = Field.value;

/**
 * A rule's block declarations as a fresh array; for the minifier and printer,
 * which reorder and merge them. Empty on a streamed block.
 * @param {Node} n node
 * @returns {Declaration[] | null} the declarations (null without a block)
 */
const declarationsOf = (n) => {
	const bi = S._bodyIdx[n];
	if (bi === 0) return null;
	/** @type {Declaration[]} */
	const decls = [];
	const length = S._listItems[bi];
	for (let k = 1; k <= length; k++) decls.push(S._listItems[bi + k]);
	return decls;
};

/**
 * The rules nested in a rule's block, as {@link declarationsOf} reads them.
 * @param {Node} n node
 * @returns {Rule[] | null} the rules (null without a block)
 */
const rulesOf = (n) => {
	const bi = S._bodyIdx[n];
	if (bi === 0) return null;
	/** @type {Rule[]} */
	const rules = [];
	const from = bi + 1 + S._listItems[bi];
	const to = from + S._listItems[bi - 1];
	for (let k = from; k < to; k++) rules.push(S._listItems[k]);
	return rules;
};

/**
 * @param {Node} n node
 * @returns {boolean} whether a declaration is `!important`
 */
const isImportant = (n) => (S._flags[n] & Flag.important) !== 0;

/**
 * The `declarationTable` number of the property a declaration's name spells:
 * case folded and escapes resolved; -1 custom, -2 a name it does not know.
 * @param {Node} n declaration
 * @returns {number} the spelling id, looked up on first read
 */
const spellingIdOf = (n) => {
	const i = n;
	if ((S._flags[i] & FLAG_PROPERTY_ID_READ) !== 0) return S._aux1[i];
	const id = S._input.startsWith("--", S._starts[i]) ? -1 : lookUpSpellingId(i);
	S._aux1[i] = id;
	S._flags[i] |= FLAG_PROPERTY_ID_READ;
	return id;
};

/**
 * A declaration's spelling id while `text` is still what it printed as, its
 * name unescaped. Compared by reference: the text is a rope, which reading it
 * by `charCodeAt` walks per call.
 * @param {Node} item a declaration of a block
 * @param {string} text its text as a pass now holds it, not empty
 * @param {PrintContext} writer the print context holding what each item printed
 * @returns {number} the spelling id, or -3 where only the text can say
 */
const ownSpellingId = (item, text, writer) => {
	const i = item;
	if (text !== writer.lookup(item)) return -3;
	const id = spellingIdOf(item);
	return (S._flags[i] & FLAG_NAME_ESCAPED) === 0 ? id : -3;
};

/**
 * `spellingIdOf` of a declaration not written `--`, read in place from the
 * input, so a name written without escapes allocates nothing.
 * @param {number} i the declaration's node id
 * @returns {number} the spelling id, -1 custom or -2 unknown
 */
const lookUpSpellingId = (i) => {
	const input = S._input;
	const start = S._starts[i];
	const end = S._aux0[i];
	const table = declarationTable();
	let hash = NAME_HASH_SEED;
	for (let at = start; at < end; at++) {
		const cc = input.charCodeAt(at);
		if (cc === CC_REVERSE_SOLIDUS || cc > 127) {
			const written = input.slice(start, end);
			if (written.includes("\\")) S._flags[i] |= FLAG_NAME_ESCAPED;
			return spellingIdOfName(table, written);
		}
		// `nameHashStep` written out: unoptimized code never inlines the call.
		hash = Math.imul(
			hash ^ (cc >= CC_UPPER_A && cc <= CC_UPPER_Z ? cc | 0x20 : cc),
			0x01000193
		);
	}
	const { slots, names } = table;
	const length = end - start;
	for (let slot = hash & table.mask; ; slot = (slot + 1) & table.mask) {
		const entry = slots[slot];
		if (entry === 0) return -2;
		const name = names[entry - 1];
		if (name.length !== length) continue;
		let at = 0;
		while (at < length) {
			const cc = input.charCodeAt(start + at);
			const folded = cc >= CC_UPPER_A && cc <= CC_UPPER_Z ? cc | 0x20 : cc;
			if (folded !== name.charCodeAt(at)) break;
			at++;
		}
		if (at === length) return entry - 1;
	}
};

/**
 * `lookUpSpellingId` for a name written with an escape or a non-ASCII character.
 * @param {DeclarationTable} table the numbering
 * @param {string} written the name as written
 * @returns {number} the spelling id, -1 custom or -2 unknown
 */
const spellingIdOfName = (table, written) => {
	const name = unescapeIdentifier(written);
	if (name.startsWith("--")) return -1;
	const id = table.ids.get(toLowerCaseIfNeeded(name));
	return id === undefined ? -2 : id;
};

// FNV-1a over a name's char codes, which `declarationTable` and
// `lookUpSpellingId` must agree on.
const NAME_HASH_SEED = 0x811c9dc5 | 0;
/** @type {(hash: number, cc: number) => number} */
const nameHashStep = (hash, cc) => Math.imul(hash ^ cc, 0x01000193);
// Raw token value (the lazy `Token.value` form): hash / at-keyword drop their
// one-char prefix, url uses its content range. Shared by the parser's
// mid-parse reads and the accessor.
/**
 * @param {number} i node id
 * @returns {string} raw token value
 */
const valueOf = (i) => {
	const ty = S._types[i];
	if (ty === NodeType.Hash || ty === NodeType.AtKeyword) {
		return S._input.slice(S._starts[i] + 1, S._ends[i]);
	}
	if (ty === NodeType.Url) return S._input.slice(S._aux0[i], S._aux1[i]);
	return S._input.slice(S._starts[i], S._ends[i]);
};
// Module-level constants (not per-parse closures), so each consume-algorithm
// call site keeps one function identity and stays monomorphic.
/** @type {(start: number, end: number, contentStart: number, contentEnd: number) => Node} */
const makeUrl = (start, end, cs, ce) => {
	const r = makeLeaf(NodeType.Url, start, end);
	S._aux0[r] = cs;
	S._aux1[r] = ce;
	return r;
};
/** @type {(start: number) => Node} */
const makeStylesheet = (start) =>
	makeContainer(NodeType.Stylesheet, start, start);
// Workaround node (see `NodeType.Raw`) from a non-whitespace token's start,
// trimmed of the trailing whitespace the block's own separators already cover -
// but for one after a lone `\`, which would otherwise escape what follows.
/** @type {(start: number, end: number) => Node} */
const makeRaw = (start, end) => {
	let to = end;
	while (isAsciiWhitespace(S._input.charCodeAt(to - 1))) to--;
	if (to < end && endsInLoneEscape(S._input.slice(start, to))) to++;
	return makeLeaf(NodeType.Raw, start, to);
};
// name / nameStart are derived from start + nameEnd; only nameEnd is stored.
/** @type {(r: Node, nameStart: number, nameEnd: number) => void} */
const setName = (r, ns, ne) => {
	S._aux0[r] = ne;
};
/** @type {(r: Node, v: number) => void} */
const setEnd = (r, v) => {
	S._ends[r] = v;
};
// `blockEnd` is not stored: for a block rule the parser sets `end` to the
// block end right after this (so `A.blockEnd` reads `end`); a `-1` blockStart
// marks the no-block forms, where `blockEnd` derives to `-1`.
/** @type {(r: Node, blockStart: number) => void} */
const setBlock = (r, bs) => {
	S._aux1[r] = bs;
};
/** @type {(r: Node) => void} */
const setImportant = (r) => {
	S._flags[r] |= Flag.important;
};
// A simple block's token is derived from its opening char on read.
/** @type {(r: Node, ch: SimpleBlockToken) => void} */
const setToken = (r, ch) => {};
/** @type {(r: Node, list: Node[]) => void} */
const setValue = (r, list) => {
	// Seal the finished list: copy its refs into the flat buffer and hand the
	// scratch array back to the pool. The caller never touches `list` again.
	const len = list.length;
	// Empty seal (common in non-modules skip mode, where value/prelude leaves are
	// dropped): `makeContainer` already left `_listLengths` at 0, so skip the flat
	// writes entirely and just recycle the scratch array.
	if (len !== 0) {
		const i = r;
		const start = S._listItemTop;
		if (start + len > S._listItems.length) growListItems(start + len);
		const items = S._listItems;
		// Copied by popping, last first, which empties it on the way: `length = 0`
		// drops the array's backing store, so every pooled list reallocates one
		// on its next push.
		for (let k = start + len - 1; k >= start; k--) {
			items[k] = /** @type {Node} */ (list.pop());
		}
		S._listItemTop = start + len;
		S._listStarts[i] = start;
		S._listLengths[i] = len;
	}
	listPool.push(list);
};
/** @type {(r: Node, body: number) => void} */
const setBody = (r, body) => {
	S._bodyIdx[r] = body + 1;
};

/**
 * Seal the children a block left on `_childStack` from `base` up into a body
 * record (see `_bodyIdx`), as `setValue` seals a value, and take them off the
 * stack. A block holding rules splits them from its declarations.
 * @param {number} base where the block's children start on the stack
 * @param {number} top where they end
 * @param {number} ruleCount how many of them are rules
 * @returns {void}
 */
const sealBody = (base, top, ruleCount) => {
	const count = top - base;
	const start = S._listItemTop;
	S._childTop = base;
	if (start + 2 + count > S._listItems.length) {
		growListItems(start + 2 + count);
	}
	const items = S._listItems;
	const stack = S._childStack;
	items[start] = ruleCount;
	items[start + 1] = count - ruleCount;
	if (ruleCount === 0) {
		for (let k = 0; k < count; k++) items[start + 2 + k] = stack[base + k];
	} else {
		let decl = start + 2;
		let rule = decl + count - ruleCount;
		for (let k = base; k < top; k++) {
			const id = stack[k];
			if (S._types[id] === NODE_TYPE_DECLARATION) items[decl++] = id;
			else items[rule++] = id;
		}
	}
	S._listItemTop = start + 2 + count;
	S._bcBody = start;
};

/**
 * Grow `_childStack` to hold at least one more declaration.
 * @returns {void}
 */
const growChildStack = () => {
	const next = new Int32Array(nextCapacity(S._childStack.length || 256));
	next.set(S._childStack);
	S._childStack = next;
};
/** @type {(r: Node) => number} */
const nodeTypeOf = (r) => S._types[r];
/** @type {(r: Node) => number} */
const nodeStartOf = (r) => S._starts[r];
/** @type {(r: Node) => string} */
const nodeValueOf = (r) => valueOf(r);
/** @type {(r: Node) => SimpleBlockToken} */
const nodeTokenOf = (r) =>
	/** @type {SimpleBlockToken} */ (S._input[S._starts[r]]);
// A container's value, a rule's prelude, and a stylesheet's rules all seal into
// the one content-list writer, so `setPrelude` / `setRules` are named views of
// `setValue` that keep the consume algorithms reading in spec terms.
const setPrelude = setValue;
const setRules = setValue;

/**
 * Start a parse into the store: point it at this source, reset the node /
 * flat cursors so nodes accumulate from id 1, and clear skip state (`grammar`
 * sets its own afterwards; `parseA*` leave it off to build the full tree).
 * @param {string} input source
 * @param {LocConverter} lc loc converter
 * @param {CssParseOptions["parseError"]=} parseError parse-error callback; `parseA*` clear it when the parse ends
 * @param {string=} originalInput the source before its NULs read as U+FFFD, which `source` and `textOf` slice
 */
const setupParse = (input, lc, parseError, originalInput = input) => {
	S._parseError = parseError;
	if (S._parseErrorsSeen.size > 0) S._parseErrorsSeen.clear();
	S._input = input;
	S._originalInput = originalInput;
	S._openCommentStart = -1;
	S._locConverter = lc;
	S._nodeCount = 0;
	S._listItemTop = LIST_ITEMS_FLOOR;
	// A parse that threw left its open blocks' children behind.
	S._childTop = 0;
	// WHY: its columns are held until here too, and only a walk hands large ones
	// back when it ends. An input makes a node a character at most and growth at
	// most doubles, so columns over four times this input's length are ones it
	// could not have grown: another input's, released rather than kept for good.
	const reach = 4 * input.length;
	if (S._nodeCapacity > SHRINK_CAPACITY && S._nodeCapacity > reach) {
		S._nodeCapacity = 0;
		releaseColumns();
	}
	if (S._listItems.length > SHRINK_CAPACITY && S._listItems.length > reach) {
		S._listItems = EMPTY_I32;
	}
	S._skipTypes = NO_SKIP_TYPES;
	S._skipActive = false;
	S._skipSelectorPrelude = false;
	S._skipAtRulePrelude = false;
	// Only `grammar` re-enables it (after this call); the standalone `parseA*`
	// entry points never print, so they must not inherit a previous parse's flag.
	S._printing = false;
	// A visitor throw or `stop()` mid-walk can leave a count set; never carry it over.
	S._within.fill(0);
	S._frameWithin.fill(0);
	S._inSupportsPrelude = false;
	S._inSupportsSelector = false;
	S._inStyleAttribute = false;
	S._inMediaConditionPrelude = false;
	S._inAtRulePrelude = false;
	S._inPropertyRule = false;
	S._inFunctionRule = false;
	S._inFeatureValuesRule = false;
	S._inCustomProperty = false;
	S._inSubstitutedValue = false;
	S._inColorOperand = false;
	S._foldingColorChannel = false;
	S._substitutionSpanFrom = -1;
	S._substitutionSpanTo = -1;
	S._substitutionSpanHas = false;
	S._substitutionSearchFrom = -1;
	S._substitutionSearchOpening = -1;
	S._escapeSearchFrom = -1;
	S._escapeSearchAt = -1;
	S._mathFunctionDepth = 0;
	S._steppedFunctionDepth = 0;
	S._convertLengthUnits = false;
	S._assumeUtf8 = false;
	S._convertApproximateColors = false;
	S._unusedSymbols = null;
	S._unusedRules = null;
	S._pseudoClasses = null;
	S._mergingDistantRules = false;
	// Cleared rather than replaced: the print's own `finally` empties them, so
	// this is the belt to that brace and allocates nothing per parse.
	S._distantRules.clear();
	S._distantSelectors.clear();
	S._distantAtRules.clear();
	S._distantAtRuleFolded = false;
	S._lentPiece = null;
	S._lentPieces = new Set();
	S._deferredKeySpan = null;
	S._deferredKeyTaken = null;
	S._distantDeclaredAt.clear();
	S._distantTypedDeclaredAt.clear();
	S._distantTypeDeclaredAt.clear();
	S._distantSeq = 0;
	S._transforms = DEFAULT_TRANSFORMS;
	S._keyframeRenames = null;
	S._zIndexRenames = null;
	S._commentsKept = "some";
	S._rewriteCustomProperties = false;
	S._openCustomValue = null;
	S._eofPrinted = "";
	S._eofOpen = "";
	S._dropOverriddenDeclarations = false;
	S._unitScale = ABSOLUTE_UNIT_SCALE;
	// Back to what the module loads with, so no parse inherits a target of its own.
	S._hexAlphaAllowed = true;
	S._doublePositionAllowed = true;
	S._displayTwoValuesAllowed = true;
	S._systemUiAllowed = true;
	S._textDecorationColorStyleAllowed = true;
	S._textDecorationThicknessAllowed = true;
	S._oldTokenizer = false;
	S._tridentTarget = false;
	S._colorFunctionAllowed = true;
	S._colorMixAllowed = true;
	S._hwbColorsAllowed = true;
	S._labColorsAllowed = true;
	S._lightDarkAllowed = true;
	S._whereSelectorAllowed = true;
	S._dirSelectorAllowed = true;
	S._nestingAllowed = true;
	S._customMediaAllowed = true;
	S._loweringNesting = false;
	S._pendingNested.length = 0;
	S._rulesPrecede = null;
	S._customMedia.clear();
	S._customSelectors.clear();
	S._customAtRulesFixed =
		S._customAtRulesSeed !== null && !S._collectingCustomAtRules;
	if (S._customAtRulesSeed !== null) {
		for (const [name, query] of S._customAtRulesSeed.media) {
			S._customMedia.set(name, query);
		}
		for (const [name, list] of S._customAtRulesSeed.selectors) {
			S._customSelectors.set(name, list);
		}
		S._customAtRulesSeed = null;
	}
	S._isSelectorAllowed = true;
	S._langArgumentListAllowed = true;
	S._notSelectorListAllowed = true;
	S._loweringLightDark = false;
	S._lightDarkUsed = false;
	S._layersGathered = false;
	S._charsetPiece = -1;
	S._oklabColorsAllowed = true;
	S._colorFallbacksNeeded = false;
	S._insetShorthandAllowed = true;
	S._rangeSpellingAllowed = true;
	S._placeShorthandAllowed = true;
	// Only printing reads it, so `grammar` scans for a `@namespace` then.
	S._namespacePrologueOpen = false;
	// Read only while lowering `light-dark()`, which is where it is computed.
	S._sourceNamesLightDark = false;
	S._overflowTwoValuesAllowed = true;
	S._valueDeclaration = null;
	S._keywordOnlyFor = null;
	S._keywordOnly = false;
};

/**
 * Materialize a single non-block, non-function lexer token as its leaf AST node - the spec's "consume a token" result (§5.4.8 "anything else"), preserving stray closers / CDO / CDC.
 * @param {MutableToken} t token from the lexer
 * @returns {Node} the leaf token node
 */
const tokenToNode = (t) => {
	const tt = t.type;
	// URL is the only leaf with own state (its content range); all others are a
	// plain leaf whose node type comes from the map.
	if (tt === TT_URL) {
		const ut = /** @type {CssUrlToken} */ (t);
		return makeUrl(t.start, t.end, ut.contentStart, ut.contentEnd);
	}
	return makeLeaf(ttToNodeType[tt], t.start, t.end);
};

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
class TokenStream {
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
					input.charCodeAt(t.end - 1) !== CC_SOLIDUS)
			) {
				S._openCommentStart = t.start;
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
 * Preprocess the input stream, CSS Syntax 3
 * [§3.3](https://drafts.csswg.org/css-syntax/#input-preprocessing): a NUL
 * stands for the replacement character, which - unlike a NUL - is an ident code
 * point, so `a\0b` is the one identifier `a\uFFFDb` rather than three tokens.
 * @param {string} input source text
 * @returns {string} the text the tokenizer reads
 */
const preprocessInputStream = (input) =>
	// WHY: §3.3 names surrogates alongside NUL, and they are left as written.
	// A lone one is an ident code point here, so it tokenizes to the same stream
	// the replacement character does - measured over every context one can sit
	// in - and encoding the asset as UTF-8 writes it out as that character. The
	// range test that would find one costs 3% of the walk, for no difference.
	!input.includes("\u0000") ? input : input.split("\u0000").join("\uFFFD");

/**
 * Normalize a `parse*` entry point's first argument into a `TokenStream`
 * (CSS Syntax §9 "normalize into a token stream"). An existing `TokenStream`
 * is returned as-is (consumed from its current position - it already carries
 * the shared `LocConverter` and comment hook), so `pos` / `onComment` are
 * ignored. A raw source string is tokenized from `pos` with a fresh
 * `LocConverter`; pass a `TokenStream` instead to share one converter across
 * sub-parses.
 * @param {string | TokenStream} input source string or an existing stream
 * @param {number=} pos start byte offset (string input only; default `0`)
 * @param {((input: string, start: number, end: number) => number)=} onComment comment callback (string input only)
 * @returns {TokenStream} the stream to consume from
 */
const normalizeIntoTokenStream = (input, pos, onComment) => {
	if (input instanceof TokenStream) return input;
	// The replacement is one code unit for one, so every offset a caller already
	// holds - a `LocConverter` among them - still names what it named.
	const text = preprocessInputStream(input);
	return new TokenStream(
		text,
		pos || 0,
		new LocConverter(text, "css"),
		onComment
	);
};

// === Parser entry points (CSS Syntax Level 3 §5.3) ===

// Each `parseA*` wraps a `consumeA*` algorithm from §5.4, taking raw source and
// a start position in place of the spec's "normalize into a token stream". The
// split mirrors tabatkins/parse-css, `consume*` driving the tokenizer.

/**
 * @typedef {object} CssParseOptions
 * @property {((input: string, start: number, end: number) => number)=} comment optional comment-token callback (string input only); the public `parse*` entry points use it to build the `TokenStream` so the outer parser's comment tracker still sees magic comments inside the consumed range
 * @property {((input: string, code: string, start: number, end: number, severity: ParseErrorSeverity) => void)=} parseError optional callback for each parse error of the tokenizer (CSS Syntax Level 3 §4) and parser (§5), with the same signature as the HTML tokenizer's; `severity` is `"error"` when EOF cuts a token or rule short and `"warning"` otherwise
 */

/**
 * Hand the node columns back: each is replaced by an empty view, so what this
 * parse grew is collectable and every column goes together - one place to add
 * a new one to, rather than two that have to agree.
 * @returns {void}
 */
const releaseColumns = () => {
	S._types = EMPTY_U8;
	S._starts = EMPTY_I32;
	S._ends = EMPTY_I32;
	S._aux0 = EMPTY_I32;
	S._aux1 = EMPTY_I32;
	S._flags = EMPTY_U8;
	S._listStarts = EMPTY_I32;
	S._listLengths = EMPTY_I32;
	S._bodyIdx = EMPTY_I32;
	S._childStack = EMPTY_I32;
	clearRuleEntries();
	S._ruleEntries = [];
	S._hoistedRuns = [];
};

/**
 * Refuse a direct parse while a `grammar` run is active: its nodes are read
 * through `A`, which reads the tree that run is walking, so the parse would
 * overwrite it. `process` gives a nested run a tree of its own.
 * @param {string} name the entry that was called
 * @returns {never} nothing; it always throws
 */
const refuseDuringRun = (name) => {
	throw new Error(
		`css syntax: ${name} was called during a CSS process run; nest the work with a SourceProcessor process instead`
	);
};

/**
 * Parse a stylesheet, CSS Syntax Level 3
 * [§5.3.4](https://drafts.csswg.org/css-syntax/#parse-stylesheet).
 * @param {string | TokenStream} input source string or an existing token stream
 * @param {number=} pos start position (string input only)
 * @param {CssParseOptions=} options comment and parse-error callbacks (see `CssParseOptions`)
 * @returns {Stylesheet} the parsed stylesheet
 */
const parseAStylesheet = (input, pos = 0, options = {}) => {
	if (grammarDepth !== 0) refuseDuringRun("parseAStylesheet");
	// 1. If input is a byte stream for a stylesheet, decode bytes from input, and set input to the result.
	// 2. Normalize input, and set input to the result.
	const ts = normalizeIntoTokenStream(input, pos, options.comment);
	setupParse(
		ts.input,
		ts.locConverter,
		options.parseError,
		typeof input === "string" ? input : ts.input
	);
	try {
		// 3. Create a new stylesheet, with its location set to location (or null, if location was not passed).
		const start = ts.next().start;
		const stylesheet = makeStylesheet(start);
		// 4. Consume a stylesheet's contents from input, and set the stylesheet's rules to the result.
		setRules(stylesheet, consumeAStylesheetsContents(ts));
		setEnd(stylesheet, ts.next().start);
		// 5. Return the stylesheet.
		return stylesheet;
	} finally {
		S._parseError = undefined;
	}
};

/**
 * Parse a stylesheet's contents, CSS Syntax Level 3
 * [§5.3.5](https://drafts.csswg.org/css-syntax/#parse-stylesheets-contents) -
 * the top-level rule list via `consumeAStylesheetsContents` (§5.4.1): top-level
 * declarations are parse errors (never produced) and top-level CDO (`<!--`) /
 * CDC (`-->`) tokens are discarded.
 * @param {string | TokenStream} input source string or an existing token stream
 * @param {number=} pos start position (string input only)
 * @param {CssParseOptions=} options comment and parse-error callbacks (see `CssParseOptions`)
 * @returns {Rule[]} top-level rules
 */
const parseAStylesheetsContents = (input, pos = 0, options = {}) => {
	if (grammarDepth !== 0) refuseDuringRun("parseAStylesheetsContents");
	// 1. Normalize input, and set input to the result.
	const ts = normalizeIntoTokenStream(input, pos, options.comment);
	setupParse(
		ts.input,
		ts.locConverter,
		options.parseError,
		typeof input === "string" ? input : ts.input
	);
	try {
		// 2. Consume a stylesheet's contents from input, and return the result.
		return consumeAStylesheetsContents(ts);
	} finally {
		S._parseError = undefined;
	}
};

/**
 * Parse a block's contents, CSS Syntax Level 3
 * [§5.3.6](https://drafts.csswg.org/css-syntax/#parse-block-contents).
 * @param {string | TokenStream} input source string or an existing token stream
 * @param {number=} pos start position (string input only; just past the opening `{`, or 0)
 * @param {CssParseOptions=} options comment and parse-error callbacks (see `CssParseOptions`)
 * @returns {{ decls: Declaration[], rules: Rule[] }} block decls + rules
 */
const parseABlocksContents = (input, pos = 0, options = {}) => {
	if (grammarDepth !== 0) refuseDuringRun("parseABlocksContents");
	// 1. Normalize input, and set input to the result.
	const ts = normalizeIntoTokenStream(input, pos, options.comment);
	setupParse(
		ts.input,
		ts.locConverter,
		options.parseError,
		typeof input === "string" ? input : ts.input
	);
	try {
		// 2. Consume a block's contents from input, and return the result.
		const { decls, rules } = consumeABlocksContents(ts);
		return { decls, rules };
	} finally {
		S._parseError = undefined;
	}
};

/**
 * Parse a rule, CSS Syntax Level 3
 * [§5.3.7](https://drafts.csswg.org/css-syntax/#parse-rule) - discards leading
 * whitespace, consumes one at-rule / qualified rule, and requires only trailing
 * whitespace; `undefined` (syntax error) otherwise.
 * @param {string | TokenStream} input source string or an existing token stream
 * @param {number=} pos start position (string input only)
 * @param {CssParseOptions=} options comment and parse-error callbacks (see `CssParseOptions`)
 * @returns {Rule | undefined} the parsed rule
 */
const parseARule = (input, pos = 0, options = {}) => {
	if (grammarDepth !== 0) refuseDuringRun("parseARule");
	// 1. Normalize input, and set input to the result.
	const ts = normalizeIntoTokenStream(input, pos, options.comment);
	setupParse(
		ts.input,
		ts.locConverter,
		options.parseError,
		typeof input === "string" ? input : ts.input
	);
	try {
		// 2. Discard whitespace from input.
		while (ts.next().type === TT_WHITESPACE) ts.advance();
		// 3. An <EOF-token> is a syntax error; an <at-keyword-token> consumes an
		// at-rule and anything else a qualified rule. Nothing, or an invalid rule
		// error, is a syntax error too.
		const head = ts.next();
		if (head.type === TT_EOF) return undefined;
		const rule =
			head.type === TT_AT_KEYWORD
				? consumeAnAtRule(ts)
				: consumeAQualifiedRule(ts);
		if (!rule) return undefined;
		// 4. Discard whitespace from input.
		while (ts.next().type === TT_WHITESPACE) ts.advance();
		// 5. If the next token from input is an <EOF-token>, return rule. Otherwise, return a syntax error.
		return ts.next().type === TT_EOF ? rule : undefined;
	} finally {
		S._parseError = undefined;
	}
};

/**
 * Parse a declaration, CSS Syntax Level 3
 * [§5.3.8](https://drafts.csswg.org/css-syntax/#parse-declaration).
 * @param {string | TokenStream} input source string or an existing token stream
 * @param {number=} pos start position (string input only)
 * @param {CssParseOptions=} options comment and parse-error callbacks (see `CssParseOptions`)
 * @returns {Declaration | undefined} the parsed declaration, or undefined
 */
const parseADeclaration = (input, pos = 0, options = {}) => {
	if (grammarDepth !== 0) refuseDuringRun("parseADeclaration");
	// 1. Normalize input, and set input to the result.
	const ts = normalizeIntoTokenStream(input, pos, options.comment);
	setupParse(
		ts.input,
		ts.locConverter,
		options.parseError,
		typeof input === "string" ? input : ts.input
	);
	try {
		// 2. Discard whitespace from input.
		while (ts.next().type === TT_WHITESPACE) ts.advance();
		// 3. Consume a declaration from input. If anything was returned, return it. Otherwise, return a syntax error.
		const decl = consumeADeclaration(ts);
		return decl;
	} finally {
		S._parseError = undefined;
	}
};

/**
 * Parse a component value, CSS Syntax Level 3 [§5.3.9](https://drafts.csswg.org/css-syntax/#parse-component-value) - strict entry point that consumes one value and returns `undefined` if non-whitespace input trails (use `consumeAComponentValue` for "one value, ignore the rest").
 * @param {string | TokenStream} input source string or an existing token stream
 * @param {number=} pos start position (string input only)
 * @param {CssParseOptions=} options comment and parse-error callbacks (see `CssParseOptions`)
 * @returns {ComponentValue | undefined} the parsed component value, or `undefined` on empty / trailing-garbage input
 */
const parseAComponentValue = (input, pos = 0, options = {}) => {
	if (grammarDepth !== 0) refuseDuringRun("parseAComponentValue");
	// 1. Normalize input, and set input to the result.
	const ts = normalizeIntoTokenStream(input, pos, options.comment);
	setupParse(
		ts.input,
		ts.locConverter,
		options.parseError,
		typeof input === "string" ? input : ts.input
	);
	try {
		// 2. Discard whitespace from input.
		while (ts.next().type === TT_WHITESPACE) ts.advance();
		// 3. If input is empty, return a syntax error.
		if (ts.next().type === TT_EOF) return undefined;
		// 4. Consume a component value from input and let value be the return value.
		const result = consumeAComponentValue(ts);
		// 5. Discard whitespace from input.
		while (ts.next().type === TT_WHITESPACE) ts.advance();
		// 6. If input is empty, return value. Otherwise, return a syntax error.
		return ts.next().type === TT_EOF ? result : undefined;
	} finally {
		S._parseError = undefined;
	}
};

/**
 * Parse a list of component values, CSS Syntax Level 3
 * [§5.3.10](https://drafts.csswg.org/css-syntax/#parse-list-of-components).
 * @param {string | TokenStream} input source string or an existing token stream
 * @param {number=} pos start position (string input only)
 * @param {CssParseOptions=} options comment and parse-error callbacks (see `CssParseOptions`)
 * @returns {ComponentValue[]} component values
 */
const parseAListOfComponentValues = (input, pos = 0, options = {}) => {
	if (grammarDepth !== 0) refuseDuringRun("parseAListOfComponentValues");
	// 1. Normalize input, and set input to the result.
	const ts = normalizeIntoTokenStream(input, pos, options.comment);
	setupParse(
		ts.input,
		ts.locConverter,
		options.parseError,
		typeof input === "string" ? input : ts.input
	);
	try {
		// 2. Consume a list of component values from input, and return the result.
		// (`null` needs `bailOnCurly`, which is not passed here.)
		return /** @type {ComponentValue[]} */ (consumeAListOfComponentValues(ts));
	} finally {
		S._parseError = undefined;
	}
};

/**
 * Parse a comma-separated list of component values, CSS Syntax Level 3 [§5.3.11](https://drafts.csswg.org/css-syntax/#parse-comma-list) - consumes one `<comma-token>`-stopped group of component values per iteration until EOF.
 * @param {string | TokenStream} input source string or an existing token stream
 * @param {number=} pos start position (string input only)
 * @param {CssParseOptions=} options comment and parse-error callbacks (see `CssParseOptions`)
 * @returns {ComponentValue[][]} comma-separated groups of component values
 */
const parseACommaSeparatedListOfComponentValues = (
	input,
	pos = 0,
	options = {}
) => {
	if (grammarDepth !== 0) {
		refuseDuringRun("parseACommaSeparatedListOfComponentValues");
	}
	// 1. Normalize input, and set input to the result.
	const ts = normalizeIntoTokenStream(input, pos, options.comment);
	setupParse(
		ts.input,
		ts.locConverter,
		options.parseError,
		typeof input === "string" ? input : ts.input
	);
	try {
		// 2. Let groups be an empty list.
		/** @type {Node[][]} */
		const groups = [];
		// 3. While input is not empty:
		while (ts.next().type !== TT_EOF) {
			// 3.1. Consume a list of component values from input, with <comma-token> as the stop token, and append the result to groups.
			groups.push(
				/** @type {Node[]} */ (consumeAListOfComponentValues(ts, TT_COMMA))
			);
			// 3.2 Discard a token from input.
			ts.discard();
		}
		// 4. Return groups.
		return groups;
	} finally {
		S._parseError = undefined;
	}
};

// === Parser algorithms (CSS Syntax Level 3 §5.4) ===

// The mutually-recursive consume algorithms the `parse*` entry points drive:
// each reads a `TokenStream` and reuses `consumeAComponentValue` for nested
// values, mirroring tabatkins/parse-css.

/**
 * Consume a stylesheet's contents, CSS Syntax Level 3 [§5.4.1](https://drafts.csswg.org/css-syntax/#consume-stylesheet-contents) - the top-level rule list: whitespace and CDO (`<!--`) / CDC (`-->`) tokens are discarded, an at-keyword starts an at-rule, and anything else starts a qualified rule (so top-level declarations are parse errors and never produced).
 *
 * `onRule` is a webpack extension to the algorithm's output: when given, each
 * consumed rule is handed to it immediately and not collected, so the walker can
 * process one top-level rule at a time without materializing the whole
 * stylesheet (the returned list is then empty). When omitted the rules are
 * collected and returned as the spec specifies.
 * @param {TokenStream} ts token stream
 * @param {((rule: Rule) => void)=} onRule optional per-rule sink (streaming); rules are not collected when given
 * @returns {Rule[]} top-level rules (empty when `onRule` is given)
 */
const consumeAStylesheetsContents = (ts, onRule) => {
	// Let rules be an initially empty list of rules.
	// From the pool, as `parseAStylesheet` seals it into the pool: a list sealed
	// that was not taken would leave the pool one longer after every parse.
	/** @type {Rule[]} */
	const rules = takeList();

	// Process input
	for (;;) {
		ts.skipWhitespace();
		const tt = ts.next().type;
		// <whitespace-token> / <CDO-token> / <CDC-token>
		// Discard a token from input.
		if (tt === TT_WHITESPACE || tt === TT_CDO || tt === TT_CDC) {
			ts.discard();
		}
		// <EOF-token>
		// Return rules.
		else if (tt === TT_EOF) {
			return rules;
		}
		// <at-keyword-token>
		// Consume an at-rule from input. If anything is returned, append it to rules.
		// (Every at-rule is valid here, so one is always returned.)
		else if (tt === TT_AT_KEYWORD) {
			const at = consumeAnAtRule(ts);
			if (onRule) onRule(at);
			else rules.push(at);
		}
		// anything else
		// Consume a qualified rule from input. If a rule is returned, append it to rules.
		else {
			const rule = consumeAQualifiedRule(ts);
			if (rule) {
				if (onRule) onRule(rule);
				else rules.push(rule);
			}
		}
	}
};

/**
 * Consume an at-rule, CSS Syntax Level 3 [§5.4.2](https://drafts.csswg.org/css-syntax/#consume-at-rule) - the next token must be an <at-keyword-token> (asserted); consumes the prelude up to `;` / `{` / `}` / EOF; `{` consumes the block (§5.4.4) onto `.block`, `;` / EOF is discarded, a top-level `}` (when not `nested`) is appended via `consumeAComponentValue`.
 * @param {TokenStream} ts token stream
 * @param {boolean=} nested true inside a `{}` block - a top-level `}` ends the at-rule (left for the caller)
 * @returns {AtRule} the parsed at-rule
 */
const consumeAnAtRule = (ts, nested = false) => {
	// Assert (spec): the next token is an <at-keyword-token>.
	// Consume a token from input, and let rule be a new at-rule with its name set to the returned token's value, its prelude initially set to an empty list, and no declarations or child rules.
	const head = ts.consume();
	const rule = makeContainer(NodeType.AtRule, head.start, head.end);
	setName(rule, head.start, head.end);
	// Sealed (`setPrelude`) at each return - the store consumes the
	// scratch array when sealing, so it must be complete by then.
	const prelude = takeList();
	// declarations / childRules stay null (no block); the `;` / EOF / nested-`}`
	// forms set blockStart / blockEnd to -1 explicitly at their return below.

	// Like `consumeAQualifiedRule`: skip mode scans the prelude without
	// materializing it (url tokens / functions kept so `@import url(...)` still
	// resolves); the block boundary is found by scanning, not the prelude nodes.
	const skip = S._skipAtRulePrelude;

	// Process input
	for (;;) {
		const t = ts.next();

		// <semicolon-token>
		// <EOF-token>
		// Discard a token from input. If rule is valid in the current context, return it; otherwise return nothing.
		if (t.type === TT_SEMICOLON || t.type === TT_EOF) {
			ts.discard();
			setPrelude(rule, prelude);
			setBlock(rule, -1);
			setEnd(rule, t.start);
			return rule;
		}
		// <}-token>
		// If nested is true: if rule is valid in the current context, return it; otherwise return nothing.
		// Otherwise, consume a token and append the result to rule's prelude.
		else if (t.type === TT_RIGHT_CURLY_BRACKET) {
			if (nested) {
				setPrelude(rule, prelude);
				setBlock(rule, -1);
				setEnd(rule, t.start);
				return rule;
			}
			const node = consumeATokenAsNode(ts);
			if (!skip) prelude.push(node);
			continue;
		}
		// <{-token>
		// Consume a block from input, and assign the result to rule's declarations and child rules.
		else if (t.type === TT_LEFT_CURLY_BRACKET) {
			setPrelude(rule, prelude);
			if (S._streamBlocks) {
				streamConsumeBlock(ts, rule);
				return rule;
			}
			consumeABlock(ts);
			setBody(rule, S._blockBody);
			setBlock(rule, S._blockStart);
			setEnd(rule, S._blockEnd);
			return rule;
		}

		// anything else
		// Consume a component value from input and append the returned value to rule's prelude.
		const node = consumeAComponentValue(ts, t);
		if (!skip) {
			prelude.push(node);
		} else if (
			nodeTypeOf(node) === NodeType.Function ||
			nodeTypeOf(node) === NodeType.Url
		) {
			prelude.push(node);
		}
	}
};

/**
 * Consume a token (CSS Syntax §3 "consume a token"): advance past the next
 * token and return it as a leaf AST node. Used directly where the spec says
 * "consume a token from input" (e.g. the parse-error branches in §5.4.7 /
 * §5.4.2 / §5.4.3), distinct from `consumeAComponentValue` which would recurse
 * into a simple block / function.
 * @param {TokenStream} ts token stream
 * @returns {Token} the consumed token as a leaf node
 */
const consumeATokenAsNode = (ts) => {
	const t = ts.consume();
	return tokenToNode(t);
};

/**
 * Consume a qualified rule, CSS Syntax Level 3 [§5.4.3](https://drafts.csswg.org/css-syntax/#consume-qualified-rule) - consumes the prelude (each component value via `consumeAComponentValue`) up to its `{` block; EOF, the optional `stopToken`, or a nested top-level `}` is a parse error returning nothing (the block-less prelude is dropped), while a non-nested top-level `}` is consumed as a parse error and the prelude continues. A returned rule always has a block.
 * @param {TokenStream} ts token stream
 * @param {number=} stopToken token type that ends the prelude (parse error -> nothing)
 * @param {boolean=} nested true inside a `{}` block - a top-level `}` ends the rule (left for the caller)
 * @returns {QualifiedRule | undefined} parsed qualified rule, or `undefined` on a parse error
 */
const consumeAQualifiedRule = (ts, stopToken, nested = false) => {
	const start = ts.next().start;
	// Let rule be a new qualified rule with its prelude, declarations, and child rules all initially set to empty lists.
	const rule = makeContainer(NODE_TYPE_QUALIFIED_RULE, start, start);
	// Sealed by `setPrelude` at the `{` exit, the only path returning the rule;
	// a parse-error exit abandons the scratch unsealed. Allocated on first push,
	// since skip mode usually pushes nothing and a null prelude reads as empty.
	/** @type {Node[] | null} */
	let prelude = null;
	// A returned qualified rule always has a block (only the `{` exit returns a
	// rule), so `setBlock` always runs - no blockStart / blockEnd default needed.

	// Skip mode leaves `prelude` empty (selector text is recovered from the
	// rule's byte range, not its nodes); `first`/`second` still track the first
	// two non-whitespace tokens the `--foo: {` disambiguation below needs.
	const skip = S._skipSelectorPrelude;
	// Non-skip: first two non-whitespace prelude nodes (computed at the `{`).
	let first = /** @type {Node | number} */ (0);
	let second = /** @type {Node | number} */ (0);
	// Skip mode: the same two tokens tracked by token type + start, so a dropped
	// leaf selector token needs no materialized node just for the disambiguation.
	// `0` (no token type) = unset.
	let firstTT = 0;
	let firstStart = 0;
	let firstEnd = 0;
	let secondTT = 0;

	// Process input
	for (;;) {
		// Past the two tokens the `--foo: {` disambiguation reads, a skip-mode
		// prelude drops every leaf it consumes, so step over the run of them in
		// bytes rather than lexing each one only to advance past it.
		if (skip && secondTT !== 0) ts.skipPreludeLeaves();
		const t = ts.next();
		const tt = t.type;
		// <EOF-token>
		// stop token (if passed)
		// This is a parse error. Return nothing.
		if (tt === TT_EOF || tt === stopToken) {
			if (tt === TT_EOF) {
				reportParseError(
					ts.input,
					"eof-in-qualified-rule",
					t.start,
					t.end,
					"error"
				);
			} else {
				reportParseError(
					ts.input,
					"missing-qualified-rule-block",
					t.start,
					t.end,
					"warning"
				);
			}
			return undefined;
		}
		// <}-token>
		// This is a parse error. If nested is true, return nothing. Otherwise, consume a token and append the result to rule's prelude.
		else if (tt === TT_RIGHT_CURLY_BRACKET) {
			reportParseError(
				ts.input,
				"unexpected-right-curly-bracket",
				t.start,
				t.end,
				"warning"
			);
			if (nested) return undefined;
			if (skip) {
				// Stray `}` is a non-ws token; record its type/start, drop the node.
				if (firstTT === 0) {
					firstTT = tt;
					firstStart = t.start;
				} else if (secondTT === 0) {
					secondTT = tt;
				}
				ts.advance();
			} else {
				(prelude || (prelude = takeList())).push(consumeATokenAsNode(ts));
			}
			continue;
		}
		// <{-token>: a prelude opening with a `--` <ident-token> and a <colon-token>
		// returns nothing, which is what tells `--foo: { ... }` from a nested rule.
		// Anything else consumes a block as the child rules.
		else if (tt === TT_LEFT_CURLY_BRACKET) {
			// `--foo: {` disambiguation: are the first two non-ws prelude tokens an
			// ident starting with `--` followed by a colon? Skip mode reads the
			// tracked token type/start; non-skip reads the materialized prelude.
			let dashedDeclaration;
			if (skip) {
				dashedDeclaration =
					firstTT === TT_IDENTIFIER &&
					identStartsWithDashes(ts.input, firstStart, firstEnd) &&
					secondTT === TT_COLON;
			} else if (prelude === null) {
				dashedDeclaration = false;
			} else {
				// Every caller discards whitespace before the rule, so it leads with
				// the first value.
				let secondIdx = 1;
				while (
					secondIdx < prelude.length &&
					nodeTypeOf(prelude[secondIdx]) === NODE_TYPE_WHITESPACE
				) {
					secondIdx++;
				}
				first = prelude[0];
				second = prelude[secondIdx];
				dashedDeclaration =
					nodeTypeOf(first) === NODE_TYPE_IDENT &&
					// Read off the source bytes rather than the lazy `value` slice.
					identStartsWithDashes(ts.input, nodeStartOf(first), endOf(first)) &&
					second &&
					nodeTypeOf(second) === NODE_TYPE_COLON;
			}
			// Only ever top-level: nested, `consumeABlocksContentsInto` tries a `--x:`
			// as a declaration first, which a custom property always parses as.
			if (dashedDeclaration) {
				consumeABlock(ts);
				return undefined;
			}
			if (prelude !== null) setPrelude(rule, prelude);
			if (S._streamBlocks) {
				streamConsumeBlock(ts, rule);
				return rule;
			}
			consumeABlock(ts);
			setBody(rule, S._blockBody);
			setBlock(rule, S._blockStart);
			setEnd(rule, S._blockEnd);
			return rule;
		}

		// anything else
		// Consume a component value from input and append the result to rule's prelude.
		if (skip) {
			// Track the first two non-whitespace tokens for the disambiguation above.
			if (tt !== TT_WHITESPACE) {
				if (firstTT === 0) {
					firstTT = tt;
					firstStart = t.start;
					firstEnd = t.end;
				} else if (secondTT === 0) {
					secondTT = tt;
				}
			}
			// Only functions, which may hold a url like `:unknown(url(x))`, and the
			// `(` / `[` blocks needing balance are materialized. Every other selector
			// leaf has no non-modules consumer and is dropped without a node.
			if (
				tt === TT_FUNCTION ||
				(tt >= TT_LEFT_PARENTHESIS && tt <= TT_LEFT_CURLY_BRACKET)
			) {
				const node = consumeAComponentValue(ts, t);
				const ty = nodeTypeOf(node);
				if (ty === NODE_TYPE_FUNCTION || ty === NODE_TYPE_URL) {
					(prelude || (prelude = takeList())).push(node);
				}
			} else {
				ts.advance();
			}
		} else {
			// A plain token is a leaf, made here rather than through
			// `consumeAComponentValue`: most of a prelude or a value is one.
			/** @type {ComponentValue} */
			let node;
			// 0 for exactly the tokens opening a function, url or block here.
			const leafType = ttToNodeType[tt];
			if (leafType === 0) {
				node = consumeAComponentValue(ts, t);
			} else {
				ts.advance();
				node = makeLeaf(leafType, t.start, t.end);
			}
			(prelude || (prelude = takeList())).push(node);
		}
	}
};

/**
 * Consume a block, CSS Syntax Level 3 [§5.4.4](https://drafts.csswg.org/css-syntax/#consume-block) - the next token must be `<{-token>`; discards it, consumes the block's contents (§5.4.5), discards the closing `}`, and returns its `decls` / `rules` pair. We also return the `[start of {, end of }]` offsets so callers can record the block's source position.
 *
 * Results go into the `_block*` slots rather than a returned object: there is one
 * block per rule, and every caller reads all four immediately, so the object was
 * pure garbage. Read them before parsing anything else.
 * @param {TokenStream} ts token stream
 * @returns {void}
 */
const consumeABlock = (ts) => {
	// Capture the opening `{`'s start before advancing - the stream reuses one
	// token instance, so `consumeABlocksContents` below would overwrite it.
	const blockStart = ts.next().start;
	// Assert (spec): the next token is <{-token>.
	// Discard a token from input. Consume a block's contents from input and let result be the result. Discard a token from input.
	ts.advance();
	consumeABlocksContentsInto(ts);
	// Read before anything else runs: a nested block would overwrite these.
	const body = S._bcBody;
	const close = ts.next();
	const end = close.type === TT_RIGHT_CURLY_BRACKET ? close.end : close.start;
	if (close.type !== TT_EOF) ts.advance();
	S._blockBody = body;
	S._blockStart = blockStart;
	S._blockEnd = end;
};

/**
 * 2-token lookahead: is the next non-whitespace pair `<ident> <colon>`?
 * Peeks raw code points without advancing; comments still fire `onComment` later.
 * @param {TokenStream} ts token stream
 * @param {MutableToken} t the next token, which the caller already peeked
 * @returns {boolean} true if consume-a-declaration's step 1 + step 3 would both succeed on the current input
 */
const declarationStartLikely = (ts, t) => {
	if (t.type !== TT_IDENTIFIER) return false;
	const input = ts.input;
	const len = input.length;
	let pos = t.end;
	for (;;) {
		if (pos >= len) return false;
		const cc = input.charCodeAt(pos);
		if (isAsciiWhitespace(cc)) {
			pos++;
			continue;
		}
		// Skip a `/* ... */` comment (the tokenizer filters comments between tokens).
		if (cc === CC_SOLIDUS && input.charCodeAt(pos + 1) === CC_ASTERISK) {
			pos += 2;
			while (
				pos < len &&
				!(
					input.charCodeAt(pos) === CC_ASTERISK &&
					input.charCodeAt(pos + 1) === CC_SOLIDUS
				)
			) {
				pos++;
			}
			pos += 2;
			continue;
		}
		// `:` is always a standalone <colon-token>, so the next significant char
		// being `:` is equivalent to the next token being a <colon-token>.
		return cc === CC_COLON;
	}
};

/**
 * Consume a block's contents, CSS Syntax Level 3 [§5.4.5](https://drafts.csswg.org/css-syntax/#consume-block-contents). Per tabatkins/parse-css.js reference impl: returns separate `decls` and `rules` flat lists, both preserved on EOF / `}` (the spec text's "Return rules" single-list model drops trailing decls because there's no implicit flush before EOF / `}`).
 *
 * `onNode` is the same streaming extension `consumeAStylesheetsContents` exposes:
 * when given, each consumed declaration / rule is handed to it immediately (in
 * source order) instead of being collected, so the returned lists are empty.
 *
 * `streamDepth` / `streamRule` are the other half of block streaming (see
 * `streamConsumeBlock`): the block collects into its own arrays exactly as it
 * always has, and only once it has grown past `STREAM_MIN_NODES` does it
 * activate and switch to the sink. Keeping that check here rather than behind
 * `onNode` is what makes a small block cost the same as it does with nothing
 * streaming - no call, no type test per child - and the block's frame is written
 * only when something could still read it (see `streamPublishFrame`), so a block
 * of nothing but declarations never touches one.
 * @param {TokenStream} ts token stream
 * @param {((node: Declaration | Rule) => void)=} onNode optional per-node sink (streaming); nodes are not collected when given
 * @param {number=} streamDepth this block's frame depth while the walk streams, else undefined
 * @param {Rule=} streamRule the rule this block belongs to, needed only to stream it
 * @param {boolean=} nested whether a `{` opened this - true inside a block, where a `}` closes it; false for the whole input, where one closes nothing (default true)
 * Results go into `_bcBody` rather than a returned object - one
 * block's contents per rule made that object pure garbage. `consumeABlocksContents`
 * below wraps this for the callers that do want an object.
 * @returns {void}
 */
const consumeABlocksContentsInto = (
	ts,
	onNode,
	streamDepth,
	streamRule,
	nested = true
) => {
	// This block's declarations sit on `_childStack` from here up to `childTop`,
	// which is written back to `_childTop` before a child block can push above it.
	const childBase = S._childTop;
	let childTop = childBase;
	// How many of its children are rules, which `sealBody` splits off.
	let ruleCount = 0;
	let sink = onNode;
	// -1 = nothing to stream, and then the growth check below can never fire.
	const d = streamDepth === undefined ? -1 : streamDepth;
	let limit = STREAM_NO_LIMIT;
	// Where this block began, kept in locals until something needs the frame.
	let markNode = 0;
	let markFlat = 0;
	let published = false;
	// Read and cleared here, before any child block sets it for itself: a block
	// held for the gather never reaches the threshold, so it is handed back whole.
	const held = S._holdForLayerGather;
	S._holdForLayerGather = false;
	if (d >= 0) {
		markNode = S._nodeCount;
		markFlat = S._listItemTop;
		limit = held ? STREAM_NO_LIMIT : markNode + STREAM_MIN_NODES;
		S._bcStreamed = false;
	}

	// Process input:
	for (;;) {
		ts.skipWhitespace();
		const t = ts.next();
		const tt = t.type;

		// <whitespace-token> / <semicolon-token>
		// Discard a token from input (`t` was just peeked and is non-EOF).
		if (tt === TT_WHITESPACE || tt === TT_SEMICOLON) {
			ts.advance();
			continue;
		}
		// <}-token>: return decls and rules, but only nested, where it closes the
		// block. At top level nothing opened one, so it is a parse error running to
		// the next `;` - which is how a browser reads a `style=""` holding one.
		if (tt === TT_RIGHT_CURLY_BRACKET && !nested) {
			consumeTheRemnantsOfABadDeclaration(ts);
			continue;
		}
		// <EOF-token> / <}-token>
		// Return decls and rules.
		if (tt === TT_EOF || tt === TT_RIGHT_CURLY_BRACKET) {
			// Read from the frame, not from `sink`: a descendant can activate this
			// block during a child rule that then fails to parse.
			const streamed = d >= 0 && published && S._frameActive[d] === 1;
			S._bcStreamed = streamed;
			// A streamed block's buffered declarations are walked and released.
			if (streamed) {
				S._childTop = childBase;
			} else {
				sealBody(childBase, childTop, ruleCount);
			}
			return;
		}
		/** @type {Rule | undefined} */
		let childRule;
		// <at-keyword-token>
		// Consume an at-rule from input, with nested set to true. If a rule was returned, append it to rules.
		if (tt === TT_AT_KEYWORD) {
			if (d >= 0 && !published && sink === undefined) {
				published = true;
				streamPublishFrame(d, streamRule, markNode, markFlat, childBase);
			}
			S._childTop = childTop;
			childRule = consumeAnAtRule(ts, nested);
		}
		// Anything else: mark, then consume a nested declaration, appending it to
		// decls and discarding the mark. Failing that, restore the mark and consume
		// a nested qualified rule stopping at <semicolon-token>, into rules.
		else {
			// 2-token peek: consume-a-declaration's steps 1 / 3 require `<ident> <colon>`; if absent it would call consume-the-remnants-of-a-bad-declaration (potentially the rest of the enclosing block) only for the restoreMark to undo it (O(N²) on flat blocks of qualified rules). Skip straight to consume-a-qualified-rule - same observable result.
			if (declarationStartLikely(ts, t)) {
				// The spec's mark, held in a local: this frame alone restores or
				// discards it, which spares the stream's mark stack a push and a pop.
				const mark = ts._pos;
				const decl = consumeADeclaration(ts, nested);
				if (decl) {
					// A declaration opens no block, so nothing can have activated this
					// one behind our back - only its own growth has to be checked.
					if (sink) {
						sink(decl);
					} else {
						if (childTop === S._childStack.length) growChildStack();
						S._childStack[childTop++] = decl;
						if (S._nodeCount > limit) {
							if (S._stream.writer !== undefined && ruleCount === 0) {
								// The longhand merge needs every declaration at once; a child
								// rule is where that is given up rather than hold the block.
								limit = S._nodeCount + STREAM_MIN_NODES;
							} else {
								if (!published) {
									published = true;
									// Grew past the threshold on declarations alone, so the
									// frame has to be written here instead.
									streamPublishFrame(
										d,
										streamRule,
										markNode,
										markFlat,
										childBase
									);
								}
								S._childTop = childTop;
								streamActivate(d);
								sink = streamOnNode;
								limit = STREAM_NO_LIMIT;
							}
						}
					}
					continue;
				}
				ts.rewind(mark);
			}
			// A child rule opens a block, and a block is the only thing that can reach
			// back up and activate this one - so this is the last moment the frame has
			// to be readable, and a block of nothing but declarations never gets here.
			if (d >= 0 && !published && sink === undefined) {
				published = true;
				streamPublishFrame(d, streamRule, markNode, markFlat, childBase);
			}
			const rawStart = t.start;
			S._childTop = childTop;
			childRule = consumeAQualifiedRule(ts, TT_SEMICOLON, true);
			if (!childRule && S._printing) {
				// Deliberately off-spec: §5.4 drops input both productions reject, which
				// would silently delete IE hacks and template placeholders, so the source
				// is kept. Printing only, so every consumer sees the spec-exact tree.
				childRule = makeRaw(rawStart, ts.next().start);
			}
		}
		// WHY: a child rule holds a block, so a descendant of it may have activated
		// this block while being consumed - its declarations and `rules` are then already
		// walked and recycled, and everything from here belongs to the sink.
		// Checked even where the rule did not parse, since the block it opened is
		// what activated us and the next child must not reach a recycled list.
		if (!sink && published && S._frameActive[d] === 1) sink = streamOnNode;
		if (!childRule) continue;
		if (sink) {
			sink(childRule);
			continue;
		}
		if (childTop === S._childStack.length) growChildStack();
		S._childStack[childTop++] = childRule;
		ruleCount++;
		if (S._nodeCount > limit) {
			S._childTop = childTop;
			streamActivate(d);
			sink = streamOnNode;
			limit = STREAM_NO_LIMIT;
		}
	}
};

/**
 * Object-returning wrapper over `consumeABlocksContentsInto` for the callers that
 * are not per-rule (the `parseABlocksContents` entry point and the printer map).
 * @param {TokenStream} ts token stream
 * @param {((node: Declaration | Rule) => void)=} onNode optional per-node sink (streaming); nodes are not collected when given
 * @returns {{ decls: Declaration[], rules: Rule[] }} consumed decls + rules
 */
const consumeABlocksContents = (ts, onNode) => {
	consumeABlocksContentsInto(ts, onNode);
	/** @type {Declaration[]} */
	const decls = [];
	/** @type {Rule[]} */
	const rules = [];
	const ruleCount = S._listItems[S._bcBody];
	const declCount = S._listItems[S._bcBody + 1];
	for (let k = 0; k < declCount; k++) {
		decls.push(S._listItems[S._bcBody + 2 + k]);
	}
	for (let k = 0; k < ruleCount; k++) {
		rules.push(S._listItems[S._bcBody + 2 + declCount + k]);
	}
	return { decls, rules };
};

/**
 * The same production read as the whole input rather than as a block's inside -
 * what an HTML `style=""` holds. Nothing opened a block, so a `}` closes none.
 * @param {TokenStream} ts token stream
 * @param {((node: Rule | Declaration) => void)=} onNode streaming sink
 * @returns {void}
 */
const consumeADeclarationList = (ts, onNode) => {
	consumeABlocksContentsInto(ts, onNode, undefined, undefined, false);
};

/**
 * Consume the remnants of a bad declaration, CSS Syntax Level 3 [§5.4.11](https://drafts.csswg.org/css-syntax/#consume-the-remnants-of-a-bad-declaration), with nested false - the only way it is reached: a nested declaration is tried only once `<ident> <colon>` is peeked, so steps 1 and 3 of §5.4.6 cannot fail there (and its mark would be restored anyway). Advances the stream past a malformed declaration's tail so the caller can resume cleanly.
 * @param {TokenStream} ts token stream
 * @returns {void}
 */
const consumeTheRemnantsOfABadDeclaration = (ts) => {
	// Process input:
	for (;;) {
		const t = ts.next();
		// <eof-token> / <semicolon-token>
		// Discard a token from input, and return.
		if (t.type === TT_EOF || t.type === TT_SEMICOLON) {
			ts.discard();
			return;
		}
		// <}-token>
		// If nested is true, return. Otherwise, discard a token.
		if (t.type === TT_RIGHT_CURLY_BRACKET) {
			ts.discard();
			continue;
		}
		// anything else
		// Consume a component value from input, and do nothing.
		consumeAComponentValue(ts);
	}
};

/**
 * Consume a declaration, CSS Syntax Level 3 [§5.4.6](https://drafts.csswg.org/css-syntax/#consume-declaration).
 * @param {TokenStream} ts token stream
 * @param {boolean=} nested true inside a `{}` block - a top-level `}` ends the value
 * @returns {Declaration | undefined} parsed declaration, or `undefined` on the spec's "return nothing" branches (steps 1, 3, 8)
 */
const consumeADeclaration = (ts, nested = false) => {
	const { input } = ts;
	// Let decl be a new declaration, with an initially empty name and a value set to an empty list.
	// The stream reuses one token, so `t` is whatever was peeked last.
	let t = ts.next();
	const start = t.start;
	// nameEnd (= start) / important (unset) keep their container defaults;
	// `value` is set unconditionally at step 5 below.
	const decl = makeContainer(NODE_TYPE_DECLARATION, start, start);

	// 1. If the next token is an <ident-token>, consume a token from input and set decl's name to the returned token's value.
	// Otherwise, consume the remnants of a bad declaration from input, with nested, and return nothing.
	if (t.type !== TT_IDENTIFIER) {
		consumeTheRemnantsOfABadDeclaration(ts);
		return undefined;
	}
	const nameEnd = t.end;
	ts.advance();
	// The setters written out here and below: unoptimized code never inlines them.
	S._aux0[decl] = nameEnd;

	// 2. Discard whitespace from input.
	ts.skipWhitespace();
	t = ts.next();
	while (t.type === TT_WHITESPACE) {
		ts.advance();
		t = ts.next();
	}

	// 3. If the next token is a <colon-token>, discard a token from input.
	//    Otherwise, consume the remnants of a bad declaration from input, with nested, and return nothing.
	if (t.type === TT_COLON) {
		ts.advance();
	} else {
		consumeTheRemnantsOfABadDeclaration(ts);
		return undefined;
	}

	// 4. Discard whitespace from input.
	ts.skipWhitespace();
	while (ts.next().type === TT_WHITESPACE) ts.advance();

	// Step 8's custom-property test, computed early so the value parse can bail.
	const isCustomProperty = identStartsWithDashes(input, start, nameEnd);

	// 5. Consume a nested list of component values, stopping at <semicolon-token>,
	//    as decl's value. A nested non-custom declaration bails on a top-level `{`,
	//    which step 8 rejects and the caller re-parses as a qualified rule anyway.
	const value = consumeAListOfComponentValues(
		ts,
		TT_SEMICOLON,
		nested,
		nested && !isCustomProperty
	);
	if (value === null) return undefined;
	// `setValue` waits until step 9: steps 6-8 still trim / scan the scratch,
	// and the store consumes it when sealing.
	S._ends[decl] = ts.next().start;
	// Read once the value is parsed, which is what may grow the column.
	const types = S._types;

	// 6. If the last two non-<whitespace-token>s in decl's value are a <delim-token> with the value "!" followed by an <ident-token> with a value that is an ASCII case-insensitive match for "important", remove them from decl's value and set decl's important flag.
	{
		let last = value.length - 1;
		while (last >= 0 && types[value[last]] === NODE_TYPE_WHITESPACE) {
			last--;
		}
		let prev = last - 1;
		while (prev >= 0 && types[value[prev]] === NODE_TYPE_WHITESPACE) {
			prev--;
		}
		// `!` delim first: it's almost always absent, and `nodeValueOf` allocates
		// a slice - this order pays it only for genuine `!important` candidates.
		if (
			prev >= 0 &&
			types[value[prev]] === NODE_TYPE_DELIM &&
			input.charCodeAt(nodeStartOf(value[prev])) === CC_EXCLAMATION &&
			types[value[last]] === NODE_TYPE_IDENT &&
			asciiCaseInsensitiveMatch(
				unescapeIdentifier(nodeValueOf(value[last])),
				"important"
			)
		) {
			setImportant(decl);
			// Trimmed by popping so the pooled list keeps its backing store.
			while (value.length > prev) value.pop();
		}
	}

	// 7. While the last item in decl's value is a <whitespace-token>, remove that token.
	while (
		value.length > 0 &&
		types[value[value.length - 1]] === NODE_TYPE_WHITESPACE
	) {
		value.pop();
	}

	// WHY: step 8. A `--` custom property takes any value, a top-level `{}` block
	// included. Otherwise such a block is the whole value or nothing, and anything
	// beside it returns nothing, which is what has `consumeABlocksContents` retry
	// the input as a qualified rule. The spec's further "no non-whitespace token
	// at the top level" check is dropped, because callers rely on `@value name:;`.
	if (!isCustomProperty && S._listHeldCurlyBlock) {
		let block = false;
		// A value a skip set dropped stood beside the block all the same.
		let beside = S._listDropped;
		for (let i = 0; i < value.length && !(block && beside); i++) {
			const v = value[i];
			const type = types[v];
			if (type === NODE_TYPE_SIMPLE_BLOCK && nodeTokenOf(v) === "{") {
				// A second one stands beside the first.
				if (block) beside = true;
				block = true;
			} else if (type !== NODE_TYPE_WHITESPACE) {
				beside = true;
			}
		}
		if (block && beside) return undefined;
	}

	// 9. Return decl.
	setValue(decl, value);
	return decl;
};

/**
 * Consume a list of component values, CSS Syntax Level 3 [§5.4.7](https://drafts.csswg.org/css-syntax/#consume-list-of-components) - consumes component values until EOF, the optional `stopToken`, or - when `nested` - a top-level `}` (left in the stream); a non-nested `}` is a parse error appended as a token.
 * @param {TokenStream} ts token stream
 * @param {number=} stopToken token type that terminates the list (left unconsumed)
 * @param {boolean=} nested true inside a `{}` block - a top-level `}` ends the list (left unconsumed)
 * @param {boolean=} bailOnCurly abort with `null` on a top-level `{` that something non-whitespace already stands before (left unconsumed) - for callers that would reject the list anyway (consume-a-declaration step 8) and restore a mark; a `{}` block alone is the whole value there, so that one is consumed
 * @returns {ComponentValue[] | null} consumed component values, or `null` when `bailOnCurly` hit
 */
const consumeAListOfComponentValues = (
	ts,
	stopToken,
	nested = false,
	bailOnCurly = false
) => {
	const values = takeList();
	S._listDropped = false;
	S._listHeldCurlyBlock = false;
	// Process input
	for (;;) {
		const t = ts.next();
		const tt = t.type;

		// <eof-token>
		// stop token (if passed)
		// Return values.
		if (tt === TT_EOF || tt === stopToken) {
			return values;
		}
		// <}-token>
		// If nested is true, return values.
		// Otherwise, this is a parse error. Consume a token from input and append the result to values.
		if (tt === TT_RIGHT_CURLY_BRACKET) {
			if (nested) return values;
			reportParseError(
				ts.input,
				"unexpected-right-curly-bracket",
				t.start,
				t.end,
				"warning"
			);
			const closer = consumeATokenAsNode(ts);
			// Keep unless the type is explicitly marked skip (1); an out-of-range
			// lookup on a short `skip.types` yields `undefined`, which must not drop.
			if (!S._skipActive || S._skipTypes[nodeTypeOf(closer)] !== 1) {
				values.push(closer);
			} else {
				S._listDropped = true;
			}
			continue;
		}
		// A top-level `{` dooms the list for a bailing caller once anything stands
		// before it (a lone `{}` block is the whole value, §5.4.6 step 8); leading
		// whitespace was discarded, so any value kept or dropped does.
		if (
			bailOnCurly &&
			tt === TT_LEFT_CURLY_BRACKET &&
			(values.length !== 0 || S._listDropped)
		) {
			return null;
		}
		// Anything else: consume a component value and append it to values. A
		// skipped leaf type short-circuits first, writing no column slot and
		// building no node; a block or function never skips here.
		if (
			S._skipActive &&
			tt !== TT_FUNCTION &&
			!(tt >= TT_LEFT_PARENTHESIS && tt <= TT_LEFT_CURLY_BRACKET) &&
			S._skipTypes[ttToNodeType[tt]] === 1
		) {
			// `t` was just peeked and is a skipped value leaf (never EOF).
			if (tt !== TT_WHITESPACE) S._listDropped = true;
			ts.advance();
			continue;
		}
		// A plain token is a leaf, made here rather than through
		// `consumeAComponentValue`: most of a prelude or a value is one.
		// 0 for exactly the tokens opening a function, url or block here.
		const leafType = ttToNodeType[tt];
		if (leafType !== 0) {
			// A leaf of a skipped type was dropped above. `ts.advance()` inlined.
			ts._pos = t.end;
			ts._hasNext = false;
			// `makeLeaf` written out, the commonest node there is.
			const id = S._nodeCount + 1;
			if (id >= S._nodeCapacity) growNodeColumns(id + 1);
			S._types[id] = leafType;
			S._starts[id] = t.start;
			S._ends[id] = t.end;
			S._nodeCount = id;
			values.push(id);
			continue;
		}
		if (tt === TT_LEFT_CURLY_BRACKET) S._listHeldCurlyBlock = true;
		const node = consumeAComponentValue(ts, t);
		if (!S._skipActive || S._skipTypes[nodeTypeOf(node)] !== 1) {
			values.push(node);
		} else {
			S._listDropped = true;
		}
	}
};

/**
 * Consume a component value, CSS Syntax Level 3 [§5.4.8](https://drafts.csswg.org/css-syntax/#consume-component-value) - consumes the next value (simple block, function, or single token); callers guard against EOF before calling.
 * @param {TokenStream} ts token stream
 * @param {MutableToken=} t the next token, if the caller already peeked it (defaults to `ts.next()`)
 * @returns {SimpleBlock | FunctionNode | ComponentValue} the consumed component value
 */
const consumeAComponentValue = (ts, t = ts.next()) => {
	// `t` is the next token, which hot callers pass in to skip a redundant
	// `ts.next()` per component value. The three contiguous opening brackets
	// consume a simple block and return it.
	const tt = t.type;
	if (tt >= TT_LEFT_PARENTHESIS && tt <= TT_LEFT_CURLY_BRACKET) {
		return /** @type {SimpleBlock} */ (consumeASimpleBlock(ts, t));
	}
	// <function-token>
	// Consume a function from input and return the result.
	if (tt === TT_FUNCTION) {
		return /** @type {FunctionNode} */ (consumeAFunction(ts, t));
	}
	// Anything else: consume a token and return it, asserted not EOF. Inlines
	// `consumeATokenAsNode`, since `t` is the peeked token - a call saved per leaf
	// component value, the bulk of the nodes on a large stylesheet.
	ts.advance();
	return tokenToNode(t);
};

/**
 * Consume a simple block, CSS Syntax Level 3 [§5.4.9](https://drafts.csswg.org/css-syntax/#consume-simple-block) - the next token must be `(`, `[`, or `{` (asserted); consumes component values via `consumeAComponentValue` until the mirror closing token (`)`, `]`, `}`) or EOF, returning the partial block on EOF.
 * @param {TokenStream} ts token stream
 * @param {MutableToken} open the next token, which the caller already peeked
 * @returns {SimpleBlock | undefined} the parsed simple block
 */
const consumeASimpleBlock = (ts, open) => {
	// Assert (spec): the next token of input is <{-token>, <[-token>, or <(-token>.
	// Mirror closing token (`opener + 3`) and the associated block char.
	const ending = open.type + 3;
	const token = BLOCK_TOKEN_CHAR[open.type - TT_LEFT_PARENTHESIS];

	// Let block be a new simple block with its associated token set to the next token and with its value initially set to an empty list.
	const block = makeContainer(NodeType.SimpleBlock, open.start, open.end);
	setToken(block, token);
	// Sealed (`setValue`) at the return, once complete.
	const val = takeList();

	// Discard a token from input.
	ts.advance();

	// Process input
	for (;;) {
		const t = ts.next();
		const tt = t.type;

		// <eof-token>
		// ending token
		// Discard a token from input. Return block.
		if (tt === TT_EOF || tt === ending) {
			if (tt !== TT_EOF) ts.advance();
			setValue(block, val);
			S._ends[block] = t.end;
			return block;
		}

		// anything else
		// Consume a component value from input and append the result to block's value.
		val.push(consumeAComponentValue(ts, t));
	}
};

/**
 * Consume a function, CSS Syntax Level 3 [§5.4.10](https://drafts.csswg.org/css-syntax/#consume-function) - consumes component values up to the matching `)` or EOF, returning the partial function on EOF.
 * @param {TokenStream} ts token stream
 * @param {MutableToken} tFn the next token, which the caller already peeked
 * @returns {FunctionNode | undefined} the consumed function node
 */
const consumeAFunction = (ts, tFn) => {
	// Assert (spec): the next token is a <function-token>.
	// Consume a token from input, and let function be a new function with its name equal the returned token's value, and a value set to an empty list.
	const fn = makeContainer(NODE_TYPE_FUNCTION, tFn.start, tFn.end);
	// The setters written out: unoptimized code never inlines them.
	S._aux0[fn] = tFn.end - 1;
	ts.advance();
	// Sealed (`setValue`) at the return, once complete.
	const val = takeList();

	// Process input
	for (;;) {
		const t = ts.next();
		const tt = t.type;

		if (tt === TT_EOF || tt === TT_RIGHT_PARENTHESIS) {
			// <eof-token>
			// <)-token>
			// Discard a token from input. Return function.
			if (tt !== TT_EOF) ts.advance();
			setValue(fn, val);
			S._ends[fn] = t.end;
			return fn;
		}

		// anything else
		// Consume a component value from input and append the result to function's value.
		// Same pre-materialization skip as `consumeAListOfComponentValues`.
		if (
			S._skipActive &&
			tt !== TT_FUNCTION &&
			!(tt >= TT_LEFT_PARENTHESIS && tt <= TT_LEFT_CURLY_BRACKET) &&
			S._skipTypes[ttToNodeType[tt]] === 1
		) {
			// `t` was just peeked and is a skipped value leaf (never EOF).
			ts.advance();
			continue;
		}
		// A plain token is a leaf, made here rather than through
		// `consumeAComponentValue`: most of a prelude or a value is one.
		// 0 for exactly the tokens opening a function, url or block here.
		const leafType = ttToNodeType[tt];
		if (leafType !== 0) {
			// A leaf of a skipped type was dropped above. `ts.advance()` inlined.
			ts._pos = t.end;
			ts._hasNext = false;
			// `makeLeaf` written out, the commonest node there is.
			const id = S._nodeCount + 1;
			if (id >= S._nodeCapacity) growNodeColumns(id + 1);
			S._types[id] = leafType;
			S._starts[id] = t.start;
			S._ends[id] = t.end;
			S._nodeCount = id;
			val.push(id);
			continue;
		}
		const node = consumeAComponentValue(ts, t);
		if (!S._skipActive || S._skipTypes[nodeTypeOf(node)] !== 1) {
			val.push(node);
		}
	}
};

// Identifier escape and unescape, over the raw text of an `<ident-token>` or any
// slice carrying escapes: `escapeIdentifier` makes a conformant token out of any
// string, and `unescapeIdentifier` reverses tokenizer-time escapes.

const regexSingleEscape = /[ -,./:-@[\]^`{-~]/;
const regexExcessiveSpaces = /(^|\\+)?(\\[A-F0-9]{1,6}) (?![a-fA-F0-9 ])/g;
// ASCII escape class per char code: 0 = pass through, 1 = `\<char>` single
// escape, 2 = `\HEX ` (control chars). Built from the original predicates so
// behaviour is identical; replaces two regex tests per character with one load.
const ESCAPE_CLASS_HEX = 2;
const ESCAPE_CLASS_SINGLE = 1;
const escapeClassTable = new Uint8Array(128);
for (let i = 0; i < 128; i++) {
	const ch = String.fromCharCode(i);
	// Every control code point, as cssesc writes them: one is no ident code
	// point, so written raw it would end the identifier there.
	// eslint-disable-next-line no-control-regex -- the control code points are what is matched
	escapeClassTable[i] = /[\u0001-\u001F\u007F]/.test(ch)
		? ESCAPE_CLASS_HEX
		: ch === "\\" || regexSingleEscape.test(ch)
			? ESCAPE_CLASS_SINGLE
			: 0;
}

/**
 * Returns escaped identifier.
 * @param {string} str string
 * @returns {string} escaped identifier
 */
const escapeIdentifierUncached = (str) => {
	let output = "";
	// Flush safe runs in bulk: only escaped chars break the run, so an
	// identifier needing no escapes returns `str` unchanged (no allocation).
	let lastFlush = 0;
	let needSpaceFix = false;
	for (let i = 0; i < str.length; i++) {
		const cc = str.charCodeAt(i);
		const cls = cc < 128 ? escapeClassTable[cc] : 0;
		if (cls === 0) continue;
		output += str.slice(lastFlush, i);
		if (cls === ESCAPE_CLASS_SINGLE) {
			output += `\\${str[i]}`;
		} else {
			output += `\\${cc.toString(16).toUpperCase()} `;
			needSpaceFix = true;
		}
		lastFlush = i + 1;
	}
	output = lastFlush === 0 ? str : output + str.slice(lastFlush);

	// `-` and digits are class 0 (never escaped above), so testing `str`'s lead
	// char codes is equivalent to regexes over `output` - and keeps the common
	// nothing-to-do call regex-free.
	const first = str.charCodeAt(0);
	// A lone `-` is no identifier either, and `\-` is.
	if (
		first === CC_HYPHEN_MINUS &&
		(str.length === 1 ||
			str.charCodeAt(1) === CC_HYPHEN_MINUS ||
			isDigit(str.charCodeAt(1)))
	) {
		output = `\\-${output.slice(1)}`;
	} else if (isDigit(first)) {
		// A leading digit becomes `\3<digit> `, another `\HEX ` run to clean up.
		output = `\\3${str.charAt(0)} ${output.slice(1)}`;
		needSpaceFix = true;
	}

	// A space after a `\HEX` escape not followed by a hex digit is redundant. Only
	// the `\HEX ` runs above emit one, so the scan is skipped when none were, and
	// it needs an even number of preceding backslashes.
	if (needSpaceFix) {
		output = output.replace(
			regexExcessiveSpaces,
			/**
			 * Drops the space after one `\\HEX` escape, where it is safe to.
			 * @param {string} $0 the escape and its space
			 * @param {string | undefined} $1 the backslashes before the escape
			 * @param {string} $2 the escape
			 * @returns {string} the escape, without the space where it can go
			 */
			($0, $1, $2) => {
				/* istanbul ignore if -- @preserve: this escaper never emits an odd run of backslashes before a `\HEX` escape (literal `\` is doubled) */
				if ($1 && $1.length % 2) {
					// It's not safe to remove the space, so don't.
					return $0;
				}

				// Strip the space.
				return ($1 || "") + $2;
			}
		);
	}

	return output;
};

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

// Cacheable per `compiler.root` - CssParser binds once per parse via
// `.bindCache(...)` and reuses for every identifier.
const escapeIdentifier = makeCacheable(escapeIdentifierUncached);

/**
 * Write a name the shortest way that still names it: as `escapeIdentifier` does,
 * except that a leading `--` starts an identifier by itself and needs no escape.
 * @param {string} name the name, escapes resolved
 * @returns {string} the name, escaped where it has to be
 */
const escapeName = (name) =>
	name.startsWith("--")
		? `--${escapeIdentifier(name.slice(2))}`
		: escapeIdentifier(name);
const unescapeIdentifier = makeCacheable(unescapeIdentifierUncached);

/**
 * Whether an ident's name starts with `--`, read off its source: `\2d -x` is
 * `--x` (§4.3.7), so a `\` in the first two code points is decoded to tell.
 * @param {string} input source
 * @param {number} start where the ident starts
 * @param {number} end where its name ends
 * @returns {boolean} true for a name spelling `--` first
 */
const identStartsWithDashes = (input, start, end) => {
	const first = input.charCodeAt(start);
	if (first !== CC_REVERSE_SOLIDUS) {
		if (first !== CC_HYPHEN_MINUS) return false;
		const second = input.charCodeAt(start + 1);
		if (second === CC_HYPHEN_MINUS) return true;
		if (second !== CC_REVERSE_SOLIDUS) return false;
	}
	return unescapeIdentifier(input.slice(start, end)).startsWith("--");
};

/**
 * A string token's text with its quotes taken off. §4.3.5 returns the token at
 * end of input too, and that one has no closing quote to take off - nor does one
 * an odd run of backslashes escaped.
 * @param {string} v the string token's raw text
 * @returns {string} the text the quotes hold
 */
const stringContent = (v) => {
	let end = v.length;
	if (end > 1 && v.charCodeAt(end - 1) === v.charCodeAt(0)) {
		let slashes = 0;
		while (
			end - 2 - slashes >= 1 &&
			v.charCodeAt(end - 2 - slashes) === CC_REVERSE_SOLIDUS
		) {
			slashes++;
		}
		if (slashes % 2 === 0) end--;
	}
	return v.slice(1, end);
};

/**
 * A string token's value - `unescapeIdentifierUncached` with the two meanings §4.3.5
 * gives a `\` that §4.3.7 does not: before a newline it is a line continuation
 * and at end of input it names nothing, so both spell nothing rather than a `\`.
 * @param {string} str the string's text, its quotes removed
 * @returns {string} the value the string holds
 */
const unescapeStringValue = (str) => {
	const first = str.indexOf("\\");
	if (first === -1) return str;
	let ret = "";
	let lastFlush = 0;
	for (let i = first; i < str.length; i++) {
		if (str.charCodeAt(i) !== CC_REVERSE_SOLIDUS) continue;
		ret += str.slice(lastFlush, i);
		// Read before the newline test, so the `\` closing a hex escape is the one
		// that opens a continuation rather than the digits' own terminator.
		const gobbled = gobbleHex(str, i + 1);
		const next = str.charCodeAt(i + 1);
		if (gobbled !== undefined) {
			ret += gobbled[0];
			i += gobbled[1];
		} else if (next === CC_REVERSE_SOLIDUS) {
			ret += "\\";
			i += 1;
		} else if (next === CC_CARRIAGE_RETURN) {
			// A CRLF is the one newline the pair spells.
			i += str.charCodeAt(i + 2) === CC_LINE_FEED ? 2 : 1;
		} else if (next === CC_LINE_FEED || next === CC_FORM_FEED) {
			i += 1;
		}
		// Otherwise the `\` is dropped - an escaped character flushes with the run
		// after it, and one the input ran out of leaves nothing to flush.
		lastFlush = i + 1;
	}
	return ret + str.slice(lastFlush);
};

/**
 * Fold an at-keyword's source spelling to the name the tokenizer read it as, so
 * a name written with escapes is looked up as the one it spells. Unescaping
 * comes first because `asciiLowercaseName` refuses a name still carrying one.
 * @param {string} raw the name as written, the `@` excluded
 * @returns {string} the name a table is looked up by
 */
const atKeyword = (raw) => asciiLowercaseName(unescapeIdentifier(raw));

// An at-keyword as it may be written: a hex escape ends at a whitespace the name
// does not carry, so this is no single class - and that whitespace is CSS's five
// rather than `\s`, which swallows U+00A0, an ident code point a name keeps.

// WHY: the hex escape is pinned to six digits or to fewer with no hex digit
// after it, and the other escape excludes hex, so the two cannot repartition
// the same run - ambiguous alternatives took 8s on a 60-character opener.
const AT_RULE_NAME_SOURCE = String.raw`(?:\\(?:[\da-f]{6}|[\da-f]{1,5}(?![\da-f]))[ \t\n\r\f]?|\\[^\n\da-f]|[^ \t\n\r\f({;\\])+`;

/**
 * Where an at-keyword's name, started right after its `@`, ends: a run of
 * letters, digits, `_` and `-`, with each escape gobbled whole (an escaped `@`
 * is part of the name, not the start of another at-keyword).
 * @param {string} text the text holding the name
 * @param {number} from the offset right after the `@`
 * @returns {number} the offset past the name
 */
const atKeywordNameEnd = (text, from) => {
	let pos = from;
	for (;;) {
		const cc = text.charCodeAt(pos);
		if (cc === CC_REVERSE_SOLIDUS) {
			const gobbled = gobbleHex(text, pos + 1);
			pos += gobbled === undefined ? 2 : 1 + gobbled[1];
			continue;
		}
		if (
			!isLetter(cc) &&
			!isDigit(cc) &&
			cc !== CC_LOW_LINE &&
			cc !== CC_HYPHEN_MINUS
		) {
			return pos;
		}
		pos++;
	}
};

/**
 * Whether a text writes an at-rule one of `names` names, under any spelling of
 * it. Every `@` is reached by a native search, so the bytes between them cost
 * nothing here and an at-keyword is a few hundred per sheet.
 * @param {string} text the text to scan
 * @param {Set<string>} names the names asked about, unescaped and lowercased
 * @returns {boolean} true where the text names one of them
 */
const namesAtRule = (text, names) => {
	for (let at = text.indexOf("@"); at !== -1; at = text.indexOf("@", at)) {
		const pos = atKeywordNameEnd(text, at + 1);
		// An `@` inside the name is an escaped one starting a name that ends here
		// too; only the last can match, as no name asked about carries an `@`.
		const last = text.lastIndexOf("@", pos - 1);
		if (names.has(atKeyword(text.slice(last + 1, pos)))) return true;
		at = pos;
	}
	return false;
};

// A url-token / url-string value's escaped newlines (`url("im\<newline>g.png")`).
const STRING_MULTILINE = /\\[\n\r\f]/g;
// Leading / trailing CSS whitespace inside a quoted url value.
const TRIM_WHITE_SPACES = /(^[ \t\n\r\f]*|[ \t\n\r\f]*$)/g;
// One CSS escape: `\` + up to 6 hex digits (+ optional whitespace) or any char.
const UNESCAPE = /\\([0-9a-f]{1,6}[ \t\n\r\f]?|[\s\S])/gi;

/**
 * Normalize a url value (a url-token's content or a url string's body) into
 * the form requests are resolved from: escaped newlines removed (string form),
 * edge whitespace trimmed, CSS escapes and percent-encoding decoded
 * (`data:` URIs excepted).
 * @param {string} str url string
 * @param {boolean} isString is url wrapped in quotes
 * @returns {string} normalized url
 */
const normalizeUrl = (str, isString) => {
	// Fast paths skipping the regex engine for the common URL with no escape and
	// no edge whitespace, each guard being equivalent to the regex matching
	// nothing. The regex removes an escaped newline from a string-token url.
	if (isString && str.includes("\\")) {
		str = str.replace(STRING_MULTILINE, "");
	}

	// Remove unnecessary spaces from `url("   img.png	 ")`
	if (
		str.length !== 0 &&
		(isAsciiWhitespace(str.charCodeAt(0)) ||
			isAsciiWhitespace(str.charCodeAt(str.length - 1)))
	) {
		str = str.replace(TRIM_WHITE_SPACES, "");
	}

	// Unescape
	if (str.includes("\\")) {
		str = str.replace(UNESCAPE, (match) => {
			if (match.length > 2) {
				// CSS Syntax 3 §4.3.7: a code point, not a UTF-16 unit, and U+FFFD
				// for zero, a surrogate or one past the last.
				const code = Number.parseInt(match.slice(1).trim(), 16);
				return code === 0 ||
					(code >= 0xd800 && code <= 0xdfff) ||
					code > 0x10ffff
					? "\uFFFD"
					: String.fromCodePoint(code);
			}
			return match[1];
		});
	}

	// Char-code gate so the dominant non-`data:` url skips the regex test.
	if ((str.charCodeAt(0) | 0x20) === CC_LOWER_D && /^data:/i.test(str)) {
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

// CSS-typed views over the generic visitor machinery (`util/SourceProcessor`),
// re-exported so consumers keep importing them from this module.
/**
 * @typedef {import("../util/SourceProcessor").VisitorFn<CssPath>} VisitorFn
 * @typedef {import("../util/SourceProcessor").VisitorBucket<CssPath>} VisitorBucket
 * @typedef {import("../util/SourceProcessor").VisitorMap<CssPath>} VisitorMap
 * @typedef {import("../util/SourceProcessor").CompiledVisitorMap<CssPath>} CompiledVisitorMap
 */

/**
 * A CSS Syntax §5.4 top-level consumer that streams each top-level node it
 * produces to `onNode` (in source order) rather than collecting it. Every entry
 * in `TOP_LEVEL_CONSUMERS` shares this shape, so the walk's `grammar` drives any
 * `as` mode through one call - a future mode is just another map entry.
 * @typedef {(ts: TokenStream, onNode: (node: Rule | Declaration) => void) => void} TopLevelConsumer
 */

/**
 * `as` value -> the §5.4 consumer that streams its top-level nodes. Keyed by the
 * public `CssParserOptions.as` enum.
 * @type {Record<string, TopLevelConsumer>}
 */
const TOP_LEVEL_CONSUMERS = {
	stylesheet: /** @type {TopLevelConsumer} */ (consumeAStylesheetsContents),
	"block-contents": consumeADeclarationList
};

/**
 * What the minifying printer may rewrite. Every entry is on unless it is
 * `false`, so a document one transform breaks can still be minified by the rest.
 * @typedef {object} CssTransformOptions
 * @property {boolean=} colorFallbacks write a color the target cannot read as an extra declaration before it, in a spelling it does read
 * @property {boolean=} lowerUnsupported write a spelling the target cannot read as one it can - the same value, said another way
 * @property {boolean=} foldCase write a name that matches ASCII case-insensitively - an at-rule, property, pseudo, function, unit or keyword - in lowercase
 * @property {boolean=} rewriteEscapes write an escaped identifier the shortest way that names it, wherever it stands
 * @property {(boolean | "all" | "some" | string | RegExp | ((comment: string) => boolean))=} comments which comments survive: `"some"` (the default) the ones that carry something, `true` / `"all"` every one, `false` none, or the ones a pattern matches / a predicate accepts, over the comment's own text
 * @property {boolean=} customMedia write the query a `@custom-media` names wherever a condition asks for it, and drop the rule that named it
 * @property {boolean=} customSelectors write the selector list a `@custom-selector` names as `:is(...)` wherever a selector asks for it, and drop the rule that named it
 * @property {boolean=} rebaseZIndex write the positive `z-index` levels the stylesheet uses as `1`, `2`, ... in the order they stack; off by default, since a level set elsewhere stacks against the old ones
 * @property {boolean=} renameKeyframes give each `@keyframes` the stylesheet defines a shorter name, and write that name wherever an `animation` value names it; off by default, since a name read elsewhere is no longer defined
 * @property {boolean=} mergeLonghands write a family of longhands as the one shorthand that sets them
 * @property {boolean=} mergeRules join rules that print the same block, at-rules that share a prelude, and a named `@layer` block a later sibling opens again
 * @property {boolean=} normalizeQuotes normalize a string's, `url()`'s, font family's and attribute value's quoting
 * @property {boolean=} reduceFunctions compute a call into the shorter call naming the same value (`calc()` and the math functions, transforms, gradients, easing functions, filters)
 * @property {boolean=} removeDeadRules drop a rule or declaration nothing can read: an empty rule, and one an identical later one supersedes
 * @property {boolean=} reorderDeclarations print a style rule's declarations in one order by family, so blocks setting the same things read alike; only declarations whose order nothing can see move
 * @property {boolean=} rewriteDirSelector write a `:dir()` the target cannot read as the `[dir]` attribute selector, which reads the attribute rather than the directionality an element may inherit
 * @property {boolean=} shortenColors write each color in the shortest spelling of the same value
 * @property {boolean=} shortenMediaQueries write a media feature in its range spelling and collapse an `and` of two into the interval
 * @property {boolean=} shortenNumbers write each number in its shortest equal spelling
 * @property {boolean=} shortenSelectors rewrite a selector into a shorter equal one
 * @property {boolean=} shortenValues write a value the shortest way its property's own grammar allows
 */

/**
 * @typedef {object} CssProcessOptions
 * @property {LocConverter=} locConverter shared loc converter (default a fresh one over the input)
 * @property {CssParseOptions["parseError"]=} parseError optional callback for each parse error, as the `parseA*` entry points report it; its offsets are into the preprocessed input `locConverter` reads
 * @property {boolean=} recurseBlocks walk into block bodies' nested rules (default true); ignored while printing, as `skip` is, since a block is printed from the children it would leave unread
 * @property {("stylesheet" | "block-contents")=} as which top-level production to consume the source as (see `TOP_LEVEL_CONSUMERS`): `"stylesheet"` (default) or `"block-contents"` (a block's contents, e.g. an HTML `style` attribute)
 * @property {SkipOptions=} skip what the grammar may leave un-materialized to go faster - safe only for parts nothing reads in the active parse; default skip nothing. Ignored while printing (`mode`), which needs every node
 * @property {string=} source name of the input in the emitted source map (`sources[0]` / `file`); only read while printing
 * @property {string=} content the input's contents for the map's `sourcesContent`; only read while printing
 * @property {CssEnvironment=} environment what the target can read (the CSS entries of `output.environment`), so a spelling it would not understand is never reached for; only read while printing, and an absent entry means the modern spelling is available
 * @property {boolean=} declareCharset open the stylesheet with `@charset "UTF-8"` exactly when its output holds a non-ASCII character, so it is read as UTF-8 wherever it is served, and write a string's hex escape of a character past U+FFFF as the character, which costs fewer bytes once compressed; for a stylesheet that is a file of its own, as `@charset` is read only as one's opening bytes. Off by default, and only read while printing
 * @property {("auto" | false)=} charset `false` when the stylesheet is read as UTF-8 wherever it is served, so no `@charset` is written for it and a string's hex escape of a character past U+FFFF is written as the character, as `declareCharset` writes it. `"auto"` by default, and only read while printing
 * @property {boolean=} convertLengthUnits rewrite a length into a shorter unit it is exactly equal in (`16px` -> `1pc`); off by default because it earns nothing once the asset is compressed, and only read while printing. A time is always rewritten
 * @property {boolean=} convertApproximateColors write a polar or Lab color as the nearest hex even where that hex only approximates it: a channel too near a `.5` boundary for two engines to round it alike, and a color outside the sRGB gamut, which hex can only clip. Off by default, and only read while printing; a space engines read through transfers of their own (`a98-rgb`, `prophoto-rgb`) is left alone either way
 * @property {boolean=} mergeDistantRules give a rule the selectors of a later one printing the same block, a rule the declarations of a later one under the same selectors, and an at-rule the block of a later one stating the same condition, past the rules between them; off by default, since it reorders the cascade and is sound only where nothing between declares what the block being moved does for an element it can match - a condition between counting for what its own rules declare
 * @property {boolean=} dropOverriddenDeclarations drop a declaration a later one in the same block overrides even where no target is selected, wherever Chromium, Gecko and WebKit each read the later value; off by default, and only read while printing. With a `browserslist` selection the drop is already made wherever every browser it names is known to read the later value, so this widens the case where no target is selected - a selection naming a browser the tables do not cover still answers for the whole of it
 * @property {boolean=} rewriteCustomProperties shorten a custom property's value the way any other value is shortened (`--x:#ffffff` -> `#fff`); off by default because `getPropertyValue()` hands that text back, and only read while printing. What it may rewrite is what any other value's tokens may be, a color in a substitution's fallback included - that being the property's value rather than the function's own argument
 * @property {EmbeddedSourceRenderer=} renderEmbeddedSource renders source this stylesheet embeds: the payload of a `url()` `data:` URL whose media type names a language webpack knows (SVG, CSS, HTML, JSON, JavaScript). Absent, a data URL is emitted exactly as written
 * @property {{ [name: string]: string }=} pseudoClasses each pseudo-class to write as a class instead (`{ "focus-visible": "focus-visible" }`), so a script can apply it where the engine does not. Only read while printing
 * @property {string[]=} unusedSymbols names a whole-project analysis found unused, which the print takes out: a bare name is a class, an id and an `@keyframes` name, and a `--`-prefixed one is a custom property. Only read while printing
 * @property {CssTransformOptions=} transforms which of the meaning-preserving rewrites the minifying print makes; each is on unless it is `false`
 * @property {DeferredEmbeddedSource[]=} deferEmbeddedSource collects what `renderEmbeddedSource` would be offered instead of offering it, for a caller whose renderer is asynchronous: the print leaves a marker for each and `finish` puts the answers in their place, so one parse serves both. Takes precedence over `renderEmbeddedSource`
 * @property {boolean=} closeAtEnd close a custom property's value the input ran out in, which is otherwise left open as the engine keeps it, for output that text is appended to (as a minimizer's banner is). Only read while printing
 * @property {((offer: Omit<DeferredEmbeddedSource, "build">) => string | undefined)=} embeddedAnswers what a print before this one was answered for each offer, which `processAsync` passes where an answer overturned a choice made without it: whether `@charset` is written is decided with them
 */

/**
 * The environment the stylesheet is built for. Every CSS ability the printer
 * reaches for is read off this selection, so nothing states one separately.
 * @typedef {object} CssEnvironment
 * @property {string[]=} browsers the browserslist selection (`["chrome 100", "safari 15"]`), so vendor prefixes and every spelling a target has to be able to read are decided for exactly these browsers; absent leaves prefixes untouched and assumes every ability
 * @property {boolean=} vendorPrefixes whether prefixes are written at all; false leaves them alone while the selection still decides which spellings a target reads
 */

/**
 * `CssProcessOptions.skip`: two independent axes, so each reads unambiguously.
 * @typedef {object} SkipOptions
 * @property {Uint8Array=} types component-value node types to drop from declaration value / function-arg lists (indexed by `NodeType`, 1 = skip; build with `buildSkipSet`)
 * @property {boolean=} selectorPrelude drop qualified-rule (selector) preludes - the rule and its block are still produced (default false)
 * @property {boolean=} atRulePrelude drop at-rule preludes - the at-rule and its block are still produced (default false)
 */

// Per-parse walk state on the tree (`S`), as with `_skip*`, so the walk functions
// below are module-level constants: one identity across parses keeps the
// recursive call sites monomorphic and allocates no closure per parse.
/** @typedef {import("../util/SourceProcessor").CompiledVisitorBucket<CssPath>} CompiledVisitorBucket */

// Comments reach the visitor map as `NodeType.Comment`, firing during
// tokenization in source order on a transient store node - only while a
// comment visitor is registered, not interleaved with the walk.
/** @type {(input: string, start: number, end: number) => number} */
const grammarOnComment = (_src, start, end) => {
	// `stop()` from a visitor drops the bucket while the node it is in still
	// tokenizes, so a comment after it reaches here with none.
	if (S._commentBucket === undefined) return end;
	const node = makeLeaf(NodeType.Comment, start, end);
	S._walkNode = node;
	S._walkParent = null;
	S._walkIndex = 0;
	const bucket = S._commentBucket;
	const e = bucket.enter;
	for (let i = 0; i < e.length; i++) e[i](visitorPath);
	const x = bucket.exit;
	for (let i = 0; i < x.length; i++) x[i](visitorPath);
	return end;
};

/**
 * A node's post-order tail, shared by `walkValue` / `walkRule`: fire its `exit`
 * visitors, then - when printing - its printer, so the print step lives in one
 * place instead of being repeated in each walker. Rebinds the path onto `node`
 * (descending into children moved it). `writer` undefined = walk only, no print.
 * @param {Node} node the finished node
 * @param {Node | null} parent enclosing node
 * @param {number} index node's index within its sibling list
 * @param {CompiledVisitorBucket | undefined} b the node's visitor bucket
 * @param {PrintContext | undefined} writer print context when printing, else undefined
 */
const exitNode = (node, parent, index, b, writer) => {
	if (b === undefined && writer === undefined) return;
	S._walkNode = node;
	S._walkParent = parent;
	S._walkIndex = index;
	if (b !== undefined) {
		const x = b.exit;
		for (let i = 0; i < x.length; i++) x[i](visitorPath);
	}
	if (writer === undefined) return;
	if (S._edits.length === 0) {
		if (writer.printNode(node, visitorPath)) {
			noteEdit(node, writer);
			if (parent === null && S._blockContentsNodes === null) {
				S._edits.length = 0;
			}
		}
	} else {
		printNearEdits(node, parent, writer);
	}
};

/**
 * `exitNode`'s print once a visitor has replaced a node in this top-level one:
 * its ancestors print the text their children printed as, without rewrites.
 * @param {Node} node the finished node
 * @param {Node | null} parent enclosing node
 * @param {PrintContext} writer the print context
 * @returns {void}
 */
const printNearEdits = (node, parent, writer) => {
	if (!holdsEdit(node)) {
		if (writer.printNode(node, visitorPath)) noteEdit(node, writer);
	} else {
		// WHY: the rewrites read the fields of what a node holds, which no longer
		// match a replaced descendant's text, so an ancestor of one only joins the
		// text its children printed as.
		const transforms = S._transforms;
		const prefixing = S._prefixingOn;
		S._transforms = /** @type {Required<CssTransformOptions>} */ (
			S._plainTransforms
		);
		S._prefixingOn = false;
		try {
			if (writer.printNode(node, visitorPath)) noteEdit(node, writer);
		} finally {
			S._transforms = transforms;
			S._prefixingOn = prefixing;
		}
	}
	if (parent === null && S._blockContentsNodes === null) S._edits.length = 0;
};

/**
 * Compose a style attribute holding a replaced declaration as its declarations
 * printed, without rewrites, as a rule holding one is.
 * @param {(Rule | Declaration)[]} nodes the top-level nodes, in source order
 * @param {PrintContext} writer the print context
 * @returns {void}
 */
const emitPlainBlockContents = (nodes, writer) => {
	const transforms = S._transforms;
	const prefixing = S._prefixingOn;
	S._transforms = /** @type {Required<CssTransformOptions>} */ (
		S._plainTransforms
	);
	S._prefixingOn = false;
	try {
		emitBlockContents(nodes, writer);
	} finally {
		S._transforms = transforms;
		S._prefixingOn = prefixing;
	}
};

/**
 * @param {Node} node a finished node
 * @returns {boolean} whether it holds a node a visitor replaced
 */
const holdsEdit = (node) => {
	const i = node;
	const start = S._starts[i];
	const end = S._ends[i];
	for (let k = 0; k < S._edits.length; k += 2) {
		if (S._edits[k] >= start && S._edits[k + 1] <= end) return true;
	}
	return false;
};

/**
 * Note a node printed as a visitor's replacement: its ancestors print plain,
 * and a rule's text no longer holds the rules it recorded.
 * @param {Node} node the replaced node
 * @param {PrintContext} writer the print context
 * @returns {void}
 */
const noteEdit = (node, writer) => {
	const i = node;
	S._edits.push(S._starts[i], S._ends[i]);
	if (S._plainTransforms === null) {
		/** @type {Required<CssTransformOptions>} */
		const plain = { ...S._transforms };
		for (const name of Object.keys(plain)) {
			if (name !== "comments") {
				plain[
					/** @type {Exclude<keyof CssTransformOptions, "comments">} */ (name)
				] = false;
			}
		}
		S._plainTransforms = plain;
	}
	const type = S._types[i];
	if (
		writer.options.mode === "minify" &&
		(type === NodeType.QualifiedRule || type === NodeType.AtRule) &&
		S._blockSpans.length !== 0
	) {
		S._blockSpans[S._blockSpans.length - 1] = WHOLE_TEXT_SPANS;
	}
};

// The letters those two sets' names start with, as a mask over `a`-`z`. Derived
// from the sets, so a name added to either is covered without touching this.
const MATH_NAME_FIRST_LETTERS = (() => {
	let mask = 0;
	for (const name of MATH_FUNCTIONS) mask |= 1 << (name.charCodeAt(0) - 0x61);
	for (const name of STEPPED_FUNCTIONS) {
		mask |= 1 << (name.charCodeAt(0) - 0x61);
	}
	return mask;
})();

/**
 * @param {number} start the name's first byte offset in `_input`
 * @returns {boolean} whether the name could be a math or stepped function's
 */
const mayBeMathFunction = (start) => {
	// ASCII-lowercased in place: only a letter lands in `a`-`z` this way, and an
	// escape or a digit starts neither set's names.
	const first = S._input.charCodeAt(start) | 0x20;
	if (first < 0x61 || first > 0x7a) return false;
	return (MATH_NAME_FIRST_LETTERS & (1 << (first - 0x61))) !== 0;
};

// The leaves the CSS printer writes as their source text, whitespace as `SEP`
// and an identifier or hash outside a value (`printVerbatimLeaf`).
const VERBATIM_LEAVES = new Uint8Array(32);
VERBATIM_LEAVES[NodeType.Whitespace] = 1;
VERBATIM_LEAVES[NodeType.Delim] = 1;
VERBATIM_LEAVES[NodeType.Comma] = 1;
VERBATIM_LEAVES[NodeType.Colon] = 1;
VERBATIM_LEAVES[NodeType.Ident] = 1;
VERBATIM_LEAVES[NodeType.Hash] = 1;
/** @type {PrintContext["_printer"] | null} */
let verbatimLeafPrinter = null;

/**
 * Name the printer that writes `VERBATIM_LEAVES` as their source text, so a
 * walk printing through it stores their text without calling it.
 * @param {PrintContext["_printer"]} printer the CSS printer
 * @returns {void}
 */
const setVerbatimLeafPrinter = (printer) => {
	verbatimLeafPrinter = printer;
};

/**
 * Store what the CSS printer writes for a `VERBATIM_LEAVES` node, without a
 * call through it: they are half the nodes a stylesheet holds. Most print as
 * their source, which the writer reads only once something asks for it.
 * @param {number} ty the node's type
 * @param {Node} node the node
 * @param {Node | null} parent its parent
 * @param {PrintContext} writer the print context
 * @returns {boolean} false to call the printer instead
 */
const printVerbatimLeaf = (ty, node, parent, writer) => {
	if (ty === NODE_TYPE_WHITESPACE) {
		writer.printedAs(node, SEP);
		return true;
	}
	// An identifier is a keyword and a hash a color the printer may rewrite only
	// in a value, and their escapes are respelled anywhere.
	const ident = ty === NODE_TYPE_IDENT || ty === NODE_TYPE_HASH;
	if (ident && parent !== null && S._within[NODE_TYPE_DECLARATION] !== 0) {
		return false;
	}
	const i = node;
	const start = S._starts[i];
	const end = S._ends[i];
	// The end of the input is where `printedSource` resolves a trailing escape.
	if (end === S._input.length) {
		const text = printedSource(node);
		// A `\` the input ends on is an escape (§4.3.8), so no delim is one here.
		if (ident && text.includes("\\")) return false;
		writer.printedAs(node, text);
		return true;
	}
	if (ident) {
		if (rangeHasEscape(start, end)) return false;
	} else if (
		end - start === 1 &&
		S._input.charCodeAt(start) === CC_REVERSE_SOLIDUS
	) {
		writer.printedAs(node, "\\\n");
		return true;
	}
	writer.printedSource(node, printedSource);
	return true;
};

/**
 * Walk a component-value subtree; children are already materialized. Fetches
 * the node's visitor bucket once (reused for enter + exit) and uses index
 * loops - `for...of` would allocate an iterator per node on this hot path. When
 * `writer` is given, fires this node's printer once its children and visitors are
 * done (post-order); the generic context owns everything the printer then does.
 * @param {Node} node component-value root
 * @param {Node | null} parent enclosing node
 * @param {number} index node's index within its sibling list
 * @param {PrintContext | undefined} writer print context when printing, else undefined
 */
const walkValue = (node, parent, index, writer) => {
	const ty = S._types[node];
	const b = S._walkVisitors[ty];
	let skip = false;
	let held = false;
	if (b !== undefined && b.enter.length !== 0) {
		S._walkSkipped = false;
		S._walkNode = node;
		S._walkParent = parent;
		S._walkIndex = index;
		const e = b.enter;
		for (let i = 0; i < e.length; i++) e[i](visitorPath);
		skip = S._walkSkipped;
		S._walkSkipped = false;
		held = skip && writer !== undefined;
		if (held) skip = holdSkippedVisitors();
	}
	// Everything below a math function is a math expression, `(...)` groups
	// included, so the depth rides the recursion as `_within` does - and still
	// counts this node while its own printer runs, which joins its children.
	let enteredMath = false;
	let enteredStepped = false;
	let enteredSupports = false;
	let previousMedia = false;
	let enteredSelector = false;
	if (!skip && (ty === NODE_TYPE_FUNCTION || ty === NODE_TYPE_SIMPLE_BLOCK)) {
		const i0 = node;
		const vs = S._listStarts[i0];
		const ve = vs + S._listLengths[i0];
		// What a function's name says of the values below it, which only the
		// printer reads: a walk that prints nothing asks none of it.
		const named = S._printing && ty === NODE_TYPE_FUNCTION;
		// Read off the source before the name is cut out of it: most calls in a
		// stylesheet start with a letter neither set uses, `var()` above all.
		if (
			named &&
			(mayBeMathFunction(S._starts[i0]) ||
				S._input.charCodeAt(S._starts[i0]) === CC_REVERSE_SOLIDUS)
		) {
			const written = S._input.slice(S._starts[i0], S._aux0[i0]);
			// An escape spells the same name: `c\61 lc(` is `calc()` (§4.3.7).
			const name = asciiLowercaseName(
				written.includes("\\") ? unescapeIdentifier(written) : written
			);
			if (MATH_FUNCTIONS.has(name)) {
				enteredMath = true;
				S._mathFunctionDepth++;
			}
			if (STEPPED_FUNCTIONS.has(name)) {
				enteredStepped = true;
				S._steppedFunctionDepth++;
			}
		}
		const previousColorOperand = S._inColorOperand;
		if (named && !S._inColorOperand && readsColorsAsNumbers(i0, vs, ve)) {
			S._inColorOperand = true;
		}
		if (
			named &&
			!S._inSupportsPrelude &&
			isImportSupports(i0, /** @type {Node} */ (parent))
		) {
			enteredSupports = true;
			previousMedia = S._inMediaConditionPrelude;
			S._inSupportsPrelude = true;
			// Its `(...)` tests a declaration, which no media feature spelling reaches.
			S._inMediaConditionPrelude = false;
		}
		if (
			named &&
			S._inSupportsPrelude &&
			!S._inSupportsSelector &&
			namesFunction(i0, "selector")
		) {
			enteredSelector = true;
			S._inSupportsSelector = true;
		}
		S._within[ty]++;
		// A child's walk never moves the list it sits in.
		const items = S._listItems;
		const skipsLeaf = S._walkSkipsLeaf;
		for (let i = vs; i < ve; i++) {
			const child = items[i];
			if (skipsLeaf[S._types[child]] === 1) continue;
			walkValue(child, node, i - vs, writer);
		}
		S._within[ty]--;
		S._inColorOperand = previousColorOperand;
	}
	if (
		b !== undefined ||
		writer === undefined ||
		VERBATIM_LEAVES[ty] === 0 ||
		writer._printer !== verbatimLeafPrinter ||
		!printVerbatimLeaf(ty, node, parent, writer)
	) {
		if (held) resumeSkippedVisitors();
		exitNode(node, parent, index, b, writer);
	}
	if (enteredMath) S._mathFunctionDepth--;
	if (enteredStepped) S._steppedFunctionDepth--;
	if (enteredSupports) {
		S._inSupportsPrelude = false;
		S._inMediaConditionPrelude = previousMedia;
	}
	if (enteredSelector) S._inSupportsSelector = false;
};

/**
 * Whether a function is named `name` under any spelling of it.
 * @param {number} i0 the function's node index
 * @param {string} name the lowercase name
 * @returns {boolean} true when the function's name spells `name`
 */
const namesFunction = (i0, name) => {
	const written = S._input.slice(S._starts[i0], S._aux0[i0]);
	return asciiCaseInsensitiveMatch(
		written.includes("\\") ? unescapeIdentifier(written) : written,
		name
	);
};

/**
 * Whether a function is an `@import`'s `supports()`, whose condition is a feature
 * test like a `@supports` prelude's and so is read the same way.
 * @param {number} i0 the function's node index
 * @param {Node} parent the node it sits in
 * @returns {boolean} true for `supports()` at the top of an `@import` prelude
 */
const isImportSupports = (i0, parent) => {
	const p = parent;
	if (S._types[p] !== NODE_TYPE_AT_RULE) return false;
	return (
		namesFunction(i0, "supports") &&
		atKeyword(S._input.slice(S._starts[p] + 1, S._aux0[p])) === "import"
	);
};

// A gradient, whatever it is prefixed with.
const GRADIENT_FUNCTION_RE = /(?:^|-)(?:linear|radial|conic)-gradient$/i;

/**
 * A function's name, for the gradient test.
 * @param {number} i0 the function's node index
 * @returns {string} the name as written
 */
const gradientName = (i0) => S._input.slice(S._starts[i0], S._aux0[i0]);

/**
 * Whether a source range holds an escape, so its unescaped spelling is the one
 * a name has to be read from.
 * @param {number} start range start
 * @param {number} end range end (exclusive)
 * @returns {boolean} true when the range holds a `\`
 */
const rangeHasEscape = (start, end) => {
	// A native search can pass the range, so the interval it found free of `\`
	// is kept: later ranges inside it need no search, and one before it scans
	// back only to the `\` before it, widening the interval down to there.
	const input = S._input;
	let from = S._escapeSearchFrom;
	let at = S._escapeSearchAt;
	if (from === -1 || (at !== -1 && start > at)) {
		from = start;
		at = input.indexOf("\\", start);
	} else if (start < from) {
		const before = input.lastIndexOf("\\", from - 1);
		if (before >= start) {
			from = start;
			at = input.indexOf("\\", start);
		} else {
			from = before + 1;
		}
	}
	S._escapeSearchFrom = from;
	S._escapeSearchAt = at;
	return at !== -1 && at < end;
};

/**
 * Whether a declaration names a custom property, however its `--` is spelled.
 * @param {number} i0 the declaration's node index
 * @returns {boolean} true for a name spelling `--` first
 */
const namesCustomProperty = (i0) =>
	identStartsWithDashes(S._input, S._starts[i0], S._aux0[i0]);

/**
 * Whether a declaration's name is one ASCII case-insensitively, escapes resolved.
 * @param {number} i0 the declaration's node index
 * @param {string} name the lowercase name
 * @returns {boolean} true when it names `name`
 */
const declarationNamed = (i0, name) => {
	const start = S._starts[i0];
	const end = S._aux0[i0];
	if (rangeAsciiCaseInsensitiveMatch(S._input, start, end, name)) return true;
	return (
		rangeHasEscape(start, end) &&
		asciiCaseInsensitiveMatch(
			unescapeIdentifier(S._input.slice(start, end)),
			name
		)
	);
};

/** Longest `from` spelling: each code point as `\` + 6 hex digits + CRLF. */
const MAX_ESCAPED_FROM_LENGTH = 4 * (1 + 6 + 2);

/**
 * Whether an ident names the relative-color keyword - `\66 rom` names it too,
 * and only an escaped ident is longer than the four bytes it spells.
 * @param {number} start ident start offset
 * @param {number} end ident end offset (exclusive)
 * @returns {boolean} true when the ident names `from`
 */
const identNamesFrom = (start, end) => {
	const length = end - start;
	if (length === 4) {
		return rangeAsciiCaseInsensitiveMatch(S._input, start, end, "from");
	}
	if (length < 4 || length > MAX_ESCAPED_FROM_LENGTH) return false;
	return (
		rangeHasEscape(start, end) &&
		asciiCaseInsensitiveMatch(
			unescapeIdentifier(S._input.slice(start, end)),
			"from"
		)
	);
};

/**
 * Whether a function reads the colors below it as numbers rather than showing
 * them: a gradient interpolates its stops, `color-mix()` its arguments, and a
 * relative color reads its origin's channels off as the `r` / `l` / `h`
 * keywords. The origin is the `from` its arguments open with, so a function
 * webpack knows nothing about guards its origin too.
 * @param {number} i0 the function's node index
 * @param {number} vs its first child's slot
 * @param {number} ve one past its last child's slot
 * @returns {boolean} true when a color below it is an operand, not a value
 */
const readsColorsAsNumbers = (i0, vs, ve) => {
	const start = S._starts[i0];
	const end = S._aux0[i0];
	if (rangeHasEscape(start, end)) {
		// An escape spells either name too, so the unescaped spelling decides.
		const name = unescapeIdentifier(S._input.slice(start, end));
		if (
			GRADIENT_FUNCTION_RE.test(name) ||
			asciiCaseInsensitiveMatch(name, "color-mix")
		) {
			return true;
		}
	} else {
		// Every gradient name ends in `gradient` and `color-mix` in `mix`, so one
		// code point rejects the rest before either name is sliced.
		const last = S._input.charCodeAt(end - 1) | 0x20;
		if (last === CC_LOWER_T) {
			if (GRADIENT_FUNCTION_RE.test(gradientName(i0))) return true;
		} else if (
			last === CC_LOWER_X &&
			rangeAsciiCaseInsensitiveMatch(S._input, start, end, "color-mix")
		) {
			return true;
		}
	}
	for (let i = vs; i < ve; i++) {
		const child = S._listItems[i];
		const childType = S._types[child];
		if (childType === NODE_TYPE_WHITESPACE) continue;
		return (
			childType === NODE_TYPE_IDENT &&
			identNamesFrom(S._starts[child], S._ends[child])
		);
	}
	return false;
};

/**
 * Set the flags an at-rule's own name decides, on the way into its prelude:
 * which of them is set is the same question wherever the walk asks it, and the
 * collected and streaming paths would otherwise have to agree by hand. The
 * caller puts them back - each rides its own recursion.
 * @param {number} i0 the at-rule's node index
 * @returns {void}
 */
const enterAtRulePrelude = (i0) => {
	const atName = atKeyword(S._input.slice(S._starts[i0] + 1, S._aux0[i0]));
	// Tokens rather than a selector, but for `@scope`'s.
	S._inAtRulePrelude = atName !== "scope";
	if (atName === "property") {
		S._inPropertyRule = true;
	} else if (atName === "function") {
		S._inFunctionRule = true;
	} else if (atName === "font-feature-values") {
		S._inFeatureValuesRule = true;
	}
	if (atName === "supports") {
		S._inSupportsPrelude = true;
	}
	// `@media`, `@container` and the media queries of `@import` and `@custom-media`
	// are where a `(...)` holds a media feature, the one place range spelling is.
	else if (
		atName === "media" ||
		atName === "container" ||
		atName === "import" ||
		atName === "custom-media"
	) {
		S._inMediaConditionPrelude = true;
	}
};

/**
 * The key a declaration prints under: its source, with the at-rules that read
 * one as a descriptor.
 * @param {Node} node the declaration
 * @param {number} i0 its node index
 * @returns {string} the key, "" where it is not one to reuse
 */
const declarationMemoKeyOf = (node, i0) => {
	const start = S._starts[i0];
	const end = S._ends[i0];
	const input = S._input;
	if (end === input.length) return "";
	const text = input.slice(start, end);
	// A comment kept in the value is written where it stands, once.
	if (text.includes("/*")) return "";
	// Bare where no descriptor at-rule is around, which no other key can equal:
	// those start with a letter naming one, and no source holds a NUL.
	return !S._inPropertyRule && !S._inFunctionRule && !S._inFeatureValuesRule
		? text
		: `${S._inPropertyRule ? "p" : ""}${S._inFunctionRule ? "f" : ""}${
				S._inFeatureValuesRule ? "v" : ""
			}\0${text}`;
};

/**
 * The key a qualified rule's block of declarations is composed under: its
 * source, with what the walk around it decides of how it prints.
 * @param {number} i0 the rule's node index
 * @param {Node | null} parent the node it sits in
 * @returns {string} the key, "" where the block is not one to reuse
 */
const blockMemoKeyOf = (i0, parent) => {
	const start = S._aux1[i0];
	const end = S._ends[i0];
	const input = S._input;
	if (start === -1 || end === input.length) return "";
	// A comment kept in the block is written where it stands, once.
	const block = input.slice(start, end);
	if (block.includes("/*")) return "";
	let around = "";
	if (parent !== null) {
		const p = parent;
		if (S._types[p] !== NODE_TYPE_AT_RULE) return "";
		around = input.slice(S._starts[p], S._aux0[p]);
	}
	// What is around it picks the table, so the key is the block alone and no
	// copy of it is built per lookup.
	if (
		around.length === 0 &&
		!S._inPropertyRule &&
		!S._inFunctionRule &&
		!S._inFeatureValuesRule
	) {
		S._blockMemoTable = /** @type {Map<string, string>} */ (S._blockMemo);
		return block;
	}
	const scope = `${S._inPropertyRule ? "p" : ""}${
		S._inFunctionRule ? "f" : ""
	}${S._inFeatureValuesRule ? "v" : ""}${around}`;
	let table = S._blockMemoScopes.get(scope);
	if (table === undefined) {
		table = new Map();
		S._blockMemoScopes.set(scope, table);
	}
	S._blockMemoTable = table;
	return block;
};

/**
 * Walk a structural subtree; an at-rule / qualified-rule's block was parsed
 * eagerly (§5.4.4), so its `value` holds the nested rules / declarations. When
 * `writer` is given, fires this node's printer once its children and visitors are
 * done (post-order); the generic context owns everything the printer then does.
 * @param {Node} node structural-tree root
 * @param {Node | null} parent enclosing node
 * @param {number} index node's index within its sibling list (declarations and child rules index independently)
 * @param {PrintContext | undefined} writer print context when printing, else undefined
 */
const walkRule = (node, parent, index, writer) => {
	const i0 = node;
	const ty = S._types[i0];
	const b = S._walkVisitors[ty];
	let skip = false;
	let held = false;
	if (b !== undefined && b.enter.length !== 0) {
		S._walkSkipped = false;
		S._walkNode = node;
		S._walkParent = parent;
		S._walkIndex = index;
		const e = b.enter;
		for (let i = 0; i < e.length; i++) e[i](visitorPath);
		skip = S._walkSkipped;
		S._walkSkipped = false;
		held = skip && writer !== undefined;
		if (held) skip = holdSkippedVisitors();
	}
	if (!skip) {
		S._within[ty]++;
		if (ty === NODE_TYPE_AT_RULE || ty === NODE_TYPE_QUALIFIED_RULE) {
			const ps = S._listStarts[i0];
			const pe = ps + S._listLengths[i0];
			// A `@supports` prelude holds a declaration being *tested*, not applied,
			// so rewriting its value would change what the test asks - the flag rides
			// the recursion, since the conditions nest.
			const prevSupports = S._inSupportsPrelude;
			const prevMedia = S._inMediaConditionPrelude;
			const prevAtRule = S._inAtRulePrelude;
			const prevProperty = S._inPropertyRule;
			const prevFunction = S._inFunctionRule;
			const prevFeatureValues = S._inFeatureValuesRule;
			if (ty === NODE_TYPE_AT_RULE) enterAtRulePrelude(i0);
			// A child's walk never moves the list it sits in.
			const items = S._listItems;
			const skipsLeaf = S._walkSkipsLeaf;
			for (let i = ps; i < pe; i++) {
				const child = items[i];
				if (skipsLeaf[S._types[child]] === 1) continue;
				walkValue(child, node, i - ps, writer);
			}
			S._inSupportsPrelude = prevSupports;
			S._inMediaConditionPrelude = prevMedia;
			S._inAtRulePrelude = prevAtRule;
			if (S._recurseBlocks) {
				// Declarations then child rules - downstream consumers don't need them strictly interleaved in source order.
				const bi = S._bodyIdx[i0];
				if (bi !== 0) {
					const body = S._listItems;
					const declLength = body[bi];
					const key =
						S._blockMemo !== null &&
						ty === NODE_TYPE_QUALIFIED_RULE &&
						declLength !== 0 &&
						body[bi - 1] === 0
							? blockMemoKeyOf(i0, parent)
							: "";
					const table = S._blockMemoTable;
					const memo = key === "" ? undefined : table.get(key);
					if (memo === undefined) {
						for (let i = 0; i < declLength; i++) {
							walkRule(body[bi + 1 + i], node, i, writer);
						}
					}
					S._blockMemoNode = node;
					S._blockMemoBody = memo;
					S._blockMemoKey = memo === undefined ? key : "";
					S._blockMemoKeyTable = table;
					const ruleStart = bi + 1 + declLength;
					const ruleCount = body[bi - 1];
					for (let i = 0; i < ruleCount; i++) {
						walkRule(body[ruleStart + i], node, i, writer);
					}
				}
			}
			S._inPropertyRule = prevProperty;
			S._inFunctionRule = prevFunction;
			S._inFeatureValuesRule = prevFeatureValues;
		} else if (ty === NODE_TYPE_DECLARATION) {
			const key =
				S._declarationMemo !== null && b === undefined
					? declarationMemoKeyOf(node, i0)
					: "";
			if (key !== "") {
				const memo = /** @type {Map<string, string>} */ (
					S._declarationMemo
				).get(key);
				if (memo !== undefined) {
					S._within[ty]--;
					// Its value's tokens print no text, so a box merge reads what it
					// needs of them off the flags.
					if (mayBeMergeableName(node)) {
						S._flags[i0] |= /** @type {Set<string>} */ (S._singleValueKeys).has(
							key
						)
							? FLAG_MEMO_PRINTED | FLAG_SINGLE_VALUE
							: FLAG_MEMO_PRINTED;
					}
					/** @type {PrintContext} */ (writer).printedAs(node, memo);
					return;
				}
				S._declarationMemoKey = key;
			}
			const vs = S._listStarts[i0];
			const ve = vs + S._listLengths[i0];
			// A declaration's value is a value context (its hashes are colors, not
			// ids); the flag rides the recursion so a hash at any depth (e.g. inside a
			// gradient) knows it, while selector-prelude hashes never see it set.
			const prevDeclaration = S._valueDeclaration;
			const prevCustom = S._inCustomProperty;
			const prevSubstituted = S._inSubstitutedValue;
			if (S._printing) {
				S._valueDeclaration = node;
				// A node is an index into the flat arrays, and the printer hands one
				// back for reuse, so the memo below is answered per declaration.
				S._keywordOnlyFor = null;
			}
			// WHY: a custom property's value is the one an engine hands back verbatim,
			// so its tokens print squeezed but as written. `@property`'s
			// `initial-value` is typed by its sibling `syntax` and is opaque the same
			// way - `0px` there is not the `0` a length accepts. Only the custom
			// property itself is what `rewriteCustomProperties` asks for, and those
			// two stay opaque whatever it says.
			if (
				S._printing &&
				((!S._rewriteCustomProperties && namesCustomProperty(i0)) ||
					(S._inPropertyRule && declarationNamed(i0, "initial-value")) ||
					(S._inFunctionRule && declarationNamed(i0, "result")))
			) {
				S._inCustomProperty = true;
			}
			// WHY: so is a value holding a substitution - the engine keeps it as the
			// token stream it was written as until that resolves, so no rewrite inside
			// one prints the value it would hand back. Read once per declaration,
			// before its children print, since a `var()` sibling of the token being
			// rewritten has not been visited yet. Every substitution is a function
			// call, so a value with no `(` cannot hold one; the span is checked in
			// place, slicing it out costing a string per declaration.
			if (S._printing && hasSubstitutionInSpan(S._starts[i0], S._ends[i0])) {
				S._inSubstitutedValue = true;
			}
			// A child's walk never moves the list it sits in.
			const items = S._listItems;
			const skipsLeaf = S._walkSkipsLeaf;
			for (let i = vs; i < ve; i++) {
				const child = items[i];
				if (skipsLeaf[S._types[child]] === 1) continue;
				walkValue(child, node, i - vs, writer);
			}
			S._valueDeclaration = prevDeclaration;
			S._inCustomProperty = prevCustom;
			S._inSubstitutedValue = prevSubstituted;
		}
		S._within[ty]--;
	}
	if (held) resumeSkippedVisitors();
	exitNode(node, parent, index, b, writer);
	if (S._declarationMemoKey !== "") {
		const context = /** @type {PrintContext} */ (writer);
		const printed = context.get(node);
		if (!mayBeMergeableName(node)) {
			/** @type {Map<string, string>} */ (S._declarationMemo).set(
				S._declarationMemoKey,
				printed
			);
		} else if (printed.includes(":")) {
			/** @type {Map<string, string>} */ (S._declarationMemo).set(
				S._declarationMemoKey,
				printed
			);
			if (valueComponents(A, node, context).length === 1) {
				/** @type {Set<string>} */ (S._singleValueKeys).add(
					S._declarationMemoKey
				);
			}
		}
		S._declarationMemoKey = "";
	}
};

// What a declaration printed from the memo carries in its flags, past the
// public `Flag` bits: that its value's tokens printed nothing, and whether that
// value is one component, which is all a box merge reads of them.
const FLAG_MEMO_PRINTED = 8;
const FLAG_SINGLE_VALUE = 16;
// That `aux1` holds the declaration's spelling id. Looked up on first read
// rather than at parse, which would cost every declaration; `makeContainer`
// clears it, so parsing writes nothing for it.
const FLAG_PROPERTY_ID_READ = 32;
// Set with it when the name has an escape, so it may print spelled otherwise.
const FLAG_NAME_ESCAPED = 64;

/**
 * Whether a declaration's value is one component, as `valueComponents` splits
 * it, answered off its flags where it printed from the memo.
 * @param {CssPath} path the accessor
 * @param {Node} node the declaration
 * @param {PrintContext} writer the print context (children's printed text)
 * @returns {boolean} true when it is one component
 */
const isSingleValue = (path, node, writer) => {
	const flags = S._flags[node];
	if ((flags & FLAG_MEMO_PRINTED) !== 0) {
		return (flags & FLAG_SINGLE_VALUE) !== 0;
	}
	return valueComponents(path, node, writer).length === 1;
};

// WHY: one frame per open block, indexed by depth rather than pushed and
// popped. Nesting is shallow and strictly LIFO, so an indexed store costs a
// write where parallel stacks cost bounds and capacity checks on every rule,
// and activation has to reach every ancestor, which locals could not offer.
//
// A frame is written lazily, by `streamPublishFrame`, and only where an
// ancestor could still be reached for: just before a child rule - the one thing
// that can open a block that reaches back up - and on the block's own growth
// past the threshold. Every other block, which is every leaf rule in a
// stylesheet, keeps its state in `consumeABlocksContentsInto`'s locals and never
// touches these at all. A node is an id, so every slot but the two buffers is
// numeric: typed columns keep a write off the GC's books.
const STREAM_MAX_DEPTH = 64;

/**
 * A rule the printer has written, at `[at, at + len)` of the piece holding it.
 * `key` is the text it printed to and `scope` what encloses it; a later rule
 * with both the same is this one written again. Neither is rewritten as the span
 * travels outward - only `scope` is replaced, by one standing for more - so the
 * collected and the streamed path split a rule the same way, which is what makes
 * the two agree on what a duplicate is.
 * @typedef {{ scope: RuleScope, key: string, at: number, len: number, taken: TakenPiece | null }} RuleSpan
 * @typedef {{ prefix: string, rules: Map<string, RuleSpan>, selectors: Map<string, RuleSpan | RuleSpan[]>, inner: Map<string, RuleScope>, noShadow: boolean }} RuleScope
 * @typedef {{ bodyAt: number, prelude: string, keyPrelude: string, qualified: boolean, spans: RuleSpan[], parts: number[] | null, query: { prelude: string, rules: number[] } | null }} BlockSpans
 */
// A span no later copy is read against: it is there to be cut, not to key a
// rule. Every rule prints to a text of its own, so no rule's key is this.
const UNKEYED = "";
const NO_RULE_SPANS = /** @type {RuleSpan[]} */ (
	/** @type {RuleSpan[] | ReadonlyArray<never>} */ (Object.freeze([]))
);
const NO_BLOCK_SPANS = /** @type {BlockSpans[]} */ (
	/** @type {BlockSpans[] | ReadonlyArray<never>} */ (Object.freeze([]))
);
/**
 * Whether a gathered layer block's last rule takes a later block's one rule as
 * it would once settled: printing the same block, the two lists join into one
 * set whatever order the earlier is in. Through at-rules stating the same
 * condition, the later one holding one rule each, it is their last rules.
 * @param {RuleEntry} gathered the block the gather holds, only the last rule down its last children unsettled
 * @param {RuleEntry} later the later block of the same layer
 * @returns {boolean} true when the join reads nothing the order changes
 */
const growsGatheredList = (gathered, later) => {
	let last = gathered;
	let next = later;
	do {
		const children = /** @type {RuleEntry[]} */ (last.children);
		const added = /** @type {RuleEntry[]} */ (next.children);
		if (children.length === 0 || added.length !== 1) return false;
		last = children[children.length - 1];
		next = added[0];
		if (last.atRule !== next.atRule || next.prelude === -1) return false;
		if (
			last.atRule &&
			(!rangesEqual(
				last.list === null ? last.text : last.list,
				0,
				last.prelude,
				next.list === null ? next.text : next.list,
				0,
				next.prelude
			) ||
				isAnonymousLayerPrelude(entryPrelude(last)))
		) {
			return false;
		}
	} while (last.atRule);
	return (
		last.prelude !== -1 &&
		blocksEqual(last, next) &&
		entryListable(last) &&
		entryListable(next)
	);
};

/**
 * A gathered named layer block's text, its seams settled once something reads
 * it; the block settled is the one a later block of the layer then joins.
 */
class GatheredLayerText {
	/**
	 * @param {SeenLayer} layer the block, as the gather holds it
	 */
	constructor(layer) {
		/** @type {SeenLayer} */
		this.layer = layer;
	}

	/**
	 * @returns {string} the block as it prints
	 */
	get text() {
		const layer = this.layer;
		const merged = settleJoinedSeams(/** @type {RuleEntry} */ (layer.entry));
		layer.entry = merged;
		return merged.text;
	}
}

/**
 * A top-level node's text as written out, which later rules cut dead rules from.
 * A cut is recorded against the text the piece last held, so a run of cuts builds
 * the text once, when something reads it, rather than once per cut; a run of
 * selectors a list grows by at one place is held the same way.
 */
class TakenPiece {
	/**
	 * @param {number} piece the writer's index for it
	 * @param {string} text the text it went out as
	 * @param {number} empties its length with every rule it holds cut, less one, or -1
	 */
	constructor(piece, text, empties) {
		/** @type {number} */
		this.piece = piece;
		/** @type {RuleSpan[]} shared and empty until `noteSpans` gives it its own */
		this.spans = NO_RULE_SPANS;
		/** @type {number} */
		this.empties = empties;
		/** @type {string} */
		this._text = text;
		/** @type {number[] | null} the ranges of `_text` cut since, as sorted start, end pairs */
		this._cuts = null;
		/** @type {string[] | null} what grew at `_grownAt` since, never held with `_cuts` */
		this._grown = null;
		/** @type {number} */
		this._grownAt = -1;
		/** @type {number} */
		this._grownLength = 0;
		/** @type {number} how many times it changed, so a reader can tell it did */
		this.edits = 0;
		/** @type {number} */
		this.length = text.length;
	}

	/**
	 * @returns {string} what the piece reads now
	 */
	get text() {
		this._settleGrown();
		const cuts = this._cuts;
		if (cuts !== null) {
			/** @type {string[]} */
			const parts = [];
			let from = 0;
			for (let i = 0; i < cuts.length; i += 2) {
				parts.push(this._text.slice(from, cuts[i]));
				from = cuts[i + 1];
			}
			parts.push(this._text.slice(from));
			this._text = parts.join("");
			this._cuts = null;
		}
		return this._text;
	}

	/**
	 * @param {string} value what the piece reads from now on
	 */
	set text(value) {
		keyDeferredSpan();
		this._text = value;
		this._cuts = null;
		this._grown = null;
		this.length = value.length;
		this.edits++;
	}

	/**
	 * @param {number} at an offset in what the piece reads now
	 * @returns {number} the code unit there, read without building the text
	 */
	charCodeAt(at) {
		this._settleGrown();
		return this._text.charCodeAt(this._uncut(at));
	}

	/**
	 * Whether a range of what the piece reads now equals one of a string, read
	 * without building the text where the range starts past what grew.
	 * @param {number} start where its range starts
	 * @param {number} end where its range ends
	 * @param {string} other the string
	 * @param {number} otherStart where its range starts
	 * @param {number} otherEnd where its range ends
	 * @returns {boolean} true when the two ranges are equal
	 */
	rangeEquals(start, end, other, otherStart, otherEnd) {
		if (this._grown !== null && start >= this._grownAt + this._grownLength) {
			const shift = this._grownLength;
			return rangesEqual(
				this._text,
				start - shift,
				end - shift,
				other,
				otherStart,
				otherEnd
			);
		}
		return rangesEqual(this.text, start, end, other, otherStart, otherEnd);
	}

	/**
	 * Take `len` code units out at `from`, offsets in what the piece reads now.
	 * @param {number} from where the cut starts
	 * @param {number} len how much it takes
	 * @returns {void}
	 */
	cut(from, len) {
		keyDeferredSpan();
		this._settleGrown();
		const start = this._uncut(from);
		const end = this._uncut(from + len - 1) + 1;
		const cuts = this._cuts === null ? [] : this._cuts;
		// The ranges cut before inside this one are taken with it.
		let at = 0;
		while (at < cuts.length && cuts[at] < start) at += 2;
		let past = at;
		while (past < cuts.length && cuts[past + 1] <= end) past += 2;
		cuts.splice(at, past - at, start, end);
		this._cuts = cuts;
		this.length -= len;
		this.edits++;
	}

	/**
	 * Put `addition` in at `at`, an offset in what the piece reads now.
	 * @param {number} at where it goes
	 * @param {string} addition what goes there
	 * @returns {void}
	 */
	grow(at, addition) {
		if (this._grown === null || at !== this._grownAt + this._grownLength) {
			// Built first: a piece holds cuts or growth, never both, so `_grownAt`
			// reads `_text`.
			this._text = this.text;
			this._grown = [];
			this._grownAt = at;
			this._grownLength = 0;
		}
		this._grown.push(addition);
		this._grownLength += addition.length;
		this.length += addition.length;
		this.edits++;
	}

	/**
	 * Write what grew into `_text`.
	 * @returns {void}
	 */
	_settleGrown() {
		const grown = this._grown;
		if (grown === null) return;
		this._grown = null;
		const at = this._grownAt;
		this._text = `${this._text.slice(0, at)}${grown.join("")}${this._text.slice(
			at
		)}`;
	}

	/**
	 * @param {number} at an offset in what the piece reads now
	 * @returns {number} the same offset in `_text`
	 */
	_uncut(at) {
		const cuts = this._cuts;
		if (cuts === null) return at;
		let offset = at;
		for (let i = 0; i < cuts.length && cuts[i] <= offset; i += 2) {
			offset += cuts[i + 1] - cuts[i];
		}
		return offset;
	}
}

/**
 * The scope for `prefix`, made once and shared - so a chain reached a level at a
 * time and the same one reached in a single step are the one scope.
 * @param {string} prefix what encloses the rules in it, "" at the top level
 * @returns {RuleScope} the scope
 */
const ruleScopeFor = (prefix) => {
	let scopes = S._ruleScopes;
	if (scopes === null) {
		scopes = new Map();
		S._ruleScopes = scopes;
	}
	let scope = scopes.get(prefix);
	if (scope === undefined) {
		/** @type {RuleScope["rules"]} */
		const rules = new Map();
		/** @type {RuleScope["selectors"]} */
		const selectors = new Map();
		/** @type {RuleScope["inner"]} */
		const inner = new Map();
		scope = {
			prefix,
			rules,
			selectors,
			inner,
			noShadow: NO_SHADOW_SCOPE_RE.test(prefix)
		};
		scopes.set(prefix, scope);
	}
	return scope;
};

/**
 * The top-level scope, where a rule nothing encloses lands.
 * @returns {RuleScope} the root scope
 */
const rootScope = () => {
	let root = S._rootRuleScope;
	if (root === null) {
		root = ruleScopeFor("");
		S._rootRuleScope = root;
	}
	return root;
};

/**
 * The scope a scope's rules land in once `head` encloses them. Memoized on the
 * scope, so the join runs once per block rather than once per rule in it.
 * @param {RuleScope} scope the scope the rules are in now
 * @param {string} head what now encloses them
 * @returns {RuleScope} the enclosing scope
 */
const enclosingRuleScope = (scope, head) => {
	// Never empty: a block whose spans are read has its opener as its key, and
	// the entries keyed "" hold no span.
	let inner = scope.inner.get(head);
	if (inner === undefined) {
		inner = ruleScopeFor(`${head}${scope.prefix}`);
		scope.inner.set(head, inner);
	}
	return inner;
};
const BARE_AT_RULE_RE = new RegExp(
	`^@(${AT_RULE_NAME_SOURCE})[ \\t\\n\\r\\f]*\\{$`,
	"i"
);

/**
 * What an opener contributes to the key the rules under it are read by. The
 * name is compared unescaped, since `@l\61yer {` opens one of these too.
 * @param {string} opener the block's prelude, its `{` included
 * @returns {string} the opener, or a token no other occurrence shares
 */
const openerKey = (opener) => {
	const bare = BARE_AT_RULE_RE.exec(opener);
	return bare !== null && atKeyword(bare[1]) === "layer"
		? `\u0000${++S._anonymousLayers}@layer{`
		: opener;
};

/**
 * Note where one rule of a streamed block stands, or that the run parts there.
 * Null for anything the join cannot read, which nothing folds across.
 * @param {number} d the block's depth
 * @param {PriorTopLevel | null} rule the rule written out, or null
 * @returns {void}
 */
const noteFrameRule = (d, rule) => {
	const list = S._frameRuleRun[d];
	if (list !== null) list.push(rule);
};
// A comment in a layer prelude, including one the sheet never closes.
const LAYER_COMMENT_RE = /\/\*[^]*?(?:\*\/|$)/g;
// WHY: a block earns the streaming machinery only once it holds enough to be
// worth releasing. `_nodeCount` restarts at each top-level node, so
// `_nodeCount - mark` is how far this block has grown; under the threshold
// `consumeABlocksContentsInto` collects into its own arrays as it does when
// nothing streams, and the rule is walked once. Tuned so that a block crossing
// only just, near its own `}`, does not activate for almost nothing back: the
// threshold sits above the few-hundred-rule `@media` a stylesheet tends to
// hold, which is what bounds what is ever buffered.
const STREAM_MIN_NODES = 16384;
// `_nodeCount` never reaches this, so a non-streaming block's per-child growth
// check is one compare that can never fire - no second code path to maintain.
const STREAM_NO_LIMIT = 0x7fffffff;

/**
 * Make an open block's frame readable, so a descendant that crosses the
 * threshold can enter and drain it on the way in. Called at most once per block,
 * and only by blocks that could still need it.
 * @param {number} d the block's depth
 * @param {Rule | undefined} rule the rule whose block this is
 * @param {number} markNode `_nodeCount` when the block opened
 * @param {number} markFlat `_listItemTop` when the block opened
 * @param {number} childBase where the block's declarations start on `_childStack`
 */
const streamPublishFrame = (d, rule, markNode, markFlat, childBase) => {
	S._frameRule[d] = /** @type {Rule} */ (rule);
	S._frameMark[d] = markNode;
	S._frameFlatMark[d] = markFlat;
	S._frameActive[d] = 0;
	S._frameChildBase[d] = childBase;
};

/**
 * Hold back the opener of a streamed rule - `prelude{`, which its prelude
 * already determines. Held rather than emitted so a block that prints to nothing
 * can still be dropped whole at its `}`.
 * @param {number} d the block's depth
 * @param {Rule} rule the open rule
 */
const streamOpen = (d, rule) => {
	const writer = /** @type {PrintContext} */ (S._stream.writer);
	const minify = writer.options.mode === "minify";
	// Bind the whole path rather than the node, since a prelude can be read in
	// terms of what encloses it: a keyframe selector is `from` only inside
	// `@keyframes`, and `streamEnterRule` binds the parent only for an `enter`.
	S._walkNode = rule;
	S._walkParent = d === 0 ? null : S._frameRule[d - 1];
	S._walkIndex = S._frameParentIndex[d];
	// A readable print starts each child on a line of its own, as
	// `streamEmitChild` does each one this block writes.
	const opener = minify
		? `${rulePrelude(A, writer, minify)}{`
		: `${d === 0 ? "" : "\n"}${rulePrelude(A, writer, minify)} {`;
	// A streamed rule writes straight through, so the rule held back for a join
	// lands before its opener - after the opener is read, since taking one clears
	// the store the prelude's own children were printed into.
	flushTopLevel(writer);
	// The parent never emits this child, so it parts the parent's run here: a
	// rule after the child joining one before it would move across the child.
	if (d !== 0) {
		const prior = S._framePrior[d - 1];
		if (prior !== null && prior.grown) orderRuleList(writer, prior);
		S._framePrior[d - 1] = null;
		noteFrameRule(d - 1, null);
	}
	S._framePendingDepth[d] = writer.pushPending(opener);
	S._frameSeenDeclarations[d] = null;
	S._frameSeenRules[d] = null;
	S._framePrior[d] = null;
	S._frameSeenLayers[d] = null;
	S._frameRuleRun[d] = minify && S._transforms.mergeRules ? [] : null;
	const layerOpener = minify ? NAMED_LAYER_BLOCK_RE.exec(opener) : null;
	S._frameLayerOpener[d] = layerOpener === null ? null : layerOpener[0];
	S._frameFirstChunk[d] = writer.markCut();
	S._frameEndsInSemicolon[d] = 0;
	const above = d === 0 ? "" : S._frameChainKey[d - 1];
	S._frameChainKey[d] =
		!minify || above === null ? null : `${above}${openerKey(opener)}`;
	// The outermost opener carries the whole run's source anchor: it is the one
	// the kept comments precede and the mapping points at.
	if (d === 0) {
		const i0 = rule;
		const start = S._starts[i0];
		const loc = S._locConverter.get(start);
		writer.anchorPending(start, loc.line - 1, loc.column);
	}
};

/**
 * Emit one finished child of a streamed block, and with it every opener still
 * held back - something inside them printed, so they are not empty after all.
 * @param {number} d the block's depth
 * @param {Node} child the finished child
 */
const streamEmitChild = (d, child) => {
	const writer = /** @type {PrintContext} */ (S._stream.writer);
	const text = writer.get(child);
	// A declaration the minifier dropped prints to nothing, and an empty rule to
	// nothing as well: neither makes the block it sits in non-empty.
	if (text.length === 0) return;
	writer.flushPending();
	const endedInSemicolon = S._frameEndsInSemicolon[d];
	S._frameEndsInSemicolon[d] =
		text.charCodeAt(text.length - 1) === CC_SEMICOLON ? 1 : 0;
	const minify = writer.options.mode === "minify";
	// Taking a dead rule or declaration back and folding two named layer blocks
	// into one are two options, so each gather below runs only where its own
	// is on.
	const dropping = minify && S._transforms.removeDeadRules;
	const merging = minify && S._transforms.mergeRules;
	if (!minify || nodeTypeOf(child) !== NodeType.Declaration) {
		const body = minify ? text : `\n${text}`;
		// Drained here and nowhere else: every path out of this branch has to take
		// the child's entry with it, or the next child reads it as its own.
		const own = drainTopLevelSpans(child);
		// A named layer block is gathered rather than written out, and a rule still
		// open to being taken back must stay one rule, so neither is offered a join.
		const positional = merging && namesPositionalAtRule(text);
		const candidate = S._prefixDropCandidate;
		const retractable = candidate !== null && candidate.node === child;
		const entry = minify ? ruleEntryOf(child, text) : null;
		// Read and cleared together: the rule before this one is offered it, and
		// anything the offer cannot take parts the run, settling the list it grew.
		const prior = S._framePrior[d];
		S._framePrior[d] = null;
		if (prior !== null) {
			if (
				dropping &&
				!positional &&
				!retractable &&
				entry !== null &&
				joinsPriorEntry(writer, prior, entry, false)
			) {
				// The grown rule is still the one the rule after it is offered.
				S._framePrior[d] = prior;
				return;
			}
			if (prior.grown) orderRuleList(writer, prior);
		}
		// The one child rule that can be taken back: a prefixed one an unprefixed
		// twin later in this block would make dead weight. Its parent never
		// assembles a body here, so the piece is what the twin drops.
		if (retractable) {
			S._prefixDropCandidate = null;
			const scope = prefixScope(S._frameRule[d]);
			// A list waiting on a twin per selector is held as the node its parent
			// would skip, and a streamed parent assembles no body - so hold the piece.
			const covering = scope.covering;
			if (covering !== null) {
				for (const one of covering) {
					if (one.node !== child) continue;
					one.piece = writer.emitRetractable(body);
					one.node = null;
					noteFrameRule(d, null);
					return;
				}
			}
			const pending = scope.pending;
			const held =
				pending === null ? undefined : pending.get(candidate.signature);
			const at = held === undefined ? -1 : held.indexOf(child);
			if (at !== -1) {
				// A streamed block's child is printed and emitted before the next one
				// prints, so it is the one rule held under its signature.
				/** @type {Map<string, Node[]>} */ (pending).delete(
					candidate.signature
				);
				if (scope.retractable === null) scope.retractable = new Map();
				holdBySignature(
					scope.retractable,
					candidate.signature,
					writer.emitRetractable(body)
				);
				noteFrameRule(d, null);
				return;
			}
		}
		// WHY: a named layer block is one layer however far its siblings stand
		// apart, so a repeat of one folds into the first, `mergeNamedLayerBlocks`
		// being that same gather for a body assembled in one go. A sibling naming a
		// layer any other way writes into one of these, and order within a layer is
		// the cascade's, so nothing folds back over it.
		if (positional) {
			// Where a layer is first named fixes its order, so nothing folds over it.
			noteFrameRule(d, null);
			const opener = namedLayerOpener(text);
			if (opener === null) {
				if (S._frameSeenLayers[d] !== null) {
					forgetLayersWritten(S._frameSeenLayers[d], text);
				}
			} else {
				let layers = S._frameSeenLayers[d];
				if (layers === null) {
					layers = new Map();
					S._frameSeenLayers[d] = layers;
				}
				const first = layers.get(opener);
				const deep = opensNestedLayer(text, opener);
				noteLayerBlock(
					layers,
					trimCssWhiteSpace(opener.slice(NAMED_LAYER_OPENER_HEAD, -1)),
					deep
				);
				// Gathering is a minifying print's, whose frames all have a chain.
				const chain = /** @type {string} */ (S._frameChainKey[d]);
				const inner = topLevelSpans(own, text);
				if (first !== undefined && !(deep && first.subtree)) {
					// Folded into a block already out, so this one ends nothing here.
					S._frameEndsInSemicolon[d] = endedInSemicolon;
					const folded = layerFoldBody(
						first,
						text.slice(opener.length),
						/** @type {RuleEntry} */ (entry)
					);
					const grown = first.taken;
					// Whatever folds in now stands between the rule a streamed block
					// ended on and any block folded in after it.
					const last = first.last;
					first.last = null;
					if (grown === undefined || inner === null) {
						writer.foldIntoRetractable(first.at, folded);
						return;
					}
					// The body lands in front of the piece's own `}`, past everything
					// already keyed in it, so only what arrives now needs moving.
					const base = grown.text.length - 1 + folded.length - text.length;
					grown.text = `${grown.text.slice(0, -1)}${folded}`;
					writer.rewriteRetractable(grown.piece, grown.text);
					for (const span of inner) span.at += base;
					noteSpans(writer, grown, inner, chain);
					joinGatheredSeam(
						writer,
						grown,
						base + opener.length,
						/** @type {RuleEntry} */ (entry),
						last
					);
					return;
				}
				const at = writer.emitRetractable(body);
				layers.set(opener, {
					at,
					subtree: false,
					semicolon: entryEndsInSemicolon(/** @type {RuleEntry} */ (entry)),
					taken:
						inner === null
							? undefined
							: takeDeduped(writer, at, body, inner, own, chain)
				});
				return;
			}
		}
		// The same rule twice in a block is read once: the later writes the same
		// declarations to the same elements and wins the tie, so it takes the
		// earlier back - as each identical declaration does below.
		if (dropping && !positional) {
			// Dropping is a minifying print's, whose frames all have a chain.
			const chain = /** @type {string} */ (S._frameChainKey[d]);
			const piece = writer.emitRetractable(body);
			// Sheet-wide, keyed on what the rule is read under: the same map the
			// collected path registers into, so the two agree across a sheet that
			// takes both.
			const spans = topLevelSpans(own, text);
			if (spans !== null) {
				const taken = takeDeduped(writer, piece, text, spans, own, chain);
				// Dropping is minifying, so the entry was read above.
				const next = priorOf(taken, /** @type {RuleEntry} */ (entry));
				S._framePrior[d] = next;
				noteFrameRule(d, next);
				return;
			}
			let rules = S._frameSeenRules[d];
			if (rules === null) {
				rules = new Map();
				S._frameSeenRules[d] = rules;
			}
			const previous = rules.get(text);
			if (previous !== undefined) writer.retract(previous);
			rules.set(text, piece);
			noteFrameRule(d, null);
			return;
		}
		writer._emit(body);
		noteFrameRule(d, null);
		return;
	}
	// A declaration is read at its own place, so nothing folds across it.
	noteFrameRule(d, null);
	// A declaration is read at its own place, so it parts the run of rules a join
	// gathers - as it does in a block whose body is assembled in one go.
	const parted = S._framePrior[d];
	if (parted !== null) {
		S._framePrior[d] = null;
		if (parted.grown) orderRuleList(writer, parted);
	}
	// Only the last of a set of identical declarations can be read, so each takes
	// back the one it repeats - the only thing here needing a piece of its own.
	// Keyed on the printed text, as the collected printer keys its own pass.
	if (!dropping) {
		writer._emit(text);
		return;
	}
	const at = writer.emitRetractable(text);
	let seen = S._frameSeenDeclarations[d];
	if (seen === null) {
		seen = new Map();
		S._frameSeenDeclarations[d] = seen;
	}
	const previous = seen.get(text);
	if (previous !== undefined) writer.retract(previous);
	seen.set(text, at);
};

/**
 * Close a streamed rule: emit its `}`, or drop the whole rule when its block
 * printed to nothing and the block itself carries no meaning.
 * @param {number} d the block's depth
 * @param {Rule} rule the rule being closed
 */
const streamClose = (d, rule) => {
	const writer = /** @type {PrintContext} */ (S._stream.writer);
	const minify = writer.options.mode === "minify";
	// The list a join grew reads the same however its rules were written, which is
	// settled once the block has no further selector to put into it.
	let prior = S._framePrior[d];
	if (prior !== null && prior.grown) orderRuleList(writer, prior);
	S._framePrior[d] = null;
	S._frameSeenDeclarations[d] = null;
	S._frameSeenRules[d] = null;
	S._frameSeenLayers[d] = null;
	const run = S._frameRuleRun[d];
	S._frameRuleRun[d] = null;
	// Every cut this block's rules make has been made, so two a cut left side by
	// side are neighbors now - as the sheet's own are once it ends.
	if (run !== null) {
		// The rule it ended on may have folded into the one before it.
		const tail = reconcileRun(writer, run);
		if (prior !== null) prior = tail;
	}
	// A streamed block is one its parent's gather never saw, so nothing folds
	// back over it - it may write into a layer already noted there.
	const layerOpener = S._frameLayerOpener[d];
	S._frameLayerOpener[d] = null;
	const above = d === 0 ? S._seenTopLevelLayers : S._frameSeenLayers[d - 1];
	if (above !== null) closeStreamedLayer(above, layerOpener);
	if (writer.isPending(S._framePendingDepth[d])) {
		// Nothing inside printed. An empty rule paints nothing, so dropping it
		// leaves the cascade as it was - but only where the block itself carries no
		// meaning (see `DROPPABLE_WHEN_EMPTY_AT_RULES`).
		const i0 = rule;
		if (
			minify &&
			S._transforms.removeDeadRules &&
			// Not while a `@namespace` after it could still be read: taking this
			// rule out would move one up to where the engine honours it.
			!(d === 0 && S._namespacePrologueOpen) &&
			// The mark is read first so it is cleared whichever reason drops the
			// rule: an unread one would ride the node back into the pool.
			(takeUnusedRule(rule) ||
				S._types[i0] === NodeType.QualifiedRule ||
				DROPPABLE_WHEN_EMPTY_AT_RULES.has(
					atKeyword(S._input.slice(S._starts[i0] + 1, S._aux0[i0]))
				))
		) {
			writer.dropPending();
			return;
		}
		writer.flushPending();
	} else if (minify) {
		// The `;` the last declaration carries is the one a `}` makes redundant.
		writer.dropTrailing(S._frameFirstChunk[d], CC_SEMICOLON);
	}
	// The block's `}` is what the one around it now ends in.
	if (d !== 0) S._frameEndsInSemicolon[d - 1] = 0;
	// Its `}` goes out as a piece of its own, so a later block of the layer it
	// opened folds in front of that - its own body is long since written out.
	if (minify && layerOpener !== null && S._transforms.mergeRules) {
		noteStreamedLayerClose(
			d,
			layerOpener,
			writer.emitRetractable("}"),
			S._frameEndsInSemicolon[d] === 1,
			prior
		);
		return;
	}
	writer._emit(minify ? "}" : "\n}");
};

/**
 * Fire an open rule's `enter` and walk its prelude - both are final at `{`.
 * @param {Rule} rule the open rule
 * @param {Node | null} parent enclosing rule
 * @param {number} index the rule's index among its siblings
 * @param {number} d the block's frame depth
 * @returns {boolean} whether `skipChildren()` declined its children
 */
const streamEnterRule = (rule, parent, index, d) => {
	const i0 = rule;
	const ty = S._types[i0];
	const b = S._walkVisitors[ty];
	if (b !== undefined && b.enter.length !== 0) {
		S._walkSkipped = false;
		S._walkNode = rule;
		S._walkParent = parent;
		S._walkIndex = index;
		const e = b.enter;
		for (let i = 0; i < e.length; i++) e[i](visitorPath);
		const skip = S._walkSkipped;
		S._walkSkipped = false;
		if (skip) {
			if (S._stream.writer === undefined) return true;
			holdSkippedVisitors();
			S._skippedFrame = d;
		}
	}
	S._within[ty]++;
	S._frameWithin[d] = 1;
	const ps = S._listStarts[i0];
	const pe = ps + S._listLengths[i0];
	const prevSupports = S._inSupportsPrelude;
	const prevMedia = S._inMediaConditionPrelude;
	const prevAtRule = S._inAtRulePrelude;
	// Body-scoped, unlike the prelude flags: the block streams past this call,
	// so `streamConsumeBlock` puts them back once its `}` is reached.
	S._framePrevProperty[d] = S._inPropertyRule ? 1 : 0;
	S._framePrevFunction[d] = S._inFunctionRule ? 1 : 0;
	S._framePrevFeatureValues[d] = S._inFeatureValuesRule ? 1 : 0;
	if (ty === NodeType.AtRule) enterAtRulePrelude(i0);
	for (let i = ps; i < pe; i++) {
		walkValue(S._listItems[i], rule, i - ps, S._stream.writer);
	}
	S._inSupportsPrelude = prevSupports;
	S._inMediaConditionPrelude = prevMedia;
	S._inAtRulePrelude = prevAtRule;
	return false;
};

/**
 * A block at `d` has grown past the threshold. Every ancestor still buffering
 * must be entered first, outermost in, so `enter` stays in source order; each
 * one then walks what it buffered (its two lists are each source-ordered, so
 * merging on start offset restores source order) before the deeper level does.
 * @param {number} d depth of the block that crossed the threshold
 */
const streamActivate = (d) => {
	for (let k = 0; k <= d; k++) {
		if (S._frameActive[k] === 1) continue;
		S._frameActive[k] = 1;
		const rule = /** @type {Rule} */ (S._frameRule[k]);
		// Claim the body slot before `enter` reads it: a streamed rule hands its
		// children to the visitors, so its block reports as empty rather than the
		// `null` of a rule with none. A later child claims above this.
		if (S._listItems.length < LIST_ITEMS_FLOOR) {
			growListItems(LIST_ITEMS_FLOOR);
		}
		S._bodyIdx[rule] = 1;
		// The enclosing block has just been activated and drained, so its rule
		// counter is exactly how many siblings precede this one.
		const parentIndex = k === 0 ? 0 : S._frameRuleIndex[k - 1]++;
		S._frameParentIndex[k] = parentIndex;
		const skipped = streamEnterRule(
			rule,
			k === 0 ? null : S._frameRule[k - 1],
			parentIndex,
			k
		);
		if (S._stream.writer !== undefined) streamOpen(k, rule);
		const walk = !skipped && S._recurseBlocks && S._walkWanted;
		S._frameWalk[k] = walk ? 1 : 0;
		const childBase = S._frameChildBase[k];
		// Every open block below the deepest is published, its children ending
		// where the next one's begin, in source order.
		const childEnd = k < d ? S._frameChildBase[k + 1] : S._childTop;
		let rn = 0;
		for (let at = childBase; at < childEnd; at++) {
			if (S._types[S._childStack[at]] !== NodeType.Declaration) rn++;
		}
		// Both counters end at what was buffered, so the children still to come
		// carry on from there whether or not this block's body was walked.
		S._frameDeclIndex[k] = childEnd - childBase - rn;
		S._frameRuleIndex[k] = rn;
		if (!walk) continue;
		// Each child keeps the sibling index the batch walk gives it.
		let di = 0;
		let ri = 0;
		for (let at = childBase; at < childEnd; at++) {
			const child = S._childStack[at];
			if (S._types[child] === NodeType.Declaration) {
				walkRule(child, rule, di++, S._stream.writer);
			} else {
				walkRule(child, rule, ri++, S._stream.writer);
			}
			if (S._stream.writer !== undefined) {
				streamEmitChild(k, child);
				S._stream.writer.dropStore();
			}
		}
	}
	// Only the deepest block may release: an ancestor's mark sits below the ids
	// its still-open descendants are using.
	if (S._nodeCount > S._nodePeak) S._nodePeak = S._nodeCount;
	if (S._listItemTop > S._listItemPeak) S._listItemPeak = S._listItemTop;
	S._nodeCount = S._frameMark[d];
	S._listItemTop = S._frameFlatMark[d];
};

/**
 * Per-child sink of an *activated* block: walk the finished child, then release
 * every id it used. Module-level (no per-rule closure) - the depth-indexed frame
 * carries the open rule, its sibling counters and its mark. A block only reaches
 * for this once it has activated, so a small block never calls it.
 * @param {Rule | Declaration} node the finished child
 */
const streamOnNode = (node) => {
	const d = S._depth - 1;
	// A child rule that streamed on its own already entered, walked and exited
	// inline and released its ids; it reaches the sink already finished.
	if (node === S._streamWalked) {
		// Already entered, printed and closed itself inline, straight into the
		// output - there is nothing left of it to emit here.
		S._streamWalked = null;
	} else if (S._frameWalk[d] === 1) {
		const index =
			nodeTypeOf(node) === NodeType.Declaration
				? S._frameDeclIndex[d]++
				: S._frameRuleIndex[d]++;
		walkRule(node, S._frameRule[d], index, S._stream.writer);
		if (S._stream.writer !== undefined) {
			streamEmitChild(d, node);
			S._stream.writer.dropStore();
		}
	}
	if (S._nodeCount > S._nodePeak) S._nodePeak = S._nodeCount;
	if (S._listItemTop > S._listItemPeak) S._listItemPeak = S._listItemTop;
	S._nodeCount = S._frameMark[d];
	S._listItemTop = S._frameFlatMark[d];
};

/**
 * Whether this block is a named `@layer` one whose layer a sibling already
 * opened. Such a block gathers into that sibling once it finishes, and the
 * gather reads its body whole - so a streamed one, whose text is out before it
 * closes, never reaches it. Holding it keeps which blocks gather off whether one
 * was small enough to assemble, as `mergeNamedLayerBlocks` says.
 *
 * Read off the source, the block's own text not being printed yet: a name the
 * printer writes differently is simply not matched, and the block streams as it
 * did before.
 * @param {Rule} rule the rule whose block follows
 * @param {number} blockStart offset of the block's `{`
 * @returns {boolean} true when the block is held for the gather
 */
const heldForLayerGather = (rule, blockStart) => {
	if (S._stream.writer === undefined || !S._transforms.mergeRules) {
		return false;
	}
	if (!isNamedLayerAtRule(rule)) return false;
	let written = S._input.slice(S._aux0[rule], blockStart);
	// A comment stands where a space may and says nothing about the name, which
	// carries no whitespace of its own - so one is taken out rather than spelled.
	// Tested for before it is taken, the great majority of preludes carrying none.
	if (written.includes("/*")) written = written.replace(LAYER_COMMENT_RE, "");
	const name = trimCssWhiteSpace(written);
	// An anonymous `@layer {` is a layer of its own and gathers with nothing.
	if (name.length === 0) return false;
	const d = S._depth;
	let opened = d === 0 ? S._sheetSourceLayers : S._frameSourceLayers[d - 1];
	if (opened === null) {
		opened = new Set();
		if (d === 0) S._sheetSourceLayers = opened;
		else S._frameSourceLayers[d - 1] = opened;
	}
	// Noted whether or not it is held, since the block after it reads this.
	if (opened.has(name)) return true;
	opened.add(name);
	return false;
};

/**
 * Consume a rule's block, streaming its children once the block grows past
 * `STREAM_MIN_NODES`. A block that stays small is handed back materialized for
 * the ordinary walk, so it costs a collect and nothing else.
 * @param {TokenStream} ts token stream
 * @param {Rule} rule the rule whose block follows
 */
const streamConsumeBlock = (ts, rule) => {
	const d = S._depth;
	const blockStart = ts.next().start;
	ts.advance();
	// Set before the descent: a streamed rule's `enter` runs inside it.
	setBlock(rule, blockStart);
	// Deeper than the frame table, lowering nesting (which writes a block's rules
	// once their parent is done) or printing a declaration list (composed whole,
	// its nodes kept) falls back to the materializing path.
	if (
		d >= STREAM_MAX_DEPTH ||
		S._loweringNesting ||
		S._blockContentsNodes !== null
	) {
		consumeABlocksContentsInto(ts);
		const body = S._bcBody;
		const c = ts.next();
		ts.discard();
		setBody(rule, body);
		setEnd(rule, c.type === TT_RIGHT_CURLY_BRACKET ? c.end : c.start);
		return;
	}
	// Nothing is written to the frame here: the block keeps its state in locals
	// and writes one only if it could still be read (see `streamPublishFrame`),
	// so a rule whose block is all declarations costs what it always did.

	// Read before the descent, which is where a child block writes it next. The
	// helper notes this block in its parent's set; the set at this depth is what
	// this block's own children write into, so it starts empty.
	S._holdForLayerGather = heldForLayerGather(rule, blockStart);
	S._frameSourceLayers[d] = null;
	S._depth = d + 1;
	if (S._depth > S._frameHighWater) S._frameHighWater = S._depth;
	consumeABlocksContentsInto(ts, undefined, d, rule);
	S._depth = d;
	const streamed = S._bcStreamed;
	const body = S._bcBody;
	const close = ts.next();
	const end = close.type === TT_RIGHT_CURLY_BRACKET ? close.end : close.start;
	if (close.type !== TT_EOF) ts.advance();
	setEnd(rule, end);
	if (!streamed) {
		// Never grew: hand the body back, so the ordinary walk visits it and
		// `A.declarations` / `A.childRules` still read it.
		setBody(rule, body);
		return;
	}
	// Streamed: `streamActivate` already claimed the body slot, empty. The exit
	// visitors still run here; the rule's own `}` follows them, where the printer
	// would have run for a rule printed in one piece.
	if (S._frameWithin[d] === 1) {
		S._within[S._types[rule]]--;
		S._frameWithin[d] = 0;
	}
	if (S._skippedFrame === d) resumeSkippedVisitors();
	exitNode(
		rule,
		d === 0 ? null : S._frameRule[d - 1],
		S._frameParentIndex[d],
		S._walkVisitors[S._types[rule]],
		undefined
	);
	if (S._stream.writer !== undefined) {
		// Its text is written already, so what a visitor gave it goes unused.
		S._stream.writer.discardReplacement(rule);
		streamClose(d, rule);
	}
	S._inPropertyRule = S._framePrevProperty[d] === 1;
	S._inFunctionRule = S._framePrevFunction[d] === 1;
	S._inFeatureValuesRule = S._framePrevFeatureValues[d] === 1;
	S._streamWalked = rule;
};

/** @typedef {{ texts: Set<string>, count: number }} ChildTextRead the texts of a block's first children `dropRepeatedChildren` read, and how many it read */
/** @typedef {{ node: Node, offset: number, line: number | undefined, column: number | undefined, entry: RuleEntry, owned: boolean, own: BlockSpans | undefined, parted: boolean }} HeldTopLevel one top-level rule held back for a join, with where it stood, what it recorded, and whether a kept comment stands above it */

/** @typedef {{ taken: TakenPiece, span: RuleSpan, entry: RuleEntry, prelude: number, grown: boolean }} PriorTopLevel the top-level rule last written out, the piece it stands in, how far into it its block starts, and whether a later rule's selectors joined its list */

/**
 * Note that a piece was taken back, where a top-level prefixed rule went out as it.
 * @param {number} piece the piece taken back
 * @returns {void}
 */
const noteRetractedPiece = (piece) => {
	if (S._prefixPieces === null) return;
	const taken = S._prefixPieces.get(piece);
	if (taken !== undefined) taken.text = "";
};

const AT_RULE_NAME_RE = new RegExp(`^@(${AT_RULE_NAME_SOURCE})`, "i");

/**
 * The name an at-rule prelude opens with, lowercased.
 * @param {string} prelude a printed at-rule's prelude, `@` included
 * @returns {string} the name
 */
const atRuleName = (prelude) =>
	// A printed at-keyword is `@` and an identifier, which the pattern reads whole.
	atKeyword(/** @type {RegExpExecArray} */ (AT_RULE_NAME_RE.exec(prelude))[1]);

// Stands for a top-level node that is one rule whatever its text ends up being,
// a qualified rule joined onto the one beside it included.
/** @type {BlockSpans} */
const WHOLE_TEXT_SPANS = Object.freeze({
	bodyAt: 0,
	prelude: "",
	keyPrelude: "",
	qualified: true,
	spans: NO_RULE_SPANS,
	parts: null,
	query: null
});

/**
 * What a finished top-level node recorded while it printed. A node id is a slot
 * the next top-level node reuses, so this reads at the one moment the node still
 * names itself - the writer holds a rule back a node, and by then it does not.
 * @param {Node} node the top-level node, freshly printed
 * @returns {BlockSpans | undefined} its entry, or undefined when it records none
 */
const drainTopLevelSpans = (node) => {
	// A child's entries were spliced off as their parent assembled its body, but a
	// block a streamed parent emitted leaves its entry behind, so only a lone
	// entry is this node's own.
	const own = S._blockSpans.length === 1 ? S._blockSpans[0] : undefined;
	S._blockSpans.length = 0;
	if (own !== undefined) return own;
	return nodeTypeOf(node) === NodeType.QualifiedRule
		? WHOLE_TEXT_SPANS
		: undefined;
};

/**
 * The spans a qualified rule's own text makes: one, or one per rule where the
 * prefix copies written before it make it several, so a later rule equal to
 * one copy takes that copy back, the dark-scheme rule it carries included.
 * @param {BlockSpans} own what the rule recorded
 * @param {string} text its printed text
 * @param {number} at where the text lands
 * @returns {RuleSpan[]} the spans
 */
const ownRuleSpans = (own, text, at) => {
	const parts = own.parts;
	if (parts === null) {
		return [
			{ scope: rootScope(), key: text, at, len: text.length, taken: null }
		];
	}
	/** @type {RuleSpan[]} */
	const out = [];
	let from = 0;
	for (const len of parts) {
		out.push({
			scope: rootScope(),
			key: text.slice(from, from + len),
			at: at + from,
			len,
			taken: null
		});
		from += len;
	}
	const query = own.query;
	if (query === null) return out;
	// The dark-scheme rules the copies carry stand in one query after them, as
	// a condition of its own: cut once its rules are, and each one a rule there.
	out.push({
		scope: rootScope(),
		key: UNKEYED,
		at: at + from,
		len: text.length - from,
		taken: null
	});
	const scope = enclosingRuleScope(rootScope(), openerKey(`${query.prelude}{`));
	from += query.prelude.length + 1;
	for (const len of query.rules) {
		out.push({
			scope,
			key: text.slice(from, from + len),
			at: at + from,
			len,
			taken: null
		});
		from += len;
	}
	return out;
};

/**
 * The rules a finished top-level node carries, where they land in its text. A
 * qualified rule is one rule however it nests; an at-rule states conditions its
 * body is read under, so its spans come out with its prelude on their keys.
 * @param {BlockSpans | undefined} own what it recorded, from {@link drainTopLevelSpans}
 * @param {string} text its printed text
 * @returns {RuleSpan[] | null} the spans, or null when it carries no rule
 */
const topLevelSpans = (own, text) => {
	if (own === undefined) return null;
	if (own === WHOLE_TEXT_SPANS) {
		return [
			{ scope: rootScope(), key: text, at: 0, len: text.length, taken: null }
		];
	}
	/** @type {RuleSpan[]} */
	const out = own.qualified ? ownRuleSpans(own, text, 0) : [];
	const spans = own.spans;
	for (let i = 0; i < spans.length; i++) {
		const span = spans[i];
		out.push({
			scope: enclosingRuleScope(span.scope, own.keyPrelude),
			key: span.key,
			at: own.bodyAt + span.at,
			len: span.len,
			taken: null
		});
	}
	return out;
};

/**
 * Take a top-level node, and with it every rule an identical later one has yet
 * to make dead. A rule already taken whose key comes round again is read for
 * nothing, so the piece holding it is written again without it - pieces are
 * joined only when the sheet ends, so one taken long ago is still reachable.
 * @param {PrintContext} writer the print context
 * @param {number} piece the piece the node was taken as
 * @param {string} text the node's printed text
 * @param {RuleSpan[]} spans where its rules land in it
 * @param {BlockSpans | undefined} own what the node recorded while printing
 * @param {string} chain what encloses it, when it is not a top-level node
 * @returns {TakenPiece} the piece, for a fold that grows it
 */
const takeDeduped = (writer, piece, text, spans, own, chain) => {
	// A block the cuts empty is one written empty here, which the printer drops -
	// but only where the block itself carries no meaning.
	const empties =
		own !== undefined &&
		own !== WHOLE_TEXT_SPANS &&
		S._transforms.removeDeadRules &&
		(own.qualified ||
			(own.prelude.charCodeAt(0) === CC_AT_SIGN &&
				DROPPABLE_WHEN_EMPTY_AT_RULES.has(atRuleName(own.prelude))))
			? own.bodyAt
			: -1;
	const taken = new TakenPiece(piece, text, empties);
	noteSpans(writer, taken, spans, chain);
	return taken;
};

/**
 * Note the rules a piece carries, taking back the piece each identical earlier
 * one went out as. Called again for the same piece as a fold grows it.
 * @param {PrintContext} writer the print context
 * @param {TakenPiece} taken the piece they landed in
 * @param {RuleSpan[]} spans where they land in it
 * @param {string} chain what encloses them, "" at the top level
 * @returns {void}
 */
const noteSpans = (writer, taken, spans, chain) => {
	keyDeferredSpan();
	// Every span joins the piece before any cutting: a cut here moves what
	// `taken.spans` holds, and one not yet pushed would keep its old offset.
	for (const span of spans) {
		if (chain.length !== 0) span.scope = enclosingRuleScope(span.scope, chain);
		span.taken = taken;
	}
	// A copy its own size: a first push would give the list room for 17, and
	// the piece holds it until the sheet ends.
	if (taken.spans.length === 0) {
		taken.spans = [...spans];
	} else {
		for (const span of spans) taken.spans.push(span);
	}
	for (const span of spans) {
		if (span.key === UNKEYED) continue;
		const rules = span.scope.rules;
		const before = rules.get(span.key);
		if (before !== undefined) {
			cutSpan(writer, /** @type {TakenPiece} */ (before.taken), before);
		}
		rules.set(span.key, span);
	}
	// After every copy is taken back, so an earlier rule a cut here left flat is
	// read as flat. A distant merge moves a block up past others, out of this order.
	if (!S._transforms.removeDeadRules || S._mergingDistantRules) return;
	// TODO add an option to make this opt-in: over the CSS corpus it costs ~10% of
	// minify CPU for 248 of 2,456,527 gzip bytes.
	for (const span of spans) {
		if (span.key !== UNKEYED && span.len !== 0) {
			shadowEarlierRule(writer, taken, span);
		}
	}
};

// `revert`, `revert-layer`, `revert-rule`: the cascade rolled back past a rule.
const ROLLBACK_RE = /^revert(?:-[a-z]+)?$/i;

// A keyframe's selector is an offset, and two blocks at one offset are not read
// as a cascade by every engine, so no keyframe is shadowed. A named layer's
// blocks are gathered into one without their rules noted, so none is there.
const NO_SHADOW_SCOPE_RE = /@(?:-[a-z]+-)?keyframes|@layer/i;

/**
 * The names a printed flat rule's declarations write, as `cascadeName` reads
 * them.
 * @param {string} rule the rule's printed text
 * @param {number} open where its `{` sits
 * @returns {Set<string>} the names
 */
const declaredNames = (rule, open) => {
	/** @type {Set<string>} */
	const names = new Set();
	for (const declaration of splitPrintedDeclarations(
		rule.slice(open + 1, -1)
	)) {
		if (declaration.indexOf(":") > 0) names.add(cascadeName(declaration));
	}
	return names;
};

/**
 * The declarations of a printed block body, split on the `;` between them; a
 * nested block is a piece of its own.
 * @param {string} body the text between a rule's braces
 * @returns {string[]} each declaration, without its `;`
 */
const splitPrintedDeclarations = (body) => {
	/** @type {string[]} */
	const out = [];
	let depth = 0;
	let quote = 0;
	let start = 0;
	for (let i = 0; i < body.length; i++) {
		const code = body.charCodeAt(i);
		if (code === CC_REVERSE_SOLIDUS) {
			i++;
		} else if (quote !== 0) {
			if (code === quote) quote = 0;
		} else if (code === CC_QUOTATION_MARK || code === CC_APOSTROPHE) {
			quote = code;
		} else if (
			code === CC_LEFT_PARENTHESIS ||
			code === CC_LEFT_SQUARE ||
			code === CC_LEFT_CURLY
		) {
			depth++;
		} else if (
			code === CC_RIGHT_PARENTHESIS ||
			code === CC_RIGHT_SQUARE ||
			code === CC_RIGHT_CURLY
		) {
			depth--;
			// A nested block ends a piece of its own, which no `;` follows.
			if (code === CC_RIGHT_CURLY && depth === 0) {
				out.push(body.slice(start, i + 1));
				start = i + 1;
			}
		} else if (code === CC_SEMICOLON && depth === 0) {
			out.push(body.slice(start, i));
			start = i + 1;
		}
	}
	if (start < body.length) out.push(body.slice(start));
	return out;
};

/**
 * The name a printed declaration is cascaded under: a custom property's as
 * written, any other lowercased.
 * @param {string} declaration a printed declaration
 * @returns {string} its name
 */
const cascadeName = (declaration) => {
	const name = declaration.slice(0, declaration.indexOf(":"));
	return name.startsWith("--") ? name : toLowerCaseIfNeeded(name);
};

/**
 * Whether one of a later rule's values for a property is read wherever an
 * earlier one is: the same value, or one spelled from its vocabulary.
 * @param {Set<string>} values the later values
 * @param {string} earlier the earlier value
 * @param {string} property the property both declarations write
 * @returns {boolean} true when no engine falls back to the earlier one
 */
const readWherever = (values, earlier, property) => {
	if (values.has(earlier)) return true;
	for (const value of values) {
		if (sameVocabulary(value, earlier, property)) return true;
	}
	return false;
};

/**
 * Take out of the latest earlier rule with the same selector, in the same
 * scope, each declaration this one writes again: the later of two equally
 * specific declarations wins wherever both match, whatever stands between.
 * @param {PrintContext} writer the print context
 * @param {TakenPiece} taken the piece the rule landed in
 * @param {RuleSpan} span the rule, within that piece
 * @returns {void}
 */
const shadowEarlierRule = (writer, taken, span) => {
	const whole = taken.text;
	const at = span.at;
	const brace = whole.indexOf("{", at);
	// Only a qualified rule: an at-rule is no one cascade. One a later cut
	// leaves flat is read as one, so every rule is noted, flat or not.
	if (
		brace <= at ||
		brace >= at + span.len ||
		whole.charCodeAt(at) === CC_AT_SIGN ||
		span.scope.noShadow
	) {
		return;
	}
	const open = brace - at;
	const selector = whole.slice(at, brace);
	const selectors = span.scope.selectors;
	const noted = selectors.get(selector);
	// A lone prior is held bare: almost every selector is written once.
	if (noted === undefined) {
		selectors.set(selector, span);
		return;
	}
	const priors = Array.isArray(noted) ? noted : [noted];
	const text = whole.slice(at, at + span.len);
	// Per name, the later values and whether one every target reads is among
	// them, and whether one of those is `!important`.
	/** @type {Map<string, { values: Set<string>, read: boolean, important: boolean }>} */
	const later = new Map();
	// Its own declarations: a rule nested in it matches other elements.
	for (const declaration of splitPrintedDeclarations(
		text.slice(open + 1, -1)
	)) {
		if (declaration.includes("{")) continue;
		const colon = declaration.indexOf(":");
		if (colon <= 0) return;
		const name = cascadeName(declaration);
		const end = printedValueEnd(declaration, colon);
		const value = declaration.slice(colon + 1, end);
		// A rollback reads back past this rule, to the earlier one among others.
		if (ROLLBACK_RE.test(value)) return;
		let entry = later.get(name);
		if (entry === undefined) {
			entry = { values: new Set(), read: false, important: false };
			later.set(name, entry);
		}
		entry.values.add(value);
		// A custom property's value is any token stream, so it always parses.
		if (name.startsWith("--") || valueReadByTarget(name, value)) {
			entry.read = true;
			if (end !== declaration.length) entry.important = true;
		}
	}
	for (const prior of priors) {
		if (prior.len === 0) continue;
		const priorTaken = /** @type {TakenPiece} */ (prior.taken);
		const before = priorTaken.text.slice(prior.at, prior.at + prior.len);
		// A prior writing none of the names this rule writes keeps all it has, so
		// it is not split again for every later rule under its selector.
		let declared = S._shadowDeclared.get(prior);
		if (declared === undefined || declared.text !== before) {
			declared = { text: before, names: declaredNames(before, open) };
			S._shadowDeclared.set(prior, declared);
		}
		let shared = false;
		for (const name of later.keys()) {
			if (declared.names.has(name)) {
				shared = true;
				break;
			}
		}
		if (!shared) continue;
		/* istanbul ignore if -- @preserve: a join grows a list only before its rule
		   is noted unless distant merges are on, which skip this; kept as the guard */
		if (
			!before.startsWith(selector) ||
			before.charCodeAt(open) !== CC_LEFT_CURLY
		) {
			continue;
		}
		// A rule still holding a nested one is left whole: only a flat one is
		// written again declaration by declaration.
		if (
			before.includes("{", open + 1) ||
			before.indexOf("}") !== before.length - 1
		) {
			continue;
		}
		/** @type {string[]} */
		const kept = [];
		let dropped = false;
		for (const declaration of splitPrintedDeclarations(
			before.slice(open + 1, -1)
		)) {
			const colon = declaration.indexOf(":");
			const entry = colon > 0 ? later.get(cascadeName(declaration)) : undefined;
			const end = entry === undefined ? 0 : printedValueEnd(declaration, colon);
			// The same value, or one of its vocabulary, fails or parses alike in both.
			if (
				entry !== undefined &&
				(entry.read ||
					readWherever(
						entry.values,
						declaration.slice(colon + 1, end),
						cascadeName(declaration)
					)) &&
				(end === declaration.length || entry.important)
			) {
				dropped = true;
			} else {
				kept.push(declaration);
			}
		}
		if (!dropped) continue;
		if (kept.length === 0) {
			cutSpan(writer, priorTaken, prior);
			continue;
		}
		rewriteSpan(writer, priorTaken, prior, `${selector}{${kept.join(";")}}`);
		rekeyShrunkSpan(writer, priorTaken, prior);
	}
	if (priors === noted) {
		priors.push(span);
	} else {
		selectors.set(selector, [/** @type {RuleSpan} */ (noted), span]);
	}
};

/**
 * Call `each` with every name a declaration of `property` could be shadowed
 * under: its own prefixes, since `margin-top` is reached by `margin`, and the
 * longhands it sets, since `inset` reaches `top` under no prefix at all. Both
 * sides of a comparison are walked this way, so either order answers alike.
 * @param {string} property a declared property name
 * @param {(name: string) => boolean | void} each stops the walk when it returns true
 * @returns {boolean} whether `each` stopped it
 */
const eachPropertyName = (property, each) => {
	let from = 0;
	for (;;) {
		const cut = property.indexOf("-", from);
		if (each(cut === -1 ? property : property.slice(0, cut)) === true) {
			return true;
		}
		if (cut === -1) break;
		from = cut + 1;
	}
	const longhands = getShorthandLonghands().get(property);
	if (longhands === undefined) return false;
	for (const longhand of longhands) {
		if (each(longhand) === true) return true;
	}
	return false;
};

/**
 * Write a piece again with one rule's selector list grown, and move the spans
 * after it on by what was written, so a later cut still names its own text.
 * @param {PrintContext} writer the print context
 * @param {TakenPiece} taken the piece the rule was taken in
 * @param {RuleSpan} span the rule whose list grows
 * @param {number} prelude how far into the rule its block starts
 * @param {string} addition the selectors to write in, their `,` included
 * @returns {void}
 */
const growSpanList = (writer, taken, span, prelude, addition) => {
	const at = span.at + prelude;
	// Built once something reads it: a run of joins grows one list at its end.
	taken.grow(at, addition);
	writer.deferRetractable(taken.piece, taken);
	const len = addition.length;
	span.len += len;
	// The rest are rules beside it or nested in its block, never one around it: a
	// grown span is a qualified piece's first, or a layer block's direct child.
	for (const other of taken.spans) {
		if (other !== span && other.at >= at) other.at += len;
	}
};

// The group rules two of which, side by side with one condition, are one block.
const JOINABLE_GROUP_RULE_RE = /^@(?:media|supports|container|layer)[\s(]/i;

/**
 * Join the group rule a gathered layer block opens with into the same group
 * rule its layer ended on: the gather is what makes the two neighbors, and the
 * later one's body goes in front of the earlier one's `}`.
 * @param {PrintContext} writer the print context
 * @param {TakenPiece} taken the piece the gather grew
 * @param {number} at where the gathered body starts in it
 * @param {RuleEntry} first the gathered block's first child, an at-rule
 * @returns {void}
 */
const joinGatheredAtRuleSeam = (writer, taken, at, first) => {
	const opener = first.text.slice(0, first.prelude + 1);
	if (
		!JOINABLE_GROUP_RULE_RE.test(opener) ||
		isAnonymousLayerPrelude(opener.slice(0, -1)) ||
		first.text.length <= opener.length + 1
	) {
		return;
	}
	/** @type {RuleSpan | undefined} */
	let before;
	/** @type {RuleSpan | undefined} */
	let after;
	for (const span of taken.spans) {
		if (span.len === 0) continue;
		if (span.at + span.len === at) before = span;
		else if (span.at === at && span.len === first.text.length) after = span;
	}
	if (before === undefined || after === undefined) return;
	// Its body closes on a block, so the later body needs no `;` in front of it.
	if (
		before.len <= opener.length + 1 ||
		!taken.text.startsWith(opener, before.at) ||
		taken.charCodeAt(before.at + before.len - 2) !== CC_RIGHT_CURLY
	) {
		return;
	}
	growSpanList(
		writer,
		taken,
		before,
		before.len - 1,
		first.text.slice(opener.length, -1)
	);
	cutSpan(writer, taken, after);
};

/**
 * Offer the pair a gathered layer block left side by side the join two siblings
 * are offered. The gather is what makes them neighbors, so nothing else ever
 * reads them as adjacent, and the same sheet minified twice would join them
 * only on the second pass.
 * @param {PrintContext} writer the print context
 * @param {TakenPiece} taken the piece the gather grew
 * @param {number} at where the gathered body starts in it
 * @param {RuleEntry} entry the gathered block's entry
 * @param {PriorTopLevel | null=} last the rule a streamed block wrote last, out in a piece of its own
 * @returns {void}
 */
const joinGatheredSeam = (writer, taken, at, entry, last) => {
	// A layer block always goes out with the entry it printed, children and all.
	const first = /** @type {RuleEntry[]} */ (entry.children)[0];
	if (first !== undefined && first.atRule && first.prelude > 0) {
		joinGatheredAtRuleSeam(writer, taken, at, first);
		return;
	}
	// Only a plain qualified rule lends its selectors, and only the whole of one:
	// a block a nested rule split is described by spans of its own.
	if (first === undefined || first.atRule || first.prelude <= 0) return;
	if (!entryListable(first)) return;
	const block = first.text.slice(first.prelude);
	/** @type {RuleSpan | undefined} */
	let before;
	/** @type {RuleSpan | undefined} */
	let after;
	// A rule nested in the one at the seam closes inside it, so only the seam's
	// own pair meets these two offsets.
	for (const span of taken.spans) {
		if (span.len === 0) continue;
		if (span.at + span.len === at) before = span;
		else if (span.at === at && span.len === first.text.length) after = span;
	}
	if (after === undefined) return;
	if (before === undefined) {
		if (last && joinsLastStreamed(writer, last, first)) {
			cutSpan(writer, taken, after);
		}
		return;
	}
	const prelude = before.len - block.length;
	if (prelude <= 0 || !taken.text.startsWith(block, before.at + prelude)) {
		return;
	}
	if (
		!isJoinablePrelude(
			taken.text.slice(before.at, before.at + prelude),
			first.listKind === LIST_KIND_KEYFRAME,
			first.listKind === LIST_KIND_NESTED
		)
	) {
		return;
	}
	// Only the selectors the list lacks, matched whole: a list already carrying
	// each one says all the rule beside it does, which then just goes.
	const carried = splitSelectorList(
		taken.text.slice(before.at, before.at + prelude)
	);
	const missing = splitSelectorList(entryPrelude(first))
		.filter((one) => !carried.includes(one))
		.join(",");
	if (missing.length !== 0) {
		growSpanList(writer, taken, before, prelude, `,${missing}`);
		rekeySpan(taken, before);
	}
	cutSpan(writer, taken, after);
	if (missing.length === 0) return;
	// Nothing else settles this list: the gathered block goes out as it stands.
	orderRuleList(writer, {
		taken,
		span: before,
		entry: first,
		prelude: prelude + 1 + missing.length,
		grown: true
	});
};

/**
 * Offer the first rule a gathered block brings to the rule a streamed block of
 * its layer ended on, which went out in a piece of its own before the `}` the
 * gather folds in front of: the two stand side by side once it has.
 * @param {PrintContext} writer the print context
 * @param {PriorTopLevel} last the rule the streamed block ended on
 * @param {RuleEntry} first the gathered block's first rule
 * @returns {boolean} true when it took the rule, which then prints nothing
 */
const joinsLastStreamed = (writer, last, first) => {
	// A rule a cut took out since stands next to nothing.
	if (last.span.len === 0 || !joinsPriorEntry(writer, last, first, false)) {
		return last.span.len !== 0 && restatesPrior(last, first);
	}
	if (last.grown) orderRuleList(writer, last);
	return true;
};

/**
 * Whether a rule only restates the one before it: the same block, and every
 * selector already in that one's list, matched whole.
 * @param {PriorTopLevel} prior the rule before it
 * @param {RuleEntry} entry the rule
 * @returns {boolean} true when the rule says nothing the one before it does not
 */
const restatesPrior = (prior, entry) => {
	const { span, taken } = prior;
	if (
		entry.prelude <= 0 ||
		entry.atRule ||
		!rangesEqual(
			taken.text,
			span.at + prior.prelude,
			span.at + span.len,
			entry.text,
			entry.prelude,
			entry.text.length
		)
	) {
		return false;
	}
	// A list holding a selector no engine reads drops whole, restating nothing.
	if (!entryListable(entry) || !entryListable(prior.entry)) return false;
	const carried = splitSelectorList(
		taken.text.slice(span.at, span.at + prior.prelude)
	);
	return splitSelectorList(entryPrelude(entry)).every((one) =>
		carried.includes(one)
	);
};

/**
 * Cut the rules a cut left empty. A block a later rule emptied says nothing the
 * printer would have written it for, and emptying it can empty the one holding
 * it, so this runs until none is left.
 * @param {PrintContext} writer the print context
 * @param {TakenPiece} taken the piece the cut was made in
 * @param {RuleSpan[]} held the rules that held what was cut, the only ones it can have emptied
 * @returns {void}
 */
const cutEmptiedSpans = (writer, taken, held) => {
	if (!S._transforms.removeDeadRules) return;
	// Every span is a rule dropped empty wherever it stands: a qualified rule, or
	// one of the at-rules `DROPPABLE_WHEN_EMPTY_AT_RULES` names (`collectRuleSpans`).
	for (const other of held) {
		const end = other.at + other.len;
		if (
			other.len > 2 &&
			taken.charCodeAt(end - 1) === CC_RIGHT_CURLY &&
			taken.charCodeAt(end - 2) === CC_LEFT_CURLY
		) {
			cutSpan(writer, taken, other);
			return;
		}
	}
};

/**
 * Write a piece again without one rule, and move the spans after it back by
 * what went, so a later cut in the same piece still names its own text.
 * @param {PrintContext} writer the print context
 * @param {TakenPiece} taken the piece the rule was taken in
 * @param {RuleSpan} span the rule to cut
 * @returns {void}
 */
const cutSpan = (writer, taken, span) => {
	if (span.len === 0) return;
	let from = span.at;
	let len = span.len;
	// The rule stood last in its block, so the `;` in front of it is one the
	// printer drops itself - it goes with the rule rather than being left behind.
	if (
		taken.charCodeAt(from + len) === CC_RIGHT_CURLY &&
		taken.charCodeAt(from - 1) === CC_SEMICOLON
	) {
		from -= 1;
		len += 1;
	}
	taken.cut(from, len);
	if (taken.empties !== -1 && taken.length === taken.empties + 1) {
		taken.text = "";
	}
	writer.deferRetractable(taken.piece, taken);
	const end = from + len;
	/** @type {RuleSpan[] | null} */
	let shrunk = null;
	for (const other of taken.spans) {
		if (other === span) continue;
		// One inside what went is gone with it. One that held it still describes
		// what is left of it, which a later copy of it restates in full, so it
		// only shrinks by what went.
		if (other.at >= from && other.at + other.len <= end) {
			other.len = 0;
		} else if (other.at <= from && other.at + other.len >= end) {
			other.len -= len;
			if (shrunk === null) shrunk = [];
			shrunk.push(other);
		} else if (other.at > from) {
			other.at -= len;
		}
	}
	span.len = 0;
	if (shrunk !== null) {
		for (const other of shrunk) rekeyShrunkSpan(writer, taken, other);
		cutEmptiedSpans(writer, taken, shrunk);
	}
};

/**
 * Key a rule a cut shrank by what it says now, which can restate another rule
 * the sheet already holds: of the two, the earlier one is dead, and goes.
 * @param {PrintContext} writer the print context
 * @param {TakenPiece} taken the piece the rule stands in
 * @param {RuleSpan} span the rule, within that piece
 * @returns {void}
 */
const rekeyShrunkSpan = (writer, taken, span) => {
	if (span.key === UNKEYED || span.len === 0) return;
	keyDeferredSpan();
	const key = taken.text.slice(span.at, span.at + span.len);
	const rules = span.scope.rules;
	const other = rules.get(key);
	rekeySpan(taken, span);
	if (other === undefined || other === span || other.len === 0) return;
	const otherTaken = /** @type {TakenPiece} */ (other.taken);
	const earlier =
		otherTaken.piece < taken.piece ||
		(otherTaken.piece === taken.piece && other.at < span.at);
	if (earlier) {
		rules.set(key, span);
		cutSpan(writer, otherTaken, other);
	} else {
		cutSpan(writer, taken, span);
	}
};

/**
 * Hand one finished top-level node to the writer, gathering a named `@layer`
 * block into the first sibling of its name - they are one layer however far
 * apart they stand, and what separates them is in another layer or in none,
 * ordered against these by the cascade rather than by where it sits, so moving
 * the later body up is not a move the cascade can see. `mergeNamedLayerBlocks`
 * is the same gather one block down. The node goes out with whatever text it
 * ended up carrying, so a block a join already grew is the one gathered into.
 * @param {PrintContext} writer the print context
 * @param {Node} node the top-level node
 * @param {number} offset the node's source offset
 * @param {number | undefined} line 0-based source line of the node's start
 * @param {number | undefined} column 0-based source column of the node's start
 * @param {string} text the text the node goes out as
 * @param {BlockSpans=} own what it recorded while printing
 * @param {RuleEntry=} entry the entry it printed, where the caller still holds it
 * @returns {TakenPiece | null} the piece it went out as, when it can still be rewritten
 */
const emitTopLevel = (writer, node, offset, line, column, text, own, entry) => {
	const printing = writer.options.mode === "minify";
	// Folding two named layer blocks into one, and taking back a rule an
	// identical later one makes dead, each answer to their own option.
	const minify = printing && S._transforms.removeDeadRules;
	// Read off the text, not the node: a block held back for a join goes out a
	// rule late, by when its node index may name the rule after it.
	const opener =
		printing && S._transforms.mergeRules ? namedLayerOpener(text) : null;
	// Nothing folds back over a kept comment - it was written above what follows
	// it - nor over a sibling naming a layer any other way, since it writes into
	// one of these and the order within a layer is the cascade's.
	const named =
		opener === null &&
		minify &&
		S._transforms.mergeRules &&
		text.charCodeAt(0) === CC_AT_SIGN
			? LAYER_STATEMENT_RE.exec(text)
			: null;
	if (S._seenTopLevelLayers !== null) {
		if (writer.hasInsertBefore(offset)) {
			S._seenTopLevelLayers.clear();
		} else if (named !== null) {
			// A statement writes into no block, only names a layer in order - so a
			// block whose sublayer it names notes that, and the rest fold past it.
			noteLayerBlock(S._seenTopLevelLayers, named[1], false);
		} else if (opener === null && minify && namesPositionalAtRule(text)) {
			S._seenTopLevelLayers.clear();
		}
	}
	if (opener === null) {
		if (named !== null) {
			// Where a layer is first named is where its block may stand.
			if (S._seenTopLevelLayers === null) S._seenTopLevelLayers = new Map();
			const key = `@layer ${named[1]}{`;
			const at = writer.takeRetractable(node, offset, line, column, text);
			if (!S._seenTopLevelLayers.has(key)) {
				S._seenTopLevelLayers.set(key, {
					at,
					subtree: false,
					statement: true
				});
			}
			return null;
		}
		if (
			S._mergingDistantRules &&
			entry !== undefined &&
			entry.text === text &&
			entry.atRule &&
			entry.prelude !== -1 &&
			gatherDistantAtRule(writer, node, offset, line, column, text, entry)
		) {
			return null;
		}
		// Taking back a rule an identical later one makes dead is a rewrite, which
		// is minifying's to make: beautifying hands back every rule it was given.
		const spans = minify ? topLevelSpans(own, text) : null;
		if (spans === null) {
			writer.take(node, offset, line, column, text);
			return null;
		}
		return takeDeduped(
			writer,
			writer.takeRetractable(node, offset, line, column, text),
			text,
			spans,
			own,
			""
		);
	}
	if (S._seenTopLevelLayers === null) S._seenTopLevelLayers = new Map();
	const first = S._seenTopLevelLayers.get(opener);
	const deep = opensNestedLayer(text, opener);
	noteLayerBlock(
		S._seenTopLevelLayers,
		trimCssWhiteSpace(opener.slice(NAMED_LAYER_OPENER_HEAD, -1)),
		deep
	);
	// The entry it was handed, never one read back by node index: that index is
	// recycled, and emission lags a node, so reading it back would find another's.
	if (first === undefined || (deep && first.subtree)) {
		S._seenTopLevelLayers.set(opener, {
			at: writer.takeRetractable(node, offset, line, column, text),
			subtree: false,
			entry,
			owned: false
		});
		return null;
	}
	if (first.statement === true) {
		writer.rewriteRetractable(first.at, text);
		first.statement = false;
		first.entry = entry;
		first.owned = false;
		return null;
	}
	// Both bodies keep their order, so the layer reads as it was written.
	const grown = first.taken;
	if (grown === undefined) {
		// Read as rules where they can be, so the pair meeting at the seam joins too
		// - the gather is what makes those two neighbors. A layer block always went
		// out with the entry it printed, which is what both of these are.
		const owned = first.owned === true;
		let before = /** @type {RuleEntry} */ (first.entry);
		const later = /** @type {RuleEntry} */ (entry);
		// Its last rule's list may wait to settle only while each block adds to it.
		const grows = owned && growsGatheredList(before, later);
		if (owned && before.unordered && !grows) {
			before = settleJoinedSeams(before);
			first.entry = before;
		}
		// What an earlier gather wrote is held nowhere else, so it grows in place.
		const joined = joinRuleEntries(before, later, owned);
		if (joined === null) {
			writer.foldIntoRetractable(first.at, text.slice(opener.length));
			// Only an empty block refuses the join, and folding one adds nothing: the
			// piece reads as the other block.
			if (/** @type {RuleEntry[]} */ (before.children).length === 0) {
				first.entry = entry;
				first.owned = false;
			}
			return null;
		}
		// A list growing at the end settles where the text is read: settled at each
		// gather, it is sorted again whole. Anything else settles now, as the next
		// gather's join reads the order it ends in.
		first.entry = grows ? joined : settleJoinedSeams(joined);
		first.owned = true;
		if (!first.gathered) first.gathered = new GatheredLayerText(first);
		writer.deferRetractable(first.at, first.gathered);
		S._layersGathered = true;
		return null;
	}
	// A streamed block is closed by a piece of its own, which carries what has
	// been folded into it so far rather than the block's own body.
	let body = text.slice(opener.length);
	const last = first.last;
	first.last = null;
	const child = /** @type {RuleEntry} */ (entry).children;
	if (
		last &&
		child &&
		child.length !== 0 &&
		body.startsWith(child[0].text) &&
		joinsLastStreamed(writer, last, child[0])
	) {
		body = body.slice(child[0].text.length);
	}
	grown.text = `${grown.text.slice(0, -1)}${layerFoldBody(
		first,
		body,
		/** @type {RuleEntry} */ (entry)
	)}`;
	writer.rewriteRetractable(grown.piece, grown.text);
	return null;
};

/**
 * Emit the rule held back for a join, as it stands. Its own text is what a
 * grown join left it with, and what it recorded while printing goes with it.
 * @param {PrintContext} writer the print context
 * @param {HeldTopLevel} held the held rule
 * @returns {TakenPiece | null} the piece it went out as
 */
const emitHeld = (writer, held) => {
	// The run of joins that built it ends here, so its list is canonical now.
	if (held.owned) {
		const canonical = canonicalizeJoined(held.entry);
		// The joins leave their spans to be read here, once: off the children they
		// wrote end to end, or off the text where ordering a seam's list rewrote it.
		if (canonical.atRule) {
			held.own =
				canonical === held.entry
					? readAtRuleSpans(canonical, null)
					: joinedAtRuleSpans(canonical);
		}
		held.entry = canonical;
	}
	const prior = S._priorTopLevel;
	S._priorTopLevel = null;
	// Its block is settled only here, so the rule beside it - offered this one
	// before it had grown - is offered it again against the block it ends up with.
	if (prior !== null && held.owned && joinsPrior(writer, prior, held)) {
		writer.flushInsertsBefore(held.offset);
		S._priorTopLevel = prior;
		return null;
	}
	const taken = emitTopLevel(
		writer,
		held.node,
		held.offset,
		held.line,
		held.column,
		held.entry.text,
		held.own,
		held.entry
	);

	const next = priorOf(taken, held.entry);
	// A block that folded into an earlier sibling stands nowhere now, so it is
	// numbered nowhere either: what it declares moved with it.
	if (S._distantAtRuleFolded) {
		S._distantAtRuleFolded = false;
	} else if (S._mergingDistantRules) {
		noteDistantRule(next, held.entry);
	}
	settlePrior(writer);
	S._priorTopLevel = next;
	if (S._topLevelRules !== null) {
		// A kept comment was written above it, so it and the one before it are not
		// neighbors whatever a later cut leaves between them.
		if (held.parted) S._topLevelRules.push(null);
		S._topLevelRules.push(next === null ? taken : next);
	}

	return taken;
};

/**
 * The piece a rule went out as, when it went out as one whole qualified rule and
 * nothing else - the only shape a later rule can still write its selectors into.
 * @param {TakenPiece | null} taken the piece it went out as
 * @param {RuleEntry} entry the rule it went out as
 * @returns {PriorTopLevel | null} what to look back at, or null for neither
 */
const priorOf = (taken, entry) => {
	if (taken === null || entry.prelude === -1 || entry.atRule) return null;
	// The whole rule is the piece's first span - `topLevelSpans` puts a qualified
	// rule's first, and a cut inside it shortens it with the text. The spans a
	// nested rule adds ride along: growing the list moves them.
	const span = taken.spans[0];
	// A rule whose selectors may not join a list is still a neighbor: the copy
	// that only restates it goes whatever its block holds. Whether they may is
	// asked of `entry` once a later rule prints the same block.
	return {
		taken,
		span,
		entry,
		prelude: entry.prelude,
		grown: false
	};
};

/**
 * Order the list a run of look-back joins grew, once that run has ended - as
 * `canonicalizeJoined` does for the run the held rule itself makes.
 * @param {PrintContext} writer the print context
 * @returns {void}
 */
const settlePrior = (writer) => {
	const prior = S._priorTopLevel;
	S._priorTopLevel = null;
	if (prior !== null && prior.grown) orderRuleList(writer, prior);
};

/**
 * Key a rule by the text it now goes out as: left under the text it was written
 * with, a later copy of that text would take back a rule that no longer says it.
 * One already standing under the new text is the later of the two, so the rule
 * only stops being one that copy can take.
 * @param {TakenPiece} taken the piece the rule stands in
 * @param {RuleSpan} span the rule, within that piece
 * @returns {void}
 */
const rekeySpan = (taken, span) => {
	keyDeferredSpan();
	// Only ever a qualified rule's span: an unkeyed one is a condition's, which
	// `rekeyShrunkSpan` skips and no join can grow, its prelude not a selector.
	dropSpanKey(span);
	keySpan(taken, span);
};

/**
 * Take a rule out of its scope's keys, where its key still names it.
 * @param {RuleSpan} span the rule
 * @returns {void}
 */
const dropSpanKey = (span) => {
	const rules = span.scope.rules;
	if (rules.get(span.key) === span) rules.delete(span.key);
};

/**
 * Key a rule by its text, unless a rule already stands under that text.
 * @param {TakenPiece} taken the piece the rule stands in
 * @param {RuleSpan} span the rule, within that piece
 * @returns {void}
 */
const keySpan = (taken, span) => {
	span.key = taken.text.slice(span.at, span.at + span.len);
	const rules = span.scope.rules;
	if (!rules.has(span.key)) rules.set(span.key, span);
};

/**
 * Order the list a join grew, and key the rule by the text it now goes out as.
 * @param {PrintContext} writer the print context
 * @param {PriorTopLevel} rule the rule whose list grew
 * @returns {void}
 */
const orderRuleList = (writer, rule) => {
	const span = rule.span;
	if (span.len === 0) return;
	const taken = rule.taken;
	const list = taken.text.slice(span.at, span.at + rule.prelude);
	const canonical = canonicalSelectorList(list);
	if (canonical === list) return;
	// Ordering also drops a selector the list grew twice, so what stands after the
	// rule in its piece moves with it.
	rewriteSpan(
		writer,
		taken,
		span,
		`${canonical}${taken.text.slice(
			span.at + rule.prelude,
			span.at + span.len
		)}`
	);
	rule.prelude = canonical.length;
	rekeySpan(taken, span);
};

/**
 * A rule where it now stands, read as an entry a join can be offered. `plain` is
 * the fast path a join takes to the block, which it reads from the text again,
 * so the text alone still decides whether the two join.
 * @param {string} text the rule, as it now stands
 * @param {number} prelude how far into it its block starts
 * @returns {RuleEntry} the entry
 */
const spanEntry = (text, prelude) => ({
	text,
	prelude,
	atRule: false,
	plain: true,
	listable: LIST_UNKNOWN,
	listKind: LIST_KIND_SELECTOR,
	children: null,
	head: "",
	unordered: false,
	list: null,
	block: null,
	declarations: null
});

/**
 * Write a piece again with one rule replaced, and move the spans after it by
 * what the new text is longer or shorter by.
 * @param {PrintContext} writer the print context
 * @param {TakenPiece} taken the piece the rule stands in
 * @param {RuleSpan} span the rule to write again
 * @param {string} text what it becomes
 * @returns {void}
 */
const rewriteSpan = (writer, taken, span, text) => {
	const at = span.at;
	const end = at + span.len;
	taken.text = `${taken.text.slice(0, at)}${text}${taken.text.slice(end)}`;
	writer.rewriteRetractable(taken.piece, taken.text);
	const delta = text.length - span.len;
	span.len = text.length;
	for (const other of taken.spans) {
		if (other === span) continue;
		// One inside the rule named the text that went: it is no rule of the sheet's
		// any more, whatever the rewrite put in its place.
		if (other.at >= at && other.at + other.len <= end) {
			other.at = at;
			other.len = 0;
		} else if (other.at <= at && other.at + other.len >= end) {
			other.len += delta;
		} else if (other.at >= end) {
			other.at += delta;
		}
	}
};

/**
 * Fold the later rule's block into the earlier one's, where the two carry the
 * same selectors and stand side by side. Read where they now stand: a cut inside
 * the earlier block is what leaves it a declaration list again.
 * @param {PrintContext} writer the print context
 * @param {PriorTopLevel} before the earlier rule
 * @param {PriorTopLevel} rule the later rule, which prints nothing once folded
 * @returns {boolean} true when it was folded
 */
const foldsNeighborBody = (writer, before, rule) => {
	const first = before.span;
	const second = rule.span;
	const merged = joinRuleEntries(
		spanEntry(
			before.taken.text.slice(first.at, first.at + first.len),
			before.prelude
		),
		spanEntry(
			rule.taken.text.slice(second.at, second.at + second.len),
			rule.prelude
		),
		false
	);
	if (merged === null) return false;
	rewriteSpan(writer, before.taken, first, merged.text);
	rekeySpan(before.taken, first);
	cutSpan(writer, rule.taken, second);
	return true;
};

/**
 * Join two top-level rules that print the same block, the later one's selectors
 * going to the earlier. Both are read where they now stand.
 * @param {PrintContext} writer the print context
 * @param {PriorTopLevel} before the earlier rule
 * @param {PriorTopLevel} rule the later rule, which prints nothing once taken
 * @returns {boolean} true when it was taken
 */
const joinsNeighbor = (writer, before, rule) => {
	const first = before.span;
	const second = rule.span;
	// Neither is cut: the run holds only rules still standing, and a join cuts
	// the later one, which leaves the run.
	const head = before.taken.text;
	const tail = rule.taken.text;
	// The same rule twice is one rule: nothing stands between them, so the later
	// copy only restates what the earlier already says.
	const same =
		before.prelude === rule.prelude &&
		rangesEqual(
			head,
			first.at,
			first.at + before.prelude,
			tail,
			second.at,
			second.at + rule.prelude
		);
	if (
		!rangesEqual(
			head,
			first.at + before.prelude,
			first.at + first.len,
			tail,
			second.at + rule.prelude,
			second.at + second.len
		)
	) {
		// Two blocks the same selectors read are one block, in the order they were
		// written - which is what the cut that brought them together left behind.
		return same && foldsNeighborBody(writer, before, rule);
	}
	if (!same) {
		if (!entryListable(before.entry) || !entryListable(rule.entry)) {
			return false;
		}
		const selector = tail.slice(second.at, second.at + rule.prelude);
		if (
			!lendSelectorsTo(writer, before.taken, first, before.prelude, selector)
		) {
			return false;
		}
		before.prelude += 1 + selector.length;
		before.grown = true;
	}
	cutSpan(writer, rule.taken, second);
	return true;
};

/**
 * Join the top-level rules that ended up side by side. A rule a cut took out
 * parts nothing, so what it stood between only meets here, once every cut a
 * later rule makes has been made.
 * @param {PrintContext} writer the print context
 * @returns {void}
 */
const reconcileTopLevel = (writer) => {
	if (S._topLevelRules !== null) reconcileRun(writer, S._topLevelRules);
};

/**
 * Join the rules of one block that ended up side by side, once every cut a later
 * rule makes has been made. A rule a cut took out parts nothing.
 * @param {PrintContext} writer the print context
 * @param {(PriorTopLevel | TakenPiece | null)[]} list where each rule of the block stands, or the piece something else went out as
 * @returns {PriorTopLevel | null} the rule the block now ends on, which a cut tail folded into, or null where something else follows it
 */
const reconcileRun = (writer, list) => {
	// The rules still standing: one taken by the rule before it leaves that one
	// next to the rule before *it*, which the block it took on may be all it needed.
	/** @type {PriorTopLevel[]} */
	const run = [];
	for (const rule of list) {
		if (rule === null || !("span" in rule)) {
			if (rule === null || rule.text.length !== 0) run.length = 0;
			continue;
		}
		if (rule.span.len === 0) continue;
		if (run.length === 0 || !joinsNeighbor(writer, run[run.length - 1], rule)) {
			run.push(rule);
			continue;
		}
		while (
			run.length > 1 &&
			joinsNeighbor(writer, run[run.length - 2], run[run.length - 1])
		) {
			run.pop();
		}
	}
	for (const rule of list) {
		if (rule !== null && "span" in rule && rule.grown) {
			orderRuleList(writer, rule);
		}
	}
	return run.length === 0 ? null : run[run.length - 1];
};

/**
 * Write the held rule's selectors into the rule before it, where the two print
 * the same block and stand side by side with nothing between.
 * @param {PrintContext} writer the print context
 * @param {PriorTopLevel} prior the rule written out before it
 * @param {HeldTopLevel} held the rule being released
 * @returns {boolean} true when they were taken, and the held rule prints nothing
 */
const joinsPrior = (writer, prior, held) =>
	joinsPriorEntry(writer, prior, held.entry, held.parted);

/**
 * Write one rule's selectors into the rule before it, where the two print the
 * same block and stand side by side with nothing between.
 * @param {PrintContext} writer the print context
 * @param {PriorTopLevel} prior the rule written out before it
 * @param {RuleEntry} entry the rule being released
 * @param {boolean} parted whether a kept comment stands between the two
 * @returns {boolean} true when they were taken, and the later rule prints nothing
 */
const joinsPriorEntry = (writer, prior, entry, parted) => {
	if (!S._transforms.mergeRules) return false;
	if (entry.prelude === -1 || entry.atRule) return false;
	// A kept comment between the two was written above the later rule, which is
	// read where it still stands rather than here, the flush having cleared it.
	if (parted) return false;
	// Read where the rule now stands, never where it was taken: a cut inside its
	// block, or a list this already grew, leaves the entry it went out as stale.
	// Nothing taken since it went out can have cut it whole.
	const span = prior.span;
	const taken = prior.taken;
	if (
		!taken.rangeEquals(
			span.at + prior.prelude,
			span.at + span.len,
			entry.text,
			entry.prelude,
			entry.text.length
		)
	) {
		return false;
	}
	// After the blocks compare, which almost none do: the shape test is a regex.
	if (!entryListable(entry) || !entryListable(prior.entry)) return false;
	// The same rule twice is one rule: nothing stands between them, so the later
	// copy only restates what the earlier already says.
	if (
		prior.prelude === entry.prelude &&
		taken.rangeEquals(
			span.at,
			span.at + prior.prelude,
			entry.text,
			0,
			entry.prelude
		)
	) {
		return true;
	}
	if (
		!lendSelectorsTo(
			writer,
			prior.taken,
			span,
			prior.prelude,
			entryPrelude(entry)
		)
	) {
		return false;
	}
	prior.prelude += 1 + entry.prelude;
	prior.grown = true;
	return true;
};

/**
 * Hold a top-level at-rule stating a condition, or fold one into an earlier
 * sibling stating the same. Its block's rules move to where that one's end, so
 * only what stands between the two can read differently for them.
 * @param {PrintContext} writer the print context
 * @param {Node} node the at-rule
 * @param {number | undefined} offset its source offset
 * @param {number | undefined} line its 0-based source line
 * @param {number | undefined} column its 0-based source column
 * @param {string} text the at-rule as printed
 * @param {RuleEntry} entry the rule it goes out as
 * @returns {boolean} true when it was folded or held, so nothing else takes it
 */
const gatherDistantAtRule = (
	writer,
	node,
	offset,
	line,
	column,
	text,
	entry
) => {
	const prelude = text.slice(0, entry.prelude);
	// A layer is not a condition stated twice: a named one sits where its name
	// was first written, and an anonymous one opens a layer of its own. The join
	// refuses both, so this only keeps the piece from being held for one.
	if (atRuleName(prelude) === "layer") return false;
	const seen = S._distantAtRules.get(prelude);
	if (seen === undefined) {
		// `noteDistantRule` numbers this node next, so that is where it stands.
		S._distantAtRules.set(prelude, {
			at: writer.takeRetractable(node, offset, line, column, text),
			entry,
			seq: S._distantSeq + 1
		});
		return true;
	}
	const declared = atRuleDeclaredProperties(entry);
	if (declared === null) return false;
	// Anything the walk could not see into declares everything, which is how an
	// at-rule between two of these ends the gather.
	if (shadowedSince(declared, seen.seq, entrySubjectTypes(entry))) {
		return false;
	}
	const joined = joinRuleEntries(seen.entry, entry, false);
	if (joined === null) return false;
	// The rule it folded into goes out as it stands, so its seam settles now.
	const merged = settleJoinedSeams(joined);
	writer.rewriteRetractable(seen.at, merged.text);
	seen.entry = merged;
	S._distantAtRuleFolded = true;
	return true;
};

/**
 * Whether a top-level rule after the one numbered `seq` declared `name` for an
 * element the subjects can be - any element, where they are null.
 * @param {string} name a property name, `all`, or `*` for any property
 * @param {number} seq where the candidate's block was held
 * @param {Set<string> | null} subjects the candidate's subject types
 * @returns {boolean} true when such a declaration came since
 */
const declaredSince = (name, seq, subjects) => {
	const at = S._distantDeclaredAt.get(name);
	if (at !== undefined && at > seq) return true;
	if (subjects === null) {
		const typed = S._distantTypedDeclaredAt.get(name);
		return typed !== undefined && typed > seq;
	}
	for (const type of subjects) {
		const typed = S._distantTypeDeclaredAt.get(`${type} ${name}`);
		if (typed !== undefined && typed > seq) return true;
	}
	return false;
};

/**
 * Whether a block declaring `properties` would read differently moved back to
 * where the one numbered `seq` was held: `all` there is shadowed by anything.
 * @param {Iterable<string>} properties the moved block's properties
 * @param {number} seq where the earlier block was held
 * @param {Set<string> | null} subjects the moved selectors' subject types
 * @returns {boolean} true when a rule since declares what it does
 */
const shadowedSince = (properties, seq, subjects) => {
	const since = (/** @type {string} */ name) =>
		declaredSince(name, seq, subjects);
	if (since("all")) return true;
	for (const property of properties) {
		if (property === "all" ? since("*") : eachPropertyName(property, since)) {
			return true;
		}
	}
	return false;
};

/**
 * Note a top-level node the walk has just passed: what it declares, so a later
 * candidate knows whether anything since can shadow its block, and the node
 * itself when a later rule printing the same block could join its selectors.
 * Anything but a plain qualified rule is taken as declaring everything - an
 * at-rule holds rules this cannot see into.
 * @param {PriorTopLevel | null} rule the whole rule it went out as, when it did
 * @param {RuleEntry} entry the rule it went out as
 * @returns {void}
 */
const noteDistantRule = (rule, entry) => {
	S._distantSeq++;
	const plain = entry.prelude !== -1 && !entry.atRule && entry.plain;
	// A condition only narrows which elements read the block it holds, so an
	// at-rule this can read shadows what its own rules declare and no more.
	const written = plain
		? blockProperties(entry.text.slice(entry.prelude + 1, -1))
		: entry.prelude !== -1 && entry.atRule && readableCondition(entry)
			? atRuleDeclaredProperties(entry)
			: null;
	if (written === null || hasEscapedName(written)) {
		S._distantDeclaredAt.set("all", S._distantSeq);
		return;
	}
	const seq = S._distantSeq;
	const subjects = entrySubjectTypes(entry);
	const note = (/** @type {string} */ name) => {
		if (subjects === null) {
			S._distantDeclaredAt.set(name, seq);
			return;
		}
		S._distantTypedDeclaredAt.set(name, seq);
		for (const type of subjects) {
			S._distantTypeDeclaredAt.set(`${type} ${name}`, seq);
		}
	};
	if (written.size !== 0) note("*");
	for (const property of written) {
		eachPropertyName(property, note);
	}
	if (!plain) return;
	if (rule !== null) {
		S._distantSelectors.set(entryPrelude(entry), { rule, seq: S._distantSeq });
	}
	const block = entry.text.slice(entry.prelude);
	// One selector an engine cannot parse invalidates the list it stands in, so a
	// rule that cannot lend its selectors cannot borrow one either.
	if (rule === null || !entryListable(entry) || S._distantRules.has(block)) {
		return;
	}
	S._distantRules.set(block, { rule, seq: S._distantSeq });
};

/**
 * Note what a rule a distant join moved declares, at the place it moved to:
 * a later join moving past that place passes it, one moving to it does not.
 * @param {RuleEntry} entry the moved rule
 * @param {number} seq where the rule it joined was held
 * @returns {void}
 */
const noteMovedDeclarations = (entry, seq) => {
	const written = blockProperties(entry.text.slice(entry.prelude + 1, -1));
	const subjects = entrySubjectTypes(entry);
	/**
	 * @param {Map<string, number>} map a declared-at index
	 * @param {string} key the name it is keyed by
	 */
	const raise = (map, key) => {
		const at = map.get(key);
		if (at === undefined || at < seq) map.set(key, seq);
	};
	/**
	 * @param {string} name a property name it declares
	 */
	const note = (name) => {
		if (subjects === null) {
			raise(S._distantDeclaredAt, name);
			return;
		}
		raise(S._distantTypedDeclaredAt, name);
		for (const type of subjects) {
			raise(S._distantTypeDeclaredAt, `${type} ${name}`);
		}
	};
	if (written.size !== 0) note("*");
	for (const property of written) eachPropertyName(property, note);
};

/**
 * Whether a property set holds a name written with an escape, which the
 * distant merges compare as written and so cannot tell what it declares.
 * @param {Iterable<string>} properties the properties
 * @returns {boolean} true when one holds a `\\`
 */
const hasEscapedName = (properties) => {
	for (const property of properties) {
		if (property.includes("\\")) return true;
	}
	return false;
};

/**
 * Give an earlier rule printing the same block this one's selectors, where the
 * cascade cannot tell: nothing between the two declares what the block does.
 * @param {PrintContext} writer the print context
 * @param {RuleEntry} entry the rule offering its selectors
 * @returns {boolean} true when it was taken, and this rule prints nothing
 */
const mergeIntoDistantRule = (writer, entry) => {
	if (entry.prelude === -1 || entry.atRule || !entryListable(entry)) {
		return false;
	}
	const block = entry.text.slice(entry.prelude);
	const found = S._distantRules.get(block);
	if (found === undefined) return false;
	// A rule a later copy already took back carries nothing to join.
	const { taken, span } = found.rule;
	if (span.len === 0) {
		S._distantRules.delete(block);
		return false;
	}
	// A block repeated at a distance already compresses on its own, so a merge
	// earns wire bytes only where the copy it drops is worth twice the selector.
	if (block.length <= 2 * entry.prelude) return false;
	if (
		shadowedSince(
			blockProperties(block.slice(1, -1)),
			found.seq,
			entrySubjectTypes(entry)
		)
	) {
		return false;
	}
	// Where the block starts in the rule as it now stands - a list this already
	// grew is longer than the one that was taken.
	const preludeNow = span.len - block.length;
	if (!lendSelectorsTo(writer, taken, span, preludeNow, entryPrelude(entry))) {
		return false;
	}
	// The look-back join reads the list's length off this record, which would
	// otherwise still name the list as it was taken.
	found.rule.prelude = span.len - block.length;
	return true;
};

/**
 * Write a rule's declarations into the last earlier rule under the same
 * selector list, where the cascade cannot tell: nothing between the two
 * declares what this one does. `.a{color:red}@media print{.a{top:0}}.a{left:0}`
 * is `.a{color:red;left:0}@media print{.a{top:0}}`.
 * @param {PrintContext} writer the print context
 * @param {RuleEntry} entry the later rule
 * @returns {boolean} true when it was taken, and this rule prints nothing
 */
const joinIntoDistantSelector = (writer, entry) => {
	if (entry.prelude === -1 || entry.atRule || !entry.plain) return false;
	const prelude = entryPrelude(entry);
	const found = S._distantSelectors.get(prelude);
	if (found === undefined || found.rule === S._priorTopLevel) return false;
	const { taken, span } = found.rule;
	const before = taken.text.slice(span.at, span.at + span.len);
	// A list a merge grew since, or a block a cut emptied, is no longer that rule.
	if (
		span.len === 0 ||
		!before.startsWith(prelude) ||
		before.charCodeAt(prelude.length) !== CC_LEFT_CURLY
	) {
		S._distantSelectors.delete(prelude);
		return false;
	}
	const earlier = blockDeclarations(before.slice(prelude.length + 1, -1));
	if (earlier === null || earlier.length === 0) return false;
	const properties = blockProperties(entry.text.slice(entry.prelude + 1, -1));
	if (
		hasEscapedName(properties) ||
		shadowedSince(properties, found.seq, entrySubjectTypes(entry))
	) {
		return false;
	}
	const merged = joinRuleEntries(
		plainRuleEntry(prelude, earlier),
		entry,
		false
	);
	if (merged === null) return false;
	rewriteSpan(writer, taken, span, merged.text);
	rekeySpan(taken, span);
	// What it declares now stands where the earlier rule does.
	noteMovedDeclarations(entry, found.seq);
	// The rule now prints another block, so it is keyed by that one.
	const oldBlock = before.slice(prelude.length);
	const keyed = S._distantRules.get(oldBlock);
	if (keyed !== undefined && keyed.rule === found.rule) {
		S._distantRules.delete(oldBlock);
		const newBlock = merged.text.slice(merged.prelude);
		if (!S._distantRules.has(newBlock)) S._distantRules.set(newBlock, keyed);
	}
	return true;
};

/**
 * Write one rule's selectors into a rule already out, and key that rule by the
 * list it now carries.
 * @param {PrintContext} writer the print context
 * @param {TakenPiece} taken the piece the earlier rule stands in
 * @param {RuleSpan} span the earlier rule, within that piece
 * @param {number} preludeNow how far into it its block starts, as it now stands
 * @param {string} selector the selectors offered, as one list
 * @returns {boolean} true when they were taken, and that rule prints nothing
 */
const lendSelectorsTo = (writer, taken, span, preludeNow, selector) => {
	const end = span.at + preludeNow;
	if (listCarries(taken, span.at, end, selector)) return false;
	deferSpanKey(taken, span);
	growSpanList(writer, taken, span, preludeNow, `,${selector}`);
	const pieces = selector.split(",");
	for (let i = 0; i < pieces.length; i++) S._lentPieces.add(pieces[i]);
	S._lentEnd = end + 1 + selector.length;
	S._lentEdits = taken.edits;
	return true;
};

/**
 * Whether a selector list already carries a selector, which would then only be
 * written twice. Read as text, so a `,` inside one costs a join rather than
 * correctness: the selector is in the list where `,selector,` is in `,list,`.
 * @param {TakenPiece} taken the piece the list stands in
 * @param {number} at where the list starts
 * @param {number} end where it ends
 * @param {string} selector the selectors offered, as one list
 * @returns {boolean} true when the list carries them
 */
const listCarries = (taken, at, end, selector) => {
	if (
		S._lentPiece !== taken ||
		S._lentAt !== at ||
		S._lentEnd !== end ||
		S._lentEdits !== taken.edits
	) {
		const list = taken.text.slice(at, end);
		if (`,${list},`.includes(`,${selector},`)) return true;
		S._lentPiece = taken;
		S._lentAt = at;
		S._lentPieces = new Set(list.split(","));
		return false;
	}
	// A piece the list lacks is a `,`-bounded run it cannot hold.
	const pieces = selector.split(",");
	for (let i = 0; i < pieces.length; i++) {
		if (!S._lentPieces.has(pieces[i])) return false;
	}
	if (pieces.length === 1) return true;
	return `,${taken.text.slice(at, end)},`.includes(`,${selector},`);
};

/**
 * Take a rule a lend grew out of its scope's keys until one is read. Only one
 * rule waits at a time, so the keys are set in the order eager keying sets them.
 * @param {TakenPiece} taken the piece the rule stands in
 * @param {RuleSpan} span the rule, within that piece
 * @returns {void}
 */
const deferSpanKey = (taken, span) => {
	if (S._deferredKeySpan === span) return;
	keyDeferredSpan();
	dropSpanKey(span);
	S._deferredKeySpan = span;
	S._deferredKeyTaken = taken;
};

/**
 * Key the rule a run of lends grew by the text it now goes out as, before its
 * text changes or a scope's keys are read.
 * @returns {void}
 */
const keyDeferredSpan = () => {
	const span = S._deferredKeySpan;
	if (span === null) return;
	const taken = /** @type {TakenPiece} */ (S._deferredKeyTaken);
	S._deferredKeySpan = null;
	S._deferredKeyTaken = null;
	keySpan(taken, span);
};

/**
 * Order the selector list of every distant rule a merge grew. The merges
 * append to keep a run of them linear, so the list is ordered once, here,
 * where the sheet leaves no further selector to append.
 * @param {PrintContext} writer the print context
 * @returns {void}
 */
const orderDistantLists = (writer) => {
	for (const found of S._distantRules.values()) {
		// Read off the record: a neighbor folded in since may have changed the
		// block it was keyed by, never the list.
		const { span, taken, prelude } = found.rule;
		if (span.len === 0) continue;
		const at = span.at;
		const list = taken.text.slice(at, at + prelude);
		const canonical = canonicalSelectorList(list);
		// A merge refuses a selector the list carries, so nothing is deduplicated
		// away here and the rule keeps the length it was written at.
		if (canonical === list) continue;
		taken.text = `${taken.text.slice(0, at)}${canonical}${taken.text.slice(
			at + prelude
		)}`;
		writer.rewriteRetractable(taken.piece, taken.text);
		span.key = taken.text.slice(at, at + span.len);
	}
};

/**
 * Merge the box families whose four longhands two joined blocks wrote between
 * them, as `mergeBoxLonghands` does for one block, so the join prints what the
 * one rule written whole would.
 * @param {PrintedDeclaration[]} declarations the joined block's declarations
 * @returns {PrintedDeclaration[]} them, each family it could merge merged
 */
const mergeJoinedBoxLonghands = (declarations) => {
	if (!S._transforms.mergeLonghands) return declarations;
	/** @type {Map<string, number>} */
	const at = new Map();
	/** @type {Set<string>} */
	const repeated = new Set();
	for (let i = 0; i < declarations.length; i++) {
		const property = declarations[i].property;
		if (at.has(property)) repeated.add(property);
		at.set(property, i);
	}
	/** @type {string[] | null} */
	let texts = null;
	for (const [shorthand, longhands] of BOX_LONGHANDS) {
		if (shorthand === "inset" && !S._insetShorthandAllowed) continue;
		/** @type {number[]} */
		const indexes = [];
		for (const longhand of longhands) {
			const index = at.get(longhand);
			if (index === undefined || repeated.has(longhand)) break;
			indexes.push(index);
		}
		if (indexes.length !== longhands.length) continue;
		const first = Math.min(...indexes);
		const last = Math.max(...indexes);
		// The merge moves what stands between the four below the shorthand, so
		// nothing between may be read against a later one (see `mergeBoxLonghands`).
		const family = /** @type {string} */ (BOX_FAMILY_PREFIX.get(shorthand));
		let blocked = false;
		for (let i = first + 1; i < last && !blocked; i++) {
			if (indexes.includes(i)) continue;
			blocked = blocksMerge(
				declarations[i].property,
				longhands.filter((_, k) => indexes[k] > i),
				[family]
			);
		}
		if (blocked) continue;
		const important = PRINTED_IMPORTANT_RE.test(declarations[first].text);
		/** @type {string[]} */
		const values = [];
		for (const index of indexes) {
			const value = declarations[index].value;
			if (PRINTED_IMPORTANT_RE.test(value) !== important) break;
			const bare = value.replace(PRINTED_IMPORTANT_RE, "");
			if (splitTopLevelSpaces(bare).length !== 1) break;
			values.push(bare);
		}
		if (values.length !== longhands.length) continue;
		if (mixesBareNumberWithLength(values)) continue;
		const box = collapseBox(values);
		if (box === null) continue;
		if (texts === null) texts = declarations.map((one) => one.text);
		texts[first] = `${shorthand}:${joinSlots(box)}${
			important ? "!important" : ""
		}`;
		for (const index of indexes) if (index !== first) texts[index] = "";
	}
	if (texts === null) return declarations;
	/** @type {PrintedDeclaration[]} */
	const out = [];
	for (let i = 0; i < texts.length; i++) {
		const text = texts[i];
		if (text.length === 0) continue;
		if (text === declarations[i].text) {
			out.push(declarations[i]);
			continue;
		}
		const colon = text.indexOf(":");
		out.push({
			property: text.slice(0, colon),
			value: text.slice(colon + 1),
			text
		});
	}
	return out;
};

/**
 * Where the rules of an at-rule a join wrote stand in it, read off its children:
 * a later copy under the same condition takes one back as it would out of either
 * block standing alone.
 * @param {RuleEntry} merged the at-rule, or one block of it
 * @returns {BlockSpans} what the at-rule records
 */
const joinedAtRuleSpans = (merged) =>
	readAtRuleSpans(merged, merged.text.slice(merged.prelude + 1, -1));

/**
 * `joinedAtRuleSpans` read off a body, or, without one, off children standing
 * end to end, as `joinRuleEntries` writes them.
 * @param {RuleEntry} merged the at-rule, or one block of it
 * @param {string | null} body its body, or null where its children stand end to end
 * @returns {BlockSpans} what the at-rule records
 */
const readAtRuleSpans = (merged, body) => {
	// An at-rule's entry is always built with its children, never `null`.
	const children = /** @type {RuleEntry[]} */ (merged.children);
	/** @type {RuleSpan[]} */
	const spans = [];
	let at = 0;
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		let length = child.text.length;
		if (body !== null) {
			// Rules sit side by side, but declarations written straight into the
			// block are parted with `;`, so each child is found where it landed.
			let found = body.indexOf(child.text, at);
			// The block's last declaration prints without its `;`.
			if (found === -1 && child.text.endsWith(";")) {
				length--;
				found = body.indexOf(child.text.slice(0, -1), at);
			}
			if (found === -1 || /[^;]/.test(body.slice(at, found))) {
				return WHOLE_TEXT_SPANS;
			}
			at = found;
		}
		if (child.prelude === -1) {
			// What no join reads is noted as nothing to take back, which costs at most
			// a copy of what it holds; the rules beside it stay ones to take.
			at += length;
			continue;
		}
		// Each child lands as `collectRuleSpans` notes it: a qualified rule is one
		// span whatever it nests, a block's own rules move in under its prelude.
		if (!child.atRule) {
			spans.push({
				scope: rootScope(),
				key: child.text,
				at,
				len: child.text.length,
				taken: null
			});
		} else {
			const inner = joinedAtRuleSpans(child);
			if (inner === WHOLE_TEXT_SPANS) return WHOLE_TEXT_SPANS;
			if (DROPPABLE_WHEN_EMPTY_AT_RULES.has(atRuleName(inner.prelude))) {
				spans.push({
					scope: rootScope(),
					key: UNKEYED,
					at,
					len: child.text.length,
					taken: null
				});
			}
			for (const span of inner.spans) {
				spans.push({
					scope: enclosingRuleScope(span.scope, inner.keyPrelude),
					key: span.key,
					at: at + inner.bodyAt + span.at,
					len: span.len,
					taken: null
				});
			}
		}
		at += child.text.length;
	}
	if (body !== null && /[^;]/.test(body.slice(at))) return WHOLE_TEXT_SPANS;
	const prelude = entryPrelude(merged);
	return {
		bodyAt: merged.prelude + 1,
		prelude,
		keyPrelude: openerKey(`${prelude}{`),
		qualified: false,
		spans,
		parts: null,
		query: null
	};
};

/**
 * Where the rules of two joined top-level rules stand in the rule they became.
 * The join writes a text of its own, so each side's rules are rebased into it -
 * or, for a shape whose geometry is not read here, given up for the whole rule,
 * which is then all a later copy can take back.
 * @param {RuleEntry} before the earlier rule, as it stood
 * @param {BlockSpans | undefined} beforeOwn what the earlier rule recorded
 * @param {RuleEntry} entry the later rule, as it stood
 * @param {BlockSpans | undefined} own what the later rule recorded
 * @param {RuleEntry} merged the one rule they joined into
 * @returns {BlockSpans | undefined} what the joined rule records
 */
const joinedSpans = (before, beforeOwn, entry, own, merged) => {
	// The later rule only restated the earlier: nothing was written, so nothing
	// the earlier recorded has moved.
	if (merged === before) return beforeOwn;
	// A run of at-rule joins is read where it ends (`emitHeld`), once: read per
	// join, the block it grows would be read again by each.
	if (merged.atRule) return undefined;
	if (beforeOwn === undefined || beforeOwn === WHOLE_TEXT_SPANS) {
		return WHOLE_TEXT_SPANS;
	}
	// Only the block join, which appends the later body whole behind an earlier one
	// holding no rules: a list join lends to a block of declarations, which holds none.
	if (
		merged.prelude !== before.prelude ||
		own === undefined ||
		own === WHOLE_TEXT_SPANS ||
		beforeOwn.spans.length !== 0
	) {
		return WHOLE_TEXT_SPANS;
	}
	const prelude = entryPrelude(merged);
	const length = entry.text.length - entry.prelude - 2;
	const at = merged.text.length - 1 - length - (merged.prelude + 1);
	const shift = at + own.bodyAt - (entry.prelude + 1);
	/** @type {RuleSpan[]} */
	const spans = [];
	for (const span of own.spans) {
		spans.push({
			scope: span.scope,
			key: span.key,
			at: span.at + shift,
			len: span.len,
			taken: null
		});
	}
	return {
		bodyAt: merged.prelude + 1,
		prelude,
		keyPrelude: openerKey(`${prelude}{`),
		qualified: true,
		spans,
		parts: null,
		query: null
	};
};

/**
 * Hand a finished top-level node to the writer, holding a qualified rule back
 * one node so an adjacent one printing the same block can join its selectors.
 * @param {Node} node the top-level node
 * @param {PrintContext} writer the print context
 * @param {number} offset the node's source offset
 * @param {number=} line 0-based source line of the node's start, when mapping
 * @param {number=} column 0-based source column of the node's start, when mapping
 * @returns {void}
 */
const takeTopLevel = (node, writer, offset, line, column) => {
	const held = S._heldTopLevel;
	// The node's own text first - taking the held one clears the store it sits in.
	const own = writer.get(node);
	// Read where the node stands rather than where it is emitted: the writer holds
	// a rule back one node, by when the prologue has closed behind it. A rule in
	// front of a `@namespace` is never offered, as taking it back moves one up.
	const drained = drainTopLevelSpans(node);
	const spans = S._namespacePrologueOpen ? undefined : drained;
	const entry = ruleEntryOf(node, own);
	// A prefixed rule an unprefixed twin would make dead weight goes out as its own
	// piece, so the twin can take it back from wherever it stands. It is not
	// offered for joining: a rule that may be taken back is one piece.
	const candidate = S._prefixDropCandidate;
	S._prefixDropCandidate = null;
	if (candidate !== null && candidate.node === node) {
		if (held !== null) {
			S._heldTopLevel = null;
			emitHeld(writer, held);
		}
		const at = writer.takeRetractable(node, offset, line, column, own);
		settlePrior(writer);
		if (S._topLevelRules !== null) {
			const taken = new TakenPiece(at, own, -1);
			if (S._prefixPieces === null) S._prefixPieces = new Map();
			S._prefixPieces.set(at, taken);
			S._topLevelRules.push(taken);
		}
		// Noted without its piece: one still open to being retracted is not one a
		// later rule may put its selectors into.
		if (S._mergingDistantRules) noteDistantRule(null, entry);
		const scope = prefixScope(null);
		// A list still short of a twin for some selector waits on all of them, so
		// its piece is held with what it is waiting for rather than by signature.
		if (candidate.missing !== null) {
			if (scope.covering === null) scope.covering = [];
			scope.covering.push({
				missing: candidate.missing,
				piece: at,
				node: null
			});
			return;
		}
		if (scope.retractable === null) scope.retractable = new Map();
		holdBySignature(scope.retractable, candidate.signature, at);
		return;
	}
	const runs = entry.prelude === -1 ? hoistedRunsOf(node) : null;
	if (runs !== null) {
		for (let i = 0; i < runs.length; i++) {
			// The first stands where the node does, so it is keyed as `spans` is; the
			// rest follow a rule of the node's own, which closes the prologue.
			takeTopLevelEntry(
				node,
				writer,
				offset,
				line,
				column,
				runs[i],
				i === 0 && S._namespacePrologueOpen ? undefined : WHOLE_TEXT_SPANS
			);
		}
		return;
	}
	takeTopLevelEntry(node, writer, offset, line, column, entry, spans);
};

/**
 * Take one top-level rule the writer can read an entry off: held for a join,
 * merged into a distant one, or emitted as it stands.
 * @param {Node} node the top-level node it came from
 * @param {PrintContext} writer the print context
 * @param {number} offset the node's source offset
 * @param {number | undefined} line 0-based source line of the node's start
 * @param {number | undefined} column 0-based source column of the node's start
 * @param {RuleEntry} entry the rule
 * @param {BlockSpans | undefined} spans what it recorded while printing
 * @returns {void}
 */
const takeTopLevelEntry = (
	node,
	writer,
	offset,
	line,
	column,
	entry,
	spans
) => {
	const held = S._heldTopLevel;
	const own = entry.text;
	if (entry.prelude === -1) {
		// Not a rule this can join: flush what is held, then take it as it stands. A
		// node printing nothing leaves the two around it adjacent, its kept comments
		// queued where it stood, blocking a join across that gap until they land.
		if (own.length === 0) return;
		if (held !== null) {
			S._heldTopLevel = null;
			emitHeld(writer, held);
		}
		const taken = emitTopLevel(writer, node, offset, line, column, own, spans);
		settlePrior(writer);
		if (S._topLevelRules !== null) S._topLevelRules.push(taken);
		// Anything this cannot see into stands in the way of every later merge,
		// which is what noting a node that is not a plain rule spells.
		if (S._mergingDistantRules) noteDistantRule(null, entry);
		return;
	}
	// A kept comment between the two was written above the second rule. Read once:
	// the flush below clears it, and the hold carries the answer on to its release.
	const parted = writer.hasInsertBefore(offset);
	if (held !== null && !parted) {
		const before = held.entry;
		const merged = joinRuleEntries(before, entry, held.owned);
		if (merged !== null) {
			// The join writes a text of its own, so what either side recorded names a
			// text that is gone: rebased, a rule inside it is still one a copy can take.
			held.own = joinedSpans(before, held.own, entry, spans, merged);
			held.entry = merged;
			held.owned = true;
			return;
		}
	}
	if (held !== null) {
		emitHeld(writer, held);
	}
	if (
		S._mergingDistantRules &&
		(mergeIntoDistantRule(writer, entry) ||
			joinIntoDistantSelector(writer, entry))
	) {
		// Its selectors went into a rule already out, so it prints nothing itself
		// - and the one held is out too, so nothing is left to emit again.
		S._heldTopLevel = null;
		writer.flushInsertsBefore(offset);
		return;
	}
	// What was written above this rule is emitted above it now, so the next
	// node's check sees only the gap between the two - and nothing folds back
	// over it, so the layer blocks above it stop being ones to gather into.
	if (S._seenTopLevelLayers !== null && parted) {
		S._seenTopLevelLayers.clear();
	}
	if (S._distantAtRules.size !== 0 && parted) S._distantAtRules.clear();
	// Nor does a later rule shadow one written above the comment.
	if (parted && S._ruleScopes !== null) {
		for (const scope of S._ruleScopes.values()) scope.selectors.clear();
	}
	writer.flushInsertsBefore(offset);
	S._heldTopLevel = {
		node,
		offset,
		line,
		column,
		entry,
		owned: false,
		own: spans,
		parted
	};
};

/**
 * Emit the held top-level rule, if any. Called once the stylesheet is consumed.
 * @param {PrintContext=} writer the print context
 * @returns {void}
 */
const flushTopLevel = (writer) => {
	const held = S._heldTopLevel;
	S._heldTopLevel = null;
	if (writer === undefined) return;
	if (held !== null) emitHeld(writer, held);
	settlePrior(writer);
};

/**
 * Emit a whole `block-contents` print: the held nodes are one declaration list,
 * so they go through the same composition a rule's block does and land as one
 * piece. The list is what a `style=""` attribute holds, so it is small.
 * @param {(Rule | Declaration)[]} nodes the top-level nodes, in source order
 * @param {PrintContext} writer the print context holding each one's text
 * @returns {void}
 */
const emitBlockContents = (nodes, writer) => {
	/** @type {Declaration[]} */
	const decls = [];
	/** @type {Rule[]} */
	const rules = [];
	for (const node of nodes) {
		if (S._types[node] === NodeType.Declaration) {
			decls.push(node);
		} else {
			rules.push(node);
		}
	}
	const minify = writer.options.mode === "minify";
	const { body } = composeBlockBody(
		A,
		decls,
		rules.length === 0 ? null : rules,
		writer,
		minify,
		minify ? "" : "\n",
		null
	);
	// The list prints as one piece, so it anchors as one: at where it starts. A
	// declaration list is what an attribute holds, so that is the whole of it.
	const offset = nodes.length === 0 ? 0 : startOf(nodes[0]);
	const at = writer.mapWanted ? S._locConverter.get(offset) : undefined;
	// A leading separator only ever parts one item from the one before it, and at
	// top level there is nothing before the first.
	writer.take(
		undefined,
		offset,
		at === undefined ? undefined : at.line - 1,
		at === undefined ? undefined : at.column,
		minify ? body : body.slice(1)
	);
};

/**
 * Note that a top-level node stood here. Called once per top-level node, after
 * it has printed and before the next one does, so the empty-rule drop knows
 * whether taking a rule out could still move a `@namespace` up.
 * @param {Rule | Declaration} node the finished top-level node
 * @returns {void}
 */
const closeNamespacePrologue = (node) => {
	if (S._namespacePrologueOpen && S._types[node] === NodeType.QualifiedRule) {
		S._namespacePrologueOpen = false;
	}
};

/**
 * The `grammar` streaming sink: walk one top-level node, then recycle the
 * buffers for the next.
 * @param {Rule | Declaration} node top-level node
 * @param {PrintContext=} writer print context when printing, else undefined
 */
const walkTopLevel = (node, writer) => {
	if (node === S._streamWalked) {
		S._streamWalked = null;
		// A streamed rule's text is already out, so nothing can take it back - and
		// the node is about to be recycled, which its candidacy must not outlive.
		S._prefixDropCandidate = null;
		// Nothing read what it declares, so no distant merge may move past it.
		if (S._mergingDistantRules) {
			S._distantDeclaredAt.set("all", ++S._distantSeq);
		}
		closeNamespacePrologue(node);
		recycleTopLevel(node);
		if (S._walkStopped && writer === undefined) throw WALK_STOPPED;
		return;
	}
	walkRule(node, null, 0, writer);
	// A declaration list is composed as a whole, so its nodes are kept - their
	// printed text stays reachable through the writer, which recycling would lose.
	if (S._blockContentsNodes !== null) {
		S._blockContentsNodes.push(node);
		return;
	}
	// The walk fired each node's printer into the context, so this finished
	// top-level node goes to the writer with its source position: it flushes the
	// kept comments before it, records the source-map anchor and appends the text.
	if (writer !== undefined) {
		// Only the start is wanted, and only for a map: `loc` would walk to the end
		// as well and box both, per top-level node, for a line nobody reads.
		if (writer.mapWanted) {
			const start = S._locConverter.get(S._starts[node]);
			takeTopLevel(node, writer, startOf(node), start.line - 1, start.column);
		} else {
			takeTopLevel(node, writer, startOf(node));
		}
	}
	closeNamespacePrologue(node);
	// The held rule keeps its own entry, so the rest are done with.
	clearRuleEntries();
	if (S._nodeCount > S._nodePeak) S._nodePeak = S._nodeCount;
	if (S._listItemTop > S._listItemPeak) S._listItemPeak = S._listItemTop;
	S._nodeCount = 0;
	S._listItemTop = LIST_ITEMS_FLOOR;
	if (S._walkStopped && writer === undefined) throw WALK_STOPPED;
};

/**
 * `walkTopLevel` without the walk, for a visitor-less `process` call: the
 * walk's only effect is visitor dispatch, so just recycle the buffers.
 * @param {Rule | Declaration} node top-level node
 */
const recycleTopLevel = (node) => {
	if (S._nodeCount > S._nodePeak) S._nodePeak = S._nodeCount;
	if (S._listItemTop > S._listItemPeak) S._listItemPeak = S._listItemTop;
	S._nodeCount = 0;
	S._listItemTop = LIST_ITEMS_FLOOR;
};

// The store buffers grow to the largest single top-level rule ever parsed and
// live at module level; above this capacity they are re-shrunk after a parse
// so one pathological rule can't pin megabytes for the process lifetime.
const SHRINK_CAPACITY = 65536;

// `@license` / `@preserve` mark a comment for preservation (terser keeps the
// same annotations for JS); the JS-only `@cc_on` is not meaningful in CSS.
const KEEP_COMMENT_RE = /@(?:license|preserve)/i;

/**
 * A comment worth carrying through minification, matching terser's default set:
 * a `/*!` banner (fast char-code check, no allocation) or a `@license` /
 * `@preserve` annotated comment. `/*#` covers the `sourceMappingURL` /
 * `sourceURL` pragmas, which are a link to drop, not a comment.
 * @param {string} src source text
 * @param {number} start comment start offset (at `/`)
 * @param {number} end comment end offset (past the closing `/`)
 * @returns {boolean} whether the comment survives minification
 */
const isKeptComment = (src, start, end) => {
	const marker = src.charCodeAt(start + 2);
	const kept = S._commentsKept;
	if (typeof kept === "boolean") return kept;
	if (kept === "some") {
		return (
			marker === CC_EXCLAMATION || KEEP_COMMENT_RE.test(src.slice(start, end))
		);
	}
	// A pattern or a predicate of the author's, over the comment's own text -
	// which stands in for the banner rule rather than beside it, as terser's
	// `format.comments` does. Its line and column follow, for a caller placing it.
	const loc = S._locConverter.get(start);
	return kept(src.slice(start + 2, end - 2), loc.line, loc.column) === true;
};

// Every rewrite on, which is what a print with no `transforms` option makes and
// what the walk-only passes hold. Frozen, since it is shared rather than copied.
/** @type {Required<CssTransformOptions>} */
const ALL_TRANSFORMS = Object.freeze({
	colorFallbacks: true,
	lowerUnsupported: true,
	foldCase: true,
	rewriteEscapes: true,
	comments: "some",
	customMedia: false,
	customSelectors: false,
	mergeLonghands: true,
	mergeRules: true,
	normalizeQuotes: true,
	rebaseZIndex: false,
	reduceFunctions: true,
	removeDeadRules: true,
	renameKeyframes: false,
	reorderDeclarations: true,
	rewriteDirSelector: false,
	shortenColors: true,
	shortenMediaQueries: true,
	shortenNumbers: true,
	shortenSelectors: true,
	shortenValues: true
});

/**
 * The rewrites this print makes, resolved once: each name is what the options
 * set it to, and what `ALL_TRANSFORMS` gives it where they set nothing - so no
 * read of the result asks whether the option was given. `comments` keeps
 * whatever it was given, which is still falsy only when it is `false`.
 *
 * Always a copy, and always made the one way: spreading the table and then
 * writing over a name it already has leaves the object's shape alone, so every
 * read of the result - and there is one per token - sees a single hidden class.
 * Handing the frozen table itself back where nothing is set would save this
 * object and cost each of those reads a second shape, `Object.freeze` giving a
 * frozen object a map of its own.
 * @param {CssTransformOptions | undefined} options the `transforms` option
 * @returns {Required<CssTransformOptions>} every rewrite resolved
 */
const transformsFrom = (options) => {
	/** @type {Required<CssTransformOptions>} */
	const out = { ...ALL_TRANSFORMS };
	if (options !== undefined) {
		for (const name of Object.keys(ALL_TRANSFORMS)) {
			const value = options[/** @type {keyof CssTransformOptions} */ (name)];
			if (value !== undefined) {
				/** @type {{ [name: string]: CssTransformOptions[keyof CssTransformOptions] }} */ (
					out
				)[name] = value;
			}
		}
	}
	return out;
};

// The same table, as a copy, for the reason `transformsFrom` always makes one.
/** @type {Required<CssTransformOptions>} */
const DEFAULT_TRANSFORMS = transformsFrom(undefined);

/**
 * The `comments` option resolved to what it means per comment: `true` every
 * one, `false` none, `"some"` the ones that carry something, or a predicate
 * over the comment's own text - which is what a pattern compiles to here, so no
 * print re-reads one per comment. A pattern is matched from the start each
 * time, since a `g` flag would otherwise carry an index between comments.
 * @param {Required<CssTransformOptions>["comments"]} comments the option
 * @returns {boolean | "some" | ((comment: string) => boolean)} what it keeps
 */
const keptComments = (comments) => {
	if (comments === "all") return true;
	if (typeof comments === "boolean" || comments === "some") return comments;
	if (typeof comments === "function") return comments;
	const pattern =
		typeof comments === "string" ? new RegExp(comments) : comments;
	return (comment) => {
		pattern.lastIndex = 0;
		return pattern.test(comment);
	};
};

/**
 * The per-transform switches out of a wider options object - what
 * `optimization.minimize.css` names beside `environment` and the two rewrites
 * that are off until asked for. Exported so the minify functions the minimizer
 * plugin ships to its workers can pick them without repeating the names.
 * @param {CssTransformOptions} options an options object that may carry them
 * @returns {CssTransformOptions | undefined} the switches, or undefined when none is set
 */
const pickTransforms = (options) => {
	/** @type {CssTransformOptions | undefined} */
	let out;
	for (const name of Object.keys(ALL_TRANSFORMS)) {
		const value = options[/** @type {keyof CssTransformOptions} */ (name)];
		if (value === undefined) continue;
		if (out === undefined) out = {};
		/** @type {{ [name: string]: CssTransformOptions[keyof CssTransformOptions] }} */ (
			out
		)[name] = value;
	}
	return out;
};

// A character outside ASCII, which a stylesheet's `@charset` is kept for.
const NON_ASCII_RE = /[^\0-\u007F]/;

/**
 * Whether an answer to an offer this print made writes a character outside
 * ASCII. Without the answers yet, an offer whose answer does is marked as
 * overturning the `@charset` taken back, so the print runs again with them.
 * @param {PrintContext} writer the print context
 * @param {number} from the first offer this print made
 * @returns {boolean} true when a known answer writes non-ASCII
 */
const answersNonAscii = (writer, from) => {
	const holes = S._deferEmbeddedSource;
	if (holes === undefined) return false;
	const answers = writer.options.embeddedAnswers;
	for (let i = from; i < holes.length; i++) {
		const hole = holes[i];
		if (answers !== undefined) {
			if (NON_ASCII_RE.test(hole.build(answers(hole)))) return true;
			continue;
		}
		const decides = hole.decides;
		hole.decides = (answer) =>
			(decides !== undefined && decides(answer)) ||
			NON_ASCII_RE.test(hole.build(answer));
	}
	return false;
};

// What a stylesheet whose output holds a non-ASCII character opens with, so it
// is read as UTF-8 whatever the page around it is in.
const CHARSET_RULE = '@charset "UTF-8";';

/**
 * The CSS `SourceProcessor` grammar: consume top-level rules one at a time
 * (§5.4.1) and walk each immediately, firing `enter` / `exit` in source order
 * without building a whole-stylesheet array first. `recurseBlocks: false` skips
 * walking block bodies' (eagerly parsed) nested rules (caller drives nested
 * traversal itself). When `writer` is given the same walk also prints: it is
 * threaded down the walk and each node's printer builds its text into it as the
 * node finishes - one parse, no re-tokenization. `skip` is ignored while printing
 * (it needs every node).
 * @param {string} input source text
 * @param {CompiledVisitorMap} visitors compiled visitor map
 * @param {PrintContext | undefined} writer the print context to build output into, or undefined (walk only)
 * @param {CssProcessOptions} options process options
 */
const runGrammar = (input, visitors, writer, options) => {
	if (
		writer !== undefined &&
		!S._collectingCustomAtRules &&
		writer.options.mode === "minify" &&
		writer.options.transforms !== undefined &&
		(writer.options.transforms.customMedia === true ||
			writer.options.transforms.customSelectors === true) &&
		namesAtRule(input, CUSTOM_AT_RULE_NAMES)
	) {
		readCustomAtRulesAhead(input, writer);
	}
	const text = preprocessInputStream(input);
	const locConverter = options.locConverter || new LocConverter(text, "css");
	setupParse(text, locConverter, options.parseError);
	S._originalInput = input;
	// Printing (a writer) needs every node for a faithful serialization, so `skip`
	// is ignored while printing - it only applies to walk-only visitor passes.
	const skip = writer !== undefined ? undefined : options.skip;
	S._skipTypes = (skip && skip.types) || NO_SKIP_TYPES;
	S._skipActive = S._skipTypes !== NO_SKIP_TYPES;
	S._skipSelectorPrelude = skip !== undefined && skip.selectorPrelude === true;
	S._skipAtRulePrelude = skip !== undefined && skip.atRulePrelude === true;
	// ...and `recurseBlocks` is ignored there for the same reason: a block body
	// the walk never enters holds no children, and a block is printed from them.
	S._recurseBlocks = writer !== undefined || options.recurseBlocks !== false;
	// The walk always streams, there being nothing to trade off: a block under the
	// threshold is collected and walked in one batch as ever. Printing streams
	// with it, so no parent is assembled from text already released.
	S._streamBlocks = true;
	S._stream.writer = writer;
	S._printing = writer !== undefined;
	// Only a stylesheet naming one has an empty rule worth keeping, and a match
	// inside a comment or a string costs those bytes rather than changing meaning.
	S._namespacePrologueOpen = S._printing && namesNamespaceAtRule(text);
	S._convertLengthUnits =
		writer !== undefined && writer.options.convertLengthUnits === true;
	S._assumeUtf8 = writer !== undefined && writer.options.charset === false;
	S._convertApproximateColors =
		writer !== undefined && writer.options.convertApproximateColors === true;
	const unused =
		writer === undefined ? undefined : writer.options.unusedSymbols;
	S._unusedSymbols =
		unused === undefined || unused.length === 0 ? null : new Set(unused);
	S._unusedRules = writer === undefined ? null : new Set();
	const pseudo =
		writer === undefined ? undefined : writer.options.pseudoClasses;
	const named = pseudo === undefined ? [] : Object.entries(pseudo);
	S._pseudoClasses = named.length === 0 ? null : new Map(named);
	S._mergingDistantRules =
		writer !== undefined && writer.options.mergeDistantRules === true;
	S._rewriteCustomProperties =
		writer !== undefined && writer.options.rewriteCustomProperties === true;
	S._dropOverriddenDeclarations =
		writer !== undefined && writer.options.dropOverriddenDeclarations === true;
	// `setupParse` left the default in place: only a caller's switches resolve.
	if (writer !== undefined && writer.options.transforms !== undefined) {
		S._transforms = transformsFrom(writer.options.transforms);
	}
	S._commentsKept = keptComments(S._transforms.comments);
	const renaming = writer !== undefined && writer.options.mode === "minify";
	S._keyframeRenames =
		renaming && S._transforms.renameKeyframes ? keyframeRenames(text) : null;
	S._zIndexRenames =
		renaming && S._transforms.rebaseZIndex ? zIndexRenames(text) : null;
	// Only a minifying print that may join rules records where each one stands,
	// which is the one that can put the two a cut leaves side by side together.
	S._topLevelRules =
		writer !== undefined &&
		writer.options.mode === "minify" &&
		S._transforms.mergeRules
			? []
			: null;
	S._unitScale = unitScaleFor(S._convertLengthUnits);
	S._renderEmbeddedSource =
		writer === undefined ? undefined : writer.options.renderEmbeddedSource;
	S._deferEmbeddedSource =
		writer === undefined ? undefined : writer.options.deferEmbeddedSource;
	const environment =
		writer !== undefined ? writer.options.environment : undefined;
	// Vendor prefixing is on for a minifying print with a browserslist selection,
	// and off for everything else - an empty selection names no browser to
	// prefix for, so it leaves prefixes alone rather than dropping every one.
	const browsers =
		writer !== undefined &&
		writer.options.mode === "minify" &&
		environment !== undefined &&
		environment.browsers !== undefined &&
		environment.browsers.length !== 0
			? environment.browsers
			: undefined;
	if (browsers === undefined) {
		S._seenPrefixRules = null;
		S._prefixBrowsers = null;
		S._someBrowserUnanswered = false;
		S._prefixingOn = false;
	} else {
		useBrowsers(browsers);
		// The selection answers two questions, and `vendorPrefixes` turns off only
		// the first: which prefixes to write, and which spellings a target reads.
		S._prefixingOn =
			S._prefixBrowsers !== null &&
			/** @type {CssEnvironment} */ (environment).vendorPrefixes !== false;
		S._seenPrefixRules = S._prefixingOn ? new Map() : null;
	}
	// Read once per print: the selection cannot change under a single stylesheet,
	// and each of these is asked per declaration.
	// No selection reads everything, which is what `setupParse` just set.
	if (S._prefixBrowsers !== null) {
		S._hexAlphaAllowed = targetSupports("colorHexAlpha");
		S._doublePositionAllowed = targetSupports("gradientDoublePosition");
		S._displayTwoValuesAllowed = targetSupports("displayTwoValues");
		S._systemUiAllowed = targetSupports("systemUiFont");
		S._textDecorationColorStyleAllowed = targetSupports(
			"textDecorationColorStyle"
		);
		S._textDecorationThicknessAllowed = targetSupports(
			"textDecorationThickness"
		);
		// WHY: an engine reading custom properties tokenizes by CSS Syntax 3, which
		// parts `.2em.4em`, `0-2px` and `)x`; IE, Presto and pre-Chromium Android
		// read none, and none of them is verifiable here, so their values keep spaces.
		S._oldTokenizer =
			S._someBrowserUnanswered || !readsAll(valueSupportedFrom("var"));
		// WHY: IE 10 and 11 read an omitted `flex` basis as `0px` where the spec
		// says `0%`, and a lone basis by the 2012 draft, so `flex` keeps its parts.
		const selected = S._prefixBrowsers;
		S._tridentTarget =
			S._someBrowserUnanswered ||
			TRIDENT_BROWSERS.some((at) => selected[at] !== undefined);
		S._colorFunctionAllowed = targetSupports("colorFunction");
		S._colorMixAllowed = targetSupports("colorMix");
		S._hwbColorsAllowed = targetSupports("hwbColors");
		S._labColorsAllowed = targetSupports("labColors");
		S._lightDarkAllowed = targetSupports("lightDark");
		// Both carry only a lowering, which leaves a browser nothing states no worse.
		S._whereSelectorAllowed = readsAllStated(
			SUPPORTED_FROM.get("whereSelector")
		);
		S._dirSelectorAllowed = targetSupports("dirSelector");
		S._nestingAllowed = targetSupports("nesting");
		S._customMediaAllowed = targetSupports("customMedia");
		// `&` is the parent selector list, which only `:is()` writes out - so a target
		// reading no `:is()` keeps the nesting the author wrote.
		S._isSelectorAllowed = readsAllStated(SUPPORTED_FROM.get("isSelector"));
		S._loweringNesting =
			!S._nestingAllowed &&
			S._isSelectorAllowed &&
			S._transforms.lowerUnsupported &&
			writer !== undefined &&
			writer.options.mode === "minify";
		S._langArgumentListAllowed = targetSupports("langArgumentList");
		S._notSelectorListAllowed = targetSupports("notSelectorList");
		// The pair needs a rule of no specificity to default them, so a target that
		// reads no `:where()` is one this leaves the function alone for.
		S._loweringLightDark =
			!S._lightDarkAllowed &&
			S._whereSelectorAllowed &&
			S._transforms.lowerUnsupported &&
			writer !== undefined &&
			writer.options.mode === "minify";
		// Which half of a `light-dark()` prints depends on a `color-scheme` that may
		// print long before the first call, so the source answers rather than the walk.

		// The function, not a name ending in it: `.scheme-light-dark` and
		// `my-light-dark()` both hold the text, and reading either as a call lowers
		// a sheet that has none. A function name is matched case-insensitively.
		S._sourceNamesLightDark =
			S._loweringLightDark && LIGHT_DARK_CALL_RE.test(S._input);
		S._lightDarkUsed = false;
		S._oklabColorsAllowed = targetSupports("oklabColors");
		S._colorFallbacksNeeded =
			!S._hwbColorsAllowed ||
			!S._labColorsAllowed ||
			!S._oklabColorsAllowed ||
			!S._colorFunctionAllowed ||
			!S._colorMixAllowed;
		S._insetShorthandAllowed = targetSupports("insetShorthand");
		S._rangeSpellingAllowed = targetSupports("mediaQueryRange");
		S._placeShorthandAllowed = targetSupports("placeShorthand");
		S._overflowTwoValuesAllowed = targetSupports("overflowTwoValues");
	}
	S._walkVisitors = visitors;
	S._commentBucket = visitors[NodeType.Comment];
	S._blockMemo =
		writer !== undefined &&
		writer.options.mode === "minify" &&
		visitors.length === 0 &&
		S._unusedSymbols === null &&
		!S._prefixingOn &&
		!S._colorFallbacksNeeded &&
		S._renderEmbeddedSource === undefined &&
		S._deferEmbeddedSource === undefined
			? new Map()
			: null;
	S._declarationMemo = S._blockMemo === null ? null : new Map();
	S._blockMemoScopes.clear();
	S._singleValueKeys = S._blockMemo === null ? null : new Set();
	S._declarationMemoKey = "";
	S._walkStopped = false;
	S._edits.length = 0;
	S._plainTransforms = null;

	// WHY: the comment sink fires the `Comment` visitor bucket and, while
	// printing, keeps the license comments `/*!`, `@license` and `@preserve` - the
	// ecosystem default, cssnano, clean-css and csso keeping `/*!` and terser the
	// annotations. A kept comment goes to the writer, which re-emits it before the
	// next top-level node, and both print modes keep the same ones so beautifying
	// and minifying carry the same banners. With no comment visitor and no
	// printing there is no callback at all, and comments are skipped.
	/** @type {((input: string, start: number, end: number) => number) | undefined} */
	let onComment;
	if (writer !== undefined) {
		const w = writer;
		onComment = (src, start, end) => {
			if (S._commentBucket !== undefined) grammarOnComment(src, start, end);
			if (isKeptComment(src, start, end)) {
				w.insert(start, src.slice(start, end));
			}
			return end;
		};
	} else if (S._commentBucket !== undefined) {
		onComment = grammarOnComment;
	}

	// Stream each top-level node (selected by `as`) to the walker the moment it's
	// consumed, rather than collecting them first - so the whole AST is never
	// held at once; peak heap is ~one top-level node's subtree.
	const as = options.as || "stylesheet";
	// Decoding drops a leading BOM; printed after the `@charset` it would read as
	// part of the first selector.
	const ts = new TokenStream(
		text,
		writer !== undefined &&
			writer.options.mode === "minify" &&
			as === "stylesheet" &&
			text.charCodeAt(0) === 0xfeff
			? 1
			: 0,
		locConverter,
		onComment
	);
	const consume = TOP_LEVEL_CONSUMERS[as] || consumeAStylesheetsContents;
	S._inStyleAttribute = as === "block-contents";
	// A block's contents are one declaration list, so printing them is composing
	// that list - the same production a rule's block is, and the only top-level
	// one that is held rather than streamed.
	if (as === "block-contents" && writer !== undefined) {
		S._blockContentsNodes = [];
	}
	// Written first or not at all: `@charset` is read only as a file's opening
	// bytes, and is taken back below where the output holds no non-ASCII one.
	if (
		writer !== undefined &&
		writer.options.mode === "minify" &&
		writer.options.declareCharset === true &&
		writer.options.charset !== false &&
		as === "stylesheet"
	) {
		S._charsetPiece = writer.emitRetractable(CHARSET_RULE);
	}
	// The offers this print makes, which an answer may fill with non-ASCII.
	const deferFrom =
		S._deferEmbeddedSource === undefined ? 0 : S._deferEmbeddedSource.length;
	// With zero registered buckets the walk is a pure no-op traversal - hand the
	// consumer a recycle-only sink instead.
	let anyVisitor = false;
	for (let i = 0; i < visitors.length; i++) {
		if (visitors[i] !== undefined) {
			anyVisitor = true;
			break;
		}
	}
	S._walkWanted = anyVisitor || writer !== undefined;
	for (let type = 0; type < S._walkSkipsLeaf.length; type++) {
		S._walkSkipsLeaf[type] =
			writer === undefined &&
			HAS_CHILD_LIST[type] === 0 &&
			visitors[type] === undefined
				? 1
				: 0;
	}
	try {
		// Bind the writer into the per-node sink only while printing, so the
		// walk-only path keeps passing the module function with no closure. A printer
		// consumes the walk, so only a writer-less call takes the recycle-only sink.
		consume(
			ts,
			writer === undefined
				? anyVisitor
					? walkTopLevel
					: recycleTopLevel
				: (node) => walkTopLevel(node, writer)
		);
		if (S._blockContentsNodes === null) {
			flushTopLevel(writer);
			// A gathered layer's text is built off this parse's state, which is gone
			// by when the output is read.
			if (S._layersGathered && writer !== undefined) writer._settleDeferred();
			if (writer !== undefined) reconcileTopLevel(writer);
			if (S._mergingDistantRules && writer !== undefined) {
				orderDistantLists(writer);
			}
			// Last, and only where a `light-dark()` was written another way: the rule
			// has no specificity, so where it stands says nothing about which
			// declaration wins.
			if (S._lightDarkUsed && writer !== undefined) {
				writer.emitStreamed(LIGHT_DARK_DEFAULTS);
			}
			// A value the input ran out in ends the output as it ended the input: the
			// engine keeps a custom property's value as written, left open.
			const open = S._openCustomValue;
			if (
				open !== null &&
				writer !== undefined &&
				writer.options.closeAtEnd !== true
			) {
				writer.replaceEnd(open.printed, open.source, CC_RIGHT_CURLY);
			}
			if (
				S._charsetPiece !== -1 &&
				!(
					/** @type {PrintContext} */ (writer).writesNonAscii(S._charsetPiece)
				) &&
				!answersNonAscii(/** @type {PrintContext} */ (writer), deferFrom)
			) {
				/** @type {PrintContext} */ (writer).retract(S._charsetPiece);
			}
		} else if (S._edits.length === 0) {
			emitBlockContents(
				S._blockContentsNodes,
				/** @type {PrintContext} */ (writer)
			);
		} else {
			emitPlainBlockContents(
				S._blockContentsNodes,
				/** @type {PrintContext} */ (writer)
			);
		}
	} catch (err) {
		if (err !== WALK_STOPPED) {
			// A nesting deeper than the host's stack is an input the caller can act
			// on, so it fails as the JavaScript parser's does rather than as a crash.
			if (
				err instanceof Error &&
				(/\bstack\b.*\b(exceeded|overflow)\b/i.test(err.message) ||
					/\btoo much recursion\b/i.test(err.message))
			) {
				const { line, column } = locConverter.get(ts._pos);
				throw new SyntaxError(
					`Not enough stack space to parse input (${line}:${column})`,
					{ cause: err }
				);
			}
			throw err;
		}
	} finally {
		S._parseError = undefined;
		S._walkStopped = false;
		S._edits.length = 0;
		S._plainTransforms = null;
		if (S._walkHalted !== null) {
			resumeVisitors(S._walkHalted);
			S._walkHalted = null;
		}
		if (S._skippedVisitors !== null) resumeSkippedVisitors();
		S._blockContentsNodes = null;
		// Each held write keeps its offered source - a decoded `data:` payload can
		// be a whole document - and a closure over it, so both go with the parse.
		S._renderEmbeddedSource = undefined;
		S._deferEmbeddedSource = undefined;
		S._openCustomValue = null;
		S._heldTopLevel = null;
		S._priorTopLevel = null;
		S._topLevelRules = null;
		S._prefixPieces = null;
		S._seenTopLevelLayers = null;
		S._sheetSourceLayers = null;
		clearRuleEntries();
		S._seenPrefixRules = null;
		// The parsed selection itself stays in `_parsedBrowsersMemo`, which the next
		// asset of the same build reuses; only this parse's pointer is dropped.
		S._prefixBrowsers = null;
		S._someBrowserUnanswered = false;
		S._prefixDropCandidate = null;
		// Drop the tree's column references so the last parsed source (and
		// its LocConverter / child lists / visitors) don't stay alive between
		// parses.
		S._streamBlocks = false;
		S._streamWalked = null;
		S._stream.writer = undefined;
		S._depth = 0;
		// A frame is left as the block closed it (nothing reads a closed one), so
		// the last open path's buffers are dropped here rather than per block.
		const used = S._frameHighWater + 1;
		S._frameSeenDeclarations.fill(null, 0, used);
		S._frameSeenRules.fill(null, 0, used);
		S._frameChainKey.fill(null, 0, used);
		S._frameSeenLayers.fill(null, 0, used);
		S._frameSourceLayers.fill(null, 0, used);
		S._framePrior.fill(null, 0, used);
		S._frameLayerOpener.fill(null, 0, used);
		S._frameRuleRun.fill(null, 0, used);
		S._frameHighWater = 0;
		S._blockSpans.length = 0;
		S._ruleScopes = null;
		S._rootRuleScope = null;
		S._shadowDeclared.clear();
		S._blockMemo = null;
		S._blockMemoScopes.clear();
		S._blockMemoTable = S._blockMemoKeyTable = new Map();
		S._declarationMemo = null;
		S._singleValueKeys = null;
		S._blockMemoNode = null;
		S._blockMemoBody = undefined;
		S._blockMemoKey = "";
		// Each holds a piece of the sheet just printed, so the last one printed
		// would be held until the next parse replaces them.
		S._distantRules.clear();
		S._distantSelectors.clear();
		S._distantAtRules.clear();
		S._distantAtRuleFolded = false;
		S._lentPiece = null;
		S._lentPieces = new Set();
		S._deferredKeySpan = null;
		S._deferredKeyTaken = null;
		S._distantDeclaredAt.clear();
		S._distantTypedDeclaredAt.clear();
		S._distantTypeDeclaredAt.clear();
		S._anonymousLayers = 0;
		S._input = "";
		S._originalInput = "";
		S._locConverter = /** @type {LocConverter} */ (
			/** @type {LocConverter | null} */ (null)
		);
		S._listItemTop = LIST_ITEMS_FLOOR;
		listPool.length = 0;
		if (S._listItems.length > SHRINK_CAPACITY) {
			S._listItemGrowHint = S._listItemPeak;
			S._listItems = EMPTY_I32;
		}
		S._walkVisitors = /** @type {CompiledVisitorMap} */ (
			/** @type {CompiledVisitorMap | never[]} */ ([])
		);
		S._commentBucket = undefined;
		if (S._nodeCapacity > SHRINK_CAPACITY) {
			// +1: node ids are 1-based and grow fires at `id >= capacity`.
			S._nodeGrowHint = S._nodePeak + 1;
			S._nodeCapacity = 0;
			releaseColumns();
		}
		S._nodePeak = 0;
		S._listItemPeak = 0;
	}
};

/**
 * Whether a pending token separator is safe to drop *before* `cc`: next to
 * `{ } ; , )` it never changes meaning (`)` only ever closes a group).
 * @param {number} cc first code point of the text about to be written
 * @returns {boolean} true when the separator can be dropped
 */
const dropSeparatorBefore = (cc) =>
	cc === CC_LEFT_CURLY ||
	cc === CC_RIGHT_CURLY ||
	cc === CC_SEMICOLON ||
	cc === CC_COMMA ||
	cc === CC_RIGHT_PARENTHESIS;

/**
 * Whether a pending token separator is safe to drop *after* `cc`: next to
 * `{ } ; , (` it never changes meaning. The parens are asymmetric on purpose -
 * dropping a space *before* `(` could turn `x (y)` into the function `x(y)`, and
 * one *after* `)` could turn `:not(a) b` into the compound `:not(a)b`, so `(` is
 * only safe on this (after) side and `)` only on the before side.
 * @param {number} cc last emitted code point
 * @returns {boolean} true when the separator can be dropped
 */
const dropSeparatorAfter = (cc) =>
	cc === CC_LEFT_CURLY ||
	cc === CC_RIGHT_CURLY ||
	cc === CC_SEMICOLON ||
	cc === CC_COMMA ||
	cc === CC_LEFT_PARENTHESIS;

/**
 * What the CSS printer may be told, on top of the `mode` every language has -
 * the printing slice of `CssProcessOptions`, named once so nothing outside CSS
 * has to enumerate it.
 * @typedef {Pick<CssProcessOptions, "environment" | "declareCharset" | "charset" | "convertLengthUnits" | "convertApproximateColors" | "dropOverriddenDeclarations" | "mergeDistantRules" | "rewriteCustomProperties" | "renderEmbeddedSource" | "deferEmbeddedSource" | "embeddedAnswers" | "closeAtEnd" | "transforms" | "unusedSymbols" | "pseudoClasses">} CssPrintOptions
 */

/** @typedef {import("../util/SourceProcessor").PrintContext<CssPath, Node, CssPrintOptions>} PrintContext */

// === Spacing: the whole safe-spacing discipline is CSS-specific (a token
// separator is safe to drop next to `{ } ; , ( )` - the asymmetric paren rule in
// `_dropSeparator*`), so it lives with `printer`, not the generic context.

// A lone space marker a whitespace token prints; `join` resolves it. Real tokens
// print with their delimiters (a string keeps its quotes), so it never collides.
const SEP = " ";

/**
 * Whether a token separator between two code points must be kept.
 * @param {number} lastCode last emitted code point
 * @param {number} nextCode first code point of the next fragment
 * @returns {boolean} true when the separator must be kept
 */
const keepSeparator = (lastCode, nextCode) =>
	!dropSeparatorAfter(lastCode) && !dropSeparatorBefore(nextCode);

// A child, adjacent-sibling or general-sibling combinator. Whitespace around one
// is insignificant only at a selector's top level - inside `[...]` or `(...)` these
// are matchers or `An+B` - so trimming applies to a prelude join alone.
/**
 * @param {number} cc a code point
 * @returns {boolean} true for `>` / `+` / `~`
 */
const isCombinator = (cc) =>
	cc === CC_GREATER_THAN_SIGN || cc === CC_PLUS_SIGN || cc === CC_TILDE;

// WHY: what separates the parts of a query condition - a media-feature range
// comparison, the `:` of a plain feature test and the `!` of a tested
// `!important`. Whitespace around one is insignificant there, but the same code
// points mean something else in a selector, as combinators and a pseudo-class
// `:`, and in a declaration value, as `calc()` operators, so this trims a `(...)`
// condition outside a value alone.
/**
 * @param {number} cc a code point
 * @returns {boolean} true for `<` / `>` / `=` / `:` / `!`
 */
const isConditionSeparator = (cc) =>
	cc === CC_LESS_THAN_SIGN ||
	cc === CC_GREATER_THAN_SIGN ||
	cc === CC_EQUALS_SIGN ||
	cc === CC_COLON ||
	cc === CC_EXCLAMATION;

// What a `join` may drop a separator next to.
const TRIM_NOTHING = 0;
const TRIM_COMBINATORS = 1; // a qualified rule's selector prelude
const TRIM_CONDITIONS = 2; // a query condition's `(...)` block
const TRIM_MATH = 3; // a math function's `*` / `/`, which need no whitespace
// A declaration value's whitespace only separates tokens, so it is kept exactly
// where joining would fuse two - unlike a selector, where it is a combinator.
const TRIM_SEPARATORS = 4;

/**
 * @param {number} trim one of the `_TRIM_*` modes
 * @param {number} cc a code point
 * @returns {boolean} whether a separator next to `cc` may be dropped
 */
const isTrimmable = (trim, cc) => {
	if (trim === TRIM_COMBINATORS) return isCombinator(cc);
	if (trim === TRIM_CONDITIONS) return isConditionSeparator(cc);
	// CSS Values 4 §10.1: `+` and `-` require whitespace on both sides - without
	// it the sign would read as part of the next number - but `*` and `/` do not.
	if (trim === TRIM_MATH) {
		return cc === CC_ASTERISK || cc === CC_SOLIDUS;
	}
	return false;
};

/**
 * An ident code point (CSS Syntax §4.2): an ident-start code point, a digit or
 * `-`. The lookup table only spans ASCII, so non-ASCII is answered here.
 * @param {number} cc a code point
 * @returns {boolean} true when `cc` is an ident code point
 */
const isIdentCodePoint = (cc) => cc >= 128 || isAsciiIdentCodePoint(cc);

/**
 * Whether what precedes `at` lets a number start there: an ident running into
 * the position carries the digits instead, and `#` and `@` carry their own.
 * @param {string} out everything emitted so far
 * @param {number} at index a number would start at
 * @returns {boolean} true when a number can start at `at`
 */
const startsNumber = (out, at) => {
	if (at === 0) return true;
	const before = out.charCodeAt(at - 1);
	return !(
		isIdentCodePoint(before) ||
		before === CC_REVERSE_SOLIDUS ||
		before === CC_NUMBER_SIGN ||
		before === CC_AT_SIGN
	);
};

/**
 * Whether the run of digits `out` ends with is a number rather than the tail of
 * an ident: `1` is, the `1` of `.p1` is not, and only a number can take a `.` on.
 * @param {string} out everything emitted so far, ending in a digit
 * @returns {boolean} true when `out` ends in a number
 */
const endsWithNumber = (out) => {
	// Every caller asks of an `out` it saw end in a digit, so the run is not empty.
	let at = out.length;
	while (at > 0 && isDigit(out.charCodeAt(at - 1))) at--;
	// A sign signs a number only where a number could start: the `-1` of
	// `margin:-1` is signed, the `-1` of `.p-1` and the `-5` of `1e-5` are ident.
	const sign = at === 0 ? 0 : out.charCodeAt(at - 1);
	if (
		(sign === CC_HYPHEN_MINUS || sign === CC_PLUS_SIGN) &&
		startsNumber(out, at - 1)
	) {
		return true;
	}
	return startsNumber(out, at);
};

/**
 * Whether `out` ends with a hex escape and the one whitespace that terminates
 * it. That whitespace belongs to the escape, so anything identifier-like written
 * after it carries the same token on rather than starting a new one.
 * @param {string} out everything emitted so far
 * @returns {boolean} true when the trailing whitespace is an escape terminator
 */
const endsWithEscapeTerminator = (out) => {
	let at = out.length - 1;
	// `consumeExtraNewline`: a CRLF pair is the one terminator.
	if (
		out.charCodeAt(at) === CC_LINE_FEED &&
		out.charCodeAt(at - 1) === CC_CARRIAGE_RETURN
	) {
		at--;
	}
	at--;
	let digits = 0;
	while (digits < 6 && at >= 0 && isHexDigit(out.charCodeAt(at))) {
		at--;
		digits++;
	}
	if (digits === 0 || out.charCodeAt(at) !== CC_REVERSE_SOLIDUS) return false;
	// An even run of `\` is escaped backslashes, and opens no escape.
	let slashes = 0;
	while (at >= 0 && out.charCodeAt(at) === CC_REVERSE_SOLIDUS) {
		at--;
		slashes++;
	}
	return slashes % 2 === 1;
};

/**
 * Terminates a trailing hexadecimal escape without changing the identifier.
 * @param {string} identifier escaped identifier
 * @returns {string} identifier with its trailing escape terminated
 */
const terminateIdentifier = (identifier) => {
	const terminated = `${identifier} `;
	return endsWithEscapeTerminator(terminated) ? terminated : identifier;
};

/**
 * Whether the last code point of `out` is escaped, which makes it an ident code
 * point whatever it is (`\,` is no comma).
 * @param {string} out everything emitted so far
 * @returns {boolean} true when an odd run of `\` stands before the last code point
 */
const endsWithEscapedCodePoint = (out) => isEscapedAt(out, out.length - 1);

/**
 * Whether the code point at `at` is escaped, so it carries no meaning of its own.
 * @param {string} text the text
 * @param {number} at where the code point stands
 * @returns {boolean} true when an odd run of `\` stands before it
 */
const isEscapedAt = (text, at) => {
	let before = at - 1;
	while (before >= 0 && text.charCodeAt(before) === CC_REVERSE_SOLIDUS) {
		before--;
	}
	return (at - 1 - before) % 2 === 1;
};

/**
 * The whitespace that parts `out` from the token after it: a hex escape ending
 * `out` takes the first whitespace as its terminator, so it needs a second.
 * @param {string} out everything emitted so far
 * @returns {string} the separator to write
 */
const separatorAfter = (out) =>
	endsWithEscapeTerminator(`${out} `) ? "  " : " ";

/**
 * Whether emitting `fragment` directly after `out` would re-tokenize as one
 * token. Two printed siblings normally concatenate to exactly their source, but
 * not when a dropped comment was all that separated them, or when one was
 * rewritten (`1.0.5` is two numbers, printed as `1` and `.5`) - then the junction
 * can fuse and change the declaration. The test is deliberately exact rather than
 * conservative: a space inserted where none is needed would turn a compound
 * selector (`.a.b`) into a descendant one (`.a .b`), so over-separating is as
 * unsafe as under-separating.
 * Takes the preceding character rather than the text before it: what it is
 * appended to is a rope, and reading a character off one flattens the whole of
 * it - once per fragment, over text that grows with every fragment.
 * @param {number} last character code before the fragment
 * @param {string} fragment the fragment about to be emitted
 * @param {string} out everything emitted so far, read only where a digit meets a `.`
 * @returns {boolean} true when a separator has to be inserted between them
 */
const wouldFuseTokens = (last, fragment, out) => {
	const next = fragment.charCodeAt(0);
	// An escape swallows whatever follows it.
	if (last === CC_REVERSE_SOLIDUS) return true;
	// A hex escape eats one whitespace as its terminator, so a run ending in one
	// parts nothing and the next identifier continues that token.
	if (
		isAsciiWhitespace(last) &&
		(isIdentCodePoint(next) || next === CC_REVERSE_SOLIDUS)
	) {
		return endsWithEscapeTerminator(out);
	}
	// `/` + `*` opens a comment.
	if (last === CC_SOLIDUS && next === CC_ASTERISK) return true;
	if (isIdentCodePoint(last)) {
		// A number takes a `-` on as a unit only where an ident would start, so
		// `0` + `-2px` stays two tokens: a sign before a digit starts a number.
		if (
			isDigit(last) &&
			next === CC_HYPHEN_MINUS &&
			startsDigits(fragment, 1) &&
			endsWithNumber(out)
		) {
			return false;
		}
		// One ident / dimension / hash / at-keyword continues; `(` after an ident
		// makes it a function token instead.
		if (
			isIdentCodePoint(next) ||
			next === CC_LEFT_PARENTHESIS ||
			next === CC_REVERSE_SOLIDUS
		) {
			return true;
		}
		// `1` + `.5` reads back as the single number `1.5`. Only a number takes
		// the `.` on, and only when a digit follows it: the `1` ending the ident of
		// `.p1` does not, so `.p1` + `.c1` stays the one compound selector it is.
		if (isDigit(last) && next === CC_FULL_STOP) {
			return isDigit(fragment.charCodeAt(1)) && endsWithNumber(out);
		}
		// `123` + `%` reads back as the one percentage token `123%`, and only a
		// number takes the `%` on - the `1` ending an ident does not.
		if (isDigit(last) && next === CC_PERCENTAGE) return endsWithNumber(out);
		if (last === CC_HYPHEN_MINUS) {
			// A sign starting a token takes `.5` on as the number `-.5`.
			if (next === CC_FULL_STOP) {
				return (
					isDigit(fragment.charCodeAt(1)) && startsNumber(out, out.length - 1)
				);
			}
			// A trailing `--` plus `>` would close a CDC.
			return next === CC_GREATER_THAN_SIGN;
		}
		return false;
	}
	// A number may start right after `.` or `+` (`-` is an ident code point, so it
	// is already covered above).
	if (last === CC_FULL_STOP) return isDigit(next);
	// CSS Syntax 3 §4.3.10: a `+` starts a number only before a digit, or before a
	// `.` that itself has one. `.a+.m` is the sibling combinator and a class.
	if (last === CC_PLUS_SIGN) {
		return (
			isDigit(next) ||
			(next === CC_FULL_STOP && isDigit(fragment.charCodeAt(1)))
		);
	}
	// `#` / `@` + ident starts a hash / at-keyword token.
	if (last === CC_NUMBER_SIGN || last === CC_AT_SIGN) {
		return isIdentCodePoint(next) || next === CC_REVERSE_SOLIDUS;
	}
	// `<` + `!` opens a CDO.
	return last === CC_LESS_THAN_SIGN && next === CC_EXCLAMATION;
};

/**
 * Whether a code point may start the token a space parts from a `)` or a string.
 * @param {number} cc a code point
 * @returns {boolean} true unless it closes, lists or ends what came before
 */
const startsSpacedToken = (cc) =>
	cc !== CC_RIGHT_PARENTHESIS &&
	cc !== CC_COMMA &&
	cc !== CC_SEMICOLON &&
	cc !== CC_EXCLAMATION &&
	cc !== CC_SOLIDUS &&
	cc !== CC_RIGHT_CURLY &&
	!isAsciiWhitespace(cc);

// A declaration of `unicode-range`, read off its start.
const UNICODE_RANGE_HEAD_RE = /^unicode-range:/i;

/**
 * Whether a number starts at a `-`: a digit, or a `.` and a digit, follows it.
 * @param {string} text the text
 * @param {number} at where the `-` stands
 * @returns {boolean} true when it is a sign
 */
const startsNumberAt = (text, at) => {
	const next = text.charCodeAt(at + 1);
	return (
		isDigit(next) || (next === CC_FULL_STOP && isDigit(text.charCodeAt(at + 2)))
	);
};

/**
 * Printed declarations with a space back between two numbers that touch,
 * before a hash a name or number meets, and after a `)` or a string. CSS Syntax 3 reads the joined
 * forms as written; an engine older than it is not known to.
 * @param {string} text one or more printed declarations
 * @returns {string} the same, spaced where a token met another
 */
const spaceForOldTokenizer = (text) => {
	let out = "";
	let from = 0;
	// Where the last numeric token ended, so one starting there touches it.
	let numberEnd = -1;
	let custom = false;
	for (let i = 0; i < text.length;) {
		const cc = text.charCodeAt(i);
		if (cc === CC_SEMICOLON || i === 0) {
			// A custom property's value is a token stream no old engine reads, and
			// a `unicode-range` one is ranges: `U+131-140` is one of them.
			const at = cc === CC_SEMICOLON ? i + 1 : i;
			custom =
				(text.charCodeAt(at) === CC_HYPHEN_MINUS &&
					text.charCodeAt(at + 1) === CC_HYPHEN_MINUS) ||
				UNICODE_RANGE_HEAD_RE.test(text.slice(at, at + 14));
			if (cc === CC_SEMICOLON) {
				i++;
				continue;
			}
		}
		if (custom) {
			i++;
			continue;
		}
		if (cc === CC_QUOTATION_MARK || cc === CC_APOSTROPHE) {
			let j = i + 1;
			while (j < text.length && text.charCodeAt(j) !== cc) {
				if (text.charCodeAt(j) === CC_REVERSE_SOLIDUS) j++;
				j++;
			}
			i = j + 1;
			if (i < text.length && startsSpacedToken(text.charCodeAt(i))) {
				out += `${text.slice(from, i)} `;
				from = i;
			}
			continue;
		}
		if (cc === CC_REVERSE_SOLIDUS) {
			// An escaped code point is part of a name, `\)` and `\"` included.
			i = skipEscape(text, i);
			continue;
		}
		if (cc === CC_RIGHT_PARENTHESIS) {
			i++;
			if (i < text.length && startsSpacedToken(text.charCodeAt(i))) {
				out += `${text.slice(from, i)} `;
				from = i;
			}
			continue;
		}
		const sign = cc === CC_PLUS_SIGN || cc === CC_HYPHEN_MINUS ? 1 : 0;
		const lead = text.charCodeAt(i + sign);
		if (
			isDigit(lead) ||
			(lead === CC_FULL_STOP && isDigit(text.charCodeAt(i + sign + 1)))
		) {
			if (i === numberEnd) {
				out += `${text.slice(from, i)} `;
				from = i;
			}
			let j = i + sign;
			while (isDigit(text.charCodeAt(j))) j++;
			if (
				text.charCodeAt(j) === CC_FULL_STOP &&
				isDigit(text.charCodeAt(j + 1))
			) {
				j++;
				while (isDigit(text.charCodeAt(j))) j++;
			}
			if (text.charCodeAt(j) === CC_PERCENTAGE) {
				j++;
			} else if (
				text.charCodeAt(j) !== CC_HYPHEN_MINUS ||
				!startsNumberAt(text, j)
			) {
				// A unit; a `-` a number follows is that number's sign instead.
				while (j < text.length && isIdentCodePoint(text.charCodeAt(j))) j++;
			}
			numberEnd = j;
			i = j;
			if (text.charCodeAt(i) === CC_NUMBER_SIGN) {
				out += `${text.slice(from, i)} `;
				from = i;
			}
			continue;
		}
		if (isIdentCodePoint(cc) || cc === CC_NUMBER_SIGN) {
			// A name, a hash or a function's name: digits inside it are its own.
			let j = i + 1;
			while (j < text.length && isIdentCodePoint(text.charCodeAt(j))) j++;
			// `url(` holds a raw address, which may carry anything but a `)`.
			if (
				text.charCodeAt(j) === CC_LEFT_PARENTHESIS &&
				j - i === 3 &&
				asciiCaseInsensitiveMatch(text.slice(i, j), "url") &&
				text.charCodeAt(j + 1) !== CC_QUOTATION_MARK &&
				text.charCodeAt(j + 1) !== CC_APOSTROPHE
			) {
				// Stop on the `)` that closes it, past any escaped one: the printer
				// closes an unclosed url.
				j = consumeTheRemnantsOfABadUrl(text, j + 1) - 1;
			} else if (text.charCodeAt(j) === CC_NUMBER_SIGN) {
				out += `${text.slice(from, j)} `;
				from = j;
			}
			i = j;
			continue;
		}
		i++;
	}
	return from === 0 ? text : out + text.slice(from);
};

/**
 * @param {string} fragment a printed fragment
 * @returns {boolean} true when it is a lone `+` or `-` delimiter
 */
const isSign = (fragment) => fragment === "+" || fragment === "-";

/**
 * The text {@link wouldFuseTokens} reads back from a rope ending in `previous`:
 * a short copy of its tail where `last` is a digit, which reads no further back.
 * @param {string} out everything emitted so far, ending with `previous`
 * @param {string} previous the last fragment appended to `out`
 * @param {number} last the code unit `out` is read as ending in
 * @param {number} prior the code unit written just before `previous`
 * @param {number} priorSecond the code unit written just before `prior`
 * @returns {string} text ending as `out` does that answers as `out` would
 */
const fuseContext = (out, previous, last, prior, priorSecond) => {
	if (!isDigit(last)) return out;
	let at = previous.length;
	while (at > 0 && isDigit(previous.charCodeAt(at - 1))) at--;
	// A digit run and the two code units before it are all that is read.
	if (at >= 2) return previous;
	if (out.length < previous.length + 2) return out;
	// No digit is written before a fragment that starts with one, as the two
	// would fuse, so the run starts inside `previous`.
	return String.fromCharCode(priorSecond, prior) + previous;
};

/**
 * Join sibling fragments (a prelude / value / args / block body), resolving each
 * `SEP` marker into a single space kept only where dropping it would merge two
 * tokens (minifying) or unconditionally (beautifying). `trim` additionally drops
 * whitespace next to the code points that carry their own meaning in this
 * context - a selector's combinators, a query condition's comparisons.
 * Fragments that had no separator at all still get one where concatenating them
 * would fuse two tokens into one (see {@link wouldFuseTokens}).
 * @param {string[]} parts printed fragments in source order
 * @param {boolean} beautify whether every separator is kept
 * @param {number} trim one of the `_TRIM_*` modes
 * @param {boolean=} tokens whether whitespace here is a token a reader keeps
 * @returns {string} the joined text
 */
const join = (parts, beautify, trim, tokens) => {
	let out = "";
	let last = -1;
	// The last code unit of `out` as written, which `last` may stand in for.
	let tail = -1;
	// The code unit before `tail`, and the two written just before `previous`.
	let tailSecond = -1;
	let prior = -1;
	let priorSecond = -1;
	let previous = "";
	let pending = false;
	for (let i = 0; i < parts.length; i++) {
		const f = parts[i];
		if (f.length === 0) continue;
		if (f === SEP) {
			pending = true;
			continue;
		}
		const first = f.charCodeAt(0);
		if (pending) {
			const keep =
				beautify ||
				(trim === TRIM_SEPARATORS
					? wouldFuseTokens(
							last,
							f,
							fuseContext(out, previous, last, prior, priorSecond)
						)
					: keepSeparator(last, first) &&
						// A condition still keeps what parts `<` from `!--` or `--` from `>`,
						// and math what parts `/` from `*`, which would open a comment.
						((!isTrimmable(trim, last) && !isTrimmable(trim, first)) ||
							((trim === TRIM_CONDITIONS || trim === TRIM_MATH) &&
								wouldFuseTokens(
									last,
									f,
									fuseContext(out, previous, last, prior, priorSecond)
								))));
			if (out.length !== 0 && keep) {
				out += " ";
				tailSecond = tail;
				tail = CC_SPACE;
			}
			pending = false;
		} else if (
			out.length !== 0 &&
			wouldFuseTokens(
				last,
				f,
				fuseContext(out, previous, last, prior, priorSecond)
			)
		) {
			// Nothing separated these in source, yet joining them would read back as
			// one token. Whitespace is a selector's combinator, a sign's operator and
			// a token where `tokens` says so: only an empty comment parts them (§9).
			const separator =
				tokens || trim === TRIM_COMBINATORS || isSign(previous) || isSign(f)
					? "/**/"
					: separatorAfter(out);
			out += separator;
			tailSecond =
				separator.length === 1
					? tail
					: separator.charCodeAt(separator.length - 2);
			tail = separator.charCodeAt(separator.length - 1);
		}
		const before = f.length === 1 ? tail : f.charCodeAt(f.length - 2);
		out += f;
		previous = f;
		prior = tail;
		priorSecond = tailSecond;
		last = f.charCodeAt(f.length - 1);
		tail = last;
		tailSecond = before;
		// WHY: only a `\` before the last code point escapes it, and reading `out`
		// flattens what `+=` built, once a part, which made a long value quadratic.
		if (before === CC_REVERSE_SOLIDUS && endsWithEscapedCodePoint(out)) {
			last = CC_LOWER_A;
		}
	}
	return out;
};

/**
 * Normalize a numeric string (no unit): drop a leading zero (`0.5`->`.5`) and
 * trailing fractional zeros (`1.50`->`1.5`, `1.0`->`1`). Value-preserving;
 * scientific notation is left untouched.
 * @param {string} num numeric text (may carry a sign)
 * @returns {string} the normalized number
 */
const normalizeNumber = (num) => {
	if (num.includes("e") || num.includes("E")) return num;
	let sign = "";
	let s = num;
	const c0 = s.charCodeAt(0);
	if (c0 === CC_PLUS_SIGN || c0 === CC_HYPHEN_MINUS) {
		if (c0 === CC_HYPHEN_MINUS) sign = "-";
		s = s.slice(1);
	}
	const dot = s.indexOf(".");
	if (dot !== -1) {
		let end = s.length;
		while (end > dot + 1 && s.charCodeAt(end - 1) === CC_0) end--;
		if (end === dot + 1) end = dot; // fraction emptied -> drop the dot too
		s = s.slice(0, end);
	}
	while (
		s.length > 1 &&
		s.charCodeAt(0) === CC_0 &&
		s.charCodeAt(1) !== CC_FULL_STOP
	) {
		s = s.slice(1); // redundant integer leading zeros
	}
	if (
		s.length > 1 &&
		s.charCodeAt(0) === CC_0 &&
		s.charCodeAt(1) === CC_FULL_STOP
	) {
		s = s.slice(1); // "0.5" -> ".5"
	}
	if (s === "" || s === ".") s = "0";
	return sign + s;
};

/**
 * Write a number spelled with an exponent the shortest exact way: plainly where
 * that is no longer (`0.2e2`->`20`), else on an integer mantissa (`10E3`->`1e4`).
 * An exponent makes a `<number>`, never an `<integer>` (§4.3.12), so where that
 * is read `keepNumberType` keeps a spelling that is still not an integer.
 * @param {string} num numeric text with an exponent (may carry a sign)
 * @param {boolean} keepNumberType whether an integer spelling is ruled out
 * @returns {string} the normalized number
 */
const normalizeExponent = (num, keepNumberType) => {
	let sign = "";
	let s = num;
	const c0 = s.charCodeAt(0);
	if (c0 === CC_PLUS_SIGN || c0 === CC_HYPHEN_MINUS) {
		if (c0 === CC_HYPHEN_MINUS) sign = "-";
		s = s.slice(1);
	}
	let e = s.indexOf("e");
	if (e === -1) e = s.indexOf("E");
	const mantissa = s.slice(0, e);
	const dot = mantissa.indexOf(".");
	let digits =
		dot === -1 ? mantissa : mantissa.slice(0, dot) + mantissa.slice(dot + 1);
	// Where the decimal point falls in `digits` once the exponent has moved it.
	let point = (dot === -1 ? mantissa.length : dot) + Number(s.slice(e + 1));
	let start = 0;
	while (start < digits.length && digits.charCodeAt(start) === CC_0) start++;
	let end = digits.length;
	while (end > start && digits.charCodeAt(end - 1) === CC_0) end--;
	if (start === end) return keepNumberType ? `${sign}0e0` : `${sign}0`;
	point -= start;
	digits = digits.slice(start, end);
	const scale = point - digits.length;
	const exponent = `${digits}e${scale}`;
	// Built only when it could win, so `1e999` never writes a thousand zeros.
	const plainLength =
		point <= 0
			? 1 - point + digits.length
			: scale >= 0
				? point
				: digits.length + 1;
	if (
		plainLength > exponent.length ||
		(keepNumberType && point >= digits.length)
	) {
		return sign + exponent;
	}
	const plain =
		point <= 0
			? `.${"0".repeat(-point)}${digits}`
			: scale >= 0
				? digits + "0".repeat(scale)
				: `${digits.slice(0, point)}.${digits.slice(point)}`;
	return sign + plain;
};

// The fewest significant digits a number is shortened to: a converted color
// component is painted as one of a channel's 256 steps, well inside them.
const SIGNIFICANT_DIGITS = 6;

// WHY: read once, as a global lookup inside a `vm` context (jest) costs some 50
// times a local one, which these per-scale checks pay thousands of times a
// number.
const { abs, ceil, floor, fround, round, trunc } = Math;

// The whole-pixel scales a number meets: a font size, a line height, a zoom.
const LARGEST_SCALE = 256;
// The box widths in pixels a percentage is taken of.
const LARGEST_PERCENTAGE_BASE = 4096;

/**
 * Whether two lengths lay out alike: on the same 1/64px step Blink and WebKit
 * truncate, floor or round to, and the same 1/60px step Gecko rounds to.
 * @param {number} one a length in pixels
 * @param {number} other another
 * @returns {boolean} true when every engine places both on one step
 */
const onOneStep = (one, other) =>
	trunc(one * 64) === trunc(other * 64) &&
	floor(one * 64) === floor(other * 64) &&
	round(one * 64) === round(other * 64) &&
	round(one * 60) === round(other * 60);

/**
 * Whether two float lengths lay out alike as {@link onOneStep} has it, and
 * where an engine ceils one too, as WebKit does a size: `.85714286rem` of 14px
 * is 12px as a float, which `.8571429rem` passes by a bit.
 * @param {number} one a length in pixels, a float
 * @param {number} other another
 * @returns {boolean} true when every engine places both on one step
 */
const onOneFloatStep = (one, other) =>
	onOneStep(one, other) &&
	ceil(one * 64) === ceil(other * 64) &&
	floor(one * 60) === floor(other * 60) &&
	ceil(one * 60) === ceil(other * 60);

/**
 * Whether a shorter spelling of a number lays out where the written one does at
 * every scale an engine may apply, scaled as a double and as the float it parsed.
 * @param {number} value the number as written
 * @param {number} shorter the same number with fewer digits
 * @param {string} unit its lowercased unit, `""` for a bare number
 * @returns {boolean} true when no scale tells the two apart
 */
const landsAlike = (value, shorter, unit) => {
	const percentage = unit === "%";
	const parsedValue = fround(value);
	const parsedShorter = fround(shorter);
	// WHY: a percentage is taken of boxes no whole pixel bounds (Firefox floors a
	// table cell's `7.142857%` a step from `7.14285714%`), so it keeps the float
	// it parses to, as a whole and as a fraction, and every engine reads it alike.
	if (
		percentage &&
		(parsedValue !== parsedShorter ||
			fround(value / 100) !== fround(shorter / 100))
	) {
		return false;
	}
	const last = percentage ? LARGEST_PERCENTAGE_BASE : LARGEST_SCALE;
	// A percentage of its box: measured in Chromium, the float it parses scales
	// the box as a float and is divided by 100 as one.
	const divisor = percentage ? 100 : 1;
	// WHY: an engine adds a length to others before it snaps the sum, so one that
	// lands alike on its own can still tip a sum over a step (Semantic UI's
	// tooltip); the error is held to a thousandth of a step at the largest scale.
	if ((abs(value - shorter) * last * 64) / divisor > 1e-3) return false;
	for (let scale = 1; scale <= last; scale++) {
		if (
			!onOneStep((value * scale) / divisor, (shorter * scale) / divisor) ||
			// ...a double product stored as a float: Chromium lays a 18px line of
			// `line-height:1.3333333` out at 24px, where `1.33333` is 23.98438px.
			!onOneFloatStep(
				fround((value * scale) / divisor),
				fround((shorter * scale) / divisor)
			) ||
			!onOneFloatStep(
				fround(fround(parsedValue * scale) / divisor),
				fround(fround(parsedShorter * scale) / divisor)
			) ||
			// ...and as Gecko does: the float fraction times the box in 1/60px
			// units, floored, so `14.285714%` of 1400px is 199.98333px.
			!onOneFloatStep(
				fround(scale * 60 * fround(value / divisor)) / 60,
				fround(scale * 60 * fround(shorter / divisor)) / 60
			) ||
			// A bare number may divide a length too, as `aspect-ratio` does, and so
			// may a percentage: an auto table is sized by its cell over its share.
			((unit === "" || percentage) &&
				(!onOneStep((scale * divisor) / value, (scale * divisor) / shorter) ||
					!onOneFloatStep(
						fround((scale * divisor) / parsedValue),
						fround((scale * divisor) / parsedShorter)
					)))
		) {
			return false;
		}
	}
	return true;
};

/**
 * The shortest spelling of a number, from six significant digits up, that lays
 * out where the written one does and is itself the shortest of its own, so a
 * second pass leaves it alone; the number itself where none is shorter.
 * @param {string} num the normalized numeric text, scientific notation excluded
 * @param {string} unit its lowercased unit, `""` for a bare number
 * @returns {string} the shortest such number, or `num`
 */
const shortestAlike = (num, unit) => {
	if (num.length <= SIGNIFICANT_DIGITS) return num;
	const value = Number(num);
	for (let digits = SIGNIFICANT_DIGITS; ; digits++) {
		const rounded = value.toPrecision(digits);
		if (rounded.includes("e") || rounded.includes("E")) return num;
		const nearest = Number(rounded);
		// WHY: a divisor's error flips sign in the quotient, so `16/9` written
		// `1.7777778` floors 344px over it to 193.48438px; the spelling on the
		// value's other side, as long, lands where the exact one does.
		const last = 10 ** (Math.floor(Math.log10(Math.abs(nearest))) - digits + 1);
		const across = (
			nearest < value ? nearest + last : nearest - last
		).toPrecision(digits);
		for (const candidate of [rounded, across]) {
			if (candidate.includes("e") || candidate.includes("E")) continue;
			const text = normalizeNumber(candidate);
			if (text.length >= num.length) return num;
			if (
				landsAlike(value, Number(text), unit) &&
				shortestAlike(text, unit) === text
			) {
				return text;
			}
		}
	}
};

// How many searches `roundSignificant` keeps, by unit and number as written.
const SHORTEST_ALIKE_CACHE_SIZE = 4096;
/** @type {Map<string, string>} */
const shortestAlikeCache = new Map();

/**
 * The shortest spelling of a number that lays out where the written one does
 * (see {@link shortestAlike}), scientific notation left alone. A color
 * component, which no layout scales, takes six digits outright.
 * @param {string} num the normalized numeric text
 * @param {string=} unit its lowercased unit, `""` for a bare number; omitted for a color component
 * @returns {string} the shortest such number, or `num`
 */
const roundSignificant = (num, unit) => {
	// A number written in at most six characters carries at most six significant
	// digits, a sign and dot only taking away. Almost every number is this short.
	if (num.length <= SIGNIFICANT_DIGITS) return num;
	if (num.includes("e") || num.includes("E")) return num;
	// A component under 1e-6 is cleared to zero before it gets here, so six
	// digits of what is left never take an exponent.
	if (unit === undefined) {
		return normalizeNumber(Number(num).toPrecision(SIGNIFICANT_DIGITS));
	}
	// A framework repeats a long number hundreds of times, and each search scales
	// it at every step, so a search is kept until the cache is full and cleared.
	const key = `${unit} ${num}`;
	let shortest = shortestAlikeCache.get(key);
	if (shortest === undefined) {
		if (shortestAlikeCache.size === SHORTEST_ALIKE_CACHE_SIZE) {
			shortestAlikeCache.clear();
		}
		shortest = shortestAlike(num, unit);
		shortestAlikeCache.set(key, shortest);
	}
	return shortest;
};

// The absolute units that still convert once `convertLengthUnits` is off: every
// group but `length`, which is the one that option gates. Built on first use and
// kept, so a parse points at one table or the other rather than testing per token.
/** @type {Map<string, [string, number]> | null} */
let nonLengthUnitScale = null;

/**
 * The unit table a parse converts through, by what its options allow.
 * @param {boolean} lengths whether a length may be rewritten into another unit
 * @returns {Map<string, [string, number]>} the table to convert through
 */
const unitScaleFor = (lengths) => {
	if (lengths) return ABSOLUTE_UNIT_SCALE;
	if (nonLengthUnitScale === null) {
		nonLengthUnitScale = new Map();
		for (const [unit, scale] of ABSOLUTE_UNIT_SCALE) {
			if (scale[0] !== "length") nonLengthUnitScale.set(unit, scale);
		}
	}
	return nonLengthUnitScale;
};

// One operand as the value printer leaves it: a number, a dimension or a
// percentage. Sticky, so the tokenizer walks the expression without slicing it.
const CALC_OPERAND = /(?:\d*\.\d+|\d+)(?:e[+-]?\d+)?(%|[a-z]+)?/iy;

// `calc(` opening a nested expression. The inner one already printed, so it
// arrives here as text and is treated as the parentheses it is.
const CALC_OPEN = /calc\(/iy;

/**
 * The key a unit accumulates under. Units fixed against each other share their
 * group's key and are counted in its base unit, so `1in + 1px` is one term;
 * everything else keys on the unit itself, so `1em + 1px` stays two and is
 * declined below.
 * @param {string} unit the operand's unit, `""` for a plain number
 * @returns {[string, number]} the key and how many base units one of it is
 */
const calcUnitKey = (unit) => {
	if (unit === "") return ["", 1];
	const lower = unit.toLowerCase();
	const absolute = ABSOLUTE_UNIT_SCALE.get(lower);
	return absolute === undefined ? [lower, 1] : [absolute[0], absolute[1]];
};

// A constant a calculation may name, longest name first so none of them is
// matched as a prefix of another. The lookahead keeps `e` out of a unit.
const CALC_CONSTANT = new RegExp(
	`(?:${[...CALC_CONSTANTS.keys()]
		.sort((a, b) => b.length - a.length)
		.join("|")})(?![-\\w.%])`,
	"giy"
);

/**
 * Tokenize one printed `calc()` body.
 * @param {string} text the body
 * @returns {{ type: string, value: number, unit: string }[] | null} the tokens, or `null` when something here is not arithmetic
 */
const tokenizeCalc = (text) => {
	/** @type {{ type: string, value: number, unit: string }[]} */
	const tokens = [];
	let i = 0;
	let spaced = false;
	while (i < text.length) {
		const c = text[i];
		if (c === " ") {
			spaced = true;
			i++;
			continue;
		}
		if (c === "(" || c === ")") {
			tokens.push({ type: c, value: 0, unit: "" });
			spaced = false;
			i++;
			continue;
		}
		if (c === "*" || c === "/" || c === ",") {
			tokens.push({ type: c, value: 0, unit: "" });
			spaced = false;
			i++;
			continue;
		}
		// CSS Values 4 §10.1: `+` and `-` are operators only with whitespace on
		// both sides. Without it the sign belongs to the number, and two operands
		// with no operator between them is not an expression at all.
		if ((c === "+" || c === "-") && spaced && text[i + 1] === " ") {
			tokens.push({ type: c, value: 0, unit: "" });
			spaced = false;
			i++;
			continue;
		}
		CALC_OPEN.lastIndex = i;
		if (CALC_OPEN.test(text)) {
			tokens.push({ type: "(", value: 0, unit: "" });
			spaced = false;
			i = CALC_OPEN.lastIndex;
			continue;
		}
		let sign = 1;
		if (c === "+" || c === "-") {
			if (c === "-") sign = -1;
			i++;
		}
		// The numeric constants a calculation may name (CSS Values 4 §10.7). Read
		// before the operand, whose own pattern would take `e` for a unit.
		CALC_CONSTANT.lastIndex = i;
		const constant = CALC_CONSTANT.exec(text);
		if (constant !== null && constant.index === i) {
			// `infinity` and `NaN` are named in the table with no value, since no
			// printed number spells either.
			const named = CALC_CONSTANTS.get(asciiLowercaseName(constant[0]));
			if (!named) return null;
			tokens.push({ type: "value", value: sign * named, unit: "" });
			spaced = false;
			i = CALC_CONSTANT.lastIndex;
			continue;
		}
		CALC_OPERAND.lastIndex = i;
		const match = CALC_OPERAND.exec(text);
		if (match === null || match.index !== i) return null;
		const unit = match[1] === undefined ? "" : match[1];
		const value = Number(match[0].slice(0, match[0].length - unit.length));
		if (!Number.isFinite(value)) return null;
		tokens.push({ type: "value", value: sign * value, unit });
		spaced = false;
		i = CALC_OPERAND.lastIndex;
	}
	return tokens;
};

/**
 * Evaluate a tokenized expression into `key -> coefficient`, the sum CSS Values
 * 4 §10.11 reduces a calculation to.
 * @param {{ type: string, value: number, unit: string }[]} tokens the tokens
 * @param {{ at: number }} cursor the read position, carried through the recursion
 * @returns {Map<string, number> | null} the sum, or `null` when it cannot be evaluated exactly
 */
const evaluateCalcSum = (tokens, cursor) => {
	const sum = evaluateCalcProduct(tokens, cursor);
	if (sum === null) return null;
	for (;;) {
		const token = tokens[cursor.at];
		if (token === undefined || (token.type !== "+" && token.type !== "-")) {
			return sum;
		}
		cursor.at++;
		const right = evaluateCalcProduct(tokens, cursor);
		if (right === null) return null;
		const minus = token.type === "-";
		for (const [key, coefficient] of right) {
			// A finite coefficient stays finite negated.
			const scaled = minus ? -coefficient : coefficient;
			const previous = sum.get(key);
			if (previous === undefined) {
				sum.set(key, scaled);
				continue;
			}
			const added = foldAdd(previous, scaled);
			if (added === null) return null;
			sum.set(key, added);
		}
	}
};

/**
 * `<calc-product>`: a chain of `*` and `/`. The grammar takes only a `<number>`
 * on the right of a `/`, and a product needs one side to be a plain number for
 * the result to stay a sum of the units already there.
 * @param {{ type: string, value: number, unit: string }[]} tokens the tokens
 * @param {{ at: number }} cursor the read position
 * @returns {Map<string, number> | null} the sum, or `null`
 */
const evaluateCalcProduct = (tokens, cursor) => {
	let sum = evaluateCalcValue(tokens, cursor);
	if (sum === null) return null;
	for (;;) {
		const token = tokens[cursor.at];
		if (token === undefined || (token.type !== "*" && token.type !== "/")) {
			return sum;
		}
		cursor.at++;
		const right = evaluateCalcValue(tokens, cursor);
		if (right === null) return null;
		if (token.type === "/") {
			const divisor = right.get("");
			if (divisor === undefined || right.size !== 1) return null;
			/** @type {Map<string, number>} */
			const out = new Map();
			for (const [key, coefficient] of sum) {
				const quotient = foldDivide(coefficient, divisor);
				if (quotient === null) return null;
				out.set(key, quotient);
			}
			sum = out;
			continue;
		}
		const leftNumber = sum.size === 1 ? sum.get("") : undefined;
		const rightNumber = right.size === 1 ? right.get("") : undefined;
		// One side has to be a plain number; two dimensions multiply into a type no
		// property here accepts.
		const factor = rightNumber !== undefined ? rightNumber : leftNumber;
		const other = rightNumber !== undefined ? sum : right;
		if (factor === undefined) return null;
		/** @type {Map<string, number>} */
		const out = new Map();
		for (const [key, coefficient] of other) {
			const product = foldMultiply(coefficient, factor);
			if (product === null) return null;
			out.set(key, product);
		}
		sum = out;
	}
};

/**
 * `<calc-value>`: an operand, or a parenthesized sum.
 * @param {{ type: string, value: number, unit: string }[]} tokens the tokens
 * @param {{ at: number }} cursor the read position
 * @returns {Map<string, number> | null} the sum, or `null`
 */
const evaluateCalcValue = (tokens, cursor) => {
	const token = tokens[cursor.at];
	if (token === undefined) return null;
	if (token.type === "(") {
		cursor.at++;
		const inner = evaluateCalcSum(tokens, cursor);
		if (inner === null) return null;
		const close = tokens[cursor.at];
		if (close === undefined || close.type !== ")") return null;
		cursor.at++;
		return inner;
	}
	if (token.type !== "value") return null;
	cursor.at++;
	const [key, scale] = calcUnitKey(token.unit);
	const value = foldMultiply(token.value, scale);
	return value === null ? null : new Map([[key, value]]);
};

/**
 * Where a string or an escape opening at `i` in printed text ends, so a scan for
 * top-level punctuation steps over what it holds.
 * @param {string} text printed text
 * @param {number} i the offset of a quote or of a `\`
 * @returns {number} the offset of its last character
 */
const quotedTextEnd = (text, i) => {
	const quote = text.charCodeAt(i);
	if (quote === CC_REVERSE_SOLIDUS) return skipEscape(text, i) - 1;
	let end = i + 1;
	while (end < text.length && text.charCodeAt(end) !== quote) {
		if (text.charCodeAt(end) === CC_REVERSE_SOLIDUS) end++;
		end++;
	}
	return end;
};

/**
 * Split on the commas at the top of a function body, so a nested call's own
 * arguments, and a string's or an escape's comma, stay in the piece that holds it.
 * @param {string} text the body between one call's parentheses
 * @returns {string[]} its arguments, still as written
 */
const splitTopLevelArguments = (text) => {
	/** @type {string[]} */
	const parts = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		if (
			code === CC_QUOTATION_MARK ||
			code === CC_APOSTROPHE ||
			code === CC_REVERSE_SOLIDUS
		) {
			i = quotedTextEnd(text, i);
		} else if (code === 0x28) {
			depth++;
		} else if (code === 0x29) {
			depth--;
		} else if (code === 0x2c && depth === 0) {
			parts.push(text.slice(start, i));
			start = i + 1;
		}
	}
	parts.push(text.slice(start));
	return parts;
};

const HEX = "0123456789abcdef";

/**
 * @param {number} n byte value 0..255
 * @returns {string} its two lowercase hex digits
 */
const hex2 = (n) => HEX[(n >> 4) & 15] + HEX[n & 15];

/**
 * The shortest opaque color text for (r, g, b): a named color where one is
 * shorter than the hex (`RGB_TO_NAME` holds only those), else a collapsed 3-hex
 * or a 6-hex.
 * @param {number} r red 0..255
 * @param {number} g green 0..255
 * @param {number} b blue 0..255
 * @returns {string} the shortest form
 */
const shortestColor = (r, g, b) => {
	const name = RGB_TO_NAME.get((r << 16) | (g << 8) | b);
	if (name !== undefined) return name;
	const rr = hex2(r);
	const gg = hex2(g);
	const bb = hex2(b);
	return rr[0] === rr[1] && gg[0] === gg[1] && bb[0] === bb[1]
		? `#${rr[0]}${gg[0]}${bb[0]}`
		: `#${rr}${gg}${bb}`;
};

/**
 * The shortest text for (r, g, b, a) with an alpha below 1 - a 4- or 8-digit hex,
 * always shorter than the `rgba()` it came from. No named color has an alpha.
 * @param {number} r red 0..255
 * @param {number} g green 0..255
 * @param {number} b blue 0..255
 * @param {number} a alpha 0..255
 * @returns {string} the shortest form
 */
const shortestAlphaColor = (r, g, b, a) => {
	const rr = hex2(r);
	const gg = hex2(g);
	const bb = hex2(b);
	const aa = hex2(a);
	return rr[0] === rr[1] &&
		gg[0] === gg[1] &&
		bb[0] === bb[1] &&
		aa[0] === aa[1]
		? `#${rr[0]}${gg[0]}${bb[0]}${aa[0]}`
		: `#${rr}${gg}${bb}${aa}`;
};

/**
 * The shortest `<alpha-value>` naming one of the 256 bytes a hex alpha spells.
 * The engine quantizes the channel to 8 bits, so any decimal that rounds back to
 * the same byte is the same color - `.5` for `80`. Every byte round-trips at
 * three decimals or fewer, so the search always ends. `255` is not one of them:
 * an opaque color is written without an alpha at all, so both callers take that
 * path before reaching here.
 * @param {number} a alpha 0..254
 * @returns {string} the alpha text
 */
const alphaByteText = (a) => {
	if (a === 0) return "0";
	const exact = a / 255;
	let digits = 1;
	let rounded = exact.toFixed(digits);
	while (clamp255(Number(rounded) * 255) !== a) {
		rounded = exact.toFixed(++digits);
	}
	// A `0.5` is `.5`, and a trailing zero says nothing.
	return rounded.replace(/0+$/, "").slice(1);
};

/**
 * @param {number} x a number
 * @returns {number} `x` rounded and clamped to a 0..255 byte
 */
const clamp255 = (x) => (x < 0 ? 0 : x > 255 ? 255 : Math.round(x));

/**
 * Whether a channel lands a hair off a byte's half, where the precision an engine
 * computes it at picks the byte. An exact half is not one: it rounds up anywhere.
 * @param {number} channel the channel, on the 0..255 scale
 * @returns {boolean} true when engines may round it apart
 */
const nearByteHalf = (channel) => {
	const off = Math.abs((channel % 1) - 0.5);
	return off !== 0 && off < 0.001;
};

/**
 * Minify an `rgb()` / `rgba()` color function to the shortest opaque form. Only
 * rgb/rgba (exact integer / percent math); returns null for anything else -
 * a different function, non-numeric args, or a partly-transparent alpha -
 * leaving it as its normalized function form. Transparent black collapses to the
 * `transparent` keyword (identical value, universally supported, shorter). hsl is
 * intentionally not converted: its hue math can round to a different byte, which
 * would change the color.
 * @param {string} fn the lowercased function name
 * @param {string} inner the already-joined argument text
 * @param {boolean} hexAlpha whether the target reads a 4-/8-digit hex (see `output.environment`)
 * @param {boolean} operand whether the color is read as numbers here, which only an exact conversion survives
 * @returns {string | null} the shortest color, or null to keep the function
 */
const minifyColorFunction = (fn, inner, hexAlpha, operand) => {
	if ((fn !== "rgb" && fn !== "rgba") || !S._transforms.shortenColors) {
		return null;
	}
	// Cut on the separators `rgb()` allows - whitespace, `,` and the `/` before the
	// alpha - in one pass. Every color reaches this, and the regex form built a
	// replaced copy, a split array and a filtered copy for the same few strings.
	/** @type {string[]} */
	const args = [];
	let from = -1;
	for (let i = 0; i <= inner.length; i++) {
		// Spelled out, below `0`, rather than asked for: a call per character loses
		// to the regex engine, and anything looser than the five whitespace code
		// points parts a token CSS does not, making an invalid declaration valid.
		const c = inner.charCodeAt(i);
		if (
			i === inner.length ||
			(c < CC_0 &&
				(c === CC_SPACE ||
					c === CC_TAB ||
					c === CC_LINE_FEED ||
					c === CC_CARRIAGE_RETURN ||
					c === CC_FORM_FEED ||
					c === CC_COMMA ||
					c === CC_SOLIDUS))
		) {
			if (from === -1) continue;
			// A fifth argument is not a color this rewrite is defined for.
			if (args.length === 4) return null;
			args.push(inner.slice(from, i));
			from = -1;
		} else if (from === -1) {
			from = i;
		}
	}
	if (args.length !== 3 && args.length !== 4) return null;
	// WHY: the scan above states the runs between the separators without saying
	// which separator stood there, so `rgb(1, 2 3)` and `rgb(1 2 3 .5)` read as
	// three or four arguments like any other spelling. CSS Color 4 gives `rgb()`
	// a modern `A B C` with an optional `/ D` and a legacy `A, B, C` with an
	// optional `, D`; a spelling matching neither is a declaration engines drop.
	if (!COLOR_LEGACY_RE.test(inner) && !COLOR_MODERN_RE.test(inner)) {
		return null;
	}
	/** @type {number[]} */
	const channels = [];
	// The channels as written, before the byte: what a mix or a relative
	// reference computes with is the number, not the pixel it would paint.
	/** @type {number[]} */
	const written = [];
	let alpha = 1;
	let percentChannelCount = 0;
	let roundedChannel = false;
	for (let i = 0; i < args.length; i++) {
		const s = args[i];
		if (!/^[+-]?(?:\d+\.?\d*|\.\d+)%?$/.test(s)) return null;
		const pct = s.endsWith("%");
		// A number by the pattern above, so never NaN.
		const v = Number.parseFloat(pct ? s.slice(0, -1) : s);
		if (i === 3) {
			alpha = pct ? v / 100 : v;
		} else {
			if (pct) percentChannelCount++;
			const channel = pct ? (v * 255) / 100 : v;
			// WHY: a percentage a hair off a byte's half is no byte engines agree on -
			// measured in Chromium, `66.862745098%` is 170.4999999999 and paints 171 -
			// so the spelling is kept. An exact half rounds up in every engine.
			if (pct && nearByteHalf(channel)) return null;
			// A hex is the same color only where the channel is already a byte -
			// `rgb(50% 50% 50%)` is 127.5, not `gray`. One out of range is: it clamps.
			if (!Number.isInteger(channel)) roundedChannel = true;
			// Clamped but not rounded: a mix or a relative color reads its channels
			// from here, and the engine computes with the number, not the byte.
			written.push(channel < 0 ? 0 : channel > 255 ? 255 : channel);
			channels.push(clamp255(channel));
		}
	}
	// Mixed number/percentage channels are invalid CSS (ignored by browsers);
	// rewriting would activate a dead declaration.
	if (percentChannelCount !== 0 && percentChannelCount !== 3) return null;
	if (operand && roundedChannel) return null;
	S._fallbackChannels = written;
	S._fallbackAlpha = alpha;
	S._fallbackClipped = false;
	S._fallbackConversion = ENCODED_ALREADY;
	// Fully transparent *black* only - `transparent` is `rgba(0,0,0,0)`, so a
	// non-black transparent (e.g. `rgba(255,0,0,0)`) is a different value.
	if (
		alpha === 0 &&
		channels[0] === 0 &&
		channels[1] === 0 &&
		channels[2] === 0
	) {
		return "transparent";
	}
	// WHY: a hex alpha is the same color, the engine quantizing the channel to 8
	// bits, so the byte a decimal alpha lands on is the one it already stores -
	// `.5`, `.501`, `.502` and `.5019` all compute to `rgba(0,0,0,0.5)` in headless
	// Chromium, and every one of the 256 bytes round-trips.
	if (alpha < 1) {
		return hexAlpha
			? shortestAlphaColor(
					channels[0],
					channels[1],
					channels[2],
					clamp255(alpha * 255)
				)
			: null;
	}
	return shortestColor(channels[0], channels[1], channels[2]);
};

// Where a browser's version sits in a `getSupportProfiles()` row, which is also the
// slot a prefix window names it by and the one the parsed selection holds it in.
// Built from the order the rows are stated in, so the three cannot drift apart.
/** @type {Map<string, number>} */
const SUPPORT_BROWSER_SLOT = new Map(
	SUPPORT_BROWSERS.map((browser, at) => [browser, at])
);

/**
 * Parse a browserslist selection into the versions selected for each browser
 * slot, memoized on the selection itself, and make it the one this parse
 * prefixes for. Null where it resolves to no browser at all, which is not a
 * target to prefix for.
 * @param {string[]} browsers the browserslist selection
 * @returns {void}
 */
const useBrowsers = (browsers) => {
	// The same selection usually arrives as the same array - one resolution per
	// target serves the whole build - so the text it joins to is read only where
	// it does not, which is a worker handed each asset's own copy.
	if (browsers === S._browsersArray) {
		S._prefixBrowsers = S._parsedBrowsersMemo;
		S._someBrowserUnanswered = S._someBrowserUnansweredMemo;
		return;
	}
	S._browsersArray = browsers;
	const key = browsers.join(",");
	if (key !== S._browsersKey) {
		S._browsersKey = key;
		S._neededPrefixMemo = new Map();
		// By the slot the tables name a browser with, so neither the profile rows
		// nor the prefix windows carry a name to look one up by.
		/** @type {(number[] | undefined)[]} */
		const parsed = Array.from({ length: SUPPORT_BROWSERS.length });
		let named = 0;
		let unanswered = false;
		/** @type {Set<string> | null} */
		let unstatedPrefixes = new Set();
		for (const entry of browsers) {
			const space = entry.indexOf(" ");
			const name = space === -1 ? entry : entry.slice(0, space);
			const version =
				space === -1 ? null : encodeBrowserVersion(entry.slice(space + 1));
			// A browserslist name no compat dataset covers, or a version that did
			// not parse, is skipped - the same browsers lightningcss's target
			// mapping drops, so both minifiers prefix for the same selection.

			// WHY: noted rather than only skipped, because the two readers of this
			// want opposite answers for a browser nothing states. Reaching for a
			// spelling it may not read costs it nothing, so prefixing goes on
			// without it; dropping the declaration before one takes away the only
			// spelling it could have read, so `valueReadByTarget` declines for the
			// whole selection instead.
			const slot =
				version === null ? undefined : SUPPORT_BROWSER_SLOT.get(name);
			if (slot === undefined) {
				const engine = UNSTATED_BROWSER_PREFIXES.get(name);
				// Node renders no CSS, so it is no target a stylesheet answers to.
				if (engine === null) continue;
				unanswered = true;
				if (engine === undefined) unstatedPrefixes = null;
				else if (unstatedPrefixes !== null) unstatedPrefixes.add(engine);
				continue;
			}
			// Every selected version is kept: a prefix window is an interval, so an
			// older selection outside it does not answer for a newer one inside.
			const versions = parsed[slot];
			if (versions === undefined) {
				parsed[slot] = [/** @type {number} */ (version)];
				named++;
			} else {
				versions.push(/** @type {number} */ (version));
			}
		}
		// Only browsers nothing states is still a target, which reads nothing known.
		S._parsedBrowsersMemo = named === 0 && !unanswered ? null : parsed;
		S._someBrowserUnansweredMemo = unanswered;
		S._unstatedPrefixesMemo = unstatedPrefixes;
	}
	S._prefixBrowsers = S._parsedBrowsersMemo;
	S._someBrowserUnanswered = S._someBrowserUnansweredMemo;
	S._unstatedPrefixes = S._unstatedPrefixesMemo;
};

/**
 * Whether a target browser the tables do not state reads a vendor prefix, which
 * only its own engine's is.
 * @param {string} prefix the prefix, `-ms-` and the like
 * @returns {boolean} true when such a browser may read it
 */
const unstatedReads = (prefix) =>
	S._someBrowserUnanswered &&
	(S._unstatedPrefixes === null || S._unstatedPrefixes.has(prefix));

/**
 * A browserslist version to the same `major * 100000 + minor` integer the table
 * is keyed in. A range (`10.0-10.2`) takes its low end, Safari `TP` is newest,
 * and `all` (Opera Mini) is oldest (`0`).
 * @param {string} version the version part of a `"name version"` entry
 * @returns {number | null} the encoded version, or null when unreadable
 */
const encodeBrowserVersion = (version) => {
	// Newer than any real version, but below `NEVER` - a still-prefixed feature
	// carries `to === NEVER`, and `TP < NEVER` must hold for TP to need it.
	if (version === "TP") return NEVER - 1;
	if (version === "all") return 0;
	const dash = version.indexOf("-");
	const low = dash === -1 ? version : version.slice(0, dash);
	const dot = low.indexOf(".");
	const major = Number.parseInt(dot === -1 ? low : low.slice(0, dot), 10);
	if (Number.isNaN(major)) return null;
	const minor = dot === -1 ? 0 : Number.parseInt(low.slice(dot + 1), 10) || 0;
	return major * 100000 + minor;
};

// `getValueSupportPacked()` unpacked, on the first lookup a build makes: only a
// build with a target and two declarations of one property asks.
/** @type {Map<string, number> | null} */
let valueSupport = null;

/**
 * When every target browser first read one value, by the spelling
 * `getValueSupportPacked()` names it: `"<property> <keyword>"` for a keyword a
 * property's own grammar states, the bare name for a color function.
 * @param {string} key the spelling
 * @returns {number | undefined} its `getSupportProfiles()` row, or undefined
 */
const valueSupportedFrom = (key) => {
	let table = valueSupport;
	if (table === null) {
		table = new Map();
		for (const group of getValueSupportPacked().split("|")) {
			const colon = group.indexOf(":");
			const property = group.slice(0, colon);
			const prefix = property.length === 0 ? "" : `${property} `;
			const entries = group.slice(colon + 1).split(" ");
			for (let at = 0; at < entries.length; at += 2) {
				table.set(prefix + entries[at], Number(entries[at + 1]));
			}
		}
		valueSupport = table;
	}
	return table.get(key);
};

/**
 * Whether every target browser reads a CSS ability, so a spelling that needs it
 * may be reached for. No selection names no browser to answer for, so the
 * ability is assumed - a build with no browserslist keeps every rewrite. A
 * browser the table does not name is one nothing states support for, which
 * answers no.
 * @param {string} feature a `SUPPORTED_FROM` key
 * @returns {boolean} true when the selection reads it
 */
const targetSupports = (feature) =>
	S._prefixBrowsers === null || readsAll(SUPPORTED_FROM.get(feature));

/**
 * Whether every target browser is at or past the versions in one support
 * profile, named by the row it reads.
 * @param {number | undefined} profile a `getSupportProfiles()` index
 * @returns {boolean} true when the selection reads it
 */
const readsAll = (profile) =>
	S._prefixBrowsers === null ||
	(!S._someBrowserUnanswered && readsAllStated(profile));

/**
 * Whether every target browser the tables state is at or past one support
 * profile, which is what a lowering that only adds readers asks.
 * @param {number | undefined} profile a `getSupportProfiles()` index
 * @returns {boolean} true when every stated browser reads it
 */
const readsAllStated = (profile) => {
	// Asked only with a selection: setup asks under `_prefixBrowsers !== null`, and
	// `readsAll` answers a missing one itself.
	const parsed = /** @type {(number[] | undefined)[]} */ (S._prefixBrowsers);
	if (profile === undefined) return false;
	// One row of `SUPPORT_BROWSERS.length` versions, laid end to end with the rest.
	const row = profile * SUPPORT_BROWSERS.length;
	const profiles = getSupportProfiles();
	// A selection of only browsers nothing states vouches for nothing.
	let stated = false;
	for (let at = 0; at < parsed.length; at++) {
		const versions = parsed[at];
		if (versions === undefined) continue;
		stated = true;
		const from = profiles[row + at];
		for (let i = 0; i < versions.length; i++) {
			if (versions[i] < from) return false;
		}
	}
	return stated;
};

// The browsers standing for the three engines that ship today.
const ENGINE_BROWSERS = ["chrome", "firefox", "safari"].map((name) =>
	SUPPORT_BROWSERS.indexOf(name)
);

/**
 * Whether each engine shipping today reads an ability in some release, which is
 * what a selector needs where no selection names the browsers to answer for.
 * @param {number} profile its `getSupportProfiles()` row
 * @returns {boolean} true when Chromium, Gecko and WebKit all read it
 */
const readByEveryEngine = (profile) => {
	const row = profile * SUPPORT_BROWSERS.length;
	const profiles = getSupportProfiles();
	for (const at of ENGINE_BROWSERS) {
		if (profiles[row + at] === NEVER) return false;
	}
	return true;
};

/**
 * Whether the targets read an ability: the selection's browsers, or with none
 * each engine shipping today, which is what `dropOverriddenDeclarations` assumes.
 * @param {number | undefined} profile its `getSupportProfiles()` row
 * @returns {boolean} true when the later value it names is read
 */
const readsOverridingValue = (profile) =>
	S._prefixBrowsers === null
		? profile !== undefined && readByEveryEngine(profile)
		: readsAll(profile);

/**
 * The vendor spellings at least one target browser still needs for a construct -
 * a target at version V needs spelling S when some `[browser, from, to]` of S has
 * `from <= V < to`. Null when
 * the construct is never prefixed, or no target needs any of its spellings.
 * @param {Map<string, [string, number][]>} table its axis' prefix table
 * @param {string} name the construct name (unprefixed, lowercased)
 * @returns {Set<string> | null} the needed spellings, or null
 */
const neededPrefixes = (table, name) => {
	// Asked only while prefixing, which a selection turns on.
	const parsed = /** @type {(number[] | undefined)[]} */ (S._prefixBrowsers);
	let cache = S._neededPrefixMemo.get(table);
	if (cache === undefined) {
		cache = new Map();
		S._neededPrefixMemo.set(table, cache);
	}
	const cached = cache.get(name);
	if (cached !== undefined) return cached;
	const prefixes = table.get(name);
	/** @type {Set<string> | null} */
	let result = null;
	if (prefixes !== undefined) {
		/** @type {Set<string>} */
		const needed = new Set();
		const prefixWindows = getPrefixWindows();
		for (const [prefix, windows] of prefixes) {
			// The list's own `browser, from, to` triples, in the flat table the
			// starts index into.
			const end = PREFIX_WINDOW_STARTS[windows + 1];
			for (let at = PREFIX_WINDOW_STARTS[windows]; at < end; at += 3) {
				const versions = parsed[prefixWindows[at]];
				if (versions === undefined) continue;
				const from = prefixWindows[at + 1];
				const to = prefixWindows[at + 2];
				let hit = false;
				for (let i = 0; i < versions.length; i++) {
					if (versions[i] >= from && versions[i] < to) {
						hit = true;
						break;
					}
				}
				if (hit) {
					needed.add(prefix);
					break;
				}
			}
		}
		if (needed.size !== 0) result = needed;
	}
	cache.set(name, result);
	return result;
};

// A vendor prefix at the start of a name (`-webkit-`, `-moz-`, `-ms-`, `-o-`,
// `-khtml-`), captured so it can be split from the construct it sits on.
const VENDOR_PREFIX = /^(-[a-z]+-)(?=[a-z])/;

// Whether each prefix is one the selection still reads - kept until the
// selection changes rather than answered per rule.
/** @type {Map<string, boolean>} */
const prefixLiveMemo = new Map();
/** @type {(number[] | undefined)[] | null} */
let prefixLiveFor = null;

/**
 * Whether a construct's `[browser, from, to]` windows hold one the selection
 * sits inside.
 * @param {number} windows the windows' index into `PREFIX_WINDOW_STARTS`
 * @param {(number[] | undefined)[]} parsed the selected versions, per browser slot
 * @returns {boolean} true when a selected version falls in one of them
 */
const windowsHitSelection = (windows, parsed) => {
	const prefixWindows = getPrefixWindows();
	const end = PREFIX_WINDOW_STARTS[windows + 1];
	for (let at = PREFIX_WINDOW_STARTS[windows]; at < end; at += 3) {
		const versions = parsed[prefixWindows[at]];
		if (versions === undefined) continue;
		const from = prefixWindows[at + 1];
		const to = prefixWindows[at + 2];
		for (let i = 0; i < versions.length; i++) {
			if (versions[i] >= from && versions[i] < to) return true;
		}
	}
	return false;
};

/**
 * Whether one prefix table names a spelling carrying `prefix` that the
 * selection still needs.
 * @param {Map<string, [string, number][]>} table a prefix table
 * @param {string} prefix the prefix, `-ms-` and the like
 * @param {(number[] | undefined)[]} parsed the selected versions, per browser slot
 * @returns {boolean} true when one of its spellings is still needed
 */
const tableNeedsPrefix = (table, prefix, parsed) => {
	for (const spellings of table.values()) {
		for (const [spelling, windows] of spellings) {
			if (spelling.startsWith(prefix) && windowsHitSelection(windows, parsed)) {
				return true;
			}
		}
	}
	return false;
};

/**
 * Whether any target reads a vendor prefix at all. Asked of the tables as a
 * whole rather than of one name, so it answers for a proprietary pseudo none of
 * them names: a prefix nothing in the selection needs is one whose engine the
 * selection has left behind.
 * @param {string} prefix the prefix, `-ms-` and the like
 * @returns {boolean} true when a target still reads it
 */
const prefixIsLive = (prefix) => {
	const parsed = S._prefixBrowsers;
	// Told no target, every prefix is assumed read; so is one an engine the
	// tables do not state reads.
	if (parsed === null || unstatedReads(prefix)) return true;
	if (prefixLiveFor !== parsed) {
		prefixLiveMemo.clear();
		prefixLiveFor = parsed;
	}
	const cached = prefixLiveMemo.get(prefix);
	if (cached !== undefined) return cached;
	// Every prefix the data names sits on some property, selector or at-rule, so
	// the value table - held one level deeper - would answer for none of its own.
	let live = false;
	for (const table of [
		getPrefixedProperties(),
		PREFIXED_SELECTORS,
		PREFIXED_AT_RULES
	]) {
		if (tableNeedsPrefix(table, prefix, parsed)) {
			live = true;
			break;
		}
	}
	prefixLiveMemo.set(prefix, live);
	return live;
};

/**
 * The index of the `)` closing the `(` at `at`, stepping over an escape, a
 * quoted run and a nested pair. The end of the text where it closes nowhere,
 * which a parsed selector never does - an unclosed function is closed for it.
 * @param {string} text the text to read
 * @param {number} at the index of the opening parenthesis
 * @returns {number} where the list it opens ends
 */
const closingParenthesis = (text, at) => {
	let depth = 0;
	let i = at;
	for (; i < text.length; i++) {
		const code = text.charCodeAt(i);
		if (code === CC_REVERSE_SOLIDUS) {
			i++;
		} else if (code === CC_QUOTATION_MARK || code === CC_APOSTROPHE) {
			for (i++; i < text.length; i++) {
				const inner = text.charCodeAt(i);
				if (inner === CC_REVERSE_SOLIDUS) i++;
				else if (inner === code) break;
			}
		} else if (code === CC_LEFT_PARENTHESIS) {
			depth++;
		} else if (code === CC_RIGHT_PARENTHESIS && --depth === 0) {
			break;
		}
	}
	return i;
};

// The run of a selector `needsGoneEnginePseudo` and `pseudosReadable` step
// over: no escape, quote or `:`.
const PSEUDO_SCAN_PLAIN = /[^\\"':]*/y;

/**
 * Whether a selector can only be read through a vendor pseudo whose engine the
 * selection has left behind. An escape and a quoted attribute value are stepped
 * over: the `:` of `.sm\:flex` and of `[href="a:b"]` starts no pseudo.
 * @param {string} selector one printed selector
 * @returns {boolean} true when no target can read it
 */
const needsGoneEnginePseudo = (selector) => {
	let found = false;
	for (let i = 0; i < selector.length; i++) {
		PSEUDO_SCAN_PLAIN.lastIndex = i;
		PSEUDO_SCAN_PLAIN.test(selector);
		i = PSEUDO_SCAN_PLAIN.lastIndex;
		if (i === selector.length) break;
		const code = selector.charCodeAt(i);
		if (code === CC_REVERSE_SOLIDUS) {
			i++;
			continue;
		}
		if (code === CC_QUOTATION_MARK || code === CC_APOSTROPHE) {
			for (i++; i < selector.length; i++) {
				const inner = selector.charCodeAt(i);
				if (inner === CC_REVERSE_SOLIDUS) i++;
				else if (inner === code) break;
			}
			continue;
		}
		if (code !== CC_COLON) continue;
		let end = i + 1;
		if (selector.charCodeAt(end) === CC_COLON) end++;
		const from = end;
		IDENT_RUN.lastIndex = end;
		IDENT_RUN.test(selector);
		end = IDENT_RUN.lastIndex;
		const name = toLowerCaseIfNeeded(selector.slice(from, end));
		if (
			(name === "is" || name === "where") &&
			selector.charCodeAt(end) === CC_LEFT_PARENTHESIS
		) {
			// A forgiving list keeps every argument it can parse, so it matches
			// nothing only where all of them are dead - and the rest is still read.
			const close = closingParenthesis(selector, end);
			if (everyOneGone(selector.slice(end + 1, close))) found = true;
			i = close;
			continue;
		}
		const prefix = VENDOR_PREFIX.exec(name);
		if (prefix !== null && !prefixIsLive(prefix[1])) found = true;
		i = end - 1;
	}
	return found;
};

/**
 * Whether every selector of a list is one no target can read. Asked of a rule's
 * own prelude and of a forgiving list's arguments alike, which is why it takes
 * the list rather than the rule.
 * @param {string} list a printed selector list
 * @returns {boolean} true when none of them can be read
 */
const everyOneGone = (list) => {
	const selectors = splitSelectorList(list);
	for (let i = 0; i < selectors.length; i++) {
		if (!needsGoneEnginePseudo(selectors[i])) return false;
	}
	return true;
};

/**
 * Whether a whole selector list is one no target can read, which is a rule that
 * paints nothing anywhere it is served. Only a list every selector of which is
 * dead: an engine drops the rule over one selector it cannot parse, so a list
 * holding a live one already matches nothing extra, and taking the dead one out
 * would start it matching.
 * @param {string} list a printed selector list
 * @returns {boolean} true when the rule may go
 */
const readsThroughGoneEngine = (list) => {
	// A vendor pseudo is a `:` a `-` follows, so a list without that pair holds
	// none - which is nearly every list, and the walk is skipped for them.
	if (!S._transforms.removeDeadRules || !list.includes(":-")) return false;
	return everyOneGone(list);
};

/**
 * Whether a rule whose nested rules a lowering writes out holds a selector no
 * target can read: every target drops the list over it, and the rules nested
 * in it with it, which `:is()` around the list would forgive.
 * @param {Node} rule the rule
 * @param {string} list its printed selector list
 * @returns {boolean} true when the rule and its nested rules may go
 */
const lowersThroughGoneEngine = (rule, list) => {
	if (!S._transforms.removeDeadRules || !list.includes(":-")) return false;
	const nested = rulesOf(rule);
	if (nested === null || nested.length === 0) return false;
	const selectors = splitSelectorList(list);
	for (let i = 0; i < selectors.length; i++) {
		if (needsGoneEnginePseudo(selectors[i])) return true;
	}
	return false;
};

/**
 * Whether a present vendor-spelled property is dead weight beside its standard
 * twin. A 2009 flexbox property is not where its block lays out by that draft,
 * which reads it in place of the twin.
 * @param {string} base the standard property
 * @param {string} spelling the vendor-spelled one
 * @returns {boolean} true when it can be dropped
 */
const prefixedPropertyRemovable = (base, spelling) =>
	spelling === DECORATION_SPELLING
		? S._textDecorationColorStyleAllowed && S._textDecorationThicknessAllowed
		: !(S._legacyBoxBlock && LEGACY_BOX_SPELLINGS.has(spelling)) &&
			prefixRemovable(getPrefixedProperties(), base, spelling);

// WHY: Safari read `text-decoration`'s style, color and thickness through this
// spelling alone before 26.2. BCD files that prefix under the sub-feature, so the
// property table holds none, and the spelling goes with the feature's own row.
const DECORATION_SPELLING = "-webkit-text-decoration";

/**
 * Whether a present vendor-spelled construct is dead weight: its spelling is one
 * the table knows for the base construct and no target browser needs it, so an
 * unprefixed sibling already covers every target.
 * @param {Map<string, [string, number][]>} table its axis' prefix table
 * @param {string} base the unprefixed construct name
 * @param {string} spelling the vendor spelling found in its place
 * @returns {boolean} true when the vendor-spelled construct can be dropped
 */
const prefixRemovable = (table, base, spelling) => {
	// A browser nothing states may be the one still reading the vendor spelling.
	if (S._someBrowserUnanswered) {
		const vendor = VENDOR_PREFIX.exec(spelling);
		if (vendor === null || unstatedReads(vendor[1])) return false;
	}
	const spellings = table.get(base);
	if (spellings === undefined) return false;
	if (!spellings.some(([known]) => known === spelling)) return false;
	const needed = neededPrefixes(table, base);
	return needed === null || !needed.has(spelling);
};

/**
 * What a block's rules have shown so far: the signatures met (`seen`), and the
 * prefixed ones an unprefixed twin would make dead - as an output piece the
 * writer can take back (`retractable`, for a rule written straight out), or as
 * the node itself (`pending`, for a rule whose parent still has to assemble it).
 * @typedef {object} PrefixScope
 * @property {Set<string>} seen the signatures met, and the `signature\0prefix`
 * markers of the prefixed spellings among them
 * @property {Map<string, number[]> | null} retractable each dead-if-twinned
 * rule's piece index, by the signature of the twin that would make it dead
 * @property {Map<string, Node[]> | null} pending each dead-if-twinned nested
 * rule, by that same signature
 * @property {Set<Node> | null} dead the nested rules a twin has since made dead,
 * read by their parent as it assembles its body
 * @property {{ missing: Set<string>, piece: number, node: Node | null }[] | null}
 * covering each prefixed list still short of a twin for some of its selectors,
 * with the signatures it is still waiting for
 */

/**
 * The rules already met in the block a rule sits in, made on first use.
 * @param {Node | null} parent the block's rule, null for the stylesheet itself
 * @returns {PrefixScope} the block's running sibling state
 */
const prefixScope = (parent) => {
	const scopes = /** @type {Map<Node | null, PrefixScope>} */ (
		S._seenPrefixRules
	);
	let scope = scopes.get(parent);
	if (scope === undefined) {
		scope = {
			seen: new Set(),
			retractable: null,
			pending: null,
			dead: null,
			covering: null
		};
		scopes.set(parent, scope);
	}
	return scope;
};

/**
 * Add one held twin to its signature's list, made on first use. A block may
 * write several prefixed spellings of the same rule, and one twin kills them all.
 * @template T
 * @param {Map<string, T[]>} held every held twin, by signature
 * @param {string} signature the rule's sibling signature
 * @param {T} value the piece index or node to hold
 * @returns {void}
 */
const holdBySignature = (held, signature, value) => {
	const list = held.get(signature);
	if (list === undefined) held.set(signature, [value]);
	else list.push(value);
};

// A property's vendor spelling back to the property it stands for, built once
// from the forward table. Read rather than derived, since an engine as often
// renamed a property as prefixed it, and only a prefix strips back off.
/** @type {Map<string, string> | null} */
let prefixedPropertyNames = null;
/**
 * @param {string} property a declaration's property name
 * @returns {string | undefined} the property it is a vendor spelling of
 */
const prefixedPropertyName = (property) => {
	if (property === DECORATION_SPELLING) return "text-decoration";
	if (prefixedPropertyNames === null) {
		prefixedPropertyNames = new Map();
		for (const [base, spellings] of getPrefixedProperties()) {
			for (const [spelling] of spellings) {
				prefixedPropertyNames.set(spelling, base);
			}
		}
	}
	return prefixedPropertyNames.get(property);
};

// A number with no sign, unit or exponent: what a legacy spelling reading one
// is written with, and what an offset can be added to exactly.
const UNSIGNED_NUMBER_REGEXP = /^(?:\d+\.?\d*|\.\d+)$/;

/**
 * One prefixed copy of a declaration, for a spelling a target still needs. A
 * spelling whose older property read other keywords or a number carries them
 * with it, and writes nothing for a value that property cannot read.
 * @param {string} spelling the vendor spelling to write
 * @param {string} text the declaration's printed text
 * @param {number} colon where its `:` sits
 * @returns {string} the copy, empty where none can be written
 */
const prefixedDeclaration = (spelling, text, colon) => {
	const keywords = getPrefixedSpellingKeywords().get(spelling);
	if (keywords === undefined) return spelling + text.slice(colon);
	const end = printedValueEnd(text, colon);
	const value = toLowerCaseIfNeeded(text.slice(colon + 1, end));
	// A CSS-wide keyword is every property's, whatever its own grammar says.
	if (CSS_WIDE_KEYWORDS.has(value)) return spelling + text.slice(colon);
	let legacy = keywords.get(value);
	if (legacy === undefined) {
		const offset = PREFIXED_SPELLING_NUMBERS.get(spelling);
		if (offset === undefined) return "";
		const first = value.split(" ", 1)[0];
		if (!UNSIGNED_NUMBER_REGEXP.test(first)) return "";
		legacy = offset === 0 ? first : `${Number(first) + offset}`;
	}
	// `!important` and the `;` carry over; the value between them is rewritten.
	return `${spelling}:${legacy}${text.slice(end)}`;
};

// WHY: the shape of every name some engine spells its own way - one bit per
// length, under the pair of letters it starts with. A declaration whose first
// two letters and length are not among those can be neither prefixed nor
// value-spelled, so its name is never read, which covers most of them,
// `content`, `opacity` and `margin-left` among the commonest. 676 slots, filled
// the first time a parse prefixes for a target and kept after.
/** @type {Int32Array | null} */
let prefixableNameShapes = null;

/**
 * @returns {Int32Array} the lengths, by the two letters a name starts with
 */
const prefixableNames = () => {
	if (prefixableNameShapes === null) {
		const shapes = new Int32Array(26 * 26);
		for (const table of [getPrefixedProperties(), getPrefixedValues()]) {
			for (const name of table.keys()) {
				// Every name here opens on two letters and is shorter than 31 (a
				// test pins both), so it has a slot and a bit of its own.
				const slot = nameShapeSlot(name.charCodeAt(0), name.charCodeAt(1));
				shapes[slot] |= 1 << name.length;
			}
		}
		prefixableNameShapes = shapes;
	}
	return prefixableNameShapes;
};

/**
 * The shape table's slot for a name's first two characters, or `-1` where they
 * are not both ASCII letters. Names match ASCII case-insensitively, so `A`-`Z`
 * reads as its lowercase.
 * @param {number} first the first character's code
 * @param {number} second the second character's code
 * @returns {number} the slot, or -1
 */
const nameShapeSlot = (first, second) => {
	const letter = (first | 0x20) - CC_LOWER_A;
	if (letter < 0 || letter > 25) return -1;
	const next = (second | 0x20) - CC_LOWER_A;
	return next < 0 || next > 25 ? -1 : letter * 26 + next;
};

/**
 * Whether a printed declaration's name is worth reading - one some engine
 * spells its own way, or a spelling itself.
 * @param {string} text the declaration's printed text
 * @param {number} colon where its `:` sits
 * @returns {boolean} true when the name may take part in prefixing
 */
const mayPrefixDeclaration = (text, colon) => {
	// A spelling to drop leads with `-`; a custom property leads with `--` and is
	// neither prefixed nor spelled.
	if (text.charCodeAt(0) === CC_HYPHEN_MINUS) {
		return text.charCodeAt(1) !== CC_HYPHEN_MINUS;
	}
	const slot = nameShapeSlot(text.charCodeAt(0), text.charCodeAt(1));
	if (slot === -1) return false;
	const lengths = prefixableNames();
	return ((lengths[slot] >>> (colon < 0 || colon > 31 ? 31 : colon)) & 1) !== 0;
};

/**
 * The property a printed declaration sets, read from its text: a merged box
 * shorthand writes a different property than the node it is stored on.
 * @param {string} text the declaration's printed text
 * @param {number} colon where its `:` sits
 * @returns {string} the lowercased property name
 */
const printedProperty = (text, colon) =>
	toLowerCaseIfNeeded(colon === -1 ? text : text.slice(0, colon));

// What a printed declaration carries after its value: the `;` closing it, and
// the `!important` before that where it has one (minifying leaves no space).
const IMPORTANT = "!important";

/**
 * The value a printed declaration sets, read from its text - the whole value, so
 * only a declaration that is one keyword matches a keyword.
 * @param {string} text the declaration's printed text
 * @param {number} colon where its `:` sits
 * @returns {string} the lowercased value
 */
const printedValue = (text, colon) =>
	toLowerCaseIfNeeded(text.slice(colon + 1, printedValueEnd(text, colon)));

/**
 * A comma list's top-level items. What a later declaration has to write again for
 * an earlier one to be dead rather than the fallback an engine reads instead.
 * @param {string} value one printed declaration value
 * @returns {string[]} its items, in order
 */
const valueItems = (value) => {
	/** @type {string[]} */
	const out = [];
	let depth = 0;
	let quote = 0;
	let start = 0;
	for (let i = 0; i <= value.length; i++) {
		const cc = i === value.length ? CC_COMMA : value.charCodeAt(i);
		if (quote !== 0) {
			if (cc === CC_REVERSE_SOLIDUS) i++;
			else if (cc === quote) quote = 0;
			continue;
		}
		if (cc === CC_QUOTATION_MARK || cc === CC_APOSTROPHE) {
			quote = cc;
		} else if (cc === CC_LEFT_PARENTHESIS) {
			depth++;
		} else if (cc === CC_RIGHT_PARENTHESIS) {
			depth--;
		} else if (cc === CC_COMMA && depth === 0) {
			out.push(value.slice(start, i).trim());
			start = i + 1;
		}
	}
	return out;
};

// A vendor prefix on an item's first token, which is the name slot a
// `<custom-ident>` list reads there.
const VENDOR_ITEM_PREFIX_RE = /^-[a-z]+-/i;

// One value written as a single number, with the unit it carries: what a
// stylesheet says where a property takes one measure and nothing else.
const LONE_NUMBER_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(%|[a-z]+)?$/i;

// ...and one written as a hex color, by how many digits it takes: three and six
// are CSS 1's, four and eight state an alpha, which is CSS Color 4's.
const LONE_HEX_RE = /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i;

/**
 * Whether a later declaration of the same property leaves an earlier one
 * unreadable rather than standing as its fallback - where the two are spelled
 * from one vocabulary, so no engine reads one and not the other.
 *
 * That is what parts an override from a fallback, and it is a question about the
 * spellings rather than about the target: `width:100px` before `width:50%` is a
 * pair an engine reading percentages resolves the same way it resolves any
 * other, while `color:#eee` before `color:lab(...)` is the older color standing
 * where the newer one is not read. `inherit` is the one keyword every engine has
 * taken since CSS 2, so nothing stands behind it.
 * @param {string} later the later declaration's printed value
 * @param {string} earlier the earlier one's
 * @param {string} property the property both declarations write
 * @returns {boolean} true when the earlier one can no longer be read
 */
const sameVocabulary = (later, earlier, property) => {
	if (asciiCaseInsensitiveMatch(later, "inherit")) return true;
	const laterNumber = LONE_NUMBER_RE.exec(later);
	if (laterNumber !== null) {
		const earlierNumber = LONE_NUMBER_RE.exec(earlier);
		return (
			earlierNumber !== null &&
			// A negative amount can be invalid where the earlier positive one is read.
			(later.charCodeAt(0) !== CC_HYPHEN_MINUS ||
				earlier.charCodeAt(0) === CC_HYPHEN_MINUS ||
				NEGATIVE_ACCEPTING_PROPERTIES.has(property)) &&
			// A unit an engine may not know is one the earlier states as well, so
			// an engine reading that one reads this.
			asciiCaseInsensitiveMatch(laterNumber[1] || "", earlierNumber[1] || "")
		);
	}
	// A pair of hexes, on one side of the alpha four digits and eight state and
	// the other two do not - and one with no alpha is read wherever a name is.
	if (LONE_HEX_RE.test(later)) {
		const alpha = later.length === 5 || later.length === 9;
		// An alpha every target reads is read wherever the earlier color is.
		const read =
			!alpha ||
			(S._prefixBrowsers !== null &&
				!S._someBrowserUnanswered &&
				S._hexAlphaAllowed);
		if (LONE_HEX_RE.test(earlier)) {
			return read || alpha === (earlier.length === 5 || earlier.length === 9);
		}
		const earlierName = toLowerCaseIfNeeded(earlier);
		return (
			read &&
			getColorNameToRgb().has(earlierName) &&
			!LATER_COLOR_NAMES.has(earlierName)
		);
	}
	// ...or a color named where the earlier names or spells one. Only a name as old
	// as naming a color - a later one is read by engines the earlier is not.
	const named = toLowerCaseIfNeeded(later);
	return (
		getColorNameToRgb().has(named) &&
		!LATER_COLOR_NAMES.has(named) &&
		(LONE_HEX_RE.test(earlier) ||
			getColorNameToRgb().has(toLowerCaseIfNeeded(earlier)))
	);
};

/**
 * Whether a later declaration of a `<custom-ident>` list leaves an earlier one
 * unreadable rather than standing as its fallback: every item the earlier writes
 * is written again, and every item the later adds is one of them under another
 * vendor spelling. A name is what that slot takes, so an engine knowing none of
 * the spellings still parses the value - there is nothing to fall back to.
 * `transition:box-shadow .25s` before `transition:box-shadow .25s,-webkit-box-shadow .25s`
 * is the shape, which is what a tool adding prefixes writes.
 * @param {string} later the later declaration's printed value
 * @param {string} earlier the earlier declaration's printed value
 * @returns {boolean} true when the earlier one can no longer be read
 */
const coveredByLater = (later, earlier) => {
	const laterItems = valueItems(later);
	const earlierItems = valueItems(earlier);
	if (earlierItems.length === 0 || laterItems.length < earlierItems.length) {
		return false;
	}
	for (const item of earlierItems) {
		if (!laterItems.includes(item)) return false;
	}
	for (const item of laterItems) {
		if (earlierItems.includes(item)) continue;
		const bare = item.replace(VENDOR_ITEM_PREFIX_RE, "");
		let variant = false;
		for (const other of earlierItems) {
			if (other.replace(VENDOR_ITEM_PREFIX_RE, "") === bare) {
				variant = true;
				break;
			}
		}
		if (!variant) return false;
	}
	return true;
};

/**
 * Where a printed declaration's value ends: before the `!important` it may carry
 * and the `;` closing it.
 * @param {string} text the declaration's printed text
 * @param {number} colon where its `:` sits
 * @returns {number} the offset one past the value
 */
const printedValueEnd = (text, colon) => {
	let end = text.length;
	if (text.charCodeAt(end - 1) === CC_SEMICOLON) end--;
	const bang = end - IMPORTANT.length;
	if (
		bang > colon &&
		text.startsWith(IMPORTANT, bang) &&
		!isEscapedAt(text, bang)
	) {
		end = bang;
	}
	return end;
};

// A property's vendor value spellings back to the keyword each stands for, built
// on first use from the forward table.
/** @type {Map<Map<string, [string, number][]>, Map<string, string>>} */
const prefixedValueKeywords = new Map();
/**
 * @param {Map<string, [string, number][]>} table one property's value table
 * @param {string} value a value that may be a vendor spelling
 * @returns {string | undefined} the keyword it spells, when it is one
 */
const prefixedValueKeyword = (table, value) => {
	let reverse = prefixedValueKeywords.get(table);
	if (reverse === undefined) {
		reverse = new Map();
		for (const [keyword, spellings] of table) {
			for (const [spelling] of spellings) reverse.set(spelling, keyword);
		}
		prefixedValueKeywords.set(table, reverse);
	}
	return reverse.get(value);
};

// A plain number, optionally a percentage - the only argument form these color
// conversions are proven for.
const COLOR_NUMBER_RE = /^([+-]?(?:\d+\.?\d*|\.\d+))(%?)$/;
// The hue's default unit; the other angle units would need their own conversion
// before the same boundary test could be applied.
const COLOR_HUE_RE = /^([+-]?(?:\d+\.?\d*|\.\d+))(?:deg)?$/i;

// WHY: how far a channel must sit from a `.5` rounding boundary to be
// converted. Implementations only ever disagree at a tie: across 317520 `hsl()`
// and `hwb()` samples checked against headless Chromium every divergence was
// within 9.24e-14 of a boundary, and none of the 264084 converted outside it was
// wrong. The margin is orders above that and far below a visible difference.
const ROUNDING_MARGIN = 1e-6;

// A conversion that runs the sRGB transfer needs a wider one: an engine's
// transfer is a fitted approximation of the spec's curve rather than the curve -
// Chromium's sits up to 1.01e-4 above it, in encoded units.
const TRANSFER_ERROR = 1.65e-4;

// WHY: one that runs a matrix as well carries that approximation into every term
// of the product, so what it costs is relative to the color's own magnitude: up
// to 9.53e-4 of it, across every space and the Lab family.
//
// Both are `yarn measure:color-agreement`, which asks an engine for its own
// conversion rather than for a pixel, times the 1.6x that tool states, since
// only the engines it runs against have been measured. Each is the widest a run
// has reported rather than the last one's, so re-running it for a newer Chromium
// widens them and never narrows them.
const CONVERSION_ERROR = 1.52e-3;

// How far two hues may sit from a half turn apart and still be read as one: a
// color reaches its own space through sRGB, and the trip back moves the hue by
// far less than this.
const HUE_TIE = 1e-6;

// The sRGB transfer's own knee (CSS Color 4 §10.2), below which its slope is the
// constant one.
const TRANSFER_KNEE = 0.0031308;

/**
 * How far a converted channel must sit from a `.5` boundary for the byte to be
 * the one an engine's own conversion lands on too. A difference in linear light
 * is worth whatever the transfer's slope makes of it, which is a sixteenth of a
 * byte at white and more than a whole byte near black.
 * @param {number} raw the channel, 0..255
 * @param {number} conversion what the value passed through, as `getColorSpaceModel()` states it
 * @param {number} scale the largest linear-light channel of the color it belongs to
 * @returns {number} the margin, in bytes
 */
const conversionMargin = (raw, conversion, scale) => {
	// A space an engine reads through a different transfer altogether is not a
	// margin away from agreeing, so nothing is converted out of one.
	if (conversion === ENGINE_TRANSFER_DIFFERS) return Number.POSITIVE_INFINITY;
	if (conversion === ENCODED_ALREADY) return ROUNDING_MARGIN;
	const transfer = 255 * TRANSFER_ERROR;
	if (conversion === THROUGH_TRANSFER) return transfer;
	const linear = Math.abs(gammaDecode(raw / 255));
	const slope =
		linear <= TRANSFER_KNEE ? 12.92 : (1.055 / 2.4) * linear ** (1 / 2.4 - 1);
	return transfer + 255 * slope * CONVERSION_ERROR * scale;
};

/**
 * Round a raw 0..255 channel, or return null when it sits close enough to a `.5`
 * boundary that another implementation's last bit could round it the other way.
 * @param {number} raw the channel, 0..255
 * @param {number} margin how far from a boundary the channel must sit, in bytes
 * @returns {number | null} the byte, or null to keep the function
 */
const channelByte = (raw, margin) => {
	// WHY: past this the color is one sRGB cannot show, so clamping it into a hex
	// would pick a different color rather than respell the same one. Inside it,
	// clamping lands on the byte rounding would have picked anyway - which is what
	// lets a Lab white point a few 1e-6 past 255 still convert.
	if (raw < -0.5 || raw > 255.5) return null;
	// Rounding is monotone, so the whole interval is one byte exactly when its two
	// ends are - which past either end of the range they are however wide it is,
	// since both clamp to the same byte there.
	const low = clamp255(raw - margin);
	return low === clamp255(raw + margin) ? low : null;
};

/**
 * CSS Color 4 §7.1's `hsl()` -> sRGB, on 0..1 inputs, in 0..255 output.
 * @param {number} h hue in degrees, already wrapped to 0..360
 * @param {number} s saturation 0..1
 * @param {number} l lightness 0..1
 * @returns {number[]} the raw `[r, g, b]` channels, 0..255
 */
const hslToRgb = (h, s, l) => {
	const a = s * Math.min(l, 1 - l);
	return [0, 8, 4].map((n) => {
		const k = (n + h / 30) % 12;
		return (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255;
	});
};

/**
 * CSS Color 4 §7.2's `hwb()` -> sRGB. Whiteness and blackness summing to 1 or
 * more is the achromatic case the spec spells out separately.
 * @param {number} h hue in degrees, already wrapped to 0..360
 * @param {number} w whiteness 0..1
 * @param {number} b blackness 0..1
 * @returns {number[]} the raw `[r, g, b]` channels, 0..255
 */
const hwbToRgb = (h, w, b) => {
	if (w + b >= 1) {
		const gray = (w / (w + b)) * 255;
		return [gray, gray, gray];
	}
	return hslToRgb(h, 1, 0.5).map(
		(channel) => (channel / 255) * (1 - w - b) * 255 + w * 255
	);
};

/**
 * Linear-light sRGB -> the gamma-encoded channel CSS serializes (CSS Color 4
 * §10.2). Out-of-gamut input is returned as-is so the caller's range check sees
 * it rather than a clipped value.
 * @param {number} c one linear component
 * @returns {number} the encoded component, nominally 0..1
 */
const gammaEncode = (c) => {
	const sign = c < 0 ? -1 : 1;
	const abs = Math.abs(c);
	return abs > 0.0031308
		? sign * (1.055 * abs ** (1 / 2.4) - 0.055)
		: 12.92 * c;
};

// The D50 white point Lab is defined against (CSS Color 4 §12), as XYZ.
const D50 = [0.3457 / 0.3585, 1, (1 - 0.3457 - 0.3585) / 0.3585];

// Bradford-adapted D50 to D65, then XYZ to linear-light sRGB - the two steps CSS
// Color 4's sample code uses rather than one composed matrix, whose composition
// loses enough precision to push `lab(100% 0 0)` outside the gamut check.
const D50_TO_D65 = [
	[0.9554734527042182, -0.023098536874261423, 0.0632593086610217],
	[-0.028369706963208136, 1.0099954580058226, 0.021041398966943008],
	[0.012314001688319899, -0.020507696433477912, 1.3303659366080753]
];
const XYZ_TO_LINEAR_SRGB = [
	[3.2409699419045226, -1.537383177570094, -0.4986107602930034],
	[-0.9692436362808796, 1.8759675015077202, 0.04155505740717559],
	[0.05563007969699366, -0.20397695888897652, 1.0569715142428786]
];

/**
 * @param {number[][]} matrix a 3x3 matrix
 * @param {number[]} vector the column it multiplies
 * @returns {number[]} the product
 */
const multiply3 = (matrix, vector) =>
	matrix.map(
		(row) => row[0] * vector[0] + row[1] * vector[1] + row[2] * vector[2]
	);

/**
 * CIE Lab -> linear-light sRGB: Lab -> XYZ (D50) -> XYZ (D65) -> linear sRGB,
 * with the matrices and constants CSS Color 4 §12 gives.
 * @param {number} l lightness 0..100
 * @param {number} a the a axis
 * @param {number} b the b axis
 * @returns {number[]} the linear `[r, g, b]` components, nominally 0..1
 */
const labToLinearSrgb = (l, a, b) => {
	const e = 216 / 24389;
	const k = 24389 / 27;
	const fy = (l + 16) / 116;
	const fx = a / 500 + fy;
	const fz = fy - b / 200;
	const xyz = [
		(fx ** 3 > e ? fx ** 3 : (116 * fx - 16) / k) * D50[0],
		(l > k * e ? fy ** 3 : l / k) * D50[1],
		(fz ** 3 > e ? fz ** 3 : (116 * fz - 16) / k) * D50[2]
	];
	return multiply3(XYZ_TO_LINEAR_SRGB, multiply3(D50_TO_D65, xyz));
};

/**
 * Oklab -> linear-light sRGB (CSS Color 4 §9.2's matrices).
 * @param {number} l lightness 0..1
 * @param {number} a the a axis
 * @param {number} b the b axis
 * @returns {number[]} the linear `[r, g, b]` components, nominally 0..1
 */
const oklabToLinearSrgb = (l, a, b) => {
	const lp = l + 0.3963377773761749 * a + 0.2158037573099136 * b;
	const mp = l - 0.1055613458156586 * a - 0.0638541728258133 * b;
	const sp = l - 0.0894841775298119 * a - 1.2914855480194092 * b;
	const lc = lp ** 3;
	const mc = mp ** 3;
	const sc = sp ** 3;
	return [
		4.076741661347994 * lc - 3.307711590408193 * mc + 0.230969928729428 * sc,
		-1.2684380040921763 * lc +
			2.6097574006633715 * mc -
			0.3413193963102197 * sc,
		-0.004196086541837188 * lc -
			0.7034186144594493 * mc +
			1.7076147009309444 * sc
	];
};

/**
 * The gamma-encoded channel back to linear light - `gammaEncode` read the other
 * way, so a color already converted into sRGB can be carried on into a wider
 * gamut without being parsed a second time.
 * @param {number} c one encoded component, nominally 0..1
 * @returns {number} the linear component
 */
const gammaDecode = (c) => {
	const sign = c < 0 ? -1 : 1;
	const abs = Math.abs(c);
	return abs <= 0.04045 ? c / 12.92 : sign * ((abs + 0.055) / 1.055) ** 2.4;
};

// One component of a `color()`: a number, a percentage of the space's range, or
// `none`, which computes as zero wherever it is read as a number.
const COLOR_COMPONENT_RE = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(%?)$/i;

/**
 * The sRGB a `color()` in a predefined space names, as raw `[r, g, b]` channels
 * 0..255 before rounding, and its alpha. Null when it is no such color - a
 * custom `--space`, a component holding a substitution, the wrong count.
 * @param {string} inner the already-joined argument text
 * @returns {{ raw: number[], alpha: number, conversion: number } | null} the channels, what reaching them passed through, or null
 */
const predefinedColorChannels = (inner) => {
	// `color(<space> c1 c2 c3[ / <alpha>])`: the alpha stands after the grammar's
	// one slash and nowhere else, and a comma separates nothing here. Reading
	// either as whitespace paints a declaration the engine drops.
	if (inner.includes(",")) return null;
	const sides = inner.split("/");
	if (sides.length > 2) return null;
	const args = sides[0].split(/\s+/).filter((part) => part.length !== 0);
	if (args.length !== 4) return null;
	const space = PREDEFINED_COLOR_SPACES.get(asciiLowercaseName(args[0]));
	if (space === undefined) return null;
	let alpha = 1;
	if (sides.length === 2) {
		const written = sides[1].trim();
		const parsed = COLOR_NUMBER_RE.exec(written);
		if (parsed === null || parsed[0] !== written) return null;
		alpha = Number(parsed[1]) / (parsed[2] === "%" ? 100 : 1);
		if (!(alpha >= 0 && alpha <= 1)) return null;
	}
	/** @type {number[]} */
	const stored = [];
	for (let i = 1; i <= 3; i++) {
		if (asciiCaseInsensitiveMatch(args[i], "none")) {
			stored.push(0);
			continue;
		}
		const parsed = COLOR_COMPONENT_RE.exec(args[i]);
		if (parsed === null) return null;
		stored.push(Number(parsed[1]) / (parsed[2] === "%" ? 100 : 1));
	}
	const linear = stored.map((component) => space.transfer(component));
	const matrix = space.toSrgb;
	const raw = [0, 3, 6].map(
		(row) =>
			gammaEncode(
				matrix[row] * linear[0] +
					matrix[row + 1] * linear[1] +
					matrix[row + 2] * linear[2]
			) * 255
	);
	return { raw, alpha, conversion: space.conversion };
};

/**
 * The `color(display-p3 ...)` a set of sRGB channels names, for a color sRGB
 * cannot show and a target that reads the wider gamut. Null where P3 cannot
 * show it either, which is a color no fallback preserves.
 * @param {number[]} raw the sRGB channels, 0..255 before rounding
 * @param {number} alpha the alpha, 0..1
 * @returns {string | null} the call, or null
 */
const wideGamutColor = (raw, alpha) => {
	const linear = raw.map((channel) => gammaDecode(channel / 255));
	/** @type {string[]} */
	const parts = [];
	for (const row of [0, 3, 6]) {
		const component = gammaEncode(
			LINEAR_SRGB_TO_P3[row] * linear[0] +
				LINEAR_SRGB_TO_P3[row + 1] * linear[1] +
				LINEAR_SRGB_TO_P3[row + 2] * linear[2]
		);
		// Past the gamut P3 shows either, so the hex before it is the whole answer.
		if (!(component >= -1e-6 && component <= 1 + 1e-6)) return null;
		parts.push(roundColorComponent(component));
	}
	// Quantized before it is written: an alpha the engine stores as `255` is the
	// opaque color, which carries no alpha at all.
	const byte = clamp255(alpha * 255);
	const opacity = byte === 255 ? "" : `/${alphaByteText(byte)}`;
	return `color(display-p3 ${parts.join(" ")}${opacity})`;
};

// A wide-gamut component prints at the six significant digits a stylesheet can
// observe, with the leading zero and any trailing zeros dropped.
/**
 * @param {number} component one component, 0..1
 * @returns {string} its shortest spelling
 */
const roundColorComponent = (component) => {
	// The caller admits a component a whole 1e-6 outside the gamut, which is the
	// only reason this clamps at all.
	const clamped = Math.min(1, Math.max(0, component));
	const text = clamped.toPrecision(6).replace(/0+$/, "").replace(/\.$/, "");
	return text.startsWith("0.") ? text.slice(1) : text;
};

/**
 * The `<percentage>` that stands for 100% of each Lab-family axis (CSS Color 4
 * §9, §12), as `[lightness, axis]`.
 * @type {Map<string, number[]>}
 */
const LAB_SCALES = new Map([
	["lab", [100, 125]],
	["lch", [100, 150]],
	["oklab", [1, 0.4]],
	["oklch", [1, 0.4]]
]);

// One argument of a color function: a run between the whitespace, `,` and `/`
// its grammar separates on.
const COLOR_ARGUMENT_RE = /[^\s,/]+/g;
// The two separator grammars a color function states: the modern `A B C` with
// an optional `/ D`, and the legacy `A, B, C` with an optional `, D`.
const COLOR_MODERN_RE =
	/^\s*[^\s,/]+(?:\s+[^\s,/]+){2}(?:\s*\/\s*[^\s,/]+)?\s*$/;
const COLOR_LEGACY_RE = /^\s*[^\s,/]+(?:\s*,\s*[^\s,/]+){2,3}\s*$/;

/**
 * Minify `hsl()` / `hwb()` / `lab()` / `lch()` / `oklab()` / `oklch()` to the
 * shortest hex.
 *
 * Two guards keep the rewrite from changing the color. A channel landing within
 * `ROUNDING_MARGIN` of a `.5` boundary keeps the function, because that is the
 * only place implementations disagree - it is why esbuild and lightningcss emit
 * different bytes for `hwb(194 0% 0%)`. And a Lab-family color outside the sRGB
 * gamut keeps its function too: hex cannot express it, so converting would clip
 * it to a different color. Both are limitations, not correctness gaps, and
 * `convertApproximateColors` lifts them: the first to the byte other minifiers
 * write anyway, the second past where any of them goes.
 *
 * Both guards are about *replacing* the function. A fallback stands before the
 * function rather than in its place, so it is only ever read by an engine with
 * no better answer: `forFallback` clamps into the gamut and takes whichever byte
 * rounding picks, and writes an `rgba()` where the target has no hex alpha.
 * @param {string} fn the lowercased function name
 * @param {string} inner the already-joined argument text
 * @param {boolean} hexAlpha whether the target reads a 4-/8-digit hex (see `output.environment`)
 * @param {boolean=} forFallback whether this is the fallback for a function the target cannot read, rather than a replacement for one it can
 * @returns {string | null} the shortest color, or null to keep the function
 */
const minifyPolarColorFunction = (fn, inner, hexAlpha, forFallback = false) => {
	if (!forFallback && !S._transforms.shortenColors) return null;
	if (fn !== "color-mix" && !RELATIVE_CHANNELS.has(fn)) return null;
	const isHsl = fn === "hsl" || fn === "hsla";
	const labScale = LAB_SCALES.get(fn);
	// A predefined space states its components directly, so it is read whole
	// rather than argument by argument - the rest of this then treats it as any
	// other conversion's output.
	if (fn === "color-mix") {
		return foldColorMix(inner, hexAlpha, forFallback);
	}
	// A relative color states its origin first, whichever function names it.
	if (RELATIVE_FROM_RE.test(inner)) {
		return foldRelativeColor(fn, inner, hexAlpha, forFallback);
	}
	if (fn === "color") {
		const read = predefinedColorChannels(inner);
		if (read === null) return null;
		return colorFromChannels(
			read.raw,
			read.alpha,
			read.conversion,
			hexAlpha,
			forFallback
		);
	}
	if (!isHsl && fn !== "hwb" && labScale === undefined) return null;
	// The runs between the separators these calls allow, read out directly: the
	// replace/split/filter chain built a copy of the arguments and two arrays to
	// reach the same few strings.
	const args = inner.match(COLOR_ARGUMENT_RE);
	if (args === null || (args.length !== 3 && args.length !== 4)) return null;
	// WHY: the read above states the runs between the separators without saying
	// which separator stood there, and CSS Color 4 gives `hsl()` alone a legacy
	// comma grammar - `hwb()` and the Lab family were specified later and take
	// the modern form only. A mixed spelling such as `hsl(120, 50% 50%)` matches
	// neither, so folding it would hand a color to a declaration engines drop.
	const legacy = COLOR_LEGACY_RE.test(inner);
	if (legacy ? !isHsl : !COLOR_MODERN_RE.test(inner)) return null;
	let alpha = 1;
	if (args.length === 4) {
		const parsed = COLOR_NUMBER_RE.exec(args[3]);
		if (parsed === null) return null;
		alpha = Number(parsed[1]) / (parsed[2] === "%" ? 100 : 1);
		if (!(alpha >= 0 && alpha <= 1)) return null;
		// A partly transparent color needs the hex-alpha spelling, which is the
		// target's question, not this one's - a fallback answers it with `rgba()`.
		if (alpha < 1 && !hexAlpha && !forFallback) return null;
	}
	/** @type {number[]} */
	let raw;
	if (isHsl || fn === "hwb") {
		const hue = COLOR_HUE_RE.exec(args[0]);
		const first = COLOR_NUMBER_RE.exec(args[1]);
		const second = COLOR_NUMBER_RE.exec(args[2]);
		if (hue === null || first === null || second === null) return null;
		// WHY: CSS Color 4 admits a bare `<number>` for these two channels in the
		// modern space-separated grammar alone - the legacy comma form takes
		// percentages only. Folding `hsl(120, 50, 50)` would hand invalid CSS a
		// color, so the grammar decides whether a missing `%` is readable.
		if (legacy && (first[2] !== "%" || second[2] !== "%")) return null;
		const x = Number(first[1]) / 100;
		const y = Number(second[1]) / 100;
		if (x < 0 || x > 1 || y < 0 || y > 1) return null;
		let h = Number(hue[1]) % 360;
		if (h < 0) h += 360;
		raw = isHsl ? hslToRgb(h, x, y) : hwbToRgb(h, x, y);
	} else {
		const scale = /** @type {number[]} */ (labScale);
		const isPolar = fn === "lch" || fn === "oklch";
		const lightness = COLOR_NUMBER_RE.exec(args[0]);
		const second = COLOR_NUMBER_RE.exec(args[1]);
		const third = isPolar
			? COLOR_HUE_RE.exec(args[2])
			: COLOR_NUMBER_RE.exec(args[2]);
		if (lightness === null || second === null || third === null) return null;
		const l =
			Number(lightness[1]) * (lightness[2] === "%" ? scale[0] / 100 : 1);
		let a;
		let b;
		if (isPolar) {
			const chroma =
				Number(second[1]) * (second[2] === "%" ? scale[1] / 100 : 1);
			const hue = (Number(third[1]) * Math.PI) / 180;
			a = chroma * Math.cos(hue);
			b = chroma * Math.sin(hue);
		} else {
			a = Number(second[1]) * (second[2] === "%" ? scale[1] / 100 : 1);
			b = Number(third[1]) * (third[2] === "%" ? scale[1] / 100 : 1);
		}
		const linear =
			fn === "lab" || fn === "lch"
				? labToLinearSrgb(l, a, b)
				: oklabToLinearSrgb(l, a, b);
		// WHY: a hex mixed in `oklch` reaches it through a conversion, and Chromium
		// reads a hue there as missing below a chroma of 0.02 - so `color-mix(in
		// oklch, currentColor 35%, #0000)` paints hue 0 where `oklch()` named one.
		if (fn === "oklch" && (a !== 0 || b !== 0)) {
			const space = getColorSpaceModel().get(fn);
			const clamped = linear.map((c) => Math.min(1, Math.max(0, c)));
			if (
				space !== undefined &&
				space.uncertainHue !== null &&
				space.uncertainHue(space.to(clamped))
			) {
				return null;
			}
		}
		// `channelByte` decides the gamut from the encoded value, where the
		// question is whether clamping would move the byte.
		raw = linear.map((c) => gammaEncode(c) * 255);
	}
	// `hsl()` and `hwb()` are the sRGB byte written another way round; the Lab
	// family is a matrix chain away from it.
	const conversion = labScale === undefined ? ENCODED_ALREADY : THROUGH_MATRIX;
	return colorFromChannels(raw, alpha, conversion, hexAlpha, forFallback);
};

/**
 * The shortest text for raw sRGB channels and an alpha, or null to keep the
 * function they came from. Shared by every conversion above: what differs
 * between them is how the channels were reached, not how they are written.
 * @param {number[]} raw the channels, 0..255 before rounding
 * @param {number} alpha the alpha, 0..1
 * @param {number} conversion what reaching the channels passed through, as `getColorSpaceModel()` states it
 * @param {boolean} hexAlpha whether the target reads a 4-/8-digit hex
 * @param {boolean} forFallback whether this stands before the function rather than in its place
 * @returns {string | null} the color, or null
 */
const colorFromChannels = (raw, alpha, conversion, hexAlpha, forFallback) => {
	/** @type {number[]} */
	const channels = [];
	let clipped = false;
	// A space read through a transfer of the engine's own is not a margin away
	// from agreeing, so the option that takes the nearest byte anyway does not
	// reach it: the hex would name a color the engine never paints.
	const approximate =
		S._convertApproximateColors && conversion !== ENGINE_TRANSFER_DIFFERS;
	// The color's own magnitude, which the conversion's error is relative to.
	const scale = Math.max(
		...raw.map((value) => Math.abs(gammaDecode(value / 255)))
	);
	for (const value of raw) {
		const byte =
			forFallback || approximate
				? clamp255(value)
				: channelByte(value, conversionMargin(value, conversion, scale));
		if (byte === null) return null;
		if (Math.abs(byte - value) > 0.5) clipped = true;
		channels.push(byte);
	}
	if (forFallback) {
		S._fallbackChannels = raw;
		S._fallbackAlpha = alpha;
		S._fallbackClipped = clipped;
		S._fallbackConversion = conversion;
	}
	// The alpha is the author's own number rather than a conversion's output, so it
	// takes no boundary guard: the engine quantizes it to 8 bits as `rgba()`'s is,
	// and one quantizing to `255` is opaque, written with no alpha at all.
	const opacity = alpha < 1 ? clamp255(alpha * 255) : 255;
	if (opacity !== 255) {
		return hexAlpha
			? shortestAlphaColor(channels[0], channels[1], channels[2], opacity)
			: `rgba(${channels[0]},${channels[1]},${channels[2]},${alphaByteText(
					opacity
				)})`;
	}
	return shortestColor(channels[0], channels[1], channels[2]);
};

/**
 * Whether a color is a gray, which is the one color a polar space states no hue
 * for - an engine reads that component as missing rather than as a number. The
 * test is proportional: a gray reached through a matrix carries the product's
 * own last bits rather than three identical doubles.
 * @param {number[]} linear the color in linear-light sRGB
 * @returns {boolean} true when all three channels are the same
 */
const isGray = (linear) => {
	const low = Math.min(linear[0], linear[1], linear[2]);
	const high = Math.max(linear[0], linear[1], linear[2]);
	return high - low <= Math.abs(high) * 1e-9 + 1e-12;
};

/**
 * Whether a color is gray only as far as its own conversion can tell: its
 * channels sit within the spread that trip could have invented. The hue such a
 * color carries is the residue's rather than the color's, so no two engines
 * name the same one.
 * @param {{ linear: number[], conversion: number }} color a resolved color
 * @returns {boolean} true where the hue rests on the conversion's last bits
 */
const isResidualGray = (color) => {
	// WHY: a chroma of zero in Lab or Oklch is neutral in that space and reaches
	// sRGB a residue away from neutral - measured against Chromium 141, up to
	// 9.5e-5 of a channel, where webpack's own lands 1.97e-8 away. Neither is a
	// color anyone can see, but a hue interpolates at full weight however small
	// the chroma stating it, so the two part by 25 bytes on the mix.
	const raw = color.linear.map((channel) => gammaEncode(channel) * 255);
	const scale = Math.max(
		Math.abs(color.linear[0]),
		Math.abs(color.linear[1]),
		Math.abs(color.linear[2])
	);
	const high = Math.max(raw[0], raw[1], raw[2]);
	const low = Math.min(raw[0], raw[1], raw[2]);
	return (
		high - low <=
		conversionMargin(high, color.conversion, scale) +
			conversionMargin(low, color.conversion, scale)
	);
};

/**
 * A color written in the space it was computed in - the answer for one no sRGB
 * byte holds, or one whose byte two engines could split over. Only ever the
 * spelling every color that went into it was already written in, so the numbers
 * here are the ones an engine reaches too: nothing was converted to get them.
 * @param {{ open: string, scale: number[], percent: boolean[], feature: string }} written how the space is written
 * @param {number} hue which component is an angle, `-1` for none
 * @param {number[]} components the color's components in that space
 * @param {number} alpha its alpha
 * @returns {string | null} the color, or null where the target does not read the spelling
 */
const spaceColorText = (written, hue, components, alpha) => {
	if (written.feature !== "" && !targetSupports(written.feature)) return null;
	const parts = components.map((value, at) => {
		// A component this small is zero at any precision a color is written to;
		// what is left of one is the polar round trip's own last bits.
		const held = Math.abs(value) < 1e-6 ? 0 : value;
		// A hue is an angle, so it says the same thing wrapped into one turn.
		const wrapped = at === hue ? ((held % 360) + 360) % 360 : held;
		const text = roundSignificant(
			normalizeNumber(String(wrapped * written.scale[at]))
		);
		return written.percent[at] ? `${text}%` : text;
	});
	const opacity =
		alpha < 1 ? `/${roundSignificant(normalizeNumber(String(alpha)))}` : "";
	return `${written.open}${parts.join(" ")}${opacity})`;
};

// The channels each color function names, in order, and the scale a relative
// color reads them at - `hsl()` states its saturation as a percentage, so the
// number bound to `s` counts to 100 where the model counts to 1.
/** @type {Map<string, { channels: string[], scale: number[] }>} */
const RELATIVE_CHANNELS = new Map([
	["rgb", { channels: ["r", "g", "b"], scale: [255, 255, 255] }],
	["rgba", { channels: ["r", "g", "b"], scale: [255, 255, 255] }],
	["hsl", { channels: ["h", "s", "l"], scale: [1, 100, 100] }],
	["hsla", { channels: ["h", "s", "l"], scale: [1, 100, 100] }],
	["hwb", { channels: ["h", "w", "b"], scale: [1, 100, 100] }],
	["lab", { channels: ["l", "a", "b"], scale: [1, 1, 1] }],
	["lch", { channels: ["l", "c", "h"], scale: [1, 1, 1] }],
	["oklab", { channels: ["l", "a", "b"], scale: [1, 1, 1] }],
	["oklch", { channels: ["l", "c", "h"], scale: [1, 1, 1] }],
	["color", { channels: ["r", "g", "b"], scale: [1, 1, 1] }]
]);

// A color a mix or a relative reference resolves against holds no `none` (whose
// value is the other color's) and no reference of its own.
const UNRESOLVED_COLOR_RE = /(^|[^-\w])(none|currentcolor|from)(?![-\w])/i;

/**
 * One color, whatever it is written as, in linear-light sRGB with its alpha.
 * Null for anything this cannot pin down - a substitution, `currentcolor`, a
 * `none` component, a relative reference of its own.
 * @param {string} text the color as printed
 * @returns {{ linear: number[], alpha: number, conversion: number, space: string } | null} the color, what reading it passed through, the space it was written in, or null
 */
const resolveColor = (text) => {
	if (UNRESOLVED_COLOR_RE.test(text) || containsSubstitutionFunction(text)) {
		return null;
	}
	/** @type {number[] | null} */
	let bytes = null;
	let alpha = 1;
	if (text.charCodeAt(0) === CC_NUMBER_SIGN) {
		bytes = hexBytes(text.slice(1));
		if (bytes === null) return null;
		alpha = bytes.length === 4 ? bytes[3] / 255 : 1;
	} else if (IDENT_RE.test(text)) {
		const lower = toLowerCaseIfNeeded(text);
		if (lower === "transparent") {
			return {
				linear: [0, 0, 0],
				alpha: 0,
				conversion: ENCODED_ALREADY,
				space: SRGB_SPACE
			};
		}
		const packed = getColorNameToRgb().get(lower);
		if (packed === undefined) return null;
		bytes = [(packed >> 16) & 255, (packed >> 8) & 255, packed & 255];
	} else {
		const open = text.indexOf("(");
		if (open === -1 || !text.endsWith(")")) return null;
		const fn = asciiLowercaseName(text.slice(0, open));
		const inner = text.slice(open + 1, -1);
		// Every function form reaches sRGB through the same conversions the
		// printer already makes, which leave the raw channels behind. Cleared
		// first, so a call that answers without recording any is not read as one.
		S._fallbackChannels = null;
		// The space it was written in, which is `color()`'s first argument or the
		// function's own name - `rgb()` states the byte itself, as a hex does.
		const written =
			fn === "color"
				? asciiLowercaseName(splitTopLevelSpaces(inner)[0] || "")
				: fn === "rgb" || fn === "rgba"
					? SRGB_SPACE
					: fn.replace(/a$/, "");
		if (
			minifyColorFunction(fn, inner, true, false) === null &&
			minifyPolarColorFunction(fn, inner, true, true) === null
		) {
			return null;
		}
		// Every call that answers records them, so a non-null answer is one.
		const raw = /** @type {number[]} */ (
			/** @type {number[] | null} */ (S._fallbackChannels)
		);
		return {
			linear: raw.map((channel) => gammaDecode(channel / 255)),
			alpha: S._fallbackAlpha,
			conversion: S._fallbackConversion,
			space: written
		};
	}
	return {
		linear: bytes.slice(0, 3).map((byte) => gammaDecode(byte / 255)),
		alpha,
		conversion: ENCODED_ALREADY,
		space: SRGB_SPACE
	};
};

/**
 * A hex color's bytes, three or four of them.
 * @param {string} body the digits after the `#`
 * @returns {number[] | null} the bytes, or null when it is no hex color
 */
const hexBytes = (body) => {
	const n = body.length;
	if (n !== 3 && n !== 4 && n !== 6 && n !== 8) return null;
	for (let i = 0; i < n; i++) {
		if (!isHexDigit(body.charCodeAt(i))) return null;
	}
	const wide = n >= 6;
	const count = wide ? n / 2 : n;
	/** @type {number[]} */
	const out = [];
	for (let i = 0; i < count; i++) {
		const digits = wide ? body.slice(i * 2, i * 2 + 2) : body[i] + body[i];
		out.push(Number.parseInt(digits, 16));
	}
	return out;
};

/**
 * The two hue angles a `<hue-interpolation-method>` interpolates between: the
 * method decides which way round the circle the second one is reached from the
 * first (CSS Color 4 §12.4).
 * @param {number} from the first hue, in degrees
 * @param {number} to the second
 * @returns {number[] | null} the pair to interpolate, or null for an unknown method
 */
const hueEndpoints = (from, to) => {
	let difference = to - from;
	// WHY: both are wrapped to 0..360, so the shorter arc is the one under a half
	// turn, which is what every method is stated as a correction to. Two opposite
	// hues have no shorter arc and CSS Color 4 §12.4 breaks that tie by which is
	// greater, so the arc is kept as it stands: a half turn the conversion left a
	// hair over is not read as the arc the other way round.
	if (S._hueMethod === "" || S._hueMethod === "shorter") {
		if (difference > 180 + HUE_TIE) difference -= 360;
		else if (difference < -180 - HUE_TIE) difference += 360;
	} else if (S._hueMethod === "longer") {
		if (difference > -180 && difference < 180) {
			difference += difference > 0 ? -360 : 360;
		}
	} else if (S._hueMethod === "increasing") {
		if (difference < 0) difference += 360;
	} else if (S._hueMethod === "decreasing") {
		if (difference > 0) difference -= 360;
	} else {
		return null;
	}
	return [from, from + difference];
};

/**
 * Fold a `color-mix()` to the one color it names (CSS Color 5 §3): each color
 * read into the interpolation space, weighted by its own percentage with the
 * alphas premultiplied, and read back out. Null wherever a component cannot be
 * pinned down, which leaves the call written out.
 * @param {string} inner the already-joined argument text
 * @param {boolean} hexAlpha whether the target reads a 4-/8-digit hex
 * @param {boolean} forFallback whether this stands before the call rather than in its place
 * @returns {string | null} the color, or null
 */
const foldColorMix = (inner, hexAlpha, forFallback) => {
	const args = splitTopLevelArguments(inner);
	if (args.length !== 3) return null;
	const head = splitTopLevelSpaces(args[0]);
	if (head.length < 2 || !asciiCaseInsensitiveMatch(head[0], "in")) return null;
	const space = getColorSpaceModel().get(asciiLowercaseName(head[1]));
	if (space === undefined) return null;
	// `in <space> <method> hue` - the two words after the space, or nothing. Held
	// locally until both colors are resolved: a nested mix folds through here too,
	// and would otherwise leave its own method behind for this one to read.
	let hueMethod = "";
	if (head.length === 4) {
		if (!asciiCaseInsensitiveMatch(head[3], "hue")) return null;
		hueMethod = asciiLowercaseName(head[2]);
	} else if (head.length !== 2) {
		return null;
	}
	/** @type {number[]} */
	const weights = [];
	/** @type {{ linear: number[], alpha: number, conversion: number, space: string }[]} */
	const colors = [];
	for (let i = 1; i <= 2; i++) {
		const parts = splitTopLevelSpaces(args[i]);
		// An empty argument (`color-mix(in srgb,red,)`) names no color.
		if (parts.length === 0 || parts.length > 2) return null;
		let percent = -1;
		let text = parts[0];
		if (parts.length === 2) {
			// The percentage may be written either side of the color.
			const at = parts[1].endsWith("%") ? 1 : 0;
			const written = COLOR_NUMBER_RE.exec(parts[at]);
			if (written === null || written[2] !== "%") return null;
			percent = Number(written[1]);
			// `<percentage [0,100]>` (CSS Color 5 §2.1): one outside the range is no
			// mix for an engine to compute, whatever the other says.
			if (!(percent >= 0 && percent <= 100)) return null;
			text = parts[at === 0 ? 1 : 0];
		}
		const color = resolveColor(text);
		if (color === null) return null;
		weights.push(percent);
		colors.push(color);
	}
	// An omitted percentage is what the other leaves; both omitted is an even mix.
	if (weights[0] < 0 && weights[1] < 0) weights[0] = weights[1] = 50;
	else if (weights[0] < 0) weights[0] = 100 - weights[1];
	else if (weights[1] < 0) weights[1] = 100 - weights[0];
	const sum = weights[0] + weights[1];
	if (sum === 0) return null;
	// A pair summing under 100 leaves the result that much transparent; over 100
	// it is only the ratio that counts.
	const carried = sum < 100 ? sum / 100 : 1;
	const first = weights[0] / sum;
	const alpha =
		(colors[0].alpha * first + colors[1].alpha * (1 - first)) * carried;
	const components = [colors[0], colors[1]].map((color) =>
		space.to(color.linear)
	);
	S._hueMethod = hueMethod;
	// A gray has no hue to interpolate, so an engine reads that component as
	// missing and takes the other color's instead of mixing the two (CSS Color 4
	// §12.2) - which is a different color, not a rounding away from one.
	if (space.hue !== -1) {
		const gray = colors.map((color) => isGray(color.linear));
		for (let at = 0; at < 2; at++) {
			// ...unless it was written in this very space, where the hue it states
			// stands however gray the color is, and reaching it through sRGB is what
			// lost it.
			if (gray[at] && colors[at].space === asciiLowercaseName(head[1])) {
				return null;
			}
			// ...and a hue an engine may read as missing before the color is gray at
			// all is one no answer can be given for.
			if (
				!gray[at] &&
				space.uncertainHue !== null &&
				space.uncertainHue(components[at])
			) {
				return null;
			}
			// ...as is one a color states only through its conversion's residue,
			// which every engine leaves in a different place.
			if (!gray[at] && isResidualGray(colors[at])) return null;
		}
		if (gray[0] !== gray[1]) {
			const stated = gray[0] ? 1 : 0;
			// WHY: a gray written in a polar space states a hue the engines split
			// over. Measured on `color-mix(in hsl, hwb(322.26 56.57% 49.83%) 7.3%,
			// oklch(.280497 .052616 353.043))`: Chrome 147 reads the hue as missing
			// and takes the other color's, painting 68,35,50, where Firefox 156
			// keeps the 322.26 it states and paints 68,35,56.
			const written = getColorSpaceModel().get(colors[1 - stated].space);
			if (written !== undefined && written.hue !== -1) return null;
			components[1 - stated][space.hue] = components[stated][space.hue];
		}
	}
	/** @type {number[]} */
	const mixed = [];
	for (let at = 0; at < 3; at++) {
		if (at === space.hue) {
			const ends = hueEndpoints(components[0][at], components[1][at]);
			if (ends === null) return null;
			mixed.push(ends[0] * first + ends[1] * (1 - first));
			continue;
		}
		// Premultiplied, so a transparent color contributes none of its own hue.
		const one = components[0][at] * colors[0].alpha;
		const other = components[1][at] * colors[1].alpha;
		const carriedAlpha =
			colors[0].alpha * first + colors[1].alpha * (1 - first);
		const value = one * first + other * (1 - first);
		mixed.push(carriedAlpha === 0 ? 0 : value / carriedAlpha);
	}
	const raw = space.from(mixed).map((channel) => gammaEncode(channel) * 255);
	// The mix is only as exact as the space it was made in and the colors that
	// went into it: an origin written in Lab carries that chain into an `in srgb`
	// mix as surely as the mix's own space would.
	const conversion = Math.max(
		space.conversion,
		colors[0].conversion,
		colors[1].conversion
	);
	const byte = colorFromChannels(raw, alpha, conversion, hexAlpha, forFallback);
	if (byte !== null || forFallback) return byte;
	// No byte, the color being outside sRGB or its rounding one an engine could go
	// either way on. Where both colors were written in the space they were mixed
	// in, the mix converted nothing and can be written there.
	const name = asciiLowercaseName(head[1]);
	if (colors[0].space !== name || colors[1].space !== name) return null;
	return spaceColorText(space.written, space.hue, mixed, alpha);
};

/**
 * The number a relative color's channel argument names, with the origin's own
 * channels bound to their keywords. A keyword stands for its channel, a plain
 * number for itself, and a `calc()` for whatever it reduces to once the
 * keywords in it are the numbers they name.
 * @param {string} text the argument as printed
 * @param {Map<string, number>} bound the origin's channels, by keyword
 * @param {boolean} angle whether the channel is an angle, where `deg` is its unit
 * @returns {number | null} the value, or null when it cannot be pinned down
 */
const relativeChannel = (text, bound, angle) => {
	const direct = bound.get(toLowerCaseIfNeeded(text));
	if (direct !== undefined) return direct;
	const plain = COLOR_NUMBER_RE.exec(text);
	if (plain !== null) {
		if (plain[2] === "%") return null;
		return Number(plain[1]);
	}
	if (angle) {
		const hue = COLOR_HUE_RE.exec(text);
		if (hue !== null) return Number(hue[1]);
	}
	const open = text.indexOf("(");
	if (open === -1 || !text.endsWith(")")) return null;
	if (!MATH_FUNCTIONS.has(asciiLowercaseName(text.slice(0, open)))) return null;
	// The keywords are substituted as the numbers they name, so the expression
	// the engine would compute is the one the existing evaluator reduces.
	let refused = false;
	const written = text.replace(
		CHANNEL_KEYWORD_RE,
		/**
		 * Substitutes one channel keyword with the number it names.
		 * @param {string} whole the keyword and the character before it
		 * @param {string} before the character before the keyword
		 * @param {string} name the keyword
		 * @returns {string} the number, or the keyword when it names none
		 */
		(whole, before, name) => {
			const value = bound.get(toLowerCaseIfNeeded(name));
			if (value === undefined) {
				refused = true;
				return whole;
			}
			return `${before}${value}`;
		}
	);
	if (refused) return null;
	const tokens = tokenizeCalc(written.slice(open + 1, -1));
	if (tokens === null) return null;
	const cursor = { at: 0 };
	const sum = evaluateCalcSum(tokens, cursor);
	if (sum === null || cursor.at !== tokens.length || sum.size !== 1) {
		return null;
	}
	const only = [...sum];
	// A channel keyword substitutes as the number it names (CSS Color 5 §4.1), so
	// an expression over one reduces to no unit, which a hue slot reads as degrees.
	// An angle stands there too, and a sum of the two is refused above.
	const unit = only[0][0];
	if (angle ? unit !== "" && unit !== "deg" : unit !== "") return null;
	return only[0][1];
};

// The OKLCh chroma below which one engine drops an origin's hue and another
// keeps it, so a relative color reading `h` over such an origin is not folded.
const OKLCH_ENGINE_POWERLESS_CHROMA = 0.03;

// One channel keyword inside a relative color's argument: a bare word no
// identifier character precedes, so a unit or a function name is never one.
const CHANNEL_KEYWORD_RE = /(^|[^-\w.])([a-z]+)(?![-\w(])/gi;

/**
 * Fold a relative color - `rgb(from <color> r calc(g * 2) b)` - to the color it
 * names (CSS Color 5 §4): the origin read into the function's own channels, each
 * argument resolved against them, and the result read back out. Null wherever a
 * component cannot be pinned down.
 * @param {string} fn the lowercased function name
 * @param {string} inner the already-joined argument text
 * @param {boolean} hexAlpha whether the target reads a 4-/8-digit hex
 * @param {boolean} forFallback whether this stands before the call rather than in its place
 * @returns {string | null} the color, or null
 */
const foldRelativeColor = (fn, inner, hexAlpha, forFallback) => {
	// The caller asks only for a function the table names.
	const shape =
		/** @type {NonNullable<ReturnType<typeof RELATIVE_CHANNELS.get>>} */ (
			RELATIVE_CHANNELS.get(fn)
		);
	const parts = splitTopLevelSpaces(inner.replace(/\//g, " / "));
	if (parts.length < 2 || !asciiCaseInsensitiveMatch(parts[0], "from")) {
		return null;
	}
	const origin = resolveColor(parts[1]);
	if (origin === null) return null;
	// `color(from <color> <space> ...)` names its space where the others name none.
	let at = 2;
	let channels;
	let write;
	let conversion = origin.conversion;
	// The space the function states its channels in, where it has one this can
	// write a color back into.
	let spaceName = "";
	/** @type {import("./data").ColorSpaceModel | undefined} */
	let space;
	if (fn === "color") {
		spaceName = asciiLowercaseName(parts[at++] || "");
		space = getColorSpaceModel().get(spaceName);
		if (space === undefined || space.hue !== -1) return null;
		channels = space.to(origin.linear);
		write = space.from;
		conversion = Math.max(conversion, space.conversion);
	} else if (fn === "rgb" || fn === "rgba") {
		spaceName = SRGB_SPACE;
		channels = origin.linear.map((c) => gammaEncode(c) * 255);
		write = (/** @type {number[]} */ c) =>
			c.map((byte) => gammaDecode(byte / 255));
	} else {
		// `hsla()` states the same channels in the same space `hsl()` does, and
		// the model holds it under that name - which is the name resolving the
		// origin already reads it as, so the two agree on what a color is in.
		spaceName = fn === "hsla" ? "hsl" : fn;
		space = /** @type {import("./data").ColorSpaceModel} */ (
			getColorSpaceModel().get(spaceName)
		);
		conversion = Math.max(conversion, space.conversion);
		channels = space.to(origin.linear).map((c, i) => c * shape.scale[i]);
		const read = space;
		write = (/** @type {number[]} */ c) =>
			read.from(c.map((value, i) => value / shape.scale[i]));
	}
	/** @type {Map<string, number>} */
	const bound = new Map();
	for (let i = 0; i < 3; i++) bound.set(shape.channels[i], channels[i]);
	bound.set("alpha", origin.alpha);
	// WHY: Chromium 158 reads the hue of an origin this close to neutral as
	// powerless, so `h` names 0 there and the origin's own hue in Firefox 159 and
	// WebKit 27.2 - measured at chroma 0.0176, while 0.0299 still kept its hue.
	// Unbound, `h` keeps the call as written; a true gray names 0 in every engine.
	if (
		fn === "oklch" &&
		channels[1] < OKLCH_ENGINE_POWERLESS_CHROMA &&
		!isGray(origin.linear)
	) {
		bound.delete("h");
	}
	/** @type {number[]} */
	const written = [];
	for (let i = 0; i < 3; i++) {
		const argument = parts[at + i];
		if (argument === undefined) return null;
		const hue = fn !== "color" && shape.channels[i] === "h";
		const value = relativeChannel(argument, bound, hue);
		if (value === null) return null;
		written.push(value);
	}
	let alpha = origin.alpha;
	if (parts[at + 3] !== undefined) {
		if (parts[at + 3] !== "/" || parts[at + 4] === undefined) return null;
		const written = relativeChannel(parts[at + 4], bound, false);
		if (written === null) {
			const percent = COLOR_NUMBER_RE.exec(parts[at + 4]);
			if (percent === null || percent[2] !== "%") return null;
			alpha = Number(percent[1]) / 100;
		} else {
			alpha = written;
		}
		if (!(alpha >= 0 && alpha <= 1)) return null;
		if (parts.length > at + 5) return null;
	}
	const raw = write(written).map((channel) => gammaEncode(channel) * 255);
	const byte = colorFromChannels(raw, alpha, conversion, hexAlpha, forFallback);
	if (byte !== null || forFallback || space === undefined) return byte;
	// As a mix does: an origin written in the function's own space is read into
	// the channels it already states, so the result is written back there.
	if (origin.space !== spaceName) return null;
	return spaceColorText(
		space.written,
		space.hue,
		written.map((value, i) => value / shape.scale[i]),
		alpha
	);
};

// The pair a lowered `light-dark()` reads, and the rule defaulting them.
// `initial` is the guaranteed-invalid value, so a `var()` naming a property set
// to it takes its fallback, while one set to nothing substitutes nothing.
const LIGHT_PROPERTY = "--webpack-light";
const DARK_PROPERTY = "--webpack-dark";
// A call, not a name that ends in one: the character before it has to close an
// identifier, and a function name is matched without regard to case.
const LIGHT_DARK_CALL_RE = /(^|[^\w-])light-dark\(/i;

// No specificity at all, so every rule that sets `color-scheme` - `html` and
// `*` included - overrides it wherever it stands, which is what lets it be
// written last. The empty value carries no space: a second pass takes one off.
const LIGHT_DARK_DEFAULTS = `:where(:root){${LIGHT_PROPERTY}:initial;${DARK_PROPERTY}:}`;

// A relative color leads with `from`, which no other value of any of these
// functions does.
const RELATIVE_FROM_RE = /^\s*from(?![-\w])/i;

// One color function a target may not read, printed with no call of its own
// inside it - a relative color or a `calc()` argument is not one to fold. The
// leading character keeps `--my-lab(1)` from reading as `lab(1)`.
const FALLBACK_COLOR_FUNCTION_RE =
	/(^|[^-\w])(hwb|lab|lch|oklab|oklch|color-mix|color)\(([^()]*)\)/gi;

/**
 * Whether a call named at `at` in a printed value is one of the value's own,
 * rather than text a string, a url, or a name carried on by an escape holds.
 * @param {string} value the declaration's value, as printed
 * @param {number} at where the call's name starts
 * @returns {boolean} true when `at` starts a token of the value
 */
const startsOwnToken = (value, at) => {
	let i = 0;
	while (i < at) {
		const cc = value.charCodeAt(i);
		if (cc === CC_QUOTATION_MARK || cc === CC_APOSTROPHE) {
			for (i++; i < value.length && value.charCodeAt(i) !== cc; i++) {
				if (value.charCodeAt(i) === CC_REVERSE_SOLIDUS) i++;
			}
			i++;
		} else if (isIdentCodePoint(cc) || cc === CC_REVERSE_SOLIDUS) {
			const start = i;
			while (i < value.length) {
				const code = value.charCodeAt(i);
				if (code === CC_REVERSE_SOLIDUS) i = skipEscape(value, i);
				else if (isIdentCodePoint(code)) i++;
				else break;
			}
			if (
				value.charCodeAt(i) === CC_LEFT_PARENTHESIS &&
				identNamesUrl(value, start, i)
			) {
				let open = i + 1;
				while (isAsciiWhitespace(value.charCodeAt(open))) open++;
				const quote = value.charCodeAt(open);
				if (quote !== CC_QUOTATION_MARK && quote !== CC_APOSTROPHE) {
					i = consumeTheRemnantsOfABadUrl(value, open);
				}
			}
		} else {
			i++;
		}
	}
	return i === at;
};

// The name of a call that folds on what it is written over rather than on
// channels of its own, wherever it stands and whatever it holds - the
// arguments are not read here. `color-mix` before `color`, which is its prefix.
const FALLBACK_WHOLE_CALL_RE =
	/(^|[^-\w])(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix|color)\(/gi;

// The `from` a relative reference opens with, which is the whole of what makes
// one fold on its origin rather than on channels the author wrote out.
const RELATIVE_ORIGIN_RE = /^\s*from\s/i;

/**
 * A color written where a call stood, with a space after it where what follows
 * would read on as part of it - `#7f007f` before `url(` is one hash token.
 * @param {string} written the color, as spliced in
 * @param {string} rest what follows the call it replaced
 * @returns {string} the color, parted from what follows where it has to be
 */
const parted = (written, rest) =>
	rest.length !== 0 &&
	wouldFuseTokens(written.charCodeAt(written.length - 1), rest, written)
		? `${written} `
		: written;

/**
 * A color folded into a fallback, after what stood before the call it replaces.
 * The space a call needed is none a hex needs - the printer writes `0 0#000` -
 * and the fallback has to print as that would.
 * @param {string} before what stood before the call: one character, or none
 * @param {string} color the folded color
 * @returns {string} the two joined
 */
const spliceFallbackColor = (before, color) =>
	color.charCodeAt(0) === CC_NUMBER_SIGN &&
	isAsciiWhitespace(before.charCodeAt(0))
		? color
		: before + color;

/**
 * The same value with every `color-mix()` and relative reference written as the
 * color it names, read over the arguments the author wrote. Substituting each
 * of those for a byte first would round every one into eight bits, and a mix of
 * those bytes is not the color the mix names.
 * @param {string} value the declaration's value, as printed
 * @returns {string | null} the value, or null where none of them folded
 */
const foldWholeColorCalls = (value) => {
	let out = "";
	let from = 0;
	S._wholeCallClipped = false;
	FALLBACK_WHOLE_CALL_RE.lastIndex = 0;
	for (
		let match = FALLBACK_WHOLE_CALL_RE.exec(value);
		match !== null;
		match = FALLBACK_WHOLE_CALL_RE.exec(value)
	) {
		const open = match.index + match[0].length - 1;
		if (!startsOwnToken(value, match.index + match[1].length)) continue;
		const close = closingParenthesis(value, open);
		const inner = value.slice(open + 1, close);
		const fn = asciiLowercaseName(match[2]);
		// Anything else stands as the author wrote it: whether the target reads
		// it is what the pass after this one answers, and this is not here to
		// reopen that.
		if (fn !== "color-mix" && !RELATIVE_ORIGIN_RE.test(inner)) continue;
		const color = minifyPolarColorFunction(fn, inner, S._hexAlphaAllowed, true);
		if (color === null) continue;
		if (S._fallbackClipped) S._wholeCallClipped = true;
		out +=
			value.slice(from, match.index) +
			parted(spliceFallbackColor(match[1], color), value.slice(close + 1));
		from = close + 1;
		FALLBACK_WHOLE_CALL_RE.lastIndex = from;
	}
	return from === 0 ? null : out + value.slice(from);
};

/**
 * Whether a color function is one some target does not read, so a declaration
 * naming it needs a fallback before it - and a fallback still naming one is no
 * fallback. Only the names `FALLBACK_COLOR_FUNCTION_RE` and
 * `UNREADABLE_COLOR_CALL_RE` match reach here.
 * @param {string} fn the lowercased function name
 * @returns {boolean} true when the target cannot read it
 */
const unreadableColorFunction = (fn) => {
	if (fn === "hwb") return !S._hwbColorsAllowed;
	if (fn === "lab" || fn === "lch") return !S._labColorsAllowed;
	if (fn === "oklab" || fn === "oklch") return !S._oklabColorsAllowed;
	if (fn === "color") return !S._colorFunctionAllowed;
	if (fn === "color-mix") return !S._colorMixAllowed;
	return !S._lightDarkAllowed;
};

// The name of any color function a target may not read, wherever it stands -
// the arguments are not read here, so one holding a call of its own still
// matches. `color-mix` before `color`, which is its prefix.
const UNREADABLE_COLOR_CALL_RE =
	/(^|[^-\w])(hwb|lab|lch|oklab|oklch|color-mix|color|light-dark)\(/gi;

/**
 * A box value's fallback with the sides its `{1,4}` notation implies left out,
 * as a pass over the fallback would leave them out. Only where each side is one
 * plain token, which the printer parts with a space.
 * @param {string} head the declaration up to and including its `:`
 * @param {string} value the fallback's value
 * @returns {string} the value, collapsed where it can be
 */
const collapsedBoxFallback = (head, value) => {
	if (!BOX_SHORTHANDS.has(asciiLowercaseName(head.slice(0, -1)))) return value;
	const match = /^([^("'\\/!;]+?)(!important)?(;?)$/i.exec(value);
	if (match === null) return value;
	// The printer writes a hash against what is before it.
	const box = collapseBox(match[1].split(/ |(?=#)/));
	return box === null
		? value
		: `${box.join(" ").replace(/ #/g, "#")}${match[2] || ""}${match[3]}`;
};

/**
 * The declaration to write before one whose value names a color function the
 * target cannot read: the same declaration with every such color written in a
 * spelling it does read. Null where there is none to write.
 *
 * A fallback still naming a function the target cannot read is no fallback - the
 * engine drops it just as it drops the declaration it stands before - so a color
 * this cannot fold whole (a relative color, an argument holding a `calc()`, one
 * nested in a `color-mix()`) leaves the declaration alone rather than adding
 * bytes nothing reads.
 * @param {string} text one printed declaration
 * @param {number} colon where its `:` sits
 * @returns {string | null} the fallback declaration, or null
 */
const colorFallbackDeclaration = (text, colon) => {
	// A custom property's value is handed back as written, and holds no
	// declaration of its own to stand before.
	if (text.charCodeAt(1) === CC_HYPHEN_MINUS) return null;
	const value = text.slice(colon + 1);
	// A value reached through a substitution is invalid at computed-value time
	// when what it substitutes is unreadable - which is `unset`, not the earlier
	// declaration - so a pair standing before one is bytes nothing ever reads.
	if (containsSubstitutionFunction(value)) return null;
	// The calls that fold on what they are written over go first, while their
	// arguments are still the author's: the pass after this one reaches only
	// what holds no call of its own, so it would read bytes this left behind.
	const outer = foldWholeColorCalls(value);
	let folded = outer !== null;
	let clipped = folded && S._wholeCallClipped;
	const written = (outer === null ? value : outer).replace(
		FALLBACK_COLOR_FUNCTION_RE,
		/**
		 * Writes one color call the target can't read as a fallback it can.
		 * @param {string} whole the call and the character before it
		 * @param {string} before the character before the call
		 * @param {string} name the function's name
		 * @param {string} inner the call's arguments
		 * @param {number} at the offset of the match
		 * @param {string} all the value
		 * @returns {string} the value to write in its place
		 */
		(whole, before, name, inner, at, all) => {
			const fn = asciiLowercaseName(name);
			if (!unreadableColorFunction(fn)) return whole;
			if (!startsOwnToken(all, at + before.length)) return whole;
			const color = minifyPolarColorFunction(
				fn,
				inner,
				S._hexAlphaAllowed,
				true
			);
			if (color === null) return whole;
			if (S._fallbackClipped) clipped = true;
			folded = true;
			return parted(
				spliceFallbackColor(before, color),
				all.slice(at + whole.length)
			);
		}
	);
	if (!folded) return null;
	UNREADABLE_COLOR_CALL_RE.lastIndex = 0;
	for (
		let match = UNREADABLE_COLOR_CALL_RE.exec(written);
		match !== null;
		match = UNREADABLE_COLOR_CALL_RE.exec(written)
	) {
		if (
			unreadableColorFunction(asciiLowercaseName(match[2])) &&
			startsOwnToken(written, match.index + match[1].length)
		) {
			return null;
		}
	}
	const head = text.slice(0, colon + 1);
	const srgb = head + collapsedBoxFallback(head, written);
	// A color sRGB cannot show was clamped to reach that hex, so where the target
	// reads `color()` the wider gamut goes between the two: the hex for an engine
	// reading neither, this for one without the Lab family, the author's for rest.
	if (!clipped || !S._colorFunctionAllowed) return srgb;
	const wide = wideGamutFallback(value);
	return wide === null ? srgb : `${srgb}${head}${wide}`;
};

/**
 * The same value with every color the target cannot read written as the
 * `color(display-p3 ...)` naming it, or null where any of them is one P3 cannot
 * show either - a partial wide-gamut fallback would paint some channels right
 * and clamp the rest.
 * @param {string} value the declaration's value, as printed
 * @returns {string | null} the value, or null
 */
const wideGamutFallback = (value) => {
	let withinGamut = true;
	const written = value.replace(
		FALLBACK_COLOR_FUNCTION_RE,
		/**
		 * Clamps one wide-gamut color call into sRGB.
		 * @param {string} whole the call and the character before it
		 * @param {string} before the character before the call
		 * @param {string} name the function's name
		 * @param {string} inner the call's arguments
		 * @param {number} at the offset of the match
		 * @returns {string} the value to write in its place
		 */
		(whole, before, name, inner, at) => {
			const fn = asciiLowercaseName(name);
			if (!unreadableColorFunction(fn)) return whole;
			if (!startsOwnToken(value, at + before.length)) return whole;
			const read = minifyPolarColorFunction(
				fn,
				inner,
				S._hexAlphaAllowed,
				true
			);
			/* istanbul ignore if -- @preserve: the sRGB pass above folded every one
			   of these and returned before this where any of them declined, so the
			   same call cannot answer differently here */
			if (read === null) return whole;
			const wide = wideGamutColor(
				/** @type {number[]} */ (S._fallbackChannels),
				S._fallbackAlpha
			);
			if (wide === null) {
				withinGamut = false;
				return whole;
			}
			return before + wide;
		}
	);
	return withinGamut ? written : null;
};

/**
 * Lowercase the pseudo-class and pseudo-element names in a selector's printed
 * parts, in place: the name after a `:` matches ASCII case-insensitively, while
 * a type selector's does not (`linearGradient` is an SVG element) and neither
 * does an id, a class or an attribute's value. A functional pseudo prints as one
 * token and lowercases its own name, its argument being the author's.
 * @param {string[]} parts the prelude's printed parts
 * @returns {void}
 */
/**
 * Lowercase the names in a media condition's printed parts, in place: a feature
 * name, a media type, the keywords between them and a dimension's unit all match
 * ASCII case-insensitively. A custom media query's `--name` does not, and a
 * string or a nested function (a style query) carries text no such rule covers.
 * @param {string[]} parts the condition's printed parts
 * @returns {void}
 */
const lowercaseConditionParts = (parts) => {
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		// Folded first, for the reason `foldPseudoNames` folds first.
		const lowered = asciiLowercaseName(part);
		if (lowered === part) continue;
		const first = part.charCodeAt(0);
		if (
			first === CC_QUOTATION_MARK ||
			first === CC_APOSTROPHE ||
			(first === CC_HYPHEN_MINUS && part.charCodeAt(1) === CC_HYPHEN_MINUS) ||
			part.includes("(")
		) {
			continue;
		}
		parts[i] = lowered;
	}
};

// One plain pseudo-class inside a functional pseudo's argument: a `:` no second
// colon precedes and no `(` follows, so neither a pseudo-element nor a
// functional pseudo of its own is matched.
const PSEUDO_CLASS_REFERENCE_RE = /(^|[^:\\]):([-\w]+)(?![-\w(])/g;

// What ends a compound selector: a combinator, or the comma between two.
const COMPOUND_BOUNDARY_RE = /^[\s>+~,]/;

/**
 * Write each pseudo-class the caller named as the class it gave instead, in the
 * printed parts, in place. Nothing after a pseudo-element is replaced: a class
 * cannot stand there.
 * @param {string[]} parts the prelude's printed parts
 * @returns {void}
 */
const replacePseudoClasses = (parts) => {
	const named = /** @type {Map<string, string>} */ (S._pseudoClasses);
	let first = -1;
	let second = -1;
	// Selectors 4 §3.5: a pseudo-element takes only pseudo-classes after it, so a
	// class standing there matches nothing. The compound it opens is left alone.
	let afterPseudoElement = false;
	for (let i = 0; i < parts.length; i++) {
		if (parts[i].length === 0) continue;
		if (COMPOUND_BOUNDARY_RE.test(parts[i])) afterPseudoElement = false;
		// `::name`, whether or not it takes arguments - `::part()` and `::slotted()`
		// are pseudo-elements as much as `::before` is.
		const doubled =
			second !== -1 &&
			parts[second] === ":" &&
			first !== -1 &&
			parts[first] === ":";
		if (parts[i].includes("(")) {
			// A functional pseudo prints with its arguments attached, and those hold
			// selectors of their own, `:not(:hover)` being the same question a level
			// down. Read as text, so a quoted attribute value is left alone.
			if (!parts[i].includes('"') && !parts[i].includes("'")) {
				parts[i] = parts[i].replace(
					PSEUDO_CLASS_REFERENCE_RE,
					/**
					 * Writes one pseudo-class reference as the class it names.
					 * @param {string} whole the reference and the character before it
					 * @param {string} before the character before the reference
					 * @param {string} name the pseudo-class's name
					 * @returns {string} the class selector, or the reference when it names none
					 */
					(whole, before, name) => {
						const written = named.get(toLowerCaseIfNeeded(name));
						return written === undefined
							? whole
							: `${before}.${escapeIdentifier(written)}`;
					}
				);
			}
			if (doubled) afterPseudoElement = true;
		} else if (second !== -1 && parts[second] === ":") {
			const name = toLowerCaseIfNeeded(parts[i]);
			// A `::name`, or one of the four a single colon also spells - which the
			// fold above may have just written this as.
			if (doubled || LEGACY_PSEUDO_ELEMENTS.has(name)) {
				afterPseudoElement = true;
			} else if (!afterPseudoElement) {
				const written = named.get(name);
				if (written !== undefined) {
					parts[second] = ".";
					parts[i] = escapeIdentifier(written);
				}
			}
		}
		first = second;
		second = i;
	}
};

/**
 * Drop the media type a query names for nothing. `all and (...)` matches exactly
 * what `(...)` alone does (Media Queries 4 §2.1), so the type is six bytes saying
 * nothing - while `all` on its own is the whole query and says everything. A
 * `not` or `only` before it is not the same query: `only` is there to hide the
 * whole thing from an engine reading CSS 2's grammar, which is what the keyword
 * is for.
 * @param {string[]} parts the prelude's printed parts
 * @returns {void}
 */
const dropImpliedMediaType = (parts) => {
	// The parts after `@media`, and again after every comma, open a query.
	let opening = true;
	for (let i = 1; i < parts.length; i++) {
		const part = parts[i];
		if (part.length === 0 || part === " ") continue;
		if (part === ",") {
			opening = true;
			continue;
		}
		const opened = opening;
		opening = false;
		if (!opened || part !== "all") continue;
		// The `and` joining the type to a condition; with none, the type is the
		// query.
		let next = i + 1;
		while (
			next < parts.length &&
			(parts[next].length === 0 || parts[next] === " ")
		) {
			next++;
		}
		if (next === parts.length || parts[next] !== "and") continue;
		for (let at = i; at <= next; at++) parts[at] = "";
	}
};

/**
 * Drop an operand a condition already states. `(A) and (A)` is `(A)` and so is
 * `(A) or (A)`, whatever `A` is - and CSS Conditional 3 §3 takes no chain
 * mixing the two without parentheses, so every operand at one level answers to
 * the same operator.
 * @param {string[]} parts the prelude's printed parts
 * @returns {void}
 */
const dropRepeatedConditions = (parts) => {
	// A chain of one operator only, checked whole before anything goes: a mix is
	// invalid, and dropping an operand of it could leave a valid condition.
	let operator = "";
	for (let i = 1; i < parts.length; i++) {
		const lowered = asciiLowercaseName(parts[i]);
		if (lowered !== "and" && lowered !== "or") continue;
		if (operator !== "" && operator !== lowered) return;
		operator = lowered;
	}
	/** @type {Set<string>} */
	const stated = new Set();
	for (let i = 1; i < parts.length; i++) {
		const part = parts[i];
		if (part.length === 0 || part === " ") continue;
		const lowered = asciiLowercaseName(part);
		if (lowered === "and" || lowered === "or") continue;
		// Only a parenthesized operand is one this can compare whole; a bare
		// `not` or a declaration's own tokens are parts of one.
		if (part.charCodeAt(0) !== CC_LEFT_PARENTHESIS) return;
		if (!stated.has(part)) {
			stated.add(part);
			continue;
		}
		// ...and the operator joining it, which stands before it.
		for (let at = i; at >= 0; at--) {
			const seen = parts[at];
			parts[at] = "";
			if (at !== i && seen.length !== 0 && seen !== " ") break;
		}
	}
};

// One functional pseudo whose argument is a list the target may not take, as
// printed: the name and everything between its parentheses.
const SELECTOR_LIST_PSEUDO_RE = /^(not|lang)\((.*)\)$/i;

/**
 * Write a selector list an older engine does not take inside the pseudo that
 * holds it as the `:is()` it means, in the printed parts, in place.
 *
 * `:not(a, b)` matches what neither matches, which is what `:not(:is(a, b))`
 * says - and `:is()` takes the specificity of its most specific argument, which
 * is the specificity `:not()`'s list has. `:lang(a, b)` matches either, which is
 * `:is(:lang(a), :lang(b))`. Both need `:is()` itself, so a target reading
 * neither keeps what the author wrote.
 * @param {string[]} parts the prelude's printed parts
 * @returns {void}
 */
const lowerSelectorLists = (parts) => {
	for (let i = 0; i < parts.length; i++) {
		const found = SELECTOR_LIST_PSEUDO_RE.exec(parts[i]);
		if (found === null) continue;
		const negation = asciiLowercaseName(found[1]) === "not";
		if (negation ? S._notSelectorListAllowed : S._langArgumentListAllowed) {
			continue;
		}
		const written = splitSelectorList(found[2]);
		if (written.length < 2) continue;
		parts[i] = negation
			? `not(:is(${found[2]}))`
			: `is(${written.map((one) => `:lang(${one})`).join(",")})`;
	}
};

// One condition asking for a `@custom-media` name, as printed.
const CUSTOM_MEDIA_REFERENCE_RE = /^\(\s*(--[^\s()]+)\s*\)$/;
// The same, anywhere in a printed `(...)` group.
const NESTED_CUSTOM_MEDIA_REFERENCE_RE = /\(\s*(--[^\s()]+)\s*\)/g;
// A media type: an identifier, which no keyword between conditions is.
const MEDIA_TYPE_RE = /^-?[a-zA-Z_\u0080-\uFFFF][\w\u0080-\uFFFF-]*$/;

/**
 * @param {string} token a printed query token
 * @returns {string} the keyword it spells, lowercased, without the kept comment
 */
const queryKeyword = (token) =>
	asciiLowercaseName(token.endsWith("/**/") ? token.slice(0, -4) : token);

/**
 * @param {string} token a printed query token
 * @returns {boolean} true where it is `and`, `or`, `not` or `only`
 */
const isQueryKeyword = (token) => {
	const keyword = queryKeyword(token);
	return (
		keyword === "and" ||
		keyword === "or" ||
		keyword === "not" ||
		keyword === "only"
	);
};

/**
 * Split a printed media query into its top-level tokens: a `(...)` group is one,
 * and a keyword whose comment was kept is one apart from the `(` it precedes.
 * @param {string} query one printed media query
 * @returns {string[]} its tokens
 */
const queryTokens = (query) => {
	/** @type {string[]} */
	const tokens = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i <= query.length; i++) {
		const code = i === query.length ? CC_SPACE : query.charCodeAt(i);
		if (code === CC_LEFT_PARENTHESIS) {
			if (depth === 0 && i > start && query.endsWith("/**/", i)) {
				tokens.push(query.slice(start, i));
				start = i;
			}
			depth++;
		} else if (code === CC_RIGHT_PARENTHESIS) {
			depth--;
		} else if (depth <= 0 && isAsciiWhitespace(code)) {
			if (i > start) tokens.push(query.slice(start, i));
			start = i + 1;
		}
	}
	return tokens;
};

/**
 * @param {string[]} tokens a query's tokens
 * @returns {string} them printed, spaced but where a kept comment parts them
 */
const joinQueryTokens = (tokens) => {
	let out = tokens[0];
	for (let i = 1; i < tokens.length; i++) {
		out += tokens[i - 1].endsWith("/**/") ? tokens[i] : ` ${tokens[i]}`;
	}
	return out;
};

/**
 * One alternative of a `@custom-media` query, read as what it can be written as:
 * `true` / `false`, a bare condition, a media type with the conditions after it
 * (`negated` where a `not` turns the whole query), or none of these.
 * @typedef {object} CustomMediaAlternative
 * @property {"true" | "false" | "condition" | "typed" | "negated" | "other"} kind what it is
 * @property {string[]} prefix `only` where written before the media type
 * @property {string} type the media type
 * @property {string[]} tokens the condition's tokens
 * @property {string[]} written every token, as written
 */

/**
 * @param {string} text one alternative of a printed `@custom-media` query
 * @returns {CustomMediaAlternative} it, read
 */
const customMediaAlternative = (text) => {
	const tokens = queryTokens(text);
	/** @type {CustomMediaAlternative} */
	const read = {
		kind: "other",
		prefix: [],
		type: "",
		tokens: [],
		written: tokens
	};
	if (tokens.length === 0) return read;
	const first = queryKeyword(tokens[0]);
	if (tokens.length === 1 && (first === "true" || first === "false")) {
		read.kind = first;
		return read;
	}
	if (
		tokens[0].charCodeAt(0) === CC_LEFT_PARENTHESIS ||
		(first === "not" &&
			tokens.length > 1 &&
			tokens[1].charCodeAt(0) === CC_LEFT_PARENTHESIS)
	) {
		read.kind = "condition";
		read.tokens = tokens;
		return read;
	}
	let at = 0;
	if (first === "only" || first === "not") {
		read.prefix = [tokens[0]];
		at = 1;
	}
	const type = tokens[at];
	if (
		type === undefined ||
		!MEDIA_TYPE_RE.test(type) ||
		isQueryKeyword(type) ||
		(at + 1 < tokens.length && queryKeyword(tokens[at + 1]) !== "and")
	) {
		return read;
	}
	read.kind = first === "not" ? "negated" : "typed";
	read.type = type;
	read.tokens = tokens.slice(at + 2);
	return read;
};

/**
 * A condition's tokens as a `(...)` group, the one form every place in a
 * condition reads.
 * @param {string[]} tokens the condition's tokens
 * @returns {string} it as one group
 */
const conditionGroup = (tokens) =>
	tokens.length === 1 ? tokens[0] : `(${joinQueryTokens(tokens)})`;

/**
 * A condition's tokens as they may stand in a chain of `and`: as written where
 * each is joined by `and` alone, else as one group.
 * @param {string[]} tokens the condition's tokens
 * @returns {string[]} what to write in the chain
 */
const andChainTokens = (tokens) => {
	for (const token of tokens) {
		const keyword = queryKeyword(token);
		if (keyword === "or" || keyword === "not") {
			return [conditionGroup(tokens)];
		}
	}
	return tokens;
};

/**
 * What a `@custom-media` name stands for as one condition, which only a query of
 * bare conditions has: alternatives are one `or`.
 * @param {CustomMediaAlternative[]} alternatives the query's alternatives
 * @returns {string | null} the condition as one group, or null
 */
const customMediaCondition = (alternatives) => {
	for (const alternative of alternatives) {
		if (alternative.kind !== "condition") return null;
	}
	if (alternatives.length === 1) {
		return conditionGroup(alternatives[0].tokens);
	}
	return `(${alternatives
		.map((alternative) => conditionGroup(alternative.tokens))
		.join(" or ")})`;
};

/**
 * @param {string} name a `@custom-media` name
 * @returns {CustomMediaAlternative[] | undefined} the query it stands for, read
 */
const customMediaQuery = (name) => {
	const query = S._customMedia.get(name);
	if (query === undefined) return undefined;
	return splitTopLevelArguments(query).map(customMediaAlternative);
};

/**
 * A media query's tokens with one of them dropped, and the `and` joining it.
 * @param {string[]} tokens the query's tokens
 * @param {number} at the one to drop
 * @returns {string[] | null} what is left, or null where no `and` joins it
 */
const withoutQueryToken = (tokens, at) => {
	const from = at > 0 ? at - 1 : at;
	const joint = at > 0 ? tokens[at - 1] : tokens[at + 1];
	if (joint === undefined || queryKeyword(joint) !== "and") return null;
	return [...tokens.slice(0, from), ...tokens.slice(from + 2)];
};

/**
 * Write one media query's `@custom-media` names as the queries they stand for.
 * A name standing for alternatives beside anything else is written as one query
 * per alternative, where each can be; else the query is left as written.
 * @param {string[]} tokens the query's tokens
 * @param {number} from the first token not written out already, so what a name
 * stands for is never read for names again
 * @returns {string[][] | null} the queries it is written as, or null for as written
 */
const writeCustomMediaQuery = (tokens, from) => {
	let changed = false;
	// A name inside a group can only be one condition there.
	for (let i = from; i < tokens.length; i++) {
		if (CUSTOM_MEDIA_REFERENCE_RE.test(tokens[i])) continue;
		const written = tokens[i].replace(
			NESTED_CUSTOM_MEDIA_REFERENCE_RE,
			/**
			 * Writes one nested custom media reference as its condition.
			 * @param {string} reference the reference
			 * @param {string} name the custom media's name
			 * @returns {string} the condition, or the reference when it has none
			 */
			(reference, name) => {
				const alternatives = customMediaQuery(name);
				const condition =
					alternatives === undefined
						? null
						: customMediaCondition(alternatives);
				return condition === null ? reference : condition;
			}
		);
		if (written !== tokens[i]) {
			tokens = [...tokens];
			tokens[i] = written;
			changed = true;
		}
	}
	/** @type {CustomMediaAlternative[] | undefined} */
	let alternatives;
	let at = from;
	for (; at < tokens.length; at++) {
		const found = CUSTOM_MEDIA_REFERENCE_RE.exec(tokens[at]);
		if (found === null) continue;
		alternatives = customMediaQuery(found[1]);
		if (alternatives !== undefined) break;
	}
	if (alternatives === undefined) return changed ? [tokens] : null;
	/** @type {string[][]} */
	const queries = [];
	if (tokens.length === 1) {
		for (const alternative of alternatives) {
			if (alternative.kind === "true") {
				queries.push(["all"]);
			} else if (alternative.kind !== "false") {
				queries.push(alternative.written);
			}
		}
		return queries;
	}
	// In a chain of `and` that no `not` turns, each alternative is a query of its
	// own, which every target reads; elsewhere they can only be one condition.
	if (
		queryKeyword(tokens[0]) === "not" ||
		(at > 0 && queryKeyword(tokens[at - 1]) === "not") ||
		tokens.some((token) => queryKeyword(token) === "or")
	) {
		const condition = customMediaCondition(alternatives);
		if (condition === null) return changed ? [tokens] : null;
		const written = [...tokens];
		written[at] = condition;
		return writeCustomMediaQuery(written, at + 1) || [written];
	}
	const typed =
		queryKeyword(tokens[0]) === "only" ||
		!(
			tokens[0].charCodeAt(0) === CC_LEFT_PARENTHESIS ||
			CUSTOM_MEDIA_REFERENCE_RE.test(tokens[0])
		);
	for (const alternative of alternatives) {
		/** @type {string[]} */
		let written;
		let next = at;
		if (alternative.kind === "false") continue;
		if (alternative.kind === "condition") {
			const inserted = andChainTokens(alternative.tokens);
			written = [...tokens.slice(0, at), ...inserted, ...tokens.slice(at + 1)];
			next = at + inserted.length;
		} else if (alternative.kind === "true" || alternative.kind === "typed") {
			const all =
				alternative.kind === "true" ||
				(alternative.prefix.length === 0 &&
					asciiLowercaseName(alternative.type) === "all");
			if (typed && !all) return changed ? [tokens] : null;
			const inserted = andChainTokens(alternative.tokens);
			const rest =
				inserted.length === 0
					? withoutQueryToken(tokens, at)
					: [...tokens.slice(0, at), ...inserted, ...tokens.slice(at + 1)];
			// Nothing left is a query that was never valid, as is no `and` beside it.
			if (rest === null || rest.length === 0) {
				return changed ? [tokens] : null;
			}
			next = inserted.length === 0 ? Math.max(at - 1, 0) : at + inserted.length;
			if (typed || all) {
				written = rest;
			} else {
				written = [...alternative.prefix, alternative.type, "and", ...rest];
				next += alternative.prefix.length + 2;
			}
		} else {
			return changed ? [tokens] : null;
		}
		const more = writeCustomMediaQuery(written, next);
		if (more === null) queries.push(written);
		else for (const one of more) queries.push(one);
	}
	return queries;
};

/**
 * Write each condition naming a `@custom-media` as the query it stands for, in
 * the printed parts, in place; a query left with no alternative is `not all`.
 * @param {string[]} parts the prelude's printed parts
 * @returns {void}
 */
const writeCustomMedia = (parts) => {
	/** @type {string[][]} */
	const queries = [[]];
	for (let i = 1; i < parts.length; i++) {
		if (parts[i] === ",") queries.push([]);
		else queries[queries.length - 1].push(parts[i]);
	}
	/** @type {string[][]} */
	const written = [];
	let changed = false;
	for (const query of queries) {
		const tokens = query.filter((part) => part.trim().length !== 0);
		const resolved =
			tokens.length === 0 ? null : writeCustomMediaQuery(tokens, 0);
		if (resolved === null) {
			written.push(query);
			continue;
		}
		changed = true;
		let lead = 0;
		while (lead < query.length && query[lead].trim().length === 0) lead++;
		for (let i = 0; i < resolved.length; i++) {
			/** @type {string[]} */
			const one = i === 0 ? query.slice(0, lead) : [];
			const each = resolved[i];
			for (let j = 0; j < each.length; j++) {
				if (j > 0 && !each[j - 1].endsWith("/**/")) one.push(" ");
				one.push(each[j]);
			}
			written.push(one);
		}
	}
	if (!changed) return;
	const lead = queries[0].length > 0 && queries[0][0].trim().length === 0;
	parts.length = 1;
	if (written.length === 0) {
		if (lead) parts.push(" ");
		parts.push("not", " ", "all");
		return;
	}
	for (let i = 0; i < written.length; i++) {
		if (i > 0) parts.push(",");
		for (const part of written[i]) parts.push(part);
	}
};

// WHY: WebKit reads a `@supports` `and`, `or` or `not` as invalid unless
// whitespace follows it, where the spec only needs the `(` not to join it into
// a function. Where a comment alone parted the two, a space would make WebKit
// read the condition, so the comment is written back, in a media query too.
/**
 * @param {string[]} parts a condition's printed parts, in place
 * @returns {void}
 */
const keepKeywordComments = (parts) => {
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		if (
			!asciiCaseInsensitiveMatch(part, "and") &&
			!asciiCaseInsensitiveMatch(part, "or") &&
			!asciiCaseInsensitiveMatch(part, "not")
		) {
			continue;
		}
		// The parts are children's printed texts, run before any pass blanks one,
		// and no child prints empty: the part after is the one that follows.
		const next = i + 1;
		if (
			next < parts.length &&
			parts[next].charCodeAt(0) === CC_LEFT_PARENTHESIS
		) {
			parts[i] = `${part}/**/`;
		}
	}
};

/**
 * Minify a media or container query's printed parts, in place, after its first
 * part - the rule's name, which none of the passes read.
 * @param {string[]} parts the prelude's printed parts
 * @param {boolean} media whether it is a media query rather than a container one
 * @returns {void}
 */
const minifyMediaQueryParts = (parts, media) => {
	// Only a media query's top level is media types and the keywords between
	// them; `@container`'s leads with a container name, which is the author's own
	// and case-sensitive.
	if (media) {
		// Before the passes below, which read the query this writes in.
		if (S._transforms.customMedia && S._customMedia.size !== 0) {
			writeCustomMedia(parts);
		}
		if (S._transforms.foldCase) lowercaseConditionParts(parts);
		if (S._transforms.shortenMediaQueries) dropImpliedMediaType(parts);
	}
	if (S._rangeSpellingAllowed) {
		collapseRangeInterval(parts);
	}
	// A `@container` query is itself newer than the range spelling, so a target
	// that reads one reads the other and there is nothing to lower.
	else if (media && S._transforms.lowerUnsupported) {
		useMinMaxSpelling(parts);
	}
};

/**
 * Where an `@import`'s media query starts in its printed parts: past the URL,
 * then a `layer` and a `supports()` where written, each of which is one part.
 * @param {string[]} parts the prelude's printed parts, `@import` first
 * @returns {number} the index of the query's first part, or -1 when it has none
 */
const importMediaStart = (parts) => {
	// 0: the URL is next, 1: a `layer`, 2: a `supports()`, 3: the query.
	let expecting = 0;
	for (let i = 1; i < parts.length; i++) {
		const part = parts[i];
		if (part.length === 0 || part === SEP) continue;
		if (expecting === 0) {
			expecting = 1;
			continue;
		}
		const open = part.indexOf("(");
		const name = asciiLowercaseName(
			unescapeIdentifier(open === -1 ? part : part.slice(0, open))
		);
		if (expecting === 1 && name === "layer") {
			expecting = 2;
		} else if (expecting !== 3 && open !== -1 && name === "supports") {
			expecting = 3;
		} else {
			return i;
		}
	}
	return -1;
};

/**
 * Where a `@custom-media` query starts in its printed parts: past the name.
 * @param {string[]} parts the prelude's printed parts, `@custom-media` first
 * @returns {number} the index of the query's first part, or -1 when it has none
 */
const customMediaStart = (parts) => {
	let named = false;
	for (let i = 1; i < parts.length; i++) {
		const part = parts[i];
		if (part.length === 0 || part === SEP) continue;
		if (named) return i;
		named = true;
	}
	return -1;
};

// One selector naming a `@custom-selector`, as printed after its `:`.
const CUSTOM_SELECTOR_NAME_RE = /^--[^\s(),]+$/;

/**
 * Write each selector naming a `@custom-selector` as the list it stands for, in
 * the printed parts, in place.
 *
 * The list is always written as `:is(...)`: it may name alternatives, and even a
 * lone type selector cannot be spliced into a compound another part opened.
 * Only a name already taken down, as with `@custom-media`.
 * @param {string[]} parts the prelude's printed parts
 * @returns {void}
 */
const writeCustomSelector = (parts) => {
	// The two non-empty parts before the current one: the `:` a pseudo is written
	// after, and whether a second `:` made it a pseudo-element, which this never is.
	let first = -1;
	let second = -1;
	// The parts are the children's printed texts, none empty, and the one blanked
	// below is behind the scan.
	for (let i = 0; i < parts.length; i++) {
		if (
			CUSTOM_SELECTOR_NAME_RE.test(parts[i]) &&
			second !== -1 &&
			parts[second] === ":" &&
			!(first !== -1 && parts[first] === ":")
		) {
			const list = S._customSelectors.get(parts[i]);
			if (list !== undefined) {
				parts[second] = "";
				parts[i] = `:is(${list})`;
			}
		}
		first = second;
		second = i;
	}
};

// `:dir(ltr)` / `:dir(rtl)`, as printed: the name and its one argument.
const DIR_PSEUDO_RE = /^dir\(\s*([a-zA-Z-]+)\s*\)$/i;

/**
 * Write `:dir()` a target does not read as the `[dir]` attribute selector, in
 * the printed parts, in place.
 *
 * The two are not the same question: `:dir()` reads the directionality an
 * element resolves to, which it may inherit, while `[dir=rtl]` reads the
 * attribute itself - so an element inside a `dir="rtl"` ancestor matches the
 * first and not the second. That is why this is off unless asked for.
 * @param {string[]} parts the prelude's printed parts
 * @returns {void}
 */
const lowerDirSelector = (parts) => {
	// The two non-empty parts before the current one: the `:` a pseudo is written
	// after, and whether a second `:` made it a pseudo-element, which this never is.
	let first = -1;
	let second = -1;
	for (let i = 0; i < parts.length; i++) {
		if (parts[i].length === 0) continue;
		const found = DIR_PSEUDO_RE.exec(parts[i]);
		if (
			found !== null &&
			second !== -1 &&
			parts[second] === ":" &&
			!(first !== -1 && parts[first] === ":")
		) {
			parts[second] = "";
			parts[i] = `[dir=${asciiLowercaseName(found[1])}]`;
		}
		first = second;
		second = i;
	}
};

/**
 * Fold a selector's pseudo names to lowercase and drop the redundant colon of a
 * CSS2 pseudo-element, in one pass over the printed parts: both read the part
 * after a `:`, and the fold is what the legacy name is then matched against.
 * Empty parts are stepped over - a comment between the colons printed away, and
 * the tokenizer had already dropped it anyway.
 * @param {string[]} parts the prelude's printed parts
 * @returns {boolean} whether a pseudo it read may be an `:is()` for `unwrapLoneIs`
 */
const foldPseudoNames = (parts) => {
	const dropping = S._transforms.shortenSelectors;
	let mayUnwrap = false;
	// The three non-empty parts before the current one.
	let zeroth = -1;
	let first = -1;
	let second = -1;
	for (let i = 0; i < parts.length; i++) {
		let part = parts[i];
		if (part.length === 0) continue;
		// A pseudo's name matches ASCII case-insensitively; a type selector's does
		// not, `linearGradient` being an SVG element, and nor does an id, class or
		// attribute value. A functional pseudo folds its own name alone.
		if (second !== -1 && parts[second] === ":") {
			if (
				part.length > 4 &&
				part.charCodeAt(2) === CC_LEFT_PARENTHESIS &&
				(part.charCodeAt(0) | 0x20) === CC_LOWER_I
			) {
				mayUnwrap = true;
			}
			if (S._transforms.foldCase && !part.includes("(")) {
				const lowered = asciiLowercaseName(part);
				if (lowered !== part) {
					part = lowered;
					parts[i] = lowered;
				}
			}
			// Folded first, so the legacy name below is matched against the folded
			// text rather than folded a second time.
			if (
				dropping &&
				first !== -1 &&
				parts[first] === ":" &&
				// `:::before` is no selector, and dropping a colon would make it one.
				(zeroth === -1 || parts[zeroth] !== ":") &&
				LEGACY_PSEUDO_ELEMENTS.has(part)
			) {
				parts[first] = "";
			}
		}
		zeroth = first;
		first = second;
		second = i;
	}
	return mayUnwrap;
};

// A legacy pseudo-element written with one colon, which `:is()` cannot hold.
const LEGACY_PSEUDO_ELEMENT_RE = new RegExp(
	`:(?:${[...LEGACY_PSEUDO_ELEMENTS].join("|")})(?![-\\w])`,
	"i"
);

/**
 * Whether a printed selector is one compound: no comma and no combinator
 * outside its brackets, parentheses, strings and escapes.
 * @param {string} selector a printed selector
 * @returns {boolean} true when it is a single compound selector
 */
const isCompoundText = (selector) => {
	/** @type {number[] | undefined} */
	let closers;
	let depth = 0;
	let quote = 0;
	for (let i = 0; i < selector.length; i++) {
		const code = selector.charCodeAt(i);
		if (code === CC_REVERSE_SOLIDUS) {
			i++;
		} else if (quote !== 0) {
			if (code === quote) quote = 0;
		} else if (code === CC_QUOTATION_MARK || code === CC_APOSTROPHE) {
			quote = code;
		} else if (code === CC_LEFT_PARENTHESIS || code === CC_LEFT_SQUARE) {
			if (closers === undefined) closers = [];
			closers[depth++] =
				code === CC_LEFT_PARENTHESIS ? CC_RIGHT_PARENTHESIS : CC_RIGHT_SQUARE;
		} else if (code === CC_RIGHT_PARENTHESIS || code === CC_RIGHT_SQUARE) {
			// A closer no block waits for is a stray token, not one compound.
			if (
				depth === 0 ||
				/** @type {number[]} */ (closers)[depth - 1] !== code
			) {
				return false;
			}
			depth--;
		} else if (
			depth === 0 &&
			(code === CC_COMMA || isCombinator(code) || isAsciiWhitespace(code))
		) {
			return false;
		}
	}
	return true;
};

/**
 * Unwrap each `:is()` holding one compound, which matches the same elements with
 * the same specificity. Only where the targets read every pseudo it names, since
 * `:is()` forgives an argument it cannot parse and a bare compound does not.
 * @param {string[]} parts a selector's printed parts, rewritten in place, called only where `foldPseudoNames` read a pseudo that may be an `:is()`
 */
const unwrapLoneIs = (parts) => {
	let before = -1;
	// Past a pseudo-element a compound takes only a few pseudo-classes, which an
	// `:is()` there may hold and a bare compound may not.
	let pastElement = false;
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		if (part.length === 0) continue;
		if (part === SEP || part === "," || isCombinator(part.charCodeAt(0))) {
			pastElement = false;
		}
		if (part === ":" && (before === -1 || parts[before] !== ":")) {
			let next = i + 1;
			while (next < parts.length && parts[next].length === 0) next++;
			const call = next < parts.length ? parts[next] : "";
			if (
				call === ":" ||
				LEGACY_PSEUDO_ELEMENTS.has(toLowerCaseIfNeeded(call))
			) {
				pastElement = true;
			}
			const isCall =
				!pastElement &&
				call.length > 4 &&
				(call.charCodeAt(0) | 0x20) === CC_LOWER_I &&
				(call.charCodeAt(1) | 0x20) === CC_LOWER_S &&
				call.charCodeAt(2) === CC_LEFT_PARENTHESIS &&
				call.charCodeAt(call.length - 1) === CC_RIGHT_PARENTHESIS;
			const inner = isCall ? call.slice(3, -1) : "";
			if (
				isCall &&
				isCompoundText(inner) &&
				!inner.includes("::") &&
				!LEGACY_PSEUDO_ELEMENT_RE.test(inner) &&
				// A type or universal only leads a compound, and its namespace must
				// not replace the default namespace constraining the outer compound.
				(!startsTypeSelector(inner) ||
					(!inner.includes("|") &&
						(before === -1 ||
							parts[before] === SEP ||
							parts[before] === "," ||
							isCombinator(parts[before].charCodeAt(0))))) &&
				pseudosReadable(inner) &&
				!unwrapFuses(parts, before, inner, next)
			) {
				parts[i] = "";
				parts[next] = inner;
				i = next;
			}
		}
		before = i;
	}
};

/**
 * Whether an unwrapped `:is()` argument reads into a neighbor, as `.a` before
 * `-1` does. `join` would part them with a comment, so the `:is()` stays, as
 * the `&` lowering writes it where the parent fuses the same way.
 * @param {string[]} parts a selector's printed parts
 * @param {number} before the last non-empty part before the `:`, or -1
 * @param {string} inner the `:is()` argument
 * @param {number} call where the `is(...)` part is
 * @returns {boolean} true when the argument would fuse with the part before or after
 */
const unwrapFuses = (parts, before, inner, call) => {
	let after = call + 1;
	while (after < parts.length && parts[after].length === 0) after++;
	return (
		(before !== -1 &&
			parts[before] !== SEP &&
			join([parts[before], inner], false, TRIM_COMBINATORS).length !==
				parts[before].length + inner.length) ||
		(after < parts.length &&
			parts[after] !== SEP &&
			join([inner, parts[after]], false, TRIM_COMBINATORS).length !==
				inner.length + parts[after].length)
	);
};

/**
 * Whether a printed compound opens with a type, universal or namespaced selector.
 * @param {string} compound a printed compound selector
 * @returns {boolean} true when its first simple selector names an element
 */
const startsTypeSelector = (compound) => {
	const code = compound.charCodeAt(0);
	return (
		isIdentCodePoint(code) ||
		code === CC_REVERSE_SOLIDUS ||
		code === CC_ASTERISK ||
		code === CC_VERTICAL_LINE
	);
};

/**
 * Where each `(` in a printed condition closes, skipping strings and escapes.
 * @param {string} text a printed condition
 * @returns {Int32Array | null} the closing index per opening one, or null where
 * the text is not balanced
 */
const matchingParens = (text) => {
	const close = new Int32Array(text.length).fill(-1);
	/** @type {number[]} */
	const open = [];
	let quote = 0;
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		if (code === CC_REVERSE_SOLIDUS) {
			i++;
		} else if (quote !== 0) {
			if (code === quote) quote = 0;
		} else if (code === CC_QUOTATION_MARK || code === CC_APOSTROPHE) {
			quote = code;
		} else if (code === CC_LEFT_PARENTHESIS) {
			open.push(i);
		} else if (code === CC_RIGHT_PARENTHESIS) {
			const at = open.pop();
			if (at === undefined) return null;
			close[at] = i;
		}
	}
	return open.length === 0 && quote === 0 ? close : null;
};

/**
 * The groups, functions and words a printed condition is a chain of, at its
 * top level.
 * @param {string} text a printed condition
 * @returns {string[] | null} its groups and functions and the words between them, or null
 */
const conditionItems = (text) => {
	const close = matchingParens(text);
	if (close === null) return null;
	/** @type {string[]} */
	const items = [];
	let i = 0;
	while (i < text.length) {
		const code = text.charCodeAt(i);
		if (isAsciiWhitespace(code)) {
			i++;
		} else if (code === CC_LEFT_PARENTHESIS) {
			items.push(text.slice(i, close[i] + 1));
			i = close[i] + 1;
		} else {
			let end = i;
			while (end < text.length && isAsciiIdentCodePoint(text.charCodeAt(end))) {
				end++;
			}
			if (end === i) return null;
			// A word a `(` follows is a function, one token through its `)`.
			if (text.charCodeAt(end) === CC_LEFT_PARENTHESIS) end = close[end] + 1;
			items.push(text.slice(i, end));
			i = end;
		}
	}
	return items;
};

/**
 * The tests of an `or` chain left once a vendor spelling's goes where the same
 * test of the standard spelling stands beside it and no target needs the vendor
 * one: a target reading it either reads the other too or needs it.
 * @param {string[]} items the chain's groups and words, at its top level
 * @returns {string[] | null} the kept groups, or null where nothing goes
 */
const keptDisjuncts = (items) => {
	if (items.length < 3) return null;
	/** @type {string[]} */
	const groups = [];
	for (let k = 0; k < items.length; k++) {
		if (k % 2 === 1) {
			if (!asciiCaseInsensitiveMatch(items[k], "or")) return null;
		} else if (items[k].charCodeAt(0) === CC_LEFT_PARENTHESIS) {
			groups.push(items[k]);
		} else {
			return null;
		}
	}
	const lowered = groups.map((group) => toLowerCaseIfNeeded(group));
	const kept = groups.filter((group, k) => {
		const test = /^\(([-a-z]+):(.*)\)$/.exec(lowered[k]);
		if (test === null) return true;
		const [, property, value] = test;
		const vendor = /^(-[a-z]+-)([a-z-]+)$/.exec(property);
		if (
			vendor !== null &&
			lowered.includes(`(${vendor[2]}:${value})`) &&
			prefixedPropertyRemovable(vendor[2], property)
		) {
			return false;
		}
		// A vendor spelling of a value, beside the keyword it spells.
		const valueTable = getPrefixedValues().get(property);
		const keyword =
			valueTable === undefined
				? undefined
				: prefixedValueKeyword(valueTable, value);
		return (
			keyword === undefined ||
			!lowered.includes(`(${property}:${keyword})`) ||
			!prefixRemovable(
				/** @type {Map<string, [string, number][]>} */ (valueTable),
				keyword,
				value
			)
		);
	});
	return kept.length === groups.length ? null : kept;
};

/**
 * A printed condition group with each `or` chain inside it rid of the vendor
 * tests `keptDisjuncts` finds dead, however deep the chain stands.
 * @param {string} group a printed `(...)` group
 * @returns {string} the group, rewritten
 */
const simplifySupportsGroup = (group) => {
	const inner = group.slice(1, -1);
	const items = conditionItems(inner);
	// A test of a declaration, or of a function, holds no condition to simplify.
	if (items === null || items.length === 0) return group;
	if (
		items[0].charCodeAt(0) !== CC_LEFT_PARENTHESIS &&
		!asciiCaseInsensitiveMatch(items[0], "not")
	) {
		return group;
	}
	const rewritten = items.map((item) =>
		item.charCodeAt(0) === CC_LEFT_PARENTHESIS
			? simplifySupportsGroup(item)
			: item
	);
	const kept = keptDisjuncts(rewritten);
	return `(${kept === null ? rewritten.join(" ") : kept.join(" or ")})`;
};

/**
 * Drop each `@supports` test of a vendor spelling an `or` beside the standard
 * spelling's makes dead for every target, at any depth of the condition.
 * @param {string[]} parts the prelude's printed parts, rewritten in place
 * @returns {void}
 */
const dropDeadPrefixedTests = (parts) => {
	/** @type {number[]} */
	const at = [];
	for (let i = 1; i < parts.length; i++) {
		const part = parts[i];
		if (part === SEP || part.length === 0) continue;
		if (part.includes("/*")) return;
		if (part.charCodeAt(0) === CC_LEFT_PARENTHESIS) {
			parts[i] = simplifySupportsGroup(part);
		}
		at.push(i);
	}
	const kept = keptDisjuncts(at.map((i) => parts[i]));
	if (kept === null) return;
	parts.length = 1;
	parts.push(SEP, kept.join(" or "));
};

/**
 * Drop the parentheses a `@supports` condition doubles: `((X))` is `(X)`, and a
 * prelude that is one group of groups is those groups. A test of a declaration
 * keeps its own, which the grammar asks for.
 * @param {string[]} parts the prelude's printed parts, rewritten in place
 * @returns {void}
 */
const dropRedundantSupportsParens = (parts) => {
	let groups = 0;
	let only = -1;
	for (let i = 1; i < parts.length; i++) {
		const part = parts[i];
		if (part === SEP || part.length === 0) continue;
		if (part.charCodeAt(0) !== CC_LEFT_PARENTHESIS || part.includes("/*")) {
			groups = -1;
			continue;
		}
		let text = part;
		// Only an opening pair is one to drop, which almost no condition holds.
		while (text.includes("((")) {
			const close = matchingParens(text);
			if (close === null) break;
			let at = -1;
			for (let j = 0; j < text.length - 1; j++) {
				if (
					text.charCodeAt(j) === CC_LEFT_PARENTHESIS &&
					text.charCodeAt(j + 1) === CC_LEFT_PARENTHESIS &&
					close[j + 1] === close[j] - 1
				) {
					at = j;
					break;
				}
			}
			if (at === -1) break;
			text =
				text.slice(0, at) +
				text.slice(at + 1, close[at]) +
				text.slice(close[at] + 1);
		}
		parts[i] = text;
		if (groups !== -1) {
			groups++;
			only = i;
		}
	}
	if (groups !== 1) return;
	const text = parts[only];
	if (text.charCodeAt(1) !== CC_LEFT_PARENTHESIS) return;
	const close = matchingParens(text);
	if (
		close !== null &&
		close[0] === text.length - 1 &&
		text.charCodeAt(1) === CC_LEFT_PARENTHESIS &&
		isConditionChain(text.slice(1, -1))
	) {
		parts[only] = text.slice(1, -1);
	}
};

/**
 * Whether a printed text is a condition a prelude can stand on unwrapped: one
 * group, or groups joined by `and` or `or` (the caller has a group first, so
 * never a `not`). Anything else in the
 * outer pair (`((a) x)`, or a `{` the input ran out in) is held inside it.
 * @param {string} text what the outer parentheses hold
 * @returns {boolean} true for a chain of groups
 */
const isConditionChain = (text) => {
	const items = conditionItems(text);
	// Groups, one joiner between each two: never a word first or last.
	if (items === null || items.length % 2 === 0) return false;
	for (let k = 0; k < items.length; k++) {
		if (
			k % 2 === 0
				? items[k].charCodeAt(0) !== CC_LEFT_PARENTHESIS
				: !asciiCaseInsensitiveMatch(items[k], toLowerCaseIfNeeded(items[1]))
		) {
			return false;
		}
	}
	// One joiner throughout: the grammar takes no `and` beside an `or` unparenthesized.
	return (
		items.length === 1 ||
		asciiCaseInsensitiveMatch(items[1], "and") ||
		asciiCaseInsensitiveMatch(items[1], "or")
	);
};

// `@keyframes` and every vendor spelling of it, whose prelude is a name and
// whose child preludes are keyframe selectors rather than selector lists.
const KEYFRAMES_AT_RULE_RE = /^(?:-[a-z]+-)?keyframes$/i;

// One printed `(<feature><comparison><value>)`, the shape the range spelling
// leaves behind. Media Queries 4 §2.4.3 writes an interval with both
// comparisons pointing the same way, so a pair is only ever joined as `<`.
const RANGE_CONDITION_RE = /^\(([-\w]+)(>=|<=|>|<)([^()<>]+)\)$/;

// The two shapes the range spelling prints: `(<feature><comparison><value>)` and
// `(<value><comparison><feature><comparison><value>)`. A bound holds no
// comparison, so the greedy runs stop at the next one; nor opens a nested group.
const RANGE_FEATURE_RE = /^\(([-\w]+)(>=|<=|=)([^<>=]+)\)$/;
const RANGE_INTERVAL_RE =
	/^\(([^<>=(][^<>=]*)(<=|>=)([-\w]+)(<=|>=)([^<>=]+)\)$/;

/**
 * The `min-` / `max-` condition one non-strict comparison says: `width>=X` is
 * `(min-width:X)` and `width<=X` is `(max-width:X)`, both of which every engine
 * that reads a media query at all reads. `=` is the plain feature.
 *
 * A strict `>` / `<` has no such equivalent - its negation (`not (max-width:X)`)
 * is itself Media Queries 4, so an engine too old for the range spelling cannot
 * read that either - and is left as written.
 * @param {string} feature the feature name
 * @param {string} comparison one of `>=`, `<=`, `=`
 * @param {string} value the bound
 * @returns {string} the condition, parentheses included
 */
const minMaxCondition = (feature, comparison, value) =>
	`(${
		comparison === "=" ? "" : comparison === ">=" ? "min-" : "max-"
	}${feature}:${value})`;

/**
 * Rewrite the range spelling back to the `min-` / `max-` prefixes every engine
 * reads, in the prelude's printed parts, in place - the inverse of
 * `_useRangeSpelling` / `collapseRangeInterval`, run for a target that does not
 * read Media Queries 4 range syntax.
 *
 * An interval becomes an `and` of its two bounds, which is a conjunction - so it
 * is parenthesized where the prelude joins with `or`, or after a `not`, which
 * would otherwise negate the first bound alone. A prelude that holds an `or` is already Media
 * Queries 4, so the parentheses cost that query nothing.
 * @param {string[]} parts the prelude's printed parts
 * @returns {void}
 */
const useMinMaxSpelling = (parts) => {
	/** @type {number[]} */
	const filled = [];
	let disjunction = false;
	for (let i = 0; i < parts.length; i++) {
		if (parts[i].length === 0 || parts[i] === SEP) continue;
		if (queryKeyword(parts[i]) === "or") disjunction = true;
		filled.push(i);
	}
	for (let index = 0; index < filled.length; index++) {
		const at = filled[index];
		const one = RANGE_FEATURE_RE.exec(parts[at]);
		if (one !== null) {
			parts[at] = minMaxCondition(one[1], one[2], one[3]);
			continue;
		}
		const interval = RANGE_INTERVAL_RE.exec(parts[at]);
		if (interval === null) continue;
		// Media Queries 4 §2.4.3 writes both comparisons the same way round, so the
		// first bound is the lower one under `<=` and the upper one under `>=`.
		const rising = interval[2] === "<=";
		if (rising !== (interval[4] === "<=")) continue;
		const low = minMaxCondition(interval[3], rising ? ">=" : "<=", interval[1]);
		const high = minMaxCondition(
			interval[3],
			rising ? "<=" : ">=",
			interval[5]
		);
		const pair = `${low} and ${high}`;
		const negated =
			index > 0 && queryKeyword(parts[filled[index - 1]]) === "not";
		parts[at] = disjunction || negated ? `(${pair})` : pair;
	}
};

/**
 * Collapse an `and` of two one-sided ranges on one feature into the interval
 * that says the same (`(width>=1px) and (width<=2px)` is `(1px<=width<=2px)`),
 * in the printed parts, in place. Only a bounded pair - two comparisons the
 * same way round are not an interval, and `or` is not a conjunction.
 * @param {string[]} parts the prelude's printed parts
 * @returns {void}
 */
const collapseRangeInterval = (parts) => {
	if (!S._transforms.shortenMediaQueries) return;
	/** @type {number[]} */
	const filled = [];
	for (let i = 0; i < parts.length; i++) {
		if (parts[i].length !== 0 && parts[i] !== SEP) filled.push(i);
	}
	for (let i = 0; i + 2 < filled.length; i++) {
		if (!asciiCaseInsensitiveMatch(parts[filled[i + 1]], "and")) continue;
		const left = RANGE_CONDITION_RE.exec(parts[filled[i]]);
		if (left === null) continue;
		const right = RANGE_CONDITION_RE.exec(parts[filled[i + 2]]);
		if (right === null) continue;
		if (!asciiCaseInsensitiveMatch(left[1], right[1])) continue;
		// One has to bound it from below and the other from above.
		const lower = left[2].startsWith(">") ? left : right;
		const upper = left[2].startsWith(">") ? right : left;
		if (!lower[2].startsWith(">") || !upper[2].startsWith("<")) continue;
		const low = `${lower[3]}${lower[2] === ">=" ? "<=" : "<"}`;
		parts[filled[i]] = `(${low}${left[1]}${upper[2]}${upper[3]})`;
		parts[filled[i + 1]] = "";
		parts[filled[i + 2]] = "";
		i += 2;
	}
};

// The parts that end a compound: a combinator, or the comma ending a selector.
const COMPOUND_ENDS = " >+~,";

/**
 * Drop the universal selector a compound already implies (`*:before` is
 * `:before`), in the printed parts, in place. `*` carries no specificity and
 * matches every element, so a qualified compound means the same without it.
 * @param {string[]} parts the prelude's printed parts
 * @returns {void}
 */
/**
 * Whether the simple selector at `at` may select a featureless element, which
 * matches no type or universal selector - so the `*` before it is what keeps
 * the rule from matching, not a spelling of it.
 * @param {string[]} parts the printed selector, one piece per token
 * @param {number} at where the simple selector starts
 * @returns {boolean} true when the `*` before it has to stay
 */
const selectsFeatureless = (parts, at) => {
	if (parts[at] !== ":") return false;
	let name = at + 1;
	while (name < parts.length && parts[name].length === 0) name++;
	if (name >= parts.length) return false;
	// A functional pseudo-class arrives with its arguments attached.
	const open = parts[name].indexOf("(");
	const named = open === -1 ? parts[name] : parts[name].slice(0, open);
	if (FEATURELESS_PSEUDO_CLASSES.has(toLowerCaseIfNeeded(named))) return true;
	// `:is(:host)` matches the host as its argument does, and an escape could
	// spell `:host`: the rest of the compound is read conservatively.
	// Two colons in a row open a pseudo-element, which `::host` only names.
	let colons = 1;
	for (let i = name; i < parts.length; i++) {
		const part = parts[i];
		if (part.length === 0) continue;
		if (part === ":") {
			colons++;
			continue;
		}
		if (part.length === 1 && COMPOUND_ENDS.includes(part)) break;
		const lower = toLowerCaseIfNeeded(part);
		if (
			lower.includes("\\") ||
			lower.includes(":host") ||
			(colons === 1 && lower.startsWith("host"))
		) {
			return true;
		}
		colons = 0;
	}
	return false;
};

/**
 * Drop the universal selector a compound already implies (`*:before` is
 * `:before`), in the printed parts, in place. `*` carries no specificity and
 * matches every element, so a qualified compound means the same without it -
 * except before a featureless pseudo-class, which no element with features
 * matches.
 * @param {string[]} parts the prelude's printed parts
 * @returns {void}
 */
const dropImpliedUniversalSelector = (parts) => {
	// A native search first: almost no selector holds a `*` at all.
	if (!S._transforms.shortenSelectors || !parts.includes("*")) return;
	let previous = -1;
	// What stands before `previous`: a `*` after a simple selector, or after a
	// namespace's `|`, opens no compound, and dropping it would change the selector.
	let opener = -1;
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		if (part.length === 0) continue;
		if (
			previous !== -1 &&
			parts[previous] === "*" &&
			COMPOUND_CONTINUATIONS.has(part.charAt(0)) &&
			(opener === -1 ||
				parts[opener] === SEP ||
				parts[opener] === "," ||
				isCombinator(parts[opener].charCodeAt(0))) &&
			!selectsFeatureless(parts, i)
		) {
			parts[previous] = "";
		}
		opener = previous;
		previous = i;
	}
};

// The run `splitSelectorList` steps over, in a string or out: nothing it reads.
const SELECTOR_LIST_PLAIN = /[^\\"'()[\],]*/y;

/**
 * Split a selector list at the commas that separate its selectors. A comma
 * inside `:is(...)`, an attribute value or a string belongs to one selector.
 * @param {string} prelude the printed selector list
 * @returns {string[]} the selectors, in written order
 */
const splitSelectorList = (prelude) => {
	/** @type {string[]} */
	const out = [];
	// The closer each open block waits for: §5.4.8 ends a block only on its own,
	// so a stray `]` or `)` is a token like any other and leaves the depth alone.
	/** @type {number[] | undefined} */
	let closers;
	let depth = 0;
	let quote = 0;
	let start = 0;
	for (let i = 0; i < prelude.length; i++) {
		SELECTOR_LIST_PLAIN.lastIndex = i;
		SELECTOR_LIST_PLAIN.test(prelude);
		i = SELECTOR_LIST_PLAIN.lastIndex;
		if (i === prelude.length) break;
		const code = prelude.charCodeAt(i);
		if (code === CC_REVERSE_SOLIDUS) {
			i++;
			continue;
		}
		if (quote !== 0) {
			if (code === quote) quote = 0;
			continue;
		}
		if (code === CC_QUOTATION_MARK || code === CC_APOSTROPHE) {
			quote = code;
		} else if (code === CC_LEFT_PARENTHESIS || code === CC_LEFT_SQUARE) {
			if (closers === undefined) closers = [];
			closers[depth++] =
				code === CC_LEFT_PARENTHESIS ? CC_RIGHT_PARENTHESIS : CC_RIGHT_SQUARE;
		} else if (
			(code === CC_RIGHT_PARENTHESIS || code === CC_RIGHT_SQUARE) &&
			depth !== 0 &&
			/** @type {number[]} */ (closers)[depth - 1] === code
		) {
			depth--;
		} else if (code === CC_COMMA && depth === 0) {
			out.push(prelude.slice(start, i));
			start = i + 1;
		}
	}
	out.push(prelude.slice(start));
	return out;
};

// A substitution expands to a whole token sequence, so two identical references
// are not one repeated value: with `--x:1px 2px`, `margin:var(--x) var(--x)` is
// four values, not two. `--name(` is a custom function (CSS Functions).
const SUBSTITUTION_NAMES = [...SUBSTITUTION_FUNCTIONS];
// Every length a substitution function's name has, as a bit mask.
const SUBSTITUTION_NAME_LENGTHS = SUBSTITUTION_NAMES.reduce(
	(mask, fn) => mask | (1 << fn.length),
	0
);

/**
 * Whether the `(` at `at` closes a substitution: one of the substitution
 * functions standing as a whole name (ASCII case-insensitively), or a name
 * holding `--` - the same shapes the regex `(?:^|[^\w-])NAME\(|--[\w-]*\(` reads.
 * @param {string} text the text
 * @param {number} from where the name before the `(` may begin at the earliest
 * @param {number} at the `(`'s offset
 * @returns {boolean} true when a substitution stands there
 */
const substitutionCallAt = (text, from, at) => {
	let start = at;
	let hyphens = 0;
	let custom = false;
	while (start > from) {
		const c = text.charCodeAt(start - 1);
		if (c === CC_HYPHEN_MINUS) {
			if (++hyphens === 2) custom = true;
		} else if (isLetter(c) || isDigit(c) || c === CC_LOW_LINE) {
			hyphens = 0;
		} else {
			break;
		}
		start--;
	}
	if (custom) return true;
	const length = at - start;
	if (length > 31 || (SUBSTITUTION_NAME_LENGTHS & (1 << length)) === 0) {
		return false;
	}
	for (let i = 0; i < SUBSTITUTION_NAMES.length; i++) {
		if (
			rangeAsciiCaseInsensitiveMatch(text, start, at, SUBSTITUTION_NAMES[i])
		) {
			return true;
		}
	}
	return false;
};

/**
 * The substitution functions a printed value calls, outside its strings.
 * @param {string} value a printed declaration value
 * @returns {string[] | null} their lowercased names, or null where it calls none
 */
const heldSubstitutions = (value) => {
	/** @type {string[] | null} */
	let out = null;
	let quote = 0;
	for (let i = 0; i < value.length; i++) {
		const cc = value.charCodeAt(i);
		if (cc === CC_REVERSE_SOLIDUS) {
			i++;
		} else if (quote !== 0) {
			if (cc === quote) quote = 0;
		} else if (cc === CC_QUOTATION_MARK || cc === CC_APOSTROPHE) {
			quote = cc;
		} else if (cc === CC_LEFT_PARENTHESIS && substitutionCallAt(value, 0, i)) {
			let start = i;
			while (start > 0 && isIdentCodePoint(value.charCodeAt(start - 1))) {
				start--;
			}
			if (out === null) out = [];
			out.push(toLowerCaseIfNeeded(value.slice(start, i)));
		}
	}
	return out;
};

/**
 * Whether a value contains a substitution function such as `var()` or `env()`,
 * so its tokens are not what the engine will see there.
 * @param {string} text the text to look in
 * @returns {boolean} true when a substitution may stand in it
 */
const containsSubstitutionFunction = (text) => {
	// Every shape accepted ends in `(`, so only each `(` is looked behind.
	const first = text.indexOf("(");
	for (let at = first; at !== -1; at = text.indexOf("(", at + 1)) {
		if (substitutionCallAt(text, 0, at)) return true;
	}
	return (
		first !== -1 &&
		text.includes("\\") &&
		escapedSubstitutionIn(text, 0, text.length)
	);
};

/**
 * Whether a range calls a substitution by an escaped name, where the look behind
 * above stops at the `\`: each name is read forward, escapes resolved (§4.3.7).
 * @param {string} text the text
 * @param {number} from the range's start offset
 * @param {number} to the range's end offset (exclusive)
 * @returns {boolean} true when a substitution may stand in it
 */
const escapedSubstitutionIn = (text, from, to) => {
	let start = -1;
	for (let i = from; i < to; i++) {
		const c = text.charCodeAt(i);
		if (
			c === CC_REVERSE_SOLIDUS &&
			i + 1 < to &&
			!isNewline(text.charCodeAt(i + 1))
		) {
			if (start === -1) start = i;
			let next = i + 1;
			if (isHexDigit(text.charCodeAt(next))) {
				const limit = Math.min(to, next + 6);
				while (next < limit && isHexDigit(text.charCodeAt(next))) next++;
				if (next < to && isAsciiWhitespace(text.charCodeAt(next))) {
					next = consumeExtraNewline(text.charCodeAt(next), text, next + 1);
				}
			} else {
				next++;
			}
			i = next - 1;
		} else if (c >= 0x80 || isAsciiIdentCodePoint(c)) {
			if (start === -1) start = i;
		} else {
			if (c === CC_LEFT_PARENTHESIS && start !== -1) {
				const name = asciiLowercaseName(
					unescapeIdentifier(text.slice(start, i))
				);
				if (SUBSTITUTION_FUNCTIONS.has(name) || name.includes("--")) {
					return true;
				}
			}
			start = -1;
		}
	}
	return false;
};

/**
 * @param {number} from the first offset to search
 * @returns {number} the next opening parenthesis, or -1
 */
const nextSubstitutionOpening = (from) => {
	// A native search can pass the requested span. Reuse its empty interval
	// across later declarations, including an exhausted suffix of the input.
	if (
		S._substitutionSearchFrom !== -1 &&
		from >= S._substitutionSearchFrom &&
		(S._substitutionSearchOpening === -1 ||
			from <= S._substitutionSearchOpening)
	) {
		return S._substitutionSearchOpening;
	}
	S._substitutionSearchFrom = from;
	return (S._substitutionSearchOpening = S._input.indexOf("(", from));
};

/**
 * {@link containsSubstitutionFunction} over a span of the input, which is cut out only once
 * the span turns out to hold a `(` at all.
 * @param {number} from the span's start offset
 * @param {number} to the span's end offset
 * @returns {boolean} true when a substitution may stand in it
 */
const hasSubstitutionInSpan = (from, to) => {
	// The walk asks for a declaration's span and the printer asks again for the
	// same one, so one entry spares the second scan and the slice under it.
	if (from === S._substitutionSpanFrom && to === S._substitutionSpanTo) {
		return S._substitutionSpanHas;
	}
	let has = false;
	let calls = false;
	// Each `(` is looked behind, as {@link containsSubstitutionFunction} does, and found the
	// same way: a native scan rather than a read per code point, since a value
	// holding no call at all is the common one and is most of the span.
	for (
		let at = nextSubstitutionOpening(from);
		at !== -1 && at < to;
		at = nextSubstitutionOpening(at + 1)
	) {
		calls = true;
		if (substitutionCallAt(S._input, from, at)) {
			has = true;
			break;
		}
	}
	if (!has && calls && rangeHasEscape(from, to)) {
		has = escapedSubstitutionIn(S._input, from, to);
	}
	S._substitutionSpanFrom = from;
	S._substitutionSpanTo = to;
	S._substitutionSpanHas = has;
	return has;
};

// Every node type that is a whole component value on its own. What is left out
// is what only ever stands next to one: a delimiter, a colon, a comma, a CDO.
/** @type {Set<number>} */
const STANDS_ALONE = new Set([
	NodeType.Ident,
	NodeType.Function,
	NodeType.AtKeyword,
	NodeType.Hash,
	NodeType.String,
	NodeType.Url,
	NodeType.Number,
	NodeType.Percentage,
	NodeType.Dimension,
	NodeType.SimpleBlock
]);

/**
 * @param {number} type a node type
 * @returns {boolean} whether it is a whole component value on its own
 */
const standsAlone = (type) => STANDS_ALONE.has(type);

/**
 * Split a declaration value into its top-level components. Whitespace parts
 * them, and so does a `/` delim - it separates `border-radius`'s two boxes and
 * needs no whitespace of its own. A comment is no tree node, so the gap it
 * leaves between two children parts them too: it ends both tokens, and a
 * rewritten value joins its components with a space that has to stand where
 * the comment did.
 * @param {CssPath} path the accessor positioned on the declaration
 * @param {Node} node the declaration whose value's children are read
 * @param {PrintContext} writer the print context (children's printed text)
 * @returns {string[]} the components, with a `/` delim as its own entry
 */
const valueComponents = (path, node, writer) => {
	/** @type {string[]} */
	const components = [];
	let current = "";
	let previousEnd = -1;
	let previousType = -1;
	const count = path.childCount(node);
	for (let at = 0; at < count; at++) {
		const child = path.child(at, node);
		const type = path.type(child);
		const text = writer.get(child);
		const start = startOf(child);
		// Two tokens written against each other are one component only where one
		// cannot stand alone: `1px#000` is a length and a color, not one of each.
		if (
			current.length !== 0 &&
			(start !== previousEnd ||
				(standsAlone(previousType) && standsAlone(type)))
		) {
			components.push(current);
			current = "";
		}
		previousEnd = endOf(child);
		previousType = type;
		if (
			type === NodeType.Whitespace ||
			(type === NodeType.Delim && text === "/")
		) {
			if (current.length !== 0) components.push(current);
			current = "";
			if (type === NodeType.Delim) components.push("/");
			continue;
		}
		current += text;
	}
	if (current.length !== 0) components.push(current);
	return components;
};

/**
 * A custom property's value as written, kept comments included, and with the
 * text a visitor's edit left in place of each token holding one.
 * @param {Node} node the declaration whose tokens are printed
 * @param {PrintContext} writer the print context (holds the kept comments)
 * @param {number} from source offset the tokens start at
 * @param {number} to source offset they end at
 * @returns {string} the printed value
 */
const customPropertySource = (node, writer, from, to) => {
	// Straight from source, so the kept comments in it are already there -
	// claim them, or the writer emits them a second time ahead of the next
	// top-level node.
	writer.takeInserts(from, to);
	const input = S._input;
	const i0 = node;
	const first = S._listStarts[i0];
	const last = first + S._listLengths[i0];
	// §4.3.5: the newline ending a bad string is not its own, so a value ending
	// in one carries it, or the string runs on into what is written after.
	// The printer only asks for a value holding at least one token.
	const end = S._listItems[last - 1];
	const tail =
		nodeTypeOf(end) === NodeType.BadString &&
		!(S._edits.length !== 0 && holdsEdit(end))
			? "\n"
			: "";
	if (S._edits.length === 0 || !holdsEdit(node)) {
		const value = input.slice(from, to);
		return to === input.length ? closeAtEof(value) : value + tail;
	}
	let out = "";
	let at = from;
	for (let k = first; k < last; k++) {
		const child = S._listItems[k];
		if (!holdsEdit(child)) continue;
		out += input.slice(at, startOf(child)) + writer.get(child);
		at = endOf(child);
	}
	out += input.slice(at, to);
	return to === input.length ? closeAtEof(out) : out + tail;
};

/**
 * A custom property's value, token for token: every token is written back as
 * written, and a run of whitespace and dropped comments between two of them is
 * one boundary - the space they need, or nothing where a comma or a block edge
 * is already one, which leaves every `var()` the same token stream.
 * @param {CssPath} path the accessor positioned on the declaration
 * @param {Node} node the declaration, function or block whose tokens are printed
 * @param {PrintContext} writer the print context (holds the kept comments)
 * @param {number} from source offset the tokens start at
 * @param {number} to source offset they end at
 * @param {boolean=} asWritten keep the boundaries as written too, as beautify does
 * @returns {string} the printed value
 */
const customPropertyValue = (path, node, writer, from, to, asWritten) => {
	// A value holding a visitor's edit prints as written, as what holds one does.
	if (asWritten || (S._edits.length !== 0 && holdsEdit(node))) {
		return customPropertySource(node, writer, from, to);
	}
	let out = "";
	let at = from;
	// The boundary held back: whether a whitespace token stood in it, whether a
	// dropped comment did, and whether a comma closed it.
	let spaced = false;
	let dropped = false;
	let comma = false;
	// Whether the token last printed was a `+`/`-` operator (see below).
	let operator = false;
	// Whether it was a substitution, whose `)` is not where its value ends.
	let substituted = false;
	// Read where the child list lies, as `appendChildTexts` does, rather than
	// materialized into an array per value only to be walked once.
	const i0 = node;
	const first = S._listStarts[i0];
	const last = first + S._listLengths[i0];
	for (let k = first; k < last; k++) {
		const child = /** @type {ComponentValue} */ (S._listItems[k]);
		const start = startOf(child);
		// Every other token is a child of its own, so a gap is comments only.
		if (at !== start) {
			const kept = writer.takeInserts(at, start);
			if (kept === "") {
				dropped = true;
			} else {
				if (spaced && out !== "") out += " ";
				out += kept;
				spaced = false;
				dropped = false;
				comma = false;
				operator = false;
			}
		}
		at = endOf(child);
		const type = path.type(child);
		if (type === NodeType.Whitespace) {
			spaced = true;
			continue;
		}
		if (type === NodeType.Comma) {
			out += ",";
			spaced = false;
			dropped = false;
			comma = true;
			operator = false;
			continue;
		}
		const text = customPropertyToken(path, child, writer);
		// WHY: CSS Values 4 §10.1 requires whitespace on both sides of a `+` or `-`
		// in a math function, and this value is a token stream whose consuming
		// context is unknown here - `--tail:(1px) - (2px)` reaches a `calc()` by
		// substitution. So a space beside one of those is the operator's own rather
		// than the delimiter's, and outlives the rule below.
		const operates = type === NodeType.Delim && (text === "+" || text === "-");
		// A comma or a block delimiter is a boundary of its own, so the whitespace
		// beside one says nothing - except before `(`, which an ident in front of
		// makes a function token, and that is what `wouldFuseTokens` answers.
		if (!comma && out !== "") {
			const last = out.charCodeAt(out.length - 1);
			const fuses = dropped && wouldFuseTokens(last, text, out);
			// The value computes to what a `var()` stands for, which may end in a
			// token the next one fuses with, so the space after one stays.
			const parted =
				!operator &&
				!operates &&
				((!substituted &&
					CUSTOM_PROPERTY_CLOSERS.includes(out[out.length - 1])) ||
					CUSTOM_PROPERTY_OPENERS.includes(text[0]));
			// A space there would be that operator's too, so where only a comment
			// parted them, a comment parts them still.
			if (fuses) {
				out += (operator || operates) && !spaced ? "/**/" : separatorAfter(out);
			} else if (spaced && !parted) {
				out += " ";
			}
		}
		out += text;
		spaced = false;
		dropped = false;
		comma = false;
		operator = operates;
		if (type === NodeType.Function) {
			const open = text.indexOf("(");
			substituted = open > 0 && substitutionCallAt(text, 0, open);
		} else {
			substituted = false;
		}
	}
	// A trailing boundary separates the last token from a `)` or the value's end,
	// neither of which it can fuse with; only a kept comment in it still prints.
	if (at !== to) {
		const kept = writer.takeInserts(at, to);
		if (kept !== "") {
			if (spaced && out !== "") out += " ";
			out += kept;
			// A kept comment the input ran out in is closed as its end of input
			// closed it, or the `)` and `}` printed after it would be inside it.
			const opened = kept.lastIndexOf("/*");
			if (
				to === S._input.length &&
				S._blockContentsNodes === null &&
				!kept.includes("*/", opened + 2)
			) {
				out += "*/";
				S._eofPrinted = "*/";
				S._eofOpen = "";
			}
		}
	}
	return out;
};

// An input ending on an escape that escapes nothing: an odd run of backslashes.
const LONE_BACKSLASH_AT_END_REGEXP = /(?:^|[^\\])(?:\\\\)*\\$/;

/** What makes a token worth reading through rather than writing back whole. */
const CUSTOM_PROPERTY_REWRITABLE_RE = /[\t\n\f\r ,]|\/\*/;

// Block delimiters a token cannot fuse across, so whitespace beside one goes.
// `(` is not among the openers: an ident in front of it makes a function token.
const CUSTOM_PROPERTY_CLOSERS = ")]}";
const CUSTOM_PROPERTY_OPENERS = "[{";

/**
 * One token of a custom property's value, as written - recursing into a
 * function or block so the boundaries nested in one print as they do at the top
 * level. A source holding neither whitespace, a comma nor a comment holds none
 * at any depth, so it is written back whole. The one token not written as it
 * stands is a url or a string the input ran out of inside, which the engine
 * closes there and so does this.
 * @param {CssPath} path the accessor positioned on the declaration
 * @param {ComponentValue} child the token to print
 * @param {PrintContext} writer the print context (holds the kept comments)
 * @returns {string} the printed token
 */
const customPropertyToken = (path, child, writer) => {
	// Rewriting: the token already printed minified, its own nesting included.
	if (S._rewriteCustomProperties) return writer.get(child);
	const source = printedSource(child);
	const type = path.type(child);
	// The newline that made the string bad ends it, so it is carried.
	if (type === NodeType.BadString) return `${source}\n`;
	// WHY: Chromium keeps a value the input ran out inside as written, open, but
	// in a stylesheet the rule's `}` is printed after it, lands inside what is
	// open and loses the whole declaration - so there it is closed. A `style=""`
	// list prints nothing after it, and there it stays as the engine keeps it.
	const closes =
		S._blockContentsNodes === null && endOf(child) === S._input.length;
	if (
		(type !== NodeType.Function && type !== NodeType.SimpleBlock) ||
		!CUSTOM_PROPERTY_REWRITABLE_RE.test(source)
	) {
		if (!closes) return source;
		S._eofPrinted = closeAtEof(source);
		// An escape the input ran out in is a token the engine rewrites, and writes
		// back closed; anything else it keeps as written, open.
		S._eofOpen = LONE_BACKSLASH_AT_END_REGEXP.test(S._input)
			? S._eofPrinted
			: source;
		return S._eofPrinted;
	}
	const start = startOf(child);
	const end = endOf(child);
	let opened = nameEndOf(child) + 1;
	let closer = ")";
	if (type === NodeType.SimpleBlock) {
		const block = blockTokenOf(child);
		opened = start + 1;
		closer = block === "[" ? "]" : block === "{" ? "}" : ")";
	}
	// Closed at EOF, the source has no closer to strip, and one is written only
	// for the reason above. Read off the children, since a string running to EOF
	// can end on the closer's character (`f(")`) without closing anything.
	const i0 = child;
	const count = S._listLengths[i0];
	const lastEnd =
		count === 0 ? opened : endOf(S._listItems[S._listStarts[i0] + count - 1]);
	// Only what follows the last child, less whitespace and closed comments: a
	// comment the input ran out in can end on the closer's character too.
	const closed =
		lastEnd < end &&
		S._input
			.slice(lastEnd, end)
			.replace(/\/\*[\s\S]*?\*\//g, "")
			.trim() === closer;
	const inner = customPropertyValue(
		path,
		child,
		writer,
		opened,
		closed ? end - 1 : end
	);
	const text = `${S._input.slice(start, opened)}${inner}${
		closed || closes ? closer : ""
	}`;
	if (closes) {
		// What it prints left open: its own closer, and what its last token closed.
		const last = S._eofPrinted;
		const innerOpen =
			last !== "" && inner.endsWith(last)
				? inner.slice(0, inner.length - last.length) + S._eofOpen
				: inner;
		S._eofPrinted = text;
		// The engine writes back closed what an escape the input ran out in ends.
		S._eofOpen = LONE_BACKSLASH_AT_END_REGEXP.test(S._input)
			? text
			: `${S._input.slice(start, opened)}${innerOpen}${closed ? closer : ""}`;
	}
	return text;
};

/**
 * Whether two box components fill their slot alike, read as they will print
 * rather than as they were written: a zero length loses its unit later, so
 * `0em` and `0rem` are one value.
 * @param {string} a one box component
 * @param {string} b another box component
 * @returns {boolean} true when the two print the same
 */
const sameBoxValue = (a, b) =>
	a === b || dropZeroLengthUnit(a) === dropZeroLengthUnit(b);

/**
 * Drop the box values CSS's `{1,4}` notation already implies: an omitted value
 * is copied from the opposite side, so a 4th equal to the 2nd, a 3rd equal to
 * the 1st and a 2nd equal to the 1st are each redundant.
 * @param {string[]} values one box's components
 * @returns {string[] | null} the kept values, or `null` when the box cannot be collapsed
 */
const collapseBox = (values) => {
	const n = values.length;
	if (n === 0 || n > 4) return null;
	for (const value of values) {
		if (containsSubstitutionFunction(value)) return null;
		if (n > 1 && CSS_WIDE_KEYWORDS.has(toLowerCaseIfNeeded(value))) {
			return null;
		}
	}
	let end = n;
	if (end === 4 && sameBoxValue(values[3], values[1])) end = 3;
	if (end === 3 && sameBoxValue(values[2], values[0])) end = 2;
	if (end === 2 && sameBoxValue(values[1], values[0])) end = 1;
	return values.slice(0, end);
};

// What a box family's longhands take that is a word, where the family states
// it; a family absent here (`corner-shape`) is all words and is not judged.
/** @type {Map<string, Set<string>>} */
const BOX_SLOT_WORDS = new Map([
	["inset", new Set(["auto"])],
	["margin", new Set(["auto"])],
	["padding", new Set()],
	["scroll-margin", new Set()],
	["scroll-padding", new Set(["auto"])],
	["border-radius", new Set()],
	["border-width", new Set(FAMILY_SLOT_KEYWORDS.get("border-top-width"))],
	["border-style", new Set(FAMILY_SLOT_KEYWORDS.get("border-top-style"))],
	["border-color", COLOR_KEYWORDS]
]);

// A component that is a word: neither a number, a hash nor a string.
const WORD_COMPONENT_RE = /^-?(?:[a-z_\\]|[^\0-\u007F])/i;

/**
 * Whether one of a box family's values is a word none of its longhands reads,
 * so the engine drops that one declaration and keeps the others, where it would
 * drop the one shorthand saying all four whole.
 * @param {string} shorthand the box shorthand
 * @param {string[]} values a value per longhand, as printed
 * @returns {boolean} true when one of them is such a word
 */
const boxSlotsUnreadable = (shorthand, values) => {
	const words = BOX_SLOT_WORDS.get(shorthand);
	if (words === undefined) return false;
	for (const value of values) {
		const open = value.indexOf("(");
		if (open !== -1) {
			// A call: math, an anchor or, for a color, a color function.
			const name = toLowerCaseIfNeeded(value.slice(0, open));
			if (
				!MATH_FUNCTIONS.has(name) &&
				!BOX_SLOT_FUNCTIONS.has(name) &&
				!(words === COLOR_KEYWORDS && COLOR_FUNCTIONS.has(name))
			) {
				return true;
			}
		} else if (
			WORD_COMPONENT_RE.test(value) &&
			!words.has(toLowerCaseIfNeeded(value))
		) {
			return true;
		}
	}
	return false;
};

// The calls besides math a box longhand reads, those of anchor positioning.
const BOX_SLOT_FUNCTIONS = new Set(["anchor", "anchor-size"]);

/**
 * Whether a shorthand's slots mix a bare non-zero number with a length or a
 * percentage. No box slot reads both, so one of them was never read at all.
 * @param {string[]} values one shorthand's slot values
 * @returns {boolean} true when the two kinds stand together
 */
const mixesBareNumberWithLength = (values) => {
	let bareNumber = false;
	let measured = false;
	for (const value of values) {
		const kind = componentKind(value);
		if (kind === COMPONENT_NUMBER) bareNumber = true;
		else if (kind !== COMPONENT_OTHER) measured = true;
	}
	return bareNumber && measured;
};

// What a shorthand component is, coarsely: a fold is safe only between two of a
// kind, a slot taking one taking the other. `0` is a length wherever a dimension
// is, and a bare non-zero number is neither - `padding:.25` is invalid.
const COMPONENT_OTHER = 0;
const COMPONENT_LENGTH = 1;
const COMPONENT_PERCENTAGE = 2;
const COMPONENT_NUMBER = 3;

/**
 * @param {string} component one printed component of a shorthand's value
 * @returns {number} one of the `_COMPONENT_*` kinds
 */
const componentKind = (component) => {
	if (!NUMERIC_COMPONENT_RE.test(component)) return COMPONENT_OTHER;
	const last = component.charCodeAt(component.length - 1);
	if (last === CC_PERCENTAGE) return COMPONENT_PERCENTAGE;
	// A unit is what makes a non-zero number a length, and a digit is no unit -
	// `.25` is a bare number, which no box slot taking a length accepts.
	if (!isDigit(last)) return COMPONENT_LENGTH;
	return ZERO_NUMBER_RE.test(component) ? COMPONENT_LENGTH : COMPONENT_NUMBER;
};

// A number with an optional sign and fraction, then a unit or `%` or nothing.
const NUMERIC_COMPONENT_RE = /^[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:%|[a-z]+)?$/i;
// The same, written zero - every spelling of it, so `0.0` is a length too.
const ZERO_NUMBER_RE = /^[-+]?0*(?:\.0*)?$/;

/**
 * One box or pair shorthand's value read back as the slots it fills - `1px 2px`
 * as all four sides, so a longhand can take one of them over.
 * @param {string} value the shorthand's printed value
 * @param {number} slots how many the shorthand holds (4 for a box, 2 for a pair)
 * @returns {string[] | null} the filled slots, or null when it fills none of them
 */
const expandBox = (value, slots) => {
	const written = splitPrintedComponents(value);
	if (written.length === 0 || written.length > slots) return null;
	const out = [...written];
	// The `{1,4}` rule: an omitted slot takes the one two back, and the second
	// takes the first.
	for (let i = written.length; i < slots; i++) out.push(out[i < 2 ? 0 : i - 2]);
	return out;
};

/**
 * Fold a longhand into the shorthand of its own family standing directly before
 * it, where the merged spelling is shorter than the two declarations. Adjacent
 * only: anything between them is read between them, so folding would move what
 * it wrote past it.
 * @param {CssPath} path the accessor
 * @param {Node[]} items the block's children
 * @param {string[]} texts their printed text, rewritten in place
 * @param {Set<number>} superseded the indices already dropped, added to here
 * @param {PrintContext} writer the print context holding what each item printed
 * @returns {void}
 */
const foldFollowingLonghands = (path, items, texts, superseded, writer) => {
	let shorthand = -1;
	/** @type {Set<string> | null} */
	let written = null;
	/**
	 * Whether a declaration is a legacy alias the prefix pass drops below, its
	 * property written: it prints nothing, so nothing stands where it stood.
	 * @param {number} at the declaration's index
	 * @returns {boolean} true when it goes
	 */
	const dropsWithPrefix = (at) => {
		if (!S._prefixingOn || texts[at].charCodeAt(0) !== CC_HYPHEN_MINUS) {
			return false;
		}
		const property = printedProperty(texts[at], texts[at].indexOf(":"));
		const base = prefixedPropertyName(property);
		if (base === undefined) return false;
		if (written === null) {
			written = new Set();
			for (const text of texts) {
				if (text.length !== 0) {
					written.add(printedProperty(text, text.indexOf(":")));
				}
			}
		}
		return written.has(base) && prefixedPropertyRemovable(base, property);
	};
	// Each declaration's property, read once: the walk back from every longhand
	// asks again of the ones before it, and a fold keeps the property it rewrites.
	/** @type {(string | undefined)[]} */
	const properties = [];
	// The number `declarationTable` gives each, or -1 for one it does not name.
	/** @type {number[]} */
	const ids = [];
	const table = declarationTable();
	/**
	 * The property a declaration sets, read through `canonicalProperty`.
	 * @param {number} at the declaration's index
	 * @returns {string} its property
	 */
	const propertyAt = (at) => {
		let property = properties[at];
		if (property === undefined) {
			const own = ownSpellingId(items[at], texts[at], writer);
			const printed =
				own >= 0
					? table.names[own]
					: printedProperty(texts[at], texts[at].indexOf(":"));
			const id = own >= 0 ? own : table.ids.get(printed);
			if (id === undefined) {
				property = printed;
				ids[at] = -1;
			} else {
				ids[at] = table.canonical[id];
				property = table.names[ids[at]];
			}
			properties[at] = property;
		}
		return property;
	};
	/**
	 * Whether two declarations must keep their order, as `orderMatters` reads it.
	 * @param {number} a a declaration's index, its property already read
	 * @param {number} b another's
	 * @returns {boolean} true when the two must keep their order
	 */
	const orderMattersAt = (a, b) => {
		const property = propertyAt(b);
		return ids[a] !== -1 && ids[b] !== -1
			? orderMattersById(table, ids[a], ids[b])
			: orderMatters(/** @type {string} */ (properties[a]), property);
	};
	for (let i = 0; i < items.length; i++) {
		// A dropped declaration prints nothing, so nothing stands where it stood.
		if (texts[i].length === 0 || superseded.has(i)) continue;
		if (path.type(items[i]) !== NodeType.Declaration) {
			shorthand = -1;
			continue;
		}
		if (dropsWithPrefix(i)) continue;
		if (
			shorthand !== -1 &&
			foldIntoEarlier(
				path,
				items,
				texts,
				superseded,
				i,
				dropsWithPrefix,
				propertyAt,
				orderMattersAt
			)
		) {
			superseded.add(i);
			continue;
		}
		shorthand = i;
	}
};

// Every property some shorthand sets, so a declaration that is none returns
// before walking back for one.
/** @type {Set<string> | null} */
let anyLonghand = null;

/**
 * Fold a longhand into the nearest earlier declaration of its family that takes
 * it, past declarations neither can interact with, so moving its write up past
 * them changes nothing they set.
 * @param {CssPath} path the accessor
 * @param {Node[]} items the block's children
 * @param {string[]} texts their printed text, rewritten in place
 * @param {Set<number>} superseded the indices already dropped
 * @param {number} from the longhand's index
 * @param {(at: number) => boolean} drops whether a declaration is dropped later
 * @param {(at: number) => string} propertyAt the property a declaration sets, read through `canonicalProperty`
 * @param {(a: number, b: number) => boolean} orderMattersAt `orderMatters` of two declarations' properties, the first already read
 * @returns {boolean} true when it was folded into one before it
 */
const foldIntoEarlier = (
	path,
	items,
	texts,
	superseded,
	from,
	drops,
	propertyAt,
	orderMattersAt
) => {
	if (anyLonghand === null) {
		anyLonghand = new Set();
		for (const longhands of getShorthandLonghands().values()) {
			for (const longhand of longhands) anyLonghand.add(longhand);
		}
	}
	const property = propertyAt(from);
	const bare =
		property.charCodeAt(0) === CC_HYPHEN_MINUS
			? property.replace(VENDOR_ITEM_PREFIX_RE, "")
			: property;
	if (!anyLonghand.has(bare)) {
		return false;
	}
	for (let at = from - 1; at >= 0; at--) {
		if (texts[at].length === 0 || superseded.has(at)) continue;
		if (path.type(items[at]) !== NodeType.Declaration) return false;
		if (drops(at)) continue;
		if (orderMattersAt(from, at)) {
			return foldInto(path, items, texts, at, from);
		}
	}
	return false;
};

/**
 * @param {CssPath} path the accessor
 * @param {Node[]} items the block's children
 * @param {string[]} texts their printed text, rewritten in place
 * @param {number} at the shorthand's index
 * @param {number} from the longhand's index
 * @returns {boolean} true when the two were folded into one
 */
const foldInto = (path, items, texts, at, from) => {
	if (isImportant(items[at]) !== isImportant(items[from])) return false;
	const shorthandText = texts[at];
	const longhandText = texts[from];
	// Both are printed declarations, `name:` first, the name never empty.
	const shorthandColon = shorthandText.indexOf(":");
	const longhandColon = longhandText.indexOf(":");
	const property = printedProperty(shorthandText, shorthandColon);
	const lines = GRID_PLACEMENT_SLOTS.get(property);
	if (lines !== undefined) {
		const folded = foldGridLine(
			lines,
			printedValue(shorthandText, shorthandColon),
			printedProperty(longhandText, longhandColon),
			printedValue(longhandText, longhandColon)
		);
		if (folded === null) return false;
		const important = isImportant(items[at]) ? IMPORTANT : "";
		const text = `${property}:${folded}${important};`;
		if (text.length >= shorthandText.length + longhandText.length) return false;
		texts[at] = text;
		return true;
	}
	if (
		property === "font" &&
		printedProperty(longhandText, longhandColon) === "line-height"
	) {
		// As written: a family name keeps its case, which engines report back.
		const folded = foldFontLineHeight(
			shorthandText.slice(
				shorthandColon + 1,
				printedValueEnd(shorthandText, shorthandColon)
			),
			printedValue(longhandText, longhandColon)
		);
		if (folded === null) return false;
		const important = isImportant(items[at]) ? IMPORTANT : "";
		texts[at] = `font:${folded}${important};`;
		return true;
	}
	const sides = BOX_LONGHANDS.get(property) || PAIR_LONGHANDS.get(property);
	if (sides === undefined) {
		// As written: a value's names keep their case, so it is not lowercased.
		const folded = foldIntoSlots(
			property,
			shorthandText.slice(
				shorthandColon + 1,
				printedValueEnd(shorthandText, shorthandColon)
			),
			printedProperty(longhandText, longhandColon),
			longhandText.slice(
				longhandColon + 1,
				printedValueEnd(longhandText, longhandColon)
			)
		);
		if (folded === null) return false;
		// Never longer: each slot's value is written once, its name no more.
		const important = isImportant(items[at]) ? IMPORTANT : "";
		texts[at] = `${property}:${folded}${important};`;
		return true;
	}
	const slot = sides.indexOf(printedProperty(longhandText, longhandColon));
	if (slot === -1) return false;
	const shorthandValue = printedValue(shorthandText, shorthandColon);
	const longhandValue = printedValue(longhandText, longhandColon);
	// A substitution may stand for any number of slots, and a comma list is no
	// box at all - neither reads back as the slots this fills.
	if (
		containsSubstitutionFunction(shorthandValue) ||
		containsSubstitutionFunction(longhandValue)
	) {
		return false;
	}
	if (valueItems(shorthandValue).length !== 1) return false;
	if (splitPrintedComponents(longhandValue).length !== 1) return false;
	// Validity is per property, and a component the property rejects invalidates
	// the whole shorthand, losing the slots that were fine. So the two fold only
	// within one narrow numeric class, which every box slot of the family takes.
	const kind = componentKind(longhandValue);
	if (kind === COMPONENT_OTHER) {
		if (!keywordPairFolds(property, sides, shorthandValue, longhandValue)) {
			return false;
		}
	} else {
		for (const component of splitPrintedComponents(shorthandValue)) {
			if (componentKind(component) !== kind) return false;
		}
	}
	const filled = expandBox(shorthandValue, sides.length);
	if (filled === null) return false;
	filled[slot] = longhandValue;
	// Two or four slots, none a substitution or a CSS-wide keyword - a keyword
	// passed above is one the target's value table lists, which names none.
	const collapsed = /** @type {string[]} */ (collapseBox(filled));
	if (
		collapsed.length !== 1 &&
		ONE_VALUE_PAIR_SHORTHANDS.has(property) &&
		!S._overflowTwoValuesAllowed
	) {
		return false;
	}
	if (
		collapsed.length !== 1 &&
		PLACE_SHORTHANDS.has(property) &&
		!S._placeShorthandAllowed
	) {
		return false;
	}
	const important = isImportant(items[at]) ? IMPORTANT : "";
	const folded = `${property}:${joinSlots(collapsed)}${important};`;
	if (folded.length >= shorthandText.length + longhandText.length) return false;
	texts[at] = folded;
	return true;
};

/**
 * Whether an `overflow` and a longhand of it fold as keywords: each must be one
 * every target reads on both axes, since one it drops voids the whole shorthand.
 * @param {string} property the shorthand's printed property name
 * @param {string[]} sides the shorthand's longhands
 * @param {string} shorthandValue the shorthand's printed value
 * @param {string} longhandValue the longhand's printed value
 * @returns {boolean} true when the two fold
 */
const keywordPairFolds = (property, sides, shorthandValue, longhandValue) => {
	// No selection names no browser to answer for, so no keyword is known read.
	if (S._prefixBrowsers === null || !ONE_VALUE_PAIR_SHORTHANDS.has(property)) {
		return false;
	}
	for (const one of [
		...splitPrintedComponents(shorthandValue),
		longhandValue
	]) {
		const keyword = toLowerCaseIfNeeded(one);
		for (const side of sides) {
			const since = valueSupportedFrom(`${side} ${keyword}`);
			if (since === undefined || !readsAll(since)) return false;
		}
	}
	return true;
};

const FONT_SIZE_KEYWORDS = new Set([
	"xx-small",
	"x-small",
	"small",
	"medium",
	"large",
	"x-large",
	"xx-large",
	"xxx-large",
	"smaller",
	"larger",
	"math"
]);

/**
 * Whether a `font` component is a `<font-size>` written as a number: a
 * non-negative length or percentage, or a lone zero (a weight is a bare number).
 * @param {string} value one printed component, its line height cut off
 * @returns {boolean} true when it is one
 */
const isFontSize = (value) => {
	const numeric = NUMERIC_RE.exec(value);
	if (numeric === null || value.charCodeAt(0) === CC_HYPHEN_MINUS) return false;
	const unit = numeric[1];
	if (unit === "") return ZERO_NUMBER_RE.test(value);
	return unit === "%" || LENGTH_UNIT_RE.test(unit);
};

/**
 * Whether a value is one the `font` shorthand's line height slot takes:
 * `normal`, or a non-negative number, percentage or length.
 * @param {string} value the `line-height` value as printed
 * @returns {boolean} true when the slot takes it
 */
const isFontLineHeight = (value) => {
	if (value.toLowerCase() === "normal") return true;
	const numeric = NUMERIC_RE.exec(value);
	if (numeric === null || value.charCodeAt(0) === CC_HYPHEN_MINUS) return false;
	const unit = numeric[1];
	return unit === "" || unit === "%" || LENGTH_UNIT_RE.test(unit);
};

/**
 * A `font` value with a later `line-height` written into its `/` slot, which
 * reads the same: the shorthand resets the line height the longhand then sets.
 * @param {string} font the `font` value as printed
 * @param {string} lineHeight the `line-height` value as printed
 * @returns {string | null} the folded value, or null where it cannot be folded
 */
const foldFontLineHeight = (font, lineHeight) => {
	if (
		containsSubstitutionFunction(font) ||
		containsSubstitutionFunction(lineHeight)
	) {
		return null;
	}
	if (!isFontLineHeight(lineHeight)) return null;
	const components = splitTopLevelSpaces(font);
	for (let i = 0; i < components.length - 1; i++) {
		const component = components[i];
		const slash = component.indexOf("/");
		const size = slash === -1 ? component : component.slice(0, slash);
		if (isFontSize(size) || FONT_SIZE_KEYWORDS.has(size.toLowerCase())) {
			// A family that is a CSS-wide keyword voids the `font` already, which
			// leaves the longhand the only line height that applies.
			for (const family of components
				.slice(i + 1)
				.join(" ")
				.split(",")) {
				const name = family.trim().toLowerCase();
				if (CSS_WIDE_KEYWORDS.has(name) || name === "default") return null;
			}
			// `normal` is the line height the shorthand already sets.
			components[i] =
				lineHeight.toLowerCase() === "normal" ? size : `${size}/${lineHeight}`;
			return joinSlots(components);
		}
	}
	return null;
};

// A `<time>`, which a `transition` or an `animation` reads as its duration
// first and its delay second.
const TIME_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?(?:s|ms)$/i;
const ZERO_TIME_RE = /^[+-]?(?:0+\.?0*|\.0+)(?:s|ms)$/i;
// An easing function a layer may hold, the keywords aside.
const EASING_CALL_RE = /^(?:cubic-bezier|steps|linear)\(/i;

/**
 * A longhand's value written into the shorthand of its own family standing
 * before it, or null where the shorthand's slots cannot be read apart.
 * @param {string} property the shorthand's printed property name
 * @param {string} shorthandValue its printed value
 * @param {string} longhand the longhand's printed property name
 * @param {string} longhandValue its printed value
 * @returns {string | null} the shorthand's new value, or null
 */
const foldIntoSlots = (property, shorthandValue, longhand, longhandValue) => {
	// A vendor spelling folds only into the shorthand of the same vendor.
	const prefix = /^-[a-z]+-/.exec(property);
	const base = prefix === null ? property : property.slice(prefix[0].length);
	if (prefix !== null && !longhand.startsWith(prefix[0])) return null;
	const slot = prefix === null ? longhand : longhand.slice(prefix[0].length);
	// A substitution may stand for any slot, and a comma list is more than one layer.
	if (
		containsSubstitutionFunction(shorthandValue) ||
		containsSubstitutionFunction(longhandValue)
	) {
		return null;
	}
	const layers = valueItems(shorthandValue);
	const values = valueItems(longhandValue);
	if (layers.length !== 1 || values.length !== 1) {
		// One value per layer folds into each. A shorter list the engine repeats
		// computes as written, so folding it would change what a script reads.
		if (
			(base !== "transition" && base !== "animation") ||
			values.length !== layers.length
		) {
			return null;
		}
		/** @type {string[]} */
		const out = [];
		for (let i = 0; i < layers.length; i++) {
			const layer = foldIntoSlots(property, layers[i], longhand, values[i]);
			if (layer === null) return null;
			out.push(layer);
		}
		return out.join(",");
	}
	const components = splitPrintedComponents(shorthandValue);
	const value = splitPrintedComponents(longhandValue);
	if (value.length !== 1 || components.length === 0) return null;
	for (const one of [...components, value[0]]) {
		if (CSS_WIDE_KEYWORDS.has(toLowerCaseIfNeeded(one))) return null;
	}
	if (base === "flex") {
		// IE10's `-ms-flex` reads omitted factors the 2012 draft's way.
		if (prefix !== null && prefix[0] === "-ms-") return null;
		const factors = flexFactors(components);
		const at = ["flex-grow", "flex-shrink", "flex-basis"].indexOf(slot);
		if (factors === null || at === -1) return null;
		if (BARE_NUMBER_RE.test(value[0]) !== (at !== 2)) return null;
		factors[at] = value[0];
		return joinSlots(shortestAuthoredFlex(factors) || factors);
	}
	if (base === "transition") {
		return foldTransitionSlot(components, slot, value[0]);
	}
	if (base === "animation") {
		return foldAnimationSlot(components, slot, value[0]);
	}
	const longhands = FAMILY_LONGHANDS.get(base);
	// `text-wrap` was one keyword before it had longhands, and an engine reading
	// it so drops the whole of a value with two.
	if (
		longhands === undefined ||
		base === "text-wrap" ||
		!shorthandSlotsReadable(base)
	) {
		return null;
	}
	const filled = familySlots(longhands, components);
	const taken = familySlots(longhands, value);
	if (filled === null || taken === null || !taken.has(slot)) return null;
	filled.set(slot, value[0]);
	const order = longhands.filter((name) => filled.has(name));
	return familyValue(
		base,
		order,
		order.map((name) => /** @type {string} */ (filled.get(name)))
	);
};

/**
 * A `transition` longhand written into a one-layer `transition`, its slots
 * then written in the order the printer writes an authored one.
 * @param {string[]} components the layer's components
 * @param {string} slot the longhand's unprefixed name
 * @param {string} value its one component
 * @returns {string | null} the layer's new value, or null
 */
const foldTransitionSlot = (components, slot, value) => {
	/** @type {string[]} */
	const names = [];
	/** @type {string[]} */
	const times = [];
	/** @type {string[]} */
	const easings = [];
	/** @type {string[]} */
	const behaviors = [];
	for (const one of components) {
		const lower = toLowerCaseIfNeeded(one);
		if (TIME_RE.test(one)) {
			times.push(one);
		} else if (EASING_KEYWORDS.has(lower) || EASING_CALL_RE.test(one)) {
			easings.push(one);
		} else if (TRANSITION_BEHAVIORS.has(lower)) {
			behaviors.push(one);
		} else {
			names.push(one);
		}
	}
	// An easing keyword is a property name too, so which slot it fills is the
	// engine's to say where no other name stands beside it.
	if (names.length > 1 || times.length > 2 || easings.length > 1) return null;
	if (behaviors.length > 1) return null;
	const lower = toLowerCaseIfNeeded(value);
	if (slot === "transition-duration" || slot === "transition-delay") {
		if (!TIME_RE.test(value)) return null;
		if (slot === "transition-duration") {
			times[0] = value;
		} else {
			// A delay is the second time, so the first has to be written.
			if (times.length === 0) return null;
			times[1] = value;
		}
	} else if (slot === "transition-timing-function") {
		if (!EASING_KEYWORDS.has(lower) && !EASING_CALL_RE.test(value)) {
			return null;
		}
		easings[0] = value;
	} else if (slot === "transition-behavior") {
		if (!TRANSITION_BEHAVIORS.has(lower)) return null;
		behaviors[0] = value;
	} else if (slot === "transition-property") {
		// A name that is a keyword of another slot reads as that slot.
		if (
			TIME_RE.test(value) ||
			EASING_KEYWORDS.has(lower) ||
			TRANSITION_BEHAVIORS.has(lower) ||
			lower === "none"
		) {
			return null;
		}
		names[0] = value;
	} else {
		return null;
	}
	// What a slot holding its own initial says, it says unwritten too.
	if (times.length === 2 && ZERO_TIME_RE.test(times[1])) times.pop();
	if (times.length === 1 && ZERO_TIME_RE.test(times[0])) times.pop();
	if (easings.length === 1 && asciiCaseInsensitiveMatch(easings[0], "ease")) {
		easings.pop();
	}
	if (
		behaviors.length === 1 &&
		asciiCaseInsensitiveMatch(behaviors[0], "normal")
	) {
		behaviors.pop();
	}
	const rest = [...times, ...easings, ...behaviors];
	const named =
		names.length === 1 &&
		asciiCaseInsensitiveMatch(names[0], "all") &&
		rest.length > 0
			? []
			: names;
	const out = [...named, ...rest];
	return out.length === 0 ? "all" : joinSlots(out);
};

/**
 * An `animation` longhand written into a one-layer `animation` whose every
 * component reads as one slot alone. The new component goes last, where an
 * empty slot takes it; one already filled is replaced where it stands.
 * @param {string[]} components the layer's components
 * @param {string} slot the longhand's unprefixed name
 * @param {string} value its one component
 * @returns {string | null} the layer's new value, or null
 */
const foldAnimationSlot = (components, slot, value) => {
	const lower = toLowerCaseIfNeeded(value);
	/** @type {(one: string, lowered: string) => boolean} */
	let fills;
	if (slot === "animation-duration" || slot === "animation-delay") {
		if (!TIME_RE.test(value)) return null;
		fills = (one) => TIME_RE.test(one);
	} else if (slot === "animation-iteration-count") {
		if (lower !== "infinite" && !BARE_NUMBER_RE.test(value)) return null;
		fills = (one, lowered) =>
			lowered === "infinite" || BARE_NUMBER_RE.test(one);
	} else {
		const keywords = ANIMATION_KEYWORD_SLOTS.get(slot);
		if (keywords === undefined) return null;
		// The easing slot also takes a call, which no other slot does.
		const calls = slot === "animation-timing-function";
		if (!keywords.includes(lower) && !(calls && EASING_CALL_RE.test(value))) {
			return null;
		}
		fills = (one, lowered) =>
			keywords.includes(lowered) || (calls && EASING_CALL_RE.test(one));
	}
	// `none` and `normal` are each a name and a keyword slot's too, so a layer
	// holding one is read by its order, which a fold cannot keep.
	/** @type {string[]} */
	const out = [];
	/** @type {number[]} */
	const at = [];
	for (const one of components) {
		const lowered = toLowerCaseIfNeeded(one);
		if (lowered === "none" || lowered === "normal") return null;
		if (fills(one, lowered)) at.push(out.length);
		out.push(one);
	}
	if (lower === "none" || lower === "normal") return null;
	// A slot's own initial is written as no value at all, which is how the
	// printer spells the shorthand holding it - the fold has to agree.
	const initial =
		slot === "animation-delay" || slot === "animation-duration"
			? ZERO_TIME_RE.test(value)
			: slot === "animation-iteration-count"
				? ONE_COUNT_RE.test(value)
				: lower === "ease" || lower === "running";
	if (slot === "animation-delay") {
		// A delay is the second time; with no duration the first would be it.
		if (at.length === 0) return null;
		if (at.length === 2) {
			if (initial) out.splice(at[1], 1);
			else out[at[1]] = value;
		} else if (!initial) {
			out.push(value);
		}
	} else if (slot === "animation-duration") {
		// Dropped only with no delay after it, which would read as the duration.
		if (initial && at.length < 2) {
			if (at.length === 1) out.splice(at[0], 1);
		} else if (at.length === 0) {
			out.push(value);
		} else {
			out[at[0]] = value;
		}
	} else if (at.length > 1) {
		return null;
	} else if (initial) {
		if (at.length === 1) out.splice(at[0], 1);
	} else if (at.length === 0) {
		out.push(value);
	} else {
		out[at[0]] = value;
	}
	if (out.length === 0) return null;
	return joinSlots(out);
};

// An iteration count of one, which an animation runs with anyway.
const ONE_COUNT_RE = /^\+?1(?:\.0*)?$/;

// A number with no unit and no percent, which `flex` reads as a factor.
const BARE_NUMBER_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
// A basis `flex` reads alone as one: a dimension, or a sizing keyword.
const FLEX_BASIS_RE =
	/^(?:[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?(?:%|[a-z]+)|content|min-content|max-content|fit-content)$/i;

/**
 * The shortest spelling of a three-factor `flex` value, or `null` when it is
 * already the shortest. Shared with the merge, which arrives at the same three
 * factors from the longhands rather than from an authored shorthand.
 * @param {string[]} components the value's components, in grammar order
 * @returns {string[] | null} the fragments to join, or `null` to keep them as they are
 */
const shortestFlexValue = (components) => {
	if (components.length !== 3) return null;
	const keyword = FLEX_KEYWORDS.get(components.join(" ").toLowerCase());
	if (keyword !== undefined) return [keyword];
	if (S._tridentTarget) return null;
	// CSS Flexbox 1 §7.1.1 reads an omitted basis as `0%`, so one spelt that way
	// says nothing - and an omitted shrink as `1`, so that says nothing either.
	if (components[2] === "0%") {
		return components[1] === "1"
			? [components[0]]
			: [components[0], components[1]];
	}
	// `<'flex-shrink'>` follows the grow factor and defaults to 1, so a `1` there
	// says nothing - over a basis not readable as a factor itself, §7.1.1 reading
	// a unitless zero after fewer than two factors as one, so `1 1 0` is not `1 0`.
	return components[1] === "1" && !BARE_NUMBER_RE.test(components[2])
		? [components[0], components[2]]
		: null;
};

/**
 * An authored `flex` value of one to three components read into its three
 * factors in grammar order (CSS Flexbox 1 §7.1.1): a bare number is a factor
 * unless two precede it, an omitted shrink is `1` and basis `0%`, and a keyword
 * the factors it names.
 * @param {string[]} components the value's components, as written
 * @returns {string[] | null} grow, shrink and basis, or null where it is no such value
 */
const flexFactors = (components) => {
	if (components.length === 1) {
		const lower = toLowerCaseIfNeeded(components[0]);
		for (const [factors, keyword] of FLEX_KEYWORDS) {
			if (keyword === lower) return factors.split(" ");
		}
	}
	/** @type {string[]} */
	const factors = [];
	/** @type {string | null} */
	let basis = null;
	for (const component of components) {
		if (BARE_NUMBER_RE.test(component) && factors.length < 2) {
			// The two factors are adjacent: a basis between them parts no pair.
			if (factors.length === 1 && basis !== null && components[0] !== basis) {
				return null;
			}
			factors.push(component);
		} else {
			if (basis !== null) return null;
			basis = component;
		}
	}
	if (factors.length === 0) return null;
	return [
		factors[0],
		factors.length === 2 ? factors[1] : "1",
		basis === null ? "0%" : basis
	];
};

/**
 * The shortest spelling of an authored `flex` value in whatever order and count
 * its grammar allows, or `null` when what was written is already that short.
 * @param {string[]} components the value's components, as written
 * @returns {string[] | null} the fragments to join, or `null` to keep them as they are
 */
const shortestAuthoredFlex = (components) => {
	const factors = flexFactors(components);
	if (factors === null) return null;
	let shortest = shortestFlexValue(factors) || factors;
	// §7.1.1 reads a lone basis as `1 1 <basis>`, where only a dimension or a
	// sizing keyword is one: a number or a math function could read as a factor.
	if (
		!S._tridentTarget &&
		factors[0] === "1" &&
		factors[1] === "1" &&
		FLEX_BASIS_RE.test(factors[2]) &&
		factors[2].length < shortest.join(" ").length
	) {
		shortest = [factors[2]];
	}
	return shortest.join(" ").length < components.join(" ").length
		? shortest
		: null;
};

/**
 * Split on the whitespace at the top of one value, a nested call's own spaces,
 * and a string's or an escape's, staying inside it.
 * @param {string} text one comma-separated piece of a call's body
 * @returns {string[]} its components
 */
const splitTopLevelSpaces = (text) => {
	/** @type {string[]} */
	const parts = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		if (
			code === CC_QUOTATION_MARK ||
			code === CC_APOSTROPHE ||
			code === CC_REVERSE_SOLIDUS
		) {
			i = quotedTextEnd(text, i);
		} else if (code === CC_LEFT_PARENTHESIS) {
			depth++;
		} else if (code === CC_RIGHT_PARENTHESIS) {
			depth--;
		} else if (depth === 0 && isAsciiWhitespace(code)) {
			if (i > start) parts.push(text.slice(start, i));
			start = i + 1;
		}
	}
	if (text.length > start) parts.push(text.slice(start));
	return parts;
};

/**
 * The components of a printed value, where the print may have left out the
 * separator between two of them: `underline solid #fff` prints as
 * `underline solid#fff`, an ident and a hash being two tokens whatever stands
 * between them. Whitespace parts two components, and so does any junction the
 * print could have left bare - at the top level a component is one token or one
 * call, so a junction inside one is inside its parentheses.
 * @param {string} text a printed value
 * @returns {string[]} its top-level components
 */
const splitPrintedComponents = (text) => {
	/** @type {string[]} */
	const parts = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		// A parenthesis belongs to the call it opens or closes, so neither is a
		// junction two components meet at.
		if (code === CC_LEFT_PARENTHESIS) {
			depth++;
			continue;
		}
		if (code === CC_RIGHT_PARENTHESIS) {
			depth--;
			continue;
		}
		if (depth !== 0) continue;
		if (isAsciiWhitespace(code)) {
			if (i > start) parts.push(text.slice(start, i));
			start = i + 1;
			continue;
		}
		if (i === start) continue;
		if (
			!wouldFuseTokens(text.charCodeAt(i - 1), text.slice(i), text.slice(0, i))
		) {
			parts.push(text.slice(start, i));
			start = i;
		}
	}
	if (text.length > start) parts.push(text.slice(start));
	return parts;
};

/**
 * Whether every target starts `outline-color` at CSS UI 4's `auto`, which is
 * `currentcolor` beside any style but `auto`.
 * @returns {boolean} true when no target starts it elsewhere
 */
const outlineColorStartsCurrent = () =>
	// WHY: An engine reading `outline:auto` paints by CSS UI 4's outline model;
	// Trident, EdgeHTML and Presto read no `auto` and started the color at `invert`.
	// No selection names no browser to answer for.
	S._prefixBrowsers !== null &&
	!S._someBrowserUnanswered &&
	readsAll(valueSupportedFrom("outline auto"));

/**
 * Whether every target reads a `<position>` property's lone edge keyword, which
 * an older engine took only as one of a pair. No selection reads everything.
 * @param {string} property the declaration's lowercased property name
 * @param {string} keyword the edge keyword
 * @returns {boolean} true when the keyword alone may stand for the position
 */
const edgeKeywordRead = (property, keyword) =>
	S._prefixBrowsers === null ||
	(!S._someBrowserUnanswered &&
		readsAll(
			valueSupportedFrom(`${property.replace(VENDOR_PREFIX, "")} ${keyword}`)
		));

/**
 * Drop each component of a family shorthand that holds its own slot's initial -
 * a slot nothing writes takes that value anyway, so writing it says nothing.
 * Where every slot holds its own, one of them says all of them.
 *
 * `familySlots` is what decides which slot a component fills, so a value it
 * cannot part unambiguously is one this leaves alone - and with it every value
 * naming a slot twice, which the engine drops whole.
 * @param {string} property the declaration's lowercased property name
 * @param {string[]} components the value's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const dropFamilyInitials = (property, components) => {
	const longhands = FAMILY_LONGHANDS.get(property);
	if (longhands === undefined || components.length < 2) return null;
	for (const component of components) {
		if (component.includes(",") || component === "/") return null;
	}
	const filled = familySlots(longhands, components);
	if (filled === null) return null;
	const style = property === "outline" && filled.get("outline-style");
	const currentColorIsInitial =
		typeof style === "string" &&
		!asciiCaseInsensitiveMatch(style, "auto") &&
		outlineColorStartsCurrent();
	/** @type {string[]} */
	const kept = [];
	for (const longhand of longhands) {
		const written = filled.get(longhand);
		if (written === undefined) continue;
		const initial = /** @type {string} */ (FAMILY_SLOT_INITIALS.get(longhand));
		if (asciiCaseInsensitiveMatch(written, initial)) continue;
		if (
			currentColorIsInitial &&
			longhand === "outline-color" &&
			asciiCaseInsensitiveMatch(written, "currentcolor")
		) {
			continue;
		}
		kept.push(written);
	}
	if (kept.length === components.length) return null;
	if (kept.length !== 0) return kept;
	// Every slot held its own initial, and `familySlots` already read each of
	// these as one slot's alone - so whichever is shortest says all of them.
	let shortest = components[0];
	for (const component of components) {
		if (component.length < shortest.length) shortest = component;
	}
	return [shortest];
};

// The length units, shared by the zero-unit drop and the value classifier. No
// dataset states the list, so it is the spec's, spelled out.
// cspell:ignore rlh cqmin cqmax vmin vmax dvmin dvmax lvmin lvmax svmin svmax whib
const LENGTH_UNITS =
	"px|em|rem|ex|ch|cap|ic|lh|rlh|v[wh]|vmin|vmax|v[ib]|[sld]v[wh]|[sld]vmin|[sld]vmax|[sld]v[ib]|cq[whib]|cqmin|cqmax|cm|mm|in|pt|pc|q";

const NUMERIC_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?(%|[a-z]*)$/i;
// Only the four lengths `_minifyHash` accepts: a 5- or 7-digit hash is no
// color, and merging one would take the whole shorthand down with it.
const HEX_COLOR_RE = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
const IDENT_RE = /^-?[a-z_][-\w]*$/i;
const URL_RE = /^(?:url|src)\(/i;
const LENGTH_UNIT_RE = new RegExp(`^(?:${LENGTH_UNITS})$`, "i");

/**
 * The value classes a printed component could be read as, for deciding which
 * slot of an order-free shorthand would claim it. Only the classes those slots
 * name, which the generator asserts is this list; anything else - a function
 * other than `url()`, an escape, a substitution - is `null`, which declines the
 * merge rather than guessing a slot.
 * @param {string} value one printed component
 * @param {string} lower the same, lowercased
 * @returns {Set<string> | null} the classes, or `null` when unclassifiable
 */
const valueClasses = (value, lower) => {
	const numeric = NUMERIC_RE.exec(value);
	if (numeric !== null) {
		const unit = toLowerCaseIfNeeded(numeric[1]);
		if (unit === "%") return new Set(["percentage"]);
		// CSS Values 4 §5: a zero length may drop its unit, so a bare `0` is a
		// `<length>`; any other bare number is a `<number>`, which no slot takes.
		if (unit === "") return Number(value) === 0 ? new Set(["length"]) : null;
		return LENGTH_UNIT_RE.test(unit) ? new Set(["length"]) : null;
	}
	if (HEX_COLOR_RE.test(value)) return new Set(["color"]);
	// Before the call below, which a `url()` would answer first and decline.
	if (URL_RE.test(value)) return new Set(["url", "image"]);
	// A call that is a color rather than one that takes one: it fills a color
	// slot as surely as a hex does, and nothing else it could be.
	const open = value.indexOf("(");
	if (open > 0 && value.endsWith(")")) {
		return COLOR_FUNCTIONS.has(asciiLowercaseName(value.slice(0, open)))
			? new Set(["color"])
			: null;
	}
	if (value.charCodeAt(0) === 0x22 || value.charCodeAt(0) === 0x27) {
		return new Set(["string"]);
	}
	if (!IDENT_RE.test(value)) return null;
	if (CSS_WIDE_KEYWORDS.has(lower)) return null;
	const classes = new Set(["custom-ident", "ident"]);
	if (COLOR_KEYWORDS.has(lower)) classes.add("color");
	return classes;
};

/**
 * Which of a family's longhands each component of its shorthand fills, by the
 * same question `familyValue` asks the other way round: a component belongs to
 * the one slot whose keywords or value classes take it. Null where any of them
 * is ambiguous or belongs to none, which is a value this cannot part.
 * @param {string[]} longhands the family's longhands, in grammar order
 * @param {string[]} components the shorthand value's top-level components
 * @returns {Map<string, string> | null} the value per longhand, or null
 */
const familySlots = (longhands, components) => {
	/** @type {Map<string, string>} */
	const filled = new Map();
	for (const component of components) {
		const lower = toLowerCaseIfNeeded(component);
		const classes = valueClasses(component, lower);
		if (classes === null) return null;
		let owner = -1;
		for (let j = 0; j < longhands.length; j++) {
			const keywords = /** @type {string[]} */ (
				FAMILY_SLOT_KEYWORDS.get(longhands[j])
			);
			let takes = keywords.includes(lower);
			if (!takes) {
				const slot = /** @type {string[]} */ (
					FAMILY_SLOT_CLASSES.get(longhands[j])
				);
				for (const name of slot) {
					if (classes.has(name)) {
						takes = true;
						break;
					}
				}
			}
			if (!takes) continue;
			/* istanbul ignore if -- @preserve: no two slots of the one family this is
			   asked about (`text-decoration`) take the same value, so nothing reaches
			   this; it is the same refusal `familyValue` makes the other way round */
			if (owner !== -1) return null;
			owner = j;
		}
		// A slot written twice is a value the engine drops whole.
		if (owner === -1 || filled.has(longhands[owner])) return null;
		filled.set(longhands[owner], component);
	}
	return filled;
};

/**
 * Whether the target reads every slot of a shorthand, so one holding its own
 * initial can come out. A `text-decoration` slot the target does not read is
 * one the engine drops the whole declaration for.
 * @param {string} property the shorthand's lowercased property name
 * @returns {boolean} true when an initial slot may be dropped
 */
const shorthandSlotsReadable = (property) =>
	property !== "text-decoration" ||
	(S._textDecorationColorStyleAllowed && S._textDecorationThicknessAllowed);

/**
 * Join a merged shorthand's slots the way the printer joins any two fragments:
 * a separator only where leaving it out would fuse the tokens either side, so
 * the merge writes what the same value authored by hand would print as.
 * @param {string[]} slots the values the shorthand spells, in order
 * @returns {string} the value they spell
 */
const joinSlots = (slots) => {
	let out = slots[0];
	for (let i = 1; i < slots.length; i++) {
		const slot = slots[i];
		if (wouldFuseTokens(out.charCodeAt(out.length - 1), slot, out)) out += " ";
		out += slot;
	}
	return out;
};

/**
 * Join slots with the `/` a slash shorthand writes between them, parted from a
 * slot that would fuse with it: `/` before `*` opens a comment.
 * @param {string[]} slots the values the shorthand spells, in order
 * @returns {string} the value they spell
 */
const joinSlashSlots = (slots) => {
	let out = slots[0];
	for (let i = 1; i < slots.length; i++) {
		const slot = slots[i];
		out += wouldFuseTokens(CC_SOLIDUS, slot, out) ? "/ " : "/";
		out += slot;
	}
	return out;
};

/**
 * The shorthand value a family merge may emit: every longhand's value, in the
 * grammar's order. Each has to parse back into the longhand it was authored on,
 * so a value a second slot would also take declines the merge - `outline`'s
 * `auto` is both an `outline-style` and an `outline-color`.
 * @param {string} property the shorthand being written
 * @param {string[]} longhands the family's longhands, in grammar order
 * @param {string[]} values one component per longhand, in the same order
 * @returns {string | null} the shorthand value, or `null` when it is ambiguous
 */
const familyValue = (property, longhands, values) => {
	for (let i = 0; i < values.length; i++) {
		// CSS Variables 1 §3.1: a substitution leaves the whole shorthand invalid
		// at computed-value time where its longhand alone would lose one slot.
		if (containsSubstitutionFunction(values[i])) return null;
		const lower = toLowerCaseIfNeeded(values[i]);
		const classes = valueClasses(values[i], lower);
		if (classes === null) return null;
		let owner = -1;
		for (let j = 0; j < longhands.length; j++) {
			const keywords = /** @type {string[]} */ (
				FAMILY_SLOT_KEYWORDS.get(longhands[j])
			);
			let takes = keywords.includes(lower);
			if (!takes) {
				const slot = /** @type {string[]} */ (
					FAMILY_SLOT_CLASSES.get(longhands[j])
				);
				for (const name of slot) {
					if (classes.has(name)) {
						takes = true;
						break;
					}
				}
			}
			if (!takes) continue;
			if (owner !== -1) return null;
			owner = j;
		}
		if (owner !== i) return null;
	}
	// A slot holding its own initial says nothing, exactly as it says nothing
	// in the same value written by hand - where the target reads the slot.
	const dropped = shorthandSlotsReadable(property)
		? dropFamilyInitials(property, values)
		: null;
	return joinSlots(dropped === null ? values : dropped);
};

// The `margin` and `padding` properties, whose CSS 2.1 values every engine reads.
const CSS21_BOX_PROPERTIES = new Set([
	"margin",
	"margin-top",
	"margin-right",
	"margin-bottom",
	"margin-left",
	"padding",
	"padding-top",
	"padding-right",
	"padding-bottom",
	"padding-left"
]);

// A CSS 2.1 length or percentage, the units every engine has always read.
const CSS21_LENGTH_RE =
	/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:px|em|ex|in|cm|mm|pt|pc|%)?$/i;

/**
 * Whether a `margin` or `padding` value is one every engine reads: one to four
 * CSS 2.1 lengths or percentages (a unitless one only `0`), `auto` in a margin,
 * nothing negative in a padding.
 * @param {string} property a property of `CSS21_BOX_PROPERTIES`
 * @param {string} value its printed value
 * @returns {boolean} true when every engine reads the value
 */
const css21BoxValue = (property, value) => {
	const margin = property.startsWith("margin");
	const components = value.split(" ");
	const max = property.includes("-") ? 1 : 4;
	if (components.length > max) return false;
	for (const component of components) {
		if (margin && asciiCaseInsensitiveMatch(component, "auto")) continue;
		if (!CSS21_LENGTH_RE.test(component)) return false;
		if (!margin && component.charCodeAt(0) === CC_HYPHEN_MINUS) return false;
		const last = component.charCodeAt(component.length - 1);
		if (last >= 0x30 && last <= 0x39 && Number(component) !== 0) return false;
	}
	return true;
};

/**
 * Whether every target browser reads a later declaration's whole value, which
 * leaves an earlier one of the same property carrying nothing rather than
 * standing as its fallback. Only a value whose every construct is named in
 * `getValueSupportPacked()` answers yes: a keyword the property's own grammar
 * states, or one color function over numbers and named colors.
 * @param {string} property the printed property name
 * @param {string} value the later declaration's printed value
 * @returns {boolean} true when no target is left reading the earlier one
 */
const valueReadByTarget = (property, value) => {
	// No selection names no browser to answer for, so the earlier one stands
	// unless the option assumes each engine shipping today, read against below.
	if (S._prefixBrowsers === null && !S._dropOverriddenDeclarations) {
		return false;
	}
	// A selection naming a browser the tables do not cover answers for less than
	// the whole of it. Naming a browser states a target, which the option that
	// assumes one does not override, so this stands whatever it says.
	if (S._someBrowserUnanswered) return false;
	// A declaration holding a substitution is valid when parsed, whatever it
	// holds, so the cascade never falls back past it where every target reads it.
	const substitutions = heldSubstitutions(value);
	if (substitutions !== null) {
		for (const name of substitutions) {
			if (!readsOverridingValue(valueSupportedFrom(name))) return false;
		}
		return true;
	}
	const open = value.indexOf("(");
	if (open === -1) {
		if (CSS21_BOX_PROPERTIES.has(property)) {
			return css21BoxValue(property, value);
		}
		if (property === "text-decoration") {
			const components = splitPrintedComponents(value);
			if (components.length > 1) return textDecorationRead(components);
		}
		return readsOverridingValue(
			valueSupportedFrom(`${property} ${toLowerCaseIfNeeded(value)}`)
		);
	}
	if (
		open === 0 ||
		value.includes("(", open + 1) ||
		value.charCodeAt(value.length - 1) !== CC_RIGHT_PARENTHESIS
	) {
		return false;
	}
	const fn = toLowerCaseIfNeeded(value.slice(0, open));
	if (!readsOverridingValue(valueSupportedFrom(fn))) return false;
	if (fn.endsWith("gradient")) {
		// A one-stop gradient is CSS Images 4's, which not every engine reads yet.
		return gradientArgumentsRead(value.slice(open + 1, -1), 2);
	}
	const args = value.slice(open + 1, -1).match(COLOR_ARGUMENT_RE);
	if (args === null) return false;
	for (const argument of args) {
		if (COLOR_NUMBER_RE.test(argument) || COLOR_HUE_RE.test(argument)) {
			continue;
		}
		// A hex of three or six digits is read wherever a color is; four and eight
		// state an alpha, which is the target's own question and not asked here.
		if (LONE_HEX_RE.test(argument)) {
			if (argument.length === 4 || argument.length === 7) continue;
			return false;
		}
		// A named color reaches as far as naming one does, bar the two that
		// arrived after the list and carry a row of their own.
		const lowered = toLowerCaseIfNeeded(argument);
		if (getColorNameToRgb().has(lowered) && !LATER_COLOR_NAMES.has(lowered)) {
			continue;
		}
		return false;
	}
	return true;
};

// The words a gradient's line, shape and position are written with, which
// every engine reading the gradient reads.
const GRADIENT_KEYWORDS = new Set([
	"at",
	"bottom",
	"center",
	"circle",
	"closest-corner",
	"closest-side",
	"currentcolor",
	"ellipse",
	"farthest-corner",
	"farthest-side",
	"from",
	"left",
	"right",
	"to",
	"top",
	"transparent"
]);

// A number, a length, a percentage or an angle, its unit captured.
const GRADIENT_AMOUNT_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)([a-z]+|%)?$/i;

/**
 * Whether a target reading the gradient function reads all of its arguments: a
 * line, shape or position of keywords and amounts, and stops of a color every
 * engine names. A call inside, or an interpolation space, is not asked here.
 * @param {string} inner the printed arguments
 * @param {number} stopsNeeded how many color stops the arguments must hold
 * @returns {boolean} true when the target reads every one
 */
const gradientArgumentsRead = (inner, stopsNeeded) => {
	const args = splitTopLevelArguments(inner);
	let stops = 0;
	for (let index = 0; index < args.length; index++) {
		// A line, shape or position opens the list alone; a stop is one color
		// and its amounts. Anything else, an empty argument too, is invalid.
		if (args[index].trim() === "") return false;
		let words = 0;
		let colors = 0;
		for (const component of splitPrintedComponents(args[index].trim())) {
			const lowered = toLowerCaseIfNeeded(component);
			if (GRADIENT_KEYWORDS.has(lowered)) {
				if (lowered === "transparent" || lowered === "currentcolor") {
					colors++;
				} else {
					words++;
				}
				if (words !== 0 && (index !== 0 || colors !== 0)) return false;
				if (colors > 1) return false;
				continue;
			}
			const amount = GRADIENT_AMOUNT_RE.exec(lowered);
			if (amount !== null) {
				// A unit some target does not read drops the gradient there.
				const unit = amount[1];
				if (unit === undefined || unit === "%") continue;
				if (!readsOverridingValue(valueSupportedFrom(`unit ${unit}`))) {
					return false;
				}
				continue;
			}
			let color = false;
			if (LONE_HEX_RE.test(component)) {
				if (
					component.length !== 4 &&
					component.length !== 7 &&
					!S._hexAlphaAllowed
				) {
					return false;
				}
				color = true;
			} else if (
				getColorNameToRgb().has(lowered) &&
				!LATER_COLOR_NAMES.has(lowered)
			) {
				color = true;
			}
			if (!color || ++colors > 1 || words !== 0) return false;
		}
		if (colors !== 0) stops++;
	}
	return stops >= stopsNeeded;
};

/**
 * Whether every target reads a `text-decoration` naming more than its line: the
 * multi-value shorthand itself, and each slot's keyword, color or amount.
 * @param {string[]} components the value's top-level components
 * @returns {boolean} true when the target reads every one
 */
const textDecorationRead = (components) => {
	if (!S._textDecorationColorStyleAllowed) return false;
	const filled = familySlots(
		/** @type {string[]} */ (FAMILY_LONGHANDS.get("text-decoration")),
		components
	);
	if (filled === null) return false;
	for (const [longhand, written] of filled) {
		if (
			longhand === "text-decoration-thickness" &&
			!S._textDecorationThicknessAllowed
		) {
			return false;
		}
		const keywords = /** @type {string[]} */ (
			FAMILY_SLOT_KEYWORDS.get(longhand)
		);
		if (keywords.includes(toLowerCaseIfNeeded(written))) continue;
		// A color or an amount, read as a gradient's stop or length is.
		if (!gradientArgumentsRead(written, 0)) return false;
	}
	return true;
};

/**
 * Whether a later declaration of one property leaves an earlier one carrying
 * nothing: the cascade reads the later, and it writes every name the earlier
 * does.
 * @param {CssPath} path the accessor positioned on the rule
 * @param {Node} later the later declaration
 * @param {string} laterValue its printed value
 * @param {Node} earlier the earlier declaration of the same property
 * @param {string} earlierValue its printed value
 * @param {string} property the printed property both write
 * @param {boolean} names whether the property takes a `<custom-ident>` list
 * @param {boolean} keyframe whether the block is a keyframe
 * @returns {boolean} true when the earlier one is read for nothing
 */
const laterWriteWins = (
	path,
	later,
	laterValue,
	earlier,
	earlierValue,
	property,
	names,
	keyframe
) => {
	const important = isImportant(later);
	// An `!important` one a keyframe ignores stands over nothing.
	if (keyframe && important) return false;
	// An `!important` earlier one still wins over a later plain declaration,
	// which leaves the later dead rather than it.
	if (!important && isImportant(earlier)) return false;
	// A target that reads the later value everywhere is one nothing falls back
	// from, whatever the two values have in common.
	if (valueReadByTarget(property, laterValue)) return true;
	return names
		? coveredByLater(laterValue, earlierValue)
		: sameVocabulary(laterValue, earlierValue, property);
};

/**
 * The same question asked of two declaration nodes before either is written,
 * so a merge can read a family as the output will carry it.
 * @param {CssPath} path the accessor positioned on the rule
 * @param {PrintContext} writer the print context (children's printed text)
 * @param {Declaration} earlier the earlier declaration
 * @param {Declaration} later the later declaration of the same property
 * @param {boolean} keyframe whether the block is a keyframe
 * @returns {boolean} true when the earlier one is read for nothing
 */
const writeIsDead = (path, writer, earlier, later, keyframe) => {
	const laterText = writer.get(later);
	const earlierText = writer.get(earlier);
	const laterColon = laterText.indexOf(":");
	const earlierColon = earlierText.indexOf(":");
	// A custom property's value is a token stream nothing here reads, so what
	// an engine makes of it is not knowable from its spelling.
	if (
		laterColon <= 0 ||
		earlierColon <= 0 ||
		laterText.charCodeAt(1) === CC_HYPHEN_MINUS
	) {
		return false;
	}
	const property = printedProperty(laterText, laterColon);
	return laterWriteWins(
		path,
		later,
		writtenValue(laterText, laterColon, property),
		earlier,
		printedValue(earlierText, earlierColon),
		property,
		CUSTOM_IDENT_LIST_PROPERTIES.has(property),
		keyframe
	);
};

/**
 * The longhands a `margin` or `padding` sets, where an earlier write of one may
 * be dead: only with a target, or `dropOverriddenDeclarations`, to read by.
 * @param {string} property the printed property
 * @returns {Set<string> | undefined} the longhands it sets, if it may override them
 */
const overridableLonghands = (property) =>
	(S._prefixBrowsers === null && !S._dropOverriddenDeclarations) ||
	(property !== "margin" && property !== "padding")
		? undefined
		: getShorthandLonghands().get(property);

/**
 * Whether a later shorthand leaves an earlier declaration of a longhand it sets
 * carrying nothing: every target reads the shorthand's value.
 * @param {Node} earlier the earlier longhand declaration
 * @param {Node} later the later shorthand declaration
 * @param {string} laterValue the shorthand's printed value
 * @param {string} property the shorthand
 * @param {boolean} keyframe whether the block is a keyframe
 * @returns {boolean} true when the earlier one is read for nothing
 */
const shorthandWriteWins = (earlier, later, laterValue, property, keyframe) => {
	const important = isImportant(later);
	if (keyframe && important) return false;
	if (!important && isImportant(earlier)) return false;
	return valueReadByTarget(property, laterValue);
};

/**
 * A property's first word, what an unnamed property of its family starts with:
 * `margin` for `margin-top`.
 * @param {string} name a property
 * @returns {string} the word before its first `-`
 */
const firstPropertyWord = (name) => {
	const dash = name.indexOf("-");
	return dash === -1 ? name : name.slice(0, dash);
};

/**
 * Merge a box family's four longhands into their shorthand, which sets exactly
 * those four (see `BOX_LONGHANDS`) - so the rule computes the same either way.
 *
 * Every guard here is about *not* reviving something the browser drops, or
 * moving a declaration past one that could overwrite it: the four must be
 * adjacent, each declared once, each a single component, and all agree on
 * `!important`. `collapseBox` refuses a `var()` or a CSS-wide keyword, both of
 * which mean something else in a shorthand.
 * @param {CssPath} path the accessor positioned on the rule
 * @param {Declaration[]} decls the rule's declarations, in source order
 * @param {PrintContext} writer the print context (children's printed text)
 * @param {[string, string[]][]} table the shorthand-to-longhands entries to merge by
 * @param {number} mode how the table's values are written: `MERGE_BOX` for the
 * `{1,4}` notation, `MERGE_FAMILY` for order-free slots, `MERGE_SLASH` for slots
 * a `/` stands between
 * @param {Map<string, number>} at which declaration wrote each property, by name
 * @param {Set<string>} repeated the properties written more than once
 * @param {Uint32Array | null} rulesBefore how many child rules stand before each
 * declaration, or null where the block holds none
 * @returns {Map<Node, string> | null} replacement text per declaration, or null
 */
const mergeBoxLonghands = (
	path,
	decls,
	writer,
	table,
	mode,
	at,
	repeated,
	rulesBefore
) => {
	if (!S._transforms.mergeLonghands) return null;
	/** @type {Map<Node, string> | null} */
	let out = null;
	// What an earlier shorthand of this table wrote or blanked. Two can share a
	// longhand, and the second landing on the first's blanked tail would leave that
	// tail uncovered, dropping its declaration.
	/** @type {Set<Node> | null} */
	let claimed = null;
	// Only an entry whose first longhand the block writes can merge, and blocks
	// write few properties against a table of dozens of entries.
	const firsts = mergeTableFirsts(table);
	/** @type {number[]} */
	const candidates = [];
	for (const property of at.keys()) {
		const entries = firsts.get(property);
		if (entries !== undefined) {
			for (const entry of entries) candidates.push(entry);
		}
	}
	if (candidates.length === 0) return null;
	// In table order, as the claims between entries are made.
	if (candidates.length > 1) candidates.sort((a, b) => a - b);
	for (let c = 0; c < candidates.length; c++) {
		const e = candidates[c];
		const shorthand = table[e][0];
		const longhands = table[e][1];
		// A plain loop: this runs for every table entry of every rule, where one
		// closure per entry is the allocation that dominates.
		let missing = false;
		for (let i = 0; i < longhands.length && !missing; i++) {
			missing = !at.has(longhands[i]) || repeated.has(longhands[i]);
		}
		if (missing) continue;
		// The shorthands newer than the longhands they merge.
		if (shorthand === "inset" && !S._insetShorthandAllowed) continue;
		if (!S._placeShorthandAllowed && PLACE_SHORTHANDS.has(shorthand)) continue;
		const indexes = longhands.map((l) => /** @type {number} */ (at.get(l)));
		if (claimed !== null) {
			let taken = false;
			for (let i = 0; i < indexes.length && !taken; i++) {
				taken = claimed.has(decls[indexes[i]]);
			}
			if (taken) continue;
		}
		const ordered = [...indexes].sort((a, b) => a - b);
		// A child rule between the first and the last is one the merge steps over.
		if (
			rulesBefore !== null &&
			rulesBefore[ordered[ordered.length - 1]] !== rulesBefore[ordered[0]]
		) {
			continue;
		}
		// WHY: the merge moves whatever stands between the slots below the shorthand,
		// so nothing there may be one whose order against a later slot decides what
		// is read - `orderMatters`, which `declarationOrder` moves by, so a block
		// merges the same before and after it is reordered. A pair family states no
		// prefix at all - its longhands are the two names - so a property no dataset
		// names is read by either one's first segment.
		const prefix =
			BOX_FAMILY_PREFIX.get(shorthand) || firstPropertyWord(shorthand);
		const families = [prefix, ...longhands.map(firstPropertyWord)];
		let blocked = false;
		for (
			let i = ordered[0] + 1;
			i < ordered[ordered.length - 1] && !blocked;
			i++
		) {
			if (indexes.includes(i)) continue;
			const name = asciiLowercaseName(path.name(decls[i]));
			// A legacy alias of a property the block still writes, in a spelling no
			// target reads, is dropped whether it stood here or not - so it is here.
			if (S._prefixingOn && name.charCodeAt(0) === CC_HYPHEN_MINUS) {
				const base = prefixedPropertyName(name);
				if (
					base !== undefined &&
					at.has(base) &&
					prefixedPropertyRemovable(base, name)
				) {
					continue;
				}
			}
			blocked = blocksMerge(
				name,
				longhands.filter((_, k) => indexes[k] > i),
				families
			);
		}
		if (blocked) continue;
		const important = isImportant(decls[indexes[0]]);
		if (indexes.some((i) => isImportant(decls[i]) !== important)) continue;
		/** @type {string[]} */
		const values = [];
		for (const i of indexes) {
			if (!isSingleValue(path, decls[i], writer)) break;
			// What the declaration prints, not what its tokens spell: a zero length
			// loses its unit as a declaration is written, and a token knows no property.
			// A single value prints as `name:value`: only a value-less one prints "".
			const text = writer.get(decls[i]);
			const colon = text.indexOf(":");
			values.push(text.slice(colon + 1, printedValueEnd(text, colon)));
		}
		if (values.length !== longhands.length) continue;
		// WHY: a bare number is no length, so one beside a length is a value the
		// property never read - the engine dropped that declaration and kept the
		// others. Merging them writes it into a shorthand the engine drops whole,
		// losing the slots that were fine. Not asked of an ordered grammar, whose
		// slots take different types by position.
		if (mode !== MERGE_ORDERED && mixesBareNumberWithLength(values)) continue;
		// So is a word the longhand reads as no keyword of its own.
		if (mode === MERGE_BOX && boxSlotsUnreadable(shorthand, values)) continue;
		/** @type {string | null} */
		let value;
		if (mode === MERGE_FAMILY) {
			value = familyValue(shorthand, longhands, values);
			if (value === null) continue;
		} else if (mode === MERGE_ORDERED) {
			// The same two refusals every other mode makes: a `var()` may expand
			// across a slot boundary, and a CSS-wide keyword beside another value is
			// a shorthand the engine drops whole.
			let refused = false;
			for (const slot of values) {
				if (
					containsSubstitutionFunction(slot) ||
					CSS_WIDE_KEYWORDS.has(toLowerCaseIfNeeded(slot))
				) {
					refused = true;
					break;
				}
			}
			if (refused) continue;
			// Written by position, then shortened the way an authored one would be.
			const shortest = shortestAuthoredFlex(values);
			value = joinSlots(shortest === null ? values : shortest);
		} else if (mode === MERGE_SLASH) {
			// The same two refusals a box makes: a `var()` may expand across the `/`
			// into another slot, and a CSS-wide keyword beside another value is a
			// shorthand the engine drops whole.
			let refused = false;
			for (const slot of values) {
				if (
					containsSubstitutionFunction(slot) ||
					CSS_WIDE_KEYWORDS.has(toLowerCaseIfNeeded(slot))
				) {
					refused = true;
					break;
				}
			}
			if (refused) continue;
			// Every slot written: an omitted one means "the first slot where that is
			// a `<custom-ident>`, else `auto`", which is not "the same value".
			value = joinSlashSlots(values);
		} else {
			// A pair collapses by the same rule as a box, and needs the same refusals:
			// a `var()` may expand to both values, and a CSS-wide keyword alongside
			// another value is a shorthand the engine drops whole.
			const box = collapseBox(values);
			if (box === null) continue;
			// The two-value spelling is the newer one here, so it is written only
			// where the target reads it; the collapse to one value is as old as the
			// longhands and always is.
			if (
				box.length !== 1 &&
				ONE_VALUE_PAIR_SHORTHANDS.has(shorthand) &&
				!S._overflowTwoValuesAllowed
			) {
				continue;
			}
			// A keyword only some of the longhands take makes the shorthand invalid,
			// where the declaration writing it stood on its own: `justify-items:left`
			// is read and `place-items:left` is dropped whole.
			const unshared = UNSHARED_LONGHAND_KEYWORDS.get(shorthand);
			if (unshared !== undefined) {
				// Every slot is one component here, so each is a keyword or nothing.
				let refused = false;
				for (const slot of box) {
					if (unshared.has(toLowerCaseIfNeeded(slot))) {
						refused = true;
						break;
					}
				}
				if (refused) continue;
			}
			value = joinSlots(box);
		}
		if (out === null) out = new Map();
		out.set(
			decls[ordered[0]],
			`${shorthand}:${value}${important ? "!important" : ""};`
		);
		for (let i = 1; i < ordered.length; i++) out.set(decls[ordered[i]], "");
		// The shorthand writes each longhand still, but under its own name, so the
		// drop a legacy alias of one is owed is no longer one the prefix pass sees.
		if (S._prefixingOn) {
			for (const longhand of longhands) {
				const spellings = getPrefixedProperties().get(longhand);
				if (spellings === undefined) continue;
				for (const [spelling] of spellings) {
					const j = at.get(spelling);
					if (
						j !== undefined &&
						prefixedPropertyRemovable(longhand, spelling)
					) {
						out.set(decls[j], "");
					}
				}
			}
		}
		if (claimed === null) claimed = new Set();
		for (const i of ordered) claimed.add(decls[i]);
	}
	return out;
};

// A `<custom-ident>` as printed; one the printer keeps escaped fails it.
const GRID_IDENT_RE = /^(?:--|-?[a-zA-Z_\u0080-\uFFFF])[-\w\u0080-\uFFFF]*$/;
const GRID_INTEGER_RE = /^[-+]?\d+$/;

/**
 * Whether a word is a `<custom-ident>` a `<grid-line>` may name.
 * @param {string} word a printed word
 * @returns {boolean} true where it names a line
 */
const isGridIdent = (word) => {
	if (!GRID_IDENT_RE.test(word)) return false;
	const lowered = toLowerCaseIfNeeded(word);
	return (
		lowered !== "auto" &&
		lowered !== "span" &&
		lowered !== "default" &&
		!CSS_WIDE_KEYWORDS.has(lowered)
	);
};

/**
 * What an omitted `<grid-line>` after this one means (CSS Grid 2 §8.4): the
 * same line where this is a lone `<custom-ident>`, else `auto`.
 * @param {string} line a printed line
 * @returns {string | null} the line an omitted one stands for, or null for a
 * shape the fold leaves as written
 */
const omittedGridLine = (line) => {
	const parts = line.split(" ");
	if (parts.length === 1) {
		if (toLowerCaseIfNeeded(line) === "auto") return "auto";
		if (GRID_INTEGER_RE.test(line)) return Number(line) === 0 ? null : "auto";
		return isGridIdent(line) ? line : null;
	}
	if (parts.length !== 2 || toLowerCaseIfNeeded(parts[0]) !== "span") {
		return null;
	}
	const count = parts[1];
	return (GRID_INTEGER_RE.test(count) ? Number(count) > 0 : isGridIdent(count))
		? "auto"
		: null;
};

// The lines each grid placement shorthand sets, in the order its value lists
// them (CSS Grid 2 §8.4).
/** @type {Map<string, string[]>} */
const GRID_PLACEMENT_SLOTS = new Map([
	[
		"grid-area",
		["grid-row-start", "grid-column-start", "grid-row-end", "grid-column-end"]
	],
	["grid-row", ["grid-row-start", "grid-row-end"]],
	["grid-column", ["grid-column-start", "grid-column-end"]]
]);

/**
 * Write a grid placement shorthand with one of its lines set again: every line
 * filled in as its omission means, the one replaced, and the trailing lines the
 * omission still means left out again.
 * @param {string[]} slots the longhands the shorthand sets, in its order
 * @param {string} value the shorthand's printed value
 * @param {string} longhand the longhand written after it
 * @param {string} longhandValue that longhand's printed value
 * @returns {string | null} the shorthand's new value, or null to leave both
 */
const foldGridLine = (slots, value, longhand, longhandValue) => {
	const slot = slots.indexOf(longhand);
	if (
		slot === -1 ||
		containsSubstitutionFunction(value) ||
		containsSubstitutionFunction(longhandValue)
	) {
		return null;
	}
	if (omittedGridLine(longhandValue) === null) return null;
	const lines = value.split("/").map((line) => line.trim());
	if (lines.length > slots.length) return null;
	for (const line of lines) if (omittedGridLine(line) === null) return null;
	// A start line stands for the end line after it; in `grid-area` the column
	// start is read off the row start too.
	const half = slots.length / 2;
	while (lines.length < slots.length) {
		const from = lines.length < half ? 0 : lines.length - half;
		lines.push(/** @type {string} */ (omittedGridLine(lines[from])));
	}
	lines[slot] = longhandValue;
	// Each pass trims the last line or stops, so `i` is always the last one.
	for (let i = slots.length - 1; i > 0; i--) {
		const from = i < half ? 0 : i - half;
		if (lines[i] !== omittedGridLine(lines[from])) break;
		lines.length = i;
	}
	return lines.join("/");
};

// The three longhands `grid-template` sets and nothing else, in the order a
// merge reads them.
const GRID_TEMPLATE_LONGHANDS = [
	"grid-template-rows",
	"grid-template-columns",
	"grid-template-areas"
];

// What a `grid-template` written with areas cannot hold (CSS Grid 2 §7.4): a
// repeated or auto-filled list, line names this does not place, a subgrid or
// masonry axis.
const GRID_TEMPLATE_REFUSED_RE = /\[|repeat\(|subgrid|masonry/i;

// One `<string>` of `grid-template-areas`, as printed.
const GRID_AREA_STRING_RE = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g;

/**
 * Join a block's three `grid-template-*` longhands into the one `grid-template`
 * setting them: each row's size after its area string, then the columns. Only
 * a value every engine reads back into the same three longhands is written.
 * @param {CssPath} path the accessor positioned on the rule
 * @param {Declaration[]} decls the rule's declarations, in source order
 * @param {PrintContext} writer the print context (children's printed text)
 * @param {Map<string, number>} at which declaration wrote each property, by name
 * @param {Set<string>} repeated the properties written more than once
 * @param {Uint32Array | null} rulesBefore how many child rules stand before each
 * declaration, or null where the block holds none
 * @returns {Map<Node, string> | null} replacement text per declaration, or null
 */
const mergeGridTemplate = (path, decls, writer, at, repeated, rulesBefore) => {
	/** @type {number[]} */
	const indices = [];
	for (const name of GRID_TEMPLATE_LONGHANDS) {
		if (repeated.has(name)) return null;
		indices.push(/** @type {number} */ (at.get(name)));
	}
	const first = Math.min(...indices);
	const last = Math.max(...indices);
	if (rulesBefore !== null && rulesBefore[first] !== rulesBefore[last]) {
		return null;
	}
	for (let i = first + 1; i < last; i++) {
		if (indices.includes(i)) continue;
		const name = asciiLowercaseName(path.name(decls[i]));
		// A longhand written twice and not `repeated` is a dead write, dropped.
		if (GRID_TEMPLATE_LONGHANDS.includes(name)) continue;
		if (
			blocksMerge(
				name,
				GRID_TEMPLATE_LONGHANDS.filter((_, k) => indices[k] > i),
				["grid"]
			)
		) {
			return null;
		}
	}
	const important = isImportant(decls[indices[0]]);
	/** @type {string[]} */
	const values = [];
	for (const i of indices) {
		if (isImportant(decls[i]) !== important) return null;
		const text = writer.get(decls[i]);
		// A value-less declaration is dropped, setting nothing a merged value could
		// leave unset - an empty slot would void the whole shorthand.
		if (text.length === 0) return null;
		let value = text.slice(text.indexOf(":") + 1, -1);
		value = value.replace(PRINTED_IMPORTANT_RE, "");
		if (
			containsSubstitutionFunction(value) ||
			CSS_WIDE_KEYWORDS.has(toLowerCaseIfNeeded(value))
		) {
			return null;
		}
		values.push(value);
	}
	const [rows, columns, areas] = values;
	let value;
	if (asciiCaseInsensitiveMatch(areas, "none")) {
		value =
			asciiCaseInsensitiveMatch(rows, "none") &&
			asciiCaseInsensitiveMatch(columns, "none")
				? "none"
				: joinSlashSlots([rows, columns]);
	} else {
		if (
			asciiCaseInsensitiveMatch(rows, "none") ||
			GRID_TEMPLATE_REFUSED_RE.test(rows) ||
			GRID_TEMPLATE_REFUSED_RE.test(columns)
		) {
			return null;
		}
		const strings = areas.match(GRID_AREA_STRING_RE);
		if (strings === null || strings.join("") !== areas) return null;
		const sizes = splitPrintedComponents(rows);
		// An area string with no size after it is an `auto` row, so the rows
		// written have to be one per string.
		if (sizes.length !== strings.length) return null;
		/** @type {string[]} */
		const slots = [];
		for (let i = 0; i < strings.length; i++) {
			slots.push(strings[i]);
			if (!asciiCaseInsensitiveMatch(sizes[i], "auto")) slots.push(sizes[i]);
		}
		value = joinSlots(slots);
		if (!asciiCaseInsensitiveMatch(columns, "none")) {
			value = joinSlashSlots([value, columns]);
		}
	}
	// Never longer than the three: each value is written once, with no name of
	// its own, and a string and a size side by side need no space between.
	const text = `grid-template:${value}${important ? "!important" : ""};`;
	return new Map([
		[decls[first], text],
		...indices
			.filter((i) => i !== first)
			.map((i) => /** @type {[Node, string]} */ ([decls[i], ""]))
	]);
};

/**
 * Join a block's `grid-row` and `grid-column` into the one `grid-area` setting
 * the same four lines, written with every line its omission already means left
 * out. Nothing between the two may write a placement, and both share importance.
 * @param {CssPath} path the accessor positioned on the rule
 * @param {Declaration[]} decls the rule's declarations, in source order
 * @param {PrintContext} writer the print context (children's printed text)
 * @param {Map<string, number>} at which declaration wrote each property, by name
 * @param {Set<string>} repeated the properties written more than once
 * @param {Uint32Array | null} rulesBefore how many child rules stand before each
 * declaration, or null where the block holds none
 * @returns {Map<Node, string> | null} replacement text per declaration, or null
 */
const mergeGridPlacement = (path, decls, writer, at, repeated, rulesBefore) => {
	if (repeated.has("grid-row") || repeated.has("grid-column")) return null;
	const rowAt = /** @type {number} */ (at.get("grid-row"));
	const columnAt = /** @type {number} */ (at.get("grid-column"));
	const first = Math.min(rowAt, columnAt);
	const last = Math.max(rowAt, columnAt);
	if (rulesBefore !== null && rulesBefore[first] !== rulesBefore[last]) {
		return null;
	}
	// Moved past whatever stands between them, which then may set no line.
	for (let i = first + 1; i < last; i++) {
		const name = asciiLowercaseName(path.name(decls[i]));
		if (blocksMerge(name, [rowAt > i ? "grid-row" : "grid-column"], ["grid"])) {
			return null;
		}
	}
	const important = isImportant(decls[rowAt]);
	if (isImportant(decls[columnAt]) !== important) return null;
	/**
	 * @param {string} text a placement declaration as printed
	 * @returns {string[] | null} its start and end line, or null to leave it
	 */
	const lines = (text) => {
		let value = text.slice(text.indexOf(":") + 1);
		if (value.endsWith(";")) value = value.slice(0, -1);
		value = value.replace(PRINTED_IMPORTANT_RE, "");
		// A substitution may stand for the `/`.
		if (value.includes("(")) return null;
		const parts = value.split("/").map((part) => part.trim());
		if (parts.length > 2) return null;
		const omitted = omittedGridLine(parts[0]);
		if (omitted === null) return null;
		if (parts.length === 1) return [parts[0], omitted];
		return omittedGridLine(parts[1]) === null ? null : parts;
	};
	const rowText = writer.get(decls[rowAt]);
	const columnText = writer.get(decls[columnAt]);
	const row = lines(rowText);
	const column = lines(columnText);
	if (row === null || column === null) return null;
	const area = [row[0], column[0], row[1], column[1]];
	// Only a trailing line may go, and each says what an omitted one means.
	if (area[3] === omittedGridLine(area[1])) {
		area.length = 3;
		if (area[2] === omittedGridLine(area[0])) {
			area.length = 2;
			if (area[1] === omittedGridLine(area[0])) area.length = 1;
		}
	}
	// Never longer: the names it drops outweigh a `/` and an `auto` it may add.
	const text = `grid-area:${area.join("/")}${important ? "!important" : ""};`;
	return new Map([
		[decls[first], text],
		[decls[last], ""]
	]);
};

// How a table's slots are written into the shorthand.
const MERGE_BOX = 0;
const MERGE_FAMILY = 1;
const MERGE_SLASH = 2;
const MERGE_ORDERED = 3;

/** @type {WeakMap<[string, string[]][], Map<string, number[]>>} */
const mergeTableFirstsCache = new WeakMap();

/**
 * A merge table's entries by their first longhand, which a block has to write
 * for the entry to merge.
 * @param {[string, string[]][]} table a merge table
 * @returns {Map<string, number[]>} the indexes of the entries each first longhand leads
 */
const mergeTableFirsts = (table) => {
	let firsts = mergeTableFirstsCache.get(table);
	if (firsts === undefined) {
		firsts = new Map();
		for (let e = 0; e < table.length; e++) {
			const first = table[e][1][0];
			const entries = firsts.get(first);
			if (entries === undefined) firsts.set(first, [e]);
			else entries.push(e);
		}
		mergeTableFirstsCache.set(table, firsts);
	}
	return firsts;
};

// Each table as its entries, read by index: a `for...of` over the map would
// allocate an entry pair per row of every table for every block merged.
/** @type {[[string, string[]][], number][]} */
const MERGE_TABLES = [
	[[...BOX_LONGHANDS], MERGE_BOX],
	[[...PAIR_LONGHANDS], MERGE_BOX],
	[[...FAMILY_LONGHANDS], MERGE_FAMILY],
	[[...ORDERED_LONGHANDS], MERGE_ORDERED],
	[[...SLASH_LONGHANDS], MERGE_SLASH]
];

/**
 * A printed rule the merge can take apart again. `prelude` is how much of `text`
 * comes before the `{`, so a parent parts it without re-scanning; `children` is
 * what a mergeable at-rule's block is made of, so two blocks join at the seam
 * their texts would otherwise hide.
 * @typedef {object} RuleEntry
 * @property {string} text the rule as printed
 * @property {number} prelude the prelude's length, `-1` for a rule that cannot join
 * @property {boolean} atRule whether it is an at-rule
 * @property {boolean} plain whether its block holds declarations and no rule,
 * so another's declarations may follow them without crossing one
 * @property {number} listable whether its prelude may also join another's
 * selector list, which a plain block under a plain selector may: `LIST_UNKNOWN`
 * until a join asks, then `LIST_YES` / `LIST_NO`
 * @property {number} listKind which shape answers that - a selector, a keyframe
 * selector or a nested selector
 * @property {RuleEntry[] | null} children a mergeable at-rule's block, else null
 * @property {string} head the block's text but for its last child, so a run of
 * joins appends what it adds rather than re-reading what it has
 * @property {boolean} unordered whether a join left a selector list under it
 * concatenated: its own, or one a child carries. The run that grew it settles
 * it where the run ends (`settleJoinedSeams`), so a join stays what it costs
 * to append rather than re-reading the list it has
 * @property {string | null} list its prelude where a join wrote it, so the next
 * join reads or appends to it rather than cutting it back out of `text`, which
 * would flatten the whole run so far; null to read it off `text`
 * @property {string | null} block the text from its `{` on, held beside `list`
 * for the same reason
 * @property {PrintedDeclaration[] | null} declarations its block's declarations
 * where a join of two blocks under one prelude wrote them, so the next join
 * reads them rather than parsing the whole block again; null to parse `text`
 */

/**
 * @param {Node} node a printed rule
 * @param {RuleEntry} entry its entry
 * @returns {void}
 */
const setRuleEntry = (node, entry) => {
	const i = node;
	// Grown by pushing so it stays a fast holey array however far apart ids are,
	// and here rather than with the columns: only a print writes an entry.
	while (S._ruleEntries.length <= i) S._ruleEntries.push(undefined);
	if (S._ruleEntries[i] === undefined) {
		S._ruleEntryNodes[S._ruleEntryCount++] = i;
	}
	S._ruleEntries[i] = entry;
};

/**
 * @param {Node} node a rule whose text is several rules
 * @param {RuleEntry[]} runs an entry per rule, in the order the text holds them
 * @returns {void}
 */
const setHoistedRuns = (node, runs) => {
	const i = node;
	// A rule records its runs once as it prints, and lowering nesting streams no
	// block, so no id is reused before the entries clear.
	S._hoistedRunNodes[S._hoistedRunCount++] = i;
	S._hoistedRuns[i] = runs;
};

/**
 * The rules a top-level node's text is, where it recorded them: their texts are
 * what it printed, which is the text the sheet carries for it.
 * @param {Node} node a top-level rule
 * @returns {RuleEntry[] | null} an entry per rule, or null
 */
const hoistedRunsOf = (node) => {
	const runs = S._hoistedRuns[node];
	return runs === undefined ? null : runs;
};

/**
 * Forget every entry set since the last call.
 * @returns {void}
 */
const clearRuleEntries = () => {
	for (let i = 0; i < S._ruleEntryCount; i++) {
		S._ruleEntries[S._ruleEntryNodes[i]] = undefined;
	}
	S._ruleEntryCount = 0;
	for (let i = 0; i < S._hoistedRunCount; i++) {
		S._hoistedRuns[S._hoistedRunNodes[i]] = undefined;
	}
	S._hoistedRunCount = 0;
};

// Whether a rule's prelude may join another's selector list. Answered only when
// a join asks - two adjacent rules printing the same block, which is rare - so
// the shape test does not run per rule.
const LIST_UNKNOWN = 0;
const LIST_YES = 1;
const LIST_NO = 2;
// Which shape answers it, kept because the parent it is read from is gone by the
// time a join asks.
const LIST_KIND_SELECTOR = 0;
const LIST_KIND_KEYFRAME = 1;
const LIST_KIND_NESTED = 2;

// Anything else standing in a block: it parts a run rather than joining one.
/** @type {(text: string) => RuleEntry} */
const opaqueEntry = (text) => ({
	text,
	prelude: -1,
	atRule: false,
	plain: false,
	listable: LIST_NO,
	listKind: LIST_KIND_SELECTOR,
	children: null,
	head: "",
	unordered: false,
	list: null,
	block: null,
	declarations: null
});

/**
 * Whether this rule's prelude may join another's selector list, running the
 * shape test the first time a join asks and remembering the answer.
 * @param {RuleEntry} entry a printed rule
 * @returns {boolean} true when its selectors may join a list
 */
const entryListable = (entry) => {
	if (entry.listable === LIST_UNKNOWN) {
		entry.listable = isJoinablePrelude(
			entryPrelude(entry),
			entry.listKind === LIST_KIND_KEYFRAME,
			entry.listKind === LIST_KIND_NESTED
		)
			? LIST_YES
			: LIST_NO;
	}
	return entry.listable === LIST_YES;
};

/**
 * A node's entry, or an opaque one where the text it printed is not the text the
 * block ended up carrying.
 * @param {Node} node a block item
 * @param {string} text the text the block carries for it
 * @returns {RuleEntry} its entry
 */
const ruleEntryOf = (node, text) => {
	const entry = S._ruleEntries[node];
	return entry !== undefined && entry.text === text ? entry : opaqueEntry(text);
};

// WHY: a selector every engine parses - compounds of a type, universal, class,
// id or attribute selector joined by a combinator, and nothing else. One
// selector an engine cannot parse invalidates the whole list, so joining a
// selector it keeps to one it drops loses the first: a pseudo it does not know,
// or a shape the parser passed through without validating. Widening this to the
// pseudos `mdn-data` names earns nothing a user downloads: over Bootstrap 5 it
// saves 195 raw bytes and costs one gzip byte, and which engine reads a pseudo
// is already `pseudosReadable`'s answer rather than this shape's.
const IDENT = String.raw`(?:[-\w\u00A0-\uFFFF]|\\[\s\S])+`;
const STRING = String.raw`"(?:[^"\\]|\\[\s\S])*"|'(?:[^'\\]|\\[\s\S])*'`;
// The matchers Selectors 4 §6 defines, and only `i` after one: an engine that
// cannot read the `s` modifier drops the selector, and with it the list.
const ATTRIBUTE = String.raw`\[(?:${IDENT}\|)?${IDENT}(?:[~|^$*]?=(?:${IDENT}|${STRING})(?: [iI])?)?\]`;
// CSS whitespace: U+00A0 is an identifier's character, not a separator.
const SPACE = "[ \\t\\n\\f\\r]";
/**
 * A pattern matching the word in any ASCII case, where an `i` flag would make V8
 * case-fold the whole `\u00A0-\uFFFF` class too, costing milliseconds to compile.
 * @param {string} word a lowercase word
 * @returns {string} the pattern
 */
const anyCase = (word) =>
	word.replace(/[a-z]/g, (letter) => `[${letter}${letter.toUpperCase()}]`);
const LEGACY_ELEMENT_NAMES = [...LEGACY_PSEUDO_ELEMENTS].map(anyCase).join("|");
// A pseudo-class with no selector inside it: argument-less, or the `An+B` of an
// `:nth-*()`, whose grammar is closed - the one argument a shape may carry.
const PSEUDO_CLASS = String.raw`:(?!(?:${LEGACY_ELEMENT_NAMES})(?![-\w]))(?:(?:${[
	...NTH_PSEUDO_FUNCTIONS
]
	.map(anyCase)
	.join("|")})\(${SPACE}*(?:${anyCase("odd")}|${anyCase(
	"even"
)}|[-+]?(?:\d*[nN](?:${SPACE}*[-+]${SPACE}*\d+)?|\d+))${SPACE}*\)|[-\w]+(?![-\w(]))`;
// A pseudo-element ends the selector it is in: anything after it is no shape
// an engine parses.
const PSEUDO_ELEMENT = String.raw`(?:::[-\w]+|:(?:${LEGACY_ELEMENT_NAMES}))(?![-\w(])`;
const COMPOUND = `(?:\\*|${IDENT}|[.#]${IDENT}|${ATTRIBUTE})(?:[.#]${IDENT}|${ATTRIBUTE}|${PSEUDO_CLASS})*`;
const COMBINATOR = `(?:${SPACE}*[>+~]${SPACE}*|${SPACE}+)`;
const JOINABLE_SELECTOR_RE = new RegExp(
	`^(?:${COMPOUND}${COMBINATOR})*${COMPOUND}(?:${PSEUDO_ELEMENT})?$`
);

// The same, for a rule nested in another: `&` joins there because an engine that
// cannot read it cannot read the block holding it either, so both selectors are
// dropped together rather than one taking the other down.
const NESTED_COMPOUND = `(?:&(?:${COMPOUND})?|${COMPOUND})`;
const JOINABLE_NESTED_RE = new RegExp(
	`^(?:${NESTED_COMPOUND}${COMBINATOR})*${NESTED_COMPOUND}(?:${PSEUDO_ELEMENT})?$`
);

// A keyframe selector is a percentage or `to` - `from` is already printed `0%`.
// Its grammar is closed, so every one of them joins.
const JOINABLE_KEYFRAME_RE = /^(?:\d+(?:\.\d+)?%|to)$/i;

// The full-progress keyframe selector, in every spelling `to` names.
const KEYFRAME_FULL_RE = /^100(?:\.0+)?%$/;

/**
 * Whether a printed prelude is a list of selectors every engine parses, so
 * another may be joined onto it without risking the whole list.
 * @param {string} prelude the printed prelude
 * @param {boolean} keyframe whether the rule sits in a `@keyframes`
 * @param {boolean} nested whether the rule sits in another qualified rule
 * @returns {boolean} true when it may be joined
 */
const isJoinablePrelude = (prelude, keyframe, nested) => {
	const shape = keyframe
		? JOINABLE_KEYFRAME_RE
		: nested
			? JOINABLE_NESTED_RE
			: JOINABLE_SELECTOR_RE;
	// One selector is the common case and needs no list built to walk it.
	if (prelude.includes(",")) {
		for (const one of splitSelectorList(prelude)) {
			if (!shape.test(one)) return false;
		}
	} else if (!shape.test(prelude)) {
		return false;
	}
	return keyframe || pseudosReadable(prelude);
};

// Whether the selection reads each pseudo spelling met, which is the same answer
// for every prelude carrying it and for every stylesheet built for it - so it is
// kept until the selection itself changes rather than cleared per print.
/** @type {Map<string, boolean>} */
const selectorReadMemo = new Map();
/** @type {(number[] | undefined)[] | null} */
let selectorReadFor = null;

/**
 * Whether every target browser reads every pseudo in a prelude. One selector an
 * engine cannot parse invalidates the whole list it is joined into, so a pseudo
 * no target is known to read keeps the selector out of one. An escape and a
 * quoted attribute value are stepped over: the `:` of `.sm\:flex` and of
 * `[href="a:b"]` starts no pseudo.
 * @param {string} prelude a printed prelude the shape accepted
 * @returns {boolean} true when the target reads all of them
 */
const pseudosReadable = (prelude) => {
	if (!prelude.includes(":")) return true;
	if (selectorReadFor !== S._prefixBrowsers) {
		selectorReadMemo.clear();
		selectorReadFor = S._prefixBrowsers;
	}
	for (let i = 0; i < prelude.length; i++) {
		PSEUDO_SCAN_PLAIN.lastIndex = i;
		PSEUDO_SCAN_PLAIN.test(prelude);
		i = PSEUDO_SCAN_PLAIN.lastIndex;
		if (i === prelude.length) break;
		const code = prelude.charCodeAt(i);
		if (code === CC_REVERSE_SOLIDUS) {
			i++;
			continue;
		}
		if (code === CC_QUOTATION_MARK || code === CC_APOSTROPHE) {
			for (i++; i < prelude.length; i++) {
				const inner = prelude.charCodeAt(i);
				if (inner === CC_REVERSE_SOLIDUS) i++;
				else if (inner === code) break;
			}
			continue;
		}
		if (code !== CC_COLON) continue;
		let end = i + 1;
		if (prelude.charCodeAt(end) === CC_COLON) end++;
		const from = end;
		IDENT_RUN.lastIndex = end;
		IDENT_RUN.test(prelude);
		end = IDENT_RUN.lastIndex;
		if (end === from) return false;
		// A pseudo taking an argument is a different entry from the bare one.
		const spelling = `${toLowerCaseIfNeeded(prelude.slice(i, end))}${
			prelude.charCodeAt(end) === CC_LEFT_PARENTHESIS ? "(" : ""
		}`;
		let reads = selectorReadMemo.get(spelling);
		if (reads === undefined) {
			// A pseudo-element reads with one colon as well as two, and the table
			// carries whichever spelling the standard names.
			const since =
				getSelectorSupportedFrom().get(spelling) ||
				(spelling.charCodeAt(1) === CC_COLON
					? undefined
					: getSelectorSupportedFrom().get(`:${spelling}`));
			// A pseudo the table does not name is one no engine is known to parse -
			// a vendor spelling, a CSS-modules one, or simply newer than the data -
			// and no selection makes it safe, so this precedes the target check.
			reads =
				since !== undefined &&
				(S._prefixBrowsers === null
					? readByEveryEngine(since)
					: readsAll(since));
			selectorReadMemo.set(spelling, reads);
		}
		if (!reads) return false;
		i = end - 1;
	}
	return true;
};

/**
 * Whether two property sets can name the same declaration - `all` holds the
 * lot, and a shorthand holds every longhand it sets, which is not always one
 * its name prefixes (`inset` sets `top`, `font` sets `line-height`).
 * @param {Set<string>} a one block's properties
 * @param {Set<string>} b the other's
 * @returns {boolean} true when a declaration in one could be shadowed by the other
 */
const propertiesOverlap = (a, b) => {
	if (a.has("all") || b.has("all")) return true;
	/** @type {Set<string>} */
	const names = new Set();
	for (const property of a) {
		eachPropertyName(property, (name) => {
			names.add(name);
		});
	}
	for (const property of b) {
		if (eachPropertyName(property, (name) => names.has(name))) return true;
	}
	return false;
};

/**
 * Where a piece a walk over a printed block reads whole ends: an escape, or an
 * unquoted `url()`, whose body is the token's rather than CSS to read.
 * @param {string} body the printed text
 * @param {number} i index of a backslash or a `u` outside any string
 * @returns {number} index of the piece's last character, or `i` where none starts
 */
const printedPieceEnd = (body, i) => {
	if (body.charCodeAt(i) === CC_REVERSE_SOLIDUS) return i + 1;
	UNQUOTED_URL_START_RE.lastIndex = i;
	if (
		isIdentCodePoint(body.charCodeAt(i - 1)) ||
		!UNQUOTED_URL_START_RE.test(body)
	) {
		return i;
	}
	let end = UNQUOTED_URL_START_RE.lastIndex;
	while (end < body.length && body.charCodeAt(end) !== CC_RIGHT_PARENTHESIS) {
		if (body.charCodeAt(end) === CC_REVERSE_SOLIDUS) end++;
		end++;
	}
	return end;
};

/**
 * The properties a printed block declares at its top level. A nested rule is not
 * one, and neither is anything inside a string, a call or a block.
 * @param {string} body the block's text, its braces excluded
 * @returns {Set<string>} the property names, lowercased
 */
const blockProperties = (body) => {
	/** @type {Set<string>} */
	const out = new Set();
	let depth = 0;
	let quote = 0;
	let start = 0;
	let colon = -1;
	let block = false;
	for (let i = 0; i < body.length; i++) {
		const cc = body.charCodeAt(i);
		if (quote !== 0) {
			if (cc === CC_REVERSE_SOLIDUS) {
				i++;
			} else if (cc === quote) {
				quote = 0;
			}
			continue;
		}
		if (cc === CC_REVERSE_SOLIDUS || (cc | 0x20) === CC_LOWER_U) {
			i = printedPieceEnd(body, i);
			continue;
		}
		if (cc === CC_QUOTATION_MARK || cc === CC_APOSTROPHE) {
			quote = cc;
		} else if (
			cc === CC_LEFT_PARENTHESIS ||
			cc === CC_LEFT_SQUARE ||
			cc === CC_LEFT_CURLY
		) {
			if (depth === 0 && cc === CC_LEFT_CURLY) block = true;
			depth++;
		} else if (
			cc === CC_RIGHT_PARENTHESIS ||
			cc === CC_RIGHT_SQUARE ||
			cc === CC_RIGHT_CURLY
		) {
			depth--;
		} else if (depth === 0) {
			if (cc === CC_COLON && colon === -1) {
				colon = i;
			} else if (cc === CC_SEMICOLON) {
				if (colon !== -1 && !block) {
					out.add(toLowerCaseIfNeeded(body.slice(start, colon)));
				}
				start = i + 1;
				colon = -1;
				block = false;
			}
		}
	}
	if (colon !== -1 && !block) {
		out.add(toLowerCaseIfNeeded(body.slice(start, colon)));
	}
	return out;
};

// The `!important` a printed declaration ends in, whatever it was written as.
// An even run of `\` before the `!` escapes only itself.
const PRINTED_IMPORTANT_RE = /(?<=(?:^|[^\\])(?:\\\\)*)!\s*important$/i;

/** @typedef {{ property: string, value: string, text: string }} PrintedDeclaration one declaration of a printed block: its lowercased property, its value and its whole text */

/**
 * The declarations one printed block holds, each as the whole of what it is
 * written as. Built on the same walk `blockProperties` makes, since what a
 * declaration is here is the same question. Null where the block holds anything
 * else - a nested rule of its own, whose declarations are read at its place
 * rather than at the block's.
 * @param {string} body the block's printed body, between its braces
 * @returns {PrintedDeclaration[] | null} the declarations, in order, or null
 */
const blockDeclarations = (body) => {
	/** @type {PrintedDeclaration[]} */
	const out = [];
	let depth = 0;
	let quote = 0;
	let start = 0;
	let colon = -1;
	let block = false;
	/**
	 * @param {number} end where the declaration ends
	 * @returns {boolean} true where it is one, or nothing at all
	 */
	const take = (end) => {
		// A printed block holds no empty declaration - the printer drops those -
		// so anything without a value is a block this cannot answer for.
		if (block || colon === -1) return false;
		out.push({
			property: toLowerCaseIfNeeded(body.slice(start, colon)),
			value: body.slice(colon + 1, end),
			text: body.slice(start, end)
		});
		return true;
	};
	for (let i = 0; i < body.length; i++) {
		const cc = body.charCodeAt(i);
		if (quote !== 0) {
			if (cc === CC_REVERSE_SOLIDUS) {
				i++;
			} else if (cc === quote) {
				quote = 0;
			}
			continue;
		}
		if (cc === CC_REVERSE_SOLIDUS || (cc | 0x20) === CC_LOWER_U) {
			i = printedPieceEnd(body, i);
			continue;
		}
		if (cc === CC_QUOTATION_MARK || cc === CC_APOSTROPHE) {
			quote = cc;
		} else if (
			cc === CC_LEFT_PARENTHESIS ||
			cc === CC_LEFT_SQUARE ||
			cc === CC_LEFT_CURLY
		) {
			if (depth === 0 && cc === CC_LEFT_CURLY) block = true;
			depth++;
		} else if (
			cc === CC_RIGHT_PARENTHESIS ||
			cc === CC_RIGHT_SQUARE ||
			cc === CC_RIGHT_CURLY
		) {
			depth--;
		} else if (depth === 0) {
			if (cc === CC_COLON && colon === -1) {
				colon = i;
			} else if (cc === CC_SEMICOLON) {
				if (!take(i)) return null;
				start = i + 1;
				colon = -1;
				block = false;
			}
		}
	}
	return take(body.length) ? out : null;
};

/**
 * Whether two ranges of two strings read the same, without cutting either out.
 * @param {string} a the first string
 * @param {number} aStart where its range starts
 * @param {number} aEnd where its range ends
 * @param {string} b the second string
 * @param {number} bStart where its range starts
 * @param {number} bEnd where its range ends
 * @returns {boolean} true when the two ranges are equal
 */
const rangesEqual = (a, aStart, aEnd, b, bStart, bEnd) => {
	const length = aEnd - aStart;
	if (length !== bEnd - bStart) return false;
	// A long range, as a printed block body is, takes one builtin call where
	// the loop makes two a character in unoptimized code.
	if (length > 8) return a.startsWith(b.slice(bStart, bEnd), aStart);
	for (let i = 0; i < length; i++) {
		if (a.charCodeAt(aStart + i) !== b.charCodeAt(bStart + i)) return false;
	}
	return true;
};

/**
 * A rule's prelude, read from where a join holds it.
 * @param {RuleEntry} entry the rule
 * @returns {string} its prelude, as printed
 */
const entryPrelude = (entry) =>
	entry.list === null ? entry.text.slice(0, entry.prelude) : entry.list;

/**
 * Whether two rules' blocks say the same, each read from where it is held.
 * @param {RuleEntry} a one rule
 * @param {RuleEntry} b another
 * @returns {boolean} true when the blocks are equal
 */
const blocksEqual = (a, b) => {
	const aText = a.block === null ? a.text : a.block;
	const aStart = a.block === null ? a.prelude : 0;
	const bText = b.block === null ? b.text : b.block;
	const bStart = b.block === null ? b.prelude : 0;
	return rangesEqual(aText, aStart, aText.length, bText, bStart, bText.length);
};

// A layer with no name: the one at-rule prelude that is not the same rule twice.
const ANONYMOUS_LAYER_RE = /^@layer[ \t\n\r\f]*$/i;

/**
 * Whether a prelude opens a layer of its own rather than naming one, which no
 * join may treat as the same rule written twice. The plain spelling answers
 * from the regexp, and only a prelude carrying a backslash is read again.
 * @param {string} prelude the printed prelude, `@` included
 * @returns {boolean} true for an anonymous `@layer`
 */
const isAnonymousLayerPrelude = (prelude) => {
	if (ANONYMOUS_LAYER_RE.test(prelude)) return true;
	if (!prelude.includes("\\")) return false;
	const match = AT_RULE_NAME_RE.exec(prelude);
	return (
		match !== null &&
		atKeyword(match[1]) === "layer" &&
		trimCssWhiteSpace(prelude.slice(match[0].length)).length === 0
	);
};

/**
 * Join two adjacent rules into one. A qualified rule keeps its block and gathers
 * the other's selectors; an at-rule keeps its prelude and gathers the other's
 * block - the block of a condition the sheet already opened once, whose own
 * rules then meet at the seam and are offered the same join.
 * @param {RuleEntry} before the earlier rule
 * @param {RuleEntry} entry the later rule
 * @param {boolean} owned whether `before` is this run's own accumulator, whose
 * children may be extended rather than copied
 * @returns {RuleEntry | null} the one rule, or `null` when they do not join
 */
/**
 * The one declaration a block child is, or null for a rule or an at-rule.
 * @param {RuleEntry} child one child of a joined block
 * @returns {PrintedDeclaration | null} the declaration it writes
 */
const childDeclaration = (child) => {
	if (child.prelude !== -1 || child.atRule) return null;
	const text = child.text.endsWith(";") ? child.text.slice(0, -1) : child.text;
	const declarations = blockDeclarations(text);
	return declarations !== null && declarations.length === 1
		? declarations[0]
		: null;
};

/**
 * Take back each declaration a later one a join appended overrides: the same
 * property, with only declarations between, which the later one wins against
 * unless the earlier is `!important` or a fallback the later may not be read in.
 * @param {RuleEntry[]} joined the joined block's children, in order
 * @param {number} added how many of them the join appended
 * @returns {boolean} true when any earlier declaration was taken back
 */
const dropOverriddenDeclarations = (joined, added) => {
	let dropped = false;
	for (let i = joined.length - added; i < joined.length; i++) {
		const later = childDeclaration(joined[i]);
		if (later === null) continue;
		for (let j = i - 1; j >= 0; j--) {
			const earlier = childDeclaration(joined[j]);
			if (earlier === null) break;
			if (earlier.property !== later.property) continue;
			if (
				!PRINTED_IMPORTANT_RE.test(earlier.text) &&
				sameVocabulary(later.value.trim(), earlier.value.trim(), later.property)
			) {
				joined.splice(j, 1);
				i--;
				dropped = true;
			}
			break;
		}
	}
	return dropped;
};

/**
 * Take back each child an identical later one makes dead, reading only the ones
 * a join has just appended. A child whose place is what it says is never one.
 * @param {RuleEntry[]} joined the joined block's children, in order
 * @param {number} added how many of them the join appended
 * @returns {boolean} true when any earlier child was taken back
 */
const dropRepeatedChildren = (joined, added) => {
	let dropped = false;
	let i = joined.length - added;
	// The texts of every child before `i`, so one no earlier child repeats is
	// told so without reading them all again.
	let earlier = childTexts(joined, i);
	while (i < joined.length) {
		const text = joined[i].text;
		if (!earlier.has(text) || namesPositionalAtRule(text)) {
			earlier.add(text);
			i++;
			continue;
		}
		let j = i - 1;
		while (joined[j].text !== text) j--;
		joined.splice(j, 1);
		dropped = true;
		i--;
		// The two the drop leaves side by side meet here for the first time, and
		// the join that takes them leaves the pair before that one meeting too.
		let at = j;
		while (at > 0 && at < joined.length) {
			const merged = joinRuleEntries(joined[at - 1], joined[at], false);
			if (merged === null) break;
			joined[at - 1] = merged;
			joined.splice(at, 1);
			// The drop was at or before `i`, and so is each join walking back from it.
			i--;
			at--;
		}
		i++;
		// The drop and the joins rewrote children before `i`, which a splice
		// already pays for reading.
		S._childTextReads.delete(joined);
		earlier = childTexts(joined, i);
	}
	S._childTextReads.set(joined, { texts: earlier, count: joined.length });
	return dropped;
};

/**
 * The texts of a block's first children, read on from those of the children
 * the last drop of the same block read.
 * @param {RuleEntry[]} joined the block's children, in order
 * @param {number} end how many of them to read
 * @returns {Set<string>} their texts
 */
const childTexts = (joined, end) => {
	const read = S._childTextReads.get(joined);
	const known = read !== undefined && read.count <= end;
	/** @type {Set<string>} */
	const texts = known ? read.texts : new Set();
	for (let i = known ? read.count : 0; i < end; i++) {
		texts.add(joined[i].text);
	}
	return texts;
};

/**
 * What a joined block says up to its last child, which is held apart so the `;`
 * a `}` makes redundant is dropped from it alone.
 * @param {RuleEntry[]} joined the joined block's children, in order
 * @returns {string} the text of every child but the last
 */
const joinedHead = (joined) => {
	let head = "";
	for (let i = 0; i < joined.length - 1; i++) head += joined[i].text;
	return head;
};

/**
 * The text a joined block prints. Each block dropped the `;` its own `}` made
 * redundant; the one that is no longer last brings its own back, so the joined
 * body drops it again - only the last child can end in one.
 * @param {string} prelude the block's prelude, as printed
 * @param {string} head the text of every child but the last
 * @param {RuleEntry[]} joined the joined block's children, in order
 * @returns {string} the rule the block prints as
 */
const joinedBlockText = (prelude, head, joined) => {
	const last = joined[joined.length - 1];
	let lastText = last.text;
	// Read off the block where a join holds one: the text before it is a list a
	// run of joins is still growing, which reading any of the text flattens. An
	// at-rule ends in its `}`, and is a block a run may be growing too.
	if (last.block !== null || last.atRule) {
		return `${prelude}{${head}${lastText}}`;
	}
	while (
		lastText.length !== 0 &&
		lastText.charCodeAt(lastText.length - 1) === CC_SEMICOLON
	) {
		lastText = lastText.slice(0, -1);
	}
	return `${prelude}{${head}${lastText}}`;
};

/**
 * Whether any of a block's children carries a list a join left concatenated.
 * @param {RuleEntry[]} joined the joined block's children
 * @returns {boolean} true when one of them is still to settle
 */
const anyUnordered = (joined) => {
	for (let i = 0; i < joined.length; i++) {
		if (joined[i].unordered) return true;
	}
	return false;
};

/**
 * Join two adjacent rules into one. A qualified rule keeps its block and gathers
 * the other's selectors; an at-rule keeps its prelude and gathers the other's
 * block - the block of a condition the sheet already opened once, whose own
 * rules then meet at the seam and are offered the same join.
 * @param {RuleEntry} before the earlier rule
 * @param {RuleEntry} entry the later rule
 * @param {boolean} owned whether `before` is this run's own accumulator, whose
 * children may be extended rather than copied
 * @returns {RuleEntry | null} the one rule, or `null` when they do not join
 */
const joinRuleEntries = (before, entry, owned) => {
	if (!S._transforms.mergeRules) return null;
	if (before.prelude === -1 || entry.prelude === -1) return null;
	if (before.atRule !== entry.atRule) return null;
	// Compared where they stand: two rules meet far more often than they join, and
	// cutting each one's prelude and block out to answer that is two pieces of
	// string per meeting for an answer that is usually no.
	const preludesEqual = rangesEqual(
		before.list === null ? before.text : before.list,
		0,
		before.prelude,
		entry.list === null ? entry.text : entry.list,
		0,
		entry.prelude
	);
	if (before.atRule) {
		if (!preludesEqual) return null;
		const beforePrelude = entryPrelude(before);
		// CSS Cascade 5 §6.4.1: every `@layer {` opens a layer of its own, and a
		// later layer beats an earlier one whatever the selectors say - so joining
		// the two hands the block back to specificity.
		if (isAnonymousLayerPrelude(beforePrelude)) return null;
		// An at-rule's entry always lists its children, opaque ones included.
		const beforeChildren = /** @type {RuleEntry[]} */ (before.children);
		const children = /** @type {RuleEntry[]} */ (entry.children);
		// An empty block can be the whole point of the rule - `@layer a{}` declares
		// where the layer sits in the cascade - so it is never folded away.
		if (beforeChildren.length === 0 || children.length === 0) return null;
		// A run of them extends one array rather than copying a growing one.
		const joined = owned ? beforeChildren : [...beforeChildren];
		let at = joined.length - 1;
		// Whether the seam reached back past the last child, so the head names text
		// that is gone.
		let refolded = false;
		// A list either side already carries concatenated is still one to settle,
		// so the block it lands in says so too.
		let unordered = before.unordered || entry.unordered;
		// The same block twice is one block: nothing stands between them, so the
		// later copy only restates what the earlier already says.
		let from = children.length;
		/** @type {RuleEntry | null} */
		let tail = null;
		if (
			!rangesEqual(
				before.text,
				before.prelude,
				before.text.length,
				entry.text,
				entry.prelude,
				entry.text.length
			)
		) {
			// Both sides are joined already, so the pair meeting at the seam is the
			// one new adjacency. A run whose blocks nest one block each grows the
			// last child every join, which this run then owns as it owns the block.
			const seam = joinRuleEntries(
				joined[at],
				children[0],
				owned && S._joinedTails.get(before) === joined[at]
			);
			from = seam === null ? 0 : 1;
			// The seam concatenates like any other join, and is noted rather than
			// ordered: ordering each as it is made re-reads a list still growing.
			// `settleJoinedSeams` orders it where the run ends.
			if (seam !== null) {
				S._childTextReads.delete(joined);
				joined[at] = seam;
				unordered = unordered || seam.unordered;
				// A seam that joined two blocks can now print what the child before it
				// does, which makes that pair one more adjacency to offer the join.
				while (at > 0) {
					const folded = joinRuleEntries(joined[at - 1], joined[at], false);
					if (folded === null) break;
					joined.splice(at - 1, 2, folded);
					at--;
					unordered = unordered || folded.unordered;
					refolded = true;
				}
				// An at-rule join writes a new entry, which no other block holds.
				if (from === children.length && joined[at].atRule) tail = joined[at];
			}
		}
		let head = refolded ? joinedHead(joined) : before.head;
		// Whatever the join leaves before the new last child joins the head, which
		// is why a run costs what it adds rather than what it has.
		if (from < children.length) {
			head += joined[at].text;
			for (let i = from; i < children.length - 1; i++) head += children[i].text;
		}
		for (let i = from; i < children.length; i++) joined.push(children[i]);
		// The same rule twice in a block is read once: the later writes the same
		// declarations to the same elements and wins the tie.
		if (from < children.length && S._transforms.removeDeadRules) {
			const added = children.length - from;
			const repeated = dropRepeatedChildren(joined, added);
			// A repeat drop shortens the run, never the appended tail it read.
			const dropped =
				dropOverriddenDeclarations(joined, Math.min(added, joined.length)) ||
				repeated;
			if (dropped) {
				head = joinedHead(joined);
				// The drop leaves two children side by side and joins them, which is a
				// seam of its own - read back off the children rather than through the
				// boolean the drop answers with.
				unordered = unordered || anyUnordered(joined);
			}
		}
		/** @type {RuleEntry} */
		const merged = {
			text: joinedBlockText(beforePrelude, head, joined),
			prelude: before.prelude,
			atRule: true,
			plain: false,
			listable: LIST_NO,
			listKind: LIST_KIND_SELECTOR,
			children: joined,
			head,
			unordered,
			list: beforePrelude,
			block: null,
			declarations: null
		};
		if (tail !== null) S._joinedTails.set(merged, tail);
		return merged;
	}
	const sameBlocks = blocksEqual(before, entry);
	// The same selector twice is one rule: nothing stands between them, so its
	// declarations are read in the order they were written either way.
	if (preludesEqual) {
		// Two identical rules are one: only the last of a set of identical
		// declarations can be read, so the earlier block says nothing.
		if (sameBlocks) return before;
		// Declarations after a nested rule are the implicit `& {...}` the engine
		// builds for them, which is a rule the sheet did not have.
		if (!before.plain) return null;
		const beforePrelude = entryPrelude(before);
		const rest = entry.text.slice(entry.prelude + 1, -1);
		// One block holds a property once, so two blocks join only where the later
		// declaration is one the earlier could not have been read behind.
		const earlier =
			before.declarations === null
				? blockDeclarations(before.text.slice(before.prelude + 1, -1))
				: before.declarations;
		if (earlier === null) return null;
		// The later block's declarations, and only where it holds nothing else: a
		// nested rule leaves the properties readable but not their values.
		const later = S._transforms.removeDeadRules
			? blockDeclarations(rest)
			: null;
		const names =
			later === null
				? blockProperties(rest)
				: new Set(later.map((one) => one.property));
		/** @type {Set<number>} */
		const dropped = new Set();
		for (const [at, one] of earlier.entries()) {
			for (const other of names) {
				if (one.property === other) {
					/** @type {string | null} */
					let value = null;
					// The last of that property, not the first: it is what the later
					// block leaves standing, and a `revert` there reads back to it.
					if (later !== null) {
						for (const held of later) {
							if (held.property === other) value = held.value;
						}
					}
					// An `!important` earlier declaration still wins, so it is not
					// behind the later one at all.
					if (
						value === null ||
						PRINTED_IMPORTANT_RE.test(one.text) ||
						!sameVocabulary(value.trim(), one.value.trim(), one.property)
					) {
						return null;
					}
					dropped.add(at);
					continue;
				}
				if (
					one.property === "all" ||
					other === "all" ||
					one.property.startsWith(`${other}-`) ||
					other.startsWith(`${one.property}-`)
				) {
					return null;
				}
			}
		}
		const kept =
			dropped.size === 0
				? earlier
				: earlier.filter((_, at) => !dropped.has(at));
		const added =
			later !== null ? later : rest.length === 0 ? [] : blockDeclarations(rest);
		/** @type {PrintedDeclaration[] | null} */
		let declarations = null;
		let joined;
		// Carried as a list only where reading the joined text back would split it
		// the same way, which a quote the split reads as left open would not.
		if (
			added === null ||
			!lastDeclarationCloses(added) ||
			(before.declarations === null && !lastDeclarationCloses(earlier))
		) {
			const keptText = kept.map((one) => one.text).join(";");
			joined = orderJoinedBody(
				keptText.length === 0 || rest.length === 0
					? keptText + rest
					: mergeJoinedBody(`${keptText};${rest}`),
				before.plain && entry.plain
			);
		} else {
			declarations = orderJoinedDeclarations(
				kept.length === 0 || added.length === 0
					? [...kept, ...added]
					: mergeJoinedBoxLonghands([...kept, ...added]),
				before.plain && entry.plain
			);
			// Each block already dropped the `;` its own `}` made redundant, so the
			// one that is no longer last needs it back.
			joined = declarations.map((one) => one.text).join(";");
		}
		return {
			text: `${beforePrelude}{${joined}}`,
			prelude: before.prelude,
			atRule: false,
			plain: entry.plain,
			// The same prelude answers the same way, so the join carries the state it
			// is in rather than resolving it - unless the block it took on is not one
			// a list may lend its selectors to.
			listable: entry.plain ? before.listable : LIST_NO,
			listKind: before.listKind,
			children: null,
			head: "",
			// The two preludes are equal, so the list this keeps is the one `before`
			// already carried - settled or not.
			unordered: before.unordered,
			list: beforePrelude,
			block: null,
			declarations
		};
	}
	if (!sameBlocks || !entryListable(before) || !entryListable(entry)) {
		return null;
	}
	// Concatenated, never canonicalized here: a run of joins would then re-read
	// the whole list once per rule. It is noted as a list still to settle, and
	// the run that grew it orders it once where it ends.
	const list = `${entryPrelude(before)},${entryPrelude(entry)}`;
	const block =
		before.block === null ? before.text.slice(before.prelude) : before.block;
	return {
		text: list + block,
		prelude: list.length,
		atRule: false,
		plain: true,
		listable: LIST_YES,
		listKind: before.listKind,
		children: null,
		head: "",
		unordered: true,
		list,
		block,
		declarations: null
	};
};

/**
 * `mergeJoinedBoxLonghands` over a joined block's text.
 * @param {string} body the joined block's declarations
 * @returns {string} the body, each family it could merge merged
 */
const mergeJoinedBody = (body) => {
	if (!S._transforms.mergeLonghands) return body;
	const declarations = blockDeclarations(body);
	if (declarations === null) return body;
	const merged = mergeJoinedBoxLonghands(declarations);
	return merged === declarations
		? body
		: merged.map((one) => one.text).join(";");
};

/**
 * `orderJoinedDeclarations` over a joined block's text.
 * @param {string} body the joined body, its braces excluded
 * @param {boolean} plain whether it holds declarations and nothing else
 * @returns {string} the body, reordered where that is allowed
 */
const orderJoinedBody = (body, plain) => {
	if (!plain || !S._transforms.reorderDeclarations) return body;
	const declarations = blockDeclarations(body);
	if (declarations === null) return body;
	const ordered = orderJoinedDeclarations(declarations, plain);
	return ordered === declarations
		? body
		: ordered.map((one) => one.text).join(";");
};

/**
 * Whether the last of a printed block's declarations leaves the split that read
 * them where it started: outside a string and every bracket. Only the last can
 * end elsewhere, since the split parts the others only there.
 * @param {PrintedDeclaration[]} declarations the declarations, in order
 * @returns {boolean} true when a text joined after them is read on its own
 */
const lastDeclarationCloses = (declarations) => {
	if (declarations.length === 0) return true;
	const text = declarations[declarations.length - 1].text;
	let depth = 0;
	let quote = 0;
	for (let i = 0; i < text.length; i++) {
		const cc = text.charCodeAt(i);
		if (quote !== 0) {
			if (cc === CC_REVERSE_SOLIDUS) {
				i++;
			} else if (cc === quote) {
				quote = 0;
			}
		} else if (cc === CC_REVERSE_SOLIDUS || (cc | 0x20) === CC_LOWER_U) {
			i = printedPieceEnd(text, i);
		} else if (cc === CC_QUOTATION_MARK || cc === CC_APOSTROPHE) {
			quote = cc;
		} else if (
			cc === CC_LEFT_PARENTHESIS ||
			cc === CC_LEFT_SQUARE ||
			cc === CC_LEFT_CURLY
		) {
			depth++;
		} else if (
			cc === CC_RIGHT_PARENTHESIS ||
			cc === CC_RIGHT_SQUARE ||
			cc === CC_RIGHT_CURLY
		) {
			depth--;
		}
	}
	return quote === 0 && depth === 0;
};

/**
 * A joined style rule's declarations in the order `declarationOrder` prints
 * one in, which each half was already in but the two concatenated need not be.
 * @param {PrintedDeclaration[]} declarations the joined block's declarations
 * @param {boolean} plain whether it holds declarations and nothing else
 * @returns {PrintedDeclaration[]} them, reordered where that is allowed
 */
const orderJoinedDeclarations = (declarations, plain) => {
	if (!plain || !S._transforms.reorderDeclarations) return declarations;
	if (declarations.length < 2) return declarations;
	const order = declarationOrder(
		declarations.map((one) => one.text),
		null,
		null
	);
	return order === null ? declarations : order.map((at) => declarations[at]);
};

// The group rules whose declarations, nested in a style rule, are the implicit
// `& {}` rule CSS Nesting 1 §3.2 reads them as.
const NESTED_GROUP_AT_RULES = new Set([
	"container",
	"layer",
	"media",
	"scope",
	"starting-style",
	"supports"
]);

// The at-rules whose prelude may open with `(` right after the name, as the
// join writes them: every engine reading one tokenizes `@supports(` as the
// at-keyword and a block. `@media` keeps its space for engines older than that.
const PAREN_OPENER_SPACED_RE = /^@(?:container|scope|supports) \(/;

// A named layer block, up to the `{` its body opens with: an escaped `{` is
// part of the name, and a quote is no layer name's.
const NAMED_LAYER_BLOCK_RE = /^@layer (?:[^{;\\"']|\\[\s\S])+\{/;

/**
 * Settle a parent's record of the layers already out against a block that
 * streamed past it. Only the layer that block wrote ends here - another is a
 * layer of its own, whose order against this one the cascade fixes.
 * @param {Map<string, SeenLayer>} layers what the parent has noted
 * @param {string | null} opener the block's `@layer <name>{`, null when it names none
 * @returns {void}
 */
const closeStreamedLayer = (layers, opener) => {
	if (opener === null) {
		layers.clear();
		return;
	}
	// Read as opening a layer of its own: its body is not there to say otherwise.
	noteLayerBlock(
		layers,
		trimCssWhiteSpace(opener.slice(NAMED_LAYER_OPENER_HEAD, -1)),
		true
	);
	layers.delete(opener);
};

/**
 * Note where a streamed named layer block ends, against the blocks its parent
 * has noted. The `}` closing it is what a later block of that layer folds into.
 * @param {number} d the block's depth
 * @param {string} opener its `@layer <name>{`
 * @param {number} at the piece its `}` went out as
 * @param {boolean} semicolon whether its `}` dropped the `;` its body ended in
 * @param {PriorTopLevel | null} last the rule its body ended on, if it ended on one
 * @returns {void}
 */
const noteStreamedLayerClose = (d, opener, at, semicolon, last) => {
	let layers = d === 0 ? S._seenTopLevelLayers : S._frameSeenLayers[d - 1];
	if (layers === null) {
		layers = new Map();
		if (d === 0) S._seenTopLevelLayers = layers;
		else S._frameSeenLayers[d - 1] = layers;
	}
	// Held as a piece a fold grows, so the rules a later block brings are keyed
	// alongside the ones this block wrote out as it streamed.
	layers.set(opener, {
		at,
		subtree: false,
		semicolon,
		taken: new TakenPiece(at, "}", -1),
		last
	});
};

/**
 * Whether a printed block's body ends in a declaration, or other item carrying
 * a `;`, which the block's `}` made redundant.
 * @param {RuleEntry} entry the block as printed
 * @returns {boolean} true when its last child carries a `;`
 */
const entryEndsInSemicolon = (entry) => {
	const children = entry.children;
	if (children === null || children.length === 0) return false;
	const last = children[children.length - 1].text;
	return last.charCodeAt(last.length - 1) === CC_SEMICOLON;
};

/**
 * The body of a later block of a named layer as it folds in behind the block
 * already out: with the `;` that block's `}` dropped back where it ended in one.
 * @param {SeenLayer} seen the block already out
 * @param {string} body the later block's body, its `}` included
 * @param {RuleEntry} entry the later block as printed
 * @returns {string} what to fold in
 */
const layerFoldBody = (seen, body, entry) => {
	const folded = seen.semicolon === true ? `;${body}` : body;
	seen.semicolon = entryEndsInSemicolon(entry);
	return folded;
};

/**
 * The `@layer <name> {` a printed sibling opens with, when the whole of it is
 * one named layer block. An anonymous `@layer {` is a layer of its own and is
 * not one of these (see `ANONYMOUS_LAYER_RE`).
 * @param {string} text a sibling's printed text
 * @returns {string | null} its opener, or null when it is not such a block
 */
const namedLayerOpener = (text) => {
	if (text.length === 0 || text.charCodeAt(0) !== CC_AT_SIGN) return null;
	if (text.charCodeAt(text.length - 1) !== CC_RIGHT_CURLY) return null;
	const opener = NAMED_LAYER_BLOCK_RE.exec(text);
	return opener === null ? null : opener[0];
};

// `@layer ` - what an opener carries in front of the layer it names.
const NAMED_LAYER_OPENER_HEAD = "@layer ".length;

/** @typedef {{ at: number, subtree: boolean, taken?: TakenPiece, entry?: RuleEntry, owned?: boolean, gathered?: GatheredLayerText, statement?: boolean, semicolon?: boolean, last?: PriorTopLevel | null }} SeenLayer a named block already out, whether a later sibling wrote inside its layer's subtree, the piece its rules are keyed in, the entry a later block of its layer joins against, whether a gather wrote that entry, the text a gather defers, whether it is still the `@layer <name>;` statement its first block takes the place of, whether its `}` dropped a `;` a body folded in behind needs back, and the rule a streamed block wrote last, which a body folded in behind stands next to */

// A statement naming one layer: where it stands, that layer's block may.
const LAYER_STATEMENT_RE = /^@layer ([^\s,;{}]+);$/;

// Where an unquoted `url(` starts: its body is the token's, not CSS to read.
const UNQUOTED_URL_START_RE = /url\((?![ \t\n\f\r]*["'])/iy;

/**
 * Drop the blocks a node standing between them could reorder. Only a write into
 * the very same layer does: a layer's own declarations outrank its sublayers
 * whichever side they are written, and two layers that are not one are ordered
 * where each was first named, so neither moves when a block folds across it.
 * @param {Map<string, SeenLayer>} layers the blocks seen so far, by opener
 * @param {string} text the node's printed text
 * @returns {void}
 */
const forgetLayersWritten = (layers, text) => {
	if (layers.size === 0 || !text.includes("@layer")) return;
	/** @type {Set<string>} */
	const written = new Set();
	// Read only what the parser would: `@layer` inside a string or a comment is
	// text. An anonymous `@layer{` names nothing, so it collides with nothing.
	for (let i = 0; i < text.length; i++) {
		const c = text.charCodeAt(i);
		// An escaped code point opens nothing, and an unquoted `url(` holds a `/*`
		// as part of the address, so neither starts a string or a comment.
		if (c === CC_REVERSE_SOLIDUS) {
			i++;
			continue;
		}
		UNQUOTED_URL_START_RE.lastIndex = i;
		if (
			(c | 0x20) === CC_LOWER_U &&
			!isIdentCodePoint(text.charCodeAt(i - 1)) &&
			UNQUOTED_URL_START_RE.test(text)
		) {
			while (++i < text.length && text.charCodeAt(i) !== CC_RIGHT_PARENTHESIS) {
				if (text.charCodeAt(i) === CC_REVERSE_SOLIDUS) i++;
			}
			continue;
		}
		if (c === CC_QUOTATION_MARK || c === CC_APOSTROPHE) {
			while (++i < text.length && text.charCodeAt(i) !== c) {
				if (text.charCodeAt(i) === CC_REVERSE_SOLIDUS) i++;
			}
			continue;
		}
		if (c === CC_SOLIDUS && text.charCodeAt(i + 1) === CC_ASTERISK) {
			const close = text.indexOf("*/", i + 2);
			i = close === -1 ? text.length : close + 1;
			continue;
		}
		if (c !== CC_AT_SIGN || !text.startsWith("@layer", i)) continue;
		let end = i + "@layer".length;
		if (end >= text.length || !isAsciiWhitespace(text.charCodeAt(end))) {
			continue;
		}
		while (
			end < text.length &&
			text.charCodeAt(end) !== CC_LEFT_CURLY &&
			text.charCodeAt(end) !== CC_SEMICOLON
		) {
			end++;
		}
		for (const name of text.slice(i + "@layer".length, end).split(",")) {
			const trimmed = trimCssWhiteSpace(name);
			if (trimmed !== "") written.add(trimmed);
		}
		i = end;
	}
	for (const opener of layers.keys()) {
		if (
			written.has(trimCssWhiteSpace(opener.slice(NAMED_LAYER_OPENER_HEAD, -1)))
		) {
			layers.delete(opener);
		}
	}
};

/**
 * Record what a named block about to go out does to the ones already out. A
 * block writes into its own layer, and into layers under it only when it opens
 * one - and a block for `a.b` writes where a block for `a` opening `b` inside
 * itself writes, so the two spellings are one layer and the order within it is
 * one the cascade reads. A block whose subtree a later sibling wrote into may
 * still be folded into, but only by one that stays in its own layer.
 * @param {Map<string, SeenLayer>} layers the blocks seen so far, by opener
 * @param {string} name the layer this block opens
 * @param {boolean} deep whether it opens a layer of its own
 * @returns {void}
 */
const noteLayerBlock = (layers, name, deep) => {
	for (const [opener, seen] of layers) {
		const other = trimCssWhiteSpace(opener.slice(NAMED_LAYER_OPENER_HEAD, -1));
		if (other === name) continue;
		if (name.startsWith(`${other}.`)) seen.subtree = true;
		else if (deep && other.startsWith(`${name}.`)) layers.delete(opener);
	}
};

/**
 * Whether a named layer block opens a layer of its own inside itself.
 * @param {string} text the block's printed text
 * @param {string} opener its `@layer <name> {`
 * @returns {boolean} whether it writes past its own layer
 */
const opensNestedLayer = (text, opener) =>
	text.includes("@layer", opener.length);

// The at-rules whose place in the sheet is what they say: where a layer is first
// named fixes its order, and `@charset`, `@import` and `@namespace` are read
// only ahead of what they precede. A rule holding one is never dropped.
const POSITIONAL_AT_RULE_RE = /@(?:charset|import|layer|namespace)\b/i;
/** @type {Set<string>} */
const POSITIONAL_AT_RULES = new Set([
	"charset",
	"import",
	"layer",
	"namespace"
]);

/**
 * Whether a printed text names an at-rule whose place in the sheet is part of
 * what it means, so nothing moves across it. The plain spellings answer from a
 * regexp, and only a text carrying a backslash is read a second time.
 * @param {string} text printed CSS
 * @returns {boolean} true where one is named
 */
const namesPositionalAtRule = (text) =>
	// An at-keyword is written with a literal `@`, so a text without one names
	// none, and a native scan answers that before the regexp runs.
	text.includes("@") &&
	(POSITIONAL_AT_RULE_RE.test(text) ||
		(text.includes("\\") && namesAtRule(text, POSITIONAL_AT_RULES)));

/**
 * Whether a node is an `@layer` at-rule carrying a name - the only shape a
 * named layer block can have, answered from the node rather than from the text
 * it printed. Its name is read raw, unlike every other at-keyword here, because
 * what gathers these slices the name at a fixed `NAMED_LAYER_OPENER_HEAD` that
 * an escape makes wrong - so a layer named with one is gathered by nothing.
 * @param {Node} node a block item
 * @returns {boolean} true for `@layer <name>`
 */
const isNamedLayerAtRule = (node) => {
	const i = node;
	return (
		S._types[i] === NodeType.AtRule &&
		rangeAsciiCaseInsensitiveMatch(
			S._input,
			S._starts[i] + 1,
			S._aux0[i],
			"layer"
		)
	);
};

/**
 * Gather each named `@layer` block into the first sibling block of that name.
 * They are one layer however far apart they stand, and what separates them is in
 * another layer or in none - either way ordered against these by the cascade
 * rather than by where they sit, so moving the later body up is not a move the
 * cascade can see. An anonymous `@layer {` is a layer of its own and is left
 * alone (see `ANONYMOUS_LAYER_RE`).
 * @param {Node[]} items the siblings, in the order their texts stand in
 * @param {string[]} texts the siblings' printed texts, rewritten in place
 * @returns {void}
 */
const mergeNamedLayerBlocks = (items, texts) => {
	if (!S._transforms.mergeRules) return;
	// Which siblings could be one at all, read off the nodes: asking a text
	// makes the rope that node printed flatten, and this runs for every block.
	let named = false;
	for (let i = 0; i < items.length && !named; i++) {
		named = isNamedLayerAtRule(items[i]);
	}
	if (!named) return;
	/** @type {Map<string, SeenLayer> | null} */
	let first = null;
	for (let i = 0; i < texts.length; i++) {
		const text = texts[i];
		const prelude = isNamedLayerAtRule(items[i])
			? namedLayerOpener(text)
			: null;
		if (prelude === null) {
			// Read the same way the streamed path reads it, so which blocks gather
			// does not turn on whether the block was small enough to assemble.
			if (first !== null) forgetLayersWritten(first, text);
			continue;
		}
		if (first === null) first = new Map();
		const seen = first.get(prelude);
		const deep = opensNestedLayer(text, prelude);
		noteLayerBlock(
			first,
			trimCssWhiteSpace(prelude.slice(NAMED_LAYER_OPENER_HEAD, -1)),
			deep
		);
		if (seen === undefined || (deep && seen.subtree)) {
			first.set(prelude, { at: i, subtree: false });
			continue;
		}
		// Both bodies keep their order, so the layer reads as it was written. Read
		// as rules where they can be, so the pair meeting at the seam joins too.
		const at = seen.at;
		const before = ruleEntryOf(items[at], texts[at]);
		const entry = ruleEntryOf(items[i], text);
		const joined = joinRuleEntries(before, entry, false);
		// The block the gather grew is what this sibling carries from here on, so
		// the seam it made is settled rather than left for a second pass.
		const merged = joined === null ? null : settleJoinedSeams(joined);
		texts[at] =
			merged === null
				? `${texts[at].slice(0, -1)}${text.slice(prelude.length)}`
				: merged.text;
		if (merged !== null) {
			setRuleEntry(items[at], merged);
		} else if (/** @type {RuleEntry[]} */ (before.children).length === 0) {
			// Only an empty block refuses the join, and folding one adds nothing:
			// the sibling reads as the other block.
			setRuleEntry(items[at], entry);
		}
		texts[i] = "";
	}
};

/**
 * Whether every rule between two siblings leaves the moved block's properties
 * alone, so moving it past them cannot change what any element reads. Anything
 * whose declarations this cannot read - a raw item, a rule with a nested one in
 * it, an at-rule a later one by its name replaces - stands in the way whatever
 * it says.
 * @param {Node[]} items the parent's children in source order
 * @param {string[]} texts their printed texts
 * @param {number} from the index the block would move to
 * @param {number} to the index it moves from
 * @param {Set<string>} declared the moved block's properties
 * @param {Set<string> | null} subjects the element types the moved selectors
 * match, or null where one may match any element
 * @returns {boolean} true when nothing between can shadow them
 */
const nothingBetweenShadows = (items, texts, from, to, declared, subjects) => {
	for (let i = from + 1; i < to; i++) {
		if (texts[i].length === 0) continue;
		const between = ruleEntryOf(items[i], texts[i]);
		if (between.prelude === -1) return false;
		// A condition only narrows which elements read the block it holds, so what
		// it can shadow is what its own rules declare.
		const written = between.atRule
			? readableCondition(between)
				? atRuleDeclaredProperties(between)
				: null
			: between.plain
				? blockProperties(between.text.slice(between.prelude + 1, -1))
				: null;
		if (written === null) return false;
		if (
			propertiesOverlap(declared, written) &&
			!subjectsDisjoint(subjects, entrySubjectTypes(between))
		) {
			return false;
		}
	}
	return true;
};

// The last compound of a selector the joinable shape accepted, once attribute
// selectors and pseudos are gone: what either holds may look like a combinator.
const SUBJECT_STRIP_RE = new RegExp(
	`${ATTRIBUTE}|${PSEUDO_CLASS}|${PSEUDO_ELEMENT}`,
	"g"
);
const SUBJECT_TYPE_RE = /(?:^|[\s>+~])([-\w\u00A0-\uFFFF]+)[^\s>+~]*$/;

/**
 * The element types a selector list's subjects are, lowercased, or null where a
 * selector names none, escapes one or has a shape the joinable pattern rejects.
 * @param {string} prelude a printed selector list
 * @returns {Set<string> | null} the type names
 */
const subjectTypes = (prelude) => {
	if (prelude.includes("\\")) return null;
	/** @type {Set<string>} */
	const out = new Set();
	for (const one of prelude.includes(",")
		? splitSelectorList(prelude)
		: [prelude]) {
		if (!JOINABLE_SELECTOR_RE.test(one)) return null;
		const match = SUBJECT_TYPE_RE.exec(one.replace(SUBJECT_STRIP_RE, ""));
		if (match === null) return null;
		out.add(match[1].toLowerCase());
	}
	return out;
};

/**
 * The element types a printed rule's subjects are, and for a condition those of
 * every rule it holds, or null where one may match any element.
 * @param {RuleEntry} entry a plain rule, or an at-rule `atRuleDeclaredProperties` reads
 * @returns {Set<string> | null} the type names
 */
const entrySubjectTypes = (entry) => {
	if (!entry.atRule) return subjectTypes(entryPrelude(entry));
	/** @type {Set<string>} */
	const out = new Set();
	for (const child of /** @type {RuleEntry[]} */ (entry.children)) {
		const types = subjectTypes(entryPrelude(child));
		if (types === null) return null;
		for (const type of types) out.add(type);
	}
	return out;
};

/**
 * Whether no element can match both sets' subjects: an element has one type, so
 * rules whose subjects name different ones never meet in its cascade.
 * @param {Set<string> | null} a one set of subject types
 * @param {Set<string> | null} b the other
 * @returns {boolean} true when the two share no element
 */
const subjectsDisjoint = (a, b) => {
	if (a === null || b === null) return false;
	for (const type of a) if (b.has(type)) return false;
	return true;
};

/**
 * Whether this at-rule states a condition its own rules are read under, so what
 * it declares is what they declare. `@layer` is not one: where a layer is first
 * named fixes its order, and a block written into it from anywhere is read where
 * the layer sits rather than where it stands.
 * @param {RuleEntry} entry a printed at-rule
 * @returns {boolean} true where its block may be read for what it declares
 */
const readableCondition = (entry) => {
	const name = atRuleName(entryPrelude(entry));
	return name !== "layer" && MERGEABLE_AT_RULES.has(name);
};

/**
 * The properties an at-rule's block declares, or null where it holds a child
 * this cannot read the declarations of - and so cannot say what moving the
 * block past a rule would shadow.
 * @param {RuleEntry} entry a printed at-rule
 * @returns {Set<string> | null} the property names, lowercased
 */
const atRuleDeclaredProperties = (entry) => {
	// An at-rule's entry always lists its children, opaque ones included.
	const children = /** @type {RuleEntry[]} */ (entry.children);
	/** @type {Set<string>} */
	const out = new Set();
	for (const child of children) {
		if (child.prelude === -1 || child.atRule || !child.plain) return null;
		for (const property of blockProperties(
			child.text.slice(child.prelude + 1, -1)
		)) {
			out.add(property);
		}
	}
	return out;
};

/**
 * Join an at-rule onto an earlier sibling stating the same condition, past the
 * rules between them. The later block's rules move to where the earlier one
 * ends, so only what stands between them can read differently for it.
 * @param {Node[]} items the parent's children in source order
 * @param {string[]} texts their printed texts, rewritten in place
 * @param {Map<string, number>} held the index each prelude was first seen at
 * @param {RuleEntry} entry the at-rule reached now
 * @param {number} at its index
 * @returns {void}
 */
const mergeDistantAtRule = (items, texts, held, entry, at) => {
	const prelude = entryPrelude(entry);
	// WHY: a layer's place in the cascade is where its name is first written, not
	// what its prelude states, so two blocks naming one are not the pair of equal
	// conditions this joins. `mergeNamedLayerBlocks` gathers those under the rule
	// that order gives it, and an anonymous `@layer` opens a layer of its own.
	if (atRuleName(prelude) === "layer") return;
	const first = held.get(prelude);
	if (first === undefined) {
		held.set(prelude, at);
		return;
	}
	const declared = atRuleDeclaredProperties(entry);
	if (declared === null) return;
	if (
		!nothingBetweenShadows(
			items,
			texts,
			first,
			at,
			declared,
			entrySubjectTypes(entry)
		)
	) {
		return;
	}
	const joined = joinRuleEntries(
		ruleEntryOf(items[first], texts[first]),
		entry,
		false
	);
	if (joined === null) return;
	// The rule it moved into is what the block carries from here on, so the seam
	// the move made settles here rather than at the join.
	const merged = settleJoinedSeams(joined);
	setRuleEntry(items[first], merged);
	texts[first] = merged.text;
	texts[at] = "";
};

/**
 * Whether a later printed declaration of one property leaves an earlier one in
 * another block read for nothing - the same question `laterWriteWins` answers
 * within one block, asked of printed text.
 * @param {string} property the lowercased property both write
 * @param {string} earlier the earlier declaration's printed value
 * @param {string} later the later one's
 * @returns {boolean} true when the earlier one is read for nothing
 */
const printedWriteIsDead = (property, earlier, later) => {
	// A custom property's value is a token stream nothing here reads, and `all`
	// stands for every property, which no one value answers for.
	if (property === "all" || property.startsWith("--")) return false;
	const important = PRINTED_IMPORTANT_RE.exec(later);
	// An `!important` earlier one still wins over a later plain declaration.
	if (important === null && PRINTED_IMPORTANT_RE.test(earlier)) return false;
	const laterValue =
		important === null ? later : later.slice(0, important.index).trimEnd();
	const earlierValue = earlier.replace(PRINTED_IMPORTANT_RE, "").trimEnd();
	// Past other rules a substitution is read only as the vocabulary it shares.
	if (
		heldSubstitutions(laterValue) === null &&
		valueReadByTarget(property, laterValue)
	) {
		return true;
	}
	return CUSTOM_IDENT_LIST_PROPERTIES.has(property)
		? coveredByLater(laterValue, earlierValue)
		: sameVocabulary(laterValue, earlierValue, property);
};

/**
 * Whether a later rule of the same prelude writes again every declaration an
 * earlier one holds, which leaves the earlier read for nothing.
 * @param {RuleEntry} entry the earlier rule
 * @param {Map<string, string>} later the later rule's last value per property
 * @returns {boolean} true when the earlier rule can go
 */
const ruleWrittenAgain = (entry, later) => {
	// The caller held only a block it read apart already.
	const declarations =
		/** @type {{ property: string, value: string, text: string }[]} */ (
			blockDeclarations(entry.text.slice(entry.prelude + 1, -1))
		);
	for (const one of declarations) {
		const value = later.get(one.property);
		if (
			value === undefined ||
			!printedWriteIsDead(one.property, one.value, value)
		) {
			return false;
		}
	}
	return true;
};

/**
 * Drop a nested rule an identical later sibling stands for: wherever both are
 * read the later wins the tie, so the earlier is dead before any join could
 * fold it into a neighbor the later copy then has to cut it back out of.
 * @param {CssPath} path the walk's accessors
 * @param {Node[]} items the block's declarations and rules, in source order
 * @param {string[]} texts their printed texts, rewritten in place
 * @returns {void}
 */
const dropRulesRepeatedLater = (path, items, texts) => {
	/** @type {Set<string> | null} */
	let later = null;
	for (let i = items.length - 1; i >= 0; i--) {
		const text = texts[i];
		if (
			text.length === 0 ||
			path.type(items[i]) === NodeType.Declaration ||
			namesPositionalAtRule(text)
		) {
			continue;
		}
		if (later === null) later = new Set();
		if (later.has(text)) {
			texts[i] = "";
		} else {
			later.add(text);
		}
	}
};

/**
 * Drop a rule a later sibling of the same prelude writes wholly again, past
 * whatever stands between them: wherever both are read, the later wins the tie.
 * Only whole rules: one left shorter no longer equals a copy that drops it.
 * @param {Node[]} items the parent's children in source order
 * @param {string[]} texts their printed texts, rewritten in place
 * @returns {boolean} true when any rule was dropped
 */
const dropRulesWrittenAgain = (items, texts) => {
	let dropped = false;
	/** @type {Map<string, number[]> | null} */
	let held = null;
	for (let i = 0; i < items.length; i++) {
		if (texts[i].length === 0 || S._types[items[i]] === NodeType.Declaration) {
			continue;
		}
		const entry = ruleEntryOf(items[i], texts[i]);
		// Keyframes of one selector are not one cascade in every engine: an older
		// one reads only the last block written for it.
		if (
			entry.prelude === -1 ||
			entry.atRule ||
			!entry.plain ||
			entry.listKind === LIST_KIND_KEYFRAME
		) {
			continue;
		}
		// A value holding a block is no declaration this reads apart, so the rule
		// is neither dropped nor what drops one.
		const declarations = blockDeclarations(
			entry.text.slice(entry.prelude + 1, -1)
		);
		if (declarations === null) continue;
		const prelude = entryPrelude(entry);
		if (held === null) held = new Map();
		const earlier = held.get(prelude);
		if (earlier === undefined) {
			held.set(prelude, [i]);
			continue;
		}
		/** @type {Map<string, string>} */
		const later = new Map();
		for (const one of declarations) later.set(one.property, one.value);
		for (const at of earlier) {
			// One a copy between them already took is not there to drop again, and
			// an identical one is the joins' to place.
			if (texts[at].length === 0 || texts[at] === texts[i]) continue;
			if (ruleWrittenAgain(ruleEntryOf(items[at], texts[at]), later)) {
				texts[at] = "";
				dropped = true;
			}
		}
		earlier.push(i);
	}
	return dropped;
};

/**
 * Join sibling rules that print the same block with other rules between them.
 * Unlike `mergeAdjacentRules` this moves a selector past what stands in its
 * way, so the cascade is only unchanged where nothing between declares a
 * property the shared block does.
 * @param {Node[]} items the parent's children in source order
 * @param {string[]} texts their printed texts, rewritten in place
 * @returns {void}
 */
const mergeDistantRules = (items, texts) => {
	if (!S._mergingDistantRules) return;
	/** @type {Map<string, number>} */
	const held = new Map();
	// The same, for at-rules: those join by stating one condition twice, so they
	// are held under their prelude where a plain rule is held under its block.
	/** @type {Map<string, number>} */
	const heldAtRules = new Map();
	// The rules selectors moved into, whose lists are canonicalized once at the
	// end: a rule can gather from several later ones.
	/** @type {Set<number>} */
	const joined = new Set();
	for (let i = 0; i < items.length; i++) {
		if (texts[i].length === 0) continue;
		const entry = ruleEntryOf(items[i], texts[i]);
		if (entry.prelude === -1) continue;
		if (entry.atRule) {
			mergeDistantAtRule(items, texts, heldAtRules, entry, i);
			continue;
		}
		if (!entryListable(entry)) continue;
		const block = entry.text.slice(entry.prelude);
		const at = held.get(block);
		if (at === undefined) {
			held.set(block, i);
			continue;
		}
		// A block repeated at a distance already compresses well, so a merge earns
		// wire bytes only where the copy it drops is worth twice the selector.
		if (block.length <= 2 * entry.prelude) continue;
		const before = ruleEntryOf(items[at], texts[at]);
		if (
			!nothingBetweenShadows(
				items,
				texts,
				at,
				i,
				blockProperties(block.slice(1, -1)),
				entrySubjectTypes(entry)
			)
		) {
			continue;
		}
		const merged = joinRuleEntries(before, entry, false);
		if (merged === null) continue;
		setRuleEntry(items[at], merged);
		texts[at] = merged.text;
		texts[i] = "";
		joined.add(at);
	}
	for (const at of joined) {
		const canonical = canonicalizeJoined(ruleEntryOf(items[at], texts[at]));
		setRuleEntry(items[at], canonical);
		texts[at] = canonical.text;
	}
};

/**
 * Join adjacent sibling rules that print the same block. Nothing stands between
 * them, so the cascade is unchanged; the later rule's text becomes empty and
 * its selectors move onto the earlier one.
 * @param {Node[]} items the parent's children in source order
 * @param {string[]} texts their printed texts, rewritten in place
 * @param {Set<Node> | null} pending the prefixed rules an unprefixed twin may
 * still make dead, which have to stay one rule to be dropped whole
 * @param {Set<number> | null} dead the children a later one already made dead,
 * which part nothing: what stands either side of one is adjacent once it goes
 * @returns {boolean} true when any two rules joined
 */
const mergeAdjacentRules = (items, texts, pending, dead) => {
	if (!S._transforms.mergeRules) return false;
	let joined = false;
	let previous = -1;
	/** @type {RuleEntry | null} */
	let held = null;
	// Whether `held` is a rule this run built, rather than one the printer stored.
	let owned = false;
	// The rules settled so far, nearest last. Only the one on top is next to what
	// settles now, so a fold that fails ends the walk rather than reaching past it.
	/** @type {{ at: number, entry: RuleEntry, owned: boolean }[]} */
	const settled = [];
	/**
	 * Write the run's accumulator back with its selector list canonical, which is
	 * what ends a run: the joins themselves only concatenate. The list it ends as
	 * may be what the rule before it was waiting for, so it is offered that fold.
	 * @returns {void}
	 */
	const finish = () => {
		if (held === null) return;
		let entry = held;
		if (owned) {
			const canonical = canonicalizeJoined(entry);
			if (canonical !== entry) {
				entry = canonical;
				setRuleEntry(items[previous], entry);
				texts[previous] = entry.text;
			}
		}
		let at = previous;
		let mine = owned;
		while (settled.length !== 0) {
			const before = settled[settled.length - 1];
			const merged = joinRuleEntries(before.entry, entry, before.owned);
			if (merged === null) break;
			settled.pop();
			texts[at] = "";
			joined = true;
			at = before.at;
			// The fold makes a seam of its own, and nothing is appended to the rule
			// it leaves: this is where that run ends too.
			entry = settleJoinedSeams(merged);
			mine = true;
			setRuleEntry(items[at], entry);
			texts[at] = entry.text;
		}
		settled.push({ at, entry, owned: mine });
	};
	for (let i = 0; i < items.length; i++) {
		if (texts[i].length === 0 || (dead !== null && dead.has(i))) continue;
		if (
			S._types[items[i]] === NodeType.Declaration ||
			(pending !== null && pending.has(items[i]))
		) {
			finish();
			// A declaration is read at its own place, so nothing folds across it.
			settled.length = 0;
			previous = i;
			held = null;
			owned = false;
			continue;
		}
		const entry = ruleEntryOf(items[i], texts[i]);
		if (held !== null) {
			const merged = joinRuleEntries(held, entry, owned);
			if (merged !== null) {
				held = merged;
				owned = true;
				setRuleEntry(items[previous], merged);
				texts[previous] = merged.text;
				texts[i] = "";
				joined = true;
				continue;
			}
		}
		// Anything else between them - a declaration, a rule that cannot join -
		// parts the run: in a nested block a declaration is read at its own place.
		finish();
		previous = i;
		if (entry.prelude === -1) {
			// A rule the join cannot read stands between, so nothing folds across it.
			settled.length = 0;
			held = null;
		} else {
			held = entry;
		}
		owned = false;
	}
	finish();
	return joined;
};

// CSS Values 4 §5: "for zero lengths the unit identifier is optional". Only the
// length units - a zero time, angle, frequency, resolution or `<flex>` still
// needs its unit, and `0%` is a percentage, a different type.
const ZERO_LENGTH_RE = new RegExp(`^0(?:${LENGTH_UNITS})$`, "i");

/**
 * Drop a zero length's unit. Only a whole component: anything inside `calc()`
 * or a `var()` fallback stays, since there a bare `0` is a `<number>` and the
 * expression would stop parsing. `_dropZeroLengthUnitInCall` reaches into the
 * calls where it is a length instead.
 * @param {string} fragment one printed top-level component
 * @returns {string} the component, its zero unit dropped
 */
const dropZeroLengthUnit = (fragment) =>
	S._transforms.shortenNumbers &&
	fragment.charCodeAt(0) === CC_0 &&
	ZERO_LENGTH_RE.test(fragment)
		? "0"
		: fragment;

/**
 * Whether a string token closed with its own quote rather than running to EOF.
 * §4.3.5 ends an unterminated string at EOF, so its text has no closing quote
 * and `slice(1, -1)` would drop a real character (`_minifyString` and
 * `_minifyUrlFunction` refuse to rewrite one for the same reason).
 * @param {string} text a string token's text
 * @returns {boolean} true when the string is closed
 */
const isClosedString = (text) => {
	const quote = text.charCodeAt(0);
	const n = text.length;
	if (n < 2 || text.charCodeAt(n - 1) !== quote) return false;
	for (let i = 1; i < n - 1; i++) {
		if (text.charCodeAt(i) !== CC_REVERSE_SOLIDUS) continue;
		// The escape swallows what follows, the final quote included (`"a\"`).
		if (i + 1 === n - 1) return false;
		i++;
	}
	return true;
};

/**
 * Write a token's terminator back. A `\` left dangling at EOF has to be replaced
 * rather than kept: kept, it would escape the terminator and leave the token open
 * on exactly the input this repairs. What it stands for differs by token - nothing
 * in a string (§4.3.5), U+FFFD in a url (§4.3.6 reads it as an escape, §4.3.7 ends
 * one at EOF with the replacement character).
 * @param {string} raw the token's source text, missing its terminator
 * @param {string} terminator the character that closes it
 * @param {string} dangling what a `\` left at EOF contributed to the token's value
 * @returns {string} the terminated token
 */
const terminate = (raw, terminator, dangling) => {
	let backslashes = 0;
	while (
		raw.length - 1 - backslashes > 0 &&
		raw.charCodeAt(raw.length - 1 - backslashes) === CC_REVERSE_SOLIDUS
	) {
		backslashes++;
	}
	const body = backslashes % 2 === 1 ? `${raw.slice(0, -1)}${dangling}` : raw;
	return `${body}${terminator}`;
};

/**
 * The `url()` counterpart of `isClosedString`: §4.3.6 ends a url-token at EOF, so
 * it has no closing `)` and the printer's next byte would land inside it.
 * @param {string} raw the url-token's source text
 * @returns {boolean} true when the `)` is absent or itself escaped
 */
const isUnterminatedUrl = (raw) => {
	const n = raw.length;
	if (n < 2 || raw.charCodeAt(n - 1) !== CC_RIGHT_PARENTHESIS) return true;
	let backslashes = 0;
	for (let i = n - 2; i > 0 && raw.charCodeAt(i) === CC_REVERSE_SOLIDUS; i--) {
		backslashes++;
	}
	return backslashes % 2 === 1;
};

/**
 * Text the input ran out inside, closed where the tokenizer and parser closed it
 * (§4.3, §5.4): its last token's terminator, then each block and function still
 * open, innermost first. Printed as written instead, the next byte the printer
 * writes - a `;` or the rule's `}` - would be read as part of what was left open.
 * @param {string} text source text that runs to the end of the input
 * @returns {string} the text with what it left open closed
 */
const closeAtEof = (text) => {
	const stream = new TokenStream(text);
	/** @type {string[]} */
	const open = [];
	let lastType = TT_EOF;
	let lastStart = 0;
	let lastEnd = 0;
	for (;;) {
		const token = stream.consume();
		const type = token.type;
		if (type === TT_EOF) break;
		lastType = type;
		lastStart = token.start;
		lastEnd = token.end;
		if (type === TT_FUNCTION || type === TT_LEFT_PARENTHESIS) {
			open.push(")");
		} else if (type === TT_LEFT_SQUARE_BRACKET) {
			open.push("]");
		} else if (type === TT_LEFT_CURLY_BRACKET) {
			open.push("}");
		} else if (
			// §5.4.8 ends a block only on its own closer; any other is a token in it.
			open.length !== 0 &&
			((type === TT_RIGHT_PARENTHESIS && open[open.length - 1] === ")") ||
				(type === TT_RIGHT_SQUARE_BRACKET && open[open.length - 1] === "]") ||
				(type === TT_RIGHT_CURLY_BRACKET && open[open.length - 1] === "}"))
		) {
			open.pop();
		}
	}
	let out = text;
	// Comments are consumed between tokens, so one left open is what follows the
	// last; whitespace between them would be a token itself.
	let at = lastEnd;
	for (;;) {
		if (!out.startsWith("/*", at)) break;
		const end = out.indexOf("*/", at + 2);
		if (end === -1) {
			out += "*/";
			break;
		}
		at = end + 2;
	}
	if (out === text && lastEnd === text.length) {
		const last = text.slice(lastStart, lastEnd);
		if (lastType === TT_STRING && !isClosedString(last)) {
			out = text.slice(0, lastStart) + terminate(last, last[0], "");
		} else if (
			(lastType === TT_URL || lastType === TT_BAD_URL_TOKEN) &&
			isUnterminatedUrl(last)
		) {
			// A bad url's remnants (§4.3.14) also run to the next `)`.
			out = text.slice(0, lastStart) + terminate(last, ")", "\uFFFD");
		} else {
			// §4.3.7 reads a `\` at EOF as U+FFFD; kept, it would escape the closer.
			out = terminate(text, "", "\uFFFD");
		}
	}
	for (let i = open.length - 1; i >= 0; i--) out += open[i];
	return out;
};

/**
 * The canonical order of two selectors in a list: by code unit, save that an
 * attribute selector's `[` sorts after the letters, so a type name leads its
 * attribute variants (`button,[type=button]`) as authors write them.
 * @param {string} a one selector
 * @param {string} b another
 * @returns {number} negative, zero or positive, as `a` sorts before, with or after `b`
 */
const compareSelectors = (a, b) => {
	const length = a.length < b.length ? a.length : b.length;
	for (let i = 0; i < length; i++) {
		const x = a.charCodeAt(i);
		const y = b.charCodeAt(i);
		if (x === y) continue;
		// `{` is the code unit after `z`; an escaped one still sorts apart.
		const order =
			(x === CC_LEFT_SQUARE ? CC_LEFT_CURLY : x) -
			(y === CC_LEFT_SQUARE ? CC_LEFT_CURLY : y);
		return order === 0 ? x - y : order;
	}
	return a.length - b.length;
};

/**
 * A selector list is a set: the same selectors in any order match the same
 * elements at the same specificity, so a repeat inside it says nothing and one
 * canonical order lets equal lists compress alike. Only ever the author's own
 * list - a join seam concatenates, so a run of them stays linear.
 * @param {string} prelude the printed selector list
 * @returns {string} it, or `prelude` when nothing there is shorter
 */
const canonicalSelectorList = (prelude) => {
	if (!S._transforms.shortenSelectors) return prelude;
	// A list needs a comma; the great majority of preludes are one selector, and
	// without one there is nothing to split, deduplicate or order.
	if (!prelude.includes(",")) return prelude;
	const list = splitSelectorList(prelude);
	if (list.length < 2) return prelude;
	// Strictly increasing answers both questions the common case turns on -
	// every selector distinct, and already in order - without a set: only two
	// equal selectors compare as zero.
	let i = 1;
	while (i < list.length && compareSelectors(list[i - 1], list[i]) < 0) i++;
	if (i === list.length) return prelude;
	// No selector starts with `@`: moved to the front, the invalid list that
	// holds one would read as an at-rule.
	for (const selector of list) {
		if (selector.charCodeAt(0) === CC_AT_SIGN) return prelude;
	}
	list.sort(compareSelectors);
	let kept = 1;
	for (let j = 1; j < list.length; j++) {
		if (list[j] !== list[kept - 1]) list[kept++] = list[j];
	}
	list.length = kept;
	return list.join(",");
};

/**
 * A joined at-rule whose block holds no list a join left concatenated. Two
 * blocks join at the seam their texts hide, and the pair meeting there joins
 * like any other adjacency - by concatenating, so that a run of joins costs
 * what it appends. The run ends here, which is where those seams are ordered:
 * once per block, whatever the run put through it, rather than once per join
 * over a list that was still growing.
 *
 * The block's text is written again only where a seam actually moved, and only
 * the children that carry one are read at all.
 * @param {RuleEntry} entry a rule a run of joins built
 * @returns {RuleEntry} it, every list under it canonical
 */
const settleJoinedSeams = (entry) => {
	if (!entry.unordered || !entry.atRule) return entry;
	// An at-rule's entry always lists its children, opaque ones included.
	const children = /** @type {RuleEntry[]} */ (entry.children);
	/** @type {RuleEntry[] | null} */
	let settled = null;
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (!child.unordered) continue;
		const canonical = canonicalizeJoined(child);
		if (canonical === child) continue;
		if (settled === null) settled = [...children];
		settled[i] = canonical;
	}
	if (settled === null) {
		// Canonical is canonical wherever the block goes on to stand, so a later
		// settle of it reads nothing again.
		entry.unordered = false;
		return entry;
	}
	const head = joinedHead(settled);
	return {
		...entry,
		text: joinedBlockText(entryPrelude(entry), head, settled),
		children: settled,
		head,
		unordered: false,
		list: null,
		block: null,
		declarations: null
	};
};

/**
 * A plain rule built from a prelude and the declarations it holds.
 * @param {string} prelude its selector list, as printed
 * @param {PrintedDeclaration[]} declarations its declarations, in order
 * @returns {RuleEntry} the rule
 */
const plainRuleEntry = (prelude, declarations) => ({
	text: `${prelude}{${declarations.map((one) => one.text).join(";")}}`,
	prelude: prelude.length,
	atRule: false,
	plain: true,
	listable: LIST_YES,
	listKind: LIST_KIND_SELECTOR,
	children: null,
	head: "",
	unordered: false,
	list: null,
	block: null,
	declarations
});

/**
 * A joined rule with its selector list canonical. The joins concatenate to keep
 * a run of them linear, so the list is ordered and deduplicated once here, where
 * the run that built it ends - its own list, and the ones its block's seams
 * left behind.
 * @param {RuleEntry} entry the rule a run of joins built
 * @returns {RuleEntry} it, its selector list canonical
 */
const canonicalizeJoined = (entry) => {
	if (entry.atRule) return settleJoinedSeams(entry);
	// Never an opaque entry: only a join's product, or a child carrying one, is
	// unordered.
	const prelude = entryPrelude(entry);
	const canonical = canonicalSelectorList(prelude);
	if (canonical === prelude) {
		entry.unordered = false;
		return entry;
	}
	return {
		...entry,
		text: canonical + entry.text.slice(entry.prelude),
		prelude: canonical.length,
		unordered: false,
		list: null,
		block: null,
		declarations: null
	};
};

/**
 * Whether a selector can only ever match through a name `unusedSymbols` says
 * nothing uses - a class or an id it names outright.
 *
 * Only at the top level of the selector: inside a functional pseudo the name is
 * not one the selector requires. `:not(.gone)` matches *more* elements once
 * `.gone` is nowhere, and `:is(.gone, .kept)` still matches through the other
 * half, so taking either out would change what the rule paints.
 * @param {string} selector one printed selector
 * @returns {boolean} true when the rule cannot match without an unused name
 */
const namesUnusedSymbol = (selector) => {
	const unused = /** @type {Set<string>} */ (S._unusedSymbols);
	let quote = 0;
	let depth = 0;
	for (let i = 0; i < selector.length; i++) {
		const code = selector.charCodeAt(i);
		if (code === CC_REVERSE_SOLIDUS) {
			i++;
			continue;
		}
		if (quote !== 0) {
			if (code === quote) quote = 0;
			continue;
		}
		if (code === CC_QUOTATION_MARK || code === CC_APOSTROPHE) {
			quote = code;
			continue;
		}
		if (code === CC_LEFT_PARENTHESIS || code === CC_LEFT_SQUARE) {
			depth++;
			continue;
		}
		if (code === CC_RIGHT_PARENTHESIS || code === CC_RIGHT_SQUARE) {
			depth--;
			continue;
		}
		if (depth !== 0) continue;
		if (code !== CC_FULL_STOP && code !== CC_NUMBER_SIGN) continue;
		let end = i + 1;
		while (end < selector.length) {
			const next = selector.charCodeAt(end);
			if (next === CC_REVERSE_SOLIDUS) {
				end += 2;
				continue;
			}
			if (!isAsciiIdentCodePoint(next)) break;
			end++;
		}
		if (end === i + 1) continue;
		if (unused.has(unescapeIdentifier(selector.slice(i + 1, end)))) return true;
		i = end - 1;
	}
	return false;
};

/**
 * The selectors of a list that can still match, or null when none can - which
 * is a rule `unusedSymbols` takes out whole. A list is only rebuilt where it
 * actually lost one.
 * @param {string} list a printed selector list
 * @returns {string | null} the list to write, or null to drop the rule
 */
const dropUnusedSelectors = (list) => {
	const selectors = splitSelectorList(list);
	const kept = selectors.filter((one) => !namesUnusedSymbol(one));
	if (kept.length === 0) return null;
	return kept.length === selectors.length ? list : kept.join(",");
};

/**
 * Where the printed `@name` an at-rule's prelude leads with ends: an escape
 * the name was written with may print shorter than the source spells it.
 * @param {string[]} parts the prelude's printed parts, the `@name` first
 * @param {Node} node the at-rule
 * @returns {number} the offset just past the printed `@name`
 */
const printedAtKeywordEnd = (parts, node) =>
	parts.length !== 0 && parts[0].charCodeAt(0) === CC_AT_SIGN
		? parts[0].length
		: rawName(node).length + 1;

/**
 * A rule's prelude: everything before its `{`, which depends on nothing but the
 * prelude itself. Split out of the printer so a rule whose block is streamed can
 * print its opener when the block opens, long before the block's children exist.
 * @param {CssPath} path the accessor positioned on the rule
 * @param {PrintContext} writer the print context
 * @param {boolean} minify whether printing minified
 * @param {string[]=} outParts filled with the prelude's tokens, for prefixing
 * @returns {string} the rule's prelude text
 */
const rulePrelude = (path, writer, minify, outParts) => {
	const parts = outParts || [];
	// Fold the `@name` in first so the join keeps the separator before the
	// prelude's first token (e.g. `@media screen`, unmerged).
	if (path.type() === NODE_TYPE_AT_RULE) {
		const name = rawName(path.node);
		// `@charset` is the one at-keyword read as bytes rather than matched
		// (CSS Syntax 3 §3.2), so lowercasing `@CHARSET` would turn a rule the
		// engine drops into one that sets the sheet's encoding.
		const lower =
			minify &&
			S._transforms.foldCase &&
			!asciiCaseInsensitiveMatch(name, "charset");
		let printed = lower ? asciiLowercaseName(name) : name;
		// An escape spells the same name, except that an escaped `@charset` is no
		// encoding declaration, which only its literal bytes make.
		if (minify && S._transforms.rewriteEscapes && name.includes("\\")) {
			const meaning = unescapeIdentifier(name);
			if (!asciiCaseInsensitiveMatch(meaning, "charset")) {
				const spelled = escapeName(
					lower ? asciiLowercaseName(meaning) : meaning
				);
				if (spelled.length <= printed.length) printed = spelled;
			}
		}
		parts.push(`@${printed}`);
	}
	appendChildTexts(path.node, writer, parts);
	// A beautified condition keeps its keywords' comments as a minified one does.
	if (!minify && path.type() === NODE_TYPE_AT_RULE) {
		const name = atKeywordOf(path.node);
		if (
			name === "media" ||
			name === "container" ||
			asciiCaseInsensitiveMatch(name, "supports")
		) {
			keepKeywordComments(parts);
		}
	}
	// `@media`/`@container` only: the two preludes whose `(...)` is a media
	// feature, so an `and` of two of them is an interval.
	if (minify && path.type() === NODE_TYPE_AT_RULE) {
		// One read of the name for both tests: each is a slice of the source.
		const name = atKeywordOf(path.node);
		const media = name === "media";
		const container = name === "container";
		// Every prelude that is a chain of conditions, whichever rule states it.
		const supports = asciiCaseInsensitiveMatch(name, "supports");
		// First, so no pass below reads a keyword whose comment it would drop.
		if (media || container || supports) keepKeywordComments(parts);
		if (S._transforms.shortenMediaQueries && (media || container || supports)) {
			dropRepeatedConditions(parts);
		}
		if (supports && S._transforms.shortenMediaQueries) {
			if (S._prefixBrowsers !== null) dropDeadPrefixedTests(parts);
			dropRedundantSupportsParens(parts);
			// Again: `((A)) or (A)` only repeats `(A)` once its doubled pair is gone.
			dropRepeatedConditions(parts);
		}
		if (media || container) {
			minifyMediaQueryParts(parts, media);
		} else {
			// An `@import`'s media query follows the URL, `layer` and `supports()`,
			// and a `@custom-media` one its name; each is read as a `@media` one.
			const start =
				name === "import"
					? importMediaStart(parts)
					: name === "custom-media"
						? customMediaStart(parts)
						: -1;
			if (start !== -1) {
				const query = parts.splice(start);
				query.unshift("");
				keepKeywordComments(query);
				minifyMediaQueryParts(query, true);
				for (let i = 1; i < query.length; i++) parts.push(query[i]);
			}
			if (
				name === "custom-selector" &&
				S._transforms.customSelectors &&
				S._customSelectors.size !== 0
			) {
				// The list, past the name the rule states.
				let named = 1;
				while (
					named < parts.length &&
					!CUSTOM_SELECTOR_NAME_RE.test(parts[named])
				) {
					named++;
				}
				const list = parts.splice(named + 1);
				writeCustomSelector(list);
				for (const part of list) parts.push(part);
			}
		}
	}
	if (minify && path.type() === NODE_TYPE_QUALIFIED_RULE) {
		// Before the fold, so what a name stands for is what every pass below reads.
		if (S._transforms.customSelectors && S._customSelectors.size !== 0) {
			writeCustomSelector(parts);
		}
		if (foldPseudoNames(parts) && S._transforms.shortenSelectors) {
			unwrapLoneIs(parts);
		}
		// After the fold, which is what makes the names above match, and before the
		// class replacement, so a pseudo written as a class is one either way.
		if (!S._isSelectorAllowed) {
			// Nothing to write it as.
		} else if (
			(!S._notSelectorListAllowed || !S._langArgumentListAllowed) &&
			S._transforms.lowerUnsupported
		) {
			lowerSelectorLists(parts);
		}
		if (!S._dirSelectorAllowed && S._transforms.rewriteDirSelector) {
			lowerDirSelector(parts);
		}
		if (S._pseudoClasses !== null) replacePseudoClasses(parts);
		dropImpliedUniversalSelector(parts);
	}
	// Only a qualified rule's prelude is a selector - trim combinator spaces
	// there; an at-rule prelude (media / container query) keeps its spacing.
	let prelude = join(
		parts,
		!minify,
		path.type() === NODE_TYPE_QUALIFIED_RULE ? TRIM_COMBINATORS : TRIM_NOTHING
	);
	if (
		minify &&
		S._keyframeRenames !== null &&
		path.type() === NODE_TYPE_AT_RULE &&
		KEYFRAMES_AT_RULE_RE.test(atKeywordOf(path.node))
	) {
		const head = printedAtKeywordEnd(parts, path.node);
		const renamed = S._keyframeRenames.get(
			unescapeIdentifier(prelude.slice(head).trim())
		);
		if (renamed !== undefined) prelude = `${prelude.slice(0, head)} ${renamed}`;
	}
	// An at-keyword ends where `(` starts, so the space before it says nothing.
	if (minify && PAREN_OPENER_SPACED_RE.test(prelude)) {
		const space = prelude.indexOf(" ");
		prelude = prelude.slice(0, space) + prelude.slice(space + 1);
	}
	if (minify && path.type() === NODE_TYPE_QUALIFIED_RULE) {
		// A keyframe selector, not a selector list: CSS Animations 1 §4 gives
		// `from` and `to` as `0%` and `100%`, and each pair has a shorter half.
		const parent = path.parent;
		if (
			S._transforms.shortenSelectors &&
			parent !== null &&
			path.type(parent) === NODE_TYPE_AT_RULE &&
			KEYFRAMES_AT_RULE_RE.test(atKeywordOf(parent))
		) {
			return splitSelectorList(prelude)
				.map((one) =>
					asciiCaseInsensitiveMatch(one, "from")
						? "0%"
						: KEYFRAME_FULL_RE.test(one)
							? "to"
							: one
				)
				.join(",");
		}
		const list = canonicalSelectorList(prelude);
		if (
			readsThroughGoneEngine(list) ||
			(S._loweringNesting && lowersThroughGoneEngine(path.node, list))
		) {
			/** @type {Set<Node>} */ (S._unusedRules).add(S._walkNode);
			return list;
		}
		if (S._unusedSymbols === null) return list;
		const kept = dropUnusedSelectors(list);
		// Marked rather than dropped here: the rule's own printer takes it out, the
		// same way it takes out one whose block ends up empty.
		if (kept !== null) return kept;
		/** @type {Set<Node>} */ (S._unusedRules).add(S._walkNode);
		return list;
	}
	if (
		S._unusedSymbols !== null &&
		minify &&
		path.type() === NODE_TYPE_AT_RULE &&
		KEYFRAMES_AT_RULE_RE.test(atKeywordOf(path.node)) &&
		// Past the `@name` the prelude leads with, which leaves the animation's own.
		S._unusedSymbols.has(
			unescapeIdentifier(
				prelude.slice(printedAtKeywordEnd(parts, path.node)).trim()
			)
		)
	) {
		/** @type {Set<Node>} */ (S._unusedRules).add(S._walkNode);
	}
	return prelude;
};

/**
 * Whether a rule is one `unusedSymbols` marked - its selectors all name an
 * unused symbol, or it is an `@keyframes` under an unused name. Reading the
 * mark clears it: a finished rule's node goes back to the pool, and a mark left
 * on it would land on whatever is built over it next.
 * @param {Node} rule the rule
 * @returns {boolean} true when it is to be dropped
 */
const takeUnusedRule = (rule) =>
	S._unusedRules !== null && S._unusedRules.delete(rule);

/**
 * Whether text ends in an escape the input ran out of - a `\` no character
 * follows. The tokenizer already read it as one, so the raw text is not what the
 * token holds, and writing it out would escape whatever the printer puts next.
 * @param {string} text raw source text
 * @returns {boolean} true when the last `\` has nothing to escape
 */
const endsInLoneEscape = (text) => {
	let at = text.length;
	while (at > 0 && text.charCodeAt(at - 1) === CC_REVERSE_SOLIDUS) at--;
	return (text.length - at) % 2 === 1;
};

/**
 * Text whose trailing escape the input ran out of, resolved to what it names:
 * nothing inside a string (§4.3.5) and the replacement character anywhere else
 * (§4.3.7). Text ending in anything else is handed back as written.
 * @param {string} text raw source text ending at end of input
 * @param {boolean} inString whether the text is a string token's
 * @returns {string} the text the token holds
 */
const resolveTrailingEscape = (text, inString) => {
	if (!endsInLoneEscape(text)) return text;
	const kept = text.slice(0, -1);
	return inString ? kept : `${kept}\uFFFD`;
};

/**
 * The declarations a `text-decoration` naming more than its line says, for a
 * target that reads the shorthand as CSS 2.1's line alone. The line stays in the
 * shorthand - which is what resets the rest of the family to its initial values,
 * as the shorthand does - and every other slot becomes its own longhand, each of
 * which every engine with the feature at all reads.
 * @param {string} value the shorthand's value, as printed
 * @param {string} important `!important` where the declaration carries it
 * @returns {string | null} the declarations, or null when there is nothing to lower
 */
const expandTextDecoration = (value, important) => {
	const components = splitPrintedComponents(value);
	// One component is the line alone, which is as old as the property.
	if (components.length < 2) return null;
	const longhands = /** @type {string[]} */ (
		FAMILY_LONGHANDS.get("text-decoration")
	);
	const filled = familySlots(longhands, components);
	if (filled === null) return null;
	const line = filled.get("text-decoration-line");
	// Only where a slot the target cannot read is written: a thickness alone is
	// not the same question as a style or a color.
	let needed = false;
	for (const longhand of filled.keys()) {
		if (longhand === "text-decoration-line") continue;
		if (
			longhand === "text-decoration-thickness"
				? !S._textDecorationThicknessAllowed
				: !S._textDecorationColorStyleAllowed
		) {
			needed = true;
		}
	}
	if (!needed) return null;
	// The line's own initial, so the shorthand still resets the family.
	let out = `text-decoration:${
		line === undefined ? "none" : line
	}${important};`;
	for (const longhand of longhands) {
		if (longhand === "text-decoration-line") continue;
		const written = filled.get(longhand);
		if (written !== undefined) {
			out += withColorFallback(`${longhand}:${written}${important};`);
		}
	}
	return out;
};

/**
 * One printed declaration with its color fallback written before it, where the
 * target reads no spelling of the color it names. A shorthand lowered into its
 * longhands is several declarations, and each needs its fallback against itself
 * - the shorthand standing between them resets what one written first had said.
 * @param {string} one a printed declaration, ending in `;`
 * @returns {string} the declaration, with any fallback before it
 */
const withColorFallback = (one) => {
	if (!S._colorFallbacksNeeded || !S._transforms.colorFallbacks) return one;
	if (!one.includes("(")) return one;
	// Built from a longhand and its value, so the name before the `:` is there.
	const fallback = colorFallbackDeclaration(one, one.indexOf(":"));
	return fallback === null ? one : fallback + one;
};

// The shorthands whose lowering keeps the shorthand itself, which is the one
// shape a later value can be read off. `inset`, `place-*` and the pair
// shorthands are written as longhands alone, so nothing later writes those.
const LOWERED_SHORTHANDS = new Set(["text-decoration"]);

/**
 * The longhand declarations a shorthand the target cannot read says, from the
 * shorthand's printed text - the inverse of the merges `mergeBoxLonghands`
 * makes, and refused for the same reasons: a substitution may expand across a
 * slot boundary, and a keyword only some of the longhands take would leave the
 * others alive where the engine drops the shorthand whole.
 * @param {string} text one printed declaration
 * @returns {string | null} the longhands, or null when there is nothing to lower
 */
const expandUnsupportedShorthand = (text) => {
	if (
		S._placeShorthandAllowed &&
		S._overflowTwoValuesAllowed &&
		S._insetShorthandAllowed &&
		S._textDecorationColorStyleAllowed &&
		S._textDecorationThicknessAllowed
	) {
		return null;
	}
	const colon = text.indexOf(":");
	// A custom property's value is a token stream, not a shorthand's slots.
	if (colon <= 0 || text.charCodeAt(1) === CC_HYPHEN_MINUS) return null;
	const property = printedProperty(text, colon);
	const place = !S._placeShorthandAllowed && PLACE_SHORTHANDS.has(property);
	const pair =
		!S._overflowTwoValuesAllowed && ONE_VALUE_PAIR_SHORTHANDS.has(property);
	const box = !S._insetShorthandAllowed && property === "inset";
	const decoration =
		property === "text-decoration" &&
		(!S._textDecorationColorStyleAllowed || !S._textDecorationThicknessAllowed);
	if (!place && !pair && !box && !decoration) return null;
	const end = printedValueEnd(text, colon);
	const value = text.slice(colon + 1, end);
	if (containsSubstitutionFunction(value)) return null;
	if (decoration) {
		return expandTextDecoration(
			value,
			text.startsWith(IMPORTANT, end) ? IMPORTANT : ""
		);
	}
	/** @type {string[] | undefined} */
	let longhands;
	/** @type {string[] | null} */
	let values;
	if (box) {
		longhands = BOX_LONGHANDS.get(property);
		values = expandBox(value, 4);
		// A word no longhand reads drops the shorthand whole, and one longhand alone;
		// a CSS-wide keyword alone is read by every longhand.
		if (
			values !== null &&
			!CSS_WIDE_KEYWORDS.has(toLowerCaseIfNeeded(value)) &&
			boxSlotsUnreadable(property, values)
		) {
			return null;
		}
	} else {
		longhands = PAIR_LONGHANDS.get(property);
		const written = splitPrintedComponents(value);
		// A one-value `overflow` is as old as the property, so only the two-value
		// spelling is one to lower; a `place-*` gives both longhands its one value.
		values =
			written.length === 2
				? written
				: place && written.length === 1
					? [written[0], written[0]]
					: null;
		const unshared = UNSHARED_LONGHAND_KEYWORDS.get(property);
		if (values !== null && unshared !== undefined) {
			for (const slot of values) {
				if (unshared.has(toLowerCaseIfNeeded(slot))) return null;
			}
		}
	}
	if (values === null || longhands === undefined) return null;
	const important = text.startsWith(IMPORTANT, end) ? IMPORTANT : "";
	let out = "";
	for (let i = 0; i < longhands.length; i++) {
		out += withColorFallback(`${longhands[i]}:${values[i]}${important};`);
	}
	return out;
};

/**
 * The value a later declaration is read for, which is the one it is written as.
 * A shorthand the target cannot read is lowered into longhands, and the
 * shorthand it keeps carries the line alone - a value every target reads. So an
 * earlier declaration of that property is not the fallback its spelling makes
 * it look like: what is written over it is readable, and it is dead.
 * @param {string} text the declaration, as printed
 * @param {number} colon where its `:` stands
 * @param {string} property its lowercased property name
 * @returns {string} the value to read it by
 */
const writtenValue = (text, colon, property) => {
	// Decided before the expansion is built: only these are ever written as
	// something else, and every other property pays one lookup.
	if (!LOWERED_SHORTHANDS.has(property) || !S._transforms.lowerUnsupported) {
		return printedValue(text, colon);
	}
	const expanded = expandUnsupportedShorthand(text);
	if (expanded === null) return printedValue(text, colon);
	// The shorthand stands in front of the longhands written beside it, which is
	// what `LOWERED_SHORTHANDS` names the shorthands this may be asked about by.
	// Every expansion is declarations, each written `name:value;`.
	const at = expanded.indexOf(":");
	return expanded.slice(at + 1, expanded.indexOf(";", at));
};

/**
 * Whether a declaration sets a custom property `unusedSymbols` says nothing
 * reads. Only a declaration: a rule's own name is decided by its prelude.
 * @param {CssPath} path the walk's accessors
 * @param {Node} item one child of the block
 * @param {string} text its printed text
 * @returns {boolean} true when the declaration goes
 */
const isUnusedCustomProperty = (path, item, text) => {
	if (S._unusedSymbols === null || path.type(item) !== NodeType.Declaration) {
		return false;
	}
	if (text.charCodeAt(1) !== CC_HYPHEN_MINUS) return false;
	// An escaped `:` belongs to the name; the first bare one ends it.
	let colon = 2;
	for (; colon < text.length; colon++) {
		const cc = text.charCodeAt(colon);
		if (cc === CC_COLON) break;
		if (cc === CC_REVERSE_SOLIDUS) colon++;
	}
	return S._unusedSymbols.has(unescapeIdentifier(text.slice(0, colon)));
};

/** @type {Int32Array | null} */
let mergeableNameShapes = null;
/**
 * @returns {Int32Array} the lengths, by the two letters a mergeable longhand starts with
 */
const mergeableNames = () => {
	if (mergeableNameShapes === null) {
		const shapes = new Int32Array(26 * 26);
		// The two placement shorthands `mergeGridPlacement` joins and the three
		// longhands `mergeGridTemplate` does, beside the table.
		for (const name of [
			...MERGE_LONGHANDS,
			"grid-row",
			"grid-column",
			...GRID_TEMPLATE_LONGHANDS
		]) {
			// Each opens on two letters and is shorter than 31 (a test pins both).
			const slot = nameShapeSlot(name.charCodeAt(0), name.charCodeAt(1));
			shapes[slot] |= 1 << name.length;
		}
		mergeableNameShapes = shapes;
	}
	return mergeableNameShapes;
};

/**
 * Whether a name of this shape may be a mergeable longhand.
 * @param {number} first the name's first code point
 * @param {number} second its second code point
 * @param {number} length its length
 * @returns {boolean} false only when the name is certainly not one
 */
const mayBeMergeableShape = (first, second, length) => {
	const slot = nameShapeSlot(first, second);
	if (slot === -1) return length > 31 || first > 127 || second > 127;
	return ((mergeableNames()[slot] >>> (length > 31 ? 31 : length)) & 1) !== 0;
};

/**
 * Whether a declaration's name has the shape of a mergeable longhand.
 * @param {Node} node the declaration
 * @returns {boolean} false only when the name is certainly not one
 */
const mayBeMergeableName = (node) => {
	const i = node;
	const start = S._starts[i];
	const end = S._aux0[i];
	if (!rangeHasEscape(start, end)) {
		return mayBeMergeableShape(
			S._input.charCodeAt(start),
			S._input.charCodeAt(start + 1),
			end - start
		);
	}
	// An escape spells the same name, which is the one the shape is read off.
	const name = unescapeIdentifier(S._input.slice(start, end));
	return mayBeMergeableShape(
		name.charCodeAt(0),
		name.charCodeAt(1),
		name.length
	);
};
// Up to this many items a block's dead writes are found by comparing pairs: a
// block holds two declarations on average, and hashing each text costs more.
const PAIRWISE_ITEMS = 32;

/**
 * Whether a later declaration of a custom property leaves an earlier one of the
 * same name dead. Any token stream is a valid value, so only importance decides
 * - and a keyframe ignores an `!important` one rather than letting it win.
 * @param {CssPath} path the walk's accessors
 * @param {Node} earlier the earlier declaration
 * @param {Node} later the later one
 * @param {boolean} keyframe whether the block is a keyframe
 * @returns {boolean} true when the earlier is read nowhere
 */
const customWriteDead = (path, earlier, later, keyframe) => {
	// The lowering appends its own pair after the body this reads, so an authored
	// write of either name is left for that print to decide, not dropped here.
	if (S._loweringLightDark) {
		const name = path.name(later);
		if (name === LIGHT_PROPERTY || name === DARK_PROPERTY) return false;
	}
	const laterImportant = isImportant(later);
	if (keyframe) return !laterImportant && !isImportant(earlier);
	return laterImportant || !isImportant(earlier);
};

/**
 * The dead-write pass of `composeBlockBody` for a short block, pair by pair
 * rather than through maps; it marks the same items superseded.
 * @param {CssPath} path the walk's accessors
 * @param {Node[]} items the block's declarations and rules, in source order
 * @param {string[]} texts each item's printed text
 * @param {Set<number>} superseded where a dead item's index is added
 * @param {boolean} keyframe whether the block is a keyframe
 * @param {PrintContext} writer the print context holding what each item printed
 * @returns {void}
 */
const supersedeByPairs = (path, items, texts, superseded, keyframe, writer) => {
	const properties = S._pairProperties;
	const gone = S._pairGone;
	const table = declarationTable();
	// Where the run of declarations since the last nested rule starts: a rule
	// parts the ones either side of it into their own places in the cascade.
	let segment = 0;
	for (let i = 0; i < items.length; i++) {
		const text = texts[i];
		properties[i] = "";
		if (path.type(items[i]) !== NODE_TYPE_DECLARATION) {
			// A rule gone from the output parts nothing: one printing nothing, or
			// one an identical later sibling wins the tie over wherever both are read.
			if (text.length === 0) continue;
			if (!namesPositionalAtRule(text)) {
				let again = false;
				for (let k = i + 1; k < items.length && !again; k++) {
					again =
						texts[k] === text && path.type(items[k]) !== NODE_TYPE_DECLARATION;
				}
				if (again) {
					superseded.add(i);
					continue;
				}
			}
			segment = i + 1;
			continue;
		}
		gone[i] = 0;
		for (let k = segment; k < i; k++) {
			if (texts[k] === text) superseded.add(k);
		}
		const colon = text.indexOf(":");
		if (colon <= 0) continue;
		// A custom property's value is a token stream nothing here reads, but its
		// name is case-sensitive and a later one of it still wins.
		if (text.charCodeAt(1) === CC_HYPHEN_MINUS) {
			const name = text.slice(0, colon);
			properties[i] = name;
			for (let k = i - 1; k >= segment; k--) {
				if (gone[k] !== 0 || properties[k] !== name) continue;
				if (customWriteDead(path, items[k], items[i], keyframe)) {
					superseded.add(k);
					gone[k] = 1;
				}
			}
			continue;
		}
		const own = ownSpellingId(items[i], text, writer);
		const property = own >= 0 ? table.names[own] : printedProperty(text, colon);
		properties[i] = property;
		let value = "";
		let names = false;
		let read = false;
		for (let k = i - 1; k >= segment; k--) {
			if (gone[k] !== 0 || properties[k] !== property) continue;
			if (!read) {
				value = printedValue(text, colon);
				names = CUSTOM_IDENT_LIST_PROPERTIES.has(property);
				read = true;
			}
			const beforeText = texts[k];
			const written = printedValue(beforeText, beforeText.indexOf(":"));
			if (
				laterWriteWins(
					path,
					items[i],
					value,
					items[k],
					written,
					property,
					names,
					keyframe
				)
			) {
				superseded.add(k);
				gone[k] = 1;
			}
		}
		const longhands = overridableLonghands(property);
		if (longhands === undefined) continue;
		if (!read) value = printedValue(text, colon);
		for (let k = i - 1; k >= segment; k--) {
			if (gone[k] !== 0 || !longhands.has(properties[k])) continue;
			if (shorthandWriteWins(items[k], items[i], value, property, keyframe)) {
				superseded.add(k);
				gone[k] = 1;
			}
		}
	}
	properties.length = 0;
};

/**
 * Whether a block's winning `display` is one the 2009 flexbox draft lays out:
 * the last `!important` one where there is any, else the last one written. Only
 * that draft's displays and the flex ones replacing them count, since any other
 * may be one an engine drops.
 * @param {CssPath} path the walk's accessors
 * @param {Declaration[]} decls the block's declarations, in source order
 * @param {PrintContext} writer the print context (children's printed text)
 * @returns {boolean} true when that display names the draft
 */
const laysOutAsLegacyBox = (path, decls, writer) => {
	const twins = /** @type {Map<string, [string, number][]>} */ (
		getPrefixedValues().get("display")
	);
	let legacy = false;
	let winnerImportant = false;
	for (const decl of decls) {
		if (asciiLowercaseName(path.name(decl)) !== "display") continue;
		const important = isImportant(decl);
		if (winnerImportant && !important) continue;
		const text = writer.get(decl);
		const value = toLowerCaseIfNeeded(
			text
				.slice(text.indexOf(":") + 1)
				.replace(/;$/, "")
				.replace(PRINTED_IMPORTANT_RE, "")
				.trim()
		);
		const isLegacy = LEGACY_BOX_DISPLAYS.has(value);
		if (!isLegacy && !twins.has(value)) continue;
		legacy = isLegacy;
		winnerImportant = important;
	}
	return legacy;
};

/**
 * The property a printed declaration sets, its other spellings read as it.
 * @param {string} property a lowercased property name
 * @returns {string} the property every spelling of it shares
 */
const canonicalProperty = (property) => {
	const alias = getPropertyAliases().get(property);
	return alias === undefined ? property : alias;
};

/**
 * Whether the order of two declarations can decide what a block sets: one
 * property under two spellings, a shorthand and what it sets, two shorthands
 * sharing a longhand, or a flow-relative side and a physical one.
 * @param {string} a a property, read through `canonicalProperty`
 * @param {string} b another
 * @returns {boolean} true when the two must keep their order
 */
const orderMatters = (a, b) => {
	if (a === b || a === "all" || b === "all") return true;
	if (a.startsWith("--") || b.startsWith("--")) return false;
	let row = orderMattersMemo.get(a);
	let matters = row === undefined ? undefined : row.get(b);
	if (matters !== undefined) return matters;
	matters = computeOrderMatters(a, b);
	// The names are the author's, so a sheet of made-up ones starts again.
	if (orderMattersEntries === ORDER_MATTERS_ENTRIES) {
		orderMattersMemo.clear();
		orderMattersEntries = 0;
		row = undefined;
	}
	if (row === undefined) {
		row = new Map();
		orderMattersMemo.set(a, row);
	}
	row.set(b, matters);
	orderMattersEntries++;
	return matters;
};

// `orderMatters` by its first property, then its second: a sheet names few
// properties, and the walks back over a block ask of the same pairs again.
/** @type {Map<string, Map<string, boolean>>} */
const orderMattersMemo = new Map();
let orderMattersEntries = 0;
const ORDER_MATTERS_ENTRIES = 1 << 15;

/**
 * `orderMatters` without the memo.
 * @param {string} a a property, read through `canonicalProperty`
 * @param {string} b another
 * @returns {boolean} true when the two must keep their order
 */
const computeOrderMatters = (a, b) => {
	// A corner's radius is no side's: `border-bottom` sets no `-radius` it starts.
	if (
		a.charCodeAt(0) !== CC_HYPHEN_MINUS &&
		b.charCodeAt(0) !== CC_HYPHEN_MINUS &&
		a.endsWith("-radius") !== b.endsWith("-radius")
	) {
		return false;
	}
	if (extendsProperty(a, b) || extendsProperty(b, a)) return true;
	// A vendor property no standard one aliases says nothing of what it sets
	// beyond its words: `-webkit-border-before` is a border side.
	if (
		a.charCodeAt(0) === CC_HYPHEN_MINUS ||
		b.charCodeAt(0) === CC_HYPHEN_MINUS
	) {
		return sideRoot(a) === sideRoot(b);
	}
	const table = getShorthandLonghands();
	const longA = table.get(a);
	const longB = table.get(b);
	if (longA !== undefined) {
		if (longA.has(b)) return true;
		if (longB !== undefined) {
			for (const longhand of longB) if (longA.has(longhand)) return true;
		}
	}
	if (longB !== undefined && longB.has(a)) return true;
	if (sideRoot(a) !== sideRoot(b)) return false;
	return (
		(LOGICAL_SIDE_RE.test(a) || LOGICAL_SIDE_RE.test(b)) &&
		(PHYSICAL_SIDE_RE.test(a) || PHYSICAL_SIDE_RE.test(b))
	);
};

/**
 * Whether a property name is another's followed by more words: `margin-top` of
 * `margin`. Read in place, as a `${base}-` prefix would be built on every call.
 * @param {string} name a property
 * @param {string} base another
 * @returns {boolean} true when `name` starts with `base` and a `-`
 */
const extendsProperty = (name, base) =>
	name.length > base.length &&
	name.charCodeAt(base.length) === CC_HYPHEN_MINUS &&
	name.startsWith(base);

// A box side, corner or axis a property names, physical or flow-relative.
const PHYSICAL_SIDE_RE =
	/-(?:top|right|bottom|left|x|y)(?=-|$)|^(?:(?:min|max)-)?(?:top|right|bottom|left|width|height)$|-(?:width|height)$/;
const LOGICAL_SIDE_RE = /(?:^|-)(?:inline|block|start|end)(?=-|$)/;

/**
 * Whether a declaration between a merge's slots keeps the later slots from
 * moving above it. Of a property no dataset names only the words are known:
 * a vendor one may set anything, another its own family.
 * @param {string} between the property standing between, lowercased
 * @param {string[]} later the slots written after it
 * @param {string[]} families the prefixes an unnamed property is read by
 * @returns {boolean} true when the merge must not step over it
 */
const blocksMerge = (between, later, families) => {
	if (between.startsWith("--")) return false;
	if (getDeclarationRanks().has(between)) {
		const property = canonicalProperty(between);
		for (const slot of later) {
			if (orderMatters(property, canonicalProperty(slot))) return true;
		}
		return false;
	}
	if (between.charCodeAt(0) === CC_HYPHEN_MINUS) return true;
	return families.some(
		(family) => between === family || between.startsWith(`${family}-`)
	);
};

// The properties `sideRoot` reads as `inset`'s and as `size`'s sides.
const INSET_SIDE_RE = /^(?:top|right|bottom|left)$/;
const SIZE_PROPERTY_RE =
	/^(?:(?:min|max)-)?(?:width|height|inline-size|block-size)$/;

/**
 * The word a property's sides share: `margin` for `margin-left` and
 * `margin-inline-start`, `inset` for `top`, `size` for `width` and `inline-size`.
 * @param {string} property a lowercased property name
 * @returns {string} that word
 */
const sideRoot = (property) => {
	const bare =
		property.charCodeAt(0) === CC_HYPHEN_MINUS
			? property.replace(VENDOR_ITEM_PREFIX_RE, "")
			: property;
	if (INSET_SIDE_RE.test(bare)) return "inset";
	if (SIZE_PROPERTY_RE.test(bare)) return "size";
	const dash = bare.indexOf("-");
	return dash === -1 ? bare : bare.slice(0, dash);
};

/**
 * Whether a block writes declarations and nothing else: a nested rule that
 * prints nothing is no rule its order has to keep.
 * @param {CssPath} path the walk's accessors
 * @param {Node[]} items the block's children
 * @param {string[]} texts what each printed
 * @returns {boolean} true when every child written is a declaration
 */
const writesOnlyDeclarations = (path, items, texts) => {
	for (let i = 0; i < items.length; i++) {
		if (texts[i].length !== 0 && path.type(items[i]) !== NodeType.Declaration) {
			return false;
		}
	}
	return true;
};

/**
 * The order to print a block's declarations in: each one no family ranks where
 * it stands, then the ranked ones family by family, so blocks setting the same
 * things read alike. Null keeps the block as written - a property no dataset
 * names, or two declarations whose order can decide what is read, would move.
 * @param {string[]} texts the declarations as printed, or a block's item texts
 * @param {Node[] | null} items the block's items, read by `ownSpellingId`
 * @param {number[] | null} indices which of `texts` are the declarations, or null for all
 * @param {PrintContext=} writer the print context, given with `items`
 * @returns {number[] | null} where each comes from, or null to keep them as written
 */
const declarationOrder = (texts, items, indices, writer) => {
	const table = declarationTable();
	/** @type {number[]} */
	const properties = [];
	/** @type {number[]} */
	const rankOf = [];
	let ranked = false;
	const count = indices === null ? texts.length : indices.length;
	for (let k = 0; k < count; k++) {
		const at = indices === null ? k : indices[k];
		let id =
			items === null
				? -3
				: ownSpellingId(
						items[at],
						texts[at],
						/** @type {PrintContext} */ (writer)
					);
		if (id === -3) {
			const text = texts[at];
			const colon = text.indexOf(":");
			if (colon <= 0) return null;
			const property = toLowerCaseIfNeeded(text.slice(0, colon));
			const known = table.ids.get(property);
			id = property.startsWith("--") ? -1 : known === undefined ? -2 : known;
		}
		if (id === -1) {
			properties.push(-1);
			rankOf.push(-1);
			continue;
		}
		if (id === -2) return null;
		const rank = table.ranks[id];
		if (rank !== -1) ranked = true;
		properties.push(table.canonical[id]);
		rankOf.push(rank);
	}
	if (!ranked) return null;
	// Already in rank order, which half of all blocks are: the stable sort would
	// hand every index back where it stands.
	let inOrder = true;
	for (let i = 1; i < rankOf.length && inOrder; i++) {
		if (rankOf[i] < rankOf[i - 1]) inOrder = false;
	}
	if (inOrder) return null;
	// A stable insertion sort by rank: blocks are short, and this allocates no
	// comparator and no copy as `Array#sort` does.
	/** @type {number[]} */
	const order = [];
	for (let i = 0; i < rankOf.length; i++) {
		let at = order.length;
		order.push(i);
		while (at > 0 && rankOf[order[at - 1]] > rankOf[i]) {
			order[at] = order[at - 1];
			at--;
		}
		order[at] = i;
	}
	// Not the identity: the ranks were out of order, and a stable sort of a list
	// not already sorted moves something.
	for (let i = 0; i < order.length; i++) {
		// Each declaration that now stands after one written later than it, the
		// ones still at their index included: `[a, b, c]` printed `[c, b, a]`.
		for (let j = i + 1; j < order.length; j++) {
			if (
				order[j] < order[i] &&
				orderMattersById(table, properties[order[i]], properties[order[j]])
			) {
				return null;
			}
		}
	}
	return order;
};

/**
 * Every property `getDeclarationRanks` names by a small number: its rank, the
 * number of the property `canonicalProperty` reads it as, and `orderMatters`
 * of two such numbers, filled in as pairs are asked of.
 * @typedef {object} DeclarationTable
 * @property {Map<string, number>} ids each property's number
 * @property {Int32Array} ranks the rank of each number
 * @property {Int32Array} canonical the number of the property each is read as
 * @property {string[]} names the property each number stands for
 * @property {number} all the number of `all`
 * @property {(Uint8Array | undefined)[]} matters `orderMatters` at `matters[a][b]`, a row made by the first pair it leads: 0 unknown, 1 no, 2 yes
 * @property {Int32Array} slots open-addressed by `nameHashStep` of each name: its number + 1, 0 empty
 * @property {number} mask `slots.length - 1`
 */

/**
 * @returns {DeclarationTable} the table, built on first use
 */
const declarationTable = () => {
	if (S._declarationTableValue !== undefined) return S._declarationTableValue;
	const rankMap = getDeclarationRanks();
	/** @type {Map<string, number>} */
	const ids = new Map();
	/** @type {string[]} */
	const names = [];
	for (const name of rankMap.keys()) {
		ids.set(name, names.length);
		names.push(name);
	}
	const ranks = new Int32Array(names.length);
	const canonical = new Int32Array(names.length);
	for (let i = 0; i < names.length; i++) {
		ranks[i] = /** @type {number} */ (rankMap.get(names[i]));
		// Every alias the table ranks is of a property it ranks too.
		canonical[i] = /** @type {number} */ (ids.get(canonicalProperty(names[i])));
	}
	let size = 1;
	while (size < names.length * 4) size *= 2;
	const slots = new Int32Array(size);
	for (let i = 0; i < names.length; i++) {
		const name = names[i];
		let hash = NAME_HASH_SEED;
		for (let at = 0; at < name.length; at++) {
			hash = nameHashStep(hash, name.charCodeAt(at));
		}
		let slot = hash & (size - 1);
		while (slots[slot] !== 0) slot = (slot + 1) & (size - 1);
		slots[slot] = i + 1;
	}
	S._declarationTableValue = {
		ids,
		ranks,
		canonical,
		names,
		all: /** @type {number} */ (ids.get("all")),
		matters: Array.from({ length: names.length }, () => undefined),
		slots,
		mask: size - 1
	};
	return S._declarationTableValue;
};

/**
 * `orderMatters` of two numbered properties, -1 for a custom one.
 * @param {DeclarationTable} table the numbering
 * @param {number} a a property's canonical number
 * @param {number} b another
 * @returns {boolean} true when the two must keep their order
 */
const orderMattersById = (table, a, b) => {
	if (a === b || a === table.all || b === table.all) return true;
	// Two custom properties are both -1 yet never trade places: they share a rank.
	if (a === -1 || b === -1) return false;
	let row = table.matters[a];
	// A sheet names few properties, so most rows of the square are never asked of.
	if (row === undefined) {
		row = table.matters[a] = new Uint8Array(table.names.length);
	}
	const known = row[b];
	if (known !== 0) return known === 2;
	const matters = computeOrderMatters(table.names[a], table.names[b]);
	row[b] = matters ? 2 : 1;
	return matters;
};

/**
 * Whether an engine reads a block as a list of rules alone, where text that is
 * no rule is the start of the next rule's prelude: a group rule's or a
 * `@keyframes` block outside a style rule. `@scope`'s also reads declarations.
 * @param {CssPath} path the accessor positioned on the block's rule
 * @returns {boolean} true when the block is a rule list
 */
const readsAsRuleList = (path) => {
	if (
		path.type() !== NODE_TYPE_AT_RULE ||
		path.within(NODE_TYPE_QUALIFIED_RULE)
	) {
		return false;
	}
	const name = atKeywordOf(path.node);
	return (
		(name !== "scope" && MERGEABLE_AT_RULES.has(name)) ||
		KEYFRAMES_AT_RULE_RE.test(name)
	);
};

/**
 * Blank what is written right before a rule that prints nothing, in a block an
 * engine reads as a rule list: whatever is no rule there is that rule's prelude,
 * so it goes with it rather than into the prelude of the rule after.
 * @param {CssPath} path the accessor positioned on the block's rule
 * @param {Node[]} items the block's items, in source order
 * @param {string[]} texts each item's printed text, in place
 * @returns {void}
 */
const dropTextGluedToDroppedRules = (path, items, texts) => {
	/**
	 * @param {Node} item one of the block's items
	 * @returns {boolean} whether it is a rule of its own
	 */
	const isRule = (item) => {
		const type = path.type(item);
		return type === NODE_TYPE_QUALIFIED_RULE || type === NODE_TYPE_AT_RULE;
	};
	for (let i = items.length - 1; i > 0; i--) {
		if (texts[i].length !== 0 || !isRule(items[i])) continue;
		for (let j = i - 1; j >= 0 && !isRule(items[j]); j--) texts[j] = "";
	}
};

/**
 * Put one declaration list together: the list-wide transforms (merge a family's
 * longhands into their shorthand, drop what a later declaration supersedes, add
 * and drop vendor prefixes, join adjacent rules) and the body text they make.
 * A rule's block and a whole `block-contents` parse are the same production, so
 * both go through here - what differs is only what is written around the body.
 * @param {CssPath} path the walk's accessors
 * @param {Declaration[]} decls the list's declarations
 * @param {Rule[] | null} rules the rules interleaved with them, if any
 * @param {PrintContext} writer the print context holding each node's text
 * @param {boolean} minify whether to run the transforms
 * @param {string} nl what prefixes each item: nothing minifying, a line break beautifying (declarations end in `;`, rules don't)
 * @param {Node | null} owner the block this is the body of, or null at top level
 * @param {boolean=} unusedRule whether `unusedSymbols` marked this block's rule, so nothing in it is written
 * @returns {{ body: string, items: Node[], texts: string[], superseded: Set<number> | null, droppedPrefix: Set<number> | null, addedPrefix: Map<number, string> | null, deadPrefixed: Set<Node> | null, spans: RuleSpan[] | null }} the body, and what went into it
 */
const composeBlockBody = (
	path,
	decls,
	rules,
	writer,
	minify,
	nl,
	owner,
	unusedRule = false
) => {
	// Merge the split declarations + child rules back into source order
	// (§5.4.5 loses their interleaving; reordering would change the cascade).
	/** @type {Node[]} */
	let items = decls;
	if (rules !== null && rules.length !== 0) {
		items =
			decls.length === 0
				? rules
				: [...decls, ...rules].sort((a, b) => startOf(a) - startOf(b));
	}
	// CSS Animations 1 §3: a keyframe ignores an `!important` declaration, so
	// one there is read for nothing and stands over nothing before it.
	const keyframe =
		owner !== null &&
		path.parent !== null &&
		path.type(path.parent) === NODE_TYPE_AT_RULE &&
		KEYFRAMES_AT_RULE_RE.test(atKeywordOf(path.parent));
	S._legacyBoxBlock =
		minify && S._prefixingOn && laysOutAsLegacyBox(path, decls, writer);
	// A family's longhands are their shorthand, so they print as it: four sides or
	// corners, the two a pair shorthand sets, or an order-free one's slots.
	// Earlier tables win, though no property is in two.
	const mergeable = minify;
	/** @type {Map<Node, string>[] | null} */
	let merges = null;
	// A write a later one of the same property leaves carrying nothing, found
	// before the merge so the family reads as the output will carry it.
	/** @type {Set<Node> | null} */
	let deadWrites = null;
	let shaped = 0;
	if (mergeable && decls.length >= 2) {
		for (let i = 0; i < decls.length && shaped < 2; i++) {
			if (mayBeMergeableName(decls[i])) shaped++;
		}
	}
	if (shaped >= 2) {
		// One pass over the names for all three tables: which declaration wrote each
		// property, which was written twice, and how many a shorthand could gather.
		// One needs two, so a block holding fewer writes none - almost every block.
		/** @type {Map<string, number>} */
		const at = new Map();
		/** @type {Set<string>} */
		const repeated = new Set();
		let mergeableNames = 0;
		for (let i = 0; i < decls.length; i++) {
			const property = asciiLowercaseName(path.name(decls[i]));
			const before = at.get(property);
			if (before === undefined) {
				if (MERGE_LONGHANDS.has(property)) mergeableNames++;
			} else if (
				S._transforms.removeDeadRules &&
				writeIsDead(path, writer, decls[before], decls[i], keyframe)
			) {
				if (deadWrites === null) deadWrites = new Set();
				deadWrites.add(decls[before]);
			} else {
				repeated.add(property);
			}
			at.set(property, i);
		}
		const placement = at.has("grid-row") && at.has("grid-column");
		const template = GRID_TEMPLATE_LONGHANDS.every((name) => at.has(name));
		if (mergeableNames >= 2 || placement || template) {
			// Child rules before each declaration: a family whose first and last
			// count the same has none between them for the merge to step over.
			/** @type {Uint32Array | null} */
			let rulesBefore = null;
			if (items !== decls) {
				rulesBefore = new Uint32Array(decls.length);
				let seen = 0;
				let next = 0;
				for (let i = 0; i < items.length; i++) {
					if (next < decls.length && items[i] === decls[next]) {
						rulesBefore[next++] = seen;
					} else {
						seen++;
					}
				}
			}
			for (let t = 0; t < MERGE_TABLES.length; t++) {
				const table = MERGE_TABLES[t][0];
				const mode = MERGE_TABLES[t][1];
				const merged = mergeBoxLonghands(
					path,
					decls,
					writer,
					table,
					mode,
					at,
					repeated,
					rulesBefore
				);
				if (merged !== null) {
					if (merges === null) merges = [];
					merges.push(merged);
				}
			}
			const grid =
				placement && S._transforms.mergeLonghands
					? mergeGridPlacement(path, decls, writer, at, repeated, rulesBefore)
					: null;
			if (grid !== null) {
				if (merges === null) merges = [];
				merges.push(grid);
			}
			const gridTemplate =
				template && S._transforms.mergeLonghands
					? mergeGridTemplate(path, decls, writer, at, repeated, rulesBefore)
					: null;
			if (gridTemplate !== null) {
				if (merges === null) merges = [];
				merges.push(gridTemplate);
			}
		}
	}
	/** @type {string[]} */
	const texts = [];
	// A rule `unusedSymbols` marked writes nothing, which is what the empty-block
	// drop below - and `streamClose`'s - then takes out; a custom property it
	// named goes on its own, wherever it stands.
	const dropAll = unusedRule;
	for (const item of items) {
		/** @type {string | undefined} */
		let replacement;
		if (merges !== null) {
			for (const merged of merges) {
				replacement = merged.get(item);
				if (replacement !== undefined) break;
			}
		}
		let text = replacement === undefined ? writer.get(item) : replacement;
		if (minify && (dropAll || S._unusedSymbols !== null)) {
			text = dropAll || isUnusedCustomProperty(path, item, text) ? "" : text;
		}
		texts.push(text);
	}
	// The block's children have all printed, so their sibling state is final:
	// which a twin has made dead, and which still wait for one. A rule that may
	// yet be taken back stays one rule, so it is kept out of a join.
	const childScope =
		S._seenPrefixRules === null ? undefined : S._seenPrefixRules.get(owner);
	// One signature holds every twin written under it, so the rules are the
	// lists flattened rather than the values themselves.
	/** @type {Set<Node> | null} */
	let pendingRules = null;
	if (childScope !== undefined && childScope.pending !== null) {
		pendingRules = new Set();
		for (const held of childScope.pending.values()) {
			for (const node of held) pendingRules.add(node);
		}
	}
	// A block of declarations alone, most of them, holds no rule to join or drop.
	if (minify && items !== decls) {
		// Before the joins, so a rule it takes out stands in none of their way;
		// and again after any join, which can write a rule again in its turn.
		if (S._transforms.removeDeadRules) {
			dropRulesRepeatedLater(path, items, texts);
			dropRulesWrittenAgain(items, texts);
			while (
				mergeAdjacentRules(items, texts, pendingRules, null) &&
				dropRulesWrittenAgain(items, texts)
			);
		}
		mergeAdjacentRules(items, texts, pendingRules, null);
		mergeNamedLayerBlocks(items, texts);
		mergeDistantRules(items, texts);
		if (readsAsRuleList(path)) dropTextGluedToDroppedRules(path, items, texts);
	}
	// WHY: only the last of a set of declarations of one property can be read, so
	// the earlier carry nothing, whatever stands between them. Identical text
	// always resolves that way; a differently spelled value where the later writes
	// every name the earlier does, or where every target reads it
	// (`valueReadByTarget`), since otherwise the earlier is its fallback -
	// dropping those is how esbuild and lightningcss lose a `color(display-p3 ...)`
	// pair.
	// With no selection there are no engines to name, so the same question is
	// answered only where `dropOverriddenDeclarations` asks for it - csso and
	// cssnano answer it unconditionally, and give up the same fallback pair.
	/** @type {Set<number> | null} */
	let superseded = null;
	// CSS Animations 1 §3: a keyframe ignores an `!important` declaration, so one
	// there is read for nothing and stands over nothing. One item supersedes
	// nothing, and most rules hold one or none.
	const dropDead = minify && S._transforms.removeDeadRules && items.length > 1;
	const foldLonghands =
		minify && S._transforms.mergeLonghands && items.length > 1;
	if (dropDead || foldLonghands) {
		superseded = new Set();
		if (dropDead) {
			// A write the merge above already read as dead goes here: it read the
			// family as the output carries it, so the output must carry it that way.
			if (deadWrites !== null) {
				for (let i = 0; i < items.length; i++) {
					if (deadWrites.has(items[i])) superseded.add(i);
				}
			}
			if (items.length <= PAIRWISE_ITEMS) {
				supersedeByPairs(path, items, texts, superseded, keyframe, writer);
			} else {
				/** @type {Map<string, number>} */
				const seen = new Map();
				/** @type {Map<string, number[]>} */
				const wrote = new Map();
				// Where each rule is written last: an identical later sibling wins
				// the tie wherever both are read, so an earlier one is read for nothing.
				/** @type {Map<string, number>} */
				const lastRules = new Map();
				for (let i = 0; i < items.length; i++) {
					const rule = texts[i];
					if (
						path.type(items[i]) !== NODE_TYPE_DECLARATION &&
						rule.length !== 0 &&
						!namesPositionalAtRule(rule)
					) {
						lastRules.set(rule, i);
					}
				}
				for (let i = 0; i < items.length; i++) {
					// A nested rule parts the declarations around it into their own
					// rules, so the one before it is read at its own place in the
					// cascade rather than resolving to the one after.
					if (path.type(items[i]) !== NODE_TYPE_DECLARATION) {
						// One gone from the output parts nothing.
						const last = lastRules.get(texts[i]);
						if (texts[i].length === 0) continue;
						if (last !== undefined && last > i) {
							superseded.add(i);
							continue;
						}
						seen.clear();
						wrote.clear();
						continue;
					}
					const text = texts[i];
					const at = seen.get(text);
					if (at !== undefined) superseded.add(at);
					seen.set(text, i);
					const colon = text.indexOf(":");
					if (colon <= 0) continue;
					// A custom property's value is a token stream nothing here reads, so
					// only its case-sensitive name and its importance decide.
					if (text.charCodeAt(1) === CC_HYPHEN_MINUS) {
						const name = text.slice(0, colon);
						const before = wrote.get(name);
						if (before === undefined) {
							wrote.set(name, [i]);
						} else {
							for (let j = before.length - 1; j >= 0; j--) {
								if (
									!customWriteDead(path, items[before[j]], items[i], keyframe)
								) {
									continue;
								}
								superseded.add(before[j]);
								before.splice(j, 1);
							}
							before.push(i);
						}
						continue;
					}
					const property = printedProperty(text, colon);
					const names = CUSTOM_IDENT_LIST_PROPERTIES.has(property);
					let earlier = wrote.get(property);
					if (earlier === undefined) {
						earlier = [];
						wrote.set(property, earlier);
					} else {
						const value = printedValue(text, colon);
						for (let j = earlier.length - 1; j >= 0; j--) {
							const before = earlier[j];
							// One already dead, as a repeat of its text is, is dead whatever
							// this one writes: asking leaves a run of repeats quadratic.
							if (superseded.has(before)) {
								earlier.splice(j, 1);
								continue;
							}
							const beforeText = texts[before];
							const written = printedValue(beforeText, beforeText.indexOf(":"));
							if (
								!laterWriteWins(
									path,
									items[i],
									value,
									items[before],
									written,
									property,
									names,
									keyframe
								)
							) {
								continue;
							}
							superseded.add(before);
							earlier.splice(j, 1);
						}
					}
					earlier.push(i);
					const longhands = overridableLonghands(property);
					if (longhands === undefined) continue;
					const value = printedValue(text, colon);
					for (const longhand of longhands) {
						const writes = wrote.get(longhand);
						if (writes === undefined) continue;
						for (let j = writes.length - 1; j >= 0; j--) {
							const before = writes[j];
							if (
								superseded.has(before) ||
								shorthandWriteWins(
									items[before],
									items[i],
									value,
									property,
									keyframe
								)
							) {
								superseded.add(before);
								writes.splice(j, 1);
							}
						}
					}
				}
			}
		}
		// After the supersedes: a declaration a later one already made dead is
		// no shorthand to fold into, and folding never makes one dead.
		if (foldLonghands) {
			foldFollowingLonghands(path, items, texts, superseded, writer);
		}
		// A dead child parts nothing, so the two that stood either side of one
		// are adjacent in what goes out and join there rather than a pass later.
		if (superseded.size !== 0) {
			mergeAdjacentRules(items, texts, pendingRules, superseded);
		}
	}
	// Vendor prefixes: drop a prefixed declaration no target needs (its
	// unprefixed sibling already covers them), and before an unprefixed one
	// add the prefixes a target still needs. Off with no target list.
	/** @type {Set<number> | null} */
	let droppedPrefix = null;
	/** @type {Map<number, string> | null} */
	let addedPrefix = null;
	if (S._prefixingOn) {
		// One pass reads each declaration's property, and only a block writing
		// a property some engine spells with a prefix - few do - is walked
		// again to decide what to add or drop.
		/** @type {string[]} */
		const properties = [];
		// The value only where its property has vendor spellings for one, which
		// is what keeps the read off every other declaration.
		/** @type {string[]} */
		const values = [];
		let prefixable = false;
		for (let i = 0; i < items.length; i++) {
			const text = texts[i];
			if (path.type(items[i]) !== NODE_TYPE_DECLARATION || text.length === 0) {
				properties.push("");
				values.push("");
				continue;
			}
			// The name is read only where its shape says it could matter, which
			// is what keeps this off the declarations - almost all of them - that
			// no engine ever spelled another way.
			const colon = text.indexOf(":");
			if (!mayPrefixDeclaration(text, colon)) {
				properties.push("");
				values.push("");
				continue;
			}
			const property = printedProperty(text, colon);
			properties.push(property);
			const valueTable = getPrefixedValues().get(property);
			values.push(valueTable === undefined ? "" : printedValue(text, colon));
			if (
				valueTable !== undefined ||
				getPrefixedProperties().has(property) ||
				(property.charCodeAt(0) === CC_HYPHEN_MINUS &&
					VENDOR_PREFIX.test(property))
			) {
				prefixable = true;
			}
		}
		if (prefixable) {
			/** @type {Set<string>} */
			const present = new Set();
			// Where each value was last written, plain and important, so a vendor
			// spelling is dropped only for a twin that wins the cascade over it.
			/** @type {Map<string, number>} */
			const plainAt = new Map();
			/** @type {Map<string, number>} */
			const importantAt = new Map();
			for (let i = 0; i < properties.length; i++) {
				if (properties[i].length === 0) continue;
				present.add(properties[i]);
				(isImportant(items[i]) ? importantAt : plainAt).set(properties[i], i);
				// A value is only ever asked for against its own property, so the
				// two share one set.
				if (values[i].length !== 0) {
					const key = `${properties[i]}\0${values[i]}`;
					present.add(key);
					(isImportant(items[i]) ? importantAt : plainAt).set(key, i);
				}
			}
			for (let i = 0; i < properties.length; i++) {
				const property = properties[i];
				if (property.length === 0) continue;
				let add = "";
				const value = values[i];
				if (value.length !== 0) {
					const valueTable = /** @type {Map<string, [string, number][]>} */ (
						getPrefixedValues().get(property)
					);
					const keyword = prefixedValueKeyword(valueTable, value);
					if (keyword !== undefined) {
						// A vendor-spelled value is dead where its keyword wins: an alias
						// means that keyword wherever it parses, so importance decides, but
						// a 2009 box lays out apart, so the keyword must come later too.
						const twin = `${property}\0${keyword}`;
						const legacyBox = LEGACY_BOX_DISPLAYS.has(
							toLowerCaseIfNeeded(value)
						);
						const importantTwin = importantAt.get(twin);
						const plainTwin = plainAt.get(twin);
						const twinWins = isImportant(items[i])
							? importantTwin !== undefined && (importantTwin > i || !legacyBox)
							: importantTwin !== undefined ||
								(plainTwin !== undefined && (plainTwin > i || !legacyBox));
						if (twinWins && prefixRemovable(valueTable, keyword, value)) {
							if (droppedPrefix === null) droppedPrefix = new Set();
							droppedPrefix.add(i);
							continue;
						}
					} else {
						const spellings = neededPrefixes(valueTable, value);
						if (spellings !== null) {
							const colon = property.length;
							for (const spelling of spellings) {
								if (present.has(`${property}\0${spelling}`)) continue;
								add += `${
									nl +
									texts[i].slice(0, colon + 1) +
									spelling +
									texts[i].slice(colon + 1 + value.length)
								}`;
							}
						}
					}
				}
				const base =
					property.charCodeAt(0) === CC_HYPHEN_MINUS
						? prefixedPropertyName(property)
						: undefined;
				if (base !== undefined) {
					// An engine still reading the vendor name as an alias cascades the
					// two as one property, so it is dead only behind a twin that wins.
					const importantBase = importantAt.get(base);
					const plainBase = plainAt.get(base);
					const important = isImportant(items[i]);
					const baseWins = important
						? importantBase !== undefined && importantBase > i
						: importantBase !== undefined ||
							(plainBase !== undefined && plainBase > i);
					// ...or behind one of the same importance saying the same thing.
					const twinAt = important ? importantBase : plainBase;
					const sameTwin =
						twinAt !== undefined &&
						(important || importantBase === undefined) &&
						texts[twinAt].slice(
							base.length + 1,
							printedValueEnd(texts[twinAt], base.length)
						) ===
							texts[i].slice(
								property.length + 1,
								printedValueEnd(texts[i], property.length)
							);
					if (
						(baseWins || sameTwin) &&
						prefixedPropertyRemovable(base, property)
					) {
						if (droppedPrefix === null) droppedPrefix = new Set();
						droppedPrefix.add(i);
						continue;
					}
				} else {
					const needed = neededPrefixes(getPrefixedProperties(), property);
					if (needed !== null) {
						for (const spelling of needed) {
							if (present.has(spelling)) continue;
							const copy = prefixedDeclaration(
								spelling,
								texts[i],
								property.length
							);
							if (copy.length !== 0) add += nl + copy;
						}
					}
				}
				if (add.length !== 0) {
					if (addedPrefix === null) addedPrefix = new Map();
					addedPrefix.set(i, add);
				}
			}
		}
	}
	// A color the target cannot read gets the declaration it names written again
	// before it, in a spelling it does. Only where the selection names a function
	// no target reads, which keeps this off every other block.
	/** @type {Map<number, string> | null} */
	let addedFallback = null;
	if (minify && S._colorFallbacksNeeded && S._transforms.colorFallbacks) {
		/** @type {Set<string>} */
		const alreadyWritten = new Set();
		for (let i = 0; i < items.length; i++) {
			const text = texts[i];
			if (path.type(items[i]) !== NODE_TYPE_DECLARATION || text.length === 0) {
				continue;
			}
			// One the body never writes is no fallback the author left.
			if (superseded !== null && superseded.has(i)) continue;
			if (droppedPrefix !== null && droppedPrefix.has(i)) continue;
			const colon = text.indexOf(":");
			const property = printedProperty(text, colon);
			// An earlier declaration of the same property is already the fallback the
			// author wrote. A shorthand the target cannot read is lowered below into
			// longhands carrying their own, spelled as this one would not be.
			if (
				!alreadyWritten.has(property) &&
				text.includes("(") &&
				!(
					S._transforms.lowerUnsupported &&
					expandUnsupportedShorthand(text) !== null
				)
			) {
				const fallback = colorFallbackDeclaration(text, colon);
				if (fallback !== null) {
					if (addedFallback === null) addedFallback = new Map();
					addedFallback.set(i, fallback);
				}
			}
			alreadyWritten.add(property);
		}
	}
	// Every child has printed by now, so the sibling set they shared goes.
	if (S._seenPrefixRules !== null && owner !== null) {
		S._seenPrefixRules.delete(owner);
	}
	// A nested prefixed rule an unprefixed twin has since made dead weight:
	// the twin could not take it back out of the output, since the text was
	// still on its way here, so it is left out as the body is put together.
	const deadPrefixed = childScope === undefined ? null : childScope.dead;
	let body = "";
	// Where each rule this block carries lands in it, so the copy making one dead
	// finds it without a second read of the sheet. A nested block's spans move in
	// with its text and its prelude joins their keys.
	/** @type {RuleSpan[] | null} */
	let spans = null;
	// One per child with a body, in the order they finished - which is what
	// `rules` holds, so there is nothing to count. Nothing reads them while
	// not minifying, when no block records any.
	const bodies = minify && rules !== null ? rules.length : 0;
	const childSpans =
		bodies === 0 ? NO_BLOCK_SPANS : S._blockSpans.splice(-bodies, bodies);
	let atChild = 0;
	// What each written declaration prints as, its fallback and vendor copies
	// with it, where the block's order is one `declarationOrder` may choose.
	/** @type {string[] | null} */
	const pieces =
		minify &&
		S._transforms.reorderDeclarations &&
		items.length > 1 &&
		owner !== null &&
		(path.type(owner) === NODE_TYPE_QUALIFIED_RULE ||
			NESTED_GROUP_AT_RULES.has(atKeywordOf(owner))) &&
		writesOnlyDeclarations(path, items, texts)
			? []
			: null;
	/** @type {number[]} */
	const pieceAt = [];
	// The body before its last piece, and that piece: the `;` a `}` makes
	// redundant is cut off the piece, as reading the body's end would flatten it.
	let prior = "";
	let last = "";
	for (let i = 0; i < texts.length; i++) {
		const isBlock =
			bodies !== 0 && path.type(items[i]) !== NODE_TYPE_DECLARATION;
		const mine = isBlock ? childSpans[atChild++] : undefined;
		if (droppedPrefix !== null && droppedPrefix.has(i)) continue;
		let text = texts[i];
		if (text.length === 0) continue;
		if (superseded !== null && superseded.has(i)) continue;
		if (deadPrefixed !== null && deadPrefixed.has(items[i])) continue;
		// Before the vendor spellings: this one is the oldest of the set, and the
		// only one an engine reading none of the others is left with.
		if (addedFallback !== null) {
			const fallback = addedFallback.get(i);
			if (fallback !== undefined) {
				body +=
					nl + (S._oldTokenizer ? spaceForOldTokenizer(fallback) : fallback);
			}
		}
		if (addedPrefix !== null) {
			const add = addedPrefix.get(i);
			if (add !== undefined) {
				body += S._oldTokenizer ? spaceForOldTokenizer(add) : add;
			}
		}
		// Last, over what every list-wide pass above left: those read a
		// declaration's property out of its text, and a shorthand lowered into its
		// longhands is no longer one declaration to read.
		if (minify && !isBlock) {
			const expanded = S._transforms.lowerUnsupported
				? expandUnsupportedShorthand(text)
				: null;
			if (expanded !== null) text = expanded;
			if (S._oldTokenizer) text = spaceForOldTokenizer(text);
		}
		if (pieces !== null) {
			pieces.push(body + text);
			pieceAt.push(i);
			body = "";
			continue;
		}
		body += nl;
		const at = body.length;
		prior = body;
		last = text;
		body += text;
		if (minify && isBlock) {
			if (spans === null) spans = [];
			let inner = /** @type {BlockSpans} */ (mine);
			// A join or drop wrote the child again, so what it recorded names text
			// that moved: an at-rule's spans are read off the join's children.
			if (text !== writer.lookup(items[i])) {
				const entry = ruleEntryOf(items[i], text);
				inner = entry.atRule ? joinedAtRuleSpans(entry) : WHOLE_TEXT_SPANS;
			}
			collectRuleSpans(spans, items[i], text, at, path, inner);
		}
	}
	if (pieces !== null) {
		const order = declarationOrder(texts, items, pieceAt, writer);
		for (let i = 0; i < pieces.length; i++) {
			prior = body;
			last = pieces[order === null ? i : order[i]];
			body += last;
		}
	}
	// Drop the redundant `;` a following `}` - or, at top level, the end of the
	// input - makes so, when minifying.
	if (minify && last.charCodeAt(last.length - 1) === CC_SEMICOLON) {
		body = prior + last.slice(0, -1);
	}

	return {
		body,
		items,
		texts,
		superseded,
		droppedPrefix,
		addedPrefix,
		deadPrefixed,
		spans
	};
};

/**
 * Build a `SkipOptions.types` set (drop these component-value node types from
 * value / function-arg lists) from a list of `NodeType`s. Preludes are separate
 * (`SkipOptions.selectorPrelude` / `atRulePrelude`). The caller owns the safety
 * contract: only pass types nothing reads in the intended parse. Two
 * grammar-internal caveats beyond consumer needs: dropping both `Delim` and
 * `Ident` loses `!important` detection, and dropping `SimpleBlock` loses the
 * custom-property `{}`-value check (and its subtree). Precompute once per
 * configuration and reuse across parses.
 * @param {number[]} nodeTypes component-value node types to drop
 * @returns {Uint8Array} skip-types set indexed by `NodeType`
 */
const buildSkipSet = (nodeTypes) => {
	const set = new Uint8Array(32);
	for (let i = 0; i < nodeTypes.length; i++) set[nodeTypes[i]] = 1;
	return set;
};

/**
 * The CSS path, the single argument every visitor receives. `A` is the same
 * object, for reads outside a walk with the node passed in.
 * @typedef {CssSyntaxPath} CssPath
 */

/** @typedef {1 | 2 | 3 | 4} CssListField a list `Field` */
/** @typedef {1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22} CssComponentValueType a component value's `NodeType` */
/**
 * CSS's parts by node type, which type each visitor's path; every CSS `Field`
 * is a list.
 * @typedef {{
 * types: CssNodeType,
 * field: CssListField,
 * flag: typeof Flag.important | typeof Flag.integer | typeof Flag.id,
 * part: 1 | 2 | 3,
 * text: 1 | 2 | 3,
 * fields: { 1: never, 2: 2, 3: never, 4: never, 5: never, 6: never, 7: never, 8: never, 9: never, 10: never, 11: never, 12: never, 13: never, 14: never, 15: never, 16: never, 17: never, 18: never, 19: never, 20: never, 21: never, 22: 2, 23: 2, 24: 1 | 3 | 4, 25: 1 | 3 | 4, 26: 4, 27: never, 28: never },
 * flags: { 1: never, 2: never, 3: never, 4: typeof Flag.id, 5: never, 6: never, 7: never, 8: never, 9: never, 10: typeof Flag.integer, 11: typeof Flag.integer, 12: typeof Flag.integer, 13: never, 14: never, 15: never, 16: never, 17: never, 18: never, 19: never, 20: never, 21: never, 22: never, 23: typeof Flag.important, 24: never, 25: never, 26: never, 27: never, 28: never },
 * parts: { 1: never, 2: typeof Part.name, 3: never, 4: never, 5: never, 6: never, 7: typeof Part.value, 8: never, 9: never, 10: never, 11: never, 12: typeof Part.name, 13: never, 14: never, 15: never, 16: never, 17: never, 18: never, 19: never, 20: never, 21: never, 22: never, 23: typeof Part.name | typeof Part.value, 24: typeof Part.name | typeof Part.block, 25: typeof Part.block, 26: never, 27: never, 28: never },
 * texts: { 1: never, 2: typeof Part.name, 3: never, 4: never, 5: never, 6: never, 7: typeof Part.value, 8: never, 9: never, 10: never, 11: never, 12: typeof Part.name, 13: never, 14: never, 15: never, 16: never, 17: never, 18: never, 19: never, 20: never, 21: never, 22: never, 23: typeof Part.name | typeof Part.value, 24: typeof Part.name | typeof Part.block, 25: typeof Part.block, 26: never, 27: never, 28: never },
 * items: { [field: number]: number, 1: CssComponentValueType, 2: CssComponentValueType, 3: 23, 4: 24 | 25 },
 * }} CssParts
 */
/**
 * The path a visitor of node type `T` receives, with the run's state `S`.
 * @template [T=number]
 * @template [S=undefined]
 * @typedef {import("../util/SourceProcessor").TypedNodePath<CssPath, Node, CssParts, T, S>} CssNodePath
 */
/**
 * A visitor map whose each visitor's path is typed by its node type and run state.
 * @template [S=undefined]
 * @typedef {{
 * 1?: import("../util/SourceProcessor").VisitorBucket<CssNodePath<1, S>>,
 * 2?: import("../util/SourceProcessor").VisitorBucket<CssNodePath<2, S>>,
 * 3?: import("../util/SourceProcessor").VisitorBucket<CssNodePath<3, S>>,
 * 4?: import("../util/SourceProcessor").VisitorBucket<CssNodePath<4, S>>,
 * 5?: import("../util/SourceProcessor").VisitorBucket<CssNodePath<5, S>>,
 * 6?: import("../util/SourceProcessor").VisitorBucket<CssNodePath<6, S>>,
 * 7?: import("../util/SourceProcessor").VisitorBucket<CssNodePath<7, S>>,
 * 8?: import("../util/SourceProcessor").VisitorBucket<CssNodePath<8, S>>,
 * 9?: import("../util/SourceProcessor").VisitorBucket<CssNodePath<9, S>>,
 * 10?: import("../util/SourceProcessor").VisitorBucket<CssNodePath<10, S>>,
 * 11?: import("../util/SourceProcessor").VisitorBucket<CssNodePath<11, S>>,
 * 12?: import("../util/SourceProcessor").VisitorBucket<CssNodePath<12, S>>,
 * 13?: import("../util/SourceProcessor").VisitorBucket<CssNodePath<13, S>>,
 * 14?: import("../util/SourceProcessor").VisitorBucket<CssNodePath<14, S>>,
 * 15?: import("../util/SourceProcessor").VisitorBucket<CssNodePath<15, S>>,
 * 16?: import("../util/SourceProcessor").VisitorBucket<CssNodePath<16, S>>,
 * 17?: import("../util/SourceProcessor").VisitorBucket<CssNodePath<17, S>>,
 * 18?: import("../util/SourceProcessor").VisitorBucket<CssNodePath<18, S>>,
 * 19?: import("../util/SourceProcessor").VisitorBucket<CssNodePath<19, S>>,
 * 20?: import("../util/SourceProcessor").VisitorBucket<CssNodePath<20, S>>,
 * 21?: import("../util/SourceProcessor").VisitorBucket<CssNodePath<21, S>>,
 * 22?: import("../util/SourceProcessor").VisitorBucket<CssNodePath<22, S>>,
 * 23?: import("../util/SourceProcessor").VisitorBucket<CssNodePath<23, S>>,
 * 24?: import("../util/SourceProcessor").VisitorBucket<CssNodePath<24, S>>,
 * 25?: import("../util/SourceProcessor").VisitorBucket<CssNodePath<25, S>>,
 * 26?: import("../util/SourceProcessor").VisitorBucket<CssNodePath<26, S>>,
 * 27?: import("../util/SourceProcessor").VisitorBucket<CssNodePath<27, S>>,
 * 28?: import("../util/SourceProcessor").VisitorBucket<CssNodePath<28, S>>,
 * }} CssVisitorMap
 */
/** @typedef {(typeof NodeType)[keyof typeof NodeType]} CssNodeType a `NodeType` member */

/**
 * Append the printed text of every child of `n` to `out`, in order - read where
 * the child list lies rather than materialized into a list of its own first.
 * @param {Node} n the node
 * @param {PrintContext} writer the print context (children's printed text)
 * @param {string[]} out the array to append to
 */
const appendChildTexts = (n, writer, out) => {
	const i = n;
	const start = S._listStarts[i];
	const len = S._listLengths[i];
	for (let k = 0; k < len; k++) {
		out.push(writer.get(S._listItems[start + k]));
	}
};

// A fresh (safely retainable) array of a node's flat content span: a
// function's or block's value, a rule's prelude.
/** @type {(n: Node) => Node[]} */
const materializeList = (n) => {
	const i = n;
	const start = S._listStarts[i];
	const len = S._listLengths[i];
	/** @type {Node[]} */
	const out = [];
	for (let k = 0; k < len; k++) out.push(S._listItems[start + k]);
	return out;
};

/**
 * Hold every visitor back for a skipped node's subtree, which a print walks.
 * @returns {false} the skip the walk goes on with: none
 */
const holdSkippedVisitors = () => {
	S._skippedVisitors = haltVisitors(S._walkVisitors);
	return false;
};

/**
 * Put back what {@link holdSkippedVisitors} held, as the skipped node exits.
 * @returns {void}
 */
const resumeSkippedVisitors = () => {
	resumeVisitors(/** @type {VisitorFn[][]} */ (S._skippedVisitors));
	S._skippedVisitors = null;
	S._skippedFrame = -1;
};
// Thrown out of `consume` to end a stopped walk-only parse; `grammar` catches it.
const WALK_STOPPED = new Error("css syntax: walk stopped");
/** @type {CompiledVisitorMap} the map a stopped walk dispatches from */
const STOPPED_VISITORS = [];

// Inside a color the engine computes with rather than paints.

const TRIDENT_BROWSERS = ["ie", "ie_mob"].map((name) =>
	SUPPORT_BROWSERS.indexOf(name)
);

const CUSTOM_AT_RULE_NAMES = new Set(["custom-media", "custom-selector"]);

/**
 * One `@custom-media` or `@custom-selector` rule a source writes: the name it
 * states and the names it is read through, keyed by the rule's own name so the
 * two never meet, and the rule as a statement.
 * @typedef {object} CustomAtRule
 * @property {string} name the name it states, or "" where it states none
 * @property {string[]} references the names it reads
 * @property {string} text the rule, ending in `;`
 */

// The words an `animation` value spells with, which a keyframes name standing
// beside them is never renamed to or from.
const ANIMATION_KEYWORDS = new Set([
	"alternate",
	"alternate-reverse",
	"auto",
	"backwards",
	"both",
	"default",
	"ease",
	"ease-in",
	"ease-in-out",
	"ease-out",
	"forwards",
	"infinite",
	"inherit",
	"initial",
	"linear",
	"none",
	"normal",
	"paused",
	"reverse",
	"revert",
	"revert-layer",
	"running",
	"step-end",
	"step-start",
	"unset"
]);

// The calls a value is substituted through, whose contents the print leaves be.
const SUBSTITUTION_CALLS = new Set(["attr", "env", "if", "var"]);

/**
 * Whether a function token calls a substitution: `var()` and its kin in any
 * spelling, or a custom function, whose result the print cannot see.
 * @param {string} text the function token's text, its `(` included
 * @returns {boolean} true when the call substitutes a value
 */
const substitutionCall = (text) => {
	const name = unescapeIdentifier(text.slice(0, -1));
	return (
		name.startsWith("--") || SUBSTITUTION_CALLS.has(asciiLowercaseName(name))
	);
};

/**
 * The declarations a source writes whose name `wanted` accepts, each as its
 * lowercased name and the significant tokens of its value. Read off the
 * tokens: a name opening a statement and followed by a `:`.
 * @param {string} input the source
 * @param {(name: string) => boolean} wanted whether a declaration name is read
 * @param {boolean} tested whether one a `(` opens, as a `@supports` test, is read
 * @returns {{ name: string, tokens: { type: number, text: string }[] }[]} the declarations
 */
const scanDeclarations = (input, wanted, tested) => {
	const token = createToken();
	/** @type {{ name: string, tokens: { type: number, text: string }[] }[]} */
	const out = [];
	let pos = 0;
	let previous = TT_LEFT_CURLY_BRACKET;
	for (;;) {
		const found = readToken(input, pos, token);
		if (found === undefined) break;
		pos = found.end;
		const type = found.type;
		if (type === TT_WHITESPACE || type === TT_COMMENT) continue;
		// A `}` closes a nested rule, after which its parent's declarations go on.
		const opens =
			previous === TT_LEFT_CURLY_BRACKET ||
			previous === TT_SEMICOLON ||
			previous === TT_RIGHT_CURLY_BRACKET ||
			(tested && previous === TT_LEFT_PARENTHESIS);
		previous = type;
		if (type !== TT_IDENTIFIER || !opens) continue;
		const raw = unescapeIdentifier(input.slice(found.start, found.end));
		const name = raw.startsWith("--") ? raw : asciiLowercaseName(raw);
		if (!wanted(name)) continue;
		let next = readToken(input, pos, token);
		while (
			next !== undefined &&
			(next.type === TT_WHITESPACE || next.type === TT_COMMENT)
		) {
			pos = next.end;
			next = readToken(input, pos, token);
		}
		if (next === undefined || next.type !== TT_COLON) continue;
		pos = next.end;
		/** @type {{ type: number, text: string }[]} */
		const tokens = [];
		let depth = 0;
		for (;;) {
			const value = readToken(input, pos, token);
			if (value === undefined) break;
			const valueType = value.type;
			if (
				depth === 0 &&
				(valueType === TT_SEMICOLON ||
					valueType === TT_RIGHT_CURLY_BRACKET ||
					valueType === TT_RIGHT_PARENTHESIS)
			) {
				break;
			}
			pos = value.end;
			if (
				valueType === TT_FUNCTION ||
				valueType === TT_LEFT_PARENTHESIS ||
				valueType === TT_LEFT_SQUARE_BRACKET ||
				valueType === TT_LEFT_CURLY_BRACKET
			) {
				depth++;
			} else if (
				valueType === TT_RIGHT_PARENTHESIS ||
				valueType === TT_RIGHT_SQUARE_BRACKET ||
				valueType === TT_RIGHT_CURLY_BRACKET
			) {
				depth--;
			}
			if (valueType === TT_WHITESPACE || valueType === TT_COMMENT) continue;
			tokens.push({
				type: valueType,
				text: input.slice(value.start, value.end)
			});
		}
		previous = TT_SEMICOLON;
		out.push({ name, tokens });
	}
	return out;
};

/**
 * The short name for the `index`th renamed keyframes: `a` to `Z`, then two
 * letters and on, every one an identifier.
 * @param {number} index the position in renaming order
 * @returns {string} the name
 */
const shortName = (index) => {
	const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
	let name = "";
	let rest = index;
	do {
		name = letters[rest % letters.length] + name;
		rest = Math.floor(rest / letters.length) - 1;
	} while (rest >= 0);
	return name;
};

/**
 * The shorter name each `@keyframes` this source defines is renamed to, for
 * `renameKeyframes`. A name a custom property or a substituted `animation`
 * value spells is kept, since the print cannot see where it is read.
 * @param {string} input the source
 * @returns {Map<string, string> | null} old name to new, or null for none
 */
const keyframeRenames = (input) => {
	const token = createToken();
	/** @type {string[]} */
	const defined = [];
	/** @type {Set<string>} */
	const taken = new Set(ANIMATION_KEYWORDS);
	/** @type {Set<string>} */
	const kept = new Set();
	// A name `unusedSymbols` lists is read by the unused check as written, so
	// it is never renamed nor given to another.
	if (S._unusedSymbols !== null) {
		for (const name of S._unusedSymbols) {
			taken.add(name);
			kept.add(name);
		}
	}
	let pos = 0;
	for (;;) {
		const found = readToken(input, pos, token);
		if (found === undefined) break;
		pos = found.end;
		if (found.type !== TT_AT_KEYWORD) continue;
		const kind = atKeyword(input.slice(found.start + 1, found.end));
		if (kind !== "keyframes" && !/^-[a-z]+-keyframes$/.test(kind)) continue;
		let next = readToken(input, pos, token);
		while (
			next !== undefined &&
			(next.type === TT_WHITESPACE || next.type === TT_COMMENT)
		) {
			pos = next.end;
			next = readToken(input, pos, token);
		}
		if (next === undefined) break;
		const text = input.slice(next.start, next.end);
		if (next.type === TT_IDENTIFIER) {
			defined.push(unescapeIdentifier(text));
		} else if (next.type === TT_STRING) {
			// A quoted definition defines the same name, which stays as written.
			const quoted = unescapeStringValue(text.slice(1, -1));
			taken.add(quoted);
			kept.add(quoted);
		}
	}
	if (defined.length === 0) return null;
	const declarations = scanDeclarations(
		input,
		(name) =>
			name.startsWith("--") ||
			name === "animation" ||
			name === "animation-name" ||
			/^-[a-z]+-animation(?:-name)?$/.test(name),
		true
	);
	for (const { name, tokens } of declarations) {
		const custom = name.startsWith("--");
		const substituted = tokens.some(
			(one) => one.type === TT_FUNCTION && substitutionCall(one.text)
		);
		for (const one of tokens) {
			if (one.type !== TT_IDENTIFIER && one.type !== TT_STRING) continue;
			const value =
				one.type === TT_STRING
					? unescapeStringValue(one.text.slice(1, -1))
					: unescapeIdentifier(one.text);
			taken.add(value);
			if (custom || substituted || one.type === TT_STRING) kept.add(value);
		}
	}
	for (const name of defined) taken.add(name);
	/** @type {Map<string, string>} */
	const renames = new Map();
	let index = 0;
	for (const name of defined) {
		if (
			renames.has(name) ||
			kept.has(name) ||
			ANIMATION_KEYWORDS.has(asciiLowercaseName(name))
		) {
			continue;
		}
		let renamed = shortName(index++);
		while (taken.has(renamed)) renamed = shortName(index++);
		if (renamed.length >= name.length) continue;
		taken.add(renamed);
		renames.set(name, renamed);
	}
	return renames.size === 0 ? null : renames;
};

// A `z-index` the rebase can read: an integer, or a keyword naming no level.
const Z_INDEX_INTEGER_RE = /^[+-]?\d+$/;

// The words a `transition` value spells besides the property it names.
const TRANSITION_KEYWORDS = new Set([
	"allow-discrete",
	"ease",
	"ease-in",
	"ease-in-out",
	"ease-out",
	"linear",
	"none",
	"normal",
	"step-end",
	"step-start"
]);

/**
 * Whether this source may animate a `z-index`: a keyframe declaring one, or a
 * transition of `all`, of `z-index`, or of a property it does not name. A
 * level between two rebased ones then passes others the rebase moved.
 * @param {string} input the source
 * @returns {boolean} true when a `z-index` may be animated
 */
const zIndexAnimated = (input) => {
	const transitions = scanDeclarations(
		input,
		(name) =>
			name === "transition" ||
			name === "transition-property" ||
			/^-[a-z]+-transition(?:-property)?$/.test(name) ||
			name === "z-index",
		false
	);
	for (const { name, tokens } of transitions) {
		if (name === "z-index") continue;
		// A trailing `!important` names no property the transition runs on.
		const important =
			tokens.length >= 2 &&
			tokens[tokens.length - 2].type === TT_DELIM &&
			tokens[tokens.length - 2].text === "!" &&
			asciiCaseInsensitiveMatch(
				unescapeIdentifier(tokens[tokens.length - 1].text),
				"important"
			);
		const end = important ? tokens.length - 2 : tokens.length;
		let named = false;
		for (let i = 0; i <= end; i++) {
			const one = i === end ? undefined : tokens[i];
			if (one === undefined || one.type === TT_COMMA) {
				if (!named) return true;
				named = false;
				continue;
			}
			if (one.type === TT_FUNCTION) return true;
			if (one.type !== TT_IDENTIFIER) continue;
			const word = asciiLowercaseName(unescapeIdentifier(one.text));
			if (word === "all" || word === "z-index" || CSS_WIDE_KEYWORDS.has(word)) {
				return true;
			}
			if (!TRANSITION_KEYWORDS.has(word)) named = true;
		}
	}
	// A keyframe's declarations follow the keyframe selector's `{`, which a
	// rule's own do too: only one inside `@keyframes` counts.
	const token = createToken();
	let pos = 0;
	let depth = 0;
	let inKeyframes = -1;
	let previous = TT_EOF;
	for (;;) {
		const found = readToken(input, pos, token);
		if (found === undefined) return false;
		pos = found.end;
		const type = found.type;
		if (type === TT_WHITESPACE || type === TT_COMMENT) continue;
		if (type === TT_AT_KEYWORD && inKeyframes === -1) {
			const kind = atKeyword(input.slice(found.start + 1, found.end));
			if (kind === "keyframes" || /^-[a-z]+-keyframes$/.test(kind)) {
				inKeyframes = depth;
			}
		} else if (type === TT_LEFT_CURLY_BRACKET) {
			depth++;
		} else if (type === TT_RIGHT_CURLY_BRACKET) {
			depth--;
			if (depth === inKeyframes) inKeyframes = -1;
		} else if (
			type === TT_COLON &&
			inKeyframes !== -1 &&
			depth > inKeyframes + 1 &&
			previous === TT_IDENTIFIER
		) {
			return true;
		}
		if (type === TT_IDENTIFIER) {
			const word = asciiLowercaseName(
				unescapeIdentifier(input.slice(found.start, found.end))
			);
			previous = word === "z-index" ? TT_IDENTIFIER : TT_EOF;
		} else {
			previous = type;
		}
	}
};

/**
 * The smaller level each positive `z-index` this source writes is rebased to,
 * for `rebaseZIndex`: `1`, `2`, ... in the order they stack. Null where one is
 * anything but an integer or a keyword, since its level is then unknown.
 * @param {string} input the source
 * @returns {Map<number, string> | null} old level to new, or null for none
 */
const zIndexRenames = (input) => {
	if (zIndexAnimated(input)) return null;
	/** @type {Set<number>} */
	const levels = new Set();
	for (const { tokens } of scanDeclarations(
		input,
		(name) => name === "z-index",
		false
	)) {
		const important =
			tokens.length === 3 &&
			tokens[1].type === TT_DELIM &&
			tokens[1].text === "!" &&
			asciiCaseInsensitiveMatch(
				unescapeIdentifier(tokens[2].text),
				"important"
			);
		if (tokens.length !== 1 && !important) return null;
		const one = tokens[0];
		if (one.type === TT_IDENTIFIER) {
			const keyword = asciiLowercaseName(one.text);
			if (keyword === "auto" || CSS_WIDE_KEYWORDS.has(keyword)) continue;
			return null;
		}
		if (one.type !== TT_NUMBER || !Z_INDEX_INTEGER_RE.test(one.text)) {
			return null;
		}
		const level = Number(one.text);
		if (level > 0) levels.add(level);
	}
	/** @type {Map<number, string>} */
	const renames = new Map();
	const sorted = [...levels].sort((a, b) => a - b);
	for (let i = 0; i < sorted.length; i++) {
		if (sorted[i] !== i + 1) renames.set(sorted[i], String(i + 1));
	}
	return renames.size === 0 ? null : renames;
};

/**
 * The `@custom-media` and `@custom-selector` rules a source writes, each as its
 * own statement, in order. One opening a block is no such rule, and is left out.
 * @param {string} input the source
 * @returns {CustomAtRule[]} the rules
 */
const customAtRules = (input) => {
	const token = createToken();
	/** @type {CustomAtRule[]} */
	const out = [];
	let pos = 0;
	for (;;) {
		const found = readToken(input, pos, token);
		if (found === undefined) break;
		pos = found.end;
		if (found.type !== TT_AT_KEYWORD) continue;
		const kind = atKeyword(input.slice(found.start + 1, found.end));
		if (!CUSTOM_AT_RULE_NAMES.has(kind)) continue;
		const start = found.start;
		let end = input.length;
		let depth = 0;
		let name = "";
		/** @type {string[]} */
		const references = [];
		// A media name is read only as `(--name)`; `(--name: 1px)` is a feature.
		const media = kind === "custom-media";
		let previous = TT_EOF;
		let pending = "";
		for (;;) {
			const next = readToken(input, pos, token);
			if (next === undefined) break;
			const type = next.type;
			if (type === TT_WHITESPACE || type === TT_COMMENT) {
				pos = next.end;
				continue;
			}
			if (pending !== "" && type === TT_RIGHT_PARENTHESIS) {
				references.push(pending);
			}
			pending = "";
			if (type === TT_IDENTIFIER && input.startsWith("--", next.start)) {
				const named = `${kind} ${unescapeIdentifier(
					input.slice(next.start, next.end)
				)}`;
				if (name === "" && depth === 0) name = named;
				else if (!media) references.push(named);
				else if (previous === TT_LEFT_PARENTHESIS) pending = named;
			}
			previous = type;
			if (
				type === TT_LEFT_PARENTHESIS ||
				type === TT_LEFT_SQUARE_BRACKET ||
				type === TT_FUNCTION
			) {
				depth++;
			} else if (
				depth > 0 &&
				(type === TT_RIGHT_PARENTHESIS || type === TT_RIGHT_SQUARE_BRACKET)
			) {
				depth--;
			} else if (
				depth === 0 &&
				(type === TT_SEMICOLON ||
					type === TT_LEFT_CURLY_BRACKET ||
					type === TT_RIGHT_CURLY_BRACKET)
			) {
				end = type === TT_LEFT_CURLY_BRACKET ? -1 : next.start;
				break;
			}
			pos = next.end;
		}
		if (end !== -1) {
			out.push({ name, references, text: `${input.slice(start, end)};` });
		}
	}
	return out;
};

/**
 * The rules a name is stated by last, each after the ones its query reads, so a
 * single walk has every name it is read through down before it: the last rule
 * stating a name holds, and a cycle is left in the order it was written.
 * @param {CustomAtRule[]} rules the rules, in source order
 * @returns {string} the rules to walk, as one source
 */
const orderCustomAtRules = (rules) => {
	/** @type {Map<string, CustomAtRule>} */
	const last = new Map();
	for (const rule of rules) if (rule.name !== "") last.set(rule.name, rule);
	/** @type {Set<CustomAtRule>} */
	const visited = new Set();
	let out = "";
	/**
	 * @param {CustomAtRule} rule a rule to write after what it reads
	 * @returns {void}
	 */
	const visit = (rule) => {
		if (visited.has(rule)) return;
		visited.add(rule);
		for (const name of rule.references) {
			const read = last.get(name);
			if (read !== undefined) visit(read);
		}
		out += rule.text;
	};
	for (const rule of rules) {
		if (rule.name === "" || last.get(rule.name) === rule) visit(rule);
	}
	return out;
};

// A `@custom-selector` name as a stored list writes it: after one `:`, not two.
const NESTED_CUSTOM_SELECTOR_RE = /(?:^|[^:\\]):(--[^\s(),:.#[>+~*]+)/g;

/**
 * A printed prelude with each quoted string's contents taken out, so a name a
 * string spells is no name read.
 * @param {string} text the printed text
 * @returns {string} it without what its strings hold
 */
const withoutStrings = (text) => {
	let out = "";
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		if (code === CC_REVERSE_SOLIDUS) {
			out += text.slice(i, i + 2);
			i++;
		} else if (code === CC_QUOTATION_MARK || code === CC_APOSTROPHE) {
			let end = i + 1;
			while (end < text.length && text.charCodeAt(end) !== code) {
				if (text.charCodeAt(end) === CC_REVERSE_SOLIDUS) end++;
				end++;
			}
			out += `${text[i]}${text[i]}`;
			i = end;
		} else {
			out += text[i];
		}
	}
	return out;
};

/**
 * Drop each name still read through another name in `names`, which is on a
 * cycle and so stands for nothing.
 * @param {Map<string, string>} names each name to what it stands for, in place
 * @param {RegExp} reference a global pattern whose first group is a name read
 * @returns {Map<string, string>} the same map
 */
const dropCyclicNames = (names, reference) => {
	/** @type {string[]} */
	const cyclic = [];
	for (const [name, stated] of names) {
		const written = withoutStrings(stated);
		reference.lastIndex = 0;
		for (
			let found = reference.exec(written);
			found;
			found = reference.exec(written)
		) {
			if (names.has(found[1])) {
				cyclic.push(name);
				break;
			}
		}
	}
	reference.lastIndex = 0;
	for (const name of cyclic) names.delete(name);
	return names;
};

/**
 * Read every `@custom-media` and `@custom-selector` rule a source writes before
 * walking it, so a name is written wherever it is asked for: the last rule
 * stating it holds, and one read through another resolves in either order.
 * @param {string} input the source
 * @param {PrintContext} writer the walk's print context
 * @returns {void}
 */
const readCustomAtRulesAhead = (input, writer) => {
	// Read as the walk reads it (§3.3), so a NUL is the ident code point U+FFFD.
	const rules = customAtRules(preprocessInputStream(input));
	if (rules.length === 0) return;
	const Context =
		/** @type {new (options: PrintContext["options"], printer: PrintContext["_printer"]) => PrintContext} */ (
			writer.constructor
		);
	S._collectingCustomAtRules = true;
	try {
		runGrammar(
			orderCustomAtRules(rules),
			[],
			new Context(writer.options, writer._printer),
			{}
		);
	} finally {
		S._collectingCustomAtRules = false;
	}
	S._customAtRulesSeed = {
		media: dropCyclicNames(
			new Map(S._customMedia),
			NESTED_CUSTOM_MEDIA_REFERENCE_RE
		),
		selectors: dropCyclicNames(
			new Map(S._customSelectors),
			NESTED_CUSTOM_SELECTOR_RE
		)
	};
};

/** @type {Set<string>} */
const NAMESPACE_AT_RULE = new Set(["namespace"]);

// Set when the source names one at all, so a stylesheet without any pays a
// single scan and keeps nothing.
/**
 * Whether the source opens a top-level statement with `@namespace`, under any
 * spelling. The native search answers for nearly every sheet; one naming it is
 * walked for where it stands, as an empty rule kept for one that is not an
 * at-rule there would be dropped by the next print.
 * @param {string} input source
 * @returns {boolean} true when the source holds a top-level `@namespace` at-rule
 */
const namesNamespaceAtRule = (input) =>
	namesAtRule(input, NAMESPACE_AT_RULE) && opensNamespaceStatement(input);

/**
 * Whether the text from `from` opens on a string once whitespace is skipped,
 * which makes a `url(` a function token rather than a url token (§4.3.4).
 * @param {string} input source
 * @param {number} from the offset right after the `(`
 * @returns {boolean} true when a quote comes first
 */
const opensWithString = (input, from) => {
	let i = from;
	while (isAsciiWhitespace(input.charCodeAt(i))) i++;
	const code = input.charCodeAt(i);
	return code === CC_QUOTATION_MARK || code === CC_APOSTROPHE;
};

/**
 * Whether a top-level statement opens on `@namespace`: one at the start, after
 * a `;` or after a block's `}`, outside every block, comment and string. A
 * stray closer is part of the prelude it stands in, so it opens no statement.
 * @param {string} input source
 * @returns {boolean} true when one does
 */
const opensNamespaceStatement = (input) => {
	// The closer each open block waits for.
	/** @type {number[]} */
	const closers = [];
	let start = true;
	// Where the run of name code points and escapes before `i` opens, or -1.
	let nameStart = -1;
	for (let i = 0; i < input.length; i++) {
		const code = input.charCodeAt(i);
		// A `\` before a newline is a delim (§4.3.8), no escape.
		const escape =
			code === CC_REVERSE_SOLIDUS && !isNewline(input.charCodeAt(i + 1));
		if (
			escape ||
			isIdentCodePoint(code) ||
			// A hash or at-keyword spelling `url` opens no url token.
			code === CC_NUMBER_SIGN ||
			(code === CC_AT_SIGN && !(start && closers.length === 0))
		) {
			if (nameStart === -1) nameStart = i;
			if (escape) {
				const gobbled = gobbleHex(input, i + 1);
				i += gobbled === undefined ? 1 : gobbled[1];
			}
			if (closers.length === 0) start = false;
			continue;
		}
		const name = nameStart;
		nameStart = -1;
		if (
			code === CC_LEFT_PARENTHESIS &&
			name !== -1 &&
			atKeyword(input.slice(name, i)) === "url" &&
			!opensWithString(input, i + 1)
		) {
			// A url token (§4.3.6): what it holds up to its `)` is no structure.
			for (i++; i < input.length; i++) {
				const inner = input.charCodeAt(i);
				if (inner === CC_REVERSE_SOLIDUS) i++;
				else if (inner === CC_RIGHT_PARENTHESIS) break;
			}
			if (closers.length === 0) start = false;
		} else if (code === CC_SOLIDUS && input.charCodeAt(i + 1) === CC_ASTERISK) {
			const end = input.indexOf("*/", i + 2);
			if (end === -1) return false;
			i = end + 1;
		} else if (code === CC_QUOTATION_MARK || code === CC_APOSTROPHE) {
			for (i++; i < input.length; i++) {
				const inner = input.charCodeAt(i);
				if (inner === CC_REVERSE_SOLIDUS) i++;
				else if (inner === code || inner === CC_LINE_FEED) break;
			}
			start = false;
		} else if (
			code === CC_LEFT_CURLY ||
			code === CC_LEFT_SQUARE ||
			code === CC_LEFT_PARENTHESIS
		) {
			closers.push(
				code === CC_LEFT_CURLY
					? CC_RIGHT_CURLY
					: code === CC_LEFT_SQUARE
						? CC_RIGHT_SQUARE
						: CC_RIGHT_PARENTHESIS
			);
			start = false;
		} else if (closers.length !== 0 && code === closers[closers.length - 1]) {
			closers.pop();
			start = closers.length === 0 && code === CC_RIGHT_CURLY;
		} else if (closers.length !== 0 || isAsciiWhitespace(code)) {
			// Inside a block, or space between statements.
		} else if (code === CC_SEMICOLON) {
			start = true;
		} else {
			if (start && code === CC_AT_SIGN) {
				const end = atKeywordNameEnd(input, i + 1);
				if (NAMESPACE_AT_RULE.has(atKeyword(input.slice(i + 1, end)))) {
					return true;
				}
				i = end - 1;
			}
			start = false;
		}
	}
	return false;
};

/**
 * One parsed stylesheet and the state of the walk and print reading it: the
 * node and list columns, the streaming frames, the per-run options and caches.
 * `S` is the tree being read; a run a visitor or renderer starts parks it in a
 * spare (see `swapTrees`), so the outer run finds it untouched.
 */
class CssSyntaxTree {
	constructor() {
		// The declaration whose value is being walked, for the printer's property-scoped
		// guards; only tracked while printing, and read lazily (naming it costs a slice).
		/** @type {Node | null} */
		this._valueDeclaration = null;
		this._inSubstitutedValue = false;
		// Which rewrites this print makes. One object rather than a flag apiece: it is
		// read straight off the options, and a fixed shape keeps each read monomorphic.
		/** @type {Required<CssTransformOptions>} */
		this._transforms = DEFAULT_TRANSFORMS;
		// What `renameKeyframes` renames each keyframes name to, and what
		// `rebaseZIndex` rebases each `z-index` level to; null where nothing is.
		/** @type {Map<string, string> | null} */
		this._keyframeRenames = null;
		/** @type {Map<number, string> | null} */
		this._zIndexRenames = null;
		// Set by the walk while inside a `@supports` prelude: the declaration there is
		// the subject of a feature test, so a value rewrite would change the question.
		this._inSupportsPrelude = false;
		// Set by the walk while inside an at-rule prelude that is no selector, where a
		// `[...]` is a block of tokens rather than an attribute selector.
		this._inAtRulePrelude = false;
		// Set for a `block-contents` print, which is a `style=""` value: a string is
		// quoted so the list holds one quote kind, and the attribute escapes none.
		this._inStyleAttribute = false;
		// Set by the walk inside a `@supports` `selector()`: the selector is what the
		// condition tests, so only its whitespace and escapes are respelled.
		this._inSupportsSelector = false;
		// Set by the walk while inside a custom property's value. Its tokens are
		// squeezed, but a rewrite that restates a value in another notation is held
		// back: `getPropertyValue()` hands this text back, so a color stays as written.
		this._inCustomProperty = false;
		// How many stepped-value functions the walk is inside. Everything below one
		// keeps the unit it was written with, folds included.
		this._steppedFunctionDepth = 0;
		// How many math functions the walk is inside. Non-zero is where `*` and `/` are
		// operators that need no whitespace rather than value separators; above one is
		// where a folded term is an operand of an outer expression rather than a value.
		this._mathFunctionDepth = 0;
		// The prefixed rule just printed, and the signature of the unprefixed twin that
		// would make it dead weight - read by whoever writes that rule out, so it can go
		// as a piece of its own. Null when the rule just printed is not one.
		/** @type {{ node: Node, signature: string, missing: Set<string> | null } | null} */
		this._prefixDropCandidate = null;
		// The walk's current position (`A.node` / `A.parent` read these; on the tree
		// so the accessor methods' defaults avoid self-referential `this` typing).
		/** @type {Node} */
		this._walkNode = 0;
		// The declaration `_inKeywordOnlyValue` last answered for, and its answer: one
		// value's identifiers all ask it, and the read is a pointer compare after the
		// first. Cleared with the rest of the parse state, so no node outlives it.
		/** @type {Node | null} */
		this._keywordOnlyFor = null;
		// Off, that verbatim rule stands; on, a custom property's tokens print like any
		// other value's and `getPropertyValue()` hands back the rewritten text.
		this._rewriteCustomProperties = false;
		// A custom property's value the input ran out in, as printed and left open.
		/** @type {{ printed: string, source: string } | null} */
		this._openCustomValue = null;
		// The token the input ran out in, as printed closed and as it prints open.
		this._eofPrinted = "";
		this._eofOpen = "";
		this._input = "";
		// Set by the walk while inside a `@media` / `@container` prelude, where a `(...)`
		// is a media feature rather than a declaration or a selector list.
		this._inMediaConditionPrelude = false;
		// What the target can read, from `output.environment` - resolved once per run
		// rather than per color. Unset means it can: only browserslist reports otherwise.
		this._hexAlphaAllowed = true;
		// Whether the color being printed is read as numbers rather than shown - a
		// gradient stop, a `color-mix()` argument, a relative color's origin - where an
		// 8-bit hex moves the color the engine computes, not only how it is spelled.
		this._inColorOperand = false;
		// Set by the printer while folding a math function among a color's channels,
		// a number no layout scales, so its result takes six digits as one written does.
		this._foldingColorChannel = false;
		this._rangeSpellingAllowed = true;
		// Set by the walk while inside an `@property` body, where `initial-value` is
		// typed by the sibling `syntax` descriptor rather than by any grammar webpack
		// reads - so no rewrite of it can be known to still match.
		this._inPropertyRule = false;
		// Set by the walk while inside an `@function` body, where `result` carries the
		// token stream the call substitutes - as opaque as a custom property's value,
		// and empty on purpose when the function returns the guaranteed-invalid one.
		this._inFunctionRule = false;
		// Set by the walk while inside an `@font-feature-values` body, where each
		// sub-rule's declaration names are `<custom-ident>` feature values - so they are
		// case-sensitive, and two spellings of one name are two distinct entries.
		this._inFeatureValuesRule = false;
		// Whether vendor prefixes are written at all. The selection still answers which
		// spellings a target reads, so `vendorPrefixes: false` turns off only this.
		this._prefixingOn = false;
		this._isSelectorAllowed = true;
		// WHY: whether a top-level `@namespace` could still be read here. Only a rule
		// the engine keeps closes the run one may stand in (CSS Namespaces 3 §3.1), an
		// unknown at-rule being thrown away, so only a qualified rule closes it. Empty
		// or not, a rule dropped while this is open would carry a dead `@namespace`
		// after it back to the head and bring it to life.
		this._namespacePrologueOpen = false;
		// Where a comment the source never closed opened, or -1. §4.3.2 runs one to
		// EOF, so at most one is open and only a span reaching the end sits inside it.
		this._openCommentStart = -1;
		/** Whether every target reads `@custom-media`, so the rule naming one stays. */
		this._customMediaAllowed = true;
		/** Whether every `@custom-media` name was read ahead, so none is taken down again. */
		this._customAtRulesFixed = false;
		this._doublePositionAllowed = true;
		this._systemUiAllowed = true;
		/** @type {Map<string, [string, number]>} */
		this._unitScale = ABSOLUTE_UNIT_SCALE;
		// WHY: whether a length may be rewritten into a shorter unit it is exactly equal
		// in. Off by default - the rewrite is sound, CSS Values 4 fixing the absolute
		// units against each other so `1pc` is `16px` on every medium, but it fires ~10
		// times in all of Bootstrap and costs bytes as often as it saves them once the
		// asset is compressed, and `cssnano` disables it in its default preset too. Time
		// is not gated: it is uncontested and every minifier does it.
		this._convertLengthUnits = false;
		this._keywordOnly = false;
		// Where an asynchronous caller's embedded sources are recorded instead of
		// rendered, set per print. Each entry carries the text to print once the answer
		// is in, so the `url()` around it is spelled from what it actually holds.
		/** @type {DeferredEmbeddedSource[] | undefined} */
		this._deferEmbeddedSource = undefined;
		/** Whether a nested rule is written on its own instead of inside its parent. */
		this._loweringNesting = false;
		// CSS Position 3 added `inset` long after the four longhands it merges, CSS 1.
		this._displayTwoValuesAllowed = true;
		// Whether `light-dark()` is written as the custom-property pair below, and
		// whether this print has written one - the defaults rule goes out only then.
		this._loweringLightDark = false;
		this._lightDarkUsed = false;
		// Whether this print deferred a gathered layer's text (`GatheredLayerText`).
		this._layersGathered = false;
		// The `@charset` piece a minified stylesheet starts with, taken back where
		// its output holds no non-ASCII character (-1 for none).
		this._charsetPiece = -1;
		// Whether the output is read as UTF-8 without a `@charset` saying so.
		this._assumeUtf8 = false;
		// The caller's renderer for source this stylesheet embeds, set per print.
		/** @type {EmbeddedSourceRenderer | undefined} */
		this._renderEmbeddedSource = undefined;
		this._sourceNamesLightDark = false;
		// ---- per-parse and per-run state ----
		/** @type {CssParseOptions["parseError"]} the running `parseA*` call's callback */
		this._parseError = undefined;
		// Each `offset:code` reported this parse: a backtracked span is read again.
		/** @type {Set<string>} */
		this._parseErrorsSeen = new Set();
		this._blockStart = 0;
		this._blockEnd = 0;
		// The body is where its record starts in `_listItems` (see `_bodyIdx`).
		this._blockBody = 0;
		this._bcBody = 0;
		// Whether the block just consumed streamed: read with `_bcDecls` / `_bcRules`.
		// A frame slot cannot answer this, because a block that never streamed may never
		// have written one (see `streamPublishFrame`).
		this._bcStreamed = false;
		/** @type {Uint8Array} */
		this._skipTypes = NO_SKIP_TYPES;
		// Fast-path flag: true only when a real skip set is active, so the (dominant)
		// no-skip parses pay one boolean test instead of a node-type lookup per value.
		this._skipActive = false;
		this._skipSelectorPrelude = false;
		this._skipAtRulePrelude = false;
		// Whether the last `consumeAListOfComponentValues` dropped a non-whitespace
		// value, which still stands beside a `{}` block for §5.4.6 step 8.
		this._listDropped = false;
		// Whether that list consumed a top-level `{}` block, the only value step 8 of
		// §5.4.6 has to look for.
		this._listHeldCurlyBlock = false;
		// WHY: the struct-of-arrays store - nodes live in reused typed-array columns. A
		// node ref is its integer id and fields live in parallel arrays indexed by it,
		// with two reused int slots (`_aux0/1`) and a flags byte for the per-type
		// extras, and child lists on three object arrays. Aux slot meaning by type:
		//   url:         aux0 contentStart, aux1 contentEnd
		//   function:    aux0 nameEnd
		//   declaration: aux0 nameEnd, flags bit0 important, aux1 spelling id once
		//                `FLAG_PROPERTY_ID_READ` says it was read (see `spellingIdOf`)
		//   at-rule:     aux0 nameEnd, aux1 blockStart (blockEnd == end)
		//   qualified:   aux1 blockStart (blockEnd == end)
		// `name` / `nameStart` / a simple block's `token` are derived from the source
		// on read (see the accessors), so they need no slot. A node's main content
		// (value | prelude | stylesheet rules) is a `_listItems` span (see below).
		// `grammar` resets `_nodeCount` to 0 after each top-level rule's walk, so the
		// buffers are reused across rules and the parse allocates almost nothing.
		this._nodeCapacity = 0;
		this._nodeCount = 0;
		this._types = EMPTY_U8;
		this._starts = EMPTY_I32;
		this._ends = EMPTY_I32;
		this._aux0 = EMPTY_I32;
		this._aux1 = EMPTY_I32;
		this._flags = EMPTY_U8;
		// Content-list spans: a container's value / prelude is `_listItems[start, start+len)`
		// (node refs), recycled per top-level rule like the node columns.
		this._listStarts = EMPTY_I32;
		this._listLengths = EMPTY_I32;
		this._listItems = EMPTY_I32;
		this._listItemTop = LIST_ITEMS_FLOOR;
		// Peak usage of the current parse, and use-once regrow hints: after an
		// over-capacity shrink the next grow jumps straight back to the previous
		// parse's peak (one exact-fit allocation instead of re-doubling up).
		this._nodePeak = 0;
		this._listItemPeak = 0;
		this._nodeGrowHint = 0;
		this._listItemGrowHint = 0;
		// Rule bodies sit behind an id-indexed Int32 column holding `1 + index` into two
		// dense append-only arrays, since scattered id-indexed stores degrade a plain
		// array to dictionary elements.
		this._bodyIdx = EMPTY_I32;
		// The children of every block still open, innermost on top, in source order:
		// blocks nest, so each collects above the ones enclosing it and leaves the
		// stack as it was.
		this._childStack = EMPTY_I32;
		this._childTop = 0;
		this._locConverter = /** @type {LocConverter} */ (
			/** @type {LocConverter | null} */ (null)
		);
		// The caller's input before §3.3 replaced its NULs, the same length, which
		// `A.source` slices so a node reads exactly as written.
		this._originalInput = "";
		/** @type {CompiledVisitorMap} */
		this._walkVisitors = /** @type {CompiledVisitorMap} */ (
			/** @type {CompiledVisitorMap | never[]} */ ([])
		);
		this._recurseBlocks = true;
		// Whether a walk has anything to call: a visitor or a printer. Without either a
		// streamed block still releases each child, but walks none of it.
		this._walkWanted = true;
		// Per node type, 1 where visiting a node of it does nothing: a leaf with no
		// visitor while nothing prints. The walk loops step over those without a call.
		this._walkSkipsLeaf = new Uint8Array(32);
		// WHY: a block of declarations alone prints the same wherever its source text
		// and the few rules read around it are the same, and half the blocks a sheet
		// holds are written again; each body is composed once and handed back after.
		/** @type {Map<string, string> | null} */
		this._blockMemo = null;
		/** @type {Node | null} the rule `_blockMemoBody` was found for */
		this._blockMemoNode = null;
		/** @type {string | undefined} the body found for it, undefined to compose one */
		this._blockMemoBody = undefined;
		/** @type {string} the key a miss stores its body under, "" for none */
		this._blockMemoKey = "";
		// The tables a block is looked up in, one per what encloses it: the top level's
		// is `_blockMemo`. `_blockMemoTable` is the last one keyed, and
		// `_blockMemoKeyTable` the one `_blockMemoKey` belongs to.
		/** @type {Map<string, Map<string, string>>} */
		this._blockMemoScopes = new Map();
		/** @type {Map<string, string>} */
		this._blockMemoTable = new Map();
		/** @type {Map<string, string>} */
		this._blockMemoKeyTable = this._blockMemoTable;
		// The same for one declaration, where its block is not one written before.
		/** @type {Map<string, string> | null} */
		this._declarationMemo = null;
		/** @type {string} the key the declaration being walked stores its text under */
		this._declarationMemoKey = "";
		// The declaration memo's keys whose value is one component.
		/** @type {Set<string> | null} */
		this._singleValueKeys = null;
		// Printing needs a faithful serialization, so it keeps dropped input as `NodeType.Raw`
		// nodes; a walk-only parse leaves this false and allocates none.
		this._printing = false;
		// WHY: the selectors and at-rules met so far in each open block, so a prefixed
		// rule is added or dropped against the sibling it needs without buffering the
		// stylesheet, of which streaming holds about one node. Keyed by the block's
		// rule, null for the stylesheet itself, and dropped as that block finishes, so
		// it holds one set per open ancestor and never a recycled node. Null unless
		// minifying for a target. The markers are `signature`, meaning the unprefixed
		// rule is present, and `signature\0prefix`.
		/** @type {Map<Node | null, PrefixScope> | null} */
		this._seenPrefixRules = null;
		// The names `unusedSymbols` gave, and the rules this print has decided name
		// nothing else - both null unless the option is set, which keeps every read of
		// them off a print that was given none.
		/** @type {Set<string> | null} */
		this._unusedSymbols = null;
		// Each pseudo-class to write as a class instead, or null where none is asked for.
		/** @type {Map<string, string> | null} */
		this._pseudoClasses = null;
		/** @type {Set<Node> | null} */
		this._unusedRules = null;
		// The browserslist selection this parse prefixes for, as the versions selected
		// for each browser by its `SUPPORT_BROWSERS` slot; null unless minifying for
		// one, which is what turns prefixing on.
		/** @type {(number[] | undefined)[] | null} */
		this._prefixBrowsers = null;
		/** @type {CompiledVisitorBucket | undefined} */
		this._commentBucket = undefined;
		// Where each node a visitor replaced since the top-level node began stands, as
		// start, end pairs: what contains one prints as `exitNode` says.
		/** @type {number[]} */
		this._edits = [];
		// `S._transforms` with every rewrite off, for an edit's ancestors; made on the
		// first edit of a print.
		/** @type {Required<CssTransformOptions> | null} */
		this._plainTransforms = null;
		// WHY: nested-block streaming.
		// Top-level nodes already stream, but inside one big block nothing could be
		// released until the whole subtree finished. Enter an open rule once its block
		// has grown enough to be worth it, then walk and recycle each later child as it
		// completes: peak storage becomes the open path rather than the block.
		// Printing streams with it: a rule's `prelude{` is held back when the block
		// opens (`streamOpen`), each finished child is emitted straight after it
		// (`streamEmitChild`), and the `}` closes it (`streamClose`) - so the printer
		// never assembles a parent from children a streamed body has already released.
		// The two things that need a whole block at once still hold: a longhand family
		// only merges in a block with no child rule, which is exactly the block this
		// declines to stream, and the last of a set of identical declarations is reached
		// by taking the earlier ones back out of the output rather than by looking ahead.
		// On for every walk, and not an option: a block under the threshold is collected
		// and walked in one batch exactly as it always was, so there is nothing to trade
		// off. It is still a flag because the standalone `parseA*` entry points hand back
		// a materialized tree and must not stream - `setupParse` leaves it off for them,
		// and only `grammar` turns it on.
		this._streamBlocks = false;
		/** @type {Node | null} node already walked inline, so its sink only recycles */
		this._streamWalked = null;
		this._depth = 0;
		// The deepest frame this parse wrote, so the reset clears what was used rather
		// than all `STREAM_MAX_DEPTH` slots - nesting is 1 deep in almost every sheet.
		this._frameHighWater = 0;
		/** @type {Int32Array} node id of the open rule */
		this._frameRule = new Int32Array(STREAM_MAX_DEPTH);
		this._frameMark = new Int32Array(STREAM_MAX_DEPTH);
		this._frameFlatMark = new Int32Array(STREAM_MAX_DEPTH);
		this._frameActive = new Uint8Array(STREAM_MAX_DEPTH);
		// Sibling counters, kept apart because the walk indexes declarations and child
		// rules independently (see `walkRule`) and a streamed block must agree with it.
		this._frameDeclIndex = new Int32Array(STREAM_MAX_DEPTH);
		this._frameRuleIndex = new Int32Array(STREAM_MAX_DEPTH);
		// Whether a finished child of this frame is walked at all: `skipChildren()` and
		// `recurseBlocks: false` both decline them, folded into one test per child.
		this._frameWalk = new Uint8Array(STREAM_MAX_DEPTH);
		// What the block buffered before it activated: its children from this
		// `_childStack` index up to the next frame's, so a descendant crossing the
		// threshold can drain them.
		this._frameChildBase = new Int32Array(STREAM_MAX_DEPTH);
		this._frameParentIndex = new Int32Array(STREAM_MAX_DEPTH);
		// The `@property` / `@function` / `@font-feature-values` state this frame was
		// entered under. A streamed block outlives the call that set it, so it is
		// restored when the frame closes.
		this._framePrevProperty = new Uint8Array(STREAM_MAX_DEPTH);
		this._framePrevFunction = new Uint8Array(STREAM_MAX_DEPTH);
		this._framePrevFeatureValues = new Uint8Array(STREAM_MAX_DEPTH);
		// Whether a streamed rule counts in `_within` until its block closes (not skipped).
		this._frameWithin = new Uint8Array(STREAM_MAX_DEPTH);
		// Printing a streamed block: where its first item landed, how deep its opener
		// sits in the writer's pending stack, and the direct declarations emitted so
		// far, the earlier of a set of identical ones being taken back.
		this._frameFirstChunk = new Int32Array(STREAM_MAX_DEPTH);
		this._framePendingDepth = new Int32Array(STREAM_MAX_DEPTH);
		/** @type {(Map<string, number> | null)[]} */
		this._frameSeenDeclarations = Array.from(
			{ length: STREAM_MAX_DEPTH },
			() => null
		);
		// The child rules a streamed block has emitted, by their printed text: the last
		// of a set of identical ones is the only one read, and the earlier are taken
		// back as each later one arrives.
		/** @type {(Map<string, number> | null)[]} */
		this._frameSeenRules = Array.from({ length: STREAM_MAX_DEPTH }, () => null);
		// The rule a streamed block wrote last, so the next one printing the same block
		// can put its selectors into it - `mergeAdjacentRules` for a collected body.
		/** @type {(PriorTopLevel | null)[]} */
		this._framePrior = Array.from({ length: STREAM_MAX_DEPTH }, () => null);
		// The openers enclosing each streamed depth, joined: what a rule there is read
		// under, so one elsewhere under the same conditions keys the same.
		/** @type {(string | null)[]} */
		this._frameChainKey = Array.from({ length: STREAM_MAX_DEPTH }, () => null);
		// Where each finished block's rules landed in it, youngest last - by print
		// order, since a node id is a slot the next top-level node reuses.
		/** @type {BlockSpans[]} */
		this._blockSpans = [];
		// Every rule taken so far, sheet-wide, by what encloses it and then by the text
		// it printed to - neither of which changes once written (see `RuleSpan`).
		/** @type {Map<string, RuleScope> | null} */
		this._ruleScopes = null;
		/** @type {RuleScope | null} */
		this._rootRuleScope = null;
		// CSS Cascade 5 §6.4.1: an `!important` declaration is read from the earliest
		// layer, so a copy in a later `@layer {` makes nothing dead.
		this._anonymousLayers = 0;
		// The named layer blocks a streamed block has emitted, by their opener: a later
		// one of the same name is folded into the piece the first went out as.
		/** @type {(Map<string, SeenLayer> | null)[]} */
		this._frameSeenLayers = Array.from(
			{ length: STREAM_MAX_DEPTH },
			() => null
		);
		// Where each rule of a streamed block stands, as `_topLevelRules` holds the
		// sheet's own - the list a cut's neighbors are put back together from.
		/** @type {((PriorTopLevel | null)[] | null)[]} */
		this._frameRuleRun = Array.from({ length: STREAM_MAX_DEPTH }, () => null);
		// Whether what a streamed block wrote so far ends in a `;`, which its `}` drops
		// and a body a later block of its layer folds in behind it needs back.
		this._frameEndsInSemicolon = new Uint8Array(STREAM_MAX_DEPTH);
		// The `@layer <name>{` a streamed block opens, read again when it closes: what
		// it wrote is never gathered, so only that layer's record ends with it.
		/** @type {(string | null)[]} */
		this._frameLayerOpener = Array.from(
			{ length: STREAM_MAX_DEPTH },
			() => null
		);
		// Set for the one block about to be consumed, and read as it opens: a named
		// `@layer` block a sibling already opened that layer in is held rather than
		// streamed, so the gather still reads its body whole (`heldForLayerGather`).
		this._holdForLayerGather = false;
		// The named layers each block has already opened among its children, read off
		// the source as they are consumed. The printer's own record is written as a
		// child is emitted, which a parent that has not activated yet has not done.
		/** @type {(Set<string> | null)[]} */
		this._frameSourceLayers = Array.from(
			{ length: STREAM_MAX_DEPTH },
			() => null
		);
		/** @type {Set<string> | null} the same, for what the stylesheet itself opens */
		this._sheetSourceLayers = null;
		// WHY: one object rather than one binding each, so the printer module reads
		// the same fields the walk writes - every slot is initialized here, so the
		// shape never transitions (see AGENTS.md "Keep instance shapes stable").
		this._stream = {
			/** @type {PrintContext | undefined} the print context while streaming, else undefined */
			writer: undefined
		};
		// The one top-level rule held back, so the next can be joined onto it (see
		// `mergeAdjacentRules` - the same merge, across nodes the writer takes one at a
		// time). Null when nothing is held.
		/** @type {HeldTopLevel | null} */
		this._heldTopLevel = null;
		// The rule written out before the held one, kept so a join only its settled
		// block qualifies for can still be made. Null when that was not one whole rule.
		/** @type {PriorTopLevel | null} */
		this._priorTopLevel = null;
		// Every top-level rule written out, in order: the piece anything else went out
		// as, or null where there is none. A cut lands late, so what ends up beside what
		// is known only at the end - and a piece a cut emptied parts nothing.
		/** @type {(PriorTopLevel | TakenPiece | null)[] | null} */
		this._topLevelRules = null;
		// The pieces prefixed rules went out as at the top level, by piece: the twin that
		// takes one back empties its entry, so the run reads it as gone, not standing.
		/** @type {Map<number, TakenPiece> | null} */
		this._prefixPieces = null;
		// The named layer blocks the stylesheet's own children have emitted, by their
		// opener: a later one of the same name is folded into the piece the first went
		// out as, as `_frameSeenLayers` does inside a block.
		/** @type {Map<string, SeenLayer> | null} */
		this._seenTopLevelLayers = null;
		// What each prior `shadowEarlierRule` compared against declares, with the text
		// that was read from, so a prior a later rule writes nothing of is passed over.
		/** @type {Map<RuleSpan, { text: string, names: Set<string> }>} */
		this._shadowDeclared = new Map();
		// WHY: a browser list's parse, and each list's per-property prefix decision,
		// memoized on the list: one process minifies for one target, so the work is done
		// once and every later lookup is a `Map.get`. A build minifies every asset
		// against one browserslist selection, but in a worker each asset arrives with a
		// freshly deserialized array - so the memo is keyed on the joined text, and
		// holds one selection at a time.
		/** @type {string[] | null} */
		this._browsersArray = null;
		/** @type {string | null} */
		this._browsersKey = null;
		/** @type {(number[] | undefined)[] | null} */
		this._parsedBrowsersMemo = null;
		// Whether the selection named a browser no compat dataset answers for, which
		// is what a rewrite taking a declaration away has to decline on.
		this._someBrowserUnanswered = false;
		this._someBrowserUnansweredMemo = false;
		// The prefixes those browsers read, by their engines; null for every prefix.
		/** @type {Set<string> | null} */
		this._unstatedPrefixes = null;
		/** @type {Set<string> | null} */
		this._unstatedPrefixesMemo = null;
		// Each axis' table -> its per-construct decision for the selection in hand. Kept
		// per table rather than under one tagged key, so a lookup allocates no string.
		/** @type {Map<Map<string, [string, number][]>, Map<string, Set<string> | null>>} */
		this._neededPrefixMemo = new Map();
		// The sRGB channels the last fallback conversion produced, before rounding, and
		// whether clamping them into the gamut moved one - read by the wider-gamut
		// fallback, which is only worth writing for a color sRGB cannot show.
		/** @type {number[] | null} */
		this._fallbackChannels = null;
		this._fallbackAlpha = 1;
		this._fallbackClipped = false;
		// ...and what the conversion that produced them passed through, which a mix or a
		// relative color reading this origin inherits.
		this._fallbackConversion = ENCODED_ALREADY;
		// The hue interpolation method the mix being read names, or `""`.
		this._hueMethod = "";
		// Whether folding the calls below clamped one into the sRGB gamut, read by the
		// caller: a second result, and no object built per value to carry it.
		this._wholeCallClipped = false;
		this._substitutionSearchFrom = -1;
		this._substitutionSearchOpening = -1;
		// No `\` in the input from `_escapeSearchFrom` up to `_escapeSearchAt`, the
		// next one or -1, as `rangeHasEscape` last found.
		this._escapeSearchFrom = -1;
		this._escapeSearchAt = -1;
		// The span `hasSubstitutionInSpan` last answered for. Offsets index the current
		// input, so a new stylesheet resets them.
		this._substitutionSpanFrom = -1;
		this._substitutionSpanTo = -1;
		this._substitutionSpanHas = false;
		// Each printed rule the merge can join -> its entry, by node id. Emptied per
		// top-level node by writing back only the ids set, which `_ruleEntryNodes` keeps.
		/** @type {(RuleEntry | undefined)[]} */
		this._ruleEntries = [];
		/** @type {number[]} */
		this._ruleEntryNodes = [];
		this._ruleEntryCount = 0;
		// A rule the nesting lowering wrote out as several -> one entry per rule, by
		// node id, so the merge reads each as a sibling rather than one opaque text.
		/** @type {(RuleEntry[] | undefined)[]} */
		this._hoistedRuns = [];
		/** @type {number[]} */
		this._hoistedRunNodes = [];
		this._hoistedRunCount = 0;
		/** @type {string[]} */
		this._pairProperties = [];
		this._pairGone = new Uint8Array(PAIRWISE_ITEMS);
		/** @type {DeclarationTable | undefined} */
		this._declarationTableValue = undefined;
		// Children-only skip: set by `A.skipChildren()` during an
		// `enter` dispatch, consumed by the walk.
		this._walkSkipped = false;
		// Set by `A.stop()` for the rest of the parse: no visitor fires after it, and a
		// walk-only parse ends once the top-level node it was called in is done.
		this._walkStopped = false;
		// The visitor lists `A.stop()` emptied in place, put back when the parse ends.
		/** @type {VisitorFn[][] | null} */
		this._walkHalted = null;
		// What a `skipChildren()` during a print empties until its node exits: a print
		// still writes what the node holds (docs/syntax.md), with no visitor below it.
		// No visitor fires inside, so no second skip can nest in the first.
		/** @type {VisitorFn[][] | null} */
		this._skippedVisitors = null;
		// The streamed block whose rule took `_skippedVisitors`, -1 for none.
		this._skippedFrame = -1;
		/** @type {Node | null} */
		this._walkParent = null;
		// Index of the current node within its sibling list (a rule body's declarations
		// and child rules are separate lists, so each indexes from 0 independently).
		this._walkIndex = 0;
		// How many nodes of each type enclose the current one (`A.within`): a hash inside
		// a declaration is a color, elsewhere (a selector prelude) it is an id.
		this._within = new Int32Array(32);
		// Whether a declaration a later one overrides is dropped with no `browserslist`
		// selection to say the later value is readable. Off by default: it gives up the
		// fallback pair an engine that cannot read the later spelling depends on.
		this._dropOverriddenDeclarations = false;
		// Whether the block being composed lays out by the 2009 flexbox draft, which
		// keeps that draft's properties however their replacements are spelled.
		this._legacyBoxBlock = false;
		// Whether a color may be written as the nearest hex where that hex only
		// approximates it. Off by default: webpack converts where it can prove an
		// engine's own conversion lands on the same bytes, and declines the rest.
		this._convertApproximateColors = false;
		// Whether a rule may take the selectors of a later one printing the same block,
		// past what stands between them. Off by default: it reorders the cascade.
		this._mergingDistantRules = false;
		// The rules a later one printing the same block may still take its selectors
		// into, keyed by that block, and how far the walk had got when each was taken.
		/** @type {Map<string, { rule: PriorTopLevel, seq: number }>} */
		this._distantRules = new Map();
		// The last plain rule under each selector list, which a later one under the
		// same list may still write its declarations into, keyed by that list.
		/** @type {Map<string, { rule: PriorTopLevel, seq: number }>} */
		this._distantSelectors = new Map();
		// The at-rules a later one stating the same condition may still fold its block
		// into, keyed by that condition. Held apart from `_distantRules`: those join by
		// printing one block under two selectors, these by stating one condition twice.
		/** @type {Map<string, { at: number, entry: RuleEntry, seq: number }>} */
		this._distantAtRules = new Map();
		// Whether the at-rule just emitted folded into an earlier one instead, so the
		// walk numbers it nowhere: what it declares moved with it.
		this._distantAtRuleFolded = false;
		// Where each property, and every name a shorthand of it would carry, was last
		// declared by a rule that may match any element; `*` for any property at all.
		/** @type {Map<string, number>} */
		this._distantDeclaredAt = new Map();
		// The same for rules whose subjects name element types: by name, and by `type
		// name`, since only a rule matching one of a candidate's types can shadow it.
		/** @type {Map<string, number>} */
		this._distantTypedDeclaredAt = new Map();
		/** @type {Map<string, number>} */
		this._distantTypeDeclaredAt = new Map();
		this._distantSeq = 0;
		// The list the last lend grew, and its text cut at each `,`: a run of lends to
		// one list asks the set rather than reading the list it grows again.
		/** @type {TakenPiece | null} */
		this._lentPiece = null;
		this._lentAt = -1;
		this._lentEnd = -1;
		this._lentEdits = -1;
		/** @type {Set<string>} */
		this._lentPieces = new Set();
		// The rule a run of lends grew, keyed again by its text only once a key is read:
		// keying it at each lend hashes the whole list it grows again.
		/** @type {RuleSpan | null} */
		this._deferredKeySpan = null;
		/** @type {TakenPiece | null} */
		this._deferredKeyTaken = null;
		// What `dropRepeatedChildren` read of each block, keyed by its children: a
		// run of joins reads only the children it appended, and two blocks taking
		// turns each keep theirs. Weak, so a block's read goes with its parse.
		/** @type {WeakMap<RuleEntry[], ChildTextRead>} */
		this._childTextReads = new WeakMap();
		// The last child of a block a join wrote, where that join wrote the child
		// too: no other block holds it, so the next join of a run growing the block
		// may extend the child's own children rather than copy them.
		/** @type {WeakMap<RuleEntry, RuleEntry>} */
		this._joinedTails = new WeakMap();
		// Which comments this print keeps, with a pattern already compiled to the
		// predicate it stands for - `true` every one, `false` none, `"some"` the ones
		// that carry something (see `isKeptComment`).
		/** @type {boolean | "some" | ((comment: string, line: number, column: number) => boolean)} */
		this._commentsKept = "some";
		// Where a `block-contents` print holds its top-level nodes instead of emitting
		// them one by one: that production is a declaration list, and the list-wide
		// transforms need the whole list. Null for a stylesheet, which streams.
		/** @type {(Rule | Declaration)[] | null} */
		this._blockContentsNodes = null;
		this._textDecorationColorStyleAllowed = true;
		this._textDecorationThicknessAllowed = true;
		// Whether a target may predate CSS Syntax 3 tokenizing, see `spaceForOldTokenizer`.
		this._oldTokenizer = false;
		// Whether a target runs Trident, whose `flex` reads omitted parts its own way.
		this._tridentTarget = false;
		this._colorFunctionAllowed = true;
		this._colorMixAllowed = true;
		this._hwbColorsAllowed = true;
		this._labColorsAllowed = true;
		this._lightDarkAllowed = true;
		this._whereSelectorAllowed = true;
		/** Whether every target reads `:dir()`. */
		this._dirSelectorAllowed = true;
		/** Whether every target reads nesting, so no rule is taken out of another. */
		this._nestingAllowed = true;
		/**
		 * Rules taken out of the one they were written in, innermost first, each still
		 * naming its parent with `&`. `owner` is the rule they are now written against,
		 * which is the only one that drains them - siblings share it, and taking an
		 * earlier sibling's would write it against the wrong parent.
		 * `apart` marks one a prefix copy wrote, which is written as a rule of its own:
		 * a selector an engine cannot read takes the whole list with it. `source` is
		 * the rule that wrote it, which its parent's block may yet find dead.
		 * @type {{ prelude: string, rest: string, owner: Node | null, apart?: boolean, source?: Node }[]}
		 */
		this._pendingNested = [];
		/**
		 * Each rule `_declarationsPrecedeRules` answered for, its start offset
		 * doubled plus the answer: every rule nested in it asks the same.
		 * @type {Map<Node, number> | null}
		 */
		this._rulesPrecede = null;
		/**
		 * Each `@custom-media` name -> the query it stands for, as printed.
		 * @type {Map<string, string>}
		 */
		this._customMedia = new Map();
		/**
		 * The names read ahead of a walk, which it starts from instead of empty maps.
		 * @type {{ media: Map<string, string>, selectors: Map<string, string> } | null}
		 */
		this._customAtRulesSeed = null;
		/** Whether the walk is the one reading the names ahead. */
		this._collectingCustomAtRules = false;
		/**
		 * Each `@custom-selector` name taken down so far, to the selector list it
		 * stands for, in the order the rules were written.
		 * @type {Map<string, string>}
		 */
		this._customSelectors = new Map();
		this._langArgumentListAllowed = true;
		this._notSelectorListAllowed = true;
		this._oklabColorsAllowed = true;
		// Whether any color function this print may meet is one the target cannot read,
		// so a block holding none is never scanned for a fallback.
		this._colorFallbacksNeeded = false;
		this._insetShorthandAllowed = true;
		// CSS Box Alignment 3's `place-*`, newer than the `align-*` / `justify-*` pairs.
		this._placeShorthandAllowed = true;
		// Whether the target reads `overflow`'s two-value form (`overflow:auto hidden`),
		// which is newer than the longhands it merges.
		this._overflowTwoValuesAllowed = true;
		// The preludes a prefix copy wrote this rule as, read by the caller: every copy
		// carries the rule's own block, so a rule written as several is still one block
		// under several preludes - which is what lets a hoist take them all out.
		/** @type {string[]} */
		this._prefixCopyPreludes = [];
		// Whether the run `_writeNested` built took in the rule the hoist emptied,
		// which is the caller's to write and so the caller's to leave out.
		this._nestedTookParent = false;
		// Each rule the run wrote, with its prelude's length. Read out of band, so a
		// caller can say what its text is: rules the ones around them may join onto.
		/** @type {{ text: string, prelude: number }[]} */
		this._nestedRuns = [];
	}
}

// WHY: the tree being read, which every per-run read goes through. A `const`,
// so the optimizer keeps one load and map check of it across calls; a nested
// run swaps the tree's contents with a spare from `spareTrees` instead.
const S = new CssSyntaxTree();
/** @type {CssSyntaxTree[]} parked trees for runs nested one deeper each, made on first use */
const spareTrees = [];
const TREE_FIELDS = /** @type {(keyof CssSyntaxTree)[]} */ (Object.keys(S));

/**
 * Exchange one field of `S` with the same field of `parked`.
 * @template {keyof CssSyntaxTree} K
 * @param {CssSyntaxTree} parked the spare to exchange with
 * @param {K} key the field
 */
const swapField = (parked, key) => {
	const value = S[key];
	S[key] = parked[key];
	parked[key] = value;
};
/** @type {number} how many `grammar` runs are in progress, the innermost reading `S` */
let grammarDepth = 0;

/**
 * Exchange every field of `S` with `parked`'s: the outer tree is parked on
 * entry to a nested run and read again once the same call puts it back.
 * @param {CssSyntaxTree} parked the spare to exchange with
 */
const swapTrees = (parked) => {
	for (const key of TREE_FIELDS) swapField(parked, key);
};

/**
 * Refill or empty again, through `lend`, the visitor lists the run just parked
 * halted: a nested run on the same processor shares them, and the runs parked
 * further out lent theirs when that run started.
 * @param {CssSyntaxTree} parked the tree of the run the nested one interrupts
 * @param {(halted: VisitorFn[][]) => void} lend `resumeVisitors` or `haltVisitorsAgain`
 */
const lendHaltedVisitors = (parked, lend) => {
	if (parked._walkHalted !== null) lend(parked._walkHalted);
	if (parked._skippedVisitors !== null) lend(parked._skippedVisitors);
};

/**
 * The CSS `SourceProcessor` grammar (see `runGrammar`). A run a visitor or an
 * embedded-source renderer starts while another is active parks the outer tree
 * in a spare and takes it back on the way out, so the outer run goes on intact.
 * @param {string} input source text
 * @param {CompiledVisitorMap} visitors compiled visitor map
 * @param {PrintContext | undefined} writer the print context to build output into, or undefined (walk only)
 * @param {CssProcessOptions} options process options
 * @param {CssPath=} path the processor's own path, handed to the visitors
 */
const grammar = (input, visitors, writer, options, path = A) => {
	/** @type {CssSyntaxTree | undefined} */
	let parked;
	if (grammarDepth !== 0) {
		parked = spareTrees[grammarDepth - 1];
		if (parked === undefined) {
			parked = new CssSyntaxTree();
			spareTrees.push(parked);
		}
		swapTrees(parked);
		lendHaltedVisitors(parked, resumeVisitors);
	}
	grammarDepth++;
	const outerPath = visitorPath;
	visitorPath = path;
	try {
		runGrammar(input, visitors, writer, options);
	} finally {
		visitorPath = outerPath;
		grammarDepth--;
		if (parked !== undefined) {
			lendHaltedVisitors(parked, haltVisitorsAgain);
			swapTrees(parked);
		}
	}
};

// WHY: a class keeps the path's getters on the prototype, so `A` itself keeps
// fast properties; an object literal holding a getter falls into dictionary
// mode, which makes every read through it a lookup.
/**
 * The path every visitor of a CSS `SourceProcessor` run receives, its reads
 * defaulting to the node the walk is at; outside a walk it is `A`, read by
 * passing the node a parse returned. Every field `CssParser` reads goes through
 * it, with `n` an integer node id into the columns, so the storage stays behind it.
 */
class CssSyntaxPath {
	// === path position (rebound by the walk before every visitor call) ===
	/**
	 * @returns {Node} current node - only valid during a visitor callback
	 */
	get node() {
		return S._walkNode;
	}

	/**
	 * @returns {Node | null} enclosing node (null = a top-level node)
	 */
	get parent() {
		return S._walkParent;
	}

	/**
	 * @returns {number} index of the current node within its sibling list (0 for a top-level node) - only valid during a visitor callback
	 */
	get index() {
		return S._walkIndex;
	}

	/** Stop the walk descending into the current node (enter only). */
	skipChildren() {
		S._walkSkipped = true;
	}

	/** Stop the walk: no visitor fires after the current one returns. */
	stop() {
		if (S._walkStopped) return;
		S._walkStopped = true;
		S._walkHalted = haltVisitors(S._walkVisitors);
		S._walkVisitors = STOPPED_VISITORS;
		S._commentBucket = undefined;
	}

	/**
	 * Print the current node as `text` in place of what the printer writes; on a
	 * walk that prints nothing, or on a comment, it does nothing. What holds the
	 * node then prints its children's text as they printed, without the rewrites.
	 * @param {string} text what the node prints as, a declaration's `;` optional
	 * @returns {void}
	 */
	replace(text) {
		const writer = S._stream.writer;
		if (writer === undefined) return;
		const node = S._walkNode;
		const type = S._types[node];
		// A comment is read from the token stream, never printed as a node.
		if (type === NodeType.Comment) return;
		// A declaration's text carries the `;` the block parts them with.
		writer.replace(
			node,
			type === NodeType.Declaration &&
				text.length !== 0 &&
				text.charCodeAt(text.length - 1) !== CC_SEMICOLON
				? `${text};`
				: text
		);
	}

	/**
	 * Print nothing for the current node, as `replace("")`.
	 * @returns {void}
	 */
	remove() {
		A.replace("");
	}

	/**
	 * A top-level rule and a comment have none; a hash within a declaration is
	 * a color, elsewhere an id.
	 * @param {number} type a `NodeType`
	 * @returns {boolean} whether an ancestor of the current node has that type
	 */
	within(type) {
		return S._walkParent !== null && S._within[type] !== 0;
	}

	// === field reads - `n` defaults to the current node ===
	/**
	 * @param {Node=} n node
	 * @returns {number} node type
	 */
	type(n = S._walkNode) {
		return S._types[n];
	}

	/**
	 * @param {Node=} n node
	 * @returns {[number, number]} start and end offsets in the input
	 */
	range(n = S._walkNode) {
		const i = n;
		return [S._starts[i], S._ends[i]];
	}

	/**
	 * @param {Node=} n node
	 * @returns {number} where the node starts in the input
	 */
	start(n = S._walkNode) {
		return S._starts[n];
	}

	/**
	 * @param {Node=} n node
	 * @returns {number} where the node ends in the input
	 */
	end(n = S._walkNode) {
		return S._ends[n];
	}

	/**
	 * @param {Node=} n node
	 * @returns {[number, number, number, number]} start line and column, end line and column (lines from 1, columns from 0)
	 */
	loc(n = S._walkNode) {
		const i = n;
		const lc = S._locConverter;
		const s = lc.get(S._starts[i]);
		const line = s.line;
		const column = s.column;
		const e = lc.get(S._ends[i]);
		return [line, column, e.line, e.column];
	}

	/**
	 * A node's text exactly as the input wrote it (`name` and `value` decode).
	 * @param {Node | number=} n node, or the start offset when `end` is given
	 * @param {number=} end end offset, to read the input between two offsets
	 * @returns {string} the node's source, or the input between the offsets
	 */
	source(n, end) {
		if (end !== undefined) {
			return S._originalInput.slice(/** @type {number} */ (n), end);
		}
		const i = n === undefined ? S._walkNode : n;
		return S._originalInput.slice(S._starts[i], S._ends[i]);
	}

	/**
	 * The token's value as CSS Syntax defines it: a number for a number,
	 * percentage or dimension, otherwise text with escapes resolved (a string
	 * without its quotes, a hash without its `#`, a `url()`'s contents, a
	 * comment's text); "" for a rule, declaration, function or block.
	 * @param {Node=} n node
	 * @returns {string | number} the decoded value
	 */
	value(n = S._walkNode) {
		const i = n;
		const type = S._types[i];
		if (HAS_CHILD_LIST[type] === 1) {
			return type === NodeType.SimpleBlock ? S._input[S._starts[i]] : "";
		}
		if (
			type === NodeType.Number ||
			type === NodeType.Percentage ||
			type === NodeType.Dimension
		) {
			const v = valueOf(i);
			return Number(v.slice(0, consumeANumber(v, 0)));
		}
		if (type === NodeType.Comment) {
			const start = S._starts[i] + 2;
			const end = S._ends[i];
			const closed = end - start >= 2 && S._input.endsWith("*/", end);
			return S._input.slice(start, closed ? end - 2 : end);
		}
		return decodedValue(n);
	}

	/**
	 * @param {Node=} n node
	 * @returns {string} an at-rule's, declaration's or function's name, escapes
	 * resolved (an at-rule's without the `@`); a dimension's unit; "" for other nodes
	 */
	name(n = S._walkNode) {
		const i = n;
		if (HAS_NAME[S._types[i]] === 0) {
			return S._types[i] === NodeType.Dimension ? unitOf(i) : "";
		}
		return unescapeIdentifier(rawName(n));
	}

	/**
	 * A rule's children are its prelude; its block is read with {@link field}.
	 * @param {Node=} n node
	 * @returns {number} number of children
	 */
	childCount(n = S._walkNode) {
		const i = n;
		return HAS_CHILD_LIST[S._types[i]] === 0 ? 0 : S._listLengths[i];
	}

	/**
	 * @param {number} i child index
	 * @param {Node=} n node
	 * @returns {ComponentValue} the i-th child (0 = none)
	 */
	child(i, n = S._walkNode) {
		const k = n;
		if (HAS_CHILD_LIST[S._types[k]] === 0 || i >= S._listLengths[k]) {
			return 0;
		}
		return S._listItems[S._listStarts[k] + i];
	}

	/**
	 * Every child as a new array, for a reader that keeps or searches them.
	 * @param {Node=} n node
	 * @returns {ComponentValue[]} its children (empty for a leaf)
	 */
	children(n = S._walkNode) {
		return HAS_CHILD_LIST[S._types[n]] === 0 ? [] : materializeList(n);
	}

	/**
	 * A block big enough to stream hands its children to the visitors as each
	 * one finishes rather than collecting them, so its lists read as empty here.
	 * @param {number} field a `Field`
	 * @param {Node=} n node
	 * @returns {number} number of items in that field (0 when the node has none)
	 */
	fieldCount(field, n = S._walkNode) {
		const i = n;
		const type = S._types[i];
		if (LIST_FIELD[type] === field) return S._listLengths[i];
		if (
			(field !== Field.declarations && field !== Field.rules) ||
			(type !== NodeType.AtRule && type !== NodeType.QualifiedRule) ||
			S._bodyIdx[i] === 0
		) {
			return 0;
		}
		const bi = S._bodyIdx[i];
		return field === Field.declarations
			? S._listItems[bi]
			: S._listItems[bi - 1];
	}

	/**
	 * @param {number} i item index
	 * @param {number} field a `Field`
	 * @param {Node=} n node
	 * @returns {Node} the i-th item of that field (0 = none)
	 */
	field(i, field, n = S._walkNode) {
		const k = n;
		if (i < 0 || i >= A.fieldCount(field, n)) {
			return 0;
		}
		if (LIST_FIELD[S._types[k]] === field) {
			return S._listItems[S._listStarts[k] + i];
		}
		const bi = S._bodyIdx[k];
		return field === Field.declarations
			? S._listItems[bi + 1 + i]
			: S._listItems[bi + 1 + S._listItems[bi] + i];
	}

	/**
	 * @param {number} field a `Field`
	 * @param {string} name the decoded name to look for
	 * @param {Node=} n node
	 * @returns {Node} the first item of that field with this name (0 = none)
	 */
	fieldNamed(field, name, n = S._walkNode) {
		for (let i = 0, count = A.fieldCount(field, n); i < count; i++) {
			const item = A.field(i, field, n);
			if (A.name(item) === name) return item;
		}
		return 0;
	}

	/**
	 * `important` is a container's bit, cleared when its id is reused; a token's
	 * type flags are read off its text.
	 * @param {number} flag a `Flag`
	 * @param {Node=} n node
	 * @returns {boolean} whether that flag is set
	 */
	flag(flag, n = S._walkNode) {
		const i = n;
		const type = S._types[i];
		if (flag === Flag.important) {
			return HAS_CHILD_LIST[type] === 1 && (S._flags[i] & flag) !== 0;
		}
		if (flag === Flag.integer) {
			return (
				(type === NodeType.Number ||
					type === NodeType.Percentage ||
					type === NodeType.Dimension) &&
				isIntegerToken(i)
			);
		}
		return flag === Flag.id && type === NodeType.Hash && isIdHash(i);
	}

	/**
	 * @param {number} part a `Part`
	 * @param {Node=} n node
	 * @returns {[number, number] | null} where that part is written (null without one)
	 */
	rangeOf(part, n = S._walkNode) {
		const start = A.startOf(part, n);
		return start === -1 ? null : [start, A.endOf(part, n)];
	}

	/**
	 * @param {number} part a `Part`
	 * @param {Node=} n node
	 * @returns {number} where that part starts (-1 without one)
	 */
	startOf(part, n = S._walkNode) {
		const i = n;
		const type = S._types[i];
		if (part === Part.name) {
			if (HAS_NAME[type] === 1) return nameStartOf(n);
			return type === NodeType.Dimension
				? S._starts[i] + consumeANumber(valueOf(i), 0)
				: -1;
		}
		if (part === Part.value) {
			if (type === NodeType.Url) return S._aux0[i];
			return type === NodeType.Declaration && S._listLengths[i] !== 0
				? S._starts[S._listItems[S._listStarts[i]]]
				: -1;
		}
		return part === Part.block &&
			(type === NodeType.AtRule || type === NodeType.QualifiedRule)
			? S._aux1[i]
			: -1;
	}

	/**
	 * @param {number} part a `Part`
	 * @param {Node=} n node
	 * @returns {number} where that part ends (-1 without one)
	 */
	endOf(part, n = S._walkNode) {
		const i = n;
		const type = S._types[i];
		if (part === Part.name) {
			if (HAS_NAME[type] === 1) return S._aux0[i];
			return type === NodeType.Dimension ? S._ends[i] : -1;
		}
		if (part === Part.value) {
			if (type === NodeType.Url) return S._aux1[i];
			return type === NodeType.Declaration && S._listLengths[i] !== 0
				? S._ends[S._listItems[S._listStarts[i] + S._listLengths[i] - 1]]
				: -1;
		}
		return part === Part.block &&
			(type === NodeType.AtRule || type === NodeType.QualifiedRule) &&
			S._aux1[i] !== -1
			? S._ends[i]
			: -1;
	}

	/**
	 * Escapes stay as written; `name` and `value` read them resolved.
	 * @param {number} part a `Part`
	 * @param {Node=} n node
	 * @returns {string | null} that part's source text (null without one)
	 */
	textOf(part, n = S._walkNode) {
		const start = A.startOf(part, n);
		return start === -1
			? null
			: S._originalInput.slice(start, A.endOf(part, n));
	}
}

const A = new CssSyntaxPath();
// The path the visitors are handed: the run's processor's own, which reads
// through `A` and holds the run's `state`.
/** @type {CssPath} */
let visitorPath = A;

// Scalar position reads for the parser and printers, which must not allocate
// the arrays the path's `range`, `loc` and `rangeOf` return.
/** @type {(n: Node) => number} */
const startOf = (n) => S._starts[n];
/** @type {(n: Node) => number} */
const endOf = (n) => S._ends[n];
/** @type {(n: Node) => number} where a name starts, an at-rule's after the `@` */
const nameStartOf = (n) => {
	const i = n;
	return S._types[i] === NodeType.AtRule ? S._starts[i] + 1 : S._starts[i];
};
/** @type {(n: Node) => number} */
const nameEndOf = (n) => S._aux0[n];

/**
 * A token's text value with escapes resolved, as `A.value` reads every token
 * but a number, percentage, dimension or comment.
 * @param {Node} n node
 * @returns {string} the decoded text
 */
const decodedValue = (n) => {
	const i = n;
	const v = valueOf(i);
	if (S._types[i] !== NodeType.String) {
		const ranOut = S._ends[i] === S._input.length;
		return unescapeIdentifier(ranOut ? resolveTrailingEscape(v, false) : v);
	}
	return unescapeStringValue(stringContent(v));
};

/**
 * A node's text as the printer reads it: as written, but for an escape the
 * input ran out of, which is the character it names (§4.3.5, §4.3.7).
 * @param {Node} n node
 * @returns {string} its text
 */
const printedSource = (n) => {
	const i = n;
	const end = S._ends[i];
	const text = S._input.slice(S._starts[i], end);
	if (end !== S._input.length) return text;
	return resolveTrailingEscape(text, S._types[i] === NODE_TYPE_STRING);
};

/**
 * A token's value as written (`A.value` resolves its escapes): what the
 * minifier reads to keep the author's spelling.
 * @param {Node} n node
 * @returns {string} the raw value
 */
const rawValue = (n) => valueOf(n);

/**
 * A rule's, declaration's or function's name as written, but for an escape the
 * input ran out of, which is the replacement character it names (§4.3.7).
 * @param {Node} n node
 * @returns {string} the raw name
 */
const rawName = (n) => {
	const i = n;
	const end = S._aux0[i];
	const text = S._input.slice(
		S._types[i] === NODE_TYPE_AT_RULE ? S._starts[i] + 1 : S._starts[i],
		end
	);
	if (end !== S._input.length) return text;
	return resolveTrailingEscape(text, false);
};

/**
 * @param {Node} n at-rule
 * @returns {string} its name, escapes resolved and ASCII lowercased
 */
const atKeywordOf = (n) => atKeyword(rawName(n));

// Nodes are integer ids into the store, read through the `A` accessor, which is
// exported at runtime with the `parseA*` entry points, the `TokenStream` and the
// string utilities.
/**
 * Note where one child of a block lands in it. A qualified rule is one rule
 * whatever it nests, so it is a span of its own; an at-rule is a condition its
 * body is read under, so its own spans move in, its prelude joining their keys.
 * @param {RuleSpan[]} spans the block's spans, added to
 * @param {Node} item the child
 * @param {string} text the child's printed text
 * @param {number} at where the text lands in the block's body
 * @param {CssPath} path the accessor
 * @param {BlockSpans} inner what the child recorded: every rule and raw item records one
 * @returns {void}
 */
const collectRuleSpans = (spans, item, text, at, path, inner) => {
	// A qualified rule is one rule, and each rule it nests is another read under
	// it - the parent first, so a cut that takes the whole rule is seen before
	// anything inside it.
	if (path.type(item) === NodeType.QualifiedRule) {
		for (const span of ownRuleSpans(inner, text, at)) spans.push(span);
	} else if (
		inner.prelude.charCodeAt(0) === CC_AT_SIGN &&
		DROPPABLE_WHEN_EMPTY_AT_RULES.has(atRuleName(inner.prelude))
	) {
		// Not a rule of its own - a condition its body is read under - so it is
		// noted only to be cut once the cuts inside it have left it empty.
		spans.push({
			scope: rootScope(),
			key: UNKEYED,
			at,
			len: text.length,
			taken: null
		});
	}
	const base = at + inner.bodyAt;
	for (const span of inner.spans) {
		spans.push({
			scope: enclosingRuleScope(span.scope, inner.keyPrelude),
			key: span.key,
			at: base + span.at,
			len: span.len,
			taken: null
		});
	}
};

module.exports.A = A;
module.exports.DARK_PROPERTY = DARK_PROPERTY;
module.exports.KEYFRAMES_AT_RULE_RE = KEYFRAMES_AT_RULE_RE;
module.exports.LIGHT_PROPERTY = LIGHT_PROPERTY;
module.exports.Field = Field;
module.exports.Flag = Flag;
module.exports.Part = Part;
module.exports._CC_0 = CC_0;
module.exports._CC_APOSTROPHE = CC_APOSTROPHE;
module.exports._CC_COMMA = CC_COMMA;
module.exports._CC_FULL_STOP = CC_FULL_STOP;
module.exports._CC_GREATER_THAN_SIGN = CC_GREATER_THAN_SIGN;
module.exports._CC_HYPHEN_MINUS = CC_HYPHEN_MINUS;
module.exports._CC_LEFT_PARENTHESIS = CC_LEFT_PARENTHESIS;
module.exports._CC_LEFT_SQUARE = CC_LEFT_SQUARE;
module.exports._CC_LOWER_D = CC_LOWER_D;
module.exports._CC_LOW_LINE = CC_LOW_LINE;
module.exports._CC_NUMBER_SIGN = CC_NUMBER_SIGN;
module.exports._CC_PLUS_SIGN = CC_PLUS_SIGN;
module.exports._CC_QUOTATION_MARK = CC_QUOTATION_MARK;
module.exports._CC_REVERSE_SOLIDUS = CC_REVERSE_SOLIDUS;
module.exports._CC_RIGHT_PARENTHESIS = CC_RIGHT_PARENTHESIS;
module.exports._CC_RIGHT_SQUARE = CC_RIGHT_SQUARE;
module.exports._CC_SPACE = CC_SPACE;
module.exports._CC_TILDE = CC_TILDE;
module.exports._CC_UPPER_A = CC_UPPER_A;
module.exports._CC_UPPER_Z = CC_UPPER_Z;
module.exports._LIST_KIND_KEYFRAME = LIST_KIND_KEYFRAME;
module.exports._LIST_KIND_NESTED = LIST_KIND_NESTED;
module.exports._LIST_KIND_SELECTOR = LIST_KIND_SELECTOR;
module.exports._LIST_NO = LIST_NO;
module.exports._LIST_UNKNOWN = LIST_UNKNOWN;
module.exports._blockTokenOf = blockTokenOf;
module.exports.NodeType = NodeType;
module.exports.TokenType = TokenType;
module.exports.TokenStream = TokenStream;
module.exports.VENDOR_PREFIX = VENDOR_PREFIX;
module.exports._IMPORTANT = IMPORTANT;
module.exports._LONE_NUMBER_RE = LONE_NUMBER_RE;
module.exports._NO_RULE_SPANS = NO_RULE_SPANS;
module.exports._NUMERIC_RE = NUMERIC_RE;
module.exports._atKeywordOf = atKeywordOf;
module.exports._printedSource = printedSource;
module.exports._rawName = rawName;
module.exports._setVerbatimLeafPrinter = setVerbatimLeafPrinter;
module.exports._trimCssWhiteSpace = trimCssWhiteSpace;
module.exports._declarationsOf = declarationsOf;
module.exports._rulesOf = rulesOf;
module.exports._isImportant = isImportant;
module.exports._rawValue = rawValue;
module.exports._S = S;
module.exports._SEP = SEP;
module.exports._keepKeywordComments = keepKeywordComments;
module.exports._TRIM_COMBINATORS = TRIM_COMBINATORS;
/**
 * The body a reused block composes to, for the rule being printed.
 * @param {Node} node the rule
 * @returns {string | undefined} the body, or undefined to compose it
 */
module.exports._memoizedBlockBody = (node) =>
	S._blockMemoNode === node ? S._blockMemoBody : undefined;
/**
 * Done with the rule the walk looked a block up for: keep the body it composed
 * where the walk asked for one, and forget the rule - node ids are reused.
 * @param {Node} node the rule
 * @param {string | null} body its composed body, null to keep none
 * @returns {void}
 */
module.exports._memoizeBlockBody = (node, body) => {
	if (
		S._blockMemoNode === node &&
		body !== null &&
		S._blockMemoKey !== "" &&
		S._blockMemo !== null
	) {
		S._blockMemoKeyTable.set(S._blockMemoKey, body);
	}
	S._blockMemoNode = null;
	S._blockMemoBody = undefined;
	S._blockMemoKey = "";
};
module.exports._TRIM_CONDITIONS = TRIM_CONDITIONS;
module.exports._TRIM_MATH = TRIM_MATH;
module.exports._TRIM_NOTHING = TRIM_NOTHING;
module.exports._TRIM_SEPARATORS = TRIM_SEPARATORS;
module.exports._UNREADABLE_COLOR_CALL_RE = UNREADABLE_COLOR_CALL_RE;
module.exports._ZERO_LENGTH_RE = ZERO_LENGTH_RE;
module.exports._alphaByteText = alphaByteText;
module.exports._anyUnordered = anyUnordered;
module.exports._appendChildTexts = appendChildTexts;
module.exports._atKeyword = atKeyword;
module.exports._closeAtEof = closeAtEof;
module.exports._collapseBox = collapseBox;
module.exports._composeBlockBody = composeBlockBody;
module.exports._customPropertyValue = customPropertyValue;
module.exports._dropFamilyInitials = dropFamilyInitials;
module.exports._dropImpliedUniversalSelector = dropImpliedUniversalSelector;
module.exports._dropZeroLengthUnit = dropZeroLengthUnit;
module.exports._evaluateCalcSum = evaluateCalcSum;
module.exports._foldPseudoNames = foldPseudoNames;
module.exports._unwrapLoneIs = unwrapLoneIs;
module.exports.containsSubstitutionFunction = containsSubstitutionFunction;
module.exports._hasSubstitutionInSpan = hasSubstitutionInSpan;
module.exports._holdBySignature = holdBySignature;
module.exports._noteRetractedPiece = noteRetractedPiece;
module.exports._isClosedString = isClosedString;
module.exports.isDigit = isDigit;
module.exports.isHexDigit = isHexDigit;
module.exports._isIdentCodePoint = isAsciiIdentCodePoint;
module.exports.isIdentCodePoint = isIdentCodePoint;
module.exports.isIdentStartCodePoint = isIdentStartCodePoint;
module.exports.isLetter = isLetter;
module.exports._isUnterminatedUrl = isUnterminatedUrl;
module.exports._join = join;
module.exports._lowercaseConditionParts = lowercaseConditionParts;
module.exports._minifyColorFunction = minifyColorFunction;
module.exports._minifyPolarColorFunction = minifyPolarColorFunction;
module.exports._neededPrefixes = neededPrefixes;
module.exports._normalizeExponent = normalizeExponent;
module.exports._nearByteHalf = nearByteHalf;
module.exports._normalizeNumber = normalizeNumber;
module.exports._opaqueEntry = opaqueEntry;
module.exports._openerKey = openerKey;
module.exports._prefixRemovable = prefixRemovable;
module.exports._prefixScope = prefixScope;
module.exports._roundSignificant = roundSignificant;
module.exports._edgeKeywordRead = edgeKeywordRead;
module.exports._canonicalSelectorList = canonicalSelectorList;
module.exports._ruleEntryOf = ruleEntryOf;
module.exports._rulePrelude = rulePrelude;
module.exports._setRuleEntry = setRuleEntry;
module.exports._setHoistedRuns = setHoistedRuns;
module.exports._shortestColor = shortestColor;
module.exports._shortestFlexValue = shortestFlexValue;
module.exports._shortestAuthoredFlex = shortestAuthoredFlex;
module.exports._joinSlots = joinSlots;
module.exports._splitPrintedComponents = splitPrintedComponents;
module.exports._shorthandSlotsReadable = shorthandSlotsReadable;
module.exports._splitSelectorList = splitSelectorList;
module.exports._splitTopLevelArguments = splitTopLevelArguments;
module.exports._splitTopLevelSpaces = splitTopLevelSpaces;
module.exports._takeUnusedRule = takeUnusedRule;
module.exports._terminate = terminate;
module.exports._tokenizeCalc = tokenizeCalc;
module.exports._unreadableColorFunction = unreadableColorFunction;
module.exports._valueClasses = valueClasses;
module.exports._valueComponents = valueComponents;
module.exports.asciiLowercaseName = asciiLowercaseName;
module.exports.buildSkipSet = buildSkipSet;
module.exports.consumeExtraNewline = consumeExtraNewline;
module.exports.asciiCaseInsensitiveMatch = asciiCaseInsensitiveMatch;
module.exports.escapeIdentifier = escapeIdentifier;
module.exports.escapeName = escapeName;
module.exports.grammar = grammar;
module.exports.isDashedIdentifier = isDashedIdentifier;
module.exports.isSimpleIdentifier = isSimpleIdentifier;
module.exports.isAsciiWhitespace = isAsciiWhitespace;
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
module.exports.rangeEquals = rangeEquals;
module.exports.rangeAsciiCaseInsensitiveMatch = rangeAsciiCaseInsensitiveMatch;
module.exports.readToken = readToken;
module.exports.skipEscape = skipEscape;
module.exports.terminateIdentifier = terminateIdentifier;
module.exports.toLowerCaseIfNeeded = toLowerCaseIfNeeded;
module.exports.unescapeIdentifier = unescapeIdentifier;
