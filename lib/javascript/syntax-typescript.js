/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { tokTypes: tt } = require("./syntax-parser");

// cspell:ignore binop

/** @typedef {import("./syntax-parser").TokenType} TokenType */
/** @typedef {import("./syntax-parser").TokenValue} TokenValue */
/** @typedef {import("./syntax-parser").ParserInternals} Tokenizer */

/** @typedef {[number, number, number, TokenType, TokenValue, number, number, Tokenizer["context"], boolean, 0 | 1 | 2, number, boolean]} Mark a tokenizer state to go back to */

// Thrown where the tokens read are not the type or declaration expected; one
// object, so a failed look-ahead builds no stack trace.
const NOT_A_TYPE = new Error("not a type");

/**
 * TypeScript syntax the reader refuses: syntax Node.js's type stripping does
 * not strip, as its `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` says, since it has a
 * runtime meaning, or a member whose modifiers TypeScript rejects.
 */
class TypeScriptSyntaxError extends Error {
	/**
	 * @param {number} pos where the syntax starts
	 * @param {string} what what it is, as the parse error names it
	 * @param {boolean=} unsupported whether it is valid TypeScript that is not stripped
	 */
	constructor(pos, what, unsupported = true) {
		super(what);
		/** @type {number} */
		this.pos = pos;
		/** @type {boolean} */
		this.unsupported = unsupported;
	}
}

// Modifiers TypeScript wants before `static`.
const ACCESSIBILITY = new Set(["private", "protected", "public"]);

// Words that modify a member of an object type or a class before its name.
const MEMBER_MODIFIERS = new Set([
	"abstract",
	"accessor",
	"async",
	"declare",
	"get",
	"override",
	"private",
	"protected",
	"public",
	"readonly",
	"set",
	"static"
]);

/**
 * Reads TypeScript's types and type-only declarations as tokens, on the
 * parser's own tokenizer, so the parser can skip what they span. Each entry
 * point starts at the parser's current token and returns where the syntax it
 * read ends, or -1 where the source holds no such syntax there; the parser
 * puts its tokenizer back where it was (`_tsScan`).
 */
class TypeScanner {
	/**
	 * @param {Tokenizer} parser the parser whose tokenizer it reads with
	 */
	constructor(parser) {
		/** @type {string} */
		this.input = parser.input;
		/** @type {Tokenizer} */
		this.t = parser;
		// the parser's context stack while a scan runs, kept for its next scan
		/** @type {Tokenizer["context"]} */
		this.savedContext = [];
		/** @type {number} */
		this.failAt = -1;
		// where `arrowAfterParen` found a return type's `:`, and where it ends
		/** @type {number} */
		this.colonStart = -1;
		/** @type {number} */
		this.typeEnd = -1;
		// the class whose body is being read: declared `abstract`, and with a superclass
		/** @type {boolean} */
		this.abstractClass = false;
		/** @type {boolean} */
		this.derivedClass = false;
		// whether the next class was declared `abstract`, which the parser skipped
		/** @type {boolean} */
		this.nextClassAbstract = false;
	}

	// ----- tokenizer -----

	/**
	 * Run a reader from the current token, at `pos`, turning a mismatch into -1.
	 * @param {number} pos where the current token starts
	 * @param {(this: TypeScanner) => number} read the reader, returning the end or -1
	 * @returns {number} the end, or -1
	 */
	run(pos, read) {
		try {
			return read.call(this);
		} catch (error) {
			if (error === NOT_A_TYPE || error instanceof SyntaxError) {
				this.failAt = Math.max(this.t.start, pos);
				return -1;
			}
			throw error;
		}
	}

	/** @returns {void} */
	next() {
		this.t.next();
	}

	/**
	 * @param {TokenType} type the token that must come
	 * @returns {void}
	 */
	expect(type) {
		if (this.t.type !== type) throw NOT_A_TYPE;
		this.t.next();
	}

	/**
	 * @param {string} name a contextual keyword
	 * @returns {boolean} whether the current token is it
	 */
	isWord(name) {
		return this.t.type === tt.name && this.t.value === name;
	}

	/** @returns {boolean} whether the current token is a name or a keyword */
	isAnyWord() {
		const type = this.t.type;
		return type === tt.name || type.keyword !== undefined;
	}

	/** @returns {boolean} whether the current token is `<` */
	isLessThan() {
		return this.t.type === tt.relational && this.t.value === "<";
	}

	/** @returns {boolean} whether a line terminator precedes the current token */
	newlineBefore() {
		const input = this.input;
		for (let i = this.t.lastTokEnd, end = this.t.start; i < end; i++) {
			const ch = input.charCodeAt(i);
			if (ch === 10 || ch === 13 || ch === 0x2028 || ch === 0x2029) {
				return true;
			}
		}
		return false;
	}

	/** @returns {Mark} the tokenizer's state */
	mark() {
		const t = this.t;
		return [
			t.pos,
			t.start,
			t.end,
			t.type,
			t.value,
			t.lastTokEnd,
			t.lastTokStart,
			[...t.context],
			t.exprAllowed,
			t._newlineBefore,
			t._wordKind,
			t.containsEsc
		];
	}

