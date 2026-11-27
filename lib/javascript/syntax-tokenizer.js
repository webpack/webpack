/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
	Tokenizer moved from syntax-parser.js
*/

"use strict";

const {
	ASTRAL_IDENTIFIER_PART_RANGES,
	ASTRAL_IDENTIFIER_START_RANGES,
	IDENTIFIER_PART_RANGES,
	IDENTIFIER_START_RANGES
} = require("./data");

/** @import { SourceLocation } from "estree" */
/** @import regexpValidatorModule, { RegExpValidationState } from "./regexp.js" */
/** @import { PositionLike, Node, Identifier, TokContextLike, OnComment, Options, ResolvedOptions, DraftOptions, TokenValue, CollectedComment } from "./syntax-parser.js" */

// cspell:ignore binop prec tokencontext

// The first code point above the Basic Multilingual Plane, where the surrogate
// pairs the astral tables describe begin.
const FIRST_ASTRAL = 0x10000;

/**
 * Decode one run-length table into flat `[start, end)` bounds. Kept until the
 * first non-ASCII classification asks for it, which most builds never do.
 * @param {number[]} ranges gap-and-length pairs
 * @param {number} base the code point the first gap counts from
 * @returns {Uint32Array} the bounds, ascending and non-overlapping
 */
const decodeRanges = (ranges, base) => {
	const bounds = new Uint32Array(ranges.length);
	let position = base;
	for (let i = 0; i < ranges.length; i += 2) {
		position += ranges[i];
		bounds[i] = position;
		position += ranges[i + 1];
		bounds[i + 1] = position;
	}
	return bounds;
};

/** @type {Uint32Array | null} */
let identifierStartBounds = null;

/** @type {Uint32Array | null} */
let identifierPartBounds = null;

/** @type {Uint32Array | null} */
let astralStartBounds = null;

/** @type {Uint32Array | null} */
let astralPartBounds = null;

/**
 * Binary search over flat `[start, end)` bounds. Both tests are written to
 * answer `false` for a `NaN` code, which is what `charCodeAt` past the end is.
 * @param {Uint32Array} bounds the decoded table
 * @param {number} code the code point to classify
 * @returns {boolean} whether a range covers it
 */
const inRanges = (bounds, code) => {
	let low = 0;
	let high = (bounds.length >> 1) - 1;
	while (low <= high) {
		const middle = (low + high) >> 1;
		const index = middle << 1;
		if (code >= bounds[index + 1]) low = middle + 1;
		else if (code >= bounds[index]) return true;
		else high = middle - 1;
	}
	return false;
};

/**
 * Whether a code point can start an identifier, matching acorn's tables.
 * @param {number} code the code point
 * @param {boolean=} astral whether code points above the BMP may match
 * @returns {boolean} whether it can start an identifier
 */
const isIdentifierStart = (code, astral) => {
	if (code < 65) return code === 36;
	if (code < 91) return true;
	if (code < 97) return code === 95;
	if (code < 123) return true;
	if (code <= 0xffff) {
		if (code < 0xaa) return false;
		if (identifierStartBounds === null) {
			identifierStartBounds = decodeRanges(IDENTIFIER_START_RANGES, 0x80);
		}
		return inRanges(identifierStartBounds, code);
	}
	if (astral === false) return false;
	if (astralStartBounds === null) {
		astralStartBounds = decodeRanges(
			ASTRAL_IDENTIFIER_START_RANGES,
			FIRST_ASTRAL
		);
	}
	return inRanges(astralStartBounds, code);
};

/**
 * Whether a code point can continue an identifier, matching acorn's tables.
 * @param {number} code the code point
 * @param {boolean=} astral whether code points above the BMP may match
 * @returns {boolean} whether it can continue an identifier
 */
const isIdentifierChar = (code, astral) => {
	if (code < 48) return code === 36;
	if (code < 58) return true;
	if (code < 65) return false;
	if (code < 91) return true;
	if (code < 97) return code === 95;
	if (code < 123) return true;
	if (code <= 0xffff) {
		if (code < 0xaa) return false;
		if (identifierPartBounds === null) {
			identifierPartBounds = decodeRanges(IDENTIFIER_PART_RANGES, 0x80);
		}
		return inRanges(identifierPartBounds, code);
	}
	if (astral === false) return false;
	if (astralPartBounds === null) {
		astralPartBounds = decodeRanges(
			ASTRAL_IDENTIFIER_PART_RANGES,
			FIRST_ASTRAL
		);
	}
	return inRanges(astralPartBounds, code);
};

// A whole line break, where CRLF counts as one.
const lineBreak = /\r\n?|\n|\u2028|\u2029/;

const nonASCIIwhitespace = /[\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]/;

const skipWhiteSpace = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g;

/**
 * @param {number} code the code point
 * @returns {boolean} whether it terminates a line
 */
const isNewLine = (code) =>
	code === 10 || code === 13 || code === 0x2028 || code === 0x2029;

/**
 * The offset just past the next line break at or after `from`.
 * @param {string} code the source text
 * @param {number} from where to start looking
 * @param {number=} end where to stop looking
 * @returns {number} the offset, or `-1` when there is no break
 */
const nextLineBreak = (code, from, end) => {
	const limit = end === undefined ? code.length : end;
	for (let i = from; i < limit; i++) {
		const next = code.charCodeAt(i);
		if (isNewLine(next)) {
			// eslint-disable-next-line unicorn/prefer-minimal-ternary
			return i < limit - 1 && next === 13 && code.charCodeAt(i + 1) === 10
				? i + 2
				: i + 1;
		}
	}
	return -1;
};

/** @type {Record<string, RegExp>} */
const regexpCache = Object.create(null);

/**
 * A cached `^(?:a|b|...)$` matcher for a space-separated word list.
 * @param {string} words the list
 * @returns {RegExp} the matcher
 */
const wordsRegexp = (words) => {
	const cached = regexpCache[words];
	if (cached !== undefined) return cached;
	const built = new RegExp(`^(?:${words.replace(/ /g, "|")})$`);
	regexpCache[words] = built;
	return built;
};

/**
 * @param {number} code a code point
 * @returns {string} the string for it, encoded as UTF-16
 */
const codePointToString = (code) => {
	if (code <= 0xffff) return String.fromCharCode(code);
	const rest = code - 0x10000;
	return String.fromCharCode((rest >> 10) + 0xd800, (rest & 1023) + 0xdc00);
};

// Reserved word lists for the dialects the parser accepts.
const reservedWords = {
	3: "abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile",
	5: "class enum extends super const export import",
	6: "enum",
	strict:
		"implements interface let package private protected public static yield",
	strictBind: "eval arguments"
};

const ecma5AndLessKeywords =
	"break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this";

const keywordLists = {
	5: ecma5AndLessKeywords,
	"5module": `${ecma5AndLessKeywords} export import`,
	6: `${ecma5AndLessKeywords} const class extends export import super`
};

/**
 * A token's kind, carrying what the parser needs to know about it without
 * re-inspecting the source: whether an expression may follow, its binary
 * precedence, and how it updates the tokenizer's context.
 */
class TokenType {
	/**
	 * @param {string} label how the token prints in errors
	 * @param {{ keyword?: string, beforeExpr?: boolean, startsExpr?: boolean, isLoop?: boolean, isAssign?: boolean, prefix?: boolean, postfix?: boolean, binop?: number }=} conf what the token allows
	 */
	constructor(label, conf) {
		const options = conf || {};
		this.label = label;
		this.keyword = options.keyword;
		this.beforeExpr = Boolean(options.beforeExpr);
		this.startsExpr = Boolean(options.startsExpr);
		this.isLoop = Boolean(options.isLoop);
		this.isAssign = Boolean(options.isAssign);
		this.prefix = Boolean(options.prefix);
		this.postfix = Boolean(options.postfix);
		this.binop = options.binop || null;
		/** @type {((prevType: TokenType) => void) | null} */
		this.updateContext = null;
	}
}

/**
 * @param {string} name how the operator prints
 * @param {number} prec its binary precedence
 * @returns {TokenType} the token type
 */
