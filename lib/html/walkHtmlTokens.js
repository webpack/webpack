/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Raj Aryan (based on SWC parser by Alexander Akait)
*/

"use strict";

// cspell:ignore apos notpre

const getHtmlEntities = require("./htmlEntities");

const STATE_DATA = 0;
const STATE_TAG_OPEN = 1;
const STATE_END_TAG_OPEN = 2;
const STATE_TAG_NAME = 3;
const STATE_BEFORE_ATTRIBUTE_NAME = 4;
const STATE_ATTRIBUTE_NAME = 5;
const STATE_AFTER_ATTRIBUTE_NAME = 6;
const STATE_BEFORE_ATTRIBUTE_VALUE = 7;
const STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED = 8;
const STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED = 9;
const STATE_ATTRIBUTE_VALUE_UNQUOTED = 10;
const STATE_AFTER_ATTRIBUTE_VALUE_QUOTED = 11;
const STATE_SELF_CLOSING_START_TAG = 12;

const STATE_MARKUP_DECLARATION_OPEN = 13;
const STATE_COMMENT_START = 14;
const STATE_COMMENT_START_DASH = 15;
const STATE_COMMENT = 16;
const STATE_COMMENT_END_DASH = 17;
const STATE_COMMENT_END = 18;
const STATE_COMMENT_END_BANG = 19;
const STATE_BOGUS_COMMENT = 20;

const STATE_COMMENT_LESS_THAN_SIGN = 21;
const STATE_COMMENT_LESS_THAN_SIGN_BANG = 22;
const STATE_COMMENT_LESS_THAN_SIGN_BANG_DASH = 23;
const STATE_COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH = 24;

const STATE_DOCTYPE = 25;
const STATE_BEFORE_DOCTYPE_NAME = 26;
const STATE_DOCTYPE_NAME = 27;
const STATE_AFTER_DOCTYPE_NAME = 28;
const STATE_AFTER_DOCTYPE_PUBLIC_KEYWORD = 29;
const STATE_BEFORE_DOCTYPE_PUBLIC_IDENTIFIER = 30;
const STATE_DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED = 31;
const STATE_DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED = 32;
const STATE_AFTER_DOCTYPE_PUBLIC_IDENTIFIER = 33;
const STATE_BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS = 34;
const STATE_AFTER_DOCTYPE_SYSTEM_KEYWORD = 35;
const STATE_BEFORE_DOCTYPE_SYSTEM_IDENTIFIER = 36;
const STATE_DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED = 37;
const STATE_DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED = 38;
const STATE_AFTER_DOCTYPE_SYSTEM_IDENTIFIER = 39;
const STATE_BOGUS_DOCTYPE = 40;

const STATE_CDATA_SECTION = 41;
const STATE_CDATA_SECTION_BRACKET = 42;
const STATE_CDATA_SECTION_END = 43;

const STATE_RCDATA = 44;
const STATE_RCDATA_LESS_THAN_SIGN = 45;
const STATE_RCDATA_END_TAG_OPEN = 46;
const STATE_RCDATA_END_TAG_NAME = 47;

const STATE_RAWTEXT = 48;
const STATE_RAWTEXT_LESS_THAN_SIGN = 49;
const STATE_RAWTEXT_END_TAG_OPEN = 50;
const STATE_RAWTEXT_END_TAG_NAME = 51;

const STATE_SCRIPT_DATA = 52;
const STATE_SCRIPT_DATA_LESS_THAN_SIGN = 53;
const STATE_SCRIPT_DATA_END_TAG_OPEN = 54;
const STATE_SCRIPT_DATA_END_TAG_NAME = 55;
const STATE_SCRIPT_DATA_ESCAPE_START = 56;
const STATE_SCRIPT_DATA_ESCAPE_START_DASH = 57;
const STATE_SCRIPT_DATA_ESCAPED = 58;
const STATE_SCRIPT_DATA_ESCAPED_DASH = 59;
const STATE_SCRIPT_DATA_ESCAPED_DASH_DASH = 60;
const STATE_SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN = 61;
const STATE_SCRIPT_DATA_ESCAPED_END_TAG_OPEN = 62;
const STATE_SCRIPT_DATA_ESCAPED_END_TAG_NAME = 63;
const STATE_SCRIPT_DATA_DOUBLE_ESCAPE_START = 64;
const STATE_SCRIPT_DATA_DOUBLE_ESCAPED = 65;
const STATE_SCRIPT_DATA_DOUBLE_ESCAPED_DASH = 66;
const STATE_SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH = 67;
const STATE_SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN = 68;
const STATE_SCRIPT_DATA_DOUBLE_ESCAPE_END = 69;

const STATE_PLAINTEXT = 70;

// https://html.spec.whatwg.org/multipage/parsing.html#character-reference-state
const STATE_CHARACTER_REFERENCE = 71;
// https://html.spec.whatwg.org/multipage/parsing.html#named-character-reference-state
const STATE_NAMED_CHARACTER_REFERENCE = 72;
// https://html.spec.whatwg.org/multipage/parsing.html#ambiguous-ampersand-state
const STATE_AMBIGUOUS_AMPERSAND = 73;
// https://html.spec.whatwg.org/multipage/parsing.html#numeric-character-reference-state
const STATE_NUMERIC_CHARACTER_REFERENCE = 74;
// https://html.spec.whatwg.org/multipage/parsing.html#hexadecimal-character-reference-start-state
const STATE_HEXADECIMAL_CHARACTER_REFERENCE_START = 75;
// https://html.spec.whatwg.org/multipage/parsing.html#decimal-character-reference-start-state
const STATE_DECIMAL_CHARACTER_REFERENCE_START = 76;
// https://html.spec.whatwg.org/multipage/parsing.html#hexadecimal-character-reference-state
const STATE_HEXADECIMAL_CHARACTER_REFERENCE = 77;
// https://html.spec.whatwg.org/multipage/parsing.html#decimal-character-reference-state
const STATE_DECIMAL_CHARACTER_REFERENCE = 78;
// https://html.spec.whatwg.org/multipage/parsing.html#numeric-character-reference-end-state
const STATE_NUMERIC_CHARACTER_REFERENCE_END = 79;

const CC_TAB = 0x09;
const CC_LF = 0x0a;
const CC_FF = 0x0c;
const CC_SPACE = 0x20;
const CC_EXCLAMATION_MARK = 0x21;
const CC_QUOTATION_MARK = 0x22;
const CC_NUMBER_SIGN = 0x23;
const CC_AMPERSAND = 0x26;
const CC_APOSTROPHE = 0x27;
const CC_HYPHEN_MINUS = 0x2d;
const CC_SOLIDUS = 0x2f;
const CC_SEMICOLON = 0x3b;
const CC_LESS_THAN = 0x3c;
const CC_EQUALS = 0x3d;
const CC_GREATER_THAN = 0x3e;
const CC_QUESTION_MARK = 0x3f;
const CC_LEFT_SQUARE_BRACKET = 0x5b;
const CC_RIGHT_SQUARE_BRACKET = 0x5d;

const QUOTE_DOUBLE = 1;
const QUOTE_SINGLE = 2;
const QUOTE_NONE = 0;

/**
 * @param {number} cc character code
 * @returns {boolean} is ascii alpha
 */
const isAsciiAlpha = (cc) =>
	(cc >= 0x41 && cc <= 0x5a) || (cc >= 0x61 && cc <= 0x7a);

/**
 * @param {number} cc character code
 * @returns {boolean} is ascii alphanumeric
 */
const isAsciiAlphanumeric = (cc) =>
	isAsciiAlpha(cc) || (cc >= 0x30 && cc <= 0x39);

/**
 * @param {number} cc character code
 * @returns {boolean} is ascii digit
 */
const isAsciiDigit = (cc) => cc >= 0x30 && cc <= 0x39;

/**
 * @param {number} cc character code
 * @returns {boolean} is ascii hex digit
 */
const isAsciiHexDigit = (cc) =>
	(cc >= 0x30 && cc <= 0x39) ||
	(cc >= 0x41 && cc <= 0x46) ||
	(cc >= 0x61 && cc <= 0x66);

/**
 * @param {number} cc character code
 * @returns {boolean} is space
 */
const isSpace = (cc) =>
	cc === CC_TAB || cc === CC_LF || cc === CC_FF || cc === CC_SPACE;

/**
 * Severity of a tokenizer-detected parse error. `"warning"` is recoverable
 * (the tokenizer continued and the emitted token is still well-formed, e.g.
 * missing-attribute-value); `"error"` means the emitted token byte range is
 * incomplete or does not match what the spec would produce, e.g. eof-in-tag.
 * @typedef {"warning" | "error"} ParseErrorSeverity
 */

/**
 * @typedef {object} HtmlTokenCallbacks
 * @property {(input: string, start: number, end: number, nameStart: number, nameEnd: number, selfClosing: boolean) => number=} openTag
 * @property {(input: string, start: number, end: number, nameStart: number, nameEnd: number) => number=} closeTag
 * @property {(input: string, start: number, end: number) => number=} text
 * @property {(input: string, nameStart: number, nameEnd: number, valueStart: number, valueEnd: number, quoteType: number) => number=} attribute
 * @property {(input: string, start: number, end: number) => number=} comment
 * @property {(input: string, start: number, end: number) => number=} doctype
 * @property {(input: string, code: string, start: number, end: number, severity: ParseErrorSeverity) => void=} parseError
 */

/**
 * @param {string} input input string
 * @param {number} pos current position
 * @param {HtmlTokenCallbacks} callbacks callbacks
 * @returns {number} final position
 */
