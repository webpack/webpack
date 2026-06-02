/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const LocConverter = require("../util/LocConverter");
const { makeCacheable } = require("../util/identifier");

// spec: https://drafts.csswg.org/css-syntax/

/**
 * @typedef {object} CssWhitespaceToken
 * @property {"whitespace"} type
 * @property {number} start byte offset of the first whitespace code point
 * @property {number} end byte offset just past the last whitespace code point
 */
/**
 * @typedef {object} CssCommentToken
 * @property {"comment"} type
 * @property {number} start byte offset of the opening `/`
 * @property {number} end byte offset just past the closing `/`
 */
/**
 * @typedef {object} CssStringToken
 * @property {"string"} type
 * @property {number} start byte offset of the opening quote
 * @property {number} end byte offset just past the closing quote (or EOF for unterminated strings)
 */
/**
 * @typedef {object} CssBadStringToken
 * @property {"badStringToken"} type
 * @property {number} start byte offset of the opening quote
 * @property {number} end byte offset where parsing gave up (typically the newline that broke the string)
 */
/**
 * @typedef {object} CssLeftCurlyBracketToken
 * @property {"leftCurlyBracket"} type
 * @property {number} start byte offset of `{`
 * @property {number} end `start + 1`
 */
/**
 * @typedef {object} CssRightCurlyBracketToken
 * @property {"rightCurlyBracket"} type
 * @property {number} start byte offset of `}`
 * @property {number} end `start + 1`
 */
/**
 * @typedef {object} CssLeftSquareBracketToken
 * @property {"leftSquareBracket"} type
 * @property {number} start byte offset of `[`
 * @property {number} end `start + 1`
 */
/**
 * @typedef {object} CssRightSquareBracketToken
 * @property {"rightSquareBracket"} type
 * @property {number} start byte offset of `]`
 * @property {number} end `start + 1`
 */
/**
 * @typedef {object} CssLeftParenthesisToken
 * @property {"leftParenthesis"} type
 * @property {number} start byte offset of `(`
 * @property {number} end `start + 1`
 */
/**
 * @typedef {object} CssRightParenthesisToken
 * @property {"rightParenthesis"} type
 * @property {number} start byte offset of `)`
 * @property {number} end `start + 1`
 */
/**
 * @typedef {object} CssFunctionToken
 * @property {"function"} type
 * @property {number} start byte offset of the function name's first code point
 * @property {number} end byte offset just past the `(` that closes the function token
 */
/**
 * @typedef {object} CssUrlToken
 * @property {"url"} type
 * @property {number} start byte offset of the `url(` keyword (i.e. the `u`)
 * @property {number} end byte offset just past the closing `)` (or EOF)
 * @property {number} contentStart byte offset of the first code point of the unquoted URL content (post leading whitespace)
 * @property {number} contentEnd byte offset just past the last code point of the unquoted URL content (pre trailing whitespace / `)` / EOF)
 */
/**
 * @typedef {object} CssBadUrlToken
 * @property {"badUrlToken"} type
 * @property {number} start byte offset of the `url(` keyword
 * @property {number} end byte offset where parsing gave up (past the recovery `)` or EOF)
 */
/**
 * @typedef {object} CssColonToken
 * @property {"colon"} type
 * @property {number} start byte offset of `:`
 * @property {number} end `start + 1`
 */
/**
 * @typedef {object} CssAtKeywordToken
 * @property {"atKeyword"} type
 * @property {number} start byte offset of `@`
 * @property {number} end byte offset just past the last ident-sequence code point
 */
/**
 * @typedef {object} CssDelimToken
 * @property {"delim"} type
 * @property {number} start byte offset of the delim code point
 * @property {number} end `start + 1`
 */
/**
 * @typedef {object} CssIdentToken
 * @property {"identifier"} type
 * @property {number} start byte offset of the first ident code point
 * @property {number} end byte offset just past the last ident-sequence code point
 */
/**
 * @typedef {object} CssPercentageToken
 * @property {"percentage"} type
 * @property {number} start byte offset of the first numeric code point
 * @property {number} end byte offset just past the `%`
 */
/**
 * @typedef {object} CssNumberToken
 * @property {"number"} type
 * @property {number} start byte offset of the first numeric code point
 * @property {number} end byte offset just past the last numeric code point
 */
/**
 * @typedef {object} CssDimensionToken
 * @property {"dimension"} type
 * @property {number} start byte offset of the first numeric code point
 * @property {number} end byte offset just past the last unit ident code point
 * @property {number} unitStart byte offset of the first unit-ident code point (== end of the numeric run)
 */
/**
 * @typedef {object} CssHashToken
 * @property {"hash"} type
 * @property {number} start byte offset of `#`
 * @property {number} end byte offset just past the last ident-sequence code point
 * @property {boolean} isId true when the hash starts an ident sequence (`#foo`), false for non-ident hashes (`#1abc`)
 */
/**
 * @typedef {object} CssSemicolonToken
 * @property {"semicolon"} type
 * @property {number} start byte offset of `;`
 * @property {number} end `start + 1`
 */
/**
 * @typedef {object} CssCommaToken
 * @property {"comma"} type
 * @property {number} start byte offset of `,`
 * @property {number} end `start + 1`
 */
/**
 * @typedef {object} CssCdoToken
 * @property {"cdo"} type
 * @property {number} start byte offset of `<`
 * @property {number} end byte offset just past `<!--`
 */
/**
 * @typedef {object} CssCdcToken
 * @property {"cdc"} type
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
const CC_LOWER_F = "f".charCodeAt(0);
const CC_LOWER_E = "e".charCodeAt(0);
const CC_LOWER_U = "u".charCodeAt(0);
const CC_LOWER_Z = "z".charCodeAt(0);
const CC_UPPER_A = "A".charCodeAt(0);
const CC_UPPER_F = "F".charCodeAt(0);
const CC_UPPER_E = "E".charCodeAt(0);
const CC_UPPER_U = "U".charCodeAt(0);
const CC_UPPER_Z = "Z".charCodeAt(0);
const CC_0 = "0".charCodeAt(0);
const CC_9 = "9".charCodeAt(0);

const CC_NUMBER_SIGN = "#".charCodeAt(0);
const CC_PLUS_SIGN = "+".charCodeAt(0);
const CC_HYPHEN_MINUS = "-".charCodeAt(0);

const CC_LESS_THAN_SIGN = "<".charCodeAt(0);
const CC_GREATER_THAN_SIGN = ">".charCodeAt(0);

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
const _isSpace = (cc) => cc === CC_TAB || cc === CC_SPACE;

/**
 * @param {number} cc char code
 * @returns {boolean} true, if cc is whitespace (space/tab/newline)
 */
const _isWhiteSpace = (cc) => _isNewline(cc) || _isSpace(cc);

/**
 * ident-start code point per the spec: a letter, a non-ASCII code point,
 * or U+005F LOW LINE (`_`).
 * @param {number} cc char code
 * @returns {boolean} true, if cc is an ident-start code point
 */
const isIdentStartCodePoint = (cc) =>
	(cc >= CC_LOWER_A && cc <= CC_LOWER_Z) ||
	(cc >= CC_UPPER_A && cc <= CC_UPPER_Z) ||
	cc === CC_LOW_LINE ||
	cc >= 0x80;

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
	_isLetter(cc) || cc > 0x80 || cc === CC_LOW_LINE;

/**
 * Spec: ident-code = ident-start / digit / hyphen-minus.
 * @param {number} cc char code
 * @returns {boolean} true, if cc is an ident-sequence code point
 */
