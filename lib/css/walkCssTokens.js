/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/**
 * @typedef {object} CssTokenCallbacks
 * @property {function(string, number): boolean=} isSelector
 * @property {function(string, number, number, number, number): number=} url
 * @property {function(string, number, number): number=} string
 * @property {function(string, number, number): number=} leftParenthesis
 * @property {function(string, number, number): number=} rightParenthesis
 * @property {function(string, number, number): number=} pseudoFunction
 * @property {function(string, number, number): number=} function
 * @property {function(string, number, number): number=} pseudoClass
 * @property {function(string, number, number): number=} atKeyword
 * @property {function(string, number, number): number=} class
 * @property {function(string, number, number): number=} identifier
 * @property {function(string, number, number): number=} id
 * @property {function(string, number, number): number=} leftCurlyBracket
 * @property {function(string, number, number): number=} rightCurlyBracket
 * @property {function(string, number, number): number=} semicolon
 * @property {function(string, number, number): number=} comma
 */

/** @typedef {function(string, number, CssTokenCallbacks): number} CharHandler */

// spec: https://drafts.csswg.org/css-syntax/

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
const CC_LOWER_U = "u".charCodeAt(0);
const CC_LOWER_E = "e".charCodeAt(0);
const CC_LOWER_Z = "z".charCodeAt(0);
const CC_UPPER_A = "A".charCodeAt(0);
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
 * @returns {boolean} true, if cc is a newline
 */
const _isNewLine = cc => {
	return (
		cc === CC_LINE_FEED || cc === CC_CARRIAGE_RETURN || cc === CC_FORM_FEED
	);
};

/** @type {CharHandler} */
const consumeSpace = (input, pos, callbacks) => {
	/** @type {number} */
	let cc;
	do {
		pos++;
		cc = input.charCodeAt(pos);
	} while (_isWhiteSpace(cc));
	return pos;
};

/**
 * @param {number} cc char code
 * @returns {boolean} true, if cc is a newline
 */
const _isNewline = cc => {
	return (
		cc === CC_LINE_FEED || cc === CC_CARRIAGE_RETURN || cc === CC_FORM_FEED
	);
};

/**
 * @param {number} cc char code
 * @returns {boolean} true, if cc is a space (U+0009 CHARACTER TABULATION or U+0020 SPACE)
 */
const _isSpace = cc => {
	return cc === CC_TAB || cc === CC_SPACE;
};

/**
 * @param {number} cc char code
 * @returns {boolean} true, if cc is a whitespace
 */
const _isWhiteSpace = cc => {
	return _isNewline(cc) || _isSpace(cc);
};

/**
 * ident-start code point
 *
 * A letter, a non-ASCII code point, or U+005F LOW LINE (_).
 *
 * @param {number} cc char code
 * @returns {boolean} true, if cc is a start code point of an identifier
 */
const isIdentStartCodePoint = cc => {
	return (
		(cc >= CC_LOWER_A && cc <= CC_LOWER_Z) ||
		(cc >= CC_UPPER_A && cc <= CC_UPPER_Z) ||
		cc === CC_LOW_LINE ||
		cc >= 0x80
	);
};

/** @type {CharHandler} */
const consumeDelimToken = (input, pos, callbacks) => {
	return pos + 1;
};

