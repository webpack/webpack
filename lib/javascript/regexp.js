/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// cspell:ignore Uncapturing

// The regexp validator, which `lib/javascript/parser.js` installs on first use:
// only a pattern the host engine itself rejected is re-read through it.

const {
	Parser,
	codePointToString,
	isIdentifierChar,
	isIdentifierStart,
	wordsRegexp
} = require("./parser");
const {
	UNICODE_BINARY_PROPERTIES,
	UNICODE_BINARY_PROPERTIES_OF_STRINGS,
	UNICODE_GENERAL_CATEGORY_VALUES,
	UNICODE_SCRIPT_VALUES
} = require("./regexpData");

/**
 * @param {EXPECTED_ANY} obj the object to test
 * @returns {boolean} whether it holds any own enumerable key
 */
const hasProp = (obj) => {
	// eslint-disable-next-line no-unreachable-loop -- the first key is the answer
	for (const _ in obj) return true;
	return false;
};

/**
 * Which disjunction branch a named group sits in, so that the same name in two
 * alternatives of one disjunction is allowed and a repeat in one is not.
 */
class BranchID {
	/**
	 * @param {BranchID | null} parent the enclosing disjunction's branch
	 * @param {BranchID | null=} base the set of sibling branches this belongs to
	 */
	constructor(parent, base) {
		this.parent = parent;
		/** @type {BranchID} */
		this.base = base || this;
	}

	/**
	 * @param {BranchID} alt the other branch
	 * @returns {boolean} whether the two are alternatives of one disjunction
	 */
	separatedFrom(alt) {
		/** @type {BranchID | null} */
		let self = this;
		while (self) {
			/** @type {BranchID | null} */
			let other = alt;
			while (other) {
				if (self.base === other.base && self !== other) return true;
				other = other.parent;
			}
			self = self.parent;
		}
		return false;
	}

	/** @returns {BranchID} the next branch of the same disjunction */
	sibling() {
		return new BranchID(this.parent, this.base);
	}
}

// Which kind of character set a class construct parsed as, so that negating one
// that can match a string is refused.
const CHAR_SET_NONE = 0;
const CHAR_SET_OK = 1;
const CHAR_SET_STRING = 2;

/** @type {Record<number, EXPECTED_ANY>} */
const unicodePropertyData = {};

/**
 * The `\p{...}` name tables for one edition, built on first use: most patterns
 * name no property at all.
 * @param {number} ecmaVersion the edition to answer for
 * @returns {EXPECTED_ANY} its binary, string-valued and non-binary name tables
 */
const unicodePropertiesFor = (ecmaVersion) => {
	const cached = unicodePropertyData[ecmaVersion];
	if (cached !== undefined) return cached;
	const nonBinary = {
		General_Category: wordsRegexp(UNICODE_GENERAL_CATEGORY_VALUES),
		Script: wordsRegexp(UNICODE_SCRIPT_VALUES[ecmaVersion])
	};
	const entry = {
		binary: wordsRegexp(
			`${UNICODE_BINARY_PROPERTIES[ecmaVersion]} ${UNICODE_GENERAL_CATEGORY_VALUES}`
		),
		binaryOfStrings: wordsRegexp(
			UNICODE_BINARY_PROPERTIES_OF_STRINGS[ecmaVersion]
		),
		nonBinary
	};
	/** @type {EXPECTED_ANY} */ (nonBinary).Script_Extensions = nonBinary.Script;
	/** @type {EXPECTED_ANY} */ (nonBinary).gc = nonBinary.General_Category;
	/** @type {EXPECTED_ANY} */ (nonBinary).sc = nonBinary.Script;
	/** @type {EXPECTED_ANY} */ (nonBinary).scx = nonBinary.Script;
	unicodePropertyData[ecmaVersion] = entry;
	return entry;
};

/** The cursor a regexp literal is validated through. */
class RegExpValidationState {
	/**
	 * @param {Parser} parser the parser that owns it
	 */
	constructor(parser) {
		this.parser = parser;
		this.validFlags = `gim${parser.options.ecmaVersion >= 6 ? "uy" : ""}${
			parser.options.ecmaVersion >= 9 ? "s" : ""
		}${parser.options.ecmaVersion >= 13 ? "d" : ""}${
			parser.options.ecmaVersion >= 15 ? "v" : ""
		}`;
		this.unicodeProperties = unicodePropertiesFor(
			parser.options.ecmaVersion >= 14 ? 14 : parser.options.ecmaVersion
		);
		this.source = "";
		this.flags = "";
		this.start = 0;
		this.switchU = false;
		this.switchV = false;
		this.switchN = false;
		this.pos = 0;
		this.lastIntValue = 0;
		this.lastStringValue = "";
		this.lastAssertionIsQuantifiable = false;
		this.numCapturingParens = 0;
		this.maxBackReference = 0;
		/** @type {EXPECTED_ANY} */
		this.groupNames = Object.create(null);
		/** @type {string[]} */
		this.backReferenceNames = [];
		/** @type {BranchID | null} */
		this.branchID = null;
	}

	/**
	 * @param {number} start where the literal starts in the source
	 * @param {string} pattern the pattern's text
	 * @param {string} flags the flags' text
	 * @returns {void}
	 */
	reset(start, pattern, flags) {
		const unicodeSets = flags.includes("v");
		const unicode = flags.includes("u");
		this.start = start | 0;
		this.source = `${pattern}`;
		this.flags = flags;
		if (unicodeSets && this.parser.options.ecmaVersion >= 15) {
			this.switchU = true;
			this.switchV = true;
			this.switchN = true;
		} else {
			this.switchU = unicode && this.parser.options.ecmaVersion >= 6;
			this.switchV = false;
			this.switchN = unicode && this.parser.options.ecmaVersion >= 9;
		}
	}

