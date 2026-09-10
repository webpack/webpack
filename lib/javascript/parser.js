/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// cspell:ignore binop prec Prec stanceof Uncapturing iget iset sget sset

const {
	ASTRAL_IDENTIFIER_PART_RANGES,
	ASTRAL_IDENTIFIER_START_RANGES,
	IDENTIFIER_PART_RANGES,
	IDENTIFIER_START_RANGES
} = require("./data");

/** @typedef {{ label: string, keyword?: string, beforeExpr: boolean, startsExpr: boolean, isLoop: boolean, isAssign: boolean, prefix: boolean, postfix: boolean, binop: number | null, updateContext: ((prevType: TokenType) => void) | null }} TokenTypeShape */

/** @typedef {{ line: number, column: number }} PositionLike a position as any caller may state one */
/** @typedef {{ kind?: string | null, name?: string, statementStart?: number }} LabelLike a label in scope, as any caller may hold one */
/** @typedef {{ type: string, start: number, end: number, loc?: EXPECTED_ANY, sourceFile?: string, range?: [number, number] }} NodeLike a node as this parser builds one, whichever fields the options asked for */
/** @typedef {NodeLike & { token: string }} TokenLike */
/** @typedef {{ token: string, isExpr: boolean, preserveSpace?: boolean, override?: EXPECTED_ANY, generator?: boolean }} TokContextLike a tokenizer context, as the owned tokenizer reads one */
/** @typedef {import("estree").Identifier & NodeLike} Identifier */
/** @typedef {import("estree").MetaProperty & NodeLike} MetaProperty */
/** @typedef {NodeLike & { key: Identifier | (import("estree").Literal & NodeLike), value: import("estree").Literal & NodeLike }} ImportAttribute an import attribute, whose key and value carry offsets like every other node */
/** @typedef {import("estree").Program & NodeLike} Program */
/** @typedef {import("estree").ImportExpression & NodeLike} ImportExpression */
/** @typedef {import("estree").ImportSpecifier & NodeLike} ImportSpecifier */
/** @typedef {import("estree").ImportDefaultSpecifier & NodeLike} ImportDefaultSpecifier */
/** @typedef {import("estree").ImportNamespaceSpecifier & NodeLike} ImportNamespaceSpecifier */
/** @typedef {(import("estree").Expression & NodeLike) | (NodeLike & { type: "ParenthesizedExpression", expression: Expression })} Expression an expression node, including the parenthesized one `preserveParens` asks for */
/** @typedef {3 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 | "latest"} EcmaVersion the ECMAScript versions the parser accepts */
/** @typedef {(isBlock: boolean, text: string, start: number, end: number, startLoc?: Position | null, endLoc?: Position | null) => void} OnComment what the tokenizer calls for each comment */
/**
 * @typedef {object} Options what a caller may ask the parser for
 * @property {EcmaVersion} ecmaVersion which edition to parse
 * @property {("script" | "module" | "commonjs")=} sourceType the goal symbol
 * @property {boolean=} strict whether the code is strict whatever it says
 * @property {((lastTokEnd: number, lastTokEndLoc?: Position | null) => void)=} onInsertedSemicolon called where a semicolon was inserted
 * @property {((lastTokEnd: number, lastTokEndLoc?: Position | null) => void)=} onTrailingComma called at a trailing comma
 * @property {(boolean | "never")=} allowReserved whether reserved words may name things
 * @property {boolean=} allowReturnOutsideFunction whether `return` may sit at the top level
 * @property {boolean=} allowImportExportEverywhere whether module syntax may sit anywhere
 * @property {boolean=} allowAwaitOutsideFunction whether `await` may sit outside a function
 * @property {boolean=} allowSuperOutsideMethod whether `super` may sit outside a method
 * @property {boolean=} allowHashBang whether a leading `#!` line is skipped
 * @property {boolean=} checkPrivateFields whether private names must be declared
 * @property {boolean=} locations whether nodes carry `loc`
 * @property {{ line: number, column: number }=} startLocation where the first offset falls
 * @property {(((token: EXPECTED_ANY) => void) | EXPECTED_ANY[])=} onToken where tokens are reported
 * @property {(OnComment | EXPECTED_ANY[])=} onComment where comments are reported
 * @property {boolean=} ranges whether nodes carry `range`
 * @property {NodeLike=} program a program node to append to
 * @property {string=} sourceFile the name errors and locations carry
 * @property {string=} directSourceFile the name every node carries
 * @property {boolean=} preserveParens whether parentheses become nodes
 */
/**
 * @typedef {object} ResolvedOptions the options once every default is filled in and every alternative spelling is normalized
 * @property {number} ecmaVersion the edition, as the number the parser compares against
 * @property {"script" | "module" | "commonjs"} sourceType the goal symbol
 * @property {boolean} strict whether the code is strict whatever it says
 * @property {((lastTokEnd: number, lastTokEndLoc?: Position | null) => void) | null} onInsertedSemicolon called where a semicolon was inserted
 * @property {((lastTokEnd: number, lastTokEndLoc?: Position | null) => void) | null} onTrailingComma called at a trailing comma
 * @property {boolean | "never"} allowReserved whether reserved words may name things
 * @property {boolean} allowReturnOutsideFunction whether `return` may sit at the top level
 * @property {boolean} allowImportExportEverywhere whether module syntax may sit anywhere
 * @property {boolean} allowAwaitOutsideFunction whether `await` may sit outside a function
 * @property {boolean} allowSuperOutsideMethod whether `super` may sit outside a method
 * @property {boolean} allowHashBang whether a leading `#!` line is skipped
 * @property {boolean} checkPrivateFields whether private names must be declared
 * @property {boolean} locations whether nodes carry `loc`
 * @property {{ line: number, column: number } | null} startLocation where the first offset falls
 * @property {((token: EXPECTED_ANY) => void) | null} onToken where tokens are reported
 * @property {OnComment | null} onComment where comments are reported
 * @property {boolean} ranges whether nodes carry `range`
 * @property {NodeLike | null} program a program node to append to
 * @property {string | null} sourceFile the name errors and locations carry
 * @property {string | null} directSourceFile the name every node carries
 * @property {boolean} preserveParens whether parentheses become nodes
 */

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
const lineBreakG = new RegExp(lineBreak.source, "g");
const nonASCIIwhitespace = /[\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]/;
const skipWhiteSpace = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g;
const loneSurrogate =
	/(?:[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])/;
const keywordRelationalOperator = /^in(stanceof)?$/;

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
 * A cached `^(?:a|b|…)$` matcher for a space-separated word list.
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
	 * @param {((parser: EXPECTED_ANY) => void)=} override how to read the next token
	 * @param {boolean=} generator whether the enclosing function is a generator
	 */
	constructor(token, isExpr, preserveSpace, override, generator) {
		this.token = token;
		this.isExpr = Boolean(isExpr);
		this.preserveSpace = Boolean(preserveSpace);
		this.override = override;
		this.generator = Boolean(generator);
	}
}

