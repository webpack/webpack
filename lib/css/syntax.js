/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { CSS_TYPE } = require("../ModuleSourceTypeConstants");
const LocConverter = require("../util/LocConverter");
const GenericSourceProcessor = require("../util/SourceProcessor");

const { deferredWrite } = GenericSourceProcessor;

const {
	EMBEDDED_LANGUAGES,
	askEmbeddedRenderer,
	buildDataURI,
	collectEmbeddedDiagnostics,
	decodeDataURIPayload,
	embeddedText,
	languageOfMediaType,
	parseDataURI
} = require("../util/dataURL");
const { makeCacheable } = require("../util/identifier");

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
	ABSOLUTE_UNIT_SCALE,
	ALPHA_VALUE_PROPERTIES,
	ANGLE_UNITS,
	AUTO_SECOND_VALUE_PROPERTIES,
	BOX_FAMILY_PREFIX,
	BOX_LONGHANDS,
	BOX_SHORTHANDS,
	CALC_REJECTING_PROPERTIES,
	CANONICAL_NAMES,
	CLAMPED_VALUE_RANGES,
	COLOR_ARGUMENT_FUNCTIONS,
	COLOR_KEYWORDS,
	COLOR_NAME_TO_SHORTEST,
	COLOR_ONLY_PROPERTIES,
	COMPOUND_CONTINUATIONS,
	CSS_WIDE_KEYWORDS,
	CUBIC_BEZIER_KEYWORDS,
	CUSTOM_IDENT_LIST_PROPERTIES,
	DEFAULT_GRADIENT_DIRECTIONS,
	DISPLAY_SHORT_FORMS,
	DROPPABLE_WHEN_EMPTY_AT_RULES,
	EASING_KEYWORDS,
	FAMILY_LONGHANDS,
	FAMILY_SLOT_CLASSES,
	FAMILY_SLOT_KEYWORDS,
	FEATURELESS_PSEUDO_CLASSES,
	FILTER_FUNCTION_OMITTED,
	FLEX_KEYWORDS,
	FONT_SIZE_KEYWORDS,
	FONT_STRETCH_PERCENTAGES,
	FONT_WEIGHT_NUMBERS,
	GENERIC_FONT_FAMILIES,
	GRADIENT_LAST_POSITIONS,
	INITIAL_VALUE_KEYWORDS,
	INTEGER_PROPERTIES,
	KEYWORD_ONLY_PROPERTIES,
	LEGACY_PSEUDO_ELEMENTS,
	LENGTH_ONLY_FUNCTIONS,
	LINEAR_GRADIENTS,
	MATH_FUNCTIONS,
	MATH_FUNCTION_ARITY,
	MATH_FUNCTION_FOLD,
	MATH_FUNCTION_KEYWORDS,
	MATH_FUNCTION_SUM_ARGUMENTS,
	MERGEABLE_AT_RULES,
	MERGE_LONGHANDS,
	NEGATIVE_ACCEPTING_PROPERTIES,
	NEVER,
	NTH_NAMED_EQUIVALENTS,
	NTH_PSEUDO_FUNCTIONS,
	OMITTABLE_INITIAL_KEYWORDS,
	ONE_VALUE_PAIR_SHORTHANDS,
	PAIR_LONGHANDS,
	PLACE_SHORTHANDS,
	POSITION_PROPERTIES,
	POSITION_X_KEYWORDS,
	POSITION_Y_KEYWORDS,
	PREFIXED_AT_RULES,
	PREFIXED_PROPERTIES,
	PREFIXED_SELECTORS,
	PREFIXED_SPELLING_KEYWORDS,
	PREFIXED_VALUES,
	PREFIX_WINDOWS,
	PREFIX_WINDOW_STARTS,
	RATIO_PROPERTIES,
	REPEAT_STYLE_KEYWORDS,
	REPEAT_STYLE_PROPERTIES,
	RGB_TO_NAME,
	SELECTOR_FUNCTIONS,
	SELECTOR_SUPPORTED_FROM,
	SHADOW_PROPERTIES,
	SHORTHAND_INITIAL_KEYWORDS,
	SLASH_BOX_SHORTHANDS,
	SLASH_LONGHANDS,
	STEPPED_FUNCTIONS,
	SUBSTITUTION_FUNCTIONS,
	SUPPORTED_FROM,
	SUPPORT_BROWSERS,
	SUPPORT_PROFILES,
	TRANSITION_BEHAVIORS,
	UNIT_CONVERSION_TARGETS,
	UNIT_GROUP_BASE,
	UNSHARED_LONGHAND_KEYWORDS,
	X_AXIS_TRANSFORMS,
	ZERO_ANGLE_FUNCTIONS,
	ZERO_UNIT_KEEPING_PROPERTIES,
	exactAdd,
	exactDivide,
	exactMultiply
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
const CC_LOWER_E = "e".charCodeAt(0);
const CC_LOWER_U = "u".charCodeAt(0);
const CC_LOWER_R = "r".charCodeAt(0);
const CC_LOWER_L = "l".charCodeAt(0);
const CC_LOWER_T = "t".charCodeAt(0);
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

// Lexer token types (CSS Syntax Level 3 §4) plus the `<eof-token>`. Numeric so
// the per-token `type` slot stays compact and `next` / `consume` / the consume
// algorithms dispatch on integer `===` instead of string comparison. Exported
// alongside `readToken` (the per-token lexer primitive) for the unit test.
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

// The opening bracket types (7..9) and their mirror closers (10..12) are laid
// out so a closer is always `opener + 3`; `consumeASimpleBlock` uses that
// directly. The associated block char is a dense array indexed by the opener's
// offset from `TT_LEFT_PARENTHESIS` — a plain element load instead of a numeric
// object-key lookup.
/** @type {SimpleBlockToken[]} */
const BLOCK_TOKEN_CHAR = ["(", "[", "{"];

/**
 * @param {number} cc char code
 * @returns {boolean} true, if cc is a newline (per the spec: LF, CR, or FF)
 */
const _isNewline = (cc) =>
	cc === CC_LINE_FEED || cc === CC_CARRIAGE_RETURN || cc === CC_FORM_FEED;

/**
 * If the source had a CR followed by an LF, advance past the LF —
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
const _isSpace = (cc) => cc === CC_SPACE || cc === CC_TAB;

/**
 * @param {number} cc char code
 * @returns {boolean} true, if cc is whitespace (space/tab/newline)
 */
// Space-first: U+0020 is the common case, so it short-circuits before the
// rarer tab / newline tests.
const _isWhiteSpace = (cc) => _isSpace(cc) || _isNewline(cc);

// Whitespace membership table for the run-consumption loop — one load instead
// of up to five compares per char. EOF (NaN) / non-ASCII index to undefined.
const _wsTable = new Uint8Array(128);
_wsTable[CC_SPACE] = 1;
_wsTable[CC_TAB] = 1;
_wsTable[CC_LINE_FEED] = 1;
_wsTable[CC_CARRIAGE_RETURN] = 1;
_wsTable[CC_FORM_FEED] = 1;

/**
 * @param {number} cc char code
 * @returns {boolean} true, if cc is a digit
 */
const _isDigit = (cc) => cc >= CC_0 && cc <= CC_9;

/**
 * @param {number} cc char code
 * @returns {boolean} true, if cc is a hex digit
 */
const _isHexDigit = (cc) =>
	_isDigit(cc) ||
	(cc >= CC_UPPER_A && cc <= CC_UPPER_F) ||
	(cc >= CC_LOWER_A && cc <= CC_LOWER_F);

/**
 * @param {number} cc char code
 * @returns {boolean} is letter (a-z / A-Z)
 */
const _isLetter = (cc) =>
	(cc >= CC_LOWER_A && cc <= CC_LOWER_Z) ||
	(cc >= CC_UPPER_A && cc <= CC_UPPER_Z);

/**
 * Spec: ident-start = letter / non-ASCII / `_`. Internal helper that
 * accepts an explicit char code (lookahead).
 * @param {number} cc char code
 * @returns {boolean} true, if cc is an ident-start code point
 */
const _isIdentStartCodePointCC = (cc) =>
	_isLetter(cc) || cc >= 0x80 || cc === CC_LOW_LINE;

/**
 * Spec: ident-code = ident-start / digit / hyphen-minus.
 */
// Full `charCodeAt` range (0..0xFFFF) so the per-code-point ident test is one
// table load with no `cc < 128` branch — `_consumeAnIdentSequence` runs this on
// every character of every ident / class / property name (the tokenizer's
// hottest loop). Every non-ASCII code unit (>= 0x80) is an ident code point per
// spec, so those default to 1; only the ASCII rows carry real classification.
// Callers must index with `cc | 0`: EOF (`charCodeAt` → NaN) becomes 0 (NUL,
// not an ident) — a raw NaN index is an out-of-range access that permanently
// degrades the load site's IC.
const _identCharTable = new Uint8Array(0x10000).fill(1);
for (let i = 0; i < 128; i++) {
	_identCharTable[i] =
		_isLetter(i) || i === CC_LOW_LINE || _isDigit(i) || i === CC_HYPHEN_MINUS
			? 1
			: 0;
}
/**
 * @param {number} cc char code
 * @returns {boolean} true, if cc is an ident-sequence code point
 */
const _isIdentCodePoint = (cc) => _identCharTable[cc | 0] === 1;

/**
 * ASCII case-insensitive equality against a lowercase literal — avoids the
 * `toLowerCase()` allocation and matches CSS's ASCII case-insensitive keyword
 * matching. `lit` must be lowercase ASCII.
 * @param {string} s string to test
 * @param {string} lit lowercase ASCII literal to match
 * @returns {boolean} true, if `s` equals `lit` ignoring ASCII case
 */
const equalsLowerCase = (s, lit) => {
	if (s.length !== lit.length) return false;
	for (let i = 0; i < lit.length; i++) {
		let c = s.charCodeAt(i);
		if (c >= CC_UPPER_A && c <= CC_UPPER_Z) c |= 0x20;
		if (c !== lit.charCodeAt(i)) return false;
	}
	return true;
};

/**
 * Case-sensitive equality of a source range against a literal — no slice.
 * @param {string} input source
 * @param {number} start range start
 * @param {number} end range end (exclusive)
 * @param {string} lit literal to match
 * @returns {boolean} true when the range equals `lit`
 */
const rangeEquals = (input, start, end, lit) =>
	end - start === lit.length && input.startsWith(lit, start);

/**
 * ASCII case-insensitive equality of a source range against a lowercase ASCII literal — no slice.
 * @param {string} input source
 * @param {number} start range start
 * @param {number} end range end (exclusive)
 * @param {string} lit lowercase ASCII literal to match
 * @returns {boolean} true when the range equals `lit` ignoring ASCII case
 */
const rangeEqualsLowerCase = (input, start, end, lit) => {
	if (end - start !== lit.length) return false;
	for (let i = 0; i < lit.length; i++) {
		let c = input.charCodeAt(start + i);
		if (c >= CC_UPPER_A && c <= CC_UPPER_Z) c |= 0x20;
		if (c !== lit.charCodeAt(i)) return false;
	}
	return true;
};

/**
 * `s.toLowerCase()` that returns `s` itself (no allocation) when it can't
 * change — no ASCII uppercase and no non-ASCII (whose Unicode case mapping is
 * left to the real `toLowerCase`).
 * @param {string} s string
 * @returns {string} lowercased string
 */
const toLowerCaseIfNeeded = (s) => {
	for (let i = 0; i < s.length; i++) {
		const c = s.charCodeAt(i);
		if ((c >= CC_UPPER_A && c <= CC_UPPER_Z) || c > 127) return s.toLowerCase();
	}
	return s;
};

// Every ASCII uppercase letter in the tail of a name that carries one; the fold
// below is the only place either is used, and only for such a name.
const _ASCII_UPPER_RE = /[A-Z]/g;
/** @type {(one: string) => string} */
const _toAsciiLower = (one) => String.fromCharCode(one.charCodeAt(0) | 0x20);

/**
 * A name CSS matches ASCII case-insensitively — a property, at-keyword,
 * function, pseudo, media feature or unit — written lowercase, so the same name
 * is the same bytes wherever it is spelled. Only ASCII letters map, the matching
 * being ASCII-only; a name carrying an escape is written back as authored, since
 * `\G` and `\g` name different characters.
 * @param {string} s the name
 * @returns {string} it, lowercased
 */
const asciiLowerCaseName = (s) => {
	// Asked natively first: `toLowerCase` hands back the very string it was given
	// where nothing folds, so this is a pointer compare and no allocation for
	// every name in a stylesheet written in one case — which walking the
	// characters here was costing more than the fold itself.
	if (s.toLowerCase() === s) return s;
	// Something folds, but only ASCII may: `Ä` is its own character, and a name
	// whose only capital is one of those is written back as authored.
	let at = -1;
	for (let i = 0; i < s.length; i++) {
		const c = s.charCodeAt(i);
		if (c >= CC_UPPER_A && c <= CC_UPPER_Z) {
			at = i;
			break;
		}
	}
	if (at === -1) return s;
	// An escape names a character by case (`\G` is not `\g`), so a name carrying
	// one is written back as authored.
	if (s.includes("\\")) return s;
	return s.slice(0, at) + s.slice(at).replace(_ASCII_UPPER_RE, _toAsciiLower);
};

/**
 * A custom property name (`<dashed-ident>`): a `--`-prefixed identifier other than bare `--`.
 * @param {string} identifier identifier
 * @returns {boolean} true when identifier is dashed, otherwise false
 */
const isDashedIdentifier = (identifier) =>
	identifier.startsWith("--") && identifier.length >= 3;

/**
 * Consume an escaped code point.
 * @param {string} input input
 * @param {number} pos position just past the `\`
 * @returns {number} position past the escape sequence
 */
const _consumeAnEscapedCodePoint = (input, pos) => {
	// Caller has verified the `\` and the next code point form a valid
	// escape. Hex digits: consume up to 6 hex digits, then one optional
	// whitespace. Non-hex: consume one code point.
	// `\` at EOF: nothing to consume; return pos so callers don't overrun.
	if (pos >= input.length) return pos;
	const cc = input.charCodeAt(pos);
	pos++;
	if (pos === input.length) return pos;
	if (_isHexDigit(cc)) {
		for (let i = 0; i < 5; i++) {
			if (!_isHexDigit(input.charCodeAt(pos))) break;
			pos++;
		}
		const trail = input.charCodeAt(pos);
		if (_isWhiteSpace(trail)) {
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
const skipEscape = (input, pos) => _consumeAnEscapedCodePoint(input, pos + 1);

/**
 * Spec: "two code points are a valid escape" — first is `\`, second is
 * not a newline.
 * @param {string} input input
 * @param {number} pos position of the second code point
 * @param {number=} f first code point (defaults to `input.charCodeAt(pos - 1)`)
 * @param {number=} s second code point (defaults to `input.charCodeAt(pos)`)
 * @returns {boolean} true, if the two code points form a valid escape
 */
const _ifTwoCodePointsAreValidEscape = (input, pos, f, s) => {
	const first = f || input.charCodeAt(pos - 1);
	const second = s || input.charCodeAt(pos);
	if (first !== CC_REVERSE_SOLIDUS) return false;
	if (_isNewline(second)) return false;
	return true;
};

/**
 * Spec: "three code points would start an ident sequence".
 * @param {string} input input
 * @param {number} pos position
 * @param {number=} f first code point (defaults to `input.charCodeAt(pos - 1)`)
 * @param {number=} s second code point (defaults to `input.charCodeAt(pos)`)
 * @param {number=} t third code point (defaults to `input.charCodeAt(pos + 1)`)
 * @returns {boolean} true, if the three code points start an ident sequence
 */
const _ifThreeCodePointsWouldStartAnIdentSequence = (input, pos, f, s, t) => {
	const first = f || input.charCodeAt(pos - 1);
	const second = s || input.charCodeAt(pos);
	const third = t || input.charCodeAt(pos + 1);
	if (first === CC_HYPHEN_MINUS) {
		return (
			_isIdentStartCodePointCC(second) ||
			second === CC_HYPHEN_MINUS ||
			_ifTwoCodePointsAreValidEscape(input, pos, second, third)
		);
	}
	if (_isIdentStartCodePointCC(first)) return true;
	if (first === CC_REVERSE_SOLIDUS) {
		return _ifTwoCodePointsAreValidEscape(input, pos, first, second);
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
const _ifThreeCodePointsWouldStartANumber = (input, pos, f, s, t) => {
	const first = f || input.charCodeAt(pos - 1);
	const second = s || input.charCodeAt(pos);
	const third = t || input.charCodeAt(pos + 1);
	if (first === CC_PLUS_SIGN || first === CC_HYPHEN_MINUS) {
		if (_isDigit(second)) return true;
		return second === CC_FULL_STOP && _isDigit(third);
	}
	if (first === CC_FULL_STOP) return _isDigit(second);
	/* istanbul ignore next -- @preserve: spec-general; every caller passes `pos` just past a +/-/. so `first` is never a bare digit here */
	return _isDigit(first);
};

/**
 * Consume an ident sequence (no validation of the first code points).
 * @param {string} input input
 * @param {number} pos position
 * @returns {number} position just past the last ident-sequence code point
 */
const _consumeAnIdentSequence = (input, pos) => {
	// Hot loop (every ident, at-keyword, hash, function name, unit). Both checks
	// are inlined from `_isIdentCodePoint` / `_ifTwoCodePointsAreValidEscape`: the
	// ident test is a single full-range table load (no `cc < 128` branch), and the
	// escape test reads the following code point only when `cc` is a `\` (rare)
	// instead of eagerly.
	for (;;) {
		const cc = input.charCodeAt(pos) | 0;
		pos++;
		if (_identCharTable[cc] === 1) {
			continue;
		}
		if (cc === CC_REVERSE_SOLIDUS && !_isNewline(input.charCodeAt(pos))) {
			pos = _consumeAnEscapedCodePoint(input, pos);
			continue;
		}
		return pos - 1;
	}
};

/**
 * @param {number} cc char code
 * @returns {boolean} true, if cc is a non-printable code point
 */
const _isNonPrintableCodePoint = (cc) =>
	(cc >= 0x00 && cc <= 0x08) ||
	cc === 0x0b ||
	(cc >= 0x0e && cc <= 0x1f) ||
	cc === 0x7f;

/**
 * Consume the body of a number per the spec (does not classify integer
 * vs number — caller / token type handles that).
 * @param {string} input input
 * @param {number} pos position at the first numeric / sign code point
 * @returns {number} position just past the number
 */
const _consumeANumber = (input, pos) => {
	let cc = input.charCodeAt(pos);
	if (cc === CC_HYPHEN_MINUS || cc === CC_PLUS_SIGN) {
		pos++;
	}
	while (_isDigit(input.charCodeAt(pos))) pos++;
	if (
		input.charCodeAt(pos) === CC_FULL_STOP &&
		_isDigit(input.charCodeAt(pos + 1))
	) {
		pos++;
		while (_isDigit(input.charCodeAt(pos))) pos++;
	}
	cc = input.charCodeAt(pos);
	if (
		(cc === CC_LOWER_E || cc === CC_UPPER_E) &&
		(((input.charCodeAt(pos + 1) === CC_HYPHEN_MINUS ||
			input.charCodeAt(pos + 1) === CC_PLUS_SIGN) &&
			_isDigit(input.charCodeAt(pos + 2))) ||
			_isDigit(input.charCodeAt(pos + 1)))
	) {
		pos++;
		cc = input.charCodeAt(pos);
		if (cc === CC_PLUS_SIGN || cc === CC_HYPHEN_MINUS) {
			pos++;
		}
		while (_isDigit(input.charCodeAt(pos))) pos++;
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
const _consumeTheRemnantsOfABadUrl = (input, pos) => {
	for (;;) {
		if (pos === input.length) return pos;
		const cc = input.charCodeAt(pos);
		pos++;
		if (cc === CC_RIGHT_PARENTHESIS) return pos;
		if (_ifTwoCodePointsAreValidEscape(input, pos)) {
			pos = _consumeAnEscapedCodePoint(input, pos);
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
 * @property {number} type one of the `TT_*` constants
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
 * Populate `out`'s common fields and return it — the lexer functions' return
 * statement (kept tiny so V8 can inline it).
 * @param {MutableToken} out token to populate
 * @param {number} type one of the `TT_*` constants
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
	while (_wsTable[input.charCodeAt(pos)] === 1) pos++;
	return fill(out, TT_WHITESPACE, start, pos);
}

// Sticky fast-forward classes: a native run-skip over the ordinary characters of
// a string / url token, so long values (data: URIs, base64) don't cost one JS
// char read each. The negated classes match exactly the per-char terminators the
// loops below handle (quotes / backslash / newlines for strings; plus `(`, `)`,
// whitespace and non-printable code points for urls).
const _STRING_SAFE = /[^"'\\\n\r\f]+/y;
// eslint-disable-next-line no-control-regex -- url terminators include the control range and DEL (they make a bad-url)
const _URL_SAFE = /[^\u0000-\u0020\u007F"'()\\]+/y;

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
		_STRING_SAFE.lastIndex = pos;
		if (_STRING_SAFE.test(input)) pos = _STRING_SAFE.lastIndex;
		if (pos === input.length) {
			return fill(out, TT_STRING, start, pos);
		}
		const cc = input.charCodeAt(pos);
		pos++;
		if (cc === endingCodePoint) {
			return fill(out, TT_STRING, start, pos);
		}
		if (_isNewline(cc)) {
			pos--;
			return fill(out, TT_BAD_STRING_TOKEN, start, pos);
		}
		if (cc === CC_REVERSE_SOLIDUS) {
			// `\` at EOF: string ends here; emit the token so ranges cover all input.
			if (pos === input.length) return fill(out, TT_STRING, start, pos);
			if (_isNewline(input.charCodeAt(pos))) {
				const ccNl = input.charCodeAt(pos);
				pos++;
				pos = consumeExtraNewline(ccNl, input, pos);
			} else if (_ifTwoCodePointsAreValidEscape(input, pos)) {
				pos = _consumeAnEscapedCodePoint(input, pos);
			}
		}
	}
}

/**
 * `#` — hash or delim.
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
		_isIdentCodePoint(first) ||
		_ifTwoCodePointsAreValidEscape(input, pos, first, second)
	) {
		const third = input.charCodeAt(pos + 2);
		out.isId = _ifThreeCodePointsWouldStartAnIdentSequence(
			input,
			pos,
			first,
			second,
			third
		);
		pos = _consumeAnIdentSequence(input, pos);
		return fill(out, TT_HASH, start, pos);
	}
	return fill(out, TT_DELIM, start, pos);
}

/**
 * `-` — number / cdc / ident / delim.
 * @param {string} input input
 * @param {number} pos position just past `-`
 * @param {MutableToken} out token to populate
 * @returns {MutableToken | undefined} the resulting token, or undefined at EOF
 */
function consumeHyphenMinus(input, pos, out) {
	// Read the two lookahead code points once; the lead is the known `-`.
	const second = input.charCodeAt(pos);
	const third = input.charCodeAt(pos + 1);
	if (
		_ifThreeCodePointsWouldStartANumber(
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
	if (second === CC_HYPHEN_MINUS && third === CC_GREATER_THAN_SIGN) {
		return fill(out, TT_CDC, pos - 1, pos + 2);
	}
	if (
		_ifThreeCodePointsWouldStartAnIdentSequence(
			input,
			pos,
			CC_HYPHEN_MINUS,
			second,
			third
		)
	) {
		pos--;
		return consumeAnIdentLikeToken(input, pos, out);
	}
	return fill(out, TT_DELIM, pos - 1, pos);
}

/**
 * `.` — number or delim.
 * @param {string} input input
 * @param {number} pos position just past `.`
 * @param {MutableToken} out token to populate
 * @returns {MutableToken | undefined} the resulting token, or undefined at EOF
 */
function consumeFullStop(input, pos, out) {
	const start = pos - 1;
	if (_ifThreeCodePointsWouldStartANumber(input, pos)) {
		pos--;
		return consumeANumericToken(input, pos, out);
	}
	return fill(out, TT_DELIM, start, pos);
}

/**
 * `+` — number or delim.
 * @param {string} input input
 * @param {number} pos position just past `+`
 * @param {MutableToken} out token to populate
 * @returns {MutableToken | undefined} the resulting token, or undefined at EOF
 */
function consumePlusSign(input, pos, out) {
	const start = pos - 1;
	if (_ifThreeCodePointsWouldStartANumber(input, pos)) {
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
	pos = _consumeANumber(input, pos);
	const first = input.charCodeAt(pos);
	// A unit can only begin with `-`, `\`, or an ident-start code point — exactly
	// the cases where the §4 "would start an ident sequence" check can be true. For
	// a plain number (next char is whitespace / `;` / `,` / `)` / EOF, the common
	// case) skip the two lookahead reads and the call entirely.
	if (
		(first === CC_HYPHEN_MINUS ||
			first === CC_REVERSE_SOLIDUS ||
			_isIdentStartCodePointCC(first)) &&
		_ifThreeCodePointsWouldStartAnIdentSequence(
			input,
			pos,
			first,
			input.charCodeAt(pos + 1),
			input.charCodeAt(pos + 2)
		)
	) {
		out.unitStart = pos;
		pos = _consumeAnIdentSequence(input, pos);
		return fill(out, TT_DIMENSION, start, pos);
	}
	if (first === CC_PERCENTAGE) {
		return fill(out, TT_PERCENTAGE, start, pos + 1);
	}
	return fill(out, TT_NUMBER, start, pos);
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
	while (_isWhiteSpace(input.charCodeAt(pos))) pos++;
	const contentStart = pos;
	out.contentStart = contentStart;
	for (;;) {
		_URL_SAFE.lastIndex = pos;
		if (_URL_SAFE.test(input)) pos = _URL_SAFE.lastIndex;
		if (pos === input.length) {
			out.contentEnd = pos;
			return fill(out, TT_URL, fnStart, pos);
		}
		const cc = input.charCodeAt(pos);
		pos++;
		if (cc === CC_RIGHT_PARENTHESIS) {
			out.contentEnd = pos - 1;
			return fill(out, TT_URL, fnStart, pos);
		}
		if (_isWhiteSpace(cc)) {
			const end = pos - 1;
			while (_isWhiteSpace(input.charCodeAt(pos))) pos++;
			if (pos === input.length) {
				out.contentEnd = end;
				return fill(out, TT_URL, fnStart, pos);
			}
			if (input.charCodeAt(pos) === CC_RIGHT_PARENTHESIS) {
				pos++;
				out.contentEnd = end;
				return fill(out, TT_URL, fnStart, pos);
			}
			pos = _consumeTheRemnantsOfABadUrl(input, pos);
			return fill(out, TT_BAD_URL_TOKEN, fnStart, pos);
		}
		if (
			cc === CC_QUOTATION_MARK ||
			cc === CC_APOSTROPHE ||
			cc === CC_LEFT_PARENTHESIS ||
			_isNonPrintableCodePoint(cc)
		) {
			pos = _consumeTheRemnantsOfABadUrl(input, pos);
			return fill(out, TT_BAD_URL_TOKEN, fnStart, pos);
		}
		if (cc === CC_REVERSE_SOLIDUS) {
			if (_ifTwoCodePointsAreValidEscape(input, pos)) {
				pos = _consumeAnEscapedCodePoint(input, pos);
			} else {
				pos = _consumeTheRemnantsOfABadUrl(input, pos);
				return fill(out, TT_BAD_URL_TOKEN, fnStart, pos);
			}
		}
	}
}

/** Longest `url` spelling: each code point as `\` + 6 hex digits + CRLF. */
const MAX_ESCAPED_URL_LENGTH = 3 * (1 + 6 + 2);

/**
 * Whether an ident spans `url` — `\75 rl` names it too, so the unescaped value
 * decides. The gates keep every other function name off the slice.
 * @param {string} input input
 * @param {number} start ident start offset
 * @param {number} end ident end offset (exclusive)
 * @returns {boolean} true when the ident names `url`
 */
const _identNamesUrl = (input, start, end) => {
	const length = end - start;
	if (length === 3) {
		return (
			(input.charCodeAt(start) | 0x20) === CC_LOWER_U &&
			(input.charCodeAt(start + 1) | 0x20) === CC_LOWER_R &&
			(input.charCodeAt(start + 2) | 0x20) === CC_LOWER_L
		);
	}
	if (length < 4 || length > MAX_ESCAPED_URL_LENGTH) return false;
	const first = input.charCodeAt(start);
	if ((first | 0x20) !== CC_LOWER_U && first !== CC_REVERSE_SOLIDUS) {
		return false;
	}
	return equalsLowerCase(unescapeIdentifier(input.slice(start, end)), "url");
};

/**
 * Consume an ident-like token: ident / function / url / bad-url.
 * @param {string} input input
 * @param {number} pos position at the first ident-start code point
 * @param {MutableToken} out token to populate
 * @returns {MutableToken | undefined} the resulting token, or undefined at EOF
 */
function consumeAnIdentLikeToken(input, pos, out) {
	const start = pos;
	pos = _consumeAnIdentSequence(input, pos);
	if (
		input.charCodeAt(pos) === CC_LEFT_PARENTHESIS &&
		_identNamesUrl(input, start, pos)
	) {
		pos++;
		const end = pos;
		while (
			_isWhiteSpace(input.charCodeAt(pos)) &&
			_isWhiteSpace(input.charCodeAt(pos + 1))
		) {
			pos++;
		}
		if (
			input.charCodeAt(pos) === CC_QUOTATION_MARK ||
			input.charCodeAt(pos) === CC_APOSTROPHE ||
			(_isWhiteSpace(input.charCodeAt(pos)) &&
				(input.charCodeAt(pos + 1) === CC_QUOTATION_MARK ||
					input.charCodeAt(pos + 1) === CC_APOSTROPHE))
		) {
			// End at `end` (the `(`'s closer position), not `pos` — the
			// lookahead-eaten whitespace must be re-tokenized as a whitespace
			// token rather than swallowed silently. The reader resumes at
			// `token.end`, so returning `end` here does that.
			return fill(out, TT_FUNCTION, start, end);
		}
		return consumeAUrlToken(input, pos, start, out);
	}
	if (input.charCodeAt(pos) === CC_LEFT_PARENTHESIS) {
		pos++;
		return fill(out, TT_FUNCTION, start, pos);
	}
	return fill(out, TT_IDENTIFIER, start, pos);
}

/**
 * `<` — CDO or delim.
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
 * `@` — at-keyword or delim.
 * @param {string} input input
 * @param {number} pos position just past `@`
 * @param {MutableToken} out token to populate
 * @returns {MutableToken | undefined} the resulting token, or undefined at EOF
 */
function consumeCommercialAt(input, pos, out) {
	const start = pos - 1;
	if (
		_ifThreeCodePointsWouldStartAnIdentSequence(
			input,
			pos,
			input.charCodeAt(pos),
			input.charCodeAt(pos + 1),
			input.charCodeAt(pos + 2)
		)
	) {
		pos = _consumeAnIdentSequence(input, pos);
		return fill(out, TT_AT_KEYWORD, start, pos);
	}
	return fill(out, TT_DELIM, start, pos);
}

/**
 * `\` — escape starts an ident-like token, otherwise it's a delim.
 * @param {string} input input
 * @param {number} pos position just past `\`
 * @param {MutableToken} out token to populate
 * @returns {MutableToken | undefined} the resulting token, or undefined at EOF
 */
function consumeReverseSolidus(input, pos, out) {
	if (_ifTwoCodePointsAreValidEscape(input, pos)) {
		pos--;
		return consumeAnIdentLikeToken(input, pos, out);
	}
	return fill(out, TT_DELIM, pos - 1, pos);
}

// `consumeAToken` dispatch: the §4 token rules keyed by the lead code point are
// === Tokenizer lead-character dispatch (CSS Syntax Level 3 §4 "consume a token") ===
//
// `consumeAToken` selects a sub-routine from the first ("lead") code point of each
// token. The §4 rules are keyed on specific code points (`"` `#` `(` digit
// ident-start …) that sit SPARSELY across the ASCII range, so a plain `switch (cc)`
// compiles to a jump table spanning U+0009..U+007D in which the most common lead —
// an ident-start letter — is not a case and reaches its handler only after the
// digit/whitespace tests miss. `_charClass` precomputes, for every ASCII code
// point, a dense handler id (`HC_*`, 0..12) so `consumeAToken` is one array load +
// a compact 13-entry jump table and idents dispatch directly. Non-ASCII
// (cc >= 128) is always ident-start per §4, so it skips the table.
//
// Extending for a spec change: repoint the code point in the build loop below; if
// it needs a new sub-routine, add an `HC_*` id, a `case` in `consumeAToken`, and a
// row here. This list is the authoritative "which lead code point dispatches
// where" map (§4 "consume a token", step by lead code point):
//
//   HC_WHITESPACE      whitespace      U+0009 TAB  U+000A LF  U+000C FF  U+000D CR  U+0020 SPACE
//   HC_STRING          string start    U+0022 "    U+0027 '
//   HC_SINGLE          one-char token  ( ) , : ; [ ] { }   (its token type comes from `_singleTT`)
//   HC_NUMBER_SIGN     hash / delim    U+0023 #
//   HC_PLUS_SIGN       number / delim  U+002B +
//   HC_HYPHEN_MINUS    number / CDC / ident / delim   U+002D -
//   HC_FULL_STOP       number / delim  U+002E .
//   HC_LESS_THAN       CDO / delim     U+003C <
//   HC_AT_SIGN         at-keyword / delim   U+0040 @
//   HC_REVERSE_SOLIDUS escape / delim  U+005C \
//   HC_DIGIT           number          U+0030..U+0039 0-9
//   HC_IDENT           ident-like      U+0041..U+005A A-Z  U+0061..U+007A a-z  U+005F _  (plus cc >= 128)
//   HC_DELIM           anything else   -> a single <delim-token>
//
// `_singleTT[cc]` is the token type for the HC_SINGLE code points (a second table
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
// Full `charCodeAt` range so `consumeAToken` dispatches with one table load and
// no `cc < 128` branch. Every non-ASCII code point (>= 0x80) is an ident-start
// lead per §4, so those rows are seeded to `HC_IDENT`; the ASCII rows below
// overwrite 0..127 with their real class.
const _charClass = new Uint8Array(0x10000).fill(HC_IDENT, 128);
const _singleTT = new Uint8Array(128);
_singleTT[CC_LEFT_PARENTHESIS] = TT_LEFT_PARENTHESIS;
_singleTT[CC_RIGHT_PARENTHESIS] = TT_RIGHT_PARENTHESIS;
_singleTT[CC_COMMA] = TT_COMMA;
_singleTT[CC_COLON] = TT_COLON;
_singleTT[CC_SEMICOLON] = TT_SEMICOLON;
_singleTT[CC_LEFT_SQUARE] = TT_LEFT_SQUARE_BRACKET;
_singleTT[CC_RIGHT_SQUARE] = TT_RIGHT_SQUARE_BRACKET;
_singleTT[CC_LEFT_CURLY] = TT_LEFT_CURLY_BRACKET;
_singleTT[CC_RIGHT_CURLY] = TT_RIGHT_CURLY_BRACKET;
// Each ASCII code point belongs to exactly one class; HC_SINGLE is seeded from
// `_singleTT` above, the rest follow §4's lead-code-point rules, and everything
// unmatched stays the delim class (0). Keep this in sync with the table above.
for (let i = 0; i < 128; i++) {
	if (_singleTT[i] !== 0) {
		_charClass[i] = HC_SINGLE;
	} else if (_isWhiteSpace(i)) {
		_charClass[i] = HC_WHITESPACE;
	} else if (i === CC_QUOTATION_MARK || i === CC_APOSTROPHE) {
		_charClass[i] = HC_STRING;
	} else if (i === CC_NUMBER_SIGN) {
		_charClass[i] = HC_NUMBER_SIGN;
	} else if (i === CC_PLUS_SIGN) {
		_charClass[i] = HC_PLUS_SIGN;
	} else if (i === CC_HYPHEN_MINUS) {
		_charClass[i] = HC_HYPHEN_MINUS;
	} else if (i === CC_FULL_STOP) {
		_charClass[i] = HC_FULL_STOP;
	} else if (i === CC_LESS_THAN_SIGN) {
		_charClass[i] = HC_LESS_THAN;
	} else if (i === CC_AT_SIGN) {
		_charClass[i] = HC_AT_SIGN;
	} else if (i === CC_REVERSE_SOLIDUS) {
		_charClass[i] = HC_REVERSE_SOLIDUS;
	} else if (_isDigit(i)) {
		_charClass[i] = HC_DIGIT;
	} else if (_isIdentStartCodePointCC(i)) {
		_charClass[i] = HC_IDENT;
	}
	// else stays the delim class (0)
}

/**
 * Per-character dispatcher. The outer loop has already advanced past
 * the lead code point (`pos - 1` is the lead).
 * @param {string} input input
 * @param {number} pos position just past the lead code point
 * @param {number} cc the lead code point (`input.charCodeAt(pos - 1)`, already read by the caller)
 * @param {MutableToken} out token to populate
 * @returns {MutableToken | undefined} the resulting token, or undefined at EOF
 */
function consumeAToken(input, pos, cc, out) {
	// `u` / `U` would start a unicode-range token in the spec; those are not
	// produced, so they map to HC_IDENT and fall through to ident-like.
	switch (_charClass[cc]) {
		// Run of whitespace → one <whitespace-token>.
		case HC_WHITESPACE:
			return consumeSpace(input, pos, out);
		// `"` / `'` → <string-token> (or <bad-string-token> on a raw newline).
		case HC_STRING:
			return consumeAStringToken(input, pos, out);
		// One-code-point token: its type is looked up in `_singleTT` (the `(` `)`
		// `,` `:` `;` `[` `]` `{` `}` set), so all of them share this arm.
		case HC_SINGLE:
			return fill(out, _singleTT[cc], pos - 1, pos);
		// `#` → <hash-token> if an ident/escape follows, else a <delim-token>.
		case HC_NUMBER_SIGN:
			return consumeNumberSign(input, pos, out);
		// `+` → <number-token> if it starts a number, else a <delim-token>.
		case HC_PLUS_SIGN:
			return consumePlusSign(input, pos, out);
		// `-` → number / <CDC-token> (`-->`) / ident / <delim-token>.
		case HC_HYPHEN_MINUS:
			return consumeHyphenMinus(input, pos, out);
		// `.` → <number-token> if a digit follows, else a <delim-token>.
		case HC_FULL_STOP:
			return consumeFullStop(input, pos, out);
		// `<` → <CDO-token> (`<!--`), else a <delim-token>.
		case HC_LESS_THAN:
			return consumeLessThan(input, pos, out);
		// `@` → <at-keyword-token> if an ident follows, else a <delim-token>.
		case HC_AT_SIGN:
			return consumeCommercialAt(input, pos, out);
		// `\` → ident-like token if it's a valid escape, else a <delim-token>.
		case HC_REVERSE_SOLIDUS:
			return consumeReverseSolidus(input, pos, out);
		// Digit → numeric token; `pos - 1` re-includes the digit the caller passed.
		case HC_DIGIT:
			return consumeANumericToken(input, pos - 1, out);
		// Ident-start (letter / `_` / non-ASCII, incl. `u`/`U`) → ident / function /
		// url token; `pos - 1` re-includes the lead code point.
		case HC_IDENT:
			return consumeAnIdentLikeToken(input, pos - 1, out);
		default:
			// HC_DELIM. EOF is impossible here (caller guarded with the outer
			// loop's `pos < input.length` check). Anything else: a <delim-token>.
			return fill(out, TT_DELIM, pos - 1, pos);
	}
}

/**
 * Read one raw token (comment / whitespace / value token) starting at byte
 * `pos`, writing it into the caller-supplied `out` and returning `out`. The
 * token's `end` is the next read position. Returns `undefined` at end-of-input —
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
	// One-code-point token: filled without reaching the dispatch, mirroring
	// `TokenStream#next`. `/` is a delim, never HC_SINGLE, so this stays ahead of
	// the comment check.
	if (_charClass[cc] === HC_SINGLE) {
		return fill(out, _singleTT[cc], pos, pos + 1);
	}
	// Comment: `/*…*/` is yielded as a token (`TokenStream#next` steps over it).
	if (cc === CC_SOLIDUS && input.charCodeAt(pos + 1) === CC_ASTERISK) {
		const start = pos;
		// Jump to the closing `*/` in one native scan instead of a per-character
		// loop — comment bodies (license banners, source comments) can be long.
		// No close: unterminated comment runs to EOF so ranges cover all input.
		const close = input.indexOf("*/", pos + 2);
		return fill(
			out,
			TT_COMMENT,
			start,
			close === -1 ? input.length : close + 2
		);
	}
	// `consumeAToken` dispatches on the lead code point at `pos` (it expects the
	// position just past the lead and the already-read lead code point).
	return consumeAToken(input, pos + 1, cc, out);
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
 * @enum {number}
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
	// visitor can be registered (fired during tokenization — see `grammar`).
	Comment: 27,
	// NOT A SPEC NODE — a workaround. §5.4 discards input a block's contents
	// rejects; this keeps the source so minifying can't lose what the
	// unminified asset shows. Only built while printing; a walk-only parse
	// never sees one.
	Raw: 28
};
const {
	Ident: T_IDENT,
	Function: T_FUNCTION,
	AtKeyword: T_AT_KEYWORD,
	Hash: T_HASH,
	String: T_STRING,
	BadString: T_BAD_STRING,
	Url: T_URL,
	BadUrl: T_BAD_URL,
	Delim: T_DELIM,
	Number: T_NUMBER,
	Percentage: T_PERCENTAGE,
	Dimension: T_DIMENSION,
	Whitespace: T_WHITESPACE,
	Colon: T_COLON,
	Semicolon: T_SEMICOLON,
	Comma: T_COMMA,
	RightParenthesis: T_RIGHT_PARENTHESIS,
	RightSquareBracket: T_RIGHT_SQUARE_BRACKET,
	RightCurlyBracket: T_RIGHT_CURLY_BRACKET,
	CDO: T_CDO,
	CDC: T_CDC,
	SimpleBlock: T_SIMPLE_BLOCK,
	Declaration: T_DECLARATION,
	AtRule: T_AT_RULE,
	QualifiedRule: T_QUALIFIED_RULE,
	Stylesheet: T_STYLESHEET,
	Comment: T_COMMENT,
	Raw: T_RAW
} = NodeType;

/**
 * Base AST node — the property-accessor view the `parseA*` entry points return
 * (see `_makeReader`). Every concrete node carries the `[start, end)` byte
 * `range` of the source slice it covers; `loc` is computed on demand from the
 * shared `LocConverter`, so line/column conversion is only paid when a consumer
 * needs it. The concrete node typedefs below extend this via `&`.
 *
 * Inside the parser a node ref is an integer id into the columns; the reader
 * exposes this property shape over a retained snapshot of those columns.
 * @typedef {object} Node
 * @property {number} type node-type discriminator
 * @property {number} start byte offset of the node's first code point
 * @property {number} end byte offset just past the node's last code point
 * @property {[number, number]} range the `[start, end)` byte range
 * @property {{ start: { line: number, column: number }, end: { line: number, column: number } }} loc source location (1-based line, 0-based column)
 * @property {() => string} toString source slice for this node
 * @property {string} unescapedName name with CSS escapes resolved (name-bearing nodes only)
 */

/**
 * @param {string} s numeric text
 * @returns {"+" | "-" | ""} the spec sign ("" when unsigned)
 */
const _signOf = (s) => {
	const c = s.charCodeAt(0);
	return c === CC_PLUS_SIGN ? "+" : c === CC_HYPHEN_MINUS ? "-" : "";
};

/**
 * @param {string} s numeric text (no unit / `%`)
 * @returns {"integer" | "number"} the spec type flag
 */
const _typeFlagOf = (s) =>
	s.includes(".") || s.includes("e") || s.includes("E") ? "number" : "integer";

/**
 * Leaf token node (property-accessor view) — `value` is the raw source slice
 * (identifier text, quoted string including quotes, a dimension's full `123px`,
 * …; hash / at-keyword drop their `#` / `@` prefix, url uses its content range).
 * The `NumberToken` / `HashToken` / `UrlToken` / `DimensionToken` typedefs below
 * narrow the value accessors. `numericValue` / `typeFlag` / `sign` / `unit` are
 * derived from the source on read and are only meaningful on the matching token
 * type; `contentStart` / `contentEnd` mark a url token's inner content range.
 * @typedef {Node & { value: string, unescaped: string, numericValue: number, typeFlag: "integer" | "number" | "id" | "unrestricted", sign: "+" | "-" | "", unit: string, contentStart: number, contentEnd: number }} Token
 */

/**
 * Number token (`123`, `-1.5`, `+2e3`). `value` is the raw source slice (the spec's "value"); `numericValue` / `typeFlag` / `sign` are lazy getters derived from it (see `Token`).
 * @typedef {Token & { numericValue: number, typeFlag: "integer" | "number", sign: "+" | "-" | "" }} NumberToken
 */

/**
 * Percentage token (`50%`). `value` is the raw slice including `%`; `numericValue` (without `%`) and `sign` are lazy getters.
 * @typedef {Token & { numericValue: number, sign: "+" | "-" | "" }} PercentageToken
 */

/**
 * Dimension token (`100px`, `1.5em`). `value` is the raw slice (number + unit); `numericValue` / `typeFlag` / `sign` (of the numeric part) and `unit` (lower-cased) are lazy getters.
 * @typedef {Token & { numericValue: number, typeFlag: "integer" | "number", sign: "+" | "-" | "", unit: string }} DimensionToken
 */

// Spec "Assert: …" preconditions are comments only (callers satisfy them); a future `strict` option could reinstate them as throws.

/**
 * Hash token (`#foo`). `value` is the name without the leading `#`; `typeFlag` is the spec type flag ("id" when the name forms a valid `<id>` selector, "unrestricted" otherwise).
 * @typedef {Token & { typeFlag: "id" | "unrestricted" }} HashToken
 */

/**
 * Old-style unquoted URL token (`url(unquoted)`). `value` is the unquoted body;
 * `contentStart` / `contentEnd` mark the inner content range in the source.
 * @typedef {Token & { contentStart: number, contentEnd: number }} UrlToken
 */

/**
 * Function node: `name(component-values...)`. `name` is the raw source slice
 * before the `(` (callers lowercase / unescape as needed); `nameStart` / `nameEnd`
 * are its `[start, end)` byte offsets; `value` is the component values inside the parentheses.
 * @typedef {Node & { name: string, nameStart: number, nameEnd: number, value: ComponentValue[] }} FunctionNode
 */

/** @typedef {"[" | "(" | "{"} SimpleBlockToken */

/**
 * Simple block (`[...]`, `(...)` not preceded by an ident, `{...}`). `token` is
 * the opening character. `value` is the component values inside. This shape is
 * produced by `consumeASimpleBlock` (§5.4.9) and appears in preludes.
 *
 * Note: `consumeABlock` (§5.4.4) returns the parsed block's separate `decls` /
 * `rules` lists (per §5.4.5), not a SimpleBlock wrapper — see
 * `AtRule` / `QualifiedRule`'s `declarations` and `childRules` fields.
 * @typedef {Node & { token: SimpleBlockToken, value: ComponentValue[] }} SimpleBlock
 */

/**
 * A CSS component value (CSS Syntax §5.4.8): a preserved token, a function, or
 * a simple block (`Token` also covers `HashToken` / `UrlToken`).
 * @typedef {Token | FunctionNode | SimpleBlock} ComponentValue
 */

/**
 * A CSS rule — an at-rule or a qualified rule.
 * @typedef {AtRule | QualifiedRule} Rule
 */

/**
 * Declaration: `name: value [!important][;]`. `name` is the raw property-name
 * slice; `value` is the trimmed component-value list (whitespace stripped from
 * both ends); `important` records a stripped `!important`.
 * @typedef {Node & { name: string, nameStart: number, nameEnd: number, value: ComponentValue[], important: boolean }} Declaration
 */

/**
 * At-rule: `@name <prelude> ;` or `@name <prelude> { ... }`. `name` is the
 * at-keyword without the leading `@`; `prelude` is the component values up to
 * the at-rule's `;` / block / enclosing `}`. Per §5.4.2 the block is consumed
 * into separate `declarations` (a `Declaration[]`) and `childRules` (a `Rule[]`,
 * each an at-rule or qualified rule); both are `null` for a `;`-terminated
 * at-rule. `blockStart` / `blockEnd` are the `{` start / `}` end offsets
 * (webpack extension, not in spec; the spec doesn't track brace positions), or
 * `-1` / `-1` when there is no block. `range[1]` points past `}` for a block, or
 * at the `;` / `}` / EOF position otherwise (callers check the byte at `range[1]`
 * to tell them apart).
 * @typedef {Node & { name: string, nameStart: number, nameEnd: number, prelude: ComponentValue[], declarations: Declaration[] | null, childRules: Rule[] | null, blockStart: number, blockEnd: number }} AtRule
 */

/**
 * Qualified rule: `<prelude> { <block> }`. `prelude` is the component values
 * before the `{` (selectors, keyframe parameters, …); `declarations` and
 * `childRules` are the parsed `{ ... }` body (split per tabatkins/parse-css.js
 * reference impl), or both `null` when EOF was hit before `{`. `blockStart` /
 * `blockEnd` are the `{` start / `}` end offsets (webpack extension), or `-1` /
 * `-1` when there is no block.
 * @typedef {Node & { prelude: ComponentValue[], declarations: Declaration[] | null, childRules: Rule[] | null, blockStart: number, blockEnd: number }} QualifiedRule
 */

/**
 * Stylesheet (CSS Syntax §5.3.4): the result of `parseAStylesheet`. `rules`
 * holds the top-level at-rules / qualified rules (top-level declarations are
 * parse errors and never produced).
 * @typedef {Node & { rules: Rule[] }} Stylesheet
 */

// Lexer-token-type → AST-node-type map. A single `_makeLeaf` call site (vs a
// ~20-case switch with an alloc in each arm) keeps V8 on the fast monomorphic
// path — the switch form showed up as generic stubs in profiles. URL is the one
// type with extra own state, handled first.
const _ttToNodeType = new Uint8Array(27);
_ttToNodeType[TT_WHITESPACE] = T_WHITESPACE;
_ttToNodeType[TT_IDENTIFIER] = T_IDENT;
_ttToNodeType[TT_STRING] = T_STRING;
_ttToNodeType[TT_DELIM] = T_DELIM;
_ttToNodeType[TT_NUMBER] = T_NUMBER;
_ttToNodeType[TT_PERCENTAGE] = T_PERCENTAGE;
_ttToNodeType[TT_DIMENSION] = T_DIMENSION;
_ttToNodeType[TT_HASH] = T_HASH;
_ttToNodeType[TT_AT_KEYWORD] = T_AT_KEYWORD;
_ttToNodeType[TT_BAD_STRING_TOKEN] = T_BAD_STRING;
_ttToNodeType[TT_BAD_URL_TOKEN] = T_BAD_URL;
_ttToNodeType[TT_COLON] = T_COLON;
_ttToNodeType[TT_COMMA] = T_COMMA;
_ttToNodeType[TT_SEMICOLON] = T_SEMICOLON;
_ttToNodeType[TT_RIGHT_PARENTHESIS] = T_RIGHT_PARENTHESIS;
_ttToNodeType[TT_RIGHT_SQUARE_BRACKET] = T_RIGHT_SQUARE_BRACKET;
_ttToNodeType[TT_RIGHT_CURLY_BRACKET] = T_RIGHT_CURLY_BRACKET;
_ttToNodeType[TT_CDO] = T_CDO;
_ttToNodeType[TT_CDC] = T_CDC;

// === AST construction ===
// Nodes live in one struct-of-arrays node store: a node ref is an integer id
// into parallel typed-array columns, so per-node allocation is avoided entirely.
// The consume algorithms build nodes through the `_make*` / `_set*` primitives
// below, which write those columns directly. The streaming `grammar` walks each
// top-level node and recycles the columns; the `parseA*` entry points instead
// retain the columns as a snapshot and hand back property-accessor nodes over it
// (see `_makeReader`). Child lists are plain arrays of node ids in both modes.

// Active skip state (from `CssProcessOptions.skip`), applied by the grammar.
// `_skipTypes` is indexed by `NodeType` (1 = skip): drop that component-value
// leaf / container from declaration value and function-arg lists. The two
// prelude flags scan a rule's prelude without materializing its tree (url tokens
// / functions kept, so `url()` in a selector or `@import url(…)` still resolves).
// A skipped node is still tokenized (positions stay correct) but never pushed,
// so it is never walked or read — the caller must only skip what nothing reads.
// `parseA*` leave these at their no-skip defaults so they build the full tree.
const _NO_SKIP_TYPES = new Uint8Array(32);
// Shared frozen empty list for block bodies with no decls / no child rules (the
// common case — most rules carry only declarations). Every consumer reads these
// lists read-only and null-guards, so one immutable instance replaces ~one empty
// array allocation per rule; frozen so any errant push fails loud.
const _EMPTY_LIST = /** @type {Rule[]} */ (
	/** @type {unknown} */ (Object.freeze([]))
);
// `consumeABlock`'s and `consumeABlocksContentsInto`'s results, written instead
// of returned — see there. Read them immediately; the next block overwrites them.
/** @type {Declaration[]} */
let _blockDecls = /** @type {Declaration[]} */ (
	/** @type {unknown} */ (_EMPTY_LIST)
);
/** @type {Rule[]} */
let _blockRules = _EMPTY_LIST;
let _blockStart = 0;
let _blockEnd = 0;
/** @type {Declaration[]} */
let _bcDecls = /** @type {Declaration[]} */ (
	/** @type {unknown} */ (_EMPTY_LIST)
);
/** @type {Rule[]} */
let _bcRules = _EMPTY_LIST;
// Whether the block just consumed streamed: read with `_bcDecls` / `_bcRules`.
// A frame slot cannot answer this, because a block that never streamed may never
// have written one (see `_streamPublishFrame`).
let _bcStreamed = false;
/** @type {Uint8Array} */
let _skipTypes = _NO_SKIP_TYPES;
// Fast-path flag: true only when a real skip set is active, so the (dominant)
// no-skip parses pay one boolean test instead of a node-type lookup per value.
let _skipActive = false;
let _skipSelectorPrelude = false;
let _skipAtRulePrelude = false;

// Scratch content-list pool: a container's value / prelude is built in a plain
// array, then sealed into the flat value buffer by `_setValue`, which returns
// the array to the pool — so a parse allocates almost no per-list arrays. An
// abandoned (never-sealed) list simply falls out of the pool.
/** @type {Node[][]} */
const _listPool = [];
const _takeList = () =>
	_listPool.length > 0
		? /** @type {Node[]} */ (_listPool.pop())
		: /** @type {Node[]} */ ([]);

// -- struct-of-arrays store: nodes live in reused typed-array columns --
// A node ref is its integer id; fields live in parallel arrays indexed by id.
// Two reused int slots (`_aux0/1`) plus a flags byte carry the per-type
// extras; child lists hang off three object arrays. Aux slot meaning by type:
//   url:         aux0 contentStart, aux1 contentEnd
//   function:    aux0 nameEnd
//   declaration: aux0 nameEnd, flags bit0 important
//   at-rule:     aux0 nameEnd, aux1 blockStart (blockEnd == end)
//   qualified:   aux1 blockStart (blockEnd == end)
// `name` / `nameStart` / a simple block's `token` are derived from the source
// on read (see the accessors), so they need no slot. A node's main content
// (value | prelude | stylesheet rules) is a `_flat` span (see below).
// `grammar` resets `_nodeCount` to 0 after each top-level rule's walk, so the
// buffers are reused across rules and the parse allocates almost nothing.
let _capacity = 0;
let _nodeCount = 0;
let _types = new Uint8Array(0);
let _starts = new Int32Array(0);
let _ends = new Int32Array(0);
let _aux0 = new Int32Array(0);
let _aux1 = new Int32Array(0);
let _flags = new Uint8Array(0);
// Content-list spans: a container's value / prelude is `_flat[start, start+len)`
// (node refs), recycled per top-level rule like the node columns.
let _listStarts = new Int32Array(0);
let _listLens = new Int32Array(0);
let _flat = new Int32Array(0);
let _flatTop = 0;
// Peak usage of the current parse, and use-once regrow hints: after an
// over-capacity shrink the next grow jumps straight back to the previous
// parse's peak (one exact-fit allocation instead of re-doubling up).
let _peak = 0;
let _flatPeak = 0;
let _growHint = 0;
let _flatGrowHint = 0;

/** @param {number} need minimum flat-buffer capacity */
const _flatGrow = (need) => {
	let cap = _flat.length || 4096;
	if (_flatGrowHint > cap) cap = _flatGrowHint;
	_flatGrowHint = 0;
	while (cap < need) cap *= 2;
	const next = new Int32Array(cap);
	next.set(_flat);
	_flat = next;
};
// Rule bodies live behind an id-indexed Int32 column holding `1 + index` into
// two dense append-only arrays (0 = no body): scattered id-indexed stores on a
// plain array degrade it to dictionary elements on large non-recycling parses.
// Reassigned (not mutated) when a `parseA*` parse hands its columns to a
// retained snapshot, so the next parse starts on fresh arrays.
let _bodyIdx = new Int32Array(0);
/** @type {Node[][]} */
let _declBodies = [];
/** @type {Node[][]} */
let _ruleBodies = [];
let _input = "";
// Where a comment the source never closed opened, or -1. §4.3.2 runs one to
// EOF, so at most one is open and only a span reaching the end sits inside it.
let _openCommentStart = -1;
let _locConverter = /** @type {LocConverter} */ (/** @type {unknown} */ (null));

// Node refs are integers here but typed `Node` across the parser; these are
// identity casts that just satisfy the type system at the boundary.
/** @type {(n: Node) => number} */
const _nodeIndex = (n) => /** @type {number} */ (/** @type {unknown} */ (n));
/** @type {(i: number) => Node} */
const _nodeRef = (i) => /** @type {Node} */ (/** @type {unknown} */ (i));

/** @param {number} need minimum capacity */
const _grow = (need) => {
	let cap = _capacity || 4096;
	if (_growHint > cap) cap = _growHint;
	_growHint = 0;
	while (cap < need) cap *= 2;
	const ty = new Uint8Array(cap);
	ty.set(_types);
	_types = ty;
	const st = new Int32Array(cap);
	st.set(_starts);
	_starts = st;
	const en = new Int32Array(cap);
	en.set(_ends);
	_ends = en;
	const a0 = new Int32Array(cap);
	a0.set(_aux0);
	_aux0 = a0;
	const a1 = new Int32Array(cap);
	a1.set(_aux1);
	_aux1 = a1;
	const fl = new Uint8Array(cap);
	fl.set(_flags);
	_flags = fl;
	const ls = new Int32Array(cap);
	ls.set(_listStarts);
	_listStarts = ls;
	const ll = new Int32Array(cap);
	ll.set(_listLens);
	_listLens = ll;
	const bi = new Int32Array(cap);
	bi.set(_bodyIdx);
	_bodyIdx = bi;
	_capacity = cap;
};
/** @type {(type: number, start: number, end: number) => Node} */
const _makeLeaf = (type, start, end) => {
	// Ids are 1-based: a node ref is used in truthiness checks (`if (!parent)`),
	// so 0 must stay reserved for "no node".
	// Leaves never read the flag / list slots — `_makeContainer` clears
	// them instead, keeping the dominant leaf allocation at three writes.
	const i = _nodeCount + 1;
	if (i >= _capacity) _grow(i + 1);
	_types[i] = type;
	_starts[i] = start;
	_ends[i] = end;
	_nodeCount = i;
	return _nodeRef(i);
};
/** @type {(type: number, start: number, end: number) => Node} */
const _makeContainer = (type, start, end) => {
	const r = _makeLeaf(type, start, end);
	const i = _nodeIndex(r);
	_flags[i] = 0;
	// Clear the content-span length so a reused id never exposes a previous
	// node's children (content lists are flat spans, so zeroing the length
	// suffices). `blockStart` (aux1) is NOT defaulted here: only at-rules and
	// qualified rules carry a block, and they set it on every return path
	// (`_setBlock`, or `-1` for the no-block forms). `blockEnd` is not stored — a
	// block rule's `end` is its `blockEnd` (see `_setBlock`), else it is `-1`.
	_listLens[i] = 0;
	// The body slot is read only for rules (the walk guards on type), so only
	// rules clear it — a recycled id must never expose a previous rule's body.
	if (type === T_AT_RULE || type === T_QUALIFIED_RULE) {
		_bodyIdx[i] = 0;
	}
	return r;
};
// Raw token value (the lazy `Token.value` form): hash / at-keyword drop their
// one-char prefix, url uses its content range. Shared by the parser's
// mid-parse reads and the accessor.
/**
 * @param {number} i node id
 * @returns {string} raw token value
 */
const _valueOf = (i) => {
	const ty = _types[i];
	if (ty === T_HASH || ty === T_AT_KEYWORD) {
		return _input.slice(_starts[i] + 1, _ends[i]);
	}
	if (ty === T_URL) return _input.slice(_aux0[i], _aux1[i]);
	return _input.slice(_starts[i], _ends[i]);
};
// Module-level constants (not per-parse closures), so each consume-algorithm
// call site keeps one function identity and stays monomorphic.
/** @type {(start: number, end: number, contentStart: number, contentEnd: number) => Node} */
const _makeUrl = (start, end, cs, ce) => {
	const r = _makeLeaf(T_URL, start, end);
	_aux0[_nodeIndex(r)] = cs;
	_aux1[_nodeIndex(r)] = ce;
	return r;
};
/** @type {(start: number) => Node} */
const _makeStylesheet = (start) => _makeContainer(T_STYLESHEET, start, start);
// Workaround node (see `NodeType.Raw`), trimmed of the whitespace the block's
// own separators already cover; an all-whitespace span yields no node.
/** @type {(start: number, end: number) => Node | undefined} */
const _makeRaw = (start, end) => {
	let from = start;
	let to = end;
	while (from < to && _isWhiteSpace(_input.charCodeAt(to - 1))) to--;
	while (from < to && _isWhiteSpace(_input.charCodeAt(from))) from++;
	return from === to ? undefined : _makeLeaf(T_RAW, from, to);
};
// name / nameStart are derived from start + nameEnd; only nameEnd is stored.
/** @type {(r: Node, nameStart: number, nameEnd: number) => void} */
const _setName = (r, ns, ne) => {
	_aux0[_nodeIndex(r)] = ne;
};
/** @type {(r: Node, v: number) => void} */
const _setEnd = (r, v) => {
	_ends[_nodeIndex(r)] = v;
};
// `blockEnd` is not stored: for a block rule the parser sets `end` to the
// block end right after this (so `A.blockEnd` reads `end`); a `-1` blockStart
// marks the no-block forms, where `blockEnd` derives to `-1`.
/** @type {(r: Node, blockStart: number) => void} */
const _setBlock = (r, bs) => {
	_aux1[_nodeIndex(r)] = bs;
};
/** @type {(r: Node) => void} */
const _setImportant = (r) => {
	_flags[_nodeIndex(r)] |= 1;
};
// A simple block's token is derived from its opening char on read.
/** @type {(r: Node, ch: SimpleBlockToken) => void} */
const _setToken = (r, ch) => {};
/** @type {(r: Node, list: Node[]) => void} */
const _setValue = (r, list) => {
	// Seal the finished list: copy its refs into the flat buffer and hand the
	// scratch array back to the pool. The caller never touches `list` again.
	const len = list.length;
	// Empty seal (common in non-modules skip mode, where value/prelude leaves are
	// dropped): `_makeContainer` already left `_listLens` at 0, so skip the flat
	// writes entirely and just recycle the scratch array.
	if (len !== 0) {
		const i = _nodeIndex(r);
		const start = _flatTop;
		if (start + len > _flat.length) _flatGrow(start + len);
		for (let k = 0; k < len; k++) {
			_flat[start + k] = _nodeIndex(list[k]);
		}
		_flatTop = start + len;
		_listStarts[i] = start;
		_listLens[i] = len;
		// Emptied by popping, not `length = 0`: the latter drops the array's
		// backing store, so every pooled list reallocates one on its next push.
		for (let k = len; k > 0; k--) list.pop();
	}
	_listPool.push(list);
};
/** @type {(r: Node, decls: Node[], childRules: Node[]) => void} */
const _setBody = (r, decls, childRules) => {
	_bodyIdx[_nodeIndex(r)] = _declBodies.length + 1;
	_declBodies.push(decls);
	_ruleBodies.push(childRules);
};
/** @type {(r: Node) => number} */
const _nodeTypeOf = (r) => _types[_nodeIndex(r)];
/** @type {(r: Node) => number} */
const _nodeStartOf = (r) => _starts[_nodeIndex(r)];
/** @type {(r: Node) => string} */
const _nodeValueOf = (r) => _valueOf(_nodeIndex(r));
/** @type {(r: Node) => SimpleBlockToken} */
const _nodeTokenOf = (r) =>
	/** @type {SimpleBlockToken} */ (_input[_starts[_nodeIndex(r)]]);
// A container's value, a rule's prelude, and a stylesheet's rules all seal into
// the one content-list writer, so `_setPrelude` / `_setRules` are named views of
// `_setValue` that keep the consume algorithms reading in spec terms.
const _setPrelude = _setValue;
const _setRules = _setValue;

/**
 * Start a parse into the store: point it at this source, reset the node /
 * flat cursors so nodes accumulate from id 1, and clear skip state (`grammar`
 * sets its own afterwards; `parseA*` leave it off to build the full tree).
 * @param {string} input source
 * @param {LocConverter} lc loc converter
 */
const _setupParse = (input, lc) => {
	_input = input;
	_openCommentStart = -1;
	_locConverter = lc;
	_nodeCount = 0;
	_flatTop = 0;
	_skipTypes = _NO_SKIP_TYPES;
	_skipActive = false;
	_skipSelectorPrelude = false;
	_skipAtRulePrelude = false;
	// Only `grammar` re-enables it (after this call); the standalone `parseA*`
	// entry points never print, so they must not inherit a previous parse's flag.
	_printing = false;
	// A visitor throw mid-value can leave the flag set; never carry it over.
	_inValue = false;
	_inSupportsPrelude = false;
	_inMediaConditionPrelude = false;
	_inPropertyRule = false;
	_inFunctionRule = false;
	_inFeatureValuesRule = false;
	_inCustomProperty = false;
	_inSubstitutedValue = false;
	_inGradient = false;
	_substitutionSpanFrom = -1;
	_substitutionSpanTo = -1;
	_substitutionSpanHas = false;
	_mathFunctionDepth = 0;
	_steppedFunctionDepth = 0;
	_convertLengthUnits = false;
	_transforms = _DEFAULT_TRANSFORMS;
	_commentsKept = "some";
	_rewriteCustomProperties = false;
	_unitScale = ABSOLUTE_UNIT_SCALE;
	// Back to what the module loads with, so no parse inherits a target of its own.
	_hexAlphaAllowed = true;
	_doublePositionAllowed = true;
	_insetShorthandAllowed = true;
	_rangeSpellingAllowed = true;
	_placeShorthandAllowed = true;
	// Only a stylesheet naming one has an empty rule worth keeping, and a match
	// inside a comment or a string costs those bytes rather than changing meaning.
	_namespacePrologueOpen = NAMESPACE_AT_RULE_RE.test(input);
	_overflowTwoValuesAllowed = true;
	_valueDeclaration = null;
	_keywordOnlyFor = null;
	_keywordOnly = false;
};

/**
 * Materialize a single non-block, non-function lexer token as its leaf AST node — the spec's "consume a token" result (§5.4.8 "anything else"), preserving stray closers / CDO / CDC.
 * @param {MutableToken} t token from the lexer
 * @returns {Node} the leaf token node
 */
const tokenToNode = (t) => {
	const tt = t.type;
	// URL is the only leaf with own state (its content range); all others are a
	// plain leaf whose node type comes from the map.
	if (tt === TT_URL) {
		const ut = /** @type {CssUrlToken} */ (t);
		return _makeUrl(t.start, t.end, ut.contentStart, ut.contentEnd);
	}
	return _makeLeaf(_ttToNodeType[tt], t.start, t.end);
};

/**
 * Position-based view over the lexer — webpack's stand-in for the spec's
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
 * re-tokenizes the rewound span — comment tokens are filtered here and fire
 * `onComment` once each, tracked by a monotonic high-water mark so a
 * re-tokenized span never re-fires them.
 *
 * `SourceProcessor` is handed this class (not an instance) and threads it to
 * the grammar, so a different language can drive the same visitor machinery by
 * swapping the tokenizer — the per-token `readToken` primitive — for its own.
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
		locConverter = new LocConverter(input),
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
		// Single reused token the lexer writes into on the `next` path — see
		// `MutableToken`. `_hasNext` marks it cached — a boolean instead of an
		// object slot, so caching a token never pays a GC write barrier.
		/** @type {MutableToken} */
		this._tok = createToken();
		/** @type {boolean} whether `_tok` holds the (lazily tokenized) next token */
		this._hasNext = false;
		/** @type {number[]} byte offsets to rewind to */
		this._marks = [];
	}

	/**
	 * The next token (CSS Syntax §3 "next token") — the upcoming token without
	 * consuming it; the `<eof-token>` once the source is exhausted. This is the
	 * token the consume algorithms dispatch on (the spec's "process"). Tokenized
	 * from `_pos` on first use and cached until consumed; comment tokens are
	 * skipped here, firing `onComment` once each.
	 * @returns {MutableToken} the next token
	 */
	next() {
		if (!this._hasNext) {
			const input = this.input;
			const tok = this._tok;
			let pos = this._pos;
			for (;;) {
				const t = readToken(input, pos, tok);
				if (t === undefined) {
					fill(tok, TT_EOF, input.length, input.length);
					break;
				}
				if (t.type === TT_COMMENT) {
					// A closed comment is `/**/` at the shortest; anything else running to
					// the end never closed, and the printer writes its `*/` back.
					if (
						t.end === input.length &&
						(t.end - t.start < 4 ||
							input.charCodeAt(t.end - 2) !== CC_ASTERISK ||
							input.charCodeAt(t.end - 1) !== CC_SOLIDUS)
					) {
						_openCommentStart = t.start;
					}
					if (t.start >= this._commentHigh) {
						if (this._onComment) this._onComment(input, t.start, t.end);
						this._commentHigh = t.end;
					}
					pos = t.end;
					continue;
				}
				break;
			}
			this._hasNext = true;
		}
		return this._tok;
	}

	/**
	 * Consume a token (CSS Syntax §3 "consume a token") — return the next token
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
	 * Discard a token (CSS Syntax §3 "discard a token") — advance the cursor past
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
	 * token is not the `<eof-token>` — the hot "peek, decide, advance" sites where
	 * both always hold. Callers that can't guarantee a non-EOF cached token use
	 * `consume` / `discard` instead.
	 * @returns {void}
	 */
	advance() {
		this._pos = this._tok.end;
		this._hasNext = false;
	}

	/**
	 * Mark (CSS Syntax §3 "mark") — push the current cursor position.
	 * @returns {void}
	 */
	mark() {
		this._marks.push(this._pos);
	}

	/**
	 * Restore a mark (CSS Syntax §3 "restore a mark") — pop the last mark and
	 * rewind the cursor to it. The rewound span is re-tokenized on the next read;
	 * already-fired comments are not re-fired (`_commentHigh`).
	 * @returns {void}
	 */
	restoreMark() {
		this._pos = /** @type {number} */ (this._marks.pop());
		this._hasNext = false;
	}

	/**
	 * Discard a mark (CSS Syntax §3 "discard a mark") — pop without rewinding.
	 * @returns {void}
	 */
	discardMark() {
		this._marks.pop();
	}
}

/**
 * Normalize a `parse*` entry point's first argument into a `TokenStream`
 * (CSS Syntax §9 "normalize into a token stream"). An existing `TokenStream`
 * is returned as-is (consumed from its current position — it already carries
 * the shared `LocConverter` and comment hook), so `pos` / `onComment` are
 * ignored. A raw source string is tokenized from `pos` with a fresh
 * `LocConverter`; pass a `TokenStream` instead to share one converter across
 * sub-parses.
 * @param {string | TokenStream} input source string or an existing stream
 * @param {number=} pos start byte offset (string input only; default `0`)
 * @param {((input: string, start: number, end: number) => number)=} onComment comment callback (string input only)
 * @returns {TokenStream} the stream to consume from
 */
const normalizeIntoTokenStream = (input, pos, onComment) =>
	input instanceof TokenStream
		? input
		: new TokenStream(input, pos || 0, new LocConverter(input), onComment);

// === Parser entry points (CSS Syntax Level 3 §5.3) ===
// Each `parseA*` is a thin public wrapper over a `consumeA*` algorithm
// (§5.4): it takes raw source + a start position (webpack's stand-in for
// the spec's "normalize into a token stream") and runs the matching
// consume algorithm. The split mirrors tabatkins/parse-css — `parse*`
// are the documented entry points, `consume*` are the internal
// algorithms that drive the tokenizer.

/**
 * @typedef {object} ParseOptions
 * @property {((input: string, start: number, end: number) => number)=} comment optional comment-token callback; the public `parse*` entry points use it to build the `TokenStream` so the outer parser's comment tracker still sees magic comments inside the consumed range
 */

// === parseA* retained store + property-accessor readers ===
// `grammar` recycles the columns per top-level rule, but the `parseA*` entry
// points must hand back a tree that outlives the parse. Each `parseA*` run parses
// into the columns without recycling, then `_finishStore` hands them to a
// snapshot object and resets the module columns to fresh arrays so the next parse
// can't clobber it. Nodes are exposed as `parseA*` readers: plain objects sharing
// one module-level prototype whose getters index the reader's own snapshot by node
// id — no per-node class, no eager string slices, child readers built lazily on
// access. A single shared prototype (rather than one per store) keeps the readers
// monomorphic across parses, so `_readerAt` and every getter stay on the fast path.

/**
 * @typedef {object} NodeReader
 * @property {NodeStore} _store snapshot this reader indexes
 * @property {number} _i node id into the snapshot columns
 * @property {number} type node type
 * @property {number} start start offset
 * @property {number} end end offset
 * @property {[number, number]} range start / end offsets
 * @property {{ start: { line: number, column: number }, end: { line: number, column: number } }} loc source location
 * @property {() => string} toString source slice
 * @property {string | ComponentValue[]} value token value (leaf) or component-value list (function / block / declaration)
 * @property {string} unescaped unescaped token value
 * @property {number} numericValue parsed numeric value
 * @property {"integer" | "number" | "id" | "unrestricted"} typeFlag spec type flag
 * @property {"+" | "-" | ""} sign spec sign
 * @property {string} unit dimension unit (lower-cased)
 * @property {number} contentStart url content start offset
 * @property {number} contentEnd url content end offset
 * @property {string} name rule / declaration / function name
 * @property {number} nameStart name start offset
 * @property {number} nameEnd name end offset
 * @property {string} unescapedName unescaped name
 * @property {ComponentValue[]} prelude rule prelude
 * @property {Declaration[] | null} declarations block declarations
 * @property {Rule[] | null} childRules block child rules
 * @property {number} blockStart `{` start offset
 * @property {number} blockEnd `}` end offset
 * @property {boolean} important `!important` flag
 * @property {SimpleBlockToken} token simple-block opening char
 * @property {Rule[]} rules stylesheet rules
 */

/**
 * @typedef {object} NodeStore
 * @property {string} input source
 * @property {LocConverter} lc loc converter
 * @property {Uint8Array} types node-type column
 * @property {Int32Array} starts start-offset column
 * @property {Int32Array} ends end-offset column
 * @property {Int32Array} aux0 aux slot 0
 * @property {Int32Array} aux1 aux slot 1
 * @property {Uint8Array} flags flags column
 * @property {Int32Array} listStarts content-span start column
 * @property {Int32Array} listLens content-span length column
 * @property {Int32Array} flat flat node-ref buffer
 * @property {Int32Array} bodyIdx per-node `1 + body index` (0 = no body)
 * @property {Node[][]} declBodies dense per-body declaration lists
 * @property {Node[][]} ruleBodies dense per-body child-rule lists
 */

// Shared frozen empty list for a block body with no declarations / child rules,
// so equal-empty reads return one reference (mirrors `_EMPTY_LIST`).
const _READER_EMPTY = /** @type {Rule[]} */ (
	/** @type {unknown} */ (Object.freeze([]))
);

/**
 * Raw token value over a snapshot (the lazy `Token.value` form): hash / at-keyword
 * drop their one-char prefix, url uses its content range.
 * @param {NodeStore} store snapshot
 * @param {number} i node id
 * @returns {string} raw token value
 */
const _storeValueOf = (store, i) => {
	const ty = store.types[i];
	if (ty === T_HASH || ty === T_AT_KEYWORD) {
		return store.input.slice(store.starts[i] + 1, store.ends[i]);
	}
	if (ty === T_URL) return store.input.slice(store.aux0[i], store.aux1[i]);
	return store.input.slice(store.starts[i], store.ends[i]);
};

/**
 * @param {NodeStore} store snapshot
 * @param {number} i node id
 * @returns {Node} reader over node `i`
 */
const _readerAt = (store, i) => {
	const o = Object.create(NODE_READER_PROTO);
	o._store = store;
	o._i = i;
	return /** @type {Node} */ (o);
};

/**
 * Readers over a container's flat content span (value / prelude / rules).
 * @param {NodeStore} store snapshot
 * @param {number} i container id
 * @returns {Node[]} child readers
 */
const _readList = (store, i) => {
	const s = store.listStarts[i];
	const len = store.listLens[i];
	const flat = store.flat;
	/** @type {Node[]} */
	const out = [];
	for (let k = 0; k < len; k++) out.push(_readerAt(store, flat[s + k]));
	return out;
};

/**
 * Readers over a node-id list (declarations / child rules).
 * @param {NodeStore} store snapshot
 * @param {Node[]} list node-id list
 * @returns {Node[]} child readers
 */
const _readRefList = (store, list) => {
	/** @type {Node[]} */
	const out = [];
	for (let k = 0; k < list.length; k++) {
		out.push(_readerAt(store, _nodeIndex(list[k])));
	}
	return out;
};

// Module-level reader prototype shared by every `parseA*` reader. Getters index
// the reader's own `_store` snapshot by its `_i` node id; because the prototype is
// created once (not per store), all readers share one hidden map and stay
// monomorphic across parses.
const NODE_READER_PROTO = /** @type {NodeReader} */ ({
	_store: /** @type {NodeStore} */ (/** @type {unknown} */ (null)),
	_i: 0,
	get type() {
		return this._store.types[this._i];
	},
	get start() {
		return this._store.starts[this._i];
	},
	get end() {
		return this._store.ends[this._i];
	},
	get range() {
		const store = this._store;
		const i = this._i;
		return /** @type {[number, number]} */ ([store.starts[i], store.ends[i]]);
	},
	get loc() {
		const store = this._store;
		const i = this._i;
		const lc = store.lc;
		// `LocConverter#get` mutates and returns itself, so snapshot the first.
		const s = lc.get(store.starts[i]);
		const sl = s.line;
		const sc = s.column;
		const e = lc.get(store.ends[i]);
		return {
			start: { line: sl, column: sc },
			end: { line: e.line, column: e.column }
		};
	},
	toString() {
		const store = this._store;
		const i = this._i;
		return store.input.slice(store.starts[i], store.ends[i]);
	},
	get value() {
		const store = this._store;
		const i = this._i;
		const ty = store.types[i];
		// function / simple-block / declaration expose their component-value
		// list; every leaf token exposes its raw string value.
		return ty === T_FUNCTION || ty === T_SIMPLE_BLOCK || ty === T_DECLARATION
			? /** @type {ComponentValue[]} */ (_readList(store, i))
			: _storeValueOf(store, i);
	},
	get unescaped() {
		const store = this._store;
		const i = this._i;
		const v = _storeValueOf(store, i);
		return store.types[i] === T_STRING
			? unescapeIdentifier(v.slice(1, -1))
			: unescapeIdentifier(v);
	},
	get numericValue() {
		const store = this._store;
		const i = this._i;
		const v = _storeValueOf(store, i);
		if (store.types[i] === T_DIMENSION) {
			return Number(v.slice(0, _consumeANumber(v, 0)));
		}
		if (store.types[i] === T_PERCENTAGE) return Number(v.slice(0, -1));
		return Number(v);
	},
	get typeFlag() {
		const store = this._store;
		const i = this._i;
		if (store.types[i] === T_HASH) {
			const input = store.input;
			const p = store.starts[i] + 1;
			return _ifThreeCodePointsWouldStartAnIdentSequence(
				input,
				p,
				input.charCodeAt(p),
				input.charCodeAt(p + 1),
				input.charCodeAt(p + 2)
			)
				? "id"
				: "unrestricted";
		}
		const v = _storeValueOf(store, i);
		return _typeFlagOf(
			store.types[i] === T_DIMENSION ? v.slice(0, _consumeANumber(v, 0)) : v
		);
	},
	get sign() {
		return _signOf(_storeValueOf(this._store, this._i));
	},
	get unit() {
		const v = _storeValueOf(this._store, this._i);
		return v.slice(_consumeANumber(v, 0)).toLowerCase();
	},
	get contentStart() {
		return this._store.aux0[this._i];
	},
	get contentEnd() {
		return this._store.aux1[this._i];
	},
	get name() {
		const store = this._store;
		const i = this._i;
		// An at-rule's name skips its `@`; others start at the node.
		return store.types[i] === T_AT_RULE
			? store.input.slice(store.starts[i] + 1, store.aux0[i])
			: store.input.slice(store.starts[i], store.aux0[i]);
	},
	get nameStart() {
		return this._store.starts[this._i];
	},
	get nameEnd() {
		return this._store.aux0[this._i];
	},
	get unescapedName() {
		return unescapeIdentifier(this.name);
	},
	get prelude() {
		return /** @type {ComponentValue[]} */ (_readList(this._store, this._i));
	},
	get declarations() {
		const store = this._store;
		// Only rules populate the body slot (see `_makeContainer`); 0 means no
		// block — same `null` contract as before.
		const bi = store.bodyIdx[this._i];
		if (bi === 0) return null;
		const list = store.declBodies[bi - 1];
		return /** @type {Declaration[]} */ (
			list.length > 0 ? _readRefList(store, list) : _READER_EMPTY
		);
	},
	get childRules() {
		const store = this._store;
		const bi = store.bodyIdx[this._i];
		if (bi === 0) return null;
		const list = store.ruleBodies[bi - 1];
		return /** @type {Rule[]} */ (
			list.length > 0 ? _readRefList(store, list) : _READER_EMPTY
		);
	},
	get blockStart() {
		return this._store.aux1[this._i];
	},
	get blockEnd() {
		const store = this._store;
		const i = this._i;
		return store.aux1[i] !== -1 ? store.ends[i] : -1;
	},
	get important() {
		return (this._store.flags[this._i] & 1) !== 0;
	},
	get token() {
		const store = this._store;
		return /** @type {SimpleBlockToken} */ (store.input[store.starts[this._i]]);
	},
	get rules() {
		return /** @type {Rule[]} */ (_readList(this._store, this._i));
	}
});

/**
 * Hand the node columns back: each is replaced by an empty view, so what this
 * parse grew is collectable and every column goes together — one place to add
 * a new one to, rather than two that have to agree.
 * @returns {void}
 */
const _releaseColumns = () => {
	_types = new Uint8Array(0);
	_starts = new Int32Array(0);
	_ends = new Int32Array(0);
	_aux0 = new Int32Array(0);
	_aux1 = new Int32Array(0);
	_flags = new Uint8Array(0);
	_listStarts = new Int32Array(0);
	_listLens = new Int32Array(0);
	_bodyIdx = new Int32Array(0);
};

/**
 * Hand the module's live columns to a retained snapshot, then reset the
 * module columns to fresh empty arrays so the next parse starts clean and can't
 * mutate this store. Called once per `parseA*` after all consuming is done.
 * @returns {NodeStore} the retained snapshot
 */
const _finishStore = () => {
	/** @type {NodeStore} */
	const store = {
		input: _input,
		lc: _locConverter,
		types: _types,
		starts: _starts,
		ends: _ends,
		aux0: _aux0,
		aux1: _aux1,
		flags: _flags,
		listStarts: _listStarts,
		listLens: _listLens,
		flat: _flat,
		bodyIdx: _bodyIdx,
		declBodies: _declBodies,
		ruleBodies: _ruleBodies
	};
	// Carry this parse's size forward as a one-shot grow hint so the next parse
	// allocates its columns once instead of re-doubling from scratch (node ids
	// are 1-based, so `+1`).
	_growHint = _nodeCount + 1;
	_flatGrowHint = _flatTop;
	// Reset module state — the columns now belong to `store`.
	_capacity = 0;
	_nodeCount = 0;
	_flatTop = 0;
	_releaseColumns();
	_flat = new Int32Array(0);
	_declBodies = [];
	_ruleBodies = [];
	_listPool.length = 0;
	_input = "";
	_locConverter = /** @type {LocConverter} */ (/** @type {unknown} */ (null));
	return store;
};

/**
 * Finish the parse and wrap one consumed node ref as a `parseA*` reader, keeping
 * the caller's node type.
 * @template {Node} T
 * @param {T} ref consumed node ref
 * @returns {T} reader over the retained snapshot
 */
const _finishOne = (ref) =>
	/** @type {T} */ (_readerAt(_finishStore(), _nodeIndex(ref)));

/**
 * Parse a stylesheet, CSS Syntax Level 3
 * [§5.3.4](https://drafts.csswg.org/css-syntax/#parse-stylesheet).
 * @param {string | TokenStream} input source string or an existing token stream
 * @param {number=} pos start position (string input only)
 * @param {ParseOptions=} options optional comment-token callback (string input only)
 * @returns {Stylesheet} the parsed stylesheet
 */
const parseAStylesheet = (input, pos = 0, options = {}) => {
	// 1. If input is a byte stream for a stylesheet, decode bytes from input, and set input to the result.
	// 2. Normalize input, and set input to the result.
	const ts = normalizeIntoTokenStream(input, pos, options.comment);
	_setupParse(ts.input, ts.locConverter);
	// 3. Create a new stylesheet, with its location set to location (or null, if location was not passed).
	const start = ts.next().start;
	const stylesheet = _makeStylesheet(start);
	// 4. Consume a stylesheet's contents from input, and set the stylesheet's rules to the result.
	_setRules(stylesheet, consumeAStylesheetsContents(ts));
	_setEnd(stylesheet, ts.next().start);
	// 5. Return the stylesheet.
	return /** @type {Stylesheet} */ (
		_readerAt(_finishStore(), _nodeIndex(stylesheet))
	);
};

/**
 * Parse a stylesheet's contents, CSS Syntax Level 3
 * [§5.3.5](https://drafts.csswg.org/css-syntax/#parse-stylesheets-contents) —
 * the top-level rule list via `consumeAStylesheetsContents` (§5.4.1): top-level
 * declarations are parse errors (never produced) and top-level CDO (`<!--`) /
 * CDC (`-->`) tokens are discarded.
 * @param {string | TokenStream} input source string or an existing token stream
 * @param {number=} pos start position (string input only)
 * @param {ParseOptions=} options optional comment-token callback (string input only)
 * @returns {Rule[]} top-level rules
 */
const parseAStylesheetsContents = (input, pos = 0, options = {}) => {
	// 1. Normalize input, and set input to the result.
	const ts = normalizeIntoTokenStream(input, pos, options.comment);
	_setupParse(ts.input, ts.locConverter);
	// 2. Consume a stylesheet’s contents from input, and return the result.
	const rules = consumeAStylesheetsContents(ts);
	const store = _finishStore();
	return /** @type {Rule[]} */ (_readRefList(store, rules));
};

/**
 * Parse a block's contents, CSS Syntax Level 3
 * [§5.3.6](https://drafts.csswg.org/css-syntax/#parse-block-contents).
 * @param {string | TokenStream} input source string or an existing token stream
 * @param {number=} pos start position (string input only; just past the opening `{`, or 0)
 * @param {ParseOptions=} options optional comment-token callback (string input only)
 * @returns {{ decls: Declaration[], rules: Rule[] }} block decls + rules
 */
const parseABlocksContents = (input, pos = 0, options = {}) => {
	// 1. Normalize input, and set input to the result.
	const ts = normalizeIntoTokenStream(input, pos, options.comment);
	_setupParse(ts.input, ts.locConverter);
	// 2. Consume a block’s contents from input, and return the result.
	const { decls, rules } = consumeABlocksContents(ts);
	const store = _finishStore();
	return {
		decls: /** @type {Declaration[]} */ (_readRefList(store, decls)),
		rules:
			rules.length > 0
				? /** @type {Rule[]} */ (_readRefList(store, rules))
				: _READER_EMPTY
	};
};

/**
 * Parse a rule, CSS Syntax Level 3
 * [§5.3.7](https://drafts.csswg.org/css-syntax/#parse-rule) — discards leading
 * whitespace, consumes one at-rule / qualified rule, and requires only trailing
 * whitespace; `undefined` (syntax error) otherwise.
 * @param {string | TokenStream} input source string or an existing token stream
 * @param {number=} pos start position (string input only)
 * @param {ParseOptions=} options optional comment-token callback (string input only)
 * @returns {Rule | undefined} the parsed rule
 */
const parseARule = (input, pos = 0, options = {}) => {
	// 1. Normalize input, and set input to the result.
	const ts = normalizeIntoTokenStream(input, pos, options.comment);
	_setupParse(ts.input, ts.locConverter);
	// 2. Discard whitespace from input.
	while (ts.next().type === TT_WHITESPACE) ts.advance();
	// 3. If the next token from input is an <EOF-token>, return a syntax error.
	// Otherwise, if the next token from input is an <at-keyword-token>, consume an at-rule from input, and let rule be the return value.
	// Otherwise, consume a qualified rule from input and let rule be the return value.
	// If nothing or an invalid rule error was returned, return a syntax error.
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
	return ts.next().type === TT_EOF ? _finishOne(rule) : undefined;
};

/**
 * Parse a declaration, CSS Syntax Level 3
 * [§5.3.8](https://drafts.csswg.org/css-syntax/#parse-declaration).
 * @param {string | TokenStream} input source string or an existing token stream
 * @param {number=} pos start position (string input only)
 * @param {ParseOptions=} options optional comment-token callback (string input only)
 * @returns {Declaration | undefined} the parsed declaration, or undefined
 */
const parseADeclaration = (input, pos = 0, options = {}) => {
	// 1. Normalize input, and set input to the result.
	const ts = normalizeIntoTokenStream(input, pos, options.comment);
	_setupParse(ts.input, ts.locConverter);
	// 2. Discard whitespace from input.
	while (ts.next().type === TT_WHITESPACE) ts.advance();
	// 3. Consume a declaration from input. If anything was returned, return it. Otherwise, return a syntax error.
	const decl = consumeADeclaration(ts);
	return decl === undefined ? undefined : _finishOne(decl);
};

/**
 * Parse a component value, CSS Syntax Level 3 [§5.3.9](https://drafts.csswg.org/css-syntax/#parse-component-value) — strict entry point that consumes one value and returns `undefined` if non-whitespace input trails (use `consumeAComponentValue` for "one value, ignore the rest").
 * @param {string | TokenStream} input source string or an existing token stream
 * @param {number=} pos start position (string input only)
 * @param {ParseOptions=} options optional comment-token callback (string input only)
 * @returns {ComponentValue | undefined} the parsed component value, or `undefined` on empty / trailing-garbage input
 */
const parseAComponentValue = (input, pos = 0, options = {}) => {
	// 1. Normalize input, and set input to the result.
	const ts = normalizeIntoTokenStream(input, pos, options.comment);
	_setupParse(ts.input, ts.locConverter);
	// 2. Discard whitespace from input.
	while (ts.next().type === TT_WHITESPACE) ts.advance();
	// 3. If input is empty, return a syntax error.
	if (ts.next().type === TT_EOF) return undefined;
	// 4. Consume a component value from input and let value be the return value.
	const result = consumeAComponentValue(ts);
	// 5. Discard whitespace from input.
	while (ts.next().type === TT_WHITESPACE) ts.advance();
	// 6. If input is empty, return value. Otherwise, return a syntax error.
	return ts.next().type === TT_EOF ? _finishOne(result) : undefined;
};

/**
 * Parse a list of component values, CSS Syntax Level 3
 * [§5.3.10](https://drafts.csswg.org/css-syntax/#parse-list-of-components).
 * @param {string | TokenStream} input source string or an existing token stream
 * @param {number=} pos start position (string input only)
 * @param {ParseOptions=} options comment callback
 * @returns {ComponentValue[]} component values
 */
const parseAListOfComponentValues = (input, pos = 0, options = {}) => {
	// 1. Normalize input, and set input to the result.
	const ts = normalizeIntoTokenStream(input, pos, options.comment);
	_setupParse(ts.input, ts.locConverter);
	// 2. Consume a list of component values from input, and return the result.
	// (`null` needs `bailOnCurly`, which is not passed here.)
	const values = /** @type {Node[]} */ (consumeAListOfComponentValues(ts));
	const store = _finishStore();
	return /** @type {ComponentValue[]} */ (_readRefList(store, values));
};

/**
 * Parse a comma-separated list of component values, CSS Syntax Level 3 [§5.3.11](https://drafts.csswg.org/css-syntax/#parse-comma-list) — consumes one `<comma-token>`-stopped group of component values per iteration until EOF.
 * @param {string | TokenStream} input source string or an existing token stream
 * @param {number=} pos start position (string input only)
 * @param {ParseOptions=} options comment callback
 * @returns {ComponentValue[][]} comma-separated groups of component values
 */
const parseACommaSeparatedListOfComponentValues = (
	input,
	pos = 0,
	options = {}
) => {
	// 1. Normalize input, and set input to the result.
	const ts = normalizeIntoTokenStream(input, pos, options.comment);
	_setupParse(ts.input, ts.locConverter);
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
	// 4. Return groups — wrap each group's refs against the retained snapshot.
	const store = _finishStore();
	return groups.map(
		(g) => /** @type {ComponentValue[]} */ (_readRefList(store, g))
	);
};

// === Parser algorithms (CSS Syntax Level 3 §5.4) ===
// The mutually-recursive consume algorithms the `parse*` entry points drive:
// each reads tokens from a `TokenStream` and reuses `consumeAComponentValue`
// for nested values, mirroring tabatkins/parse-css.

/**
 * Consume a stylesheet's contents, CSS Syntax Level 3 [§5.4.1](https://drafts.csswg.org/css-syntax/#consume-stylesheet-contents) — the top-level rule list: whitespace and CDO (`<!--`) / CDC (`-->`) tokens are discarded, an at-keyword starts an at-rule, and anything else starts a qualified rule (so top-level declarations are parse errors and never produced).
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
	/** @type {Rule[]} */
	const rules = [];

	// Process input
	for (;;) {
		const t = ts.next();
		// <whitespace-token> / <CDO-token> / <CDC-token>
		// Discard a token from input.
		if (t.type === TT_WHITESPACE || t.type === TT_CDO || t.type === TT_CDC) {
			ts.discard();
		}
		// <EOF-token>
		// Return rules.
		else if (t.type === TT_EOF) {
			return rules;
		}
		// <at-keyword-token>
		// Consume an at-rule from input. If anything is returned, append it to rules.
		else if (t.type === TT_AT_KEYWORD) {
			const at = consumeAnAtRule(ts);
			if (at) {
				if (onRule) onRule(at);
				else rules.push(at);
			}
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
 * Consume an at-rule, CSS Syntax Level 3 [§5.4.2](https://drafts.csswg.org/css-syntax/#consume-at-rule) — the next token must be an <at-keyword-token> (asserted); consumes the prelude up to `;` / `{` / `}` / EOF; `{` consumes the block (§5.4.4) onto `.block`, `;` / EOF is discarded, a top-level `}` (when not `nested`) is appended via `consumeAComponentValue`.
 * @param {TokenStream} ts token stream
 * @param {boolean=} nested true inside a `{}` block — a top-level `}` ends the at-rule (left for the caller)
 * @returns {AtRule | undefined} the parsed at-rule
 */
const consumeAnAtRule = (ts, nested = false) => {
	// Assert (spec): the next token is an <at-keyword-token>.
	// Consume a token from input, and let rule be a new at-rule with its name set to the returned token’s value, its prelude initially set to an empty list, and no declarations or child rules.
	const head = ts.consume();
	const rule = /** @type {AtRule} */ (
		_makeContainer(T_AT_RULE, head.start, head.end)
	);
	_setName(rule, head.start, head.end);
	// Sealed (`_setPrelude`) at each return — the store consumes the
	// scratch array when sealing, so it must be complete by then.
	const prelude = _takeList();
	// declarations / childRules stay null (no block); the `;` / EOF / nested-`}`
	// forms set blockStart / blockEnd to -1 explicitly at their return below.

	// Like `consumeAQualifiedRule`: skip mode scans the prelude without
	// materializing it (url tokens / functions kept so `@import url(…)` still
	// resolves); the block boundary is found by scanning, not the prelude nodes.
	const skip = _skipAtRulePrelude;

	// Process input
	for (;;) {
		const t = ts.next();

		// <semicolon-token>
		// <EOF-token>
		// Discard a token from input. If rule is valid in the current context, return it; otherwise return nothing.
		if (t.type === TT_SEMICOLON || t.type === TT_EOF) {
			ts.discard();
			_setPrelude(rule, prelude);
			_setBlock(rule, -1);
			_setEnd(rule, t.start);
			return rule;
		}
		// <}-token>
		// If nested is true: if rule is valid in the current context, return it; otherwise return nothing.
		// Otherwise, consume a token and append the result to rule’s prelude.
		else if (t.type === TT_RIGHT_CURLY_BRACKET) {
			if (nested) {
				_setPrelude(rule, prelude);
				_setBlock(rule, -1);
				_setEnd(rule, t.start);
				return rule;
			}
			const node = consumeATokenAsNode(ts);
			if (!skip) prelude.push(node);
			continue;
		}
		// <{-token>
		// Consume a block from input, and assign the result to rule's declarations and child rules.
		else if (t.type === TT_LEFT_CURLY_BRACKET) {
			_setPrelude(rule, prelude);
			if (_streamBlocks) {
				_streamConsumeBlock(ts, rule);
				return rule;
			}
			consumeABlock(ts);
			_setBody(rule, _blockDecls, _blockRules);
			_setBlock(rule, _blockStart);
			_setEnd(rule, _blockEnd);
			return rule;
		}

		// anything else
		// Consume a component value from input and append the returned value to rule’s prelude.
		const node = consumeAComponentValue(ts, t);
		if (!skip) {
			prelude.push(node);
		} else if (
			_nodeTypeOf(node) === T_FUNCTION ||
			_nodeTypeOf(node) === T_URL
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
	return /** @type {Token} */ (tokenToNode(t));
};

/**
 * Consume a qualified rule, CSS Syntax Level 3 [§5.4.3](https://drafts.csswg.org/css-syntax/#consume-qualified-rule) — consumes the prelude (each component value via `consumeAComponentValue`) up to its `{` block; EOF, the optional `stopToken`, or a nested top-level `}` is a parse error returning nothing (the block-less prelude is dropped), while a non-nested top-level `}` is consumed as a parse error and the prelude continues. A returned rule always has a block.
 * @param {TokenStream} ts token stream
 * @param {number=} stopToken token type that ends the prelude (parse error → nothing)
 * @param {boolean=} nested true inside a `{}` block — a top-level `}` ends the rule (left for the caller)
 * @returns {QualifiedRule | undefined} parsed qualified rule, or `undefined` on a parse error
 */
const consumeAQualifiedRule = (ts, stopToken, nested = false) => {
	const start = ts.next().start;
	// Let rule be a new qualified rule with its prelude, declarations, and child rules all initially set to empty lists.
	const rule = /** @type {QualifiedRule} */ (
		_makeContainer(T_QUALIFIED_RULE, start, start)
	);
	// Sealed (`_setPrelude`) at the `{` exit — the only path that returns the
	// rule; the parse-error exits abandon the scratch unsealed. Allocated lazily
	// on first push: skip mode usually pushes nothing (empty selector prelude),
	// and `_makeContainer` already zeroed the rule's list length, so a null
	// prelude reads as empty in the walk.
	/** @type {Node[] | null} */
	let prelude = null;
	// A returned qualified rule always has a block (only the `{` exit returns a
	// rule), so `_setBlock` always runs — no blockStart / blockEnd default needed.

	// Skip mode leaves `prelude` empty (selector text is recovered from the
	// rule's byte range, not its nodes); `first`/`second` still track the first
	// two non-whitespace tokens the `--foo: {` disambiguation below needs.
	const skip = _skipSelectorPrelude;
	// Non-skip: first two non-whitespace prelude nodes (computed at the `{`).
	let first = /** @type {Node} */ (/** @type {unknown} */ (0));
	let second = /** @type {Node} */ (/** @type {unknown} */ (0));
	// Skip mode: the same two tokens tracked by token type + start, so a dropped
	// leaf selector token needs no materialized node just for the disambiguation.
	// `0` (no token type) = unset.
	let firstTT = 0;
	let firstStart = 0;
	let secondTT = 0;

	// Process input
	for (;;) {
		const t = ts.next();
		// <EOF-token>
		// stop token (if passed)
		// This is a parse error. Return nothing.
		if (t.type === TT_EOF || t.type === stopToken) {
			return undefined;
		}
		// <}-token>
		// This is a parse error. If nested is true, return nothing. Otherwise, consume a token and append the result to rule’s prelude.
		else if (t.type === TT_RIGHT_CURLY_BRACKET) {
			if (nested) return undefined;
			if (skip) {
				// Stray `}` is a non-ws token; record its type/start, drop the node.
				if (firstTT === 0) {
					firstTT = t.type;
					firstStart = t.start;
				} else if (secondTT === 0) {
					secondTT = t.type;
				}
				ts.advance();
			} else {
				(prelude || (prelude = _takeList())).push(consumeATokenAsNode(ts));
			}
			continue;
		}
		// <{-token>
		// If the first two non-<whitespace-token> values of rule's prelude are an <ident-token> whose value starts with "--" followed by a <colon-token>, then:
		//   - If nested is true, consume the remnants of a bad declaration from input, with nested set to true, and return nothing.
		//   - If nested is false, consume a block from input, and return nothing.
		// (This disambiguates custom-property declarations from nested qualified rules — `--foo: { … }` at top level of a block is a declaration, not a rule.)
		// Otherwise, consume a block from input, and let child rules be the result.
		else if (t.type === TT_LEFT_CURLY_BRACKET) {
			// `--foo: {` disambiguation: are the first two non-ws prelude tokens an
			// ident starting with `--` followed by a colon? Skip mode reads the
			// tracked token type/start; non-skip reads the materialized prelude.
			let dashedDeclaration;
			if (skip) {
				dashedDeclaration =
					firstTT === TT_IDENTIFIER &&
					ts.input.startsWith("--", firstStart) &&
					secondTT === TT_COLON;
			} else if (prelude === null) {
				dashedDeclaration = false;
			} else {
				let firstIdx = 0;
				/* istanbul ignore next -- @preserve: leading whitespace is discarded before the rule, so the prelude never starts with it */
				while (
					firstIdx < prelude.length &&
					_nodeTypeOf(prelude[firstIdx]) === T_WHITESPACE
				) {
					firstIdx++;
				}
				let secondIdx = firstIdx + 1;
				while (
					secondIdx < prelude.length &&
					_nodeTypeOf(prelude[secondIdx]) === T_WHITESPACE
				) {
					secondIdx++;
				}
				first = prelude[firstIdx];
				second = prelude[secondIdx];
				dashedDeclaration =
					first &&
					_nodeTypeOf(first) === T_IDENT &&
					// Test the source bytes directly — avoids forcing the lazy `value`
					// slice just to check the `--` custom-property prefix.
					ts.input.startsWith("--", _nodeStartOf(first)) &&
					second &&
					_nodeTypeOf(second) === T_COLON;
			}
			if (dashedDeclaration) {
				/* istanbul ignore if -- @preserve: when nested, `declarationStartLikely` routes every `--x:` to consumeADeclaration (which accepts custom properties), so this fallthrough is unreachable */
				if (nested) {
					consumeTheRemnantsOfABadDeclaration(ts, true);
				} else {
					consumeABlock(ts);
				}
				return undefined;
			}
			if (prelude !== null) _setPrelude(rule, prelude);
			if (_streamBlocks) {
				_streamConsumeBlock(ts, rule);
				return rule;
			}
			consumeABlock(ts);
			_setBody(rule, _blockDecls, _blockRules);
			_setBlock(rule, _blockStart);
			_setEnd(rule, _blockEnd);
			return rule;
		}

		// anything else
		// Consume a component value from input and append the result to rule’s prelude.
		if (skip) {
			const tt = t.type;
			// Track the first two non-whitespace tokens for the disambiguation above.
			if (tt !== TT_WHITESPACE) {
				if (firstTT === 0) {
					firstTT = tt;
					firstStart = t.start;
				} else if (secondTT === 0) {
					secondTT = tt;
				}
			}
			// Only functions (which may hold a url like `:unknown(url(x))`) and the
			// `(` / `[` blocks that must be balanced are materialized; the url
			// visitor keeps url / function nodes. Every other selector leaf token has
			// no non-modules consumer — drop it without building a node.
			if (
				tt === TT_FUNCTION ||
				(tt >= TT_LEFT_PARENTHESIS && tt <= TT_LEFT_CURLY_BRACKET)
			) {
				const node = consumeAComponentValue(ts, t);
				const ty = _nodeTypeOf(node);
				if (ty === T_FUNCTION || ty === T_URL) {
					(prelude || (prelude = _takeList())).push(node);
				}
			} else {
				ts.advance();
			}
		} else {
			(prelude || (prelude = _takeList())).push(consumeAComponentValue(ts, t));
		}
	}
};

/**
 * Consume a block, CSS Syntax Level 3 [§5.4.4](https://drafts.csswg.org/css-syntax/#consume-block) — the next token must be `<{-token>`; discards it, consumes the block's contents (§5.4.5), discards the closing `}`, and returns its `decls` / `rules` pair. We also return the `[start of {, end of }]` offsets so callers can record the block's source position.
 *
 * Results go into the `_block*` slots rather than a returned object: there is one
 * block per rule, and every caller reads all four immediately, so the object was
 * pure garbage. Read them before parsing anything else.
 * @param {TokenStream} ts token stream
 * @returns {void}
 */
const consumeABlock = (ts) => {
	// Capture the opening `{`'s start before advancing — the stream reuses one
	// token instance, so `consumeABlocksContents` below would overwrite it.
	const blockStart = ts.next().start;
	// Assert (spec): the next token is <{-token>.
	// Discard a token from input. Consume a block's contents from input and let result be the result. Discard a token from input.
	ts.discard();
	consumeABlocksContentsInto(ts);
	// Read before anything else runs: a nested block would overwrite these.
	const decls = _bcDecls;
	const rules = _bcRules;
	const close = ts.next();
	const end = close.type === TT_RIGHT_CURLY_BRACKET ? close.end : close.start;
	ts.discard();
	_blockDecls = decls;
	_blockRules = rules;
	_blockStart = blockStart;
	_blockEnd = end;
};

/**
 * 2-token lookahead: is the next non-whitespace pair `<ident> <colon>`?
 * Peeks raw code points without advancing; comments still fire `onComment` later.
 * @param {TokenStream} ts token stream
 * @returns {boolean} true if consume-a-declaration's step 1 + step 3 would both succeed on the current input
 */
const declarationStartLikely = (ts) => {
	const t = ts.next();
	if (t.type !== TT_IDENTIFIER) return false;
	const input = ts.input;
	const len = input.length;
	let pos = t.end;
	for (;;) {
		if (pos >= len) return false;
		const cc = input.charCodeAt(pos);
		if (_isWhiteSpace(cc)) {
			pos++;
			continue;
		}
		// Skip a `/* … */` comment (the tokenizer filters comments between tokens).
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
 * `_streamConsumeBlock`): the block collects into its own arrays exactly as it
 * always has, and only once it has grown past `_STREAM_MIN_NODES` does it
 * activate and switch to the sink. Keeping that check here rather than behind
 * `onNode` is what makes a small block cost the same as it does with nothing
 * streaming — no call, no type test per child — and the block's frame is written
 * only when something could still read it (see `_streamPublishFrame`), so a block
 * of nothing but declarations never touches one.
 * @param {TokenStream} ts token stream
 * @param {((node: Declaration | Rule) => void)=} onNode optional per-node sink (streaming); nodes are not collected when given
 * @param {number=} streamDepth this block's frame depth while the walk streams, else undefined
 * @param {Rule=} streamRule the rule this block belongs to, needed only to stream it
 * @param {boolean=} nested whether a `{` opened this — true inside a block, where a `}` closes it; false for the whole input, where one closes nothing (default true)
 * Results go into `_bcDecls` / `_bcRules` rather than a returned object — one
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
	/** @type {Declaration[]} */
	const decls = [];
	// Child rules are the common empty case (most rules carry only declarations),
	// so `rules` is allocated lazily and returned as the shared frozen
	// `_EMPTY_LIST` when nothing was appended — one fewer array per rule. `decls`
	// stays eager so the hot declaration append keeps a branch-free `push`.
	/** @type {Rule[] | null} */
	let rules = null;
	let sink = onNode;
	// -1 = nothing to stream, and then the growth check below can never fire.
	const d = streamDepth === undefined ? -1 : streamDepth;
	let limit = _STREAM_NO_LIMIT;
	// Where this block began, kept in locals until something needs the frame.
	let markNode = 0;
	let markFlat = 0;
	let published = false;
	if (d >= 0) {
		markNode = _nodeCount;
		markFlat = _flatTop;
		limit = markNode + _STREAM_MIN_NODES;
		_bcStreamed = false;
	}

	// Process input:
	for (;;) {
		const t = ts.next();

		// <whitespace-token> / <semicolon-token>
		// Discard a token from input (`t` was just peeked and is non-EOF).
		if (t.type === TT_WHITESPACE || t.type === TT_SEMICOLON) {
			ts.advance();
			continue;
		}
		// <}-token>
		// Return decls and rules — but only nested, where it closes the block. At
		// top level nothing opened one, so it is a parse error whose bad
		// declaration runs to the next `;`, which is what a browser reads a
		// `style=""` holding one as.
		if (t.type === TT_RIGHT_CURLY_BRACKET && !nested) {
			consumeTheRemnantsOfABadDeclaration(ts, false);
			continue;
		}
		// <EOF-token> / <}-token>
		// Return decls and rules.
		if (t.type === TT_EOF || t.type === TT_RIGHT_CURLY_BRACKET) {
			_bcDecls = decls;
			_bcRules = rules || _EMPTY_LIST;
			// Read from the frame, not from `sink`: a descendant can activate this
			// block during a child rule that then fails to parse.
			if (d >= 0) _bcStreamed = published && _frameActive[d] === 1;
			return;
		}
		/** @type {Rule | undefined} */
		let childRule;
		// <at-keyword-token>
		// Consume an at-rule from input, with nested set to true. If a rule was returned, append it to rules.
		if (t.type === TT_AT_KEYWORD) {
			if (d >= 0 && !published && sink === undefined) {
				published = true;
				_streamPublishFrame(d, streamRule, markNode, markFlat, decls, rules);
			}
			childRule = consumeAnAtRule(ts, nested);
		}
		// anything else
		// Mark input. Consume a declaration from input, with nested set to true.
		// If a declaration was returned, append it to decls, and discard a mark from input.
		// Otherwise, restore a mark from input, then consume a qualified rule from input, with nested set to true, and <semicolon-token> as the stop token. If a rule was returned, append it to rules.
		else {
			// 2-token peek: consume-a-declaration's steps 1 / 3 require `<ident> <colon>`; if absent it would call consume-the-remnants-of-a-bad-declaration (potentially the rest of the enclosing block) only for the restoreMark to undo it (O(N²) on flat blocks of qualified rules). Skip straight to consume-a-qualified-rule — same observable result.
			if (declarationStartLikely(ts)) {
				ts.mark();
				const decl = consumeADeclaration(ts, nested);
				if (decl) {
					ts.discardMark();
					// A declaration opens no block, so nothing can have activated this
					// one behind our back — only its own growth has to be checked.
					if (sink) {
						sink(decl);
					} else {
						decls.push(decl);
						if (_nodeCount > limit) {
							if (_streamWriter !== undefined && rules === null) {
								// The longhand merge needs every declaration at once; a child
								// rule is where that is given up rather than hold the block.
								limit = _nodeCount + _STREAM_MIN_NODES;
							} else {
								if (!published) {
									published = true;
									// Grew past the threshold on declarations alone, so the
									// frame has to be written here instead.
									_streamPublishFrame(
										d,
										streamRule,
										markNode,
										markFlat,
										decls,
										rules
									);
								}
								_streamActivate(d);
								sink = _streamOnNode;
								limit = _STREAM_NO_LIMIT;
							}
						}
					}
					continue;
				}
				ts.restoreMark();
			}
			// A child rule opens a block, and a block is the only thing that can reach
			// back up and activate this one — so this is the last moment the frame has
			// to be readable, and a block of nothing but declarations never gets here.
			if (d >= 0 && !published && sink === undefined) {
				published = true;
				_streamPublishFrame(d, streamRule, markNode, markFlat, decls, rules);
			}
			const rawStart = t.start;
			childRule = consumeAQualifiedRule(ts, TT_SEMICOLON, true);
			if (!childRule && _printing) {
				// Workaround, deliberately off-spec: §5.4 drops input both productions
				// reject, which would silently delete IE hacks and template
				// placeholders from minified output. Keep the source verbatim instead.
				// Printing only, so the spec-exact tree is what every consumer sees.
				childRule = /** @type {Rule | undefined} */ (
					_makeRaw(rawStart, ts.next().start)
				);
			}
		}
		// A child rule holds a block, so a descendant of it may have activated this
		// block while it was being consumed — `decls` / `rules` are then already
		// walked and recycled, and everything from here on belongs to the sink.
		// Checked even when the rule did not parse, since the block it opened is
		// what activated us and the next child must not reach a recycled list.
		if (!sink && published && _frameActive[d] === 1) sink = _streamOnNode;
		if (!childRule) continue;
		if (sink) {
			sink(childRule);
			continue;
		}
		if (rules === null) {
			rules = [];
			// The frame is written before any child rule is consumed, so it is
			// already pointing at this block and needs the list it did not yet have.
			if (published) _frameRules[d] = rules;
		}
		rules.push(childRule);
		if (_nodeCount > limit) {
			_streamActivate(d);
			sink = _streamOnNode;
			limit = _STREAM_NO_LIMIT;
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
	return { decls: _bcDecls, rules: _bcRules };
};

/**
 * The same production read as the whole input rather than as a block's inside —
 * what an HTML `style=""` holds. Nothing opened a block, so a `}` closes none.
 * @param {TokenStream} ts token stream
 * @param {((node: Rule | Declaration) => void)=} onNode streaming sink
 * @returns {void}
 */
const consumeADeclarationList = (ts, onNode) => {
	consumeABlocksContentsInto(ts, onNode, undefined, undefined, false);
};

/**
 * Consume the remnants of a bad declaration, CSS Syntax Level 3 [§5.4.11](https://drafts.csswg.org/css-syntax/#consume-the-remnants-of-a-bad-declaration). Advances the stream past a malformed declaration's tail so the caller (`consumeABlocksContents`) can resume cleanly.
 * @param {TokenStream} ts token stream
 * @param {boolean} nested whether the call originates from inside a `{}` block
 * @returns {void}
 */
const consumeTheRemnantsOfABadDeclaration = (ts, nested) => {
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
			if (nested) return;
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
 * @param {boolean=} nested true inside a `{}` block — a top-level `}` ends the value
 * @returns {Declaration | undefined} parsed declaration, or `undefined` on the spec's "return nothing" branches (steps 1, 3, 8)
 */
const consumeADeclaration = (ts, nested = false) => {
	const { input } = ts;
	// Let decl be a new declaration, with an initially empty name and a value set to an empty list.
	const start = ts.next().start;
	// nameEnd (= start) / important (unset) keep their container defaults;
	// `value` is set unconditionally at step 5 below.
	const decl = /** @type {Declaration} */ (
		_makeContainer(T_DECLARATION, start, start)
	);

	// 1. If the next token is an <ident-token>, consume a token from input and set decl's name to the returned token's value.
	// Otherwise, consume the remnants of a bad declaration from input, with nested, and return nothing.
	if (ts.next().type === TT_IDENTIFIER) {
		const head = ts.consume();
		_setName(decl, head.start, head.end);
	} else {
		consumeTheRemnantsOfABadDeclaration(ts, nested);
		return undefined;
	}

	// 2. Discard whitespace from input.
	while (ts.next().type === TT_WHITESPACE) ts.advance();

	// 3. If the next token is a <colon-token>, discard a token from input.
	//    Otherwise, consume the remnants of a bad declaration from input, with nested, and return nothing.
	if (ts.next().type === TT_COLON) {
		ts.advance();
	} else {
		consumeTheRemnantsOfABadDeclaration(ts, nested);
		return undefined;
	}

	// 4. Discard whitespace from input.
	while (ts.next().type === TT_WHITESPACE) ts.advance();

	// Step 8's custom-property test, computed early so the value parse can bail.
	const isCustomProperty = input.startsWith("--", start);

	// 5. Consume a list of component values from input, with nested, and with <semicolon-token> as the stop token, and set decl's value to the result.
	//    A nested non-custom declaration bails on a top-level `{` — step 8 would
	//    reject it and the caller restores its mark, so parsing the block (the
	//    entire nested-rule body, re-parsed as a qualified rule after the
	//    restore) would be pure waste.
	const value = consumeAListOfComponentValues(
		ts,
		TT_SEMICOLON,
		nested,
		nested && !isCustomProperty
	);
	if (value === null) return undefined;
	// `_setValue` waits until step 9: steps 6-8 still trim / scan the scratch,
	// and the store consumes it when sealing.
	_setEnd(decl, ts.next().start);

	// 6. If the last two non-<whitespace-token>s in decl's value are a <delim-token> with the value "!" followed by an <ident-token> with a value that is an ASCII case-insensitive match for "important", remove them from decl's value and set decl's important flag.
	{
		let last = value.length - 1;
		while (last >= 0 && _nodeTypeOf(value[last]) === T_WHITESPACE) last--;
		let prev = last - 1;
		while (prev >= 0 && _nodeTypeOf(value[prev]) === T_WHITESPACE) prev--;
		// `!` delim first: it's almost always absent, and `_nodeValueOf` allocates
		// a slice — this order pays it only for genuine `!important` candidates.
		if (
			prev >= 0 &&
			_nodeTypeOf(value[prev]) === T_DELIM &&
			input.charCodeAt(_nodeStartOf(value[prev])) === CC_EXCLAMATION &&
			_nodeTypeOf(value[last]) === T_IDENT &&
			equalsLowerCase(_nodeValueOf(value[last]), "important")
		) {
			_setImportant(decl);
			// Trimmed by popping so the pooled list keeps its backing store.
			while (value.length > prev) value.pop();
		}
	}

	// 7. While the last item in decl's value is a <whitespace-token>, remove that token.
	while (
		value.length > 0 &&
		_nodeTypeOf(value[value.length - 1]) === T_WHITESPACE
	) {
		value.pop();
	}

	// 8. If decl's name starts with "--" (a custom property), it can contain any value (including a top-level `{}` block) — accept it.
	//    Otherwise, if decl's value contains a top-level simple block with an associated token of <{-token>, and also contains any other non-whitespace token, return nothing.
	//    (That is, a top-level {}-block is the whole value of a non-custom property or nothing — for CSS Nesting, `consumeABlocksContents`'s `mark` / `restore a mark` will retry the input as a qualified rule.)
	//    Otherwise, accept the declaration. (The spec also checks "contains any non-whitespace-tokens at the top level" → return nothing; we keep empty-value declarations because callers — e.g. `@value name:;` — rely on them.)
	if (!isCustomProperty) {
		let block = false;
		let beside = false;
		for (let i = 0; i < value.length && !(block && beside); i++) {
			const v = value[i];
			const type = _nodeTypeOf(v);
			if (type === T_SIMPLE_BLOCK && _nodeTokenOf(v) === "{") {
				// A second one stands beside the first.
				if (block) beside = true;
				block = true;
			} else if (type !== T_WHITESPACE) {
				beside = true;
			}
		}
		if (block && beside) return undefined;
	}

	// 9. Return decl.
	_setValue(decl, value);
	return decl;
};

/**
 * Consume a list of component values, CSS Syntax Level 3 [§5.4.7](https://drafts.csswg.org/css-syntax/#consume-list-of-components) — consumes component values until EOF, the optional `stopToken`, or — when `nested` — a top-level `}` (left in the stream); a non-nested `}` is a parse error appended as a token.
 * @param {TokenStream} ts token stream
 * @param {number=} stopToken token type that terminates the list (left unconsumed)
 * @param {boolean=} nested true inside a `{}` block — a top-level `}` ends the list (left unconsumed)
 * @param {boolean=} bailOnCurly abort with `null` on a top-level `{` that something non-whitespace already stands before (left unconsumed) — for callers that would reject the list anyway (consume-a-declaration step 8) and restore a mark; a `{}` block alone is the whole value there, so that one is consumed
 * @returns {ComponentValue[] | null} consumed component values, or `null` when `bailOnCurly` hit
 */
const consumeAListOfComponentValues = (
	ts,
	stopToken,
	nested = false,
	bailOnCurly = false
) => {
	const values = /** @type {ComponentValue[]} */ (_takeList());
	// Process input
	for (;;) {
		const t = ts.next();

		// <eof-token>
		// stop token (if passed)
		// Return values.
		if (t.type === TT_EOF || t.type === stopToken) {
			return values;
		}
		// <}-token>
		// If nested is true, return values.
		// Otherwise, this is a parse error. Consume a token from input and append the result to values.
		if (t.type === TT_RIGHT_CURLY_BRACKET) {
			if (nested) return values;
			const closer = consumeATokenAsNode(ts);
			// Keep unless the type is explicitly marked skip (1); an out-of-range
			// lookup on a short `skip.types` yields `undefined`, which must not drop.
			if (!_skipActive || _skipTypes[_nodeTypeOf(closer)] !== 1) {
				values.push(closer);
			}
			continue;
		}
		// A top-level `{` dooms the list for a bailing caller — stop before the
		// whole block is parsed only to be thrown away on the caller's restore.
		// Only once something stands before it: a `{}` block alone is a
		// declaration's whole value (§5.4.6 step 8), which the caller keeps.
		if (bailOnCurly && t.type === TT_LEFT_CURLY_BRACKET) {
			let doomed = false;
			for (let i = 0; i < values.length; i++) {
				if (_nodeTypeOf(values[i]) !== T_WHITESPACE) {
					doomed = true;
					break;
				}
			}
			if (doomed) return null;
		}
		// anything else
		// Consume a component value from input, and append the result to values.
		// Skipped leaf types short-circuit before materializing: no column slot is
		// written and no node is built (blocks / functions never skip here).
		const tt = t.type;
		if (
			_skipActive &&
			tt !== TT_FUNCTION &&
			!(tt >= TT_LEFT_PARENTHESIS && tt <= TT_LEFT_CURLY_BRACKET) &&
			_skipTypes[_ttToNodeType[tt]] === 1
		) {
			// `t` was just peeked and is a skipped value leaf (never EOF).
			ts.advance();
			continue;
		}
		const node = consumeAComponentValue(ts, t);
		if (!_skipActive || _skipTypes[_nodeTypeOf(node)] !== 1) values.push(node);
	}
};

/**
 * Consume a component value, CSS Syntax Level 3 [§5.4.8](https://drafts.csswg.org/css-syntax/#consume-component-value) — consumes the next value (simple block, function, or single token); callers guard against EOF before calling.
 * @param {TokenStream} ts token stream
 * @param {MutableToken=} t the next token, if the caller already peeked it (defaults to `ts.next()`)
 * @returns {SimpleBlock | FunctionNode | ComponentValue} the consumed component value
 */
const consumeAComponentValue = (ts, t = ts.next()) => {
	// `t` is the next token; hot callers already peeked it and pass it in to
	// skip a redundant `ts.next()` per component value.
	// <{-token> / <[-token> / <(-token> (the three contiguous opening brackets)
	// Consume a simple block from input and return the result.
	if (t.type >= TT_LEFT_PARENTHESIS && t.type <= TT_LEFT_CURLY_BRACKET) {
		return /** @type {SimpleBlock} */ (consumeASimpleBlock(ts));
	}
	// <function-token>
	// Consume a function from input and return the result.
	if (t.type === TT_FUNCTION) {
		return /** @type {FunctionNode} */ (consumeAFunction(ts));
	}
	// anything else
	// Consume a token from input and return the result. (Asserted: not EOF.)
	// Inlined `consumeATokenAsNode`: `t` is already the peeked next token (and not
	// EOF), so `advance` past it and materialize it directly — no redundant
	// `next()` and one fewer call per leaf component value (the bulk of the nodes
	// on a large stylesheet).
	ts.advance();
	return /** @type {ComponentValue} */ (tokenToNode(t));
};

/**
 * Consume a simple block, CSS Syntax Level 3 [§5.4.9](https://drafts.csswg.org/css-syntax/#consume-simple-block) — the next token must be `(`, `[`, or `{` (asserted); consumes component values via `consumeAComponentValue` until the mirror closing token (`)`, `]`, `}`) or EOF, returning the partial block on EOF (parse error).
 * @param {TokenStream} ts token stream
 * @returns {SimpleBlock | undefined} the parsed simple block
 */
const consumeASimpleBlock = (ts) => {
	const open = ts.next();
	// Assert (spec): the next token of input is <{-token>, <[-token>, or <(-token>.
	// Mirror closing token (`opener + 3`) and the associated block char.
	const ending = open.type + 3;
	const token = BLOCK_TOKEN_CHAR[open.type - TT_LEFT_PARENTHESIS];

	// Let block be a new simple block with its associated token set to the next token and with its value initially set to an empty list.
	const block = /** @type {SimpleBlock} */ (
		_makeContainer(T_SIMPLE_BLOCK, open.start, open.end)
	);
	_setToken(block, token);
	// Sealed (`_setValue`) at the return, once complete.
	const val = _takeList();

	// Discard a token from input.
	ts.discard();

	// Process input
	for (;;) {
		const t = ts.next();

		// <eof-token>
		// ending token
		// Discard a token from input. Return block.
		if (t.type === TT_EOF || t.type === ending) {
			ts.discard();
			_setValue(block, val);
			_setEnd(block, t.end);
			return block;
		}

		// anything else
		// Consume a component value from input and append the result to block’s value.
		val.push(consumeAComponentValue(ts, t));
	}
};

/**
 * Consume a function, CSS Syntax Level 3 [§5.4.10](https://drafts.csswg.org/css-syntax/#consume-function) — consumes component values up to the matching `)` or EOF (the partial function on EOF is a parse error).
 * @param {TokenStream} ts token stream
 * @returns {FunctionNode | undefined} the consumed function node
 */
const consumeAFunction = (ts) => {
	// Assert (spec): the next token is a <function-token>.
	// Consume a token from input, and let function be a new function with its name equal the returned token’s value, and a value set to an empty list.
	const tFn = ts.consume();
	const fn = /** @type {FunctionNode} */ (
		_makeContainer(T_FUNCTION, tFn.start, tFn.end)
	);
	_setName(fn, tFn.start, tFn.end - 1);
	// Sealed (`_setValue`) at the return, once complete.
	const val = _takeList();

	// Process input
	for (;;) {
		const t = ts.next();

		if (t.type === TT_EOF || t.type === TT_RIGHT_PARENTHESIS) {
			// <eof-token>
			// <)-token>
			// Discard a token from input. Return function.
			ts.discard();
			_setValue(fn, val);
			_setEnd(fn, t.end);
			return fn;
		}

		// anything else
		// Consume a component value from input and append the result to function’s value.
		// Same pre-materialization skip as `consumeAListOfComponentValues`.
		const tt = t.type;
		if (
			_skipActive &&
			tt !== TT_FUNCTION &&
			!(tt >= TT_LEFT_PARENTHESIS && tt <= TT_LEFT_CURLY_BRACKET) &&
			_skipTypes[_ttToNodeType[tt]] === 1
		) {
			// `t` was just peeked and is a skipped value leaf (never EOF).
			ts.advance();
			continue;
		}
		const node = consumeAComponentValue(ts, t);
		if (!_skipActive || _skipTypes[_nodeTypeOf(node)] !== 1) val.push(node);
	}
};

// Identifier escape / unescape — operate on the raw text of an
// `<ident-token>` (or any source slice that may carry CSS escape sequences).
// `escapeIdentifier` produces a CSS-Syntax-3-conformant `<ident-token>` from
// an arbitrary string (so the result can be re-tokenized as the same name);
// `unescapeIdentifier` reverses tokenizer-time escapes per
// https://www.w3.org/TR/css-syntax-3/#consume-escaped-code-point.
// Both are pure string functions and have no dependency on the AST; they
// live here so the AST module is a one-stop shop for CSS-syntax-level
// utilities. `CssParser.js` re-exports them for back-compat with callers
// that previously reached them via `getCssParser()`.

const regexSingleEscape = /[ -,./:-@[\]^`{-~]/;
const regexExcessiveSpaces = /(^|\\+)?(\\[A-F0-9]{1,6}) (?![a-fA-F0-9 ])/g;
// ASCII escape class per char code: 0 = pass through, 1 = `\<char>` single
// escape, 2 = `\HEX ` (control chars). Built from the original predicates so
// behaviour is identical; replaces two regex tests per character with one load.
const ESCAPE_CLASS_HEX = 2;
const ESCAPE_CLASS_SINGLE = 1;
const _escapeClassTable = new Uint8Array(128);
for (let i = 0; i < 128; i++) {
	const ch = String.fromCharCode(i);
	_escapeClassTable[i] = /[\t\n\f\r\v]/.test(ch)
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
const _escapeIdentifier = (str) => {
	let output = "";
	// Flush safe runs in bulk: only escaped chars break the run, so an
	// identifier needing no escapes returns `str` unchanged (no allocation).
	let lastFlush = 0;
	let needSpaceFix = false;
	for (let i = 0; i < str.length; i++) {
		const cc = str.charCodeAt(i);
		const cls = cc < 128 ? _escapeClassTable[cc] : 0;
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
	// char codes is equivalent to regexes over `output` — and keeps the common
	// nothing-to-do call regex-free.
	const first = str.charCodeAt(0);
	if (
		first === CC_HYPHEN_MINUS &&
		(str.charCodeAt(1) === CC_HYPHEN_MINUS || _isDigit(str.charCodeAt(1)))
	) {
		output = `\\-${output.slice(1)}`;
	} else if (_isDigit(first)) {
		// A leading digit becomes `\3<digit> `, another `\HEX ` run to clean up.
		output = `\\3${str.charAt(0)} ${output.slice(1)}`;
		needSpaceFix = true;
	}

	// Remove spaces after `\HEX` escapes that are not followed by a hex digit,
	// since they’re redundant. Only `\HEX ` runs (above) can produce them; plain
	// single escapes can't, so skip the scan when none were emitted. Note this is
	// only possible if the escape isn't preceded by an odd number of backslashes.
	if (needSpaceFix) {
		output = output.replace(regexExcessiveSpaces, ($0, $1, $2) => {
			/* istanbul ignore if -- @preserve: this escaper never emits an odd run of backslashes before a `\HEX` escape (literal `\` is doubled) */
			if ($1 && $1.length % 2) {
				// It’s not safe to remove the space, so don’t.
				return $0;
			}

			// Strip the space.
			return ($1 || "") + $2;
		});
	}

	return output;
};

/**
 * Returns hex. Reads up to six hex digits from `str` starting at `start` —
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

	// One trailing whitespace terminates the escape, matching the tokenizer's
	// `_consumeAnEscapedCodePoint` — including after a full 6-digit escape, for
	// any CSS whitespace (not just space), plus the extra LF of a CRLF pair.
	// https://drafts.csswg.org/css-syntax/#consume-escaped-code-point
	let consumed = hex.length;
	const trail = str.charCodeAt(start + hex.length);
	if (_isWhiteSpace(trail)) {
		consumed = consumeExtraNewline(trail, str, start + hex.length + 1) - start;
	}

	const codePoint = Number.parseInt(hex, 16);
	const isSurrogate = codePoint >= 0xd800 && codePoint <= 0xdfff;

	// Add special case for
	// "If this number is zero, or is for a surrogate, or is greater than the maximum allowed code point"
	// https://drafts.csswg.org/css-syntax/#maximum-allowed-code-point
	if (isSurrogate || codePoint === 0x0000 || codePoint > 0x10ffff) {
		return ["�", consumed];
	}

	return [String.fromCodePoint(codePoint), consumed];
};

/**
 * Unescape identifier.
 * @param {string} str string
 * @returns {string} unescaped string
 */
const _unescapeIdentifier = (str) => {
	// `indexOf` is the no-escape fast path and the start offset in one — the
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
			// A trailing lone `\` is retained.
			// https://github.com/postcss/postcss-selector-parser/commit/01a6b346e3612ce1ab20219acc26abdc259ccefb
			ret += "\\";
		}
		// Otherwise the lone `\` is dropped; the next char flushes with its run.
		lastFlush = i + 1;
	}
	ret += str.slice(lastFlush);

	return ret;
};

// Cacheable per `compiler.root` — CssParser binds once per parse via
// `.bindCache(...)` and reuses for every identifier.
const escapeIdentifier = makeCacheable(_escapeIdentifier);
const unescapeIdentifier = makeCacheable(_unescapeIdentifier);

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
	// Fast paths: skip the regex engine for the common URL with no escape and
	// no edge whitespace (e.g. `./img.png`). Each guard is equivalent to the
	// regex being a no-op.
	// Remove escaped newlines from a string-token url like `url("im\<newline>g.png")`.
	if (isString && str.includes("\\")) {
		str = str.replace(STRING_MULTILINE, "");
	}

	// Remove unnecessary spaces from `url("   img.png	 ")`
	if (
		str.length !== 0 &&
		(_isWhiteSpace(str.charCodeAt(0)) ||
			_isWhiteSpace(str.charCodeAt(str.length - 1)))
	) {
		str = str.replace(TRIM_WHITE_SPACES, "");
	}

	// Unescape
	if (str.includes("\\")) {
		str = str.replace(UNESCAPE, (match) => {
			if (match.length > 2) {
				return String.fromCharCode(Number.parseInt(match.slice(1).trim(), 16));
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
 * `as` mode through one call — a future mode is just another map entry.
 * @typedef {(ts: TokenStream, onNode: (node: Rule | Declaration) => void) => void} TopLevelConsumer
 */

/**
 * `as` value → the §5.4 consumer that streams its top-level nodes. Keyed by the
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
 * @property {(boolean | "all" | "some" | string | RegExp | ((comment: string) => boolean))=} comments which comments survive: `"some"` (the default) the ones that carry something, `true` / `"all"` every one, `false` none, or the ones a pattern matches / a predicate accepts, over the comment's own text
 * @property {boolean=} mergeLonghands write a family of longhands as the one shorthand that sets them
 * @property {boolean=} mergeRules join rules that print the same block, at-rules that share a prelude, and a named `@layer` block a later sibling opens again
 * @property {boolean=} normalizeQuotes normalize a string's, `url()`'s, font family's and attribute value's quoting
 * @property {boolean=} reduceFunctions compute a call into the shorter call naming the same value (`calc()` and the math functions, transforms, gradients, easing functions, filters)
 * @property {boolean=} removeDeadRules drop a rule or declaration nothing can read: an empty rule, and one an identical later one supersedes
 * @property {boolean=} shortenColors write each color in the shortest spelling of the same value
 * @property {boolean=} shortenMediaQueries write a media feature in its range spelling and collapse an `and` of two into the interval
 * @property {boolean=} shortenNumbers write each number in its shortest equal spelling
 * @property {boolean=} shortenSelectors rewrite a selector into a shorter equal one
 * @property {boolean=} shortenValues write a value the shortest way its property's own grammar allows
 */

/**
 * @typedef {object} CssProcessOptions
 * @property {LocConverter=} locConverter shared loc converter (default a fresh one over the input)
 * @property {boolean=} recurseBlocks walk into block bodies' nested rules (default true)
 * @property {("stylesheet" | "block-contents")=} as which top-level production to consume the source as (see `TOP_LEVEL_CONSUMERS`): `"stylesheet"` (default) or `"block-contents"` (a block's contents, e.g. an HTML `style` attribute)
 * @property {SkipOptions=} skip what the grammar may leave un-materialized to go faster — safe only for parts nothing reads in the active parse; default skip nothing. Ignored while printing (`minimize`), which needs every node
 * @property {boolean=} minimize print the safely-minified serialization (collapsed whitespace, dropped redundant separators, the `printer`'s value transforms) as `process` walks and return `{ code, map }` (default false = walk only, return `undefined`)
 * @property {string=} source name of the input in the emitted source map (`sources[0]` / `file`); only read while printing
 * @property {string=} content the input's contents for the map's `sourcesContent`; only read while printing
 * @property {CssEnvironment=} environment what the target can read (the CSS entries of `output.environment`), so a spelling it would not understand is never reached for; only read while printing, and an absent entry means the modern spelling is available
 * @property {boolean=} convertLengthUnits rewrite a length into a shorter unit it is exactly equal in (`16px` -> `1pc`); off by default because it earns nothing once the asset is compressed, and only read while printing. A time is always rewritten
 * @property {boolean=} rewriteCustomProperties shorten a custom property's value the way any other value is shortened (`--x:#ffffff` -> `#fff`); off by default because `getPropertyValue()` hands that text back, and only read while printing. What it may rewrite is what any other value's tokens may be, a color in a substitution's fallback included — that being the property's value rather than the function's own argument
 * @property {EmbeddedSourceRenderer=} renderEmbeddedSource renders source this stylesheet embeds: the payload of a `url()` `data:` URL whose media type names a language webpack knows (SVG, CSS, HTML, JSON, JavaScript). Absent, a data URL is emitted exactly as written
 * @property {CssTransformOptions=} transforms which of the meaning-preserving rewrites the minifying print makes; each is on unless it is `false`
 * @property {DeferredEmbeddedSource[]=} deferEmbeddedSource collects what `renderEmbeddedSource` would be offered instead of offering it, for a caller whose renderer is asynchronous: the print leaves a marker for each and `finish` puts the answers in their place, so one parse serves both. Takes precedence over `renderEmbeddedSource`
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
 * @property {boolean=} selectorPrelude drop qualified-rule (selector) preludes — the rule and its block are still produced (default false)
 * @property {boolean=} atRulePrelude drop at-rule preludes — the at-rule and its block are still produced (default false)
 */

// Per-parse walk state in module slots (same pattern as `_skip*`) so the walk
// functions below are module-level constants: one function identity across
// parses keeps the recursive per-node call sites monomorphic and drops the
// per-parse closure allocations.
/** @typedef {import("../util/SourceProcessor").CompiledVisitorBucket<CssPath>} CompiledVisitorBucket */
/** @type {CompiledVisitorMap} */
let _visitors = /** @type {CompiledVisitorMap} */ (/** @type {unknown} */ ([]));
let _recurseBlocks = true;
// Printing needs a faithful serialization, so it keeps dropped input as `T_RAW`
// nodes; a walk-only parse leaves this false and allocates none.
let _printing = false;
// The selectors / at-rules met so far in each open block, so a prefixed rule can
// be added or dropped against the sibling it needs without buffering the whole
// stylesheet (streaming holds ~one node). Keyed by the block's rule — null for
// the stylesheet itself — and dropped as that block finishes, so it holds one
// set per open ancestor and never a recycled node. Null unless minifying for a
// target. Markers: `signature` (the unprefixed rule is present) and
// `signature\0prefix`.
/** @type {Map<Node | null, PrefixScope> | null} */
let _seenPrefixRules = null;
// Whether vendor prefixes are written at all. The selection still answers which
// spellings a target reads, so `vendorPrefixes: false` turns off only this.
let _prefixingOn = false;
// The prefixed rule just printed, and the signature of the unprefixed twin that
// would make it dead weight — read by whoever writes that rule out, so it can go
// as a piece of its own. Null when the rule just printed is not one.
/** @type {{ node: Node, signature: string } | null} */
let _prefixDropCandidate = null;
// The browserslist selection this parse prefixes for, as the versions selected
// for each browser by its `SUPPORT_BROWSERS` slot; null unless minifying for
// one, which is what turns prefixing on.
/** @type {(number[] | undefined)[] | null} */
let _prefixBrowsers = null;
/** @type {CompiledVisitorBucket | undefined} */
let _commentBucket;

// Comments reach the visitor map through `NodeType.Comment` instead of a
// side callback. They fire during tokenization — in source order among
// comments, not interleaved with the node walk — on a transient store node so
// `A.start`/`end`/`loc`/`source` work. No comment visitor → no callback →
// the tokenizer skips comments with zero overhead.
/** @type {(input: string, start: number, end: number) => number} */
const _grammarOnComment = (_src, start, end) => {
	const node = _makeLeaf(T_COMMENT, start, end);
	_currentNode = node;
	_currentParent = null;
	_currentIndex = 0;
	const bucket = /** @type {CompiledVisitorBucket} */ (_commentBucket);
	const e = bucket.enter;
	for (let i = 0; i < e.length; i++) e[i](A);
	const x = bucket.exit;
	for (let i = 0; i < x.length; i++) x[i](A);
	return end;
};

/**
 * A node's post-order tail, shared by `_walkValue` / `_walkRule`: fire its `exit`
 * visitors, then — when printing — its printer, so the print step lives in one
 * place instead of being repeated in each walker. Rebinds the path onto `node`
 * (descending into children moved it). `writer` undefined = walk only, no print.
 * @param {Node} node the finished node
 * @param {Node | null} parent enclosing node
 * @param {number} index node's index within its sibling list
 * @param {CompiledVisitorBucket | undefined} b the node's visitor bucket
 * @param {PrintContext | undefined} writer print context when printing, else undefined
 */
const _exitNode = (node, parent, index, b, writer) => {
	if (b === undefined && writer === undefined) return;
	_currentNode = node;
	_currentParent = parent;
	_currentIndex = index;
	if (b !== undefined) {
		const x = b.exit;
		for (let i = 0; i < x.length; i++) x[i](A);
	}
	if (writer !== undefined) writer.printNode(node, A);
};

// The letters those two sets' names start with, as a mask over `a`-`z`. Derived
// from the sets, so a name added to either is covered without touching this.
const _MATH_NAME_FIRST_LETTERS = (() => {
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
const _mayBeMathFunction = (start) => {
	// ASCII-lowercased in place: only a letter lands in `a`-`z` this way, and an
	// escape or a digit starts neither set's names.
	const first = _input.charCodeAt(start) | 0x20;
	if (first < 0x61 || first > 0x7a) return false;
	return (_MATH_NAME_FIRST_LETTERS & (1 << (first - 0x61))) !== 0;
};

/**
 * Walk a component-value subtree; children are already materialized. Fetches
 * the node's visitor bucket once (reused for enter + exit) and uses index
 * loops — `for…of` would allocate an iterator per node on this hot path. When
 * `writer` is given, fires this node's printer once its children and visitors are
 * done (post-order); the generic context owns everything the printer then does.
 * @param {Node} node component-value root
 * @param {Node | null} parent enclosing node
 * @param {number} index node's index within its sibling list
 * @param {PrintContext | undefined} writer print context when printing, else undefined
 */
const _walkValue = (node, parent, index, writer) => {
	const ty = _types[_nodeIndex(node)];
	const b = _visitors[ty];
	let skip = false;
	if (b !== undefined && b.enter.length !== 0) {
		_walkSkip = false;
		_currentNode = node;
		_currentParent = parent;
		_currentIndex = index;
		const e = b.enter;
		for (let i = 0; i < e.length; i++) e[i](A);
		skip = _walkSkip;
		_walkSkip = false;
	}
	// Everything below a math function is a math expression, `(…)` groups
	// included, so the depth rides the recursion the way `_inValue` does — and
	// still counts this node when its own printer runs, which is what joins the
	// children it applies to.
	let enteredMath = false;
	let enteredStepped = false;
	if (!skip && (ty === T_FUNCTION || ty === T_SIMPLE_BLOCK)) {
		const i0 = _nodeIndex(node);
		const vs = _listStarts[i0];
		const ve = vs + _listLens[i0];
		// Read off the source before the name is cut out of it: most calls in a
		// stylesheet start with a letter neither set uses, `var()` above all.
		if (ty === T_FUNCTION && _mayBeMathFunction(_starts[i0])) {
			const name = toLowerCaseIfNeeded(_input.slice(_starts[i0], _aux0[i0]));
			if (MATH_FUNCTIONS.has(name)) {
				enteredMath = true;
				_mathFunctionDepth++;
			}
			if (STEPPED_FUNCTIONS.has(name)) {
				enteredStepped = true;
				_steppedFunctionDepth++;
			}
		}
		const previousGradient = _inGradient;
		if (
			ty === T_FUNCTION &&
			// Every gradient name ends in `gradient`, so one code point rejects the
			// rest before the name is sliced.
			(_input.charCodeAt(_aux0[i0] - 1) | 0x20) === CC_LOWER_T &&
			GRADIENT_FUNCTION_RE.test(_gradientName(i0))
		) {
			_inGradient = true;
		}
		for (let i = vs; i < ve; i++) {
			_walkValue(_nodeRef(_flat[i]), node, i - vs, writer);
		}
		_inGradient = previousGradient;
	}
	_exitNode(node, parent, index, b, writer);
	if (enteredMath) _mathFunctionDepth--;
	if (enteredStepped) _steppedFunctionDepth--;
};

// A gradient, whatever it is prefixed with.
const GRADIENT_FUNCTION_RE = /(?:^|-)(?:linear|radial|conic)-gradient$/i;

/**
 * A function's name, for the gradient test.
 * @param {number} i0 the function's node index
 * @returns {string} the name as written
 */
const _gradientName = (i0) => _input.slice(_starts[i0], _aux0[i0]);

/**
 * Set the flags an at-rule's own name decides, on the way into its prelude:
 * which of them is set is the same question wherever the walk asks it, and the
 * collected and streaming paths would otherwise have to agree by hand. The
 * caller puts them back — each rides its own recursion.
 * @param {number} i0 the at-rule's node index
 * @returns {void}
 */
const _enterAtRulePrelude = (i0) => {
	const atName = _input.slice(_starts[i0] + 1, _aux0[i0]);
	if (equalsLowerCase(atName, "property")) {
		_inPropertyRule = true;
	} else if (equalsLowerCase(atName, "function")) {
		_inFunctionRule = true;
	} else if (equalsLowerCase(atName, "font-feature-values")) {
		_inFeatureValuesRule = true;
	}
	if (equalsLowerCase(atName, "supports")) {
		_inSupportsPrelude = true;
	}
	// `@media` and `@container` are the two preludes whose `(…)` holds a media
	// feature, the only place the range spelling is a spelling of.
	else if (
		equalsLowerCase(atName, "media") ||
		equalsLowerCase(atName, "container")
	) {
		_inMediaConditionPrelude = true;
	}
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
const _walkRule = (node, parent, index, writer) => {
	const i0 = _nodeIndex(node);
	const ty = _types[i0];
	const b = _visitors[ty];
	let skip = false;
	if (b !== undefined && b.enter.length !== 0) {
		_walkSkip = false;
		_currentNode = node;
		_currentParent = parent;
		_currentIndex = index;
		const e = b.enter;
		for (let i = 0; i < e.length; i++) e[i](A);
		skip = _walkSkip;
		_walkSkip = false;
	}
	if (!skip) {
		if (ty === T_AT_RULE || ty === T_QUALIFIED_RULE) {
			const ps = _listStarts[i0];
			const pe = ps + _listLens[i0];
			// A `@supports` prelude holds a declaration being *tested*, not applied,
			// so rewriting its value would change what the test asks — the flag rides
			// the recursion, since the conditions nest.
			const prevSupports = _inSupportsPrelude;
			const prevMedia = _inMediaConditionPrelude;
			const prevProperty = _inPropertyRule;
			const prevFunction = _inFunctionRule;
			const prevFeatureValues = _inFeatureValuesRule;
			if (ty === T_AT_RULE) _enterAtRulePrelude(i0);
			for (let i = ps; i < pe; i++) {
				_walkValue(_nodeRef(_flat[i]), node, i - ps, writer);
			}
			_inSupportsPrelude = prevSupports;
			_inMediaConditionPrelude = prevMedia;
			if (_recurseBlocks) {
				// Declarations then child rules — downstream consumers don't need them strictly interleaved in source order.
				const bi = _bodyIdx[i0];
				if (bi !== 0) {
					const decls = _declBodies[bi - 1];
					for (let i = 0; i < decls.length; i++) {
						_walkRule(decls[i], node, i, writer);
					}
					const ch = _ruleBodies[bi - 1];
					for (let i = 0; i < ch.length; i++) _walkRule(ch[i], node, i, writer);
				}
			}
			_inPropertyRule = prevProperty;
			_inFunctionRule = prevFunction;
			_inFeatureValuesRule = prevFeatureValues;
		} else if (ty === T_DECLARATION) {
			const vs = _listStarts[i0];
			const ve = vs + _listLens[i0];
			// A declaration's value is a value context (its hashes are colors, not
			// ids); the flag rides the recursion so a hash at any depth (e.g. inside a
			// gradient) knows it, while selector-prelude hashes never see it set.
			const prev = _inValue;
			const prevDeclaration = _valueDeclaration;
			const prevCustom = _inCustomProperty;
			const prevSubstituted = _inSubstitutedValue;
			_inValue = true;
			if (_printing) _valueDeclaration = node;
			// A custom property's value is the one an engine hands back verbatim, so
			// its tokens print squeezed but as written (see `_inCustomProperty`).
			// `@property`'s `initial-value` is typed by its sibling `syntax`, so it
			// is opaque the same way: `0px` there is not the `0` a length accepts.
			// Only the custom property itself is what `rewriteCustomProperties`
			// asks for; those two stay opaque whatever it says.
			if (
				(!_rewriteCustomProperties && _input.startsWith("--", _starts[i0])) ||
				(_inPropertyRule &&
					rangeEqualsLowerCase(
						_input,
						_starts[i0],
						_aux0[i0],
						"initial-value"
					)) ||
				(_inFunctionRule &&
					rangeEqualsLowerCase(_input, _starts[i0], _aux0[i0], "result"))
			) {
				_inCustomProperty = true;
			}
			// So is a value holding a substitution: the engine keeps it as the token
			// stream it was written as until the substitution resolves, so no rewrite
			// inside one prints the value it would hand back. Read once per
			// declaration, before its children print — a `var()` sibling of the token
			// being rewritten has not been visited yet.
			// Every substitution is a function call, so a value with no `(` in it
			// cannot hold one — checked over the span in place, because slicing it
			// out allocates a string per declaration only to throw it away.
			if (_printing && _hasSubstitutionInSpan(_starts[i0], _ends[i0])) {
				_inSubstitutedValue = true;
			}
			for (let i = vs; i < ve; i++) {
				_walkValue(_nodeRef(_flat[i]), node, i - vs, writer);
			}
			_inValue = prev;
			_valueDeclaration = prevDeclaration;
			_inCustomProperty = prevCustom;
			_inSubstitutedValue = prevSubstituted;
		}
	}
	_exitNode(node, parent, index, b, writer);
};

// === Nested-block streaming ===
// Top-level nodes already stream, but inside one big block nothing could be
// released until the whole subtree finished. Enter an open rule once its block
// has grown enough to be worth it, then walk and recycle each later child as it
// completes: peak storage becomes the open path rather than the block.
// Printing streams with it: a rule's `prelude{` is held back when the block
// opens (`_streamOpen`), each finished child is emitted straight after it
// (`_streamEmitChild`), and the `}` closes it (`_streamClose`) — so the printer
// never assembles a parent from children a streamed body has already released.
// The two things that need a whole block at once still hold: a longhand family
// only merges in a block with no child rule, which is exactly the block this
// declines to stream, and the last of a set of identical declarations is reached
// by taking the earlier ones back out of the output rather than by looking ahead.
// On for every walk, and not an option: a block under the threshold is collected
// and walked in one batch exactly as it always was, so there is nothing to trade
// off. It is still a flag because the standalone `parseA*` entry points hand back
// a materialized tree and must not stream — `_setupParse` leaves it off for them,
// and only `grammar` turns it on.
let _streamBlocks = false;
/** @type {Node | null} node already walked inline, so its sink only recycles */
let _streamWalked = null;
// One frame per open block, indexed by depth rather than pushed and popped:
// nesting is shallow and strictly LIFO, so an indexed store costs a write where
// parallel stacks cost bounds and capacity checks on every rule. Activation
// needs to reach every ancestor, which locals could not offer.
//
// A frame is written lazily, by `_streamPublishFrame`, and only where an
// ancestor could still be reached for: just before a child rule — the one thing
// that can open a block that reaches back up — and on the block's own growth
// past the threshold. Every other block, which is every leaf rule in a
// stylesheet, keeps its state in `consumeABlocksContentsInto`'s locals and never
// touches these at all. A node is an id, so every slot but the two buffers is
// numeric: typed columns keep a write off the GC's books.
const _STREAM_MAX_DEPTH = 64;
let _depth = 0;
// The deepest frame this parse wrote, so the reset clears what was used rather
// than all `_STREAM_MAX_DEPTH` slots — nesting is 1 deep in almost every sheet.
let _frameHighWater = 0;
/** @type {Int32Array} node id of the open rule */
const _frameRule = new Int32Array(_STREAM_MAX_DEPTH);
const _frameMark = new Int32Array(_STREAM_MAX_DEPTH);
const _frameFlatMark = new Int32Array(_STREAM_MAX_DEPTH);
const _frameBodyMark = new Int32Array(_STREAM_MAX_DEPTH);
const _frameActive = new Uint8Array(_STREAM_MAX_DEPTH);
// Sibling counters, kept apart because the walk indexes declarations and child
// rules independently (see `_walkRule`) and a streamed block must agree with it.
const _frameDeclIndex = new Int32Array(_STREAM_MAX_DEPTH);
const _frameRuleIndex = new Int32Array(_STREAM_MAX_DEPTH);
// Whether a finished child of this frame is walked at all: `skipChildren()` and
// `recurseBlocks: false` both decline them, folded into one test per child.
const _frameWalk = new Uint8Array(_STREAM_MAX_DEPTH);
// What the block buffered before it activated. `consumeABlocksContentsInto`
// collects into these very arrays, so a descendant that crosses the threshold
// first can still drain what its ancestors hold.
/** @type {(Declaration[] | null)[]} */
const _frameDecls = Array.from({ length: _STREAM_MAX_DEPTH }, () => null);
/** @type {(Rule[] | null)[]} */
const _frameRules = Array.from({ length: _STREAM_MAX_DEPTH }, () => null);
const _frameParentIndex = new Int32Array(_STREAM_MAX_DEPTH);
// The `@property` / `@function` / `@font-feature-values` state this frame was
// entered under. A streamed block outlives the call that set it, so it is
// restored when the frame closes.
const _framePrevProperty = new Uint8Array(_STREAM_MAX_DEPTH);
const _framePrevFunction = new Uint8Array(_STREAM_MAX_DEPTH);
const _framePrevFeatureValues = new Uint8Array(_STREAM_MAX_DEPTH);
// Printing a streamed block: where its first item landed in the output, how deep
// its opener sits in the writer's pending stack, and the direct declarations it
// has emitted so far — the last of a set of identical ones is the only one that
// can be read, and the earlier are taken back as each later one arrives.
const _frameFirstChunk = new Int32Array(_STREAM_MAX_DEPTH);
const _framePendingDepth = new Int32Array(_STREAM_MAX_DEPTH);
/** @type {(Map<string, number> | null)[]} */
const _frameSeenDeclarations = Array.from(
	{ length: _STREAM_MAX_DEPTH },
	() => null
);
// The child rules a streamed block has emitted, by their printed text: the last
// of a set of identical ones is the only one read, and the earlier are taken
// back as each later one arrives.
/** @type {(Map<string, number> | null)[]} */
const _frameSeenRules = Array.from({ length: _STREAM_MAX_DEPTH }, () => null);

// The openers enclosing each streamed depth, joined: what a rule there is read
// under, so one elsewhere under the same conditions keys the same.
/** @type {(string | null)[]} */
const _frameChainKey = Array.from({ length: _STREAM_MAX_DEPTH }, () => null);
/**
 * A rule the printer has written, at `[at, at + len)` of the piece holding it.
 * `key` is the text it printed to and `scope` what encloses it; a later rule
 * with both the same is this one written again. Neither is rewritten as the span
 * travels outward — only `scope` is replaced, by one standing for more — so the
 * collected and the streamed path split a rule the same way, which is what makes
 * the two agree on what a duplicate is.
 * @typedef {{ scope: RuleScope, key: string, at: number, len: number }} RuleSpan
 * @typedef {{ prefix: string, rules: Map<string, { taken: TakenPiece, span: RuleSpan }>, inner: Map<string, RuleScope> }} RuleScope
 * @typedef {{ bodyAt: number, prelude: string, keyPrelude: string, qualified: boolean, spans: RuleSpan[] }} BlockSpans
 */
// Where each finished block's rules landed in it, youngest last — by print
// order, since a node id is a slot the next top-level node reuses.
/** @type {BlockSpans[]} */
const _blockSpans = [];
const _NO_RULE_SPANS = /** @type {RuleSpan[]} */ (
	/** @type {unknown} */ (Object.freeze([]))
);
const _NO_BLOCK_SPANS = /** @type {BlockSpans[]} */ (
	/** @type {unknown} */ (Object.freeze([]))
);
// Stands in for a block node that carries no rules of its own, so a parent
// still takes exactly one entry off for each of its non-declaration children.
/** @type {BlockSpans} */
const _NO_BLOCK_ENTRY = Object.freeze({
	bodyAt: -1,
	prelude: "",
	keyPrelude: "",
	qualified: false,
	spans: _NO_RULE_SPANS
});
// The same for a qualified rule, which is still one rule of its own however
// little it can say about what it nests.
/** @type {BlockSpans} */
const _NO_BLOCK_ENTRY_QUALIFIED = Object.freeze({
	bodyAt: -1,
	prelude: "",
	keyPrelude: "",
	qualified: true,
	spans: _NO_RULE_SPANS
});
/**
 * @typedef {{ piece: number, text: string, spans: RuleSpan[], empties: number }} TakenPiece
 */
// Every rule taken so far, sheet-wide, by what encloses it and then by the text
// it printed to — neither of which changes once written (see `RuleSpan`).
/** @type {Map<string, RuleScope> | null} */
let _ruleScopes = null;
/** @type {RuleScope | null} */
let _rootRuleScope = null;

/**
 * The scope for `prefix`, made once and shared — so a chain reached a level at a
 * time and the same one reached in a single step are the one scope.
 * @param {string} prefix what encloses the rules in it, "" at the top level
 * @returns {RuleScope} the scope
 */
const _ruleScopeFor = (prefix) => {
	let scopes = _ruleScopes;
	if (scopes === null) {
		scopes = new Map();
		_ruleScopes = scopes;
	}
	let scope = scopes.get(prefix);
	if (scope === undefined) {
		scope = { prefix, rules: new Map(), inner: new Map() };
		scopes.set(prefix, scope);
	}
	return scope;
};

/**
 * The top-level scope, where a rule nothing encloses lands.
 * @returns {RuleScope} the root scope
 */
const _rootScope = () => {
	let root = _rootRuleScope;
	if (root === null) {
		root = _ruleScopeFor("");
		_rootRuleScope = root;
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
const _enclosingRuleScope = (scope, head) => {
	if (head.length === 0) return scope;
	let inner = scope.inner.get(head);
	if (inner === undefined) {
		inner = _ruleScopeFor(`${head}${scope.prefix}`);
		scope.inner.set(head, inner);
	}
	return inner;
};
// CSS Cascade 5 §6.4.1: an `!important` declaration is read from the earliest
// layer, so a copy in a later `@layer {` makes nothing dead.
let _anonymousLayers = 0;
const BARE_AT_RULE_RE = /^@([^\s({;]+)\s*\{$/;

/**
 * What an opener contributes to the key the rules under it are read by. The
 * name is compared unescaped, since `@l\61yer {` opens one of these too.
 * @param {string} opener the block's prelude, its `{` included
 * @returns {string} the opener, or a token no other occurrence shares
 */
const _openerKey = (opener) => {
	const bare = BARE_AT_RULE_RE.exec(opener);
	return bare !== null &&
		toLowerCaseIfNeeded(unescapeIdentifier(bare[1])) === "layer"
		? `\u0000${++_anonymousLayers}@layer{`
		: opener;
};
// The named layer blocks a streamed block has emitted, by their opener: a later
// one of the same name is folded into the piece the first went out as.
/** @type {(Map<string, SeenLayer> | null)[]} */
const _frameSeenLayers = Array.from({ length: _STREAM_MAX_DEPTH }, () => null);
/** @type {PrintContext | undefined} the print context while streaming, else undefined */
let _streamWriter;
// A block earns the streaming machinery only once it holds enough to be worth
// releasing. `_nodeCount` restarts at each top-level node, so
// `_nodeCount - mark` is exactly how far this block has grown; under the
// threshold `consumeABlocksContentsInto` collects into its own arrays exactly as
// it does when nothing streams, and the rule is walked once, in one batch.
// Tuned: a block that crosses only just, near its own `}`, activates for almost
// nothing back, so the threshold sits above the few-hundred-rule `@media` a
// stylesheet actually tends to hold. It bounds what is ever buffered, and even
// so that is a fraction of the block it replaces.
const _STREAM_MIN_NODES = 16384;
// `_nodeCount` never reaches this, so a non-streaming block's per-child growth
// check is one compare that can never fire — no second code path to maintain.
const _STREAM_NO_LIMIT = 0x7fffffff;
// How many finished bodies a streamed block lets pile up before handing them
// back in one go (see `_streamOnNode`).
const _STREAM_BODY_SLACK = 64;

/**
 * Make an open block's frame readable, so a descendant that crosses the
 * threshold can enter and drain it on the way in. Called at most once per block,
 * and only by blocks that could still need it.
 * @param {number} d the block's depth
 * @param {Rule | undefined} rule the rule whose block this is
 * @param {number} markNode `_nodeCount` when the block opened
 * @param {number} markFlat `_flatTop` when the block opened
 * @param {Declaration[]} decls the block's declarations so far
 * @param {Rule[] | null} rules the block's child rules so far
 */
const _streamPublishFrame = (d, rule, markNode, markFlat, decls, rules) => {
	_frameRule[d] = _nodeIndex(/** @type {Rule} */ (rule));
	_frameMark[d] = markNode;
	_frameFlatMark[d] = markFlat;
	_frameActive[d] = 0;
	// The very arrays the block is collecting into, so a descendant can drain what
	// it buffered without it being on the stack.
	_frameDecls[d] = decls;
	_frameRules[d] = rules;
};

/**
 * Hold back the opener of a streamed rule — `prelude{`, which its prelude
 * already determines. Held rather than emitted so a block that prints to nothing
 * can still be dropped whole at its `}`.
 * @param {number} d the block's depth
 * @param {Rule} rule the open rule
 */
const _streamOpen = (d, rule) => {
	const writer = /** @type {PrintContext} */ (_streamWriter);
	const minify = writer.options.mode === "minify";
	// Bind the whole path, not just the node: a prelude can be read in terms of
	// what encloses it — a keyframe selector is `from` only inside `@keyframes` —
	// and `_streamEnterRule` binds the parent only when the rule has an `enter`
	// visitor to run, which printing on its own does not.
	_currentNode = rule;
	_currentParent = d === 0 ? null : _nodeRef(_frameRule[d - 1]);
	_currentIndex = _frameParentIndex[d];
	const opener = `${_rulePrelude(A, writer, minify)}${minify ? "" : " "}{`;
	// A streamed rule writes straight through, so the rule held back for a join
	// lands before its opener — after the opener is read, since taking one clears
	// the store the prelude's own children were printed into.
	_flushTopLevel(writer);
	_framePendingDepth[d] = writer.pushPending(opener);
	_frameSeenDeclarations[d] = null;
	_frameSeenRules[d] = null;
	_frameSeenLayers[d] = null;
	_frameFirstChunk[d] = writer.markCut();
	const above = d === 0 ? "" : _frameChainKey[d - 1];
	_frameChainKey[d] =
		!minify || above === null ? null : `${above}${_openerKey(opener)}`;
	// The outermost opener carries the whole run's source anchor: it is the one
	// the kept comments precede and the mapping points at.
	if (d === 0) {
		const i0 = _nodeIndex(rule);
		const start = _starts[i0];
		const loc = _locConverter.get(start);
		writer.anchorPending(start, loc.line - 1, loc.column);
	}
};

/**
 * Emit one finished child of a streamed block, and with it every opener still
 * held back — something inside them printed, so they are not empty after all.
 * @param {number} d the block's depth
 * @param {Node} child the finished child
 */
const _streamEmitChild = (d, child) => {
	const writer = /** @type {PrintContext} */ (_streamWriter);
	const text = writer.get(child);
	// A declaration the minifier dropped prints to nothing, and an empty rule to
	// nothing as well: neither makes the block it sits in non-empty.
	if (text.length === 0) return;
	writer.flushPending();
	const minify = writer.options.mode === "minify";
	// Taking a dead rule or declaration back and folding two named layer blocks
	// into one are two options, so each gather below runs only where its own
	// is on.
	const dropping = minify && _transforms.removeDeadRules;
	const merging = minify && _transforms.mergeRules;
	if (!minify || _nodeTypeOf(child) !== T_DECLARATION) {
		const body = minify ? text : `\n${text}`;
		// Drained here and nowhere else: every path out of this branch has to take
		// the child's entry with it, or the next child reads it as its own.
		const own = _drainTopLevelSpans(child);
		// The one child rule that can be taken back: a prefixed one an unprefixed
		// twin later in this block would make dead weight. Its parent never
		// assembles a body here, so the piece is what the twin drops.
		const candidate = _prefixDropCandidate;
		if (candidate !== null && candidate.node === child) {
			_prefixDropCandidate = null;
			const scope = _prefixScope(_nodeRef(_frameRule[d]));
			const pending = scope.pending;
			if (pending !== null && pending.delete(candidate.signature)) {
				if (scope.retractable === null) scope.retractable = new Map();
				scope.retractable.set(
					candidate.signature,
					writer.emitRetractable(body)
				);
				return;
			}
		}
		// A named layer block is one layer however far its siblings stand apart, so
		// a repeat of one folds into the first — `_mergeNamedLayerBlocks` is the
		// same gather for a block whose body is assembled in one go. A sibling
		// naming a layer any other way writes into one of these, and the order
		// within a layer is the cascade's, so nothing folds back over it.
		const positional = merging && POSITIONAL_AT_RULE_RE.test(text);
		if (positional) {
			const opener = _namedLayerOpener(text);
			if (opener === null) {
				if (_frameSeenLayers[d] !== null) {
					/** @type {Map<string, SeenLayer>} */ (_frameSeenLayers[d]).clear();
				}
			} else {
				let layers = _frameSeenLayers[d];
				if (layers === null) {
					layers = new Map();
					_frameSeenLayers[d] = layers;
				}
				const first = layers.get(opener);
				const deep = _opensNestedLayer(text, opener);
				_noteLayerBlock(
					layers,
					opener.slice(NAMED_LAYER_OPENER_HEAD, -1).trim(),
					deep
				);
				const chain = _frameChainKey[d];
				const inner = chain === null ? null : _topLevelSpans(own, text);
				if (first !== undefined && !(deep && first.subtree)) {
					const grown = first.taken;
					if (grown === undefined || inner === null || chain === null) {
						writer.foldIntoRetractable(first.at, text.slice(opener.length));
						return;
					}
					// The body lands in front of the piece's own `}`, past everything
					// already keyed in it, so only what arrives now needs moving.
					const base = grown.text.length - 1 - opener.length;
					grown.text = `${grown.text.slice(0, -1)}${text.slice(opener.length)}`;
					writer.rewriteRetractable(grown.piece, grown.text);
					for (const span of inner) span.at += base;
					_noteSpans(writer, grown, inner, chain);
					return;
				}
				const at = writer.emitRetractable(body);
				layers.set(opener, {
					at,
					subtree: false,
					taken:
						inner === null || chain === null
							? undefined
							: _takeDeduped(writer, at, body, inner, own, chain)
				});
				return;
			}
		}
		// The same rule twice in a block is read once: the later writes the same
		// declarations to the same elements and wins the tie, so it takes the
		// earlier back — as each identical declaration does below.
		if (dropping && !positional) {
			const chain = _frameChainKey[d];
			const piece = writer.emitRetractable(body);
			if (chain !== null) {
				// Sheet-wide, keyed on what the rule is read under: the same map the
				// collected path registers into, so the two agree across a sheet that
				// takes both.
				const spans = _topLevelSpans(own, text);
				if (spans !== null) {
					_takeDeduped(writer, piece, text, spans, own, chain);
					return;
				}
			}
			let rules = _frameSeenRules[d];
			if (rules === null) {
				rules = new Map();
				_frameSeenRules[d] = rules;
			}
			const previous = rules.get(text);
			if (previous !== undefined) writer.retract(previous);
			rules.set(text, piece);
			return;
		}
		writer._emit(body);
		return;
	}
	// Only the last of a set of identical declarations can be read, so each one
	// takes back the one it repeats — which is the only thing here that needs a
	// piece of its own. Keyed on the printed text, as the collected printer keys
	// its own pass.
	if (!dropping) {
		writer._emit(text);
		return;
	}
	const at = writer.emitRetractable(text);
	let seen = _frameSeenDeclarations[d];
	if (seen === null) {
		seen = new Map();
		_frameSeenDeclarations[d] = seen;
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
const _streamClose = (d, rule) => {
	const writer = /** @type {PrintContext} */ (_streamWriter);
	const minify = writer.options.mode === "minify";
	_frameSeenDeclarations[d] = null;
	_frameSeenRules[d] = null;
	_frameSeenLayers[d] = null;
	if (writer.isPending(_framePendingDepth[d])) {
		// Nothing inside printed. An empty rule paints nothing, so dropping it
		// leaves the cascade as it was — but only where the block itself carries no
		// meaning (see `DROPPABLE_WHEN_EMPTY_AT_RULES`).
		const i0 = _nodeIndex(rule);
		if (
			minify &&
			_transforms.removeDeadRules &&
			// Not while a `@namespace` after it could still be read: taking this
			// rule out would move one up to where the engine honours it.
			!(d === 0 && _namespacePrologueOpen) &&
			(_types[i0] === T_QUALIFIED_RULE ||
				DROPPABLE_WHEN_EMPTY_AT_RULES.has(
					_input.slice(_starts[i0] + 1, _aux0[i0]).toLowerCase()
				))
		) {
			writer.dropPending();
			return;
		}
		writer.flushPending();
	} else if (minify) {
		// The `;` the last declaration carries is the one a `}` makes redundant.
		writer.dropTrailing(_frameFirstChunk[d], CC_SEMICOLON);
	}
	writer._emit(minify ? "}" : "\n}");
};

/**
 * Fire an open rule's `enter` and walk its prelude — both are final at `{`.
 * @param {Rule} rule the open rule
 * @param {Node | null} parent enclosing rule
 * @param {number} index the rule's index among its siblings
 * @param {number} d the block's frame depth
 * @returns {boolean} whether `skipChildren()` declined its children
 */
const _streamEnterRule = (rule, parent, index, d) => {
	const i0 = _nodeIndex(rule);
	const ty = _types[i0];
	const b = _visitors[ty];
	if (b !== undefined && b.enter.length !== 0) {
		_walkSkip = false;
		_currentNode = rule;
		_currentParent = parent;
		_currentIndex = index;
		const e = b.enter;
		for (let i = 0; i < e.length; i++) e[i](A);
		const skip = _walkSkip;
		_walkSkip = false;
		if (skip) return true;
	}
	const ps = _listStarts[i0];
	const pe = ps + _listLens[i0];
	const prevSupports = _inSupportsPrelude;
	const prevMedia = _inMediaConditionPrelude;
	// Body-scoped, unlike the two prelude flags: the block streams past this call,
	// so `_streamConsumeBlock` puts them back once its `}` is reached.
	_framePrevProperty[d] = _inPropertyRule ? 1 : 0;
	_framePrevFunction[d] = _inFunctionRule ? 1 : 0;
	_framePrevFeatureValues[d] = _inFeatureValuesRule ? 1 : 0;
	if (ty === T_AT_RULE) _enterAtRulePrelude(i0);
	for (let i = ps; i < pe; i++) {
		_walkValue(_nodeRef(_flat[i]), rule, i - ps, _streamWriter);
	}
	_inSupportsPrelude = prevSupports;
	_inMediaConditionPrelude = prevMedia;
	return false;
};

/**
 * A block at `d` has grown past the threshold. Every ancestor still buffering
 * must be entered first, outermost in, so `enter` stays in source order; each
 * one then walks what it buffered (its two lists are each source-ordered, so
 * merging on start offset restores source order) before the deeper level does.
 * @param {number} d depth of the block that crossed the threshold
 */
const _streamActivate = (d) => {
	for (let k = 0; k <= d; k++) {
		if (_frameActive[k] === 1) continue;
		_frameActive[k] = 1;
		const rule = /** @type {Rule} */ (_nodeRef(_frameRule[k]));
		// Claim the body slot before `enter` can read it: a streamed rule hands its
		// children to the visitors, so its own block has to report as empty rather
		// than as `null`, which is how a rule with no block at all reads. Everything
		// a later child claims sits above this, so the slots come back per child.
		_setBody(rule, _EMPTY_LIST, _EMPTY_LIST);
		_frameBodyMark[k] = _declBodies.length;
		// The enclosing block has just been activated and drained, so its rule
		// counter is exactly how many siblings precede this one.
		const parentIndex = k === 0 ? 0 : _frameRuleIndex[k - 1]++;
		_frameParentIndex[k] = parentIndex;
		const skipped = _streamEnterRule(
			rule,
			k === 0 ? null : _nodeRef(_frameRule[k - 1]),
			parentIndex,
			k
		);
		if (_streamWriter !== undefined) _streamOpen(k, rule);
		const walk = !skipped && _recurseBlocks;
		_frameWalk[k] = walk ? 1 : 0;
		const decls = _frameDecls[k];
		const rules = _frameRules[k];
		_frameDecls[k] = null;
		_frameRules[k] = null;
		const dn = decls === null ? 0 : decls.length;
		const rn = rules === null ? 0 : rules.length;
		// Both counters end at what was buffered, so the children still to come
		// carry on from there whether or not this block's body was walked.
		_frameDeclIndex[k] = dn;
		_frameRuleIndex[k] = rn;
		if (!walk) continue;
		// Merging the two source-ordered lists on start offset restores source
		// order, while each child keeps the sibling index the batch walk gives it.
		let di = 0;
		let ri = 0;
		while (di < dn || ri < rn) {
			/** @type {Node} */
			let child;
			if (
				ri >= rn ||
				(di < dn &&
					_starts[_nodeIndex(/** @type {Declaration[]} */ (decls)[di])] <
						_starts[_nodeIndex(/** @type {Rule[]} */ (rules)[ri])])
			) {
				child = /** @type {Declaration[]} */ (decls)[di];
				_walkRule(child, rule, di, _streamWriter);
				di++;
			} else {
				child = /** @type {Rule[]} */ (rules)[ri];
				_walkRule(child, rule, ri, _streamWriter);
				ri++;
			}
			if (_streamWriter !== undefined) {
				_streamEmitChild(k, child);
				_streamWriter.dropStore();
			}
		}
	}
	// Only the deepest block may release: an ancestor's mark sits below the ids
	// its still-open descendants are using.
	if (_nodeCount > _peak) _peak = _nodeCount;
	if (_flatTop > _flatPeak) _flatPeak = _flatTop;
	_nodeCount = _frameMark[d];
	_flatTop = _frameFlatMark[d];
};

/**
 * Per-child sink of an *activated* block: walk the finished child, then release
 * every id it used. Module-level (no per-rule closure) — the depth-indexed frame
 * carries the open rule, its sibling counters and its mark. A block only reaches
 * for this once it has activated, so a small block never calls it.
 * @param {Rule | Declaration} node the finished child
 */
const _streamOnNode = (node) => {
	const d = _depth - 1;
	// A child rule that streamed on its own already entered, walked and exited
	// inline and released its ids; it reaches the sink already finished.
	if (node === _streamWalked) {
		// Already entered, printed and closed itself inline, straight into the
		// output — there is nothing left of it to emit here.
		_streamWalked = null;
	} else if (_frameWalk[d] === 1) {
		const index =
			_nodeTypeOf(node) === T_DECLARATION
				? _frameDeclIndex[d]++
				: _frameRuleIndex[d]++;
		_walkRule(node, _nodeRef(_frameRule[d]), index, _streamWriter);
		if (_streamWriter !== undefined) {
			_streamEmitChild(d, node);
			_streamWriter.dropStore();
		}
	}
	if (_nodeCount > _peak) _peak = _nodeCount;
	if (_flatTop > _flatPeak) _flatPeak = _flatTop;
	_nodeCount = _frameMark[d];
	_flatTop = _frameFlatMark[d];
	// The child is walked, so the body slots it and its subtree claimed go back
	// too — otherwise the one thing a streamed block still grew per child. Handed
	// back in batches: shortening the two arrays costs more than the compare, and
	// what a batch holds onto is a few dozen finished bodies.
	const bodyMark = _frameBodyMark[d];
	if (_declBodies.length >= bodyMark + _STREAM_BODY_SLACK) {
		_declBodies.length = bodyMark;
		_ruleBodies.length = bodyMark;
	}
};

/**
 * Consume a rule's block, streaming its children once the block grows past
 * `_STREAM_MIN_NODES`. A block that stays small is handed back materialized for
 * the ordinary walk, so it costs a collect and nothing else.
 * @param {TokenStream} ts token stream
 * @param {Rule} rule the rule whose block follows
 */
const _streamConsumeBlock = (ts, rule) => {
	const d = _depth;
	const blockStart = ts.next().start;
	ts.discard();
	if (d >= _STREAM_MAX_DEPTH) {
		// Deeper than the frame table: fall back to the materializing path.
		consumeABlocksContentsInto(ts);
		const decls = _bcDecls;
		const rules = _bcRules;
		const c = ts.next();
		ts.discard();
		_setBody(rule, decls, rules);
		_setBlock(rule, blockStart);
		_setEnd(rule, c.type === TT_RIGHT_CURLY_BRACKET ? c.end : c.start);
		return;
	}
	// Nothing is written to the frame here: the block keeps its state in locals
	// and writes one only if it could still be read (see `_streamPublishFrame`),
	// so a rule whose block is all declarations costs what it always did.
	_depth = d + 1;
	if (_depth > _frameHighWater) _frameHighWater = _depth;
	consumeABlocksContentsInto(ts, undefined, d, rule);
	_depth = d;
	const streamed = _bcStreamed;
	const decls = _bcDecls;
	const rules = _bcRules;
	const close = ts.next();
	const end = close.type === TT_RIGHT_CURLY_BRACKET ? close.end : close.start;
	ts.discard();
	_setBlock(rule, blockStart);
	_setEnd(rule, end);
	if (!streamed) {
		// Never grew: hand the body back, so the ordinary walk visits it and
		// `A.declarations` / `A.childRules` still read it.
		_setBody(rule, decls, rules);
		return;
	}
	// Streamed: `_streamActivate` already claimed the body slot, empty. The exit
	// visitors still run here; the rule's own `}` follows them, where the printer
	// would have run for a rule printed in one piece.
	_exitNode(
		rule,
		d === 0 ? null : _nodeRef(_frameRule[d - 1]),
		_frameParentIndex[d],
		_visitors[_types[_nodeIndex(rule)]],
		undefined
	);
	if (_streamWriter !== undefined) _streamClose(d, rule);
	_inPropertyRule = _framePrevProperty[d] === 1;
	_inFunctionRule = _framePrevFunction[d] === 1;
	_inFeatureValuesRule = _framePrevFeatureValues[d] === 1;
	_streamWalked = rule;
};

/** @typedef {{ node: Node, offset: number, line: number | undefined, column: number | undefined, entry: RuleEntry, owned: boolean, own: BlockSpans | undefined }} HeldTopLevel one top-level rule held back for a join, with where it stood and what it recorded */

// The one top-level rule held back, so the next can be joined onto it (see
// `_mergeAdjacentRules` — the same merge, across nodes the writer takes one at a
// time). Null when nothing is held.
/** @type {HeldTopLevel | null} */
let _heldTopLevel = null;

// The named layer blocks the stylesheet's own children have emitted, by their
// opener: a later one of the same name is folded into the piece the first went
// out as, as `_frameSeenLayers` does inside a block.
/** @type {Map<string, SeenLayer> | null} */
let _seenTopLevelLayers = null;

const AT_RULE_NAME_RE = /^@([^\s({;]+)/;

/**
 * The name an at-rule prelude opens with, lowercased.
 * @param {string} prelude the prelude, `@` included
 * @returns {string} the name, or "" when it names none
 */
const _atRuleName = (prelude) => {
	const match = AT_RULE_NAME_RE.exec(prelude);
	return match === null ? "" : match[1].toLowerCase();
};

// Stands for a top-level node that is one rule whatever its text ends up being,
// a qualified rule joined onto the one beside it included.
/** @type {BlockSpans} */
const _WHOLE_TEXT_SPANS = Object.freeze({
	bodyAt: 0,
	prelude: "",
	keyPrelude: "",
	qualified: true,
	spans: _NO_RULE_SPANS
});

/**
 * What a finished top-level node recorded while it printed. A node id is a slot
 * the next top-level node reuses, so this reads at the one moment the node still
 * names itself — the writer holds a rule back a node, and by then it does not.
 * @param {Node} node the top-level node, freshly printed
 * @returns {BlockSpans | undefined} its entry, or undefined when it records none
 */
const _drainTopLevelSpans = (node) => {
	// Its children's entries were spliced off as their parent assembled its body,
	// so what is left is this node's own.
	// A block a streamed parent emitted leaves its entry behind — nothing spliced
	// it off — so only a lone entry is this node's own.
	const own = _blockSpans.length === 1 ? _blockSpans[0] : undefined;
	_blockSpans.length = 0;
	if (own !== undefined) return own;
	return _nodeTypeOf(node) === T_QUALIFIED_RULE ? _WHOLE_TEXT_SPANS : undefined;
};

/**
 * The rules a finished top-level node carries, where they land in its text. A
 * qualified rule is one rule however it nests; an at-rule states conditions its
 * body is read under, so its spans come out with its prelude on their keys.
 * @param {BlockSpans | undefined} own what it recorded, from {@link _drainTopLevelSpans}
 * @param {string} text its printed text
 * @returns {RuleSpan[] | null} the spans, or null when it carries no rule
 */
const _topLevelSpans = (own, text) => {
	if (own === undefined) return null;
	if (own === _WHOLE_TEXT_SPANS) {
		return [{ scope: _rootScope(), key: text, at: 0, len: text.length }];
	}
	/** @type {RuleSpan[]} */
	const out = own.qualified
		? [{ scope: _rootScope(), key: text, at: 0, len: text.length }]
		: [];
	for (const span of own.spans) {
		out.push({
			scope: _enclosingRuleScope(span.scope, own.keyPrelude),
			key: span.key,
			at: own.bodyAt + span.at,
			len: span.len
		});
	}
	return out;
};

/**
 * Take a top-level node, and with it every rule an identical later one has yet
 * to make dead. A rule already taken whose key comes round again is read for
 * nothing, so the piece holding it is written again without it — pieces are
 * joined only when the sheet ends, so one taken long ago is still reachable.
 * @param {PrintContext} writer the print context
 * @param {number} piece the piece the node was taken as
 * @param {string} text the node's printed text
 * @param {RuleSpan[]} spans where its rules land in it
 * @param {BlockSpans | undefined} own what the node recorded while printing
 * @param {string} chain what encloses it, when it is not a top-level node
 * @returns {TakenPiece} the piece, for a fold that grows it
 */
const _takeDeduped = (writer, piece, text, spans, own, chain) => {
	// A block the cuts empty is one written empty here, which the printer drops —
	// but only where the block itself carries no meaning.
	const empties =
		own !== undefined &&
		own !== _WHOLE_TEXT_SPANS &&
		_transforms.removeDeadRules &&
		(own.qualified ||
			(own.prelude.charCodeAt(0) === CC_AT_SIGN &&
				DROPPABLE_WHEN_EMPTY_AT_RULES.has(_atRuleName(own.prelude))))
			? own.bodyAt
			: -1;
	/** @type {TakenPiece} */
	const taken = { piece, text, spans: [], empties };
	_noteSpans(writer, taken, spans, chain);
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
const _noteSpans = (writer, taken, spans, chain) => {
	// Every span joins the piece before any cutting: a cut here moves what
	// `taken.spans` holds, and one not yet pushed would keep its old offset.
	for (const span of spans) {
		if (chain.length !== 0) span.scope = _enclosingRuleScope(span.scope, chain);
		taken.spans.push(span);
	}
	for (const span of spans) {
		const rules = span.scope.rules;
		const before = rules.get(span.key);
		if (before !== undefined) _cutSpan(writer, before.taken, before.span);
		rules.set(span.key, { taken, span });
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
const _cutSpan = (writer, taken, span) => {
	if (span.len === 0) return;
	let from = span.at;
	let len = span.len;
	// The rule stood last in its block, so the `;` in front of it is one the
	// printer drops itself — it goes with the rule rather than being left behind.
	if (
		taken.text.charCodeAt(from + len) === CC_RIGHT_CURLY &&
		taken.text.charCodeAt(from - 1) === CC_SEMICOLON
	) {
		from -= 1;
		len += 1;
	}
	taken.text = `${taken.text.slice(0, from)}${taken.text.slice(from + len)}`;
	if (taken.empties !== -1 && taken.text.length === taken.empties + 1) {
		taken.text = "";
	}
	writer.rewriteRetractable(taken.piece, taken.text);
	const end = from + len;
	for (const other of taken.spans) {
		if (other === span) continue;
		// One inside what went is gone with it. One that held it still describes
		// what is left of it, which a later copy of it restates in full, so it
		// only shrinks by what went.
		if (other.at >= from && other.at + other.len <= end) other.len = 0;
		else if (other.at <= from && other.at + other.len >= end) other.len -= len;
		else if (other.at > from) other.at -= len;
	}
	span.len = 0;
};

/**
 * Hand one finished top-level node to the writer, gathering a named `@layer`
 * block into the first sibling of its name — they are one layer however far
 * apart they stand, and what separates them is in another layer or in none,
 * ordered against these by the cascade rather than by where it sits, so moving
 * the later body up is not a move the cascade can see. `_mergeNamedLayerBlocks`
 * is the same gather one block down. The node goes out with whatever text it
 * ended up carrying, so a block a join already grew is the one gathered into.
 * @param {PrintContext} writer the print context
 * @param {Node} node the top-level node
 * @param {number} offset the node's source offset
 * @param {number | undefined} line 0-based source line of the node's start
 * @param {number | undefined} column 0-based source column of the node's start
 * @param {string} text the text the node goes out as
 * @param {BlockSpans=} own what it recorded while printing
 * @returns {void}
 */
const _emitTopLevel = (writer, node, offset, line, column, text, own) => {
	const printing = writer.options.mode === "minify";
	// Folding two named layer blocks into one, and taking back a rule an
	// identical later one makes dead, each answer to their own option.
	const minify = printing && _transforms.removeDeadRules;
	const opener =
		printing && _transforms.mergeRules ? _namedLayerOpener(text) : null;
	// Nothing folds back over a kept comment — it was written above what follows
	// it — nor over a sibling naming a layer any other way, since it writes into
	// one of these and the order within a layer is the cascade's.
	if (
		_seenTopLevelLayers !== null &&
		(writer.hasInsertBefore(offset) ||
			(opener === null && minify && POSITIONAL_AT_RULE_RE.test(text)))
	) {
		_seenTopLevelLayers.clear();
	}
	if (opener === null) {
		// Taking back a rule an identical later one makes dead is a rewrite, which
		// is minifying's to make: beautifying hands back every rule it was given.
		const spans = minify ? _topLevelSpans(own, text) : null;
		if (spans === null) {
			writer.take(node, offset, line, column, text);
			return;
		}
		_takeDeduped(
			writer,
			writer.takeRetractable(node, offset, line, column, text),
			text,
			spans,
			own,
			""
		);
		return;
	}
	if (_seenTopLevelLayers === null) _seenTopLevelLayers = new Map();
	const first = _seenTopLevelLayers.get(opener);
	const deep = _opensNestedLayer(text, opener);
	_noteLayerBlock(
		_seenTopLevelLayers,
		opener.slice(NAMED_LAYER_OPENER_HEAD, -1).trim(),
		deep
	);
	if (first === undefined || (deep && first.subtree)) {
		_seenTopLevelLayers.set(opener, {
			at: writer.takeRetractable(node, offset, line, column, text),
			subtree: false
		});
		return;
	}
	// Both bodies keep their order, so the layer reads as it was written.
	writer.foldIntoRetractable(first.at, text.slice(opener.length));
};

/**
 * Emit the rule held back for a join, as it stands. Its own text is what a
 * grown join left it with, and what it recorded while printing goes with it.
 * @param {PrintContext} writer the print context
 * @param {HeldTopLevel} held the held rule
 * @returns {void}
 */
const _emitHeld = (writer, held) => {
	_emitTopLevel(
		writer,
		held.node,
		held.offset,
		held.line,
		held.column,
		held.entry.text,
		held.own
	);
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
const _takeTopLevel = (node, writer, offset, line, column) => {
	const held = _heldTopLevel;
	// The node's own text first — taking the held one clears the store it sits in.
	const own = writer.get(node);
	// Read where the node stands, not where it is emitted: the writer holds a
	// rule back one node, by when the prologue has closed behind it. A rule taken
	// back from in front of a `@namespace` would move one up into a live
	// position, so one standing there is never offered.
	const drained = _drainTopLevelSpans(node);
	const spans = _namespacePrologueOpen ? undefined : drained;
	const entry = _ruleEntryOf(node, own);
	// A prefixed rule an unprefixed twin would make dead weight goes out as a piece
	// of its own, so the twin can take it back from wherever it stands rather than
	// only from the next rule. It is not offered for joining first: a rule that may
	// still be taken back must be one piece and one rule.
	const candidate = _prefixDropCandidate;
	_prefixDropCandidate = null;
	if (candidate !== null && candidate.node === node) {
		if (held !== null) {
			_heldTopLevel = null;
			_emitHeld(writer, held);
		}
		const at = writer.takeRetractable(node, offset, line, column, own);
		const scope = _prefixScope(null);
		if (scope.retractable === null) scope.retractable = new Map();
		scope.retractable.set(candidate.signature, at);
		return;
	}
	if (entry.prelude === -1) {
		// Not a rule this can join: flush what is held, then take it as it stands.
		// A node printing nothing leaves the two around it adjacent in the output.
		// Its kept comments stay queued: they land where it stood, which is after
		// the held rule, and until then they block a join across that gap.
		if (own.length === 0) return;
		if (held !== null) {
			_heldTopLevel = null;
			_emitHeld(writer, held);
		}
		_emitTopLevel(writer, node, offset, line, column, own, spans);
		return;
	}
	// A kept comment between the two was written above the second rule.
	if (held !== null && !writer.hasInsertBefore(offset)) {
		const merged = _joinRuleEntries(held.entry, entry, held.owned);
		if (merged !== null) {
			held.entry = merged;
			held.owned = true;
			// The join rewrote its text, so what it recorded no longer names its
			// own offsets — it is one rule, and only that.
			held.own = _WHOLE_TEXT_SPANS;
			return;
		}
	}
	if (held !== null) {
		_emitHeld(writer, held);
	}
	// What was written above this rule is emitted above it now, so the next
	// node's check sees only the gap between the two — and nothing folds back
	// over it, so the layer blocks above it stop being ones to gather into.
	if (_seenTopLevelLayers !== null && writer.hasInsertBefore(offset)) {
		_seenTopLevelLayers.clear();
	}
	writer.flushInsertsBefore(offset);
	_heldTopLevel = {
		node,
		offset,
		line,
		column,
		entry,
		owned: false,
		own: spans
	};
};

/**
 * Emit the held top-level rule, if any. Called once the stylesheet is consumed.
 * @param {PrintContext=} writer the print context
 * @returns {void}
 */
const _flushTopLevel = (writer) => {
	const held = _heldTopLevel;
	if (held === null) return;
	_heldTopLevel = null;
	if (writer !== undefined) {
		_emitHeld(writer, held);
	}
};

/**
 * Emit a whole `block-contents` print: the held nodes are one declaration list,
 * so they go through the same composition a rule's block does and land as one
 * piece. The list is what a `style=""` attribute holds, so it is small.
 * @param {(Rule | Declaration)[]} nodes the top-level nodes, in source order
 * @param {PrintContext} writer the print context holding each one's text
 * @returns {void}
 */
const _emitBlockContents = (nodes, writer) => {
	/** @type {Declaration[]} */
	const decls = [];
	/** @type {Rule[]} */
	const rules = [];
	for (const node of nodes) {
		if (_types[_nodeIndex(node)] === T_DECLARATION) {
			decls.push(/** @type {Declaration} */ (node));
		} else {
			rules.push(/** @type {Rule} */ (node));
		}
	}
	const minify = writer.options.mode === "minify";
	const { body } = _composeBlockBody(
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
	const offset = nodes.length === 0 ? 0 : A.start(nodes[0]);
	const at = writer.mapWanted ? _locConverter.get(offset) : undefined;
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
const _closeNamespacePrologue = (node) => {
	if (_namespacePrologueOpen && _types[_nodeIndex(node)] === T_QUALIFIED_RULE) {
		_namespacePrologueOpen = false;
	}
};

/**
 * The `grammar` streaming sink: walk one top-level node, then recycle the
 * buffers for the next.
 * @param {Rule | Declaration} node top-level node
 * @param {PrintContext=} writer print context when printing, else undefined
 */
const _walkTopLevel = (node, writer) => {
	if (node === _streamWalked) {
		_streamWalked = null;
		// A streamed rule's text is already out, so nothing can take it back — and
		// the node is about to be recycled, which its candidacy must not outlive.
		_prefixDropCandidate = null;
		_closeNamespacePrologue(node);
		_recycleTopLevel(node);
		return;
	}
	_walkRule(node, null, 0, writer);
	// A declaration list is composed as a whole, so its nodes are kept — their
	// printed text stays reachable through the writer, which recycling would lose.
	if (_blockContentsNodes !== null) {
		_blockContentsNodes.push(node);
		return;
	}
	// The walk fired each node's printer into the context; hand this finished
	// top-level node to the writer with its source position — it flushes any kept
	// comments before it, records the source-map anchor and appends its text (the
	// loc converter is 1-based line / 0-based column; source maps are 0-based).
	if (writer !== undefined) {
		// Only the start is wanted, and only for a map: `loc` would walk to the end
		// as well and box both, per top-level node, for a line nobody reads.
		if (writer.mapWanted) {
			const start = _locConverter.get(_starts[_nodeIndex(node)]);
			_takeTopLevel(node, writer, A.start(node), start.line - 1, start.column);
		} else {
			_takeTopLevel(node, writer, A.start(node));
		}
	}
	_closeNamespacePrologue(node);
	// The held rule keeps its own entry, so the map is done with.
	_ruleEntry.clear();
	if (_nodeCount > _peak) _peak = _nodeCount;
	if (_flatTop > _flatPeak) _flatPeak = _flatTop;
	_nodeCount = 0;
	_flatTop = 0;
	// Body indices recycle with node ids.
	_declBodies.length = 0;
	_ruleBodies.length = 0;
};

/**
 * `_walkTopLevel` without the walk, for a visitor-less `process` call: the
 * walk's only effect is visitor dispatch, so just recycle the buffers.
 * @param {Rule | Declaration} node top-level node
 */
const _recycleTopLevel = (node) => {
	if (_nodeCount > _peak) _peak = _nodeCount;
	if (_flatTop > _flatPeak) _flatPeak = _flatTop;
	_nodeCount = 0;
	_flatTop = 0;
	_declBodies.length = 0;
	_ruleBodies.length = 0;
};

// The store buffers grow to the largest single top-level rule ever parsed and
// live at module level; above this capacity they are re-shrunk after a parse
// so one pathological rule can't pin megabytes for the process lifetime.
const _SHRINK_CAPACITY = 65536;

// `@license` / `@preserve` mark a comment for preservation (terser keeps the
// same annotations for JS); the JS-only `@cc_on` is not meaningful in CSS.
const _KEEP_COMMENT_RE = /@(?:license|preserve)/i;

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
const _isKeptComment = (src, start, end) => {
	const marker = src.charCodeAt(start + 2);
	const kept = _commentsKept;
	// A `/*#` pragma is a link to a source map rather than a comment, so the
	// banner level keeps it; a selector of the author's still decides it.
	if (marker === CC_NUMBER_SIGN && kept === "some") return true;
	if (typeof kept === "boolean") return kept;
	if (kept === "some") {
		return (
			marker === CC_EXCLAMATION || _KEEP_COMMENT_RE.test(src.slice(start, end))
		);
	}
	// A pattern or a predicate of the author's, over the comment's own text —
	// which stands in for the banner rule rather than beside it, as terser's
	// `format.comments` does.
	return kept(src.slice(start + 2, end - 2)) === true;
};

// Every rewrite on, which is what a print with no `transforms` option makes and
// what the walk-only passes hold. Frozen, since it is shared rather than copied.
/** @type {Required<CssTransformOptions>} */
const _ALL_TRANSFORMS = Object.freeze({
	comments: "some",
	mergeLonghands: true,
	mergeRules: true,
	normalizeQuotes: true,
	reduceFunctions: true,
	removeDeadRules: true,
	shortenColors: true,
	shortenMediaQueries: true,
	shortenNumbers: true,
	shortenSelectors: true,
	shortenValues: true
});

/**
 * The rewrites this print makes, resolved once: each name is what the options
 * set it to, and what `_ALL_TRANSFORMS` gives it where they set nothing — so no
 * read of the result asks whether the option was given. `comments` keeps
 * whatever it was given, which is still falsy only when it is `false`.
 *
 * Always a copy, and always made the one way: spreading the table and then
 * writing over a name it already has leaves the object's shape alone, so every
 * read of the result — and there is one per token — sees a single hidden class.
 * Handing the frozen table itself back where nothing is set would save this
 * object and cost each of those reads a second shape, `Object.freeze` giving a
 * frozen object a map of its own.
 * @param {CssTransformOptions | undefined} options the `transforms` option
 * @returns {Required<CssTransformOptions>} every rewrite resolved
 */
const _transformsFrom = (options) => {
	/** @type {EXPECTED_ANY} */
	const out = { ..._ALL_TRANSFORMS };
	if (options !== undefined) {
		for (const name of Object.keys(_ALL_TRANSFORMS)) {
			const value = /** @type {EXPECTED_ANY} */ (options)[name];
			if (value !== undefined) out[name] = value;
		}
	}
	return out;
};

// The same table, as a copy, for the reason `_transformsFrom` always makes one.
/** @type {Required<CssTransformOptions>} */
const _DEFAULT_TRANSFORMS = _transformsFrom(undefined);

/**
 * The `comments` option resolved to what it means per comment: `true` every
 * one, `false` none, `"some"` the ones that carry something, or a predicate
 * over the comment's own text — which is what a pattern compiles to here, so no
 * print re-reads one per comment. A pattern is matched from the start each
 * time, since a `g` flag would otherwise carry an index between comments.
 * @param {Required<CssTransformOptions>["comments"]} comments the option
 * @returns {boolean | "some" | ((comment: string) => boolean)} what it keeps
 */
const _keptComments = (comments) => {
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
 * The per-transform switches out of a wider options object — what
 * `optimization.minimize.css` names beside `environment` and the two rewrites
 * that are off until asked for. Exported so the minify functions the minimizer
 * plugin ships to its workers can pick them without repeating the names.
 * @param {EXPECTED_OBJECT} options an options object that may carry them
 * @returns {CssTransformOptions | undefined} the switches, or undefined when none is set
 */
const pickTransforms = (options) => {
	/** @type {EXPECTED_ANY} */
	let out;
	for (const name of Object.keys(_ALL_TRANSFORMS)) {
		const value = /** @type {EXPECTED_ANY} */ (options)[name];
		if (value === undefined) continue;
		if (out === undefined) out = {};
		out[name] = value;
	}
	return out;
};

/**
 * The CSS `SourceProcessor` grammar: consume top-level rules one at a time
 * (§5.4.1) and walk each immediately, firing `enter` / `exit` in source order
 * without building a whole-stylesheet array first. `recurseBlocks: false` skips
 * walking block bodies' (eagerly parsed) nested rules (caller drives nested
 * traversal itself). When `writer` is given the same walk also prints: it is
 * threaded down the walk and each node's printer builds its text into it as the
 * node finishes — one parse, no re-tokenization. `skip` is ignored while printing
 * (it needs every node).
 * @param {string} input source text
 * @param {CompiledVisitorMap} visitors compiled visitor map
 * @param {PrintContext | undefined} writer the print context to build output into, or undefined (walk only)
 * @param {CssProcessOptions} options process options
 */
const grammar = (input, visitors, writer, options) => {
	const locConverter = options.locConverter || new LocConverter(input);
	_setupParse(input, locConverter);
	// Printing (a writer) needs every node for a faithful serialization, so `skip`
	// is ignored while printing — it only applies to walk-only visitor passes.
	const skip = writer !== undefined ? undefined : options.skip;
	_skipTypes = (skip && skip.types) || _NO_SKIP_TYPES;
	_skipActive = _skipTypes !== _NO_SKIP_TYPES;
	_skipSelectorPrelude = skip !== undefined && skip.selectorPrelude === true;
	_skipAtRulePrelude = skip !== undefined && skip.atRulePrelude === true;
	_recurseBlocks = options.recurseBlocks !== false;
	// The walk always streams: there is nothing to trade off, since a block under
	// the threshold is collected and walked in one batch exactly as it always was.
	// Printing streams with it — the rule's opener goes out when its block opens
	// and each child straight after it — so the printer never assembles a parent
	// from text a streamed body has already released.
	_streamBlocks = true;
	_streamWriter = writer;
	_printing = writer !== undefined;
	_convertLengthUnits =
		writer !== undefined && writer.options.convertLengthUnits === true;
	_rewriteCustomProperties =
		writer !== undefined && writer.options.rewriteCustomProperties === true;
	_transforms = _transformsFrom(
		writer === undefined ? undefined : writer.options.transforms
	);
	_commentsKept = _keptComments(_transforms.comments);
	_unitScale = _unitScaleFor(_convertLengthUnits);
	_renderEmbeddedSource =
		writer === undefined ? undefined : writer.options.renderEmbeddedSource;
	_deferEmbeddedSource =
		writer === undefined ? undefined : writer.options.deferEmbeddedSource;
	const environment =
		writer !== undefined ? writer.options.environment : undefined;
	// Vendor prefixing is on for a minifying print with a browserslist selection,
	// and off for everything else — an empty selection names no browser to
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
		_seenPrefixRules = null;
		_prefixBrowsers = null;
		_prefixingOn = false;
	} else {
		_useBrowsers(browsers);
		// The selection answers two questions, and `vendorPrefixes` turns off only
		// the first: which prefixes to write, and which spellings a target reads.
		_prefixingOn =
			_prefixBrowsers !== null &&
			/** @type {CssEnvironment} */ (environment).vendorPrefixes !== false;
		_seenPrefixRules = _prefixingOn ? new Map() : null;
	}
	// Read once per print: the selection cannot change under a single stylesheet,
	// and each of these is asked per declaration.
	_hexAlphaAllowed = _targetSupports("colorHexAlpha");
	_doublePositionAllowed = _targetSupports("gradientDoublePosition");
	_insetShorthandAllowed = _targetSupports("insetShorthand");
	_rangeSpellingAllowed = _targetSupports("mediaQueryRange");
	_placeShorthandAllowed = _targetSupports("placeShorthand");
	_overflowTwoValuesAllowed = _targetSupports("overflowTwoValues");
	_visitors = visitors;
	_commentBucket = visitors[T_COMMENT];

	// Comment sink: fire the `Comment` visitor bucket (if registered) and, when
	// printing, keep license/important comments (`/*!`, `@license`, `@preserve`) —
	// the ecosystem default (cssnano / clean-css / csso keep `/*!`; terser adds the
	// annotations). A kept comment is handed to the writer, which re-emits it before
	// the next top-level node. Both print modes keep the same ones, so beautifying
	// and minifying the same stylesheet carry the same banners. No comment visitor
	// and no printing => no callback (comments are skipped at zero cost).
	/** @type {((input: string, start: number, end: number) => number) | undefined} */
	let onComment;
	if (writer !== undefined) {
		const w = writer;
		onComment = (src, start, end) => {
			if (_commentBucket !== undefined) _grammarOnComment(src, start, end);
			if (_isKeptComment(src, start, end)) {
				w.insert(start, src.slice(start, end));
			}
			return end;
		};
	} else if (_commentBucket !== undefined) {
		onComment = _grammarOnComment;
	}

	// Stream each top-level node (selected by `as`) to the walker the moment it's
	// consumed, rather than collecting them first — so the whole AST is never
	// held at once; peak heap is ~one top-level node's subtree.
	const ts = new TokenStream(input, 0, locConverter, onComment);
	const as = options.as || "stylesheet";
	const consume = TOP_LEVEL_CONSUMERS[as] || consumeAStylesheetsContents;
	// A block's contents are one declaration list, so printing them is composing
	// that list — the same production a rule's block is, and the only top-level
	// one that is held rather than streamed.
	if (as === "block-contents" && writer !== undefined) {
		_blockContentsNodes = [];
	}
	// With zero registered buckets the walk is a pure no-op traversal — hand the
	// consumer a recycle-only sink instead.
	let anyVisitor = false;
	for (let i = 0; i < visitors.length; i++) {
		if (visitors[i] !== undefined) {
			anyVisitor = true;
			break;
		}
	}
	try {
		// Bind the writer into the per-node sink only when printing, so the
		// walk-only path keeps passing the module function with no per-parse closure.
		// A printer consumes the walk, so only a writer-less, visitor-less process
		// call can take the recycle-only sink.
		consume(
			ts,
			writer === undefined
				? anyVisitor
					? _walkTopLevel
					: _recycleTopLevel
				: (node) => _walkTopLevel(node, writer)
		);
		if (_blockContentsNodes === null) {
			_flushTopLevel(writer);
		} else {
			_emitBlockContents(
				_blockContentsNodes,
				/** @type {PrintContext} */ (writer)
			);
		}
	} finally {
		_blockContentsNodes = null;
		// Each held write keeps its offered source — a decoded `data:` payload can
		// be a whole document — and a closure over it, so both go with the parse.
		_renderEmbeddedSource = undefined;
		_deferEmbeddedSource = undefined;
		_heldTopLevel = null;
		_seenTopLevelLayers = null;
		_ruleEntry.clear();
		_seenPrefixRules = null;
		// The parsed selection itself stays in `_parsedBrowsersMemo`, which the next
		// asset of the same build reuses; only this parse's pointer is dropped.
		_prefixBrowsers = null;
		_prefixDropCandidate = null;
		// Drop the module-level column references so the last parsed source (and
		// its LocConverter / child lists / visitors) don't stay alive between
		// parses.
		_streamBlocks = false;
		_streamWalked = null;
		_streamWriter = undefined;
		_depth = 0;
		// A frame is left as the block closed it (nothing reads a closed one), so
		// the last open path's buffers are dropped here rather than per block.
		const used = _frameHighWater + 1;
		_frameDecls.fill(null, 0, used);
		_frameRules.fill(null, 0, used);
		_frameSeenDeclarations.fill(null, 0, used);
		_frameSeenRules.fill(null, 0, used);
		_frameChainKey.fill(null, 0, used);
		_frameSeenLayers.fill(null, 0, used);
		_frameHighWater = 0;
		_blockSpans.length = 0;
		_ruleScopes = null;
		_rootRuleScope = null;
		_anonymousLayers = 0;
		_input = "";
		_locConverter = /** @type {LocConverter} */ (/** @type {unknown} */ (null));
		_declBodies.length = 0;
		_ruleBodies.length = 0;
		_flatTop = 0;
		_listPool.length = 0;
		if (_flat.length > _SHRINK_CAPACITY) {
			_flatGrowHint = _flatPeak;
			_flat = new Int32Array(0);
		}
		_visitors = /** @type {CompiledVisitorMap} */ (/** @type {unknown} */ ([]));
		_commentBucket = undefined;
		if (_capacity > _SHRINK_CAPACITY) {
			// +1: node ids are 1-based and grow fires at `id >= capacity`.
			_growHint = _peak + 1;
			_capacity = 0;
			_releaseColumns();
		}
		_peak = 0;
		_flatPeak = 0;
	}
};

/**
 * Whether a pending token separator is safe to drop *before* `cc`: next to
 * `{ } ; , )` it never changes meaning (`)` only ever closes a group).
 * @param {number} cc first code point of the text about to be written
 * @returns {boolean} true when the separator can be dropped
 */
const _dropSeparatorBefore = (cc) =>
	cc === CC_LEFT_CURLY ||
	cc === CC_RIGHT_CURLY ||
	cc === CC_SEMICOLON ||
	cc === CC_COMMA ||
	cc === CC_RIGHT_PARENTHESIS;

/**
 * Whether a pending token separator is safe to drop *after* `cc`: next to
 * `{ } ; , (` it never changes meaning. The parens are asymmetric on purpose —
 * dropping a space *before* `(` could turn `x (y)` into the function `x(y)`, and
 * one *after* `)` could turn `:not(a) b` into the compound `:not(a)b`, so `(` is
 * only safe on this (after) side and `)` only on the before side.
 * @param {number} cc last emitted code point
 * @returns {boolean} true when the separator can be dropped
 */
const _dropSeparatorAfter = (cc) =>
	cc === CC_LEFT_CURLY ||
	cc === CC_RIGHT_CURLY ||
	cc === CC_SEMICOLON ||
	cc === CC_COMMA ||
	cc === CC_LEFT_PARENTHESIS;

/**
 * What the CSS printer may be told, on top of the `mode` every language has —
 * the printing slice of `CssProcessOptions`, named once so nothing outside CSS
 * has to enumerate it.
 * @typedef {Pick<CssProcessOptions, "environment" | "convertLengthUnits" | "rewriteCustomProperties" | "renderEmbeddedSource" | "deferEmbeddedSource" | "transforms">} CssPrintOptions
 */

/** @typedef {import("../util/SourceProcessor").PrintContext<CssPath, Node, CssPrintOptions>} PrintContext */

// === Spacing: the whole safe-spacing discipline is CSS-specific (a token
// separator is safe to drop next to `{ } ; , ( )` — the asymmetric paren rule in
// `_dropSeparator*`), so it lives with `printer`, not the generic context.

// A lone space marker a whitespace token prints; `_join` resolves it. Real tokens
// print with their delimiters (a string keeps its quotes), so it never collides.
const _SEP = " ";

/**
 * Whether a token separator between two code points must be kept.
 * @param {number} lastCode last emitted code point
 * @param {number} nextCode first code point of the next fragment
 * @returns {boolean} true when the separator must be kept
 */
const _keepSeparator = (lastCode, nextCode) =>
	!_dropSeparatorAfter(lastCode) && !_dropSeparatorBefore(nextCode);

// A child / adjacent-sibling / general-sibling combinator. Whitespace around
// one is insignificant, but only at the top level of a selector — inside `[…]`
// (`~=`) or `(…)` (`nth-child(2n+1)`) these are matchers/`An+B`, so combinator
// trimming is applied to a qualified rule's prelude join alone (`isSelector`).
/**
 * @param {number} cc a code point
 * @returns {boolean} true for `>` / `+` / `~`
 */
const _isCombinator = (cc) =>
	cc === CC_GREATER_THAN_SIGN || cc === CC_PLUS_SIGN || cc === CC_TILDE;

// What separates the parts of a query condition: a media-feature range
// comparison (`<`, `>`, `=`, and the `<=` / `>=` pairs they build) and the `:`
// of a plain feature test. Whitespace around one is insignificant there, but the
// same code points mean something else in a selector (combinators, and `:`
// starting a pseudo-class) and in a declaration value (`calc()` operators) — so
// this trimming is applied to a `(…)` condition outside a value alone.
/**
 * @param {number} cc a code point
 * @returns {boolean} true for `<` / `>` / `=` / `:`
 */
const _isConditionSeparator = (cc) =>
	cc === CC_LESS_THAN_SIGN ||
	cc === CC_GREATER_THAN_SIGN ||
	cc === CC_EQUALS_SIGN ||
	cc === CC_COLON;

// What a `_join` may drop a separator next to.
const _TRIM_NOTHING = 0;
const _TRIM_COMBINATORS = 1; // a qualified rule's selector prelude
const _TRIM_CONDITIONS = 2; // a query condition's `(…)` block
const _TRIM_MATH = 3; // a math function's `*` / `/`, which need no whitespace
// A declaration value's whitespace only separates tokens, so it is kept exactly
// where joining would fuse two — unlike a selector, where it is a combinator.
const _TRIM_SEPARATORS = 4;

/**
 * @param {number} trim one of the `_TRIM_*` modes
 * @param {number} cc a code point
 * @returns {boolean} whether a separator next to `cc` may be dropped
 */
const _isTrimmable = (trim, cc) => {
	if (trim === _TRIM_COMBINATORS) return _isCombinator(cc);
	if (trim === _TRIM_CONDITIONS) return _isConditionSeparator(cc);
	// CSS Values 4 §10.1: `+` and `-` require whitespace on both sides — without
	// it the sign would read as part of the next number — but `*` and `/` do not.
	if (trim === _TRIM_MATH) {
		return cc === CC_ASTERISK || cc === CC_SOLIDUS;
	}
	return false;
};

/**
 * Whether a code point can continue an identifier. The lookup table only spans
 * ASCII, so non-ASCII — always an ident code point (§4.2) — is folded in here.
 * @param {number} cc a code point
 * @returns {boolean} true when `cc` is an ident code point
 */
const _isIdentLike = (cc) => cc >= 128 || _isIdentCodePoint(cc);

/**
 * Whether what precedes `at` lets a number start there: an ident running into
 * the position carries the digits instead, and `#` and `@` carry their own.
 * @param {string} out everything emitted so far
 * @param {number} at index a number would start at
 * @returns {boolean} true when a number can start at `at`
 */
const _startsNumber = (out, at) => {
	if (at === 0) return true;
	const before = out.charCodeAt(at - 1);
	return !(
		_isIdentLike(before) ||
		before === CC_REVERSE_SOLIDUS ||
		before === CC_NUMBER_SIGN ||
		before === CC_AT_SIGN
	);
};

/**
 * Whether the run of digits `out` ends with is a number rather than the tail of
 * an ident: `1` is, the `1` of `.p1` is not, and only a number can take a `.` on.
 * @param {string} out everything emitted so far
 * @returns {boolean} true when `out` ends in a number
 */
const _endsWithNumber = (out) => {
	let at = out.length;
	while (at > 0 && _isDigit(out.charCodeAt(at - 1))) at--;
	if (at === out.length) return false;
	// A sign signs a number only where a number could start: the `-1` of
	// `margin:-1` is signed, the `-1` of `.p-1` and the `-5` of `1e-5` are ident.
	const sign = at === 0 ? 0 : out.charCodeAt(at - 1);
	if (
		(sign === CC_HYPHEN_MINUS || sign === CC_PLUS_SIGN) &&
		_startsNumber(out, at - 1)
	) {
		return true;
	}
	return _startsNumber(out, at);
};

/**
 * Whether emitting `fragment` directly after `out` would re-tokenize as one
 * token. Two printed siblings normally concatenate to exactly their source, but
 * not when a dropped comment was all that separated them, or when one was
 * rewritten (`1.0.5` is two numbers, printed as `1` and `.5`) — then the junction
 * can fuse and change the declaration. The test is deliberately exact rather than
 * conservative: a space inserted where none is needed would turn a compound
 * selector (`.a.b`) into a descendant one (`.a .b`), so over-separating is as
 * unsafe as under-separating.
 * Takes the preceding character rather than the text before it: what it is
 * appended to is a rope, and reading a character off one flattens the whole of
 * it — once per fragment, over text that grows with every fragment.
 * @param {number} last character code before the fragment
 * @param {string} fragment the fragment about to be emitted
 * @param {string} out everything emitted so far, read only where a digit meets a `.`
 * @returns {boolean} true when a separator has to be inserted between them
 */
const _wouldFuseTokens = (last, fragment, out) => {
	const next = fragment.charCodeAt(0);
	// An escape swallows whatever follows it.
	if (last === CC_REVERSE_SOLIDUS) return true;
	// `/` + `*` opens a comment.
	if (last === CC_SOLIDUS && next === CC_ASTERISK) return true;
	if (_isIdentLike(last)) {
		// One ident / dimension / hash / at-keyword continues; `(` after an ident
		// makes it a function token instead.
		if (
			_isIdentLike(next) ||
			next === CC_LEFT_PARENTHESIS ||
			next === CC_REVERSE_SOLIDUS
		) {
			return true;
		}
		// `1` + `.5` reads back as the single number `1.5`. Only a number takes
		// the `.` on, and only when a digit follows it: the `1` ending the ident of
		// `.p1` does not, so `.p1` + `.c1` stays the one compound selector it is.
		if (_isDigit(last) && next === CC_FULL_STOP) {
			return _isDigit(fragment.charCodeAt(1)) && _endsWithNumber(out);
		}
		// `123` + `%` reads back as the one percentage token `123%`, and only a
		// number takes the `%` on — the `1` ending an ident does not.
		if (_isDigit(last) && next === CC_PERCENTAGE) return _endsWithNumber(out);
		// A trailing `--` plus `>` would close a CDC.
		return last === CC_HYPHEN_MINUS && next === CC_GREATER_THAN_SIGN;
	}
	// A number may start right after `.` or `+` (`-` is an ident code point, so it
	// is already covered above).
	if (last === CC_FULL_STOP) return _isDigit(next);
	// CSS Syntax 3 §4.3.10: a `+` starts a number only before a digit, or before a
	// `.` that itself has one. `.a+.m` is the sibling combinator and a class.
	if (last === CC_PLUS_SIGN) {
		return (
			_isDigit(next) ||
			(next === CC_FULL_STOP && _isDigit(fragment.charCodeAt(1)))
		);
	}
	// `#` / `@` + ident starts a hash / at-keyword token.
	if (last === CC_NUMBER_SIGN || last === CC_AT_SIGN) {
		return _isIdentLike(next) || next === CC_REVERSE_SOLIDUS;
	}
	// `<` + `!` opens a CDO.
	return last === CC_LESS_THAN_SIGN && next === CC_EXCLAMATION;
};

/**
 * Join sibling fragments (a prelude / value / args / block body), resolving each
 * `_SEP` marker into a single space kept only where dropping it would merge two
 * tokens (minifying) or unconditionally (beautifying). `trim` additionally drops
 * whitespace next to the code points that carry their own meaning in this
 * context — a selector's combinators, a query condition's comparisons.
 * Fragments that had no separator at all still get one where concatenating them
 * would fuse two tokens into one (see {@link _wouldFuseTokens}).
 * @param {string[]} parts printed fragments in source order
 * @param {boolean} beautify whether every separator is kept
 * @param {number=} trim one of the `_TRIM_*` modes (default `_TRIM_NOTHING`)
 * @returns {string} the joined text
 */
const _join = (parts, beautify, trim = _TRIM_NOTHING) => {
	let out = "";
	let last = -1;
	let pending = false;
	for (let i = 0; i < parts.length; i++) {
		const f = parts[i];
		if (f.length === 0) continue;
		if (f === _SEP) {
			pending = true;
			continue;
		}
		const first = f.charCodeAt(0);
		if (pending) {
			const keep =
				beautify ||
				(trim === _TRIM_SEPARATORS
					? _wouldFuseTokens(last, f, out)
					: _keepSeparator(last, first) &&
						!_isTrimmable(trim, last) &&
						!_isTrimmable(trim, first));
			if (out.length !== 0 && keep) {
				out += " ";
			}
			pending = false;
		} else if (out.length !== 0 && _wouldFuseTokens(last, f, out)) {
			// Nothing separated these in source (a comment stood here, or a token was
			// rewritten), yet joining them would read back as one token. Whitespace
			// is a descendant combinator in a selector, so there only an empty
			// comment parts them without saying anything the source did not.
			out += trim === _TRIM_COMBINATORS ? "/**/" : " ";
		}
		out += f;
		last = f.charCodeAt(f.length - 1);
	}
	return out;
};

// === Safe (meaning-preserving) value transforms, applied by `printer`
// when minifying. Each is value-identical — the same computed style — so they
// never change what the stylesheet means.

/**
 * The byte offset where `s`'s leading number ends (before its unit / `%`).
 * @param {string} s a number / dimension / percentage token's text
 * @returns {number} the numeric part's length
 */
const _numberEnd = (s) => {
	const n = s.length;
	let i = 0;
	const c = s.charCodeAt(0);
	if (c === CC_PLUS_SIGN || c === CC_HYPHEN_MINUS) i++;
	while (i < n && _isDigit(s.charCodeAt(i))) i++;
	if (i < n && s.charCodeAt(i) === CC_FULL_STOP) {
		i++;
		while (i < n && _isDigit(s.charCodeAt(i))) i++;
	}
	// exponent (`e` / `E`)
	const e = s.charCodeAt(i);
	if (e === 101 || e === 69) {
		let j = i + 1;
		const sign = s.charCodeAt(j);
		if (sign === CC_PLUS_SIGN || sign === CC_HYPHEN_MINUS) j++;
		let k = j;
		while (k < n && _isDigit(s.charCodeAt(k))) k++;
		if (k > j) i = k;
	}
	return i;
};

/**
 * Normalize a numeric string (no unit): drop a leading zero (`0.5`→`.5`) and
 * trailing fractional zeros (`1.50`→`1.5`, `1.0`→`1`). Value-preserving;
 * scientific notation is left untouched.
 * @param {string} num numeric text (may carry a sign)
 * @returns {string} the normalized number
 */
const _normalizeNumber = (num) => {
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
		if (end === dot + 1) end = dot; // fraction emptied → drop the dot too
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
		s = s.slice(1); // "0.5" → ".5"
	}
	if (s === "" || s === ".") s = "0";
	return sign + s;
};

// Chromium serializes a computed number at 6 significant digits, and lays a
// length out in 1/64px — so 6 digits is below what a stylesheet can observe until
// the value reaches ~23000px, which no real one does. Measured across `width`
// (px and %), `opacity`, `scale()`, `letter-spacing`, `transition-duration` and
// `flex-grow`, at container widths from 100px to 1000000px.
const _SIGNIFICANT_DIGITS = 6;

// Above this the rounded absolute error would pass 1/64px, so the digits stay.
const _ROUNDING_LIMIT = 1e4;

/**
 * Round a numeric string to `_SIGNIFICANT_DIGITS`, or return it unchanged when
 * rounding would not shorten it (or would leave the range the measurement
 * covers). Scientific notation is left alone — `toPrecision` may produce it, and
 * an exponent is not shorter here anyway.
 * @param {string} num the normalized numeric text
 * @returns {string} the rounded number, or `num`
 */
const _roundSignificant = (num) => {
	// A number written in at most `_SIGNIFICANT_DIGITS` characters carries at most
	// that many significant digits — a sign, a dot and leading zeros only take
	// away from them — so rounding to that precision hands back what it was given.
	// Almost every number in a stylesheet is this short.
	if (num.length <= _SIGNIFICANT_DIGITS) return num;
	if (num.includes("e") || num.includes("E")) return num;
	const value = Number(num);
	if (!Number.isFinite(value) || Math.abs(value) >= _ROUNDING_LIMIT) return num;
	const rounded = value.toPrecision(_SIGNIFICANT_DIGITS);
	if (rounded.includes("e") || rounded.includes("E")) return num;
	if (Number(rounded) === value) return num;
	const text = _normalizeNumber(rounded);
	return text.length < num.length ? text : num;
};

// The absolute units that still convert once `convertLengthUnits` is off: every
// group but `length`, which is the one that option gates. Built on first use and
// kept, so a parse points at one table or the other rather than testing per token.
/** @type {Map<string, [string, number]> | null} */
let _nonLengthUnitScale = null;

/**
 * The unit table a parse converts through, by what its options allow.
 * @param {boolean} lengths whether a length may be rewritten into another unit
 * @returns {Map<string, [string, number]>} the table to convert through
 */
const _unitScaleFor = (lengths) => {
	if (lengths) return ABSOLUTE_UNIT_SCALE;
	if (_nonLengthUnitScale === null) {
		_nonLengthUnitScale = new Map();
		for (const [unit, scale] of ABSOLUTE_UNIT_SCALE) {
			if (scale[0] !== "length") _nonLengthUnitScale.set(unit, scale);
		}
	}
	return _nonLengthUnitScale;
};

/**
 * Rewrite a dimension into the shortest unit it is exactly equal in. Only the
 * units CSS Values 4 fixes against each other, and only when the conversion
 * round-trips exactly in doubles — which is what keeps `cm` / `mm` / `q`, none
 * of them binary-exact in `px`, mostly where they were.
 * @param {string} num the normalized numeric text
 * @param {string} unit the token's unit, as written
 * @returns {string} the shortest equal dimension
 */
const _convertUnit = (num, unit) => {
	// The table this parse converts through: without `convertLengthUnits` the
	// length units are not in it, so a `px` — the commonest dimension a
	// stylesheet writes — costs a lookup that misses rather than a parse thrown
	// away.
	const from = _unitScale.get(toLowerCaseIfNeeded(unit));
	if (from === undefined) return num + unit;
	const value = Number(num);
	if (!Number.isFinite(value)) return num + unit;
	// A zero length drops its unit outright, so rewriting it says nothing — but a
	// zero time keeps one, and `s` is the shorter of the two it can carry.
	if (value === 0 && from[0] !== "time") return num + unit;
	const base = value * from[1];
	let best = num + unit;
	for (const [candidate, to] of _unitScale) {
		if (to[0] !== from[0] || to === from) continue;
		if (!UNIT_CONVERSION_TARGETS.has(candidate)) continue;
		const converted = base / to[1];
		if (converted * to[1] !== base) continue;
		const text = String(converted);
		if (text.includes("e") || text.includes("E")) continue;
		const dimension = _normalizeNumber(text) + candidate;
		if (dimension.length < best.length) best = dimension;
	}
	return best;
};

/**
 * Whether the declaration being printed has an `<integer>` anywhere in its
 * grammar, so a number in it may be one.
 * @returns {boolean} true inside such a declaration
 */
const _inIntegerProperty = () =>
	_valueDeclaration !== null &&
	INTEGER_PROPERTIES.has(toLowerCaseIfNeeded(A.name(_valueDeclaration)));

/**
 * Whether the declaration being printed is one an engine takes no `calc()` in,
 * so a folded term keeps the `calc()` it was written with.
 * @returns {boolean} true inside such a declaration
 */
const _inCalcRejectingProperty = () =>
	_valueDeclaration !== null &&
	CALC_REJECTING_PROPERTIES.has(toLowerCaseIfNeeded(A.name(_valueDeclaration)));

// A folded term, as a number and its unit.
const _TERM_VALUE_RE = /^(-?(?:\d+\.?\d*|\.\d+))([a-z%]*)$/i;

/**
 * Whether writing a value bare would lose the clamp the spec puts on a `calc()`
 * in this property — the literal is thrown out where the `calc()` computes the
 * bound. A unit the range is not stated in loses it too: Chrome takes
 * `oblique 100grad` off and `oblique 2rad` at face value, while clamping either
 * inside a `calc()`.
 * @param {string} property the lower-cased property name
 * @param {string} number the value
 * @param {string} unit its unit, "" when it carries none
 * @returns {boolean} true when the `calc()` has to stay
 */
const _losesClamp = (property, number, unit) => {
	const clamped = CLAMPED_VALUE_RANGES.get(property);
	if (clamped === undefined) return false;
	if (!equalsLowerCase(unit, clamped[0])) return true;
	const value = Number(number);
	return value < clamped[1] || value > clamped[2];
};

/**
 * The same, for a term the math fold is about to write in place of its
 * `calc()`.
 * @param {string} term the folded term
 * @returns {boolean} true when writing it bare would change the declaration
 */
const _foldLosesClamp = (term) => {
	if (_valueDeclaration === null) return false;
	const property = toLowerCaseIfNeeded(A.name(_valueDeclaration));
	if (!CLAMPED_VALUE_RANGES.has(property)) return false;
	const match = _TERM_VALUE_RE.exec(term);
	return match === null || _losesClamp(property, match[1], match[2]);
};

/**
 * Put back the fraction that keeps a number a `<number>` token, in the spelling
 * the rest of the printer uses — one fractional digit, and no leading zero.
 * @param {string} num a normalized number with no fraction left
 * @returns {string} the same value, still spelled as a `<number>`
 */
const _keepFraction = (num) => {
	const out = `${num}.0`;
	if (out.charCodeAt(0) === CC_0) return out.slice(1);
	return out.charCodeAt(0) === CC_HYPHEN_MINUS && out.charCodeAt(1) === CC_0
		? `-${out.slice(2)}`
		: out;
};

/**
 * Normalize a number / dimension / percentage token: normalize the numeric part,
 * then round it and reach for a shorter equal unit. Neither is done inside a
 * `@supports` prelude, where the declaration is being tested rather than applied
 * — an engine may read `px` and not `pc`. Angles keep every digit: `rotate()`
 * runs its argument through trig, which amplifies a truncated one.
 * @param {string} text the token's source text
 * @returns {string} the normalized token
 */
const _normalizeNumericToken = (text) => {
	const end = _numberEnd(text);
	// A unit identifier matches ASCII case-insensitively, so `1PX` is `1px` — and
	// the three units spelled with a capital keep the spelling everything writes.
	let unit = text.slice(end);
	// One fold of the unit for both jobs below — how it is printed, and whether
	// it is an angle. `toLowerCase` hands back the string it was given where
	// nothing folds, so a unit already lowercase is the same object.
	const lowered = unit.toLowerCase();
	// A substituted value is handed back as the tokens it was written as, so the
	// spelling there is the author's; `lowered` still answers the angle question.
	if (lowered !== unit && !_inSubstitutedValue) {
		// Only a unit that carried a capital can have a canonical spelling to look
		// up, so the table is read for the shouted units alone.
		const folded = asciiLowerCaseName(unit);
		const canonical = CANONICAL_NAMES.get(folded);
		unit = canonical === undefined ? folded : canonical;
	}
	if (!_transforms.shortenNumbers) return text.slice(0, end) + unit;
	const num = _normalizeNumber(text.slice(0, end));
	// An all-zero fraction still makes this a `<number>`, not an `<integer>`
	// (`grid-row:1.0` computes `auto`). Property read last, it is the costlier one.
	const dot = text.indexOf(".");
	if (
		unit === "" &&
		dot !== -1 &&
		dot < end &&
		!num.includes(".") &&
		_inIntegerProperty()
	) {
		return _keepFraction(num);
	}
	// `round()`, `mod()` and `rem()` are step functions of their arguments, so a
	// rewrite that holds everywhere else does not hold in one: `4.5cm` and `45mm`
	// are the same length, and headless Chromium reads `round(down,4.5cm,1.5cm)`
	// as `3cm` but `round(down,45mm,15mm)` as `4.5cm`.
	if (_inSupportsPrelude || _inCustomProperty || _steppedFunctionDepth !== 0) {
		return num + unit;
	}
	if (ANGLE_UNITS.has(lowered)) return num + unit;
	return _convertUnit(_roundSignificant(num), unit);
};

// One operand as the value printer leaves it: a number, a dimension or a
// percentage. Sticky, so the tokenizer walks the expression without slicing it.
const _CALC_OPERAND = /(?:\d*\.\d+|\d+)(?:e[+-]?\d+)?(%|[a-z]+)?/iy;

// `calc(` opening a nested expression. The inner one already printed, so it
// arrives here as text and is treated as the parentheses it is.
const _CALC_OPEN = /calc\(/iy;

/**
 * The key a unit accumulates under. Units fixed against each other share their
 * group's key and are counted in its base unit, so `1in + 1px` is one term;
 * everything else keys on the unit itself, so `1em + 1px` stays two and is
 * declined below.
 * @param {string} unit the operand's unit, `""` for a plain number
 * @returns {[string, number]} the key and how many base units one of it is
 */
const _calcUnitKey = (unit) => {
	if (unit === "") return ["", 1];
	const lower = unit.toLowerCase();
	const absolute = ABSOLUTE_UNIT_SCALE.get(lower);
	return absolute === undefined ? [lower, 1] : [absolute[0], absolute[1]];
};

/**
 * The units an expression was written with, which a gated length collapse may
 * still print back into.
 * @param {{ type: string, value: number, unit: string }[]} tokens the tokens
 * @returns {Set<string>} the lowercased units
 */
const _writtenUnits = (tokens) => {
	/** @type {Set<string>} */
	const units = new Set();
	for (const token of tokens) {
		if (token.unit !== "") units.add(toLowerCaseIfNeeded(token.unit));
	}
	return units;
};

/**
 * Tokenize one printed `calc()` body.
 * @param {string} text the body
 * @returns {{ type: string, value: number, unit: string }[] | null} the tokens, or `null` when something here is not arithmetic
 */
const _tokenizeCalc = (text) => {
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
		_CALC_OPEN.lastIndex = i;
		if (_CALC_OPEN.test(text)) {
			tokens.push({ type: "(", value: 0, unit: "" });
			spaced = false;
			i = _CALC_OPEN.lastIndex;
			continue;
		}
		let sign = 1;
		if (c === "+" || c === "-") {
			if (c === "-") sign = -1;
			i++;
		}
		_CALC_OPERAND.lastIndex = i;
		const match = _CALC_OPERAND.exec(text);
		if (match === null || match.index !== i) return null;
		const unit = match[1] === undefined ? "" : match[1];
		const value = Number(match[0].slice(0, match[0].length - unit.length));
		if (!Number.isFinite(value)) return null;
		tokens.push({ type: "value", value: sign * value, unit });
		spaced = false;
		i = _CALC_OPERAND.lastIndex;
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
const _evaluateCalcSum = (tokens, cursor) => {
	const sum = _evaluateCalcProduct(tokens, cursor);
	if (sum === null) return null;
	for (;;) {
		const token = tokens[cursor.at];
		if (token === undefined || (token.type !== "+" && token.type !== "-")) {
			return sum;
		}
		cursor.at++;
		const right = _evaluateCalcProduct(tokens, cursor);
		if (right === null) return null;
		const sign = token.type === "+" ? 1 : -1;
		for (const [key, coefficient] of right) {
			const scaled = exactMultiply(coefficient, sign);
			if (scaled === null) return null;
			const previous = sum.get(key);
			if (previous === undefined) {
				sum.set(key, scaled);
				continue;
			}
			const added = exactAdd(previous, scaled);
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
const _evaluateCalcProduct = (tokens, cursor) => {
	let sum = _evaluateCalcValue(tokens, cursor);
	if (sum === null) return null;
	for (;;) {
		const token = tokens[cursor.at];
		if (token === undefined || (token.type !== "*" && token.type !== "/")) {
			return sum;
		}
		cursor.at++;
		const right = _evaluateCalcValue(tokens, cursor);
		if (right === null) return null;
		if (token.type === "/") {
			const divisor = right.get("");
			if (divisor === undefined || right.size !== 1) return null;
			const out = new Map();
			for (const [key, coefficient] of sum) {
				const quotient = exactDivide(coefficient, divisor);
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
		const out = new Map();
		for (const [key, coefficient] of other) {
			const product = exactMultiply(coefficient, factor);
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
const _evaluateCalcValue = (tokens, cursor) => {
	const token = tokens[cursor.at];
	if (token === undefined) return null;
	if (token.type === "(") {
		cursor.at++;
		const inner = _evaluateCalcSum(tokens, cursor);
		if (inner === null) return null;
		const close = tokens[cursor.at];
		if (close === undefined || close.type !== ")") return null;
		cursor.at++;
		return inner;
	}
	if (token.type !== "value") return null;
	cursor.at++;
	const [key, scale] = _calcUnitKey(token.unit);
	const value = exactMultiply(token.value, scale);
	return value === null ? null : new Map([[key, value]]);
};

/**
 * Round a folded result the way an authored number is rounded — the fold prints
 * a double back in full, and `6 / 10 - 0.375` is `.22499999999999998`. The
 * exclusions are the token printer's own: a `@supports` prelude and a custom
 * property keep what was written, a stepped function is a step of its argument,
 * and an angle keeps every digit because `rotate()` runs it through trig.
 * @param {string} text the printed numeric text
 * @param {string} unit the unit it carries, empty or `%` for none
 * @returns {string} the rounded text, or `text`
 */
const _roundCalcResult = (text, unit) => {
	if (_inSupportsPrelude || _inCustomProperty || _steppedFunctionDepth !== 0) {
		return text;
	}
	return ANGLE_UNITS.has(toLowerCaseIfNeeded(unit))
		? text
		: _roundSignificant(text);
};

/**
 * Print one collapsed term back.
 * @param {string} key the sum's one key
 * @param {number} coefficient its value, in the key's base unit
 * @param {Set<string>} written the units the expression was written with
 * @returns {string | null} the printed value, or `null` when it does not print back exactly
 */
const _printCalcTerm = (key, coefficient, written) => {
	if (key === "" || key === "%") {
		const text = _normalizeNumber(String(coefficient));
		return Number(text) === coefficient
			? _roundCalcResult(text, key) + key
			: null;
	}
	const base = UNIT_GROUP_BASE.get(key);
	// A unit outside the conversion table counts in itself, so the coefficient is
	// already what it prints as.
	if (base === undefined) {
		const text = _normalizeNumber(String(coefficient));
		return Number(text) === coefficient
			? _roundCalcResult(text, key) + key
			: null;
	}
	// Counted in the group's base unit, so every unit of the group is a candidate
	// and each is divided into directly: `1cm + 1mm` is exactly `11mm`, and
	// reaching it through `px` first would lose it — no `px` count equals it.
	let best = null;
	const lengthGated = key === "length" && !_convertLengthUnits;
	for (const [candidate, to] of ABSOLUTE_UNIT_SCALE) {
		if (to[0] !== key) continue;
		// Gated, a sum may still collapse into a unit it was written with — that
		// introduces none — but not into one reached only to save bytes.
		if (lengthGated && candidate !== base[0] && !written.has(candidate)) {
			continue;
		}
		if (candidate !== base[0] && !UNIT_CONVERSION_TARGETS.has(candidate)) {
			continue;
		}
		const value = exactDivide(coefficient, to[1]);
		if (value === null) continue;
		const text = _normalizeNumber(String(value));
		if (Number(text) !== value || text.includes("e") || text.includes("E")) {
			continue;
		}
		const dimension = _roundCalcResult(text, candidate) + candidate;
		if (best === null || dimension.length < best.length) best = dimension;
	}
	return best;
};

/**
 * Print a whole reduced sum back as a `calc()` body. A sum still holding two
 * keys is one an engine resolves against layout (a percentage against a length,
 * an `em` against a `px`), and the terms of it are printed in the order they
 * were first written. A zero term is kept rather than dropped: which keys may be
 * added to which is a type rule, and dropping one can make an expression an
 * engine rejects into one it accepts (`calc(1px + 1deg - 1deg)`).
 * @param {Map<string, number>} sum the reduced sum
 * @param {Set<string>} written the units the expression was written with
 * @returns {string | null} the body, or `null` when a term does not print exactly
 */
const _printCalcSum = (sum, written) => {
	let text = "";
	for (const [key, coefficient] of sum) {
		const term = _printCalcTerm(
			key,
			text === "" ? coefficient : Math.abs(coefficient),
			written
		);
		if (term === null) return null;
		text += text === "" ? term : `${coefficient < 0 ? " - " : " + "}${term}`;
	}
	return text === "" ? null : text;
};

/**
 * Split a tokenized argument list on its top-level commas.
 * @param {{ type: string, value: number, unit: string }[]} tokens the tokens
 * @returns {{ type: string, value: number, unit: string }[][]} one list per argument
 */
const _splitMathArguments = (tokens) => {
	/** @type {{ type: string, value: number, unit: string }[][]} */
	const args = [[]];
	let depth = 0;
	for (const token of tokens) {
		if (token.type === "(") {
			depth++;
		} else if (token.type === ")") {
			depth--;
		} else if (token.type === "," && depth === 0) {
			args.push([]);
			continue;
		}
		args[args.length - 1].push(token);
	}
	return args;
};

/**
 * Split on the commas at the top of a function body, so a nested call's own
 * arguments stay in the piece that holds it.
 * @param {string} text the body between one call's parentheses
 * @returns {string[]} its arguments, still as written
 */
const _splitTopLevelArguments = (text) => {
	/** @type {string[]} */
	const parts = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		if (code === 0x28) {
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

/**
 * Reduce the `<calc-sum>` arguments of a call the whole-call fold cannot read,
 * leaving every other argument as written. `calc-size(auto, 10px + 5px)` is
 * `calc-size(auto,15px)`: the basis is not an expression, so only the size is
 * touched.
 * @param {string} fn the lowercased function name
 * @param {string} inner the text between its parentheses
 * @returns {string | null} the rewritten body, or `null`
 */
const _reduceMathArguments = (fn, inner) => {
	if (!_transforms.reduceFunctions) return null;
	const positions = MATH_FUNCTION_SUM_ARGUMENTS.get(fn);
	// The same rewrite a stepped function's arguments refuse.
	if (positions === undefined || _steppedFunctionDepth > 0) return null;
	const parts = _splitTopLevelArguments(inner);
	let changed = false;
	for (const position of positions) {
		if (position >= parts.length) return null;
		const tokens = _tokenizeCalc(parts[position]);
		if (tokens === null) return null;
		const cursor = { at: 0 };
		const sum = _evaluateCalcSum(tokens, cursor);
		if (sum === null || cursor.at !== tokens.length) return null;
		const text = _printCalcSum(sum, _writtenUnits(tokens));
		if (text === null) return null;
		if (text !== parts[position].trim()) changed = true;
		parts[position] = text;
	}
	return changed ? parts.map((part) => part.trim()).join(",") : null;
};

/**
 * Fold a printed math function body to the one value it is equal to. Only a
 * fully collapsed result is returned: an expression still holding two units (a
 * percentage against a length, an `em` against a `px`) resolves against layout
 * and has to stay written out.
 * @param {string} fn the lowercased function name
 * @param {string} inner the printed body
 * @returns {string | null} the value, or `null` to leave the expression as it is
 */
const _foldMathFunction = (fn, inner) => {
	if (!_transforms.reduceFunctions) return null;
	const arity = MATH_FUNCTION_ARITY.get(fn);
	if (arity === undefined) return null;
	// A fold standing in a stepped function's argument prints in whichever unit
	// is shortest, which is the rewrite that function's own arguments refuse:
	// Chromium reads `round(down,4.5cm,1.5cm)` and `round(down,45mm,15mm)` as
	// different lengths. The stepped function's own result is not an argument of
	// one, so it is the depth above this call that decides.
	if (_steppedFunctionDepth - (STEPPED_FUNCTIONS.has(fn) ? 1 : 0) > 0) {
		return null;
	}
	// A leading keyword the grammar offers (`round(down, …)`) is not an
	// expression, so it comes off before the arguments are read.
	let keyword = "";
	let body = inner;
	const choices = MATH_FUNCTION_KEYWORDS.get(fn);
	if (choices !== undefined) {
		const comma = inner.indexOf(",");
		if (comma !== -1) {
			const head = toLowerCaseIfNeeded(inner.slice(0, comma).trim());
			if (choices.includes(head)) {
				keyword = head;
				body = inner.slice(comma + 1);
			}
		}
	}
	const tokens = _tokenizeCalc(body);
	if (tokens === null) return null;
	const args = _splitMathArguments(tokens);
	if (args.length < arity[0] || args.length > arity[1]) return null;
	/** @type {Map<string, number>[]} */
	const sums = [];
	for (const argument of args) {
		const cursor = { at: 0 };
		const sum = _evaluateCalcSum(argument, cursor);
		if (sum === null || cursor.at !== argument.length) return null;
		sums.push(sum);
	}
	// `calc()` is the one that is not a single value: it is whatever sum its
	// argument reduced to, which may still hold two units.
	const written = _writtenUnits(tokens);
	if (fn === "calc") return _printCalcSum(sums[0], written);
	const fold = MATH_FUNCTION_FOLD.get(fn);
	if (fold === undefined) return null;
	const argument = fold.read(sums);
	if (argument === null) return null;
	const value = fold.apply(argument[1], keyword, fold.table);
	if (value === null) return null;
	return _printCalcTerm(
		fold.result === "same" ? argument[0] : fold.result,
		value,
		written
	);
};

const _HEX = "0123456789abcdef";

/**
 * @param {number} n byte value 0..255
 * @returns {string} its two lowercase hex digits
 */
const _hex2 = (n) => _HEX[(n >> 4) & 15] + _HEX[n & 15];

/**
 * The shortest opaque color text for (r, g, b): a named color where one is
 * shorter than the hex (`RGB_TO_NAME` holds only those), else a collapsed 3-hex
 * or a 6-hex.
 * @param {number} r red 0..255
 * @param {number} g green 0..255
 * @param {number} b blue 0..255
 * @returns {string} the shortest form
 */
const _shortestColor = (r, g, b) => {
	const name = RGB_TO_NAME.get((r << 16) | (g << 8) | b);
	if (name !== undefined) return name;
	const rr = _hex2(r);
	const gg = _hex2(g);
	const bb = _hex2(b);
	return rr[0] === rr[1] && gg[0] === gg[1] && bb[0] === bb[1]
		? `#${rr[0]}${gg[0]}${bb[0]}`
		: `#${rr}${gg}${bb}`;
};

/**
 * The shortest text for (r, g, b, a) with an alpha below 1 — a 4- or 8-digit hex,
 * always shorter than the `rgba()` it came from. No named color has an alpha.
 * @param {number} r red 0..255
 * @param {number} g green 0..255
 * @param {number} b blue 0..255
 * @param {number} a alpha 0..255
 * @returns {string} the shortest form
 */
const _shortestAlphaColor = (r, g, b, a) => {
	const rr = _hex2(r);
	const gg = _hex2(g);
	const bb = _hex2(b);
	const aa = _hex2(a);
	return rr[0] === rr[1] &&
		gg[0] === gg[1] &&
		bb[0] === bb[1] &&
		aa[0] === aa[1]
		? `#${rr[0]}${gg[0]}${bb[0]}${aa[0]}`
		: `#${rr}${gg}${bb}${aa}`;
};

/**
 * Minify a hash token (`#…`) when it is a hex color: opaque (3/6 digits, and
 * 4/8 whose alpha is opaque) → the shortest color; with a real alpha (4/8
 * digits) → lowercase + collapse pairs (kept hex). Returns null when it is not a
 * hex color — e.g. a selector id — so it is
 * left verbatim.
 * @param {string} text the hash token text
 * @returns {string | null} the minified hex/name, or null
 */
const _minifyHash = (text) => {
	if (!_transforms.shortenColors) return null;
	const body = text.slice(1);
	const n = body.length;
	if (n !== 3 && n !== 4 && n !== 6 && n !== 8) return null;
	for (let i = 0; i < n; i++) {
		if (!_isHexDigit(body.charCodeAt(i))) return null;
	}
	const low = body.toLowerCase();
	if (n === 3) {
		return _shortestColor(
			Number.parseInt(low[0] + low[0], 16),
			Number.parseInt(low[1] + low[1], 16),
			Number.parseInt(low[2] + low[2], 16)
		);
	}
	if (n === 6) {
		return _shortestColor(
			Number.parseInt(low.slice(0, 2), 16),
			Number.parseInt(low.slice(2, 4), 16),
			Number.parseInt(low.slice(4, 6), 16)
		);
	}
	// A fully opaque alpha says nothing, and the form without it asks nothing of
	// the target's hex-alpha support either.
	if (n === 4) {
		if (low[3] !== "f") return `#${low}`;
		return _shortestColor(
			Number.parseInt(low[0] + low[0], 16),
			Number.parseInt(low[1] + low[1], 16),
			Number.parseInt(low[2] + low[2], 16)
		);
	}
	if (low[6] === "f" && low[7] === "f") {
		return _shortestColor(
			Number.parseInt(low.slice(0, 2), 16),
			Number.parseInt(low.slice(2, 4), 16),
			Number.parseInt(low.slice(4, 6), 16)
		);
	}
	return low[0] === low[1] &&
		low[2] === low[3] &&
		low[4] === low[5] &&
		low[6] === low[7]
		? `#${low[0]}${low[2]}${low[4]}${low[6]}`
		: `#${low}`;
};

/**
 * @param {number} x a number
 * @returns {number} `x` rounded and clamped to a 0..255 byte
 */
const _clamp255 = (x) => (x < 0 ? 0 : x > 255 ? 255 : Math.round(x));

/**
 * Minify an `rgb()` / `rgba()` color function to the shortest opaque form. Only
 * rgb/rgba (exact integer / percent math); returns null for anything else —
 * a different function, non-numeric args, or a partly-transparent alpha —
 * leaving it as its normalized function form. Transparent black collapses to the
 * `transparent` keyword (identical value, universally supported, shorter). hsl is
 * intentionally not converted: its hue math can round to a different byte, which
 * would change the color.
 * @param {string} fn the lowercased function name
 * @param {string} inner the already-joined argument text
 * @param {boolean} hexAlpha whether the target reads a 4-/8-digit hex (see `output.environment`)
 * @returns {string | null} the shortest color, or null to keep the function
 */
const _minifyColorFunction = (fn, inner, hexAlpha) => {
	if ((fn !== "rgb" && fn !== "rgba") || !_transforms.shortenColors) {
		return null;
	}
	// Cut on the separators `rgb()` allows — whitespace, `,`, and the `/` before
	// the alpha — in one pass. Every color in the sheet reaches this, and the
	// regex form built a replaced copy of the arguments, a split array and a
	// filtered copy of that to reach the same few strings.
	/** @type {string[]} */
	const args = [];
	let from = -1;
	for (let i = 0; i <= inner.length; i++) {
		// Spelled out rather than asked for: a call per character loses to the
		// regex engine outright, and anything looser than the five whitespace
		// code points parts a token CSS does not — a control character between
		// two numbers leaves an invalid declaration, which must stay invalid.
		const c = inner.charCodeAt(i);
		if (
			i === inner.length ||
			c === CC_SPACE ||
			c === CC_TAB ||
			c === CC_LINE_FEED ||
			c === CC_CARRIAGE_RETURN ||
			c === CC_FORM_FEED ||
			c === CC_COMMA ||
			c === CC_SOLIDUS
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
	/** @type {number[]} */
	const channels = [];
	let alpha = 1;
	let percentChannelCount = 0;
	for (let i = 0; i < args.length; i++) {
		const s = args[i];
		if (!/^[+-]?(?:\d+\.?\d*|\.\d+)%?$/.test(s)) return null;
		const pct = s.endsWith("%");
		const v = Number.parseFloat(pct ? s.slice(0, -1) : s);
		if (Number.isNaN(v)) return null;
		if (i === 3) {
			alpha = pct ? v / 100 : v;
		} else {
			if (pct) percentChannelCount++;
			channels.push(_clamp255(pct ? (v * 255) / 100 : v));
		}
	}
	// Mixed number/percentage channels are invalid CSS (ignored by browsers);
	// rewriting would activate a dead declaration.
	if (percentChannelCount !== 0 && percentChannelCount !== 3) return null;
	// Fully transparent *black* only — `transparent` is `rgba(0,0,0,0)`, so a
	// non-black transparent (e.g. `rgba(255,0,0,0)`) is a different value.
	if (
		alpha === 0 &&
		channels[0] === 0 &&
		channels[1] === 0 &&
		channels[2] === 0
	) {
		return "transparent";
	}
	// A hex alpha is the same color: the engine quantizes the channel to 8 bits,
	// so the byte a decimal alpha lands on is the one it already stores —
	// `.5`, `.501`, `.502` and `.5019` all compute to `rgba(0,0,0,0.5)` in
	// headless Chromium, and every one of the 256 bytes round-trips.
	if (alpha < 1) {
		return hexAlpha
			? _shortestAlphaColor(
					channels[0],
					channels[1],
					channels[2],
					_clamp255(alpha * 255)
				)
			: null;
	}
	return _shortestColor(channels[0], channels[1], channels[2]);
};

// A browser list's parse, and each list's per-property prefix decision, memoized
// on the list identity: one process minifies for one target, so the work is done
// once and every later lookup is a `Map.get`.
// A build minifies every asset against one browserslist selection, but in a
// worker each asset arrives with a freshly deserialized array — so the memo is
// keyed on the joined text, and one selection at a time is all it ever holds.
/** @type {string[] | null} */
let _browsersArray = null;
/** @type {string | null} */
let _browsersKey = null;
/** @type {(number[] | undefined)[] | null} */
let _parsedBrowsersMemo = null;
// Each axis' table -> its per-construct decision for the selection in hand. Kept
// per table rather than under one tagged key, so a lookup allocates no string.
/** @type {Map<Map<string, [string, number][]>, Map<string, Set<string> | null>>} */
let _neededPrefixMemo = new Map();

// Where a browser's version sits in a `SUPPORT_PROFILES` row, which is also the
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
const _useBrowsers = (browsers) => {
	// The same selection usually arrives as the same array — one resolution per
	// target serves the whole build — so the text it joins to is read only where
	// it does not, which is a worker handed each asset's own copy.
	if (browsers === _browsersArray) {
		_prefixBrowsers = _parsedBrowsersMemo;
		return;
	}
	_browsersArray = browsers;
	const key = browsers.join(",");
	if (key !== _browsersKey) {
		_browsersKey = key;
		_neededPrefixMemo = new Map();
		// By the slot the tables name a browser with, so neither the profile rows
		// nor the prefix windows carry a name to look one up by.
		/** @type {(number[] | undefined)[]} */
		const parsed = Array.from({ length: SUPPORT_BROWSERS.length });
		let named = 0;
		for (const entry of browsers) {
			const space = entry.indexOf(" ");
			const name = space === -1 ? entry : entry.slice(0, space);
			const version =
				space === -1 ? null : _encodeBrowserVersion(entry.slice(space + 1));
			// A browserslist name no compat dataset covers (`op_mini`, `and_uc`,
			// `and_qq`, `baidu`, `kaios`, `bb`), or a version that did not parse, is
			// skipped — the same browsers lightningcss's target mapping drops, so both
			// minifiers prefix for the same selection.
			const slot =
				version === null ? undefined : SUPPORT_BROWSER_SLOT.get(name);
			if (slot === undefined) continue;
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
		_parsedBrowsersMemo = named === 0 ? null : parsed;
	}
	_prefixBrowsers = _parsedBrowsersMemo;
};

/**
 * A browserslist version to the same `major * 100000 + minor` integer the table
 * is keyed in. A range (`10.0-10.2`) takes its low end, Safari `TP` is newest,
 * and `all` (Opera Mini) is oldest (`0`).
 * @param {string} version the version part of a `"name version"` entry
 * @returns {number | null} the encoded version, or null when unreadable
 */
const _encodeBrowserVersion = (version) => {
	// Newer than any real version, but below `NEVER` — a still-prefixed feature
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

/**
 * Whether every target browser reads a CSS ability, so a spelling that needs it
 * may be reached for. No selection names no browser to answer for, so the
 * ability is assumed — a build with no browserslist keeps every rewrite. A
 * browser the table does not name is one nothing states support for, which
 * answers no.
 * @param {string} feature a `SUPPORTED_FROM` key
 * @returns {boolean} true when the selection reads it
 */
const _targetSupports = (feature) => _readsAll(SUPPORTED_FROM.get(feature));

/**
 * Whether every target browser is at or past the versions in one support
 * profile, named by the row it reads.
 * @param {number | undefined} profile a `SUPPORT_PROFILES` index
 * @returns {boolean} true when the selection reads it
 */
const _readsAll = (profile) => {
	const parsed = _prefixBrowsers;
	if (parsed === null) return true;
	if (profile === undefined) return false;
	// One row of `SUPPORT_BROWSERS.length` versions, laid end to end with the rest.
	const row = profile * SUPPORT_BROWSERS.length;
	for (let at = 0; at < parsed.length; at++) {
		const versions = parsed[at];
		if (versions === undefined) continue;
		const from = SUPPORT_PROFILES[row + at];
		for (let i = 0; i < versions.length; i++) {
			if (versions[i] < from) return false;
		}
	}
	return true;
};

/**
 * The vendor spellings at least one target browser still needs for a construct —
 * a target at version V needs spelling S when some `[browser, from, to]` of S has
 * `from <= V < to`. Null when not minifying for a target (leave prefixes alone),
 * the construct is never prefixed, or no target needs any of its spellings.
 * @param {Map<string, [string, number][]>} table its axis' prefix table
 * @param {string} name the construct name (unprefixed, lowercased)
 * @returns {Set<string> | null} the needed spellings, or null
 */
const _neededPrefixes = (table, name) => {
	const parsed = _prefixBrowsers;
	if (parsed === null) return null;
	let cache = _neededPrefixMemo.get(table);
	if (cache === undefined) {
		cache = new Map();
		_neededPrefixMemo.set(table, cache);
	}
	const cached = cache.get(name);
	if (cached !== undefined) return cached;
	const prefixes = table.get(name);
	/** @type {Set<string> | null} */
	let result = null;
	if (prefixes !== undefined) {
		const needed = new Set();
		for (const [prefix, windows] of prefixes) {
			// The list's own `browser, from, to` triples, in the flat table the
			// starts index into.
			const end = PREFIX_WINDOW_STARTS[windows + 1];
			for (let at = PREFIX_WINDOW_STARTS[windows]; at < end; at += 3) {
				const versions = parsed[PREFIX_WINDOWS[at]];
				if (versions === undefined) continue;
				const from = PREFIX_WINDOWS[at + 1];
				const to = PREFIX_WINDOWS[at + 2];
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

/**
 * The base an at-rule's vendor spelling belongs to. Every at-rule spelling is
 * its base with a prefix on it, so the prefix comes off again.
 * @param {string} name a prefixed at-rule name, lowercased
 * @returns {string} the unprefixed name
 */
const _unprefixedAtRule = (name) =>
	name.slice(
		/** @type {RegExpExecArray} */ (VENDOR_PREFIX.exec(name))[1].length
	);

/**
 * Whether a present vendor-spelled construct is dead weight: its spelling is one
 * the table knows for the base construct and no target browser needs it, so an
 * unprefixed sibling already covers every target.
 * @param {Map<string, [string, number][]>} table its axis' prefix table
 * @param {string} base the unprefixed construct name
 * @param {string} spelling the vendor spelling found in its place
 * @returns {boolean} true when the vendor-spelled construct can be dropped
 */
const _prefixRemovable = (table, base, spelling) => {
	const spellings = table.get(base);
	if (spellings === undefined) return false;
	if (!spellings.some(([known]) => known === spelling)) return false;
	const needed = _neededPrefixes(table, base);
	return needed === null || !needed.has(spelling);
};

/**
 * What a block's rules have shown so far: the signatures met (`seen`), and the
 * prefixed ones an unprefixed twin would make dead — as an output piece the
 * writer can take back (`retractable`, for a rule written straight out), or as
 * the node itself (`pending`, for a rule whose parent still has to assemble it).
 * @typedef {object} PrefixScope
 * @property {Set<string>} seen the signatures met, and the `signature\0prefix`
 * markers of the prefixed spellings among them
 * @property {Map<string, number> | null} retractable each dead-if-twinned rule's
 * piece index, by the signature of the twin that would make it dead
 * @property {Map<string, Node> | null} pending each dead-if-twinned nested rule,
 * by that same signature
 * @property {Set<Node> | null} dead the nested rules a twin has since made dead,
 * read by their parent as it assembles its body
 */

/**
 * The rules already met in the block a rule sits in, made on first use.
 * @param {Node | null} parent the block's rule, null for the stylesheet itself
 * @returns {PrefixScope} the block's running sibling state
 */
const _prefixScope = (parent) => {
	const scopes = /** @type {Map<Node | null, PrefixScope>} */ (
		_seenPrefixRules
	);
	let scope = scopes.get(parent);
	if (scope === undefined) {
		scope = { seen: new Set(), retractable: null, pending: null, dead: null };
		scopes.set(parent, scope);
	}
	return scope;
};

/**
 * Drop the prefixed rule this one is the unprefixed twin of. The pair is usually
 * adjacent — every stylesheet writes the prefixed spelling first — but nothing
 * in between matters: a piece stays retractable until the stylesheet ends, and a
 * nested rule until its parent assembles its body.
 * @param {PrefixScope} scope the block's running sibling state
 * @param {string} signature the unprefixed rule's sibling signature
 * @returns {void}
 */
const _dropPrefixTwin = (scope, signature) => {
	const retractable = scope.retractable;
	if (retractable !== null) {
		const at = retractable.get(signature);
		if (at !== undefined) {
			/** @type {PrintContext} */ (_streamWriter).retract(at);
			retractable.delete(signature);
			return;
		}
	}
	const pending = scope.pending;
	if (pending === null) return;
	const node = pending.get(signature);
	if (node === undefined) return;
	pending.delete(signature);
	if (scope.dead === null) scope.dead = new Set();
	scope.dead.add(node);
};

/**
 * Remember a prefixed rule an unprefixed twin later in its block would make dead
 * weight, both ways it can be dropped: as the rule just printed, which whoever
 * writes it out takes as a piece of its own, and — for a nested one — as the
 * node its parent skips while assembling its body, for the parents that do.
 * @param {PrefixScope} scope the block's running sibling state
 * @param {string} signature the rule's sibling signature
 * @param {boolean} top whether the rule is the stylesheet's own
 * @returns {void}
 */
const _holdPrefixTwin = (scope, signature, top) => {
	_prefixDropCandidate = { node: _currentNode, signature };
	if (top) return;
	if (scope.pending === null) scope.pending = new Map();
	scope.pending.set(signature, _currentNode);
};

/**
 * An at-rule (`@keyframes`), prefixed against the target: a prefixed copy is
 * prepended for each prefix a target still needs, and a prefixed rule no target
 * needs is dropped once its unprefixed twin has been seen. The `@name`'s prefix
 * is stripped for the sibling signature, so `@-webkit-keyframes x` and
 * `@keyframes x` pair up. Siblings are the rules of the block it sits in.
 * @param {CssPath} path the accessor on the at-rule
 * @param {string} ruleText the rule's own serialized text
 * @param {string} prelude the rule's serialized prelude (`@name …`)
 * @param {PrefixScope} scope the block's running sibling state
 * @param {boolean} top whether the rule is the stylesheet's own, which is the only
 * one whose text is still a piece a twin can take back
 * @returns {string} the rule text, with prefixed copies added or itself dropped
 */
const _prefixAtRule = (path, ruleText, prelude, scope, top) => {
	const seen = scope.seen;
	const name = path.name().toLowerCase();
	const prefixed = VENDOR_PREFIX.test(name);
	const base = prefixed ? _unprefixedAtRule(name) : name;
	if (!PREFIXED_AT_RULES.has(base)) return ruleText;
	// This rule's cross-prefix identity: the prelude with the `@name` folded to its
	// unprefixed, lowercased spelling, so a cased `@Keyframes` and a prefixed
	// `@-webkit-keyframes` share it (at-rule names are case-insensitive).
	const signature = `@${base}${prelude.slice(1 + name.length)}`;
	if (prefixed) {
		const removable = _prefixRemovable(PREFIXED_AT_RULES, base, name);
		if (seen.has(signature) && removable) return "";
		seen.add(`${signature}\0${name}`);
		// Its twin may still be a later rule, which is where it is dropped.
		if (removable) _holdPrefixTwin(scope, signature, top);
		return ruleText;
	}
	seen.add(signature);
	_dropPrefixTwin(scope, signature);
	const needed = _neededPrefixes(PREFIXED_AT_RULES, base);
	if (needed === null) return ruleText;
	let out = "";
	for (const spelling of needed) {
		// Skip only a spelling the source itself already carries (marked when the
		// prefixed at-rule is met); a copy is still added for every unprefixed rule
		// of this signature, so a later `@keyframes` that overrides an earlier keeps
		// its prefixed twin winning too.
		if (seen.has(`${signature}\0${spelling}`)) continue;
		out += `@${spelling}${ruleText.slice(1 + name.length)}`;
	}
	return out + ruleText;
};

// The prefixed spelling of a prefixable selector back to `[base, prefix]`
// (`-webkit-input-placeholder` -> `["placeholder", "-webkit-input-"]`), built
// once from the forward table so a prefixed selector can be recognized for
// removal. BCD's prefix concatenates onto the base, so the spelling is exact.
/** @type {Map<string, [string, string]> | null} */
let _prefixedSelectorNames = null;
/**
 * @param {string} name a selector's pseudo name
 * @returns {[string, string] | undefined} its `[base, prefix]` when prefixed
 */
const _prefixedSelectorName = (name) => {
	if (_prefixedSelectorNames === null) {
		_prefixedSelectorNames = new Map();
		for (const [base, spellings] of PREFIXED_SELECTORS) {
			for (const [spelling] of spellings) {
				_prefixedSelectorNames.set(spelling, [base, spelling]);
			}
		}
	}
	return _prefixedSelectorNames.get(name);
};

// A property's vendor spelling back to the property it stands for, built once
// from the forward table. Read rather than derived: an engine as often renamed
// the property (`-ms-flex-order` for `order`) as prefixed its name, and only a
// prefix can be stripped back off.
/** @type {Map<string, string> | null} */
let _prefixedPropertyNames = null;
/**
 * @param {string} property a declaration's property name
 * @returns {string | undefined} the property it is a vendor spelling of
 */
const _prefixedPropertyName = (property) => {
	if (_prefixedPropertyNames === null) {
		_prefixedPropertyNames = new Map();
		for (const [base, spellings] of PREFIXED_PROPERTIES) {
			for (const [spelling] of spellings) {
				_prefixedPropertyNames.set(spelling, base);
			}
		}
	}
	return _prefixedPropertyNames.get(property);
};

/**
 * One prefixed copy of a declaration, for a spelling a target still needs. A
 * spelling whose older property read other keywords carries them with it, and
 * writes nothing at all for a value that property cannot read — the map is its
 * whole grammar.
 * @param {string} spelling the vendor spelling to write
 * @param {string} text the declaration's printed text
 * @param {number} colon where its `:` sits
 * @returns {string} the copy, empty where none can be written
 */
const _prefixedDeclaration = (spelling, text, colon) => {
	const keywords = PREFIXED_SPELLING_KEYWORDS.get(spelling);
	if (keywords === undefined) return spelling + text.slice(colon);
	const end = _printedValueEnd(text, colon);
	const value = toLowerCaseIfNeeded(text.slice(colon + 1, end));
	// A CSS-wide keyword is every property's, whatever its own grammar says.
	if (CSS_WIDE_KEYWORDS.has(value)) return spelling + text.slice(colon);
	const legacy = keywords.get(value);
	// `!important` and the `;` carry over; the value between them is rewritten.
	return legacy === undefined ? "" : `${spelling}:${legacy}${text.slice(end)}`;
};

// A selector prelude part split at its `(`: a functional pseudo prints as one
// token (`dir(rtl)`), so its name is matched and rewritten apart from the
// argument that carries over unchanged. A bare pseudo has no `(`.
/**
 * @param {string} part a printed prelude token
 * @returns {string} its name, without any `(argument)`
 */
const _selectorPartName = (part) => {
	const paren = part.indexOf("(");
	return paren === -1 ? part : part.slice(0, paren);
};

// The shape of every name some engine spells its own way: one bit per length,
// under the pair of letters it starts with. A declaration whose first two
// letters and length are not one of those can be neither prefixed nor
// value-spelled, so its name is never read — which is most of them, `content`,
// `opacity` and `margin-left` among the commonest. 676 slots, filled the first
// time a parse prefixes for a target and kept after.
/** @type {Int32Array | null} */
let _prefixableNameShapes = null;

/**
 * @returns {Int32Array} the lengths, by the two letters a name starts with
 */
const _prefixableNames = () => {
	if (_prefixableNameShapes === null) {
		const shapes = new Int32Array(26 * 26);
		for (const table of [PREFIXED_PROPERTIES, PREFIXED_VALUES]) {
			for (const name of table.keys()) {
				const slot = _nameShapeSlot(name.charCodeAt(0), name.charCodeAt(1));
				if (slot === -1) continue;
				shapes[slot] |= 1 << (name.length > 31 ? 31 : name.length);
			}
		}
		_prefixableNameShapes = shapes;
	}
	return _prefixableNameShapes;
};

/**
 * The shape table's slot for a name's first two characters, or `-1` where they
 * are not both ASCII letters. Names match ASCII case-insensitively, so `A`-`Z`
 * reads as its lowercase.
 * @param {number} first the first character's code
 * @param {number} second the second character's code
 * @returns {number} the slot, or -1
 */
const _nameShapeSlot = (first, second) => {
	const letter = (first | 0x20) - CC_LOWER_A;
	if (letter < 0 || letter > 25) return -1;
	const next = (second | 0x20) - CC_LOWER_A;
	return next < 0 || next > 25 ? -1 : letter * 26 + next;
};

/**
 * Whether a printed declaration's name is worth reading — one some engine
 * spells its own way, or a spelling itself.
 * @param {string} text the declaration's printed text
 * @param {number} colon where its `:` sits
 * @returns {boolean} true when the name may take part in prefixing
 */
const _mayPrefixDeclaration = (text, colon) => {
	// A spelling to drop leads with `-`; a custom property leads with `--` and is
	// neither prefixed nor spelled.
	if (text.charCodeAt(0) === CC_HYPHEN_MINUS) {
		return text.charCodeAt(1) !== CC_HYPHEN_MINUS;
	}
	const slot = _nameShapeSlot(text.charCodeAt(0), text.charCodeAt(1));
	if (slot === -1) return false;
	const lengths = _prefixableNames();
	return ((lengths[slot] >>> (colon < 0 || colon > 31 ? 31 : colon)) & 1) !== 0;
};

/**
 * The property a printed declaration sets, read from its text: a merged box
 * shorthand writes a different property than the node it is stored on.
 * @param {string} text the declaration's printed text
 * @param {number} colon where its `:` sits
 * @returns {string} the lowercased property name
 */
const _printedProperty = (text, colon) =>
	toLowerCaseIfNeeded(colon === -1 ? text : text.slice(0, colon));

// What a printed declaration carries after its value: the `;` closing it, and
// the `!important` before that where it has one (minifying leaves no space).
const _IMPORTANT = "!important";

/**
 * The value a printed declaration sets, read from its text — the whole value, so
 * only a declaration that is one keyword matches a keyword.
 * @param {string} text the declaration's printed text
 * @param {number} colon where its `:` sits
 * @returns {string} the lowercased value
 */
const _printedValue = (text, colon) =>
	toLowerCaseIfNeeded(text.slice(colon + 1, _printedValueEnd(text, colon)));

/**
 * A comma list's top-level items. What a later declaration has to write again for
 * an earlier one to be dead rather than the fallback an engine reads instead.
 * @param {string} value one printed declaration value
 * @returns {string[]} its items, in order
 */
const _valueItems = (value) => {
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
const _VENDOR_ITEM_PREFIX_RE = /^-[a-z]+-/i;

/**
 * Whether a later declaration of a `<custom-ident>` list leaves an earlier one
 * unreadable rather than standing as its fallback: every item the earlier writes
 * is written again, and every item the later adds is one of them under another
 * vendor spelling. A name is what that slot takes, so an engine knowing none of
 * the spellings still parses the value — there is nothing to fall back to.
 * `transition:box-shadow .25s` before `transition:box-shadow .25s,-webkit-box-shadow .25s`
 * is the shape, which is what a tool adding prefixes writes.
 * @param {string} later the later declaration's printed value
 * @param {string} earlier the earlier declaration's printed value
 * @returns {boolean} true when the earlier one can no longer be read
 */
const _coveredByLater = (later, earlier) => {
	const laterItems = _valueItems(later);
	const earlierItems = _valueItems(earlier);
	if (earlierItems.length === 0 || laterItems.length < earlierItems.length) {
		return false;
	}
	for (const item of earlierItems) {
		if (!laterItems.includes(item)) return false;
	}
	for (const item of laterItems) {
		if (earlierItems.includes(item)) continue;
		const bare = item.replace(_VENDOR_ITEM_PREFIX_RE, "");
		let variant = false;
		for (const other of earlierItems) {
			if (other.replace(_VENDOR_ITEM_PREFIX_RE, "") === bare) {
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
const _printedValueEnd = (text, colon) => {
	let end = text.length;
	if (text.charCodeAt(end - 1) === CC_SEMICOLON) end--;
	const bang = end - _IMPORTANT.length;
	if (bang > colon && text.startsWith(_IMPORTANT, bang)) end = bang;
	return end;
};

// A property's vendor value spellings back to the keyword each stands for, built
// on first use from the forward table.
/** @type {Map<Map<string, [string, number][]>, Map<string, string>>} */
const _prefixedValueKeywords = new Map();
/**
 * @param {Map<string, [string, number][]>} table one property's value table
 * @param {string} value a value that may be a vendor spelling
 * @returns {string | undefined} the keyword it spells, when it is one
 */
const _prefixedValueKeyword = (table, value) => {
	let reverse = _prefixedValueKeywords.get(table);
	if (reverse === undefined) {
		reverse = new Map();
		for (const [keyword, spellings] of table) {
			for (const [spelling] of spellings) reverse.set(spelling, keyword);
		}
		_prefixedValueKeywords.set(table, reverse);
	}
	return reverse.get(value);
};

/**
 * Whether a prelude token is a pseudo some engine spells with a prefix. It must
 * sit right after a `:` for the caller to ask, so a class of the same spelling is
 * not mistaken for it; the name matches ASCII case-insensitively, as property and
 * at-rule names do.
 * @param {string} part a printed prelude token
 * @returns {boolean} true when the table knows it, prefixed or not
 */
const _prefixablePseudo = (part) => {
	const name = toLowerCaseIfNeeded(_selectorPartName(part));
	return (
		PREFIXED_SELECTORS.has(name) || _prefixedSelectorName(name) !== undefined
	);
};

/**
 * One selector of a rule's prelude: the tokens it spans, and the sole prefixable
 * pseudo in it — `-1` where it has none, `-2` where it has more than one, which
 * leaves the whole rule alone.
 * @typedef {object} PrefixableSelector
 * @property {number} start its first prelude token
 * @property {number} end one past its last
 * @property {number} at the prefixable pseudo's token, or -1 / -2
 */

/**
 * Split a prelude into its selectors, marking the prefixable pseudo in each.
 * @param {string[]} parts the printed prelude tokens
 * @returns {PrefixableSelector[] | null} the selectors, or null when none carries one
 */
const _prefixableSelectors = (parts) => {
	// Nothing is built for a prelude that carries no prefixable pseudo, which is
	// nearly every one: the scan below only reads the tokens after a `:`.
	let any = false;
	for (let i = 1; i < parts.length; i++) {
		if (parts[i - 1] === ":" && _prefixablePseudo(parts[i])) {
			any = true;
			break;
		}
	}
	if (!any) return null;
	/** @type {PrefixableSelector[]} */
	const selectors = [];
	let start = 0;
	let at = -1;
	for (let i = 0; i <= parts.length; i++) {
		if (i === parts.length || parts[i] === ",") {
			// Whitespace around the comma says nothing, and would print back as a
			// space inside a rewritten list.
			let from = start;
			let to = i;
			while (from < to && parts[from] === _SEP) from++;
			while (to > from && parts[to - 1] === _SEP) to--;
			selectors.push({ start: from, end: to, at });
			start = i + 1;
			at = -1;
			continue;
		}
		if (i !== 0 && parts[i - 1] === ":" && _prefixablePseudo(parts[i])) {
			at = at === -1 ? i : -2;
		}
	}
	return selectors;
};

/**
 * A qualified rule prefixed against the target, for each selector of its list
 * that is a prefixable pseudo (`::placeholder`): a copy carrying the pseudo's
 * engine spelling is prepended for each prefix a target needs, and a
 * prefixed-only rule no target needs is dropped once its unprefixed twin has
 * been seen. A copy holds only the selectors that need that one prefix — an
 * engine drops a whole list over one selector it cannot parse, so a copy must
 * never mix spellings. The author's colons carry over.
 * @param {string} ruleText the rule's own serialized text
 * @param {string[]} parts the printed prelude tokens
 * @param {string} soft the space before `{` (empty minifying)
 * @param {string} body the rule's serialized block body
 * @param {PrefixScope} scope the block's running sibling state
 * @param {boolean} top whether the rule is the stylesheet's own, which is the only
 * one whose text is still a piece a twin can take back
 * @returns {string} the rule text, with prefixed copies added or itself dropped
 */
const _prefixQualifiedRule = (ruleText, parts, soft, body, scope, top) => {
	const seen = scope.seen;
	const selectors = _prefixableSelectors(parts);
	if (selectors === null) return ruleText;
	// A functional pseudo (`dir(rtl)`) keeps its argument; only the name is
	// matched and swapped, and the argument is part of the sibling signature so
	// `:dir(rtl)` and `:dir(ltr)` stay distinct.
	/** @type {string[]} */
	const bases = [];
	/** @type {string[]} */
	const args = [];
	/** @type {(string | undefined)[]} */
	const carried = [];
	/** @type {string | undefined} */
	let listPrefix;
	for (const selector of selectors) {
		const at = selector.at;
		if (at === -2) return ruleText;
		if (at === -1) {
			bases.push("");
			args.push("");
			carried.push(undefined);
			continue;
		}
		const raw = parts[at];
		const nameOnly = toLowerCaseIfNeeded(_selectorPartName(raw));
		const found = _prefixedSelectorName(nameOnly);
		// One spelling for the whole list: a list mixing a vendor-spelled pseudo
		// with a plainly spelled one, or with a second spelling, is neither this
		// rule's twin nor a copy of it.
		if (found !== undefined) {
			if (listPrefix !== undefined && listPrefix !== found[1]) return ruleText;
			listPrefix = found[1];
		}
		bases.push(found === undefined ? nameOnly : found[0]);
		args.push(raw.slice(_selectorPartName(raw).length));
		carried.push(found === undefined ? undefined : found[1]);
	}
	/**
	 * @param {(index: number) => string | null} spell each selector's pseudo, or null to leave it out
	 * @returns {string} the prelude those selectors print as
	 */
	const preludeOf = (spell) => {
		/** @type {string[]} */
		const out = [];
		for (let i = 0; i < selectors.length; i++) {
			const name = spell(i);
			if (name === null) continue;
			if (out.length !== 0) out.push(",");
			const { start, end, at } = selectors[i];
			for (let j = start; j < end; j++) out.push(j === at ? name : parts[j]);
		}
		return _join(out, false, _TRIM_COMBINATORS);
	};
	// This rule's cross-prefix identity: every prefixable pseudo folded to its
	// unprefixed spelling, so a prefixed list and its twin pair up.
	const signature = `s${preludeOf((i) =>
		selectors[i].at === -1 ? "" : bases[i] + args[i]
	)}`;
	if (listPrefix !== undefined) {
		// Every pseudo of the list carries that spelling, and each is dead weight on
		// its own.
		const removable = bases.every(
			(base, i) =>
				selectors[i].at === -1 ||
				_prefixRemovable(
					PREFIXED_SELECTORS,
					base,
					/** @type {string} */ (listPrefix)
				)
		);
		if (seen.has(signature) && removable) return "";
		seen.add(`${signature}\0${listPrefix}`);
		// Its twin may still be a later rule, which is where it is dropped.
		if (removable) _holdPrefixTwin(scope, signature, top);
		return ruleText;
	}
	seen.add(signature);
	_dropPrefixTwin(scope, signature);
	/** @type {(Set<string> | null)[]} */
	// One copy per spelling, never per engine: an engine that does not know one of
	// a list's selectors drops the list whole, and two names of one engine arrived
	// in different versions — `::-webkit-input-placeholder` in Chrome 6 and
	// `:-webkit-full-screen` in 15, so a list of both is nothing to Chrome 6
	// through 14. Selectors that take the same spelling take the same versions
	// with it, so those do share a copy.
	/** @type {(Set<string> | null)[]} */
	const needed = [];
	/** @type {Set<string> | null} */
	let spellings = null;
	for (let i = 0; i < selectors.length; i++) {
		const one =
			selectors[i].at === -1
				? null
				: _neededPrefixes(PREFIXED_SELECTORS, bases[i]);
		needed.push(one);
		if (one === null) continue;
		if (spellings === null) spellings = new Set();
		for (const spelling of one) spellings.add(spelling);
	}
	if (spellings === null) return ruleText;
	let out = "";
	for (const spelling of spellings) {
		// Skip only a spelling the source itself already carries (marked above when
		// the vendor-spelled rule is met); a copy is still added for every
		// unprefixed rule of this signature, so a later one that overrides an
		// earlier keeps its prefixed twin winning too.
		if (seen.has(`${signature}\0${spelling}`)) continue;
		const list = preludeOf((i) => {
			const one = needed[i];
			return one === null || !one.has(spelling) ? null : spelling + args[i];
		});
		out += `${list}${soft}{${body}}`;
	}
	return out + ruleText;
};

// A plain number, optionally a percentage — the only argument form these color
// conversions are proven for.
const _COLOR_NUMBER_RE = /^([+-]?(?:\d+\.?\d*|\.\d+))(%?)$/;
// The hue's default unit; the other angle units would need their own conversion
// before the same boundary test could be applied.
const _COLOR_HUE_RE = /^([+-]?(?:\d+\.?\d*|\.\d+))(?:deg)?$/i;

// How far a channel must sit from a `.5` rounding boundary to be converted.
// Implementations only ever disagree at a tie: across 317520 `hsl()` / `hwb()`
// samples checked against headless Chromium, every one of the divergences was
// within 9.24e-14 of a boundary, and none of the 264084 converted outside it was
// wrong. The margin is many orders above that and far below a visible difference.
const _ROUNDING_MARGIN = 1e-6;

// The Lab family needs a far wider one. Its conversion is a chain of matrices
// rather than a handful of multiplications, and webpack's chain and Chromium's
// disagree by up to 0.035 of a byte — measured over ~6000 `lab()` / `lch()` /
// `oklab()` / `oklch()` samples read back from a canvas. This is ~3x that bound.
const _LAB_ROUNDING_MARGIN = 0.1;

/**
 * Round a raw 0..255 channel, or return null when it sits close enough to a `.5`
 * boundary that another implementation's last bit could round it the other way.
 * @param {number} raw the channel, 0..255
 * @param {number} margin how far from a boundary the channel must sit
 * @returns {number | null} the byte, or null to keep the function
 */
const _channelByte = (raw, margin) => {
	// Past this the color is one sRGB cannot show, so clamping it into a hex would
	// pick a different color rather than respell the same one. Inside it, clamping
	// lands on the byte rounding would have picked anyway — which is what lets a
	// Lab white point a few 1e-6 past 255, or a channel a hundredth of a byte
	// under 0, still convert.
	if (raw < -0.5 || raw > 255.5) return null;
	if (Math.abs(Math.abs(raw - Math.floor(raw)) - 0.5) < margin) return null;
	const byte = Math.round(raw);
	return byte < 0 ? 0 : byte > 255 ? 255 : byte;
};

/**
 * CSS Color 4 §7.1's `hsl()` -> sRGB, on 0..1 inputs, in 0..255 output.
 * @param {number} h hue in degrees, already wrapped to 0..360
 * @param {number} s saturation 0..1
 * @param {number} l lightness 0..1
 * @returns {number[]} the raw `[r, g, b]` channels, 0..255
 */
const _hslToRgb = (h, s, l) => {
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
const _hwbToRgb = (h, w, b) => {
	if (w + b >= 1) {
		const gray = (w / (w + b)) * 255;
		return [gray, gray, gray];
	}
	return _hslToRgb(h, 1, 0.5).map(
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
const _gammaEncode = (c) => {
	const sign = c < 0 ? -1 : 1;
	const abs = Math.abs(c);
	return abs > 0.0031308
		? sign * (1.055 * abs ** (1 / 2.4) - 0.055)
		: 12.92 * c;
};

// The D50 white point Lab is defined against (CSS Color 4 §12), as XYZ.
const _D50 = [0.3457 / 0.3585, 1, (1 - 0.3457 - 0.3585) / 0.3585];

// Bradford-adapted D50 -> D65, then XYZ -> linear-light sRGB. Applied as the two
// steps CSS Color 4's own sample code uses rather than one composed matrix: the
// composition loses enough precision to push `lab(100% 0 0)` outside the gamut
// check below.
const _D50_TO_D65 = [
	[0.9554734527042182, -0.023098536874261423, 0.0632593086610217],
	[-0.028369706963208136, 1.0099954580058226, 0.021041398966943008],
	[0.012314001688319899, -0.020507696433477912, 1.3303659366080753]
];
const _XYZ_TO_LINEAR_SRGB = [
	[3.2409699419045226, -1.537383177570094, -0.4986107602930034],
	[-0.9692436362808796, 1.8759675015077202, 0.04155505740717559],
	[0.05563007969699366, -0.20397695888897652, 1.0569715142428786]
];

/**
 * @param {number[][]} matrix a 3x3 matrix
 * @param {number[]} vector the column it multiplies
 * @returns {number[]} the product
 */
const _multiply3 = (matrix, vector) =>
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
const _labToLinearSrgb = (l, a, b) => {
	const e = 216 / 24389;
	const k = 24389 / 27;
	const fy = (l + 16) / 116;
	const fx = a / 500 + fy;
	const fz = fy - b / 200;
	const xyz = [
		(fx ** 3 > e ? fx ** 3 : (116 * fx - 16) / k) * _D50[0],
		(l > k * e ? fy ** 3 : l / k) * _D50[1],
		(fz ** 3 > e ? fz ** 3 : (116 * fz - 16) / k) * _D50[2]
	];
	return _multiply3(_XYZ_TO_LINEAR_SRGB, _multiply3(_D50_TO_D65, xyz));
};

/**
 * Oklab -> linear-light sRGB (CSS Color 4 §9.2's matrices).
 * @param {number} l lightness 0..1
 * @param {number} a the a axis
 * @param {number} b the b axis
 * @returns {number[]} the linear `[r, g, b]` components, nominally 0..1
 */
const _oklabToLinearSrgb = (l, a, b) => {
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
 * The `<percentage>` that stands for 100% of each Lab-family axis (CSS Color 4
 * §9, §12), as `[lightness, axis]`.
 * @type {Map<string, number[]>}
 */
const _LAB_SCALES = new Map([
	["lab", [100, 125]],
	["lch", [100, 150]],
	["oklab", [1, 0.4]],
	["oklch", [1, 0.4]]
]);

/**
 * Minify `hsl()` / `hwb()` / `lab()` / `lch()` / `oklab()` / `oklch()` to the
 * shortest hex.
 *
 * Two guards keep the rewrite from changing the color. A channel landing within
 * `_ROUNDING_MARGIN` of a `.5` boundary keeps the function, because that is the
 * only place implementations disagree — it is why esbuild and lightningcss emit
 * different bytes for `hwb(194 0% 0%)`. And a Lab-family color outside the sRGB
 * gamut keeps its function too: hex cannot express it, so converting would clip
 * it to a different color. Both are limitations, not correctness gaps — the
 * declined share is small and every other minifier converts them regardless.
 * @param {string} fn the lowercased function name
 * @param {string} inner the already-joined argument text
 * @param {boolean} hexAlpha whether the target reads a 4-/8-digit hex (see `output.environment`)
 * @returns {string | null} the shortest color, or null to keep the function
 */
const _minifyPolarColorFunction = (fn, inner, hexAlpha) => {
	if (!_transforms.shortenColors) return null;
	const isHsl = fn === "hsl" || fn === "hsla";
	const labScale = _LAB_SCALES.get(fn);
	if (!isHsl && fn !== "hwb" && labScale === undefined) return null;
	const args = inner
		.replace(/\//g, " ")
		.split(/[\s,]+/)
		.filter((part) => part.length !== 0);
	if (args.length !== 3 && args.length !== 4) return null;
	let alpha = 1;
	if (args.length === 4) {
		const parsed = _COLOR_NUMBER_RE.exec(args[3]);
		if (parsed === null) return null;
		alpha = Number(parsed[1]) / (parsed[2] === "%" ? 100 : 1);
		if (!(alpha >= 0 && alpha <= 1)) return null;
		// A partly transparent color needs the hex-alpha spelling, which is the
		// target's question, not this one's.
		if (alpha < 1 && !hexAlpha) return null;
	}
	/** @type {number[]} */
	let raw;
	if (isHsl || fn === "hwb") {
		const hue = _COLOR_HUE_RE.exec(args[0]);
		const first = _COLOR_NUMBER_RE.exec(args[1]);
		const second = _COLOR_NUMBER_RE.exec(args[2]);
		if (hue === null || first === null || second === null) return null;
		if (first[2] !== "%" || second[2] !== "%") return null;
		const x = Number(first[1]) / 100;
		const y = Number(second[1]) / 100;
		if (x < 0 || x > 1 || y < 0 || y > 1) return null;
		let h = Number(hue[1]) % 360;
		if (h < 0) h += 360;
		raw = isHsl ? _hslToRgb(h, x, y) : _hwbToRgb(h, x, y);
	} else {
		const scale = /** @type {number[]} */ (labScale);
		const isPolar = fn === "lch" || fn === "oklch";
		const lightness = _COLOR_NUMBER_RE.exec(args[0]);
		const second = _COLOR_NUMBER_RE.exec(args[1]);
		const third = isPolar
			? _COLOR_HUE_RE.exec(args[2])
			: _COLOR_NUMBER_RE.exec(args[2]);
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
				? _labToLinearSrgb(l, a, b)
				: _oklabToLinearSrgb(l, a, b);
		// `_channelByte` decides the gamut from the encoded value, where the
		// question is whether clamping would move the byte.
		raw = linear.map((c) => _gammaEncode(c) * 255);
	}
	const margin =
		labScale === undefined ? _ROUNDING_MARGIN : _LAB_ROUNDING_MARGIN;
	/** @type {number[]} */
	const channels = [];
	for (const value of raw) {
		const byte = _channelByte(value, margin);
		if (byte === null) return null;
		channels.push(byte);
	}
	if (alpha < 1) {
		// The alpha is the author's own number rather than a conversion's output, so
		// it takes no boundary guard: the engine quantizes it to 8 bits either way,
		// exactly as `rgba()`'s does.
		return _shortestAlphaColor(
			channels[0],
			channels[1],
			channels[2],
			_clamp255(alpha * 255)
		);
	}
	return _shortestColor(channels[0], channels[1], channels[2]);
};

// Some mobile WebKit builds honor `-webkit-tap-highlight-color:rgba(0,0,0,0)`
// but ignore the equivalent `transparent`, so that one property keeps the
// function form (cssnano guards the same property).
/**
 * @returns {boolean} whether the value being printed belongs to `-webkit-tap-highlight-color`
 */
const _inTapHighlightColor = () =>
	_valueDeclaration !== null &&
	A.name(_valueDeclaration).toLowerCase() === "-webkit-tap-highlight-color";

/**
 * Write one `:nth-*()` in its shortest equal spelling: the An+B microsyntax
 * carries its own whitespace and signs, two keywords name a step of two, and a
 * step selecting exactly one child is the child that has its own name.
 * @param {string} name the lowercased function name
 * @param {string} inner the already-joined argument text
 * @returns {string} the whole replacement, `name(inner)` when nothing is shorter
 */
const _minifyAnPlusB = (name, inner) => {
	if (!_transforms.shortenSelectors) return `${name}(${inner})`;
	// `An+B of S` selects among S, which no plain spelling names.
	if (/\bof\b/i.test(inner)) return `${name}(${inner})`;
	const nth = _minifyNth(inner);
	if (nth === null) return `${name}(${inner})`;
	const first = NTH_NAMED_EQUIVALENTS.get(name);
	return nth === "1" && first !== undefined ? first : `${name}(${nth})`;
};

/**
 * Whether the declaration being printed is the font-family longhand, the one
 * place a `<family-name>` stands on its own rather than among other slots.
 * @returns {boolean} true inside such a declaration
 */
const _inFontFamily = () =>
	_valueDeclaration !== null &&
	equalsLowerCase(A.name(_valueDeclaration), "font-family");

/**
 * Whether the string is the whole entry in its comma-separated slot:
 * `<family-name>` takes `<string> | <custom-ident>+`, never a mix of the two.
 * @param {CssPath} path the accessor positioned on the string token
 * @returns {boolean} true when nothing else shares its slot
 */
const _isLoneFamilyName = (path) => {
	const parent = path.parent;
	// Directly in the declaration's value: inside a function the string is an
	// argument rather than a family.
	if (parent === null || path.type(parent) !== T_DECLARATION) return false;
	const self = path.start(path.node);
	const count = path.childCount(parent);
	let sharedSlot = false;
	let seenSelf = false;
	for (let at = 0; at < count; at++) {
		const child = path.childAt(parent, at);
		const type = path.type(child);
		if (type === T_COMMA) {
			if (seenSelf) return !sharedSlot;
			sharedSlot = false;
			continue;
		}
		if (type === T_WHITESPACE || type === T_COMMENT) continue;
		if (path.start(child) === self) seenSelf = true;
		else sharedSlot = true;
	}
	return seenSelf && !sharedSlot;
};

// One identifier, and a family name is a run of them parted by whitespace. The
// escapes a quoted name may carry are not identifier text, so one declines.
const _PLAIN_IDENT_RE = /^-?[A-Za-z_-￿][\w-￿-]*$/;

/**
 * Unquote a font family whose text is already a run of identifiers, which is
 * the other spelling `<family-name>` names. Returns null wherever the quotes
 * carry something: a generic family's own keyword, a CSS-wide keyword, or text
 * no identifier could spell.
 * @param {string} raw the string token as written, quotes included
 * @returns {string | null} the unquoted name, or null to keep the string
 */
const _unquoteFontFamily = (raw) => {
	if (!_transforms.normalizeQuotes) return null;
	const quote = raw.charCodeAt(0);
	if (quote !== CC_QUOTATION_MARK && quote !== CC_APOSTROPHE) return null;
	if (raw.length < 2 || raw.charCodeAt(raw.length - 1) !== quote) return null;
	const text = raw.slice(1, -1);
	if (text.includes("\\")) return null;
	const words = text.split(" ");
	if (words.length === 0 || text.length + 1 >= raw.length) return null;
	for (const word of words) {
		if (!_PLAIN_IDENT_RE.test(word)) return null;
		const lowered = toLowerCaseIfNeeded(word);
		// Unquoted, either would read as the grammar's keyword instead of a name.
		if (CSS_WIDE_KEYWORDS.has(lowered)) return null;
		// A generic family is one identifier, so only a lone word can be read as
		// one — `Apple Color Emoji` is three, whatever the last of them spells.
		if (words.length === 1 && GENERIC_FONT_FAMILIES.has(lowered)) return null;
	}
	return text;
};

/**
 * Whether the declaration being printed takes a color and never an identifier
 * of the author's own, so a named color in it is unambiguously that color.
 * @returns {boolean} true inside such a declaration
 */
const _inColorOnlyProperty = () =>
	_valueDeclaration !== null &&
	COLOR_ONLY_PROPERTIES.has(toLowerCaseIfNeeded(A.name(_valueDeclaration)));

/**
 * Whether the declaration being printed spells no name of the author's: its
 * grammar is keywords alone, or it takes a color, which is keywords and numbers.
 * An identifier standing directly in such a value is one of those keywords.
 * @returns {boolean} true inside such a declaration
 */
const _inKeywordOnlyValue = () => {
	if (_valueDeclaration === null) return false;
	// Memoized on the declaration: every identifier in one value asks the same
	// question, and answering it reads the name, folds it and looks it up twice.
	if (_keywordOnlyFor !== _valueDeclaration) {
		_keywordOnlyFor = _valueDeclaration;
		const property = _standardSpelling(
			toLowerCaseIfNeeded(A.name(_valueDeclaration))
		);
		_keywordOnly =
			KEYWORD_ONLY_PROPERTIES.has(property) ||
			COLOR_ONLY_PROPERTIES.has(property);
	}
	return _keywordOnly;
};

// A plain (non-scientific, unitless) number — the only argument form these
// equivalences are proven for; anything else (a `var()`, a dimension) keeps the
// function, since rewriting an invalid declaration would activate it.
const _PLAIN_NUMBER_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;

/**
 * Minify an easing function to its shorter, value-identical form:
 * `cubic-bezier()` to the keyword defining the same curve, `steps()` to
 * `step-start` / `step-end`, and the default `end` position away. Returns null
 * for anything else, keeping the function.
 * @param {string} fn the lowercased function name
 * @param {string} inner the already-joined argument text
 * @returns {string | null} the shorter easing function, or null to keep the function
 */
const _minifyEasingFunction = (fn, inner) => {
	if (!_transforms.reduceFunctions) return null;
	if (fn !== "cubic-bezier" && fn !== "steps") return null;
	const args = inner.split(",");
	if (fn === "cubic-bezier") {
		if (args.length !== 4) return null;
		let key = "";
		for (let i = 0; i < 4; i++) {
			const s = args[i].trim();
			if (!_PLAIN_NUMBER_RE.test(s)) return null;
			key += (i === 0 ? "" : ",") + Number.parseFloat(s);
		}
		const keyword = CUBIC_BEZIER_KEYWORDS.get(key);
		return keyword === undefined ? null : keyword;
	}
	if (args.length !== 2) return null;
	const count = args[0].trim();
	if (!/^\d+$/.test(count)) return null;
	const position = args[1].trim().toLowerCase();
	if (position === "start" || position === "jump-start") {
		// `start` is `jump-start`'s alias.
		return count === "1" ? "step-start" : `steps(${count},start)`;
	}
	if (position !== "end" && position !== "jump-end") return null;
	// `end` is `steps()`'s default position, so it always drops out.
	return count === "1" ? "step-end" : `steps(${count})`;
};

// Code points a url-token cannot carry unescaped, so a `url("…")` string only
// drops its quotes without them.
// eslint-disable-next-line no-control-regex -- a control code point is exactly what a url-token may not carry
const _UNQUOTABLE_URL_RE = /[\s"'()\\\u0000-\u001F\u007F]/;

// …of those, the ones a backslash alone escapes into a url-token. Every other
// one it cannot: a control code point takes a hex escape that is never shorter,
// and a backslash already there starts an escape this printer did not write, so
// the string keeps its quotes rather than having that escape rewritten.
const _URL_ESCAPABLE = new Set([" ", '"', "'", "(", ")"]);

/**
 * Rewrite a `url()`'s quoted body as the url-token spelling the same URL, or
 * null where none does. Every code point is classified — escaped, kept, or
 * refused — so nothing reaches the output unexamined.
 * @param {string} body the string's content, quotes excluded
 * @returns {string | null} the url-token text, or null to keep the quotes
 */
const _escapeUrlBody = (body) => {
	let out = "";
	let escapes = 0;
	for (const character of body) {
		if (_URL_ESCAPABLE.has(character)) {
			// Two escapes cost the two bytes the quotes did, so nothing is saved.
			if (++escapes > 1) return null;
			out += `\\${character}`;
			continue;
		}
		const code = /** @type {number} */ (character.codePointAt(0));
		if (character === "\\" || code < 0x20 || code === 0x7f) return null;
		out += character;
	}
	return escapes === 0 ? null : out;
};

const _PERCENT_ESCAPE_RE = /%[0-9a-f]{2}/gi;

// A `data:` URL up to the comma that ends its metadata. Only past that comma is
// an escape content the URL parser decodes before anything reads it; anywhere
// else it is structure — `%26` in a query is a literal `&`, not a separator.
const _DATA_URL_METADATA_RE = /^data:[^,]*,/i;

/**
 * Write each percent-escape a data URI's payload does not need as the byte it
 * names — three bytes for one, over the markup an inline SVG is made of.
 * @param {string} body the url's content, quotes excluded
 * @param {boolean} bare whether it is written as a url-token rather than a string
 * @param {string} quote the quote the body is written in, empty for a url-token
 * @returns {string} the body, its needless escapes decoded
 */
const _decodePercentEscapes = (body, bare, quote) => {
	const metadata = _DATA_URL_METADATA_RE.exec(body);
	if (metadata === null) return body;
	return (
		metadata[0] +
		body.slice(metadata[0].length).replace(_PERCENT_ESCAPE_RE, (escape) => {
			const code = Number.parseInt(escape.slice(1), 16);
			// Each escape names one byte, not one code point: `%C3%A9` is two bytes
			// of one character, and writing them apart would re-encode as four.
			if (code < 0x20 || code >= 0x7f) return escape;
			const one = String.fromCharCode(code);
			// `#` would start the fragment and `%` the next escape, so those two
			// stay; the quote and the escape character would end or extend the
			// string, and a url-token carries none of what the quotes were holding.
			if (one === "#" || one === "%" || one === quote || one === "\\") {
				return escape;
			}
			return bare && _UNQUOTABLE_URL_RE.test(one) ? escape : one;
		})
	);
};

/**
 * `url("a.png")` → `url(a.png)` when the quoted URL is also a valid url-token,
 * and a data URI's payload written as the bytes its escapes name. Nothing else
 * about the URL is rewritten, since webpack passes it through to a server that
 * may read it verbatim.
 * @param {string} fn the lowercased function name
 * @param {string} inner the already-joined argument text
 * @returns {string | null} the shorter `url()`, or null to keep the function
 */
const _minifyUrlFunction = (fn, inner) => {
	if (fn !== "url") return null;
	const quote = inner.charCodeAt(0);
	if (quote !== CC_QUOTATION_MARK && quote !== CC_APOSTROPHE) return null;
	if (inner.length < 2 || inner.charCodeAt(inner.length - 1) !== quote) {
		return null;
	}
	const written = inner.slice(1, -1);
	const mark = String.fromCharCode(quote);
	// The renderer reads source, so it is offered the decoded payload whatever
	// the switches say — `escapes` decides how the escapes are *printed*, not
	// whether a data URL holds a document.
	const decoded = _decodePercentEscapes(written, false, mark);
	// A `data:` payload a renderer rewrites is serialized afresh: what it hands
	// back is no longer what the quotes were written around. Quoted as written
	// where the answer is not in yet, the unquoted form below being unable to
	// carry what a document payload contains.
	if (_deferEmbeddedSource !== undefined) {
		const deferred = _deferDataUrl(
			decoded,
			(url) => `${fn}(${_serializeUrl(url, mark)})`,
			`${fn}(${mark}${written}${mark})`
		);
		if (deferred !== null) return deferred;
	}
	const rendered = _renderDataUrl(decoded);
	if (rendered !== null) return `${fn}(${_serializeUrl(rendered, mark)})`;
	// Taking the quotes off what is a url-token without them is `normalizeQuotes`;
	// writing a percent-escape as the byte it names is not a switch of its own —
	// an escape and the byte name one string, so nothing reads them apart.
	const body = decoded;
	if (!_transforms.normalizeQuotes) {
		return body === written ? null : `${fn}(${mark}${body}${mark})`;
	}
	if (!_UNQUOTABLE_URL_RE.test(body)) return `${fn}(${body})`;
	// A code point a url-token cannot carry can still be escaped into one, which
	// costs a byte where the two quotes cost two — so one of them is shorter
	// escaped and two are not.
	const escaped = _escapeUrlBody(body);
	if (escaped !== null) return `${fn}(${escaped})`;
	// It keeps its quotes, and with them whatever the escapes gave back.
	return body === written ? null : `${fn}(${mark}${body}${mark})`;
};

/**
 * Whether `text` re-tokenizes as exactly one `<ident-token>` — no escapes, and
 * no leading digit (`1x` is a dimension, `-1` a number) — so an attribute
 * selector's quoted value can drop its quotes.
 * @param {string} text the string's content, quotes excluded
 * @returns {boolean} true when it is a bare identifier
 */
const _isBareIdent = (text) => {
	const n = text.length;
	if (n === 0) return false;
	for (let i = 0; i < n; i++) {
		if (!_isIdentLike(text.charCodeAt(i))) return false;
	}
	const first = text.charCodeAt(0);
	if (_isDigit(first)) return false;
	// `-` alone is a delim, `-1` a number; `-x` / `--x` are idents.
	if (first === CC_HYPHEN_MINUS) return n > 1 && !_isDigit(text.charCodeAt(1));
	return true;
};

/**
 * Whether the code point an escape stands for can be written literally at
 * `index` of an identifier: it must be an ASCII ident code point, and the first
 * one must also be able to *start* an ident (`\31 x` is the class `1x`, but a
 * literal `1x` is a dimension). Non-ASCII stays escaped — writing it literally
 * would make the stylesheet's own encoding load-bearing.
 * @param {number} value the escape's code point
 * @param {string} written the identifier text emitted so far
 * @returns {boolean} true when the literal code point re-tokenizes the same
 */
const _canUnescape = (value, written) => {
	if (value >= 128 || !_isIdentCodePoint(value)) return false;
	if (written.length === 0) {
		return _isLetter(value) || value === CC_LOW_LINE;
	}
	// `-1` is a number and `--1` a valid ident, so only the second code point of
	// a leading `-` is constrained.
	if (written === "-") return !_isDigit(value);
	return true;
};

/**
 * Shorten the escapes in an identifier, two ways that both re-tokenize to the
 * same name: write the code point literally where it needs no escape at all
 * (`\41 bc` → `Abc`), and otherwise drop the whitespace that terminates a hex
 * escape when the code point after it, *inside this same token*, cannot extend
 * it (`\32 xl` → `\32xl`). A terminator that ends the token stays: the walk's
 * own separator would take its place and swallow the whitespace that follows
 * (`.\32   x` is the class `2` and a descendant `x`, not the class `2x`).
 * @param {string} text the identifier's source text
 * @returns {string} the identifier, escapes shortened
 */
const _minifyIdentEscapes = (text) => {
	if (!text.includes("\\")) return text;
	const n = text.length;
	let out = "";
	let i = 0;
	while (i < n) {
		const c = text.charCodeAt(i);
		if (c !== CC_REVERSE_SOLIDUS || i + 1 >= n) {
			out += text[i];
			i++;
			continue;
		}
		let digitEnd = i + 1;
		let value = 0;
		while (
			digitEnd < n &&
			digitEnd - i <= 6 &&
			_isHexDigit(text.charCodeAt(digitEnd))
		) {
			value = value * 16 + Number.parseInt(text[digitEnd], 16);
			digitEnd++;
		}
		const digits = digitEnd - i - 1;
		if (digits === 0) {
			// An identity escape (`\:`), which is what makes the code point literal —
			// dropping it would change the token.
			out += text[i] + text[i + 1];
			i += 2;
			continue;
		}
		// A hex escape ends at the first non-hex-digit; one whitespace there is
		// consumed as its terminator rather than being part of the name — and a
		// CRLF pair is one whitespace (`consumeExtraNewline`), so dropping only the
		// CR would leave a raw newline inside the identifier.
		let end = digitEnd;
		if (end < n && _isWhiteSpace(text.charCodeAt(end))) {
			end = consumeExtraNewline(text.charCodeAt(end), text, end + 1);
		}
		if (end !== digitEnd && end === n) {
			// The terminator is also where the identifier stops. Rewriting it hands
			// that job to the walk's own separator, which is not the same thing —
			// `.a\31 .b` is one compound selector, `.a1 .b` two.
			out += text.slice(i);
			break;
		}
		if (_canUnescape(value, out)) {
			out += String.fromCharCode(value);
			i = end;
			continue;
		}
		const keepTerminator =
			end !== digitEnd &&
			((digits !== 6 && _isHexDigit(text.charCodeAt(end))) ||
				_isWhiteSpace(text.charCodeAt(end)));
		out += text.slice(i, keepTerminator ? end : digitEnd);
		i = end;
	}
	return out;
};

/**
 * Write a token's terminator back. A `\` left dangling at EOF has to be replaced
 * rather than kept: kept, it would escape the terminator and leave the token open
 * on exactly the input this repairs. What it stands for differs by token — nothing
 * in a string (§4.3.5), U+FFFD in a url (§4.3.6 reads it as an escape, §4.3.7 ends
 * one at EOF with the replacement character).
 * @param {string} raw the token's source text, missing its terminator
 * @param {string} terminator the character that closes it
 * @param {string} dangling what a `\` left at EOF contributed to the token's value
 * @returns {string} the terminated token
 */
const _terminate = (raw, terminator, dangling) => {
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
 * The `url()` counterpart of `_isClosedString`: §4.3.6 ends a url-token at EOF, so
 * it has no closing `)` and the printer's next byte would land inside it.
 * @param {string} raw the url-token's source text
 * @returns {boolean} true when the `)` is absent or itself escaped
 */
const _isUnterminatedUrl = (raw) => {
	const n = raw.length;
	if (n < 2 || raw.charCodeAt(n - 1) !== CC_RIGHT_PARENTHESIS) return true;
	let backslashes = 0;
	for (let i = n - 2; i > 0 && raw.charCodeAt(i) === CC_REVERSE_SOLIDUS; i--) {
		backslashes++;
	}
	return backslashes % 2 === 1;
};

/**
 * Normalize a string token's quotes, following cssnano's `postcss-normalize-string`:
 * prefer `"`, switch to whichever quote needs fewer escapes, and unescape a quote
 * the chosen wrapper no longer escapes. A string already holding a literal quote
 * keeps its wrapper — the other kind is the cheap one there. Value-identical; a
 * `\`-newline continuation is left alone because dropping it could fuse into a
 * preceding hex escape.
 * A hex escape stays as written: the character it names costs gzip bytes where
 * it saves raw ones (measured in `configCases/css/minimize-values`).
 * @param {string} raw the string token's source text, quotes included
 * @returns {string} the normalized string token
 */
const _minifyString = (raw) => {
	if (!_transforms.normalizeQuotes) return raw;
	const quote = raw.charCodeAt(0);
	const n = raw.length;
	// A string the tokenizer closed at EOF has no matching final quote; rewriting
	// one would move where it ends.
	if (n < 2 || raw.charCodeAt(n - 1) !== quote) return raw;
	// The overwhelmingly common string — already `"`-wrapped, no escape and no
	// literal `'` — is unchanged; two native scans beat the counting loop below.
	if (
		quote === CC_QUOTATION_MARK &&
		!raw.includes("\\") &&
		!raw.includes("'")
	) {
		return raw;
	}
	let literalQuotes = 0;
	let escapedDoubleQuotes = 0;
	let escapedSingleQuotes = 0;
	for (let i = 1; i < n - 1; i++) {
		const c = raw.charCodeAt(i);
		if (c === CC_REVERSE_SOLIDUS) {
			// The escape swallows the final quote (`"x\"` at EOF): the string never
			// closed, so its last character is content, not a wrapper to rewrite.
			if (i + 1 === n - 1) return raw;
			const next = raw.charCodeAt(i + 1);
			if (next === CC_QUOTATION_MARK) escapedDoubleQuotes++;
			else if (next === CC_APOSTROPHE) escapedSingleQuotes++;
			i++;
		} else if (c === CC_QUOTATION_MARK || c === CC_APOSTROPHE) {
			literalQuotes++;
		}
	}
	if (literalQuotes !== 0) return raw;
	if (escapedDoubleQuotes === 0 && escapedSingleQuotes === 0) {
		return quote === CC_QUOTATION_MARK ? raw : `"${raw.slice(1, -1)}"`;
	}
	let want = quote;
	if (quote === CC_APOSTROPHE && escapedDoubleQuotes === 0) {
		want = CC_QUOTATION_MARK;
	} else if (quote === CC_QUOTATION_MARK && escapedSingleQuotes === 0) {
		want = CC_APOSTROPHE;
	}
	const wrapper = String.fromCharCode(want);
	let out = wrapper;
	for (let i = 1; i < n - 1; i++) {
		const c = raw.charCodeAt(i);
		if (c !== CC_REVERSE_SOLIDUS) {
			out += raw[i];
			continue;
		}
		const next = raw.charCodeAt(i + 1);
		out +=
			(next === CC_QUOTATION_MARK || next === CC_APOSTROPHE) && next !== want
				? raw[i + 1]
				: raw[i] + raw[i + 1];
		i++;
	}
	return out + wrapper;
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
const _lowercaseConditionParts = (parts) => {
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		// Folded first, for the reason `_foldPseudoNames` folds first.
		const lowered = asciiLowerCaseName(part);
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

/**
 * Fold a selector's pseudo names to lowercase and drop the redundant colon of a
 * CSS2 pseudo-element, in one pass over the printed parts: both read the part
 * after a `:`, and the fold is what the legacy name is then matched against.
 * Empty parts are stepped over — a comment between the colons printed away, and
 * the tokenizer had already dropped it anyway.
 * @param {string[]} parts the prelude's printed parts
 * @returns {void}
 */
const _foldPseudoNames = (parts) => {
	const dropping = _transforms.shortenSelectors;
	// The two non-empty parts before the current one.
	let first = -1;
	let second = -1;
	for (let i = 0; i < parts.length; i++) {
		let part = parts[i];
		if (part.length === 0) continue;
		// A pseudo's name matches ASCII case-insensitively, a type selector's does
		// not (`linearGradient` is an SVG element) and neither does an id, a class
		// or an attribute's value. A functional pseudo prints as one token and
		// folds its own name, its argument being the author's.
		if (second !== -1 && parts[second] === ":") {
			const lowered = asciiLowerCaseName(part);
			if (lowered !== part && !part.includes("(")) {
				part = lowered;
				parts[i] = lowered;
			}
			// Folded first, so the legacy name below is matched against the folded
			// text rather than folded a second time.
			if (
				dropping &&
				first !== -1 &&
				parts[first] === ":" &&
				LEGACY_PSEUDO_ELEMENTS.has(part)
			) {
				parts[first] = "";
			}
		}
		first = second;
		second = i;
	}
};

// The `An+B` microsyntax (CSS Syntax 3 §6), whose whitespace and `+` are its
// own: `2n + 1`, `+3` and `2N+1` all say what a shorter spelling does.
const _NTH_RE =
	/^\s*(?:([+-]?)\s*(\d*)[nN]\s*(?:([+-])\s*(\d+))?|([+-]?)\s*(\d+))\s*$/;

/**
 * Write one `An+B` in its shortest equal spelling.
 * @param {string} text the argument between the parentheses
 * @returns {string | null} the shortest spelling, or null when it is not `An+B`
 */
const _minifyNth = (text) => {
	const lower = text.trim().toLowerCase();
	let a;
	let b;
	if (lower === "even") {
		a = 2;
		b = 0;
	} else if (lower === "odd") {
		a = 2;
		b = 1;
	} else {
		const parts = _NTH_RE.exec(text);
		if (parts === null) return null;
		if (parts[6] !== undefined) {
			a = 0;
			b = Number(`${parts[5] === "-" ? "-" : ""}${parts[6]}`);
		} else {
			a = Number(
				`${parts[1] === "-" ? "-" : ""}${parts[2] === "" ? "1" : parts[2]}`
			);
			b = parts[4] === undefined ? 0 : Number(`${parts[3]}${parts[4]}`);
		}
	}
	// Past the safe range a rewrite would print a different integer than it read.
	if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b)) return null;
	if (a === 0) return String(b);
	// A step forward only ever reaches `B` again from below, and an index under 1
	// matches nothing — so those terms are dropped by naming the first real one.
	// Landing on the step itself is the bare `An`, which starts there anyway.
	if (a > 0) {
		if (b < 1) b = ((((b - 1) % a) + a) % a) + 1;
		if (b === a) b = 0;
	}
	// The one An+B a keyword names in fewer bytes.
	if (a === 2 && b === 1) return "odd";
	const step = `${a === 1 ? "" : a === -1 ? "-" : a}n`;
	return b === 0 ? step : `${step}${b > 0 ? "+" : "-"}${Math.abs(b)}`;
};

// One `urange` (CSS Syntax 3 §11.2): `U+` then hex digits, then either a `-`
// and a second run or trailing `?` wildcards. Case is insignificant.
const _URANGE_RE =
	/^u\+(?:([\da-f]{0,6})(\?{1,6})|([\da-f]{1,6})(?:-([\da-f]{1,6}))?)$/i;

/**
 * Write one `urange` in its shortest equal spelling: leading zeros carry
 * nothing, and a range whose start is a prefix followed by zeros and whose end
 * is that prefix followed by `f`s is what the `?` wildcard says.
 * @param {string} range one urange token
 * @returns {string} the shortest spelling, or `range` when nothing is shorter
 */
const _minifyUnicodeRange = (range) => {
	if (!_transforms.shortenNumbers) return range;
	const parts = _URANGE_RE.exec(range);
	if (parts === null) return range;
	/** @type {(hex: string) => string} */
	const strip = (hex) => hex.replace(/^0+(?=.)/, "");
	// `U+00??` covers what `U+??` does — the zeros are as leading as any other.
	if (parts[2] !== undefined) {
		const head = parts[1].replace(/^0+/, "");
		const out = `U+${head}${parts[2]}`;
		return out.length < range.length ? out : range;
	}
	const start = strip(parts[3]);
	if (parts[4] === undefined) {
		const out = `U+${start}`;
		return out.length < range.length ? out : range;
	}
	const end = strip(parts[4]);
	let best = `U+${start}-${end}`;
	// The wildcard needs both bounds the same width to compare digit by digit.
	if (start.length <= end.length) {
		const padded = start.padStart(end.length, "0");
		let wild = 0;
		while (
			wild < padded.length &&
			padded.charAt(padded.length - 1 - wild) === "0" &&
			end.charAt(end.length - 1 - wild).toLowerCase() === "f"
		) {
			wild++;
		}
		while (wild > 0) {
			const head = padded.slice(0, padded.length - wild);
			// `equalsLowerCase` lowercases only its first argument.
			if (
				equalsLowerCase(head, end.slice(0, end.length - wild).toLowerCase())
			) {
				const out = `U+${head.replace(/^0+/, "")}${"?".repeat(wild)}`;
				if (out.length < best.length) best = out;
				break;
			}
			wild--;
		}
	}
	return best.length < range.length ? best : range;
};

// `@keyframes` and every vendor spelling of it, whose prelude is a name and
// whose child preludes are keyframe selectors rather than selector lists.
const KEYFRAMES_AT_RULE_RE = /^(?:-[a-z]+-)?keyframes$/i;

// Media Queries 4 §2.4: `min-`/`max-` prefixes exist only on range-type media
// features, and `min-X: Y` is exactly `X >= Y`. The range spelling is the newer
// one, so it is only reached for where the target reads it.
const _RANGE_PREFIX_RE = /^(min|max)-(.+)$/i;

/**
 * Rewrite a media feature's `min-` / `max-` prefix to the range spelling, in the
 * printed parts, in place. Only a whole `(<feature>:<value>)` — a condition made
 * of anything else (a boolean feature, an `and` chain, a nested block) is left
 * for its own parts to handle.
 * @param {string[]} parts the block's printed parts
 * @returns {void}
 */
const _useRangeSpelling = (parts) => {
	if (!_transforms.shortenMediaQueries) return;
	// The separators go with the join's condition trim, so a spaced
	// `( min-width : 1px )` is the same feature as a tight one.
	/** @type {number[]} */
	const filled = [];
	for (let i = 0; i < parts.length; i++) {
		if (parts[i].length !== 0 && parts[i] !== _SEP) filled.push(i);
	}
	if (filled.length < 3 || parts[filled[1]] !== ":") return;
	const feature = _RANGE_PREFIX_RE.exec(parts[filled[0]]);
	if (feature === null) return;
	parts[filled[0]] = feature[2];
	parts[filled[1]] = feature[1].toLowerCase() === "min" ? ">=" : "<=";
};

// One printed `(<feature><comparison><value>)`, the shape the range spelling
// leaves behind. Media Queries 4 §2.4.3 writes an interval with both
// comparisons pointing the same way, so a pair is only ever joined as `<`.
const _RANGE_CONDITION_RE = /^\(([-\w]+)(>=|<=|>|<)([^()<>]+)\)$/;

/**
 * Collapse an `and` of two one-sided ranges on one feature into the interval
 * that says the same (`(width>=1px) and (width<=2px)` is `(1px<=width<=2px)`),
 * in the printed parts, in place. Only a bounded pair — two comparisons the
 * same way round are not an interval, and `or` is not a conjunction.
 * @param {string[]} parts the prelude's printed parts
 * @returns {void}
 */
const _collapseRangeInterval = (parts) => {
	if (!_transforms.shortenMediaQueries) return;
	/** @type {number[]} */
	const filled = [];
	for (let i = 0; i < parts.length; i++) {
		if (parts[i].length !== 0 && parts[i] !== _SEP) filled.push(i);
	}
	for (let i = 0; i + 2 < filled.length; i++) {
		if (!equalsLowerCase(parts[filled[i + 1]], "and")) continue;
		const left = _RANGE_CONDITION_RE.exec(parts[filled[i]]);
		if (left === null) continue;
		const right = _RANGE_CONDITION_RE.exec(parts[filled[i + 2]]);
		if (right === null) continue;
		if (!equalsLowerCase(left[1], right[1])) continue;
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

/**
 * Drop the universal selector a compound already implies (`*:before` is
 * `:before`), in the printed parts, in place. `*` carries no specificity and
 * matches every element, so a qualified compound means the same without it.
 * @param {string[]} parts the prelude's printed parts
 * @returns {void}
 */
/**
 * Whether the simple selector at `at` selects a featureless element, which
 * matches no type or universal selector — so the `*` before it is what keeps
 * the rule from matching, not a spelling of it.
 * @param {string[]} parts the printed selector, one piece per token
 * @param {number} at where the simple selector starts
 * @returns {boolean} true when the `*` before it has to stay
 */
const _selectsFeatureless = (parts, at) => {
	if (parts[at] !== ":") return false;
	let name = at + 1;
	while (name < parts.length && parts[name].length === 0) name++;
	if (name >= parts.length) return false;
	// A functional pseudo-class arrives with its arguments attached.
	const open = parts[name].indexOf("(");
	const named = open === -1 ? parts[name] : parts[name].slice(0, open);
	return FEATURELESS_PSEUDO_CLASSES.has(toLowerCaseIfNeeded(named));
};

/**
 * Drop the universal selector a compound already implies (`*:before` is
 * `:before`), in the printed parts, in place. `*` carries no specificity and
 * matches every element, so a qualified compound means the same without it —
 * except before a featureless pseudo-class, which no element with features
 * matches.
 * @param {string[]} parts the prelude's printed parts
 * @returns {void}
 */
const _dropImpliedUniversalSelector = (parts) => {
	if (!_transforms.shortenSelectors) return;
	let previous = -1;
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		if (part.length === 0) continue;
		if (
			previous !== -1 &&
			parts[previous] === "*" &&
			COMPOUND_CONTINUATIONS.has(part.charAt(0)) &&
			(previous === 0 || parts[previous - 1] !== "|") &&
			!_selectsFeatureless(parts, i)
		) {
			parts[previous] = "";
		}
		previous = i;
	}
};

/**
 * Split a selector list at the commas that separate its selectors. A comma
 * inside `:is(…)`, an attribute value or a string belongs to one selector.
 * @param {string} prelude the printed selector list
 * @returns {string[]} the selectors, in written order
 */
const _splitSelectorList = (prelude) => {
	/** @type {string[]} */
	const out = [];
	let depth = 0;
	let quote = 0;
	let start = 0;
	for (let i = 0; i < prelude.length; i++) {
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
			depth++;
		} else if (code === CC_RIGHT_PARENTHESIS || code === CC_RIGHT_SQUARE) {
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
const _SUBSTITUTION_RE = new RegExp(
	`(?:^|[^\\w-])(?:${[...SUBSTITUTION_FUNCTIONS].join("|")})\\(|--[\\w-]*\\(`,
	"i"
);

/**
 * Whether a value reads a substitution, so its tokens are not what the engine
 * will see there.
 * @param {string} text the text to look in
 * @returns {boolean} true when a substitution may stand in it
 */
const _hasSubstitution = (text) =>
	// Every shape `_SUBSTITUTION_RE` accepts ends in `(`, and most values hold
	// none at all — so one scan for it answers them without running the shape.
	text.includes("(") && _SUBSTITUTION_RE.test(text);

/**
 * {@link _hasSubstitution} over a span of the input, which is cut out only once
 * the span turns out to hold a `(` at all.
 * @param {number} from the span's start offset
 * @param {number} to the span's end offset
 * @returns {boolean} true when a substitution may stand in it
 */
const _hasSubstitutionInSpan = (from, to) => {
	// The walk asks for a declaration's span and the printer asks again for the
	// same one, so one entry spares the second scan and the slice under it.
	if (from === _substitutionSpanFrom && to === _substitutionSpanTo) {
		return _substitutionSpanHas;
	}
	let has = false;
	for (let i = from; i < to; i++) {
		if (_input.charCodeAt(i) === CC_LEFT_PARENTHESIS) {
			has = _SUBSTITUTION_RE.test(_input.slice(from, to));
			break;
		}
	}
	_substitutionSpanFrom = from;
	_substitutionSpanTo = to;
	_substitutionSpanHas = has;
	return has;
};

// The span `_hasSubstitutionInSpan` last answered for. Offsets index the current
// input, so a new stylesheet resets them.
let _substitutionSpanFrom = -1;
let _substitutionSpanTo = -1;
let _substitutionSpanHas = false;

/**
 * Split a declaration value into its top-level components. Whitespace parts
 * them, and so does a `/` delim — it separates `border-radius`'s two boxes and
 * needs no whitespace of its own. A comment is no tree node, so the gap it
 * leaves between two children parts them too: it ends both tokens, and a
 * rewritten value joins its components with a space that has to stand where
 * the comment did.
 * @param {CssPath} path the accessor positioned on the declaration
 * @param {Node} node the declaration whose value's children are read
 * @param {PrintContext} writer the print context (children's printed text)
 * @returns {string[]} the components, with a `/` delim as its own entry
 */
const _valueComponents = (path, node, writer) => {
	/** @type {string[]} */
	const components = [];
	let current = "";
	let previousEnd = -1;
	const count = path.childCount(node);
	for (let at = 0; at < count; at++) {
		const child = path.childAt(node, at);
		const type = path.type(child);
		const text = writer.get(child);
		const start = path.start(child);
		if (current.length !== 0 && start !== previousEnd) {
			components.push(current);
			current = "";
		}
		previousEnd = path.end(child);
		if (type === T_WHITESPACE || (type === T_DELIM && text === "/")) {
			if (current.length !== 0) components.push(current);
			current = "";
			if (type === T_DELIM) components.push("/");
			continue;
		}
		current += text;
	}
	if (current.length !== 0) components.push(current);
	return components;
};

/**
 * A custom property's value, token for token: every token is written back as
 * written, and a run of whitespace and dropped comments between two of them is
 * one boundary — the space they need, or nothing where a comma or a block edge
 * is already one, which leaves every `var()` the same token stream.
 * @param {CssPath} path the accessor positioned on the declaration
 * @param {ComponentValue[]} children the tokens to print
 * @param {PrintContext} writer the print context (holds the kept comments)
 * @param {number} from source offset the tokens start at
 * @param {number} to source offset they end at
 * @returns {string} the printed value
 */
const _customPropertyValue = (path, children, writer, from, to) => {
	let out = "";
	let at = from;
	// The boundary held back: whether a whitespace token stood in it, whether a
	// dropped comment did, and whether a comma closed it.
	let spaced = false;
	let dropped = false;
	let comma = false;
	for (const child of children) {
		const start = path.start(child);
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
			}
		}
		at = path.end(child);
		const type = path.type(child);
		if (type === T_WHITESPACE) {
			spaced = true;
			continue;
		}
		if (type === T_COMMA) {
			out += ",";
			spaced = false;
			dropped = false;
			comma = true;
			continue;
		}
		const text = _customPropertyToken(path, child, writer);
		// A comma or a block delimiter is a boundary of its own, so the whitespace
		// beside one says nothing — except before `(`, which an ident in front of
		// makes a function token, and that is what `_wouldFuseTokens` answers.
		if (!comma && out !== "") {
			const last = out.charCodeAt(out.length - 1);
			const fuses = dropped && _wouldFuseTokens(last, text, out);
			const parted =
				CUSTOM_PROPERTY_CLOSERS.includes(out[out.length - 1]) ||
				CUSTOM_PROPERTY_OPENERS.includes(text[0]);
			if (fuses || (spaced && !parted)) out += " ";
		}
		out += text;
		spaced = false;
		dropped = false;
		comma = false;
	}
	// A trailing boundary separates the last token from a `)` or the value's end,
	// neither of which it can fuse with; only a kept comment in it still prints.
	if (at !== to) {
		const kept = writer.takeInserts(at, to);
		if (kept !== "") {
			if (spaced && out !== "") out += " ";
			out += kept;
		}
	}
	return out;
};

/** What makes a token worth reading through rather than writing back whole. */
const CUSTOM_PROPERTY_REWRITABLE_RE = /[\t\n\f\r ,]|\/\*/;

// Block delimiters a token cannot fuse across, so whitespace beside one goes.
// `(` is not among the openers: an ident in front of it makes a function token.
const CUSTOM_PROPERTY_CLOSERS = ")]}";
const CUSTOM_PROPERTY_OPENERS = "[{";

/**
 * One token of a custom property's value, as written — recursing into a
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
const _customPropertyToken = (path, child, writer) => {
	// Rewriting: the token already printed minified, its own nesting included.
	if (_rewriteCustomProperties) return writer.get(child);
	const source = path.source(child);
	const type = path.type(child);
	// The input ran out inside this token, so the engine closed it there and the
	// printer has to as well — otherwise the `}` written after it is read as part
	// of the token rather than as the end of the rule.
	if (path.end(child) === _input.length) {
		// A url token holds a value its text no longer spells only when an escape
		// was truncated; `url(foo` the engine echoes open, and so does this.
		if (
			type === T_URL &&
			source !== _input.slice(path.start(child), path.end(child))
		) {
			return `${source})`;
		}
		if (type === T_STRING && !_isClosedString(source)) {
			return source + source[0];
		}
	}
	if (
		(type !== T_FUNCTION && type !== T_SIMPLE_BLOCK) ||
		!CUSTOM_PROPERTY_REWRITABLE_RE.test(source)
	) {
		return source;
	}
	const start = path.start(child);
	const end = path.end(child);
	let opened = path.nameEnd(child) + 1;
	let closer = ")";
	if (type === T_SIMPLE_BLOCK) {
		const block = path.blockToken(child);
		opened = start + 1;
		closer = block === "[" ? "]" : block === "{" ? "}" : ")";
	}
	// Closed at EOF: there is no closer to write back, and it ends the value.
	const closed = _input[end - 1] === closer;
	const inner = _customPropertyValue(
		path,
		path.children(child),
		writer,
		opened,
		closed ? end - 1 : end
	);
	return `${_input.slice(start, opened)}${inner}${closed ? closer : ""}`;
};

/**
 * Split top-level components into the layers a comma parts. A comma is no
 * separator of its own, so it rides on the component it follows and a layer's
 * last component has to be cut back out of it.
 * @param {string[]} components the value's top-level components
 * @returns {string[][]} one entry per layer, each its own component list
 */
const _valueLayers = (components) => {
	/** @type {string[][]} */
	const layers = [];
	/** @type {string[]} */
	let current = [];
	for (const component of components) {
		let depth = 0;
		let start = 0;
		for (let i = 0; i < component.length; i++) {
			const character = component[i];
			if (character === "(") {
				depth++;
			} else if (character === ")") {
				depth--;
			} else if (character === "," && depth === 0) {
				if (i > start) current.push(component.slice(start, i));
				layers.push(current);
				current = [];
				start = i + 1;
			}
		}
		if (start < component.length) current.push(component.slice(start));
	}
	layers.push(current);
	return layers;
};

/**
 * Drop the box values CSS's `{1,4}` notation already implies: an omitted value
 * is copied from the opposite side, so a 4th equal to the 2nd, a 3rd equal to
 * the 1st and a 2nd equal to the 1st are each redundant.
 * @param {string[]} values one box's components
 * @returns {string[] | null} the kept values, or `null` when the box cannot be collapsed
 */
const _collapseBox = (values) => {
	const n = values.length;
	if (n === 0 || n > 4) return null;
	for (const value of values) {
		if (_hasSubstitution(value)) return null;
		if (n > 1 && CSS_WIDE_KEYWORDS.has(toLowerCaseIfNeeded(value))) {
			return null;
		}
	}
	let end = n;
	if (end === 4 && values[3] === values[1]) end = 3;
	if (end === 3 && values[2] === values[0]) end = 2;
	if (end === 2 && values[1] === values[0]) end = 1;
	return values.slice(0, end);
};

/**
 * Whether a shorthand's slots mix a bare non-zero number with a length or a
 * percentage. No box slot reads both, so one of them was never read at all.
 * @param {string[]} values one shorthand's slot values
 * @returns {boolean} true when the two kinds stand together
 */
const _mixesBareNumberWithLength = (values) => {
	let bareNumber = false;
	let measured = false;
	for (const value of values) {
		const kind = _componentKind(value);
		if (kind === _COMPONENT_NUMBER) bareNumber = true;
		else if (kind !== _COMPONENT_OTHER) measured = true;
	}
	return bareNumber && measured;
};

// What a shorthand component is, coarsely: a fold is only safe between two of
// the same kind, since a slot taking one takes the other. `0` is a length
// wherever a dimension is, and a bare non-zero number is neither (`padding:.25`
// is invalid, and folding it in would make the whole shorthand invalid).
const _COMPONENT_OTHER = 0;
const _COMPONENT_LENGTH = 1;
const _COMPONENT_PERCENTAGE = 2;
const _COMPONENT_NUMBER = 3;

/**
 * @param {string} component one printed component of a shorthand's value
 * @returns {number} one of the `_COMPONENT_*` kinds
 */
const _componentKind = (component) => {
	if (!NUMERIC_COMPONENT_RE.test(component)) return _COMPONENT_OTHER;
	const last = component.charCodeAt(component.length - 1);
	if (last === CC_PERCENTAGE) return _COMPONENT_PERCENTAGE;
	// A unit is what makes a non-zero number a length, and a digit is no unit —
	// `.25` is a bare number, which no box slot taking a length accepts.
	if (!_isDigit(last)) return _COMPONENT_LENGTH;
	return ZERO_NUMBER_RE.test(component) ? _COMPONENT_LENGTH : _COMPONENT_NUMBER;
};

// A number with an optional sign and fraction, then a unit or `%` or nothing.
const NUMERIC_COMPONENT_RE = /^[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:%|[a-z]+)?$/i;
// The same, written zero — every spelling of it, so `0.0` is a length too.
const ZERO_NUMBER_RE = /^[-+]?0*(?:\.0*)?$/;

/**
 * One box or pair shorthand's value read back as the slots it fills — `1px 2px`
 * as all four sides, so a longhand can take one of them over.
 * @param {string} value the shorthand's printed value
 * @param {number} slots how many the shorthand holds (4 for a box, 2 for a pair)
 * @returns {string[] | null} the filled slots, or null when it fills none of them
 */
const _expandBox = (value, slots) => {
	const written = _splitTopLevelSpaces(value);
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
 * @returns {void}
 */
const _foldFollowingLonghands = (path, items, texts, superseded) => {
	let shorthand = -1;
	for (let i = 0; i < items.length; i++) {
		if (path.type(items[i]) !== T_DECLARATION || texts[i].length === 0) {
			shorthand = -1;
			continue;
		}
		if (superseded.has(i)) continue;
		if (shorthand !== -1 && _foldInto(path, items, texts, shorthand, i)) {
			superseded.add(i);
			continue;
		}
		shorthand = i;
	}
};

/**
 * @param {CssPath} path the accessor
 * @param {Node[]} items the block's children
 * @param {string[]} texts their printed text, rewritten in place
 * @param {number} at the shorthand's index
 * @param {number} from the longhand's index
 * @returns {boolean} true when the two were folded into one
 */
const _foldInto = (path, items, texts, at, from) => {
	if (path.important(items[at]) !== path.important(items[from])) return false;
	const shorthandText = texts[at];
	const longhandText = texts[from];
	const shorthandColon = shorthandText.indexOf(":");
	const longhandColon = longhandText.indexOf(":");
	if (shorthandColon <= 0 || longhandColon <= 0) return false;
	const property = _printedProperty(shorthandText, shorthandColon);
	const sides = BOX_LONGHANDS.get(property) || PAIR_LONGHANDS.get(property);
	if (sides === undefined) return false;
	const slot = sides.indexOf(_printedProperty(longhandText, longhandColon));
	if (slot === -1) return false;
	const shorthandValue = _printedValue(shorthandText, shorthandColon);
	const longhandValue = _printedValue(longhandText, longhandColon);
	// A substitution may stand for any number of slots, and a comma list is no
	// box at all — neither reads back as the slots this fills.
	if (_hasSubstitution(shorthandValue) || _hasSubstitution(longhandValue)) {
		return false;
	}
	if (_valueItems(shorthandValue).length !== 1) return false;
	if (_splitTopLevelSpaces(longhandValue).length !== 1) return false;
	// Validity is per property, and a component the property does not accept
	// makes the whole shorthand invalid — which loses the slots that were fine.
	// So the two are folded only where they are the same narrow numeric class,
	// which every box slot of that family accepts wherever one of them does.
	const kind = _componentKind(longhandValue);
	if (kind === _COMPONENT_OTHER) return false;
	for (const component of _splitTopLevelSpaces(shorthandValue)) {
		if (_componentKind(component) !== kind) return false;
	}
	const filled = _expandBox(shorthandValue, sides.length);
	if (filled === null) return false;
	filled[slot] = longhandValue;
	const collapsed = _collapseBox(filled);
	if (collapsed === null) return false;
	if (
		collapsed.length !== 1 &&
		ONE_VALUE_PAIR_SHORTHANDS.has(property) &&
		!_overflowTwoValuesAllowed
	) {
		return false;
	}
	if (
		collapsed.length !== 1 &&
		PLACE_SHORTHANDS.has(property) &&
		!_placeShorthandAllowed
	) {
		return false;
	}
	const important = path.important(items[at]) ? _IMPORTANT : "";
	const folded = `${property}:${collapsed.join(" ")}${important};`;
	if (folded.length >= shorthandText.length + longhandText.length) return false;
	texts[at] = folded;
	return true;
};

/**
 * @param {string[]} a one component list
 * @param {string[]} b another component list
 * @returns {boolean} whether they are the same components in the same order
 */
const _sameComponents = (a, b) =>
	a.length === b.length && a.every((value, i) => value === b[i]);

/**
 * Turn components back into fragments: a separator between each pair, except
 * around the `/`, which needs none.
 * @param {string[]} components components in order
 * @returns {string[]} the fragments to join
 */
const _spaced = (components) => {
	/** @type {string[]} */
	const parts = [];
	for (const component of components) {
		if (
			parts.length !== 0 &&
			component !== "/" &&
			parts[parts.length - 1] !== "/"
		) {
			parts.push(_SEP);
		}
		parts.push(component);
	}
	return parts;
};

/**
 * Collapse a `{1,4}` box-notation value (see `BOX_SHORTHANDS`). `border-radius`
 * carries two boxes — `<horizontal> / <vertical>` — which collapse independently,
 * and a vertical box equal to the horizontal one is what the `/`-less form
 * already means.
 * @param {CssPath} path the accessor positioned on the declaration
 * @param {string} property the declaration's lowercased property name
 * @param {Node} node the declaration whose value's children are read
 * @param {PrintContext} writer the print context (children's printed text)
 * @returns {string[] | null} the fragments to join, or `null` to keep the value as it is
 */
const _collapseBoxShorthand = (path, property, node, writer) => {
	const components = _valueComponents(path, node, writer);
	const slash = components.indexOf("/");
	if (slash === -1) {
		const box = _collapseBox(components);
		return box === null || box.length === components.length
			? null
			: _spaced(box);
	}
	// Only `border-radius` takes a second box. On the others a `/` is invalid, so
	// the browser already drops the declaration — collapsing it would switch it on.
	if (!SLASH_BOX_SHORTHANDS.has(property)) return null;
	if (components.lastIndexOf("/") !== slash) return null;
	const horizontal = _collapseBox(components.slice(0, slash));
	const vertical = _collapseBox(components.slice(slash + 1));
	if (horizontal === null || vertical === null) return null;
	// Rebuilt even when neither box collapsed: the `/` is a delim token, so the
	// whitespace around it is insignificant either way.
	return _spaced(
		_sameComponents(horizontal, vertical)
			? horizontal
			: [...horizontal, "/", ...vertical]
	);
};

// A number with no unit and no percent, which `flex` reads as a factor.
const _BARE_NUMBER_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;

/**
 * Rewrite a `flex` value to its keyword spelling where one exists.
 * @param {CssPath} path the accessor positioned on the declaration
 * @param {Node} node the declaration whose value's children are read
 * @param {PrintContext} writer the print context (children's printed text)
 * @returns {string[] | null} the fragments to join, or `null` to keep the value as it is
 */
const _collapseFlexShorthand = (path, node, writer) => {
	const components = _valueComponents(path, node, writer);
	if (components.length !== 3) return null;
	const keyword = FLEX_KEYWORDS.get(components.join(" ").toLowerCase());
	if (keyword !== undefined) return [keyword];
	// `<'flex-shrink'>` follows the grow factor and defaults to 1, so a `1` there
	// says nothing — but only over a basis that cannot be read as a factor
	// itself: CSS Flexbox 1 §7.1.1 reads a unitless zero not preceded by two
	// factors as a factor, so `1 1 0` is not `1 0`.
	return components[1] === "1" && !_BARE_NUMBER_RE.test(components[2])
		? [components[0], components[2]]
		: null;
};

/**
 * Rewrite a `font-weight` keyword to the number it is defined as. Only the
 * longhand (and the `@font-face` descriptor, where the keywords mean the same):
 * inside the `font` shorthand a `normal` may be the style or the variant
 * instead, and the shorthand's own grammar decides which.
 * @param {CssPath} path the accessor positioned on the declaration
 * @param {Node} node the declaration whose value's children are read
 * @param {PrintContext} writer the print context (children's printed text)
 * @returns {string[] | null} the fragments to join, or `null` to keep the value as it is
 */
const _collapseFontWeight = (path, node, writer) => {
	const count = path.childCount(node);
	let only = "";
	for (let at = 0; at < count; at++) {
		const text = writer.get(path.childAt(node, at));
		if (text.length === 0) continue;
		// A second component is a value this rewrite is not defined for.
		if (only.length !== 0) return null;
		only = text;
	}
	if (only.length === 0) return null;
	const number = FONT_WEIGHT_NUMBERS.get(only.toLowerCase());
	return number === undefined ? null : [number];
};

// The slots of one `<single-transition>`, told apart by what each can spell.
const _TRANSITION_TIME_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:s|ms)$/i;
const _TRANSITION_EASING_FUNCTION_RE = /^(?:cubic-bezier|steps|linear)\(/i;

/**
 * Write one `transition` in the order its grammar lists the slots. `||` makes
 * them order-free, so the same declaration has many spellings and one of them
 * repeats across a stylesheet. The two `<time>`s stay in the order they were
 * written — the first is the duration and the second the delay.
 * @param {string[]} components the value's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const _orderTransitionSlots = (components) => {
	if (components.length < 2) return null;
	const times = [];
	const easings = [];
	const behaviors = [];
	const names = [];
	for (const one of components) {
		const lowered = toLowerCaseIfNeeded(one);
		if (_TRANSITION_TIME_RE.test(one)) {
			times.push(one);
		} else if (
			EASING_KEYWORDS.has(lowered) ||
			_TRANSITION_EASING_FUNCTION_RE.test(one)
		) {
			easings.push(one);
		} else if (TRANSITION_BEHAVIORS.has(lowered)) {
			behaviors.push(one);
		} else if (_PLAIN_IDENT_RE.test(one)) {
			names.push(one);
		} else {
			return null;
		}
	}
	// An easing keyword is a valid property name too, so a value with no name of
	// its own leaves which slot it fills to the engine — that one is left alone.
	if (names.length !== 1 || times.length > 2 || easings.length > 1) return null;
	if (behaviors.length > 1) return null;
	// `all` is the property a layer naming none transitions, so writing it is
	// spare — as long as something else is left to keep the layer from emptying.
	const named =
		toLowerCaseIfNeeded(names[0]) === "all" && components.length > 1
			? []
			: names;
	const ordered = [...named, ...times, ...easings, ...behaviors];
	if (ordered.length === 0) return null;
	return ordered.join(" ") === components.join(" ") ? null : ordered;
};

/**
 * Drop the trailing zero lengths a shadow's notation already implies. A shadow
 * states its offsets as one run of lengths, and the ones past the count the
 * grammar makes mandatory default to zero — so a trailing `0` says nothing.
 * @param {string} property the declaration's lowercased property name
 * @param {string[]} components the value's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const _dropShadowZeroLengths = (property, components) => {
	const minimum = SHADOW_PROPERTIES.get(property);
	if (minimum === undefined) return null;
	// A quoted string could carry the comma the layer split reads.
	for (const component of components) {
		if (component.includes('"') || component.includes("'")) return null;
	}
	const layers = _valueLayers(components);
	/** @type {string[]} */
	const out = [];
	let changed = false;
	for (let i = 0; i < layers.length; i++) {
		const layer = layers[i];
		if (layer.length === 0) return null;
		let end = layer.length;
		while (end > 0 && !_NUMERIC_RE.test(layer[end - 1])) end--;
		let start = end;
		while (start > 0 && _NUMERIC_RE.test(layer[start - 1])) start--;
		let last = end;
		// The components are as authored — the zero-unit drop prints later — so a
		// trailing zero is `0px` as often as `0`.
		while (last - start > minimum && _isZeroLength(layer[last - 1])) {
			last--;
			changed = true;
		}
		const kept = [...layer.slice(0, last), ...layer.slice(end)];
		const final = layers.length - 1;
		for (let j = 0; j < kept.length; j++) {
			out.push(j === kept.length - 1 && i !== final ? `${kept[j]},` : kept[j]);
		}
	}
	return changed ? out : null;
};

/**
 * Shorten every `<single-transition>` in a `transition`. Each layer is its own
 * set of slots, so both the initial-keyword drop and the slot order run per
 * layer rather than over the whole flat list.
 * @param {string} property the declaration's lowercased property name
 * @param {string[]} components the value's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const _collapseTransitionLayers = (property, components) => {
	// A quoted string could carry a comma the layer split would part.
	for (const component of components) {
		if (component.includes('"') || component.includes("'")) return null;
	}
	const layers = _valueLayers(components);
	/** @type {string[]} */
	const out = [];
	let changed = false;
	for (let i = 0; i < layers.length; i++) {
		let layer = layers[i];
		if (layer.length === 0) return null;
		const dropped = _dropInitialKeywords(property, layer);
		if (dropped !== null) {
			layer = dropped;
			changed = true;
		}
		const timed = _dropZeroDuration(layer);
		if (timed !== null) {
			layer = timed;
			changed = true;
		}
		const ordered = _orderTransitionSlots(layer);
		if (ordered !== null) {
			layer = ordered;
			changed = true;
		}
		const last = layers.length - 1;
		for (let j = 0; j < layer.length; j++) {
			out.push(
				j === layer.length - 1 && i !== last ? `${layer[j]},` : layer[j]
			);
		}
	}
	return changed ? out : null;
};

// A `font` component that is the size slot also carries a number.
const _CARRIES_DIGIT_RE = /\d/;

/**
 * Write the `font` shorthand's weight as the number naming it. The slots before
 * `<font-size>` are the style / variant / weight / width ones, and the family
 * only ever follows the size — so a `bold` with a size after it is the weight,
 * while `font: 12px bold` names a family and keeps the word.
 * @param {string[]} components the value's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const _numberFontShorthandWeight = (components) => {
	const size = components.findIndex(
		(one) =>
			_CARRIES_DIGIT_RE.test(one) ||
			FONT_SIZE_KEYWORDS.has(toLowerCaseIfNeeded(one))
	);
	if (size <= 0) return null;
	let changed = false;
	const out = components.map((one, index) => {
		if (index < size && equalsLowerCase(one, "bold")) {
			changed = true;
			return "700";
		}
		return one;
	});
	return changed ? out : null;
};

// A component that is exactly zero, whatever unit the zero-unit drop left it in.
const _ZERO_COMPONENT_RE = /^[+-]?0(?:\.0*)?$/;

// Zero written bare or as a percentage — a percentage of any size is nothing.
const _ZERO_OR_PERCENTAGE_RE = /^[+-]?0(?:\.0*)?%?$/;

const _ONE_COMPONENT_RE = /^\+?1(?:\.0*)?$/;

/**
 * @param {string} value a printed component
 * @returns {boolean} whether it is the number one
 */
const _isOne = (value) => _ONE_COMPONENT_RE.test(value);

// A value that is one percentage and nothing else.
const _LONE_PERCENTAGE_RE = /^([+-]?)(\d*)(?:\.(\d*))?%$/;

/**
 * Write an `<alpha-value>` percentage as the number naming the same quantity:
 * the decimal point moved two places, which is exact where dividing is not.
 * @param {string} property the lowercased property name
 * @param {string} value the printed value
 * @returns {string} the value, or the shorter number
 */
const _numberAlphaValue = (property, value) => {
	if (!_transforms.shortenNumbers) return value;
	if (!ALPHA_VALUE_PROPERTIES.has(property)) return value;
	const parts = _LONE_PERCENTAGE_RE.exec(value);
	if (parts === null) return value;
	const digits = `00${parts[2]}`;
	const shifted = _normalizeNumber(
		`${parts[1]}${digits.slice(0, -2)}.${digits.slice(-2)}${parts[3] || ""}`
	);
	return shifted.length < value.length ? shifted : value;
};

// A ratio whose denominator is the `1` an omitted one means, taken as a whole
// component so the `1` of `2/10` is no match.
const _RATIO_OVER_ONE_RE = /(^|\s)((?:\d+\.?\d*|\.\d+))\s*\/\s*1(?=$|\s)/g;

/**
 * Drop a `<ratio>`'s denominator where it is the 1 an omitted one means.
 * @param {string} property the lowercased property name
 * @param {string} value the printed value
 * @returns {string} the value, its `/1` dropped
 */
const _dropRatioDenominator = (property, value) => {
	if (!_transforms.shortenNumbers) return value;
	// A substitution could expand to a number of its own, turning the `1` into
	// the denominator of a ratio this does not see.
	if (!RATIO_PROPERTIES.has(property) || _hasSubstitution(value)) {
		return value;
	}
	return value.replace(_RATIO_OVER_ONE_RE, "$1$2");
};

/**
 * Drop a layer's second value where the one-value form already means it.
 * @param {string} property the lowercased property name
 * @param {string} value the printed value
 * @returns {string} the value, shortened where it says nothing
 */
const _dropDefaultSecondValue = (property, value) => {
	if (!_transforms.shortenValues) return value;
	if (!AUTO_SECOND_VALUE_PROPERTIES.has(property)) return value;
	// With `--x:1px 2px` the `auto` is a third value, so dropping it would turn a
	// declaration the engine discards into one it keeps.
	if (_hasSubstitution(value)) return value;
	let changed = false;
	const layers = _splitTopLevelArguments(value).map((layer) => {
		const parts = _splitTopLevelSpaces(layer.trim());
		if (parts.length !== 2 || !equalsLowerCase(parts[1], "auto")) return layer;
		// Each of these stands alone, so the second value makes a declaration the
		// engine drops — one a later declaration was written to beat.
		const first = toLowerCaseIfNeeded(parts[0]);
		if (
			first === "cover" ||
			first === "contain" ||
			CSS_WIDE_KEYWORDS.has(first)
		) {
			return layer;
		}
		changed = true;
		return parts[0];
	});
	return changed ? layers.join(",") : value;
};

/**
 * Reduce a transform function until it stops getting shorter: one reduction
 * uncovers the next, `translate3d(x,0,0)` leaving the `translate(x,0)` that is
 * `translate(x)`.
 * @param {string} fn the lowercased function name
 * @param {string} inner the already-joined argument text
 * @returns {string | null} the shortest call, or null to keep the function
 */
const _reduceTransformFunctionDeep = (fn, inner) => {
	let out = _reduceTransformFunction(fn, inner);
	if (out === null) return null;
	// Fed back as the name and arguments it was built from, rather than printed
	// and matched apart again — the reduction already hands back both.
	for (;;) {
		const next = _reduceTransformFunction(out[0], out[1]);
		if (next === null) return `${out[0]}(${out[1]})`;
		out = next;
	}
};

// A component that is zero however it is spelled.
/** @type {(arg: string) => boolean} */
const _isZeroComponent = (arg) => _ZERO_COMPONENT_RE.test(arg);

// A translation's components are `<length-percentage>`, where a zero of either
// kind is the same no-op — a percentage resolves against the element's own size.
/** @type {(arg: string) => boolean} */
const _isZeroOffset = (arg) =>
	_ZERO_OR_PERCENTAGE_RE.test(arg) || _ZERO_LENGTH_RE.test(arg);

// A translation's z is a `<length>` alone, so a percentage is invalid there and
// dropping it would revive a declaration the engine throws away.
/** @type {(arg: string) => boolean} */
const _isZeroLength = (arg) =>
	_ZERO_COMPONENT_RE.test(arg) || _ZERO_LENGTH_RE.test(arg);

// The components a 3D matrix holds at zero to be the 2D one it names.
const _MATRIX3D_IDENTITY_ZEROS = [2, 3, 6, 7, 8, 9, 11, 14];

// Each transform function that names a shorter one, and how. A name absent here
// reduces to nothing, which is what lets the caller ask before parting arguments.
/** @type {Map<string, (args: string[]) => [string, string] | null>} */
const _TRANSFORM_REDUCERS = new Map([
	[
		"translate",
		(args) => {
			if (args.length !== 2) return null;
			if (_isZeroOffset(args[1])) return ["translate", args[0]];
			if (_isZeroOffset(args[0])) return ["translateY", args[1]];
			return null;
		}
	],
	[
		"translate3d",
		(args) => {
			if (args.length !== 3) return null;
			if (_isZeroOffset(args[0]) && _isZeroOffset(args[1])) {
				return ["translateZ", args[2]];
			}
			if (_isZeroLength(args[2])) return ["translate", `${args[0]},${args[1]}`];
			return null;
		}
	],
	[
		// `scale(x, x)` is `scale(x)` — the second factor defaults to the first.
		"scale",
		(args) => {
			if (args.length !== 2) return null;
			if (args[0] === args[1]) return ["scale", args[0]];
			// A factor of 1 scales nothing along its axis, leaving the other axis's
			// own function.
			if (_isOne(args[1])) return ["scaleX", args[0]];
			if (_isOne(args[0])) return ["scaleY", args[1]];
			return null;
		}
	],
	[
		"scale3d",
		(args) => {
			if (args.length !== 3) return null;
			// A z factor of 1 scales nothing along it, leaving the 2D scale.
			if (_isOne(args[2])) return ["scale", `${args[0]},${args[1]}`];
			// ...and a 2D pair of 1 leaves the z scale alone.
			if (_isOne(args[0]) && _isOne(args[1])) return ["scaleZ", args[2]];
			return null;
		}
	],
	[
		// CSS Transforms 2 §12: a 3D matrix whose third row and column are the
		// identity's is the 2D matrix of the six values it leaves.
		"matrix3d",
		(args) => {
			if (args.length !== 16) return null;
			for (const i of _MATRIX3D_IDENTITY_ZEROS) {
				if (!_isZeroComponent(args[i])) return null;
			}
			if (!_isOne(args[10]) || !_isOne(args[15])) return null;
			return [
				"matrix",
				`${args[0]},${args[1]},${args[4]},${args[5]},${args[12]},${args[13]}`
			];
		}
	],
	[
		// CSS Transforms 2 §13.1: `rotateZ(a)` names the rotation `rotate(a)` does.
		"rotatez",
		(args) => (args.length === 1 ? ["rotate", args[0]] : null)
	],
	[
		"rotate3d",
		(args) => {
			if (args.length !== 4) return null;
			// The engine normalizes the axis, so a scaled component still names it
			// but a negative one turns the rotation the other way.
			const axis =
				_isZeroComponent(args[1]) &&
				_isZeroComponent(args[2]) &&
				_isOne(args[0])
					? "rotateX"
					: _isZeroComponent(args[0]) &&
						  _isZeroComponent(args[2]) &&
						  _isOne(args[1])
						? "rotateY"
						: _isZeroComponent(args[0]) &&
							  _isZeroComponent(args[1]) &&
							  _isOne(args[2])
							? "rotate"
							: null;
			return axis === null ? null : [axis, args[3]];
		}
	]
]);

/**
 * Reduce a transform function to the shorter one naming the same matrix: a
 * translation whose other axes are zero is that axis's own function, and a
 * uniform scale needs one factor. CSS Transforms 1 §7 defines each as the
 * matrix it multiplies, so the two spellings compute alike.
 * @param {string} fn the lowercased function name
 * @param {string} inner the already-joined argument text
 * @returns {[string, string] | null} the shorter call as its name and
 * arguments, or null to keep the function
 */
const _reduceTransformFunction = (fn, inner) => {
	if (!_transforms.reduceFunctions) return null;
	const reduce = _TRANSFORM_REDUCERS.get(fn);
	// Asked before the arguments are parted: a function naming no shorter one is
	// most of what a stylesheet calls, and it keeps its own spelling.
	if (reduce === undefined) return null;
	const args = inner.split(",");
	for (let i = 0; i < args.length; i++) {
		const one = args[i].trim();
		if (one.length === 0) return null;
		args[i] = one;
	}
	return reduce(args);
};

/**
 * Drop the direction a linear gradient flows in anyway. CSS Images 3 §3.1: with
 * no `<side-or-corner>` and no angle the gradient runs top to bottom, which is
 * what `to bottom` and `180deg` each name.
 * @param {string} fn the lowercased function name
 * @param {string} inner the already-joined argument text
 * @returns {string | null} the arguments without it, or null to keep them
 */
const _dropDefaultGradientDirection = (fn, inner) => {
	if (!LINEAR_GRADIENTS.has(fn) || !_transforms.reduceFunctions) return null;
	const comma = inner.indexOf(",");
	if (comma === -1) return null;
	const first = inner.slice(0, comma).trim().toLowerCase().replace(/\s+/g, " ");
	if (!DEFAULT_GRADIENT_DIRECTIONS.has(first)) return null;
	return inner.slice(comma + 1).trim();
};

/**
 * Split on the whitespace at the top of one value, a nested call's own spaces
 * staying inside it.
 * @param {string} text one comma-separated piece of a call's body
 * @returns {string[]} its components
 */
const _splitTopLevelSpaces = (text) => {
	/** @type {string[]} */
	const parts = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		if (code === CC_LEFT_PARENTHESIS) {
			depth++;
		} else if (code === CC_RIGHT_PARENTHESIS) {
			depth--;
		} else if (depth === 0 && _isWhiteSpace(code)) {
			if (i > start) parts.push(text.slice(start, i));
			start = i + 1;
		}
	}
	if (text.length > start) parts.push(text.slice(start));
	return parts;
};

/**
 * Fold what a gradient's own grammar already says about its color stops: the
 * last stop's position where the fix-up puts it there anyway (CSS Images 3
 * §3.4.3), and — where the target reads the two-position syntax — two adjacent
 * stops of one color as the one stop naming both (CSS Images 4 §3.4).
 * @param {string} fn the lowercased function name
 * @param {string} inner the already-joined argument text
 * @param {boolean} double whether a two-position stop may be emitted
 * @returns {string | null} the rewritten arguments, or null to keep them
 */
const _foldGradientStops = (fn, inner, double) => {
	if (!_transforms.reduceFunctions) return null;
	const implied = GRADIENT_LAST_POSITIONS.get(fn);
	if (implied === undefined) return null;
	const args = _splitTopLevelArguments(inner);
	// A one-argument gradient states no stop list to read.
	if (args.length < 2) return null;
	let changed = false;
	// The last argument is always a color stop: the grammar puts one after every
	// color hint. A stop already carrying two positions is not that one value.
	const last = _splitTopLevelSpaces(args[args.length - 1]);
	if (last.length === 2 && implied.has(last[1].toLowerCase())) {
		args[args.length - 1] = last[0];
		changed = true;
	}
	if (double) {
		for (let i = args.length - 1; i > 0; i--) {
			const one = _splitTopLevelSpaces(args[i]);
			const before = _splitTopLevelSpaces(args[i - 1]);
			// Two positions on one stop are the two stops they would be written as,
			// so only a pair naming one color folds — and a color hint, which is a
			// position alone, is no stop to fold with.
			if (
				one.length !== 2 ||
				before.length !== 2 ||
				!equalsLowerCase(before[0], one[0].toLowerCase())
			) {
				continue;
			}
			args[i - 1] = `${before[0]} ${before[1]} ${one[1]}`;
			args.splice(i, 1);
			changed = true;
		}
	}
	return changed ? args.join(",") : null;
};

/**
 * Collapse a value the property's own grammar already implies: two equal
 * `<repeat-style>` keywords are the one-value form.
 * @param {string} property the declaration's lowercased property name
 * @param {string[]} components the value's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const _collapseRepeatedPair = (property, components) => {
	if (
		components.length === 2 &&
		REPEAT_STYLE_PROPERTIES.has(property) &&
		equalsLowerCase(components[0], components[1].toLowerCase()) &&
		// Both halves have to be that axis: the production also sits in shorthands
		// where a repeated value is some other slot, and `background: red red` is
		// a declaration the engine drops rather than one to make valid.
		REPEAT_STYLE_KEYWORDS.has(toLowerCaseIfNeeded(components[0]))
	) {
		return [components[0]];
	}
	return null;
};

/**
 * How a component would be looked up in a slot's spellings: a call is its name
 * with empty parentheses, anything else is itself.
 * @param {string} component one lowercased top-level component
 * @returns {string} the spelling to look up
 */
const _componentSpelling = (component) => {
	const open = component.indexOf("(");
	return open === -1 ? component : `${component.slice(0, open)}()`;
};

// A `<time>` of zero, whichever unit it is spelled in.
const ZERO_TIME_RE = /^[+-]?(?:0+\.?0*|\.0+)m?s$/i;

/**
 * Drop a duration of zero, which is the duration a transition runs with anyway.
 * Only where the layer states one `<time>`: the first fills the duration slot
 * and the second the delay, so dropping the duration out of a pair hands the
 * delay's value to the duration. Called for `transition` alone, which is the
 * one shorthand whose layers are read here.
 * @param {string[]} components one layer's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const _dropZeroDuration = (components) => {
	if (components.length < 2) return null;
	let at = -1;
	for (let i = 0; i < components.length; i++) {
		if (!_TRANSITION_TIME_RE.test(components[i])) continue;
		if (at !== -1) return null;
		at = i;
	}
	if (at === -1 || !ZERO_TIME_RE.test(components[at])) return null;
	const kept = [...components];
	kept.splice(at, 1);
	return kept;
};

/**
 * Drop the shorthand slots holding what they already default to. A sibling out
 * of the same slot's spellings — one of its keywords, or a call to one of its
 * functions — means the value fills that slot twice, which is a declaration the
 * engine drops; dropping one of them would revive it.
 * @param {string} property the declaration's lowercased property name
 * @param {string[]} components the value's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const _dropInitialKeywords = (property, components) => {
	const table = SHORTHAND_INITIAL_KEYWORDS.get(property);
	if (table === undefined || components.length < 2) return null;
	// A comma parts two layers and a `/` reaches a slot through another's value;
	// either way the slots are no longer this one flat list.
	for (const component of components) {
		if (component.includes(",") || component === "/") return null;
	}
	const lowered = components.map((one) =>
		_componentSpelling(toLowerCaseIfNeeded(one))
	);
	const kept = [];
	for (let i = 0; i < components.length; i++) {
		const siblings = table.get(lowered[i]);
		if (
			siblings !== undefined &&
			!lowered.some((other, j) => j !== i && siblings.has(other))
		) {
			continue;
		}
		kept.push(components[i]);
	}
	if (kept.length === components.length) return null;
	if (kept.length !== 0) return kept;
	// Every slot held its own initial, so any one of them says all of them.
	let shortest = components[0];
	for (const component of components) {
		if (component.length < shortest.length) shortest = component;
	}
	return [shortest];
};

/**
 * Rewrite a `<position>` written as edge keywords into the percentages they
 * resolve to. Keywords only: an offset beside one is the 3/4-value syntax,
 * where the keyword names an edge to measure from rather than a place.
 * @param {string} property the declaration's lowercased property name
 * @param {string[]} components the value's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const _collapsePositionKeywords = (property, components) => {
	if (
		!POSITION_PROPERTIES.has(property) ||
		components.length === 0 ||
		components.length > 2
	) {
		return null;
	}
	/** @type {string | undefined} */
	let x;
	/** @type {string | undefined} */
	let y;
	for (const component of components) {
		const keyword = toLowerCaseIfNeeded(component);
		const onX = POSITION_X_KEYWORDS.get(keyword);
		const onY = POSITION_Y_KEYWORDS.get(keyword);
		if (onX === undefined && onY === undefined) return null;
		// `center` is on both axes and is what a free axis already resolves to.
		if (onX !== undefined && onY !== undefined) continue;
		if (onX === undefined) {
			if (y !== undefined) return null;
			y = onY;
		} else {
			if (x !== undefined) return null;
			x = onX;
		}
	}
	const across = x === undefined ? "50%" : x;
	const down = y === undefined ? "50%" : y;
	// A trailing `50%` is what the omitted second value means.
	const shorter = down === "50%" ? [across] : [across, down];
	return shorter.join(" ").length < components.join(" ").length
		? shorter
		: null;
};

/**
 * Drop a `<position>`'s second value where it names the centre an omitted one
 * already means. A pair of keywords takes the percentage rewrite above; this is
 * for the pairs an offset keeps out of it.
 * @param {string} property the declaration's lowercased property name
 * @param {string[]} components the value's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const _dropCenterPositionTail = (property, components) => {
	if (!POSITION_PROPERTIES.has(property) || components.length !== 2) {
		return null;
	}
	const down = toLowerCaseIfNeeded(components[1]);
	if (down !== "center" && down !== "50%") return null;
	// A `top` / `bottom` first value is no x-position, so that pair is the
	// order-free keyword syntax and dropping half would leave an invalid value.
	const across = toLowerCaseIfNeeded(components[0]);
	return POSITION_X_KEYWORDS.has(across) || _NUMERIC_RE.test(across)
		? [components[0]]
		: null;
};

// One `grid-template-areas` row, whose quotes bound it — the whitespace between
// its cell names parts them, and a run of it says no more than one space.
const _AREA_ROW_RE = /^(["'])([\s\S]*)\1$/;

/**
 * Squeeze a `grid-template-areas` value: each row keeps the cell names it
 * lists, and the whitespace between two rows carries nothing at all — the
 * quotes already part them.
 * @param {CssPath} path the accessor positioned on the declaration
 * @param {Node} node the declaration whose value's children are read
 * @param {PrintContext} writer the print context (children's printed text)
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const _collapseGridTemplateAreas = (path, node, writer) => {
	const components = _valueComponents(path, node, writer);
	const rows = [];
	for (const component of components) {
		const row = _AREA_ROW_RE.exec(component);
		if (row === null) return null;
		rows.push(`${row[1]}${row[2].trim().replace(/\s+/g, " ")}${row[1]}`);
	}
	return rows.length === 0 ? null : rows;
};

/**
 * The safe transforms that rewrite one fragment of a declaration value on its
 * own, whatever stands beside it.
 * @param {string} fragment the fragment's printed text
 * @param {string} property the declaration's lowercased property name
 * @param {boolean} minify whether printing minified
 * @returns {string} the rewritten fragment
 */
const _valueFragment = (fragment, property, minify) => {
	let out = fragment;
	if (minify && !_inSupportsPrelude && _transforms.reduceFunctions) {
		out = _unwrapCalc(out, property);
	}
	if (minify && !ZERO_UNIT_KEEPING_PROPERTIES.has(property)) {
		out = _dropZeroLengthUnit(out);
		out = _dropZeroLengthUnitInCall(out);
	}
	return out;
};

// Which property a vendor spelling is a spelling of, so the value of
// `-webkit-transition` minifies the way `transition`'s does. Built from the
// table the prefixing pass already carries rather than by cutting a `-webkit-`
// off, since a name wearing a prefix is not always the same property as the
// one without it. Made on first use: a sheet writing no prefixed property never
// pays for it.
/** @type {Map<string, string> | null} */
let _standardSpellings = null;

/**
 * The standard property a name spells, or the name itself.
 * @param {string} property a lowercased property name
 * @returns {string} the property whose value rules apply
 */
const _standardSpelling = (property) => {
	if (property.charCodeAt(0) !== CC_HYPHEN_MINUS) return property;
	if (_standardSpellings === null) {
		_standardSpellings = new Map();
		for (const [standard, spellings] of PREFIXED_PROPERTIES) {
			for (const [spelling] of spellings) {
				_standardSpellings.set(spelling, standard);
			}
		}
	}
	const standard = _standardSpellings.get(property);
	return standard === undefined ? property : standard;
};

/**
 * Shorten a shorthand declaration's value to an equivalent spelling. A prefixed
 * spelling is a different property, and neither table lists one.
 * @param {CssPath} path the accessor positioned on the declaration
 * @param {string} property the declaration's lowercased property name
 * @param {Node} node the declaration whose value's children are read
 * @param {PrintContext} writer the print context (children's printed text)
 * @returns {string[] | null} the fragments to join, or `null` to keep the value as it is
 */
const _collapseShorthand = (path, property, node, writer) => {
	if (!_transforms.shortenValues) return null;
	// A value holding a substitution is the token stream it was written as, so
	// nothing in it collapses. Read off the declaration rather than the walk's
	// flag: this runs as the declaration is printed, once its children are done.
	if (_hasSubstitution(path.source())) return null;
	if (BOX_SHORTHANDS.has(property)) {
		return _collapseBoxShorthand(path, property, node, writer);
	}
	if (property === "font-weight") {
		return _collapseFontWeight(path, node, writer);
	}
	if (property === "flex") {
		return _collapseFlexShorthand(path, node, writer);
	}
	if (property === "grid-template-areas") {
		return _collapseGridTemplateAreas(path, node, writer);
	}
	const written = _valueComponents(path, node, writer);
	const shadow = _dropShadowZeroLengths(property, written);
	if (shadow !== null) return shadow;
	if (property === "transition") {
		return _collapseTransitionLayers(property, written);
	}
	// A slot holding its own initial goes first, so what follows reads the
	// components that are left rather than the ones the author wrote.
	let dropped = _dropInitialKeywords(property, written);
	let components = dropped === null ? written : dropped;
	// A component spelling the property's own initial says nothing beside another:
	// omitting the group it belongs to leaves exactly that keyword.
	const omittable = OMITTABLE_INITIAL_KEYWORDS.get(property);
	if (omittable !== undefined && components.length > 1) {
		const [keyword, slot] = omittable;
		// Only when the slot the keyword fills is named once. A value naming it
		// twice is invalid, and dropping the initial would leave the valid value
		// the author did not write.
		const filled = components.filter((one) =>
			slot.includes(toLowerCaseIfNeeded(one))
		);
		const kept =
			filled.length === 1
				? components.filter((one) => !equalsLowerCase(one, keyword))
				: components;
		if (kept.length !== 0 && kept.length !== components.length) {
			components = kept;
			dropped = kept;
		}
	}
	if (property === "display" && components.length === 2) {
		const pair = `${toLowerCaseIfNeeded(components[0])} ${toLowerCaseIfNeeded(
			components[1]
		)}`;
		// `<display-outside> || <display-inside>` is order-free, so both readings.
		const short =
			DISPLAY_SHORT_FORMS.get(pair) ||
			DISPLAY_SHORT_FORMS.get(pair.split(" ").reverse().join(" "));
		if (short !== undefined) return [short];
	}
	if (property === "font") {
		return _numberFontShorthandWeight(components) || dropped;
	}
	// `initial` computes to the property's initial value, so where that value is
	// a shorter keyword the two are the same declaration.
	if (components.length === 1 && equalsLowerCase(components[0], "initial")) {
		const keyword = INITIAL_VALUE_KEYWORDS.get(property);
		if (keyword !== undefined) return [keyword];
	}
	// Grammar matching skips whitespace and a `)` fuses with nothing, so between
	// two calls it separates the same tokens either way — whatever the property,
	// which is what reaches the prefixed spellings no table names.
	if (
		components.length > 1 &&
		components.every((one) => one.endsWith(")") && one.includes("("))
	) {
		return components;
	}
	// A `font-stretch` keyword is the percentage it names, in fewer bytes.
	if (property === "font-stretch" && components.length === 1) {
		const percentage = FONT_STRETCH_PERCENTAGES.get(
			toLowerCaseIfNeeded(components[0])
		);
		if (percentage !== undefined && percentage.length < components[0].length) {
			return [percentage];
		}
	}
	const position = _collapsePositionKeywords(property, components);
	if (position !== null) return position;
	const centered = _dropCenterPositionTail(property, components);
	if (centered !== null) return centered;
	return _collapseRepeatedPair(property, components) || dropped;
};

// The length units, shared by the zero-unit drop and the value classifier. No
// dataset states the list, so it is the spec's, spelled out.
// cspell:ignore rlh cqmin cqmax vmin vmax dvmin dvmax lvmin lvmax svmin svmax whib
const _LENGTH_UNITS =
	"px|em|rem|ex|ch|cap|ic|lh|rlh|v[wh]|vmin|vmax|v[ib]|[sld]v[wh]|[sld]vmin|[sld]vmax|[sld]v[ib]|cq[whib]|cqmin|cqmax|cm|mm|in|pt|pc|q";

const _NUMERIC_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?(%|[a-z]*)$/i;
// Only the four lengths `_minifyHash` accepts: a 5- or 7-digit hash is no
// color, and merging one would take the whole shorthand down with it.
const _HEX_COLOR_RE = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
const _IDENT_RE = /^-?[a-z_][-\w]*$/i;
const _URL_RE = /^(?:url|src)\(/i;
const _LENGTH_UNIT_RE = new RegExp(`^(?:${_LENGTH_UNITS})$`, "i");

/**
 * The value classes a printed component could be read as, for deciding which
 * slot of an order-free shorthand would claim it. Only the classes those slots
 * name, which the generator asserts is this list; anything else — a function
 * other than `url()`, an escape, a substitution — is `null`, which declines the
 * merge rather than guessing a slot.
 * @param {string} value one printed component
 * @param {string} lower the same, lowercased
 * @returns {Set<string> | null} the classes, or `null` when unclassifiable
 */
const _valueClasses = (value, lower) => {
	const numeric = _NUMERIC_RE.exec(value);
	if (numeric !== null) {
		const unit = toLowerCaseIfNeeded(numeric[1]);
		if (unit === "%") return new Set(["percentage"]);
		// CSS Values 4 §5: a zero length may drop its unit, so a bare `0` is a
		// `<length>`; any other bare number is a `<number>`, which no slot takes.
		if (unit === "") return Number(value) === 0 ? new Set(["length"]) : null;
		return _LENGTH_UNIT_RE.test(unit) ? new Set(["length"]) : null;
	}
	if (_HEX_COLOR_RE.test(value)) return new Set(["color"]);
	if (value.charCodeAt(0) === 0x22 || value.charCodeAt(0) === 0x27) {
		return new Set(["string"]);
	}
	if (_URL_RE.test(value)) return new Set(["url", "image"]);
	if (!_IDENT_RE.test(value)) return null;
	if (CSS_WIDE_KEYWORDS.has(lower)) return null;
	const classes = new Set(["custom-ident", "ident"]);
	if (COLOR_KEYWORDS.has(lower)) classes.add("color");
	return classes;
};

/**
 * The shorthand value a family merge may emit: every longhand's value, in the
 * grammar's order. Each has to parse back into the longhand it was authored on,
 * so a value a second slot would also take declines the merge — `outline`'s
 * `auto` is both an `outline-style` and an `outline-color`.
 * @param {string[]} longhands the family's longhands, in grammar order
 * @param {string[]} values one component per longhand, in the same order
 * @returns {string | null} the shorthand value, or `null` when it is ambiguous
 */
const _familyValue = (longhands, values) => {
	for (let i = 0; i < values.length; i++) {
		const lower = toLowerCaseIfNeeded(values[i]);
		const classes = _valueClasses(values[i], lower);
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
	return values.join(" ");
};

/**
 * Merge a box family's four longhands into their shorthand, which sets exactly
 * those four (see `BOX_LONGHANDS`) — so the rule computes the same either way.
 *
 * Every guard here is about *not* reviving something the browser drops, or
 * moving a declaration past one that could overwrite it: the four must be
 * adjacent, each declared once, each a single component, and all agree on
 * `!important`. `_collapseBox` refuses a `var()` or a CSS-wide keyword, both of
 * which mean something else in a shorthand.
 * @param {CssPath} path the accessor positioned on the rule
 * @param {Declaration[]} decls the rule's declarations, in source order
 * @param {PrintContext} writer the print context (children's printed text)
 * @param {Map<string, string[]>} table the shorthand-to-longhands map to merge by
 * @param {number} mode how the table's values are written: `MERGE_BOX` for the
 * `{1,4}` notation, `MERGE_FAMILY` for order-free slots, `MERGE_SLASH` for slots
 * a `/` stands between
 * @param {Map<string, number>} at which declaration wrote each property, by name
 * @param {Set<string>} repeated the properties written more than once
 * @param {Uint32Array | null} rulesBefore how many child rules stand before each
 * declaration, or null where the block holds none
 * @returns {Map<Node, string> | null} replacement text per declaration, or null
 */
const _mergeBoxLonghands = (
	path,
	decls,
	writer,
	table,
	mode,
	at,
	repeated,
	rulesBefore
) => {
	if (!_transforms.mergeLonghands) return null;
	/** @type {Map<Node, string> | null} */
	let out = null;
	// What an earlier shorthand of this table already wrote or blanked. Two of
	// them can share a longhand (`corner-top-shape` and `corner-left-shape` both
	// set `corner-top-left-shape`), and the second landing on the first's blanked
	// tail would leave that tail uncovered — dropping its declaration.
	/** @type {Set<Node>} */
	const claimed = new Set();
	for (const [shorthand, longhands] of table) {
		// A plain loop: this runs for every table entry of every rule, where one
		// closure per entry is the allocation that dominates.
		let missing = false;
		for (let i = 0; i < longhands.length && !missing; i++) {
			missing = !at.has(longhands[i]) || repeated.has(longhands[i]);
		}
		if (missing) continue;
		// The shorthands newer than the longhands they merge.
		if (shorthand === "inset" && !_insetShorthandAllowed) continue;
		if (!_placeShorthandAllowed && PLACE_SHORTHANDS.has(shorthand)) continue;
		const indexes = longhands.map((l) => /** @type {number} */ (at.get(l)));
		if (indexes.some((i) => claimed.has(decls[i]))) continue;
		const ordered = [...indexes].sort((a, b) => a - b);
		// A child rule between the first and the last is one the merge steps over.
		if (
			rulesBefore !== null &&
			rulesBefore[ordered[ordered.length - 1]] !== rulesBefore[ordered[0]]
		) {
			continue;
		}
		// The merge moves whatever stands between the four below the shorthand, so
		// nothing between them may write one of those properties. Blocked by name
		// prefix rather than by a writers table: `mdn-data` maps `margin-top` back
		// to `margin` alone, missing `border`, `border-top` and every logical
		// property, so only the family's own prefix is safe to trust.
		// A pair family states no prefix of its own: its longhands are the two
		// names, so anything sharing either one's first segment is what could be
		// stepped over (`align-items` is not under a `place` prefix).
		const head = (/** @type {string} */ name) =>
			/** @type {RegExpExecArray} */ (/^[^-]+/.exec(name))[0];
		const prefix = BOX_FAMILY_PREFIX.get(shorthand) || head(shorthand);
		const families = new Set([prefix, ...longhands.map(head)]);
		let blocked = false;
		for (
			let i = ordered[0] + 1;
			i < ordered[ordered.length - 1] && !blocked;
			i++
		) {
			if (indexes.includes(i)) continue;
			// A vendor prefix hides the family a legacy alias writes, so it comes
			// off first: `-webkit-margin-start` sets `margin-left` in Chromium.
			const between = toLowerCaseIfNeeded(path.name(decls[i])).replace(
				/^-[a-z]+-/,
				""
			);
			blocked = between === "all" || between === shorthand;
			for (const family of families) {
				if (between === family || between.startsWith(`${family}-`)) {
					blocked = true;
				}
			}
		}
		if (blocked) continue;
		const important = path.important(decls[indexes[0]]);
		if (indexes.some((i) => path.important(decls[i]) !== important)) continue;
		const values = [];
		for (const i of indexes) {
			const components = _valueComponents(path, decls[i], writer);
			if (components.length !== 1) break;
			values.push(components[0]);
		}
		if (values.length !== longhands.length) continue;
		// A bare number is no length, so one written beside a length is a value the
		// property never read — the engine dropped that declaration and kept the
		// others. Merging them writes it into a shorthand the engine drops whole,
		// which loses the slots that were fine.
		if (_mixesBareNumberWithLength(values)) continue;
		/** @type {string | null} */
		let value;
		if (mode === MERGE_FAMILY) {
			value = _familyValue(longhands, values);
			if (value === null) continue;
		} else if (mode === MERGE_SLASH) {
			// The same two refusals a box makes: a `var()` may expand across the `/`
			// into another slot, and a CSS-wide keyword beside another value is a
			// shorthand the engine drops whole.
			let refused = false;
			for (const slot of values) {
				if (
					_hasSubstitution(slot) ||
					CSS_WIDE_KEYWORDS.has(toLowerCaseIfNeeded(slot))
				) {
					refused = true;
					break;
				}
			}
			if (refused) continue;
			// Every slot written: an omitted one means "the first slot where that is
			// a `<custom-ident>`, else `auto`", which is not "the same value".
			value = values.join("/");
		} else {
			// A pair collapses by the same rule as a box, and needs the same refusals:
			// a `var()` may expand to both values, and a CSS-wide keyword alongside
			// another value is a shorthand the engine drops whole.
			const box = _collapseBox(values);
			if (box === null) continue;
			// The two-value spelling is the newer one here, so it is written only
			// where the target reads it; the collapse to one value is as old as the
			// longhands and always is.
			if (
				box.length !== 1 &&
				ONE_VALUE_PAIR_SHORTHANDS.has(shorthand) &&
				!_overflowTwoValuesAllowed
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
			value = box.join(" ");
		}
		if (out === null) out = new Map();
		out.set(
			decls[ordered[0]],
			`${shorthand}:${value}${important ? "!important" : ""};`
		);
		for (let i = 1; i < ordered.length; i++) out.set(decls[ordered[i]], "");
		for (const i of ordered) claimed.add(decls[i]);
	}
	return out;
};

// How a table's slots are written into the shorthand.
const MERGE_BOX = 0;
const MERGE_FAMILY = 1;
const MERGE_SLASH = 2;

/** @type {[Map<string, string[]>, number][]} */
const MERGE_TABLES = [
	[BOX_LONGHANDS, MERGE_BOX],
	[PAIR_LONGHANDS, MERGE_BOX],
	[FAMILY_LONGHANDS, MERGE_FAMILY],
	[SLASH_LONGHANDS, MERGE_SLASH]
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
 * @property {number} listKind which shape answers that — a selector, a keyframe
 * selector or a nested selector
 * @property {RuleEntry[] | null} children a mergeable at-rule's block, else null
 * @property {string} head the block's text but for its last child, so a run of
 * joins appends what it adds rather than re-reading what it has
 */

// Each printed rule the merge can join -> its entry. Cleared per top-level node.
/** @type {Map<Node, RuleEntry>} */
const _ruleEntry = new Map();

// Whether a rule's prelude may join another's selector list. Answered only when
// a join asks — two adjacent rules printing the same block, which is rare — so
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
const _opaqueEntry = (text) => ({
	text,
	prelude: -1,
	atRule: false,
	plain: false,
	listable: LIST_NO,
	listKind: LIST_KIND_SELECTOR,
	children: null,
	head: ""
});

/**
 * Whether this rule's prelude may join another's selector list, running the
 * shape test the first time a join asks and remembering the answer.
 * @param {RuleEntry} entry a printed rule
 * @returns {boolean} true when its selectors may join a list
 */
const _entryListable = (entry) => {
	if (entry.listable === LIST_UNKNOWN) {
		entry.listable = _isJoinablePrelude(
			entry.text.slice(0, entry.prelude),
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
const _ruleEntryOf = (node, text) => {
	const entry = _ruleEntry.get(node);
	return entry !== undefined && entry.text === text
		? entry
		: _opaqueEntry(text);
};

// A selector every engine parses: compounds of a type, universal, class, id or
// attribute selector joined by a combinator, and nothing else. One selector an
// engine cannot parse invalidates the whole list it is joined into, so joining a
// selector the engine keeps to one it drops loses the first — a pseudo it does
// not know (`:local(.foo)`, `::-moz-placeholder`), or a shape the parser passed
// through without validating (`. class`, from `./**c**/ /**c**/class`).
// TODO widen this to the pseudos `mdn-data`'s `selectors.json` names, derived in
// the generator like every other table, once it also says which engine reads
// which prefix.
const _IDENT = String.raw`(?:[-\w\u00A0-\uFFFF]|\\[\s\S])+`;
const _STRING = String.raw`"(?:[^"\\]|\\[\s\S])*"|'(?:[^'\\]|\\[\s\S])*'`;
// The matchers Selectors 4 §6 defines, and only `i` after one: an engine that
// cannot read the `s` modifier drops the selector, and with it the list.
const _ATTRIBUTE = String.raw`\[(?:${_IDENT}\|)?${_IDENT}(?:[~|^$*]?=(?:${_IDENT}|${_STRING})(?: [iI])?)?\]`;
// A pseudo-class or pseudo-element with no selector inside it: argument-less, or
// the `An+B` of `:nth-*()`, whose grammar is closed. One holding a selector list
// (`:not()`, `:is()`, `:has()`) would have to have its argument checked too.
const _PSEUDO = String.raw`::?[-\w]+(?:\(\s*(?:[-+\dn ]+|[oO][dD][dD]|[eE][vV][eE][nN])\s*\))?`;
const _COMPOUND = `(?:\\*|${_IDENT}|[.#]${_IDENT}|${_ATTRIBUTE})(?:[.#]${_IDENT}|${_ATTRIBUTE}|${_PSEUDO})*`;
const _JOINABLE_SELECTOR_RE = new RegExp(
	`^${_COMPOUND}(?:(?:\\s*[>+~]\\s*|\\s+)${_COMPOUND})*$`
);

// The same, for a rule nested in another: `&` joins there because an engine that
// cannot read it cannot read the block holding it either, so both selectors are
// dropped together rather than one taking the other down.
const _NESTED_COMPOUND = `(?:&(?:${_COMPOUND})?|${_COMPOUND})`;
const _JOINABLE_NESTED_RE = new RegExp(
	`^${_NESTED_COMPOUND}(?:(?:\\s*[>+~]\\s*|\\s+)${_NESTED_COMPOUND})*$`
);

// A keyframe selector is a percentage or `to` — `from` is already printed `0%`.
// Its grammar is closed, so every one of them joins.
const _JOINABLE_KEYFRAME_RE = /^(?:\d+(?:\.\d+)?%|to)$/i;

// The full-progress keyframe selector, in every spelling `to` names.
const _KEYFRAME_FULL_RE = /^100(?:\.0+)?%$/;

/**
 * Whether a printed prelude is a list of selectors every engine parses, so
 * another may be joined onto it without risking the whole list.
 * @param {string} prelude the printed prelude
 * @param {boolean} keyframe whether the rule sits in a `@keyframes`
 * @param {boolean} nested whether the rule sits in another qualified rule
 * @returns {boolean} true when it may be joined
 */
const _isJoinablePrelude = (prelude, keyframe, nested) => {
	const shape = keyframe
		? _JOINABLE_KEYFRAME_RE
		: nested
			? _JOINABLE_NESTED_RE
			: _JOINABLE_SELECTOR_RE;
	// One selector is the common case and needs no list built to walk it.
	if (prelude.includes(",")) {
		for (const one of _splitSelectorList(prelude)) {
			if (!shape.test(one)) return false;
		}
	} else if (!shape.test(prelude)) {
		return false;
	}
	return keyframe || _pseudosReadable(prelude);
};

// Whether the selection reads each pseudo spelling met, which is the same answer
// for every prelude carrying it and for every stylesheet built for it — so it is
// kept until the selection itself changes rather than cleared per print.
/** @type {Map<string, boolean>} */
const _selectorReadMemo = new Map();
/** @type {(number[] | undefined)[] | null} */
let _selectorReadFor = null;

/**
 * Whether every target browser reads every pseudo in a prelude. One selector an
 * engine cannot parse invalidates the whole list it is joined into, so a pseudo
 * no target is known to read keeps the selector out of one. An escape and a
 * quoted attribute value are stepped over: the `:` of `.sm\:flex` and of
 * `[href="a:b"]` starts no pseudo.
 * @param {string} prelude a printed prelude the shape accepted
 * @returns {boolean} true when the target reads all of them
 */
const _pseudosReadable = (prelude) => {
	if (!prelude.includes(":")) return true;
	if (_selectorReadFor !== _prefixBrowsers) {
		_selectorReadMemo.clear();
		_selectorReadFor = _prefixBrowsers;
	}
	for (let i = 0; i < prelude.length; i++) {
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
		while (end < prelude.length && _isIdentCodePoint(prelude.charCodeAt(end))) {
			end++;
		}
		if (end === from) return false;
		const spelling = toLowerCaseIfNeeded(prelude.slice(i, end));
		let reads = _selectorReadMemo.get(spelling);
		if (reads === undefined) {
			// A pseudo-element reads with one colon as well as two, and the table
			// carries whichever spelling the standard names.
			const since =
				SELECTOR_SUPPORTED_FROM.get(spelling) ||
				(spelling.charCodeAt(1) === CC_COLON
					? undefined
					: SELECTOR_SUPPORTED_FROM.get(`:${spelling}`));
			// A pseudo the table does not name is one no engine is known to parse —
			// a vendor spelling, a CSS-modules one, or simply newer than the data —
			// and no selection makes it safe, so this precedes the target check.
			reads = since !== undefined && _readsAll(since);
			_selectorReadMemo.set(spelling, reads);
		}
		if (!reads) return false;
		i = end - 1;
	}
	return true;
};

/**
 * The properties a printed block declares at its top level. A nested rule is not
 * one, and neither is anything inside a string, a call or a block.
 * @param {string} body the block's text, its braces excluded
 * @returns {Set<string>} the property names, lowercased
 */
const _blockProperties = (body) => {
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
const _rangeEquals = (a, aStart, aEnd, b, bStart, bEnd) => {
	const length = aEnd - aStart;
	if (length !== bEnd - bStart) return false;
	for (let i = 0; i < length; i++) {
		if (a.charCodeAt(aStart + i) !== b.charCodeAt(bStart + i)) return false;
	}
	return true;
};

// A layer with no name: the one at-rule prelude that is not the same rule twice.
const ANONYMOUS_LAYER_RE = /^@layer\s*$/i;

/**
 * Join two adjacent rules into one. A qualified rule keeps its block and gathers
 * the other's selectors; an at-rule keeps its prelude and gathers the other's
 * block — the block of a condition the sheet already opened once, whose own
 * rules then meet at the seam and are offered the same join.
 * @param {RuleEntry} before the earlier rule
 * @param {RuleEntry} entry the later rule
 * @param {boolean} owned whether `before` is this run's own accumulator, whose
 * children may be extended rather than copied
 * @returns {RuleEntry | null} the one rule, or `null` when they do not join
 */
const _joinRuleEntries = (before, entry, owned) => {
	if (!_transforms.mergeRules) return null;
	if (before.prelude === -1 || entry.prelude === -1) return null;
	if (before.atRule !== entry.atRule) return null;
	// Compared where they stand: two rules meet far more often than they join, and
	// cutting each one's prelude and block out to answer that is two pieces of
	// string per meeting for an answer that is usually no.
	const preludesEqual = _rangeEquals(
		before.text,
		0,
		before.prelude,
		entry.text,
		0,
		entry.prelude
	);
	if (before.atRule) {
		if (!preludesEqual) return null;
		const beforePrelude = before.text.slice(0, before.prelude);
		// CSS Cascade 5 §6.4.1: every `@layer {` opens a layer of its own, and a
		// later layer beats an earlier one whatever the selectors say — so joining
		// the two hands the block back to specificity.
		if (ANONYMOUS_LAYER_RE.test(beforePrelude)) return null;
		const beforeChildren = before.children;
		const children = entry.children;
		if (beforeChildren === null || children === null) return null;
		// An empty block can be the whole point of the rule — `@layer a{}` declares
		// where the layer sits in the cascade — so it is never folded away.
		if (beforeChildren.length === 0 || children.length === 0) return null;
		// A run of them extends one array rather than copying a growing one.
		const joined = owned ? beforeChildren : [...beforeChildren];
		// Both sides are joined already, so the pair meeting at the seam is the one
		// new adjacency — and joining it cannot make another, the rule it leaves
		// having the prelude or the block the one before it already declined.
		const at = joined.length - 1;
		const seam = _joinRuleEntries(joined[at], children[0], false);
		let from = 0;
		if (seam !== null) {
			joined[at] = seam;
			from = 1;
		}
		let head = before.head;
		// Whatever the join leaves before the new last child joins the head, which
		// is why a run costs what it adds rather than what it has.
		if (from < children.length) {
			head += joined[at].text;
			for (let i = from; i < children.length - 1; i++) head += children[i].text;
		}
		for (let i = from; i < children.length; i++) joined.push(children[i]);
		// Each block dropped the `;` its own `}` made redundant; the one that is no
		// longer last brings its own back, so the joined body drops it again. Only
		// the last child can end in one.
		let lastText = joined[joined.length - 1].text;
		while (
			lastText.length !== 0 &&
			lastText.charCodeAt(lastText.length - 1) === CC_SEMICOLON
		) {
			lastText = lastText.slice(0, -1);
		}
		return {
			text: `${beforePrelude}{${head}${lastText}}`,
			prelude: before.prelude,
			atRule: true,
			plain: false,
			listable: LIST_NO,
			listKind: LIST_KIND_SELECTOR,
			children: joined,
			head
		};
	}
	const blocksEqual = _rangeEquals(
		before.text,
		before.prelude,
		before.text.length,
		entry.text,
		entry.prelude,
		entry.text.length
	);
	// The same selector twice is one rule: nothing stands between them, so its
	// declarations are read in the order they were written either way.
	if (preludesEqual) {
		// Two identical rules are one: only the last of a set of identical
		// declarations can be read, so the earlier block says nothing.
		if (blocksEqual) return before;
		// Declarations after a nested rule are the implicit `& {…}` the engine
		// builds for them, which is a rule the sheet did not have.
		if (!before.plain) return null;
		const beforePrelude = before.text.slice(0, before.prelude);
		const body = before.text.slice(before.prelude + 1, -1);
		const rest = entry.text.slice(entry.prelude + 1, -1);
		// One block holds a property once, so a property both of them declare would
		// lose the earlier declaration the two rules keep — and a shorthand holds
		// every longhand its name prefixes, `all` holding the lot.
		const declared = _blockProperties(body);
		for (const property of _blockProperties(rest)) {
			for (const one of declared) {
				if (
					one === property ||
					one === "all" ||
					property === "all" ||
					one.startsWith(`${property}-`) ||
					property.startsWith(`${one}-`)
				) {
					return null;
				}
			}
		}
		// Each block already dropped the `;` its own `}` made redundant, so the one
		// that is no longer last needs it back.
		const joined =
			body.length === 0 || rest.length === 0 ? body + rest : `${body};${rest}`;
		return {
			text: `${beforePrelude}{${joined}}`,
			prelude: before.prelude,
			atRule: false,
			plain: entry.plain,
			// The same prelude answers the same way, so the join carries the state it
			// is in rather than resolving it — unless the block it took on is not one
			// a list may lend its selectors to.
			listable: entry.plain ? before.listable : LIST_NO,
			listKind: before.listKind,
			children: null,
			head: ""
		};
	}
	if (!blocksEqual || !_entryListable(before) || !_entryListable(entry)) {
		return null;
	}
	// Concatenated, never canonicalized: a run of joins would then re-read the
	// whole list once per rule, and no `configCases` sheet loses a byte to it.
	const list = `${before.text.slice(0, before.prelude)},${entry.text.slice(
		0,
		entry.prelude
	)}`;
	return {
		text: list + before.text.slice(before.prelude),
		prelude: list.length,
		atRule: false,
		plain: true,
		listable: LIST_YES,
		listKind: before.listKind,
		children: null,
		head: ""
	};
};

// A named layer block, up to the `{` its body opens with.
const NAMED_LAYER_BLOCK_RE = /^@layer [^{;]+\{/;

/**
 * The `@layer <name> {` a printed sibling opens with, when the whole of it is
 * one named layer block. An anonymous `@layer {` is a layer of its own and is
 * not one of these (see `ANONYMOUS_LAYER_RE`).
 * @param {string} text a sibling's printed text
 * @returns {string | null} its opener, or null when it is not such a block
 */
const _namedLayerOpener = (text) => {
	if (text.length === 0 || text.charCodeAt(0) !== CC_AT_SIGN) return null;
	if (text.charCodeAt(text.length - 1) !== CC_RIGHT_CURLY) return null;
	const opener = NAMED_LAYER_BLOCK_RE.exec(text);
	return opener === null ? null : opener[0];
};

// `@layer ` — what an opener carries in front of the layer it names.
const NAMED_LAYER_OPENER_HEAD = "@layer ".length;

/** @typedef {{ at: number, subtree: boolean, taken?: TakenPiece }} SeenLayer a named block already out, whether a later sibling wrote inside its layer's subtree, and the piece its rules are keyed in */

/**
 * Record what a named block about to go out does to the ones already out. A
 * block writes into its own layer, and into layers under it only when it opens
 * one — and a block for `a.b` writes where a block for `a` opening `b` inside
 * itself writes, so the two spellings are one layer and the order within it is
 * one the cascade reads. A block whose subtree a later sibling wrote into may
 * still be folded into, but only by one that stays in its own layer.
 * @param {Map<string, SeenLayer>} layers the blocks seen so far, by opener
 * @param {string} name the layer this block opens
 * @param {boolean} deep whether it opens a layer of its own
 * @returns {void}
 */
const _noteLayerBlock = (layers, name, deep) => {
	for (const [opener, seen] of layers) {
		const other = opener.slice(NAMED_LAYER_OPENER_HEAD, -1).trim();
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
const _opensNestedLayer = (text, opener) =>
	text.includes("@layer", opener.length);

// The at-rules whose place in the sheet is what they say: where a layer is first
// named fixes its order against the others, and `@charset`, `@import` and
// `@namespace` are read only ahead of the rules they precede. A rule holding one
// is never dropped as a repeat, wherever in its text it sits.
const POSITIONAL_AT_RULE_RE = /@(?:charset|import|layer|namespace)\b/i;

/**
 * Gather each named `@layer` block into the first sibling block of that name.
 * They are one layer however far apart they stand, and what separates them is in
 * another layer or in none — either way ordered against these by the cascade
 * rather than by where they sit, so moving the later body up is not a move the
 * cascade can see. An anonymous `@layer {` is a layer of its own and is left
 * alone (see `ANONYMOUS_LAYER_RE`).
 * @param {string[]} texts the siblings' printed texts, rewritten in place
 * @returns {void}
 */
const _mergeNamedLayerBlocks = (texts) => {
	if (!_transforms.mergeRules) return;
	/** @type {Map<string, SeenLayer> | null} */
	let first = null;
	for (let i = 0; i < texts.length; i++) {
		const text = texts[i];
		const prelude = _namedLayerOpener(text);
		if (prelude === null) {
			// A sibling naming a layer any other way writes into one of these, and
			// the order within a layer is the cascade's, so nothing folds over it.
			if (first !== null && POSITIONAL_AT_RULE_RE.test(text)) first.clear();
			continue;
		}
		if (first === null) first = new Map();
		const seen = first.get(prelude);
		const deep = _opensNestedLayer(text, prelude);
		_noteLayerBlock(
			first,
			prelude.slice(NAMED_LAYER_OPENER_HEAD, -1).trim(),
			deep
		);
		if (seen === undefined || (deep && seen.subtree)) {
			first.set(prelude, { at: i, subtree: false });
			continue;
		}
		// Both bodies keep their order, so the layer reads as it was written.
		const at = seen.at;
		texts[at] = `${texts[at].slice(0, -1)}${text.slice(prelude.length)}`;
		texts[i] = "";
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
 * @returns {void}
 */
const _mergeAdjacentRules = (items, texts, pending) => {
	if (!_transforms.mergeRules) return;
	let previous = -1;
	/** @type {RuleEntry | null} */
	let held = null;
	// Whether `held` is a rule this run built, rather than one the printer stored.
	let owned = false;
	for (let i = 0; i < items.length; i++) {
		if (texts[i].length === 0) continue;
		if (pending !== null && pending.has(items[i])) {
			previous = i;
			held = null;
			owned = false;
			continue;
		}
		const entry = _ruleEntryOf(items[i], texts[i]);
		if (held !== null) {
			const merged = _joinRuleEntries(held, entry, owned);
			if (merged !== null) {
				held = merged;
				owned = true;
				_ruleEntry.set(items[previous], merged);
				texts[previous] = merged.text;
				texts[i] = "";
				continue;
			}
		}
		// Anything else between them — a declaration, a rule that cannot join —
		// parts the run: in a nested block a declaration is read at its own place.
		previous = i;
		held = entry.prelude === -1 ? null : entry;
		owned = false;
	}
};

// CSS Values 4 §5: "for zero lengths the unit identifier is optional". Only the
// length units — a zero time, angle, frequency, resolution or `<flex>` still
// needs its unit, and `0%` is a percentage, a different type.
const _ZERO_LENGTH_RE = new RegExp(`^0(?:${_LENGTH_UNITS})$`, "i");

/**
 * Drop a zero length's unit. Only a whole component: anything inside `calc()`
 * or a `var()` fallback stays, since there a bare `0` is a `<number>` and the
 * expression would stop parsing. `_dropZeroLengthUnitInCall` reaches into the
 * calls where it is a length instead.
 * @param {string} fragment one printed top-level component
 * @returns {string} the component, its zero unit dropped
 */
const _dropZeroLengthUnit = (fragment) =>
	_transforms.shortenNumbers && _ZERO_LENGTH_RE.test(fragment) ? "0" : fragment;

// A zero angle argument, on its own or one of a comma list.
const _ZERO_ANGLE_ARGUMENT_RE = /(^|,)\s*0(?:deg|grad|rad|turn)\s*(?=,|$)/gi;

/**
 * Drop the unit a zero argument does not need, for a call whose own grammar
 * makes it droppable — a `<zero>` beside `<angle>`, or a length.
 * @param {string} fn the lowercased function name
 * @param {string} inner the text between the parentheses
 * @returns {string} the arguments, such zero units dropped
 */
const _dropCallZeroUnit = (fn, inner) => {
	if (ZERO_ANGLE_FUNCTIONS.has(fn)) {
		return inner.replace(_ZERO_ANGLE_ARGUMENT_RE, "$10");
	}
	return LENGTH_ONLY_FUNCTIONS.has(fn) ? _dropZeroLengthUnit(inner) : inner;
};

// One call, split into its name and the text between its parentheses.
const _LONE_CALL_RE = /^([-\w]+)\(([^()]*)\)$/;

/**
 * The same, for the arguments of a call whose every number is a length. The
 * split is on top-level separators of a body holding no nested call, so each
 * piece is a whole argument and a `calc()` inside one is never reached.
 * @param {string} fragment one printed top-level component
 * @returns {string} the component, its arguments' zero units dropped
 */
const _dropZeroLengthUnitInCall = (fragment) => {
	if (!_transforms.shortenNumbers) return fragment;
	const match = _LONE_CALL_RE.exec(fragment);
	if (match === null) return fragment;
	if (!LENGTH_ONLY_FUNCTIONS.has(toLowerCaseIfNeeded(match[1]))) {
		return fragment;
	}
	const body = match[2].replace(/[^\s,]+/g, _dropZeroLengthUnit);
	return `${match[1]}(${body})`;
};

// A `calc()` holding one constant, which is the only shape the parentheses can
// come off. `-` is matched so a negative is recognized and then kept.
const _LONE_CALC_RE = /^calc\((-?(?:\d*\.\d+|\d+))(%|[a-z]+)?\)$/i;

// A folded term that means the same thing bare as it does inside `calc()`,
// whatever the property and wherever it stands: positive, and either carrying a
// unit (so never an `<integer>` context) or already a non-zero integer. A
// unitless fraction is left out — there the property decides, which only the
// declaration printer knows — as is anything negative. Zero is the one number a
// length also accepts, so `width:calc(0)` is dropped where `width:0` is not.
const _BARE_TERM_RE = /^(?:\d*\.\d+|\d+)(?:%|[a-z]+)$|^(?!0+$)\d+$/i;

// The same, one level in: a folded term standing as an operand of an outer math
// expression is arithmetic rather than a value, so no property judges it and a
// fraction or a zero needs no parentheses either. One non-negative term only —
// `calc(1px - calc(0px - 5px))` may not become `calc(1px - -5px)`, nor
// `calc(1px - calc(1em + 1px))` a sum whose second term changed sign.
const _NESTED_TERM_RE = /^(?:\d*\.\d+|\d+)(?:%|[a-z]+)?$/i;

/**
 * Take the parentheses off a folded `calc()`, where the bare value means the
 * same thing. Two shapes where it does not, both measured in headless Chromium:
 * a negative is clamped inside `calc()` and a parse error outside it on a
 * property that takes none (`width:calc(-5px)` renders at `0`, `width:-5px` at
 * `auto`), and a fraction is rounded where the grammar wants an `<integer>`
 * (`z-index:calc(1.5)` computes to `2`, `z-index:1.5` is dropped). A unit or a
 * percentage settles the second on its own, since no `<integer>` carries
 * either. A unitless zero is a third: it is the one number a length accepts, so
 * `width:calc(0)` is dropped and `width:0` is not. A fourth is a value the spec
 * clamps a `calc()` to and rejects bare (see `CLAMPED_VALUE_RANGES`).
 * @param {string} fragment one printed component
 * @param {string} property the lowercased property it belongs to
 * @returns {string} the bare value, or the fragment as it was
 */
const _unwrapCalc = (fragment, property) => {
	const match = _LONE_CALC_RE.exec(fragment);
	if (match === null) return fragment;
	// Where the engine takes no `calc()`, the bare value is the one it reads —
	// so unwrapping would switch on a declaration it had thrown away.
	if (CALC_REJECTING_PROPERTIES.has(property)) return fragment;
	const number = match[1];
	if (
		number.charCodeAt(0) === 0x2d &&
		!NEGATIVE_ACCEPTING_PROPERTIES.has(property)
	) {
		return fragment;
	}
	const unit = match[2] === undefined ? "" : match[2];
	// The fold left the `calc()` because the value is clamped inside one and not
	// outside; taking the parentheses off here would undo that.
	if (_losesClamp(property, number, unit)) return fragment;
	if (unit === "" && Number(number) === 0) return fragment;
	if (unit === "" && number.includes(".") && INTEGER_PROPERTIES.has(property)) {
		return fragment;
	}
	return number + unit;
};

/**
 * Whether a `(…)` block is one of `@scope`'s two selector lists — its scope root
 * or its limit — rather than a query condition. Both sit directly in the
 * at-rule's prelude, so the immediate parent settles it.
 * @param {CssPath} path the accessor positioned on the `(…)` block
 * @returns {boolean} true inside a `@scope` prelude
 */
const _inScopePrelude = (path) => {
	const parent = path.parent;
	return (
		parent !== null &&
		path.type(parent) === T_AT_RULE &&
		equalsLowerCase(path.name(parent), "scope")
	);
};

/**
 * Whether a string token closed with its own quote rather than running to EOF.
 * §4.3.5 ends an unterminated string at EOF, so its text has no closing quote
 * and `slice(1, -1)` would drop a real character (`_minifyString` and
 * `_minifyUrlFunction` refuse to rewrite one for the same reason).
 * @param {string} text a string token's text
 * @returns {boolean} true when the string is closed
 */
const _isClosedString = (text) => {
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
 * Print an attribute selector's children: the separators go (the grammar allows
 * whitespace anywhere inside `[…]`, and `_join` still parts two fragments that
 * would fuse — `[a=b i]`), and a quoted value that is also a bare identifier
 * loses its quotes. Unquoting starts after the `=` delim, so the `[…]`'s name
 * side is never touched. A separator right after a kept string stays: `[a="b" i]`
 * is what every engine is exercised on.
 * @param {CssPath} path the accessor positioned on the `[…]` block
 * @param {ComponentValue[]} children the block's children
 * @param {PrintContext} writer the print context (children's printed text)
 * @returns {string[]} the fragments to join
 */
const _printAttributeSelector = (path, children, writer) => {
	/** @type {string[]} */
	const parts = [];
	let afterEquals = false;
	let afterString = false;
	let afterBar = false;
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		const type = path.type(child);
		if (type === T_WHITESPACE) {
			// Not after the `|` a namespace is parted from its attribute by: the
			// two are one token sequence there, so whitespace between them is what
			// makes the selector invalid. Measured in headless Chromium: `[| a]` is
			// dropped and `[ |a]` is not.
			if (afterString || afterBar) parts.push(_SEP);
			continue;
		}
		const text = writer.get(child);
		afterString = false;
		afterBar = !afterEquals && type === T_DELIM && text === "|";
		if (!afterEquals) {
			if (type === T_DELIM && text === "=") afterEquals = true;
			parts.push(text);
		} else if (
			_transforms.normalizeQuotes &&
			type === T_STRING &&
			_isClosedString(path.source(child))
		) {
			const body = text.slice(1, -1);
			if (_isBareIdent(body)) {
				parts.push(body);
			} else {
				parts.push(text);
				afterString = true;
			}
		} else {
			parts.push(text);
		}
	}
	return parts;
};

/**
 * A selector list is a set: the same selectors in any order match the same
 * elements at the same specificity, so a repeat inside it says nothing and one
 * canonical order lets equal lists compress alike. Only ever the author's own
 * list — a join seam concatenates, so a run of them stays linear.
 * @param {string} prelude the printed selector list
 * @returns {string} it, or `prelude` when nothing there is shorter
 */
const _canonicalSelectorList = (prelude) => {
	if (!_transforms.shortenSelectors) return prelude;
	// A list needs a comma; the great majority of preludes are one selector, and
	// without one there is nothing to split, deduplicate or order.
	if (!prelude.includes(",")) return prelude;
	const list = _splitSelectorList(prelude);
	if (list.length < 2) return prelude;
	// One pass answers both questions the common case turns on — every selector
	// distinct, and already in order — so the list is walked once rather than
	// twice before being handed back untouched.
	const seen = new Set();
	let sorted = true;
	for (let i = 0; i < list.length; i++) {
		seen.add(list[i]);
		if (i !== 0 && list[i - 1] > list[i]) sorted = false;
	}
	if (seen.size === list.length && sorted) return prelude;
	return [...seen].sort().join(",");
};

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
const _rulePrelude = (path, writer, minify, outParts) => {
	const parts = outParts || [];
	// Fold the `@name` in first so the join keeps the separator before the
	// prelude's first token (e.g. `@media screen`, unmerged).
	if (path.type() === T_AT_RULE) {
		const name = path.name();
		// `@charset` is the one at-keyword read as bytes rather than matched
		// (CSS Syntax 3 §3.2), so lowercasing `@CHARSET` would turn a rule the
		// engine drops into one that sets the sheet's encoding.
		const lower = minify && !equalsLowerCase(name, "charset");
		parts.push(`@${lower ? asciiLowerCaseName(name) : name}`);
	}
	_appendChildTexts(path.node, writer, parts);
	// `@media`/`@container` only: the two preludes whose `(…)` is a media
	// feature, so an `and` of two of them is an interval.
	if (minify && path.type() === T_AT_RULE) {
		// One read of the name for both tests: each is a slice of the source.
		const name = path.name();
		const media = equalsLowerCase(name, "media");
		if (media || equalsLowerCase(name, "container")) {
			// Only `@media`'s top level is media types and the keywords between
			// them; `@container`'s leads with a container name, which is the
			// author's own and case-sensitive.
			if (media) _lowercaseConditionParts(parts);
			if (_rangeSpellingAllowed) _collapseRangeInterval(parts);
		}
	}
	if (minify && path.type() === T_QUALIFIED_RULE) {
		_foldPseudoNames(parts);
		_dropImpliedUniversalSelector(parts);
	}
	// Only a qualified rule's prelude is a selector — trim combinator spaces
	// there; an at-rule prelude (media / container query) keeps its spacing.
	const prelude = _join(
		parts,
		!minify,
		path.type() === T_QUALIFIED_RULE ? _TRIM_COMBINATORS : _TRIM_NOTHING
	);
	if (minify && path.type() === T_QUALIFIED_RULE) {
		// A keyframe selector, not a selector list: CSS Animations 1 §4 gives
		// `from` and `to` as `0%` and `100%`, and each pair has a shorter half.
		const parent = path.parent;
		if (
			_transforms.shortenSelectors &&
			parent !== null &&
			path.type(parent) === T_AT_RULE &&
			KEYFRAMES_AT_RULE_RE.test(path.name(parent))
		) {
			return _splitSelectorList(prelude)
				.map((one) =>
					equalsLowerCase(one, "from")
						? "0%"
						: _KEYFRAME_FULL_RE.test(one)
							? "to"
							: one
				)
				.join(",");
		}
		return _canonicalSelectorList(prelude);
	}
	return prelude;
};

/**
 * Whether text ends in an escape the input ran out of — a `\` no character
 * follows. The tokenizer already read it as one, so the raw text is not what the
 * token holds, and writing it out would escape whatever the printer puts next.
 * @param {string} text raw source text
 * @returns {boolean} true when the last `\` has nothing to escape
 */
const _endsInLoneEscape = (text) => {
	let at = text.length;
	while (at > 0 && text.charCodeAt(at - 1) === CC_REVERSE_SOLIDUS) at--;
	return (text.length - at) % 2 === 1;
};

/**
 * Put one declaration list together: the list-wide transforms (merge a family's
 * longhands into their shorthand, drop what a later declaration supersedes, add
 * and drop vendor prefixes, join adjacent rules) and the body text they make.
 * A rule's block and a whole `block-contents` parse are the same production, so
 * both go through here — what differs is only what is written around the body.
 * @param {CssPath} path the walk's accessors
 * @param {Declaration[]} decls the list's declarations
 * @param {Rule[] | null} rules the rules interleaved with them, if any
 * @param {PrintContext} writer the print context holding each node's text
 * @param {boolean} minify whether to run the transforms
 * @param {string} nl what prefixes each item: nothing minifying, a line break beautifying (declarations end in `;`, rules don't)
 * @param {Node | null} owner the block this is the body of, or null at top level
 * @returns {{ body: string, items: Node[], texts: string[], superseded: Set<number> | null, droppedPrefix: Set<number> | null, addedPrefix: Map<number, string> | null, deadPrefixed: Set<Node> | null, spans: RuleSpan[] | null }} the body, and what went into it
 */
const _composeBlockBody = (path, decls, rules, writer, minify, nl, owner) => {
	// Merge the split declarations + child rules back into source order
	// (§5.4.5 loses their interleaving; reordering would change the cascade).
	/** @type {Node[]} */
	let items = decls;
	if (rules !== null && rules.length !== 0) {
		items =
			decls.length === 0
				? rules
				: [...decls, ...rules].sort((a, b) => path.start(a) - path.start(b));
	}
	// A family's longhands are their shorthand, so they print as it — four
	// sides or corners, the two a pair shorthand sets, or the slots of an
	// order-free one. Earlier tables win, though no property is in two of
	// them.
	const mergeable = minify;
	/** @type {Map<Node, string>[]} */
	const merges = [];
	if (mergeable && decls.length >= 2) {
		// One pass over the names for all three tables: which declaration wrote
		// each property, which was written twice, and how many are a longhand
		// any shorthand could gather. A shorthand needs two of those, so a
		// block holding fewer cannot write one whatever the tables say — which
		// is almost every block, and what keeps this off them.
		/** @type {Map<string, number>} */
		const at = new Map();
		/** @type {Set<string>} */
		const repeated = new Set();
		let mergeableNames = 0;
		for (let i = 0; i < decls.length; i++) {
			const property = toLowerCaseIfNeeded(path.name(decls[i]));
			if (at.has(property)) repeated.add(property);
			else if (MERGE_LONGHANDS.has(property)) mergeableNames++;
			at.set(property, i);
		}
		if (mergeableNames >= 2) {
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
			for (const [table, mode] of MERGE_TABLES) {
				const merged = _mergeBoxLonghands(
					path,
					decls,
					writer,
					table,
					mode,
					at,
					repeated,
					rulesBefore
				);
				if (merged !== null) merges.push(merged);
			}
		}
	}
	/** @type {string[]} */
	const texts = [];
	for (const item of items) {
		/** @type {string | undefined} */
		let replacement;
		for (const merged of merges) {
			replacement = merged.get(item);
			if (replacement !== undefined) break;
		}
		texts.push(replacement === undefined ? writer.get(item) : replacement);
	}
	// The block's own children have all printed, so their sibling state is
	// final: which of them a twin has already made dead, and which are still
	// waiting for one. A rule that may yet be taken back must stay one rule,
	// so it is kept out of a join.
	const childScope =
		_seenPrefixRules === null ? undefined : _seenPrefixRules.get(owner);
	if (minify) {
		_mergeAdjacentRules(
			items,
			texts,
			childScope === undefined || childScope.pending === null
				? null
				: new Set(childScope.pending.values())
		);
		_mergeNamedLayerBlocks(texts);
	}
	// Only the last of a set of declarations of one property can be read, so
	// the earlier ones carry nothing — whatever stands between them. Identical
	// text always resolves that way; a differently spelled value only where
	// the later one writes every name the earlier does, since otherwise the
	// earlier is its fallback — dropping those is how esbuild and
	// lightningcss lose a `color(display-p3 …)` pair.
	// TODO offer the wider "drop whatever a later declaration overrides"
	// behind an option, as csso and cssnano expose theirs. It needs support
	// data per keyword: a bare ident may be invalid, or newer than the value
	// it stands after, and neither supersedes anything.
	/** @type {Set<number> | null} */
	let superseded = null;
	// One item can supersede nothing, and most rules hold one or none.
	if (minify && _transforms.removeDeadRules && items.length > 1) {
		superseded = new Set();
		/** @type {Map<string, number>} */
		const seen = new Map();
		/** @type {Map<string, number[]>} */
		const wrote = new Map();
		/** @type {Map<string, number> | null} */
		let seenRules = null;
		for (let i = 0; i < items.length; i++) {
			// A nested rule parts the declarations around it into their own
			// rules, so the one before it is read at its own place in the
			// cascade rather than resolving to the one after.
			if (path.type(items[i]) !== T_DECLARATION) {
				seen.clear();
				wrote.clear();
				const rule = texts[i];
				// An identical later sibling writes the same declarations to the
				// same elements and wins the tie, so this one is read for nothing
				// — whatever stands between them, which can only lose to the later
				// one wherever it would have beaten this.
				if (rule.length !== 0 && !POSITIONAL_AT_RULE_RE.test(rule)) {
					if (seenRules === null) seenRules = new Map();
					const before = seenRules.get(rule);
					if (before !== undefined) superseded.add(before);
					seenRules.set(rule, i);
				}
				continue;
			}
			const text = texts[i];
			const at = seen.get(text);
			if (at !== undefined) superseded.add(at);
			seen.set(text, i);
			const colon = text.indexOf(":");
			// A custom property's value is a token stream nothing here reads, so
			// what an engine makes of it is not knowable from its spelling.
			if (colon <= 0 || text.charCodeAt(1) === CC_HYPHEN_MINUS) continue;
			const property = _printedProperty(text, colon);
			if (!CUSTOM_IDENT_LIST_PROPERTIES.has(property)) continue;
			let earlier = wrote.get(property);
			if (earlier === undefined) {
				earlier = [];
				wrote.set(property, earlier);
			} else {
				const value = _printedValue(text, colon);
				const important = path.important(items[i]);
				for (let j = earlier.length - 1; j >= 0; j--) {
					const before = earlier[j];
					// An `!important` earlier one still wins over a later plain
					// declaration, which leaves the later dead rather than it.
					if (!important && path.important(items[before])) continue;
					const beforeText = texts[before];
					if (
						!_coveredByLater(
							value,
							_printedValue(beforeText, beforeText.indexOf(":"))
						)
					) {
						continue;
					}
					superseded.add(before);
					earlier.splice(j, 1);
				}
			}
			earlier.push(i);
		}
		// After the supersedes: a declaration a later one already made dead is
		// no shorthand to fold into, and folding never makes one dead.
		if (_transforms.mergeLonghands) {
			_foldFollowingLonghands(path, items, texts, superseded);
		}
	}
	// Vendor prefixes: drop a prefixed declaration no target needs (its
	// unprefixed sibling already covers them), and before an unprefixed one
	// add the prefixes a target still needs. Off with no target list.
	/** @type {Set<number> | null} */
	let droppedPrefix = null;
	/** @type {Map<number, string> | null} */
	let addedPrefix = null;
	if (_prefixingOn) {
		// One pass reads each declaration's property, and only a block writing
		// a property some engine spells with a prefix — few do — is walked
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
			if (path.type(items[i]) !== T_DECLARATION || text.length === 0) {
				properties.push("");
				values.push("");
				continue;
			}
			// The name is read only where its shape says it could matter, which
			// is what keeps this off the declarations — almost all of them — that
			// no engine ever spelled another way.
			const colon = text.indexOf(":");
			if (!_mayPrefixDeclaration(text, colon)) {
				properties.push("");
				values.push("");
				continue;
			}
			const property = _printedProperty(text, colon);
			properties.push(property);
			const valueTable = PREFIXED_VALUES.get(property);
			values.push(valueTable === undefined ? "" : _printedValue(text, colon));
			if (
				valueTable !== undefined ||
				PREFIXED_PROPERTIES.has(property) ||
				(property.charCodeAt(0) === CC_HYPHEN_MINUS &&
					VENDOR_PREFIX.test(property))
			) {
				prefixable = true;
			}
		}
		if (prefixable) {
			/** @type {Set<string>} */
			const present = new Set();
			for (let i = 0; i < properties.length; i++) {
				if (properties[i].length === 0) continue;
				present.add(properties[i]);
				// A value is only ever asked for against its own property, so the
				// two share one set.
				if (values[i].length !== 0) {
					present.add(`${properties[i]}\0${values[i]}`);
				}
			}
			for (let i = 0; i < properties.length; i++) {
				const property = properties[i];
				if (property.length === 0) continue;
				let add = "";
				const value = values[i];
				if (value.length !== 0) {
					const valueTable = /** @type {Map<string, [string, number][]>} */ (
						PREFIXED_VALUES.get(property)
					);
					const keyword = _prefixedValueKeyword(valueTable, value);
					if (keyword !== undefined) {
						// A vendor-spelled value, dead once the keyword it stands for
						// is written for this property too.
						if (
							present.has(`${property}\0${keyword}`) &&
							_prefixRemovable(valueTable, keyword, value)
						) {
							if (droppedPrefix === null) droppedPrefix = new Set();
							droppedPrefix.add(i);
							continue;
						}
					} else {
						const spellings = _neededPrefixes(valueTable, value);
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
						? _prefixedPropertyName(property)
						: undefined;
				if (base !== undefined) {
					if (
						present.has(base) &&
						_prefixRemovable(PREFIXED_PROPERTIES, base, property)
					) {
						if (droppedPrefix === null) droppedPrefix = new Set();
						droppedPrefix.add(i);
						continue;
					}
				} else {
					const needed = _neededPrefixes(PREFIXED_PROPERTIES, property);
					if (needed !== null) {
						for (const spelling of needed) {
							if (present.has(spelling)) continue;
							const copy = _prefixedDeclaration(
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
	// Every child has printed by now, so the sibling set they shared goes.
	if (_seenPrefixRules !== null && owner !== null) {
		_seenPrefixRules.delete(owner);
	}
	// A nested prefixed rule an unprefixed twin has since made dead weight:
	// the twin could not take it back out of the output, since the text was
	// still on its way here, so it is left out as the body is put together.
	const deadPrefixed = childScope === undefined ? null : childScope.dead;
	let body = "";
	// Where each rule this block carries lands in it, so the copy that makes
	// one dead can find it without the sheet being read a second time. A
	// nested block's own spans move in with its text, its prelude joining
	// their keys — by the top level each key names a rule and its conditions.
	/** @type {RuleSpan[] | null} */
	let spans = null;
	// One per child with a body, in the order they finished — which is what
	// `rules` holds, so there is nothing to count. Nothing reads them while
	// not minifying, when no block records any.
	const bodies = minify && rules !== null ? rules.length : 0;
	const childSpans =
		bodies === 0 ? _NO_BLOCK_SPANS : _blockSpans.splice(-bodies, bodies);
	let atChild = 0;
	for (let i = 0; i < texts.length; i++) {
		const isBlock = bodies !== 0 && path.type(items[i]) !== T_DECLARATION;
		const mine = isBlock ? childSpans[atChild++] : undefined;
		if (droppedPrefix !== null && droppedPrefix.has(i)) continue;
		const text = texts[i];
		if (text.length === 0) continue;
		if (superseded !== null && superseded.has(i)) continue;
		if (deadPrefixed !== null && deadPrefixed.has(items[i])) continue;
		if (addedPrefix !== null) {
			const add = addedPrefix.get(i);
			if (add !== undefined) body += add;
		}
		body += nl;
		const at = body.length;
		body += text;
		if (minify && isBlock) {
			if (spans === null) spans = [];
			_collectRuleSpans(spans, items[i], text, at, path, mine);
		}
	}
	// Drop the redundant `;` a following `}` — or, at top level, the end of the
	// input — makes so, when minifying.
	if (minify) {
		while (
			body.length !== 0 &&
			body.charCodeAt(body.length - 1) === CC_SEMICOLON
		) {
			body = body.slice(0, -1);
		}
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
 * The default CSS node printer — passed to the `SourceProcessor` and fired once a
 * node's visitors and children are done (a developer could supply their own).
 * It takes the same `path` a visitor gets plus the print context as its `writer`,
 * and knows nothing of the walk: it switches on `path.type()`, reads the node's
 * name / children through `path`, pulls its children's already-printed text from
 * `writer.get`, composes this node's text (with the CSS-local `_join` / `_SEP` /
 * spacing) and **returns** it. Structure keeps it safe: a declaration's
 * `name:value` drops the space around `:` a flat token stream could not, and
 * custom-property (`--*`) values stay verbatim. When minifying it also applies the
 * safe value transforms (number normalization, hex / rgb() color minification,
 * `cubic-bezier()` / `steps()` easing keywords, string / attribute-selector /
 * `url()` quote normalization, identifier escape shortening, `{1,4}` box and
 * `flex` shorthand collapsing), drops the
 * whitespace a query condition does not need, and drops rules whose block ends
 * up empty — each value-identical, so meaning never changes.
 * @experimental exposed as `webpack.css.syntax.printer`; unstable API
 * @param {CssPath} path the accessor positioned on the finished node
 * @param {PrintContext} writer the print context (children's printed text)
 * @returns {string} the node's serialized text
 */
const printer = (path, writer) => {
	const minify = writer.options.mode === "minify";
	// `""` minifying / `" "` beautifying (a "soft" space, e.g. after a `:`).
	const soft = minify ? "" : " ";
	switch (path.type()) {
		case T_WHITESPACE:
			return _SEP;
		// Only a newline makes a string bad, and the tokenizer leaves it unconsumed
		// — so carry it, or the string closes and the declaration an engine threw
		// away runs.
		case T_BAD_STRING:
			return `${path.source()}\n`;
		case T_NUMBER:
		case T_PERCENTAGE:
		case T_DIMENSION: {
			const raw = path.source();
			// Only declaration values: a prelude number is An+B (`2n+1`) or similar,
			// where stripping a `+` breaks the selector.
			return minify && path.inValue() ? _normalizeNumericToken(raw) : raw;
		}
		case T_FUNCTION: {
			const name = path.name();
			// A container style query asks whether a custom property's value is the
			// one written here, and that comparison reads the token stream as
			// written — so a squeezed whitespace run inside one asks a different
			// question (CSS Conditional 5 §5). Nothing in it is rewritten.
			if (
				minify &&
				!path.inValue() &&
				_inMediaConditionPrelude &&
				equalsLowerCase(name, "style")
			) {
				const written = path.source();
				// Unclosed at EOF, the source carries no `)` for the walk to have
				// closed — printed as usual so the parenthesis is written back.
				if (written.endsWith(")")) {
					// Written whole, comments included, so the queued copies are claimed
					// here rather than flushed a second time after the rule.
					writer.takeInserts(path.start(), path.end());
					return written;
				}
			}
			let inner;
			if (path.childCount() === 1) {
				// Half of all functions take one argument, which `_join` would hand
				// straight back — and a trim only ever parts two of them, so no
				// universal a compound implies can stand beside anything here either.
				const only = writer.get(path.childAt(path.node, 0));
				inner = only === _SEP ? "" : only;
			} else {
				// A selector function's argument is a selector, so its combinators need
				// no whitespace — the same trim the enclosing prelude already gets. A
				// `@supports` condition is the syntax being tested rather than applied,
				// and an engine hands it back as written, so it keeps its whitespace.
				const trim =
					_mathFunctionDepth !== 0
						? _TRIM_MATH
						: !path.inValue() &&
							  !_inSupportsPrelude &&
							  SELECTOR_FUNCTIONS.has(name.toLowerCase())
							? _TRIM_COMBINATORS
							: _TRIM_NOTHING;
				/** @type {string[]} */
				const parts = [];
				_appendChildTexts(path.node, writer, parts);
				// A selector function's argument is a selector like the prelude's, so
				// the universal a compound implies says nothing there either.
				if (minify && trim === _TRIM_COMBINATORS) {
					_foldPseudoNames(parts);
					_dropImpliedUniversalSelector(parts);
				}
				inner = _join(parts, !minify, minify ? trim : _TRIM_NOTHING);
				// Chrome throws out `attr( name unit )` where `attr( name unit)`
				// parses, so the space before the `)` decides whether the declaration
				// runs — `_join` drops a trailing one like any other.
				if (
					minify &&
					parts[parts.length - 1] === _SEP &&
					equalsLowerCase(name, "attr")
				) {
					inner += " ";
				}
			}
			if (!minify) return `${name}(${inner})`;
			// Function names match ASCII case-insensitively, so one lowercase name
			// is what every table below is keyed by; the eleven transforms spelled
			// with a capital are printed the way everything else writes them.
			const fn = asciiLowerCaseName(name);
			// As with a unit: a name already lowercase is its own answer, and only a
			// shouted one is looked up. The lookup key still folds inside a
			// substituted value; only the printed spelling stays as written.
			const out = _inSubstitutedValue
				? name
				: fn === name
					? fn
					: CANONICAL_NAMES.get(fn) || fn;
			// An+B in a selector: `2n+1` is what `odd` names, and shorter written so.
			if (!path.inValue() && NTH_PSEUDO_FUNCTIONS.has(fn)) {
				return _minifyAnPlusB(out, inner);
			}
			// A color function (rgb/rgba) collapses to the shortest color; anything
			// else keeps its `name(args)` form.
			// A color inside a `@supports` condition is the syntax being tested — the
			// engines that read `#0000` are not the ones that read `rgba(0,0,0,0)`,
			// so rewriting it asks a different question (esbuild, clean-css and
			// lightningcss leave the condition alone too).
			// A gradient stop outside sRGB is handed back as written rather than
			// computed, so converting one moves the value the CSSOM reports — and
			// where the gradient names the space its stops interpolate in, it moves
			// the ramp itself. The legacy sRGB forms all compute to `rgb(…)`
			// whichever way they are spelled, so those still fold.
			const color = _inSupportsPrelude
				? null
				: _minifyColorFunction(fn, inner, _hexAlphaAllowed) ||
					(_inGradient
						? null
						: _minifyPolarColorFunction(fn, inner, _hexAlphaAllowed));
			if (
				color !== null &&
				(color !== "transparent" || !_inTapHighlightColor())
			) {
				return color === "transparent" && _hexAlphaAllowed ? "#0000" : color;
			}
			// A math function over constants of one unit is that one value, and it
			// is written back as a `calc()` whatever it was: the parentheses have to
			// stay (dropping them turns a clamped negative into a parse error and a
			// rounded fraction into one), and only the declaration printer — which
			// knows the property — takes them off.
			if (!_inSupportsPrelude && !_inCustomProperty) {
				const term = _foldMathFunction(fn, inner);
				if (term !== null) {
					// A term that means the same bare needs no parentheses anywhere, so
					// it is written as itself; the rest keep a `calc()` for the
					// declaration printer to judge against the property.
					const shape =
						_mathFunctionDepth > 1 ? _NESTED_TERM_RE : _BARE_TERM_RE;
					const folded =
						shape.test(term) &&
						!_inCalcRejectingProperty() &&
						!_foldLosesClamp(term)
							? term
							: `calc(${term})`;
					// A division can land on a value needing every digit of a double,
					// which is longer than the expression that produced it.
					if (folded.length < fn.length + inner.length + 2) return folded;
				}
				const reduced = _reduceMathArguments(fn, inner);
				if (reduced !== null) return `${fn}(${reduced})`;
			}
			// An easing function is only ever a value; `url()` is also an at-rule
			// prelude's (`@import url("a.css")`).
			const easing =
				path.inValue() && !_inCustomProperty
					? _minifyEasingFunction(fn, inner)
					: null;
			if (easing !== null) return easing;
			// `translateX(v)` is `translate(v)` and `skewX(a)` is `skew(a)` — the
			// second component defaults to 0. Only for one plain component: a
			// substitution could expand to two, which the one-axis spelling rejects
			// and the pair would accept, reviving a declaration the browser drops.
			const oneAxis = _transforms.reduceFunctions
				? X_AXIS_TRANSFORMS.get(fn)
				: undefined;
			if (
				oneAxis !== undefined &&
				path.inValue() &&
				!_inSubstitutedValue &&
				!inner.includes(",") &&
				!_hasSubstitution(inner)
			) {
				return `${oneAxis}(${inner})`;
			}
			if (path.inValue() && !_inSubstitutedValue) {
				// An argument that is the amount an omitted one means says nothing,
				// whether or not the zero still carries the unit its grammar drops.
				const omitted = _transforms.reduceFunctions
					? FILTER_FUNCTION_OMITTED.get(fn)
					: undefined;
				if (omitted !== undefined) {
					const bare = _dropCallZeroUnit(fn, inner);
					if (bare === omitted || (omitted === "1" && bare === "100%")) {
						return `${out}()`;
					}
				}
				const reduced = _reduceTransformFunctionDeep(fn, inner);
				if (reduced !== null) return reduced;
				// The stops are folded over what dropping the direction leaves, a
				// gradient carrying both otherwise keeping whichever ran second.
				const gradient = _dropDefaultGradientDirection(fn, inner);
				const stops = _foldGradientStops(
					fn,
					gradient === null ? inner : gradient,
					_doublePositionAllowed
				);
				if (stops !== null) return `${out}(${stops})`;
				if (gradient !== null) return `${out}(${gradient})`;
			}
			// A zero angle needs no unit where the grammar names `<zero>` beside
			// `<angle>` (CSS Transforms 2, Filter Effects 1).
			if (
				path.inValue() &&
				!_inSubstitutedValue &&
				_transforms.shortenNumbers &&
				ZERO_ANGLE_FUNCTIONS.has(fn)
			) {
				const bare = inner.replace(_ZERO_ANGLE_ARGUMENT_RE, "$10");
				if (bare !== inner) return `${out}(${bare})`;
			}
			const url = _inSubstitutedValue ? null : _minifyUrlFunction(fn, inner);
			if (url !== null) return url;
			return `${out}(${inner})`;
		}
		case T_URL: {
			const raw = path.source();
			// Closed at EOF: write the `)` back so the url stops where it stopped for
			// the tokenizer rather than swallowing what the printer emits next.
			if (_isUnterminatedUrl(raw)) return _terminate(raw, ")", "\uFFFD");
			// The tokenizer already trimmed the url-token's content, so the padding in
			// `url(  a.png  )` carries nothing.
			if (!minify) return raw;
			const open = raw.indexOf("(");
			// `url` matches ASCII case-insensitively like any other function name.
			// Read in place: cutting the name out to fold it would allocate on every
			// url, and every url but a shouted one folds to itself. Inside a
			// substituted value the spelling is the author's, so nothing is read.
			let head = null;
			if (!_inSubstitutedValue) {
				for (let i = 0; i < open; i++) {
					const c = raw.charCodeAt(i);
					if (c >= CC_UPPER_A && c <= CC_UPPER_Z) {
						head = asciiLowerCaseName(raw.slice(0, open + 1));
						break;
					}
				}
			}
			const percent = raw.includes("%");
			// Ahead of the padding fast path below: a base64 `data:` url is
			// whitespace-free and `%`-free, so it would take it and never be offered.
			if (_deferEmbeddedSource !== undefined) {
				const opener = head === null ? raw.slice(0, open + 1) : head;
				const deferred = _deferDataUrl(
					path.value(),
					(url) => `${opener}${_serializeUrl(url, '"')})`,
					raw
				);
				if (deferred !== null) return deferred;
			}
			if (_renderEmbeddedSource !== undefined) {
				const renderedUrl = _renderDataUrl(path.value());
				if (renderedUrl !== null) {
					const name = head === null ? raw.slice(0, open + 1) : head;
					return `${name}${_serializeUrl(renderedUrl, '"')})`;
				}
			}
			// Padding only exists when the content is whitespace-bounded; checking
			// that costs two char reads, reading the content costs a slice.
			if (
				!percent &&
				!_isWhiteSpace(raw.charCodeAt(open + 1)) &&
				!_isWhiteSpace(raw.charCodeAt(raw.length - 2))
			) {
				return head === null ? raw : head + raw.slice(open + 1);
			}
			if (head === null) head = raw.slice(0, open + 1);
			const value = path.value();
			// A url-token already carrying an escape is one this printer did not
			// write, so its `\%` is not read as the start of a percent-escape.
			return `${head}${
				percent && !value.includes("\\")
					? _decodePercentEscapes(value, true, "")
					: value
			})`;
		}
		case T_STRING: {
			const raw = path.source();
			// A custom property hands its string back as written, quotes included.
			if (!minify || _inCustomProperty) {
				// Closed at EOF: write the quote back, for the same reason as `url()`.
				return _isClosedString(raw) ? raw : _terminate(raw, raw[0], "");
			}
			// `<family-name>` is `<string> | <custom-ident>+`, so a family whose text
			// is a run of identifiers means the same unquoted, two bytes shorter. An
			// unterminated string is no family name, so it skips to the repair below.
			if (
				_isClosedString(raw) &&
				!_inSupportsPrelude &&
				!_inSubstitutedValue &&
				_inFontFamily() &&
				_isLoneFamilyName(path)
			) {
				const unquoted = _unquoteFontFamily(raw);
				if (unquoted !== null) return unquoted;
			}
			const text = _minifyString(raw);
			// Closed at EOF: write the quote back, for the same reason as `url()`.
			return _isClosedString(text) ? text : _terminate(text, text[0], "");
		}
		case T_IDENT: {
			const raw = path.source();
			if (!minify) return raw;
			// `transparent` is `#0000` where the target reads a hex alpha — the same
			// color, six bytes shorter. The tap-highlight guard still holds: that
			// WebKit bug is about the keyword's *value*, whichever way it is spelled.
			if (
				path.inValue() &&
				!_inSubstitutedValue &&
				_hexAlphaAllowed &&
				_transforms.shortenColors &&
				equalsLowerCase(raw, "transparent") &&
				!_inTapHighlightColor()
			) {
				return "#0000";
			}
			if (
				path.inValue() &&
				!_inCustomProperty &&
				!_inSupportsPrelude &&
				!_inSubstitutedValue
			) {
				// One fold for both questions below. `toLowerCaseIfNeeded` hands back
				// the string it was given where nothing changes, so a value written
				// in one case answers the second by identity and is never walked a
				// second time — which is every identifier in a stylesheet a build
				// step wrote.
				const lowered = toLowerCaseIfNeeded(raw);
				// A named color where the property takes nothing else an identifier
				// could be: `white` is `#fff`, and the engine computes both to
				// `rgb(255, 255, 255)`. Elsewhere an identifier may be the author's
				// own name.
				if (_transforms.shortenColors) {
					const shorter = COLOR_NAME_TO_SHORTEST.get(lowered);
					if (shorter !== undefined && _inColorOnlyProperty()) return shorter;
				}
				// A property whose value is keywords alone — or a color, which is
				// keywords and numbers — names nothing of the author's, so an
				// identifier standing directly in one of its values is a keyword and
				// matches ASCII case-insensitively. Directly only: a call's arguments
				// are read against the function's own grammar, where a name may be
				// the author's.
				if (
					lowered !== raw &&
					path.parent === _valueDeclaration &&
					_inKeywordOnlyValue()
				) {
					const folded = asciiLowerCaseName(raw);
					if (folded !== raw) return folded;
				}
			}
			return _minifyIdentEscapes(raw);
		}
		case T_SIMPLE_BLOCK: {
			const open = path.blockToken();
			const close = open === "(" ? ")" : open === "[" ? "]" : "}";
			// Outside a declaration value a `[…]` is an attribute selector, whose
			// quoted value may be a bare identifier, and a `(…)` is a query condition,
			// whose comparisons need no whitespace. Inside one they are a grid
			// line-name list and a `calc()` sub-expression, where neither holds.
			const structural = minify && !path.inValue();
			/** @type {string[]} */
			let parts;
			if (structural && open === "[") {
				parts = _printAttributeSelector(path, path.children(), writer);
			} else {
				// One array, rather than a child list and a mapped copy of it.
				parts = [];
				_appendChildTexts(path.node, writer, parts);
			}
			if (structural && open === "(" && _inMediaConditionPrelude) {
				_lowercaseConditionParts(parts);
				if (_rangeSpellingAllowed) _useRangeSpelling(parts);
			}
			let trim =
				minify && _mathFunctionDepth !== 0 ? _TRIM_MATH : _TRIM_NOTHING;
			if (structural && open === "(") {
				// `@scope`'s parentheses hold selector lists, so a `:` there starts a
				// pseudo-class and the whitespace before it is a descendant combinator
				// — `@scope (div :hover)` is not `@scope (div:hover)`.
				trim = _inScopePrelude(path) ? _TRIM_COMBINATORS : _TRIM_CONDITIONS;
				if (trim === _TRIM_COMBINATORS) _foldPseudoNames(parts);
			}
			const inner = _join(parts, !minify, trim);
			return `${open}${inner}${close}`;
		}
		case T_DECLARATION: {
			const name = path.name();
			// Counted rather than listed: a declaration's value is one component 92
			// times in 100, and the list would be built only to be indexed twice.
			const count = path.childCount();
			// `@property`'s `initial-value` is read against the sibling `syntax`
			// descriptor, so it is as opaque as a custom property's own value.
			const custom =
				name.startsWith("--") ||
				(_inPropertyRule && equalsLowerCase(name, "initial-value")) ||
				// `@function`'s `result` is the token stream the call substitutes, so
				// it is opaque the same way — and empty when the function returns the
				// guaranteed-invalid value.
				(_inFunctionRule && equalsLowerCase(name, "result")) ||
				// A `{}` block standing as the whole value is a token stream the
				// engine holds as written too — no grammar reads it, so a rewrite of
				// it builds a different CSSOM from the same document.
				(count === 1 &&
					path.type(path.childAt(path.node, 0)) === T_SIMPLE_BLOCK &&
					path.blockToken(path.childAt(path.node, 0)) === "{");
			// A value-less declaration is invalid, so it is already ignored — except
			// on a custom property, where the empty value is the guaranteed-invalid
			// one a `var()` fallback reads.
			if (minify && _transforms.removeDeadRules && count === 0 && !custom) {
				return "";
			}
			// The name folded to lowercase, where the value below needed it; `name`
			// itself where it did not, which is what the printed name reads as
			// "nothing to fold".
			let lowered = name;
			let value = "";
			if (count !== 0) {
				// Property names match ASCII case-insensitively; a custom property's
				// does not, and skipping it also skips the lowercasing.
				// One fold of the name for both jobs: which value rules apply, and how
				// the name is printed. `toLowerCaseIfNeeded` hands back the string it
				// was given where nothing changes, so an already-lowercase name says
				// so by identity and needs no second walk.
				lowered = custom ? name : toLowerCaseIfNeeded(name);
				const property = custom ? name : _standardSpelling(lowered);
				if (custom) {
					// `getPropertyValue()` hands this text back, so a rewritten token
					// would be a different CSSOM; only the boundaries between them go.
					const from = path.start(path.childAt(path.node, 0));
					const to = path.end(path.childAt(path.node, count - 1));
					if (minify) {
						value = _customPropertyValue(
							path,
							path.children(),
							writer,
							from,
							to
						);
					} else {
						// Straight from source, so the kept comments in it are already
						// there — claim them, or the writer emits them a second time
						// ahead of the next top-level node.
						writer.takeInserts(from, to);
						value = _input.slice(from, to);
					}
				} else if (property === "unicode-range") {
					// `U+…` tokenizes as numbers, so the generic numeric normalization
					// would corrupt it; each range is shortened as the urange it is.
					let raw = "";
					for (let at = 0; at < count; at++) {
						raw += path.source(path.childAt(path.node, at));
					}
					value = minify
						? raw
								.split(",")
								.map((one) => _minifyUnicodeRange(one.trim()))
								.join(",")
						: raw;
				} else {
					// Value hashes were already shortened by the hash printer (they print
					// in a value context); just join the children's printed text.
					// A shorthand whose value repeats what the notation already implies
					// collapses; anything else prints as its children joined.
					const shorthand = minify
						? _collapseShorthand(path, property, path.node, writer)
						: null;
					if (shorthand === null && count === 1) {
						// What a value is 98 times in 100, and `_join` hands a lone
						// fragment straight back — so it is rewritten without an array.
						// §5.4.6 step 7 pops a trailing whitespace token, so a value's
						// lone child is never the one `_join` would answer `""` for.
						value = _valueFragment(
							writer.get(path.childAt(path.node, 0)),
							property,
							minify
						);
					} else {
						/** @type {string[]} */
						let fragments;
						if (shorthand === null) {
							fragments = [];
							_appendChildTexts(path.node, writer, fragments);
						} else {
							fragments = shorthand;
						}
						// In place: a `map` per transform would allocate an array each.
						for (let i = 0; i < fragments.length; i++) {
							fragments[i] = _valueFragment(fragments[i], property, minify);
						}
						// A substituted value is handed back as written, and the string
						// transforms below read space-separated components, so only a
						// value neither covers loses the separators its tokens do not
						// need.
						const separatorsOnly =
							minify &&
							!AUTO_SECOND_VALUE_PROPERTIES.has(property) &&
							!ALPHA_VALUE_PROPERTIES.has(property) &&
							!RATIO_PROPERTIES.has(property) &&
							!_hasSubstitutionInSpan(
								path.start(path.node),
								path.end(path.node)
							);
						value = _join(
							fragments,
							!minify,
							separatorsOnly ? _TRIM_SEPARATORS : _TRIM_NOTHING
						);
					}
					if (minify) {
						value = _dropDefaultSecondValue(property, value);
						value = _numberAlphaValue(property, value);
						value = _dropRatioDenominator(property, value);
					}
				}
			}
			const important = path.important() ? `${soft}!important` : "";
			// Property names match ASCII case-insensitively; a custom property's
			// does not, which is what `custom` already stands for — nor does an
			// `@font-feature-values` sub-rule's, which names a feature value.
			const printedName =
				minify && !custom && !_inFeatureValuesRule && lowered !== name
					? asciiLowerCaseName(name)
					: name;
			return `${printedName}:${soft}${value}${important};`;
		}
		case T_AT_RULE:
		case T_QUALIFIED_RULE: {
			// Prefixing reads the prelude's tokens, not its joined text.
			const preludeParts = _prefixingOn
				? /** @type {string[]} */ ([])
				: undefined;
			const prelude = _rulePrelude(path, writer, minify, preludeParts);
			const decls = path.declarations();
			// A qualified rule always has a block; an at-rule has one only when its
			// declaration list is non-null — else it is `@…;`.
			if (decls === null) {
				if (minify) _blockSpans.push(_NO_BLOCK_ENTRY);
				return `${prelude};`;
			}
			const rules = path.childRules();
			// `nl` prefixes each item: nothing minifying, a line break beautifying
			// (declarations end in `;`, rules don't).
			const nl = minify ? "" : "\n";
			const {
				body,
				items,
				texts,
				superseded,
				droppedPrefix,
				addedPrefix,
				deadPrefixed,
				spans
			} = _composeBlockBody(
				path,
				decls,
				rules,
				writer,
				minify,
				nl,
				_currentNode
			);
			if (
				minify && // An empty rule paints nothing, so dropping it leaves the cascade as it
				// was — but only where the block itself carries no meaning (see
				// `DROPPABLE_WHEN_EMPTY_AT_RULES`).

				body.length === 0 &&
				// See `_streamClose`: a rule taken out while a `@namespace` after it
				// could still be read would move one up into a live position.
				!(path.parent === null && _namespacePrologueOpen) &&
				(path.type() === T_QUALIFIED_RULE ||
					DROPPABLE_WHEN_EMPTY_AT_RULES.has(path.name().toLowerCase()))
			) {
				_blockSpans.push(_NO_BLOCK_ENTRY);
				return "";
			}
			const text = `${prelude}${soft}{${body}${nl}}`;
			// Prefix copies turn one rule into several, so a rewritten rule is not
			// offered for joining — its text no longer describes a single block.
			// Each block's rules are their own siblings, so a nested `@keyframes` or
			// pseudo pairs with the twin in its own scope and never one outside it.
			// Declarations are prefixed above.
			let out = text;
			if (_prefixingOn) {
				// Read and clear here, so the lookahead is the one rule the writer
				// holds — which only a top-level rule ever is — and never a rule
				// further back.
				const parent = path.parent;
				const top = parent === null;
				const scope = _prefixScope(parent);
				out =
					path.type() === T_AT_RULE
						? _prefixAtRule(path, text, prelude, scope, top)
						: _prefixQualifiedRule(
								text,
								/** @type {string[]} */ (preludeParts),
								soft,
								body,
								scope,
								top
							);
			}
			// Pushed whatever it holds: the parent takes one off for every child
			// with a body, so a block that carries no rule still has to be there.
			// A rewritten rule records no nesting — those spans name `text`, not
			// `out` — but it is still the one rule its own text says it is.
			// Only a block that recorded something needs an entry of its own; a leaf
			// rule is the shared one. Nothing is pushed at all while not minifying,
			// where nothing reads them.
			if (minify) {
				_blockSpans.push(
					spans === null || out !== text
						? path.type() === T_QUALIFIED_RULE
							? _NO_BLOCK_ENTRY_QUALIFIED
							: _NO_BLOCK_ENTRY
						: {
								bodyAt: prelude.length + soft.length + 1,
								prelude,
								keyPrelude: _openerKey(`${prelude}{`),
								qualified: path.type() === T_QUALIFIED_RULE,
								spans
							}
				);
			}
			if (out !== text) return out;
			// Where the block is what a sibling is compared against, remember the
			// rule so the parent parts it without re-scanning for the `{`. An
			// at-rule remembers the entries its block is made of too, so a sibling
			// block's rules can join the ones they come to stand beside.
			if (
				minify &&
				path.type() === T_AT_RULE &&
				MERGEABLE_AT_RULES.has(path.name().toLowerCase())
			) {
				/** @type {RuleEntry[]} */
				const children = [];
				for (let i = 0; i < texts.length; i++) {
					if (texts[i].length === 0) continue;
					if (superseded !== null && superseded.has(i)) continue;
					// The entries have to spell the block this rule printed, prefixes
					// and all: a join rebuilds the body from them, and one built from
					// the unprefixed texts would put back what was dropped and lose
					// what was added.
					if (droppedPrefix !== null && droppedPrefix.has(i)) continue;
					if (deadPrefixed !== null && deadPrefixed.has(items[i])) continue;
					const added = addedPrefix === null ? undefined : addedPrefix.get(i);
					children.push(
						added === undefined
							? _ruleEntryOf(items[i], texts[i])
							: _opaqueEntry(added + texts[i])
					);
				}
				let head = "";
				for (let i = 0; i < children.length - 1; i++) head += children[i].text;
				_ruleEntry.set(_currentNode, {
					text,
					prelude: prelude.length,
					atRule: true,
					plain: false,
					listable: LIST_NO,
					listKind: LIST_KIND_SELECTOR,
					children,
					head
				});
			}
			if (minify && path.type() === T_QUALIFIED_RULE) {
				// Only a block of declarations lends its selectors to another's list: a
				// nested rule's `&` stands for the whole list, and `:is(…)` takes the
				// specificity of its most specific selector, so joining the preludes
				// would move what the nested rules beat.
				const plain = rules === null || rules.length === 0;
				const parent = path.parent;
				// Which shape a join would read the prelude with — the parent is gone by
				// then. A keyframe selector is a list of its own shape, which
				// `_rulePrelude` has already rewritten `from` in.
				let listKind = LIST_KIND_SELECTOR;
				if (parent !== null) {
					const parentType = path.type(parent);
					if (parentType === T_QUALIFIED_RULE) {
						listKind = LIST_KIND_NESTED;
					} else if (
						parentType === T_AT_RULE &&
						KEYFRAMES_AT_RULE_RE.test(path.name(parent))
					) {
						listKind = LIST_KIND_KEYFRAME;
					}
				}
				_ruleEntry.set(_currentNode, {
					text,
					prelude: prelude.length,
					atRule: false,
					plain,
					listable: plain ? LIST_UNKNOWN : LIST_NO,
					listKind,
					children: null,
					head: ""
				});
			}
			return text;
		}
		case T_RAW:
			// Off-spec passthrough (see `NodeType.Raw`). It sits in a declaration
			// list, so it carries the `;` separating it from the next item (stripped
			// again before a `}`).
			// Its parent counts it among its children, so it leaves the entry saying
			// it carries no rule — without one, the rules after it read the next's.
			if (minify) _blockSpans.push(_NO_BLOCK_ENTRY);
			{
				const raw = path.source();
				// A comment the source never closed swallows the separator written
				// after it, so the next parse reads a longer one. §4.3.2, via the parse.
				const open =
					_openCommentStart !== -1 &&
					_input.length - raw.length <= _openCommentStart &&
					_input.endsWith(raw);
				return `${raw}${open ? "*/" : ""};`;
			}
		case T_HASH: {
			const raw = path.source();
			if (!minify) return raw;
			// A hash is a hex color only in a value (`color:#abc`), an id in a selector
			// (`#Abc{}`, `:not(#Abc)`) — ids are case-sensitive, so shorten only the
			// former. Works at any value depth (e.g. inside a gradient). An id still
			// gets its escapes shortened; the `#` is held back so the name's first code
			// point is judged as first.
			if (!path.inValue()) return `#${_minifyIdentEscapes(raw.slice(1))}`;
			// Inside a function, only known color functions take color hashes —
			// and a substitution's fallback, which is not the function's own
			// argument but the property's value, so a hash there is as much a color
			// as one written in place. `paint()` is the exception among them: its
			// arguments reach a worklet rather than a declaration.
			const parent = path.parent;
			if (parent !== null && path.type(parent) === T_FUNCTION) {
				const fn = path.name(parent).toLowerCase();
				if (
					!COLOR_ARGUMENT_FUNCTIONS.has(fn) &&
					!(SUBSTITUTION_FUNCTIONS.has(fn) && fn !== "paint")
				) {
					return raw;
				}
			}
			const short = _minifyHash(raw);
			return short === null ? raw : short;
		}
		default:
			// Any remaining leaf token (ident, string, url, delim, …) prints verbatim
			// from its source slice.
			return path.source();
	}
};

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

/* eslint-disable jsdoc/require-template -- `A` below is the accessor const, not a type parameter */
/**
 * The CSS path (Babel's `path` shape): the AST accessor with the walk's
 * current position on it — the single argument every visitor receives.
 * @typedef {typeof A} CssPath
 */
/* eslint-enable jsdoc/require-template */

/**
 * Append the printed text of every child of `n` to `out`, in order — read where
 * the child list lies rather than materialized into a list of its own first.
 * @param {Node} n the node
 * @param {PrintContext} writer the print context (children's printed text)
 * @param {string[]} out the array to append to
 */
const _appendChildTexts = (n, writer, out) => {
	const i = _nodeIndex(n);
	const start = _listStarts[i];
	const len = _listLens[i];
	for (let k = 0; k < len; k++) {
		out.push(writer.get(_nodeRef(_flat[start + k])));
	}
};

// A fresh (safely retainable) array view of a node's flat content span —
// visitors that read `A.children` / `A.prelude` may keep the result.
/** @type {(n: Node) => Node[]} */
const _materializeList = (n) => {
	const i = _nodeIndex(n);
	const start = _listStarts[i];
	const len = _listLens[i];
	/** @type {Node[]} */
	const out = [];
	for (let k = 0; k < len; k++) out.push(_nodeRef(_flat[start + k]));
	return out;
};

// Babel's `path.skip()`, children-only: set by `A.skipChildren()` during an
// `enter` dispatch, consumed by the walk.
let _walkSkip = false;
// The walk's current position (`A.node` / `A.parent` read these; module-level
// so the accessor methods' defaults avoid self-referential `this` typing).
/** @type {Node} */
let _currentNode = /** @type {Node} */ (/** @type {unknown} */ (0));
/** @type {Node | null} */
let _currentParent = null;
// Index of the current node within its sibling list (a rule body's declarations
// and child rules are separate lists, so each indexes from 0 independently).
let _currentIndex = 0;
// Set by the walk while inside a declaration's value (`A.inValue()`): a hash there
// is a color, elsewhere (a selector prelude) it is an id — the color-safety seam.
let _inValue = false;
// The declaration `_inKeywordOnlyValue` last answered for, and its answer: one
// value's identifiers all ask it, and the read is a pointer compare after the
// first. Cleared with the rest of the parse state, so no node outlives it.
/** @type {Node | null} */
let _keywordOnlyFor = null;
let _keywordOnly = false;
// Set by the walk while inside a `@supports` prelude: the declaration there is
// the subject of a feature test, so a value rewrite would change the question.
let _inSupportsPrelude = false;
// Set by the walk while inside a `@media` / `@container` prelude, where a `(…)`
// is a media feature rather than a declaration or a selector list.
let _inMediaConditionPrelude = false;
// Set by the walk while inside an `@property` body, where `initial-value` is
// typed by the sibling `syntax` descriptor rather than by any grammar webpack
// reads — so no rewrite of it can be known to still match.
let _inPropertyRule = false;
// Set by the walk while inside an `@function` body, where `result` carries the
// token stream the call substitutes — as opaque as a custom property's value,
// and empty on purpose when the function returns the guaranteed-invalid one.
let _inFunctionRule = false;
// Set by the walk while inside an `@font-feature-values` body, where each
// sub-rule's declaration names are `<custom-ident>` feature values — so they are
// case-sensitive, and two spellings of one name are two distinct entries.
let _inFeatureValuesRule = false;
// Set by the walk while inside a custom property's value. Its tokens are
// squeezed, but a rewrite that restates a value in another notation is held
// back: `getPropertyValue()` hands this text back, so a color stays as written.
let _inCustomProperty = false;
// Off, that verbatim rule stands; on, a custom property's tokens print like any
// other value's and `getPropertyValue()` hands back the rewritten text.
let _rewriteCustomProperties = false;
let _inSubstitutedValue = false;

// Whether the value being printed sits inside a gradient. A stop in a space
// other than sRGB is echoed there rather than computed, and where the gradient
// names the space its stops interpolate in, converting one through sRGB maps it
// back as a different point — so the ramp is not the one the source paints.
let _inGradient = false;
// How many math functions the walk is inside. Non-zero is where `*` and `/` are
// operators that need no whitespace rather than value separators; above one is
// where a folded term is an operand of an outer expression rather than a value.
let _mathFunctionDepth = 0;
// How many stepped-value functions the walk is inside. Everything below one
// keeps the unit it was written with, folds included.
let _steppedFunctionDepth = 0;
// Whether a length may be rewritten into a shorter unit it is exactly equal in.
// Off by default: the rewrite is sound — CSS Values 4 fixes the absolute units
// against each other, so `1pc` is `16px` on every medium — but it fires ~10
// times in all of Bootstrap and costs bytes as often as it saves them once the
// asset is compressed. `cssnano` disables the same rewrite in its default
// preset. Time (`ms` <-> `s`) is not gated: it is uncontested and every
// minifier does it.
let _convertLengthUnits = false;
// Which rewrites this print makes. One object rather than a flag apiece: it is
// read straight off the options, and a fixed shape keeps each read monomorphic.
/** @type {Required<CssTransformOptions>} */
let _transforms = _DEFAULT_TRANSFORMS;
// Which comments this print keeps, with a pattern already compiled to the
// predicate it stands for — `true` every one, `false` none, `"some"` the ones
// that carry something (see `_isKeptComment`).
/** @type {boolean | "some" | ((comment: string) => boolean)} */
let _commentsKept = "some";
/** @type {Map<string, [string, number]>} */
let _unitScale = ABSOLUTE_UNIT_SCALE;

// Where a `block-contents` print holds its top-level nodes instead of emitting
// them one by one: that production is a declaration list, and the list-wide
// transforms need the whole list. Null for a stylesheet, which streams.
/** @type {(Rule | Declaration)[] | null} */
let _blockContentsNodes = null;

// The caller's renderer for source this stylesheet embeds, set per print.
/** @type {EmbeddedSourceRenderer | undefined} */
let _renderEmbeddedSource;

// Where an asynchronous caller's embedded sources are recorded instead of
// rendered, set per print. Each entry carries the text to print once the answer
// is in, so the `url()` around it is spelled from what it actually holds.
/** @type {DeferredEmbeddedSource[] | undefined} */
let _deferEmbeddedSource;

const _CSS_STRING_ESCAPE_RE = /[\\\n]/g;

/**
 * Spell a rebuilt URL so it parses back to itself: as a url-token when it can
 * be one, otherwise quoted with the delimiter and its escapes written out.
 * @param {string} url the URL to spell
 * @param {string} mark the quote to use when it needs one
 * @returns {string} the `url()` argument
 */
const _serializeUrl = (url, mark) => {
	// Both spellings below the quoted one are the unquoting `transforms.quotes`
	// names, so off they are not this printer's to pick: a rendered payload has
	// no authored quoting left to keep, and the quotes carry any of it.
	if (_transforms.normalizeQuotes) {
		if (!_UNQUOTABLE_URL_RE.test(url)) return url;
		const escaped = _escapeUrlBody(url);
		if (escaped !== null) return escaped;
	}
	return (
		mark +
		url.replace(_CSS_STRING_ESCAPE_RE, "\\$&").split(mark).join(`\\${mark}`) +
		mark
	);
};

/**
 * Record a url's `data:` payload for an asynchronous caller and print the
 * marker standing in for it, or `null` when there is nothing to offer. `build`
 * spells the whole `url()` from the answer, so its quoting is decided by what
 * the payload turns out to be rather than by what it was.
 * @param {string} body the url body, unquoted and unescaped
 * @param {(url: string) => string} build the `url()` text around a rebuilt URL
 * @param {string} fallback the text to print when the caller declines
 * @returns {string | null} the marker to print, or null when nothing is offered
 */
const _deferDataUrl = (body, build, fallback) => {
	const read = _readDataUrl(body);
	if (read === null) return null;
	const holes = /** @type {DeferredEmbeddedSource[]} */ (_deferEmbeddedSource);
	const id = holes.length;
	holes.push({
		type: read.type,
		hostType: CSS_TYPE,
		source: read.payload,
		build: (rendered) =>
			typeof rendered !== "string" || rendered === read.payload
				? fallback
				: build(buildDataURI(read.parsed, rendered))
	});
	return deferredWrite(id);
};

/**
 * Read a url's `data:` payload out, for a caller that will render it. `null`
 * when there is nothing to offer — not a data URL, a media type naming no
 * language webpack knows, or a payload that would not round-trip.
 * @param {string} url the url body, unquoted and unescaped
 * @returns {{ parsed: import("../util/dataURL").ParsedDataURI, type: string, payload: string } | null} what it holds, or null
 */
const _readDataUrl = (url) => {
	// Char-code gate so the dominant non-`data:` url costs one read.
	if ((url.charCodeAt(0) | 0x20) !== CC_LOWER_D) return null;
	// A CSS escape is still written here — the quoted form is percent-decoded,
	// not unescaped — so the payload would be read with its backslashes in it.
	if (url.includes("\\")) return null;
	const parsed = parseDataURI(url);
	if (parsed === null) return null;
	const type = languageOfMediaType(parsed.mediaType);
	if (type === undefined) return null;
	const payload = decodeDataURIPayload(parsed);
	if (payload === null || payload === "") return null;
	return { parsed, type, payload };
};

/**
 * Offer a url's `data:` payload to the renderer, and rebuild the URL around
 * what comes back. `null` when nothing should change — not a data URL, a media
 * type naming no language webpack knows, a payload that would not round-trip,
 * or a renderer that declined.
 * @param {string} url the url body, unquoted and unescaped
 * @returns {string | null} the rebuilt URL, or null to emit the original
 */
const _renderDataUrl = (url) => {
	if (_renderEmbeddedSource === undefined) return null;
	const read = _readDataUrl(url);
	if (read === null) return null;
	let rendered;
	try {
		rendered = _renderEmbeddedSource(read.payload, {
			type: read.type,
			hostType: CSS_TYPE
		});
	} catch (_err) {
		return null;
	}
	// Anything but text is a renderer that did not answer, not a payload to write.
	if (typeof rendered !== "string" || rendered === read.payload) return null;
	return buildDataURI(read.parsed, rendered);
};
// What the target can read, from `output.environment` — resolved once per run
// rather than per color. Unset means it can: only browserslist reports otherwise.
let _hexAlphaAllowed = true;
let _doublePositionAllowed = true;
// CSS Position 3 added `inset` long after the four longhands it merges, CSS 1.
let _insetShorthandAllowed = true;
let _rangeSpellingAllowed = true;
// CSS Box Alignment 3's `place-*`, newer than the `align-*` / `justify-*` pairs.
let _placeShorthandAllowed = true;

// Set when the source names one at all, so a stylesheet without any pays a
// single scan and keeps nothing.
// Could name `@namespace`: the spelling, or any escaped at-keyword only decoding
// tells apart. Over-wide on purpose — a false positive keeps an empty rule.
const NAMESPACE_AT_RULE_RE = /@namespace|@[\w-]*\\/i;

// Whether a top-level `@namespace` could still be read here. Only a rule the
// engine keeps closes the run one may stand in (CSS Namespaces 3 §3.1) — an
// unknown at-rule is thrown away and does not — so only a qualified rule, which
// every engine keeps, closes it. Empty or not, a rule dropped while this is open
// would carry a dead `@namespace` after it back to the head and bring it to life.
let _namespacePrologueOpen = false;
// Whether the target reads `overflow`'s two-value form (`overflow:auto hidden`),
// which is newer than the longhands it merges.
let _overflowTwoValuesAllowed = true;
// The declaration whose value is being walked, for the printer's property-scoped
// guards; only tracked while printing, and read lazily (naming it costs a slice).
/** @type {Node | null} */
let _valueDeclaration = null;

// AST field-access seam. Every AST-node field read by `CssParser` goes through
// one of these accessors (`n` is an integer node id into the columns), so
// the storage stays behind the accessor without any consumer edit. `value` is
// the leaf-token string; container child lists are `children` / `prelude` /
// `declarations` / `childRules`.
const A = {
	// === path position (rebound by the walk before every visitor call) ===
	/**
	 * @returns {Node} current node — only valid during a visitor callback
	 */
	get node() {
		return _currentNode;
	},
	/**
	 * @returns {Node | null} enclosing node (null = a top-level node)
	 */
	get parent() {
		return _currentParent;
	},
	/**
	 * @returns {number} index of the current node within its sibling list (0 for a top-level node) — only valid during a visitor callback
	 */
	get index() {
		return _currentIndex;
	},
	/** Stop the walk descending into the current node (enter only). */
	skipChildren() {
		_walkSkip = true;
	},
	/**
	 * @returns {boolean} true when the current node is inside a declaration's value
	 * (a hash there is a color); false in a selector prelude (a hash is an id)
	 */
	inValue() {
		return _inValue;
	},
	// === field reads — `n` defaults to the current node ===
	/**
	 * @param {Node=} n node
	 * @returns {number} node type
	 */
	type(n = _currentNode) {
		return _types[_nodeIndex(n)];
	},
	/**
	 * @param {Node=} n node
	 * @returns {number} start offset
	 */
	start(n = _currentNode) {
		return _starts[_nodeIndex(n)];
	},
	/**
	 * @param {Node=} n node
	 * @returns {number} end offset
	 */
	end(n = _currentNode) {
		return _ends[_nodeIndex(n)];
	},
	/**
	 * @param {Node=} n node
	 * @returns {[number, number]} start / end offsets
	 */
	range(n = _currentNode) {
		const i = _nodeIndex(n);
		return [_starts[i], _ends[i]];
	},
	/**
	 * @param {Node=} n node
	 * @returns {{ start: { line: number, column: number }, end: { line: number, column: number } }} source location
	 */
	loc(n = _currentNode) {
		const i = _nodeIndex(n);
		const lc = _locConverter;
		const s = lc.get(_starts[i]);
		const sl = s.line;
		const sc = s.column;
		const e = lc.get(_ends[i]);
		return {
			start: { line: sl, column: sc },
			end: { line: e.line, column: e.column }
		};
	},
	/**
	 * @param {Node=} n node
	 * @returns {string} the node's source slice — as written, but for an escape
	 * the input ran out of, which is the character it names rather than the `\`
	 * that spells it (§4.3.5 inside a string, §4.3.7 anywhere else)
	 */
	source(n = _currentNode) {
		const i = _nodeIndex(n);
		const end = _ends[i];
		const text = _input.slice(_starts[i], end);
		if (end !== _input.length || !_endsInLoneEscape(text)) return text;
		// The escape the input ran out of names nothing inside a string (§4.3.5)
		// and the replacement character anywhere else (§4.3.7) — either way not
		// the `\` the source shows, which would escape what the printer adds next.
		return _types[i] === T_STRING
			? text.slice(0, -1)
			: `${text.slice(0, -1)}\uFFFD`;
	},
	/**
	 * @param {Node=} n node
	 * @returns {string} raw token value
	 */
	value(n = _currentNode) {
		return _valueOf(_nodeIndex(n));
	},
	/**
	 * @param {Node=} n node
	 * @returns {string} unescaped token value
	 */
	unescaped(n = _currentNode) {
		const i = _nodeIndex(n);
		const v = _valueOf(i);
		if (_types[i] !== T_STRING) return unescapeIdentifier(v);
		// §4.3.5 returns the token at end of input too, and that one has no closing
		// quote to take off — nor does one an odd run of backslashes escaped.
		let end = v.length;
		if (end > 1 && v.charCodeAt(end - 1) === v.charCodeAt(0)) {
			let slashes = 0;
			while (end - 2 - slashes >= 1 && v.charCodeAt(end - 2 - slashes) === 92) {
				slashes++;
			}
			if (slashes % 2 === 0) end--;
		}
		return unescapeIdentifier(v.slice(1, end));
	},
	/**
	 * @param {Node=} n node
	 * @returns {string} hash / numeric type flag
	 */
	typeFlag(n = _currentNode) {
		const i = _nodeIndex(n);
		if (_types[i] === T_HASH) {
			const input = _input;
			const p = _starts[i] + 1;
			return _ifThreeCodePointsWouldStartAnIdentSequence(
				input,
				p,
				input.charCodeAt(p),
				input.charCodeAt(p + 1),
				input.charCodeAt(p + 2)
			)
				? "id"
				: "unrestricted";
		}
		const v = _valueOf(i);
		return _typeFlagOf(
			_types[i] === T_DIMENSION ? v.slice(0, _consumeANumber(v, 0)) : v
		);
	},
	/**
	 * @param {Node=} n node
	 * @returns {number} url content start offset
	 */
	contentStart(n = _currentNode) {
		return _aux0[_nodeIndex(n)];
	},
	/**
	 * @param {Node=} n node
	 * @returns {number} url content end offset
	 */
	contentEnd(n = _currentNode) {
		return _aux1[_nodeIndex(n)];
	},
	/**
	 * @param {Node=} n node
	 * @returns {string} rule / declaration / function name
	 */
	name(n = _currentNode) {
		const i = _nodeIndex(n);
		return _types[i] === T_AT_RULE
			? _input.slice(_starts[i] + 1, _aux0[i])
			: _input.slice(_starts[i], _aux0[i]);
	},
	/**
	 * @param {Node=} n node
	 * @returns {number} name start offset
	 */
	nameStart(n = _currentNode) {
		return _starts[_nodeIndex(n)];
	},
	/**
	 * @param {Node=} n node
	 * @returns {number} name end offset
	 */
	nameEnd(n = _currentNode) {
		return _aux0[_nodeIndex(n)];
	},
	/**
	 * @param {Node=} n node
	 * @returns {string} unescaped name
	 */
	unescapedName(n = _currentNode) {
		return unescapeIdentifier(A.name(n));
	},
	/**
	 * @param {Node=} n node
	 * @returns {ComponentValue[]} function / block children
	 */
	children(n = _currentNode) {
		return /** @type {ComponentValue[]} */ (_materializeList(n));
	},
	/**
	 * @param {Node=} n node
	 * @returns {ComponentValue[]} rule prelude
	 */
	prelude(n = _currentNode) {
		return /** @type {ComponentValue[]} */ (_materializeList(n));
	},
	/**
	 * @param {Node=} n node
	 * @returns {number} number of children (value / prelude) without materializing the list
	 */
	childCount(n = _currentNode) {
		return _listLens[_nodeIndex(n)];
	},
	/**
	 * @param {Node} n node
	 * @param {number} i child index (`0 <= i < childCount(n)`)
	 * @returns {ComponentValue} i-th child (value / prelude) without materializing the list
	 */
	childAt(n, i) {
		return /** @type {ComponentValue} */ (
			_nodeRef(_flat[_listStarts[_nodeIndex(n)] + i])
		);
	},
	/**
	 * A block big enough to stream hands its children to the visitors as each one
	 * finishes rather than collecting them, so both lists read as an empty block
	 * on it — `null`, which means no block at all, is still only for the `@…;`
	 * forms. Read a block's children from the walk, not from here.
	 * @param {Node=} n node
	 * @returns {Declaration[] | null} block declarations
	 */
	declarations(n = _currentNode) {
		// `_makeContainer` only populates the body slot for rules; 0 means no
		// block, normalized to `null` to keep the documented contract.
		const bi = _bodyIdx[_nodeIndex(n)];
		return bi === 0 ? null : /** @type {Declaration[]} */ (_declBodies[bi - 1]);
	},
	/**
	 * Reads as an empty block on a streamed rule; see {@link declarations}.
	 * @param {Node=} n node
	 * @returns {Rule[] | null} block child rules
	 */
	childRules(n = _currentNode) {
		const bi = _bodyIdx[_nodeIndex(n)];
		return bi === 0 ? null : /** @type {Rule[]} */ (_ruleBodies[bi - 1]);
	},
	/**
	 * @param {Node=} n node
	 * @returns {number} block start offset
	 */
	blockStart(n = _currentNode) {
		return _aux1[_nodeIndex(n)];
	},
	/**
	 * @param {Node=} n node
	 * @returns {number} block end offset
	 */
	blockEnd(n = _currentNode) {
		const i = _nodeIndex(n);
		return _aux1[i] !== -1 ? _ends[i] : -1;
	},
	/**
	 * @param {Node=} n node
	 * @returns {boolean} `!important` flag
	 */
	important(n = _currentNode) {
		return (_flags[_nodeIndex(n)] & 1) !== 0;
	},
	/**
	 * @param {Node=} n node
	 * @returns {SimpleBlockToken} block opening token
	 */
	blockToken(n = _currentNode) {
		return /** @type {SimpleBlockToken} */ (_input[_starts[_nodeIndex(n)]]);
	},
	// Writers — `CssParser` rewrites a rule's end / block-end when it folds an
	// inline ICSS `:import` / `:export` body into a single dependency. A block
	// rule's `blockEnd` is its `end`, so `setBlockEnd` writes the same `end` slot.
	/**
	 * @param {Node} n node
	 * @param {number} v new end offset
	 */
	setEnd(n, v) {
		_ends[_nodeIndex(n)] = v;
	},
	/**
	 * @param {Node} n node
	 * @param {number} v new block end offset
	 */
	setBlockEnd(n, v) {
		_ends[_nodeIndex(n)] = v;
	}
};

// The AST node shapes (`Node`, `Token`, and the container typedefs) are types
// only — nodes are integer ids into the store, surfaced by the `A` visitor
// accessor and the `parseA*` readers. Runtime exports: the `A` accessor, the
// full CSS-Syntax-3 §5.3 `parseA*` entry-point surface, the `TokenStream` (so
// callers can pass a pre-built stream to any `parseA*`), and the `escape` /
// `unescapeIdentifier` string utils.
/**
 * Note where one child of a block lands in it. A qualified rule is one rule
 * whatever it nests, so it is a span of its own; an at-rule is a condition its
 * body is read under, so its own spans move in, its prelude joining their keys.
 * @param {RuleSpan[]} spans the block's spans, added to
 * @param {Node} item the child
 * @param {string} text the child's printed text
 * @param {number} at where the text lands in the block's body
 * @param {CssPath} path the accessor
 * @param {BlockSpans=} inner what the child recorded, when it has a body
 * @returns {void}
 */
const _collectRuleSpans = (spans, item, text, at, path, inner) => {
	// A qualified rule is one rule, and each rule it nests is another read under
	// it — the parent first, so a cut that takes the whole rule is seen before
	// anything inside it.
	if (path.type(item) === T_QUALIFIED_RULE) {
		spans.push({ scope: _rootScope(), key: text, at, len: text.length });
	}
	if (inner === undefined) return;
	const base = at + inner.bodyAt;
	for (const span of inner.spans) {
		spans.push({
			scope: _enclosingRuleScope(span.scope, inner.keyPrelude),
			key: span.key,
			at: base + span.at,
			len: span.len
		});
	}
};

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