	/**
	 * @param {string} message what is wrong with the pattern
	 * @returns {void}
	 */
	raise(message) {
		this.parser.raiseRecoverable(
			this.start,
			`Invalid regular expression: /${this.source}/: ${message}`
		);
	}

	/**
	 * The code point at an index, joining a surrogate pair where the `u` flag
	 * asks for code points rather than units.
	 * @param {number} i the index to read
	 * @param {boolean=} forceU whether to read as if the `u` flag were set
	 * @returns {number} the code point, or `-1` past the end
	 */
	at(i, forceU) {
		const s = this.source;
		const l = s.length;
		if (i >= l) return -1;
		const c = s.charCodeAt(i);
		if (!(forceU || this.switchU) || c <= 0xd7ff || c >= 0xe000 || i + 1 >= l) {
			return c;
		}
		const next = s.charCodeAt(i + 1);
		return next >= 0xdc00 && next <= 0xdfff ? (c << 10) + next - 0x35fdc00 : c;
	}

	/**
	 * @param {number} i the index to step from
	 * @param {boolean=} forceU whether to read as if the `u` flag were set
	 * @returns {number} the next index
	 */
	nextIndex(i, forceU) {
		const s = this.source;
		const l = s.length;
		if (i >= l) return l;
		const c = s.charCodeAt(i);
		let next;
		if (
			!(forceU || this.switchU) ||
			c <= 0xd7ff ||
			c >= 0xe000 ||
			i + 1 >= l ||
			(next = s.charCodeAt(i + 1)) < 0xdc00 ||
			next > 0xdfff
		) {
			return i + 1;
		}
		return i + 2;
	}

	/**
	 * @param {boolean=} forceU whether to read as if the `u` flag were set
	 * @returns {number} the code point at the cursor
	 */
	current(forceU) {
		return this.at(this.pos, forceU);
	}

	/**
	 * @param {boolean=} forceU whether to read as if the `u` flag were set
	 * @returns {number} the code point after the cursor
	 */
	lookahead(forceU) {
		return this.at(this.nextIndex(this.pos, forceU), forceU);
	}

	/**
	 * @param {boolean=} forceU whether to read as if the `u` flag were set
	 * @returns {void}
	 */
	advance(forceU) {
		this.pos = this.nextIndex(this.pos, forceU);
	}

	/**
	 * @param {number} ch the code point to consume
	 * @param {boolean=} forceU whether to read as if the `u` flag were set
	 * @returns {boolean} whether it was there
	 */
	eat(ch, forceU) {
		if (this.current(forceU) === ch) {
			this.advance(forceU);
			return true;
		}
		return false;
	}

	/**
	 * @param {number[]} chs the code points to consume, in order
	 * @param {boolean=} forceU whether to read as if the `u` flag were set
	 * @returns {boolean} whether they were all there
	 */
	eatChars(chs, forceU) {
		let pos = this.pos;
		for (const ch of chs) {
			const current = this.at(pos, forceU);
			if (current === -1 || current !== ch) return false;
			pos = this.nextIndex(pos, forceU);
		}
		this.pos = pos;
		return true;
	}
}

/**
 * @param {number} ch the code point
 * @returns {boolean} whether it is `i`, `m` or `s`
 */
const isRegularExpressionModifier = (ch) =>
	ch === 0x69 || ch === 0x6d || ch === 0x73;

/**
 * @param {number} ch the code point
 * @returns {boolean} whether it carries meaning in a pattern
 */
const isSyntaxCharacter = (ch) =>
	ch === 0x24 ||
	(ch >= 0x28 && ch <= 0x2b) ||
	ch === 0x2e ||
	ch === 0x3f ||
	(ch >= 0x5b && ch <= 0x5e) ||
	(ch >= 0x7b && ch <= 0x7d);

/**
 * @param {number} ch the code point
 * @returns {boolean} whether a group name may start with it
 */
const isRegExpIdentifierStart = (ch) =>
	isIdentifierStart(ch, true) || ch === 0x24 || ch === 0x5f;

/**
 * @param {number} ch the code point
 * @returns {boolean} whether a group name may continue with it
 */
const isRegExpIdentifierPart = (ch) =>
	isIdentifierChar(ch, true) ||
	ch === 0x24 ||
	ch === 0x5f ||
	ch === 0x200c ||
	ch === 0x200d;

/**
 * @param {number} ch the code point
 * @returns {boolean} whether it names a built-in character class
 */
const isCharacterClassEscape = (ch) =>
	ch === 0x64 ||
	ch === 0x44 ||
	ch === 0x73 ||
	ch === 0x53 ||
	ch === 0x77 ||
	ch === 0x57;

/**
 * @param {number} ch the code point
 * @returns {boolean} whether it is an ASCII letter
 */
const isControlLetter = (ch) =>
	(ch >= 0x41 && ch <= 0x5a) || (ch >= 0x61 && ch <= 0x7a);

/**
 * @param {number} ch the code point
 * @returns {boolean} whether a property name may contain it
 */
const isUnicodePropertyNameCharacter = (ch) =>
	isControlLetter(ch) || ch === 0x5f;

/**
 * @param {number} ch the code point
 * @returns {boolean} whether a property value may contain it
 */
const isUnicodePropertyValueCharacter = (ch) =>
	isUnicodePropertyNameCharacter(ch) || isDecimalDigit(ch);

/**
 * @param {number} ch the code point
 * @returns {boolean} whether Unicode defines it
 */
const isValidUnicode = (ch) => ch >= 0 && ch <= 0x10ffff;

/**
 * @param {number} ch the code point
 * @returns {boolean} whether it is `0` through `9`
 */
const isDecimalDigit = (ch) => ch >= 0x30 && ch <= 0x39;

/**
 * @param {number} ch the code point
 * @returns {boolean} whether it is a hexadecimal digit
 */