const tokContexts = {
	b_stat: new TokContext("{", false),
	b_expr: new TokContext("{", true),
	b_tmpl: new TokContext("${", false),
	p_stat: new TokContext("(", false),
	p_expr: new TokContext("(", true),
	q_tmpl: new TokContext("`", true, true, (parser) =>
		parser.tryReadTemplateToken()
	),
	f_stat: new TokContext("function", false),
	f_expr: new TokContext("function", true),
	f_expr_gen: new TokContext("function", true, false, undefined, true),
	f_gen: new TokContext("function", false, false, undefined, true)
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
class SourceLocation {
	/**
	 * @param {EXPECTED_ANY} p the parser, for its `sourceFile`
	 * @param {PositionLike | null | undefined} start where the node starts
	 * @param {PositionLike | null | undefined} end where it ends
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
	startLocation: null,
	onToken: null,
	onComment: null,
	ranges: false,
	program: null,
	sourceFile: null,
	directSourceFile: null,
	preserveParens: false
};

/**
 * Turn an `onComment` array into the callback the tokenizer calls.
 * @param {EXPECTED_ANY} options the normalized options
 * @param {EXPECTED_ANY[]} array where to push each comment
 * @returns {EXPECTED_ANY} the callback
 */
const pushComment = (options, array) =>
	/**
	 * @this {EXPECTED_ANY}
	 * @param {boolean} block whether it is a block comment
	 * @param {string} text its text
	 * @param {number} start where it starts
	 * @param {number} end where it ends
	 * @param {Position=} startLoc its start position
	 * @param {Position=} endLoc its end position
	 * @returns {void}
	 */
	function pushOneComment(block, text, start, end, startLoc, endLoc) {
		/** @type {EXPECTED_ANY} */
		const comment = {
			type: block ? "Block" : "Line",
			value: text,
			start,
			end
		};
		if (options.locations) {
			comment.loc = new SourceLocation(this, startLoc, endLoc);
		}
		if (options.ranges) comment.range = [start, end];
		array.push(comment);
	};

let warnedAboutEcmaVersion = false;

// Only a pattern the host engine itself rejected reaches the regexp validator,
// so it and its Unicode property tables load on that path alone.
/** @type {typeof import("./regexp") | null} */
let regexpValidator = null;

/**
 * @returns {typeof import("./regexp")} the validator, installed on first use
 */
const loadRegExpValidator = () => {
	if (regexpValidator === null) {
		regexpValidator = require("./regexp");
		regexpValidator.install(Parser);
	}
	return regexpValidator;
};

/**
 * Fill in every option the parser reads, and normalize the two that are stated
 * in more than one way: `ecmaVersion` as a year, and array comment sinks.
 * @param {Partial<Options> | null | undefined} opts what the caller passed
 * @returns {ResolvedOptions} the normalized options
 */
const getOptions = (opts) => {
	/** @type {EXPECTED_ANY} */
	const options = {};
	for (const opt of Object.keys(defaultOptions)) {
		options[opt] =
			opts && Object.prototype.hasOwnProperty.call(opts, opt)
				? /** @type {EXPECTED_ANY} */ (opts)[opt]
				: /** @type {EXPECTED_ANY} */ (defaultOptions)[opt];
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
		options.onToken = (/** @type {EXPECTED_ANY} */ token) => tokens.push(token);
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

// Each scope gets a bitset that may contain these flags.
const SCOPE_TOP = 1;
const SCOPE_FUNCTION = 2;
const SCOPE_ASYNC = 4;
const SCOPE_GENERATOR = 8;
const SCOPE_ARROW = 16;
const SCOPE_SIMPLE_CATCH = 32;
const SCOPE_SUPER = 64;
const SCOPE_DIRECT_SUPER = 128;
const SCOPE_CLASS_STATIC_BLOCK = 256;
const SCOPE_CLASS_FIELD_INIT = 512;
const SCOPE_SWITCH = 1024;
const SCOPE_VAR = SCOPE_TOP | SCOPE_FUNCTION | SCOPE_CLASS_STATIC_BLOCK;

/**
 * @param {boolean} async whether the function is async
 * @param {boolean} generator whether it is a generator
 * @returns {number} the scope flags for its body
 */
const functionFlags = (async, generator) =>
	SCOPE_FUNCTION |
	(async ? SCOPE_ASYNC : 0) |
	(generator ? SCOPE_GENERATOR : 0);

// What kind of binding a name introduces, for `checkLVal*` and `declareName`.
const BIND_NONE = 0;
const BIND_VAR = 1;
const BIND_LEXICAL = 2;
const BIND_FUNCTION = 3;
const BIND_SIMPLE_CATCH = 4;
const BIND_OUTSIDE = 5;

/**
 * One lexical scope, holding the names declared directly in it. Each set is
 * built only once a name goes into it, which most scopes never do.
 */
class Scope {
	/**
	 * @param {number} flags what kind of scope it is
	 */
	constructor(flags) {
		this.flags = flags;
		/** @type {Set<string> | undefined} */
		this.var = undefined;
		/** @type {Set<string> | undefined} */
		this.lexical = undefined;
		/** @type {Set<string> | undefined} */
		this.functions = undefined;
		// The scope's first lexical name: a simple catch scope's parameter, and
		// the only element of `lexical` that anything reads by position.
		/** @type {string | undefined} */
		this.firstLexical = undefined;
	}
}

/** An ESTree node, as this parser builds one. */
class Node {
	/**
	 * @param {Parser} parser the parser building it
	 * @param {number} pos where the node starts
	 * @param {Position=} loc the start position, when locations are tracked
	 */
	constructor(parser, pos, loc) {
		this.type = "";
		this.start = pos;
		this.end = 0;
		if (parser.options.locations) {
			this.loc = new SourceLocation(
				parser,
				/** @type {Position} */ (loc),
				/** @type {EXPECTED_ANY} */ (undefined)
			);
		}
		if (parser.options.directSourceFile) {
			this.sourceFile = parser.options.directSourceFile;
		}
		if (parser.options.ranges) this.range = [pos, 0];
	}
}

/** A token as `options.onToken` receives one. */
class Token {
	/**
	 * @param {EXPECTED_ANY} p the parser, read at its current token
	 */
	constructor(p) {
		this.type = p.type;
		this.value = p.value;
		this.start = p.start;
		this.end = p.end;
		if (p.options.locations) {
			this.loc = new SourceLocation(p, p.startLoc, p.endLoc);
		}
		if (p.options.ranges) this.range = [p.start, p.end];
	}
}

/**
 * Where a shorthand assignment, trailing comma or parenthesized pattern was
 * seen, so the expression parser can raise once it knows whether it is
 * parsing an expression or a binding pattern.
 */
class DestructuringErrors {
	constructor() {
		this.shorthandAssign = -1;
		this.trailingComma = -1;
		this.parenthesizedAssign = -1;
		this.parenthesizedBind = -1;
		this.doubleProto = -1;
	}
}

/** A label in scope, and what may jump to it. */
class Label {
	/**
	 * @param {string | null} kind what the label names
	 * @param {string=} name the label's own name
	 * @param {number=} statementStart where the labelled statement starts
	 */
	constructor(kind, name, statementStart) {
		/** @type {string | null | undefined} */
		this.kind = kind;
		/** @type {string | undefined} */
		this.name = name;
		/** @type {number | undefined} */
		this.statementStart = statementStart;
	}
}

/** @type {EXPECTED_ANY[]} */
const empty = [];

const loopLabel = new Label("loop");
const switchLabel = new Label("switch");

// How a function declaration was reached, which decides whether it may be
// unnamed and whether its name binds in the enclosing scope.
const FUNC_STATEMENT = 1;
const FUNC_HANGING_STATEMENT = 2;
const FUNC_NULLABLE_ID = 4;

// A directive prologue entry, used to spot `"use strict"` before parsing.
const literalDirective = /^(?:'((?:\\[^]|[^'\\])*?)'|"((?:\\[^]|[^"\\])*?)")/;

/**
 * The ECMAScript parser webpack owns, ported from acorn 8.18.0 so the bundler
 * ships no parser dependency. `lib/javascript/syntax.js` subclasses it and
 * overrides the hot paths.
 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/state.js
 */
class Parser {
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
			/** @type {EXPECTED_ANY} */ (keywordLists)[
				resolved.ecmaVersion >= 6
					? 6
					: resolved.sourceType === "module"
						? "5module"
						: 5
			]
		);
		let reserved = "";
		if (resolved.allowReserved !== true) {
			reserved = /** @type {EXPECTED_ANY} */ (reservedWords)[
				resolved.ecmaVersion >= 6 ? 6 : resolved.ecmaVersion === 5 ? 5 : 3
			];
			if (resolved.sourceType === "module") reserved += " await";
		}
		this.reservedWords = wordsRegexp(reserved);
		const reservedStrict = `${reserved ? `${reserved} ` : ""}${reservedWords.strict}`;
		this.reservedWordsStrict = wordsRegexp(reservedStrict);
		this.reservedWordsStrictBind = wordsRegexp(
			`${reservedStrict} ${reservedWords.strictBind}`
		);
		this.input = String(input);

		// Whether the last `readWord1` saw an escape, which stops a word from
		// reading as a keyword.
		this.containsEsc = false;

		this.pos = startPos || 0;
		this.curLine = 1;
		if (resolved.startLocation) {
			this.lineStart = this.pos - resolved.startLocation.column;
			this.curLine = resolved.startLocation.line;
		} else if (startPos) {
			this.lineStart = this.input.lastIndexOf("\n", startPos - 1) + 1;
			if (resolved.locations) {
				this.curLine = this.input
					.slice(0, this.lineStart)
					.split(lineBreak).length;
			}
		} else {
			this.lineStart = 0;
		}

		this.type = tokTypes.eof;
		/** @type {EXPECTED_ANY} */
		this.value = null;
		// acorn writes each pair through one chained assignment, so the second
		// name of each is the slot created first
		this.end = this.pos;
		this.start = this.pos;
		/** @type {Position | undefined} */
		this.endLoc = this.curPosition();
		/** @type {Position | undefined} */
		this.startLoc = this.endLoc;

		/** @type {Position | null | undefined} */
		this.lastTokStartLoc = null;
		/** @type {Position | null | undefined} */
		this.lastTokEndLoc = null;
		this.lastTokEnd = this.pos;
		this.lastTokStart = this.pos;

		// Enough syntactic context to tell a regexp apart from a division.
		/** @type {TokContextLike[]} */
		this.context = this.initialContext();
		this.exprAllowed = true;

		this.inModule = resolved.sourceType === "module";
		this.strict =
			this.inModule ||
			resolved.strict === true ||
			this.strictDirective(this.pos);

		this.potentialArrowAt = -1;
		this.potentialArrowInForAwait = false;

		// Where a `yield`/`await` was seen, to check once it is known whether the
		// surrounding parameters were defaults.
		this.awaitIdentPos = 0;
		this.awaitPos = 0;
		this.yieldPos = 0;
		/** @type {LabelLike[]} */
		this.labels = [];
		/** @type {Record<string, NodeLike>} */
		this.undefinedExports = Object.create(null);

		if (
			this.pos === 0 &&
			resolved.allowHashBang &&
			this.input.slice(0, 2) === "#!"
		) {
			this.skipLineComment(2);
		}

		/** @type {Scope[]} */
		this.scopeStack = [];
		this.enterScope(
			resolved.sourceType === "commonjs" ? SCOPE_FUNCTION : SCOPE_TOP
		);

		/** @type {import("./regexp").RegExpValidationState | null} */
		this.regexpState = null;

		/** @type {EXPECTED_ANY[]} */
		this.privateNameStack = [];
	}

	/**
	 * @returns {EXPECTED_ANY} the parsed program
	 */
	parse() {
		const node = this.options.program || this.startNode();
		this.nextToken();
		return this.catchStackOverflow(() => this.parseTopLevel(node));
	}

	/** @returns {boolean} whether the innermost var scope is a function */
	get inFunction() {
		return (this.currentVarScope().flags & SCOPE_FUNCTION) > 0;
	}

	/** @returns {boolean} whether the innermost var scope is a generator */
	get inGenerator() {
		return (this.currentVarScope().flags & SCOPE_GENERATOR) > 0;
	}

	/** @returns {boolean} whether the innermost var scope is async */
	get inAsync() {
		return (this.currentVarScope().flags & SCOPE_ASYNC) > 0;
	}

	/** @returns {boolean} whether `await` is an operator here */
	get canAwait() {
		for (let i = this.scopeStack.length - 1; i >= 0; i--) {
			const { flags } = this.scopeStack[i];
			if (flags & (SCOPE_CLASS_STATIC_BLOCK | SCOPE_CLASS_FIELD_INIT)) {
				return false;
			}
			if (flags & SCOPE_FUNCTION) return (flags & SCOPE_ASYNC) > 0;
		}
		return Boolean(
			(this.inModule && this.options.ecmaVersion >= 13) ||
			this.options.allowAwaitOutsideFunction
		);
	}

	/** @returns {boolean} whether `return` is allowed here */
	get allowReturn() {
		if (this.inFunction) return true;
		if (
			this.options.allowReturnOutsideFunction &&
			this.currentVarScope().flags & SCOPE_TOP
		) {
			return true;
		}
		return false;
	}

	/** @returns {boolean} whether `super` may be referenced here */
	get allowSuper() {
		const { flags } = this.currentThisScope();
		return Boolean(
			(flags & SCOPE_SUPER) > 0 || this.options.allowSuperOutsideMethod
		);
	}

	/** @returns {boolean} whether `super()` may be called here */
	get allowDirectSuper() {
		return (this.currentThisScope().flags & SCOPE_DIRECT_SUPER) > 0;
	}

	/** @returns {boolean | number} whether function declarations bind like `var` here */
	get treatFunctionsAsVar() {
		return this.treatFunctionsAsVarInScope(this.currentScope());
	}

	/** @returns {boolean} whether `new.target` may be referenced here */
	get allowNewDotTarget() {
		for (let i = this.scopeStack.length - 1; i >= 0; i--) {
			const { flags } = this.scopeStack[i];
			if (
				flags & (SCOPE_CLASS_STATIC_BLOCK | SCOPE_CLASS_FIELD_INIT) ||
				(flags & SCOPE_FUNCTION && !(flags & SCOPE_ARROW))
			) {
				return true;
			}
		}
		return false;
	}

	/** @returns {boolean} whether a `using` declaration may appear here */
	get allowUsing() {
		const { flags } = this.currentScope();
		if (flags & SCOPE_SWITCH) return false;
		if (!this.inModule && flags & SCOPE_TOP) return false;
		return true;
	}

	/** @returns {boolean} whether the innermost var scope is a class static block */
	get inClassStaticBlock() {
		return (this.currentVarScope().flags & SCOPE_CLASS_STATIC_BLOCK) > 0;
	}

	/**
	 * @param {...((parser: EXPECTED_ANY) => EXPECTED_ANY)} plugins the plugins to apply
	 * @returns {EXPECTED_ANY} the extended parser class
	 */
	static extend(...plugins) {
		/** @type {EXPECTED_ANY} */
		let cls = this;
		for (let i = 0; i < plugins.length; i++) cls = plugins[i](cls);
		return cls;
	}

	/**
	 * @param {string} input the source text
	 * @param {Partial<Options>=} options parser options
	 * @returns {Program} the parsed program
	 */
	static parse(input, options) {
		return new this(options, input).parse();
	}

	/**
	 * @param {string} input the source text
	 * @param {number} pos where the expression starts
	 * @param {Partial<Options>=} options parser options
	 * @returns {Expression} the parsed expression
	 */
	static parseExpressionAt(input, pos, options) {
		const parser = new this(options, input, pos);
		parser.nextToken();
		return parser.parseExpression();
	}

	/**
	 * @param {string} input the source text
	 * @param {Partial<Options>=} options parser options
	 * @returns {Parser} a parser positioned before the first token
	 */
	static tokenizer(input, options) {
		return new this(options, input);
	}

	/**
	 * Whether a directive prologue starting at `start` opens with `"use strict"`.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/parseutil.js
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
							(next === "!" && this.input.charAt(end + 1) === "=")
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
	 * @param {TokenType} type the token type to consume
	 * @returns {boolean} whether it was consumed
	 */
	eat(type) {
		if (this.type === type) {
			this.next();
			return true;
		}
		return false;
	}

	/**
	 * @param {string} name the contextual keyword
	 * @returns {boolean} whether the current token is that keyword
	 */
	isContextual(name) {
		return (
			this.type === tokTypes.name && this.value === name && !this.containsEsc
		);
	}

	/**
	 * @param {string} name the contextual keyword
	 * @returns {boolean} whether it was consumed
	 */
	eatContextual(name) {
		if (!this.isContextual(name)) return false;
		this.next();
		return true;
	}

	/**
	 * Turn the host's stack overflow into a parse error, since a deeply nested
	 * expression is an input the caller can act on rather than a crash.
	 * @template T
	 * @param {() => T} f the work to run
	 * @returns {T} whatever it returned
	 */
	catchStackOverflow(f) {
		try {
			return f();
		} catch (err) {
			if (
				err instanceof Error &&
				(/\bstack\b.*\b(exceeded|overflow)\b/i.test(err.message) ||
					/\btoo much recursion\b/i.test(err.message))
			) {
				this.raise(this.start, "Not enough stack space to parse input");
			}
			throw err;
		}
	}

	/**
	 * @param {string} name the contextual keyword that must follow
	 * @returns {void}
	 */
	expectContextual(name) {
		if (!this.eatContextual(name)) this.unexpected();
	}

	/** @returns {boolean} whether a semicolon may be inserted here */
	canInsertSemicolon() {
		return (
			this.type === tokTypes.eof ||
			this.type === tokTypes.braceR ||
			lineBreak.test(this.input.slice(this.lastTokEnd, this.start))
		);
	}

	/** @returns {boolean | undefined} whether one was inserted */
	insertSemicolon() {
		if (this.canInsertSemicolon()) {
			if (this.options.onInsertedSemicolon) {
				this.options.onInsertedSemicolon(this.lastTokEnd, this.lastTokEndLoc);
			}
			return true;
		}
	}

	/** @returns {void} */
	semicolon() {
		if (!this.eat(tokTypes.semi) && !this.insertSemicolon()) this.unexpected();
	}

	/**
	 * @param {TokenType} tokType the token that may close the list
	 * @param {boolean=} notNext whether to leave the token unconsumed
	 * @returns {boolean | undefined} whether a trailing comma was accepted
	 */
	afterTrailingComma(tokType, notNext) {
		if (this.type === tokType) {
			if (this.options.onTrailingComma) {
				this.options.onTrailingComma(this.lastTokStart, this.lastTokStartLoc);
			}
			if (!notNext) this.next();
			return true;
		}
	}

	/**
	 * @param {TokenType} type the token type that must follow
	 * @returns {void}
	 */
	expect(type) {
		if (!this.eat(type)) this.unexpected();
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

	/**
	 * @param {EXPECTED_ANY} refDestructuringErrors what the expression parser recorded
	 * @param {boolean=} isAssign whether the target is an assignment
	 * @returns {void}
	 */
	checkPatternErrors(refDestructuringErrors, isAssign) {
		if (!refDestructuringErrors) return;
		if (refDestructuringErrors.trailingComma > -1) {
			this.raiseRecoverable(
				refDestructuringErrors.trailingComma,
				"Comma is not permitted after the rest element"
			);
		}
		const parens = isAssign
			? refDestructuringErrors.parenthesizedAssign
			: refDestructuringErrors.parenthesizedBind;
		if (parens > -1) {
			this.raiseRecoverable(
				parens,
				isAssign ? "Assigning to rvalue" : "Parenthesized pattern"
			);
		}
	}

	/**
	 * @param {EXPECTED_ANY} refDestructuringErrors what the expression parser recorded
	 * @param {boolean=} andThrow whether to raise rather than report
	 * @returns {boolean | undefined} whether anything was recorded
	 */
	checkExpressionErrors(refDestructuringErrors, andThrow) {
		if (!refDestructuringErrors) return false;
		const { shorthandAssign, doubleProto } = refDestructuringErrors;
		if (!andThrow) return shorthandAssign >= 0 || doubleProto >= 0;
		if (shorthandAssign >= 0) {
			this.raise(
				shorthandAssign,
				"Shorthand property assignments are valid only in destructuring patterns"
			);
		}
		if (doubleProto >= 0) {
			this.raiseRecoverable(doubleProto, "Redefinition of __proto__ property");
		}
	}

	/** @returns {void} */
	checkYieldAwaitInDefaultParams() {
		if (this.yieldPos && (!this.awaitPos || this.yieldPos < this.awaitPos)) {
			this.raise(this.yieldPos, "Yield expression cannot be a default value");
		}
		if (this.awaitPos) {
			this.raise(this.awaitPos, "Await expression cannot be a default value");
		}
	}

	/**
	 * @param {EXPECTED_ANY} expr the expression to test
	 * @returns {boolean} whether it may be assigned to without destructuring
	 */
	isSimpleAssignTarget(expr) {
		if (expr.type === "ParenthesizedExpression") {
			return this.isSimpleAssignTarget(expr.expression);
		}
		return expr.type === "Identifier" || expr.type === "MemberExpression";
	}

	/**
	 * Read statements until the end of input and wrap them in a `Program`.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {EXPECTED_ANY} node the program node to fill
	 * @returns {EXPECTED_ANY} the finished program
	 */
	parseTopLevel(node) {
		const exports = Object.create(null);
		if (!node.body) node.body = [];
		while (this.type !== tokTypes.eof) {
			const stmt = this.parseStatement(null, true, exports);
			node.body.push(stmt);
		}
		if (this.inModule) {
			for (const name of Object.keys(this.undefinedExports)) {
				this.raiseRecoverable(
					this.undefinedExports[name].start,
					`Export '${name}' is not defined`
				);
			}
		}
		this.adaptDirectivePrologue(node.body);
		this.next();
		node.sourceType =
			this.options.sourceType === "commonjs"
				? "script"
				: this.options.sourceType;
		return this.finishNode(node, "Program");
	}

	/**
	 * Whether a `let` here opens a lexical declaration rather than naming a
	 * variable, which needs a look-ahead past the keyword.
	 * @param {string | null=} context the statement context
	 * @returns {boolean} whether it declares
	 */
	isLet(context) {
		if (this.options.ecmaVersion < 6 || !this.isContextual("let")) return false;
		skipWhiteSpace.lastIndex = this.pos;
		const skip = /** @type {RegExpExecArray} */ (
			skipWhiteSpace.exec(this.input)
		);
		let next = this.pos + skip[0].length;
		let nextCh = this.fullCharCodeAt(next);
		// `[` and `\` are an explicit negative look-ahead for an expression
		// statement, so they declare even where only a statement is allowed.
		if (nextCh === 91 || nextCh === 92) return true;
		if (context) return false;

		if (nextCh === 123) return true;
		if (isIdentifierStart(nextCh, true)) {
			const start = next;
			do {
				next += nextCh <= 0xffff ? 1 : 2;
				nextCh = this.fullCharCodeAt(next);
			} while (isIdentifierChar(nextCh, true));
			if (nextCh === 92) return true;
			const ident = this.input.slice(start, next);
			if (!keywordRelationalOperator.test(ident)) return true;
		}
		return false;
	}

	/**
	 * Whether `async` here heads a function declaration, which no line break may
	 * separate from the `function` keyword.
	 * @returns {boolean} whether it does
	 */
	isAsyncFunction() {
		if (this.options.ecmaVersion < 8 || !this.isContextual("async")) {
			return false;
		}

		skipWhiteSpace.lastIndex = this.pos;
		const skip = /** @type {RegExpExecArray} */ (
			skipWhiteSpace.exec(this.input)
		);
		const next = this.pos + skip[0].length;
		let after;
		return (
			!lineBreak.test(this.input.slice(this.pos, next)) &&
			this.input.slice(next, next + 8) === "function" &&
			(next + 8 === this.input.length ||
				!(
					isIdentifierChar((after = this.fullCharCodeAt(next + 8)), true) ||
					after === 92
				))
		);
	}

	/**
	 * Whether `using` (or `await using`) here heads a declaration rather than
	 * naming a variable.
	 * @param {boolean} isAwaitUsing whether the `await` form is being tested
	 * @param {boolean=} isFor whether this is the head of a `for` statement
	 * @returns {boolean} whether it declares
	 */
	isUsingKeyword(isAwaitUsing, isFor) {
		if (
			this.options.ecmaVersion < 17 ||
			!this.isContextual(isAwaitUsing ? "await" : "using")
		) {
			return false;
		}

		skipWhiteSpace.lastIndex = this.pos;
		const skip = /** @type {RegExpExecArray} */ (
			skipWhiteSpace.exec(this.input)
		);
		let next = this.pos + skip[0].length;

		if (lineBreak.test(this.input.slice(this.pos, next))) return false;

		if (isAwaitUsing) {
			const usingEndPos = next + 5;
			let after;
			if (
				this.input.slice(next, usingEndPos) !== "using" ||
				usingEndPos === this.input.length ||
				isIdentifierChar((after = this.fullCharCodeAt(usingEndPos)), true) ||
				after === 92
			) {
				return false;
			}

			skipWhiteSpace.lastIndex = usingEndPos;
			const skipAfterUsing = /** @type {RegExpExecArray} */ (
				skipWhiteSpace.exec(this.input)
			);
			next = usingEndPos + skipAfterUsing[0].length;
			if (
				skipAfterUsing &&
				lineBreak.test(this.input.slice(usingEndPos, next))
			) {
				return false;
			}
		}

		let ch = this.fullCharCodeAt(next);
		if (!isIdentifierStart(ch, true) && ch !== 92) return false;
		const idStart = next;
		do {
			next += ch <= 0xffff ? 1 : 2;
			ch = this.fullCharCodeAt(next);
		} while (isIdentifierChar(ch, true));
		if (ch === 92) return true;
		const id = this.input.slice(idStart, next);
		if (keywordRelationalOperator.test(id)) return false;
		if (isFor && !isAwaitUsing && id === "of") {
			// `for (using of = …)` declares; `for (using of x)` iterates, so the
			// `=` that separates them decides, and `==`/`=>` are not it.
			skipWhiteSpace.lastIndex = next;
			const skipAfterOf = /** @type {RegExpExecArray} */ (
				skipWhiteSpace.exec(this.input)
			);
			next += skipAfterOf[0].length;
			if (
				this.input.charCodeAt(next) !== 61 ||
				(ch = this.input.charCodeAt(next + 1)) === 61 ||
				ch === 62
			) {
				return false;
			}
		}
		return true;
	}

	/**
	 * @param {boolean=} isFor whether this is the head of a `for` statement
	 * @returns {boolean} whether `await using` heads a declaration
	 */
	isAwaitUsing(isFor) {
		return this.isUsingKeyword(true, isFor);
	}

	/**
	 * @param {boolean=} isFor whether this is the head of a `for` statement
	 * @returns {boolean} whether `using` heads a declaration
	 */
	isUsing(isFor) {
		return this.isUsingKeyword(false, isFor);
	}

	/**
	 * Read one statement. A statement head that is only a keyword by position —
	 * `let`, `async`, `using` — is settled by the probes above.
	 * @param {string | null=} context what encloses the statement
	 * @param {boolean=} topLevel whether it sits at the top level
	 * @param {EXPECTED_ANY=} exports where module exports are tracked
	 * @returns {EXPECTED_ANY} the statement
	 */
	parseStatement(context, topLevel, exports) {
		let startType = this.type;
		const node = this.startNode();
		let kind;

		if (this.isLet(context)) {
			startType = tokTypes._var;
			kind = "let";
		}

		switch (startType) {
			case tokTypes._break:
			case tokTypes._continue:
				return this.parseBreakContinueStatement(
					node,
					/** @type {string} */ (startType.keyword)
				);
			case tokTypes._debugger:
				return this.parseDebuggerStatement(node);
			case tokTypes._do:
				return this.parseDoStatement(node);
			case tokTypes._for:
				return this.parseForStatement(node);
			case tokTypes._function:
				// A function is the whole body of an `if` or a label, but not of a
				// label that is itself the whole body of an `if`.
				if (
					context &&
					(this.strict || (context !== "if" && context !== "label")) &&
					this.options.ecmaVersion >= 6
				) {
					this.unexpected();
				}
				return this.parseFunctionStatement(node, false, !context);
			case tokTypes._class:
				if (context) this.unexpected();
				return this.parseClass(node, true);
			case tokTypes._if:
				return this.parseIfStatement(node);
			case tokTypes._return:
				return this.parseReturnStatement(node);
			case tokTypes._switch:
				return this.parseSwitchStatement(node);
			case tokTypes._throw:
				return this.parseThrowStatement(node);
			case tokTypes._try:
				return this.parseTryStatement(node);
			case tokTypes._const:
			case tokTypes._var: {
				const varKind = kind || /** @type {string} */ (this.value);
				if (context && varKind !== "var") this.unexpected();
				return this.parseVarStatement(node, varKind);
			}
			case tokTypes._while:
				return this.parseWhileStatement(node);
			case tokTypes._with:
				return this.parseWithStatement(node);
			case tokTypes.braceL:
				return this.parseBlock(true, node);
			case tokTypes.semi:
				return this.parseEmptyStatement(node);
			case tokTypes._export:
			case tokTypes._import: {
				if (this.options.ecmaVersion > 10 && startType === tokTypes._import) {
					skipWhiteSpace.lastIndex = this.pos;
					const skip = /** @type {RegExpExecArray} */ (
						skipWhiteSpace.exec(this.input)
					);
					const next = this.pos + skip[0].length;
					const nextCh = this.input.charCodeAt(next);
					if (nextCh === 40 || nextCh === 46) {
						return this.parseExpressionStatement(node, this.parseExpression());
					}
				}

				if (!this.options.allowImportExportEverywhere) {
					if (!topLevel) {
						this.raise(
							this.start,
							"'import' and 'export' may only appear at the top level"
						);
					}
					if (!this.inModule) {
						this.raise(
							this.start,
							"'import' and 'export' may appear only with 'sourceType: module'"
						);
					}
				}
				return startType === tokTypes._import
					? this.parseImport(node)
					: this.parseExport(node, exports);
			}

			default: {
				if (this.isAsyncFunction()) {
					if (context) this.unexpected();
					this.next();
					return this.parseFunctionStatement(node, true, !context);
				}

				const usingKind = this.isAwaitUsing(false)
					? "await using"
					: this.isUsing(false)
						? "using"
						: null;
				if (usingKind) {
					if (!this.allowUsing) {
						this.raise(
							this.start,
							"Using declaration cannot appear in the top level when source type is `script` or in the bare case statement"
						);
					}
					if (context) {
						this.raise(
							this.start,
							"Using declaration is not allowed in single-statement positions"
						);
					}
					if (usingKind === "await using") {
						if (!this.canAwait) {
							this.raise(
								this.start,
								"Await using cannot appear outside of async function"
							);
						}
						this.next();
					}
					this.next();
					this.parseVar(node, false, usingKind);
					this.semicolon();
					return this.finishNode(node, "VariableDeclaration");
				}

				const maybeName = this.value;
				const expr = this.parseExpression();
				if (
					startType === tokTypes.name &&
					expr.type === "Identifier" &&
					this.eat(tokTypes.colon)
				) {
					return this.parseLabeledStatement(node, maybeName, expr, context);
				}
				return this.parseExpressionStatement(node, expr);
			}
		}
	}

	/**
	 * @param {EXPECTED_ANY} node the statement node
	 * @param {string} keyword either `break` or `continue`
	 * @returns {EXPECTED_ANY} the finished statement
	 */
	parseBreakContinueStatement(node, keyword) {
		const isBreak = keyword === "break";
		this.next();
		if (this.eat(tokTypes.semi) || this.insertSemicolon()) {
			node.label = null;
		} else if (this.type !== tokTypes.name) {
			this.unexpected();
		} else {
			node.label = this.parseIdent();
			this.semicolon();
		}

		// A jump needs a destination in scope, so walk the labels for one this
		// keyword may reach.
		let i = 0;
		for (; i < this.labels.length; ++i) {
			const lab = this.labels[i];
			if (
				node.label === null ||
				node.label === undefined ||
				lab.name === node.label.name
			) {
				if (
					lab.kind !== null &&
					lab.kind !== undefined &&
					(isBreak || lab.kind === "loop")
				) {
					break;
				}
				if (node.label && isBreak) break;
			}
		}
		if (i === this.labels.length) {
			this.raise(node.start, `Unsyntactic ${keyword}`);
		}
		return this.finishNode(
			node,
			isBreak ? "BreakStatement" : "ContinueStatement"
		);
	}

	/**
	 * @param {EXPECTED_ANY} node the statement node
	 * @returns {EXPECTED_ANY} the finished statement
	 */
	parseDebuggerStatement(node) {
		this.next();
		this.semicolon();
		return this.finishNode(node, "DebuggerStatement");
	}

	/**
	 * @param {EXPECTED_ANY} node the statement node
	 * @returns {EXPECTED_ANY} the finished statement
	 */
	parseDoStatement(node) {
		this.next();
		this.labels.push(loopLabel);
		node.body = this.parseStatement("do");
		this.labels.pop();
		this.expect(tokTypes._while);
		node.test = this.parseParenExpression();
		if (this.options.ecmaVersion >= 6) this.eat(tokTypes.semi);
		else this.semicolon();
		return this.finishNode(node, "DoWhileStatement");
	}

	/**
	 * Read a `for` head, which is only known to be plain, `in` or `of` once its
	 * init part has been parsed with `in` held back as an operator.
	 * @param {EXPECTED_ANY} node the statement node
	 * @returns {EXPECTED_ANY} the finished statement
	 */
	parseForStatement(node) {
		this.next();
		const awaitAt =
			this.options.ecmaVersion >= 9 &&
			this.canAwait &&
			this.eatContextual("await")
				? this.lastTokStart
				: -1;
		this.labels.push(loopLabel);
		this.enterScope(0);
		this.expect(tokTypes.parenL);
		if (this.type === tokTypes.semi) {
			if (awaitAt > -1) this.unexpected(awaitAt);
			return this.parseFor(node, null);
		}
		const isLet = this.isLet();
		if (this.type === tokTypes._var || this.type === tokTypes._const || isLet) {
			const init = this.startNode();
			const kind = isLet ? "let" : this.value;
			this.next();
			this.parseVar(init, true, kind);
			this.finishNode(init, "VariableDeclaration");
			return this.parseForAfterInit(node, init, awaitAt);
		}
		const startsWithLet = this.isContextual("let");
		let isForOf = false;

		const usingKind = this.isUsing(true)
			? "using"
			: this.isAwaitUsing(true)
				? "await using"
				: null;
		if (usingKind) {
			const init = this.startNode();
			this.next();
			if (usingKind === "await using") {
				if (!this.canAwait) {
					this.raise(
						this.start,
						"Await using cannot appear outside of async function"
					);
				}
				this.next();
			}
			this.parseVar(init, true, usingKind);
			this.finishNode(init, "VariableDeclaration");
			return this.parseForAfterInit(node, init, awaitAt);
		}
		const { containsEsc } = this;
		const refDestructuringErrors = new DestructuringErrors();
		const initPos = this.start;
		const init =
			awaitAt > -1
				? this.parseExprSubscripts(refDestructuringErrors, "await")
				: this.parseExpression(true, refDestructuringErrors);
		if (
			this.type === tokTypes._in ||
			(isForOf = this.options.ecmaVersion >= 6 && this.isContextual("of"))
		) {
			if (awaitAt > -1) {
				if (this.type === tokTypes._in) this.unexpected(awaitAt);
				node.await = true;
			} else if (isForOf && this.options.ecmaVersion >= 8) {
				if (
					init.start === initPos &&
					!containsEsc &&
					init.type === "Identifier" &&
					init.name === "async"
				) {
					this.unexpected();
				} else if (this.options.ecmaVersion >= 9) {
					node.await = false;
				}
			}
			if (startsWithLet && isForOf) {
				this.raise(
					init.start,
					"The left-hand side of a for-of loop may not start with 'let'."
				);
			}
			this.toAssignable(init, false, refDestructuringErrors);
			this.checkLValPattern(init);
			return this.parseForIn(node, init);
		}
		this.checkExpressionErrors(refDestructuringErrors, true);
		if (awaitAt > -1) this.unexpected(awaitAt);
		return this.parseFor(node, init);
	}

	/**
	 * @param {EXPECTED_ANY} node the statement node
	 * @param {EXPECTED_ANY} init the parsed declaration
	 * @param {number} awaitAt where `await` was seen, or `-1`
	 * @returns {EXPECTED_ANY} the finished statement
	 */
	parseForAfterInit(node, init, awaitAt) {
		if (
			(this.type === tokTypes._in ||
				(this.options.ecmaVersion >= 6 && this.isContextual("of"))) &&
			init.declarations.length === 1
		) {
			if (this.type === tokTypes._in) {
				if (
					(init.kind === "using" || init.kind === "await using") &&
					!init.declarations[0].init
				) {
					this.raise(
						this.start,
						"Using declaration is not allowed in for-in loops"
					);
				}
				if (this.options.ecmaVersion >= 9 && awaitAt > -1) {
					this.unexpected(awaitAt);
				}
			} else if (this.options.ecmaVersion >= 9) {
				node.await = awaitAt > -1;
			}
			return this.parseForIn(node, init);
		}
		if (awaitAt > -1) this.unexpected(awaitAt);
		return this.parseFor(node, init);
	}

	/**
	 * @param {EXPECTED_ANY} node the statement node
	 * @param {boolean} isAsync whether it is an async function
	 * @param {boolean} declarationPosition whether the name binds here
	 * @returns {EXPECTED_ANY} the finished statement
	 */
	parseFunctionStatement(node, isAsync, declarationPosition) {
		this.next();
		return this.parseFunction(
			node,
			FUNC_STATEMENT | (declarationPosition ? 0 : FUNC_HANGING_STATEMENT),
			false,
			isAsync
		);
	}

	/**
	 * @param {EXPECTED_ANY} node the statement node
	 * @returns {EXPECTED_ANY} the finished statement
	 */
	parseIfStatement(node) {
		this.next();
		node.test = this.parseParenExpression();
		node.consequent = this.parseStatement("if");
		node.alternate = this.eat(tokTypes._else)
			? this.parseStatement("if")
			: null;
		return this.finishNode(node, "IfStatement");
	}

	/**
	 * @param {EXPECTED_ANY} node the statement node
	 * @returns {EXPECTED_ANY} the finished statement
	 */
	parseReturnStatement(node) {
		if (!this.allowReturn) {
			this.raise(this.start, "'return' outside of function");
		}
		this.next();

		if (this.eat(tokTypes.semi) || this.insertSemicolon()) {
			node.argument = null;
		} else {
			node.argument = this.parseExpression();
			this.semicolon();
		}
		return this.finishNode(node, "ReturnStatement");
	}

	/**
	 * @param {EXPECTED_ANY} node the statement node
	 * @returns {EXPECTED_ANY} the finished statement
	 */
	parseSwitchStatement(node) {
		this.next();
		node.discriminant = this.parseParenExpression();
		node.cases = [];
		this.expect(tokTypes.braceL);
		this.labels.push(switchLabel);
		this.enterScope(SCOPE_SWITCH);

		// Statements belong to the case that precedes them, so `cur` holds the one
		// being filled until the next `case` or `default` starts another.
		let cur;
		for (let sawDefault = false; this.type !== tokTypes.braceR;) {
			if (this.type === tokTypes._case || this.type === tokTypes._default) {
				const isCase = this.type === tokTypes._case;
				if (cur) this.finishNode(cur, "SwitchCase");
				cur = this.startNode();
				node.cases.push(cur);
				cur.consequent = [];
				this.next();
				if (isCase) {
					cur.test = this.parseExpression();
				} else {
					if (sawDefault) {
						this.raiseRecoverable(
							this.lastTokStart,
							"Multiple default clauses"
						);
					}
					sawDefault = true;
					cur.test = null;
				}
				this.expect(tokTypes.colon);
			} else {
				if (!cur) this.unexpected();
				cur.consequent.push(this.parseStatement(null));
			}
		}
		this.exitScope();
		if (cur) this.finishNode(cur, "SwitchCase");
		this.next();
		this.labels.pop();
		return this.finishNode(node, "SwitchStatement");
	}

	/**
	 * @param {EXPECTED_ANY} node the statement node
	 * @returns {EXPECTED_ANY} the finished statement
	 */
	parseThrowStatement(node) {
		this.next();
		if (lineBreak.test(this.input.slice(this.lastTokEnd, this.start))) {
			this.raise(this.lastTokEnd, "Illegal newline after throw");
		}
		node.argument = this.parseExpression();
		this.semicolon();
		return this.finishNode(node, "ThrowStatement");
	}

	/**
	 * @returns {EXPECTED_ANY} the catch clause's parameter
	 */
	parseCatchClauseParam() {
		const param = this.parseBindingAtom();
		const simple = param.type === "Identifier";
		this.enterScope(simple ? SCOPE_SIMPLE_CATCH : 0);
		this.checkLValPattern(param, simple ? BIND_SIMPLE_CATCH : BIND_LEXICAL);
		this.expect(tokTypes.parenR);

		return param;
	}

	/**
	 * @param {EXPECTED_ANY} node the statement node
	 * @returns {EXPECTED_ANY} the finished statement
	 */
	parseTryStatement(node) {
		this.next();
		node.block = this.parseBlock();
		node.handler = null;
		if (this.type === tokTypes._catch) {
			const clause = this.startNode();
			this.next();
			if (this.eat(tokTypes.parenL)) {
				clause.param = this.parseCatchClauseParam();
			} else {
				if (this.options.ecmaVersion < 10) this.unexpected();
				clause.param = null;
				this.enterScope(0);
			}
			clause.body = this.parseBlock(false);
			this.exitScope();
			node.handler = this.finishNode(clause, "CatchClause");
		}
		node.finalizer = this.eat(tokTypes._finally) ? this.parseBlock() : null;
		if (!node.handler && !node.finalizer) {
			this.raise(node.start, "Missing catch or finally clause");
		}
		return this.finishNode(node, "TryStatement");
	}

	/**
	 * @param {EXPECTED_ANY} node the statement node
	 * @param {string} kind which declaration keyword opened it
	 * @param {boolean=} allowMissingInitializer whether a declarator may lack one
	 * @returns {EXPECTED_ANY} the finished statement
	 */
	parseVarStatement(node, kind, allowMissingInitializer) {
		this.next();
		this.parseVar(node, false, kind, allowMissingInitializer);
		this.semicolon();
		return this.finishNode(node, "VariableDeclaration");
	}

	/**
	 * @param {EXPECTED_ANY} node the statement node
	 * @returns {EXPECTED_ANY} the finished statement
	 */
	parseWhileStatement(node) {
		this.next();
		node.test = this.parseParenExpression();
		this.labels.push(loopLabel);
		node.body = this.parseStatement("while");
		this.labels.pop();
		return this.finishNode(node, "WhileStatement");
	}

	/**
	 * @param {EXPECTED_ANY} node the statement node
	 * @returns {EXPECTED_ANY} the finished statement
	 */
	parseWithStatement(node) {
		if (this.strict) this.raise(this.start, "'with' in strict mode");
		this.next();
		node.object = this.parseParenExpression();
		node.body = this.parseStatement("with");
		return this.finishNode(node, "WithStatement");
	}

	/**
	 * @param {EXPECTED_ANY} node the statement node
	 * @returns {EXPECTED_ANY} the finished statement
	 */
	parseEmptyStatement(node) {
		this.next();
		return this.finishNode(node, "EmptyStatement");
	}

	/**
	 * @param {EXPECTED_ANY} node the statement node
	 * @param {EXPECTED_ANY} maybeName the label's name
	 * @param {EXPECTED_ANY} expr the identifier that named it
	 * @param {string | null=} context what encloses the statement
	 * @returns {EXPECTED_ANY} the finished statement
	 */
	parseLabeledStatement(node, maybeName, expr, context) {
		for (const label of this.labels) {
			if (label.name === maybeName) {
				this.raise(expr.start, `Label '${maybeName}' is already declared`);
			}
		}
		const kind = this.type.isLoop
			? "loop"
			: this.type === tokTypes._switch
				? "switch"
				: null;
		for (let i = this.labels.length - 1; i >= 0; i--) {
			const label = this.labels[i];
			if (label.statementStart === node.start) {
				label.statementStart = this.start;
				label.kind = kind;
			} else {
				break;
			}
		}
		this.labels.push(new Label(kind, maybeName, this.start));
		node.body = this.parseStatement(
			context
				? !context.includes("label")
					? `${context}label`
					: context
				: "label"
		);
		this.labels.pop();
		node.label = expr;
		return this.finishNode(node, "LabeledStatement");
	}

	/**
	 * @param {EXPECTED_ANY} node the statement node
	 * @param {EXPECTED_ANY} expr the expression it holds
	 * @returns {EXPECTED_ANY} the finished statement
	 */
	parseExpressionStatement(node, expr) {
		node.expression = expr;
		this.semicolon();
		return this.finishNode(node, "ExpressionStatement");
	}

	/**
	 * @param {boolean=} createNewLexicalScope whether the block opens a scope
	 * @param {EXPECTED_ANY=} node the block node
	 * @param {boolean=} exitStrict whether to leave strict mode after it
	 * @returns {EXPECTED_ANY} the finished block
	 */
	parseBlock(createNewLexicalScope, node, exitStrict) {
		const opensScope =
			createNewLexicalScope === undefined ? true : createNewLexicalScope;
		const block = node === undefined ? this.startNode() : node;

		block.body = [];
		this.expect(tokTypes.braceL);
		if (opensScope) this.enterScope(0);
		while (this.type !== tokTypes.braceR) {
			const stmt = this.parseStatement(null);
			block.body.push(stmt);
		}
		if (exitStrict) this.strict = false;
		this.next();
		if (opensScope) this.exitScope();
		return this.finishNode(block, "BlockStatement");
	}

	/**
	 * @param {EXPECTED_ANY} node the statement node
	 * @param {EXPECTED_ANY} init the already-parsed init part
	 * @returns {EXPECTED_ANY} the finished statement
	 */
	parseFor(node, init) {
		node.init = init;
		this.expect(tokTypes.semi);
		node.test = this.type === tokTypes.semi ? null : this.parseExpression();
		this.expect(tokTypes.semi);
		node.update = this.type === tokTypes.parenR ? null : this.parseExpression();
		this.expect(tokTypes.parenR);
		node.body = this.parseStatement("for");
		this.exitScope();
		this.labels.pop();
		return this.finishNode(node, "ForStatement");
	}

	/**
	 * @param {EXPECTED_ANY} node the statement node
	 * @param {EXPECTED_ANY} init what the loop iterates over
	 * @returns {EXPECTED_ANY} the finished statement
	 */
	parseForIn(node, init) {
		const isForIn = this.type === tokTypes._in;
		this.next();

		if (
			init.type === "VariableDeclaration" &&
			init.declarations[0].init !== null &&
			init.declarations[0].init !== undefined &&
			(!isForIn ||
				this.options.ecmaVersion < 8 ||
				this.strict ||
				init.kind !== "var" ||
				init.declarations[0].id.type !== "Identifier")
		) {
			this.raise(
				init.start,
				`${isForIn ? "for-in" : "for-of"} loop variable declaration may not have an initializer`
			);
		}
		node.left = init;
		node.right = isForIn ? this.parseExpression() : this.parseMaybeAssign();
		this.expect(tokTypes.parenR);
		node.body = this.parseStatement("for");
		this.exitScope();
		this.labels.pop();
		return this.finishNode(node, isForIn ? "ForInStatement" : "ForOfStatement");
	}

	/**
	 * @param {EXPECTED_ANY} node the declaration node
	 * @param {boolean} isFor whether it heads a `for` statement
	 * @param {string} kind which declaration keyword opened it
	 * @param {boolean=} allowMissingInitializer whether a declarator may lack one
	 * @returns {EXPECTED_ANY} the filled declaration
	 */
	parseVar(node, isFor, kind, allowMissingInitializer) {
		node.declarations = [];
		node.kind = kind;
		for (;;) {
			const decl = this.startNode();
			this.parseVarId(decl, kind);
			if (this.eat(tokTypes.eq)) {
				decl.init = this.parseMaybeAssign(isFor);
			} else if (
				!allowMissingInitializer &&
				kind === "const" &&
				!(
					this.type === tokTypes._in ||
					(this.options.ecmaVersion >= 6 && this.isContextual("of"))
				)
			) {
				this.unexpected();
			} else if (
				!allowMissingInitializer &&
				(kind === "using" || kind === "await using") &&
				this.options.ecmaVersion >= 17 &&
				this.type !== tokTypes._in &&
				!this.isContextual("of")
			) {
				this.raise(
					this.lastTokEnd,
					`Missing initializer in ${kind} declaration`
				);
			} else if (
				!allowMissingInitializer &&
				decl.id.type !== "Identifier" &&
				!(isFor && (this.type === tokTypes._in || this.isContextual("of")))
			) {
				this.raise(
					this.lastTokEnd,
					"Complex binding patterns require an initialization value"
				);
			} else {
				decl.init = null;
			}
			node.declarations.push(this.finishNode(decl, "VariableDeclarator"));
			if (!this.eat(tokTypes.comma)) break;
		}
		return node;
	}

	/**
	 * @param {EXPECTED_ANY} decl the declarator node
	 * @param {string} kind which declaration keyword opened it
	 * @returns {void}
	 */
	parseVarId(decl, kind) {
		decl.id =
			kind === "using" || kind === "await using"
				? this.parseIdent()
				: this.parseBindingAtom();

		this.checkLValPattern(
			decl.id,
			kind === "var" ? BIND_VAR : BIND_LEXICAL,
			false
		);
	}

	/**
	 * @param {EXPECTED_ANY} node the function node
	 * @param {number} statement how the function was reached
	 * @param {boolean=} allowExpressionBody whether a concise body is allowed
	 * @param {boolean=} isAsync whether it is async
	 * @param {(boolean | string)=} forInit whether `in` is held back as an operator
	 * @returns {EXPECTED_ANY} the finished function
	 */
	parseFunction(node, statement, allowExpressionBody, isAsync, forInit) {
		this.initFunction(node);
		if (
			this.options.ecmaVersion >= 9 ||
			(this.options.ecmaVersion >= 6 && !isAsync)
		) {
			if (this.type === tokTypes.star && statement & FUNC_HANGING_STATEMENT) {
				this.unexpected();
			}
			node.generator = this.eat(tokTypes.star);
		}
		if (this.options.ecmaVersion >= 8) node.async = Boolean(isAsync);

		if (statement & FUNC_STATEMENT) {
			node.id =
				statement & FUNC_NULLABLE_ID && this.type !== tokTypes.name
					? null
					: this.parseIdent();
			if (node.id && !(statement & FUNC_HANGING_STATEMENT)) {
				// A sloppy-mode declaration binds under Annex B; anything else binds
				// by what the current scope does with function names.
				this.checkLValSimple(
					node.id,
					this.strict || node.generator || node.async
						? this.treatFunctionsAsVar
							? BIND_VAR
							: BIND_LEXICAL
						: BIND_FUNCTION
				);
			}
		}

		const oldYieldPos = this.yieldPos;
		const oldAwaitPos = this.awaitPos;
		const oldAwaitIdentPos = this.awaitIdentPos;
		this.yieldPos = 0;
		this.awaitPos = 0;
		this.awaitIdentPos = 0;
		this.enterScope(functionFlags(node.async, node.generator));

		if (!(statement & FUNC_STATEMENT)) {
			node.id = this.type === tokTypes.name ? this.parseIdent() : null;
		}

		this.parseFunctionParams(node);
		this.parseFunctionBody(node, allowExpressionBody, false, forInit);

		this.yieldPos = oldYieldPos;
		this.awaitPos = oldAwaitPos;
		this.awaitIdentPos = oldAwaitIdentPos;
		return this.finishNode(
			node,
			statement & FUNC_STATEMENT ? "FunctionDeclaration" : "FunctionExpression"
		);
	}

	/**
	 * @param {EXPECTED_ANY} node the function node
	 * @returns {void}
	 */
	parseFunctionParams(node) {
		this.expect(tokTypes.parenL);
		node.params = this.parseBindingList(
			tokTypes.parenR,
			false,
			this.options.ecmaVersion >= 8
		);
		this.checkYieldAwaitInDefaultParams();
	}

	/**
	 * @param {EXPECTED_ANY} node the class node
	 * @param {(boolean | string)=} isStatement whether it is a declaration
	 * @returns {EXPECTED_ANY} the finished class
	 */
	parseClass(node, isStatement) {
		this.next();

		// A class body is always strict code, whatever encloses it.
		const oldStrict = this.strict;
		this.strict = true;

		this.parseClassId(node, isStatement);
		this.parseClassSuper(node);
		const privateNameMap = this.enterClassBody();
		const classBody = this.startNode();
		let hadConstructor = false;
		classBody.body = [];
		this.expect(tokTypes.braceL);
		while (this.type !== tokTypes.braceR) {
			const element = this.parseClassElement(node.superClass !== null);
			if (element) {
				classBody.body.push(element);
				if (
					element.type === "MethodDefinition" &&
					element.kind === "constructor"
				) {
					if (hadConstructor) {
						this.raiseRecoverable(
							element.start,
							"Duplicate constructor in the same class"
						);
					}
					hadConstructor = true;
				} else if (
					element.key &&
					element.key.type === "PrivateIdentifier" &&
					isPrivateNameConflicted(privateNameMap, element)
				) {
					this.raiseRecoverable(
						element.key.start,
						`Identifier '#${element.key.name}' has already been declared`
					);
				}
			}
		}
		this.strict = oldStrict;
		this.next();
		node.body = this.finishNode(classBody, "ClassBody");
		this.exitClassBody();
		return this.finishNode(
			node,
			isStatement ? "ClassDeclaration" : "ClassExpression"
		);
	}

	/**
	 * @param {boolean} constructorAllowsSuper whether the class has a superclass
	 * @returns {EXPECTED_ANY} the element, or `null` for a stray semicolon
	 */
	parseClassElement(constructorAllowsSuper) {
		if (this.eat(tokTypes.semi)) return null;

		const { ecmaVersion } = this.options;
		const node = this.startNode();
		let keyName = "";
		let isGenerator = false;
		let isAsync = false;
		let kind = "method";
		let isStatic = false;

		if (this.eatContextual("static")) {
			if (ecmaVersion >= 13 && this.eat(tokTypes.braceL)) {
				this.parseClassStaticBlock(node);
				return node;
			}
			if (this.isClassElementNameStart() || this.type === tokTypes.star) {
				isStatic = true;
			} else {
				keyName = "static";
			}
		}
		node.static = isStatic;
		if (!keyName && ecmaVersion >= 8 && this.eatContextual("async")) {
			if (
				(this.isClassElementNameStart() || this.type === tokTypes.star) &&
				!this.canInsertSemicolon()
			) {
				isAsync = true;
			} else {
				keyName = "async";
			}
		}
		if (!keyName && (ecmaVersion >= 9 || !isAsync) && this.eat(tokTypes.star)) {
			isGenerator = true;
		}
		if (!keyName && !isAsync && !isGenerator) {
			const lastValue = this.value;
			if (this.eatContextual("get") || this.eatContextual("set")) {
				if (this.isClassElementNameStart()) {
					kind = /** @type {string} */ (lastValue);
				} else {
					keyName = /** @type {string} */ (lastValue);
				}
			}
		}

		if (keyName) {
			// `async`, `get`, `set` or `static` did not read as a modifier here, so
			// the token that spelled it is the element's name.
			node.computed = false;
			node.key = this.startNodeAt(this.lastTokStart, this.lastTokStartLoc);
			node.key.name = keyName;
			this.finishNode(node.key, "Identifier");
		} else {
			this.parseClassElementName(node);
		}

		if (
			ecmaVersion < 13 ||
			this.type === tokTypes.parenL ||
			kind !== "method" ||
			isGenerator ||
			isAsync
		) {
			const isConstructor = !node.static && checkKeyName(node, "constructor");
			const allowsDirectSuper = isConstructor && constructorAllowsSuper;
			if (isConstructor && kind !== "method") {
				this.raise(node.key.start, "Constructor can't have get/set modifier");
			}
			node.kind = isConstructor ? "constructor" : kind;
			this.parseClassMethod(node, isGenerator, isAsync, allowsDirectSuper);
		} else {
			this.parseClassField(node);
		}

		return node;
	}

	/** @returns {boolean} whether the current token can name a class element */
	isClassElementNameStart() {
		return Boolean(
			this.type === tokTypes.name ||
			this.type === tokTypes.privateId ||
			this.type === tokTypes.num ||
			this.type === tokTypes.string ||
			this.type === tokTypes.bracketL ||
			this.type.keyword
		);
	}

	/**
	 * @param {EXPECTED_ANY} element the element node
	 * @returns {void}
	 */
	parseClassElementName(element) {
		if (this.type === tokTypes.privateId) {
			if (this.value === "constructor") {
				this.raise(
					this.start,
					"Classes can't have an element named '#constructor'"
				);
			}
			element.computed = false;
			element.key = this.parsePrivateIdent();
		} else {
			this.parsePropertyName(element);
		}
	}

	/**
	 * @param {EXPECTED_ANY} method the method node
	 * @param {boolean} isGenerator whether it is a generator
	 * @param {boolean} isAsync whether it is async
	 * @param {boolean} allowsDirectSuper whether `super()` may be called in it
	 * @returns {EXPECTED_ANY} the finished method
	 */
	parseClassMethod(method, isGenerator, isAsync, allowsDirectSuper) {
		const { key } = method;
		if (method.kind === "constructor") {
			if (isGenerator) {
				this.raise(key.start, "Constructor can't be a generator");
			}
			if (isAsync) {
				this.raise(key.start, "Constructor can't be an async method");
			}
		} else if (method.static && checkKeyName(method, "prototype")) {
			this.raise(
				key.start,
				"Classes may not have a static property named prototype"
			);
		}

		const value = this.parseMethod(isGenerator, isAsync, allowsDirectSuper);
		method.value = value;

		if (method.kind === "get" && value.params.length !== 0) {
			this.raiseRecoverable(value.start, "getter should have no params");
		}
		if (method.kind === "set" && value.params.length !== 1) {
			this.raiseRecoverable(
				value.start,
				"setter should have exactly one param"
			);
		}
		if (method.kind === "set" && value.params[0].type === "RestElement") {
			this.raiseRecoverable(
				value.params[0].start,
				"Setter cannot use rest params"
			);
		}

		return this.finishNode(method, "MethodDefinition");
	}

	/**
	 * @param {EXPECTED_ANY} field the field node
	 * @returns {EXPECTED_ANY} the finished field
	 */
	parseClassField(field) {
		if (checkKeyName(field, "constructor")) {
			this.raise(
				field.key.start,
				"Classes can't have a field named 'constructor'"
			);
		} else if (field.static && checkKeyName(field, "prototype")) {
			this.raise(
				field.key.start,
				"Classes can't have a static field named 'prototype'"
			);
		}

		if (this.eat(tokTypes.eq)) {
			// The initializer is its own scope so that `arguments` in it raises.
			this.enterScope(SCOPE_CLASS_FIELD_INIT | SCOPE_SUPER);
			field.value = this.parseMaybeAssign();
			this.exitScope();
		} else {
			field.value = null;
		}
		this.semicolon();

		return this.finishNode(field, "PropertyDefinition");
	}

	/**
	 * @param {EXPECTED_ANY} node the static block node
	 * @returns {EXPECTED_ANY} the finished block
	 */
	parseClassStaticBlock(node) {
		node.body = [];

		const oldLabels = this.labels;
		this.labels = [];
		this.enterScope(SCOPE_CLASS_STATIC_BLOCK | SCOPE_SUPER);
		while (this.type !== tokTypes.braceR) {
			const stmt = this.parseStatement(null);
			node.body.push(stmt);
		}
		this.next();
		this.exitScope();
		this.labels = oldLabels;

		return this.finishNode(node, "StaticBlock");
	}

	/**
	 * @param {EXPECTED_ANY} node the class node
	 * @param {(boolean | string)=} isStatement whether it is a declaration
	 * @returns {void}
	 */
	parseClassId(node, isStatement) {
		if (this.type === tokTypes.name) {
			node.id = this.parseIdent();
			if (isStatement) this.checkLValSimple(node.id, BIND_LEXICAL, false);
		} else {
			if (isStatement === true) this.unexpected();
			node.id = null;
		}
	}

	/**
	 * @param {EXPECTED_ANY} node the class node
	 * @returns {void}
	 */
	parseClassSuper(node) {
		node.superClass = this.eat(tokTypes._extends)
			? this.parseExprSubscripts(null, false)
			: null;
	}

	/** @returns {EXPECTED_ANY} the map of private names this body declares */
	enterClassBody() {
		const element = { declared: Object.create(null), used: [] };
		this.privateNameStack.push(element);
		return element.declared;
	}

	/** @returns {void} */
	exitClassBody() {
		const { declared, used } = this.privateNameStack.pop();
		if (!this.options.checkPrivateFields) return;
		const len = this.privateNameStack.length;
		const parent = len === 0 ? null : this.privateNameStack[len - 1];
		for (let i = 0; i < used.length; ++i) {
			const id = used[i];
			if (!Object.prototype.hasOwnProperty.call(declared, id.name)) {
				if (parent) {
					parent.used.push(id);
				} else {
					this.raiseRecoverable(
						id.start,
						`Private field '#${id.name}' must be declared in an enclosing class`
					);
				}
			}
		}
	}

	/**
	 * @param {EXPECTED_ANY} node the export node
	 * @param {EXPECTED_ANY} exports where module exports are tracked
	 * @returns {EXPECTED_ANY} the finished export
	 */
	parseExportAllDeclaration(node, exports) {
		if (this.options.ecmaVersion >= 11) {
			if (this.eatContextual("as")) {
				node.exported = this.parseModuleExportName();
				this.checkExport(exports, node.exported, this.lastTokStart);
			} else {
				node.exported = null;
			}
		}
		this.expectContextual("from");
		if (this.type !== tokTypes.string) this.unexpected();
		node.source = this.parseExprAtom();
		if (this.options.ecmaVersion >= 16) {
			node.attributes = this.parseWithClause();
		}
		this.semicolon();
		return this.finishNode(node, "ExportAllDeclaration");
	}

	/**
	 * @param {EXPECTED_ANY} node the export node
	 * @param {EXPECTED_ANY} exports where module exports are tracked
	 * @returns {EXPECTED_ANY} the finished export
	 */
	parseExport(node, exports) {
		this.next();
		if (this.eat(tokTypes.star)) {
			return this.parseExportAllDeclaration(node, exports);
		}
		if (this.eat(tokTypes._default)) {
			this.checkExport(exports, "default", this.lastTokStart);
			node.declaration = this.parseExportDefaultDeclaration();
			return this.finishNode(node, "ExportDefaultDeclaration");
		}
		if (this.shouldParseExportStatement()) {
			node.declaration = this.parseExportDeclaration(node);
			if (node.declaration.type === "VariableDeclaration") {
				this.checkVariableExport(exports, node.declaration.declarations);
			} else {
				this.checkExport(
					exports,
					node.declaration.id,
					node.declaration.id.start
				);
			}
			node.specifiers = [];
			node.source = null;
			if (this.options.ecmaVersion >= 16) node.attributes = [];
		} else {
			node.declaration = null;
			node.specifiers = this.parseExportSpecifiers(exports);
			if (this.eatContextual("from")) {
				if (this.type !== tokTypes.string) this.unexpected();
				node.source = this.parseExprAtom();
				if (this.options.ecmaVersion >= 16) {
					node.attributes = this.parseWithClause();
				}
			} else {
				for (const spec of node.specifiers) {
					this.checkUnreserved(spec.local);
					this.checkLocalExport(spec.local);

					if (spec.local.type === "Literal") {
						this.raise(
							spec.local.start,
							"A string literal cannot be used as an exported binding without `from`."
						);
					}
				}

				node.source = null;
				if (this.options.ecmaVersion >= 16) node.attributes = [];
			}
			this.semicolon();
		}
		return this.finishNode(node, "ExportNamedDeclaration");
	}

	/**
	 * @param {EXPECTED_ANY} node the export node
	 * @returns {EXPECTED_ANY} the exported declaration
	 */
	parseExportDeclaration(node) {
		return this.parseStatement(null);
	}

	/** @returns {EXPECTED_ANY} what `export default` exports */
	parseExportDefaultDeclaration() {
		let isAsync;
		if (
			this.type === tokTypes._function ||
			(isAsync = this.isAsyncFunction())
		) {
			const fNode = this.startNode();
			this.next();
			if (isAsync) this.next();
			return this.parseFunction(
				fNode,
				FUNC_STATEMENT | FUNC_NULLABLE_ID,
				false,
				isAsync
			);
		}
		if (this.type === tokTypes._class) {
			const cNode = this.startNode();
			return this.parseClass(cNode, "nullableID");
		}
		const declaration = this.parseMaybeAssign();
		this.semicolon();
		return declaration;
	}

	/**
	 * @param {EXPECTED_ANY} exports where module exports are tracked
	 * @param {EXPECTED_ANY} name the exported name
	 * @param {number} pos where it was written
	 * @returns {void}
	 */
	checkExport(exports, name, pos) {
		if (!exports) return;
		const exported =
			typeof name === "string"
				? name
				: name.type === "Identifier"
					? name.name
					: name.value;
		if (Object.prototype.hasOwnProperty.call(exports, exported)) {
			this.raiseRecoverable(pos, `Duplicate export '${exported}'`);
		}

		exports[exported] = true;
	}

	/**
	 * @param {EXPECTED_ANY} exports where module exports are tracked
	 * @param {EXPECTED_ANY} pat the pattern that binds the exported names
	 * @returns {void}
	 */
	checkPatternExport(exports, pat) {
		const { type } = pat;
		if (type === "Identifier") {
			this.checkExport(exports, pat, pat.start);
		} else if (type === "ObjectPattern") {
			for (const prop of pat.properties) this.checkPatternExport(exports, prop);
		} else if (type === "ArrayPattern") {
			for (const elt of pat.elements) {
				if (elt) this.checkPatternExport(exports, elt);
			}
		} else if (type === "Property") {
			this.checkPatternExport(exports, pat.value);
		} else if (type === "AssignmentPattern") {
			this.checkPatternExport(exports, pat.left);
		} else if (type === "RestElement") {
			this.checkPatternExport(exports, pat.argument);
		}
	}

	/**
	 * @param {EXPECTED_ANY} exports where module exports are tracked
	 * @param {EXPECTED_ANY[]} declarations the declarators being exported
	 * @returns {void}
	 */
	checkVariableExport(exports, declarations) {
		if (!exports) return;
		for (const declaration of declarations) {
			this.checkPatternExport(exports, declaration.id);
		}
	}

	/** @returns {boolean} whether `export` is followed by a declaration */
	shouldParseExportStatement() {
		return (
			this.type.keyword === "var" ||
			this.type.keyword === "const" ||
			this.type.keyword === "class" ||
			this.type.keyword === "function" ||
			this.isLet() ||
			this.isAsyncFunction()
		);
	}

	/**
	 * @param {EXPECTED_ANY} exports where module exports are tracked
	 * @returns {EXPECTED_ANY} the finished specifier
	 */
	parseExportSpecifier(exports) {
		const node = this.startNode();
		node.local = this.parseModuleExportName();

		node.exported = this.eatContextual("as")
			? this.parseModuleExportName()
			: node.local;
		this.checkExport(exports, node.exported, node.exported.start);

		return this.finishNode(node, "ExportSpecifier");
	}

	/**
	 * @param {EXPECTED_ANY} exports where module exports are tracked
	 * @returns {EXPECTED_ANY[]} the specifiers
	 */
	parseExportSpecifiers(exports) {
		const nodes = [];
		let first = true;
		this.expect(tokTypes.braceL);
		while (!this.eat(tokTypes.braceR)) {
			if (first) {
				first = false;
			} else {
				this.expect(tokTypes.comma);
				if (this.afterTrailingComma(tokTypes.braceR)) break;
			}

			nodes.push(this.parseExportSpecifier(exports));
		}
		return nodes;
	}

	/**
	 * @param {EXPECTED_ANY} node the import node
	 * @returns {EXPECTED_ANY} the finished import
	 */
	parseImport(node) {
		this.next();

		if (this.type === tokTypes.string) {
			node.specifiers = empty;
			node.source = this.parseExprAtom();
		} else {
			node.specifiers = this.parseImportSpecifiers();
			this.expectContextual("from");
			node.source =
				this.type === tokTypes.string
					? this.parseExprAtom()
					: this.unexpected();
		}
		if (this.options.ecmaVersion >= 16) {
			node.attributes = this.parseWithClause();
		}
		this.semicolon();
		return this.finishNode(node, "ImportDeclaration");
	}

	/** @returns {EXPECTED_ANY} the finished specifier */
	parseImportSpecifier() {
		const node = this.startNode();
		node.imported = this.parseModuleExportName();

		if (this.eatContextual("as")) {
			node.local = this.parseIdent();
		} else {
			this.checkUnreserved(node.imported);
			node.local = node.imported;
		}
		this.checkLValSimple(node.local, BIND_LEXICAL);

		return this.finishNode(node, "ImportSpecifier");
	}

	/** @returns {EXPECTED_ANY} the finished specifier */
	parseImportDefaultSpecifier() {
		const node = this.startNode();
		node.local = this.parseIdent();
		this.checkLValSimple(node.local, BIND_LEXICAL);
		return this.finishNode(node, "ImportDefaultSpecifier");
	}

	/** @returns {EXPECTED_ANY} the finished specifier */
	parseImportNamespaceSpecifier() {
		const node = this.startNode();
		this.next();
		this.expectContextual("as");
		node.local = this.parseIdent();
		this.checkLValSimple(node.local, BIND_LEXICAL);
		return this.finishNode(node, "ImportNamespaceSpecifier");
	}

	/** @returns {EXPECTED_ANY[]} the specifiers */
	parseImportSpecifiers() {
		const nodes = [];
		let first = true;
		if (this.type === tokTypes.name) {
			nodes.push(this.parseImportDefaultSpecifier());
			if (!this.eat(tokTypes.comma)) return nodes;
		}
		if (this.type === tokTypes.star) {
			nodes.push(this.parseImportNamespaceSpecifier());
			return nodes;
		}
		this.expect(tokTypes.braceL);
		while (!this.eat(tokTypes.braceR)) {
			if (first) {
				first = false;
			} else {
				this.expect(tokTypes.comma);
				if (this.afterTrailingComma(tokTypes.braceR)) break;
			}

			nodes.push(this.parseImportSpecifier());
		}
		return nodes;
	}

	/** @returns {EXPECTED_ANY[]} the attributes a `with` clause states */
	parseWithClause() {
		/** @type {EXPECTED_ANY[]} */
		const nodes = [];
		if (!this.eat(tokTypes._with)) return nodes;
		this.expect(tokTypes.braceL);
		/** @type {EXPECTED_ANY} */
		const attributeKeys = {};
		let first = true;
		while (!this.eat(tokTypes.braceR)) {
			if (first) {
				first = false;
			} else {
				this.expect(tokTypes.comma);
				if (this.afterTrailingComma(tokTypes.braceR)) break;
			}

			const attr = this.parseImportAttribute();
			const keyName =
				attr.key.type === "Identifier" ? attr.key.name : attr.key.value;
			if (Object.prototype.hasOwnProperty.call(attributeKeys, keyName)) {
				this.raiseRecoverable(
					attr.key.start,
					`Duplicate attribute key '${keyName}'`
				);
			}
			attributeKeys[keyName] = true;
			nodes.push(attr);
		}
		return nodes;
	}

	/** @returns {EXPECTED_ANY} the finished attribute */
	parseImportAttribute() {
		const node = this.startNode();
		node.key =
			this.type === tokTypes.string
				? this.parseExprAtom()
				: this.parseIdent(this.options.allowReserved !== "never");
		this.expect(tokTypes.colon);
		if (this.type !== tokTypes.string) this.unexpected();
		node.value = this.parseExprAtom();
		return this.finishNode(node, "ImportAttribute");
	}

	/** @returns {EXPECTED_ANY} the name, as an identifier or a string literal */
	parseModuleExportName() {
		if (this.options.ecmaVersion >= 13 && this.type === tokTypes.string) {
			const stringLiteral = this.parseLiteral(this.value);
			if (loneSurrogate.test(stringLiteral.value)) {
				this.raise(
					stringLiteral.start,
					"An export name cannot include a lone surrogate."
				);
			}
			return stringLiteral;
		}
		return this.parseIdent(true);
	}

	/**
	 * @param {EXPECTED_ANY[]} statements the statements that open a body
	 * @returns {void}
	 */
	adaptDirectivePrologue(statements) {
		for (
			let i = 0;
			i < statements.length && this.isDirectiveCandidate(statements[i]);
			++i
		) {
			statements[i].directive = statements[i].expression.raw.slice(1, -1);
		}
	}

	/**
	 * @param {NodeLike & { expression?: EXPECTED_ANY }} statement the statement to test
	 * @returns {boolean} whether it may be a directive
	 */
	isDirectiveCandidate(statement) {
		return (
			this.options.ecmaVersion >= 5 &&
			statement.type === "ExpressionStatement" &&
			statement.expression.type === "Literal" &&
			typeof statement.expression.value === "string" &&
			(this.input[statement.start] === '"' ||
				this.input[statement.start] === "'")
		);
	}

	/**
	 * Rewrite an expression as the binding pattern it turns out to be, which is
	 * only known once the `=` or `of` after it has been read.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/lval.js
	 * @param {EXPECTED_ANY} node the parsed expression
	 * @param {boolean=} isBinding whether it binds rather than assigns
	 * @param {EXPECTED_ANY=} refDestructuringErrors what the expression parser recorded
	 * @returns {EXPECTED_ANY} the same node, rewritten
	 */
	toAssignable(node, isBinding, refDestructuringErrors) {
		if (this.options.ecmaVersion >= 6 && node) {
			switch (node.type) {
				case "Identifier":
					if (this.inAsync && node.name === "await") {
						this.raise(
							node.start,
							"Cannot use 'await' as identifier inside an async function"
						);
					}
					break;

				case "ObjectPattern":
				case "ArrayPattern":
				case "AssignmentPattern":
				case "RestElement":
					break;

				case "ObjectExpression":
					node.type = "ObjectPattern";
					if (refDestructuringErrors) {
						this.checkPatternErrors(refDestructuringErrors, true);
					}
					for (const prop of node.properties) {
						this.toAssignable(prop, isBinding);
						// A rest property's target may not itself destructure.
						if (
							prop.type === "RestElement" &&
							(prop.argument.type === "ArrayPattern" ||
								prop.argument.type === "ObjectPattern")
						) {
							this.raise(prop.argument.start, "Unexpected token");
						}
					}
					break;

				case "Property":
					if (node.kind !== "init") {
						this.raise(
							node.key.start,
							"Object pattern can't contain getter or setter"
						);
					}
					this.toAssignable(node.value, isBinding);
					break;

				case "ArrayExpression":
					node.type = "ArrayPattern";
					if (refDestructuringErrors) {
						this.checkPatternErrors(refDestructuringErrors, true);
					}
					this.toAssignableList(node.elements, isBinding);
					break;

				case "SpreadElement":
					node.type = "RestElement";
					this.toAssignable(node.argument, isBinding);
					if (node.argument.type === "AssignmentPattern") {
						this.raise(
							node.argument.start,
							"Rest elements cannot have a default value"
						);
					}
					break;

				case "AssignmentExpression":
					if (node.operator !== "=") {
						this.raise(
							node.left.end,
							"Only '=' operator can be used for specifying default value."
						);
					}
					node.type = "AssignmentPattern";
					delete node.operator;
					this.toAssignable(node.left, isBinding);
					break;

				case "ParenthesizedExpression":
					this.toAssignable(node.expression, isBinding, refDestructuringErrors);
					break;

				case "ChainExpression":
					this.raiseRecoverable(
						node.start,
						"Optional chaining cannot appear in left-hand side"
					);
					break;

				case "MemberExpression":
					if (!isBinding) break;
					this.raise(node.start, "Assigning to rvalue");
					break;

				default:
					this.raise(node.start, "Assigning to rvalue");
			}
		} else if (refDestructuringErrors) {
			this.checkPatternErrors(refDestructuringErrors, true);
		}
		return node;
	}

	/**
	 * @param {EXPECTED_ANY[]} exprList the parsed expressions
	 * @param {boolean=} isBinding whether they bind rather than assign
	 * @returns {EXPECTED_ANY[]} the same list, rewritten
	 */
	toAssignableList(exprList, isBinding) {
		const end = exprList.length;
		for (let i = 0; i < end; i++) {
			const elt = exprList[i];
			if (elt) this.toAssignable(elt, isBinding);
		}
		if (end) {
			const last = exprList[end - 1];
			if (
				this.options.ecmaVersion === 6 &&
				isBinding &&
				last &&
				last.type === "RestElement" &&
				last.argument.type !== "Identifier"
			) {
				this.unexpected(last.argument.start);
			}
		}
		return exprList;
	}

	/**
	 * @param {EXPECTED_ANY=} refDestructuringErrors what the expression parser recorded
	 * @returns {EXPECTED_ANY} the finished element
	 */
	parseSpread(refDestructuringErrors) {
		const node = this.startNode();
		this.next();
		node.argument = this.parseMaybeAssign(false, refDestructuringErrors);
		return this.finishNode(node, "SpreadElement");
	}

	/** @returns {EXPECTED_ANY} the finished element */
	parseRestBinding() {
		const node = this.startNode();
		this.next();

		// Under ES6 a rest parameter may only name an identifier.
		if (this.options.ecmaVersion === 6 && this.type !== tokTypes.name) {
			this.unexpected();
		}

		node.argument = this.parseBindingAtom();

		return this.finishNode(node, "RestElement");
	}

	/** @returns {EXPECTED_ANY} the binding target */
	parseBindingAtom() {
		if (this.options.ecmaVersion >= 6) {
			switch (this.type) {
				case tokTypes.bracketL: {
					const node = this.startNode();
					this.next();
					node.elements = this.parseBindingList(tokTypes.bracketR, true, true);
					return this.finishNode(node, "ArrayPattern");
				}

				case tokTypes.braceL:
					return this.parseObj(true);
			}
		}
		return this.parseIdent();
	}

	/**
	 * @param {TokenType} close the token that ends the list
	 * @param {boolean} allowEmpty whether holes are allowed
	 * @param {boolean} allowTrailingComma whether a trailing comma is allowed
	 * @param {boolean=} allowModifiers whether items may carry modifiers
	 * @returns {EXPECTED_ANY[]} the bound targets
	 */
	parseBindingList(close, allowEmpty, allowTrailingComma, allowModifiers) {
		const elements = [];
		let first = true;
		while (!this.eat(close)) {
			if (first) first = false;
			else this.expect(tokTypes.comma);
			if (allowEmpty && this.type === tokTypes.comma) {
				elements.push(null);
			} else if (allowTrailingComma && this.afterTrailingComma(close)) {
				break;
			} else if (this.type === tokTypes.ellipsis) {
				const rest = this.parseRestBinding();
				this.parseBindingListItem(rest);
				elements.push(rest);
				if (this.type === tokTypes.comma) {
					this.raiseRecoverable(
						this.start,
						"Comma is not permitted after the rest element"
					);
				}
				this.expect(close);
				break;
			} else {
				elements.push(this.parseAssignableListItem(allowModifiers));
			}
		}
		return elements;
	}

	/**
	 * @param {boolean=} allowModifiers whether the item may carry modifiers
	 * @returns {EXPECTED_ANY} the item
	 */
	parseAssignableListItem(allowModifiers) {
		const elem = this.parseMaybeDefault(this.start, this.startLoc);
		this.parseBindingListItem(elem);
		return elem;
	}

	/**
	 * @param {EXPECTED_ANY} param the bound target
	 * @returns {EXPECTED_ANY} the same target
	 */
	parseBindingListItem(param) {
		return param;
	}

	/**
	 * @param {number} startPos where the target starts
	 * @param {PositionLike | null | undefined} startLoc its start position
	 * @param {EXPECTED_ANY=} left the already-parsed target
	 * @returns {EXPECTED_ANY} the target, wrapped when it has a default
	 */
	parseMaybeDefault(startPos, startLoc, left) {
		const target = left || this.parseBindingAtom();
		if (this.options.ecmaVersion < 6 || !this.eat(tokTypes.eq)) return target;
		const node = this.startNodeAt(startPos, startLoc);
		node.left = target;
		node.right = this.parseMaybeAssign();
		return this.finishNode(node, "AssignmentPattern");
	}

	/**
	 * Check a target that may only be an identifier or member expression, and
	 * record the binding it introduces.
	 * @param {EXPECTED_ANY} expr the target
	 * @param {number=} bindingType what kind of binding it introduces
	 * @param {EXPECTED_ANY=} checkClashes where duplicate parameter names are tracked
	 * @returns {void}
	 */
	checkLValSimple(expr, bindingType, checkClashes) {
		const binding = bindingType === undefined ? BIND_NONE : bindingType;
		const isBind = binding !== BIND_NONE;

		switch (expr.type) {
			case "Identifier":
				if (this.strict && this.reservedWordsStrictBind.test(expr.name)) {
					this.raiseRecoverable(
						expr.start,
						`${isBind ? "Binding " : "Assigning to "}${expr.name} in strict mode`
					);
				}
				if (isBind) {
					if (binding === BIND_LEXICAL && expr.name === "let") {
						this.raiseRecoverable(
							expr.start,
							"let is disallowed as a lexically bound name"
						);
					}
					if (checkClashes) {
						if (Object.prototype.hasOwnProperty.call(checkClashes, expr.name)) {
							this.raiseRecoverable(expr.start, "Argument name clash");
						}
						checkClashes[expr.name] = true;
					}
					if (binding !== BIND_OUTSIDE) {
						this.declareName(expr.name, binding, expr.start);
					}
				}
				break;

			case "ChainExpression":
				this.raiseRecoverable(
					expr.start,
					"Optional chaining cannot appear in left-hand side"
				);
				break;

			case "MemberExpression":
				if (isBind) {
					this.raiseRecoverable(expr.start, "Binding member expression");
				}
				break;

			case "ParenthesizedExpression":
				if (isBind) {
					this.raiseRecoverable(expr.start, "Binding parenthesized expression");
				}
				return this.checkLValSimple(expr.expression, binding, checkClashes);

			default:
				this.raise(expr.start, `${isBind ? "Binding" : "Assigning to"} rvalue`);
		}
	}

	/**
	 * @param {EXPECTED_ANY} expr the target
	 * @param {number=} bindingType what kind of binding it introduces
	 * @param {EXPECTED_ANY=} checkClashes where duplicate parameter names are tracked
	 * @returns {void}
	 */
	checkLValPattern(expr, bindingType, checkClashes) {
		const binding = bindingType === undefined ? BIND_NONE : bindingType;
		switch (expr.type) {
			case "ObjectPattern":
				for (const prop of expr.properties) {
					this.checkLValInnerPattern(prop, binding, checkClashes);
				}
				break;

			case "ArrayPattern":
				for (const elem of expr.elements) {
					if (elem) this.checkLValInnerPattern(elem, binding, checkClashes);
				}
				break;

			default:
				this.checkLValSimple(expr, binding, checkClashes);
		}
	}

	/**
	 * @param {EXPECTED_ANY} expr the target
	 * @param {number=} bindingType what kind of binding it introduces
	 * @param {EXPECTED_ANY=} checkClashes where duplicate parameter names are tracked
	 * @returns {void}
	 */
	checkLValInnerPattern(expr, bindingType, checkClashes) {
		const binding = bindingType === undefined ? BIND_NONE : bindingType;
		switch (expr.type) {
			case "Property":
				this.checkLValInnerPattern(expr.value, binding, checkClashes);
				break;

			case "AssignmentPattern":
				this.checkLValPattern(expr.left, binding, checkClashes);
				break;

			case "RestElement":
				this.checkLValPattern(expr.argument, binding, checkClashes);
				break;

			default:
				this.checkLValPattern(expr, binding, checkClashes);
		}
	}

	/** @returns {TokContextLike[]} the context stack a fresh parser starts with */
	initialContext() {
		return [tokContexts.b_stat];
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
		if (parent === tokContexts.f_expr || parent === tokContexts.f_stat) {
			return true;
		}
		if (
			prevType === tokTypes.colon &&
			(parent === tokContexts.b_stat || parent === tokContexts.b_expr)
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
		if (prevType === tokTypes.braceL) return parent === tokContexts.b_stat;
		if (
			prevType === tokTypes._var ||
			prevType === tokTypes._const ||
			prevType === tokTypes.name
		) {
			return false;
		}
		return !this.exprAllowed;
	}

	/** @returns {boolean} whether the enclosing function is a generator */
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
		if (type.keyword && prevType === tokTypes.dot) {
			this.exprAllowed = false;
			return;
		}
		const update = type.updateContext;
		if (update) update.call(this, prevType);
		else this.exprAllowed = type.beforeExpr;
	}

	/**
	 * @param {TokContextLike} tokenCtx the context the token really opened
	 * @returns {void}
	 */
	overrideContext(tokenCtx) {
		if (this.curContext() !== tokenCtx) {
			this.context[this.context.length - 1] = tokenCtx;
		}
	}

	/**
	 * @param {number} flags what kind of scope it is
	 * @returns {void}
	 */
	enterScope(flags) {
		this.scopeStack.push(new Scope(flags));
	}

	/** @returns {void} */
	exitScope() {
		this.scopeStack.pop();
	}

	/**
	 * @param {{ flags: number }} scope the scope to ask about
	 * @returns {boolean | number} whether function names bind like `var` in it
	 */
	treatFunctionsAsVarInScope(scope) {
		return Boolean(
			scope.flags & SCOPE_FUNCTION ||
			(!this.inModule && scope.flags & SCOPE_TOP)
		);
	}

	/**
	 * Record a name in the scope its binding belongs to, and report a name that
	 * was already declared there.
	 * @param {string} name the bound name
	 * @param {number} bindingType what kind of binding it is
	 * @param {number} pos where it was written
	 * @returns {void}
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
		} else if (bindingType === BIND_SIMPLE_CATCH) {
			const scope = this.currentScope();
			if (scope.lexical === undefined) {
				scope.firstLexical = name;
				scope.lexical = new Set();
			}
			scope.lexical.add(name);
		} else if (bindingType === BIND_FUNCTION) {
			const scope = this.currentScope();
			redeclared = this.treatFunctionsAsVar
				? scope.lexical !== undefined && scope.lexical.has(name)
				: (scope.lexical !== undefined && scope.lexical.has(name)) ||
					(scope.var !== undefined && scope.var.has(name));
			if (scope.functions === undefined) scope.functions = new Set();
			scope.functions.add(name);
		} else {
			for (let i = this.scopeStack.length - 1; i >= 0; --i) {
				const scope = this.scopeStack[i];
				if (
					(scope.lexical !== undefined &&
						scope.lexical.has(name) &&
						!(
							scope.flags & SCOPE_SIMPLE_CATCH && scope.firstLexical === name
						)) ||
					(scope.functions !== undefined &&
						!this.treatFunctionsAsVarInScope(scope) &&
						scope.functions.has(name))
				) {
					redeclared = true;
					break;
				}
				if (scope.var === undefined) scope.var = new Set();
				scope.var.add(name);
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
	 * @param {EXPECTED_ANY} id the exported identifier
	 * @returns {void}
	 */
	checkLocalExport(id) {
		// Module code is always strict, so `functions` is empty here.
		const top = this.scopeStack[0];
		if (
			(top.lexical === undefined || !top.lexical.has(id.name)) &&
			(top.var === undefined || !top.var.has(id.name))
		) {
			this.undefinedExports[id.name] = id;
		}
	}

	/** @returns {Scope} the innermost scope */
	currentScope() {
		return this.scopeStack[this.scopeStack.length - 1];
	}

	/** @returns {Scope} the innermost scope `var` reaches */
	currentVarScope() {
		for (let i = this.scopeStack.length - 1; ; i--) {
			const scope = this.scopeStack[i];
			if (
				scope.flags &
				(SCOPE_VAR | SCOPE_CLASS_FIELD_INIT | SCOPE_CLASS_STATIC_BLOCK)
			) {
				return scope;
			}
		}
	}

	/** @returns {Scope} the innermost scope that binds `this` */
	currentThisScope() {
		for (let i = this.scopeStack.length - 1; ; i--) {
			const scope = this.scopeStack[i];
			if (
				scope.flags &
					(SCOPE_VAR | SCOPE_CLASS_FIELD_INIT | SCOPE_CLASS_STATIC_BLOCK) &&
				!(scope.flags & SCOPE_ARROW)
			) {
				return scope;
			}
		}
	}

	/** @returns {EXPECTED_ANY} a node starting at the current token */
	startNode() {
		return new Node(this, this.start, this.startLoc);
	}

	/**
	 * @param {number} pos where the node starts
	 * @param {PositionLike | null=} loc its start position
	 * @returns {EXPECTED_ANY} the node
	 */
	startNodeAt(pos, loc) {
		return new Node(this, pos, /** @type {EXPECTED_ANY} */ (loc));
	}

	/**
	 * @param {EXPECTED_ANY} node the node to finish
	 * @param {string} type its ESTree type
	 * @returns {EXPECTED_ANY} the same node
	 */
	finishNode(node, type) {
		return this.finishNodeAt(node, type, this.lastTokEnd, this.lastTokEndLoc);
	}

	/**
	 * @param {EXPECTED_ANY} node the node to finish
	 * @param {string} type its ESTree type
	 * @param {number} pos where it ends
	 * @param {PositionLike | null=} loc its end position
	 * @returns {EXPECTED_ANY} the same node
	 */
	finishNodeAt(node, type, pos, loc) {
		node.type = type;
		node.end = pos;
		if (this.options.locations) node.loc.end = loc;
		if (this.options.ranges) node.range[1] = pos;
		return node;
	}

	/**
	 * @param {EXPECTED_ANY} node the node to copy
	 * @returns {EXPECTED_ANY} the copy
	 */
	copyNode(node) {
		const newNode = /** @type {EXPECTED_ANY} */ (
			new Node(this, node.start, this.startLoc)
		);
		for (const prop of Object.keys(node)) newNode[prop] = node[prop];
		return newNode;
	}

	/**
	 * Report a property name that may not be repeated: a getter or setter that
	 * clashes, and under ES5 a repeated `init` in strict mode.
	 * @param {EXPECTED_ANY} prop the property
	 * @param {EXPECTED_ANY} propHash where names seen so far are tracked
	 * @param {EXPECTED_ANY=} refDestructuringErrors what the expression parser recorded
	 * @returns {void}
	 */
	checkPropClash(prop, propHash, refDestructuringErrors) {
		if (this.options.ecmaVersion >= 9 && prop.type === "SpreadElement") return;
		if (
			this.options.ecmaVersion >= 6 &&
			(prop.computed || prop.method || prop.shorthand)
		) {
			return;
		}
		const { key } = prop;
		let name;
		switch (key.type) {
			case "Identifier":
				name = key.name;
				break;
			case "Literal":
				name = String(key.value);
				break;
			default:
				return;
		}
		const { kind } = prop;
		if (this.options.ecmaVersion >= 6) {
			if (name === "__proto__" && kind === "init") {
				if (propHash.proto) {
					if (refDestructuringErrors) {
						if (refDestructuringErrors.doubleProto < 0) {
							refDestructuringErrors.doubleProto = key.start;
						}
					} else {
						this.raiseRecoverable(
							key.start,
							"Redefinition of __proto__ property"
						);
					}
				}
				propHash.proto = true;
			}
			return;
		}
		name = `$${name}`;
		let other = propHash[name];
		if (other) {
			const redefinition =
				kind === "init"
					? (this.strict && other.init) || other.get || other.set
					: other.init || other[kind];
			if (redefinition) {
				this.raiseRecoverable(key.start, "Redefinition of property");
			}
		} else {
			other = { init: false, get: false, set: false };
			propHash[name] = other;
		}
		other[kind] = true;
	}

	/**
	 * Read a full expression, including the comma operator.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {boolean | string=} forInit whether `in` is held back as an operator
	 * @param {EXPECTED_ANY=} refDestructuringErrors where to record deferred errors
	 * @returns {EXPECTED_ANY} the expression
	 */
	parseExpression(forInit, refDestructuringErrors) {
		return this.catchStackOverflow(() => {
			const startPos = this.start;
			const startLoc = this.startLoc;
			const expr = this.parseMaybeAssign(forInit, refDestructuringErrors);
			if (this.type === tokTypes.comma) {
				const node = this.startNodeAt(startPos, startLoc);
				node.expressions = [expr];
				while (this.eat(tokTypes.comma)) {
					node.expressions.push(
						this.parseMaybeAssign(forInit, refDestructuringErrors)
					);
				}
				return this.finishNode(node, "SequenceExpression");
			}
			return expr;
		});
	}

	/**
	 * @param {boolean | string=} forInit whether `in` is held back as an operator
	 * @param {EXPECTED_ANY=} refDestructuringErrors where to record deferred errors
	 * @param {EXPECTED_ANY=} afterLeftParse a hook run on the parsed left side
	 * @returns {EXPECTED_ANY} the expression
	 */
	parseMaybeAssign(forInit, refDestructuringErrors, afterLeftParse) {
		if (this.isContextual("yield")) {
			if (this.inGenerator) return this.parseYield(forInit);
			// The tokenizer assumes an expression follows `yield`, which is wrong
			// where `yield` is only a name.
			this.exprAllowed = false;
		}

		let errors = refDestructuringErrors;
		let ownDestructuringErrors = false;
		let oldParenAssign = -1;
		let oldTrailingComma = -1;
		let oldDoubleProto = -1;
		if (errors) {
			oldParenAssign = errors.parenthesizedAssign;
			oldTrailingComma = errors.trailingComma;
			oldDoubleProto = errors.doubleProto;
			errors.parenthesizedAssign = -1;
			errors.trailingComma = -1;
		} else {
			errors = new DestructuringErrors();
			ownDestructuringErrors = true;
		}

		const startPos = this.start;
		const startLoc = this.startLoc;
		if (this.type === tokTypes.parenL || this.type === tokTypes.name) {
			this.potentialArrowAt = this.start;
			this.potentialArrowInForAwait = forInit === "await";
		}
		let left = this.parseMaybeConditional(forInit, errors);
		if (afterLeftParse) {
			left = afterLeftParse.call(this, left, startPos, startLoc);
		}
		if (this.type.isAssign) {
			const node = this.startNodeAt(startPos, startLoc);
			node.operator = this.value;
			if (this.type === tokTypes.eq) {
				left = this.toAssignable(left, false, errors);
			}
			if (!ownDestructuringErrors) {
				errors.parenthesizedAssign = -1;
				errors.trailingComma = -1;
				errors.doubleProto = -1;
			}
			// A shorthand default that turned out to be a pattern is no error.
			if (errors.shorthandAssign >= left.start) errors.shorthandAssign = -1;
			if (this.type === tokTypes.eq) this.checkLValPattern(left);
			else this.checkLValSimple(left);
			node.left = left;
			this.next();
			node.right = this.parseMaybeAssign(forInit);
			if (oldDoubleProto > -1) errors.doubleProto = oldDoubleProto;
			return this.finishNode(node, "AssignmentExpression");
		}
		if (ownDestructuringErrors) this.checkExpressionErrors(errors, true);
		if (oldParenAssign > -1) errors.parenthesizedAssign = oldParenAssign;
		if (oldTrailingComma > -1) errors.trailingComma = oldTrailingComma;
		return left;
	}

	/**
	 * @param {boolean | string=} forInit whether `in` is held back as an operator
	 * @param {EXPECTED_ANY=} refDestructuringErrors where to record deferred errors
	 * @returns {EXPECTED_ANY} the expression
	 */
	parseMaybeConditional(forInit, refDestructuringErrors) {
		const startPos = this.start;
		const startLoc = this.startLoc;
		const expr = this.parseExprOps(forInit, refDestructuringErrors);
		if (this.checkExpressionErrors(refDestructuringErrors)) return expr;
		if (
			!(expr.type === "ArrowFunctionExpression" && expr.start === startPos) &&
			this.eat(tokTypes.question)
		) {
			const node = this.startNodeAt(startPos, startLoc);
			node.test = expr;
			node.consequent = this.parseMaybeAssign();
			this.expect(tokTypes.colon);
			node.alternate = this.parseMaybeAssign(forInit);
			return this.finishNode(node, "ConditionalExpression");
		}
		return expr;
	}

	/**
	 * @param {boolean | string=} forInit whether `in` is held back as an operator
	 * @param {EXPECTED_ANY=} refDestructuringErrors where to record deferred errors
	 * @returns {EXPECTED_ANY} the expression
	 */
	parseExprOps(forInit, refDestructuringErrors) {
		const startPos = this.start;
		const startLoc = this.startLoc;
		const expr = this.parseMaybeUnary(
			refDestructuringErrors,
			false,
			false,
			forInit
		);
		if (this.checkExpressionErrors(refDestructuringErrors)) return expr;
		return expr.start === startPos && expr.type === "ArrowFunctionExpression"
			? expr
			: this.parseExprOp(expr, startPos, startLoc, -1, forInit);
	}

	/**
	 * Read binary operators by precedence climbing, stopping where an operator
	 * binds less tightly than the caller is parsing.
	 * @param {EXPECTED_ANY} left the left operand
	 * @param {number} leftStartPos where the left operand starts
	 * @param {PositionLike | null | undefined} leftStartLoc its start position
	 * @param {number} minPrec the precedence to stop below
	 * @param {boolean | string=} forInit whether `in` is held back as an operator
	 * @returns {EXPECTED_ANY} the expression
	 */
	parseExprOp(left, leftStartPos, leftStartLoc, minPrec, forInit) {
		let prec = this.type.binop;
		if (
			prec !== null &&
			prec !== undefined &&
			(!forInit || this.type !== tokTypes._in) &&
			prec > minPrec
		) {
			const logical =
				this.type === tokTypes.logicalOR || this.type === tokTypes.logicalAND;
			const coalesce = this.type === tokTypes.coalesce;
			if (coalesce) {
				// `??` binds like the logical operators so that mixing the two
				// without parentheses is caught rather than silently nested.
				prec = /** @type {number} */ (tokTypes.logicalAND.binop);
			}
			const op = this.value;
			this.next();
			const startPos = this.start;
			const startLoc = this.startLoc;
			const right = this.parseExprOp(
				this.parseMaybeUnary(null, false, false, forInit),
				startPos,
				startLoc,
				prec,
				forInit
			);
			const node = this.buildBinary(
				leftStartPos,
				leftStartLoc,
				left,
				right,
				op,
				logical || coalesce
			);
			if (
				(logical && this.type === tokTypes.coalesce) ||
				(coalesce &&
					(this.type === tokTypes.logicalOR ||
						this.type === tokTypes.logicalAND))
			) {
				this.raiseRecoverable(
					this.start,
					"Logical expressions and coalesce expressions cannot be mixed. Wrap either by parentheses"
				);
			}
			return this.parseExprOp(
				node,
				leftStartPos,
				leftStartLoc,
				minPrec,
				forInit
			);
		}
		return left;
	}

	/**
	 * @param {number} startPos where the expression starts
	 * @param {PositionLike | null | undefined} startLoc its start position
	 * @param {EXPECTED_ANY} left the left operand
	 * @param {EXPECTED_ANY} right the right operand
	 * @param {EXPECTED_ANY} op the operator
	 * @param {boolean} logical whether it is a logical operator
	 * @returns {EXPECTED_ANY} the expression
	 */
	buildBinary(startPos, startLoc, left, right, op, logical) {
		if (right.type === "PrivateIdentifier") {
			this.raise(
				right.start,
				"Private identifier can only be left side of binary expression"
			);
		}
		const node = this.startNodeAt(startPos, startLoc);
		node.left = left;
		node.operator = op;
		node.right = right;
		return this.finishNode(
			node,
			logical ? "LogicalExpression" : "BinaryExpression"
		);
	}

	/**
	 * @param {EXPECTED_ANY} refDestructuringErrors where to record deferred errors
	 * @param {boolean=} sawUnary whether a unary operator was already read
	 * @param {boolean=} incDec whether the operand belongs to `++`/`--`
	 * @param {boolean | string=} forInit whether `in` is held back as an operator
	 * @returns {EXPECTED_ANY} the expression
	 */
	parseMaybeUnary(refDestructuringErrors, sawUnary, incDec, forInit) {
		const startPos = this.start;
		const startLoc = this.startLoc;
		let expr;
		let unary = sawUnary;
		if (this.isContextual("await") && this.canAwait) {
			expr = this.parseAwait(forInit);
			unary = true;
		} else if (this.type.prefix) {
			const node = this.startNode();
			const update = this.type === tokTypes.incDec;
			node.operator = this.value;
			node.prefix = true;
			this.next();
			node.argument = this.parseMaybeUnary(null, true, update, forInit);
			this.checkExpressionErrors(refDestructuringErrors, true);
			if (update) {
				this.checkLValSimple(node.argument);
			} else if (
				this.strict &&
				node.operator === "delete" &&
				isLocalVariableAccess(node.argument)
			) {
				this.raiseRecoverable(
					node.start,
					"Deleting local variable in strict mode"
				);
			} else if (
				node.operator === "delete" &&
				isPrivateFieldAccess(node.argument)
			) {
				this.raiseRecoverable(node.start, "Private fields can not be deleted");
			} else {
				unary = true;
			}
			expr = this.finishNode(
				node,
				update ? "UpdateExpression" : "UnaryExpression"
			);
		} else if (!unary && this.type === tokTypes.privateId) {
			if (
				(forInit || this.privateNameStack.length === 0) &&
				this.options.checkPrivateFields
			) {
				this.unexpected();
			}
			expr = this.parsePrivateIdent();
			// A private name is only an operand of `in`.
			if (this.type !== tokTypes._in) this.unexpected();
		} else {
			expr = this.parseExprSubscripts(refDestructuringErrors, forInit);
			if (this.checkExpressionErrors(refDestructuringErrors)) return expr;
			while (this.type.postfix && !this.canInsertSemicolon()) {
				const node = this.startNodeAt(startPos, startLoc);
				node.operator = this.value;
				node.prefix = false;
				node.argument = expr;
				this.checkLValSimple(expr);
				this.next();
				expr = this.finishNode(node, "UpdateExpression");
			}
		}

		if (
			!incDec &&
			!(expr.type === "ArrowFunctionExpression" && expr.start === startPos) &&
			this.eat(tokTypes.starstar)
		) {
			if (unary) this.unexpected(this.lastTokStart);
			return this.buildBinary(
				startPos,
				startLoc,
				expr,
				this.parseMaybeUnary(null, false, false, forInit),
				"**",
				false
			);
		}
		return expr;
	}

	/**
	 * @param {EXPECTED_ANY=} refDestructuringErrors where to record deferred errors
	 * @param {boolean | string=} forInit whether `in` is held back as an operator
	 * @returns {EXPECTED_ANY} the expression
	 */
	parseExprSubscripts(refDestructuringErrors, forInit) {
		const startPos = this.start;
		const startLoc = this.startLoc;
		const expr = this.parseExprAtom(refDestructuringErrors, forInit);
		if (
			expr.type === "ArrowFunctionExpression" &&
			this.input.slice(this.lastTokStart, this.lastTokEnd) !== ")"
		) {
			return expr;
		}
		const result = this.parseSubscripts(
			expr,
			startPos,
			startLoc,
			false,
			forInit
		);
		if (refDestructuringErrors && result.type === "MemberExpression") {
			if (refDestructuringErrors.parenthesizedAssign >= result.start) {
				refDestructuringErrors.parenthesizedAssign = -1;
			}
			if (refDestructuringErrors.parenthesizedBind >= result.start) {
				refDestructuringErrors.parenthesizedBind = -1;
			}
			if (refDestructuringErrors.trailingComma >= result.start) {
				refDestructuringErrors.trailingComma = -1;
			}
		}
		return result;
	}

	/**
	 * @param {EXPECTED_ANY} baseExpr what the subscripts apply to
	 * @param {number} startPos where the whole expression starts
	 * @param {PositionLike | null | undefined} startLoc its start position
	 * @param {boolean} noCalls whether a call would belong to an enclosing `new`
	 * @param {boolean | string=} forInit whether `in` is held back as an operator
	 * @returns {EXPECTED_ANY} the expression
	 */
	parseSubscripts(baseExpr, startPos, startLoc, noCalls, forInit) {
		const maybeAsyncArrow =
			this.options.ecmaVersion >= 8 &&
			baseExpr.type === "Identifier" &&
			baseExpr.name === "async" &&
			this.lastTokEnd === baseExpr.end &&
			!this.canInsertSemicolon() &&
			baseExpr.end - baseExpr.start === 5 &&
			this.potentialArrowAt === baseExpr.start;
		let optionalChained = false;
		let current = baseExpr;

		for (;;) {
			const element = this.parseSubscript(
				current,
				startPos,
				startLoc,
				noCalls,
				maybeAsyncArrow,
				optionalChained,
				forInit
			);

			if (element.optional) optionalChained = true;
			if (element === current || element.type === "ArrowFunctionExpression") {
				if (optionalChained) {
					const chainNode = this.startNodeAt(startPos, startLoc);
					chainNode.expression = element;
					return this.finishNode(chainNode, "ChainExpression");
				}
				return element;
			}

			current = element;
		}
	}

	/** @returns {boolean} whether an async arrow's body follows */
	shouldParseAsyncArrow() {
		return !this.canInsertSemicolon() && this.eat(tokTypes.arrow);
	}

	/**
	 * @param {number} startPos where the arrow starts
	 * @param {PositionLike | null | undefined} startLoc its start position
	 * @param {EXPECTED_ANY[]} exprList its parameters
	 * @param {boolean | string=} forInit whether `in` is held back as an operator
	 * @returns {EXPECTED_ANY} the arrow function
	 */
	parseSubscriptAsyncArrow(startPos, startLoc, exprList, forInit) {
		return this.parseArrowExpression(
			this.startNodeAt(startPos, startLoc),
			exprList,
			true,
			forInit
		);
	}

	/**
	 * @param {EXPECTED_ANY} baseExpr what the subscript applies to
	 * @param {number} startPos where the whole expression starts
	 * @param {PositionLike | null | undefined} startLoc its start position
	 * @param {boolean} noCalls whether a call would belong to an enclosing `new`
	 * @param {boolean} maybeAsyncArrow whether the base may head an async arrow
	 * @param {boolean} optionalChained whether an earlier link was optional
	 * @param {boolean | string=} forInit whether `in` is held back as an operator
	 * @returns {EXPECTED_ANY} the expression, or the base when nothing applied
	 */
	parseSubscript(
		baseExpr,
		startPos,
		startLoc,
		noCalls,
		maybeAsyncArrow,
		optionalChained,
		forInit
	) {
		const optionalSupported = this.options.ecmaVersion >= 11;
		const optional = optionalSupported && this.eat(tokTypes.questionDot);
		if (noCalls && optional) {
			this.raise(
				this.lastTokStart,
				"Optional chaining cannot appear in the callee of new expressions"
			);
		}

		const computed = this.eat(tokTypes.bracketL);
		if (
			computed ||
			(optional &&
				this.type !== tokTypes.parenL &&
				this.type !== tokTypes.backQuote) ||
			this.eat(tokTypes.dot)
		) {
			const node = this.startNodeAt(startPos, startLoc);
			node.object = baseExpr;
			if (computed) {
				node.property = this.parseExpression();
				this.expect(tokTypes.bracketR);
			} else if (
				this.type === tokTypes.privateId &&
				baseExpr.type !== "Super"
			) {
				node.property = this.parsePrivateIdent();
			} else {
				node.property = this.parseIdent(this.options.allowReserved !== "never");
			}
			node.computed = Boolean(computed);
			if (optionalSupported) node.optional = optional;
			return this.finishNode(node, "MemberExpression");
		}
		if (!noCalls && this.eat(tokTypes.parenL)) {
			const refDestructuringErrors = new DestructuringErrors();
			const oldYieldPos = this.yieldPos;
			const oldAwaitPos = this.awaitPos;
			const oldAwaitIdentPos = this.awaitIdentPos;
			this.yieldPos = 0;
			this.awaitPos = 0;
			this.awaitIdentPos = 0;
			const exprList = this.parseExprList(
				tokTypes.parenR,
				this.options.ecmaVersion >= 8,
				false,
				refDestructuringErrors
			);
			if (maybeAsyncArrow && !optional && this.shouldParseAsyncArrow()) {
				this.checkPatternErrors(refDestructuringErrors, false);
				this.checkYieldAwaitInDefaultParams();
				if (this.awaitIdentPos > 0) {
					this.raise(
						this.awaitIdentPos,
						"Cannot use 'await' as identifier inside an async function"
					);
				}
				this.yieldPos = oldYieldPos;
				this.awaitPos = oldAwaitPos;
				this.awaitIdentPos = oldAwaitIdentPos;
				return this.parseSubscriptAsyncArrow(
					startPos,
					startLoc,
					exprList,
					forInit
				);
			}
			this.checkExpressionErrors(refDestructuringErrors, true);
			this.yieldPos = oldYieldPos || this.yieldPos;
			this.awaitPos = oldAwaitPos || this.awaitPos;
			this.awaitIdentPos = oldAwaitIdentPos || this.awaitIdentPos;
			const node = this.startNodeAt(startPos, startLoc);
			node.callee = baseExpr;
			node.arguments = exprList;
			if (optionalSupported) node.optional = optional;
			return this.finishNode(node, "CallExpression");
		}
		if (this.type === tokTypes.backQuote) {
			if (optional || optionalChained) {
				this.raise(
					this.start,
					"Optional chaining cannot appear in the tag of tagged template expressions"
				);
			}
			const node = this.startNodeAt(startPos, startLoc);
			node.tag = baseExpr;
			node.quasi = this.parseTemplate({ isTagged: true });
			return this.finishNode(node, "TaggedTemplateExpression");
		}
		return baseExpr;
	}

	/**
	 * Read an expression that no operator binds into: a token that is an
	 * expression on its own, or one that punctuation encloses.
	 * @param {EXPECTED_ANY=} refDestructuringErrors where to record deferred errors
	 * @param {boolean | string=} forInit whether `in` is held back as an operator
	 * @param {boolean=} forNew whether an enclosing `new` reads the callee
	 * @returns {EXPECTED_ANY} the expression
	 */
	parseExprAtom(refDestructuringErrors, forInit, forNew) {
		// A `/` where an expression belongs means the tokenizer guessed division,
		// so make it read the regexp it really is.
		if (this.type === tokTypes.slash) this.readRegexp();

		let node;
		const canBeArrow = this.potentialArrowAt === this.start;
		switch (this.type) {
			case tokTypes._super:
				if (!this.allowSuper) {
					this.raise(this.start, "'super' keyword outside a method");
				}
				node = this.startNode();
				this.next();
				if (this.type === tokTypes.parenL && !this.allowDirectSuper) {
					this.raise(
						node.start,
						"super() call outside constructor of a subclass"
					);
				}
				if (
					this.type !== tokTypes.dot &&
					this.type !== tokTypes.bracketL &&
					this.type !== tokTypes.parenL
				) {
					this.unexpected();
				}
				return this.finishNode(node, "Super");

			case tokTypes._this:
				node = this.startNode();
				this.next();
				return this.finishNode(node, "ThisExpression");

			case tokTypes.name: {
				const startPos = this.start;
				const startLoc = this.startLoc;
				const { containsEsc } = this;
				let id = this.parseIdent(false);
				if (
					this.options.ecmaVersion >= 8 &&
					!containsEsc &&
					id.name === "async" &&
					!this.canInsertSemicolon() &&
					this.eat(tokTypes._function)
				) {
					this.overrideContext(tokContexts.f_expr);
					return this.parseFunction(
						this.startNodeAt(startPos, startLoc),
						0,
						false,
						true,
						forInit
					);
				}
				if (canBeArrow && !this.canInsertSemicolon()) {
					if (this.eat(tokTypes.arrow)) {
						return this.parseArrowExpression(
							this.startNodeAt(startPos, startLoc),
							[id],
							false,
							forInit
						);
					}
					if (
						this.options.ecmaVersion >= 8 &&
						id.name === "async" &&
						this.type === tokTypes.name &&
						!containsEsc &&
						(!this.potentialArrowInForAwait ||
							this.value !== "of" ||
							this.containsEsc)
					) {
						id = this.parseIdent(false);
						if (this.canInsertSemicolon() || !this.eat(tokTypes.arrow)) {
							this.unexpected();
						}
						return this.parseArrowExpression(
							this.startNodeAt(startPos, startLoc),
							[id],
							true,
							forInit
						);
					}
				}
				return id;
			}

			case tokTypes.regexp: {
				const value = this.value;
				node = this.parseLiteral(value.value);
				node.regex = { pattern: value.pattern, flags: value.flags };
				return node;
			}

			case tokTypes.num:
			case tokTypes.string:
				return this.parseLiteral(this.value);

			case tokTypes._null:
			case tokTypes._true:
			case tokTypes._false:
				node = this.startNode();
				node.value =
					this.type === tokTypes._null ? null : this.type === tokTypes._true;
				node.raw = this.type.keyword;
				this.next();
				return this.finishNode(node, "Literal");

			case tokTypes.parenL: {
				const start = this.start;
				const expr = this.parseParenAndDistinguishExpression(
					canBeArrow,
					forInit
				);
				if (refDestructuringErrors) {
					if (
						refDestructuringErrors.parenthesizedAssign < 0 &&
						!this.isSimpleAssignTarget(expr)
					) {
						refDestructuringErrors.parenthesizedAssign = start;
					}
					if (refDestructuringErrors.parenthesizedBind < 0) {
						refDestructuringErrors.parenthesizedBind = start;
					}
				}
				return expr;
			}

			case tokTypes.bracketL:
				node = this.startNode();
				this.next();
				node.elements = this.parseExprList(
					tokTypes.bracketR,
					true,
					true,
					refDestructuringErrors
				);
				return this.finishNode(node, "ArrayExpression");

			case tokTypes.braceL:
				this.overrideContext(tokContexts.b_expr);
				return this.parseObj(false, refDestructuringErrors);

			case tokTypes._function:
				node = this.startNode();
				this.next();
				return this.parseFunction(node, 0);

			case tokTypes._class:
				return this.parseClass(this.startNode(), false);

			case tokTypes._new:
				return this.parseNew();

			case tokTypes.backQuote:
				return this.parseTemplate();

			case tokTypes._import:
				if (this.options.ecmaVersion >= 11) return this.parseExprImport(forNew);
				return this.unexpected();

			default:
				return this.parseExprAtomDefault();
		}
	}

	/** @returns {never} never returns */
	parseExprAtomDefault() {
		return this.unexpected();
	}

	/**
	 * @param {boolean=} forNew whether an enclosing `new` reads the callee
	 * @returns {EXPECTED_ANY} the import expression or meta property
	 */
	parseExprImport(forNew) {
		const node = this.startNode();

		// `import` reads as an identifier for `import.meta`, and `parseIdent(true)`
		// does not check escapes, so the keyword's own escape check is here.
		if (this.containsEsc) {
			this.raiseRecoverable(this.start, "Escape sequence in keyword import");
		}
		this.next();

		if (this.type === tokTypes.parenL && !forNew) {
			return this.parseDynamicImport(node);
		}
		if (this.type === tokTypes.dot) {
			const meta = this.startNodeAt(node.start, node.loc && node.loc.start);
			meta.name = "import";
			node.meta = this.finishNode(meta, "Identifier");
			return this.parseImportMeta(node);
		}
		return this.unexpected();
	}

	/**
	 * @param {EXPECTED_ANY} node the import expression node
	 * @returns {EXPECTED_ANY} the finished expression
	 */
	parseDynamicImport(node) {
		this.next();

		node.source = this.parseMaybeAssign();

		if (this.options.ecmaVersion >= 16) {
			if (this.eat(tokTypes.parenR)) {
				node.options = null;
			} else {
				this.expect(tokTypes.comma);
				if (this.afterTrailingComma(tokTypes.parenR)) {
					node.options = null;
				} else {
					node.options = this.parseMaybeAssign();
					if (!this.eat(tokTypes.parenR)) {
						this.expect(tokTypes.comma);
						if (!this.afterTrailingComma(tokTypes.parenR)) this.unexpected();
					}
				}
			}
		} else if (!this.eat(tokTypes.parenR)) {
			const errorPos = this.start;
			if (this.eat(tokTypes.comma) && this.eat(tokTypes.parenR)) {
				this.raiseRecoverable(
					errorPos,
					"Trailing comma is not allowed in import()"
				);
			} else {
				this.unexpected(errorPos);
			}
		}

		return this.finishNode(node, "ImportExpression");
	}

	/**
	 * @param {EXPECTED_ANY} node the meta property node
	 * @returns {EXPECTED_ANY} the finished expression
	 */
	parseImportMeta(node) {
		this.next();

		const { containsEsc } = this;
		node.property = this.parseIdent(true);

		if (node.property.name !== "meta") {
			this.raiseRecoverable(
				node.property.start,
				"The only valid meta property for import is 'import.meta'"
			);
		}
		if (containsEsc) {
			this.raiseRecoverable(
				node.start,
				"'import.meta' must not contain escaped characters"
			);
		}
		if (
			this.options.sourceType !== "module" &&
			!this.options.allowImportExportEverywhere
		) {
			this.raiseRecoverable(
				node.start,
				"Cannot use 'import.meta' outside a module"
			);
		}

		return this.finishNode(node, "MetaProperty");
	}

	/**
	 * @param {EXPECTED_ANY} value the literal's value
	 * @returns {EXPECTED_ANY} the finished literal
	 */
	parseLiteral(value) {
		const node = this.startNode();
		node.value = value;
		node.raw = this.input.slice(this.start, this.end);
		if (node.raw.charCodeAt(node.raw.length - 1) === 110) {
			node.bigint =
				node.value === null || node.value === undefined
					? node.raw.slice(0, -1).replace(/_/g, "")
					: node.value.toString();
		}
		this.next();
		return this.finishNode(node, "Literal");
	}

	/** @returns {EXPECTED_ANY} the parenthesized expression */
	parseParenExpression() {
		this.expect(tokTypes.parenL);
		const val = this.parseExpression();
		this.expect(tokTypes.parenR);
		return val;
	}

	/**
	 * @param {EXPECTED_ANY[]} exprList what the parentheses held
	 * @returns {boolean} whether an arrow body may follow
	 */
	shouldParseArrow(exprList) {
		return !this.canInsertSemicolon();
	}

	/**
	 * Read a parenthesized expression, which is only known to be an arrow's
	 * parameter list once the `=>` after the closing paren is seen.
	 * @param {boolean} canBeArrow whether an arrow may start here
	 * @param {boolean | string=} forInit whether `in` is held back as an operator
	 * @returns {EXPECTED_ANY} the expression
	 */
	parseParenAndDistinguishExpression(canBeArrow, forInit) {
		const startPos = this.start;
		const startLoc = this.startLoc;
		let val;
		const allowTrailingComma = this.options.ecmaVersion >= 8;
		if (this.options.ecmaVersion >= 6) {
			this.next();

			const innerStartPos = this.start;
			const innerStartLoc = this.startLoc;
			const exprList = [];
			let first = true;
			let lastIsComma = false;
			const refDestructuringErrors = new DestructuringErrors();
			const oldYieldPos = this.yieldPos;
			const oldAwaitPos = this.awaitPos;
			let spreadStart;
			this.yieldPos = 0;
			this.awaitPos = 0;
			// `awaitIdentPos` is deliberately kept, so an `await` nested in these
			// parameters is still checked once the arrow is known.
			while (this.type !== tokTypes.parenR) {
				if (first) first = false;
				else this.expect(tokTypes.comma);
				if (
					allowTrailingComma &&
					this.afterTrailingComma(tokTypes.parenR, true)
				) {
					lastIsComma = true;
					break;
				} else if (this.type === tokTypes.ellipsis) {
					spreadStart = this.start;
					exprList.push(this.parseParenItem(this.parseRestBinding()));
					if (this.type === tokTypes.comma) {
						this.raiseRecoverable(
							this.start,
							"Comma is not permitted after the rest element"
						);
					}
					break;
				} else {
					exprList.push(
						this.parseMaybeAssign(
							false,
							refDestructuringErrors,
							this.parseParenItem
						)
					);
				}
			}
			const innerEndPos = this.lastTokEnd;
			const innerEndLoc = this.lastTokEndLoc;
			this.expect(tokTypes.parenR);

			if (
				canBeArrow &&
				this.shouldParseArrow(exprList) &&
				this.eat(tokTypes.arrow)
			) {
				this.checkPatternErrors(refDestructuringErrors, false);
				this.checkYieldAwaitInDefaultParams();
				this.yieldPos = oldYieldPos;
				this.awaitPos = oldAwaitPos;
				return this.parseParenArrowList(startPos, startLoc, exprList, forInit);
			}

			if (!exprList.length || lastIsComma) this.unexpected(this.lastTokStart);
			if (spreadStart) this.unexpected(spreadStart);
			this.checkExpressionErrors(refDestructuringErrors, true);
			this.yieldPos = oldYieldPos || this.yieldPos;
			this.awaitPos = oldAwaitPos || this.awaitPos;

			if (exprList.length > 1) {
				val = this.startNodeAt(innerStartPos, innerStartLoc);
				val.expressions = exprList;
				this.finishNodeAt(val, "SequenceExpression", innerEndPos, innerEndLoc);
			} else {
				val = exprList[0];
			}
		} else {
			val = this.parseParenExpression();
		}

		if (this.options.preserveParens) {
			const par = this.startNodeAt(startPos, startLoc);
			par.expression = val;
			return this.finishNode(par, "ParenthesizedExpression");
		}
		return val;
	}

	/**
	 * @param {EXPECTED_ANY} item what the parentheses held
	 * @returns {EXPECTED_ANY} the same item
	 */
	parseParenItem(item) {
		return item;
	}

	/**
	 * @param {number} startPos where the arrow starts
	 * @param {PositionLike | null | undefined} startLoc its start position
	 * @param {EXPECTED_ANY[]} exprList its parameters
	 * @param {boolean | string=} forInit whether `in` is held back as an operator
	 * @returns {EXPECTED_ANY} the arrow function
	 */
	parseParenArrowList(startPos, startLoc, exprList, forInit) {
		return this.parseArrowExpression(
			this.startNodeAt(startPos, startLoc),
			exprList,
			false,
			forInit
		);
	}

	/**
	 * Read a `new` expression, whose callee takes subscripts but not a call —
	 * the argument list belongs to the `new` itself.
	 * @returns {EXPECTED_ANY} the expression
	 */
	parseNew() {
		if (this.containsEsc) {
			this.raiseRecoverable(this.start, "Escape sequence in keyword new");
		}
		const node = this.startNode();
		this.next();
		if (this.options.ecmaVersion >= 6 && this.type === tokTypes.dot) {
			const meta = this.startNodeAt(node.start, node.loc && node.loc.start);
			meta.name = "new";
			node.meta = this.finishNode(meta, "Identifier");
			this.next();
			const { containsEsc } = this;
			node.property = this.parseIdent(true);
			if (node.property.name !== "target") {
				this.raiseRecoverable(
					node.property.start,
					"The only valid meta property for new is 'new.target'"
				);
			}
			if (containsEsc) {
				this.raiseRecoverable(
					node.start,
					"'new.target' must not contain escaped characters"
				);
			}
			if (!this.allowNewDotTarget) {
				this.raiseRecoverable(
					node.start,
					"'new.target' can only be used in functions and class static block"
				);
			}
			return this.finishNode(node, "MetaProperty");
		}
		const startPos = this.start;
		const startLoc = this.startLoc;
		node.callee = this.parseSubscripts(
			this.parseExprAtom(null, false, true),
			startPos,
			startLoc,
			true,
			false
		);
		if (node.callee.type === "Super") {
			this.raiseRecoverable(startPos, "Invalid use of 'super'");
		}
		if (this.eat(tokTypes.parenL)) {
			node.arguments = this.parseExprList(
				tokTypes.parenR,
				this.options.ecmaVersion >= 8,
				false
			);
		} else {
			node.arguments = empty;
		}
		return this.finishNode(node, "NewExpression");
	}

	/**
	 * @param {{ isTagged: boolean }} opts whether the template is tagged
	 * @returns {EXPECTED_ANY} the finished element
	 */
	parseTemplateElement(opts) {
		const { isTagged } = opts;

		const elem = this.startNode();
		if (this.type === tokTypes.invalidTemplate) {
			if (!isTagged) {
				this.raiseRecoverable(
					this.start,
					"Bad escape sequence in untagged template literal"
				);
			}
			elem.value = {
				raw: /** @type {string} */ (this.value).replace(/\r\n?/g, "\n"),
				cooked: null
			};
		} else {
			elem.value = {
				raw: this.input.slice(this.start, this.end).replace(/\r\n?/g, "\n"),
				cooked: this.value
			};
		}
		this.next();
		elem.tail = this.type === tokTypes.backQuote;
		return this.finishNode(elem, "TemplateElement");
	}

	/**
	 * @param {{ isTagged?: boolean }=} opts whether the template is tagged
	 * @returns {EXPECTED_ANY} the finished template
	 */
	parseTemplate(opts) {
		const isTagged = Boolean(opts && opts.isTagged);

		const node = this.startNode();
		this.next();
		node.expressions = [];
		let curElt = this.parseTemplateElement({ isTagged });
		node.quasis = [curElt];
		while (!curElt.tail) {
			if (this.type === tokTypes.eof) {
				this.raise(this.pos, "Unterminated template literal");
			}
			this.expect(tokTypes.dollarBraceL);
			node.expressions.push(this.parseExpression());
			this.expect(tokTypes.braceR);
			curElt = this.parseTemplateElement({ isTagged });
			node.quasis.push(curElt);
		}
		this.next();
		return this.finishNode(node, "TemplateLiteral");
	}

	/**
	 * @param {EXPECTED_ANY} prop the property whose key was just read
	 * @returns {boolean} whether `async` there was a modifier rather than the name
	 */
	isAsyncProp(prop) {
		return (
			!prop.computed &&
			prop.key.type === "Identifier" &&
			prop.key.name === "async" &&
			(this.type === tokTypes.name ||
				this.type === tokTypes.num ||
				this.type === tokTypes.string ||
				this.type === tokTypes.bracketL ||
				Boolean(this.type.keyword) ||
				(this.options.ecmaVersion >= 9 && this.type === tokTypes.star)) &&
			!lineBreak.test(this.input.slice(this.lastTokEnd, this.start))
		);
	}

	/**
	 * @param {boolean} isPattern whether it binds rather than builds a value
	 * @param {EXPECTED_ANY=} refDestructuringErrors where to record deferred errors
	 * @returns {EXPECTED_ANY} the object literal or pattern
	 */
	parseObj(isPattern, refDestructuringErrors) {
		const node = this.startNode();
		let first = true;
		const propHash = {};
		node.properties = [];
		this.next();
		while (!this.eat(tokTypes.braceR)) {
			if (first) {
				first = false;
			} else {
				this.expect(tokTypes.comma);
				if (
					this.options.ecmaVersion >= 5 &&
					this.afterTrailingComma(tokTypes.braceR)
				) {
					break;
				}
			}

			const prop = this.parseProperty(isPattern, refDestructuringErrors);
			if (!isPattern) {
				this.checkPropClash(prop, propHash, refDestructuringErrors);
			}
			node.properties.push(prop);
		}
		return this.finishNode(
			node,
			isPattern ? "ObjectPattern" : "ObjectExpression"
		);
	}

	/**
	 * @param {boolean} isPattern whether it binds rather than builds a value
	 * @param {EXPECTED_ANY=} refDestructuringErrors where to record deferred errors
	 * @returns {EXPECTED_ANY} the property
	 */
	parseProperty(isPattern, refDestructuringErrors) {
		const prop = this.startNode();
		let isGenerator;
		let isAsync;
		let startPos;
		let startLoc;
		if (this.options.ecmaVersion >= 9 && this.eat(tokTypes.ellipsis)) {
			if (isPattern) {
				prop.argument = this.parseIdent(false);
				if (this.type === tokTypes.comma) {
					this.raiseRecoverable(
						this.start,
						"Comma is not permitted after the rest element"
					);
				}
				return this.finishNode(prop, "RestElement");
			}
			prop.argument = this.parseMaybeAssign(false, refDestructuringErrors);
			// Recorded so that `toAssignable` can refuse a trailing comma here.
			if (
				this.type === tokTypes.comma &&
				refDestructuringErrors &&
				refDestructuringErrors.trailingComma < 0
			) {
				refDestructuringErrors.trailingComma = this.start;
			}
			return this.finishNode(prop, "SpreadElement");
		}
		if (this.options.ecmaVersion >= 6) {
			prop.method = false;
			prop.shorthand = false;
			if (isPattern || refDestructuringErrors) {
				startPos = this.start;
				startLoc = this.startLoc;
			}
			if (!isPattern) isGenerator = this.eat(tokTypes.star);
		}
		const { containsEsc } = this;
		this.parsePropertyName(prop);
		if (
			!isPattern &&
			!containsEsc &&
			this.options.ecmaVersion >= 8 &&
			!isGenerator &&
			this.isAsyncProp(prop)
		) {
			isAsync = true;
			isGenerator = this.options.ecmaVersion >= 9 && this.eat(tokTypes.star);
			this.parsePropertyName(prop);
		} else {
			isAsync = false;
		}
		this.parsePropertyValue(
			prop,
			isPattern,
			isGenerator,
			isAsync,
			startPos,
			startLoc,
			refDestructuringErrors,
			containsEsc
		);
		return this.finishNode(prop, "Property");
	}

	/**
	 * @param {EXPECTED_ANY} prop the property whose `get`/`set` was just read
	 * @returns {void}
	 */
	parseGetterSetter(prop) {
		const kind = prop.key.name;
		this.parsePropertyName(prop);
		prop.value = this.parseMethod(false);
		prop.kind = kind;
		const paramCount = prop.kind === "get" ? 0 : 1;
		if (prop.value.params.length === paramCount) {
			if (prop.kind === "set" && prop.value.params[0].type === "RestElement") {
				this.raiseRecoverable(
					prop.value.params[0].start,
					"Setter cannot use rest params"
				);
			}
		} else {
			const start = prop.value.start;
			if (prop.kind === "get") {
				this.raiseRecoverable(start, "getter should have no params");
			} else {
				this.raiseRecoverable(start, "setter should have exactly one param");
			}
		}
	}

	/**
	 * @param {EXPECTED_ANY} prop the property whose key was read
	 * @param {boolean} isPattern whether it binds rather than builds a value
	 * @param {boolean | undefined} isGenerator whether it is a generator method
	 * @param {boolean | undefined} isAsync whether it is an async method
	 * @param {number | undefined} startPos where the property starts
	 * @param {PositionLike | null | undefined} startLoc its start position
	 * @param {EXPECTED_ANY} refDestructuringErrors where to record deferred errors
	 * @param {boolean} containsEsc whether the key was written with an escape
	 * @returns {void}
	 */
	parsePropertyValue(
		prop,
		isPattern,
		isGenerator,
		isAsync,
		startPos,
		startLoc,
		refDestructuringErrors,
		containsEsc
	) {
		if ((isGenerator || isAsync) && this.type === tokTypes.colon) {
			this.unexpected();
		}

		if (this.eat(tokTypes.colon)) {
			prop.value = isPattern
				? this.parseMaybeDefault(this.start, this.startLoc)
				: this.parseMaybeAssign(false, refDestructuringErrors);
			prop.kind = "init";
		} else if (this.options.ecmaVersion >= 6 && this.type === tokTypes.parenL) {
			if (isPattern) this.unexpected();
			prop.method = true;
			prop.value = this.parseMethod(isGenerator, isAsync);
			prop.kind = "init";
		} else if (
			!isPattern &&
			!containsEsc &&
			this.options.ecmaVersion >= 5 &&
			!prop.computed &&
			prop.key.type === "Identifier" &&
			(prop.key.name === "get" || prop.key.name === "set") &&
			this.type !== tokTypes.comma &&
			this.type !== tokTypes.braceR &&
			this.type !== tokTypes.eq
		) {
			if (isGenerator || isAsync) this.unexpected();
			this.parseGetterSetter(prop);
		} else if (
			this.options.ecmaVersion >= 6 &&
			!prop.computed &&
			prop.key.type === "Identifier"
		) {
			if (isGenerator || isAsync) this.unexpected();
			this.checkUnreserved(prop.key);
			if (prop.key.name === "await" && !this.awaitIdentPos) {
				this.awaitIdentPos = /** @type {number} */ (startPos);
			}
			if (isPattern) {
				prop.value = this.parseMaybeDefault(
					/** @type {number} */ (startPos),
					/** @type {Position | null} */ (startLoc),
					this.copyNode(prop.key)
				);
			} else if (this.type === tokTypes.eq && refDestructuringErrors) {
				if (refDestructuringErrors.shorthandAssign < 0) {
					refDestructuringErrors.shorthandAssign = this.start;
				}
				prop.value = this.parseMaybeDefault(
					/** @type {number} */ (startPos),
					/** @type {Position | null} */ (startLoc),
					this.copyNode(prop.key)
				);
			} else {
				prop.value = this.copyNode(prop.key);
			}
			prop.kind = "init";
			prop.shorthand = true;
		} else {
			this.unexpected();
		}
	}

	/**
	 * @param {EXPECTED_ANY} prop the property to name
	 * @returns {EXPECTED_ANY} the key
	 */
	parsePropertyName(prop) {
		if (this.options.ecmaVersion >= 6) {
			if (this.eat(tokTypes.bracketL)) {
				prop.computed = true;
				prop.key = this.parseMaybeAssign();
				this.expect(tokTypes.bracketR);
				return prop.key;
			}
			prop.computed = false;
		}
		prop.key =
			this.type === tokTypes.num || this.type === tokTypes.string
				? this.parseExprAtom()
				: this.parseIdent(this.options.allowReserved !== "never");
		return prop.key;
	}

	/**
	 * @param {EXPECTED_ANY} node the function node to blank out
	 * @returns {void}
	 */
	initFunction(node) {
		node.id = null;
		if (this.options.ecmaVersion >= 6) {
			// acorn writes `node.generator = node.expression = false`, so the
			// `expression` slot is the one created first
			node.expression = false;
			node.generator = false;
		}
		if (this.options.ecmaVersion >= 8) node.async = false;
	}

	/**
	 * @param {boolean=} isGenerator whether it is a generator
	 * @param {boolean=} isAsync whether it is async
	 * @param {boolean=} allowDirectSuper whether `super()` may be called in it
	 * @returns {EXPECTED_ANY} the method's function expression
	 */
	parseMethod(isGenerator, isAsync, allowDirectSuper) {
		const node = this.startNode();
		const oldYieldPos = this.yieldPos;
		const oldAwaitPos = this.awaitPos;
		const oldAwaitIdentPos = this.awaitIdentPos;

		this.initFunction(node);
		if (this.options.ecmaVersion >= 6) node.generator = isGenerator;
		if (this.options.ecmaVersion >= 8) node.async = Boolean(isAsync);

		this.yieldPos = 0;
		this.awaitPos = 0;
		this.awaitIdentPos = 0;
		this.enterScope(
			functionFlags(Boolean(isAsync), node.generator) |
				SCOPE_SUPER |
				(allowDirectSuper ? SCOPE_DIRECT_SUPER : 0)
		);

		this.expect(tokTypes.parenL);
		node.params = this.parseBindingList(
			tokTypes.parenR,
			false,
			this.options.ecmaVersion >= 8
		);
		this.checkYieldAwaitInDefaultParams();
		this.parseFunctionBody(node, false, true, false);

		this.yieldPos = oldYieldPos;
		this.awaitPos = oldAwaitPos;
		this.awaitIdentPos = oldAwaitIdentPos;
		return this.finishNode(node, "FunctionExpression");
	}

	/**
	 * @param {EXPECTED_ANY} node the arrow node
	 * @param {EXPECTED_ANY[]} params what stood before the arrow
	 * @param {boolean} isAsync whether it is async
	 * @param {boolean | string=} forInit whether `in` is held back as an operator
	 * @returns {EXPECTED_ANY} the arrow function
	 */
	parseArrowExpression(node, params, isAsync, forInit) {
		const oldYieldPos = this.yieldPos;
		const oldAwaitPos = this.awaitPos;
		const oldAwaitIdentPos = this.awaitIdentPos;

		this.enterScope(functionFlags(isAsync, false) | SCOPE_ARROW);
		this.initFunction(node);
		if (this.options.ecmaVersion >= 8) node.async = Boolean(isAsync);

		this.yieldPos = 0;
		this.awaitPos = 0;
		this.awaitIdentPos = 0;

		node.params = this.toAssignableList(params, true);
		this.parseFunctionBody(node, true, false, forInit);

		this.yieldPos = oldYieldPos;
		this.awaitPos = oldAwaitPos;
		this.awaitIdentPos = oldAwaitIdentPos;
		return this.finishNode(node, "ArrowFunctionExpression");
	}

	/**
	 * @param {EXPECTED_ANY} node the function node
	 * @param {boolean=} isArrowFunction whether it is an arrow
	 * @param {boolean=} isMethod whether it is a method
	 * @param {boolean | string=} forInit whether `in` is held back as an operator
	 * @returns {void}
	 */
	parseFunctionBody(node, isArrowFunction, isMethod, forInit) {
		const isExpression = isArrowFunction && this.type !== tokTypes.braceL;
		const oldStrict = this.strict;
		let useStrict = false;

		if (isExpression) {
			node.body = this.parseMaybeAssign(forInit);
			node.expression = true;
			this.checkParams(node, false);
		} else {
			const nonSimple =
				this.options.ecmaVersion >= 7 && !this.isSimpleParamList(node.params);
			if (!oldStrict || nonSimple) {
				useStrict = this.strictDirective(this.end);
				if (useStrict && nonSimple) {
					this.raiseRecoverable(
						node.start,
						"Illegal 'use strict' directive in function with non-simple parameter list"
					);
				}
			}
			// Labels and the enclosing function flag are per-function, so hold the
			// outer ones aside until the body is read.
			const oldLabels = this.labels;
			this.labels = [];
			if (useStrict) this.strict = true;

			this.checkParams(
				node,
				!oldStrict &&
					!useStrict &&
					!isArrowFunction &&
					!isMethod &&
					this.isSimpleParamList(node.params)
			);
			if (this.strict && node.id) this.checkLValSimple(node.id, BIND_OUTSIDE);
			node.body = this.parseBlock(false, undefined, useStrict && !oldStrict);
			node.expression = false;
			this.adaptDirectivePrologue(node.body.body);
			this.labels = oldLabels;
		}
		this.exitScope();
	}

	/**
	 * @param {EXPECTED_ANY[]} params the parameter list
	 * @returns {boolean} whether every parameter is a plain identifier
	 */
	isSimpleParamList(params) {
		for (const param of params) {
			if (param.type !== "Identifier") return false;
		}
		return true;
	}

	/**
	 * @param {EXPECTED_ANY} node the function node
	 * @param {boolean} allowDuplicates whether repeated parameter names are allowed
	 * @returns {void}
	 */
	checkParams(node, allowDuplicates) {
		const nameHash = Object.create(null);
		for (const param of node.params) {
			this.checkLValInnerPattern(
				param,
				BIND_VAR,
				allowDuplicates ? null : nameHash
			);
		}
	}

	/**
	 * @param {TokenType} close the token that ends the list
	 * @param {boolean} allowTrailingComma whether a trailing comma is allowed
	 * @param {boolean} allowEmpty whether holes are allowed
	 * @param {EXPECTED_ANY=} refDestructuringErrors where to record deferred errors
	 * @returns {EXPECTED_ANY[]} the expressions
	 */
	parseExprList(close, allowTrailingComma, allowEmpty, refDestructuringErrors) {
		const elements = [];
		let first = true;
		while (!this.eat(close)) {
			if (first) {
				first = false;
			} else {
				this.expect(tokTypes.comma);
				if (allowTrailingComma && this.afterTrailingComma(close)) break;
			}

			let elt;
			if (allowEmpty && this.type === tokTypes.comma) {
				elt = null;
			} else if (this.type === tokTypes.ellipsis) {
				elt = this.parseSpread(refDestructuringErrors);
				if (
					refDestructuringErrors &&
					this.type === tokTypes.comma &&
					refDestructuringErrors.trailingComma < 0
				) {
					refDestructuringErrors.trailingComma = this.start;
				}
			} else {
				elt = this.parseMaybeAssign(false, refDestructuringErrors);
			}
			elements.push(elt);
		}
		return elements;
	}

	/**
	 * Report a name that the surrounding code may not use as an identifier.
	 * @param {EXPECTED_ANY} ref the identifier node
	 * @returns {void}
	 */
	checkUnreserved(ref) {
		const { start, end, name } = ref;

		if (this.inGenerator && name === "yield") {
			this.raiseRecoverable(
				start,
				"Cannot use 'yield' as identifier inside a generator"
			);
		}
		if (this.inAsync && name === "await") {
			this.raiseRecoverable(
				start,
				"Cannot use 'await' as identifier inside an async function"
			);
		}
		if (!(this.currentThisScope().flags & SCOPE_VAR) && name === "arguments") {
			this.raiseRecoverable(
				start,
				"Cannot use 'arguments' in class field initializer"
			);
		}
		if (this.inClassStaticBlock && (name === "arguments" || name === "await")) {
			this.raise(
				start,
				`Cannot use ${name} in class static initialization block`
			);
		}
		if (this.keywords.test(name)) {
			this.raise(start, `Unexpected keyword '${name}'`);
		}
		if (
			this.options.ecmaVersion < 6 &&
			this.input.slice(start, end).includes("\\")
		) {
			return;
		}
		const re = this.strict ? this.reservedWordsStrict : this.reservedWords;
		if (re.test(name)) {
			if (!this.inAsync && name === "await") {
				this.raiseRecoverable(
					start,
					"Cannot use keyword 'await' outside an async function"
				);
			}
			this.raiseRecoverable(start, `The keyword '${name}' is reserved`);
		}
	}

	/**
	 * @param {boolean=} liberal whether a keyword may be read as a name
	 * @returns {EXPECTED_ANY} the identifier
	 */
	parseIdent(liberal) {
		const node = this.parseIdentNode();
		this.next(Boolean(liberal));
		this.finishNode(node, "Identifier");
		if (!liberal) {
			this.checkUnreserved(node);
			if (node.name === "await" && !this.awaitIdentPos) {
				this.awaitIdentPos = node.start;
			}
		}
		return node;
	}

	/** @returns {EXPECTED_ANY} the identifier, before the token is consumed */
	parseIdentNode() {
		const node = this.startNode();
		if (this.type === tokTypes.name) {
			node.name = this.value;
		} else if (this.type.keyword) {
			node.name = this.type.keyword;

			// `class` and `function` push a context that nothing would pop once the
			// keyword is read as a property name; a preceding dot already skips that.
			if (
				(node.name === "class" || node.name === "function") &&
				(this.lastTokEnd !== this.lastTokStart + 1 ||
					this.input.charCodeAt(this.lastTokStart) !== 46)
			) {
				this.context.pop();
			}
			this.type = tokTypes.name;
		} else {
			this.unexpected();
		}
		return node;
	}

	/** @returns {EXPECTED_ANY} the private identifier */
	parsePrivateIdent() {
		const node = this.startNode();
		if (this.type === tokTypes.privateId) {
			node.name = this.value;
		} else {
			this.unexpected();
		}
		this.next();
		this.finishNode(node, "PrivateIdentifier");

		if (this.options.checkPrivateFields) {
			if (this.privateNameStack.length === 0) {
				this.raise(
					node.start,
					`Private field '#${node.name}' must be declared in an enclosing class`
				);
			} else {
				this.privateNameStack[this.privateNameStack.length - 1].used.push(node);
			}
		}

		return node;
	}

	/**
	 * @param {boolean | string=} forInit whether `in` is held back as an operator
	 * @returns {EXPECTED_ANY} the yield expression
	 */
	parseYield(forInit) {
		if (!this.yieldPos) this.yieldPos = this.start;

		const node = this.startNode();
		this.next();
		if (
			this.type === tokTypes.semi ||
			this.canInsertSemicolon() ||
			(this.type !== tokTypes.star && !this.type.startsExpr)
		) {
			node.delegate = false;
			node.argument = null;
		} else {
			node.delegate = this.eat(tokTypes.star);
			node.argument = this.parseMaybeAssign(forInit);
		}
		return this.finishNode(node, "YieldExpression");
	}

	/**
	 * @param {boolean | string=} forInit whether `in` is held back as an operator
	 * @returns {EXPECTED_ANY} the await expression
	 */
	parseAwait(forInit) {
		if (!this.awaitPos) this.awaitPos = this.start;

		const node = this.startNode();
		this.next();
		node.argument = this.parseMaybeUnary(null, true, false, forInit);
		return this.finishNode(node, "AwaitExpression");
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
		const err = /** @type {EXPECTED_ANY} */ (new SyntaxError(text));
		err.pos = pos;
		err.loc = loc;
		err.raisedAt = this.pos;
		throw err;
	}

	/**
	 * @param {number} pos where the error is
	 * @param {string} message what is wrong
	 * @returns {never} never returns
	 */
	raiseRecoverable(pos, message) {
		return this.raise(pos, message);
	}

	/** @returns {Position | undefined} where the tokenizer stands, when tracked */
	curPosition() {
		if (this.options.locations) {
			return new Position(this.curLine, this.pos - this.lineStart);
		}
	}

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

		this.lastTokEnd = this.end;
		this.lastTokStart = this.start;
		this.lastTokEndLoc = this.endLoc;
		this.lastTokStartLoc = this.startLoc;
		this.nextToken();
	}

	/** @returns {Token} the token after the current one */
	getToken() {
		this.next();
		return new Token(this);
	}

	/** @returns {Iterator<Token>} the remaining tokens */
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
	 * @param {EXPECTED_ANY=} value what it carries
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
	readToken_dot() {
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
	readToken_slash() {
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
	readToken_mult_modulo_exp(code) {
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
	readToken_pipe_amp(code) {
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
	readToken_caret() {
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
	readToken_plus_min(code) {
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
	readToken_lt_gt(code) {
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
			!this.inModule &&
			this.input.charCodeAt(this.pos + 2) === 45 &&
			this.input.charCodeAt(this.pos + 3) === 45
		) {
			// `<!--` opens an HTML-style comment, which annex B reads as a line one.
			this.skipLineComment(4);
			this.skipSpace();
			this.nextToken();
			return;
		}
		if (next === 61) size = 2;
		this.finishOp(tokTypes.relational, size);
	}

	/**
	 * @param {number} code the operator's first character
	 * @returns {void}
	 */
	readToken_eq_excl(code) {
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
	readToken_question() {
		const { ecmaVersion } = this.options;
		if (ecmaVersion >= 11) {
			const next = this.input.charCodeAt(this.pos + 1);
			if (next === 46) {
				const next2 = this.input.charCodeAt(this.pos + 2);
				if (next2 < 48 || next2 > 57) {
					this.finishOp(tokTypes.questionDot, 2);
					return;
				}
			}
			if (next === 63) {
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
	readToken_numberSign() {
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
				this.readToken_dot();
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
				this.readToken_slash();
				return;

			case 37:
			case 42:
				this.readToken_mult_modulo_exp(code);
				return;

			case 124:
			case 38:
				this.readToken_pipe_amp(code);
				return;

			case 94:
				this.readToken_caret();
				return;

			case 43:
			case 45:
				this.readToken_plus_min(code);
				return;

			case 60:
			case 62:
				this.readToken_lt_gt(code);
				return;

			case 61:
			case 33:
				this.readToken_eq_excl(code);
				return;

			case 63:
				this.readToken_question();
				return;

			case 126:
				this.finishOp(tokTypes.prefix, 1);
				return;

			case 35:
				this.readToken_numberSign();
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
	 * @param {import("./regexp").RegExpValidationState} state the validation state
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
	 * @param {import("./regexp").RegExpValidationState} state the validation state
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
		if (!startsWithDot && this.readInt(10, undefined, true) === null) {
			this.raise(start, "Invalid number");
		}
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
				return "\u000B";
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
						this.input.slice(this.pos - 1, this.pos + 2).match(/^[0-7]+/)
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
	 * was written as an escape — which stops it reading as a keyword.
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
 * Whether a private name repeats one the same class body already declared. A
 * getter and its setter are the one pair that may share a name.
 * @param {EXPECTED_ANY} privateNameMap what the body has declared so far
 * @param {EXPECTED_ANY} element the element being declared
 * @returns {boolean} whether it conflicts
 */
const isPrivateNameConflicted = (privateNameMap, element) => {
	const name = element.key.name;
	const curr = privateNameMap[name];

	let next = "true";
	if (
		element.type === "MethodDefinition" &&
		(element.kind === "get" || element.kind === "set")
	) {
		next = (element.static ? "s" : "i") + element.kind;
	}

	if (
		(curr === "iget" && next === "iset") ||
		(curr === "iset" && next === "iget") ||
		(curr === "sget" && next === "sset") ||
		(curr === "sset" && next === "sget")
	) {
		privateNameMap[name] = "true";
		return false;
	}
	if (!curr) {
		privateNameMap[name] = next;
		return false;
	}
	return true;
};

/**
 * @param {EXPECTED_ANY} node the class element
 * @param {string} name the name to compare against
 * @returns {boolean} whether the element carries that name, not computed
 */
const checkKeyName = (node, name) => {
	const { computed, key } = node;
	return (
		!computed &&
		((key.type === "Identifier" && key.name === name) ||
			(key.type === "Literal" && key.value === name))
	);
};

/**
 * @param {EXPECTED_ANY} node the operand of `delete`
 * @returns {boolean} whether it names a variable rather than a property
 */
const isLocalVariableAccess = (node) =>
	node.type === "Identifier" ||
	(node.type === "ParenthesizedExpression" &&
		isLocalVariableAccess(node.expression));

/**
 * @param {EXPECTED_ANY} node the operand of `delete`
 * @returns {boolean} whether it reads a private field
 */
const isPrivateFieldAccess = (node) =>
	(node.type === "MemberExpression" &&
		node.property.type === "PrivateIdentifier") ||
	(node.type === "ChainExpression" && isPrivateFieldAccess(node.expression)) ||
	(node.type === "ParenthesizedExpression" &&
		isPrivateFieldAccess(node.expression));

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

/**
 * @param {string} str the literal's text, without its `n`
 * @returns {bigint | null} its value, or `null` where the host has no BigInt
 */
const stringToBigInt = (str) => {
	if (typeof BigInt !== "function") return null;

	// `BigInt` refuses separators, so they come out first.
	return BigInt(str.replace(/_/g, ""));
};

// Thrown to unwind out of a template element whose escape is bad, so the raw
// text can be re-read without cooking it.
const INVALID_TEMPLATE_ESCAPE_ERROR = {};

// Token-specific context updates. A closing brace or paren pops what its
// opener pushed, and a `{` is only a block where `braceIsBlock` says so.
/**
 * @this {EXPECTED_ANY}
 * @returns {void}
 */
function closeBraceOrParenContext() {
	if (this.context.length === 1) {
		this.exprAllowed = true;
		return;
	}
	let out = this.context.pop();
	if (out === tokContexts.b_stat && this.curContext().token === "function") {
		out = this.context.pop();
	}
	this.exprAllowed = !out.isExpr;
}

/**
 * @this {EXPECTED_ANY}
 * @param {TokenType} prevType the token before this one
 * @returns {void}
 */
function braceLContext(prevType) {
	this.context.push(
		this.braceIsBlock(prevType) ? tokContexts.b_stat : tokContexts.b_expr
	);
	this.exprAllowed = true;
}

/**
 * @this {EXPECTED_ANY}
 * @returns {void}
 */
function dollarBraceLContext() {
	this.context.push(tokContexts.b_tmpl);
	this.exprAllowed = true;
}

/**
 * @this {EXPECTED_ANY}
 * @param {TokenType} prevType the token before this one
 * @returns {void}
 */
function parenLContext(prevType) {
	const statementParens =
		prevType === tokTypes._if ||
		prevType === tokTypes._for ||
		prevType === tokTypes._with ||
		prevType === tokTypes._while;
	this.context.push(statementParens ? tokContexts.p_stat : tokContexts.p_expr);
	this.exprAllowed = true;
}

/**
 * `++`/`--` leaves `exprAllowed` as it stands, since it reads as either a
 * prefix or a postfix operator.
 * @returns {void}
 */
function incDecContext() {}

/**
 * @this {EXPECTED_ANY}
 * @param {TokenType} prevType the token before this one
 * @returns {void}
 */
function functionOrClassContext(prevType) {
	if (
		prevType.beforeExpr &&
		prevType !== tokTypes._else &&
		!(prevType === tokTypes.semi && this.curContext() !== tokContexts.p_stat) &&
		!(
			prevType === tokTypes._return &&
			lineBreak.test(this.input.slice(this.lastTokEnd, this.start))
		) &&
		!(
			(prevType === tokTypes.colon || prevType === tokTypes.braceL) &&
			this.curContext() === tokContexts.b_stat
		)
	) {
		this.context.push(tokContexts.f_expr);
	} else {
		this.context.push(tokContexts.f_stat);
	}
	this.exprAllowed = false;
}

/**
 * @this {EXPECTED_ANY}
 * @returns {void}
 */
function colonContext() {
	if (this.curContext().token === "function") this.context.pop();
	this.exprAllowed = true;
}

/**
 * @this {EXPECTED_ANY}
 * @returns {void}
 */
function backQuoteContext() {
	if (this.curContext() === tokContexts.q_tmpl) this.context.pop();
	else this.context.push(tokContexts.q_tmpl);
	this.exprAllowed = false;
}

/**
 * @this {EXPECTED_ANY}
 * @param {TokenType} prevType the token before this one
 * @returns {void}
 */
function starContext(prevType) {
	if (prevType === tokTypes._function) {
		const index = this.context.length - 1;
		this.context[index] =
			this.context[index] === tokContexts.f_expr
				? tokContexts.f_expr_gen
				: tokContexts.f_gen;
	}
	this.exprAllowed = true;
}

/**
 * A name allows an expression after it only where it was `of` or a `yield`
 * that the enclosing generator makes an operator.
 * @this {EXPECTED_ANY}
 * @param {TokenType} prevType the token before this one
 * @returns {void}
 */
function nameContext(prevType) {
	let allowed = false;
	if (
		this.options.ecmaVersion >= 6 &&
		prevType !== tokTypes.dot &&
		((this.value === "of" && !this.exprAllowed) ||
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

module.exports.BIND_FUNCTION = BIND_FUNCTION;
module.exports.BIND_LEXICAL = BIND_LEXICAL;
module.exports.BIND_NONE = BIND_NONE;
module.exports.BIND_OUTSIDE = BIND_OUTSIDE;
module.exports.BIND_SIMPLE_CATCH = BIND_SIMPLE_CATCH;
module.exports.BIND_VAR = BIND_VAR;
module.exports.DestructuringErrors = DestructuringErrors;
module.exports.Label = Label;
module.exports.Node = Node;
module.exports.Parser = Parser;
module.exports.Position = Position;
module.exports.SCOPE_ARROW = SCOPE_ARROW;
module.exports.SCOPE_ASYNC = SCOPE_ASYNC;
module.exports.SCOPE_CLASS_FIELD_INIT = SCOPE_CLASS_FIELD_INIT;
module.exports.SCOPE_CLASS_STATIC_BLOCK = SCOPE_CLASS_STATIC_BLOCK;
module.exports.SCOPE_DIRECT_SUPER = SCOPE_DIRECT_SUPER;
module.exports.SCOPE_FUNCTION = SCOPE_FUNCTION;
module.exports.SCOPE_GENERATOR = SCOPE_GENERATOR;
module.exports.SCOPE_SIMPLE_CATCH = SCOPE_SIMPLE_CATCH;
module.exports.SCOPE_SUPER = SCOPE_SUPER;
module.exports.SCOPE_SWITCH = SCOPE_SWITCH;
module.exports.SCOPE_TOP = SCOPE_TOP;
module.exports.SCOPE_VAR = SCOPE_VAR;
module.exports.Scope = Scope;
module.exports.SourceLocation = SourceLocation;
module.exports.TokContext = TokContext;
module.exports.Token = Token;
module.exports.TokenType = TokenType;
module.exports.codePointToString = codePointToString;
module.exports.defaultOptions = defaultOptions;
module.exports.functionFlags = functionFlags;
module.exports.getLineInfo = getLineInfo;
module.exports.getOptions = getOptions;
module.exports.isIdentifierChar = isIdentifierChar;
module.exports.isIdentifierStart = isIdentifierStart;
module.exports.isNewLine = isNewLine;
module.exports.keywordTypes = keywordTypes;
module.exports.lineBreak = lineBreak;
module.exports.lineBreakG = lineBreakG;
module.exports.nextLineBreak = nextLineBreak;
module.exports.nonASCIIwhitespace = nonASCIIwhitespace;
module.exports.skipWhiteSpace = skipWhiteSpace;
module.exports.stringToNumber = stringToNumber;
module.exports.tokContexts = tokContexts;
module.exports.tokTypes = tokTypes;
module.exports.wordsRegexp = wordsRegexp;
