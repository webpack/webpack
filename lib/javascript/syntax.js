/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// cspell:ignore yuku binop prec Prec Unsyntactic iget iset sget sset

const { Parser: BaseParser, tokTypes } = require("acorn");

// acorn exports its token-context table but leaves it out of its public types
const tokContexts =
	/** @type {Record<string, unknown>} */
	(
		/** @type {{ tokContexts: Record<string, unknown> }} */
		(/** @type {unknown} */ (require("acorn"))).tokContexts
	);

/** @typedef {{ token: string, isExpr: boolean, preserveSpace?: boolean, override?: unknown }} TokContextShim acorn TokContext fields read by the owned tokenizer */

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
/** @typedef {TokenType & { beforeExpr: boolean, isAssign?: boolean, prefix?: boolean, postfix?: boolean, binop: number | null, updateContext?: (prevType: TokenType) => void }} TokenTypeInternal acorn's internal TokenType fields, absent from its public types */
/** @typedef {import("estree").SourceLocation} SourceLocation */
/** @typedef {[number, number]} Range */
/** @typedef {"defer" | "source"} ImportPhase */
/** @typedef {import("estree").Comment & { start: number, end: number }} CollectedComment comment as JavascriptParser exposes it */

// Symbol-keyed so they stay out of for-in, Object.keys and JSON.stringify
// over AST nodes.
const kSource = Symbol("source");
const kRange = Symbol("range");
const kText = Symbol("text");
const kTextStart = Symbol("text start");

// Marks import attributes parsed from the legacy `assert {...}` syntax.
const LEGACY_ASSERT_ATTRIBUTES = Symbol("assert");

// acorn's binding types and scope flags, stable across acorn 8
const BIND_VAR = 1;
const BIND_LEXICAL = 2;
const BIND_FUNCTION = 3;
const BIND_OUTSIDE = 5;
const SCOPE_TOP = 1;
const SCOPE_FUNCTION = 2;
const SCOPE_ASYNC = 4;
const SCOPE_GENERATOR = 8;
const SCOPE_ARROW = 16;
const SCOPE_SIMPLE_CATCH = 32;
const SCOPE_SUPER = 64;
const SCOPE_DIRECT_SUPER = 128;
// SCOPE_TOP | SCOPE_FUNCTION | SCOPE_CLASS_STATIC_BLOCK
const SCOPE_VAR = 0b100000011;

// acorn's `parseFunction` statement-context flags
const FUNC_STATEMENT = 1;
const FUNC_HANGING_STATEMENT = 2;
const FUNC_NULLABLE_ID = 4;

const BIND_SIMPLE_CATCH = 4;
const SCOPE_CLASS_STATIC_BLOCK = 256;
const SCOPE_CLASS_FIELD_INIT = 512;
const SCOPE_SWITCH = 1024;

// mirror of acorn's module-level shared label records (compared by field,
// never by identity)
const LOOP_LABEL = { kind: "loop" };
const SWITCH_LABEL = { kind: "switch" };

/**
 * Mirror of acorn's module-level `functionFlags`.
 * @param {boolean} async whether the function is async
 * @param {boolean} generator whether the function is a generator
 * @returns {number} scope flags for `enterScope`
 */
const functionFlags = (async, generator) =>
	SCOPE_FUNCTION |
	(async ? SCOPE_ASYNC : 0) |
	(generator ? SCOPE_GENERATOR : 0);

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

/**
 * Single-shape node for all three function forms. `generator`, `expression`
 * and `async` are real fields on every instance since the owned function
 * grammar requires `ecmaVersion >= 8`; field order mirrors acorn's insertion
 * order.
 */
class FunctionNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {"FunctionDeclaration" | "FunctionExpression" | "ArrowFunctionExpression"} type node type
	 * @param {Identifier | null} id function name
	 * @param {Node[]} params parameters
	 * @param {Node} body block or arrow expression body
	 * @param {boolean} generator whether this is a generator
	 * @param {boolean} async whether this is async
	 * @param {boolean} expression whether the body is an expression (arrows)
	 */
	constructor(
		start,
		end,
		type,
		id,
		params,
		body,
		generator,
		async,
		expression
	) {
		this.type = type;
		this.start = start;
		this.end = end;
		this.id = id;
		// acorn's `generator = expression = false` chain inserts `expression`
		// first; keep its enumeration order observable to plugins
		this.expression = expression;
		this.generator = generator;
		this.async = async;
		this.params = params;
		this.body = body;
	}
}

/**
 * Single-shape `ForStatement` — the only node with four fixed children.
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
 * Single-shape `ForInStatement` (and pre-ES2018 `ForOfStatement`, which
 * acorn leaves without an `await` field).
 */
class ForInNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {string} type node type
	 * @param {Node} left loop variable or pattern
	 * @param {Expression} right iterated expression
	 * @param {Node} body loop body
	 */
	constructor(start, end, type, left, right, body) {
		this.type = type;
		this.start = start;
		this.end = end;
		this.left = left;
		this.right = right;
		this.body = body;
	}
}

/**
 * Single-shape `ForOfStatement`; `await` precedes the children like in
 * acorn's insertion order.
 */
class ForOfNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {boolean} isAwait whether this is `for await`
	 * @param {Node} left loop variable or pattern
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
 * Single-shape `DoWhileStatement`; `body` precedes `test` like in acorn's
 * insertion order.
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
 * Single-shape `SwitchCase`, born unfinished like acorn's: `test` and `end`
 * are filled while the clause parses, keeping one hidden class throughout.
 */
class SwitchCaseNode {
	/**
	 * @param {number} start start offset
	 */
	constructor(start) {
		this.type = "SwitchCase";
		this.start = start;
		this.end = 0;
		/** @type {Node[]} */
		this.consequent = [];
		/** @type {Expression | null} */
		this.test = null;
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
	 * @param {Node | null} param catch binding (`null` for bare `catch {}`)
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
 * Single-shape `LabeledStatement`; `body` precedes `label` like in acorn's
 * insertion order.
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
 * Single-shape `BreakStatement` / `ContinueStatement`.
 */
class BreakContinueNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {string} type node type
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
 * Single-shape childless statement (`EmptyStatement`, `DebuggerStatement`).
 */
class BareStatementNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {string} type node type
	 */
	constructor(start, end, type) {
		this.type = type;
		this.start = start;
		this.end = end;
	}
}

/**
 * Single-shape `SequenceExpression`.
 */
class SequenceExpressionNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Expression[]} expressions sequence members
	 */
	constructor(start, end, expressions) {
		this.type = "SequenceExpression";
		this.start = start;
		this.end = end;
		this.expressions = expressions;
	}
}

/**
 * Single-shape `ChainExpression`.
 */
class ChainExpressionNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Expression} expression wrapped optional chain
	 */
	constructor(start, end, expression) {
		this.type = "ChainExpression";
		this.start = start;
		this.end = end;
		this.expression = expression;
	}
}

/**
 * Single-shape `YieldExpression`.
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
 * Single-shape `ExportSpecifier`.
 */
class ExportSpecifierNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Node} local local name
	 * @param {Node} exported exported name
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
 * Single-shape `ArrayPattern`.
 */
class ArrayPatternNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {(Node | null)[]} elements pattern elements (`null` for holes)
	 */
	constructor(start, end, elements) {
		this.type = "ArrayPattern";
		this.start = start;
		this.end = end;
		this.elements = elements;
	}
}

/**
 * Single-shape `AssignmentPattern` (defaulted binding).
 */