const isHexDigit = (ch) =>
	(ch >= 0x30 && ch <= 0x39) ||
	(ch >= 0x41 && ch <= 0x46) ||
	(ch >= 0x61 && ch <= 0x66);

/**
 * @param {number} ch a hexadecimal digit's code point
 * @returns {number} its value
 */
const hexToInt = (ch) => {
	if (ch >= 0x41 && ch <= 0x46) return 10 + (ch - 0x41);
	if (ch >= 0x61 && ch <= 0x66) return 10 + (ch - 0x61);
	return ch - 0x30;
};

/**
 * @param {number} ch the code point
 * @returns {boolean} whether it is `0` through `7`
 */
const isOctalDigit = (ch) => ch >= 0x30 && ch <= 0x37;

/**
 * @param {number} ch the code point
 * @returns {boolean} whether doubling it is reserved inside a `v` class
 */
const isClassSetReservedDoublePunctuatorCharacter = (ch) =>
	ch === 0x21 ||
	(ch >= 0x23 && ch <= 0x26) ||
	(ch >= 0x2a && ch <= 0x2c) ||
	ch === 0x2e ||
	(ch >= 0x3a && ch <= 0x40) ||
	ch === 0x5e ||
	ch === 0x60 ||
	ch === 0x7e;

/**
 * @param {number} ch the code point
 * @returns {boolean} whether it carries meaning inside a `v` class
 */
const isClassSetSyntaxCharacter = (ch) =>
	ch === 0x28 ||
	ch === 0x29 ||
	ch === 0x2d ||
	ch === 0x2f ||
	(ch >= 0x5b && ch <= 0x5d) ||
	(ch >= 0x7b && ch <= 0x7d);

/**
 * @param {number} ch the code point
 * @returns {boolean} whether an escape may name it inside a `v` class
 */
const isClassSetReservedPunctuator = (ch) =>
	ch === 0x21 ||
	ch === 0x23 ||
	ch === 0x25 ||
	ch === 0x26 ||
	ch === 0x2c ||
	ch === 0x2d ||
	(ch >= 0x3a && ch <= 0x3e) ||
	ch === 0x40 ||
	ch === 0x60 ||
	ch === 0x7e;

/**
 * The regexp validator, as prototype methods `install` copies onto the parser.
 * It extends `Parser` so each method reads the cursor it is handed through
 * `this`, the way acorn declares them.
 */
class RegExpValidator extends Parser {
	/**
	 * Check a regexp literal's flags.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/regexp.js
	 * @param {import("./regexp").RegExpValidationState} state the validation state
	 * @returns {void}
	 */
	validateRegExpFlags(state) {
		const { validFlags, flags } = state;

		let u = false;
		let v = false;

		for (let i = 0; i < flags.length; i++) {
			const flag = flags.charAt(i);
			if (!validFlags.includes(flag)) {
				this.raise(state.start, "Invalid regular expression flag");
			}
			if (flags.includes(flag, i + 1)) {
				this.raise(state.start, "Duplicate regular expression flag");
			}
			if (flag === "u") u = true;
			if (flag === "v") v = true;
		}
		if (this.options.ecmaVersion >= 15 && u && v) {
			this.raise(state.start, "Invalid regular expression flag");
		}
	}

