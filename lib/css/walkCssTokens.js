/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/**
 * @typedef {Object} CssTokenCallbacks
 * @property {function(string, number): boolean} isSelector
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

const CC_SLASH = "/".charCodeAt(0);
const CC_BACK_SLASH = "\\".charCodeAt(0);
const CC_ASTERISK = "*".charCodeAt(0);

const CC_LEFT_PARENTHESIS = "(".charCodeAt(0);
const CC_RIGHT_PARENTHESIS = ")".charCodeAt(0);
const CC_LEFT_CURLY = "{".charCodeAt(0);
const CC_RIGHT_CURLY = "}".charCodeAt(0);

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

const _isNewLine = cc => {
	return (
		cc === CC_LINE_FEED || cc === CC_CARRIAGE_RETURN || cc === CC_FORM_FEED
	);
};

/** @type {CharHandler} */
const consumeSpace = (input, pos, callbacks) => {
	let cc;
	do {
		pos++;
		cc = input.charCodeAt(pos);
	} while (_isWhiteSpace(cc));
	return pos;
};

const _isWhiteSpace = cc => {
	return (
		cc === CC_LINE_FEED ||
		cc === CC_CARRIAGE_RETURN ||
		cc === CC_FORM_FEED ||
		cc === CC_TAB ||
		cc === CC_SPACE
	);
};

/** @type {CharHandler} */
const consumeSingleCharToken = (input, pos, callbacks) => {
	return pos + 1;
};

/** @type {CharHandler} */
const consumePotentialComment = (input, pos, callbacks) => {
	pos++;
	if (pos === input.length) return pos;
	let cc = input.charCodeAt(pos);
	if (cc !== CC_ASTERISK) return pos;
	for (;;) {
		pos++;
		if (pos === input.length) return pos;
		cc = input.charCodeAt(pos);
		while (cc === CC_ASTERISK) {
			pos++;
			if (pos === input.length) return pos;
			cc = input.charCodeAt(pos);
			if (cc === CC_SLASH) return pos + 1;
		}
	}
};

/** @type {function(number): CharHandler} */
const consumeString = end => (input, pos, callbacks) => {
	const start = pos;
	pos = _consumeString(input, pos, end);
	if (callbacks.string !== undefined) {
		pos = callbacks.string(input, start, pos);
	}
	return pos;
};

