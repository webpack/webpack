/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { Parser: AcornParser, tokTypes } = require("acorn");
// acorn exports its keyword→TokenType map but leaves it out of its public
// types; used by the word-classification lookups below.
const keywordTypes =
	/** @type {Record<string, TokenType>} */
	(
		/** @type {{ keywordTypes: Record<string, TokenType> }} */
		(/** @type {unknown} */ (require("acorn"))).keywordTypes
	);

/** @typedef {import("acorn").Options} AcornOptions */
/** @typedef {import("acorn").Position} AcornPosition */
/** @typedef {import("acorn").Node} AcornNode */
/** @typedef {import("acorn").Identifier} AcornIdentifier */
/** @typedef {import("acorn").ImportAttribute} AcornImportAttribute */
/** @typedef {import("acorn").ImportDefaultSpecifier} AcornImportDefaultSpecifier */
/** @typedef {import("acorn").ImportExpression} AcornImportExpression */
/** @typedef {import("acorn").Expression} AcornExpression */
/** @typedef {import("acorn").ImportSpecifier | import("acorn").ImportDefaultSpecifier | import("acorn").ImportNamespaceSpecifier} AcornAnyImportSpecifier */
/** @typedef {import("acorn").TokenType} TokenType */
/** @typedef {import("estree").SourceLocation} SourceLocation */
/** @typedef {[number, number]} Range */
/** @typedef {"defer" | "source"} ImportPhase */
/** @typedef {{ position: (offset: number) => AcornPosition }} LazySourcePositions offset to line/column mapper */
/** @typedef {import("estree").Comment & { start: number, end: number, loc: SourceLocation }} CollectedComment comment as JavascriptParser exposes it */

// Mirrors acorn's `lineBreak` regexp, which its types don't export.
const LINE_BREAK_G = /\r\n?|\n|\u2028|\u2029/g;

// Symbol-keyed so they stay out of for-in, Object.keys and JSON.stringify
// over AST nodes.
const kSourcePositions = Symbol("source positions");
const kLoc = Symbol("loc");
const kRange = Symbol("range");
const kText = Symbol("text");
const kTextStart = Symbol("text start");

// Marks import attributes parsed from the legacy `assert {...}` syntax.
const LEGACY_ASSERT_ATTRIBUTES = Symbol("assert");

// acorn's binding types and scope flags, stable across acorn 8
const BIND_LEXICAL = 2;
const SCOPE_TOP = 1;
const SCOPE_SIMPLE_CATCH = 32;
// SCOPE_TOP | SCOPE_FUNCTION | SCOPE_CLASS_STATIC_BLOCK
const SCOPE_VAR = 0b100000011;

/**
 * Offset → line/column mapping for one parsed file. The line-start table is
 * built only when some node's `loc` is first read.
 */
class SourcePositions {
	/**
	 * @param {string} source source code
	 */
	constructor(source) {
		this.source = source;
		/** @type {number[] | undefined} */
		this.lineStarts = undefined;
	}

	/**
	 * @returns {number[]} offset of each line's first character
	 */
	_buildLineStarts() {
		const lineStarts = [0];
		LINE_BREAK_G.lastIndex = 0;
		let match;
		while ((match = LINE_BREAK_G.exec(this.source)) !== null) {
			lineStarts.push(match.index + match[0].length);
		}
		return (this.lineStarts = lineStarts);
	}

	/**
	 * @param {number} offset source offset
	 * @returns {AcornPosition} position (1-based line, 0-based column)
	 */
	position(offset) {
		const lineStarts = this.lineStarts || this._buildLineStarts();
		// binary search for the line containing offset
		let lo = 0;
		let hi = lineStarts.length - 1;
		while (lo < hi) {
			const mid = (lo + hi + 1) >>> 1;
			if (lineStarts[mid] <= offset) lo = mid;
			else hi = mid - 1;
		}
		return { line: lo + 1, column: offset - lineStarts[lo] };
	}
}

// ASCII identifier-continuation chars ($ 0-9 A-Z _ a-z); css/html-style
// Uint8Array table so the tokenizer fast path is one load per char
const IDENT_CHAR = new Uint8Array(128);
IDENT_CHAR[36] = 1;
IDENT_CHAR[95] = 1;
for (let i = 48; i <= 57; i++) IDENT_CHAR[i] = 1;
for (let i = 65; i <= 90; i++) IDENT_CHAR[i] = 1;
for (let i = 97; i <= 122; i++) IDENT_CHAR[i] = 1;

// ASCII identifier-start chars (IDENT_CHAR minus 0-9), for token dispatch in
// the owned `nextToken` loop.
const IDENT_START = new Uint8Array(128);
IDENT_START[36] = 1;
IDENT_START[95] = 1;
for (let i = 65; i <= 90; i++) IDENT_START[i] = 1;
for (let i = 97; i <= 122; i++) IDENT_START[i] = 1;

/**
 * Drop-in replacement for acorn's `Node` that materializes `loc` and `range`
 * on first access instead of allocating them during parsing. Most nodes never
 * get either read, which saves three objects and an array per node.
 */
class LazyLocNode {
	/**
	 * Only constructed when the parser runs in lazy mode, so the positions
	 * mapping is always present.
	 * @param {{ [kSourcePositions]?: SourcePositions }} parser parser instance
	 * @param {number} pos start offset
	 */
	constructor(parser, pos) {
		this.type = "";
		this.start = pos;
		this.end = 0;
		this[kSourcePositions] =
			/** @type {SourcePositions} */
			(parser[kSourcePositions]);
	}

	/**
	 * Memoized in a symbol slot — a plain store is far cheaper than making the
	 * property own via defineProperty, and the slot stays invisible to for-in,
	 * Object.keys and JSON.stringify.
	 * @returns {SourceLocation} source location
	 */
	get loc() {
		const cached = this[kLoc];
		if (cached !== undefined) return cached;
		const positions = this[kSourcePositions];
		const loc = {
			start: positions.position(this.start),
			end: positions.position(this.end)
		};
		// acorn reads `.loc.start` of still-unfinished nodes (import.meta /
		// new.target), so only cache when `end` has been set by finishNode
		if (this.end > 0) this[kLoc] = loc;
		return loc;
	}