class AssignmentPatternNode {
	/**
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {Node} left bound pattern
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

/** @typedef {Node & { static?: boolean, computed?: boolean, key?: Node & { name?: string, value?: unknown }, kind?: string, value?: (Node & { params: Node[] }) | null }} ClassElementNode */

/**
 * Mirror of acorn's module-level `checkKeyName`.
 * @param {ClassElementNode} node class element
 * @param {string} name checked name
 * @returns {boolean} whether the non-computed key spells `name`
 */
const checkKeyName = (node, name) => {
	const key = /** @type {NonNullable<ClassElementNode["key"]>} */ (node.key);
	return (
		!node.computed &&
		((key.type === "Identifier" && key.name === name) ||
			(key.type === "Literal" && key.value === name))
	);
};

/**
 * Mirror of acorn's module-level `isPrivateNameConflicted`.
 * @param {Record<string, string>} privateNameMap declared private names
 * @param {ClassElementNode} element class element with a private key
 * @returns {boolean} whether the declaration conflicts
 */
const isPrivateNameConflicted = (privateNameMap, element) => {
	const name = /** @type {string} */ (
		/** @type {NonNullable<ClassElementNode["key"]>} */ (element.key).name
	);
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
 * Mirror of acorn's `isSimpleParamList` over a params local.
 * @param {Node[]} params parameters
 * @returns {boolean} whether every param is a plain identifier
 */
const isSimpleParamList = (params) => {
	for (let i = 0; i < params.length; i++) {
		if (params[i].type !== "Identifier") return false;
	}
	return true;
};

// Shared zero-length arguments array for `new X` without parens, mirroring
// acorn's module-level `empty`.
/** @type {Expression[]} */
const EMPTY_NEW_ARGS = [];

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
	ForStatementNode,
	ForInNode,
	ForOfNode,
	WhileStatementNode,
	DoWhileStatementNode,
	SwitchStatementNode,
	SwitchCaseNode,
	TryStatementNode,
	CatchClauseNode,
	ThrowStatementNode,
	LabeledStatementNode,
	BreakContinueNode,
	BareStatementNode,
	WithStatementNode,
	ArrayPatternNode,
	AssignmentPatternNode,
	SequenceExpressionNode,
	ChainExpressionNode,
	YieldExpressionNode,
	AwaitExpressionNode,
	ExportSpecifierNode
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

// ----- node-construction seam (Phase B): every owned construction site
// calls one of these module-level emitters, so the SoA backend (Phase C)
// can swap in column emission without touching the grammar code. Each
// emitter mirrors its node class constructor exactly. -----

/**
 * Emits a `IdentifierNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {string} name identifier name
 * @returns {IdentifierNode} constructed node
 */
const _emitIdentifier = (start, end, name) =>
	new IdentifierNode(start, end, name);

/**
 * Emits a `LiteralNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {unknown} value literal value
 * @param {string} raw literal source text
 * @returns {LiteralNode} constructed node
 */
const _emitLiteral = (start, end, value, raw) =>
	new LiteralNode(start, end, value, raw);

/**
 * Emits a `MemberExpressionNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {Expression} object object expression
 * @param {Node} property property node
 * @param {boolean} computed whether the access is computed (`a[b]`)
 * @param {boolean} optional whether the access is optional (`a?.b`)
 * @returns {MemberExpressionNode} constructed node
 */
const _emitMemberExpression = (
	start,
	end,
	object,
	property,
	computed,
	optional
) => new MemberExpressionNode(start, end, object, property, computed, optional);

/**
 * Emits a `CallExpressionNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {Expression} callee callee expression
 * @param {Node[]} args call arguments
 * @param {boolean} optional whether the call is optional (`a?.()`)
 * @returns {CallExpressionNode} constructed node
 */
const _emitCallExpression = (start, end, callee, args, optional) =>
	new CallExpressionNode(start, end, callee, args, optional);

/**
 * Emits a `ThisNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @returns {ThisNode} constructed node
 */
const _emitThis = (start, end) => new ThisNode(start, end);

/**
 * Emits a `BinaryNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {"BinaryExpression" | "LogicalExpression"} type node type
 * @param {Expression} left left operand
 * @param {string} operator operator text
 * @param {Expression} right right operand
 * @returns {BinaryNode} constructed node
 */
const _emitBinary = (start, end, type, left, operator, right) =>
	new BinaryNode(start, end, type, left, operator, right);

/**
 * Emits a `AssignmentNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {string} operator assignment operator text
 * @param {Node} left assignment target
 * @param {Expression} right assigned value
 * @returns {AssignmentNode} constructed node
 */
const _emitAssignment = (start, end, operator, left, right) =>
	new AssignmentNode(start, end, operator, left, right);

/**
 * Emits a `UnaryNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {"UnaryExpression" | "UpdateExpression"} type node type
 * @param {string} operator operator text
 * @param {boolean} prefix whether the operator is prefixed
 * @param {Expression} argument operand
 * @returns {UnaryNode} constructed node
 */
const _emitUnary = (start, end, type, operator, prefix, argument) =>
	new UnaryNode(start, end, type, operator, prefix, argument);

/**
 * Emits a `VariableDeclarationNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {Node[]} declarations declarators
 * @param {string} kind declaration kind (`var`/`let`/`const`/`using`)
 * @returns {VariableDeclarationNode} constructed node
 */
const _emitVariableDeclaration = (start, end, declarations, kind) =>
	new VariableDeclarationNode(start, end, declarations, kind);

/**
 * Emits a `VariableDeclaratorNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {Node} id binding target
 * @param {Expression | null} init initializer
 * @returns {VariableDeclaratorNode} constructed node
 */
const _emitVariableDeclarator = (start, end, id, init) =>
	new VariableDeclaratorNode(start, end, id, init);

/**
 * Emits a `ExpressionStatementNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {Expression} expression the statement's expression
 * @returns {ExpressionStatementNode} constructed node
 */
const _emitExpressionStatement = (start, end, expression) =>
	new ExpressionStatementNode(start, end, expression);

/**
 * Emits a `BlockStatementNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {Node[]} body statements
 * @returns {BlockStatementNode} constructed node
 */
const _emitBlockStatement = (start, end, body) =>
	new BlockStatementNode(start, end, body);

/**
 * Emits a `IfStatementNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {Expression} test condition
 * @param {Node} consequent then-branch
 * @param {Node | null} alternate else-branch
 * @returns {IfStatementNode} constructed node
 */
const _emitIfStatement = (start, end, test, consequent, alternate) =>
	new IfStatementNode(start, end, test, consequent, alternate);

/**
 * Emits a `ReturnStatementNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {Expression | null} argument returned expression
 * @returns {ReturnStatementNode} constructed node
 */
const _emitReturnStatement = (start, end, argument) =>
	new ReturnStatementNode(start, end, argument);

/**
 * Emits a `ConditionalExpressionNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {Expression} test condition
 * @param {Expression} consequent then-value
 * @param {Expression} alternate else-value
 * @returns {ConditionalExpressionNode} constructed node
 */
const _emitConditionalExpression = (start, end, test, consequent, alternate) =>
	new ConditionalExpressionNode(start, end, test, consequent, alternate);

/**
 * Emits a `NewExpressionNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {Expression} callee constructed expression
 * @param {Expression[]} args constructor arguments
 * @returns {NewExpressionNode} constructed node
 */
const _emitNewExpression = (start, end, callee, args) =>
	new NewExpressionNode(start, end, callee, args);

/**
 * Emits a `ArrayExpressionNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {(Expression | null)[]} elements array elements (`null` for holes)
 * @returns {ArrayExpressionNode} constructed node
 */
const _emitArrayExpression = (start, end, elements) =>
	new ArrayExpressionNode(start, end, elements);

/**
 * Emits a `TemplateLiteralNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {Expression[]} expressions substitution expressions
 * @param {Node[]} quasis template chunks
 * @returns {TemplateLiteralNode} constructed node
 */
const _emitTemplateLiteral = (start, end, expressions, quasis) =>
	new TemplateLiteralNode(start, end, expressions, quasis);

/**
 * Emits a `TemplateElementNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {{ raw: string, cooked: string | null }} value chunk text
 * @param {boolean} tail whether this is the closing chunk
 * @returns {TemplateElementNode} constructed node
 */
const _emitTemplateElement = (start, end, value, tail) =>
	new TemplateElementNode(start, end, value, tail);

/**
 * Emits a `ObjectNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {"ObjectExpression" | "ObjectPattern"} type node type
 * @param {Node[]} properties properties
 * @returns {ObjectNode} constructed node
 */
const _emitObject = (start, end, type, properties) =>
	new ObjectNode(start, end, type, properties);

/**
 * Emits a `PropertyNode` (Phase B seam).
 * @param {number} start start offset
 * @returns {PropertyNode} constructed node
 */
const _emitPropertyStart = (start) => new PropertyNode(start);

/**
 * Emits a `RestSpreadNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {"SpreadElement" | "RestElement"} type node type
 * @param {Node} argument spread/rest argument
 * @returns {RestSpreadNode} constructed node
 */
const _emitRestSpread = (start, end, type, argument) =>
	new RestSpreadNode(start, end, type, argument);

/**
 * Emits a `FunctionNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {"FunctionDeclaration" | "FunctionExpression" | "ArrowFunctionExpression"} type node type
 * @param {Identifier | null} id function name
 * @param {Node[]} params parameters
 * @param {Node} body block or arrow expression body
 * @param {boolean} generator whether this is a generator
 * @param {boolean} async whether this is async
 * @param {boolean} expression whether the body is an expression (arrows)
 * @returns {FunctionNode} constructed node
 */
const _emitFunction = (
	start,
	end,
	type,
	id,
	params,
	body,
	generator,
	async,
	expression
) =>
	new FunctionNode(
		start,
		end,
		type,
		id,
		params,
		body,
		generator,
		async,
		expression
	);

/**
 * Emits a `SequenceExpressionNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {Expression[]} expressions sequence members
 * @returns {SequenceExpressionNode} constructed node
 */
const _emitSequenceExpression = (start, end, expressions) =>
	new SequenceExpressionNode(start, end, expressions);

/**
 * Emits a `ChainExpressionNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {Expression} expression wrapped optional chain
 * @returns {ChainExpressionNode} constructed node
 */
const _emitChainExpression = (start, end, expression) =>
	new ChainExpressionNode(start, end, expression);

/**
 * Emits a `YieldExpressionNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {boolean} delegate whether this is `yield*`
 * @param {Expression | null} argument yielded expression
 * @returns {YieldExpressionNode} constructed node
 */
const _emitYieldExpression = (start, end, delegate, argument) =>
	new YieldExpressionNode(start, end, delegate, argument);

/**
 * Emits a `AwaitExpressionNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {Expression} argument awaited expression
 * @returns {AwaitExpressionNode} constructed node
 */
const _emitAwaitExpression = (start, end, argument) =>
	new AwaitExpressionNode(start, end, argument);

/**
 * Emits a `ExportSpecifierNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {Node} local local name
 * @param {Node} exported exported name
 * @returns {ExportSpecifierNode} constructed node
 */
const _emitExportSpecifier = (start, end, local, exported) =>
	new ExportSpecifierNode(start, end, local, exported);

/**
 * Emits a `ForStatementNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {Node | null} init init statement or expression
 * @param {Expression | null} test loop condition
 * @param {Expression | null} update update expression
 * @param {Node} body loop body
 * @returns {ForStatementNode} constructed node
 */
const _emitForStatement = (start, end, init, test, update, body) =>
	new ForStatementNode(start, end, init, test, update, body);

/**
 * Emits a `ForInNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {string} type node type
 * @param {Node} left loop variable or pattern
 * @param {Expression} right iterated expression
 * @param {Node} body loop body
 * @returns {ForInNode} constructed node
 */
const _emitForIn = (start, end, type, left, right, body) =>
	new ForInNode(start, end, type, left, right, body);

/**
 * Emits a `ForOfNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {boolean} isAwait whether this is `for await`
 * @param {Node} left loop variable or pattern
 * @param {Expression} right iterated expression
 * @param {Node} body loop body
 * @returns {ForOfNode} constructed node
 */
const _emitForOf = (start, end, isAwait, left, right, body) =>
	new ForOfNode(start, end, isAwait, left, right, body);

/**
 * Emits a `WhileStatementNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {Expression} test loop condition
 * @param {Node} body loop body
 * @returns {WhileStatementNode} constructed node
 */
const _emitWhileStatement = (start, end, test, body) =>
	new WhileStatementNode(start, end, test, body);

/**
 * Emits a `DoWhileStatementNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {Node} body loop body
 * @param {Expression} test loop condition
 * @returns {DoWhileStatementNode} constructed node
 */
const _emitDoWhileStatement = (start, end, body, test) =>
	new DoWhileStatementNode(start, end, body, test);

/**
 * Emits a `SwitchStatementNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {Expression} discriminant switched expression
 * @param {Node[]} cases case clauses
 * @returns {SwitchStatementNode} constructed node
 */
const _emitSwitchStatement = (start, end, discriminant, cases) =>
	new SwitchStatementNode(start, end, discriminant, cases);

/**
 * Emits a `SwitchCaseNode` (Phase B seam).
 * @param {number} start start offset
 * @returns {SwitchCaseNode} constructed node
 */
const _emitSwitchCaseStart = (start) => new SwitchCaseNode(start);

/**
 * Emits a `TryStatementNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {Node} block try block
 * @param {Node | null} handler catch clause
 * @param {Node | null} finalizer finally block
 * @returns {TryStatementNode} constructed node
 */
const _emitTryStatement = (start, end, block, handler, finalizer) =>
	new TryStatementNode(start, end, block, handler, finalizer);

/**
 * Emits a `CatchClauseNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {Node | null} param catch binding (`null` for bare `catch {}`)
 * @param {Node} body catch block
 * @returns {CatchClauseNode} constructed node
 */
const _emitCatchClause = (start, end, param, body) =>
	new CatchClauseNode(start, end, param, body);

/**
 * Emits a `ThrowStatementNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {Expression} argument thrown expression
 * @returns {ThrowStatementNode} constructed node
 */
const _emitThrowStatement = (start, end, argument) =>
	new ThrowStatementNode(start, end, argument);

/**
 * Emits a `LabeledStatementNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {Node} body labeled statement
 * @param {Identifier} label label identifier
 * @returns {LabeledStatementNode} constructed node
 */
const _emitLabeledStatement = (start, end, body, label) =>
	new LabeledStatementNode(start, end, body, label);

/**
 * Emits a `BreakContinueNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {string} type node type
 * @param {Identifier | null} label target label
 * @returns {BreakContinueNode} constructed node
 */
const _emitBreakContinue = (start, end, type, label) =>
	new BreakContinueNode(start, end, type, label);

/**
 * Emits a `BareStatementNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {string} type node type
 * @returns {BareStatementNode} constructed node
 */
const _emitBareStatement = (start, end, type) =>
	new BareStatementNode(start, end, type);

/**
 * Emits a `WithStatementNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {Expression} object scope object expression
 * @param {Node} body statement body
 * @returns {WithStatementNode} constructed node
 */
const _emitWithStatement = (start, end, object, body) =>
	new WithStatementNode(start, end, object, body);

/**
 * Emits a `ArrayPatternNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {(Node | null)[]} elements pattern elements (`null` for holes)
 * @returns {ArrayPatternNode} constructed node
 */
const _emitArrayPattern = (start, end, elements) =>
	new ArrayPatternNode(start, end, elements);

/**
 * Emits a `AssignmentPatternNode` (Phase B seam).
 * @param {number} start start offset
 * @param {number} end end offset
 * @param {Node} left bound pattern
 * @param {Expression} right default value
 * @returns {AssignmentPatternNode} constructed node
 */
const _emitAssignmentPattern = (start, end, left, right) =>
	new AssignmentPatternNode(start, end, left, right);

// ----- Structure-of-Arrays AST backend (SoA migration phase C1
// scaffolding, see SOA_MIGRATION_PLAN.md). Not yet wired into parsing: the
// `_emit*` seam above swaps to `allocNode`-based emission once every node
// type is covered. -----

/** @typedef {number} NodeRef 1-based node id into the columns; 0 = no node */

// Numeric node types (facades map them back to estree strings). Grows with
// coverage; ids are internal only and may be renumbered freely.
const TYPE_IDENTIFIER = 1;
const TYPE_MEMBER_EXPRESSION = 2;
const TYPE_CALL_EXPRESSION = 3;
const TYPE_EXPRESSION_STATEMENT = 4;
const TYPE_BLOCK_STATEMENT = 5;
const TYPE_PROGRAM = 6;

const TYPE_NAMES = [
	"",
	"Identifier",
	"MemberExpression",
	"CallExpression",
	"ExpressionStatement",
	"BlockStatement",
	"Program"
];

// per-type packed flag bits
const FLAG_COMPUTED = 1;
const FLAG_OPTIONAL = 2;

// symbol slots: invisible to for-in / Object.keys / JSON.stringify
const kSoaStore = Symbol("soa ast");
const kSoaId = Symbol("soa id");
const kSoaMemoA = Symbol("memo a");
const kSoaMemoB = Symbol("memo b");
const kSoaMemoC = Symbol("memo b2");

// measured on the phase 0 corpus: one node per ≈ 10 source bytes
const NODES_PER_SOURCE_BYTE = 10;
const MIN_CAPACITY = 256;

/**
 * Column store for one parse plus the facade memo table. Owned per parse —
 * never a module-level singleton — so an escaped facade can never dangle
 * over recycled columns (the GC frees both together).
 */
class SoaAst {
	/**
	 * @param {string} source source code (facades derive strings from it)
	 */
	constructor(source) {
		const capacity = Math.max(
			MIN_CAPACITY,
			Math.ceil(source.length / NODES_PER_SOURCE_BYTE)
		);
		this.source = source;
		/** @type {number} next node id (slot 0 stays the null node) */
		this.count = 1;
		this.capacity = capacity;
		/** @type {Uint8Array} */
		this.types = new Uint8Array(capacity);
		/** @type {Int32Array} */
		this.starts = new Int32Array(capacity);
		/** @type {Int32Array} */
		this.ends = new Int32Array(capacity);
		/** @type {Int32Array} */
		this.kid0 = new Int32Array(capacity);
		/** @type {Int32Array} */
		this.kid1 = new Int32Array(capacity);
		/** @type {Uint8Array} */
		this.flags = new Uint8Array(capacity);
		/** @type {Int32Array} */
		this.listStarts = new Int32Array(capacity);
		/** @type {Int32Array} */
		this.listLens = new Int32Array(capacity);
		/** @type {Int32Array} shared child-list buffer (`listStarts` spans) */
		this.flat = new Int32Array(Math.max(MIN_CAPACITY, capacity >> 1));
		this.flatTop = 0;
		// identity-stable facades; filled lazily on materialization
		/** @type {(EXPECTED_OBJECT | undefined)[]} */
		this.facades = [];
	}

	/**
	 * @param {number} need required node capacity
	 * @returns {void}
	 */
	_grow(need) {
		let capacity = this.capacity;
		do {
			capacity *= 2;
		} while (capacity < need);
		/**
		 * @param {Int32Array | Uint8Array} old previous column
		 * @param {boolean} u8 whether the column is byte-sized
		 * @returns {EXPECTED_ANY} grown column
		 */
		const grow = (old, u8) => {
			const next = u8 ? new Uint8Array(capacity) : new Int32Array(capacity);
			next.set(old);
			return next;
		};
		this.types = /** @type {Uint8Array} */ (grow(this.types, true));
		this.starts = /** @type {Int32Array} */ (grow(this.starts, false));
		this.ends = /** @type {Int32Array} */ (grow(this.ends, false));
		this.kid0 = /** @type {Int32Array} */ (grow(this.kid0, false));
		this.kid1 = /** @type {Int32Array} */ (grow(this.kid1, false));
		this.flags = /** @type {Uint8Array} */ (grow(this.flags, true));
		this.listStarts = /** @type {Int32Array} */ (grow(this.listStarts, false));
		this.listLens = /** @type {Int32Array} */ (grow(this.listLens, false));
		this.capacity = capacity;
	}

	/**
	 * @param {number} type numeric node type
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @returns {NodeRef} new node ref
	 */
	allocNode(type, start, end) {
		const id = this.count++;
		if (id >= this.capacity) this._grow(id + 1);
		this.types[id] = type;
		this.starts[id] = start;
		this.ends[id] = end;
		return id;
	}

	/**
	 * Seals a child list into the shared flat buffer.
	 * @param {NodeRef} id owning node
	 * @param {NodeRef[]} childRefs child refs (scratch array, not retained)
	 * @returns {void}
	 */
	setList(id, childRefs) {
		const len = childRefs.length;
		const top = this.flatTop;
		if (top + len > this.flat.length) {
			let capacity = this.flat.length;
			do {
				capacity *= 2;
			} while (capacity < top + len);
			const next = new Int32Array(capacity);
			next.set(this.flat);
			this.flat = next;
		}
		const flat = this.flat;
		for (let i = 0; i < len; i++) flat[top + i] = childRefs[i];
		this.listStarts[id] = top;
		this.listLens[id] = len;
		this.flatTop = top + len;
	}

	/**
	 * Identity-stable facade for a node ref (0 serves `null`).
	 * @param {NodeRef} id node ref
	 * @returns {EXPECTED_OBJECT | null} estree-shaped facade
	 */
	nodeAt(id) {
		if (id === 0) return null;
		const cached = this.facades[id];
		if (cached !== undefined) return cached;
		const facade = new FACADE_CLASSES[this.types[id]](this, id);
		this.facades[id] = facade;
		return facade;
	}

	/**
	 * @param {NodeRef} id owning node
	 * @returns {(EXPECTED_OBJECT | null)[]} materialized child list
	 */
	listAt(id) {
		const len = this.listLens[id];
		const start = this.listStarts[id];
		const flat = this.flat;
		/** @type {(EXPECTED_OBJECT | null)[]} */
		const out = Array.from({ length: len });
		for (let i = 0; i < len; i++) out[i] = this.nodeAt(flat[start + i]);
		return out;
	}
}

// ----- candidate-2 facades (C0 verdict): own scalar fields, child getters
// on the prototype, memoized into symbol slots. `Object.keys`/spread/JSON
// omit children by design; the opt-in defineProperties mode (full
// enumeration) arrives with the escape hatch in a later step. -----

/**
 * Shared base: `range` served like the parser's `LazyLocNode`.
 */
class FacadeBase {
	/**
	 * @param {SoaAst} ast owning column store
	 * @param {NodeRef} id node ref
	 * @param {string} type estree type string
	 */
	constructor(ast, id, type) {
		this.type = type;
		this.start = ast.starts[id];
		this.end = ast.ends[id];
		this[kSoaStore] = ast;
		this[kSoaId] = id;
	}

	/**
	 * @returns {[number, number]} source range
	 */
	get range() {
		const cached = this[kSoaMemoB];
		if (cached !== undefined) return cached;
		return (this[kSoaMemoB] = /** @type {[number, number]} */ ([
			this.start,
			this.end
		]));
	}

	/**
	 * @param {[number, number]} value source range
	 */
	set range(value) {
		this[kSoaMemoB] = value;
	}
}

class IdentifierFacade extends FacadeBase {
	/**
	 * @param {SoaAst} ast owning column store
	 * @param {NodeRef} id node ref
	 */
	constructor(ast, id) {
		super(ast, id, "Identifier");
		// names are hot and cheap: derive eagerly from the source
		this.name = ast.source.slice(this.start, this.end);
	}
}

class MemberExpressionFacade extends FacadeBase {
	/**
	 * @param {SoaAst} ast owning column store
	 * @param {NodeRef} id node ref
	 */
	constructor(ast, id) {
		super(ast, id, "MemberExpression");
		const flags = ast.flags[id];
		this.computed = (flags & FLAG_COMPUTED) !== 0;
		this.optional = (flags & FLAG_OPTIONAL) !== 0;
	}

	get object() {
		const cached = this[kSoaMemoA];
		if (cached !== undefined) return cached;
		return (this[kSoaMemoA] = this[kSoaStore].nodeAt(
			this[kSoaStore].kid0[this[kSoaId]]
		));
	}

	set object(value) {
		this[kSoaMemoA] = value;
	}

	get property() {
		const cached = this[kSoaMemoC];
		if (cached !== undefined) return cached;
		return (this[kSoaMemoC] = this[kSoaStore].nodeAt(
			this[kSoaStore].kid1[this[kSoaId]]
		));
	}

	set property(value) {
		this[kSoaMemoC] = value;
	}
}

class CallExpressionFacade extends FacadeBase {
	/**
	 * @param {SoaAst} ast owning column store
	 * @param {NodeRef} id node ref
	 */
	constructor(ast, id) {
		super(ast, id, "CallExpression");
		this.optional = (ast.flags[id] & FLAG_OPTIONAL) !== 0;
	}

	get callee() {
		const cached = this[kSoaMemoA];
		if (cached !== undefined) return cached;
		return (this[kSoaMemoA] = this[kSoaStore].nodeAt(
			this[kSoaStore].kid0[this[kSoaId]]
		));
	}

	set callee(value) {
		this[kSoaMemoA] = value;
	}

	get arguments() {
		const cached = this[kSoaMemoC];
		if (cached !== undefined) return cached;
		return (this[kSoaMemoC] = this[kSoaStore].listAt(this[kSoaId]));
	}

	set arguments(value) {
		this[kSoaMemoC] = value;
	}
}

class ExpressionStatementFacade extends FacadeBase {
	/**
	 * @param {SoaAst} ast owning column store
	 * @param {NodeRef} id node ref
	 */
	constructor(ast, id) {
		super(ast, id, "ExpressionStatement");
	}

	get expression() {
		const cached = this[kSoaMemoA];
		if (cached !== undefined) return cached;
		return (this[kSoaMemoA] = this[kSoaStore].nodeAt(
			this[kSoaStore].kid0[this[kSoaId]]
		));
	}

	set expression(value) {
		this[kSoaMemoA] = value;
	}
}

class BlockStatementFacade extends FacadeBase {
	/**
	 * @param {SoaAst} ast owning column store
	 * @param {NodeRef} id node ref
	 */
	constructor(ast, id) {
		super(ast, id, "BlockStatement");
	}

	get body() {
		const cached = this[kSoaMemoA];
		if (cached !== undefined) return cached;
		return (this[kSoaMemoA] = this[kSoaStore].listAt(this[kSoaId]));
	}

	set body(value) {
		this[kSoaMemoA] = value;
	}
}

class ProgramFacade extends FacadeBase {
	/**
	 * @param {SoaAst} ast owning column store
	 * @param {NodeRef} id node ref
	 * @param {"module" | "script"} sourceType program source type
	 */
	constructor(ast, id, sourceType = "module") {
		super(ast, id, "Program");
		this.sourceType = sourceType;
	}

	get body() {
		const cached = this[kSoaMemoA];
		if (cached !== undefined) return cached;
		return (this[kSoaMemoA] = this[kSoaStore].listAt(this[kSoaId]));
	}

	set body(value) {
		this[kSoaMemoA] = value;
	}
}

/** @type {(new (ast: SoaAst, id: NodeRef) => FacadeBase)[]} */
const FACADE_CLASSES = [];
FACADE_CLASSES[TYPE_IDENTIFIER] = IdentifierFacade;
FACADE_CLASSES[TYPE_MEMBER_EXPRESSION] = MemberExpressionFacade;
FACADE_CLASSES[TYPE_CALL_EXPRESSION] = CallExpressionFacade;
FACADE_CLASSES[TYPE_EXPRESSION_STATEMENT] = ExpressionStatementFacade;
FACADE_CLASSES[TYPE_BLOCK_STATEMENT] = BlockStatementFacade;
FACADE_CLASSES[TYPE_PROGRAM] = ProgramFacade;

// exposed as statics so the module's export surface stays small
SoaAst.TYPE_IDENTIFIER = TYPE_IDENTIFIER;
SoaAst.TYPE_MEMBER_EXPRESSION = TYPE_MEMBER_EXPRESSION;
SoaAst.TYPE_CALL_EXPRESSION = TYPE_CALL_EXPRESSION;
SoaAst.TYPE_EXPRESSION_STATEMENT = TYPE_EXPRESSION_STATEMENT;
SoaAst.TYPE_BLOCK_STATEMENT = TYPE_BLOCK_STATEMENT;
SoaAst.TYPE_PROGRAM = TYPE_PROGRAM;
SoaAst.TYPE_NAMES = TYPE_NAMES;
SoaAst.FLAG_COMPUTED = FLAG_COMPUTED;
SoaAst.FLAG_OPTIONAL = FLAG_OPTIONAL;

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
	 * Served like `LazyLocNode#range`: most comments never get their range
	 * read, so the array is deferred to first access and memoized.
	 * @returns {Range} comment range
	 */
	get range() {
		const cached = this[kRange];
		if (cached !== undefined) return cached;
		/** @type {Range} */
		const range = [this.start, this.end];
		this[kRange] = range;
		return range;
	}

	/**
	 * @param {Range} value comment range
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

// Function bodies swap in a fresh `labels` array; pooled since almost every
// body ends with it still empty (labels inside functions are rare).
const LABELS_POOL_LIMIT = 64;
/** @type {{ kind: string | null, name?: string, statementStart?: number }[][]} */
const LABELS_POOL = [];

/**
 * Acorn's methods and state used by `WebpackParser` but missing from its
 * public types, plus `WebpackParser`'s own fields, so overridden methods can
 * declare `this` precisely.
 * @typedef {import("acorn").Parser & {
 * type: TokenType,
 * value: unknown,
 * start: number,
 * startLoc?: Position,
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
 * yieldPos: number,
 * awaitPos: number,
 * parseExpression: (forInit?: boolean | string, refDestructuringErrors?: DestructuringErrorsShim | null) => Expression,
 * parseSpread: (refDestructuringErrors?: DestructuringErrorsShim | null) => Node,
 * braceIsBlock: (prevType: TokenType) => boolean,
 * _gapHasNewline: () => boolean,
 * parseExprList: (close: TokenType, allowTrailingComma: boolean, allowEmpty: boolean, refDestructuringErrors?: DestructuringErrorsShim | null) => Expression[],
 * parsePrivateIdent: () => Node,
 * parseTemplate: (opts: { isTagged: boolean }) => Node,
 * shouldParseAsyncArrow: () => boolean,
 * parseSubscriptAsyncArrow: (startPos: number, startLoc: Position | undefined, exprList: Expression[], forInit: boolean | string) => Expression,
 * checkPatternErrors: (refDestructuringErrors: DestructuringErrorsShim, isAssign: boolean) => void,
 * checkYieldAwaitInDefaultParams: () => void,
 * checkExpressionErrors: (refDestructuringErrors?: DestructuringErrorsShim | null, andThrow?: boolean) => boolean,
 * parseSubscript: (base: Expression, startPos: number, startLoc: Position | undefined, noCalls: boolean | undefined, maybeAsyncArrow: boolean, optionalChained: boolean, forInit: boolean | string) => Expression,
 * parseExprAtom: (refDestructuringErrors?: DestructuringErrorsShim | null, forInit?: boolean | string, forNew?: boolean) => Expression,
 * buildBinary: (startPos: number, startLoc: Position | undefined, left: Expression, right: Expression, op: string, logical: boolean) => Expression,
 * parseMaybeAssign: (forInit?: boolean | string, refDestructuringErrors?: DestructuringErrorsShim | null, afterLeftParse?: (this: unknown, left: Expression, startPos: number, startLoc?: Position) => Expression) => Expression,
 * parseMaybeConditional: (forInit?: boolean | string, refDestructuringErrors?: DestructuringErrorsShim | null) => Expression,
 * parseMaybeUnary: (refDestructuringErrors: DestructuringErrorsShim | null, sawUnary: boolean, incDec: boolean, forInit?: boolean | string) => Expression,
 * parseExprSubscripts: (refDestructuringErrors?: DestructuringErrorsShim | null, forInit?: boolean | string) => Expression,
 * parseAwait: (forInit?: boolean | string) => Expression,
 * canAwait: boolean,
 * privateNameStack: unknown[],
 * semicolon: () => void,
 * exitScope: () => void,
 * parseStatement: (context: string | null, topLevel?: boolean, exports?: unknown) => Node,
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
 * parseSubscripts: (base: Expression, startPos: number, startLoc: Position | undefined, noCalls?: boolean, forInit?: boolean | string) => Expression,
 * parseNew: () => Expression,
 * parseTemplateElement: (opts: { isTagged: boolean }) => Node,
 * parseBlock: (createNewLexicalScope?: boolean, node?: Node, exitStrict?: boolean) => Node,
 * parseYield: (forInit?: boolean | string) => Expression,
 * toAssignable: (node: Node, isBinding?: boolean, refDestructuringErrors?: DestructuringErrorsShim | null) => Node,
 * checkLValPattern: (expr: Node, bindingType?: number, checkClashes?: Record<string, boolean> | boolean | null) => void,
 * checkUnreserved: (ref: Identifier) => void,
 * enterScope: (flags: number) => void,
 * readRegexp: () => void,
 * potentialArrowAt: number,
 * potentialArrowInForAwait: boolean,
 * overrideContext: (tokenCtx: unknown) => void,
 * parseFunction: (node: Node, statement: number, allowExpressionBody?: boolean, isAsync?: boolean, forInit?: boolean | string) => Expression,
 * parseArrowExpression: (node: Node, params: Node[], isAsync?: boolean, forInit?: boolean | string) => Expression,
 * parseMethod: (isGenerator?: boolean, isAsync?: boolean, allowDirectSuper?: boolean) => Node,
 * initFunction: (node: Node) => void,
 * parseFunctionParams: (node: Node) => void,
 * parseFunctionBody: (node: Node, isArrowFunction: boolean, isMethod: boolean, forInit?: boolean | string) => void,
 * checkParams: (node: Node, allowDuplicates: boolean) => void,
 * isSimpleParamList: (params: Node[]) => boolean,
 * checkLValInnerPattern: (expr: Node, bindingType?: number, checkClashes?: Record<string, boolean> | boolean | null) => void,
 * toAssignableList: (exprList: Node[], isBinding?: boolean) => Node[],
 * parseBindingList: (close: TokenType, allowEmpty: boolean, allowTrailingComma: boolean, allowModifiers?: boolean) => Node[],
 * parseRestBinding: () => Node,
 * shouldParseArrow: (exprList: Node[]) => boolean,
 * parseParenItem: (item: Node) => Node,
 * parseParenArrowList: (startPos: number, startLoc: Position | undefined, exprList: Node[], forInit?: boolean | string) => Expression,
 * parseParenAndDistinguishExpression: (canBeArrow?: boolean, forInit?: boolean | string) => Expression,
 * finishNodeAt: (node: Node, type: string, pos: number, loc?: Position) => Node,
 * adaptDirectivePrologue: (statements: Node[]) => void,
 * strictDirective: (start: number) => boolean,
 * labels: { kind: string | null, name?: string, statementStart?: number }[],
 * parseForStatement: (node: Node) => Node,
 * parseForAfterInit: (node: Node, init: Node, awaitAt: number) => Node,
 * parseFor: (node: Node, init: Node | null) => Node,
 * parseForIn: (node: Node, init: Node) => Node,
 * parseWhileStatement: (node: Node) => Node,
 * parseDoStatement: (node: Node) => Node,
 * parseSwitchStatement: (node: Node) => Node,
 * parseThrowStatement: (node: Node) => Node,
 * parseTryStatement: (node: Node) => Node,
 * parseCatchClauseParam: () => Node,
 * parseBreakContinueStatement: (node: Node, keyword: string) => Node,
 * parseWithStatement: (node: Node) => Node,
 * parseEmptyStatement: (node: Node) => Node,
 * parseDebuggerStatement: (node: Node) => Node,
 * parseMaybeDefault: (startPos: number, startLoc?: Position, left?: Node) => Node,
 * parseClass: (node: Node, isStatement: boolean | string) => Node,
 * parseClassElement: (constructorAllowsSuper: boolean) => Node | null,
 * parseClassElementName: (element: Node) => void,
 * parseClassMethod: (method: Node, isGenerator: boolean, isAsync: boolean, allowsDirectSuper: boolean) => Node,
 * parseClassField: (field: Node) => Node,
 * parseClassStaticBlock: (node: Node) => Node,
 * parseClassId: (node: Node, isStatement: boolean | string) => void,
 * parseClassSuper: (node: Node) => void,
 * isClassElementNameStart: () => boolean,
 * enterClassBody: () => Record<string, string>,
 * exitClassBody: () => void,
 * lastTokStartLoc?: Position,
 * parseAssignableListItem: (allowModifiers?: boolean) => Node,
 * parseBindingListItem: (param: Node) => Node,
 * parseExportAllDeclaration: (node: Node, exports?: Record<string, boolean>) => Node,
 * parseExportDeclaration: (node: Node) => Node,
 * parseExportDefaultDeclaration: () => Node,
 * checkExport: (exports: Record<string, boolean> | undefined, name: Node | string, pos: number) => void,
 * checkPatternExport: (exports: Record<string, boolean> | undefined, pat: Node) => void,
 * checkVariableExport: (exports: Record<string, boolean> | undefined, decls: Node[]) => void,
 * shouldParseExportStatement: () => boolean,
 * parseExportSpecifier: (exports?: Record<string, boolean>) => Node,
 * parseExportSpecifiers: (exports?: Record<string, boolean>) => Node[],
 * parseModuleExportName: () => Node,
 * parseWithClause: () => Node[],
 * checkLocalExport: (id: Identifier) => void,
 * isAsyncFunction: () => boolean,
 * expectContextual: (name: string) => void,
 * isUsing: (isFor: boolean) => boolean,
 * isAwaitUsing: (isFor: boolean) => boolean,
 * allowUsing: boolean,
 * eatContextual: (name: string) => boolean,
 * _fnFastPath: boolean,
 * _parseFunctionBody: (fnStart: number, id: Identifier | null, params: Node[], isArrowFunction: boolean, isMethod: boolean, forInit?: boolean | string) => Node,
 * _checkParams: (params: Node[], allowDuplicates: boolean) => void,
 * _subscriptFastPath: boolean,
 * checkLValSimple: (expr: Node, bindingType?: number, checkClashes?: Record<string, boolean> | boolean | null) => void,
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
 * finishToken: (type: TokenType, value?: unknown) => void,
 * context: TokContextShim[],
 * pos: number,
 * input: string,
 * scopeStack: Scope[],
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
 * parseImportAttribute: () => ImportAttribute,
 * parseExprImport: (forNew: boolean) => Expression,
 * parseImportMeta: (node: Node) => Expression,
 * parseDynamicImport: (node: Node) => Expression,
 * _lazy: boolean,
 * _importPhase: ImportPhase | null,
 * _importPhasesEnabled: boolean,
 * _lazyComments: CollectedComment[] | undefined,
 * _newlineBefore: 0 | 1 | 2,
 * _fullTokenFastPath: boolean,
 * _stmtFastPath: boolean,
 * isLet: (context?: string | null) => boolean,
 * parseLabeledStatement: (node: Node, maybeName: string, expr: Identifier, context: string | null) => Node,
 * _parseVarInto: (declarations: Node[], isFor: boolean, kind: string, allowMissingInitializer?: boolean) => void,
 * _parseVarStatementAt: (start: number, kind: string, allowMissingInitializer?: boolean) => Node,
 * _parseIfStatementAt: (start: number) => Node,
 * _parseReturnStatementAt: (start: number) => Node,
 * _parseExpressionStatementAt: (start: number, expr: Expression) => Node,
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
 */

// One entry per distinct keyword/reserved-word set; webpack parses with a
// single option set, making this effectively a one-time build shared across
// every parse.
/** @type {Map<string, WordLookups>} */
const wordLookupsCache = new Map();

/**
 * @param {string} word interned candidate
 * @param {string} input source code
 * @param {number} start word start offset
 * @param {number} len word length (already known equal to `word.length`)
 * @returns {boolean} whether the source span spells `word`
 */
const sameWord = (word, input, start, len) => {
	for (let i = 0; i < len; i++) {
		if (word.charCodeAt(i) !== input.charCodeAt(start + i)) return false;
	}
	return true;
};

// Direct-mapped identifier cache for `readWord1`: one slot per hash, verified
// by char compare, overwritten on collision. Shared across parses — hits are
// content-checked, so a stale entry is merely a miss. Only words short enough
// to be flat V8 strings (never slices retaining their whole source) are stored.
const WORD_CACHE_MASK = 0x1fff;
/** @type {(string | null)[]} */
const WORD_CACHE = Array.from({ length: WORD_CACHE_MASK + 1 }, () => null);
const WORD_CACHE_MAX_LEN = 12;

// Multi-char operator strings for `finishOp` (`=>`, `===`, `&&=`, …), keyed by
// their char codes packed 7 bits apart — collision-free for ASCII operators up
// to acorn's maximum of 4 chars (`>>>=`), so the set stays ~40 entries.
/** @type {Map<number, string>} */
const OP_CACHE = new Map();

// Sticky mirrors of acorn's `skipWhiteSpace` / string-literal / `lineBreak`
// regexes for the owned `strictDirective` (they scan at an offset, no slice).
const STRICT_SKIP_WS = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g;
const STRICT_LITERAL = /(?:'((?:\\[^]|[^'\\])*?)'|"((?:\\[^]|[^"\\])*?)")/y;
const STRICT_LINE_BREAK = /\r\n?|\n|\u2028|\u2029/;

