/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

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
		pos = _consumeAnIdentSequence(input, pos);
		yield { type: "dimension", start, end: pos };
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

/**
 * Top-level tokenizer. Yields `CssToken`s in source order. The
 * consumer drives by reading from the iterator — there is no
 * position-modification handshake (the pre-generator API let
 * callbacks return a custom advance position; here the consumer
 * just reads more tokens and ignores the ones it wanted to skip).
 * @param {string} input input source
 * @param {number=} pos starting byte offset (default `0`)
 * @returns {Generator<CssToken, number, void>} generator yielding every CSS token in `input`; final return value is the post-EOF position
 */
function* walkCssTokens(input, pos = 0) {
	while (pos < input.length) {
		pos = yield* consumeComments(input, pos);
		if (pos >= input.length) break;
		pos++;
		pos = yield* consumeAToken(input, pos);
	}
	return pos;
}

module.exports = walkCssTokens;

// Position helpers — these do not emit tokens, just compute positions.
// Used directly by `CssAst.js` / `CssParser.js` outside the generator.

/**
 * @param {string} input input
 * @param {number} pos position
 * @returns {number} position past any leading `/*…*\/` comments
 */
/**
 * Eat zero or more `/*…*\/` comments and return the position just past
 * the last one. With `onComment`, dispatches each consumed comment's
 * `[start, end]` range — used by the CSS parser to drop the separate
 * comment pre-pass: comments are now collected during the same scan
 * the parser is already doing.
 * @param {string} input input
 * @param {number} pos position
 * @param {((input: string, start: number, end: number) => number)=} onComment optional dispatch
 * @returns {number} position past any leading `/*…*\/` comments
 */
const eatComments = (input, pos, onComment) => {
	for (;;) {
		const loopStart = pos;
		while (
			input.charCodeAt(pos) === CC_SOLIDUS &&
			input.charCodeAt(pos + 1) === CC_ASTERISK
		) {
			const commentStart = pos;
			pos += 2;
			for (;;) {
				if (pos === input.length) {
					if (onComment) onComment(input, commentStart, pos);
					return pos;
				}
				if (
					input.charCodeAt(pos) === CC_ASTERISK &&
					input.charCodeAt(pos + 1) === CC_SOLIDUS
				) {
					pos += 2;
					break;
				}
				pos++;
			}
			if (onComment) onComment(input, commentStart, pos);
		}
		if (loopStart === pos) break;
	}
	return pos;
};

/**
 * @param {string} input input
 * @param {number} pos position
 * @returns {number} position past leading whitespace
 */
const eatWhitespace = (input, pos) => {
	while (_isWhiteSpace(input.charCodeAt(pos))) pos++;
	return pos;
};

/**
 * @param {string} input input
 * @param {number} pos position
 * @param {((input: string, start: number, end: number) => number)=} onComment optional callback fired for each consumed `/*…*\/` comment (`[start, end]`)
 * @returns {[number, boolean]} `[new pos, true if any whitespace was eaten]`
 */
const eatWhitespaceAndComments = (input, pos, onComment) => {
	let foundWhitespace = false;
	for (;;) {
		const originalPos = pos;
		pos = eatComments(input, pos, onComment);
		while (_isWhiteSpace(input.charCodeAt(pos))) {
			if (!foundWhitespace) foundWhitespace = true;
			pos++;
		}
		if (originalPos === pos) break;
	}
	return [pos, foundWhitespace];
};

/**
 * Eat trailing whitespace + at most one newline (CRLF-aware).
 * @param {string} input input
 * @param {number} pos position
 * @returns {number} position past whitespace + one newline
 */
const eatWhiteLine = (input, pos) => {
	for (;;) {
		const cc = input.charCodeAt(pos);
		if (_isSpace(cc)) {
			pos++;
			continue;
		}
		if (_isNewline(cc)) pos++;
		pos = consumeExtraNewline(cc, input, pos);
		break;
	}
	return pos;
};

/**
 * Skip comments at `pos`, then try to eat an ident sequence.
 * @param {string} input input
 * @param {number} pos position
 * @returns {[number, number] | undefined} `[start, end]` of the ident or `undefined` if none
 */
const skipCommentsAndEatIdentSequence = (input, pos) => {
	pos = eatComments(input, pos);
	const start = pos;
	if (
		_ifThreeCodePointsWouldStartAnIdentSequence(
			input,
			pos,
			input.charCodeAt(pos),
			input.charCodeAt(pos + 1),
			input.charCodeAt(pos + 2)
		)
	) {
		return [start, _consumeAnIdentSequence(input, pos)];
	}
	return undefined;
};

/**
 * Skip whitespace + comments at `pos`, then try to eat an ident.
 * @param {string} input input
 * @param {number} pos position
 * @returns {[number, number] | undefined} `[start, end]` or `undefined`
 */
const eatIdentSequence = (input, pos) => {
	pos = eatWhitespaceAndComments(input, pos)[0];
	const start = pos;
	if (
		_ifThreeCodePointsWouldStartAnIdentSequence(
			input,
			pos,
			input.charCodeAt(pos),
			input.charCodeAt(pos + 1),
			input.charCodeAt(pos + 2)
		)
	) {
		return [start, _consumeAnIdentSequence(input, pos)];
	}
	return undefined;
};

/**
 * Build an "eat until any of these chars" function. Returns the
 * position at the first matching char (or EOF if none found).
 * @param {string} chars characters to stop at
 * @returns {(input: string, pos: number) => number} eat function
 */
const eatUntil = (chars) => {
	const charCodes = Array.from({ length: chars.length }, (_, i) =>
		chars.charCodeAt(i)
	);
	const arr = Array.from(
		{ length: Math.max(...charCodes, 0) + 1 },
		() => false
	);
	for (const cc of charCodes) {
		arr[cc] = true;
	}
	return (input, pos) => {
		for (;;) {
			const cc = input.charCodeAt(pos);
			if (cc < arr.length && arr[cc]) return pos;
			pos++;
			if (pos === input.length) return pos;
		}
	};
};

// AST shape mirrors https://github.com/tabatkins/parse-css, which is the
// reference implementation of the CSS Syntax Level 3 algorithms
// (https://www.w3.org/TR/css-syntax-3/). Spec section anchors are linked
// from the relevant helpers below; the integer steps in `parseADeclaration`
// match the spec's "consume a declaration" algorithm one-for-one.
//
// Two intentional deviations from parse-css:
//   1. Nodes carry `start`/`end` byte offsets and expose a lazy `loc` getter
//      via a shared `LocConverter`. parse-css drops location info above the
//      token layer; webpack needs spans for warning/error messages.
//   2. Nodes have **no** methods other than the `loc` getter — no `toJSON`,
//      no `toSource`. We don't need round-tripping; we walk the tree to feed
//      our dependency emitters and that's it.

const CC_EXCLAMATION = "!".charCodeAt(0);

// Token / node `type` discriminators. Naming follows the spec where it has
// a name, otherwise parse-css's lowercase kebab style.
const T_IDENT = "ident";
const T_FUNCTION = "function";
const T_AT_KEYWORD = "at-keyword";
const T_HASH = "hash";
const T_STRING = "string";
const T_BAD_STRING = "bad-string";
const T_URL = "url";
const T_BAD_URL = "bad-url";
const T_DELIM = "delim";
const T_NUMBER = "number";
const T_PERCENTAGE = "percentage";
const T_DIMENSION = "dimension";
const T_WHITESPACE = "whitespace";
const T_COLON = "colon";
const T_SEMICOLON = "semicolon";
const T_COMMA = "comma";
const T_SIMPLE_BLOCK = "simple-block";
const T_DECLARATION = "declaration";
const T_AT_RULE = "at-rule";