	/**
	 * @param {SourceLocation} value source location
	 */
	set loc(value) {
		this[kLoc] = value;
	}

	/**
	 * @returns {Range} source range
	 */
	get range() {
		const cached = this[kRange];
		if (cached !== undefined) return cached;
		/** @type {Range} */
		const range = [this.start, this.end];
		if (this.end > 0) this[kRange] = range;
		return range;
	}

	/**
	 * @param {Range} value source range
	 */
	set range(value) {
		this[kRange] = value;
	}
}

/**
 * Comment collected without slicing its text out of the source: only magic
 * comments and pure annotations ever get their text read, so the slice is
 * deferred to the first `value` access and memoized like `loc`.
 */
class LazyComment {
	/**
	 * @param {boolean} block whether this is a block comment
	 * @param {number} textStart offset right after the comment opener
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {SourcePositions} sourcePositions offset → position mapping
	 */
	constructor(block, textStart, start, end, sourcePositions) {
		/** @type {"Block" | "Line"} */
		this.type = block ? "Block" : "Line";
		this.start = start;
		this.end = end;
		/** @type {Range} */
		this.range = [start, end];
		this[kSourcePositions] = sourcePositions;
		this[kTextStart] = textStart;
	}

	/**
	 * @returns {string} comment text without the delimiters
	 */
	get value() {
		const cached = this[kText];
		if (cached !== undefined) return cached;
		return (this[kText] = this[kSourcePositions].source.slice(
			this[kTextStart],
			this.type === "Block" ? this.end - 2 : this.end
		));
	}

	/**
	 * @param {string} value comment text
	 */
	set value(value) {
		this[kText] = value;
	}

	/**
	 * @returns {SourceLocation} source location
	 */
	get loc() {
		const cached = this[kLoc];
		if (cached !== undefined) return cached;
		const positions = this[kSourcePositions];
		return (this[kLoc] = {
			start: positions.position(this.start),
			end: positions.position(this.end)
		});
	}

	/**
	 * @param {SourceLocation} value source location
	 */
	set loc(value) {
		this[kLoc] = value;
	}
}

/**
 * Replaces acorn's array-backed `Scope`: membership checks in `declareName`
 * are `indexOf` there, which goes quadratic on files with thousands of
 * bindings per scope (bundled or minified inputs). The three Sets are
 * allocated lazily — most scopes declare into only one (module `functions` is
 * always empty), so ~⅔ of the Sets are never needed.
 */
class Scope {
	/**
	 * @param {number} flags scope flags
	 */
	constructor(flags) {
		this.flags = flags;
		/** @type {Set<string> | undefined} */
		this.var = undefined;
		/** @type {Set<string> | undefined} */
		this.lexical = undefined;
		/** @type {Set<string> | undefined} */
		this.functions = undefined;
		// first lexically-declared name; stands in for acorn's `lexical[0]`
		// (the catch parameter of a simple catch scope)
		/** @type {string | undefined} */
		this.firstLexical = undefined;
	}
}

/**
 * Acorn's methods and state used by `WebpackParser` but missing from its
 * public types, plus `WebpackParser`'s own fields, so overridden methods can
 * declare `this` precisely.
 * @typedef {import("acorn").Parser & {
 * type: TokenType,
 * value: unknown,
 * start: number,
 * startLoc?: AcornPosition,
 * containsEsc: boolean,
 * options: AcornOptions,
 * end: number,
 * lastTokEnd: number,
 * canInsertSemicolon: () => boolean,
 * next: () => void,
 * eat: (type: TokenType) => boolean,
 * expect: (type: TokenType) => void,
 * afterTrailingComma: (type: TokenType, notNext?: boolean) => boolean,
 * unexpected: (pos?: number) => never,
 * raise: (pos: number, message: string) => never,
 * raiseRecoverable: (pos: number, message: string) => void,
 * isContextual: (name: string) => boolean,
 * parseIdent: (liberal?: boolean) => AcornIdentifier,
 * checkLValSimple: (expr: AcornNode, bindingType?: number) => void,
 * startNode: () => AcornNode,
 * startNodeAt: (pos: number, loc?: AcornPosition) => AcornNode,
 * finishNode: (node: AcornNode, type: string) => AcornNode,
 * readWord1: () => string,
 * readWord: () => void,
 * readToken: (code: number) => void,
 * getTokenFromCode: (code: number) => void,
 * fullCharCodeAtPos: () => number,
 * skipSpace: () => void,
 * skipLineComment: (startSkip: number) => void,
 * skipBlockComment: () => void,
 * readString: (quote: number) => void,
 * readNumber: (startsWithDot: boolean) => void,
 * readTmplToken: () => void,
 * finishToken: (type: TokenType, value?: unknown) => void,
 * context: { preserveSpace?: boolean, override?: unknown }[],
 * pos: number,
 * input: string,
 * scopeStack: Scope[],
 * currentScope: () => Scope,
 * currentThisScope: () => Scope,
 * keywords: RegExp,
 * reservedWords: RegExp,
 * reservedWordsStrict: RegExp,
 * strict: boolean,
 * inGenerator: boolean,
 * inAsync: boolean,
 * inClassStaticBlock: boolean,
 * _wordLookups: WordLookups,
 * treatFunctionsAsVar: boolean,
 * treatFunctionsAsVarInScope: (scope: Scope) => boolean,
 * inModule: boolean,
 * undefinedExports: Record<string, AcornNode>,
 * parseImport: (node: AcornNode) => AcornNode,
 * parseImportSpecifiers: () => AcornAnyImportSpecifier[],
 * parseImportAttribute: () => AcornImportAttribute,
 * parseExprImport: (forNew: boolean) => AcornExpression,
 * parseImportMeta: (node: AcornNode) => AcornExpression,
 * parseDynamicImport: (node: AcornNode) => AcornExpression,
 * [kSourcePositions]?: SourcePositions,
 * _importPhase: ImportPhase | null,
 * _importPhasesEnabled: boolean,
 * _lazyComments: CollectedComment[] | undefined,
 * }} ParserInternals
 */