const binop = (name, prec) =>
	new TokenType(name, { beforeExpr: true, binop: prec });

const beforeExpr = { beforeExpr: true };

const startsExpr = { startsExpr: true };

/** @type {Record<string, TokenType>} */
const keywordTypes = {};

/**
 * Define a keyword's token type and record it under its name.
 * @param {string} name the keyword
 * @param {{ beforeExpr?: boolean, startsExpr?: boolean, isLoop?: boolean, prefix?: boolean, binop?: number }=} options what the keyword allows
 * @returns {TokenType} the token type
 */
const kw = (name, options) => {
	const conf = { ...options, keyword: name };
	const type = new TokenType(name, conf);
	keywordTypes[name] = type;
	return type;
};

const tokTypes = {
	num: new TokenType("num", startsExpr),
	regexp: new TokenType("regexp", startsExpr),
	string: new TokenType("string", startsExpr),
	name: new TokenType("name", startsExpr),
	privateId: new TokenType("privateId", startsExpr),
	eof: new TokenType("eof"),

	bracketL: new TokenType("[", { beforeExpr: true, startsExpr: true }),
	bracketR: new TokenType("]"),
	braceL: new TokenType("{", { beforeExpr: true, startsExpr: true }),
	braceR: new TokenType("}"),
	parenL: new TokenType("(", { beforeExpr: true, startsExpr: true }),
	parenR: new TokenType(")"),
	comma: new TokenType(",", beforeExpr),
	semi: new TokenType(";", beforeExpr),
	colon: new TokenType(":", beforeExpr),
	dot: new TokenType("."),
	question: new TokenType("?", beforeExpr),
	questionDot: new TokenType("?."),
	arrow: new TokenType("=>", beforeExpr),
	template: new TokenType("template"),
	invalidTemplate: new TokenType("invalidTemplate"),
	ellipsis: new TokenType("...", beforeExpr),
	backQuote: new TokenType("`", startsExpr),
	dollarBraceL: new TokenType("${", { beforeExpr: true, startsExpr: true }),

	eq: new TokenType("=", { beforeExpr: true, isAssign: true }),
	assign: new TokenType("_=", { beforeExpr: true, isAssign: true }),
	incDec: new TokenType("++/--", {
		prefix: true,
		postfix: true,
		startsExpr: true
	}),
	prefix: new TokenType("!/~", {
		beforeExpr: true,
		prefix: true,
		startsExpr: true
	}),
	logicalOR: binop("||", 1),
	logicalAND: binop("&&", 2),
	bitwiseOR: binop("|", 3),
	bitwiseXOR: binop("^", 4),
	bitwiseAND: binop("&", 5),
	equality: binop("==/!=/===/!==", 6),
	relational: binop("</>/<=/>=", 7),
	bitShift: binop("<</>>/>>>", 8),
	plusMin: new TokenType("+/-", {
		beforeExpr: true,
		binop: 9,
		prefix: true,
		startsExpr: true
	}),
	modulo: binop("%", 10),
	star: binop("*", 10),
	slash: binop("/", 10),
	starstar: new TokenType("**", { beforeExpr: true }),
	coalesce: binop("??", 1),

	_break: kw("break"),
	_case: kw("case", beforeExpr),
	_catch: kw("catch"),
	_continue: kw("continue"),
	_debugger: kw("debugger"),
	_default: kw("default", beforeExpr),
	_do: kw("do", { isLoop: true, beforeExpr: true }),
	_else: kw("else", beforeExpr),
	_finally: kw("finally"),
	_for: kw("for", { isLoop: true }),
	_function: kw("function", startsExpr),
	_if: kw("if"),
	_return: kw("return", beforeExpr),
	_switch: kw("switch"),
	_throw: kw("throw", beforeExpr),
	_try: kw("try"),
	_var: kw("var"),
	_const: kw("const"),
	_while: kw("while", { isLoop: true }),
	_with: kw("with"),
	_new: kw("new", { beforeExpr: true, startsExpr: true }),
	_this: kw("this", startsExpr),
	_super: kw("super", startsExpr),
	_class: kw("class", startsExpr),
	_extends: kw("extends", beforeExpr),
	_export: kw("export"),
	_import: kw("import", startsExpr),
	_null: kw("null", startsExpr),
	_true: kw("true", startsExpr),
	_false: kw("false", startsExpr),
	_in: kw("in", { beforeExpr: true, binop: 7 }),
	_instanceof: kw("instanceof", { beforeExpr: true, binop: 7 }),
	_typeof: kw("typeof", { beforeExpr: true, prefix: true, startsExpr: true }),
	_void: kw("void", { beforeExpr: true, prefix: true, startsExpr: true }),
	_delete: kw("delete", { beforeExpr: true, prefix: true, startsExpr: true })
};

/**
 * A tokenizer context: what kind of brace, paren or template the tokenizer is
 * inside, which decides how the next `/` or `}` reads.
 */
class TokContext {
	/**
	 * @param {string} token the opening token
	 * @param {boolean} isExpr whether the context holds an expression
	 * @param {boolean=} preserveSpace whether whitespace is significant inside
	 * @param {((parser: JavascriptTokenizer) => void)=} override how to read the next token
	 * @param {boolean=} generator whether the enclosing function is a generator
	 */
	constructor(token, isExpr, preserveSpace, override, generator) {
		this.token = token;
		this.isExpr = isExpr;
		this.preserveSpace = Boolean(preserveSpace);
		this.override = override;
		this.generator = Boolean(generator);
	}
}

const tokContexts = {
	bStat: new TokContext("{", false),
	bExpr: new TokContext("{", true),
	bTmpl: new TokContext("${", false),
	pStat: new TokContext("(", false),
	pExpr: new TokContext("(", true),
	qTmpl: new TokContext("`", true, true, (parser) =>
		parser.tryReadTemplateToken()
	),
	fStat: new TokContext("function", false),
	fExpr: new TokContext("function", true),
	fExprGen: new TokContext("function", true, false, undefined, true),
	fGen: new TokContext("function", false, false, undefined, true)
};

/** A `{ line, column }` pair, as `options.locations` reports one. */
class Position {
	/**
	 * @param {number} line one-based line number
	 * @param {number} col zero-based column
	 */
	constructor(line, col) {
		this.line = line;
		this.column = col;
	}

	/**
	 * @param {number} n how far to move along the line
	 * @returns {Position} the shifted position
	 */
	offset(n) {
		return new Position(this.line, this.column + n);
	}
}

/** The `loc` a node carries when `options.locations` is on. */
class ParserSourceLocation {
	/**
	 * @param {{ sourceFile: string | null }} p the parser, for its `sourceFile`
	 * @param {PositionLike | null | undefined} start where the node starts
	 * @param {PositionLike | null | undefined} end where it ends, or nothing until `finishNode` sets it
	 */
	constructor(p, start, end) {
		this.start = start;
		this.end = end;
		if (p.sourceFile !== null) this.source = p.sourceFile;
	}
}

/**
 * The line and column an offset falls on, for callers that parsed without
 * `options.locations`.
 * @param {string} input the source text
 * @param {number} offset the offset to locate
 * @returns {Position} where it falls
 */
const getLineInfo = (input, offset) => {
	let line = 1;
	let cur = 0;
	for (;;) {
		const nextBreak = nextLineBreak(input, cur, offset);
		if (nextBreak < 0) return new Position(line, offset - cur);
		++line;
		cur = nextBreak;
	}
};

const defaultOptions = {
	ecmaVersion: null,
	sourceType: "script",
	strict: false,
	onInsertedSemicolon: null,
	onTrailingComma: null,
	allowReserved: null,
	allowReturnOutsideFunction: false,
	allowImportExportEverywhere: false,
	allowAwaitOutsideFunction: null,
	allowSuperOutsideMethod: null,
	allowHashBang: false,
	checkPrivateFields: true,
	locations: false,
	onToken: null,
	onTokenRead: null,
	onComment: null,
	ranges: false,
	sourceFile: null,
	preserveParens: false
};

