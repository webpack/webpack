/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// cspell:ignore yuku binop prec Prec iget iset sget sset

const { Parser: BaseParser, tokTypes } = require("acorn");

// acorn exports its token-context table but leaves it out of its public types
const tokContexts =
	/** @type {Record<string, unknown>} */
	(
		/** @type {{ tokContexts: Record<string, unknown> }} */
		(/** @type {unknown} */ (require("acorn"))).tokContexts
	);

/** @typedef {{ token: string, isExpr: boolean, preserveSpace?: boolean, generator?: boolean, override?: unknown }} TokContextShim acorn TokContext fields read by the owned tokenizer */

// acorn's token contexts used by the inlined finishToken context updates
const CTX_B_STAT = /** @type {TokContextShim} */ (tokContexts.b_stat);
const CTX_B_EXPR = /** @type {TokContextShim} */ (tokContexts.b_expr);
const CTX_P_STAT = /** @type {TokContextShim} */ (tokContexts.p_stat);
const CTX_P_EXPR = /** @type {TokContextShim} */ (tokContexts.p_expr);
const CTX_F_STAT = /** @type {TokContextShim} */ (tokContexts.f_stat);
const CTX_F_EXPR = /** @type {TokContextShim} */ (tokContexts.f_expr);

// acorn exports its keyword→TokenType map but leaves it out of its public
// types; used by the word-classification lookups below.
const keywordTypes =
	/** @type {Record<string, TokenType>} */
	(
		/** @type {{ keywordTypes: Record<string, TokenType> }} */
		(/** @type {unknown} */ (require("acorn"))).keywordTypes
	);

// acorn exports these Unicode/character helpers at runtime but leaves them out
// of its public types; the ported cold-path readers below reuse them so their
// classification stays byte-identical to acorn's tokenizer.
const {
	isIdentifierChar,
	isIdentifierStart,
	isNewLine,
	lineBreak,
	nonASCIIwhitespace
} =
	/** @type {{ isIdentifierStart: (code: number, astral?: boolean) => boolean, isIdentifierChar: (code: number, astral?: boolean) => boolean, isNewLine: (code: number) => boolean, lineBreak: RegExp, nonASCIIwhitespace: RegExp }} */
	(/** @type {unknown} */ (require("acorn")));

/**
 * @param {number} code code point
 * @returns {string} the string for a single code point
 */
const codePointToString = (code) => String.fromCodePoint(code);

/**
 * acorn's `stringToNumber`: legacy octal parses in base 8, everything else via
 * `parseFloat` after dropping `_` separators.
 * @param {string} str numeric literal text (may contain `_` separators)
 * @param {boolean} isLegacyOctal whether it is a legacy octal literal
 * @returns {number} numeric value
 */
const stringToNumber = (str, isLegacyOctal) =>
	isLegacyOctal
		? Number.parseInt(str, 8)
		: Number.parseFloat(str.replace(/_/g, ""));

/**
 * acorn's `stringToBigInt`, minus the pre-BigInt fallback (every supported
 * Node has `BigInt`).
 * @param {string} str numeric literal text (may contain `_` separators)
 * @returns {bigint} bigint value
 */
const stringToBigInt = (str) => BigInt(str.replace(/_/g, ""));

/** @typedef {import("acorn").Options} Options */
/** @typedef {import("acorn").Position} Position */
/** @typedef {import("acorn").Node} Node */
/** @typedef {import("acorn").Identifier} Identifier */
/** @typedef {import("acorn").ImportAttribute} ImportAttribute */
/** @typedef {import("acorn").ImportDefaultSpecifier} ImportDefaultSpecifier */
/** @typedef {import("acorn").ImportExpression} ImportExpression */
/** @typedef {import("acorn").Expression} Expression */
/** @typedef {import("acorn").ImportSpecifier | import("acorn").ImportDefaultSpecifier | import("acorn").ImportNamespaceSpecifier} AnyImportSpecifier */
/** @typedef {import("acorn").TokenType} TokenType */
/** @typedef {TokenType & { beforeExpr: boolean, isAssign?: boolean, prefix?: boolean, postfix?: boolean, startsExpr?: boolean, isLoop?: boolean, binop: number | null, updateContext: ((prevType: TokenType) => void) | null }} TokenTypeInternal acorn's internal TokenType fields, absent from its public types */
/** @typedef {import("estree").SourceLocation} SourceLocation */
/** @typedef {[number, number]} Range */
/** @typedef {"defer" | "source"} ImportPhase */
/** @typedef {import("estree").Comment & { start: number, end: number }} CollectedComment comment as JavascriptParser exposes it */

// Symbol-keyed so they stay out of for-in, Object.keys and JSON.stringify
// over AST nodes.
// Per-TokContext "the owned token loop must step aside" flag, cached on the
// context itself so the hot guard reads one slot instead of two.
const kSlowContext = Symbol("slow context");
const kSource = Symbol("source");
const kRange = Symbol("range");
const kText = Symbol("text");
const kTextStart = Symbol("text start");

// Marks import attributes parsed from the legacy `assert {...}` syntax.
const LEGACY_ASSERT_ATTRIBUTES = Symbol("assert");

// acorn's binding types and scope flags, stable across acorn 8
const BIND_NONE = 0;
const BIND_VAR = 1;
const BIND_LEXICAL = 2;
const BIND_SIMPLE_CATCH = 4;
const BIND_OUTSIDE = 5;
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
// acorn's parseFunction statement bit flags
const FUNC_STATEMENT = 1;
const FUNC_HANGING_STATEMENT = 2;
const FUNC_NULLABLE_ID = 4;

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

// Single-char punctuators that acorn's `getTokenFromCode` reads as just
// `++pos; finishToken(type)` (no value, no operator state machine). Dispatching
// them from `nextToken`'s char table skips the extra `getTokenFromCode` call and
// its switch for the commonest tokens in JS ( ) { } [ ] ; , : — `0` is "not a
// simple punctuator" since token types are truthy objects.
const SIMPLE_PUNCT = Array.from({ length: 128 });
SIMPLE_PUNCT[40] = tokTypes.parenL;
SIMPLE_PUNCT[41] = tokTypes.parenR;
SIMPLE_PUNCT[59] = tokTypes.semi;
SIMPLE_PUNCT[44] = tokTypes.comma;
SIMPLE_PUNCT[91] = tokTypes.bracketL;
SIMPLE_PUNCT[93] = tokTypes.bracketR;
SIMPLE_PUNCT[123] = tokTypes.braceL;
SIMPLE_PUNCT[125] = tokTypes.braceR;
SIMPLE_PUNCT[58] = tokTypes.colon;

// Characters that can only start a token which cannot continue an expression,
// so an atom directly followed by one is the whole expression (see
// `parseMaybeAssign`'s fast path). `}` included: it only ever closes a block,
// an object or a template substitution.
const EXPRESSION_END_CHAR = new Uint8Array(128);
EXPRESSION_END_CHAR[41] = 1; // )
EXPRESSION_END_CHAR[44] = 1; // ,
EXPRESSION_END_CHAR[58] = 1; // :
EXPRESSION_END_CHAR[59] = 1; // ;
EXPRESSION_END_CHAR[93] = 1; // ]
EXPRESSION_END_CHAR[125] = 1; // }

// Char classification for the owned `nextToken` (yuku's ws_class): one table
// load steers both the whitespace skip loop and the token dispatch. Token
// classes sort below CLS_SPACE so the skip loop exits on a single compare.
const CLS_OTHER = 0;
const CLS_IDENT = 1;
const CLS_PUNCT = 2;
const CLS_DOT = 3;
const CLS_EQ = 4;
const CLS_UNICODE = 5;
const CLS_SPACE = 6;
const CLS_NEWLINE = 7;
const CLS_SLASH = 8;
// Full `charCodeAt` range so the scan loop needs no `code > 127` branch per
// character: every non-ASCII code unit classifies as CLS_UNICODE (which sorts
// below CLS_SPACE, so the loop exits on the same single compare) and the
// dispatch delegates it to acorn's unicode-aware paths.
const CHAR_CLASS = new Uint8Array(0x10000).fill(CLS_UNICODE, 128);
for (let i = 0; i < 128; i++) {
	if (IDENT_START[i] === 1 || i === 92) CHAR_CLASS[i] = CLS_IDENT;
	else if (SIMPLE_PUNCT[i] !== undefined) CHAR_CLASS[i] = CLS_PUNCT;
}
CHAR_CLASS[46] = CLS_DOT;
CHAR_CLASS[61] = CLS_EQ;
CHAR_CLASS[32] = CLS_SPACE;
CHAR_CLASS[9] = CLS_SPACE;
CHAR_CLASS[11] = CLS_SPACE;
CHAR_CLASS[12] = CLS_SPACE;
CHAR_CLASS[10] = CLS_NEWLINE;
CHAR_CLASS[13] = CLS_NEWLINE;
CHAR_CLASS[47] = CLS_SLASH;

/**
 * Drop-in replacement for acorn's `Node` that materializes `loc` and `range`
 * on first access instead of allocating them during parsing. Most nodes never
 * get either read, which saves three objects and an array per node.
 */
class LazyLocNode {
	/**
	 * @param {number} pos start offset
	 */
	constructor(pos) {
		this.type = "";
		this.start = pos;
		this.end = 0;
	}

	/**
	 * Memoized in a symbol slot — a plain store is far cheaper than making the
	 * property own via defineProperty, and the slot stays invisible to for-in,
	 * Object.keys and JSON.stringify. No `loc` is served at all — locations
	 * are derived from offsets via `JavascriptParser#getLocation`.
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
 * Single-shape `Identifier`, the most common node: all fields are assigned in
 * one constructor, so every instance is born on its final hidden class instead
 * of transitioning through acorn's start-empty-then-mutate construction.
 */
class IdentifierNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {string} name identifier name
	 */
	constructor(start, end, name) {
		this.type = "Identifier";
		this.start = start;
		this.end = end;
		this.name = name;
	}
}

/**
 * Single-shape `Literal`; `bigint` and `regex` stay post-construction
 * additions since both are rare.
 */
class LiteralNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {unknown} value literal value
	 * @param {string} raw literal source text
	 */
	constructor(start, end, value, raw) {
		this.type = "Literal";
		this.start = start;
		this.end = end;
		this.value = value;
		this.raw = raw;
	}
}

/**
 * Single-shape `MemberExpression`. `optional` is a real field on every
 * instance since webpack always parses with `ecmaVersion >= 11`.
 */
class MemberExpressionNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Expression} object object expression
	 * @param {Node} property property node
	 * @param {boolean} computed whether the access is computed (`a[b]`)
	 * @param {boolean} optional whether the access is optional (`a?.b`)
	 */
	constructor(start, end, object, property, computed, optional) {
		this.type = "MemberExpression";
		this.start = start;
		this.end = end;
		this.object = object;
		this.property = property;
		this.computed = computed;
		this.optional = optional;
	}
}

/**
 * Single-shape `CallExpression`; `optional` as in `MemberExpressionNode`.
 */
class CallExpressionNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Expression} callee callee expression
	 * @param {Node[]} args call arguments
	 * @param {boolean} optional whether the call is optional (`a?.()`)
	 */
	constructor(start, end, callee, args, optional) {
		this.type = "CallExpression";
		this.start = start;
		this.end = end;
		this.callee = callee;
		this.arguments = args;
		this.optional = optional;
	}
}

/**
 * Single-shape `ThisExpression`.
 */
class ThisNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 */
	constructor(start, end) {
		this.type = "ThisExpression";
		this.start = start;
		this.end = end;
	}
}

/**
 * Single-shape `BinaryExpression`/`LogicalExpression` — identical field sets,
 * so both node types share one hidden class.
 */
class BinaryNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {"BinaryExpression" | "LogicalExpression"} type node type
	 * @param {Expression} left left operand
	 * @param {string} operator operator text
	 * @param {Expression} right right operand
	 */
	constructor(start, end, type, left, operator, right) {
		this.type = type;
		this.start = start;
		this.end = end;
		this.left = left;
		this.operator = operator;
		this.right = right;
	}
}

/**
 * Single-shape `AssignmentExpression`.
 */
class AssignmentNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {string} operator assignment operator text
	 * @param {Node} left assignment target
	 * @param {Expression} right assigned value
	 */
	constructor(start, end, operator, left, right) {
		this.type = "AssignmentExpression";
		this.start = start;
		this.end = end;
		this.operator = operator;
		this.left = left;
		this.right = right;
	}
}

/**
 * Single-shape `UnaryExpression`/`UpdateExpression` — identical field sets,
 * so both node types share one hidden class.
 */
class UnaryNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {"UnaryExpression" | "UpdateExpression"} type node type
	 * @param {string} operator operator text
	 * @param {boolean} prefix whether the operator is prefixed
	 * @param {Expression} argument operand
	 */
	constructor(start, end, type, operator, prefix, argument) {
		this.type = type;
		this.start = start;
		this.end = end;
		this.operator = operator;
		this.prefix = prefix;
		this.argument = argument;
	}
}

/**
 * Single-shape `VariableDeclaration` (statement position; `for` heads keep the
 * generic node since their caller finishes them).
 */
class VariableDeclarationNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Node[]} declarations declarators
	 * @param {string} kind declaration kind (`var`/`let`/`const`/`using`)
	 */
	constructor(start, end, declarations, kind) {
		this.type = "VariableDeclaration";
		this.start = start;
		this.end = end;
		this.declarations = declarations;
		this.kind = kind;
	}
}

/**
 * Single-shape `VariableDeclarator`.
 */
class VariableDeclaratorNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Node} id binding target
	 * @param {Expression | null} init initializer
	 */
	constructor(start, end, id, init) {
		this.type = "VariableDeclarator";
		this.start = start;
		this.end = end;
		this.id = id;
		this.init = init;
	}
}

/**
 * Single-shape `ExpressionStatement`.
 */
class ExpressionStatementNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Expression} expression the statement's expression
	 */
	constructor(start, end, expression) {
		this.type = "ExpressionStatement";
		this.start = start;
		this.end = end;
		this.expression = expression;
	}
}

/**
 * Single-shape `BlockStatement`.
 */
class BlockStatementNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Node[]} body statements
	 */
	constructor(start, end, body) {
		this.type = "BlockStatement";
		this.start = start;
		this.end = end;
		this.body = body;
	}
}

/**
 * Single-shape `IfStatement`.
 */
class IfStatementNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Expression} test condition
	 * @param {Node} consequent then-branch
	 * @param {Node | null} alternate else-branch
	 */
	constructor(start, end, test, consequent, alternate) {
		this.type = "IfStatement";
		this.start = start;
		this.end = end;
		this.test = test;
		this.consequent = consequent;
		this.alternate = alternate;
	}
}

/**
 * Single-shape `ReturnStatement`.
 */
class ReturnStatementNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Expression | null} argument returned expression
	 */
	constructor(start, end, argument) {
		this.type = "ReturnStatement";
		this.start = start;
		this.end = end;
		this.argument = argument;
	}
}

/**
 * Single-shape `ConditionalExpression`.
 */
class ConditionalExpressionNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Expression} test condition
	 * @param {Expression} consequent then-value
	 * @param {Expression} alternate else-value
	 */
	constructor(start, end, test, consequent, alternate) {
		this.type = "ConditionalExpression";
		this.start = start;
		this.end = end;
		this.test = test;
		this.consequent = consequent;
		this.alternate = alternate;
	}
}

/**
 * Single-shape `NewExpression`.
 */
class NewExpressionNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Expression} callee constructed expression
	 * @param {Expression[]} args constructor arguments
	 */
	constructor(start, end, callee, args) {
		this.type = "NewExpression";
		this.start = start;
		this.end = end;
		this.callee = callee;
		this.arguments = args;
	}
}

/**
 * Single-shape `ArrayExpression`.
 */
class ArrayExpressionNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {(Expression | null)[]} elements array elements (`null` for holes)
	 */
	constructor(start, end, elements) {
		this.type = "ArrayExpression";
		this.start = start;
		this.end = end;
		this.elements = elements;
	}
}

/**
 * Single-shape `TemplateLiteral`.
 */
class TemplateLiteralNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Expression[]} expressions substitution expressions
	 * @param {Node[]} quasis template chunks
	 */
	constructor(start, end, expressions, quasis) {
		this.type = "TemplateLiteral";
		this.start = start;
		this.end = end;
		this.expressions = expressions;
		this.quasis = quasis;
	}
}

/**
 * Single-shape `TemplateElement`.
 */
class TemplateElementNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {{ raw: string, cooked: string | null }} value chunk text
	 * @param {boolean} tail whether this is the closing chunk
	 */
	constructor(start, end, value, tail) {
		this.type = "TemplateElement";
		this.start = start;
		this.end = end;
		this.value = value;
		this.tail = tail;
	}
}

/**
 * Single-shape `ObjectExpression`/`ObjectPattern` — identical field sets, so
 * both node types share one hidden class.
 */
class ObjectNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {"ObjectExpression" | "ObjectPattern"} type node type
	 * @param {Node[]} properties properties
	 */
	constructor(start, end, type, properties) {
		this.type = type;
		this.start = start;
		this.end = end;
		this.properties = properties;
	}
}

/**
 * Pre-shaped `Property`: acorn fills property nodes through shared
 * subroutines (`parsePropertyName`/`parsePropertyValue`), so instead of
 * rebuilding that flow the fields are all declared up-front and acorn's
 * writes land in existing slots — one hidden class, no transitions (yuku's
 * decoder emits `Property` with this fixed shape). Every non-throwing acorn
 * branch assigns `computed`, `key`, `value` and `kind`; `finishNode` sets
 * `type` and `end`.
 */
class PropertyNode {
	/**
	 * @param {number} start start offset
	 */
	constructor(start) {
		this.type = "";
		this.start = start;
		this.end = 0;
		this.method = false;
		this.shorthand = false;
		this.computed = false;
		/** @type {Node | null} */
		this.key = null;
		/** @type {Node | null} */
		this.value = null;
		this.kind = "";
	}
}

/**
 * Single-shape `ForStatement`.
 */
class ForStatementNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Node | null} init init statement or expression
	 * @param {Expression | null} test loop condition
	 * @param {Expression | null} update update expression
	 * @param {Node} body loop body
	 */
	constructor(start, end, init, test, update, body) {
		this.type = "ForStatement";
		this.start = start;
		this.end = end;
		this.init = init;
		this.test = test;
		this.update = update;
		this.body = body;
	}
}

/**
 * Single-shape `ForInStatement` (no `await` slot, matching acorn).
 */
class ForInStatementNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Node} left loop target
	 * @param {Expression} right iterated expression
	 * @param {Node} body loop body
	 */
	constructor(start, end, left, right, body) {
		this.type = "ForInStatement";
		this.start = start;
		this.end = end;
		this.left = left;
		this.right = right;
		this.body = body;
	}
}

/**
 * Single-shape `ForOfStatement`; `await` leads, matching acorn's write order.
 */
class ForOfStatementNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {boolean} isAwait whether this is `for await`
	 * @param {Node} left loop target
	 * @param {Expression} right iterated expression
	 * @param {Node} body loop body
	 */
	constructor(start, end, isAwait, left, right, body) {
		this.type = "ForOfStatement";
		this.start = start;
		this.end = end;
		this.await = isAwait;
		this.left = left;
		this.right = right;
		this.body = body;
	}
}

/**
 * Single-shape `WhileStatement`.
 */
class WhileStatementNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Expression} test loop condition
	 * @param {Node} body loop body
	 */
	constructor(start, end, test, body) {
		this.type = "WhileStatement";
		this.start = start;
		this.end = end;
		this.test = test;
		this.body = body;
	}
}

/**
 * Single-shape `SwitchStatement`.
 */
class SwitchStatementNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Expression} discriminant switched expression
	 * @param {Node[]} cases case clauses
	 */
	constructor(start, end, discriminant, cases) {
		this.type = "SwitchStatement";
		this.start = start;
		this.end = end;
		this.discriminant = discriminant;
		this.cases = cases;
	}
}

/**
 * Pre-shaped `SwitchCase`: filled in acorn's write order (`consequent` before
 * `test`), finished via `finishNode` like acorn's.
 */
class SwitchCaseNode {
	/**
	 * @param {number} start start offset
	 */
	constructor(start) {
		this.type = "";
		this.start = start;
		this.end = 0;
		/** @type {Node[] | null} */
		this.consequent = null;
		/** @type {Expression | null} */
		this.test = null;
	}
}

/**
 * Single-shape `ThrowStatement`.
 */
class ThrowStatementNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Expression} argument thrown expression
	 */
	constructor(start, end, argument) {
		this.type = "ThrowStatement";
		this.start = start;
		this.end = end;
		this.argument = argument;
	}
}

/**
 * Single-shape `BreakStatement`/`ContinueStatement` — identical field sets, so
 * both node types share one hidden class.
 */
class BreakContinueNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {"BreakStatement" | "ContinueStatement"} type node type
	 * @param {Identifier | null} label target label
	 */
	constructor(start, end, type, label) {
		this.type = type;
		this.start = start;
		this.end = end;
		this.label = label;
	}
}

/**
 * Single-shape `TryStatement`.
 */
class TryStatementNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Node} block try block
	 * @param {Node | null} handler catch clause
	 * @param {Node | null} finalizer finally block
	 */
	constructor(start, end, block, handler, finalizer) {
		this.type = "TryStatement";
		this.start = start;
		this.end = end;
		this.block = block;
		this.handler = handler;
		this.finalizer = finalizer;
	}
}

/**
 * Single-shape `CatchClause`.
 */
class CatchClauseNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Node | null} param catch parameter
	 * @param {Node} body catch block
	 */
	constructor(start, end, param, body) {
		this.type = "CatchClause";
		this.start = start;
		this.end = end;
		this.param = param;
		this.body = body;
	}
}

/**
 * Pre-shaped `FunctionDeclaration`/`FunctionExpression`/
 * `ArrowFunctionExpression`: acorn fills function nodes through shared
 * subroutines (`parseFunctionParams`/`parseFunctionBody`), so like
 * `PropertyNode` the fields are all declared up-front — in acorn's exact write
 * order (`initFunction` assigns `expression` before `generator`) so JSON key
 * order is unchanged — and acorn's writes land in existing slots: one hidden
 * class for all three function node types, no transitions.
 */
class FunctionNode {
	/**
	 * @param {number} start start offset
	 */
	constructor(start) {
		this.type = "";
		this.start = start;
		this.end = 0;
		/** @type {Identifier | null} */
		this.id = null;
		this.expression = false;
		this.generator = false;
		this.async = false;
		/** @type {Node[] | null} */
		this.params = null;
		/** @type {Node | null} */
		this.body = null;
	}
}

/**
 * Pre-shaped `ClassDeclaration`/`ClassExpression`: acorn fills class nodes
 * through shared subroutines (`parseClassId`/`parseClassSuper`), so like
 * `FunctionNode` the fields are declared up-front in acorn's write order —
 * one hidden class for both node types, no transitions.
 */
class ClassNode {
	/**
	 * @param {number} start start offset
	 */
	constructor(start) {
		this.type = "";
		this.start = start;
		this.end = 0;
		/** @type {Identifier | null} */
		this.id = null;
		/** @type {Expression | null} */
		this.superClass = null;
		/** @type {Node | null} */
		this.body = null;
	}
}

/**
 * Single-shape `ClassBody`.
 */
class ClassBodyNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Node[]} body class elements
	 */
	constructor(start, end, body) {
		this.type = "ClassBody";
		this.start = start;
		this.end = end;
		this.body = body;
	}
}

/**
 * Pre-shaped `MethodDefinition`, filled in acorn's write order (`static`,
 * `computed`, `key`, `kind`, `value`) and finished via `finishNode`. Also the
 * scratch an ambiguous class element parses its name into before the
 * method/field split (see `parseClassElement`) — it carries the superset of
 * both shapes' fields, so no write transitions it.
 */
class MethodDefinitionNode {
	/**
	 * @param {number} start start offset
	 */
	constructor(start) {
		this.type = "";
		this.start = start;
		this.end = 0;
		this.static = false;
		this.computed = false;
		/** @type {Node | null} */
		this.key = null;
		this.kind = "";
		/** @type {Node | null} */
		this.value = null;
	}
}

/**
 * Pre-shaped `PropertyDefinition` — `kind`-less, matching acorn's key set, so
 * it cannot share `MethodDefinitionNode`'s shape: `value` lands in
 * `parseClassField`, `finishNode` sets `type` and `end`.
 */
class PropertyDefinitionNode {
	/**
	 * @param {number} start start offset
	 * @param {boolean} isStatic whether the field is static
	 * @param {boolean} computed whether the key is computed
	 * @param {Node} key field key
	 */
	constructor(start, isStatic, computed, key) {
		this.type = "";
		this.start = start;
		this.end = 0;
		this.static = isStatic;
		this.computed = computed;
		this.key = key;
		/** @type {Node | null} */
		this.value = null;
	}
}

/**
 * Pre-shaped `StaticBlock` (no `static` slot — acorn never writes one):
 * `parseClassStaticBlock` fills `body`, `finishNode` sets `type` and `end`.
 */
class StaticBlockNode {
	/**
	 * @param {number} start start offset
	 */
	constructor(start) {
		this.type = "";
		this.start = start;
		this.end = 0;
		/** @type {Node[] | null} */
		this.body = null;
	}
}

/**
 * Single-shape `ImportDeclaration`; `phase` (`import defer/source`) stays a
 * post-construction addition since phase imports are rare.
 */
class ImportDeclarationNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {AnyImportSpecifier[]} specifiers import specifiers
	 * @param {Expression} source module source string literal
	 * @param {ImportAttribute[]} attributes import attributes (`with { ... }`)
	 */
	constructor(start, end, specifiers, source, attributes) {
		this.type = "ImportDeclaration";
		this.start = start;
		this.end = end;
		this.specifiers = specifiers;
		this.source = source;
		this.attributes = attributes;
	}
}

/**
 * Single-shape `ImportSpecifier`.
 */
class ImportSpecifierNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Node} imported imported name (identifier or string literal)
	 * @param {Node} local local binding identifier
	 */
	constructor(start, end, imported, local) {
		this.type = "ImportSpecifier";
		this.start = start;
		this.end = end;
		this.imported = imported;
		this.local = local;
	}
}

/**
 * Single-shape `ImportDefaultSpecifier`/`ImportNamespaceSpecifier` —
 * identical field sets, so both node types share one hidden class.
 */
class ImportSimpleSpecifierNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {"ImportDefaultSpecifier" | "ImportNamespaceSpecifier"} type node type
	 * @param {Node} local local binding identifier
	 */
	constructor(start, end, type, local) {
		this.type = type;
		this.start = start;
		this.end = end;
		this.local = local;
	}
}

/**
 * Single-shape `ImportAttribute`.
 */
class ImportAttributeNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Node} key attribute key (identifier or string literal)
	 * @param {Node} value attribute value string literal
	 */
	constructor(start, end, key, value) {
		this.type = "ImportAttribute";
		this.start = start;
		this.end = end;
		this.key = key;
		this.value = value;
	}
}

/**
 * Single-shape `ExportNamedDeclaration`.
 */
class ExportNamedDeclarationNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Node | null} declaration exported declaration statement
	 * @param {Node[]} specifiers export specifiers
	 * @param {Expression | null} source re-export source string literal
	 * @param {ImportAttribute[]} attributes import attributes (`with { ... }`)
	 */
	constructor(start, end, declaration, specifiers, source, attributes) {
		this.type = "ExportNamedDeclaration";
		this.start = start;
		this.end = end;
		this.declaration = declaration;
		this.specifiers = specifiers;
		this.source = source;
		this.attributes = attributes;
	}
}

/**
 * Single-shape `ExportDefaultDeclaration`.
 */
class ExportDefaultDeclarationNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Node} declaration default-exported declaration or expression
	 */
	constructor(start, end, declaration) {
		this.type = "ExportDefaultDeclaration";
		this.start = start;
		this.end = end;
		this.declaration = declaration;
	}
}

/**
 * Single-shape `ExportAllDeclaration`.
 */
class ExportAllDeclarationNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Node | null} exported `export * as name` export name
	 * @param {Expression} source re-export source string literal
	 * @param {ImportAttribute[]} attributes import attributes (`with { ... }`)
	 */
	constructor(start, end, exported, source, attributes) {
		this.type = "ExportAllDeclaration";
		this.start = start;
		this.end = end;
		this.exported = exported;
		this.source = source;
		this.attributes = attributes;
	}
}

/**
 * Single-shape `ExportSpecifier`.
 */
class ExportSpecifierNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Node} local local name (identifier or string literal)
	 * @param {Node} exported exported name (identifier or string literal)
	 */
	constructor(start, end, local, exported) {
		this.type = "ExportSpecifier";
		this.start = start;
		this.end = end;
		this.local = local;
		this.exported = exported;
	}
}

/**
 * Single-shape `AssignmentPattern` (also the shape retyped
 * `AssignmentExpression`s collapse to, minus their deleted `operator`).
 */
class AssignmentPatternNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Node} left binding target
	 * @param {Expression} right default value
	 */
	constructor(start, end, left, right) {
		this.type = "AssignmentPattern";
		this.start = start;
		this.end = end;
		this.left = left;
		this.right = right;
	}
}

/**
 * Single-shape `DoWhileStatement`.
 */
class DoWhileStatementNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Node} body loop body
	 * @param {Expression} test loop condition
	 */
	constructor(start, end, body, test) {
		this.type = "DoWhileStatement";
		this.start = start;
		this.end = end;
		this.body = body;
		this.test = test;
	}
}

/**
 * Single-shape `WithStatement`.
 */
class WithStatementNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Expression} object scope object expression
	 * @param {Node} body statement body
	 */
	constructor(start, end, object, body) {
		this.type = "WithStatement";
		this.start = start;
		this.end = end;
		this.object = object;
		this.body = body;
	}
}

/**
 * Single-shape `LabeledStatement`; `body` leads `label`, matching acorn's
 * write order.
 */
class LabeledStatementNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Node} body labeled statement
	 * @param {Identifier} label label identifier
	 */
	constructor(start, end, body, label) {
		this.type = "LabeledStatement";
		this.start = start;
		this.end = end;
		this.body = body;
		this.label = label;
	}
}

/**
 * Single-shape `EmptyStatement`.
 */
class EmptyStatementNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 */
	constructor(start, end) {
		this.type = "EmptyStatement";
		this.start = start;
		this.end = end;
	}
}

/**
 * Single-shape `DebuggerStatement`.
 */
class DebuggerStatementNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 */
	constructor(start, end) {
		this.type = "DebuggerStatement";
		this.start = start;
		this.end = end;
	}
}

/**
 * Single-shape `AwaitExpression`.
 */
class AwaitExpressionNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Expression} argument awaited expression
	 */
	constructor(start, end, argument) {
		this.type = "AwaitExpression";
		this.start = start;
		this.end = end;
		this.argument = argument;
	}
}

/**
 * Single-shape `YieldExpression`; `delegate` leads, matching acorn's write
 * order.
 */
class YieldExpressionNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {boolean} delegate whether this is `yield*`
	 * @param {Expression | null} argument yielded expression
	 */
	constructor(start, end, delegate, argument) {
		this.type = "YieldExpression";
		this.start = start;
		this.end = end;
		this.delegate = delegate;
		this.argument = argument;
	}
}

/**
 * Single-shape `PrivateIdentifier` (`IdentifierNode`'s fields, distinct
 * type).
 */
class PrivateIdentifierNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {string} name private name without the `#`
	 */
	constructor(start, end, name) {
		this.type = "PrivateIdentifier";
		this.start = start;
		this.end = end;
		this.name = name;
	}
}

/**
 * Single-shape `Program`; `sourceType` trails `body`, matching acorn's
 * write order.
 */
class ProgramNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Node[]} body top-level statements
	 * @param {string} sourceType effective source type
	 */
	constructor(start, end, body, sourceType) {
		this.type = "Program";
		this.start = start;
		this.end = end;
		this.body = body;
		this.sourceType = sourceType;
	}
}

/**
 * Single-shape `SpreadElement`/`RestElement` — identical field sets, so both
 * node types share one hidden class.
 */
class RestSpreadNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {"SpreadElement" | "RestElement"} type node type
	 * @param {Node} argument spread/rest argument
	 */
	constructor(start, end, type, argument) {
		this.type = type;
		this.start = start;
		this.end = end;
		this.argument = argument;
	}
}

// Mirrors of acorn's module-level `loopLabel`/`switchLabel`.
const LOOP_LABEL = { kind: "loop" };
const SWITCH_LABEL = { kind: "switch" };

// Mirror of acorn's module-level `INVALID_TEMPLATE_ESCAPE_ERROR` sentinel,
// thrown by the owned `invalidStringToken` and caught by the owned
// `tryReadTemplateToken` (identity-matched, so the pair must stay owned).
const INVALID_TEMPLATE_ESCAPE_ERROR = {};

/**
 * Mirror of acorn's `Position` (line/column pair with its `offset` helper),
 * served by the owned `raise`/`curPosition`.
 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/locutil.js
 */
class ParserPosition {
	/**
	 * @param {number} line 1-based line
	 * @param {number} col 0-based column
	 */
	constructor(line, col) {
		this.line = line;
		this.column = col;
	}

	/**
	 * @param {number} n column offset to add
	 * @returns {ParserPosition} shifted position
	 */
	offset(n) {
		return new ParserPosition(this.line, this.column + n);
	}
}

/**
 * Mirror of acorn's module-level `nextLineBreak`.
 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/whitespace.js
 * @param {string} code source text
 * @param {number} from scan start offset
 * @param {number} end scan end offset
 * @returns {number} offset after the next line break, or -1
 */
const nextLineBreak = (code, from, end) => {
	for (let i = from; i < end; i++) {
		const next = code.charCodeAt(i);
		if (isNewLine(next)) {
			return i < end - 1 && next === 13 && code.charCodeAt(i + 1) === 10
				? i + 2
				: i + 1;
		}
	}
	return -1;
};

/**
 * Mirror of acorn's module-level `getLineInfo`.
 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/locutil.js
 * @param {string} input source text
 * @param {number} offset target offset
 * @returns {ParserPosition} the offset's line/column
 */
const getLineInfo = (input, offset) => {
	for (let line = 1, cur = 0; ;) {
		const nextBreak = nextLineBreak(input, cur, offset);
		if (nextBreak < 0) return new ParserPosition(line, offset - cur);
		++line;
		cur = nextBreak;
	}
};

// Shared zero-length arguments array for `new X` without parens, mirroring
// acorn's module-level `empty`.
/** @type {Expression[]} */
const EMPTY_NEW_ARGS = [];

// Shared zero-length specifiers array for `import "x"`, mirroring acorn's
// module-level `empty$1`.
/** @type {AnyImportSpecifier[]} */
const EMPTY_IMPORT_SPECIFIERS = [];

// Mirror of acorn's module-level `loneSurrogate` (not exported), for the owned
// `parseModuleExportName`'s string-name check.
const LONE_SURROGATE_REGEXP =
	/(?:[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])/;

/**
 * Character-level mirror of acorn's `keywordRelationalOperator` (`in` /
 * `instanceof`) over a source span, so lookahead probes need no identifier
 * slice.
 * @param {string} input source text
 * @param {number} start span start offset
 * @param {number} end span end offset
 * @returns {boolean} whether the span spells `in` or `instanceof`
 */
const isRelationalKeyword = (input, start, end) => {
	const len = end - start;
	if (len === 2) {
		return (
			input.charCodeAt(start) === 105 && input.charCodeAt(start + 1) === 110
		);
	}
	return len === 10 && input.startsWith("instanceof", start);
};

/**
 * Mirror of acorn's module-level `checkKeyName`.
 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
 * @param {Node & { computed?: boolean, key?: Node | null }} node class element
 * @param {string} name checked name
 * @returns {boolean} whether the element's non-computed key spells `name`
 */
const checkKeyName = (node, name) => {
	const computed = node.computed;
	const key = /** @type {Node & { name?: string, value?: unknown }} */ (
		node.key
	);
	return (
		!computed &&
		((key.type === "Identifier" && key.name === name) ||
			(key.type === "Literal" && key.value === name))
	);
};

/**
 * Mirror of acorn's module-level `isPrivateNameConflicted`.
 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
 * @param {Record<string, string>} privateNameMap declared private names of the enclosing class body
 * @param {Node & { kind?: string, static?: boolean, key?: Node & { name: string } }} element class element with a `PrivateIdentifier` key
 * @returns {boolean} whether the name conflicts with an earlier declaration
 */
const isPrivateNameConflicted = (privateNameMap, element) => {
	const name = /** @type {Node & { name: string }} */ (element.key).name;
	const curr = privateNameMap[name];
	let next = "true";
	if (
		element.type === "MethodDefinition" &&
		(element.kind === "get" || element.kind === "set")
	) {
		next = (element.static ? "s" : "i") + element.kind;
	}
	// `class { get #a(){}; static set #a(_){} }` is also a conflict
	if (
		(curr === "iget" && next === "iset") ||
		(curr === "iset" && next === "iget") ||
		(curr === "sget" && next === "sset") ||
		(curr === "sset" && next === "sget")
	) {
		privateNameMap[name] = "true";
		return false;
	} else if (!curr) {
		privateNameMap[name] = next;
		return false;
	}
	return true;
};

/**
 * Acorn's per-class private-name record: `declared` maps each private name to
 * "true" or an accessor tag (`iget`/`iset`/`sget`/`sset`); `used` collects the
 * `PrivateIdentifier` nodes `parsePrivateIdent` saw, resolved against
 * `declared` when the class body closes (`exitClassBody`).
 * @typedef {{ declared: Record<string, string>, used: (Node & { name: string })[] }} PrivateNameStackEntry
 */

/**
 * Mirror of acorn's module-level `isLocalVariableAccess`.
 * @param {Node} node checked node
 * @returns {boolean} whether the node reads a local variable
 */
const isLocalVariableAccess = (node) =>
	node.type === "Identifier" ||
	(node.type === "ParenthesizedExpression" &&
		isLocalVariableAccess(
			/** @type {Node} */ (
				/** @type {Node & { expression?: Node }} */ (node).expression
			)
		));

/**
 * Mirror of acorn's module-level `isPrivateFieldAccess`.
 * @param {Node} node checked node
 * @returns {boolean} whether the node accesses a private field
 */
const isPrivateFieldAccess = (node) =>
	(node.type === "MemberExpression" &&
		/** @type {Node} */ (
			/** @type {Node & { property?: Node }} */ (node).property
		).type === "PrivateIdentifier") ||
	(node.type === "ChainExpression" &&
		isPrivateFieldAccess(
			/** @type {Node} */ (
				/** @type {Node & { expression?: Node }} */ (node).expression
			)
		)) ||
	(node.type === "ParenthesizedExpression" &&
		isPrivateFieldAccess(
			/** @type {Node} */ (
				/** @type {Node & { expression?: Node }} */ (node).expression
			)
		));

// the dedicated node classes serve `range` exactly like LazyLocNode
for (const NodeClass of [
	IdentifierNode,
	LiteralNode,
	MemberExpressionNode,
	CallExpressionNode,
	ThisNode,
	BinaryNode,
	AssignmentNode,
	UnaryNode,
	VariableDeclarationNode,
	VariableDeclaratorNode,
	ExpressionStatementNode,
	BlockStatementNode,
	IfStatementNode,
	ReturnStatementNode,
	ConditionalExpressionNode,
	NewExpressionNode,
	ArrayExpressionNode,
	TemplateLiteralNode,
	TemplateElementNode,
	ObjectNode,
	PropertyNode,
	RestSpreadNode,
	FunctionNode,
	ProgramNode,
	AwaitExpressionNode,
	YieldExpressionNode,
	PrivateIdentifierNode,
	AssignmentPatternNode,
	DoWhileStatementNode,
	WithStatementNode,
	LabeledStatementNode,
	EmptyStatementNode,
	DebuggerStatementNode,
	ImportDeclarationNode,
	ImportSpecifierNode,
	ImportSimpleSpecifierNode,
	ImportAttributeNode,
	ExportNamedDeclarationNode,
	ExportDefaultDeclarationNode,
	ExportAllDeclarationNode,
	ExportSpecifierNode,
	ClassNode,
	ClassBodyNode,
	MethodDefinitionNode,
	PropertyDefinitionNode,
	StaticBlockNode,
	ForStatementNode,
	ForInStatementNode,
	ForOfStatementNode,
	WhileStatementNode,
	SwitchStatementNode,
	SwitchCaseNode,
	ThrowStatementNode,
	BreakContinueNode,
	TryStatementNode,
	CatchClauseNode
]) {
	for (const key of ["range"]) {
		Object.defineProperty(
			NodeClass.prototype,
			key,
			/** @type {PropertyDescriptor} */
			(Object.getOwnPropertyDescriptor(LazyLocNode.prototype, key))
		);
	}
}

/**
 * Comment collected without slicing its text out of the source: only magic
 * comments and pure annotations ever get their text read, and only binary
 * searches around magic-comment sites read `range`, so the text slice and the
 * range array are both deferred to first access and memoized like `loc`.
 */
class LazyComment {
	/**
	 * @param {boolean} block whether this is a block comment
	 * @param {number} textStart offset right after the comment opener
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {string} source full source text for the lazy `value` slice
	 */
	constructor(block, textStart, start, end, source) {
		/** @type {"Block" | "Line"} */
		this.type = block ? "Block" : "Line";
		this.start = start;
		this.end = end;
		this[kSource] = source;
		this[kTextStart] = textStart;
	}

	/**
	 * Memoized like `LazyLocNode#range`; offsets are final at construction so
	 * the slot is cached unconditionally.
	 * @returns {Range} source range
	 */
	get range() {
		const cached = this[kRange];
		if (cached !== undefined) return cached;
		/** @type {Range} */
		const range = [this.start, this.end];
		return (this[kRange] = range);
	}

	/**
	 * @param {Range} value source range
	 */
	set range(value) {
		this[kRange] = value;
	}

	/**
	 * @returns {string} comment text without the delimiters
	 */
	get value() {
		const cached = this[kText];
		if (cached !== undefined) return cached;
		return (this[kText] = this[kSource].slice(
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
 * startLoc?: Position,
 * lastTokEndLoc?: Position | null,
 * containsEsc: boolean,
 * exprAllowed: boolean,
 * options: Options,
 * end: number,
 * lastTokEnd: number,
 * canInsertSemicolon: () => boolean,
 * nextToken: () => void,
 * next: (ignoreEscapeSequenceInKeyword?: boolean) => void,
 * eat: (type: TokenType) => boolean,
 * expect: (type: TokenType) => void,
 * afterTrailingComma: (type: TokenType, notNext?: boolean) => boolean,
 * unexpected: (pos?: number) => never,
 * raise: (pos: number, message: string) => never,
 * raiseRecoverable: (pos: number, message: string) => void,
 * isContextual: (name: string) => boolean,
 * parseIdent: (liberal?: boolean) => Identifier,
 * parseLiteral: (value: unknown) => Node,
 * awaitIdentPos: number,
 * lastTokStart: number,
 * lastTokStartLoc?: Position | null,
 * yieldPos: number,
 * awaitPos: number,
 * parseExpression: (forInit?: boolean | string, refDestructuringErrors?: DestructuringErrorsShim | null) => Expression,
 * parseSpread: (refDestructuringErrors?: DestructuringErrorsShim | null) => Node,
 * braceIsBlock: (prevType: TokenType) => boolean,
 * _gapHasNewline: () => boolean,
 * parseExprList: (close: TokenType, allowTrailingComma: boolean, allowEmpty: boolean, refDestructuringErrors?: DestructuringErrorsShim | null) => Expression[],
 * parsePrivateIdent: () => Node,
 * parseTemplate: (opts?: { isTagged?: boolean }) => Node,
 * shouldParseAsyncArrow: () => boolean,
 * parseSubscriptAsyncArrow: (startPos: number, startLoc: Position | undefined, exprList: Expression[], forInit: boolean | string) => Expression,
 * checkPatternErrors: (refDestructuringErrors: DestructuringErrorsShim, isAssign: boolean) => void,
 * checkYieldAwaitInDefaultParams: () => void,
 * checkExpressionErrors: (refDestructuringErrors?: DestructuringErrorsShim | null, andThrow?: boolean) => boolean,
 * parseSubscript: (base: Expression, startPos: number, startLoc: Position | undefined, noCalls: boolean | undefined, maybeAsyncArrow: boolean, optionalChained: boolean, forInit?: boolean | string) => Expression,
 * parseExprAtom: (refDestructuringErrors?: DestructuringErrorsShim | null, forInit?: boolean | string, forNew?: boolean) => Expression,
 * buildBinary: (startPos: number, startLoc: Position | undefined, left: Expression, right: Expression, op: string, logical: boolean) => Expression,
 * parseMaybeAssign: (forInit?: boolean | string, refDestructuringErrors?: DestructuringErrorsShim | null, afterLeftParse?: (this: unknown, left: Expression, startPos: number, startLoc?: Position) => Expression) => Expression,
 * _parseTrivialAtom: (forInit?: boolean | string) => Expression | null,
 * parseMaybeConditional: (forInit?: boolean | string, refDestructuringErrors?: DestructuringErrorsShim | null) => Expression,
 * parseMaybeUnary: (refDestructuringErrors: DestructuringErrorsShim | null, sawUnary: boolean, incDec: boolean, forInit?: boolean | string) => Expression,
 * parseExprSubscripts: (refDestructuringErrors?: DestructuringErrorsShim | null, forInit?: boolean | string) => Expression,
 * parseAwait: (forInit?: boolean | string) => Expression,
 * canAwait: boolean,
 * privateNameStack: PrivateNameStackEntry[],
 * parseGetterSetter: (prop: Node) => void,
 * parseMethod: (isGenerator: boolean, isAsync?: boolean, allowDirectSuper?: boolean) => Expression,
 * parseClassElement: (constructorAllowsSuper: boolean) => Node | null,
 * isClassElementNameStart: () => boolean,
 * parseClassElementName: (element: Node) => void,
 * parseClassMethod: (method: Node, isGenerator: boolean, isAsync: boolean, allowsDirectSuper: boolean) => Node,
 * parseClassField: (field: Node) => Node,
 * parseClassStaticBlock: (node: Node) => Node,
 * parseClassId: (node: Node, isStatement: boolean | string) => void,
 * parseClassSuper: (node: Node) => void,
 * enterClassBody: () => Record<string, string>,
 * exitClassBody: () => void,
 * _classFastPath: boolean,
 * semicolon: () => void,
 * exitScope: () => void,
 * parseStatement: (context: string | null, topLevel?: boolean, exports?: unknown) => Node,
 * parseTopLevel: (node: Node) => Node,
 * parseBindingAtom: () => Node,
 * parseVarStatement: (node: Node, kind: string, allowMissingInitializer?: boolean) => Node,
 * parseVar: (node: Node, isFor: boolean, kind: string, allowMissingInitializer?: boolean) => Node,
 * parseExpressionStatement: (node: Node, expr: Expression) => Node,
 * parseParenExpression: () => Expression,
 * parseIfStatement: (node: Node) => Node,
 * parseReturnStatement: (node: Node) => Node,
 * insertSemicolon: () => boolean,
 * allowReturn: boolean,
 * allowNewDotTarget: boolean,
 * parseExprOps: (forInit?: boolean | string, refDestructuringErrors?: DestructuringErrorsShim | null) => Expression,
 * parseExprOp: (left: Expression, leftStartPos: number, leftStartLoc: Position | undefined, minPrec: number, forInit?: boolean | string) => Expression,
 * _deStack: DestructuringErrorsShim[],
 * _deDepth: number,
 * _ecmaVersion: number,
 * _noLocations: boolean,
 * _validRegexpFlags: string,
 * _propHashFastPath: boolean,
 * _propHashStack: { proto: boolean }[],
 * _propHashDepth: number,
 * _acquireDestructuringErrors: () => DestructuringErrorsShim,
 * _releaseDestructuringErrors: () => void,
 * _arrStack: EXPECTED_ANY[][],
 * _arrDepth: number,
 * _acquireScratch: () => EXPECTED_ANY[],
 * _releaseScratch: (scratch: EXPECTED_ANY[], count: number) => EXPECTED_ANY[],
 * parseRestBinding: () => Node,
 * parseMaybeDefault: (startPos: number, startLoc?: Position, left?: Node) => Node,
 * checkPatternExport: (exports: unknown, pattern: Node) => void,
 * parseBindingListItem: (param: Node) => Node,
 * parseAssignableListItem: (allowModifiers?: boolean) => Node,
 * parseParenItem: (item: Node) => Node,
 * shouldParseArrow: (exprList: Expression[]) => boolean,
 * parseParenArrowList: (startPos: number, startLoc: Position | undefined, exprList: Expression[], forInit?: boolean | string) => Expression,
 * finishNodeAt: (node: Node, type: string, pos: number, loc?: Position) => Node,
 * parseParenAndDistinguishExpression: (canBeArrow: boolean, forInit?: boolean | string) => Expression,
 * parseSubscripts: (base: Expression, startPos: number, startLoc: Position | undefined, noCalls?: boolean, forInit?: boolean | string) => Expression,
 * parseNew: () => Expression,
 * parseTemplateElement: (opts: { isTagged: boolean }) => Node,
 * parseBlock: (createNewLexicalScope?: boolean, node?: Node, exitStrict?: boolean) => Node,
 * parseYield: (forInit?: boolean | string) => Expression,
 * toAssignable: (node: Node, isBinding?: boolean, refDestructuringErrors?: DestructuringErrorsShim | null) => Node,
 * checkLValPattern: (expr: Node, bindingType?: number, checkClashes?: unknown) => void,
 * checkUnreserved: (ref: Identifier) => void,
 * enterScope: (flags: number) => void,
 * readRegexp: () => void,
 * potentialArrowAt: number,
 * potentialArrowInForAwait: boolean,
 * overrideContext: (tokenCtx: unknown) => void,
 * parseFunction: (node: Node, statement: number, allowExpressionBody?: boolean, isAsync?: boolean, forInit?: boolean | string) => Expression,
 * parseArrowExpression: (node: Node, params: Node[], isAsync: boolean, forInit?: boolean | string) => Expression,
 * _subscriptFastPath: boolean,
 * checkLValSimple: (expr: Node, bindingType?: number, checkClashes?: Record<string, boolean> | false | null) => void,
 * checkLValInnerPattern: (expr: Node, bindingType?: number, checkClashes?: Record<string, boolean> | false | null) => void,
 * declareName: (name: string, bindingType: number, pos: number) => void,
 * startNode: () => Node,
 * startNodeAt: (pos: number, loc?: Position) => Node,
 * finishNode: (node: Node, type: string) => Node,
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
 * readRadixNumber: (radix: number) => void,
 * readTmplToken: () => void,
 * invalidStringToken: (position: number, message: string) => void,
 * _readInt: (radix: number, len?: number, maybeLegacyOctal?: boolean) => number | null,
 * _readCodePoint: () => number,
 * _readHexChar: (len: number) => number,
 * _readEscapedChar: (inTemplate: boolean) => string,
 * _readStringCold: (quote: number) => void,
 * _readTmplTokenCold: () => void,
 * _readNumberCold: (startsWithDot: boolean) => void,
 * _readRadixNumber: (radix: number) => void,
 * _readWord1Cold: () => string,
 * _finishWordSlow: (word: string) => void,
 * _skipSpaceCold: () => void,
 * _getUnknownOrPrivate: (code: number) => void,
 * finishToken: (type: TokenType, value?: unknown) => void,
 * context: TokContextShim[],
 * pos: number,
 * input: string,
 * sourceFile: string | null | undefined,
 * curLine: number,
 * lineStart: number,
 * endLoc?: Position,
 * regexpState: unknown,
 * curPosition: () => Position | undefined,
 * initialContext: () => TokContextShim[],
 * curContext: () => TokContextShim,
 * tryReadTemplateToken: () => void,
 * readInvalidTemplateToken: () => void,
 * inTemplateElement: boolean,
 * inFunction: boolean,
 * allowSuper: boolean,
 * allowDirectSuper: boolean,
 * allowUsing: boolean,
 * scopeStack: Scope[],
 * _scopePool: Scope[],
 * _setPool: Set<string>[],
 * _takeSet: () => Set<string>,
 * _labelsStack: { kind?: string | null, name?: string, statementStart?: number }[][],
 * _labelsDepth: number,
 * currentScope: () => Scope,
 * currentThisScope: () => Scope,
 * currentVarScope: () => Scope,
 * keywords: RegExp,
 * reservedWords: RegExp,
 * reservedWordsStrict: RegExp,
 * reservedWordsStrictBind: RegExp,
 * strict: boolean,
 * inGenerator: boolean,
 * inGeneratorContext: () => boolean,
 * inAsync: boolean,
 * inClassStaticBlock: boolean,
 * _wordLookups: WordLookups,
 * treatFunctionsAsVar: boolean,
 * treatFunctionsAsVarInScope: (scope: Scope) => boolean,
 * inModule: boolean,
 * undefinedExports: Record<string, Node>,
 * parseObj: (isPattern: boolean, refDestructuringErrors?: DestructuringErrorsShim | null) => Node,
 * parseProperty: (isPattern: boolean, refDestructuringErrors?: DestructuringErrorsShim | null) => Node,
 * parsePropertyName: (prop: Node) => Node,
 * parsePropertyValue: (prop: Node, isPattern: boolean, isGenerator: boolean, isAsync: boolean, startPos: number | undefined, startLoc: Position | undefined, refDestructuringErrors: DestructuringErrorsShim | null | undefined, containsEsc: boolean) => void,
 * isAsyncProp: (prop: Node) => boolean,
 * checkPropClash: (prop: Node, propHash: Record<string, unknown>, refDestructuringErrors?: DestructuringErrorsShim | null) => void,
 * parseImport: (node: Node) => Node,
 * parseExport: (node: Node, exports: unknown) => Node,
 * parseImportSpecifiers: () => AnyImportSpecifier[],
 * _parseImportSpecifiersBase: () => AnyImportSpecifier[],
 * parseImportSpecifier: () => Node,
 * parseImportDefaultSpecifier: () => Node,
 * parseImportNamespaceSpecifier: () => Node,
 * parseModuleExportName: () => Node,
 * parseExportAllDeclaration: (node: Node, exports: unknown) => Node,
 * parseExportDefaultDeclaration: () => Node,
 * parseExportDeclaration: (node: Node) => Node,
 * parseExportSpecifier: (exports: unknown) => Node,
 * parseExportSpecifiers: (exports: unknown) => Node[],
 * checkExport: (exports: unknown, name: string | Node, pos: number) => void,
 * checkLocalExport: (id: Identifier) => void,
 * parseWithClause: () => ImportAttribute[],
 * checkVariableExport: (exports: unknown, declarations: Node[]) => void,
 * shouldParseExportStatement: () => boolean,
 * expectContextual: (name: string) => void,
 * parseClass: (node: Node, isStatement: string | boolean) => Node,
 * _moduleDeclFastPath: boolean,
 * parseImportAttribute: () => ImportAttribute,
 * parseExprImport: (forNew: boolean) => Expression,
 * parseImportMeta: (node: Node) => Expression,
 * parseDynamicImport: (node: Node) => Expression,
 * updateContext: (prevType: TokenType) => void,
 * finishOp: (type: TokenType, size: number) => void,
 * readToken_dot: () => void,
 * readToken_slash: () => void,
 * readToken_mult_modulo_exp: (code: number) => void,
 * readToken_pipe_amp: (code: number) => void,
 * readToken_caret: () => void,
 * readToken_plus_min: (code: number) => void,
 * readToken_lt_gt: (code: number) => void,
 * readToken_eq_excl: (code: number) => void,
 * readToken_question: () => void,
 * readToken_numberSign: () => void,
 * _tokenFastPath: boolean,
 * _inlineFinish: boolean,
 * _lazy: boolean,
 * _importPhase: ImportPhase | null,
 * _importPhasesEnabled: boolean,
 * _lazyComments: CollectedComment[] | undefined,
 * _newlineBefore: 0 | 1 | 2,
 * _fullTokenFastPath: boolean,
 * _stmtFastPath: boolean,
 * _lastArrow: Expression | null,
 * _arrowFastPath: boolean,
 * labels: { kind?: string | null, name?: string, statementStart?: number }[],
 * initFunction: (node: Node) => void,
 * parseFunctionStatement: (node: Node, isAsync: boolean, declarationPosition: boolean) => Node,
 * parseFunctionBody: (node: Node, isArrowFunction: boolean, isMethod: boolean, forInit?: boolean | string) => void,
 * parseFunctionParams: (node: Node) => void,
 * isSimpleParamList: (params: Node[]) => boolean,
 * checkParams: (node: Node, allowDuplicates: boolean) => void,
 * adaptDirectivePrologue: (statements: Node[]) => void,
 * isDirectiveCandidate: (statement: Node) => boolean,
 * toAssignableList: (exprList: Node[], isBinding: boolean) => Node[],
 * parseBindingList: (close: TokenType, allowEmpty: boolean, allowTrailingComma: boolean, allowModifiers?: boolean) => Node[],
 * strictDirective: (start: number) => boolean,
 * _funcFastPath: boolean,
 * _funcStmtOwn: boolean,
 * _parseFunctionAt: (start: number, statement: number, allowExpressionBody: boolean, isAsync: boolean, forInit?: boolean | string) => Expression,
 * isLet: (context?: string | null) => boolean,
 * isAsyncFunction: () => boolean,
 * isUsingKeyword: (isAwaitUsing: boolean, isFor?: boolean) => boolean,
 * fullCharCodeAt: (pos: number) => number,
 * _scanGap: (pos: number) => number,
 * _scanGapNewline: boolean,
 * parseVarId: (decl: Node, kind: string) => void,
 * _varIdOwn: boolean,
 * isSimpleAssignTarget: (expr: Expression) => boolean,
 * parseLabeledStatement: (node: Node, maybeName: string, expr: Identifier, context: string | null) => Node,
 * _parseVarInto: (declarations: Node[], isFor: boolean, kind: string, allowMissingInitializer?: boolean) => number,
 * _parseVarStatementAt: (start: number, kind: string, allowMissingInitializer?: boolean) => Node,
 * _parseIfStatementAt: (start: number) => Node,
 * _parseReturnStatementAt: (start: number) => Node,
 * _parseExpressionStatementAt: (start: number, expr: Expression) => Node,
 * eatContextual: (name: string) => boolean,
 * isUsing: (isFor: boolean) => boolean,
 * isAwaitUsing: (isFor: boolean) => boolean,
 * parseForStatement: (node: Node) => Node,
 * parseFor: (node: Node, init: Node | null) => Node,
 * parseForIn: (node: Node, init: Node) => Node,
 * parseForAfterInit: (node: Node, init: Node, awaitAt: number) => Node,
 * parseWhileStatement: (node: Node) => Node,
 * parseDoStatement: (node: Node) => Node,
 * parseWithStatement: (node: Node) => Node,
 * parseEmptyStatement: (node: Node) => Node,
 * parseDebuggerStatement: (node: Node) => Node,
 * parseSwitchStatement: (node: Node) => Node,
 * parseThrowStatement: (node: Node) => Node,
 * parseTryStatement: (node: Node) => Node,
 * parseBreakContinueStatement: (node: Node, keyword: string) => Node,
 * parseCatchClauseParam: () => Node,
 * _stmt2FastPath: boolean,
 * _exprFastPath: boolean,
 * _parseForStatementAt: (start: number) => Node,
 * _parseForAt: (start: number, init: Node | null) => Node,
 * _parseForInAt: (start: number, isAwait: boolean, init: Node) => Node,
 * _parseForAfterInitAt: (start: number, init: Node, awaitAt: number) => Node,
 * _parseWhileStatementAt: (start: number) => Node,
 * _parseSwitchStatementAt: (start: number) => Node,
 * _parseThrowStatementAt: (start: number) => Node,
 * _parseTryStatementAt: (start: number) => Node,
 * _parseBreakContinueStatementAt: (start: number, keyword: string) => Node,
 * _moduleFallback: boolean,
 * _moduleSyntaxSeen: boolean,
 * _tryModuleFallback: () => boolean,
 * }} ParserInternals
 */

// internal methods are absent from acorn's types, so super calls do not
// type-check; call through a typed view of the base prototype instead
const base = /** @type {ParserInternals} */ (
	/** @type {unknown} */ (BaseParser.prototype)
);

/**
 * Acorn's internal destructuring-errors record; the class itself is not
 * exported. Owned methods must create records with the same hidden class the
 * rest of the expression parser reads, or every record field access there
 * turns polymorphic.
 * @typedef {{ shorthandAssign: number, trailingComma: number, parenthesizedAssign: number, parenthesizedBind: number, doubleProto: number }} DestructuringErrorsShim
 */

// Capture the class at module load: parse one expression through a probe
// whose `checkExpressionErrors` sees the record the base parser created.
/** @type {{ new (): DestructuringErrorsShim } | null} */
const DestructuringErrorsClass = (() => {
	/** @type {{ new (): DestructuringErrorsShim } | null} */
	let captured = null;
	class Probe extends BaseParser {
		/**
		 * @param {DestructuringErrorsShim | null} refDestructuringErrors record to inspect
		 * @param {boolean=} andThrow whether to throw on error
		 * @returns {boolean} whether an error position was set
		 */
		checkExpressionErrors(refDestructuringErrors, andThrow) {
			if (refDestructuringErrors) {
				captured =
					/** @type {{ new (): DestructuringErrorsShim }} */
					(refDestructuringErrors.constructor);
			}
			return /** @type {ParserInternals} */ (
				/** @type {unknown} */ (base)
			).checkExpressionErrors.call(this, refDestructuringErrors, andThrow);
		}
	}
	Probe.parse("a", { ecmaVersion: 2020 });
	// cast: the closure assignment above is invisible to control-flow analysis
	return /** @type {{ new (): DestructuringErrorsShim } | null} */ (captured);
})();

/**
 * @returns {DestructuringErrorsShim} fresh destructuring-errors record on acorn's own class (plain-object fallback if the capture ever fails)
 */
const createDestructuringErrors = () => {
	const DestructuringErrors = DestructuringErrorsClass;
	return DestructuringErrors !== null
		? new DestructuringErrors()
		: {
				shorthandAssign: -1,
				trailingComma: -1,
				parenthesizedAssign: -1,
				parenthesizedBind: -1,
				doubleProto: -1
			};
};

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
 * @property {number} reservedMaxLen longest key in `reservedKinds`
 * @property {{ test: (name: string) => boolean }} reservedBindTest strict-mode binding check, a Set-backed stand-in for acorn's `reservedWordsStrictBind` regexp
 * @property {Set<string>} reservedBindSet strict-mode binding-reserved names
 * @property {number} reservedBindMinLen shortest key in `reservedBindSet`
 * @property {number} reservedBindMaxLen longest key in `reservedBindSet`
 * @property {number} id owner tag for the shared `WORD_TYPES` classification memo
 */

// One entry per distinct keyword/reserved-word set; webpack parses with a
// single option set, making this effectively a one-time build shared across
// every parse.
/** @type {Map<string, WordLookups>} */
const wordLookupsCache = new Map();

// Sentinel for the released cache state; `ensureParserCaches` runs in the
// parser constructor, so the hot paths never observe the nulls behind it.
const NO_CACHE = /** @type {EXPECTED_ANY} */ (null);

// Direct-mapped identifier cache for `readWord1`: one slot per hash, verified
// by char compare, overwritten on collision. Shared across parses — hits are
// content-checked, so a stale entry is merely a miss. Only words short enough
// to be flat V8 strings (never slices retaining their whole source) are stored.
const WORD_CACHE_MASK = 0xfff;
/** @type {(string | null)[]} */
let WORD_CACHE = NO_CACHE;
const WORD_CACHE_MAX_LEN = 12;

// Classification memo parallel to `WORD_CACHE`, same slot: every cache write
// also writes the word's token type plus the id of the keyword set that
// classified it, so a hit skips `classifyWord` and another option set (or a
// `readWord1` write, owner 0) invalidates instead of mis-classifying. Keying
// by the cache's own slot adds no extra string references — the memo can
// never retain a word the cache itself dropped.
/** @type {(TokenType | null)[]} */
let WORD_TYPES = NO_CACHE;
/** @type {Int32Array} */
let WORD_TYPE_OWNERS = NO_CACHE;
let nextWordLookupsId = 1;

// Direct-mapped cache for short non-word slices, WORD_CACHE's regime applied
// to literal text: number raws repeat heavily (a typical large input has ~10x
// more number literals than distinct raws) and short string values/raws repeat
// too, so serving them from one shared string cuts both allocation churn and
// retained AST strings. Same rules as WORD_CACHE: content-checked hits, only
// lengths V8 stores flat (never slices retaining the source).
const SLICE_CACHE_MASK = 0xfff;
/** @type {(string | null)[]} */
let SLICE_CACHE = NO_CACHE;
const SLICE_CACHE_MAX_LEN = 12;

/**
 * Allocates the shared tokenizer caches; runs in the parser constructor so
 * they exist exactly while something is parsing.
 * @returns {void}
 */
const ensureParserCaches = () => {
	if (WORD_CACHE !== null) return;
	WORD_CACHE = Array.from({ length: WORD_CACHE_MASK + 1 }, () => null);
	WORD_TYPES = Array.from({ length: WORD_CACHE_MASK + 1 }, () => null);
	WORD_TYPE_OWNERS = new Int32Array(WORD_CACHE_MASK + 1);
	SLICE_CACHE = Array.from({ length: SLICE_CACHE_MASK + 1 }, () => null);
};

/**
 * Drops every shared parser cache — the string/type caches above plus the
 * word-lookup, operator, regexp-flag and construction-shape memos — so an
 * idle process retains no parser state. The next parse rebuilds them.
 * @returns {void}
 */
const releaseParserCaches = () => {
	WORD_CACHE = NO_CACHE;
	WORD_TYPES = NO_CACHE;
	WORD_TYPE_OWNERS = NO_CACHE;
	SLICE_CACHE = NO_CACHE;
	wordLookupsCache.clear();
	OP_CACHE.clear();
	VALID_REGEXP_FLAGS.clear();
	fastConstructionShapes.clear();
};

/**
 * Cached `input.slice(start, end)` for spans of 2-12 chars (callers gate the
 * length; 1-char slices come from V8's single-character table already).
 * @param {string} input source text
 * @param {number} start span start offset
 * @param {number} end span end offset
 * @returns {string} the span's text, shared across equal occurrences
 */
const getShortSlice = (input, start, end) => {
	let hash = 0;
	for (let i = start; i < end; i++) {
		hash = (Math.imul(hash, 33) + input.charCodeAt(i)) | 0;
	}
	const slot = hash & SLICE_CACHE_MASK;
	const cached = SLICE_CACHE[slot];
	if (
		cached !== null &&
		cached.length === end - start &&
		input.startsWith(cached, start)
	) {
		return cached;
	}
	return (SLICE_CACHE[slot] = input.slice(start, end));
};

/**
 * Keyword-or-name classification: pure in (word, keywords), so it can be
 * memoized per `WORD_CACHE` slot.
 * @param {string} word word
 * @param {Map<string, TokenType>} keywords keyword name → token type
 * @returns {TokenType} token type for `word`
 */
const classifyWord = (word, keywords) => {
	const len = word.length;
	// every acorn keyword is 2-10 lowercase ASCII chars (`do`…`instanceof`)
	if (len >= 2 && len <= 10) {
		const first = word.charCodeAt(0);
		if (first >= 97 && first <= 122) return keywords.get(word) || tokTypes.name;
	}
	return tokTypes.name;
};

// Multi-char operator strings for `finishOp` (`=>`, `===`, `&&=`, …), keyed by
// their char codes packed 7 bits apart — collision-free for ASCII operators up
// to acorn's maximum of 4 chars (`>>>=`), so the set stays ~40 entries.
/** @type {Map<number, string>} */
const OP_CACHE = new Map();

// The regexp flag whitelist depends only on the ecmaVersion, so build one
// string per version instead of a fresh one in every parser constructor.
/** @type {Map<number, string>} */
const VALID_REGEXP_FLAGS = new Map();

/**
 * @param {number} ecmaVersion normalized acorn ecmaVersion
 * @returns {string} the regexp flags allowed at `ecmaVersion`
 */
const getValidRegexpFlags = (ecmaVersion) => {
	let flags = VALID_REGEXP_FLAGS.get(ecmaVersion);
	if (flags === undefined) {
		flags = `gim${ecmaVersion >= 6 ? "uy" : ""}${ecmaVersion >= 9 ? "s" : ""}${
			ecmaVersion >= 13 ? "d" : ""
		}${ecmaVersion >= 15 ? "v" : ""}`;
		VALID_REGEXP_FLAGS.set(ecmaVersion, flags);
	}
	return flags;
};

// Sticky mirrors of acorn's `skipWhiteSpace` / string-literal / `lineBreak`
// regexes for the owned `strictDirective` (they scan at an offset, no slice).
const STRICT_SKIP_WS = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g;
const STRICT_LITERAL = /(?:'((?:\\[^]|[^'\\])*?)'|"((?:\\[^]|[^"\\])*?)")/y;
const STRICT_LINE_BREAK = /\r\n?|\n|\u2028|\u2029/;

/**
 * @param {RegExp} re acorn `wordsRegexp` output (`^(?:a|b|c)$`)
 * @returns {Set<string>} the alternation's words
 */
const wordsRegexpToSet = (re) => {
	const match = /^\^\(\?:(.*)\)\$$/.exec(re.source);
	const body = match ? match[1] : "";
	return new Set(body ? body.split("|") : []);
};

// One-entry identity memo in front of the string-keyed cache: acorn's
// `wordsRegexp` interns its regexps, so identity captures the whole word set,
// and builds construct thousands of parsers with one option set — this makes
// the per-construction lookup three compares instead of a long key concat.
/** @type {RegExp | undefined} */
let lastKeywordsRe;
/** @type {RegExp | undefined} */
let lastReservedRe;
/** @type {RegExp | undefined} */
let lastReservedStrictRe;
/** @type {WordLookups | undefined} */
let lastWordLookups;

/**
 * Mirrors acorn's `keywords` / `reservedWords` / `reservedWordsStrict` regexps
 * as Map/Set lookups. Membership is the hot per-word test in `readWord` and
 * `checkUnreserved`, and a hash lookup beats an anchored alternation regexp.
 * @param {ParserInternals} parser parser instance
 * @returns {WordLookups} lookups for this parser's keyword set
 */
const getWordLookups = (parser) => {
	if (
		parser.keywords === lastKeywordsRe &&
		parser.reservedWords === lastReservedRe &&
		parser.reservedWordsStrict === lastReservedStrictRe
	) {
		return /** @type {WordLookups} */ (lastWordLookups);
	}
	// module vs script share a keyword set but differ in reserved words, so the
	// key must cover all three regexps
	const key = `${parser.keywords.source}\n${parser.reservedWords.source}\n${parser.reservedWordsStrict.source}`;
	lastKeywordsRe = parser.keywords;
	lastReservedRe = parser.reservedWords;
	lastReservedStrictRe = parser.reservedWordsStrict;
	const cached = wordLookupsCache.get(key);
	if (cached !== undefined) {
		lastWordLookups = cached;
		return cached;
	}
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
	const reservedBind = wordsRegexpToSet(parser.reservedWordsStrictBind);
	// length bounds so the owned checkLValSimple can skip the Set probe for
	// most identifiers
	let reservedBindMinLen = 0x7fffffff;
	let reservedBindMaxLen = 0;
	for (const name of reservedBind) {
		if (name.length < reservedBindMinLen) reservedBindMinLen = name.length;
		if (name.length > reservedBindMaxLen) reservedBindMaxLen = name.length;
	}
	let reservedMaxLen = 0;
	for (const name of reservedKinds.keys()) {
		if (name.length > reservedMaxLen) reservedMaxLen = name.length;
	}
	/** @type {WordLookups} */
	const lookups = {
		keywords,
		reservedKinds,
		reservedMaxLen,
		reservedBindTest: { test: (name) => reservedBind.has(name) },
		reservedBindSet: reservedBind,
		reservedBindMinLen,
		reservedBindMaxLen,
		id: nextWordLookupsId++
	};
	wordLookupsCache.set(key, lookups);
	lastWordLookups = lookups;
	return lookups;
};

/**
 * Per-option-shape data for the fast construction path: everything acorn's
 * constructor derives from options alone.
 * @typedef {object} FastConstructionShape
 * @property {Options} options normalized options template — never handed to an instance, see `cloneNormalizedOptions`
 * @property {RegExp} keywords acorn's interned keywords regexp
 * @property {RegExp} reservedWords acorn's interned reserved-words regexp
 * @property {RegExp} reservedWordsStrict acorn's interned strict reserved-words regexp
 * @property {RegExp} reservedWordsStrictBind acorn's interned strict-bind reserved-words regexp
 * @property {WordLookups} wordLookups word lookups for this keyword set
 * @property {number} ecmaVersion normalized numeric ecmaVersion
 * @property {boolean} inModule whether sourceType is module
 * @property {boolean} baseStrict strictness before the directive probe (module or explicit strict)
 * @property {boolean} allowHashBang normalized allowHashBang
 * @property {string} validRegexpFlags regexp flag whitelist for the ecmaVersion
 */

// One record per option shape passing the fast-construction gate; webpack
// parses with one or two shapes, so this is effectively a one-time build.
/** @type {Map<string, FastConstructionShape>} */
const fastConstructionShapes = new Map();

/**
 * Fresh per-instance copy of a shape's normalized options: `_tryModuleFallback`
 * writes `sourceType`/`allowReturnOutsideFunction` into `this.options`
 * mid-parse, so a shared template would leak one parse's downgrade into every
 * later parse. Sequential stores in `defaultOptions` key order land on the
 * hidden class acorn's `getOptions` builds, keeping `this.options` reads
 * monomorphic across fast- and slow-constructed parsers.
 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/options.js
 * @param {Options} template normalized options template of the shape
 * @returns {Options} per-instance options object
 */
const cloneNormalizedOptions = (template) => {
	const from = /** @type {Record<string, unknown>} */ (
		/** @type {unknown} */ (template)
	);
	/** @type {Record<string, unknown>} */
	const options = {};
	options.ecmaVersion = from.ecmaVersion;
	options.sourceType = from.sourceType;
	options.strict = from.strict;
	options.onInsertedSemicolon = from.onInsertedSemicolon;
	options.onTrailingComma = from.onTrailingComma;
	options.allowReserved = from.allowReserved;
	options.allowReturnOutsideFunction = from.allowReturnOutsideFunction;
	options.allowImportExportEverywhere = from.allowImportExportEverywhere;
	options.allowAwaitOutsideFunction = from.allowAwaitOutsideFunction;
	options.allowSuperOutsideMethod = from.allowSuperOutsideMethod;
	options.allowHashBang = from.allowHashBang;
	options.checkPrivateFields = from.checkPrivateFields;
	options.locations = from.locations;
	options.startLocation = from.startLocation;
	options.onToken = from.onToken;
	options.onComment = from.onComment;
	options.ranges = from.ranges;
	options.program = from.program;
	options.sourceFile = from.sourceFile;
	options.directSourceFile = from.directSourceFile;
	options.preserveParens = from.preserveParens;
	return /** @type {Options} */ (/** @type {unknown} */ (options));
};

/**
 * Builds a shape via one sacrificial base construction: acorn's `getOptions`
 * and `wordsRegexp` run once here, and the captured regexps are the interned
 * instances acorn's module-level cache would serve every equal construction —
 * so `getWordLookups`' identity memo keeps matching for slow-path parsers too.
 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/state.js
 * @param {Options} options raw options that passed the fast-construction gate
 * @returns {FastConstructionShape} shape record
 */
const buildFastConstructionShape = (options) => {
	// canonicalized copy of the gate-variable options; acorn reads `strict` only
	// as `=== true` and the allow* flags only by truthiness, so booleans match
	/** @type {Options} */
	const raw = {
		ecmaVersion: /** @type {Options["ecmaVersion"]} */ (options.ecmaVersion),
		sourceType: options.sourceType,
		strict: options.strict === true,
		allowReturnOutsideFunction: Boolean(options.allowReturnOutsideFunction),
		allowImportExportEverywhere: Boolean(options.allowImportExportEverywhere),
		allowAwaitOutsideFunction: Boolean(options.allowAwaitOutsideFunction),
		allowSuperOutsideMethod: Boolean(options.allowSuperOutsideMethod)
	};
	// null/undefined must stay absent so getOptions applies its own default
	if (options.allowHashBang !== null && options.allowHashBang !== undefined) {
		raw.allowHashBang = Boolean(options.allowHashBang);
	}
	const ProbeParser =
		/** @type {new (options: Options, input: string) => unknown} */ (
			/** @type {unknown} */ (BaseParser)
		);
	const probe = /** @type {ParserInternals} */ (new ProbeParser(raw, ""));
	const normalized = probe.options;
	const ecmaVersion = /** @type {number} */ (normalized.ecmaVersion);
	return {
		options: normalized,
		keywords: probe.keywords,
		reservedWords: probe.reservedWords,
		reservedWordsStrict: probe.reservedWordsStrict,
		reservedWordsStrictBind: probe.reservedWordsStrictBind,
		wordLookups: getWordLookups(probe),
		ecmaVersion,
		inModule: normalized.sourceType === "module",
		baseStrict:
			normalized.sourceType === "module" || normalized.strict === true,
		allowHashBang: normalized.allowHashBang === true,
		validRegexpFlags: getValidRegexpFlags(ecmaVersion)
	};
};

/**
 * Gate for the fast construction path: the exact webpack hot-path option
 * shape, with every option whose normalization is not replicated absent or
 * default. Returns the cached per-shape record, or null for the slow path.
 * @param {Options & { lazyNodes?: boolean }} options raw options
 * @param {string} input source code
 * @param {number | undefined} startPos start position
 * @returns {FastConstructionShape | null} shape record, or null for the slow path
 */
const getFastConstructionShape = (options, input, startPos) => {
	if (
		startPos !== undefined ||
		options.lazyNodes !== true ||
		typeof input !== "string" ||
		options.ecmaVersion === null ||
		options.ecmaVersion === undefined ||
		(options.sourceType !== "module" && options.sourceType !== "script") ||
		(options.allowReserved !== null && options.allowReserved !== undefined) ||
		options.onInsertedSemicolon ||
		options.onTrailingComma ||
		options.locations ||
		options.startLocation ||
		options.onToken ||
		options.onComment ||
		options.ranges ||
		options.program ||
		options.sourceFile ||
		options.directSourceFile ||
		options.preserveParens ||
		// getOptions copies an explicitly-present key even when undefined, so
		// presence with any value but true must take the slow path
		(options.checkPrivateFields !== true && "checkPrivateFields" in options)
	) {
		return null;
	}
	const key = `${options.ecmaVersion}|${options.sourceType}|${
		options.strict === true ? "s" : ""
	}${options.allowReturnOutsideFunction ? "r" : ""}${
		options.allowImportExportEverywhere ? "e" : ""
	}${options.allowAwaitOutsideFunction ? "a" : ""}${
		options.allowSuperOutsideMethod ? "m" : ""
	}${
		options.allowHashBang === null || options.allowHashBang === undefined
			? ""
			: options.allowHashBang
				? "|h"
				: "|n"
	}`;
	let shape = fastConstructionShapes.get(key);
	if (shape === undefined) {
		shape = buildFastConstructionShape(options);
		fastConstructionShapes.set(key, shape);
	}
	return shape;
};

/**
 * webpack's parser: acorn plus lazy `range` (no `loc` at all), Set-based scopes,
 * tokenizer fast paths, import attributes and import phases (with acorn's
 * `!forNew` guard, unlike the former `acorn-import-phases` package).
 */
class WebpackParser extends BaseParser {
	/**
	 * @param {Options & { lazyNodes?: boolean, lazyComments?: CollectedComment[], importPhases?: boolean, moduleFallback?: boolean }} options options
	 * @param {string} input source code
	 * @param {number=} startPos start position
	 */
	constructor(options, input, startPos) {
		ensureParserCaches();
		// fast construction for the gated hot-path shape: skip acorn's per-parse
		// getOptions/wordsRegexp work. A derived constructor may return an object
		// without calling super(); a plugin subclass's constructor body then runs
		// on the returned object exactly as it would after its super() call.
		const shape = getFastConstructionShape(options, input, startPos);
		if (shape !== null) {
			// write order below is load-bearing: acorn's constructor fields first,
			// in dist order (a chained `a = b = v` creates b before a), then the
			// WebpackParser fields in slow-constructor order — so fast- and
			// slow-built instances walk one hidden-class transition chain
			// acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/state.js
			const self = /** @type {ParserInternals} */ (
				/** @type {unknown} */ (Object.create(new.target.prototype))
			);
			self.options = cloneNormalizedOptions(shape.options);
			self.sourceFile = null;
			self.keywords = shape.keywords;
			self.reservedWords = shape.reservedWords;
			self.reservedWordsStrict = shape.reservedWordsStrict;
			self.reservedWordsStrictBind = shape.reservedWordsStrictBind;
			self.input = input;
			self.containsEsc = false;
			self.pos = 0;
			self.curLine = 1;
			self.lineStart = 0;
			self.type = tokTypes.eof;
			self.value = null;
			self.end = 0;
			self.start = 0;
			// locations are off, so this yields undefined — still called so a
			// plugin override of curPosition keeps taking effect
			const curPos = self.curPosition();
			self.endLoc = curPos;
			self.startLoc = curPos;
			self.lastTokStartLoc = null;
			self.lastTokEndLoc = null;
			self.lastTokEnd = 0;
			self.lastTokStart = 0;
			self.context = self.initialContext();
			self.exprAllowed = true;
			self.inModule = shape.inModule;
			// acorn's short-circuit order: the directive probe runs only for
			// sloppy scripts, and before the hashbang skip below moves `pos`
			self.strict = shape.baseStrict || self.strictDirective(self.pos);
			self.potentialArrowAt = -1;
			self.potentialArrowInForAwait = false;
			self.awaitIdentPos = 0;
			self.awaitPos = 0;
			self.yieldPos = 0;
			self.labels = [];
			self.undefinedExports = Object.create(null);
			// the hashbang skip is deferred below `_lazyComments` (it only moves
			// `pos`, which nothing before the first token reads), so the owned
			// skipLineComment records the comment directly instead of via acorn
			const hashbang = shape.allowHashBang && input.startsWith("#!");
			self.scopeStack = [];
			// sourceType is gated to module/script, never commonjs's SCOPE_FUNCTION
			self.enterScope(SCOPE_TOP);
			self.regexpState = null;
			self.privateNameStack = [];
			// WebpackParser fields, mirroring the slow constructor below with the
			// gate-guaranteed constants (lazy, no locations/onComment) folded in
			self._wordLookups = shape.wordLookups;
			// acorn only calls `.test()` on reservedWordsStrictBind (in
			// checkLValSimple); swap its regexp for the Set-backed check
			/** @type {{ reservedWordsStrictBind: { test: (name: string) => boolean } }} */ (
				/** @type {unknown} */ (self)
			).reservedWordsStrictBind = shape.wordLookups.reservedBindTest;
			self._ecmaVersion = shape.ecmaVersion;
			self._noLocations = true;
			self._lazy = true;
			self._lazyComments =
				/** @type {Options & { lazyComments?: CollectedComment[] }} */ (
					options
				).lazyComments;
			if (hashbang) self.skipLineComment(2);
			self._importPhase = null;
			self._importPhasesEnabled =
				/** @type {Options & { importPhases?: boolean }} */ (options)
					.importPhases === true;
			self._moduleFallback =
				/** @type {Options & { moduleFallback?: boolean }} */ (options)
					.moduleFallback === true;
			self._moduleSyntaxSeen = false;
			self._subscriptFastPath = shape.ecmaVersion >= 11;
			const proto = WebpackParser.prototype;
			// lazy is gate-guaranteed, so the slow path's `lazy ||` short-circuits
			// fold to constants; the method-identity gates still run so a plugin
			// subclass constructed through here keeps its overrides respected
			self._tokenFastPath = true;
			self._fullTokenFastPath = shape.ecmaVersion >= 12;
			self._inlineFinish = self.finishToken === proto.finishToken;
			self._newlineBefore = 2;
			self._deStack = [];
			self._deDepth = 0;
			self._propHashFastPath = self.checkPropClash === proto.checkPropClash;
			self._propHashStack = [];
			self._propHashDepth = 0;
			self._arrStack = [];
			self._arrDepth = 0;
			self._scopePool = [];
			self._setPool = [];
			self._labelsStack = [];
			self._labelsDepth = 0;
			self._scanGapNewline = false;
			self._validRegexpFlags = shape.validRegexpFlags;
			self._varIdOwn = self.parseVarId === base.parseVarId;
			self._stmtFastPath =
				self._varIdOwn &&
				self.parseVarStatement === proto.parseVarStatement &&
				self.parseVar === proto.parseVar &&
				self.parseIfStatement === proto.parseIfStatement &&
				self.parseReturnStatement === proto.parseReturnStatement &&
				self.parseExpressionStatement === proto.parseExpressionStatement;
			self._lastArrow = null;
			self._arrowFastPath =
				self.parseArrowExpression === proto.parseArrowExpression;
			self._funcFastPath =
				shape.ecmaVersion >= 9 &&
				self.initFunction === base.initFunction &&
				self.isSimpleParamList === base.isSimpleParamList;
			self._funcStmtOwn =
				self._funcFastPath &&
				self.parseFunctionStatement === base.parseFunctionStatement &&
				self.parseFunction === proto.parseFunction;
			self._stmt2FastPath =
				shape.ecmaVersion >= 9 &&
				self._varIdOwn &&
				self.parseForStatement === base.parseForStatement &&
				self.parseFor === base.parseFor &&
				self.parseForIn === base.parseForIn &&
				self.parseForAfterInit === base.parseForAfterInit &&
				self.parseVar === proto.parseVar &&
				self.parseWhileStatement === base.parseWhileStatement &&
				self.parseSwitchStatement === base.parseSwitchStatement &&
				self.parseThrowStatement === base.parseThrowStatement &&
				self.parseTryStatement === base.parseTryStatement &&
				self.parseBreakContinueStatement === base.parseBreakContinueStatement &&
				self.parseDoStatement === base.parseDoStatement &&
				self.parseWithStatement === base.parseWithStatement &&
				self.parseEmptyStatement === base.parseEmptyStatement &&
				self.parseDebuggerStatement === base.parseDebuggerStatement;
			self._exprFastPath =
				self.parseMaybeConditional === proto.parseMaybeConditional &&
				self.parseExprOps === proto.parseExprOps &&
				self.parseExprOp === proto.parseExprOp &&
				self.parseMaybeUnary === proto.parseMaybeUnary &&
				self.parseExprSubscripts === proto.parseExprSubscripts &&
				self.parseSubscripts === proto.parseSubscripts &&
				self.parseSubscript === proto.parseSubscript &&
				self.parseExprAtom === proto.parseExprAtom &&
				self.checkExpressionErrors === proto.checkExpressionErrors &&
				self.isContextual === proto.isContextual;
			self._moduleDeclFastPath = shape.ecmaVersion >= 16;
			self._classFastPath =
				shape.ecmaVersion >= 13 &&
				self.parseClassElementName === proto.parseClassElementName &&
				self.parsePropertyName === proto.parsePropertyName;
			// eslint-disable-next-line no-constructor-return -- the explicit object return is the mechanism that skips acorn's constructor
			return /** @type {WebpackParser} */ (/** @type {unknown} */ (self));
		}
		const lazy = options.lazyNodes === true;
		// JavascriptParser._parse pre-disables acorn's tracking, so the
		// defensive copy only runs for direct callers
		if (lazy && (options.locations || options.ranges)) {
			options = { ...options, locations: false, ranges: false };
		}
		super(options, input, startPos);
		// acorn sets this.keywords/reservedWords in its constructor; parsing
		// (and thus readWord) only starts later in parse(), so this is ready
		this._wordLookups = getWordLookups(
			/** @type {ParserInternals} */ (/** @type {unknown} */ (this))
		);
		// acorn only calls `.test()` on reservedWordsStrictBind (in
		// checkLValSimple); swap its regexp for the Set-backed check
		/** @type {{ reservedWordsStrictBind: { test: (name: string) => boolean } }} */
		(/** @type {unknown} */ (this)).reservedWordsStrictBind =
			this._wordLookups.reservedBindTest;
		// per-token option probes cached once: acorn normalizes options in
		// `getOptions` before the constructor body runs and never mutates them
		const normalizedOptions = /** @type {ParserInternals} */ (
			/** @type {unknown} */ (this)
		).options;
		this._ecmaVersion = /** @type {number} */ (normalizedOptions.ecmaVersion);
		this._noLocations = !normalizedOptions.locations;
		// lazy mode: nodes get only offsets, gating the owned tokenizer and
		// statement fast paths
		this._lazy = lazy;
		// lazy comment collection must not race a user-provided onComment
		/** @type {CollectedComment[] | undefined} */
		this._lazyComments =
			lazy && !options.onComment ? options.lazyComments : undefined;
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
					input
				)
			);
		}
		/** @type {ImportPhase | null} */
		this._importPhase = null;
		this._importPhasesEnabled = options.importPhases === true;
		// auto source type: parse as module first, downgrade to script in place
		// (instead of a second full parse) when script-only syntax is hit
		this._moduleFallback = options.moduleFallback === true;
		// set once a module-only construct is parsed; blocks the downgrade
		this._moduleSyntaxSeen = false;
		// the owned parseSubscript assumes optional chaining exists (it bakes
		// `optional` into the node shape), so gate it on the normalized version
		this._subscriptFastPath = lazy && this._ecmaVersion >= 11;
		const proto = WebpackParser.prototype;
		const self = /** @type {ParserInternals} */ (/** @type {unknown} */ (this));
		// the owned per-token loop (nextToken/finishToken/next) also serves the
		// public non-lazy tokenizer(): locations off, no onToken, and none of the
		// acorn tokenizer methods it inlines or skips overridden by a plugin
		// (`nextToken`'s punct/dot/eq shortcuts bypass `getTokenFromCode`,
		// `finishOp`, `readToken_dot` and `readToken_eq_excl` even when the full
		// token path below is off, so their overrides must gate this loop too)
		this._tokenFastPath =
			lazy ||
			(this._noLocations &&
				!normalizedOptions.onToken &&
				this.nextToken === proto.nextToken &&
				this.finishToken === proto.finishToken &&
				this.next === proto.next &&
				this.skipSpace === proto.skipSpace &&
				this.getTokenFromCode === proto.getTokenFromCode &&
				this.finishOp === proto.finishOp &&
				self.readToken === proto.readToken &&
				self.updateContext === base.updateContext &&
				self.readToken_dot === base.readToken_dot &&
				self.readToken_eq_excl === base.readToken_eq_excl);
		// the owned getTokenFromCode bakes in every ES2021 operator (?., ??=,
		// &&=, ...), so it needs at least that version; outside lazy mode it also
		// bypasses acorn's readToken_* family, so any override there turns it off
		this._fullTokenFastPath =
			this._ecmaVersion >= 12 &&
			(lazy ||
				(this._tokenFastPath &&
					self.readToken_slash === base.readToken_slash &&
					self.readToken_mult_modulo_exp === base.readToken_mult_modulo_exp &&
					self.readToken_pipe_amp === base.readToken_pipe_amp &&
					self.readToken_caret === base.readToken_caret &&
					self.readToken_plus_min === base.readToken_plus_min &&
					self.readToken_lt_gt === base.readToken_lt_gt &&
					self.readToken_question === base.readToken_question &&
					self.readToken_numberSign === base.readToken_numberSign &&
					self.readRadixNumber === base.readRadixNumber));
		// the owned nextToken/readWord finish the commonest tokens in place,
		// which skips this.finishToken: needs the fast token loop (readWord runs
		// in every mode) and no finishToken override by a plugin
		this._inlineFinish =
			this._tokenFastPath &&
			this.finishToken === WebpackParser.prototype.finishToken;
		// whether the gap before the current token holds a line terminator:
		// 0 no, 1 yes, 2 unknown (canInsertSemicolon then scans the gap)
		/** @type {0 | 1 | 2} */
		this._newlineBefore = 2;
		// LIFO pool for call-scoped destructuring-errors records; depth resets
		// implicitly since a raise aborts the whole parse
		/** @type {DestructuringErrorsShim[]} */
		this._deStack = [];
		this._deDepth = 0;
		// LIFO pool for `parseObj`'s prop-clash records: the ES9+ `checkPropClash`
		// (base's and the owned copy alike) only ever touches `.proto`, so one
		// record per nesting depth suffices; an overriding subclass gets the
		// fresh `{}` acorn expects
		this._propHashFastPath =
			/** @type {ParserInternals} */ (/** @type {unknown} */ (this))
				.checkPropClash === WebpackParser.prototype.checkPropClash;
		/** @type {{ proto: boolean }[]} */
		this._propHashStack = [];
		this._propHashDepth = 0;
		// LIFO pool of scratch arrays for list productions: elements are written
		// by index, then copied out exactly sized — a push-grown array retains
		// ~17 slots of capacity slack per list otherwise
		/** @type {unknown[][]} */
		this._arrStack = [];
		this._arrDepth = 0;
		// LIFO pool of exited Scope records reused by enterScope; a raise leaves
		// stale entries behind, which the next parse's resets make harmless
		/** @type {Scope[]} */
		this._scopePool = [];
		// pool of emptied name Sets harvested by exitScope for declareName
		/** @type {Set<string>[]} */
		this._setPool = [];
		// per-depth pool of function-body label arrays (see parseFunctionBody)
		/** @type {{ kind?: string | null, name?: string, statementStart?: number }[][]} */
		this._labelsStack = [];
		this._labelsDepth = 0;
		// whether the last _scanGap saw a line terminator
		this._scanGapNewline = false;
		// `readRegexp`'s flag whitelist depends only on the ecmaVersion
		this._validRegexpFlags = getValidRegexpFlags(this._ecmaVersion);
		// _parseVarInto inlines acorn's parseVarId, so an override of it turns
		// every owned var-declaration path off
		this._varIdOwn = self.parseVarId === base.parseVarId;
		// the owned parseStatement inlines these methods, so a parser plugin
		// overriding any of them turns the statement fast path off
		this._stmtFastPath =
			lazy &&
			this._varIdOwn &&
			this.parseVarStatement === proto.parseVarStatement &&
			this.parseVar === proto.parseVar &&
			this.parseIfStatement === proto.parseIfStatement &&
			this.parseReturnStatement === proto.parseReturnStatement &&
			this.parseExpressionStatement === proto.parseExpressionStatement;
		// last arrow finished by parseArrowExpression: `expr === this._lastArrow`
		// replaces the megamorphic `expr.type === "ArrowFunctionExpression"`
		// probes on the expression spine (arrows are created in exactly one place
		// and never backtracked, so identity captures the type test)
		/** @type {Expression | null} */
		this._lastArrow = null;
		// arrows must flow through parseArrowExpression for the identity probe;
		// a plugin overriding it falls back to the type-based probes
		this._arrowFastPath =
			lazy && this.parseArrowExpression === proto.parseArrowExpression;
		// the owned parseFunction/parseFunctionBody inline initFunction and
		// isSimpleParamList; a plugin overriding either turns the fast path off
		const internals = /** @type {ParserInternals} */ (
			/** @type {unknown} */ (this)
		);
		this._funcFastPath =
			lazy &&
			this._ecmaVersion >= 9 &&
			internals.initFunction === base.initFunction &&
			internals.isSimpleParamList === base.isSimpleParamList;
		// the owned parseStatement inlines parseFunctionStatement's body
		this._funcStmtOwn =
			this._funcFastPath &&
			internals.parseFunctionStatement === base.parseFunctionStatement &&
			this.parseFunction === proto.parseFunction;
		// the owned parseStatement inlines these statement parsers too; any
		// override falls back to acorn's dispatch for these heads
		this._stmt2FastPath =
			lazy &&
			this._ecmaVersion >= 9 &&
			this._varIdOwn &&
			internals.parseForStatement === base.parseForStatement &&
			internals.parseFor === base.parseFor &&
			internals.parseForIn === base.parseForIn &&
			internals.parseForAfterInit === base.parseForAfterInit &&
			this.parseVar === proto.parseVar &&
			internals.parseWhileStatement === base.parseWhileStatement &&
			internals.parseSwitchStatement === base.parseSwitchStatement &&
			internals.parseThrowStatement === base.parseThrowStatement &&
			internals.parseTryStatement === base.parseTryStatement &&
			internals.parseBreakContinueStatement ===
				base.parseBreakContinueStatement &&
			internals.parseDoStatement === base.parseDoStatement &&
			internals.parseWithStatement === base.parseWithStatement &&
			internals.parseEmptyStatement === base.parseEmptyStatement &&
			internals.parseDebuggerStatement === base.parseDebuggerStatement;
		// `parseMaybeAssign`'s trivial-atom fast path returns the atom without
		// descending the seven-layer expression chain, so every layer it skips
		// must be the owned one
		this._exprFastPath =
			lazy &&
			this.parseMaybeConditional === proto.parseMaybeConditional &&
			this.parseExprOps === proto.parseExprOps &&
			this.parseExprOp === proto.parseExprOp &&
			this.parseMaybeUnary === proto.parseMaybeUnary &&
			this.parseExprSubscripts === proto.parseExprSubscripts &&
			this.parseSubscripts === proto.parseSubscripts &&
			this.parseSubscript === proto.parseSubscript &&
			this.parseExprAtom === proto.parseExprAtom &&
			this.checkExpressionErrors === proto.checkExpressionErrors &&
			this.isContextual === proto.isContextual;
		// the owned import/export declarations bake in ecmaVersion ≥ 16 (import
		// attributes; with it string export names ≥ 13 and `export * as` ≥ 11)
		this._moduleDeclFastPath = lazy && this._ecmaVersion >= 16;
		// the owned parseClassElement bakes in ES13 semantics (static blocks,
		// fields) and rebuilds field elements on `PropertyDefinitionNode`, which
		// would drop fields an overriding name parser adds — such overrides (and
		// pre-ES13 versions) gate the whole class family back to acorn
		this._classFastPath =
			lazy &&
			this._ecmaVersion >= 13 &&
			this.parseClassElementName === proto.parseClassElementName &&
			this.parsePropertyName === proto.parsePropertyName;
	}

	/**
	 * Fetches a destructuring-errors record from the pool: acorn allocates one
	 * per expression parse and drops it at the end of the call, so strictly
	 * call-scoped users can reuse records instead. Pair every acquire with a
	 * `_releaseDestructuringErrors` on each non-throwing exit.
	 * @returns {DestructuringErrorsShim} reset record
	 * @this {ParserInternals}
	 */
	_acquireDestructuringErrors() {
		const stack = this._deStack;
		const depth = this._deDepth++;
		const cached = stack[depth];
		if (cached !== undefined) {
			cached.shorthandAssign =
				cached.trailingComma =
				cached.parenthesizedAssign =
				cached.parenthesizedBind =
				cached.doubleProto =
					-1;
			return cached;
		}
		return (stack[depth] = createDestructuringErrors());
	}

	/**
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	_releaseDestructuringErrors() {
		this._deDepth--;
	}

	/**
	 * Fetches a scratch array for a list production: write elements by index,
	 * then materialize with `_releaseScratch`. Entries past the caller's write
	 * index are stale and meaningless.
	 * @returns {EXPECTED_ANY[]} scratch array
	 * @this {ParserInternals}
	 */
	_acquireScratch() {
		const stack = this._arrStack;
		const depth = this._arrDepth++;
		const cached = stack[depth];
		if (cached !== undefined) return cached;
		return (stack[depth] = []);
	}

	/**
	 * @param {EXPECTED_ANY[]} scratch scratch array from `_acquireScratch`
	 * @param {number} count number of elements written
	 * @returns {EXPECTED_ANY[]} exactly-sized copy of the first `count` entries
	 * @this {ParserInternals}
	 */
	_releaseScratch(scratch, count) {
		this._arrDepth--;
		return scratch.slice(0, count);
	}

	// ----- owned acorn utility layer (exact copies; with these the lazy path
	// no longer executes any acorn code — what remains of the dependency is the
	// class relationship, the token/context tables and the cold delegations) -----

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/parseutil.js
	 * @param {TokenType} type expected token type
	 * @returns {boolean} whether the token was consumed
	 * @this {ParserInternals}
	 */
	eat(type) {
		if (this.type === type) {
			this.next();
			return true;
		}
		return false;
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/parseutil.js
	 * @param {TokenType} type expected token type
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	expect(type) {
		if (!this.eat(type)) this.unexpected();
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/parseutil.js
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	semicolon() {
		if (!this.eat(tokTypes.semi) && !this.insertSemicolon()) this.unexpected();
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/parseutil.js
	 * @returns {boolean | undefined} true when a semicolon was inserted
	 * @this {ParserInternals}
	 */
	insertSemicolon() {
		if (this.canInsertSemicolon()) {
			const onInsertedSemicolon =
				/** @type {Options & { onInsertedSemicolon?: (pos: number, loc?: Position | null) => void }} */ (
					this.options
				).onInsertedSemicolon;
			if (onInsertedSemicolon) {
				onInsertedSemicolon(this.lastTokEnd, this.lastTokEndLoc);
			}
			return true;
		}
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/parseutil.js
	 * @param {string} name contextual keyword
	 * @returns {boolean} whether the current token is that contextual name
	 * @this {ParserInternals}
	 */
	isContextual(name) {
		return (
			this.type === tokTypes.name && this.value === name && !this.containsEsc
		);
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/parseutil.js
	 * @param {string} name contextual keyword
	 * @returns {boolean} whether the token was consumed
	 * @this {ParserInternals}
	 */
	eatContextual(name) {
		if (!this.isContextual(name)) return false;
		this.next();
		return true;
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/parseutil.js
	 * @param {string} name contextual keyword
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	expectContextual(name) {
		if (!this.eatContextual(name)) this.unexpected();
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/parseutil.js
	 * @param {DestructuringErrorsShim | null | undefined} refDestructuringErrors record to flush
	 * @param {boolean} isAssign whether flushing for an assignment target
	 * @returns {void}
	 * @this {ParserInternals}
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
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/parseutil.js
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	checkYieldAwaitInDefaultParams() {
		if (this.yieldPos && (!this.awaitPos || this.yieldPos < this.awaitPos)) {
			this.raise(this.yieldPos, "Yield expression cannot be a default value");
		}
		if (this.awaitPos) {
			this.raise(this.awaitPos, "Await expression cannot be a default value");
		}
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/parseutil.js
	 * @param {Expression} expr checked expression
	 * @returns {boolean} whether the expression is a simple assignment target
	 * @this {ParserInternals}
	 */
	isSimpleAssignTarget(expr) {
		if (expr.type === "ParenthesizedExpression") {
			return this.isSimpleAssignTarget(
				/** @type {Expression} */ (
					/** @type {Expression & { expression?: Expression }} */ (expr)
						.expression
				)
			);
		}
		return expr.type === "Identifier" || expr.type === "MemberExpression";
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @returns {Expression} parenthesized expression
	 * @this {ParserInternals}
	 */
	parseParenExpression() {
		this.expect(tokTypes.parenL);
		const val = this.parseExpression();
		this.expect(tokTypes.parenR);
		return val;
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {boolean=} isFor whether in a `for` head
	 * @returns {boolean} whether a `using` declaration starts here
	 * @this {ParserInternals}
	 */
	isUsing(isFor) {
		return this.isUsingKeyword(false, isFor);
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {boolean=} isFor whether in a `for` head
	 * @returns {boolean} whether an `await using` declaration starts here
	 * @this {ParserInternals}
	 */
	isAwaitUsing(isFor) {
		return this.isUsingKeyword(true, isFor);
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @returns {boolean} whether an exported declaration statement follows
	 * @this {ParserInternals}
	 */
	shouldParseExportStatement() {
		const keyword = this.type.keyword;
		return (
			keyword === "var" ||
			keyword === "const" ||
			keyword === "class" ||
			keyword === "function" ||
			this.isLet() ||
			this.isAsyncFunction()
		);
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {Node} node started export node (unused, matching acorn)
	 * @returns {Node} exported declaration statement
	 * @this {ParserInternals}
	 */
	parseExportDeclaration(node) {
		return this.parseStatement(null);
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {Node} prop property whose key named the accessor kind
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	parseGetterSetter(prop) {
		const target =
			/** @type {Node & { key: Node & { name: string }, value: Node & { params: Node[] }, kind: string }} */ (
				prop
			);
		const kind = target.key.name;
		this.parsePropertyName(prop);
		target.value = /** @type {Node & { params: Node[] }} */ (
			/** @type {unknown} */ (this.parseMethod(false))
		);
		target.kind = kind;
		const paramCount = target.kind === "get" ? 0 : 1;
		if (target.value.params.length !== paramCount) {
			const start = target.value.start;
			if (target.kind === "get") {
				this.raiseRecoverable(start, "getter should have no params");
			} else {
				this.raiseRecoverable(start, "setter should have exactly one param");
			}
		} else if (
			target.kind === "set" &&
			target.value.params[0].type === "RestElement"
		) {
			this.raiseRecoverable(
				target.value.params[0].start,
				"Setter cannot use rest params"
			);
		}
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {Node} node function node receiving `params`
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	parseFunctionParams(node) {
		this.expect(tokTypes.parenL);
		/** @type {Node & { params: Node[] }} */ (node).params =
			this.parseBindingList(tokTypes.parenR, false, this._ecmaVersion >= 8);
		this.checkYieldAwaitInDefaultParams();
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @returns {boolean} whether an async arrow follows (consumes the arrow)
	 * @this {ParserInternals}
	 */
	shouldParseAsyncArrow() {
		return !this.canInsertSemicolon() && this.eat(tokTypes.arrow);
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {number} startPos arrow start offset
	 * @param {Position | undefined} startLoc arrow start position
	 * @param {Expression[]} exprList parsed parameter expressions
	 * @param {boolean | string=} forInit for-init context flag
	 * @returns {Expression} async arrow function expression
	 * @this {ParserInternals}
	 */
	parseSubscriptAsyncArrow(startPos, startLoc, exprList, forInit) {
		return this.parseArrowExpression(
			this.startNodeAt(startPos, startLoc),
			/** @type {Node[]} */ (/** @type {unknown} */ (exprList)),
			true,
			forInit
		);
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {Expression[]} exprList parsed parameter expressions (unused, matching acorn)
	 * @returns {boolean} whether an arrow body may follow
	 * @this {ParserInternals}
	 */
	shouldParseArrow(exprList) {
		return !this.canInsertSemicolon();
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {number} startPos arrow start offset
	 * @param {Position | undefined} startLoc arrow start position
	 * @param {Expression[]} exprList parsed parameter expressions
	 * @param {boolean | string=} forInit for-init context flag
	 * @returns {Expression} arrow function expression
	 * @this {ParserInternals}
	 */
	parseParenArrowList(startPos, startLoc, exprList, forInit) {
		return this.parseArrowExpression(
			this.startNodeAt(startPos, startLoc),
			/** @type {Node[]} */ (/** @type {unknown} */ (exprList)),
			false,
			forInit
		);
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {Node} item parsed paren item
	 * @returns {Node} the item unchanged
	 * @this {ParserInternals}
	 */
	parseParenItem(item) {
		return item;
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/lval.js
	 * @param {boolean=} allowModifiers unused by acorn's own grammar
	 * @returns {Node} binding element, possibly with a default
	 * @this {ParserInternals}
	 */
	parseAssignableListItem(allowModifiers) {
		const element = this.parseMaybeDefault(this.start, this.startLoc);
		this.parseBindingListItem(element);
		return element;
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/lval.js
	 * @param {Node} param binding element
	 * @returns {Node} the element unchanged
	 * @this {ParserInternals}
	 */
	parseBindingListItem(param) {
		return param;
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {Node[]} statements directive-prologue candidates
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	adaptDirectivePrologue(statements) {
		for (
			let i = 0;
			i < statements.length && this.isDirectiveCandidate(statements[i]);
			++i
		) {
			const statement =
				/** @type {Node & { directive?: string, expression: Node & { raw: string } }} */ (
					statements[i]
				);
			statement.directive = statement.expression.raw.slice(1, -1);
		}
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {Node} statement checked statement
	 * @returns {boolean} whether the statement can be a directive
	 * @this {ParserInternals}
	 */
	isDirectiveCandidate(statement) {
		const target =
			/** @type {Node & { expression?: Node & { value?: unknown } }} */ (
				statement
			);
		const quote = this.input.charCodeAt(statement.start);
		return (
			this._ecmaVersion >= 5 &&
			statement.type === "ExpressionStatement" &&
			/** @type {Node} */ (target.expression).type === "Literal" &&
			typeof (
				/** @type {Node & { value?: unknown }} */ (target.expression).value
			) === "string" &&
			// reject parenthesized strings
			(quote === 34 || quote === 39)
		);
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @returns {Node} catch parameter (scope entered as a side effect)
	 * @this {ParserInternals}
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
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @returns {boolean} whether a class element name starts at the current token
	 * @this {ParserInternals}
	 */
	isClassElementNameStart() {
		const type = this.type;
		return Boolean(
			type === tokTypes.name ||
			type === tokTypes.privateId ||
			type === tokTypes.num ||
			type === tokTypes.string ||
			type === tokTypes.bracketL ||
			type.keyword
		);
	}

	/**
	 * Lazy-mode `finishNodeAt` (explicit end offset); non-lazy delegates.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/node.js
	 * @param {Node} node node to finish
	 * @param {string} type node type
	 * @param {number} pos end offset
	 * @param {Position=} loc end position when acorn tracks locations
	 * @returns {Node} the finished node
	 * @this {ParserInternals}
	 */
	finishNodeAt(node, type, pos, loc) {
		if (!this._lazy) return base.finishNodeAt.call(this, node, type, pos, loc);
		node.type = type;
		node.end = pos;
		return node;
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @param {number} pos code unit offset
	 * @returns {number} full code point at the offset
	 * @this {ParserInternals}
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
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @returns {number} full code point at the current position
	 * @this {ParserInternals}
	 */
	fullCharCodeAtPos() {
		return this.fullCharCodeAt(this.pos);
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @param {number} code current char code
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	readToken(code) {
		// identifiers may start with an escape, so '\' dispatches to readWord too
		if (isIdentifierStart(code, this._ecmaVersion >= 6) || code === 92) {
			return this.readWord();
		}
		return this.getTokenFromCode(code);
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokencontext.js
	 * @returns {TokContextShim} the current token context
	 * @this {ParserInternals}
	 */
	curContext() {
		return this.context[this.context.length - 1];
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokencontext.js
	 * @param {unknown} tokenCtx token context to force
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	overrideContext(tokenCtx) {
		if (this.curContext() !== tokenCtx) {
			this.context[this.context.length - 1] = /** @type {TokContextShim} */ (
				tokenCtx
			);
		}
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokencontext.js
	 * @returns {boolean} whether the enclosing function context is a generator
	 * @this {ParserInternals}
	 */
	inGeneratorContext() {
		for (let i = this.context.length - 1; i >= 1; i--) {
			const context = this.context[i];
			if (context.token === "function") {
				return /** @type {boolean} */ (context.generator);
			}
		}
		return false;
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokencontext.js
	 * @returns {TokContextShim[]} initial token-context stack
	 * @this {ParserInternals}
	 */
	initialContext() {
		return [CTX_B_STAT];
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/scope.js
	 * @returns {Scope} innermost scope
	 * @this {ParserInternals}
	 */
	currentScope() {
		return this.scopeStack[this.scopeStack.length - 1];
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/scope.js
	 * @returns {Scope} innermost var-hoisting scope
	 * @this {ParserInternals}
	 */
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

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/scope.js
	 * @returns {Scope} innermost scope that binds `this`
	 * @this {ParserInternals}
	 */
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
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/scope.js
	 * @param {Scope} scope checked scope
	 * @returns {boolean | number} whether function declarations bind like vars there
	 * @this {ParserInternals}
	 */
	treatFunctionsAsVarInScope(scope) {
		return Boolean(
			scope.flags & SCOPE_FUNCTION ||
			(!this.inModule && scope.flags & SCOPE_TOP)
		);
	}

	/**
	 * @returns {boolean} whether the current position is inside a function body
	 * @this {ParserInternals}
	 */
	get inFunction() {
		return (this.currentVarScope().flags & SCOPE_FUNCTION) > 0;
	}

	/**
	 * @returns {boolean} whether the enclosing function is a generator
	 * @this {ParserInternals}
	 */
	get inGenerator() {
		return (this.currentVarScope().flags & SCOPE_GENERATOR) > 0;
	}

	/**
	 * @returns {boolean} whether the enclosing function is async
	 * @this {ParserInternals}
	 */
	get inAsync() {
		return (this.currentVarScope().flags & SCOPE_ASYNC) > 0;
	}

	/**
	 * @returns {boolean} whether `await` is usable at the current position
	 * @this {ParserInternals}
	 */
	get canAwait() {
		for (let i = this.scopeStack.length - 1; i >= 0; i--) {
			const flags = this.scopeStack[i].flags;
			if (flags & (SCOPE_CLASS_STATIC_BLOCK | SCOPE_CLASS_FIELD_INIT)) {
				return false;
			}
			if (flags & SCOPE_FUNCTION) return (flags & SCOPE_ASYNC) > 0;
		}
		return (
			(this.inModule && this._ecmaVersion >= 13) ||
			this.options.allowAwaitOutsideFunction === true
		);
	}

	/**
	 * @returns {boolean} whether a `return` statement is allowed here
	 * @this {ParserInternals}
	 */
	get allowReturn() {
		if (this.inFunction) return true;
		return Boolean(
			this.options.allowReturnOutsideFunction &&
			this.currentVarScope().flags & SCOPE_TOP
		);
	}

	/**
	 * @returns {boolean} whether `super.x` is allowed here
	 * @this {ParserInternals}
	 */
	get allowSuper() {
		return (
			(this.currentThisScope().flags & SCOPE_SUPER) > 0 ||
			this.options.allowSuperOutsideMethod === true
		);
	}

	/**
	 * @returns {boolean} whether `super()` is allowed here
	 * @this {ParserInternals}
	 */
	get allowDirectSuper() {
		return (this.currentThisScope().flags & SCOPE_DIRECT_SUPER) > 0;
	}

	/**
	 * @returns {boolean | number} whether function declarations bind like vars here
	 * @this {ParserInternals}
	 */
	get treatFunctionsAsVar() {
		return this.treatFunctionsAsVarInScope(this.currentScope());
	}

	/**
	 * @returns {boolean} whether `new.target` is allowed here
	 * @this {ParserInternals}
	 */
	get allowNewDotTarget() {
		for (let i = this.scopeStack.length - 1; i >= 0; i--) {
			const flags = this.scopeStack[i].flags;
			if (
				flags & (SCOPE_CLASS_STATIC_BLOCK | SCOPE_CLASS_FIELD_INIT) ||
				(flags & SCOPE_FUNCTION && !(flags & SCOPE_ARROW))
			) {
				return true;
			}
		}
		return false;
	}

	/**
	 * @returns {boolean} whether a `using` declaration is allowed here
	 * @this {ParserInternals}
	 */
	get allowUsing() {
		const flags = this.currentScope().flags;
		if (flags & SCOPE_SWITCH) return false;
		if (!this.inModule && flags & SCOPE_TOP) return false;
		return true;
	}

	/**
	 * @returns {boolean} whether the current position is in a static block
	 * @this {ParserInternals}
	 */
	get inClassStaticBlock() {
		return (this.currentVarScope().flags & SCOPE_CLASS_STATIC_BLOCK) > 0;
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/location.js
	 * @param {number} pos error offset
	 * @param {string} message error message
	 * @returns {never} always throws
	 * @this {ParserInternals}
	 */
	raise(pos, message) {
		const loc = getLineInfo(this.input, pos);
		message += ` (${loc.line}:${loc.column})`;
		if (this.sourceFile) message += ` in ${this.sourceFile}`;
		const err =
			/** @type {SyntaxError & { pos: number, loc: ParserPosition, raisedAt: number }} */ (
				new SyntaxError(message)
			);
		err.pos = pos;
		err.loc = loc;
		err.raisedAt = this.pos;
		throw err;
	}

	/**
	 * Same body as `raise`, mirroring acorn's aliasing (a plugin overriding one
	 * must not implicitly change the other).
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/location.js
	 * @param {number} pos error offset
	 * @param {string} message error message
	 * @returns {never} always throws
	 * @this {ParserInternals}
	 */
	raiseRecoverable(pos, message) {
		const loc = getLineInfo(this.input, pos);
		message += ` (${loc.line}:${loc.column})`;
		if (this.sourceFile) message += ` in ${this.sourceFile}`;
		const err =
			/** @type {SyntaxError & { pos: number, loc: ParserPosition, raisedAt: number }} */ (
				new SyntaxError(message)
			);
		err.pos = pos;
		err.loc = loc;
		err.raisedAt = this.pos;
		throw err;
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/location.js
	 * @returns {Position | undefined} current position when locations are tracked
	 * @this {ParserInternals}
	 */
	curPosition() {
		if (this.options.locations) {
			return /** @type {Position} */ (
				/** @type {unknown} */ (
					new ParserPosition(this.curLine, this.pos - this.lineStart)
				)
			);
		}
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @param {number} position error offset
	 * @param {string} message error message
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	invalidStringToken(position, message) {
		if (this.inTemplateElement && this._ecmaVersion >= 9) {
			throw INVALID_TEMPLATE_ESCAPE_ERROR;
		} else {
			this.raise(position, message);
		}
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @returns {void}
	 * @this {ParserInternals}
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
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @returns {void}
	 * @this {ParserInternals}
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
						tokTypes.invalidTemplate,
						input.slice(this.start, this.pos)
					);
				case "\r":
					if (input[this.pos + 1] === "\n") ++this.pos;
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

	// ----- tokenizer fast paths -----

	/**
	 * Owned per-token loop: acorn's `nextToken` chains `skipSpace` →
	 * `fullCharCodeAtPos` → `readToken` → `isIdentifierStart` with a dead
	 * `locations` check at each step. For the common non-template context of
	 * `_tokenFastPath` mode (lazy, or locations-off with no tokenizer overrides)
	 * this folds whitespace and comment skipping and the ASCII token dispatch
	 * into one function so nothing re-enters acorn's per-step option checks.
	 * Template/`preserveSpace` contexts and other modes use acorn's tokenizer.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	nextToken() {
		const context = this.context;
		const curContext = context[context.length - 1];
		let slow;
		if (curContext !== undefined) {
			const flagged =
				/** @type {TokContextShim & { [kSlowContext]?: boolean }} */
				(curContext);
			slow = flagged[kSlowContext];
			if (slow === undefined) {
				slow = flagged[kSlowContext] = Boolean(
					curContext.preserveSpace || curContext.override
				);
			}
		}
		if (!this._tokenFastPath || curContext === undefined) {
			this._newlineBefore = 2;
			return base.nextToken.call(this);
		}
		if (slow) {
			this._newlineBefore = 2;
			// template contexts: acorn's nextToken minus the dead location
			// bookkeeping — no space skipping, EOF probe, then the context's
			// own reader (`tryReadTemplateToken`, dispatched virtually)
			const override = curContext.override;
			if (override !== undefined && curContext.preserveSpace) {
				this.start = this.pos;
				if (this.pos >= this.input.length) {
					return this.finishToken(tokTypes.eof);
				}
				return /** @type {(parser: ParserInternals) => void} */ (override)(
					this
				);
			}
			return base.nextToken.call(this);
		}
		const input = this.input;
		const len = input.length;
		let pos = this.pos;
		// line terminators are flagged while skipping (yuku's
		// `line_terminator_before`), so ASI checks need no gap re-scan. A
		// delegated path (acorn's html-comment handling) may have consumed part
		// of the gap before re-entering — start at "unknown" then.
		/** @type {0 | 1 | 2} */
		let newline = pos === this.lastTokEnd ? 0 : 2;
		// one CHAR_CLASS load classifies each char for both the skip loop and
		// the token dispatch below (yuku's ws_class/ident/punct tables in one)
		let code = 0;
		let cls = CLS_OTHER;
		while (pos < len) {
			code = input.charCodeAt(pos);
			cls = CHAR_CLASS[code];
			if (cls < CLS_SPACE) {
				if (cls === CLS_UNICODE) {
					// unicode whitespace / line terminators: the cold reader consumes them
					this.pos = pos;
					this._skipSpaceCold();
					pos = this.pos;
					if (newline === 0) newline = 2;
					code = pos < len ? input.charCodeAt(pos) : 0;
					cls = CHAR_CLASS[code];
				}
				break;
			}
			if (cls === CLS_SPACE) {
				// space, tab, VT, FF (no CRLF/line bookkeeping in lazy mode)
				pos++;
			} else if (cls === CLS_NEWLINE) {
				newline = 1;
				pos++;
			} else {
				const next = input.charCodeAt(pos + 1);
				if (next === 42) {
					this.pos = pos;
					this.skipBlockComment();
					pos = this.pos;
					// the comment body may hold a line terminator
					if (newline === 0) newline = 2;
				} else if (next === 47) {
					this.pos = pos;
					this.skipLineComment(2);
					pos = this.pos;
				} else {
					// a division/regexp token, not a comment
					cls = CLS_OTHER;
					break;
				}
			}
		}
		this._newlineBefore = newline;
		this.pos = pos;
		this.start = pos;
		if (pos >= len) return this.finishToken(tokTypes.eof);
		switch (cls) {
			case CLS_IDENT:
				return this.readWord();
			case CLS_PUNCT: {
				const type = /** @type {TokenType} */ (SIMPLE_PUNCT[code]);
				this.pos = pos + 1;
				if (!this._inlineFinish) return this.finishToken(type);
				// finishToken inlined for the simple punctuators (no value, and
				// their context updates are per-char static)
				this.end = pos + 1;
				const prevType = this.type;
				this.type = type;
				this.value = undefined;
				switch (code) {
					case 41:
					case 125: {
						// parenR/braceR.updateContext, inlined
						if (context.length === 1) {
							this.exprAllowed = true;
							break;
						}
						let out = /** @type {TokContextShim} */ (context.pop());
						if (
							out === CTX_B_STAT &&
							/** @type {TokContextShim} */ (context[context.length - 1])
								.token === "function"
						) {
							out = /** @type {TokContextShim} */ (context.pop());
						}
						this.exprAllowed = !out.isExpr;
						break;
					}
					case 123:
						// braceL.updateContext, inlined
						context.push(this.braceIsBlock(prevType) ? CTX_B_STAT : CTX_B_EXPR);
						this.exprAllowed = true;
						break;
					case 40: {
						// parenL.updateContext, inlined
						const statementParens =
							prevType === tokTypes._if ||
							prevType === tokTypes._for ||
							prevType === tokTypes._with ||
							prevType === tokTypes._while;
						context.push(statementParens ? CTX_P_STAT : CTX_P_EXPR);
						this.exprAllowed = true;
						break;
					}
					case 58:
						// colon.updateContext, inlined
						if (
							/** @type {TokContextShim} */ (context[context.length - 1])
								.token === "function"
						) {
							context.pop();
						}
						this.exprAllowed = true;
						break;
					case 93:
						// bracketR: no context hook, beforeExpr is false
						this.exprAllowed = false;
						break;
					default:
						// semi, comma, bracketL: no context hook, beforeExpr is true
						this.exprAllowed = true;
				}
				return;
			}
			case CLS_DOT: {
				// `.` not starting `.5` or `...`: skip readToken_dot's re-dispatch
				const next = input.charCodeAt(pos + 1);
				if ((next < 48 || next > 57) && next !== 46) {
					this.pos = pos + 1;
					return this.finishToken(tokTypes.dot);
				}
				return this.getTokenFromCode(code);
			}
			case CLS_EQ: {
				// `=` not starting `==` or `=>`: skip readToken_eq_excl + finishOp slice
				const next = input.charCodeAt(pos + 1);
				if (next !== 61 && next !== 62) {
					this.pos = pos + 1;
					return this.finishToken(tokTypes.eq, "=");
				}
				return this.getTokenFromCode(code);
			}
			case CLS_UNICODE:
				return this.readToken(this.fullCharCodeAtPos());
			default:
				return this.getTokenFromCode(code);
		}
	}

	/**
	 * `_tokenFastPath` `finishToken`: acorn probes `options.locations` for a
	 * dead `endLoc` write on every token and reaches `updateContext` through an
	 * extra method call. Skip the probe and inline acorn's `updateContext` body —
	 * this runs once per token. Other modes use acorn's.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @param {TokenType} type token type
	 * @param {unknown=} value token value
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	finishToken(type, value) {
		if (!this._tokenFastPath) {
			return base.finishToken.call(this, type, value);
		}
		this.end = this.pos;
		const prevType = this.type;
		this.type = type;
		this.value = value;
		const internal = /** @type {TokenTypeInternal} */ (type);
		// acorn's updateContext, inlined: keyword-after-dot forbids an expression,
		// else the token type's own context hook runs, else `exprAllowed` follows
		// the type's `beforeExpr` (the branch that makes `/` after a value divide)
		if (type === tokTypes.name) {
			// name.updateContext, inlined for the commonest token: only `of` /
			// `yield` (outside a `.` access, ES6+) can re-allow an expression
			this.exprAllowed =
				((value === "of" && !this.exprAllowed) ||
					(value === "yield" && this.inGeneratorContext())) &&
				prevType !== tokTypes.dot &&
				this._ecmaVersion >= 6;
		} else {
			const update = internal.updateContext;
			if (update === null) {
				// no context hook (most punctuation, operators, literals and
				// keywords): acorn's keyword-after-dot probe, else `beforeExpr` —
				// checked first so this majority skips the per-type compares below
				this.exprAllowed =
					prevType === tokTypes.dot && internal.keyword !== undefined
						? false
						: internal.beforeExpr;
			} else if (type === tokTypes.parenR || type === tokTypes.braceR) {
				// parenR/braceR.updateContext, inlined
				const context = this.context;
				if (context.length === 1) {
					this.exprAllowed = true;
				} else {
					let out = /** @type {TokContextShim} */ (context.pop());
					if (
						out === CTX_B_STAT &&
						/** @type {TokContextShim} */ (context[context.length - 1])
							.token === "function"
					) {
						out = /** @type {TokContextShim} */ (context.pop());
					}
					this.exprAllowed = !out.isExpr;
				}
			} else if (type === tokTypes.braceL) {
				// braceL.updateContext, inlined
				this.context.push(
					this.braceIsBlock(prevType) ? CTX_B_STAT : CTX_B_EXPR
				);
				this.exprAllowed = true;
			} else if (type === tokTypes.parenL) {
				// parenL.updateContext, inlined
				const statementParens =
					prevType === tokTypes._if ||
					prevType === tokTypes._for ||
					prevType === tokTypes._with ||
					prevType === tokTypes._while;
				this.context.push(statementParens ? CTX_P_STAT : CTX_P_EXPR);
				this.exprAllowed = true;
			} else if (internal.keyword !== undefined && prevType === tokTypes.dot) {
				// `.function` etc.: keyword-after-dot wins over the type's own hook
				this.exprAllowed = false;
			} else {
				update.call(this, prevType);
			}
		}
	}

	/**
	 * Owned `braceIsBlock`, acorn's verbatim except the line-terminator probe:
	 * acorn slices the inter-token gap and runs a regexp; `_gapHasNewline`
	 * answers from the tokenizer's newline flag (scanning only when unknown).
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokencontext.js
	 * @param {TokenType} prevType type of the previous token
	 * @returns {boolean} whether a `{` opens a block in this context
	 * @this {ParserInternals}
	 */
	braceIsBlock(prevType) {
		const context = this.context;
		const parent = /** @type {TokContextShim} */ (context[context.length - 1]);
		if (parent === CTX_F_EXPR || parent === CTX_F_STAT) return true;
		if (
			prevType === tokTypes.colon &&
			(parent === CTX_B_STAT || parent === CTX_B_EXPR)
		) {
			return !parent.isExpr;
		}
		// after `return`, or after `yield`/`of` (name with exprAllowed), a line
		// terminator decides between block and expression
		if (
			prevType === tokTypes._return ||
			(prevType === tokTypes.name && this.exprAllowed)
		) {
			return this._gapHasNewline();
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
		if (prevType === tokTypes.braceL) return parent === CTX_B_STAT;
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
	 * Allocation-free mirror of acorn's `skipWhiteSpace` regexp: advances over
	 * whitespace and comments from `pos` without touching tokenizer state,
	 * flagging line terminators (including inside block comments) in
	 * `_scanGapNewline`. An unterminated block comment stops the scan, exactly
	 * like the regexp.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/whitespace.js
	 * @param {number} pos scan start offset
	 * @returns {number} offset of the first char past the gap
	 * @this {ParserInternals}
	 */
	_scanGap(pos) {
		const input = this.input;
		const len = input.length;
		let newline = false;
		while (pos < len) {
			const ch = input.charCodeAt(pos);
			if (ch === 32 || ch === 9 || ch === 11 || ch === 12 || ch === 160) {
				pos++;
			} else if (ch === 10 || ch === 13 || ch === 0x2028 || ch === 0x2029) {
				newline = true;
				pos++;
			} else if (ch === 47) {
				const next = input.charCodeAt(pos + 1);
				if (next === 47) {
					pos += 2;
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
				} else if (next === 42) {
					const end = input.indexOf("*/", pos + 2);
					if (end === -1) break;
					if (!newline) {
						for (let i = pos + 2; i < end; i++) {
							const commentCh = input.charCodeAt(i);
							if (
								commentCh === 10 ||
								commentCh === 13 ||
								commentCh === 0x2028 ||
								commentCh === 0x2029
							) {
								newline = true;
								break;
							}
						}
					}
					pos = end + 2;
				} else {
					break;
				}
			} else if (
				ch >= 5760 &&
				nonASCIIwhitespace.test(String.fromCharCode(ch))
			) {
				pos++;
			} else {
				break;
			}
		}
		this._scanGapNewline = newline;
		return pos;
	}

	/**
	 * Owned `isLet`: acorn's lookahead runs `skipWhiteSpace.exec` (a match
	 * array plus matched-substring allocation) and slices the trailing
	 * identifier; the scan helper and charCode compares do neither.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {string | null=} context statement context
	 * @returns {boolean} whether `let` heads a lexical declaration here
	 * @this {ParserInternals}
	 */
	isLet(context) {
		if (this._ecmaVersion < 6 || !this.isContextual("let")) return false;
		let next = this._scanGap(this.pos);
		let nextCh = this.fullCharCodeAt(next);
		// `let [` is an explicit negative lookahead for ExpressionStatement
		if (nextCh === 91 || nextCh === 92) return true; // '[', '\'
		if (context) return false;
		if (nextCh === 123) return true; // '{'
		if (isIdentifierStart(nextCh)) {
			const start = next;
			do {
				next += nextCh <= 0xffff ? 1 : 2;
			} while (isIdentifierChar((nextCh = this.fullCharCodeAt(next))));
			if (nextCh === 92) return true;
			if (!isRelationalKeyword(this.input, start, next)) return true;
		}
		return false;
	}

	/**
	 * Owned `isAsyncFunction` (`async [no LineTerminator here] function`),
	 * allocation-free like `isLet`.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @returns {boolean} whether `async` heads an async function here
	 * @this {ParserInternals}
	 */
	isAsyncFunction() {
		if (this._ecmaVersion < 8 || !this.isContextual("async")) return false;
		const input = this.input;
		const next = this._scanGap(this.pos);
		if (this._scanGapNewline || !input.startsWith("function", next)) {
			return false;
		}
		if (next + 8 === input.length) return true;
		const after = this.fullCharCodeAt(next + 8);
		return !(isIdentifierChar(after) || after === 92);
	}

	/**
	 * Owned `isUsingKeyword` (backing `isUsing`/`isAwaitUsing`, which acorn
	 * dispatches here), allocation-free like `isLet`.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {boolean} isAwaitUsing whether checking `await using`
	 * @param {boolean=} isFor whether in a `for` head
	 * @returns {boolean} whether a `using` declaration starts here
	 * @this {ParserInternals}
	 */
	isUsingKeyword(isAwaitUsing, isFor) {
		if (
			this._ecmaVersion < 17 ||
			!this.isContextual(isAwaitUsing ? "await" : "using")
		) {
			return false;
		}
		const input = this.input;
		let next = this._scanGap(this.pos);
		if (this._scanGapNewline) return false;
		if (isAwaitUsing) {
			const usingEndPos = next + 5;
			let after;
			if (
				!input.startsWith("using", next) ||
				usingEndPos === input.length ||
				isIdentifierChar((after = this.fullCharCodeAt(usingEndPos))) ||
				after === 92
			) {
				return false;
			}
			next = this._scanGap(usingEndPos);
			if (this._scanGapNewline) return false;
		}
		let ch = this.fullCharCodeAt(next);
		if (!isIdentifierStart(ch) && ch !== 92) return false;
		const idStart = next;
		do {
			next += ch <= 0xffff ? 1 : 2;
		} while (isIdentifierChar((ch = this.fullCharCodeAt(next))));
		if (ch === 92) return true;
		if (isRelationalKeyword(input, idStart, next)) return false;
		if (
			isFor &&
			!isAwaitUsing &&
			next - idStart === 2 &&
			input.charCodeAt(idStart) === 111 &&
			input.charCodeAt(idStart + 1) === 102
		) {
			// `for (using of …)`: only an initializer keeps it a declaration
			next = this._scanGap(next);
			if (
				input.charCodeAt(next) !== 61 ||
				(ch = input.charCodeAt(next + 1)) === 61 ||
				ch === 62
			) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Whether the gap before the current token holds a line terminator, served
	 * from the owned tokenizer's flag when known.
	 * @returns {boolean} whether a line terminator precedes the current token
	 * @this {ParserInternals}
	 */
	_gapHasNewline() {
		const newlineBefore = this._newlineBefore;
		if (newlineBefore !== 2) return newlineBefore === 1;
		const input = this.input;
		const end = this.start;
		for (let i = this.lastTokEnd; i < end; i++) {
			const ch = input.charCodeAt(i);
			// LF, CR, LS, PS — acorn's `lineBreak` alternation
			if (ch === 10 || ch === 13 || ch === 0x2028 || ch === 0x2029) {
				// memoize: the gap is fixed until the next token is read, and
				// `nextToken` rewrites the flag — ASI probes often repeat per token
				// (e.g. name atoms behind a /*#__PURE__*/ comment)
				this._newlineBefore = 1;
				return true;
			}
		}
		this._newlineBefore = 0;
		return false;
	}

	/**
	 * Owned per-token advance: acorn's `next` writes `lastTokEndLoc`/
	 * `lastTokStartLoc` and probes `options.onToken` on every token, both dead in
	 * `_tokenFastPath` mode (locations off, no token stream), leaving only the
	 * two offset writes and the keyword-escape guard. Other modes use acorn's.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @param {boolean=} ignoreEscapeSequenceInKeyword whether an escape in a keyword is allowed here
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	next(ignoreEscapeSequenceInKeyword) {
		if (!this._tokenFastPath) {
			return base.next.call(this, ignoreEscapeSequenceInKeyword);
		}
		const type = this.type;
		// `containsEsc` is a parser field and almost always false; testing it first
		// keeps the TokenType load off the common path.
		if (this.containsEsc && !ignoreEscapeSequenceInKeyword && type.keyword) {
			this.raiseRecoverable(
				this.start,
				`Escape sequence in keyword ${type.keyword}`
			);
		}
		this.lastTokEnd = this.end;
		this.lastTokStart = this.start;
		this.nextToken();
	}

	/**
	 * Owned `finishOp`: acorn slices the operator text out of the source for
	 * every operator token, allocating a fresh 2-4 char string per `=>`, `===`,
	 * `&&` etc. Serve those from `OP_CACHE` instead; single-char operators keep
	 * the direct slice, which V8 serves from its single-character table.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @param {TokenType} type token type
	 * @param {number} size operator length
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	finishOp(type, size) {
		const pos = this.pos;
		const input = this.input;
		if (size === 1) {
			this.pos = pos + 1;
			return this.finishToken(type, input.slice(pos, pos + 1));
		}
		let key = input.charCodeAt(pos) | (input.charCodeAt(pos + 1) << 7);
		if (size > 2) {
			key |= input.charCodeAt(pos + 2) << 14;
			if (size > 3) key |= input.charCodeAt(pos + 3) << 21;
		}
		let str = OP_CACHE.get(key);
		if (str === undefined) {
			str = input.slice(pos, pos + size);
			OP_CACHE.set(key, str);
		}
		this.pos = pos + size;
		return this.finishToken(type, str);
	}

	/**
	 * Owned `getTokenFromCode`: acorn dispatches operators through per-family
	 * `readToken_*` methods that each end in `finishOp`'s source slice. Resolve
	 * every operator by direct char peeks to a static string instead (yuku's
	 * `scanPunctuation`) — no method chain, no slice, no `OP_CACHE` probe. The
	 * HTML-comment forms (`<!--`, `-->`) inline acorn's line-comment handling;
	 * `#` and unknown chars use the owned cold reader.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @param {number} code current char code
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	getTokenFromCode(code) {
		if (!this._fullTokenFastPath) {
			return base.getTokenFromCode.call(this, code);
		}
		const input = this.input;
		const pos = this.pos;
		switch (code) {
			case 46: {
				// '.': number, ellipsis or plain dot
				const next = input.charCodeAt(pos + 1);
				if (next >= 48 && next <= 57) return this.readNumber(true);
				if (next === 46 && input.charCodeAt(pos + 2) === 46) {
					this.pos = pos + 3;
					return this.finishToken(tokTypes.ellipsis);
				}
				this.pos = pos + 1;
				return this.finishToken(tokTypes.dot);
			}
			case 47: {
				// '/': regexp in expression position, otherwise /= or /
				if (this.exprAllowed) {
					this.pos = pos + 1;
					return this.readRegexp();
				}
				if (input.charCodeAt(pos + 1) === 61) {
					this.pos = pos + 2;
					return this.finishToken(tokTypes.assign, "/=");
				}
				this.pos = pos + 1;
				return this.finishToken(tokTypes.slash, "/");
			}
			case 37: {
				// '%': %= or %
				if (input.charCodeAt(pos + 1) === 61) {
					this.pos = pos + 2;
					return this.finishToken(tokTypes.assign, "%=");
				}
				this.pos = pos + 1;
				return this.finishToken(tokTypes.modulo, "%");
			}
			case 42: {
				// '*': **=, **, *= or *
				const next = input.charCodeAt(pos + 1);
				if (next === 42) {
					if (input.charCodeAt(pos + 2) === 61) {
						this.pos = pos + 3;
						return this.finishToken(tokTypes.assign, "**=");
					}
					this.pos = pos + 2;
					return this.finishToken(tokTypes.starstar, "**");
				}
				if (next === 61) {
					this.pos = pos + 2;
					return this.finishToken(tokTypes.assign, "*=");
				}
				this.pos = pos + 1;
				return this.finishToken(tokTypes.star, "*");
			}
			case 124: {
				// '|': ||=, ||, |= or |
				const next = input.charCodeAt(pos + 1);
				if (next === 124) {
					if (input.charCodeAt(pos + 2) === 61) {
						this.pos = pos + 3;
						return this.finishToken(tokTypes.assign, "||=");
					}
					this.pos = pos + 2;
					return this.finishToken(tokTypes.logicalOR, "||");
				}
				if (next === 61) {
					this.pos = pos + 2;
					return this.finishToken(tokTypes.assign, "|=");
				}
				this.pos = pos + 1;
				return this.finishToken(tokTypes.bitwiseOR, "|");
			}
			case 38: {
				// '&': &&=, &&, &= or &
				const next = input.charCodeAt(pos + 1);
				if (next === 38) {
					if (input.charCodeAt(pos + 2) === 61) {
						this.pos = pos + 3;
						return this.finishToken(tokTypes.assign, "&&=");
					}
					this.pos = pos + 2;
					return this.finishToken(tokTypes.logicalAND, "&&");
				}
				if (next === 61) {
					this.pos = pos + 2;
					return this.finishToken(tokTypes.assign, "&=");
				}
				this.pos = pos + 1;
				return this.finishToken(tokTypes.bitwiseAND, "&");
			}
			case 94: {
				// '^': ^= or ^
				if (input.charCodeAt(pos + 1) === 61) {
					this.pos = pos + 2;
					return this.finishToken(tokTypes.assign, "^=");
				}
				this.pos = pos + 1;
				return this.finishToken(tokTypes.bitwiseXOR, "^");
			}
			case 43: {
				// '+': ++, += or +
				const next = input.charCodeAt(pos + 1);
				if (next === 43) {
					this.pos = pos + 2;
					return this.finishToken(tokTypes.incDec, "++");
				}
				if (next === 61) {
					this.pos = pos + 2;
					return this.finishToken(tokTypes.assign, "+=");
				}
				this.pos = pos + 1;
				return this.finishToken(tokTypes.plusMin, "+");
			}
			case 45: {
				// '-': --, -= or -; `-->` may open an HTML line comment
				const next = input.charCodeAt(pos + 1);
				if (next === 45) {
					// `-->` opens an HTML line comment only at the start of a line
					// (acorn readToken_plus_min): https://github.com/acornjs/acorn/blob/8.15.0/acorn/src/tokenize.js#L599-L618
					if (
						input.charCodeAt(pos + 2) === 62 &&
						!this.inModule &&
						(this.lastTokEnd === 0 ||
							lineBreak.test(input.slice(this.lastTokEnd, pos)))
					) {
						this.skipLineComment(3);
						this.skipSpace();
						return this.nextToken();
					}
					this.pos = pos + 2;
					return this.finishToken(tokTypes.incDec, "--");
				}
				if (next === 61) {
					this.pos = pos + 2;
					return this.finishToken(tokTypes.assign, "-=");
				}
				this.pos = pos + 1;
				return this.finishToken(tokTypes.plusMin, "-");
			}
			case 60: {
				// '<': <<=, <<, <= or <; `<!--` opens an HTML line comment
				const next = input.charCodeAt(pos + 1);
				if (next === 60) {
					if (input.charCodeAt(pos + 2) === 61) {
						this.pos = pos + 3;
						return this.finishToken(tokTypes.assign, "<<=");
					}
					this.pos = pos + 2;
					return this.finishToken(tokTypes.bitShift, "<<");
				}
				if (
					next === 33 &&
					!this.inModule &&
					input.charCodeAt(pos + 2) === 45 &&
					input.charCodeAt(pos + 3) === 45
				) {
					// `<!--` opens an HTML line comment (acorn readToken_lt_gt):
					// https://github.com/acornjs/acorn/blob/8.15.0/acorn/src/tokenize.js#L620-L649
					this.skipLineComment(4);
					this.skipSpace();
					return this.nextToken();
				}
				if (next === 61) {
					this.pos = pos + 2;
					return this.finishToken(tokTypes.relational, "<=");
				}
				this.pos = pos + 1;
				return this.finishToken(tokTypes.relational, "<");
			}
			case 62: {
				// '>': >>>=, >>>, >>=, >>, >= or >
				const next = input.charCodeAt(pos + 1);
				if (next === 62) {
					if (input.charCodeAt(pos + 2) === 62) {
						if (input.charCodeAt(pos + 3) === 61) {
							this.pos = pos + 4;
							return this.finishToken(tokTypes.assign, ">>>=");
						}
						this.pos = pos + 3;
						return this.finishToken(tokTypes.bitShift, ">>>");
					}
					if (input.charCodeAt(pos + 2) === 61) {
						this.pos = pos + 3;
						return this.finishToken(tokTypes.assign, ">>=");
					}
					this.pos = pos + 2;
					return this.finishToken(tokTypes.bitShift, ">>");
				}
				if (next === 61) {
					this.pos = pos + 2;
					return this.finishToken(tokTypes.relational, ">=");
				}
				this.pos = pos + 1;
				return this.finishToken(tokTypes.relational, ">");
			}
			case 61: {
				// '=': ===, ==, => or =
				const next = input.charCodeAt(pos + 1);
				if (next === 61) {
					if (input.charCodeAt(pos + 2) === 61) {
						this.pos = pos + 3;
						return this.finishToken(tokTypes.equality, "===");
					}
					this.pos = pos + 2;
					return this.finishToken(tokTypes.equality, "==");
				}
				if (next === 62) {
					this.pos = pos + 2;
					return this.finishToken(tokTypes.arrow);
				}
				this.pos = pos + 1;
				return this.finishToken(tokTypes.eq, "=");
			}
			case 33: {
				// '!': !==, != or !
				const next = input.charCodeAt(pos + 1);
				if (next === 61) {
					if (input.charCodeAt(pos + 2) === 61) {
						this.pos = pos + 3;
						return this.finishToken(tokTypes.equality, "!==");
					}
					this.pos = pos + 2;
					return this.finishToken(tokTypes.equality, "!=");
				}
				this.pos = pos + 1;
				return this.finishToken(tokTypes.prefix, "!");
			}
			case 63: {
				// '?': ?. (not before a digit), ??=, ?? or ?
				const next = input.charCodeAt(pos + 1);
				if (next === 46) {
					const next2 = input.charCodeAt(pos + 2);
					if (next2 < 48 || next2 > 57) {
						this.pos = pos + 2;
						return this.finishToken(tokTypes.questionDot, "?.");
					}
				}
				if (next === 63) {
					if (input.charCodeAt(pos + 2) === 61) {
						this.pos = pos + 3;
						return this.finishToken(tokTypes.assign, "??=");
					}
					this.pos = pos + 2;
					return this.finishToken(tokTypes.coalesce, "??");
				}
				this.pos = pos + 1;
				return this.finishToken(tokTypes.question, "?");
			}
			case 126: {
				// '~'
				this.pos = pos + 1;
				return this.finishToken(tokTypes.prefix, "~");
			}
			case 96: {
				// '`'
				this.pos = pos + 1;
				return this.finishToken(tokTypes.backQuote);
			}
			case 48: {
				// '0': radix literals split off before the decimal reader
				const next = input.charCodeAt(pos + 1);
				if (next === 120 || next === 88) return this._readRadixNumber(16);
				if (next === 111 || next === 79) return this._readRadixNumber(8);
				if (next === 98 || next === 66) return this._readRadixNumber(2);
				return this.readNumber(false);
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
				return this.readNumber(false);
			case 34:
			case 39:
				return this.readString(code);
			default:
				return this._getUnknownOrPrivate(code);
		}
	}

	/**
	 * ASCII fast path for acorn's `readWord1`, which pays a surrogate-aware
	 * method call and a range-check helper per character. Escapes, non-ASCII
	 * and astral input restart the owned cold reader from the word start.
	 * Words are deduplicated through `WORD_CACHE` so repeated identifiers —
	 * which dominate real code — reuse one string instead of slicing a fresh
	 * one per occurrence; sharing also keeps their cached string hashes warm
	 * for the keyword/scope Map lookups downstream.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @this {ParserInternals}
	 * @returns {string} the word
	 */
	readWord1() {
		const input = this.input;
		const start = this.pos;
		const len = input.length;
		// djb2-style hash folded into the scan loop (yuku scans each lexeme in
		// one pass); computing it for the rare over-long words is cheaper than
		// re-walking every word in a second pass
		let hash = 0;
		let pos = start;
		while (pos < len) {
			const ch = input.charCodeAt(pos);
			if (ch < 128) {
				if (IDENT_CHAR[ch] === 0) {
					// backslash escape: restart cold so escape rules see the word
					if (ch === 92) return this._readWord1Cold();
					break;
				}
				hash = (Math.imul(hash, 33) + ch) | 0;
				pos++;
			} else {
				return this._readWord1Cold();
			}
		}
		this.containsEsc = false;
		this.pos = pos;
		const wordLen = pos - start;
		// Single-char words skip the cache (V8 serves those slices from its
		// single-character table without allocating); long words skip it too.
		if (wordLen >= 2 && wordLen <= WORD_CACHE_MAX_LEN) {
			const slot = hash & WORD_CACHE_MASK;
			const cached = WORD_CACHE[slot];
			if (
				cached !== null &&
				cached.length === wordLen &&
				// length already matched, so a prefix test is an exact compare —
				// one builtin instead of a charCodeAt loop per cached character
				input.startsWith(cached, start)
			) {
				return cached;
			}
			const word = input.slice(start, pos);
			WORD_CACHE[slot] = word;
			WORD_TYPE_OWNERS[slot] = 0;
			return word;
		}
		return input.slice(start, pos);
	}

	/**
	 * String fast path: one scan finds the closing quote and cooks the common
	 * single-char escapes (`\n \t \\ \" \'` …) and line continuations inline.
	 * Hex/unicode/octal escapes (`\x`, `\u`, `\0`-`\9`) restart the owned cold
	 * reader, which owns their readers and strict-mode errors; old ecmaVersions
	 * (LS/PS terminate strings there) and location tracking use acorn's own.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @this {ParserInternals}
	 * @param {number} quote quote char code
	 * @returns {void}
	 */
	readString(quote) {
		if (!this._noLocations || this._ecmaVersion < 10) {
			return base.readString.call(this, quote);
		}
		const input = this.input;
		const len = input.length;
		const quotePos = this.pos;
		const start = quotePos + 1;
		let pos = start;
		// spans between escapes accumulate here; a plain string never touches
		// `out` and slices once at the end
		let out = "";
		let chunkStart = start;
		for (;;) {
			if (pos >= len) this.raise(this.start, "Unterminated string constant");
			const ch = input.charCodeAt(pos);
			if (ch === quote) break;
			if (ch === 92) {
				const esc = input.charCodeAt(pos + 1);
				// hex/unicode/octal escapes (and a trailing `\`) need the cold
				// reader's escape handling; restart from the quote (this.pos unmoved)
				if (
					pos + 1 >= len ||
					esc === 120 ||
					esc === 117 ||
					(esc >= 48 && esc <= 57)
				) {
					this.pos = quotePos;
					return this._readStringCold(quote);
				}
				let rep;
				let advance = 2;
				switch (esc) {
					case 110:
						rep = "\n";
						break;
					case 114:
						rep = "\r";
						break;
					case 116:
						rep = "\t";
						break;
					case 98:
						rep = "\b";
						break;
					case 102:
						rep = "\f";
						break;
					case 118:
						rep = "\u000B";
						break;
					case 13:
						// `\` + CR(LF): line continuation cooked away
						rep = "";
						if (input.charCodeAt(pos + 2) === 10) advance = 3;
						break;
					case 10:
					case 0x2028:
					case 0x2029:
						rep = "";
						break;
					default:
						// any other escape is the escaped code unit verbatim (`\\`, `\q`)
						rep = input[pos + 1];
				}
				out += input.slice(chunkStart, pos) + rep;
				pos += advance;
				chunkStart = pos;
			} else if (ch === 10 || ch === 13) {
				// bare LF/CR is unterminated; LS/PS stay valid at ES2019+
				this.raise(this.start, "Unterminated string constant");
			} else {
				pos++;
			}
		}
		this.pos = pos + 1;
		if (chunkStart === start) {
			const len = pos - start;
			return this.finishToken(
				tokTypes.string,
				len >= 2 && len <= SLICE_CACHE_MAX_LEN
					? getShortSlice(input, start, pos)
					: input.slice(start, pos)
			);
		}
		this.finishToken(tokTypes.string, out + input.slice(chunkStart, pos));
	}

	/**
	 * Number fast path: plain integer literals (no leading zero, up to 15
	 * digits so the float is exact) are accumulated numerically — no slice,
	 * no parseFloat, no separator handling. Everything else (dots, exponents,
	 * bigints, separators, octal forms) restarts the owned cold reader.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @this {ParserInternals}
	 * @param {boolean} startsWithDot whether the number started with a dot
	 * @returns {void}
	 */
	readNumber(startsWithDot) {
		if (startsWithDot) return this._readNumberCold(startsWithDot);
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
				return this._readNumberCold(startsWithDot);
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
					return this._readNumberCold(startsWithDot);
				}
				// 15 digits always fit exactly into a double
				if (pos - start > 15) {
					return this._readNumberCold(startsWithDot);
				}
				this.pos = pos;
				return this.finishToken(tokTypes.num, value);
			}
			// a fraction follows the integer part
		} else {
			return this._readNumberCold(startsWithDot);
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
			return this._readNumberCold(startsWithDot);
		}
		this.pos = pos;
		// the cached slice also pre-warms the slot parseLiteral's raw reuses
		this.finishToken(
			tokTypes.num,
			Number.parseFloat(
				pos - start <= SLICE_CACHE_MAX_LEN
					? getShortSlice(input, start, pos)
					: input.slice(start, pos)
			)
		);
	}

	/**
	 * Owned `strictDirective`: acorn's runs an anchored literal regex over
	 * `this.input.slice(start)` — a fresh sliced string per (sloppy-mode)
	 * function body. Sticky regexes at the offset scan the same grammar with no
	 * slice. Same directive-prologue semantics, including the ASI tail checks.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/parseutil.js
	 * @param {number} start offset of the function body's first statement
	 * @returns {boolean} true when a 'use strict' directive leads the prologue
	 * @this {ParserInternals & { input: string, options: { ecmaVersion: number } }}
	 */
	strictDirective(start) {
		if (/** @type {number} */ (this.options.ecmaVersion) < 5) return false;
		const input = this.input;
		for (;;) {
			// Skip whitespace and comments (acorn's `skipWhiteSpace`, sticky).
			STRICT_SKIP_WS.lastIndex = start;
			start += /** @type {RegExpExecArray} */ (STRICT_SKIP_WS.exec(input))[0]
				.length;
			STRICT_LITERAL.lastIndex = start;
			const match = STRICT_LITERAL.exec(input);
			if (!match) return false;
			if ((match[1] || match[2]) === "use strict") {
				STRICT_SKIP_WS.lastIndex = start + match[0].length;
				const spaceAfter = /** @type {RegExpExecArray} */ (
					STRICT_SKIP_WS.exec(input)
				);
				const end = spaceAfter.index + spaceAfter[0].length;
				const next = input.charAt(end);
				return (
					next === ";" ||
					next === "}" ||
					(STRICT_LINE_BREAK.test(spaceAfter[0]) &&
						!(
							/[(`.[+\-/*%<>=,?^&]/.test(next) ||
							(next === "!" && input.charAt(end + 1) === "=")
						))
				);
			}
			start += match[0].length;

			// Skip semicolon, if any.
			STRICT_SKIP_WS.lastIndex = start;
			start += /** @type {RegExpExecArray} */ (STRICT_SKIP_WS.exec(input))[0]
				.length;
			if (input[start] === ";") start++;
		}
	}

	/**
	 * Template fast path: when the chunk contains no backslash and no CR, the
	 * cooked value is one slice (LF/LS/PS cook to themselves). Escapes and CR
	 * normalization restart the owned cold reader (its exact errors); location
	 * tracking uses acorn's own.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @this {ParserInternals}
	 * @returns {void}
	 */
	readTmplToken() {
		if (!this._noLocations) return base.readTmplToken.call(this);
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
			// backslash and CR need the cooked-string building of the cold reader
			if (ch === 92 || ch === 13) {
				return this._readTmplTokenCold();
			}
			pos++;
		}
		this.raise(this.start, "Unterminated template");
	}

	/**
	 * Fast path for the common run of plain ASCII whitespace; comments and
	 * unicode whitespace use the owned cold reader, location tracking acorn's.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @this {ParserInternals & { pos: number }}
	 * @returns {void}
	 */
	skipSpace() {
		if (!this._noLocations) return base.skipSpace.call(this);
		const input = this.input;
		const len = input.length;
		let pos = this.pos;
		while (pos < len) {
			const ch = input.charCodeAt(pos);
			// 9-13 and 32 cover tab, LF, VT, FF, CR and space
			if (ch === 32 || (ch > 8 && ch < 14)) {
				pos++;
			} else if (ch === 47 || ch > 127) {
				// comments or unicode whitespace: hand off to the cold reader
				this.pos = pos;
				return this._skipSpaceCold();
			} else {
				break;
			}
		}
		this.pos = pos;
	}

	// ----- cold-path readers (ported from acorn's tokenizer, reached only from
	// the lazy fast paths above; non-lazy mode keeps acorn's own prototype
	// methods so plugins that patch them still see acorn's tokenizer) -----

	/**
	 * acorn `readInt`: reads `radix`-base digits (optionally exactly `len` of
	 * them), honoring ES2021 `_` separators.
	 * https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @this {ParserInternals}
	 * @param {number} radix numeric radix
	 * @param {number=} len fixed digit count (for escapes), else read greedily
	 * @param {boolean=} maybeLegacyOctal whether a leading zero disallows separators
	 * @returns {number | null} the integer value, or null when no digits matched
	 */
	_readInt(radix, len, maybeLegacyOctal) {
		const input = this.input;
		const allowSeparators = this._ecmaVersion >= 12 && len === undefined;
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
	 * acorn `readRadixNumber`: `0x`/`0o`/`0b` integer or bigint literals.
	 * https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @this {ParserInternals}
	 * @param {number} radix numeric radix (2/8/16)
	 * @returns {void}
	 */
	_readRadixNumber(radix) {
		const input = this.input;
		const start = this.pos;
		this.pos += 2;
		let val = this._readInt(radix);
		if (val === null) {
			this.raise(this.start + 2, `Expected number in radix ${radix}`);
		}
		if (this._ecmaVersion >= 11 && input.charCodeAt(this.pos) === 110) {
			val = /** @type {EXPECTED_ANY} */ (
				stringToBigInt(input.slice(start, this.pos))
			);
			++this.pos;
		} else if (isIdentifierStart(this.fullCharCodeAtPos())) {
			this.raise(this.pos, "Identifier directly after number");
		}
		return this.finishToken(tokTypes.num, val);
	}

	/**
	 * acorn `readNumber`: decimal/float/legacy-octal/bigint literals (the fast
	 * path handles only plain integers and simple fractions).
	 * https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @this {ParserInternals}
	 * @param {boolean} startsWithDot whether the literal started with `.`
	 * @returns {void}
	 */
	_readNumberCold(startsWithDot) {
		const input = this.input;
		const start = this.pos;
		if (!startsWithDot && this._readInt(10, undefined, true) === null) {
			this.raise(start, "Invalid number");
		}
		let octal = this.pos - start >= 2 && input.charCodeAt(start) === 48;
		if (octal && this.strict) this.raise(start, "Invalid number");
		let next = input.charCodeAt(this.pos);
		if (!octal && !startsWithDot && this._ecmaVersion >= 11 && next === 110) {
			const val = stringToBigInt(input.slice(start, this.pos));
			++this.pos;
			if (isIdentifierStart(this.fullCharCodeAtPos())) {
				this.raise(this.pos, "Identifier directly after number");
			}
			return this.finishToken(tokTypes.num, /** @type {EXPECTED_ANY} */ (val));
		}
		if (octal && /[89]/.test(input.slice(start, this.pos))) octal = false;
		if (next === 46 && !octal) {
			++this.pos;
			this._readInt(10);
			next = input.charCodeAt(this.pos);
		}
		if ((next === 69 || next === 101) && !octal) {
			next = input.charCodeAt(++this.pos);
			if (next === 43 || next === 45) ++this.pos;
			if (this._readInt(10) === null) this.raise(start, "Invalid number");
		}
		if (isIdentifierStart(this.fullCharCodeAtPos())) {
			this.raise(this.pos, "Identifier directly after number");
		}
		const val = stringToNumber(input.slice(start, this.pos), octal);
		return this.finishToken(tokTypes.num, val);
	}

	/**
	 * acorn `readCodePoint`: a `\u{...}` or `\uXXXX` escape.
	 * https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @this {ParserInternals}
	 * @returns {number} the escaped code point
	 */
	_readCodePoint() {
		const input = this.input;
		const ch = input.charCodeAt(this.pos);
		let code;
		if (ch === 123) {
			if (this._ecmaVersion < 6) this.unexpected();
			const codePos = ++this.pos;
			code = this._readHexChar(input.indexOf("}", this.pos) - this.pos);
			++this.pos;
			if (code > 0x10ffff) {
				this.invalidStringToken(codePos, "Code point out of bounds");
			}
		} else {
			code = this._readHexChar(4);
		}
		return code;
	}

	/**
	 * acorn `readHexChar`: exactly `len` hex digits.
	 * https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @this {ParserInternals}
	 * @param {number} len number of hex digits
	 * @returns {number} the parsed code
	 */
	_readHexChar(len) {
		const codePos = this.pos;
		const n = this._readInt(16, len);
		if (n === null) {
			this.invalidStringToken(codePos, "Bad character escape sequence");
		}
		return /** @type {number} */ (n);
	}

	/**
	 * acorn `readString`: the escape-bearing string reader (the fast path cooks
	 * only the common single-char escapes inline).
	 * https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @this {ParserInternals}
	 * @param {number} quote quote char code
	 * @returns {void}
	 */
	_readStringCold(quote) {
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
				out += this._readEscapedChar(false);
				chunkStart = this.pos;
			} else if (ch === 0x2028 || ch === 0x2029) {
				if (this._ecmaVersion < 10) {
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
		return this.finishToken(tokTypes.string, out);
	}

	/**
	 * acorn `readTmplToken`: the escape/CR-normalizing template reader. Invalid
	 * escapes throw acorn's sentinel via `invalidStringToken`, which acorn's own
	 * `tryReadTemplateToken` (not overridden here) catches to re-read raw.
	 * https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @this {ParserInternals}
	 * @returns {void}
	 */
	_readTmplTokenCold() {
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
					(this.type === tokTypes.template ||
						this.type === tokTypes.invalidTemplate)
				) {
					if (ch === 36) {
						this.pos += 2;
						return this.finishToken(tokTypes.dollarBraceL);
					}
					++this.pos;
					return this.finishToken(tokTypes.backQuote);
				}
				out += input.slice(chunkStart, this.pos);
				return this.finishToken(tokTypes.template, out);
			}
			if (ch === 92) {
				out += input.slice(chunkStart, this.pos);
				out += this._readEscapedChar(true);
				chunkStart = this.pos;
			} else if (isNewLine(ch)) {
				out += input.slice(chunkStart, this.pos);
				++this.pos;
				// only CR(LF) cooks to "\n"; LS/PS cook to themselves
				if (ch === 13) {
					if (input.charCodeAt(this.pos) === 10) ++this.pos;
					out += "\n";
				} else if (ch === 10) {
					out += "\n";
				} else {
					out += String.fromCharCode(ch);
				}
				chunkStart = this.pos;
			} else {
				++this.pos;
			}
		}
	}

	/**
	 * acorn `readEscapedChar`: cooks one backslash escape in a string/template.
	 * https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @this {ParserInternals}
	 * @param {boolean} inTemplate whether the escape is in a template literal
	 * @returns {string} the cooked replacement (may be `""`)
	 */
	_readEscapedChar(inTemplate) {
		const input = this.input;
		let ch = input.charCodeAt(++this.pos);
		++this.pos;
		switch (ch) {
			case 110:
				return "\n";
			case 114:
				return "\r";
			case 120:
				return String.fromCharCode(this._readHexChar(2));
			case 117:
				return codePointToString(this._readCodePoint());
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

	/**
	 * acorn `readWord1`: the escape-/astral-aware identifier reader (the fast
	 * path handles pure-ASCII words).
	 * https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @this {ParserInternals}
	 * @returns {string} the (possibly escape-cooked) word
	 */
	_readWord1Cold() {
		const input = this.input;
		this.containsEsc = false;
		let word = "";
		let first = true;
		let chunkStart = this.pos;
		const astral = this._ecmaVersion >= 6;
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
				const esc = this._readCodePoint();
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
	 * acorn `skipSpace` (location-free): unicode whitespace and comments. Only
	 * reached from the lazy fast paths, which keep no line bookkeeping.
	 * https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @this {ParserInternals}
	 * @returns {void}
	 */
	_skipSpaceCold() {
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

	/**
	 * acorn `readToken_numberSign` plus `getTokenFromCode`'s default: a private
	 * identifier (`#x`) or an unexpected-character error.
	 * https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @this {ParserInternals}
	 * @param {number} code current char code
	 * @returns {void}
	 */
	_getUnknownOrPrivate(code) {
		if (code === 35 && this._ecmaVersion >= 13) {
			++this.pos;
			const next = this.fullCharCodeAtPos();
			if (isIdentifierStart(next, true) || next === 92) {
				return this.finishToken(tokTypes.privateId, this.readWord1());
			}
			this.raise(this.pos, `Unexpected character '${codePointToString(next)}'`);
		}
		this.raise(this.pos, `Unexpected character '${codePointToString(code)}'`);
	}

	// ----- word classification (Map/Set lookups, replaces acorn's regexps) -----

	/**
	 * Replaces acorn's `readWord`: `readWord1`'s ASCII fast path inlined so the
	 * token type can be memoized per `WORD_CACHE` slot (classification is pure in
	 * the word and the per-option keyword set) — a cache hit serves the type by
	 * identity compare instead of a keywords Map probe.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @this {ParserInternals}
	 * @returns {void}
	 */
	readWord() {
		const input = this.input;
		const start = this.pos;
		const len = input.length;
		let hash = 0;
		let pos = start;
		while (pos < len) {
			const ch = input.charCodeAt(pos);
			if (ch < 128) {
				if (IDENT_CHAR[ch] === 0) {
					// backslash escape: restart cold so escape rules see the word
					if (ch === 92) return this._finishWordSlow(this._readWord1Cold());
					break;
				}
				hash = (Math.imul(hash, 33) + ch) | 0;
				pos++;
			} else {
				return this._finishWordSlow(this._readWord1Cold());
			}
		}
		this.containsEsc = false;
		this.pos = pos;
		const wordLen = pos - start;
		if (wordLen >= 2 && wordLen <= WORD_CACHE_MAX_LEN) {
			const slot = hash & WORD_CACHE_MASK;
			const lookups = this._wordLookups;
			const owner = lookups.id;
			const cached = WORD_CACHE[slot];
			/** @type {string} */
			let word;
			/** @type {TokenType} */
			let type;
			if (
				cached !== null &&
				cached.length === wordLen &&
				// length already matched, so a prefix test is an exact compare —
				// one builtin instead of a charCodeAt loop per cached character
				input.startsWith(cached, start)
			) {
				word = cached;
				if (WORD_TYPE_OWNERS[slot] === owner) {
					type = /** @type {TokenType} */ (WORD_TYPES[slot]);
				} else {
					type = classifyWord(cached, lookups.keywords);
					WORD_TYPES[slot] = type;
					WORD_TYPE_OWNERS[slot] = owner;
				}
			} else {
				word = input.slice(start, pos);
				WORD_CACHE[slot] = word;
				type = classifyWord(word, lookups.keywords);
				WORD_TYPES[slot] = type;
				WORD_TYPE_OWNERS[slot] = owner;
			}
			if (type === tokTypes.name && this._inlineFinish) {
				// finishToken(name) inlined: offset/type/value stores plus
				// name.updateContext (as in the owned finishToken)
				this.end = pos;
				const prevType = this.type;
				this.type = type;
				this.value = word;
				this.exprAllowed =
					((word === "of" && !this.exprAllowed) ||
						(word === "yield" && this.inGeneratorContext())) &&
					prevType !== tokTypes.dot &&
					this._ecmaVersion >= 6;
				return;
			}
			return this.finishToken(type, word);
		}
		// Every keyword is 2-10 chars, so a word outside the cacheable range is a
		// plain name and can be neither `of` nor `yield`.
		if (this._inlineFinish) {
			this.end = pos;
			this.type = tokTypes.name;
			this.value = input.slice(start, pos);
			this.exprAllowed = false;
			return;
		}
		return this._finishWordSlow(input.slice(start, pos));
	}

	/**
	 * Uncached tail of `readWord`: escaped/non-ASCII, 1-char and over-long words.
	 * @this {ParserInternals}
	 * @param {string} word the word
	 * @returns {void}
	 */
	_finishWordSlow(word) {
		this.finishToken(classifyWord(word, this._wordLookups.keywords), word);
	}

	/**
	 * Mirror of acorn's `checkUnreserved` with its two per-identifier regexp
	 * tests (`keywords` and `reservedWords`/`reservedWordsStrict`) folded into a
	 * single `reservedKinds` lookup — one hash probe instead of two, and the
	 * common plain identifier misses it and returns. Branches and error
	 * messages match acorn exactly.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {Identifier} ref identifier node
	 * @this {ParserInternals}
	 */
	checkUnreserved(ref) {
		const { start, end, name } = ref;
		// a string-literal module export name lands here (`export { "x" }`);
		// acorn no-ops on it — no keyword or reserved set contains a non-string
		if (typeof name !== "string") return;
		// every reserved word and special name below is short lowercase ASCII, so
		// most identifiers exit on this shape gate before any string compare
		// (`yield`/`await`/`arguments` all pass it: lengths 5/5/9 ≤ reservedMaxLen,
		// which keywords like `instanceof` keep at ≥ 10)
		const lookups = this._wordLookups;
		const nameLen = name.length;
		if (nameLen < 2 || nameLen > lookups.reservedMaxLen) return;
		const firstCC = name.charCodeAt(0);
		if (firstCC < 97 || firstCC > 122) return;
		// name-first ordering: acorn's `inGenerator`/`inAsync` are getters that
		// walk the scope stack, so gate them behind the cheap string compare —
		// a plain identifier never triggers them
		if (name === "yield" && this.inGenerator) {
			this.raiseRecoverable(
				start,
				"Cannot use 'yield' as identifier inside a generator"
			);
		} else if (name === "await" && this.inAsync) {
			this.raiseRecoverable(
				start,
				"Cannot use 'await' as identifier inside an async function"
			);
		}
		if (name === "arguments" && !(this.currentThisScope().flags & SCOPE_VAR)) {
			this.raiseRecoverable(
				start,
				"Cannot use 'arguments' in class field initializer"
			);
		}
		if ((name === "arguments" || name === "await") && this.inClassStaticBlock) {
			this.raise(
				start,
				`Cannot use ${name} in class static initialization block`
			);
		}
		const kind = lookups.reservedKinds.get(name);
		if (kind === undefined) return;
		if (kind === 1) {
			this.raise(start, `Unexpected keyword '${name}'`);
		}
		if (
			/** @type {number} */ (this.options.ecmaVersion) < 6 &&
			this.input.slice(start, end).includes("\\")
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
	 * Owned `checkLValSimple`, an exact-semantics copy of acorn 8's with the
	 * strict-bind probe inlined: the constructor-installed Set stand-in is one
	 * `has` behind a length gate instead of a closure call per checked name.
	 * A runtime-replaced `reservedWordsStrictBind` falls back to `.test()`.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/lval.js
	 * @param {Node} expr assignment/binding target
	 * @param {number=} bindingType acorn BIND_* binding type
	 * @param {Record<string, boolean> | false | null=} checkClashes param-name clash record
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	checkLValSimple(expr, bindingType, checkClashes) {
		if (bindingType === undefined) bindingType = BIND_NONE;
		const isBind = bindingType !== BIND_NONE;
		const type = expr.type;
		if (type === "Identifier") {
			const name = /** @type {Identifier} */ (expr).name;
			if (this.strict) {
				const lookups = this._wordLookups;
				let reserved;
				if (this.reservedWordsStrictBind === lookups.reservedBindTest) {
					const len = name.length;
					reserved =
						len >= lookups.reservedBindMinLen &&
						len <= lookups.reservedBindMaxLen &&
						lookups.reservedBindSet.has(name);
				} else {
					reserved = this.reservedWordsStrictBind.test(name);
				}
				if (reserved) {
					this.raiseRecoverable(
						expr.start,
						`${isBind ? "Binding " : "Assigning to "}${name} in strict mode`
					);
				}
			}
			if (isBind) {
				if (bindingType === BIND_LEXICAL && name === "let") {
					this.raiseRecoverable(
						expr.start,
						"let is disallowed as a lexically bound name"
					);
				}
				if (checkClashes) {
					if (Object.prototype.hasOwnProperty.call(checkClashes, name)) {
						this.raiseRecoverable(expr.start, "Argument name clash");
					}
					checkClashes[name] = true;
				}
				if (bindingType !== BIND_OUTSIDE) {
					this.declareName(name, bindingType, expr.start);
				}
			}
			return;
		}
		if (type === "ChainExpression") {
			this.raiseRecoverable(
				expr.start,
				"Optional chaining cannot appear in left-hand side"
			);
			return;
		}
		if (type === "MemberExpression") {
			if (isBind) {
				this.raiseRecoverable(expr.start, "Binding member expression");
			}
			return;
		}
		if (type === "ParenthesizedExpression") {
			if (isBind) {
				this.raiseRecoverable(expr.start, "Binding parenthesized expression");
			}
			return this.checkLValSimple(
				/** @type {Node} */ (
					/** @type {Node & { expression?: Node }} */ (expr).expression
				),
				bindingType,
				checkClashes
			);
		}
		this.raise(expr.start, `${isBind ? "Binding" : "Assigning to"} rvalue`);
	}

	/**
	 * Owned `checkLValPattern`, acorn's verbatim, so declarator/assignment
	 * targets stay on owned code down to `checkLValSimple`/`declareName`.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/lval.js
	 * @param {Node} expr binding pattern
	 * @param {number=} bindingType acorn BIND_* binding type
	 * @param {Record<string, boolean> | false | null=} checkClashes param-name clash record
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	checkLValPattern(expr, bindingType, checkClashes) {
		const type = expr.type;
		if (type === "ObjectPattern") {
			const properties = /** @type {Node & { properties: Node[] }} */ (expr)
				.properties;
			for (let i = 0; i < properties.length; i++) {
				this.checkLValInnerPattern(properties[i], bindingType, checkClashes);
			}
		} else if (type === "ArrayPattern") {
			const elements = /** @type {Node & { elements: (Node | null)[] }} */ (
				expr
			).elements;
			for (let i = 0; i < elements.length; i++) {
				const element = elements[i];
				if (element) {
					this.checkLValInnerPattern(element, bindingType, checkClashes);
				}
			}
		} else {
			this.checkLValSimple(expr, bindingType, checkClashes);
		}
	}

	/**
	 * Owned `checkLValInnerPattern`, acorn's verbatim.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/lval.js
	 * @param {Node} expr pattern element
	 * @param {number=} bindingType acorn BIND_* binding type
	 * @param {Record<string, boolean> | false | null=} checkClashes param-name clash record
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	checkLValInnerPattern(expr, bindingType, checkClashes) {
		const type = expr.type;
		if (type === "Property") {
			// AssignmentProperty has type === "Property"
			this.checkLValInnerPattern(
				/** @type {Node} */ (
					/** @type {Node & { value?: Node }} */ (expr).value
				),
				bindingType,
				checkClashes
			);
		} else if (type === "AssignmentPattern") {
			this.checkLValPattern(
				/** @type {Node} */ (/** @type {Node & { left?: Node }} */ (expr).left),
				bindingType,
				checkClashes
			);
		} else if (type === "RestElement") {
			this.checkLValPattern(
				/** @type {Node} */ (
					/** @type {Node & { argument?: Node }} */ (expr).argument
				),
				bindingType,
				checkClashes
			);
		} else {
			this.checkLValPattern(expr, bindingType, checkClashes);
		}
	}

	/**
	 * Replaces acorn's `canInsertSemicolon`, whose line-break check slices the
	 * inter-token gap and runs a regexp on it for every ASI decision (hundreds
	 * of thousands per file). Scan the gap for a line terminator instead — no
	 * slice, no regexp.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/parseutil.js
	 * @returns {boolean} whether a semicolon may be inserted here
	 * @this {ParserInternals}
	 */
	canInsertSemicolon() {
		if (this.type === tokTypes.eof || this.type === tokTypes.braceR) {
			return true;
		}
		// the owned nextToken already classified the gap; 2 (comment/unicode in
		// the gap, or a token from acorn's tokenizer) falls back to the scan
		return this._gapHasNewline();
	}

	// ----- comment collection without eager text slicing -----

	/**
	 * Replaces acorn's `skipLineComment` when comments are collected lazily:
	 * the same scan, but no text slice and no position objects. Acorn calls
	 * this for `//`, hashbangs and HTML-style comments (varying `startSkip`).
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @this {ParserInternals}
	 * @param {number} startSkip length of the comment opener
	 * @returns {void}
	 */
	skipLineComment(startSkip) {
		const comments = this._lazyComments;
		if (
			comments === undefined &&
			(this._noLocations !== true ||
				/** @type {Options & { onComment?: unknown }} */ (this.options)
					.onComment)
		) {
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
		if (comments !== undefined) {
			comments.push(
				new LazyComment(false, start + startSkip, start, pos, input)
			);
		}
	}

	/**
	 * Replaces acorn's `skipBlockComment` when comments are collected lazily.
	 * Locations are always off in lazy mode, so line breaks need no handling.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
	 * @this {ParserInternals}
	 * @returns {void}
	 */
	skipBlockComment() {
		const comments = this._lazyComments;
		if (
			comments === undefined &&
			(this._noLocations !== true ||
				/** @type {Options & { onComment?: unknown }} */ (this.options)
					.onComment)
		) {
			return base.skipBlockComment.call(this);
		}
		const start = this.pos;
		const end = this.input.indexOf("*/", (this.pos += 2));
		if (end === -1) this.raise(this.pos - 2, "Unterminated comment");
		this.pos = end + 2;
		if (comments !== undefined) {
			comments.push(
				new LazyComment(true, start + 2, start, this.pos, this.input)
			);
		}
	}

	// ----- lazy range -----

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/node.js
	 * @returns {Node} new node
	 * @this {ParserInternals}
	 */
	startNode() {
		if (!this._lazy) return base.startNode.call(this);
		return new LazyLocNode(this.start);
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/node.js
	 * @param {number} pos start offset
	 * @param {Position=} loc start position when acorn tracks locations
	 * @returns {Node} new node
	 * @this {ParserInternals}
	 */
	startNodeAt(pos, loc) {
		if (!this._lazy) return base.startNodeAt.call(this, pos, loc);
		return new LazyLocNode(pos);
	}

	/**
	 * Lazy-mode `finishNode`: acorn's `locations`/`ranges` writes are dead when
	 * `range` is served lazily and `loc` not at all, so skip them and the `finishNodeAt`
	 * indirection. Runs once per node.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/node.js
	 * @param {Node} node node to finish
	 * @param {string} type node type
	 * @returns {Node} the finished node
	 * @this {ParserInternals}
	 */
	finishNode(node, type) {
		if (!this._lazy) return base.finishNode.call(this, node, type);
		node.type = type;
		node.end = this.lastTokEnd;
		return node;
	}

	/**
	 * Mirror of acorn's `copyNode`, which bypasses `startNodeAt` via
	 * `new Node(...)` and would otherwise produce non-lazy nodes.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/node.js
	 * @param {Node} node node to copy
	 * @returns {Node} copied node
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

	// ----- owned node construction (single-shape nodes, replaces acorn's
	// start-empty-then-mutate flow one node type at a time) -----

	/**
	 * Owned `parseIdent` for the common name-token case: builds the finished
	 * `IdentifierNode` directly, skipping acorn's `parseIdentNode`/`startNode`/
	 * `finishNode` chain and its keyword branches. Keyword-as-identifier
	 * (`obj.class`) and non-lazy mode delegate to acorn.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {boolean=} liberal whether reserved words are allowed
	 * @returns {Identifier} identifier node
	 * @this {ParserInternals}
	 */
	parseIdent(liberal) {
		if (!this._lazy) return base.parseIdent.call(this, liberal);
		/** @type {string} */
		let name;
		const type = this.type;
		if (type === tokTypes.name) {
			name = /** @type {string} */ (this.value);
		} else if (type.keyword) {
			// keyword as identifier (`obj.class`, `{ default: x }`)
			name = type.keyword;
			// acorn #575: class/function pushed a context this use never pops,
			// except after `.` where updateContext already ignored the keyword
			if (
				(name === "class" || name === "function") &&
				(this.lastTokEnd !== this.lastTokStart + 1 ||
					this.input.charCodeAt(this.lastTokStart) !== 46)
			) {
				this.context.pop();
			}
			this.type = tokTypes.name;
		} else {
			return base.parseIdent.call(this, liberal);
		}
		const node = /** @type {Identifier} */ (
			/** @type {unknown} */ (new IdentifierNode(this.start, this.end, name))
		);
		this.next(Boolean(liberal));
		if (!liberal) {
			this.checkUnreserved(node);
			if (node.name === "await" && !this.awaitIdentPos) {
				this.awaitIdentPos = node.start;
			}
		}
		return node;
	}

	/**
	 * Owned `parseSubscripts`, an exact-semantics copy of acorn 8's with the
	 * async-arrow-head probe reordered cheapest-first (all operands are pure)
	 * and the arrow exit probe served by `_lastArrow` identity instead of the
	 * megamorphic `.type` load. Delegates when either fast path is off.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {Expression} baseExpr subscript base
	 * @param {number} startPos expression start offset
	 * @param {Position | undefined} startLoc expression start position
	 * @param {boolean=} noCalls whether calls are forbidden (`new` callee)
	 * @param {boolean | string=} forInit for-init context flag
	 * @returns {Expression} expression with subscripts applied
	 * @this {ParserInternals}
	 */
	parseSubscripts(baseExpr, startPos, startLoc, noCalls, forInit) {
		if (!this._subscriptFastPath || !this._arrowFastPath) {
			return base.parseSubscripts.call(
				this,
				baseExpr,
				startPos,
				startLoc,
				noCalls,
				forInit
			);
		}
		// acorn's probe order is (ecmaVersion, type, name, offsets, ASI,
		// potentialArrowAt); every operand is pure, so the SMI compares run
		// first and the megamorphic `.type` load only when `async` matched
		const maybeAsyncArrow =
			baseExpr.start === this.potentialArrowAt &&
			baseExpr.end - baseExpr.start === 5 &&
			this.lastTokEnd === baseExpr.end &&
			this._ecmaVersion >= 8 &&
			/** @type {Identifier} */ (baseExpr).name === "async" &&
			baseExpr.type === "Identifier" &&
			!this.canInsertSemicolon();
		let optionalChained = false;
		for (;;) {
			const element = this.parseSubscript(
				baseExpr,
				startPos,
				startLoc,
				noCalls,
				maybeAsyncArrow,
				optionalChained,
				forInit
			);
			if (
				/** @type {Expression & { optional?: boolean }} */ (element).optional
			) {
				optionalChained = true;
			}
			if (element === baseExpr || element === this._lastArrow) {
				if (optionalChained) {
					const chainNode =
						/** @type {Node & { expression?: Expression }} */
						(this.startNodeAt(startPos, startLoc));
					chainNode.expression = element;
					return /** @type {Expression} */ (
						/** @type {unknown} */ (
							this.finishNode(
								/** @type {Node} */ (chainNode),
								"ChainExpression"
							)
						)
					);
				}
				return element;
			}
			baseExpr = element;
		}
	}

	/**
	 * Owned `parseSubscript`, an exact-semantics copy of acorn 8's with the
	 * node construction replaced: member and call nodes are built fully-formed
	 * after their property/arguments parse (the half-built node was never
	 * reachable during it), landing on `MemberExpressionNode`/
	 * `CallExpressionNode`'s single shapes. Pre-optional-chaining ecmaVersions
	 * and non-lazy mode delegate to acorn.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {Expression} baseExpr subscript base
	 * @param {number} startPos expression start offset
	 * @param {Position | undefined} startLoc expression start position
	 * @param {boolean | undefined} noCalls whether calls are forbidden (`new` callee)
	 * @param {boolean} maybeAsyncArrow whether this may be an async arrow head
	 * @param {boolean} optionalChained whether the chain is already optional
	 * @param {boolean | string} forInit for-init context flag
	 * @returns {Expression} subscript element or `baseExpr` when done
	 * @this {ParserInternals}
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
		if (!this._subscriptFastPath) {
			return base.parseSubscript.call(
				this,
				baseExpr,
				startPos,
				startLoc,
				noCalls,
				maybeAsyncArrow,
				optionalChained,
				forInit
			);
		}
		const optional = this.eat(tokTypes.questionDot);
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
			/** @type {Node} */
			let property;
			if (computed) {
				property = this.parseExpression();
				this.expect(tokTypes.bracketR);
			} else if (
				this.type === tokTypes.privateId &&
				/** @type {string} */ (baseExpr.type) !== "Super"
			) {
				property = this.parsePrivateIdent();
			} else {
				property = this.parseIdent(this.options.allowReserved !== "never");
			}
			return /** @type {Expression} */ (
				/** @type {unknown} */ (
					new MemberExpressionNode(
						startPos,
						this.lastTokEnd,
						baseExpr,
						property,
						computed,
						optional
					)
				)
			);
		} else if (!noCalls && this.eat(tokTypes.parenL)) {
			const refDestructuringErrors = this._acquireDestructuringErrors();
			const oldYieldPos = this.yieldPos;
			const oldAwaitPos = this.awaitPos;
			const oldAwaitIdentPos = this.awaitIdentPos;
			this.yieldPos = 0;
			this.awaitPos = 0;
			this.awaitIdentPos = 0;
			const exprList = this.parseExprList(
				tokTypes.parenR,
				true,
				false,
				refDestructuringErrors
			);
			if (maybeAsyncArrow && !optional && this.shouldParseAsyncArrow()) {
				this.checkPatternErrors(refDestructuringErrors, false);
				this._releaseDestructuringErrors();
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
			this._releaseDestructuringErrors();
			this.yieldPos = oldYieldPos || this.yieldPos;
			this.awaitPos = oldAwaitPos || this.awaitPos;
			this.awaitIdentPos = oldAwaitIdentPos || this.awaitIdentPos;
			return /** @type {Expression} */ (
				/** @type {unknown} */ (
					new CallExpressionNode(
						startPos,
						this.lastTokEnd,
						baseExpr,
						exprList,
						optional
					)
				)
			);
		} else if (this.type === tokTypes.backQuote) {
			if (optional || optionalChained) {
				this.raise(
					this.start,
					"Optional chaining cannot appear in the tag of tagged template expressions"
				);
			}
			const node = this.startNodeAt(startPos, startLoc);
			/** @type {Node & { tag?: Expression, quasi?: Node }} */
			(node).tag = baseExpr;
			/** @type {Node & { tag?: Expression, quasi?: Node }} */
			(node).quasi = this.parseTemplate({ isTagged: true });
			return /** @type {Expression} */ (
				/** @type {unknown} */ (
					this.finishNode(node, "TaggedTemplateExpression")
				)
			);
		}
		return baseExpr;
	}

	/**
	 * Owned instance `parse`: acorn wraps the top-level parse in
	 * `catchStackOverflow`, allocating a closure per parse; inline the try/catch
	 * instead (same overflow-message translation). A `program` continuation and
	 * non-lazy mode delegate to acorn.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/state.js
	 * @returns {import("acorn").Program} program node
	 * @this {ParserInternals}
	 */
	parse() {
		if (!this._lazy || this.options.program) {
			return base.parse.call(this);
		}
		const node = this.startNode();
		this.nextToken();
		try {
			return /** @type {import("acorn").Program} */ (
				/** @type {unknown} */ (this.parseTopLevel(node))
			);
		} catch (err) {
			// acorn's catchStackOverflow: translate an engine stack-overflow error
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
	 * Owned `parseTopLevel`, an exact-semantics copy of acorn 8's: the body
	 * accumulates in a scratch array and the finished program lands on
	 * `ProgramNode`'s single shape. Non-lazy mode delegates.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {Node} node started program node (discarded, as in the owned statement parsers)
	 * @returns {Node} program node
	 * @this {ParserInternals}
	 */
	parseTopLevel(node) {
		// a `program` continuation node must be appended to and returned as-is,
		// which only acorn's copy does (base parse() reaches here via dispatch)
		if (!this._lazy || this.options.program) {
			return base.parseTopLevel.call(this, node);
		}
		/** @type {Record<string, boolean>} */
		const exports = Object.create(null);
		const scratch = this._acquireScratch();
		let count = 0;
		while (this.type !== tokTypes.eof) {
			scratch[count++] = this.parseStatement(null, true, exports);
		}
		const body = this._releaseScratch(scratch, count);
		if (this.inModule) {
			for (const name of Object.keys(this.undefinedExports)) {
				this.raiseRecoverable(
					this.undefinedExports[name].start,
					`Export '${name}' is not defined`
				);
			}
		}
		this.adaptDirectivePrologue(body);
		this.next();
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				new ProgramNode(
					node.start,
					this.lastTokEnd,
					body,
					this.options.sourceType === "commonjs"
						? "script"
						: /** @type {string} */ (this.options.sourceType)
				)
			)
		);
	}

	/**
	 * Owned `parseStatement` for the hot statement heads: acorn starts a node
	 * before dispatching, but the owned statement parsers build their own
	 * single-shape nodes, so that started node was one discarded allocation per
	 * statement. Dispatch the common heads (`var`/`let`/`const`, `if`, `return`,
	 * blocks and plain expression statements) without it; everything rarer, the
	 * `name`-token ambiguities (`let`/`async`/`using`/`await` heads) and
	 * plugin-overridden parsers delegate to acorn.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {string | null} context statement context
	 * @param {boolean=} topLevel whether parsing top-level statements
	 * @param {unknown=} exports export tracking object
	 * @returns {Node} statement
	 * @this {ParserInternals}
	 */
	parseStatement(context, topLevel, exports) {
		if (!this._stmtFastPath) {
			return base.parseStatement.call(this, context, topLevel, exports);
		}
		const startType = this.type;
		switch (startType) {
			case tokTypes._var:
			case tokTypes._const: {
				const kind = /** @type {string} */ (this.value);
				if (context && kind !== "var") this.unexpected();
				return this._parseVarStatementAt(this.start, kind);
			}
			case tokTypes._if:
				return this._parseIfStatementAt(this.start);
			case tokTypes._return:
				return this._parseReturnStatementAt(this.start);
			case tokTypes.braceL:
				// the owned parseBlock never reads the started node
				return this.parseBlock(true);
			case tokTypes._function: {
				if (!this._funcStmtOwn) {
					return base.parseStatement.call(this, context, topLevel, exports);
				}
				// acorn's hanging-function guard (context = single-statement position)
				if (
					context &&
					(this.strict || (context !== "if" && context !== "label"))
				) {
					this.unexpected();
				}
				// parseFunctionStatement, inlined without the started node
				const start = this.start;
				this.next();
				return this._parseFunctionAt(
					start,
					FUNC_STATEMENT | (context ? FUNC_HANGING_STATEMENT : 0),
					false,
					false,
					undefined
				);
			}
			case tokTypes._break:
			case tokTypes._continue:
				if (!this._stmt2FastPath) {
					return base.parseStatement.call(this, context, topLevel, exports);
				}
				return this._parseBreakContinueStatementAt(
					this.start,
					/** @type {string} */ (startType.keyword)
				);
			case tokTypes._for:
				if (!this._stmt2FastPath) {
					return base.parseStatement.call(this, context, topLevel, exports);
				}
				return this._parseForStatementAt(this.start);
			case tokTypes._switch:
				if (!this._stmt2FastPath) {
					return base.parseStatement.call(this, context, topLevel, exports);
				}
				return this._parseSwitchStatementAt(this.start);
			case tokTypes._throw:
				if (!this._stmt2FastPath) {
					return base.parseStatement.call(this, context, topLevel, exports);
				}
				return this._parseThrowStatementAt(this.start);
			case tokTypes._try:
				if (!this._stmt2FastPath) {
					return base.parseStatement.call(this, context, topLevel, exports);
				}
				return this._parseTryStatementAt(this.start);
			case tokTypes._while:
				if (!this._stmt2FastPath) {
					return base.parseStatement.call(this, context, topLevel, exports);
				}
				return this._parseWhileStatementAt(this.start);
			case tokTypes.semi: {
				if (!this._stmt2FastPath) {
					return base.parseStatement.call(this, context, topLevel, exports);
				}
				const start = this.start;
				this.next();
				return /** @type {Node} */ (
					/** @type {unknown} */ (
						new EmptyStatementNode(start, this.lastTokEnd)
					)
				);
			}
			case tokTypes._debugger: {
				if (!this._stmt2FastPath) {
					return base.parseStatement.call(this, context, topLevel, exports);
				}
				const start = this.start;
				this.next();
				this.semicolon();
				return /** @type {Node} */ (
					/** @type {unknown} */ (
						new DebuggerStatementNode(start, this.lastTokEnd)
					)
				);
			}
			case tokTypes._do: {
				if (!this._stmt2FastPath) {
					return base.parseStatement.call(this, context, topLevel, exports);
				}
				const start = this.start;
				this.next();
				this.labels.push(LOOP_LABEL);
				const body = this.parseStatement("do");
				this.labels.pop();
				this.expect(tokTypes._while);
				const test = this.parseParenExpression();
				// fast-path gate guarantees ES6+, where the semicolon is optional
				this.eat(tokTypes.semi);
				return /** @type {Node} */ (
					/** @type {unknown} */ (
						new DoWhileStatementNode(start, this.lastTokEnd, body, test)
					)
				);
			}
			case tokTypes._with: {
				if (!this._stmt2FastPath) {
					return base.parseStatement.call(this, context, topLevel, exports);
				}
				if (this.strict) this.raise(this.start, "'with' in strict mode");
				const start = this.start;
				this.next();
				const object = this.parseParenExpression();
				const body = this.parseStatement("with");
				return /** @type {Node} */ (
					/** @type {unknown} */ (
						new WithStatementNode(start, this.lastTokEnd, object, body)
					)
				);
			}
			case tokTypes._export:
			case tokTypes._import: {
				if (!this._moduleDeclFastPath) {
					return base.parseStatement.call(this, context, topLevel, exports);
				}
				// import( / import. head is an expression statement, peeked without
				// acorn's skipWhiteSpace.exec allocation (gate guarantees ES11+)
				if (startType === tokTypes._import) {
					const next = this._scanGap(this.pos);
					const nextCh = this.input.charCodeAt(next);
					if (nextCh === 40 || nextCh === 46) {
						const start = this.start;
						return this._parseExpressionStatementAt(
							start,
							this.parseExpression()
						);
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
				const node = this.startNode();
				return startType === tokTypes._import
					? this.parseImport(node)
					: this.parseExport(node, exports);
			}
			case tokTypes._class: {
				if (!this._classFastPath) {
					return base.parseStatement.call(this, context, topLevel, exports);
				}
				if (context) this.unexpected();
				return this.parseClass(this.startNode(), true);
			}
			default: {
				if (startType === tokTypes.name) {
					const value = this.value;
					if (value === "let") {
						if (this.isLet(context)) {
							// mirrors acorn's `context && kind !== "var"` rejection
							if (context) this.unexpected();
							return this._parseVarStatementAt(this.start, "let");
						}
						// `let` as a plain identifier: expression/label tail below
					} else if (value === "async") {
						if (!this._funcStmtOwn) {
							return base.parseStatement.call(this, context, topLevel, exports);
						}
						// `async function` statement head, acorn's dispatch with the
						// started node folded away
						if (this.isAsyncFunction()) {
							// a truthy context raises, so the statement bit stands alone
							if (context) this.unexpected();
							const start = this.start;
							this.next();
							this.next();
							return this._parseFunctionAt(
								start,
								FUNC_STATEMENT,
								false,
								true,
								undefined
							);
						}
						// plain `async` identifier: expression/label tail below
					} else if (value === "using" || value === "await") {
						const usingKind = this.isAwaitUsing(false)
							? "await using"
							: this.isUsing(false)
								? "using"
								: null;
						if (usingKind !== null) {
							// using declarations keep acorn's dispatch (rare)
							return base.parseStatement.call(this, context, topLevel, exports);
						}
						// plain identifier or top-level await: expression/label tail below
					}
				}
				// unambiguous expression statement, with acorn's label tail
				const start = this.start;
				const maybeName = this.value;
				const expr = this.parseExpression();
				if (
					startType === tokTypes.name &&
					expr.type === "Identifier" &&
					this.eat(tokTypes.colon)
				) {
					// labels are rare enough to pay for the started node
					return this.parseLabeledStatement(
						this.startNodeAt(start),
						/** @type {string} */ (maybeName),
						/** @type {Identifier} */ (expr),
						context
					);
				}
				return this._parseExpressionStatementAt(start, expr);
			}
		}
	}

	/**
	 * Owned `parseVarStatement`: the passed started node is filled by
	 * `parseVar` as acorn expects, then the finished statement lands on
	 * `VariableDeclarationNode`'s single shape. Non-lazy mode delegates.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {Node} node started statement node from `parseStatement`
	 * @param {string} kind declaration kind
	 * @param {boolean=} allowMissingInitializer whether `const x;` is allowed
	 * @returns {Node} variable declaration
	 * @this {ParserInternals}
	 */
	parseVarStatement(node, kind, allowMissingInitializer) {
		if (!this._lazy || !this._varIdOwn) {
			return base.parseVarStatement.call(
				this,
				node,
				kind,
				allowMissingInitializer
			);
		}
		return this._parseVarStatementAt(node.start, kind, allowMissingInitializer);
	}

	/**
	 * Statement-position `var`/`let`/`const` without a started node: the
	 * declaration lands directly on `VariableDeclarationNode`'s single shape.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {number} start statement start offset
	 * @param {string} kind declaration kind
	 * @param {boolean=} allowMissingInitializer whether `const x;` is allowed
	 * @returns {Node} variable declaration
	 * @this {ParserInternals}
	 */
	_parseVarStatementAt(start, kind, allowMissingInitializer) {
		this.next();
		const scratch = this._acquireScratch();
		const count = this._parseVarInto(
			scratch,
			false,
			kind,
			allowMissingInitializer
		);
		const declarations = this._releaseScratch(scratch, count);
		this.semicolon();
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				new VariableDeclarationNode(start, this.lastTokEnd, declarations, kind)
			)
		);
	}

	/**
	 * Owned `parseVar`, an exact-semantics copy of acorn 8's that builds each
	 * declarator fully-formed on `VariableDeclaratorNode`'s single shape. The
	 * passed node keeps receiving `declarations`/`kind` because
	 * `parseForStatement` finishes it itself. Non-lazy mode delegates.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {Node} node declaration node to fill
	 * @param {boolean} isFor whether parsing a `for` head
	 * @param {string} kind declaration kind
	 * @param {boolean=} allowMissingInitializer whether `const x;` is allowed
	 * @returns {Node} the filled node
	 * @this {ParserInternals}
	 */
	parseVar(node, isFor, kind, allowMissingInitializer) {
		if (!this._lazy || !this._varIdOwn) {
			return base.parseVar.call(
				this,
				node,
				isFor,
				kind,
				allowMissingInitializer
			);
		}
		const target =
			/** @type {Node & { declarations: Node[] | null, kind: string }} */ (
				node
			);
		// null placeholder keeps acorn's declarations-then-kind key order while
		// the list is built in scratch (the node is a local in every caller
		// until this returns, so the placeholder is unobservable)
		target.declarations = null;
		target.kind = kind;
		const scratch = this._acquireScratch();
		const count = this._parseVarInto(
			scratch,
			isFor,
			kind,
			allowMissingInitializer
		);
		target.declarations = this._releaseScratch(scratch, count);
		return node;
	}

	/**
	 * The declarator loop of the owned `parseVar`, shared with the owned
	 * `parseStatement`'s node-free statement path.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {Node[]} declarations scratch array for the declarators
	 * @param {boolean} isFor whether parsing a `for` head
	 * @param {string} kind declaration kind
	 * @param {boolean=} allowMissingInitializer whether `const x;` is allowed
	 * @returns {number} number of declarators written
	 * @this {ParserInternals}
	 */
	_parseVarInto(declarations, isFor, kind, allowMissingInitializer) {
		const ecmaVersion = this._ecmaVersion;
		const usingKind = kind === "using" || kind === "await using";
		let count = 0;
		for (;;) {
			const declStart = this.start;
			const id = usingKind ? this.parseIdent() : this.parseBindingAtom();
			this.checkLValPattern(
				id,
				kind === "var" ? BIND_VAR : BIND_LEXICAL,
				false
			);
			/** @type {Expression | null} */
			let init = null;
			if (this.eat(tokTypes.eq)) {
				init = this.parseMaybeAssign(isFor);
			} else if (
				!allowMissingInitializer &&
				kind === "const" &&
				!(
					this.type === tokTypes._in ||
					(ecmaVersion >= 6 && this.isContextual("of"))
				)
			) {
				this.unexpected();
			} else if (
				!allowMissingInitializer &&
				usingKind &&
				ecmaVersion >= 17 &&
				this.type !== tokTypes._in &&
				!this.isContextual("of")
			) {
				this.raise(
					this.lastTokEnd,
					`Missing initializer in ${kind} declaration`
				);
			} else if (
				!allowMissingInitializer &&
				id.type !== "Identifier" &&
				!(isFor && (this.type === tokTypes._in || this.isContextual("of")))
			) {
				this.raise(
					this.lastTokEnd,
					"Complex binding patterns require an initialization value"
				);
			}
			declarations[count++] = /** @type {Node} */ (
				/** @type {unknown} */ (
					new VariableDeclaratorNode(declStart, this.lastTokEnd, id, init)
				)
			);
			if (!this.eat(tokTypes.comma)) break;
		}
		return count;
	}

	/**
	 * Owned `parseExpressionStatement`: the statement lands on
	 * `ExpressionStatementNode`'s single shape (the passed started node is
	 * discarded, matching acorn's observable output). Non-lazy mode delegates.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {Node} node started statement node from `parseStatement`
	 * @param {Expression} expr the parsed expression
	 * @returns {Node} expression statement
	 * @this {ParserInternals}
	 */
	parseExpressionStatement(node, expr) {
		if (!this._lazy) {
			return base.parseExpressionStatement.call(this, node, expr);
		}
		return this._parseExpressionStatementAt(node.start, expr);
	}

	/**
	 * `parseExpressionStatement` without a started node.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {number} start statement start offset
	 * @param {Expression} expr the parsed expression
	 * @returns {Node} expression statement
	 * @this {ParserInternals}
	 */
	_parseExpressionStatementAt(start, expr) {
		this.semicolon();
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				new ExpressionStatementNode(start, this.lastTokEnd, expr)
			)
		);
	}

	/**
	 * Owned `parseBlock`, an exact-semantics copy of acorn 8's landing on
	 * `BlockStatementNode`'s single shape. Non-lazy mode delegates.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {boolean=} createNewLexicalScope whether the block opens a scope
	 * @param {Node=} node started statement node, when called from `parseStatement`
	 * @param {boolean=} exitStrict whether to restore sloppy mode at the end
	 * @returns {Node} block statement
	 * @this {ParserInternals}
	 */
	parseBlock(createNewLexicalScope, node, exitStrict) {
		if (!this._lazy) {
			return base.parseBlock.call(
				this,
				createNewLexicalScope,
				node,
				exitStrict
			);
		}
		if (createNewLexicalScope === undefined) createNewLexicalScope = true;
		const start = this.start;
		const scratch = this._acquireScratch();
		let count = 0;
		this.expect(tokTypes.braceL);
		if (createNewLexicalScope) this.enterScope(0);
		while (this.type !== tokTypes.braceR) {
			scratch[count++] = this.parseStatement(null);
		}
		if (exitStrict) this.strict = false;
		this.next();
		if (createNewLexicalScope) this.exitScope();
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				new BlockStatementNode(
					start,
					this.lastTokEnd,
					this._releaseScratch(scratch, count)
				)
			)
		);
	}

	/**
	 * Owned `parseIfStatement` landing on `IfStatementNode`'s single shape.
	 * Non-lazy mode delegates to acorn.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {Node} node started statement node from `parseStatement`
	 * @returns {Node} if statement
	 * @this {ParserInternals}
	 */
	parseIfStatement(node) {
		if (!this._lazy) return base.parseIfStatement.call(this, node);
		return this._parseIfStatementAt(node.start);
	}

	/**
	 * `parseIfStatement` without a started node.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {number} start statement start offset
	 * @returns {Node} if statement
	 * @this {ParserInternals}
	 */
	_parseIfStatementAt(start) {
		this.next();
		const test = this.parseParenExpression();
		// function declarations are allowed in branches outside strict mode
		const consequent = this.parseStatement("if");
		const alternate = this.eat(tokTypes._else)
			? this.parseStatement("if")
			: null;
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				new IfStatementNode(start, this.lastTokEnd, test, consequent, alternate)
			)
		);
	}

	/**
	 * Owned `parseReturnStatement` landing on `ReturnStatementNode`'s single
	 * shape. Non-lazy mode delegates to acorn.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {Node} node started statement node from `parseStatement`
	 * @returns {Node} return statement
	 * @this {ParserInternals}
	 */
	parseReturnStatement(node) {
		if (!this._lazy) {
			if (!this.allowReturn) this._tryModuleFallback();
			return base.parseReturnStatement.call(this, node);
		}
		return this._parseReturnStatementAt(node.start);
	}

	/**
	 * In `auto` source type a top-level `return` is script-only syntax. When the
	 * strict module parse reaches it with no module construct seen yet, downgrade
	 * to a sloppy script in place: the prefix parsed under stricter rules stays a
	 * valid sloppy prefix, so the second full parse is avoided.
	 * @returns {boolean} true when the parse was downgraded to script
	 * @this {ParserInternals}
	 */
	_tryModuleFallback() {
		if (
			!this._moduleFallback ||
			this._moduleSyntaxSeen ||
			!(this.currentVarScope().flags & SCOPE_TOP)
		) {
			return false;
		}
		this.options.allowReturnOutsideFunction = true;
		// acorn stamps Program.sourceType from this at parseTopLevel's end
		this.options.sourceType = "script";
		this.strict = false;
		this.inModule = false;
		this._moduleFallback = false;
		return true;
	}

	/**
	 * `parseReturnStatement` without a started node.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {number} start statement start offset
	 * @returns {Node} return statement
	 * @this {ParserInternals}
	 */
	_parseReturnStatementAt(start) {
		if (!this.allowReturn && !this._tryModuleFallback()) {
			this.raise(this.start, "'return' outside of function");
		}
		this.next();
		/** @type {Expression | null} */
		let argument = null;
		// `return` takes an optional argument, so eagerly look for a semicolon
		if (!(this.eat(tokTypes.semi) || this.insertSemicolon())) {
			argument = this.parseExpression();
			this.semicolon();
		}
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				new ReturnStatementNode(start, this.lastTokEnd, argument)
			)
		);
	}

	/**
	 * `parseBreakContinueStatement` without a started node, landing on
	 * `BreakContinueNode`'s single shape.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {number} start statement start offset
	 * @param {string} keyword `break` or `continue`
	 * @returns {Node} break or continue statement
	 * @this {ParserInternals}
	 */
	_parseBreakContinueStatementAt(start, keyword) {
		const isBreak = keyword === "break";
		this.next();
		/** @type {Identifier | null} */
		let label = null;
		if (this.eat(tokTypes.semi) || this.insertSemicolon()) {
			// no label
		} else if (this.type !== tokTypes.name) {
			this.unexpected();
		} else {
			label = this.parseIdent();
			this.semicolon();
		}
		// verify there is an actual destination to break or continue to
		const labels = this.labels;
		let i = 0;
		for (; i < labels.length; ++i) {
			const lab = labels[i];
			if (label === null || lab.name === label.name) {
				if (
					lab.kind !== null &&
					lab.kind !== undefined &&
					(isBreak || lab.kind === "loop")
				) {
					break;
				}
				if (label && isBreak) break;
			}
		}
		if (i === labels.length) this.raise(start, `Unsyntactic ${keyword}`);
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				new BreakContinueNode(
					start,
					this.lastTokEnd,
					isBreak ? "BreakStatement" : "ContinueStatement",
					label
				)
			)
		);
	}

	/**
	 * `parseForStatement` without a started node (fast-path gate guarantees
	 * `ecmaVersion >= 9`, folding acorn's version probes).
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {number} start statement start offset
	 * @returns {Node} for/for-in/for-of statement
	 * @this {ParserInternals}
	 */
	_parseForStatementAt(start) {
		this.next();
		const awaitAt =
			this.canAwait && this.eatContextual("await") ? this.lastTokStart : -1;
		this.labels.push(LOOP_LABEL);
		this.enterScope(0);
		this.expect(tokTypes.parenL);
		if (this.type === tokTypes.semi) {
			if (awaitAt > -1) this.unexpected(awaitAt);
			return this._parseForAt(start, null);
		}
		const isLet = this.isLet();
		if (this.type === tokTypes._var || this.type === tokTypes._const || isLet) {
			const initStart = this.start;
			const kind = isLet ? "let" : /** @type {string} */ (this.value);
			this.next();
			const scratch = this._acquireScratch();
			const count = this._parseVarInto(scratch, true, kind);
			const declarations = this._releaseScratch(scratch, count);
			const init = /** @type {Node} */ (
				/** @type {unknown} */ (
					new VariableDeclarationNode(
						initStart,
						this.lastTokEnd,
						declarations,
						kind
					)
				)
			);
			return this._parseForAfterInitAt(start, init, awaitAt);
		}
		const startsWithLet = this.isContextual("let");
		let isForOf = false;
		const usingKind = this.isUsing(true)
			? "using"
			: this.isAwaitUsing(true)
				? "await using"
				: null;
		if (usingKind) {
			const initStart = this.start;
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
			const scratch = this._acquireScratch();
			const count = this._parseVarInto(scratch, true, usingKind);
			const declarations = this._releaseScratch(scratch, count);
			const init = /** @type {Node} */ (
				/** @type {unknown} */ (
					new VariableDeclarationNode(
						initStart,
						this.lastTokEnd,
						declarations,
						usingKind
					)
				)
			);
			return this._parseForAfterInitAt(start, init, awaitAt);
		}
		const containsEsc = this.containsEsc;
		const refDestructuringErrors = this._acquireDestructuringErrors();
		const initPos = this.start;
		const init =
			awaitAt > -1
				? this.parseExprSubscripts(refDestructuringErrors, "await")
				: this.parseExpression(true, refDestructuringErrors);
		if (this.type === tokTypes._in || (isForOf = this.isContextual("of"))) {
			let isAwait = false;
			if (awaitAt > -1) {
				if (this.type === tokTypes._in) this.unexpected(awaitAt);
				isAwait = true;
			} else if (
				isForOf &&
				init.start === initPos &&
				!containsEsc &&
				init.type === "Identifier" &&
				/** @type {Identifier} */ (init).name === "async"
			) {
				this.unexpected();
			}
			if (startsWithLet && isForOf) {
				this.raise(
					init.start,
					"The left-hand side of a for-of loop may not start with 'let'."
				);
			}
			this.toAssignable(init, false, refDestructuringErrors);
			this.checkLValPattern(init);
			this._releaseDestructuringErrors();
			return this._parseForInAt(start, isAwait, /** @type {Node} */ (init));
		}
		this.checkExpressionErrors(refDestructuringErrors, true);
		this._releaseDestructuringErrors();
		if (awaitAt > -1) this.unexpected(awaitAt);
		return this._parseForAt(start, /** @type {Node} */ (init));
	}

	/**
	 * `parseForAfterInit` without a started node.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {number} start statement start offset
	 * @param {Node} init parsed variable declaration
	 * @param {number} awaitAt offset of a consumed `await`, or -1
	 * @returns {Node} for/for-in/for-of statement
	 * @this {ParserInternals}
	 */
	_parseForAfterInitAt(start, init, awaitAt) {
		const target =
			/** @type {Node & { declarations: Node[], kind: string }} */ (init);
		if (
			(this.type === tokTypes._in || this.isContextual("of")) &&
			target.declarations.length === 1
		) {
			if (this.type === tokTypes._in) {
				if (
					(target.kind === "using" || target.kind === "await using") &&
					!(
						/** @type {Node & { init: Node | null }} */ (target.declarations[0])
							.init
					)
				) {
					this.raise(
						this.start,
						"Using declaration is not allowed in for-in loops"
					);
				}
				if (awaitAt > -1) this.unexpected(awaitAt);
				return this._parseForInAt(start, false, init);
			}
			return this._parseForInAt(start, awaitAt > -1, init);
		}
		if (awaitAt > -1) this.unexpected(awaitAt);
		return this._parseForAt(start, init);
	}

	/**
	 * `parseFor` without a started node, landing on `ForStatementNode`'s
	 * single shape.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {number} start statement start offset
	 * @param {Node | null} init init clause
	 * @returns {Node} for statement
	 * @this {ParserInternals}
	 */
	_parseForAt(start, init) {
		this.expect(tokTypes.semi);
		const test = this.type === tokTypes.semi ? null : this.parseExpression();
		this.expect(tokTypes.semi);
		const update =
			this.type === tokTypes.parenR ? null : this.parseExpression();
		this.expect(tokTypes.parenR);
		const body = this.parseStatement("for");
		this.exitScope();
		this.labels.pop();
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				new ForStatementNode(start, this.lastTokEnd, init, test, update, body)
			)
		);
	}

	/**
	 * `parseForIn` without a started node, landing on `ForInStatementNode`/
	 * `ForOfStatementNode`'s single shapes.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {number} start statement start offset
	 * @param {boolean} isAwait whether this is `for await`
	 * @param {Node} init loop target
	 * @returns {Node} for-in or for-of statement
	 * @this {ParserInternals}
	 */
	_parseForInAt(start, isAwait, init) {
		const isForIn = this.type === tokTypes._in;
		this.next();
		if (
			init.type === "VariableDeclaration" &&
			/** @type {Node & { init: Node | null }} */ (
				/** @type {Node & { declarations: Node[] }} */ (init).declarations[0]
			).init !== null &&
			(!isForIn ||
				this.strict ||
				/** @type {Node & { kind: string }} */ (init).kind !== "var" ||
				/** @type {Node & { id: Node }} */ (
					/** @type {Node & { declarations: Node[] }} */ (init).declarations[0]
				).id.type !== "Identifier")
		) {
			this.raise(
				init.start,
				`${
					isForIn ? "for-in" : "for-of"
				} loop variable declaration may not have an initializer`
			);
		}
		const right = isForIn ? this.parseExpression() : this.parseMaybeAssign();
		this.expect(tokTypes.parenR);
		const body = this.parseStatement("for");
		this.exitScope();
		this.labels.pop();
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				isForIn
					? new ForInStatementNode(start, this.lastTokEnd, init, right, body)
					: new ForOfStatementNode(
							start,
							this.lastTokEnd,
							isAwait,
							init,
							right,
							body
						)
			)
		);
	}

	/**
	 * `parseSwitchStatement` without a started node, landing on
	 * `SwitchStatementNode`'s single shape with pre-shaped `SwitchCaseNode`s.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {number} start statement start offset
	 * @returns {Node} switch statement
	 * @this {ParserInternals}
	 */
	_parseSwitchStatementAt(start) {
		this.next();
		const discriminant = this.parseParenExpression();
		/** @type {Node[]} */
		const cases = [];
		this.expect(tokTypes.braceL);
		this.labels.push(SWITCH_LABEL);
		this.enterScope(SCOPE_SWITCH);
		/** @type {SwitchCaseNode | undefined} */
		let cur;
		for (let sawDefault = false; this.type !== tokTypes.braceR;) {
			if (this.type === tokTypes._case || this.type === tokTypes._default) {
				const isCase = this.type === tokTypes._case;
				if (cur) this.finishNode(/** @type {Node} */ (cur), "SwitchCase");
				cur = new SwitchCaseNode(this.start);
				cases.push(/** @type {Node} */ (cur));
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
				/** @type {Node[]} */ (
					/** @type {SwitchCaseNode} */ (cur).consequent
				).push(this.parseStatement(null));
			}
		}
		this.exitScope();
		if (cur) this.finishNode(/** @type {Node} */ (cur), "SwitchCase");
		this.next(); // closing brace
		this.labels.pop();
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				new SwitchStatementNode(start, this.lastTokEnd, discriminant, cases)
			)
		);
	}

	/**
	 * `parseThrowStatement` without a started node; the illegal-newline probe
	 * runs on the tokenizer's newline flag instead of acorn's gap slice+regexp.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {number} start statement start offset
	 * @returns {Node} throw statement
	 * @this {ParserInternals}
	 */
	_parseThrowStatementAt(start) {
		this.next();
		if (this._gapHasNewline()) {
			this.raise(this.lastTokEnd, "Illegal newline after throw");
		}
		const argument = this.parseExpression();
		this.semicolon();
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				new ThrowStatementNode(start, this.lastTokEnd, argument)
			)
		);
	}

	/**
	 * `parseTryStatement` without a started node, landing on
	 * `TryStatementNode`/`CatchClauseNode`'s single shapes.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {number} start statement start offset
	 * @returns {Node} try statement
	 * @this {ParserInternals}
	 */
	_parseTryStatementAt(start) {
		this.next();
		const block = this.parseBlock();
		/** @type {Node | null} */
		let handler = null;
		if (this.type === tokTypes._catch) {
			const clauseStart = this.start;
			this.next();
			/** @type {Node | null} */
			let param;
			if (this.eat(tokTypes.parenL)) {
				param = this.parseCatchClauseParam();
			} else {
				if (this._ecmaVersion < 10) this.unexpected();
				param = null;
				this.enterScope(0);
			}
			const body = this.parseBlock(false);
			this.exitScope();
			handler = /** @type {Node} */ (
				/** @type {unknown} */ (
					new CatchClauseNode(clauseStart, this.lastTokEnd, param, body)
				)
			);
		}
		const finalizer = this.eat(tokTypes._finally) ? this.parseBlock() : null;
		if (!handler && !finalizer) {
			this.raise(start, "Missing catch or finally clause");
		}
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				new TryStatementNode(start, this.lastTokEnd, block, handler, finalizer)
			)
		);
	}

	/**
	 * `parseWhileStatement` without a started node, landing on
	 * `WhileStatementNode`'s single shape.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {number} start statement start offset
	 * @returns {Node} while statement
	 * @this {ParserInternals}
	 */
	_parseWhileStatementAt(start) {
		this.next();
		const test = this.parseParenExpression();
		this.labels.push(LOOP_LABEL);
		const body = this.parseStatement("while");
		this.labels.pop();
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				new WhileStatementNode(start, this.lastTokEnd, test, body)
			)
		);
	}

	/**
	 * Owned `parseLabeledStatement`, an exact-semantics copy of acorn 8's
	 * landing on `LabeledStatementNode`'s single shape (the passed started node
	 * supplies only its start offset). Non-lazy mode delegates.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {Node} node started statement node
	 * @param {string} maybeName label name
	 * @param {Identifier} expr parsed label identifier
	 * @param {string | null} context statement context
	 * @returns {Node} labeled statement
	 * @this {ParserInternals}
	 */
	parseLabeledStatement(node, maybeName, expr, context) {
		if (!this._lazy) {
			return base.parseLabeledStatement.call(
				this,
				node,
				maybeName,
				expr,
				context
			);
		}
		const labels = this.labels;
		for (let i = 0; i < labels.length; i++) {
			if (labels[i].name === maybeName) {
				this.raise(expr.start, `Label '${maybeName}' is already declared`);
			}
		}
		const kind = /** @type {TokenTypeInternal} */ (this.type).isLoop
			? "loop"
			: this.type === tokTypes._switch
				? "switch"
				: null;
		for (let i = labels.length - 1; i >= 0; i--) {
			const label = labels[i];
			if (label.statementStart === node.start) {
				// update information about previous labels on this node
				label.statementStart = this.start;
				label.kind = kind;
			} else {
				break;
			}
		}
		labels.push({ name: maybeName, kind, statementStart: this.start });
		const body = this.parseStatement(
			context
				? !context.includes("label")
					? `${context}label`
					: context
				: "label"
		);
		labels.pop();
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				new LabeledStatementNode(node.start, this.lastTokEnd, body, expr)
			)
		);
	}

	/**
	 * Owned `parseSpread` landing on `RestSpreadNode`'s single shape.
	 * Non-lazy mode delegates.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/lval.js
	 * @param {DestructuringErrorsShim | null=} refDestructuringErrors destructuring errors to fill
	 * @returns {Node} spread element
	 * @this {ParserInternals}
	 */
	parseSpread(refDestructuringErrors) {
		if (!this._lazy) {
			return base.parseSpread.call(this, refDestructuringErrors);
		}
		const start = this.start;
		this.next();
		const argument = this.parseMaybeAssign(false, refDestructuringErrors);
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				new RestSpreadNode(start, this.lastTokEnd, "SpreadElement", argument)
			)
		);
	}

	/**
	 * Owned `parseMaybeConditional` landing on
	 * `ConditionalExpressionNode`'s single shape. Non-lazy mode delegates.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {boolean | string=} forInit for-init context flag
	 * @param {DestructuringErrorsShim | null=} refDestructuringErrors destructuring errors to fill
	 * @returns {Expression} expression node
	 * @this {ParserInternals}
	 */
	parseMaybeConditional(forInit, refDestructuringErrors) {
		if (!this._lazy) {
			return base.parseMaybeConditional.call(
				this,
				forInit,
				refDestructuringErrors
			);
		}
		const startPos = this.start;
		const expr = this.parseExprOps(forInit, refDestructuringErrors);
		if (this.checkExpressionErrors(refDestructuringErrors)) return expr;
		const isArrowAtStart = this._arrowFastPath
			? expr === this._lastArrow && expr.start === startPos
			: expr.type === "ArrowFunctionExpression" && expr.start === startPos;
		if (!isArrowAtStart && this.eat(tokTypes.question)) {
			const consequent = this.parseMaybeAssign();
			this.expect(tokTypes.colon);
			const alternate = this.parseMaybeAssign(forInit);
			return /** @type {Expression} */ (
				/** @type {unknown} */ (
					new ConditionalExpressionNode(
						startPos,
						this.lastTokEnd,
						expr,
						consequent,
						alternate
					)
				)
			);
		}
		return expr;
	}

	/**
	 * acorn's `parseArrowExpression` plus `_lastArrow` tracking — arrows are
	 * created and returned only here, so the expression-spine probes can test
	 * node identity instead of the megamorphic `.type` load. A plugin fabricating
	 * arrow nodes in an overridden `parseExprAtom` bypasses the gate (same
	 * acceptance class as `_stmtFastPath`).
	 * @param {Node} node started node
	 * @param {Node[]} params parameter expressions
	 * @param {boolean} isAsync async arrow
	 * @param {boolean | string=} forInit for-init context flag
	 * @returns {Expression} arrow function expression
	 * @this {ParserInternals}
	 */
	parseArrowExpression(node, params, isAsync, forInit) {
		if (!this._funcFastPath) {
			const result = base.parseArrowExpression.call(
				this,
				node,
				params,
				isAsync,
				forInit
			);
			this._lastArrow = result;
			return result;
		}
		// acorn's body with the started node replaced by the pre-shaped
		// FunctionNode (initFunction's writes are its constructor defaults)
		const functionNode = /** @type {Node} */ (
			/** @type {unknown} */ (new FunctionNode(node.start))
		);
		const oldYieldPos = this.yieldPos;
		const oldAwaitPos = this.awaitPos;
		const oldAwaitIdentPos = this.awaitIdentPos;
		this.enterScope(SCOPE_FUNCTION | (isAsync ? SCOPE_ASYNC : 0) | SCOPE_ARROW);
		/** @type {Node & { async: boolean, params?: Node[] }} */ (
			functionNode
		).async = Boolean(isAsync);
		this.yieldPos = 0;
		this.awaitPos = 0;
		this.awaitIdentPos = 0;
		/** @type {Node & { params?: Node[] }} */ (functionNode).params =
			/** @type {Node[]} */ (this.toAssignableList(params, true));
		this.parseFunctionBody(functionNode, true, false, forInit);
		this.yieldPos = oldYieldPos;
		this.awaitPos = oldAwaitPos;
		this.awaitIdentPos = oldAwaitIdentPos;
		const result = /** @type {Expression} */ (
			/** @type {unknown} */ (
				this.finishNode(functionNode, "ArrowFunctionExpression")
			)
		);
		this._lastArrow = result;
		return result;
	}

	/**
	 * Owned `parseFunction`, an exact-semantics copy of acorn 8's landing on
	 * `FunctionNode`'s pre-declared shape (the passed started node is discarded,
	 * matching acorn's observable output; `initFunction`'s writes are the
	 * constructor defaults). Non-lazy mode and plugin overrides delegate.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {Node} node started node from the caller
	 * @param {number} statement FUNC_* statement bit flags
	 * @param {boolean=} allowExpressionBody whether an expression body is allowed
	 * @param {boolean=} isAsync whether the function is async
	 * @param {boolean | string=} forInit for-init context flag
	 * @returns {Expression} function declaration or expression
	 * @this {ParserInternals}
	 */
	parseFunction(node, statement, allowExpressionBody, isAsync, forInit) {
		if (!this._funcFastPath) {
			return base.parseFunction.call(
				this,
				node,
				statement,
				allowExpressionBody,
				isAsync,
				forInit
			);
		}
		return this._parseFunctionAt(
			node.start,
			statement,
			allowExpressionBody === true,
			isAsync === true,
			forInit
		);
	}

	/**
	 * `parseFunction` without a started node (fast-path gate guarantees
	 * `ecmaVersion >= 9`, folding acorn's version probes).
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {number} start function start offset
	 * @param {number} statement FUNC_* statement bit flags
	 * @param {boolean} allowExpressionBody whether an expression body is allowed
	 * @param {boolean} isAsync whether the function is async
	 * @param {boolean | string=} forInit for-init context flag
	 * @returns {Expression} function declaration or expression
	 * @this {ParserInternals}
	 */
	_parseFunctionAt(start, statement, allowExpressionBody, isAsync, forInit) {
		const node =
			/** @type {Node & { id: Identifier | null, generator: boolean, async: boolean }} */ (
				/** @type {unknown} */ (new FunctionNode(start))
			);
		if (this.type === tokTypes.star && statement & FUNC_HANGING_STATEMENT) {
			this.unexpected();
		}
		node.generator = this.eat(tokTypes.star);
		node.async = isAsync;
		if (statement & FUNC_STATEMENT) {
			node.id =
				statement & FUNC_NULLABLE_ID && this.type !== tokTypes.name
					? null
					: this.parseIdent();
			if (node.id && !(statement & FUNC_HANGING_STATEMENT)) {
				// Annex B: sloppy-mode function declarations bind like vars
				this.checkLValSimple(
					node.id,
					this.strict || node.generator || node.async
						? this.treatFunctionsAsVar
							? BIND_VAR
							: BIND_LEXICAL
						: /* BIND_FUNCTION */ 3
				);
			}
		}
		const oldYieldPos = this.yieldPos;
		const oldAwaitPos = this.awaitPos;
		const oldAwaitIdentPos = this.awaitIdentPos;
		this.yieldPos = 0;
		this.awaitPos = 0;
		this.awaitIdentPos = 0;
		this.enterScope(
			SCOPE_FUNCTION |
				(node.async ? SCOPE_ASYNC : 0) |
				(node.generator ? SCOPE_GENERATOR : 0)
		);
		if (!(statement & FUNC_STATEMENT)) {
			node.id = this.type === tokTypes.name ? this.parseIdent() : null;
		}
		this.parseFunctionParams(node);
		this.parseFunctionBody(node, allowExpressionBody, false, forInit);
		this.yieldPos = oldYieldPos;
		this.awaitPos = oldAwaitPos;
		this.awaitIdentPos = oldAwaitIdentPos;
		return /** @type {Expression} */ (
			/** @type {unknown} */ (
				this.finishNode(
					node,
					statement & FUNC_STATEMENT
						? "FunctionDeclaration"
						: "FunctionExpression"
				)
			)
		);
	}

	/**
	 * Owned `parseFunctionBody`, an exact-semantics copy of acorn 8's with
	 * `isSimpleParamList` inlined and computed once (acorn walks the params
	 * twice) — the fast-path gate pins it to acorn's own implementation.
	 * Non-lazy mode and plugin overrides delegate.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {Node} node function node being filled
	 * @param {boolean} isArrowFunction whether this is an arrow function
	 * @param {boolean} isMethod whether this is an object/class method
	 * @param {boolean | string=} forInit for-init context flag
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	parseFunctionBody(node, isArrowFunction, isMethod, forInit) {
		if (!this._funcFastPath) {
			return base.parseFunctionBody.call(
				this,
				node,
				isArrowFunction,
				isMethod,
				forInit
			);
		}
		const target =
			/** @type {Node & { id: Identifier | null, params: Node[], body: Node, expression: boolean }} */ (
				node
			);
		const isExpression = isArrowFunction && this.type !== tokTypes.braceL;
		const oldStrict = this.strict;
		let useStrict = false;
		if (isExpression) {
			target.body = this.parseMaybeAssign(forInit);
			target.expression = true;
			this.checkParams(node, false);
		} else {
			// acorn's isSimpleParamList, inlined and shared by both its call sites
			const params = target.params;
			let simpleParams = true;
			for (let i = 0; i < params.length; i++) {
				if (params[i].type !== "Identifier") {
					simpleParams = false;
					break;
				}
			}
			if (!oldStrict || !simpleParams) {
				useStrict = this.strictDirective(this.end);
				if (useStrict && !simpleParams) {
					this.raiseRecoverable(
						node.start,
						"Illegal 'use strict' directive in function with non-simple parameter list"
					);
				}
			}
			const oldLabels = this.labels;
			// pooled per nesting depth like _arrStack: one array per function body
			// otherwise, and labels are pushed, so stale entries must be dropped
			const labelsStack = this._labelsStack;
			const labelsDepth = this._labelsDepth++;
			let labels = labelsStack[labelsDepth];
			if (labels === undefined) labelsStack[labelsDepth] = labels = [];
			else labels.length = 0;
			this.labels = labels;
			if (useStrict) this.strict = true;
			this.checkParams(
				node,
				!oldStrict &&
					!useStrict &&
					!isArrowFunction &&
					!isMethod &&
					simpleParams
			);
			if (this.strict && target.id) {
				this.checkLValSimple(target.id, BIND_OUTSIDE);
			}
			target.body = this.parseBlock(false, undefined, useStrict && !oldStrict);
			target.expression = false;
			this.adaptDirectivePrologue(
				/** @type {Node & { body: Node[] }} */ (target.body).body
			);
			this._labelsDepth--;
			this.labels = oldLabels;
		}
		this.exitScope();
	}

	/**
	 * Owned `checkParams`: acorn allocates a dictionary-mode
	 * `Object.create(null)` clash record for every function body, but most
	 * functions cannot clash at all — no record is needed with duplicates
	 * allowed, for zero params, or for one plain-identifier param.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {Node} node function node whose params are checked
	 * @param {boolean} allowDuplicates whether duplicate param names are legal
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	checkParams(node, allowDuplicates) {
		const params = /** @type {Node & { params: Node[] }} */ (node).params;
		const nameHash =
			allowDuplicates ||
			params.length === 0 ||
			(params.length === 1 && params[0].type === "Identifier")
				? null
				: /** @type {Record<string, boolean>} */ (Object.create(null));
		for (let i = 0; i < params.length; i++) {
			this.checkLValInnerPattern(params[i], BIND_VAR, nameHash);
		}
	}

	/**
	 * Owned `toAssignable`, an exact-semantics copy of acorn 8's: retyped nodes
	 * land on shapes designed for them (`ObjectNode`, `RestSpreadNode`); the
	 * `AssignmentExpression` case keeps acorn's `delete` for the output key
	 * set, at the cost of dictionary mode on that one node. Non-lazy mode
	 * delegates.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/lval.js
	 * @param {Node} node expression to convert in place
	 * @param {boolean=} isBinding whether converting a binding pattern
	 * @param {DestructuringErrorsShim | null=} refDestructuringErrors destructuring errors to flush
	 * @returns {Node} the converted node
	 * @this {ParserInternals}
	 */
	toAssignable(node, isBinding, refDestructuringErrors) {
		if (!this._lazy) {
			return base.toAssignable.call(
				this,
				node,
				isBinding,
				refDestructuringErrors
			);
		}
		if (this._ecmaVersion >= 6 && node) {
			const target =
				/** @type {Node & { name?: string, properties?: Node[], elements?: (Node | null)[], argument?: Node, value?: Node, key?: Node, kind?: string, operator?: string, left?: Node, expression?: Node }} */ (
					node
				);
			switch (node.type) {
				case "Identifier":
					if (this.inAsync && target.name === "await") {
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
				case "ObjectExpression": {
					node.type = "ObjectPattern";
					if (refDestructuringErrors) {
						this.checkPatternErrors(refDestructuringErrors, true);
					}
					const properties = /** @type {Node[]} */ (target.properties);
					for (let i = 0; i < properties.length; i++) {
						const prop =
							/** @type {Node & { argument?: Node }} */
							(properties[i]);
						this.toAssignable(prop, isBinding);
						// a rest property's target must not be a nested pattern
						const restArgument = /** @type {Node | undefined} */ (
							prop.argument
						);
						if (
							prop.type === "RestElement" &&
							restArgument !== undefined &&
							(restArgument.type === "ArrayPattern" ||
								restArgument.type === "ObjectPattern")
						) {
							this.raise(
								/** @type {Node} */ (prop.argument).start,
								"Unexpected token"
							);
						}
					}
					break;
				}
				case "Property":
					// AssignmentProperty has type === "Property"
					if (target.kind !== "init") {
						this.raise(
							/** @type {Node} */ (target.key).start,
							"Object pattern can't contain getter or setter"
						);
					}
					this.toAssignable(/** @type {Node} */ (target.value), isBinding);
					break;
				case "ArrayExpression":
					node.type = "ArrayPattern";
					if (refDestructuringErrors) {
						this.checkPatternErrors(refDestructuringErrors, true);
					}
					this.toAssignableList(
						/** @type {Node[]} */ (target.elements),
						Boolean(isBinding)
					);
					break;
				case "SpreadElement":
					node.type = "RestElement";
					this.toAssignable(/** @type {Node} */ (target.argument), isBinding);
					if (
						/** @type {Node} */ (target.argument).type === "AssignmentPattern"
					) {
						this.raise(
							/** @type {Node} */ (target.argument).start,
							"Rest elements cannot have a default value"
						);
					}
					break;
				case "AssignmentExpression":
					if (target.operator !== "=") {
						this.raise(
							/** @type {Node} */ (target.left).end,
							"Only '=' operator can be used for specifying default value."
						);
					}
					node.type = "AssignmentPattern";
					delete target.operator;
					this.toAssignable(/** @type {Node} */ (target.left), isBinding);
					break;
				case "ParenthesizedExpression":
					this.toAssignable(
						/** @type {Node} */ (target.expression),
						isBinding,
						refDestructuringErrors
					);
					break;
				case "ChainExpression":
					this.raiseRecoverable(
						node.start,
						"Optional chaining cannot appear in left-hand side"
					);
					break;
				case "MemberExpression":
					if (!isBinding) break;
				// falls through
				default:
					this.raise(node.start, "Assigning to rvalue");
			}
		} else if (refDestructuringErrors) {
			this.checkPatternErrors(refDestructuringErrors, true);
		}
		return node;
	}

	/**
	 * Owned `toAssignableList`, acorn's verbatim. Non-lazy mode delegates.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/lval.js
	 * @param {Node[]} exprList expressions to convert in place
	 * @param {boolean} isBinding whether converting binding patterns
	 * @returns {Node[]} the converted list
	 * @this {ParserInternals}
	 */
	toAssignableList(exprList, isBinding) {
		if (!this._lazy) {
			return base.toAssignableList.call(this, exprList, isBinding);
		}
		const end = exprList.length;
		for (let i = 0; i < end; i++) {
			const element = exprList[i];
			if (element) this.toAssignable(element, isBinding);
		}
		if (end) {
			const last = /** @type {Node & { argument?: Node }} */ (
				exprList[end - 1]
			);
			if (
				this._ecmaVersion === 6 &&
				isBinding &&
				last &&
				last.type === "RestElement" &&
				/** @type {Node} */ (last.argument).type !== "Identifier"
			) {
				this.unexpected(/** @type {Node} */ (last.argument).start);
			}
		}
		return exprList;
	}

	/**
	 * Owned `parseMaybeDefault` landing on `AssignmentPatternNode`'s single
	 * shape. Non-lazy mode delegates.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/lval.js
	 * @param {number} startPos pattern start offset
	 * @param {Position=} startLoc pattern start position
	 * @param {Node=} left already-parsed binding target
	 * @returns {Node} binding target, possibly wrapped in a default pattern
	 * @this {ParserInternals}
	 */
	parseMaybeDefault(startPos, startLoc, left) {
		if (!this._lazy) {
			return base.parseMaybeDefault.call(this, startPos, startLoc, left);
		}
		left = left || this.parseBindingAtom();
		if (this._ecmaVersion < 6 || !this.eat(tokTypes.eq)) return left;
		const right = this.parseMaybeAssign();
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				new AssignmentPatternNode(startPos, this.lastTokEnd, left, right)
			)
		);
	}

	/**
	 * Owned `parseRestBinding` landing on `RestSpreadNode`'s single shape.
	 * Non-lazy mode delegates.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/lval.js
	 * @returns {Node} rest element
	 * @this {ParserInternals}
	 */
	parseRestBinding() {
		if (!this._lazy) return base.parseRestBinding.call(this);
		const start = this.start;
		this.next();
		// a rest element inside a function parameter must be an identifier in ES6
		if (this._ecmaVersion === 6 && this.type !== tokTypes.name) {
			this.unexpected();
		}
		const argument = this.parseBindingAtom();
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				new RestSpreadNode(start, this.lastTokEnd, "RestElement", argument)
			)
		);
	}

	/**
	 * Owned `parseBindingAtom`: acorn's exact dispatch minus the per-call
	 * normalized-options read. Non-lazy mode and pre-ES6 delegate.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/lval.js
	 * @returns {Node} binding atom (identifier or pattern)
	 * @this {ParserInternals}
	 */
	parseBindingAtom() {
		if (!this._lazy || this._ecmaVersion < 6) {
			return base.parseBindingAtom.call(this);
		}
		const type = this.type;
		if (type === tokTypes.bracketL) {
			const node = /** @type {Node & { elements?: Node[] }} */ (
				this.startNode()
			);
			this.next();
			node.elements = this.parseBindingList(tokTypes.bracketR, true, true);
			return this.finishNode(node, "ArrayPattern");
		}
		if (type === tokTypes.braceL) return this.parseObj(true);
		return this.parseIdent();
	}

	/**
	 * Owned `parseExprSubscripts`, an exact copy of acorn 8's with the arrow
	 * probe served by `_lastArrow` identity. Delegates when the fast path is off.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {DestructuringErrorsShim | null=} refDestructuringErrors destructuring errors to fill
	 * @param {boolean | string=} forInit for-init context flag
	 * @returns {Expression} expression node
	 * @this {ParserInternals}
	 */
	parseExprSubscripts(refDestructuringErrors, forInit) {
		if (!this._arrowFastPath) {
			return base.parseExprSubscripts.call(
				this,
				refDestructuringErrors,
				forInit
			);
		}
		const startPos = this.start;
		const startLoc = this.startLoc;
		const expr = this.parseExprAtom(refDestructuringErrors, forInit);
		if (
			expr === this._lastArrow &&
			// acorn compares the last token's text against ")"; a ")" token always
			// spans exactly one char, so two offset probes replace the gap slice
			!(
				this.lastTokEnd - this.lastTokStart === 1 &&
				this.input.charCodeAt(this.lastTokStart) === 41
			)
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
	 * Owned `parseExprList`, an exact-semantics copy of acorn 8's built in a
	 * scratch array and materialized exactly sized. Non-lazy mode delegates.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {TokenType} close closing token type
	 * @param {boolean} allowTrailingComma whether a trailing comma is allowed
	 * @param {boolean} allowEmpty whether holes are allowed
	 * @param {DestructuringErrorsShim | null=} refDestructuringErrors destructuring errors to fill
	 * @returns {Expression[]} parsed elements (`null` for holes)
	 * @this {ParserInternals}
	 */
	parseExprList(close, allowTrailingComma, allowEmpty, refDestructuringErrors) {
		if (!this._lazy) {
			return base.parseExprList.call(
				this,
				close,
				allowTrailingComma,
				allowEmpty,
				refDestructuringErrors
			);
		}
		const scratch = this._acquireScratch();
		let count = 0;
		let first = true;
		while (!this.eat(close)) {
			if (!first) {
				this.expect(tokTypes.comma);
				if (allowTrailingComma && this.afterTrailingComma(close)) break;
			} else {
				first = false;
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
			scratch[count++] = elt;
		}
		return this._releaseScratch(scratch, count);
	}

	/**
	 * Owned `parseBindingList`, an exact-semantics copy of acorn 8's built in a
	 * scratch array and materialized exactly sized. Non-lazy mode delegates.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/lval.js
	 * @param {TokenType} close closing token type
	 * @param {boolean} allowEmpty whether holes are allowed
	 * @param {boolean} allowTrailingComma whether a trailing comma is allowed
	 * @param {boolean=} allowModifiers passed through to `parseAssignableListItem`
	 * @returns {Node[]} parsed bindings (`null` for holes)
	 * @this {ParserInternals}
	 */
	parseBindingList(close, allowEmpty, allowTrailingComma, allowModifiers) {
		if (!this._lazy) {
			return base.parseBindingList.call(
				this,
				close,
				allowEmpty,
				allowTrailingComma,
				allowModifiers
			);
		}
		const scratch = this._acquireScratch();
		let count = 0;
		let first = true;
		while (!this.eat(close)) {
			if (first) first = false;
			else this.expect(tokTypes.comma);
			if (allowEmpty && this.type === tokTypes.comma) {
				scratch[count++] = null;
			} else if (allowTrailingComma && this.afterTrailingComma(close)) {
				break;
			} else if (this.type === tokTypes.ellipsis) {
				const rest = this.parseRestBinding();
				this.parseBindingListItem(rest);
				scratch[count++] = rest;
				if (this.type === tokTypes.comma) {
					this.raiseRecoverable(
						this.start,
						"Comma is not permitted after the rest element"
					);
				}
				this.expect(close);
				break;
			} else {
				scratch[count++] = this.parseAssignableListItem(allowModifiers);
			}
		}
		return this._releaseScratch(scratch, count);
	}

	/**
	 * Owned `parseParenAndDistinguishExpression`, an exact-semantics copy of
	 * acorn 8's with the per-paren `DestructuringErrors` record pooled and the
	 * expression list built in a scratch array. Non-lazy mode delegates (the
	 * copy assumes ES6+, which `_lazy` guarantees via `ecmaVersion: "latest"`).
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {boolean} canBeArrow whether this may be an arrow head
	 * @param {boolean | string} forInit for-init context flag
	 * @returns {Expression} expression node
	 * @this {ParserInternals}
	 */
	parseParenAndDistinguishExpression(canBeArrow, forInit) {
		if (!this._lazy || this._ecmaVersion < 6) {
			return base.parseParenAndDistinguishExpression.call(
				this,
				canBeArrow,
				forInit
			);
		}
		const startPos = this.start;
		const startLoc = this.startLoc;
		const allowTrailingComma = this._ecmaVersion >= 8;
		this.next();

		const innerStartPos = this.start;
		const innerStartLoc = this.startLoc;
		const scratch = this._acquireScratch();
		let count = 0;
		let first = true;
		let lastIsComma = false;
		const refDestructuringErrors = this._acquireDestructuringErrors();
		const oldYieldPos = this.yieldPos;
		const oldAwaitPos = this.awaitPos;
		let spreadStart;
		this.yieldPos = 0;
		this.awaitPos = 0;
		// Do not save awaitIdentPos to allow checking awaits nested in parameters
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
				scratch[count++] = this.parseParenItem(this.parseRestBinding());
				if (this.type === tokTypes.comma) {
					this.raiseRecoverable(
						this.start,
						"Comma is not permitted after the rest element"
					);
				}
				break;
			} else {
				scratch[count++] = this.parseMaybeAssign(
					false,
					refDestructuringErrors,
					/** @type {(this: unknown, left: Expression, startPos: number, startLoc?: Position) => Expression} */ (
						/** @type {unknown} */ (this.parseParenItem)
					)
				);
			}
		}
		const exprList = this._releaseScratch(scratch, count);
		const innerEndPos = this.lastTokEnd;
		this.expect(tokTypes.parenR);

		if (
			canBeArrow &&
			this.shouldParseArrow(exprList) &&
			this.eat(tokTypes.arrow)
		) {
			this.checkPatternErrors(refDestructuringErrors, false);
			this.checkYieldAwaitInDefaultParams();
			// last read of the pooled record was above, so the arrow body parse
			// below can already reuse its pool slot
			this._releaseDestructuringErrors();
			this.yieldPos = oldYieldPos;
			this.awaitPos = oldAwaitPos;
			return this.parseParenArrowList(startPos, startLoc, exprList, forInit);
		}

		if (exprList.length === 0 || lastIsComma) {
			this.unexpected(this.lastTokStart);
		}
		if (spreadStart) this.unexpected(spreadStart);
		this.checkExpressionErrors(refDestructuringErrors, true);
		this._releaseDestructuringErrors();
		this.yieldPos = oldYieldPos || this.yieldPos;
		this.awaitPos = oldAwaitPos || this.awaitPos;

		/** @type {Expression} */
		let val;
		if (exprList.length > 1) {
			const seq = /** @type {Node & { expressions?: Expression[] }} */ (
				this.startNodeAt(innerStartPos, innerStartLoc)
			);
			seq.expressions = exprList;
			this.finishNodeAt(
				/** @type {Node} */ (seq),
				"SequenceExpression",
				innerEndPos,
				undefined
			);
			val = /** @type {Expression} */ (/** @type {unknown} */ (seq));
		} else {
			val = exprList[0];
		}

		if (this.options.preserveParens) {
			const par = /** @type {Node & { expression?: Expression }} */ (
				this.startNodeAt(startPos, startLoc)
			);
			par.expression = val;
			return /** @type {Expression} */ (
				/** @type {unknown} */ (
					this.finishNode(/** @type {Node} */ (par), "ParenthesizedExpression")
				)
			);
		}
		return val;
	}

	/**
	 * Owned `afterTrailingComma`, acorn's verbatim (mode-independent), so the
	 * owned list parsers do not bounce through the dist for each element.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/parseutil.js
	 * @param {TokenType} tokType closing token type
	 * @param {boolean=} notNext whether to leave the closing token unconsumed
	 * @returns {boolean} true when the list ended on a trailing comma
	 * @this {ParserInternals}
	 */
	afterTrailingComma(tokType, notNext) {
		if (this.type === tokType) {
			const onTrailingComma =
				/** @type {Options & { onTrailingComma?: (pos: number, loc?: Position) => void }} */
				(this.options).onTrailingComma;
			if (onTrailingComma) {
				onTrailingComma(
					this.lastTokStart,
					/** @type {Position | undefined} */ (
						this.lastTokStartLoc === null ? undefined : this.lastTokStartLoc
					)
				);
			}
			if (!notNext) this.next();
			return true;
		}
		return false;
	}

	/**
	 * Owned `checkExpressionErrors`, acorn's verbatim (mode-independent): it
	 * runs several times per expression from the owned spine.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/parseutil.js
	 * @param {DestructuringErrorsShim | null=} refDestructuringErrors record to inspect
	 * @param {boolean=} andThrow whether to throw on error
	 * @returns {boolean} whether an error position was set
	 * @this {ParserInternals}
	 */
	checkExpressionErrors(refDestructuringErrors, andThrow) {
		if (!refDestructuringErrors) return false;
		const shorthandAssign = refDestructuringErrors.shorthandAssign;
		const doubleProto = refDestructuringErrors.doubleProto;
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
		return false;
	}

	/**
	 * Owned `parseExpression`: acorn wraps every call in `catchStackOverflow`,
	 * allocating a fresh closure per expression; inline the try/catch instead
	 * (same overflow-message translation, no closure). Non-lazy mode delegates.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {boolean | string=} forInit for-init context flag
	 * @param {DestructuringErrorsShim | null=} refDestructuringErrors destructuring errors to fill
	 * @returns {Expression} expression node
	 * @this {ParserInternals}
	 */
	parseExpression(forInit, refDestructuringErrors) {
		if (!this._lazy) {
			return base.parseExpression.call(this, forInit, refDestructuringErrors);
		}
		try {
			const startPos = this.start;
			const startLoc = this.startLoc;
			const expr = this.parseMaybeAssign(forInit, refDestructuringErrors);
			if (this.type === tokTypes.comma) {
				const node =
					/** @type {Node & { expressions?: Expression[] }} */
					(this.startNodeAt(startPos, startLoc));
				node.expressions = [expr];
				while (this.eat(tokTypes.comma)) {
					node.expressions.push(
						this.parseMaybeAssign(forInit, refDestructuringErrors)
					);
				}
				return /** @type {Expression} */ (
					/** @type {unknown} */ (this.finishNode(node, "SequenceExpression"))
				);
			}
			return expr;
		} catch (err) {
			// acorn's catchStackOverflow: translate an engine stack-overflow error
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
	 * Owned `parseNew`, an exact-semantics copy of acorn 8's: `NewExpression`
	 * lands on `NewExpressionNode`'s single shape (zero-argument calls share
	 * one empty array like acorn's `empty`); the rare `new.target` path keeps
	 * the generic node. Non-lazy mode delegates.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @returns {Expression} new expression or meta property
	 * @this {ParserInternals}
	 */
	parseNew() {
		if (!this._lazy) return base.parseNew.call(this);
		if (this.containsEsc) {
			this.raiseRecoverable(this.start, "Escape sequence in keyword new");
		}
		const nodeStart = this.start;
		this.next();
		if (this._ecmaVersion >= 6 && this.type === tokTypes.dot) {
			const node =
				/** @type {Node & { meta?: Node, property?: Identifier }} */
				(this.startNodeAt(nodeStart, undefined));
			const meta =
				/** @type {Node & { name?: string }} */
				(this.startNodeAt(nodeStart, undefined));
			meta.name = "new";
			node.meta = this.finishNode(/** @type {Node} */ (meta), "Identifier");
			this.next();
			const containsEsc = this.containsEsc;
			node.property = this.parseIdent(true);
			if (node.property.name !== "target") {
				this.raiseRecoverable(
					node.property.start,
					"The only valid meta property for new is 'new.target'"
				);
			}
			if (containsEsc) {
				this.raiseRecoverable(
					nodeStart,
					"'new.target' must not contain escaped characters"
				);
			}
			if (!this.allowNewDotTarget) {
				this.raiseRecoverable(
					nodeStart,
					"'new.target' can only be used in functions and class static block"
				);
			}
			return /** @type {Expression} */ (
				/** @type {unknown} */ (this.finishNode(node, "MetaProperty"))
			);
		}
		const startPos = this.start;
		const startLoc = this.startLoc;
		const callee = this.parseSubscripts(
			this.parseExprAtom(null, false, true),
			startPos,
			startLoc,
			true,
			false
		);
		if (/** @type {string} */ (callee.type) === "Super") {
			this.raiseRecoverable(startPos, "Invalid use of 'super'");
		}
		/** @type {Expression[]} */
		const args = this.eat(tokTypes.parenL)
			? this.parseExprList(tokTypes.parenR, this._ecmaVersion >= 8, false)
			: EMPTY_NEW_ARGS;
		return /** @type {Expression} */ (
			/** @type {unknown} */ (
				new NewExpressionNode(nodeStart, this.lastTokEnd, callee, args)
			)
		);
	}

	/**
	 * Owned `parseTemplateElement` landing on `TemplateElementNode`'s single
	 * shape; matches acorn's CRLF normalization and invalid-escape handling.
	 * Non-lazy mode delegates.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {{ isTagged: boolean }} opts whether the template is tagged
	 * @returns {Node} template element
	 * @this {ParserInternals}
	 */
	parseTemplateElement(opts) {
		if (!this._lazy) return base.parseTemplateElement.call(this, opts);
		const start = this.start;
		/** @type {{ raw: string, cooked: string | null }} */
		let value;
		if (this.type === tokTypes.invalidTemplate) {
			if (!opts.isTagged) {
				this.raiseRecoverable(
					this.start,
					"Bad escape sequence in untagged template literal"
				);
			}
			value = {
				raw: /** @type {string} */ (this.value).replace(/\r\n?/g, "\n"),
				cooked: null
			};
		} else {
			const cooked = /** @type {string} */ (this.value);
			// Every escape cooks strictly shorter and CRLF shortens, while a lone CR
			// cooks to the LF the raw normalization would produce — so an
			// equal-length cooked string IS the normalized raw. That covers every
			// fast-path chunk (no backslash, no CR): raw and cooked share one string.
			value = {
				raw:
					cooked.length === this.end - this.start
						? cooked
						: this.input.slice(this.start, this.end).replace(/\r\n?/g, "\n"),
				cooked
			};
		}
		this.next();
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				new TemplateElementNode(
					start,
					this.lastTokEnd,
					value,
					this.type === tokTypes.backQuote
				)
			)
		);
	}

	/**
	 * Owned `parseTemplate` landing on `TemplateLiteralNode`'s single shape.
	 * Non-lazy mode delegates.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {{ isTagged?: boolean }=} opts whether the template is tagged
	 * @returns {Node} template literal
	 * @this {ParserInternals}
	 */
	parseTemplate(opts) {
		if (!this._lazy) {
			return base.parseTemplate.call(
				this,
				/** @type {{ isTagged: boolean }} */ (opts)
			);
		}
		const isTagged = (opts !== undefined && opts.isTagged) === true;
		const start = this.start;
		this.next();
		const exprScratch = this._acquireScratch();
		const quasiScratch = this._acquireScratch();
		let exprCount = 0;
		let quasiCount = 0;
		// one options object for all chunks (only `isTagged` is ever read)
		const eltOpts = { isTagged };
		let curElt = /** @type {Node & { tail?: boolean }} */ (
			this.parseTemplateElement(eltOpts)
		);
		quasiScratch[quasiCount++] = curElt;
		while (!curElt.tail) {
			if (this.type === tokTypes.eof) {
				this.raise(this.pos, "Unterminated template literal");
			}
			this.expect(tokTypes.dollarBraceL);
			exprScratch[exprCount++] = this.parseExpression();
			this.expect(tokTypes.braceR);
			curElt = /** @type {Node & { tail?: boolean }} */ (
				this.parseTemplateElement(eltOpts)
			);
			quasiScratch[quasiCount++] = curElt;
		}
		this.next();
		const quasis = this._releaseScratch(quasiScratch, quasiCount);
		const expressions = this._releaseScratch(exprScratch, exprCount);
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				new TemplateLiteralNode(start, this.lastTokEnd, expressions, quasis)
			)
		);
	}

	/**
	 * Owned `parseMaybeUnary`, an exact-semantics copy of acorn 8's: prefix
	 * unary/update and postfix update nodes are built fully-formed on
	 * `UnaryNode`'s shared single shape. Non-lazy mode delegates to acorn.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {DestructuringErrorsShim | null} refDestructuringErrors destructuring errors to fill
	 * @param {boolean} sawUnary whether a unary operator was already consumed
	 * @param {boolean} incDec whether the caller was an update operator
	 * @param {boolean | string=} forInit for-init context flag
	 * @returns {Expression} expression node
	 * @this {ParserInternals}
	 */
	parseMaybeUnary(refDestructuringErrors, sawUnary, incDec, forInit) {
		if (!this._lazy) {
			return base.parseMaybeUnary.call(
				this,
				refDestructuringErrors,
				sawUnary,
				incDec,
				forInit
			);
		}
		const startPos = this.start;
		const startLoc = this.startLoc;
		/** @type {Expression} */
		let expr;
		if (this.isContextual("await") && this.canAwait) {
			expr = this.parseAwait(forInit);
			sawUnary = true;
		} else if (/** @type {TokenTypeInternal} */ (this.type).prefix) {
			const update = this.type === tokTypes.incDec;
			const operator = /** @type {string} */ (this.value);
			this.next();
			const argument = this.parseMaybeUnary(null, true, update, forInit);
			this.checkExpressionErrors(refDestructuringErrors, true);
			if (update) {
				this.checkLValSimple(argument);
			} else if (
				this.strict &&
				operator === "delete" &&
				isLocalVariableAccess(argument)
			) {
				this.raiseRecoverable(
					startPos,
					"Deleting local variable in strict mode"
				);
			} else if (operator === "delete" && isPrivateFieldAccess(argument)) {
				this.raiseRecoverable(startPos, "Private fields can not be deleted");
			} else {
				sawUnary = true;
			}
			expr = /** @type {Expression} */ (
				/** @type {unknown} */ (
					new UnaryNode(
						startPos,
						this.lastTokEnd,
						update ? "UpdateExpression" : "UnaryExpression",
						operator,
						true,
						argument
					)
				)
			);
		} else if (!sawUnary && this.type === tokTypes.privateId) {
			if (
				(forInit || this.privateNameStack.length === 0) &&
				this.options.checkPrivateFields
			) {
				this.unexpected();
			}
			expr = /** @type {Expression} */ (
				/** @type {unknown} */ (this.parsePrivateIdent())
			);
			// a private name is only valid as `#x in obj`
			if (this.type !== tokTypes._in) this.unexpected();
		} else {
			expr = this.parseExprSubscripts(refDestructuringErrors, forInit);
			if (this.checkExpressionErrors(refDestructuringErrors)) return expr;
			while (
				/** @type {TokenTypeInternal} */ (this.type).postfix &&
				!this.canInsertSemicolon()
			) {
				const operator = /** @type {string} */ (this.value);
				this.checkLValSimple(expr);
				this.next();
				expr = /** @type {Expression} */ (
					/** @type {unknown} */ (
						new UnaryNode(
							startPos,
							this.lastTokEnd,
							"UpdateExpression",
							operator,
							false,
							expr
						)
					)
				);
			}
		}

		if (!incDec && this.type === tokTypes.starstar) {
			// acorn 8.18: `**` must not take a naked arrow function as its left
			// operand; leaving the token unconsumed makes the caller raise there
			const isArrowAtStart = this._arrowFastPath
				? expr === this._lastArrow && expr.start === startPos
				: expr.type === "ArrowFunctionExpression" && expr.start === startPos;
			if (!isArrowAtStart) {
				this.next();
				if (sawUnary) {
					this.unexpected(this.lastTokStart);
				} else {
					return this.buildBinary(
						startPos,
						startLoc,
						expr,
						this.parseMaybeUnary(null, false, false, forInit),
						"**",
						false
					);
				}
			}
		}
		return expr;
	}

	/**
	 * Collapses the commonest expression shape — a name/number/string/keyword
	 * literal or `this` whose next source character can only begin a token that
	 * cannot continue an expression — into the atom, skipping the seven-layer
	 * `parseMaybeAssign` → `parseExprAtom` descent and its destructuring-error
	 * bookkeeping (which is a net no-op for a bare atom).
	 * @param {boolean | string=} forInit for-init context flag
	 * @returns {Expression | null} the atom, or `null` when the shape does not apply
	 * @this {ParserInternals}
	 */
	_parseTrivialAtom(forInit) {
		const code = this.input.charCodeAt(this.end);
		if (code >= 128 || EXPRESSION_END_CHAR[code] !== 1) return null;
		const type = this.type;
		if (type === tokTypes.name) {
			// both steer the chain themselves (`yield x`, `await x`)
			const name = /** @type {string} */ (this.value);
			if (name === "yield" || name === "await") return null;
			this.potentialArrowAt = this.start;
			this.potentialArrowInForAwait = forInit === "await";
			return /** @type {Expression} */ (
				/** @type {unknown} */ (this.parseIdent(false))
			);
		}
		if (type === tokTypes.num || type === tokTypes.string) {
			return /** @type {Expression} */ (
				/** @type {unknown} */ (this.parseLiteral(this.value))
			);
		}
		if (type === tokTypes._this) {
			const node = new ThisNode(this.start, this.end);
			this.next();
			return /** @type {Expression} */ (/** @type {unknown} */ (node));
		}
		if (
			type === tokTypes._null ||
			type === tokTypes._true ||
			type === tokTypes._false
		) {
			const node = new LiteralNode(
				this.start,
				this.end,
				type === tokTypes._null ? null : type === tokTypes._true,
				/** @type {string} */ (type.keyword)
			);
			this.next();
			return /** @type {Expression} */ (/** @type {unknown} */ (node));
		}
		return null;
	}

	/**
	 * Owned `parseMaybeAssign`, an exact-semantics copy of acorn 8's: the
	 * operator is captured before `next()` and the `AssignmentExpression` is
	 * built fully-formed on `AssignmentNode`'s single shape after the
	 * right-hand parse. Yield and non-lazy mode delegate to acorn.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {boolean | string=} forInit for-init context flag
	 * @param {DestructuringErrorsShim | null=} refDestructuringErrors destructuring errors to fill
	 * @param {((this: unknown, left: Expression, startPos: number, startLoc?: Position) => Expression)=} afterLeftParse hook applied to the parsed left side
	 * @returns {Expression} expression node
	 * @this {ParserInternals}
	 */
	parseMaybeAssign(forInit, refDestructuringErrors, afterLeftParse) {
		if (!this._lazy) {
			return base.parseMaybeAssign.call(
				this,
				forInit,
				refDestructuringErrors,
				afterLeftParse
			);
		}
		if (this._exprFastPath && afterLeftParse === undefined) {
			const atom = this._parseTrivialAtom(forInit);
			if (atom !== null) return atom;
		}
		if (this.isContextual("yield")) {
			if (this.inGenerator) return this.parseYield(forInit);
			// the tokenizer assumed an expression follows `yield`, but this
			// isn't that kind of yield
			this.exprAllowed = false;
		}

		let ownDestructuringErrors = false;
		let oldParenAssign = -1;
		let oldTrailingComma = -1;
		let oldDoubleProto = -1;
		if (refDestructuringErrors) {
			oldParenAssign = refDestructuringErrors.parenthesizedAssign;
			oldTrailingComma = refDestructuringErrors.trailingComma;
			oldDoubleProto = refDestructuringErrors.doubleProto;
			refDestructuringErrors.parenthesizedAssign =
				refDestructuringErrors.trailingComma = -1;
		} else {
			refDestructuringErrors = this._acquireDestructuringErrors();
			ownDestructuringErrors = true;
		}

		const startPos = this.start;
		const startLoc = this.startLoc;
		if (this.type === tokTypes.parenL || this.type === tokTypes.name) {
			this.potentialArrowAt = this.start;
			this.potentialArrowInForAwait = forInit === "await";
		}
		let left = this.parseMaybeConditional(forInit, refDestructuringErrors);
		if (afterLeftParse) {
			left = afterLeftParse.call(this, left, startPos, startLoc);
		}
		if (/** @type {TokenTypeInternal} */ (this.type).isAssign) {
			const operator = /** @type {string} */ (this.value);
			if (this.type === tokTypes.eq) {
				left = /** @type {Expression} */ (
					this.toAssignable(left, false, refDestructuringErrors)
				);
			}
			if (!ownDestructuringErrors) {
				refDestructuringErrors.parenthesizedAssign =
					refDestructuringErrors.trailingComma =
					refDestructuringErrors.doubleProto =
						-1;
			}
			if (refDestructuringErrors.shorthandAssign >= left.start) {
				// shorthand default was used correctly
				refDestructuringErrors.shorthandAssign = -1;
			}
			if (this.type === tokTypes.eq) this.checkLValPattern(left);
			else this.checkLValSimple(left);
			// the own record's last read was above, so the nested right-side
			// parse below can already reuse its pool slot
			if (ownDestructuringErrors) this._releaseDestructuringErrors();
			this.next();
			const right = this.parseMaybeAssign(forInit);
			if (oldDoubleProto > -1) {
				refDestructuringErrors.doubleProto = oldDoubleProto;
			}
			return /** @type {Expression} */ (
				/** @type {unknown} */ (
					new AssignmentNode(startPos, this.lastTokEnd, operator, left, right)
				)
			);
		} else if (ownDestructuringErrors) {
			this.checkExpressionErrors(refDestructuringErrors, true);
			this._releaseDestructuringErrors();
		}
		if (oldParenAssign > -1) {
			refDestructuringErrors.parenthesizedAssign = oldParenAssign;
		}
		if (oldTrailingComma > -1) {
			refDestructuringErrors.trailingComma = oldTrailingComma;
		}
		return left;
	}

	/**
	 * Owned `parseExprOps`, an exact copy of acorn 8's, so the hot expression
	 * spine (`parseMaybeAssign` → here → `parseMaybeUnary`) stays monomorphic
	 * on owned code. Non-lazy mode delegates.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {boolean | string=} forInit for-init context flag
	 * @param {DestructuringErrorsShim | null=} refDestructuringErrors destructuring errors to fill
	 * @returns {Expression} expression node
	 * @this {ParserInternals}
	 */
	parseExprOps(forInit, refDestructuringErrors) {
		if (!this._lazy) {
			return base.parseExprOps.call(this, forInit, refDestructuringErrors);
		}
		const startPos = this.start;
		const startLoc = this.startLoc;
		const expr = this.parseMaybeUnary(
			refDestructuringErrors || null,
			false,
			false,
			forInit
		);
		if (this.checkExpressionErrors(refDestructuringErrors)) return expr;
		const isArrow = this._arrowFastPath
			? expr === this._lastArrow && expr.start === startPos
			: expr.start === startPos && expr.type === "ArrowFunctionExpression";
		return isArrow
			? expr
			: this.parseExprOp(expr, startPos, startLoc, -1, forInit);
	}

	/**
	 * Owned `parseExprOp`, an exact-semantics copy of acorn 8's with the
	 * same-precedence continuation turned from tail recursion into a loop —
	 * `a + b + c + d` runs one frame instead of one per operator. Non-lazy mode
	 * delegates.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {Expression} left left operand
	 * @param {number} leftStartPos expression start offset
	 * @param {Position | undefined} leftStartLoc expression start position
	 * @param {number} minPrec minimal binding precedence to continue
	 * @param {boolean | string=} forInit for-init context flag (excludes `in`)
	 * @returns {Expression} expression node
	 * @this {ParserInternals}
	 */
	parseExprOp(left, leftStartPos, leftStartLoc, minPrec, forInit) {
		if (!this._lazy) {
			return base.parseExprOp.call(
				this,
				left,
				leftStartPos,
				leftStartLoc,
				minPrec,
				forInit
			);
		}
		for (;;) {
			const type = /** @type {TokenTypeInternal} */ (this.type);
			let prec = type.binop;
			// acorn's TokenType sets binop to null (never undefined) when absent
			if (
				prec === null ||
				prec <= minPrec ||
				(forInit && type === tokTypes._in)
			) {
				return left;
			}
			const logical =
				type === tokTypes.logicalOR || type === tokTypes.logicalAND;
			const coalesce = type === tokTypes.coalesce;
			if (coalesce) {
				// acorn parses `??`'s right at logical precedence so the mixing
				// check below sees any unparenthesized `&&`/`||` as a sibling
				prec = /** @type {number} */ (
					/** @type {TokenTypeInternal} */ (tokTypes.logicalAND).binop
				);
			}
			const op = /** @type {string} */ (this.value);
			this.next();
			const startPos = this.start;
			const right = this.parseExprOp(
				this.parseMaybeUnary(null, false, false, forInit),
				startPos,
				this.startLoc,
				prec,
				forInit
			);
			left = this.buildBinary(
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
		}
	}

	/**
	 * Owned `buildBinary` (acorn calls it only from `parseExprOp`): binary and
	 * logical nodes are built fully-formed on `BinaryNode`'s single shape.
	 * Non-lazy mode delegates to acorn.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {number} startPos expression start offset
	 * @param {Position | undefined} startLoc expression start position
	 * @param {Expression} left left operand
	 * @param {Expression} right right operand
	 * @param {string} op operator text
	 * @param {boolean} logical whether this is a logical/coalesce expression
	 * @returns {Expression} binary or logical expression node
	 * @this {ParserInternals}
	 */
	buildBinary(startPos, startLoc, left, right, op, logical) {
		if (!this._lazy) {
			return base.buildBinary.call(
				this,
				startPos,
				startLoc,
				left,
				right,
				op,
				logical
			);
		}
		const rightNode = /** @type {Node} */ (/** @type {unknown} */ (right));
		if (rightNode.type === "PrivateIdentifier") {
			this.raise(
				rightNode.start,
				"Private identifier can only be left side of binary expression"
			);
		}
		return /** @type {Expression} */ (
			/** @type {unknown} */ (
				new BinaryNode(
					startPos,
					this.lastTokEnd,
					logical ? "LogicalExpression" : "BinaryExpression",
					left,
					op,
					right
				)
			)
		);
	}

	/**
	 * Owned `parseExprAtom` for the hot atoms: identifiers (with acorn's exact
	 * async-function/async-arrow detection), number/string literals, keyword
	 * literals (`true`/`false`/`null` — on the same `LiteralNode` shape as the
	 * rest) and `this`. Everything else, and non-lazy mode, delegates to acorn.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {DestructuringErrorsShim | null=} refDestructuringErrors destructuring errors to fill
	 * @param {boolean | string=} forInit for-init context flag
	 * @param {boolean=} forNew whether parsed as a `new` callee
	 * @returns {Expression} expression atom
	 * @this {ParserInternals}
	 */
	parseExprAtom(refDestructuringErrors, forInit, forNew) {
		if (!this._lazy) {
			return base.parseExprAtom.call(
				this,
				refDestructuringErrors,
				forInit,
				forNew
			);
		}
		// division in expression position: the tokenizer got confused, force a
		// regexp re-read (mirrors the top of acorn's parseExprAtom)
		if (this.type === tokTypes.slash) this.readRegexp();
		const type = this.type;
		if (type === tokTypes.name) {
			const canBeArrow = this.potentialArrowAt === this.start;
			const startPos = this.start;
			const startLoc = this.startLoc;
			const containsEsc = this.containsEsc;
			let id = this.parseIdent(false);
			// `async` compare first — almost every identifier fails it, skipping
			// the version probe (all operands are pure)
			if (
				id.name === "async" &&
				!containsEsc &&
				this._ecmaVersion >= 8 &&
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
					id.name === "async" &&
					!containsEsc &&
					this._ecmaVersion >= 8 &&
					this.type === tokTypes.name &&
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
		if (type === tokTypes.num || type === tokTypes.string) {
			return /** @type {Expression} */ (
				/** @type {unknown} */ (this.parseLiteral(this.value))
			);
		}
		if (
			type === tokTypes._null ||
			type === tokTypes._true ||
			type === tokTypes._false
		) {
			const node = new LiteralNode(
				this.start,
				this.end,
				type === tokTypes._null ? null : type === tokTypes._true,
				/** @type {string} */ (type.keyword)
			);
			this.next();
			return /** @type {Expression} */ (/** @type {unknown} */ (node));
		}
		if (type === tokTypes._this) {
			const node = new ThisNode(this.start, this.end);
			this.next();
			return /** @type {Expression} */ (/** @type {unknown} */ (node));
		}
		if (type === tokTypes.bracketL) {
			const start = this.start;
			this.next();
			const elements = this.parseExprList(
				tokTypes.bracketR,
				true,
				true,
				refDestructuringErrors
			);
			return /** @type {Expression} */ (
				/** @type {unknown} */ (
					new ArrayExpressionNode(start, this.lastTokEnd, elements)
				)
			);
		}
		// the remaining hot atoms only dispatch to methods owned above, so the
		// bounce through acorn's own switch is skipped (acorn's exact bodies)
		if (type === tokTypes.parenL) {
			const canBeArrow = this.potentialArrowAt === this.start;
			const start = this.start;
			const expr = this.parseParenAndDistinguishExpression(canBeArrow, forInit);
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
		if (type === tokTypes.braceL) {
			this.overrideContext(CTX_B_EXPR);
			return /** @type {Expression} */ (
				/** @type {unknown} */ (this.parseObj(false, refDestructuringErrors))
			);
		}
		if (type === tokTypes._function) {
			if (this._funcStmtOwn) {
				const start = this.start;
				this.next();
				return this._parseFunctionAt(start, 0, false, false, undefined);
			}
			const node = this.startNode();
			this.next();
			return this.parseFunction(node, 0);
		}
		if (type === tokTypes._new) return this.parseNew();
		if (type === tokTypes.backQuote) {
			return /** @type {Expression} */ (
				/** @type {unknown} */ (this.parseTemplate())
			);
		}
		if (type === tokTypes._class) {
			return /** @type {Expression} */ (
				/** @type {unknown} */ (this.parseClass(this.startNode(), false))
			);
		}
		if (type === tokTypes._import && this._ecmaVersion >= 11) {
			return this.parseExprImport(forNew === true);
		}
		if (type === tokTypes._super) {
			if (!this.allowSuper) {
				this.raise(this.start, "'super' keyword outside a method");
			}
			const node = this.startNode();
			this.next();
			if (this.type === tokTypes.parenL && !this.allowDirectSuper) {
				this.raise(
					node.start,
					"super() call outside constructor of a subclass"
				);
			}
			// `super` may only start super[expr], super.name or super(args)
			if (
				this.type !== tokTypes.dot &&
				this.type !== tokTypes.bracketL &&
				this.type !== tokTypes.parenL
			) {
				this.unexpected();
			}
			return /** @type {Expression} */ (
				/** @type {unknown} */ (this.finishNode(node, "Super"))
			);
		}
		if (type === tokTypes.regexp) {
			const value =
				/** @type {{ pattern: string, flags: string, value: RegExp | null }} */ (
					this.value
				);
			const node =
				/** @type {Expression & { regex?: { pattern: string, flags: string } }} */ (
					/** @type {unknown} */ (this.parseLiteral(value.value))
				);
			node.regex = { pattern: value.pattern, flags: value.flags };
			return node;
		}
		return base.parseExprAtom.call(
			this,
			refDestructuringErrors,
			forInit,
			forNew
		);
	}

	/**
	 * Owned `parseObj`, an exact-semantics copy of acorn 8's landing on
	 * `ObjectNode`'s single shape (the ES5 trailing-comma gate is dropped —
	 * the fast path requires ES11+). Non-lazy mode delegates.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {boolean} isPattern whether parsing a binding pattern
	 * @param {DestructuringErrorsShim | null=} refDestructuringErrors destructuring errors to fill
	 * @returns {Node} object expression or pattern
	 * @this {ParserInternals}
	 */
	parseObj(isPattern, refDestructuringErrors) {
		if (!this._subscriptFastPath) {
			return base.parseObj.call(this, isPattern, refDestructuringErrors);
		}
		const start = this.start;
		let first = true;
		// acorn's ES6+ `checkPropClash` only ever reads/writes `.proto`, so the
		// record is pooled by nesting depth (like `_deStack`); a subclass override
		// might write arbitrary keys and gets a fresh `{}` instead. Depth resets
		// implicitly since a raise aborts the whole parse.
		const pooled = this._propHashFastPath;
		/** @type {Record<string, unknown>} */
		let propHash;
		if (pooled) {
			const stack = this._propHashStack;
			const depth = this._propHashDepth++;
			const cached = stack[depth];
			if (cached !== undefined) {
				cached.proto = false;
				propHash = cached;
			} else {
				propHash = stack[depth] = { proto: false };
			}
		} else {
			propHash = {};
		}
		const scratch = this._acquireScratch();
		let count = 0;
		this.next();
		while (!this.eat(tokTypes.braceR)) {
			if (!first) {
				this.expect(tokTypes.comma);
				if (this.afterTrailingComma(tokTypes.braceR)) break;
			} else {
				first = false;
			}
			const prop = this.parseProperty(isPattern, refDestructuringErrors);
			if (!isPattern) {
				this.checkPropClash(prop, propHash, refDestructuringErrors);
			}
			scratch[count++] = prop;
		}
		if (pooled) this._propHashDepth--;
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				new ObjectNode(
					start,
					this.lastTokEnd,
					isPattern ? "ObjectPattern" : "ObjectExpression",
					this._releaseScratch(scratch, count)
				)
			)
		);
	}

	/**
	 * Owned `parseProperty`, an exact-semantics copy of acorn 8's: spread/rest
	 * land fully-formed on `RestSpreadNode` and properties start pre-shaped on
	 * `PropertyNode`, which acorn's shared `parsePropertyName`/
	 * `parsePropertyValue` then fill in place (ES9+ semantics assumed via the
	 * ES11 fast-path gate). Non-lazy mode delegates.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {boolean} isPattern whether parsing a binding pattern
	 * @param {DestructuringErrorsShim | null=} refDestructuringErrors destructuring errors to fill
	 * @returns {Node} property, spread element or rest element
	 * @this {ParserInternals}
	 */
	parseProperty(isPattern, refDestructuringErrors) {
		if (!this._subscriptFastPath) {
			return base.parseProperty.call(this, isPattern, refDestructuringErrors);
		}
		const nodeStart = this.start;
		if (this.eat(tokTypes.ellipsis)) {
			if (isPattern) {
				const argument = /** @type {Node} */ (
					/** @type {unknown} */ (this.parseIdent(false))
				);
				if (this.type === tokTypes.comma) {
					this.raiseRecoverable(
						this.start,
						"Comma is not permitted after the rest element"
					);
				}
				return /** @type {Node} */ (
					/** @type {unknown} */ (
						new RestSpreadNode(
							nodeStart,
							this.lastTokEnd,
							"RestElement",
							argument
						)
					)
				);
			}
			const argument = /** @type {Node} */ (
				/** @type {unknown} */ (
					this.parseMaybeAssign(false, refDestructuringErrors)
				)
			);
			// disallow trailing comma via `this.toAssignable()`
			if (
				this.type === tokTypes.comma &&
				refDestructuringErrors &&
				refDestructuringErrors.trailingComma < 0
			) {
				refDestructuringErrors.trailingComma = this.start;
			}
			return /** @type {Node} */ (
				/** @type {unknown} */ (
					new RestSpreadNode(
						nodeStart,
						this.lastTokEnd,
						"SpreadElement",
						argument
					)
				)
			);
		}
		const prop = /** @type {Node} */ (
			/** @type {unknown} */ (new PropertyNode(nodeStart))
		);
		let isGenerator = false;
		/** @type {number | undefined} */
		let startPos;
		/** @type {Position | undefined} */
		let startLoc;
		if (isPattern || refDestructuringErrors) {
			startPos = this.start;
			startLoc = this.startLoc;
		}
		if (!isPattern) isGenerator = this.eat(tokTypes.star);
		const containsEsc = this.containsEsc;
		this.parsePropertyName(prop);
		let isAsync = false;
		if (!isPattern && !containsEsc && !isGenerator && this.isAsyncProp(prop)) {
			isAsync = true;
			isGenerator = this.eat(tokTypes.star);
			this.parsePropertyName(prop);
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

	// ----- class bodies (declarations/expressions, methods, fields) -----

	/**
	 * Owned `parseClass`, an exact-semantics copy of acorn 8's landing on
	 * `ClassNode`/`ClassBodyNode`'s pre-declared shapes (the passed started
	 * node is discarded — every acorn call site consumes the return value).
	 * Delegates when the class fast path is off.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {Node} node started node from the caller
	 * @param {boolean | string} isStatement statement flag (`true`, `false` or `"nullableID"`)
	 * @returns {Node} class declaration or expression
	 * @this {ParserInternals}
	 */
	parseClass(node, isStatement) {
		if (!this._classFastPath) {
			return base.parseClass.call(this, node, isStatement);
		}
		const classNode =
			/** @type {Node & { id: Identifier | null, superClass: Expression | null, body: Node | null }} */ (
				/** @type {unknown} */ (new ClassNode(node.start))
			);
		this.next();
		// ecma-262 14.6: a class definition is always strict mode code
		const oldStrict = this.strict;
		this.strict = true;
		this.parseClassId(classNode, isStatement);
		this.parseClassSuper(classNode);
		const privateNameMap = this.enterClassBody();
		const bodyStart = this.start;
		let hadConstructor = false;
		const scratch = this._acquireScratch();
		let count = 0;
		this.expect(tokTypes.braceL);
		while (this.type !== tokTypes.braceR) {
			const element =
				/** @type {(Node & { kind?: string, static?: boolean, key?: Node & { name: string } }) | null} */ (
					this.parseClassElement(classNode.superClass !== null)
				);
			if (element) {
				scratch[count++] = element;
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
		classNode.body = /** @type {Node} */ (
			/** @type {unknown} */ (
				new ClassBodyNode(
					bodyStart,
					this.lastTokEnd,
					this._releaseScratch(scratch, count)
				)
			)
		);
		this.exitClassBody();
		return this.finishNode(
			/** @type {Node} */ (/** @type {unknown} */ (classNode)),
			isStatement ? "ClassDeclaration" : "ClassExpression"
		);
	}

	/**
	 * Owned `parseClassElement`, an exact-semantics copy of acorn 8's with the
	 * ES13 probes folded (the gate guarantees static blocks and fields exist):
	 * an ambiguous element parses its name into a `MethodDefinitionNode`, which
	 * either is the method node or donates `static`/`computed`/`key` to a
	 * `PropertyDefinitionNode` once the token after the name settles the split.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {boolean} constructorAllowsSuper whether a constructor may call `super()`
	 * @returns {Node | null} class element (`null` for a lone `;`)
	 * @this {ParserInternals}
	 */
	parseClassElement(constructorAllowsSuper) {
		if (!this._classFastPath) {
			return base.parseClassElement.call(this, constructorAllowsSuper);
		}
		if (this.eat(tokTypes.semi)) return null;
		const start = this.start;
		let keyName = "";
		let isGenerator = false;
		let isAsync = false;
		let kind = "method";
		let isStatic = false;
		if (this.eatContextual("static")) {
			// static initialization block
			if (this.eat(tokTypes.braceL)) {
				const block = /** @type {Node} */ (
					/** @type {unknown} */ (new StaticBlockNode(start))
				);
				this.parseClassStaticBlock(block);
				return block;
			}
			if (this.isClassElementNameStart() || this.type === tokTypes.star) {
				isStatic = true;
			} else {
				keyName = "static";
			}
		}
		if (!keyName && this.eatContextual("async")) {
			if (
				(this.isClassElementNameStart() || this.type === tokTypes.star) &&
				!this.canInsertSemicolon()
			) {
				isAsync = true;
			} else {
				keyName = "async";
			}
		}
		if (!keyName && this.eat(tokTypes.star)) {
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
		const element =
			/** @type {Node & { static: boolean, computed: boolean, key: Node | null, kind: string, value: Node | null }} */ (
				/** @type {unknown} */ (new MethodDefinitionNode(start))
			);
		element.static = isStatic;
		if (keyName) {
			// `async`/`get`/`set`/`static` was the element name, not a modifier
			element.computed = false;
			element.key = /** @type {Node} */ (
				/** @type {unknown} */ (
					new IdentifierNode(this.lastTokStart, this.lastTokEnd, keyName)
				)
			);
		} else {
			this.parseClassElementName(element);
		}
		if (
			this.type === tokTypes.parenL ||
			kind !== "method" ||
			isGenerator ||
			isAsync
		) {
			const isConstructor =
				!element.static && checkKeyName(element, "constructor");
			const allowsDirectSuper = isConstructor && constructorAllowsSuper;
			// acorn keeps this check out of parseClassMethod for backward compat
			if (isConstructor && kind !== "method") {
				this.raise(
					/** @type {Node} */ (element.key).start,
					"Constructor can't have get/set modifier"
				);
			}
			element.kind = isConstructor ? "constructor" : kind;
			this.parseClassMethod(element, isGenerator, isAsync, allowsDirectSuper);
			return element;
		}
		// field: rebuild on PropertyDefinition's own `kind`-less shape
		const field = /** @type {Node} */ (
			/** @type {unknown} */ (
				new PropertyDefinitionNode(
					start,
					element.static,
					element.computed,
					/** @type {Node} */ (element.key)
				)
			)
		);
		this.parseClassField(field);
		return field;
	}

	/**
	 * Owned `parseClassElementName`, an exact-semantics copy of acorn 8's.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {Node} element class element receiving `computed`/`key`
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	parseClassElementName(element) {
		if (!this._classFastPath) {
			return base.parseClassElementName.call(this, element);
		}
		const target =
			/** @type {Node & { computed: boolean, key: Node | null }} */ (element);
		if (this.type === tokTypes.privateId) {
			if (this.value === "constructor") {
				this.raise(
					this.start,
					"Classes can't have an element named '#constructor'"
				);
			}
			target.computed = false;
			target.key = this.parsePrivateIdent();
		} else {
			this.parsePropertyName(element);
		}
	}

	/**
	 * Owned `parseClassMethod`, an exact-semantics copy of acorn 8's; the value
	 * lands via `parseMethod` on `FunctionNode`'s shape.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {Node} method class element holding the parsed key and kind
	 * @param {boolean} isGenerator whether the method is a generator
	 * @param {boolean} isAsync whether the method is async
	 * @param {boolean} allowsDirectSuper whether `super()` is allowed inside
	 * @returns {Node} finished method definition
	 * @this {ParserInternals}
	 */
	parseClassMethod(method, isGenerator, isAsync, allowsDirectSuper) {
		if (!this._classFastPath) {
			return base.parseClassMethod.call(
				this,
				method,
				isGenerator,
				isAsync,
				allowsDirectSuper
			);
		}
		const target =
			/** @type {Node & { static: boolean, kind: string, key: Node, value: Node | null }} */ (
				method
			);
		const key = target.key;
		if (target.kind === "constructor") {
			if (isGenerator) {
				this.raise(key.start, "Constructor can't be a generator");
			}
			if (isAsync) {
				this.raise(key.start, "Constructor can't be an async method");
			}
		} else if (target.static && checkKeyName(target, "prototype")) {
			this.raise(
				key.start,
				"Classes may not have a static property named prototype"
			);
		}
		const value = /** @type {Node & { params: Node[] }} */ (
			/** @type {unknown} */ (
				target.value = /** @type {Node} */ (
					/** @type {unknown} */ (
						this.parseMethod(isGenerator, isAsync, allowsDirectSuper)
					)
				)
			)
		);
		if (target.kind === "get" && value.params.length !== 0) {
			this.raiseRecoverable(value.start, "getter should have no params");
		}
		if (target.kind === "set" && value.params.length !== 1) {
			this.raiseRecoverable(
				value.start,
				"setter should have exactly one param"
			);
		}
		if (target.kind === "set" && value.params[0].type === "RestElement") {
			this.raiseRecoverable(
				value.params[0].start,
				"Setter cannot use rest params"
			);
		}
		return this.finishNode(method, "MethodDefinition");
	}

	/**
	 * Owned `parseClassField`, an exact-semantics copy of acorn 8's.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {Node} field class element holding the parsed key
	 * @returns {Node} finished property definition
	 * @this {ParserInternals}
	 */
	parseClassField(field) {
		if (!this._classFastPath) {
			return base.parseClassField.call(this, field);
		}
		const target =
			/** @type {Node & { static: boolean, key: Node, value: Node | null }} */ (
				field
			);
		if (checkKeyName(target, "constructor")) {
			this.raise(
				target.key.start,
				"Classes can't have a field named 'constructor'"
			);
		} else if (target.static && checkKeyName(target, "prototype")) {
			this.raise(
				target.key.start,
				"Classes can't have a static field named 'prototype'"
			);
		}
		if (this.eat(tokTypes.eq)) {
			// a dedicated scope so `arguments` in the initializer raises
			this.enterScope(SCOPE_CLASS_FIELD_INIT | SCOPE_SUPER);
			target.value = /** @type {Node} */ (
				/** @type {unknown} */ (this.parseMaybeAssign())
			);
			this.exitScope();
		} else {
			target.value = null;
		}
		this.semicolon();
		return this.finishNode(field, "PropertyDefinition");
	}

	/**
	 * Owned `parseClassStaticBlock`, an exact-semantics copy of acorn 8's.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {Node} node static-block element (`{` already consumed)
	 * @returns {Node} finished static block
	 * @this {ParserInternals}
	 */
	parseClassStaticBlock(node) {
		if (!this._classFastPath) {
			return base.parseClassStaticBlock.call(this, node);
		}
		const target = /** @type {Node & { body: Node[] }} */ (node);
		target.body = [];
		const oldLabels = this.labels;
		this.labels = [];
		this.enterScope(SCOPE_CLASS_STATIC_BLOCK | SCOPE_SUPER);
		while (this.type !== tokTypes.braceR) {
			const statement = this.parseStatement(null);
			target.body.push(statement);
		}
		this.next();
		this.exitScope();
		this.labels = oldLabels;
		return this.finishNode(node, "StaticBlock");
	}

	/**
	 * Owned `parseClassId`, an exact-semantics copy of acorn 8's.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {Node} node class node receiving `id`
	 * @param {boolean | string} isStatement statement flag (`true`, `false` or `"nullableID"`)
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	parseClassId(node, isStatement) {
		if (!this._classFastPath) {
			return base.parseClassId.call(this, node, isStatement);
		}
		const target = /** @type {Node & { id: Identifier | null }} */ (node);
		if (this.type === tokTypes.name) {
			target.id = this.parseIdent();
			if (isStatement) this.checkLValSimple(target.id, BIND_LEXICAL, false);
		} else {
			if (isStatement === true) this.unexpected();
			target.id = null;
		}
	}

	/**
	 * Owned `parseClassSuper`, an exact-semantics copy of acorn 8's.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {Node} node class node receiving `superClass`
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	parseClassSuper(node) {
		if (!this._classFastPath) {
			return base.parseClassSuper.call(this, node);
		}
		/** @type {Node & { superClass: Expression | null }} */ (node).superClass =
			this.eat(tokTypes._extends)
				? this.parseExprSubscripts(null, false)
				: null;
	}

	/**
	 * Owned `enterClassBody`, an exact-semantics copy of acorn 8's: pushes the
	 * private-name record `parsePrivateIdent` and `exitClassBody` read.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @returns {Record<string, string>} the body's declared-private-names map
	 * @this {ParserInternals}
	 */
	enterClassBody() {
		if (!this._classFastPath) return base.enterClassBody.call(this);
		/** @type {PrivateNameStackEntry} */
		const element = { declared: Object.create(null), used: [] };
		this.privateNameStack.push(element);
		return element.declared;
	}

	/**
	 * Owned `exitClassBody`, an exact-semantics copy of acorn 8's: private
	 * names used but not declared bubble to the enclosing class body, or raise
	 * at the outermost one (only with `options.checkPrivateFields`).
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	exitClassBody() {
		if (!this._classFastPath) return base.exitClassBody.call(this);
		const entry = /** @type {PrivateNameStackEntry} */ (
			this.privateNameStack.pop()
		);
		const declared = entry.declared;
		const used = entry.used;
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
	 * Owned `parseMethod`, an exact-semantics copy of acorn 8's with the
	 * started node replaced by the pre-shaped `FunctionNode` (`initFunction`'s
	 * writes are its constructor defaults — the fast-path gate pins it) and
	 * acorn's `functionFlags` inlined. ES9+ probes folded by the gate.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {boolean} isGenerator whether the method is a generator
	 * @param {boolean=} isAsync whether the method is async
	 * @param {boolean=} allowDirectSuper whether `super()` is allowed in the body
	 * @returns {Expression} method function expression
	 * @this {ParserInternals}
	 */
	parseMethod(isGenerator, isAsync, allowDirectSuper) {
		if (!this._funcFastPath) {
			return base.parseMethod.call(
				this,
				isGenerator,
				isAsync,
				allowDirectSuper
			);
		}
		const node =
			/** @type {Node & { generator: boolean, async: boolean, params: Node[] | null }} */ (
				/** @type {unknown} */ (new FunctionNode(this.start))
			);
		const oldYieldPos = this.yieldPos;
		const oldAwaitPos = this.awaitPos;
		const oldAwaitIdentPos = this.awaitIdentPos;
		node.generator = isGenerator;
		node.async = Boolean(isAsync);
		this.yieldPos = 0;
		this.awaitPos = 0;
		this.awaitIdentPos = 0;
		this.enterScope(
			SCOPE_FUNCTION |
				(isAsync ? SCOPE_ASYNC : 0) |
				(node.generator ? SCOPE_GENERATOR : 0) |
				SCOPE_SUPER |
				(allowDirectSuper ? SCOPE_DIRECT_SUPER : 0)
		);
		this.expect(tokTypes.parenL);
		// fast-path gate guarantees ES9+, so trailing commas are allowed
		node.params = this.parseBindingList(tokTypes.parenR, false, true);
		this.checkYieldAwaitInDefaultParams();
		this.parseFunctionBody(
			/** @type {Node} */ (/** @type {unknown} */ (node)),
			false,
			true,
			false
		);
		this.yieldPos = oldYieldPos;
		this.awaitPos = oldAwaitPos;
		this.awaitIdentPos = oldAwaitIdentPos;
		return /** @type {Expression} */ (
			/** @type {unknown} */ (this.finishNode(node, "FunctionExpression"))
		);
	}

	/**
	 * Owned `parsePropertyName`, an exact-semantics copy of acorn 8's ES6+ path
	 * (the fast-path gate folds the version probe).
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {Node} prop node receiving `computed`/`key`
	 * @returns {Node} the parsed key
	 * @this {ParserInternals}
	 */
	parsePropertyName(prop) {
		if (!this._subscriptFastPath) {
			return base.parsePropertyName.call(this, prop);
		}
		const target =
			/** @type {Node & { computed: boolean, key: Node | null }} */ (prop);
		if (this.eat(tokTypes.bracketL)) {
			target.computed = true;
			target.key = /** @type {Node} */ (
				/** @type {unknown} */ (this.parseMaybeAssign())
			);
			this.expect(tokTypes.bracketR);
			return target.key;
		}
		target.computed = false;
		return (target.key =
			this.type === tokTypes.num || this.type === tokTypes.string
				? /** @type {Node} */ (/** @type {unknown} */ (this.parseExprAtom()))
				: /** @type {Node} */ (
						/** @type {unknown} */ (
							this.parseIdent(this.options.allowReserved !== "never")
						)
					));
	}

	/**
	 * Owned `parsePropertyValue`, an exact-semantics copy of acorn 8's with the
	 * version probes folded (gate is ES11+) and the shorthand branch's
	 * `copyNode(prop.key)` replaced by a direct `IdentifierNode` build: on a
	 * lazy identifier `copyNode` copies exactly `type`/`start`/`end`/`name`
	 * (symbol slots skip for-in), which is precisely that constructor.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {Node} prop property node being filled
	 * @param {boolean} isPattern whether parsing a binding pattern
	 * @param {boolean} isGenerator whether a `*` modifier was seen
	 * @param {boolean} isAsync whether an `async` modifier was seen
	 * @param {number | undefined} startPos property start offset (set when a pattern is possible)
	 * @param {Position | undefined} startLoc property start position
	 * @param {DestructuringErrorsShim | null | undefined} refDestructuringErrors destructuring errors to fill
	 * @param {boolean} containsEsc whether the key contained an escape
	 * @returns {void}
	 * @this {ParserInternals}
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
		if (!this._subscriptFastPath) {
			return base.parsePropertyValue.call(
				this,
				prop,
				isPattern,
				isGenerator,
				isAsync,
				startPos,
				startLoc,
				refDestructuringErrors,
				containsEsc
			);
		}
		const target =
			/** @type {Node & { computed: boolean, key: Node, value: Node | null, kind: string, method: boolean, shorthand: boolean }} */ (
				prop
			);
		if ((isGenerator || isAsync) && this.type === tokTypes.colon) {
			this.unexpected();
		}
		// the parsed key's plain name, read once for the get/set and shorthand arms
		const plainKeyName =
			!target.computed && target.key.type === "Identifier"
				? /** @type {Identifier} */ (target.key).name
				: null;
		if (this.eat(tokTypes.colon)) {
			target.value = isPattern
				? this.parseMaybeDefault(this.start, this.startLoc)
				: /** @type {Node} */ (
						/** @type {unknown} */ (
							this.parseMaybeAssign(false, refDestructuringErrors)
						)
					);
			target.kind = "init";
		} else if (this.type === tokTypes.parenL) {
			if (isPattern) this.unexpected();
			target.method = true;
			target.value = /** @type {Node} */ (
				/** @type {unknown} */ (this.parseMethod(isGenerator, isAsync))
			);
			target.kind = "init";
		} else if (
			!isPattern &&
			!containsEsc &&
			(plainKeyName === "get" || plainKeyName === "set") &&
			this.type !== tokTypes.comma &&
			this.type !== tokTypes.braceR &&
			this.type !== tokTypes.eq
		) {
			if (isGenerator || isAsync) this.unexpected();
			this.parseGetterSetter(prop);
		} else if (plainKeyName !== null) {
			if (isGenerator || isAsync) this.unexpected();
			const key = /** @type {Identifier} */ (target.key);
			this.checkUnreserved(key);
			if (key.name === "await" && !this.awaitIdentPos) {
				// acorn assigns startPos raw; it is undefined only where acorn's is
				this.awaitIdentPos = /** @type {number} */ (startPos);
			}
			if (isPattern) {
				target.value = this.parseMaybeDefault(
					/** @type {number} */ (startPos),
					startLoc,
					/** @type {Node} */ (
						/** @type {unknown} */ (
							new IdentifierNode(key.start, key.end, key.name)
						)
					)
				);
			} else if (this.type === tokTypes.eq && refDestructuringErrors) {
				if (refDestructuringErrors.shorthandAssign < 0) {
					refDestructuringErrors.shorthandAssign = this.start;
				}
				target.value = this.parseMaybeDefault(
					/** @type {number} */ (startPos),
					startLoc,
					/** @type {Node} */ (
						/** @type {unknown} */ (
							new IdentifierNode(key.start, key.end, key.name)
						)
					)
				);
			} else {
				target.value = /** @type {Node} */ (
					/** @type {unknown} */ (
						new IdentifierNode(key.start, key.end, key.name)
					)
				);
			}
			target.kind = "init";
			target.shorthand = true;
		} else {
			this.unexpected();
		}
	}

	/**
	 * Owned `isAsyncProp`, an exact-semantics copy of acorn 8's with the ES9
	 * `star` probe folded and the gap regexp replaced by the memoized
	 * `_gapHasNewline` (same span, same four terminator chars, no slice).
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {Node} prop property whose parsed key might be the `async` modifier
	 * @returns {boolean} whether the key is an `async` method modifier
	 * @this {ParserInternals}
	 */
	isAsyncProp(prop) {
		if (!this._subscriptFastPath) {
			return base.isAsyncProp.call(this, prop);
		}
		const target = /** @type {Node & { computed: boolean, key: Node }} */ (
			prop
		);
		return (
			!target.computed &&
			target.key.type === "Identifier" &&
			/** @type {Identifier} */ (target.key).name === "async" &&
			(this.type === tokTypes.name ||
				this.type === tokTypes.num ||
				this.type === tokTypes.string ||
				this.type === tokTypes.bracketL ||
				Boolean(this.type.keyword) ||
				this.type === tokTypes.star) &&
			!this._gapHasNewline()
		);
	}

	/**
	 * Owned `checkPropClash`, an exact-semantics copy of acorn 8's ES9+ path
	 * (only `__proto__` can clash) — it touches nothing but `propHash.proto`,
	 * preserving the pooled-record contract of the owned `parseObj`.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {Node} prop parsed property
	 * @param {Record<string, unknown>} propHash per-object clash record
	 * @param {DestructuringErrorsShim | null=} refDestructuringErrors destructuring errors to fill
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	checkPropClash(prop, propHash, refDestructuringErrors) {
		if (!this._subscriptFastPath) {
			return base.checkPropClash.call(
				this,
				prop,
				propHash,
				refDestructuringErrors
			);
		}
		const target =
			/** @type {Node & { computed?: boolean, method?: boolean, shorthand?: boolean, key?: Node, kind?: string }} */ (
				prop
			);
		if (target.type === "SpreadElement") return;
		if (target.computed || target.method || target.shorthand) return;
		const key = /** @type {Node & { name?: string, value?: unknown }} */ (
			target.key
		);
		/** @type {string} */
		let name;
		switch (key.type) {
			case "Identifier":
				name = /** @type {string} */ (key.name);
				break;
			case "Literal":
				name = String(key.value);
				break;
			default:
				return;
		}
		if (name === "__proto__" && target.kind === "init") {
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
	}

	/**
	 * Owned `parseLiteral`: builds the finished `LiteralNode` directly; the
	 * `bigint` branch matches acorn's. Non-lazy mode delegates to acorn.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {unknown} value literal value
	 * @returns {Node} literal node
	 * @this {ParserInternals}
	 */
	parseLiteral(value) {
		if (!this._lazy) return base.parseLiteral.call(this, value);
		const start = this.start;
		const end = this.end;
		const len = end - start;
		const raw =
			len >= 2 && len <= SLICE_CACHE_MAX_LEN
				? getShortSlice(this.input, start, end)
				: this.input.slice(start, end);
		const node = new LiteralNode(start, end, value, raw);
		if (raw.charCodeAt(raw.length - 1) === 110) {
			// acorn falls back to normalizing `raw` when `BigInt` is missing;
			// every Node version webpack supports has it, so `value` is set
			/** @type {LiteralNode & { bigint?: string }} */ (node).bigint =
				/** @type {bigint} */ (value).toString();
		}
		this.next();
		return /** @type {Node} */ (/** @type {unknown} */ (node));
	}

	/**
	 * Single-construction regexp literals: acorn validates the pattern and
	 * then builds the value with a second `new RegExp`. This override scans
	 * like acorn, keeps acorn's flag validation (for its exact messages) and
	 * lets one `new RegExp` be both the V8-backed validation and the value.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/tokenize.js
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

		// acorn's per-ecmaVersion flag validation, kept for its exact errors;
		// the whitelist is precomputed in the constructor
		const ecmaVersion = this._ecmaVersion;
		const validFlags = this._validRegexpFlags;
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
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/regexp.js
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
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/scope.js
	 * @param {number} flags scope flags
	 * @this {ParserInternals}
	 */
	enterScope(flags) {
		// the top-level scope enters from acorn's base constructor, before the
		// subclass constructor body created the pool
		const pool = this._scopePool;
		const cached = pool === undefined ? undefined : pool.pop();
		if (cached !== undefined) {
			cached.flags = flags;
			this.scopeStack.push(cached);
			return;
		}
		this.scopeStack.push(new Scope(flags));
	}

	/**
	 * Owned `exitScope`: recycles the popped scope — nothing in acorn or the
	 * overrides above holds a scope past its exit (every reader walks the live
	 * `scopeStack`), so the pool caps allocations at the deepest nesting.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/scope.js
	 * @this {ParserInternals}
	 */
	exitScope() {
		const scope = /** @type {Scope} */ (this.scopeStack.pop());
		// harvest the name sets emptied (an idle pooled scope must not retain
		// names) so declareName reuses the wrappers
		const setPool = this._setPool;
		const varSet = scope.var;
		if (varSet !== undefined) {
			varSet.clear();
			setPool.push(varSet);
			scope.var = undefined;
		}
		const lexicalSet = scope.lexical;
		if (lexicalSet !== undefined) {
			lexicalSet.clear();
			setPool.push(lexicalSet);
			scope.lexical = undefined;
		}
		const functionsSet = scope.functions;
		if (functionsSet !== undefined) {
			functionsSet.clear();
			setPool.push(functionsSet);
			scope.functions = undefined;
		}
		scope.firstLexical = undefined;
		this._scopePool.push(scope);
	}

	/**
	 * @returns {Set<string>} empty name set, pooled by `exitScope`
	 * @this {ParserInternals}
	 */
	_takeSet() {
		const cached = this._setPool.pop();
		return cached === undefined ? new Set() : cached;
	}

	/**
	 * Set-backed replacement for acorn's `declareName` on Set-backed scopes.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/scope.js
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
				scope.lexical = this._takeSet();
			}
			scope.lexical.add(name);
			if (this.inModule && scope.flags & SCOPE_TOP) {
				delete this.undefinedExports[name];
			}
		} else if (bindingType === /* BIND_SIMPLE_CATCH */ 4) {
			const scope = this.currentScope();
			if (scope.lexical === undefined) {
				scope.firstLexical = name;
				scope.lexical = this._takeSet();
			}
			scope.lexical.add(name);
		} else if (bindingType === /* BIND_FUNCTION */ 3) {
			const scope = this.currentScope();
			redeclared = this.treatFunctionsAsVar
				? scope.lexical !== undefined && scope.lexical.has(name)
				: (scope.lexical !== undefined && scope.lexical.has(name)) ||
					(scope.var !== undefined && scope.var.has(name));
			(scope.functions || (scope.functions = this._takeSet())).add(name);
		} else {
			for (let i = this.scopeStack.length - 1; i >= 0; --i) {
				const scope = this.scopeStack[i];
				if (
					(scope.lexical !== undefined &&
						scope.lexical.has(name) &&
						!(
							scope.flags & SCOPE_SIMPLE_CATCH && scope.firstLexical === name
						)) ||
					// lazy-Set check first: `functions` is undefined for almost all
					// scopes, and the method call walks no state worth paying for then
					(scope.functions !== undefined &&
						!this.treatFunctionsAsVarInScope(scope) &&
						scope.functions.has(name))
				) {
					redeclared = true;
					break;
				}
				(scope.var || (scope.var = this._takeSet())).add(name);
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
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/scope.js
	 * @param {Identifier} id exported identifier
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
	 * @returns {ImportAttribute[]} import attributes
	 * @this {ParserInternals}
	 */
	parseWithClause() {
		/** @type {ImportAttribute[] & { [LEGACY_ASSERT_ATTRIBUTES]?: boolean }} */
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
	 * Owned `parseImportAttribute` landing on `ImportAttributeNode`'s single
	 * shape; serves both `with { ... }` and the legacy `assert { ... }` clause.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @returns {ImportAttribute} import attribute
	 * @this {ParserInternals}
	 */
	parseImportAttribute() {
		if (!this._moduleDeclFastPath) {
			return base.parseImportAttribute.call(this);
		}
		const start = this.start;
		const key =
			this.type === tokTypes.string
				? /** @type {Node} */ (/** @type {unknown} */ (this.parseExprAtom()))
				: /** @type {Node} */ (
						/** @type {unknown} */ (
							this.parseIdent(this.options.allowReserved !== "never")
						)
					);
		this.expect(tokTypes.colon);
		if (this.type !== tokTypes.string) {
			this.unexpected();
		}
		const value = /** @type {Node} */ (
			/** @type {unknown} */ (this.parseExprAtom())
		);
		return /** @type {ImportAttribute} */ (
			/** @type {unknown} */ (
				new ImportAttributeNode(start, this.lastTokEnd, key, value)
			)
		);
	}

	/**
	 * Owned `parseModuleExportName`; the gate's ecmaVersion bound covers
	 * acorn's ≥ 13 probe for string export names.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @returns {Node} identifier or string-literal export name
	 * @this {ParserInternals}
	 */
	parseModuleExportName() {
		if (!this._moduleDeclFastPath) {
			return base.parseModuleExportName.call(this);
		}
		if (this.type === tokTypes.string) {
			const stringLiteral = /** @type {Node & { value: string }} */ (
				this.parseLiteral(this.value)
			);
			if (LONE_SURROGATE_REGEXP.test(stringLiteral.value)) {
				this.raise(
					stringLiteral.start,
					"An export name cannot include a lone surrogate."
				);
			}
			return stringLiteral;
		}
		return /** @type {Node} */ (/** @type {unknown} */ (this.parseIdent(true)));
	}

	/**
	 * Owned `parseImport`, an exact-semantics copy of acorn 8's landing on
	 * `ImportDeclarationNode`'s single shape (the started node is discarded);
	 * `phase` is attached post-hoc, matching the former delegate-and-patch flow.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {Node & { phase?: ImportPhase }} node started statement node from `parseStatement`
	 * @returns {Node} import declaration
	 * @this {ParserInternals}
	 */
	parseImport(node) {
		this._moduleSyntaxSeen = true;
		this._importPhase = null;
		if (!this._moduleDeclFastPath) {
			const result = base.parseImport.call(this, node);
			if (this._importPhase) node.phase = this._importPhase;
			return result;
		}
		this.next();
		/** @type {AnyImportSpecifier[]} */
		let specifiers;
		/** @type {Expression} */
		let source;
		// import '...'
		if (this.type === tokTypes.string) {
			specifiers = EMPTY_IMPORT_SPECIFIERS;
			source = this.parseExprAtom();
		} else {
			specifiers = this.parseImportSpecifiers();
			this.expectContextual("from");
			source =
				this.type === tokTypes.string
					? this.parseExprAtom()
					: this.unexpected();
		}
		const attributes = this.parseWithClause();
		this.semicolon();
		const result =
			/** @type {Node & { phase?: ImportPhase }} */
			(
				/** @type {unknown} */
				(
					new ImportDeclarationNode(
						node.start,
						this.lastTokEnd,
						specifiers,
						source,
						attributes
					)
				)
			);
		if (this._importPhase) result.phase = this._importPhase;
		return result;
	}

	/**
	 * Owned `parseImportSpecifier` landing on `ImportSpecifierNode`'s single
	 * shape.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @returns {Node} import specifier
	 * @this {ParserInternals}
	 */
	parseImportSpecifier() {
		if (!this._moduleDeclFastPath) {
			return base.parseImportSpecifier.call(this);
		}
		const start = this.start;
		const imported = this.parseModuleExportName();
		/** @type {Node} */
		let local;
		if (this.eatContextual("as")) {
			local = /** @type {Node} */ (/** @type {unknown} */ (this.parseIdent()));
		} else {
			this.checkUnreserved(/** @type {Identifier} */ (imported));
			local = imported;
		}
		this.checkLValSimple(local, BIND_LEXICAL);
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				new ImportSpecifierNode(start, this.lastTokEnd, imported, local)
			)
		);
	}

	/**
	 * Owned `parseImportDefaultSpecifier` landing on
	 * `ImportSimpleSpecifierNode`'s single shape.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @returns {Node} default import specifier
	 * @this {ParserInternals}
	 */
	parseImportDefaultSpecifier() {
		if (!this._moduleDeclFastPath) {
			return base.parseImportDefaultSpecifier.call(this);
		}
		// import defaultObj, { x, y as z } from '...'
		const start = this.start;
		const local = /** @type {Node} */ (
			/** @type {unknown} */ (this.parseIdent())
		);
		this.checkLValSimple(local, BIND_LEXICAL);
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				new ImportSimpleSpecifierNode(
					start,
					this.lastTokEnd,
					"ImportDefaultSpecifier",
					local
				)
			)
		);
	}

	/**
	 * Owned `parseImportNamespaceSpecifier` landing on
	 * `ImportSimpleSpecifierNode`'s single shape.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @returns {Node} namespace import specifier
	 * @this {ParserInternals}
	 */
	parseImportNamespaceSpecifier() {
		if (!this._moduleDeclFastPath) {
			return base.parseImportNamespaceSpecifier.call(this);
		}
		const start = this.start;
		this.next();
		this.expectContextual("as");
		const local = /** @type {Node} */ (
			/** @type {unknown} */ (this.parseIdent())
		);
		this.checkLValSimple(local, BIND_LEXICAL);
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				new ImportSimpleSpecifierNode(
					start,
					this.lastTokEnd,
					"ImportNamespaceSpecifier",
					local
				)
			)
		);
	}

	/**
	 * Acorn's `parseImportSpecifiers` list body over a pooled scratch array;
	 * the phase detection wrapping it lives in `parseImportSpecifiers`.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @returns {AnyImportSpecifier[]} import specifiers
	 * @this {ParserInternals}
	 */
	_parseImportSpecifiersBase() {
		if (!this._moduleDeclFastPath) {
			return base.parseImportSpecifiers.call(this);
		}
		const scratch = this._acquireScratch();
		let count = 0;
		let first = true;
		if (this.type === tokTypes.name) {
			scratch[count++] = this.parseImportDefaultSpecifier();
			if (!this.eat(tokTypes.comma)) {
				return this._releaseScratch(scratch, count);
			}
		}
		if (this.type === tokTypes.star) {
			scratch[count++] = this.parseImportNamespaceSpecifier();
			return this._releaseScratch(scratch, count);
		}
		this.expect(tokTypes.braceL);
		while (!this.eat(tokTypes.braceR)) {
			if (!first) {
				this.expect(tokTypes.comma);
				if (this.afterTrailingComma(tokTypes.braceR)) break;
			} else {
				first = false;
			}
			scratch[count++] = this.parseImportSpecifier();
		}
		return this._releaseScratch(scratch, count);
	}

	/**
	 * Owned `parseExport`, an exact-semantics copy of acorn 8's landing on the
	 * single-shape export declaration nodes (the started node is discarded).
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {Node} node started export node from `parseStatement`
	 * @param {unknown} exports export-name tracking record
	 * @returns {Node} export declaration
	 * @this {ParserInternals}
	 */
	parseExport(node, exports) {
		this._moduleSyntaxSeen = true;
		if (!this._moduleDeclFastPath) {
			return base.parseExport.call(this, node, exports);
		}
		this.next();
		// export * from '...'
		if (this.eat(tokTypes.star)) {
			return this.parseExportAllDeclaration(node, exports);
		}
		if (this.eat(tokTypes._default)) {
			// export default ...
			this.checkExport(exports, "default", this.lastTokStart);
			const declaration = this.parseExportDefaultDeclaration();
			return /** @type {Node} */ (
				/** @type {unknown} */ (
					new ExportDefaultDeclarationNode(
						node.start,
						this.lastTokEnd,
						declaration
					)
				)
			);
		}
		/** @type {Node | null} */
		let declaration;
		/** @type {Node[]} */
		let specifiers;
		/** @type {Expression | null} */
		let source;
		/** @type {ImportAttribute[]} */
		let attributes;
		// export var|const|let|function|class ...
		if (this.shouldParseExportStatement()) {
			declaration = this.parseExportDeclaration(node);
			if (declaration.type === "VariableDeclaration") {
				this.checkVariableExport(
					exports,
					/** @type {Node & { declarations: Node[] }} */ (declaration)
						.declarations
				);
			} else {
				const id = /** @type {Node & { id: Identifier }} */ (declaration).id;
				this.checkExport(exports, id, id.start);
			}
			specifiers = [];
			source = null;
			attributes = [];
		} else {
			// export { x, y as z } [from '...']
			declaration = null;
			specifiers = this.parseExportSpecifiers(exports);
			if (this.eatContextual("from")) {
				if (this.type !== tokTypes.string) this.unexpected();
				source = this.parseExprAtom();
				attributes = this.parseWithClause();
			} else {
				for (let i = 0; i < specifiers.length; i++) {
					// check for keywords used as local names
					const local = /** @type {Node & { local: Node }} */ (specifiers[i])
						.local;
					this.checkUnreserved(/** @type {Identifier} */ (local));
					// check if export is defined
					this.checkLocalExport(/** @type {Identifier} */ (local));
					if (local.type === "Literal") {
						this.raise(
							local.start,
							"A string literal cannot be used as an exported binding without `from`."
						);
					}
				}
				source = null;
				attributes = [];
			}
			this.semicolon();
		}
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				new ExportNamedDeclarationNode(
					node.start,
					this.lastTokEnd,
					declaration,
					specifiers,
					source,
					attributes
				)
			)
		);
	}

	/**
	 * Owned `parseExportAllDeclaration` landing on `ExportAllDeclarationNode`'s
	 * single shape; the gate's ecmaVersion bound covers acorn's ≥ 11 probe.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {Node} node started export node from `parseExport`
	 * @param {unknown} exports export-name tracking record
	 * @returns {Node} export-all declaration
	 * @this {ParserInternals}
	 */
	parseExportAllDeclaration(node, exports) {
		if (!this._moduleDeclFastPath) {
			return base.parseExportAllDeclaration.call(this, node, exports);
		}
		/** @type {Node | null} */
		let exported;
		if (this.eatContextual("as")) {
			exported = this.parseModuleExportName();
			this.checkExport(exports, exported, this.lastTokStart);
		} else {
			exported = null;
		}
		this.expectContextual("from");
		if (this.type !== tokTypes.string) this.unexpected();
		const source = this.parseExprAtom();
		const attributes = this.parseWithClause();
		this.semicolon();
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				new ExportAllDeclarationNode(
					node.start,
					this.lastTokEnd,
					exported,
					source,
					attributes
				)
			)
		);
	}

	/**
	 * Owned `parseExportDefaultDeclaration`, acorn's exact body: no node of its
	 * own, kept owned so the export family delegates as one unit.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @returns {Node} default-exported declaration or expression
	 * @this {ParserInternals}
	 */
	parseExportDefaultDeclaration() {
		if (!this._moduleDeclFastPath) {
			return base.parseExportDefaultDeclaration.call(this);
		}
		let isAsync = false;
		if (
			this.type === tokTypes._function ||
			(isAsync = this.isAsyncFunction())
		) {
			const functionNode = this.startNode();
			this.next();
			if (isAsync) this.next();
			return /** @type {Node} */ (
				/** @type {unknown} */ (
					this.parseFunction(
						functionNode,
						FUNC_STATEMENT | FUNC_NULLABLE_ID,
						false,
						isAsync
					)
				)
			);
		}
		if (this.type === tokTypes._class) {
			const classNode = this.startNode();
			return this.parseClass(classNode, "nullableID");
		}
		const declaration = /** @type {Node} */ (
			/** @type {unknown} */ (this.parseMaybeAssign())
		);
		this.semicolon();
		return declaration;
	}

	/**
	 * Mirror of acorn's `checkExport` with `hasOwn` spelled for Node ≥ 10
	 * (mode-independent, so no gate, like `checkUnreserved`).
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {unknown} exports export-name tracking record
	 * @param {string | Node} name exported name, or the node carrying it
	 * @param {number} pos source offset for the duplicate-export error
	 * @this {ParserInternals}
	 */
	checkExport(exports, name, pos) {
		if (!exports) return;
		const record = /** @type {Record<string, boolean>} */ (exports);
		const key =
			typeof name === "string"
				? name
				: /** @type {string} */ (
						name.type === "Identifier"
							? /** @type {Identifier} */ (name).name
							: /** @type {Node & { value?: unknown }} */ (name).value
					);
		if (Object.prototype.hasOwnProperty.call(record, key)) {
			this.raiseRecoverable(pos, `Duplicate export '${key}'`);
		}
		record[key] = true;
	}

	/**
	 * Mirror of acorn's `checkPatternExport` (mode-independent, so no gate).
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {unknown} exports export-name tracking record
	 * @param {Node} pat exported binding pattern
	 * @this {ParserInternals}
	 */
	checkPatternExport(exports, pat) {
		const type = pat.type;
		if (type === "Identifier") {
			this.checkExport(exports, pat, pat.start);
		} else if (type === "ObjectPattern") {
			for (const prop of /** @type {Node & { properties: Node[] }} */ (pat)
				.properties) {
				this.checkPatternExport(exports, prop);
			}
		} else if (type === "ArrayPattern") {
			for (const element of /** @type {Node & { elements: (Node | null)[] }} */ (
				pat
			).elements) {
				if (element) this.checkPatternExport(exports, element);
			}
		} else if (type === "Property") {
			this.checkPatternExport(
				exports,
				/** @type {Node & { value: Node }} */ (pat).value
			);
		} else if (type === "AssignmentPattern") {
			this.checkPatternExport(
				exports,
				/** @type {Node & { left: Node }} */ (pat).left
			);
		} else if (type === "RestElement") {
			this.checkPatternExport(
				exports,
				/** @type {Node & { argument: Node }} */ (pat).argument
			);
		}
	}

	/**
	 * Mirror of acorn's `checkVariableExport` (mode-independent, so no gate).
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {unknown} exports export-name tracking record
	 * @param {Node[]} declarations exported declarators
	 * @this {ParserInternals}
	 */
	checkVariableExport(exports, declarations) {
		if (!exports) return;
		for (const declaration of declarations) {
			this.checkPatternExport(
				exports,
				/** @type {Node & { id: Node }} */ (declaration).id
			);
		}
	}

	/**
	 * Owned `parseExportSpecifier` landing on `ExportSpecifierNode`'s single
	 * shape.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {unknown} exports export-name tracking record
	 * @returns {Node} export specifier
	 * @this {ParserInternals}
	 */
	parseExportSpecifier(exports) {
		if (!this._moduleDeclFastPath) {
			return base.parseExportSpecifier.call(this, exports);
		}
		const start = this.start;
		const local = this.parseModuleExportName();
		const exported = this.eatContextual("as")
			? this.parseModuleExportName()
			: local;
		this.checkExport(exports, exported, exported.start);
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				new ExportSpecifierNode(start, this.lastTokEnd, local, exported)
			)
		);
	}

	/**
	 * Owned `parseExportSpecifiers`, acorn's exact loop over a pooled scratch
	 * array.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @param {unknown} exports export-name tracking record
	 * @returns {Node[]} export specifiers
	 * @this {ParserInternals}
	 */
	parseExportSpecifiers(exports) {
		if (!this._moduleDeclFastPath) {
			return base.parseExportSpecifiers.call(this, exports);
		}
		const scratch = this._acquireScratch();
		let count = 0;
		let first = true;
		// export { x, y as z } [from '...']
		this.expect(tokTypes.braceL);
		while (!this.eat(tokTypes.braceR)) {
			if (!first) {
				this.expect(tokTypes.comma);
				if (this.afterTrailingComma(tokTypes.braceR)) break;
			} else {
				first = false;
			}
			scratch[count++] = this.parseExportSpecifier(exports);
		}
		return this._releaseScratch(scratch, count);
	}

	/**
	 * Owned `parseAwait`: flags top-level await (module-only) for the
	 * auto-fallback guard, then lands on `AwaitExpressionNode`'s single shape.
	 * Non-lazy mode delegates.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {boolean | string=} forInit for-loop init context flag
	 * @returns {Expression} await expression
	 * @this {ParserInternals}
	 */
	parseAwait(forInit) {
		if (this.inModule && this.currentVarScope().flags & SCOPE_TOP) {
			this._moduleSyntaxSeen = true;
		}
		if (!this._lazy) return base.parseAwait.call(this, forInit);
		if (!this.awaitPos) this.awaitPos = this.start;
		const start = this.start;
		this.next();
		const argument = this.parseMaybeUnary(null, true, false, forInit);
		return /** @type {Expression} */ (
			/** @type {unknown} */ (
				new AwaitExpressionNode(start, this.lastTokEnd, argument)
			)
		);
	}

	/**
	 * Owned `parseYield` landing on `YieldExpressionNode`'s single shape.
	 * Non-lazy mode delegates.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {boolean | string=} forInit for-loop init context flag
	 * @returns {Expression} yield expression
	 * @this {ParserInternals}
	 */
	parseYield(forInit) {
		if (!this._lazy) return base.parseYield.call(this, forInit);
		if (!this.yieldPos) this.yieldPos = this.start;
		const start = this.start;
		this.next();
		let delegate = false;
		/** @type {Expression | null} */
		let argument = null;
		if (!(
			this.type === tokTypes.semi ||
			this.canInsertSemicolon() ||
			(this.type !== tokTypes.star &&
				!(/** @type {TokenTypeInternal} */ (this.type).startsExpr))
		)) {
			delegate = this.eat(tokTypes.star);
			argument = this.parseMaybeAssign(forInit);
		}
		return /** @type {Expression} */ (
			/** @type {unknown} */ (
				new YieldExpressionNode(start, this.lastTokEnd, delegate, argument)
			)
		);
	}

	/**
	 * Owned `parsePrivateIdent` landing on `PrivateIdentifierNode`'s single
	 * shape. Non-lazy mode delegates.
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @returns {Node} private identifier node
	 * @this {ParserInternals}
	 */
	parsePrivateIdent() {
		if (!this._lazy) return base.parsePrivateIdent.call(this);
		if (this.type !== tokTypes.privateId) this.unexpected();
		const node = new PrivateIdentifierNode(
			this.start,
			this.end,
			/** @type {string} */ (this.value)
		);
		this.next();
		// for validating existence when the enclosing class closes
		if (this.options.checkPrivateFields) {
			if (this.privateNameStack.length === 0) {
				this.raise(
					node.start,
					`Private field '#${node.name}' must be declared in an enclosing class`
				);
			} else {
				/** @type {{ used: unknown[] }} */ (
					this.privateNameStack[this.privateNameStack.length - 1]
				).used.push(node);
			}
		}
		return /** @type {Node} */ (/** @type {unknown} */ (node));
	}

	/**
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/statement.js
	 * @returns {AnyImportSpecifier[]} import specifiers
	 * @this {ParserInternals}
	 */
	parseImportSpecifiers() {
		if (!this._importPhasesEnabled) {
			return this._parseImportSpecifiersBase();
		}

		/** @type {ImportPhase | null} */
		const phase = this.isContextual("defer")
			? "defer"
			: this.isContextual("source")
				? "source"
				: null;
		if (!phase) return this._parseImportSpecifiersBase();

		const phaseId = this.parseIdent();
		if (this.isContextual("from") || this.type === tokTypes.comma) {
			// `defer`/`source` was the default import name, not a phase modifier
			const defaultSpecifier =
				/** @type {ImportDefaultSpecifier} */
				(
					this.startNodeAt(
						phaseId.start,
						phaseId.loc ? phaseId.loc.start : undefined
					)
				);
			defaultSpecifier.local = phaseId;
			this.checkLValSimple(phaseId, BIND_LEXICAL);

			/** @type {AnyImportSpecifier[]} */
			const nodes = [
				/** @type {ImportDefaultSpecifier} */
				(this.finishNode(defaultSpecifier, "ImportDefaultSpecifier"))
			];
			if (this.eat(tokTypes.comma)) {
				if (this.type !== tokTypes.star && this.type !== tokTypes.braceL) {
					this.unexpected();
				}
				nodes.push(...this._parseImportSpecifiersBase());
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

		const specifiers = this._parseImportSpecifiersBase();

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
	 * acorn source: https://github.com/acornjs/acorn/blob/8.18.0/acorn/src/expression.js
	 * @param {boolean} forNew whether parsed as the operand of `new`
	 * @returns {Expression} expression node
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
					/** @type {ImportExpression & { phase?: ImportPhase }} */
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
	 * @param {Node & { property?: Identifier }} node started node with `meta` set to `import`
	 * @returns {Expression} MetaProperty node
	 * @this {ParserInternals}
	 */
	parseImportMeta(node) {
		if (!this._importPhasesEnabled) {
			// base only accepts `import.meta` here, which is module-only
			this._moduleSyntaxSeen = true;
			return base.parseImportMeta.call(this, node);
		}

		this.next();

		const containsEsc = this.containsEsc;
		const property = this.parseIdent(true);
		node.property = property;
		const { name } = property;

		// only `import.meta` is module-only; `import.defer`/`.source` are dynamic
		if (name === "meta") this._moduleSyntaxSeen = true;

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

		return /** @type {Expression} */ (this.finishNode(node, "MetaProperty"));
	}
}

/** @typedef {import("../Dependency").SourcePosition} SourcePosition */

/**
 * Whether a raw string literal contains a legacy octal (`\47`, `\0` followed by
 * a digit) or non-octal decimal (`\8`, `\9`) escape — all SyntaxErrors in
 * strict mode. Escaped backslashes (`\\`) and `\x` / `\u` escapes are skipped.
 * @param {string} raw raw string literal text, including quotes
 * @returns {boolean} true when a strict-forbidden escape is present
 */
const hasOctalEscape = (raw) => {
	for (let i = 0; i < raw.length; i++) {
		if (raw.charCodeAt(i) !== 92) continue;
		const next = raw.charCodeAt(i + 1);
		if (next === 92) {
			i++;
			continue;
		}
		// `\0` is a valid NUL escape unless a digit follows it.
		if (next === 48) {
			const after = raw.charCodeAt(i + 2);
			if (after >= 48 && after <= 57) return true;
			i++;
			continue;
		}
		if (next >= 49 && next <= 57) return true;
	}
	return false;
};

// Location decoding for lazy-mode output: nodes carry only offsets (the parser
// skips acorn's location tracking), so line/column are derived on demand from
// these two helpers.

/**
 * Exact char-code scan matching acorn's `lineBreak` semantics (CRLF is one
 * break). Kept as the fallback for the terminators `buildLineStarts` cannot
 * find with a native search.
 * @param {string} source source code
 * @returns {number[]} line start offsets
 */
const scanLineStarts = (source) => {
	const len = source.length;
	const lineStarts = [0];
	for (let i = 0; i < len; i++) {
		const ch = source.charCodeAt(i);
		if (ch === 10) {
			lineStarts.push(i + 1);
		} else if (ch === 13) {
			if (source.charCodeAt(i + 1) === 10) i++;
			lineStarts.push(i + 1);
		} else if (ch === 0x2028 || ch === 0x2029) {
			lineStarts.push(i + 1);
		}
	}
	return lineStarts;
};

/**
 * Offset of each line's first character. `indexOf` searches the source natively,
 * which beats a char-code loop by ~3x; CRLF needs no special case because it
 * starts the next line after its `\n` either way. A lone `\r` or a unicode
 * separator does break that equivalence, so those fall back to the char scan.
 * @param {string} source source code
 * @returns {number[]} line start offsets
 */
const buildLineStarts = (source) => {
	if (!source.includes("\u2028") && !source.includes("\u2029")) {
		let cr = source.indexOf("\r");
		while (cr !== -1 && source.charCodeAt(cr + 1) === 10) {
			cr = source.indexOf("\r", cr + 2);
		}
		if (cr === -1) {
			const lineStarts = [0];
			let i = source.indexOf("\n");
			while (i !== -1) {
				lineStarts.push(i + 1);
				i = source.indexOf("\n", i + 1);
			}
			return lineStarts;
		}
	}
	return scanLineStarts(source);
};

/**
 * Binary search for the line containing the offset.
 * @param {number[]} lineStarts line start offsets
 * @param {number} offset source offset
 * @returns {SourcePosition} position (1-based line, 0-based column)
 */
const positionAt = (lineStarts, offset) => {
	let lo = 0;
	let hi = lineStarts.length - 1;
	while (lo < hi) {
		const mid = (lo + hi + 1) >>> 1;
		if (lineStarts[mid] <= offset) lo = mid;
		else hi = mid - 1;
	}
	return { line: lo + 1, column: offset - lineStarts[lo] };
};

const KEYWORDS_BEFORE_REGEXP = new Set([
	"await",
	"case",
	"delete",
	"do",
	"else",
	"in",
	"instanceof",
	"new",
	"of",
	"return",
	"throw",
	"typeof",
	"void",
	"yield"
]);

/**
 * Whether a `/` at this point starts a regexp rather than division, decided by
 * what precedes it: after a value (name, number, `)`, `]`) it divides, after an
 * operator or a keyword it opens a regexp. `)` and `]` are always read as
 * division — telling `if (a) /re/` from `(a) / b` needs paren-context tracking
 * this single pass does not carry.
 * @param {string} source source code
 * @param {number} slash offset of the `/`
 * @returns {boolean} true when a regexp literal starts here
 */
const startsRegExp = (source, slash) => {
	let i = slash - 1;
	while (i >= 0) {
		const code = source.charCodeAt(i);
		if (code === 32 || code === 9 || code === 10 || code === 13) i--;
		else break;
	}
	if (i < 0) return true;
	const code = source.charCodeAt(i);
	if (code === 41 || code === 93) return false;
	if (!isIdentifierChar(code)) return true;
	// a keyword before `/` is an operator position (`return /re/`), a name is not
	let start = i;
	while (start >= 0 && isIdentifierChar(source.charCodeAt(start))) start--;
	return KEYWORDS_BEFORE_REGEXP.has(source.slice(start + 1, i + 1));
};

/**
 * Skips whitespace and comments, returning the next code offset.
 * @param {string} source source code
 * @param {number} i offset to start at
 * @returns {number} offset of the next significant character
 */
const skipTrivia = (source, i) => {
	while (i < source.length) {
		const code = source.charCodeAt(i);
		if (code === 32 || code === 9 || code === 10 || code === 13) {
			i++;
		} else if (code === 47 && source.charCodeAt(i + 1) === 47) {
			const end = source.indexOf("\n", i + 2);
			i = end === -1 ? source.length : end + 1;
		} else if (code === 47 && source.charCodeAt(i + 1) === 42) {
			const end = source.indexOf("*/", i + 2);
			i = end === -1 ? source.length : end + 2;
		} else {
			break;
		}
	}
	return i;
};

/** @type {Map<number, string>} */
const SINGLE_CHARACTER_ESCAPES = new Map([
	[110, "\n"],
	[114, "\r"],
	[116, "\t"],
	[98, "\b"],
	[118, "\u000B"],
	[102, "\f"]
]);

/**
 * Reads the hex digits of a `\x`/`\u` escape.
 * @param {string} source source code
 * @param {number} i offset of the first digit
 * @param {number} length how many digits to read
 * @returns {number} the code point, or `-1` when a digit is missing
 */
const readHexEscapeValue = (source, i, length) => {
	let value = 0;
	for (let j = i; j < i + length; j++) {
		const digit = Number.parseInt(source[j], 16);
		if (Number.isNaN(digit)) return -1;
		value = value * 16 + digit;
	}
	return value;
};

/**
 * Cooks one escape sequence, sloppy-mode script semantics (legacy octal included).
 * @param {string} source source code
 * @param {number} i offset just past the backslash
 * @returns {{ value: string, end: number } | undefined} the cooked text, or `undefined` when malformed
 */
const readEscape = (source, i) => {
	if (i >= source.length) return;
	const code = source.charCodeAt(i);
	const single = SINGLE_CHARACTER_ESCAPES.get(code);
	if (single !== undefined) return { value: single, end: i + 1 };
	// a line continuation cooks to nothing; `\r\n` counts as one terminator
	if (code === 13) {
		return { value: "", end: source.charCodeAt(i + 1) === 10 ? i + 2 : i + 1 };
	}
	if (code === 10 || code === 0x2028 || code === 0x2029) {
		return { value: "", end: i + 1 };
	}
	if (code === 120) {
		const value = readHexEscapeValue(source, i + 1, 2);
		if (value === -1) return;
		return { value: String.fromCodePoint(value), end: i + 3 };
	}
	if (code === 117) {
		if (source.charCodeAt(i + 1) === 123) {
			const end = source.indexOf("}", i + 2);
			if (end === -1 || end === i + 2) return;
			const value = readHexEscapeValue(source, i + 2, end - i - 2);
			if (value === -1 || value > 0x10ffff) return;
			return { value: String.fromCodePoint(value), end: end + 1 };
		}
		const value = readHexEscapeValue(source, i + 1, 4);
		if (value === -1) return;
		return { value: String.fromCodePoint(value), end: i + 5 };
	}
	if (code >= 48 && code <= 55) {
		let digits = /** @type {RegExpMatchArray} */ (
			source.slice(i, i + 3).match(/^[0-7]+/)
		)[0];
		if (Number.parseInt(digits, 8) > 255) digits = digits.slice(0, -1);
		return {
			value: String.fromCharCode(Number.parseInt(digits, 8)),
			end: i + digits.length
		};
	}
	return { value: source[i], end: i + 1 };
};

/**
 * Reads a `'`/`"` string starting at `i`, cooking its escapes the way the ast
 * this replaces did — a `Literal` node carries the cooked value, so a specifier
 * written `"\x2e/a"` is the same dependency as `"./a"`. Templates are not
 * specifiers here: the ast only matched `Literal` nodes.
 * @param {string} source source code
 * @param {number} i offset of the opening quote
 * @returns {{ value: string, end: number } | undefined} the literal
 */
const readStringLiteral = (source, i) => {
	const quote = source.charCodeAt(i);
	if (quote !== 34 && quote !== 39) return;
	for (let j = i + 1; j < source.length; j++) {
		const code = source.charCodeAt(j);
		if (code === 10 || code === 13) return;
		if (code === 92) return readEscapedStringLiteral(source, i, j);
		if (code === quote) return { value: source.slice(i + 1, j), end: j + 1 };
	}
};

/**
 * Continues `readStringLiteral` from its first escape, so the unescaped case
 * stays a single slice.
 * @param {string} source source code
 * @param {number} i offset of the opening quote
 * @param {number} firstEscape offset of the first backslash
 * @returns {{ value: string, end: number } | undefined} the literal
 */
const readEscapedStringLiteral = (source, i, firstEscape) => {
	const quote = source.charCodeAt(i);
	let value = "";
	let segment = i + 1;
	for (let j = firstEscape; j < source.length; j++) {
		const code = source.charCodeAt(j);
		if (code === 10 || code === 13) return;
		if (code === quote) {
			return { value: value + source.slice(segment, j), end: j + 1 };
		}
		if (code !== 92) continue;
		const escape = readEscape(source, j + 1);
		if (escape === undefined) return;
		value += source.slice(segment, j) + escape.value;
		segment = escape.end;
		j = escape.end - 1;
	}
};

/**
 * Scans a template body from `i` (just past a backtick or a `}` resuming one).
 * @param {string} source source code
 * @param {number} i offset inside the template
 * @returns {{ end: number, substitution: boolean }} where the body stops
 */
const skipTemplateBody = (source, i) => {
	for (; i < source.length; i++) {
		const code = source.charCodeAt(i);
		if (code === 92) {
			i++;
		} else if (code === 96) {
			return { end: i, substitution: false };
		} else if (code === 36 && source.charCodeAt(i + 1) === 123) {
			return { end: i + 1, substitution: true };
		}
	}
	return { end: source.length, substitution: false };
};

/**
 * Collects the specifiers of static `require("…")` calls. A scan rather than a
 * parse: it only has to skip what could hide or fake a call — comments, strings,
 * templates and regexps — so it costs one pass and builds no ast. Template
 * substitutions are scanned as the code they are, which is why the brace depth
 * of each open `${` is tracked.
 * @param {string} source source code
 * @returns {Set<string>} required specifiers
 */
const collectCjsRequireSpecifiers = (source) => {
	/** @type {Set<string>} */
	const specifiers = new Set();
	/** @type {number[]} */
	const templateBraceDepths = [];
	let braceDepth = 0;
	for (let i = 0; i < source.length; i++) {
		const code = source.charCodeAt(i);
		if (code === 96) {
			const body = skipTemplateBody(source, i + 1);
			i = body.end;
			if (body.substitution) {
				templateBraceDepths.push(braceDepth);
				braceDepth++;
			}
			continue;
		}
		if (code === 123) {
			braceDepth++;
			continue;
		}
		if (code === 125) {
			braceDepth--;
			if (
				templateBraceDepths.length > 0 &&
				templateBraceDepths[templateBraceDepths.length - 1] === braceDepth
			) {
				templateBraceDepths.pop();
				const body = skipTemplateBody(source, i + 1);
				i = body.end;
				if (body.substitution) {
					templateBraceDepths.push(braceDepth);
					braceDepth++;
				}
			}
			continue;
		}
		if (code === 34 || code === 39) {
			for (i++; i < source.length; i++) {
				const inner = source.charCodeAt(i);
				if (inner === 92) i++;
				else if (inner === code) break;
			}
			continue;
		}
		if (code === 47) {
			const next = source.charCodeAt(i + 1);
			if (next === 47) {
				const end = source.indexOf("\n", i + 2);
				i = end === -1 ? source.length : end;
				continue;
			}
			if (next === 42) {
				const end = source.indexOf("*/", i + 2);
				i = end === -1 ? source.length : end + 1;
				continue;
			}
			if (!startsRegExp(source, i)) continue;
			let inClass = false;
			for (i++; i < source.length; i++) {
				const inner = source.charCodeAt(i);
				if (inner === 92) i++;
				else if (inner === 91) inClass = true;
				else if (inner === 93) inClass = false;
				else if (inner === 10) break;
				else if (inner === 47 && !inClass) break;
			}
			continue;
		}
		// `r` of `require`, as a whole word that is not a member access
		if (code !== 114 || !source.startsWith("require", i)) continue;
		if (isIdentifierChar(source.charCodeAt(i + 7))) continue;
		if (i > 0) {
			const before = source.charCodeAt(i - 1);
			if (isIdentifierChar(before) || before === 46) continue;
		}
		let j = skipTrivia(source, i + 7);
		if (source.charCodeAt(j) !== 40) continue;
		j = skipTrivia(source, j + 1);
		// a cast wraps the specifier in its own parens: `require(/** … */ ("x"))`
		let parens = 0;
		while (source.charCodeAt(j) === 40) {
			parens++;
			j = skipTrivia(source, j + 1);
		}
		const literal = readStringLiteral(source, j);
		if (literal === undefined) {
			i += 6;
			continue;
		}
		j = skipTrivia(source, literal.end);
		while (parens > 0 && source.charCodeAt(j) === 41) {
			parens--;
			j = skipTrivia(source, j + 1);
		}
		if (parens !== 0 || source.charCodeAt(j) !== 41) {
			i += 6;
			continue;
		}
		specifiers.add(literal.value);
		i = j;
	}
	return specifiers;
};

module.exports.LEGACY_ASSERT_ATTRIBUTES = LEGACY_ASSERT_ATTRIBUTES;
module.exports.WebpackParser = WebpackParser;
module.exports.buildLineStarts = buildLineStarts;
module.exports.collectCjsRequireSpecifiers = collectCjsRequireSpecifiers;
module.exports.hasOctalEscape = hasOctalEscape;
module.exports.isIdentifierChar = isIdentifierChar;
module.exports.positionAt = positionAt;
module.exports.releaseParserCaches = releaseParserCaches;