// internal methods are absent from acorn's types, so super calls do not
// type-check; call through a typed view of the base prototype instead
const base = /** @type {ParserInternals} */ (
	/** @type {unknown} */ (AcornParser.prototype)
);

/**
 * Reserved-word classification for `checkUnreserved`'s single lookup:
 * `1` keyword, `2` reserved in sloppy and strict mode, `3` reserved in strict
 * mode only.
 * @typedef {1 | 2 | 3} ReservedKind
 */

/**
 * @typedef {object} WordLookups
 * @property {Map<string, TokenType>} keywords keyword name → token type
 * @property {Map<string, ReservedKind>} reservedKinds identifier name → reserved kind
 */

// One entry per distinct keyword/reserved-word set; webpack parses with a
// single option set, making this effectively a one-time build shared across
// every parse.
/** @type {Map<string, WordLookups>} */
const wordLookupsCache = new Map();

/**
 * @param {RegExp} re acorn `wordsRegexp` output (`^(?:a|b|c)$`)
 * @returns {Set<string>} the alternation's words
 */
const wordsRegexpToSet = (re) => {
	const match = /^\^\(\?:(.*)\)\$$/.exec(re.source);
	const body = match ? match[1] : "";
	return new Set(body ? body.split("|") : []);
};

/**
 * Mirrors acorn's `keywords` / `reservedWords` / `reservedWordsStrict` regexps
 * as Map/Set lookups. Membership is the hot per-word test in `readWord` and
 * `checkUnreserved`, and a hash lookup beats an anchored alternation regexp.
 * @param {ParserInternals} parser parser instance
 * @returns {WordLookups} lookups for this parser's keyword set
 */
const getWordLookups = (parser) => {
	// module vs script share a keyword set but differ in reserved words, so the
	// key must cover all three regexps
	const key = `${parser.keywords.source}\n${parser.reservedWords.source}\n${parser.reservedWordsStrict.source}`;
	const cached = wordLookupsCache.get(key);
	if (cached !== undefined) return cached;
	/** @type {Map<string, TokenType>} */
	const keywords = new Map();
	// acorn's keyword regexp is a subset of keywordTypes for the ecmaVersion
	for (const name of Object.keys(keywordTypes)) {
		if (parser.keywords.test(name)) keywords.set(name, keywordTypes[name]);
	}
	const reserved = wordsRegexpToSet(parser.reservedWords);
	/** @type {Map<string, ReservedKind>} */
	const reservedKinds = new Map();
	for (const name of reserved) reservedKinds.set(name, 2);
	for (const name of wordsRegexpToSet(parser.reservedWordsStrict)) {
		if (!reserved.has(name)) reservedKinds.set(name, 3);
	}
	// keyword classification wins, matching acorn's keyword-first check
	for (const name of keywords.keys()) reservedKinds.set(name, 1);
	/** @type {WordLookups} */
	const lookups = { keywords, reservedKinds };
	wordLookupsCache.set(key, lookups);
	return lookups;
};

/**
 * webpack's parser: acorn plus lazy `loc`/`range`, Set-based scopes,
 * tokenizer fast paths, import attributes and import phases (with acorn's
 * `!forNew` guard, unlike the former `acorn-import-phases` package).
 */
class WebpackParser extends AcornParser {
	/**
	 * @param {AcornOptions & { lazySourcePositions?: LazySourcePositions, lazyComments?: CollectedComment[], importPhases?: boolean }} options options
	 * @param {string} input source code
	 * @param {number=} startPos start position
	 */
	constructor(options, input, startPos) {
		const sourcePositions = options.lazySourcePositions;
		// JavascriptParser._parse pre-disables acorn's tracking, so the
		// defensive copy only runs for direct callers
		if (sourcePositions && (options.locations || options.ranges)) {
			options = { ...options, locations: false, ranges: false };
		}
		super(options, input, startPos);
		// acorn sets this.keywords/reservedWords in its constructor; parsing
		// (and thus readWord) only starts later in parse(), so this is ready
		this._wordLookups = getWordLookups(
			/** @type {ParserInternals} */ (/** @type {unknown} */ (this))
		);
		this[kSourcePositions] = sourcePositions;
		// lazy comment collection needs the source held by sourcePositions and
		// must not race a user-provided onComment
		/** @type {CollectedComment[] | undefined} */
		this._lazyComments =
			sourcePositions && !options.onComment ? options.lazyComments : undefined;
		// acorn skips a hashbang inside its constructor, before `_lazyComments`
		// above exists — reconstruct the comment the override missed
		if (
			this._lazyComments !== undefined &&
			!startPos &&
			this.options.allowHashBang &&
			input.startsWith("#!")
		) {
			this._lazyComments.push(
				new LazyComment(
					false,
					2,
					0,
					/** @type {ParserInternals} */ (/** @type {unknown} */ (this)).pos,
					/** @type {SourcePositions} */ (sourcePositions)
				)
			);
		}
		/** @type {ImportPhase | null} */
		this._importPhase = null;
		this._importPhasesEnabled = options.importPhases === true;
	}

	// ----- tokenizer fast paths -----