const _consumeString = (input, pos, end) => {
	pos++;
	for (;;) {
		if (pos === input.length) return pos;
		const cc = input.charCodeAt(pos);
		if (cc === end) return pos + 1;
		if (_isNewLine(cc)) {
			// bad string
			return pos;
		}
		if (cc === CC_BACK_SLASH) {
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

const _isIdentifierStartCode = cc => {
	return (
		cc === CC_LOW_LINE ||
		(cc >= CC_LOWER_A && cc <= CC_LOWER_Z) ||
		(cc >= CC_UPPER_A && cc <= CC_UPPER_Z) ||
		cc > 0x80
	);
};

const _isDigit = cc => {
	return cc >= CC_0 && cc <= CC_9;
};

const _startsIdentifier = (input, pos) => {
	const cc = input.charCodeAt(pos);
	if (cc === CC_HYPHEN_MINUS) {
		if (pos === input.length) return false;
		const cc = input.charCodeAt(pos + 1);
		if (cc === CC_HYPHEN_MINUS) return true;
		if (cc === CC_BACK_SLASH) {
			const cc = input.charCodeAt(pos + 2);
			return !_isNewLine(cc);
		}
		return _isIdentifierStartCode(cc);
	}
	if (cc === CC_BACK_SLASH) {
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
		pos = _consumeIdentifier(input, pos);
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
	if (cc === CC_FULL_STOP || _isDigit(cc)) {
		return consumeNumericToken(input, pos, callbacks);
	} else if (cc === CC_HYPHEN_MINUS) {
		pos++;
		if (pos === input.length) return pos;
		const cc = input.charCodeAt(pos);
		if (cc === CC_GREATER_THAN_SIGN) {
			return pos + 1;
		} else {
			pos = _consumeIdentifier(input, pos);
			if (callbacks.identifier !== undefined) {
				return callbacks.identifier(input, start, pos);
			}
		}
	} else if (cc === CC_BACK_SLASH) {
		if (pos + 1 === input.length) return pos;
		const cc = input.charCodeAt(pos + 1);
		if (_isNewLine(cc)) return pos;
		pos = _consumeIdentifier(input, pos);
		if (callbacks.identifier !== undefined) {
			return callbacks.identifier(input, start, pos);
		}
	} else if (_isIdentifierStartCode(cc)) {
		pos++;
		pos = _consumeIdentifier(input, pos);
		if (callbacks.identifier !== undefined) {
			return callbacks.identifier(input, start, pos);
		}
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
	pos = _consumeIdentifier(input, pos);
	if (callbacks.class !== undefined) return callbacks.class(input, start, pos);
	return pos;
};

/** @type {CharHandler} */
const consumeNumericToken = (input, pos, callbacks) => {
	pos = _consumeNumber(input, pos);
	if (pos === input.length) return pos;
	if (_startsIdentifier(input, pos)) return _consumeIdentifier(input, pos);
	const cc = input.charCodeAt(pos);
	if (cc === CC_PERCENTAGE) return pos + 1;
	return pos;
};

/** @type {CharHandler} */
const consumeOtherIdentifier = (input, pos, callbacks) => {
	const start = pos;
	pos = _consumeIdentifier(input, pos);
	if (
		pos !== input.length &&
		!callbacks.isSelector(input, pos) &&
		input.charCodeAt(pos) === CC_LEFT_PARENTHESIS
	) {
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
	pos = _consumeIdentifier(input, pos);
	if (
		pos === start + 3 &&
		input.slice(start, pos + 1).toLowerCase() === "url("
	) {
		pos++;
		let cc = input.charCodeAt(pos);
		while (_isWhiteSpace(cc)) {
			pos++;
			if (pos === input.length) return pos;
			cc = input.charCodeAt(pos);
		}
		if (cc === CC_QUOTATION_MARK || cc === CC_APOSTROPHE) {
			pos++;
			const contentStart = pos;
			pos = _consumeString(input, pos, cc);
			const contentEnd = pos - 1;
			cc = input.charCodeAt(pos);
			while (_isWhiteSpace(cc)) {
				pos++;
				if (pos === input.length) return pos;
				cc = input.charCodeAt(pos);
			}
			if (cc !== CC_RIGHT_PARENTHESIS) return pos;
			pos++;
			if (callbacks.url !== undefined)
				return callbacks.url(input, start, pos, contentStart, contentEnd);
			return pos;
		} else {
			const contentStart = pos;
			let contentEnd;
			for (;;) {
				if (cc === CC_BACK_SLASH) {
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
	pos = _consumeIdentifier(input, pos);
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

const _consumeIdentifier = (input, pos) => {
	for (;;) {
		const cc = input.charCodeAt(pos);
		if (cc === CC_BACK_SLASH) {
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
		pos = _consumeIdentifier(input, pos);
		if (callbacks.atKeyword !== undefined) {
			pos = callbacks.atKeyword(input, start, pos);
		}
	}
	return pos;
};

const CHAR_MAP = Array.from({ length: 0x80 }, (_, cc) => {
	// https://drafts.csswg.org/css-syntax/#consume-token
	switch (cc) {
		case CC_LINE_FEED:
		case CC_CARRIAGE_RETURN:
		case CC_FORM_FEED:
		case CC_TAB:
		case CC_SPACE:
			return consumeSpace;
		case CC_QUOTATION_MARK:
		case CC_APOSTROPHE:
			return consumeString(cc);
		case CC_NUMBER_SIGN:
			return consumeNumberSign;
		case CC_SLASH:
			return consumePotentialComment;
		// case CC_LEFT_SQUARE:
		// case CC_RIGHT_SQUARE:
		// case CC_COMMA:
		// case CC_COLON:
		// 	return consumeSingleCharToken;
		case CC_COMMA:
			return consumeComma;
		case CC_SEMICOLON:
			return consumeSemicolon;
		case CC_LEFT_PARENTHESIS:
			return consumeLeftParenthesis;
		case CC_RIGHT_PARENTHESIS:
			return consumeRightParenthesis;
		case CC_LEFT_CURLY:
			return consumeLeftCurlyBracket;
		case CC_RIGHT_CURLY:
			return consumeRightCurlyBracket;
		case CC_COLON:
			return consumePotentialPseudo;
		case CC_PLUS_SIGN:
			return consumeNumericToken;
		case CC_FULL_STOP:
			return consumeDot;
		case CC_HYPHEN_MINUS:
			return consumeMinus;
		case CC_LESS_THAN_SIGN:
			return consumeLessThan;
		case CC_AT_SIGN:
			return consumeAt;
		case CC_LOWER_U:
		case CC_UPPER_U:
			return consumePotentialUrl;
		case CC_LOW_LINE:
			return consumeOtherIdentifier;
		default:
			if (_isDigit(cc)) return consumeNumericToken;
			if (
				(cc >= CC_LOWER_A && cc <= CC_LOWER_Z) ||
				(cc >= CC_UPPER_A && cc <= CC_UPPER_Z)
			) {
				return consumeOtherIdentifier;
			}
			return consumeSingleCharToken;
	}
});

/**
 * @param {string} input input css
 * @param {CssTokenCallbacks} callbacks callbacks
 * @returns {void}
 */
module.exports = (input, callbacks) => {
	let pos = 0;
	while (pos < input.length) {
		const cc = input.charCodeAt(pos);
		if (cc < 0x80) {
			pos = CHAR_MAP[cc](input, pos, callbacks);
		} else {
			pos++;
		}
	}
};

module.exports.eatComments = (input, pos) => {
	loop: for (;;) {
		const cc = input.charCodeAt(pos);
		if (cc === CC_SLASH) {
			if (pos === input.length) return pos;
			let cc = input.charCodeAt(pos + 1);
			if (cc !== CC_ASTERISK) return pos;
			pos++;
			for (;;) {
				pos++;
				if (pos === input.length) return pos;
				cc = input.charCodeAt(pos);
				while (cc === CC_ASTERISK) {
					pos++;
					if (pos === input.length) return pos;
					cc = input.charCodeAt(pos);
					if (cc === CC_SLASH) {
						pos++;
						continue loop;
					}
				}
			}
		}
		return pos;
	}
};

module.exports.eatWhitespaceAndComments = (input, pos) => {
	loop: for (;;) {
		const cc = input.charCodeAt(pos);
		if (cc === CC_SLASH) {
			if (pos === input.length) return pos;
			let cc = input.charCodeAt(pos + 1);
			if (cc !== CC_ASTERISK) return pos;
			pos++;
			for (;;) {
				pos++;
				if (pos === input.length) return pos;
				cc = input.charCodeAt(pos);
				while (cc === CC_ASTERISK) {
					pos++;
					if (pos === input.length) return pos;
					cc = input.charCodeAt(pos);
					if (cc === CC_SLASH) {
						pos++;
						continue loop;
					}
				}
			}
		} else if (_isWhiteSpace(cc)) {
			pos++;
			continue;
		}
		return pos;
	}
};
