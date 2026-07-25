/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

// A standalone JavaScript tokenizer ported from acorn's lexer. It owns the
// scanning loop (no `acorn.Parser` subclass, no per-token acorn call) and
// reuses only acorn's stable data tables (token types, token contexts,
// keyword map, Unicode identifier tests). It emits acorn-shaped tokens so the
// SoA parser can consume a flat token stream without materializing an
// acorn tokenizer per parse.

const { tokTypes: tt } = require("acorn");

/** @typedef {import("acorn").TokenType} TokenType */
/** @typedef {TokenType & { beforeExpr: boolean, keyword?: string, updateContext?: (prevType: TokenType) => void }} TokenTypeInternal acorn's internal TokenType fields, absent from its public types */
/** @typedef {{ token: string, isExpr: boolean, preserveSpace?: boolean, generator?: boolean, override?: (tokenizer: JavascriptTokenizer) => void }} TokContext acorn's TokContext fields read here */
/** @typedef {{ ecmaVersion?: number | "latest", sourceType?: "script" | "module" }} TokenizerOptions */

// acorn exports these at runtime but leaves them out of its public types
const {
	isIdentifierChar,
	isIdentifierStart,
	isNewLine,
	keywordTypes,
	lineBreak,
	nonASCIIwhitespace,
	tokContexts: tc
} =
	/** @type {{ tokContexts: Record<string, TokContext>, keywordTypes: Record<string, TokenType>, isIdentifierStart: (code: number, astral?: boolean) => boolean, isIdentifierChar: (code: number, astral?: boolean) => boolean, isNewLine: (code: number) => boolean, lineBreak: RegExp, nonASCIIwhitespace: RegExp }} */
	(/** @type {unknown} */ (require("acorn")));

// acorn classifies exactly these words as keyword tokens (contextual words
// like `let`/`async`/`of`/`await` stay `name`); the set is complete at
// ecmaVersion >= 6, which is the only range webpack parses.
const KEYWORDS = new Set(Object.keys(keywordTypes));

// sentinel matching acorn's: an invalid escape inside a tagged template is
// recoverable — the token is re-read raw with a `null` cooked value.
const INVALID_TEMPLATE_ESCAPE_ERROR = {};

/**
 * @param {number} code code point
 * @returns {string} the string for a single code point
 */
const codePointToString = (code) => String.fromCodePoint(code);

/**
 * @param {string} str numeric literal text (may contain `_` separators)
 * @param {boolean} isLegacyOctal whether it is a legacy octal literal
 * @returns {number} numeric value
 */
const stringToNumber = (str, isLegacyOctal) =>
	isLegacyOctal
		? Number.parseInt(str, 8)
		: Number.parseFloat(str.replace(/_/g, ""));

/**
 * @param {string} str numeric literal text (may contain `_` separators)
 * @returns {bigint | null} bigint value, or null when BigInt is unavailable
 */
const stringToBigInt = (str) =>
	typeof BigInt === "function" ? BigInt(str.replace(/_/g, "")) : null;

class JavascriptTokenizer {
	/**
	 * @param {string} input source text
	 * @param {TokenizerOptions=} options acorn-compatible options (ecmaVersion, sourceType)
	 */
	constructor(input, options = {}) {
		this.input = input;
		this.ecmaVersion = JavascriptTokenizer._resolveEcmaVersion(
			options.ecmaVersion
		);
		// acorn's reused `updateContext` methods read `this.options.ecmaVersion`
		// as the resolved number, so normalize it (raw "latest" would fail `>= 6`)
		this.options = { ...options, ecmaVersion: this.ecmaVersion };
		this.inModule = options.sourceType === "module";
		// a bare tokenizer cannot see a `"use strict"` prologue; module code is
		// always strict, matching `acorn.tokenizer`'s own default for scripts
		this.strict = this.inModule;
		this.pos = 0;
		this.start = 0;
		this.end = 0;
		this.lastTokStart = 0;
		this.lastTokEnd = 0;
		/** @type {TokenType} */
		this.type = tt.eof;
		/** @type {unknown} */
		this.value = undefined;
		this.containsEsc = false;
		this.inTemplateElement = false;
		// acorn's initialContext(): a statement brace block
		this.context = [tc.b_stat];
		this.exprAllowed = true;
	}