	/**
	 * Owned per-token loop: acorn's `nextToken` chains `skipSpace` →
	 * `fullCharCodeAtPos` → `readToken` → `isIdentifierStart` with a dead
	 * `locations` check at each step. For the common lazy, non-template context
	 * this inlines whitespace and comment skipping and the ASCII token dispatch
	 * into one function so nothing re-enters acorn's per-step option checks.
	 * Template/`preserveSpace` contexts and non-lazy mode use acorn's tokenizer.
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	nextToken() {
		const context = this.context;
		const curContext = context[context.length - 1];
		if (
			!this[kSourcePositions] ||
			!curContext ||
			curContext.preserveSpace ||
			curContext.override
		) {
			return base.nextToken.call(this);
		}
		const input = this.input;
		const len = input.length;
		let pos = this.pos;
		while (pos < len) {
			const ch = input.charCodeAt(pos);
			if (ch === 32 || (ch > 8 && ch < 14)) {
				// space, tab, LF, VT, FF, CR (no CRLF/line bookkeeping in lazy mode)
				pos++;
			} else if (ch === 47) {
				const next = input.charCodeAt(pos + 1);
				if (next === 42) {
					this.pos = pos;
					this.skipBlockComment();
					pos = this.pos;
				} else if (next === 47) {
					this.pos = pos;
					this.skipLineComment(2);
					pos = this.pos;
				} else {
					break;
				}
			} else if (ch > 127) {
				// unicode whitespace / line terminators: acorn consumes the rest
				this.pos = pos;
				base.skipSpace.call(this);
				pos = this.pos;
				break;
			} else {
				break;
			}
		}
		this.pos = pos;
		this.start = pos;
		if (pos >= len) return this.finishToken(tokTypes.eof);
		const code = input.charCodeAt(pos);
		if (code < 128) {
			// backslash starts a `\uXXXX` identifier escape
			if (IDENT_START[code] === 1 || code === 92) return this.readWord();
			return this.getTokenFromCode(code);
		}
		return this.readToken(this.fullCharCodeAtPos());
	}

	/**
	 * ASCII fast path for acorn's `readWord1`, which pays a surrogate-aware
	 * method call and a range-check helper per character. Escapes, non-ASCII
	 * and astral input restart the base implementation from the word start.
	 * @this {ParserInternals}
	 * @returns {string} the word
	 */
	readWord1() {
		const input = this.input;
		const start = this.pos;
		const len = input.length;
		let pos = start;
		while (pos < len) {
			const ch = input.charCodeAt(pos);
			if (ch < 128) {
				if (IDENT_CHAR[ch] === 0) {
					// backslash escape: restart cold so escape rules see the word
					if (ch === 92) return base.readWord1.call(this);
					break;
				}
				pos++;
			} else {
				return base.readWord1.call(this);
			}
		}
		this.containsEsc = false;
		this.pos = pos;
		return input.slice(start, pos);
	}

	/**
	 * String fast path: one SIMD `indexOf` for the closing quote plus a
	 * three-compare verification loop. Escapes, newlines in the span, old
	 * ecmaVersions and location tracking restart acorn's implementation,
	 * which also produces its exact errors.
	 * @this {ParserInternals}
	 * @param {number} quote quote char code
	 * @returns {void}
	 */
	readString(quote) {
		if (
			this.options.locations ||
			/** @type {number} */ (this.options.ecmaVersion) < 10
		) {
			return base.readString.call(this, quote);
		}
		const input = this.input;
		const pos = this.pos + 1;
		const end = input.indexOf(quote === 34 ? '"' : "'", pos);
		if (end === -1) this.raise(this.start, "Unterminated string constant");
		for (let i = pos; i < end; i++) {
			const ch = input.charCodeAt(i);
			// backslash, LF, CR
			if (ch === 92 || ch === 10 || ch === 13) {
				return base.readString.call(this, quote);
			}
		}
		this.pos = end + 1;
		this.finishToken(tokTypes.string, input.slice(pos, end));
	}

	/**
	 * Number fast path: plain integer literals (no leading zero, up to 15
	 * digits so the float is exact) are accumulated numerically — no slice,
	 * no parseFloat, no separator handling. Everything else (dots, exponents,
	 * bigints, separators, octal forms) restarts acorn's implementation.
	 * @this {ParserInternals}
	 * @param {boolean} startsWithDot whether the number started with a dot
	 * @returns {void}
	 */
	readNumber(startsWithDot) {
		if (startsWithDot) return base.readNumber.call(this, startsWithDot);
		const input = this.input;
		const start = this.pos;
		const len = input.length;
		const first = input.charCodeAt(start);
		let pos;
		if (first === 48) {
			const c1 = start + 1 < len ? input.charCodeAt(start + 1) : 0;
			if (c1 === 46) {
				// `0.<digits>`
				pos = start + 1;
			} else if (c1 > 127 || IDENT_CHAR[c1] === 1) {
				// 0x/0o/0b, 0e…, 0n, 0_, legacy `0NN`, or `0`+identifier: acorn
				return base.readNumber.call(this, startsWithDot);
			} else {
				// bare `0` before punctuation/operator/whitespace/EOF
				this.pos = start + 1;
				return this.finishToken(tokTypes.num, 0);
			}
		} else if (first > 48 && first <= 57) {
			// integer digits, accumulated numerically for the integer-only case
			let value = first - 48;
			pos = start + 1;
			while (pos < len) {
				const ch = input.charCodeAt(pos);
				if (ch >= 48 && ch <= 57) {
					value = value * 10 + (ch - 48);
					pos++;
				} else {
					break;
				}
			}
			const after = pos < len ? input.charCodeAt(pos) : 0;
			if (after !== 46) {
				// no fraction: exponent, separator, bigint suffix or a trailing
				// identifier char all need acorn's full handling and exact errors
				if (
					after === 101 ||
					after === 69 ||
					after === 95 ||
					after === 110 ||
					after > 127 ||
					IDENT_CHAR[after] === 1
				) {
					return base.readNumber.call(this, startsWithDot);
				}
				// 15 digits always fit exactly into a double
				if (pos - start > 15) {
					return base.readNumber.call(this, startsWithDot);
				}
				this.pos = pos;
				return this.finishToken(tokTypes.num, value);
			}
			// a fraction follows the integer part
		} else {
			return base.readNumber.call(this, startsWithDot);
		}
		// decimal fraction: `pos` is at the '.'
		pos++;
		while (pos < len) {
			const ch = input.charCodeAt(pos);
			if (ch >= 48 && ch <= 57) pos++;
			else break;
		}
		const after = pos < len ? input.charCodeAt(pos) : 0;
		// exponent, a second dot, separator, bigint suffix or trailing identifier
		if (
			after === 46 ||
			after === 101 ||
			after === 69 ||
			after === 95 ||
			after === 110 ||
			after > 127 ||
			IDENT_CHAR[after] === 1
		) {
			return base.readNumber.call(this, startsWithDot);
		}
		this.pos = pos;
		this.finishToken(tokTypes.num, parseFloat(input.slice(start, pos)));
	}