	/**
	 * Check a regexp literal's pattern, re-reading it once a group name shows
	 * that the named-capture goal symbol was the right one.
	 * @param {import("./regexp").RegExpValidationState} state the validation state
	 * @returns {void}
	 */
	validateRegExpPattern(state) {
		this.regexp_pattern(state);

		if (
			!state.switchN &&
			this.options.ecmaVersion >= 9 &&
			hasProp(state.groupNames)
		) {
			state.switchN = true;
			this.regexp_pattern(state);
		}
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {void}
	 */
	regexp_pattern(state) {
		state.pos = 0;
		state.lastIntValue = 0;
		state.lastStringValue = "";
		state.lastAssertionIsQuantifiable = false;
		state.numCapturingParens = 0;
		state.maxBackReference = 0;
		state.groupNames = Object.create(null);
		state.backReferenceNames.length = 0;
		state.branchID = null;

		this.regexp_disjunction(state);

		if (state.pos !== state.source.length) {
			// Worded as V8 words them, since a caller may match on the text.
			if (state.eat(0x29)) state.raise("Unmatched ')'");
			if (state.eat(0x5d) || state.eat(0x7d)) {
				state.raise("Lone quantifier brackets");
			}
		}
		if (state.maxBackReference > state.numCapturingParens) {
			state.raise("Invalid escape");
		}
		for (const name of state.backReferenceNames) {
			if (!state.groupNames[name]) {
				state.raise("Invalid named capture referenced");
			}
		}
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {void}
	 */
	regexp_disjunction(state) {
		const trackDisjunction = this.options.ecmaVersion >= 16;
		if (trackDisjunction) state.branchID = new BranchID(state.branchID, null);
		this.regexp_alternative(state);
		while (state.eat(0x7c)) {
			if (trackDisjunction) {
				state.branchID = /** @type {BranchID} */ (state.branchID).sibling();
			}
			this.regexp_alternative(state);
		}
		if (trackDisjunction) {
			state.branchID = /** @type {BranchID} */ (state.branchID).parent;
		}

		if (this.regexp_eatQuantifier(state, true)) {
			state.raise("Nothing to repeat");
		}
		if (state.eat(0x7b)) state.raise("Lone quantifier brackets");
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {void}
	 */
	regexp_alternative(state) {
		while (state.pos < state.source.length && this.regexp_eatTerm(state));
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a term was read
	 */
	regexp_eatTerm(state) {
		if (this.regexp_eatAssertion(state)) {
			// Only a lookahead may carry a quantifier, and only outside `u` mode.
			if (
				state.lastAssertionIsQuantifiable &&
				this.regexp_eatQuantifier(state) &&
				state.switchU
			) {
				state.raise("Invalid quantifier");
			}
			return true;
		}

		if (
			state.switchU
				? this.regexp_eatAtom(state)
				: this.regexp_eatExtendedAtom(state)
		) {
			this.regexp_eatQuantifier(state);
			return true;
		}

		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether an assertion was read
	 */
	regexp_eatAssertion(state) {
		const start = state.pos;
		state.lastAssertionIsQuantifiable = false;

		if (state.eat(0x5e) || state.eat(0x24)) return true;

		if (state.eat(0x5c)) {
			if (state.eat(0x42) || state.eat(0x62)) return true;
			state.pos = start;
		}

		if (state.eat(0x28) && state.eat(0x3f)) {
			let lookbehind = false;
			if (this.options.ecmaVersion >= 9) lookbehind = state.eat(0x3c);
			if (state.eat(0x3d) || state.eat(0x21)) {
				this.regexp_disjunction(state);
				if (!state.eat(0x29)) state.raise("Unterminated group");
				state.lastAssertionIsQuantifiable = !lookbehind;
				return true;
			}
		}

		state.pos = start;
		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @param {boolean=} noError whether to read without reporting
	 * @returns {boolean} whether a quantifier was read
	 */
	regexp_eatQuantifier(state, noError) {
		if (this.regexp_eatQuantifierPrefix(state, noError)) {
			state.eat(0x3f);
			return true;
		}
		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @param {boolean=} noError whether to read without reporting
	 * @returns {boolean} whether a quantifier prefix was read
	 */
	regexp_eatQuantifierPrefix(state, noError) {
		return (
			state.eat(0x2a) ||
			state.eat(0x2b) ||
			state.eat(0x3f) ||
			this.regexp_eatBracedQuantifier(state, noError)
		);
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @param {boolean=} noError whether to read without reporting
	 * @returns {boolean} whether a braced quantifier was read
	 */
	regexp_eatBracedQuantifier(state, noError) {
		const start = state.pos;
		if (state.eat(0x7b)) {
			let min = 0;
			let max = -1;
			if (this.regexp_eatDecimalDigits(state)) {
				min = state.lastIntValue;
				if (state.eat(0x2c) && this.regexp_eatDecimalDigits(state)) {
					max = state.lastIntValue;
				}
				if (state.eat(0x7d)) {
					if (max !== -1 && max < min && !noError) {
						state.raise("numbers out of order in {} quantifier");
					}
					return true;
				}
			}
			if (state.switchU && !noError) state.raise("Incomplete quantifier");
			state.pos = start;
		}
		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether an atom was read
	 */
	regexp_eatAtom(state) {
		return (
			this.regexp_eatPatternCharacters(state) ||
			state.eat(0x2e) ||
			this.regexp_eatReverseSolidusAtomEscape(state) ||
			this.regexp_eatCharacterClass(state) ||
			this.regexp_eatUncapturingGroup(state) ||
			this.regexp_eatCapturingGroup(state)
		);
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether an escape was read
	 */
	regexp_eatReverseSolidusAtomEscape(state) {
		const start = state.pos;
		if (state.eat(0x5c)) {
			if (this.regexp_eatAtomEscape(state)) return true;
			state.pos = start;
		}
		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a non-capturing group was read
	 */
	regexp_eatUncapturingGroup(state) {
		const start = state.pos;
		if (state.eat(0x28)) {
			if (state.eat(0x3f)) {
				if (this.options.ecmaVersion >= 16) {
					const addModifiers = this.regexp_eatModifiers(state);
					const hasHyphen = state.eat(0x2d);
					if (addModifiers || hasHyphen) {
						for (let i = 0; i < addModifiers.length; i++) {
							const modifier = addModifiers.charAt(i);
							if (addModifiers.includes(modifier, i + 1)) {
								state.raise("Duplicate regular expression modifiers");
							}
						}
						if (hasHyphen) {
							const removeModifiers = this.regexp_eatModifiers(state);
							if (
								!addModifiers &&
								!removeModifiers &&
								state.current() === 0x3a
							) {
								state.raise("Invalid regular expression modifiers");
							}
							for (let i = 0; i < removeModifiers.length; i++) {
								const modifier = removeModifiers.charAt(i);
								if (
									removeModifiers.includes(modifier, i + 1) ||
									addModifiers.includes(modifier)
								) {
									state.raise("Duplicate regular expression modifiers");
								}
							}
						}
					}
				}
				if (state.eat(0x3a)) {
					this.regexp_disjunction(state);
					if (state.eat(0x29)) return true;
					state.raise("Unterminated group");
				}
			}
			state.pos = start;
		}
		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a capturing group was read
	 */
	regexp_eatCapturingGroup(state) {
		if (state.eat(0x28)) {
			if (this.options.ecmaVersion >= 9) {
				this.regexp_groupSpecifier(state);
			} else if (state.current() === 0x3f) {
				state.raise("Invalid group");
			}
			this.regexp_disjunction(state);
			if (state.eat(0x29)) {
				state.numCapturingParens += 1;
				return true;
			}
			state.raise("Unterminated group");
		}
		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {string} the modifiers that were read
	 */
	regexp_eatModifiers(state) {
		let modifiers = "";
		let ch = 0;
		while ((ch = state.current()) !== -1 && isRegularExpressionModifier(ch)) {
			modifiers += codePointToString(ch);
			state.advance();
		}
		return modifiers;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether an atom was read
	 */
	regexp_eatExtendedAtom(state) {
		return (
			state.eat(0x2e) ||
			this.regexp_eatReverseSolidusAtomEscape(state) ||
			this.regexp_eatCharacterClass(state) ||
			this.regexp_eatUncapturingGroup(state) ||
			this.regexp_eatCapturingGroup(state) ||
			this.regexp_eatInvalidBracedQuantifier(state) ||
			this.regexp_eatExtendedPatternCharacter(state)
		);
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} always false, since a match is an error
	 */
	regexp_eatInvalidBracedQuantifier(state) {
		if (this.regexp_eatBracedQuantifier(state, true)) {
			state.raise("Nothing to repeat");
		}
		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a syntax character was read
	 */
	regexp_eatSyntaxCharacter(state) {
		const ch = state.current();
		if (isSyntaxCharacter(ch)) {
			state.lastIntValue = ch;
			state.advance();
			return true;
		}
		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether any pattern character was read
	 */
	regexp_eatPatternCharacters(state) {
		const start = state.pos;
		let ch = 0;
		while ((ch = state.current()) !== -1 && !isSyntaxCharacter(ch)) {
			state.advance();
		}
		return state.pos !== start;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a pattern character was read
	 */
	regexp_eatExtendedPatternCharacter(state) {
		const ch = state.current();
		if (
			ch !== -1 &&
			ch !== 0x24 &&
			!(ch >= 0x28 && ch <= 0x2b) &&
			ch !== 0x2e &&
			ch !== 0x3f &&
			ch !== 0x5b &&
			ch !== 0x5e &&
			ch !== 0x7c
		) {
			state.advance();
			return true;
		}
		return false;
	}

	/**
	 * Read a capture group's name, and report one that another branch of the
	 * same disjunction already used.
	 * @param {RegExpValidationState} state the validation state
	 * @returns {void}
	 */
	regexp_groupSpecifier(state) {
		if (state.eat(0x3f)) {
			if (!this.regexp_eatGroupName(state)) state.raise("Invalid group");
			const trackDisjunction = this.options.ecmaVersion >= 16;
			const known = state.groupNames[state.lastStringValue];
			if (known) {
				if (trackDisjunction) {
					for (const altID of known) {
						if (!altID.separatedFrom(state.branchID)) {
							state.raise("Duplicate capture group name");
						}
					}
				} else {
					state.raise("Duplicate capture group name");
				}
			}
			if (trackDisjunction) {
				const branches =
					known || (state.groupNames[state.lastStringValue] = []);
				branches.push(state.branchID);
			} else {
				state.groupNames[state.lastStringValue] = true;
			}
		}
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a group name was read
	 */
	regexp_eatGroupName(state) {
		state.lastStringValue = "";
		if (state.eat(0x3c)) {
			if (this.regexp_eatRegExpIdentifierName(state) && state.eat(0x3e)) {
				return true;
			}
			state.raise("Invalid capture group name");
		}
		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a name was read
	 */
	regexp_eatRegExpIdentifierName(state) {
		state.lastStringValue = "";
		if (this.regexp_eatRegExpIdentifierStart(state)) {
			state.lastStringValue += codePointToString(state.lastIntValue);
			while (this.regexp_eatRegExpIdentifierPart(state)) {
				state.lastStringValue += codePointToString(state.lastIntValue);
			}
			return true;
		}
		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a name start was read
	 */
	regexp_eatRegExpIdentifierStart(state) {
		const start = state.pos;
		const forceU = this.options.ecmaVersion >= 11;
		let ch = state.current(forceU);
		state.advance(forceU);

		if (
			ch === 0x5c &&
			this.regexp_eatRegExpUnicodeEscapeSequence(state, forceU)
		) {
			ch = state.lastIntValue;
		}
		if (isRegExpIdentifierStart(ch)) {
			state.lastIntValue = ch;
			return true;
		}

		state.pos = start;
		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a name character was read
	 */
	regexp_eatRegExpIdentifierPart(state) {
		const start = state.pos;
		const forceU = this.options.ecmaVersion >= 11;
		let ch = state.current(forceU);
		state.advance(forceU);

		if (
			ch === 0x5c &&
			this.regexp_eatRegExpUnicodeEscapeSequence(state, forceU)
		) {
			ch = state.lastIntValue;
		}
		if (isRegExpIdentifierPart(ch)) {
			state.lastIntValue = ch;
			return true;
		}

		state.pos = start;
		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether an escape was read
	 */
	regexp_eatAtomEscape(state) {
		if (
			this.regexp_eatBackReference(state) ||
			this.regexp_eatCharacterClassEscape(state) ||
			this.regexp_eatCharacterEscape(state) ||
			(state.switchN && this.regexp_eatKGroupName(state))
		) {
			return true;
		}
		if (state.switchU) {
			// Worded as V8 words them.
			if (state.current() === 0x63) state.raise("Invalid unicode escape");
			state.raise("Invalid escape");
		}
		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a back reference was read
	 */
	regexp_eatBackReference(state) {
		const start = state.pos;
		if (this.regexp_eatDecimalEscape(state)) {
			const n = state.lastIntValue;
			if (state.switchU) {
				if (n > state.maxBackReference) state.maxBackReference = n;
				return true;
			}
			if (n <= state.numCapturingParens) return true;
			state.pos = start;
		}
		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a named back reference was read
	 */
	regexp_eatKGroupName(state) {
		if (state.eat(0x6b)) {
			if (this.regexp_eatGroupName(state)) {
				state.backReferenceNames.push(state.lastStringValue);
				return true;
			}
			state.raise("Invalid named reference");
		}
		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a character escape was read
	 */
	regexp_eatCharacterEscape(state) {
		return (
			this.regexp_eatControlEscape(state) ||
			this.regexp_eatCControlLetter(state) ||
			this.regexp_eatZero(state) ||
			this.regexp_eatHexEscapeSequence(state) ||
			this.regexp_eatRegExpUnicodeEscapeSequence(state, false) ||
			(!state.switchU && this.regexp_eatLegacyOctalEscapeSequence(state)) ||
			this.regexp_eatIdentityEscape(state)
		);
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a `\c` escape was read
	 */
	regexp_eatCControlLetter(state) {
		const start = state.pos;
		if (state.eat(0x63)) {
			if (this.regexp_eatControlLetter(state)) return true;
			state.pos = start;
		}
		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a `\0` escape was read
	 */
	regexp_eatZero(state) {
		if (state.current() === 0x30 && !isDecimalDigit(state.lookahead())) {
			state.lastIntValue = 0;
			state.advance();
			return true;
		}
		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a control escape was read
	 */
	regexp_eatControlEscape(state) {
		const ch = state.current();
		if (ch === 0x74) {
			state.lastIntValue = 0x09;
			state.advance();
			return true;
		}
		if (ch === 0x6e) {
			state.lastIntValue = 0x0a;
			state.advance();
			return true;
		}
		if (ch === 0x76) {
			state.lastIntValue = 0x0b;
			state.advance();
			return true;
		}
		if (ch === 0x66) {
			state.lastIntValue = 0x0c;
			state.advance();
			return true;
		}
		if (ch === 0x72) {
			state.lastIntValue = 0x0d;
			state.advance();
			return true;
		}
		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a control letter was read
	 */
	regexp_eatControlLetter(state) {
		const ch = state.current();
		if (isControlLetter(ch)) {
			state.lastIntValue = ch % 0x20;
			state.advance();
			return true;
		}
		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @param {boolean=} forceU whether to read as if the `u` flag were set
	 * @returns {boolean} whether an escape was read
	 */
	regexp_eatRegExpUnicodeEscapeSequence(state, forceU) {
		const start = state.pos;
		const switchU = forceU || state.switchU;

		if (state.eat(0x75)) {
			if (this.regexp_eatFixedHexDigits(state, 4)) {
				const lead = state.lastIntValue;
				if (switchU && lead >= 0xd800 && lead <= 0xdbff) {
					const leadSurrogateEnd = state.pos;
					if (
						state.eat(0x5c) &&
						state.eat(0x75) &&
						this.regexp_eatFixedHexDigits(state, 4)
					) {
						const trail = state.lastIntValue;
						if (trail >= 0xdc00 && trail <= 0xdfff) {
							state.lastIntValue =
								(lead - 0xd800) * 0x400 + (trail - 0xdc00) + 0x10000;
							return true;
						}
					}
					state.pos = leadSurrogateEnd;
					state.lastIntValue = lead;
				}
				return true;
			}
			if (
				switchU &&
				state.eat(0x7b) &&
				this.regexp_eatHexDigits(state) &&
				state.eat(0x7d) &&
				isValidUnicode(state.lastIntValue)
			) {
				return true;
			}
			if (switchU) state.raise("Invalid unicode escape");
			state.pos = start;
		}

		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether an identity escape was read
	 */
	regexp_eatIdentityEscape(state) {
		if (state.switchU) {
			if (this.regexp_eatSyntaxCharacter(state)) return true;
			if (state.eat(0x2f)) {
				state.lastIntValue = 0x2f;
				return true;
			}
			return false;
		}

		const ch = state.current();
		if (ch !== 0x63 && (!state.switchN || ch !== 0x6b)) {
			state.lastIntValue = ch;
			state.advance();
			return true;
		}

		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a decimal escape was read
	 */
	regexp_eatDecimalEscape(state) {
		state.lastIntValue = 0;
		let ch = state.current();
		if (ch >= 0x31 && ch <= 0x39) {
			do {
				state.lastIntValue = 10 * state.lastIntValue + (ch - 0x30);
				state.advance();
			} while ((ch = state.current()) >= 0x30 && ch <= 0x39);
			return true;
		}
		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {number} which kind of character set was read
	 */
	regexp_eatCharacterClassEscape(state) {
		const ch = state.current();

		if (isCharacterClassEscape(ch)) {
			state.lastIntValue = -1;
			state.advance();
			return CHAR_SET_OK;
		}

		let negate = false;
		if (
			state.switchU &&
			this.options.ecmaVersion >= 9 &&
			((negate = ch === 0x50) || ch === 0x70)
		) {
			state.lastIntValue = -1;
			state.advance();
			let result;
			if (
				state.eat(0x7b) &&
				(result = this.regexp_eatUnicodePropertyValueExpression(state)) &&
				state.eat(0x7d)
			) {
				if (negate && result === CHAR_SET_STRING) {
					state.raise("Invalid property name");
				}
				return result;
			}
			state.raise("Invalid property name");
		}

		return CHAR_SET_NONE;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {number} which kind of character set was read
	 */
	regexp_eatUnicodePropertyValueExpression(state) {
		const start = state.pos;

		if (this.regexp_eatUnicodePropertyName(state) && state.eat(0x3d)) {
			const name = state.lastStringValue;
			if (this.regexp_eatUnicodePropertyValue(state)) {
				const value = state.lastStringValue;
				this.regexp_validateUnicodePropertyNameAndValue(state, name, value);
				return CHAR_SET_OK;
			}
		}
		state.pos = start;

		if (this.regexp_eatLoneUnicodePropertyNameOrValue(state)) {
			const nameOrValue = state.lastStringValue;
			return this.regexp_validateUnicodePropertyNameOrValue(state, nameOrValue);
		}
		return CHAR_SET_NONE;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @param {string} name the property's name
	 * @param {string} value the value asked for
	 * @returns {void}
	 */
	regexp_validateUnicodePropertyNameAndValue(state, name, value) {
		if (
			!Object.prototype.hasOwnProperty.call(
				state.unicodeProperties.nonBinary,
				name
			)
		) {
			state.raise("Invalid property name");
		}
		if (!state.unicodeProperties.nonBinary[name].test(value)) {
			state.raise("Invalid property value");
		}
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @param {string} nameOrValue the lone name
	 * @returns {number} which kind of character set it names
	 */
	regexp_validateUnicodePropertyNameOrValue(state, nameOrValue) {
		if (state.unicodeProperties.binary.test(nameOrValue)) return CHAR_SET_OK;
		if (
			state.switchV &&
			state.unicodeProperties.binaryOfStrings.test(nameOrValue)
		) {
			return CHAR_SET_STRING;
		}
		state.raise("Invalid property name");
		return CHAR_SET_NONE;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a property name was read
	 */
	regexp_eatUnicodePropertyName(state) {
		let ch = 0;
		state.lastStringValue = "";
		while (isUnicodePropertyNameCharacter((ch = state.current()))) {
			state.lastStringValue += codePointToString(ch);
			state.advance();
		}
		return state.lastStringValue !== "";
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a property value was read
	 */
	regexp_eatUnicodePropertyValue(state) {
		let ch = 0;
		state.lastStringValue = "";
		while (isUnicodePropertyValueCharacter((ch = state.current()))) {
			state.lastStringValue += codePointToString(ch);
			state.advance();
		}
		return state.lastStringValue !== "";
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a lone name was read
	 */
	regexp_eatLoneUnicodePropertyNameOrValue(state) {
		return this.regexp_eatUnicodePropertyValue(state);
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a character class was read
	 */
	regexp_eatCharacterClass(state) {
		if (state.eat(0x5b)) {
			const negate = state.eat(0x5e);
			const result = this.regexp_classContents(state);
			if (!state.eat(0x5d)) state.raise("Unterminated character class");
			if (negate && result === CHAR_SET_STRING) {
				state.raise("Negated character class may contain strings");
			}
			return true;
		}
		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {number} which kind of character set the contents are
	 */
	regexp_classContents(state) {
		if (state.current() === 0x5d) return CHAR_SET_OK;
		if (state.switchV) return this.regexp_classSetExpression(state);
		this.regexp_nonEmptyClassRanges(state);
		return CHAR_SET_OK;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {void}
	 */
	regexp_nonEmptyClassRanges(state) {
		while (this.regexp_eatClassAtom(state)) {
			const left = state.lastIntValue;
			if (state.eat(0x2d) && this.regexp_eatClassAtom(state)) {
				const right = state.lastIntValue;
				if (state.switchU && (left === -1 || right === -1)) {
					state.raise("Invalid character class");
				}
				if (left !== -1 && right !== -1 && left > right) {
					state.raise("Range out of order in character class");
				}
			}
		}
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a class atom was read
	 */
	regexp_eatClassAtom(state) {
		const start = state.pos;

		if (state.eat(0x5c)) {
			if (this.regexp_eatClassEscape(state)) return true;
			if (state.switchU) {
				// Worded as V8 words them.
				const escaped = state.current();
				if (escaped === 0x63 || isOctalDigit(escaped)) {
					state.raise("Invalid class escape");
				}
				state.raise("Invalid escape");
			}
			state.pos = start;
		}

		const ch = state.current();
		if (ch !== 0x5d) {
			state.lastIntValue = ch;
			state.advance();
			return true;
		}

		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a class escape was read
	 */
	regexp_eatClassEscape(state) {
		const start = state.pos;

		if (state.eat(0x62)) {
			state.lastIntValue = 0x08;
			return true;
		}

		if (state.switchU && state.eat(0x2d)) {
			state.lastIntValue = 0x2d;
			return true;
		}

		if (!state.switchU && state.eat(0x63)) {
			if (this.regexp_eatClassControlLetter(state)) return true;
			state.pos = start;
		}

		return Boolean(
			this.regexp_eatCharacterClassEscape(state) ||
			this.regexp_eatCharacterEscape(state)
		);
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {number} which kind of character set was read
	 */
	regexp_classSetExpression(state) {
		let result = CHAR_SET_OK;
		let subResult;
		if (this.regexp_eatClassSetRange(state)) {
			// A range is its own operand, so nothing more binds to it here.
		} else if ((subResult = this.regexp_eatClassSetOperand(state))) {
			if (subResult === CHAR_SET_STRING) result = CHAR_SET_STRING;
			const start = state.pos;
			while (state.eatChars([0x26, 0x26])) {
				if (
					state.current() !== 0x26 &&
					(subResult = this.regexp_eatClassSetOperand(state))
				) {
					if (subResult !== CHAR_SET_STRING) result = CHAR_SET_OK;
					continue;
				}
				state.raise("Invalid character in character class");
			}
			if (start !== state.pos) return result;
			while (state.eatChars([0x2d, 0x2d])) {
				if (this.regexp_eatClassSetOperand(state)) continue;
				state.raise("Invalid character in character class");
			}
			if (start !== state.pos) return result;
		} else {
			state.raise("Invalid character in character class");
		}
		for (;;) {
			if (this.regexp_eatClassSetRange(state)) continue;
			subResult = this.regexp_eatClassSetOperand(state);
			if (!subResult) return result;
			if (subResult === CHAR_SET_STRING) result = CHAR_SET_STRING;
		}
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a range was read
	 */
	regexp_eatClassSetRange(state) {
		const start = state.pos;
		if (this.regexp_eatClassSetCharacter(state)) {
			const left = state.lastIntValue;
			if (state.eat(0x2d) && this.regexp_eatClassSetCharacter(state)) {
				const right = state.lastIntValue;
				if (left !== -1 && right !== -1 && left > right) {
					state.raise("Range out of order in character class");
				}
				return true;
			}
			state.pos = start;
		}
		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {number | null} which kind of character set was read
	 */
	regexp_eatClassSetOperand(state) {
		if (this.regexp_eatClassSetCharacter(state)) return CHAR_SET_OK;
		return (
			this.regexp_eatClassStringDisjunction(state) ||
			this.regexp_eatNestedClass(state)
		);
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {number | null} which kind of character set was read
	 */
	regexp_eatNestedClass(state) {
		const start = state.pos;
		if (state.eat(0x5b)) {
			const negate = state.eat(0x5e);
			const result = this.regexp_classContents(state);
			if (state.eat(0x5d)) {
				if (negate && result === CHAR_SET_STRING) {
					state.raise("Negated character class may contain strings");
				}
				return result;
			}
			state.pos = start;
		}
		if (state.eat(0x5c)) {
			const result = this.regexp_eatCharacterClassEscape(state);
			if (result) return result;
			state.pos = start;
		}
		return null;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {number | null} which kind of character set was read
	 */
	regexp_eatClassStringDisjunction(state) {
		const start = state.pos;
		if (state.eatChars([0x5c, 0x71])) {
			if (state.eat(0x7b)) {
				const result = this.regexp_classStringDisjunctionContents(state);
				if (state.eat(0x7d)) return result;
			} else {
				// Worded as V8 words it.
				state.raise("Invalid escape");
			}
			state.pos = start;
		}
		return null;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {number} which kind of character set was read
	 */
	regexp_classStringDisjunctionContents(state) {
		let result = this.regexp_classString(state);
		while (state.eat(0x7c)) {
			if (this.regexp_classString(state) === CHAR_SET_STRING) {
				result = CHAR_SET_STRING;
			}
		}
		return result;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {number} which kind of character set was read
	 */
	regexp_classString(state) {
		let count = 0;
		while (this.regexp_eatClassSetCharacter(state)) count++;
		return count === 1 ? CHAR_SET_OK : CHAR_SET_STRING;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a character was read
	 */
	regexp_eatClassSetCharacter(state) {
		const start = state.pos;
		if (state.eat(0x5c)) {
			if (
				this.regexp_eatCharacterEscape(state) ||
				this.regexp_eatClassSetReservedPunctuator(state)
			) {
				return true;
			}
			if (state.eat(0x62)) {
				state.lastIntValue = 0x08;
				return true;
			}
			state.pos = start;
			return false;
		}
		const ch = state.current();
		if (
			ch < 0 ||
			(ch === state.lookahead() &&
				isClassSetReservedDoublePunctuatorCharacter(ch))
		) {
			return false;
		}
		if (isClassSetSyntaxCharacter(ch)) return false;
		state.advance();
		state.lastIntValue = ch;
		return true;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a reserved punctuator was read
	 */
	regexp_eatClassSetReservedPunctuator(state) {
		const ch = state.current();
		if (isClassSetReservedPunctuator(ch)) {
			state.lastIntValue = ch;
			state.advance();
			return true;
		}
		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a control letter was read
	 */
	regexp_eatClassControlLetter(state) {
		const ch = state.current();
		if (isDecimalDigit(ch) || ch === 0x5f) {
			state.lastIntValue = ch % 0x20;
			state.advance();
			return true;
		}
		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a hex escape was read
	 */
	regexp_eatHexEscapeSequence(state) {
		const start = state.pos;
		if (state.eat(0x78)) {
			if (this.regexp_eatFixedHexDigits(state, 2)) return true;
			if (state.switchU) state.raise("Invalid escape");
			state.pos = start;
		}
		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether any digits were read
	 */
	regexp_eatDecimalDigits(state) {
		const start = state.pos;
		let ch = 0;
		state.lastIntValue = 0;
		while (isDecimalDigit((ch = state.current()))) {
			state.lastIntValue = 10 * state.lastIntValue + (ch - 0x30);
			state.advance();
		}
		return state.pos !== start;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether any digits were read
	 */
	regexp_eatHexDigits(state) {
		const start = state.pos;
		let ch = 0;
		state.lastIntValue = 0;
		while (isHexDigit((ch = state.current()))) {
			state.lastIntValue = 16 * state.lastIntValue + hexToInt(ch);
			state.advance();
		}
		return state.pos !== start;
	}

	/**
	 * Read a legacy octal escape, which names only `0` through `377`.
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether one was read
	 */
	regexp_eatLegacyOctalEscapeSequence(state) {
		if (this.regexp_eatOctalDigit(state)) {
			const n1 = state.lastIntValue;
			if (this.regexp_eatOctalDigit(state)) {
				const n2 = state.lastIntValue;
				state.lastIntValue =
					n1 <= 3 && this.regexp_eatOctalDigit(state)
						? n1 * 64 + n2 * 8 + state.lastIntValue
						: n1 * 8 + n2;
			} else {
				state.lastIntValue = n1;
			}
			return true;
		}
		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @returns {boolean} whether a digit was read
	 */
	regexp_eatOctalDigit(state) {
		const ch = state.current();
		if (isOctalDigit(ch)) {
			state.lastIntValue = ch - 0x30;
			state.advance();
			return true;
		}
		state.lastIntValue = 0;
		return false;
	}

	/**
	 * @param {RegExpValidationState} state the validation state
	 * @param {number} length exactly how many digits to read
	 * @returns {boolean} whether that many were there
	 */
	regexp_eatFixedHexDigits(state, length) {
		const start = state.pos;
		state.lastIntValue = 0;
		for (let i = 0; i < length; ++i) {
			const ch = state.current();
			if (!isHexDigit(ch)) {
				state.pos = start;
				return false;
			}
			state.lastIntValue = 16 * state.lastIntValue + hexToInt(ch);
			state.advance();
		}
		return true;
	}
}

/**
 * Copy the validator onto the parser's prototype, leaving alone any name the
 * parser (or something that patched it) already declares.
 * @param {typeof Parser} target the parser class to extend
 * @returns {void}
 */
const install = (target) => {
	for (const name of Object.getOwnPropertyNames(RegExpValidator.prototype)) {
		if (name === "constructor") continue;
		if (Object.prototype.hasOwnProperty.call(target.prototype, name)) continue;
		/** @type {EXPECTED_ANY} */
		(target.prototype)[name] = /** @type {EXPECTED_ANY} */ (
			RegExpValidator.prototype
		)[name];
	}
};

module.exports.RegExpValidationState = RegExpValidationState;
module.exports.RegExpValidator = RegExpValidator;
module.exports.install = install;
