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

/** Spec: ident-start = letter / non-ASCII / `_`. Internal helper that
 * accepts an explicit char code (lookahead). */
const _isIdentStartCodePointCC = (cc) =>
	_isLetter(cc) || cc > 0x80 || cc === CC_LOW_LINE;

/** Spec: ident-code = ident-start / digit / hyphen-minus. */
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
			return pos;
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
const eatComments = (input, pos) => {
	for (;;) {
		const start = pos;
		while (
			input.charCodeAt(pos) === CC_SOLIDUS &&
			input.charCodeAt(pos + 1) === CC_ASTERISK
		) {
			pos += 2;
			for (;;) {
				if (pos === input.length) return pos;
				if (
					input.charCodeAt(pos) === CC_ASTERISK &&
					input.charCodeAt(pos + 1) === CC_SOLIDUS
				) {
					pos += 2;
					break;
				}
				pos++;
			}
		}
		if (start === pos) break;
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
 * @returns {[number, boolean]} `[new pos, true if any whitespace was eaten]`
 */
const eatWhitespaceAndComments = (input, pos) => {
	let foundWhitespace = false;
	for (;;) {
		const originalPos = pos;
		pos = eatComments(input, pos);
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

module.exports.eatIdentSequence = eatIdentSequence;
module.exports.eatUntil = eatUntil;
module.exports.eatWhiteLine = eatWhiteLine;
module.exports.eatWhitespace = eatWhitespace;
module.exports.eatWhitespaceAndComments = eatWhitespaceAndComments;
module.exports.escapeIdentifier = escapeIdentifier;
module.exports.isIdentStartCodePoint = isIdentStartCodePoint;
module.exports.isWhiteSpace = _isWhiteSpace;
module.exports.skipCommentsAndEatIdentSequence =
	skipCommentsAndEatIdentSequence;