	/**
	 * Template fast path: when the chunk contains no backslash and no CR, the
	 * cooked value is one slice (LF/LS/PS cook to themselves). Escapes, CR
	 * normalization and location tracking restart acorn's implementation,
	 * which also produces its exact errors.
	 * @this {ParserInternals}
	 * @returns {void}
	 */
	readTmplToken() {
		if (this.options.locations) return base.readTmplToken.call(this);
		const input = this.input;
		const start = this.pos;
		const len = input.length;
		let pos = start;
		while (pos < len) {
			const ch = input.charCodeAt(pos);
			if (ch === 96 || (ch === 36 && input.charCodeAt(pos + 1) === 123)) {
				if (
					pos === this.start &&
					(this.type === tokTypes.template ||
						this.type === tokTypes.invalidTemplate)
				) {
					if (ch === 36) {
						this.pos = pos + 2;
						return this.finishToken(tokTypes.dollarBraceL);
					}
					this.pos = pos + 1;
					return this.finishToken(tokTypes.backQuote);
				}
				this.pos = pos;
				return this.finishToken(tokTypes.template, input.slice(start, pos));
			}
			// backslash and CR need acorn's cooked-string building
			if (ch === 92 || ch === 13) {
				return base.readTmplToken.call(this);
			}
			pos++;
		}
		this.raise(this.start, "Unterminated template");
	}

	/**
	 * Fast path for the common run of plain ASCII whitespace; comments,
	 * unicode whitespace and location tracking delegate to acorn.
	 * @this {ParserInternals & { pos: number }}
	 * @returns {void}
	 */
	skipSpace() {
		if (this.options.locations) return base.skipSpace.call(this);
		const input = this.input;
		const len = input.length;
		let pos = this.pos;
		while (pos < len) {
			const ch = input.charCodeAt(pos);
			// 9-13 and 32 cover tab, LF, VT, FF, CR and space
			if (ch === 32 || (ch > 8 && ch < 14)) {
				pos++;
			} else if (ch === 47 || ch > 127) {
				// comments or unicode whitespace: let acorn handle the rest
				this.pos = pos;
				return base.skipSpace.call(this);
			} else {
				break;
			}
		}
		this.pos = pos;
	}

	// ----- word classification (Map/Set lookups, replaces acorn's regexps) -----

	/**
	 * Replaces acorn's `readWord`, whose `this.keywords.test(word)` runs an
	 * anchored alternation regexp for every identifier and keyword token; a
	 * Map lookup on the same keyword set is cheaper.
	 * @this {ParserInternals}
	 * @returns {void}
	 */
	readWord() {
		const word = this.readWord1();
		const type = this._wordLookups.keywords.get(word) || tokTypes.name;
		this.finishToken(type, word);
	}

	/**
	 * Mirror of acorn's `checkUnreserved` with its two per-identifier regexp
	 * tests (`keywords` and `reservedWords`/`reservedWordsStrict`) folded into a
	 * single `reservedKinds` lookup — one hash probe instead of two, and the
	 * common plain identifier misses it and returns. Branches and error
	 * messages match acorn exactly.
	 * @param {AcornIdentifier} ref identifier node
	 * @this {ParserInternals}
	 */
	checkUnreserved(ref) {
		const { start, end, name } = ref;
		// name-first ordering: acorn's `inGenerator`/`inAsync` are getters that
		// walk the scope stack, so gate them behind the cheap string compare —
		// a plain identifier never triggers them
		if (name === "yield") {
			if (this.inGenerator) {
				this.raiseRecoverable(
					start,
					"Cannot use 'yield' as identifier inside a generator"
				);
			}
		} else if (name === "await") {
			if (this.inAsync) {
				this.raiseRecoverable(
					start,
					"Cannot use 'await' as identifier inside an async function"
				);
			}
		}
		if (name === "arguments") {
			if (!(this.currentThisScope().flags & SCOPE_VAR)) {
				this.raiseRecoverable(
					start,
					"Cannot use 'arguments' in class field initializer"
				);
			}
		}
		if (
			(name === "arguments" || name === "await") &&
			this.inClassStaticBlock
		) {
			this.raise(
				start,
				`Cannot use ${name} in class static initialization block`
			);
		}
		const kind = this._wordLookups.reservedKinds.get(name);
		if (kind === undefined) return;
		if (kind === 1) {
			this.raise(start, `Unexpected keyword '${name}'`);
		}
		if (
			/** @type {number} */ (this.options.ecmaVersion) < 6 &&
			this.input.slice(start, end).indexOf("\\") !== -1
		) {
			return;
		}
		if (kind === 2 || (kind === 3 && this.strict)) {
			if (name === "await" && !this.inAsync) {
				this.raiseRecoverable(
					start,
					"Cannot use keyword 'await' outside an async function"
				);
			}
			this.raiseRecoverable(start, `The keyword '${name}' is reserved`);
		}
	}