	/**
	 * @param {Mark} mark a state `mark` took
	 * @returns {void}
	 */
	reset(mark) {
		const t = this.t;
		t.pos = mark[0];
		t.start = mark[1];
		t.end = mark[2];
		t.type = mark[3];
		t.value = mark[4];
		t.lastTokEnd = mark[5];
		t.lastTokStart = mark[6];
		// in place: the parser holds the array
		const context = t.context;
		const saved = mark[7];
		context.length = saved.length;
		for (let i = 0; i < saved.length; i++) context[i] = saved[i];
		t.exprAllowed = mark[8];
		t._newlineBefore = mark[9];
		t._wordKind = mark[10];
		t.containsEsc = mark[11];
	}

	/**
	 * Read a `>` closing type arguments or parameters, splitting `>>`, `>=`
	 * and the like, which the tokenizer reads as one token.
	 * @returns {void}
	 */
	closeAngle() {
		const t = this.t;
		if (t.type === tt.relational && t.value === ">") {
			t.next();
			return;
		}
		const start = t.start;
		if (
			this.input.charCodeAt(start) !== 62 ||
			(t.type !== tt.relational &&
				t.type !== tt.bitShift &&
				t.type !== tt.assign)
		) {
			throw NOT_A_TYPE;
		}
		t.lastTokStart = start;
		t.lastTokEnd = start + 1;
		t.pos = start + 1;
		t.type = tt.relational;
		t.nextToken();
	}

	/**
	 * Read a bracketed run of tokens, from its opening token to the matching
	 * closing one.
	 * @returns {void}
	 */
	balanced() {
		const t = this.t;
		let depth = 0;
		do {
			const type = t.type;
			if (
				type === tt.parenL ||
				type === tt.bracketL ||
				type === tt.braceL ||
				type === tt.dollarBraceL
			) {
				depth++;
			} else if (
				type === tt.parenR ||
				type === tt.bracketR ||
				type === tt.braceR
			) {
				depth--;
			} else if (type === tt.eof) {
				throw NOT_A_TYPE;
			}
			t.next();
		} while (depth > 0);
	}

	/**
	 * Read an expression as tokens, up to a token at its own depth that
	 * cannot continue it, for an initializer a declaration only states.
	 * @returns {void}
	 */
	expressionTokens() {
		const t = this.t;
		let first = true;
		for (;;) {
			const type = t.type;
			if (
				type === tt.comma ||
				type === tt.semi ||
				type === tt.parenR ||
				type === tt.bracketR ||
				type === tt.braceR ||
				type === tt.eof ||
				(!first && this.newlineBefore())
			) {
				return;
			}
			first = false;
			if (type === tt.parenL || type === tt.bracketL || type === tt.braceL) {
				this.balanced();
			} else {
				t.next();
			}
		}
	}

	/** @returns {void} */
	semicolon() {
		if (this.t.type === tt.semi) this.t.next();
	}

	// ----- types -----

	/**
	 * Read a type, TypeScript's `parseType`.
	 * @param {boolean} noConditional whether `extends` ends it rather than opening a conditional type
	 * @returns {void}
	 */
	type(noConditional) {
		if (this.functionTypeStart()) {
			this.functionType();
			return;
		}
		this.union(noConditional);
		const t = this.t;
		if (!noConditional && t.type === tt._extends && !this.newlineBefore()) {
			t.next();
			this.type(true);
			this.expect(tt.question);
			this.type(false);
			this.expect(tt.colon);
			this.type(false);
		}
	}

	/** @returns {boolean} whether a function or constructor type starts here */
	functionTypeStart() {
		const t = this.t;
		if (this.isLessThan() || t.type === tt._new) return true;
		if (this.isWord("abstract")) {
			const mark = this.mark();
			t.next();
			const isNew = t.type === tt._new;
			this.reset(mark);
			return isNew;
		}
		if (t.type !== tt.parenL) return false;
		// TypeScript's `isUnambiguouslyStartOfFunctionType`: what opens the
		// parentheses tells parameters from a parenthesized type
		const mark = this.mark();
		try {
			t.next();
			if (t.type === tt.parenR || t.type === tt.ellipsis) return true;
			if (t.type === tt.bracketL || t.type === tt.braceL) {
				this.balanced();
			} else if (this.isAnyWord()) {
				t.next();
			} else {
				return false;
			}
			if (
				t.type === tt.colon ||
				t.type === tt.comma ||
				t.type === tt.question ||
				t.type === tt.eq
			) {
				return true;
			}
			if (t.type !== tt.parenR) return false;
			t.next();
			return t.type === tt.arrow;
		} catch (error) {
			if (error === NOT_A_TYPE || error instanceof SyntaxError) return false;
			throw error;
		} finally {
			this.reset(mark);
		}
	}

	/** @returns {void} */
	functionType() {
		const t = this.t;
		if (this.isWord("abstract")) t.next();
		if (t.type === tt._new) t.next();
		if (this.isLessThan()) this.typeParameters();
		if (t.type !== tt.parenL) throw NOT_A_TYPE;
		this.balanced();
		this.expect(tt.arrow);
		this.returnType();
	}