const _isIdentCodePoint = (cc) =>
	_isIdentStartCodePointCC(cc) || _isDigit(cc) || cc === CC_HYPHEN_MINUS;

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
	const cc = input.charCodeAt(pos);
	pos++;
	if (pos === input.length) return pos;
	if (_isHexDigit(cc)) {
		for (let i = 0; i < 5; i++) {
			if (_isHexDigit(input.charCodeAt(pos))) pos++;
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
	return _isDigit(first);
};

/**
 * Consume an ident sequence (no validation of the first code points).
 * @param {string} input input
 * @param {number} pos position
 * @returns {number} position just past the last ident-sequence code point
 */
const _consumeAnIdentSequence = (input, pos) => {
	for (;;) {
		const cc = input.charCodeAt(pos);
		pos++;
		if (_isIdentCodePoint(cc)) continue;
		if (_ifTwoCodePointsAreValidEscape(input, pos)) {
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
	if (
		input.charCodeAt(pos) === CC_HYPHEN_MINUS ||
		input.charCodeAt(pos) === CC_PLUS_SIGN
	) {
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
	if (
		(input.charCodeAt(pos) === CC_LOWER_E ||
			input.charCodeAt(pos) === CC_UPPER_E) &&
		(((input.charCodeAt(pos + 1) === CC_HYPHEN_MINUS ||
			input.charCodeAt(pos + 1) === CC_PLUS_SIGN) &&
			_isDigit(input.charCodeAt(pos + 2))) ||
			_isDigit(input.charCodeAt(pos + 1)))
	) {
		pos++;
		if (
			input.charCodeAt(pos) === CC_PLUS_SIGN ||
			input.charCodeAt(pos) === CC_HYPHEN_MINUS
		) {
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
 * Consume comments at `pos`. Yields one `comment` token per `/*…*\/`
 * pair, returns the position just past the last comment.
 * @param {string} input input
 * @param {number} pos position
 * @returns {Generator<CssToken, number, void>} generator that yields comment tokens and returns the post-comments position
 */
function* consumeComments(input, pos) {
	while (
		input.charCodeAt(pos) === CC_SOLIDUS &&
		input.charCodeAt(pos + 1) === CC_ASTERISK
	) {
		const start = pos;
		pos += 2;
		for (;;) {
			if (pos === input.length) return pos;
			if (
				input.charCodeAt(pos) === CC_ASTERISK &&
				input.charCodeAt(pos + 1) === CC_SOLIDUS
			) {
				pos += 2;
				yield { type: "comment", start, end: pos };
				break;
			}
			pos++;
		}
	}
	return pos;
}

/**
 * Whitespace token. Caller advances past the leading code point so
 * `start = pos - 1`.
 * @param {string} input input
 * @param {number} pos position just past the first whitespace code point
 * @returns {Generator<CssToken, number, void>} generator yielding the whitespace token
 */
function* consumeSpace(input, pos) {
	const start = pos - 1;
	while (_isWhiteSpace(input.charCodeAt(pos))) pos++;
	yield { type: "whitespace", start, end: pos };
	return pos;
}

/**
 * Consume a string token. Caller advanced past the opening quote so
 * `pos - 1` holds the ending code point and `pos - 1` is the start.
 * @param {string} input input
 * @param {number} pos position just past the opening quote
 * @returns {Generator<CssToken, number, void>} generator yielding the string (or bad-string) token
 */
function* consumeAStringToken(input, pos) {
	const start = pos - 1;
	const endingCodePoint = input.charCodeAt(pos - 1);
	for (;;) {
		if (pos === input.length) {
			yield { type: "string", start, end: pos };
			return pos;
		}
		const cc = input.charCodeAt(pos);
		pos++;
		if (cc === endingCodePoint) {
			yield { type: "string", start, end: pos };
			return pos;
		}
		if (_isNewline(cc)) {
			pos--;
			yield { type: "badStringToken", start, end: pos };
			return pos;
		}
		if (cc === CC_REVERSE_SOLIDUS) {
			if (pos === input.length) return pos;
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
 * @returns {Generator<CssToken, number, void>} generator yielding the hash or delim
 */
function* consumeNumberSign(input, pos) {
	const start = pos - 1;
	const first = input.charCodeAt(pos);
	const second = input.charCodeAt(pos + 1);
	if (
		_isIdentCodePoint(first) ||
		_ifTwoCodePointsAreValidEscape(input, pos, first, second)
	) {
		const third = input.charCodeAt(pos + 2);
		const isId = _ifThreeCodePointsWouldStartAnIdentSequence(
			input,
			pos,
			first,
			second,
			third
		);
		pos = _consumeAnIdentSequence(input, pos);
		yield { type: "hash", start, end: pos, isId };
		return pos;
	}
	yield { type: "delim", start, end: pos };
	return pos;
}

/**
 * `-` — number / cdc / ident / delim.
 * @param {string} input input
 * @param {number} pos position just past `-`
 * @returns {Generator<CssToken, number, void>} generator yielding the resulting token
 */
function* consumeHyphenMinus(input, pos) {
	if (_ifThreeCodePointsWouldStartANumber(input, pos)) {
		pos--;
		return yield* consumeANumericToken(input, pos);
	}
	if (
		input.charCodeAt(pos) === CC_HYPHEN_MINUS &&
		input.charCodeAt(pos + 1) === CC_GREATER_THAN_SIGN
	) {
		yield { type: "cdc", start: pos - 1, end: pos + 2 };
		return pos + 2;
	}
	if (_ifThreeCodePointsWouldStartAnIdentSequence(input, pos)) {
		pos--;
		return yield* consumeAnIdentLikeToken(input, pos);
	}
	yield { type: "delim", start: pos - 1, end: pos };
	return pos;
}

/**
 * `.` — number or delim.
 * @param {string} input input
 * @param {number} pos position just past `.`
 * @returns {Generator<CssToken, number, void>} generator yielding the resulting token
 */
function* consumeFullStop(input, pos) {
	const start = pos - 1;
	if (_ifThreeCodePointsWouldStartANumber(input, pos)) {
		pos--;
		return yield* consumeANumericToken(input, pos);
	}
	yield { type: "delim", start, end: pos };
	return pos;
}

/**
 * `+` — number or delim.
 * @param {string} input input
 * @param {number} pos position just past `+`
 * @returns {Generator<CssToken, number, void>} generator yielding the resulting token
 */
function* consumePlusSign(input, pos) {
	const start = pos - 1;
	if (_ifThreeCodePointsWouldStartANumber(input, pos)) {
		pos--;
		return yield* consumeANumericToken(input, pos);
	}
	yield { type: "delim", start, end: pos };
	return pos;
}

/**
 * Numeric token: number / percentage / dimension.
 * @param {string} input input
 * @param {number} pos position at the first numeric/sign code point
 * @returns {Generator<CssToken, number, void>} generator yielding the numeric token
 */
function* consumeANumericToken(input, pos) {
	const start = pos;
	pos = _consumeANumber(input, pos);
	const first = input.charCodeAt(pos);
	const second = input.charCodeAt(pos + 1);
	const third = input.charCodeAt(pos + 2);
	if (
		_ifThreeCodePointsWouldStartAnIdentSequence(
			input,
			pos,
			first,
			second,
			third
		)
	) {
		const unitStart = pos;
		pos = _consumeAnIdentSequence(input, pos);
		yield { type: "dimension", start, end: pos, unitStart };
		return pos;
	}
	if (first === CC_PERCENTAGE) {
		yield { type: "percentage", start, end: pos + 1 };
		return pos + 1;
	}
	yield { type: "number", start, end: pos };
	return pos;
}

/**
 * Consume an unquoted url token. Caller has already eaten `url(` and
 * any leading whitespace.
 * @param {string} input input
 * @param {number} pos position at the first content code point
 * @param {number} fnStart byte offset of the `u` in `url(`
 * @returns {Generator<CssToken, number, void>} generator yielding the url / bad-url token
 */
function* consumeAUrlToken(input, pos, fnStart) {
	while (_isWhiteSpace(input.charCodeAt(pos))) pos++;
	const contentStart = pos;
	for (;;) {
		if (pos === input.length) {
			yield {
				type: "url",
				start: fnStart,
				end: pos,
				contentStart,
				contentEnd: pos - 1
			};
			return pos;
		}
		const cc = input.charCodeAt(pos);
		pos++;
		if (cc === CC_RIGHT_PARENTHESIS) {
			yield {
				type: "url",
				start: fnStart,
				end: pos,
				contentStart,
				contentEnd: pos - 1
			};
			return pos;
		}
		if (_isWhiteSpace(cc)) {
			const end = pos - 1;
			while (_isWhiteSpace(input.charCodeAt(pos))) pos++;
			if (pos === input.length) {
				yield {
					type: "url",
					start: fnStart,
					end: pos,
					contentStart,
					contentEnd: end
				};
				return pos;
			}
			if (input.charCodeAt(pos) === CC_RIGHT_PARENTHESIS) {
				pos++;
				yield {
					type: "url",
					start: fnStart,
					end: pos,
					contentStart,
					contentEnd: end
				};
				return pos;
			}
			pos = _consumeTheRemnantsOfABadUrl(input, pos);
			yield { type: "badUrlToken", start: fnStart, end: pos };
			return pos;
		}
		if (
			cc === CC_QUOTATION_MARK ||
			cc === CC_APOSTROPHE ||
			cc === CC_LEFT_PARENTHESIS ||
			_isNonPrintableCodePoint(cc)
		) {
			pos = _consumeTheRemnantsOfABadUrl(input, pos);
			yield { type: "badUrlToken", start: fnStart, end: pos };
			return pos;
		}
		if (cc === CC_REVERSE_SOLIDUS) {
			if (_ifTwoCodePointsAreValidEscape(input, pos)) {
				pos = _consumeAnEscapedCodePoint(input, pos);
			} else {
				pos = _consumeTheRemnantsOfABadUrl(input, pos);
				yield { type: "badUrlToken", start: fnStart, end: pos };
				return pos;
			}
		}
	}
}

/**
 * Consume an ident-like token: ident / function / url / bad-url.
 * @param {string} input input
 * @param {number} pos position at the first ident-start code point
 * @returns {Generator<CssToken, number, void>} generator yielding the resulting token
 */
function* consumeAnIdentLikeToken(input, pos) {
	const start = pos;
	pos = _consumeAnIdentSequence(input, pos);
	if (
		input.slice(start, pos).toLowerCase() === "url" &&
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
			yield { type: "function", start, end };
			// Resume at `end` (the `(`'s closer position), not at `pos` —
			// the lookahead-eaten whitespace must be re-tokenized as a
			// whitespace token rather than swallowed silently.
			return end;
		}
		return yield* consumeAUrlToken(input, pos, start);
	}
	if (input.charCodeAt(pos) === CC_LEFT_PARENTHESIS) {
		pos++;
		yield { type: "function", start, end: pos };
		return pos;
	}
	yield { type: "identifier", start, end: pos };
	return pos;
}

/**
 * `<` — CDO or delim.
 * @param {string} input input
 * @param {number} pos position just past `<`
 * @returns {Generator<CssToken, number, void>} generator yielding cdo / delim
 */
function* consumeLessThan(input, pos) {
	if (input.slice(pos, pos + 3) === "!--") {
		yield { type: "cdo", start: pos - 1, end: pos + 3 };
		return pos + 3;
	}
	yield { type: "delim", start: pos - 1, end: pos };
	return pos;
}

/**
 * `@` — at-keyword or delim.
 * @param {string} input input
 * @param {number} pos position just past `@`
 * @returns {Generator<CssToken, number, void>} generator yielding at-keyword / delim
 */
function* consumeCommercialAt(input, pos) {
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
		yield { type: "atKeyword", start, end: pos };
		return pos;
	}
	yield { type: "delim", start, end: pos };
	return pos;
}

/**
 * `\` — escape starts an ident-like token, otherwise it's a delim.
 * @param {string} input input
 * @param {number} pos position just past `\`
 * @returns {Generator<CssToken, number, void>} generator yielding ident-like / delim
 */
function* consumeReverseSolidus(input, pos) {
	if (_ifTwoCodePointsAreValidEscape(input, pos)) {
		pos--;
		return yield* consumeAnIdentLikeToken(input, pos);
	}
	yield { type: "delim", start: pos - 1, end: pos };
	return pos;
}

/**
 * Per-character dispatcher. The outer loop has already advanced past
 * the lead code point (`pos - 1` is the lead).
 * @param {string} input input
 * @param {number} pos position just past the lead code point
 * @returns {Generator<CssToken, number, void>} generator yielding the resulting token
 */
function* consumeAToken(input, pos) {
	const cc = input.charCodeAt(pos - 1);
	switch (cc) {
		case CC_LINE_FEED:
		case CC_CARRIAGE_RETURN:
		case CC_FORM_FEED:
		case CC_TAB:
		case CC_SPACE:
			return yield* consumeSpace(input, pos);
		case CC_QUOTATION_MARK:
		case CC_APOSTROPHE:
			return yield* consumeAStringToken(input, pos);
		case CC_NUMBER_SIGN:
			return yield* consumeNumberSign(input, pos);
		case CC_LEFT_PARENTHESIS:
			yield { type: "leftParenthesis", start: pos - 1, end: pos };
			return pos;
		case CC_RIGHT_PARENTHESIS:
			yield { type: "rightParenthesis", start: pos - 1, end: pos };
			return pos;
		case CC_PLUS_SIGN:
			return yield* consumePlusSign(input, pos);
		case CC_COMMA:
			yield { type: "comma", start: pos - 1, end: pos };
			return pos;
		case CC_HYPHEN_MINUS:
			return yield* consumeHyphenMinus(input, pos);
		case CC_FULL_STOP:
			return yield* consumeFullStop(input, pos);
		case CC_COLON:
			yield { type: "colon", start: pos - 1, end: pos };
			return pos;
		case CC_SEMICOLON:
			yield { type: "semicolon", start: pos - 1, end: pos };
			return pos;
		case CC_LESS_THAN_SIGN:
			return yield* consumeLessThan(input, pos);
		case CC_AT_SIGN:
			return yield* consumeCommercialAt(input, pos);
		case CC_LEFT_SQUARE:
			yield { type: "leftSquareBracket", start: pos - 1, end: pos };
			return pos;
		case CC_REVERSE_SOLIDUS:
			return yield* consumeReverseSolidus(input, pos);
		case CC_RIGHT_SQUARE:
			yield { type: "rightSquareBracket", start: pos - 1, end: pos };
			return pos;
		case CC_LEFT_CURLY:
			yield { type: "leftCurlyBracket", start: pos - 1, end: pos };
			return pos;
		case CC_RIGHT_CURLY:
			yield { type: "rightCurlyBracket", start: pos - 1, end: pos };
			return pos;
		default:
			if (_isDigit(cc)) {
				pos--;
				return yield* consumeANumericToken(input, pos);
			}
			if (cc === CC_LOWER_U || cc === CC_UPPER_U) {
				// Unicode-range tokens are not produced — fall back to
				// ident-like to match the existing tokenizer's behaviour.
				pos--;
				return yield* consumeAnIdentLikeToken(input, pos);
			}
			if (isIdentStartCodePoint(cc)) {
				pos--;
				return yield* consumeAnIdentLikeToken(input, pos);
			}
			// EOF is impossible here (caller guarded with the outer
			// loop's `pos < input.length` check). Anything else: delim.
			yield { type: "delim", start: pos - 1, end: pos };
			return pos;
	}
}

// AST shape mirrors tabatkins/parse-css (the CSS Syntax Level 3 reference), with two deviations: nodes carry a `range` byte offset pair + a lazy `loc` getter, and have no methods beyond it.

const CC_EXCLAMATION = "!".charCodeAt(0);

// Token / node `type` discriminators (spec name where it has one, else parse-css's kebab style).
const T_IDENT = "Ident";
const T_FUNCTION = "Function";
const T_AT_KEYWORD = "AtKeyword";
const T_HASH = "Hash";
const T_STRING = "String";
const T_BAD_STRING = "BadString";
const T_URL = "Url";
const T_BAD_URL = "BadUrl";
const T_DELIM = "Delim";
const T_NUMBER = "Number";
const T_PERCENTAGE = "Percentage";
const T_DIMENSION = "Dimension";
const T_WHITESPACE = "Whitespace";
const T_COLON = "Colon";
const T_SEMICOLON = "Semicolon";
const T_COMMA = "Comma";
// Preserved tokens for stray closers / CDO / CDC (kept as component values per §5.4.8 "consume a token and return it").
const T_RIGHT_PARENTHESIS = "RightParenthesis";
const T_RIGHT_SQUARE_BRACKET = "RightSquareBracket";
const T_RIGHT_CURLY_BRACKET = "RightCurlyBracket";
const T_CDO = "CDO";
const T_CDC = "CDC";
const T_SIMPLE_BLOCK = "SimpleBlock";
const T_DECLARATION = "Declaration";
const T_AT_RULE = "AtRule";
const T_QUALIFIED_RULE = "QualifiedRule";
const T_STYLESHEET = "Stylesheet";

/**
 * Base AST node. All concrete nodes (tokens, simple blocks, functions,
 * declarations) inherit from this and carry the `[start, end)` byte `range`
 * of the source slice they cover. `loc` is computed on demand from a
 * shared `LocConverter` so we don't pay for line/column conversion until
 * a consumer (warning, error, dependency) actually needs it.
 */
class Node {
	/**
	 * @param {string} type node type discriminator
	 * @param {[number, number]} range `[start, end)` byte range
	 * @param {LocConverter} locConverter shared loc converter
	 */
	constructor(type, range, locConverter) {
		this.type = type;
		this.range = range;
		this._locConverter = locConverter;
	}

	get loc() {
		const lc = this._locConverter;
		// `LocConverter#get` mutates and returns the converter itself, so we
		// must snapshot `line`/`column` between the two calls.
		const s = lc.get(this.range[0]);
		const sl = s.line;
		const sc = s.column;
		const e = lc.get(this.range[1]);
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
		return this._locConverter._input.slice(this.range[0], this.range[1]);
	}
}

/**
 * Leaf token node — the only `Node` subclass. `value` is the raw source slice
 * (identifier text, quoted string including quotes, a dimension's full `123px`,
 * …). Token-specific extras are named by the `HashToken` / `UrlToken` shape
 * typedefs below; there are no further token classes.
 */
class Token extends Node {
	/**
	 * @param {string} type node type
	 * @param {string} value raw source slice
	 * @param {[number, number]} range `[start, end)` byte range
	 * @param {LocConverter} locConverter shared loc converter
	 */
	constructor(type, value, range, locConverter) {
		super(type, range, locConverter);
		this.value = value;
	}
}

/**
 * Build a non-token AST node (function, simple block, declaration, at-rule,
 * qualified rule): one `Node` instance carrying the `type` discriminator plus
 * the shape-specific `fields`. There is a single runtime class — the
 * `@typedef`s below name each compile-time shape for DX, and callers cast the
 * result to the matching shape.
 * @param {string} type node type discriminator
 * @param {[number, number]} range `[start, end)` byte range
 * @param {LocConverter} locConverter shared loc converter
 * @param {object} fields shape-specific fields assigned onto the node
 * @returns {Node} the assembled node
 */
const makeNode = (type, range, locConverter, fields) =>
	Object.assign(new Node(type, range, locConverter), fields);

/**
 * Spec-style precondition check. The CSS Syntax algorithms phrase their entry
 * preconditions as "Assert: the next token is …". Today this is a non-throwing
 * guard returning `false` on failure so the consume function can bail to
 * `undefined`; a future option may turn it into a thrown error.
 * @param {unknown} cond condition that must hold
 * @returns {boolean} true when the precondition holds
 */
const assertSpec = (cond) => {
	if (cond) return true;
	// Future: throw when a strict-asserts option is enabled.
	return false;
};

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
 * Number token (`123`, `-1.5`, `+2e3`). `value` is the raw source slice (the spec's "value" — useful for round-tripping). `numericValue` is the parsed Number; `typeFlag` is "integer" or "number" (spec); `sign` is "+"/"-"/"" (spec).
 * @typedef {Token & { numericValue: number, typeFlag: "integer" | "number", sign: "+" | "-" | "" }} NumberToken
 */

/**
 * Percentage token (`50%`). `value` is the raw source slice including the `%`. `numericValue` is the parsed Number (without `%`); `sign` is "+"/"-"/"".
 * @typedef {Token & { numericValue: number, sign: "+" | "-" | "" }} PercentageToken
 */

/**
 * Dimension token (`100px`, `1.5em`). `value` is the raw source slice (number + unit). `numericValue` / `typeFlag` / `sign` are as for `NumberToken`; `unit` is the dimension's unit (lower-cased per spec).
 * @typedef {Token & { numericValue: number, typeFlag: "integer" | "number", sign: "+" | "-" | "", unit: string }} DimensionToken
 */

/**
 * Function node: `name(component-values...)`. `name` is the raw source slice
 * before the `(` (callers lowercase / unescape as needed); `nameRange` is its
 * `[start, end)`; `value` is the component values inside the parentheses.
 * @typedef {Node & { name: string, nameRange: [number, number], value: ComponentValue[] }} FunctionNode
 */

/** @typedef {"[" | "(" | "{"} SimpleBlockToken */

/**
 * Simple block (`[...]`, `(...)` not preceded by an ident, `{...}`). `token` is
 * the opening character. `value` is the component values inside — except an
 * at-rule / qualified-rule body block (produced by `consumeABlock`, §5.4.4),
 * whose `value` holds the parsed `Declaration` / `AtRule` / `QualifiedRule`
 * contents of the `{ … }`.
 * @typedef {Node & { token: SimpleBlockToken, value: (ComponentValue | Declaration | AtRule | QualifiedRule)[] }} SimpleBlock
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
 * @typedef {Node & { name: string, nameRange: [number, number], value: ComponentValue[], important: boolean }} Declaration
 */

/**
 * At-rule: `@name <prelude> ;` or `@name <prelude> { ... }`. `name` is the
 * at-keyword without the leading `@`; `prelude` is the component values up to
 * the at-rule's `;` / block / enclosing `}`. Per §5.4.2 the block is consumed:
 * `block` is the `{ … }` (its parsed contents) with `range[1]` past `}`, or
 * `null` for a `;`-terminated at-rule with `range[1]` at the `;` / `}` / EOF
 * (callers check the byte at `range[1]` to tell them apart).
 * @typedef {Node & { name: string, nameRange: [number, number], prelude: ComponentValue[], block: SimpleBlock | null }} AtRule
 */

/**
 * Qualified rule: `<prelude> { <block> }`. `prelude` is the component values
 * before the `{` (selectors, keyframe parameters, …); `block` is the `{ ... }`
 * body, or `null` when EOF was hit before `{` (a parse error — such partial
 * rules are dropped by callers).
 * @typedef {Node & { prelude: ComponentValue[], block: SimpleBlock | null }} QualifiedRule
 */

/**
 * Stylesheet (CSS Syntax §5.3.4): the result of `parseAStylesheet`. `rules`
 * holds the top-level at-rules / qualified rules (top-level declarations are
 * parse errors and never produced).
 * @typedef {Node & { rules: Rule[] }} Stylesheet
 */

/**
 * Materialize a single non-block, non-function `CssToken` as its leaf AST node — the spec's "consume a token" result (§5.4.8 "anything else"), preserving stray closers / CDO / CDC.
 * @param {CssToken} t token from the lexer
 * @param {string} input source
 * @param {LocConverter} locConverter shared loc converter
 * @returns {Token} the leaf token node
 */
const tokenToNode = (t, input, locConverter) => {
	const range = /** @type {[number, number]} */ ([t.start, t.end]);
	switch (t.type) {
		case "whitespace":
			return new Token(
				T_WHITESPACE,
				input.slice(t.start, t.end),
				range,
				locConverter
			);
		case "identifier":
			return new Token(
				T_IDENT,
				input.slice(t.start, t.end),
				range,
				locConverter
			);
		case "string":
			return new Token(
				T_STRING,
				input.slice(t.start, t.end),
				range,
				locConverter
			);
		case "delim":
			return new Token(
				T_DELIM,
				input.slice(t.start, t.end),
				range,
				locConverter
			);
		case "number": {
			const raw = input.slice(t.start, t.end);
			const num = /** @type {NumberToken} */ (
				new Token(T_NUMBER, raw, range, locConverter)
			);
			num.numericValue = Number(raw);
			num.typeFlag =
				raw.includes(".") || /[eE]/.test(raw) ? "number" : "integer";
			num.sign =
				raw[0] === "+" || raw[0] === "-"
					? /** @type {"+" | "-"} */ (raw[0])
					: "";
			return num;
		}
		case "percentage": {
			const raw = input.slice(t.start, t.end);
			const pct = /** @type {PercentageToken} */ (
				new Token(T_PERCENTAGE, raw, range, locConverter)
			);
			const numPart = raw.slice(0, -1);
			pct.numericValue = Number(numPart);
			pct.sign =
				numPart[0] === "+" || numPart[0] === "-"
					? /** @type {"+" | "-"} */ (numPart[0])
					: "";
			return pct;
		}
		case "dimension": {
			const raw = input.slice(t.start, t.end);
			const numPart = input.slice(t.start, t.unitStart);
			const dim = /** @type {DimensionToken} */ (
				new Token(T_DIMENSION, raw, range, locConverter)
			);
			dim.numericValue = Number(numPart);
			dim.typeFlag =
				numPart.includes(".") || /[eE]/.test(numPart) ? "number" : "integer";
			dim.sign =
				numPart[0] === "+" || numPart[0] === "-"
					? /** @type {"+" | "-"} */ (numPart[0])
					: "";
			dim.unit = input.slice(t.unitStart, t.end).toLowerCase();
			return dim;
		}
		case "hash": {
			const hash = /** @type {HashToken} */ (
				new Token(T_HASH, input.slice(t.start + 1, t.end), range, locConverter)
			);
			hash.typeFlag = t.isId ? "id" : "unrestricted";
			return hash;
		}
		case "atKeyword":
			return new Token(
				T_AT_KEYWORD,
				input.slice(t.start + 1, t.end),
				range,
				locConverter
			);
		case "url": {
			const url = /** @type {UrlToken} */ (
				new Token(
					T_URL,
					input.slice(t.contentStart, t.contentEnd),
					range,
					locConverter
				)
			);
			url.contentStart = t.contentStart;
			url.contentEnd = t.contentEnd;
			return url;
		}
		case "badStringToken":
			return new Token(
				T_BAD_STRING,
				input.slice(t.start, t.end),
				range,
				locConverter
			);
		case "badUrlToken":
			return new Token(
				T_BAD_URL,
				input.slice(t.start, t.end),
				range,
				locConverter
			);
		case "colon":
			return new Token(T_COLON, ":", range, locConverter);
		case "comma":
			return new Token(T_COMMA, ",", range, locConverter);
		case "semicolon":
			return new Token(T_SEMICOLON, ";", range, locConverter);
		// Stray closers / CDO / CDC reach here only on malformed input; the spec
		// preserves them as component values ("consume a token and return it").
		case "rightParenthesis":
			return new Token(T_RIGHT_PARENTHESIS, ")", range, locConverter);
		case "rightSquareBracket":
			return new Token(T_RIGHT_SQUARE_BRACKET, "]", range, locConverter);
		case "rightCurlyBracket":
			return new Token(T_RIGHT_CURLY_BRACKET, "}", range, locConverter);
		case "cdo":
			return new Token(T_CDO, "<!--", range, locConverter);
		case "cdc":
			return new Token(T_CDC, "-->", range, locConverter);
		default:
			// `(` / `[` / `{` / function are routed to block / function before
			// here, comments are filtered by the stream, and EOF is guarded by
			// callers — so this is unreachable.
			throw new Error(`Unexpected token type "${t.type}"`);
	}
};

/**
 * The `<eof-token>` (CSS Syntax §4) — the final token the tokenizer yields and
 * the one `TokenStream#next` keeps returning once the source is exhausted.
 * `start`/`end` both point at the post-EOF byte offset so callers can use it as
 * the terminating position.
 * @typedef {{ type: "EOF", start: number, end: number }} EofToken
 */

/**
 * Position-based view over the lexer — webpack's stand-in for the spec's
 * "normalize into a token stream" (CSS Syntax §9). It unifies the lexer and the
 * stream in one class: the `tokenize` method is the token generator (the CSS
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
 * the grammar, so a different language can subclass it (overriding `tokenize`)
 * to drive the same visitor machinery.
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
		this.input = input;
		this.locConverter = locConverter;
		this._onComment = onComment;
		// Byte offset where the next token is tokenized from.
		this._pos = pos;
		// Comments before this offset have already fired `onComment`; a
		// re-tokenized (backtracked) span never re-fires them.
		this._commentHigh = pos;
		/** @type {CssToken | EofToken | undefined} the next token, lazily tokenized */
		this._next = undefined;
		/** @type {number[]} byte offsets to rewind to */
		this._marks = [];
	}

	/**
	 * The CSS tokenizer (CSS Syntax Level 3 §4): a generator yielding every
	 * `CssToken` in `this.input` from `pos` in source order — comment and
	 * whitespace tokens included — and ending with an `<eof-token>` (CSS Syntax
	 * §4: the token stream's final token). `next` pulls one token at a time from
	 * it (filtering comments); iterating it directly
	 * (`new TokenStream(src).tokenize()`) yields the raw token list. Override in
	 * a subclass to drive a different language through the same `SourceProcessor`
	 * machinery.
	 * @param {number=} pos starting byte offset (default `0`)
	 * @returns {Generator<CssToken | EofToken, void, void>} generator yielding every CSS token in `this.input`, then the `<eof-token>`
	 */
	*tokenize(pos = 0) {
		const input = this.input;
		while (pos < input.length) {
			pos = yield* consumeComments(input, pos);
			if (pos >= input.length) break;
			pos++;
			pos = yield* consumeAToken(input, pos);
		}
		yield { type: "EOF", start: pos, end: pos };
	}

	/**
	 * The next token (CSS Syntax §3 "next token") — the upcoming token without
	 * consuming it; the `<eof-token>` once the source is exhausted. This is the
	 * token the consume algorithms dispatch on (the spec's "process"). Tokenized
	 * from `_pos` on first use and cached until consumed; comment tokens are
	 * skipped here, firing `onComment` once each.
	 * @returns {CssToken | EofToken} the next token
	 */
	next() {
		if (this._next === undefined) {
			for (const t of this.tokenize(this._pos)) {
				if (t.type === "comment") {
					if (t.start >= this._commentHigh) {
						if (this._onComment) this._onComment(this.input, t.start, t.end);
						this._commentHigh = t.end;
					}
					continue;
				}
				this._next = t;
				break;
			}
		}
		return /** @type {CssToken | EofToken} */ (this._next);
	}

	/**
	 * Consume a token (CSS Syntax §3 "consume a token") — return the next token
	 * and advance the cursor past it.
	 * @returns {CssToken | EofToken} the consumed token
	 */
	consume() {
		const t = this.next();
		if (t.type !== "EOF") {
			this._pos = t.end;
			this._next = undefined;
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
		if (t.type !== "EOF") {
			this._pos = t.end;
			this._next = undefined;
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
		this._next = undefined;
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
 * @typedef {object} ParseListOptions
 * @property {((input: string, start: number, end: number) => number)=} comment optional comment-token callback; the public `parse*` entry points use it to build the `TokenStream` so the outer parser's comment tracker still sees magic comments inside the consumed range
 */

/**
 * Parse a stylesheet, CSS Syntax Level 3
 * [§5.3.4](https://drafts.csswg.org/css-syntax/#parse-stylesheet).
 * @param {string | TokenStream} input source string or an existing token stream
 * @param {((input: string, start: number, end: number) => number)=} comment optional comment-token callback (string input only)
 * @returns {Stylesheet} the parsed stylesheet
 */
const parseAStylesheet = (input, comment) => {
	// 1. If input is a byte stream for a stylesheet, decode bytes from input, and set input to the result.
	// 2. Normalize input, and set input to the result.
	const ts = normalizeIntoTokenStream(input, 0, comment);
	// 3. Create a new stylesheet, with its location set to location (or null, if location was not passed).
	const start = ts.next().start;
	const stylesheet = /** @type {Stylesheet} */ (
		makeNode(T_STYLESHEET, [start, start], ts.locConverter, {
			rules: /** @type {Rule[]} */ ([])
		})
	);
	// 4. Consume a stylesheet's contents from input, and set the stylesheet's rules to the result.
	stylesheet.rules = consumeAStylesheetsContents(ts);
	stylesheet.range[1] = ts.next().start;
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
 * @param {((input: string, start: number, end: number) => number)=} comment optional comment-token callback (string input only)
 * @returns {Rule[]} top-level rules
 */
const parseAStylesheetsContents = (input, comment) => {
	// 1. Normalize input, and set input to the result.
	const ts = normalizeIntoTokenStream(input, 0, comment);
	// 2. Consume a stylesheet’s contents from input, and return the result.
	return consumeAStylesheetsContents(ts);
};

/**
 * Parse a block's contents, CSS Syntax Level 3
 * [§5.3.6](https://drafts.csswg.org/css-syntax/#parse-block-contents).
 * @param {string | TokenStream} input source string or an existing token stream
 * @param {number=} pos start position (string input only; just past the opening `{`, or 0)
 * @param {((input: string, start: number, end: number) => number)=} comment optional comment-token callback (string input only)
 * @returns {(Declaration | Rule)[]} block contents
 */
const parseABlocksContents = (input, pos, comment) => {
	// 1. Normalize input, and set input to the result.
	const ts = normalizeIntoTokenStream(input, pos, comment);
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
 * @param {((input: string, start: number, end: number) => number)=} comment optional comment-token callback (string input only)
 * @returns {Rule | undefined} the parsed rule
 */
const parseARule = (input, pos, comment) => {
	// 1. Normalize input, and set input to the result.
	const ts = normalizeIntoTokenStream(input, pos, comment);
	// 2. Discard whitespace from input.
	while (ts.next().type === "whitespace") ts.discard();
	// 3. If the next token from input is an <EOF-token>, return a syntax error.
	// Otherwise, if the next token from input is an <at-keyword-token>, consume an at-rule from input, and let rule be the return value.
	// Otherwise, consume a qualified rule from input and let rule be the return value.
	// If nothing or an invalid rule error was returned, return a syntax error.
	const head = ts.next();
	if (head.type === "EOF") return undefined;
	const rule =
		head.type === "atKeyword" ? consumeAnAtRule(ts) : consumeAQualifiedRule(ts);
	if (!rule) return undefined;
	// 4. Discard whitespace from input.
	while (ts.next().type === "whitespace") ts.discard();
	// 5. If the next token from input is an <EOF-token>, return rule. Otherwise, return a syntax error.
	return ts.next().type === "EOF" ? rule : undefined;
};

/**
 * Parse a declaration, CSS Syntax Level 3
 * [§5.3.8](https://drafts.csswg.org/css-syntax/#parse-declaration).
 * @param {string | TokenStream} input source string or an existing token stream
 * @param {number=} pos start position (string input only)
 * @param {((input: string, start: number, end: number) => number)=} comment optional comment-token callback (string input only)
 * @returns {Declaration | undefined} the parsed declaration, or undefined
 */
const parseADeclaration = (input, pos, comment) => {
	// 1. Normalize input, and set input to the result.
	const ts = normalizeIntoTokenStream(input, pos, comment);
	// 2. Discard whitespace from input.
	while (ts.next().type === "whitespace") ts.discard();
	// 3. Consume a declaration from input. If anything was returned, return it. Otherwise, return a syntax error.
	return consumeADeclaration(ts);
};

/**
 * Parse a component value, CSS Syntax Level 3 [§5.3.9](https://drafts.csswg.org/css-syntax/#parse-component-value) — strict entry point that consumes one value and returns `undefined` if non-whitespace input trails (use `consumeAComponentValue` for "one value, ignore the rest").
 * @param {string | TokenStream} input source string or an existing token stream
 * @param {number=} pos start position (string input only)
 * @param {{ comment?: (input: string, start: number, end: number) => number }=} options optional comment-token callback (string input only)
 * @returns {ComponentValue | undefined} the parsed component value, or `undefined` on empty / trailing-garbage input
 */
const parseAComponentValue = (input, pos, options = {}) => {
	// 1. Normalize input, and set input to the result.
	const ts = normalizeIntoTokenStream(input, pos, options.comment);
	// 2. Discard whitespace from input.
	while (ts.next().type === "whitespace") ts.discard();
	// 3. If input is empty, return a syntax error.
	if (ts.next().type === "EOF") return undefined;
	// 4. Consume a component value from input and let value be the return value.
	const result = consumeAComponentValue(ts);
	// 5. Discard whitespace from input.
	while (ts.next().type === "whitespace") ts.discard();
	// 6. If input is empty, return value. Otherwise, return a syntax error.
	if (ts.next().type === "EOF") return result;
	return undefined;
};

/**
 * Parse a list of component values, CSS Syntax Level 3
 * [§5.3.10](https://drafts.csswg.org/css-syntax/#parse-list-of-components).
 * @param {string | TokenStream} input source string or an existing token stream
 * @param {number=} pos start position (string input only)
 * @param {ParseListOptions=} options comment callback
 * @returns {ComponentValue[]} component values
 */
const parseAListOfComponentValues = (input, pos, options = {}) => {
	// 1. Normalize input, and set input to the result.
	const ts = normalizeIntoTokenStream(input, pos, options.comment);
	// 2. Consume a list of component values from input, and return the result.
	return consumeAListOfComponentValues(ts);
};

/**
 * Parse a comma-separated list of component values, CSS Syntax Level 3 [§5.3.11](https://drafts.csswg.org/css-syntax/#parse-comma-list) — consumes one `<comma-token>`-stopped group of component values per iteration until EOF.
 * @param {string | TokenStream} input source string or an existing token stream
 * @param {number=} pos start position (string input only)
 * @param {ParseListOptions=} options comment callback
 * @returns {ComponentValue[][]} comma-separated groups of component values
 */
const parseACommaSeparatedListOfComponentValues = (
	input,
	pos,
	options = {}
) => {
	// 1. Normalize input, and set input to the result.
	const ts = normalizeIntoTokenStream(input, pos, options.comment);
	// 2. Let groups be an empty list.
	/** @type {ComponentValue[][]} */
	const groups = [];
	// 3. While input is not empty:
	while (ts.next().type !== "EOF") {
		// 3.1. Consume a list of component values from input, with <comma-token> as the stop token, and append the result to groups.
		groups.push(consumeAListOfComponentValues(ts, "comma"));
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
 * @param {TokenStream} ts token stream
 * @returns {Rule[]} top-level rules
 */
const consumeAStylesheetsContents = (ts) => {
	// Let rules be an initially empty list of rules.
	/** @type {Rule[]} */
	const rules = [];

	// Process input
	for (;;) {
		const t = ts.next();
		// <whitespace-token> / <CDO-token> / <CDC-token>
		// Discard a token from input.
		if (t.type === "whitespace" || t.type === "cdo" || t.type === "cdc") {
			ts.discard();
		}
		// <EOF-token>
		// Return rules.
		else if (t.type === "EOF") {
			return rules;
		}
		// <at-keyword-token>
		// Consume an at-rule from input. If anything is returned, append it to rules.
		else if (t.type === "atKeyword") {
			const at = consumeAnAtRule(ts);
			if (at) rules.push(at);
		}
		// anything else
		// Consume a qualified rule from input. If a rule is returned, append it to rules.
		else {
			const rule = consumeAQualifiedRule(ts);
			if (rule) rules.push(rule);
		}
	}
};

/**
 * Consume an at-rule, CSS Syntax Level 3 [§5.4.2](https://drafts.csswg.org/css-syntax/#consume-at-rule) — the next token must be an <at-keyword-token> (asserted); consumes the prelude up to `;` / `{` / `}` / EOF; `{` consumes the block (§5.4.4) onto `.block`, `;` / EOF is discarded, a top-level `}` (when not `nested`) is appended via `consumeAComponentValue`.
 * @param {TokenStream} ts token stream
 * @param {boolean=} nested true inside a `{}` block — a top-level `}` ends the at-rule (left for the caller)
 * @returns {AtRule | undefined} parsed at-rule, or `undefined` if the precondition assert failed
 */
const consumeAnAtRule = (ts, nested = false) => {
	const { input, locConverter } = ts;
	// Assert: the next token is an <at-keyword-token>.
	if (!assertSpec(ts.next().type === "atKeyword")) return undefined;
	// Consume a token from input, and let rule be a new at-rule with its name set to the returned token’s value, its prelude initially set to an empty list, and no declarations or child rules.
	const head = ts.consume();
	const start = head.start;
	const nameEnd = head.end;
	const rule = /** @type {AtRule} */ (
		makeNode(T_AT_RULE, [start, nameEnd], locConverter, {
			name: input.slice(start + 1, nameEnd),
			nameRange: [start, nameEnd],
			prelude: /** @type {ComponentValue[]} */ ([]),
			block: null
		})
	);

	// Process input
	for (;;) {
		const t = ts.next();

		// <semicolon-token>
		// <EOF-token>
		// Discard a token from input. If rule is valid in the current context, return it; otherwise return nothing.
		if (t.type === "semicolon" || t.type === "EOF") {
			ts.discard();
			rule.range[1] = t.start;
			return rule;
		}
		// <}-token>
		// If nested is true: if rule is valid in the current context, return it; otherwise return nothing.
		// Otherwise, consume a token and append the result to rule’s prelude.
		else if (t.type === "rightCurlyBracket") {
			if (nested) {
				rule.range[1] = t.start;
				return rule;
			}
			rule.prelude.push(consumeATokenAsNode(ts));
			continue;
		}
		// <{-token>
		// Consume a block from input, and assign the result to rule’s child rules.
		else if (t.type === "leftCurlyBracket") {
			const block = consumeABlock(ts);
			if (block) {
				rule.block = block;
				rule.range[1] = block.range[1];
			}
			return rule;
		}

		// anything else
		// Consume a component value from input and append the returned value to rule’s prelude.
		rule.prelude.push(consumeAComponentValue(ts));
	}
};

/**
 * Consume a qualified rule, CSS Syntax Level 3 [§5.4.3](https://drafts.csswg.org/css-syntax/#consume-qualified-rule) — consumes the prelude (each component value via `consumeAComponentValue`) up to its `{` block; EOF, the optional `stopToken`, or a nested top-level `}` is a parse error returning nothing (the block-less prelude is dropped), while a non-nested top-level `}` is consumed as a parse error and the prelude continues. A returned rule always has a block.
 * @param {TokenStream} ts token stream
 * @param {string=} stopToken token type that ends the prelude (parse error → nothing)
 * @param {boolean=} nested true inside a `{}` block — a top-level `}` ends the rule (left for the caller)
 * @returns {QualifiedRule | undefined} parsed qualified rule, or `undefined` on a parse error
 */
const consumeAQualifiedRule = (ts, stopToken, nested = false) => {
	const { locConverter } = ts;
	const start = ts.next().start;
	// Let rule be a new qualified rule with its prelude, declarations, and child rules all initially set to empty lists.
	const rule = /** @type {QualifiedRule} */ (
		makeNode(T_QUALIFIED_RULE, [start, start], locConverter, {
			prelude: /** @type {ComponentValue[]} */ ([]),
			block: null
		})
	);

	// Process input
	for (;;) {
		const t = ts.next();
		// <EOF-token>
		// stop token (if passed)
		// This is a parse error. Return nothing.
		if (t.type === "EOF" || t.type === stopToken) {
			return undefined;
		}
		// <}-token>
		// This is a parse error. If nested is true, return nothing. Otherwise, consume a token and append the result to rule’s prelude.
		else if (t.type === "rightCurlyBracket") {
			if (nested) return undefined;
			rule.prelude.push(consumeATokenAsNode(ts));
			continue;
		}
		// <{-token>
		// Otherwise, consume a block from input, and let child rules be the result.
		else if (t.type === "leftCurlyBracket") {
			const block = consumeABlock(ts);
			if (block) {
				rule.block = block;
				rule.range[1] = block.range[1];
			}
			return rule;
		}

		// anything else
		// Consume a component value from input and append the result to rule’s prelude.
		rule.prelude.push(consumeAComponentValue(ts));
	}
};

/**
 * Consume a block, CSS Syntax Level 3 [§5.4.4](https://drafts.csswg.org/css-syntax/#consume-block) — the next token must be `{`; discards it, consumes the block's contents (§5.4.5), discards the closing `}`, and returns the parsed contents as a `{`-`SimpleBlock` whose `value` holds the block's `Declaration` / `AtRule` / `QualifiedRule` nodes (not raw component values). Used for at-rule / qualified-rule bodies.
 * @param {TokenStream} ts token stream
 * @returns {SimpleBlock | undefined} the block (its `value` is the parsed contents), or `undefined` if the precondition assert failed
 */
const consumeABlock = (ts) => {
	const { locConverter } = ts;
	// Assert: the next token is <{-token>.
	const open = ts.next();
	if (!assertSpec(open.type === "leftCurlyBracket")) return undefined;
	const block = /** @type {SimpleBlock} */ (
		makeNode(T_SIMPLE_BLOCK, [open.start, open.end], locConverter, {
			token: "{",
			value: /** @type {(Declaration | Rule)[]} */ ([])
		})
	);

	// Discard a token from input. Consume a block’s contents from input and let rules be the result. Discard a token from input.
	ts.discard();
	block.value = consumeABlocksContents(ts);
	const close = ts.next();
	block.range[1] = close.type === "rightCurlyBracket" ? close.end : close.start;
	ts.discard();
	return block;
};

/**
 * Consume a block's contents, CSS Syntax Level 3 [§5.4.5](https://drafts.csswg.org/css-syntax/#consume-block-contents) — the mixed `Declaration` / `AtRule` / `QualifiedRule` list: whitespace and `;` are discarded, an at-keyword yields a (nested) at-rule, and anything else is tried as a declaration first and — via `mark` / `restore a mark` — otherwise as a (nested) qualified rule, stopping at the enclosing `}` (left in the stream) or EOF.
 * @param {TokenStream} ts token stream
 * @returns {(Declaration | Rule)[]} consumed declarations / rules (stops at the enclosing `}` / EOF, left in the stream)
 */
const consumeABlocksContents = (ts) => {
	// 1. Let rules be an empty list, containing either rules or lists of declarations.
	// 2. Let decls be an empty list of declarations.
	// (Deviation from spec: we keep both in a single flat `(Declaration | Rule)[]` list because every downstream consumer iterates them as siblings — the spec's "wrap consecutive decls in a nested declarations rule" grouping would be undone by the next step in our pipeline.)
	/** @type {(Declaration | Rule)[]} */
	const rules = [];

	// 3. Process input:
	for (;;) {
		const t = ts.next();

		// <whitespace-token> / <semicolon-token>
		// Discard a token from input.
		if (t.type === "whitespace" || t.type === "semicolon") {
			ts.discard();
		}
		// <EOF-token> / <}-token>
		// If decls is not empty, append it to rules. Return rules.
		else if (t.type === "EOF" || t.type === "rightCurlyBracket") {
			return rules;
		}
		// <at-keyword-token>
		// If decls is not empty, append it to rules, and set decls to a fresh empty list of declarations. Consume an at-rule from input, with nested set to true. If a rule was returned, append it to rules.
		else if (t.type === "atKeyword") {
			const atRule = consumeAnAtRule(ts, true);
			if (atRule) rules.push(atRule);
		}
		// anything else
		// Mark input. Consume a declaration from input, with nested set to true.
		// If a declaration was returned, append it to decls, and discard a mark from input.
		// Otherwise, restore a mark from input, then consume a qualified rule from input, with nested set to true, and <semicolon-token> as the stop token. If a rule was returned, append it to rules.
		else {
			ts.mark();
			// `consumeBadRemnants=false`: `consumeABlocksContents` always restores on failure, so the spec's "consume the remnants of a bad declaration" would be undone anyway — and on deeply nested input it would do exponential work.
			const decl = consumeADeclaration(ts, true, false);
			if (decl) {
				rules.push(decl);
				ts.discardMark();
			} else {
				ts.restoreMark();
				const rule = consumeAQualifiedRule(ts, "semicolon", true);
				if (rule) rules.push(rule);
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
		if (t.type === "EOF" || t.type === "semicolon") {
			ts.discard();
			return;
		}
		// <}-token>
		// If nested is true, return. Otherwise, discard a token.
		if (t.type === "rightCurlyBracket") {
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
 * @param {boolean=} consumeBadRemnants whether to consume the remnants of a bad declaration on steps 1/3 failure (true for `parseADeclaration`; false from `consumeABlocksContents`, which restores a mark and so doesn't need them)
 * @returns {Declaration | undefined} parsed declaration, or `undefined` on the spec's "return nothing" branches (steps 1, 3, 8)
 */
const consumeADeclaration = (ts, nested = false, consumeBadRemnants = true) => {
	const { input } = ts;
	// Let decl be a new declaration, with an initially empty name and a value set to an empty list.
	// (Leading whitespace before the name is the caller's responsibility — §5.3.7 / §5.4.5.)
	const head = ts.next();

	// 1. If the next token is an <ident-token>, consume a token from input and set decl's name to the returned token's value.
	//    Otherwise, consume the remnants of a bad declaration from input, with nested, and return nothing.
	if (head.type !== "identifier") {
		if (consumeBadRemnants) consumeTheRemnantsOfABadDeclaration(ts, nested);
		return undefined;
	}
	ts.discard();
	const nameRange = /** @type {[number, number]} */ ([head.start, head.end]);

	// 2. Discard whitespace from input.
	while (ts.next().type === "whitespace") ts.discard();

	// 3. If the next token is a <colon-token>, discard a token from input.
	//    Otherwise, consume the remnants of a bad declaration from input, with nested, and return nothing.
	if (ts.next().type !== "colon") {
		if (consumeBadRemnants) consumeTheRemnantsOfABadDeclaration(ts, nested);
		return undefined;
	}
	ts.discard();

	// 4. Discard whitespace from input.
	while (ts.next().type === "whitespace") ts.discard();

	// 5. Consume a list of component values from input, with nested, and with <semicolon-token> as the stop token, and set decl's value to the result.
	const value = consumeAListOfComponentValues(ts, "semicolon", nested);
	const end = ts.next().start;

	// 6. If the last two non-<whitespace-token>s in decl's value are a <delim-token> with the value "!" followed by an <ident-token> with a value that is an ASCII case-insensitive match for "important", remove them from decl's value and set decl's important flag.
	let important = false;
	{
		// Find the indices of the last two non-whitespace tokens.
		let last = value.length - 1;
		while (last >= 0 && value[last].type === T_WHITESPACE) last--;
		let prev = last - 1;
		while (prev >= 0 && value[prev].type === T_WHITESPACE) prev--;
		if (
			prev >= 0 &&
			value[last].type === T_IDENT &&
			/** @type {Token} */ (value[last]).value.toLowerCase() === "important" &&
			value[prev].type === T_DELIM &&
			input.charCodeAt(value[prev].range[0]) === CC_EXCLAMATION
		) {
			important = true;
			value.length = prev;
		}
	}

	// 7. While the last item in decl's value is a <whitespace-token>, remove that token.
	while (value.length > 0 && value[value.length - 1].type === T_WHITESPACE) {
		value.pop();
	}

	// 8. If decl's name starts with "--" (a custom property), it can contain any value (including a top-level `{}` block) — accept it.
	//    Otherwise, if decl's value contains a top-level simple block with an associated token of <{-token>, return nothing.
	//    (That is, a top-level {}-block is only allowed as the entire value of a non-custom property — for CSS Nesting, `consumeABlocksContents`'s `mark` / `restore a mark` will retry the input as a qualified rule.)
	//    Otherwise, accept the declaration. (The spec also checks "contains any non-whitespace-tokens at the top level" → return nothing; we keep empty-value declarations because callers — e.g. `@value name:;` — rely on them.)
	const isCustomProperty = input.startsWith("--", head.start);
	if (
		!isCustomProperty &&
		value.some(
			(v) =>
				v.type === T_SIMPLE_BLOCK &&
				/** @type {SimpleBlock} */ (v).token === "{"
		)
	) {
		return undefined;
	}

	// 9. Return decl.
	return /** @type {Declaration} */ (
		makeNode(T_DECLARATION, [head.start, end], ts.locConverter, {
			name: input.slice(nameRange[0], nameRange[1]),
			nameRange,
			value,
			important
		})
	);
};

/**
 * Consume a list of component values, CSS Syntax Level 3 [§5.4.7](https://drafts.csswg.org/css-syntax/#consume-list-of-components) — consumes component values until EOF, the optional `stopToken`, or — when `nested` — a top-level `}` (left in the stream); a non-nested `}` is a parse error appended as a token.
 * @param {TokenStream} ts token stream
 * @param {string=} stopToken token type that terminates the list (left unconsumed)
 * @param {boolean=} nested true inside a `{}` block — a top-level `}` ends the list (left unconsumed)
 * @returns {ComponentValue[]} consumed component values
 */
const consumeAListOfComponentValues = (ts, stopToken, nested = false) => {
	/** @type {ComponentValue[]} */
	const values = [];
	// Process input
	for (;;) {
		const t = ts.next();

		// <eof-token>
		// stop token (if passed)
		// Return values.
		if (t.type === "EOF" || t.type === stopToken) {
			return values;
		}
		// <}-token>
		// If nested is true, return values.
		// Otherwise, this is a parse error. Consume a token from input and append the result to values.
		if (t.type === "rightCurlyBracket") {
			if (nested) return values;
			values.push(consumeATokenAsNode(ts));
			continue;
		}
		// anything else
		// Consume a component value from input, and append the result to values.
		values.push(consumeAComponentValue(ts));
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
	return tokenToNode(/** @type {CssToken} */ (t), ts.input, ts.locConverter);
};

/**
 * Consume a component value, CSS Syntax Level 3 [§5.4.8](https://drafts.csswg.org/css-syntax/#consume-component-value) — consumes the next value (simple block, function, or single token); callers guard against EOF before calling.
 * @param {TokenStream} ts token stream
 * @returns {SimpleBlock | FunctionNode | ComponentValue} the consumed component value
 */
const consumeAComponentValue = (ts) => {
	const t = ts.next();
	// <{-token> / <[-token> / <(-token>
	// Consume a simple block from input and return the result.
	if (
		t.type === "leftParenthesis" ||
		t.type === "leftSquareBracket" ||
		t.type === "leftCurlyBracket"
	) {
		return /** @type {SimpleBlock} */ (consumeASimpleBlock(ts));
	}
	// <function-token>
	// Consume a function from input and return the result.
	if (t.type === "function") {
		return /** @type {FunctionNode} */ (consumeAFunction(ts));
	}
	// anything else
	// Consume a token from input and return the result. (Asserted: not EOF.)
	return consumeATokenAsNode(ts);
};

/**
 * Consume a simple block, CSS Syntax Level 3 [§5.4.9](https://drafts.csswg.org/css-syntax/#consume-simple-block) — the next token must be `(`, `[`, or `{` (asserted); consumes component values via `consumeAComponentValue` until the mirror closing token (`)`, `]`, `}`) or EOF, returning the partial block on EOF (parse error).
 * @param {TokenStream} ts token stream
 * @returns {SimpleBlock | undefined} parsed simple block, or `undefined` if the precondition assert failed
 */
const consumeASimpleBlock = (ts) => {
	const open = ts.next();
	// Assert: the next token of input is <{-token>, <[-token>, or <(-token>.
	if (
		!assertSpec(
			open.type === "leftParenthesis" ||
				open.type === "leftSquareBracket" ||
				open.type === "leftCurlyBracket"
		)
	) {
		return undefined;
	}
	// Let ending token be the mirror variant of the next token. (E.g. if it was called with <[-token>, the ending token is <]-token>.)
	const ending =
		open.type === "leftParenthesis"
			? "rightParenthesis"
			: open.type === "leftSquareBracket"
				? "rightSquareBracket"
				: "rightCurlyBracket";
	const token = /** @type {SimpleBlockToken} */ (
		open.type === "leftParenthesis"
			? "("
			: open.type === "leftSquareBracket"
				? "["
				: "{"
	);

	// Let block be a new simple block with its associated token set to the next token and with its value initially set to an empty list.
	const block = /** @type {SimpleBlock} */ (
		makeNode(T_SIMPLE_BLOCK, [open.start, open.end], ts.locConverter, {
			token,
			value: /** @type {ComponentValue[]} */ ([])
		})
	);

	// Discard a token from input.
	ts.discard();

	// Process input
	for (;;) {
		const t = ts.next();

		// <eof-token>
		// ending token
		// Discard a token from input. Return block.
		if (t.type === "EOF" || t.type === ending) {
			ts.discard();
			block.range[1] = t.end;
			return block;
		}

		// anything else
		// Consume a component value from input and append the result to block’s value.
		block.value.push(consumeAComponentValue(ts));
	}
};

/**
 * Consume a function, CSS Syntax Level 3 [§5.4.10](https://drafts.csswg.org/css-syntax/#consume-function) — consumes component values up to the matching `)` or EOF (the partial function on EOF is a parse error).
 * @param {TokenStream} ts token stream
 * @returns {FunctionNode | undefined} the consumed function node, or `undefined` if the precondition assert failed
 */
const consumeAFunction = (ts) => {
	const { input, locConverter } = ts;
	// Assert: the next token is a <function-token>.
	if (!assertSpec(ts.next().type === "function")) return undefined;
	// Consume a token from input, and let function be a new function with its name equal the returned token’s value, and a value set to an empty list.
	const tFn = ts.consume();
	const fn = /** @type {FunctionNode} */ (
		makeNode(T_FUNCTION, [tFn.start, tFn.end], locConverter, {
			name: input.slice(tFn.start, tFn.end - 1),
			nameRange: [tFn.start, tFn.end - 1],
			value: /** @type {ComponentValue[]} */ ([])
		})
	);

	// Process input
	for (;;) {
		const t = ts.next();

		if (t.type === "EOF" || t.type === "rightParenthesis") {
			// <eof-token>
			// <)-token>
			// Discard a token from input. Return function.
			ts.discard();
			fn.range[1] = t.end;
			return fn;
		}

		// anything else
		// Consume a component value from input and append the result to function’s value.
		fn.value.push(consumeAComponentValue(ts));
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

/**
 * Returns escaped identifier.
 * @param {string} str string
 * @returns {string} escaped identifier
 */
const _escapeIdentifier = (str) => {
	let output = "";
	let counter = 0;

	while (counter < str.length) {
		const character = str.charAt(counter++);

		/** @type {string} */
		let value;

		if (/[\t\n\f\r\v]/.test(character)) {
			const codePoint = character.charCodeAt(0);

			value = `\\${codePoint.toString(16).toUpperCase()} `;
		} else if (character === "\\" || regexSingleEscape.test(character)) {
			value = `\\${character}`;
		} else {
			value = character;
		}

		output += value;
	}

	const firstChar = str.charAt(0);

	if (/^-[-\d]/.test(output)) {
		output = `\\-${output.slice(1)}`;
	} else if (/\d/.test(firstChar)) {
		output = `\\3${firstChar} ${output.slice(1)}`;
	}

	// Remove spaces after `\HEX` escapes that are not followed by a hex digit,
	// since they’re redundant. Note that this is only possible if the escape
	// sequence isn’t preceded by an odd number of backslashes.
	output = output.replace(regexExcessiveSpaces, ($0, $1, $2) => {
		if ($1 && $1.length % 2) {
			// It’s not safe to remove the space, so don’t.
			return $0;
		}

		// Strip the space.
		return ($1 || "") + $2;
	});

	return output;
};

const CONTAINS_ESCAPE = /\\/;

/**
 * Returns hex.
 * @param {string} str string
 * @returns {[string, number] | undefined} hex
 */
const gobbleHex = (str) => {
	const lower = str.toLowerCase();
	let hex = "";
	let spaceTerminated = false;

	for (let i = 0; i < 6 && lower[i] !== undefined; i++) {
		const code = lower.charCodeAt(i);
		// check to see if we are dealing with a valid hex char [a-f|0-9]
		const valid = (code >= 97 && code <= 102) || (code >= 48 && code <= 57);
		// https://drafts.csswg.org/css-syntax/#consume-escaped-code-point
		spaceTerminated = code === 32;
		if (!valid) break;
		hex += lower[i];
	}

	if (hex.length === 0) return undefined;

	const codePoint = Number.parseInt(hex, 16);
	const isSurrogate = codePoint >= 0xd800 && codePoint <= 0xdfff;

	// Add special case for
	// "If this number is zero, or is for a surrogate, or is greater than the maximum allowed code point"
	// https://drafts.csswg.org/css-syntax/#maximum-allowed-code-point
	if (isSurrogate || codePoint === 0x0000 || codePoint > 0x10ffff) {
		return ["�", hex.length + (spaceTerminated ? 1 : 0)];
	}

	return [
		String.fromCodePoint(codePoint),
		hex.length + (spaceTerminated ? 1 : 0)
	];
};

/**
 * Unescape identifier.
 * @param {string} str string
 * @returns {string} unescaped string
 */
const _unescapeIdentifier = (str) => {
	const needToProcess = CONTAINS_ESCAPE.test(str);
	if (!needToProcess) return str;
	let ret = "";
	for (let i = 0; i < str.length; i++) {
		if (str[i] === "\\") {
			const gobbled = gobbleHex(str.slice(i + 1, i + 7));
			if (gobbled !== undefined) {
				ret += gobbled[0];
				i += gobbled[1];
				continue;
			}
			// Retain a pair of \\ if double escaped `\\\\`
			// https://github.com/postcss/postcss-selector-parser/commit/268c9a7656fb53f543dc620aa5b73a30ec3ff20e
			if (str[i + 1] === "\\") {
				ret += "\\";
				i += 1;
				continue;
			}
			// if \\ is at the end of the string retain it
			// https://github.com/postcss/postcss-selector-parser/commit/01a6b346e3612ce1ab20219acc26abdc259ccefb
			if (str.length === i + 1) {
				ret += str[i];
			}
			continue;
		}
		ret += str[i];
	}

	return ret;
};

// Cacheable per `compiler.root` — CssParser binds once per parse via
// `.bindCache(...)` and reuses for every identifier.
const escapeIdentifier = makeCacheable(_escapeIdentifier);
const unescapeIdentifier = makeCacheable(_unescapeIdentifier);

/**
 * Babel-style visitor map keyed by `Node#type`; a bucket is a function
 * (enter-only) or `{ enter?, exit? }`. `ctx.skipChildren()` (enter only)
 * stops the walker descending into the node's children.
 * @typedef {{ skipChildren(): void }} VisitorContext
 * @typedef {(node: Node, parent: Node | null, ctx: VisitorContext) => void} VisitorFn
 * @typedef {VisitorFn | { enter?: VisitorFn, exit?: VisitorFn }} VisitorBucket
 * @typedef {{ [nodeType: string]: VisitorBucket }} VisitorMap
 * @typedef {{ enter: VisitorFn[], exit: VisitorFn[] }} CompiledVisitorBucket
 * @typedef {Map<string, CompiledVisitorBucket>} CompiledVisitorMap
 */

/**
 * @typedef {object} GrammarContext
 * @property {CompiledVisitorMap} visitors compiled visitor map
 * @property {LocConverter} locConverter shared loc converter
 * @property {((input: string, start: number, end: number) => number)=} comment comment-token callback
 * @property {boolean=} recurseBlocks walk into block bodies' nested rules (default true)
 */

/**
 * The `SourceProcessor` grammar: consume top-level rules one at a time (§5.4.1)
 * and walk each immediately, firing `enter` / `exit` in source order without
 * building a whole-stylesheet array first. `recurseBlocks: false` skips walking
 * block bodies' (eagerly parsed) nested rules (caller drives nested traversal
 * itself).
 * @param {string} input source text
 * @param {GrammarContext} ctx grammar context
 */
const grammar = (input, ctx) => {
	const { visitors, locConverter, comment } = ctx;
	const recurseBlocks = ctx.recurseBlocks !== false;

	// Babel's `path.skip()`, children-only. Reset per `enter` dispatch.
	let skipFlag = false;
	const visitorCtx = {
		skipChildren() {
			skipFlag = true;
		}
	};

	/**
	 * Fire `enter` visitors and return whether the caller should skip
	 * descending into the node's children.
	 * @param {Node} node node being entered
	 * @param {Node | null} parent enclosing node (null at top level)
	 * @returns {boolean} true if the visitor asked to skip children
	 */
	const fireEnter = (node, parent) => {
		const b = visitors.get(node.type);
		if (!b || b.enter.length === 0) return false;
		skipFlag = false;
		for (const fn of b.enter) fn(node, parent, visitorCtx);
		const skip = skipFlag;
		skipFlag = false;
		return skip;
	};
	/**
	 * @param {Node} node node being exited
	 * @param {Node | null} parent enclosing node (null at top level)
	 */
	const fireExit = (node, parent) => {
		const b = visitors.get(node.type);
		if (b) for (const fn of b.exit) fn(node, parent, visitorCtx);
	};

	/**
	 * Walk a component-value subtree; children are already materialized.
	 * @param {Node} node component-value root
	 * @param {Node | null} parent enclosing node
	 */
	const walkValue = (node, parent) => {
		const skip = fireEnter(node, parent);
		if (!skip) {
			switch (node.type) {
				case T_FUNCTION:
				case T_SIMPLE_BLOCK: {
					const c = /** @type {FunctionNode | SimpleBlock} */ (node);
					for (const cv of c.value) walkValue(cv, node);
					break;
				}
				// All other types are leaf tokens.
			}
		}
		fireExit(node, parent);
	};

	/**
	 * Walk a structural subtree; an at-rule / qualified-rule's block was parsed
	 * eagerly (§5.4.4), so its `value` holds the nested rules / declarations.
	 * @param {Node} node structural-tree root
	 * @param {Node | null} parent enclosing node
	 */
	const walkRule = (node, parent) => {
		const skip = fireEnter(node, parent);
		if (!skip) {
			switch (node.type) {
				case T_AT_RULE:
				case T_QUALIFIED_RULE: {
					const r = /** @type {AtRule | QualifiedRule} */ (node);
					for (const cv of r.prelude) walkValue(cv, node);
					if (r.block && recurseBlocks) {
						fireEnter(r.block, node);
						for (const item of r.block.value) walkRule(item, r.block);
						fireExit(r.block, node);
					}
					break;
				}
				case T_DECLARATION: {
					const d = /** @type {Declaration} */ (node);
					for (const cv of d.value) walkValue(cv, node);
					break;
				}
			}
		}
		fireExit(node, parent);
	};

	// Parse a stylesheet (§5.3.4) and walk its top-level rules.
	const stylesheet = parseAStylesheet(
		new TokenStream(input, 0, locConverter, comment)
	);
	for (const rule of stylesheet.rules) walkRule(rule, null);
};

/**
 * Visitor coordinator: owns the visitor registry and drives the CSS `grammar`
 * over the source. Babel-style usage:
 *
 * ```
 * processor.use({ AtRule: (at) => {}, Declaration: { enter, exit } });
 * processor.process(source);
 * ```
 */
class SourceProcessor {
	constructor() {
		/** @type {CompiledVisitorMap} */
		this._visitors = new Map();
	}

	/**
	 * Register a Babel-style visitor map; calls accumulate per node type.
	 * A bucket is a function (= `{ enter }`) or `{ enter?, exit? }`.
	 * @param {VisitorMap} map visitor map keyed by node type
	 * @returns {SourceProcessor} `this`, for chaining
	 */
	use(map) {
		for (const type of Object.keys(map)) {
			const v = map[type];
			let bucket = this._visitors.get(type);
			if (!bucket) {
				bucket = { enter: [], exit: [] };
				this._visitors.set(type, bucket);
			}
			if (typeof v === "function") {
				bucket.enter.push(v);
			} else {
				if (v.enter) bucket.enter.push(v.enter);
				if (v.exit) bucket.exit.push(v.exit);
			}
		}
		return this;
	}

	/**
	 * Run the grammar over `input`, firing visitors in source order. No
	 * AST retained.
	 * @param {string} input source text
	 * @param {{ locConverter?: LocConverter, comment?: (input: string, start: number, end: number) => number, recurseBlocks?: boolean }=} ctx reuse a `locConverter`, forward a `comment` callback, or set `recurseBlocks: false` to stop at top-level rules
	 */
	process(input, ctx = {}) {
		const locConverter = ctx.locConverter || new LocConverter(input);
		grammar(input, {
			visitors: this._visitors,
			locConverter,
			comment: ctx.comment,
			recurseBlocks: ctx.recurseBlocks
		});
	}
}

// The two AST runtime classes — `Node` and its sole subclass `Token` (the
// other node shapes are `@typedef`s over `Node`, exported as types only). Plus
// the full CSS-Syntax-3 §5.3 `parseA*` entry-point surface, `consumeASimpleBlock`
// (the one §5.4 algorithm exposed as a byte entry point for `CssParser`), the
// `TokenStream` (so callers can pass a pre-built stream to any `parseA*`), and
// the `escape` / `unescapeIdentifier` string utils.
module.exports.Node = Node;
module.exports.SourceProcessor = SourceProcessor;
module.exports.Token = Token;
module.exports.TokenStream = TokenStream;
module.exports.escapeIdentifier = escapeIdentifier;
module.exports.parseABlocksContents = parseABlocksContents;
module.exports.parseACommaSeparatedListOfComponentValues =
	parseACommaSeparatedListOfComponentValues;
module.exports.parseAComponentValue = parseAComponentValue;
module.exports.parseADeclaration = parseADeclaration;
module.exports.parseAListOfComponentValues = parseAListOfComponentValues;
module.exports.parseARule = parseARule;
module.exports.parseAStylesheet = parseAStylesheet;
module.exports.parseAStylesheetsContents = parseAStylesheetsContents;
module.exports.unescapeIdentifier = unescapeIdentifier;