	/**
	 * Replaces acorn's `canInsertSemicolon`, whose line-break check slices the
	 * inter-token gap and runs a regexp on it for every ASI decision (hundreds
	 * of thousands per file). Scan the gap for a line terminator instead — no
	 * slice, no regexp.
	 * @returns {boolean} whether a semicolon may be inserted here
	 * @this {ParserInternals}
	 */
	canInsertSemicolon() {
		if (this.type === tokTypes.eof || this.type === tokTypes.braceR) {
			return true;
		}
		const input = this.input;
		const end = this.start;
		for (let i = this.lastTokEnd; i < end; i++) {
			const ch = input.charCodeAt(i);
			// LF, CR, LS, PS — acorn's `lineBreak` alternation
			if (ch === 10 || ch === 13 || ch === 0x2028 || ch === 0x2029) {
				return true;
			}
		}
		return false;
	}

	// ----- comment collection without eager text slicing -----

	/**
	 * Replaces acorn's `skipLineComment` when comments are collected lazily:
	 * the same scan, but no text slice and no position objects. Acorn calls
	 * this for `//`, hashbangs and HTML-style comments (varying `startSkip`).
	 * @this {ParserInternals}
	 * @param {number} startSkip length of the comment opener
	 * @returns {void}
	 */
	skipLineComment(startSkip) {
		const comments = this._lazyComments;
		if (comments === undefined) {
			return base.skipLineComment.call(this, startSkip);
		}
		const input = this.input;
		const start = this.pos;
		const len = input.length;
		let pos = start + startSkip;
		while (pos < len) {
			const ch = input.charCodeAt(pos);
			// LF, CR, LS, PS terminate the comment but are not part of it
			if (ch === 10 || ch === 13 || ch === 0x2028 || ch === 0x2029) break;
			pos++;
		}
		this.pos = pos;
		comments.push(
			new LazyComment(
				false,
				start + startSkip,
				start,
				pos,
				/** @type {SourcePositions} */ (this[kSourcePositions])
			)
		);
	}

	/**
	 * Replaces acorn's `skipBlockComment` when comments are collected lazily.
	 * Locations are always off in lazy mode, so line breaks need no handling.
	 * @this {ParserInternals}
	 * @returns {void}
	 */
	skipBlockComment() {
		const comments = this._lazyComments;
		if (comments === undefined) {
			return base.skipBlockComment.call(this);
		}
		const start = this.pos;
		const end = this.input.indexOf("*/", (this.pos += 2));
		if (end === -1) this.raise(this.pos - 2, "Unterminated comment");
		this.pos = end + 2;
		comments.push(
			new LazyComment(
				true,
				start + 2,
				start,
				this.pos,
				/** @type {SourcePositions} */ (this[kSourcePositions])
			)
		);
	}

	// ----- lazy loc/range -----

	/**
	 * @returns {AcornNode} new node
	 * @this {ParserInternals}
	 */
	startNode() {
		if (!this[kSourcePositions]) return base.startNode.call(this);
		return new LazyLocNode(this, this.start);
	}

	/**
	 * @param {number} pos start offset
	 * @param {AcornPosition=} loc start position when acorn tracks locations
	 * @returns {AcornNode} new node
	 * @this {ParserInternals}
	 */
	startNodeAt(pos, loc) {
		if (!this[kSourcePositions]) return base.startNodeAt.call(this, pos, loc);
		return new LazyLocNode(this, pos);
	}

	/**
	 * Lazy-mode `finishNode`: acorn's `locations`/`ranges` writes are dead when
	 * loc/range are served lazily, so skip them and the `finishNodeAt`
	 * indirection. Runs once per node.
	 * @param {AcornNode} node node to finish
	 * @param {string} type node type
	 * @returns {AcornNode} the finished node
	 * @this {ParserInternals}
	 */
	finishNode(node, type) {
		if (!this[kSourcePositions]) return base.finishNode.call(this, node, type);
		node.type = type;
		node.end = this.lastTokEnd;
		return node;
	}

	/**
	 * Mirror of acorn's `copyNode`, which bypasses `startNodeAt` via
	 * `new Node(...)` and would otherwise produce non-lazy nodes.
	 * @param {AcornNode} node node to copy
	 * @returns {AcornNode} copied node
	 * @this {ParserInternals}
	 */
	copyNode(node) {
		const newNode = this.startNodeAt(node.start, this.startLoc);
		const from = /** @type {Record<string, unknown>} */ (
			/** @type {unknown} */ (node)
		);
		const to = /** @type {Record<string, unknown>} */ (
			/** @type {unknown} */ (newNode)
		);
		for (const prop in from) to[prop] = from[prop];
		return newNode;
	}

	/**
	 * Single-construction regexp literals: acorn validates the pattern and
	 * then builds the value with a second `new RegExp`. This override scans
	 * like acorn, keeps acorn's flag validation (for its exact messages) and
	 * lets one `new RegExp` be both the V8-backed validation and the value.
	 * @this {ParserInternals & { regexpState: unknown }}
	 * @returns {void}
	 */
	readRegexp() {
		const input = this.input;
		const start = this.pos;
		const len = input.length;
		let escaped = false;
		let inClass = false;
		let pos = start;
		for (;;) {
			if (pos >= len) this.raise(start, "Unterminated regular expression");
			const ch = input.charCodeAt(pos);
			// LF, CR, LS, PS
			if (ch === 10 || ch === 13 || ch === 0x2028 || ch === 0x2029) {
				this.raise(start, "Unterminated regular expression");
			}
			if (escaped) {
				escaped = false;
			} else {
				if (ch === 91) inClass = true;
				else if (ch === 93 && inClass) inClass = false;
				else if (ch === 47 && !inClass) break;
				escaped = ch === 92;
			}
			pos++;
		}
		const pattern = input.slice(start, pos);
		this.pos = pos + 1;
		const flagsStart = this.pos;
		const flags = this.readWord1();
		if (this.containsEsc) this.unexpected(flagsStart);

		// acorn's per-ecmaVersion flag validation, kept for its exact errors
		const ecmaVersion = /** @type {number} */ (this.options.ecmaVersion);
		const validFlags = `gim${ecmaVersion >= 6 ? "uy" : ""}${
			ecmaVersion >= 9 ? "s" : ""
		}${ecmaVersion >= 13 ? "d" : ""}${ecmaVersion >= 15 ? "v" : ""}`;
		let hasU = false;
		let hasV = false;
		for (let i = 0; i < flags.length; i++) {
			const flag = flags.charAt(i);
			if (!validFlags.includes(flag)) {
				this.raise(start, "Invalid regular expression flag");
			}
			if (flags.includes(flag, i + 1)) {
				this.raise(start, "Duplicate regular expression flag");
			}
			if (flag === "u") hasU = true;
			if (flag === "v") hasV = true;
		}
		if (ecmaVersion >= 15 && hasU && hasV) {
			this.raise(start, "Invalid regular expression flag");
		}

		let value = null;
		try {
			value = new RegExp(pattern, flags);
		} catch (err) {
			// V8's verdict on the pattern, like validateRegExpPattern below
			this.raiseRecoverable(start, /** @type {Error} */ (err).message);
		}
		return this.finishToken(tokTypes.regexp, { pattern, flags, value });
	}