	/**
	 * @param {number | "latest" | undefined} ecmaVersion requested version
	 * @returns {number} acorn's internal numeric version
	 */
	static _resolveEcmaVersion(ecmaVersion) {
		if (
			ecmaVersion === null ||
			ecmaVersion === undefined ||
			ecmaVersion === "latest"
		) {
			return 1e8;
		}
		if (ecmaVersion >= 2015) return ecmaVersion - 2009;
		return ecmaVersion;
	}

	/**
	 * @param {number} pos error offset
	 * @param {string} message error message
	 * @returns {never} always throws
	 */
	raise(pos, message) {
		const loc = getLineColumn(this.input, pos);
		/** @type {Error & { pos?: number }} */
		const err = new SyntaxError(`${message} (${loc.line}:${loc.column})`);
		err.pos = pos;
		throw err;
	}

	/**
	 * @param {number} pos error offset
	 * @param {string} message error message
	 * @returns {never} always throws
	 */
	raiseRecoverable(pos, message) {
		return this.raise(pos, message);
	}

	/**
	 * @param {number=} pos error offset
	 * @returns {never} always throws
	 */
	unexpected(pos) {
		this.raise(
			pos !== undefined && pos !== null ? pos : this.start,
			"Unexpected token"
		);
	}

	/**
	 * @param {number} position error offset
	 * @param {string} message error message
	 * @returns {void}
	 */
	invalidStringToken(position, message) {
		if (this.inTemplateElement && this.ecmaVersion >= 9) {
			throw INVALID_TEMPLATE_ESCAPE_ERROR;
		}
		this.raise(position, message);
	}

	// ----- token context (acorn's, reusing the token types' updateContext) -----

	/**
	 * @returns {TokContext} the current token context
	 */
	curContext() {
		return this.context[this.context.length - 1];
	}

	/**
	 * @param {TokenType} prevType previous token type
	 * @returns {boolean} whether a `{` opens a block here
	 */
	braceIsBlock(prevType) {
		const parent = this.curContext();
		if (parent === tc.f_expr || parent === tc.f_stat) return true;
		if (
			prevType === tt.colon &&
			(parent === tc.b_stat || parent === tc.b_expr)
		) {
			return !parent.isExpr;
		}
		if (prevType === tt._return || (prevType === tt.name && this.exprAllowed)) {
			return lineBreak.test(this.input.slice(this.lastTokEnd, this.start));
		}
		if (
			prevType === tt._else ||
			prevType === tt.semi ||
			prevType === tt.eof ||
			prevType === tt.parenR ||
			prevType === tt.arrow
		) {
			return true;
		}
		if (prevType === tt.braceL) return parent === tc.b_stat;
		if (
			prevType === tt._var ||
			prevType === tt._const ||
			prevType === tt.name
		) {
			return false;
		}
		return !this.exprAllowed;
	}

	/**
	 * @returns {boolean} whether the innermost function context is a generator
	 */
	inGeneratorContext() {
		for (let i = this.context.length - 1; i >= 1; i--) {
			const context = this.context[i];
			if (context.token === "function") return context.generator === true;
		}
		return false;
	}

	/**
	 * @param {TokenType} prevType previous token type
	 * @returns {void}
	 */
	updateContext(prevType) {
		const type = /** @type {TokenTypeInternal} */ (this.type);
		const update = type.updateContext;
		if (type.keyword && prevType === tt.dot) {
			this.exprAllowed = false;
		} else if (update) {
			update.call(this, prevType);
		} else {
			this.exprAllowed = type.beforeExpr;
		}
	}

	/**
	 * @param {TokContext} tokenCtx replacement context
	 * @returns {void}
	 */
	overrideContext(tokenCtx) {
		if (this.curContext() !== tokenCtx) {
			this.context[this.context.length - 1] = tokenCtx;
		}
	}

	// ----- character access -----

	/**
	 * @param {number} pos offset
	 * @returns {number} the full code point at `pos` (surrogate-aware)
	 */
	fullCharCodeAt(pos) {
		const code = this.input.charCodeAt(pos);
		if (code <= 0xd7ff || code >= 0xdc00) return code;
		const next = this.input.charCodeAt(pos + 1);
		return next <= 0xdbff || next >= 0xe000
			? code
			: (code << 10) + next - 0x35fdc00;
	}

	/**
	 * @returns {number} the full code point at the current position
	 */
	fullCharCodeAtPos() {
		return this.fullCharCodeAt(this.pos);
	}