/**
 * Base AST node. All concrete nodes (tokens, simple blocks, functions,
 * declarations) inherit from this and carry the [start, end) byte range
 * of the source slice they cover. `loc` is computed on demand from a
 * shared `LocConverter` so we don't pay for line/column conversion until
 * a consumer (warning, error, dependency) actually needs it.
 */
class Node {
	/**
	 * @param {string} type node type discriminator
	 * @param {number} start start offset (inclusive)
	 * @param {number} end end offset (exclusive)
	 * @param {LocConverter} locConverter shared loc converter
	 */
	constructor(type, start, end, locConverter) {
		this.type = type;
		this.start = start;
		this.end = end;
		this._locConverter = locConverter;
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
}

/**
 * Leaf token node. `value` is the raw source slice of the token (e.g. the
 * identifier text, the quoted string including quotes, the dimension's full
 * `123px`). Token-specific extras (hash id-flag, url content range) live on
 * subclasses to keep the common case lean.
 */
class Token extends Node {
	/**
	 * @param {string} type node type
	 * @param {string} value raw source slice
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {LocConverter} locConverter shared loc converter
	 */
	constructor(type, value, start, end, locConverter) {
		super(type, start, end, locConverter);
		this.value = value;
	}
}

/**
 * Hash token (`#foo`). `value` is the name without the leading `#`. `id` is
 * the spec's type-flag — true when the name forms a valid `<id>` selector.
 */
class HashToken extends Token {
	/**
	 * @param {string} value name without leading `#`
	 * @param {boolean} id true when this is an id-style hash
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {LocConverter} locConverter shared loc converter
	 */
	constructor(value, id, start, end, locConverter) {
		super(T_HASH, value, start, end, locConverter);
		this.id = id;
	}
}

/**
 * Old-style URL token from the tokenizer (`url(unquoted)`). `value` is the
 * unquoted contents; `contentStart`/`contentEnd` mark the inner range in the
 * original source.
 */
class UrlToken extends Token {
	/**
	 * @param {string} value unquoted url body
	 * @param {number} contentStart start offset of the inner content
	 * @param {number} contentEnd end offset of the inner content
	 * @param {number} start start offset (including `url(`)
	 * @param {number} end end offset (including closing `)`)
	 * @param {LocConverter} locConverter shared loc converter
	 */
	constructor(value, contentStart, contentEnd, start, end, locConverter) {
		super(T_URL, value, start, end, locConverter);
		this.contentStart = contentStart;
		this.contentEnd = contentEnd;
	}
}

/**
 * Function node: `name(component-values...)`. `name` is the raw source slice
 * before the `(` (callers lowercase / unescape as needed). `nameRange` is
 * `[start, end)` of the name token. `value` is the list of component values
 * inside the parentheses.
 */
class FunctionNode extends Node {
	/**
	 * @param {string} name raw source slice of the name (no `(`)
	 * @param {[number, number]} nameRange name [start, end)
	 * @param {Node[]} value component values inside `(...)`
	 * @param {number} start start offset (`name` start)
	 * @param {number} end end offset (after `)` or EOF)
	 * @param {LocConverter} locConverter shared loc converter
	 */
	constructor(name, nameRange, value, start, end, locConverter) {
		super(T_FUNCTION, start, end, locConverter);
		this.name = name;
		this.nameRange = nameRange;
		this.value = value;
	}
}

/** @typedef {"[" | "(" | "{"} SimpleBlockToken */

/**
 * Simple block (`[...]`, `(...)` not preceded by an ident, `{...}`).
 * `token` is the opening character (`[`, `(`, `{`).
 */
class SimpleBlock extends Node {
	/**
	 * @param {SimpleBlockToken} token opening character
	 * @param {Node[]} value component values inside the block
	 * @param {number} start start offset (the opening character)
	 * @param {number} end end offset (after closing character or EOF)
	 * @param {LocConverter} locConverter shared loc converter
	 */
	constructor(token, value, start, end, locConverter) {
		super(T_SIMPLE_BLOCK, start, end, locConverter);
		this.token = token;
		this.value = value;
	}
}

/**
 * Declaration: `name: value [!important][;]`. `value` is the trimmed list of
 * component values (whitespace stripped from both ends; `!important` removed
 * and recorded as `important: true`).
 */
class Declaration extends Node {
	/**
	 * @param {string} name raw source slice of the property name
	 * @param {[number, number]} nameRange name [start, end)
	 * @param {Node[]} value list of component values
	 * @param {boolean} important whether the declaration carried `!important`
	 * @param {number} start start offset (first non-whitespace byte)
	 * @param {number} end end offset (the terminating `;`/`}` position, or EOF)
	 * @param {LocConverter} locConverter shared loc converter
	 */
	constructor(name, nameRange, value, important, start, end, locConverter) {
		super(T_DECLARATION, start, end, locConverter);
		this.name = name;
		this.nameRange = nameRange;
		this.value = value;
		this.important = important;
	}
}

/** @typedef {";" | "{" | "}" | null} AtRuleTerminator */

/**
 * At-rule: `@name <prelude> ;` or `@name <prelude> { ... }`. `prelude` is the
 * list of component values between the `@-keyword` and the terminator
 * (whitespace preserved — callers strip as needed). The block (`{...}`) is
 * **not** consumed by `parseAtRule`; `terminator` tells the caller what
 * stopped the prelude so the outer parser can fire the matching callback
 * (`semicolon:` for `;`-terminated at-rules, `leftCurlyBracket:` to enter a
 * block at-rule). When `parseABlocksContents` walks a block, it fills in
 * `.block` for terminator-`{` at-rules and updates `.end` to point past `}`.
 */
class AtRule extends Node {
	/**
	 * @param {string} name at-keyword name without the leading `@`
	 * @param {[number, number]} nameRange `[start, end)` of the at-keyword token (range includes `@`)
	 * @param {Node[]} prelude list of component values up to the terminator
	 * @param {AtRuleTerminator} terminator token that ended the prelude — `;`, `{` for a block, `}` for an unmatched close-curly, or null for EOF
	 * @param {number} start start offset (the `@`)
	 * @param {number} end end offset (the terminator's position, or EOF)
	 * @param {LocConverter} locConverter shared loc converter
	 */
	constructor(name, nameRange, prelude, terminator, start, end, locConverter) {
		super(T_AT_RULE, start, end, locConverter);
		this.name = name;
		this.nameRange = nameRange;
		this.prelude = prelude;
		this.terminator = terminator;
		/**
		 * Optional block body, populated only when the at-rule was consumed
		 * by `parseABlocksContents` / `parseAStylesheet`. `parseAtRule`
		 * itself leaves this `null`.
		 * @type {SimpleBlock | null}
		 */
		this.block = null;
	}
}

/**
 * Qualified rule: `<prelude> { <block> }`. The prelude is the list of
 * component values before the `{` (selectors in a style rule, parameters in
 * a keyframe rule, …). `block` is the simple-block `{ ... }` that follows.
 * Per spec, a qualified rule with no block (EOF before `{`) is a parse
 * error and dropped; we still return such partial rules with `block: null`
 * so callers can decide whether to recover.
 */
class QualifiedRule extends Node {
	/**
	 * @param {Node[]} prelude list of component values before the `{`
	 * @param {SimpleBlock | null} block the `{ ... }` body, or null when EOF was hit before `{`
	 * @param {number} start start offset (first byte of the prelude)
	 * @param {number} end end offset (past `}` if the block was consumed, otherwise EOF)
	 * @param {LocConverter} locConverter shared loc converter
	 */
	constructor(prelude, block, start, end, locConverter) {
		super("qualified-rule", start, end, locConverter);
		this.prelude = prelude;
		this.block = block;
	}
}

/** @typedef {"root" | "function" | SimpleBlockToken} FrameKind */

/**
 * @typedef {object} Frame
 * @property {FrameKind} kind frame kind
 * @property {string} name function name (only meaningful when kind === "function")
 * @property {[number, number] | null} nameRange name range (function only)
 * @property {Node[]} values component values inside this frame
 * @property {number} start frame start offset
 */

/**
 * Materialize a closed frame as the appropriate AST node.
 * @param {Frame} frame frame to close
 * @param {number} end end offset of the closing token (or implicit close at EOF)
 * @param {LocConverter} locConverter shared loc converter
 * @returns {FunctionNode | SimpleBlock} closed node
 */
const _frameToNode = (frame, end, locConverter) => {
	if (frame.kind === "function") {
		return new FunctionNode(
			frame.name,
			/** @type {[number, number]} */ (frame.nameRange),
			frame.values,
			frame.start,
			end,
			locConverter
		);
	}
	return new SimpleBlock(
		/** @type {"[" | "(" | "{"} */ (frame.kind),
		frame.values,
		frame.start,
		end,
		locConverter
	);
};

/**
 * Apply a single `CssToken` to the AST-building `stack`, pushing tokens as
 * `Token` / `HashToken` / `UrlToken` nodes into the top frame's `values`,
 * opening a new frame on `(` / `[` / `{` / function-token, and closing on
 * `)` / `]` (curly braces are entry-point-specific and handled by the
 * caller, as are comma / semicolon / comment, plus any terminator tokens
 * the consumer needs to stop at).
 *
 * `onRootClose` fires when a closing `)` / `]` empties the stack —
 * `_consumeIntoSeedFrame` uses it to record the materialized seed node;
 * the sentinel-root entry-points (`parseAListOfComponentValues`,
 * `parseAComponentValue`) ignore it because they intercept `)` / `]` in
 * their own switch arms to preserve the sentinel.
 * @param {CssToken} t token from the `walkCssTokens` iterator
 * @param {string} input source
 * @param {LocConverter} locConverter shared loc converter
 * @param {Frame[]} stack frame stack — top frame is mutated
 * @param {(frame: Frame, end: number) => void} onRootClose called when the stack drops to empty after a `)` / `]` close
 * @returns {void}
 */
const pushTokenAsNode = (t, input, locConverter, stack, onRootClose) => {
	const top = stack[stack.length - 1];
	switch (t.type) {
		case "whitespace":
			top.values.push(
				new Token(
					T_WHITESPACE,
					input.slice(t.start, t.end),
					t.start,
					t.end,
					locConverter
				)
			);
			return;
		case "identifier":
			top.values.push(
				new Token(
					T_IDENT,
					input.slice(t.start, t.end),
					t.start,
					t.end,
					locConverter
				)
			);
			return;
		case "string":
			top.values.push(
				new Token(
					T_STRING,
					input.slice(t.start, t.end),
					t.start,
					t.end,
					locConverter
				)
			);
			return;
		case "delim":
			top.values.push(
				new Token(
					T_DELIM,
					input.slice(t.start, t.end),
					t.start,
					t.end,
					locConverter
				)
			);
			return;
		case "number":
			top.values.push(
				new Token(
					T_NUMBER,
					input.slice(t.start, t.end),
					t.start,
					t.end,
					locConverter
				)
			);
			return;
		case "percentage":
			top.values.push(
				new Token(
					T_PERCENTAGE,
					input.slice(t.start, t.end),
					t.start,
					t.end,
					locConverter
				)
			);
			return;
		case "dimension":
			top.values.push(
				new Token(
					T_DIMENSION,
					input.slice(t.start, t.end),
					t.start,
					t.end,
					locConverter
				)
			);
			return;
		case "hash":
			top.values.push(
				new HashToken(
					input.slice(t.start + 1, t.end),
					t.isId,
					t.start,
					t.end,
					locConverter
				)
			);
			return;
		case "atKeyword":
			top.values.push(
				new Token(
					T_AT_KEYWORD,
					input.slice(t.start + 1, t.end),
					t.start,
					t.end,
					locConverter
				)
			);
			return;
		case "url":
			top.values.push(
				new UrlToken(
					input.slice(t.contentStart, t.contentEnd),
					t.contentStart,
					t.contentEnd,
					t.start,
					t.end,
					locConverter
				)
			);
			return;
		case "badStringToken":
			top.values.push(
				new Token(
					T_BAD_STRING,
					input.slice(t.start, t.end),
					t.start,
					t.end,
					locConverter
				)
			);
			return;
		case "badUrlToken":
			top.values.push(
				new Token(
					T_BAD_URL,
					input.slice(t.start, t.end),
					t.start,
					t.end,
					locConverter
				)
			);
			return;
		case "colon":
			top.values.push(new Token(T_COLON, ":", t.start, t.end, locConverter));
			return;
		case "comma":
			top.values.push(new Token(T_COMMA, ",", t.start, t.end, locConverter));
			return;
		case "function":
			// `t.end` points just past the `(`; the name occupies [start, end - 1).
			stack.push({
				values: [],
				kind: "function",
				name: input.slice(t.start, t.end - 1),
				nameRange: [t.start, t.end - 1],
				start: t.start
			});
			return;
		case "leftParenthesis":
			stack.push({
				values: [],
				kind: "(",
				name: "",
				nameRange: null,
				start: t.start
			});
			return;
		case "leftSquareBracket":
			stack.push({
				values: [],
				kind: "[",
				name: "",
				nameRange: null,
				start: t.start
			});
			return;
		case "leftCurlyBracket":
			stack.push({
				values: [],
				kind: "{",
				name: "",
				nameRange: null,
				start: t.start
			});
			return;
		case "rightParenthesis": {
			// Close a `function` or `(` frame; a stray `)` with no matching
			// open is silently dropped to match parse-css's recovery.
			if (stack.length === 0) return;
			const frame = /** @type {Frame} */ (stack.pop());
			const node = _frameToNode(frame, t.end, locConverter);
			if (stack.length === 0) {
				onRootClose(frame, t.end);
			} else {
				stack[stack.length - 1].values.push(node);
			}
			return;
		}
		case "rightSquareBracket": {
			if (stack.length === 0 || top.kind !== "[") return;
			const frame = /** @type {Frame} */ (stack.pop());
			const node = _frameToNode(frame, t.end, locConverter);
			if (stack.length === 0) {
				onRootClose(frame, t.end);
				return;
			}
			stack[stack.length - 1].values.push(node);
			break;
		}
		default:
		// `comment`, `semicolon`, `leftCurlyBracket` (terminator for some
		// entry-points), `rightCurlyBracket`, `cdo`, `cdc` — each consumer
		// handles these in its own switch and never calls this helper for
		// them. Unknown types fall through silently.
	}
};

/** @typedef {";" | "{" | "}" | null} ListTerminator */

/**
 * @typedef {object} ParseListOptions
 * @property {boolean=} stopAtSemicolon top-level `<semicolon-token>` terminates the list (not consumed). Used by declaration-value and at-rule-prelude callers.
 * @property {boolean=} stopAtLeftCurly top-level `<{-token>` terminates the list (not consumed). Used by at-rule-prelude callers (the at-rule's block starts here).
 * @property {boolean=} stopAtRightCurly top-level `<}-token>` terminates the list (not consumed). Used by callers that sit inside a `{}` block — equivalent to spec §5.4.7's `nested=true` parameter.
 * @property {((input: string, start: number, end: number) => number)=} comment optional comment-token callback forwarded to the tokenizer so the outer parser's comment tracker still sees magic comments inside the consumed range
 */

/**
 * Parse a list of component values, per CSS Syntax Level 3
 * [§5.3.7](https://www.w3.org/TR/css-syntax-3/#parse-list-of-component-values)
 * (entry point) + [§5.4.7](https://www.w3.org/TR/css-syntax-3/#consume-list-of-components-values)
 * (consume algorithm). Nested simple blocks (`{}`, `[]`, `()`) and functions
 * are consumed recursively — semicolons, commas, and braces inside them
 * stay inside those frames' `value` arrays and do not terminate the outer
 * list.
 *
 * The spec gives `consume a list of component values` a single `stopToken`
 * plus a `nested` bool. Webpack's callers need slightly more flexibility
 * (declaration values stop at `;` *and* `}`; at-rule preludes stop at `;`,
 * `{`, *and* `}`; comma-separated splitting stops at `,`), so this function
 * exposes the same idea as three independent `stopAt…` flags. Unknown stop
 * tokens are passed through into the AST.
 *
 * Spec deviations: the spec emits a parse error when an unmatched
 * `<}-token>` is hit at top level with `nested=false`; we silently drop it
 * (the outer streaming walker recovers structurally). Unclosed simple
 * blocks / functions at EOF are implicitly closed, matching spec §5.4.9 /
 * §5.4.10 step 2.1.
 * @param {string} input source
 * @param {number} pos start position
 * @param {LocConverter} locConverter shared loc converter
 * @param {ParseListOptions=} options stop-token flags and comment callback
 * @returns {{ values: Node[], end: number, terminator: ListTerminator }}
 * consumed component values, final position (the terminator's position
 * or EOF), and the kind of terminator that stopped the list
 */
const parseAListOfComponentValues = (
	input,
	pos,
	locConverter,
	options = {}
) => {
	const { stopAtSemicolon, stopAtLeftCurly, stopAtRightCurly, comment } =
		options;
	/** @type {Frame[]} */
	const stack = [
		{
			values: [],
			kind: "root",
			name: "",
			nameRange: null,
			start: pos
		}
	];
	/** @type {ListTerminator} */
	let terminator = null;
	const top = () => stack[stack.length - 1];
	// Root frame is a sentinel — `onRootClose` only fires if we pop
	// past it, which would mean an unmatched `)` / `]` at the top
	// level. `pushTokenAsNode` silently no-ops in that case, matching
	// parse-css's recovery, so this hook is unreachable in practice.
	/** @type {(frame: Frame, end: number) => void} */
	const onRootClose = () => {};

	let endPos = pos;
	for (const t of walkCssTokens(input, pos)) {
		endPos = t.end;
		if (t.type === "comment") {
			if (comment) comment(input, t.start, t.end);
			continue;
		}
		if (t.type === "semicolon") {
			if (stopAtSemicolon && stack.length === 1) {
				terminator = ";";
				endPos = t.start;
				break;
			}
			top().values.push(
				new Token(T_SEMICOLON, ";", t.start, t.end, locConverter)
			);
			continue;
		}
		if (t.type === "leftCurlyBracket") {
			if (stopAtLeftCurly && stack.length === 1) {
				terminator = "{";
				endPos = t.start;
				break;
			}
			// Nested `{` simple block.
			stack.push({
				values: [],
				kind: "{",
				name: "",
				nameRange: null,
				start: t.start
			});
			continue;
		}
		if (t.type === "rightCurlyBracket") {
			if (stack.length > 1 && top().kind === "{") {
				// Close a nested `{` simple block.
				const frame = /** @type {Frame} */ (stack.pop());
				top().values.push(_frameToNode(frame, t.end, locConverter));
				continue;
			}
			if (stopAtRightCurly) {
				terminator = "}";
				endPos = t.start;
				break;
			}
			// Spec §5.4.7: a top-level `}` with `nested=false` is a parse
			// error; the spec consumes it as a delim. We silently drop it
			// — the outer streaming walker handles structural recovery one
			// level up.
			continue;
		}
		pushTokenAsNode(t, input, locConverter, stack, onRootClose);
	}

	// EOF — implicitly close any frames left open, per spec §5.4.9 /
	// §5.4.10 step 2.1.
	while (stack.length > 1) {
		const frame = /** @type {Frame} */ (stack.pop());
		top().values.push(_frameToNode(frame, endPos, locConverter));
	}

	return { values: stack[0].values, end: endPos, terminator };
};

/**
 * Parse a comma-separated list of component values, per CSS Syntax Level 3
 * [§5.3.8](https://www.w3.org/TR/css-syntax-3/#parse-comma-list).
 * Convenience wrapper over `parseAListOfComponentValues` that splits the
 * result at top-level `<comma-token>`s into groups. Whitespace tokens
 * adjacent to commas are kept inside their groups (callers strip if they
 * care — `parseADeclaration`-style trailing/leading whitespace trimming is
 * a caller concern).
 * @param {string} input source
 * @param {number} pos start position
 * @param {LocConverter} locConverter shared loc converter
 * @param {ParseListOptions=} options stop-token flags and comment callback
 * @returns {{ groups: Node[][], end: number, terminator: ListTerminator }}
 * comma-separated groups, final position, terminator kind
 */
const parseACommaSeparatedListOfComponentValues = (
	input,
	pos,
	locConverter,
	options = {}
) => {
	const { values, end, terminator } = parseAListOfComponentValues(
		input,
		pos,
		locConverter,
		options
	);
	/** @type {Node[][]} */
	const groups = [];
	/** @type {Node[]} */
	let current = [];
	for (const cv of values) {
		if (cv.type === "comma") {
			groups.push(current);
			current = [];
			continue;
		}
		current.push(cv);
	}
	groups.push(current);
	return { groups, end, terminator };
};

/**
 * Parse a single component value, per CSS Syntax Level 3
 * [§5.3.6](https://www.w3.org/TR/css-syntax-3/#parse-component-value).
 * Discards leading whitespace and comments, then consumes exactly one
 * component value — a token, a simple block, or a function call. Returns
 * `undefined` if `pos` is at (or past) EOF after the whitespace skip.
 *
 * Implementation note: we stop the tokenizer the moment the root frame
 * receives a non-whitespace value (via `needTerminate`) instead of walking
 * to EOF and then taking the first value — important when this runs against
 * a long suffix of a source file (e.g. an at-rule prelude probe). Nested
 * `(`/`[`/`{`/function frames are consumed recursively before the
 * `needTerminate` check fires again, so the returned value is always a
 * complete sub-tree.
 *
 * Spec deviation: the spec also requires the *trailing* input to be empty
 * after consuming the value (else syntax error). We don't enforce that —
 * callers ask for one component value because they want to know what's
 * there; whatever follows is their concern. This matches the practical
 * shape webpack uses in its streaming walker.
 * @param {string} input source
 * @param {number} pos start position
 * @param {LocConverter} locConverter shared loc converter
 * @param {{ comment?: (input: string, start: number, end: number) => number }=} options optional comment-token callback forwarded to the tokenizer
 * @returns {{ value: Node, end: number } | undefined} the parsed component
 * value and the position immediately after it, or `undefined` if the
 * input is empty after whitespace
 */
const parseAComponentValue = (input, pos, locConverter, options = {}) => {
	pos = eatWhitespaceAndComments(input, pos)[0];
	if (pos >= input.length) return undefined;

	/** @type {Frame[]} */
	const stack = [
		{
			values: [],
			kind: "root",
			name: "",
			nameRange: null,
			start: pos
		}
	];
	const top = () => stack[stack.length - 1];
	// `pushTokenAsNode` is shared with the seed-frame consumer below,
	// which uses `onRootClose` to record the seed node and stop. Here
	// the root is a sentinel — we intercept `rightParenthesis` /
	// `rightSquareBracket` in the loop's switch below so `pushTokenAsNode`
	// never sees a top-level close, and this hook is unreachable.
	/** @type {(frame: Frame, end: number) => void} */
	const onRootClose = () => {};

	// Helper: has the root frame captured any non-whitespace value?
	// Bail as soon as it has — nested frames keep `stack.length > 1`,
	// so the check only fires after a recursive block/function has
	// finished closing.
	const rootIsComplete = () => {
		if (stack.length !== 1) return false;
		for (const v of stack[0].values) {
			if (v.type !== "whitespace") return true;
		}
		return false;
	};

	let endPos = pos;
	for (const t of walkCssTokens(input, pos)) {
		endPos = t.end;
		if (t.type === "comment") {
			if (options.comment) options.comment(input, t.start, t.end);
			continue;
		}
		if (t.type === "semicolon") {
			top().values.push(
				new Token(T_SEMICOLON, ";", t.start, t.end, locConverter)
			);
			if (rootIsComplete()) break;
			continue;
		}
		if (t.type === "leftCurlyBracket") {
			stack.push({
				values: [],
				kind: "{",
				name: "",
				nameRange: null,
				start: t.start
			});
			continue;
		}
		if (t.type === "rightCurlyBracket") {
			if (stack.length > 1 && top().kind === "{") {
				const frame = /** @type {Frame} */ (stack.pop());
				top().values.push(_frameToNode(frame, t.end, locConverter));
			}
			// Top-level `}` is dropped (parse-error recovery); the outer
			// streaming walker handles structural recovery one level up.
			if (rootIsComplete()) break;
			continue;
		}
		if (t.type === "rightParenthesis") {
			if (stack.length > 1) {
				const frame = /** @type {Frame} */ (stack.pop());
				top().values.push(_frameToNode(frame, t.end, locConverter));
			}
			// Top-level `)` is dropped (parse-error recovery) — we
			// *must not* pop the sentinel root, or the next token's
			// callback would push into an empty stack.
			if (rootIsComplete()) break;
			continue;
		}
		if (t.type === "rightSquareBracket") {
			if (stack.length > 1 && top().kind === "[") {
				const frame = /** @type {Frame} */ (stack.pop());
				top().values.push(_frameToNode(frame, t.end, locConverter));
			}
			// Same root-preservation rationale as `rightParenthesis`.
			if (rootIsComplete()) break;
			continue;
		}
		pushTokenAsNode(t, input, locConverter, stack, onRootClose);
		if (rootIsComplete()) break;
	}

	// EOF before the root got a non-whitespace value — close any open
	// frames (spec §5.4.9 / §5.4.10 step 2.1) so the partial block/function
	// still surfaces.
	while (stack.length > 1) {
		const frame = /** @type {Frame} */ (stack.pop());
		top().values.push(_frameToNode(frame, endPos, locConverter));
	}

	for (const v of stack[0].values) {
		if (v.type === "whitespace") continue;
		return { value: v, end: endPos };
	}
	return undefined;
};

/**
 * Parse a declaration, per CSS Syntax Level 3 "consume a declaration"
 * (https://www.w3.org/TR/css-syntax-3/#consume-declaration). Returns
 * `undefined` if the input at `pos` is not a valid declaration head
 * (no ident-token, or no `:` after it) — the caller can then fall
 * through without consuming any tokens.
 *
 * Differences from the spec: the "consume the remnants of a bad
 * declaration" recovery is not run — webpack's parser runs `parseADeclaration`
 * as a sub-step from within an outer streaming walk and recovers via that
 * walk; consuming tokens here would skip past structure the outer walk needs
 * to see. Spec step 8 (custom-property original-text capture and
 * unicode-range special case) is not implemented — neither is needed for
 * our known-property handling.
 * @param {string} input source
 * @param {number} pos start position (typically the first character of the
 * property name; leading whitespace and comments are skipped)
 * @param {LocConverter} locConverter shared loc converter
 * @param {((input: string, start: number, end: number) => number)=} comment
 * optional comment-token callback forwarded to `walkCssTokens` while
 * consuming the value (so the outer parser's comment tracker still sees
 * magic comments inside the declaration value)
 * @returns {Declaration | undefined} parsed declaration or undefined
 */
const parseADeclaration = (input, pos, locConverter, comment) => {
	// Discard leading whitespace from the input (per `parse a declaration`).
	// Thread the comment callback through every `eatWhitespaceAndComments`
	// here so a magic comment between `name`, `:`, and the value (e.g.
	// `background-image: /* webpackIgnore: true */ url(…)`) reaches
	// `parseCommentOptions`.
	pos = eatWhitespaceAndComments(input, pos, comment)[0];

	const declStart = pos;

	// Step 1: ident-token → declaration name.
	const nameRange = eatIdentSequence(input, pos);
	if (!nameRange) return undefined;

	// Step 2: discard whitespace.
	pos = eatWhitespaceAndComments(input, nameRange[1], comment)[0];

	// Step 3: expect colon-token, discard it.
	if (input.charCodeAt(pos) !== CC_COLON) return undefined;
	pos += 1;

	// Step 4: discard whitespace.
	pos = eatWhitespaceAndComments(input, pos, comment)[0];

	// Step 5: consume a list of component values up to the top-level
	// `;`, `}`, or `{`. The terminator itself is **not** consumed —
	// `parseAListOfComponentValues` rewinds to its start so the outer
	// parser still sees it.
	//
	// `{` terminates because, per CSS Syntax Level 3 §5.4.6 step 10
	// (the "consume a declaration" algorithm in its CSS-Nesting-aware
	// form), a declaration's value cannot contain a top-level
	// <{>-token: such input is a nested qualified rule, not a
	// declaration, and `consume a declaration` is supposed to fail so
	// the caller can backtrack into `consume a qualified rule`. We
	// implement the "fail" return below.
	const { values, end, terminator } = parseAListOfComponentValues(
		input,
		pos,
		locConverter,
		{
			stopAtSemicolon: true,
			stopAtLeftCurly: true,
			stopAtRightCurly: true,
			comment
		}
	);

	// CSS Nesting disambiguation: if we stopped at a `{`, this isn't a
	// declaration — it's the body of a qualified rule (e.g.
	// `div:not(:local(.x)) { … }`). Returning `undefined` lets the
	// `parseABlocksContents` caller fall back to `parseAQualifiedRule`,
	// which is what every modern CSS parser does for nesting.
	//
	// Custom-property values (`--foo: { … };`) per the spec's
	// special-case would survive this check, but no caller in webpack
	// currently relies on that form. Adding that exception is left for
	// a follow-up commit if a test ever needs it.
	if (terminator === "{") return undefined;

	// Steps 6–7: detect trailing `!important` and trim trailing whitespace.
	let important = false;
	// First, drop any trailing whitespace from the value list.
	while (values.length > 0 && values[values.length - 1].type === T_WHITESPACE) {
		values.pop();
	}
	// Then look for the `!` + `important` pair at the tail. The spec says
	// "the last two non-whitespace tokens"; because we just stripped the
	// trailing whitespace, the `important` ident (if present) is at the
	// end and the `!` delim is the last non-whitespace token before it.
	if (values.length >= 2) {
		const last = values[values.length - 1];
		let prevIdx = values.length - 2;
		while (prevIdx >= 0 && values[prevIdx].type === T_WHITESPACE) prevIdx--;
		const prev = prevIdx >= 0 ? values[prevIdx] : undefined;
		if (
			prev &&
			last.type === T_IDENT &&
			/** @type {Token} */ (last).value.toLowerCase() === "important" &&
			prev.type === T_DELIM &&
			input.charCodeAt(prev.start) === CC_EXCLAMATION
		) {
			important = true;
			values.length = prevIdx;
			// Trim trailing whitespace once more after the `!important` cut.
			while (
				values.length > 0 &&
				values[values.length - 1].type === T_WHITESPACE
			) {
				values.pop();
			}
		}
	}

	return new Declaration(
		input.slice(nameRange[0], nameRange[1]),
		[nameRange[0], nameRange[1]],
		values,
		important,
		declStart,
		end,
		locConverter
	);
};

/**
 * Parse a single function token starting at `pos`, materializing it as a
 * `FunctionNode`. Per CSS Syntax Level 3 §5.4.10 *Consume a function*
 * (https://www.w3.org/TR/css-syntax-3/#consume-function): nested simple
 * blocks and functions are consumed recursively; an unmatched closing
 * paren is treated as an EOF for the function (the body ends, the parser
 * doesn't emit a parse error). Returns `undefined` if `pos` does not start
 * an `<ident-token>` immediately followed by `(`.
 *
 * Unlike the spec, which expects the function-token to have already been
 * consumed before calling "consume a function", this entry-point reads the
 * name itself so callers can hand it a raw source position from the
 * streaming tokenizer.
 *
 * The optional `comment` callback is forwarded to the underlying tokenizer
 * so the outer parser's comment tracker (used by `parseCommentOptions` to
 * find magic comments) still sees comments inside the function body even
 * though the body is consumed in one call.
 * @param {string} input source
 * @param {number} pos start position (the first character of the function name)
 * @param {LocConverter} locConverter shared loc converter
 * @param {((input: string, start: number, end: number) => number)=} comment
 * optional comment-token callback forwarded to `walkCssTokens`
 * @returns {FunctionNode | undefined} parsed function node, or undefined
 * when no function-token starts at `pos`
 */
const parseAFunction = (input, pos, locConverter, comment) => {
	const ident = eatIdentSequence(input, pos);
	if (!ident) return undefined;
	// CSS syntax: a function-token is an ident-sequence **immediately**
	// followed by `(` (no whitespace allowed).
	if (input.charCodeAt(ident[1]) !== CC_LEFT_PARENTHESIS) return undefined;

	return /** @type {FunctionNode | undefined} */ (
		_consumeIntoSeedFrame(input, ident[1] + 1, locConverter, comment, {
			values: [],
			kind: "function",
			name: input.slice(ident[0], ident[1]),
			nameRange: [ident[0], ident[1]],
			start: pos
		})
	);
};

/**
 * Parse a simple block starting at `pos`, per CSS Syntax Level 3
 * [§5.4.9](https://www.w3.org/TR/css-syntax-3/#consume-simple-block).
 * `pos` must point at `(`, `[`, or `{`; anything else returns
 * `undefined`. The opening token sets the block's `token` field; the
 * matching closing token (`)`, `]`, `}`) ends the consumption. Nested
 * simple blocks and functions are consumed recursively, so brackets
 * inside them stay inside their frames' `value` arrays.
 *
 * Unlike the spec, which expects the opening token to have already been
 * consumed before calling "consume a simple block", this entry-point
 * reads the opening character itself so callers can hand it a raw
 * source position from the streaming tokenizer.
 *
 * Per spec §5.4.9 step 2.1 (paraphrasing): an unmatched opening with no
 * matching closer hits EOF and the partial block is returned. parse-css
 * does the same without emitting a parse error; we follow that.
 * @param {string} input source
 * @param {number} pos start position (the `(`, `[`, or `{` byte)
 * @param {LocConverter} locConverter shared loc converter
 * @param {((input: string, start: number, end: number) => number)=} comment optional comment-token callback forwarded to the underlying tokenizer
 * @returns {SimpleBlock | undefined} parsed simple block, or undefined when `pos` doesn't start a simple block
 */
const parseASimpleBlock = (input, pos, locConverter, comment) => {
	const ch = input.charCodeAt(pos);
	/** @type {SimpleBlockToken | undefined} */
	let kind;
	if (ch === CC_LEFT_PARENTHESIS) kind = "(";
	else if (ch === CC_LEFT_SQUARE) kind = "[";
	else if (ch === CC_LEFT_CURLY) kind = "{";
	else return undefined;

	return /** @type {SimpleBlock | undefined} */ (
		_consumeIntoSeedFrame(input, pos + 1, locConverter, comment, {
			values: [],
			kind,
			name: "",
			nameRange: null,
			start: pos
		})
	);
};

/**
 * Internal: drive `walkCssTokens` with a seed frame already pushed on the
 * stack, returning the materialized node when that seed frame closes (or
 * an EOF-implicitly-closed version). Shared by `parseAFunction` (seed
 * kind `"function"`, closed by `)`) and `parseASimpleBlock` (seed kind
 * `"(" | "[" | "{"`, closed by the matching `]` / `}` / `)`).
 * @param {string} input source
 * @param {number} startPos position to start tokenizing from (just past the seed frame's opening token)
 * @param {LocConverter} locConverter shared loc converter
 * @param {((input: string, start: number, end: number) => number) | undefined} comment optional comment-token callback forwarded to the tokenizer
 * @param {Frame} seedFrame the frame already pushed on the stack — its kind determines what closes the root
 * @returns {FunctionNode | SimpleBlock | undefined} materialized node
 */
const _consumeIntoSeedFrame = (
	input,
	startPos,
	locConverter,
	comment,
	seedFrame
) => {
	/** @type {Frame[]} */
	const stack = [seedFrame];
	/** @type {FunctionNode | SimpleBlock | undefined} */
	let result;
	// `pushTokenAsNode`'s `onRootClose` fires when `)` / `]` pops the
	// seed frame to an empty stack — record the materialized node so
	// the loop can stop on the next iteration.
	/** @type {(frame: Frame, end: number) => void} */
	const onRootClose = (frame, end) => {
		result = /** @type {FunctionNode | SimpleBlock} */ (
			_frameToNode(frame, end, locConverter)
		);
	};

	let endPos = startPos;
	for (const t of walkCssTokens(input, startPos)) {
		endPos = t.end;
		if (t.type === "comment") {
			if (comment) comment(input, t.start, t.end);
			continue;
		}
		if (t.type === "rightCurlyBracket") {
			// `}` closes the top frame iff it's a `{`. If that pops the
			// seed (i.e. the seed was a `{` simple block), record and
			// terminate. Otherwise `}` is an unmatched stray and is
			// silently dropped — parse-css's recovery, consistent with
			// what `pushTokenAsNode` does for a stray `)`.
			if (stack.length > 0 && stack[stack.length - 1].kind === "{") {
				const frame = /** @type {Frame} */ (stack.pop());
				if (stack.length === 0) {
					result = /** @type {SimpleBlock} */ (
						_frameToNode(frame, t.end, locConverter)
					);
				} else {
					stack[stack.length - 1].values.push(
						_frameToNode(frame, t.end, locConverter)
					);
				}
			}
			if (result) break;
			continue;
		}
		if (t.type === "semicolon") {
			// `<semicolon-token>` inside a function body or simple block
			// is just a component value, per "consume a component value"
			// (§5.4.8) / "consume a function" (§5.4.10) / "consume a
			// simple block" (§5.4.9).
			stack[stack.length - 1].values.push(
				new Token(T_SEMICOLON, ";", t.start, t.end, locConverter)
			);
			continue;
		}
		pushTokenAsNode(t, input, locConverter, stack, onRootClose);
		if (result) break;
	}

	// EOF before the seed closed — implicitly close all open frames,
	// the outermost of which is the seed (spec §5.4.9 step 2.1 / §5.4.10
	// step 2.1: at EOF the partial block / function is returned).
	while (stack.length > 0) {
		const frame = /** @type {Frame} */ (stack.pop());
		const node = _frameToNode(frame, endPos, locConverter);
		if (stack.length === 0) {
			result = node;
		} else {
			stack[stack.length - 1].values.push(node);
		}
	}

	return result;
};
/**
 * Parse an at-rule, per CSS Syntax Level 3 §5.4.2 *Consume an at-rule*
 * (https://www.w3.org/TR/css-syntax-3/#consume-at-rule). Returns
 * `undefined` if `pos` does not start with `@<ident>`. The block (`{...}`)
 * is **not** consumed — `AtRule#terminator` tells the caller whether the
 * at-rule continues into a block (`"{"`) or has ended (`";"`/`"}"`/`null`),
 * so the outer streaming walker can take over and fire its own callbacks
 * for the terminator. This matches webpack's existing scope-tracking model
 * where `leftCurlyBracket`/`semicolon` callbacks drive the rule stack.
 *
 * Difference from the spec: `consume the remnants of a bad declaration`-style
 * recovery is not run, and `}` at the prelude's top level is treated as a
 * terminator rather than a delim consumed into the prelude. Both deviations
 * mirror the conservatism of `parseADeclaration` / `parseAFunction` —
 * webpack's streaming walker handles structural recovery one level up.
 * @param {string} input source
 * @param {number} pos start position (the `@` character)
 * @param {LocConverter} locConverter shared loc converter
 * @param {((input: string, start: number, end: number) => number)=} comment optional comment-token callback forwarded to the underlying tokenizer
 * @returns {AtRule | undefined} parsed at-rule, or undefined when `pos` does not start with `@<ident>`
 */
const parseAtRule = (input, pos, locConverter, comment) => {
	if (input.charCodeAt(pos) !== CC_AT_SIGN) return undefined;
	// Per the CSS Syntax tokenizer, an at-keyword is `@` *immediately*
	// followed by an ident-sequence (no whitespace or comment between).
	// `eatIdentSequence` would silently skip leading whitespace, which would
	// match `@ foo` as `@foo` — wrong; verify the next byte starts the
	// sequence ourselves.
	if (
		!isIdentStartCodePoint(input.charCodeAt(pos + 1)) &&
		input.charCodeAt(pos + 1) !== "-".charCodeAt(0)
	) {
		return undefined;
	}
	const ident = eatIdentSequence(input, pos + 1);
	if (!ident || ident[0] !== pos + 1) return undefined;
	const nameEnd = ident[1];
	const name = input.slice(pos + 1, nameEnd);

	const { values, end, terminator } = parseAListOfComponentValues(
		input,
		nameEnd,
		locConverter,
		{
			stopAtSemicolon: true,
			stopAtLeftCurly: true,
			stopAtRightCurly: true,
			comment
		}
	);

	return new AtRule(
		name,
		[pos, nameEnd],
		values,
		terminator,
		pos,
		end,
		locConverter
	);
};

/**
 * Parse a qualified rule starting at `pos`, per CSS Syntax Level 3
 * [§5.4.5](https://www.w3.org/TR/css-syntax-3/#consume-qualified-rule).
 * Consumes a list of component values (the prelude) until a `{` is hit,
 * then consumes the `{ ... }` simple-block as the rule's body. If EOF is
 * reached before `{`, the spec drops the rule as a parse error; we still
 * return a `QualifiedRule` with `block: null` so callers can decide
 * whether to recover (the streaming use-case wants the prelude span).
 *
 * Leading whitespace before the prelude is preserved — the prelude span
 * starts at `pos`. Callers that want a trimmed prelude should strip
 * whitespace tokens themselves.
 * @param {string} input source
 * @param {number} pos start position (first byte of the prelude — leading whitespace included)
 * @param {LocConverter} locConverter shared loc converter
 * @param {((input: string, start: number, end: number) => number)=} comment optional comment-token callback forwarded to the underlying tokenizer
 * @returns {QualifiedRule} parsed qualified rule (with `block: null` on EOF)
 */
const parseAQualifiedRule = (input, pos, locConverter, comment) => {
	const start = pos;
	// Consume the prelude as a list of component values, stopping at `{`
	// (start of the block) or `}` (parse error / outer block close).
	const { values, end, terminator } = parseAListOfComponentValues(
		input,
		pos,
		locConverter,
		{
			stopAtLeftCurly: true,
			stopAtRightCurly: true,
			comment
		}
	);

	if (terminator !== "{") {
		// EOF or stray `}` before the block opened — parse error.
		return new QualifiedRule(values, null, start, end, locConverter);
	}

	// Consume the `{ ... }` block — `end` points at the `{`.
	const block = /** @type {SimpleBlock} */ (
		parseASimpleBlock(input, end, locConverter, comment)
	);
	return new QualifiedRule(values, block, start, block.end, locConverter);
};

/**
 * Parse a block's contents starting at `pos`, per CSS Syntax Level 3
 * (CSS Nesting draft) [§5.4.4](https://www.w3.org/TR/css-syntax-3/#consume-block-contents).
 * Returns a mixed list of `Declaration`, `AtRule`, and `QualifiedRule`
 * nodes — i.e. everything you can find inside a style rule's `{ ... }`
 * with CSS Nesting enabled.
 *
 * `pos` should be the position immediately **after** the opening `{` of
 * the enclosing block (or `0` for the top-level stylesheet, which doesn't
 * have a `{`). Consumption stops at a top-level `}` — the matching close
 * of the enclosing block (`end` points **at** the `}`; not consumed) — or
 * at EOF (`end === input.length`).
 *
 * `terminator` reflects which of those stopped us so the caller can
 * advance past `}` if needed (`parseAStylesheet` doesn't expect a `}`).
 *
 * Spec algorithm differences: the spec runs "consume a declaration" then
 * falls back to "consume a qualified rule"; we do the same with
 * `parseADeclaration` and `parseAQualifiedRule`. When an at-rule's
 * prelude is `{`-terminated we additionally consume the block via
 * `parseASimpleBlock`, set `atRule.block`, and update `atRule.end` to
 * point past `}` — the spec leaves the block on the at-rule directly so
 * this matches that shape. Recovery: when both declaration and
 * qualified-rule consumption fail (rare — only at EOF in the middle of
 * nothing), we advance one byte and continue rather than spinning
 * forever.
 * @param {string} input source
 * @param {number} pos start position (just past the opening `{`, or 0 for top-level)
 * @param {LocConverter} locConverter shared loc converter
 * @param {((input: string, start: number, end: number) => number)=} comment optional comment-token callback forwarded to the underlying tokenizer
 * @returns {{ values: (Declaration | AtRule | QualifiedRule)[], end: number, terminator: "}" | null }} consumed nodes, final position (the closing `}` or EOF), and the kind of terminator
 */
const parseABlocksContents = (input, pos, locConverter, comment) => {
	/** @type {(Declaration | AtRule | QualifiedRule)[]} */
	const values = [];
	while (pos < input.length) {
		// Skip whitespace, comments, and stray semicolons between items.
		pos = eatWhitespaceAndComments(input, pos, comment)[0];
		while (pos < input.length && input.charCodeAt(pos) === CC_SEMICOLON) {
			pos += 1;
			pos = eatWhitespaceAndComments(input, pos, comment)[0];
		}
		if (pos >= input.length) break;
		// Top-level `}` — let the caller consume it.
		if (input.charCodeAt(pos) === CC_RIGHT_CURLY) {
			return { values, end: pos, terminator: "}" };
		}
		// At-rule.
		if (input.charCodeAt(pos) === CC_AT_SIGN) {
			const atRule = parseAtRule(input, pos, locConverter, comment);
			if (!atRule) {
				// Not a real at-keyword (e.g. `@` followed by non-ident);
				// advance one byte and continue to avoid an infinite loop.
				pos += 1;
				continue;
			}
			pos = atRule.end;
			if (atRule.terminator === "{") {
				// `@media (…) { … }` — consume the block too.
				const block = /** @type {SimpleBlock} */ (
					parseASimpleBlock(input, atRule.end, locConverter, comment)
				);
				atRule.block = block;
				atRule.end = block.end;
				pos = block.end;
			} else if (atRule.terminator === ";") {
				// Consume the `;` so the next iteration starts cleanly.
				pos += 1;
			}
			values.push(atRule);
			continue;
		}
		// Try a declaration first — `ident : value` with optional
		// `!important`. `parseADeclaration` returns undefined if the head
		// isn't a valid declaration; fall through to qualified-rule.
		const decl = parseADeclaration(input, pos, locConverter, comment);
		if (decl) {
			values.push(decl);
			pos = decl.end;
			if (input.charCodeAt(pos) === CC_SEMICOLON) pos += 1;
			continue;
		}
		// Qualified rule (CSS Nesting / top-level style rule).
		const rule = parseAQualifiedRule(input, pos, locConverter, comment);
		// Defensive: if the rule consumed zero bytes (rare, only if `pos`
		// is on a `}` that we somehow didn't catch above) advance one
		// byte to avoid spinning.
		if (rule.end <= pos) {
			pos += 1;
			continue;
		}
		values.push(rule);
		pos = rule.end;
	}
	return { values, end: pos, terminator: null };
};

/**
 * Parse a stylesheet, per CSS Syntax Level 3
 * [§5.3.1](https://www.w3.org/TR/css-syntax-3/#parse-stylesheet)
 * (which delegates to §5.4.3 "consume a list of rules" with the
 * top-level flag set). Returns the top-level list of qualified rules
 * and at-rules — no `Declaration`s, since declarations are not allowed
 * at the top level of a stylesheet (the spec treats a bare
 * `name: value;` at top level as a parse-error qualified rule with a
 * malformed prelude).
 *
 * Implementation note: this is a thin filter over `parseABlocksContents`
 * — both algorithms iterate items inside a "block-like" container; the
 * top level is the same loop with `}`-termination disabled (we never
 * hit one outside a real `{ ... }`) and declarations swallowed as
 * stray noise rather than kept. CDO (`<!--`) and CDC (`-->`) tokens
 * have no separate handling — they're rare in modern CSS and the
 * underlying tokenizer surfaces them as delim tokens that
 * `parseAQualifiedRule` will fold into a (malformed) prelude.
 * @param {string} input source
 * @param {LocConverter} locConverter shared loc converter
 * @param {((input: string, start: number, end: number) => number)=} comment optional comment-token callback forwarded to the underlying tokenizer
 * @returns {{ rules: (AtRule | QualifiedRule)[], end: number }} the
 * stylesheet's top-level rules and the position after the last rule
 * (typically `input.length`)
 */
const parseAStylesheet = (input, locConverter, comment) => {
	const result = parseABlocksContents(input, 0, locConverter, comment);
	/** @type {(AtRule | QualifiedRule)[]} */
	const rules = [];
	for (const v of result.values) {
		// Top-level declarations are spec parse errors — drop them. The
		// non-error items are at-rules and qualified rules.
		if (v.type === T_DECLARATION) continue;
		rules.push(/** @type {AtRule | QualifiedRule} */ (v));
	}
	return { rules, end: result.end };
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
const escapeIdentifier = (str) => {
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
const unescapeIdentifier = (str) => {
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

module.exports.AtRule = AtRule;
module.exports.Declaration = Declaration;
module.exports.FunctionNode = FunctionNode;
module.exports.HashToken = HashToken;
module.exports.Node = Node;
module.exports.QualifiedRule = QualifiedRule;
module.exports.SimpleBlock = SimpleBlock;
module.exports.Token = Token;
module.exports.UrlToken = UrlToken;
module.exports.eatIdentSequence = eatIdentSequence;
module.exports.eatUntil = eatUntil;
module.exports.eatWhiteLine = eatWhiteLine;
module.exports.eatWhitespace = eatWhitespace;
module.exports.eatWhitespaceAndComments = eatWhitespaceAndComments;
module.exports.escapeIdentifier = escapeIdentifier;
module.exports.isIdentStartCodePoint = isIdentStartCodePoint;
module.exports.isWhiteSpace = _isWhiteSpace;
module.exports.parseABlocksContents = parseABlocksContents;
module.exports.parseACommaSeparatedListOfComponentValues =
	parseACommaSeparatedListOfComponentValues;
module.exports.parseAComponentValue = parseAComponentValue;
module.exports.parseADeclaration = parseADeclaration;
module.exports.parseAFunction = parseAFunction;
module.exports.parseAListOfComponentValues = parseAListOfComponentValues;
module.exports.parseAQualifiedRule = parseAQualifiedRule;
module.exports.parseASimpleBlock = parseASimpleBlock;
module.exports.parseAStylesheet = parseAStylesheet;
module.exports.parseAtRule = parseAtRule;
module.exports.skipCommentsAndEatIdentSequence =
	skipCommentsAndEatIdentSequence;
module.exports.unescapeIdentifier = unescapeIdentifier;