	/**
	 * A return type, which may be a type predicate (`x is T`, `asserts x`).
	 * @returns {void}
	 */
	returnType() {
		const t = this.t;
		if (this.isWord("asserts")) {
			const mark = this.mark();
			t.next();
			if (
				(t.type === tt.name || t.type === tt._this) &&
				!this.newlineBefore()
			) {
				t.next();
				if (this.isWord("is") && !this.newlineBefore()) {
					t.next();
					this.type(false);
				}
				return;
			}
			this.reset(mark);
		}
		if (t.type === tt.name || t.type === tt._this) {
			const mark = this.mark();
			t.next();
			if (this.isWord("is") && !this.newlineBefore()) {
				t.next();
				this.type(false);
				return;
			}
			this.reset(mark);
		}
		this.type(false);
	}

	/**
	 * @param {boolean} noConditional whether `extends` ends the type
	 * @returns {void}
	 */
	union(noConditional) {
		const t = this.t;
		if (t.type === tt.bitwiseOR) t.next();
		this.intersection(noConditional);
		while (t.type === tt.bitwiseOR) {
			t.next();
			this.intersection(noConditional);
		}
	}

	/**
	 * @param {boolean} noConditional whether `extends` ends the type
	 * @returns {void}
	 */
	intersection(noConditional) {
		const t = this.t;
		if (t.type === tt.bitwiseAND) t.next();
		this.typeOperator(noConditional);
		while (t.type === tt.bitwiseAND) {
			t.next();
			this.typeOperator(noConditional);
		}
	}

	/**
	 * @param {boolean} noConditional whether `extends` ends the type
	 * @returns {void}
	 */
	typeOperator(noConditional) {
		const t = this.t;
		if (t.type === tt.name) {
			const word = t.value;
			if (word === "keyof" || word === "unique" || word === "readonly") {
				t.next();
				this.typeOperator(noConditional);
				return;
			}
			if (word === "infer") {
				t.next();
				if (!this.isAnyWord()) throw NOT_A_TYPE;
				t.next();
				if (t.type === tt._extends && !this.newlineBefore()) {
					// a constraint, unless the `extends` opens a conditional type
					const mark = this.mark();
					t.next();
					this.type(true);
					if (noConditional || t.type !== tt.question) return;
					this.reset(mark);
				}
				return;
			}
		}
		this.primaryType();
		while (t.type === tt.bracketL && !this.newlineBefore()) {
			t.next();
			if (t.type === tt.bracketR) {
				t.next();
			} else {
				this.type(false);
				this.expect(tt.bracketR);
			}
		}
	}

	/** @returns {void} */
	primaryType() {
		const t = this.t;
		const type = t.type;
		if (type === tt.string || type === tt.num) {
			t.next();
		} else if (type === tt.plusMin && t.value === "-") {
			t.next();
			this.expect(tt.num);
		} else if (type === tt.backQuote) {
			this.templateType();
		} else if (type === tt.parenL) {
			t.next();
			this.type(false);
			this.expect(tt.parenR);
		} else if (type === tt.bracketL) {
			this.tupleType();
		} else if (type === tt.braceL) {
			this.objectType();
		} else if (type === tt._typeof) {
			t.next();
			if (t.type === tt._import) {
				this.importType();
			} else {
				this.entityName();
				if (this.isLessThan() && !this.newlineBefore()) this.typeArguments();
			}
		} else if (type === tt._import) {
			this.importType();
		} else if (type === tt._this) {
			t.next();
			if (this.isWord("is") && !this.newlineBefore()) {
				t.next();
				this.type(false);
			}
		} else if (type === tt.name || type.keyword !== undefined) {
			this.entityName();
			if (this.isLessThan() && !this.newlineBefore()) this.typeArguments();
		} else {
			throw NOT_A_TYPE;
		}
	}

	/**
	 * A name, perhaps qualified (`A.B.C`).
	 * @returns {void}
	 */
	entityName() {
		const t = this.t;
		if (!this.isAnyWord()) throw NOT_A_TYPE;
		t.next();
		while (t.type === tt.dot) {
			t.next();
			if (!this.isAnyWord() && t.type !== tt.privateId) throw NOT_A_TYPE;
			t.next();
		}
	}

	/** @returns {void} */
	importType() {
		const t = this.t;
		t.next();
		this.expect(tt.parenL);
		this.expect(tt.string);
		if (t.type === tt.comma) {
			t.next();
			if (t.type === tt.braceL) this.balanced();
			if (t.type === tt.comma) t.next();
		}
		this.expect(tt.parenR);
		while (t.type === tt.dot) {
			t.next();
			if (!this.isAnyWord()) throw NOT_A_TYPE;
			t.next();
		}
		if (this.isLessThan() && !this.newlineBefore()) this.typeArguments();
	}

	/** @returns {void} */
	templateType() {
		const t = this.t;
		t.next();
		for (;;) {
			const type = t.type;
			if (type === tt.template || type === tt.invalidTemplate) {
				t.next();
			} else if (type === tt.dollarBraceL) {
				t.next();
				this.type(false);
				if (t.type !== tt.braceR) throw NOT_A_TYPE;
				t.next();
			} else if (type === tt.backQuote) {
				t.next();
				return;
			} else {
				throw NOT_A_TYPE;
			}
		}
	}