// mirror of acorn's module-level `loneSurrogate` (export-name validation)
const LONE_SURROGATE =
	/(?:[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])/;

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
	let reservedMaxLen = 0;
	for (const name of reservedKinds.keys()) {
		if (name.length > reservedMaxLen) reservedMaxLen = name.length;
	}
	/** @type {WordLookups} */
	const lookups = {
		keywords,
		reservedKinds,
		reservedMaxLen,
		reservedBindTest: { test: (name) => reservedBind.has(name) }
	};
	wordLookupsCache.set(key, lookups);
	lastWordLookups = lookups;
	return lookups;
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
		// the owned getTokenFromCode bakes in every ES2021 operator (?., ??=,
		// &&=, ...), so it needs at least that version
		this._fullTokenFastPath = lazy && this._ecmaVersion >= 12;
		// whether the gap before the current token holds a line terminator:
		// 0 no, 1 yes, 2 unknown (canInsertSemicolon then scans the gap)
		/** @type {0 | 1 | 2} */
		this._newlineBefore = 2;
		// LIFO pool for call-scoped destructuring-errors records; depth resets
		// implicitly since a raise aborts the whole parse
		/** @type {DestructuringErrorsShim[]} */
		this._deStack = [];
		this._deDepth = 0;
		// LIFO pool for `parseObj`'s prop-clash records: acorn's ES6+
		// `checkPropClash` only ever touches `.proto`, so one record per nesting
		// depth suffices; an overriding subclass gets the fresh `{}` acorn expects
		this._propHashFastPath =
			/** @type {ParserInternals} */ (/** @type {unknown} */ (this))
				.checkPropClash === base.checkPropClash;
		/** @type {{ proto: boolean }[]} */
		this._propHashStack = [];
		this._propHashDepth = 0;
		// `readRegexp`'s flag whitelist depends only on the ecmaVersion
		this._validRegexpFlags = `gim${this._ecmaVersion >= 6 ? "uy" : ""}${
			this._ecmaVersion >= 9 ? "s" : ""
		}${this._ecmaVersion >= 13 ? "d" : ""}${
			this._ecmaVersion >= 15 ? "v" : ""
		}`;
		// the owned parseStatement inlines these methods, so a parser plugin
		// overriding any of them turns the statement fast path off
		const proto = WebpackParser.prototype;
		this._stmtFastPath =
			lazy &&
			this.parseVarStatement === proto.parseVarStatement &&
			this.parseVar === proto.parseVar &&
			this.parseIfStatement === proto.parseIfStatement &&
			this.parseReturnStatement === proto.parseReturnStatement &&
			this.parseExpressionStatement === proto.parseExpressionStatement;
		// the owned function grammar inlines these acorn methods, so a parser
		// plugin overriding any of them turns the function fast path off;
		// `ecmaVersion >= 8` keeps `async`/`expression`/param trailing commas
		// unconditional
		this._fnFastPath =
			lazy &&
			this._ecmaVersion >= 8 &&
			/** @type {ParserInternals} */ (/** @type {unknown} */ (this))
				.initFunction === base.initFunction &&
			/** @type {ParserInternals} */ (/** @type {unknown} */ (this))
				.parseFunctionParams === base.parseFunctionParams &&
			/** @type {ParserInternals} */ (/** @type {unknown} */ (this))
				.parseFunctionBody === base.parseFunctionBody &&
			/** @type {ParserInternals} */ (/** @type {unknown} */ (this))
				.checkParams === base.checkParams &&
			/** @type {ParserInternals} */ (/** @type {unknown} */ (this))
				.isSimpleParamList === base.isSimpleParamList;
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

	// ----- tokenizer fast paths -----

	/**
	 * Owned per-token loop: acorn's `nextToken` chains `skipSpace` →
	 * `fullCharCodeAtPos` → `readToken` → `isIdentifierStart` with a dead
	 * `locations` check at each step. For the common lazy, non-template context
	 * this folds whitespace and comment skipping and the ASCII token dispatch
	 * into one function so nothing re-enters acorn's per-step option checks.
	 * Template/`preserveSpace` contexts and non-lazy mode use acorn's tokenizer.
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	nextToken() {
		const context = this.context;
		const curContext = context[context.length - 1];
		if (
			!this._lazy ||
			!curContext ||
			curContext.preserveSpace ||
			curContext.override
		) {
			this._newlineBefore = 2;
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
					// unicode whitespace / line terminators: acorn consumes the rest
					this.pos = pos;
					base.skipSpace.call(this);
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
			case CLS_PUNCT:
				this.pos = pos + 1;
				return this.finishToken(/** @type {TokenType} */ (SIMPLE_PUNCT[code]));
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
	 * Lazy-mode `finishToken`: acorn probes `options.locations` for a dead
	 * `endLoc` write on every token and reaches `updateContext` through an extra
	 * method call. Skip the probe and inline acorn's `updateContext` body — this
	 * runs once per token. Other modes use acorn's.
	 * @param {TokenType} type token type
	 * @param {unknown=} value token value
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	finishToken(type, value) {
		if (!this._lazy) {
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
		} else if (type.keyword && prevType === tokTypes.dot) {
			this.exprAllowed = false;
		} else if (type === tokTypes.parenR || type === tokTypes.braceR) {
			// parenR/braceR.updateContext, inlined
			const context = this.context;
			if (context.length === 1) {
				this.exprAllowed = true;
			} else {
				let out = /** @type {TokContextShim} */ (context.pop());
				if (
					out === CTX_B_STAT &&
					/** @type {TokContextShim} */ (context[context.length - 1]).token ===
						"function"
				) {
					out = /** @type {TokContextShim} */ (context.pop());
				}
				this.exprAllowed = !out.isExpr;
			}
		} else if (type === tokTypes.braceL) {
			// braceL.updateContext, inlined
			this.context.push(this.braceIsBlock(prevType) ? CTX_B_STAT : CTX_B_EXPR);
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
		} else if (internal.updateContext) {
			internal.updateContext.call(this, prevType);
		} else {
			this.exprAllowed = internal.beforeExpr;
		}
	}

	/**
	 * Owned `braceIsBlock`, acorn's verbatim except the line-terminator probe:
	 * acorn slices the inter-token gap and runs a regexp; `_gapHasNewline`
	 * answers from the tokenizer's newline flag (scanning only when unknown).
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
	 * lazy mode (locations off, no token stream), leaving only the two offset
	 * writes and the keyword-escape guard. Other modes use acorn's.
	 * @param {boolean=} ignoreEscapeSequenceInKeyword whether an escape in a keyword is allowed here
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	next(ignoreEscapeSequenceInKeyword) {
		if (!this._lazy) {
			return base.next.call(this, ignoreEscapeSequenceInKeyword);
		}
		const type = this.type;
		if (!ignoreEscapeSequenceInKeyword && type.keyword && this.containsEsc) {
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
	 * HTML-comment forms (`<!--`, `-->`), `#`, and unknown chars delegate.
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
					if (input.charCodeAt(pos + 2) === 62 && !this.inModule) {
						return base.getTokenFromCode.call(this, code);
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
					return base.getTokenFromCode.call(this, code);
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
				if (next === 120 || next === 88) return this.readRadixNumber(16);
				if (next === 111 || next === 79) return this.readRadixNumber(8);
				if (next === 98 || next === 66) return this.readRadixNumber(2);
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
				return base.getTokenFromCode.call(this, code);
		}
	}

	/**
	 * ASCII fast path for acorn's `readWord1`, which pays a surrogate-aware
	 * method call and a range-check helper per character. Escapes, non-ASCII
	 * and astral input restart the base implementation from the word start.
	 * Words are deduplicated through `WORD_CACHE` so repeated identifiers —
	 * which dominate real code — reuse one string instead of slicing a fresh
	 * one per occurrence; sharing also keeps their cached string hashes warm
	 * for the keyword/scope Map lookups downstream.
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
					if (ch === 92) return base.readWord1.call(this);
					break;
				}
				hash = (Math.imul(hash, 33) + ch) | 0;
				pos++;
			} else {
				return base.readWord1.call(this);
			}
		}
		this.containsEsc = false;
		this.pos = pos;
		const wordLen = pos - start;
		// Single-char words skip the cache (V8 serves those slices from its
		// single-character table without allocating).
		if (wordLen >= 2 && wordLen <= WORD_CACHE_MAX_LEN) {
			const slot = hash & WORD_CACHE_MASK;
			const cached = WORD_CACHE[slot];
			if (
				cached !== null &&
				cached.length === wordLen &&
				sameWord(cached, input, start, wordLen)
			) {
				return cached;
			}
			const word = input.slice(start, pos);
			WORD_CACHE[slot] = word;
			return word;
		}
		return input.slice(start, pos);
	}

	/**
	 * String fast path: one scan that both finds the closing quote and vets the
	 * span (the former `indexOf` + verify-loop pair read every string twice).
	 * Escapes, newlines in the span, old ecmaVersions (LS/PS terminate strings
	 * there) and location tracking restart acorn's implementation, which also
	 * produces its exact errors.
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
		const start = this.pos + 1;
		let pos = start;
		for (;;) {
			if (pos >= len) this.raise(this.start, "Unterminated string constant");
			const ch = input.charCodeAt(pos);
			if (ch === quote) break;
			// backslash, LF, CR
			if (ch === 92 || ch === 10 || ch === 13) {
				return base.readString.call(this, quote);
			}
			pos++;
		}
		this.pos = pos + 1;
		this.finishToken(tokTypes.string, input.slice(start, pos));
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
		this.finishToken(tokTypes.num, Number.parseFloat(input.slice(start, pos)));
	}

	/**
	 * Owned `strictDirective`: acorn's runs an anchored literal regex over
	 * `this.input.slice(start)` — a fresh sliced string per (sloppy-mode)
	 * function body. Sticky regexes at the offset scan the same grammar with no
	 * slice. Same directive-prologue semantics, including the ASI tail checks.
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
	 * cooked value is one slice (LF/LS/PS cook to themselves). Escapes, CR
	 * normalization and location tracking restart acorn's implementation,
	 * which also produces its exact errors.
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
		let type = tokTypes.name;
		const len = word.length;
		// every acorn keyword is 2-10 lowercase ASCII chars (`do`…`instanceof`),
		// so most identifiers skip the Map probe entirely (yuku gates its keyword
		// switch the same way)
		if (len >= 2 && len <= 10) {
			const first = word.charCodeAt(0);
			if (first >= 97 && first <= 122) {
				type = this._wordLookups.keywords.get(word) || tokTypes.name;
			}
		}
		this.finishToken(type, word);
	}

	/**
	 * Mirror of acorn's `checkUnreserved` with its two per-identifier regexp
	 * tests (`keywords` and `reservedWords`/`reservedWordsStrict`) folded into a
	 * single `reservedKinds` lookup — one hash probe instead of two, and the
	 * common plain identifier misses it and returns. Branches and error
	 * messages match acorn exactly.
	 * @param {Identifier} ref identifier node
	 * @this {ParserInternals}
	 */
	checkUnreserved(ref) {
		const { start, end, name } = ref;
		// a non-identifier ref (a string-literal export local) has no name;
		// acorn's string probes all fail on it before the caller raises
		if (name === undefined) return;
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
		// the owned nextToken already classified the gap; 2 (comment/unicode in
		// the gap, or a token from acorn's tokenizer) falls back to the scan
		return this._gapHasNewline();
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
		comments.push(new LazyComment(false, start + startSkip, start, pos, input));
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
			new LazyComment(true, start + 2, start, this.pos, this.input)
		);
	}

	// ----- lazy range -----

	/**
	 * @returns {Node} new node
	 * @this {ParserInternals}
	 */
	startNode() {
		if (!this._lazy) return base.startNode.call(this);
		return new LazyLocNode(this.start);
	}

	/**
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
	 * @param {boolean=} liberal whether reserved words are allowed
	 * @returns {Identifier} identifier node
	 * @this {ParserInternals}
	 */
	parseIdent(liberal) {
		if (this.type !== tokTypes.name || !this._lazy) {
			return base.parseIdent.call(this, liberal);
		}
		const node = /** @type {Identifier} */ (
			/** @type {unknown} */ (
				_emitIdentifier(
					this.start,
					this.end,
					/** @type {string} */ (this.value)
				)
			)
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
	 * Owned `parseSubscript`, an exact-semantics copy of acorn 8's with the
	 * node construction replaced: member and call nodes are built fully-formed
	 * after their property/arguments parse (the half-built node was never
	 * reachable during it), landing on `MemberExpressionNode`/
	 * `CallExpressionNode`'s single shapes. Pre-optional-chaining ecmaVersions
	 * and non-lazy mode delegate to acorn.
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
					_emitMemberExpression(
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
					_emitCallExpression(
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
	 * Owned `parseStatement` for the hot statement heads: acorn starts a node
	 * before dispatching, but the owned statement parsers build their own
	 * single-shape nodes, so that started node was one discarded allocation per
	 * statement. Dispatch the common heads (`var`/`let`/`const`, `if`, `return`,
	 * blocks and plain expression statements) without it; everything rarer, the
	 * `name`-token ambiguities (`let`/`async`/`using`/`await` heads) and
	 * plugin-overridden parsers delegate to acorn.
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
			case tokTypes._break:
			case tokTypes._continue:
				return this.parseBreakContinueStatement(
					this.startNode(),
					/** @type {string} */ (startType.keyword)
				);
			case tokTypes._debugger:
				return this.parseDebuggerStatement(this.startNode());
			case tokTypes._do:
				return this.parseDoStatement(this.startNode());
			case tokTypes._for:
				return this.parseForStatement(this.startNode());
			case tokTypes._switch:
				return this.parseSwitchStatement(this.startNode());
			case tokTypes._throw:
				return this.parseThrowStatement(this.startNode());
			case tokTypes._try:
				return this.parseTryStatement(this.startNode());
			case tokTypes._while:
				return this.parseWhileStatement(this.startNode());
			case tokTypes._with:
				return this.parseWithStatement(this.startNode());
			case tokTypes.semi:
				return this.parseEmptyStatement(this.startNode());
			case tokTypes._function:
			case tokTypes._class:
			case tokTypes._export:
			case tokTypes._import:
				return base.parseStatement.call(this, context, topLevel, exports);
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
					} else if (
						value === "async" ||
						value === "using" ||
						value === "await"
					) {
						// async functions and using declarations keep acorn's
						// lookahead-heavy classification
						return base.parseStatement.call(this, context, topLevel, exports);
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
	 * @param {Node} node started statement node from `parseStatement`
	 * @param {string} kind declaration kind
	 * @param {boolean=} allowMissingInitializer whether `const x;` is allowed
	 * @returns {Node} variable declaration
	 * @this {ParserInternals}
	 */
	parseVarStatement(node, kind, allowMissingInitializer) {
		if (!this._lazy) {
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
	 * @param {number} start statement start offset
	 * @param {string} kind declaration kind
	 * @param {boolean=} allowMissingInitializer whether `const x;` is allowed
	 * @returns {Node} variable declaration
	 * @this {ParserInternals}
	 */
	_parseVarStatementAt(start, kind, allowMissingInitializer) {
		this.next();
		/** @type {Node[]} */
		const declarations = [];
		this._parseVarInto(declarations, false, kind, allowMissingInitializer);
		this.semicolon();
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				_emitVariableDeclaration(start, this.lastTokEnd, declarations, kind)
			)
		);
	}

	/**
	 * Owned `parseVar`, an exact-semantics copy of acorn 8's that builds each
	 * declarator fully-formed on `VariableDeclaratorNode`'s single shape. The
	 * passed node keeps receiving `declarations`/`kind` because
	 * `parseForStatement` finishes it itself. Non-lazy mode delegates.
	 * @param {Node} node declaration node to fill
	 * @param {boolean} isFor whether parsing a `for` head
	 * @param {string} kind declaration kind
	 * @param {boolean=} allowMissingInitializer whether `const x;` is allowed
	 * @returns {Node} the filled node
	 * @this {ParserInternals}
	 */
	parseVar(node, isFor, kind, allowMissingInitializer) {
		if (!this._lazy) {
			return base.parseVar.call(
				this,
				node,
				isFor,
				kind,
				allowMissingInitializer
			);
		}
		/** @type {Node[]} */
		const declarations = [];
		const target =
			/** @type {Node & { declarations: Node[], kind: string }} */ (node);
		target.declarations = declarations;
		target.kind = kind;
		this._parseVarInto(declarations, isFor, kind, allowMissingInitializer);
		return node;
	}

	/**
	 * The declarator loop of the owned `parseVar`, shared with the owned
	 * `parseStatement`'s node-free statement path.
	 * @param {Node[]} declarations output array for the declarators
	 * @param {boolean} isFor whether parsing a `for` head
	 * @param {string} kind declaration kind
	 * @param {boolean=} allowMissingInitializer whether `const x;` is allowed
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	_parseVarInto(declarations, isFor, kind, allowMissingInitializer) {
		const ecmaVersion = this._ecmaVersion;
		const usingKind = kind === "using" || kind === "await using";
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
			declarations.push(
				/** @type {Node} */ (
					/** @type {unknown} */ (
						_emitVariableDeclarator(declStart, this.lastTokEnd, id, init)
					)
				)
			);
			if (!this.eat(tokTypes.comma)) break;
		}
	}

	/**
	 * Owned `parseExpressionStatement`: the statement lands on
	 * `ExpressionStatementNode`'s single shape (the passed started node is
	 * discarded, matching acorn's observable output). Non-lazy mode delegates.
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
	 * @param {number} start statement start offset
	 * @param {Expression} expr the parsed expression
	 * @returns {Node} expression statement
	 * @this {ParserInternals}
	 */
	_parseExpressionStatementAt(start, expr) {
		this.semicolon();
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				_emitExpressionStatement(start, this.lastTokEnd, expr)
			)
		);
	}

	/**
	 * Owned `parseBlock`, an exact-semantics copy of acorn 8's landing on
	 * `BlockStatementNode`'s single shape. Non-lazy mode delegates.
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
		/** @type {Node[]} */
		const body = [];
		this.expect(tokTypes.braceL);
		if (createNewLexicalScope) this.enterScope(0);
		while (this.type !== tokTypes.braceR) {
			body.push(this.parseStatement(null));
		}
		if (exitStrict) this.strict = false;
		this.next();
		if (createNewLexicalScope) this.exitScope();
		return /** @type {Node} */ (
			/** @type {unknown} */ (_emitBlockStatement(start, this.lastTokEnd, body))
		);
	}

	/**
	 * Owned `parseIfStatement` landing on `IfStatementNode`'s single shape.
	 * Non-lazy mode delegates to acorn.
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
				_emitIfStatement(start, this.lastTokEnd, test, consequent, alternate)
			)
		);
	}

	/**
	 * Owned `parseReturnStatement` landing on `ReturnStatementNode`'s single
	 * shape. Non-lazy mode delegates to acorn.
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
				_emitReturnStatement(start, this.lastTokEnd, argument)
			)
		);
	}

	/**
	 * Owned `parseSpread` landing on `RestSpreadNode`'s single shape.
	 * Non-lazy mode delegates.
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
				_emitRestSpread(start, this.lastTokEnd, "SpreadElement", argument)
			)
		);
	}

	/**
	 * Owned `parseMaybeConditional` landing on
	 * `ConditionalExpressionNode`'s single shape. Non-lazy mode delegates.
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
		if (
			!(expr.type === "ArrowFunctionExpression" && expr.start === startPos) &&
			this.eat(tokTypes.question)
		) {
			const consequent = this.parseMaybeAssign();
			this.expect(tokTypes.colon);
			const alternate = this.parseMaybeAssign(forInit);
			return /** @type {Expression} */ (
				/** @type {unknown} */ (
					_emitConditionalExpression(
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
	 * Owned `parseNew`, an exact-semantics copy of acorn 8's: `NewExpression`
	 * lands on `NewExpressionNode`'s single shape (zero-argument calls share
	 * one empty array like acorn's `empty`); the rare `new.target` path keeps
	 * the generic node. Non-lazy mode delegates.
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
			? this.parseExprList(tokTypes.parenR, true, false)
			: EMPTY_NEW_ARGS;
		return /** @type {Expression} */ (
			/** @type {unknown} */ (
				_emitNewExpression(nodeStart, this.lastTokEnd, callee, args)
			)
		);
	}

	/**
	 * Owned `parseTemplateElement` landing on `TemplateElementNode`'s single
	 * shape; matches acorn's CRLF normalization and invalid-escape handling.
	 * Non-lazy mode delegates.
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
				_emitTemplateElement(
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
		/** @type {Expression[]} */
		const expressions = [];
		// one options object for all chunks (only `isTagged` is ever read)
		const eltOpts = { isTagged };
		let curElt = /** @type {Node & { tail?: boolean }} */ (
			this.parseTemplateElement(eltOpts)
		);
		const quasis = [/** @type {Node} */ (curElt)];
		while (!curElt.tail) {
			if (this.type === tokTypes.eof) {
				this.raise(this.pos, "Unterminated template literal");
			}
			this.expect(tokTypes.dollarBraceL);
			expressions.push(this.parseExpression());
			this.expect(tokTypes.braceR);
			curElt = /** @type {Node & { tail?: boolean }} */ (
				this.parseTemplateElement(eltOpts)
			);
			quasis.push(/** @type {Node} */ (curElt));
		}
		this.next();
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				_emitTemplateLiteral(start, this.lastTokEnd, expressions, quasis)
			)
		);
	}

	/**
	 * Owned `parseMaybeUnary`, an exact-semantics copy of acorn 8's: prefix
	 * unary/update and postfix update nodes are built fully-formed on
	 * `UnaryNode`'s shared single shape. Non-lazy mode delegates to acorn.
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
					_emitUnary(
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
						_emitUnary(
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

		if (!incDec && this.eat(tokTypes.starstar)) {
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
		return expr;
	}

	/**
	 * Owned `parseMaybeAssign`, an exact-semantics copy of acorn 8's: the
	 * operator is captured before `next()` and the `AssignmentExpression` is
	 * built fully-formed on `AssignmentNode`'s single shape after the
	 * right-hand parse. Yield and non-lazy mode delegate to acorn.
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
					_emitAssignment(startPos, this.lastTokEnd, operator, left, right)
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
		return expr.start === startPos && expr.type === "ArrowFunctionExpression"
			? expr
			: this.parseExprOp(expr, startPos, startLoc, -1, forInit);
	}

	/**
	 * Owned `parseExprOp`, an exact-semantics copy of acorn 8's with the
	 * same-precedence continuation turned from tail recursion into a loop —
	 * `a + b + c + d` runs one frame instead of one per operator. Non-lazy mode
	 * delegates.
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
				_emitBinary(
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
			const node = _emitLiteral(
				this.start,
				this.end,
				type === tokTypes._null ? null : type === tokTypes._true,
				/** @type {string} */ (type.keyword)
			);
			this.next();
			return /** @type {Expression} */ (/** @type {unknown} */ (node));
		}
		if (type === tokTypes._this) {
			const node = _emitThis(this.start, this.end);
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
					_emitArrayExpression(start, this.lastTokEnd, elements)
				)
			);
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
		/** @type {Node[]} */
		const properties = [];
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
			properties.push(prop);
		}
		if (pooled) this._propHashDepth--;
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				_emitObject(
					start,
					this.lastTokEnd,
					isPattern ? "ObjectPattern" : "ObjectExpression",
					properties
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
						_emitRestSpread(nodeStart, this.lastTokEnd, "RestElement", argument)
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
					_emitRestSpread(nodeStart, this.lastTokEnd, "SpreadElement", argument)
				)
			);
		}
		const prop = /** @type {Node} */ (
			/** @type {unknown} */ (_emitPropertyStart(nodeStart))
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

	// ----- owned function grammar (declarations, expressions, methods,
	// arrows, paren/arrow disambiguation), exact-semantics copies of acorn 8's
	// with node fields held in locals so the finished nodes land on
	// `FunctionNode`'s single shape -----

	/**
	 * Owned `parseFunction`. The started `node` only contributes its start
	 * offset; the finished node is built fully-formed.
	 * @param {Node} node started node from the caller
	 * @param {number} statement FUNC_* statement-context flags
	 * @param {boolean=} allowExpressionBody always false in acorn 8's callers
	 * @param {boolean=} isAsync whether the `async` modifier was parsed
	 * @param {boolean | string=} forInit for-init context flag
	 * @returns {Expression} function declaration or expression
	 * @this {ParserInternals}
	 */
	parseFunction(node, statement, allowExpressionBody, isAsync, forInit) {
		if (!this._fnFastPath) {
			return base.parseFunction.call(
				this,
				node,
				statement,
				allowExpressionBody,
				isAsync,
				forInit
			);
		}
		const start = node.start;
		const async = Boolean(isAsync);
		let generator = false;
		if (this._ecmaVersion >= 9 || !async) {
			if (this.type === tokTypes.star && statement & FUNC_HANGING_STATEMENT) {
				this.unexpected();
			}
			generator = this.eat(tokTypes.star);
		}
		/** @type {Identifier | null} */
		let id = null;
		if (statement & FUNC_STATEMENT) {
			id =
				statement & FUNC_NULLABLE_ID && this.type !== tokTypes.name
					? null
					: this.parseIdent();
			if (id && !(statement & FUNC_HANGING_STATEMENT)) {
				// sloppy non-async/non-generator declarations follow Annex B
				this.checkLValSimple(
					id,
					this.strict || generator || async
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
		this.enterScope(functionFlags(async, generator));
		if (!(statement & FUNC_STATEMENT)) {
			id = this.type === tokTypes.name ? this.parseIdent() : null;
		}
		this.expect(tokTypes.parenL);
		const params = this.parseBindingList(tokTypes.parenR, false, true);
		this.checkYieldAwaitInDefaultParams();
		const isArrowBody = allowExpressionBody === true;
		const body = this._parseFunctionBody(
			start,
			id,
			params,
			isArrowBody,
			false,
			forInit
		);
		this.yieldPos = oldYieldPos;
		this.awaitPos = oldAwaitPos;
		this.awaitIdentPos = oldAwaitIdentPos;
		return /** @type {Expression} */ (
			/** @type {unknown} */ (
				_emitFunction(
					start,
					this.lastTokEnd,
					statement & FUNC_STATEMENT
						? "FunctionDeclaration"
						: "FunctionExpression",
					id,
					params,
					body,
					generator,
					async,
					isArrowBody && body.type !== "BlockStatement"
				)
			)
		);
	}

	/**
	 * Owned `parseMethod` for object/class methods.
	 * @param {boolean=} isGenerator whether the `*` modifier was parsed
	 * @param {boolean=} isAsync whether the `async` modifier was parsed
	 * @param {boolean=} allowDirectSuper whether `super()` is allowed (constructors)
	 * @returns {Node} method function expression
	 * @this {ParserInternals}
	 */
	parseMethod(isGenerator, isAsync, allowDirectSuper) {
		if (!this._fnFastPath) {
			return base.parseMethod.call(
				this,
				isGenerator,
				isAsync,
				allowDirectSuper
			);
		}
		const start = this.start;
		const generator = Boolean(isGenerator);
		const async = Boolean(isAsync);
		const oldYieldPos = this.yieldPos;
		const oldAwaitPos = this.awaitPos;
		const oldAwaitIdentPos = this.awaitIdentPos;
		this.yieldPos = 0;
		this.awaitPos = 0;
		this.awaitIdentPos = 0;
		this.enterScope(
			functionFlags(async, generator) |
				SCOPE_SUPER |
				(allowDirectSuper ? SCOPE_DIRECT_SUPER : 0)
		);
		this.expect(tokTypes.parenL);
		const params = this.parseBindingList(tokTypes.parenR, false, true);
		this.checkYieldAwaitInDefaultParams();
		const body = this._parseFunctionBody(
			start,
			null,
			params,
			false,
			true,
			false
		);
		this.yieldPos = oldYieldPos;
		this.awaitPos = oldAwaitPos;
		this.awaitIdentPos = oldAwaitIdentPos;
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				_emitFunction(
					start,
					this.lastTokEnd,
					"FunctionExpression",
					null,
					params,
					body,
					generator,
					async,
					false
				)
			)
		);
	}

	/**
	 * Owned `parseArrowExpression`; the started `node` only contributes its
	 * start offset.
	 * @param {Node} node started node covering the params
	 * @param {Node[]} params already-parsed parameter expressions
	 * @param {boolean=} isAsync whether this is an async arrow
	 * @param {boolean | string=} forInit for-init context flag
	 * @returns {Expression} arrow function expression
	 * @this {ParserInternals}
	 */
	parseArrowExpression(node, params, isAsync, forInit) {
		if (!this._fnFastPath) {
			return base.parseArrowExpression.call(
				this,
				node,
				params,
				isAsync,
				forInit
			);
		}
		const start = node.start;
		const async = Boolean(isAsync);
		const oldYieldPos = this.yieldPos;
		const oldAwaitPos = this.awaitPos;
		const oldAwaitIdentPos = this.awaitIdentPos;
		this.enterScope(functionFlags(async, false) | SCOPE_ARROW);
		this.yieldPos = 0;
		this.awaitPos = 0;
		this.awaitIdentPos = 0;
		const boundParams = this.toAssignableList(params, true);
		const body = this._parseFunctionBody(
			start,
			null,
			boundParams,
			true,
			false,
			forInit
		);
		this.yieldPos = oldYieldPos;
		this.awaitPos = oldAwaitPos;
		this.awaitIdentPos = oldAwaitIdentPos;
		return /** @type {Expression} */ (
			/** @type {unknown} */ (
				_emitFunction(
					start,
					this.lastTokEnd,
					"ArrowFunctionExpression",
					null,
					boundParams,
					body,
					false,
					async,
					body.type !== "BlockStatement"
				)
			)
		);
	}

	/**
	 * Body half of acorn's `parseFunctionBody` with the node's fields as
	 * locals; exits the function scope like acorn's does.
	 * @param {number} fnStart function start offset for strict-directive errors
	 * @param {Identifier | null} id function name for the strict re-check
	 * @param {Node[]} params parameters
	 * @param {boolean} isArrowFunction whether an expression body is allowed
	 * @param {boolean} isMethod whether this is an object/class method
	 * @param {boolean | string=} forInit for-init context flag
	 * @returns {Node} block or arrow expression body
	 * @this {ParserInternals}
	 */
	_parseFunctionBody(fnStart, id, params, isArrowFunction, isMethod, forInit) {
		const isExpression = isArrowFunction && this.type !== tokTypes.braceL;
		const oldStrict = this.strict;
		let useStrict = false;
		/** @type {Node} */
		let body;
		if (isExpression) {
			body = this.parseMaybeAssign(forInit);
			this._checkParams(params, false);
		} else {
			const nonSimple = !isSimpleParamList(params);
			if (!oldStrict || nonSimple) {
				useStrict = this.strictDirective(this.end);
				if (useStrict && nonSimple) {
					this.raiseRecoverable(
						fnStart,
						"Illegal 'use strict' directive in function with non-simple parameter list"
					);
				}
			}
			const oldLabels = this.labels;
			this.labels = LABELS_POOL.pop() || [];
			if (useStrict) this.strict = true;
			this._checkParams(
				params,
				!oldStrict &&
					!useStrict &&
					!isArrowFunction &&
					!isMethod &&
					isSimpleParamList(params)
			);
			if (this.strict && id) this.checkLValSimple(id, BIND_OUTSIDE);
			body = this.parseBlock(false, undefined, useStrict && !oldStrict);
			this.adaptDirectivePrologue(
				/** @type {Node & { body: Node[] }} */ (body).body
			);
			const usedLabels = this.labels;
			if (LABELS_POOL.length < LABELS_POOL_LIMIT) {
				usedLabels.length = 0;
				LABELS_POOL.push(usedLabels);
			}
			this.labels = oldLabels;
		}
		this.exitScope();
		return body;
	}

	/**
	 * Mirror of acorn's `checkParams` over a params local; the name-clash
	 * record is skipped entirely when duplicates are allowed.
	 * @param {Node[]} params parameters
	 * @param {boolean} allowDuplicates whether duplicate names are allowed
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	_checkParams(params, allowDuplicates) {
		const len = params.length;
		if (len === 0) return;
		// a single plain-identifier param cannot clash with itself, so the
		// clash record is skipped like in the allowDuplicates case
		const nameHash =
			allowDuplicates || (len === 1 && params[0].type === "Identifier")
				? null
				: Object.create(null);
		for (let i = 0; i < len; i++) {
			this.checkLValInnerPattern(params[i], BIND_VAR, nameHash);
		}
	}

	/**
	 * Owned `parseParenAndDistinguishExpression`, an exact-semantics copy of
	 * acorn 8's with the destructuring-errors record pooled. Pre-ES6 versions
	 * and non-lazy mode delegate.
	 * @param {boolean} canBeArrow whether an arrow head is possible here
	 * @param {boolean | string=} forInit for-init context flag
	 * @returns {Expression} parenthesized expression or arrow function
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
		/** @type {Expression[]} */
		const exprList = [];
		let first = true;
		let lastIsComma = false;
		const refDestructuringErrors = this._acquireDestructuringErrors();
		const oldYieldPos = this.yieldPos;
		const oldAwaitPos = this.awaitPos;
		let spreadStart = 0;
		this.yieldPos = 0;
		this.awaitPos = 0;
		// awaitIdentPos is deliberately not saved (mirrors acorn), so awaits
		// nested in parameters are still checked
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
				exprList.push(
					/** @type {Expression} */ (
						this.parseParenItem(this.parseRestBinding())
					)
				);
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
						/** @type {(this: unknown, left: Expression, startPos: number, startLoc?: Position) => Expression} */ (
							/** @type {unknown} */ (this.parseParenItem)
						)
					)
				);
			}
		}
		const innerEndPos = this.lastTokEnd;
		this.expect(tokTypes.parenR);

		if (
			canBeArrow &&
			this.shouldParseArrow(exprList) &&
			this.eat(tokTypes.arrow)
		) {
			this.checkPatternErrors(refDestructuringErrors, false);
			this.checkYieldAwaitInDefaultParams();
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
			val = /** @type {Expression} */ (
				/** @type {unknown} */ (
					_emitSequenceExpression(innerStartPos, innerEndPos, exprList)
				)
			);
		} else {
			val = exprList[0];
		}
		if (this.options.preserveParens) {
			const par = this.startNodeAt(startPos, startLoc);
			/** @type {Node & { expression?: Expression }} */ (par).expression = val;
			return /** @type {Expression} */ (
				this.finishNode(par, "ParenthesizedExpression")
			);
		}
		return val;
	}

	// ----- owned statement grammar (loops, switch, try, throw, labels,
	// break/continue, with, empty, debugger), exact-semantics copies of
	// acorn 8's landing on single-shape nodes. Cooperating methods are always
	// called through `this`, so subclass overrides keep working -----

	/**
	 * Owned `parseForStatement`; the started `node` carries only its start
	 * offset and the `await` flag for `parseForIn`, like in acorn.
	 * @param {Node} node started statement node
	 * @returns {Node} for/for-in/for-of statement
	 * @this {ParserInternals}
	 */
	parseForStatement(node) {
		if (!this._lazy) return base.parseForStatement.call(this, node);
		this.next();
		const awaitAt =
			this._ecmaVersion >= 9 && this.canAwait && this.eatContextual("await")
				? this.lastTokStart
				: -1;
		this.labels.push(LOOP_LABEL);
		this.enterScope(0);
		this.expect(tokTypes.parenL);
		if (this.type === tokTypes.semi) {
			if (awaitAt > -1) this.unexpected(awaitAt);
			return this.parseFor(node, null);
		}
		const isLet = this.isLet();
		if (this.type === tokTypes._var || this.type === tokTypes._const || isLet) {
			const initNode = this.startNode();
			const kind = isLet ? "let" : /** @type {string} */ (this.value);
			this.next();
			this.parseVar(initNode, true, kind);
			this.finishNode(initNode, "VariableDeclaration");
			return this.parseForAfterInit(node, initNode, awaitAt);
		}
		const startsWithLet = this.isContextual("let");
		let isForOf = false;
		const usingKind = this.isUsing(true)
			? "using"
			: this.isAwaitUsing(true)
				? "await using"
				: null;
		if (usingKind) {
			const initNode = this.startNode();
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
			this.parseVar(initNode, true, usingKind);
			this.finishNode(initNode, "VariableDeclaration");
			return this.parseForAfterInit(node, initNode, awaitAt);
		}
		const containsEsc = this.containsEsc;
		const refDestructuringErrors = this._acquireDestructuringErrors();
		const initPos = this.start;
		const init =
			awaitAt > -1
				? this.parseExprSubscripts(refDestructuringErrors, "await")
				: this.parseExpression(true, refDestructuringErrors);
		if (
			this.type === tokTypes._in ||
			(isForOf = this._ecmaVersion >= 6 && this.isContextual("of"))
		) {
			if (awaitAt > -1) {
				// implies `ecmaVersion >= 9` (see declaration of awaitAt)
				if (this.type === tokTypes._in) this.unexpected(awaitAt);
				/** @type {Node & { await?: boolean }} */ (node).await = true;
			} else if (isForOf && this._ecmaVersion >= 8) {
				if (
					init.start === initPos &&
					!containsEsc &&
					init.type === "Identifier" &&
					init.name === "async"
				) {
					this.unexpected();
				} else if (this._ecmaVersion >= 9) {
					/** @type {Node & { await?: boolean }} */ (node).await = false;
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
			this._releaseDestructuringErrors();
			return this.parseForIn(node, init);
		}
		this.checkExpressionErrors(refDestructuringErrors, true);
		this._releaseDestructuringErrors();
		if (awaitAt > -1) this.unexpected(awaitAt);
		return this.parseFor(node, init);
	}

	/**
	 * Owned `parseForAfterInit`, acorn's helper for a declaration-initialized
	 * `for` head.
	 * @param {Node} node started statement node
	 * @param {Node} init parsed variable declaration
	 * @param {number} awaitAt `for await` offset or -1
	 * @returns {Node} for/for-in/for-of statement
	 * @this {ParserInternals}
	 */
	parseForAfterInit(node, init, awaitAt) {
		if (!this._lazy) {
			return base.parseForAfterInit.call(this, node, init, awaitAt);
		}
		const declarations =
			/** @type {Node & { declarations: Node[], kind: string }} */ (init);
		if (
			(this.type === tokTypes._in ||
				(this._ecmaVersion >= 6 && this.isContextual("of"))) &&
			declarations.declarations.length === 1
		) {
			if (this.type === tokTypes._in) {
				if (
					(declarations.kind === "using" ||
						declarations.kind === "await using") &&
					!(
						/** @type {Node & { init: Node | null }} */ (
							declarations.declarations[0]
						).init
					)
				) {
					this.raise(
						this.start,
						"Using declaration is not allowed in for-in loops"
					);
				}
				if (this._ecmaVersion >= 9 && awaitAt > -1) this.unexpected(awaitAt);
			} else if (this._ecmaVersion >= 9) {
				/** @type {Node & { await?: boolean }} */ (node).await = awaitAt > -1;
			}
			return this.parseForIn(node, init);
		}
		if (awaitAt > -1) this.unexpected(awaitAt);
		return this.parseFor(node, init);
	}

	/**
	 * Owned `parseFor` for a classic three-clause loop, landing on
	 * `ForStatementNode`'s single shape.
	 * @param {Node} node started statement node
	 * @param {Node | null} init parsed init clause
	 * @returns {Node} for statement
	 * @this {ParserInternals}
	 */
	parseFor(node, init) {
		if (!this._lazy) return base.parseFor.call(this, node, init);
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
				_emitForStatement(
					node.start,
					this.lastTokEnd,
					init,
					/** @type {Expression | null} */ (test),
					/** @type {Expression | null} */ (update),
					body
				)
			)
		);
	}

	/**
	 * Owned `parseForIn` for `for-in`/`for-of`, landing on `ForInNode` or
	 * `ForOfNode`'s single shape (`await` travels on the started node).
	 * @param {Node} node started statement node
	 * @param {Node} init parsed left-hand side
	 * @returns {Node} for-in/for-of statement
	 * @this {ParserInternals}
	 */
	parseForIn(node, init) {
		if (!this._lazy) return base.parseForIn.call(this, node, init);
		const isForIn = this.type === tokTypes._in;
		this.next();
		const decl =
			/** @type {Node & { declarations?: (Node & { init: Node | null, id: Node })[], kind?: string }} */ (
				init
			);
		if (
			init.type === "VariableDeclaration" &&
			/** @type {NonNullable<typeof decl.declarations>} */ (
				decl.declarations
			)[0].init !== null &&
			(!isForIn ||
				this._ecmaVersion < 8 ||
				this.strict ||
				decl.kind !== "var" ||
				/** @type {NonNullable<typeof decl.declarations>} */ (
					decl.declarations
				)[0].id.type !== "Identifier")
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
		const isAwait = /** @type {Node & { await?: boolean }} */ (node).await;
		if (isAwait === undefined || isForIn) {
			return /** @type {Node} */ (
				/** @type {unknown} */ (
					_emitForIn(
						node.start,
						this.lastTokEnd,
						isForIn ? "ForInStatement" : "ForOfStatement",
						init,
						right,
						body
					)
				)
			);
		}
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				_emitForOf(node.start, this.lastTokEnd, isAwait, init, right, body)
			)
		);
	}

	/**
	 * Owned `parseWhileStatement` landing on `WhileStatementNode`'s shape.
	 * @param {Node} node started statement node
	 * @returns {Node} while statement
	 * @this {ParserInternals}
	 */
	parseWhileStatement(node) {
		if (!this._lazy) return base.parseWhileStatement.call(this, node);
		this.next();
		const test = this.parseParenExpression();
		this.labels.push(LOOP_LABEL);
		const body = this.parseStatement("while");
		this.labels.pop();
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				_emitWhileStatement(node.start, this.lastTokEnd, test, body)
			)
		);
	}

	/**
	 * Owned `parseDoStatement` landing on `DoWhileStatementNode`'s shape.
	 * @param {Node} node started statement node
	 * @returns {Node} do-while statement
	 * @this {ParserInternals}
	 */
	parseDoStatement(node) {
		if (!this._lazy) return base.parseDoStatement.call(this, node);
		this.next();
		this.labels.push(LOOP_LABEL);
		const body = this.parseStatement("do");
		this.labels.pop();
		this.expect(tokTypes._while);
		const test = this.parseParenExpression();
		if (this._ecmaVersion >= 6) this.eat(tokTypes.semi);
		else this.semicolon();
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				_emitDoWhileStatement(node.start, this.lastTokEnd, body, test)
			)
		);
	}

	/**
	 * Owned `parseSwitchStatement` landing on `SwitchStatementNode` /
	 * `SwitchCaseNode`'s shapes.
	 * @param {Node} node started statement node
	 * @returns {Node} switch statement
	 * @this {ParserInternals}
	 */
	parseSwitchStatement(node) {
		if (!this._lazy) return base.parseSwitchStatement.call(this, node);
		this.next();
		const discriminant = this.parseParenExpression();
		/** @type {SwitchCaseNode[]} */
		const cases = [];
		this.expect(tokTypes.braceL);
		this.labels.push(SWITCH_LABEL);
		this.enterScope(SCOPE_SWITCH);
		/** @type {SwitchCaseNode | undefined} */
		let cur;
		for (let sawDefault = false; this.type !== tokTypes.braceR;) {
			if (this.type === tokTypes._case || this.type === tokTypes._default) {
				const isCase = this.type === tokTypes._case;
				if (cur) cur.end = this.lastTokEnd;
				cur = _emitSwitchCaseStart(this.start);
				cases.push(cur);
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
				}
				this.expect(tokTypes.colon);
			} else {
				if (!cur) this.unexpected();
				/** @type {SwitchCaseNode} */ (cur).consequent.push(
					this.parseStatement(null)
				);
			}
		}
		this.exitScope();
		if (cur) cur.end = this.lastTokEnd;
		this.next();
		this.labels.pop();
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				_emitSwitchStatement(
					node.start,
					this.lastTokEnd,
					discriminant,
					/** @type {Node[]} */ (/** @type {unknown} */ (cases))
				)
			)
		);
	}

	/**
	 * Owned `parseThrowStatement`; the newline guard reads the tokenizer's
	 * `_newlineBefore` flag instead of slicing the gap for a regex test.
	 * @param {Node} node started statement node
	 * @returns {Node} throw statement
	 * @this {ParserInternals}
	 */
	parseThrowStatement(node) {
		if (!this._lazy) return base.parseThrowStatement.call(this, node);
		this.next();
		if (this._gapHasNewline()) {
			this.raise(this.lastTokEnd, "Illegal newline after throw");
		}
		const argument = this.parseExpression();
		this.semicolon();
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				_emitThrowStatement(node.start, this.lastTokEnd, argument)
			)
		);
	}

	/**
	 * Owned `parseCatchClauseParam`, a verbatim copy of acorn 8's.
	 * @returns {Node} catch binding
	 * @this {ParserInternals}
	 */
	parseCatchClauseParam() {
		if (!this._lazy) return base.parseCatchClauseParam.call(this);
		const param = this.parseBindingAtom();
		const simple = param.type === "Identifier";
		this.enterScope(simple ? SCOPE_SIMPLE_CATCH : 0);
		this.checkLValPattern(param, simple ? BIND_SIMPLE_CATCH : BIND_LEXICAL);
		this.expect(tokTypes.parenR);
		return param;
	}

	/**
	 * Owned `parseTryStatement` landing on `TryStatementNode` /
	 * `CatchClauseNode`'s shapes.
	 * @param {Node} node started statement node
	 * @returns {Node} try statement
	 * @this {ParserInternals}
	 */
	parseTryStatement(node) {
		if (!this._lazy) return base.parseTryStatement.call(this, node);
		this.next();
		const block = this.parseBlock();
		/** @type {Node | null} */
		let handler = null;
		if (this.type === tokTypes._catch) {
			const clauseStart = this.start;
			this.next();
			/** @type {Node | null} */
			let param = null;
			if (this.eat(tokTypes.parenL)) {
				param = this.parseCatchClauseParam();
			} else {
				if (this._ecmaVersion < 10) this.unexpected();
				this.enterScope(0);
			}
			const body = this.parseBlock(false);
			this.exitScope();
			handler = /** @type {Node} */ (
				/** @type {unknown} */ (
					_emitCatchClause(clauseStart, this.lastTokEnd, param, body)
				)
			);
		}
		const finalizer = this.eat(tokTypes._finally) ? this.parseBlock() : null;
		if (!handler && !finalizer) {
			this.raise(node.start, "Missing catch or finally clause");
		}
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				_emitTryStatement(
					node.start,
					this.lastTokEnd,
					block,
					handler,
					finalizer
				)
			)
		);
	}

	/**
	 * Owned `parseBreakContinueStatement` landing on `BreakContinueNode`'s
	 * shape.
	 * @param {Node} node started statement node
	 * @param {string} keyword `"break"` or `"continue"`
	 * @returns {Node} break/continue statement
	 * @this {ParserInternals}
	 */
	parseBreakContinueStatement(node, keyword) {
		if (!this._lazy) {
			return base.parseBreakContinueStatement.call(this, node, keyword);
		}
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
		let i = 0;
		for (; i < this.labels.length; ++i) {
			const lab = this.labels[i];
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
		if (i === this.labels.length) {
			this.raise(node.start, `Unsyntactic ${keyword}`);
		}
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				_emitBreakContinue(
					node.start,
					this.lastTokEnd,
					isBreak ? "BreakStatement" : "ContinueStatement",
					label
				)
			)
		);
	}

	/**
	 * Owned `parseLabeledStatement` landing on `LabeledStatementNode`'s shape.
	 * @param {Node} node started statement node
	 * @param {string} maybeName label name
	 * @param {Identifier} expr label identifier
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
		for (const label of this.labels) {
			if (label.name === maybeName) {
				this.raise(expr.start, `Label '${maybeName}' is already declared`);
			}
		}
		const kind = /** @type {TokenTypeInternal & { isLoop?: boolean }} */ (
			this.type
		).isLoop
			? "loop"
			: this.type === tokTypes._switch
				? "switch"
				: null;
		for (let i = this.labels.length - 1; i >= 0; i--) {
			const label = this.labels[i];
			if (label.statementStart === node.start) {
				// update information about previous labels on this node
				label.statementStart = this.start;
				label.kind = kind;
			} else {
				break;
			}
		}
		this.labels.push({
			name: maybeName,
			kind,
			statementStart: this.start
		});
		const body = this.parseStatement(
			context
				? !context.includes("label")
					? `${context}label`
					: context
				: "label"
		);
		this.labels.pop();
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				_emitLabeledStatement(node.start, this.lastTokEnd, body, expr)
			)
		);
	}

	/**
	 * Owned `parseWithStatement` landing on `WithStatementNode`'s shape.
	 * @param {Node} node started statement node
	 * @returns {Node} with statement
	 * @this {ParserInternals}
	 */
	parseWithStatement(node) {
		if (!this._lazy) return base.parseWithStatement.call(this, node);
		if (this.strict) this.raise(this.start, "'with' in strict mode");
		this.next();
		const object = this.parseParenExpression();
		const body = this.parseStatement("with");
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				_emitWithStatement(node.start, this.lastTokEnd, object, body)
			)
		);
	}

	/**
	 * Owned `parseEmptyStatement` landing on `BareStatementNode`'s shape.
	 * @param {Node} node started statement node
	 * @returns {Node} empty statement
	 * @this {ParserInternals}
	 */
	parseEmptyStatement(node) {
		if (!this._lazy) return base.parseEmptyStatement.call(this, node);
		this.next();
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				_emitBareStatement(node.start, this.lastTokEnd, "EmptyStatement")
			)
		);
	}

	/**
	 * Owned `parseDebuggerStatement` landing on `BareStatementNode`'s shape.
	 * @param {Node} node started statement node
	 * @returns {Node} debugger statement
	 * @this {ParserInternals}
	 */
	parseDebuggerStatement(node) {
		if (!this._lazy) return base.parseDebuggerStatement.call(this, node);
		this.next();
		this.semicolon();
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				_emitBareStatement(node.start, this.lastTokEnd, "DebuggerStatement")
			)
		);
	}

	// ----- owned class grammar, exact-semantics copies of acorn 8's. The
	// element protocol (started node mutated across parseClassElement /
	// parseClassMethod / parseClassField) is kept, so subclass hooks work
	// unchanged; lazy mode only skips acorn's node bookkeeping -----

	/**
	 * Owned `parseClass`.
	 * @param {Node & { id?: Node | null, superClass?: Node | null, body?: Node }} node started class node
	 * @param {boolean | string} isStatement whether this is a declaration
	 * @returns {Node} class declaration or expression
	 * @this {ParserInternals}
	 */
	parseClass(node, isStatement) {
		if (!this._lazy) return base.parseClass.call(this, node, isStatement);
		this.next();
		// ecma-262 14.6: a class definition is always strict mode code
		const oldStrict = this.strict;
		this.strict = true;
		this.parseClassId(node, isStatement);
		this.parseClassSuper(node);
		const privateNameMap = this.enterClassBody();
		const classBody = this.startNode();
		let hadConstructor = false;
		/** @type {Node[]} */
		(/** @type {Node & { body?: Node[] }} */ (classBody).body) = [];
		this.expect(tokTypes.braceL);
		while (this.type !== tokTypes.braceR) {
			const element = /** @type {ClassElementNode | null} */ (
				this.parseClassElement(node.superClass !== null)
			);
			if (element) {
				/** @type {Node & { body: Node[] }} */ (classBody).body.push(element);
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
						/** @type {Node} */ (element.key).start,
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
	 * Owned `parseClassElement`.
	 * @param {boolean} constructorAllowsSuper whether `super()` is allowed
	 * @returns {Node | null} class element (`null` for a stray `;`)
	 * @this {ParserInternals}
	 */
	parseClassElement(constructorAllowsSuper) {
		if (!this._lazy) {
			return base.parseClassElement.call(this, constructorAllowsSuper);
		}
		if (this.eat(tokTypes.semi)) return null;
		const ecmaVersion = this._ecmaVersion;
		const node = /** @type {ClassElementNode} */ (this.startNode());
		let keyName = "";
		let isGenerator = false;
		let isAsync = false;
		let kind = "method";
		let isStatic = false;
		if (this.eatContextual("static")) {
			// parse static init block
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
			// 'async', 'get', 'set', or 'static' were not a keyword contextually;
			// the last token is any of those — make it the element name
			node.computed = false;
			node.key = /** @type {ClassElementNode["key"]} */ (
				_emitIdentifier(this.lastTokStart, this.lastTokEnd, keyName)
			);
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
			// acorn keeps this check outside parseClassMethod for compatibility
			if (isConstructor && kind !== "method") {
				this.raise(
					/** @type {Node} */ (node.key).start,
					"Constructor can't have get/set modifier"
				);
			}
			node.kind = isConstructor ? "constructor" : kind;
			this.parseClassMethod(node, isGenerator, isAsync, allowsDirectSuper);
		} else {
			this.parseClassField(node);
		}
		return node;
	}

	/**
	 * Owned `parseClassElementName`.
	 * @param {Node} element class element node
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	parseClassElementName(element) {
		if (!this._lazy) return base.parseClassElementName.call(this, element);
		const el = /** @type {ClassElementNode} */ (element);
		if (this.type === tokTypes.privateId) {
			if (this.value === "constructor") {
				this.raise(
					this.start,
					"Classes can't have an element named '#constructor'"
				);
			}
			el.computed = false;
			el.key = /** @type {ClassElementNode["key"]} */ (
				this.parsePrivateIdent()
			);
		} else {
			this.parsePropertyName(element);
		}
	}

	/**
	 * Owned `parseClassMethod`.
	 * @param {Node} method class element node
	 * @param {boolean} isGenerator whether the `*` modifier was parsed
	 * @param {boolean} isAsync whether the `async` modifier was parsed
	 * @param {boolean} allowsDirectSuper whether `super()` is allowed
	 * @returns {Node} method definition
	 * @this {ParserInternals}
	 */
	parseClassMethod(method, isGenerator, isAsync, allowsDirectSuper) {
		if (!this._lazy) {
			return base.parseClassMethod.call(
				this,
				method,
				isGenerator,
				isAsync,
				allowsDirectSuper
			);
		}
		const el = /** @type {ClassElementNode} */ (method);
		const key = /** @type {Node} */ (el.key);
		if (el.kind === "constructor") {
			if (isGenerator) {
				this.raise(key.start, "Constructor can't be a generator");
			}
			if (isAsync) {
				this.raise(key.start, "Constructor can't be an async method");
			}
		} else if (el.static && checkKeyName(el, "prototype")) {
			this.raise(
				key.start,
				"Classes may not have a static property named prototype"
			);
		}
		const value = (el.value = /** @type {ClassElementNode["value"]} */ (
			this.parseMethod(isGenerator, isAsync, allowsDirectSuper)
		));
		const fn = /** @type {Node & { params: Node[] }} */ (value);
		if (el.kind === "get" && fn.params.length !== 0) {
			this.raiseRecoverable(fn.start, "getter should have no params");
		}
		if (el.kind === "set" && fn.params.length !== 1) {
			this.raiseRecoverable(fn.start, "setter should have exactly one param");
		}
		if (el.kind === "set" && fn.params[0].type === "RestElement") {
			this.raiseRecoverable(
				fn.params[0].start,
				"Setter cannot use rest params"
			);
		}
		return this.finishNode(method, "MethodDefinition");
	}

	/**
	 * Owned `parseClassField`.
	 * @param {Node} field class element node
	 * @returns {Node} property definition
	 * @this {ParserInternals}
	 */
	parseClassField(field) {
		if (!this._lazy) return base.parseClassField.call(this, field);
		const el = /** @type {ClassElementNode} */ (field);
		if (checkKeyName(el, "constructor")) {
			this.raise(
				/** @type {Node} */ (el.key).start,
				"Classes can't have a field named 'constructor'"
			);
		} else if (el.static && checkKeyName(el, "prototype")) {
			this.raise(
				/** @type {Node} */ (el.key).start,
				"Classes can't have a static field named 'prototype'"
			);
		}
		if (this.eat(tokTypes.eq)) {
			// to raise SyntaxError if 'arguments' exists in the initializer
			this.enterScope(SCOPE_CLASS_FIELD_INIT | SCOPE_SUPER);
			el.value = /** @type {ClassElementNode["value"]} */ (
				this.parseMaybeAssign()
			);
			this.exitScope();
		} else {
			el.value = null;
		}
		this.semicolon();
		return this.finishNode(field, "PropertyDefinition");
	}

	/**
	 * Owned `parseClassStaticBlock`; the fresh `labels` array comes from the
	 * function-body pool.
	 * @param {Node & { body?: Node[] }} node class element node
	 * @returns {Node} static block
	 * @this {ParserInternals}
	 */
	parseClassStaticBlock(node) {
		if (!this._lazy) return base.parseClassStaticBlock.call(this, node);
		/** @type {Node[]} */
		const body = (node.body = []);
		const oldLabels = this.labels;
		this.labels = LABELS_POOL.pop() || [];
		this.enterScope(SCOPE_CLASS_STATIC_BLOCK | SCOPE_SUPER);
		while (this.type !== tokTypes.braceR) {
			body.push(this.parseStatement(null));
		}
		this.next();
		this.exitScope();
		const usedLabels = this.labels;
		if (LABELS_POOL.length < LABELS_POOL_LIMIT) {
			usedLabels.length = 0;
			LABELS_POOL.push(usedLabels);
		}
		this.labels = oldLabels;
		return this.finishNode(node, "StaticBlock");
	}

	/**
	 * Owned `parseClassId`.
	 * @param {Node & { id?: Node | null }} node started class node
	 * @param {boolean | string} isStatement whether this is a declaration
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	parseClassId(node, isStatement) {
		if (!this._lazy) return base.parseClassId.call(this, node, isStatement);
		if (this.type === tokTypes.name) {
			node.id = this.parseIdent();
			if (isStatement) this.checkLValSimple(node.id, BIND_LEXICAL, false);
		} else {
			if (isStatement === true) this.unexpected();
			node.id = null;
		}
	}

	/**
	 * Owned `parseClassSuper`.
	 * @param {Node & { superClass?: Node | null }} node started class node
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	parseClassSuper(node) {
		if (!this._lazy) return base.parseClassSuper.call(this, node);
		node.superClass = this.eat(tokTypes._extends)
			? this.parseExprSubscripts(null, false)
			: null;
	}

	// ----- owned LVal conversion and checks, exact-semantics copies of
	// acorn 8's; recursion goes through `this` so overrides compose -----

	/**
	 * Owned `toAssignable`: converts an expression to a pattern in place.
	 * @param {Node} node converted node
	 * @param {boolean=} isBinding whether this is a binding position
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
			const n =
				/** @type {Node & { name?: string, properties?: (Node & { argument?: Node })[], elements?: (Node | null)[], argument?: Node, operator?: string, left?: Node, right?: Node, expression?: Node, kind?: string, key?: Node, value?: Node }} */ (
					node
				);
			switch (node.type) {
				case "Identifier":
					if (this.inAsync && n.name === "await") {
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
					const properties = /** @type {NonNullable<typeof n.properties>} */ (
						n.properties
					);
					for (let i = 0; i < properties.length; i++) {
						const prop = properties[i];
						this.toAssignable(prop, isBinding);
						// early error: an assignment rest property target may not be
						// an array or object literal
						const propArgument = /** @type {Node | undefined} */ (
							prop.argument
						);
						if (
							prop.type === "RestElement" &&
							propArgument !== undefined &&
							(propArgument.type === "ArrayPattern" ||
								propArgument.type === "ObjectPattern")
						) {
							this.raise(propArgument.start, "Unexpected token");
						}
					}
					break;
				}
				case "Property":
					// AssignmentProperty has type === "Property"
					if (n.kind !== "init") {
						this.raise(
							/** @type {Node} */ (n.key).start,
							"Object pattern can't contain getter or setter"
						);
					}
					this.toAssignable(/** @type {Node} */ (n.value), isBinding);
					break;
				case "ArrayExpression":
					node.type = "ArrayPattern";
					if (refDestructuringErrors) {
						this.checkPatternErrors(refDestructuringErrors, true);
					}
					this.toAssignableList(/** @type {Node[]} */ (n.elements), isBinding);
					break;
				case "SpreadElement":
					node.type = "RestElement";
					this.toAssignable(/** @type {Node} */ (n.argument), isBinding);
					if (/** @type {Node} */ (n.argument).type === "AssignmentPattern") {
						this.raise(
							/** @type {Node} */ (n.argument).start,
							"Rest elements cannot have a default value"
						);
					}
					break;
				case "AssignmentExpression":
					if (n.operator !== "=") {
						this.raise(
							/** @type {Node} */ (n.left).end,
							"Only '=' operator can be used for specifying default value."
						);
					}
					node.type = "AssignmentPattern";
					delete n.operator;
					this.toAssignable(/** @type {Node} */ (n.left), isBinding);
					break;
				case "ParenthesizedExpression":
					this.toAssignable(
						/** @type {Node} */ (n.expression),
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
				// fall through
				default:
					this.raise(node.start, "Assigning to rvalue");
			}
		} else if (refDestructuringErrors) {
			this.checkPatternErrors(refDestructuringErrors, true);
		}
		return node;
	}

	/**
	 * Owned `checkLValSimple`.
	 * @param {Node} expr checked target
	 * @param {number=} bindingType BIND_* constant (default none)
	 * @param {Record<string, boolean> | boolean | null=} checkClashes clash record
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	checkLValSimple(expr, bindingType, checkClashes) {
		if (!this._lazy) {
			return base.checkLValSimple.call(this, expr, bindingType, checkClashes);
		}
		if (bindingType === undefined) bindingType = 0;
		const isBind = bindingType !== 0;
		const n = /** @type {Node & { name?: string, expression?: Node }} */ (expr);
		switch (expr.type) {
			case "Identifier": {
				const name = /** @type {string} */ (n.name);
				if (this.strict && this.reservedWordsStrictBind.test(name)) {
					this.raiseRecoverable(
						expr.start,
						`${isBind ? "Binding " : "Assigning to "}${name} in strict mode`
					);
				}
				if (isBind) {
					if (bindingType === BIND_LEXICAL && name === "let") {
						this.raiseRecoverable(
							expr.start,
							"let is disallowed as a lexically bound name"
						);
					}
					if (checkClashes) {
						const clashes = /** @type {Record<string, boolean>} */ (
							checkClashes
						);
						if (Object.prototype.hasOwnProperty.call(clashes, name)) {
							this.raiseRecoverable(expr.start, "Argument name clash");
						}
						clashes[name] = true;
					}
					if (bindingType !== BIND_OUTSIDE) {
						this.declareName(name, bindingType, expr.start);
					}
				}
				break;
			}
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
				return this.checkLValSimple(
					/** @type {Node} */ (n.expression),
					bindingType,
					checkClashes
				);
			default:
				this.raise(expr.start, `${isBind ? "Binding" : "Assigning to"} rvalue`);
		}
	}

	/**
	 * Owned `checkLValPattern`.
	 * @param {Node} expr checked target
	 * @param {number=} bindingType BIND_* constant (default none)
	 * @param {Record<string, boolean> | boolean | null=} checkClashes clash record
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	checkLValPattern(expr, bindingType, checkClashes) {
		if (!this._lazy) {
			return base.checkLValPattern.call(this, expr, bindingType, checkClashes);
		}
		const n =
			/** @type {Node & { properties?: Node[], elements?: (Node | null)[] }} */ (
				expr
			);
		switch (expr.type) {
			case "ObjectPattern": {
				const properties = /** @type {Node[]} */ (n.properties);
				for (let i = 0; i < properties.length; i++) {
					this.checkLValInnerPattern(properties[i], bindingType, checkClashes);
				}
				break;
			}
			case "ArrayPattern": {
				const elements = /** @type {(Node | null)[]} */ (n.elements);
				for (let i = 0; i < elements.length; i++) {
					const element = elements[i];
					if (element) {
						this.checkLValInnerPattern(element, bindingType, checkClashes);
					}
				}
				break;
			}
			default:
				this.checkLValSimple(expr, bindingType, checkClashes);
		}
	}

	/**
	 * Owned `checkLValInnerPattern`.
	 * @param {Node} expr checked target
	 * @param {number=} bindingType BIND_* constant (default none)
	 * @param {Record<string, boolean> | boolean | null=} checkClashes clash record
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	checkLValInnerPattern(expr, bindingType, checkClashes) {
		if (!this._lazy) {
			return base.checkLValInnerPattern.call(
				this,
				expr,
				bindingType,
				checkClashes
			);
		}
		const n =
			/** @type {Node & { value?: Node, left?: Node, argument?: Node }} */ (
				expr
			);
		switch (expr.type) {
			case "Property":
				// AssignmentProperty has type === "Property"
				this.checkLValInnerPattern(
					/** @type {Node} */ (n.value),
					bindingType,
					checkClashes
				);
				break;
			case "AssignmentPattern":
				this.checkLValPattern(
					/** @type {Node} */ (n.left),
					bindingType,
					checkClashes
				);
				break;
			case "RestElement":
				this.checkLValPattern(
					/** @type {Node} */ (n.argument),
					bindingType,
					checkClashes
				);
				break;
			default:
				this.checkLValPattern(expr, bindingType, checkClashes);
		}
	}

	/**
	 * Owned `parseYield` landing on `YieldExpressionNode`'s shape.
	 * @param {boolean | string=} forInit for-init context flag
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
				!(
					/** @type {TokenTypeInternal & { startsExpr?: boolean }} */ (
						this.type
					).startsExpr
				))
		)) {
			delegate = this.eat(tokTypes.star);
			argument = this.parseMaybeAssign(forInit);
		}
		return /** @type {Expression} */ (
			/** @type {unknown} */ (
				_emitYieldExpression(start, this.lastTokEnd, delegate, argument)
			)
		);
	}

	// ----- owned binding-pattern grammar, exact-semantics copies of acorn 8's
	// landing on single-shape nodes; list-item hooks stay `this` calls so
	// subclass modifiers keep working -----

	/**
	 * Owned `parseRestBinding` landing on `RestSpreadNode`'s shape.
	 * @returns {Node} rest element
	 * @this {ParserInternals}
	 */
	parseRestBinding() {
		if (!this._lazy) return base.parseRestBinding.call(this);
		const start = this.start;
		this.next();
		// RestElement inside of a function parameter must be an identifier
		if (this._ecmaVersion === 6 && this.type !== tokTypes.name) {
			this.unexpected();
		}
		const argument = this.parseBindingAtom();
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				_emitRestSpread(start, this.lastTokEnd, "RestElement", argument)
			)
		);
	}

	/**
	 * Owned `parseBindingAtom` landing on `ArrayPatternNode`'s shape for
	 * array patterns; object patterns and identifiers use the owned paths.
	 * @returns {Node} binding atom
	 * @this {ParserInternals}
	 */
	parseBindingAtom() {
		if (!this._lazy) return base.parseBindingAtom.call(this);
		if (this._ecmaVersion >= 6) {
			switch (this.type) {
				case tokTypes.bracketL: {
					const start = this.start;
					this.next();
					const elements = this.parseBindingList(tokTypes.bracketR, true, true);
					return /** @type {Node} */ (
						/** @type {unknown} */ (
							_emitArrayPattern(start, this.lastTokEnd, elements)
						)
					);
				}
				case tokTypes.braceL:
					return this.parseObj(true);
			}
		}
		return this.parseIdent();
	}

	/**
	 * Owned `parseBindingList`, a verbatim copy of acorn 8's.
	 * @param {TokenType} close list-terminating token type
	 * @param {boolean} allowEmpty whether holes are allowed
	 * @param {boolean} allowTrailingComma whether a trailing comma is allowed
	 * @param {boolean=} allowModifiers passed through to the list-item hook
	 * @returns {(Node | null)[]} bound elements
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
		/** @type {(Node | null)[]} */
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
	 * Owned `parseMaybeDefault` landing on `AssignmentPatternNode`'s shape.
	 * @param {number} startPos pattern start offset
	 * @param {Position=} startLoc pattern start position (unused in lazy mode)
	 * @param {Node=} left already-parsed binding
	 * @returns {Node} binding, possibly wrapped in a default pattern
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
				_emitAssignmentPattern(startPos, this.lastTokEnd, left, right)
			)
		);
	}

	// ----- owned expression tails: sequences, subscript chains, expression
	// lists and property names -----

	/**
	 * Owned `parseExpression` landing on `SequenceExpressionNode`'s shape;
	 * acorn's stack-overflow wrapper stays on `parseTopLevel`, which catches
	 * the same overflows with the same message.
	 * @param {boolean | string=} forInit for-init context flag
	 * @param {DestructuringErrorsShim | null=} refDestructuringErrors destructuring errors to fill
	 * @returns {Expression} expression, possibly a sequence
	 * @this {ParserInternals}
	 */
	parseExpression(forInit, refDestructuringErrors) {
		if (!this._lazy) {
			return base.parseExpression.call(this, forInit, refDestructuringErrors);
		}
		const startPos = this.start;
		const expr = this.parseMaybeAssign(forInit, refDestructuringErrors);
		if (this.type === tokTypes.comma) {
			const expressions = [expr];
			while (this.eat(tokTypes.comma)) {
				expressions.push(
					this.parseMaybeAssign(forInit, refDestructuringErrors)
				);
			}
			return /** @type {Expression} */ (
				/** @type {unknown} */ (
					_emitSequenceExpression(startPos, this.lastTokEnd, expressions)
				)
			);
		}
		return expr;
	}

	/**
	 * Owned `parseSubscripts` landing on `ChainExpressionNode`'s shape for
	 * optional chains.
	 * @param {Expression} baseExpr subscript base
	 * @param {number} startPos expression start offset
	 * @param {Position | undefined} startLoc expression start position
	 * @param {boolean=} noCalls whether calls are forbidden (`new` callee)
	 * @param {boolean | string=} forInit for-init context flag
	 * @returns {Expression} subscript chain
	 * @this {ParserInternals}
	 */
	parseSubscripts(baseExpr, startPos, startLoc, noCalls, forInit) {
		if (!this._lazy) {
			return base.parseSubscripts.call(
				this,
				baseExpr,
				startPos,
				startLoc,
				noCalls,
				forInit
			);
		}
		const maybeAsyncArrow =
			this._ecmaVersion >= 8 &&
			baseExpr.type === "Identifier" &&
			baseExpr.name === "async" &&
			this.lastTokEnd === baseExpr.end &&
			!this.canInsertSemicolon() &&
			baseExpr.end - baseExpr.start === 5 &&
			this.potentialArrowAt === baseExpr.start;
		let optionalChained = false;
		for (;;) {
			const element = this.parseSubscript(
				baseExpr,
				startPos,
				startLoc,
				noCalls,
				maybeAsyncArrow,
				optionalChained,
				/** @type {boolean | string} */ (forInit)
			);
			if (
				/** @type {Expression & { optional?: boolean }} */ (element).optional
			) {
				optionalChained = true;
			}
			if (element === baseExpr || element.type === "ArrowFunctionExpression") {
				if (optionalChained) {
					return /** @type {Expression} */ (
						/** @type {unknown} */ (
							_emitChainExpression(startPos, this.lastTokEnd, element)
						)
					);
				}
				return element;
			}
			baseExpr = element;
		}
	}

	/**
	 * Owned `parseExprList`, a verbatim copy of acorn 8's (call arguments and
	 * array elements).
	 * @param {TokenType} close list-terminating token type
	 * @param {boolean} allowTrailingComma whether a trailing comma is allowed
	 * @param {boolean} allowEmpty whether holes are allowed
	 * @param {DestructuringErrorsShim | null=} refDestructuringErrors destructuring errors to fill
	 * @returns {(Expression | null)[]} expressions (`null` for holes)
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
		/** @type {(Expression | null)[]} */
		const elements = [];
		let first = true;
		while (!this.eat(close)) {
			if (!first) {
				this.expect(tokTypes.comma);
				if (allowTrailingComma && this.afterTrailingComma(close)) break;
			} else {
				first = false;
			}
			/** @type {Expression | null} */
			let element;
			if (allowEmpty && this.type === tokTypes.comma) {
				element = null;
			} else if (this.type === tokTypes.ellipsis) {
				element = /** @type {Expression} */ (
					this.parseSpread(refDestructuringErrors)
				);
				if (
					refDestructuringErrors &&
					this.type === tokTypes.comma &&
					refDestructuringErrors.trailingComma < 0
				) {
					refDestructuringErrors.trailingComma = this.start;
				}
			} else {
				element = this.parseMaybeAssign(false, refDestructuringErrors);
			}
			elements.push(element);
		}
		return elements;
	}

	/**
	 * Owned `parsePropertyName`, a verbatim copy of acorn 8's.
	 * @param {Node} prop property or class element node
	 * @returns {Node} key node
	 * @this {ParserInternals}
	 */
	parsePropertyName(prop) {
		if (!this._lazy) return base.parsePropertyName.call(this, prop);
		const el = /** @type {Node & { computed?: boolean, key?: Node }} */ (prop);
		if (this._ecmaVersion >= 6) {
			if (this.eat(tokTypes.bracketL)) {
				el.computed = true;
				el.key = this.parseMaybeAssign();
				this.expect(tokTypes.bracketR);
				return el.key;
			}
			el.computed = false;
		}
		return (el.key =
			this.type === tokTypes.num || this.type === tokTypes.string
				? this.parseExprAtom()
				: this.parseIdent(this.options.allowReserved !== "never"));
	}

	/**
	 * Owned `parseLiteral`: builds the finished `LiteralNode` directly; the
	 * `bigint` branch matches acorn's. Non-lazy mode delegates to acorn.
	 * @param {unknown} value literal value
	 * @returns {Node} literal node
	 * @this {ParserInternals}
	 */
	parseLiteral(value) {
		if (!this._lazy) return base.parseLiteral.call(this, value);
		const start = this.start;
		const end = this.end;
		const raw = this.input.slice(start, end);
		const node = _emitLiteral(start, end, value, raw);
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
					// lazy-Set check first: `functions` is undefined for almost all
					// scopes, and the method call walks no state worth paying for then
					(scope.functions !== undefined &&
						!this.treatFunctionsAsVarInScope(scope) &&
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
	 * @param {Node & { phase?: ImportPhase }} node import declaration node
	 * @returns {Node} finished node
	 * @this {ParserInternals}
	 */
	parseImport(node) {
		this._moduleSyntaxSeen = true;
		this._importPhase = null;
		const result = base.parseImport.call(this, node);
		if (this._importPhase) node.phase = this._importPhase;
		return result;
	}

	/**
	 * Owned `parseExport` (also flags module syntax for the auto-fallback
	 * guard); the started node is filled acorn-style since the field set
	 * depends on the branch taken.
	 * @param {Node & { declaration?: Node | null, specifiers?: Node[], source?: Node | null, attributes?: Node[], exported?: Node | null }} node started export node
	 * @param {unknown} exports export-name tracking object
	 * @returns {Node} export declaration
	 * @this {ParserInternals}
	 */
	parseExport(node, exports) {
		this._moduleSyntaxSeen = true;
		if (!this._lazy) return base.parseExport.call(this, node, exports);
		const exportsRecord = /** @type {Record<string, boolean> | undefined} */ (
			exports
		);
		this.next();
		// export * from '...'
		if (this.eat(tokTypes.star)) {
			return this.parseExportAllDeclaration(node, exportsRecord);
		}
		if (this.eat(tokTypes._default)) {
			// export default ...
			this.checkExport(exportsRecord, "default", this.lastTokStart);
			node.declaration = this.parseExportDefaultDeclaration();
			return this.finishNode(node, "ExportDefaultDeclaration");
		}
		// export var|const|let|function|class ...
		if (this.shouldParseExportStatement()) {
			const declaration = (node.declaration =
				this.parseExportDeclaration(node));
			if (declaration.type === "VariableDeclaration") {
				this.checkVariableExport(
					exportsRecord,
					/** @type {Node & { declarations: Node[] }} */ (declaration)
						.declarations
				);
			} else {
				const id = /** @type {Node} */ (
					/** @type {Node & { id: Node }} */ (declaration).id
				);
				this.checkExport(exportsRecord, id, id.start);
			}
			node.specifiers = [];
			node.source = null;
			if (this._ecmaVersion >= 16) node.attributes = [];
		} else {
			// export { x, y as z } [from '...']
			node.declaration = null;
			node.specifiers = this.parseExportSpecifiers(exportsRecord);
			if (this.eatContextual("from")) {
				if (this.type !== tokTypes.string) this.unexpected();
				node.source = this.parseExprAtom();
				if (this._ecmaVersion >= 16) node.attributes = this.parseWithClause();
			} else {
				for (const spec of /** @type {(Node & { local: Identifier })[]} */ (
					node.specifiers
				)) {
					// check for keywords used as local names
					this.checkUnreserved(spec.local);
					// check if export is defined
					this.checkLocalExport(spec.local);
					if (/** @type {Node} */ (spec.local).type === "Literal") {
						this.raise(
							spec.local.start,
							"A string literal cannot be used as an exported binding without `from`."
						);
					}
				}
				node.source = null;
				if (this._ecmaVersion >= 16) node.attributes = [];
			}
			this.semicolon();
		}
		return this.finishNode(node, "ExportNamedDeclaration");
	}

	/**
	 * Owned `parseExportAllDeclaration`.
	 * @param {Node & { exported?: Node | null, source?: Node | null, attributes?: Node[] }} node started export node
	 * @param {Record<string, boolean> | undefined} exports export-name tracking object
	 * @returns {Node} export-all declaration
	 * @this {ParserInternals}
	 */
	parseExportAllDeclaration(node, exports) {
		if (!this._lazy) {
			return base.parseExportAllDeclaration.call(this, node, exports);
		}
		if (this._ecmaVersion >= 11) {
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
		if (this._ecmaVersion >= 16) node.attributes = this.parseWithClause();
		this.semicolon();
		return this.finishNode(node, "ExportAllDeclaration");
	}

	/**
	 * Owned `parseExportDeclaration`, acorn's overridable indirection.
	 * @param {Node} node started export node
	 * @returns {Node} exported declaration
	 * @this {ParserInternals}
	 */
	parseExportDeclaration(node) {
		if (!this._lazy) return base.parseExportDeclaration.call(this, node);
		return this.parseStatement(null);
	}

	/**
	 * Owned `parseExportDefaultDeclaration`.
	 * @returns {Node} default-exported declaration or expression
	 * @this {ParserInternals}
	 */
	parseExportDefaultDeclaration() {
		if (!this._lazy) return base.parseExportDefaultDeclaration.call(this);
		let isAsync = false;
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
		} else if (this.type === tokTypes._class) {
			const cNode = this.startNode();
			return this.parseClass(cNode, "nullableID");
		}
		const declaration = this.parseMaybeAssign();
		this.semicolon();
		return declaration;
	}

	/**
	 * Owned `checkExport`.
	 * @param {Record<string, boolean> | undefined} exports export-name tracking object
	 * @param {Node | string} name exported name node or string
	 * @param {number} pos error position
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	checkExport(exports, name, pos) {
		if (!this._lazy) return base.checkExport.call(this, exports, name, pos);
		if (!exports) return;
		if (typeof name !== "string") {
			const named = /** @type {Node & { name?: string, value?: string }} */ (
				name
			);
			name =
				named.type === "Identifier"
					? /** @type {string} */ (named.name)
					: /** @type {string} */ (named.value);
		}
		if (Object.prototype.hasOwnProperty.call(exports, name)) {
			this.raiseRecoverable(pos, `Duplicate export '${name}'`);
		}

		exports[name] = true;
	}

	/**
	 * Owned `checkPatternExport`.
	 * @param {Record<string, boolean> | undefined} exports export-name tracking object
	 * @param {Node} pat exported pattern
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	checkPatternExport(exports, pat) {
		if (!this._lazy) return base.checkPatternExport.call(this, exports, pat);
		const type = pat.type;
		const n =
			/** @type {Node & { properties?: Node[], elements?: (Node | null)[], value?: Node, left?: Node, argument?: Node }} */ (
				pat
			);
		if (type === "Identifier") {
			this.checkExport(exports, pat, pat.start);
		} else if (type === "ObjectPattern") {
			for (const prop of /** @type {Node[]} */ (n.properties)) {
				this.checkPatternExport(exports, prop);
			}
		} else if (type === "ArrayPattern") {
			for (const element of /** @type {(Node | null)[]} */ (n.elements)) {
				if (element) this.checkPatternExport(exports, element);
			}
		} else if (type === "Property") {
			this.checkPatternExport(exports, /** @type {Node} */ (n.value));
		} else if (type === "AssignmentPattern") {
			this.checkPatternExport(exports, /** @type {Node} */ (n.left));
		} else if (type === "RestElement") {
			this.checkPatternExport(exports, /** @type {Node} */ (n.argument));
		}
	}

	/**
	 * Owned `checkVariableExport`.
	 * @param {Record<string, boolean> | undefined} exports export-name tracking object
	 * @param {Node[]} decls exported declarators
	 * @returns {void}
	 * @this {ParserInternals}
	 */
	checkVariableExport(exports, decls) {
		if (!this._lazy) return base.checkVariableExport.call(this, exports, decls);
		if (!exports) return;
		for (const decl of decls) {
			this.checkPatternExport(
				exports,
				/** @type {Node} */ (/** @type {Node & { id: Node }} */ (decl).id)
			);
		}
	}

	/**
	 * Owned `shouldParseExportStatement`, a verbatim copy of acorn 8's.
	 * @returns {boolean} whether a declaration follows `export`
	 * @this {ParserInternals}
	 */
	shouldParseExportStatement() {
		if (!this._lazy) return base.shouldParseExportStatement.call(this);
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
	 * Owned `parseExportSpecifier` landing on `ExportSpecifierNode`'s shape.
	 * @param {Record<string, boolean> | undefined} exports export-name tracking object
	 * @returns {Node} export specifier
	 * @this {ParserInternals}
	 */
	parseExportSpecifier(exports) {
		if (!this._lazy) return base.parseExportSpecifier.call(this, exports);
		const start = this.start;
		const local = this.parseModuleExportName();
		const exported = this.eatContextual("as")
			? this.parseModuleExportName()
			: local;
		this.checkExport(exports, exported, exported.start);
		return /** @type {Node} */ (
			/** @type {unknown} */ (
				_emitExportSpecifier(start, this.lastTokEnd, local, exported)
			)
		);
	}

	/**
	 * Owned `parseExportSpecifiers`, a verbatim copy of acorn 8's.
	 * @param {Record<string, boolean> | undefined} exports export-name tracking object
	 * @returns {Node[]} export specifiers
	 * @this {ParserInternals}
	 */
	parseExportSpecifiers(exports) {
		if (!this._lazy) return base.parseExportSpecifiers.call(this, exports);
		/** @type {Node[]} */
		const nodes = [];
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
			nodes.push(this.parseExportSpecifier(exports));
		}
		return nodes;
	}

	/**
	 * Owned `parseModuleExportName`, a verbatim copy of acorn 8's.
	 * @returns {Node} identifier or validated string literal
	 * @this {ParserInternals}
	 */
	parseModuleExportName() {
		if (!this._lazy) return base.parseModuleExportName.call(this);
		if (this._ecmaVersion >= 13 && this.type === tokTypes.string) {
			const stringLiteral = /** @type {Node & { value: string }} */ (
				this.parseLiteral(this.value)
			);
			if (LONE_SURROGATE.test(stringLiteral.value)) {
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
	 * Owned `parseAwait` only to flag top-level await (module-only) for the
	 * auto-fallback guard; await inside a function is not module syntax.
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
				_emitAwaitExpression(start, this.lastTokEnd, argument)
			)
		);
	}

	/**
	 * @returns {AnyImportSpecifier[]} import specifiers
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
 * Offset of each line's first character. Char-code scan matching acorn's
 * `lineBreak` semantics (CRLF is one break): a regex `exec` loop here
 * allocates a match array per line.
 * @param {string} source source code
 * @returns {number[]} line start offsets
 */
const buildLineStarts = (source) => {
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

module.exports.LEGACY_ASSERT_ATTRIBUTES = LEGACY_ASSERT_ATTRIBUTES;
module.exports.SoaAst = SoaAst;
module.exports.WebpackParser = WebpackParser;
module.exports.buildLineStarts = buildLineStarts;
module.exports.hasOctalEscape = hasOctalEscape;
module.exports.positionAt = positionAt;