/**
 * Turn an `onComment` array into the callback the tokenizer calls.
 * @param {{ locations: boolean, ranges: boolean }} options the normalized options
 * @param {CollectedComment[]} array where to push each comment
 * @returns {OnComment} the callback
 */
const pushComment = (options, array) =>
	/**
	 * @this {{ sourceFile: string | null }}
	 * @param {boolean} block whether it is a block comment
	 * @param {string} text its text
	 * @param {number} start where it starts
	 * @param {number} end where it ends
	 * @param {(Position | null)=} startLoc its start position
	 * @param {(Position | null)=} endLoc its end position
	 * @returns {void}
	 */
	function pushOneComment(block, text, start, end, startLoc, endLoc) {
		/** @type {CollectedComment} */
		const comment = {
			type: block ? "Block" : "Line",
			value: text,
			start,
			end
		};
		if (options.locations) {
			comment.loc = /** @type {SourceLocation} */ (
				new ParserSourceLocation(this, startLoc, endLoc)
			);
		}
		if (options.ranges) comment.range = [start, end];
		array.push(comment);
	};

let warnedAboutEcmaVersion = false;

/**
 * Fill in every option the parser reads, and normalize the two that are stated
 * in more than one way: `ecmaVersion` as a year, and array comment sinks.
 * @param {Partial<Options> | null | undefined} opts what the caller passed
 * @returns {ResolvedOptions} the normalized options
 */
const getOptions = (opts) => {
	// WHY: a copy of the defaults is born with every field in place. Added key
	// by key through a computed name, the seventeenth turns the object into a
	// hash table, which every later read of an option then has to search.
	const options = /** @type {DraftOptions} */ ({ ...defaultOptions });
	if (opts) {
		for (const opt of Object.keys(defaultOptions)) {
			if (Object.prototype.hasOwnProperty.call(opts, opt)) {
				/** @type {Record<string, DraftOptions[keyof DraftOptions] | undefined>} */ (
					options
				)[opt] = opts[/** @type {keyof Options} */ (opt)];
			}
		}
	}

	if (options.ecmaVersion === "latest") {
		options.ecmaVersion = 1e8;
	} else if (
		options.ecmaVersion === null ||
		options.ecmaVersion === undefined
	) {
		if (
			!warnedAboutEcmaVersion &&
			typeof console === "object" &&
			// eslint-disable-next-line no-console
			console.warn
		) {
			warnedAboutEcmaVersion = true;
			// eslint-disable-next-line no-console
			console.warn(
				"Since Acorn 8.0.0, options.ecmaVersion is required.\nDefaulting to 2020, but this will stop working in the future."
			);
		}
		options.ecmaVersion = 11;
	} else if (options.ecmaVersion >= 2015) {
		options.ecmaVersion -= 2009;
	}

	if (options.allowReserved === null || options.allowReserved === undefined) {
		options.allowReserved = options.ecmaVersion < 5;
	}

	if (
		!opts ||
		opts.allowHashBang === null ||
		opts.allowHashBang === undefined
	) {
		options.allowHashBang = options.ecmaVersion >= 14;
	}

	if (Array.isArray(options.onToken)) {
		const tokens = options.onToken;
		options.onToken = (/** @type {Token} */ token) => tokens.push(token);
	}
	if (Array.isArray(options.onComment)) {
		options.onComment = pushComment(options, options.onComment);
	}

	if (options.sourceType === "commonjs" && options.allowAwaitOutsideFunction) {
		throw new Error(
			"Cannot use allowAwaitOutsideFunction with sourceType: commonjs"
		);
	}

	return /** @type {ResolvedOptions} */ (options);
};

/** A token as `options.onToken` receives one. */
class Token {
	/**
	 * @param {JavascriptTokenizer} p the parser, read at its current token
	 */
	constructor(p) {
		this.type = p.type;
		this.value = p.value;
		this.start = p.start;
		this.end = p.end;
		if (p.options.locations) {
			this.loc = new ParserSourceLocation(p, p.startLoc, p.endLoc);
		}
		if (p.options.ranges) this.range = [p.start, p.end];
	}
}

// How a function declaration was reached, which decides whether it may be
// unnamed and whether its name binds in the enclosing scope.

// A directive prologue entry, used to spot `"use strict"` before parsing.
const literalDirective = /^(?:'((?:\\[^]|[^'\\])*?)'|"((?:\\[^]|[^"\\])*?)")/;

// The regexp validator and its Unicode property tables load on the first `readRegexp`
// here. `WebpackParser` calls it for every regexp literal below ecmaVersion 16,
// and from 16 on only for a pattern the host rejects; the exported `Parser` always.
/** @type {typeof regexpValidatorModule | null} */
let regexpValidator = null;

/**
 * Scan for `in` or `instanceof` where the first character is already `i`.
 * @param {JavascriptTokenizer} parser the parser
 * @param {number} pos the operator's start
 * @returns {boolean} whether a keyword operator starts here
 */
const keywordOperatorAt = (parser, pos) => {
	let end = pos + 1;
	const stop = Math.min(parser.input.length, pos + 11);
	while (end < stop) {
		const code = parser.fullCharCodeAt(end);
		if (!isIdentifierChar(code, true)) break;
		end += code <= 0xffff ? 1 : 2;
	}
	return (
		(end === pos + 2 && parser.input.slice(pos, end) === "in") ||
		(end === pos + 10 && parser.input.slice(pos, end) === "instanceof")
	);
};

/**
 * @returns {typeof regexpValidatorModule} the validator, installed on first use
 */
const loadRegExpValidator = () => {
	if (regexpValidator === null) {
		regexpValidator = require("./regexp");
		regexpValidator.install(JavascriptTokenizer);
	}
	return regexpValidator;
};

/**
 * The JavaScript tokenizer (acorn's `tokenize.js` and `tokencontext.js`): the
 * token state and the methods that read it, which `SyntaxParser` extends.
 */
class JavascriptTokenizer {
	/**
	 * @param {Partial<Options> | null | undefined} options parser options
	 * @param {string} input the source text
	 * @param {number=} startPos offset to start at
	 */
	constructor(options, input, startPos) {
		const resolved = getOptions(options);
		this.options = resolved;
		this.sourceFile = resolved.sourceFile;
		this.keywords = wordsRegexp(
			keywordLists[
				resolved.ecmaVersion >= 6
					? 6
					: resolved.sourceType === "module"
						? "5module"
						: 5
			]
		);
		let reserved = "";
		if (resolved.allowReserved !== true) {
			reserved =
				reservedWords[
					resolved.ecmaVersion >= 6 ? 6 : resolved.ecmaVersion === 5 ? 5 : 3
				];
			if (resolved.sourceType === "module") reserved += " await";
		}
		this.reservedWords = wordsRegexp(reserved);
		const reservedStrict = `${reserved ? `${reserved} ` : ""}${
			reservedWords.strict
		}`;
		this.reservedWordsStrict = wordsRegexp(reservedStrict);
		this.reservedWordsStrictBind = wordsRegexp(
			`${reservedStrict} ${reservedWords.strictBind}`
		);
		this.input = input;

		// Whether the last `readWord1` saw an escape, which stops a word from
		// reading as a keyword.
		this.containsEsc = false;

		this.pos = startPos || 0;
		this.curLine = 1;
		// only webpack's own parser starts past 0, and tracks no lines
		this.lineStart = startPos
			? this.input.lastIndexOf("\n", startPos - 1) + 1
			: 0;

		this.type = tokTypes.eof;
		/** @type {TokenValue} */
		this.value = null;
		// acorn writes each pair through one chained assignment, so the second
		// name of each is the slot created first
		this.end = this.pos;
		this.start = this.pos;
		/** @type {Position | undefined} */
		this.endLoc = this.curPosition();
		/** @type {Position | undefined} */
		this.startLoc = this.endLoc;

		this.lastTokEnd = this.pos;
		this.lastTokStart = this.pos;

		// Enough syntactic context to tell a regexp apart from a division.
		/** @type {TokContextLike[]} */
		this.context = this.initialContext();
		this.exprAllowed = true;

		this.inModule = resolved.sourceType === "module";
		this.strict =
			this.inModule || resolved.strict || this.strictDirective(this.pos);

		/**
		 * Set by the parse entry points; a parser that only hands out tokens
		 * keeps its top-level scope and reads its contexts instead.
		 * @type {boolean}
		 */
		this.parsing = false;

		/** @type {RegExpValidationState | null} */
		this.regexpState = null;

		// Whether a template element is being read, where a bad escape only
		// loses the cooked value.
		this.inTemplateElement = false;

		if (
			this.pos === 0 &&
			resolved.allowHashBang &&
			this.input.startsWith("#!")
		) {
			this.skipLineComment(2);
		}
	}