	/**
	 * @param {number} pos where to look from
	 * @returns {number} the offset of the first character past the gap
	 */
	gapEnd(pos) {
		const input = this.input;
		const len = input.length;
		while (pos < len) {
			const ch = input.charCodeAt(pos);
			if (ch === 47 && input.charCodeAt(pos + 1) === 42) {
				const end = input.indexOf("*/", pos + 2);
				if (end === -1) return len;
				pos = end + 2;
			} else if (ch === 47 && input.charCodeAt(pos + 1) === 47) {
				while (pos < len) {
					const commentCh = input.charCodeAt(pos);
					if (
						commentCh === 10 ||
						commentCh === 13 ||
						commentCh === 0x2028 ||
						commentCh === 0x2029
					) {
						break;
					}
					pos++;
				}
			} else if (ch <= 32 || ch === 160 || ch === 0xfeff) {
				pos++;
			} else {
				return pos;
			}
		}
		return pos;
	}

	/** @returns {boolean} whether the current word names a tuple member, `name:` or `name?:` */
	namedTupleMember() {
		if (!this.isAnyWord()) return false;
		const input = this.input;
		let pos = this.gapEnd(this.t.end);
		if (input.charCodeAt(pos) === 63) pos = this.gapEnd(pos + 1);
		return input.charCodeAt(pos) === 58;
	}

	/** @returns {void} */
	tupleType() {
		const t = this.t;
		t.next();
		while (t.type !== tt.bracketR) {
			if (t.type === tt.ellipsis) t.next();
			if (this.namedTupleMember()) {
				t.next();
				if (t.type === tt.question) t.next();
				this.expect(tt.colon);
			}
			this.type(false);
			if (t.type === tt.question) t.next();
			if (t.type !== tt.comma) break;
			t.next();
		}
		this.expect(tt.bracketR);
	}

	/** @returns {void} */
	objectType() {
		const t = this.t;
		t.next();
		if (this.mappedType()) return;
		while (t.type !== tt.braceR) {
			this.typeMember();
			if (t.type === tt.comma || t.type === tt.semi) t.next();
		}
		t.next();
	}

	/**
	 * A mapped type's body after its `{`: `[K in T as U]?: V }`.
	 * @returns {boolean} whether it was one, read to its `}`
	 */
	mappedType() {
		const t = this.t;
		const mark = this.mark();
		if (t.type === tt.plusMin) t.next();
		if (this.isWord("readonly")) t.next();
		if (t.type === tt.bracketL) {
			t.next();
			if (t.type === tt.name) {
				t.next();
				if (t.type === tt._in) {
					t.next();
					this.type(false);
					if (this.isWord("as")) {
						t.next();
						this.type(false);
					}
					this.expect(tt.bracketR);
					if (t.type === tt.plusMin) t.next();
					if (t.type === tt.question) t.next();
					if (t.type === tt.colon) {
						t.next();
						this.type(false);
					}
					if (t.type === tt.semi || t.type === tt.comma) t.next();
					this.expect(tt.braceR);
					return true;
				}
			}
		}
		this.reset(mark);
		return false;
	}

	/** @returns {boolean} whether a name or a string follows the current token */
	followedByName() {
		const t = this.t;
		const mark = this.mark();
		t.next();
		const type = t.type;
		this.reset(mark);
		return type === tt.name || type === tt.string;
	}

	/** @returns {boolean} whether the token after a modifier lets it modify */
	canFollowModifier() {
		const type = this.t.type;
		return (
			!this.newlineBefore() &&
			(type === tt.name ||
				type.keyword !== undefined ||
				type === tt.string ||
				type === tt.num ||
				type === tt.privateId ||
				type === tt.bracketL ||
				type === tt.star)
		);
	}

	/** @returns {void} */
	typeMember() {
		const t = this.t;
		if (this.isLessThan() || t.type === tt.parenL) {
			this.signature();
			return;
		}
		if (t.type === tt._new) {
			const mark = this.mark();
			t.next();
			if (this.isLessThan() || t.type === tt.parenL) {
				this.signature();
				return;
			}
			this.reset(mark);
		}
		while (
			t.type === tt.name &&
			MEMBER_MODIFIERS.has(/** @type {string} */ (t.value))
		) {
			const mark = this.mark();
			t.next();
			if (!this.canFollowModifier()) {
				this.reset(mark);
				break;
			}
		}
		if (t.type === tt.bracketL) {
			if (this.indexSignature()) return;
			this.balanced();
		} else if (
			this.isAnyWord() ||
			t.type === tt.string ||
			t.type === tt.num ||
			t.type === tt.privateId
		) {
			t.next();
		} else {
			throw NOT_A_TYPE;
		}
		if (t.type === tt.question) t.next();
		if (this.isLessThan() || t.type === tt.parenL) {
			this.signature();
		} else if (t.type === tt.colon) {
			t.next();
			this.type(false);
		}
	}

	/**
	 * An index signature from its `[`: `[key: string]: T`.
	 * @returns {boolean} whether it was one, read to its type's end
	 */
	indexSignature() {
		const t = this.t;
		const mark = this.mark();
		t.next();
		if (this.isAnyWord()) {
			t.next();
			if (t.type === tt.colon) {
				t.next();
				this.type(false);
				this.expect(tt.bracketR);
				if (t.type === tt.colon) {
					t.next();
					this.type(false);
				}
				return true;
			}
		}
		this.reset(mark);
		return false;
	}

	/**
	 * A call, construct or method signature from its type parameters or `(`.
	 * @returns {void}
	 */
	signature() {
		const t = this.t;
		if (this.isLessThan()) this.typeParameters();
		if (t.type !== tt.parenL) throw NOT_A_TYPE;
		this.balanced();
		if (t.type === tt.colon) {
			t.next();
			this.returnType();
		}
	}