	// ----- regexp validation (V8-backed, replaces acorn's JS revalidation) -----

	/**
	 * Acorn constructs the literal's `RegExp` value right after this hook, so
	 * V8 validates every pattern anyway; acorn's own JS copy of
	 * that validation costs several percent of parse time. Raise from V8's
	 * verdict instead — invalid patterns still fail the module build, only
	 * exotic engine-specific message texts may differ.
	 * @param {{ start: number, source: string, flags: string }} state acorn regexp validation state
	 * @this {ParserInternals}
	 */
	validateRegExpPattern(state) {
		try {
			// eslint-disable-next-line no-new
			new RegExp(state.source, state.flags);
		} catch (err) {
			this.raiseRecoverable(state.start, /** @type {Error} */ (err).message);
		}
	}

	// ----- scope tracking (Set-based, replaces acorn's array + indexOf) -----

	/**
	 * @param {number} flags scope flags
	 * @this {ParserInternals}
	 */
	enterScope(flags) {
		this.scopeStack.push(new Scope(flags));
	}

	/**
	 * Set-backed replacement for acorn's `declareName` on Set-backed scopes.
	 * @param {string} name declared name
	 * @param {number} bindingType acorn BIND_* binding type
	 * @param {number} pos source offset for redeclaration errors
	 * @this {ParserInternals}
	 */
	declareName(name, bindingType, pos) {
		let redeclared = false;
		if (bindingType === BIND_LEXICAL) {
			const scope = this.currentScope();
			redeclared =
				(scope.lexical !== undefined && scope.lexical.has(name)) ||
				(scope.functions !== undefined && scope.functions.has(name)) ||
				(scope.var !== undefined && scope.var.has(name));
			if (scope.lexical === undefined) {
				scope.firstLexical = name;
				scope.lexical = new Set();
			}
			scope.lexical.add(name);
			if (this.inModule && scope.flags & SCOPE_TOP) {
				delete this.undefinedExports[name];
			}
		} else if (bindingType === /* BIND_SIMPLE_CATCH */ 4) {
			const scope = this.currentScope();
			if (scope.lexical === undefined) {
				scope.firstLexical = name;
				scope.lexical = new Set();
			}
			scope.lexical.add(name);
		} else if (bindingType === /* BIND_FUNCTION */ 3) {
			const scope = this.currentScope();
			redeclared = this.treatFunctionsAsVar
				? scope.lexical !== undefined && scope.lexical.has(name)
				: (scope.lexical !== undefined && scope.lexical.has(name)) ||
					(scope.var !== undefined && scope.var.has(name));
			(scope.functions || (scope.functions = new Set())).add(name);
		} else {
			for (let i = this.scopeStack.length - 1; i >= 0; --i) {
				const scope = this.scopeStack[i];
				if (
					(scope.lexical !== undefined &&
						scope.lexical.has(name) &&
						!(
							scope.flags & SCOPE_SIMPLE_CATCH && scope.firstLexical === name
						)) ||
					(!this.treatFunctionsAsVarInScope(scope) &&
						scope.functions !== undefined &&
						scope.functions.has(name))
				) {
					redeclared = true;
					break;
				}
				(scope.var || (scope.var = new Set())).add(name);
				if (this.inModule && scope.flags & SCOPE_TOP) {
					delete this.undefinedExports[name];
				}
				if (scope.flags & SCOPE_VAR) break;
			}
		}
		if (redeclared) {
			this.raiseRecoverable(
				pos,
				`Identifier '${name}' has already been declared`
			);
		}
	}

	/**
	 * Set-backed replacement for acorn's `checkLocalExport` on Set-backed scopes.
	 * @param {AcornIdentifier} id exported identifier
	 * @this {ParserInternals}
	 */
	checkLocalExport(id) {
		const topScope = this.scopeStack[0];
		if (
			!(topScope.lexical !== undefined && topScope.lexical.has(id.name)) &&
			!(topScope.var !== undefined && topScope.var.has(id.name))
		) {
			this.undefinedExports[id.name] = id;
		}
	}

	// ----- import attributes (`with { ... }` / legacy `assert { ... }`) -----