/** @type {CharHandler} */
const consumeComments = (input, pos, callbacks) => {
	// If the next two input code point are U+002F SOLIDUS (/) followed by a U+002A
	// ASTERISK (*), consume them and all following code points up to and including
	// the first U+002A ASTERISK (*) followed by a U+002F SOLIDUS (/), or up to an
	// EOF code point. Return to the start of this step.
	//
	// If the preceding paragraph ended by consuming an EOF code point, this is a parse error.
	// But we are silent on errors.
	if (
		input.charCodeAt(pos) === CC_SOLIDUS &&
		input.charCodeAt(pos + 1) === CC_ASTERISK
	) {
		pos += 1;
		while (pos < input.length) {
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
	return pos;
};

/** @type {function(number): CharHandler} */
const consumeString = quote_cc => (input, pos, callbacks) => {
	const start = pos;
	pos = _consumeString(input, pos, quote_cc);
	if (callbacks.string !== undefined) {
		pos = callbacks.string(input, start, pos);
	}
	return pos;
};

/**
 * @param {string} input input
 * @param {number} pos position
 * @param {number} quote_cc quote char code
 * @returns {number} new position
 */
const _consumeString = (input, pos, quote_cc) => {
	pos++;
	for (;;) {
		if (pos === input.length) return pos;
		const cc = input.charCodeAt(pos);
		if (cc === quote_cc) return pos + 1;
		if (_isNewLine(cc)) {
			// bad string
			return pos;
		}
		if (cc === CC_REVERSE_SOLIDUS) {
			// we don't need to fully parse the escaped code point
			// just skip over a potential new line
			pos++;
			if (pos === input.length) return pos;
			pos++;
		} else {
			pos++;
		}
	}
};

/**
 * @param {number} cc char code
 * @returns {boolean} is identifier start code
 */
const _isIdentifierStartCode = cc => {
	return (
		cc === CC_LOW_LINE ||
		(cc >= CC_LOWER_A && cc <= CC_LOWER_Z) ||
		(cc >= CC_UPPER_A && cc <= CC_UPPER_Z) ||
		cc > 0x80
	);
};

/**
 * @param {number} first first code point
 * @param {number} second second code point
 * @returns {boolean} true if two code points are a valid escape
 */
const _isTwoCodePointsAreValidEscape = (first, second) => {
	if (first !== CC_REVERSE_SOLIDUS) return false;
	if (_isNewLine(second)) return false;
	return true;
};

/**
 * @param {number} cc char code
 * @returns {boolean} is digit
 */
const _isDigit = cc => {
	return cc >= CC_0 && cc <= CC_9;
};

/**
 * @param {string} input input
 * @param {number} pos position
 * @returns {boolean} true, if input at pos starts an identifier
 */
const _startsIdentifier = (input, pos) => {
	const cc = input.charCodeAt(pos);
	if (cc === CC_HYPHEN_MINUS) {
		if (pos === input.length) return false;
		const cc = input.charCodeAt(pos + 1);
		if (cc === CC_HYPHEN_MINUS) return true;
		if (cc === CC_REVERSE_SOLIDUS) {
			const cc = input.charCodeAt(pos + 2);
			return !_isNewLine(cc);
		}
		return _isIdentifierStartCode(cc);
	}
	if (cc === CC_REVERSE_SOLIDUS) {
		const cc = input.charCodeAt(pos + 1);
		return !_isNewLine(cc);
	}
	return _isIdentifierStartCode(cc);
};

/** @type {CharHandler} */
const consumeNumberSign = (input, pos, callbacks) => {
	const start = pos;
	pos++;
	if (pos === input.length) return pos;
	if (callbacks.isSelector(input, pos) && _startsIdentifier(input, pos)) {
		pos = _consumeIdentifier(input, pos, callbacks);
		if (callbacks.id !== undefined) {
			return callbacks.id(input, start, pos);
		}
	}
	return pos;
};

/** @type {CharHandler} */
const consumeMinus = (input, pos, callbacks) => {
	const start = pos;
	pos++;
	if (pos === input.length) return pos;
	const cc = input.charCodeAt(pos);
	// If the input stream starts with a number, reconsume the current input code point, consume a numeric token, and return it.
	if (cc === CC_FULL_STOP || _isDigit(cc)) {
		return consumeNumericToken(input, pos, callbacks);
	} else if (cc === CC_HYPHEN_MINUS) {
		pos++;
		if (pos === input.length) return pos;
		const cc = input.charCodeAt(pos);
		if (cc === CC_GREATER_THAN_SIGN) {
			return pos + 1;
		} else {
			pos = _consumeIdentifier(input, pos, callbacks);
			if (callbacks.identifier !== undefined) {
				return callbacks.identifier(input, start, pos);
			}
		}
	} else if (cc === CC_REVERSE_SOLIDUS) {
		if (pos + 1 === input.length) return pos;
		const cc = input.charCodeAt(pos + 1);
		if (_isNewLine(cc)) return pos;
		pos = _consumeIdentifier(input, pos, callbacks);
		if (callbacks.identifier !== undefined) {
			return callbacks.identifier(input, start, pos);
		}
	} else if (_isIdentifierStartCode(cc)) {
		pos = consumeOtherIdentifier(input, pos - 1, callbacks);
	}
	return pos;
};

/** @type {CharHandler} */
const consumeDot = (input, pos, callbacks) => {
	const start = pos;
	pos++;
	if (pos === input.length) return pos;
	const cc = input.charCodeAt(pos);
	if (_isDigit(cc)) return consumeNumericToken(input, pos - 2, callbacks);
	if (!callbacks.isSelector(input, pos) || !_startsIdentifier(input, pos))
		return pos;
	pos = _consumeIdentifier(input, pos, callbacks);
	if (callbacks.class !== undefined) return callbacks.class(input, start, pos);
	return pos;
};

/** @type {CharHandler} */
const consumeNumericToken = (input, pos, callbacks) => {
	pos = _consumeNumber(input, pos, callbacks);
	if (pos === input.length) return pos;
	if (_startsIdentifier(input, pos))
		return _consumeIdentifier(input, pos, callbacks);
	const cc = input.charCodeAt(pos);
	if (cc === CC_PERCENTAGE) return pos + 1;
	return pos;
};

/** @type {CharHandler} */
const consumeOtherIdentifier = (input, pos, callbacks) => {
	const start = pos;
	pos = _consumeIdentifier(input, pos, callbacks);
	if (pos !== input.length && input.charCodeAt(pos) === CC_LEFT_PARENTHESIS) {
		pos++;
		if (callbacks.function !== undefined) {
			return callbacks.function(input, start, pos);
		}
	} else {
		if (callbacks.identifier !== undefined) {
			return callbacks.identifier(input, start, pos);
		}
	}
	return pos;
};

/** @type {CharHandler} */
const consumePotentialUrl = (input, pos, callbacks) => {
	const start = pos;
	pos = _consumeIdentifier(input, pos, callbacks);
	const nextPos = pos + 1;
	if (
		pos === start + 3 &&
		input.slice(start, nextPos).toLowerCase() === "url("
	) {
		pos++;
		let cc = input.charCodeAt(pos);
		while (_isWhiteSpace(cc)) {
			pos++;
			if (pos === input.length) return pos;
			cc = input.charCodeAt(pos);
		}
		if (cc === CC_QUOTATION_MARK || cc === CC_APOSTROPHE) {
			if (callbacks.function !== undefined) {
				return callbacks.function(input, start, nextPos);
			}
			return nextPos;
		} else {
			const contentStart = pos;
			/** @type {number} */
			let contentEnd;
			for (;;) {
				if (cc === CC_REVERSE_SOLIDUS) {
					pos++;
					if (pos === input.length) return pos;
					pos++;
				} else if (_isWhiteSpace(cc)) {
					contentEnd = pos;
					do {
						pos++;
						if (pos === input.length) return pos;
						cc = input.charCodeAt(pos);
					} while (_isWhiteSpace(cc));
					if (cc !== CC_RIGHT_PARENTHESIS) return pos;
					pos++;
					if (callbacks.url !== undefined) {
						return callbacks.url(input, start, pos, contentStart, contentEnd);
					}
					return pos;
				} else if (cc === CC_RIGHT_PARENTHESIS) {
					contentEnd = pos;
					pos++;
					if (callbacks.url !== undefined) {
						return callbacks.url(input, start, pos, contentStart, contentEnd);
					}
					return pos;
				} else if (cc === CC_LEFT_PARENTHESIS) {
					return pos;
				} else {
					pos++;
				}
				if (pos === input.length) return pos;
				cc = input.charCodeAt(pos);
			}
		}
	} else {
		if (callbacks.identifier !== undefined) {
			return callbacks.identifier(input, start, pos);
		}
		return pos;
	}
};

/** @type {CharHandler} */
const consumePotentialPseudo = (input, pos, callbacks) => {
	const start = pos;
	pos++;
	if (!callbacks.isSelector(input, pos) || !_startsIdentifier(input, pos))
		return pos;
	pos = _consumeIdentifier(input, pos, callbacks);
	let cc = input.charCodeAt(pos);
	if (cc === CC_LEFT_PARENTHESIS) {
		pos++;
		if (callbacks.pseudoFunction !== undefined) {
			return callbacks.pseudoFunction(input, start, pos);
		}
		return pos;
	}
	if (callbacks.pseudoClass !== undefined) {
		return callbacks.pseudoClass(input, start, pos);
	}
	return pos;
};

/** @type {CharHandler} */
const consumeLeftParenthesis = (input, pos, callbacks) => {
	pos++;
	if (callbacks.leftParenthesis !== undefined) {
		return callbacks.leftParenthesis(input, pos - 1, pos);
	}
	return pos;
};

/** @type {CharHandler} */
const consumeRightParenthesis = (input, pos, callbacks) => {
	pos++;
	if (callbacks.rightParenthesis !== undefined) {
		return callbacks.rightParenthesis(input, pos - 1, pos);
	}
	return pos;
};

/** @type {CharHandler} */
const consumeLeftCurlyBracket = (input, pos, callbacks) => {
	pos++;
	if (callbacks.leftCurlyBracket !== undefined) {
		return callbacks.leftCurlyBracket(input, pos - 1, pos);
	}
	return pos;
};

/** @type {CharHandler} */
const consumeRightCurlyBracket = (input, pos, callbacks) => {
	pos++;
	if (callbacks.rightCurlyBracket !== undefined) {
		return callbacks.rightCurlyBracket(input, pos - 1, pos);
	}
	return pos;
};

/** @type {CharHandler} */
const consumeSemicolon = (input, pos, callbacks) => {
	pos++;
	if (callbacks.semicolon !== undefined) {
		return callbacks.semicolon(input, pos - 1, pos);
	}
	return pos;
};

/** @type {CharHandler} */
const consumeComma = (input, pos, callbacks) => {
	pos++;
	if (callbacks.comma !== undefined) {
		return callbacks.comma(input, pos - 1, pos);
	}
	return pos;
};

/** @type {CharHandler} */
const _consumeIdentifier = (input, pos) => {
	for (;;) {
		const cc = input.charCodeAt(pos);
		if (cc === CC_REVERSE_SOLIDUS) {
			pos++;
			if (pos === input.length) return pos;
			pos++;
		} else if (
			_isIdentifierStartCode(cc) ||
			_isDigit(cc) ||
			cc === CC_HYPHEN_MINUS
		) {
			pos++;
		} else {
			return pos;
		}
	}
};

/** @type {CharHandler} */
const _consumeNumber = (input, pos) => {
	pos++;
	if (pos === input.length) return pos;
	let cc = input.charCodeAt(pos);
	while (_isDigit(cc)) {
		pos++;
		if (pos === input.length) return pos;
		cc = input.charCodeAt(pos);
	}
	if (cc === CC_FULL_STOP && pos + 1 !== input.length) {
		const next = input.charCodeAt(pos + 1);
		if (_isDigit(next)) {
			pos += 2;
			cc = input.charCodeAt(pos);
			while (_isDigit(cc)) {
				pos++;
				if (pos === input.length) return pos;
				cc = input.charCodeAt(pos);
			}
		}
	}
	if (cc === CC_LOWER_E || cc === CC_UPPER_E) {
		if (pos + 1 !== input.length) {
			const next = input.charCodeAt(pos + 2);
			if (_isDigit(next)) {
				pos += 2;
			} else if (
				(next === CC_HYPHEN_MINUS || next === CC_PLUS_SIGN) &&
				pos + 2 !== input.length
			) {
				const next = input.charCodeAt(pos + 2);
				if (_isDigit(next)) {
					pos += 3;
				} else {
					return pos;
				}
			} else {
				return pos;
			}
		}
	} else {
		return pos;
	}
	cc = input.charCodeAt(pos);
	while (_isDigit(cc)) {
		pos++;
		if (pos === input.length) return pos;
		cc = input.charCodeAt(pos);
	}
	return pos;
};

/** @type {CharHandler} */
const consumeLessThan = (input, pos, callbacks) => {
	if (input.slice(pos + 1, pos + 4) === "!--") return pos + 4;
	return pos + 1;
};

/** @type {CharHandler} */
const consumeAt = (input, pos, callbacks) => {
	const start = pos;
	pos++;
	if (pos === input.length) return pos;
	if (_startsIdentifier(input, pos)) {
		pos = _consumeIdentifier(input, pos, callbacks);
		if (callbacks.atKeyword !== undefined) {
			pos = callbacks.atKeyword(input, start, pos);
		}
	}
	return pos;
};

/** @type {CharHandler} */
const consumeReverseSolidus = (input, pos, callbacks) => {
	const start = pos;
	pos++;
	if (pos === input.length) return pos;
	// If the input stream starts with a valid escape, reconsume the current input code point, consume an ident-like token, and return it.
	if (
		_isTwoCodePointsAreValidEscape(
			input.charCodeAt(start),
			input.charCodeAt(pos)
		)
	) {
		return consumeOtherIdentifier(input, pos - 1, callbacks);
	}
	// Otherwise, this is a parse error. Return a <delim-token> with its value set to the current input code point.
	return pos;
};

const CHAR_MAP = Array.from({ length: 0x80 }, (_, cc) => {
	// https://drafts.csswg.org/css-syntax/#consume-token
	switch (cc) {
		// whitespace
		case CC_LINE_FEED:
		case CC_CARRIAGE_RETURN:
		case CC_FORM_FEED:
		case CC_TAB:
		case CC_SPACE:
			return consumeSpace;
		// U+0022 QUOTATION MARK (")
		case CC_QUOTATION_MARK:
			return consumeString(cc);
		// U+0023 NUMBER SIGN (#)
		case CC_NUMBER_SIGN:
			return consumeNumberSign;
		// U+0027 APOSTROPHE (')
		case CC_APOSTROPHE:
			return consumeString(cc);
		// U+0028 LEFT PARENTHESIS (()
		case CC_LEFT_PARENTHESIS:
			return consumeLeftParenthesis;
		// U+0029 RIGHT PARENTHESIS ())
		case CC_RIGHT_PARENTHESIS:
			return consumeRightParenthesis;
		// U+002B PLUS SIGN (+)
		case CC_PLUS_SIGN:
			return consumeNumericToken;
		// U+002C COMMA (,)
		case CC_COMMA:
			return consumeComma;
		// U+002D HYPHEN-MINUS (-)
		case CC_HYPHEN_MINUS:
			return consumeMinus;
		// U+002E FULL STOP (.)
		case CC_FULL_STOP:
			return consumeDot;
		// U+003A COLON (:)
		case CC_COLON:
			return consumePotentialPseudo;
		// U+003B SEMICOLON (;)
		case CC_SEMICOLON:
			return consumeSemicolon;
		// U+003C LESS-THAN SIGN (<)
		case CC_LESS_THAN_SIGN:
			return consumeLessThan;
		// U+0040 COMMERCIAL AT (@)
		case CC_AT_SIGN:
			return consumeAt;
		// U+005B LEFT SQUARE BRACKET ([)
		case CC_LEFT_SQUARE:
			return consumeDelimToken;
		// U+005C REVERSE SOLIDUS (\)
		case CC_REVERSE_SOLIDUS:
			return consumeReverseSolidus;
		// U+005D RIGHT SQUARE BRACKET (])
		case CC_RIGHT_SQUARE:
			return consumeDelimToken;
		// U+007B LEFT CURLY BRACKET ({)
		case CC_LEFT_CURLY:
			return consumeLeftCurlyBracket;
		// U+007D RIGHT CURLY BRACKET (})
		case CC_RIGHT_CURLY:
			return consumeRightCurlyBracket;
		// Optimization
		case CC_LOWER_U:
		case CC_UPPER_U:
			return consumePotentialUrl;
		default:
			// digit
			if (_isDigit(cc)) return consumeNumericToken;
			// ident-start code point
			if (isIdentStartCodePoint(cc)) {
				return consumeOtherIdentifier;
			}
			// EOF, but we don't have it
			// anything else
			return consumeDelimToken;
	}
});

/**
 * @param {string} input input css
 * @param {CssTokenCallbacks} callbacks callbacks
 * @returns {void}
 */
module.exports = (input, callbacks) => {
	// This section describes how to consume a token from a stream of code points. It will return a single token of any type.
	let pos = 0;
	while (pos < input.length) {
		// Consume comments.
		pos = consumeComments(input, pos, callbacks);

		const cc = input.charCodeAt(pos);

		// Consume the next input code point.
		if (cc < 0x80) {
			pos = CHAR_MAP[cc](input, pos, callbacks);
		} else {
			pos++;
		}
	}
};

module.exports.isIdentStartCodePoint = isIdentStartCodePoint;

/**
 * @param {string} input input
 * @param {number} pos position
 * @returns {number} position after comments
 */
module.exports.eatComments = (input, pos) => {
	for (;;) {
		let originalPos = pos;
		pos = consumeComments(input, pos, {});
		if (originalPos === pos) {
			break;
		}
	}

	return pos;
};

/**
 * @param {string} input input
 * @param {number} pos position
 * @returns {number} position after whitespace
 */
module.exports.eatWhitespace = (input, pos) => {
	while (_isWhiteSpace(input.charCodeAt(pos))) {
		pos++;
	}

	return pos;
};

/**
 * @param {string} input input
 * @param {number} pos position
 * @returns {number} position after whitespace and comments
 */
module.exports.eatWhitespaceAndComments = (input, pos) => {
	for (;;) {
		let originalPos = pos;
		pos = consumeComments(input, pos, {});
		while (_isWhiteSpace(input.charCodeAt(pos))) {
			pos++;
		}
		if (originalPos === pos) {
			break;
		}
	}

	return pos;
};

/**
 * @param {string} input input
 * @param {number} pos position
 * @returns {number} position after whitespace
 */
module.exports.eatWhiteLine = (input, pos) => {
	for (;;) {
		const cc = input.charCodeAt(pos);
		if (_isSpace(cc)) {
			pos++;
			continue;
		}
		if (_isNewLine(cc)) pos++;
		// For `\r\n`
		if (cc === CC_CARRIAGE_RETURN && input.charCodeAt(pos + 1) === CC_LINE_FEED)
			pos++;
		break;
	}

	return pos;
};