	/**
	 * @param {boolean=} standalone whether only a `>` of its own closes them, as after an expression, where `>=` or `>>` is an operator
	 * @returns {void}
	 */
	typeArguments(standalone) {
		const t = this.t;
		t.next();
		this.type(false);
		while (t.type === tt.comma) {
			t.next();
			this.type(false);
		}
		if (standalone && !(t.type === tt.relational && t.value === ">")) {
			throw NOT_A_TYPE;
		}
		this.closeAngle();
	}

	/** @returns {void} */
	typeParameters() {
		const t = this.t;
		t.next();
		for (;;) {
			while (t.type === tt._in || t.type === tt._const || this.isWord("out")) {
				const mark = this.mark();
				t.next();
				if (t.type !== tt.name) {
					this.reset(mark);
					break;
				}
			}
			if (!this.isAnyWord()) throw NOT_A_TYPE;
			t.next();
			if (t.type === tt._extends) {
				t.next();
				this.type(false);
			}
			if (t.type === tt.eq) {
				t.next();
				this.type(false);
			}
			if (t.type !== tt.comma) break;
			t.next();
			if (this.input.charCodeAt(t.start) === 62) break;
		}
		this.closeAngle();
	}

	// ----- entry points: types -----

	/**
	 * @param {number} pos where a `: Type` annotation starts
	 * @returns {number} where it ends, or -1
	 */
	annotation(pos) {
		return this.run(pos, function annotation() {
			this.expect(tt.colon);
			this.type(false);
			return this.t.lastTokEnd;
		});
	}

	/**
	 * @param {number} pos where a function's `: ReturnType` starts
	 * @returns {number} where it ends, or -1
	 */
	returnAnnotation(pos) {
		return this.run(pos, function returnAnnotation() {
			this.expect(tt.colon);
			this.returnType();
			return this.t.lastTokEnd;
		});
	}

	/**
	 * @param {number} pos where `as Type`, `as const` or `satisfies Type` starts
	 * @returns {number} where it ends, or -1
	 */
	assertion(pos) {
		return this.run(pos, function assertion() {
			this.next();
			if (this.t.type === tt._const) this.next();
			else this.type(false);
			return this.t.lastTokEnd;
		});
	}

	/**
	 * @param {number} pos where `<Type, ...>` starts
	 * @returns {number} where it ends, or -1
	 */
	typeArgumentsAt(pos) {
		return this.run(pos, function typeArgumentsAt() {
			this.typeArguments();
			return this.t.lastTokEnd;
		});
	}

	/**
	 * @param {number} pos where `<T extends U = V, ...>` starts
	 * @returns {number} where it ends, or -1
	 */
	typeParametersAt(pos) {
		return this.run(pos, function typeParametersAt() {
			this.typeParameters();
			return this.t.lastTokEnd;
		});
	}

	/**
	 * Type arguments after an expression, which TypeScript reads only where
	 * what follows cannot read them as a comparison: a call, a template, a
	 * line break, a binary operator or a token that cannot start an expression.
	 * @param {number} pos where the `<` is
	 * @returns {number} where they end, or -1 for a comparison
	 */
	expressionTypeArguments(pos) {
		return this.run(pos, function expressionTypeArguments() {
			this.typeArguments(true);
			const end = this.t.lastTokEnd;
			const type = this.t.type;
			if (type === tt.parenL || type === tt.backQuote) return end;
			if (type === tt.relational || type === tt.plusMin) return -1;
			if (
				this.newlineBefore() ||
				/** @type {{ binop: number | null }} */ (type).binop !== null ||
				this.isWord("as") ||
				this.isWord("satisfies") ||
				!type.startsExpr
			) {
				return end;
			}
			return -1;
		});
	}

	/**
	 * Whether a `(` opens an arrow function's parameters: `(...) =>` or
	 * `(...): Type =>`. A return type's `:` and end land in `colonStart` and
	 * `typeEnd`; in a conditional's consequent the arrow must be followed by
	 * the conditional's `:`, or the `:` is the conditional's.
	 * @param {number} pos where the `(` is
	 * @param {boolean} inConsequent whether this is the consequent of a conditional
	 * @returns {number} 1 for an arrow, 0 otherwise
	 */
	arrowAfterParen(pos, inConsequent) {
		this.colonStart = -1;
		this.typeEnd = -1;
		const result = this.run(
			pos,
			// an arrow: it sets fields, which would make a function a constructor
			() => {
				const t = this.t;
				this.balanced();
				if (t.type === tt.arrow) return this.newlineBefore() ? 0 : 1;
				if (t.type !== tt.colon) return 0;
				const colonStart = t.start;
				t.next();
				this.returnType();
				if (t.type !== tt.arrow) return 0;
				const typeEnd = t.lastTokEnd;
				if (inConsequent) {
					t.next();
					this.arrowBody();
					if (t.type !== tt.colon) return 0;
				}
				this.colonStart = colonStart;
				this.typeEnd = typeEnd;
				return 1;
			}
		);
		return result === 1 ? 1 : 0;
	}