	/**
	 * @returns {AcornImportAttribute[]} import attributes
	 * @this {ParserInternals}
	 */
	parseWithClause() {
		/** @type {AcornImportAttribute[] & { [LEGACY_ASSERT_ATTRIBUTES]?: boolean }} */
		const nodes = [];

		const isAssertLegacy = this.value === "assert";

		if (isAssertLegacy) {
			if (!this.eat(tokTypes.name)) {
				return nodes;
			}
		} else if (!this.eat(tokTypes._with)) {
			return nodes;
		}

		this.expect(tokTypes.braceL);

		/** @type {Record<string, boolean>} */
		const attributeKeys = {};
		let first = true;

		while (!this.eat(tokTypes.braceR)) {
			if (!first) {
				this.expect(tokTypes.comma);
				if (this.afterTrailingComma(tokTypes.braceR)) {
					break;
				}
			} else {
				first = false;
			}

			const attr = this.parseImportAttribute();
			const keyName =
				/** @type {string} */
				(attr.key.type === "Identifier" ? attr.key.name : attr.key.value);

			if (Object.prototype.hasOwnProperty.call(attributeKeys, keyName)) {
				this.raiseRecoverable(
					attr.key.start,
					`Duplicate attribute key '${keyName}'`
				);
			}

			attributeKeys[keyName] = true;
			nodes.push(attr);
		}

		if (isAssertLegacy) {
			nodes[LEGACY_ASSERT_ATTRIBUTES] = true;
		}

		return nodes;
	}

	// ----- import phases (`import defer/source`, `import.defer/source()`) -----

	/**
	 * @param {AcornNode & { phase?: ImportPhase }} node import declaration node
	 * @returns {AcornNode} finished node
	 * @this {ParserInternals}
	 */
	parseImport(node) {
		this._importPhase = null;
		const result = base.parseImport.call(this, node);
		if (this._importPhase) node.phase = this._importPhase;
		return result;
	}

	/**
	 * @returns {AcornAnyImportSpecifier[]} import specifiers
	 * @this {ParserInternals}
	 */
	parseImportSpecifiers() {
		if (!this._importPhasesEnabled) {
			return base.parseImportSpecifiers.call(this);
		}

		/** @type {ImportPhase | null} */
		const phase = this.isContextual("defer")
			? "defer"
			: this.isContextual("source")
				? "source"
				: null;
		if (!phase) return base.parseImportSpecifiers.call(this);

		const phaseId = this.parseIdent();
		if (this.isContextual("from") || this.type === tokTypes.comma) {
			// `defer`/`source` was the default import name, not a phase modifier
			const defaultSpecifier =
				/** @type {AcornImportDefaultSpecifier} */
				(
					this.startNodeAt(
						phaseId.start,
						phaseId.loc ? phaseId.loc.start : undefined
					)
				);
			defaultSpecifier.local = phaseId;
			this.checkLValSimple(phaseId, BIND_LEXICAL);

			/** @type {AcornAnyImportSpecifier[]} */
			const nodes = [
				/** @type {AcornImportDefaultSpecifier} */
				(this.finishNode(defaultSpecifier, "ImportDefaultSpecifier"))
			];
			if (this.eat(tokTypes.comma)) {
				if (this.type !== tokTypes.star && this.type !== tokTypes.braceL) {
					this.unexpected();
				}
				nodes.push(...base.parseImportSpecifiers.call(this));
			}
			return nodes;
		}

		this._importPhase = phase;

		if (phase === "defer") {
			if (this.type !== tokTypes.star) {
				this.raiseRecoverable(
					phaseId.start,
					"'import defer' can only be used with namespace imports ('import defer * as identifierName from ...')."
				);
			}
		} else if (this.type !== tokTypes.name) {
			this.raiseRecoverable(
				phaseId.start,
				"'import source' can only be used with direct identifier specifier imports."
			);
		}

		const specifiers = base.parseImportSpecifiers.call(this);

		if (
			phase === "source" &&
			specifiers.some((s) => s.type !== "ImportDefaultSpecifier")
		) {
			this.raiseRecoverable(
				phaseId.start,
				"'import source' can only be used with direct identifier specifier imports ('import source identifierName from ...')."
			);
		}

		return specifiers;
	}

	/**
	 * @param {boolean} forNew whether parsed as the operand of `new`
	 * @returns {AcornExpression} expression node
	 * @this {ParserInternals}
	 */
	parseExprImport(forNew) {
		const node = base.parseExprImport.call(this, forNew);

		if (
			this._importPhasesEnabled &&
			node.type === "MetaProperty" &&
			(node.property.name === "defer" || node.property.name === "source")
		) {
			if (this.type === tokTypes.parenL) {
				if (forNew) {
					// same guard acorn applies to `new import(...)`
					this.raise(node.start, "import call cannot be the target of `new`");
				}
				const dynImport =
					/** @type {AcornImportExpression & { phase?: ImportPhase }} */
					(
						this.parseDynamicImport(
							this.startNodeAt(
								node.start,
								node.loc ? node.loc.start : undefined
							)
						)
					);
				dynImport.phase = node.property.name;
				return dynImport;
			}
			this.raiseRecoverable(
				node.start,
				`'import.${node.property.name}' can only be used in a dynamic import.`
			);
		}

		return node;
	}

	/**
	 * @param {AcornNode & { property?: AcornIdentifier }} node started node with `meta` set to `import`
	 * @returns {AcornExpression} MetaProperty node
	 * @this {ParserInternals}
	 */
	parseImportMeta(node) {
		if (!this._importPhasesEnabled) {
			return base.parseImportMeta.call(this, node);
		}

		this.next();

		const containsEsc = this.containsEsc;
		const property = this.parseIdent(true);
		node.property = property;
		const { name } = property;

		if (name !== "meta" && name !== "defer" && name !== "source") {
			this.raiseRecoverable(
				property.start,
				"The only valid meta property for import is 'import.meta'"
			);
		}
		if (containsEsc) {
			this.raiseRecoverable(
				node.start,
				`'import.${name}' must not contain escaped characters`
			);
		}
		if (
			name === "meta" &&
			this.options.sourceType !== "module" &&
			!this.options.allowImportExportEverywhere
		) {
			this.raiseRecoverable(
				node.start,
				"Cannot use 'import.meta' outside a module"
			);
		}

		return /** @type {AcornExpression} */ (
			this.finishNode(node, "MetaProperty")
		);
	}
}

module.exports.LEGACY_ASSERT_ATTRIBUTES = LEGACY_ASSERT_ATTRIBUTES;
module.exports.SourcePositions = SourcePositions;
module.exports.WebpackParser = WebpackParser;