	/**
	 * Whether a directive prologue starting at `start` opens with `"use strict"`.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.19.0/acorn/src/parseutil.js
	 * @param {number} start where the prologue may begin
	 * @returns {boolean} whether the code is strict
	 */
	strictDirective(start) {
		if (this.options.ecmaVersion < 5) return false;
		let at = start;
		for (;;) {
			skipWhiteSpace.lastIndex = at;
			at += /** @type {RegExpExecArray} */ (skipWhiteSpace.exec(this.input))[0]
				.length;
			const match = literalDirective.exec(this.input.slice(at));
			if (!match) return false;
			if ((match[1] || match[2]) === "use strict") {
				skipWhiteSpace.lastIndex = at + match[0].length;
				const spaceAfter = /** @type {RegExpExecArray} */ (
					skipWhiteSpace.exec(this.input)
				);
				const end = spaceAfter.index + spaceAfter[0].length;
				const next = this.input.charAt(end);
				return (
					next === ";" ||
					next === "}" ||
					(lineBreak.test(spaceAfter[0]) &&
						!(
							/[(`.[+\-/*%<>=,?^&]/.test(next) ||
							(next === "!" && this.input.charAt(end + 1) === "=") ||
							(next === "i" && keywordOperatorAt(this, end))
						))
				);
			}
			at += match[0].length;

			skipWhiteSpace.lastIndex = at;
			at += /** @type {RegExpExecArray} */ (skipWhiteSpace.exec(this.input))[0]
				.length;
			if (this.input[at] === ";") at++;
		}
	}

	/**
	 * @param {number=} pos where the offending token starts
	 * @returns {never} never returns
	 */
	unexpected(pos) {
		this.raise(
			pos === null || pos === undefined ? this.start : pos,
			"Unexpected token"
		);
	}

	/** @returns {TokContextLike[]} the context stack a fresh parser starts with */
	initialContext() {
		return [tokContexts.bStat];
	}

	/**
	 * Report a parse error, naming where in the source it was found.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/location.js
	 * @param {number} pos where the error is
	 * @param {string} message what is wrong
	 * @returns {never} never returns
	 */
	raise(pos, message) {
		const loc = getLineInfo(this.input, pos);
		let text = `${message} (${loc.line}:${loc.column})`;
		if (this.sourceFile) text += ` in ${this.sourceFile}`;
		const err =
			/** @type {SyntaxError & { pos: number, loc: Position, raisedAt: number }} */ (
				new SyntaxError(text)
			);
		err.pos = pos;
		err.loc = loc;
		err.raisedAt = this.pos;
		throw err;
	}

	/**
	 * An error the parse can go on past: `parseProgram` reports it and goes on.
	 * @param {number} pos where the error is
	 * @param {string} message what is wrong
	 * @returns {void}
	 */
	raiseRecoverable(pos, message) {
		this.raise(pos, message);
	}

	/** @returns {Position | undefined} where the tokenizer stands, when tracked */
	curPosition() {
		if (this.options.locations) {
			return new Position(this.curLine, this.pos - this.lineStart);
		}
	}

	/**
	 * @param {number} startSkip how many characters open the comment
	 * @returns {void}
	 */
	skipLineComment(startSkip) {
		const start = this.pos;
		const startLoc = this.options.onComment && this.curPosition();
		this.pos += startSkip;
		let ch = this.input.charCodeAt(this.pos);
		while (this.pos < this.input.length && !isNewLine(ch)) {
			ch = this.input.charCodeAt(++this.pos);
		}
		if (this.options.onComment) {
			this.options.onComment(
				false,
				this.input.slice(start + startSkip, this.pos),
				start,
				this.pos,
				startLoc,
				this.curPosition()
			);
		}
	}

	/** @returns {TokContextLike} the innermost context */
	curContext() {
		return this.context[this.context.length - 1];
	}

	/**
	 * Whether a `{` here opens a block rather than an object literal, which the
	 * token before it decides.
	 * @param {TokenType} prevType the token before the brace
	 * @returns {boolean} whether it opens a block
	 */
	braceIsBlock(prevType) {
		const parent = this.curContext();
		if (parent === tokContexts.fExpr || parent === tokContexts.fStat) {
			return true;
		}
		if (
			prevType === tokTypes.colon &&
			(parent === tokContexts.bStat || parent === tokContexts.bExpr)
		) {
			return !parent.isExpr;
		}

		// `name` with an expression allowed means a `yield` or `of` was just read,
		// which `tokTypes.name.updateContext` is what records.
		if (
			prevType === tokTypes._return ||
			(prevType === tokTypes.name && this.exprAllowed)
		) {
			return lineBreak.test(this.input.slice(this.lastTokEnd, this.start));
		}
		if (
			prevType === tokTypes._else ||
			prevType === tokTypes.semi ||
			prevType === tokTypes.eof ||
			prevType === tokTypes.parenR ||
			prevType === tokTypes.arrow
		) {
			return true;
		}
		if (prevType === tokTypes.braceL) return parent === tokContexts.bStat;
		if (
			prevType === tokTypes._var ||
			prevType === tokTypes._const ||
			prevType === tokTypes.name
		) {
			return false;
		}
		return !this.exprAllowed;
	}

	/**
	 * Whether the enclosing function is a generator. A parse reads its scope: a
	 * method's `*` pushes no `function` context, which only the tokenizer reads.
	 * The tokenizer alone enters no function scope, so it reads its contexts.
	 * @returns {boolean} true where `yield` is an operator
	 */
	inGeneratorContext() {
		for (let i = this.context.length - 1; i >= 1; i--) {
			const context = this.context[i];
			if (context.token === "function") return Boolean(context.generator);
		}
		return false;
	}

	/**
	 * @param {TokenType} prevType the token before the current one
	 * @returns {void}
	 */
	updateContext(prevType) {
		const type = this.type;
		if (
			type.keyword &&
			(prevType === tokTypes.dot || prevType === tokTypes.questionDot)
		) {
			this.exprAllowed = false;
			return;
		}
		const update = type.updateContext;
		if (update) update.call(this, prevType);
		else this.exprAllowed = type.beforeExpr;
	}

	/**
	 * A module reads `<!--` as `<`, `!` and `--`, where a script, as webpack
	 * emits a module into, reads an HTML-style comment.
	 * @param {number} pos where the `<` is
	 * @returns {void}
	 */
	readHtmlOpenAsOperators(pos) {}

	/**
	 * Move past the current token.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @param {boolean=} ignoreEscapeSequenceInKeyword whether an escaped keyword is allowed
	 * @returns {void}
	 */
	next(ignoreEscapeSequenceInKeyword) {
		if (
			!ignoreEscapeSequenceInKeyword &&
			this.type.keyword &&
			this.containsEsc
		) {
			this.raiseRecoverable(
				this.start,
				`Escape sequence in keyword ${this.type.keyword}`
			);
		}
		if (this.options.onToken) this.options.onToken(new Token(this));
		if (this.options.onTokenRead) this.options.onTokenRead(this);

		this.lastTokEnd = this.end;
		this.lastTokStart = this.start;
		this.nextToken();
	}

	/** @returns {Token} the token after the current one */
	getToken() {
		this.next();
		return new Token(this);
	}

	/** @returns {Iterator<Token, Token>} the remaining tokens */
	[Symbol.iterator]() {
		return {
			next: () => {
				const token = this.getToken();
				return { done: token.type === tokTypes.eof, value: token };
			}
		};
	}

	/** @returns {void} */
	nextToken() {
		const curContext = this.curContext();
		if (!curContext || !curContext.preserveSpace) this.skipSpace();

		this.start = this.pos;
		if (this.options.locations) {
			this.startLoc = this.curPosition();
		}
		if (this.pos >= this.input.length) {
			this.finishToken(tokTypes.eof);
			return;
		}

		if (curContext.override) {
			curContext.override(this);
			return;
		}
		this.readToken(this.fullCharCodeAtPos());
	}

	/**
	 * @param {number} code the code point at the tokenizer's position
	 * @returns {void}
	 */
	readToken(code) {
		// A `\` starts an identifier too, since a name may be written with escapes.
		if (isIdentifierStart(code, this.options.ecmaVersion >= 6) || code === 92) {
			this.readWord();
			return;
		}

		this.getTokenFromCode(code);
	}

	/**
	 * @param {number} pos where to read
	 * @returns {number} the code point there, joining a surrogate pair
	 */
	fullCharCodeAt(pos) {
		const code = this.input.charCodeAt(pos);
		if (code <= 0xd7ff || code >= 0xdc00) return code;
		const next = this.input.charCodeAt(pos + 1);
		return next <= 0xdbff || next >= 0xe000
			? code
			: (code << 10) + next - 0x35fdc00;
	}

	/** @returns {number} the code point at the tokenizer's position */
	fullCharCodeAtPos() {
		return this.fullCharCodeAt(this.pos);
	}

	/** @returns {void} */
	skipBlockComment() {
		const startLoc = this.options.onComment && this.curPosition();
		const start = this.pos;
		this.pos += 2;
		const end = this.input.indexOf("*/", this.pos);
		if (end === -1) this.raise(this.pos - 2, "Unterminated comment");
		this.pos = end + 2;
		if (this.options.locations) {
			let nextBreak;
			let pos = start;
			while ((nextBreak = nextLineBreak(this.input, pos, this.pos)) > -1) {
				++this.curLine;
				this.lineStart = nextBreak;
				pos = nextBreak;
			}
		}
		if (this.options.onComment) {
			this.options.onComment(
				true,
				this.input.slice(start + 2, end),
				start,
				this.pos,
				startLoc,
				this.curPosition()
			);
		}
	}

	/** @returns {void} */
	skipSpace() {
		loop: while (this.pos < this.input.length) {
			const ch = this.input.charCodeAt(this.pos);
			switch (ch) {
				case 32:
				case 160:
					++this.pos;
					break;
				case 13:
					if (this.input.charCodeAt(this.pos + 1) === 10) ++this.pos;
				// falls through
				case 10:
				case 8232:
				case 8233:
					++this.pos;
					if (this.options.locations) {
						++this.curLine;
						this.lineStart = this.pos;
					}
					break;
				case 47:
					switch (this.input.charCodeAt(this.pos + 1)) {
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

	/**
	 * @param {TokenType} type the token's kind
	 * @param {TokenValue=} value what it carries
	 * @returns {void}
	 */
	finishToken(type, value) {
		this.end = this.pos;
		if (this.options.locations) {
			this.endLoc = this.curPosition();
		}
		const prevType = this.type;
		this.type = type;
		this.value = value;

		this.updateContext(prevType);
	}

	/** @returns {void} */
	readTokenDot() {
		const next = this.input.charCodeAt(this.pos + 1);
		if (next >= 48 && next <= 57) {
			this.readNumber(true);
			return;
		}
		const next2 = this.input.charCodeAt(this.pos + 2);
		if (this.options.ecmaVersion >= 6 && next === 46 && next2 === 46) {
			this.pos += 3;
			this.finishToken(tokTypes.ellipsis);
			return;
		}
		++this.pos;
		this.finishToken(tokTypes.dot);
	}

	/** @returns {void} */
	readTokenSlash() {
		const next = this.input.charCodeAt(this.pos + 1);
		if (this.exprAllowed) {
			++this.pos;
			this.readRegexp();
			return;
		}
		if (next === 61) {
			this.finishOp(tokTypes.assign, 2);
			return;
		}
		this.finishOp(tokTypes.slash, 1);
	}

	/**
	 * @param {number} code the operator's first character
	 * @returns {void}
	 */
	readTokenMultModuloExp(code) {
		let next = this.input.charCodeAt(this.pos + 1);
		let size = 1;
		let tokenType = code === 42 ? tokTypes.star : tokTypes.modulo;

		if (this.options.ecmaVersion >= 7 && code === 42 && next === 42) {
			++size;
			tokenType = tokTypes.starstar;
			next = this.input.charCodeAt(this.pos + 2);
		}

		if (next === 61) {
			this.finishOp(tokTypes.assign, size + 1);
			return;
		}
		this.finishOp(tokenType, size);
	}

	/**
	 * @param {number} code the operator's first character
	 * @returns {void}
	 */
	readTokenPipeAmp(code) {
		const next = this.input.charCodeAt(this.pos + 1);
		if (next === code) {
			if (this.options.ecmaVersion >= 12) {
				const next2 = this.input.charCodeAt(this.pos + 2);
				if (next2 === 61) {
					this.finishOp(tokTypes.assign, 3);
					return;
				}
			}
			this.finishOp(code === 124 ? tokTypes.logicalOR : tokTypes.logicalAND, 2);
			return;
		}
		if (next === 61) {
			this.finishOp(tokTypes.assign, 2);
			return;
		}
		this.finishOp(code === 124 ? tokTypes.bitwiseOR : tokTypes.bitwiseAND, 1);
	}

	/** @returns {void} */
	readTokenCaret() {
		const next = this.input.charCodeAt(this.pos + 1);
		if (next === 61) {
			this.finishOp(tokTypes.assign, 2);
			return;
		}
		this.finishOp(tokTypes.bitwiseXOR, 1);
	}

	/**
	 * @param {number} code the operator's first character
	 * @returns {void}
	 */
	readTokenPlusMin(code) {
		const next = this.input.charCodeAt(this.pos + 1);
		if (next === code) {
			if (
				next === 45 &&
				!this.inModule &&
				this.input.charCodeAt(this.pos + 2) === 62 &&
				(this.lastTokEnd === 0 ||
					lineBreak.test(this.input.slice(this.lastTokEnd, this.pos)))
			) {
				// `-->` closes an HTML-style comment, which annex B reads as a line one.
				this.skipLineComment(3);
				this.skipSpace();
				this.nextToken();
				return;
			}
			this.finishOp(tokTypes.incDec, 2);
			return;
		}
		if (next === 61) {
			this.finishOp(tokTypes.assign, 2);
			return;
		}
		this.finishOp(tokTypes.plusMin, 1);
	}

	/**
	 * @param {number} code the operator's first character
	 * @returns {void}
	 */
	readTokenLtGt(code) {
		const next = this.input.charCodeAt(this.pos + 1);
		let size = 1;
		if (next === code) {
			size = code === 62 && this.input.charCodeAt(this.pos + 2) === 62 ? 3 : 2;
			if (this.input.charCodeAt(this.pos + size) === 61) {
				this.finishOp(tokTypes.assign, size + 1);
				return;
			}
			this.finishOp(tokTypes.bitShift, size);
			return;
		}
		if (
			next === 33 &&
			code === 60 &&
			this.input.charCodeAt(this.pos + 2) === 45 &&
			this.input.charCodeAt(this.pos + 3) === 45
		) {
			if (!this.inModule) {
				// `<!--` opens an HTML-style comment, which annex B reads as a line one.
				this.skipLineComment(4);
				this.skipSpace();
				this.nextToken();
				return;
			}
			this.readHtmlOpenAsOperators(this.pos);
		}
		if (next === 61) size = 2;
		this.finishOp(tokTypes.relational, size);
	}

	/**
	 * @param {number} code the operator's first character
	 * @returns {void}
	 */
	readTokenEqExcl(code) {
		const next = this.input.charCodeAt(this.pos + 1);
		if (next === 61) {
			this.finishOp(
				tokTypes.equality,
				this.input.charCodeAt(this.pos + 2) === 61 ? 3 : 2
			);
			return;
		}
		if (code === 61 && next === 62 && this.options.ecmaVersion >= 6) {
			this.pos += 2;
			this.finishToken(tokTypes.arrow);
			return;
		}
		this.finishOp(code === 61 ? tokTypes.eq : tokTypes.prefix, 1);
	}

	/** @returns {void} */
	readTokenQuestion() {
		const { ecmaVersion } = this.options;
		if (ecmaVersion >= 11) {
			const next = this.input.charCodeAt(this.pos + 1);
			if (next === 46) {
				const next2 = this.input.charCodeAt(this.pos + 2);
				if (next2 < 48 || next2 > 57) {
					this.finishOp(tokTypes.questionDot, 2);
					return;
				}
			} else if (next === 63) {
				if (ecmaVersion >= 12) {
					const next2 = this.input.charCodeAt(this.pos + 2);
					if (next2 === 61) {
						this.finishOp(tokTypes.assign, 3);
						return;
					}
				}
				this.finishOp(tokTypes.coalesce, 2);
				return;
			}
		}
		this.finishOp(tokTypes.question, 1);
	}

	/** @returns {void} */
	readTokenNumberSign() {
		const { ecmaVersion } = this.options;
		let code = 35;
		if (ecmaVersion >= 13) {
			++this.pos;
			code = this.fullCharCodeAtPos();
			if (isIdentifierStart(code, true) || code === 92) {
				this.finishToken(tokTypes.privateId, this.readWord1());
				return;
			}
		}

		this.raise(this.pos, `Unexpected character '${codePointToString(code)}'`);
	}

	/**
	 * @param {number} code the code point at the tokenizer's position
	 * @returns {void}
	 */
	getTokenFromCode(code) {
		switch (code) {
			case 46:
				this.readTokenDot();
				return;

			case 40:
				++this.pos;
				this.finishToken(tokTypes.parenL);
				return;
			case 41:
				++this.pos;
				this.finishToken(tokTypes.parenR);
				return;
			case 59:
				++this.pos;
				this.finishToken(tokTypes.semi);
				return;
			case 44:
				++this.pos;
				this.finishToken(tokTypes.comma);
				return;
			case 91:
				++this.pos;
				this.finishToken(tokTypes.bracketL);
				return;
			case 93:
				++this.pos;
				this.finishToken(tokTypes.bracketR);
				return;
			case 123:
				++this.pos;
				this.finishToken(tokTypes.braceL);
				return;
			case 125:
				++this.pos;
				this.finishToken(tokTypes.braceR);
				return;
			case 58:
				++this.pos;
				this.finishToken(tokTypes.colon);
				return;

			case 96:
				if (this.options.ecmaVersion < 6) break;
				++this.pos;
				this.finishToken(tokTypes.backQuote);
				return;

			case 48: {
				const next = this.input.charCodeAt(this.pos + 1);
				if (next === 120 || next === 88) {
					this.readRadixNumber(16);
					return;
				}
				if (this.options.ecmaVersion >= 6) {
					if (next === 111 || next === 79) {
						this.readRadixNumber(8);
						return;
					}
					if (next === 98 || next === 66) {
						this.readRadixNumber(2);
						return;
					}
				}
				this.readNumber(false);
				return;
			}

			case 49:
			case 50:
			case 51:
			case 52:
			case 53:
			case 54:
			case 55:
			case 56:
			case 57:
				this.readNumber(false);
				return;

			case 34:
			case 39:
				this.readString(code);
				return;

			case 47:
				this.readTokenSlash();
				return;

			case 37:
			case 42:
				this.readTokenMultModuloExp(code);
				return;

			case 124:
			case 38:
				this.readTokenPipeAmp(code);
				return;

			case 94:
				this.readTokenCaret();
				return;

			case 43:
			case 45:
				this.readTokenPlusMin(code);
				return;

			case 60:
			case 62:
				this.readTokenLtGt(code);
				return;

			case 61:
			case 33:
				this.readTokenEqExcl(code);
				return;

			case 63:
				this.readTokenQuestion();
				return;

			case 126:
				this.finishOp(tokTypes.prefix, 1);
				return;

			case 35:
				this.readTokenNumberSign();
				return;
		}

		this.raise(this.pos, `Unexpected character '${codePointToString(code)}'`);
	}

	/**
	 * @param {TokenType} type the token's kind
	 * @param {number} size how many characters it spans
	 * @returns {void}
	 */
	finishOp(type, size) {
		const str = this.input.slice(this.pos, this.pos + size);
		this.pos += size;
		this.finishToken(type, str);
	}

	/**
	 * Check a regexp literal's flags.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/regexp.js
	 * @param {RegExpValidationState} state the validation state
	 * @returns {void}
	 */
	validateRegExpFlags(state) {
		loadRegExpValidator().RegExpValidator.prototype.validateRegExpFlags.call(
			this,
			state
		);
	}

	/**
	 * Check a regexp literal's pattern, re-reading it once a group name shows
	 * that the named-capture goal symbol was the right one.
	 * @param {RegExpValidationState} state the validation state
	 * @returns {void}
	 */
	validateRegExpPattern(state) {
		loadRegExpValidator().RegExpValidator.prototype.validateRegExpPattern.call(
			this,
			state
		);
	}

	/** @returns {void} */
	readRegexp() {
		let escaped;
		let inClass;
		const start = this.pos;
		for (;;) {
			if (this.pos >= this.input.length) {
				this.raise(start, "Unterminated regular expression");
			}
			const ch = this.input.charAt(this.pos);
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
		const pattern = this.input.slice(start, this.pos);
		++this.pos;
		const flagsStart = this.pos;
		const flags = this.readWord1();
		if (this.containsEsc) this.unexpected(flagsStart);

		const state =
			this.regexpState ||
			(this.regexpState = new (loadRegExpValidator().RegExpValidationState)(
				this
			));
		state.reset(start, pattern, flags);
		this.validateRegExpFlags(state);
		this.validateRegExpPattern(state);

		// ESTree asks for a null value where the host cannot build the pattern.
		/** @type {RegExp | null} */
		let value = null;
		try {
			value = new RegExp(pattern, flags);
		} catch (_err) {
			// Left null, as ESTree requires.
		}

		this.finishToken(tokTypes.regexp, { pattern, flags, value });
	}

	/**
	 * Read digits in the given radix, or `null` where none were there or the
	 * count did not match what an escape asked for.
	 * @param {number} radix the base to read in
	 * @param {number=} len exactly how many digits to read
	 * @param {boolean=} maybeLegacyOctalNumericLiteral whether a leading zero makes it octal
	 * @returns {number | null} the value
	 */
	readInt(radix, len, maybeLegacyOctalNumericLiteral) {
		// Separators are a numeric-literal feature, so an escape sequence, which
		// states its own length, never allows them.
		const allowSeparators = this.options.ecmaVersion >= 12 && len === undefined;
		const isLegacyOctalNumericLiteral =
			maybeLegacyOctalNumericLiteral && this.input.charCodeAt(this.pos) === 48;

		const start = this.pos;
		let total = 0;
		let lastCode = 0;
		for (
			let i = 0, e = len === null || len === undefined ? Infinity : len;
			i < e;
			++i, ++this.pos
		) {
			const code = this.input.charCodeAt(this.pos);
			let val;

			if (allowSeparators && code === 95) {
				if (isLegacyOctalNumericLiteral) {
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
		if (
			this.pos === start ||
			(len !== null && len !== undefined && this.pos - start !== len)
		) {
			return null;
		}

		return total;
	}

	/**
	 * @param {number} radix the base the prefix names
	 * @returns {void}
	 */
	readRadixNumber(radix) {
		const start = this.pos;
		this.pos += 2;
		/** @type {number | bigint | null} */
		let val = this.readInt(radix);
		if (val === null || val === undefined) {
			this.raise(this.start + 2, `Expected number in radix ${radix}`);
		}
		if (
			this.options.ecmaVersion >= 11 &&
			this.input.charCodeAt(this.pos) === 110
		) {
			val = stringToBigInt(this.input.slice(start, this.pos));
			++this.pos;
		} else if (isIdentifierStart(this.fullCharCodeAtPos(), true)) {
			this.raise(this.pos, "Identifier directly after number");
		}
		this.finishToken(tokTypes.num, val);
	}

	/**
	 * @param {boolean} startsWithDot whether the literal opened with `.`
	 * @returns {void}
	 */
	readNumber(startsWithDot) {
		const start = this.pos;
		// Read on a digit, so the integer part has one digit at least.
		if (!startsWithDot) this.readInt(10, undefined, true);
		let octal = this.pos - start >= 2 && this.input.charCodeAt(start) === 48;
		if (octal && this.strict) this.raise(start, "Invalid number");
		let next = this.input.charCodeAt(this.pos);
		if (
			!octal &&
			!startsWithDot &&
			this.options.ecmaVersion >= 11 &&
			next === 110
		) {
			const bigVal = stringToBigInt(this.input.slice(start, this.pos));
			++this.pos;
			if (isIdentifierStart(this.fullCharCodeAtPos(), true)) {
				this.raise(this.pos, "Identifier directly after number");
			}
			this.finishToken(tokTypes.num, bigVal);
			return;
		}
		if (octal && /[89]/.test(this.input.slice(start, this.pos))) octal = false;
		if (next === 46 && !octal) {
			++this.pos;
			this.readInt(10);
			next = this.input.charCodeAt(this.pos);
		}
		if ((next === 69 || next === 101) && !octal) {
			next = this.input.charCodeAt(++this.pos);
			if (next === 43 || next === 45) ++this.pos;
			if (this.readInt(10) === null) this.raise(start, "Invalid number");
		}
		if (isIdentifierStart(this.fullCharCodeAtPos(), true)) {
			this.raise(this.pos, "Identifier directly after number");
		}

		const val = stringToNumber(this.input.slice(start, this.pos), octal);
		this.finishToken(tokTypes.num, val);
	}

	/** @returns {number} the code point an escape names */
	readCodePoint() {
		const ch = this.input.charCodeAt(this.pos);
		let code;

		if (ch === 123) {
			if (this.options.ecmaVersion < 6) this.unexpected();
			const codePos = ++this.pos;
			code = this.readHexChar(this.input.indexOf("}", this.pos) - this.pos);
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
	 * @param {number} quote which quote opened the string
	 * @returns {void}
	 */
	readString(quote) {
		let out = "";
		let chunkStart = ++this.pos;
		for (;;) {
			if (this.pos >= this.input.length) {
				this.raise(this.start, "Unterminated string constant");
			}
			const ch = this.input.charCodeAt(this.pos);
			if (ch === quote) break;
			if (ch === 92) {
				out += this.input.slice(chunkStart, this.pos);
				out += this.readEscapedChar(false);
				chunkStart = this.pos;
			} else if (ch === 0x2028 || ch === 0x2029) {
				if (this.options.ecmaVersion < 10) {
					this.raise(this.start, "Unterminated string constant");
				}
				++this.pos;
				if (this.options.locations) {
					this.curLine++;
					this.lineStart = this.pos;
				}
			} else {
				if (isNewLine(ch)) {
					this.raise(this.start, "Unterminated string constant");
				}
				++this.pos;
			}
		}
		out += this.input.slice(chunkStart, this.pos++);
		this.finishToken(tokTypes.string, out);
	}

	/** @returns {void} */
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
	 * Report a bad escape, unless it sits in a tagged template, where the raw
	 * text is still well-formed and only the cooked value is lost.
	 * @param {number} position where the escape is
	 * @param {string} message what is wrong
	 * @returns {void}
	 */
	invalidStringToken(position, message) {
		if (this.inTemplateElement && this.options.ecmaVersion >= 9) {
			throw INVALID_TEMPLATE_ESCAPE_ERROR;
		}
		this.raise(position, message);
	}

	/** @returns {void} */
	readTmplToken() {
		let out = "";
		let chunkStart = this.pos;
		for (;;) {
			if (this.pos >= this.input.length) {
				this.raise(this.start, "Unterminated template");
			}
			const ch = this.input.charCodeAt(this.pos);
			if (
				ch === 96 ||
				(ch === 36 && this.input.charCodeAt(this.pos + 1) === 123)
			) {
				if (
					this.pos === this.start &&
					(this.type === tokTypes.template ||
						this.type === tokTypes.invalidTemplate)
				) {
					if (ch === 36) {
						this.pos += 2;
						this.finishToken(tokTypes.dollarBraceL);
						return;
					}
					++this.pos;
					this.finishToken(tokTypes.backQuote);
					return;
				}
				out += this.input.slice(chunkStart, this.pos);
				this.finishToken(tokTypes.template, out);
				return;
			}
			if (ch === 92) {
				out += this.input.slice(chunkStart, this.pos);
				out += this.readEscapedChar(true);
				chunkStart = this.pos;
			} else if (isNewLine(ch)) {
				out += this.input.slice(chunkStart, this.pos);
				++this.pos;
				switch (ch) {
					case 13:
						if (this.input.charCodeAt(this.pos) === 10) ++this.pos;
					// falls through
					case 10:
						out += "\n";
						break;
					default:
						out += String.fromCharCode(ch);
						break;
				}
				if (this.options.locations) {
					++this.curLine;
					this.lineStart = this.pos;
				}
				chunkStart = this.pos;
			} else {
				++this.pos;
			}
		}
	}

	/** @returns {void} */
	readInvalidTemplateToken() {
		for (; this.pos < this.input.length; this.pos++) {
			switch (this.input[this.pos]) {
				case "\\":
					++this.pos;
					break;

				case "$":
					if (this.input[this.pos + 1] !== "{") break;
				// falls through
				case "`":
					this.finishToken(
						tokTypes.invalidTemplate,
						this.input.slice(this.start, this.pos)
					);
					return;

				case "\r":
					if (this.input[this.pos + 1] === "\n") ++this.pos;
				// falls through
				case "\n":
				case "\u2028":
				case "\u2029":
					++this.curLine;
					this.lineStart = this.pos + 1;
					break;
			}
		}
		this.raise(this.start, "Unterminated template");
	}

	/**
	 * @param {boolean} inTemplate whether the escape sits in a template
	 * @returns {string} what the escape stands for
	 */
	readEscapedChar(inTemplate) {
		let ch = this.input.charCodeAt(++this.pos);
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
				return "\v";
			case 102:
				return "\f";
			case 13:
				if (this.input.charCodeAt(this.pos) === 10) ++this.pos;
			// falls through
			case 10:
				if (this.options.locations) {
					this.lineStart = this.pos;
					++this.curLine;
				}
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
						/^[0-7]+/.exec(this.input.slice(this.pos - 1, this.pos + 2))
					)[0];
					let octal = Number.parseInt(octalStr, 8);
					if (octal > 255) {
						octalStr = octalStr.slice(0, -1);
						octal = Number.parseInt(octalStr, 8);
					}
					this.pos += octalStr.length - 1;
					ch = this.input.charCodeAt(this.pos);
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
				if (isNewLine(ch)) {
					// A line terminator after a backslash is dropped, in both strings
					// and templates.
					if (this.options.locations) {
						this.lineStart = this.pos;
						++this.curLine;
					}
					return "";
				}
				return String.fromCharCode(ch);
		}
	}

	/**
	 * @param {number} len how many hex digits the escape has
	 * @returns {number} the value they name
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
	 * Read an identifier's text, recording in `containsEsc` whether any of it
	 * was written as an escape - which stops it reading as a keyword.
	 * @returns {string} the identifier
	 */
	readWord1() {
		this.containsEsc = false;
		let word = "";
		let first = true;
		let chunkStart = this.pos;
		const astral = this.options.ecmaVersion >= 6;
		while (this.pos < this.input.length) {
			const ch = this.fullCharCodeAtPos();
			if (isIdentifierChar(ch, astral)) {
				this.pos += ch <= 0xffff ? 1 : 2;
			} else if (ch === 92) {
				this.containsEsc = true;
				word += this.input.slice(chunkStart, this.pos);
				const escStart = this.pos;
				if (this.input.charCodeAt(++this.pos) !== 117) {
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
		return word + this.input.slice(chunkStart, this.pos);
	}

	/** @returns {void} */
	readWord() {
		const word = this.readWord1();
		let type = tokTypes.name;
		if (this.keywords.test(word)) type = keywordTypes[word];
		this.finishToken(type, word);
	}
}

/**
 * @param {string} str the literal's text
 * @param {boolean} isLegacyOctalNumericLiteral whether a leading zero makes it octal
 * @returns {number} its value
 */
const stringToNumber = (str, isLegacyOctalNumericLiteral) => {
	if (isLegacyOctalNumericLiteral) return Number.parseInt(str, 8);

	// `parseFloat` stops at the first separator, so they come out first.
	return Number.parseFloat(str.replace(/_/g, ""));
};

// Thrown to unwind out of a template element whose escape is bad, so the raw
// text can be re-read without cooking it.

// Token-specific context updates. A closing brace or paren pops what its
// opener pushed, and a `{` is only a block where `braceIsBlock` says so.
/**
 * @this {JavascriptTokenizer}
 * @returns {void}
 */
function closeBraceOrParenContext() {
	if (this.context.length === 1) {
		this.exprAllowed = true;
		return;
	}
	let out = this.context.pop();
	if (out === tokContexts.bStat && this.curContext().token === "function") {
		out = this.context.pop();
	}
	this.exprAllowed = !(/** @type {TokContext} */ (out).isExpr);
}

/**
 * @this {JavascriptTokenizer}
 * @param {TokenType} prevType the token before this one
 * @returns {void}
 */
function braceLContext(prevType) {
	this.context.push(
		this.braceIsBlock(prevType) ? tokContexts.bStat : tokContexts.bExpr
	);
	this.exprAllowed = true;
}

/**
 * @this {JavascriptTokenizer}
 * @returns {void}
 */
function dollarBraceLContext() {
	this.context.push(tokContexts.bTmpl);
	this.exprAllowed = true;
}

/**
 * @this {JavascriptTokenizer}
 * @param {TokenType} prevType the token before this one
 * @returns {void}
 */
function parenLContext(prevType) {
	const statementParens =
		prevType === tokTypes._if ||
		prevType === tokTypes._for ||
		prevType === tokTypes._with ||
		prevType === tokTypes._while;
	this.context.push(statementParens ? tokContexts.pStat : tokContexts.pExpr);
	this.exprAllowed = true;
}

/**
 * `++`/`--` leaves `exprAllowed` as it stands, since it reads as either a
 * prefix or a postfix operator.
 * @returns {void}
 */
function incDecContext() {}

/**
 * @this {JavascriptTokenizer}
 * @param {TokenType} prevType the token before this one
 * @returns {void}
 */
function functionOrClassContext(prevType) {
	if (
		prevType.beforeExpr &&
		prevType !== tokTypes._else &&
		(prevType !== tokTypes.semi || this.curContext() === tokContexts.pStat) &&
		!(
			prevType === tokTypes._return &&
			lineBreak.test(this.input.slice(this.lastTokEnd, this.start))
		) &&
		!(
			(prevType === tokTypes.colon || prevType === tokTypes.braceL) &&
			this.curContext() === tokContexts.bStat
		)
	) {
		this.context.push(tokContexts.fExpr);
	} else {
		this.context.push(tokContexts.fStat);
	}
	this.exprAllowed = false;
}

/**
 * @this {JavascriptTokenizer}
 * @returns {void}
 */
function colonContext() {
	if (this.curContext().token === "function") this.context.pop();
	this.exprAllowed = true;
}

/**
 * @this {JavascriptTokenizer}
 * @returns {void}
 */
function backQuoteContext() {
	if (this.curContext() === tokContexts.qTmpl) this.context.pop();
	else this.context.push(tokContexts.qTmpl);
	this.exprAllowed = false;
}

/**
 * @this {JavascriptTokenizer}
 * @param {TokenType} prevType the token before this one
 * @returns {void}
 */
function starContext(prevType) {
	if (prevType === tokTypes._function) {
		const index = this.context.length - 1;
		this.context[index] =
			this.context[index] === tokContexts.fExpr
				? tokContexts.fExprGen
				: tokContexts.fGen;
	}
	this.exprAllowed = true;
}

/**
 * A name allows an expression after it only where it was `of` or a `yield`
 * that the enclosing generator makes an operator. A parse reads the `of` of a
 * `for` head itself, so there it guesses nothing.
 * @this {JavascriptTokenizer}
 * @param {TokenType} prevType the token before this one
 * @returns {void}
 */
function nameContext(prevType) {
	let allowed = false;
	if (
		this.options.ecmaVersion >= 6 &&
		prevType !== tokTypes.dot &&
		prevType !== tokTypes.questionDot &&
		((this.value === "of" && !this.exprAllowed && !this.parsing) ||
			(this.value === "yield" && this.inGeneratorContext()))
	) {
		allowed = true;
	}
	this.exprAllowed = allowed;
}

tokTypes.parenR.updateContext = closeBraceOrParenContext;

tokTypes.braceR.updateContext = closeBraceOrParenContext;

tokTypes.braceL.updateContext = braceLContext;

tokTypes.dollarBraceL.updateContext = dollarBraceLContext;

tokTypes.parenL.updateContext = parenLContext;

tokTypes.incDec.updateContext = incDecContext;

tokTypes._function.updateContext = functionOrClassContext;

tokTypes._class.updateContext = functionOrClassContext;

tokTypes.colon.updateContext = colonContext;

tokTypes.backQuote.updateContext = backQuoteContext;

tokTypes.star.updateContext = starContext;

tokTypes.name.updateContext = nameContext;

/**
 * acorn's `stringToBigInt`, minus the pre-BigInt fallback (every supported
 * Node has `BigInt`).
 * @param {string} str numeric literal text (may contain `_` separators)
 * @returns {bigint} bigint value
 */
const stringToBigInt = (str) => BigInt(str.replace(/_/g, ""));

// Mirror of acorn's `INVALID_TEMPLATE_ESCAPE_ERROR`: thrown by the owned
// `invalidStringToken`, caught by identity in the owned `tryReadTemplateToken`.
const INVALID_TEMPLATE_ESCAPE_ERROR = {};

module.exports.INVALID_TEMPLATE_ESCAPE_ERROR = INVALID_TEMPLATE_ESCAPE_ERROR;
module.exports.JavascriptTokenizer = JavascriptTokenizer;
module.exports.ParserSourceLocation = ParserSourceLocation;
module.exports.Position = Position;
module.exports.TokContext = TokContext;
module.exports.Token = Token;
module.exports.TokenType = TokenType;
module.exports.codePointToString = codePointToString;
module.exports.defaultOptions = defaultOptions;
module.exports.getLineInfo = getLineInfo;
module.exports.getOptions = getOptions;
module.exports.isIdentifierChar = isIdentifierChar;
module.exports.isIdentifierStart = isIdentifierStart;
module.exports.isNewLine = isNewLine;
module.exports.keywordLists = keywordLists;
module.exports.keywordOperatorAt = keywordOperatorAt;
module.exports.keywordTypes = keywordTypes;
module.exports.lineBreak = lineBreak;
module.exports.nextLineBreak = nextLineBreak;
module.exports.nonASCIIwhitespace = nonASCIIwhitespace;
module.exports.reservedWords = reservedWords;
module.exports.stringToBigInt = stringToBigInt;
module.exports.stringToNumber = stringToNumber;
module.exports.tokContexts = tokContexts;
module.exports.tokTypes = tokTypes;
module.exports.wordsRegexp = wordsRegexp;