	// ----- whitespace and comments -----

	/**
	 * @returns {void}
	 */
	skipBlockComment() {
		const start = this.pos;
		const end = this.input.indexOf("*/", (this.pos += 2));
		if (end === -1) this.raise(start, "Unterminated comment");
		this.pos = end + 2;
	}

	/**
	 * @param {number} startSkip length of the comment opener
	 * @returns {void}
	 */
	skipLineComment(startSkip) {
		const input = this.input;
		let ch = input.charCodeAt((this.pos += startSkip));
		while (this.pos < input.length && !isNewLine(ch)) {
			ch = input.charCodeAt(++this.pos);
		}
	}

	/**
	 * @returns {void}
	 */
	skipSpace() {
		const input = this.input;
		const len = input.length;
		loop: while (this.pos < len) {
			const ch = input.charCodeAt(this.pos);
			switch (ch) {
				case 32:
				case 160:
					++this.pos;
					break;
				case 13:
					if (input.charCodeAt(this.pos + 1) === 10) ++this.pos;
				// falls through
				case 10:
				case 8232:
				case 8233:
					++this.pos;
					break;
				case 47:
					switch (input.charCodeAt(this.pos + 1)) {
						case 42:
							this.skipBlockComment();
							break;
						case 47:
							this.skipLineComment(2);
							break;
						default:
							break loop;
					}
					break;
				default:
					if (
						(ch > 8 && ch < 14) ||
						(ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch)))
					) {
						++this.pos;
					} else {
						break loop;
					}
			}
		}
	}

	// ----- token driver -----

	/**
	 * @returns {void}
	 */
	nextToken() {
		const curContext = this.curContext();
		if (!curContext || !curContext.preserveSpace) this.skipSpace();
		this.start = this.pos;
		if (this.pos >= this.input.length) return this.finishToken(tt.eof);
		if (curContext.override) {
			return /** @type {(t: JavascriptTokenizer) => void} */ (
				curContext.override
			)(this);
		}
		this.readToken(this.fullCharCodeAtPos());
	}

	/**
	 * @param {number} code current code point
	 * @returns {void}
	 */
	readToken(code) {
		if (isIdentifierStart(code, this.ecmaVersion >= 6) || code === 92) {
			return this.readWord();
		}
		return this.getTokenFromCode(code);
	}

	/**
	 * @param {TokenType} type token type
	 * @param {unknown=} val token value
	 * @returns {void}
	 */
	finishToken(type, val) {
		this.end = this.pos;
		const prevType = this.type;
		this.type = type;
		this.value = val;
		this.updateContext(prevType);
	}

	/**
	 * @param {TokenType} type token type
	 * @param {number} size operator length
	 * @returns {void}
	 */
	finishOp(type, size) {
		const str = this.input.slice(this.pos, this.pos + size);
		this.pos += size;
		return this.finishToken(type, str);
	}

	// ----- operator dispatch (acorn's getTokenFromCode + readToken_*) -----

	/**
	 * @param {number} code current code point
	 * @returns {void}
	 */
	getTokenFromCode(code) {
		const input = this.input;
		switch (code) {
			case 46:
				return this.readTokenDot();
			case 40:
				++this.pos;
				return this.finishToken(tt.parenL);
			case 41:
				++this.pos;
				return this.finishToken(tt.parenR);
			case 59:
				++this.pos;
				return this.finishToken(tt.semi);
			case 44:
				++this.pos;
				return this.finishToken(tt.comma);
			case 91:
				++this.pos;
				return this.finishToken(tt.bracketL);
			case 93:
				++this.pos;
				return this.finishToken(tt.bracketR);
			case 123:
				++this.pos;
				return this.finishToken(tt.braceL);
			case 125:
				++this.pos;
				return this.finishToken(tt.braceR);
			case 58:
				++this.pos;
				return this.finishToken(tt.colon);
			case 96:
				if (this.ecmaVersion < 6) break;
				++this.pos;
				return this.finishToken(tt.backQuote);
			case 48: {
				const next = input.charCodeAt(this.pos + 1);
				if (next === 120 || next === 88) return this.readRadixNumber(16);
				if (this.ecmaVersion >= 6) {
					if (next === 111 || next === 79) return this.readRadixNumber(8);
					if (next === 98 || next === 66) return this.readRadixNumber(2);
				}
			}
			// falls through
			case 49:
			case 50:
			case 51:
			case 52:
			case 53:
			case 54:
			case 55:
			case 56:
			case 57:
				return this.readNumber(false);
			case 34:
			case 39:
				return this.readString(code);
			case 47:
				return this.readTokenSlash();
			case 37:
			case 42:
				return this.readTokenMultModuloExp(code);
			case 124:
			case 38:
				return this.readTokenPipeAmp(code);
			case 94:
				return this.readTokenCaret();
			case 43:
			case 45:
				return this.readTokenPlusMin(code);
			case 60:
			case 62:
				return this.readTokenLtGt(code);
			case 61:
			case 33:
				return this.readTokenEqExcl(code);
			case 63:
				return this.readTokenQuestion();
			case 126:
				return this.finishOp(tt.prefix, 1);
			case 35:
				return this.readTokenNumberSign();
			default:
				break;
		}
		this.raise(this.pos, `Unexpected character '${codePointToString(code)}'`);
	}

	/**
	 * @returns {void}
	 */
	readTokenDot() {
		const input = this.input;
		const next = input.charCodeAt(this.pos + 1);
		if (next >= 48 && next <= 57) return this.readNumber(true);
		const next2 = input.charCodeAt(this.pos + 2);
		if (this.ecmaVersion >= 6 && next === 46 && next2 === 46) {
			this.pos += 3;
			return this.finishToken(tt.ellipsis);
		}
		++this.pos;
		return this.finishToken(tt.dot);
	}

	/**
	 * @returns {void}
	 */
	readTokenSlash() {
		const next = this.input.charCodeAt(this.pos + 1);
		if (this.exprAllowed) {
			++this.pos;
			return this.readRegexp();
		}
		if (next === 61) return this.finishOp(tt.assign, 2);
		return this.finishOp(tt.slash, 1);
	}

	/**
	 * @param {number} code `%` or `*`
	 * @returns {void}
	 */
	readTokenMultModuloExp(code) {
		const input = this.input;
		let next = input.charCodeAt(this.pos + 1);
		let size = 1;
		let type = code === 42 ? tt.star : tt.modulo;
		if (this.ecmaVersion >= 7 && code === 42 && next === 42) {
			++size;
			type = tt.starstar;
			next = input.charCodeAt(this.pos + 2);
		}
		if (next === 61) return this.finishOp(tt.assign, size + 1);
		return this.finishOp(type, size);
	}

	/**
	 * @param {number} code `|` or `&`
	 * @returns {void}
	 */
	readTokenPipeAmp(code) {
		const input = this.input;
		const next = input.charCodeAt(this.pos + 1);
		if (next === code) {
			if (this.ecmaVersion >= 12 && input.charCodeAt(this.pos + 2) === 61) {
				return this.finishOp(tt.assign, 3);
			}
			return this.finishOp(code === 124 ? tt.logicalOR : tt.logicalAND, 2);
		}
		if (next === 61) return this.finishOp(tt.assign, 2);
		return this.finishOp(code === 124 ? tt.bitwiseOR : tt.bitwiseAND, 1);
	}

	/**
	 * @returns {void}
	 */
	readTokenCaret() {
		if (this.input.charCodeAt(this.pos + 1) === 61) {
			return this.finishOp(tt.assign, 2);
		}
		return this.finishOp(tt.bitwiseXOR, 1);
	}

	/**
	 * @param {number} code `+` or `-`
	 * @returns {void}
	 */
	readTokenPlusMin(code) {
		const input = this.input;
		const next = input.charCodeAt(this.pos + 1);
		if (next === code) {
			if (
				next === 45 &&
				!this.inModule &&
				input.charCodeAt(this.pos + 2) === 62 &&
				(this.lastTokEnd === 0 ||
					lineBreak.test(input.slice(this.lastTokEnd, this.pos)))
			) {
				this.skipLineComment(3);
				this.skipSpace();
				return this.nextToken();
			}
			return this.finishOp(tt.incDec, 2);
		}
		if (next === 61) return this.finishOp(tt.assign, 2);
		return this.finishOp(tt.plusMin, 1);
	}

	/**
	 * @param {number} code `<` or `>`
	 * @returns {void}
	 */
	readTokenLtGt(code) {
		const input = this.input;
		const next = input.charCodeAt(this.pos + 1);
		let size = 1;
		if (next === code) {
			size = code === 62 && input.charCodeAt(this.pos + 2) === 62 ? 3 : 2;
			if (input.charCodeAt(this.pos + size) === 61) {
				return this.finishOp(tt.assign, size + 1);
			}
			return this.finishOp(tt.bitShift, size);
		}
		if (
			next === 33 &&
			code === 60 &&
			!this.inModule &&
			input.charCodeAt(this.pos + 2) === 45 &&
			input.charCodeAt(this.pos + 3) === 45
		) {
			this.skipLineComment(4);
			this.skipSpace();
			return this.nextToken();
		}
		if (next === 61) size = 2;
		return this.finishOp(tt.relational, size);
	}

	/**
	 * @param {number} code `=` or `!`
	 * @returns {void}
	 */
	readTokenEqExcl(code) {
		const input = this.input;
		const next = input.charCodeAt(this.pos + 1);
		if (next === 61) {
			return this.finishOp(
				tt.equality,
				input.charCodeAt(this.pos + 2) === 61 ? 3 : 2
			);
		}
		if (code === 61 && next === 62 && this.ecmaVersion >= 6) {
			this.pos += 2;
			return this.finishToken(tt.arrow);
		}
		return this.finishOp(code === 61 ? tt.eq : tt.prefix, 1);
	}

	/**
	 * @returns {void}
	 */
	readTokenQuestion() {
		const input = this.input;
		const ecmaVersion = this.ecmaVersion;
		if (ecmaVersion >= 11) {
			const next = input.charCodeAt(this.pos + 1);
			if (next === 46) {
				const next2 = input.charCodeAt(this.pos + 2);
				if (next2 < 48 || next2 > 57) return this.finishOp(tt.questionDot, 2);
			}
			if (next === 63) {
				if (ecmaVersion >= 12 && input.charCodeAt(this.pos + 2) === 61) {
					return this.finishOp(tt.assign, 3);
				}
				return this.finishOp(tt.coalesce, 2);
			}
		}
		return this.finishOp(tt.question, 1);
	}

	/**
	 * @returns {void}
	 */
	readTokenNumberSign() {
		const ecmaVersion = this.ecmaVersion;
		let code = 35;
		if (ecmaVersion >= 13) {
			++this.pos;
			code = this.fullCharCodeAtPos();
			if (isIdentifierStart(code, true) || code === 92) {
				return this.finishToken(tt.privateId, this.readWord1());
			}
		}
		this.raise(this.pos, `Unexpected character '${codePointToString(code)}'`);
	}

	// ----- numbers -----

	/**
	 * @param {number} radix numeric radix
	 * @param {number=} len fixed digit count (for escapes), else read greedily
	 * @param {boolean=} maybeLegacyOctal whether a leading zero disallows separators
	 * @returns {number | null} the integer value, or null when no digits matched
	 */
	readInt(radix, len, maybeLegacyOctal) {
		const input = this.input;
		const allowSeparators = this.ecmaVersion >= 12 && len === undefined;
		const isLegacyOctal =
			maybeLegacyOctal === true && input.charCodeAt(this.pos) === 48;
		const start = this.pos;
		let total = 0;
		let lastCode = 0;
		for (
			let i = 0, e = len === undefined ? Infinity : len;
			i < e;
			++i, ++this.pos
		) {
			const code = input.charCodeAt(this.pos);
			let val;
			if (allowSeparators && code === 95) {
				if (isLegacyOctal) {
					this.raiseRecoverable(
						this.pos,
						"Numeric separator is not allowed in legacy octal numeric literals"
					);
				}
				if (lastCode === 95) {
					this.raiseRecoverable(
						this.pos,
						"Numeric separator must be exactly one underscore"
					);
				}
				if (i === 0) {
					this.raiseRecoverable(
						this.pos,
						"Numeric separator is not allowed at the first of digits"
					);
				}
				lastCode = code;
				continue;
			}
			if (code >= 97) val = code - 97 + 10;
			else if (code >= 65) val = code - 65 + 10;
			else if (code >= 48 && code <= 57) val = code - 48;
			else val = Infinity;
			if (val >= radix) break;
			lastCode = code;
			total = total * radix + val;
		}
		if (allowSeparators && lastCode === 95) {
			this.raiseRecoverable(
				this.pos - 1,
				"Numeric separator is not allowed at the last of digits"
			);
		}
		if (this.pos === start || (len !== undefined && this.pos - start !== len)) {
			return null;
		}
		return total;
	}

	/**
	 * @param {number} radix numeric radix (2/8/16)
	 * @returns {void}
	 */
	readRadixNumber(radix) {
		const input = this.input;
		const start = this.pos;
		this.pos += 2;
		let val = this.readInt(radix);
		if (val === null) {
			this.raise(this.start + 2, `Expected number in radix ${radix}`);
		}
		if (this.ecmaVersion >= 11 && input.charCodeAt(this.pos) === 110) {
			val = /** @type {EXPECTED_ANY} */ (
				stringToBigInt(input.slice(start, this.pos))
			);
			++this.pos;
		} else if (isIdentifierStart(this.fullCharCodeAtPos())) {
			this.raise(this.pos, "Identifier directly after number");
		}
		return this.finishToken(tt.num, val);
	}

	/**
	 * @param {boolean} startsWithDot whether the literal started with `.`
	 * @returns {void}
	 */
	readNumber(startsWithDot) {
		const input = this.input;
		const start = this.pos;
		if (!startsWithDot && this.readInt(10, undefined, true) === null) {
			this.raise(start, "Invalid number");
		}
		let octal = this.pos - start >= 2 && input.charCodeAt(start) === 48;
		if (octal && this.strict) this.raise(start, "Invalid number");
		let next = input.charCodeAt(this.pos);
		if (!octal && !startsWithDot && this.ecmaVersion >= 11 && next === 110) {
			const val = stringToBigInt(input.slice(start, this.pos));
			++this.pos;
			if (isIdentifierStart(this.fullCharCodeAtPos())) {
				this.raise(this.pos, "Identifier directly after number");
			}
			return this.finishToken(tt.num, /** @type {EXPECTED_ANY} */ (val));
		}
		if (octal && /[89]/.test(input.slice(start, this.pos))) octal = false;
		if (next === 46 && !octal) {
			++this.pos;
			this.readInt(10);
			next = input.charCodeAt(this.pos);
		}
		if ((next === 69 || next === 101) && !octal) {
			next = input.charCodeAt(++this.pos);
			if (next === 43 || next === 45) ++this.pos;
			if (this.readInt(10) === null) this.raise(start, "Invalid number");
		}
		if (isIdentifierStart(this.fullCharCodeAtPos())) {
			this.raise(this.pos, "Identifier directly after number");
		}
		const val = stringToNumber(input.slice(start, this.pos), octal);
		return this.finishToken(tt.num, val);
	}

	// ----- strings, escapes and templates -----

	/**
	 * @returns {number} the code point of a `\u` escape
	 */
	readCodePoint() {
		const input = this.input;
		const ch = input.charCodeAt(this.pos);
		let code;
		if (ch === 123) {
			if (this.ecmaVersion < 6) this.unexpected();
			const codePos = ++this.pos;
			code = this.readHexChar(input.indexOf("}", this.pos) - this.pos);
			++this.pos;
			if (code > 0x10ffff) {
				this.invalidStringToken(codePos, "Code point out of bounds");
			}
		} else {
			code = this.readHexChar(4);
		}
		return code;
	}

	/**
	 * @param {number} len number of hex digits
	 * @returns {number} the parsed code
	 */
	readHexChar(len) {
		const codePos = this.pos;
		const n = this.readInt(16, len);
		if (n === null) {
			this.invalidStringToken(codePos, "Bad character escape sequence");
		}
		return /** @type {number} */ (n);
	}

	/**
	 * @param {number} quote quote char code
	 * @returns {void}
	 */
	readString(quote) {
		const input = this.input;
		let out = "";
		let chunkStart = ++this.pos;
		for (;;) {
			if (this.pos >= input.length) {
				this.raise(this.start, "Unterminated string constant");
			}
			const ch = input.charCodeAt(this.pos);
			if (ch === quote) break;
			if (ch === 92) {
				out += input.slice(chunkStart, this.pos);
				out += this.readEscapedChar(false);
				chunkStart = this.pos;
			} else if (ch === 0x2028 || ch === 0x2029) {
				if (this.ecmaVersion < 10) {
					this.raise(this.start, "Unterminated string constant");
				}
				++this.pos;
			} else {
				if (isNewLine(ch)) {
					this.raise(this.start, "Unterminated string constant");
				}
				++this.pos;
			}
		}
		out += input.slice(chunkStart, this.pos++);
		return this.finishToken(tt.string, out);
	}

	/**
	 * @returns {void}
	 */
	readTmplToken() {
		const input = this.input;
		let out = "";
		let chunkStart = this.pos;
		for (;;) {
			if (this.pos >= input.length) {
				this.raise(this.start, "Unterminated template");
			}
			const ch = input.charCodeAt(this.pos);
			if (ch === 96 || (ch === 36 && input.charCodeAt(this.pos + 1) === 123)) {
				if (
					this.pos === this.start &&
					(this.type === tt.template || this.type === tt.invalidTemplate)
				) {
					if (ch === 36) {
						this.pos += 2;
						return this.finishToken(tt.dollarBraceL);
					}
					++this.pos;
					return this.finishToken(tt.backQuote);
				}
				out += input.slice(chunkStart, this.pos);
				return this.finishToken(tt.template, out);
			}
			if (ch === 92) {
				out += input.slice(chunkStart, this.pos);
				out += this.readEscapedChar(true);
				chunkStart = this.pos;
			} else if (isNewLine(ch)) {
				out += input.slice(chunkStart, this.pos);
				++this.pos;
				if (ch === 13 && input.charCodeAt(this.pos) === 10) ++this.pos;
				out += "\n";
				chunkStart = this.pos;
			} else {
				++this.pos;
			}
		}
	}

	/**
	 * @returns {void}
	 */
	readInvalidTemplateToken() {
		const input = this.input;
		for (; this.pos < input.length; this.pos++) {
			switch (input[this.pos]) {
				case "\\":
					++this.pos;
					break;
				case "$":
					if (input[this.pos + 1] !== "{") break;
				// falls through
				case "`":
					return this.finishToken(
						tt.invalidTemplate,
						input.slice(this.start, this.pos)
					);
				default:
					// line terminators only mattered for acorn line tracking, which a
					// token-only lexer does not keep
					break;
			}
		}
		this.raise(this.start, "Unterminated template");
	}

	/**
	 * @returns {void}
	 */
	tryReadTemplateToken() {
		this.inTemplateElement = true;
		try {
			this.readTmplToken();
		} catch (err) {
			if (err === INVALID_TEMPLATE_ESCAPE_ERROR) {
				this.readInvalidTemplateToken();
			} else {
				throw err;
			}
		}
		this.inTemplateElement = false;
	}

	/**
	 * @param {boolean} inTemplate whether the escape is in a template literal
	 * @returns {string} the cooked replacement (may be `""`)
	 */
	readEscapedChar(inTemplate) {
		const input = this.input;
		let ch = input.charCodeAt(++this.pos);
		++this.pos;
		switch (ch) {
			case 110:
				return "\n";
			case 114:
				return "\r";
			case 120:
				return String.fromCharCode(this.readHexChar(2));
			case 117:
				return codePointToString(this.readCodePoint());
			case 116:
				return "\t";
			case 98:
				return "\b";
			case 118:
				return "\u000B";
			case 102:
				return "\f";
			case 13:
				if (input.charCodeAt(this.pos) === 10) ++this.pos;
			// falls through
			case 10:
				return "";
			case 56:
			case 57:
				if (this.strict) {
					this.invalidStringToken(this.pos - 1, "Invalid escape sequence");
				}
				if (inTemplate) {
					this.invalidStringToken(
						this.pos - 1,
						"Invalid escape sequence in template string"
					);
				}
			// falls through
			default:
				if (ch >= 48 && ch <= 55) {
					let octalStr = /** @type {RegExpMatchArray} */ (
						input.slice(this.pos - 1, this.pos + 2).match(/^[0-7]+/)
					)[0];
					let octal = Number.parseInt(octalStr, 8);
					if (octal > 255) {
						octalStr = octalStr.slice(0, -1);
						octal = Number.parseInt(octalStr, 8);
					}
					this.pos += octalStr.length - 1;
					ch = input.charCodeAt(this.pos);
					if (
						(octalStr !== "0" || ch === 56 || ch === 57) &&
						(this.strict || inTemplate)
					) {
						this.invalidStringToken(
							this.pos - 1 - octalStr.length,
							inTemplate
								? "Octal literal in template string"
								: "Octal literal in strict mode"
						);
					}
					return String.fromCharCode(octal);
				}
				if (isNewLine(ch)) return "";
				return String.fromCharCode(ch);
		}
	}

	// ----- regular expressions -----

	/**
	 * @returns {void}
	 */
	readRegexp() {
		const input = this.input;
		const start = this.pos;
		let escaped = false;
		let inClass = false;
		for (;;) {
			if (this.pos >= input.length) {
				this.raise(start, "Unterminated regular expression");
			}
			const ch = input.charAt(this.pos);
			if (lineBreak.test(ch)) {
				this.raise(start, "Unterminated regular expression");
			}
			if (escaped) {
				escaped = false;
			} else {
				if (ch === "[") inClass = true;
				else if (ch === "]" && inClass) inClass = false;
				else if (ch === "/" && !inClass) break;
				escaped = ch === "\\";
			}
			++this.pos;
		}
		const pattern = input.slice(start, this.pos);
		++this.pos;
		const flagsStart = this.pos;
		const flags = this.readWord1();
		if (this.containsEsc) this.unexpected(flagsStart);
		let value = null;
		try {
			value = new RegExp(pattern, flags);
		} catch (_err) {
			// ESTree requires null when the RegExp cannot be instantiated
		}
		return this.finishToken(tt.regexp, { pattern, flags, value });
	}

	// ----- identifiers and keywords -----

	/**
	 * @returns {string} the (possibly escape-cooked) word
	 */
	readWord1() {
		const input = this.input;
		this.containsEsc = false;
		let word = "";
		let first = true;
		let chunkStart = this.pos;
		const astral = this.ecmaVersion >= 6;
		while (this.pos < input.length) {
			const ch = this.fullCharCodeAtPos();
			if (isIdentifierChar(ch, astral)) {
				this.pos += ch <= 0xffff ? 1 : 2;
			} else if (ch === 92) {
				this.containsEsc = true;
				word += input.slice(chunkStart, this.pos);
				const escStart = this.pos;
				if (input.charCodeAt(++this.pos) !== 117) {
					this.invalidStringToken(
						this.pos,
						"Expecting Unicode escape sequence \\uXXXX"
					);
				}
				++this.pos;
				const esc = this.readCodePoint();
				if (!(first ? isIdentifierStart : isIdentifierChar)(esc, astral)) {
					this.invalidStringToken(escStart, "Invalid Unicode escape");
				}
				word += codePointToString(esc);
				chunkStart = this.pos;
			} else {
				break;
			}
			first = false;
		}
		return word + input.slice(chunkStart, this.pos);
	}

	/**
	 * @returns {void}
	 */
	readWord() {
		const word = this.readWord1();
		const type = KEYWORDS.has(word) ? keywordTypes[word] : tt.name;
		return this.finishToken(/** @type {TokenType} */ (type), word);
	}

	// ----- public token stream -----

	/**
	 * Advances to the next token, keeping `lastTok*` in sync like acorn's `next`.
	 * @returns {void}
	 */
	next() {
		this.lastTokEnd = this.end;
		this.lastTokStart = this.start;
		this.nextToken();
	}

	/**
	 * @returns {{ type: TokenType, value: unknown, start: number, end: number }} the next token
	 */
	getToken() {
		this.next();
		return {
			type: this.type,
			value: this.value,
			start: this.start,
			end: this.end
		};
	}

	/**
	 * Iterates every token up to and including `eof`.
	 * @returns {IterableIterator<{ type: TokenType, value: unknown, start: number, end: number }>} token iterator
	 */
	*[Symbol.iterator]() {
		for (;;) {
			const token = this.getToken();
			// acorn's iterator terminates on eof without yielding it
			if (token.type === tt.eof) return;
			yield token;
		}
	}
}

/**
 * Minimal 1-based line/column for error messages (acorn-compatible shape).
 * @param {string} input source text
 * @param {number} offset error offset
 * @returns {{ line: number, column: number }} position
 */
const getLineColumn = (input, offset) => {
	let line = 1;
	let lineStart = 0;
	lineBreak.lastIndex = 0;
	const re = new RegExp(lineBreak.source, "g");
	let match;
	while ((match = re.exec(input)) && match.index < offset) {
		line++;
		lineStart = match.index + match[0].length;
	}
	return { line, column: offset - lineStart };
};

module.exports = JavascriptTokenizer;