	/**
	 * An arrow's body as tokens: a block, or an expression up to what ends it.
	 * @returns {void}
	 */
	arrowBody() {
		const t = this.t;
		if (t.type === tt.braceL) {
			this.balanced();
			return;
		}
		let conditionals = 0;
		for (;;) {
			const type = t.type;
			if (
				type === tt.comma ||
				type === tt.parenR ||
				type === tt.bracketR ||
				type === tt.braceR ||
				type === tt.semi ||
				type === tt.eof
			) {
				return;
			}
			if (type === tt.colon) {
				if (conditionals === 0) return;
				conditionals--;
			} else if (type === tt.question) {
				conditionals++;
			}
			if (
				type === tt.parenL ||
				type === tt.bracketL ||
				type === tt.braceL ||
				type === tt.dollarBraceL
			) {
				this.balanced();
			} else if (this.isLessThan()) {
				this.lessThanInBody();
			} else {
				t.next();
			}
		}
	}

	/**
	 * A `<` in an arrow's body: type arguments, `f<A, B>(x)`, read whole, so
	 * their `,` does not end the body; otherwise a comparison.
	 * @returns {void}
	 */
	lessThanInBody() {
		const t = this.t;
		const failAt = this.failAt;
		const mark = this.mark();
		if (this.expressionTypeArguments(t.start) === -1) {
			this.reset(mark);
			this.failAt = failAt;
			t.next();
		}
	}

	/**
	 * Type parameters opening a generic arrow, `<T>(x: T) => x`.
	 * @param {number} pos where the `<` is
	 * @returns {number} where the type parameters end, or -1 where no arrow follows
	 */
	genericArrow(pos) {
		return this.run(pos, function genericArrow() {
			const t = this.t;
			this.typeParameters();
			const end = t.lastTokEnd;
			if (t.type !== tt.parenL) return -1;
			this.balanced();
			if (t.type === tt.colon) {
				t.next();
				this.returnType();
			}
			return t.type === tt.arrow ? end : -1;
		});
	}

	/**
	 * @param {number} pos where `implements A, B<C>` starts
	 * @returns {number} where it ends, or -1
	 */
	implementsClause(pos) {
		return this.run(pos, function implementsClause() {
			const t = this.t;
			t.next();
			for (;;) {
				this.entityName();
				if (this.isLessThan()) this.typeArguments();
				if (t.type !== tt.comma) break;
				t.next();
			}
			return t.lastTokEnd;
		});
	}

	// ----- entry points: declarations -----

	/**
	 * A function's head, `[async] function [*] [name] <T>(...): R`.
	 * @returns {boolean} whether it ends without a body: an overload or a declaration
	 */
	functionHead() {
		const t = this.t;
		if (this.isWord("async")) t.next();
		this.expect(tt._function);
		if (t.type === tt.star) t.next();
		if (t.type === tt.name) t.next();
		if (this.isLessThan()) this.typeParameters();
		if (t.type !== tt.parenL) throw NOT_A_TYPE;
		this.balanced();
		if (t.type === tt.colon) {
			t.next();
			this.returnType();
		}
		return t.type !== tt.braceL;
	}

	/** @returns {void} */
	interfaceDeclaration() {
		const t = this.t;
		t.next();
		if (!this.isAnyWord()) throw NOT_A_TYPE;
		t.next();
		if (this.isLessThan()) this.typeParameters();
		if (t.type === tt._extends) {
			t.next();
			for (;;) {
				this.entityName();
				if (this.isLessThan()) this.typeArguments();
				if (t.type !== tt.comma) break;
				t.next();
			}
		}
		if (t.type !== tt.braceL) throw NOT_A_TYPE;
		this.objectType();
	}

	/** @returns {void} */
	typeAliasDeclaration() {
		const t = this.t;
		t.next();
		if (!this.isAnyWord()) throw NOT_A_TYPE;
		t.next();
		if (this.isLessThan()) this.typeParameters();
		this.expect(tt.eq);
		this.type(false);
		this.semicolon();
	}

	/**
	 * A namespace, which strips only when it holds nothing but types.
	 * @returns {void}
	 */
	namespaceDeclaration() {
		const t = this.t;
		const start = t.start;
		t.next();
		this.entityName();
		this.expect(tt.braceL);
		// an empty statement is one Node.js counts as a value
		while (t.type !== tt.braceR) {
			if (t.type === tt._export) t.next();
			if (this.isWord("interface")) {
				this.interfaceDeclaration();
			} else if (this.isWord("type")) {
				this.typeAliasDeclaration();
			} else if (this.isWord("namespace")) {
				this.namespaceDeclaration();
			} else {
				throw new TypeScriptSyntaxError(start, "namespace declaration");
			}
		}
		t.next();
	}