const walkHtmlTokens = (input, pos = 0, callbacks = {}) => {
	const len = input.length;
	let state = STATE_DATA;
	let returnState = STATE_DATA;

	let textStart = pos;
	let tagStart = pos;
	let tagNameStart = -1;
	let tagNameEnd = -1;
	let attrNameStart = -1;
	let attrNameEnd = -1;
	let attrValueStart = -1;
	let attrQuoteType = QUOTE_NONE;
	let commentStart = pos;
	let lastOpenTagName = "";
	let tempBuffer = "";
	let namedEntityConsumed = 0;

	/**
	 * Reports a tokenizer parse error to the consumer. The byte range and
	 * severity follow the WHATWG spec naming. Severity is `"error"` for
	 * cases where the emitted token is incomplete (EOF inside a tag or
	 * comment); everything else is a `"warning"`.
	 * @param {string} code WHATWG parse-error code (kebab-case)
	 * @param {number} start byte offset where the error starts
	 * @param {number} end byte offset where the error ends
	 * @param {ParseErrorSeverity} severity error severity
	 */
	const reportError = (code, start, end, severity) => {
		if (callbacks.parseError !== undefined) {
			callbacks.parseError(input, code, start, end, severity);
		}
	};

	/**
	 * @param {number} cc character code
	 * @returns {boolean} is ascii lower alpha
	 */
	const isAsciiLowerAlpha = (cc) => cc >= 0x61 && cc <= 0x7a;

	/**
	 * @param {number} cc character code
	 * @returns {boolean} is ascii upper alpha
	 */
	const isAsciiUpperAlpha = (cc) => cc >= 0x41 && cc <= 0x5a;

	/**
	 * @param {string} name tag name (lowercase)
	 * @returns {number} content mode state for this tag, or STATE_DATA
	 */
	const getContentModeForTag = (name) => {
		switch (name) {
			case "textarea":
			case "title":
				return STATE_RCDATA;
			case "style":
			case "xmp":
			case "iframe":
			case "noembed":
			case "noframes":
				return STATE_RAWTEXT;
			case "script":
				return STATE_SCRIPT_DATA;
			case "plaintext":
				return STATE_PLAINTEXT;
			default:
				return STATE_DATA;
		}
	};

	/**
	 * @param {number} endPos end position
	 */
	const flushText = (endPos) => {
		if (textStart < endPos && callbacks.text !== undefined) {
			callbacks.text(input, textStart, endPos);
		}
	};

	/**
	 * @param {number} endPos end position
	 * @returns {number} next position
	 */
	const emitAttribute = (endPos) => {
		// Default `nextPos` advances past the closing quote (if any) so the
		// state machine can continue when no `attribute` callback is provided.
		// When a callback IS provided, its return value overrides the default —
		// the callback is expected to do the same advance based on the
		// reported `quoteType`.
		let nextPos = attrQuoteType === QUOTE_NONE ? endPos : endPos + 1;
		if (callbacks.attribute !== undefined && attrNameStart !== -1) {
			nextPos = callbacks.attribute(
				input,
				attrNameStart,
				attrNameEnd,
				attrValueStart,
				attrValueStart === -1 ? -1 : endPos,
				attrQuoteType
			);
		}
		attrNameStart = -1;
		attrValueStart = -1;
		attrQuoteType = QUOTE_NONE;
		return nextPos;
	};

	/**
	 * @param {number} endPos end position
	 * @param {boolean} selfClosing is self closing
	 * @returns {number} next position
	 */
	const emitOpenTag = (endPos, selfClosing) => {
		let nextPos = endPos;
		if (callbacks.openTag !== undefined) {
			nextPos = callbacks.openTag(
				input,
				tagStart,
				endPos,
				tagNameStart,
				tagNameEnd,
				selfClosing
			);
		}
		if (!selfClosing) {
			lastOpenTagName = input.slice(tagNameStart, tagNameEnd).toLowerCase();
		}
		textStart = nextPos;
		return nextPos;
	};

	/**
	 * @param {number} endPos end position
	 * @returns {number} next position
	 */
	const emitCloseTag = (endPos) => {
		let nextPos = endPos;
		if (callbacks.closeTag !== undefined) {
			nextPos = callbacks.closeTag(
				input,
				tagStart,
				endPos,
				tagNameStart,
				tagNameEnd
			);
		}
		textStart = nextPos;
		return nextPos;
	};

	while (pos < len) {
		const cc = input.charCodeAt(pos);

		// TODO: We don't handle all states here yet. In the future we will need to handle
		// all of them, and when we move all the tokenizer we will remove it.
		switch (state) {
			// https://html.spec.whatwg.org/multipage/parsing.html#data-state
			case STATE_DATA:
				// Consume the next input character:
				// U+003C LESS-THAN SIGN (<)
				// Set the return state to the data state. Switch to the tag open state.
				if (cc === CC_LESS_THAN) {
					tagStart = pos;
					state = STATE_TAG_OPEN;
					pos++;
				} else if (cc === CC_AMPERSAND) {
					// U+0026 AMPERSAND (&)
					// Set the return state to the data state. Switch to the
					// character reference state.
					returnState = STATE_DATA;
					state = STATE_CHARACTER_REFERENCE;
					pos++;
				} else {
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#tag-open-state
			case STATE_TAG_OPEN:
				// Consume the next input character:
				// U+002F SOLIDUS (/)
				// Switch to the end tag open state.
				if (cc === CC_SOLIDUS) {
					state = STATE_END_TAG_OPEN;
					pos++;
				} else if (cc === CC_EXCLAMATION_MARK) {
					// U+0021 EXCLAMATION MARK (!)
					// Switch to the markup declaration open state.
					flushText(tagStart);
					commentStart = tagStart;
					state = STATE_MARKUP_DECLARATION_OPEN;
					pos++;
				} else if (isAsciiAlpha(cc)) {
					// ASCII alpha
					// Create a new start tag token, set its tag name to the empty string.
					// Reconsume in the tag name state.
					flushText(tagStart);
					tagNameStart = pos;
					state = STATE_TAG_NAME;
					// Reconsume
				} else if (cc === CC_QUESTION_MARK) {
					// U+003F QUESTION MARK (?)
					// This is an unexpected-question-mark-instead-of-tag-name parse error.
					// Create a comment token whose data is the empty string. Reconsume in the
					// bogus comment state.
					reportError(
						"unexpected-question-mark-instead-of-tag-name",
						pos,
						pos + 1,
						"warning"
					);
					flushText(tagStart);
					commentStart = tagStart;
					state = STATE_BOGUS_COMMENT;
					// Reconsume — let the bogus-comment state consume the `?`
					// itself, matching the spec.
				} else {
					// Anything else
					// This is an invalid-first-character-of-tag-name parse error. Emit a U+003C
					// LESS-THAN SIGN character token. Reconsume in the data state.
					reportError(
						"invalid-first-character-of-tag-name",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_DATA;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#end-tag-open-state
			case STATE_END_TAG_OPEN:
				// Consume the next input character:
				// ASCII alpha
				// Create a new end tag token, set its tag name to the empty string.
				// Reconsume in the tag name state.
				if (isAsciiAlpha(cc)) {
					flushText(tagStart);
					tagNameStart = pos;
					state = STATE_TAG_NAME;
					// Reconsume
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// This is a missing-end-tag-name parse error. Switch to the data state.
					reportError("missing-end-tag-name", pos, pos + 1, "warning");
					state = STATE_DATA;
					pos++;
				} else {
					// Anything else
					// This is an invalid-first-character-of-tag-name parse error. Create a
					// comment token whose data is the empty string. Reconsume in the bogus
					// comment state.
					reportError(
						"invalid-first-character-of-tag-name",
						pos,
						pos + 1,
						"warning"
					);
					flushText(tagStart);
					commentStart = tagStart;
					state = STATE_BOGUS_COMMENT;
					// Reconsume — let bogus-comment consume this char itself.
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#tag-name-state
			case STATE_TAG_NAME:
				// Consume the next input character:
				// U+0009 CHARACTER TABULATION (tab)
				// U+000A LINE FEED (LF)
				// U+000C FORM FEED (FF)
				// U+0020 SPACE
				// Switch to the before attribute name state.
				if (isSpace(cc)) {
					tagNameEnd = pos;
					state = STATE_BEFORE_ATTRIBUTE_NAME;
					pos++;
				} else if (cc === CC_SOLIDUS) {
					// U+002F SOLIDUS (/)
					// Switch to the self-closing start tag state.
					tagNameEnd = pos;
					state = STATE_SELF_CLOSING_START_TAG;
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// Switch to the data state. Emit the current tag token.
					tagNameEnd = pos;
					if (input.charCodeAt(tagStart + 1) === CC_SOLIDUS) {
						state = STATE_DATA;
						pos = emitCloseTag(pos + 1);
					} else {
						const nextPos = emitOpenTag(pos + 1, false);
						state =
							nextPos > pos + 1
								? STATE_DATA
								: getContentModeForTag(lastOpenTagName);
						pos = nextPos;
					}
				} else {
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#before-attribute-name-state
			case STATE_BEFORE_ATTRIBUTE_NAME:
				// Consume the next input character:
				// U+0009 CHARACTER TABULATION (tab)
				// U+000A LINE FEED (LF)
				// U+000C FORM FEED (FF)
				// U+0020 SPACE
				// Ignore the character.
				// Reconsume so space is handled in BEFORE_ATTRIBUTE_NAME
				if (isSpace(cc)) {
					pos++;
				} else if (cc === CC_SOLIDUS || cc === CC_GREATER_THAN) {
					// U+002F SOLIDUS (/)
					// U+003E GREATER-THAN SIGN (>)
					// EOF
					// Reconsume in the after attribute name state.
					state = STATE_AFTER_ATTRIBUTE_NAME;
					// Reconsume
				} else if (cc === CC_EQUALS) {
					// U+003D EQUALS SIGN (=)
					// This is an unexpected-equals-sign-before-attribute-name parse
					// error. Start a new attribute. Switch to the attribute name state.
					reportError(
						"unexpected-equals-sign-before-attribute-name",
						pos,
						pos + 1,
						"warning"
					);
					attrNameStart = pos;
					state = STATE_ATTRIBUTE_NAME;
					pos++;
				} else {
					// Anything else
					// Start a new attribute in the current tag token. Set that attribute name
					// and value to the empty string. Reconsume in the attribute name state.
					attrNameStart = pos;
					state = STATE_ATTRIBUTE_NAME;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#attribute-name-state
			case STATE_ATTRIBUTE_NAME:
				// Consume the next input character:
				// U+0009 CHARACTER TABULATION (tab)
				// U+000A LINE FEED (LF)
				// U+000C FORM FEED (FF)
				// U+0020 SPACE
				// U+002F SOLIDUS (/)
				// U+003E GREATER-THAN SIGN (>)
				// EOF
				// Reconsume in the after attribute name state.
				if (isSpace(cc) || cc === CC_SOLIDUS || cc === CC_GREATER_THAN) {
					attrNameEnd = pos;
					state = STATE_AFTER_ATTRIBUTE_NAME;
					// Reconsume
				} else if (cc === CC_EQUALS) {
					attrNameEnd = pos;
					state = STATE_BEFORE_ATTRIBUTE_VALUE;
					pos++;
				} else {
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#after-attribute-name-state
			case STATE_AFTER_ATTRIBUTE_NAME:
				// Consume the next input character:
				// U+0009 CHARACTER TABULATION (tab)
				// U+000A LINE FEED (LF)
				// U+000C FORM FEED (FF)
				// U+0020 SPACE
				// Ignore the character.
				if (isSpace(cc)) {
					pos++;
				} else if (cc === CC_SOLIDUS) {
					// U+002F SOLIDUS (/)
					// Switch to the self-closing start tag state.
					emitAttribute(pos);
					state = STATE_SELF_CLOSING_START_TAG;
					pos++;
				} else if (cc === CC_EQUALS) {
					// U+003D EQUALS SIGN (=)
					// Switch to the before attribute value state.
					state = STATE_BEFORE_ATTRIBUTE_VALUE;
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// Switch to the data state. Emit the current tag token.
					emitAttribute(pos);
					if (input.charCodeAt(tagStart + 1) === CC_SOLIDUS) {
						state = STATE_DATA;
						pos = emitCloseTag(pos + 1);
					} else {
						const nextPos = emitOpenTag(pos + 1, false);
						state =
							nextPos > pos + 1
								? STATE_DATA
								: getContentModeForTag(lastOpenTagName);
						pos = nextPos;
					}
				} else {
					// Anything else
					// Start a new attribute in the current tag token.
					emitAttribute(pos);
					attrNameStart = pos;
					state = STATE_ATTRIBUTE_NAME;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#before-attribute-value-state
			case STATE_BEFORE_ATTRIBUTE_VALUE:
				// Consume the next input character:
				// U+0009 CHARACTER TABULATION (tab)
				// U+000A LINE FEED (LF)
				// U+000C FORM FEED (FF)
				// U+0020 SPACE
				// Ignore the character.
				if (isSpace(cc)) {
					pos++;
				} else if (cc === CC_QUOTATION_MARK) {
					// U+0022 QUOTATION MARK (")
					// Switch to the attribute value (double-quoted) state.
					attrValueStart = pos + 1;
					attrQuoteType = QUOTE_DOUBLE;
					state = STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED;
					pos++;
				} else if (cc === CC_APOSTROPHE) {
					// U+0027 APOSTROPHE (')
					// Switch to the attribute value (single-quoted) state.
					attrValueStart = pos + 1;
					attrQuoteType = QUOTE_SINGLE;
					state = STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED;
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// This is a missing-attribute-value parse error. Switch to the data
					// state. Emit the current tag token. The attribute is reported with
					// an empty value range pointing at the `>` so the open-tag byte range
					// still includes the `>`.
					reportError("missing-attribute-value", pos, pos + 1, "warning");
					attrValueStart = pos;
					attrQuoteType = QUOTE_NONE;
					pos = emitAttribute(pos);
					if (input.charCodeAt(tagStart + 1) === CC_SOLIDUS) {
						state = STATE_DATA;
						pos = emitCloseTag(pos + 1);
					} else {
						const nextPos = emitOpenTag(pos + 1, false);
						state =
							nextPos > pos + 1
								? STATE_DATA
								: getContentModeForTag(lastOpenTagName);
						pos = nextPos;
					}
				} else {
					// Anything else
					// Reconsume in the attribute value (unquoted) state.
					attrValueStart = pos;
					attrQuoteType = QUOTE_NONE;
					state = STATE_ATTRIBUTE_VALUE_UNQUOTED;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#attribute-value-(double-quoted)-state
			case STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED:
				// Consume the next input character:
				// U+0022 QUOTATION MARK (")
				// Switch to the after attribute value (quoted) state.
				if (cc === CC_QUOTATION_MARK) {
					pos = emitAttribute(pos);
					state = STATE_AFTER_ATTRIBUTE_VALUE_QUOTED;
				} else if (cc === CC_AMPERSAND) {
					// U+0026 AMPERSAND (&)
					// Set the return state to the attribute value (double-quoted)
					// state. Switch to the character reference state.
					returnState = STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED;
					state = STATE_CHARACTER_REFERENCE;
					pos++;
				} else {
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#attribute-value-(single-quoted)-state
			case STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED:
				// Consume the next input character:
				// U+0027 APOSTROPHE (')
				// Switch to the after attribute value (quoted) state.
				if (cc === CC_APOSTROPHE) {
					pos = emitAttribute(pos);
					state = STATE_AFTER_ATTRIBUTE_VALUE_QUOTED;
				} else if (cc === CC_AMPERSAND) {
					// U+0026 AMPERSAND (&)
					// Set the return state to the attribute value (single-quoted)
					// state. Switch to the character reference state.
					returnState = STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED;
					state = STATE_CHARACTER_REFERENCE;
					pos++;
				} else {
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#attribute-value-(unquoted)-state
			case STATE_ATTRIBUTE_VALUE_UNQUOTED:
				if (isSpace(cc)) {
					pos = emitAttribute(pos);
					state = STATE_BEFORE_ATTRIBUTE_NAME;
					// Reconsume so space is handled in BEFORE_ATTRIBUTE_NAME
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// This is a missing-attribute-value parse error. Switch to the data state.
					// Emit the current tag token.
					pos = emitAttribute(pos);
					if (input.charCodeAt(tagStart + 1) === CC_SOLIDUS) {
						state = STATE_DATA;
						pos = emitCloseTag(pos + 1);
					} else {
						const nextPos = emitOpenTag(pos + 1, false);
						state =
							nextPos > pos + 1
								? STATE_DATA
								: getContentModeForTag(lastOpenTagName);
						pos = nextPos;
					}
				} else if (cc === CC_AMPERSAND) {
					// U+0026 AMPERSAND (&)
					// Set the return state to the attribute value (unquoted)
					// state. Switch to the character reference state.
					returnState = STATE_ATTRIBUTE_VALUE_UNQUOTED;
					state = STATE_CHARACTER_REFERENCE;
					pos++;
				} else {
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#after-attribute-value-(quoted)-state
			case STATE_AFTER_ATTRIBUTE_VALUE_QUOTED:
				// Consume the next input character:
				// U+0009 CHARACTER TABULATION (tab)
				// U+000A LINE FEED (LF)
				// U+000C FORM FEED (FF)
				// U+0020 SPACE
				// Switch to the before attribute name state.
				if (isSpace(cc)) {
					state = STATE_BEFORE_ATTRIBUTE_NAME;
					pos++;
				} else if (cc === CC_SOLIDUS) {
					// U+002F SOLIDUS (/)
					// Switch to the self-closing start tag state.
					state = STATE_SELF_CLOSING_START_TAG;
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					if (input.charCodeAt(tagStart + 1) === CC_SOLIDUS) {
						state = STATE_DATA;
						pos = emitCloseTag(pos + 1);
					} else {
						const nextPos = emitOpenTag(pos + 1, false);
						state =
							nextPos > pos + 1
								? STATE_DATA
								: getContentModeForTag(lastOpenTagName);
						pos = nextPos;
					}
				} else {
					// Anything else
					// This is a missing-whitespace-between-attributes parse error. Reconsume in
					// the before attribute name state.
					reportError(
						"missing-whitespace-between-attributes",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_BEFORE_ATTRIBUTE_NAME;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#self-closing-start-tag-state
			case STATE_SELF_CLOSING_START_TAG:
				// Consume the next input character:
				// U+003E GREATER-THAN SIGN (>)
				// Set the self-closing flag of the current tag token. Switch to the data
				// state. Emit the current tag token.
				if (cc === CC_GREATER_THAN) {
					if (input.charCodeAt(tagStart + 1) === CC_SOLIDUS) {
						state = STATE_DATA;
						pos = emitCloseTag(pos + 1);
					} else {
						pos = emitOpenTag(pos + 1, true);
						state = STATE_DATA;
					}
				} else {
					// Anything else
					// This is an unexpected-solidus-in-tag parse error. Reconsume in the before
					// attribute name state.
					reportError("unexpected-solidus-in-tag", pos, pos + 1, "warning");
					state = STATE_BEFORE_ATTRIBUTE_NAME;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#markup-declaration-open-state
			case STATE_MARKUP_DECLARATION_OPEN:
				// If the next few characters are:
				// Two U+002D HYPHEN-MINUS characters (-)
				// Consume those two characters, create a comment token whose data
				// is the empty string, and switch to the comment start state.
				if (
					cc === CC_HYPHEN_MINUS &&
					input.charCodeAt(pos + 1) === CC_HYPHEN_MINUS
				) {
					pos += 2;
					commentStart = tagStart;
					state = STATE_COMMENT_START;
				} else if (
					// ASCII case-insensitive match for the word "DOCTYPE"
					// Consume those characters and switch to the DOCTYPE state.
					(cc === 0x44 || cc === 0x64) /* D or d */ &&
					(input.charCodeAt(pos + 1) | 0x20) === 0x6f /* o */ &&
					(input.charCodeAt(pos + 2) | 0x20) === 0x63 /* c */ &&
					(input.charCodeAt(pos + 3) | 0x20) === 0x74 /* t */ &&
					(input.charCodeAt(pos + 4) | 0x20) === 0x79 /* y */ &&
					(input.charCodeAt(pos + 5) | 0x20) === 0x70 /* p */ &&
					(input.charCodeAt(pos + 6) | 0x20) === 0x65 /* e */
				) {
					pos += 7;
					commentStart = tagStart;
					state = STATE_DOCTYPE;
				} else if (
					// The string "[CDATA[" (the five uppercase letters "CDATA" with a
					// U+005B LEFT SQUARE BRACKET character before and after)
					// Consume those characters and switch to the CDATA section state.
					cc === CC_LEFT_SQUARE_BRACKET &&
					input.charCodeAt(pos + 1) === 0x43 /* C */ &&
					input.charCodeAt(pos + 2) === 0x44 /* D */ &&
					input.charCodeAt(pos + 3) === 0x41 /* A */ &&
					input.charCodeAt(pos + 4) === 0x54 /* T */ &&
					input.charCodeAt(pos + 5) === 0x41 /* A */ &&
					input.charCodeAt(pos + 6) === CC_LEFT_SQUARE_BRACKET
				) {
					pos += 7;
					commentStart = tagStart;
					state = STATE_CDATA_SECTION;
				} else {
					// Anything else
					// This is an incorrectly-opened-comment parse error. Create a comment token
					// whose data is the empty string. Switch to the bogus comment state (don't
					// consume anything in the current state).
					reportError("incorrectly-opened-comment", tagStart, pos, "warning");
					commentStart = tagStart;
					state = STATE_BOGUS_COMMENT;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#comment-start-state
			case STATE_COMMENT_START:
				// Consume the next input character:
				// U+002D HYPHEN-MINUS (-)
				// Switch to the comment start dash state.
				if (cc === CC_HYPHEN_MINUS) {
					state = STATE_COMMENT_START_DASH;
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// This is an abrupt-closing-of-empty-comment parse error. Switch to the
					// data state. Emit the current comment token.
					reportError(
						"abrupt-closing-of-empty-comment",
						pos,
						pos + 1,
						"warning"
					);
					let nextPos = pos + 1;
					if (callbacks.comment !== undefined) {
						nextPos = callbacks.comment(input, commentStart, pos + 1);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// Anything else
					// Reconsume in the comment state.
					state = STATE_COMMENT;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#comment-start-dash-state
			case STATE_COMMENT_START_DASH:
				// Consume the next input character:
				// U+002D HYPHEN-MINUS (-)
				// Switch to the comment end state.
				if (cc === CC_HYPHEN_MINUS) {
					state = STATE_COMMENT_END;
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// This is an abrupt-closing-of-empty-comment parse error. Switch to the
					// data state. Emit the current comment token.
					reportError(
						"abrupt-closing-of-empty-comment",
						pos,
						pos + 1,
						"warning"
					);
					let nextPos = pos + 1;
					if (callbacks.comment !== undefined) {
						nextPos = callbacks.comment(input, commentStart, pos + 1);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// Anything else
					// Append a U+002D HYPHEN-MINUS character (-) to the comment token's data.
					// Reconsume in the comment state.
					state = STATE_COMMENT;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#comment-state
			case STATE_COMMENT:
				// Consume the next input character:
				// U+003C LESS-THAN SIGN (<)
				// Append a U+003C LESS-THAN SIGN character to the comment token's data. Switch to the comment less-than sign state.
				if (cc === CC_LESS_THAN) {
					state = STATE_COMMENT_LESS_THAN_SIGN;
					pos++;
				} else if (cc === CC_HYPHEN_MINUS) {
					// Consume the next input character:
					// U+002D HYPHEN-MINUS (-)
					// Switch to the comment end dash state.
					state = STATE_COMMENT_END_DASH;
					pos++;
				} else {
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#comment-end-dash-state
			case STATE_COMMENT_END_DASH:
				// Consume the next input character:
				// U+002D HYPHEN-MINUS (-)
				// Switch to the comment end state.
				if (cc === CC_HYPHEN_MINUS) {
					state = STATE_COMMENT_END;
					pos++;
				} else {
					// Anything else
					// Append a U+002D HYPHEN-MINUS character (-) to the comment token's data.
					// Reconsume in the comment state.
					state = STATE_COMMENT;
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#comment-end-state
			case STATE_COMMENT_END:
				// Consume the next input character:
				// U+003E GREATER-THAN SIGN (>)
				// Switch to the data state. Emit the current comment token.
				if (cc === CC_GREATER_THAN) {
					let nextPos = pos + 1;
					if (callbacks.comment !== undefined) {
						nextPos = callbacks.comment(input, commentStart, pos + 1);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else if (cc === CC_EXCLAMATION_MARK) {
					// U+0021 EXCLAMATION MARK (!)
					// Switch to the comment end bang state.
					state = STATE_COMMENT_END_BANG;
					pos++;
				} else if (cc === CC_HYPHEN_MINUS) {
					pos++;
				} else {
					// Anything else
					// Append two U+002D HYPHEN-MINUS characters (-) to the comment token's
					// data. Reconsume in the comment state.
					state = STATE_COMMENT;
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#comment-end-bang-state
			case STATE_COMMENT_END_BANG:
				// Consume the next input character:
				// U+002D HYPHEN-MINUS (-)
				// Append two U+002D HYPHEN-MINUS characters (-) and a U+0021 EXCLAMATION
				// MARK character (!) to the comment token's data. Switch to the comment end
				// dash state.
				if (cc === CC_HYPHEN_MINUS) {
					state = STATE_COMMENT_END_DASH;
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// This is an incorrectly-closed-comment parse error. Switch to the data
					// state. Emit the current comment token.
					reportError("incorrectly-closed-comment", pos, pos + 1, "warning");
					let nextPos = pos + 1;
					if (callbacks.comment !== undefined) {
						nextPos = callbacks.comment(input, commentStart, pos + 1);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// Anything else
					// Append two U+002D HYPHEN-MINUS characters (-) and a U+0021 EXCLAMATION
					// MARK character (!) to the comment token's data. Reconsume in the comment
					// state.
					state = STATE_COMMENT;
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#bogus-comment-state
			case STATE_BOGUS_COMMENT:
				// Consume the next input character:
				// U+003E GREATER-THAN SIGN (>)
				// Switch to the data state. Emit the current comment token.
				if (cc === CC_GREATER_THAN) {
					let nextPos = pos + 1;
					if (callbacks.comment !== undefined) {
						nextPos = callbacks.comment(input, commentStart, pos + 1);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#comment-less-than-sign-state
			case STATE_COMMENT_LESS_THAN_SIGN:
				// Consume the next input character:
				// U+0021 EXCLAMATION MARK (!)
				// Append the current input character to the comment token's data. Switch to
				// the comment less-than sign bang state.
				if (cc === CC_EXCLAMATION_MARK) {
					state = STATE_COMMENT_LESS_THAN_SIGN_BANG;
					pos++;
				} else if (cc === CC_LESS_THAN) {
					// U+003C LESS-THAN SIGN (<)
					// Append the current input character to the comment token's data.
					pos++;
				} else {
					// Anything else
					// Reconsume in the comment state.
					state = STATE_COMMENT;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#comment-less-than-sign-bang-state
			case STATE_COMMENT_LESS_THAN_SIGN_BANG:
				// Consume the next input character:
				// U+002D HYPHEN-MINUS (-)
				// Switch to the comment less-than sign bang dash state.
				if (cc === CC_HYPHEN_MINUS) {
					state = STATE_COMMENT_LESS_THAN_SIGN_BANG_DASH;
					pos++;
				} else {
					// Anything else
					// Reconsume in the comment state.
					state = STATE_COMMENT;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#comment-less-than-sign-bang-dash-state
			case STATE_COMMENT_LESS_THAN_SIGN_BANG_DASH:
				// Consume the next input character:
				// U+002D HYPHEN-MINUS (-)
				// Switch to the comment less-than sign bang dash dash state.
				if (cc === CC_HYPHEN_MINUS) {
					state = STATE_COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH;
					pos++;
				} else {
					// Anything else
					// Reconsume in the comment end dash state.
					state = STATE_COMMENT_END_DASH;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#comment-less-than-sign-bang-dash-dash-state
			case STATE_COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH:
				// Consume the next input character:
				// U+003E GREATER-THAN SIGN (>)
				// EOF
				// Reconsume in the comment end state.
				// Anything else
				// This is a nested-comment parse error. Reconsume in the comment end state.
				if (cc !== CC_GREATER_THAN) {
					reportError("nested-comment", pos, pos + 1, "warning");
				}
				state = STATE_COMMENT_END;
				// Reconsume
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#doctype-state
			case STATE_DOCTYPE:
				// Consume the next input character:
				// U+0009 CHARACTER TABULATION (tab)
				// U+000A LINE FEED (LF)
				// U+000C FORM FEED (FF)
				// U+0020 SPACE
				// Switch to the before DOCTYPE name state.
				if (isSpace(cc)) {
					state = STATE_BEFORE_DOCTYPE_NAME;
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// Reconsume in the before DOCTYPE name state.
					state = STATE_BEFORE_DOCTYPE_NAME;
				} else {
					// Anything else
					// This is a missing-whitespace-before-doctype-name parse error. Reconsume
					// in the before DOCTYPE name state.
					reportError(
						"missing-whitespace-before-doctype-name",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_BEFORE_DOCTYPE_NAME;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#before-doctype-name-state
			case STATE_BEFORE_DOCTYPE_NAME:
				// Consume the next input character:
				// U+0009 CHARACTER TABULATION (tab)
				// U+000A LINE FEED (LF)
				// U+000C FORM FEED (FF)
				// U+0020 SPACE
				// Ignore the character.
				if (isSpace(cc)) {
					pos++;
				} else if (cc === 0x00) {
					// U+0000 NULL
					// This is an unexpected-null-character parse error. Create a new DOCTYPE
					// token. Set the token's name to a U+FFFD REPLACEMENT CHARACTER character.
					// Switch to the DOCTYPE name state.
					state = STATE_DOCTYPE_NAME;
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// This is a missing-doctype-name parse error. Create a new DOCTYPE token.
					// Set its force-quirks flag to on. Switch to the data state. Emit the
					// current token.
					reportError("missing-doctype-name", pos, pos + 1, "warning");
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(input, commentStart, pos + 1);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// ASCII upper alpha
					// Create a new DOCTYPE token. Set the token's name to the lowercase version
					// of the current input character (add 0x0020 to the character's code
					// point). Switch to the DOCTYPE name state.
					// Anything else
					// Create a new DOCTYPE token. Set the token's name to the current input
					// character. Switch to the DOCTYPE name state.
					state = STATE_DOCTYPE_NAME;
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#doctype-name-state
			case STATE_DOCTYPE_NAME:
				// Consume the next input character:
				// U+0009 CHARACTER TABULATION (tab)
				// U+000A LINE FEED (LF)
				// U+000C FORM FEED (FF)
				// U+0020 SPACE
				// Switch to the after DOCTYPE name state.
				if (isSpace(cc)) {
					state = STATE_AFTER_DOCTYPE_NAME;
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// Switch to the data state. Emit the current DOCTYPE token.
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(input, commentStart, pos + 1);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else if (cc === 0x00) {
					// U+0000 NULL
					// This is an unexpected-null-character parse error. Append a U+FFFD
					// REPLACEMENT CHARACTER character to the current DOCTYPE token's name.
					pos++;
				} else {
					// ASCII upper alpha
					// Append the lowercase version of the current input character (add 0x0020
					// to the character's code point) to the current DOCTYPE token's name.
					// Anything else
					// Append the current input character to the current DOCTYPE token's name.
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#after-doctype-name-state
			case STATE_AFTER_DOCTYPE_NAME:
				// Consume the next input character:
				if (isSpace(cc)) {
					// U+0009 CHARACTER TABULATION (tab)
					// U+000A LINE FEED (LF)
					// U+000C FORM FEED (FF)
					// U+0020 SPACE
					// Ignore the character.
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// Switch to the data state. Emit the current DOCTYPE token.
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(input, commentStart, pos + 1);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else if (
					pos + 5 < len &&
					(cc === 0x50 || cc === 0x70) /* P or p */ &&
					(input.charCodeAt(pos + 1) | 0x20) === 0x75 /* u */ &&
					(input.charCodeAt(pos + 2) | 0x20) === 0x62 /* b */ &&
					(input.charCodeAt(pos + 3) | 0x20) === 0x6c /* l */ &&
					(input.charCodeAt(pos + 4) | 0x20) === 0x69 /* i */ &&
					(input.charCodeAt(pos + 5) | 0x20) === 0x63 /* c */
				) {
					// ASCII case-insensitive match for the word "PUBLIC"
					pos += 6;
					state = STATE_AFTER_DOCTYPE_PUBLIC_KEYWORD;
				} else if (
					pos + 5 < len &&
					(cc === 0x53 || cc === 0x73) /* S or s */ &&
					(input.charCodeAt(pos + 1) | 0x20) === 0x79 /* y */ &&
					(input.charCodeAt(pos + 2) | 0x20) === 0x73 /* s */ &&
					(input.charCodeAt(pos + 3) | 0x20) === 0x74 /* t */ &&
					(input.charCodeAt(pos + 4) | 0x20) === 0x65 /* e */ &&
					(input.charCodeAt(pos + 5) | 0x20) === 0x6d /* m */
				) {
					// ASCII case-insensitive match for the word "SYSTEM"
					pos += 6;
					state = STATE_AFTER_DOCTYPE_SYSTEM_KEYWORD;
				} else {
					// Anything else
					// This is an invalid-character-sequence-after-doctype-name parse error. Set
					// the current DOCTYPE token's force-quirks flag to on. Reconsume in the
					// bogus DOCTYPE state.
					reportError(
						"invalid-character-sequence-after-doctype-name",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_BOGUS_DOCTYPE;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#after-doctype-public-keyword-state
			case STATE_AFTER_DOCTYPE_PUBLIC_KEYWORD:
				// Consume the next input character:
				if (isSpace(cc)) {
					// U+0009 CHARACTER TABULATION (tab)
					// U+000A LINE FEED (LF)
					// U+000C FORM FEED (FF)
					// U+0020 SPACE
					// Switch to the before DOCTYPE public identifier state.
					state = STATE_BEFORE_DOCTYPE_PUBLIC_IDENTIFIER;
					pos++;
				} else if (cc === CC_QUOTATION_MARK) {
					// U+0022 QUOTATION MARK (")
					// This is a missing-whitespace-after-doctype-public-keyword parse error.
					// Set the current DOCTYPE token's public identifier to the empty string
					// (not missing), then switch to the DOCTYPE public identifier
					// (double-quoted) state.
					reportError(
						"missing-whitespace-after-doctype-public-keyword",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED;
					pos++;
				} else if (cc === CC_APOSTROPHE) {
					// U+0027 APOSTROPHE (')
					// This is a missing-whitespace-after-doctype-public-keyword parse error.
					// Set the current DOCTYPE token's public identifier to the empty string
					// (not missing), then switch to the DOCTYPE public identifier
					// (single-quoted) state.
					reportError(
						"missing-whitespace-after-doctype-public-keyword",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED;
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// This is a missing-doctype-public-identifier parse error. Set the current
					// DOCTYPE token's force-quirks flag to on. Switch to the data state. Emit
					// the current DOCTYPE token.
					reportError(
						"missing-doctype-public-identifier",
						pos,
						pos + 1,
						"warning"
					);
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(input, commentStart, pos + 1);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// Anything else
					// This is a missing-quote-before-doctype-public-identifier parse error. Set
					// the current DOCTYPE token's force-quirks flag to on. Reconsume in the
					// bogus DOCTYPE state.
					reportError(
						"missing-quote-before-doctype-public-identifier",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_BOGUS_DOCTYPE;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#before-doctype-public-identifier-state
			case STATE_BEFORE_DOCTYPE_PUBLIC_IDENTIFIER:
				// Consume the next input character:
				if (isSpace(cc)) {
					// U+0009 CHARACTER TABULATION (tab)
					// U+000A LINE FEED (LF)
					// U+000C FORM FEED (FF)
					// U+0020 SPACE
					// Ignore the character.
					pos++;
				} else if (cc === CC_QUOTATION_MARK) {
					// U+0022 QUOTATION MARK (")
					// Set the current DOCTYPE token's public identifier to the empty string
					// (not missing), then switch to the DOCTYPE public identifier
					// (double-quoted) state.
					state = STATE_DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED;
					pos++;
				} else if (cc === CC_APOSTROPHE) {
					// U+0027 APOSTROPHE (')
					// Set the current DOCTYPE token's public identifier to the empty string
					// (not missing), then switch to the DOCTYPE public identifier
					// (single-quoted) state.
					state = STATE_DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED;
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// This is a missing-doctype-public-identifier parse error. Set the current
					// DOCTYPE token's force-quirks flag to on. Switch to the data state. Emit
					// the current DOCTYPE token.
					reportError(
						"missing-doctype-public-identifier",
						pos,
						pos + 1,
						"warning"
					);
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(input, commentStart, pos + 1);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// Anything else
					// This is a missing-quote-before-doctype-public-identifier parse error. Set
					// the current DOCTYPE token's force-quirks flag to on. Reconsume in the
					// bogus DOCTYPE state.
					reportError(
						"missing-quote-before-doctype-public-identifier",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_BOGUS_DOCTYPE;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#doctype-public-identifier-(double-quoted)-state
			case STATE_DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED:
				// Consume the next input character:
				if (cc === CC_QUOTATION_MARK) {
					// U+0022 QUOTATION MARK (")
					// Switch to the after DOCTYPE public identifier state.
					state = STATE_AFTER_DOCTYPE_PUBLIC_IDENTIFIER;
					pos++;
				} else if (cc === 0x00) {
					// U+0000 NULL
					// This is an unexpected-null-character parse error. Append a U+FFFD
					// REPLACEMENT CHARACTER character to the current DOCTYPE token's public
					// identifier.
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// This is an abrupt-doctype-public-identifier parse error. Set the current
					// DOCTYPE token's force-quirks flag to on. Switch to the data state. Emit
					// the current DOCTYPE token.
					reportError(
						"abrupt-doctype-public-identifier",
						pos,
						pos + 1,
						"warning"
					);
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(input, commentStart, pos + 1);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// Anything else
					// Append the current input character to the current DOCTYPE token's public
					// identifier.
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#doctype-public-identifier-(single-quoted)-state
			case STATE_DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED:
				// Consume the next input character:
				if (cc === CC_APOSTROPHE) {
					// U+0027 APOSTROPHE (')
					// Switch to the after DOCTYPE public identifier state.
					state = STATE_AFTER_DOCTYPE_PUBLIC_IDENTIFIER;
					pos++;
				} else if (cc === 0x00) {
					// U+0000 NULL
					// This is an unexpected-null-character parse error. Append a U+FFFD
					// REPLACEMENT CHARACTER character to the current DOCTYPE token's public
					// identifier.
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// This is an abrupt-doctype-public-identifier parse error. Set the current
					// DOCTYPE token's force-quirks flag to on. Switch to the data state. Emit
					// the current DOCTYPE token.
					reportError(
						"abrupt-doctype-public-identifier",
						pos,
						pos + 1,
						"warning"
					);
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(input, commentStart, pos + 1);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// Anything else
					// Append the current input character to the current DOCTYPE token's public
					// identifier.
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#after-doctype-public-identifier-state
			case STATE_AFTER_DOCTYPE_PUBLIC_IDENTIFIER:
				// Consume the next input character:
				if (isSpace(cc)) {
					// U+0009 CHARACTER TABULATION (tab)
					// U+000A LINE FEED (LF)
					// U+000C FORM FEED (FF)
					// U+0020 SPACE
					// Switch to the between DOCTYPE public and system identifiers state.
					state = STATE_BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS;
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// Switch to the data state. Emit the current DOCTYPE token.
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(input, commentStart, pos + 1);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else if (cc === CC_QUOTATION_MARK) {
					// U+0022 QUOTATION MARK (")
					// This is a missing-whitespace-between-doctype-public-and-system-identifiers
					// parse error. Set the current DOCTYPE token's system
					// identifier to the empty string (not missing), then switch
					// to the DOCTYPE system identifier (double-quoted) state.
					reportError(
						"missing-whitespace-between-doctype-public-and-system-identifiers",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
					pos++;
				} else if (cc === CC_APOSTROPHE) {
					// U+0027 APOSTROPHE (')
					// This is a missing-whitespace-between-doctype-public-and-system-identifiers
					// parse error. Set the current DOCTYPE token's system
					// identifier to the empty string (not missing), then switch
					// to the DOCTYPE system identifier (single-quoted) state.
					reportError(
						"missing-whitespace-between-doctype-public-and-system-identifiers",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
					pos++;
				} else {
					// Anything else
					// This is a missing-quote-before-doctype-system-identifier parse error. Set
					// the current DOCTYPE token's force-quirks flag to on. Reconsume in the
					// bogus DOCTYPE state.
					reportError(
						"missing-quote-before-doctype-system-identifier",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_BOGUS_DOCTYPE;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#between-doctype-public-and-system-identifiers-state
			case STATE_BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS:
				// Consume the next input character:
				if (isSpace(cc)) {
					// U+0009 CHARACTER TABULATION (tab)
					// U+000A LINE FEED (LF)
					// U+000C FORM FEED (FF)
					// U+0020 SPACE
					// Ignore the character.
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// Switch to the data state. Emit the current DOCTYPE token.
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(input, commentStart, pos + 1);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else if (cc === CC_QUOTATION_MARK) {
					// U+0022 QUOTATION MARK (")
					// Set the current DOCTYPE token's system identifier to the empty string
					// (not missing), then switch to the DOCTYPE system identifier
					// (double-quoted) state.
					state = STATE_DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
					pos++;
				} else if (cc === CC_APOSTROPHE) {
					// U+0027 APOSTROPHE (')
					// Set the current DOCTYPE token's system identifier to the empty string
					// (not missing), then switch to the DOCTYPE system identifier
					// (single-quoted) state.
					state = STATE_DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
					pos++;
				} else {
					// Anything else
					// This is a missing-quote-before-doctype-system-identifier parse error. Set
					// the current DOCTYPE token's force-quirks flag to on. Reconsume in the
					// bogus DOCTYPE state.
					reportError(
						"missing-quote-before-doctype-system-identifier",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_BOGUS_DOCTYPE;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#after-doctype-system-keyword-state
			case STATE_AFTER_DOCTYPE_SYSTEM_KEYWORD:
				// Consume the next input character:
				if (isSpace(cc)) {
					// U+0009 CHARACTER TABULATION (tab)
					// U+000A LINE FEED (LF)
					// U+000C FORM FEED (FF)
					// U+0020 SPACE
					// Switch to the before DOCTYPE system identifier state.
					state = STATE_BEFORE_DOCTYPE_SYSTEM_IDENTIFIER;
					pos++;
				} else if (cc === CC_QUOTATION_MARK) {
					// U+0022 QUOTATION MARK (")
					// This is a missing-whitespace-after-doctype-system-keyword parse error.
					// Set the current DOCTYPE token's system identifier to the empty string
					// (not missing), then switch to the DOCTYPE system identifier
					// (double-quoted) state.
					reportError(
						"missing-whitespace-after-doctype-system-keyword",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
					pos++;
				} else if (cc === CC_APOSTROPHE) {
					// U+0027 APOSTROPHE (')
					// This is a missing-whitespace-after-doctype-system-keyword parse error.
					// Set the current DOCTYPE token's system identifier to the empty string
					// (not missing), then switch to the DOCTYPE system identifier
					// (single-quoted) state.
					reportError(
						"missing-whitespace-after-doctype-system-keyword",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// This is a missing-doctype-system-identifier parse error. Set the current
					// DOCTYPE token's force-quirks flag to on. Switch to the data state. Emit
					// the current DOCTYPE token.
					reportError(
						"missing-doctype-system-identifier",
						pos,
						pos + 1,
						"warning"
					);
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(input, commentStart, pos + 1);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// Anything else
					// This is a missing-quote-before-doctype-system-identifier parse error. Set
					// the current DOCTYPE token's force-quirks flag to on. Reconsume in the
					// bogus DOCTYPE state.
					reportError(
						"missing-quote-before-doctype-system-identifier",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_BOGUS_DOCTYPE;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#before-doctype-system-identifier-state
			case STATE_BEFORE_DOCTYPE_SYSTEM_IDENTIFIER:
				// Consume the next input character:
				if (isSpace(cc)) {
					// U+0009 CHARACTER TABULATION (tab)
					// U+000A LINE FEED (LF)
					// U+000C FORM FEED (FF)
					// U+0020 SPACE
					// Ignore the character.
					pos++;
				} else if (cc === CC_QUOTATION_MARK) {
					// U+0022 QUOTATION MARK (")
					// Set the current DOCTYPE token's system identifier to the empty string
					// (not missing), then switch to the DOCTYPE system identifier
					// (double-quoted) state.
					state = STATE_DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
					pos++;
				} else if (cc === CC_APOSTROPHE) {
					// U+0027 APOSTROPHE (')
					// Set the current DOCTYPE token's system identifier to the empty string
					// (not missing), then switch to the DOCTYPE system identifier
					// (single-quoted) state.
					state = STATE_DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// This is a missing-doctype-system-identifier parse error. Set the current
					// DOCTYPE token's force-quirks flag to on. Switch to the data state. Emit
					// the current DOCTYPE token.
					reportError(
						"missing-doctype-system-identifier",
						pos,
						pos + 1,
						"warning"
					);
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(input, commentStart, pos + 1);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// Anything else
					// This is a missing-quote-before-doctype-system-identifier parse error. Set
					// the current DOCTYPE token's force-quirks flag to on. Reconsume in the
					// bogus DOCTYPE state.
					reportError(
						"missing-quote-before-doctype-system-identifier",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_BOGUS_DOCTYPE;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#doctype-system-identifier-(double-quoted)-state
			case STATE_DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED:
				// Consume the next input character:
				if (cc === CC_QUOTATION_MARK) {
					// U+0022 QUOTATION MARK (")
					// Switch to the after DOCTYPE system identifier state.
					state = STATE_AFTER_DOCTYPE_SYSTEM_IDENTIFIER;
					pos++;
				} else if (cc === 0x00) {
					// U+0000 NULL
					// This is an unexpected-null-character parse error. Append a U+FFFD
					// REPLACEMENT CHARACTER character to the current DOCTYPE token's system
					// identifier.
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// This is an abrupt-doctype-system-identifier parse error. Set the current
					// DOCTYPE token's force-quirks flag to on. Switch to the data state. Emit
					// the current DOCTYPE token.
					reportError(
						"abrupt-doctype-system-identifier",
						pos,
						pos + 1,
						"warning"
					);
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(input, commentStart, pos + 1);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// Anything else
					// Append the current input character to the current DOCTYPE token's system
					// identifier.
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#doctype-system-identifier-(single-quoted)-state
			case STATE_DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED:
				// Consume the next input character:
				if (cc === CC_APOSTROPHE) {
					// U+0027 APOSTROPHE (')
					// Switch to the after DOCTYPE system identifier state.
					state = STATE_AFTER_DOCTYPE_SYSTEM_IDENTIFIER;
					pos++;
				} else if (cc === 0x00) {
					// U+0000 NULL
					// This is an unexpected-null-character parse error. Append a U+FFFD
					// REPLACEMENT CHARACTER character to the current DOCTYPE token's system
					// identifier.
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// This is an abrupt-doctype-system-identifier parse error. Set the current
					// DOCTYPE token's force-quirks flag to on. Switch to the data state. Emit
					// the current DOCTYPE token.
					reportError(
						"abrupt-doctype-system-identifier",
						pos,
						pos + 1,
						"warning"
					);
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(input, commentStart, pos + 1);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// Anything else
					// Append the current input character to the current DOCTYPE token's system
					// identifier.
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#after-doctype-system-identifier-state
			case STATE_AFTER_DOCTYPE_SYSTEM_IDENTIFIER:
				// Consume the next input character:
				if (isSpace(cc)) {
					// U+0009 CHARACTER TABULATION (tab)
					// U+000A LINE FEED (LF)
					// U+000C FORM FEED (FF)
					// U+0020 SPACE
					// Ignore the character.
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// Switch to the data state. Emit the current DOCTYPE token.
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(input, commentStart, pos + 1);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// Anything else
					// This is an unexpected-character-after-doctype-system-identifier parse
					// error. Reconsume in the bogus DOCTYPE state. (This does not set the
					// current DOCTYPE token's force-quirks flag to on.)
					reportError(
						"unexpected-character-after-doctype-system-identifier",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_BOGUS_DOCTYPE;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#bogus-doctype-state
			case STATE_BOGUS_DOCTYPE:
				// Consume the next input character:
				if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// Switch to the data state. Emit the DOCTYPE token.
					let nextPos = pos + 1;
					if (callbacks.doctype !== undefined) {
						nextPos = callbacks.doctype(input, commentStart, pos + 1);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else if (cc === 0x00) {
					// U+0000 NULL
					// This is an unexpected-null-character parse error. Ignore the character.
					pos++;
				} else {
					// Anything else
					// Ignore the character.
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#cdata-section-state
			case STATE_CDATA_SECTION:
				// Consume the next input character:
				// U+005D RIGHT SQUARE BRACKET (])
				// Switch to the CDATA section bracket state.
				if (cc === CC_RIGHT_SQUARE_BRACKET) {
					state = STATE_CDATA_SECTION_BRACKET;
					pos++;
				} else {
					// Anything else
					// Emit the current input character as a character token.
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#cdata-section-bracket-state
			case STATE_CDATA_SECTION_BRACKET:
				// Consume the next input character:
				// U+005D RIGHT SQUARE BRACKET (])
				// Switch to the CDATA section end state.
				if (cc === CC_RIGHT_SQUARE_BRACKET) {
					state = STATE_CDATA_SECTION_END;
					pos++;
				} else {
					// Anything else
					// Emit a U+005D RIGHT SQUARE BRACKET character token. Reconsume in the
					// CDATA section state.
					state = STATE_CDATA_SECTION;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#cdata-section-end-state
			case STATE_CDATA_SECTION_END:
				// Consume the next input character:
				// U+005D RIGHT SQUARE BRACKET (])
				// Emit a U+005D RIGHT SQUARE BRACKET character token.
				if (cc === CC_RIGHT_SQUARE_BRACKET) {
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// Switch to the data state.
					let nextPos = pos + 1;
					if (callbacks.comment !== undefined) {
						nextPos = callbacks.comment(input, commentStart, pos + 1);
					}
					state = STATE_DATA;
					textStart = nextPos;
					pos = nextPos;
				} else {
					// Anything else
					// Emit two U+005D RIGHT SQUARE BRACKET character tokens. Reconsume in the
					// CDATA section state.
					state = STATE_CDATA_SECTION;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#rcdata-state
			case STATE_RCDATA:
				// Consume the next input character:
				// U+003C LESS-THAN SIGN (<)
				// Switch to the RCDATA less-than sign state.
				if (cc === CC_LESS_THAN) {
					tagStart = pos;
					state = STATE_RCDATA_LESS_THAN_SIGN;
					pos++;
				} else {
					// Anything else
					// Emit the current input character as a character token.
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#rcdata-less-than-sign-state
			case STATE_RCDATA_LESS_THAN_SIGN:
				// Consume the next input character:
				// U+002F SOLIDUS (/)
				// Set the temporary buffer to the empty string. Switch to the RCDATA end
				// tag open state.
				if (cc === CC_SOLIDUS) {
					tempBuffer = "";
					state = STATE_RCDATA_END_TAG_OPEN;
					pos++;
				} else {
					// Anything else
					// Emit a U+003C LESS-THAN SIGN character token. Reconsume in the RCDATA
					// state.
					state = STATE_RCDATA;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#rcdata-end-tag-open-state
			case STATE_RCDATA_END_TAG_OPEN:
				// Consume the next input character:
				// ASCII alpha
				// Create a new end tag token, set its tag name to the empty string.
				// Reconsume in the RCDATA end tag name state.
				if (isAsciiAlpha(cc)) {
					tagNameStart = pos;
					state = STATE_RCDATA_END_TAG_NAME;
					// Reconsume
				} else {
					// Anything else
					// Emit a U+003C LESS-THAN SIGN character token and a U+002F SOLIDUS
					// character token. Reconsume in the RCDATA state.
					state = STATE_RCDATA;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#rcdata-end-tag-name-state
			case STATE_RCDATA_END_TAG_NAME:
				// Consume the next input character:
				// U+0009 CHARACTER TABULATION (tab)
				// U+000A LINE FEED (LF)
				// U+000C FORM FEED (FF)
				// U+0020 SPACE
				// If the current end tag token is an appropriate end tag token, then switch
				// to the before attribute name state. Otherwise, treat it as per the
				// "anything else" entry below.
				if (isSpace(cc)) {
					tagNameEnd = pos;
					if (
						input.slice(tagNameStart, tagNameEnd).toLowerCase() ===
						lastOpenTagName
					) {
						flushText(tagStart);
						state = STATE_BEFORE_ATTRIBUTE_NAME;
						pos++;
					} else {
						state = STATE_RCDATA;
						// Reconsume
					}
				} else if (cc === CC_SOLIDUS) {
					// U+002F SOLIDUS (/)
					// If the current end tag token is an appropriate end tag token, then switch
					// to the self-closing start tag state. Otherwise, treat it as per the
					// "anything else" entry below.
					tagNameEnd = pos;
					if (
						input.slice(tagNameStart, tagNameEnd).toLowerCase() ===
						lastOpenTagName
					) {
						flushText(tagStart);
						state = STATE_SELF_CLOSING_START_TAG;
						pos++;
					} else {
						state = STATE_RCDATA;
						// Reconsume
					}
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// If the current end tag token is an appropriate end tag token, then switch
					// to the data state and emit the current tag token. Otherwise, treat it as
					// per the "anything else" entry below.
					tagNameEnd = pos;
					if (
						input.slice(tagNameStart, tagNameEnd).toLowerCase() ===
						lastOpenTagName
					) {
						flushText(tagStart);
						state = STATE_DATA;
						pos = emitCloseTag(pos + 1);
					} else {
						state = STATE_RCDATA;
						// Reconsume
					}
				} else if (isAsciiAlpha(cc)) {
					// ASCII upper alpha / ASCII lower alpha
					// Append the lowercase version of the current input character to the
					// current tag token's tag name. Append the current input character to
					// the temporary buffer.
					pos++;
				} else {
					// Anything else
					// Emit a U+003C LESS-THAN SIGN character token, a U+002F SOLIDUS character
					// token, and a character token for each of the characters in the temporary
					// buffer (in the order they were added to the buffer). Reconsume in the
					// RCDATA state.
					state = STATE_RCDATA;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#rawtext-state
			case STATE_RAWTEXT:
				// Consume the next input character:
				// U+003C LESS-THAN SIGN (<)
				// Switch to the RAWTEXT less-than sign state.
				if (cc === CC_LESS_THAN) {
					tagStart = pos;
					state = STATE_RAWTEXT_LESS_THAN_SIGN;
					pos++;
				} else {
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#rawtext-less-than-sign-state
			case STATE_RAWTEXT_LESS_THAN_SIGN:
				// Consume the next input character:
				// U+002F SOLIDUS (/)
				// Set the temporary buffer to the empty string. Switch to the RAWTEXT end
				// tag open state.
				if (cc === CC_SOLIDUS) {
					tempBuffer = "";
					state = STATE_RAWTEXT_END_TAG_OPEN;
					pos++;
				} else {
					// Anything else
					// Emit a U+003C LESS-THAN SIGN character token. Reconsume in the RAWTEXT
					// state.
					state = STATE_RAWTEXT;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#rawtext-end-tag-open-state
			case STATE_RAWTEXT_END_TAG_OPEN:
				// Consume the next input character:
				// ASCII alpha
				// Create a new end tag token, set its tag name to the empty string.
				// Reconsume in the RAWTEXT end tag name state.
				if (isAsciiAlpha(cc)) {
					tagNameStart = pos;
					state = STATE_RAWTEXT_END_TAG_NAME;
					// Reconsume
				} else {
					// Anything else
					// Emit a U+003C LESS-THAN SIGN character token and a U+002F SOLIDUS
					// character token. Reconsume in the RAWTEXT state.
					state = STATE_RAWTEXT;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#rawtext-end-tag-name-state
			case STATE_RAWTEXT_END_TAG_NAME:
				// Consume the next input character:
				// U+0009 CHARACTER TABULATION (tab)
				// U+000A LINE FEED (LF)
				// U+000C FORM FEED (FF)
				// U+0020 SPACE
				// If the current end tag token is an appropriate end tag token, then switch
				// to the before attribute name state. Otherwise, treat it as per the
				// "anything else" entry below.
				if (isSpace(cc)) {
					tagNameEnd = pos;
					if (
						input.slice(tagNameStart, tagNameEnd).toLowerCase() ===
						lastOpenTagName
					) {
						flushText(tagStart);
						state = STATE_BEFORE_ATTRIBUTE_NAME;
						pos++;
					} else {
						state = STATE_RAWTEXT;
					}
				} else if (cc === CC_SOLIDUS) {
					// U+002F SOLIDUS (/)
					// If the current end tag token is an appropriate end tag token, then switch
					// to the self-closing start tag state. Otherwise, treat it as per the
					// "anything else" entry below.
					tagNameEnd = pos;
					if (
						input.slice(tagNameStart, tagNameEnd).toLowerCase() ===
						lastOpenTagName
					) {
						flushText(tagStart);
						state = STATE_SELF_CLOSING_START_TAG;
						pos++;
					} else {
						state = STATE_RAWTEXT;
					}
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// If the current end tag token is an appropriate end tag token, then switch
					// to the data state and emit the current tag token. Otherwise, treat it as
					// per the "anything else" entry below.
					tagNameEnd = pos;
					if (
						input.slice(tagNameStart, tagNameEnd).toLowerCase() ===
						lastOpenTagName
					) {
						flushText(tagStart);
						state = STATE_DATA;
						pos = emitCloseTag(pos + 1);
					} else {
						state = STATE_RAWTEXT;
					}
				} else if (isAsciiAlpha(cc)) {
					// ASCII upper alpha / ASCII lower alpha
					// Append the lowercase version of the current input character to the
					// current tag token's tag name. Append the current input character to
					// the temporary buffer.
					pos++;
				} else {
					// Anything else
					// Emit a U+003C LESS-THAN SIGN character token, a U+002F SOLIDUS character
					// token, and a character token for each of the characters in the temporary
					// buffer (in the order they were added to the buffer). Reconsume in the
					// RAWTEXT state.
					state = STATE_RAWTEXT;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-state
			case STATE_SCRIPT_DATA:
				// Consume the next input character:
				// U+003C LESS-THAN SIGN (<)
				// Switch to the script data less-than sign state.
				if (cc === CC_LESS_THAN) {
					tagStart = pos;
					state = STATE_SCRIPT_DATA_LESS_THAN_SIGN;
					pos++;
				} else {
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-less-than-sign-state
			case STATE_SCRIPT_DATA_LESS_THAN_SIGN:
				// Consume the next input character:
				// U+002F SOLIDUS (/)
				// Set the temporary buffer to the empty string. Switch to the script data
				// end tag open state.
				if (cc === CC_SOLIDUS) {
					tempBuffer = "";
					state = STATE_SCRIPT_DATA_END_TAG_OPEN;
					pos++;
				} else if (cc === CC_EXCLAMATION_MARK) {
					// U+0021 EXCLAMATION MARK (!)
					// Switch to the script data escape start state. Emit a U+003C LESS-THAN
					// SIGN character token and a U+0021 EXCLAMATION MARK character token.
					state = STATE_SCRIPT_DATA_ESCAPE_START;
					pos++;
				} else {
					// Anything else
					// Emit a U+003C LESS-THAN SIGN character token. Reconsume in the script
					// data state.
					state = STATE_SCRIPT_DATA;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-end-tag-open-state
			case STATE_SCRIPT_DATA_END_TAG_OPEN:
				// Consume the next input character:
				// ASCII alpha
				// Create a new end tag token, set its tag name to the empty string.
				// Reconsume in the script data end tag name state.
				if (isAsciiAlpha(cc)) {
					tagNameStart = pos;
					state = STATE_SCRIPT_DATA_END_TAG_NAME;
					// Reconsume
				} else {
					// Anything else
					// Emit a U+003C LESS-THAN SIGN character token and a U+002F SOLIDUS
					// character token. Reconsume in the script data state.
					state = STATE_SCRIPT_DATA;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-end-tag-name-state
			case STATE_SCRIPT_DATA_END_TAG_NAME:
				// Consume the next input character:
				// U+0009 CHARACTER TABULATION (tab)
				// U+000A LINE FEED (LF)
				// U+000C FORM FEED (FF)
				// U+0020 SPACE
				// If the current end tag token is an appropriate end tag token, then switch
				// to the before attribute name state. Otherwise, treat it as per the
				// "anything else" entry below.
				if (isSpace(cc)) {
					tagNameEnd = pos;
					if (
						input.slice(tagNameStart, tagNameEnd).toLowerCase() ===
						lastOpenTagName
					) {
						flushText(tagStart);
						state = STATE_BEFORE_ATTRIBUTE_NAME;
						pos++;
					} else {
						state = STATE_SCRIPT_DATA;
					}
				} else if (cc === CC_SOLIDUS) {
					// U+002F SOLIDUS (/)
					// If the current end tag token is an appropriate end tag token, then switch
					// to the self-closing start tag state. Otherwise, treat it as per the
					// "anything else" entry below.
					tagNameEnd = pos;
					if (
						input.slice(tagNameStart, tagNameEnd).toLowerCase() ===
						lastOpenTagName
					) {
						flushText(tagStart);
						state = STATE_SELF_CLOSING_START_TAG;
						pos++;
					} else {
						state = STATE_SCRIPT_DATA;
					}
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// If the current end tag token is an appropriate end tag token, then switch
					// to the data state and emit the current tag token. Otherwise, treat it as
					// per the "anything else" entry below.
					tagNameEnd = pos;
					if (
						input.slice(tagNameStart, tagNameEnd).toLowerCase() ===
						lastOpenTagName
					) {
						flushText(tagStart);
						state = STATE_DATA;
						pos = emitCloseTag(pos + 1);
					} else {
						state = STATE_SCRIPT_DATA;
					}
				} else if (isAsciiAlpha(cc)) {
					// ASCII upper alpha / ASCII lower alpha
					pos++;
				} else {
					// Anything else
					// Emit a U+003C LESS-THAN SIGN character token, a U+002F SOLIDUS character
					// token, and a character token for each of the characters in the temporary
					// buffer (in the order they were added to the buffer). Reconsume in the
					// script data state.
					state = STATE_SCRIPT_DATA;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-escape-start-state
			case STATE_SCRIPT_DATA_ESCAPE_START:
				// Consume the next input character:
				// U+002D HYPHEN-MINUS (-)
				// Switch to the script data escape start dash state. Emit a U+002D
				// HYPHEN-MINUS character token.
				if (cc === CC_HYPHEN_MINUS) {
					state = STATE_SCRIPT_DATA_ESCAPE_START_DASH;
					pos++;
				} else {
					// Anything else
					// Reconsume in the script data state.
					state = STATE_SCRIPT_DATA;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-escape-start-dash-state
			case STATE_SCRIPT_DATA_ESCAPE_START_DASH:
				// Consume the next input character:
				// U+002D HYPHEN-MINUS (-)
				// Switch to the script data escaped dash dash state. Emit a U+002D
				// HYPHEN-MINUS character token.
				if (cc === CC_HYPHEN_MINUS) {
					state = STATE_SCRIPT_DATA_ESCAPED_DASH_DASH;
					pos++;
				} else {
					// Anything else
					// Reconsume in the script data state.
					state = STATE_SCRIPT_DATA;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-escaped-state
			case STATE_SCRIPT_DATA_ESCAPED:
				// Consume the next input character:
				// U+002D HYPHEN-MINUS (-)
				// Switch to the script data escaped dash state. Emit a U+002D HYPHEN-MINUS
				// character token.
				if (cc === CC_HYPHEN_MINUS) {
					state = STATE_SCRIPT_DATA_ESCAPED_DASH;
					pos++;
				} else if (cc === CC_LESS_THAN) {
					// U+003C LESS-THAN SIGN (<)
					// Switch to the script data escaped less-than sign state.
					tagStart = pos;
					state = STATE_SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
					pos++;
				} else {
					// Anything else
					// Emit the current input character as a character token.
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-escaped-dash-state
			case STATE_SCRIPT_DATA_ESCAPED_DASH:
				// Consume the next input character:
				// U+002D HYPHEN-MINUS (-)
				// Switch to the script data escaped dash dash state. Emit a U+002D
				// HYPHEN-MINUS character token.
				if (cc === CC_HYPHEN_MINUS) {
					state = STATE_SCRIPT_DATA_ESCAPED_DASH_DASH;
					pos++;
				} else if (cc === CC_LESS_THAN) {
					// U+003C LESS-THAN SIGN (<)
					// Switch to the script data escaped less-than sign state.
					tagStart = pos;
					state = STATE_SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
					pos++;
				} else {
					// Anything else
					// Switch to the script data escaped state. Emit the current input character
					// as a character token.
					state = STATE_SCRIPT_DATA_ESCAPED;
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-escaped-dash-dash-state
			case STATE_SCRIPT_DATA_ESCAPED_DASH_DASH:
				// Consume the next input character:
				// U+002D HYPHEN-MINUS (-)
				// Emit a U+002D HYPHEN-MINUS character token.
				if (cc === CC_HYPHEN_MINUS) {
					pos++;
				} else if (cc === CC_LESS_THAN) {
					// U+003C LESS-THAN SIGN (<)
					// Switch to the script data escaped less-than sign state.
					tagStart = pos;
					state = STATE_SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// Switch to the script data state. Emit a U+003E GREATER-THAN SIGN
					// character token.
					state = STATE_SCRIPT_DATA;
					pos++;
				} else {
					// Anything else
					// Switch to the script data escaped state. Emit the current input character
					// as a character token.
					state = STATE_SCRIPT_DATA_ESCAPED;
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-escaped-less-than-sign-state
			case STATE_SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN:
				// Consume the next input character:
				// U+002F SOLIDUS (/)
				// Set the temporary buffer to the empty string. Switch to the script data
				// escaped end tag open state.
				if (cc === CC_SOLIDUS) {
					tempBuffer = "";
					state = STATE_SCRIPT_DATA_ESCAPED_END_TAG_OPEN;
					pos++;
				} else if (isAsciiAlpha(cc)) {
					// ASCII alpha
					// Set the temporary buffer to the empty string. Emit a U+003C LESS-THAN
					// SIGN character token. Reconsume in the script data double escape start
					// state.
					tempBuffer = "";
					state = STATE_SCRIPT_DATA_DOUBLE_ESCAPE_START;
					// Reconsume
				} else {
					// Anything else
					// Emit a U+003C LESS-THAN SIGN character token. Reconsume in the script
					// data escaped state.
					state = STATE_SCRIPT_DATA_ESCAPED;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-escaped-end-tag-open-state
			case STATE_SCRIPT_DATA_ESCAPED_END_TAG_OPEN:
				// Consume the next input character:
				// ASCII alpha
				// Create a new end tag token, set its tag name to the empty string.
				// Reconsume in the script data escaped end tag name state.
				if (isAsciiAlpha(cc)) {
					tagNameStart = pos;
					state = STATE_SCRIPT_DATA_ESCAPED_END_TAG_NAME;
					// Reconsume
				} else {
					// Anything else
					// Emit a U+003C LESS-THAN SIGN character token and a U+002F SOLIDUS
					// character token. Reconsume in the script data escaped state.
					state = STATE_SCRIPT_DATA_ESCAPED;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-escaped-end-tag-name-state
			case STATE_SCRIPT_DATA_ESCAPED_END_TAG_NAME:
				// Consume the next input character:
				// U+0009 CHARACTER TABULATION (tab)
				// U+000A LINE FEED (LF)
				// U+000C FORM FEED (FF)
				// U+0020 SPACE
				// If the current end tag token is an appropriate end tag token, then switch
				// to the before attribute name state. Otherwise, treat it as per the
				// "anything else" entry below.
				if (isSpace(cc)) {
					tagNameEnd = pos;
					if (
						input.slice(tagNameStart, tagNameEnd).toLowerCase() ===
						lastOpenTagName
					) {
						flushText(tagStart);
						state = STATE_BEFORE_ATTRIBUTE_NAME;
						pos++;
					} else {
						state = STATE_SCRIPT_DATA_ESCAPED;
					}
				} else if (cc === CC_SOLIDUS) {
					// U+002F SOLIDUS (/)
					// If the current end tag token is an appropriate end tag token, then switch
					// to the self-closing start tag state. Otherwise, treat it as per the
					// "anything else" entry below.
					tagNameEnd = pos;
					if (
						input.slice(tagNameStart, tagNameEnd).toLowerCase() ===
						lastOpenTagName
					) {
						flushText(tagStart);
						state = STATE_SELF_CLOSING_START_TAG;
						pos++;
					} else {
						state = STATE_SCRIPT_DATA_ESCAPED;
					}
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// If the current end tag token is an appropriate end tag token, then switch
					// to the data state and emit the current tag token. Otherwise, treat it as
					// per the "anything else" entry below.
					tagNameEnd = pos;
					if (
						input.slice(tagNameStart, tagNameEnd).toLowerCase() ===
						lastOpenTagName
					) {
						flushText(tagStart);
						state = STATE_DATA;
						pos = emitCloseTag(pos + 1);
					} else {
						state = STATE_SCRIPT_DATA_ESCAPED;
					}
				} else if (isAsciiAlpha(cc)) {
					// ASCII upper alpha / ASCII lower alpha
					pos++;
				} else {
					// Anything else
					// Emit a U+003C LESS-THAN SIGN character token, a U+002F SOLIDUS character
					// token, and a character token for each of the characters in the temporary
					// buffer (in the order they were added to the buffer). Reconsume in the
					// script data escaped state.
					state = STATE_SCRIPT_DATA_ESCAPED;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-double-escape-start-state
			case STATE_SCRIPT_DATA_DOUBLE_ESCAPE_START:
				// Consume the next input character:
				// U+0009 CHARACTER TABULATION (tab)
				// U+000A LINE FEED (LF)
				// U+000C FORM FEED (FF)
				// U+0020 SPACE
				// U+002F SOLIDUS (/)
				// U+003E GREATER-THAN SIGN (>)
				// If the temporary buffer is the string "script", then switch to the script
				// data double escaped state. Otherwise, switch to the script data escaped
				// state. Emit the current input character as a character token.
				if (isSpace(cc) || cc === CC_SOLIDUS || cc === CC_GREATER_THAN) {
					state =
						tempBuffer === "script"
							? STATE_SCRIPT_DATA_DOUBLE_ESCAPED
							: STATE_SCRIPT_DATA_ESCAPED;
					pos++;
				} else if (isAsciiUpperAlpha(cc)) {
					// ASCII upper alpha
					// Append the lowercase version of the current input character (add 0x0020
					// to the character's code point) to the temporary buffer. Emit the current
					// input character as a character token.
					tempBuffer += String.fromCharCode(cc + 0x20);
					pos++;
				} else if (isAsciiLowerAlpha(cc)) {
					// ASCII lower alpha
					// Append the current input character to the temporary buffer. Emit the
					// current input character as a character token.
					tempBuffer += String.fromCharCode(cc);
					pos++;
				} else {
					// Anything else
					// Reconsume in the script data escaped state.
					state = STATE_SCRIPT_DATA_ESCAPED;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-double-escaped-state
			case STATE_SCRIPT_DATA_DOUBLE_ESCAPED:
				// Consume the next input character:
				// U+002D HYPHEN-MINUS (-)
				// Switch to the script data double escaped dash state. Emit a U+002D
				// HYPHEN-MINUS character token.
				if (cc === CC_HYPHEN_MINUS) {
					state = STATE_SCRIPT_DATA_DOUBLE_ESCAPED_DASH;
					pos++;
				} else if (cc === CC_LESS_THAN) {
					// U+003C LESS-THAN SIGN (<)
					// Switch to the script data double escaped less-than sign state. Emit a
					// U+003C LESS-THAN SIGN character token.
					state = STATE_SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN;
					pos++;
				} else {
					// Anything else
					// Emit the current input character as a character token.
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-double-escaped-dash-state
			case STATE_SCRIPT_DATA_DOUBLE_ESCAPED_DASH:
				// Consume the next input character:
				// U+002D HYPHEN-MINUS (-)
				// Switch to the script data double escaped dash dash state. Emit a U+002D
				// HYPHEN-MINUS character token.
				if (cc === CC_HYPHEN_MINUS) {
					state = STATE_SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH;
					pos++;
				} else if (cc === CC_LESS_THAN) {
					// U+003C LESS-THAN SIGN (<)
					// Switch to the script data double escaped less-than sign state. Emit a
					// U+003C LESS-THAN SIGN character token.
					state = STATE_SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN;
					pos++;
				} else {
					// Anything else
					// Switch to the script data double escaped state. Emit the current input
					// character as a character token.
					state = STATE_SCRIPT_DATA_DOUBLE_ESCAPED;
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-double-escaped-dash-dash-state
			case STATE_SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH:
				// Consume the next input character:
				// U+002D HYPHEN-MINUS (-)
				// Emit a U+002D HYPHEN-MINUS character token.
				if (cc === CC_HYPHEN_MINUS) {
					pos++;
				} else if (cc === CC_LESS_THAN) {
					// U+003C LESS-THAN SIGN (<)
					// Switch to the script data double escaped less-than sign state. Emit a
					// U+003C LESS-THAN SIGN character token.
					state = STATE_SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN;
					pos++;
				} else if (cc === CC_GREATER_THAN) {
					// U+003E GREATER-THAN SIGN (>)
					// Switch to the script data state. Emit a U+003E GREATER-THAN SIGN
					// character token.
					state = STATE_SCRIPT_DATA;
					pos++;
				} else {
					// Anything else
					// Switch to the script data double escaped state. Emit the current input
					// character as a character token.
					state = STATE_SCRIPT_DATA_DOUBLE_ESCAPED;
					pos++;
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-double-escaped-less-than-sign-state
			case STATE_SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN:
				// Consume the next input character:
				// U+002F SOLIDUS (/)
				// Set the temporary buffer to the empty string. Switch to the script data
				// double escape end state. Emit a U+002F SOLIDUS character token.
				if (cc === CC_SOLIDUS) {
					tempBuffer = "";
					state = STATE_SCRIPT_DATA_DOUBLE_ESCAPE_END;
					pos++;
				} else {
					// Anything else
					// Reconsume in the script data double escaped state.
					state = STATE_SCRIPT_DATA_DOUBLE_ESCAPED;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#script-data-double-escape-end-state
			case STATE_SCRIPT_DATA_DOUBLE_ESCAPE_END:
				// Consume the next input character:
				// U+0009 CHARACTER TABULATION (tab)
				// U+000A LINE FEED (LF)
				// U+000C FORM FEED (FF)
				// U+0020 SPACE
				// U+002F SOLIDUS (/)
				// U+003E GREATER-THAN SIGN (>)
				// If the temporary buffer is the string "script", then switch to the script
				// data escaped state. Otherwise, switch to the script data double escaped
				// state. Emit the current input character as a character token.
				if (isSpace(cc) || cc === CC_SOLIDUS || cc === CC_GREATER_THAN) {
					state =
						tempBuffer === "script"
							? STATE_SCRIPT_DATA_ESCAPED
							: STATE_SCRIPT_DATA_DOUBLE_ESCAPED;
					pos++;
				} else if (isAsciiUpperAlpha(cc)) {
					// ASCII upper alpha
					// Append the lowercase version of the current input character (add 0x0020
					// to the character's code point) to the temporary buffer. Emit the current
					// input character as a character token.
					tempBuffer += String.fromCharCode(cc + 0x20);
					pos++;
				} else if (isAsciiLowerAlpha(cc)) {
					// ASCII lower alpha
					// Append the current input character to the temporary buffer. Emit the
					// current input character as a character token.
					tempBuffer += String.fromCharCode(cc);
					pos++;
				} else {
					// Anything else
					// Reconsume in the script data double escaped state.
					state = STATE_SCRIPT_DATA_DOUBLE_ESCAPED;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#plaintext-state
			case STATE_PLAINTEXT:
				// Consume the next input character:
				// Anything else
				// Emit the current input character as a character token.
				pos++;
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#character-reference-state
			case STATE_CHARACTER_REFERENCE:
				// Set the temporary buffer to the empty string. Append a U+0026
				// AMPERSAND (&) character to the temporary buffer.
				// Consume the next input character:
				if (isAsciiAlphanumeric(cc)) {
					// ASCII alphanumeric
					// Reconsume in the named character reference state.
					state = STATE_NAMED_CHARACTER_REFERENCE;
					// Reconsume
				} else if (cc === CC_NUMBER_SIGN) {
					// U+0023 NUMBER SIGN (#)
					// Append the current input character to the temporary buffer.
					// Switch to the numeric character reference state.
					state = STATE_NUMERIC_CHARACTER_REFERENCE;
					pos++;
				} else {
					// Anything else
					// Flush code points consumed as a character reference.
					// Reconsume in the return state.
					state = returnState;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#named-character-reference-state
			case STATE_NAMED_CHARACTER_REFERENCE: {
				// Consume the maximum number of characters possible where the
				// consumed characters are one of the identifiers in the first
				// column of the named character references table.
				//
				// We measure the longest run of ASCII alphanumeric characters
				// (capped at 32, the longest entity name without the leading
				// `&`), then walk that run from longest to shortest looking for
				// the first prefix that exists in the entity table (with a
				// trailing `;` if present, otherwise the legacy bare form).
				let runLen = 0;
				while (
					pos + runLen < len &&
					isAsciiAlphanumeric(input.charCodeAt(pos + runLen))
				) {
					runLen++;
					// Safety cap — the longest entity name is 32 chars (without `&`).
					if (runLen > 32) break;
				}
				const hasSemicolon =
					pos + runLen < len && input.charCodeAt(pos + runLen) === CC_SEMICOLON;
				namedEntityConsumed = 0;
				const entities = getHtmlEntities();
				for (let n = runLen; n > 0; n--) {
					// Try with trailing `;` first if one is present after the run.
					if (n === runLen && hasSemicolon) {
						const withSemi = `${input.slice(pos, pos + n)};`;
						if (entities[withSemi] !== undefined) {
							namedEntityConsumed = n + 1;
							break;
						}
					}
					const bare = input.slice(pos, pos + n);
					if (entities[bare] !== undefined) {
						namedEntityConsumed = n;
						break;
					}
				}
				if (namedEntityConsumed > 0) {
					pos += namedEntityConsumed;
					state = returnState;
				} else {
					// No match — flush code points consumed as a character
					// reference. Switch to the ambiguous ampersand state.
					state = STATE_AMBIGUOUS_AMPERSAND;
				}
				break;
			}

			// https://html.spec.whatwg.org/multipage/parsing.html#ambiguous-ampersand-state
			case STATE_AMBIGUOUS_AMPERSAND:
				// Consume the next input character:
				if (isAsciiAlphanumeric(cc)) {
					// ASCII alphanumeric
					// If the character reference was consumed as part of an
					// attribute, then append the current input character to the
					// current attribute's value. Otherwise, emit the current
					// input character as a character token.
					pos++;
				} else if (cc === CC_SEMICOLON) {
					// U+003B SEMICOLON (;)
					// This is an unknown-named-character-reference parse error.
					// Reconsume in the return state.
					reportError(
						"unknown-named-character-reference",
						pos,
						pos + 1,
						"warning"
					);
					state = returnState;
					// Reconsume
				} else {
					// Anything else
					// Reconsume in the return state.
					state = returnState;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#numeric-character-reference-state
			case STATE_NUMERIC_CHARACTER_REFERENCE:
				// Set the character reference code to zero (0).
				// Consume the next input character:
				if (cc === 0x78 || cc === 0x58) {
					// U+0078 LATIN SMALL LETTER X
					// U+0058 LATIN CAPITAL LETTER X
					// Append the current input character to the temporary
					// buffer. Switch to the hexadecimal character reference
					// start state.
					state = STATE_HEXADECIMAL_CHARACTER_REFERENCE_START;
					pos++;
				} else {
					// Anything else
					// Reconsume in the decimal character reference start state.
					state = STATE_DECIMAL_CHARACTER_REFERENCE_START;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#hexadecimal-character-reference-start-state
			case STATE_HEXADECIMAL_CHARACTER_REFERENCE_START:
				// Consume the next input character:
				// ASCII hex digit: reconsume in the hexadecimal character reference state.
				// Anything else: absence-of-digits-in-numeric-character-reference parse
				// error. Flush code points consumed as a character reference. Reconsume
				// in the return state.
				if (isAsciiHexDigit(cc)) {
					state = STATE_HEXADECIMAL_CHARACTER_REFERENCE;
				} else {
					reportError(
						"absence-of-digits-in-numeric-character-reference",
						pos,
						pos + 1,
						"warning"
					);
					state = returnState;
				}
				// Reconsume
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#decimal-character-reference-start-state
			case STATE_DECIMAL_CHARACTER_REFERENCE_START:
				// Consume the next input character:
				// ASCII digit: reconsume in the decimal character reference state.
				// Anything else: absence-of-digits-in-numeric-character-reference parse
				// error. Flush code points consumed as a character reference. Reconsume
				// in the return state.
				if (isAsciiDigit(cc)) {
					state = STATE_DECIMAL_CHARACTER_REFERENCE;
				} else {
					reportError(
						"absence-of-digits-in-numeric-character-reference",
						pos,
						pos + 1,
						"warning"
					);
					state = returnState;
				}
				// Reconsume
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#hexadecimal-character-reference-state
			case STATE_HEXADECIMAL_CHARACTER_REFERENCE:
				// Consume the next input character:
				if (isAsciiHexDigit(cc)) {
					// ASCII digit / upper hex / lower hex
					// Multiply the character reference code by 16. Add a numeric
					// version of the current input character to the character
					// reference code.
					pos++;
				} else if (cc === CC_SEMICOLON) {
					// U+003B SEMICOLON
					// Switch to the numeric character reference end state.
					state = STATE_NUMERIC_CHARACTER_REFERENCE_END;
					pos++;
				} else {
					// Anything else
					// This is a missing-semicolon-after-character-reference
					// parse error. Reconsume in the numeric character reference
					// end state.
					reportError(
						"missing-semicolon-after-character-reference",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_NUMERIC_CHARACTER_REFERENCE_END;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#decimal-character-reference-state
			case STATE_DECIMAL_CHARACTER_REFERENCE:
				// Consume the next input character:
				if (isAsciiDigit(cc)) {
					// ASCII digit
					// Multiply the character reference code by 10. Add a numeric
					// version of the current input character (subtract 0x0030
					// from the character's code point) to the character reference
					// code.
					pos++;
				} else if (cc === CC_SEMICOLON) {
					// U+003B SEMICOLON
					// Switch to the numeric character reference end state.
					state = STATE_NUMERIC_CHARACTER_REFERENCE_END;
					pos++;
				} else {
					// Anything else
					// This is a missing-semicolon-after-character-reference
					// parse error. Reconsume in the numeric character reference
					// end state.
					reportError(
						"missing-semicolon-after-character-reference",
						pos,
						pos + 1,
						"warning"
					);
					state = STATE_NUMERIC_CHARACTER_REFERENCE_END;
					// Reconsume
				}
				break;

			// https://html.spec.whatwg.org/multipage/parsing.html#numeric-character-reference-end-state
			case STATE_NUMERIC_CHARACTER_REFERENCE_END:
				// Check the character reference code (validation omitted for
				// the scanner — we don't decode, just skip past the entity).
				// Flush code points consumed as a character reference.
				// Switch to the return state.
				state = returnState;
				// Reconsume
				break;

			/* istanbul ignore next -- @preserve: defensive fallback, all states are explicit above */
			default:
				pos++;
		}
	}

	// Handle EOF in non-data states per the WHATWG spec.
	//
	// Each in-progress comment / doctype / cdata / tag emits its partial
	// token range plus a corresponding `eof-in-X` parse error. Severity is
	// `"error"` because the emitted token byte range is incomplete (missing
	// trailing `-->`, `>`, `]]>`, etc.). For data / `<` / `</` / `<!`-only
	// inputs we emit `eof-before-tag-name` and fall through to flush the
	// pending text span (which still contains the lone `<`).
	if (
		(state >= STATE_TAG_NAME && state <= STATE_SELF_CLOSING_START_TAG) ||
		state === STATE_RCDATA_END_TAG_NAME ||
		state === STATE_RAWTEXT_END_TAG_NAME ||
		state === STATE_SCRIPT_DATA_END_TAG_NAME ||
		state === STATE_SCRIPT_DATA_ESCAPED_END_TAG_NAME
	) {
		// EOF mid-tag — emit the partial open/close tag at EOF so the
		// consumer still sees the tag. This is a deliberate deviation
		// from the byte-stream-only view of the spec: rather than dropping
		// the in-progress tag, we emit its byte range up to EOF.
		reportError("eof-in-tag", len, len, "error");
		if (attrNameStart !== -1) emitAttribute(len);
		// If we hit EOF before the tag-name end was recorded (e.g.
		// `<div</a`), the name runs to EOF. We need to update tagNameEnd
		// regardless of its previous value (it may carry over from a
		// completed prior tag).
		if (state === STATE_TAG_NAME) tagNameEnd = len;
		flushText(tagStart);
		pos =
			input.charCodeAt(tagStart + 1) === CC_SOLIDUS
				? emitCloseTag(len)
				: emitOpenTag(len, false);
	} else if (
		(state >= STATE_COMMENT_START && state <= STATE_BOGUS_COMMENT) ||
		(state >= STATE_COMMENT_LESS_THAN_SIGN &&
			state <= STATE_COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH) ||
		state === STATE_MARKUP_DECLARATION_OPEN
	) {
		reportError("eof-in-comment", len, len, "error");
		if (callbacks.comment !== undefined) {
			pos = callbacks.comment(input, commentStart, len);
		}
	} else if (state >= STATE_CDATA_SECTION && state <= STATE_CDATA_SECTION_END) {
		reportError("eof-in-cdata", len, len, "error");
		if (callbacks.comment !== undefined) {
			pos = callbacks.comment(input, commentStart, len);
		}
	} else if (state >= STATE_DOCTYPE && state <= STATE_BOGUS_DOCTYPE) {
		reportError("eof-in-doctype", len, len, "error");
		if (callbacks.doctype !== undefined) {
			pos = callbacks.doctype(input, commentStart, len);
		}
	} else {
		if (
			state === STATE_SCRIPT_DATA_ESCAPED ||
			state === STATE_SCRIPT_DATA_ESCAPED_DASH ||
			state === STATE_SCRIPT_DATA_ESCAPED_DASH_DASH ||
			state === STATE_SCRIPT_DATA_DOUBLE_ESCAPED ||
			state === STATE_SCRIPT_DATA_DOUBLE_ESCAPED_DASH ||
			state === STATE_SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH
		) {
			// Inside `<script><!-- … ` at EOF — spec calls this an
			// eof-in-script-html-comment-like-text parse error.
			reportError("eof-in-script-html-comment-like-text", len, len, "error");
		} else if (state === STATE_TAG_OPEN || state === STATE_END_TAG_OPEN) {
			// `<` or `</` with nothing after; spec calls this
			// eof-before-tag-name. The lone `<` / `</` is preserved in the
			// pending text span which is flushed below.
			reportError("eof-before-tag-name", len, len, "warning");
		}
		if (textStart < len && callbacks.text !== undefined) {
			callbacks.text(input, textStart, len);
		}
	}

	return pos;
};

walkHtmlTokens.QUOTE_NONE = QUOTE_NONE;
walkHtmlTokens.QUOTE_SINGLE = QUOTE_SINGLE;
walkHtmlTokens.QUOTE_DOUBLE = QUOTE_DOUBLE;

/**
 * Decode HTML character references in a string. Handles all numeric
 * references and the full WHATWG named character references table. Unknown
 * or malformed references are left as literal text.
 * @param {string} str the raw string from the token slice
 * @returns {string} decoded string
 */
walkHtmlTokens.decodeHtmlEntities = (str) => {
	if (!str.includes("&")) return str;

	let entities;

	// Match either `&name;` / `&name` (named refs may be legacy-bare per the
	// WHATWG entities table) or a numeric reference `&#\u2026;?`.
	return str.replace(/&(#[xX]?[0-9a-fA-F]+|#?[0-9a-zA-Z]+);?/g, (match) => {
		// Numeric reference: &#65; or &#x41;
		if (match.charCodeAt(1) === 0x23 /* # */) {
			const lastChar = match.charAt(match.length - 1);
			const body = lastChar === ";" ? match.slice(2, -1) : match.slice(2);
			const isHex = body.charCodeAt(0) === 0x78 || body.charCodeAt(0) === 0x58;
			const code = isHex
				? Number.parseInt(body.slice(1), 16)
				: Number.parseInt(body, 10);
			if (!Number.isNaN(code)) {
				// Out-of-Unicode-range \u2192 replacement character per WHATWG.
				return code > 0x10ffff ? "\uFFFD" : String.fromCodePoint(code);
			}
			return match; // Invalid numeric (e.g. &#;)
		}

		// Named reference. Try the full captured name first, then progressively
		// shorter prefixes \u2014 this handles direct matches like `&amp;` as well
		// as WHATWG longest-prefix semantics where e.g. `&notpre;` decodes as
		// `&not` (a legacy bare entity) followed by `pre;` as literal text.
		entities = entities || getHtmlEntities();
		const name = match.slice(1);
		for (let i = name.length; i > 0; i--) {
			const prefix = name.slice(0, i);
			if (entities[prefix] !== undefined) {
				return entities[prefix] + name.slice(i);
			}
		}
		return match;
	});
};

module.exports = walkHtmlTokens;
