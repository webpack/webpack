/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const LocConverter = require("../util/LocConverter");
const GenericSourceProcessor = require("../util/SourceProcessor");
const { makeCacheable } = require("../util/identifier");

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
	// `url` case-insensitively (ASCII lower via `| 0x20`) without a
	// `slice().toLowerCase()` allocation per identifier; an escaped ident can't
	// be exactly 3 raw chars, so the length gate keeps this equivalent.
	if (
		pos - start === 3 &&
		(input.charCodeAt(start) | 0x20) === CC_LOWER_U &&
		(input.charCodeAt(start + 1) | 0x20) === CC_LOWER_R &&
		(input.charCodeAt(start + 2) | 0x20) === CC_LOWER_L &&
		input.charCodeAt(pos) === CC_LEFT_PARENTHESIS
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
 * escape. This is the shared lexer core: `next` reuses one `out` across calls so
 * the parse hot path allocates no per-token object; loop over it with a fresh
 * `out` per call to collect the raw token list (e.g. tests). Comment tokens are
 * returned here; `next` filters them.
 * @param {string} input input
 * @param {number} pos byte offset to read from
 * @param {MutableToken} out token to populate
 * @returns {MutableToken | undefined} the token, or undefined at EOF
 */
function readToken(input, pos, out) {
	if (pos >= input.length) return undefined;
	const cc = input.charCodeAt(pos);
	// Comment: `/*…*/` is yielded as a token (filtered by `next`).
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
	Comment: 27
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
	Comment: T_COMMENT
} = NodeType;

/**
 * Base AST node. All concrete nodes (tokens, simple blocks, functions,
 * declarations) inherit from this and carry the `[start, end)` byte `range`
 * of the source slice they cover. `loc` is computed on demand from a
 * shared `LocConverter` so we don't pay for line/column conversion until
 * a consumer (warning, error, dependency) actually needs it.
 */
class Node {
	/**
	 * @param {number} type node type discriminator
	 * @param {number} start byte offset of the node's first code point
	 * @param {number} end byte offset just past the node's last code point
	 * @param {LocConverter} locConverter shared loc converter
	 */
	constructor(type, start, end, locConverter) {
		/** @type {number} */
		this.type = type;
		// Byte range as two inline fields rather than a `[start, end]` array —
		// one fewer allocation per node and ~56 bytes lighter (×100k+ nodes).
		/** @type {number} */
		this.start = start;
		/** @type {number} */
		this.end = end;
		/** @type {LocConverter} */
		this._locConverter = locConverter;
	}

	/**
	 * The `[start, end)` byte range as a tuple — compatibility view over
	 * `start` / `end` (builds the array lazily; hot code reads the
	 * fields directly).
	 * @returns {[number, number]} the byte range
	 */
	get range() {
		return [this.start, this.end];
	}

	get loc() {
		const lc = this._locConverter;
		// `LocConverter#get` mutates and returns the converter itself, so we
		// must snapshot `line`/`column` between the two calls.
		const s = lc.get(this.start);
		const sl = s.line;
		const sc = s.column;
		const e = lc.get(this.end);
		return {
			start: { line: sl, column: sc },
			end: { line: e.line, column: e.column }
		};
	}

	/**
	 * Serialize back to source — re-slices the original input (zero-alloc for
	 * untouched nodes).
	 * @returns {string} the source slice for this node
	 */
	toString() {
		return this._locConverter._input.slice(this.start, this.end);
	}

	/**
	 * For name-bearing nodes (function / at-rule): the `name` with CSS escapes
	 * resolved, for case-insensitive keyword matching (`\75 rl` → `url`). Computed
	 * on read via `unescapeIdentifier`'s no-escape fast path. Callers without a
	 * `name` must not read this.
	 * @returns {string} the unescaped name
	 */
	get unescapedName() {
		return unescapeIdentifier(
			/** @type {{ name: string }} */ (/** @type {unknown} */ (this)).name
		);
	}
}

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
 * Leaf token node — the only `Node` subclass. `value` is the raw source slice
 * (identifier text, quoted string including quotes, a dimension's full `123px`,
 * …). Token-specific extras are named by the `HashToken` / `UrlToken` /
 * `NumberToken` / `DimensionToken` shape typedefs below.
 *
 * The numeric accessors (`numericValue` / `typeFlag` / `sign` / `unit`) are
 * getters, not stored fields: a number / dimension / percentage token costs
 * nothing beyond the base node unless a consumer reads them, and every leaf
 * token keeps a single object shape so the walker's `node.type` dispatch stays
 * monomorphic. They are only meaningful on the matching token type.
 */
class Token extends Node {
	/**
	 * @param {number} type node type
	 * @param {number} start byte offset of the token's first code point
	 * @param {number} end byte offset just past the token's last code point
	 * @param {LocConverter} locConverter shared loc converter
	 */
	// No own fields: a leaf token is exactly a `Node` plus the value getters
	// below. `value` is derived from the byte range on read instead of cached in
	// a `_value` slot — most tokens (whitespace, punctuation) never read it, and
	// dropping the slot is ~8 bytes saved on every token (the bulk of all nodes).
	// hash / at-keyword strip their `#` / `@` prefix; url uses its content range
	// (`contentStart` / `contentEnd`, the token's only own fields).

	/**
	 * @returns {string} the token's value (raw source slice unless overridden)
	 */
	get value() {
		const input = this._locConverter._input;
		const type = this.type;
		// hash (`#name` → `name`) and at-keyword (`@name` → `name`) drop one char.
		if (type === T_HASH || type === T_AT_KEYWORD) {
			return input.slice(this.start + 1, this.end);
		}
		if (type === T_URL) {
			const u = /** @type {UrlToken} */ (/** @type {unknown} */ (this));
			return input.slice(u.contentStart, u.contentEnd);
		}
		return input.slice(this.start, this.end);
	}

	/**
	 * The token's value with CSS escapes resolved (`\2d` → `-`, `\75 rl` → `url`),
	 * per https://www.w3.org/TR/css-syntax-3/#consume-escaped-code-point — the
	 * form to match keywords / export as a CSS-Modules name against. For a string
	 * token it is the content between the quotes (the spec string value). Computed
	 * on read; `unescapeIdentifier` fast-returns the value unchanged when it has no
	 * escapes (the common case), so nothing is stored per token.
	 * @returns {string} the unescaped value
	 */
	get unescaped() {
		const v = this.value;
		// A string token's `value` carries its delimiting quotes; its value is the content between them.
		return this.type === T_STRING
			? unescapeIdentifier(v.slice(1, -1))
			: unescapeIdentifier(v);
	}

	/**
	 * Parsed numeric value (number / percentage / dimension tokens). Derived from
	 * `value` on access — the `%` is dropped for percentages and the unit for
	 * dimensions (split with `_consumeANumber`, recomputed here so nothing is
	 * stored per token).
	 * @returns {number} the parsed numeric value
	 */
	get numericValue() {
		const v = this.value;
		if (this.type === T_DIMENSION) {
			return Number(v.slice(0, _consumeANumber(v, 0)));
		}
		if (this.type === T_PERCENTAGE) return Number(v.slice(0, -1));
		return Number(v);
	}

	/**
	 * Spec type flag. For number / dimension tokens it's "integer" / "number"
	 * (derived from `value`); for hash tokens it's "id" / "unrestricted" (re-derived
	 * from the source). The two senses share the name in the spec; both are computed
	 * on read so every leaf token keeps the same object shape (no own `typeFlag`).
	 * @returns {"integer" | "number" | "id" | "unrestricted"} the spec type flag
	 */
	get typeFlag() {
		if (this.type === T_HASH) {
			// Re-derive id-ness from the source (whether the name after `#` starts an
			// ident sequence) rather than storing an `_isId` slot — keeps hash tokens
			// the same shape as every other leaf token. Matches the lexer's
			// `consumeNumberSign`, which sets `isId` from the same check.
			const input = this._locConverter._input;
			const p = this.start + 1;
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
		const v = this.value;
		return _typeFlagOf(
			this.type === T_DIMENSION ? v.slice(0, _consumeANumber(v, 0)) : v
		);
	}

	/**
	 * @returns {"+" | "-" | ""} the spec sign (number / percentage / dimension tokens)
	 */
	get sign() {
		return _signOf(this.value);
	}

	/**
	 * @returns {string} the unit, lower-cased per spec (dimension tokens)
	 */
	get unit() {
		const v = this.value;
		return v.slice(_consumeANumber(v, 0)).toLowerCase();
	}
}

/**
 * The non-leaf `Node` subclass: functions, simple blocks, declarations, at-rules
 * and qualified rules. It declares the union of every container field up front so
 * all five share **one** hidden class — the consume algorithms only overwrite the
 * slots relevant to their type, never adding a property, so the shape never
 * transitions. This caps the shape count: the walker's hot `.type` / `.value` /
 * `.prelude` loads otherwise see eight distinct node maps (five container types
 * plus the token / hash / url token maps), tipping V8's inline cache into the
 * slow megamorphic path; folding the five containers into one leaves four maps
 * (token, hash, url, container) — within the polymorphic limit, so those loads
 * stay inline-cached. Unused-for-the-type slots keep their defaults (the field
 * typedefs below document which fields each type uses). The stylesheet node is
 * rare (one per parse) and stays a bare `Node`.
 */
class Container extends Node {
	/**
	 * @param {number} type node type
	 * @param {number} start byte offset of the node's first code point
	 * @param {number} end byte offset just past the node's last code point
	 * @param {LocConverter} locConverter shared loc converter
	 */
	constructor(type, start, end, locConverter) {
		super(type, start, end, locConverter);
		/** @type {string} name (function / at-rule / declaration) */
		this.name = "";
		/** @type {number} */
		this.nameStart = start;
		/** @type {number} */
		this.nameEnd = start;
		/** @type {ComponentValue[] | null} component values (function / block / declaration) */
		this.value = null;
		/** @type {ComponentValue[] | null} prelude (at-rule / qualified rule) */
		this.prelude = null;
		/** @type {Declaration[] | null} */
		this.declarations = null;
		/** @type {Rule[] | null} */
		this.childRules = null;
		/** @type {number} `{` start offset, or -1 (at-rule / qualified rule) */
		this.blockStart = -1;
		/** @type {number} `}` end offset, or -1 (at-rule / qualified rule) */
		this.blockEnd = -1;
		/** @type {boolean} stripped `!important` (declaration) */
		this.important = false;
		/** @type {SimpleBlockToken | undefined} opening char (simple block) */
		this.token = undefined;
	}
}

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

// Lexer-token-type → AST-node-type map. A single \`new Token\` construct site
// (vs a ~20-case switch with a \`new Token\` in each arm) keeps V8 on the fast
// monomorphic allocation path — the switch form showed up as generic construct
// stubs in profiles. URL is the one type with extra own state, handled first.
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

// === AST construction backend ===
// The consume algorithms build nodes through these module-level primitives
// rather than `new Token` / `new Container` directly, so the node
// representation can be swapped under the parser. The object backend below
// builds the retainable `Node` / `Token` / `Container` tree the `parseA*`
// entry points return; the Struct-of-Arrays backend (added separately) writes
// the same nodes into reused typed arrays for the streaming `grammar`, where
// per-node allocation dominates cost. Child lists are plain arrays in both
// backends (a node ref is an object or an integer index); only node creation /
// field access differs, so only those ops are swapped.

// Current loc converter for the active parse (object backend reads it).
let _objLocConverter = /** @type {LocConverter} */ (
	/** @type {unknown} */ (null)
);

// Active skip state (from `CssProcessOptions.skip`), applied by the grammar.
// `_skipTypes` is indexed by `NodeType` (1 = skip): drop that component-value
// leaf / container from declaration value and function-arg lists. The two
// prelude flags scan a rule's prelude without materializing its tree (url tokens
// / functions kept, so `url()` in a selector or `@import url(…)` still resolves).
// A skipped node is still tokenized (positions stay correct) but never pushed,
// so it is never walked or read — the caller must only skip what nothing reads.
// `useObjectBackend` restores the defaults so `parseA*` build the full tree.
const _NO_SKIP_TYPES = new Uint8Array(32);
// Shared frozen empty list for block bodies with no decls / no child rules (the
// common case — most rules carry only declarations). Every consumer reads these
// lists read-only and null-guards, so one immutable instance replaces ~one empty
// array allocation per rule; frozen so any errant push fails loud.
const _EMPTY_LIST = /** @type {Rule[]} */ (
	/** @type {unknown} */ (Object.freeze([]))
);
/** @type {Uint8Array} */
let _skipTypes = _NO_SKIP_TYPES;
// Fast-path flag: true only when a real skip set is active, so the (dominant)
// no-skip parses pay one boolean test instead of a node-type lookup per value.
let _skipActive = false;
let _skipSelectorPrelude = false;
let _skipAtRulePrelude = false;

/** @type {(type: number, start: number, end: number) => Node} */
let _makeLeaf;
/** @type {(start: number, end: number, contentStart: number, contentEnd: number) => Node} */
let _makeUrl;
/** @type {(type: number, start: number, end: number) => Node} */
let _makeContainer;
/** @type {(start: number) => Node} */
let _makeStylesheet;
// Offsets only — the object backend derives the name string itself (an
// at-rule's name skips its `@`), so the SoA backend never pays for a slice
// it would immediately discard (it re-derives names from offsets on read).
/** @type {(r: Node, nameStart: number, nameEnd: number) => void} */
let _setName;
/** @type {(r: Node, v: number) => void} */
let _setEnd;
/** @type {(r: Node, blockStart: number, blockEnd: number) => void} */
let _setBlock;
/** @type {(r: Node) => void} */
let _setImportant;
/** @type {(r: Node, ch: SimpleBlockToken) => void} */
let _setToken;
/** @type {(r: Node, list: Node[]) => void} */
let _setValue;
/** @type {(r: Node, list: Node[]) => void} */
let _setPrelude;
/** @type {(r: Node, decls: Node[], childRules: Node[]) => void} */
let _setBody;
/** @type {(r: Node, list: Node[]) => void} */
let _setRules;
/** @type {(r: Node) => number} */
let _nodeTypeOf;
/** @type {(r: Node) => number} */
let _nodeStartOf;
/** @type {(r: Node) => string} */
let _nodeValueOf;
/** @type {(r: Node) => SimpleBlockToken} */
let _nodeTokenOf;

// Child lists are plain arrays in every backend; refs are pushed by value.
// Content-list allocation: the object backend uses a per-site `[]` literal
// (each site keeps its own V8 allocation site — a shared helper collapses them
// and defeats escape analysis / pretenuring), the SoA backend recycles scratch
// arrays through a pool — a sealed list is copied into the flat value buffer
// and its array returned to the pool by `_soaSetValue`, so the streaming parse
// allocates no per-list array. An abandoned (never-sealed) list simply falls
// out of the pool. `_soaActive` gates the pool at each site.
let _soaActive = false;
/** @type {Node[][]} */
const _listPool = [];
const _soaList = () =>
	_listPool.length > 0
		? /** @type {Node[]} */ (_listPool.pop())
		: /** @type {Node[]} */ ([]);

// -- object backend: builds the retainable class-instance tree --
/** @type {typeof _makeLeaf} */
const _objLeaf = (type, start, end) =>
	new Token(type, start, end, _objLocConverter);
/** @type {typeof _makeUrl} */
const _objUrl = (start, end, cs, ce) => {
	const u = /** @type {UrlToken} */ (
		new Token(T_URL, start, end, _objLocConverter)
	);
	u.contentStart = cs;
	u.contentEnd = ce;
	return u;
};
/** @type {typeof _makeContainer} */
const _objContainer = (type, start, end) =>
	new Container(type, start, end, _objLocConverter);
/** @type {typeof _makeStylesheet} */
const _objStylesheet = (start) => {
	const s = /** @type {Stylesheet} */ (
		new Node(T_STYLESHEET, start, start, _objLocConverter)
	);
	s.rules = [];
	return s;
};
// The backend function sets are module-level constants (not closures rebuilt
// per parse): the dispatch slots keep one function identity forever, so the
// per-node call sites in the consume algorithms stay monomorphic instead of
// seeing a fresh closure per parse. They capture only module-level state.
/** @type {typeof _setName} */
const _objSetName = (r, ns, ne) => {
	const c = /** @type {Container} */ (r);
	// An at-rule's `nameStart` points at its `@`, which the name excludes.
	c.name = _objLocConverter._input.slice(
		r.type === T_AT_RULE ? ns + 1 : ns,
		ne
	);
	c.nameStart = ns;
	c.nameEnd = ne;
};
/** @type {typeof _setEnd} */
const _objSetEnd = (r, v) => {
	r.end = v;
};
/** @type {typeof _setBlock} */
const _objSetBlock = (r, bs, be) => {
	const c = /** @type {Container} */ (r);
	c.blockStart = bs;
	c.blockEnd = be;
};
/** @type {typeof _setImportant} */
const _objSetImportant = (r) => {
	/** @type {Container} */ (r).important = true;
};
/** @type {typeof _setToken} */
const _objSetToken = (r, ch) => {
	/** @type {Container} */ (r).token = ch;
};
/** @type {typeof _setValue} */
const _objSetValue = (r, list) => {
	/** @type {Container} */ (r).value = /** @type {ComponentValue[]} */ (list);
};
/** @type {typeof _setPrelude} */
const _objSetPrelude = (r, list) => {
	/** @type {Container} */ (r).prelude = /** @type {ComponentValue[]} */ (list);
};
/** @type {typeof _setBody} */
const _objSetBody = (r, decls, childRules) => {
	const c = /** @type {Container} */ (r);
	c.declarations = /** @type {Declaration[]} */ (decls);
	c.childRules = /** @type {Rule[]} */ (childRules);
};
/** @type {typeof _setRules} */
const _objSetRules = (r, list) => {
	/** @type {Stylesheet} */ (r).rules = /** @type {Rule[]} */ (list);
};
/** @type {typeof _nodeTypeOf} */
const _objNodeTypeOf = (r) => r.type;
/** @type {typeof _nodeStartOf} */
const _objNodeStartOf = (r) => r.start;
/** @type {typeof _nodeValueOf} */
const _objNodeValueOf = (r) => /** @type {Token} */ (r).value;
/** @type {typeof _nodeTokenOf} */
const _objNodeTokenOf = (r) =>
	/** @type {SimpleBlockToken} */ (/** @type {Container} */ (r).token);
/** @param {LocConverter} lc loc converter for this parse */
const useObjectBackend = (lc) => {
	_objLocConverter = lc;
	_soaActive = false;
	// `parseA*` return the full tree, so nothing is skipped.
	_skipTypes = _NO_SKIP_TYPES;
	_skipActive = false;
	_skipSelectorPrelude = false;
	_skipAtRulePrelude = false;
	_makeLeaf = _objLeaf;
	_makeUrl = _objUrl;
	_makeContainer = _objContainer;
	_makeStylesheet = _objStylesheet;
	_setName = _objSetName;
	_setEnd = _objSetEnd;
	_setBlock = _objSetBlock;
	_setImportant = _objSetImportant;
	_setToken = _objSetToken;
	_setValue = _objSetValue;
	_setPrelude = _objSetPrelude;
	_setBody = _objSetBody;
	_setRules = _objSetRules;
	_nodeTypeOf = _objNodeTypeOf;
	_nodeStartOf = _objNodeStartOf;
	_nodeValueOf = _objNodeValueOf;
	_nodeTokenOf = _objNodeTokenOf;
};

// -- struct-of-arrays backend: writes nodes into reused typed arrays --
// A node ref is its integer id; fields live in parallel arrays indexed by id.
// Three reused int slots (`_soaAux0/1/2`) plus a flags byte carry the per-type
// extras; child lists hang off three object arrays. Aux slot meaning by type:
//   url:         aux0 contentStart, aux1 contentEnd
//   function:    aux0 nameEnd
//   declaration: aux0 nameEnd, flags bit0 important
//   at-rule:     aux0 nameEnd, aux1 blockStart, aux2 blockEnd
//   qualified:   aux1 blockStart, aux2 blockEnd
// `name` / `nameStart` / a simple block's `token` are derived from the source
// on read (see the SoA accessors), so they need no slot. A node's main content
// (value | prelude | stylesheet rules) is a `_soaFlat` span (see below).
// `grammar` resets `_soaNodeCount` to 0 after each top-level rule's walk, so the
// buffers are reused across rules and the parse allocates almost nothing.
let _soaCapacity = 0;
let _soaNodeCount = 0;
let _soaTypes = new Uint8Array(0);
let _soaStarts = new Int32Array(0);
let _soaEnds = new Int32Array(0);
let _soaAux0 = new Int32Array(0);
let _soaAux1 = new Int32Array(0);
let _soaAux2 = new Int32Array(0);
let _soaFlags = new Uint8Array(0);
// Content-list spans: a container's value / prelude is `_soaFlat[start, start+len)`
// (node refs), recycled per top-level rule like the node columns.
let _soaListStarts = new Int32Array(0);
let _soaListLens = new Int32Array(0);
let _soaFlat = new Int32Array(0);
let _soaFlatTop = 0;
// Peak usage of the current parse, and use-once regrow hints: after an
// over-capacity shrink the next grow jumps straight back to the previous
// parse's peak (one exact-fit allocation instead of re-doubling up).
let _soaPeak = 0;
let _soaFlatPeak = 0;
let _soaGrowHint = 0;
let _soaFlatGrowHint = 0;

/** @param {number} need minimum flat-buffer capacity */
const _soaFlatGrow = (need) => {
	let cap = _soaFlat.length || 4096;
	if (_soaFlatGrowHint > cap) cap = _soaFlatGrowHint;
	_soaFlatGrowHint = 0;
	while (cap < need) cap *= 2;
	const next = new Int32Array(cap);
	next.set(_soaFlat);
	_soaFlat = next;
};
/** @type {(Node[] | null)[]} */
const _soaDeclarationLists = [];
/** @type {(Node[] | null)[]} */
const _soaChildRuleLists = [];
let _soaInput = "";
let _soaLocConverter = /** @type {LocConverter} */ (
	/** @type {unknown} */ (null)
);

// Node refs are integers here but typed `Node` across the parser; these are
// identity casts that just satisfy the type system at the boundary.
/** @type {(n: Node) => number} */
const _nodeIndex = (n) => /** @type {number} */ (/** @type {unknown} */ (n));
/** @type {(i: number) => Node} */
const _nodeRef = (i) => /** @type {Node} */ (/** @type {unknown} */ (i));

/** @param {number} need minimum capacity */
const _soaGrow = (need) => {
	let cap = _soaCapacity || 4096;
	if (_soaGrowHint > cap) cap = _soaGrowHint;
	_soaGrowHint = 0;
	while (cap < need) cap *= 2;
	const ty = new Uint8Array(cap);
	ty.set(_soaTypes);
	_soaTypes = ty;
	const st = new Int32Array(cap);
	st.set(_soaStarts);
	_soaStarts = st;
	const en = new Int32Array(cap);
	en.set(_soaEnds);
	_soaEnds = en;
	const a0 = new Int32Array(cap);
	a0.set(_soaAux0);
	_soaAux0 = a0;
	const a1 = new Int32Array(cap);
	a1.set(_soaAux1);
	_soaAux1 = a1;
	const a2 = new Int32Array(cap);
	a2.set(_soaAux2);
	_soaAux2 = a2;
	const fl = new Uint8Array(cap);
	fl.set(_soaFlags);
	_soaFlags = fl;
	const ls = new Int32Array(cap);
	ls.set(_soaListStarts);
	_soaListStarts = ls;
	const ll = new Int32Array(cap);
	ll.set(_soaListLens);
	_soaListLens = ll;
	_soaCapacity = cap;
};
/** @type {(type: number, start: number, end: number) => Node} */
const _soaAllocNode = (type, start, end) => {
	// Ids are 1-based: a node ref is used in truthiness checks (`if (!parent)`),
	// so 0 must stay reserved for "no node".
	// Leaves never read the flag / list slots — `_soaAllocContainer` clears
	// them instead, keeping the dominant leaf allocation at three writes.
	const i = _soaNodeCount + 1;
	if (i >= _soaCapacity) _soaGrow(i + 1);
	_soaTypes[i] = type;
	_soaStarts[i] = start;
	_soaEnds[i] = end;
	_soaNodeCount = i;
	return _nodeRef(i);
};
/** @type {(type: number, start: number, end: number) => Node} */
const _soaAllocContainer = (type, start, end) => {
	const r = _soaAllocNode(type, start, end);
	const i = _nodeIndex(r);
	_soaFlags[i] = 0;
	// Clear list slots so a reused id never exposes a previous node's children
	// (content lists are flat spans, so zeroing the length suffices).
	_soaListLens[i] = 0;
	_soaDeclarationLists[i] = null;
	_soaChildRuleLists[i] = null;
	return r;
};
// Raw token value (the lazy `Token.value` form): hash / at-keyword drop their
// one-char prefix, url uses its content range. Shared by the parser's
// mid-parse reads and the SoA accessor.
/**
 * @param {number} i node id
 * @returns {string} raw token value
 */
const _soaValueOf = (i) => {
	const ty = _soaTypes[i];
	if (ty === T_HASH || ty === T_AT_KEYWORD) {
		return _soaInput.slice(_soaStarts[i] + 1, _soaEnds[i]);
	}
	if (ty === T_URL) return _soaInput.slice(_soaAux0[i], _soaAux1[i]);
	return _soaInput.slice(_soaStarts[i], _soaEnds[i]);
};
// Module-level constants for the same reason as the `_objSet*` set above.
/** @type {typeof _makeUrl} */
const _soaMakeUrl = (start, end, cs, ce) => {
	const r = _soaAllocNode(T_URL, start, end);
	_soaAux0[_nodeIndex(r)] = cs;
	_soaAux1[_nodeIndex(r)] = ce;
	return r;
};
/** @type {typeof _makeStylesheet} */
const _soaMakeStylesheet = (start) =>
	_soaAllocContainer(T_STYLESHEET, start, start);
// name / nameStart are derived from start + nameEnd; only nameEnd is stored.
/** @type {typeof _setName} */
const _soaSetName = (r, ns, ne) => {
	_soaAux0[_nodeIndex(r)] = ne;
};
/** @type {typeof _setEnd} */
const _soaSetEnd = (r, v) => {
	_soaEnds[_nodeIndex(r)] = v;
};
/** @type {typeof _setBlock} */
const _soaSetBlock = (r, bs, be) => {
	const i = _nodeIndex(r);
	_soaAux1[i] = bs;
	_soaAux2[i] = be;
};
/** @type {typeof _setImportant} */
const _soaSetImportant = (r) => {
	_soaFlags[_nodeIndex(r)] |= 1;
};
// A simple block's token is derived from its opening char on read.
/** @type {typeof _setToken} */
const _soaSetToken = (r, ch) => {};
/** @type {typeof _setValue} */
const _soaSetValue = (r, list) => {
	// Seal the finished list: copy its refs into the flat buffer and hand the
	// scratch array back to the pool. The caller never touches `list` again.
	const i = _nodeIndex(r);
	const len = list.length;
	const start = _soaFlatTop;
	if (start + len > _soaFlat.length) _soaFlatGrow(start + len);
	for (let k = 0; k < len; k++) {
		_soaFlat[start + k] = _nodeIndex(list[k]);
	}
	_soaFlatTop = start + len;
	_soaListStarts[i] = start;
	_soaListLens[i] = len;
	list.length = 0;
	_listPool.push(list);
};
/** @type {typeof _setBody} */
const _soaSetBody = (r, decls, childRules) => {
	const i = _nodeIndex(r);
	_soaDeclarationLists[i] = decls;
	_soaChildRuleLists[i] = childRules;
};
/** @type {typeof _nodeTypeOf} */
const _soaNodeTypeOf = (r) => _soaTypes[_nodeIndex(r)];
/** @type {typeof _nodeStartOf} */
const _soaNodeStartOf = (r) => _soaStarts[_nodeIndex(r)];
/** @type {typeof _nodeValueOf} */
const _soaNodeValueOf = (r) => _soaValueOf(_nodeIndex(r));
/** @type {typeof _nodeTokenOf} */
const _soaNodeTokenOf = (r) =>
	/** @type {SimpleBlockToken} */ (_soaInput[_soaStarts[_nodeIndex(r)]]);
/**
 * @param {string} input source
 * @param {LocConverter} lc loc converter
 */
const useSoaBackend = (input, lc) => {
	_soaInput = input;
	_soaLocConverter = lc;
	_soaNodeCount = 0;
	_soaFlatTop = 0;
	_soaActive = true;
	// The alloc primitives are the slot functions directly — no wrapper hop.
	_makeLeaf = _soaAllocNode;
	_makeUrl = _soaMakeUrl;
	_makeContainer = _soaAllocContainer;
	_makeStylesheet = _soaMakeStylesheet;
	_setName = _soaSetName;
	_setEnd = _soaSetEnd;
	_setBlock = _soaSetBlock;
	_setImportant = _soaSetImportant;
	_setToken = _soaSetToken;
	_setValue = _soaSetValue;
	// value / prelude / rules all land in the one content-list slot.
	_setPrelude = _soaSetValue;
	_setBody = _soaSetBody;
	_setRules = _soaSetValue;
	_nodeTypeOf = _soaNodeTypeOf;
	_nodeStartOf = _soaNodeStartOf;
	_nodeValueOf = _soaNodeValueOf;
	_nodeTokenOf = _soaNodeTokenOf;
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
	useObjectBackend(ts.locConverter);
	// 3. Create a new stylesheet, with its location set to location (or null, if location was not passed).
	const start = ts.next().start;
	const stylesheet = /** @type {Stylesheet} */ (_makeStylesheet(start));
	// 4. Consume a stylesheet's contents from input, and set the stylesheet's rules to the result.
	_setRules(stylesheet, consumeAStylesheetsContents(ts));
	_setEnd(stylesheet, ts.next().start);
	// 5. Return the stylesheet.
	return stylesheet;
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
	useObjectBackend(ts.locConverter);
	// 2. Consume a stylesheet’s contents from input, and return the result.
	return consumeAStylesheetsContents(ts);
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
	useObjectBackend(ts.locConverter);
	// 2. Consume a block’s contents from input, and return the result.
	return consumeABlocksContents(ts);
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
	useObjectBackend(ts.locConverter);
	// 2. Discard whitespace from input.
	while (ts.next().type === TT_WHITESPACE) ts.discard();
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
	while (ts.next().type === TT_WHITESPACE) ts.discard();
	// 5. If the next token from input is an <EOF-token>, return rule. Otherwise, return a syntax error.
	return ts.next().type === TT_EOF ? rule : undefined;
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
	useObjectBackend(ts.locConverter);
	// 2. Discard whitespace from input.
	while (ts.next().type === TT_WHITESPACE) ts.discard();
	// 3. Consume a declaration from input. If anything was returned, return it. Otherwise, return a syntax error.
	return consumeADeclaration(ts);
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
	useObjectBackend(ts.locConverter);
	// 2. Discard whitespace from input.
	while (ts.next().type === TT_WHITESPACE) ts.discard();
	// 3. If input is empty, return a syntax error.
	if (ts.next().type === TT_EOF) return undefined;
	// 4. Consume a component value from input and let value be the return value.
	const result = consumeAComponentValue(ts);
	// 5. Discard whitespace from input.
	while (ts.next().type === TT_WHITESPACE) ts.discard();
	// 6. If input is empty, return value. Otherwise, return a syntax error.
	if (ts.next().type === TT_EOF) return result;
	return undefined;
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
	useObjectBackend(ts.locConverter);
	// 2. Consume a list of component values from input, and return the result.
	// (`null` needs `bailOnCurly`, which is not passed here.)
	return /** @type {ComponentValue[]} */ (consumeAListOfComponentValues(ts));
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
	useObjectBackend(ts.locConverter);
	// 2. Let groups be an empty list.
	/** @type {ComponentValue[][]} */
	const groups = [];
	// 3. While input is not empty:
	while (ts.next().type !== TT_EOF) {
		// 3.1. Consume a list of component values from input, with <comma-token> as the stop token, and append the result to groups.
		groups.push(
			/** @type {ComponentValue[]} */ (
				consumeAListOfComponentValues(ts, TT_COMMA)
			)
		);
		// 3.2 Discard a token from input.
		ts.discard();
	}
	// 4. Return groups.
	return groups;
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
	// Sealed (`_setPrelude`) at each return — the SoA backend consumes the
	// scratch array when sealing, so it must be complete by then.
	const prelude = _soaActive ? _soaList() : [];
	// declarations / childRules / blockStart (-1) / blockEnd (-1) keep their
	// defaults (no block: the `;` / EOF / nested-`}` at-rule forms).

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
			_setEnd(rule, t.start);
			return rule;
		}
		// <}-token>
		// If nested is true: if rule is valid in the current context, return it; otherwise return nothing.
		// Otherwise, consume a token and append the result to rule’s prelude.
		else if (t.type === TT_RIGHT_CURLY_BRACKET) {
			if (nested) {
				_setPrelude(rule, prelude);
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
			const block = consumeABlock(ts);
			_setBody(rule, block.decls, block.rules);
			_setBlock(rule, block.blockStart, block.blockEnd);
			_setEnd(rule, block.blockEnd);
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
	// rule; the parse-error exits abandon the scratch unsealed.
	const prelude = _soaActive ? _soaList() : [];
	// declarations / childRules / blockStart (-1) / blockEnd (-1) keep their
	// defaults (no block until a `{` is reached).

	// Skip mode leaves `prelude` empty (selector text is recovered from the
	// rule's byte range, not its nodes); `first`/`second` still track the first
	// two non-whitespace tokens the `--foo: {` disambiguation below needs.
	const skip = _skipSelectorPrelude;
	let first = /** @type {Node} */ (/** @type {unknown} */ (0));
	let second = /** @type {Node} */ (/** @type {unknown} */ (0));

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
			const node = consumeATokenAsNode(ts);
			if (skip) {
				if (!first) first = node;
				else if (!second) second = node;
			} else {
				prelude.push(node);
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
			if (!skip) {
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
			}
			if (
				first &&
				_nodeTypeOf(first) === T_IDENT &&
				// Test the source bytes directly — avoids forcing the lazy `value`
				// slice just to check the `--` custom-property prefix.
				ts.input.startsWith("--", _nodeStartOf(first)) &&
				second &&
				_nodeTypeOf(second) === T_COLON
			) {
				/* istanbul ignore if -- @preserve: when nested, `declarationStartLikely` routes every `--x:` to consumeADeclaration (which accepts custom properties), so this fallthrough is unreachable */
				if (nested) {
					consumeTheRemnantsOfABadDeclaration(ts, true);
				} else {
					consumeABlock(ts);
				}
				return undefined;
			}
			_setPrelude(rule, prelude);
			const block = consumeABlock(ts);
			_setBody(rule, block.decls, block.rules);
			_setBlock(rule, block.blockStart, block.blockEnd);
			_setEnd(rule, block.blockEnd);
			return rule;
		}

		// anything else
		// Consume a component value from input and append the result to rule’s prelude.
		const node = consumeAComponentValue(ts, t);
		if (skip) {
			// Keep only url-bearing nodes (url tokens, or functions that may hold a
			// url like `:unknown(url(x))`) so the url visitor still rewrites them;
			// other selector tokens have no non-modules consumer, so drop them.
			const ty = _nodeTypeOf(node);
			if (ty === T_FUNCTION || ty === T_URL) prelude.push(node);
			// Track the first two non-whitespace tokens for the disambiguation above.
			if (t.type !== TT_WHITESPACE) {
				if (!first) first = node;
				else if (!second) second = node;
			}
		} else {
			prelude.push(node);
		}
	}
};

/**
 * Consume a block, CSS Syntax Level 3 [§5.4.4](https://drafts.csswg.org/css-syntax/#consume-block) — the next token must be `<{-token>`; discards it, consumes the block's contents (§5.4.5), discards the closing `}`, and returns its `decls` / `rules` pair. We also return the `[start of {, end of }]` offsets so callers can record the block's source position.
 * @param {TokenStream} ts token stream
 * @returns {{ decls: Declaration[], rules: Rule[], blockStart: number, blockEnd: number }} block decls + rules and the `{` start / `}` end offsets
 */
const consumeABlock = (ts) => {
	// Capture the opening `{`'s start before advancing — the stream reuses one
	// token instance, so `consumeABlocksContents` below would overwrite it.
	const blockStart = ts.next().start;
	// Assert (spec): the next token is <{-token>.
	// Discard a token from input. Consume a block's contents from input and let result be the result. Discard a token from input.
	ts.discard();
	const { decls, rules } = consumeABlocksContents(ts);
	const close = ts.next();
	const end = close.type === TT_RIGHT_CURLY_BRACKET ? close.end : close.start;
	ts.discard();
	return { decls, rules, blockStart, blockEnd: end };
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
 * @param {TokenStream} ts token stream
 * @param {((node: Declaration | Rule) => void)=} onNode optional per-node sink (streaming); nodes are not collected when given
 * @returns {{ decls: Declaration[], rules: Rule[] }} consumed decls + rules (both empty when `onNode` is given; stops at the enclosing `}` / EOF, left in the stream)
 */
const consumeABlocksContents = (ts, onNode) => {
	/** @type {Declaration[]} */
	const decls = [];
	// Child rules are the common empty case (most rules carry only declarations),
	// so `rules` is allocated lazily and returned as the shared frozen
	// `_EMPTY_LIST` when nothing was appended — one fewer array per rule. `decls`
	// stays eager so the hot declaration append keeps a branch-free `push`.
	/** @type {Rule[] | null} */
	let rules = null;

	// Process input:
	for (;;) {
		const t = ts.next();

		// <whitespace-token> / <semicolon-token>
		// Discard a token from input.
		if (t.type === TT_WHITESPACE || t.type === TT_SEMICOLON) {
			ts.discard();
		}
		// <EOF-token> / <}-token>
		// Return decls and rules.
		else if (t.type === TT_EOF || t.type === TT_RIGHT_CURLY_BRACKET) {
			return { decls, rules: rules || _EMPTY_LIST };
		}
		// <at-keyword-token>
		// Consume an at-rule from input, with nested set to true. If a rule was returned, append it to rules.
		else if (t.type === TT_AT_KEYWORD) {
			const atRule = consumeAnAtRule(ts, true);
			if (atRule) {
				if (onNode) onNode(atRule);
				else (rules || (rules = [])).push(atRule);
			}
		}
		// anything else
		// Mark input. Consume a declaration from input, with nested set to true.
		// If a declaration was returned, append it to decls, and discard a mark from input.
		// Otherwise, restore a mark from input, then consume a qualified rule from input, with nested set to true, and <semicolon-token> as the stop token. If a rule was returned, append it to rules.
		else {
			// 2-token peek: consume-a-declaration's steps 1 / 3 require `<ident> <colon>`; if absent it would call consume-the-remnants-of-a-bad-declaration (potentially the rest of the enclosing block) only for the restoreMark to undo it (O(N²) on flat blocks of qualified rules). Skip straight to consume-a-qualified-rule — same observable result.
			if (declarationStartLikely(ts)) {
				ts.mark();
				const decl = consumeADeclaration(ts, true);
				if (decl) {
					if (onNode) onNode(decl);
					else decls.push(decl);
					ts.discardMark();
					continue;
				}
				ts.restoreMark();
			}
			const rule = consumeAQualifiedRule(ts, TT_SEMICOLON, true);
			if (rule) {
				if (onNode) onNode(rule);
				else (rules || (rules = [])).push(rule);
			}
		}
	}
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
	// name "" / nameStart / nameEnd (= start) / important (false) keep their
	// `Container` defaults; `value` is set unconditionally at step 5 below.
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
	while (ts.next().type === TT_WHITESPACE) ts.discard();

	// 3. If the next token is a <colon-token>, discard a token from input.
	//    Otherwise, consume the remnants of a bad declaration from input, with nested, and return nothing.
	if (ts.next().type === TT_COLON) {
		ts.discard();
	} else {
		consumeTheRemnantsOfABadDeclaration(ts, nested);
		return undefined;
	}

	// 4. Discard whitespace from input.
	while (ts.next().type === TT_WHITESPACE) ts.discard();

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
	// and the SoA backend consumes it when sealing.
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
			value.length = prev;
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
	//    Otherwise, if decl's value contains a top-level simple block with an associated token of <{-token>, return nothing.
	//    (That is, a top-level {}-block is only allowed as the entire value of a non-custom property — for CSS Nesting, `consumeABlocksContents`'s `mark` / `restore a mark` will retry the input as a qualified rule.)
	//    Otherwise, accept the declaration. (The spec also checks "contains any non-whitespace-tokens at the top level" → return nothing; we keep empty-value declarations because callers — e.g. `@value name:;` — rely on them.)
	if (!isCustomProperty) {
		for (let i = 0; i < value.length; i++) {
			const v = value[i];
			if (_nodeTypeOf(v) === T_SIMPLE_BLOCK && _nodeTokenOf(v) === "{") {
				return undefined;
			}
		}
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
 * @param {boolean=} bailOnCurly abort with `null` on a top-level `{` (left unconsumed) — for callers that would reject the list anyway (consume-a-declaration step 8) and restore a mark
 * @returns {ComponentValue[] | null} consumed component values, or `null` when `bailOnCurly` hit
 */
const consumeAListOfComponentValues = (
	ts,
	stopToken,
	nested = false,
	bailOnCurly = false
) => {
	const values = /** @type {ComponentValue[]} */ (_soaActive ? _soaList() : []);
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
		if (bailOnCurly && t.type === TT_LEFT_CURLY_BRACKET) return null;
		// anything else
		// Consume a component value from input, and append the result to values.
		// Skipped leaf types short-circuit before materializing: no SoA slot is
		// written and no node is built (blocks / functions never skip here).
		const tt = t.type;
		if (
			_skipActive &&
			tt !== TT_FUNCTION &&
			!(tt >= TT_LEFT_PARENTHESIS && tt <= TT_LEFT_CURLY_BRACKET) &&
			_skipTypes[_ttToNodeType[tt]] === 1
		) {
			ts.consume();
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
	// Inlined `consumeATokenAsNode`: `t` is already the peeked next token, so
	// advance past it and materialize it directly — one fewer call per leaf
	// component value (the bulk of the nodes on a large stylesheet).
	ts.consume();
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
	const val = _soaActive ? _soaList() : [];

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
	const val = _soaActive ? _soaList() : [];

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
			ts.consume();
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
	"block-contents": consumeABlocksContents
};

/**
 * @typedef {object} CssProcessOptions
 * @property {LocConverter=} locConverter shared loc converter (default a fresh one over the input)
 * @property {boolean=} recurseBlocks walk into block bodies' nested rules (default true)
 * @property {("stylesheet" | "block-contents")=} as which top-level production to consume the source as (see `TOP_LEVEL_CONSUMERS`): `"stylesheet"` (default) or `"block-contents"` (a block's contents, e.g. an HTML `style` attribute)
 * @property {SkipOptions=} skip what the grammar may leave un-materialized to go faster — safe only for parts nothing reads in the active parse; default skip nothing
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
/** @type {CompiledVisitorBucket | undefined} */
let _commentBucket;

// Comments reach the visitor map through `NodeType.Comment` instead of a
// side callback. They fire during tokenization — in source order among
// comments, not interleaved with the node walk — on a transient SoA node so
// `A.start`/`end`/`loc`/`source` work. No comment visitor → no callback →
// the tokenizer skips comments with zero overhead.
/** @type {(input: string, start: number, end: number) => number} */
const _grammarOnComment = (_input, start, end) => {
	const node = _soaAllocNode(T_COMMENT, start, end);
	_currentNode = node;
	_currentParent = null;
	const bucket = /** @type {CompiledVisitorBucket} */ (_commentBucket);
	const e = bucket.enter;
	for (let i = 0; i < e.length; i++) e[i](A);
	const x = bucket.exit;
	for (let i = 0; i < x.length; i++) x[i](A);
	return end;
};

/**
 * Walk a component-value subtree; children are already materialized. Fetches
 * the node's visitor bucket once (reused for enter + exit) and uses index
 * loops — `for…of` would allocate an iterator per node on this hot path.
 * @param {Node} node component-value root
 * @param {Node | null} parent enclosing node
 */
const _walkValue = (node, parent) => {
	const ty = _soaTypes[_nodeIndex(node)];
	const b = _visitors[ty];
	let skip = false;
	if (b !== undefined && b.enter.length !== 0) {
		_walkSkip = false;
		_currentNode = node;
		_currentParent = parent;
		const e = b.enter;
		for (let i = 0; i < e.length; i++) e[i](A);
		skip = _walkSkip;
		_walkSkip = false;
	}
	if (!skip && (ty === T_FUNCTION || ty === T_SIMPLE_BLOCK)) {
		const i0 = _nodeIndex(node);
		const vs = _soaListStarts[i0];
		const ve = vs + _soaListLens[i0];
		for (let i = vs; i < ve; i++) _walkValue(_nodeRef(_soaFlat[i]), node);
	}
	if (b !== undefined) {
		// Rebind: descending into children moved the path.
		_currentNode = node;
		_currentParent = parent;
		const x = b.exit;
		for (let i = 0; i < x.length; i++) x[i](A);
	}
};

/**
 * Walk a structural subtree; an at-rule / qualified-rule's block was parsed
 * eagerly (§5.4.4), so its `value` holds the nested rules / declarations.
 * @param {Node} node structural-tree root
 * @param {Node | null} parent enclosing node
 */
const _walkRule = (node, parent) => {
	const i0 = _nodeIndex(node);
	const ty = _soaTypes[i0];
	const b = _visitors[ty];
	let skip = false;
	if (b !== undefined && b.enter.length !== 0) {
		_walkSkip = false;
		_currentNode = node;
		_currentParent = parent;
		const e = b.enter;
		for (let i = 0; i < e.length; i++) e[i](A);
		skip = _walkSkip;
		_walkSkip = false;
	}
	if (!skip) {
		if (ty === T_AT_RULE || ty === T_QUALIFIED_RULE) {
			const ps = _soaListStarts[i0];
			const pe = ps + _soaListLens[i0];
			for (let i = ps; i < pe; i++) _walkValue(_nodeRef(_soaFlat[i]), node);
			if (_recurseBlocks) {
				// Declarations then child rules — downstream consumers don't need them strictly interleaved in source order.
				const decls = _soaDeclarationLists[i0];
				if (decls) {
					for (let i = 0; i < decls.length; i++) _walkRule(decls[i], node);
				}
				const ch = _soaChildRuleLists[i0];
				if (ch) for (let i = 0; i < ch.length; i++) _walkRule(ch[i], node);
			}
		} else if (ty === T_DECLARATION) {
			const vs = _soaListStarts[i0];
			const ve = vs + _soaListLens[i0];
			for (let i = vs; i < ve; i++) _walkValue(_nodeRef(_soaFlat[i]), node);
		}
	}
	if (b !== undefined) {
		// Rebind: descending into children moved the path.
		_currentNode = node;
		_currentParent = parent;
		const x = b.exit;
		for (let i = 0; i < x.length; i++) x[i](A);
	}
};

/**
 * The `grammar` streaming sink: walk one top-level node, then recycle the SoA
 * buffers for the next.
 * @param {Rule | Declaration} node top-level node
 */
const _walkTopLevel = (node) => {
	_walkRule(node, null);
	if (_soaNodeCount > _soaPeak) _soaPeak = _soaNodeCount;
	if (_soaFlatTop > _soaFlatPeak) _soaFlatPeak = _soaFlatTop;
	_soaNodeCount = 0;
	_soaFlatTop = 0;
};

// The SoA buffers grow to the largest single top-level rule ever parsed and
// live at module level; above this capacity they are re-shrunk after a parse
// so one pathological rule can't pin megabytes for the process lifetime.
const _SOA_SHRINK_CAPACITY = 65536;

/**
 * The CSS `SourceProcessor` grammar: consume top-level rules one at a time
 * (§5.4.1) and walk each immediately, firing `enter` / `exit` in source order
 * without building a whole-stylesheet array first. `recurseBlocks: false` skips
 * walking block bodies' (eagerly parsed) nested rules (caller drives nested
 * traversal itself).
 * @param {string} input source text
 * @param {CompiledVisitorMap} visitors compiled visitor map
 * @param {CssProcessOptions} options process options
 */
const grammar = (input, visitors, options) => {
	const locConverter = options.locConverter || new LocConverter(input);
	useSoaBackend(input, locConverter);
	const skip = options.skip;
	_skipTypes = (skip && skip.types) || _NO_SKIP_TYPES;
	_skipActive = _skipTypes !== _NO_SKIP_TYPES;
	_skipSelectorPrelude = skip !== undefined && skip.selectorPrelude === true;
	_skipAtRulePrelude = skip !== undefined && skip.atRulePrelude === true;
	_recurseBlocks = options.recurseBlocks !== false;
	_visitors = visitors;
	_commentBucket = visitors[T_COMMENT];

	// Stream each top-level node (selected by `as`) to the walker the moment it's
	// consumed, rather than collecting them first — so the whole AST is never
	// held at once; peak heap is ~one top-level node's subtree.
	const ts = new TokenStream(
		input,
		0,
		locConverter,
		_commentBucket === undefined ? undefined : _grammarOnComment
	);
	const consume =
		TOP_LEVEL_CONSUMERS[options.as || "stylesheet"] ||
		consumeAStylesheetsContents;
	try {
		consume(ts, _walkTopLevel);
	} finally {
		// Drop the module-level SoA references so the last parsed source (and
		// its LocConverter / child lists / visitors) don't stay alive between
		// parses.
		_soaInput = "";
		_soaLocConverter = /** @type {LocConverter} */ (
			/** @type {unknown} */ (null)
		);
		_soaDeclarationLists.length = 0;
		_soaChildRuleLists.length = 0;
		_soaFlatTop = 0;
		_listPool.length = 0;
		if (_soaFlat.length > _SOA_SHRINK_CAPACITY) {
			_soaFlatGrowHint = _soaFlatPeak;
			_soaFlat = new Int32Array(0);
		}
		_visitors = /** @type {CompiledVisitorMap} */ (/** @type {unknown} */ ([]));
		_commentBucket = undefined;
		if (_soaCapacity > _SOA_SHRINK_CAPACITY) {
			// +1: node ids are 1-based and grow fires at `id >= capacity`.
			_soaGrowHint = _soaPeak + 1;
			_soaCapacity = 0;
			_soaTypes = new Uint8Array(0);
			_soaStarts = new Int32Array(0);
			_soaEnds = new Int32Array(0);
			_soaAux0 = new Int32Array(0);
			_soaAux1 = new Int32Array(0);
			_soaAux2 = new Int32Array(0);
			_soaFlags = new Uint8Array(0);
			_soaListStarts = new Int32Array(0);
			_soaListLens = new Int32Array(0);
		}
		_soaPeak = 0;
		_soaFlatPeak = 0;
	}
};

/**
 * The generic visitor coordinator (`util/SourceProcessor`) bound to the CSS
 * `grammar`. Babel-style usage:
 *
 * ```
 * new SourceProcessor({ skip }).use({ [NodeType.AtRule]: (path) => {} }).process(source);
 * ```
 * @extends {GenericSourceProcessor<CssPath, CssProcessOptions>}
 */
class SourceProcessor extends GenericSourceProcessor {
	/**
	 * @param {CssProcessOptions=} options default process options (`skip`, `as`, …) for every `process` call
	 */
	constructor(options) {
		super(grammar, options);
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

// A fresh (safely retainable) array view of a node's flat content span —
// visitors that read `A.children` / `A.prelude` may keep the result.
/** @type {(n: Node) => Node[]} */
const _materializeList = (n) => {
	const i = _nodeIndex(n);
	const start = _soaListStarts[i];
	const len = _soaListLens[i];
	/** @type {Node[]} */
	const out = [];
	for (let k = 0; k < len; k++) out.push(_nodeRef(_soaFlat[start + k]));
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

// AST field-access seam. Every AST-node field read by `CssParser` goes through
// one of these accessors so the node representation can change underneath the
// consumer without touching it. Today they are backed by the `Node` / `Token` /
// `Container` objects (`n` is a node); the Struct-of-Arrays migration rewrites
// the bodies to index typed arrays (`n` becomes an integer node id) without any
// consumer edit. `value` is the leaf-token string; container child lists are
// `children` / `prelude` / `declarations` / `childRules`.
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
	/** Stop the walk descending into the current node (enter only). */
	skipChildren() {
		_walkSkip = true;
	},
	// === field reads — `n` defaults to the current node ===
	/**
	 * @param {Node=} n node
	 * @returns {number} node type
	 */
	type(n = _currentNode) {
		return _soaTypes[_nodeIndex(n)];
	},
	/**
	 * @param {Node=} n node
	 * @returns {number} start offset
	 */
	start(n = _currentNode) {
		return _soaStarts[_nodeIndex(n)];
	},
	/**
	 * @param {Node=} n node
	 * @returns {number} end offset
	 */
	end(n = _currentNode) {
		return _soaEnds[_nodeIndex(n)];
	},
	/**
	 * @param {Node=} n node
	 * @returns {[number, number]} start / end offsets
	 */
	range(n = _currentNode) {
		const i = _nodeIndex(n);
		return [_soaStarts[i], _soaEnds[i]];
	},
	/**
	 * @param {Node=} n node
	 * @returns {{ start: { line: number, column: number }, end: { line: number, column: number } }} source location
	 */
	loc(n = _currentNode) {
		const i = _nodeIndex(n);
		const lc = _soaLocConverter;
		const s = lc.get(_soaStarts[i]);
		const sl = s.line;
		const sc = s.column;
		const e = lc.get(_soaEnds[i]);
		return {
			start: { line: sl, column: sc },
			end: { line: e.line, column: e.column }
		};
	},
	/**
	 * @param {Node=} n node
	 * @returns {string} raw source slice
	 */
	source(n = _currentNode) {
		const i = _nodeIndex(n);
		return _soaInput.slice(_soaStarts[i], _soaEnds[i]);
	},
	/**
	 * @param {Node=} n node
	 * @returns {string} raw token value
	 */
	value(n = _currentNode) {
		return _soaValueOf(_nodeIndex(n));
	},
	/**
	 * @param {Node=} n node
	 * @returns {string} unescaped token value
	 */
	unescaped(n = _currentNode) {
		const i = _nodeIndex(n);
		const v = _soaValueOf(i);
		return _soaTypes[i] === T_STRING
			? unescapeIdentifier(v.slice(1, -1))
			: unescapeIdentifier(v);
	},
	/**
	 * @param {Node=} n node
	 * @returns {string} hash / numeric type flag
	 */
	typeFlag(n = _currentNode) {
		const i = _nodeIndex(n);
		if (_soaTypes[i] === T_HASH) {
			const input = _soaInput;
			const p = _soaStarts[i] + 1;
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
		const v = _soaValueOf(i);
		return _typeFlagOf(
			_soaTypes[i] === T_DIMENSION ? v.slice(0, _consumeANumber(v, 0)) : v
		);
	},
	/**
	 * @param {Node=} n node
	 * @returns {number} url content start offset
	 */
	contentStart(n = _currentNode) {
		return _soaAux0[_nodeIndex(n)];
	},
	/**
	 * @param {Node=} n node
	 * @returns {number} url content end offset
	 */
	contentEnd(n = _currentNode) {
		return _soaAux1[_nodeIndex(n)];
	},
	/**
	 * @param {Node=} n node
	 * @returns {string} rule / declaration / function name
	 */
	name(n = _currentNode) {
		const i = _nodeIndex(n);
		return _soaTypes[i] === T_AT_RULE
			? _soaInput.slice(_soaStarts[i] + 1, _soaAux0[i])
			: _soaInput.slice(_soaStarts[i], _soaAux0[i]);
	},
	/**
	 * @param {Node=} n node
	 * @returns {number} name start offset
	 */
	nameStart(n = _currentNode) {
		return _soaStarts[_nodeIndex(n)];
	},
	/**
	 * @param {Node=} n node
	 * @returns {number} name end offset
	 */
	nameEnd(n = _currentNode) {
		return _soaAux0[_nodeIndex(n)];
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
	 * @returns {Declaration[] | null} block declarations
	 */
	declarations(n = _currentNode) {
		return /** @type {Declaration[] | null} */ (
			_soaDeclarationLists[_nodeIndex(n)]
		);
	},
	/**
	 * @param {Node=} n node
	 * @returns {Rule[] | null} block child rules
	 */
	childRules(n = _currentNode) {
		return /** @type {Rule[] | null} */ (_soaChildRuleLists[_nodeIndex(n)]);
	},
	/**
	 * @param {Node=} n node
	 * @returns {number} block start offset
	 */
	blockStart(n = _currentNode) {
		return _soaAux1[_nodeIndex(n)];
	},
	/**
	 * @param {Node=} n node
	 * @returns {number} block end offset
	 */
	blockEnd(n = _currentNode) {
		return _soaAux2[_nodeIndex(n)];
	},
	/**
	 * @param {Node=} n node
	 * @returns {boolean} `!important` flag
	 */
	important(n = _currentNode) {
		return (_soaFlags[_nodeIndex(n)] & 1) !== 0;
	},
	/**
	 * @param {Node=} n node
	 * @returns {SimpleBlockToken} block opening token
	 */
	blockToken(n = _currentNode) {
		return /** @type {SimpleBlockToken} */ (
			_soaInput[_soaStarts[_nodeIndex(n)]]
		);
	},
	// Writers — `CssParser` rewrites a rule's end / block-end when it folds an
	// inline ICSS `:import` / `:export` body into a single dependency. The
	// node stays explicit here: writes should never be implicit on position.
	/**
	 * @param {Node} n node
	 * @param {number} v new end offset
	 */
	setEnd(n, v) {
		_soaEnds[_nodeIndex(n)] = v;
	},
	/**
	 * @param {Node} n node
	 * @param {number} v new block end offset
	 */
	setBlockEnd(n, v) {
		_soaAux2[_nodeIndex(n)] = v;
	}
};

// The two AST runtime classes — `Node` and its sole subclass `Token` (the
// other node shapes are `@typedef`s over `Node`, exported as types only). Plus
// the full CSS-Syntax-3 §5.3 `parseA*` entry-point surface, `consumeASimpleBlock`
// (the one §5.4 algorithm exposed as a byte entry point for `CssParser`), the
// `TokenStream` (so callers can pass a pre-built stream to any `parseA*`), and
// the `escape` / `unescapeIdentifier` string utils.
module.exports.A = A;
module.exports.Node = Node;
module.exports.NodeType = NodeType;
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
module.exports.Token = Token;
module.exports.TokenStream = TokenStream;
module.exports.buildSkipSet = buildSkipSet;
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
module.exports.rangeEquals = rangeEquals;
module.exports.rangeEqualsLowerCase = rangeEqualsLowerCase;
module.exports.readToken = readToken;
module.exports.toLowerCaseIfNeeded = toLowerCaseIfNeeded;
module.exports.unescapeIdentifier = unescapeIdentifier;