	/**
	 * What follows `declare`, read to its end.
	 * @returns {void}
	 */
	ambientDeclaration() {
		const t = this.t;
		const type = t.type;
		if (
			type === tt._var ||
			type === tt._const ||
			this.isWord("let") ||
			this.isWord("using")
		) {
			t.next();
			if (this.isWord("enum")) {
				this.braceBody();
				return;
			}
			for (;;) {
				if (t.type === tt.bracketL || t.type === tt.braceL) this.balanced();
				else if (t.type === tt.name) t.next();
				else throw NOT_A_TYPE;
				if (t.type === tt.prefix && t.value === "!") t.next();
				if (t.type === tt.colon) {
					t.next();
					this.type(false);
				}
				if (t.type === tt.eq) {
					t.next();
					this.expressionTokens();
				}
				if (t.type !== tt.comma) break;
				t.next();
			}
			this.semicolon();
		} else if (type === tt._function || this.isWord("async")) {
			this.functionHead();
			if (t.type === tt.braceL) this.balanced();
			this.semicolon();
		} else if (type === tt._class || this.isWord("abstract")) {
			this.braceBody();
		} else if (this.isWord("enum")) {
			this.braceBody();
		} else if (this.isWord("interface")) {
			this.interfaceDeclaration();
		} else if (this.isWord("type")) {
			this.typeAliasDeclaration();
		} else if (this.isWord("namespace") || this.isWord("module")) {
			t.next();
			if (t.type === tt.string) t.next();
			else this.entityName();
			if (t.type === tt.braceL) this.balanced();
			else this.semicolon();
		} else if (this.isWord("global")) {
			t.next();
			if (t.type !== tt.braceL) throw NOT_A_TYPE;
			this.balanced();
		} else {
			throw NOT_A_TYPE;
		}
	}

	/**
	 * Tokens up to a `{` at their own depth, then its block.
	 * @returns {void}
	 */
	braceBody() {
		const t = this.t;
		while (t.type !== tt.braceL) {
			if (t.type === tt.eof) throw NOT_A_TYPE;
			if (this.isLessThan()) {
				// a class's type parameters, or a heritage clause's type arguments
				const mark = this.mark();
				try {
					this.typeParameters();
				} catch (error) {
					if (error !== NOT_A_TYPE && !(error instanceof SyntaxError)) {
						throw error;
					}
					this.reset(mark);
					this.typeArguments();
				}
			} else {
				t.next();
			}
		}
		this.balanced();
	}

	/**
	 * A statement only types make up, read to its end with its semicolon:
	 * `interface`, `type`, `declare`, a namespace of types, an overload, an
	 * `import type` or an `export type`, perhaps exported.
	 * @param {number} pos where the statement starts
	 * @returns {number} where it ends, or -1 where it is JavaScript
	 */
	typeOnlyStatement(pos) {
		return this.run(pos, function typeOnlyStatement() {
			const t = this.t;
			const start = t.start;
			if (t.type === tt._import) {
				t.next();
				if (this.isAnyWord() && !this.isWord("type")) {
					t.next();
					if (t.type === tt.eq) {
						throw new TypeScriptSyntaxError(start, "import equals declaration");
					}
					return -1;
				}
				if (!this.isWord("type")) return -1;
				t.next();
				this.importTypeClause();
				return t.lastTokEnd;
			}
			let exported = false;
			if (t.type === tt._export) {
				exported = true;
				t.next();
				if (t.type === tt.eq) {
					throw new TypeScriptSyntaxError(start, "export assignment");
				}
				if (t.type === tt._import) {
					throw new TypeScriptSyntaxError(start, "import equals declaration");
				}
				if (this.isWord("type")) {
					const mark = this.mark();
					t.next();
					if (t.type === tt.braceL || t.type === tt.star) {
						if (t.type === tt.braceL) {
							this.balanced();
						} else {
							t.next();
							if (this.isWord("as")) {
								t.next();
								t.next();
							}
						}
						if (this.isWord("from")) {
							t.next();
							this.moduleSource();
						}
						this.semicolon();
						return t.lastTokEnd;
					}
					this.reset(mark);
				}
				if (t.type === tt._default) {
					t.next();
					if (this.isWord("interface")) {
						this.interfaceDeclaration();
						return t.lastTokEnd;
					}
					if (t.type !== tt._function && !this.isWord("async")) return -1;
				}
			}
			if (t.type === tt._function || this.isWord("async")) {
				if (this.isWord("async")) {
					const mark = this.mark();
					t.next();
					const isFunction = t.type === tt._function && !this.newlineBefore();
					this.reset(mark);
					if (!isFunction) return -1;
				}
				if (!this.functionHead()) return -1;
				this.semicolon();
				return t.lastTokEnd;
			}
			if (t.type === tt._const) {
				t.next();
				if (this.isWord("enum")) {
					throw new TypeScriptSyntaxError(start, "enum");
				}
				return -1;
			}
			if (t.type !== tt.name) return -1;
			const word = t.value;
			// a declaration keyword is one only before a name on its line
			const mark = this.mark();
			t.next();
			const followed =
				!this.newlineBefore() && (this.isAnyWord() || t.type === tt.string);
			this.reset(mark);
			if (!followed) {
				if (exported) throw NOT_A_TYPE;
				return -1;
			}
			// `module instanceof x` and `enum in x` are expressions
			if ((word === "module" || word === "enum") && !this.followedByName()) {
				return -1;
			}
			switch (word) {
				case "interface":
					this.interfaceDeclaration();
					break;
				case "type":
					this.typeAliasDeclaration();
					break;
				case "declare":
					t.next();
					this.ambientDeclaration();
					break;
				case "namespace":
					this.namespaceDeclaration();
					break;
				case "module":
					throw new TypeScriptSyntaxError(start, "module declaration");
				case "enum":
					throw new TypeScriptSyntaxError(start, "enum");
				default:
					return -1;
			}
			return t.lastTokEnd;
		});
	}

	/** @returns {void} */
	moduleSource() {
		const t = this.t;
		this.expect(tt.string);
		if (
			(t.type === tt._with || this.isWord("assert")) &&
			!this.newlineBefore()
		) {
			t.next();
			if (t.type !== tt.braceL) throw NOT_A_TYPE;
			this.balanced();
		}
	}

