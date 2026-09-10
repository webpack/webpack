/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// cspell:ignore binop prec Prec stanceof Uncapturing

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

let grammarInstalled = false;

/**
 * Copy the grammar onto `Parser.prototype`, once. `lib/javascript/syntax.js`
 * serves every production a webpack build reaches, so the grammar stays
 * unloaded unless something asks this parser to parse.
 * @returns {void}
 */
const installGrammar = () => {
	if (grammarInstalled) return;
	grammarInstalled = true;
	require("./grammar").install(Parser);
};

/**
 * @returns {typeof import("./grammar")} the grammar module
 */
const grammar = () => require("./grammar");

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

// How a function declaration was reached, which decides whether it may be
// unnamed and whether its name binds in the enclosing scope.

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
		installGrammar();
		const parser = /** @type {import("./grammar").Grammar} */ (
			/** @type {unknown} */ (new this(options, input, pos))
		);
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
	 * @returns {EXPECTED_ANY} the parsed program
	 */
	parse() {
		installGrammar();
		return grammar().Grammar.prototype.parse.call(this);
	}

	/**
	 * Read a full expression, including the comma operator.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {boolean | string=} forInit whether `in` is held back as an operator
	 * @param {EXPECTED_ANY=} refDestructuringErrors where to record deferred errors
	 * @returns {EXPECTED_ANY} the expression
	 */
	parseExpression(forInit, refDestructuringErrors) {
		installGrammar();
		return grammar().Grammar.prototype.parseExpression.call(
			this,
			forInit,
			refDestructuringErrors
		);
	}

	/** @returns {Token} the token after the current one */
	getToken() {
		installGrammar();
		return grammar().Grammar.prototype.getToken.call(this);
	}

	/** @returns {Iterator<Token>} the remaining tokens */
	[Symbol.iterator]() {
		installGrammar();
		return grammar().Grammar.prototype[Symbol.iterator].call(this);
	}

	/** @returns {TokContextLike[]} the context stack a fresh parser starts with */
	initialContext() {
		return [tokContexts.b_stat];
	}

	/**
	 * @param {number} flags what kind of scope it is
	 * @returns {void}
	 */
	enterScope(flags) {
		this.scopeStack.push(new Scope(flags));
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
}

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

// Thrown to unwind out of a template element whose escape is bad, so the raw
// text can be re-read without cooking it.

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
module.exports.installGrammar = installGrammar;
module.exports.isIdentifierChar = isIdentifierChar;
module.exports.isIdentifierStart = isIdentifierStart;
module.exports.isLocalVariableAccess = isLocalVariableAccess;
module.exports.isNewLine = isNewLine;
module.exports.isPrivateFieldAccess = isPrivateFieldAccess;
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