	/**
	 * What follows `import type`, read to its end.
	 * @returns {void}
	 */
	importTypeClause() {
		const t = this.t;
		if (t.type === tt.braceL) {
			this.balanced();
		} else if (t.type === tt.star) {
			t.next();
			if (!this.isWord("as")) throw NOT_A_TYPE;
			t.next();
			t.next();
		} else if (t.type === tt.name) {
			t.next();
			if (t.type === tt.eq) {
				t.next();
				if (this.isWord("require")) {
					t.next();
					this.balanced();
				} else {
					this.entityName();
				}
				this.semicolon();
				return;
			}
			if (t.type === tt.comma) {
				t.next();
				if (t.type === tt.braceL) {
					this.balanced();
				} else {
					this.expect(tt.star);
					t.next();
					t.next();
				}
			}
		} else {
			throw NOT_A_TYPE;
		}
		if (!this.isWord("from")) throw NOT_A_TYPE;
		t.next();
		this.moduleSource();
		this.semicolon();
	}

	/**
	 * A class member only types make up: `declare` or `abstract` members,
	 * index signatures and methods without a body.
	 * @param {number} pos where the member starts
	 * @returns {number} where it ends with its semicolon, or -1 where it is JavaScript
	 */
	typeOnlyClassMember(pos) {
		return this.run(pos, function typeOnlyClassMember() {
			const t = this.t;
			let ambient = false;
			let abstract = false;
			let isStatic = false;
			while (
				t.type === tt.name &&
				MEMBER_MODIFIERS.has(/** @type {string} */ (t.value))
			) {
				const mark = this.mark();
				const word = t.value;
				const wordStart = t.start;
				t.next();
				if (!this.canFollowModifier()) {
					this.reset(mark);
					break;
				}
				if (word === "declare") {
					ambient = true;
				} else if (word === "abstract") {
					ambient = abstract = true;
				} else if (word === "static") {
					isStatic = true;
				} else if (
					isStatic &&
					ACCESSIBILITY.has(/** @type {string} */ (word))
				) {
					throw new TypeScriptSyntaxError(
						wordStart,
						`'${word}' modifier must precede 'static' modifier`,
						false
					);
				} else if (word === "override" && !this.derivedClass) {
					throw new TypeScriptSyntaxError(
						wordStart,
						"This member cannot have an 'override' modifier because its containing class does not extend another class",
						false
					);
				}
			}
			if (abstract && !this.abstractClass) {
				throw new TypeScriptSyntaxError(
					pos,
					"Abstract methods can only appear within an abstract class",
					false
				);
			}
			if (t.type === tt.star) t.next();
			if (t.type === tt.bracketL) {
				if (this.indexSignature()) {
					this.semicolon();
					return t.lastTokEnd;
				}
				this.balanced();
			} else if (
				this.isAnyWord() ||
				t.type === tt.string ||
				t.type === tt.num ||
				t.type === tt.privateId
			) {
				t.next();
			} else {
				return -1;
			}
			if (t.type === tt.question) t.next();
			else if (t.type === tt.prefix && t.value === "!") t.next();
			if (this.isLessThan() || t.type === tt.parenL) {
				if (this.isLessThan()) this.typeParameters();
				if (t.type !== tt.parenL) return -1;
				this.balanced();
				if (t.type === tt.colon) {
					t.next();
					this.returnType();
				}
				if (t.type === tt.braceL) {
					if (!ambient) return -1;
					this.balanced();
				}
				this.semicolon();
				return t.lastTokEnd;
			}
			if (!ambient) return -1;
			if (t.type === tt.colon) {
				t.next();
				this.type(false);
			}
			if (t.type === tt.eq && abstract) {
				throw new TypeScriptSyntaxError(
					pos,
					"Abstract property cannot have an initializer",
					false
				);
			}
			if (t.type === tt.eq) {
				t.next();
				this.expressionTokens();
			}
			this.semicolon();
			return t.lastTokEnd;
		});
	}

	/**
	 * An inline `type` import or export specifier, `type A as B`, with the
	 * comma after it.
	 * @param {number} pos where `type` is
	 * @returns {number} where it ends, or -1 where `type` is the name
	 */
	typeSpecifier(pos) {
		return this.run(pos, function typeSpecifier() {
			const t = this.t;
			t.next();
			if (!this.isAnyWord() && t.type !== tt.string) return -1;
			if (this.isWord("as")) {
				// `type as x` imports `type` as `x`; `type as` and `type as as x`
				// import `as` as a type
				const mark = this.mark();
				t.next();
				const typeOnly =
					this.isWord("as") || t.type === tt.comma || t.type === tt.braceR;
				this.reset(mark);
				if (!typeOnly) return -1;
			}
			t.next();
			if (this.isWord("as")) {
				t.next();
				if (!this.isAnyWord() && t.type !== tt.string) throw NOT_A_TYPE;
				t.next();
			}
			if (t.type === tt.comma) t.next();
			else if (t.type !== tt.braceR) throw NOT_A_TYPE;
			return t.lastTokEnd;
		});
	}
}

module.exports.TypeScanner = TypeScanner;
module.exports.TypeScriptSyntaxError = TypeScriptSyntaxError;
